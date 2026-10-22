"use client";

// 수업 목록 화면(4절 수업 목록 표 · 3.2 · AC-2b · AC-2d, plan-p10b 바뀌는 파일). 이 화면의 행동은 수업 하나를 고르는 것뿐이다.
// 위 종이 띠(영역 · 지금 단계 · 단원 · 홈) → [다음 단계 준비 중 안내] → 맨 위 차례(있을 때만) → 지금 단원 묶음(앞줄 보강 · 배정,
// 뒷줄 다지기 — 부모 확인 대기면 그 자리에 안내) → 잠긴 다음 단원 한 장 · '지난 수업 다시 하기' 한 장.
// '여기부터 해요'는 한 화면에 하나(4절 차례, 순수 함수 lessonListState 가 고름).
// 수업을 고르면 세션을 연다(startLesson — 서버가 다시 판정, 하던 수업이 있으면 한 번 묻고 확인 뒤 중단으로 닫음, 차례 6).
import { Check, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AREA_LABEL,
  ChildScreen,
  ConfirmSheet,
  PaperBand,
  PostIt,
  SmallLink,
  StatusLine,
  type Tilt,
} from "@/components/board/board";
import { AiRest } from "@/components/session/ai-rest";
import { WaitHint } from "@/components/session/wait-hint";
import type {
  HereStart,
  LessonItem,
  LessonRef,
  ListView,
  LockLine,
  TopItem,
} from "@/core/lesson-list/state";
import type { Area } from "@/core/seed/structure";
import { cn } from "@/lib/utils";
import {
  flushAttempts,
  LESSON_START_TEXT,
  useLessonStart,
} from "./use-lesson-start";

const TILTS: readonly Tilt[] = ["left", "right", "slight", "none"];
/** 수업 포스트잇 격자(가로 화면은 칸을 좁혀 실시드 12~15장이 한 화면에). */
const LESSON_GRID =
  "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 landscape:grid-cols-[repeat(auto-fill,minmax(112px,1fr))] landscape:gap-3";

/** 화면 문구(4절 수업 목록 표 · plan-p10b 정본 밖 문구 표 그대로). */
const TEXT = {
  home: "홈",
  band: (level: number, unit: number) => `${level}단계 · 단원 ${unit}`,
  hereStart: "여기부터 해요",
  resume: "하던 수업 이어 하기",
  feedback: "첨삭 보기",
  levelTest: (level: number) => `${level}단계 평가`,
  remedial: "보강",
  reinforce: "다지기",
  untried: "안 해 본 수업",
  /** 끝낸 수업 ✓ 의 숨은 글(화면에는 그림만 — C72 표). */
  done: "끝낸 수업",
  past: "지난 수업 다시 하기",
  unit: (n: number) => `단원 ${n}`,
  /** 조건 줄을 숨긴 잠긴 단원의 숨은 글(C72 표). */
  lockedUnit: "잠긴 단원",
  parentCheck: "부모님이 다음 길을 고르고 있어요. 그동안 지난 수업을 해 봐요",
  nextLevelPending:
    "다음 단계 수업을 준비하고 있어요. 지난 수업을 다시 해 봐요",
  lock: (line: LockLine): string => {
    switch (line.kind) {
      case "lessons":
        return `수업 ${line.n}개를 더 하면 열려요`;
      case "days":
        return `내일 이 단원 수업을 또 하면 열려요(앞으로 ${line.n}일)`;
      case "words":
        return "단어를 며칠에 걸쳐 복습하면 열려요";
      case "score":
        return "남은 수업과 보강을 하면 열려요";
    }
  },
} as const;

const refKey = (r: LessonRef) => `${r.unit}:${r.kind}:${r.lessonNo}`;
const sameRef = (a: LessonRef | undefined, b: LessonRef | undefined) =>
  a !== undefined && b !== undefined && refKey(a) === refKey(b);

function isHereLesson(here: HereStart | null, ref: LessonRef): boolean {
  return here?.kind === "lesson" && sameRef(here.ref, ref);
}
function isHereTop(here: HereStart | null, item: TopItem): boolean {
  if (!here) return false;
  if (item.kind === "resume")
    return here.kind === "resume" && here.sessionId === item.sessionId;
  if (item.kind === "feedback")
    return here.kind === "feedback" && sameRef(here.ref, item.ref);
  return here.kind === "level_test";
}

/** '여기부터 해요' 띠(다른 것보다 크게 — 4절). */
function HereBadge() {
  return (
    <span className="self-start rounded-lg bg-ink px-3 py-1 font-heading text-[22px] text-paper">
      {TEXT.hereStart}
    </span>
  );
}

export function LessonBoard({
  area,
  view,
  titles,
  waitHintSeconds,
}: {
  area: Area;
  view: ListView;
  titles: Record<string, string>;
  /** ui.wait_hint_seconds — '첨삭 보기'로 여는 동안의 기다림 표시. */
  waitHintSeconds: readonly [number, number];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | undefined>();
  // 기다림 표시 · '아직 글을 살펴보고 있어요'를 그릴 카드(누른 카드 바로 아래 — 목록이 길어도 보는 창 안, 화면 검토 review-p11-7-design M-1).
  // 하던 수업을 묻는 쪽지를 거치면 쪽지가 닫힌 뒤 그 카드에 그린다(askedAt)
  const [waitAt, setWaitAt] = useState<string | undefined>();
  const askedAt = useRef<string | undefined>(undefined);
  const {
    start,
    busy,
    status,
    asking,
    setAsking,
    resting,
    waitingSince,
    stillReading,
  } = useLessonStart(waitHintSeconds);
  // 확인 쪽지를 연 포스트잇 — 쪽지가 닫히면 초점을 돌려놓는다(화면 검토)
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (asking === undefined && opener.current) {
      opener.current.focus();
      opener.current = null;
    }
  }, [asking]);
  // 하이드레이션 끝 표시(e2e 가 누르기 전에 기다린다 — 그 전 누름은 처리기가 없어 사라진다)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // 목록이 열리면 이 기기에 남은 시도를 보낸다(쓰던 초고가 다른 수업 고르기 전에 서버에 닿게 — plan-p11b 위험 3)
  useEffect(() => {
    void flushAttempts().catch(() => {});
  }, []);
  const going = view.top.find((t) => t.kind === "resume");
  const goingRef = going?.kind === "resume" ? going.ref : undefined;

  /** 수업을 고름: 하던 수업이 있고 다른 수업이면 한 번 묻는다(4절 '다른 수업 고르기'). 아니면 세션을 연다. */
  const choose = (item: LessonItem) => {
    if (busy) return;
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (goingRef && !sameRef(goingRef, item.ref)) {
      askedAt.current = refKey(item.ref);
      setAsking(item.lessonId);
      return;
    }
    setSelected(refKey(item.ref));
    setWaitAt(refKey(item.ref));
    void start(item.lessonId);
  };

  const waiting = waitingSince !== undefined || stillReading;
  /** 누른 카드 바로 아래의 기다림 표시 · 안내 줄(그 카드일 때만). */
  const waitBelow = (key: string) =>
    waiting && waitAt === key ? (
      <div data-lesson-wait="" className="flex flex-col items-center">
        {waitingSince !== undefined ? (
          <WaitHint startedAt={waitingSince} seconds={waitHintSeconds} />
        ) : null}
        {stillReading ? (
          <StatusLine className="text-center">
            {LESSON_START_TEXT.stillReading}
          </StatusLine>
        ) : null}
      </div>
    ) : null;

  const lessonCard = (item: LessonItem, i: number) => {
    const here = isHereLesson(view.hereStart, item.ref);
    const key = refKey(item.ref);
    // 이름은 안의 글(여기부터 · 번호 · 보강 · 끝낸 수업 · 제목 · 안 해 본 수업)이다 — 고정 이름을 덮지 않는다(검토 M-4)
    // 칸 하나가 카드와 그 아래 기다림 표시를 함께 담는다(다른 카드 자리는 그대로, 그 줄만 길어짐 — M-1)
    return (
      <div
        key={key}
        className={cn(
          "flex flex-col gap-2",
          // '여기부터 해요'는 다른 것보다 크게(4절) — 두 칸 너비
          here && "col-span-2",
        )}
      >
        <PostIt
          tone={area}
          tilt={TILTS[i % TILTS.length]}
          pressed={selected === key}
          onClick={() => choose(item)}
          className={cn(
            "min-h-32 w-full flex-1 gap-2 p-4 pt-7 landscape:min-h-24 landscape:p-3 landscape:pt-6",
            here && "ring-4 ring-ink",
          )}
        >
          <span
            data-lesson={`${item.ref.kind}-${item.ref.lessonNo}`}
            className="contents"
          >
            {here ? <HereBadge /> : null}
            <span className="flex items-center gap-2">
              <span className="font-heading text-4xl leading-none">
                {item.ref.lessonNo}
              </span>
              {item.remedial ? (
                <span className="rounded-md border-2 border-ink px-2 font-heading text-[22px]">
                  {TEXT.remedial}
                </span>
              ) : null}
              {item.done ? (
                <span className="ml-auto flex items-center">
                  <Check
                    aria-hidden
                    data-done=""
                    className="size-8"
                    strokeWidth={3}
                  />
                  <span className="sr-only">{TEXT.done}</span>
                </span>
              ) : null}
            </span>
            {/* 수업 제목은 보조 줄 — 안내 글 20px(13절 C82, 이름표는 번호 · 꼬리표) */}
            <span data-size-guide="">{item.title}</span>
            {item.untried ? (
              <span className="self-start rounded-md border-2 border-ink px-2 font-heading text-[22px]">
                {TEXT.untried}
              </span>
            ) : null}
          </span>
        </PostIt>
        {waitBelow(key)}
      </div>
    );
  };

  const topCard = (item: TopItem) => {
    const here = isHereTop(view.hereStart, item);
    const label =
      item.kind === "resume"
        ? TEXT.resume
        : item.kind === "feedback"
          ? TEXT.feedback
          : TEXT.levelTest(view.band.level);
    const title =
      item.kind !== "level_test" && item.ref
        ? titles[refKey(item.ref)]
        : undefined;
    const key =
      item.kind === "resume"
        ? item.sessionId
        : `${item.kind}-${item.kind === "feedback" ? refKey(item.ref) : ""}`;
    return (
      <div key={key} className="flex flex-col gap-2">
        <PostIt
          tone={area}
          tilt="slight"
          onClick={() => {
            // 하던 수업은 그 세션으로, 첨삭 보기는 그 수업의 둘째 세션(plan-p11b 값 11, 단계 평가는 P12)
            if (item.kind === "resume") {
              if (item.ref) setSelected(refKey(item.ref));
              router.push(`/session/${item.sessionId}`);
            }
            if (item.kind === "feedback" && item.lessonId && !busy) {
              setSelected(refKey(item.ref));
              if (goingRef && !sameRef(goingRef, item.ref)) {
                askedAt.current = key;
                setAsking(item.lessonId);
                return;
              }
              setWaitAt(key);
              void start(item.lessonId, false, { feedback: true });
            }
          }}
          className={cn(
            "flex-1 gap-2 p-5 pt-8",
            here ? "ring-4 ring-ink" : "max-w-sm",
          )}
        >
          <span data-top-item={item.kind} className="contents">
            {here ? <HereBadge /> : null}
            <span className="font-heading text-2xl">{label}</span>
            {title ? <span data-size-guide="">{title}</span> : null}
          </span>
        </PostIt>
        {waitBelow(key)}
      </div>
    );
  };

  const front = view.current?.front ?? [];
  const back = view.current?.back ?? [];
  // 1-가 하루 안전 상한 — 고른 수업을 열지 못하면 한 화면에 안내와 '홈'만(C50 (2) · C80)
  if (resting)
    return (
      <ChildScreen>
        <PaperBand
          heading
          title={AREA_LABEL[area]}
          detail={TEXT.band(view.band.level, view.band.unit)}
        />
        <PostIt tone="paper" className="p-6 pt-9">
          <AiRest />
        </PostIt>
      </ChildScreen>
    );
  return (
    <ChildScreen>
      <PaperBand
        heading
        title={AREA_LABEL[area]}
        detail={TEXT.band(view.band.level, view.band.unit)}
        right={<SmallLink href="/">{TEXT.home}</SmallLink>}
      />
      {view.notice === "next_level_pending" ? (
        <PostIt tone="paper" className="p-5 pt-8">
          <span data-notice="next_level_pending">{TEXT.nextLevelPending}</span>
        </PostIt>
      ) : null}
      {/* 가로 화면은 오른쪽 칸에 잠긴 다음 단원 · 지난 수업(세로는 아래로 쌓음) */}
      {/* 위에서부터 쌓는다(아래 코르크가 남아도 됨) — 가로 화면은 오른쪽 칸에 잠긴 다음 단원 · 지난 수업 */}
      <div
        data-lesson-board=""
        data-hydrated={hydrated ? "" : undefined}
        className="grid content-start gap-4 landscape:grid-cols-[1fr_minmax(200px,240px)]"
      >
        <div className="flex flex-col gap-4">
          {view.top.length > 0 ? (
            <section className="flex flex-wrap gap-6">
              {view.top.map(topCard)}
            </section>
          ) : null}
          {view.current ? (
            <section data-current-unit="" className="flex flex-col gap-4">
              <div className={LESSON_GRID}>{front.map(lessonCard)}</div>
              {back.length > 0 ? (
                // 뒷줄(다지기) 앞에 이름표 — 실시드 수에서도 앞줄 줄바꿈과 구별되게(화면 검토)
                <div className="flex flex-col gap-2">
                  <p className="font-heading text-[22px]">{TEXT.reinforce}</p>
                  <div className={LESSON_GRID}>
                    {back.map((item, i) => lessonCard(item, i + front.length))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : view.notice === "parent_check" ? (
            <PostIt tone="paper" className="p-6 pt-9">
              <span data-notice="parent_check">{TEXT.parentCheck}</span>
            </PostIt>
          ) : null}
        </div>
        <section className="flex flex-wrap content-start gap-4 landscape:flex-col landscape:flex-nowrap">
          {view.lockedNext ? (
            <PostIt
              tone="paper"
              tilt="right"
              className="max-w-md flex-1 gap-2 border-2 border-dashed border-ink/50 p-5 pt-8 landscape:max-w-none landscape:flex-none"
            >
              <span data-locked-next="" className="contents">
                <span className="flex items-center gap-2 font-heading text-2xl">
                  <Lock aria-hidden className="size-7" />
                  {TEXT.unit(view.lockedNext.unit)}
                </span>
                {view.lockedNext.line ? (
                  <span>{TEXT.lock(view.lockedNext.line)}</span>
                ) : (
                  // 조건 줄을 숨긴 때도 읽기 도구에는 잠긴 것이 들리게(화면 검토 review-p10-fix3-design N-6, C72)
                  <span className="sr-only">{TEXT.lockedUnit}</span>
                )}
              </span>
            </PostIt>
          ) : null}
          {view.past ? (
            <PostIt
              tone="paper"
              tilt="left"
              href={`/${area}/lessons/past`}
              label={TEXT.past}
              className="max-w-md flex-1 justify-center p-5 pt-8 landscape:max-w-none landscape:flex-none"
            >
              <span className="font-heading text-2xl">{TEXT.past}</span>
            </PostIt>
          ) : null}
        </section>
      </div>
      <StatusLine tone="error">{status}</StatusLine>
      <ConfirmSheet
        open={asking !== undefined}
        message={LESSON_START_TEXT.confirm}
        confirmLabel={LESSON_START_TEXT.newLesson}
        cancelLabel={LESSON_START_TEXT.keepGoing}
        onConfirm={() => {
          const lessonId = asking;
          // 확인 뒤 하던 세션을 중단으로 닫고 새 세션을 연다(5절) — 쪽지가 닫혀도 초점은 돌려놓지 않는다(쪽을 떠남)
          opener.current = null;
          setAsking(undefined);
          setWaitAt(askedAt.current);
          if (lessonId) void start(lessonId, true);
        }}
        onCancel={() => setAsking(undefined)}
      />
    </ChildScreen>
  );
}

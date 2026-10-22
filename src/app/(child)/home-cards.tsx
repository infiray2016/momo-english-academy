"use client";

// 홈 영역 카드 넷(4절 홈 표 · AC-2a · AC-5c, plan-p10b 바뀌는 파일). 포스트잇 노랑 읽기 · 하늘 쓰기 · 분홍 말하기 · 연두 회화.
// 카드마다 단계 · 단원 5칸 · 막대 둘 · 이번 주 n일 · 오늘 완료. 카드와 카드 안 '시작!' · '이야기 고르기'는 그 영역 수업 목록(R14).
// 차례를 따른다: 마이크를 쓸 수 없는 기기(인식 API 없음 · 목록 밖 · 저장된 '쓸 수 없음')의 말하기 · 회화 → 배치 평가 전 → 보통.
// 마이크 판정은 홈에 들어올 때마다 다시 한다(7절, 인식 API 가 없는 기기는 저장하지 않는다 — mic-state).
// '내 단계 찾기' 카드는 그 영역 배치 평가로 간다(차례 5).
// 1-가 임시(부모 화면 '마이크 다시 확인'은 1-나): 닫힌 말하기 카드 아래 '다시 확인' 단추가 저장된 '쓸 수 없음'을 지우고 다시 판정한다.
import { useEffect, useState } from "react";
import {
  AREA_LABEL,
  BigLink,
  ConfirmSheet,
  PostIt,
  SmallButton,
  StatusLine,
  type Tilt,
} from "@/components/board/board";
import { AiRest } from "@/components/session/ai-rest";
import { WaitHint } from "@/components/session/wait-hint";
import type { Area } from "@/core/seed/structure";
import { clearMicState, micUsable } from "@/lib/mic-state";
import { cn } from "@/lib/utils";
import type { HomeCard } from "@/server/home";
import {
  LESSON_START_TEXT,
  useLessonStart,
} from "./[area]/lessons/use-lesson-start";

const TILTS: readonly Tilt[] = ["left", "right", "slight", "right"];
/**
 * 영역 카드의 최소 높이(화면 꼴 상수 — 목업 B_Home4 네 장 400px). 한 판의 카드는 줄 높이로 늘어 같은 높이가 되고(C114), 안 내용은 위에서부터,
 * 시작 단추만 아래 끝(mt-auto — taste §4.2 같은 줄 아래 끝).
 */
const HOME_CARD_MIN_H = "min-h-[400px]";
/** 마이크가 있어야 하는 영역(4절 '마이크를 쓸 수 없을 때'). */
const MIC_AREAS: readonly Area[] = ["speaking", "talk"];

const TEXT = {
  findLevel: "내 단계 찾기",
  /** '내 단계 찾기' 아래 안내(C72 — 요청자가 잠긴 것으로 봄, 2026-10-18). */
  findLevelHint: "단계를 몰라도 돼요. 짧은 문제로 찾아요",
  /** 닫힌 말하기 카드 아래 다시 확인(C72, 1-가 임시 — 1-나 부모 화면 '마이크 다시 확인'이 대신한다). */
  micRecheck: "마이크를 켰으면 여기를 눌러 다시 확인해요",
  needsSpeaking: "말하기에서 단계를 찾으면 토리를 만날 수 있어요",
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  todayDone: "오늘 다 했어요",
  todayNotYet: "오늘 아직이에요",
  start: "시작!",
  chooseStory: "이야기 고르기",
  recent: "최근 성적",
  level: (n: number) => `${n}단계`,
  unit: (n: number, topic?: string) =>
    topic ? `단원 ${n} · ${topic}` : `단원 ${n}`,
  known: (n: number, of: number) => `아는 단어 ${n}/${of}`,
  talks: (n: number, of: number) => `끝낸 대화 ${n}/${of}`,
  week: (n: number) => `이번 주 ${n}일`,
} as const;

function UnitCells({ cells }: { cells: HomeCard["unitCells"] }) {
  return (
    <span data-unit-cells="" aria-hidden className="flex gap-1.5">
      {cells.map((cell, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: 단원 칸은 자리(단원 번호)가 열쇠다
          key={i}
          data-cell={cell}
          className={cn(
            "size-7 rounded-md border-2 border-ink",
            cell === "passed" && "bg-ink",
            cell === "current" && "border-4 bg-paper",
            cell === "upcoming" && "bg-paper/50",
          )}
        />
      ))}
    </span>
  );
}

function Bar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <span className="flex flex-col gap-1">
      <span data-size-guide="">{label}</span>
      <span
        aria-hidden
        className="h-3 w-full overflow-hidden rounded-full bg-paper/70"
      >
        <span
          className="block h-full bg-ink"
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
    </span>
  );
}

function RecentCells({ cells }: { cells: HomeCard["recent"] }) {
  return (
    <span className="flex flex-col gap-1">
      <span data-size-guide="">{TEXT.recent}</span>
      <span data-recent-cells="" aria-hidden className="flex gap-1.5">
        {cells.map((cell, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: 최근 성적 칸은 차례가 열쇠다
            key={i}
            data-cell={cell}
            className={cn(
              "h-3 flex-1 rounded-full",
              cell === "pass" ? "bg-ink" : "bg-paper/70",
            )}
          />
        ))}
      </span>
    </span>
  );
}

/** 카드 내용. action 이 거짓이면 행동 자리('시작!' · '이야기 고르기')를 비운다(마이크 판정 전, 화면 검토 H-M2). */
function CardBody({ card, action }: { card: HomeCard; action: boolean }) {
  return (
    <>
      <span className="font-heading text-3xl">{AREA_LABEL[card.area]}</span>
      <span className="font-heading text-5xl leading-none">
        {TEXT.level(card.level ?? 0)}
      </span>
      <span data-size-guide="">
        {TEXT.unit(card.unit ?? 0, card.unitTopic)}
      </span>
      <UnitCells cells={card.unitCells} />
      <Bar
        label={TEXT.known(card.knownWords, card.unitWords)}
        value={card.knownWords}
        max={card.unitWords}
      />
      {card.talks ? (
        <Bar
          label={TEXT.talks(card.talks.done, card.talks.min)}
          value={card.talks.done}
          max={card.talks.min}
        />
      ) : (
        <RecentCells cells={card.recent} />
      )}
      <span data-size-guide="">{TEXT.week(card.thisWeek)}</span>
      <span className="mt-auto flex flex-col gap-2">
        {card.today.done ? (
          <span data-today="done" className="font-heading text-[22px]">
            {TEXT.todayDone}
          </span>
        ) : !card.today.newLessonDone ? (
          <span data-today="not-yet" data-size-guide="">
            {TEXT.todayNotYet}
          </span>
        ) : null}
        {action ? (
          <span
            aria-hidden
            className="flex min-h-14 items-center justify-center rounded-xl bg-ink font-heading text-2xl text-paper"
          >
            {card.area === "talk" ? TEXT.chooseStory : TEXT.start}
          </span>
        ) : (
          <span aria-hidden className="min-h-14" />
        )}
      </span>
    </>
  );
}

/**
 * 배치 평가 전 카드 내용: 위에서부터 영역 이름 · 안내(단계 찾기 힌트 · 회화는 말하기 시작 단계 전 문구) · 이번 주, 아래 끝에 '내 단계 찾기'
 * 단추 꼴(CardBody '시작!'과 같은 꼴 — 늘인 카드의 발에는 단추만, design-taste §4.2 · C114 · 디자인 fix 1a). 단추 글은 카드 링크의 읽히는
 * 이름에 든다. 마이크 판정 전(action 거짓)이면 단추 자리만 비워 둔다.
 */
function GateBody({ card, action }: { card: HomeCard; action: boolean }) {
  return (
    <>
      <span className="font-heading text-3xl">{AREA_LABEL[card.area]}</span>
      {card.gate === "placement" ? (
        <span data-find-level-hint="" data-size-guide="">
          {TEXT.findLevelHint}
        </span>
      ) : (
        <span data-size-guide="">{TEXT.needsSpeaking}</span>
      )}
      <span data-size-guide="">{TEXT.week(card.thisWeek)}</span>
      {action ? (
        <span
          data-find-level=""
          className="mt-auto flex min-h-14 items-center justify-center rounded-xl bg-ink font-heading text-2xl text-paper"
        >
          {TEXT.findLevel}
        </span>
      ) : (
        <span aria-hidden className="mt-auto min-h-14" />
      )}
    </>
  );
}

export function HomeCards({ cards }: { cards: HomeCard[] }) {
  // undefined: 아직 판정 전(첫 그리기). 그동안 말하기 · 회화 카드는 틀만 그리고 행동 자리 · 닫힘 문구를 비운다(화면 검토 H-M2)
  const [micOk, setMicOk] = useState<boolean | undefined>();
  useEffect(() => {
    setMicOk(micUsable());
  }, []);

  // 카드 안 보조 줄(단원 · 막대 이름 · 이번 주 · 오늘 · 안내)은 안내 글 20px 라 data-size-guide 를 단다(13절 C82 — 22px 는 영역 · 단계 · 단추 이름표)
  // 한 판의 영역 카드는 같은 높이(C114 · 목업 B_Home4 — 네 장 같은 높이), 판 아래로는 코르크가 보인다(화면 검토 H-M1).
  // 카드의 읽히는 이름은 안의 글(영역 · 단계 · 상태 · 닫힘 까닭)이다 — label 을 넘기지 않는다(검토 M-3 · H-M3)
  return (
    <div
      data-home-cards=""
      // 마이크 판정이 끝나 행동 자리까지 그려졌다는 표시(e2e 크기 훑기가 기다린다 — 검토 review-p10-7-code M-2)
      data-hydrated={micOk === undefined ? undefined : ""}
      className="grid grid-cols-2 items-stretch gap-6 landscape:grid-cols-4"
    >
      {cards.map((card, i) => {
        const tilt = TILTS[i] ?? "none";
        const needsMic = MIC_AREAS.includes(card.area);
        if (needsMic && micOk === false) {
          const closed = (
            <PostIt
              tone={card.area}
              tilt={tilt}
              disabled
              href={`/${card.area}/lessons`}
              className={cn(HOME_CARD_MIN_H, "flex-1")}
            >
              <span data-home-card={card.area} className="contents">
                <span className="font-heading text-3xl">
                  {AREA_LABEL[card.area]}
                </span>
                <span data-mic-closed="" data-size-guide="">
                  {TEXT.needsMic}
                </span>
              </span>
            </PostIt>
          );
          // 다시 확인 단추는 말하기 카드 아래 하나만(회화 카드도 같은 판정으로 함께 열린다)
          if (card.area !== "speaking")
            return (
              <div key={card.area} className="flex flex-col">
                {closed}
              </div>
            );
          return (
            <div key={card.area} className="flex flex-col gap-3">
              {closed}
              <SmallButton
                data-mic-recheck=""
                className="h-auto py-2 text-left"
                onClick={() => {
                  clearMicState();
                  setMicOk(micUsable());
                }}
              >
                {TEXT.micRecheck}
              </SmallButton>
            </div>
          );
        }
        const pending = needsMic && micOk === undefined;
        if (card.gate !== null) {
          const target =
            card.gate === "needs_speaking" ? "speaking" : card.area;
          return (
            <PostIt
              key={card.area}
              tone={card.area}
              tilt={tilt}
              className={HOME_CARD_MIN_H}
              {...(pending ? {} : { href: `/${target}/placement` })}
            >
              <span data-home-card={card.area} className="contents">
                <GateBody card={card} action={!pending} />
              </span>
            </PostIt>
          );
        }
        return (
          <PostIt
            key={card.area}
            tone={card.area}
            tilt={tilt}
            className={HOME_CARD_MIN_H}
            {...(pending
              ? {}
              : // 회화 카드도 그 영역 수업 목록으로(plan-p13b 값 12)
                { href: `/${card.area}/lessons` })}
          >
            <span data-home-card={card.area} className="contents">
              <CardBody card={card} action={!pending} />
            </span>
          </PostIt>
        );
      })}
    </div>
  );
}

/** '첨삭이 왔어요' 글(4절 홈 '그 밖' 행 · plan-p11b 값 12). */
const FEEDBACK_TEXT = { ready: "첨삭이 왔어요", list: "수업 목록" } as const;

/**
 * '첨삭이 왔어요' 포스트잇(하늘 — 영역 카드보다 앞, AC-2a). 누르면 그 수업 startLesson → 둘째 세션이 바로 열린다. 서버가 첨삭을 한 번 더
 * 부르는 동안 기다림 표시, 그래도 없으면 '아직 글을 살펴보고 있어요'와 '수업 목록', 하던 다른 수업이 있으면 확인 쪽지, 안전 상한이면 안내.
 */
export function FeedbackNote({
  lessonId,
  waitHintSeconds,
}: {
  lessonId: string;
  waitHintSeconds: readonly [number, number];
}) {
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
  if (resting) return <AiRest />;
  return (
    <div className="flex flex-col items-start gap-3">
      <PostIt
        tone="writing"
        tilt="slight"
        onClick={() => {
          if (!busy) void start(lessonId, false, { feedback: true });
        }}
        className="gap-2 p-5 pt-8"
      >
        <span data-feedback-ready="" className="font-heading text-2xl">
          {FEEDBACK_TEXT.ready}
        </span>
      </PostIt>
      {waitingSince !== undefined ? (
        <WaitHint startedAt={waitingSince} seconds={waitHintSeconds} />
      ) : null}
      {stillReading ? (
        <>
          <StatusLine>{LESSON_START_TEXT.stillReading}</StatusLine>
          <BigLink href="/writing/lessons">{FEEDBACK_TEXT.list}</BigLink>
        </>
      ) : null}
      <StatusLine tone="error" className={status ? undefined : "sr-only"}>
        {status}
      </StatusLine>
      <ConfirmSheet
        open={asking !== undefined}
        message={LESSON_START_TEXT.confirm}
        confirmLabel={LESSON_START_TEXT.newLesson}
        cancelLabel={LESSON_START_TEXT.keepGoing}
        onConfirm={() => {
          const id = asking;
          setAsking(undefined);
          if (id) void start(id, true, { feedback: true });
        }}
        onCancel={() => setAsking(undefined)}
      />
    </div>
  );
}

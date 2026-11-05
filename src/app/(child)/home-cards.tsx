"use client";

// 홈 영역 카드 넷(4절 홈 표 · AC-2a · AC-5c, plan-p10b 바뀌는 파일). 포스트잇 노랑 읽기 · 하늘 쓰기 · 분홍 말하기 · 연두 회화.
// 카드(UI · UX 묶음 3 · 4절 영역 카드 행 C178 · [승인 UX2] · R-4 · R-8): 영역 이름과 영역 그림 · 단계(크게) · 오늘('오늘 다 했어요' 표지,
// 또는 '오늘 아직이에요' — 둘 다 '이번 주 n일'과 함께) · 큰 단추 하나. 단원 5칸 · 막대 둘은 수업 목록 위 띠로 옮겼다(R-13). 회화 카드는 영역
// 이름 옆에 고른 선생님의 작은 초상(둥근 창 꼴 · 방 색 바탕, 고르기 전에는 글자 동그라미 '선')이 있고 오늘 자리는 오늘 이야기 제목이다
// (오늘 완료면 그 위에 표지). 카드와 카드 안 '시작!' · '이야기 고르기'는 그 영역 수업 목록(R14).
// 차례를 따른다: 마이크를 쓸 수 없는 기기(인식 API 없음 · 목록 밖 · 저장된 '쓸 수 없음')의 말하기 · 회화 → 배치 평가 전 → 보통.
// 마이크 판정은 홈에 들어올 때마다 다시 한다(7절, 인식 API 가 없는 기기는 저장하지 않는다 — mic-state).
// '내 단계 찾기' 카드는 그 영역 배치 평가로 간다(차례 5).
// 닫힌 말하기 카드 아래 '다시 확인' 줄은 1-나 부모 화면 '마이크 다시 확인'이 생긴 뒤에도 둔다(3절 R-10 — 아래 0-가 문단).
// 첫 사용 꼴(13절 C166 R7 · UX 검토 3판 U2-1 · U2-2 · U2-3 · C179 (1)): 끝낸 세션이 없는 영역은 오늘 자리에 '첫 수업을 해 봐요' 한 줄만
// (숫자 0 · '이번 주' · '오늘 아직이에요' 없음 — 배치 전 카드도 '이번 주'를 숨김), 오늘 할 것이 남은 앞 영역 하나에 '여기부터 해요' 표지,
// 배치 전 회화 단추는 '말하기 단계 찾기'(누르면 말하기 배치 평가).
// UI · UX 묶음 0-가(3절 R-10 · R-11, N-9 · N-10): 닫힌 카드 다시 확인 줄은 막힘 판의 '다시 해 볼래요'와 같은 확인(runMicRetry — 그 기기
// 마이크를 누름 처리 안에서 다시 확인, 되면 저장된 '쓸 수 없음'을 지우고 카드가 열림, 1-나 뒤에도 둔다). '첨삭이 왔어요'를 눌렀는데 쉬면
// 홈에 머문 채 쪽지 아래 한 줄 칸에 쉼 글, 다시 누르면 다시 판정한다.
// 위 띠 오른쪽 칸(R-12 · 0-다 homeBandChipsOf): 연속 학습 일수(P12 가 값을 넣음) · 별 수는 값이 1 이상일 때만 그린다(HomeBandChips).
import { Check, Circle, Flame, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { AreaArt } from "@/components/board/area-art";
import {
  AREA_LABEL,
  BigLink,
  ConfirmSheet,
  ICON_STROKE,
  PostIt,
  SmallButton,
  StatusLine,
  type Tilt,
} from "@/components/board/board";
import { AiRestLine, troubleTextOf } from "@/components/session/ai-rest";
import {
  MIC_BLOCKED_TEXT,
  runMicRetry,
} from "@/components/session/mic-blocked";
import { WaitHint } from "@/components/session/wait-hint";
import { TeacherPortrait } from "@/components/teacher/teacher-portrait";
import { homeBandChipsOf } from "@/core/home/band";
import type { Area } from "@/core/seed/structure";
import { TEACHER_TEXT } from "@/core/teacher/name";
import type { TeacherView } from "@/core/teacher/roster";
import { micUsable } from "@/lib/mic-state";
import { createBrowserSpeech } from "@/lib/speech/browser";
import type { SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";
import { micCheckSpeech } from "@/server/actions/session";
import type { HomeCard } from "@/server/home";
import {
  LESSON_START_TEXT,
  useLessonStart,
} from "./[area]/lessons/use-lesson-start";

// 5.2 카드 기울기 판 차례(−1.4 · 1 · −0.6 · 1.2°) — 둘째는 1°(묶음 3 검토 M2)
const TILTS: readonly Tilt[] = ["left", "slightRight", "slight", "right"];
/**
 * 영역 카드의 최소 높이(화면 꼴 상수 — 목업 B_Home4 네 장 400px). 한 판의 카드는 줄 높이로 늘어 같은 높이가 되고(C114), 안 내용은 위에서부터,
 * 시작 단추만 아래 끝(mt-auto — taste §4.2 같은 줄 아래 끝).
 */
const HOME_CARD_MIN_H = "min-h-[400px]";
/** 회화 카드 작은 초상 한 변(px, spec 설계 5.5 '56px 안팎'). */
const HOME_PORTRAIT_PX = 56;
/**
 * 영역 그림 자리(화면 꼴 상수): 높이 120px · 그림 비(180 × 150)대로 너비, 카드 가운데. 세로 820 두 줄에서도 카드 넷이 보는 창 안에 들게
 * 시안 ② 의 206 × 178 보다 줄였다(화면 검토가 정함).
 */
const AREA_ART_SIZE = "h-30 aspect-[6/5] shrink-0 self-center";
/** 카드 머리 줄 높이(초상 56px 와 같게 — 머리가 없는 카드도 같은 줄에 단계가 온다). */
const CARD_HEAD = "flex min-h-14 items-center justify-between gap-3";
/** 마이크가 있어야 하는 영역(4절 '마이크를 쓸 수 없을 때'). */
const MIC_AREAS: readonly Area[] = ["speaking", "talk"];

/** 홈 카드 글(4절 홈 표 · 정본 밖 문구 C72 · C166). */
export const HOME_TEXT = {
  findLevel: "내 단계 찾기",
  /** 배치 전 회화 카드 단추(U2-3 — 누르면 말하기 배치 평가가 열린다). */
  findSpeakingLevel: "말하기 단계 찾기",
  /** 수업을 하나도 안 한 영역(U2-1 · C166 R7). */
  firstLesson: "첫 수업을 해 봐요",
  /** 오늘 할 것이 남은 앞 영역 하나(U2-2 — 수업 목록의 표지와 같은 글). */
  startHere: "여기부터 해요",
  /** '내 단계 찾기' 아래 안내(C72 — 요청자가 잠긴 것으로 봄, 2026-10-18). */
  findLevelHint: "단계를 몰라도 돼요. 짧은 문제로 찾아요",
  /** 닫힌 말하기 카드 아래 다시 확인(C72 · 3절 R-10 — 1-나 부모 화면 '마이크 다시 확인'과 함께 둔다). */
  micRecheck: "마이크를 켰으면 여기를 눌러 다시 확인해요",
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  todayDone: "오늘 다 했어요",
  todayNotYet: "오늘 아직이에요",
  start: "시작!",
  chooseStory: "이야기 고르기",
  level: (n: number) => `${n}단계`,
  week: (n: number) => `이번 주 ${n}일`,
  /** 위 띠 별 칸(4절 홈 '그 밖' 행 — 값 1 이상일 때만). */
  stars: (n: number) => `별 ${n}개`,
  /** 위 띠 연속 학습 일수 칸(시안 ② 띠 글 — P12 가 값을 넣는다, 값 1 이상일 때만). */
  streak: (n: number) => `연속 ${n}일`,
} as const;
const TEXT = HOME_TEXT;

/**
 * 위 띠 오른쪽 칸(R-12 · AC-23c): 연속 학습 일수 → 별 수. 값이 없거나 1 보다 작은 칸은 그리지 않는다(homeBandChipsOf — 첫 사용 홈의
 * 위 띠에 0 이 없다). 연속 칸은 P12 가 streakDays 를 넘기면 그린다(0-다 검토 M1).
 */
export function HomeBandChips({
  starTotal,
  streakDays,
}: {
  starTotal: number;
  streakDays?: number | null;
}) {
  return (
    <>
      {homeBandChipsOf({ starTotal, streakDays }).map((chip) =>
        chip.kind === "stars" ? (
          <span
            key={chip.kind}
            data-star-total=""
            className="flex items-center gap-2 font-heading text-2xl"
          >
            <Star
              aria-hidden
              className="size-7 fill-postit-reading"
              strokeWidth={ICON_STROKE}
            />
            {TEXT.stars(chip.value)}
          </span>
        ) : (
          <span
            key={chip.kind}
            data-streak=""
            className="flex items-center gap-2 font-heading text-2xl"
          >
            <Flame
              aria-hidden
              className="size-7 fill-postit-speaking"
              strokeWidth={ICON_STROKE}
            />
            {TEXT.streak(chip.value)}
          </span>
        ),
      )}
    </>
  );
}

/** 카드 오늘 자리(순수): 첫 사용 · 배치 전(이번 주 — 첫 사용이면 숨김) · 보통(표지 · 오늘 이야기 · 이번 주). */
export type HomeToday =
  | { kind: "first" }
  | { kind: "gate"; week: number | null }
  | {
      kind: "progress";
      /** '오늘 다 했어요' 표지 · '오늘 아직이에요' · 없음(새 수업은 했지만 복습이 남은 날). */
      mark: "done" | "not_yet" | null;
      /** 회화: 오늘 이야기 제목('오늘 아직이에요' 자리, R-8). */
      story: string | null;
      week: number;
    };

/**
 * 오늘 자리(R-4 · R-6 · R-8 · [승인 UX2] · C179 (1)): 끝낸 세션이 없는 영역은 '첫 수업을 해 봐요'만(배치 전 카드는 '이번 주'를 숨김),
 * 보통은 오늘 완료 표지 또는 '오늘 아직이에요'와 '이번 주 n일'. 회화는 '오늘 아직이에요' 대신 오늘 이야기 제목이고 오늘 완료면 그 위에 표지.
 */
export function homeTodayOf(card: HomeCard): HomeToday {
  if (card.gate !== null)
    return { kind: "gate", week: card.firstLesson ? null : card.thisWeek };
  if (card.firstLesson) return { kind: "first" };
  const talk = card.area === "talk";
  const mark = card.today.done
    ? "done"
    : !talk && !card.today.newLessonDone
      ? "not_yet"
      : null;
  return {
    kind: "progress",
    mark,
    story: talk ? (card.storyTitle ?? null) : null,
    week: card.thisWeek,
  };
}

/** 카드 꼴: 배치 전(gate) · 첫 수업 전(first) · 보통(progress). */
export function homeCardLookOf(card: HomeCard): "gate" | "first" | "progress" {
  if (card.gate !== null) return "gate";
  return card.firstLesson ? "first" : "progress";
}

/**
 * '여기부터 해요' 표지를 붙일 영역(U2-2): 판 차례(읽기 → 쓰기 → 말하기 → 회화)에서 오늘 할 것이 남은 앞 영역 하나.
 * 마이크가 있어야 하는 영역은 판정이 끝나 쓸 수 있을 때만, 말하기 배치를 기다리는 회화(말하기 배치로 감)는 고르지 않는다.
 */
export function startHereAreaOf(
  cards: readonly HomeCard[],
  micOk: boolean | undefined,
): Area | undefined {
  return cards.find((card) => {
    if (MIC_AREAS.includes(card.area) && micOk !== true) return false;
    if (card.gate === "needs_speaking") return false;
    if (card.gate === "placement") return true;
    return !card.today.done;
  })?.area;
}

/** '여기부터 해요' 표지(카드 위 끝 오른쪽 — 카드 높이를 늘이지 않는다, C114). 글은 카드 링크의 읽히는 이름에 든다. */
function StartHereBadge() {
  return (
    <span
      data-start-here=""
      className="absolute -top-4 right-4 z-10 rounded-lg bg-ink px-3 py-1 font-heading text-[22px] text-paper"
    >
      {TEXT.startHere}
    </span>
  );
}

/** 카드 머리: 영역 이름(회화는 옆에 작은 초상 — R-8) · 단계(크게, 배치 전은 없음). */
function CardHead({
  card,
  teacher,
  level = true,
}: {
  card: HomeCard;
  teacher: TeacherView | null;
  level?: boolean;
}) {
  return (
    <>
      <span className={CARD_HEAD}>
        <span className="font-heading text-3xl">{AREA_LABEL[card.area]}</span>
        {card.area === "talk" ? (
          <span data-home-portrait="" className="shrink-0">
            <TeacherPortrait
              teacher={teacher}
              size={HOME_PORTRAIT_PX}
              shape="window"
            />
          </span>
        ) : null}
      </span>
      {level ? (
        <span className="font-heading text-5xl leading-none">
          {TEXT.level(card.level ?? 0)}
        </span>
      ) : null}
    </>
  );
}

/** 카드 아래 끝 행동 자리('시작!' · '이야기 고르기'). action 이 거짓이면 자리만 비운다(마이크 판정 전, 화면 검토 H-M2). */
function ActionPill({ card, action }: { card: HomeCard; action: boolean }) {
  return action ? (
    <span
      aria-hidden
      className="flex min-h-14 items-center justify-center rounded-button bg-ink font-heading text-2xl text-paper shadow-button"
    >
      {card.area === "talk" ? TEXT.chooseStory : TEXT.start}
    </span>
  ) : (
    <span aria-hidden className="min-h-14" />
  );
}

/** '오늘 다 했어요' 표지(시안 ② — 먹색 동그라미 체크 · 종이 알약 · 조금 기욺). */
function DoneMark() {
  return (
    <span
      data-today="done"
      className="inline-flex -rotate-3 items-center gap-2 self-start rounded-full border-(length:--paper-edge) border-ink bg-paper py-1 pr-4 pl-1 font-heading text-[22px]"
    >
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-full bg-ink text-paper"
      >
        <Check className="size-5" strokeWidth={ICON_STROKE} />
      </span>
      {TEXT.todayDone}
    </span>
  );
}

/** 오늘 자리(homeTodayOf 그대로). 보조 줄은 안내 글 20px(data-size-guide), 표지 · 오늘 이야기는 이름표 22px 이상. */
function TodayLines({ today }: { today: HomeToday }) {
  if (today.kind === "first")
    return (
      <span
        data-first-lesson=""
        className="font-heading text-[26px] leading-snug"
      >
        {TEXT.firstLesson}
      </span>
    );
  const week =
    today.week === null ? null : (
      <span data-week="" data-size-guide="">
        {TEXT.week(today.week)}
      </span>
    );
  if (today.kind === "gate") return week;
  return (
    <span className="flex flex-col gap-2">
      {today.mark === "done" ? <DoneMark /> : null}
      {today.mark === "not_yet" ? (
        <span
          data-today="not-yet"
          data-size-guide=""
          className="flex items-center gap-2"
        >
          <Circle aria-hidden className="size-6" strokeWidth={ICON_STROKE} />
          {TEXT.todayNotYet}
        </span>
      ) : null}
      {today.story ? (
        <span
          data-story-title=""
          className="font-heading text-2xl leading-snug"
        >
          {today.story}
        </span>
      ) : null}
      {week}
    </span>
  );
}

/**
 * 카드 내용(보통 · 첫 수업 전): 머리 · 영역 그림 · 오늘 자리 · 아래 끝 큰 단추. action 이 거짓이면 행동 자리('시작!' · '이야기 고르기')를
 * 비운다(마이크 판정 전, 화면 검토 H-M2).
 */
function CardBody({
  card,
  action,
  teacher,
}: {
  card: HomeCard;
  action: boolean;
  teacher: TeacherView | null;
}) {
  return (
    <>
      <CardHead card={card} teacher={teacher} />
      <AreaArt area={card.area} className={AREA_ART_SIZE} />
      <TodayLines today={homeTodayOf(card)} />
      <span className="mt-auto flex flex-col gap-2">
        <ActionPill card={card} action={action} />
      </span>
    </>
  );
}

/**
 * 배치 평가 전 카드 내용: 위에서부터 영역 이름 · 영역 그림 · 안내(단계 찾기 힌트 · 회화는 말하기 시작 단계 전 문구) · 이번 주(첫 사용이면
 * 숨김), 아래 끝에 '내 단계 찾기' 단추 꼴(CardBody '시작!'과 같은 꼴 — 늘인 카드의 발에는 단추만, design-taste §4.2 · C114 · 디자인
 * fix 1a). 단추 글은 카드 링크의 읽히는 이름에 든다. 마이크 판정 전(action 거짓)이면 단추 자리만 비워 둔다.
 */
function GateBody({
  card,
  action,
  teacher,
}: {
  card: HomeCard;
  action: boolean;
  teacher: TeacherView | null;
}) {
  return (
    <>
      <CardHead card={card} teacher={teacher} level={false} />
      <AreaArt area={card.area} className={AREA_ART_SIZE} />
      {card.gate === "placement" ? (
        <span data-find-level-hint="" data-size-guide="">
          {TEXT.findLevelHint}
        </span>
      ) : (
        <span data-size-guide="">{TEACHER_TEXT.needsSpeaking}</span>
      )}
      <TodayLines today={homeTodayOf(card)} />
      {action ? (
        <span
          data-find-level=""
          className="mt-auto flex min-h-14 items-center justify-center rounded-button bg-ink font-heading text-2xl text-paper shadow-button"
        >
          {card.gate === "needs_speaking"
            ? TEXT.findSpeakingLevel
            : TEXT.findLevel}
        </span>
      ) : (
        <span aria-hidden className="mt-auto min-h-14" />
      )}
    </>
  );
}

export function HomeCards({
  cards,
  teacher = null,
}: {
  cards: HomeCard[];
  /** 고른 회화 선생님(회화 카드 작은 초상, 고르기 전 null — 글자 동그라미 '선'). */
  teacher?: TeacherView | null;
}) {
  // undefined: 아직 판정 전(첫 그리기). 그동안 말하기 · 회화 카드는 틀만 그리고 행동 자리 · 닫힘 문구를 비운다(화면 검토 H-M2)
  const [micOk, setMicOk] = useState<boolean | undefined>();
  useEffect(() => {
    setMicOk(micUsable());
  }, []);
  const startHere = startHereAreaOf(cards, micOk);

  // 카드 안 보조 줄(이번 주 · 오늘 아직 · 안내)은 안내 글 20px 라 data-size-guide 를 단다(13절 C82 — 22px 는 영역 · 단계 · 단추 · 표지 이름표)
  // 한 판의 영역 카드는 같은 높이(C114 · 시안 ② 홈 — 네 장 같은 높이), 판 아래로는 책상이 보인다(화면 검토 H-M1).
  // items-stretch 는 같은 줄만 늘리므로 세로 두 줄(2×2)은 줄 높이도 같은 몫(auto-rows-fr — 가장 높은 줄에 맞춤)으로 둔다(첫 프리뷰 분류 I).
  // 판은 내용 높이라(flex-1 없음) 남는 화면을 줄에 나눠 주지 않는다.
  // 카드의 읽히는 이름은 안의 글(영역 · 단계 · 상태 · 닫힘 까닭)이다 — label 을 넘기지 않는다(검토 M-3 · H-M3)
  return (
    <div
      data-home-cards=""
      // 마이크 판정이 끝나 행동 자리까지 그려졌다는 표시(e2e 크기 훑기가 기다린다 — 검토 review-p10-7-code M-2)
      data-hydrated={micOk === undefined ? undefined : ""}
      className="grid auto-rows-fr grid-cols-2 items-stretch gap-6 landscape:grid-cols-4"
    >
      {cards.map((card, i) => {
        const tilt = TILTS[i] ?? "none";
        const needsMic = MIC_AREAS.includes(card.area);
        if (needsMic && micOk === false) {
          const closed = (
            <PostIt
              tone={card.area}
              tilt={tilt}
              paperKey={card.area}
              disabled
              href={`/${card.area}/lessons`}
              className={cn(HOME_CARD_MIN_H, "flex-1")}
            >
              <span data-home-card={card.area} className="contents">
                <CardHead card={card} teacher={teacher} level={false} />
                <AreaArt area={card.area} className={AREA_ART_SIZE} />
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
              <MicRecheck onUsable={() => setMicOk(micUsable())} />
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
              paperKey={card.area}
              className={HOME_CARD_MIN_H}
              {...(pending ? {} : { href: `/${target}/placement` })}
            >
              {startHere === card.area ? <StartHereBadge /> : null}
              <span data-home-card={card.area} className="contents">
                <GateBody card={card} action={!pending} teacher={teacher} />
              </span>
            </PostIt>
          );
        }
        return (
          <PostIt
            key={card.area}
            tone={card.area}
            tilt={tilt}
            paperKey={card.area}
            className={HOME_CARD_MIN_H}
            {...(pending
              ? {}
              : // 회화 카드도 그 영역 수업 목록으로(plan-p13b 값 12)
                { href: `/${card.area}/lessons` })}
          >
            {startHere === card.area ? <StartHereBadge /> : null}
            <span data-home-card={card.area} className="contents">
              <CardBody card={card} action={!pending} teacher={teacher} />
            </span>
          </PostIt>
        );
      })}
    </div>
  );
}

/** 다시 확인 줄의 음성 설정 상태: 읽는 중 · 읽음(음성 접점 있음) · 읽지 못함. */
export type MicRecheckLoad = "loading" | "ready" | "failed";

/** 다시 확인 줄 누름(순수, 검토 0-가 M3): 설정을 읽었으면 마이크 확인, 읽지 못했으면 다시 읽음, 읽는 중이면 기다림. */
export function micRecheckPressOf(
  load: MicRecheckLoad,
): "check" | "reload" | "wait" {
  if (load === "ready") return "check";
  return load === "failed" ? "reload" : "wait";
}

/**
 * 닫힌 말하기 카드 아래 다시 확인 줄(3절 R-10 · C72): 막힘 판의 '다시 해 볼래요'와 같은 확인(runMicRetry). 음성 설정은 카드가 닫혀 있을 때
 * 서버에서 읽어 음성 접점을 만들어 둔다(누름 처리 안에서 인식을 시작해야 해서 — iPad Safari). 확인하는 동안 '아무 말이나 한마디 해 주세요',
 * 되면 onUsable(카드를 다시 판정), 안 되면 그대로 닫혀 있다. 설정을 읽지 못했으면 단추를 켠 채 끊김 · 실패 한 줄을 보이고, 누르면 다시
 * 읽는다(읽으면 한 번 더 눌러 확인 — 검토 0-가 M3, 단추가 꺼진 채 안내 없는 때가 없게).
 */
function MicRecheck({ onUsable }: { onUsable: () => void }) {
  const [speech, setSpeech] = useState<SpeechPort | undefined>();
  const [load, setLoad] = useState<MicRecheckLoad>("loading");
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);
  /** 읽기 차례(누를 때 다시 읽으면 하나 늘림). */
  const [attempt, setAttempt] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: 읽기 차례가 바뀔 때마다 다시 읽는다
  useEffect(() => {
    let port: SpeechPort | undefined;
    let gone = false;
    setLoad("loading");
    void micCheckSpeech()
      .then((settings) => {
        if (gone) return;
        port = createBrowserSpeech({ settings });
        setSpeech(port);
        setLoad("ready");
      })
      .catch(() => {
        if (gone) return;
        setOnline(navigator.onLine);
        setLoad("failed");
      });
    return () => {
      gone = true;
      port?.dispose();
    };
  }, [attempt]);
  return (
    <>
      <SmallButton
        data-mic-recheck=""
        className="h-auto py-2 text-left"
        disabled={load === "loading" || checking}
        onClick={() => {
          const press = micRecheckPressOf(load);
          if (press === "reload") setAttempt((n) => n + 1);
          if (press !== "check" || !speech) return;
          setChecking(true);
          // 누름 처리 안에서 인식 객체를 시작한다(runMicRetry 는 await 전에 start 까지 부른다)
          void runMicRetry({ kind: "needsMic", speech, onRecovered: onUsable })
            .catch(() => undefined)
            .finally(() => setChecking(false));
        }}
      >
        {TEXT.micRecheck}
      </SmallButton>
      {checking ? (
        <p data-mic-retry-speak="" role="status" data-size-guide="">
          {MIC_BLOCKED_TEXT.retrySpeak}
        </p>
      ) : null}
      {load === "failed" ? (
        <StatusLine tone="error">
          <span data-mic-recheck-trouble="">{troubleTextOf(online)}</span>
        </StatusLine>
      ) : null}
    </>
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
    restAgain,
    waitingSince,
    stillReading,
  } = useLessonStart(waitHintSeconds);
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
      {/* 1-가 하루 안전 상한 — 홈에 머문 채 쪽지 아래 한 줄 칸(R-11, 판정이 끝난 뒤), 다시 누르면 다시 판정 */}
      {resting && !busy ? <AiRestLine again={restAgain} /> : null}
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

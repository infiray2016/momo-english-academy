"use client";

// 회화 틀(plan-p13b 파일별 값 7 · 회화 plan 묶음 11 · 12, 4절 회화 세션 표 · 3.3 회화 블록 · 7절 · 8절 · 13절 C34 · C92 · C110 · C189).
// 새 꼴 카드 세션만 그린다(TalkLessonFrame — 옛 꼴 틀은 묶음 12 가 지움). 네 토막(인사 → 짧은 준비 → 대화 → 정리) → 마무리 세 장
// (closing-cards). 위 종이 띠(오늘 이야기 제목 · '회화 · n단계 · 단원 u' · 지금 토막 이름 · '말 주고받기 n'(분모 없음 — 마무리 물음 뒤 '다
// 했어요! 더 이야기하기 n / …') · '홈'), 구석 작은 '그만하기'(서버가 참여가 거의 없다고 할 때만 확인 쪽지 — 정한 것 12 · C34), 옆 칸 하나
// (오늘 이야기 목록 — 카드 todayTopicsKo), 아래 '선생님의 약속' 한 줄. 이름 자리 글은 문구 표(TEACHER_TEXT)에 세션 선생님의 한글 이름을
// 넘긴다(고르기 전 '선생님').
// 열 때 차례: 마이크를 쓸 수 없는 기기면 막힘 판(큰 '다시 해 볼래요' · 작은 '홈' — 7절 · UX3) → 1-가 하루 안전 상한이면 '[이름](이/가) 잠깐
// 쉬어요'(AiRest) → 고른 선생님이 없으면 '선생님을 골라요' → '시작!'(무음 모드 한 줄은 silent-mode-note) → 처음 마이크 안내(기기마다 한 번).
// 대화 기록 칸(TalkLog — 지금 말풍선이 맨 아래), 마무리 물음 · 마무리 제안의 두 버튼(정한 것 11), 받침의 한국어 설명(끝 줄 explanation),
// 들리지 않음 뒤 '잘 모르겠어요' 한 번 반짝임 · 막힘 화면(끝 줄 silentBlocked), 힌트 단(current · 끝 줄 hints → revealTalkLessonHint).
// 토막 넘김은 서버 화면 자료의 할 일(step)을 따른다(advanceTalkLesson). 턴 요청은 talk-stream 의 되풀이(같은 시도 id)가 stale · 끊김을 다루고,
// 그래도 안 되면 '인터넷이 끊겼어요 …' + 큰 '다시 해 볼래요'(UI · UX N-11). 선생님 말이 없는 마지막 아이 행(view.retryTurn)은 열 때 같은
// 시도 id 로 다시 보낸다(8절 · AC-15f). ①② 처음 안내는 프로필마다 한 번(noticesSeen.talk_answer_tip → markTalkNotice, R-29). 판정 · 점수 ·
// 퍼센트를 보이지 않는다(R2). 녹음 없음.
// iPad 버리는 듣기(13절 C213 · C214 · C215, spec 설계 2 · 3, plan 접점 표 '층' · '소리 끝'): speech.discard_mode 가 이 기기에서 켜지면 음성 접점을
// 버리는 듣기 층으로 감싸 선생님 목소리 감싸기 아래에 둔다(없으면 지금 객체 그대로 — AC-11). 틀은 아이 차례 · 정리에서 읽기 줄이 빈 때 소리 끝을,
// 턴을 보낸 뒤 끝 줄까지 서버 기다림을 알리고, 쉬는 안내 · 막힘 · 마무리 · 홈은 새 화면 줄보다 먼저 떠남을 보낸다(끝나는 화면은 층을 닫아 그 뒤
// 읽기가 버림을 다시 열지 않게). 버림 안 짧은 말은 시드 목록(talkShortLines)에서 자리마다 돌려 고르고, 아이 차례 칸 위에 선생님 줄 꼴로
// 보이며(1~4단계 뜻) 대화 기록 · talk_turns 에 넣지 않는다. 따라 말하기의 다시 말할 차례는 짧은 말 대신 그 들려줄 말을 읽힌다.
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CHILD_SIZE } from "@/components/activities/common";
import {
  AREA_LABEL,
  BigButton,
  ChildScreen,
  ConfirmSheet,
  PaperBand,
  SmallButton,
  StatusLine,
} from "@/components/board/board";
import { AiRest, useAiRestRetry } from "@/components/session/ai-rest";
import {
  MicBlockedPanel,
  useIpadSafari,
} from "@/components/session/mic-blocked";
import {
  SOUND_TRACK_START,
  type SoundTrack,
  soundRetryStepOf,
  soundTrackOf,
} from "@/components/session/sound-retry";
import { MicNotice } from "@/components/session/speaking";
import { TeacherChoice } from "@/components/teacher/teacher-choice";
import { useTeacherLayer } from "@/components/teacher/teacher-layer";
import { TeacherWindow } from "@/components/teacher/teacher-window";
import { fillName } from "@/core/ai/mask";
import type { ClientListen } from "@/core/conversation/client-listen";
import type { LeadOpen } from "@/core/conversation/lead-turn-core";
import {
  childLogEntryOf,
  liveTeacherEntryOf,
  type TalkLogEntry,
  type TalkLogReplayItem,
  talkLogAppend,
  talkLogOf,
} from "@/core/conversation/log";
import { waitLineOf } from "@/core/conversation/wait-line";
import { TALK_LOW_BAND } from "@/core/seed/structure";
import {
  type SpeechEvent,
  type SpeechVerdict,
  speakingCounters,
  speakingCountersStart,
} from "@/core/speaking/judge";
import type { DeviceVerdict } from "@/core/speech/device";
import type { DiscardView } from "@/core/speech/discard";
import {
  type DiscardMode,
  discardOnDevice,
} from "@/core/speech/discard-settings";
import { speakHeardOutcomeOf, speakRateOf } from "@/core/speech/pace";
import { TEACHER_TEXT } from "@/core/teacher/name";
import { praiseUntilOf, teacherStateOf } from "@/core/teacher/state";
import {
  markMicNoticeSeen,
  markMicUnavailable,
  micNoticeSeen,
  micUsable,
  readDeviceVerdict,
} from "@/lib/mic-state";
import { createBrowserSpeech } from "@/lib/speech/browser";
import {
  type DiscardLayer,
  type DiscardSoundLine,
  type DiscardSoundNeed,
  discardLayerFor,
} from "@/lib/speech/discard-layer";
import { createListenLog } from "@/lib/speech/listen-log";
import { teacherSpeech } from "@/lib/speech/teacher";
import type {
  SpeakOptions,
  SpeakOutcome,
  SpeechPort,
} from "@/lib/speech/types";
import {
  sendTalkLessonTurnRetrying,
  type TalkLeadOpenBody,
  type TalkTurnBody,
} from "@/lib/talk-stream";
import { cn } from "@/lib/utils";
import {
  advanceTalkLesson,
  chooseLessonMoreTalk,
  leaveTalkLesson,
  loadTalkLessonView,
  markTalkNotice,
  readTalkLessonWrap,
  revealTalkLessonHint,
  stopTalkLesson,
  talkClosingStatus,
} from "@/server/actions/conversation";
import { recheckAiRest, reportSessionMic } from "@/server/actions/session";
import type {
  ClosingStatus,
  HintView,
  LessonMoveOutcome,
  TalkLessonCurrent,
  TalkLessonPrep,
  TalkLessonView,
  WrapView,
} from "@/server/conversation";
import type {
  TalkLessonLine,
  TalkLessonNext,
} from "@/server/conversation/lesson-turn";
import {
  type ChildSend,
  ChildTurn,
  childHeardOf,
  createSpeakHitchLog,
  speakHitchOf,
  type TurnDiscard,
  withSpeakHitches,
} from "./child-turn";
import { ClosingCards } from "./closing-cards";
import {
  type FollowDiscard,
  type FollowEnv,
  LessonWrapUp,
  lessonFollowSaver,
  PrepNote,
  prepWithDone,
  TalkPaper,
  TalkStart,
} from "./follow-along";
import { TalkLog } from "./talk-log";
import {
  answerTipShownOf,
  BUBBLE_CLASS,
  BUBBLE_WIDTH,
  LESSON_BUBBLE_START,
  type LessonBubbleContent,
  type LessonBubbleLine,
  LessonToriBubble,
  lessonBubbleStep,
  lessonShownEnglishOf,
  lessonSpeakItemsOf,
  playedSoundsOf,
  type SpeakItem,
  soundlessOf,
  useReducedMotion,
  useSpeakQueue,
  useWaitLine,
} from "./tori";

/** 화면 글(4절 회화 세션 표 · 3.3 · 7절 · C34 · 8절 · 정본 밖 문구 표). 이름 자리 글(약속 · 그만하기 확인)은 TEACHER_TEXT. */
export const TALK_TEXT = {
  home: "홈",
  stop: "그만하기",
  more: "더 이야기하기",
  levelUnit: (level: number, unit: number) =>
    `${AREA_LABEL.talk} · ${level}단계 · 단원 ${unit}`,
  /** 새 흐름 위 띠 — 분모 없음(참고 턴은 아이에게 보이지 않는다, 4절 위 띠 행 · C188 · C189). */
  talkCount: (n: number) => `말 주고받기 ${n}`,
  moreCount: (n: number, round: number) =>
    `다 했어요! 더 이야기하기 ${n} / ${round}`,
  /** 4절 옆 칸 '오늘 이야기 목록'(검토 M-3). */
  topics: "오늘 이야기 목록",
  /** C34 확인 쪽지 단추(물음 글은 TEACHER_TEXT.stopConfirm). */
  stopYes: "그만할래요",
  stopNo: "더 이야기할래요",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  failed: "지금은 이야기할 수 없어요. 잠시 뒤에 다시 해 주세요",
  /** 8절 4단계부터 두 번 실패 — 'Oops' 뒤. */
  saved: "여기까지 이야기한 것은 저장했어요. 다음에 이어서 해요",
  lessons: "수업 목록",
  /** 끊김 · 실패 줄의 큰 단추(막힘 판과 같은 말 — UI · UX spec 설계 6 · N-11). */
  retry: "다시 해 볼래요",
  blocked: {
    needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
    stalled: "마이크가 잘 안 돼요. 부모님께 말해 주세요",
    silent: "말소리가 잘 안 들려요. 부모님께 말해 주세요",
  },
} as const;

type Blocked = keyof typeof TALK_TEXT.blocked;

/**
 * 정리가 읽을 끝인사 고르기(순수 · 비동기 — 검토 B N-2): 끝맺음 상태를 한 번 묻고, 와 있으면 그 끝인사(closing), 아니거나 묻기가 실패하면
 * 카드 끝인사를 정리가 읽는다. bye 는 정리가 실제로 읽는 끝인사 — 실패해도 첫 장에 남긴다('읽은 것은 남김', C167 (1)).
 */
export async function wrapFarewellOf(
  read: () => Promise<ClosingStatus>,
  card: { en: string; ko?: string },
): Promise<{
  closing: { en: string; ko?: string } | undefined;
  bye: { en: string; ko?: string };
}> {
  const status = await read().catch(() => undefined);
  const closing = status?.state === "ready" ? status.farewell : undefined;
  return { closing, bye: closing ?? card };
}

/**
 * 마무리 첫 장에 남길 끝인사 글(C167 (1) · 검토 B M-6, 순수 함수): 정리에서 읽은 끝인사(bye — 끝맺음 끝인사가 왔으면 그것, 아니면 카드
 * 끝인사)만 이름을 채워 넘긴다. 정리를 거치지 않고 첫 장만 보이는 길(목표 턴 뒤 '홈' · 열자마자 마무리)은 bye 가 없어 글을 두지 않는다.
 */
export function closingFarewellOf(
  bye: { en: string; ko?: string } | undefined,
  englishName: string,
): { en: string; ko?: string } | undefined {
  if (!bye) return undefined;
  return {
    en: fillName(bye.en, englishName),
    ...(bye.ko ? { ko: fillName(bye.ko, englishName) } : {}),
  };
}

const LESSONS_PATH = "/talk/lessons";

/** 대화 밖 큰 차례(토막 정리 · 마무리 세 장). */
type Stage = "talk" | "wrap" | "closing";

/** 인식 실패 셈의 상한 — 회화의 말소리 없음(C22)은 틀이 질문마다 따로 세므로 P11a 셈에는 그 상한을 두지 않는다(검토 M-6). */
export function talkCounterLimits(maxRetries: number) {
  return { maxRetries, silentItemsMax: Number.POSITIVE_INFINITY };
}

/**
 * 쉼이 풀릴 때 다시 보낼 턴을 꺼낸다(순수 — 손잡이 둘을 비움): 멈춘 턴(없으면 null)을 돌려주고, 말을 멈춘 때를 비워 그 턴의 체감 대기를
 * 재지 않는다(쉼 시간이 C125 체감 대기 칸에 들어가지 않게 — 검토 0-가 M5).
 */
export function takeRestResend<T>({
  resend,
  listenEndedAt,
}: {
  resend: { current: T | null };
  listenEndedAt: { current: number | undefined };
}): T | null {
  const body = resend.current;
  resend.current = null;
  listenEndedAt.current = undefined;
  return body;
}

/** 체감 대기(ms) = 첫 문장을 그린 때 − 아이가 말을 멈춘 때(C23 — 듣기 끝 대기 · 확인 시간 포함, 검토 M-1). 시작을 모르면 없음. */
export function perceivedWaitOf(
  endedAt: number | undefined,
  firstAt: number,
): number | undefined {
  return endedAt === undefined
    ? undefined
    : Math.max(0, Math.round(firstAt - endedAt));
}

/**
 * 선생님 창을 그리는가(선생님 화면 plan 값 13 · 4절 '처음 회화' · '회화 마무리 — 초상만'): 고른 선생님이 있고 막힘 · 쉼 · 마무리 세 장이
 * 아닐 때. 고르는 화면에는 없고 '시작!' 화면 · 처음 마이크 안내 · 토막 · 정리에는 있다.
 */
export function teacherWindowShown(s: {
  hasTeacher: boolean;
  blocked: boolean;
  resting: boolean;
  stage: Stage;
}): boolean {
  return s.hasTeacher && !s.blocked && !s.resting && s.stage !== "closing";
}

/** 목표 턴 칭찬(4절 '선생님 창' 칭찬 행 · R2): 목표 턴이 이번 턴 끝 줄에서 처음 참이 됐는가(이미 닿은 뒤 · 닿기 전은 아님). */
export function targetReachedNow(before: boolean, after: boolean): boolean {
  return !before && after;
}

/** 끊김 · 실패 줄(다시 부를 일이 있으면 큰 '다시 해 볼래요' — 검토 I-1 · M-11 · UI · UX N-11, 같은 시도 id 로 같은 턴). */
export function TroubleLine({
  phase,
  retry,
}: {
  phase: "offline" | "failed";
  retry: (() => void) | null;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <StatusLine tone="error">
        {phase === "offline" ? TALK_TEXT.offline : TALK_TEXT.failed}
      </StatusLine>
      {retry ? (
        <BigButton
          data-talk-retry=""
          data-button-size="big"
          onClick={() => retry()}
        >
          {TALK_TEXT.retry}
        </BigButton>
      ) : null}
    </div>
  );
}

// ── 새 흐름(새 꼴 카드 세션 — 회화 plan 묶음 11, 정본 3.3 회화 블록 · 4절 회화 세션 표) ─────────────

/** 위 띠 토막 이름(4절 위 띠 행 — 인사 · 짧은 준비 · 대화 · 정리, 더 이야기하기도 대화). */
const LESSON_SEGMENT_LABEL = {
  greeting: "인사",
  prep: "짧은 준비",
  talk: "대화",
  more_talk: "대화",
  wrap_up: "정리",
} as const satisfies Record<TalkLessonView["segment"], string>;

export function lessonSegmentLabelOf(
  segment: TalkLessonView["segment"],
): string {
  return LESSON_SEGMENT_LABEL[segment];
}

type LessonPosition = TalkLessonView["position"];
/** 토막 넘김 · '더 이야기하기' · 다시 읽은 자료에서 화면에 둘 칸(LessonMoveOutcome 의 ok 갈래 · TalkLessonView 가 함께 갖는 꼴). */
type LessonMoveFields = {
  segment: TalkLessonView["segment"];
  step: TalkLessonView["step"];
  position: LessonPosition;
  current: TalkLessonCurrent | null;
  prep: TalkLessonPrep | null;
};

/**
 * 새 흐름 위 띠(순수 함수, 4절 위 띠 행 · C188 · C189): 토막 이름과 '말 주고받기 n'(분모 없음). 마무리 물음 뒤에는 '다 했어요! 더 이야기하기
 * n / talk.more_talk_round_turns'(C30). 셈은 인사 · 대화 · 더 이야기하기에서만 보이고, 짧은 준비(인사 뒤 · 대화 중) · 정리 · 마무리에서는 숨긴다
 * (자리는 부르는 쪽이 늘 잡는다 — 띠가 흔들리지 않게).
 */
export function lessonBandOf({
  stage,
  segment,
  inPrep,
  position,
  moreRoundTurns,
}: {
  stage: Stage;
  segment: TalkLessonView["segment"];
  /** 짧은 준비 쪽지를 보이는 중(대화 중 연 준비 포함). */
  inPrep: boolean;
  position: Pick<LessonPosition, "talkCount" | "closingAsked" | "moreInRound">;
  moreRoundTurns: number;
}): { segment: string | undefined; countShown: boolean; counter: string } {
  const counter = position.closingAsked
    ? TALK_TEXT.moreCount(position.moreInRound, moreRoundTurns)
    : TALK_TEXT.talkCount(position.talkCount);
  if (stage === "closing")
    return { segment: undefined, countShown: false, counter };
  if (stage === "wrap")
    return {
      segment: LESSON_SEGMENT_LABEL.wrap_up,
      countShown: false,
      counter,
    };
  if (inPrep || segment === "prep")
    return { segment: LESSON_SEGMENT_LABEL.prep, countShown: false, counter };
  return {
    segment: LESSON_SEGMENT_LABEL[segment],
    countShown:
      segment === "greeting" || segment === "talk" || segment === "more_talk",
    counter,
  };
}

/**
 * 마지막 선생님 행 → 말풍선(순수 함수, 이어 하기 · 토막 넘김 · '더 이야기하기' 뒤 — AI 없음, AC-15f). 차례는 턴 길과 같다(묶음 8 '붙일 줄
 * 규칙'): AI 글 → 뜻 → 소리 줄(따라 할 말 · 선택지) → 받침의 답 소리 → 앱이 붙인 화면 글(카드 질문 · 마무리 물음 · 4단계부터 답 글). 소리 줄은
 * move.sound 에만 있어 글로 보이지 않는다(T2 — 듣기 단추만).
 */
export function lessonBubbleOf(
  current: TalkLessonCurrent | null,
): LessonBubbleContent {
  if (!current) return { lines: [], done: true };
  const lines: LessonBubbleLine[] = current.lines
    .filter((l) => !l.app)
    .map((l) => ({ t: "s", en: l.en }));
  const sound = current.sound;
  if (sound?.model) lines.push({ t: "sound", kind: "model", say: sound.model });
  if (sound?.choices)
    lines.push({ t: "sound", kind: "choices", answers: sound.choices });
  if (sound?.answer)
    lines.push({ t: "sound", kind: "answer", say: sound.answer });
  for (const l of current.lines)
    if (l.app)
      lines.push({
        t: "add",
        kind: "question",
        en: l.en,
        ...(l.ko ? { ko: l.ko } : {}),
      });
  const ko = current.lines
    .flatMap((l) => (!l.app && l.ko ? [l.ko] : []))
    .join(" ");
  return { lines, ...(ko ? { ko } : {}), done: true };
}

/** 선생님 말을 다 받고 글이 흐른 뒤 할 일. reload 는 화면 자료를 다시 읽어 서버의 할 일(step)을 따른다. */
export type LessonAfter =
  | { kind: "child" }
  | { kind: "choice" }
  | { kind: "advance"; to: "prep" | "talk" }
  | { kind: "prep" }
  | { kind: "reload" }
  | { kind: "retry" }
  | { kind: "wrap" };

/** 화면 자료 · 액션 결과의 할 일(step) → 틀의 할 일(순수 함수). 선생님 고르기 전은 틀이 고르는 화면을 그리므로 아이 차례로 둔다. */
export function lessonAfterOf(step: TalkLessonView["step"]): LessonAfter {
  switch (step.kind) {
    case "advance":
      return { kind: "advance", to: step.to };
    case "prep":
      return { kind: "prep" };
    case "choice":
      return { kind: "choice" };
    case "retry":
      return { kind: "retry" };
    case "closed":
      return { kind: "wrap" };
    default:
      return { kind: "child" };
  }
}

/**
 * 턴 끝 줄 → 틀의 할 일(순수 함수): 고르기(마무리 물음 · 마무리 제안)면 두 버튼, 대화 중 연 짧은 준비 · 대화 첫 질문 차례 · 인사 끝이면 화면
 * 자료를 다시 읽는다(쪽지 낱말 · 짧은 준비로 갈지는 서버가 안다 — 턴 길은 그 차례를 받지 않는다, 묶음 8 보고), 아니면 아이 차례.
 */
export function lessonAfterEndOf(
  n: Pick<
    TalkLessonNext,
    "choice" | "prep" | "firstQuestionDue" | "segment" | "greetingDone"
  >,
): LessonAfter {
  if (n.choice) return { kind: "choice" };
  if (
    n.prep ||
    n.firstQuestionDue ||
    (n.segment === "greeting" && n.greetingDone)
  )
    return { kind: "reload" };
  return { kind: "child" };
}

/**
 * 토막 넘김 · '더 이야기하기' 결과를 어떻게 둘까(순수 함수, 묶음 S3 — 'Claude 주도' spec 설계 3 · 13절 C241): 새 엔진 신호(leadTurn)가 없으면
 * 지금처럼 화면에 둔다(move). 있으면 서버가 선생님 행을 붙이지 않았으니 아이 말 없는 턴 요청으로 그 입구를 부른다(lead). 같은 입구를 이미
 * 보내는 중이면(연타로 액션이 두 번 돌아옴) 아무것도 하지 않는다(skip — 같은 요청을 두 번 보내지 않는다).
 */
export function lessonMoveActionOf(
  out: { leadTurn?: LeadOpen | undefined },
  sending: LeadOpen | null,
): { kind: "move" } | { kind: "lead"; open: LeadOpen } | { kind: "skip" } {
  const open = out.leadTurn;
  if (open === undefined) return { kind: "move" };
  return open === sending ? { kind: "skip" } : { kind: "lead", open };
}

/** 아이 말 없는 턴 요청 본문(순수 함수, 묶음 S3 — 서버 turn.ts 의 아이 말 없는 요청 꼴: 수업 id 와 입구 하나). */
export function leadOpenBodyOf(
  sessionId: string,
  open: LeadOpen,
): TalkLeadOpenBody {
  return { sessionId, lead: open };
}

/** 턴 요청을 처음 보내는가(아이 말 · 새 엔진 신호) · 다시 보내는가(다시 해 보기 · 연결이 돌아옴 · 쉬는 중이 풀림). */
export type SubmitSend = "first" | "again";

/**
 * 턴 요청을 보낼 때의 갈림(순수 함수, 묶음 S3 고침 1 — 검토 rev-s3 M-1 · M-4): 아이 말 요청은 지금처럼 늘 읽기 줄을 끊고 체감 대기를 잰다.
 * 아이 말 없는 요청(새 엔진 입구 start · more)은 아이가 말을 멈춘 때가 없어 체감 대기를 재지 않고(앞 차례에 잰 값은 다음 아이 말이 그대로
 * 싣는다), 신호를 받아 처음 보낼 때만 앞 말풍선(인사 끝 · 마무리 물음)을 읽는 중일 수 있어 끊지 않는다. 다시 보낼 때는 실패한 시도에서
 * 흘러온 문장을 두 번 듣지 않게 끊는다.
 */
export function submitPlanOf(
  body: TalkTurnBody | TalkLeadOpenBody,
  send: SubmitSend,
): { cancelReading: boolean; measurePerceived: boolean } {
  const childTurn = !("lead" in body);
  return {
    cancelReading: childTurn || send === "again",
    measurePerceived: childTurn,
  };
}

/**
 * 닫는 줄을 받은 화면의 처리(순수 함수, 묶음 S3 고침 1): 쉬는 중으로 닫혔고 정리 줄이 있으면(참여 완료 뒤 — 아이 차례 길 · '더 이야기하기'
 * 입구 모두) 정리로, 아니면 끝인사와 '수업 목록'이다.
 */
export function lessonCloseActionOf(
  line: Extract<TalkLessonLine, { t: "close" }>,
): "wrap" | "closed" {
  return line.reason === "resting" && (line.lines?.length ?? 0) > 0
    ? "wrap"
    : "closed";
}

/**
 * 끝 줄까지 받고 글이 다 흘렀는가 — 턴 뒤 할 일(lessonAfterOf · lessonAfterEndOf)을 열 때(순수 함수, C166 R1 · U5-1 · 검토 A M-1). 읽어 주기
 * 끝은 기다리지 않는다(읽는 동안 말하기 단추가 열리고 누르면 읽기를 멈춘다, 7절 C53 (2)). 같은 말풍선에 줄을 이어 붙이는 중이면(흐른 줄 수가
 * 보일 줄 수보다 적으면) 그 줄까지 흐른 뒤다.
 */
export function lessonTurnReadyOf(s: {
  opening: boolean;
  phase: string;
  bubbleDone: boolean;
  typedDone: boolean;
  typedLines: number;
  shownLines: number;
}): boolean {
  return (
    !s.opening &&
    s.phase === "tori" &&
    s.bubbleDone &&
    s.typedDone &&
    s.typedLines >= s.shownLines
  );
}

/** 마무리 물음 · 마무리 제안 뒤 두 버튼(정한 것 11 — 앱 고정 대사는 붙이지 않음, 말로 답해도 된다). 꼴은 UI · UX 묶음 6 이 입힌다. */
export function LessonChoice({
  busy,
  onMore,
  onStop,
}: {
  busy: boolean;
  onMore: () => void;
  onStop: () => void;
}) {
  return (
    <div
      data-talk-choice=""
      className="flex flex-wrap items-center justify-center gap-4"
    >
      <BigButton disabled={busy} onClick={onMore}>
        {TALK_TEXT.more}
      </BigButton>
      <SmallButton disabled={busy} onClick={onStop}>
        {TALK_TEXT.stop}
      </SmallButton>
    </div>
  );
}

/** 고르기 차례에 말로도 답할 수 있나(02-2 295줄 · 정한 것 11): 마무리 제안이면 두 버튼과 함께 말하기, 마무리 물음(294줄)은 두 버튼만. */
export function lessonChoiceSpeechOf(
  choice: LessonPosition["choice"],
): boolean {
  return choice === "suggestion";
}

/** 말풍선 전체의 읽기 차례(소리 줄 항목에 줄 차례를 싣는다 — 들려줬는지 되찾기, playedSoundsOf). */
export function lessonSpokenItemsOf(
  content: Pick<LessonBubbleContent, "lines">,
  level: number,
): SpeakItem[] {
  return content.lines.flatMap((l, i) => lessonSpeakItemsOf(l, level, i));
}

/** 읽은 항목이 들려준 소리 줄이면 그 줄 차례(07절 34줄 — 들려주지 못함 · 읽지 않음은 들은 도움이 아니다). 아니면 null. */
export function lessonPlayedLineOf(
  item: SpeakItem,
  outcome: SpeakOutcome,
): number | null {
  if (item.w !== "sound" || item.line === undefined) return null;
  if (outcome.kind === "skipped") return null;
  return speakHeardOutcomeOf(outcome) === "not_played" ? null : item.line;
}

/** '소리가 안 나와서 글로 봐요' 세션 셈(07절 34줄 · 묶음 10 fix 1 soundlessOf): 들려주지 못한 선생님 글 말마다 하나 · 그때. 아니면 그대로. */
export function soundlessStepOf(
  state: { at: number | null; count: number },
  item: SpeakItem,
  outcome: SpeakOutcome,
  now: number,
): { at: number | null; count: number } {
  return soundlessOf(item, outcome)
    ? { at: now, count: state.count + 1 }
    : state;
}

/** 낱말 하나가 오늘 쓸 말인가(대소문자 · 끝 s · es 를 본다 — 원형 표는 화면 자료에 없어 근사, 보고 우려). */
/** 단원 단어마다 맞출 꼴(소문자): 원형 · 끝 s · es, 그리고 그 단어의 꼴 목록(vocab forms — ate · went · came, 묶음 11 재검토 N-4 (나)). */
function surfaceFormsOf(
  words: readonly string[],
  lemmaEntries: readonly { word: string; forms: readonly string[] }[],
): Set<string> {
  const out = new Set<string>();
  for (const w of words) {
    const word = w.toLowerCase();
    out.add(word);
    out.add(`${word}s`);
    out.add(`${word}es`);
    for (const e of lemmaEntries)
      if (e.word.toLowerCase() === word)
        for (const f of e.forms) out.add(f.toLowerCase());
  }
  return out;
}

/**
 * 정리에서 반짝일 기록 줄(03절 92줄): 아이가 말한 인식 글 가운데 오늘 쓸 말이 든 것(선생님 말 · '잘 모르겠어요' · '못 들었어요'는 아님).
 * 낱말 맞춤은 원형 · 끝 s · es 와 화면 자료의 꼴 목록(lemmaEntries)이다.
 */
export function wrapShineTextsOf(
  entries: readonly TalkLogEntry[],
  words: readonly string[],
  lemmaEntries: readonly { word: string; forms: readonly string[] }[] = [],
): string[] {
  if (words.length === 0) return [];
  const forms = surfaceFormsOf(words, lemmaEntries);
  return entries.flatMap((e) => {
    if (e.who !== "child" || e.said.kind !== "speech") return [];
    const tokens = e.said.text.toLowerCase().match(/[a-z']+/g) ?? [];
    return tokens.some((t) => forms.has(t)) ? [e.said.text] : [];
  });
}

/** 정리 반짝임 줄의 멈춘 강조(움직임 줄이기에서도 보임 — '잘 모르겠어요' 반짝임과 같은 테두리, 꼴은 UI · UX 묶음 6). */
const WRAP_SHINE_CLASS = ["ring-4", "ring-postit-talk"] as const;
/** 반짝임 한 바퀴(움직임을 허용한 기기만). */
const WRAP_SHINE_PULSE = "motion-safe:animate-pulse";

/**
 * 정리 화면의 대화 기록 칸(03절 92줄 — 동작만, 꼴은 UI · UX 묶음 6): 기록을 다시 보이고, 오늘 쓸 말이 든 아이 말 줄(꼴 목록 포함)에 표지
 * data-wrap-shine 과 멈춘 강조를 달고, 움직임을 허용한 기기는 한 번 반짝인다(애니메이션 한 바퀴 뒤 반짝임만 꺼짐 — 움직임 줄이기에서도 강조는
 * 보인다, 묶음 11 재검토 N-4). 기록 칸 조각(묶음 10 talk-log)에 줄 표지 속성이 없어 그린 뒤 그 줄을 찾아 단다.
 */
function WrapLog({
  entries,
  words,
  lemmaEntries,
  englishName,
  teacherName,
  listening,
  onReplay,
}: {
  entries: readonly TalkLogEntry[];
  words: readonly string[];
  lemmaEntries: readonly { word: string; forms: readonly string[] }[];
  englishName: string;
  teacherName?: string | undefined;
  listening: boolean;
  onReplay: (items: TalkLogReplayItem[]) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const shine = useMemo(
    () => wrapShineTextsOf(entries, words, lemmaEntries),
    [entries, words, lemmaEntries],
  );
  useEffect(() => {
    const el = box.current;
    if (!el || shine.length === 0) return;
    const marked: Element[] = [];
    for (const said of el.querySelectorAll('[data-child-said="speech"]')) {
      if (!shine.includes(said.textContent?.trim() ?? "")) continue;
      said.setAttribute("data-wrap-shine", "");
      said.classList.add(...WRAP_SHINE_CLASS, WRAP_SHINE_PULSE);
      marked.push(said);
      // 한 번만 반짝인다(한 바퀴가 끝나면 반짝임만 끔 — 멈춘 강조는 남고, 움직임 줄이기면 반짝임 없이 강조만)
      said.addEventListener(
        "animationiteration",
        () => said.classList.remove(WRAP_SHINE_PULSE),
        { once: true },
      );
    }
    return () => {
      for (const said of marked)
        said.classList.remove(...WRAP_SHINE_CLASS, WRAP_SHINE_PULSE);
    };
  }, [shine]);
  if (entries.length === 0) return null;
  return (
    <div ref={box} data-wrap-log="">
      <TalkLog
        entries={entries}
        englishName={englishName}
        teacherName={teacherName}
        listening={listening}
        onReplay={onReplay}
      />
    </div>
  );
}

/** 새 흐름 화면 차례. moving 은 토막 넘김 · 자료 다시 읽기 · '더 이야기하기'를 기다리는 중이다. */
type LessonPhase =
  | "tori"
  | "child"
  | "choice"
  | "moving"
  | "prep"
  | "break"
  | "closed"
  | "offline"
  | "failed";

// ── iPad 버리는 듣기(spec 설계 2 · 3, plan 접점 표 '층' · '소리 끝') ──

/** 틀이 소리 끝을 알리는 자리: 아이 차례(대화 child · choice) · 정리, 그 밖(선생님 차례 · 짧은 준비 · 막힘 · 쉼 · 마무리)은 알리지 않음. */
export type TalkSoundEndScene = "turn" | "wrap" | "none";
/** 소리 끝을 가르는 한 그림의 값(자리 · 틀의 읽기 줄이 읽는 중인가 — useSpeakQueue speaking). */
export type TalkSoundEndAt = { scene: TalkSoundEndScene; speaking: boolean };

/** 소리 끝 자리(순수). 짧은 준비 쪽지 · 정리의 따라 말하기 조각은 제 읽기 끝에 스스로 알린다(follow-along useSayer). */
export function talkSoundEndSceneOf({
  stage,
  phase,
  away,
}: {
  stage: Stage;
  phase: LessonPhase;
  /** 막힘 판 · 쉬는 안내가 대화를 덮음(떠남을 보낸 뒤). */
  away: boolean;
}): TalkSoundEndScene {
  if (away) return "none";
  if (stage === "wrap") return "wrap";
  if (stage === "talk" && (phase === "child" || phase === "choice"))
    return "turn";
  return "none";
}

/**
 * 틀이 지금 소리 끝을 알릴까(순수, 접점 표 '소리 끝' · spec 설계 2): 아이 차례로 넘긴 뒤 읽기 줄이 빈 때(들어올 때 비어 있었거나 읽던 줄이 끝남)와,
 * 아이 차례 · 정리에서 다시 듣기 · 힌트 · 말풍선 · 대화 기록 줄을 다시 읽고 줄이 빈 때다. 선생님 차례의 문장 사이 · 흘러 오는 문장 틈 · 정리에
 * 들어온 때(따라 말하기 조각이 읽기 전)는 알리지 않는다.
 */
export function talkSoundEndDue(
  prev: TalkSoundEndAt | undefined,
  next: TalkSoundEndAt,
): boolean {
  if (next.speaking || next.scene === "none") return false;
  if (next.scene === "turn")
    return prev?.scene !== "turn" || prev.speaking === true;
  return prev?.scene === "wrap" && prev.speaking;
}

/** 짧은 말 한 줄(시드 talk-short-lines — en · 1~4단계 뜻 ko). */
export type TalkShortLine = TalkLessonView["talkShortLines"]["again"][number];

/** 아이가 아직 말하지 않은 자리에서 피할 낱말(again · 'one more time' — 짧은 말 판정 M-5). */
const REPEAT_WORDS = /\b(again|more)\b/i;

/**
 * 버림 안 짧은 말 고르기(순수, 돌려 쓰기): 자리 목록에서 count 번째(목록 길이로 돌림). fresh(이 아이 차례에서 아직 진짜를 연 적이 없음 —
 * 읽는 중 끊김 · 버림부터 누름)면 again · more 가 든 줄을 빼고 고른다(남는 줄이 없으면 모두에서). 목록이 비면 없음.
 */
export function talkShortLineOf(
  lines: readonly TalkShortLine[],
  { fresh, count }: { fresh: boolean; count: number },
): TalkShortLine | undefined {
  const plain = fresh ? lines.filter((l) => !REPEAT_WORDS.test(l.en)) : lines;
  const pool = plain.length > 0 ? plain : lines;
  return pool.length === 0 ? undefined : pool[count % pool.length];
}

/**
 * 층의 대비 줄(순수, 층 fix 1 M-1): 자리마다 그 단계 구간 짧은 말의 첫 줄. 한 자리라도 비면 없음 — 틀은 층을 만들지 않고 지금 그대로 듣는다(대비 줄
 * 없이 걸린 누름이 소리 없는 버림에서 끝없이 기다리지 않게).
 */
export function discardFallbackOf(
  lines: Readonly<Record<DiscardSoundNeed, readonly TalkShortLine[]>>,
): Record<DiscardSoundNeed, TalkShortLine> | undefined {
  const again = lines.again[0];
  const mic = lines.mic[0];
  return again && mic ? { again, mic } : undefined;
}

/**
 * 켤 기기인데 짧은 말 목록이 비어 층을 만들지 않는가(순수, 묶음 3 fix 1 M-3 · plan 정한 것 3 '조용한 기본값 없음'): 그렇다면 자리마다 줄 수를
 * 돌려준다 — 틀이 개발 콘솔에 남긴다(아이 화면 글은 그대로). 켜지 않는 기기 · 버림을 열 수 없는 음성 접점 · 목록이 다 있으면 없음.
 */
export function talkDiscardMissOf({
  mode,
  verdict,
  canOpen,
  lines,
}: {
  mode: DiscardMode;
  verdict: Pick<DeviceVerdict, "name">;
  canOpen: boolean;
  lines: Readonly<Record<DiscardSoundNeed, readonly TalkShortLine[]>>;
}): Record<DiscardSoundNeed, number> | undefined {
  if (!canOpen || !discardOnDevice(mode, verdict)) return undefined;
  if (discardFallbackOf(lines)) return undefined;
  return { again: lines.again.length, mic: lines.mic.length };
}

/** 따라 말하기 자리의 들려줄 말 칸이 받는 일: 장이 들어옴 · 다시 말할 차례 · 장을 떠남(그 장의 말을 함께 넘긴다). */
export type FollowWordEvent = {
  kind: "card" | "again" | "leave";
  word: string;
};

/**
 * 따라 말하기 자리의 들려줄 말 칸(순수, 묶음 3 fix 1 M-1): 장(쪽지 · 정리 줄)이 들어오거나 다시 말할 차례면 그 장의 말로 두고, 장을 떠나면
 * 비운다. 앞 장의 떠남이 새 장이 들어온 뒤에 오면 새 장의 말을 지우지 않는다. 앞 장의 말이 지금 장의 버림 안에서 읽히지 않게 한다.
 */
export function followWordStep(
  word: string | undefined,
  event: FollowWordEvent,
): string | undefined {
  if (event.kind !== "leave") return event.word;
  return word === event.word ? undefined : word;
}

/** 층의 소리 요청에 그 장의 들려줄 말로 답할까(순수, plan 정한 것 6): 따라 말하기 자리의 다시 말할 차례에 말이 있을 때만, 그 밖은 짧은 말. */
export function talkFollowWordOf(
  need: DiscardSoundNeed,
  { followScene, word }: { followScene: boolean; word: string | undefined },
): string | undefined {
  return need === "again" && followScene ? word : undefined;
}

/**
 * 떠남(쉬는 안내 · 막힘 · 마무리 · 홈 — 정리 따라 말하기는 떠남이 아님, 기계 검토 6절 7 · 8): 서버 기다림을 내리고 떠남을 보낸 뒤, 끝나는
 * 화면(close)이면 층을 닫는다. 닫힌 층은 읽기 · 듣기를 음성 접점에 그대로 넘기므로 그 화면의 줄이 버림을 다시 열지 않는다. 새 화면 줄을
 * 넣기 전에 부른다(떠남이 보류한 읽기를 거두므로).
 */
export function leaveDiscard(
  layer: Pick<DiscardLayer, "serverWait" | "leave" | "dispose"> | null,
  { close }: { close: boolean },
): void {
  if (!layer) return;
  layer.serverWait(false);
  layer.leave();
  if (close) layer.dispose();
}

/** 아이 차례 칸 위 짧은 말(선생님 줄 꼴 · 1~4단계 뜻 — 대화 기록 · talk_turns 에 넣지 않음, spec 설계 3 '다시 말할 차례의 소리' 행). */
function ShortLineBubble({
  line,
  koMeaning,
  englishName,
}: {
  line: TalkShortLine;
  koMeaning: boolean;
  englishName: string;
}) {
  return (
    <div data-talk-short-line="" className="mb-3 flex flex-col gap-1">
      <p
        lang="en"
        className={cn(
          BUBBLE_CLASS,
          BUBBLE_WIDTH,
          CHILD_SIZE.english,
          "font-en font-bold leading-snug",
        )}
      >
        {fillName(line.en, englishName)}
      </p>
      {koMeaning ? (
        <p data-talk-short-ko="" className={cn(CHILD_SIZE.guide, "px-2")}>
          {fillName(line.ko, englishName)}
        </p>
      ) : null}
    </div>
  );
}

/** 새 꼴 카드 회화 틀. 선생님이 바뀌면 틀을 새로 그려 음성 접점을 그 선생님 목소리로 감싼다(옛 틀과 같음). */
export function TalkLessonFrame({ view }: { view: TalkLessonView }) {
  return <TalkLessonFrameBody key={view.teacher?.key ?? ""} view={view} />;
}

/** 이어 열 때의 대화 기록(지금 말풍선인 마지막 선생님 행은 빼고 — 그 행은 말풍선이 그린다). */
function openingLogOf(view: TalkLessonView): readonly TalkLogEntry[] {
  const now = view.current?.turnNo;
  return talkLogOf(
    view.log.filter((r) => r.speaker !== "teacher" || r.turnNo !== now),
    { koMeaning: view.spec.koMeaning },
  );
}

function TalkLessonFrameBody({ view }: { view: TalkLessonView }) {
  const router = useRouter();
  const teacherName = view.teacher?.nameKo;
  const lowLevel = view.spec.band === TALK_LOW_BAND;
  const koMeaning = view.spec.koMeaning;
  const [speech, setSpeech] = useState<SpeechPort | undefined>();
  const [blocked, setBlocked] = useState<Blocked | undefined>();
  const [noticeSeen, setNoticeSeen] = useState(true);
  const [micChecked, setMicChecked] = useState(false);
  const [resting, setResting] = useState(view.resting);
  const restResend = useRef<TalkTurnBody | TalkLeadOpenBody | null>(null);
  const restRetry = useAiRestRetry({
    recheck: recheckAiRest,
    onReleased: () => {
      const body = takeRestResend({ resend: restResend, listenEndedAt });
      setResting(false);
      if (body) void submit(body, "again");
    },
  });
  const [segment, setSegment] = useState(view.segment);
  const [position, setPosition] = useState<LessonPosition>(view.position);
  const [after, setAfter] = useState<LessonAfter>(() =>
    lessonAfterOf(view.step),
  );
  const [hints, setHints] = useState<HintView[]>(view.current?.hints ?? []);
  /** 받침의 한국어 설명(끝 줄 explanation · 이어 열면 current.explanation — 읽지 않음, 3.3 막힘 문단). */
  const [explanation, setExplanation] = useState<string | undefined>(
    view.current?.explanation,
  );
  /** 다음 아이 차례에 '잘 모르겠어요'를 한 번 반짝일까(들리지 않음 뒤 — 3.3 기기 쪽). */
  const [flash, setFlash] = useState(view.position.flashDontKnow);
  /** 1~3단계 그림 턴의 그림 키(C32 — current · 끝 줄 imageKey). */
  const [imageKey, setImageKey] = useState<string | undefined>(
    view.current?.imageKey,
  );
  /** 이 말풍선에서 들려준 소리 줄 차례(들은 도움 — playedSoundsOf, 07절 34줄). */
  const [played, setPlayed] = useState<ReadonlySet<number>>(() => new Set());
  /** '소리가 안 나와서 글로 봐요' 세션 셈(말풍선은 턴마다 새로 그려지므로 틀이 가진다 — 묶음 10 fix 1 우려 1). */
  const [soundless, setSoundless] = useState<{
    at: number | null;
    count: number;
  }>({ at: null, count: 0 });
  /** 보일 짧은 준비 쪽지(읽기가 끝나면 prep 으로 옮겨 그린다). */
  const [prepPending, setPrepPending] = useState<TalkLessonPrep | null>(
    view.step.kind === "prep" ? view.prep : null,
  );
  const [prep, setPrep] = useState<TalkLessonPrep | null>(null);
  const [bubble, setBubble] = useState<LessonBubbleContent>(() =>
    lessonBubbleOf(view.current),
  );
  const [log, setLog] = useState<readonly TalkLogEntry[]>(() =>
    openingLogOf(view),
  );
  /** 지금 말풍선의 선생님 행 번호(아이 행 번호와 같다 — 묶음 9 보고). 다음 선생님 행은 + 1. */
  const teacherTurnNo = useRef(view.current?.turnNo ?? 0);
  /** 지금 말풍선에 쌓은 줄 수(받은 소리 줄의 차례 — lessonSpeakItemsOf index). */
  const bubbleLines = useRef(lessonBubbleOf(view.current).lines.length);
  const [turnKey, setTurnKey] = useState(0);
  const [phase, setPhase] = useState<LessonPhase>("tori");
  const [typedDone, setTypedDone] = useState(false);
  const [typedLines, setTypedLines] = useState(0);
  const [waitingSince, setWaitingSince] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [speakingNow, setSpeakingNow] = useState(false);
  const [praiseClock, setPraiseClock] = useState<{
    until: number;
    now: number;
  } | null>(null);
  const [praiseAfterReading, setPraiseAfterReading] = useState(false);
  const reducedMotion = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [closeLine, setCloseLine] = useState<{
    en: string;
    ko?: string;
  } | null>(null);
  const [nudge, setNudge] = useState(!view.noticesSeen.talk_hint_nudge);
  const nudgeMarked = useRef(false);
  const ipadSafari = useIpadSafari();
  const introFirst = !view.noticesSeen.talk_intro;
  const [started, setStarted] = useState(false);
  const [stage, setStage] = useState<Stage>("talk");
  const [wrap, setWrap] = useState<WrapView | null>(null);
  const [bye, setBye] = useState<{ en: string; ko?: string } | undefined>();
  const [closingMode, setClosingMode] = useState<"full" | "first">("full");
  const [answerTipTurn, setAnswerTipTurn] = useState<number | null>(null);
  const answerTipMarked = useRef(false);
  /** 이 말풍선의 소리 줄을 들려줬는가(들려주지 못함 — C184 · 묶음 10 soundRetry). */
  const [soundTrack, setSoundTrack] = useState<SoundTrack>(SOUND_TRACK_START);
  const counters = useRef(speakingCountersStart());
  const pendingSend = useRef<TalkTurnBody | TalkLeadOpenBody | null>(null);
  /** 보내는 중인 아이 말 없는 요청의 입구(묶음 S3 — 같은 입구를 두 번 보내지 않게, lessonMoveActionOf). */
  const leadSending = useRef<LeadOpen | null>(null);
  const retryAction = useRef<(() => void) | null>(null);
  const inflight = useRef<AbortController | null>(null);
  const listenEndedAt = useRef<number | undefined>(undefined);
  const perceived = useRef<number | undefined>(undefined);
  /** 지난 끝 줄까지 마무리 물음을 붙였는가(칭찬은 마무리 물음을 붙인 턴의 읽기가 끝난 때 — 4절 선생님 창). */
  const closingAskedBefore = useRef(view.position.closingAsked);
  const praiseTimer = useRef<number | undefined>(undefined);
  const rate = speakRateOf(view.level, view.settings.speech);
  const counterLimits = talkCounterLimits(view.settings.maxRetries);
  const [hitchLog] = useState(createSpeakHitchLog);
  const queue = useSpeakQueue(speech, {
    rate,
    pauseMs: view.settings.speech.sentencePauseMs,
    englishName: view.englishName,
    onSpoken: (item, outcome) => {
      const hitch = speakHitchOf(item.w, outcome);
      if (hitch) hitchLog.record(hitch);
      if (item.w === "sound") setSoundTrack((t) => soundTrackOf(t, outcome));
      const line = lessonPlayedLineOf(item, outcome);
      if (line !== null) setPlayed((p) => new Set(p).add(line));
      setSoundless((s) => soundlessStepOf(s, item, outcome, performance.now()));
    },
  });

  useEffect(() => {
    if (!micUsable()) setBlocked("needsMic");
    setNoticeSeen(micNoticeSeen());
    setMicChecked(true);
  }, []);
  useEffect(() => () => inflight.current?.abort(), []);

  const speechSettings = useRef(view.settings.speech);
  const teacherVoice = useRef(view.teacher?.voice);
  const [listenLog] = useState(createListenLog);
  // 버리는 듣기 층(켠 기기에서만 — 없으면 null 이고 아래 discard 몫이 모두 넘어가지 않는다, AC-11)
  const [discardLayer, setDiscardLayer] = useState<DiscardLayer | null>(null);
  const discardRef = useRef<DiscardLayer | null>(null);
  discardRef.current = discardLayer;
  const [discardView, setDiscardView] = useState<DiscardView | undefined>();
  /** 층이 버림 안에서 읽는 짧은 말 · 들려줄 말의 선생님 '말하기'(층이 teacherSpeech 아래라 따로 켠다, 층 fix 1 I-2). */
  const [shortSpeaking, setShortSpeaking] = useState(false);
  /** 아이 차례 칸 위에 보일 짧은 말(그 말을 고른 말풍선 차례 turn 에서만). */
  const [shortLine, setShortLine] = useState<{
    turn: number;
    line: TalkShortLine;
  } | null>(null);
  const discardSettings = useRef(view.settings.discard);
  const shortLines = useRef(view.talkShortLines);
  const englishNameRef = useRef(view.englishName);
  const rateRef = useRef(rate);
  /** 자리마다 다음에 고를 짧은 말 차례(돌려 쓰기). */
  const shortCount = useRef<Record<DiscardSoundNeed, number>>({
    again: 0,
    mic: 0,
  });
  /** 진짜를 연 마지막 말풍선 차례(그 차례에서 아직 진짜가 없으면 again · more 없는 줄 — 짧은 말 판정 M-5). */
  const turnTried = useRef<number | null>(null);
  /** 지금 말풍선 차례 · 따라 말하기 자리인가 · 그 들려줄 말(소리 공급이 읽는다). */
  const turnNow = useRef(0);
  const followScene = useRef(false);
  const followWord = useRef<string | undefined>(undefined);
  /** 소리 공급(층이 need-sound 마다 부른다 — 그때의 차례 · 자리를 위 값들로 읽는다). */
  const soundSource = useRef<
    (need: DiscardSoundNeed) => DiscardSoundLine | undefined
  >(() => undefined);
  useEffect(() => {
    const created = createBrowserSpeech({
      settings: speechSettings.current,
      onTrace: listenLog.record,
    });
    const voice = teacherVoice.current;
    const options: SpeakOptions = {
      rate: rateRef.current,
      ...(voice ? { pitch: voice.pitch, voicePrefer: voice.prefer } : {}),
    };
    const fallback = discardFallbackOf(shortLines.current);
    const miss = talkDiscardMissOf({
      mode: discardSettings.current.mode,
      verdict: created.device(),
      canOpen: created.openDiscard !== undefined,
      lines: shortLines.current,
    });
    if (miss)
      console.warn(
        `버리는 듣기: 짧은 말 목록이 비어 이 수업은 층 없이 듣습니다(again ${miss.again} · mic ${miss.mic})`,
      );
    const lineOf = (line: TalkShortLine): DiscardSoundLine => ({
      text: fillName(line.en, englishNameRef.current),
      sound: "short",
      options,
      onStart: () => setShortSpeaking(true),
      onEnd: () => setShortSpeaking(false),
    });
    const layer = fallback
      ? discardLayerFor(created, {
          discard: discardSettings.current,
          speech: speechSettings.current,
          verdict: created.device(),
          fallbackLines: {
            again: lineOf(fallback.again),
            mic: lineOf(fallback.mic),
          },
          onTrace: listenLog.record,
        })
      : null;
    soundSource.current = (need) => {
      // 따라 말하기 자리의 다시 말할 차례는 짧은 말 대신 그 낱말 · 줄의 들려줄 말(plan 정한 것 6)
      const word = talkFollowWordOf(need, {
        followScene: followScene.current,
        word: followWord.current,
      });
      if (word !== undefined)
        return { ...lineOf({ en: word, ko: "" }), sound: "word" };
      const line = talkShortLineOf(shortLines.current[need], {
        fresh: need === "again" && turnTried.current !== turnNow.current,
        count: shortCount.current[need],
      });
      if (line === undefined) return undefined;
      shortCount.current[need] += 1;
      // 말풍선은 대화 차례에만(쪽지 · 정리의 회복 한마디는 쪽지 · 말풍선이 이미 그 자리를 보인다)
      if (!followScene.current) setShortLine({ turn: turnNow.current, line });
      return lineOf(line);
    };
    layer?.setSoundSource((need) => soundSource.current(need));
    const port = layer?.port ?? created;
    setDiscardLayer(layer);
    setSpeech(
      voice
        ? teacherSpeech(port, {
            pitch: voice.pitch,
            voicePrefer: voice.prefer,
            onSpeaking: setSpeakingNow,
          })
        : port,
    );
    return () => {
      layer?.dispose();
      created.dispose();
    };
  }, [listenLog]);
  useEffect(() => discardLayer?.subscribe(setDiscardView), [discardLayer]);
  turnNow.current = turnKey;
  followScene.current = stage === "wrap" || phase === "prep";
  // 소리 끝(접점 표 '소리 끝'): 아이 차례로 넘긴 뒤 · 아이 차례와 정리에서 다시 읽은 뒤 읽기 줄이 빈 때 알린다(talkSoundEndDue)
  const soundEndScene = talkSoundEndSceneOf({
    stage,
    phase,
    away: blocked !== undefined || resting,
  });
  const soundEndAt = useRef<TalkSoundEndAt | undefined>(undefined);
  useEffect(() => {
    const next = { scene: soundEndScene, speaking: queue.speaking };
    const due = talkSoundEndDue(soundEndAt.current, next);
    soundEndAt.current = next;
    if (due) discardLayer?.soundEnd();
  }, [soundEndScene, queue.speaking, discardLayer]);
  // 막힘 판 · 쉬는 안내는 떠남이다(돌아오면 다음 읽기가 버림을 다시 연다 — 층은 닫지 않음)
  useEffect(() => {
    if (blocked !== undefined || resting)
      leaveDiscard(discardRef.current, { close: false });
  }, [blocked, resting]);

  const praiseSeconds = view.teacherSettings.praiseSeconds;
  const praise = useCallback(() => {
    const at = performance.now();
    const until = praiseUntilOf(at, praiseSeconds);
    setPraiseClock({ until, now: at });
    window.clearTimeout(praiseTimer.current);
    praiseTimer.current = window.setTimeout(
      () => setPraiseClock({ until, now: until }),
      until - at,
    );
  }, [praiseSeconds]);
  useEffect(() => () => window.clearTimeout(praiseTimer.current), []);

  const ready =
    Boolean(speech) &&
    view.teacher !== null &&
    started &&
    noticeSeen &&
    !blocked &&
    !resting;

  const opened = useRef(false);
  const [opening, setOpening] = useState(true);
  // 열 때(안내를 지난 뒤): 짧은 준비 차례면 쪽지부터(앞 선생님 말을 다시 읽지 않음), 선생님 말이 없는 아이 행이 있으면 같은 시도 id 로 다시
  // 보내고(AC-15f), 닫혔으면 마무리, 아니면 마지막 선생님 말을 읽는다(AI 없음)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 안내를 지난 첫 그림에 한 번
  useEffect(() => {
    if (!ready || opened.current) return;
    opened.current = true;
    setOpening(false);
    if (after.kind === "prep") return;
    if (after.kind === "wrap") {
      void openClosedWrap();
      return;
    }
    const retry = view.retryTurn;
    if (after.kind === "retry" && retry) {
      // 들리지 않음 행은 같은 입력(nospeech)으로 — 기록은 회색 '못 들었어요'(03절 94 · 100줄, 재검토 N-3)
      const input: TalkTurnBody["input"] =
        retry.mode === "dont_know"
          ? { mode: "dont_know", ...(retry.nospeech ? { nospeech: true } : {}) }
          : { mode: "speech", text: retry.text ?? "" };
      pushBubbleToLog();
      // 끊긴 아이 말도 기록에 둔다(화면 자료 log 는 살아 있는 행만이라 그 행이 없다 — 검토 M-1)
      setLog((l) =>
        talkLogAppend(l, childLogEntryOf(teacherTurnNo.current, input)),
      );
      void submit({
        sessionId: view.sessionId,
        clientAttemptId: retry.clientAttemptId,
        input,
        hint: { opened: 0, heard: [] },
      });
      return;
    }
    queue.enqueue(lessonSpokenItemsOf(bubble, view.level));
  }, [ready]);

  // 끝 줄까지 받고 글이 다 흐르면 할 일(C166 R1 — 읽어 주기 끝은 기다리지 않는다). 같은 말풍선에 줄을 이어 붙이는 중이면 그 줄까지 흐른 뒤
  // biome-ignore lint/correctness/useExhaustiveDependencies: 말풍선 · 흐름 · 할 일이 바뀔 때만
  useEffect(() => {
    if (
      !lessonTurnReadyOf({
        opening,
        phase,
        bubbleDone: bubble.done,
        typedDone,
        typedLines,
        shownLines: lessonShownEnglishOf(bubble).length,
      })
    )
      return;
    switch (after.kind) {
      case "child":
        setPhase("child");
        return;
      case "choice":
        setPhase("choice");
        return;
      case "advance":
        setPhase("moving");
        void advance(after.to);
        return;
      case "reload":
        setPhase("moving");
        void reload();
        return;
      default:
        return;
    }
  }, [opening, phase, bubble, typedDone, typedLines, after]);

  // 짧은 준비 쪽지는 선생님 말 읽기가 끝난 뒤 그린다(쪽지가 들려줄 말을 읽는다 — 두 읽기가 겹치지 않게)
  useEffect(() => {
    if (opening || !prepPending || queue.speaking) return;
    setPrep(prepPending);
    setPrepPending(null);
    setPhase("prep");
  }, [opening, prepPending, queue.speaking]);

  // 마무리 물음을 붙인 턴의 읽어 주기가 끝나면 칭찬(4절 선생님 창 — 대화 턴의 맞고 틀림과 무관, R2)
  useEffect(() => {
    if (!praiseAfterReading || !bubble.done || queue.speaking) return;
    setPraiseAfterReading(false);
    praise();
  }, [praiseAfterReading, bubble.done, queue.speaking, praise]);

  // 끊긴 턴은 다시 연결될 때 같은 시도 id 로
  // biome-ignore lint/correctness/useExhaustiveDependencies: 끊긴 동안만
  useEffect(() => {
    if (phase !== "offline") return;
    const again = () => {
      const body = pendingSend.current;
      if (body) void submit(body, "again");
    };
    window.addEventListener("online", again);
    return () => window.removeEventListener("online", again);
  }, [phase]);

  // 맞장구(정한 것 20 · 4절 선생님 차례 · AC-N10): 보낸 뒤 talk.wait_line_seconds 안에 첫 문장이 없으면 한 줄 — 읽기 줄이 차례대로라 첫
  // 문장은 그 뒤에 읽힌다. 대화 기록에 넣지 않는다
  useWaitLine({
    waitingSince,
    seconds: view.settings.talk.waitLineSeconds,
    line: waitLineOf(view.waitLines, teacherTurnNo.current + 1),
    onDue: (line) => queue.enqueue([{ text: line, w: "wait" }]),
  });

  /** 지금 말풍선을 대화 기록에 올린다(다음 선생님 말풍선이 그 아래 새로 그려질 때). */
  function pushBubbleToLog() {
    const entry = liveTeacherEntryOf({
      turnNo: teacherTurnNo.current,
      content: bubble,
      koMeaning,
    });
    setLog((l) => talkLogAppend(l, entry));
  }

  /** 새 선생님 행 → 새 말풍선(앞 말풍선은 기록으로, 읽기 줄에 넣음). */
  function showTeacherRow(current: TalkLessonCurrent) {
    pushBubbleToLog();
    teacherTurnNo.current = current.turnNo;
    const next = lessonBubbleOf(current);
    setTurnKey((k) => k + 1);
    setTypedDone(false);
    setTypedLines(0);
    setSoundTrack(SOUND_TRACK_START);
    setPlayed(new Set());
    bubbleLines.current = next.lines.length;
    setBubble(next);
    queue.enqueue(lessonSpokenItemsOf(next, view.level));
  }

  /** 토막 넘김 · '더 이야기하기' · 다시 읽은 자료의 토막 · 자리 · 지금 행 칸을 화면에 둔다(applyMove · openLead 가 함께 쓴다). */
  function applyMoveFields(out: LessonMoveFields) {
    setSegment(out.segment);
    setPosition(out.position);
    setFlash(out.position.flashDontKnow);
    setExplanation(out.current?.explanation);
    setHints(out.current?.hints ?? []);
    setImageKey(out.current?.imageKey);
  }

  /** 토막 넘김 · '더 이야기하기' · 다시 읽은 자료를 화면에 둔다(새 선생님 행이면 새 말풍선, 짧은 준비면 읽기가 끝난 뒤 쪽지). */
  function applyMove(out: LessonMoveFields) {
    applyMoveFields(out);
    const next = lessonAfterOf(out.step);
    setAfter(next);
    if (next.kind === "prep") {
      setPrepPending(out.prep);
      setPhase("moving");
      return;
    }
    if (out.current && out.current.turnNo !== teacherTurnNo.current)
      showTeacherRow(out.current);
    setPhase("tori");
  }

  /**
   * 토막 넘김 · '더 이야기하기' 결과(lessonMoveActionOf): 새 엔진 신호가 없으면 지금처럼(applyMove), 있으면 그 입구를 아이 말 없는 턴 요청으로
   * 부른다(openLead), 같은 입구를 보내는 중이면 그대로 둔다.
   */
  function applyMoveOutcome(out: LessonMoveFields & { leadTurn?: LeadOpen }) {
    const action = lessonMoveActionOf(out, leadSending.current);
    if (action.kind === "move") applyMove(out);
    else if (action.kind === "lead") void openLead(out, action.open);
  }

  /**
   * 새 엔진의 아이 말 없는 차례(묶음 S3 — 대화 토막의 첫 차례 · '더 이야기하기' 뒤). 서버가 붙인 행이 없으니 토막 · 자리만 두고, 지금 말풍선을
   * 기록으로 올린 뒤 턴 요청을 보낸다. 흘려 받은 선생님 말은 아이 차례 뒤와 같은 꼴로 보이고 읽는다(submit — 끊김 · stale · 쉼 · 실패의
   * 다시 보내기도 같은 꼴, 서버는 그 차례가 쓰이기 전이면 같은 신호 · 쓰인 뒤면 저장한 행을 다시 흘린다). 할 일은 끝 줄이 정한다.
   */
  async function openLead(out: LessonMoveFields, open: LeadOpen) {
    leadSending.current = open;
    applyMoveFields(out);
    setAfter({ kind: "child" });
    pushBubbleToLog();
    // 아이가 말을 멈춘 때가 없는 차례 — 체감 대기를 재지 않는다(submitPlanOf). 신호로 처음 보내므로 앞 말풍선 읽기는 끊지 않는다
    listenEndedAt.current = undefined;
    try {
      await submit(leadOpenBodyOf(view.sessionId, open), "first");
    } finally {
      if (leadSending.current === open) leadSending.current = null;
    }
  }

  /** 실패 줄 · '다시 해 볼래요'(같은 일을 다시). 다른 기기에서 닫혔으면 수업 목록. */
  function moveFailed(
    out: Extract<LessonMoveOutcome, { ok: false }> | undefined,
    again: () => void,
  ) {
    if (out?.reason === "not_found") {
      router.push(LESSONS_PATH);
      return;
    }
    retryAction.current = () => {
      setPhase("moving");
      again();
    };
    setPhase("failed");
  }

  /** 토막 넘김(advanceTalkLesson — 서버가 차례를 본다, AI 없음). */
  async function advance(to: "prep" | "talk") {
    const out = await advanceTalkLesson({
      sessionId: view.sessionId,
      to,
    }).catch(() => undefined);
    if (!out?.ok) {
      moveFailed(out, () => void advance(to));
      return;
    }
    retryAction.current = null;
    applyMoveOutcome(out);
  }

  /** 화면 자료를 다시 읽어 서버의 할 일을 따른다(대화 중 짧은 준비 · 인사 끝 · 대화 첫 질문 차례 — 턴 길은 그 차례를 받지 않는다). */
  async function reload() {
    const fresh = await loadTalkLessonView({
      sessionId: view.sessionId,
    }).catch(() => undefined);
    if (!fresh) {
      retryAction.current = () => {
        setPhase("moving");
        void reload();
      };
      setPhase("failed");
      return;
    }
    retryAction.current = null;
    applyMove(fresh);
  }

  /** 짧은 준비 쪽지를 다 함 → 대화(대화 첫 질문 · 대화 중 연 준비면 'Now let's talk.' + 다음 필수 질문). 다 하지 않아도 넘어간다. */
  function afterPrep() {
    setPrep(null);
    setPhase("moving");
    void advance("talk");
  }

  /** 닫힌 채로 열렸다(정리 토막) — 마무리 첫 장. */
  async function openClosedWrap() {
    const out = await readTalkLessonWrap({ sessionId: view.sessionId }).catch(
      () => undefined,
    );
    if (!out?.ok) {
      router.push(LESSONS_PATH);
      return;
    }
    leaveDiscard(discardRef.current, { close: true });
    setWrap(out.wrap);
    setClosingMode("first");
    setStage("closing");
  }

  function onSpeech(event: SpeechEvent): SpeechVerdict {
    const step = speakingCounters(counters.current, event, counterLimits);
    counters.current = step.state;
    const code =
      event.type === "error"
        ? event.code
        : event.type === "stalled"
          ? "stalled"
          : "no-result";
    const report = (
      kind: "mic_unavailable" | "mic_stalled" | "speech_silent",
      c: string,
    ) =>
      void reportSessionMic({
        kind,
        code: c || kind,
        browser: readDeviceVerdict().name,
      }).catch(() => {});
    if (step.verdict === "mic-unavailable") {
      markMicUnavailable(code);
      report("mic_unavailable", code);
      setBlocked("needsMic");
    }
    if (step.verdict === "mic-stalled") {
      report("mic_stalled", code);
      setBlocked("stalled");
    }
    if (step.verdict === "speech-silent") {
      report("speech_silent", "no-speech");
      setBlocked("silent");
    }
    return step.verdict;
  }

  function showClosed(farewell: { en: string; ko?: string }) {
    // 마무리(끝인사)는 떠남 — 끝인사 줄을 넣기 전에(기계 검토 6절 8)
    leaveDiscard(discardRef.current, { close: true });
    setCloseLine(farewell);
    pushBubbleToLog();
    setTurnKey((k) => k + 1);
    bubbleLines.current = 1;
    setBubble({
      lines: [{ t: "s", en: farewell.en }],
      ...(farewell.ko ? { ko: farewell.ko } : {}),
      done: true,
    });
    queue.enqueue([farewell.en]);
    setPhase("closed");
  }

  function abortInflight() {
    inflight.current?.abort();
    inflight.current = null;
    // 거둔 턴은 끝 줄이 오지 않는다 — 서버 기다림을 내린다(새 턴이면 submit 이 다시 켠다)
    discardRef.current?.serverWait(false);
  }

  /** 턴 끝 줄(TalkLessonNext)을 화면에 둔다. */
  function applyEnd(n: TalkLessonNext) {
    // 이 차례 선생님 행 번호는 서버가 싣는다(어림하지 않음 — 검토 M-2)
    teacherTurnNo.current = n.turnNo;
    setSegment(n.segment);
    setPosition((p) => ({
      ...p,
      greetingDone: n.greetingDone,
      talkCount: n.talkCount,
      choice: n.choice,
      closingAsked: n.closingAsked,
      moreRound: n.moreRound,
      moreInRound: n.moreInRound,
      flashDontKnow: n.flashDontKnow,
      silentBlocked: n.silentBlocked,
      stuckInSlot: n.stuckInSlot,
    }));
    setHints(n.hints);
    setImageKey(n.imageKey);
    setExplanation(n.explanation);
    setFlash(n.flashDontKnow);
    if (targetReachedNow(closingAskedBefore.current, n.closingAsked))
      setPraiseAfterReading(true);
    closingAskedBefore.current = n.closingAsked;
    setAfter(lessonAfterEndOf(n));
    if (n.silentBlocked) {
      // 들리지 않음으로 닫힌 자리가 speech.silent_items_max 번 이어짐(7절 막힘 화면 · 부모 알림 — C22, 셈은 서버)
      void reportSessionMic({
        kind: "speech_silent",
        code: "no-speech",
        browser: readDeviceVerdict().name,
      }).catch(() => {});
      setBlocked("silent");
    }
  }

  /**
   * 턴 하나를 보내고 새 꼴 줄을 받는다(끊김 · stale 은 talk-stream 되풀이 — 같은 시도 id · 아이 말 없는 요청은 같은 본문). 읽기 줄을 끊는지 ·
   * 체감 대기를 재는지는 submitPlanOf(다시 보내는 길은 send "again").
   */
  async function submit(
    body: TalkTurnBody | TalkLeadOpenBody,
    send: SubmitSend = "first",
  ) {
    const plan = submitPlanOf(body, send);
    abortInflight();
    const controller = new AbortController();
    inflight.current = controller;
    pendingSend.current = body;
    retryAction.current = () => void submit(body, "again");
    if (plan.cancelReading) queue.cancel();
    setPhase("tori");
    // 서버 차례 기다림(끝 줄 · 쉼 줄 · 닫는 줄 · 오류 전 — 그동안 버림의 안전 상한을 세지 않는다, N-1)
    discardRef.current?.serverWait(true);
    const waitDone = () => discardRef.current?.serverWait(false);
    let first = true;
    const firstLine = () => {
      if (!first) return;
      first = false;
      if (plan.measurePerceived)
        perceived.current = perceivedWaitOf(
          listenEndedAt.current,
          performance.now(),
        );
      setWaitingSince(null);
    };
    const result = await sendTalkLessonTurnRetrying(
      body,
      {
        onSentence: (en) => {
          firstLine();
          bubbleLines.current += 1;
          setBubble((b) => lessonBubbleStep(b, { t: "s", en }));
          queue.enqueue([{ text: en, w: "tori" }]);
        },
        onKo: (ko) => setBubble((b) => lessonBubbleStep(b, { t: "ko", ko })),
        onAdd: (line) => {
          firstLine();
          bubbleLines.current += 1;
          setBubble((b) => lessonBubbleStep(b, line));
          queue.enqueue([{ text: line.en, w: "card" }]);
        },
        onSound: (line) => {
          firstLine();
          // 쌓기 전 줄 차례를 싣는다(들려줬는지 되찾기 — playedSoundsOf)
          const index = bubbleLines.current;
          bubbleLines.current += 1;
          setBubble((b) => lessonBubbleStep(b, line));
          queue.enqueue(lessonSpeakItemsOf(line, view.level, index));
        },
        onEnd: (n) => {
          waitDone();
          pendingSend.current = null;
          retryAction.current = null;
          setWaitingSince(null);
          counters.current = speakingCounters(
            counters.current,
            { type: "next-activity" },
            counterLimits,
          ).state;
          applyEnd(n);
          setBubble((b) => ({ ...b, done: true }));
        },
        onResting: () => {
          waitDone();
          pendingSend.current = null;
          retryAction.current = null;
          restResend.current = body;
          setResting(true);
        },
        onBreak: (line) => {
          // 쉬는 안내는 떠남 — 그 줄을 넣기 전에 층을 닫는다(기계 검토 6절 8)
          leaveDiscard(discardRef.current, { close: true });
          pendingSend.current = null;
          retryAction.current = null;
          setWaitingSince(null);
          bubbleLines.current = 1;
          setBubble({
            lines: [{ t: "s", en: line.en }],
            ...(line.ko ? { ko: line.ko } : {}),
            done: true,
          });
          queue.enqueue([line.en]);
          setPhase("break");
        },
        onClose: (line) => {
          waitDone();
          pendingSend.current = null;
          retryAction.current = null;
          setWaitingSince(null);
          if (lessonCloseActionOf(line) === "wrap") {
            // 참여 완료 뒤 1-가 하루 안전 상한: 정리 → 마무리(8절). 마무리 자료를 못 읽으면 끝인사와 '수업 목록'
            void readTalkLessonWrap({ sessionId: view.sessionId })
              .catch(() => undefined)
              .then((out) => {
                if (out?.ok) {
                  setWrap(out.wrap);
                  setStage("wrap");
                  return;
                }
                showClosed(line.farewell);
              });
            return;
          }
          showClosed(line.farewell);
        },
        onError: () => {
          waitDone();
          setWaitingSince(null);
          setPhase("failed");
        },
      },
      {
        signal: controller.signal,
        refresh: () => router.refresh(),
        onAttempt: () => {
          first = true;
          setTurnKey((k) => k + 1);
          setTypedDone(false);
          setTypedLines(0);
          setSoundTrack(SOUND_TRACK_START);
          setPlayed(new Set());
          // 새 턴이 흐르는 동안 앞 턴의 그림 · 받침 설명을 붙이지 않는다(끝 줄이 이 턴 값을 다시 싣는다 — 재검토 N-2)
          setImageKey(undefined);
          setExplanation(undefined);
          bubbleLines.current = 0;
          setBubble(LESSON_BUBBLE_START);
          setWaitingSince(performance.now());
        },
      },
    );
    if (inflight.current === controller) inflight.current = null;
    if (result === "offline") {
      waitDone();
      setWaitingSince(null);
      setPhase("offline");
    }
  }

  /** 앞 기록 뒤 끝난 듣기 · 선생님 쪽 발화 감시의 요약(C149 · 정한 것 10 — 글 · 소리 없음). */
  function takeClientListen(): ClientListen {
    return withSpeakHitches(
      {
        br: readDeviceVerdict().name,
        r3d: layerRef.current?.render === "3d",
        listens: listenLog.take(),
        mf: counters.current.micFailures,
      },
      hitchLog.take(),
    );
  }

  function onChildSend(send: ChildSend) {
    setFlash(false);
    // 지금 말풍선과 보낸 아이 말을 기록에 올린다(인식 글 · '잘 모르겠어요' · '못 들었어요' — 4절 대화 기록, 바로 보낸 턴도)
    pushBubbleToLog();
    setLog((l) =>
      talkLogAppend(l, childLogEntryOf(teacherTurnNo.current, send.input)),
    );
    const body: TalkTurnBody = {
      sessionId: view.sessionId,
      clientAttemptId: crypto.randomUUID(),
      input: send.input,
      hint: send.hint,
      ...(send.listenEndSeconds === undefined
        ? {}
        : { listenEndSeconds: send.listenEndSeconds }),
      ...(send.confirmSkipped === undefined
        ? {}
        : { confirmSkipped: send.confirmSkipped }),
      ...(perceived.current === undefined
        ? {}
        : { prevPerceivedWaitMs: perceived.current }),
      clientListen: takeClientListen(),
    };
    perceived.current = undefined;
    listenEndedAt.current = send.listenEndedAt;
    void submit(body);
  }

  /** '홈': 참여 완료 전이면 그대로(진행), 뒤면 닫히고 마무리 첫 장 뒤 홈. 막힘 · 쉼의 '홈'은 바로 홈. 정리 · 마무리 중이면 바로 홈. */
  async function home({ firstCard = true }: { firstCard?: boolean } = {}) {
    setBusy(true);
    // 홈은 떠남(마무리 첫 장 · 홈으로 — 층을 닫는다)
    leaveDiscard(discardRef.current, { close: true });
    abortInflight();
    queue.cancel();
    if (stage !== "talk") {
      router.push("/");
      return;
    }
    const out = await leaveTalkLesson({ sessionId: view.sessionId }).catch(
      () => undefined,
    );
    if (firstCard && out?.ok && out.closed && out.wrap) {
      setBusy(false);
      setWrap(out.wrap);
      setClosingMode("first");
      setStage("closing");
      return;
    }
    router.push("/");
  }

  /**
   * '그만하기'(정한 것 12 · 3.3 끝난 길 표): 서버가 참여가 거의 없다고 하면(needs_confirm) 확인 쪽지(C34) — 쪽지를 묻는 동안 대화는 그대로다.
   * 아니면 정리 → 마무리(끝맺음은 응답 뒤 — C33 · AC-8c).
   */
  async function stop(confirmed: boolean) {
    setBusy(true);
    const out = await stopTalkLesson({
      sessionId: view.sessionId,
      confirmed,
    }).catch(() => undefined);
    setBusy(false);
    if (out && !out.ok && out.reason === "needs_confirm") {
      setConfirmStop(true);
      return;
    }
    if (out && !out.ok && out.reason === "not_found") {
      router.push(LESSONS_PATH);
      return;
    }
    if (!out?.ok) {
      retryAction.current = () => {
        setPhase("moving");
        void stop(confirmed);
      };
      setPhase("failed");
      return;
    }
    abortInflight();
    queue.cancel();
    retryAction.current = null;
    // 지금 말풍선(마지막 선생님 말)도 정리의 대화 기록 칸에 남긴다(묶음 11 재검토 N-4 (라))
    pushBubbleToLog();
    setWrap(out.wrap);
    setStage("wrap");
  }

  /** '더 이야기하기'(정한 것 11 — 앱이 더 이야기할 거리 하나를 붙임, AI 호출 · 턴 셈 없음). */
  async function more() {
    setBusy(true);
    setPhase("moving");
    const out = await chooseLessonMoreTalk({
      sessionId: view.sessionId,
    }).catch(() => undefined);
    setBusy(false);
    if (!out?.ok) {
      moveFailed(out, () => void more());
      return;
    }
    retryAction.current = null;
    applyMoveOutcome(out);
  }

  // 버리는 듣기 층의 화면 몫(층이 없으면 넘기지 않는다 — 아이 차례 · 따라 말하기가 지금 그대로)
  const turnDiscard: TurnDiscard | undefined =
    discardLayer && discardView
      ? {
          view: discardView,
          again: discardLayer.again,
          dontKnow: discardLayer.dontKnow,
          listenAuto: discardLayer.listenAuto,
          soundEnd: discardLayer.soundEnd,
        }
      : undefined;
  const followDiscard: FollowDiscard | undefined =
    discardLayer && discardView
      ? {
          view: discardView,
          listenAuto: discardLayer.listenAuto,
          soundEnd: discardLayer.soundEnd,
          again: (word) => {
            followWord.current = followWordStep(followWord.current, {
              kind: "again",
              word,
            });
            discardLayer.again();
          },
          card: (word) => {
            followWord.current = followWordStep(followWord.current, {
              kind: "card",
              word,
            });
            return () => {
              followWord.current = followWordStep(followWord.current, {
                kind: "leave",
                word,
              });
            };
          },
        }
      : undefined;
  const followEnv: FollowEnv = {
    sessionId: view.sessionId,
    speech,
    level: view.level,
    lowLevel,
    englishName: view.englishName,
    teacherName,
    rate,
    homophones: view.homophones,
    settings: {
      speech: view.settings.speech,
      talkSpeech: view.settings.talkSpeech,
      matchPhraseLevels: view.settings.ui.matchPhraseLevels,
      autoNextSeconds: view.settings.ui.autoNextSeconds,
      hintReadMatch: view.settings.talk.hintReadMatch,
      waitHintSeconds: view.settings.ui.waitHintSeconds,
    },
    onSpeech,
    onNextItem: () => {
      counters.current = speakingCounters(
        counters.current,
        { type: "next-activity" },
        counterLimits,
      ).state;
    },
    onListening: setListening,
    onPraise: praise,
    clientListen: takeClientListen,
    saveFollow: lessonFollowSaver({
      sessionId: view.sessionId,
      clientListen: takeClientListen,
    }),
    discard: followDiscard,
  };

  const teacherState = teacherStateOf({
    listening,
    thinking: waitingSince !== null,
    speaking: speakingNow || shortSpeaking,
    praiseUntil: praiseClock?.until ?? null,
    now: praiseClock?.now ?? 0,
  });
  const windowShown = teacherWindowShown({
    hasTeacher: view.teacher !== null,
    blocked: blocked !== undefined,
    resting,
    stage,
  });
  const layer = useTeacherLayer();
  const layerRef = useRef(layer);
  layerRef.current = layer;
  useEffect(() => {
    if (micChecked && windowShown) layer?.want();
  }, [layer, micChecked, windowShown]);
  useEffect(() => {
    layer?.setPose(teacherState, reducedMotion);
  }, [layer, teacherState, reducedMotion]);
  useEffect(() => {
    if (stage === "closing") layer?.close();
  }, [layer, stage]);

  const inPrep = phase === "prep" && prep !== null;
  // 1~3단계 그림 턴(C32 — 그림 파일이 있을 때만, 말풍선 옆에 크게)
  const picture =
    lowLevel && imageKey !== undefined ? view.pictures[imageKey] : undefined;
  const inDialogue = segment === "talk" || segment === "more_talk";
  const soundRetry = soundRetryStepOf(soundTrack, { canSkip: true });

  let body: ReactNode;
  let panelShown = false;
  if (blocked) {
    body = (
      <TalkPaper data-blocked={blocked}>
        {/* 막힘 판(7절 '막힘 화면' · [승인 UX3]): 큰 '다시 해 볼래요' · 작은 '홈' */}
        <MicBlockedPanel
          kind={blocked}
          ipadSafari={ipadSafari}
          busy={busy}
          retry={{
            speech,
            disabled: busy,
            onRecovered: () => {
              counters.current = speakingCountersStart();
              setBlocked(undefined);
            },
          }}
          home={{ onClick: () => void home({ firstCard: false }) }}
        />
      </TalkPaper>
    );
  } else if (resting) {
    body = (
      <TalkPaper data-talk-rest="">
        <AiRest
          busy={busy}
          teacherName={teacherName}
          onHome={() => void home({ firstCard: false })}
          retry={restRetry}
        />
      </TalkPaper>
    );
  } else if (!view.teacher) {
    body = (
      <TeacherChoice
        choices={view.teacherChoices}
        speech={speech}
        rate={rate}
        onChosen={() => router.refresh()}
      />
    );
  } else if (!started) {
    body = (
      <TalkStart
        first={introFirst}
        teacherName={teacherName}
        disabled={!speech}
        onStart={() => {
          speech?.unlockFromGesture();
          setStarted(true);
          if (introFirst)
            void markTalkNotice({ kind: "talk_intro" }).catch(() => {});
        }}
      />
    );
  } else if (!noticeSeen) {
    body = (
      <MicNotice
        onOk={() => {
          speech?.unlockFromGesture();
          markMicNoticeSeen();
          setNoticeSeen(true);
        }}
      />
    );
  } else if (stage === "closing" && wrap) {
    body = (
      <ClosingCards
        wrap={wrap}
        farewell={closingFarewellOf(bye, view.englishName)}
        teacherName={teacherName}
        lowLevel={lowLevel}
        mode={closingMode}
        waitHintSeconds={view.settings.ui.waitHintSeconds}
        onListen={(word) => {
          speech?.unlockFromGesture();
          queue.replay([word]);
        }}
        onHome={() => router.push("/")}
        onLessons={() => router.push(LESSONS_PATH)}
      />
    );
  } else {
    let main: ReactNode;
    if (stage === "wrap" && wrap)
      main = (
        <>
          {/* 정리에도 대화 기록 칸 — 오늘 쓸 말이 든 아이 말 줄이 한 번 반짝인다(03절 92줄, 꼴은 UI · UX 묶음 6) */}
          <WrapLog
            entries={log}
            words={wrap.metWords.map((w) => w.word)}
            lemmaEntries={view.lemmaEntries}
            englishName={view.englishName}
            teacherName={teacherName}
            listening={listening}
            onReplay={(texts) => {
              speech?.unlockFromGesture();
              queue.replay(texts);
            }}
          />
          <LessonWrapUp
            lines={wrap.lines}
            farewell={wrap.farewell}
            env={followEnv}
            closingFarewell={async () => {
              const { closing, bye } = await wrapFarewellOf(
                () => talkClosingStatus({ sessionId: view.sessionId }),
                wrap.farewell,
              );
              setBye(bye);
              return closing;
            }}
            onDone={() => {
              // 마무리는 떠남 — 층을 닫는다(정리 따라 말하기는 떠남이 아님)
              leaveDiscard(discardRef.current, { close: true });
              setClosingMode("full");
              setStage("closing");
            }}
          />
        </>
      );
    else if (inPrep && prep)
      main = (
        <PrepNote
          key={prep.place}
          prep={prep}
          band={view.spec.band}
          pictures={view.pictures}
          env={followEnv}
          onDone={afterPrep}
          // 끝낸 낱말을 쪽지 상태에 더한다 — 막힘 판이 쪽지를 내렸다 풀려 다시 그리면 막힌 그 낱말부터(7절 32줄 · e2e 분류 N1)
          onWordDone={(index) =>
            setPrep((p) => (p ? prepWithDone(p, index) : p))
          }
        />
      );
    panelShown = true;
    // 들려준 소리 줄만 들은 도움이다(07절 34줄 — 바로 보내기 견줌 · 힌트 종류 '영어' 기록)
    const heard = childHeardOf(playedSoundsOf(bubble, played));
    body = (
      <section
        data-talk-panel=""
        data-talk-phase={phase}
        data-talk-lesson=""
        data-talk-reading={queue.speaking ? "" : undefined}
        className="relative flex min-w-0 flex-1 flex-col gap-5 bg-paper px-6 py-6 shadow-postit landscape:gap-3 landscape:py-4"
      >
        <span
          aria-hidden
          className="absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 bg-postit-talk/90"
        />
        {main ? (
          <>
            {main}
            {phase === "offline" || phase === "failed" ? (
              <TroubleLine phase={phase} retry={retryAction.current} />
            ) : null}
          </>
        ) : (
          <>
            {/* 대화 기록 칸(묶음 10 — 지난 턴이 위로, 지금 말풍선이 맨 아래). 짧은 준비 · 정리에는 없다(4절 대화 기록 행) */}
            <TalkLog
              entries={log}
              englishName={view.englishName}
              teacherName={teacherName}
              listening={listening}
              bottomKey={turnKey}
              onReplay={(texts) => {
                speech?.unlockFromGesture();
                queue.replay(texts);
              }}
            >
              <LessonToriBubble
                key={turnKey}
                content={bubble}
                level={view.level}
                englishName={view.englishName}
                teacherName={teacherName}
                waiting={waitingSince}
                waitSeconds={view.settings.ui.waitHintSeconds}
                {...(explanation ? { explanation } : {})}
                {...(picture ? { picture } : {})}
                listening={listening}
                soundRetry={soundRetry}
                soundless={{
                  ...soundless,
                  noticeMs: view.settings.speech.skipNoticeMs,
                }}
                answerTip={answerTipShownOf({
                  seen: view.noticesSeen.talk_answer_tip,
                  tipTurn: answerTipTurn,
                  turn: turnKey,
                })}
                onAnswerTipShown={() => {
                  if (answerTipMarked.current) return;
                  answerTipMarked.current = true;
                  setAnswerTipTurn(turnKey);
                  void markTalkNotice({ kind: "talk_answer_tip" }).catch(
                    () => {},
                  );
                }}
                onAllTyped={(done) => {
                  setTypedDone(done);
                  setTypedLines(lessonShownEnglishOf(bubble).length);
                }}
                onReplay={() => {
                  speech?.unlockFromGesture();
                  queue.replay(lessonSpokenItemsOf(bubble, view.level));
                }}
                onSound={(items) => {
                  speech?.unlockFromGesture();
                  queue.replay(items);
                }}
              />
            </TalkLog>
            <div className="mt-auto border-t-2 border-dashed border-ink/30 pt-4">
              {shortLine &&
              shortLine.turn === turnKey &&
              (phase === "child" || phase === "choice") ? (
                <ShortLineBubble
                  line={shortLine.line}
                  koMeaning={koMeaning}
                  englishName={view.englishName}
                />
              ) : null}
              {phase === "child" ||
              (phase === "choice" && lessonChoiceSpeechOf(position.choice)) ? (
                <ChildTurn
                  key={`${turnKey}:${position.talkCount}:${position.childTurns}`}
                  sessionId={view.sessionId}
                  speech={speech}
                  level={view.level}
                  lowLevel={lowLevel}
                  englishName={view.englishName}
                  teacherName={teacherName}
                  hints={hints}
                  dontKnowCount={position.stuckInSlot}
                  heard={heard}
                  settings={{
                    speech: view.settings.speech,
                    talkSpeech: view.settings.talkSpeech,
                    confirmSeconds: view.settings.talk.confirmSeconds,
                    hintReadMatch: view.settings.talk.hintReadMatch,
                    nospeechDontknowCount:
                      view.settings.talk.nospeechDontknowCount,
                  }}
                  rate={rate}
                  homophones={view.homophones}
                  nudge={nudge}
                  onNudgeShown={() => {
                    if (nudgeMarked.current) return;
                    nudgeMarked.current = true;
                    void markTalkNotice({ kind: "talk_hint_nudge" }).catch(
                      () => {},
                    );
                  }}
                  onSpeech={onSpeech}
                  onHintListen={() => queue.cancel()}
                  onListenStart={() => {
                    queue.cancel();
                    setNudge(false);
                  }}
                  onListening={(on) => {
                    // 진짜를 연 차례(버리는 듣기 짧은 말 고르기 — talkShortLineOf fresh)
                    if (on) turnTried.current = turnKey;
                    setListening(on);
                  }}
                  reveal={async (tier) => {
                    setNudge(false);
                    const out = await revealTalkLessonHint({
                      sessionId: view.sessionId,
                      tier,
                    }).catch(() => undefined);
                    return out?.ok ? out.text : undefined;
                  }}
                  onSend={onChildSend}
                  flashDontKnow={flash}
                  discard={turnDiscard}
                  // 위에 보이는 짧은 말 말풍선(아이 차례를 화면 안으로 — 화면 판정 I-2)
                  shortLine={
                    shortLine?.turn === turnKey ? shortLine : undefined
                  }
                />
              ) : null}
              {phase === "choice" ? (
                <LessonChoice
                  busy={busy}
                  onMore={() => void more()}
                  onStop={() => void stop(false)}
                />
              ) : null}
              {phase === "break" ? (
                <div
                  data-talk-break=""
                  className="flex flex-col items-center gap-6"
                >
                  <p className={cn(CHILD_SIZE.guide, "text-center")}>
                    {TALK_TEXT.saved}
                  </p>
                  <BigButton onClick={() => router.push(LESSONS_PATH)}>
                    {TALK_TEXT.lessons}
                  </BigButton>
                </div>
              ) : null}
              {phase === "closed" && closeLine ? (
                <div data-talk-closed="" className="flex justify-center">
                  <BigButton onClick={() => router.push(LESSONS_PATH)}>
                    {TALK_TEXT.lessons}
                  </BigButton>
                </div>
              ) : null}
              {phase === "offline" || phase === "failed" ? (
                <TroubleLine phase={phase} retry={retryAction.current} />
              ) : null}
            </div>
          </>
        )}
      </section>
    );
  }

  const shown =
    windowShown && view.teacher ? (
      <div data-talk-layout="" className="flex flex-col gap-6 lg:flex-row">
        <div
          data-teacher-column=""
          className={cn(
            "flex shrink-0 flex-row items-stretch gap-6 lg:w-[260px] lg:flex-col lg:justify-start",
            !panelShown && "justify-center",
          )}
        >
          <TeacherWindow
            key="teacher-window"
            teacher={view.teacher}
            state={teacherState}
            reducedMotion={reducedMotion}
            started={started}
          />
          {panelShown ? (
            <aside
              data-talk-topics=""
              className="flex min-w-0 flex-1 flex-col gap-3 bg-postit-talk px-6 py-6 shadow-postit lg:flex-none lg:rotate-[1.5deg]"
            >
              <p className="font-heading text-[24px] leading-tight">
                {TALK_TEXT.topics}
              </p>
              <ul
                className={cn(
                  CHILD_SIZE.guide,
                  "flex list-disc flex-col gap-2 pl-6",
                )}
              >
                {view.card.todayTopicsKo.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </aside>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">{body}</div>
      </div>
    ) : (
      body
    );

  // '그만하기'는 대화 · 더 이야기하기 동안 구석에(4절 마무리 물음 행 — 짧은 준비 쪽지 · 닫힘 · 쉼 차례에는 숨김, 자리는 늘 잡음)
  const showStop =
    !blocked &&
    !resting &&
    started &&
    noticeSeen &&
    stage === "talk" &&
    inDialogue &&
    !inPrep &&
    phase !== "closed" &&
    phase !== "break";
  const band = lessonBandOf({
    stage,
    segment,
    inPrep: inPrep || prepPending !== null,
    position,
    moreRoundTurns: view.settings.talk.moreRoundTurns,
  });
  const bandShown = started && !blocked && !resting;
  const showCount = bandShown && band.countShown;
  const segmentName = bandShown ? band.segment : undefined;
  const showHome = !blocked && !resting && stage !== "closing";
  return (
    <ChildScreen>
      <PaperBand
        heading
        title={view.title}
        detail={
          <span className="flex flex-wrap items-center gap-x-4">
            <span>{TALK_TEXT.levelUnit(view.level, view.unit)}</span>
            {segmentName ? (
              <span
                data-talk-segment=""
                className="rounded-lg bg-postit-talk px-3 font-heading"
              >
                {segmentName}
              </span>
            ) : null}
            <span
              data-talk-count={showCount ? "" : undefined}
              aria-hidden={showCount ? undefined : true}
              className={cn(!showCount && "invisible")}
            >
              {band.counter}
            </span>
          </span>
        }
        right={
          <>
            <SmallButton
              data-talk-stop={showStop ? "" : undefined}
              aria-hidden={showStop ? undefined : true}
              tabIndex={showStop ? undefined : -1}
              className={cn(!showStop && "invisible")}
              disabled={busy || !showStop}
              onClick={() => void stop(false)}
            >
              {TALK_TEXT.stop}
            </SmallButton>
            <SmallButton
              aria-hidden={showHome ? undefined : true}
              tabIndex={showHome ? undefined : -1}
              className={cn(!showHome && "invisible")}
              disabled={busy || !showHome}
              onClick={() => void home()}
            >
              {TALK_TEXT.home}
            </SmallButton>
          </>
        }
      />
      {shown}
      <p
        data-tori-promise=""
        className={cn(
          CHILD_SIZE.guide,
          "mt-auto rounded bg-paper/80 px-4 py-2",
        )}
      >
        <span className="font-heading">{TEACHER_TEXT.promiseLabel}</span>{" "}
        {TEACHER_TEXT.promise(teacherName)}
      </p>
      <ConfirmSheet
        open={confirmStop}
        message={TEACHER_TEXT.stopConfirm(teacherName)}
        confirmLabel={TALK_TEXT.stopYes}
        cancelLabel={TALK_TEXT.stopNo}
        onConfirm={() => {
          setConfirmStop(false);
          void stop(true);
        }}
        onCancel={() => setConfirmStop(false)}
      />
    </ChildScreen>
  );
}

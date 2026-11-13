import "server-only";
// 새 꼴 회화 수업 턴 길(회화 plan 묶음 8 — 정한 것 1 · 5 · 11 · 18 · 19 · 22, 정본 02-2 3.3 회화 블록 · 6.1 · 6.2 · 07 7절 · 8절).
// talkCardKindOf 'new' 세션만 이 길로 온다(turn.ts 가 가른다). 한 턴의 차례: 상태(readTalkLessonState) → 흐름 계획(teacherTurnPlansOf,
// 흐름 입력 prepWords 는 state.prepWords) → 호출 입력(talkCallTurnOf) → 사용자 메시지 → 흘려 받기(문장 문: 1~3단계 물음표 문장은 응답 끝까지
// 잡아 둠 · 같은 질문 막기 · 카드 자리 · 마무리 자리의 물음표 지움) → 응답 첫 칸 stuck 으로 계획을 고름 → 끝난 뒤 카드 자리(까닭 2 · 3,
// 붙일 기회가 없으면 C194 (1)의 대신 질문) · 붙일 줄(카드 질문 · 받침 줄 · 소리 줄 · 마무리 물음, 겹침 없애기 C125) → move → 저장.
// 선생님 행 text 는 화면에 글로 나온 줄만 둔다(정한 것 5). 1~3단계 소리 줄은 move.sound 에만 둔다. 참여 완료는 completeTalk 다.
// 접근 확인은 부르는 Route Handler 의 첫 문장. 아이 글 · AI 글을 로그에 내지 않는다(오류 이름 · Postgres 코드만).
import { and, arrayContains, eq, gte, inArray, sql } from "drizzle-orm";
import {
  isLowBandLevel,
  type TalkHeardHelp,
  type TalkHintKind,
  type TalkInputMode,
  type TalkLessonOutput,
  talkCallTurnOf,
  talkCardChainKeysOf,
  talkEasyAiSlotOf,
  talkLessonRewriteOf,
  talkLessonUserMessage,
  talkTurnWiringOf,
  teacherSentencesMaxOf,
} from "@/core/ai/calls/talk-lesson";
import { talkSafetyOf } from "@/core/ai/cost-alert";
import type { Masker } from "@/core/ai/mask";
import {
  cardItemOf,
  isSupportMove,
  oldestMoreOf,
  opensSlot,
  slotChanceOf,
} from "@/core/conversation/chances";
import { createRewriteHold } from "@/core/conversation/child-kind";
import {
  type ClientListen,
  type ClientListenRow,
  clientListenRowOf,
} from "@/core/conversation/client-listen";
import {
  type CueBand,
  cueBandOf,
  cueLineForTurn,
  cueLinesOfMoves,
  isSoundCue,
  seedCuePhrasesOf,
  TALK_CUE_LINE_KIND,
} from "@/core/conversation/cue-line";
import type { SoundAlikeEntry } from "@/core/conversation/heard-hint";
import {
  type HintTier,
  heardHelpOf,
  heardHelpsOfMove,
  hintKindOf,
  koExplanationShownOf,
  type LessonHintItem,
  type LessonHintSpec,
  lessonHintTiersOf,
  openedTierCount,
} from "@/core/conversation/hints";
import {
  type LeadSoundLine,
  leadRowSoundLinesOf,
  leadTurnAppliesOf,
  leadWrapRecastsOf,
} from "@/core/conversation/lead-turn-core";
import {
  childLinesOf,
  type LateCardRow,
  type LessonArgs,
  lateCardAnswerOf,
  lessonTurnSegmentOf,
  type TalkLessonPosition,
  type TalkQuestionSlot,
  type TeacherAttachLine,
  type TeacherMoveAi,
  type TeacherTurnPlan,
  talkLessonPositionOf,
  teacherMoveOf,
} from "@/core/conversation/lesson-flow";
import {
  isLowBand,
  type TalkLessonCard,
  type TalkLessonChildTurn,
  type TalkLessonSpec,
  type TalkLessonTurn,
} from "@/core/conversation/lesson-turns";
import { maskNameAnswer } from "@/core/conversation/listen";
import { madeUpHit } from "@/core/conversation/made-up";
import {
  NO_CARD_ITEM,
  readTalkMove,
  TALK_SUPPORT_STAGE_EASY,
  type TalkAppHelp,
  type TalkCardItemRef,
  type TalkMove,
  type TalkSlotWhy,
  talkMoveOf,
} from "@/core/conversation/move";
import {
  cardQuestionKeyOf,
  checkLowLevelQuestion,
  type LowLevelLineOptions,
  questionEchoesChild,
  questionKeyOf,
  sameQuestionKeyHit,
  turnQuestionOf,
} from "@/core/conversation/question-check";
import {
  type HeldQuestionFail,
  heldQuestionFailOf,
  keepLastHeldQuestion,
  mergeQuestionRetry,
  questionRetryNoteOf,
  stuckRewriteNoteOf,
} from "@/core/conversation/question-retry";
import {
  metWordsIn,
  saidWordsOf,
  talkEnglishSentenceDelta,
} from "@/core/conversation/said";
import {
  allowedLemmaOfVocab,
  checkSituationSentence,
  echoesTurnSentence,
  failSituationLineOf,
  heardFieldsBlankOf,
  type SituationPlace,
  situationLineOf,
  situationPlaceOf,
  situationRotationOf,
  situationTailOf,
} from "@/core/conversation/situation";
import {
  type AppendLine,
  cardLineTailKoOf,
  cardLineWithoutSaidOf,
  MORE_PROMPT,
  sayingAnswer,
  shownTurnOf,
  toriKoShownOf,
} from "@/core/conversation/spoken";
import { isQuestionSentence, safeLineOf } from "@/core/conversation/stream";
import type { StageTimings } from "@/core/conversation/timing";
import { wrapUpLinesOf } from "@/core/conversation/wrap-up";
import type {
  TalkAllowedWordsFile,
  TalkCueLinesFile,
  TalkListLine,
  TalkSituationLinesFile,
} from "@/core/seed/schema/reference";
import type { TalkSceneOpener } from "@/core/seed/schema/talk";
import {
  AI_WAIT_TIMEOUT_MULTIPLE,
  type AskKind,
  FUNCTION_POS,
  PLACEHOLDER_NAME,
  type TALK_SEGMENTS,
} from "@/core/seed/structure";
import { splitSentences, tokenize } from "@/core/seed/text";
import { vocab } from "@/db/schema/content";
import { sessions, talkTurns } from "@/db/schema/learning";
import { aiCalls } from "@/db/schema/operations";
import { createAlertOnce } from "@/server/ai/store";
import {
  questionRetryTagOf,
  soundPairsOf,
  type TalkLessonOutcome,
  talkLessonTurn,
} from "@/server/ai/talk";
import type { Db, Tx } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import {
  seedHomophones,
  seedSoundAlikes,
  seedTalkAllowedWords,
  seedTalkCueLines,
  seedTalkMadeUpPhrases,
  seedTalkSituationLines,
} from "@/server/seed-lists";
import { levelContextOf } from "@/server/session/ai-context";
import { SettingMissingError } from "@/server/settings";
import {
  completeTalk,
  insertClosingRecord,
  safetyClosesOn,
  scheduleTalkClosing,
} from "./closing";
import {
  emptyLessonRange,
  type LessonRange,
  lessonRangeOf,
  lessonSafeLineOf,
  lineOptionsOf,
  readUnitGoalTexts,
  talkLessonInputOf,
} from "./lesson-input";
import {
  type HintView,
  hintViewsOf,
  isTalkOpen,
  onTalkSessionEnded,
  positiveInt,
  readTalkLessonState,
  snapshotNumber,
  type TalkLessonState,
  type TalkServerDeps,
  type TalkTurnRow,
  toriLinesOf,
  writeSay,
} from "./state";

type TalkSegment = (typeof TALK_SEGMENTS)[number];

// ── 같은 시도 id 진행 중 판정 · 4단계부터 쉼 대사 ──

/**
 * 같은 시도 id 의 회화 턴이 아직 진행 중으로 보는 시간(ms, 기술 값 — Route Handler maxDuration 60초와 같은 값. 그 처리기는 정적
 * 글자만 받아 여기서 가져갈 수 없다).
 */
export const TURN_IN_FLIGHT_MS = 60_000;
/** 마지막 회화 턴 호출이 끝난 뒤 토리 행 저장을 기다리는 짧은 여유(ms, 기술 값 — 호출 기록과 저장 사이 틈, 재검토 N-2). */
export const TURN_SAVE_GRACE_MS = 5000;
/** 4단계부터 회화 턴 두 번 실패의 말(a 정할 것 회9 — 정본 밖 문구 표). 4단계는 뜻을 함께. */
export const TALK_BREAK_LINE = {
  en: "Oops, I need a little break!",
  ko: "나 잠깐 쉬어야 해!",
} as const;
/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;
/** 대화 안전 상한 알림 종류 · 기준 키(3.3 · 8절 · AC-15j, P9c AI_ALERT_KINDS). */
const SAFETY_ALERT_KIND = "talk_safety_cap";
const SAFETY_ALERT_KEY = "talk.safety_alert_count";

/**
 * 같은 시도 id 의 고아 아이 행이 아직 진행 중인가(검토 M-1 · 재검토 N-2 · P-1): TURN_IN_FLIGHT_MS 안이고, 그 아이 행 뒤 회화 턴 호출 기록이
 * 없거나, 마지막 호출이 끝난 지(called_at + latency_ms) TURN_SAVE_GRACE_MS 가 안 됐으면(토리 행 저장이 곧 온다) 참. 마지막 호출이 실패면
 * 한 요청 안 다시 시도(첫 문장 전 연결 · 타임아웃 · 거절 — 기록은 시도가 끝난 뒤 남는다)가 아직 돌 수 있어, 그 요청의 기다림 상한(첫 호출 +
 * AI_WAIT_TIMEOUT_MULTIPLE × ai.timeout_seconds.realtime)에 저장 여유를 더한 때까지도 참이다.
 */
export async function turnInFlight(
  tx: Tx,
  {
    sessionId,
    since,
    at,
    timeoutMs,
  }: { sessionId: string; since: Date; at: Date; timeoutMs: number },
): Promise<boolean> {
  if (since.getTime() <= at.getTime() - TURN_IN_FLIGHT_MS) return false;
  const calls = await tx
    .select({
      calledAt: aiCalls.calledAt,
      latencyMs: aiCalls.latencyMs,
      status: aiCalls.status,
    })
    .from(aiCalls)
    .where(
      and(
        eq(aiCalls.sessionId, sessionId),
        eq(aiCalls.purpose, "talk_turn"),
        gte(aiCalls.calledAt, since),
      ),
    );
  if (calls.length === 0) return true;
  const endOf = (c: (typeof calls)[number]) =>
    c.calledAt.getTime() + (c.latencyMs ?? 0);
  const last = calls.reduce((a, b) => (endOf(b) >= endOf(a) ? b : a));
  const firstAt = Math.min(...calls.map((c) => c.calledAt.getTime()));
  const until =
    last.status === "success"
      ? endOf(last)
      : Math.max(endOf(last), firstAt + AI_WAIT_TIMEOUT_MULTIPLE * timeoutMs);
  return at.getTime() < until + TURN_SAVE_GRACE_MS;
}

// ── 흘려 보낼 줄(C92 NDJSON, 새 꼴) ───────────────────────────────

/** 턴 끝 줄의 화면 몫(묶음 10 · 11 이 읽는다). 1~3단계 힌트 영어 단은 글을 빼고 연 단만 따로 받는다(hintViewsOf). */
export type TalkLessonNext = {
  segment: TalkSegment;
  greetingDone: boolean;
  /** '말 주고받기 n'(분모 없음 — 4절). */
  talkCount: number;
  /** 고르기 차례: 마무리 물음(앱 고정 대사 · 두 버튼) · 마무리 제안(같은 두 버튼, 말로 답해도 됨). */
  choice: "closing" | "suggestion" | null;
  closingAsked: boolean;
  /** '더 이야기하기' 몇 번째 · 이번 회의 말 턴 수('다 했어요! 더 이야기하기 n / talk.more_talk_round_turns'). */
  moreRound: number;
  moreInRound: number;
  /** 지금 질문 자리가 노린 단원 단어. */
  targets: string[];
  hints: HintView[];
  /** 선생님 말풍선 아래 한국어 설명(읽지 않음 — 1~4단계 첫 막힘 · 5단계부터 둘째 막힘, koExplanationShownOf). */
  explanation?: string;
  /** 다음 아이 차례에 '잘 모르겠어요' 단추를 문구 없이 한 번 반짝인다(들리지 않음 뒤). */
  flashDontKnow: boolean;
  /** 들리지 않음으로 닫힌 자리가 speech.silent_items_max 번 이어졌다(7절 막힘 화면). */
  silentBlocked: boolean;
  /** 대화 중 연 짧은 준비 낱말(3.3 짧은 준비 (나) — 화면이 쪽지를 열고, 끝은 묶음 9 의 advanceTalkLesson 이 잇는다). 아니면 null. */
  prep: string[] | null;
  /** 대화 첫 질문 차례(앱이 보이고 읽는다 — 묶음 9 advanceTalkLesson). */
  firstQuestionDue: boolean;
  /** 참여 완료(sessions 상태 '완료'). */
  completed: boolean;
  /** 지금 질문 자리의 이어진 막힘 수(둘째 막힘부터 힌트 마지막 단까지 열기 — 3.3 막힘 문단 · AC-15p, plan 보정 11-05 (13)). */
  stuckInSlot: number;
  /** 1~3단계 그림 턴(C32 · 03절 96줄): 지금 질문 자리 카드 항목의 그림 키(단계 규격 turnImages 일 때만). 없으면 칸 없음. */
  imageKey?: string;
  /** 이 차례 선생님 행 번호(마지막 살아 있는 선생님 행 — 화면이 다음 행 번호를 어림하지 않게). 행이 없으면 0. */
  turnNo: number;
};

/** 카드 항목의 그림 키(1~3단계 그림 턴 C32 — 단계 규격 turnImages 이고 그 항목에 그림 키가 있을 때). 아니면 undefined. */
export function lessonImageKeyOf(
  state: {
    spec: { turnImages: boolean };
    card: {
      required: readonly { no: number; imageKey?: string | undefined }[];
      more: readonly { no: number; imageKey?: string | undefined }[];
    };
  },
  item: TalkCardItemRef | null | undefined,
): string | undefined {
  if (!state.spec.turnImages || !item || item.kind === "none") return undefined;
  const list = item.kind === "required" ? state.card.required : state.card.more;
  return list.find((i) => i.no === item.no)?.imageKey;
}

/**
 * 새 꼴 턴 줄. s(검사를 지난 선생님 문장) · ko(뜻, 영어가 다 흐른 뒤 한 번) · add(앱이 붙인 화면 글 — 카드 질문 · 마무리 물음 · 4단계부터의
 * 답 글) · sound(1~3단계 소리 줄 — 읽어 주기 재료이고 화면에 글로 보이지 않는다, T2: 따라 할 말 · 선택지 둘 · 받침의 답) · 끝 줄 하나.
 */
export type TalkLessonLine =
  | { t: "s"; en: string }
  | { t: "ko"; ko: string }
  | {
      t: "add";
      /** cue: 1~3단계 신호 말(앱이 시드 목록에서 고름 — 뜻 줄 뒤 · 소리 줄 앞, 기록 · talk_turns 원문 · 다시 쓸 차례 밖, spec 설계 6). */
      kind: "question" | "more_prompt" | "answer" | typeof TALK_CUE_LINE_KIND;
      en: string;
      ko?: string;
    }
  | {
      t: "sound";
      kind: "model" | "answer";
      say: string;
      /** 새 엔진만 싣는 표지(core lead-turn-core LeadSoundMark — ask: 고르기 물음, kept: 되묻는 차례에 그대로 둔 앞 차례의 소리 줄). */
      lead?: { ask?: true; kept?: true };
    }
  | { t: "sound"; kind: "choices"; answers: [string, string] }
  | { t: "end"; lesson: TalkLessonNext }
  | { t: "resting" }
  | { t: "break"; en: string; ko?: string }
  | {
      t: "close";
      reason: "resting" | "safety";
      lines?: { en: string; ko?: string }[];
      farewell: { en: string; ko?: string };
    }
  | { t: "stale" }
  | { t: "error" };

// ── 순수: 요청 · 아이 행 ─────────────────────────────────────────

/** 턴 요청(turn.ts TurnRequestSchema 로 검증한 값 — 같은 꼴). */
export type LessonTurnRequest = {
  sessionId: string;
  clientAttemptId: string;
  input: {
    mode: TalkInputMode;
    text?: string | undefined;
    nospeech?: boolean | undefined;
  };
  hint: { opened: number; heard: ("two_answers" | "answer_example")[] };
  listenEndSeconds?: number | undefined;
  confirmSkipped?: boolean | undefined;
  prevPerceivedWaitMs?: number | undefined;
  clientListen?: ClientListen | undefined;
};

/** 흐름 입력(묶음 5 LessonArgs). 흐름 입력 prepWords 는 state.prepWords 다(state.start.prepPlan 이 아님 — 묶음 7 보고). */
export function lessonArgsOf(
  state: Pick<
    TalkLessonState,
    | "spec"
    | "card"
    | "lesson"
    | "turns"
    | "segment"
    | "settings"
    | "start"
    | "prepWords"
  >,
): LessonArgs {
  return {
    spec: state.spec,
    card: state.card,
    newWords: state.lesson.newWords,
    turns: state.turns,
    segment: state.segment,
    settings: state.settings,
    ...(state.start ? { carry: state.start.carry } : {}),
    prepWords: state.prepWords,
  };
}

/** 이번 아이 말의 흐름 꼴(막힘 판단 전 — stuck 거짓). 토막은 lessonTurnSegmentOf(마지막 인사 질문이면 '인사 끝'). */
export function lessonChildLiteOf(
  position: Pick<
    TalkLessonPosition,
    "segment" | "phase" | "lastGreetingQuestion" | "stuckInSlot" | "slot"
  >,
  input: Pick<LessonTurnRequest["input"], "mode" | "nospeech">,
  settings: LessonArgs["settings"],
  stuck = false,
): TalkLessonChildTurn {
  const nospeech = input.mode === "dont_know" && input.nospeech === true;
  const cause =
    input.mode === "speech" ? "speech" : nospeech ? "nospeech" : "button";
  return {
    speaker: "child",
    segment: lessonTurnSegmentOf(position, cause, settings),
    input: input.mode,
    stuck: input.mode === "speech" && stuck,
    nospeech,
    targets: [...(position.slot?.words ?? [])],
  };
}

/** 선생님 행 aiQuestion(5절 ai_question, C101 꼴 + 쓸 수 있는 말). 새 흐름은 AI 차례 질문의 답 예시 · 힌트를 여기 둔다. */
export type LessonAiQuestion = {
  en: string;
  ko: string;
  answerExample: string;
  hintKo?: string;
  hints?: string[];
  usable?: string[];
};

function aiHintsOfRow(row: Pick<TalkTurnRow, "aiQuestion"> | undefined) {
  const raw = row?.aiQuestion as Partial<LessonAiQuestion> | null | undefined;
  if (!raw || typeof raw !== "object") return undefined;
  const strings = (v: unknown) =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
  const hintKo = typeof raw.hintKo === "string" ? raw.hintKo : "";
  const hints = strings(raw.hints);
  const usable = strings(raw.usable);
  if (hintKo === "" && hints.length === 0 && usable.length === 0)
    return undefined;
  return { hintKo, hints, usable };
}

/** 질문 자리를 연 선생님 행 차례(가벼운 꼴 turns 의 자리). 없으면 -1. */
function slotOpenerIndex(
  turns: readonly TalkLessonTurn[],
  slot: TalkQuestionSlot | null,
): number {
  if (!slot) return -1;
  for (let i = turns.length - 1; i >= 0; i--) {
    const row = turns[i];
    if (row?.speaker !== "teacher") continue;
    const m = row.move;
    if (!m || m.kind === "closing_slot" || isSupportMove(m)) continue;
    return i;
  }
  return -1;
}

/**
 * 처음 묻는 턴 · 다시 묻는 턴(6~9단계 힌트 한국어 단 · 기록 ask_kind): 지금 질문 자리의 노린 단어가 그 자리를 연 선생님 행보다 앞의 질문
 * 자리에서 이미 노려졌으면 다시 묻는 턴이다(3.3 '새 단어를 처음 다룬 차례가 첫 번째이고 그 뒤 차례가 다시 쓰기').
 */
export function lessonAskKindOf(
  turns: readonly TalkLessonTurn[],
  slot: TalkQuestionSlot | null,
): AskKind {
  if (!slot || slot.words.length === 0) return "first";
  const opener = slotOpenerIndex(turns, slot);
  const before = new Set<string>();
  turns.slice(0, Math.max(0, opener)).forEach((row) => {
    if (row.speaker === "teacher" && row.move)
      for (const w of row.move.words) before.add(w);
  });
  return slot.words.some((w) => before.has(w)) ? "re_ask" : "first";
}

/** 힌트 단을 고를 때 읽는 카드 칸(카드 항목의 힌트 칸 · 1~3단계 인사 질문 · 장면 여는 질문의 힌트 칸). */
export type LessonHintCard = Pick<TalkLessonState["card"], "greeting"> & {
  required: readonly (LessonHintItem & { no: number })[];
  more: readonly (LessonHintItem & { no: number })[];
  /** 장면 여는 질문의 힌트 칸(영어 틀은 3단계에만 있는 선택 칸 — 0-나 TalkSceneOpenerSchema). */
  sceneOpener?:
    | (Pick<TalkSceneOpener, "hintKo" | "hintEn"> & {
        frameEn?: string | undefined;
      })
    | undefined;
};

/**
 * 1~3단계 장면 여는 질문 자리의 힌트(그 칸의 뜻 · 영어 틀 · 영어 문장 — 필수 질문의 받침 칸을 따름, spec 설계 5 · C206). 영어 단은 단계 규격
 * hintTiers 의 ko 밖 차례대로, 쓸 수 있는 말은 없다. 장면 여는 질문 자리가 아니면 null.
 */
export function sceneHintItemOf(
  spec: Pick<LessonHintSpec, "hintTiers">,
  card: Pick<LessonHintCard, "sceneOpener">,
  slot: TalkQuestionSlot,
): LessonHintItem | null {
  const opener = card.sceneOpener;
  if (slot.scene !== true || !opener) return null;
  return {
    hintKo: opener.hintKo,
    hints: spec.hintTiers
      .filter((t) => t !== "ko")
      .map((t) => (t === "frame" ? (opener.frameEn ?? "") : opener.hintEn)),
    usablePhrases: [],
  };
}

/**
 * 1~3단계 인사 질문 자리의 힌트(카드 인사 질문의 뜻 · 영어 틀 · 영어 문장 칸, 02-2 206줄 · 03 97 · 99줄, 검토 I-2).
 * 영어 단은 단계 규격 hintTiers 의 ko 밖 차례대로(영어 틀 frameEn · 영어 문장 hintEn), 쓸 수 있는 말은 없다. 인사 질문 자리가 아니면 null.
 */
export function greetingHintItemOf(
  spec: Pick<LessonHintSpec, "hintTiers">,
  card: Pick<LessonHintCard, "greeting">,
  slot: TalkQuestionSlot,
): LessonHintItem | null {
  if (slot.item.kind !== "none" || slot.question === null) return null;
  if (!("questions" in card.greeting)) return null;
  // 행의 그 차례 질문(마지막 물음표 문장)과 카드 인사 질문의 질문 열쇠(마지막 물음표 문장)를 견준다 — 시드 꼴 'Hello, {NAME}! How are you?'
  // 도 'How are you?' 자리와 맞는다(흐름 greetingAnswerOf 와 같은 열쇠 — 답 소리와 힌트가 같은 질문을 가리킨다, 묶음 1 fix 2 N-1)
  const key = cardQuestionKeyOf(slot.question);
  const q = card.greeting.questions.find(
    (g) => cardQuestionKeyOf(g.question.en) === key,
  );
  if (!q) return null;
  return {
    hintKo: q.hintKo,
    hints: spec.hintTiers
      .filter((t) => t !== "ko")
      .map((t) => (t === "frame" ? (q.frameEn ?? "") : q.hintEn)),
    usablePhrases: [],
  };
}

/**
 * 지금 질문 자리의 힌트 단(3.3 힌트 문단): 카드 항목을 노린 자리는 그 카드 항목의 힌트, 1~3단계 장면 여는 질문 자리는 그 칸의 힌트, 1~3단계
 * 인사 질문 자리는 카드 인사 질문의 힌트 칸,
 * 아니면 그 질문을 쓴 선생님 행 aiQuestion 의 AI 힌트(검사를 지난 것만 저장됨). 모두 없으면 '힌트' 단추가 없다.
 */
export function lessonHintsAt(
  state: {
    spec: LessonHintSpec;
    card: LessonHintCard;
    turns: readonly TalkLessonTurn[];
    liveRows: readonly Pick<TalkTurnRow, "speaker" | "aiQuestion">[];
  },
  slot: TalkQuestionSlot | null,
): HintTier[] {
  if (!slot) return [];
  const cardItem =
    slot.item.kind === "none"
      ? null
      : ((slot.item.kind === "required"
          ? state.card.required
          : state.card.more
        ).find((x) => x.no === slot.item.no) ?? null);
  const item =
    cardItem ??
    sceneHintItemOf(state.spec, state.card, slot) ??
    greetingHintItemOf(state.spec, state.card, slot);
  const row =
    item || slot.question === null
      ? undefined
      : state.liveRows.findLast(
          (r) =>
            r.speaker === "tori" &&
            (r.aiQuestion as { en?: unknown } | null)?.en === slot.question,
        );
  return lessonHintTiersOf({
    spec: state.spec,
    item,
    ai: aiHintsOfRow(row),
    askKind: lessonAskKindOf(state.turns, slot),
  });
}

export type LessonChildRow = {
  text: string | null;
  inputMode: TalkInputMode;
  hintKind: TalkHintKind;
  hintLevel: number;
  heardHelp: Exclude<TalkHeardHelp, "none"> | null;
  targetWords: string[];
  askKind: AskKind;
  withinTarget: boolean;
  wordCount: number;
  clientListen: ClientListenRow | null;
};

const wordsIn = (text: string) => text.trim().split(/\s+/).filter(Boolean);

/**
 * 아이 행 칸(5절 talk_turns 아이 행 — 보내기 전에 저장). 힌트 단은 지금 질문 자리의 것이고 열린 단 수는 같은 자리의 이어진 막힘(stuckInSlot)
 * 둘째부터 마지막 단까지. 들은 도움은 화면이 보낸 것과 앞 선생님 행 move(서버가 붙인 소리 줄 · AI 가 준 도움 — heardHelpsOfMove)를 함께
 * 본다(정한 것 8). 이름 묻기 턴(그 자리 답 예시 · 힌트에 {NAME})이면 {NAME} 자리를 바꾼 뒤 가린다(6.1 · AC-16b).
 */
export function lessonChildRowOf(
  request: LessonTurnRequest,
  ctx: {
    state: Pick<
      TalkLessonState,
      "spec" | "card" | "position" | "turns" | "liveRows" | "segment"
    >;
    masker: Masker;
  },
): LessonChildRow {
  const { state } = ctx;
  const position = state.position;
  const slot = position.slot;
  const tiers = lessonHintsAt(state, slot);
  const opened = openedTierCount({
    tiers,
    pressed: request.hint.opened,
    dontKnowCount: position.stuckInSlot,
  });
  const prev = state.turns.findLast((r) => r.speaker === "teacher");
  const heard = [
    ...new Set([
      ...request.hint.heard,
      ...heardHelpsOfMove(
        prev?.speaker === "teacher" ? prev.move : null,
        state.spec,
      ),
    ]),
  ];
  const mode = request.input.mode;
  const raw = request.input.text?.trim() ?? "";
  const templates = [
    slot?.answerExample ?? "",
    ...tiers.map((t) => t.text),
  ].filter((t) => t.includes(PLACEHOLDER_NAME));
  const named = templates.length > 0 ? maskNameAnswer(raw, { templates }) : raw;
  const text = mode === "dont_know" ? null : ctx.masker(named).text;
  const help = heardHelpOf(heard);
  return {
    text,
    inputMode: mode,
    hintKind: hintKindOf({ opened: tiers.slice(0, opened), heard }),
    hintLevel: opened,
    heardHelp: help === "none" ? null : help,
    targetWords: [...(slot?.words ?? [])],
    askKind: lessonAskKindOf(state.turns, slot),
    withinTarget: state.segment !== "more_talk" && !position.closingAsked,
    wordCount: text === null ? 0 : wordsIn(text).length,
    clientListen: clientListenRowOf(request.input, request.clientListen),
  };
}

// ── 순수: 흘려 받기 문장 문 ─────────────────────────────────────

/** 소리 줄 신호 말인가(신호 구 · 시드 신호 말 줄 — core/conversation/cue-line 으로 옮김, 'AI 몫 넓힘' plan 2 행). */
export { isSoundCue };

/** 이 차례에 선생님(AI)이 질문을 쓰는가(AI 차례 · 질문함). 아니면 물음표 문장을 지운다(02-2 202줄 · 6.1 고정부). */
export function asksQuestion(plan: Pick<TeacherTurnPlan, "kind" | "aiAsks">) {
  return plan.kind === "ai" && plan.aiAsks;
}

const soundAnswersOf = (plan: Pick<TeacherTurnPlan, "attach">) =>
  plan.attach.flatMap((l) => (l.kind === "sound" ? [l.en] : []));

export type LessonSentenceState = "sent" | "held" | "dropped";
export type LessonSentence = {
  /** 보이고 읽는 글(상황 줄로 바뀌었으면 그 줄). */
  en: string;
  question: boolean;
  cue: boolean;
  state: LessonSentenceState;
  /**
   * 지운 까닭: 질문을 쓰지 않는 차례의 물음표 · 같은 질문(4단계부터 문장이 끝날 때) · 붙일 소리 줄의 답을 담은 문장(C125) · 1~3단계 AI 가 쓴 신호
   * 말(cue — 신호 말은 앱이 시드 목록에서 붙인다, C207) · 지어낸 경험 꼴(made_up, C211 (1)) · 상황 차례 검사의 둘째 걸림부터(situation).
   * together 는 옛 까닭(받침 닫기 · 들리지 않음의 신호 말 — 이제 1~3단계 신호 말은 모두 cue)이다.
   */
  reason?:
    | "question"
    | "same"
    | "overlap"
    | "together"
    | "rewrite"
    | "cue"
    | "made_up"
    | "situation";
  /** 상황 차례 검사에 걸려 상황 줄로 바뀐 문장의 AI 원문(보이지 않는다 — 대본 · 시험 몫). */
  ai?: string;
  /** 상황 줄로 바뀐 문장의 뜻(상황 줄의 뜻 — AI 뜻 목록의 그 문장 자리를 이것으로 바꾼다). */
  ko?: string;
};

export type LessonSentenceFlow = {
  /** 응답 첫 칸(stuck)을 읽은 때(시도마다 한 번 — C127). */
  stuck(value: boolean): void;
  /** 검사를 지난 선생님 문장 하나: send 면 바로 보낸다, hold 면 응답 끝까지 잡아 둔다, drop 이면 보이지도 읽지도 않는다. */
  accept(en: string): "send" | "hold" | "drop";
  /** 마지막으로 받은 문장의 보일 글(상황 줄로 바뀌었으면 그 줄 — send 일 때 부르는 쪽이 이 글을 보낸다). */
  lastText(): string;
  entries(): LessonSentence[];
  /** 응답 첫 칸으로 고른 계획(막힘 계획이 있고 stuck 이 참이면 그것). */
  chosen(): TeacherTurnPlan;
  stuckValue(): boolean | undefined;
};

/**
 * 1~3단계 실시간 검사 재료('AI 몫 넓힘' plan 2 행 · spec 판 4 설계 1 · 3 · 6 — 신호 말 · 지어낸 경험 꼴 · 상황 차례 검사). 없으면 이 검사들을
 * 하지 않는다(4단계부터 · 순수 시험의 옛 길). 신호 구(CUE_PHRASES) 지움은 재료와 관계없이 1~3단계에서 늘 한다.
 */
export type LessonLiveChecks = {
  /** 시드 신호 말 줄(정규화 글 — seedCuePhrasesOf). 문장 전체가 같으면 AI 가 쓴 신호 말로 지운다. */
  cuePhrases: readonly string[];
  /** 지어낸 경험 꼴(정규화한 구, 시드 talk-made-up-phrases). 비면 검사하지 않는다. */
  madeUp: readonly string[];
  /** 상황 차례 검사 재료. null 이면 상황 차례 검사를 하지 않는다. */
  situation: LessonSituationChecks | null;
};

export type LessonSituationChecks = {
  /** 1~3단계 질문 검사와 같은 범위 재료(범위를 읽지 못한 턴은 null — 상황 차례 문장이 모두 걸린다). */
  options: LowLevelLineOptions | null;
  /** 감탄 · 수업 말 허용 낱말(소문자). */
  allowed: ReadonlySet<string>;
  /** 허용 낱말 대조의 모든 단계 원형 찾기(허용 낱말의 vocab 활용형 — readAllowedLemmaOf). 없으면 규칙 꼬리 떼기. */
  allowedLemmaOf?: ((surface: string) => string | undefined) | undefined;
  forbidden: { all: readonly string[]; nospeech: readonly string[] };
  /** 상황 줄(자리마다 — 턴 번호로 돌림). */
  lines: Partial<TalkSituationLinesFile["lines"]>;
  /** 이 선생님 차례의 턴 번호(상황 줄 돌림). */
  turnNo: number;
  /** 답 글 검사의 질문 글(그 자리를 연 선생님 차례부터 지금까지 보인 글 — 장면 문장 포함). */
  question: string;
  /** 이 대화의 앞 선생님 행 글(상황 줄 되풀이 피하기 — 검토 rev-2 M-1). 없으면 빈 목록. */
  spoken?: readonly string[];
  /**
   * 참이면 상황 차례 문장이 이 대화의 앞 선생님 말(spoken)과 같거나 상황 차례 예를 그대로 쓴 문장일 때도 걸린다(situation repeat · copy — 대본
   * 회차 r1 판정 I-1 (나)). 서버 배선 · 대본 도구가 켠다. 없으면 보지 않는다(옛 시험 길).
   */
  repeat?: boolean;
  /** 기능어(어휘 시드의 기능어 표시, 소문자). */
  functionWords: ReadonlySet<string>;
};

/** 그 계획의 상황 차례 검사 맥락(답 글은 받침 · 들리지 않음에서 계획의 답 예시가 있을 때만). */
function situationContextOf(
  place: SituationPlace,
  plan: Pick<TeacherTurnPlan, "answerFallback">,
  checks: LessonSituationChecks,
) {
  return {
    place,
    options: checks.options,
    allowed: checks.allowed,
    ...(checks.allowedLemmaOf ? { allowedLemmaOf: checks.allowedLemmaOf } : {}),
    forbidden: checks.forbidden,
    answer:
      place !== "greeting_end" && plan.answerFallback
        ? {
            example: plan.answerFallback,
            question: checks.question,
            functionWords: checks.functionWords,
          }
        : null,
    ...(checks.repeat ? { repeat: { spoken: checks.spoken ?? [] } } : {}),
  };
}

/**
 * 새 꼴 문장 문(정한 것 19 · 02-2 200 · 202 · 204줄 · 6.4). 질문을 쓰지 않는 차례(카드 자리 · 마무리 자리 · 질문 없는 AI 차례)의 물음표 문장은
 * 지운다. AI 차례 1~3단계는 물음표 문장부터 응답 끝까지 잡아 둔다(A4-03 에 쓰는 next_targets 가 응답 끝에 온다). 4단계부터는 물음표 문장이
 * 끝날 때 같은 질문만 본다(막힌 바로 뒤의 막힌 질문 · talk.same_question_max). 붙일 소리 줄의 답을 담은 선생님 문장은 지운다(C125 (3)).
 * 1~3단계('AI 몫 넓힘' plan 2 행): AI 가 쓴 신호 말은 늘 지운다(cue — 신호 말은 앱이 붙인다, C207), 물음표 아닌 문장의 지어낸 경험 꼴을 지운다
 * (made_up — 질문은 남아 질문 검사를 받는다), 상황 차례(인사 끝 · 받침 · 들리지 않음)의 물음표 아닌 문장은 상황 검사를 받아 첫 걸림은 시드 상황
 * 줄로 바꾸고 뒤 걸림은 지운다(범위를 못 읽은 턴은 모두 걸림). stuck 이 오기 전에 문장이 오면(칸 차례를 어김) 답함 계획으로 본다.
 */
export function createLessonSentenceFlow({
  low,
  ifAnswered,
  ifStuck,
  asked,
  max,
  live = null,
}: {
  low: boolean;
  ifAnswered: TeacherTurnPlan;
  ifStuck: TeacherTurnPlan | null;
  asked: ReadonlyMap<string, number>;
  max: number;
  live?: LessonLiveChecks | null;
}): LessonSentenceFlow {
  let stuck: boolean | undefined;
  let holding = false;
  // 4단계부터 같은 질문으로 한 문장을 지운 뒤의 물음표 문장도 지운다(한 턴에 질문 하나 — 검토 M-1)
  let sameDropped = false;
  // 상황 차례에서 상황 줄로 바꾼 문장이 있다(뒤 걸림은 지운다 — spec 설계 1 말 검사 끝)
  let situationUsed = false;
  const list: LessonSentence[] = [];
  const chosen = () => (stuck === true && ifStuck ? ifStuck : ifAnswered);
  const answer = { send: "send", held: "hold", dropped: "drop" } as const;
  /** 1~3단계 실시간 검사(신호 말 · 지어낸 경험 · 상황 차례) — 지웠으면 참. */
  const liveDrop = (entry: LessonSentence, plan: TeacherTurnPlan): boolean => {
    if (!low) return false;
    if (entry.cue) {
      entry.state = "dropped";
      entry.reason = "cue";
      return true;
    }
    if (entry.question || live === null) return false;
    if (madeUpHit(entry.en, live.madeUp) !== null) {
      entry.state = "dropped";
      entry.reason = "made_up";
      return true;
    }
    const checks = live.situation;
    const place = checks ? situationPlaceOf(plan) : null;
    if (!checks || place === null) return false;
    // [N-2] 상황 줄로 바꾼 뒤의 AI 문장은 지운다(상황 줄이 반응 · 넘김을 이미 담는다 — 같은 뜻 두 번 말하기 막음, 대본 회차 r2 판정 N-2)
    // [N-2] 이 턴에 남긴 문장과 같은 뜻을 되풀이하는 AI 문장도 지운다(echoesTurnSentence)
    if (
      situationUsed ||
      echoesTurnSentence(
        entry.en,
        list
          .filter((e) => e.state !== "dropped" && !e.question)
          .map((e) => e.en),
      )
    ) {
      entry.state = "dropped";
      entry.reason = "situation";
      return true;
    }
    const check = checkSituationSentence(
      entry.en,
      situationContextOf(place, plan, checks),
    );
    if (check.ok) return false;
    const reacted = list.some(
      (e) => e.state !== "dropped" && !e.question && !e.cue,
    );
    const line = situationLineOf(checks.lines, place, checks.turnNo, {
      sentences: list.filter((e) => e.state !== "dropped").map((e) => e.en),
      texts: checks.spoken ?? [],
      reacted,
    });
    if (line === null) {
      entry.state = "dropped";
      entry.reason = "situation";
      return true;
    }
    situationUsed = true;
    // [N-1] 이 턴에 AI 맞장구가 남았으면 상황 줄의 넘김만 붙인다(반응은 AI, 넘김은 앱 — 대본 회차 r2 판정 N-1 (나))
    const shown = situationTailOf(line, reacted);
    entry.ai = entry.en;
    entry.en = shown.en;
    entry.ko = shown.ko;
    return false;
  };
  return {
    // 시도마다 덮어쓴다(다시 부름은 문장이 하나도 닿지 않았을 때만 일어나 앞 판단으로 고른 문장이 없다 — 검토 M-2)
    stuck(value) {
      stuck = value;
    },
    accept(en) {
      const plan = chosen();
      const question = isQuestionSentence(en);
      const cue = low && isSoundCue(en, live?.cuePhrases ?? []);
      const entry: LessonSentence = { en, question, cue, state: "sent" };
      const answers = soundAnswersOf(plan);
      const asks = asksQuestion(plan);
      if (liveDrop(entry, plan)) {
        // 지움(1~3단계 신호 말 · 지어낸 경험 · 상황 차례 둘째 걸림부터)
      } else if (
        answers.length > 0 &&
        sayingAnswer(
          entry.en,
          answers.map((a) => [a, a] as const),
        )
      ) {
        entry.state = "dropped";
        entry.reason = "overlap";
      } else if (holding) entry.state = "held";
      else if (question && !asks) {
        entry.state = "dropped";
        entry.reason = "question";
      } else if (question && low) {
        holding = true;
        entry.state = "held";
      } else if (question && sameDropped) {
        entry.state = "dropped";
        entry.reason = "question";
      } else if (question) {
        const hit = sameQuestionKeyHit({
          key: questionKeyOf(en),
          blocked: plan.blocked,
          asked,
          max,
        });
        if (hit) {
          entry.state = "dropped";
          entry.reason = "same";
          sameDropped = true;
        }
      }
      list.push(entry);
      return entry.state === "sent" ? answer.send : answer[entry.state];
    },
    lastText: () => list.at(-1)?.en ?? "",
    entries: () => list.map((e) => ({ ...e })),
    chosen,
    stuckValue: () => stuck,
  };
}

// ── 순수: 질문이 지워진 턴의 카드 자리(까닭 (2) · (3) · 끊김 · 실패 길) ─────

export type LessonSlotContext = {
  card: Pick<TalkLessonCard, "required" | "more">;
  /** 흐름의 행(이번 아이 행까지). */
  turns: readonly TalkLessonTurn[];
  asked: ReadonlyMap<string, number>;
  max: number;
  low: boolean;
  koMeaning: boolean;
  /** 이번 응답에서 지운 질문 글(같은 질문을 붙이지 않는다 — AC-15i '걸린 질문 뒤에도 같은 질문이 이어서 나오지 않는다'). */
  dropped: readonly string[];
};

function questionLineOf(
  ctx: Pick<LessonSlotContext, "card" | "koMeaning">,
  ref: TeacherTurnPlan["item"],
  role: "card" | "easy",
): TeacherAttachLine | null {
  const item = cardItemOf(ctx.card, ref);
  if (!item) return null;
  const text = role === "easy" ? item.easyQuestion : item;
  return {
    kind: "question",
    role,
    en: text.en,
    ...(ctx.koMeaning && text.ko ? { ko: text.ko } : {}),
    item: { ...ref },
  };
}

/**
 * AI 차례의 질문이 지워진 턴을 카드 자리로 바꾼다(3.3 카드 자리 (2) · (3) · 되풀이 막기 · 8절 끊김 · 실패 길, 정한 것 18 · C194 (1)).
 * 막힌 뒤라면 받침 단계의 카드 줄을 붙인다: 받침 둘째는 카드 쉬운 질문, 카드 줄이 없으면(AI 질문 자리) 그 자리의 답을 한 번 들려주며
 * 자리를 닫고(1~3단계 소리 · 4단계부터 글) 다음 이야기로 간다. 그 밖은 가장 앞의 남은 기회(남은 필수 질문 → 다시 쓰기가 남은 낱말의
 * 더 이야기할 거리), 없으면 대신 질문(가장 오래전에 쓴 더 이야기할 거리)이다. 붙일 것이 없으면 null(AI 차례로 둔다 — 질문 없이).
 */
export function lessonCardSlotOf(
  chosen: TeacherTurnPlan,
  why: TalkSlotWhy,
  ctx: LessonSlotContext,
): TeacherTurnPlan | null {
  const blocked = [
    ...new Set([...chosen.blocked, ...ctx.dropped.map(questionKeyOf)]),
  ];
  const guard = { blocked, asked: ctx.asked, max: ctx.max };
  const base: TeacherTurnPlan = {
    ...chosen,
    kind: "card_slot",
    callsAi: true,
    aiAsks: false,
    why,
    attach: [],
    app: [],
  };
  const afterStuck = chosen.cause === "button" || chosen.cause === "stuck";
  if (
    afterStuck &&
    chosen.stage === TALK_SUPPORT_STAGE_EASY &&
    chosen.easyFallback &&
    chosen.item.kind !== "none"
  ) {
    const line = questionLineOf(ctx, chosen.item, "easy");
    if (line) return { ...base, attach: [line], app: ["easy_question"] };
  }
  const attach: TeacherAttachLine[] = [];
  const app: TalkAppHelp[] = [];
  const answer =
    afterStuck || chosen.cause === "nospeech" ? chosen.answerFallback : null;
  if (answer) {
    attach.push(
      ctx.low
        ? { kind: "sound", role: "answer", en: answer }
        : { kind: "answer_example", en: answer },
    );
    app.push("answer_example");
  }
  const ref =
    slotChanceOf({ card: ctx.card, chances: chosen.chances, ...guard }) ??
    oldestMoreOf({ card: ctx.card, turns: ctx.turns, ...guard });
  const line = ref ? questionLineOf(ctx, ref, "card") : null;
  if (line) attach.push(line);
  if (attach.length === 0) return null;
  const item = ref ? cardItemOf(ctx.card, ref) : undefined;
  return {
    ...base,
    attach,
    app,
    ...(item && ref
      ? {
          item: { ...ref },
          words: [...item.targets],
          goals: [...item.goals],
        }
      : {}),
  };
}

// ── 순수: 끝 처리(결과 → 선생님 행) ─────────────────────────────

/** 회화 턴 결과의 줄인 꼴(서버 결과 → 순수 끝 처리). */
export type LessonOutcomeView =
  | {
      kind: "ok";
      value: TalkLessonOutput;
      hintsBlocked: boolean;
      soundFixed?: { model: boolean; choices: boolean };
      overLength: number;
      /** 문장 문(검사)에 걸려 바뀌거나 빠진 선생님 문장 수 — 있으면 뜻 목록을 문장과 맞출 수 없어 뜻을 보이지 않는다(13절 C202 (5)). */
      blocked?: number;
      /**
       * 질문이 없으면 카드 자리로(검토 rev-prompt-2 B): 막힘을 무른 턴을 다시 쓰지 못해 앞 응답 문장을 모두 지운 결과. 질문을 쓰는 차례가 질문
       * 없이 끝나지 않게 끝 처리가 카드 질문을 붙인다.
       */
      needsQuestion?: boolean;
    }
  /** 첫 문장 뒤 끊김(8절 — 보낸 문장을 두고 그 턴을 닫는다). */
  | { kind: "cut"; overLength: number }
  /** 앱이 고른 한 줄로 선생님 반응 자리를 채움: 거절(안전한 대사) · 1~3단계 두 번 실패(칭찬 대사). */
  | { kind: "line"; line: { en: string; ko?: string } };

export type LessonSettleContext = LessonSlotContext & {
  spec: Pick<TalkLessonSpec, "band" | "koMeaning">;
  /** 1~3단계 질문 검사 재료(범위를 읽지 못했으면 null — 그 턴의 AI 질문은 모두 걸린 것으로 본다). */
  lineOptions: LowLevelLineOptions | null;
  /** 1~3단계 상황 줄 · 신호 말 재료('AI 몫 넓힘' plan 2 행). 없으면 상황 줄 대신 길 · 신호 말이 없다(4단계부터 · 옛 시험). */
  live?: LessonSettleLive | null;
};

export type LessonSettleLive = {
  /** 상황 줄(자리마다) · 이 선생님 차례의 턴 번호(돌림). */
  situationLines: Partial<TalkSituationLinesFile["lines"]>;
  turnNo: number;
  /** 신호 말 목록과 구간(1~3단계 — cueBandOf). 지난 선생님 행 move 는 ctx.turns 에서 센다. */
  cue: { file: TalkCueLinesFile; band: CueBand } | null;
};

/** 앱이 붙인 한 줄(신호 말 — 화면에 보이고 읽지만 text · rewrite · 기록에 넣지 않는다). */
export type LessonCueLine = { en: string; ko?: string };

export type LessonTurnResult = {
  /** 최종 계획(카드 자리로 바뀐 것 포함). */
  plan: TeacherTurnPlan;
  /** AI 차례를 카드 자리로 바꾼 까닭(바꾸지 않았으면 null). */
  replaced: TalkSlotWhy | null;
  /** AI 의 질문이 지워졌다(카드 자리로 바뀌지 못한 턴 포함). */
  questionDropped: boolean;
  /** 응답 끝에서 보낼 선생님 문장(잡아 둔 것 · 앱이 고른 한 줄, 차례대로). */
  release: string[];
  /** 화면 글 문장 전부(보낸 것 · 끝에서 보낸 것, 차례대로). */
  kept: string[];
  /** 뜻 줄(저장 · 흘림). */
  ko: string | null;
  /** AI 소리 줄(1~3단계 AI 차례만). */
  sound: { model?: string; choices?: [string, string] };
  /** 겹침을 뺀 붙일 줄(화면 차례). */
  attach: TeacherAttachLine[];
  move: TalkMove;
  aiQuestion: LessonAiQuestion | null;
  /** 선생님 행 text(화면에 글로 나온 줄만 — 정한 것 5). */
  text: string;
  /** 다시 쓸 선생님 차례(화면 차례대로, 소리 줄 포함 · 뜻 없음 — 6.1 · AC-15k). */
  rewrite: string;
  /** 1~3단계 신호 말 한 줄(뜻 줄 뒤 · 소리 줄 앞, text · rewrite 밖 — spec 설계 6 · AC-6 (가)). 없으면 null. */
  cue: LessonCueLine | null;
};

/** 선생님 행들의 화면 글(차례대로 — 상황 줄 되풀이 피하기 재료). */
export function teacherTextsOf(turns: readonly TalkLessonTurn[]): string[] {
  return turns.flatMap((t) => (t.speaker === "teacher" ? [t.text] : []));
}

/** 선생님 행들의 move(차례대로 — 신호 말 셈 재료). */
function teacherMovesOf(turns: readonly TalkLessonTurn[]): (TalkMove | null)[] {
  return turns.flatMap((t) => (t.speaker === "teacher" ? [t.move] : []));
}

function toAppend(line: TeacherAttachLine): AppendLine | null {
  if (line.kind === "question")
    return {
      kind: "question",
      en: line.en,
      ...(line.ko ? { ko: line.ko } : {}),
    };
  if (line.kind === "closing")
    return {
      kind: "more_prompt",
      en: line.en,
      ...(line.ko ? { ko: line.ko } : {}),
    };
  if (line.kind === "answer_example")
    return { kind: "answer_example", en: line.en };
  return null;
}

/** 화면 글로 보이는 붙일 줄인가(1~3단계 소리 줄은 글이 아니다 — T2). */
function isTextLine(line: TeacherAttachLine): boolean {
  return line.kind !== "sound";
}

/**
 * 겹침 없애기(C125 (3)): 화면 글 붙일 줄 가운데 이미 선생님 문장 · 앞서 붙인 줄에 든 문장(정규화)은 뺀다. 소리 줄과 앱 대사는 늘 남긴다.
 * 남은 카드 질문 줄에서는 선생님 문장에 이미 든 앞 문장(카드의 장면 문장)을 뺀다 — 카드 글을 그대로 쓴 AI 질문이 다시 쓰기 · 질문 검사에 걸려
 * 카드 자리가 된 턴에 장면 문장이 두 번 나가지 않게(13절 C217 보완 · 자리 재현 재생 보고 8.5 우려 1, core cardLineWithoutSaidOf — 대본 도구 사본과
 * 같은 함수).
 */
export function shownAttachOf(
  kept: readonly string[],
  attach: readonly TeacherAttachLine[],
): TeacherAttachLine[] {
  const text = attach.flatMap((l) => {
    const a = toAppend(l);
    return a ? [a] : [];
  });
  const shown = shownTurnOf(kept, text).append;
  const left = [...shown];
  return attach
    .filter((l) => {
      const a = toAppend(l);
      if (!a) return true;
      const at = left.findIndex(
        (s) => s.kind === a.kind && "en" in s && s.en === l.en,
      );
      if (at < 0) return false;
      left.splice(at, 1);
      return true;
    })
    .map((l) => (l.kind === "question" ? cardLineWithoutSaidOf(kept, l) : l));
}

/** 선생님 행 text: 첫 줄은 화면 글 선생님 문장(띄어 이음, 없으면 빈 줄), 그 뒤로 화면 글로 붙인 줄 한 줄씩(정한 것 5). */
export function lessonTextOf(
  kept: readonly string[],
  attach: readonly TeacherAttachLine[],
): string {
  return [
    kept.join(" "),
    ...attach.filter(isTextLine).flatMap((l) => ("en" in l ? [l.en] : [])),
  ].join("\n");
}

/** 화면 글 문장에 그 낱말이 드는가(소문자 낱말 — 카드 자리로 바꿔 따라 할 말을 버린 턴의 꺼낸 새 단어 거르기). */
function keptHasWord(kept: readonly string[], word: string): boolean {
  const lower = word.toLowerCase();
  return kept.some((s) =>
    tokenize(s).some(
      (t) => t.kind === "word" && t.text.toLowerCase() === lower,
    ),
  );
}

function aiMoveOf(
  value: TalkLessonOutput | null,
  keepNext: boolean,
  replaced: boolean,
  kept: readonly string[],
): TeacherMoveAi {
  if (!value) return {};
  return {
    next: keepNext ? value.next_move : "none",
    ...(keepNext
      ? {
          item: { ...value.card_item },
          words: [...value.next_targets],
          goals: [...value.next_goal],
        }
      : { item: { ...NO_CARD_ITEM }, words: [], goals: [] }),
    // 카드 자리로 바꾼 턴은 AI 의 따라 할 말을 버리므로 화면 글에 남은 새 단어만 꺼낸 것이다(정규화의 '선생님 말 · 따라 할 말에 있을 때만')
    intro: replaced
      ? value.new_words.filter((w) => keptHasWord(kept, w))
      : [...value.new_words],
    suggest: {
      fit: value.response_fit,
      topic: value.child_topic,
      asked: value.child_asked,
      goals: value.goal_suggest.map((g) => ({ id: g.goal, why: g.why_ko })),
    },
    // 카드 자리로 바꾼 턴은 AI 의 소리 줄을 버리므로 AI 가 준 도움도 없다(들은 도움 판정이 move 를 읽는다 — heardHelpsOfMove)
    ai: replaced ? "none" : value.support,
  };
}

/**
 * 받침 둘째의 AI 질문 자리면 질문 검사 재료(그 응답에 남은 고르기 답 수), 아니면 undefined(13절 C217 (2) (ㄴ) — 끝 처리와 질문 다시 쓰기가 같이
 * 쓴다). 자리 판정은 core talkEasyAiSlotOf.
 */
export function lessonEasySlotOf(
  chosen: Pick<TeacherTurnPlan, "kind" | "aiAsks" | "stage">,
  value: Pick<TalkLessonOutput, "choices">,
  low: boolean,
): { choices: number } | undefined {
  return talkEasyAiSlotOf(chosen, low)
    ? { choices: value.choices.length }
    : undefined;
}

/**
 * 회화 턴 결과 → 선생님 행(정한 것 5 · 18 · 19, 묶음 6 검토 8절 (가) · (나) · (라)).
 * - 성공: 1~3단계 AI 차례의 잡아 둔 물음표 문장은 6.4 질문 검사(길이 · 어휘 범위 · 아이가 말한 낱말 · {NAME} · 선생님 이름 · A4-03)와
 *   같은 질문 막기(그 차례 질문 — 마지막 물음표 문장)를 지나야 내보낸다. 걸리면 물음표 문장을 모두 지우고 카드 자리로 바꾼다(question_check ·
 *   same_question). 4단계부터 같은 질문으로 지운 턴도 같다. 카드 자리로 바뀌면 AI 의 소리 줄과 갈래를 버린다 — 마무리 제안이 지워진 턴은
 *   갈래 closing 이 none 이 되어 두 버튼을 보이지 않는다((가)).
 * - 소리 줄 신호 말은 소리 줄(AI 의 따라 할 말 · 선택지 · 붙인 답 소리)이 있을 때만 남긴다((나)).
 * - 끊김: 잡아 둔 물음표 문장은 검사할 수 없어 지운다. 보낸 문장에 질문이 없으면 카드 자리(cut)다. 질문이 있으면 그 차례 힌트가 없다.
 * - 한 줄(거절 · 1~3단계 실패): 그 줄을 반응 자리에 두고, AI 질문 차례였으면 카드 자리(fail)다.
 * 앱이 바꾼 따라 할 말(소리 줄 바뀜)은 서버가 붙인 도움으로 move.app 에 model_line 을 더한다((라) — ai_calls 는 '검증 실패'로 남음).
 */
export function settleLessonTurn({
  flow,
  outcome,
  ctx,
}: {
  flow: Pick<LessonSentenceFlow, "entries" | "chosen">;
  outcome: LessonOutcomeView;
  ctx: LessonSettleContext;
}): LessonTurnResult {
  const chosen = flow.chosen();
  const entries = flow.entries();
  const value = outcome.kind === "ok" ? outcome.value : null;
  const low = ctx.low;
  const asks = asksQuestion(chosen);
  let why: TalkSlotWhy | null = null;
  const dropped: string[] = entries
    .filter((e) => e.state === "dropped" && e.reason === "same")
    .map((e) => e.en);
  if (dropped.length > 0) why = "same_question";

  // [M-r2-1] 1~3단계는 한 차례 질문 하나 — 잡아 둔 질문이 둘 이상이면 마지막 것만(core keepLastHeldQuestion)
  if (low)
    keepLastHeldQuestion(entries, (q) => {
      const o = ctx.lineOptions;
      return (
        value !== null &&
        o !== null &&
        o.childLines !== undefined &&
        questionEchoesChild(q, o.childLines, o.lemmaOf, value.next_targets)
      );
    });
  const heldQuestions = entries.filter((e) => e.state === "held" && e.question);
  if (heldQuestions.length > 0) {
    let fail: TalkSlotWhy | null = null;
    if (!value) fail = "cut";
    else if (ctx.lineOptions === null) fail = "question_check";
    else {
      const options = ctx.lineOptions;
      // 받침 둘째의 AI 질문 자리는 예 · 아니요 질문이나 고르기 답 둘이 딸린 질문만 받는다(13절 C217 (2) (ㄴ) — 다시 쓰기와 같은 판정)
      const easySlot = lessonEasySlotOf(chosen, value, low);
      const ranged = heldQuestions.every(
        (q) =>
          checkLowLevelQuestion(q.en, {
            ...options,
            targets: value.next_targets,
            easySlot,
          }).ok,
      );
      const turnQ = heldQuestions.at(-1)?.en ?? "";
      const same = sameQuestionKeyHit({
        key: questionKeyOf(turnQ),
        blocked: chosen.blocked,
        asked: ctx.asked,
        max: ctx.max,
      });
      fail = !ranged ? "question_check" : same ? "same_question" : null;
    }
    if (fail) {
      for (const q of heldQuestions) {
        q.state = "dropped";
        q.reason = fail === "same_question" ? "same" : "question";
        dropped.push(q.en);
      }
      why = why ?? (fail === "cut" ? null : fail);
    }
  }

  // 반응 자리에 앱이 고른 한 줄(거절 · 1~3단계 실패) — 흘려 받은 문장이 없는 턴이다
  const line = outcome.kind === "line" ? outcome.line : null;
  const lineEntries: LessonSentence[] = line
    ? [
        {
          en: line.en,
          question: isQuestionSentence(line.en),
          cue: false,
          state: "held",
        },
      ]
    : [];
  const all = [...entries, ...lineEntries];
  const willKeep = (e: LessonSentence) => e.state !== "dropped";
  const keptQuestion = all.some((e) => willKeep(e) && e.question && !e.cue);
  // 같은 질문으로 지우면 늘 카드 자리다 — 그 차례 질문은 마지막 물음표 문장이고 앞서 보낸 물음표 문장은 반응이다(02-2 200줄 · AC-15r,
  // 묶음 8 fix 1 재검토 N-1). AI 가 정말 질문 둘을 쓰고 둘째가 되풀이인 드문 턴은 앞 질문이 이미 흘러 질문이 둘 보인다(흘려 보내기의 한계)

  // 질문이 없는 AI 질문 차례 → 카드 자리
  if (asks && !why) {
    if (outcome.kind === "cut" && !keptQuestion) why = "cut";
    else if (outcome.kind === "line" && !keptQuestion) why = "fail";
    else if (
      outcome.kind === "ok" &&
      outcome.needsQuestion === true &&
      !keptQuestion
    )
      why = "fail";
  }
  let plan = chosen;
  let replaced: TalkSlotWhy | null = null;
  if (asks && why) {
    // 1~3단계 둘째 인사(AI 인사 질문)가 걸리면 카드 둘째 인사 질문을 붙인다(spec 설계 2 [M-2] — 카드 기회 질문이 아님)
    const slot = chosen.greetingFallback
      ? greetingFallbackSlotOf(chosen, chosen.greetingFallback, why)
      : lessonCardSlotOf(chosen, why, { ...ctx, dropped });
    if (slot) {
      plan = slot;
      replaced = why;
    }
  }
  const questionDropped = asks && (dropped.length > 0 || replaced !== null);

  // AI 소리 줄(1~3단계 AI 차례만, 카드 자리로 바뀌면 버림). 선택지는 지워진 질문에 딸려 있어 질문이 지워지면 버린다
  const sound: LessonTurnResult["sound"] = {};
  if (value && low && plan.kind === "ai") {
    if (value.model_line !== "") sound.model = value.model_line;
    if (!questionDropped && value.choices.length === 2)
      sound.choices = [value.choices[0] ?? "", value.choices[1] ?? ""];
  }
  const hasSound =
    sound.model !== undefined ||
    sound.choices !== undefined ||
    plan.attach.some((l) => l.kind === "sound");
  // 소리 줄의 답을 담은 잡아 둔 선생님 문장은 뺀다(C125 · 02-2 204줄 — 이미 흘린 것은 소리 줄 바뀜의 겹침으로 남음, 검토 I-1)
  const pairs = soundPairsOf({
    model_line: sound.model ?? "",
    choices: sound.choices ?? [],
  });
  for (const e of all) {
    if (e.state !== "held") continue;
    if (e.cue && !hasSound) {
      e.state = "dropped";
      e.reason = "question";
    } else if (!e.cue && pairs.length > 0 && sayingAnswer(e.en, pairs)) {
      e.state = "dropped";
      e.reason = "overlap";
    }
  }
  // 반응이 다 지워진 1~3단계 상황 차례(AI 신호 말뿐 · 걸린 문장뿐 · 물음표뿐)는 상황 줄 하나를 반응 자리에 둔다('AI 몫 넓힘' plan 2 행).
  // 이 턴은 보낸 반응 문장이 없어(질문은 1~3단계에서 늘 잡아 둠) 상황 줄을 맨 앞에 둬도 화면 차례가 맞다
  const place = low ? situationPlaceOf(chosen) : null;
  const reacted = all.some((e) => willKeep(e) && !e.question);
  const fallbackLine =
    place !== null && ctx.live && outcome.kind === "ok" && !reacted
      ? situationLineOf(ctx.live.situationLines, place, ctx.live.turnNo, {
          sentences: all.filter((e) => willKeep(e)).map((e) => e.en),
          texts: teacherTextsOf(ctx.turns),
        })
      : null;
  const fallback: LessonSentence[] = fallbackLine
    ? [
        {
          en: fallbackLine.en,
          question: false,
          cue: false,
          state: "held",
          ko: fallbackLine.ko,
        },
      ]
    : [];
  const ordered = [...fallback, ...all];
  const release = ordered.filter((e) => e.state === "held").map((e) => e.en);
  const kept = ordered.filter(willKeep).map((e) => e.en);

  const attach = shownAttachOf(kept, plan.attach);
  const sentAll = ordered.map((e) => e.en);
  // 뜻은 뜻을 보이는 단계만, 문장마다의 뜻이면 빠진 선생님 문장의 뜻만 뺀다(13절 C202 (5) — plan 정한 것 9 의 '겹침 규칙 그대로'를 바꿈).
  // 문장과 맞출 수 없는 뜻(수가 다름 · 옛 한 글)은 옛 규칙: 1~3단계는 선생님 문장이 빠진 턴이면 흘리지도 저장하지도 않는다(T2).
  // 문장 문에 걸린 문장이 있는 응답은 걸린 문장의 뜻을 가려낼 수 없어 뜻을 보이지 않는다
  const koRaw: string | readonly string[] | null =
    outcome.kind === "ok" && (outcome.blocked ?? 0) > 0
      ? null
      : value && value.tori_ko.length > 0
        ? value.tori_ko
        : line?.ko !== undefined
          ? line.ko
          : null;
  const situationKo = situationKoOf({ koRaw, entries, fallback, ordered });
  const ko = !ctx.spec.koMeaning
    ? null
    : situationKo
      ? situationKo.ko
      : toriKoShownOf({
          ko: koRaw,
          sent: sentAll,
          shown: kept,
          lowBand: isLowBand(ctx.spec),
        });

  const keepNext = plan.kind === "ai" && !questionDropped;
  // 4단계부터 끊긴 턴에 보낸 질문이 남으면 그 질문의 카드 항목을 알 수 없다 — 계획의 카드 항목(막힌 자리)을 남기지 않는다(07 60줄, 검토 M-3)
  const cutAsked =
    value === null &&
    plan.kind === "ai" &&
    outcome.kind === "cut" &&
    keptQuestion;
  const moveBase = teacherMoveOf(
    plan,
    cutAsked
      ? { item: { ...NO_CARD_ITEM }, words: [], goals: [] }
      : aiMoveOf(value, keepNext, replaced !== null, kept),
  );
  const fixedModel =
    outcome.kind === "ok" &&
    outcome.soundFixed?.model === true &&
    sound.model !== undefined;
  const move = talkMoveOf({
    ...moveBase,
    ...(fixedModel && !moveBase.app.includes("model_line")
      ? { app: [...moveBase.app, "model_line"] }
      : {}),
    ...(sound.model !== undefined || sound.choices !== undefined
      ? {
          sound: {
            ...(moveBase.sound ?? {}),
            ...(sound.model !== undefined ? { model: sound.model } : {}),
            ...(sound.choices !== undefined ? { choices: sound.choices } : {}),
          },
        }
      : {}),
  });

  const text = lessonTextOf(kept, attach);
  const turnQuestion = turnQuestionOf(text, move.kind);
  const aiQuestion: LessonAiQuestion | null =
    value && plan.kind === "ai" && keepNext && turnQuestion !== null
      ? {
          en: turnQuestion,
          ko: "",
          answerExample: value.next_answer_example,
          ...(outcome.kind === "ok" && outcome.hintsBlocked
            ? {}
            : {
                ...(value.next_hint_ko !== ""
                  ? { hintKo: value.next_hint_ko }
                  : {}),
                ...(value.next_hints.length > 0
                  ? { hints: [...value.next_hints] }
                  : {}),
                ...(value.next_usable_phrases.length > 0
                  ? { usable: [...value.next_usable_phrases] }
                  : {}),
              }),
        }
      : null;
  const rewrite = talkLessonRewriteOf({
    sentSentences: kept,
    sound: {
      ...(sound.model !== undefined ? { modelLine: sound.model } : {}),
      ...(sound.choices !== undefined ? { choices: sound.choices } : {}),
    },
    appended: attach.flatMap((l) => ("en" in l ? [l.en] : [])),
  });
  // 신호 말은 이 행 move 와 지난 선생님 행 move 로 다시 고른다(저장하지 않음 — plan 정한 것 6)
  const cueSource = low ? (ctx.live?.cue ?? null) : null;
  const cueLine = cueSource
    ? cueLineForTurn({
        prior: teacherMovesOf(ctx.turns),
        move,
        band: cueSource.band,
        file: cueSource.file,
      })
    : null;
  return {
    plan,
    replaced,
    questionDropped,
    release,
    kept,
    ko,
    sound,
    attach,
    move,
    aiQuestion,
    text,
    rewrite,
    cue: cueLine ? cueLineView(cueLine, ctx.spec.koMeaning) : null,
  };
}

/** 신호 말 · 상황 줄 한 줄의 흘림 꼴(뜻은 뜻을 보이는 단계만). */
function cueLineView(line: TalkListLine, koMeaning: boolean): LessonCueLine {
  return {
    en: line.en,
    ...(koMeaning && line.ko !== "" ? { ko: line.ko } : {}),
  };
}

/** 1~3단계 둘째 인사 AI 질문이 걸린 턴(재질문 뒤): 카드 둘째 인사 질문을 붙인 카드 자리(spec 설계 2 [M-2] · AC-2 (나)). */
function greetingFallbackSlotOf(
  chosen: TeacherTurnPlan,
  line: TeacherAttachLine,
  why: TalkSlotWhy,
): TeacherTurnPlan {
  return {
    ...chosen,
    kind: "card_slot",
    callsAi: true,
    aiAsks: false,
    why,
    attach: [line],
    app: [],
  };
}

/**
 * 상황 줄이 든 턴의 뜻(1~3단계 — 상황 줄로 바뀐 문장 · 반응 자리 상황 줄이 있을 때만, 아니면 null 로 옛 규칙에 맡긴다). AI 뜻이 문장마다이고 수가
 * 맞으면 바뀐 문장 자리를 상황 줄 뜻으로 바꿔 빠진 문장의 뜻만 뺀다. 맞출 수 없으면 남은 문장이 모두 상황 줄일 때만 그 뜻을 잇고, 아니면 뜻이 없다.
 */
function situationKoOf({
  koRaw,
  entries,
  fallback,
  ordered,
}: {
  koRaw: string | readonly string[] | null;
  entries: readonly LessonSentence[];
  fallback: readonly LessonSentence[];
  ordered: readonly LessonSentence[];
}): { ko: string | null } | null {
  if (fallback.length === 0 && !entries.some((e) => e.ko !== undefined))
    return null;
  const kept = ordered.filter((e) => e.state !== "dropped");
  if (
    typeof koRaw !== "string" &&
    koRaw !== null &&
    koRaw.length === entries.length
  ) {
    const list = [
      ...fallback.map((e) => e.ko ?? ""),
      ...entries.map((e, i) => e.ko ?? koRaw[i] ?? ""),
    ];
    return {
      ko: toriKoShownOf({
        ko: list,
        sent: ordered.map((e) => e.en),
        shown: kept.map((e) => e.en),
        lowBand: true,
      }),
    };
  }
  if (kept.length > 0 && kept.every((e) => e.ko !== undefined)) {
    const joined = kept
      .map((e) => (e.ko ?? "").trim())
      .filter((k) => k !== "")
      .join(" ");
    return { ko: joined === "" ? null : joined };
  }
  return { ko: null };
}

/** 붙일 줄 → 흘려 보낼 줄(1~3단계 받침 답은 소리 줄, 4단계부터 답은 글 줄 — 3.3 막힘 표). */
export function attachLineOf(line: TeacherAttachLine): TalkLessonLine {
  switch (line.kind) {
    case "question":
      return {
        t: "add",
        kind: "question",
        en: line.en,
        ...(line.ko ? { ko: line.ko } : {}),
      };
    case "closing":
      return {
        t: "add",
        kind: "more_prompt",
        en: line.en,
        ...(line.ko ? { ko: line.ko } : {}),
      };
    case "answer_example":
      return { t: "add", kind: "answer", en: line.en };
    case "sound":
      return { t: "sound", kind: "answer", say: line.en };
    case "app_line":
      return { t: "s", en: line.en };
  }
}

/** 신호 말 흘림 줄(add · kind cue). */
function cueAddOf(cue: LessonCueLine): TalkLessonLine {
  return {
    t: "add",
    kind: TALK_CUE_LINE_KIND,
    en: cue.en,
    ...(cue.ko !== undefined ? { ko: cue.ko } : {}),
  };
}

/**
 * 선생님 문장 뒤에 흘려 보낼 줄: 뜻 → 1~3단계 신호 말(있으면) → AI 소리 줄(따라 할 말 · 선택지) → 붙일 줄(화면 차례 — 답 소리 → 다음 질문,
 * 02-2 261줄).
 */
export function lessonAfterLinesOf(
  result: Pick<LessonTurnResult, "ko" | "sound" | "attach"> & {
    cue?: LessonCueLine | null;
  },
): TalkLessonLine[] {
  return [
    ...(result.ko !== null ? [{ t: "ko", ko: result.ko } as const] : []),
    ...(result.cue ? [cueAddOf(result.cue)] : []),
    ...(result.sound.model !== undefined
      ? [{ t: "sound", kind: "model", say: result.sound.model } as const]
      : []),
    ...(result.sound.choices !== undefined
      ? [
          {
            t: "sound",
            kind: "choices",
            answers: result.sound.choices,
          } as const,
        ]
      : []),
    ...result.attach.map(attachLineOf),
  ];
}

/** 다시 흘림 · 뜻 찾기가 읽는 카드 칸(장면 여는 질문은 1~3단계 새 꼴 카드에만 있다). */
type LessonReplayCard = Pick<
  TalkLessonCard,
  "required" | "more" | "greeting"
> & {
  sceneOpener?: Pick<TalkSceneOpener, "question" | "easyQuestion"> | undefined;
};

/**
 * 카드에서 영어 질문의 뜻(이어 하기 · 같은 시도 id 다시 흘림 — 필수 질문 · 더 이야기할 거리 · 쉬운 질문 · 1~3단계 장면 여는 질문과 그 쉬운 질문
 * · 인사 질문).
 */
function questionKoIn(card: LessonReplayCard, en: string): string | undefined {
  for (const item of [...card.required, ...card.more]) {
    if (item.en === en) return item.ko;
    if (item.easyQuestion.en === en) return item.easyQuestion.ko;
  }
  // 장면 문장을 뺀 카드 줄(겹침 없애기 shownAttachOf — 카드 글의 뒤쪽 문장만 붙은 줄)은 같은 자리의 뜻 문장을 돌려준다
  for (const item of [...card.required, ...card.more]) {
    const ko = cardLineTailKoOf(item, en);
    if (ko !== undefined) return ko;
  }
  const scene = card.sceneOpener;
  if (scene?.question.en === en) return scene.question.ko;
  if (scene?.easyQuestion.en === en) return scene.easyQuestion.ko;
  if ("questions" in card.greeting)
    return card.greeting.questions.find((q) => q.question.en === en)?.question
      .ko;
  return undefined;
}

/**
 * 저장된 선생님 행 → 흘려 보낼 줄(같은 시도 id 다시 흘림 · AI 없음). 첫 줄은 선생님 문장, 그 뒤 화면 글 줄은 마무리 물음 · 물음표 줄(카드
 * 질문) · 그 밖(4단계부터 답 글)으로 가르고, 소리 줄은 move.sound 에서 읽는다(따라 할 말 · 선택지 → 받침 답 → 화면 글 줄 차례).
 */
export function lessonReplayLinesOf(
  row: Pick<TalkTurnRow, "text" | "toriKo" | "move">,
  ctx: {
    card: LessonReplayCard;
    koMeaning: boolean;
    /** 이 행의 신호 말(지난 선생님 행 move 로 다시 고른 것 — lessonCueOfRows). 없으면 null. */
    cue?: LessonCueLine | null;
    /**
     * 새 엔진 응답 행의 소리 줄(core leadRowSoundLinesOf — 고르기 물음 ask · 되묻는 차례의 kept 표지를 행에서 다시 만든 것, 실시간 길과 같은 줄).
     * 있으면 move.sound 대신 이 줄을 낸다. 지금 길 · 옛 행은 null.
     */
    leadSound?: readonly LeadSoundLine[] | null;
  },
): TalkLessonLine[] {
  const { aiPart, appended } = toriLinesOf(row.text);
  const move = readTalkMove(row.move);
  const out: TalkLessonLine[] = splitSentences(aiPart)
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .map((en) => ({ t: "s", en }) as const);
  if (row.toriKo) out.push({ t: "ko", ko: row.toriKo });
  if (ctx.cue) out.push(cueAddOf(ctx.cue));
  const sound = move?.sound;
  if (ctx.leadSound) out.push(...ctx.leadSound);
  else {
    if (sound?.model) out.push({ t: "sound", kind: "model", say: sound.model });
    if (sound?.choices)
      out.push({ t: "sound", kind: "choices", answers: [...sound.choices] });
    if (sound?.answer)
      out.push({ t: "sound", kind: "answer", say: sound.answer });
  }
  for (const en of appended) {
    if (en === MORE_PROMPT.en) {
      out.push({
        t: "add",
        kind: "more_prompt",
        en,
        ...(ctx.koMeaning ? { ko: MORE_PROMPT.ko } : {}),
      });
      continue;
    }
    if (isQuestionSentence(en)) {
      const ko = ctx.koMeaning ? questionKoIn(ctx.card, en) : undefined;
      out.push({ t: "add", kind: "question", en, ...(ko ? { ko } : {}) });
      continue;
    }
    out.push({ t: "add", kind: "answer", en });
  }
  return out;
}

/** 턴 끝 줄의 화면 몫(저장 뒤 다시 읽은 상태). */
export function lessonNextOf(
  state: Pick<
    TalkLessonState,
    "spec" | "card" | "turns" | "liveRows" | "segment" | "position" | "session"
  >,
  extra: { explanation?: string | null } = {},
): TalkLessonNext {
  const pos = state.position;
  const lastTeacher = state.turns.findLast((r) => r.speaker === "teacher");
  const prep =
    pos.prepPending && lastTeacher?.speaker === "teacher"
      ? (lastTeacher.move?.prep?.words ?? null)
      : null;
  return {
    segment: state.segment,
    greetingDone: pos.greetingDone,
    talkCount: pos.talkCount,
    choice: pos.choice,
    closingAsked: pos.closingAsked,
    moreRound: pos.moreRound,
    moreInRound: pos.moreInRound,
    targets: [...(pos.slot?.words ?? [])],
    hints: hintViewsOf(lessonHintsAt(state, pos.slot), isLowBand(state.spec)),
    ...(extra.explanation ? { explanation: extra.explanation } : {}),
    flashDontKnow: pos.flashDontKnow,
    silentBlocked: pos.silentBlocked,
    prep: prep ? [...prep] : null,
    firstQuestionDue: pos.firstQuestionDue,
    completed: state.session.status === "completed",
    stuckInSlot: pos.stuckInSlot,
    ...imageKeyField(lessonImageKeyOf(state, pos.slot?.item)),
    turnNo: state.liveRows.findLast((r) => r.speaker === "tori")?.turnNo ?? 0,
  };
}

const imageKeyField = (imageKey: string | undefined) =>
  imageKey === undefined ? {} : { imageKey };

/**
 * 이 차례 한국어 설명을 보일지(묶음 6 검토 8절 (다) · 02-2 263줄 · C195): '5-나'의 koExplanationShownOf 를 부른다(아이 쪽 막힘 차례에서
 * 같은 자리 막힘 수가 단계 규격 koExplainFromStuck 이상). 보이면 설명 글, 아니면 null(저장도 하지 않는다).
 */
export function lessonExplanationOf({
  spec,
  stuckInSlot,
  cause,
  explanation,
}: {
  spec: Parameters<typeof koExplanationShownOf>[0]["spec"];
  stuckInSlot: number;
  cause: TeacherTurnPlan["cause"];
  explanation: string;
}): string | null {
  if (!koExplanationShownOf({ spec, stuckInSlot, cause })) return null;
  return explanation.trim() === "" ? null : explanation;
}

/**
 * 정리 되짚을 말(쉬는 중 닫기 — 오늘 쓸 말 · 카드 정리 대사, C33). 문장 출처는 새 엔진 세션인가(isLeadSession — 처음 스냅숏 · 단계)로 고른다:
 * 지금 방식은 선생님 행의 되받은 말(recast), 새 엔진은 recast 칸이 비므로 앱이 확인한 따라 할 문장(core leadWrapRecastsOf — index.ts
 * lessonWrapSourcesOf 와 같은 판단 · 같은 출처, plan 확인할 것 9 · 검토 rev-s1 I-1).
 */
export function lessonWrapLinesOf(
  state: Pick<
    TalkLessonState,
    "rows" | "card" | "spec" | "lemmaOf" | "level"
  > & {
    start?: TalkLessonState["start"];
  },
): { en: string; ko?: string }[] {
  return wrapUpLinesOf({
    recasts: leadWrapRecastsOf({ ...state, start: state.start }),
    todayWords: state.card.todayWords.map((w) => w.word),
    closingLines: state.card.closingLines,
    koMeaning: state.spec.koMeaning,
    lemmaOf: state.lemmaOf,
  }).map(({ en, ko }) => ({ en, ...(ko === undefined ? {} : { ko }) }));
}

/**
 * 이 턴 아이 행의 '말했다' 낱말(3.4 · AC-9d — saidWordsOf). 회화 턴이 실패해 앱이 고른 한 줄로 닫힌 턴(응답 값 없음 — 8절 회화 턴 실패)과 말 입력이
 * 아닌 턴은 빈 목록이다(null 이 아님 — 통합 AC-15b).
 */
export function lessonSaidWordsOf(
  value: Pick<TalkLessonOutput, "self_used_words"> | null,
  ctx: {
    speech: boolean;
    heard: string;
    hintKind: TalkHintKind;
    unitWords: readonly string[];
    lemmaOf: (surface: string) => string | undefined;
    homophones: () => string[][];
  },
): string[] {
  if (value === null || !ctx.speech) return [];
  return saidWordsOf({
    aiWords: value.self_used_words,
    heard: ctx.heard,
    hintKind: ctx.hintKind,
    unitWords: ctx.unitWords,
    lemmaOf: ctx.lemmaOf,
    homophones: ctx.homophones(),
  });
}

/** 늦은 카드 답 판정 재료(talk_turns 행 → 선생님 행 move · 아이 행 인식 글). */
export function lateCardRowsOf(
  rows: readonly Pick<TalkTurnRow, "speaker" | "text" | "move">[],
): LateCardRow[] {
  return rows.map((row) =>
    row.speaker === "child"
      ? { speaker: "child", text: row.text ?? "" }
      : {
          speaker: "teacher",
          text: row.text ?? "",
          move: readTalkMove(row.move),
        },
  );
}

type TalkCallTurnLike = {
  afterCardChance?: boolean;
  segment: string;
  nextPart?: "prep" | "talk";
};

/**
 * 회화 턴 호출 입력의 마지막 손질(순수, 검토 rev-prompt-2 P3-4 — 서버 배선을 시험이 가르게 뺌): (1) 말로 답한 턴이 한두 턴 늦은 카드 답이면
 * (lesson-flow lateCardAnswerOf) '앞 차례가 카드 기회'로 둔다(대본 4회차 N-2 (a)). (2) 인사 끝 턴은 다음 토막을 알린다(인사 뒤 짧은 준비 계획이
 * 있으면 준비 — index.ts 의 준비 쪽지와 같은 판단, 02-2 169줄 · 분석 5.1 4).
 */
export function lessonCallTurnOf<T extends TalkCallTurnLike>(
  planned: T,
  ctx: {
    speech: boolean;
    rows: readonly LateCardRow[];
    child: string;
    lemmaOf: (surface: string) => string | undefined;
    prepPlanned: boolean;
  },
): T {
  const late =
    ctx.speech &&
    planned.afterCardChance !== true &&
    lateCardAnswerOf({
      rows: ctx.rows,
      child: ctx.child,
      lemmaOf: ctx.lemmaOf,
    });
  return {
    ...planned,
    ...(late ? { afterCardChance: true } : {}),
    ...(planned.segment === "greeting_end"
      ? {
          nextPart: ctx.prepPlanned ? ("prep" as const) : ("talk" as const),
        }
      : {}),
  };
}

/** 질문 다시 쓰기의 까닭(질문 검사 걸림 · 카드 답 뒤 카드 글 chain · 막힘을 무른 턴 stuck_overridden). */
export type QuestionRetryReason =
  | HeldQuestionFail["reason"]
  | "stuck_overridden";

/** 질문 다시 쓰기 한 번의 결과(부르는 쪽이 회화 턴을 다시 불러 만든다 — 흘려 받은 문장은 아이에게 보내지 않고 문장 문에만 넣는다). */
export type QuestionRetryAnswer = {
  value: TalkLessonOutput;
  entries: LessonSentence[];
  hintsBlocked: boolean;
  overLength: number;
  blocked: number;
  /** 다시 쓴 응답의 소리 줄을 앱 확인이 바꿨다(move.app 'model_line' — 검토 fix1 N-4). */
  soundFixed?: { model: boolean; choices: boolean };
};

/**
 * 질문 다시 쓰기를 부를 시간이 남았는가(검토 fix1 N-3): 받은 때부터 지난 시간 + 다시 부르기의 기다림 상한(AI_WAIT_TIMEOUT_MULTIPLE ×
 * ai.timeout_seconds.realtime) + 저장 여유(TURN_SAVE_GRACE_MS)가 회화 턴 끝점의 상한(TURN_IN_FLIGHT_MS — Route Handler maxDuration 과
 * 같은 값) 안이어야 한다. 넘으면 다시 쓰지 않고 지금처럼 카드 자리다.
 */
export function questionRetryFits({
  elapsedMs,
  timeoutMs,
}: {
  elapsedMs: number;
  timeoutMs: number;
}): boolean {
  return (
    elapsedMs + AI_WAIT_TIMEOUT_MULTIPLE * timeoutMs + TURN_SAVE_GRACE_MS <=
    TURN_IN_FLIGHT_MS
  );
}

/**
 * 1~3단계 AI 질문이 검사에 걸린 턴을 한 번 다시 쓰게 한다(13절 C203 (3) 잠정). 성공 응답이고 질문을 쓰는 차례이며 잡아 둔 질문이 길이 ·
 * 노리는 단어 · 범위 밖 낱말 · 형태 검사에 걸렸을 때만, 걸린 까닭 · 낱말 · 범위를 알려 retry 를 한 번 부른다(1회 상한 — 다시 부르지 않는다).
 * 다시 쓴 응답이 있고 질문이 있으면 앞 응답의 보낸 문장 뒤에 그 질문을 잇고, 아니면 앞 응답 그대로 둔다 — 끝 처리(settleLessonTurn)가 같은
 * 검사를 다시 해 걸리면 지금처럼 카드 자리로 바꾼다. 같은 질문 · 끊김 · 한 줄 길은 다시 쓰지 않는다. 받침 둘째의 AI 질문 자리가 예 · 아니요
 * 질문이 아닐 때와, 카드 답 바로 뒤 차례에 카드 필수 질문 글이 그대로 왔을 때(chainKeys)도 한 번 다시 쓰게 한다(13절 C217 (2) (ㄴ) · (ㄷ)).
 */
export async function withQuestionRetry({
  flow,
  view,
  lineOptions,
  sentenceMaxWords,
  canRetry = true,
  rewrite = null,
  chainKeys = [],
  retry,
}: {
  flow: Pick<LessonSentenceFlow, "entries" | "chosen">;
  view: LessonOutcomeView;
  lineOptions: LowLevelLineOptions | null;
  sentenceMaxWords: number;
  /**
   * 카드 답 바로 뒤 차례에 그대로 오면 안 되는 질문 열쇠(core talkCardChainKeysOf — 13절 C217 (2) (ㄷ)). 질문 검사를 지난 AI 질문이 이 열쇠와
   * 같으면(카드 필수 질문 글 그대로) 갈래 표지만 고치지 않고 한 번 다시 쓰게 한다. 그 차례가 아니면 빈 목록.
   */
  chainKeys?: readonly string[];
  /** 다시 부를 시간이 남았는가(questionRetryFits). 거짓이면 다시 쓰지 않는다. */
  canRetry?: boolean;
  /**
   * 막힘을 무른 턴(13절 C204 (3)): AI 가 막힘이라 했지만 앱이 무른 아이 말. 앞 응답 문장은 아무것도 보내지 않고 잡아 둔 채였다 — 통째로 다시 쓰게
   * 하고(stuckRewriteNoteOf), 못 하면 앞 응답 문장을 끝 처리가 내보내게 잡아 둔 문장으로 돌린다. null 이면 보통 턴이다.
   */
  rewrite?: { child: string } | null;
  retry: (ask: {
    previous: string;
    note: string;
    /**
     * 다시 쓰게 한 까닭(질문 검사 걸림 · chain · 막힘 무름 stuck_overridden) — 부르는 쪽이 ai_calls 표지에 남긴다(server/ai/talk
     * questionRetryTagOf, 코드 검토 rev-content-1 M-8).
     */
    reason: QuestionRetryReason;
  }) => Promise<QuestionRetryAnswer | null>;
}): Promise<{
  flow: Pick<LessonSentenceFlow, "entries" | "chosen">;
  view: LessonOutcomeView;
  retried: boolean;
}> {
  // 막힘을 무른 턴은 보낸 문장이 없다. 앞 응답은 막힘이라 보고 쓴 말이라(같이 말해 보자 · 답) 다시 쓰지 못하면 하나도 내보내지 않고, 끝 처리가
  // 카드 자리(카드 질문)로 차례를 잇게 한다 — 질문 없이 차례가 끝나지 않는다(검토 rev-prompt-2 B)
  const heldAll = (list: readonly LessonSentence[]): LessonSentence[] =>
    list.map((e) =>
      e.state === "dropped" ? { ...e } : { ...e, state: "held" as const },
    );
  const droppedAll = (list: readonly LessonSentence[]): LessonSentence[] =>
    list.map((e) => ({
      ...e,
      state: "dropped" as const,
      reason: "rewrite" as const,
    }));
  const fallback = {
    flow:
      rewrite === null
        ? flow
        : { entries: () => droppedAll(flow.entries()), chosen: flow.chosen },
    view:
      rewrite !== null && view.kind === "ok"
        ? { ...view, needsQuestion: true }
        : view,
    retried: false,
  };
  if (!canRetry || view.kind !== "ok" || lineOptions === null) return fallback;
  if (!asksQuestion(flow.chosen())) return fallback;
  const firstEntries =
    rewrite === null ? flow.entries() : heldAll(flow.entries());
  const targets = view.value.next_targets;
  let note: string;
  let reason: QuestionRetryReason;
  if (rewrite !== null) {
    note = stuckRewriteNoteOf(rewrite.child);
    reason = "stuck_overridden";
  } else {
    // lineOptions 가 있으면 1~3단계다 — 받침 둘째의 AI 질문 자리면 쉬운 질문 조건을 함께 본다(끝 처리와 같은 판정)
    const easySlot = lessonEasySlotOf(flow.chosen(), view.value, true);
    const fail = heldQuestionFailOf({
      entries: firstEntries,
      targets,
      options: { ...lineOptions, easySlot },
      chainKeys,
    });
    if (fail === null) return fallback;
    note = questionRetryNoteOf(fail, {
      sentenceMaxWords,
      targets,
      childWords: lineOptions.childWords,
      // 쉬운 질문 자리면 까닭과 관계없이 예 · 아니요 질문으로 다시 쓰게 한다(코드 검토 rev-content-1 M-1)
      easySlot: easySlot !== undefined,
    });
    reason = fail.reason;
  }
  let answer: QuestionRetryAnswer | null = null;
  try {
    answer = await retry({
      previous: firstEntries.map((e) => e.en).join(" "),
      note,
      reason,
    });
  } catch (error) {
    logFailure("회화 질문 다시 쓰기", error);
  }
  const retried = { ...fallback, retried: true };
  if (answer === null) return retried;
  const merged = mergeQuestionRetry({
    first: view.value,
    firstEntries,
    retry: answer.value,
    retryEntries: answer.entries,
    whole: rewrite !== null,
  });
  if (merged === null) return retried;
  const blocked = (view.blocked ?? 0) + answer.blocked;
  return {
    flow: {
      entries: () => merged.entries.map((e) => ({ ...e })),
      chosen: flow.chosen,
    },
    view: {
      kind: "ok",
      value: merged.value,
      hintsBlocked: answer.hintsBlocked,
      ...(answer.soundFixed ? { soundFixed: answer.soundFixed } : {}),
      overLength: view.overLength + answer.overLength,
      ...(blocked > 0 ? { blocked } : {}),
    },
    retried: true,
  };
}

/**
 * talk_turns 길이 초과(3.6 · 변경 spec 263줄): 선생님 문장 하나가 단계 낱말 수를 넘었거나(문장 문 셈) 한 차례 문장 수가 구간 상한
 * (talk.teacher_sentences_max.<구간>)을 넘었다(분석 A7). 막지 않고 기록만 한다.
 */
export function lessonOverLengthOf({
  words,
  sentences,
  max,
}: {
  words: number;
  sentences: number;
  max: number;
}): boolean {
  return words > 0 || sentences > max;
}

const lineOf = (
  line: { en: string; ko?: string | undefined },
  koMeaning: boolean,
): { en: string; ko?: string } => ({
  en: line.en,
  ...(koMeaning && line.ko !== undefined ? { ko: line.ko } : {}),
});

/**
 * 회화 턴 결과 → 끝 처리 꼴(8절 회화 턴 실패): 성공 · 첫 문장 뒤 끊김은 그대로, 거절(두 모델)은 카드 안전한 대사 한 줄, 그 밖의 실패
 * (두 번 실패 · 설정 · 하루 안전 상한)는 1~3단계면 카드 안전한 대사 한 줄(뜻 함께 — 턴 번호로 돌림, 카드 자리 · '말했다' 없음. 대본 회차 r1 판정
 * I-3 (나): 칭찬 대사는 시드에 뜻 칸이 없어 1~3단계 아이가 아무 글도 못 봤다), 4단계부터는 'Oops' 쉼(선생님 행 없음 — 세션은 진행으로 남아 같은
 * 시도 id 로 이어 한다, 4단계는 뜻 함께). 1~3단계 상황 차례(인사 끝 · 받침 · 들리지 않음)와 아이 말이 모름 꼴인 차례(failSituationPlaceOf)는
 * 거절 · 실패 모두 그 자리 상황 줄이다(spec 설계 1 대신 줄 행 · AC-1 (마) — 계획의 붙일 줄은 그대로, 인사 끝 뒤 카드 질문 없음).
 */
export function lessonOutcomeViewOf(
  outcome: TalkLessonOutcome,
  ctx: {
    low: boolean;
    koMeaning: boolean;
    safeLines: readonly { en: string; ko?: string | undefined }[];
    safeLine: string;
    turnNo: number;
    /** 1~3단계 상황 차례의 상황 줄(situationLineOf). 상황 차례가 아니거나 목록이 없으면 null. */
    situation?: TalkListLine | null;
  },
): LessonOutcomeView | { kind: "break"; line: { en: string; ko?: string } } {
  if (
    !outcome.ok &&
    outcome.reason !== "cut_after_first" &&
    ctx.low &&
    ctx.situation
  )
    return { kind: "line", line: cueLineView(ctx.situation, ctx.koMeaning) };
  if (outcome.ok)
    return {
      kind: "ok",
      value: outcome.value,
      hintsBlocked: outcome.hintsBlocked,
      ...(outcome.soundFixed ? { soundFixed: outcome.soundFixed } : {}),
      overLength: outcome.overLength,
      ...(outcome.blocked.length > 0
        ? { blocked: outcome.blocked.length }
        : {}),
    };
  if (outcome.reason === "cut_after_first")
    return { kind: "cut", overLength: outcome.overLength };
  if (outcome.reason === "refusal") {
    const safe = ctx.safeLines.find((l) => l.en === ctx.safeLine) ?? {
      en: ctx.safeLine,
    };
    return { kind: "line", line: lineOf(safe, true) };
  }
  if (ctx.low) {
    const en = safeLineOf(ctx.safeLines, ctx.turnNo);
    const safe = ctx.safeLines.find((l) => l.en === en) ?? { en };
    return { kind: "line", line: lineOf(safe, ctx.koMeaning) };
  }
  return {
    kind: "break",
    line: {
      en: TALK_BREAK_LINE.en,
      ...(ctx.koMeaning ? { ko: TALK_BREAK_LINE.ko } : {}),
    },
  };
}

// ── 서버 ─────────────────────────────────────────────────────────

export type LessonTurnDeps = TalkServerDeps & {
  /** 줄 하나를 브라우저로(Route Handler — 던지지 않는다). */
  write: (line: TalkLessonLine) => void;
  /** AI 를 부르기 직전에 한 번 — 구간마다 준비 시간(13절 C125 (4) · NFR-8). 아이 글은 들지 않는다. */
  onPrepTimings?: (timings: StageTimings) => void;
  /** 회화 1~3단계 시드 목록 넷(seedHomophones 꼴 — 없으면 seed/lists 를 읽는다, 시험이 바꾼다). */
  talkLists?: () => LessonTalkLists;
};

/** 회화 1~3단계 시드 목록 넷('AI 몫 넓힘' plan 정한 것 5 — 신호 말 · 상황 줄과 금지 구 · 허용 · 느낌 낱말 · 지어낸 경험 꼴). */
export type LessonTalkLists = {
  cue: TalkCueLinesFile;
  situation: TalkSituationLinesFile;
  allowed: TalkAllowedWordsFile;
  madeUp: readonly string[];
  /** 소리가 가까운 낱말(들은 글 귀띔 — 13절 C217 (1), 시드 sound-alikes). 없으면 빈 목록으로 본다(귀띔은 동음이의어만). */
  soundAlikes?: readonly SoundAlikeEntry[];
};

/** 시드 목록 넷을 읽는다(파일이 없으면 빈 목록 — seed-lists 의 경고 한 번). */
export function seedLessonTalkLists(): LessonTalkLists {
  return {
    cue: seedTalkCueLines(),
    situation: seedTalkSituationLines(),
    allowed: seedTalkAllowedWords(),
    madeUp: seedTalkMadeUpPhrases(),
    soundAlikes: seedSoundAlikes(),
  };
}

/**
 * 상황 차례 답 글 검사의 질문 글(spec 설계 1 말 검사 (나) — '그 질문 글(장면 문장 포함)'): 그 질문 자리를 연 선생님 행(opensSlot)부터 지금까지
 * 선생님 행의 화면 글을 잇는다(받침 둘째의 쉬운 질문 포함). 선생님 행이 없으면 빈 글.
 */
export function slotQuestionTextOf(turns: readonly TalkLessonTurn[]): string {
  const texts: string[] = [];
  for (let i = turns.length - 1; i >= 0; i--) {
    const row = turns[i];
    if (row?.speaker !== "teacher") continue;
    texts.unshift(row.text);
    if (opensSlot(row)) break;
  }
  return texts.join(" ");
}

/** 받침 · 들리지 않음 차례이고 답 예시가 있다(답 글 검사 — 기능어를 읽어야 한다). */
function answerCheckedPlan(plan: TeacherTurnPlan): boolean {
  const place = situationPlaceOf(plan);
  return place !== null && place !== "greeting_end" && !!plan.answerFallback;
}

/** 기능어(어휘 시드의 기능어 표시 — 소문자). 읽지 못하면 빈 모음(답 예시 낱말을 모두 내용어로 보아 더 걸린다)이고 오류 이름만 남긴다. */
async function readFunctionWords(db: Db): Promise<Set<string>> {
  try {
    const rows = await db
      .select({ word: vocab.word })
      .from(vocab)
      .where(arrayContains(vocab.partsOfSpeech, [FUNCTION_POS]));
    return new Set(rows.map((r) => r.word.toLowerCase()));
  } catch (error) {
    console.error(
      `회화 상황 차례 기능어를 읽지 못했다(${error instanceof Error ? error.name : "Error"})`,
    );
    return new Set();
  }
}

/**
 * 허용 낱말의 모든 단계 원형 찾기(컨트롤러 결정 (나) — 허용 목록은 원형만 담는데 범위 원형 표는 그 단계 이하 vocab 만 안다). 허용 낱말인 vocab 행의
 * 활용형(단계 무관)을 원형에 잇는다(허용 낱말 수만큼의 행). 읽지 못하면 null(규칙 꼬리 떼기로 대신)이고 오류 이름만 남긴다.
 */
async function readAllowedLemmaOf(
  db: Db,
  allowed: readonly string[],
): Promise<((surface: string) => string | undefined) | null> {
  if (allowed.length === 0) return null;
  try {
    const rows = await db
      .select({ word: vocab.word, forms: vocab.forms })
      .from(vocab)
      .where(inArray(vocab.word, [...allowed]));
    return allowedLemmaOfVocab(
      rows.map((r) => ({
        word: r.word,
        forms: Array.isArray(r.forms)
          ? r.forms.filter((f): f is string => typeof f === "string")
          : [],
      })),
      allowed,
    );
  } catch (error) {
    console.error(
      `회화 허용 낱말 원형을 읽지 못했다(${error instanceof Error ? error.name : "Error"})`,
    );
    return null;
  }
}

/** 1~3단계 선생님 행의 신호 말(같은 시도 id 다시 흘림 — 지난 선생님 행 move 로 다시 고른다, plan 정한 것 6). 마지막 선생님 행 몫이다. */
export function lessonCueOfRows(
  state: Pick<TalkLessonState, "level" | "turns"> & {
    spec: Pick<TalkLessonSpec, "koMeaning">;
  },
  lists: Pick<LessonTalkLists, "cue"> | null,
): LessonCueLine | null {
  const band = cueBandOf(state.level);
  if (band === null || lists === null) return null;
  const line = cueLinesOfMoves({
    moves: teacherMovesOf(state.turns),
    band,
    file: lists.cue,
  }).at(-1);
  return line ? cueLineView(line, state.spec.koMeaning) : null;
}

/** turn.ts 가 갈래 앞에서 함께 읽은 값(프로필 · 가림 · 설정 · 하루 안전 상한 확인 · 시간 재기). */
export type LessonTurnShared = {
  db: Db;
  profileId: string;
  masker: Masker;
  settings: Record<string, unknown>;
  at: Date;
  received: Date;
  restingP: Promise<boolean>;
  timer: { mark: (stage: string) => void; result: () => StageTimings };
};

/**
 * 새 엔진 수업의 아이 차례 뒤 선생님 차례 처리기(lead-turn.ts leadTurnAfterChild 꼴). 부르는 쪽(turn.ts runTalkTurnRequest)이 넘긴다 — 이
 * 파일은 lead-turn.ts 를 형으로도 값으로도 불러오지 않는다(의존 방향 검사 no-circular, 묶음 S1 CI 고침). 줄은 write 로 흘려 보내고 끝에 늘 끝
 * 줄 하나.
 */
export type LessonLeadAfterChild = (
  state: TalkLessonState,
  child: TalkTurnRow,
  deps: LessonTurnDeps,
  shared: LessonTurnShared,
  ctxP: ReturnType<typeof levelContextOf>,
) => Promise<void>;

const CHILD_SEGMENTS: readonly TalkSegment[] = [
  "greeting",
  "talk",
  "more_talk",
];

function logFailure(what: string, error: unknown) {
  if (error instanceof SettingMissingError)
    console.error(`${what} 실패(설정 ${error.key} 가 없습니다)`);
  else console.error(`${what} 실패(${dbErrorTag(error)})`);
}

type Begun =
  | { kind: "stale" }
  | { kind: "replay"; state: TalkLessonState; teacher: TalkTurnRow }
  | { kind: "call"; state: TalkLessonState; child: TalkTurnRow };

/**
 * 같은 시도 id 의 저장된 선생님 행을 다시 흘려 보낸다(AI 없음 — 신호 말은 지난 선생님 행 move 로 다시 고른다). 새 엔진 행(move.lead)은 앱이
 * 신호 말을 붙이지 않으므로(spec 설계 8) 저장한 행 그대로 실시간 길과 같은 줄을 낸다(검토 rev-s2 I-1 · 새 엔진 입구의 다시 흘림도 이 함수).
 */
export function replayLesson(
  state: TalkLessonState,
  teacher: TalkTurnRow,
  deps: Pick<LessonTurnDeps, "write" | "talkLists">,
) {
  const { write } = deps;
  const lists =
    cueBandOf(state.level) === null
      ? null
      : (deps.talkLists ?? seedLessonTalkLists)();
  for (const line of lessonReplayLinesOf(teacher, {
    card: state.card,
    koMeaning: state.spec.koMeaning,
    // 새 엔진 행은 신호 말을 붙이지 않는다(Claude 가 제 말로 안내 — spec 설계 8, 묶음 S2 확인할 것 1)
    cue: readTalkMove(teacher.move)?.lead
      ? null
      : lessonCueOfRows(state, lists),
    // 새 엔진 행은 고르기 물음 · 되묻는 차례의 표지까지 실시간 길과 같은 소리 줄(묶음 S5 — 행에서 다시 만듦)
    leadSound: leadRowSoundLinesOf({
      level: state.level,
      rows: state.liveRows,
      teacher,
    }),
  }))
    write(line);
  write({
    t: "end",
    lesson: lessonNextOf(state, { explanation: teacher.explanation }),
  });
}

/**
 * 대화 안전 상한 · 참여 완료 뒤 'AI 쉬는 중'으로 정리에 닫는다. 참여 완료 전이면(안전 상한만) 중단 + 학습일 + 이음매 aborted. 끝맺음 기록은
 * 그 까닭으로 대기에 두고, 넣었으면 참(응답 뒤 끝맺음은 부르는 쪽 — 쉬는 중이면 풀린 뒤 홈 진입이 부른다).
 */
async function closeLessonOnTurn(
  tx: Tx,
  state: TalkLessonState,
  { at, reason }: { at: Date; reason: "resting" | "safety" },
): Promise<boolean> {
  const aborted = state.session.status !== "completed";
  await tx
    .update(sessions)
    .set({
      talkSegment: "wrap_up",
      ...(aborted
        ? { status: "aborted" as const, learningDay: state.learningDay }
        : {}),
    })
    .where(eq(sessions.id, state.session.id));
  if (aborted)
    await onTalkSessionEnded(tx, {
      sessionId: state.session.id,
      profileId: state.profileId,
      ended: "aborted",
    });
  return insertClosingRecord(tx, { sessionId: state.session.id, at, reason });
}

/**
 * 새 꼴 아이 말 하나(정한 것 1 — turn.ts 가 새 꼴 카드 세션만 보낸다). 줄은 write 로 흘려 보낸다(던지지 않는다). 끝에 늘 끝 줄
 * (end · resting · break · close · stale · error) 하나.
 */
export async function runTalkLessonTurn(
  request: LessonTurnRequest,
  deps: LessonTurnDeps,
  shared: LessonTurnShared,
  leadAfterChild?: LessonLeadAfterChild,
): Promise<void> {
  const { write } = deps;
  const { db, profileId, masker, settings: s, at, timer } = shared;
  try {
    const begun: Begun = await db.transaction(async (tx): Promise<Begun> => {
      const state = await readTalkLessonState(tx, {
        sessionId: request.sessionId,
        profileId,
        lock: true,
        at,
      });
      if (!state || !isTalkOpen(state.session)) return { kind: "stale" };
      const own = state.rows.find(
        (r) =>
          r.speaker === "child" &&
          r.clientAttemptId === request.clientAttemptId,
      );
      if (own) {
        const teacher = state.rows.find(
          (r) => r.speaker === "tori" && r.turnNo === own.turnNo + 1,
        );
        if (teacher)
          return state.liveRows.at(-1)?.id === teacher.id
            ? { kind: "replay", state, teacher }
            : { kind: "stale" };
        if (state.orphan?.id !== own.id) return { kind: "stale" };
        if (
          await turnInFlight(tx, {
            sessionId: state.session.id,
            since: own.recordedAt,
            at,
            timeoutMs:
              (s["ai.timeout_seconds.realtime"] as number) * MS_PER_SECOND,
          })
        )
          return { kind: "stale" };
        return { kind: "call", state, child: own };
      }
      const pos = state.position;
      const lastTeacher = state.liveRows.at(-1);
      if (
        state.orphan ||
        pos.closed ||
        pos.lastRow !== "teacher" ||
        lastTeacher?.speaker !== "tori" ||
        pos.firstQuestionDue ||
        pos.prepPending ||
        !CHILD_SEGMENTS.includes(state.segment)
      )
        return { kind: "stale" };
      const fields = lessonChildRowOf(request, { state, masker });
      const prevChild = state.liveRows.findLast((r) => r.speaker === "child");
      if (prevChild && request.prevPerceivedWaitMs !== undefined)
        await tx
          .update(talkTurns)
          .set({ perceivedWaitMs: request.prevPerceivedWaitMs })
          .where(eq(talkTurns.id, prevChild.id));
      const [child] = await tx
        .insert(talkTurns)
        .values({
          sessionId: state.session.id,
          turnNo: lastTeacher.turnNo,
          segment: state.segment,
          clientAttemptId: request.clientAttemptId,
          speaker: "child",
          ...fields,
          ...(request.listenEndSeconds === undefined
            ? {}
            : { listenEndSeconds: request.listenEndSeconds }),
          ...(request.confirmSkipped === undefined
            ? {}
            : { confirmSkipped: request.confirmSkipped }),
          recordedAt: at,
        })
        .returning();
      if (!child) throw new Error("아이 행을 넣지 못했다");
      const delta = talkEnglishSentenceDelta(
        fields.inputMode,
        fields.text ?? "",
      );
      if (delta > 0)
        await tx
          .update(sessions)
          .set({
            englishSentences: sql`${sessions.englishSentences} + ${delta}`,
          })
          .where(eq(sessions.id, state.session.id));
      return { kind: "call", state, child };
    });
    if (begun.kind === "stale") {
      write({ t: "stale" });
      return;
    }
    if (begun.kind === "replay") {
      replayLesson(begun.state, begun.teacher, deps);
      return;
    }
    const { state, child } = begun;
    timer.mark("state");
    await lessonTurnAfterChild(state, child, deps, shared, leadAfterChild);
  } catch (error) {
    logFailure("회화 수업 턴 길", error);
    write({ t: "error" });
  }
}

async function lessonTurnAfterChild(
  state: TalkLessonState,
  child: TalkTurnRow,
  deps: LessonTurnDeps,
  shared: LessonTurnShared,
  leadAfterChild: LessonLeadAfterChild | undefined,
): Promise<void> {
  const { write } = deps;
  const { db, profileId, masker, settings: s, at, received, timer } = shared;
  const position = state.position;
  const revision = state.session.seedRevision ?? state.lessonRow.revision;
  const ctxP = levelContextOf(
    { area: "talk", level: state.level, unit: state.unit, revision },
    { db },
  );
  ctxP.catch(() => {});
  // 단원 목표 글(가변부 — 회화 plan 묶음 8 fix 1)은 단계 맥락과 함께 읽는다(서로 기대지 않음)
  const goalsP = readUnitGoalTexts(db, {
    level: state.level,
    unit: state.unit,
    revision,
  });
  goalsP.catch(() => {});
  const relock = (tx: Tx) =>
    readTalkLessonState(tx, {
      sessionId: state.session.id,
      profileId,
      lock: true,
      at,
    });

  // (4) 1-가 하루 안전 상한('AI 쉬는 중' 8절): 참여 완료 전이면 쉼(세션 진행 · 아이 행 남음 — 같은 시도 id 로 다시), 뒤면 정리로 닫고 끝맺음은 미룸
  if (await shared.restingP) {
    if (state.session.status !== "completed") {
      write({ t: "resting" });
      return;
    }
    const closed = await db.transaction(async (tx) => {
      const locked = await relock(tx);
      if (!locked || !isTalkOpen(locked.session)) return false;
      await closeLessonOnTurn(tx, locked, { at, reason: "resting" });
      return true;
    });
    if (!closed) {
      write({ t: "stale" });
      return;
    }
    write({
      t: "close",
      reason: "resting",
      lines: lessonWrapLinesOf(state),
      farewell: lineOf(state.card.farewell, state.spec.koMeaning),
    });
    return;
  }

  // (5) 대화 안전 상한(아이 턴 수 = 막힘 포함 전부 — a 회11 (14))
  const childTurns = position.childTurns + 1;
  const safetyMax = positiveInt(s, "talk.safety_max_turns");
  if (childTurns >= safetyMax) {
    const closed = await db.transaction(async (tx) => {
      const locked = await relock(tx);
      if (!locked || !isTalkOpen(locked.session)) return null;
      const inserted = await closeLessonOnTurn(tx, locked, {
        at,
        reason: "safety",
      });
      const reached = await safetyClosesOn(tx, {
        profileId,
        at,
        learningDay: locked.learningDay,
        timezone: locked.timezone,
        dayStartHour: locked.dayStartHour,
      });
      return { inserted, reached, learningDay: locked.learningDay };
    });
    if (!closed) {
      write({ t: "stale" });
      return;
    }
    const verdict = talkSafetyOf(
      { turns: childTurns, reachedToday: closed.reached },
      {
        safetyMaxTurns: safetyMax,
        safetyAlertCount: positiveInt(s, "talk.safety_alert_count"),
      },
    );
    if (verdict.alert)
      await createAlertOnce(db, {
        kind: SAFETY_ALERT_KIND,
        profileId,
        thresholdKey: SAFETY_ALERT_KEY,
        learningDay: closed.learningDay,
        value: { sessionId: state.session.id },
        createdAt: at,
        once: "day",
      });
    if (closed.inserted) scheduleTalkClosing(state.session.id, deps);
    write({
      t: "close",
      reason: "safety",
      farewell: lineOf(state.card.safetyFarewell, state.spec.koMeaning),
    });
    return;
  }

  // (5-1) 회화 Claude 주도 방식(spec 설계 1): 처음 스냅숏의 방식이 claude 이고 대화 토막이면 새 엔진의 턴 길로 간다(아래 지금 길은 그대로)
  // 처리기는 부르는 쪽이 넘긴다(위 LessonLeadAfterChild). 넘어오지 않았으면 지금 길로 조용히 가지 않고 던진다(프로그램 오류 — 바깥 잡기가 error 줄)
  if (leadTurnAppliesOf(state)) {
    if (!leadAfterChild)
      throw new Error("새 엔진 수업의 턴 처리기가 넘어오지 않았다");
    await leadAfterChild(state, child, deps, shared, ctxP);
    return;
  }

  // (6) 흐름 계획 → 호출 입력
  const mode = (child.inputMode ?? "speech") as TalkInputMode;
  const input = {
    mode,
    nospeech:
      (child.clientListen as { src?: unknown } | null)?.src === "nospeech",
  };
  // 이 대화의 아이 말(인식 글 — 이번 말을 끝에). 1~3단계는 아이가 먼저 답한 필수 질문을 남은 기회에서 빼고(판정 r1 I-2), 질문 검사가 아이
  // 말을 되묻는 질문을 건다(I-6). 4단계부터는 고치기 전 그대로다
  const childLines = childLinesOf(
    lateCardRowsOf(state.liveRows),
    mode === "speech" ? (child.text ?? "") : null,
  );
  const low = isLowBandLevel(state.level);
  // 1~3단계 시드 목록 넷 · 소리가 가까운 낱말 목록('AI 몫 넓힘' plan 2 행 · 13절 C217 (1))
  const lists = low ? (deps.talkLists ?? seedLessonTalkLists)() : null;
  // 상황 줄 · 예의 돌림 번호(이 선생님 차례 턴 번호 + 세션마다 다른 값 — 판정 r1 M-6)
  const rotationNo = situationRotationOf(child.turnNo + 1, state.session.id);
  // 알아듣기 재료 조립(core talkTurnWiringOf — 대본 도구와 같은 함수, 코드 검토 rev-content-1 I-3): 동음이의어 묶음(1~3단계 — 먼저 답한 필수
  // 질문 · 들은 글 귀띔 · 막힘 무름이 같은 묶음을 쓴다) · 먼저 답한 필수 질문 · 차례 계획 둘 · 아이가 답하던 질문 자리 · 귀띔 재료
  const wiring = talkTurnWiringOf({
    low,
    args: lessonArgsOf(state),
    lite: lessonChildLiteOf(position, input, state.settings),
    childText: mode === "speech" ? (child.text ?? "") : null,
    rows: lateCardRowsOf(state.liveRows),
    card: state.card,
    lemmaOf: state.lemmaOf,
    homophones: low ? (deps.homophones ?? seedHomophones)() : [],
    soundAlikes: lists?.soundAlikes ?? [],
  });
  const { args } = wiring;
  const { ifAnswered, ifStuck } = wiring.plans;
  if (!ifAnswered.callsAi || ifAnswered.kind === "none") {
    write({ t: "stale" });
    return;
  }
  // 설명 보이기 판정은 부르기 전에 한 번 본다(koExplainFromStuck 는 단계 규격 필수 칸 — 묶음 12 가 '5-나' 재검토 N-2 를 닫음)
  const positionAfter = (stuck: boolean) =>
    talkLessonPositionOf({
      ...args,
      turns: [
        ...args.turns,
        lessonChildLiteOf(position, input, state.settings, stuck),
      ],
    });
  const explainFor = (plan: TeacherTurnPlan, stuck: boolean, text: string) =>
    lessonExplanationOf({
      spec: state.spec,
      stuckInSlot: positionAfter(stuck).stuckInSlot,
      cause: plan.cause,
      explanation: text,
    });
  explainFor(ifAnswered, false, "");
  // 답 글 검사의 기능어('AI 몫 넓힘' plan 2 행 — 받침 · 들리지 않음 차례에 답 예시가 있을 때만 읽는다)
  const functionWordsP =
    low && [ifAnswered, ifStuck].some((p) => p !== null && answerCheckedPlan(p))
      ? readFunctionWords(db)
      : Promise.resolve(new Set<string>());
  // 허용 낱말 대조의 모든 단계 원형(상황 차례가 있을 때만 — 범위 읽기와 나란히)
  const allowedLemmaP =
    lists &&
    [ifAnswered, ifStuck].some(
      (p) => p !== null && situationPlaceOf(p) !== null,
    )
      ? readAllowedLemmaOf(db, lists.allowed.allowed)
      : Promise.resolve(null);

  const ctx = await ctxP;
  timer.mark("checks_context");
  let range: LessonRange;
  let rangeBroken = false;
  try {
    range = await lessonRangeOf(db, state, child.text ?? "");
  } catch (error) {
    // 검사하지 않은 AI 질문 · 소리 줄은 보이지 않는다 — 빈 범위로(질문은 모두 걸림 · 따라 할 말은 카드 글로) 오류 이름만 남긴다
    console.error(
      `회화 수업 질문 검사 재료를 읽지 못했다(${error instanceof Error ? error.name : "Error"})`,
    );
    range = emptyLessonRange(state);
    rangeBroken = true;
  }
  const planned = talkCallTurnOf({
    plan: ifAnswered,
    ifStuck,
    child: child.text ?? "",
    input: mode,
    hintKind: (child.hintKind ?? "none") as TalkHintKind,
    hintTier: child.hintLevel ?? 0,
    heardHelp: (child.heardHelp ?? "none") as TalkHeardHelp,
    // 1~3단계 'Child said more' 줄(느낌 낱말 · 원형 — 계획이 1~3단계일 때만 줄이 생긴다, 묶음 1 talkCallTurnOf)
    ...(lists ? { feelingWords: lists.allowed.feeling } : {}),
    lemmaOf: range.lemmaOf,
    // 1~3단계 상황 차례의 'Example line'(그 자리 예 하나 — 판정 r1 I-1 (가))
    exampleTurn: rotationNo,
    // 1~3단계 들은 글 귀띔(13절 C217 (1)) · 바로 앞 선생님 말의 첫 낱말(C217 보완) — 재료는 talkTurnWiringOf 가 조립한 것 그대로
    heard: wiring.heardOf(ctx.unitWords),
    lastStart: wiring.lastStart,
  });
  const turn = lessonCallTurnOf(planned, {
    speech: mode === "speech",
    rows: lateCardRowsOf(state.liveRows),
    child: child.text ?? "",
    lemmaOf: state.lemmaOf,
    prepPlanned: (state.start?.prepPlan.length ?? 0) > 0,
  });
  const summaryLimit = positiveInt(s, "talk.memory_summaries");
  const callInput = {
    ...(await talkLessonInputOf(db, {
      state,
      ctx,
      rowsBefore: state.liveRows,
      turn,
      summaryLimit,
      range,
      goalTexts: await goalsP,
    })),
    // 막힘 무름이 같은 소리로 들린 장면 낱말도 본다(1~3단계 — 4단계부터는 빈 객체라 고치기 전 그대로)
    ...wiring.callInput,
  };
  timer.mark("input");
  const sentUserMessage = talkLessonUserMessage(
    { ...callInput.turn, child: masker(callInput.turn.child).text },
    callInput.history.length === 0 && callInput.openingLine !== undefined
      ? { line: callInput.openingLine, teacherNameEn: callInput.teacher.nameEn }
      : undefined,
  );

  // (7) 회화 턴 — 문장 문을 지난 문장만 바로 보낸다. onSentence 는 던지지 않는다(a2 M1 계약)
  const lineOptions =
    low && !rangeBroken ? { ...lineOptionsOf(callInput), childLines } : null;

  const live: LessonLiveChecks | null = lists
    ? {
        cuePhrases: seedCuePhrasesOf(lists.cue),
        madeUp: lists.madeUp,
        situation: {
          options: lineOptions,
          allowed: new Set(lists.allowed.allowed),
          allowedLemmaOf: (await allowedLemmaP) ?? undefined,
          forbidden: lists.situation.forbidden,
          lines: lists.situation.lines,
          turnNo: rotationNo,
          question: slotQuestionTextOf(state.turns),
          spoken: teacherTextsOf(state.turns),
          repeat: true,
          functionWords: await functionWordsP,
        },
      }
    : null;
  // 들리지 않음 차례(1~3단계)는 앱이 판단한 기술 문제라 응답의 판단 칸을 읽지 않는다(spec 설계 1 응답 칸 행 · AC-1 (가))
  const notHeardLow = low && mode === "dont_know" && input.nospeech;
  const flow = createLessonSentenceFlow({
    low,
    ifAnswered,
    ifStuck,
    asked: position.askedQuestions,
    max: state.settings.sameQuestionMax,
    live,
  });
  const send = (en: string) => {
    try {
      write({ t: "s", en });
    } catch {
      // 브라우저 연결이 닫혀도 응답을 끝까지 받아 선생님 행을 저장한다
    }
  };
  const safeLine = lessonSafeLineOf(state, callInput.history.length + 1);
  // 앱이 막힘을 무른 1~3단계 턴의 잡아 두기(13절 C204 (3), child-kind createRewriteHold — 시도마다 덮어씀)
  const hold = createRewriteHold({ low, rangeOk: !rangeBroken });
  let outcome: TalkLessonOutcome;
  try {
    outcome = await talkLessonTurn(
      callInput,
      {
        profileId,
        sessionId: state.session.id,
        level: state.level,
        requestReceivedAt: received,
        safeLine,
        onPrepared: () => {
          timer.mark("ai_prep");
          deps.onPrepTimings?.(timer.result());
        },
        onStuck: (stuck, overridden) => {
          flow.stuck(stuck);
          // 앱이 막힘을 무른 1~3단계 질문 차례: 아직 보낸 문장이 없으면 이 응답 문장을 모두 잡아 두고 끝에서 통째로 다시 쓰게 한다
          hold.onStuck(overridden, asksQuestion(flow.chosen()));
        },
        onSentence: (en) => {
          if (hold.sends(flow.accept(en) === "send")) send(flow.lastText());
        },
      },
      { db, clock: deps.now, ...deps.ai },
    );
  } catch (error) {
    logFailure("회화 수업 턴", error);
    outcome = { ok: false, reason: "server", refusals: 0 };
  }

  // (8) 결과 → 선생님 행
  if (outcome.ok && notHeardLow)
    outcome = { ...outcome, value: heardFieldsBlankOf(outcome.value) };
  if (outcome.ok) flow.stuck(outcome.value.stuck);
  // 1~3단계 상황 차례가 두 번 실패 · 거절이면 칭찬 대사 · 안전한 대사 대신 상황 줄(spec 설계 1 대신 줄 행 · AC-1 (마))
  // 상황 차례가 아닌 1~3단계 턴이 실패하면 뜻이 있는 줄로 — 아이 말이 모름 꼴('Huh?')이면 쉬운 질문으로 넘어가는 상황 줄(판정 r1 I-3 (나)(다))
  // ('쉬운'을 약속하지 않는 줄 — 코드 검토 Minor 3, core failSituationLineOf)
  const viewOrBreak = lessonOutcomeViewOf(outcome, {
    low,
    koMeaning: state.spec.koMeaning,
    safeLines: state.card.safeLines,
    safeLine,
    turnNo: child.turnNo,
    situation:
      low && lists
        ? failSituationLineOf(
            lists.situation.lines,
            flow.chosen(),
            mode === "speech" ? (child.text ?? "") : null,
            rotationNo,
            teacherTextsOf(state.turns),
          )
        : null,
  });
  if (viewOrBreak.kind === "break") {
    write({ t: "break", ...viewOrBreak.line });
    return;
  }
  // (8-1) 걸린 1~3단계 AI 질문은 카드 자리로 바꾸기 전에 한 번 다시 쓰게 한다(13절 C203 (3)). 다시 쓴 응답의 문장은 아이에게 바로 보내지
  // 않고 새 문장 문에만 넣는다 — 끝 처리가 앞 응답의 반응 뒤에 그 질문을 잇는다. ai_calls 는 같은 목적(talk_turn)에 표지를 단다
  const retriedTurn = await withQuestionRetry({
    flow,
    view: viewOrBreak,
    lineOptions,
    sentenceMaxWords: callInput.sentenceMaxWords,
    canRetry: questionRetryFits({
      elapsedMs: deps.now().getTime() - received.getTime(),
      timeoutMs: (s["ai.timeout_seconds.realtime"] as number) * MS_PER_SECOND,
    }),
    rewrite: hold.holding() ? { child: child.text ?? "" } : null,
    // 카드 답 바로 뒤 차례의 카드 필수 질문 글(13절 C217 (2) (ㄷ))
    chainKeys: low ? talkCardChainKeysOf(callInput.turn, state.card) : [],
    retry: async ({ previous, note, reason }) => {
      const again = createLessonSentenceFlow({
        low,
        ifAnswered,
        ifStuck,
        asked: position.askedQuestions,
        max: state.settings.sameQuestionMax,
        live,
      });
      again.stuck(flow.stuckValue() === true);
      const answer = await talkLessonTurn(
        { ...callInput, retry: { previous, note } },
        {
          profileId,
          sessionId: state.session.id,
          level: state.level,
          // 다시 쓰기 행의 첫 문장 시간은 다시 부른 때부터 잰다(첫 호출 시간이 섞이지 않게, 검토 fix1 N-4)
          requestReceivedAt: deps.now(),
          safeLine,
          // 다시 쓴 까닭을 표지에 남긴다(question_retry.<까닭> — 코드 검토 rev-content-1 M-8)
          recordTag: questionRetryTagOf(reason),
          onSentence: (en) => {
            again.accept(en);
          },
        },
        { db, clock: deps.now, ...deps.ai },
      );
      if (!answer.ok) return null;
      return {
        value: answer.value,
        entries: again.entries(),
        hintsBlocked: answer.hintsBlocked,
        overLength: answer.overLength,
        blocked: answer.blocked.length,
        ...(answer.soundFixed
          ? {
              soundFixed: {
                model: answer.soundFixed.model,
                choices: answer.soundFixed.choices,
              },
            }
          : {}),
      };
    },
  });
  const view: LessonOutcomeView =
    notHeardLow && retriedTurn.view.kind === "ok"
      ? {
          ...retriedTurn.view,
          value: heardFieldsBlankOf(retriedTurn.view.value),
        }
      : retriedTurn.view;
  const settleFlow = retriedTurn.flow;
  const stuck = flow.stuckValue() === true && mode === "speech";
  const cueBand = cueBandOf(state.level);
  const turnsWithChild = [
    ...args.turns,
    lessonChildLiteOf(position, input, state.settings, stuck),
  ];
  const result = settleLessonTurn({
    flow: settleFlow,
    outcome: view,
    ctx: {
      card: state.card,
      turns: turnsWithChild,
      asked: position.askedQuestions,
      max: state.settings.sameQuestionMax,
      low,
      koMeaning: state.spec.koMeaning,
      dropped: [],
      spec: state.spec,
      lineOptions,
      live: lists
        ? {
            situationLines: lists.situation.lines,
            turnNo: rotationNo,
            cue: cueBand ? { file: lists.cue, band: cueBand } : null,
          }
        : null,
    },
  });
  for (const en of result.release) send(en);
  for (const line of lessonAfterLinesOf(result)) write(line);
  const value = view.kind === "ok" ? view.value : null;
  const explanation = value
    ? explainFor(result.plan, stuck, value.explanation)
    : null;
  const unitWords = ctx.unitWords;
  const said = lessonSaidWordsOf(value, {
    speech: mode === "speech",
    heard: child.text ?? "",
    hintKind: (child.hintKind ?? "none") as TalkHintKind,
    unitWords,
    lemmaOf: state.lemmaOf,
    homophones: () => (deps.homophones ?? seedHomophones)(),
  });
  // AI 가 쓴 선생님 문장 수(문장 문에 든 것 — 앱이 고른 한 줄 · 붙인 줄은 세지 않음)
  const overLength =
    view.kind !== "line" &&
    lessonOverLengthOf({
      words: view.overLength,
      sentences: settleFlow.entries().length,
      max: teacherSentencesMaxOf(s, state.level),
    });

  const saved = await db.transaction(async (tx) => {
    const locked = await relock(tx);
    if (!locked || !isTalkOpen(locked.session)) return undefined;
    const exists = locked.rows.some(
      (r) => r.speaker === "tori" && r.turnNo === child.turnNo + 1,
    );
    if (!exists) {
      await tx.insert(talkTurns).values({
        sessionId: state.session.id,
        turnNo: child.turnNo + 1,
        segment: child.segment,
        speaker: "tori",
        text: result.text,
        toriRewrite: result.rewrite,
        toriKo: result.ko,
        recast:
          value && mode === "speech" && value.recast !== ""
            ? value.recast
            : null,
        explanation,
        newWords: result.move.intro,
        missionChecks:
          value && value.mission_done.length > 0
            ? [...value.mission_done]
            : null,
        overLength,
        aiQuestion: result.aiQuestion,
        move: result.move,
        recordedAt: at,
      });
      await tx
        .update(talkTurns)
        .set({
          selfUsedWords:
            value && mode === "speech" ? value.self_used_words : [],
          saidWords: said,
          stuckPhrase: stuck ? (child.text ?? "") : null,
          sentUserMessage,
        })
        .where(eq(talkTurns.id, child.id));
      await writeSay(tx, {
        profileId,
        met: metWordsIn(result.text, { unitWords, lemmaOf: state.lemmaOf }),
        said,
        day: locked.learningDay,
        knownDays: snapshotNumber(locked, "talk.known_days"),
      });
      // 참여 완료 (1): 마무리 물음에 답한 턴(세션마다 한 번 — completeTalk 가 진행일 때만 바꾼다)
      const answered = talkLessonPositionOf({
        ...args,
        turns: turnsWithChild,
      }).closingAnswered;
      if (answered && !locked.position.closingAnswered)
        await completeTalk(tx, {
          state: locked,
          at,
          rules: {
            per: positiveInt(s, "talk.friendship_per_talk"),
            max: positiveInt(s, "talk.friendship_max"),
          },
        });
    }
    return readTalkLessonState(tx, {
      sessionId: state.session.id,
      profileId,
      at,
    });
  });
  if (!saved) {
    write({ t: "stale" });
    return;
  }
  write({ t: "end", lesson: lessonNextOf(saved, { explanation }) });
}

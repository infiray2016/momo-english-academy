import "server-only";
// 회화 턴 길(plan-p13b 파일별 값 2 — Route Handler POST /api/talk/turn 이 부른다, C92 NDJSON). 접근 확인은 부르는 Route Handler 의 첫 문장.
// (1) 입력 Zod → (2) 세션 행 FOR UPDATE(두 기기 줄 세움, 회18): 같은 시도 id 는 저장 결과를 다시 흘리거나(AI 없음) 토리의 말이 없으면
// AI 만 다시(8절 · AC-15f), 자리가 어긋나면 stale → (3) 아이 행 저장(보내기 전, 5절 — 이름 묻기 턴 가림 · 가림 · 힌트 종류 · 들은 도움 ·
// 노린 단어 · 처음/다시 · 목표 턴 안 · 단어 수 · 듣기 끝 · 확인 건너뜀 · 앞 행 체감 대기, 영어로 말한 문장 수 C41) → (4) 1-가 하루 안전 상한
// (C80 · a 회4) → (5) 대화 안전 상한(C90 · 3.3 · AC-15j) → (6) 회화 턴 입력 → (7) a talkTurn(문장마다 흘려 보냄 — onSentence 는 던지지
// 않는다) → (8) 결과(성공 · 첫 문장 뒤 끊김 · 실패 · 거절)마다 앱이 붙일 말 · 토리 행 · '말했다' · 만남 · 목표 턴 → 끝 줄.
// 알림 기준(하루 호출 · 비용)은 막지 않는다(AC-8b). 로그에는 오류 이름 · Postgres 코드만(아이 글 없음).
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  checkLowLevelAiQuestion,
  englishHintTiersOf,
  type TalkHeardHelp,
  type TalkHintKind,
  type TalkInputMode,
  type TalkOutput,
  talkUserMessage,
  toriRewriteOf,
} from "@/core/ai/calls/talk";
import { talkSafetyOf } from "@/core/ai/cost-alert";
import type { Masker } from "@/core/ai/mask";
import {
  type AiQuestionLite,
  type AppendLine,
  appendAfter,
  createAnswerHold,
  nextQuestionIsAi,
  nextUnusedQuestionNo,
  shownTurnOf,
  type TalkPosition,
  type TalkTurnLite,
  turnSegmentOf,
} from "@/core/conversation/flow";
import {
  type AiHints,
  heardHelpOf,
  hintKindOf,
  hintTiersOf,
  openedTierCount,
} from "@/core/conversation/hints";
import { maskNameAnswer } from "@/core/conversation/listen";
import {
  metWordsIn,
  saidWordsOf,
  talkEnglishSentenceDelta,
} from "@/core/conversation/said";
import { isQuestionSentence, safeLineOf } from "@/core/conversation/stream";
import {
  createStageTimer,
  type StageTimings,
} from "@/core/conversation/timing";
import type { TalkCard } from "@/core/seed/schema/talk";
import {
  AI_WAIT_TIMEOUT_MULTIPLE,
  PLACEHOLDER_NAME,
} from "@/core/seed/structure";
import type { FormRule } from "@/core/seed/text";
import { lemmaLookup } from "@/core/session/attempt";
import { vocab } from "@/db/schema/content";
import { sessions, talkTurns } from "@/db/schema/learning";
import { aiCalls } from "@/db/schema/operations";
import { type TalkOutcome, talkTurn } from "@/server/ai";
import { maskerFor } from "@/server/ai/run";
import { createAlertOnce } from "@/server/ai/store";
import { type Db, getDb, type Tx } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { readHouseholdProfile } from "@/server/profile";
import {
  getOutputCheckLists,
  loadSeedList,
  seedHomophones,
} from "@/server/seed-lists";
import { levelContextOf } from "@/server/session/ai-context";
import { aiRestingToday } from "@/server/session/ai-gate";
import { getSettings, SettingMissingError } from "@/server/settings";
import {
  insertClosingRecord,
  safetyClosesOn,
  scheduleTalkClosing,
} from "./closing";
import {
  CLIENT_ATTEMPT_ID_MAX,
  hintsOf,
  TALK_TEXT_MAX,
  wrapLinesOf,
} from "./index";
import {
  addLinesOf,
  appendEnOf,
  appendLinesFromText,
  isTalkOpen,
  liveLites,
  nextOf,
  onTalkSessionEnded,
  positionWith,
  positiveInt,
  reachTalkTarget,
  readTalkState,
  sentencesOf,
  snapshotNumber,
  type TalkLine,
  type TalkServerDeps,
  type TalkState,
  type TalkTurnRow,
  talkInputOf,
  toriLinesOf,
  toriTextOf,
  writeSay,
} from "./state";

/**
 * 같은 시도 id 의 회화 턴이 아직 진행 중으로 보는 시간(ms, 기술 값 — Route Handler maxDuration 60초와 같은 값. 그 처리기는 정적
 * 글자만 받아 여기서 가져갈 수 없다).
 */
export const TURN_IN_FLIGHT_MS = 60_000;
/** 마지막 회화 턴 호출이 끝난 뒤 토리 행 저장을 기다리는 짧은 여유(ms, 기술 값 — 호출 기록과 저장 사이 틈, 재검토 N-2). */
export const TURN_SAVE_GRACE_MS = 5000;
/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;
/** 힌트 단 수 상한(기술 값 — 단계 규격 단 수보다 넉넉히). */
const HINT_TIERS_MAX = 10;
/** 듣기 끝 대기 초 · 체감 대기 ms 상한(기술 값 — 꼴 검사). */
const LISTEN_END_MAX_SECONDS = 600;
const PERCEIVED_WAIT_MAX_MS = 600_000;
/** 4단계부터 회화 턴 두 번 실패의 말(a 정할 것 회9 — 정본 밖 문구 표). 4단계는 뜻을 함께. */
export const TALK_BREAK_LINE = {
  en: "Oops, I need a little break!",
  ko: "나 잠깐 쉬어야 해!",
} as const;
/** 대화 안전 상한 알림 종류 · 기준 키(3.3 · 8절 · AC-15j, P9c AI_ALERT_KINDS). */
const SAFETY_ALERT_KIND = "talk_safety_cap";
const SAFETY_ALERT_KEY = "talk.safety_alert_count";

const TurnRequestSchema = z.strictObject({
  sessionId: z.uuid(),
  clientAttemptId: z.string().min(1).max(CLIENT_ATTEMPT_ID_MAX),
  input: z.strictObject({
    mode: z.enum(["speech", "dont_know"]),
    text: z.string().max(TALK_TEXT_MAX).optional(),
    /** no-speech 로 넘어간 '모름'(화면의 말소리 없음 셈 — 서버는 받기만 한다). */
    nospeech: z.boolean().optional(),
  }),
  hint: z.strictObject({
    opened: z.int().min(0).max(HINT_TIERS_MAX),
    heard: z.array(z.enum(["two_answers", "answer_example"])).max(2),
  }),
  listenEndSeconds: z.number().min(0).max(LISTEN_END_MAX_SECONDS).optional(),
  confirmSkipped: z.boolean().optional(),
  prevPerceivedWaitMs: z.int().min(0).max(PERCEIVED_WAIT_MAX_MS).optional(),
});
export type TurnRequest = z.infer<typeof TurnRequestSchema>;

export type TurnDeps = TalkServerDeps & {
  /** 줄 하나를 브라우저로(Route Handler — 던지지 않는다). */
  write: (line: TalkLine) => void;
  /** 서버가 요청을 받은 때(첫 문장 시간의 시작, 6.1). */
  requestReceivedAt?: Date;
  /** AI 를 부르기 직전에 한 번 — 구간마다 준비 시간(13절 C125 (4) · NFR-8). 아이 글은 들지 않는다. */
  onPrepTimings?: (timings: StageTimings) => void;
};

const turnSettings = {
  "talk.safety_max_turns": z.unknown(),
  "talk.safety_alert_count": z.unknown(),
  "talk.memory_summaries": z.unknown(),
  "talk.friendship_per_talk": z.unknown(),
  "talk.friendship_max": z.unknown(),
  "ai.timeout_seconds.realtime": z.number().positive(),
} as Record<string, z.ZodType>;

function logFailure(what: string, error: unknown) {
  if (error instanceof SettingMissingError)
    console.error(`${what} 실패(설정 ${error.key} 가 없습니다)`);
  else console.error(`${what} 실패(${dbErrorTag(error)})`);
}

const wordsIn = (text: string) => text.trim().split(/\s+/).filter(Boolean);

// ── 아이 행(보내기 전) ────────────────────────────────────────────

/** 이름 묻기 턴(그 턴의 영어 문장 힌트 · 답 두 개 · 답 예시 가운데 {NAME} 을 든 틀)이면 {NAME} 자리를 바꾼다(6.1 · AC-16b). */
export function childTextOf(
  heard: string,
  pending: NonNullable<TalkPosition["pending"]>,
  masker: Masker,
): string {
  const templates = [
    pending.hintEn,
    pending.answerExample,
    ...(pending.twoAnswers ?? []),
  ].filter(
    (t): t is string => typeof t === "string" && t.includes(PLACEHOLDER_NAME),
  );
  const named =
    templates.length > 0 ? maskNameAnswer(heard, { templates }) : heard;
  return masker(named).text;
}

/** 아이 행 칸(5절 talk_turns 아이 행 — 보내기 전에 저장). */
export function childRowOf(
  request: TurnRequest,
  ctx: {
    state: Pick<TalkState, "spec" | "card" | "position">;
    masker: Masker;
  },
): {
  text: string | null;
  inputMode: TalkInputMode;
  hintKind: TalkHintKind;
  hintLevel: number;
  heardHelp: Exclude<TalkHeardHelp, "none"> | null;
  targetWords: string[];
  askKind: "first" | "re_ask";
  withinTarget: boolean;
  wordCount: number;
} {
  const { state } = ctx;
  const position = state.position;
  const pending = position.pending;
  if (!pending) throw new RangeError("아이 차례가 아니다");
  const tiers = hintsOf(state, position);
  const opened = openedTierCount({
    tiers,
    pressed: request.hint.opened,
    dontKnowCount: position.dontKnowCount,
  });
  const heard = [...new Set(request.hint.heard)];
  const mode = request.input.mode;
  const raw = request.input.text?.trim() ?? "";
  const text =
    mode === "dont_know" ? null : childTextOf(raw, pending, ctx.masker);
  const help = heardHelpOf(heard);
  return {
    text,
    inputMode: mode,
    hintKind: hintKindOf({ opened: tiers.slice(0, opened), heard }),
    hintLevel: opened,
    heardHelp: help === "none" ? null : help,
    targetWords: [...pending.targets],
    askKind: pending.askKind,
    withinTarget: position.segment !== "more_talk" && !position.targetReached,
    wordCount: text === null ? 0 : wordsIn(text).length,
  };
}

// ── 결과 → 토리 행(순수) ─────────────────────────────────────────

export type ToriPlan =
  | {
      kind: "row";
      /** 브라우저에 아직 보내지 않은 토리 말(실패 길 칭찬 대사 · 거절 안전한 대사). */
      speak: string[];
      /** 다시 쓸 토리 차례 · 원문 첫 줄(검사를 지난 영어 문장, 실패 길의 대신 말 포함). */
      sentSentences: string[];
      ko: string | null;
      /** 저장할 토리 반응 뜻(1~3단계만 — 이어 하기 · 다시 흘림에서 다시 낸다, C103). */
      toriKo: string | null;
      append: AppendLine[];
      cardQuestionNo: number | null;
      aiQuestion: AiQuestionLite | null;
      aiHints: AiHints | undefined;
      recast: string | null;
      explanation: string | null;
      newWords: string[];
      missionChecks: number[] | null;
      overLength: boolean;
      selfUsed: string[];
      said: string[];
      stuck: boolean;
      /** 이 아이 행을 넣은 뒤의 자리. */
      after: TalkPosition;
    }
  | { kind: "break"; line: { en: string; ko?: string } };

export type ToriPlanContext = {
  state: Pick<
    TalkState,
    | "spec"
    | "card"
    | "start"
    | "flowSettings"
    | "segment"
    | "liveRows"
    | "lemmaOf"
  > & { unitWords: readonly string[] };
  lites: readonly TalkTurnLite[];
  child: Pick<TalkTurnRow, "turnNo" | "text" | "hintKind" | "segment"> & {
    inputMode: TalkInputMode;
    targetWords: string[];
  };
  homophones: readonly (readonly string[])[];
  /** 1~3단계 AI 질문 검사(a checkLowLevelAiQuestion). 없으면 AI 질문을 쓰지 않는다. */
  checkAiQuestion?: (value: TalkOutput) => boolean;
};

const childLiteOf = (
  child: ToriPlanContext["child"],
  stuck: boolean,
): TalkTurnLite => ({
  speaker: "child",
  segment:
    child.segment === "more_talk"
      ? "more_talk"
      : child.segment === "greeting"
        ? "greeting"
        : "talk",
  input: child.inputMode,
  stuck,
  targets: [...child.targetWords],
});

/**
 * 회화 턴 결과 → 토리 행 n+1 의 재료(값 2 (8) · 8절 '회화 턴 실패'). 성공: 1~3단계 앱이 붙일 말(AI 자리의 AI 질문은 검사를 지날 때만 —
 * 아니면 '더 이야기할 거리' 가운데 가장 오래전에 쓴 것, AC-15i). 첫 문장 뒤 끊김: 같은 질문을 되풀이하지 않고 다음 카드 질문(4단계부터는
 * 보낸 문장에 물음표 문장이 없을 때만 아직 쓰지 않은 가장 앞 카드 질문 · 그 번호), '말했다' 없음. 실패(첫 문장 전): 1~3단계 카드 칭찬
 * 대사 + 다음 카드 질문, 4단계부터 'Oops' 쉼(토리 행 없음). 거절: 카드 안전한 대사 + 다음 질문(대화 이어 감).
 */
export function toriPlanOf(
  outcome: TalkOutcome,
  ctx: ToriPlanContext,
): ToriPlan {
  const { state, child } = ctx;
  const { spec, card } = state;
  const turnsShape = spec.cardShape === "turns";
  const turnNo = child.turnNo;
  const base = {
    toriKo: null,
    aiQuestion: null,
    aiHints: undefined,
    recast: null,
    explanation: null,
    newWords: [] as string[],
    missionChecks: null,
    overLength: false,
    selfUsed: [] as string[],
    said: [] as string[],
    stuck: false,
  };
  const afterOf = (stuck: boolean) =>
    positionWith(state, [...ctx.lites, childLiteOf(child, stuck)]);

  if (outcome.ok) {
    const v = outcome.value;
    const after = afterOf(v.stuck);
    let ai: AiQuestionLite | null = null;
    const slot = after.pending;
    if (
      turnsShape &&
      slot?.source === "ai_more_talk" &&
      slot.en === undefined &&
      !outcome.hintsBlocked &&
      v.next_question_en.trim() !== "" &&
      ctx.checkAiQuestion?.(v) === true
    )
      ai = {
        en: v.next_question_en.trim(),
        ko: v.next_question_ko.trim(),
        answerExample: v.next_answer_example.trim(),
        ...(v.next_hint_ko.trim() === ""
          ? {}
          : { hintKo: v.next_hint_ko.trim() }),
        ...(v.next_hints.length > 0 ? { hints: [...v.next_hints] } : {}),
      };
    const append = appendAfter({
      spec,
      card,
      after,
      outcome: "ok",
      turnNo,
      ai,
    });
    const hasHints =
      v.next_hint_ko !== "" ||
      v.next_hints.length > 0 ||
      v.next_usable_phrases.length > 0;
    const hintKind = (child.hintKind ?? "none") as TalkHintKind;
    return {
      kind: "row",
      speak: [],
      sentSentences: [...outcome.sentSentences],
      ko: spec.koMeaning && v.tori_ko !== "" ? v.tori_ko : null,
      toriKo:
        turnsShape && spec.koMeaning && v.tori_ko !== "" ? v.tori_ko : null,
      append,
      // 인사 토막의 토리 행은 카드 질문을 가리키지 않는다(대화 첫 질문 1번은 앱이 붙이고 흐름이 스스로 넣는다 — a fix 1 M6)
      cardQuestionNo:
        turnsShape || child.segment === "greeting" ? null : v.card_question_no,
      aiQuestion: ai,
      aiHints:
        !turnsShape && !outcome.hintsBlocked && hasHints
          ? {
              hintKo: v.next_hint_ko,
              hints: [...v.next_hints],
              usable: [...v.next_usable_phrases],
            }
          : undefined,
      recast: v.recast === "" ? null : v.recast,
      explanation: v.explanation === "" ? null : v.explanation,
      newWords: [...v.new_words],
      missionChecks: v.mission_done.length > 0 ? [...v.mission_done] : null,
      overLength: outcome.overLength > 0,
      selfUsed: [...v.self_used_words],
      said:
        child.inputMode === "speech"
          ? saidWordsOf({
              aiWords: v.self_used_words,
              heard: child.text ?? "",
              hintKind,
              unitWords: state.unitWords,
              lemmaOf: state.lemmaOf,
              homophones: ctx.homophones,
            })
          : [],
      stuck: v.stuck,
      after,
    };
  }

  const after = afterOf(false);
  if (outcome.reason === "cut_after_first") {
    const sentHasQuestion = outcome.sentSentences.some(isQuestionSentence);
    const append = appendAfter({
      spec,
      card,
      after,
      outcome: "cut",
      turnNo,
      sentHasQuestion,
    });
    const cardQuestionNo = turnsShape
      ? null
      : append.some((l) => l.kind === "question")
        ? (nextUnusedQuestionNo(after, card) ?? 0)
        : 0;
    return {
      kind: "row",
      ...base,
      speak: [],
      sentSentences: [...outcome.sentSentences],
      ko: null,
      toriKo: null,
      append,
      cardQuestionNo,
      overLength: outcome.overLength > 0,
      after,
    };
  }

  if (outcome.reason === "refusal") {
    // 문장 검사의 걸린 자리와 같은 고르기(a safeLineOf — 검토 M-7)
    const safeEn = safeLineOf(card.safeLines, turnNo);
    const safe = card.safeLines.find((l) => l.en === safeEn) ?? { en: safeEn };
    const append = turnsShape
      ? appendAfter({ spec, card, after, outcome: "ok", turnNo })
      : appendAfter({
          spec,
          card,
          after,
          outcome: "cut",
          turnNo,
          sentHasQuestion: isQuestionSentence(safe.en),
        });
    return {
      kind: "row",
      ...base,
      speak: [safe.en],
      sentSentences: [safe.en],
      ko: spec.koMeaning && safe.ko !== undefined ? safe.ko : null,
      toriKo:
        turnsShape && spec.koMeaning && safe.ko !== undefined ? safe.ko : null,
      append,
      cardQuestionNo: turnsShape
        ? null
        : append.some((l) => l.kind === "question")
          ? (nextUnusedQuestionNo(after, card) ?? 0)
          : 0,
      after,
    };
  }

  // 첫 문장 전 실패(다시 불러도 실패 · 설정 문제 · 하루 안전 상한 · 그 밖)
  if (!turnsShape)
    return {
      kind: "break",
      line: {
        en: TALK_BREAK_LINE.en,
        ...(spec.koMeaning ? { ko: TALK_BREAK_LINE.ko } : {}),
      },
    };
  const append = appendAfter({
    spec,
    card,
    after,
    outcome: "failed",
    turnNo,
  });
  return {
    kind: "row",
    ...base,
    speak: [],
    sentSentences: [],
    ko: null,
    append,
    cardQuestionNo: null,
    after,
  };
}

// ── 턴 길 ────────────────────────────────────────────────────────

type Begun =
  | { kind: "stale" }
  | { kind: "replay"; state: TalkState; tori: TalkTurnRow }
  | { kind: "call"; state: TalkState; child: TalkTurnRow };

/**
 * 같은 시도 id 의 고아 아이 행이 아직 진행 중인가(검토 M-1 · 재검토 N-2 · P-1): TURN_IN_FLIGHT_MS 안이고, 그 아이 행 뒤 회화 턴 호출 기록이
 * 없거나, 마지막 호출이 끝난 지(called_at + latency_ms) TURN_SAVE_GRACE_MS 가 안 됐으면(토리 행 저장이 곧 온다) 참. 마지막 호출이 실패면
 * 한 요청 안 다시 시도(첫 문장 전 연결 · 타임아웃 · 거절 — 기록은 시도가 끝난 뒤 남는다)가 아직 돌 수 있어, 그 요청의 기다림 상한(첫 호출 +
 * AI_WAIT_TIMEOUT_MULTIPLE × ai.timeout_seconds.realtime)에 저장 여유를 더한 때까지도 참이다.
 */
async function turnInFlight(
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

/** 1~3단계 AI 질문 검사 재료(어휘 범위 · 형태 표). 형태 표가 없으면 AI 질문을 쓰지 않는다(검사하지 않은 글을 보이지 않음). */
async function aiQuestionCheckOf(
  db: Db,
  state: TalkState,
  sentenceMaxWords: number,
  unitWords: readonly string[],
): Promise<((value: TalkOutput) => boolean) | undefined> {
  if (state.spec.cardShape !== "turns") return undefined;
  let forms: FormRule[];
  let introduced: { id: string; at: { level: number; unit: number } | null }[];
  try {
    const file = loadSeedList("forms");
    forms = file.forms;
    introduced = file.forms.map((f) => ({ id: f.id, at: f.introducedAt.rst }));
  } catch (error) {
    // 검사하지 않은 AI 질문은 쓰지 않는다 — 소리 없이 사라지지 않게 오류 이름만 남긴다(검토 M-2)
    console.error(
      `회화 AI 질문 검사: 형태 표를 읽지 못했다(${error instanceof Error ? error.name : "Error"})`,
    );
    return () => false;
  }
  const allowedForms = new Set(
    introduced
      .filter(
        ({ at }) =>
          at !== null &&
          (at.level < state.level ||
            (at.level === state.level && at.unit <= state.unit)),
      )
      .map(({ id }) => id),
  );
  // 어휘 범위: 그 단계 이하 vocab 낱말(P9c allowedWordsOf 와 같은 범위) — 원형은 그 낱말들의 활용형까지(기능어 is → be)
  const rows = await db
    .select({ word: vocab.word, forms: vocab.forms })
    .from(vocab)
    .where(lte(vocab.bandLevel, state.level));
  const allowedWords = new Set(rows.map((r) => r.word.toLowerCase()));
  const rangeLemma = lemmaLookup(
    rows.map((r) => ({
      word: r.word,
      forms: Array.isArray(r.forms)
        ? r.forms.filter((f): f is string => typeof f === "string")
        : [],
    })),
  );
  return (value) =>
    checkLowLevelAiQuestion(value, {
      englishTiers: englishHintTiersOf(state.spec),
      sentenceMaxWords,
      allowedWords,
      unitWords,
      lemmaOf: (surface) => state.lemmaOf(surface) ?? rangeLemma(surface),
      forms,
      allowedForms,
    }).ok;
}

/** 정리로 닫는다(1-가 안전 상한 목표 턴 뒤 · 대화 안전 상한). 목표 턴 전이면 중단 + 학습일 + 이음매. */
async function closeOnTurn(
  tx: Tx,
  state: TalkState,
  { at, reason }: { at: Date; reason: "resting" | "safety" },
): Promise<boolean> {
  const aborted = !state.position.targetReached;
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

/** 같은 시도 id 의 저장된 토리 행을 다시 흘려 보낸다(AI 없음). */
function replay(state: TalkState, tori: TalkTurnRow, write: TurnDeps["write"]) {
  const { aiPart, appended } = toriLinesOf(tori.text);
  // 저장 글은 그대로, 읽고 보이는 글은 같은 말을 뺀 것(C125 (3))
  const shown = shownTurnOf(
    sentencesOf(aiPart),
    appendLinesFromText(appended, {
      card: state.card,
      pending: state.position.pending,
      koMeaning: state.spec.koMeaning,
    }),
  );
  for (const en of shown.sentences) write({ t: "s", en });
  if (tori.toriKo) write({ t: "ko", ko: tori.toriKo });
  for (const line of addLinesOf(shown.append)) write(line);
  write({
    t: "end",
    next: nextOf(state.position, {
      spec: state.spec,
      hints: hintsOf(state, state.position),
    }),
  });
}

/**
 * 아이 말 하나(값 2). 줄은 write 로 흘려 보낸다(던지지 않는다). 끝에 늘 끝 줄(end · resting · break · close · stale · error) 하나.
 */
export async function runTalkTurnRequest(
  raw: unknown,
  deps: TurnDeps,
): Promise<void> {
  const { write } = deps;
  const parsed = TurnRequestSchema.safeParse(raw);
  if (!parsed.success) {
    write({ t: "error" });
    return;
  }
  const request = parsed.data;
  const db: Db = deps.db ?? getDb();
  const received = deps.requestReceivedAt ?? deps.now();
  // 구간마다 준비 시간(C125 (4)) — 차례로 기다리던 읽기는 서로 기대지 않는 것끼리 함께 돌린다
  const timer = createStageTimer(() => performance.now());
  try {
    const profile = await readHouseholdProfile({ db });
    timer.mark("profile");
    if (!profile) {
      write({ t: "error" });
      return;
    }
    const profileId = profile.id;
    const contact = getOutputCheckLists()
      .forbidden.patterns.filter((p) => p.category === "contact")
      .map((p) => p.regex);
    const [masker, s] = await Promise.all([
      maskerFor(db, profileId, contact),
      getSettings(turnSettings, { db, profileId }),
    ]);
    timer.mark("masker_settings");
    const at = deps.now();
    // 1-가 하루 안전 상한 확인은 세션 행 잡기와 함께 시작한다(서로 기대지 않음 — 결과는 (4) 에서 씀). 일찍 끝나는 길에서도 놓친
    // 거절이 남지 않게 받아 둔다
    const restingP = aiRestingToday({ profileId, at }, { db });
    restingP.catch(() => {});

    // (2) · (3) 세션 행을 잡고 자리를 본 뒤 아이 행을 넣는다
    const begun: Begun = await db.transaction(async (tx): Promise<Begun> => {
      const state = await readTalkState(tx, {
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
        const tori = state.rows.find(
          (r) => r.speaker === "tori" && r.turnNo === own.turnNo + 1,
        );
        if (tori)
          return state.liveRows.at(-1)?.id === tori.id
            ? { kind: "replay", state, tori }
            : { kind: "stale" };
        if (state.orphan?.id !== own.id) return { kind: "stale" };
        // 같은 시도 id 가 겹쳐 왔다(첫 요청이 아직 회화 턴을 기다리는 중): 그 아이 행 뒤 회화 턴 호출 기록이 없고 아직
        // TURN_IN_FLIGHT_MS 안이면 AI 를 다시 부르지 않는다(검토 M-1 — 화면이 잠깐 뒤 자료를 다시 읽음)
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
      const position = state.position;
      const lastTori = state.liveRows.at(-1);
      if (
        state.orphan ||
        !position.pending ||
        position.awaitingChoice ||
        lastTori?.speaker !== "tori" ||
        !["greeting", "talk", "more_talk"].includes(state.segment)
      )
        return { kind: "stale" };
      const fields = childRowOf(request, { state, masker });
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
          turnNo: lastTori.turnNo,
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
      replay(begun.state, begun.tori, write);
      return;
    }
    const { state, child } = begun;
    const position = state.position;
    timer.mark("state");
    // (6) 의 단계 맥락은 (4) · (5) 확인과 함께 읽는다(서로 기대지 않음)
    const ctxP = levelContextOf(
      {
        area: "talk",
        level: state.level,
        unit: state.unit,
        revision: state.session.seedRevision ?? state.lessonRow.revision,
      },
      { db },
    );
    ctxP.catch(() => {});

    // (4) 1-가 하루 안전 상한(a 회4): 목표 턴 전이면 쉼(세션 진행 · 아이 행 남음), 목표 턴 뒤면 정리로 닫고 끝맺음은 미룸
    if (await restingP) {
      if (!position.targetReached) {
        write({ t: "resting" });
        return;
      }
      const closed = await db.transaction(async (tx) => {
        const locked = await readTalkState(tx, {
          sessionId: state.session.id,
          profileId,
          lock: true,
          at,
        });
        if (!locked || !isTalkOpen(locked.session)) return false;
        await closeOnTurn(tx, locked, { at, reason: "resting" });
        return true;
      });
      if (!closed) {
        write({ t: "stale" });
        return;
      }
      write({
        t: "close",
        reason: "resting",
        lines: wrapLinesOf(state).map(({ en, ko }) => ({
          en,
          ...(ko === undefined ? {} : { ko }),
        })),
        farewell: lineOf(state.card.farewell, state.spec.koMeaning),
      });
      return;
    }

    // (5) 대화 안전 상한(아이 턴 수 = '모름' 포함 전부 — a 회11 (14))
    const childTurns = position.childTurns + 1;
    const safetyMax = positiveInt(s, "talk.safety_max_turns");
    if (childTurns >= safetyMax) {
      const closed = await db.transaction(async (tx) => {
        const locked = await readTalkState(tx, {
          sessionId: state.session.id,
          profileId,
          lock: true,
          at,
        });
        if (!locked || !isTalkOpen(locked.session)) return null;
        const inserted = await closeOnTurn(tx, locked, {
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

    // (6) 회화 턴 입력
    const ctx = await ctxP;
    timer.mark("checks_context");
    const lites = liveLites(state);
    const mode = (child.inputMode ?? "speech") as TalkInputMode;
    const flowArgs = {
      spec: state.spec,
      card: state.card,
      metBefore: state.start?.metBefore ?? [],
      turns: lites,
      segment: state.segment,
      settings: state.flowSettings,
    };
    const childTargets = [...(child.targetWords ?? [])];
    const afterBase = positionWith(state, [
      ...lites,
      childLiteOf(
        {
          turnNo: child.turnNo,
          text: child.text,
          hintKind: child.hintKind,
          segment: child.segment,
          inputMode: mode,
          targetWords: childTargets,
        },
        false,
      ),
    ]);
    const input = await talkInputOf(db, {
      state,
      ctx,
      rowsBefore: state.liveRows,
      turn: {
        child: child.text ?? "",
        input: mode,
        segment: turnSegmentOf(position, mode, state.flowSettings),
        hintKind: (child.hintKind ?? "none") as TalkHintKind,
        hintTier: child.hintLevel ?? 0,
        heardHelp: (child.heardHelp ?? "none") as TalkHeardHelp,
        dontKnowCount:
          mode === "dont_know"
            ? position.dontKnowCount + 1
            : position.dontKnowCount,
        targetReached: afterBase.awaitingChoice,
        closing: false,
        levelTest: false,
        moreTalkUsedUp: position.moreTalkUsedUp,
        aiQuestionSlot: nextQuestionIsAi(flowArgs, mode),
      },
      summaryLimit: positiveInt(s, "talk.memory_summaries"),
    });
    timer.mark("input");
    const sentUserMessage = talkUserMessage(
      { ...input.turn, child: masker(input.turn.child).text },
      input.history.length === 0 ? input.openingLine : undefined,
    );

    // 답 두 개를 담은 토리 문장은 읽고 보이는 글에서 빠진다(C125 (3)). 그 답을 담은 문장부터는 계획이 정해질 때까지 잡아 둔다.
    // 잡아 둘 짝은 앱이 붙일 답 두 개 — '모름' 입력이거나 막힘 판단(tori_en 앞 칸 stuck) 참이면 지금 질문을 다시 묻는 자리, 아니면
    // 다음 질문 자리(C127). '모름' 입력은 그 자리가 곧 afterBase 다
    const pairOf = (p: TalkPosition) =>
      p.awaitingChoice ? undefined : p.pending?.twoAnswers;
    const stuckAfter =
      mode === "dont_know"
        ? afterBase
        : positionWith(state, [
            ...lites,
            childLiteOf(
              {
                turnNo: child.turnNo,
                text: child.text,
                hintKind: child.hintKind,
                segment: child.segment,
                inputMode: mode,
                targetWords: childTargets,
              },
              true,
            ),
          ]);
    const hold = createAnswerHold({
      dontKnow: mode === "dont_know",
      samePair: pairOf(stuckAfter),
      nextPair: pairOf(afterBase),
    });
    const held: string[] = [];
    const send = (en: string) => {
      try {
        write({ t: "s", en });
      } catch {
        // 브라우저 연결이 닫혀도 응답을 끝까지 받아 토리 행을 저장한다
      }
    };

    // (7) 회화 턴 — 문장마다 흘려 보냄. onSentence 는 던지지 않는다(a2 M1 계약)
    let outcome: TalkOutcome;
    try {
      outcome = await talkTurn(
        input,
        {
          profileId,
          sessionId: state.session.id,
          level: state.level,
          requestReceivedAt: received,
          onPrepared: () => {
            timer.mark("ai_prep");
            deps.onPrepTimings?.(timer.result());
          },
          onStuck: (stuck) => hold.stuck(stuck),
          onSentence: (en) => {
            if (hold.hold(en)) held.push(en);
            else send(en);
          },
        },
        { db, clock: deps.now, ...deps.ai },
      );
    } catch (error) {
      logFailure("회화 턴", error);
      outcome = { ok: false, reason: "server", refusals: 0 };
    }

    // (8) 결과 → 토리 행
    const unitWords = ctx.unitWords;
    const plan = toriPlanOf(outcome, {
      state: { ...state, unitWords },
      lites,
      child: {
        turnNo: child.turnNo,
        text: child.text,
        hintKind: child.hintKind,
        segment: child.segment,
        inputMode: mode,
        targetWords: childTargets,
      },
      homophones: (deps.homophones ?? seedHomophones)(),
      // 검사 재료(형태 표 · 어휘 범위)는 다음 자리가 1~3단계 AI 자리일 때만 읽는다(검토 M-2)
      ...(outcome.ok &&
      state.spec.cardShape === "turns" &&
      positionWith(state, [
        ...lites,
        childLiteOf(
          {
            turnNo: child.turnNo,
            text: child.text,
            hintKind: child.hintKind,
            segment: child.segment,
            inputMode: mode,
            targetWords: childTargets,
          },
          outcome.value.stuck,
        ),
      ]).pending?.source === "ai_more_talk"
        ? {
            checkAiQuestion: await aiQuestionCheckOf(
              db,
              state,
              ctx.sentenceMaxWords,
              unitWords,
            ),
          }
        : {}),
    });
    if (plan.kind === "break") {
      // 잡아 둔 문장은 붙일 말이 없으니 그대로 보낸다(잡기 전과 같은 줄)
      for (const en of held) send(en);
      write({ t: "break", ...plan.line });
      return;
    }
    // 같은 말 두 번 안 읽기(C125 (3)): 읽고 보이는 글만 줄인다. 저장 글 · 다시 쓸 토리 차례 · 질문 차례 셈은 계획 그대로
    const shown = shownTurnOf(plan.sentSentences, plan.append);
    const left = [...shown.sentences];
    const keep = (en: string) => {
      const at = left.indexOf(en);
      if (at < 0) return false;
      left.splice(at, 1);
      return true;
    };
    for (const en of [...held, ...plan.speak]) if (keep(en)) send(en);
    if (plan.ko !== null) write({ t: "ko", ko: plan.ko });
    for (const line of addLinesOf(shown.append)) write(line);

    const appended = plan.append.map(appendEnOf);
    const saved = await db.transaction(async (tx) => {
      const locked = await readTalkState(tx, {
        sessionId: state.session.id,
        profileId,
        lock: true,
        at: deps.now(),
      });
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
          text: toriTextOf(plan.sentSentences.join(" "), appended),
          toriRewrite: toriRewriteOf({
            sentSentences: plan.sentSentences,
            appended,
          }),
          cardQuestionNo: plan.cardQuestionNo,
          aiQuestion: plan.aiQuestion,
          toriKo: plan.toriKo,
          recast: plan.recast,
          explanation: plan.explanation,
          newWords: plan.newWords,
          missionChecks: plan.missionChecks,
          overLength: plan.overLength,
          recordedAt: at,
        });
        await tx
          .update(talkTurns)
          .set({
            selfUsedWords: plan.selfUsed,
            saidWords: plan.said,
            stuckPhrase: plan.stuck ? (child.text ?? "") : null,
            sentUserMessage,
          })
          .where(eq(talkTurns.id, child.id));
        const questionText = [
          plan.sentSentences.join(" "),
          ...plan.append.flatMap((l) => (l.kind === "question" ? [l.en] : [])),
        ].join(" ");
        await writeSay(tx, {
          profileId,
          met: metWordsIn(questionText, {
            unitWords,
            lemmaOf: state.lemmaOf,
          }),
          said: plan.said,
          day: locked.learningDay,
          knownDays: snapshotNumber(locked, "talk.known_days"),
        });
        if (!locked.position.targetReached && plan.after.targetReached)
          await reachTalkTarget(tx, {
            state: locked,
            at,
            rules: {
              per: positiveInt(s, "talk.friendship_per_talk"),
              max: positiveInt(s, "talk.friendship_max"),
            },
          });
      }
      return readTalkState(tx, {
        sessionId: state.session.id,
        profileId,
        at,
      });
    });
    if (!saved) {
      write({ t: "stale" });
      return;
    }
    const missions = new Set<number>();
    for (const row of saved.rows)
      if (row.speaker === "tori" && Array.isArray(row.missionChecks))
        for (const n of row.missionChecks)
          if (Number.isInteger(n)) missions.add(n as number);
    write({
      t: "end",
      next: nextOf(saved.position, {
        spec: saved.spec,
        hints: hintTiersOf({
          spec: saved.spec,
          card: saved.card,
          pending: saved.position.pending,
          ...(plan.aiHints ? { ai: plan.aiHints } : {}),
        }),
        ...(plan.explanation ? { explanation: plan.explanation } : {}),
        missionsDone: [...missions].sort((a, b) => a - b),
      }),
    });
  } catch (error) {
    logFailure("회화 턴 길", error);
    write({ t: "error" });
  }
}

function lineOf(
  line: Pick<TalkCard["farewell"], "en" | "ko">,
  koMeaning: boolean,
): { en: string; ko?: string } {
  return {
    en: line.en,
    ...(koMeaning && line.ko !== undefined ? { ko: line.ko } : {}),
  };
}

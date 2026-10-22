import "server-only";
// 회화 턴 · 끝맺음 턴 흐름(6.1 대체 모델 재시도 · 프롬프트 캐시 · 기록, 6.2 끝 문단 · 6.4 실시간 출력 검사, 8절 '회화 턴 실패' ·
// C89 · C92 · C95, plan-p13a 파일별 값 4 · 정할 것 회8). P9c runAiCall 과 같은 차례를 스트리밍으로 한다:
// 설정 · 학습일 · 단가표 · 조합 → 호출 앞 판정 → 시드 목록 · 가림 · 요청 본문 → 시도(흘려 받기 · 문장 검사 · 다음 할 일)
// → 정규화 · 출력 검사 → 결과. 시도 하나 = ai_calls 한 행. 아이 글 · 응답 글은 로그 · 오류 · 기록 어디에도 남기지 않는다.
// DB 없이 도는 몫(streamTalk)과 DB 를 읽는 앞머리(runTalkCall)를 나눈다 — 앞쪽은 단위 시험이 가짜 클라이언트로 본다.
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  answerTextOf,
  type SettingValues as CallSettingValues,
  type CallSpec,
  prepareAnswer,
} from "@/core/ai/calls/common";
import {
  applyTalkChecks,
  type TalkOutput,
  type TalkRules,
  type TalkTurnInput,
  talkCheckFields,
} from "@/core/ai/calls/talk";
import {
  type AiRequestConfig,
  aiSettingSchemasOf,
  requestConfigOf,
  settingKeysOf,
} from "@/core/ai/combo";
import {
  billedAttemptsOf,
  costOf,
  type MessageLike,
  type PriceBook,
} from "@/core/ai/cost";
import { preCallGate } from "@/core/ai/cost-alert";
import {
  classifyFailure,
  type FailureCallStatus,
  type FailureReason,
} from "@/core/ai/failure";
import type { Masker } from "@/core/ai/mask";
import { checkOutputFields } from "@/core/ai/output-check";
import { type BuiltRequest, buildAiRequest } from "@/core/ai/request";
import {
  createToriEnReader,
  createToriSentenceGate,
  safeLineOf,
  type TalkAttemptEnd,
  type ToriSentenceGate,
  type ToriSentenceReason,
  talkAttemptNext,
} from "@/core/conversation/stream";
import { learningDayOf } from "@/core/learning-day";
import { AI_WAIT_TIMEOUT_MULTIPLE, type Effort } from "@/core/seed/structure";
import type { ForbiddenList } from "@/core/seed/text";
import { splitSentences } from "@/core/seed/text";
import { getAnthropicClient, sendStreamingAttempt } from "@/server/ai/client";
import {
  type AiCallContext,
  type AiDeps,
  type AiFailureReason,
  alertSameError,
  BASE_SETTING_SCHEMAS,
  isConfigError,
  logConfigProblem,
  maskerFor,
  warnAnswer,
} from "@/server/ai/run";
import {
  type AiCallRow,
  dailyUsage,
  insertAiCall,
  loadPriceBook,
} from "@/server/ai/store";
import { now } from "@/server/clock";
import { getDb } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { getOutputCheckLists, loadSeedList } from "@/server/seed-lists";
import { getSettings } from "@/server/settings";

/** Haiku 5.5 첫 문장 전 거절의 한 번 재시도(6.1 — 그 턴만, 정본 고정 값). */
export const TALK_REFUSAL_RETRY = {
  model: "claude-sonnet-5-5",
  effort: "low" satisfies Effort,
  thinking: "off",
} as const;
/** 둘째 시도를 보낼 최소 남은 시간(기술 값 1초 — run.ts 와 같다). */
const MIN_RETRY_MS = 1000;
/** 한 시도의 타임아웃 하한(기술 값 — 0 이 SDK 기본 타임아웃으로 읽히지 않게). */
const MIN_ATTEMPT_TIMEOUT_MS = 1;
const ZERO_COST = "0.000000";
const DOWN_AFTER_FAILURES_KEY = "ai.down_after_failures";

// ── 결과 꼴(값 5 — index.ts 가 다시 내보낸다) ──────────────────────

export type TalkSuccess = {
  ok: true;
  /** 정규화 · 출력 검사 뒤 값. tori_en 은 내보낸 문장(검사 뒤, 걸린 자리는 안전한 대사)을 이은 글이다. */
  value: TalkOutput;
  /** 내보낸 문장(다시 쓸 토리 차례의 재료 — toriRewriteOf). {NAME} 은 채우기 전. */
  sentSentences: string[];
  /** tori_en 문장 검사에 걸린 갈래(걸린 차례). */
  blocked: ToriSentenceReason[];
  /** 내보낸 원문 문장 가운데 3.6 길이 상한을 넘은 수(talk_turns '길이 초과'). */
  overLength: number;
  /** 서버가 요청을 받은 때부터 첫 문장을 내보낸 때까지(ms). 문장이 없었으면 null. */
  firstSentenceMs: number | null;
  answeredModel: string;
  /** 엄격 규격을 지나지 못해 느슨한 규격 + 정규화로 받았다. */
  normalized: boolean;
  /** 출력 검사에 걸린 칸을 바꿨다(tori_en 문장 포함). */
  checked: boolean;
  hintsBlocked: boolean;
  farewellBlocked: boolean;
  summaryBlocked: boolean;
  /** tori_en 을 문장마다 흘려 보냈다. 거짓이면 응답 끝에서 한 번에(앞 칸이 stuck · tori_en 이 아님 — 위험 3 · C127). */
  streamed: boolean;
  /** Haiku 거절 뒤 다른 모델로 다시 불러 받은 턴(6.1). */
  retriedOtherModel: boolean;
};

export type TalkOutcome =
  | TalkSuccess
  | {
      ok: false;
      /** 첫 문장 뒤 끊김 · 타임아웃 · 거절 · max_tokens — 보낸 문장을 두고 그 턴을 닫는다(8절). */
      reason: "cut_after_first";
      sentSentences: string[];
      overLength: number;
      firstSentenceMs: number;
      cause: Exclude<TalkAttemptEnd, "end_turn">;
    }
  | { ok: false; reason: AiFailureReason; refusals: number };

export type TalkCallContext = AiCallContext & {
  /** 서버가 요청을 받은 때(첫 문장 시간의 시작, 6.1). */
  requestReceivedAt: Date;
  /** 검사를 지난(또는 바꾼) 영어 문장마다. 끝맺음 턴은 넘기지 않는다(tori_en 이 빈 글 — C33). */
  onSentence?: (sentence: string) => void;
  /** tori_en 앞 칸의 막힘 판단을 읽은 때(첫 문장 전, 시도마다 한 번 — 13절 C127). */
  onStuck?: (stuck: boolean) => void;
  /** 준비(설정 · 단가 · 하루 사용 · 가림)를 마치고 AI 를 부르기 직전(준비 시간 재기 — C125 (4)). */
  onPrepared?: () => void;
};

export type TalkDeps = AiDeps & {
  /** 메타 문장 구(시드 meta-sentences.json). */
  metaPhrases?: () => readonly string[];
};

// ── DB 없이 도는 몫 ──────────────────────────────────────────────

/** 시도 하나의 기록(부르는 쪽이 ai_calls 한 행으로). */
export type TalkAttemptRecord = {
  status: AiCallRow["status"];
  errorCode: string | null;
  failureReason: FailureReason | null;
  requestedModel: string;
  answeredModel: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  costUsd: string;
  priceMissing: boolean;
  latencyMs: number | null;
  firstSentenceMs: number | null;
  calledAt: Date;
};

export type TalkStreamPlan = {
  spec: CallSpec<TalkTurnInput, TalkOutput, TalkRules>;
  input: TalkTurnInput;
  rules: TalkRules;
  config: AiRequestConfig;
  /** Haiku 첫 문장 전 거절 때 한 번 부를 구성(없으면 다시 부르지 않음). */
  otherModelConfig: AiRequestConfig | null;
  masker: Masker;
  forbidden: ForbiddenList;
  metaPhrases: readonly string[];
  book: PriceBook;
  client: Anthropic;
  clock: () => Date;
  /** 흐름을 시작한 때(기다림 상한 = 이때 + 타임아웃 두 배, 6.1). */
  startedAt: Date;
  requestReceivedAt: Date;
  onSentence?: (sentence: string) => void;
  /** tori_en 앞 칸의 막힘 판단(C127) — 첫 문장 전에 부른다. */
  onStuck?: (stuck: boolean) => void;
  record(row: TalkAttemptRecord): Promise<void>;
};

function bodyOf(built: BuiltRequest<TalkOutput>) {
  const { type, schema } = zodOutputFormat(built.wireSchema);
  return {
    ...built.body,
    output_config: { ...built.body.output_config, format: { type, schema } },
  };
}

/** 응답 메시지(text 블록의 글을 읽는 꼴). */
type TalkMessage = Omit<MessageLike, "content"> & {
  content: readonly (MessageLike["content"][number] & { text?: string })[];
};

/** 실패 갈래 → 다음 할 일 판정의 끝 꼴. */
function endOfFailure(reason: FailureReason): TalkAttemptEnd {
  if (reason === "timeout" || reason === "connection" || reason === "server")
    return reason;
  return "other";
}

function endOfStop(stop: string | null): TalkAttemptEnd {
  if (stop === "end_turn") return "end_turn";
  if (stop === "refusal") return "refusal";
  if (stop === "max_tokens") return "max_tokens";
  return "other";
}

/** 응답 글: 모든 text 블록을 차례로 이은 글(흘려 받은 조각과 같음). JSON 이 아니면 마지막 fallback 뒤 글로 한 번 더 본다(위험 4). */
function parsedAnswer(message: TalkMessage): unknown {
  const joined = message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  for (const text of [joined, answerTextOf(message)]) {
    try {
      return prepareAnswer(JSON.parse(text), []);
    } catch {
      // 다음 글로
    }
  }
  return undefined;
}

/**
 * 시도 · 흘려 보내기 · 정규화 · 출력 검사(DB 없음). 첫 문장 전 연결 · 타임아웃이면 1회 다시, Haiku 첫 문장 전 거절이면 다른 모델로 1회,
 * 첫 문장 뒤 실패는 보낸 문장을 두고 닫는다(stream.ts talkAttemptNext). 기다림은 startedAt 부터 타임아웃의 두 배까지.
 */
export async function streamTalk(plan: TalkStreamPlan): Promise<TalkOutcome> {
  const { input, spec, rules, clock } = plan;
  const closing = input.turn.closing;
  const streaming = plan.onSentence !== undefined && !closing;
  const built = buildAiRequest(spec, input, {
    config: plan.config,
    masker: plan.masker,
    rules,
  });
  const otherBuilt =
    plan.otherModelConfig === null
      ? null
      : buildAiRequest(spec, input, {
          config: plan.otherModelConfig,
          masker: plan.masker,
          rules,
        });
  const timeoutMs = built.timeoutMs;
  const deadline =
    plan.startedAt.getTime() + AI_WAIT_TIMEOUT_MULTIPLE * timeoutMs;
  const gateOf = (): ToriSentenceGate =>
    createToriSentenceGate({
      forbidden: plan.forbidden,
      metaPhrases: plan.metaPhrases,
      lowLevel: input.spec.cardShape === "turns",
      safeLine: safeLineOf(input.card.safeLines, input.history.length + 1),
      sentenceMaxWords: input.sentenceMaxWords,
    });
  let gate = gateOf();
  let firstSentenceMs: number | null = null;
  const emit = (sentence: string) => {
    const out = gate.accept(sentence);
    if (out === null) return;
    if (firstSentenceMs === null)
      firstSentenceMs = clock().getTime() - plan.requestReceivedAt.getTime();
    plan.onSentence?.(out);
  };

  let current = built;
  let retriedSame = false;
  let retriedOtherModel = false;
  let refusals = 0;
  for (;;) {
    const calledAt = clock();
    const remaining = Math.max(
      MIN_ATTEMPT_TIMEOUT_MS,
      deadline - calledAt.getTime(),
    );
    const reader = createToriEnReader();
    let stuckTold = false;
    const sentBefore = firstSentenceMs;
    const result = await sendStreamingAttempt(
      plan.client,
      {
        body: bodyOf(current),
        betas: current.betas,
        timeoutMs: remaining,
        firstTextTimeoutMs: Math.max(
          MIN_ATTEMPT_TIMEOUT_MS,
          Math.min(timeoutMs, remaining),
        ),
      },
      { now: clock },
      {
        onText: (delta) => {
          if (!streaming) return;
          const fresh = reader.push(delta);
          // 막힘 판단은 tori_en 앞 칸이라 첫 문장보다 먼저 알린다(C127)
          const stuck = reader.stuck();
          if (stuck !== undefined && !stuckTold) {
            stuckTold = true;
            plan.onStuck?.(stuck);
          }
          for (const sentence of fresh) emit(sentence);
        },
      },
    );
    const attemptFirst = sentBefore === null ? firstSentenceMs : null;
    const requestedModel = current.body.model;
    let end: TalkAttemptEnd;
    let failReason: AiFailureReason;
    if (!result.ok) {
      const failure = classifyFailure(result.failure);
      await plan.record({
        ...emptyRecord(requestedModel, calledAt),
        ...snapshotUsage(result.snapshot, requestedModel, plan.book),
        status: failure.status as FailureCallStatus,
        errorCode: failure.errorCode,
        failureReason: failure.reason,
        latencyMs: result.latencyMs,
        firstSentenceMs: attemptFirst,
      });
      // 문장을 받는 쪽이 던졌으면 그 시도를 기록한 뒤 다시 던진다(b 계약: onSentence 는 던지지 않는다 — 검토 M1)
      if (result.listenerError !== undefined) throw result.listenerError;
      end = endOfFailure(failure.reason);
      failReason = failure.reason;
    } else {
      const message = result.message as unknown as TalkMessage;
      const cost = costOf(billedAttemptsOf(message, requestedModel), plan.book);
      if (message.model !== requestedModel || cost.priceMissing) {
        warnAnswer(message, {
          requestId: result.requestId,
          purpose: spec.purpose,
          requested: requestedModel,
          priceMissing: cost.priceMissing,
          book: plan.book,
        });
      }
      const answered: TalkAttemptRecord = {
        ...emptyRecord(requestedModel, calledAt),
        answeredModel: message.model,
        inputTokens: cost.tokens.input,
        outputTokens: cost.tokens.output,
        cacheWriteTokens: cost.tokens.cacheWrite,
        cacheReadTokens: cost.tokens.cacheRead,
        costUsd: cost.costUsd,
        priceMissing: cost.priceMissing,
        latencyMs: result.latencyMs,
        firstSentenceMs: attemptFirst,
      };
      end = endOfStop(message.stop_reason);
      if (end === "end_turn") {
        return finishTalk(plan, {
          message,
          reader,
          streaming,
          emit,
          gate: () => gate,
          firstSentenceMs: () => firstSentenceMs,
          answered,
          retriedOtherModel,
        });
      }
      if (end === "refusal") refusals += 1;
      await plan.record({
        ...answered,
        status: end === "refusal" ? "refusal" : "validation_failed",
      });
      failReason = end === "refusal" ? "refusal" : "invalid";
    }
    const next = talkAttemptNext({
      end,
      firstSentenceSent: firstSentenceMs !== null,
      retriedSame,
      retriedOtherModel,
      canRetryOtherModelOnRefusal: otherBuilt !== null,
    });
    const timeLeft = deadline - clock().getTime() >= MIN_RETRY_MS;
    if (next.next === "retry_same" && timeLeft) {
      retriedSame = true;
      gate = gateOf();
      continue;
    }
    if (next.next === "retry_other_model" && otherBuilt !== null && timeLeft) {
      retriedOtherModel = true;
      current = otherBuilt;
      gate = gateOf();
      continue;
    }
    if (next.next === "close_turn" && firstSentenceMs !== null) {
      return {
        ok: false,
        reason: "cut_after_first",
        sentSentences: gate.sent(),
        overLength: gate.overLength(),
        firstSentenceMs,
        cause: next.reason,
      };
    }
    return { ok: false, reason: failReason, refusals };
  }
}

/**
 * 끊기거나 끊은 시도의 토큰 · 비용(검토 M2): 그때까지의 스냅숏 usage(message_start 의 입력 · 캐시 토큰, 받은 만큼의 출력)로 센다.
 * 스냅숏이 없으면(첫 이벤트 전) 0.
 */
function snapshotUsage(
  snapshot: unknown,
  requestedModel: string,
  book: PriceBook,
): Partial<TalkAttemptRecord> {
  const message = snapshot as TalkMessage | null;
  if (!message?.usage) return {};
  const cost = costOf(
    billedAttemptsOf({ ...message, stop_reason: null }, requestedModel),
    book,
  );
  return {
    answeredModel: message.model,
    inputTokens: cost.tokens.input,
    outputTokens: cost.tokens.output,
    cacheWriteTokens: cost.tokens.cacheWrite,
    cacheReadTokens: cost.tokens.cacheRead,
    costUsd: cost.costUsd,
    priceMissing: cost.priceMissing,
  };
}

function emptyRecord(
  requestedModel: string,
  calledAt: Date,
): TalkAttemptRecord {
  return {
    status: "success",
    errorCode: null,
    failureReason: null,
    requestedModel,
    answeredModel: null,
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    costUsd: ZERO_COST,
    priceMissing: false,
    latencyMs: null,
    firstSentenceMs: null,
    calledAt,
  };
}

/** end_turn: 남은 문장 · 흘려 보내지 못한 tori_en(위험 3) → 엄격 규격 · 검증 → 정규화(다시 요청하지 않음) → 출력 검사. */
async function finishTalk(
  plan: TalkStreamPlan,
  s: {
    message: TalkMessage;
    reader: ReturnType<typeof createToriEnReader>;
    streaming: boolean;
    emit: (sentence: string) => void;
    gate: () => ToriSentenceGate;
    firstSentenceMs: () => number | null;
    answered: TalkAttemptRecord;
    retriedOtherModel: boolean;
  },
): Promise<TalkOutcome> {
  const { spec, input, rules } = plan;
  const closing = input.turn.closing;
  const prepared = parsedAnswer(s.message);
  let streamed = false;
  if (s.streaming) {
    for (const sentence of s.reader.finish()) s.emit(sentence);
    streamed = s.reader.closed() && !s.reader.failed();
    // 앞 칸이 stuck · tori_en 이 아니어서 흘려 보내지 못했으면 끝에서 한 번에(위험 3 · C127)
    const toriEn = (prepared as { tori_en?: unknown } | undefined)?.tori_en;
    if (!streamed && typeof toriEn === "string")
      for (const sentence of splitSentences(toriEn)) s.emit(sentence);
  }
  const gate = s.gate();
  const wire = plan.spec.wireSchema(input, rules).safeParse(prepared);
  const strict =
    prepared !== undefined &&
    wire.success &&
    spec.validate(wire.data, input, rules).length === 0
      ? wire.data
      : null;
  const value = spec.normalize(strict ?? prepared, input, rules);
  const firstSentenceMs = s.firstSentenceMs();
  if (value === null) {
    await plan.record({ ...s.answered, status: "validation_failed" });
    if (firstSentenceMs !== null)
      return {
        ok: false,
        reason: "cut_after_first",
        sentSentences: gate.sent(),
        overLength: gate.overLength(),
        firstSentenceMs,
        cause: "other",
      };
    return { ok: false, reason: "invalid", refusals: 0 };
  }
  const shown: TalkOutput = closing
    ? value
    : { ...value, tori_en: gate.sent().join(" ") };
  const hits = checkOutputFields(talkCheckFields(shown), {
    forbidden: plan.forbidden,
    sentenceMaxWords: input.sentenceMaxWords,
  });
  const checked = applyTalkChecks(shown, hits);
  const blocked = gate.blocked();
  const changed = checked.changed || blocked.length > 0;
  await plan.record({
    ...s.answered,
    status: strict !== null && !changed ? "success" : "validation_failed",
  });
  return {
    ok: true,
    value: checked.value,
    sentSentences: gate.sent(),
    blocked,
    overLength: gate.overLength(),
    firstSentenceMs,
    answeredModel: s.message.model,
    normalized: strict === null,
    checked: changed,
    hintsBlocked: checked.hintsBlocked,
    farewellBlocked: checked.farewellBlocked,
    summaryBlocked: checked.summaryBlocked,
    streamed: s.streaming && streamed,
    retriedOtherModel: s.retriedOtherModel,
  };
}

// ── DB 를 읽는 앞머리 ────────────────────────────────────────────

/** Haiku 거절 뒤 다시 부를 구성(서버 측 대체 모델 재시도가 없는 모델의 회화 턴만, 6.1). 조합이 안 되면 null. */
function otherModelConfigOf(
  purpose: TalkTurnPurpose,
  level: number,
  config: AiRequestConfig,
  values: CallSettingValues,
  book: PriceBook,
): AiRequestConfig | null {
  if (purpose !== "talk_turn" || config.fallbacks !== null) return null;
  if (config.model === TALK_REFUSAL_RETRY.model) return null;
  const keys = settingKeysOf(purpose, level);
  try {
    return requestConfigOf({
      purpose,
      level,
      values: {
        ...values,
        [keys.model]: TALK_REFUSAL_RETRY.model,
        [keys.effort]: TALK_REFUSAL_RETRY.effort,
        [keys.thinking]: TALK_REFUSAL_RETRY.thinking,
      },
      book,
    });
  } catch (error) {
    if (!isConfigError(error)) throw error;
    return null;
  }
}

type TalkTurnPurpose = "talk_turn" | "talk_closing";

const fail = (reason: AiFailureReason, refusals = 0): TalkOutcome => ({
  ok: false,
  reason,
  refusals,
});

/**
 * 시도 기록 쓰기를 감싼다(검토 rev-p13b M-1): DB 실패는 이름 · 코드만 한 줄 남기고(아이 글 · 대화 글 없음) 던지지 않는다. 비용 기록
 * 한 행의 실패가 이미 받은 AI 응답 · 흘려 보낸 문장 · 토리 행을 실패 길로 바꾸지 않게 한다.
 */
export function keepTurnOnRecordFailure(
  write: (row: TalkAttemptRecord) => Promise<void>,
  what = "회화 시도 기록",
): (row: TalkAttemptRecord) => Promise<void> {
  return async (row) => {
    try {
      await write(row);
    } catch (error) {
      console.error(`${what} 실패(${dbErrorTag(error)})`);
    }
  };
}

/**
 * 회화 턴 · 끝맺음 턴 하나(runAiCall 과 같은 앞머리). 설정 문제 · 목록 없음 · 키 없음은 config(행 없음),
 * 하루 안전 상한이면 safety_cap 행 하나(스트림 없음). 맥락과 입력의 단계가 다르면 호출부 결함으로 던진다.
 */
export async function runTalkCall(
  spec: CallSpec<TalkTurnInput, TalkOutput, TalkRules>,
  input: TalkTurnInput,
  ctx: TalkCallContext,
  deps: TalkDeps = {},
): Promise<TalkOutcome> {
  const db = deps.db ?? getDb();
  const clock = deps.clock ?? now;
  const purpose = spec.purpose as TalkTurnPurpose;
  if (ctx.level !== input.level) {
    throw new RangeError(
      `호출 맥락의 단계(${ctx.level})와 입력의 단계(${input.level})가 다르다`,
    );
  }

  const t0 = clock();
  let values: CallSettingValues;
  let learningDay: string;
  let book: PriceBook;
  let config: AiRequestConfig;
  let usage: Awaited<ReturnType<typeof dailyUsage>>;
  try {
    const read = await getSettings(
      {
        ...BASE_SETTING_SCHEMAS,
        ...aiSettingSchemasOf(purpose, ctx.level),
        ...spec.settingSchemas,
      },
      { profileId: ctx.profileId, db },
    );
    values = read as CallSettingValues;
    learningDay = learningDayOf(
      t0,
      read["app.timezone"],
      read["app.day_start_hour"],
    );
    // 단가표와 하루 사용량은 서로 기대지 않아 함께 읽는다(C125 (4))
    const [loaded, used] = await Promise.all([
      loadPriceBook(db, learningDay),
      dailyUsage(db, { profileId: ctx.profileId, learningDay }),
    ]);
    book = loaded;
    usage = used;
    config = requestConfigOf({ purpose, level: ctx.level, values, book });
  } catch (error) {
    if (!isConfigError(error)) throw error;
    logConfigProblem(purpose, error);
    return fail("config");
  }
  const downAfterFailures = values[DOWN_AFTER_FAILURES_KEY] as number;
  const baseRow = {
    profileId: ctx.profileId,
    sessionId: ctx.sessionId,
    learningDay,
    purpose,
  };

  const gate = preCallGate(usage, {
    safetyDailyCalls: values["ai.safety_daily_calls"] as number,
    safetyDailyCostUsd: values["ai.safety_daily_cost_usd"] as number,
  });
  if (!gate.allowed) {
    await insertAiCall(db, {
      ...baseRow,
      ...emptyRecord(config.model, t0),
      status: "safety_cap",
    });
    return fail("safety_cap");
  }

  let forbidden: ForbiddenList;
  let metaPhrases: readonly string[];
  let rules: TalkRules;
  let client: Anthropic;
  try {
    forbidden = (deps.lists ?? getOutputCheckLists)().forbidden;
    metaPhrases = (
      deps.metaPhrases ?? (() => loadSeedList("metaSentences").phrases)
    )();
    rules = spec.rulesOf(values, input);
    client = (deps.client ?? getAnthropicClient)();
  } catch (error) {
    if (!isConfigError(error)) throw error;
    logConfigProblem(purpose, error);
    return fail("config");
  }
  const contactPatterns = forbidden.patterns
    .filter((p) => p.category === "contact")
    .map((p) => p.regex);
  const masker = await maskerFor(db, ctx.profileId, contactPatterns);
  ctx.onPrepared?.();

  return streamTalk({
    spec,
    input,
    rules,
    config,
    otherModelConfig: otherModelConfigOf(
      purpose,
      ctx.level,
      config,
      values,
      book,
    ),
    masker,
    forbidden,
    metaPhrases,
    book,
    client,
    clock,
    startedAt: t0,
    requestReceivedAt: ctx.requestReceivedAt,
    onSentence: ctx.onSentence,
    onStuck: ctx.onStuck,
    // 시도 기록 · 같은 오류 알림의 DB 실패는 받은 응답 · 흘려 보낸 문장 · 토리 행을 바꾸지 않는다(검토 rev-p13b M-1)
    record: async (attempt) => {
      await keepTurnOnRecordFailure(async ({ failureReason, ...row }) => {
        await insertAiCall(db, { ...baseRow, ...row });
      })(attempt);
      await keepTurnOnRecordFailure(async ({ failureReason, ...row }) => {
        if (failureReason === "same_error" && row.errorCode !== null)
          await alertSameError(db, {
            purpose,
            learningDay,
            model: row.requestedModel,
            errorCode: row.errorCode,
            downAfterFailures,
            at: clock(),
          });
      }, "같은 오류 알림")(attempt);
    },
  });
}

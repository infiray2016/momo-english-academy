import "server-only";
// 회화 턴 · 끝맺음 턴 흐름(6.1 대체 모델 재시도 · 프롬프트 캐시 · 기록, 6.2 끝 문단 · 6.4 실시간 출력 검사, 8절 '회화 턴 실패' ·
// C89 · C92 · C95, plan-p13a 파일별 값 4 · 정할 것 회8). P9c runAiCall 과 같은 차례를 스트리밍으로 한다:
// 설정 · 학습일 · 단가표 · 조합 → 호출 앞 판정 → 시드 목록 · 가림 · 요청 본문 → 시도(흘려 받기 · 문장 검사 · 다음 할 일)
// → 정규화 · 출력 검사 → 결과. 시도 하나 = ai_calls 한 행. 아이 글 · 응답 글은 로그 · 오류 · 기록 어디에도 남기지 않는다.
// DB 없이 도는 몫(streamTalkLesson)과 DB 를 읽는 앞머리(runTalkLessonCall)를 나눈다 — 앞쪽은 단위 시험이 가짜 클라이언트로 본다.
// 규격은 새 꼴 회화 수업 턴(talk-lesson) 하나다(옛 꼴 talk 규격 · streamTalk · runTalkCall 은 회화 plan 묶음 12 가 지웠다).
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  answerTextOf,
  type SettingValues as CallSettingValues,
  type CallSpec,
  prepareAnswer,
} from "@/core/ai/calls/common";
import {
  applyTalkLessonChecks,
  EMPTY_TORI_EN_STUCK,
  emptyToriEnStuckOf,
  type TalkLessonInput,
  type TalkLessonOutput,
  type TalkLessonRules,
  talkLessonCheckFields,
  talkLessonClosingSpec,
  talkLessonInvalidReasonOf,
  talkLessonTurnSpec,
  talkSceneWordsOf,
} from "@/core/ai/calls/talk-lesson";
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
import { inlineJsonSchemaRefs } from "@/core/ai/inline-refs";
import type { Masker } from "@/core/ai/mask";
import {
  type CheckField,
  checkOutputFields,
  type FieldHit,
} from "@/core/ai/output-check";
import { type BuiltRequest, buildAiRequest } from "@/core/ai/request";
import { childKindOf, effectiveStuckOf } from "@/core/conversation/child-kind";
import { sayingAnswer } from "@/core/conversation/spoken";
import {
  createToriEnReader,
  createToriSentenceGate,
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

export type TalkSuccessOf<O> = {
  ok: true;
  /** 정규화 · 출력 검사 뒤 값. tori_en 은 내보낸 문장(검사 뒤, 걸린 자리는 안전한 대사)을 이은 글이다. */
  value: O;
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
  /**
   * 새 꼴(회화 plan 묶음 8): 앱 확인(정규화 · 출력 검사)이 1~3단계 소리 줄을 바꿨다 — 따라 할 말을 바꾸거나 비움(model) · 선택지를
   * 비움(choices). 이 턴의 ai_calls 는 '검증 실패'로 남는다(묶음 6 검토 8절 (라) — talk:observe 가 비율을 본다).
   */
  soundFixed?: { model: boolean; choices: boolean; overlap?: boolean };
};

export type TalkOutcomeOf<O> =
  | TalkSuccessOf<O>
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
/** 새 꼴 회화 수업 턴 · 끝맺음 턴의 결과(talk-lesson 규격). */
export type TalkLessonOutcome = TalkOutcomeOf<TalkLessonOutput>;

export type TalkCallContext = AiCallContext & {
  /** 서버가 요청을 받은 때(첫 문장 시간의 시작, 6.1). */
  requestReceivedAt: Date;
  /** 검사를 지난(또는 바꾼) 영어 문장마다. 끝맺음 턴은 넘기지 않는다(tori_en 이 빈 글 — C33). */
  onSentence?: (sentence: string) => void;
  /**
   * tori_en 앞 칸의 막힘 판단을 읽은 때(첫 문장 전, 시도마다 한 번 — 13절 C127). stuck 은 앱이 다시 본 값(13절 C204 — 아이 말 갈래 · 인식 글로
   * 막힘을 무름), overridden 은 AI 가 막힘이라 했는데 앱이 무른 때 참.
   */
  onStuck?: (stuck: boolean, overridden: boolean) => void;
  /** 준비(설정 · 단가 · 하루 사용 · 가림)를 마치고 AI 를 부르기 직전(준비 시간 재기 — C125 (4)). */
  onPrepared?: () => void;
  /**
   * 이 호출의 ai_calls 행을 가려 적는 표지(13절 C203 (3) 질문 다시 쓰기 — TALK_QUESTION_RETRY_TAG). 오류 갈래가 없는 행은 error_code 에 이 표지를,
   * 있는 행은 '<표지>:<갈래>' 를 적는다. 목적(purpose)은 talk_turn 그대로라 하루 안전 상한 · 조합 · 비용 셈에 그대로 든다.
   */
  recordTag?: string;
};

/** 질문 다시 쓰기 호출의 ai_calls 표지(13절 C203 (3), error_code 칸 — 스키마 열거형을 늘리지 않는다). */
export const TALK_QUESTION_RETRY_TAG = "question_retry";

/**
 * 질문 다시 쓰기 호출의 표지에 다시 쓴 까닭을 붙인다('question_retry.chain' — 코드 검토 rev-content-1 M-8: 까닭별 빈도 · 실패를 운영 기록에서 보게).
 * 까닭은 질문 검사 걸림(too_long · target_word · offband · form · echo · not_easy) · 카드 답 뒤 카드 글(chain) · 막힘 무름(stuck_overridden)이다.
 * 표지로 가려 읽는 쪽은 앞머리(TALK_QUESTION_RETRY_TAG)로 본다.
 */
export function questionRetryTagOf(reason: string): string {
  return `${TALK_QUESTION_RETRY_TAG}.${reason}`;
}

/** 표지를 단 오류 갈래 칸(표지가 없으면 그대로). */
export function taggedErrorCode(
  errorCode: string | null,
  tag: string | undefined,
): string | null {
  if (tag === undefined) return errorCode;
  return errorCode === null ? tag : `${tag}:${errorCode}`;
}

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

/** 흘려 받기 계획의 공통 몫(규격 · 입력 밖 — 구성 · 가림 · 목록 · 단가 · 클라이언트 · 시각 · 기록). */
type StreamBase = {
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
  /** tori_en 앞 칸의 막힘 판단(C127 · C204 앱이 다시 본 값) — 첫 문장 전에 부른다. */
  onStuck?: (stuck: boolean, overridden: boolean) => void;
  record(row: TalkAttemptRecord): Promise<void>;
};

/**
 * 새 꼴 회화 수업 턴의 흘려 받기 계획(회화 plan 묶음 8). 문장 문은 금지어 · 개인 정보 · 연락처 · 메타만 보고 물음표 문장을 지우지 않는다 —
 * 1~3단계 물음표 문장 잡아 두기 · 검사와 카드 자리 · 마무리 자리의 물음표 지움은 서버 턴 길(onSentence 받는 쪽)이 한다(정한 것 19).
 */
export type TalkLessonStreamPlan = StreamBase & {
  spec: CallSpec<TalkLessonInput, TalkLessonOutput, TalkLessonRules>;
  input: TalkLessonInput;
  rules: TalkLessonRules;
  /** 걸린 문장 첫 자리를 바꿀 카드 안전한 대사(safeLineOf — 부르는 쪽이 카드 · 턴 번호로 고른다). */
  safeLine: string;
};

/** 출력 검사 뒤 값과 알림(applyTalkLessonChecks 의 몫). */
type CheckedOf<O> = {
  value: O;
  changed: boolean;
  hintsBlocked: boolean;
  farewellBlocked: boolean;
  summaryBlocked: boolean;
};

/** 규격마다 다른 흘려 받기 몫(문장 문 · tori_en 칸 · 출력 검사 · 소리 줄 바뀜). */
type StreamKit<O> = {
  closing: boolean;
  safeLine: string;
  sentenceMaxWords: number;
  withToriEn(value: O, toriEn: string): O;
  checkFields(value: O): CheckField[];
  check(value: O, hits: ReadonlyMap<string, readonly FieldHit[]>): CheckedOf<O>;
  /** 앱 확인이 소리 줄을 바꿨는가(새 꼴만). raw 는 다듬은 응답(엄격 통과면 그 값). */
  soundFixed?(
    raw: unknown,
    value: O,
    sent: readonly string[],
  ): { model: boolean; choices: boolean; overlap?: boolean };
  /** AI 의 막힘 판단과 아이 말 갈래 글로 앱이 보는 막힘(새 꼴만, 13절 C204). 없으면 AI 판단 그대로. */
  stuckOf?(aiStuck: boolean, childKind: unknown): boolean;
};

type StreamCore<I, O, R> = StreamBase & {
  spec: CallSpec<I, O, R>;
  input: I;
  rules: R;
  kit: StreamKit<O>;
};

const stringsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];

/**
 * 새 꼴 소리 줄 바뀜(묶음 6 검토 8절 (라)): 응답의 따라 할 말 · 선택지가 비지 않았는데 앱 확인 뒤 값이 다르면 참. 앱이 정한 차례
 * (카드 자리 · 받침 둘째 · 4단계부터)라서 비운 것도 바뀜으로 센다 — AI 가 그 칸을 채운 것 자체가 고정부를 어긴 것이라 함께 본다.
 * sent(문장 문을 지난 선생님 문장)를 주면 겹침도 본다: 앱 확인 뒤 소리 줄의 답을 담은 선생님 문장이 있었다(C125 · 02-2 204줄 — 잡아 둔
 * 것은 서버 턴 길이 지우지만 이미 흘린 것은 지울 수 없어 기록으로 남긴다, 묶음 8 검토 I-1).
 */
export function lessonSoundFixedOf(
  raw: unknown,
  value: Pick<TalkLessonOutput, "model_line" | "choices">,
  sent?: readonly string[],
): { model: boolean; choices: boolean; overlap?: boolean } {
  const r = (raw ?? {}) as { model_line?: unknown; choices?: unknown };
  const model = typeof r.model_line === "string" ? r.model_line.trim() : "";
  const choices = stringsOf(r.choices).map((c) => c.trim());
  const fixed = {
    model: model !== "" && model !== value.model_line,
    choices:
      choices.length > 0 &&
      (choices.length !== value.choices.length ||
        choices.some((c, i) => c !== value.choices[i])),
  };
  if (sent === undefined) return fixed;
  const pairs = soundPairsOf(value);
  return {
    ...fixed,
    overlap: pairs.length > 0 && sent.some((s) => sayingAnswer(s, pairs)),
  };
}

/**
 * 소리 줄의 답 짝(따라 할 말은 같은 줄 둘, 선택지는 그 둘 — sayingAnswer 의 짝 꼴). 따라 할 말이 선택지 하나와 같은 말이면 따라 할 말 짝은
 * 넣지 않는다 — 같은 답을 두 번 견주거나 읽지 않는다(C125 넓힘, 13절 C202 (1) · 분석 A4. 정규화가 먼저 따라 할 말을 버린다).
 */
export function soundPairsOf(
  value: Pick<TalkLessonOutput, "model_line" | "choices">,
): (readonly [string, string])[] {
  const choices =
    value.choices.length === 2
      ? [[value.choices[0] ?? "", value.choices[1] ?? ""] as const]
      : [];
  const model = value.model_line;
  const modelInChoices =
    model !== "" && choices.length > 0 && sayingAnswer(model, choices);
  return [
    ...(model !== "" && !modelInChoices ? [[model, model] as const] : []),
    ...choices,
  ];
}

function lessonKit(plan: {
  input: TalkLessonInput;
  safeLine: string;
}): StreamKit<TalkLessonOutput> {
  const { input } = plan;
  return {
    closing: input.turn.closing,
    safeLine: plan.safeLine,
    sentenceMaxWords: input.sentenceMaxWords,
    withToriEn: (value, toriEn) => ({ ...value, tori_en: toriEn }),
    checkFields: talkLessonCheckFields,
    check: (value, hits) => applyTalkLessonChecks(value, hits, input),
    soundFixed: lessonSoundFixedOf,
    stuckOf: (aiStuck, childKind) =>
      effectiveStuckOf({
        aiStuck,
        childKind: childKindOf(childKind),
        child: input.turn.child,
        input: input.turn.input,
        sceneWords: talkSceneWordsOf(input),
        // 같은 소리로 들린 장면 낱말('See.' ↔ sea)도 막힘이 아니다(13절 C217 (1) — 정규화와 같은 판정)
        ...(input.homophones === undefined
          ? {}
          : { homophones: input.homophones }),
      }),
  };
}

/**
 * 회화 턴 보낼 규격의 상한(기술 값 — 2026-11-06 실호출 탐침에서 받은 꼴: $ref 없는 펼친 꼴 5,785 · 5,799자, 설명을 늘린 펼친 꼴 6,502자 모두 OK ·
 * 칸 서른). 문법 한도는 글자 수가 아니라 규격 꼴($ref · 칸 · 중첩)로 정해지므로 이 값은 '탐침으로 받은 크기를 넘지 않게'의 울타리다(받은 가장 큰
 * 꼴 6,502자 아래). 칸을 더하거나 규격을 키우면 단위 시험이 걸리고, 그때 탐침을 다시 한다.
 */
export const TALK_OUTPUT_SCHEMA_MAX_CHARS = 6500;
export const TALK_OUTPUT_SCHEMA_MAX_PROPS = 30;

/**
 * 회화 턴 응답 규격의 보낼 꼴(구조화 출력 format): SDK 도우미의 JSON 스키마에서 $defs · $ref 를 펼친다(대본 3회차 400 'compiled grammar is too
 * large' — $ref 꼴은 API 문법 한도를 넘고 펼친 꼴은 받는다, core/ai/inline-refs). 검증은 그대로 Zod 규격(wireSchema)으로 한다 — 보낼 꼴은 같은
 * 규격에서 만들어 칸 · 필수 칸이 같다.
 */
export function talkOutputFormatOf(wireSchema: unknown): {
  type: "json_schema";
  schema: Record<string, unknown>;
} {
  const { schema } = zodOutputFormat(
    wireSchema as Parameters<typeof zodOutputFormat>[0],
  );
  return {
    type: "json_schema",
    schema: inlineJsonSchemaRefs(schema as Record<string, unknown>),
  };
}

function bodyOf<O>(built: BuiltRequest<O>) {
  return {
    ...built.body,
    output_config: {
      ...built.body.output_config,
      format: talkOutputFormatOf(built.wireSchema),
    },
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
 * 새 꼴 회화 수업 턴 · 끝맺음 턴의 흘려 받기 — 시도 · 흘려 보내기 · 정규화 · 출력 검사(DB 없음). 첫 문장 전 연결 · 타임아웃이면 1회 다시,
 * Haiku 첫 문장 전 거절이면 다른 모델로 1회, 첫 문장 뒤 실패는 보낸 문장을 두고 닫는다(stream.ts talkAttemptNext). 기다림은 startedAt 부터
 * 타임아웃의 두 배까지.
 */
export async function streamTalkLesson(
  plan: TalkLessonStreamPlan,
): Promise<TalkLessonOutcome> {
  return streamCore({ ...plan, kit: lessonKit(plan) });
}

async function streamCore<I, O, R>(
  plan: StreamCore<I, O, R>,
): Promise<TalkOutcomeOf<O>> {
  const { input, spec, rules, clock, kit } = plan;
  const closing = kit.closing;
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
      safeLine: kit.safeLine,
      sentenceMaxWords: kit.sentenceMaxWords,
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
    // 막힘 판단은 시도마다 한 번만 알린다 — 흘려 받는 동안 읽었거나, 못 읽었으면 응답 끝에서 내보내기 전에(C127 · rev-p13b N-1)
    let stuckTold = false;
    const tellStuck = (stuck: boolean, childKind?: unknown) => {
      if (stuckTold) return;
      stuckTold = true;
      const seen = kit.stuckOf ? kit.stuckOf(stuck, childKind) : stuck;
      plan.onStuck?.(seen, seen !== stuck);
    };
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
          if (stuck !== undefined) tellStuck(stuck, reader.childKind());
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
          tellStuck,
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
async function finishTalk<I, O, R>(
  plan: StreamCore<I, O, R>,
  s: {
    message: TalkMessage;
    reader: ReturnType<typeof createToriEnReader>;
    streaming: boolean;
    emit: (sentence: string) => void;
    /** 막힘 판단 알리기(시도에서 아직 알리지 않았을 때만 부른다). */
    tellStuck: (stuck: boolean, childKind?: unknown) => void;
    gate: () => ToriSentenceGate;
    firstSentenceMs: () => number | null;
    answered: TalkAttemptRecord;
    retriedOtherModel: boolean;
  },
): Promise<TalkOutcomeOf<O>> {
  const { spec, input, rules, kit } = plan;
  const closing = kit.closing;
  const prepared = parsedAnswer(s.message);
  let streamed = false;
  if (s.streaming) {
    // 흘려 받는 동안 막힘 판단을 읽지 못했으면(앞 칸이 stuck · tori_en 이 아님) 응답 전체의 값을 먼저 알린다 — 잡아 둘 짝이
    // 맞아야 같은 답을 두 번 읽지 않는다(C125 (3) · C127 · rev-p13b N-1)
    const head = prepared as
      | { stuck?: unknown; child_kind?: unknown }
      | undefined;
    const stuck = head?.stuck;
    if (typeof stuck === "boolean") s.tellStuck(stuck, head?.child_kind);
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
    await plan.record({
      ...s.answered,
      status: "validation_failed",
      errorCode: closing ? null : talkLessonInvalidReasonOf(prepared),
    }); // 읽지 못한 까닭(대본 회차 r1 판정 I-3 (가))
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
  const shown: O = closing
    ? value
    : kit.withToriEn(value, gate.sent().join(" "));
  const hits = checkOutputFields(kit.checkFields(shown), {
    forbidden: plan.forbidden,
    sentenceMaxWords: kit.sentenceMaxWords,
  });
  const checked = kit.check(shown, hits);
  const blocked = gate.blocked();
  const changed = checked.changed || blocked.length > 0;
  // 새 꼴: 엄격 규격은 소리 줄 범위를 보지 않아 정규화가 바꾼 턴이 '성공'으로 남지 않게 한다(묶음 6 검토 8절 (라))
  const soundFixed = kit.soundFixed?.(
    strict ?? prepared,
    checked.value,
    gate.sent(),
  );
  const fixed =
    soundFixed !== undefined &&
    (soundFixed.model || soundFixed.choices || soundFixed.overlap === true);
  await plan.record({
    ...s.answered,
    status:
      strict !== null && !changed && !fixed ? "success" : "validation_failed",
    // 1~3단계 막힘 응답의 빈 tori_en 을 반응 지워진 막힘 차례로 받은 턴(컨트롤러 결정 2026-11-07)
    errorCode: emptyToriEnStuckOf(prepared, closing)
      ? EMPTY_TORI_EN_STUCK
      : null,
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
    ...(soundFixed === undefined ? {} : { soundFixed }),
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

const fail = <O>(reason: AiFailureReason, refusals = 0): TalkOutcomeOf<O> => ({
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
 * 새 꼴 회화 수업 턴 · 끝맺음 턴 하나(회화 plan 묶음 8 — runAiCall 과 같은 앞머리). 설정 문제 · 목록 없음 · 키 없음은 config(행 없음),
 * 하루 안전 상한이면 safety_cap 행 하나(스트림 없음). 맥락과 입력의 단계가 다르면 호출부 결함으로 던진다. 안전한 대사는
 * 부르는 쪽이 카드에서 고른다(TalkLessonCardView 에는 그 칸이 없다).
 */
export async function runTalkLessonCall(
  spec: CallSpec<TalkLessonInput, TalkLessonOutput, TalkLessonRules>,
  input: TalkLessonInput,
  ctx: TalkCallContext & { safeLine: string },
  deps: TalkDeps = {},
): Promise<TalkLessonOutcome> {
  return runCallCore(spec, input, ctx, deps, () =>
    lessonKit({ input, safeLine: ctx.safeLine }),
  );
}

/** 새 꼴 회화 수업 턴(문장마다 흘려 보냄 — onSentence 는 던지지 않는다). */
export function talkLessonTurn(
  input: TalkLessonInput,
  ctx: TalkCallContext & {
    onSentence: (sentence: string) => void;
    safeLine: string;
  },
  deps?: TalkDeps,
): Promise<TalkLessonOutcome> {
  return runTalkLessonCall(talkLessonTurnSpec, input, ctx, deps);
}

/** 새 꼴 끝맺음 턴(같은 규격 · 같은 대화, 흘려 보내지 않는다 — 6.1 · C21). */
export function talkLessonClosing(
  input: TalkLessonInput,
  ctx: Omit<TalkCallContext, "onSentence"> & { safeLine: string },
  deps?: TalkDeps,
): Promise<TalkLessonOutcome> {
  if (!input.turn.closing)
    throw new RangeError("끝맺음 턴 입력은 turn.closing 이 참이어야 한다");
  return runTalkLessonCall(talkLessonClosingSpec, input, ctx, deps);
}

async function runCallCore<I extends { level: number }, O, R>(
  spec: CallSpec<I, O, R>,
  input: I,
  ctx: TalkCallContext,
  deps: TalkDeps,
  kitOf: () => StreamKit<O>,
): Promise<TalkOutcomeOf<O>> {
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
    return fail<O>("config");
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
    // 닫힘 기록 한 행의 실패가 safety_cap 길을 서버 실패로 바꾸지 않는다(rev-p13b N-4 — M-1 과 같은 꼴)
    await keepTurnOnRecordFailure(async (row) => {
      await insertAiCall(db, { ...baseRow, ...row });
    }, "회화 안전 상한 기록")({
      ...emptyRecord(config.model, t0),
      status: "safety_cap",
    });
    return fail<O>("safety_cap");
  }

  let forbidden: ForbiddenList;
  let metaPhrases: readonly string[];
  let rules: R;
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
    return fail<O>("config");
  }
  const contactPatterns = forbidden.patterns
    .filter((p) => p.category === "contact")
    .map((p) => p.regex);
  const masker = await maskerFor(db, ctx.profileId, contactPatterns);
  ctx.onPrepared?.();

  return streamCore({
    spec,
    input,
    rules,
    kit: kitOf(),
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
        await insertAiCall(db, {
          ...baseRow,
          ...row,
          errorCode: taggedErrorCode(row.errorCode, ctx.recordTag),
        });
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

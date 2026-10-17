import "server-only";
// AI 호출 하나의 실행 흐름(6.1 · 6.4 끝 문단 · 8절 상황 표 · C1 · C15 · C17 · C21 · C63, plan-p09c 파일별 값 4).
// 설정 읽기 → 학습일 → 단가표 · 조합 → 호출 앞 판정 → 시드 목록 · 이름 가림 → 요청 본문 → 시도(많아야 둘)
// → 비용 셈 · 기록 → 정규화 · 출력 검사 → 결과. 시도 하나 = ai_calls 행 하나, 상태는 그 시도에서 본 것이다.
// 아이 이름 · 프롬프트 · 응답 본문은 로그 · 오류 · 기록 어디에도 쓰지 않는다. 시각은 deps.clock 에서만 읽는다.
// 회화 턴(1-나)의 '첫 문장 전 타임아웃도 1회 다시'(검토 review-p09a P9c 5)는 스트리밍 길에서 정하고 여기서는 짜지 않는다.
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { eq, inArray, lte, sql } from "drizzle-orm";
import { ZodError, z } from "zod";
import {
  answerTextOf,
  CallSettingError,
  type SettingValues as CallSettingValues,
  type CallSpec,
  type LevelContext,
  prepareAnswer,
} from "@/core/ai/calls/common";
import {
  aiSettingSchemasOf,
  ComboError,
  REALTIME_PURPOSES,
  requestConfigOf,
} from "@/core/ai/combo";
import {
  billedAttemptsOf,
  costOf,
  type MessageLike,
  PRICE_MISSING_MODEL,
  type PriceBook,
} from "@/core/ai/cost";
import { preCallGate } from "@/core/ai/cost-alert";
import { classifyFailure, type FailureReason } from "@/core/ai/failure";
import { createMasker, type Masker, nameVariantsOf } from "@/core/ai/mask";
import { checkOutputFields } from "@/core/ai/output-check";
import { buildAiRequest } from "@/core/ai/request";
import { learningDayOf } from "@/core/learning-day";
import {
  AI_ATTEMPTS_MAX,
  AI_WAIT_TIMEOUT_MULTIPLE,
} from "@/core/seed/structure";
import { vocab } from "@/db/schema/content";
import { profiles } from "@/db/schema/learning";
import {
  AiConfigError,
  getAnthropicClient,
  sendAttempt,
} from "@/server/ai/client";
import {
  type AiCallRow,
  createAlertOnce,
  dailyUsage,
  insertAiCall,
  loadPriceBook,
  sameErrorCount,
} from "@/server/ai/store";
import { now } from "@/server/clock";
import { type Db, getDb } from "@/server/db";
import {
  getOutputCheckLists,
  type OutputCheckLists,
  SeedListError,
} from "@/server/seed-lists";
import {
  appDayStartHourSchema,
  appTimezoneSchema,
  getSettings,
  SettingInvalidError,
  SettingMissingError,
} from "@/server/settings";

/** 둘째 시도를 보낼 최소 남은 시간(기술 값 1초, plan-p09c 값 4 의 6). */
const MIN_RETRY_MS = 1000;
/** 한 시도의 타임아웃 하한(0 이 SDK 의 '기본 타임아웃'으로 읽히지 않게, 기술 값). */
const MIN_ATTEMPT_TIMEOUT_MS = 1;
/** 막힌 · 실패한 시도의 비용 글. */
const ZERO_COST = "0.000000";
/** '호출 설정 확인 필요' 알림 종류(값 2 AI_ALERT_KINDS). */
const CALL_CONFIG_CHECK = "call_config_check";
const DOWN_AFTER_FAILURES_KEY = "ai.down_after_failures";

/** 흐름이 늘 읽는 설정(12절). */
const BASE_SETTING_SCHEMAS = {
  "app.timezone": appTimezoneSchema,
  "app.day_start_hour": appDayStartHourSchema,
  "ai.safety_daily_calls": z.int().min(1),
  "ai.safety_daily_cost_usd": z.number().positive(),
  [DOWN_AFTER_FAILURES_KEY]: z.int().min(1),
} as const;

// ── 결과 꼴(값 5 — index.ts 가 다시 내보낸다. 형 순환을 피하려고 여기에 둔다) ──

export type AiFailureReason =
  | "safety_cap"
  | FailureReason
  | "refusal"
  | "invalid"
  | "output_blocked"
  | "config";

export type AiOutcome<T> =
  | {
      ok: true;
      value: T;
      /** 엄격 규격을 지나지 못해 느슨한 규격 + 정규화로 받았다. */
      normalized: boolean;
      /** 출력 검사에 걸린 칸을 바꿨다. */
      checked: boolean;
      /** 생각 꺼내기: 다음 턴 history 의 assistant 글(P11 이 글자 그대로 저장, fillName 전). */
      historyEntry?: string;
    }
  | { ok: false; reason: AiFailureReason; refusals: number };

export type AiCallContext = {
  profileId: string | null;
  sessionId: string | null;
  level: number;
};

export type AiDeps = {
  db?: Db;
  clock?: () => Date;
  client?: () => Anthropic;
  lists?: () => OutputCheckLists;
};

const fail = (reason: AiFailureReason, refusals = 0) =>
  ({ ok: false, reason, refusals }) as const;

/** 서버 오류 기록 — 목적과 오류 이름만(값 · 아이 글 · 본문을 넣지 않는다). */
function logConfigProblem(purpose: string, error: unknown): void {
  const name = error instanceof Error ? error.name : typeof error;
  console.error(`[ai] ${purpose}: 설정 문제(${name})`);
}

function isConfigError(error: unknown): boolean {
  return (
    error instanceof SettingMissingError ||
    error instanceof SettingInvalidError ||
    error instanceof ComboError ||
    error instanceof ZodError ||
    error instanceof CallSettingError ||
    error instanceof SeedListError ||
    error instanceof AiConfigError
  );
}

/** 프로필 이름 변형 가운데 vocab 단어인 것을 한 질의로 가린 가림 함수(6.1 끝 문장). */
async function maskerFor(
  db: Db,
  profileId: string | null,
  contactPatterns: readonly string[],
): Promise<Masker> {
  const empty = { displayName: "", englishName: "", nickname: null };
  if (profileId === null) {
    return createMasker({
      names: empty,
      isVocabWord: () => false,
      contactPatterns,
    });
  }
  const [row] = await db
    .select({
      displayName: profiles.displayName,
      englishName: profiles.englishName,
      nickname: profiles.toriNickname,
    })
    .from(profiles)
    .where(eq(profiles.id, profileId));
  const names = row ?? empty;
  const candidates = nameVariantsOf(names, () => false).map((v) =>
    v.toLowerCase(),
  );
  const vocabWords = new Set<string>();
  if (candidates.length > 0) {
    const found = await db
      .select({ word: vocab.word })
      .from(vocab)
      .where(inArray(sql`lower(${vocab.word})`, candidates));
    for (const { word } of found) vocabWords.add(word.toLowerCase());
  }
  return createMasker({
    names,
    isVocabWord: (variant) => vocabWords.has(variant.toLowerCase()),
    contactPatterns,
  });
}

/** 그 단계 어휘 범위의 낱말(소문자) — 생각 꺼내기 단어 정규화(정할 것 마)가 쓴다. */
export async function allowedWordsOf(
  db: Db,
  level: number,
): Promise<ReadonlySet<string>> {
  const rows = await db
    .select({ word: vocab.word })
    .from(vocab)
    .where(lte(vocab.bandLevel, level));
  return new Set(rows.map((r) => r.word.toLowerCase()));
}

/** 대체 모델이 답했거나 단가가 없을 때의 서버 경고(요청 번호 · 목적 · 모델 · 거절 분류만, 본문 없음). */
function warnAnswer(
  message: MessageLike,
  info: {
    requestId: string | null;
    purpose: string;
    requested: string;
    priceMissing: boolean;
    book: PriceBook;
  },
): void {
  const hops = message.content
    .filter((b) => b.type === "fallback")
    .map((b) => {
      const block = b as unknown as {
        from?: { model?: string };
        to?: { model?: string };
        trigger?: { category?: string | null };
      };
      return {
        from: block.from?.model ?? null,
        to: block.to?.model ?? null,
        category: block.trigger?.category ?? null,
      };
    });
  console.warn(
    `[ai] ${JSON.stringify({
      requestId: info.requestId,
      purpose: info.purpose,
      requested: info.requested,
      answered: message.model,
      hops,
      priceMissing: info.priceMissing,
      // '0 으로 셌다'가 보이게(검토 review-p09a P9c 2)
      priceMissingModelInBook: info.book.has(PRICE_MISSING_MODEL),
    })}`,
  );
}

/**
 * 호출 하나를 실행한다. 설정 문제 · 목록 없음 · 키 없음은 `config`(행 없음).
 * 생각 꺼내기 턴 번호 어긋남 · 목적 불일치 같은 호출부 결함(RangeError)은 서버 오류로 그대로 던진다(행 없음, 검토 review-p09b-2 P9c 3).
 */
export async function runAiCall<I extends LevelContext, O, R>(
  spec: CallSpec<I, O, R>,
  input: I,
  ctx: AiCallContext,
  deps: AiDeps = {},
): Promise<AiOutcome<O>> {
  const db = deps.db ?? getDb();
  const clock = deps.clock ?? now;
  const purpose = spec.purpose;
  if (ctx.level !== input.level) {
    throw new RangeError(
      `호출 맥락의 단계(${ctx.level})와 입력의 단계(${input.level})가 다르다`,
    );
  }

  // 1 · 2. 설정 · 학습일 · 단가표 · 조합
  const t0 = clock();
  let values: CallSettingValues;
  let learningDay: string;
  let book: PriceBook;
  let config: ReturnType<typeof requestConfigOf>;
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
    book = await loadPriceBook(db, learningDay);
    config = requestConfigOf({ purpose, level: ctx.level, values, book });
  } catch (error) {
    if (!isConfigError(error)) throw error;
    logConfigProblem(purpose, error);
    return fail("config");
  }
  const safetyDailyCalls = values["ai.safety_daily_calls"] as number;
  const safetyDailyCostUsd = values["ai.safety_daily_cost_usd"] as number;
  const downAfterFailures = values[DOWN_AFTER_FAILURES_KEY] as number;

  const baseRow = {
    profileId: ctx.profileId,
    sessionId: ctx.sessionId,
    learningDay,
    purpose,
    requestedModel: config.model,
  };
  const record = (
    row: Partial<AiCallRow> & Pick<AiCallRow, "status" | "calledAt">,
  ) =>
    insertAiCall(db, {
      answeredModel: null,
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      costUsd: ZERO_COST,
      priceMissing: false,
      latencyMs: null,
      errorCode: null,
      ...baseRow,
      ...row,
    });

  // 3. 호출 앞 판정(하루 안전 상한, 6.1 · 8절 · C15)
  const usage = await dailyUsage(db, {
    profileId: ctx.profileId,
    learningDay,
  });
  const gate = preCallGate(usage, { safetyDailyCalls, safetyDailyCostUsd });
  if (!gate.allowed) {
    await record({ status: "safety_cap", calledAt: t0 });
    return fail("safety_cap");
  }

  // 4 · 5. 목록 · 가림 · 규칙 · 요청 본문 · 클라이언트
  let lists: OutputCheckLists;
  let rules: R;
  let client: Anthropic;
  try {
    lists = (deps.lists ?? getOutputCheckLists)();
    rules = spec.rulesOf(values, input);
    client = (deps.client ?? getAnthropicClient)();
  } catch (error) {
    if (!isConfigError(error)) throw error;
    logConfigProblem(purpose, error);
    return fail("config");
  }
  const contactPatterns = lists.forbidden.patterns
    .filter((p) => p.category === "contact")
    .map((p) => p.regex);
  const masker = await maskerFor(db, ctx.profileId, contactPatterns);
  const built = buildAiRequest(spec, input, { config, masker, rules });
  const { type, schema } = zodOutputFormat(built.wireSchema);
  const body = {
    ...built.body,
    output_config: { ...built.body.output_config, format: { type, schema } },
  };

  // 6. 시도(많아야 둘, 기다림은 타임아웃의 두 배까지)
  const timeoutMs = built.timeoutMs;
  const deadline = t0.getTime() + AI_WAIT_TIMEOUT_MULTIPLE * timeoutMs;
  const realtime = (REALTIME_PURPOSES as readonly string[]).includes(purpose);
  let lastPrepared: unknown;

  /** 10. 출력 검사 · 걸린 칸 바꾸기. 이 시도 행의 상태와 결과를 돌려준다(행은 부르는 쪽이 남긴다). */
  const finish = (
    value: O,
    strictPassed: boolean,
  ): { status: "success" | "validation_failed"; outcome: AiOutcome<O> } => {
    const hits = checkOutputFields(spec.checkFields(value), {
      forbidden: lists.forbidden,
      sentenceMaxWords: input.sentenceMaxWords,
    });
    const checked = spec.applyChecks(value, hits, input);
    const status =
      strictPassed && !checked.changed ? "success" : "validation_failed";
    if (checked.fatal) return { status, outcome: fail("output_blocked") };
    const historyEntry = spec.historyEntry?.(checked.value);
    return {
      status,
      outcome: {
        ok: true,
        value: checked.value,
        normalized: !strictPassed,
        checked: checked.changed,
        ...(historyEntry === undefined ? {} : { historyEntry }),
      },
    };
  };

  for (let attempt = 1; attempt <= AI_ATTEMPTS_MAX; attempt++) {
    const calledAt = clock();
    const remaining = deadline - calledAt.getTime();
    const result = await sendAttempt(
      client,
      {
        body,
        betas: built.betas,
        timeoutMs: Math.max(
          MIN_ATTEMPT_TIMEOUT_MS,
          Math.min(timeoutMs, remaining),
        ),
      },
      { now: clock },
    );
    const canRetry = () =>
      attempt < AI_ATTEMPTS_MAX && deadline - clock().getTime() >= MIN_RETRY_MS;

    // 7. 실패
    if (!result.ok) {
      const failure = classifyFailure(result.failure);
      await record({
        status: failure.status,
        errorCode: failure.errorCode,
        latencyMs: result.latencyMs,
        calledAt,
      });
      if (failure.reason === "same_error") {
        const count = await sameErrorCount(db, { purpose, learningDay });
        if (count >= downAfterFailures) {
          await createAlertOnce(db, {
            kind: CALL_CONFIG_CHECK,
            profileId: null,
            thresholdKey: `${DOWN_AFTER_FAILURES_KEY}:${purpose}`,
            learningDay,
            value: {
              purpose,
              model: config.model,
              errorCode: failure.errorCode,
            },
            createdAt: clock(),
            once: "day",
          });
        }
      }
      // 응답 전 연결 실패만, 대화형 호출에서만 1회 다시 보낸다(첨삭은 응답 뒤 호출 — 다음 앱 진입에 P11 이 부른다)
      if (failure.retryConnection && realtime && canRetry()) continue;
      // 둘째 시도가 응답 전에 어떤 실패(타임아웃 · 연결 · 서버 · 한도 · 콘솔 한도 · 계정 · 같은 오류)로 끝나든
      // 첫 시도의 다듬은 값이 있으면 느슨한 규격으로 받아 정규화해 쓴다(C69 — 거절만 예외, C63 (2)).
      // 행은 이 실패 행까지이고 그 실패 갈래를 그대로 남긴다(1-나의 쉬는 중 판정은 행으로 한다)
      if (lastPrepared !== undefined) {
        const value = spec.normalize(lastPrepared, input, rules);
        if (value !== null) return finish(value, false).outcome;
      }
      return fail(failure.reason);
    }

    // 8. 응답 — 비용 셈 · 경고 · 거절
    const message = result.message as unknown as MessageLike;
    const cost = costOf(billedAttemptsOf(message, config.model), book);
    if (message.model !== config.model || cost.priceMissing) {
      warnAnswer(message, {
        requestId: result.requestId,
        purpose,
        requested: config.model,
        priceMissing: cost.priceMissing,
        book,
      });
    }
    const answered = {
      answeredModel: message.model,
      inputTokens: cost.tokens.input,
      outputTokens: cost.tokens.output,
      cacheWriteTokens: cost.tokens.cacheWrite,
      cacheReadTokens: cost.tokens.cacheRead,
      costUsd: cost.costUsd,
      priceMissing: cost.priceMissing,
      latencyMs: result.latencyMs,
      calledAt,
    };
    if (message.stop_reason === "refusal") {
      // 거절은 즉시 다시 요청하지 않는다(C63 (2))
      await record({ ...answered, status: "refusal" });
      return fail("refusal", 1);
    }

    // 9. stop_reason 을 먼저 보고, 글 → JSON → 다듬기 → 엄격 규격 + 검증
    let prepared: unknown;
    try {
      prepared = prepareAnswer(
        JSON.parse(answerTextOf(result.message)),
        spec.enumPaths,
      );
      lastPrepared = prepared;
    } catch {
      prepared = undefined;
    }
    let strict: O | null = null;
    if (message.stop_reason === "end_turn" && prepared !== undefined) {
      const wire = built.wireSchema.safeParse(prepared);
      if (wire.success && spec.validate(wire.data, input, rules).length === 0) {
        strict = wire.data;
      }
    }
    let value: O | null;
    if (strict !== null) {
      // 엄격을 지나도 정규화를 거친다(첫 줄 · 첫 문장 · 단어 규칙 · 마지막 턴 끝냄, 검토 review-p09b P9c 1)
      value = spec.normalize(strict, input, rules);
    } else if (canRetry()) {
      await record({ ...answered, status: "validation_failed" });
      continue;
    } else {
      value =
        lastPrepared === undefined
          ? null
          : spec.normalize(lastPrepared, input, rules);
    }
    if (value === null) {
      await record({ ...answered, status: "validation_failed" });
      return fail("invalid");
    }

    // 10. 출력 검사 · 걸린 칸 바꾸기
    const { status, outcome } = finish(value, strict !== null);
    await record({ ...answered, status });
    return outcome;
  }
  // 시도 상한 안에서 언제나 돌아간다(위 반복의 마지막 시도는 continue 하지 않는다)
  throw new Error("AI 시도 반복이 결과 없이 끝났다");
}

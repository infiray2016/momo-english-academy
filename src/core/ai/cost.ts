// 비용 셈(6.1 · 5절 · 6.6 · C56 (2) · C63 (5), plan-p09a 파일별 값 5).
// 과금 시도 뽑기(iterations · 거절 과금) · 단가 고르기 · 단가 찾기 · 정수 셈(마이크로달러).
// SDK 형을 가져오지 않고 응답의 필요한 칸만 구조로 받는다. 부동소수로 돈을 더하지 않는다.
import { capabilitiesOf, type ModelCapabilities } from "@/core/ai/combo";
import type { ModelPricesFile } from "@/core/seed/schema/reference";

/** 출력 전 거절이 과금되는 분류(6.1 · 확인한 사실 2). */
export const BILLED_REFUSAL_CATEGORIES = [
  "bio",
  "frontier_llm",
  "reasoning_extraction",
] as const;
/** 단가표에 없는 모델을 셀 단가(6.1). */
export const PRICE_MISSING_MODEL = "claude-opus-4-8";

/** 단가 글(numeric(10,4))의 소수 자리. */
const PRICE_SCALE = 4;
/** 비용 글(numeric(12,6), 마이크로달러)의 소수 자리. */
const COST_SCALE = 6;
/** 토큰 × 단가4 → 마이크로달러로 나누는 수(10^(4 + 6 − 6) = 10^4: 단가는 100만 토큰당이라 10^6 이 상쇄된다). */
const PRICE4_TO_MICROS_DIVISOR = 10 ** PRICE_SCALE;
const DECIMAL = /^(\d+)(?:\.(\d+))?$/;

// ── 응답 꼴(구조로만) ────────────────────────────────────────────

export type IterationLike = {
  type: string;
  model?: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

export type UsageLike = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  iterations?: readonly IterationLike[] | null;
};

export type ContentBlockLike = {
  type: string;
  trigger?: { category?: string | null } | null;
};

export type MessageLike = {
  model: string;
  stop_reason: string | null;
  stop_details?: { category?: string | null } | null;
  content: readonly ContentBlockLike[];
  usage: UsageLike;
};

export type TokenCounts = {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
};

export type BilledAttempt = TokenCounts & { model: string };

// ── 정수 셈 ──────────────────────────────────────────────────────

function parseDecimal(text: string, scale: number): number {
  const match = DECIMAL.exec(text.trim());
  if (!match) throw new RangeError(`0 이상 소수 글이 아니다: ${text}`);
  const [, whole = "0", frac = ""] = match;
  if (frac.length > scale) {
    throw new RangeError(`소수 자리가 ${scale} 보다 많다: ${text}`);
  }
  const value =
    Number(whole) * 10 ** scale + Number(frac.padEnd(scale, "0") || "0");
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`정수로 셀 수 없는 값이다: ${text}`);
  }
  return value;
}

/** 단가 글(numeric(10,4))을 1만 배 정수로. */
export function parseUsd4(text: string): number {
  return parseDecimal(text, PRICE_SCALE);
}

/** 마이크로달러 정수 → 소수 여섯 자리 글(ai_calls.cost_usd numeric(12,6)). */
export function formatUsd6(micros: number): string {
  if (!Number.isSafeInteger(micros) || micros < 0) {
    throw new RangeError(`마이크로달러는 0 이상 정수다: ${micros}`);
  }
  const unit = 10 ** COST_SCALE;
  const whole = Math.floor(micros / unit);
  const frac = String(micros % unit).padStart(COST_SCALE, "0");
  return `${whole}.${frac}`;
}

/** 달러 수(설정값 등) → 마이크로달러 정수. 소수 여섯 자리 글을 거쳐 부동소수 오차를 버린다. */
export function usdToMicros(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) {
    throw new RangeError(`달러는 0 이상 수다: ${usd}`);
  }
  return parseDecimal(usd.toFixed(COST_SCALE), COST_SCALE);
}

/** DB 합(`sum(cost_usd)::text`, 행이 없으면 null) → 마이크로달러 정수. */
export function sumToMicros(text: string | null): number {
  return text === null ? 0 : parseDecimal(text, COST_SCALE);
}

/** 정수 나눗셈의 반 올림(0 이상). */
function divideRoundHalfUp(numerator: number, divisor: number): number {
  const quotient = Math.floor(numerator / divisor);
  const remainder = numerator - quotient * divisor;
  return remainder * 2 >= divisor ? quotient + 1 : quotient;
}

// ── 과금 시도 ────────────────────────────────────────────────────

function isBilledRefusal(category: string | null | undefined): boolean {
  return (
    BILLED_REFUSAL_CATEGORIES as readonly (string | null | undefined)[]
  ).includes(category);
}

function attemptOf(model: string, u: IterationLike | UsageLike): BilledAttempt {
  return {
    model,
    input: u.input_tokens,
    output: u.output_tokens,
    cacheWrite: u.cache_creation_input_tokens ?? 0,
    cacheRead: u.cache_read_input_tokens ?? 0,
  };
}

/**
 * 과금되는 시도 목록(6.1 · 확인한 사실 2 'iterations 가 과금 기록, top-level 은 답한 시도만').
 * iterations 가 있으면 message · fallback_message 항목만 시도로 본다(모델이 비면 요청 모델).
 * 대체 모델로 넘어간 홉은 차례대로 응답 내용의 fallback 블록과 짝짓고(위험 3, 추측),
 * 그 홉의 출력이 0 이고 분류가 과금 목록 밖이면 뺀다. 마지막 응답이 거절이고 그 시도의 출력이 0 이며
 * stop_details.category 가 과금 목록 밖이면 그 시도도 뺀다. 캐시 쓰기는 5분 쓰기만 쓴다(1시간 캐시는 걸지 않는다).
 */
export function billedAttemptsOf(
  message: MessageLike,
  requestedModel: string,
): BilledAttempt[] {
  const iterations = message.usage.iterations;
  const hops: BilledAttempt[] =
    iterations && iterations.length > 0
      ? iterations
          .filter(
            (it) => it.type === "message" || it.type === "fallback_message",
          )
          .map((it) => attemptOf(it.model ?? requestedModel, it))
      : [attemptOf(message.model, message.usage)];

  const handoffs = message.content.filter((block) => block.type === "fallback");
  const lastIndex = hops.length - 1;
  return hops.filter((hop, index) => {
    if (hop.output > 0) return true;
    if (index < handoffs.length) {
      return isBilledRefusal(handoffs[index]?.trigger?.category);
    }
    if (index === lastIndex && message.stop_reason === "refusal") {
      return isBilledRefusal(message.stop_details?.category);
    }
    return true;
  });
}

// ── 단가표 ───────────────────────────────────────────────────────

export type PriceEntry = {
  input4: number;
  output4: number;
  cacheWrite4: number;
  cacheRead4: number;
  caps: ModelCapabilities;
};

/** 모델 → 그날 쓰는 단가 줄. combo 의 ComboBook 꼴을 넓힌다. */
export type PriceBook = Map<string, PriceEntry>;

/** 단가 줄(DB 의 numeric 글 또는 시드 파일의 수). */
export type PriceRowLike = {
  model: string;
  effectiveFrom: string;
  inputUsd: string | number;
  outputUsd: string | number;
  cacheWriteUsd: string | number;
  cacheReadUsd: string | number;
  caps: ModelCapabilities;
};

function price4Of(value: string | number): number {
  return parseUsd4(
    typeof value === "number" ? value.toFixed(PRICE_SCALE) : value,
  );
}

/** 시드 파일(ModelPricesFile)의 칸 이름을 단가 줄 꼴로 바꾸고 조합 칸을 붙인다. */
export function priceRowsOfSeed(file: ModelPricesFile): PriceRowLike[] {
  return file.models.map((entry) => ({
    model: entry.model,
    effectiveFrom: entry.effectiveFrom,
    inputUsd: entry.inputUsdPerMTok,
    outputUsd: entry.outputUsdPerMTok,
    cacheWriteUsd: entry.cacheWriteUsdPerMTok,
    cacheReadUsd: entry.cacheReadUsdPerMTok,
    caps: capabilitiesOf(entry),
  }));
}

/**
 * 단가 고르기 — 모델마다 effectiveFrom ≤ onDay 가운데 가장 늦은 줄(미래 줄은 뺀다).
 * 같은 (모델, 날짜) 줄이 둘이면 던진다. 날짜 고르기는 이 함수 하나다(store 는 줄을 읽기만 한다).
 */
export function priceBookOf(
  rows: readonly PriceRowLike[],
  onDay: string,
): PriceBook {
  const seen = new Set<string>();
  const latest = new Map<string, PriceRowLike>();
  for (const row of rows) {
    const key = JSON.stringify([row.model, row.effectiveFrom]);
    if (seen.has(key)) {
      throw new RangeError(
        `같은 모델 · 같은 적용일 단가 줄이 둘이다: ${row.model} ${row.effectiveFrom}`,
      );
    }
    seen.add(key);
    if (row.effectiveFrom > onDay) continue;
    const current = latest.get(row.model);
    if (!current || row.effectiveFrom > current.effectiveFrom) {
      latest.set(row.model, row);
    }
  }
  const book: PriceBook = new Map();
  for (const [model, row] of latest) {
    book.set(model, {
      input4: price4Of(row.inputUsd),
      output4: price4Of(row.outputUsd),
      cacheWrite4: price4Of(row.cacheWriteUsd),
      cacheRead4: price4Of(row.cacheReadUsd),
      caps: row.caps,
    });
  }
  return book;
}

const ZERO_PRICE = {
  input4: 0,
  output4: 0,
  cacheWrite4: 0,
  cacheRead4: 0,
} as const;

export type PriceLookup = {
  /** 쓴 단가. 단가 없음 모델 줄마저 없으면 null(0 단가로 센다 — 부르는 쪽이 서버 경고를 남긴다). */
  price: PriceEntry | null;
  missing: boolean;
};

/** 단가표에 있으면 그 줄, 없으면 PRICE_MISSING_MODEL 줄과 missing(6.1). */
export function priceOf(model: string, book: PriceBook): PriceLookup {
  const own = book.get(model);
  if (own) return { price: own, missing: false };
  return { price: book.get(PRICE_MISSING_MODEL) ?? null, missing: true };
}

export type Cost = {
  costUsd: string;
  costMicros: number;
  priceMissing: boolean;
  tokens: TokenCounts;
};

/** 과금 시도의 비용 · 토큰 합(6.1 · AC-8c). 뺀 시도는 비용 · 토큰 모두 0 이다. */
export function costOf(
  attempts: readonly BilledAttempt[],
  book: PriceBook,
): Cost {
  let sum4 = 0;
  let priceMissing = false;
  const tokens: TokenCounts = {
    input: 0,
    output: 0,
    cacheWrite: 0,
    cacheRead: 0,
  };
  for (const attempt of attempts) {
    const { price, missing } = priceOf(attempt.model, book);
    if (missing) priceMissing = true;
    const p = price ?? ZERO_PRICE;
    sum4 +=
      attempt.input * p.input4 +
      attempt.output * p.output4 +
      attempt.cacheWrite * p.cacheWrite4 +
      attempt.cacheRead * p.cacheRead4;
    tokens.input += attempt.input;
    tokens.output += attempt.output;
    tokens.cacheWrite += attempt.cacheWrite;
    tokens.cacheRead += attempt.cacheRead;
  }
  if (!Number.isSafeInteger(sum4)) {
    throw new RangeError("비용 합이 정수로 셀 수 있는 범위를 넘었다");
  }
  const costMicros = divideRoundHalfUp(sum4, PRICE4_TO_MICROS_DIVISOR);
  return {
    costUsd: formatUsd6(costMicros),
    costMicros,
    priceMissing,
    tokens,
  };
}

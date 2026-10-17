// 6.1 비용 · 단가 고르기 · 8절 실패 분류(plan-p09a 증명 표). 단가는 MODEL_PRICES_FIXTURE 에서 읽는다.
import { describe, expect, it } from "vitest";
import { capabilitiesOf } from "@/core/ai/combo";
import {
  BILLED_REFUSAL_CATEGORIES,
  billedAttemptsOf,
  costOf,
  formatUsd6,
  type MessageLike,
  PRICE_MISSING_MODEL,
  type PriceRowLike,
  parseUsd4,
  priceBookOf,
  priceOf,
  priceRowsOfSeed,
  sumToMicros,
  usdToMicros,
} from "@/core/ai/cost";
import {
  type AttemptFailure,
  CONSOLE_LIMIT_MESSAGE_PREFIX,
  classifyFailure,
  ENFORCED_SPEND_LIMIT_CODE,
  httpFailureOf,
} from "@/core/ai/failure";
import {
  consoleLimitBody,
  errorBody,
  messageBody,
} from "../fixtures/ai/fake-anthropic";
import {
  FIXTURE_EFFECTIVE_FROM,
  fixturePrice,
  MODEL_PRICES_FIXTURE,
} from "../fixtures/ai/model-prices";
import { TEST_SETTINGS } from "../fixtures/settings";

const SONNET = "claude-sonnet-5-5";
const SONNET_5 = "claude-sonnet-5";
const HAIKU = "claude-haiku-5-5";
const OPUS = "claude-opus-5-5";

const book = priceBookOf(
  priceRowsOfSeed(MODEL_PRICES_FIXTURE),
  FIXTURE_EFFECTIVE_FROM,
);

/** 토큰 × 단가(달러 / 100만 토큰) = 마이크로달러. 시험 기대값을 정수로 셈(단가4 = 단가 × 10⁴ 글에서). */
function micros(
  model: string,
  t: { i: number; o: number; w: number; r: number },
) {
  const p = fixturePrice(model);
  const p4 = (n: number) => parseUsd4(n.toFixed(4));
  const sum4 =
    t.i * p4(p.inputUsdPerMTok) +
    t.o * p4(p.outputUsdPerMTok) +
    t.w * p4(p.cacheWriteUsdPerMTok) +
    t.r * p4(p.cacheReadUsdPerMTok);
  return sum4 / 10_000;
}

function msg(args: Parameters<typeof messageBody>[0]): MessageLike {
  return messageBody(args) as unknown as MessageLike;
}

describe("6.1 비용", () => {
  it("6.1 비용: 단가표 단가로 토큰 넷을 센다(소수 여섯 자리, 부동소수 없음)", () => {
    const tokens = { i: 1234, o: 567, w: 89, r: 1000 };
    const message = msg({
      model: SONNET,
      json: {},
      usage: {
        input_tokens: tokens.i,
        output_tokens: tokens.o,
        cache_creation_input_tokens: tokens.w,
        cache_read_input_tokens: tokens.r,
      },
    });
    const attempts = billedAttemptsOf(message, SONNET);
    expect(attempts).toEqual([
      {
        model: SONNET,
        input: 1234,
        output: 567,
        cacheWrite: 89,
        cacheRead: 1000,
      },
    ]);
    const cost = costOf(attempts, book);
    // 1234×2 + 567×10 + 89×2.5 + 1000×0.1 = 8460.5 마이크로달러 → 반올림 8461
    expect(micros(SONNET, tokens)).toBe(8460.5);
    expect(cost.costUsd).toBe("0.008461");
    expect(cost.priceMissing).toBe(false);
    expect(cost.tokens).toEqual({
      input: 1234,
      output: 567,
      cacheWrite: 89,
      cacheRead: 1000,
    });

    // 부동소수로는 0.1 × 3 = 0.30000000000000004 다. 정수 셈은 글 그대로다
    expect(parseUsd4("0.1000")).toBe(1000);
    expect(parseUsd4("4")).toBe(40_000);
    expect(parseUsd4("0.125")).toBe(1250);
    expect(() => parseUsd4("0.12345")).toThrow();
    expect(() => parseUsd4("-1")).toThrow();
    expect(usdToMicros(0.1 + 0.2)).toBe(300_000);
    // 12절 ai.daily_cost_alert_usd(1.0) 같은 설정값도 정수로
    expect(usdToMicros(TEST_SETTINGS["ai.daily_cost_alert_usd"].value)).toBe(
      1_000_000,
    );
    expect(sumToMicros("12.345678")).toBe(12_345_678);
    expect(sumToMicros(null)).toBe(0);
    expect(formatUsd6(0)).toBe("0.000000");
    expect(formatUsd6(12_345_678)).toBe("12.345678");
    // 반 올림: Haiku 입력 5 토큰 × 0.1 = 0.5 마이크로달러 → 1
    expect(
      costOf(
        [{ model: HAIKU, input: 5, output: 0, cacheWrite: 0, cacheRead: 0 }],
        book,
      ).costUsd,
    ).toBe("0.000001");
  });

  it("6.1 비용: 대체 모델이 답하면 iterations 항목마다 그 모델 단가로 더한다", () => {
    // 문서 예시 꼴: 요청 모델이 출력 도중 거절(나온 만큼 과금) → 대체 모델이 답함
    const message = msg({
      model: SONNET_5,
      json: { ok: true },
      fallback: { from: SONNET, to: SONNET_5, category: "cyber" },
      usage: { input_tokens: 900, output_tokens: 300 },
      iterations: [
        {
          type: "message",
          model: SONNET,
          input_tokens: 1000,
          output_tokens: 40,
        },
        {
          type: "fallback_message",
          model: SONNET_5,
          input_tokens: 900,
          output_tokens: 300,
        },
      ],
    });
    const attempts = billedAttemptsOf(message, SONNET);
    expect(attempts).toEqual([
      { model: SONNET, input: 1000, output: 40, cacheWrite: 0, cacheRead: 0 },
      { model: SONNET_5, input: 900, output: 300, cacheWrite: 0, cacheRead: 0 },
    ]);
    const cost = costOf(attempts, book);
    const expected =
      micros(SONNET, { i: 1000, o: 40, w: 0, r: 0 }) +
      micros(SONNET_5, { i: 900, o: 300, w: 0, r: 0 });
    expect(cost.costUsd).toBe(formatUsd6(Math.round(expected)));
    expect(cost.tokens).toEqual({
      input: 1900,
      output: 340,
      cacheWrite: 0,
      cacheRead: 0,
    });
    // iterations 의 model 이 비면 요청 모델
    const blank = msg({
      model: SONNET,
      json: {},
      iterations: [
        { type: "message", model: null, input_tokens: 10, output_tokens: 5 },
      ],
    });
    expect(billedAttemptsOf(blank, SONNET)[0]?.model).toBe(SONNET);
  });

  it("6.1 비용: 단가표에 없는 모델은 claude-opus-4-8 단가와 단가 없음", () => {
    expect(PRICE_MISSING_MODEL).toBe("claude-opus-4-8");
    const unknown = "claude-mystery-9";
    const price = priceOf(unknown, book);
    expect(price.missing).toBe(true);
    expect(price.price).toEqual(book.get(PRICE_MISSING_MODEL));
    const cost = costOf(
      [
        {
          model: unknown,
          input: 1000,
          output: 100,
          cacheWrite: 0,
          cacheRead: 0,
        },
      ],
      book,
    );
    expect(cost.priceMissing).toBe(true);
    expect(cost.costUsd).toBe(
      formatUsd6(micros(PRICE_MISSING_MODEL, { i: 1000, o: 100, w: 0, r: 0 })),
    );
    expect(priceOf(OPUS, book).missing).toBe(false);
    // opus-4-8 줄마저 없으면 0 단가와 단가 없음
    const empty = priceBookOf([], FIXTURE_EFFECTIVE_FROM);
    const none = costOf(
      [
        {
          model: unknown,
          input: 1000,
          output: 100,
          cacheWrite: 0,
          cacheRead: 0,
        },
      ],
      empty,
    );
    expect(none).toMatchObject({ costUsd: "0.000000", priceMissing: true });
  });

  it("6.1 비용: 출력 전 거절은 bio · frontier_llm · reasoning_extraction 일 때만 세고 출력 도중 거절은 나온 만큼 센다", () => {
    expect([...BILLED_REFUSAL_CATEGORIES]).toEqual([
      "bio",
      "frontier_llm",
      "reasoning_extraction",
    ]);
    const refusal = (category: string | null, output: number) =>
      msg({
        model: HAIKU,
        json: {},
        stopReason: "refusal",
        stopDetails: { category: category as never },
        usage: { input_tokens: 500, output_tokens: output },
      });
    // 출력 전 거절
    for (const category of BILLED_REFUSAL_CATEGORIES) {
      expect(billedAttemptsOf(refusal(category, 0), HAIKU)).toHaveLength(1);
    }
    for (const category of ["cyber", "general_harms", null]) {
      const attempts = billedAttemptsOf(refusal(category, 0), HAIKU);
      expect(attempts).toEqual([]);
      expect(costOf(attempts, book)).toMatchObject({
        costUsd: "0.000000",
        tokens: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 },
      });
    }
    // 출력 도중 거절은 분류와 관계없이 나온 만큼
    expect(billedAttemptsOf(refusal("cyber", 12), HAIKU)).toEqual([
      { model: HAIKU, input: 500, output: 12, cacheWrite: 0, cacheRead: 0 },
    ]);

    // 대체 모델 재시도: 출력 전 거절 홉(과금 밖 분류)은 뺀다
    const hop = (category: "cyber" | "bio") =>
      msg({
        model: SONNET_5,
        json: {},
        fallback: { from: SONNET, to: SONNET_5, category },
        usage: { input_tokens: 900, output_tokens: 300 },
        iterations: [
          {
            type: "message",
            model: SONNET,
            input_tokens: 1000,
            output_tokens: 0,
          },
          {
            type: "fallback_message",
            model: SONNET_5,
            input_tokens: 900,
            output_tokens: 300,
          },
        ],
      });
    expect(billedAttemptsOf(hop("cyber"), SONNET).map((a) => a.model)).toEqual([
      SONNET_5,
    ]);
    expect(billedAttemptsOf(hop("bio"), SONNET).map((a) => a.model)).toEqual([
      SONNET,
      SONNET_5,
    ]);

    // 홉 셋 사슬(검토 M-2): 거절한 홉은 모두 message, 답한 마지막 홉만 fallback_message.
    // 첫 홉(cyber, 출력 0)은 빠지고 둘째 홉(bio, 출력 0)은 남는다
    const OPUS_5 = "claude-opus-5";
    const chain = msg({
      model: SONNET_5,
      json: {},
      fallback: [
        { from: SONNET, to: OPUS_5, category: "cyber" },
        { from: OPUS_5, to: SONNET_5, category: "bio" },
      ],
      usage: { input_tokens: 800, output_tokens: 200 },
      iterations: [
        {
          type: "message",
          model: SONNET,
          input_tokens: 1000,
          output_tokens: 0,
        },
        { type: "message", model: OPUS_5, input_tokens: 950, output_tokens: 0 },
        {
          type: "fallback_message",
          model: SONNET_5,
          input_tokens: 800,
          output_tokens: 200,
        },
      ],
    });
    expect(billedAttemptsOf(chain, SONNET)).toEqual([
      { model: OPUS_5, input: 950, output: 0, cacheWrite: 0, cacheRead: 0 },
      { model: SONNET_5, input: 800, output: 200, cacheWrite: 0, cacheRead: 0 },
    ]);
  });
});

describe("6.1 단가 고르기", () => {
  const caps = capabilitiesOf(fixturePrice(SONNET));
  const row = (
    effectiveFrom: string,
    inputUsd: string | number,
  ): PriceRowLike => ({
    model: SONNET,
    effectiveFrom,
    inputUsd,
    outputUsd: inputUsd,
    cacheWriteUsd: inputUsd,
    cacheReadUsd: inputUsd,
    caps,
  });

  it("6.1 단가 고르기: 모델마다 effectiveFrom 이 날짜 이하인 줄 가운데 가장 늦은 줄을 쓰고 미래 줄은 뺀다(시드 파일의 수 · DB 의 글 모두)", () => {
    for (const [old, mid, future] of [
      [1, 2, 3],
      ["1.0000", "2.0000", "3.0000"],
    ] as const) {
      const rows = [
        row("2026-01-01", old),
        row("2026-06-01", mid),
        row("2026-12-01", future),
      ];
      const picked = priceBookOf(rows, "2026-10-16").get(SONNET);
      expect(picked?.input4).toBe(parseUsd4("2"));
      // 적용일 당일은 그 줄
      expect(priceBookOf(rows, "2026-12-01").get(SONNET)?.input4).toBe(
        parseUsd4("3"),
      );
      // 모든 줄이 미래면 그 모델이 없다
      expect(priceBookOf(rows, "2025-12-31").has(SONNET)).toBe(false);
    }
  });

  it("6.1 단가 고르기: 같은 모델 · 같은 날짜 줄이 둘이면 던진다", () => {
    expect(() =>
      priceBookOf([row("2026-06-01", 1), row("2026-06-01", 2)], "2026-10-16"),
    ).toThrow();
  });

  it("6.1 단가 고르기: 시드 파일을 priceRowsOfSeed 로 바꾸면 같은 값의 DB 줄과 같은 단가표가 된다", () => {
    const dbRows: PriceRowLike[] = MODEL_PRICES_FIXTURE.models.map((m) => ({
      model: m.model,
      effectiveFrom: m.effectiveFrom,
      inputUsd: m.inputUsdPerMTok.toFixed(4),
      outputUsd: m.outputUsdPerMTok.toFixed(4),
      cacheWriteUsd: m.cacheWriteUsdPerMTok.toFixed(4),
      cacheReadUsd: m.cacheReadUsdPerMTok.toFixed(4),
      caps: capabilitiesOf(m),
    }));
    const fromDb = priceBookOf(dbRows, FIXTURE_EFFECTIVE_FROM);
    expect(fromDb).toEqual(book);
    expect(fromDb.size).toBe(MODEL_PRICES_FIXTURE.models.length);
  });
});

describe("8절 분류", () => {
  const http = (
    status: number,
    body: unknown,
    hasRetryAfter = false,
  ): AttemptFailure => httpFailureOf(status, body, hasRetryAfter);

  it("8절 분류: 한도 머리 400(조직 · 워크스페이스)과 enforced_spend_limit_reached 429 는 콘솔 한도", () => {
    expect(CONSOLE_LIMIT_MESSAGE_PREFIX).toBe(
      "You have reached your specified",
    );
    expect(ENFORCED_SPEND_LIMIT_CODE).toBe("enforced_spend_limit_reached");
    const workspace = consoleLimitBody("workspace");
    const organization = errorBody(
      400,
      "invalid_request_error",
      "You have reached your specified API usage limits. You will regain access on 2026-11-01 at 00:00 UTC.",
    );
    for (const body of [workspace.body, organization]) {
      expect(classifyFailure(http(400, body))).toEqual({
        reason: "console_limit",
        status: "limit",
        errorCode: "console_limit:400",
        retryConnection: false,
        countsTowardDown: false,
        rest: "console_limit",
      });
    }
    const tier = consoleLimitBody("tier");
    const failure = http(tier.status, tier.body);
    expect(failure).toMatchObject({
      kind: "http",
      status: 429,
      errorType: "rate_limit_error",
      errorCode: ENFORCED_SPEND_LIMIT_CODE,
      hasRetryAfter: false,
    });
    expect(classifyFailure(failure)).toEqual({
      reason: "console_limit",
      status: "limit",
      errorCode: "console_limit:429",
      retryConnection: false,
      countsTowardDown: false,
      rest: "console_limit",
    });
  });

  it("8절 분류: 401 · 402 · 403 은 계정 확인 필요", () => {
    for (const status of [401, 402, 403]) {
      expect(
        classifyFailure(http(status, errorBody(status, "x", "account"))),
      ).toEqual({
        reason: "account",
        status: "error",
        errorCode: `account:${status}`,
        retryConnection: false,
        countsTowardDown: false,
        rest: "account",
      });
    }
  });

  it("8절 분류: 한도 아닌 429 · 5xx · 529 · 타임아웃 · 연결 실패는 장애(이어진 실패 수에 듦)", () => {
    const rate = classifyFailure(
      http(429, errorBody(429, "rate_limit_error", "slow down"), true),
    );
    expect(rate).toMatchObject({
      reason: "rate_limit",
      status: "error",
      errorCode: "rate_limit:429",
      countsTowardDown: true,
      rest: null,
    });
    for (const status of [500, 504, 529]) {
      expect(
        classifyFailure(http(status, errorBody(status, "api_error", "boom"))),
      ).toMatchObject({
        reason: "server",
        status: "error",
        errorCode: `server:${status}`,
        countsTowardDown: true,
        rest: null,
      });
    }
    expect(classifyFailure({ kind: "timeout" })).toMatchObject({
      reason: "timeout",
      status: "timeout",
      errorCode: "timeout",
      countsTowardDown: true,
      rest: null,
    });
    expect(classifyFailure({ kind: "connection" })).toMatchObject({
      reason: "connection",
      status: "error",
      errorCode: "connection",
      countsTowardDown: true,
      rest: null,
    });
    // 본문이 없어도 상태로 나눈다
    expect(classifyFailure(http(502, undefined))).toMatchObject({
      reason: "server",
      errorCode: "server:502",
    });
  });

  it("8절 분류: 한도 아닌 400 · 404 · 413 과 정본 밖 4xx 는 다시 보내도 같은 오류(C17, 실패 수에 들지 않음)", () => {
    for (const status of [400, 404, 413, 409, 422]) {
      expect(
        classifyFailure(
          http(status, errorBody(status, "invalid_request_error", "bad")),
        ),
      ).toEqual({
        reason: "same_error",
        status: "error",
        errorCode: `same_error:${status}`,
        retryConnection: false,
        countsTowardDown: false,
        rest: null,
      });
    }
    // 429 라도 다른 오류 코드면 한도가 아니다
    expect(
      classifyFailure(
        http(
          429,
          errorBody(429, "rate_limit_error", "x", { error_code: "other" }),
        ),
      ).reason,
    ).toBe("rate_limit");
  });

  it("8절 분류: 연결 실패만 다시 보내기 대상이다", () => {
    const failures: AttemptFailure[] = [
      { kind: "timeout" },
      { kind: "connection" },
      ...[400, 401, 402, 403, 404, 413, 429, 500, 529].map((s) =>
        http(s, errorBody(s, "x", "y")),
      ),
      http(429, consoleLimitBody("tier").body),
    ];
    const retry = failures.filter((f) => classifyFailure(f).retryConnection);
    expect(retry).toEqual([{ kind: "connection" }]);
  });
});

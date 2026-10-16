// 6.1 · 5절 기록 · 단가표 · 하루 사용량 · C17 같은 오류 · 알림 한 번 · 가짜 HTTP 서버(plan-p09a 증명 표).
// 실제 API 를 부르지 않는다(가짜 서버는 로컬 포트). 숫자는 TEST_SETTINGS · MODEL_PRICES_FIXTURE 에서 읽는다.
import { and, eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { capabilitiesOf, requestConfigOf } from "@/core/ai/combo";
import {
  billedAttemptsOf,
  costOf,
  type MessageLike,
  priceBookOf,
  priceRowsOfSeed,
} from "@/core/ai/cost";
import { classifyFailure } from "@/core/ai/failure";
import { learningDayOf } from "@/core/learning-day";
import { modelPrices } from "@/db/schema/content";
import { profiles } from "@/db/schema/learning";
import { aiCalls, parentAlerts } from "@/db/schema/operations";
import { createAnthropicClient, sendAttempt } from "@/server/ai/client";
import {
  type AiCallRow,
  createAlertOnce,
  dailyUsage,
  insertAiCall,
  loadPriceBook,
  sameErrorCount,
} from "@/server/ai/store";
import { createDb } from "@/server/db";
import {
  errorBody,
  messageBody,
  startFakeAnthropicServer,
} from "../fixtures/ai/fake-anthropic";
import {
  FIXTURE_EFFECTIVE_FROM,
  fixturePrice,
  MODEL_PRICES_FIXTURE,
  seedModelPrices,
} from "../fixtures/ai/model-prices";
import { TEST_SETTINGS, testSettingValues } from "../fixtures/settings";
import { createTestDatabase, type TestDatabase } from "./test-db";

const SONNET = "claude-sonnet-5-5";
const SONNET_5 = "claude-sonnet-5";
const TIMEZONE = TEST_SETTINGS["app.timezone"].value;
const DAY_START_HOUR = TEST_SETTINGS["app.day_start_hour"].value;
/** 시험 시각(한국 시간 2026-10-20 15:00). */
const CALLED_AT = new Date("2026-10-20T06:00:00Z");
const DAY = learningDayOf(CALLED_AT, TIMEZONE, DAY_START_HOUR);
const OTHER_DAY = "2026-10-21";
/** 알림 한 번 시험의 동시 호출 수(기술 값). */
const CONCURRENT_CALLS = 8;
/** 가짜 서버가 붙잡을 때의 짧은 타임아웃(기술 값). */
const SHORT_TIMEOUT_MS = 200;

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterAll(async () => {
  await testDb?.drop();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await testDb.db.delete(aiCalls);
  await testDb.db.delete(parentAlerts);
  await testDb.db.delete(modelPrices);
  await testDb.db.delete(profiles);
});

async function insertProfile(): Promise<string> {
  const [row] = await testDb.db
    .insert(profiles)
    .values({
      displayName: "시험 프로필",
      englishName: "Tester",
      avatar: "fox",
      topicBundle: "animals",
      alphabetStart: false,
    })
    .returning({ id: profiles.id });
  if (!row) throw new Error("프로필을 넣지 못했다");
  return row.id;
}

/** 시험 행의 기본값(성공 · 토큰 0 · 비용 0). */
function callRow(overrides: Partial<AiCallRow>): AiCallRow {
  return {
    profileId: null,
    sessionId: null,
    calledAt: CALLED_AT,
    learningDay: DAY,
    purpose: "writing_check",
    requestedModel: SONNET,
    answeredModel: SONNET,
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    costUsd: "0.000000",
    priceMissing: false,
    latencyMs: null,
    status: "success",
    errorCode: null,
    ...overrides,
  };
}

describe("6.1 · 5절 기록", () => {
  it("6.1 기록: ai_calls 한 행에 학습일 · 요청 · 답한 모델 · 토큰 넷 · 비용 글 · 단가 없음 · 결과 상태 · error_code 가 그대로 남는다", async () => {
    const profileId = await insertProfile();
    await seedModelPrices(testDb.db);
    const book = await loadPriceBook(testDb.db, DAY);
    // 대체 모델이 답한 응답
    const message = messageBody({
      model: SONNET_5,
      json: {},
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
          cache_read_input_tokens: 50,
        },
      ],
    }) as unknown as MessageLike;
    const cost = costOf(billedAttemptsOf(message, SONNET), book);
    const id = await insertAiCall(
      testDb.db,
      callRow({
        profileId,
        requestedModel: SONNET,
        answeredModel: message.model,
        inputTokens: cost.tokens.input,
        outputTokens: cost.tokens.output,
        cacheWriteTokens: cost.tokens.cacheWrite,
        cacheReadTokens: cost.tokens.cacheRead,
        costUsd: cost.costUsd,
        priceMissing: cost.priceMissing,
        latencyMs: 1234,
      }),
    );
    const failure = classifyFailure({ kind: "timeout" });
    const failedId = await insertAiCall(
      testDb.db,
      callRow({
        profileId,
        answeredModel: null,
        status: failure.status,
        errorCode: failure.errorCode,
        priceMissing: true,
      }),
    );

    const rows = await testDb.db.select().from(aiCalls);
    const saved = rows.find((r) => r.id === id);
    expect(saved).toMatchObject({
      profileId,
      sessionId: null,
      learningDay: DAY,
      purpose: "writing_check",
      requestedModel: SONNET,
      answeredModel: SONNET_5,
      inputTokens: 1900,
      outputTokens: 340,
      cacheWriteTokens: 0,
      cacheReadTokens: 50,
      costUsd: cost.costUsd,
      priceMissing: false,
      latencyMs: 1234,
      status: "success",
      errorCode: null,
    });
    expect(saved?.calledAt.toISOString()).toBe(CALLED_AT.toISOString());
    expect(saved?.costUsd).toMatch(/^\d+\.\d{6}$/);
    expect(rows.find((r) => r.id === failedId)).toMatchObject({
      answeredModel: null,
      status: "timeout",
      errorCode: "timeout",
      priceMissing: true,
    });
  });

  it("6.1 단가표: 학습일보다 늦은 적용일 줄은 쓰지 않고 모델마다 가장 늦은 줄을 쓴다", async () => {
    await seedModelPrices(testDb.db);
    const sonnet = fixturePrice(SONNET);
    const doubled = {
      models: [
        {
          ...sonnet,
          inputUsdPerMTok: sonnet.inputUsdPerMTok * 2,
          outputUsdPerMTok: sonnet.outputUsdPerMTok * 2,
        },
      ],
    };
    const LATER = "2026-11-01";
    await seedModelPrices(testDb.db, doubled, LATER);
    await seedModelPrices(testDb.db, doubled, "2026-01-01");

    const now = await loadPriceBook(testDb.db, DAY);
    const expected = priceBookOf(
      priceRowsOfSeed(MODEL_PRICES_FIXTURE),
      FIXTURE_EFFECTIVE_FROM,
    );
    expect(now).toEqual(expected);
    const later = await loadPriceBook(testDb.db, LATER);
    expect(later.get(SONNET)?.input4).toBe(
      (expected.get(SONNET)?.input4 ?? 0) * 2,
    );
    // 모든 줄이 미래면 그 모델이 없다
    expect((await loadPriceBook(testDb.db, "2025-12-31")).size).toBe(0);

    // 조합 칸이 규격에 어긋난 모델은 그 줄을 모두 뺀다
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await testDb.db.insert(modelPrices).values({
      model: "claude-broken-1",
      effectiveFrom: FIXTURE_EFFECTIVE_FROM,
      inputUsdPerMtok: "1.0000",
      outputUsdPerMtok: "1.0000",
      cacheWriteUsdPerMtok: "1.0000",
      cacheReadUsdPerMtok: "1.0000",
      capabilities: { thinkingDefault: "sometimes" },
    });
    const withBroken = await loadPriceBook(testDb.db, DAY);
    expect(withBroken.has("claude-broken-1")).toBe(false);
    expect(withBroken.size).toBe(MODEL_PRICES_FIXTURE.models.length);
    expect(warn).toHaveBeenCalled();

    // 맞는 줄과 어긋난 줄이 섞인 모델은 그 모델 줄을 모두 뺀다(검토 M-3, 값 8)
    await testDb.db.insert(modelPrices).values({
      model: SONNET,
      effectiveFrom: "2026-03-01",
      inputUsdPerMtok: "1.0000",
      outputUsdPerMtok: "1.0000",
      cacheWriteUsdPerMtok: "1.0000",
      cacheReadUsdPerMtok: "1.0000",
      capabilities: { thinkingOff: "sometimes" },
    });
    const mixed = await loadPriceBook(testDb.db, DAY);
    expect(mixed.has(SONNET)).toBe(false);
    expect(mixed.size).toBe(MODEL_PRICES_FIXTURE.models.length - 1);
    warn.mockRestore();
  });

  it("시험용 자료: seedModelPrices 는 셋째 인자가 없으면 줄마다의 적용일을 쓰고, 넘기면 모든 줄을 덮는다", async () => {
    const sonnet = fixturePrice(SONNET);
    const dated = {
      models: [
        { ...sonnet, effectiveFrom: "2026-01-01" },
        { ...sonnet, effectiveFrom: "2026-06-01" },
      ],
    };
    await seedModelPrices(testDb.db, dated);
    const own = await testDb.db
      .select({ effectiveFrom: modelPrices.effectiveFrom })
      .from(modelPrices);
    expect(own.map((r) => r.effectiveFrom).sort()).toEqual([
      "2026-01-01",
      "2026-06-01",
    ]);
    await testDb.db.delete(modelPrices);
    await seedModelPrices(testDb.db, { models: [sonnet] }, "2026-11-01");
    const overridden = await testDb.db
      .select({ effectiveFrom: modelPrices.effectiveFrom })
      .from(modelPrices);
    expect(overridden).toEqual([{ effectiveFrom: "2026-11-01" }]);
  });

  it("6.1 하루 사용량: 확인 호출 밖, 막힌 호출(safety_cap)은 호출 수에서 빼고 비용은 집 전체 합", async () => {
    const a = await insertProfile();
    const b = await insertProfile();
    await insertAiCall(
      testDb.db,
      callRow({ profileId: a, costUsd: "0.001000" }),
    );
    await insertAiCall(
      testDb.db,
      callRow({ profileId: a, costUsd: "0.000500", status: "refusal" }),
    );
    await insertAiCall(
      testDb.db,
      callRow({
        profileId: a,
        status: "error",
        errorCode: "server:529",
      }),
    );
    await insertAiCall(
      testDb.db,
      callRow({ profileId: a, status: "safety_cap" }),
    );
    // 확인 호출은 profile_id 를 비우고 수 · 합에 넣지 않는다
    await insertAiCall(
      testDb.db,
      callRow({ purpose: "probe", costUsd: "0.000100" }),
    );
    await insertAiCall(
      testDb.db,
      callRow({ profileId: b, costUsd: "0.002000" }),
    );
    // 다른 학습일
    await insertAiCall(
      testDb.db,
      callRow({ profileId: a, learningDay: OTHER_DAY, costUsd: "1.000000" }),
    );

    expect(
      await dailyUsage(testDb.db, { profileId: a, learningDay: DAY }),
    ).toEqual({ profileCalls: 3, householdCostMicros: 3500 });
    expect(
      await dailyUsage(testDb.db, { profileId: b, learningDay: DAY }),
    ).toEqual({ profileCalls: 1, householdCostMicros: 3500 });
    expect(
      await dailyUsage(testDb.db, { profileId: b, learningDay: "2026-01-01" }),
    ).toEqual({ profileCalls: 0, householdCostMicros: 0 });
  });

  it("C17 같은 오류 세기: 같은 목적 · 학습일의 same_error 만 센다", async () => {
    const same = (overrides: Partial<AiCallRow>) =>
      insertAiCall(
        testDb.db,
        callRow({ status: "error", errorCode: "same_error:400", ...overrides }),
      );
    await same({});
    await same({ errorCode: "same_error:404" });
    await same({ errorCode: "server:500" });
    await same({ errorCode: "connection" });
    await same({ learningDay: OTHER_DAY });
    await same({ purpose: "speaking_eval" });
    // LIKE 의 '_' 는 한 글자 와일드카드다. 접두가 글자 그대로 same_error: 인 것만 센다(검토 M-5)
    await same({ errorCode: "sameXerror:400" });
    await insertAiCall(
      testDb.db,
      callRow({ status: "limit", errorCode: "console_limit:400" }),
    );
    expect(
      await sameErrorCount(testDb.db, {
        purpose: "writing_check",
        learningDay: DAY,
      }),
    ).toBe(2);
    expect(
      await sameErrorCount(testDb.db, {
        purpose: "speaking_eval",
        learningDay: DAY,
      }),
    ).toBe(1);
  });

  it("알림 한 번: 같은 (종류 · 프로필 · 기준 키 · 학습일)은 동시에 두 번 불러도 한 행", async () => {
    const profileId = await insertProfile();
    const alert = {
      kind: "ai_config_check",
      profileId,
      thresholdKey: "ai.model.writing_check",
      learningDay: DAY,
      value: { reasons: ["unknown-model"] },
      createdAt: CALLED_AT,
      once: "day" as const,
    };
    // 연결을 동시 호출 수만큼 둔 따로 된 DB 로 부른다(트랜잭션이 실제로 겹치게)
    const wide = createDb(testDb.url, { max: CONCURRENT_CALLS });
    let results: boolean[];
    try {
      results = await Promise.all(
        Array.from({ length: CONCURRENT_CALLS }, () =>
          createAlertOnce(wide, alert),
        ),
      );
    } finally {
      await wide.$client.end();
    }
    expect(results.filter(Boolean)).toHaveLength(1);
    const rows = await testDb.db
      .select()
      .from(parentAlerts)
      .where(eq(parentAlerts.kind, alert.kind));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      profileId,
      thresholdKey: alert.thresholdKey,
      learningDay: DAY,
      value: alert.value,
      acknowledgedAt: null,
    });

    // 다음 학습일은 새로(once day), 기준 키마다 한 번(once key)은 날이 바뀌어도 한 행
    expect(
      await createAlertOnce(testDb.db, { ...alert, learningDay: OTHER_DAY }),
    ).toBe(true);
    const monthly = {
      ...alert,
      kind: "monthly_cost",
      profileId: null,
      thresholdKey: "2026-10:x1",
      value: undefined,
      once: "key" as const,
    };
    expect(await createAlertOnce(testDb.db, monthly)).toBe(true);
    expect(
      await createAlertOnce(testDb.db, { ...monthly, learningDay: OTHER_DAY }),
    ).toBe(false);
    const household = await testDb.db
      .select()
      .from(parentAlerts)
      .where(and(eq(parentAlerts.kind, "monthly_cost")));
    expect(household).toHaveLength(1);
    // 값이 없으면 JSON null 이 아니라 SQL NULL
    expect(household[0]?.value).toBeNull();
    expect(household[0]?.profileId).toBeNull();
  });
});

describe("가짜 HTTP 서버", () => {
  it("가짜 HTTP 서버: SDK 가 baseURL 로 가짜 서버에 붙어 같은 규칙으로 답을 받는다", async () => {
    const server = await startFakeAnthropicServer({
      rules: [
        {
          when: { bodyIncludes: "marker-http" },
          reply: {
            kind: "message",
            body: messageBody({ model: SONNET, json: { via: "http" } }),
          },
          times: 1,
        },
      ],
    });
    try {
      vi.stubEnv("ANTHROPIC_BASE_URL", server.url);
      const client = createAnthropicClient({
        env: { ANTHROPIC_API_KEY: "test-key" },
      });
      expect(client.baseURL).toBe(server.url);
      const book = new Map(
        MODEL_PRICES_FIXTURE.models.map((m) => [
          m.model,
          { caps: capabilitiesOf(m) },
        ]),
      );
      const config = requestConfigOf({
        purpose: "writing_check",
        values: testSettingValues(),
        book,
      });
      const attempt = (marker: string, timeoutMs = config.timeoutMs) =>
        sendAttempt(client, {
          body: {
            model: config.model,
            max_tokens: config.maxTokens,
            thinking: config.thinking,
            output_config: { effort: config.effort },
            messages: [{ role: "user", content: marker }],
          },
          betas: config.betas,
          timeoutMs,
        });

      const ok = await attempt("marker-http");
      expect(ok.ok).toBe(true);
      if (ok.ok) {
        expect(ok.message.content).toEqual([
          {
            type: "text",
            text: JSON.stringify({ via: "http" }),
            citations: null,
          },
        ]);
      }
      // times 를 다 써서 다음은 규칙 없음(501 → 장애)
      const none = await attempt("marker-http");
      expect(none.ok ? null : classifyFailure(none.failure).errorCode).toBe(
        "server:501",
      );

      // 다른 프로세스(e2e)의 조종: 선언 규칙 넣기 · 요청 보기 · 비우기 · 살아 있음
      const control = (path: string, body?: unknown) =>
        fetch(`${server.url}${path}`, {
          method: body === undefined ? "GET" : "POST",
          headers: { "content-type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      expect((await control("/health")).status).toBe(200);
      await control("/__fake/rules", {
        rules: [
          {
            when: { bodyIncludes: "marker-404" },
            reply: {
              kind: "error",
              status: 404,
              body: errorBody(404, "not_found_error", "model"),
            },
          },
          {
            when: { bodyIncludes: "marker-drop" },
            reply: { kind: "network-error" },
          },
          { when: { bodyIncludes: "marker-hang" }, reply: { kind: "hang" } },
        ],
      });
      const notFound = await attempt("marker-404");
      expect(
        notFound.ok ? null : classifyFailure(notFound.failure).errorCode,
      ).toBe("same_error:404");
      const dropped = await attempt("marker-drop");
      expect(dropped.ok ? null : dropped.failure).toEqual({
        kind: "connection",
      });
      const hung = await attempt("marker-hang", SHORT_TIMEOUT_MS);
      expect(hung.ok ? null : hung.failure).toEqual({ kind: "timeout" });

      const recorded = (await (await control("/__fake/requests")).json()) as {
        url: string;
        headers: Record<string, string>;
      }[];
      expect(recorded).toHaveLength(5);
      expect(recorded[0]?.url).toContain("/v1/messages?beta=true");
      expect(recorded[0]?.headers["x-api-key"]).toBe("test-key");
      await control("/__fake/reset", {});
      expect(await (await control("/__fake/requests")).json()).toEqual([]);
    } finally {
      await server.close();
    }
  });
});

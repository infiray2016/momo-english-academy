// AC-8b(서버 몫) 하루 안전 상한 · 알림 기준은 막지 않음(plan-p09c 증명 표). P11 이 세션 몫을 이 파일에 더한다.
// 숫자는 TEST_SETTINGS 에서 읽고, 안전 상한 호출 수는 프로필 설정 행을 작은 값으로 넣어 '설정값을 읽는 것'을 본다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { learningDayOf } from "@/core/learning-day";
import { profiles } from "@/db/schema/learning";
import { aiCalls, parentAlerts } from "@/db/schema/operations";
import { type AiDeps, checkWriting } from "@/server/ai";
import { createAnthropicClient } from "@/server/ai/client";
import { type AiCallRow, insertAiCall } from "@/server/ai/store";
import {
  createFakeAnthropic,
  type FakeReply,
} from "../fixtures/ai/fake-anthropic";
import { seedModelPrices } from "../fixtures/ai/model-prices";
import {
  SAMPLE_FORBIDDEN,
  WRITING_CHECK_SAMPLE,
} from "../fixtures/ai/sample-inputs";
import { TEST_SETTINGS } from "../fixtures/settings";
import { createTestDatabase, seedSettings, type TestDatabase } from "./test-db";

const SAMPLES_DIR = join(process.cwd(), "tests/fixtures/ai/samples");
/** 하루의 밀리초(단위 값). */
const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** 프로필 설정 행에 넣는 작은 안전 상한(시험 값 — 기본값보다 작기만 하면 된다). */
const SMALL_SAFETY_CALLS = 3;
const TZ = TEST_SETTINGS["app.timezone"].value;
const DAY_START = TEST_SETTINGS["app.day_start_hour"].value;
const MODEL = TEST_SETTINGS["ai.model.writing_check"].value;

function okReply(): FakeReply {
  const { response } = JSON.parse(
    readFileSync(join(SAMPLES_DIR, "writing_check.ok.json"), "utf8"),
  );
  return { kind: "message", body: response.body };
}

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  await seedSettings(
    testDb.db,
    Object.entries(TEST_SETTINGS).map(([key, { scope, value }]) => ({
      key,
      scope,
      value,
    })),
  );
  await seedModelPrices(testDb.db);
});

afterAll(async () => {
  await testDb?.drop();
});

afterEach(async () => {
  await testDb.db.delete(aiCalls);
  await testDb.db.delete(parentAlerts);
});

async function insertProfile(safetyCalls?: number): Promise<string> {
  const [row] = await testDb.db
    .insert(profiles)
    .values({
      displayName: "시험",
      englishName: "Tester",
      avatar: "fox",
      topicBundle: "animals",
      alphabetStart: false,
    })
    .returning({ id: profiles.id });
  if (!row) throw new Error("프로필을 넣지 못했다");
  if (safetyCalls !== undefined) {
    await seedSettings(testDb.db, [
      {
        key: "ai.safety_daily_calls",
        scope: "profile",
        value: safetyCalls,
        profileId: row.id,
      },
    ]);
  }
  return row.id;
}

function harness(clock: () => Date = () => new Date()) {
  const fake = createFakeAnthropic([{ reply: okReply() }]);
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "test-key" },
    fetch: fake.fetch,
  });
  const deps: AiDeps = {
    db: testDb.db,
    clock,
    client: () => client,
    lists: () => ({ forbidden: SAMPLE_FORBIDDEN }),
  };
  return { fake, deps };
}

const today = () => learningDayOf(new Date(), TZ, DAY_START);

function pastRow(overrides: Partial<AiCallRow>): AiCallRow {
  return {
    profileId: null,
    sessionId: null,
    calledAt: new Date(),
    learningDay: today(),
    purpose: "writing_check",
    requestedModel: MODEL,
    answeredModel: MODEL,
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

async function insertRows(count: number, overrides: Partial<AiCallRow>) {
  await testDb.db
    .insert(aiCalls)
    .values(Array.from({ length: count }, () => pastRow(overrides)));
}

const ctxOf = (profileId: string) => ({ profileId, sessionId: null, level: 4 });

async function rowsOf(profileId: string) {
  const all = await testDb.db.select().from(aiCalls);
  return all.filter((r) => r.profileId === profileId);
}

describe("AC-8b 하루 안전 상한", () => {
  it("AC-8b 알림 기준(하루 호출 · 하루 비용 · 월 비용)을 넘긴 날에도 실시간 호출이 나간다", async () => {
    const profileId = await insertProfile();
    // 하루 호출 알림 기준만큼 · 하루 · 월 비용 알림 기준을 넘는 비용(안전 상한보다 작게)
    await insertRows(TEST_SETTINGS["ai.daily_call_alert"].value, { profileId });
    const overMonthly = TEST_SETTINGS["ai.monthly_cost_alert_usd"].value + 0.5;
    expect(overMonthly).toBeLessThan(
      TEST_SETTINGS["ai.safety_daily_cost_usd"].value,
    );
    await insertAiCall(testDb.db, pastRow({ costUsd: overMonthly.toFixed(6) }));
    const { fake, deps } = harness();
    const result = await checkWriting(
      WRITING_CHECK_SAMPLE,
      ctxOf(profileId),
      deps,
    );
    expect(result.ok).toBe(true);
    expect(fake.requests).toHaveLength(1);
  });

  it("AC-8b 프로필 하루 호출이 ai.safety_daily_calls 에 닿으면 그 학습일 호출이 0회이고 ai_calls 에 safety_cap 행이 남는다", async () => {
    const profileId = await insertProfile(SMALL_SAFETY_CALLS);
    await insertRows(SMALL_SAFETY_CALLS, { profileId });
    const { fake, deps } = harness();
    for (let i = 0; i < 2; i++) {
      const result = await checkWriting(
        WRITING_CHECK_SAMPLE,
        ctxOf(profileId),
        deps,
      );
      expect(result).toEqual({ ok: false, reason: "safety_cap", refusals: 0 });
    }
    expect(fake.requests).toHaveLength(0);
    const capped = (await rowsOf(profileId)).filter(
      (r) => r.status === "safety_cap",
    );
    expect(capped).toHaveLength(2);
    expect(capped[0]).toMatchObject({
      requestedModel: MODEL,
      answeredModel: null,
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      costUsd: "0.000000",
      latencyMs: null,
      errorCode: null,
      learningDay: today(),
    });
  });

  it("AC-8b 집 하루 비용이 ai.safety_daily_cost_usd 에 닿아도 같다", async () => {
    const profileId = await insertProfile();
    // 다른 프로필 · 집 전체 비용으로 닿는다
    await insertAiCall(
      testDb.db,
      pastRow({
        costUsd: TEST_SETTINGS["ai.safety_daily_cost_usd"].value.toFixed(6),
      }),
    );
    const { fake, deps } = harness();
    const result = await checkWriting(
      WRITING_CHECK_SAMPLE,
      ctxOf(profileId),
      deps,
    );
    expect(result).toEqual({ ok: false, reason: "safety_cap", refusals: 0 });
    expect(fake.requests).toHaveLength(0);
    expect((await rowsOf(profileId)).map((r) => r.status)).toEqual([
      "safety_cap",
    ]);
  });

  it("AC-8b 다음 학습일(시계를 넘김)에는 다시 나간다", async () => {
    const profileId = await insertProfile(SMALL_SAFETY_CALLS);
    await insertRows(SMALL_SAFETY_CALLS, { profileId });
    const blocked = harness();
    expect(
      (await checkWriting(WRITING_CHECK_SAMPLE, ctxOf(profileId), blocked.deps))
        .ok,
    ).toBe(false);
    const tomorrow = harness(() => new Date(Date.now() + MS_PER_DAY));
    const result = await checkWriting(
      WRITING_CHECK_SAMPLE,
      ctxOf(profileId),
      tomorrow.deps,
    );
    expect(result.ok).toBe(true);
    expect(tomorrow.fake.requests).toHaveLength(1);
    const next = (await rowsOf(profileId)).find(
      (r) => r.status === "success" && r.learningDay !== today(),
    );
    expect(next?.learningDay).toBe(
      learningDayOf(new Date(Date.now() + MS_PER_DAY), TZ, DAY_START),
    );
  });

  it("AC-8b 확인 호출 행과 막힌 행은 호출 수에 들지 않는다", async () => {
    const profileId = await insertProfile(SMALL_SAFETY_CALLS);
    // 상한보다 많은 확인 호출 행(프로필 비움, 집 하루 비용 안전 상한만큼의 비용) · 막힌 행
    await insertRows(SMALL_SAFETY_CALLS * 2, { purpose: "probe" });
    await insertAiCall(
      testDb.db,
      pastRow({
        purpose: "probe",
        costUsd: TEST_SETTINGS["ai.safety_daily_cost_usd"].value.toFixed(6),
      }),
    );
    await insertRows(SMALL_SAFETY_CALLS * 2, {
      profileId,
      status: "safety_cap",
    });
    const { fake, deps } = harness();
    for (let i = 0; i < SMALL_SAFETY_CALLS; i++) {
      expect(
        (await checkWriting(WRITING_CHECK_SAMPLE, ctxOf(profileId), deps)).ok,
      ).toBe(true);
    }
    expect(fake.requests).toHaveLength(SMALL_SAFETY_CALLS);
    // 실제로 부른 수가 상한에 닿은 뒤에야 막힌다
    expect(
      await checkWriting(WRITING_CHECK_SAMPLE, ctxOf(profileId), deps),
    ).toEqual({ ok: false, reason: "safety_cap", refusals: 0 });
    expect(fake.requests).toHaveLength(SMALL_SAFETY_CALLS);
  });
});

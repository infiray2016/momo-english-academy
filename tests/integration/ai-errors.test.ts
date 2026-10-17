// AC-8n · AC-8d(서버 몫) · 8절 실패 흐름 · 설정 문제(plan-p09c 증명 표). 가짜 Anthropic 만 쓴다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { profiles } from "@/db/schema/learning";
import {
  aiCalls,
  aiStatus,
  parentAlerts,
  settings,
} from "@/db/schema/operations";
import { type AiDeps, checkWriting, writeFeedback } from "@/server/ai";
import { AiConfigError, createAnthropicClient } from "@/server/ai/client";
import {
  consoleLimitBody,
  createFakeAnthropic,
  errorBody,
  type FakeReply,
  type FakeRule,
} from "../fixtures/ai/fake-anthropic";
import { seedModelPrices } from "../fixtures/ai/model-prices";
import {
  SAMPLE_FORBIDDEN,
  WRITING_CHECK_SAMPLE,
  writingFeedbackSample,
} from "../fixtures/ai/sample-inputs";
import { TEST_SETTINGS } from "../fixtures/settings";
import { createTestDatabase, seedSettings, type TestDatabase } from "./test-db";

const SAMPLES_DIR = join(process.cwd(), "tests/fixtures/ai/samples");
/** 기다림 시험의 짧은 타임아웃(초)과 늦춤 · 여유(밀리초) — 기술 값. 시험 DB 의 설정 행에 넣어 '설정값을 읽는 것'을 본다. */
const SHORT_TIMEOUT_SECONDS = 0.3;
/** 두 시도 시험: 둘째 시도는 남은 시간이 run.ts 의 1초 이상이어야 나가므로 타임아웃을 그보다 길게 둔다. */
const WAIT_TIMEOUT_SECONDS = 1.2;
const FIRST_DELAY_MS = 1000;
const SLACK_MS = 300;
const MS_PER_SECOND = 1000;

function sample(id: string): {
  title: string;
  response: { status: number; body: Record<string, unknown> };
} {
  return JSON.parse(readFileSync(join(SAMPLES_DIR, `${id}.json`), "utf8"));
}
function replyOf(id: string): FakeReply {
  const { response } = sample(id);
  return response.status === 200
    ? { kind: "message", body: response.body }
    : { kind: "error", status: response.status, body: response.body };
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

/** 시험이 바꾸거나 지운 집 전체 설정 키 — afterEach 가 TEST_SETTINGS 값으로 되돌린다(검토 M-4). */
const touched = new Set<keyof typeof TEST_SETTINGS>();

afterEach(async () => {
  await testDb.db.delete(aiCalls);
  await testDb.db.delete(parentAlerts);
  for (const key of touched) {
    await testDb.db
      .delete(settings)
      .where(and(eq(settings.key, key), isNull(settings.profileId)));
    const { scope, value } = TEST_SETTINGS[key];
    await seedSettings(testDb.db, [{ key, scope, value }]);
  }
  touched.clear();
});

async function setHouseholdSetting(
  key: keyof typeof TEST_SETTINGS,
  value: unknown,
) {
  touched.add(key);
  await testDb.db
    .update(settings)
    .set({ value })
    .where(and(eq(settings.key, key), isNull(settings.profileId)));
}

async function deleteHouseholdSetting(key: keyof typeof TEST_SETTINGS) {
  touched.add(key);
  await testDb.db
    .delete(settings)
    .where(and(eq(settings.key, key), isNull(settings.profileId)));
}

function harness(rules: FakeRule[], over: Partial<AiDeps> = {}) {
  const fake = createFakeAnthropic(rules);
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "test-key" },
    fetch: fake.fetch,
  });
  const deps: AiDeps = {
    db: testDb.db,
    clock: () => new Date(),
    client: () => client,
    lists: () => ({ forbidden: SAMPLE_FORBIDDEN }),
    ...over,
  };
  return { fake, deps };
}

const always = (reply: FakeReply): FakeRule => ({ reply });

async function rows() {
  return testDb.db.select().from(aiCalls).orderBy(aiCalls.calledAt);
}

const check = () => ({ profileId: null, sessionId: null, level: 4 });
const feedback = () => ({ profileId: null, sessionId: null, level: 6 });

describe("AC-8d · AC-8n", () => {
  it("AC-8d 응답을 늦춘 가짜에서 ai.timeout_seconds.realtime 이 지나면 다시 보내지 않고 타임아웃으로 끝난다", async () => {
    await setHouseholdSetting(
      "ai.timeout_seconds.realtime",
      SHORT_TIMEOUT_SECONDS,
    );
    const { fake, deps } = harness([always({ kind: "hang" })]);
    const started = Date.now();
    const result = await checkWriting(WRITING_CHECK_SAMPLE, check(), deps);
    const elapsed = Date.now() - started;
    expect(result).toEqual({ ok: false, reason: "timeout", refusals: 0 });
    expect(fake.requests).toHaveLength(1);
    // 설정값(시험 DB 의 작은 값)을 읽어 그만큼에서 끊었다
    expect(elapsed).toBeGreaterThanOrEqual(
      SHORT_TIMEOUT_SECONDS * MS_PER_SECOND - 10,
    );
    expect(elapsed).toBeLessThan(
      TEST_SETTINGS["ai.timeout_seconds.realtime"].value * MS_PER_SECOND,
    );
    expect((await rows()).map((r) => [r.status, r.errorCode])).toEqual([
      ["timeout", "timeout"],
    ]);
  });

  it("AC-8n 첨삭이 404 를 세 번 받으면 쉬는 상태 행이 생기지 않고 '호출 설정 확인 필요' 알림이 하나 생긴다(넷째에도 하나)", async () => {
    const { fake, deps } = harness([always(replyOf("error.not-found-404"))]);
    const down = TEST_SETTINGS["ai.down_after_failures"].value;
    const alerts = async () =>
      testDb.db
        .select()
        .from(parentAlerts)
        .where(eq(parentAlerts.kind, "call_config_check"));
    for (let i = 1; i <= down + 1; i++) {
      const result = await writeFeedback(
        writingFeedbackSample(6),
        feedback(),
        deps,
      );
      expect(result).toEqual({ ok: false, reason: "same_error", refusals: 0 });
      expect(await alerts()).toHaveLength(i < down ? 0 : 1);
    }
    expect(fake.requests).toHaveLength(down + 1);
    const [alert] = await alerts();
    expect(alert).toMatchObject({
      profileId: null,
      thresholdKey: "ai.down_after_failures:writing_feedback",
      value: {
        purpose: "writing_feedback",
        model: TEST_SETTINGS["ai.model.writing_feedback"].value,
        errorCode: "same_error:404",
      },
    });
    expect(await testDb.db.select().from(aiStatus)).toEqual([]);
  });

  it("AC-8n 다시 보내도 같은 오류(400 · 413)는 그 호출 안에서 다시 보내지 않는다", async () => {
    for (const status of [400, 413]) {
      const { fake, deps } = harness([
        always({
          kind: "error",
          status,
          body: errorBody(status, "invalid_request_error", "bad request"),
        }),
      ]);
      const result = await checkWriting(WRITING_CHECK_SAMPLE, check(), deps);
      expect(result).toEqual({ ok: false, reason: "same_error", refusals: 0 });
      expect(fake.requests).toHaveLength(1);
    }
    expect((await rows()).map((r) => r.errorCode)).toEqual([
      "same_error:400",
      "same_error:413",
    ]);
  });
});

describe("8절 실패 흐름", () => {
  it("8절 흐름: 연결 실패는 대화형 호출에서 1회 다시 보내고 첨삭은 다시 보내지 않는다", async () => {
    const realtime = harness([
      { reply: { kind: "network-error" }, times: 1 },
      {
        when: { purpose: "writing_check" },
        reply: replyOf("writing_check.ok"),
      },
    ]);
    const ok = await checkWriting(WRITING_CHECK_SAMPLE, check(), realtime.deps);
    expect(ok.ok).toBe(true);
    expect(realtime.fake.requests).toHaveLength(2);
    expect((await rows()).map((r) => [r.status, r.errorCode])).toEqual([
      ["error", "connection"],
      ["success", null],
    ]);

    await testDb.db.delete(aiCalls);
    const later = harness([always({ kind: "network-error" })]);
    const failed = await writeFeedback(
      writingFeedbackSample(6),
      feedback(),
      later.deps,
    );
    expect(failed).toEqual({ ok: false, reason: "connection", refusals: 0 });
    expect(later.fake.requests).toHaveLength(1);
  });

  it("8절 흐름: 콘솔 한도 400 · 429 는 결과 상태 limit 이고 다시 보내지 않는다(1-가는 호출 하나의 실패)", async () => {
    for (const which of ["workspace", "tier"] as const) {
      const { status, body } = consoleLimitBody(which);
      const { fake, deps } = harness([always({ kind: "error", status, body })]);
      const result = await checkWriting(WRITING_CHECK_SAMPLE, check(), deps);
      expect(result).toEqual({
        ok: false,
        reason: "console_limit",
        refusals: 0,
      });
      expect(fake.requests).toHaveLength(1);
    }
    expect((await rows()).map((r) => [r.status, r.errorCode])).toEqual([
      ["limit", "console_limit:400"],
      ["limit", "console_limit:429"],
    ]);
    // 1-가는 'AI 쉬는 중' 행을 만들지 않는다
    expect(await testDb.db.select().from(aiStatus)).toEqual([]);
  });

  it("8절 흐름: 401 은 계정 갈래로 남고 다시 보내지 않는다", async () => {
    const { fake, deps } = harness([
      always({
        kind: "error",
        status: 401,
        body: errorBody(401, "authentication_error", "invalid x-api-key"),
      }),
    ]);
    const result = await checkWriting(WRITING_CHECK_SAMPLE, check(), deps);
    expect(result).toEqual({ ok: false, reason: "account", refusals: 0 });
    expect(fake.requests).toHaveLength(1);
    expect((await rows()).map((r) => [r.status, r.errorCode])).toEqual([
      ["error", "account:401"],
    ]);
  });

  it("8절 흐름: 거절은 다시 요청하지 않고 거절 수 1 을 돌려준다", async () => {
    const { fake, deps } = harness([
      always(replyOf("writing_feedback.refusal")),
    ]);
    const result = await writeFeedback(
      writingFeedbackSample(6),
      feedback(),
      deps,
    );
    expect(result).toEqual({ ok: false, reason: "refusal", refusals: 1 });
    expect(fake.requests).toHaveLength(1);
    const saved = await rows();
    expect(saved.map((r) => r.status)).toEqual(["refusal"]);
    // 출력 전 거절(cyber)은 과금되지 않는다
    expect(saved[0]?.costUsd).toBe("0.000000");
  });

  it("6.1 흐름: 두 시도의 기다림이 타임아웃의 두 배를 넘지 않는다", async () => {
    await setHouseholdSetting(
      "ai.timeout_seconds.realtime",
      WAIT_TIMEOUT_SECONDS,
    );
    const over = replyOf("writing_check.over");
    if (over.kind !== "message") throw new Error("표본 꼴이 다르다");
    const { fake, deps } = harness([
      { reply: { ...over, delayMs: FIRST_DELAY_MS }, times: 1 },
      always({ kind: "hang" }),
    ]);
    const started = Date.now();
    const result = await checkWriting(WRITING_CHECK_SAMPLE, check(), deps);
    const elapsed = Date.now() - started;
    expect(fake.requests).toHaveLength(2);
    expect(elapsed).toBeLessThanOrEqual(
      2 * WAIT_TIMEOUT_SECONDS * MS_PER_SECOND + SLACK_MS,
    );
    // 둘째 시도가 전송 실패여도 첫 시도의 다듬은 값을 느슨한 규격으로 정규화해 쓴다(C69)
    expect(result).toMatchObject({ ok: true, normalized: true });
    if (result.ok) expect(result.value.fixes).toHaveLength(1);
    expect((await rows()).map((r) => r.status)).toEqual([
      "validation_failed",
      "timeout",
    ]);
  });

  it("6.1 흐름: 둘째 시도가 콘솔 한도 · 같은 오류로 끝나도 첫 응답 값을 정규화해 돌려주고 둘째 행에는 그 실패 갈래가 남는다", async () => {
    const workspace = consoleLimitBody("workspace");
    const cases = [
      {
        reply: {
          kind: "error",
          status: workspace.status,
          body: workspace.body,
        },
        row: ["limit", "console_limit:400"],
      },
      {
        reply: replyOf("error.not-found-404"),
        row: ["error", "same_error:404"],
      },
    ] as const;
    for (const { reply, row } of cases) {
      await testDb.db.delete(aiCalls);
      const { fake, deps } = harness([
        { reply: replyOf("writing_check.over"), times: 1 },
        always(reply as FakeReply),
      ]);
      const result = await checkWriting(WRITING_CHECK_SAMPLE, check(), deps);
      expect(result).toMatchObject({ ok: true, normalized: true });
      if (result.ok) expect(result.value.fixes).toHaveLength(1);
      expect(fake.requests).toHaveLength(2);
      expect((await rows()).map((r) => [r.status, r.errorCode])).toEqual([
        ["validation_failed", null],
        [...row],
      ]);
    }
  });

  it("6.1 흐름: 첫 시도부터 전송 실패면 기억한 값이 없어 실패를 돌려준다", async () => {
    const { fake, deps } = harness([always({ kind: "network-error" })]);
    const result = await checkWriting(WRITING_CHECK_SAMPLE, check(), deps);
    expect(result).toEqual({ ok: false, reason: "connection", refusals: 0 });
    // 대화형 호출이라 연결 실패에 1회 다시 보냈다
    expect(fake.requests).toHaveLength(2);
    expect((await rows()).map((r) => [r.status, r.errorCode])).toEqual([
      ["error", "connection"],
      ["error", "connection"],
    ]);
  });
});

describe("설정 문제", () => {
  it("설정 문제: 설정이 없거나 조합이 틀리거나 키가 없으면 config 이고 AI 를 부르지 않으며 ai_calls 행이 없다", async () => {
    const [profile] = await testDb.db
      .insert(profiles)
      .values({
        displayName: "시험",
        englishName: "Tester",
        avatar: "fox",
        topicBundle: "animals",
        alphabetStart: false,
      })
      .returning({ id: profiles.id });
    const ctx = { profileId: profile?.id ?? null, sessionId: null, level: 4 };
    // 갈래마다 서버 오류 기록(목적 · 오류 이름만)에 그 오류 이름이 남는다 — 사례가 서로 다른 갈래를 지나는지 본다(검토 N-1)
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const expectConfig = async (
      deps: AiDeps,
      requests: () => number,
      errorName: string,
    ) => {
      logged.mockClear();
      expect(await checkWriting(WRITING_CHECK_SAMPLE, ctx, deps)).toEqual({
        ok: false,
        reason: "config",
        refusals: 0,
      });
      expect(requests()).toBe(0);
      expect(logged.mock.calls.map((c) => String(c[0]))).toEqual([
        `[ai] writing_check: 설정 문제(${errorName})`,
      ]);
    };
    try {
      // 설정 행 없음(SettingMissingError — P6 전 개발 DB 에서 먼저 만나는 길)
      await deleteHouseholdSetting("ai.max_tokens.writing_check");
      const missing = harness([always(replyOf("writing_check.ok"))]);
      await expectConfig(
        missing.deps,
        () => missing.fake.requests.length,
        "SettingMissingError",
      );
      // 지운 키를 바로 되돌린다 — 뒤 사례가 각자의 갈래를 지나게(afterEach 되돌리기는 그대로)
      const maxTokens = TEST_SETTINGS["ai.max_tokens.writing_check"];
      await seedSettings(testDb.db, [
        {
          key: "ai.max_tokens.writing_check",
          scope: maxTokens.scope,
          value: maxTokens.value,
        },
      ]);

      // 조합 오류(Opus 5.5 는 '끔'을 받지 않는다 — ComboError)
      await setHouseholdSetting("ai.model.writing_check", "claude-opus-5-5");
      await setHouseholdSetting("ai.thinking.writing_check", "off");
      const combo = harness([always(replyOf("writing_check.ok"))]);
      await expectConfig(
        combo.deps,
        () => combo.fake.requests.length,
        "ComboError",
      );
      await setHouseholdSetting(
        "ai.model.writing_check",
        TEST_SETTINGS["ai.model.writing_check"].value,
      );
      await setHouseholdSetting(
        "ai.thinking.writing_check",
        TEST_SETTINGS["ai.thinking.writing_check"].value,
      );

      // 꼴이 틀린 설정(effort — SettingInvalidError)
      await setHouseholdSetting("ai.effort.writing_check", "huge");
      const invalid = harness([always(replyOf("writing_check.ok"))]);
      await expectConfig(
        invalid.deps,
        () => invalid.fake.requests.length,
        "SettingInvalidError",
      );
      await setHouseholdSetting(
        "ai.effort.writing_check",
        TEST_SETTINGS["ai.effort.writing_check"].value,
      );

      // 키 없음(AiConfigError)
      const noKey = harness([], {
        client: () => {
          throw new AiConfigError();
        },
      });
      await expectConfig(
        noKey.deps,
        () => noKey.fake.requests.length,
        "AiConfigError",
      );
      expect(await rows()).toEqual([]);
    } finally {
      logged.mockRestore();
    }
  });
});

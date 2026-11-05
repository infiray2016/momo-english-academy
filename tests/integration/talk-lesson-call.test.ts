// 새 꼴 회화 턴 · 끝맺음 턴 호출 앞머리 통합 시험(회화 plan 묶음 12 fix 1 — 지운 conversation-call 통합 시험의 뜻을 새 꼴 입구로 옮김, 정적 ·
// 실행은 CI). runTalkLessonCall(talkLessonTurn · talkLessonClosing)의 DB 몫(설정 · 단가 · 하루 사용 · 가림 · 기록)을 가짜 Anthropic(fetch 주입,
// SSE 'stream' 응답)으로 본다. 증명: AC-8f(Haiku 설정 · 1~3 기본 · 4단계부터 · 대체 모델 비용) · AC-8i · AC-8c(끝맺음 max_tokens · feedback
// 기다림 · 기록 칸) · AC-16b(요약 n 개 · 가림) · AC-N4 · 연결 오류 한 번 다시 · 하루 안전 상한 safety_cap · 설정 문제 config · 첫 문장 시간.
// 실제 API 를 부르지 않는다. 숫자는 TEST_SETTINGS · 견본에서 읽는다. 아이 이름 · 전화번호 · 주소는 지어낸 견본(sample-inputs)이다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, getTableColumns, isNull } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { TalkLessonInput } from "@/core/ai/calls/talk-lesson";
import {
  billedAttemptsOf,
  costOf,
  type MessageLike,
  priceBookOf,
  priceRowsOfSeed,
} from "@/core/ai/cost";
import { learningDayOf } from "@/core/learning-day";
import { profiles } from "@/db/schema/learning";
import { aiCalls, parentAlerts, settings } from "@/db/schema/operations";
import { createAnthropicClient } from "@/server/ai/client";
import { insertAiCall } from "@/server/ai/store";
import {
  type TalkDeps,
  talkLessonClosing,
  talkLessonTurn,
} from "@/server/ai/talk";
import {
  createFakeAnthropic,
  type FakeReply,
  type FakeRule,
  messageBody,
} from "../fixtures/ai/fake-anthropic";
import {
  FIXTURE_EFFECTIVE_FROM,
  MODEL_PRICES_FIXTURE,
  seedModelPrices,
} from "../fixtures/ai/model-prices";
import {
  SAMPLE_ADDRESS,
  SAMPLE_NAMES,
  SAMPLE_PHONE,
} from "../fixtures/ai/sample-inputs";
import {
  lessonInput,
  talkLessonSampleFor,
} from "../fixtures/ai/talk-lesson-inputs";
import { TEST_SETTINGS } from "../fixtures/settings";
import { HAIKU, lessonAnswer } from "./talk-fixture";
import { createTestDatabase, seedSettings, type TestDatabase } from "./test-db";

const SAMPLES_DIR = join(process.cwd(), "tests/fixtures/ai/samples");
const MS_PER_SECOND = 1000;
/** 짧은 실시간 타임아웃(초) — 끝맺음 턴이 이것이 아니라 feedback 으로 기다리는지 본다(시험 값). */
const SHORT_REALTIME_SECONDS = 1;
/** 첫 조각을 늦추는 시간(ms) — SHORT_REALTIME_SECONDS 보다 길고 feedback 보다 짧게(시험 값). */
const DELAY_PAST_REALTIME_MS = 1500;
const NOT_STORED = ["prompt", "response", "body", "content", "message"];
/** 3단계(1~3 구간) AI 차례 성공 견본 · 4단계 · 대체 모델 · 5단계 끝맺음 견본. */
const L3_OK = "talk_turn.v2-l3-ai";
const L4_OK = "talk_turn.v2-l4-ai";
const L3_FALLBACK = "talk_turn.v2-l3-fallback";
const L5_CLOSING = "talk_turn.v2-l5-closing";
/** 걸린 문장 첫 자리를 바꿀 안전한 대사(시험 값 — 부르는 쪽이 카드에서 고르는 몫). */
const SAFE_LINE = "Let's talk about something fun!";

function sampleBody(id: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(SAMPLES_DIR, `${id}.json`), "utf8"))
    .response.body;
}
const stream = (
  body: unknown,
  extra: Omit<Extract<FakeReply, { kind: "stream" }>, "kind" | "body"> = {},
): FakeReply => ({ kind: "stream", body, ...extra });
const once = (reply: FakeReply, model?: string): FakeRule => ({
  ...(model ? { when: { model } } : {}),
  reply,
  times: 1,
});
const book = priceBookOf(
  priceRowsOfSeed(MODEL_PRICES_FIXTURE),
  FIXTURE_EFFECTIVE_FROM,
);

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

/** 시험이 바꾼 집 전체 설정 — afterEach 가 TEST_SETTINGS 값으로 되돌린다. */
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

async function insertProfile(safetyCalls?: number): Promise<string> {
  const [row] = await testDb.db
    .insert(profiles)
    .values({
      displayName: SAMPLE_NAMES.displayName,
      englishName: SAMPLE_NAMES.englishName,
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

/** 그 프로필의 오늘 호출 한 행(하루 안전 상한 시험 — 상한 1 이면 다음 호출이 닫힌다). */
async function insertUsedCall(profileId: string) {
  const now = new Date();
  await insertAiCall(testDb.db, {
    profileId,
    sessionId: null,
    calledAt: now,
    learningDay: learningDayOf(
      now,
      TEST_SETTINGS["app.timezone"].value,
      TEST_SETTINGS["app.day_start_hour"].value,
    ),
    purpose: "talk_turn",
    requestedModel: TEST_SETTINGS["ai.model.talk_turn.1-3"].value,
    answeredModel: TEST_SETTINGS["ai.model.talk_turn.1-3"].value,
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    costUsd: "0.000000",
    priceMissing: false,
    latencyMs: null,
    status: "success",
    errorCode: null,
  });
}

/** 가짜 클라이언트 · 문장 받기. 시드 목록(금지어 · 메타 문장)은 저장소의 seed/lists 를 그대로 읽는다. */
function harness(rules: FakeRule[], over: Partial<TalkDeps> = {}) {
  const fake = createFakeAnthropic(rules);
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "test-key" },
    fetch: fake.fetch,
  });
  const deps: TalkDeps = {
    db: testDb.db,
    clock: () => new Date(),
    client: () => client,
    ...over,
  };
  const sentences: string[] = [];
  const ctxOf = (profileId: string | null, level: number) => ({
    profileId,
    sessionId: null,
    level,
    requestReceivedAt: new Date(),
    safeLine: SAFE_LINE,
    onSentence: (s: string) => sentences.push(s),
  });
  return { fake, deps, sentences, ctxOf };
}

/** 끝맺음 턴 맥락(흘려 보내지 않음). */
const closingCtx = (profileId: string | null, level: number) => ({
  profileId,
  sessionId: null,
  level,
  requestReceivedAt: new Date(),
  safeLine: SAFE_LINE,
});

type RequestBody = {
  model: string;
  max_tokens: number;
  thinking: { type: string };
  output_config: { effort: string };
  fallbacks?: string;
};
const bodyOf = (fake: ReturnType<typeof createFakeAnthropic>, i: number) =>
  fake.requests[i]?.body as RequestBody;

async function rows() {
  return testDb.db.select().from(aiCalls).orderBy(aiCalls.calledAt);
}

/** 5단계 끝맺음 견본 입력(turn.closing 참). */
const closingInput = (): TalkLessonInput => talkLessonSampleFor(L5_CLOSING);

describe("AC-8f · AC-8i 새 꼴 회화 턴 요청 꼴", () => {
  it("AC-8f 설정으로 Haiku 를 고른 새 꼴 회화 턴 요청은 effort low · thinking disabled 이고 fallbacks 가 없으며 max_tokens 는 ai.max_tokens.talk_turn 이다", async () => {
    await setHouseholdSetting("ai.model.talk_turn.1-3", HAIKU);
    const { fake, deps, ctxOf } = harness([once(stream(sampleBody(L3_OK)))]);
    await talkLessonTurn(talkLessonSampleFor(L3_OK), ctxOf(null, 3), deps);
    const body = bodyOf(fake, 0);
    expect(body.model).toBe(HAIKU);
    expect(body.output_config.effort).toBe("low");
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.fallbacks).toBeUndefined();
    expect(body.max_tokens).toBe(
      TEST_SETTINGS["ai.max_tokens.talk_turn"].value,
    );
  });

  it("AC-8f 새 꼴 회화 턴 요청은 1~3단계 기본값이면 claude-sonnet-5-5 · effort low · thinking between_tools 이고 서버 측 대체 모델 재시도를 켠다(C112)", async () => {
    const { fake, deps, ctxOf } = harness([once(stream(sampleBody(L3_OK)))]);
    await talkLessonTurn(talkLessonSampleFor(L3_OK), ctxOf(null, 3), deps);
    const body = bodyOf(fake, 0);
    expect(body.model).toBe("claude-sonnet-5-5");
    expect(body.output_config.effort).toBe("low");
    expect(body.thinking).toEqual({ type: "between_tools" });
    expect(body.fallbacks).toBe("default");
    expect(fake.requests[0]?.headers["anthropic-beta"]).toContain(
      "server-side-fallback",
    );
  });

  it("AC-8f 4단계부터 새 꼴 회화 턴 요청은 claude-sonnet-5-5 · effort low · thinking between_tools 이고 서버 측 대체 모델 재시도를 켠다", async () => {
    const { fake, deps, ctxOf } = harness([once(stream(sampleBody(L4_OK)))]);
    await talkLessonTurn(talkLessonSampleFor(L4_OK), ctxOf(null, 4), deps);
    const body = bodyOf(fake, 0);
    expect(body.model).toBe("claude-sonnet-5-5");
    expect(body.output_config.effort).toBe("low");
    expect(body.thinking).toEqual({ type: "between_tools" });
    expect(body.fallbacks).toBe("default");
    expect(fake.requests[0]?.headers["anthropic-beta"]).toContain(
      "server-side-fallback",
    );
  });

  it("AC-8f 대체 모델이 답한 새 꼴 회화 턴의 ai_calls 비용은 usage.iterations 항목별 단가로 계산된다", async () => {
    const profileId = await insertProfile();
    const { deps, ctxOf } = harness([once(stream(sampleBody(L3_FALLBACK)))]);
    const result = await talkLessonTurn(
      talkLessonSampleFor(L3_FALLBACK),
      ctxOf(profileId, 3),
      deps,
    );
    expect(result.ok).toBe(true);
    const body = sampleBody(L3_FALLBACK) as unknown as MessageLike;
    const requested = TEST_SETTINGS["ai.model.talk_turn.1-3"].value;
    const cost = costOf(billedAttemptsOf(body, requested), book);
    const [row] = await rows();
    expect(row).toMatchObject({
      purpose: "talk_turn",
      requestedModel: requested,
      answeredModel: "claude-sonnet-5",
      costUsd: cost.costUsd,
      inputTokens: cost.tokens.input,
      outputTokens: cost.tokens.output,
    });
  });

  it("AC-8i 4~6 구간 회화 모델을 claude-haiku-5-5 로 바꾸면 그 구간 새 꼴 회화 턴 요청은 thinking disabled 이고 fallbacks 가 없다", async () => {
    await setHouseholdSetting("ai.model.talk_turn.4-6", HAIKU);
    const { fake, deps, ctxOf } = harness([once(stream(sampleBody(L4_OK)))]);
    await talkLessonTurn(talkLessonSampleFor(L4_OK), ctxOf(null, 4), deps);
    const body = bodyOf(fake, 0);
    expect(body.model).toBe(HAIKU);
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.fallbacks).toBeUndefined();
  });

  it("AC-8i 1-3 구간 effort 를 medium 으로 바꿔도 4-6 구간 새 꼴 회화 턴 요청은 low 다", async () => {
    await setHouseholdSetting("ai.effort.talk_turn.1-3", "medium");
    const { fake, deps, ctxOf } = harness([
      once(stream(sampleBody(L4_OK))),
      once(stream(sampleBody(L3_OK))),
    ]);
    await talkLessonTurn(talkLessonSampleFor(L4_OK), ctxOf(null, 4), deps);
    await talkLessonTurn(talkLessonSampleFor(L3_OK), ctxOf(null, 3), deps);
    expect(bodyOf(fake, 0).output_config.effort).toBe("low");
    expect(bodyOf(fake, 1).output_config.effort).toBe("medium");
  });
});

describe("AC-8c 새 꼴 끝맺음 턴 요청 꼴 · 기록", () => {
  it("AC-8c 새 꼴 끝맺음 턴 요청의 max_tokens 는 ai.max_tokens.talk_closing 이고 ai.timeout_seconds.feedback 으로 기다리며 ai_calls 에 talk_closing 행 하나가 프롬프트 · 응답 본문 없이 남는다", async () => {
    await setHouseholdSetting(
      "ai.timeout_seconds.realtime",
      SHORT_REALTIME_SECONDS,
    );
    expect(DELAY_PAST_REALTIME_MS).toBeGreaterThan(
      SHORT_REALTIME_SECONDS * MS_PER_SECOND,
    );
    expect(DELAY_PAST_REALTIME_MS).toBeLessThan(
      TEST_SETTINGS["ai.timeout_seconds.feedback"].value * MS_PER_SECOND,
    );
    const profileId = await insertProfile();
    const { fake, deps } = harness([
      once(
        stream(sampleBody(L5_CLOSING), {
          firstDelayMs: DELAY_PAST_REALTIME_MS,
        }),
      ),
    ]);
    const result = await talkLessonClosing(
      closingInput(),
      closingCtx(profileId, 5),
      deps,
    );
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.value.summary).not.toBe("");
    expect(result.value.farewell).not.toBe("");
    expect(fake.requests).toHaveLength(1);
    expect(bodyOf(fake, 0).max_tokens).toBe(
      TEST_SETTINGS["ai.max_tokens.talk_closing"].value,
    );
    expect((await rows()).map((r) => r.purpose)).toEqual(["talk_closing"]);
    const columns = Object.keys(getTableColumns(aiCalls)).map((c) =>
      c.toLowerCase(),
    );
    for (const word of NOT_STORED)
      expect(columns.some((c) => c.includes(word))).toBe(false);
  });
});

describe("AC-16b · AC-N4 새 꼴 요청 본문 가림", () => {
  it("AC-16b 새 꼴 회화 턴 요청 본문에 지난 대화 요약이 최근 talk.memory_summaries 개 들어가고 요청 본문에는 전화번호 · 주소 형태와 프로필 이름이 없다", async () => {
    const profileId = await insertProfile();
    const count = TEST_SETTINGS["talk.memory_summaries"].value;
    const summaries = Array.from(
      { length: count },
      (_, i) =>
        `${SAMPLE_NAMES.displayName}는 ${i + 1}번째 이야기에서 사과를 좋아한다고 했다.`,
    );
    const { fake, deps, ctxOf } = harness([once(stream(sampleBody(L3_OK)))]);
    await talkLessonTurn(
      lessonInput(3, {
        summaries,
        turn: {
          child: `I am ${SAMPLE_NAMES.englishName}. ${SAMPLE_PHONE} ${SAMPLE_ADDRESS}`,
        },
      }),
      ctxOf(profileId, 3),
      deps,
    );
    const text = fake.requests[0]?.bodyText ?? "";
    for (let i = 1; i <= count; i++) expect(text).toContain(`${i}번째 이야기`);
    for (const leak of [
      SAMPLE_PHONE,
      SAMPLE_ADDRESS,
      SAMPLE_NAMES.displayName,
      SAMPLE_NAMES.englishName,
    ])
      expect(text).not.toContain(leak);
    expect(text).toContain("{NAME}");
  });

  it("AC-N4 새 꼴 회화 입력의 전화번호 형태가 회화 턴 요청 본문과 끝맺음 턴 요약에서 가려진다", async () => {
    const profileId = await insertProfile();
    const { fake, deps, ctxOf } = harness([
      once(stream(sampleBody(L3_OK))),
      once(
        stream(
          messageBody({
            model: "claude-sonnet-5-5",
            json: lessonAnswer({
              tori_en: "",
              farewell: "It was fun!",
              farewell_ko: "재밌었어!",
              summary: `전화번호 ${SAMPLE_PHONE} 를 말했다.`,
            }),
          }),
        ),
      ),
    ]);
    await talkLessonTurn(
      lessonInput(3, { turn: { child: `Call ${SAMPLE_PHONE}` } }),
      ctxOf(profileId, 3),
      deps,
    );
    expect(fake.requests[0]?.bodyText).not.toContain(SAMPLE_PHONE);
    const closing = await talkLessonClosing(
      closingInput(),
      closingCtx(profileId, 5),
      deps,
    );
    if (!closing.ok) throw new Error(`실패: ${closing.reason}`);
    expect(closing.value.summary).not.toContain(SAMPLE_PHONE);
    expect(closing.summaryBlocked).toBe(true);
  });
});

describe("새 꼴 회화 턴 앞머리 · 기록", () => {
  it("새 꼴 회화 턴: 첫 문장 전 연결 오류는 같은 입력으로 한 번 다시 부른다", async () => {
    const { fake, deps, ctxOf } = harness([
      once({ kind: "network-error" }),
      once(stream(sampleBody(L3_OK))),
    ]);
    const result = await talkLessonTurn(
      talkLessonSampleFor(L3_OK),
      ctxOf(null, 3),
      deps,
    );
    expect(result.ok).toBe(true);
    expect(fake.requests).toHaveLength(2);
    expect(fake.requests[1]?.bodyText).toBe(fake.requests[0]?.bodyText);
    expect((await rows()).map((r) => [r.status, r.errorCode])).toEqual([
      ["error", "connection"],
      ["success", null],
    ]);
  });

  it("새 꼴 회화 턴: 하루 안전 상한에 닿으면 부르지 않고 safety_cap 행을 남긴다", async () => {
    const profileId = await insertProfile(1);
    await insertUsedCall(profileId);
    const { fake, deps, sentences, ctxOf } = harness([
      once(stream(sampleBody(L3_OK))),
    ]);
    const result = await talkLessonTurn(
      talkLessonSampleFor(L3_OK),
      ctxOf(profileId, 3),
      deps,
    );
    expect(result).toEqual({ ok: false, reason: "safety_cap", refusals: 0 });
    expect(fake.requests).toHaveLength(0);
    expect(sentences).toEqual([]);
    expect((await rows()).map((r) => r.status)).toEqual([
      "success",
      "safety_cap",
    ]);
  });

  it("새 꼴 끝맺음 턴: 하루 안전 상한에 닿으면 부르지 않고 safety_cap 행을 남긴다", async () => {
    const profileId = await insertProfile(1);
    await insertUsedCall(profileId);
    const { fake, deps } = harness([once(stream(sampleBody(L5_CLOSING)))]);
    const result = await talkLessonClosing(
      closingInput(),
      closingCtx(profileId, 5),
      deps,
    );
    expect(result).toEqual({ ok: false, reason: "safety_cap", refusals: 0 });
    expect(fake.requests).toHaveLength(0);
    expect((await rows()).map((r) => [r.purpose, r.status])).toEqual([
      ["talk_turn", "success"],
      ["talk_closing", "safety_cap"],
    ]);
  });

  it("새 꼴 회화 턴: ai_calls 에 첫 문장 시간이 서버가 요청을 받은 때부터 남는다", async () => {
    const { deps, ctxOf } = harness([
      once(stream(sampleBody(L3_OK), { firstDelayMs: 200 })),
    ]);
    const waitedBefore = 300;
    const ctx = {
      ...ctxOf(null, 3),
      requestReceivedAt: new Date(Date.now() - waitedBefore),
    };
    const result = await talkLessonTurn(talkLessonSampleFor(L3_OK), ctx, deps);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    const [row] = await rows();
    expect(row?.firstSentenceMs).toBe(result.firstSentenceMs);
    expect(row?.firstSentenceMs ?? 0).toBeGreaterThanOrEqual(waitedBefore);
    expect(row?.firstSentenceMs ?? 0).toBeLessThanOrEqual(
      (row?.latencyMs ?? 0) + waitedBefore + MS_PER_SECOND,
    );
  });

  it("새 꼴 회화 턴: 설정 문제면 부르지 않고 config 로 돌아오며 기록이 없다", async () => {
    await deleteHouseholdSetting("talk.good_lines");
    const { fake, deps, ctxOf } = harness([once(stream(sampleBody(L3_OK)))]);
    const result = await talkLessonTurn(
      talkLessonSampleFor(L3_OK),
      ctxOf(null, 3),
      deps,
    );
    expect(result).toEqual({ ok: false, reason: "config", refusals: 0 });
    expect(fake.requests).toHaveLength(0);
    expect(await rows()).toEqual([]);
  });
});

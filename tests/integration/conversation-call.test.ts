// 회화 턴 · 끝맺음 턴 흐름(plan-p13a 작업 2 증명 표 — AC-15b · 15k · 8f · 8i · 8c · 16b · N4 · 회화 턴 넷, 8절 회화 턴 실패 · 6.1 · 6.4 · C92).
// 가짜 Anthropic(fetch 주입, SSE 'stream' 응답)만 쓰고 실제 API 를 부르지 않는다. 숫자는 TEST_SETTINGS · 견본에서 읽는다.
// 아이 이름 · 전화번호 · 주소는 지어낸 견본(sample-inputs)이다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, getTableColumns, isNull } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { talkUserMessage, toriRewriteOf } from "@/core/ai/calls/talk";
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
import { type TalkDeps, talkClosing, talkTurn } from "@/server/ai";
import { createAnthropicClient } from "@/server/ai/client";
import { insertAiCall } from "@/server/ai/store";
import { TALK_REFUSAL_RETRY } from "@/server/ai/talk";
import type { Db } from "@/server/db";
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
  SAMPLE_TEACHER_LEO,
  talkSample,
} from "../fixtures/ai/sample-inputs";
import { TEST_SETTINGS } from "../fixtures/settings";
import { createTestDatabase, seedSettings, type TestDatabase } from "./test-db";

const SAMPLES_DIR = join(process.cwd(), "tests/fixtures/ai/samples");
const MS_PER_SECOND = 1000;
/** 짧은 실시간 타임아웃(초) — 끝맺음 턴이 이것이 아니라 feedback 으로 기다리는지 본다(시험 값). */
const SHORT_REALTIME_SECONDS = 1;
/** 첫 조각을 늦추는 시간(ms) — SHORT_REALTIME_SECONDS 보다 길고 feedback 보다 짧게(시험 값). */
const DELAY_PAST_REALTIME_MS = 1500;
const NOT_STORED = ["prompt", "response", "body", "content", "message"];

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

/** 1~3 구간을 Haiku 로 고른 시험의 모델(C112 뒤 기본은 Sonnet). */
const HAIKU = "claude-haiku-5-5";

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
    requestedModel: "claude-haiku-5-5",
    answeredModel: "claude-haiku-5-5",
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
    onSentence: (s: string) => sentences.push(s),
  });
  return { fake, deps, sentences, ctxOf };
}

type RequestBody = {
  model: string;
  max_tokens: number;
  thinking: { type: string };
  output_config: { effort: string };
  fallbacks?: string;
  system: string;
  messages: { role: string; content: string }[];
};
const bodyOf = (fake: ReturnType<typeof createFakeAnthropic>, i: number) =>
  fake.requests[i]?.body as RequestBody;

async function rows() {
  return testDb.db.select().from(aiCalls).orderBy(aiCalls.calledAt);
}

/** 회화 턴 응답 칸(빈 값 + 덮어쓴 칸, stuck · tori_en 먼저 — C127). */
function answer(over: Record<string, unknown>): Record<string, unknown> {
  return {
    stuck: false,
    tori_en: "Nice!",
    tori_ko: "좋아!",
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    card_question_no: 0,
    next_question_en: "",
    next_question_ko: "",
    next_hint_ko: "",
    next_hints: [],
    next_usable_phrases: [],
    next_targets: [],
    next_answer_example: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
}

describe("AC-15b 흘려 보내기 · 회화 턴 실패", () => {
  it("AC-15b 회화 턴을 흘려 보내는 가짜 클라이언트에서 검사에 걸린 문장은 내보낸 조각에 없다", async () => {
    const { deps, sentences, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.l1-blocked"), { chunks: 9 })),
    ]);
    const input = talkSample(1);
    const result = await talkTurn(input, ctxOf(null, 1), deps);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(sentences[0]).toBe("Nice!");
    expect(sentences).toHaveLength(2);
    for (const banned of [
      "Where do you live?",
      "The child is great.",
      "That is stupid.",
      "What color is it?",
    ])
      expect(sentences).not.toContain(banned);
    expect(result.blocked).toEqual([
      "personal",
      "meta",
      "forbidden",
      "question",
    ]);
    expect((await rows()).map((r) => r.status)).toEqual(["validation_failed"]);
  });

  it("AC-15b 한국어 뜻은 영어가 다 흐른 뒤 한 번에 나오고 뜻에 걸린 문장이 있으면 뜻 전체가 비어 있다", async () => {
    const order: string[] = [];
    const { deps, ctxOf } = harness([
      once(
        stream(
          messageBody({
            model: "claude-haiku-5-5",
            json: answer({
              tori_en: "Great! Two apples.",
              tori_ko: "좋아! 너 어디 살아?",
            }),
          }),
          { chunks: 4 },
        ),
      ),
      once(
        stream(
          messageBody({
            model: "claude-haiku-5-5",
            json: answer({
              tori_en: "Great! Two apples.",
              tori_ko: "좋아! 사과 두 개.",
            }),
          }),
        ),
      ),
    ]);
    const ctx = {
      ...ctxOf(null, 1),
      onSentence: (s: string) => order.push(`en:${s}`),
    };
    const blocked = await talkTurn(talkSample(1), ctx, deps);
    if (!blocked.ok) throw new Error(`실패: ${blocked.reason}`);
    order.push(`ko:${blocked.value.tori_ko}`);
    expect(order).toEqual(["en:Great!", "en:Two apples.", "ko:"]);
    const clean = await talkTurn(talkSample(1), ctxOf(null, 1), deps);
    if (!clean.ok) throw new Error(`실패: ${clean.reason}`);
    expect(clean.value.tori_ko).toBe("좋아! 사과 두 개.");
  });

  it("AC-15b 힌트가 Zod 검증에 실패하면 다시 요청하지 않고 힌트가 빈 채 돌아온다", async () => {
    const { fake, deps, ctxOf } = harness([
      once(
        stream(
          messageBody({
            model: "claude-sonnet-5-5",
            json: answer({
              tori_en: "Cool! What else?",
              next_hints: "not a list",
              card_question_no: 2,
            }),
          }),
        ),
      ),
    ]);
    const result = await talkTurn(talkSample(4), ctxOf(null, 4), deps);
    expect(fake.requests).toHaveLength(1);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.normalized).toBe(true);
    expect(result.value.next_hints).toEqual([]);
    expect(result.value.card_question_no).toBe(2);
  });

  it("AC-15b 첫 문장 뒤 스트림이 끊기면 보낸 문장을 두고 그 턴이 닫힌다", async () => {
    const { fake, deps, sentences, ctxOf } = harness([
      {
        reply: stream(sampleBody("talk_turn.l1-ok"), {
          chunks: 20,
          // 첫 문장 'Two apples!' 뒤 · 둘째 문장 안(앞 칸 stuck 을 더한 C127 차례)
          cutAfterChars: '{"stuck":false,"tori_en":"Two apples! Great'.length,
        }),
      },
    ]);
    const result = await talkTurn(talkSample(1), ctxOf(null, 1), deps);
    expect(fake.requests).toHaveLength(1);
    expect(result).toMatchObject({
      ok: false,
      reason: "cut_after_first",
      sentSentences: ["Two apples!"],
    });
    expect(sentences).toEqual(["Two apples!"]);
    expect((await rows()).map((r) => [r.status, r.errorCode])).toEqual([
      ["error", "connection"],
    ]);
  });

  it("AC-15b fallback 블록이 끼인 표본에서 토리의 말은 한 번만 내보내진다", async () => {
    const { deps, sentences, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.fallback"), { chunks: 4 })),
    ]);
    const result = await talkTurn(talkSample(4), ctxOf(null, 4), deps);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(sentences).toEqual([
      "Nice!",
      "You went to the park.",
      "What did you do there?",
    ]);
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  it("AC-15b Haiku 5.5 거절 표본에서 Sonnet 5.5 로 한 번 다시 부르고 그것도 거절이면 거절로 돌아온다", async () => {
    // C112 뒤 1~3 기본은 Sonnet — 설정으로 Haiku 를 고른 때의 길
    await setHouseholdSetting("ai.model.talk_turn.1-3", HAIKU);
    const { fake, deps, ctxOf } = harness([
      { reply: stream(sampleBody("talk_turn.refusal")) },
    ]);
    const result = await talkTurn(talkSample(1), ctxOf(null, 1), deps);
    expect(result).toEqual({ ok: false, reason: "refusal", refusals: 2 });
    expect([bodyOf(fake, 0).model, bodyOf(fake, 1).model]).toEqual([
      HAIKU,
      TALK_REFUSAL_RETRY.model,
    ]);
    expect((await rows()).map((r) => [r.status, r.requestedModel])).toEqual([
      ["refusal", HAIKU],
      ["refusal", TALK_REFUSAL_RETRY.model],
    ]);
  });

  it("AC-15b 첫 문장 뒤 거절이면 Sonnet 재시도 없이 그 턴이 닫힌다", async () => {
    const body = {
      ...messageBody({ model: "claude-haiku-5-5", json: {} }),
      content: [
        {
          type: "text",
          text: '{"stuck":false,"tori_en":"Nice job! I like that. ',
          citations: null,
        },
      ],
      stop_reason: "refusal",
      stop_details: { type: "refusal", category: "cyber", explanation: null },
    };
    const { fake, deps, ctxOf } = harness([{ reply: stream(body) }]);
    const result = await talkTurn(talkSample(1), ctxOf(null, 1), deps);
    expect(fake.requests).toHaveLength(1);
    expect(result).toMatchObject({
      ok: false,
      reason: "cut_after_first",
      cause: "refusal",
    });
    expect((await rows()).map((r) => r.status)).toEqual(["refusal"]);
  });
});

describe("AC-19d 회화 턴 요청의 선생님 블록(가짜 클라이언트)", () => {
  it("AC-19d 회화 턴 요청 본문의 시스템 첫머리는 그 대화 선생님의 블록이고 첫 사용자 메시지 이름표는 그 선생님의 영어 이름이며 'Tori' · 'squirrel' 이 없다", async () => {
    const { fake, deps, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.l1-ok"))),
      once(stream(sampleBody("talk_turn.l1-ok"))),
    ]);
    const mina = talkSample(1, {
      openingLine: "Hi {NAME}! How are you today?",
      turn: { segment: "greeting" },
    });
    const leo = { ...mina, teacher: SAMPLE_TEACHER_LEO };
    expect((await talkTurn(mina, ctxOf(null, 1), deps)).ok).toBe(true);
    expect((await talkTurn(leo, ctxOf(null, 1), deps)).ok).toBe(true);
    const [minaBody, leoBody] = [bodyOf(fake, 0), bodyOf(fake, 1)];
    const systemText = (b: RequestBody) => JSON.stringify(b.system);
    expect(systemText(minaBody)).toContain(
      `You are Mina, an AI teacher character in an English learning app for Korean children.`,
    );
    expect(systemText(leoBody)).toContain("You are Leo, an AI teacher");
    expect(minaBody.messages[0]?.content).toMatch(
      /^Mina \(app\): Hi \{NAME\}! How are you today\?\n/,
    );
    expect(leoBody.messages[0]?.content).toMatch(/^Leo \(app\): /);
    for (const i of [0, 1]) {
      const text = fake.requests[i]?.bodyText ?? "";
      expect(text).not.toMatch(/\bTori\b/);
      expect(text).not.toMatch(/squirrel/i);
    }
  });
});

describe("AC-15k · AC-8f · AC-8i · AC-8c 요청 꼴 · 기록", () => {
  it("AC-15k 둘째 턴 요청 본문은 앞 턴 요청의 메시지를 글자 그대로 앞에 두고 대화 도중 모델 · effort · 생각 단계가 바뀌지 않으며 Haiku 5.5 거절 뒤 Sonnet 5.5 로 다시 부른 턴만 예외다", async () => {
    // C112 뒤 1~3 기본은 Sonnet — 설정으로 Haiku 를 고른 때의 길
    await setHouseholdSetting("ai.model.talk_turn.1-3", HAIKU);
    const haiku = HAIKU;
    const { fake, deps, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.l1-ok"))),
      once(stream(sampleBody("talk_turn.refusal")), haiku),
      once(stream(sampleBody("talk_turn.l1-ok")), TALK_REFUSAL_RETRY.model),
      once(stream(sampleBody("talk_turn.l1-ok"))),
    ]);
    const first = talkSample(1, {
      openingLine: "How are you today?",
      turn: { segment: "greeting_end" },
    });
    const r1 = await talkTurn(first, ctxOf(null, 1), deps);
    if (!r1.ok) throw new Error(`실패: ${r1.reason}`);
    const sent1 = talkUserMessage(
      first.turn,
      first.openingLine,
      first.teacher.nameEn,
    );
    const history = [
      {
        user: sent1,
        assistant: toriRewriteOf({
          sentSentences: r1.sentSentences,
          appended: ["What is this?"],
        }),
      },
    ];
    const second = talkSample(1, { history, turn: { child: "It is a ball." } });
    const r2 = await talkTurn(second, ctxOf(null, 1), deps);
    expect(r2.ok).toBe(true);
    const third = talkSample(1, {
      history: [
        ...history,
        { user: talkUserMessage(second.turn), assistant: "Great!" },
      ],
      turn: { child: "It is red." },
    });
    expect((await talkTurn(third, ctxOf(null, 1), deps)).ok).toBe(true);
    const bodies = fake.requests.map((r) => r.body as RequestBody);
    expect(bodies).toHaveLength(4);
    // 둘째 턴 메시지는 첫 턴 메시지를 글자 그대로 앞에 둔다
    expect(bodies[1]?.messages[0]).toEqual(bodies[0]?.messages[0]);
    expect(bodies[3]?.messages.slice(0, 2)).toEqual(
      bodies[1]?.messages.slice(0, 2),
    );
    expect(bodies[0]?.system).toBe(bodies[3]?.system);
    // 모델 · effort · 생각 단계: 거절 뒤 한 턴(셋째 요청)만 Sonnet
    expect(bodies.map((b) => b.model)).toEqual([
      haiku,
      haiku,
      TALK_REFUSAL_RETRY.model,
      haiku,
    ]);
    for (const i of [0, 1, 3]) {
      expect(bodies[i]?.output_config.effort).toBe(
        bodies[0]?.output_config.effort,
      );
      expect(bodies[i]?.thinking).toEqual(bodies[0]?.thinking);
    }
    expect(bodies[2]?.messages).toEqual(bodies[1]?.messages);
  });

  it("AC-8f 설정으로 Haiku 를 고른 회화 턴 요청은 effort low · thinking disabled 이고 fallbacks 가 없다", async () => {
    // C112 뒤 1~3 기본은 Sonnet(아래 시험) — 이 시험은 설정으로 1~3 구간을 Haiku 로 고른 때
    await setHouseholdSetting("ai.model.talk_turn.1-3", HAIKU);
    const { fake, deps, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.l1-ok"))),
    ]);
    await talkTurn(talkSample(1), ctxOf(null, 1), deps);
    const body = bodyOf(fake, 0);
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.output_config.effort).toBe("low");
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.fallbacks).toBeUndefined();
    expect(body.max_tokens).toBe(
      TEST_SETTINGS["ai.max_tokens.talk_turn"].value,
    );
  });

  it("AC-8f 회화 턴 요청은 1~3단계 기본값이면 claude-sonnet-5-5 · effort low · thinking between_tools 이고 서버 측 대체 모델 재시도를 켠다(C112)", async () => {
    const { fake, deps, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.l1-ok"))),
    ]);
    await talkTurn(talkSample(1), ctxOf(null, 1), deps);
    const body = bodyOf(fake, 0);
    expect(body.model).toBe("claude-sonnet-5-5");
    expect(body.output_config.effort).toBe("low");
    expect(body.thinking).toEqual({ type: "between_tools" });
    expect(body.fallbacks).toBe("default");
    expect(fake.requests[0]?.headers["anthropic-beta"]).toContain(
      "server-side-fallback",
    );
  });

  it("AC-8f 4단계부터 회화 턴 요청은 claude-sonnet-5-5 · effort low · thinking between_tools 이고 서버 측 대체 모델 재시도를 켠다", async () => {
    const { fake, deps, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.l4-ok"))),
    ]);
    await talkTurn(talkSample(4), ctxOf(null, 4), deps);
    const body = bodyOf(fake, 0);
    expect(body.model).toBe("claude-sonnet-5-5");
    expect(body.output_config.effort).toBe("low");
    expect(body.thinking).toEqual({ type: "between_tools" });
    expect(body.fallbacks).toBe("default");
    expect(fake.requests[0]?.headers["anthropic-beta"]).toContain(
      "server-side-fallback",
    );
  });

  it("AC-8f 대체 모델이 답한 회화 턴의 ai_calls 비용은 usage.iterations 항목별 단가로 계산된다", async () => {
    const profileId = await insertProfile();
    const { deps, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.fallback"))),
    ]);
    const result = await talkTurn(talkSample(4), ctxOf(profileId, 4), deps);
    expect(result.ok).toBe(true);
    const body = sampleBody("talk_turn.fallback") as unknown as MessageLike;
    const requested = TEST_SETTINGS["ai.model.talk_turn.4-6"].value;
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

  it("AC-8i 4~6 구간 회화 모델을 claude-haiku-5-5 로 바꾸면 그 구간 회화 턴 요청은 thinking disabled 이고 fallbacks 가 없다", async () => {
    await setHouseholdSetting("ai.model.talk_turn.4-6", "claude-haiku-5-5");
    const { fake, deps, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.l4-ok"))),
    ]);
    await talkTurn(talkSample(4), ctxOf(null, 4), deps);
    const body = bodyOf(fake, 0);
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.fallbacks).toBeUndefined();
  });

  it("AC-8i 1-3 구간 effort 를 medium 으로 바꿔도 4-6 구간 회화 턴 요청은 low 다", async () => {
    await setHouseholdSetting("ai.effort.talk_turn.1-3", "medium");
    const { fake, deps, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.l4-ok"))),
      once(stream(sampleBody("talk_turn.l1-ok"))),
    ]);
    await talkTurn(talkSample(4), ctxOf(null, 4), deps);
    await talkTurn(talkSample(1), ctxOf(null, 1), deps);
    expect(bodyOf(fake, 0).output_config.effort).toBe("low");
    expect(bodyOf(fake, 1).output_config.effort).toBe("medium");
  });

  it("AC-8c 끝맺음 턴 요청의 max_tokens 는 ai.max_tokens.talk_closing 이고 ai.timeout_seconds.feedback 으로 기다리며 ai_calls 에 talk_closing 행이 프롬프트 · 응답 본문 없이 남는다", async () => {
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
        stream(sampleBody("talk_turn.l5-closing"), {
          firstDelayMs: DELAY_PAST_REALTIME_MS,
        }),
      ),
    ]);
    const result = await talkClosing(
      talkSample(5, { turn: { closing: true, child: "" } }),
      { profileId, sessionId: null, level: 5, requestReceivedAt: new Date() },
      deps,
    );
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.value.summary).not.toBe("");
    expect(fake.requests).toHaveLength(1);
    expect(bodyOf(fake, 0).max_tokens).toBe(
      TEST_SETTINGS["ai.max_tokens.talk_closing"].value,
    );
    const saved = await rows();
    expect(saved.map((r) => [r.purpose, r.status])).toEqual([
      ["talk_closing", "validation_failed"],
    ]);
    const columns = Object.keys(getTableColumns(aiCalls)).map((c) =>
      c.toLowerCase(),
    );
    for (const word of NOT_STORED)
      expect(columns.some((c) => c.includes(word))).toBe(false);
  });
});

describe("AC-16b · AC-N4 가림", () => {
  it("AC-16b 회화 턴 요청 본문에 지난 대화 요약이 최근 talk.memory_summaries 개 들어가고 요청 본문에는 전화번호 · 주소 형태와 프로필 이름이 없다", async () => {
    const profileId = await insertProfile();
    const count = TEST_SETTINGS["talk.memory_summaries"].value;
    const summaries = Array.from(
      { length: count },
      (_, i) =>
        `${SAMPLE_NAMES.displayName}는 ${i + 1}번째 이야기에서 사과를 좋아한다고 했다.`,
    );
    const { fake, deps, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.l1-ok"))),
    ]);
    await talkTurn(
      talkSample(1, {
        summaries,
        turn: {
          child: `I am ${SAMPLE_NAMES.englishName}. ${SAMPLE_PHONE} ${SAMPLE_ADDRESS}`,
        },
      }),
      ctxOf(profileId, 1),
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

  it("AC-N4 회화 입력의 전화번호 형태가 회화 턴 요청 본문과 끝맺음 턴 요약에서 가려진다", async () => {
    const profileId = await insertProfile();
    const { fake, deps, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.l1-ok"))),
      once(
        stream(
          messageBody({
            model: "claude-sonnet-5-5",
            json: answer({
              tori_en: "",
              tori_ko: "",
              farewell: "It was fun!",
              summary: `전화번호 ${SAMPLE_PHONE} 를 말했다.`,
            }),
          }),
        ),
      ),
    ]);
    await talkTurn(
      talkSample(1, { turn: { child: `Call ${SAMPLE_PHONE}` } }),
      ctxOf(profileId, 1),
      deps,
    );
    expect(fake.requests[0]?.bodyText).not.toContain(SAMPLE_PHONE);
    const closing = await talkClosing(
      talkSample(5, { turn: { closing: true, child: "" } }),
      { profileId, sessionId: null, level: 5, requestReceivedAt: new Date() },
      deps,
    );
    if (!closing.ok) throw new Error(`실패: ${closing.reason}`);
    expect(closing.value.summary).not.toContain(SAMPLE_PHONE);
    expect(closing.summaryBlocked).toBe(true);
  });
});

describe("회화 턴 앞머리 · 기록", () => {
  it("회화 턴: 첫 문장 전 연결 오류는 같은 입력으로 한 번 다시 부른다", async () => {
    const { fake, deps, ctxOf } = harness([
      once({ kind: "network-error" }),
      once(stream(sampleBody("talk_turn.l1-ok"))),
    ]);
    const result = await talkTurn(talkSample(1), ctxOf(null, 1), deps);
    expect(result.ok).toBe(true);
    expect(fake.requests).toHaveLength(2);
    expect(fake.requests[1]?.bodyText).toBe(fake.requests[0]?.bodyText);
    expect((await rows()).map((r) => [r.status, r.errorCode])).toEqual([
      ["error", "connection"],
      ["success", null],
    ]);
  });

  it("회화 턴: 하루 안전 상한에 닿으면 부르지 않고 safety_cap 행을 남긴다", async () => {
    const profileId = await insertProfile(1);
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
      requestedModel: "claude-haiku-5-5",
      answeredModel: "claude-haiku-5-5",
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
    const { fake, deps, sentences, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.l1-ok"))),
    ]);
    const result = await talkTurn(talkSample(1), ctxOf(profileId, 1), deps);
    expect(result).toEqual({ ok: false, reason: "safety_cap", refusals: 0 });
    expect(fake.requests).toHaveLength(0);
    expect(sentences).toEqual([]);
    expect((await rows()).map((r) => r.status)).toEqual([
      "success",
      "safety_cap",
    ]);
  });

  it("회화 턴: 하루 안전 상한 닫힘의 기록 쓰기가 실패해도 safety_cap 으로 돌아오고 이름 · 코드만 든 기록 한 줄을 남긴다(rev-p13b N-4)", async () => {
    const profileId = await insertProfile(1);
    await insertUsedCall(profileId);
    const fk = Object.assign(new Error("insert or update violates"), {
      code: "23503",
    });
    // ai_calls 쓰기만 실패하는 DB(읽기 · 다른 쓰기는 그대로)
    const failingDb = new Proxy(testDb.db, {
      get(target, prop) {
        if (prop === "insert")
          return (table: unknown) => {
            if (table === aiCalls) throw fk;
            return target.insert(table as typeof aiCalls);
          };
        const value = Reflect.get(target, prop);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as Db;
    const logged: string[] = [];
    const log = vi
      .spyOn(console, "error")
      .mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(" "));
      });
    try {
      const { fake, deps, sentences, ctxOf } = harness(
        [once(stream(sampleBody("talk_turn.l1-ok")))],
        { db: failingDb },
      );
      const result = await talkTurn(talkSample(1), ctxOf(profileId, 1), deps);
      expect(result).toEqual({ ok: false, reason: "safety_cap", refusals: 0 });
      expect(fake.requests).toHaveLength(0);
      expect(sentences).toEqual([]);
      expect((await rows()).map((r) => r.status)).toEqual(["success"]);
      expect(logged).toEqual(["회화 안전 상한 기록 실패(Error 23503)"]);
    } finally {
      log.mockRestore();
    }
  });

  it("회화 턴: ai_calls 에 첫 문장 시간이 서버가 요청을 받은 때부터 남는다", async () => {
    const { deps, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.l1-ok"), { firstDelayMs: 200 })),
    ]);
    const waitedBefore = 300;
    const ctx = {
      ...ctxOf(null, 1),
      requestReceivedAt: new Date(Date.now() - waitedBefore),
    };
    const result = await talkTurn(talkSample(1), ctx, deps);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    const [row] = await rows();
    expect(row?.firstSentenceMs).toBe(result.firstSentenceMs);
    expect(row?.firstSentenceMs ?? 0).toBeGreaterThanOrEqual(waitedBefore);
    expect(row?.firstSentenceMs ?? 0).toBeLessThanOrEqual(
      (row?.latencyMs ?? 0) + waitedBefore + MS_PER_SECOND,
    );
  });

  it("회화 턴: 설정 문제면 부르지 않고 config 로 돌아온다", async () => {
    await deleteHouseholdSetting("talk.good_lines");
    const { fake, deps, ctxOf } = harness([
      once(stream(sampleBody("talk_turn.l1-ok"))),
    ]);
    const result = await talkTurn(talkSample(1), ctxOf(null, 1), deps);
    expect(result).toEqual({ ok: false, reason: "config", refusals: 0 });
    expect(fake.requests).toHaveLength(0);
    expect(await rows()).toEqual([]);
  });
});

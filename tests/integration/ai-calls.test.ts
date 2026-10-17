// AC-8c · 6.1 · 6.4 흐름(다시 요청 · 정규화 · 출력 검사 · 가림 · 목록 없음)(plan-p09c 증명 표).
// 가짜 Anthropic(fetch 주입)만 쓰고 실제 API 를 부르지 않는다. 숫자는 TEST_SETTINGS · 표본에서 읽는다.
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { getTableColumns } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { SAFE_LINE_KO } from "@/core/ai/calls/common";
import {
  billedAttemptsOf,
  costOf,
  type MessageLike,
  priceBookOf,
  priceRowsOfSeed,
} from "@/core/ai/cost";
import { SEED_FILES } from "@/core/seed/structure";
import { profiles } from "@/db/schema/learning";
import { aiCalls, parentAlerts } from "@/db/schema/operations";
import {
  type AiDeps,
  checkWriting,
  evaluateSpeaking,
  thinkoutTurn,
  writeFeedback,
} from "@/server/ai";
import { createAnthropicClient } from "@/server/ai/client";
import {
  getOutputCheckLists,
  loadSeedList,
  SeedListError,
} from "@/server/seed-lists";
import {
  createFakeAnthropic,
  type FakeReply,
  type FakeRule,
} from "../fixtures/ai/fake-anthropic";
import {
  FIXTURE_EFFECTIVE_FROM,
  MODEL_PRICES_FIXTURE,
  seedModelPrices,
} from "../fixtures/ai/model-prices";
import {
  SAMPLE_FORBIDDEN,
  SAMPLE_NAMES,
  SAMPLE_PHONE,
  speakingAnswerSample,
  thinkoutSample,
  WRITING_CHECK_SAMPLE,
  writingFeedbackSample,
} from "../fixtures/ai/sample-inputs";
import { TEST_SETTINGS } from "../fixtures/settings";
import { createTestDatabase, seedSettings, type TestDatabase } from "./test-db";

const SAMPLES_DIR = join(process.cwd(), "tests/fixtures/ai/samples");

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
/** 표본 하나를 그 규격 제목의 요청에 한 번 답하는 규칙으로. */
function once(id: string, reply: FakeReply = replyOf(id)): FakeRule {
  return { when: { purpose: sample(id).title }, reply, times: 1 };
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

async function insertProfile(): Promise<string> {
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
  return row.id;
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

async function rows() {
  return testDb.db.select().from(aiCalls).orderBy(aiCalls.calledAt);
}

const book = priceBookOf(
  priceRowsOfSeed(MODEL_PRICES_FIXTURE),
  FIXTURE_EFFECTIVE_FROM,
);
function expectedCost(id: string, requested: string) {
  const body = sample(id).response.body as unknown as MessageLike;
  return costOf(billedAttemptsOf(body, requested), book);
}

const ctxOf = (profileId: string | null, level: number) => ({
  profileId,
  sessionId: null,
  level,
});

const NOT_STORED = [
  "prompt",
  "response",
  "body",
  "content",
  "system",
  "messages",
];

describe("AC-8c 기록", () => {
  it("AC-8c 네 호출 뒤 ai_calls 에 프로필 · 요청 모델 · 답한 모델 · 토큰 넷 · 단가표 비용 · 결과 상태 · 학습일이 남고 프롬프트 · 응답 본문 열이 없다", async () => {
    const profileId = await insertProfile();
    const { fake, deps } = harness([
      once("writing_check.ok"),
      once("writing_feedback.ok"),
      once("speaking_eval.answer.ok"),
      once("thinkout.ok"),
    ]);
    const results = [
      await checkWriting(WRITING_CHECK_SAMPLE, ctxOf(profileId, 4), deps),
      await writeFeedback(writingFeedbackSample(6), ctxOf(profileId, 6), deps),
      await evaluateSpeaking(
        { mode: "answer", ...speakingAnswerSample(4) },
        ctxOf(profileId, 4),
        deps,
      ),
      await thinkoutTurn(thinkoutSample(1), ctxOf(profileId, 6), deps),
    ];
    expect(results.map((r) => r.ok)).toEqual([true, true, true, true]);
    expect(fake.requests).toHaveLength(4);
    const saved = await rows();
    expect(saved).toHaveLength(4);
    const expected = [
      ["writing_check", "writing_check.ok"],
      ["writing_feedback", "writing_feedback.ok"],
      ["speaking_eval", "speaking_eval.answer.ok"],
      ["thinkout", "thinkout.ok"],
    ] as const;
    for (const [purpose, id] of expected) {
      const row = saved.find((r) => r.purpose === purpose);
      const requested = TEST_SETTINGS[`ai.model.${purpose}`].value;
      const body = sample(id).response.body as unknown as MessageLike;
      const cost = expectedCost(id, requested);
      expect(row).toMatchObject({
        profileId,
        requestedModel: requested,
        answeredModel: body.model,
        inputTokens: cost.tokens.input,
        outputTokens: cost.tokens.output,
        cacheWriteTokens: cost.tokens.cacheWrite,
        cacheReadTokens: cost.tokens.cacheRead,
        costUsd: cost.costUsd,
        priceMissing: false,
        status: "success",
        errorCode: null,
      });
      expect(row?.learningDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row?.latencyMs).toBeGreaterThanOrEqual(0);
    }
    const columns = Object.keys(getTableColumns(aiCalls)).map((c) =>
      c.toLowerCase(),
    );
    for (const word of NOT_STORED) {
      expect(columns.some((c) => c.includes(word))).toBe(false);
    }
  });

  it("AC-8c 요청 본문에 temperature · top_p · top_k 가 없고 max_tokens 는 ai.max_tokens.<목적>이다(네 호출)", async () => {
    const { fake, deps } = harness([
      once("writing_check.ok"),
      once("writing_feedback.ok"),
      once("speaking_eval.answer.ok"),
      once("thinkout.ok"),
    ]);
    await checkWriting(WRITING_CHECK_SAMPLE, ctxOf(null, 4), deps);
    await writeFeedback(writingFeedbackSample(6), ctxOf(null, 6), deps);
    await evaluateSpeaking(
      { mode: "answer", ...speakingAnswerSample(4) },
      ctxOf(null, 4),
      deps,
    );
    await thinkoutTurn(thinkoutSample(1), ctxOf(null, 6), deps);
    const purposes = [
      "writing_check",
      "writing_feedback",
      "speaking_eval",
      "thinkout",
    ] as const;
    expect(fake.requests).toHaveLength(purposes.length);
    fake.requests.forEach((request, i) => {
      const body = request.body as Record<string, unknown>;
      for (const key of ["temperature", "top_p", "top_k", "metadata"]) {
        expect(body).not.toHaveProperty(key);
      }
      const purpose = purposes[i] as (typeof purposes)[number];
      expect(body.max_tokens).toBe(
        TEST_SETTINGS[`ai.max_tokens.${purpose}`].value,
      );
      // 구조화 출력 형식이 붙고 제목이 목적 이름이다
      const format = (
        body.output_config as { format?: { schema?: { title?: string } } }
      ).format;
      expect(format?.schema?.title?.split(".")[0]).toBe(purpose);
    });
  });

  it("AC-8c 대체 모델이 답하면 답한 모델 열이 바뀌고 비용은 iterations 항목별 단가 합이다", async () => {
    const { deps } = harness([once("writing_check.fallback")]);
    const result = await checkWriting(
      WRITING_CHECK_SAMPLE,
      ctxOf(null, 4),
      deps,
    );
    expect(result.ok).toBe(true);
    const [row] = await rows();
    const requested = TEST_SETTINGS["ai.model.writing_check"].value;
    const body = sample("writing_check.fallback").response
      .body as unknown as MessageLike;
    expect(row?.requestedModel).toBe(requested);
    expect(row?.answeredModel).toBe(body.model);
    expect(row?.answeredModel).not.toBe(requested);
    expect(row?.costUsd).toBe(
      expectedCost("writing_check.fallback", requested).costUsd,
    );
    // iterations 항목 둘의 합(요청 모델 + 대체 모델)이고 top-level usage 만이 아니다
    expect(row?.inputTokens).toBe(
      (body.usage.iterations ?? []).reduce((n, it) => n + it.input_tokens, 0),
    );
  });
});

describe("6.1 · 6.4 흐름", () => {
  it("6.1 흐름: 엄격 규격 실패 → 1회 다시 요청 → 행 둘(validation_failed · success)", async () => {
    const { fake, deps } = harness([
      once("writing_check.over"),
      once("writing_check.ok"),
    ]);
    const result = await checkWriting(
      WRITING_CHECK_SAMPLE,
      ctxOf(null, 4),
      deps,
    );
    expect(result).toMatchObject({
      ok: true,
      normalized: false,
      checked: false,
    });
    expect(fake.requests).toHaveLength(2);
    expect((await rows()).map((r) => r.status)).toEqual([
      "validation_failed",
      "success",
    ]);
  });

  it("6.1 흐름: 두 번 다 엄격 실패면 정규화한 값을 돌려주고 두 행 모두 validation_failed", async () => {
    const { fake, deps } = harness([
      once("writing_check.over"),
      once("writing_check.over"),
    ]);
    const result = await checkWriting(
      WRITING_CHECK_SAMPLE,
      ctxOf(null, 4),
      deps,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.normalized).toBe(true);
    expect(result.value.fixes).toHaveLength(1);
    expect(fake.requests).toHaveLength(2);
    expect((await rows()).map((r) => r.status)).toEqual([
      "validation_failed",
      "validation_failed",
    ]);
  });

  it("6.1 흐름: max_tokens 로 끝난 응답은 다시 요청한다", async () => {
    const { fake, deps } = harness([
      once("writing_feedback.max-tokens"),
      once("writing_feedback.ok"),
    ]);
    const result = await writeFeedback(
      writingFeedbackSample(6),
      ctxOf(null, 6),
      deps,
    );
    expect(result.ok).toBe(true);
    expect(fake.requests).toHaveLength(2);
    expect((await rows()).map((r) => r.status)).toEqual([
      "validation_failed",
      "success",
    ]);
  });

  it("6.4 흐름: 출력 검사에 걸리면 바꾼 값을 돌려주고 그 행은 validation_failed", async () => {
    const ok = sample("writing_check.ok").response.body;
    const answer = JSON.parse(
      ((ok.content as { text: string }[])[0] as { text: string }).text,
    );
    const blocked = {
      ...ok,
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ...answer,
            praise: "바보 같은 실수가 없어요.",
          }),
          citations: null,
        },
      ],
    };
    const { deps } = harness([
      {
        when: { purpose: "writing_check" },
        reply: { kind: "message", body: blocked },
      },
    ]);
    const result = await checkWriting(
      WRITING_CHECK_SAMPLE,
      ctxOf(null, 4),
      deps,
    );
    expect(result).toMatchObject({ ok: true, checked: true });
    if (!result.ok) return;
    expect(result.value.praise).toBe(SAFE_LINE_KO);
    expect((await rows()).map((r) => r.status)).toEqual(["validation_failed"]);
  });

  it("6.4 흐름: 시드 금지어 목록이 없거나 틀리면 AI 를 부르지 않는다", async () => {
    const root = mkdtempSync(join(tmpdir(), "momo-lists-"));
    try {
      const missing = harness([once("writing_check.ok")], {
        lists: () => getOutputCheckLists({ root }),
      });
      expect(
        await checkWriting(WRITING_CHECK_SAMPLE, ctxOf(null, 4), missing.deps),
      ).toEqual({ ok: false, reason: "config", refusals: 0 });
      expect(missing.fake.requests).toHaveLength(0);
      const file = join(root, "seed", SEED_FILES.forbidden);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, JSON.stringify({ words: { en: [] } }));
      const invalid = harness([once("writing_check.ok")], {
        lists: () => getOutputCheckLists({ root }),
      });
      expect(
        await checkWriting(WRITING_CHECK_SAMPLE, ctxOf(null, 4), invalid.deps),
      ).toEqual({ ok: false, reason: "config", refusals: 0 });
      expect(invalid.fake.requests).toHaveLength(0);
      expect(await rows()).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("시드 목록: 임시 폴더 뿌리에서 금지어 목록을 읽고, 없으면 missing · JSON 이 틀리면 invalid", () => {
    const root = mkdtempSync(join(tmpdir(), "momo-lists-"));
    const catchOf = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return e;
      }
      return undefined;
    };
    try {
      expect(catchOf(() => loadSeedList("forbidden", { root }))).toMatchObject({
        list: "forbidden",
        reason: "missing",
      });
      const file = join(root, "seed", SEED_FILES.forbidden);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, "{ not json");
      const error = catchOf(() => loadSeedList("forbidden", { root }));
      expect(error).toBeInstanceOf(SeedListError);
      expect(error).toMatchObject({ list: "forbidden", reason: "invalid" });
      // 메시지에 파일 내용이 없다
      expect(String(error)).not.toContain("not json");
      writeFileSync(file, JSON.stringify(SAMPLE_FORBIDDEN));
      expect(loadSeedList("forbidden", { root })).toEqual(SAMPLE_FORBIDDEN);
      expect(getOutputCheckLists({ root }).forbidden).toEqual(SAMPLE_FORBIDDEN);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("6.1 흐름: 프로필 이름 · 전화번호가 요청 본문에 없다", async () => {
    const profileId = await insertProfile();
    const { fake, deps } = harness([
      once("writing_check.ok"),
      once("writing_feedback.ok"),
    ]);
    // 견본 아이 글에 지어낸 이름(Ganada) · 전화번호 꼴이 든다
    expect(WRITING_CHECK_SAMPLE.sentences.join(" ")).toContain(
      SAMPLE_NAMES.englishName,
    );
    expect(writingFeedbackSample(6).draft).toContain(SAMPLE_PHONE);
    await checkWriting(WRITING_CHECK_SAMPLE, ctxOf(profileId, 4), deps);
    await writeFeedback(writingFeedbackSample(6), ctxOf(profileId, 6), deps);
    expect(fake.requests).toHaveLength(2);
    for (const request of fake.requests) {
      expect(request.bodyText).not.toContain(SAMPLE_PHONE);
      expect(request.bodyText).not.toContain(SAMPLE_NAMES.displayName);
      expect(request.bodyText.toLowerCase()).not.toContain(
        SAMPLE_NAMES.englishName.toLowerCase(),
      );
    }
    expect(fake.requests[0]?.bodyText).toContain("{NAME}");
  });

  it("6.1 흐름: 생각 꺼내기 둘째 턴 요청은 첫 턴 메시지를 글자 그대로 앞에 둔다", async () => {
    const { fake, deps } = harness([once("thinkout.ok"), once("thinkout.ok")]);
    const first = await thinkoutTurn(thinkoutSample(1), ctxOf(null, 6), deps);
    if (!first.ok || first.historyEntry === undefined) {
      throw new Error("첫 턴 기록 글이 없다");
    }
    const second = await thinkoutTurn(
      thinkoutSample(2, {
        history: [{ assistant: first.historyEntry, answer: "수영했어요" }],
      }),
      ctxOf(null, 6),
      deps,
    );
    expect(second.ok).toBe(true);
    const [one, two] = fake.requests.map(
      (r) =>
        (r.body as { messages: { role: string; content: string }[] }).messages,
    );
    expect(two?.slice(0, one?.length)).toEqual(one);
    expect(two?.[1]).toEqual({
      role: "assistant",
      content: first.historyEntry,
    });
    const [b1, b2] = fake.requests.map(
      (r) => r.body as Record<string, unknown>,
    );
    expect(b2?.system).toBe(b1?.system);
    expect(b2?.cache_control).toEqual({ type: "ephemeral" });
  });

  it("6.1 흐름: 엄격 규격을 지난 응답도 정규화를 거친다(한국어 피드백은 첫 문장)", async () => {
    const ok = sample("speaking_eval.answer.ok").response.body;
    const answer = JSON.parse(
      ((ok.content as { text: string }[])[0] as { text: string }).text,
    );
    const twoSentences = {
      ...ok,
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ...answer,
            feedback: `${answer.feedback} 다음에는 문장으로 말해 봐요.`,
          }),
          citations: null,
        },
      ],
    };
    const { deps } = harness([
      {
        when: { purpose: "speaking_eval.answer" },
        reply: { kind: "message", body: twoSentences },
      },
    ]);
    const result = await evaluateSpeaking(
      { mode: "answer", ...speakingAnswerSample(4) },
      ctxOf(null, 4),
      deps,
    );
    expect(result).toMatchObject({ ok: true, normalized: false });
    if (!result.ok) return;
    expect((result.value as { feedback: string }).feedback).toBe(
      answer.feedback,
    );
    expect((await rows()).map((r) => r.status)).toEqual(["success"]);
  });

  it("흐름: 턴 번호 어긋남은 호출부 결함이라 서버 오류로 던지고 ai_calls 행이 없다", async () => {
    const { fake, deps } = harness([once("thinkout.ok")]);
    await expect(
      thinkoutTurn(thinkoutSample(1, { turn: 3 }), ctxOf(null, 6), deps),
    ).rejects.toBeInstanceOf(RangeError);
    expect(fake.requests).toHaveLength(0);
    expect(await rows()).toEqual([]);
  });
});

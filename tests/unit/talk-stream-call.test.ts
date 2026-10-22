// 회화 턴 흐름의 DB 없는 몫(plan-p13a 파일별 값 3 · 4 · 6, 8절 회화 턴 실패 · 6.1 대체 모델 · 6.4). 가짜 Anthropic 의 SSE 'stream' 응답을
// SDK 클라이언트에 끼워 시도 · 흘려 보내기 · 다음 할 일 · 정규화 · 출력 검사를 본다. DB 를 읽는 앞머리(runTalkCall)는 통합 시험(CI)이 본다.
// 실제 API 를 부르지 않는다. 숫자는 시험용 설정 · 견본에서 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  type TalkTurnInput,
  talkClosingSpec,
  talkTurnSpec,
} from "@/core/ai/calls/talk";
import { capabilitiesOf, requestConfigOf } from "@/core/ai/combo";
import { priceBookOf, priceRowsOfSeed } from "@/core/ai/cost";
import { createMasker } from "@/core/ai/mask";
import {
  ForbiddenFileSchema,
  MetaSentencesFileSchema,
} from "@/core/seed/schema/reference";
import { createAnthropicClient } from "@/server/ai/client";
import {
  keepTurnOnRecordFailure,
  streamTalk,
  TALK_REFUSAL_RETRY,
  type TalkAttemptRecord,
  type TalkStreamPlan,
} from "@/server/ai/talk";
import {
  createFakeAnthropic,
  type FakeReply,
  type FakeRule,
  messageBody,
  streamStepsOf,
} from "../fixtures/ai/fake-anthropic";
import {
  FIXTURE_EFFECTIVE_FROM,
  MODEL_PRICES_FIXTURE,
} from "../fixtures/ai/model-prices";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_NAMES,
  talkSample,
} from "../fixtures/ai/sample-inputs";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const SAMPLES = join(process.cwd(), "tests/fixtures/ai/samples");
const FORBIDDEN = ForbiddenFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/lists/forbidden.json"), "utf8"),
  ),
);
const META = MetaSentencesFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/lists/meta-sentences.json"), "utf8"),
  ),
).phrases;
const comboBook = new Map(
  MODEL_PRICES_FIXTURE.models.map((m) => [
    m.model,
    { caps: capabilitiesOf(m) },
  ]),
);
const priceBook = priceBookOf(
  priceRowsOfSeed(MODEL_PRICES_FIXTURE),
  FIXTURE_EFFECTIVE_FROM,
);
const masker = createMasker({
  names: SAMPLE_NAMES,
  isVocabWord: () => false,
  contactPatterns: SAMPLE_CONTACT_PATTERNS,
});

function sampleBody(id: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(SAMPLES, `${id}.json`), "utf8")).response
    .body;
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

/** 시험용 회화 턴 응답 칸(빈 값 + 덮어쓴 칸, 칸 차례는 stuck · tori_en 먼저 — C127). */
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

function harness(
  rules: FakeRule[],
  input: TalkTurnInput,
  over: Partial<TalkStreamPlan> = {},
) {
  const fake = createFakeAnthropic(rules);
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "test-key" },
    fetch: fake.fetch,
  });
  const spec = input.turn.closing ? talkClosingSpec : talkTurnSpec;
  const config = requestConfigOf({
    purpose: spec.purpose,
    level: input.level,
    values,
    book: comboBook,
  });
  const rows: TalkAttemptRecord[] = [];
  const sentences: string[] = [];
  const startedAt = new Date();
  const plan: TalkStreamPlan = {
    spec,
    input,
    rules: spec.rulesOf(values, input),
    config,
    otherModelConfig: null,
    masker,
    forbidden: FORBIDDEN,
    metaPhrases: META,
    book: priceBook,
    client,
    clock: () => new Date(),
    startedAt,
    requestReceivedAt: startedAt,
    onSentence: input.turn.closing ? undefined : (s) => sentences.push(s),
    record: async (row) => {
      rows.push(row);
    },
    ...over,
  };
  return { fake, plan, rows, sentences, config };
}

/** Haiku 5.5 를 1~3 구간 회화 모델로 고른 요청 구성(C112 뒤 기본은 Sonnet — Haiku 거절 뒤 Sonnet 재시도 길은 이 설정에서만). */
function haikuConfigOf(level: number) {
  return requestConfigOf({
    purpose: "talk_turn",
    level,
    values: { ...values, "ai.model.talk_turn.1-3": HAIKU },
    book: comboBook,
  });
}
const HAIKU = "claude-haiku-5-5";
/** 견본 l1-ok 에서 첫 문장('Two apples!') 뒤 · 둘째 문장 안에서 끊는 글자 자리(앞 칸 stuck 을 더한 C127 차례). */
const FIRST_SENTENCE_CUT = '{"stuck":false,"tori_en":"Two apples! Great'.length;

function otherConfigOf(level: number) {
  return requestConfigOf({
    purpose: "talk_turn",
    level,
    values: {
      ...values,
      "ai.model.talk_turn.1-3": TALK_REFUSAL_RETRY.model,
      "ai.effort.talk_turn.1-3": TALK_REFUSAL_RETRY.effort,
      "ai.thinking.talk_turn.1-3": TALK_REFUSAL_RETRY.thinking,
    },
    book: comboBook,
  });
}

describe("회화 턴 요청 구성(C112)", () => {
  it("회화 턴 요청 구성: 1~3단계 기본값은 claude-sonnet-5-5 · effort low 이고 생각 '끔'은 Sonnet 의 between_tools 로 보낸다", () => {
    for (const level of [1, 3]) {
      const config = requestConfigOf({
        purpose: "talk_turn",
        level,
        values,
        book: comboBook,
      });
      expect(config).toMatchObject({
        model: "claude-sonnet-5-5",
        effort: "low",
        thinking: { type: "between_tools" },
      });
    }
    // 설정으로 Haiku 를 고르면 끔은 disabled(6.1)
    expect(haikuConfigOf(1).thinking).toEqual({ type: "disabled" });
  });
});

describe("회화 턴 흐름(DB 없는 몫): 흘려 보내기 · 검사", () => {
  it("회화 턴 흐름: 검사에 걸린 문장은 내보내지 않고 첫 자리만 안전한 대사로 바뀌며 tori_en 은 내보낸 문장이다", async () => {
    const input = talkSample(1);
    const { plan, rows, sentences } = harness(
      [once(stream(sampleBody("talk_turn.l1-blocked"), { chunks: 9 }))],
      input,
    );
    const result = await streamTalk(plan);
    const safe =
      input.card.safeLines[
        (input.history.length + 1) % input.card.safeLines.length
      ]?.en;
    expect(sentences).toEqual(["Nice!", safe]);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.streamed).toBe(true);
    expect(result.value.tori_en).toBe(`Nice! ${safe}`);
    expect(result.blocked).toEqual([
      "personal",
      "meta",
      "forbidden",
      "question",
    ]);
    expect(result.firstSentenceMs).not.toBeNull();
    // 걸린 칸이 있으면 그 시도는 검증 실패(6.4 · C63 (4))
    expect(rows.map((r) => r.status)).toEqual(["validation_failed"]);
    expect(rows[0]?.firstSentenceMs).toBe(result.firstSentenceMs);
  });

  it("회화 턴 흐름: 한국어 뜻은 영어가 다 흐른 뒤 값으로 오고 뜻에 걸린 말이 있으면 뜻 전체가 빈다", async () => {
    const input = talkSample(1);
    const body = messageBody({
      model: "claude-haiku-5-5",
      json: answer({
        tori_en: "Great! Two apples.",
        tori_ko: "좋아! 너 어디 살아?",
      }),
    });
    const { plan, sentences } = harness(
      [once(stream(body, { chunks: 4 }))],
      input,
    );
    const result = await streamTalk(plan);
    expect(sentences).toEqual(["Great!", "Two apples."]);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.value.tori_ko).toBe("");
    expect(result.checked).toBe(true);
  });

  it("회화 턴 흐름: 힌트가 Zod 검증에 실패하면 다시 요청하지 않고 힌트가 빈 채 돌아온다", async () => {
    const input = talkSample(4);
    const body = messageBody({
      model: "claude-sonnet-5-5",
      json: answer({
        tori_en: "Cool! What else?",
        next_hints: "not a list",
        card_question_no: 2,
      }),
    });
    const { fake, plan, rows } = harness([once(stream(body))], input);
    const result = await streamTalk(plan);
    expect(fake.requests).toHaveLength(1);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.normalized).toBe(true);
    expect(result.value.next_hints).toEqual([]);
    expect(result.value.card_question_no).toBe(2);
    expect(rows.map((r) => r.status)).toEqual(["validation_failed"]);
  });

  it("회화 턴 흐름: 첫 속성이 tori_en 이 아니면 흘려 보내지 않고 응답 끝에서 한 번에 내보낸다", async () => {
    const input = talkSample(1);
    const json = answer({ tori_en: "Wow! A red ball." });
    const reordered = { tori_ko: json.tori_ko, ...json };
    const body = messageBody({ model: "claude-haiku-5-5", json: reordered });
    const { plan, sentences } = harness([once(stream(body))], input);
    const result = await streamTalk(plan);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.streamed).toBe(false);
    expect(sentences).toEqual(["Wow!", "A red ball."]);
  });

  it("회화 턴 흐름: fallback 블록이 끼인 표본에서 토리의 말은 한 번만 내보내지고 비용은 iterations 항목별이다", async () => {
    const input = talkSample(4);
    const { plan, rows, sentences } = harness(
      [once(stream(sampleBody("talk_turn.fallback"), { chunks: 4 }))],
      input,
    );
    const result = await streamTalk(plan);
    expect(sentences).toEqual([
      "Nice!",
      "You went to the park.",
      "What did you do there?",
    ]);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.answeredModel).toBe("claude-sonnet-5");
    expect(rows[0]?.answeredModel).toBe("claude-sonnet-5");
    expect(rows[0]?.costUsd).not.toBe("0.000000");
  });

  it("회화 턴 흐름: 끝맺음 턴은 흘려 보내지 않고 끝인사 · 요약을 값으로 돌려준다", async () => {
    const input = talkSample(5, { turn: { closing: true, child: "" } });
    const { plan, rows, sentences, config } = harness(
      [once(stream(sampleBody("talk_turn.l5-closing")))],
      input,
    );
    const result = await streamTalk(plan);
    expect(sentences).toEqual([]);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.value.tori_en).toBe("");
    expect(result.value.farewell).not.toBe("");
    expect(result.value.summary).not.toBe("");
    expect(config.purpose).toBe("talk_closing");
    expect(rows).toHaveLength(1);
  });
});

describe("회화 턴 흐름(DB 없는 몫): 막힘 판단 먼저(C127)", () => {
  it("회화 턴 흐름: tori_en 앞 칸의 막힘 판단(stuck)을 첫 문장보다 먼저 알린다", async () => {
    const input = talkSample(1);
    for (const stuck of [true, false]) {
      const events: string[] = [];
      const { plan } = harness(
        [
          once(
            stream(
              messageBody({
                model: "claude-sonnet-5-5",
                json: answer({ stuck, tori_en: "That's okay! Let's try." }),
              }),
              { chunks: 12 },
            ),
          ),
        ],
        input,
        {
          onStuck: (value) => events.push(`stuck:${value}`),
          onSentence: (sentence) => events.push(sentence),
        },
      );
      const result = await streamTalk(plan);
      if (!result.ok) throw new Error(`실패: ${result.reason}`);
      expect(events).toEqual([`stuck:${stuck}`, "That's okay!", "Let's try."]);
      expect(result.value.stuck).toBe(stuck);
    }
  });
});

describe("회화 턴 흐름(DB 없는 몫): 시도 기록 실패(검토 rev-p13b M-1)", () => {
  it("회화 턴 흐름: 시도 기록(ai_calls) 쓰기가 실패해도 받은 응답 · 흘려 보낸 문장은 그대로이고 이름 · 코드만 든 기록 한 줄을 남긴다", async () => {
    const input = talkSample(1);
    const logged: string[] = [];
    const log = vi
      .spyOn(console, "error")
      .mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(" "));
      });
    try {
      const fk = Object.assign(new Error("insert or update violates"), {
        code: "23503",
      });
      const { plan, sentences } = harness(
        [
          once(
            stream(
              messageBody({
                model: "claude-sonnet-5-5",
                json: answer({ tori_en: "Nice! Good job." }),
              }),
            ),
          ),
        ],
        input,
        {
          record: keepTurnOnRecordFailure(async () => {
            throw fk;
          }),
        },
      );
      const result = await streamTalk(plan);
      if (!result.ok) throw new Error(`실패: ${result.reason}`);
      expect(result.value.tori_en).toBe("Nice! Good job.");
      expect(sentences).toEqual(["Nice!", "Good job."]);
      expect(logged).toEqual(["회화 시도 기록 실패(Error 23503)"]);
      // 아이 글 · 토리 글이 기록에 없다
      expect(logged.join(" ")).not.toContain("Nice");
      expect(logged.join(" ")).not.toContain(input.turn.child);
    } finally {
      log.mockRestore();
    }
  });
});

describe("회화 턴 흐름(DB 없는 몫): 실패 길(8절)", () => {
  it("회화 턴 흐름: 첫 문장 뒤 스트림이 끊기면 다시 부르지 않고 보낸 문장을 두고 그 턴이 닫힌다", async () => {
    const input = talkSample(1);
    const { fake, plan, rows, sentences } = harness(
      [
        {
          reply: stream(sampleBody("talk_turn.l1-ok"), {
            chunks: 20,
            cutAfterChars: FIRST_SENTENCE_CUT,
          }),
        },
      ],
      input,
    );
    const result = await streamTalk(plan);
    expect(fake.requests).toHaveLength(1);
    expect(result).toMatchObject({
      ok: false,
      reason: "cut_after_first",
      sentSentences: ["Two apples!"],
      cause: "connection",
    });
    expect(sentences).toEqual(["Two apples!"]);
    expect(rows.map((r) => [r.status, r.errorCode])).toEqual([
      ["error", "connection"],
    ]);
  });

  it("회화 턴 흐름: 첫 문장 전 연결 오류는 같은 입력으로 한 번 다시 부르고 두 번째도 실패면 연결 실패다", async () => {
    const input = talkSample(1);
    const ok = harness(
      [
        once({ kind: "network-error" }),
        once(stream(sampleBody("talk_turn.l1-ok"))),
      ],
      input,
    );
    const first = await streamTalk(ok.plan);
    expect(first.ok).toBe(true);
    expect(ok.fake.requests).toHaveLength(2);
    expect(ok.fake.requests[0]?.bodyText).toBe(ok.fake.requests[1]?.bodyText);
    expect(ok.rows.map((r) => r.status)).toEqual(["error", "success"]);
    const bad = harness([{ reply: { kind: "network-error" } }], input);
    expect(await streamTalk(bad.plan)).toEqual({
      ok: false,
      reason: "connection",
      refusals: 0,
    });
    expect(bad.fake.requests).toHaveLength(2);
  });

  it("회화 턴 흐름: 첫 text 가 타임아웃 안에 안 오면 끊고 한 번 다시 부른다", async () => {
    const input = talkSample(1);
    const { fake, plan, rows } = harness(
      [
        once(stream(sampleBody("talk_turn.l1-ok"), { firstDelayMs: 2000 })),
        once(stream(sampleBody("talk_turn.l1-ok"))),
      ],
      input,
    );
    const short = { ...plan.config, timeoutMs: 1100 };
    const result = await streamTalk({ ...plan, config: short });
    expect(result.ok).toBe(true);
    expect(fake.requests).toHaveLength(2);
    expect(rows.map((r) => [r.status, r.errorCode])).toEqual([
      ["timeout", "timeout"],
      ["success", null],
    ]);
  });

  it("회화 턴 흐름: Haiku 5.5 첫 문장 전 거절이면 Sonnet 5.5 로 한 번 다시 부르고 그것도 거절이면 거절로 돌아온다", async () => {
    const input = talkSample(1);
    const refusal = sampleBody("talk_turn.refusal");
    const { fake, plan, rows } = harness([{ reply: stream(refusal) }], input, {
      config: haikuConfigOf(1),
      otherModelConfig: otherConfigOf(1),
    });
    const result = await streamTalk(plan);
    expect(result).toEqual({ ok: false, reason: "refusal", refusals: 2 });
    const bodies = fake.requests.map(
      (r) =>
        r.body as {
          model: string;
          messages: unknown;
          thinking: unknown;
          output_config: { effort: string };
        },
    );
    expect(bodies.map((b) => b.model)).toEqual([
      "claude-haiku-5-5",
      TALK_REFUSAL_RETRY.model,
    ]);
    expect(bodies[1]?.output_config.effort).toBe("low");
    expect(bodies[1]?.thinking).toEqual({ type: "between_tools" });
    expect(JSON.stringify(bodies[1]?.messages)).toBe(
      JSON.stringify(bodies[0]?.messages),
    );
    expect(rows.map((r) => [r.status, r.requestedModel])).toEqual([
      ["refusal", "claude-haiku-5-5"],
      ["refusal", TALK_REFUSAL_RETRY.model],
    ]);
    // 다시 부른 쪽이 답하면 그 답을 쓴다
    const ok = harness(
      [
        once(stream(refusal), "claude-haiku-5-5"),
        once(stream(sampleBody("talk_turn.l1-ok")), TALK_REFUSAL_RETRY.model),
      ],
      input,
      { config: haikuConfigOf(1), otherModelConfig: otherConfigOf(1) },
    );
    const answered = await streamTalk(ok.plan);
    if (!answered.ok) throw new Error(`실패: ${answered.reason}`);
    expect(answered.retriedOtherModel).toBe(true);
  });

  it("회화 턴 흐름: 첫 문장 뒤 거절이면 Sonnet 재시도 없이 그 턴이 닫힌다", async () => {
    const input = talkSample(1);
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
    const { fake, plan, rows } = harness([{ reply: stream(body) }], input, {
      otherModelConfig: otherConfigOf(1),
    });
    const result = await streamTalk(plan);
    expect(fake.requests).toHaveLength(1);
    expect(result).toMatchObject({
      ok: false,
      reason: "cut_after_first",
      sentSentences: ["Nice job!", "I like that."],
      cause: "refusal",
    });
    expect(rows.map((r) => r.status)).toEqual(["refusal"]);
  });

  it("회화 턴 흐름: 첫 문장 전 max_tokens 는 다시 부르지 않고 실패다", async () => {
    const input = talkSample(4);
    const { fake, plan } = harness(
      [{ reply: stream(sampleBody("talk_turn.max-tokens")) }],
      input,
    );
    const result = await streamTalk(plan);
    // 'Great! I like that.' 가 먼저 흐르므로 첫 문장 뒤 끊김이다
    expect(fake.requests).toHaveLength(1);
    expect(result).toMatchObject({
      ok: false,
      reason: "cut_after_first",
      cause: "max_tokens",
    });
  });

  it("회화 턴 흐름: 스트림 도중 오류 이벤트(overloaded)가 첫 문장 전이면 다시 부르지 않고 서버 실패로 끝나며 행 하나를 남긴다", async () => {
    const input = talkSample(1);
    const { fake, plan, rows, sentences } = harness(
      [
        {
          reply: stream(sampleBody("talk_turn.l1-ok"), {
            chunks: 10,
            errorAfterChars: 14,
          }),
        },
      ],
      input,
    );
    const result = await streamTalk(plan);
    expect(result).toEqual({ ok: false, reason: "server", refusals: 0 });
    expect(fake.requests).toHaveLength(1);
    expect(sentences).toEqual([]);
    expect(rows.map((r) => [r.status, r.errorCode])).toEqual([
      ["error", "server:529"],
    ]);
  });

  it("회화 턴 흐름: 스트림 도중 오류 이벤트가 첫 문장 뒤면 보낸 문장을 두고 그 턴을 닫는다", async () => {
    const input = talkSample(1);
    const { fake, plan, rows } = harness(
      [
        {
          reply: stream(sampleBody("talk_turn.l1-ok"), {
            chunks: 20,
            errorAfterChars: FIRST_SENTENCE_CUT,
            errorType: "api_error",
          }),
        },
      ],
      input,
    );
    const result = await streamTalk(plan);
    expect(fake.requests).toHaveLength(1);
    expect(result).toMatchObject({
      ok: false,
      reason: "cut_after_first",
      sentSentences: ["Two apples!"],
      cause: "server",
    });
    expect(rows.map((r) => [r.status, r.errorCode])).toEqual([
      ["error", "server:500"],
    ]);
  });

  it("회화 턴 흐름: 문장을 받는 쪽이 던지면 그 시도를 기록한 뒤 그 오류를 다시 던진다", async () => {
    const input = talkSample(1);
    const { plan, rows } = harness(
      [{ reply: stream(sampleBody("talk_turn.l1-ok"), { chunks: 10 }) }],
      input,
    );
    const gone = new Error("연결 닫힘");
    await expect(
      streamTalk({
        ...plan,
        onSentence: () => {
          throw gone;
        },
      }),
    ).rejects.toBe(gone);
    expect(rows.map((r) => [r.status, r.errorCode])).toEqual([
      ["error", "connection"],
    ]);
  });

  it("회화 턴 흐름: 끊기거나 끊은 시도의 ai_calls 행은 그때까지의 스냅숏 usage 로 입력 토큰 · 비용을 센다", async () => {
    const input = talkSample(1);
    const { plan, rows } = harness(
      [
        {
          reply: stream(sampleBody("talk_turn.l1-ok"), {
            chunks: 20,
            cutAfterChars: FIRST_SENTENCE_CUT,
          }),
        },
      ],
      input,
    );
    await streamTalk(plan);
    expect(rows[0]?.inputTokens).toBeGreaterThan(0);
    expect(rows[0]?.costUsd).not.toBe("0.000000");
    expect(rows[0]?.answeredModel).toBe("claude-haiku-5-5");
  });

  it("가짜 SSE: message_start 는 요청 모델로 시작하고 fallback 블록에서 대체 모델로 바뀐다", () => {
    const steps = streamStepsOf({
      kind: "stream",
      body: sampleBody("talk_turn.fallback"),
    });
    const first = steps[0];
    if (first?.kind !== "data") throw new Error("첫 걸음이 이벤트가 아니다");
    const start = JSON.parse(first.text.split("data: ")[1] ?? "{}") as {
      message: { model: string };
    };
    expect(start.message.model).toBe("claude-sonnet-5-5");
  });
});

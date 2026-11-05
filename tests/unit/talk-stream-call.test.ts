// 회화 턴 흐름의 DB 없는 몫(plan-p13a 파일별 값 3 · 4 · 6, 8절 회화 턴 실패 · 6.1 대체 모델 · 6.4). 가짜 Anthropic 의 SSE 'stream' 응답을
// SDK 클라이언트에 끼워 시도 · 흘려 보내기 · 다음 할 일 · 정규화 · 출력 검사를 본다. DB 를 읽는 앞머리(runTalkLessonCall)는 통합 시험(CI)이
// 본다. 회화 plan 묶음 12 가 옛 꼴 입구(streamTalk)를 지우며 같은 몸통(streamCore)의 시험을 새 꼴 입구(streamTalkLesson) · 새 꼴 응답으로
// 옮겼다(1~3단계 물음표 문장은 문장 문이 지우지 않는다 — 정한 것 19). 실제 API 를 부르지 않는다. 숫자는 시험용 설정 · 견본에서 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  type TalkLessonInput,
  talkLessonClosingSpec,
  talkLessonTurnSpec,
} from "@/core/ai/calls/talk-lesson";
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
  streamTalkLesson,
  TALK_REFUSAL_RETRY,
  type TalkAttemptRecord,
  type TalkLessonStreamPlan,
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
} from "../fixtures/ai/sample-inputs";
import { talkLessonSampleFor } from "../fixtures/ai/talk-lesson-inputs";
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
const SAFE_LINE = "Let's talk about something fun!";
/** 성공 견본(3단계 AI 차례 — tori_en 'Oh, soccer! I like soccer too. When is your free day?'). */
const OK = "talk_turn.v2-l3-ai";

function sampleBody(id: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(SAMPLES, `${id}.json`), "utf8")).response
    .body;
}
/** 견본 응답의 JSON 값(text 조각을 이은 것). */
function sampleAnswer(id: string): Record<string, unknown> {
  const content = sampleBody(id).content as { type: string; text?: string }[];
  return JSON.parse(
    content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join(""),
  );
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

/** 시험용 새 꼴 회화 턴 응답 칸(성공 견본 + 덮어쓴 칸, 칸 차례는 stuck · tori_en 먼저 — C127). */
function answer(over: Record<string, unknown>): Record<string, unknown> {
  return { ...sampleAnswer(OK), ...over };
}

function harness(
  rules: FakeRule[],
  input: TalkLessonInput,
  over: Partial<TalkLessonStreamPlan> = {},
) {
  const fake = createFakeAnthropic(rules);
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "test-key" },
    fetch: fake.fetch,
  });
  const spec = input.turn.closing ? talkLessonClosingSpec : talkLessonTurnSpec;
  const config = requestConfigOf({
    purpose: spec.purpose,
    level: input.level,
    values,
    book: comboBook,
  });
  const rows: TalkAttemptRecord[] = [];
  const sentences: string[] = [];
  const startedAt = new Date();
  const plan: TalkLessonStreamPlan = {
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
    safeLine: SAFE_LINE,
    onSentence: input.turn.closing ? undefined : (s) => sentences.push(s),
    record: async (row) => {
      rows.push(row);
    },
    ...over,
  };
  return { fake, plan, rows, sentences, config };
}

/** 3단계 견본 입력(3단계 AI 차례). */
const lowInput = () => talkLessonSampleFor(OK);

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
/** 성공 견본에서 첫 문장('Oh, soccer!') 뒤 · 둘째 문장 안에서 끊는 글자 자리(앞 칸 stuck 을 더한 C127 차례). */
const FIRST_SENTENCE_CUT = '{"stuck":false,"tori_en":"Oh, soccer! I like'
  .length;

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

/** 출력 전 거절 응답(cyber, 출력 없음 — 과금되지 않는다). */
function refusalBody(model: string): Record<string, unknown> {
  return {
    ...messageBody({
      model,
      json: {},
      stopReason: "refusal",
      stopDetails: { category: "cyber" },
    }),
    content: [],
  };
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
  it("회화 턴 흐름: 검사에 걸린 문장은 내보내지 않고 첫 자리만 안전한 대사로 바뀌며 tori_en 은 내보낸 문장이다(1~3단계 물음표 문장은 지우지 않음 — 정한 것 19)", async () => {
    const input = lowInput();
    const body = messageBody({
      model: "claude-sonnet-5-5",
      json: answer({
        tori_en:
          "Nice! Where do you live? The child is great. That is stupid. What color is it?",
        tori_ko: ["좋아!"],
      }),
    });
    const { plan, rows, sentences } = harness(
      [once(stream(body, { chunks: 9 }))],
      input,
    );
    const result = await streamTalkLesson(plan);
    expect(sentences).toEqual(["Nice!", SAFE_LINE, "What color is it?"]);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.streamed).toBe(true);
    expect(result.value.tori_en).toBe(`Nice! ${SAFE_LINE} What color is it?`);
    expect(result.blocked).toEqual(["personal", "meta", "forbidden"]);
    expect(result.firstSentenceMs).not.toBeNull();
    // 걸린 칸이 있으면 그 시도는 검증 실패(6.4 · C63 (4))
    expect(rows.map((r) => r.status)).toEqual(["validation_failed"]);
    expect(rows[0]?.firstSentenceMs).toBe(result.firstSentenceMs);
  });

  it("회화 턴 흐름: 한국어 뜻은 영어가 다 흐른 뒤 문장마다 값으로 오고 뜻에 걸린 말이 있으면 그 문장의 뜻만 빈다(13절 C202 (5))", async () => {
    const input = lowInput();
    const body = messageBody({
      model: "claude-sonnet-5-5",
      json: answer({
        tori_en: "Great! Two apples.",
        tori_ko: ["좋아!", "너 어디 살아?"],
      }),
    });
    const { plan, sentences } = harness(
      [once(stream(body, { chunks: 4 }))],
      input,
    );
    const result = await streamTalkLesson(plan);
    expect(sentences).toEqual(["Great!", "Two apples."]);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.value.tori_ko).toEqual(["좋아!", ""]);
    expect(result.checked).toBe(true);
  });

  it("회화 턴 흐름: 힌트가 Zod 검증에 실패하면 다시 요청하지 않고 힌트가 빈 채 돌아온다", async () => {
    const input = lowInput();
    const base = answer({});
    const body = messageBody({
      model: "claude-sonnet-5-5",
      json: answer({ next_hints: "not a list" }),
    });
    const { fake, plan, rows } = harness([once(stream(body))], input);
    const result = await streamTalkLesson(plan);
    expect(fake.requests).toHaveLength(1);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.normalized).toBe(true);
    expect(result.value.next_hints).toEqual([]);
    // 다른 칸은 그대로다
    expect(result.value.card_item).toEqual(base.card_item);
    expect(rows.map((r) => r.status)).toEqual(["validation_failed"]);
  });

  it("회화 턴 흐름: 앞 칸이 stuck · tori_en 이 아니면 흘려 보내지 않고 응답 끝에서 한 번에 내보내며 그 전에 막힘 판단을 알린다(rev-p13b N-1)", async () => {
    const input = lowInput();
    for (const stuck of [false, true]) {
      const json = answer({ stuck, tori_en: "Wow! A red ball." });
      const reordered = { tori_ko: json.tori_ko, ...json };
      const body = messageBody({ model: "claude-sonnet-5-5", json: reordered });
      const events: string[] = [];
      const { plan } = harness([once(stream(body))], input, {
        onStuck: (value) => events.push(`stuck:${value}`),
        onSentence: (sentence) => events.push(sentence),
      });
      const result = await streamTalkLesson(plan);
      if (!result.ok) throw new Error(`실패: ${result.reason}`);
      expect(result.streamed).toBe(false);
      // 끝에서 한 번에 내보내는 길도 막힘 판단을 첫 문장보다 먼저 한 번만 알린다(C125 (3) · C127)
      expect(events).toEqual([`stuck:${stuck}`, "Wow!", "A red ball."]);
      expect(result.value.stuck).toBe(stuck);
    }
  });

  it("회화 턴 흐름: 흘려 받는 동안 막힘 판단을 이미 알렸으면 응답 끝에서 다시 알리지 않는다", async () => {
    const input = lowInput();
    const events: string[] = [];
    const body = messageBody({
      model: "claude-sonnet-5-5",
      json: answer({ stuck: true, tori_en: "That's okay! Let's try." }),
    });
    const { plan } = harness([once(stream(body, { chunks: 6 }))], input, {
      onStuck: (value) => events.push(`stuck:${value}`),
    });
    const result = await streamTalkLesson(plan);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.streamed).toBe(true);
    expect(events).toEqual(["stuck:true"]);
  });

  it("회화 턴 흐름: fallback 블록이 끼인 표본에서 토리의 말은 한 번만 내보내지고 비용은 iterations 항목별이다", async () => {
    const id = "talk_turn.v2-l3-fallback";
    const input = talkLessonSampleFor(id);
    const { plan, rows, sentences } = harness(
      [once(stream(sampleBody(id), { chunks: 4 }))],
      input,
    );
    const result = await streamTalkLesson(plan);
    expect(sentences).toEqual([
      "Oh, soccer!",
      "I like soccer too.",
      "When is your free day?",
    ]);
    if (!result.ok) throw new Error(`실패: ${result.reason}`);
    expect(result.answeredModel).toBe("claude-sonnet-5");
    expect(rows[0]?.answeredModel).toBe("claude-sonnet-5");
    expect(rows[0]?.costUsd).not.toBe("0.000000");
  });

  it("회화 턴 흐름: 끝맺음 턴은 흘려 보내지 않고 끝인사 · 요약을 값으로 돌려준다", async () => {
    const id = "talk_turn.v2-l5-closing";
    const input = talkLessonSampleFor(id);
    expect(input.turn.closing).toBe(true);
    const { plan, rows, sentences, config } = harness(
      [once(stream(sampleBody(id)))],
      input,
    );
    const result = await streamTalkLesson(plan);
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
    const input = lowInput();
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
      const result = await streamTalkLesson(plan);
      if (!result.ok) throw new Error(`실패: ${result.reason}`);
      expect(events).toEqual([`stuck:${stuck}`, "That's okay!", "Let's try."]);
      expect(result.value.stuck).toBe(stuck);
    }
  });
});

describe("회화 턴 흐름(DB 없는 몫): 시도 기록 실패(검토 rev-p13b M-1)", () => {
  it("회화 턴 흐름: 시도 기록(ai_calls) 쓰기가 실패해도 받은 응답 · 흘려 보낸 문장은 그대로이고 이름 · 코드만 든 기록 한 줄을 남긴다", async () => {
    const input = lowInput();
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
      const result = await streamTalkLesson(plan);
      if (!result.ok) throw new Error(`실패: ${result.reason}`);
      expect(result.value.tori_en).toBe("Nice! Good job.");
      expect(sentences).toEqual(["Nice!", "Good job."]);
      expect(logged).toEqual(["회화 시도 기록 실패(Error 23503)"]);
      // 아이 글 · 토리 글이 기록에 없다
      expect(logged.join(" ")).not.toContain("Nice");
      if (input.turn.child !== "")
        expect(logged.join(" ")).not.toContain(input.turn.child);
    } finally {
      log.mockRestore();
    }
  });
});

describe("회화 턴 흐름(DB 없는 몫): 실패 길(8절)", () => {
  it("회화 턴 흐름: 첫 문장 뒤 스트림이 끊기면 다시 부르지 않고 보낸 문장을 두고 그 턴이 닫힌다", async () => {
    const input = lowInput();
    const { fake, plan, rows, sentences } = harness(
      [
        {
          reply: stream(sampleBody(OK), {
            chunks: 20,
            cutAfterChars: FIRST_SENTENCE_CUT,
          }),
        },
      ],
      input,
    );
    const result = await streamTalkLesson(plan);
    expect(fake.requests).toHaveLength(1);
    expect(result).toMatchObject({
      ok: false,
      reason: "cut_after_first",
      sentSentences: ["Oh, soccer!"],
      cause: "connection",
    });
    expect(sentences).toEqual(["Oh, soccer!"]);
    expect(rows.map((r) => [r.status, r.errorCode])).toEqual([
      ["error", "connection"],
    ]);
  });

  it("회화 턴 흐름: 첫 문장 전 연결 오류는 같은 입력으로 한 번 다시 부르고 두 번째도 실패면 연결 실패다", async () => {
    const input = lowInput();
    const ok = harness(
      [once({ kind: "network-error" }), once(stream(sampleBody(OK)))],
      input,
    );
    const first = await streamTalkLesson(ok.plan);
    expect(first.ok).toBe(true);
    expect(ok.fake.requests).toHaveLength(2);
    expect(ok.fake.requests[0]?.bodyText).toBe(ok.fake.requests[1]?.bodyText);
    expect(ok.rows.map((r) => r.status)).toEqual(["error", "success"]);
    const bad = harness([{ reply: { kind: "network-error" } }], input);
    expect(await streamTalkLesson(bad.plan)).toEqual({
      ok: false,
      reason: "connection",
      refusals: 0,
    });
    expect(bad.fake.requests).toHaveLength(2);
  });

  it("회화 턴 흐름: 첫 text 가 타임아웃 안에 안 오면 끊고 한 번 다시 부른다", async () => {
    const input = lowInput();
    const { fake, plan, rows } = harness(
      [
        once(stream(sampleBody(OK), { firstDelayMs: 2000 })),
        once(stream(sampleBody(OK))),
      ],
      input,
    );
    const short = { ...plan.config, timeoutMs: 1100 };
    const result = await streamTalkLesson({ ...plan, config: short });
    expect(result.ok).toBe(true);
    expect(fake.requests).toHaveLength(2);
    expect(rows.map((r) => [r.status, r.errorCode])).toEqual([
      ["timeout", "timeout"],
      ["success", null],
    ]);
  });

  it("회화 턴 흐름: Haiku 5.5 첫 문장 전 거절이면 Sonnet 5.5 로 한 번 다시 부르고 그것도 거절이면 거절로 돌아온다", async () => {
    const input = lowInput();
    const refusal = refusalBody(HAIKU);
    const { fake, plan, rows } = harness([{ reply: stream(refusal) }], input, {
      config: haikuConfigOf(1),
      otherModelConfig: otherConfigOf(1),
    });
    const result = await streamTalkLesson(plan);
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
        once(stream(sampleBody(OK)), TALK_REFUSAL_RETRY.model),
      ],
      input,
      { config: haikuConfigOf(1), otherModelConfig: otherConfigOf(1) },
    );
    const answered = await streamTalkLesson(ok.plan);
    if (!answered.ok) throw new Error(`실패: ${answered.reason}`);
    expect(answered.retriedOtherModel).toBe(true);
  });

  it("회화 턴 흐름: 첫 문장 뒤 거절이면 Sonnet 재시도 없이 그 턴이 닫힌다", async () => {
    const input = lowInput();
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
    const result = await streamTalkLesson(plan);
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
    const input = lowInput();
    const body = {
      ...messageBody({
        model: "claude-sonnet-5-5",
        json: {},
        stopReason: "max_tokens",
      }),
      content: [
        {
          type: "text",
          text: '{"stuck":false,"tori_en":"Great! I like that. Tell me more about your',
          citations: null,
        },
      ],
    };
    const { fake, plan } = harness([{ reply: stream(body) }], input);
    const result = await streamTalkLesson(plan);
    // 'Great! I like that.' 가 먼저 흐르므로 첫 문장 뒤 끊김이다
    expect(fake.requests).toHaveLength(1);
    expect(result).toMatchObject({
      ok: false,
      reason: "cut_after_first",
      cause: "max_tokens",
    });
  });

  it("회화 턴 흐름: 스트림 도중 오류 이벤트(overloaded)가 첫 문장 전이면 다시 부르지 않고 서버 실패로 끝나며 행 하나를 남긴다", async () => {
    const input = lowInput();
    const { fake, plan, rows, sentences } = harness(
      [
        {
          reply: stream(sampleBody(OK), {
            chunks: 10,
            errorAfterChars: 14,
          }),
        },
      ],
      input,
    );
    const result = await streamTalkLesson(plan);
    expect(result).toEqual({ ok: false, reason: "server", refusals: 0 });
    expect(fake.requests).toHaveLength(1);
    expect(sentences).toEqual([]);
    expect(rows.map((r) => [r.status, r.errorCode])).toEqual([
      ["error", "server:529"],
    ]);
  });

  it("회화 턴 흐름: 스트림 도중 오류 이벤트가 첫 문장 뒤면 보낸 문장을 두고 그 턴을 닫는다", async () => {
    const input = lowInput();
    const { fake, plan, rows } = harness(
      [
        {
          reply: stream(sampleBody(OK), {
            chunks: 20,
            errorAfterChars: FIRST_SENTENCE_CUT,
            errorType: "api_error",
          }),
        },
      ],
      input,
    );
    const result = await streamTalkLesson(plan);
    expect(fake.requests).toHaveLength(1);
    expect(result).toMatchObject({
      ok: false,
      reason: "cut_after_first",
      sentSentences: ["Oh, soccer!"],
      cause: "server",
    });
    expect(rows.map((r) => [r.status, r.errorCode])).toEqual([
      ["error", "server:500"],
    ]);
  });

  it("회화 턴 흐름: 문장을 받는 쪽이 던지면 그 시도를 기록한 뒤 그 오류를 다시 던진다", async () => {
    const input = lowInput();
    const { plan, rows } = harness(
      [{ reply: stream(sampleBody(OK), { chunks: 10 }) }],
      input,
    );
    const gone = new Error("연결 닫힘");
    await expect(
      streamTalkLesson({
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
    const input = lowInput();
    const { plan, rows } = harness(
      [
        {
          reply: stream(sampleBody(OK), {
            chunks: 20,
            cutAfterChars: FIRST_SENTENCE_CUT,
          }),
        },
      ],
      input,
    );
    await streamTalkLesson(plan);
    expect(rows[0]?.inputTokens).toBeGreaterThan(0);
    expect(rows[0]?.costUsd).not.toBe("0.000000");
    // 그때까지 받은 message_start 의 모델(견본 응답 모델)
    expect(rows[0]?.answeredModel).toBe(sampleBody(OK).model);
  });

  it("가짜 SSE: message_start 는 요청 모델로 시작하고 fallback 블록에서 대체 모델로 바뀐다", () => {
    const steps = streamStepsOf({
      kind: "stream",
      body: sampleBody("talk_turn.v2-l3-fallback"),
    });
    const first = steps[0];
    if (first?.kind !== "data") throw new Error("첫 걸음이 이벤트가 아니다");
    const start = JSON.parse(first.text.split("data: ")[1] ?? "{}") as {
      message: { model: string };
    };
    expect(start.message.model).toBe("claude-sonnet-5-5");
  });
});

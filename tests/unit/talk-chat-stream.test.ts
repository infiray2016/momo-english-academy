// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 2 · 7 · 8-2 · 8-4 · 13 · 14, plan 묶음 S0)의 호출 셋과 그 저장 —
// DB 없이 볼 수 있는 몫: 흘려 받기(앞 칸 listen_sentence 를 끝까지 받은 뒤 6.4 → say 를 문장마다), 문장 문이 바꾼 문장의 짝과 대화 기록 글, 저장할
// 사용자 메시지, 같은 오류 셈의 표지와 평가 호출 제외, 힌트 호출의 묶음 · 기다림 · 다시 받기(가짜 저장), 평가 값의 저장 계산 · 다시 세기 · 비교.
// 실제 API · DB 를 부르지 않는다(가짜 Anthropic · 가짜 저장). 3단계 단원 1 의 값은 시드와 시험용 설정에서 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  TALK_CHAT_OUTPUT_FIELDS,
  TALK_CHAT_RECORD_TAG,
  type TalkChatInput,
  type TalkChatOutput,
  talkChatAssistantOf,
  talkChatTopicOf,
  talkChatTurnSpec,
} from "@/core/ai/calls/talk-chat";
import type { TalkChatEvalOutput } from "@/core/ai/calls/talk-chat-eval";
import type { TalkChatHintOutput } from "@/core/ai/calls/talk-chat-hint";
import { capabilitiesOf, requestConfigOf } from "@/core/ai/combo";
import { priceBookOf, priceRowsOfSeed } from "@/core/ai/cost";
import { createMasker } from "@/core/ai/mask";
import { buildAiRequest } from "@/core/ai/request";
import {
  chatAiQuestionOf,
  chatHintRecordOfRow,
} from "@/core/conversation/chat-hints";
import {
  type ChatJudgeContext,
  chatJudgeChangesOf,
  chatJudgesOf,
  readChatJudge,
} from "@/core/conversation/chat-judge";
import {
  type ChatReplyCheck,
  chatReplyOf,
  chatTeacherMoveOf,
} from "@/core/conversation/chat-reply";
import type { LessonHintSpec } from "@/core/conversation/hints";
import { readTalkMove, type TalkMove } from "@/core/conversation/move";
import type { LowLevelLineOptions } from "@/core/conversation/question-check";
import { createToriEnReader } from "@/core/conversation/stream";
import {
  ForbiddenFileSchema,
  MetaSentencesFileSchema,
} from "@/core/seed/schema/reference";
import { splitSentences } from "@/core/seed/text";
import { createAnthropicClient } from "@/server/ai/client";
import type { AiOutcome } from "@/server/ai/run";
import {
  purposeCountsTowardDown,
  SAME_ERROR_CODE_PATTERNS,
  sameErrorCount,
} from "@/server/ai/store";
import {
  CHAT_LISTEN_BLOCKED_GATE,
  chatListenCheckedOf,
  chatSayChangesOf,
  streamTalkChat,
  TALK_CHAT_READER_KEYS,
  type TalkAttemptRecord,
  type TalkChatStreamPlan,
  talkChatSentUserMessageOf,
} from "@/server/ai/talk";
import {
  CHAT_CLOSE_EVAL_CONCURRENCY,
  CHAT_COMPARE_ATTEMPT_KIND,
  chatCompareAttemptId,
  chatCompareMarkOf,
  chatCompareRowsOf,
  chatEachLimited,
  chatEvalEntriesOf,
  chatEvalFailureOf,
  chatEvalInputFor,
  chatEvalPendingOf,
  chatEvalStateOf,
  chatEvalWritesOf,
  chatJudgeRowsOf,
} from "@/server/conversation/chat-eval";
import {
  type ChatHintMark,
  type ChatHintStore,
  type ChatTurnRowLike,
  chatChildInputOf,
  chatDialogRowsOf,
  chatExplainAttemptId,
  chatHintAttemptId,
  chatHintInputOf,
  chatHintRun,
  chatSaidSayLostOf,
  chatSaidSayOf,
  chatSayFromRowOf,
} from "@/server/conversation/chat-hint";
import {
  createFakeAnthropic,
  type FakeRule,
} from "../fixtures/ai/fake-anthropic";
import {
  FIXTURE_EFFECTIVE_FROM,
  MODEL_PRICES_FIXTURE,
} from "../fixtures/ai/model-prices";
import {
  SAMPLE_CONTACT_PATTERNS,
  SAMPLE_NAMES,
} from "../fixtures/ai/sample-inputs";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const readJson = (path: string) =>
  JSON.parse(readFileSync(join(process.cwd(), path), "utf8"));
const FORBIDDEN = ForbiddenFileSchema.parse(
  readJson("seed/lists/forbidden.json"),
);
const META = MetaSentencesFileSchema.parse(
  readJson("seed/lists/meta-sentences.json"),
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
const SENTENCE_MAX = 7;

// ── 3단계 단원 1 · 미나(시드 값) ───────────────────────────────────

const UNIT = (
  readJson("seed/unit-specs.json").unitSpecs as {
    area: string;
    level: number;
    unit: number;
    words: string[];
  }[]
).find((u) => u.area === "talk" && u.level === 3 && u.unit === 1);
const MINA = (
  readJson("seed/teachers.json").teachers as {
    key: string;
    nameEn: string;
    chatPersonaEn?: string;
    chatFavoritesEn?: string;
  }[]
).find((t) => t.key === "mina");

function chatInput(heard = "I go to the beach."): TalkChatInput {
  const topic = talkChatTopicOf(3, 1);
  if (!UNIT || !MINA?.chatPersonaEn || !MINA.chatFavoritesEn || !topic)
    throw new Error("시드에 3단계 단원 1 · 미나 이야기 방식 재료가 없다");
  return {
    level: 3,
    unitWords: UNIT.words,
    teacher: {
      nameEn: MINA.nameEn,
      chatPersonaEn: MINA.chatPersonaEn,
      chatFavoritesEn: MINA.chatFavoritesEn,
    },
    topicEn: topic,
    history: [],
    message: { facts: [], input: { kind: "speech", heard } },
  };
}

const ANSWER: TalkChatOutput = {
  listen_sentence: "I go to the beach.",
  say: "Oh, the beach! I go to the beach too. Say it with me: I go to the beach. What do you do there?",
  say_ko: "오, 바다! 나도 바다에 가. 거기서 뭐 해?",
  wrap_up: false,
};

function bodyOf(answer: Record<string, unknown> | string) {
  return {
    id: "msg_handmade_talk_chat_01",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5-5",
    content: [
      {
        type: "text",
        text: typeof answer === "string" ? answer : JSON.stringify(answer),
        citations: null,
      },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 4200,
      output_tokens: 120,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      service_tier: "standard",
    },
  };
}

const stream = (
  answer: Record<string, unknown> | string,
  extra: Record<string, unknown> = {},
): FakeRule => ({
  reply: { kind: "stream", body: bodyOf(answer), chunks: 12, ...extra },
  times: 1,
});

function harness(rules: FakeRule[]) {
  const fake = createFakeAnthropic(rules);
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "test-key" },
    fetch: fake.fetch,
  });
  const input = chatInput();
  const config = requestConfigOf({
    purpose: talkChatTurnSpec.purpose,
    level: input.level,
    values,
    book: comboBook,
  });
  const rows: TalkAttemptRecord[] = [];
  const events: string[] = [];
  const startedAt = new Date();
  const plan: TalkChatStreamPlan = {
    spec: talkChatTurnSpec,
    input,
    rules: talkChatTurnSpec.rulesOf(values, input),
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
    sentenceMaxWords: SENTENCE_MAX,
    onListen: (listen) => events.push(`listen:${listen}`),
    onSentence: (s) => events.push(`s:${s}`),
    record: async (row) => {
      rows.push(row);
    },
  };
  return { plan, rows, events, fake };
}

const sentencesOf = (events: readonly string[]) =>
  events.filter((e) => e.startsWith("s:")).map((e) => e.slice(2));

// ── 읽개: 글 앞 칸 ────────────────────────────────────────────────

describe("AC-27b 흘려 받기의 읽개: 앞 칸 listen_sentence(글)", () => {
  it("AC-27b 이야기 방식 읽개의 칸 이름은 say 와 그 앞의 글 칸 listen_sentence 이고, 앞 칸을 다 읽은 뒤에만 흘린다", () => {
    expect(TALK_CHAT_OUTPUT_FIELDS.slice(0, 2)).toEqual([
      "listen_sentence",
      "say",
    ]);
    expect(TALK_CHAT_READER_KEYS).toEqual({
      sayKey: "say",
      heads: [{ key: "listen_sentence", kind: "string" }],
      requireHeads: true,
    });
  });

  it("AC-27b 글 앞 칸은 이스케이프(따옴표 · 역빗금 · \\u)를 풀어 끝까지 받고, 닫힌 뒤에 say 의 문장이 나온다", () => {
    const text =
      '{"listen_sentence":"I say \\"hi\\" \\u0026 bye.","say":"Hi! I say \\"hi\\" & bye. Your turn.","say_ko":"","wrap_up":false}';
    for (const size of [1, 3, 7, 1000]) {
      const reader = createToriEnReader(TALK_CHAT_READER_KEYS);
      const out: string[] = [];
      let listenSeenBeforeFirst: unknown = "not-yet";
      for (let i = 0; i < text.length; i += size) {
        const fresh = reader.push(text.slice(i, i + size));
        if (fresh.length > 0 && listenSeenBeforeFirst === "not-yet")
          listenSeenBeforeFirst = reader.head("listen_sentence");
        out.push(...fresh);
      }
      out.push(...reader.finish());
      expect(reader.failed()).toBe(false);
      expect(reader.head("listen_sentence")).toBe('I say "hi" & bye.');
      expect(listenSeenBeforeFirst).toBe('I say "hi" & bye.');
      expect(out).toEqual(["Hi!", 'I say "hi" & bye.', "Your turn."]);
    }
  });

  it("AC-27b say 가 앞 칸보다 먼저 오거나 앞 칸이 글이 아니면 흘리지 않는다(failed — 끝에서 한 번에 낸다)", () => {
    for (const text of [
      '{"say":"Hi. There.","listen_sentence":""}',
      '{"listen_sentence":3,"say":"Hi. There."}',
      '{"listen_sentence":"a \\q b","say":"Hi. There."}',
    ]) {
      const reader = createToriEnReader(TALK_CHAT_READER_KEYS);
      expect(reader.push(text)).toEqual([]);
      expect(reader.failed()).toBe(true);
    }
  });
});

// ── 흘려 받기(streamTalkChat) ──────────────────────────────────────

describe("AC-27b 이야기 방식 흘려 받기(DB 없음)", () => {
  it("AC-27b listen_sentence 뒤 say 첫 문장이 응답 끝 전에 나감", async () => {
    const text = JSON.stringify(ANSWER);
    const cutAt = text.indexOf("beach! ") + "beach! I".length;
    const { plan, rows, events } = harness([
      stream(ANSWER, { cutAfterChars: cutAt }),
    ]);
    const result = await streamTalkChat(plan);
    // 따라 할 문장(6.4 를 지남)을 먼저 알리고, 그 다음 say 첫 문장이 응답이 끊기기 전에 이미 나갔다
    expect(events).toEqual(["listen:I go to the beach.", "s:Oh, the beach!"]);
    expect(result).toMatchObject({
      ok: false,
      reason: "cut_after_first",
      sentSentences: ["Oh, the beach!"],
    });
    expect(rows).toHaveLength(1);
  });

  it("AC-27b 끝까지 받은 응답: 따라 할 문장 → say 의 문장이 차례로 나가고, 값은 나간 문장을 이은 say 다", async () => {
    const { plan, rows, events, fake } = harness([stream(ANSWER)]);
    const result = await streamTalkChat(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(events).toEqual([
      "listen:I go to the beach.",
      ...splitSentences(ANSWER.say).map((s) => `s:${s}`),
    ]);
    expect(result.streamed).toBe(true);
    expect(result.held).toBe(false);
    expect(result.value).toEqual(ANSWER);
    expect(result.answer).toEqual(ANSWER);
    expect(result.sayChanges).toEqual([]);
    expect(result.listenBlocked).toBe(false);
    expect(result.assistant).toBe(JSON.stringify(ANSWER));
    expect(result.firstSentenceMs).not.toBeNull();
    expect(rows.map((r) => r.status)).toEqual(["success"]);
    // AC-16(27p) 차례당 호출 수: 대화 호출 하나(힌트 · 평가는 이 길에서 부르지 않는다)
    expect(fake.requests).toHaveLength(1);
  });

  it("AC-27b 6.4 가 비운 따라 할 문장은 빈 글로 알린다(소리 줄로 빼지 않게 — 검토 rev-chat-p1 H2), say 는 그대로 흘린다", async () => {
    const value = {
      ...ANSWER,
      listen_sentence: "You are not stupid.",
      say: "You are not stupid. You are great!",
    };
    const { plan, events } = harness([stream(value)]);
    const result = await streamTalkChat(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(events[0]).toBe("listen:");
    expect(result.value.listen_sentence).toBe("");
    expect(result.answer.listen_sentence).toBe("You are not stupid.");
    // 켜기 전 관문이 셀 수 있게 6.4 가 비운 차례를 표지로 낸다(검토 rev-chat-p2 4절 — S1 이 move.chat.gate 에 CHAT_LISTEN_BLOCKED_GATE 로 적음)
    expect(result.listenBlocked).toBe(true);
    expect(CHAT_LISTEN_BLOCKED_GATE).toBe("listen_check");
    expect(chatListenCheckedOf("You are not stupid.", FORBIDDEN, 7)).toBe("");
    expect(chatListenCheckedOf("I like cats.", FORBIDDEN, 7)).toBe(
      "I like cats.",
    );
  });

  it("AC-27b 6.4 는 따라 할 문장의 꼴(온전한 문장인지)을 거르지 않는다: 조각도 그대로 지나고 비운 표지가 서지 않는다", async () => {
    // 6.4(checkOutputFields)는 금지어 · 연락처 패턴과 영어 길이만 보고, 따라 할 문장은 길이도 보지 않는다(talkChatCheckFields)
    expect(chatListenCheckedOf("the beach", FORBIDDEN, SENTENCE_MAX)).toBe(
      "the beach",
    );
    const value = {
      ...ANSWER,
      listen_sentence: "the beach",
      say: "Oh, the beach! I love it.",
    };
    const { plan, events } = harness([stream(value)]);
    const result = await streamTalkChat(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(events[0]).toBe("listen:the beach");
    expect(result.listenBlocked).toBe(false);
  });

  it("AC-27b 이름 자리({NAME})는 따라 할 문장과 say 에 같게 둔다: 둘 다 채우지 않은 글로 내보낸다(채우기는 부르는 쪽이 둘 모두에)", async () => {
    const value = {
      ...ANSWER,
      listen_sentence: "Hi, {NAME}.",
      say: "Hi, {NAME}. Nice to see you!",
    };
    const { plan, events } = harness([stream(value)]);
    const result = await streamTalkChat(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(events).toEqual([
      "listen:Hi, {NAME}.",
      "s:Hi, {NAME}.",
      "s:Nice to see you!",
    ]);
    expect(result.value.listen_sentence).toBe("Hi, {NAME}.");
    expect(result.listenBlocked).toBe(false);
  });

  it("AC-27b 빈 따라 할 문장도 첫 문장 앞에서 한 번 알린다", async () => {
    const value = { ...ANSWER, listen_sentence: "" };
    const { plan, events } = harness([stream(value)]);
    await streamTalkChat(plan);
    expect(events[0]).toBe("listen:");
    expect(events.filter((e) => e.startsWith("listen:"))).toHaveLength(1);
  });

  it("AC-27b 한 호출 안의 다시 시도: 따라 할 문장 알림은 시도마다 오고, 문장은 마지막 시도의 것만 나간다(검토 rev-chat-s0 M-4 (가))", async () => {
    const first: TalkChatOutput = {
      listen_sentence: "I like cats.",
      say: "Oh nice! I like cats. Do you?",
      say_ko: "",
      wrap_up: false,
    };
    const second: TalkChatOutput = {
      listen_sentence: "I go to the beach.",
      say: "Wow! I go to the beach. You?",
      say_ko: "",
      wrap_up: false,
    };
    const text = JSON.stringify(first);
    const cut = text.indexOf('"say":"') + '"say":"Oh ni'.length;
    const { plan, rows, events } = harness([
      stream(first, { cutAfterChars: cut, chunks: 40 }),
      stream(second),
    ]);
    const result = await streamTalkChat(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(events).toEqual([
      "listen:I like cats.",
      "listen:I go to the beach.",
      ...splitSentences(second.say).map((s) => `s:${s}`),
    ]);
    expect(rows).toHaveLength(2);
    expect(result.answer).toEqual(second);
  });

  it("AC-27c 6.4 가 비운 따라 할 문장은 기록 글에서도 빈 글이고, 다음 요청은 앞 요청의 글을 앞머리로 그대로 잇는다(검토 rev-chat-s0 M-3)", async () => {
    const value: TalkChatOutput = {
      listen_sentence: "You are not stupid.",
      say: "Hi! You are great!",
      say_ko: "안녕!",
      wrap_up: false,
    };
    const { plan } = harness([stream(value)]);
    const result = await streamTalkChat(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(result.listenBlocked).toBe(true);
    const assistant = JSON.parse(result.assistant) as Record<string, unknown>;
    expect(Object.keys(assistant)).toEqual([...TALK_CHAT_OUTPUT_FIELDS]);
    expect(assistant).toEqual({ ...value, listen_sentence: "" });
    // 다음 차례 요청: 대화 기록 = 보낸 사용자 메시지 + 이 기록 글. 앞 요청의 메시지 전부가 다음 요청의 앞머리다(캐시)
    const config = requestConfigOf({
      purpose: "talk_turn",
      level: 3,
      values,
      book: comboBook,
    });
    const first = chatInput();
    const rules = talkChatTurnSpec.rulesOf(values, first);
    const built1 = buildAiRequest(talkChatTurnSpec, first, {
      config,
      masker,
      rules,
    });
    const next: TalkChatInput = {
      ...chatInput("I like cats."),
      history: [
        {
          user: talkChatSentUserMessageOf(first, masker),
          assistant: result.assistant,
        },
      ],
    };
    const built2 = buildAiRequest(talkChatTurnSpec, next, {
      config,
      masker,
      rules,
    });
    expect(built2.body.system).toEqual(built1.body.system);
    expect(built2.body.messages.slice(0, built1.body.messages.length)).toEqual(
      built1.body.messages,
    );
    expect(built2.body.messages[1]?.content).toBe(result.assistant);
  });

  it("AC-27b 칸 차례를 어긴 응답은 흘리지 않고 응답 끝에서 따라 할 문장을 먼저 알린 뒤 문장을 낸다", async () => {
    const swapped = {
      say: ANSWER.say,
      listen_sentence: ANSWER.listen_sentence,
      say_ko: ANSWER.say_ko,
      wrap_up: false,
    };
    const { plan, events } = harness([stream(swapped)]);
    const result = await streamTalkChat(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(result.streamed).toBe(false);
    expect(events[0]).toBe("listen:I go to the beach.");
    expect(sentencesOf(events)).toEqual(splitSentences(ANSWER.say));
  });
});

// ── 문장 문이 바꾼 문장의 짝 · 대화 기록 글(H3) ───────────────────────────

describe("AC-27c 문장 문이 바꾼 문장은 원래 문장과 나간 글의 짝으로 남고 기록 글에서 그 문장만 바뀐다(검토 rev-chat-p1 H3)", () => {
  const gate = {
    forbidden: FORBIDDEN,
    metaPhrases: META,
    safeLine: SAFE_LINE,
    sentenceMaxWords: SENTENCE_MAX,
  };

  it("AC-27c 첫 걸림은 안전한 대사, 뒤 걸림은 지움(''), 걸리지 않은 문장은 짝에 없다", () => {
    const say =
      "Nice! What is your phone number? I like cats. Where do you live?";
    const { changes, sent } = chatSayChangesOf(say, gate);
    expect(changes).toEqual([
      { from: "What is your phone number?", to: SAFE_LINE },
      { from: "Where do you live?", to: "" },
    ]);
    expect(sent).toEqual(["Nice!", SAFE_LINE, "I like cats."]);
  });

  it("AC-27c 흘린 결과의 짝 · 기록 글: 기록 글은 응답 JSON 에서 그 문장만 나간 글로 바꾸고 다른 칸 · 칸 차례는 그대로다", async () => {
    const value: TalkChatOutput = {
      listen_sentence: "",
      say: "Nice! What is your phone number? I like cats. Where do you live?",
      say_ko: "좋아! 나는 고양이가 좋아.",
      wrap_up: false,
    };
    const { plan, events } = harness([stream(value)]);
    const result = await streamTalkChat(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(sentencesOf(events)).toEqual(["Nice!", SAFE_LINE, "I like cats."]);
    expect(result.sayChanges).toEqual([
      { from: "What is your phone number?", to: SAFE_LINE },
      { from: "Where do you live?", to: "" },
    ]);
    expect(result.assistant).toBe(
      talkChatAssistantOf(JSON.stringify(value), result.sayChanges),
    );
    const parsed = JSON.parse(result.assistant) as Record<string, unknown>;
    expect(Object.keys(parsed)).toEqual([...TALK_CHAT_OUTPUT_FIELDS]);
    expect(parsed.say).toBe(`Nice! ${SAFE_LINE} I like cats.`);
    expect(parsed.say_ko).toBe(value.say_ko);
    expect(result.answer).toEqual(value);
  });
});

describe("AC-27c 저장할 사용자 메시지는 요청 본문의 마지막 사용자 메시지와 같은 글(가린 뒤) — 검토 rev-chat-p1 H3", () => {
  it("AC-27c 이름이 든 들린 글: 저장 글 = buildAiRequest 의 마지막 메시지, 이름은 없다", () => {
    const name = SAMPLE_NAMES.englishName;
    const input = chatInput(`My name is ${name}. I go to the beach.`);
    const config = requestConfigOf({
      purpose: "talk_turn",
      level: 3,
      values,
      book: comboBook,
    });
    const built = buildAiRequest(talkChatTurnSpec, input, {
      config,
      masker,
      rules: talkChatTurnSpec.rulesOf(values, input),
    });
    const sent = talkChatSentUserMessageOf(input, masker);
    expect(sent).toBe(built.body.messages.at(-1)?.content);
    expect(sent).not.toContain(name);
    expect(sent).toContain("{NAME}");
  });
});

// ── 같은 오류 셈 · 평가 호출 제외(AC-8 · AC-27h) ──────────────────────────

describe("AC-27h 같은 오류 셈: 이야기 방식 표지를 세고 평가 호출은 셈 밖", () => {
  it("AC-27h 이야기 방식 대화 호출(표지 chat)의 같은 오류 행도 지금 엔진처럼 센다", () => {
    expect(TALK_CHAT_RECORD_TAG).toBe("chat");
    expect(SAME_ERROR_CODE_PATTERNS).toContain(
      `${TALK_CHAT_RECORD_TAG}:same\\_error:%`,
    );
    expect(SAME_ERROR_CODE_PATTERNS).toContain("lead:same\\_error:%");
  });

  it("AC-27h 평가 성공이 대화 호출의 이어진 실패 셈을 끊지 않음", async () => {
    // 평가 호출(talk_chat_eval)은 셈 밖이다: 실패를 넣지 않고(셈은 목적별 — 그 목적의 셈은 늘 0), 성공도 대화 호출(talk_turn)의 셈을 건드리지 않는다
    expect(purposeCountsTowardDown("talk_chat_eval")).toBe(false);
    expect(purposeCountsTowardDown("talk_turn")).toBe(true);
    expect(purposeCountsTowardDown("talk_chat_hint")).toBe(true);
    const untouched = new Proxy(
      {},
      {
        get() {
          throw new Error("평가 목적의 셈은 DB 를 읽지 않는다");
        },
      },
    );
    await expect(
      sameErrorCount(untouched as never, {
        purpose: "talk_chat_eval",
        learningDay: "2026-11-13",
      }),
    ).resolves.toBe(0);
  });
});

// ── 수업 행 읽기 ──────────────────────────────────────────────────

const HINT_SPEC: LessonHintSpec = {
  band: "1-3",
  hintTiers: ["ko", "frame", "sentence"],
  usablePhrases: 0,
};

let rowSeq = 0;
function teacher(
  turnNo: number,
  say: string,
  extra: Partial<ChatTurnRowLike> = {},
): ChatTurnRowLike {
  rowSeq += 1;
  return {
    id: `t${turnNo}-${rowSeq}`,
    turnNo,
    segment: "talk",
    speaker: "tori",
    text: say,
    inputMode: null,
    hintLevel: null,
    clientListen: null,
    sentUserMessage: null,
    toriRewrite: JSON.stringify({
      listen_sentence: "",
      say,
      say_ko: "",
      wrap_up: false,
    }),
    aiQuestion: null,
    move: null,
    chatJudge: null,
    ...extra,
  };
}
function child(
  turnNo: number,
  heard: string | null,
  extra: Partial<ChatTurnRowLike> = {},
): ChatTurnRowLike {
  rowSeq += 1;
  return {
    id: `c${turnNo}-${rowSeq}`,
    turnNo,
    segment: "talk",
    speaker: "child",
    text: heard,
    inputMode: "speech",
    hintLevel: 0,
    clientListen: null,
    sentUserMessage:
      heard === null ? null : `Child (speech-to-text): "${heard}"`,
    toriRewrite: null,
    aiQuestion: null,
    move: null,
    chatJudge: null,
    ...extra,
  };
}

describe("AC-27g 수업 행 읽기: 대화 토막 · 나간 say 전체 · 아이 입력 갈래", () => {
  it("AC-27g 나간 say 는 대화 기록 글의 say(소리 줄로 뺀 문장까지 든 선생님 말 전체), 없으면 행 글의 첫 줄", () => {
    const row = teacher(2, "Oh, nice!", {
      text: "Oh, nice!\nMm-hm.",
      toriRewrite: JSON.stringify({
        listen_sentence: "I go to the park.",
        say: "Oh, nice! Say it: I go to the park.",
        say_ko: "",
        wrap_up: false,
      }),
    });
    expect(chatSaidSayOf(row)).toBe("Oh, nice! Say it: I go to the park.");
    expect(chatSaidSayOf({ ...row, toriRewrite: null })).toBe("Oh, nice!");
    expect(chatSaidSayOf({ ...row, toriRewrite: "{broken" })).toBe("Oh, nice!");
  });

  it("AC-27g 아이 입력 갈래: 말 · 모름 단추 · 눌렀으나 듣지 못함(nospeech) · 조용함", () => {
    expect(chatChildInputOf(child(1, "I like cats."))).toEqual({
      kind: "speech",
      heard: "I like cats.",
    });
    expect(
      chatChildInputOf(child(1, null, { inputMode: "dont_know" })),
    ).toEqual({ kind: "dont_know" });
    expect(
      chatChildInputOf(
        child(1, null, {
          inputMode: "dont_know",
          clientListen: { src: "nospeech" },
        }),
      ),
    ).toEqual({ kind: "not_heard" });
    expect(chatChildInputOf(child(1, null, { inputMode: "quiet" }))).toEqual({
      kind: "quiet",
    });
  });

  it("AC-27g 대화 토막의 행만 대화 차례로(짧은 준비 · 정리 토막은 빠지고 같은 차례 번호면 선생님 행 먼저)", () => {
    const rows = [
      child(3, "Yes."),
      teacher(1, "Hi!", { segment: "greeting" }),
      teacher(3, "Practice!", { segment: "prep" }),
      teacher(4, "Bye!", { segment: "wrap_up" }),
      teacher(2, "How are you?"),
    ];
    expect(chatDialogRowsOf(rows).map((r) => r.text)).toEqual([
      "Hi!",
      "How are you?",
      "Yes.",
    ]);
  });

  it("AC-27g 힌트 호출 입력: 지금 말은 그 선생님 행의 나간 say 전체(소리 줄 문장 포함 — 결정 (나)), 앞 대화는 오래된 것부터", () => {
    const t1 = teacher(1, "Hi! Do you like cats?");
    const c2 = child(2, "Yes.");
    const t3 = teacher(3, "Me too!", {
      toriRewrite: JSON.stringify({
        listen_sentence: "I like cats.",
        say: "Me too! Say it: I like cats.",
        say_ko: "",
        wrap_up: false,
      }),
    });
    const input = chatHintInputOf({
      rows: [t3, c2, t1],
      teacherRowId: t3.id,
      level: 3,
      sentenceMaxWords: SENTENCE_MAX,
      hintTiers: HINT_SPEC.hintTiers,
      teacherNameEn: "Mina",
    });
    expect(input).toEqual({
      level: 3,
      sentenceMaxWords: SENTENCE_MAX,
      hintTiers: ["ko", "frame", "sentence"],
      teacherNameEn: "Mina",
      say: "Me too! Say it: I like cats.",
      context: [
        { speaker: "teacher", say: "Hi! Do you like cats?" },
        { speaker: "child", input: { kind: "speech", heard: "Yes." } },
      ],
    });
    expect(
      chatHintInputOf({
        rows: [t1],
        teacherRowId: "none",
        level: 3,
        sentenceMaxWords: SENTENCE_MAX,
        hintTiers: HINT_SPEC.hintTiers,
        teacherNameEn: "Mina",
      }),
    ).toBeNull();
  });
});

// ── 힌트 호출의 묶음 · 기다림 · 다시 받기(가짜 저장) ───────────────────────

type FakeMark = { mark: ChatHintMark; at: Date };
function fakeHintStore(initialAiQuestion: unknown = null) {
  let aiQuestion = initialAiQuestion;
  const marks = new Map<string, FakeMark>();
  const store: ChatHintStore = {
    async stored() {
      return chatHintRecordOfRow(aiQuestion, HINT_SPEC);
    },
    async claim(id, mark, at) {
      if (marks.has(id)) return false;
      marks.set(id, { mark, at });
      return true;
    },
    async mark(id) {
      return marks.get(id) ?? null;
    },
    async retake(id, prior, mark, at) {
      const now = marks.get(id);
      if (!now || now.at.getTime() !== prior.getTime()) return false;
      marks.set(id, { mark, at });
      return true;
    },
    async save(id, record, mark) {
      // DB 판과 같은 계약: 비었으면 쓰고, 이미 이야기 방식 값이 있으면 그대로 받음, 그 밖(다른 꼴의 값)은 저장 못 함 — 실패 표지
      if (aiQuestion === null) aiQuestion = chatAiQuestionOf(record);
      const prev = marks.get(id);
      const ok = chatHintRecordOfRow(aiQuestion, HINT_SPEC) !== null;
      marks.set(id, {
        mark: ok ? mark : { ...mark, state: "failed", reason: "not_saved" },
        at: prev?.at ?? new Date(0),
      });
      return ok;
    },
    async fail(id, mark) {
      const prev = marks.get(id);
      marks.set(id, { mark, at: prev?.at ?? new Date(0) });
    },
  };
  return { store, marks, aiQuestion: () => aiQuestion };
}

const HINT_OUT: TalkChatHintOutput = {
  hint_ko: "나는 바다에 가.",
  hint_en: "I go to the beach.",
  explain_ko: "선생님이 주말에 어디 가는지 물었어요.",
};
const okHint = (value = HINT_OUT): AiOutcome<TalkChatHintOutput> => ({
  ok: true,
  value,
  normalized: false,
  checked: false,
});

function hintIo(
  store: ChatHintStore,
  call: () => Promise<AiOutcome<TalkChatHintOutput>>,
  start = Date.parse("2026-11-13T10:00:00Z"),
) {
  let t = start;
  const calls = { n: 0 };
  return {
    io: {
      store,
      call: () => {
        calls.n += 1;
        return call();
      },
      clock: () => new Date(t),
      sleep: async (ms: number) => {
        t += ms;
        await new Promise((resolve) => setTimeout(resolve, 0));
      },
      pollMs: 100,
    },
    calls,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

const hintReq = (over: Partial<Parameters<typeof chatHintRun>[0]> = {}) => ({
  teacherRowId: "t-row-1",
  retry: 0,
  retryMax: 1,
  waitMs: 5000,
  aiResting: false,
  spec: HINT_SPEC,
  unitWords: UNIT?.words ?? [],
  lemmaOf: () => undefined,
  ...over,
});

describe("AC-27g 힌트 호출: 선생님 행당 하나로 묶고, 실패는 표지 행에 · 다시 받기는 번호 표지 행", () => {
  it("AC-27g 표지 행 id 는 talk-chat-hint:<선생님 행 id>, 다시 받기 n 은 :<n> 을 붙인다", () => {
    expect(chatHintAttemptId("abc", 0)).toBe("talk-chat-hint:abc");
    expect(chatHintAttemptId("abc", 2)).toBe("talk-chat-hint:abc:2");
    expect(() => chatHintAttemptId("abc", -1)).toThrow(RangeError);
  });

  it("AC-27g 첫 요청이 표지 행을 넣고 불러 저장한다: ai_question 은 이야기 방식 꼴, 표지 행은 받음", async () => {
    const fake = fakeHintStore();
    const { io, calls } = hintIo(fake.store, async () => okHint());
    const result = await chatHintRun(hintReq(), io);
    expect(result).toMatchObject({ ok: true, via: "called" });
    expect(calls.n).toBe(1);
    const saved = chatHintRecordOfRow(fake.aiQuestion(), HINT_SPEC);
    expect(saved?.tiers.map((t) => t.kind)).toEqual([
      "ko",
      "frame",
      "sentence",
    ]);
    expect(saved?.explainKo).toBe(HINT_OUT.explain_ko);
    expect(fake.marks.get("talk-chat-hint:t-row-1")?.mark.state).toBe("done");
  });

  it("AC-27g 저장된 단이 있으면 부르지 않고 낸다('AI 쉬는 중'이어도)", async () => {
    const first = fakeHintStore();
    await chatHintRun(hintReq(), hintIo(first.store, async () => okHint()).io);
    const fake = fakeHintStore(first.aiQuestion());
    const { io, calls } = hintIo(fake.store, async () => okHint());
    const result = await chatHintRun(hintReq({ aiResting: true }), io);
    expect(result).toMatchObject({ ok: true, via: "stored" });
    expect(calls.n).toBe(0);
    expect(fake.marks.size).toBe(0);
  });

  it("AC-27g 같은 선생님 행의 두 요청(힌트 단추 · 막힌 뒤 설명)이 겹치면 호출은 하나이고 뒤 요청은 기다려 같은 값을 낸다", async () => {
    const fake = fakeHintStore();
    let release: (v: AiOutcome<TalkChatHintOutput>) => void = () => {};
    const pending = new Promise<AiOutcome<TalkChatHintOutput>>((resolve) => {
      release = resolve;
    });
    const { io, calls } = hintIo(fake.store, () => pending);
    const a = chatHintRun(hintReq(), io);
    const b = chatHintRun(hintReq(), io);
    await new Promise((resolve) => setTimeout(resolve, 5));
    release(okHint());
    const [ra, rb] = await Promise.all([a, b]);
    expect(calls.n).toBe(1);
    expect(ra).toMatchObject({ ok: true, via: "called" });
    expect(rb).toMatchObject({ ok: true, via: "waited" });
    if (ra.ok && rb.ok) expect(rb.record).toEqual(ra.record);
  });

  it("AC-27g 호출이 실패하면 표지 행에 실패를 적고, 기다리던 요청도 실패를 낸다(다시 받기 수 0)", async () => {
    const fake = fakeHintStore();
    let release: (v: AiOutcome<TalkChatHintOutput>) => void = () => {};
    const pending = new Promise<AiOutcome<TalkChatHintOutput>>((resolve) => {
      release = resolve;
    });
    const { io } = hintIo(fake.store, () => pending);
    const a = chatHintRun(hintReq(), io);
    const b = chatHintRun(hintReq(), io);
    await new Promise((resolve) => setTimeout(resolve, 5));
    release({ ok: false, reason: "timeout", refusals: 0 });
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toEqual({ ok: false, reason: "timeout", retriesUsed: 0 });
    expect(rb).toEqual({ ok: false, reason: "timeout", retriesUsed: 0 });
    expect(fake.marks.get("talk-chat-hint:t-row-1")?.mark).toMatchObject({
      state: "failed",
      reason: "timeout",
    });
    expect(fake.aiQuestion()).toBeNull();
  });

  it("AC-27g 6.4 를 지난 칸이 없어 만든 단이 없으면 실패로 세고 다시 받기 길로(결정 (다))", async () => {
    const fake = fakeHintStore();
    const { io } = hintIo(fake.store, async () =>
      okHint({ hint_ko: "", hint_en: "", explain_ko: "설명만 있어요." }),
    );
    const result = await chatHintRun(hintReq(), io);
    expect(result).toEqual({ ok: false, reason: "no_tiers", retriesUsed: 0 });
    expect(fake.marks.get("talk-chat-hint:t-row-1")?.mark.state).toBe("failed");
    expect(fake.aiQuestion()).toBeNull();
  });

  it("AC-27g 다시 받기는 번호 표지 행(:1)으로 다시 부르고, 상한(talk.chat_hint_retry_max)을 넘으면 부르지 않는다", async () => {
    const fake = fakeHintStore();
    let n = 0;
    const { io, calls } = hintIo(fake.store, async () => {
      n += 1;
      return n === 1 ? { ok: false, reason: "server", refusals: 0 } : okHint();
    });
    expect(await chatHintRun(hintReq(), io)).toMatchObject({ ok: false });
    const again = await chatHintRun(hintReq({ retry: 1 }), io);
    expect(again).toMatchObject({ ok: true, via: "called" });
    expect([...fake.marks.keys()]).toEqual([
      "talk-chat-hint:t-row-1",
      "talk-chat-hint:t-row-1:1",
    ]);
    const over = fakeHintStore();
    const res = await chatHintRun(
      hintReq({ retry: 2 }),
      hintIo(over.store, async () => okHint()).io,
    );
    expect(res).toEqual({ ok: false, reason: "retry_max", retriesUsed: 1 });
    expect(over.marks.size).toBe(0);
    expect(calls.n).toBe(2);
  });

  it("AC-27g 'AI 쉬는 중'이고 저장된 단이 없으면 표지 행 없이 실패", async () => {
    const fake = fakeHintStore();
    const { io, calls } = hintIo(fake.store, async () => okHint());
    expect(await chatHintRun(hintReq({ aiResting: true }), io)).toEqual({
      ok: false,
      reason: "resting",
      retriesUsed: 0,
    });
    expect(calls.n).toBe(0);
    expect(fake.marks.size).toBe(0);
  });

  it("AC-27g 앞 요청이 남긴 부르는 중 표지가 기다림 상한(시간 상한의 두 배)을 넘었으면 끊긴 표지로 보고 고쳐 잡아 부른다", async () => {
    const fake = fakeHintStore();
    const t0 = Date.parse("2026-11-13T10:00:00Z");
    await fake.store.claim(
      "talk-chat-hint:t-row-1",
      { v: 1, kind: "talk-chat-hint", retry: 0, state: "calling" },
      new Date(t0 - 10_001),
    );
    const { io, calls } = hintIo(fake.store, async () => okHint(), t0);
    const result = await chatHintRun(hintReq({ waitMs: 5000 }), io);
    expect(result).toMatchObject({ ok: true, via: "called" });
    expect(calls.n).toBe(1);
  });

  it("AC-27g 앞 요청이 아직 부르는 중이면 기다리고, 상한(waitMs) 안에 차지 않으면 실패(wait_timeout)", async () => {
    const fake = fakeHintStore();
    const t0 = Date.parse("2026-11-13T10:00:00Z");
    await fake.store.claim(
      "talk-chat-hint:t-row-1",
      { v: 1, kind: "talk-chat-hint", retry: 0, state: "calling" },
      new Date(t0 - 1000),
    );
    const { io, calls } = hintIo(fake.store, async () => okHint(), t0);
    const result = await chatHintRun(hintReq({ waitMs: 1000 }), io);
    expect(result).toEqual({
      ok: false,
      reason: "wait_timeout",
      retriesUsed: 0,
    });
    expect(calls.n).toBe(0);
  });
});

describe("AC-27g 막힌 뒤 설명은 힌트와 다른 표지 행 — 설명의 실패가 힌트의 첫 누름 · 다시 받기 수에 닿지 않음(검토 rev-chat-s0 I-2, 컨트롤러 결정 (가))", () => {
  const explainReq = () => hintReq({ kind: "explain" as const });

  it("AC-27g 설명 표지 행 id 는 talk-chat-hint:<선생님 행 id>:explain 이다", () => {
    expect(chatExplainAttemptId("abc")).toBe("talk-chat-hint:abc:explain");
  });

  it("AC-27g 설명이 성공해 저장됐으면 힌트 누름은 호출 없이 저장된 값을 쓴다", async () => {
    const fake = fakeHintStore();
    const { io, calls } = hintIo(fake.store, async () => okHint());
    expect(await chatHintRun(explainReq(), io)).toMatchObject({
      ok: true,
      via: "called",
    });
    expect(await chatHintRun(hintReq(), io)).toMatchObject({
      ok: true,
      via: "stored",
    });
    expect(calls.n).toBe(1);
  });

  it("AC-27g 설명 실패 → 힌트 첫 누름이 제 표지 행으로 호출을 한 번 하고 단을 낸다", async () => {
    const fake = fakeHintStore();
    let n = 0;
    const { io, calls } = hintIo(fake.store, async () => {
      n += 1;
      return n === 1 ? { ok: false, reason: "timeout", refusals: 0 } : okHint();
    });
    expect(await chatHintRun(explainReq(), io)).toMatchObject({ ok: false });
    const hint = await chatHintRun(hintReq(), io);
    expect(hint).toMatchObject({ ok: true, via: "called" });
    expect(calls.n).toBe(2);
    expect(fake.marks.get("talk-chat-hint:t-row-1:explain")?.mark.state).toBe(
      "failed",
    );
    expect(fake.marks.get("talk-chat-hint:t-row-1")?.mark.state).toBe("done");
  });

  it("AC-27g 설명이 부르는 중 → 힌트 누름은 기다렸다가 저장된 값을 쓴다(호출 수 1)", async () => {
    const fake = fakeHintStore();
    let release: (v: AiOutcome<TalkChatHintOutput>) => void = () => {};
    const pending = new Promise<AiOutcome<TalkChatHintOutput>>((resolve) => {
      release = resolve;
    });
    const { io, calls } = hintIo(fake.store, () => pending);
    const explain = chatHintRun(explainReq(), io);
    await new Promise((resolve) => setTimeout(resolve, 1));
    const hint = chatHintRun(hintReq(), io);
    await new Promise((resolve) => setTimeout(resolve, 5));
    release(okHint());
    const [e, h] = await Promise.all([explain, hint]);
    expect(e).toMatchObject({ ok: true, via: "called" });
    expect(h).toMatchObject({ ok: true, via: "waited" });
    expect(calls.n).toBe(1);
    expect(fake.marks.has("talk-chat-hint:t-row-1")).toBe(false);
  });

  it("AC-27g 설명이 부르는 중에 실패로 끝나면 기다리던 힌트 누름이 제 표지 행으로 한 번 부른다(호출이 겹치지 않음)", async () => {
    const fake = fakeHintStore();
    let release: (v: AiOutcome<TalkChatHintOutput>) => void = () => {};
    const pending = new Promise<AiOutcome<TalkChatHintOutput>>((resolve) => {
      release = resolve;
    });
    let n = 0;
    let inFlight = 0;
    let maxInFlight = 0;
    const { io, calls } = hintIo(fake.store, async () => {
      n += 1;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      const out = n === 1 ? await pending : okHint();
      inFlight -= 1;
      return out;
    });
    const explain = chatHintRun(explainReq(), io);
    await new Promise((resolve) => setTimeout(resolve, 1));
    const hint = chatHintRun(hintReq(), io);
    await new Promise((resolve) => setTimeout(resolve, 5));
    release({ ok: false, reason: "server", refusals: 0 });
    const [e, h] = await Promise.all([explain, hint]);
    expect(e).toMatchObject({ ok: false, reason: "server" });
    expect(h).toMatchObject({ ok: true, via: "called" });
    expect(calls.n).toBe(2);
    expect(maxInFlight).toBe(1);
  });

  it("AC-27g 설명 실패 뒤 힌트의 다시 받기 상한은 그대로 남아 있다(번호 0 실패 뒤 번호 1 이 부름)", async () => {
    const fake = fakeHintStore();
    let n = 0;
    const { io, calls } = hintIo(fake.store, async () => {
      n += 1;
      return n <= 2 ? { ok: false, reason: "server", refusals: 0 } : okHint();
    });
    await chatHintRun(explainReq(), io);
    expect(await chatHintRun(hintReq(), io)).toEqual({
      ok: false,
      reason: "server",
      retriesUsed: 0,
    });
    expect(await chatHintRun(hintReq({ retry: 1 }), io)).toMatchObject({
      ok: true,
      via: "called",
    });
    expect(calls.n).toBe(3);
  });
});

describe("AC-27g 힌트 저장이 빠지는 길 · 같은 번호의 거듭 요청(검토 rev-chat-s0 M-1 · M-4 (라))", () => {
  it("AC-27g 선생님 행에 다른 꼴의 값이 있어 저장하지 못하면 실패(not_saved)로 적고, 기다리던 요청은 상한까지 기다리지 않고 바로 실패를 낸다", async () => {
    const fake = fakeHintStore({
      en: "What do you like?",
      ko: "",
      answerExample: "",
    });
    const { io } = hintIo(fake.store, async () => okHint());
    expect(await chatHintRun(hintReq(), io)).toEqual({
      ok: false,
      reason: "not_saved",
      retriesUsed: 0,
    });
    expect(fake.marks.get("talk-chat-hint:t-row-1")?.mark).toMatchObject({
      state: "failed",
      reason: "not_saved",
    });
    // 표지 행이 받음(done)인데 단이 없는 꼴: 기다리던 요청은 곧바로 실패
    const odd = fakeHintStore({
      en: "What do you like?",
      ko: "",
      answerExample: "",
    });
    await odd.store.claim(
      "talk-chat-hint:t-row-1",
      { v: 1, kind: "talk-chat-hint", retry: 0, state: "done" },
      new Date(Date.parse("2026-11-13T10:00:00Z")),
    );
    const waiting = hintIo(odd.store, async () => okHint());
    const started = waiting.io.clock().getTime();
    expect(await chatHintRun(hintReq({ waitMs: 5000 }), waiting.io)).toEqual({
      ok: false,
      reason: "not_saved",
      retriesUsed: 0,
    });
    expect(waiting.io.clock().getTime() - started).toBeLessThan(5000);
    expect(waiting.calls.n).toBe(0);
  });

  it("AC-27g 번호 0 이 실패한 뒤 같은 번호의 요청은 호출 없이 그 실패를 낸다", async () => {
    const fake = fakeHintStore();
    const { io, calls } = hintIo(fake.store, async () => ({
      ok: false,
      reason: "timeout",
      refusals: 0,
    }));
    await chatHintRun(hintReq(), io);
    expect(await chatHintRun(hintReq(), io)).toEqual({
      ok: false,
      reason: "timeout",
      retriesUsed: 0,
    });
    expect(calls.n).toBe(1);
  });
});

// ── 평가 호출: 입력 · 상태 · 저장 계산 · 다시 세기 · 비교 ───────────────────

const CTX: ChatJudgeContext = {
  unitWords: UNIT?.words ?? [],
  lemmaOf: () => undefined,
  homophones: [],
  sceneWords: new Set(),
  spec: { band: "1-3" },
  teacherName: "Mina",
};
const EVAL_OUT: TalkChatEvalOutput = {
  reading: "clear_answer",
  teacher_move: "react_and_follow_up",
  model_sentence: "",
  child_used_on_own: ["beach"],
};

/** 쓰기를 행에 반영한다(DB 의 고쳐 쓰기와 같은 일). */
function applied(
  rows: readonly ChatTurnRowLike[],
  writes: readonly { id: string; judge: unknown }[] | null,
): ChatTurnRowLike[] {
  const byId = new Map((writes ?? []).map((w) => [w.id, w.judge]));
  return rows.map((row) =>
    byId.has(row.id) ? { ...row, chatJudge: byId.get(row.id) } : row,
  );
}

/** 행을 저장할 때의 첫 chat_judge(묶음 S1 이 쓰는 꼴): 말 입력 차례는 기다림, 그 밖은 부르지 않음. */
function withInitialJudges(
  rows: readonly ChatTurnRowLike[],
): ChatTurnRowLike[] {
  const judge = chatJudgeRowsOf(rows, CTX.spec);
  const out = chatJudgesOf(judge.rows, CTX);
  return applied(
    rows,
    out.map(({ row, judge: j }) => ({ id: judge.ids[row] ?? "", judge: j })),
  );
}

describe("AC-27h 평가 호출: 입력 · 상태", () => {
  it("AC-27h 평가 입력의 차례: 입구 차례의 사용자 메시지 · 아이 행의 보낸 사용자 메시지 · 선생님의 나간 say 전체", () => {
    const t1 = teacher(1, "Hi! What did you do?", {
      segment: "greeting",
      sentUserMessage: "(The chat starts now. It is Friday evening.)",
    });
    const c2 = child(2, "I go to the beach.");
    const t3 = teacher(3, "Nice!");
    const { entries, childAt } = chatEvalEntriesOf(
      chatDialogRowsOf([t3, c2, t1]),
    );
    expect(entries).toEqual([
      {
        speaker: "child",
        message: "(The chat starts now. It is Friday evening.)",
      },
      { speaker: "teacher", say: "Hi! What did you do?" },
      {
        speaker: "child",
        message: 'Child (speech-to-text): "I go to the beach."',
      },
      { speaker: "teacher", say: "Nice!" },
    ]);
    expect(childAt.get(c2.id)).toBe(2);
    const input = chatEvalInputFor({
      rows: [t1, c2, t3],
      childRowId: c2.id,
      contextTurns: 6,
      unitWords: ["beach"],
    });
    expect(input).toEqual({
      unitWords: ["beach"],
      before: entries.slice(0, 2),
      target: 'Child (speech-to-text): "I go to the beach."',
      after: "Nice!",
    });
  });

  it("AC-27h 평가 상태: 저장된 chat_judge 의 기존 꼴 상태 · 출력, 없으면 말 입력이면 기다림 · 아니면 부르지 않음", () => {
    expect(chatEvalStateOf(child(2, "Hi."))).toEqual({ status: "waiting" });
    expect(chatEvalStateOf(child(2, null, { inputMode: "dont_know" }))).toEqual(
      { status: "not_called" },
    );
    expect(chatEvalPendingOf(child(2, "Hi."))).toBe(true);
    expect(chatEvalPendingOf(child(2, null, { inputMode: "quiet" }))).toBe(
      false,
    );
  });

  it("AC-27h 판정 없음의 까닭: 시간 넘음 · 검증 실패 · 그 밖", () => {
    expect(chatEvalFailureOf("timeout")).toBe("timeout");
    expect(chatEvalFailureOf("invalid")).toBe("invalid");
    expect(chatEvalFailureOf("output_blocked")).toBe("invalid");
    expect(chatEvalFailureOf("server")).toBe("other");
    expect(chatEvalFailureOf("safety_cap")).toBe("other");
  });
});

describe("AC-27i 늦게 온 평가 값의 저장 계산과 다시 세기(검토 rev-chat-p4 I-3 · rev-chat-p4-2)", () => {
  const base = () => {
    const rows = [
      teacher(1, "Hi! Where do you go on weekends?"),
      child(2, "I go to the beach."),
      teacher(3, "The beach! What do you see there?"),
      child(4, "I see the sea."),
      teacher(5, "Wow!"),
    ];
    return withInitialJudges(rows);
  };

  it("AC-27i 기다림인 아이 행에 값이 오면 그 행을 있음으로 쓴다(기존 꼴 said · 출력)", () => {
    const rows = base();
    const target = rows[1] as ChatTurnRowLike;
    expect(readChatJudge(target.chatJudge)?.legacy.status).toBe("waiting");
    const writes = chatEvalWritesOf({
      rows,
      childRowId: target.id,
      state: { status: "done", output: EVAL_OUT },
      ctx: CTX,
    });
    const after = applied(rows, writes);
    const judge = readChatJudge(
      after.find((r) => r.id === target.id)?.chatJudge,
    );
    expect(judge?.legacy.status).toBe("done");
    expect(judge?.legacy.output).toEqual(EVAL_OUT);
    expect(judge?.legacy.said).toEqual(["beach"]);
  });

  it("AC-27i 이미 있음 · 판정 없음인 행은 다시 쓰지 않는다(두 번 쓰지 않음)", () => {
    const rows = base();
    const target = rows[1] as ChatTurnRowLike;
    const once = applied(
      rows,
      chatEvalWritesOf({
        rows,
        childRowId: target.id,
        state: { status: "failed" },
        ctx: CTX,
      }),
    );
    expect(
      chatEvalWritesOf({
        rows: once,
        childRowId: target.id,
        state: { status: "done", output: EVAL_OUT },
        ctx: CTX,
      }),
    ).toBeNull();
  });

  it("AC-27i 판정 없음은 그 까닭을 아이 행 기록에 남기고, 다시 셀 때도 까닭이 그대로다(결정 (A))", () => {
    const rows = base();
    const target = rows[1] as ChatTurnRowLike;
    const after = applied(
      rows,
      chatEvalWritesOf({
        rows,
        childRowId: target.id,
        state: { status: "failed", failure: "timeout" },
        ctx: CTX,
      }),
    );
    const stored = after.find((r) => r.id === target.id) as ChatTurnRowLike;
    expect(readChatJudge(stored.chatJudge)?.legacy).toMatchObject({
      status: "failed",
      failure: "timeout",
    });
    expect(chatEvalStateOf(stored)).toEqual({
      status: "failed",
      failure: "timeout",
    });
    // 뒤 행의 늦은 값으로 수업을 다시 세어도 앞 행의 까닭은 바뀌지 않는다(그 행은 바뀐 행으로 나오지 않음)
    const later = chatEvalWritesOf({
      rows: after,
      childRowId: after[3]?.id ?? "",
      state: { status: "done", output: EVAL_OUT },
      ctx: CTX,
    });
    expect(later?.map((w) => w.id)).not.toContain(target.id);
  });

  it("AC-27i 두 평가 값이 차례로 쓰이면(수업 단위로 줄 세움) 두 값이 모두 남는다", () => {
    const rows = base();
    const [c2, c4] = [rows[1], rows[3]] as ChatTurnRowLike[];
    const afterA = applied(
      rows,
      chatEvalWritesOf({
        rows,
        childRowId: c4.id,
        state: {
          status: "done",
          output: { ...EVAL_OUT, child_used_on_own: ["sea"] },
        },
        ctx: CTX,
      }),
    );
    const afterB = applied(
      afterA,
      chatEvalWritesOf({
        rows: afterA,
        childRowId: c2.id,
        state: { status: "done", output: EVAL_OUT },
        ctx: CTX,
      }),
    );
    const j2 = readChatJudge(afterB.find((r) => r.id === c2.id)?.chatJudge);
    const j4 = readChatJudge(afterB.find((r) => r.id === c4.id)?.chatJudge);
    expect(j2?.legacy.status).toBe("done");
    expect(j4?.legacy.status).toBe("done");
    expect(j4?.legacy.output?.child_used_on_own).toEqual(["sea"]);
  });

  it("AC-27i 늦게 온 값은 그 값에 기대는 뒤 행도 고친다(앞 차례 되묻기 → 되물은 뒤의 답)", () => {
    const rows = base();
    const [c2, c4] = [rows[1], rows[3]] as ChatTurnRowLike[];
    const afterLater = applied(
      rows,
      chatEvalWritesOf({
        rows,
        childRowId: c4.id,
        state: { status: "done", output: EVAL_OUT },
        ctx: CTX,
      }),
    );
    expect(
      readChatJudge(afterLater.find((r) => r.id === c4.id)?.chatJudge)?.legacy
        .afterAskAgain,
    ).toBe(false);
    const writes = chatEvalWritesOf({
      rows: afterLater,
      childRowId: c2.id,
      state: {
        status: "done",
        output: { ...EVAL_OUT, teacher_move: "ask_again" },
      },
      ctx: CTX,
    });
    expect(writes?.map((w) => w.id).sort()).toEqual([c2.id, c4.id].sort());
    const final = applied(afterLater, writes);
    expect(
      readChatJudge(final.find((r) => r.id === c4.id)?.chatJudge)?.legacy
        .afterAskAgain,
    ).toBe(true);
  });

  it("AC-27i 판정에 넘기는 행은 대화 토막의 행뿐(정리 토막 행은 섞지 않는다)", () => {
    const rows = [
      ...base(),
      teacher(6, "Let's review.", { segment: "wrap_up" }),
    ];
    const judge = chatJudgeRowsOf(rows, CTX.spec);
    expect(judge.rows).toHaveLength(5);
    expect(judge.ids).not.toContain(rows[5]?.id);
  });
});

describe("AC-27i 수업별 비교 표지 행(talk-chat-compare:<세션 id>)", () => {
  it("AC-27i 비교 표지 행: id · 실제 수업 'real' · 아이 행 차례 번호와 저장된 판정으로 센다", () => {
    expect(chatCompareAttemptId("s-1")).toBe("talk-chat-compare:s-1");
    expect(CHAT_COMPARE_ATTEMPT_KIND).toBe("talk-chat-compare");
    const rows = withInitialJudges([
      teacher(1, "Hi! Where do you go?"),
      child(2, "I go to the beach."),
      teacher(3, "Nice!"),
      child(4, null, { inputMode: "dont_know" }),
      teacher(5, "That's okay."),
    ]);
    const done = applied(
      rows,
      chatEvalWritesOf({
        rows,
        childRowId: rows[1]?.id ?? "",
        state: { status: "done", output: EVAL_OUT },
        ctx: CTX,
      }),
    );
    expect(chatCompareRowsOf(done).map((r) => r.row)).toEqual([2, 4]);
    const mark = chatCompareMarkOf({
      rows: done,
      met: ["beach"],
      homophones: [],
    });
    expect(mark).toMatchObject({
      v: 1,
      kind: "talk-chat-compare",
      summary: {
        source: "real",
        counts: { childTurns: 2, done: 1, notCalled: 1, waiting: 0, failed: 0 },
        met: ["beach"],
      },
    });
    // 아이 말 글은 표지 행에 없다
    expect(JSON.stringify(mark)).not.toContain("I go to the beach");
  });
});

describe("AC-27i 수업 단위 줄 세우기가 막는 것(검토 rev-chat-s0 I-1 — 잠금 없는 읽기를 흉내 낸 순수 재현)", () => {
  const rowsOf = () =>
    withInitialJudges([
      teacher(1, "Where do you go?"),
      child(2, "I go to the beach."),
      teacher(3, "Nice! What do you see?"),
      child(4, "I see the sea."),
      teacher(5, "Wow!"),
    ]);
  const staleOf = (rows: ChatTurnRowLike[]) => {
    const judged = chatJudgeRowsOf(rows, CTX.spec);
    return chatJudgeChangesOf({
      rows: judged.rows,
      stored: judged.stored,
      ctx: CTX,
    }).map(({ row }) => judged.ids[row]);
  };

  it("AC-27i 두 평가가 같은 행을 읽고(잠금 없음) 쓰면 뒤 행이 앞 행의 옛 상태로 센 값으로 남아, 다시 세면 바뀐 행이 나온다", () => {
    const rows = rowsOf();
    const [c2, c4] = [rows[1], rows[3]] as ChatTurnRowLike[];
    const a = chatEvalWritesOf({
      rows,
      childRowId: c2.id,
      state: { status: "done", output: EVAL_OUT },
      ctx: CTX,
    });
    const b = chatEvalWritesOf({
      rows,
      childRowId: c4.id,
      state: { status: "done", output: EVAL_OUT },
      ctx: CTX,
    });
    for (const final of [
      applied(applied(rows, b), a),
      applied(applied(rows, a), b),
    ])
      expect(staleOf(final)).toEqual([c4.id]);
  });

  it("AC-27i 줄 세워(앞 쓰기 뒤의 행을 읽고) 쓰면 다시 세어도 바뀐 행이 0 이다", () => {
    const rows = rowsOf();
    const [c2, c4] = [rows[1], rows[3]] as ChatTurnRowLike[];
    for (const [first, second] of [
      [c4, c2],
      [c2, c4],
    ] as const) {
      const afterFirst = applied(
        rows,
        chatEvalWritesOf({
          rows,
          childRowId: first.id,
          state: { status: "done", output: EVAL_OUT },
          ctx: CTX,
        }),
      );
      const final = applied(
        afterFirst,
        chatEvalWritesOf({
          rows: afterFirst,
          childRowId: second.id,
          state: { status: "done", output: EVAL_OUT },
          ctx: CTX,
        }),
      );
      expect(staleOf(final)).toEqual([]);
    }
  });
});

describe("AC-27i 닫을 때의 평가는 동시에 둘까지만(검토 rev-chat-s0 M-7)", () => {
  it("AC-27i 남은 일을 동시에 CHAT_CLOSE_EVAL_CONCURRENCY(2) 개까지만 돌리고, 결과는 넣은 차례로 낸다", async () => {
    expect(CHAT_CLOSE_EVAL_CONCURRENCY).toBe(2);
    let running = 0;
    let most = 0;
    const out = await chatEachLimited(
      [5, 1, 3, 2, 4],
      CHAT_CLOSE_EVAL_CONCURRENCY,
      async (n) => {
        running += 1;
        most = Math.max(most, running);
        await new Promise((resolve) => setTimeout(resolve, n));
        running -= 1;
        return n * 10;
      },
    );
    expect(most).toBe(2);
    expect(out).toEqual([50, 10, 30, 20, 40]);
    expect(await chatEachLimited([], 2, async () => 1)).toEqual([]);
  });
});

// ── fix 3: 닫힌 뒤에도 같은 판정(검토 rev-chat-t3 I-1 · 5절) · 다시 받기는 기다리지 않음(rev-chat-s0-2 N-2) ──

const REPLY_RANGE: LowLevelLineOptions = {
  sentenceMaxWords: 8,
  allowedWords: new Set(
    "i you we it a the like do what is are and or say with me that okay good too sea mountain great see fish".split(
      " ",
    ),
  ),
  unitWords: ["sea", "mountain"],
  childWords: [],
  teacherName: "Mina",
  lemmaOf: (w) => w.toLowerCase(),
  forms: [],
  allowedForms: new Set(),
};
const REPLY_CHECK: ChatReplyCheck = {
  range: REPLY_RANGE,
  sentenceMax: 2,
  questionMax: 1,
  madeUpPhrases: [],
};

/** 응답 처리(P2)를 지난 선생님 행(열린 꼴): 행 글 = 말풍선 글, 대화 기록 글 = 나간 say 전체, move.chat.removed = 소리 줄로 뺀 문장. */
function chatTeacher(
  turnNo: number,
  say: string,
  {
    listen = "",
    appStuck = false,
  }: { listen?: string; appStuck?: boolean } = {},
): ChatTurnRowLike {
  const output: TalkChatOutput = {
    listen_sentence: listen,
    say,
    say_ko: "",
    wrap_up: false,
  };
  const reply = chatReplyOf({
    level: 3,
    output,
    appStuck,
    closingSlot: false,
    wrapUpHeldAt: null,
    check: REPLY_CHECK,
  });
  const move = chatTeacherMoveOf({
    reply,
    closingSlot: false,
    firstQuestion: false,
    stage: 0,
    extra: { facts: [], run: 0 },
  });
  return teacher(turnNo, reply.text, {
    text: `${reply.text}\nMm-hm.`,
    toriRewrite: JSON.stringify(output),
    move,
  });
}

/** 닫는 거래 뒤의 꼴(closing.ts clearSentMessages): 대화 기록 글 · 보낸 사용자 메시지가 지워진 행. */
const closedOf = (rows: readonly ChatTurnRowLike[]): ChatTurnRowLike[] =>
  rows.map((row) => ({ ...row, toriRewrite: null, sentUserMessage: null }));

describe("AC-27i 닫힌 뒤에도 같은 판정(검토 rev-chat-t3 I-1 · 5절)", () => {
  const lesson = () => {
    const rows = [
      chatTeacher(1, "What do you like?"),
      child(2, null, { inputMode: "dont_know" }),
      chatTeacher(3, "That's okay. Do you like the sea or the mountain?", {
        appStuck: true,
      }),
      child(4, "Sea."),
      chatTeacher(5, "Me too! Say it with me. I like the sea.", {
        listen: "I like the sea.",
      }),
      child(6, "I like the sea."),
      chatTeacher(7, "Great!"),
      child(8, "I see fish."),
    ];
    // 앞 차례의 평가는 이미 왔고(있음), 마지막 차례는 닫을 때 평가된다(기다림)
    const opened = withInitialJudges(rows);
    const done = (rowsNow: ChatTurnRowLike[], at: number) =>
      applied(
        rowsNow,
        chatEvalWritesOf({
          rows: rowsNow,
          childRowId: rowsNow[at]?.id ?? "",
          state: {
            status: "done",
            output: { ...EVAL_OUT, child_used_on_own: ["sea"] },
          },
          ctx: CTX,
        }),
      );
    return done(done(opened, 3), 5);
  };

  it("AC-27i 소리 줄로 뺀 문장은 move.chat.removed 에 있다(재료 확인)", () => {
    const rows = lesson();
    expect(readTalkMove(rows[2]?.move)?.chat?.removed).toEqual([
      "Do you like the sea or the mountain?",
    ]);
    expect(readTalkMove(rows[4]?.move)?.chat?.removed).toEqual([
      "I like the sea.",
    ]);
  });

  it("AC-27i (가) 같은 수업의 열린 꼴과 닫힌 꼴에서 판정 행과 다시 센 판정이 같다(막힌 뒤 고르기 물음 뒤의 'Sea.' · 따라 할 문장 뒤의 따라 말하기)", () => {
    const opened = lesson();
    const closed = closedOf(opened);
    const a = chatJudgeRowsOf(opened, CTX.spec);
    const b = chatJudgeRowsOf(closed, CTX.spec);
    expect(b.rows).toEqual(a.rows);
    expect(chatJudgesOf(b.rows, CTX)).toEqual(chatJudgesOf(a.rows, CTX));
    // 고르기 답 표지와 따라 말하기 갈래가 닫힌 뒤에도 그대로다
    const judged = chatJudgesOf(b.rows, CTX).map((j) => j.judge.app.words);
    expect(judged[1]?.find((w) => w.word === "sea")?.choiceAnswer).toBe(true);
    expect(judged[2]?.find((w) => w.word === "sea")?.category).toBe(
      "repeated_model",
    );
    // 저장값과 다시 센 값이 닫힌 뒤에도 같다(바뀐 행 0)
    expect(
      chatJudgeChangesOf({ rows: b.rows, stored: b.stored, ctx: CTX }),
    ).toEqual([]);
  });

  it("AC-27i (나) 닫힌 꼴에서 마지막 차례의 평가 값이 와도 고쳐 쓰는 행은 그 평가의 행뿐이고, 앞 차례의 저장값은 그대로다", () => {
    const closed = closedOf(lesson());
    const last = closed[7] as ChatTurnRowLike;
    const writes = chatEvalWritesOf({
      rows: closed,
      childRowId: last.id,
      state: { status: "done", output: EVAL_OUT },
      ctx: CTX,
    });
    expect(writes?.map((w) => w.id)).toEqual([last.id]);
  });

  it("AC-27i (다) 닫힌 꼴에서 만든 평가 입력의 선생님 말에 뺀 문장이 들어 있다", () => {
    const closed = closedOf(lesson());
    const input = chatEvalInputFor({
      rows: closed,
      childRowId: closed[5]?.id ?? "",
      contextTurns: 6,
      unitWords: ["sea"],
    });
    const says = (input?.before ?? []).flatMap((e) =>
      e.speaker === "teacher" ? [e.say] : [],
    );
    expect(
      says.some((say) => say.includes("Do you like the sea or the mountain?")),
    ).toBe(true);
    expect(says.some((say) => say.includes("I like the sea."))).toBe(true);
    // 닫힌 뒤의 아이 쪽 줄은 입력 줄을 다시 만든 글이다(사실 줄 없음 — 알고 둔 차이)
    expect(input?.target).toBe('Child (speech-to-text): "I like the sea."');
  });

  it("AC-27i (라) 지금 새 방식 행(move.lead.removed)의 닫힌 꼴에서도 나간 말에 뺀 문장이 들어 있다", () => {
    const base = readTalkMove(chatTeacher(1, "Hi!").move) as TalkMove;
    const { chat: _chat, ...rest } = base;
    const leadMove: TalkMove = {
      ...rest,
      lead: {
        reading: "does_not_know",
        move: "model_repeat",
        asked: [],
        said: [],
        removed: ["I go to the park."],
      },
    };
    const row = teacher(3, "That's okay. Say it with me.", {
      text: "That's okay. Say it with me.\nMm-hm.",
      toriRewrite: null,
      move: leadMove,
    });
    expect(chatSaidSayOf(row)).toBe(
      "That's okay. Say it with me. I go to the park.",
    );
    expect(chatSayFromRowOf(row)).toBe(chatSaidSayOf(row));
  });

  it("AC-27i 대화 기록 글이 있으면 나간 말은 지금처럼 그 say 이고, 다시 세운 글은 같은 문장을 담는다", () => {
    const row = chatTeacher(5, "Me too! Say it with me. I like the sea.", {
      listen: "I like the sea.",
    });
    expect(chatSaidSayOf(row)).toBe("Me too! Say it with me. I like the sea.");
    expect(splitSentences(chatSayFromRowOf(row)).sort()).toEqual(
      splitSentences(chatSaidSayOf(row)).sort(),
    );
  });

  it("AC-27i 원문이 지워져 다시 세울 수 없는 행을 가려내고, 그런 수업에는 늦은 평가 값을 쓰지 않는다", () => {
    const closed = closedOf(lesson());
    expect(closed.some((row) => chatSaidSayLostOf(row))).toBe(false);
    // 원문 지우기(move.ts eraseTalkMoveText)의 꼴: 뺀 문장 칸이 빈 목록, 따라 할 문장 글이 빈 글, 소리 줄 없음
    const erased = closed.map((row) => {
      const move = readTalkMove(row.move);
      if (row.speaker !== "tori" || move?.chat?.removed === undefined)
        return row;
      const { sound: _sound, ...rest } = move;
      const listen = move.chat.listen;
      return {
        ...row,
        move: {
          ...rest,
          chat: {
            ...move.chat,
            removed: [],
            ...(listen === undefined
              ? {}
              : { listen: { ...listen, sentence: "" } }),
          },
        },
      };
    });
    expect(erased.filter((row) => chatSaidSayLostOf(row))).toHaveLength(2);
    expect(
      chatEvalWritesOf({
        rows: erased,
        childRowId: erased[7]?.id ?? "",
        state: { status: "done", output: EVAL_OUT },
        ctx: CTX,
      }),
    ).toBeNull();
  });
});

describe("AC-27g 다시 받기는 설명 호출을 기다리지 않는다(검토 rev-chat-s0-2 N-2)", () => {
  it("AC-27g 설명 표지가 부르는 중일 때 다시 받기는 기다리지 않고 한 번 부르고, 첫 누름은 지금처럼 기다린다", async () => {
    const fake = fakeHintStore();
    let release: (v: AiOutcome<TalkChatHintOutput>) => void = () => {};
    const pending = new Promise<AiOutcome<TalkChatHintOutput>>((resolve) => {
      release = resolve;
    });
    let n = 0;
    const { io, calls } = hintIo(fake.store, async () => {
      n += 1;
      return n === 1 ? pending : okHint();
    });
    const explain = chatHintRun(hintReq({ kind: "explain" }), io);
    await new Promise((resolve) => setTimeout(resolve, 1));
    const again = await chatHintRun(hintReq({ retry: 1 }), io);
    expect(again).toMatchObject({ ok: true, via: "called" });
    expect(calls.n).toBe(2);
    expect(fake.marks.has("talk-chat-hint:t-row-1:1")).toBe(true);
    release(okHint());
    await explain;
    // 첫 누름(번호 0)은 설명이 부르는 중이면 기다린다(앞 시험 'AC-27g 설명이 부르는 중 → 힌트 누름은 기다렸다가 …')
  });
});

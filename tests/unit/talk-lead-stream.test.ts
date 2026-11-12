// 회화 N 길 흘려 받기(intent 2026-11-12-회화-Claude-주도 spec 설계 8 '첫 소리까지', plan 묶음 R6): 읽개의 말 칸 · 앞 칸 이름 매개(기본값은
// 지금 길 그대로) · N 의 흘려 받기(streamTalkLead) · 말 칸을 끝까지 받아 둘 자리(붙잡기). 가짜 Anthropic 의 SSE 조각 열로 본다. 실제 API 를
// 부르지 않는다. 3단계 단원 1 의 값은 시드(unit-specs · level-specs · teachers)와 시험용 설정에서 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  TALK_LEAD_OUTPUT_FIELDS,
  TALK_LEAD_TEXT_L3U1,
  type TalkLeadInput,
  type TalkLeadOutput,
  talkLeadTurnSpec,
} from "@/core/ai/calls/talk-lead";
import { talkLessonTurnSpec } from "@/core/ai/calls/talk-lesson";
import { capabilitiesOf, requestConfigOf } from "@/core/ai/combo";
import { priceBookOf, priceRowsOfSeed } from "@/core/ai/cost";
import { createMasker } from "@/core/ai/mask";
import {
  CHILD_KIND_KEY,
  createToriEnReader,
  STUCK_KEY,
  TORI_EN_KEY,
  TORI_EN_READER_KEYS,
} from "@/core/conversation/stream";
import {
  ForbiddenFileSchema,
  MetaSentencesFileSchema,
} from "@/core/seed/schema/reference";
import type { Cefr } from "@/core/seed/structure";
import { splitSentences } from "@/core/seed/text";
import { createAnthropicClient } from "@/server/ai/client";
import {
  streamTalkLead,
  TALK_LEAD_READER_KEYS,
  type TalkAttemptRecord,
  type TalkLeadStreamPlan,
} from "@/server/ai/talk";
import {
  createFakeAnthropic,
  type FakeReply,
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

// ── 3단계 단원 1 입력(시드 값) ─────────────────────────────────────

const UNIT = (
  readJson("seed/unit-specs.json").unitSpecs as {
    area: string;
    level: number;
    unit: number;
    words: string[];
  }[]
).find((u) => u.area === "talk" && u.level === 3 && u.unit === 1);
const TALK_LEVELS = (
  readJson("seed/level-specs.json").levelSpecs as {
    area: string;
    level: number;
    cefr: Cefr;
    sentenceMaxWords: number;
  }[]
).filter((s) => s.area === "talk");
const MINA = (
  readJson("seed/teachers.json").teachers as {
    key: string;
    nameEn: string;
    personaEn: string;
  }[]
).find((t) => t.key === "mina");

function leadInput(): TalkLeadInput {
  const here = TALK_LEVELS.find((s) => s.level === 3);
  const next = TALK_LEVELS.find((s) => s.level === 4);
  if (!UNIT || !here || !MINA) throw new Error("시드에 3단계 단원 1 이 없다");
  return {
    level: 3,
    canDo: "",
    learningElement: "",
    prevLearningElements: [],
    unitWords: UNIT.words,
    sentenceMaxWords: here.sentenceMaxWords,
    teacher: { nameEn: MINA.nameEn, personaEn: MINA.personaEn },
    cefr: { level: here.cefr, next: next?.cefr ?? null },
    text: TALK_LEAD_TEXT_L3U1,
    history: [],
    turn: {
      child: { kind: "speech", heard: "I go to the beach." },
      status: { goalWordsSaid: [] },
    },
  };
}

const OUTPUT: TalkLeadOutput = {
  reading: "clear_answer",
  move: "react_and_follow_up",
  say: "Oh, you go to the beach! I like the sea. What do you see there?",
  say_ko: "오, 바다에 가는구나! 나는 바다가 좋아. 거기서 뭘 봐?",
  model_sentence: "",
  hint_ko: "나는 바다를 봐.",
  hint_en: "I see the sea.",
  goal_words_i_said: ["go", "beach", "see"],
  child_used_on_own: ["beach"],
};

const REPEAT: TalkLeadOutput = {
  ...OUTPUT,
  reading: "does_not_know",
  move: "model_repeat",
  say: "That's okay. Say it with me: I go to the park. Your turn!",
  say_ko: "괜찮아. 나랑 같이 말해 봐. 네 차례야!",
  model_sentence: "I go to the park.",
};

/** 응답 글(칸 차례 = 넣은 차례). 글을 주면 그대로 쓴다(깨진 글). */
function bodyOf(answer: Record<string, unknown> | string) {
  return {
    id: "msg_handmade_talk_lead_01",
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
      input_tokens: 4900,
      output_tokens: 300,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      service_tier: "standard",
    },
  };
}

const stream = (
  answer: Record<string, unknown> | string,
  extra: Partial<Extract<FakeReply, { kind: "stream" }>> = {},
): FakeRule => ({
  reply: { kind: "stream", body: bodyOf(answer), chunks: 9, ...extra },
  times: 1,
});

/** 칸 차례를 바꾼 응답(앞 칸 이름 목록대로 먼저 넣는다). */
function reordered(
  value: TalkLeadOutput,
  order: readonly (keyof TalkLeadOutput)[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of order) out[key] = value[key];
  for (const key of TALK_LEAD_OUTPUT_FIELDS)
    if (!(key in out)) out[key] = value[key];
  return out;
}

function harness(
  rules: FakeRule[],
  extra: Partial<Pick<TalkLeadStreamPlan, "holdSay">> = {},
) {
  const fake = createFakeAnthropic(rules);
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "test-key" },
    fetch: fake.fetch,
  });
  const input = leadInput();
  const config = requestConfigOf({
    purpose: talkLeadTurnSpec.purpose,
    level: input.level,
    values,
    book: comboBook,
  });
  const rows: TalkAttemptRecord[] = [];
  const sentences: string[] = [];
  const startedAt = new Date();
  const plan: TalkLeadStreamPlan = {
    spec: talkLeadTurnSpec,
    input,
    rules: talkLeadTurnSpec.rulesOf(values, input),
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
    onSentence: (s) => sentences.push(s),
    record: async (row) => {
      rows.push(row);
    },
    ...extra,
  };
  return { plan, rows, sentences, fake };
}

/** 글을 n 글자 조각으로 나눈다. */
function pieces(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

// ── 읽개 매개(기본값 = 지금 길) ───────────────────────────────────

describe("AC-26a 읽개 기본값은 지금 길의 칸 이름 그대로", () => {
  it("AC-26a 기본 읽개의 칸 이름은 tori_en 과 앞 칸 child_kind · stuck(그 차례)이다", () => {
    expect(TORI_EN_READER_KEYS).toEqual({
      sayKey: TORI_EN_KEY,
      heads: [
        { key: CHILD_KIND_KEY, kind: "enum" },
        { key: STUCK_KEY, kind: "boolean" },
      ],
    });
    expect([TORI_EN_KEY, STUCK_KEY, CHILD_KIND_KEY]).toEqual([
      "tori_en",
      "stuck",
      "child_kind",
    ]);
  });

  it("AC-26a 매개 없는 읽개와 기본 칸 이름을 넘긴 읽개가 바꾸기 전 읽개의 기대 값(문장 · 막힘 · 갈래 · 실패)을 그대로 낸다", () => {
    // 기대 값은 R6 이전(HEAD)의 stream.ts 읽개를 같은 글 · 같은 조각 크기로 돌려 얻은 값을 글로 적어 둔 것이다(검토 M2).
    // whole 은 조각 하나가 응답 전부(1000)일 때만 다른 문장 열이다(깨진 조각 안에서 끝난 문장은 내지 않음).
    const table: {
      text: string;
      sentences: string[];
      whole?: string[];
      failed: boolean;
      stuck: boolean | undefined;
      childKind: string | undefined;
      closed: boolean;
      said: string;
    }[] = [
      {
        text: '{"child_kind":"answer","stuck":false,"tori_en":"Oh, soccer! I like it. Do you play?","tori_ko":"좋아"}',
        sentences: ["Oh, soccer!", "I like it.", "Do you play?"],
        failed: false,
        stuck: false,
        childKind: "answer",
        closed: true,
        said: "Oh, soccer! I like it. Do you play?",
      },
      {
        text: '{"stuck":true,"tori_en":"That is okay. Say it."}',
        sentences: ["That is okay.", "Say it."],
        failed: false,
        stuck: true,
        childKind: undefined,
        closed: true,
        said: "That is okay. Say it.",
      },
      {
        text: '{"tori_en":"Hi. Ok"}',
        sentences: ["Hi.", "Ok"],
        failed: false,
        stuck: undefined,
        childKind: undefined,
        closed: true,
        said: "Hi. Ok",
      },
      {
        text: '{"stuck":true,"child_kind":"answer","tori_en":"No. "}',
        sentences: [],
        failed: true,
        stuck: true,
        childKind: undefined,
        closed: false,
        said: "",
      },
      {
        text: '{"child_kind":"Answer","tori_en":"No. "}',
        sentences: [],
        failed: true,
        stuck: undefined,
        childKind: undefined,
        closed: false,
        said: "",
      },
      {
        text: '{"tori_ko":"좋아!","tori_en":"Hi. "}',
        sentences: [],
        failed: true,
        stuck: undefined,
        childKind: undefined,
        closed: false,
        said: "",
      },
      {
        text: '{"say":"Hi. There."}',
        sentences: [],
        failed: true,
        stuck: undefined,
        childKind: undefined,
        closed: false,
        said: "",
      },
      {
        text: '{"tori_en":"Caf\\u00e9! Ok\\q more. "}',
        sentences: ["Café!"],
        whole: [],
        failed: true,
        stuck: undefined,
        childKind: undefined,
        closed: false,
        said: "Café! Ok",
      },
    ];
    for (const row of table)
      for (const size of [1, 3, 1000])
        for (const reader of [
          createToriEnReader(),
          createToriEnReader(TORI_EN_READER_KEYS),
        ]) {
          const out: string[] = [];
          for (const piece of pieces(row.text, size))
            out.push(...reader.push(piece));
          out.push(...reader.finish());
          const tag = `${row.text} / ${size}`;
          expect(out, tag).toEqual(
            size >= row.text.length && row.whole !== undefined
              ? row.whole
              : row.sentences,
          );
          expect(reader.failed(), tag).toBe(row.failed);
          expect(reader.stuck(), tag).toBe(row.stuck);
          expect(reader.childKind(), tag).toBe(row.childKind);
          expect(reader.closed(), tag).toBe(row.closed);
          expect(reader.text(), tag).toBe(row.said);
        }
  });

  it("AC-26a 지금 길의 기본 읽개는 N 의 응답(reading · move · say)을 흘려 보내지 않는다", () => {
    const reader = createToriEnReader();
    expect(reader.push(JSON.stringify(OUTPUT))).toEqual([]);
    expect(reader.failed()).toBe(true);
  });
});

describe("AC-26i N 읽개(말 칸 say · 앞 칸 reading · move)", () => {
  it("AC-26i N 의 칸 이름은 R1 응답 규격의 칸 차례(say 앞의 열거 칸 둘)에서 온다", () => {
    const sayAt = TALK_LEAD_OUTPUT_FIELDS.indexOf("say");
    expect(TALK_LEAD_READER_KEYS.sayKey).toBe("say");
    expect(TALK_LEAD_READER_KEYS.heads.map((h) => h.key)).toEqual(
      TALK_LEAD_OUTPUT_FIELDS.slice(0, sayAt),
    );
    expect(TALK_LEAD_READER_KEYS.heads.map((h) => h.key)).toEqual([
      "reading",
      "move",
    ]);
    expect(TALK_LEAD_READER_KEYS.heads.every((h) => h.kind === "enum")).toBe(
      true,
    );
    expect(TALK_LEAD_READER_KEYS.requireHeads).toBe(true);
  });

  it("AC-26i 조각 크기와 관계없이 말 칸의 첫 문장을 그 칸이 닫히기 전에 내고, 앞 칸 값을 첫 문장 전에 안다", () => {
    const text = JSON.stringify(OUTPUT);
    const firstEnd = text.indexOf("beach! ") + "beach! ".length;
    for (const size of [1, 2, 7, 1000]) {
      const reader = createToriEnReader(TALK_LEAD_READER_KEYS);
      const out: string[] = [];
      let firstAt = -1;
      let headsAtFirst: Readonly<Record<string, string | boolean>> = {};
      let fed = 0;
      for (const piece of pieces(text, size)) {
        const fresh = reader.push(piece);
        fed += piece.length;
        if (fresh.length > 0 && firstAt < 0) {
          firstAt = fed;
          headsAtFirst = reader.heads();
        }
        out.push(...fresh);
      }
      out.push(...reader.finish());
      const tag = `조각 ${size}`;
      expect(out, tag).toEqual(splitSentences(OUTPUT.say));
      expect(firstAt, tag).toBeGreaterThanOrEqual(firstEnd);
      // 말 칸이 닫히기(say 끝 따옴표) 전에 첫 문장이 나왔다(조각 하나가 응답 전부인 1000 은 빼고)
      if (size < text.length)
        expect(firstAt, tag).toBeLessThan(text.indexOf('","say_ko"'));
      expect(headsAtFirst, tag).toEqual({
        reading: "clear_answer",
        move: "react_and_follow_up",
      });
      expect(reader.head("move"), tag).toBe("react_and_follow_up");
      expect(reader.stuck(), tag).toBeUndefined();
      expect(reader.childKind(), tag).toBeUndefined();
      expect(reader.failed(), tag).toBe(false);
    }
  });

  it("AC-26i 말 칸 앞의 칸이 다 오기 전에는 흘리지 않는다(say 가 먼저 · move 없음 · reading 없음 · 차례가 바뀜 · 같은 칸 두 번)", () => {
    const { reading: _skipped, ...noReading } = OUTPUT;
    const cases = [
      reordered(OUTPUT, ["say"]),
      reordered(OUTPUT, ["reading", "say"]),
      // reading 을 건너뛰고 move 다음에 say(마지막 앞 칸만 와도 흘리지 않음 — 검토 M1)
      noReading,
      `{"move":"model_repeat","say":"Hi. There. "}`,
      reordered(OUTPUT, ["move", "reading", "say"]),
      { reading: "clear_answer", reading2: "x", move: "react_only", say: "A." },
      `{"reading":"clear_answer","reading":"new_topic","move":"react_only","say":"Hi. There. "}`,
    ];
    for (const value of cases) {
      const text = typeof value === "string" ? value : JSON.stringify(value);
      const reader = createToriEnReader(TALK_LEAD_READER_KEYS);
      const out: string[] = [];
      for (const piece of pieces(text, 4)) out.push(...reader.push(piece));
      out.push(...reader.finish());
      expect(out, text).toEqual([]);
      expect(reader.failed(), text).toBe(true);
      expect(reader.sayStarted(), text).toBe(false);
    }
  });

  it("AC-26i 깨진 조각이 와도 틀린 글을 내지 않는다(잘못된 이스케이프 · \\u 자리 · 열거 값 꼴 · 끊김)", () => {
    const head = '{"reading":"clear_answer","move":"react_only","say":"';
    // 잘못된 이스케이프: 앞 조각에서 끝난 문장만 나가고, 깨진 조각부터는 아무것도 내지 않는다(그 조각 안에서 끝난 문장도)
    const badEscape = createToriEnReader(TALK_LEAD_READER_KEYS);
    expect(badEscape.push(`${head}Good! I`)).toEqual(["Good!"]);
    expect(badEscape.push(" like it. \\q More. ")).toEqual([]);
    expect(badEscape.failed()).toBe(true);
    expect(badEscape.push('Next one. "}')).toEqual([]);
    expect(badEscape.finish()).toEqual([]);
    // \u 자리가 16진이 아니면 깨진 글자를 만들지 않는다
    const badHex = createToriEnReader(TALK_LEAD_READER_KEYS);
    expect(badHex.push(`${head}Caf\\u00`)).toEqual([]);
    expect(badHex.push("zz! Ok. ")).toEqual([]);
    expect(badHex.failed()).toBe(true);
    expect(badHex.text()).toBe("Caf");
    // 조각 사이에서 잘린 \u 이스케이프는 한 글자로 푼다
    const split = createToriEnReader(TALK_LEAD_READER_KEYS);
    expect(split.push(`${head}Caf\\u00`)).toEqual([]);
    expect(split.push('e9! Ok"}')).toEqual(["Café!", "Ok"]);
    // 열거 칸 값이 낱말 꼴(소문자 · 밑줄)이 아니면 흘리지 않는다
    const badEnum = createToriEnReader(TALK_LEAD_READER_KEYS);
    expect(
      badEnum.push(
        '{"reading":"clear_answer","move":"Model Repeat","say":"A. B. "}',
      ),
    ).toEqual([]);
    expect(badEnum.failed()).toBe(true);
    // 말 칸이 닫히기 전에 끊기면 끝나지 않은 조각은 내지 않는다
    const cut = createToriEnReader(TALK_LEAD_READER_KEYS);
    expect(cut.push(`${head}Nice! I like`)).toEqual(["Nice!"]);
    expect(cut.finish()).toEqual([]);
    expect(cut.closed()).toBe(false);
  });
});

// ── streamTalkLead ────────────────────────────────────────────────

describe("AC-26i N 의 흘려 받기(streamTalkLead)", () => {
  it("AC-26i N 은 지금 회화 턴과 같은 호출 설정(모델 · effort · 생각 · 최대 출력 · 기다림)을 쓴다", async () => {
    // 목적이 같으면 talkLeadTurn 앞머리(runCallCore)가 같은 설정 키를 읽는다 — 목적 자체를 먼저 고정한다(검토 M2)
    expect(talkLeadTurnSpec.purpose).toBe(talkLessonTurnSpec.purpose);
    expect(talkLeadTurnSpec.purpose).toBe("talk_turn");
    const lead = requestConfigOf({
      purpose: talkLeadTurnSpec.purpose,
      level: 3,
      values,
      book: comboBook,
    });
    const lesson = requestConfigOf({
      purpose: talkLessonTurnSpec.purpose,
      level: 3,
      values,
      book: comboBook,
    });
    expect(lead).toEqual(lesson);
    const { plan, fake } = harness([stream(OUTPUT)]);
    await streamTalkLead(plan);
    const sent = fake.requests[0]?.body as {
      model: string;
      max_tokens: number;
      stream: boolean;
      thinking: unknown;
      output_config: { effort: unknown };
    };
    expect(sent.model).toBe(lesson.model);
    expect(sent.max_tokens).toBe(lesson.maxTokens);
    expect(sent.thinking).toEqual(lesson.thinking);
    expect(sent.output_config.effort).toBe(lesson.effort);
    expect(sent.stream).toBe(true);
  });

  it("AC-26i 문장을 받는 콜백(onSentence) 없이는 N 의 흘려 받기 계획을 만들 수 없다(말 칸이 빈 '성공'이 되지 않게 — 형 검사)", () => {
    // 이 증명은 tsc --noEmit 이 한다: onSentence 가 선택이면 아래 @ts-expect-error 가 쓰이지 않아 형 검사가 실패한다(검토 M3)
    const { plan } = harness([]);
    const { onSentence: _dropped, ...rest } = plan;
    // @ts-expect-error onSentence 는 필수 칸이다
    const withoutSentence: TalkLeadStreamPlan = rest;
    expect(withoutSentence.onSentence).toBeUndefined();
  });

  it("AC-26i 말 칸의 문장을 문장 문을 지나 차례로 흘려 보내고, 값의 say 는 내보낸 문장을 이은 글이다", async () => {
    const { plan, rows, sentences } = harness([stream(OUTPUT)]);
    const result = await streamTalkLead(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(sentences).toEqual(splitSentences(OUTPUT.say));
    expect(result.streamed).toBe(true);
    expect(result.held).toBe(false);
    expect(result.value).toEqual(OUTPUT);
    expect(result.sentSentences).toEqual(sentences);
    expect(result.firstSentenceMs).not.toBeNull();
    expect(rows.map((r) => r.status)).toEqual(["success"]);
    expect(rows[0]?.firstSentenceMs).toBe(result.firstSentenceMs);
  });

  it("AC-26i 말 칸 첫 문장이 응답 끝 전에 나간다(첫 문장 뒤에서 끊긴 응답도 그 문장을 이미 보냈다)", async () => {
    const text = JSON.stringify(OUTPUT);
    const cutAt = text.indexOf("beach! ") + "beach! I".length;
    const { plan, rows, sentences } = harness([
      stream(OUTPUT, { cutAfterChars: cutAt }),
    ]);
    const result = await streamTalkLead(plan);
    expect(sentences).toEqual(["Oh, you go to the beach!"]);
    expect(result).toMatchObject({
      ok: false,
      reason: "cut_after_first",
      sentSentences: ["Oh, you go to the beach!"],
    });
    expect(rows).toHaveLength(1);
  });

  it("AC-26i 말 칸 앞의 칸이 차례를 어기면 흘리지 않고 응답 끝에서 한 번에 낸다(같은 문장을 두 번 내지 않음)", async () => {
    const swapped = reordered(OUTPUT, ["move", "reading", "say"]);
    const text = JSON.stringify(swapped);
    const cutAt = text.indexOf("beach! ") + "beach! I".length;
    const { plan, rows, sentences } = harness([
      stream(swapped, { cutAfterChars: cutAt }),
      stream(swapped),
    ]);
    const result = await streamTalkLead(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    // 끊긴 첫 시도에서는 아무것도 나가지 않아 다시 불렀다
    expect(rows).toHaveLength(2);
    expect(sentences).toEqual(splitSentences(OUTPUT.say));
    expect(result.streamed).toBe(false);
  });

  it("AC-26i 깨진 응답 글은 문장을 내지 않고 읽지 못함으로 끝난다", async () => {
    const broken =
      '{"reading":"clear_answer","move":"react_only","say":"Nice \\q one. Bye. ","say_ko":"';
    const { plan, sentences } = harness([stream(broken)]);
    const result = await streamTalkLead(plan);
    expect(sentences).toEqual([]);
    expect(result).toEqual({ ok: false, reason: "invalid", refusals: 0 });
  });

  it("AC-26i 금지 문장은 지금 길과 같은 문장 문에서 첫 자리만 안전한 대사로 바뀐다", async () => {
    const value = {
      ...OUTPUT,
      say: "Nice! What is your phone number? Where do you live?",
    };
    const { plan, sentences } = harness([stream(value)]);
    const result = await streamTalkLead(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(sentences).toEqual(["Nice!", SAFE_LINE]);
    expect(result.value.say).toBe(`Nice! ${SAFE_LINE}`);
    expect(result.blocked.length).toBe(2);
  });
});

describe("AC-26i 말 칸을 끝까지 받아 둘 자리(붙잡기)", () => {
  it("AC-26i 부르는 쪽이 붙잡으면 문장 문은 지나되 흘려 보내지 않고, 앞 칸 값으로 첫 문장 전에 한 번 묻는다", async () => {
    const asked: Readonly<Record<string, string | boolean>>[] = [];
    const { plan, rows, sentences } = harness([stream(REPEAT)], {
      holdSay: (heads) => {
        asked.push(heads);
        return heads.move === "model_repeat";
      },
    });
    const result = await streamTalkLead(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(asked).toEqual([{ reading: "does_not_know", move: "model_repeat" }]);
    expect(sentences).toEqual([]);
    expect(result.held).toBe(true);
    expect(result.streamed).toBe(false);
    expect(result.firstSentenceMs).toBeNull();
    expect(result.sentSentences).toEqual(splitSentences(REPEAT.say));
    expect(result.value.say).toBe(REPEAT.say);
    expect(rows.map((r) => r.status)).toEqual(["success"]);
    expect(rows[0]?.firstSentenceMs).toBeNull();
  });

  it("AC-26i 붙잡지 않는 차례는 그대로 흘려 보낸다", async () => {
    const { plan, sentences } = harness([stream(OUTPUT)], {
      holdSay: (heads) => heads.move === "model_repeat",
    });
    const result = await streamTalkLead(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(sentences).toEqual(splitSentences(OUTPUT.say));
    expect(result.held).toBe(false);
  });

  it("AC-26i 붙잡은 시도가 끊기면 보낸 문장이 없으므로 그 턴을 닫지 않고 다시 부른다", async () => {
    const text = JSON.stringify(REPEAT);
    const cutAt = text.indexOf("okay. ") + "okay. Say".length;
    const { plan, rows, sentences } = harness(
      [stream(REPEAT, { cutAfterChars: cutAt }), stream(REPEAT)],
      { holdSay: (heads) => heads.move === "model_repeat" },
    );
    const result = await streamTalkLead(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(rows).toHaveLength(2);
    expect(sentences).toEqual([]);
    expect(result.held).toBe(true);
    expect(result.sentSentences).toEqual(splitSentences(REPEAT.say));
  });

  it("AC-26i 앞 칸이 차례를 어겨 흘려 읽지 못한 응답은 응답 끝의 값으로 붙잡기를 묻는다", async () => {
    const swapped = reordered(REPEAT, ["say"]);
    const asked: Readonly<Record<string, string | boolean>>[] = [];
    const { plan, sentences } = harness([stream(swapped)], {
      holdSay: (heads) => {
        asked.push(heads);
        return heads.move === "model_repeat";
      },
    });
    const result = await streamTalkLead(plan);
    if (!result.ok) throw new Error(`성공이어야 한다: ${result.reason}`);
    expect(asked).toEqual([{ reading: "does_not_know", move: "model_repeat" }]);
    expect(sentences).toEqual([]);
    expect(result.held).toBe(true);
  });
});

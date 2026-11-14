// 회화 이야기 방식의 힌트 호출 · 힌트 단(intent 2026-11-13-회화-대화-구조-R spec 설계 7 · FR-7 · AC-7(순수 몫) · AC-4(explain_ko 거르기) ·
// AC-17(이름), plan 묶음 P5). 힌트 호출 규격(talk-chat-hint.ts)과 단 목록 · 화면 응답 · 저장 꼴 · 아이 행 힌트 종류(chat-hints.ts)를 본다.
// 단계 규격 칸 값은 seed/level-specs.json 회화 1 · 3단계 행과 같다.
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { CallSettingError } from "@/core/ai/calls/common";
import {
  applyTalkChatHintChecks,
  CHAT_HINT_CONTEXT_TURNS_KEY,
  type ChatHintContextEntry,
  normalizeTalkChatHint,
  TALK_CHAT_HINT_OUTPUT_FIELDS,
  TALK_CHAT_HINT_TITLE,
  type TalkChatHintInput,
  TalkChatHintOutputSchema,
  talkChatHintCheckFields,
  talkChatHintMessages,
  talkChatHintRulesOf,
  talkChatHintSpec,
  talkChatHintSystem,
  talkChatHintValidate,
} from "@/core/ai/calls/talk-chat-hint";
import { TALK_LEAD_TEXT_L3U1 } from "@/core/ai/calls/talk-lead";
import type { Masker } from "@/core/ai/mask";
import { checkOutputFields } from "@/core/ai/output-check";
import { buildAiRequest } from "@/core/ai/request";
import {
  chatAiQuestionOf,
  chatChildHintOf,
  chatExplainOf,
  chatExplainReplyOf,
  chatHintRangeNoteOf,
  chatHintRecordOf,
  chatHintRecordOfRow,
  chatHintReplyOf,
  chatHintTiersOf,
} from "@/core/conversation/chat-hints";
import type { LessonHintSpec } from "@/core/conversation/hints";
import type {
  LeadFormRule,
  LeadLevelInput,
} from "@/core/conversation/lead-level";
import { buildLexicon } from "@/core/seed/text";
import { materialsOf, readSeedFiles } from "../../scripts/talk-observe";
import { SAMPLE_FORBIDDEN } from "../fixtures/ai/sample-inputs";

const ROOT = process.cwd();

/** 회화 3단계 단원 1 의 단원 단어 일부(seed/unit-specs.json 의 앞쪽). */
const UNIT_WORDS = ["eat", "drink", "go", "come", "wash", "see", "sea"];
const FORMS: Record<string, string> = { went: "go", ate: "eat" };
const lemmaOf = (surface: string) => FORMS[surface.toLowerCase()];

/** 단계 규격 힌트 칸(seed/level-specs.json 회화 1 · 2 · 3단계 행). */
const SPEC: Record<number, LessonHintSpec> = {
  1: { band: "1-3", hintTiers: ["ko", "sentence"], usablePhrases: 0 },
  2: { band: "1-3", hintTiers: ["ko", "sentence"], usablePhrases: 0 },
  3: { band: "1-3", hintTiers: ["ko", "frame", "sentence"], usablePhrases: 0 },
};
const spec = (level: number) => SPEC[level] as LessonHintSpec;

/** 6.4 출력 검사 값(시험용 금지어 · 3단계 문장 낱말 상한). */
const CHECK = { forbidden: SAMPLE_FORBIDDEN, sentenceMaxWords: 7 };

const tiers = (
  level: number,
  output: { hint_ko: string; hint_en: string; explain_ko?: string },
) =>
  chatHintTiersOf({
    output: { explain_ko: "", ...output },
    spec: spec(level),
    unitWords: UNIT_WORDS,
    lemmaOf,
  });

const record = (
  level: number,
  output: { hint_ko: string; hint_en: string; explain_ko: string },
) =>
  chatHintRecordOf({
    output,
    spec: spec(level),
    unitWords: UNIT_WORDS,
    lemmaOf,
  });

const noMask: Masker = (text) => ({ text, names: 0, contacts: 0 });

const CONFIG = {
  purpose: "talk_chat_hint" as const,
  model: "claude-sonnet-5-5",
  effort: "low" as const,
  thinking: { type: "disabled" as const },
  maxTokens: 600,
  timeoutMs: 10_000,
  fallbacks: null,
  betas: [],
};

const CONTEXT: ChatHintContextEntry[] = [
  { speaker: "teacher", say: "Hi! I am Mina." },
  { speaker: "child", input: { kind: "speech", heard: "Hello." } },
  { speaker: "teacher", say: "I love rainy days." },
  { speaker: "child", input: { kind: "dont_know" } },
  { speaker: "teacher", say: "Rain is fun. Do you like rain?" },
  { speaker: "child", input: { kind: "quiet" } },
  { speaker: "teacher", say: "I like puddles!" },
  { speaker: "child", input: { kind: "not_heard" } },
];

const hintInput = (
  over: Partial<TalkChatHintInput> = {},
): TalkChatHintInput => ({
  level: 3,
  sentenceMaxWords: 7,
  hintTiers: spec(3).hintTiers,
  teacherNameEn: "Mina",
  say: "Wow, a cat! What color is it?",
  context: CONTEXT,
  ...over,
});

const VALUES = { [CHAT_HINT_CONTEXT_TURNS_KEY]: 6 };

/** 묶음 R4 의 아는 낱말 범위 재료(3단계 단원 1 · 미나 — talk-lead-hints 시험과 같은 시드 읽기). */
let RANGE: LeadLevelInput;

beforeAll(() => {
  const m = materialsOf(readSeedFiles(ROOT, 3, 1), {
    level: 3,
    unit: 1,
    lesson: 1,
    teacher: "mina",
  });
  if (!m.ok) throw new Error(m.missing);
  const mat = m.materials;
  RANGE = {
    level: 3,
    range: {
      sentenceMaxWords: mat.ctx.sentenceMaxWords,
      allowedWords: mat.allowedWords,
      unitWords: mat.ctx.unitWords,
      childWords: [],
      teacherName: mat.teacher.nameEn,
      lemmaOf: mat.lemmaOf,
      forms: mat.forms,
      allowedForms: mat.allowedForms,
    },
    forms: (
      JSON.parse(readFileSync(`${ROOT}/seed/lists/forms.json`, "utf8")) as {
        forms: LeadFormRule[];
      }
    ).forms,
    lexicon: buildLexicon(
      (
        JSON.parse(readFileSync(`${ROOT}/seed/vocab.json`, "utf8")) as {
          vocab: Parameters<typeof buildLexicon>[0];
        }
      ).vocab,
    ),
    promptLines: [
      TALK_LEAD_TEXT_L3U1.topicEn,
      TALK_LEAD_TEXT_L3U1.sentencesLikeEn,
    ],
    allowed: new Set(mat.talkLists.allowed.allowed),
    allowedLemmaOf: mat.allowedLemmaOf,
  };
});

describe("AC-27g 힌트 단 목록(spec 설계 7 '단 만들기')", () => {
  it("AC-27g 틀 재료가 없으면 단 둘이고 둘째 단은 영어 문장", () => {
    const made = tiers(3, {
      hint_ko: "내 고양이는 하얀색이에요.",
      hint_en: "My cat is white.",
    });
    expect(made).toEqual([
      { kind: "ko", text: "내 고양이는 하얀색이에요." },
      { kind: "sentence", text: "My cat is white.", listen: true },
    ]);
    expect(made[1]?.kind).toBe("sentence");
  });

  it("AC-27g 3단계에서 hint_en 에 단원 단어가 있으면 단 셋(뜻 → 틀 → 문장)이고 틀은 단원 단어 자리를 비운 꼴이다", () => {
    expect(
      tiers(3, {
        hint_ko: "나는 바다에 갔어요.",
        hint_en: "I went to the sea.",
      }),
    ).toEqual([
      { kind: "ko", text: "나는 바다에 갔어요." },
      { kind: "frame", text: "I ___ to the sea." },
      { kind: "sentence", text: "I went to the sea.", listen: true },
    ]);
  });

  it("AC-27g 1~2단계는 뜻 → 영어 문장 둘이고 단원 단어가 있어도 틀 단이 없다(C31)", () => {
    for (const level of [1, 2])
      expect(
        tiers(level, {
          hint_ko: "나는 바다를 봐요.",
          hint_en: "I see the sea.",
        }),
      ).toEqual([
        { kind: "ko", text: "나는 바다를 봐요." },
        { kind: "sentence", text: "I see the sea.", listen: true },
      ]);
  });

  it("AC-27g 6.4 검사에 걸린 칸은 비워져 그 칸으로 만들 단이 빠진다(hint_en 이 걸리면 뜻 단 하나)", () => {
    const bad = {
      hint_ko: "나는 바다를 봐요.",
      hint_en: "The sea is stupid.",
      explain_ko: "바다가 어떤지 묻는 말이에요.",
    };
    const hits = checkOutputFields(talkChatHintCheckFields(bad), CHECK);
    expect([...hits.keys()]).toEqual(["hint_en"]);
    const applied = applyTalkChatHintChecks(bad, hits);
    expect(applied).toEqual({
      value: { ...bad, hint_en: "" },
      changed: true,
      fatal: false,
    });
    expect(tiers(3, applied.value)).toEqual([
      { kind: "ko", text: "나는 바다를 봐요." },
    ]);
  });

  it("AC-27g hint_en 이 3단계 문장 낱말 상한을 넘으면 6.4 길이 검사에 걸린다", () => {
    const long = {
      hint_ko: "나는 바다를 봐요.",
      hint_en: "I see the big blue sea with my mom and dad.",
      explain_ko: "",
    };
    expect([
      ...checkOutputFields(talkChatHintCheckFields(long), CHECK).keys(),
    ]).toEqual(["hint_en"]);
  });

  it("AC-27g 걸리지 않은 응답은 바꾸지 않는다", () => {
    const fine = {
      hint_ko: "나는 바다를 봐요.",
      hint_en: "I see the sea.",
      explain_ko: "무엇을 보는지 묻는 말이에요.",
    };
    expect(applyTalkChatHintChecks(fine, new Map())).toEqual({
      value: fine,
      changed: false,
      fatal: false,
    });
  });

  it("AC-27g 칸이 모두 비면 단 목록이 비고, 화면 응답은 실패와 다시 받기다", () => {
    const empty = record(3, { hint_ko: "", hint_en: "", explain_ko: "" });
    expect(empty.tiers).toEqual([]);
    expect(
      chatHintReplyOf({
        record: empty,
        tier: 0,
        retriesUsed: 0,
        retryMax: 1,
        aiResting: false,
      }),
    ).toEqual({ ok: false, retry: true });
  });

  it("AC-27g 아는 낱말 범위 밖 낱말은 기록으로만 남고 단을 막지 않는다", () => {
    const output = {
      hint_ko: "나는 박물관에 갔어요.",
      hint_en: "I went to the museum.",
      explain_ko: "",
    };
    expect(
      chatHintRangeNoteOf({ hintEn: output.hint_en, range: RANGE }),
    ).toEqual(["museum"]);
    expect(
      chatHintRangeNoteOf({ hintEn: "I see the sea.", range: RANGE }),
    ).toEqual([]);
    expect(record(3, output).tiers.map((t) => t.kind)).toEqual([
      "ko",
      "frame",
      "sentence",
    ]);
  });
});

describe("AC-27g 화면에 줄 응답 꼴(spec 설계 7 '누를 때' · '실패와 다시 받기')", () => {
  const made = record(3, {
    hint_ko: "나는 바다에 갔어요.",
    hint_en: "I went to the sea.",
    explain_ko: "어디에 갔는지 묻는 말이에요.",
  });
  const ask = (over: Partial<Parameters<typeof chatHintReplyOf>[0]> = {}) =>
    chatHintReplyOf({
      record: made,
      tier: 0,
      retriesUsed: 0,
      retryMax: 1,
      aiResting: false,
      ...over,
    });

  it("AC-27g 응답은 단 목록(종류 · 차례 · 듣기)과 누른 단의 글만 싣는다 — 다음 단의 글은 그 단을 누를 때 온다", () => {
    const first = ask();
    expect(first).toEqual({
      ok: true,
      tiers: [
        { kind: "ko" },
        { kind: "frame" },
        { kind: "sentence", listen: true },
      ],
      tier: 0,
      text: "나는 바다에 갔어요.",
    });
    expect(JSON.stringify(first)).not.toContain("I went to the sea.");
    expect(JSON.stringify(first)).not.toContain("___");
    expect(ask({ tier: 2 })).toEqual({
      ok: true,
      tiers: [
        { kind: "ko" },
        { kind: "frame" },
        { kind: "sentence", listen: true },
      ],
      tier: 2,
      text: "I went to the sea.",
    });
  });

  it("AC-27g 응답의 단 수는 응답과 재료가 정한다(틀 재료가 없으면 단 둘)", () => {
    const two = chatHintReplyOf({
      record: record(3, {
        hint_ko: "내 고양이는 하얀색이에요.",
        hint_en: "My cat is white.",
        explain_ko: "",
      }),
      tier: 0,
      retriesUsed: 0,
      retryMax: 1,
      aiResting: false,
    });
    expect(two.ok && two.tiers).toEqual([
      { kind: "ko" },
      { kind: "sentence", listen: true },
    ]);
  });

  it("AC-27g 호출 실패는 talk.chat_hint_retry_max 까지 다시 받기가 있고, 넘으면 문구만 남는다", () => {
    expect(ask({ record: null })).toEqual({ ok: false, retry: true });
    expect(ask({ record: null, retriesUsed: 1 })).toEqual({
      ok: false,
      retry: false,
    });
    expect(ask({ record: null, retryMax: 0 })).toEqual({
      ok: false,
      retry: false,
    });
    expect(ask({ record: null, retriesUsed: 1, retryMax: 3 })).toEqual({
      ok: false,
      retry: true,
    });
  });

  it("AC-27g 'AI 쉬는 중'이면 다시 받기 단추가 없다", () => {
    expect(ask({ record: null, aiResting: true })).toEqual({
      ok: false,
      retry: false,
    });
  });

  it("AC-27g AI 쉬는 중이어도 저장된 단은 나온다", () => {
    expect(ask({ aiResting: true })).toEqual(ask());
    expect(ask({ aiResting: true, tier: 2 })).toEqual(ask({ tier: 2 }));
    expect(ask({ aiResting: true }).ok).toBe(true);
  });

  it("AC-27g AI 쉬는 중이고 저장된 단이 없으면 다시 받기 없이 문구만", () => {
    expect(ask({ record: null, aiResting: true })).toEqual({
      ok: false,
      retry: false,
    });
    expect(
      ask({
        record: record(3, { hint_ko: "", hint_en: "", explain_ko: "" }),
        aiResting: true,
      }),
    ).toEqual({ ok: false, retry: false });
  });

  it("AC-27g 단 목록 밖의 단을 청하면 다시 받기 없는 실패다", () => {
    expect(ask({ tier: 3 })).toEqual({ ok: false, retry: false });
  });

  it("AC-27g 다시 받기 횟수 · 단 번호가 0 이상 정수가 아니면 던진다", () => {
    expect(() => ask({ retryMax: -1 })).toThrow(RangeError);
    expect(() => ask({ retriesUsed: 0.5 })).toThrow(RangeError);
    expect(() => ask({ tier: -1 })).toThrow(RangeError);
  });
});

describe("AC-27g 저장 꼴과 아이 행 힌트 종류(spec 설계 7 '저장과 힌트 종류')", () => {
  const two = record(3, {
    hint_ko: "내 고양이는 하얀색이에요.",
    hint_en: "My cat is white.",
    explain_ko: "고양이 색을 묻는 말이에요.",
  });
  const three = record(3, {
    hint_ko: "나는 바다에 갔어요.",
    hint_en: "I went to the sea.",
    explain_ko: "",
  });

  it("AC-27g ai_question 에는 실제로 만든 단만 종류와 함께 남고(질문 글 칸은 빔), 되읽으면 같은 단이다", () => {
    const saved = chatAiQuestionOf(two);
    expect(saved).toEqual({
      en: "",
      ko: "",
      answerExample: "",
      hintKo: "내 고양이는 하얀색이에요.",
      hints: ["My cat is white."],
      hintKinds: ["sentence"],
      explainKo: "고양이 색을 묻는 말이에요.",
    });
    expect(chatHintRecordOfRow(saved, spec(3))).toEqual(two);
    expect(chatHintRecordOfRow(chatAiQuestionOf(three), spec(3))).toEqual(
      three,
    );
  });

  it("AC-27g 힌트가 아직 없는 선생님 행(누르지 않음 · 다른 꼴)은 되읽으면 null 이다", () => {
    expect(chatHintRecordOfRow(null, spec(3))).toBeNull();
    expect(
      chatHintRecordOfRow(
        { en: "What?", ko: "뭐?", answerExample: "", hintKo: "", hints: [] },
        spec(3),
      ),
    ).toBeNull();
    expect(
      chatHintRecordOfRow(
        { hintKo: "", hints: ["x"], hintKinds: ["frame", "sentence"] },
        spec(3),
      ),
    ).toBeNull();
  });

  it("AC-27g 아이 행 힌트 종류는 실제로 받은 단 종류와 연 단 수로 정한다(틀 없는 차례에서 둘째 단을 열면 '영어 문장')", () => {
    expect(
      chatChildHintOf({ record: two, opened: 2, stuckRun: 0, heard: [] }),
    ).toEqual({
      hintKind: "english",
      hintLevel: 2,
      openedKinds: ["ko", "sentence"],
    });
    expect(
      chatChildHintOf({ record: three, opened: 2, stuckRun: 0, heard: [] }),
    ).toEqual({
      hintKind: "english",
      hintLevel: 2,
      openedKinds: ["ko", "frame"],
    });
    expect(
      chatChildHintOf({ record: two, opened: 1, stuckRun: 0, heard: [] }),
    ).toEqual({ hintKind: "meaning_only", hintLevel: 1, openedKinds: ["ko"] });
  });

  it("AC-27g 연 단 수는 실제로 만든 단 수를 넘지 않는다(실패 문구 단은 셈 밖)", () => {
    expect(
      chatChildHintOf({ record: two, opened: 3, stuckRun: 0, heard: [] }),
    ).toEqual({
      hintKind: "english",
      hintLevel: 2,
      openedKinds: ["ko", "sentence"],
    });
  });

  it("AC-27g 힌트가 없으면(누르지 않음 · 받지 못함) 힌트 종류는 '없음'이고 연 단은 0 이다", () => {
    expect(
      chatChildHintOf({ record: null, opened: 1, stuckRun: 0, heard: [] }),
    ).toEqual({ hintKind: "none", hintLevel: 0, openedKinds: [] });
    expect(
      chatChildHintOf({
        record: record(3, { hint_ko: "", hint_en: "", explain_ko: "" }),
        opened: 1,
        stuckRun: 0,
        heard: [],
      }),
    ).toEqual({ hintKind: "none", hintLevel: 0, openedKinds: [] });
  });

  it("AC-27g 들은 도움이 있으면 힌트를 열지 않아도 '영어'다(지금 hintKindOf 그대로)", () => {
    expect(
      chatChildHintOf({
        record: null,
        opened: 0,
        stuckRun: 0,
        heard: ["answer_example"],
      }).hintKind,
    ).toBe("english");
  });

  it("AC-27g 이어진 둘째 막힘부터는 마지막 단까지 연 것으로 센다(지금 openedTierCount 그대로)", () => {
    expect(
      chatChildHintOf({ record: three, opened: 0, stuckRun: 2, heard: [] }),
    ).toEqual({
      hintKind: "english",
      hintLevel: 3,
      openedKinds: ["ko", "frame", "sentence"],
    });
  });
});

describe("AC-27d 1~3단계 뜻 단 · explain_ko 의 영어 문장 거르개(spec 설계 7 · M-3)", () => {
  it("AC-27d 1~3단계 뜻 단에 영어 문장이 없다(거르개를 지남)", () => {
    expect(
      tiers(3, {
        hint_ko: "'My cat is white.' 라고 말해요. 내 고양이는 하얀색이에요.",
        hint_en: "My cat is white.",
      })[0],
    ).toEqual({ kind: "ko", text: "내 고양이는 하얀색이에요." });
  });

  it("AC-27d 뜻이 거르개로 다 빠지면 뜻 단 없이 영어 단만 남는다", () => {
    expect(
      tiers(3, { hint_ko: "I see the sea.", hint_en: "I see the sea." }),
    ).toEqual([
      { kind: "frame", text: "I ___ the sea." },
      { kind: "sentence", text: "I see the sea.", listen: true },
    ]);
  });

  it("AC-27d explain_ko 는 선생님의 영어 문장을 옮겨 적은 문장을 뺀 글이다", () => {
    expect(
      chatExplainOf({
        explainKo:
          "선생님이 'What color is it?' 라고 물었어요. 고양이가 무슨 색인지 묻는 말이에요.",
        spec: spec(3),
      }),
    ).toBe("고양이가 무슨 색인지 묻는 말이에요.");
    expect(
      chatExplainOf({ explainKo: "What color is it?", spec: spec(3) }),
    ).toBe("");
  });

  it("AC-27d 막힌 뒤 설명 응답은 거른 explain_ko 이고, 없으면 설명 없음(문구 없음)이다", () => {
    const made = record(3, {
      hint_ko: "하얀색이에요.",
      hint_en: "It is white.",
      explain_ko: "고양이가 무슨 색인지 묻는 말이에요. What color is it?",
    });
    expect(made.explainKo).toBe("고양이가 무슨 색인지 묻는 말이에요.");
    expect(chatExplainReplyOf(made)).toEqual({
      ok: true,
      text: "고양이가 무슨 색인지 묻는 말이에요.",
    });
    expect(chatExplainReplyOf(null)).toEqual({ ok: false });
    expect(
      chatExplainReplyOf(
        record(3, {
          hint_ko: "하얀색이에요.",
          hint_en: "It is white.",
          explain_ko: "What color is it?",
        }),
      ),
    ).toEqual({ ok: false });
  });

  it("AC-27d explain_ko 가 6.4 에 걸리면 그 칸만 비운다", () => {
    const bad = {
      hint_ko: "하얀색이에요.",
      hint_en: "It is white.",
      explain_ko: "stupid 라는 말이에요.",
    };
    const hits = checkOutputFields(talkChatHintCheckFields(bad), CHECK);
    expect([...hits.keys()]).toEqual(["explain_ko"]);
    expect(applyTalkChatHintChecks(bad, hits).value).toEqual({
      ...bad,
      explain_ko: "",
    });
  });
});

describe("AC-27g 힌트 호출 규격(spec 설계 7 '호출 입력' · '호출 출력')", () => {
  it("AC-27g 목적 · 이름 · 한 번 호출이다", () => {
    expect(talkChatHintSpec.purpose).toBe("talk_chat_hint");
    expect(talkChatHintSpec.title).toBe(TALK_CHAT_HINT_TITLE);
    expect(talkChatHintSpec.multiTurn).toBe(false);
    expect(talkChatHintSpec.settingSchemas).toHaveProperty(
      CHAT_HINT_CONTEXT_TURNS_KEY,
    );
  });

  it("AC-27g 앞 대화는 talk.chat_hint_context_turns 차례만(선생님 · 아이 합침) 싣고, 지금 말은 따로 둔다", () => {
    const rules = talkChatHintRulesOf(VALUES, hintInput());
    expect(rules).toEqual({ contextTurns: 6 });
    expect(talkChatHintMessages(hintInput(), rules)).toEqual([
      {
        role: "user",
        content: [
          "The chat so far (oldest first):",
          'Teacher: "I love rainy days."',
          `(The child pressed the "I don't know" button.)`,
          'Teacher: "Rain is fun. Do you like rain?"',
          "(The child did not press the talk button.)",
          'Teacher: "I like puddles!"',
          "(The child pressed the talk button, but the app could not hear any words.)",
          "",
          `The teacher's latest turn: "Wow, a cat! What color is it?"`,
        ].join("\n"),
      },
    ]);
    const two = talkChatHintMessages(hintInput(), { contextTurns: 2 });
    expect(two[0]?.content).toBe(
      [
        "The chat so far (oldest first):",
        'Teacher: "I like puddles!"',
        "(The child pressed the talk button, but the app could not hear any words.)",
        "",
        `The teacher's latest turn: "Wow, a cat! What color is it?"`,
      ].join("\n"),
    );
  });

  it("AC-27g 앞 대화가 없으면 지금 말 한 줄뿐이다", () => {
    expect(
      talkChatHintMessages(hintInput({ context: [] }), { contextTurns: 6 }),
    ).toEqual([
      {
        role: "user",
        content: `The teacher's latest turn: "Wow, a cat! What color is it?"`,
      },
    ]);
  });

  it("AC-27g 아이 말 차례는 들린 글 한 줄이다(인식기 알림은 싣지 않음)", () => {
    const messages = talkChatHintMessages(
      hintInput({
        context: [
          {
            speaker: "child",
            input: {
              kind: "speech",
              heard: "I have a cat.",
              note: { alternative: "I have a hat." },
            },
          },
        ],
      }),
      { contextTurns: 6 },
    );
    expect(messages[0]?.content).toContain(
      '\nChild (speech-to-text): "I have a cat."\n',
    );
    expect(messages[0]?.content).not.toContain("recognizer");
  });

  it("AC-27g 맥락 차례 수 설정이 없거나 꼴이 틀리면 CallSettingError, 1~3단계 밖이면 RangeError", () => {
    expect(() => talkChatHintRulesOf({}, hintInput())).toThrow(
      CallSettingError,
    );
    expect(() =>
      talkChatHintRulesOf({ [CHAT_HINT_CONTEXT_TURNS_KEY]: 0 }, hintInput()),
    ).toThrow(CallSettingError);
    expect(() => talkChatHintRulesOf(VALUES, hintInput({ level: 4 }))).toThrow(
      RangeError,
    );
  });

  it("AC-27g 안내문은 단계의 힌트 단 · 1~3단계 글 규칙(영어 문장 한 개 · 낱말 상한 · 설명에 영어 문장을 옮기지 않음) · 이름 자리 규칙을 싣는다", () => {
    const rules = { contextTurns: 6 };
    const three = talkChatHintSystem(hintInput(), rules);
    expect(three).toContain("Mina");
    expect(three).toContain("exactly one short sentence of at most 7 words");
    expect(three).toContain(
      "first the Korean meaning (hint_ko), then the English sentence with one word left blank (only on some turns), then the whole English sentence (hint_en).",
    );
    expect(three).toContain(
      "Do not copy the teacher's English sentences into it",
    );
    expect(three).toContain("{NAME}");
    expect(three).toContain("never write any other name for the child");
    const one = talkChatHintSystem(
      hintInput({
        level: 1,
        sentenceMaxWords: 5,
        hintTiers: spec(1).hintTiers,
      }),
      rules,
    );
    expect(one).toContain("exactly one short sentence of at most 5 words");
    expect(one).toContain(
      "first the Korean meaning (hint_ko), then the English sentence (hint_en).",
    );
    expect(one).not.toContain("left blank");
  });

  it("AC-27g 안내문은 hint_ko 를 아이 말투의 반말로, explain_ko 를 선생님 목소리의 반말로 정한다(정본 03 4절 7줄 · 13절 C243 보완 7 (6))", () => {
    const system = talkChatHintSystem(hintInput(), { contextTurns: 6 });
    const line = (field: string) =>
      system.split("\n").find((l) => l.startsWith(`- "${field}"`)) ?? "";
    expect(line("hint_ko")).toContain(
      "as the child would say it, in casual 반말 (the child talking to a friend, not polite 해요체)",
    );
    expect(line("explain_ko")).toContain(
      "in casual 반말 in the teacher's own voice, as the teacher would say it to the child (not polite 해요체)",
    );
    // hint_en 은 영어라 말투 줄이 없다
    expect(line("hint_en")).not.toContain("반말");
  });

  it("AC-27g 힌트 호출 입력에 단원 단어 · 목표 글이 없다", () => {
    const built = buildAiRequest(
      talkChatHintSpec,
      hintInput({ say: "Hello! How are you?", context: [] }),
      { config: CONFIG, masker: noMask, rules: { contextTurns: 6 } },
    );
    const request = [
      built.body.system,
      ...built.body.messages.map((m) => m.content),
    ].join("\n");
    for (const word of ["drink", "wash", "beach"])
      expect(request.toLowerCase()).not.toMatch(new RegExp(`\\b${word}\\b`));
    expect(request).not.toContain(TALK_LEAD_TEXT_L3U1.topicEn);
    expect(request).not.toContain(TALK_LEAD_TEXT_L3U1.sentencesLikeEn);
    expect(request.toLowerCase()).not.toContain("goal");
    expect(request.toLowerCase()).not.toContain("unit");
    expect(Object.keys(hintInput())).not.toContain("unitWords");
    expect(built.body.cache_control).toBeUndefined();
  });

  it("AC-27g 응답은 세 칸(hint_ko → hint_en → explain_ko)이고 세 칸이 다 비면 호출 하나의 실패다", () => {
    expect(TALK_CHAT_HINT_OUTPUT_FIELDS).toEqual([
      "hint_ko",
      "hint_en",
      "explain_ko",
    ]);
    const ok = {
      hint_ko: "하얀색이에요.",
      hint_en: "It is white.",
      explain_ko: "",
    };
    expect(TalkChatHintOutputSchema.safeParse(ok).success).toBe(true);
    expect(
      TalkChatHintOutputSchema.safeParse({ hint_ko: "x", hint_en: 1 }).success,
    ).toBe(false);
    expect(talkChatHintValidate(ok)).toEqual([]);
    expect(
      talkChatHintValidate({ hint_ko: " ", hint_en: "", explain_ko: "" }),
    ).not.toEqual([]);
    expect(
      normalizeTalkChatHint({ hint_ko: "하얀색이에요.", hint_en: 3 }),
    ).toEqual({ hint_ko: "하얀색이에요.", hint_en: "", explain_ko: "" });
    expect(normalizeTalkChatHint({ hint_ko: "", hint_en: "" })).toBeNull();
    expect(normalizeTalkChatHint("nope")).toBeNull();
  });
});

describe("AC-27q 힌트 호출의 이름 자리(NFR-3)", () => {
  const name = "Jisu";
  const masker: Masker = (text) => ({
    text: text.replaceAll(name, "{NAME}"),
    names: text.includes(name) ? 1 : 0,
    contacts: 0,
  });

  it("AC-27q 요청 본문에 이름 자리 밖 아이 이름이 없다(지금 말 · 앞 대화의 선생님 말 · 아이 말을 가림)", () => {
    const built = buildAiRequest(
      talkChatHintSpec,
      hintInput({
        say: `Nice to meet you, ${name}!`,
        context: [
          { speaker: "teacher", say: `Hi ${name}!` },
          {
            speaker: "child",
            input: { kind: "speech", heard: `My name is ${name}.` },
          },
        ],
      }),
      { config: CONFIG, masker, rules: { contextTurns: 6 } },
    );
    const request = [
      built.body.system,
      ...built.body.messages.map((m) => m.content),
    ].join("\n");
    expect(request).not.toContain(name);
    expect(built.body.messages[0]?.content).toBe(
      [
        "The chat so far (oldest first):",
        'Teacher: "Hi {NAME}!"',
        'Child (speech-to-text): "My name is {NAME}."',
        "",
        `The teacher's latest turn: "Nice to meet you, {NAME}!"`,
      ].join("\n"),
    );
    expect(built.masked.names).toBe(3);
  });
});

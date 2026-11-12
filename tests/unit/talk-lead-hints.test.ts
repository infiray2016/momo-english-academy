// 회화 N 길의 AI 차례 힌트 단(intent 2026-11-12-회화-Claude-주도 spec 설계 3 '힌트 단추' · FR-10 · AC-10, plan 묶음 R1): hint_ko · hint_en 에서
// 단계 규격 hintTiers 대로 단을 만들고(3단계 틀 포함), 빈 칸 · 검사 걸림이면 힌트 단추가 없다. 단계 규격 칸 값은 seed/level-specs.json 회화 행과 같다.
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  applyTalkLeadChecks,
  TALK_LEAD_TEXT_L3U1,
  type TalkLeadOutput,
  talkLeadCheckFields,
} from "@/core/ai/calls/talk-lead";
import { checkOutputFields } from "@/core/ai/output-check";
import type { LessonHintSpec } from "@/core/conversation/hints";
import {
  LEAD_FRAME_BLANK,
  leadAiHintsOf,
  leadHintBlockOf,
  leadHintFrameOf,
  leadHintTiersOf,
} from "@/core/conversation/lead-hints";
import type {
  LeadFormRule,
  LeadLevelInput,
} from "@/core/conversation/lead-level";
import { buildLexicon } from "@/core/seed/text";
import { materialsOf, readSeedFiles } from "../../scripts/talk-observe";
import { SAMPLE_FORBIDDEN } from "../fixtures/ai/sample-inputs";

const ROOT = process.cwd();
/** 6.4 출력 검사 값(시험용 금지어 · 3단계 문장 낱말 상한). */
const CHECK = { forbidden: SAMPLE_FORBIDDEN, sentenceMaxWords: 7 };

/** 묶음 R4 의 아는 낱말 범위 재료(3단계 단원 1 · 미나 — R4 시험과 같은 시드 읽기). */
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

/** 회화 3단계 단원 1 의 단원 단어(seed/unit-specs.json 의 앞쪽). */
const UNIT_WORDS = [
  "eat",
  "drink",
  "go",
  "come",
  "wash",
  "see",
  "sea",
  "beach",
];
const FORMS: Record<string, string> = {
  goes: "go",
  went: "go",
  ate: "eat",
  beaches: "beach",
};
const lemmaOf = (surface: string) => FORMS[surface.toLowerCase()];

/** 단계 규격 힌트 칸(seed/level-specs.json 회화 1 · 3 · 8 · 10단계 행). */
const SPEC: Record<number, LessonHintSpec> = {
  1: { band: "1-3", hintTiers: ["ko", "sentence"], usablePhrases: 0 },
  3: { band: "1-3", hintTiers: ["ko", "frame", "sentence"], usablePhrases: 0 },
  8: { band: "7-9", hintTiers: ["frame"], usablePhrases: 0 },
  10: { band: "10-12", hintTiers: [], usablePhrases: 0 },
};

const tiersOf = (
  level: number,
  output: { hint_ko: string; hint_en: string },
  askKind: "first" | "re_ask" = "first",
) =>
  leadHintTiersOf({
    output,
    spec: SPEC[level] as LessonHintSpec,
    unitWords: UNIT_WORDS,
    lemmaOf,
    askKind,
    check: CHECK,
    range: RANGE,
  }).tiers;

const OUTPUT: TalkLeadOutput = {
  reading: "clear_answer",
  move: "react_and_follow_up",
  say: "Nice! What do you do on weekends?",
  say_ko: "좋아! 주말에 뭐 해?",
  model_sentence: "",
  hint_ko: "나는 주말에 바다에 가.",
  hint_en: "I go to the sea on weekends.",
  goal_words_i_said: [],
  child_used_on_own: [],
};

describe("AC-26j 힌트 단(spec 설계 3)", () => {
  it("AC-26j 1~2단계는 뜻 → 영어 문장(듣기 단추) 차례다", () => {
    expect(
      tiersOf(1, { hint_ko: "나는 바다를 봐.", hint_en: "I see the sea." }),
    ).toEqual([
      { kind: "ko", text: "나는 바다를 봐." },
      { kind: "sentence", text: "I see the sea.", listen: true },
    ]);
  });

  it("AC-26j 3단계는 뜻 → 영어 틀(단원 단어 자리를 비움) → 영어 문장 차례다", () => {
    expect(
      tiersOf(3, { hint_ko: "나는 바다를 봐.", hint_en: "I see the sea." }),
    ).toEqual([
      { kind: "ko", text: "나는 바다를 봐." },
      { kind: "frame", text: `I ${LEAD_FRAME_BLANK} the sea.` },
      { kind: "sentence", text: "I see the sea.", listen: true },
    ]);
  });

  it("AC-26j 3단계 틀: 단원 단어가 둘 이상이면 첫 것만 비운다", () => {
    expect(
      leadHintFrameOf({
        hintEn: "We go to the beach.",
        unitWords: UNIT_WORDS,
        lemmaOf,
      }),
    ).toBe("We ___ to the beach.");
  });

  it("AC-26j 3단계 틀: 활용형은 원형으로 찾아 그 자리를 비운다", () => {
    expect(
      leadHintFrameOf({
        hintEn: "My dad goes to the beaches.",
        unitWords: UNIT_WORDS,
        lemmaOf,
      }),
    ).toBe("My dad ___ to the beaches.");
    expect(
      leadHintFrameOf({
        hintEn: "Swimming is fun. We ate rice.",
        unitWords: UNIT_WORDS,
        lemmaOf,
      }),
    ).toBe("Swimming is fun. We ___ rice.");
  });

  it("AC-26j 3단계 틀: 단원 단어가 없으면 틀 단 없이 뜻 → 영어 문장이다", () => {
    expect(
      leadHintFrameOf({
        hintEn: "I like swimming.",
        unitWords: UNIT_WORDS,
        lemmaOf,
      }),
    ).toBeNull();
    expect(
      tiersOf(3, { hint_ko: "나는 수영이 좋아.", hint_en: "I like swimming." }),
    ).toEqual([
      { kind: "ko", text: "나는 수영이 좋아." },
      { kind: "sentence", text: "I like swimming.", listen: true },
    ]);
  });

  it("AC-26j 빈 칸이면(질문이 없는 차례) 힌트 단추가 없다", () => {
    expect(tiersOf(3, { hint_ko: "", hint_en: "" })).toEqual([]);
    expect(tiersOf(3, { hint_ko: "나는 바다를 봐.", hint_en: " " })).toEqual(
      [],
    );
    expect(tiersOf(3, { hint_ko: "", hint_en: "I see the sea." })).toEqual([]);
    expect(
      leadAiHintsOf({
        hintKo: "",
        hintEn: "I see the sea.",
        spec: SPEC[3] as LessonHintSpec,
        unitWords: UNIT_WORDS,
        lemmaOf,
      }),
    ).toBeUndefined();
  });

  it("AC-26j 검사(6.4)에 걸린 힌트는 둘 다 비워져 힌트 단추가 없다", () => {
    const options = CHECK;
    const blockedWord = { ...OUTPUT, hint_en: "The sea is stupid." };
    const tooLong = {
      ...OUTPUT,
      hint_en: "I go to the big blue sea with my mom and dad.",
    };
    for (const bad of [blockedWord, tooLong]) {
      const hits = checkOutputFields(talkLeadCheckFields(bad), options);
      expect(hits.has("hint_en")).toBe(true);
      const { value } = applyTalkLeadChecks(bad, hits);
      expect(tiersOf(3, value)).toEqual([]);
    }
  });

  it("AC-26j weekends 가 든 hint_en 은 아는 낱말 범위 검사(R4 — 안내문 목표 줄 낱말)에 걸리지 않고 힌트 단이 그대로 나온다", () => {
    // weekends 는 단계 어휘 · 단원 단어 밖이라 안내문 목표 줄 낱말이 없으면 걸린다 — 검사가 실제로 범위를 본다는 증명
    expect(
      leadHintBlockOf({
        output: OUTPUT,
        check: CHECK,
        range: { ...RANGE, promptLines: [] },
      }),
    ).toEqual({ kind: "out_of_range", words: ["weekends"] });
    expect(
      leadHintBlockOf({ output: OUTPUT, check: CHECK, range: RANGE }),
    ).toBeNull();
    const result = leadHintTiersOf({
      output: OUTPUT,
      spec: SPEC[3] as LessonHintSpec,
      unitWords: UNIT_WORDS,
      lemmaOf,
      askKind: "first",
      check: CHECK,
      range: RANGE,
    });
    expect(result.blocked).toBeNull();
    expect(result.tiers).toEqual([
      { kind: "ko", text: "나는 주말에 바다에 가." },
      { kind: "frame", text: "I ___ to the sea on weekends." },
      { kind: "sentence", text: "I go to the sea on weekends.", listen: true },
    ]);
  });

  it("AC-26j 아는 낱말 범위 밖 낱말이 든 hint_en 은 걸려 힌트 단추가 없고 걸린 낱말을 돌려준다", () => {
    const outOfRange = {
      hint_ko: "나는 주말에 박물관에 가.",
      hint_en: "I go to the museum on weekends.",
    };
    const result = leadHintTiersOf({
      output: outOfRange,
      spec: SPEC[3] as LessonHintSpec,
      unitWords: UNIT_WORDS,
      lemmaOf,
      askKind: "first",
      check: CHECK,
      range: RANGE,
    });
    expect(result.tiers).toEqual([]);
    expect(result.blocked).toEqual({ kind: "out_of_range", words: ["museum"] });
    // 6.4 출력 검사에 걸리면 그 까닭(걸린 칸)을 돌려준다
    expect(
      leadHintBlockOf({
        output: { hint_ko: "나는 바다를 봐.", hint_en: "The sea is stupid." },
        check: CHECK,
        range: RANGE,
      }),
    ).toEqual({ kind: "output_check", paths: ["hint_en"] });
  });

  it("AC-26j 1~3단계 뜻 단은 영어 문장을 거른 글이고, 거른 뒤 비면 힌트 단추가 없다(spec 설계 8, 검토 M-3)", () => {
    expect(
      tiersOf(3, {
        hint_ko: "나는 바다를 봐. 'I see the sea' 라고 말해 봐.",
        hint_en: "I see the sea.",
      })[0],
    ).toEqual({ kind: "ko", text: "나는 바다를 봐." });
    expect(
      tiersOf(3, { hint_ko: "I see the sea.", hint_en: "I see the sea." }),
    ).toEqual([]);
    // 4단계부터는 거르지 않는다(지금 길과 같음)
    expect(
      leadAiHintsOf({
        hintKo: "'I see the sea' 라고 해 봐.",
        hintEn: "I see the sea.",
        spec: { band: "4-6", hintTiers: ["ko", "sentence"] },
        unitWords: UNIT_WORDS,
        lemmaOf,
      })?.hintKo,
    ).toBe("'I see the sea' 라고 해 봐.");
  });

  it("AC-26j 단 수 · 차례는 단계 규격 그대로다(8단계 틀만 · 다시 묻는 턴은 뜻부터, 10단계는 단추 없음)", () => {
    const hint = { hint_ko: "나는 바다를 봐.", hint_en: "I see the sea." };
    expect(tiersOf(8, hint)).toEqual([
      { kind: "frame", text: "I ___ the sea." },
    ]);
    expect(tiersOf(8, hint, "re_ask")).toEqual([
      { kind: "ko", text: "나는 바다를 봐." },
      { kind: "frame", text: "I ___ the sea." },
    ]);
    expect(tiersOf(10, hint)).toEqual([]);
  });
});

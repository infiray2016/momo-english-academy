// 회화 이야기 방식(intent 2026-11-13-회화-대화-구조-R plan 묶음 S2 fix 2 · 13절 C243 보완 6 (5))의 단원 낱말 재료(src/server/conversation/chat-unit-words.ts).
// 힌트 단 재료와 판정 맥락의 단원 단어는 모두 단계 맥락의 값(단원 규격 targetVocab — spec 표 UNIT_WORDS)이고, 원형 표도 그 낱말들로 만든다. 수업의
// 단원 단어(그 수업에 쓰인 몇 개)와 그 원형 표로 만들면 같은 힌트 응답에서 틀 단이 갈리고(검토 rev-chat-t1 I-1 · O-2), 단계 맥락의 나머지 낱말이
// 꼴을 바꿔 쓰이면 원형으로 읽히지 않는다. DB 를 거치는 길(힌트 받는 액션 · 닫을 때 · 턴 길)은 통합 시험 talk-chat-hint-action · talk-chat-closing.
import { describe, expect, it } from "vitest";
import { chatHintRecordOf } from "@/core/conversation/chat-hints";
import {
  type ChatJudgeRow,
  chatJudgesOf,
} from "@/core/conversation/chat-judge";
import { chatJudgeContextOf } from "@/core/conversation/chat-segments";
import { lemmaLookup } from "@/core/session/attempt";
import {
  chatJudgeContextFrom,
  chatUnitWordsOf,
} from "@/server/conversation/chat-unit-words";

/** 수업의 단원 단어(그 수업에 쓰인 것)와 단계 맥락의 단원 단어(단원 규격 전부). */
const LESSON_WORDS = ["eat", "drink", "go"];
const STAGE_WORDS = ["eat", "drink", "go", "see", "sea", "beach", "sky"];
const ENTRIES = [
  { word: "eat", forms: ["eats", "ate", "eaten"] },
  { word: "drink", forms: ["drinks", "drank"] },
  { word: "go", forms: ["goes", "went", "gone"] },
  { word: "see", forms: ["sees", "saw", "seen"] },
  { word: "sea", forms: ["seas"] },
  { word: "beach", forms: ["beaches"] },
  { word: "sky", forms: ["skies"] },
];
const SPEC = {
  band: "1-3" as const,
  hintTiers: ["ko", "frame", "sentence"] as ("ko" | "frame" | "sentence")[],
  usablePhrases: 0,
};
const sceneCard = {
  targetExpressions: [],
  todayWords: [],
  required: [],
  more: [],
} as unknown as Parameters<typeof chatJudgeContextOf>[0]["card"];
const lesson = {
  card: sceneCard,
  spec: { band: "1-3" as const },
  teacher: { nameEn: "Mina" },
};

describe("AC-27g · AC-27i 단원 낱말 재료(chatUnitWordsOf — 단계 맥락의 단원 단어 · 그 낱말의 원형 표)", () => {
  const material = chatUnitWordsOf({
    unitWords: STAGE_WORDS,
    lemmaEntries: ENTRIES,
  });

  it("AC-27g 재료의 단원 단어는 단계 맥락의 값이고, 원형 표는 그 낱말들의 꼴을 원형으로 읽는다", () => {
    expect(material.unitWords).toEqual(STAGE_WORDS);
    expect(material.lemmaOf("saw")).toBe("see");
    expect(material.lemmaOf("beaches")).toBe("beach");
    expect(material.lemmaOf("went")).toBe("go");
    expect(material.lemmaOf("cat")).toBeUndefined();
  });

  it("AC-27g 단계 맥락에는 있고 수업 단원 단어에는 없는 낱말이 든 힌트 응답에서 틀 단이 생긴다(수업 단어로 만들면 생기지 않음)", () => {
    const output = {
      hint_ko: "나는 바닷가가 좋아.",
      hint_en: "I like the beach.",
      explain_ko: "",
    };
    const kinds = (unitWords: readonly string[], lemmaOf = material.lemmaOf) =>
      chatHintRecordOf({ output, spec: SPEC, unitWords, lemmaOf }).tiers.map(
        (t) => t.kind,
      );
    expect(kinds(material.unitWords)).toEqual(["ko", "frame", "sentence"]);
    expect(
      kinds(
        LESSON_WORDS,
        lemmaLookup(ENTRIES.filter((e) => LESSON_WORDS.includes(e.word))),
      ),
    ).toEqual(["ko", "sentence"]);
  });

  it("AC-27i 그 낱말의 다른 꼴(과거형)을 아이가 말하면 판정이 그 단원 단어로 센다(판정 맥락 chatJudgeContextFrom)", () => {
    const rows: ChatJudgeRow[] = [
      {
        role: "teacher",
        say: "What did you do yesterday?",
        listenSentence: null,
        explainShown: false,
        closing: false,
        first: false,
      },
      {
        role: "child",
        input: "speech",
        heard: "I saw a bird.",
        opened: [],
        koHelp: null,
        eval: { status: "waiting" },
      },
    ];
    const words = (ctx: Parameters<typeof chatJudgesOf>[1]) =>
      chatJudgesOf(rows, ctx).flatMap((j) =>
        j.judge.app.words.map((w) => w.word),
      );
    const ctx = chatJudgeContextFrom(lesson, material, []);
    expect(ctx.unitWords).toEqual(STAGE_WORDS);
    expect(ctx.teacherName).toBe("Mina");
    expect(words(ctx)).toContain("see");
    // 수업 단원 단어와 그 원형 표로 만든 맥락은 'saw' 를 단원 단어로 세지 못한다(고치기 전의 출처)
    const lessonCtx = chatJudgeContextOf(
      {
        ...lesson,
        lemmaOf: lemmaLookup(
          ENTRIES.filter((e) => LESSON_WORDS.includes(e.word)),
        ),
      },
      { unitWords: LESSON_WORDS, homophones: [] },
    );
    expect(words(lessonCtx)).not.toContain("see");
  });
});

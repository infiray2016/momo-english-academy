// 새 단어 미리보기 · 활동 차례(3.2 · 3.3 첫 활동 · AC-2f, plan-p10b 파일별 값 3 · 정할 것 ㄹ · ㅁ).
// k(unit.new_words_per_lesson)는 시험용 설정의 1~3 구간 값에서 읽는다.
import { describe, expect, it } from "vitest";
import {
  type Activity,
  activitiesOf,
  previewWordsOf,
} from "@/core/session/preview";
import { loadableSettings } from "../fixtures/seed/loadable";

/** 시험용 시드 설정(작은 틀)의 1~3 구간 unit.new_words_per_lesson. */
const K = Number(
  loadableSettings().settings.find(
    (row) => row.key === "unit.new_words_per_lesson.1-3",
  )?.value,
);
const vocab = (word: string) => ({
  meaningKo: `${word}-뜻`,
  example: `I see a ${word}.`,
});
const entry = (word: string) => ({
  word,
  meaningKo: `${word}-뜻`,
  example: `I see a ${word}.`,
});
const words = (list: { word: string; added: boolean }[]) =>
  list.map((w) => `${w.word}${w.added ? "+" : ""}`);

describe("새 단어 미리보기", () => {
  it("새 단어 미리보기: 시험용 설정에 k 가 있다", () => {
    expect(K).toBeGreaterThan(0);
  });

  it("AC-2f 배정 수업 8을 하지 않은 채 다지기 수업 9를 고르면 수업 8 의 새 단어 가운데 수업 9 에 나오는 단어가 첫 활동에 더해진다", () => {
    // 수업 1~7 의 새 단어는 만났다. 수업 8 의 새 단어(pear · plum)는 못 만났다. 다지기 9 는 새 단어가 없다
    const met = [
      "apple",
      "banana",
      "cherry",
      "grape",
      "lemon",
      "mango",
      "melon",
    ];
    const lesson9 = {
      newWords: [],
      unitWords: ["apple", "pear", "melon", "plum"],
      preview: [],
    };
    const shown = previewWordsOf({
      lesson: lesson9,
      metWords: met,
      knownWords: [],
      k: K,
      vocab,
    });
    // 바탕: 아직 '안다'가 아닌 단원 단어 앞에서 k 개, 더함: 바탕에 없고 못 만난 단어
    const base = lesson9.unitWords.slice(0, K);
    expect(shown.filter((w) => !w.added).map((w) => w.word)).toEqual(base);
    const added = shown.filter((w) => w.added).map((w) => w.word);
    for (const w of ["pear", "plum"]) {
      expect(base.includes(w) || added.includes(w)).toBe(true);
    }
    expect(added).not.toContain("apple");
    expect(added).not.toContain("melon");
  });

  it("AC-2f 배정 수업 3을 하지 않고 배정 수업 4를 고른 경우도 같고 이미 만난 단어는 더하지 않는다", () => {
    // 수업 3 의 새 단어 cat · dog 를 못 만났고, 수업 4 에는 dog · fox(수업 4 새 단어) · cow(만남)가 나온다
    const lesson4 = {
      newWords: ["fox"],
      unitWords: ["dog", "fox", "cow"],
      preview: [entry("fox")],
    };
    const shown = previewWordsOf({
      lesson: lesson4,
      metWords: ["cow", "hen"],
      knownWords: [],
      k: K,
      vocab,
    });
    expect(words(shown)).toEqual(["fox", "dog+"]);
    // 새 단어가 있는 수업은 시드 미리보기 그대로(뜻 · 예문도 시드 글)
    expect(shown[0]).toEqual({ ...entry("fox"), added: false });
    // 다 만났으면 더하지 않는다
    const all = previewWordsOf({
      lesson: lesson4,
      metWords: ["dog", "cow"],
      knownWords: [],
      k: K,
      vocab,
    });
    expect(words(all)).toEqual(["fox"]);
  });

  it("새 단어 미리보기: 다지기는 '안다'인 단어를 빼고 앞에서 unit.new_words_per_lesson 개까지이고 그 뒤 단어는 만났으면 더하지 않는다", () => {
    const unitWords = Array.from({ length: K + 3 }, (_, i) => `w${i + 1}`);
    const shown = previewWordsOf({
      lesson: { newWords: [], unitWords, preview: [] },
      metWords: unitWords,
      knownWords: ["w1"],
      k: K,
      vocab,
    });
    expect(shown.map((w) => w.word)).toEqual(unitWords.slice(1, K + 1));
    expect(shown.every((w) => !w.added)).toBe(true);
    expect(shown[0]).toEqual({ ...entry("w2"), added: false });
  });
});

describe("활동 차례", () => {
  const kinds = (list: Activity[]) => list.map((a) => a.kind);

  it("활동 차례: 영역마다 미리보기가 먼저이고 P5b 시드 보기의 화면 차례를 따르며 회화는 빈 목록이다", () => {
    expect(
      kinds(
        activitiesOf("reading", {
          passage: "p",
          targetWords: [],
          glossary: [],
          questions: [{}, {}] as never,
        }),
      ),
    ).toEqual([
      "preview",
      "reading-passage",
      "reading-question",
      "reading-question",
    ]);
    expect(
      activitiesOf("writing", {
        shape: "items",
        items: [{}, {}, {}] as never,
      }).map((a) => ("index" in a ? `${a.kind}:${a.index}` : a.kind)),
    ).toEqual([
      "preview",
      "writing-item:0",
      "writing-item:1",
      "writing-item:2",
    ]);
    expect(
      kinds(
        activitiesOf("writing", {
          shape: "guided",
          task: "t",
          example: "e",
          hints: [],
          rubric: [],
          sentences: [{}, {}] as never,
        }),
      ),
    ).toEqual([
      "preview",
      "writing-task",
      "writing-sentence",
      "writing-sentence",
    ]);
    expect(
      kinds(
        activitiesOf("writing", {
          shape: "composition",
          task: "t",
          example: "e",
          hints: ["h"],
          rubric: [],
        }),
      ),
    ).toEqual(["preview", "writing-composition"]);
    expect(
      kinds(
        activitiesOf("speaking", {
          repeat: { words: ["a", "b"], sentences: ["c"] },
          listening: [{}] as never,
          questions: [{}, {}] as never,
          pictureTask: { images: ["k"], scene: "s" },
          presentation: { topic: "t", prepWords: [], fallbackQuestions: [] },
        }),
      ),
    ).toEqual([
      "preview",
      "repeat-word",
      "repeat-word",
      "repeat-sentence",
      "listening",
      "question",
      "question",
      "picture-task",
      "presentation",
    ]);
    expect(activitiesOf("talk", {} as never)).toEqual([]);
  });
});

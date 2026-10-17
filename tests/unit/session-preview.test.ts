// 새 단어 미리보기 · 활동 차례(3.2 · 3.3 첫 활동 · AC-2f, plan-p10b 파일별 값 3 · 정할 것 ㄹ · ㅁ, plan-p11a 파일별 값 1 · 위험 3).
// k(unit.new_words_per_lesson)는 시험용 설정의 1~3 구간 값에서 읽는다. 활동 차례는 견본 빌더 수업 · 시험용 시드 1단계로 본다.
import { describe, expect, it } from "vitest";
import {
  type Activity,
  activitiesOf,
  previewWordsOf,
} from "@/core/session/preview";
import {
  defaultSettings,
  referenceSet,
  speakingLesson,
  writingLesson,
} from "../fixtures/seed/builders";
import { devSeedTree } from "../fixtures/seed/dev-tree";
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
  const ref = referenceSet(defaultSettings());
  const kinds = (list: Activity[]) =>
    list.map((a) => ("index" in a ? `${a.kind}:${a.index}` : a.kind));

  it("활동 차례: 읽기 · 쓰기 1~3 · 말하기 1단계는 미리보기가 먼저이고 내용 차례를 따르며 회화는 빈 목록이다", () => {
    expect(
      kinds(
        activitiesOf({
          area: "reading",
          level: 1,
          content: {
            passage: "p",
            targetWords: [],
            glossary: [],
            questions: [{}, {}] as never,
          },
        }),
      ),
    ).toEqual([
      "preview",
      "reading-passage",
      "reading-question:0",
      "reading-question:1",
    ]);
    expect(
      kinds(
        activitiesOf({
          area: "writing",
          level: 1,
          content: { shape: "items", items: [{}, {}, {}] as never },
        }),
      ),
    ).toEqual([
      "preview",
      "writing-item:0",
      "writing-item:1",
      "writing-item:2",
    ]);
    expect(
      kinds(
        activitiesOf({
          area: "speaking",
          level: 1,
          content: {
            repeat: { words: ["a", "b"], sentences: ["c"] },
            listening: [{}] as never,
            questions: [{}, {}] as never,
          },
        }),
      ),
    ).toEqual([
      "preview",
      "repeat-word:0",
      "repeat-word:1",
      "repeat-sentence:0",
      "listening:0",
      "question:0",
      "question:1",
    ]);
    expect(
      activitiesOf({ area: "talk", level: 1, content: {} as never }),
    ).toEqual([]);
  });

  it("활동 차례: 쓰기 4~5 는 과제 뒤 문장 전부를 한 활동으로 쓰고 내 문장 듣고 따라 말하기가 붙는다", () => {
    const guided = writingLesson(ref, 4).lesson.content;
    expect(guided.shape).toBe("guided");
    expect(
      kinds(activitiesOf({ area: "writing", level: 4, content: guided })),
    ).toEqual([
      "preview",
      "writing-task",
      "writing-guided",
      "writing-own-repeat",
    ]);
  });

  it("활동 차례: 쓰기 6~12 첫 세션은 생각 꺼내기(설정 단계부터) · 초고, 둘째 세션은 미리보기 없이 칭찬 · 교정 수만큼 · 고쳐 쓰기 · 모범 답안 · 내 문장 말하기다", () => {
    const composition = writingLesson(ref, 6).lesson.content;
    expect(composition.shape).toBe("composition");
    const draft = (thinkout: boolean) =>
      kinds(
        activitiesOf({
          area: "writing",
          level: 6,
          content: composition,
          part: "draft",
          thinkout,
        }),
      );
    expect(draft(true)).toEqual([
      "preview",
      "writing-task",
      "thinkout",
      "draft",
    ]);
    expect(draft(false)).toEqual(["preview", "writing-task", "draft"]);
    // part 가 없으면 첫 세션이다
    expect(
      kinds(activitiesOf({ area: "writing", level: 6, content: composition })),
    ).toEqual(["preview", "writing-task", "draft"]);
    const rewrite = (corrections: number) =>
      kinds(
        activitiesOf({
          area: "writing",
          level: 6,
          content: composition,
          part: "rewrite",
          corrections,
        }),
      );
    expect(rewrite(2)).toEqual([
      "feedback-praise",
      "feedback-correction:0",
      "feedback-correction:1",
      "rewrite",
      "model-answer",
      "own-speak",
    ]);
    expect(rewrite(0)).toEqual([
      "feedback-praise",
      "rewrite",
      "model-answer",
      "own-speak",
    ]);
  });

  it("활동 차례: 말하기 6단계 그림 보고 말하기는 질문보다 먼저이고 10단계는 발표 뒤 확인 질문 수만큼이다", () => {
    const six = speakingLesson(ref, 6).lesson.content;
    expect(six.pictureTask).toBeDefined();
    const sixKinds = kinds(
      activitiesOf({ area: "speaking", level: 6, content: six }),
    );
    expect(sixKinds.indexOf("picture-task")).toBe(
      sixKinds.indexOf("question:0") - 1,
    );
    expect(sixKinds.indexOf("picture-task")).toBe(
      sixKinds.lastIndexOf(`listening:${six.listening.length - 1}`) + 1,
    );
    const ten = speakingLesson(ref, 10).lesson.content;
    const tenSpec = ref.levelSpecs.levelSpecs.find(
      (s) => s.area === "speaking" && s.level === 10,
    );
    const confirmQuestions =
      tenSpec?.area === "speaking"
        ? (tenSpec.presentation?.confirmQuestions ?? 0)
        : 0;
    expect(confirmQuestions).toBeGreaterThan(0);
    const tenKinds = kinds(
      activitiesOf({
        area: "speaking",
        level: 10,
        content: ten,
        confirmQuestions,
      }),
    );
    expect(tenKinds.slice(-(confirmQuestions + 1))).toEqual([
      "presentation",
      ...Array.from(
        { length: confirmQuestions },
        (_, i) => `confirm-question:${i}`,
      ),
    ]);
    expect(tenKinds.some((k) => k.startsWith("repeat-"))).toBe(false);
  });

  it("활동 차례: 시험용 시드 1단계 세 영역의 차례 번호는 P10 과 같다", () => {
    // P10 차례: 읽기 미리보기 → 지문 → 문항, 쓰기 미리보기 → 문항, 말하기 미리보기 → 낱말 → 문장 → 듣기 → 질문(그림 칸 없음)
    const p10 = (content: Record<string, unknown>): string[] => {
      const n = (list: unknown) => (Array.isArray(list) ? list.length : 0);
      const run = (kind: string, count: number) =>
        Array.from({ length: count }, (_, i) => `${kind}:${i}`);
      if ("passage" in content)
        return [
          "preview",
          "reading-passage",
          ...run("reading-question", n(content.questions)),
        ];
      if ("items" in content)
        return ["preview", ...run("writing-item", n(content.items))];
      const repeat = content.repeat as { words: unknown; sentences: unknown };
      return [
        "preview",
        ...run("repeat-word", n(repeat.words)),
        ...run("repeat-sentence", n(repeat.sentences)),
        ...run("listening", n(content.listening)),
        ...run("question", n(content.questions)),
      ];
    };
    let seen = 0;
    for (const file of devSeedTree().lessons) {
      if (file.area === "talk") continue;
      for (const lesson of file.lessons) {
        const content = lesson.content as never;
        const now = kinds(
          activitiesOf({ area: file.area, level: file.level, content }),
        );
        expect(now).toEqual(p10(content));
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

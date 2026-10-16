import { describe, expect, it } from "vitest";
import { checkLessonCell, type SeedIssue } from "@/core/seed/check-lesson";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import {
  type WritingItem,
  type WritingLesson,
  WritingLessonSchema,
} from "@/core/seed/schema/lesson";
import type { WritingLevelSpec } from "@/core/seed/schema/reference";
import { lessonFilePath } from "@/core/seed/structure";
import {
  defaultSettings,
  referenceSet,
  settingNumber,
  unitWordsOf,
  writingLesson,
} from "../fixtures/seed/builders";

const ref = referenceSet(defaultSettings());
const { index } = buildReferenceIndex(ref);
const num = (key: string) => settingNumber(ref.settings, key);
const UNIT = 1;

function check(lesson: WritingLesson, level: number): SeedIssue[] {
  return checkLessonCell(lesson, {
    area: "writing",
    level,
    unit: UNIT,
    file: lessonFilePath("writing", level, UNIT),
    index,
  });
}
const errorsOf = (issues: SeedIssue[], rule: string) =>
  issues.filter((i) => i.severity === "error" && i.rule === rule);

function specOf(level: number): WritingLevelSpec {
  const spec = index.levelSpec("writing", level);
  if (spec?.area !== "writing") throw new Error(`쓰기 ${level}단계 규격 없음`);
  return spec;
}

function sample(level: 1 | 3 | 4 | 6): WritingLesson {
  return structuredClone(writingLesson(ref, level).lesson);
}

function itemsOf(lesson: WritingLesson): WritingItem[] {
  if (lesson.content.shape !== "items") throw new Error("문항 모양이 아니다");
  return lesson.content.items;
}

describe("칸 검사: 쓰기", () => {
  it("6.4 분량(쓰기 1~2단계): 단어 6 · 단어 6 + 어구 3 이 아니면 거부한다", () => {
    expect(check(sample(1), 1)).toEqual([]);
    const fewer = sample(1);
    itemsOf(fewer).pop();
    expect(errorsOf(check(fewer, 1), "amount")).toHaveLength(1);
    // 2단계: 받아쓰기 · 철자 타일로 만들기(단어) + 어구 조립(어구)
    const spec2 = specOf(2);
    if (spec2.amount.kind !== "items") throw new Error("2단계 모양이 아니다");
    const words = unitWordsOf(ref, "writing", 2, UNIT);
    const wordItems: WritingItem[] = Array.from(
      { length: spec2.amount.words ?? 0 },
      (_, i) => {
        const word = words[i] ?? "";
        return i % 2 === 0
          ? { type: "dictation", word, audioText: word, accepted: [word] }
          : {
              type: "build-tiles",
              word,
              tiles: word.split("").reverse(),
              meaningKo: "뜻",
              accepted: [word],
            };
      },
    );
    const phraseItems: WritingItem[] = Array.from(
      { length: spec2.amount.phrases ?? 0 },
      (_, i) => {
        const word = words[i] ?? "";
        return {
          type: "assemble-phrase",
          cards: [word, "a"],
          meaningKo: "어구",
          accepted: [`a ${word}`],
        };
      },
    );
    const level2 = sample(1);
    level2.content = { shape: "items", items: [...wordItems, ...phraseItems] };
    expect(errorsOf(check(level2, 2), "amount")).toEqual([]);
    const lessPhrases = structuredClone(level2);
    itemsOf(lessPhrases).pop();
    expect(errorsOf(check(lessPhrases, 2), "amount")).toHaveLength(1);
    // 단계 밖 유형(2단계에 그림 고르기)
    const wrongType = structuredClone(level2);
    const pick = itemsOf(sample(1)).find((i) => i.type === "pick-word");
    if (!pick) throw new Error("그림 고르기 없음");
    itemsOf(wrongType)[0] = pick;
    expect(errorsOf(check(wrongType, 2), "amount").length).toBeGreaterThan(0);
  });

  it("6.4 분량(쓰기 3단계): 문장 5개 · 3~5단어가 아니면 거부한다", () => {
    const spec = specOf(3);
    if (spec.amount.kind !== "items" || !spec.amount.sentenceWords) {
      throw new Error("3단계 규격이 아니다");
    }
    expect(check(sample(3), 3)).toEqual([]);
    const fewer = sample(3);
    itemsOf(fewer).pop();
    expect(errorsOf(check(fewer, 3), "amount")).toHaveLength(1);
    // 문장 낱말 수가 상한 + 1
    const long = sample(3);
    const max = spec.amount.sentenceWords.max;
    const words = ["i", ...Array.from({ length: max }, () => "very")];
    itemsOf(long)[0] = {
      type: "assemble-sentence",
      cards: [...words, "."],
      accepted: [`I ${words.slice(1).join(" ")}.`],
    };
    const issues = errorsOf(check(long, 3), "amount");
    expect(issues.map((i) => i.path)).toEqual(["content.items.0.accepted.0"]);
  });

  it("6.4 정답(쓰기 1~3단계): 허용 정답이 없거나 카드 · 타일로 만들 수 없으면 거부한다", () => {
    // 허용 정답 없음은 규격에서 걸린다.
    const none = sample(1) as unknown as {
      content: { items: { accepted: string[] }[] };
    };
    const head = none.content.items[0];
    if (!head) throw new Error("문항 없음");
    head.accepted = [];
    expect(WritingLessonSchema.safeParse(none).success).toBe(false);
    const answerPaths = (lesson: WritingLesson, level: number) =>
      errorsOf(check(lesson, level), "answer").map((i) => i.path);
    // 그림 고르기: 첫 허용 정답이 정답 보기가 아니다
    const pick = sample(1);
    const pickIndex = itemsOf(pick).findIndex((i) => i.type === "pick-word");
    const pickItem = itemsOf(pick)[pickIndex];
    if (pickItem?.type !== "pick-word") throw new Error("그림 고르기 없음");
    pickItem.answerNo = pickItem.answerNo === 1 ? 2 : 1;
    expect(answerPaths(pick, 1)).toEqual([
      `content.items.${pickIndex}.answerNo`,
    ]);
    // 철자 타일로 만들 수 없다
    const tiles = sample(1);
    const tileIndex = itemsOf(tiles).findIndex((i) => i.type === "copy-tiles");
    const tileItem = itemsOf(tiles)[tileIndex];
    if (tileItem?.type !== "copy-tiles") throw new Error("타일 문항 없음");
    tileItem.tiles = tileItem.tiles.slice(1);
    expect(answerPaths(tiles, 1)).toEqual([`content.items.${tileIndex}.tiles`]);
    // 빠진 글자 타일로 채울 수 없다
    const fill = sample(1);
    const fillIndex = itemsOf(fill).findIndex((i) => i.type === "fill-letters");
    const fillItem = itemsOf(fill)[fillIndex];
    if (fillItem?.type !== "fill-letters") throw new Error("채우기 문항 없음");
    fillItem.tiles = ["q", "x"];
    expect(answerPaths(fill, 1)).toEqual([`content.items.${fillIndex}.tiles`]);
    // 조립 카드에 정답 낱말이 빠졌다
    const cards = sample(3);
    const cardItem = itemsOf(cards)[0];
    if (cardItem?.type !== "assemble-sentence")
      throw new Error("조립 문항 없음");
    cardItem.cards = cardItem.cards.slice(1);
    expect(answerPaths(cards, 3)).toEqual(["content.items.0.cards"]);
    // 보이는 · 들리는 낱말이 허용 정답 가운데 하나여야 한다(P4b 검토 M-4).
    const shown = sample(1);
    const copyIndex = itemsOf(shown).findIndex((i) => i.type === "copy-tiles");
    const copyItem = itemsOf(shown)[copyIndex];
    if (copyItem?.type !== "copy-tiles") throw new Error("베끼기 문항 없음");
    copyItem.word = `${copyItem.word}s`;
    expect(answerPaths(shown, 1)).toEqual([`content.items.${copyIndex}.word`]);
    const heard = sample(1);
    const [dictWord] = unitWordsOf(ref, "writing", 1, UNIT);
    if (!dictWord) throw new Error("단어 없음");
    itemsOf(heard)[0] = {
      type: "dictation",
      word: dictWord,
      audioText: dictWord,
      accepted: [dictWord],
    };
    expect(answerPaths(heard, 1)).toEqual([]);
    const dict = itemsOf(heard)[0];
    if (dict?.type !== "dictation") throw new Error("받아쓰기 없음");
    dict.audioText = `${dictWord}s`;
    expect(answerPaths(heard, 1)).toEqual(["content.items.0.audioText"]);
  });

  it("3.3 쓰기 3단계: 대문자 카드와 문장 부호가 붙은 카드를 거부한다", () => {
    const upper = sample(3);
    const item = itemsOf(upper)[0];
    if (item?.type !== "assemble-sentence") throw new Error("조립 문항 없음");
    item.cards = item.cards.map((c) => (c === "i" ? "I" : c));
    expect(errorsOf(check(upper, 3), "writing-cards")).toHaveLength(1);
    const glued = sample(3);
    const gluedItem = itemsOf(glued)[0];
    if (gluedItem?.type !== "assemble-sentence")
      throw new Error("조립 문항 없음");
    const word = gluedItem.cards.find((c) => /^[a-z]+$/.test(c) && c !== "i");
    gluedItem.cards = gluedItem.cards
      .filter((c) => c !== ".")
      .map((c) => (c === word ? `${c}.` : c));
    // 붙은 카드 하나 · 문장 부호 카드 없음
    expect(errorsOf(check(glued, 3), "writing-cards").length).toBeGreaterThan(
      0,
    );
    expect(errorsOf(check(sample(3), 3), "writing-cards")).toEqual([]);
  });

  it("6.4 분량(쓰기 4~5단계): 문장 틀 수가 범위 밖이면 거부한다", () => {
    expect(check(sample(4), 4)).toEqual([]);
    const spec = specOf(4);
    if (spec.amount.kind !== "guided") throw new Error("4단계 모양이 아니다");
    const more = sample(4);
    if (more.content.shape !== "guided") throw new Error("guided 아님");
    const first = more.content.sentences[0];
    if (!first) throw new Error("문장 틀 없음");
    const sentences = more.content.sentences;
    more.content.sentences = Array.from(
      { length: spec.amount.sentences.max + 1 },
      (_, i) => sentences[i] ?? first,
    );
    expect(errorsOf(check(more, 4), "amount").map((i) => i.path)).toEqual([
      "content.sentences",
    ]);
    // 단어 상자가 하나뿐인 틀
    const oneBox = sample(4);
    if (oneBox.content.shape !== "guided") throw new Error("guided 아님");
    const box = oneBox.content.sentences[0];
    if (!box?.wordBox) throw new Error("단어 상자 없음");
    box.wordBox = box.wordBox.slice(0, 1);
    expect(errorsOf(check(oneBox, 4), "amount").map((i) => i.path)).toEqual([
      "content.sentences.0.wordBox",
    ]);
  });

  it("6.4 어휘 배정(쓰기 6단계 이상): 새 단어가 과제 · 예시 · 힌트에 없으면 거부한다", () => {
    const level = num("writing.split_from_level");
    expect(check(sample(6), level)).toEqual([]);
    const lesson = sample(6);
    if (lesson.content.shape !== "composition") throw new Error("작문 아님");
    const [first] = lesson.newWords;
    const other = unitWordsOf(ref, "writing", level, UNIT).find(
      (w) => !lesson.newWords.includes(w),
    );
    if (!first || !other) throw new Error("단어 없음");
    const pattern = new RegExp(`\\b${first}\\b`, "g");
    lesson.content.example = lesson.content.example.replace(pattern, other);
    lesson.content.hints = lesson.content.hints.map((h) =>
      h.replace(pattern, other),
    );
    // 채점 기준(ko)에만 있으면 세지 않는다.
    lesson.content.rubric = [...lesson.content.rubric, `${first} 를 썼다`];
    const issues = errorsOf(check(lesson, level), "vocab-allocation");
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain(first);
  });

  it("6.3 쓰기 모양: 단계와 맞지 않는 모양을 거부한다", () => {
    const split = num("writing.split_from_level");
    const light = num("writing.light_check_until_level");
    expect(errorsOf(check(sample(4), split), "writing-shape")).toHaveLength(1);
    expect(errorsOf(check(sample(1), light), "writing-shape")).toHaveLength(1);
    expect(errorsOf(check(sample(6), light), "writing-shape")).toHaveLength(1);
    expect(errorsOf(check(sample(4), light), "writing-shape")).toEqual([]);
    // 작문 예시문 분량이 범위 밖이면 거부한다(6.4 분량을 예시문에 건다).
    const short = sample(6);
    if (short.content.shape !== "composition") throw new Error("작문 아님");
    short.content.example = splitFirst(short.content.example);
    expect(errorsOf(check(short, split), "amount").length).toBeGreaterThan(0);
  });
});

/** 예시문의 첫 문장만 남긴다. */
function splitFirst(text: string): string {
  const end = text.indexOf(". ");
  return end < 0 ? text : text.slice(0, end + 1);
}

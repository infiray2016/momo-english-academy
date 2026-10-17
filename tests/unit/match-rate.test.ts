import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  bestMatchRate,
  type MatchOptions,
  matchedTargetWords,
  matchRate,
  normalizeForMatch,
} from "@/core/speech/match-rate";

// 시험용 동음이의어 묶음(낱말 묶음의 배열). 실시드 목록은 P6 의 seed/lists/ 다(plan-p02 다-7).
const HOMOPHONES = JSON.parse(
  readFileSync(
    new URL("../fixtures/speech/homophones.json", import.meta.url),
    "utf8",
  ),
) as string[][];

const ANY: MatchOptions = { homophones: HOMOPHONES, nameSlot: "any-word" };
const EXCLUDED: MatchOptions = { homophones: HOMOPHONES, nameSlot: "excluded" };
const NONE: readonly string[][] = [];

describe("일치율(6.2)", () => {
  it("AC-5a 목표 'I have two dogs' 에 인식 'i have 2 dogs.' 는 1, 'I have dogs' 는 0.75 다", () => {
    expect(matchRate("I have two dogs", "i have 2 dogs.", ANY)).toBe(1);
    expect(matchRate("I have two dogs", "I have dogs", ANY)).toBe(0.75);
  });

  it("AC-5a 목표에 없는 말을 덧붙여도 감점하지 않는다", () => {
    expect(
      matchRate("I like apples", "um I really like red apples yes", ANY),
    ).toBe(1);
    expect(matchRate("I have two dogs", "yes I have two big dogs", ANY)).toBe(
      1,
    );
  });

  it("일치율: 축약형을 펼쳐 견준다", () => {
    expect(normalizeForMatch("I'm happy", NONE)).toEqual(["i", "am", "happy"]);
    expect(normalizeForMatch("I don’t know", NONE)).toEqual([
      "i",
      "do",
      "not",
      "know",
    ]);
    expect(normalizeForMatch("won't can't shan't cannot", NONE)).toEqual([
      "will",
      "not",
      "can",
      "not",
      "shall",
      "not",
      "can",
      "not",
    ]);
    expect(normalizeForMatch("they're we've you'll she'd let's", NONE)).toEqual(
      ["they", "are", "we", "have", "you", "will", "she", "would", "let", "us"],
    );
    expect(
      normalizeForMatch("It's here. What's that? There's one.", NONE),
    ).toEqual(["it", "is", "here", "what", "is", "that", "there", "is", "one"]);
    // 소유의 's 는 펼치지 않고 따옴표만 지운다.
    expect(normalizeForMatch("The dog's ball", NONE)).toEqual([
      "the",
      "dogs",
      "ball",
    ]);
    expect(matchRate("I can't swim", "I cannot swim", ANY)).toBe(1);
    expect(matchRate("He's my friend", "he is my friend", ANY)).toBe(1);
    expect(matchRate("I am happy", "I'm happy", ANY)).toBe(1);
  });

  it("일치율: 동음이의어 묶음은 같은 낱말로 본다", () => {
    expect(normalizeForMatch("Four TWO sea write", HOMOPHONES)).toEqual([
      "for",
      "to",
      "see",
      "right",
    ]);
    expect(matchRate("I want to go there", "I want two go their", ANY)).toBe(1);
    expect(matchRate("I see the sea", "I sea the see", ANY)).toBe(1);
  });

  it("일치율: 숫자 · 서수 · 시각을 낱말로 바꾼다", () => {
    expect(normalizeForMatch("0 7 13 40 105", NONE)).toEqual([
      "zero",
      "seven",
      "thirteen",
      "forty",
      "one",
      "hundred",
      "five",
    ]);
    expect(normalizeForMatch("1,250 people", NONE)).toEqual([
      "one",
      "thousand",
      "two",
      "hundred",
      "fifty",
      "people",
    ]);
    expect(normalizeForMatch("999,999", NONE)).toEqual([
      "nine",
      "hundred",
      "ninety",
      "nine",
      "thousand",
      "nine",
      "hundred",
      "ninety",
      "nine",
    ]);
    // 999,999 를 넘는 수는 그대로 둔다.
    expect(normalizeForMatch("1000000", NONE)).toEqual(["1000000"]);
    expect(normalizeForMatch("1st 2nd 3rd 12th 21st 40th", NONE)).toEqual([
      "first",
      "second",
      "third",
      "twelfth",
      "twenty",
      "first",
      "fortieth",
    ]);
    expect(normalizeForMatch("7:00 7:05 7:30", NONE)).toEqual([
      "seven",
      "oclock",
      "seven",
      "oh",
      "five",
      "seven",
      "thirty",
    ]);
    expect(normalizeForMatch("seven o'clock, twenty-one", NONE)).toEqual([
      "seven",
      "oclock",
      "twenty",
      "one",
    ]);
    expect(
      matchRate("I get up at seven o'clock", "i get up at 7:00", ANY),
    ).toBe(1);
    expect(
      matchRate("I am in the third grade", "I am in the 3rd grade", ANY),
    ).toBe(1);
    expect(matchRate("I have twenty-one books", "I have 21 books", ANY)).toBe(
      1,
    );
  });

  it("일치율: 순서를 지킨 낱말만 센다", () => {
    expect(matchRate("I like red apples", "apples red like I", ANY)).toBe(0.25);
    expect(matchRate("I like red apples", "red apples I like", ANY)).toBe(0.5);
    expect(matchRate("I like red apples", "I like green apples", ANY)).toBe(
      0.75,
    );
  });

  it("일치율: {NAME} 자리는 아무 낱말 하나와 맞고 빼기를 고르면 분자 · 분모에서 빠진다", () => {
    expect(normalizeForMatch("Hi, {NAME}!", NONE)).toEqual(["hi", "{NAME}"]);
    expect(matchRate("My name is {NAME}.", "my name is pumpkin", ANY)).toBe(1);
    expect(matchRate("My name is {NAME}.", "my name is", ANY)).toBe(0.75);
    expect(matchRate("My name is {NAME}.", "my name is", EXCLUDED)).toBe(1);
    expect(matchRate("My name is {NAME}.", "my name", EXCLUDED)).toBeCloseTo(
      2 / 3,
    );
    // 소유의 's 가 붙은 자리도 낱말 하나로 본다.
    expect(matchRate("{NAME}'s bag is red", "pumpkins bag is red", ANY)).toBe(
      1,
    );
  });

  it("일치율: {NAME} 에 문장 부호가 붙어도 자리 하나만 아무 낱말과 맞는다", () => {
    expect(matchRate("Hi,{NAME}!", "bye bye", ANY)).toBe(0.5);
    expect(normalizeForMatch("Thanks,{NAME}. Good job", NONE)).toEqual([
      "thanks",
      "{NAME}",
      "good",
      "job",
    ]);
    expect(normalizeForMatch("{NAME}’s bag", NONE)).toEqual(["{NAME}", "bag"]);
    // 표지 바로 뒤의 'll · 'd · 've · 're · 'm 은 펼친다(값 1 (3)).
    expect(matchRate("{NAME}'ll come too", "Tori will come too", ANY)).toBe(1);
    expect(matchRate("{NAME}'d like it", "Tori would like it", ANY)).toBe(1);
    expect(matchRate("{NAME}’ve got it", "Tori have got it", ANY)).toBe(1);
    expect(normalizeForMatch("{NAME}'re here, {NAME}'m here", NONE)).toEqual([
      "{NAME}",
      "are",
      "here",
      "{NAME}",
      "am",
      "here",
    ]);
    // 입력에 든 표지 글자(U+E000)는 지워져 자리가 되지 않는다.
    const mark = String.fromCodePoint(0xe000);
    expect(normalizeForMatch(`I h${mark}ate apples`, NONE)).toEqual([
      "i",
      "hate",
      "apples",
    ]);
    expect(matchRate(`I ${mark}like apples`, "I hate apples", ANY)).toBeCloseTo(
      2 / 3,
    );
    expect(matchRate("I like apples", `I ${mark} apples`, ANY)).toBeCloseTo(
      2 / 3,
    );
  });

  it("일치율: 허용 답이 여럿이면 가장 높은 값을 쓴다", () => {
    const targets = ["I am fine", "I am good thank you"];
    expect(bestMatchRate(targets, "I am good thank you", ANY)).toBe(1);
    expect(bestMatchRate(targets, "I am good", ANY)).toBeCloseTo(2 / 3);
    expect(bestMatchRate(targets, "fine", ANY)).toBeCloseTo(1 / 3);
  });

  it("일치율: 인식이 비면 0, 목표가 비면 오류다", () => {
    expect(matchRate("I like apples", "", ANY)).toBe(0);
    expect(matchRate("I like apples", " ... ", ANY)).toBe(0);
    expect(() => matchRate("", "I like apples", ANY)).toThrow();
    expect(() => matchRate("?!", "I like apples", ANY)).toThrow();
    expect(() => matchRate("{NAME}", "pumpkin", EXCLUDED)).toThrow();
    expect(() => bestMatchRate([], "I like apples", ANY)).toThrow();
  });
});

describe("낱말별 맞춤(단어별 정오, plan-p11a 값 2)", () => {
  const marks = (target: string, heard: string, options = ANY) =>
    matchedTargetWords(target, heard, options).map(
      (w) => `${w.word}${w.matched ? "" : "✗"}`,
    );

  it("낱말별 맞춤: 정렬로 목표 낱말마다 맞았는지 내고 맞은 수는 일치율과 같다", () => {
    expect(marks("I have two dogs", "I have dogs")).toEqual([
      "i",
      "have",
      "two✗",
      "dogs",
    ]);
    expect(marks("I like red apples", "I like green apples")).toEqual([
      "i",
      "like",
      "red✗",
      "apples",
    ]);
    // 덧붙인 말 · 동음이의어 · 숫자 · 축약
    expect(marks("I have two dogs", "um i have 2 big dogs")).toEqual([
      "i",
      "have",
      "two",
      "dogs",
    ]);
    expect(marks("I'm happy", "i am happy")).toEqual(["i", "am", "happy"]);
    // 동음이의어 묶음으로 맞아도 낱말은 목표에 적힌 꼴(묶음 첫 낱말로 바꾸지 않음)
    const group = HOMOPHONES.find((g) => g.length > 1);
    if (group) {
      const [head, other] = [group[0] ?? "", group[1] ?? ""];
      expect(marks(`I see ${other}`, `I see ${head}`)).toEqual([
        "i",
        "see",
        other.toLowerCase(),
      ]);
    }
    // 인식이 비면 모두 틀림
    expect(marks("I like apples", "")).toEqual(["i✗", "like✗", "apples✗"]);
    for (const [target, heard] of [
      ["I like red apples", "apples red like I"],
      ["the cat and the dog", "the dog and the cat"],
      ["a b a b a", "b a b"],
      ["My name is {NAME}.", "my name is pumpkin"],
    ] as const) {
      const n = matchedTargetWords(target, heard, ANY).filter(
        (w) => w.matched,
      ).length;
      expect(n / normalizeForMatch(target, NONE).length).toBe(
        matchRate(target, heard, ANY),
      );
    }
  });

  it("낱말별 맞춤: {NAME} 자리는 아무 낱말과 맞고 빼기를 고르면 목록에서 빠진다", () => {
    expect(marks("Hi, {NAME}!", "hi pumpkin")).toEqual(["hi", "{NAME}"]);
    expect(marks("Hi, {NAME}!", "hi", EXCLUDED)).toEqual(["hi"]);
    expect(() => matchedTargetWords("?!", "hi", ANY)).toThrow();
  });
});

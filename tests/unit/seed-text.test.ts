import { describe, expect, it } from "vitest";
import {
  PLACEHOLDER_NAME,
  SENTENCE_END_ABBREVIATIONS,
} from "@/core/seed/structure";
import {
  buildLexicon,
  forbiddenHits,
  formsIn,
  glossaryMissing,
  isEnglishSentence,
  type LexiconEntry,
  lemmasOf,
  offbandRatio,
  placeholdersIn,
  sentenceWords,
  splitSentences,
  tokenize,
  wordIdsIn,
} from "@/core/seed/text";

// 시험용 단어. 단계 · 품사 · 활용형은 시험이 정한 값이다(설계 숫자 아님).
const VOCAB: LexiconEntry[] = [
  { word: "go", pos: ["verb"], level: 1, forms: ["goes", "went", "gone"] },
  { word: "child", pos: ["noun"], level: 1, forms: ["children"] },
  { word: "dog", pos: ["noun"], level: 1, forms: ["dogs"] },
  { word: "run", pos: ["verb"], level: 1, forms: ["runs", "ran"] },
  { word: "do", pos: ["verb", "function"], level: 1, forms: ["does", "did"] },
  { word: "not", pos: ["function"], level: 1, forms: [] },
  { word: "can", pos: ["function"], level: 1, forms: [] },
  { word: "will", pos: ["function"], level: 1, forms: [] },
  { word: "I", pos: ["pronoun", "function"], level: 1, forms: [] },
  { word: "it", pos: ["pronoun", "function"], level: 1, forms: [] },
  {
    word: "be",
    pos: ["verb", "function"],
    level: 1,
    forms: ["am", "is", "are", "was", "were"],
  },
  { word: "have", pos: ["verb"], level: 1, forms: ["has", "had"] },
  { word: "the", pos: ["function"], level: 1, forms: [] },
  { word: "a", pos: ["function"], level: 1, forms: [] },
  { word: "and", pos: ["function"], level: 1, forms: [] },
  { word: "to", pos: ["function"], level: 1, forms: [] },
  { word: "in", pos: ["function"], level: 1, forms: [] },
  { word: "at", pos: ["function"], level: 1, forms: [] },
  { word: "with", pos: ["function"], level: 1, forms: [] },
  { word: "red", pos: ["adjective"], level: 1, forms: [] },
  { word: "big", pos: ["adjective"], level: 1, forms: [] },
  { word: "ball", pos: ["noun"], level: 1, forms: ["balls"] },
  { word: "look", pos: ["verb"], level: 2, forms: ["looks", "looked"] },
  { word: "sun", pos: ["noun"], level: 1, forms: [] },
  { word: "hat", pos: ["noun"], level: 1, forms: [] },
  { word: "zebra", pos: ["noun"], level: 5, forms: ["zebras"] },
  { word: "jungle", pos: ["noun"], level: 6, forms: [] },
  { word: "ice cream", pos: ["noun"], level: 2, forms: ["ice creams"] },
  {
    word: "look at",
    pos: ["verb"],
    level: 2,
    forms: ["looks at", "looked at"],
  },
];

const lexicon = buildLexicon(VOCAB);

function lemmaIdsOf(text: string): string[][] {
  return lemmasOf(tokenize(text), lexicon).map((m) =>
    m.parts.flatMap((p) => p.ids),
  );
}

describe("글 도구(text.ts)", () => {
  it("5절 문장 끝: Mr. · Mrs. · Dr. · a.m. · p.m. 과 숫자 사이 점에서는 자르지 않는다", () => {
    expect(SENTENCE_END_ABBREVIATIONS).toEqual([
      "Mr.",
      "Mrs.",
      "Dr.",
      "a.m.",
      "p.m.",
    ]);
    const text =
      'Mr. Tori met Dr. Momo at 3 p.m. today. Mrs. Momo wakes at 7 a.m. and runs! It costs 3.5 dollars. Is it fun? "Yes." Then we go';
    expect(splitSentences(text)).toEqual([
      "Mr. Tori met Dr. Momo at 3 p.m. today.",
      "Mrs. Momo wakes at 7 a.m. and runs!",
      "It costs 3.5 dollars.",
      "Is it fun?",
      '"Yes."',
      "Then we go",
    ]);
    // 줄바꿈도 문장 끝으로 본다. 빈 줄은 문장이 아니다.
    expect(splitSentences("a red ball\n\nThe dog runs.(Tori) Wow")).toEqual([
      "a red ball",
      "The dog runs.(Tori) Wow",
    ]);
    expect(splitSentences("I see it.) And you?")).toEqual([
      "I see it.)",
      "And you?",
    ]);
    expect(splitSentences("")).toEqual([]);
    // 줄임말 앞에 붙은 글자가 있어도 토큰과 같은 경계로 본다(검토 M-8).
    expect(splitSentences("We eat at 7a.m. every day.")).toEqual([
      "We eat at 7a.m. every day.",
    ]);
    expect(splitSentences("Tori—Mr. Momo's dog—runs fast.")).toEqual([
      "Tori—Mr. Momo's dog—runs fast.",
    ]);
    expect(splitSentences("Hi,Mr. Momo. Bye.")).toEqual([
      "Hi,Mr. Momo.",
      "Bye.",
    ]);
  });

  it("3.6 문장 길이: 낱말 · 수 · {NAME} · 빈칸을 한 낱말로 센다", () => {
    expect(
      tokenize(`Hi ${PLACEHOLDER_NAME}, I have 3 cats and ___ dogs.`).map(
        (t) => t.kind,
      ),
    ).toEqual([
      "word",
      "placeholder",
      "word",
      "word",
      "number",
      "word",
      "word",
      "blank",
      "word",
    ]);
    expect(
      sentenceWords(`Hi ${PLACEHOLDER_NAME}, I have 3 cats and ___ dogs.`),
    ).toBe(9);
    // 축약형은 한 낱말이고, 굽은 따옴표도 같다.
    expect(sentenceWords("I don't like it.")).toBe(4);
    expect(sentenceWords("I don’t like it.")).toBe(4);
    expect(sentenceWords("It costs 3.50 dollars, or 1,200 won.")).toBe(7);
    expect(sentenceWords(`${PLACEHOLDER_NAME}'s ice-cream is red.`)).toBe(4);
    expect(sentenceWords("I like _____ .")).toBe(3);
    expect(sentenceWords("— ! ?")).toBe(0);
    // 줄임말은 점까지 한 낱말, 서수는 수 하나다(검토 I-1).
    expect(sentenceWords("I get up at 7 a.m.")).toBe(6);
    expect(
      tokenize("Mrs. Momo met Mr. Tori at 3 P.M.").map((t) => t.text),
    ).toEqual(["Mrs.", "Momo", "met", "Mr.", "Tori", "at", "3", "P.M."]);
    expect(tokenize("May 3rd, the 21st")).toEqual([
      { kind: "word", text: "May" },
      { kind: "number", text: "3rd" },
      { kind: "word", text: "the" },
      { kind: "number", text: "21st" },
    ]);
    // 줄임말 뒤에 영문자가 이어지면 줄임말이 아니다.
    expect(tokenize("a.mx").map((t) => t.text)).toEqual(["a", "mx"]);
    // 서수 꼬리 뒤에 영문자가 이어지면 서수가 아니다(검토 M-9).
    expect(tokenize("100steps")).toEqual([
      { kind: "number", text: "100" },
      { kind: "word", text: "steps" },
    ]);
    expect(tokenize("3rdx").map((t) => t.text)).toEqual(["3", "rdx"]);
    expect(tokenize("7am")).toEqual([
      { kind: "number", text: "7" },
      { kind: "word", text: "am" },
    ]);
  });

  it("3.4 원형 찾기: 활용형 · 축약형 · 소유격 · 여러 낱말 표제어", () => {
    // 활용형
    expect(lemmaIdsOf("Momo went with the children")).toEqual([
      [],
      ["go"],
      ["with"],
      ["the"],
      ["child"],
    ]);
    // 축약형(규칙 · 불규칙). 굽은 따옴표도 같다.
    expect(lemmaIdsOf("I don’t go")).toEqual([["I"], ["do", "not"], ["go"]]);
    expect(lemmaIdsOf("can't won't I'm")).toEqual([
      ["can", "not"],
      ["will", "not"],
      ["I", "be"],
    ]);
    // 소유격('s 를 먼저 뗀다) · 복수 소유격(s')
    expect(lemmaIdsOf("the dog's ball and the dogs' balls")).toEqual([
      ["the"],
      ["dog"],
      ["ball"],
      ["and"],
      ["the"],
      ["dog"],
      ["ball"],
    ]);
    expect(lemmaIdsOf("it's")).toEqual([["it"]]);
    // 여러 낱말 표제어는 가장 길게 먼저 맞추고, 활용형도 받는다.
    const multi = lemmasOf(
      tokenize("Momo looked at the ice creams and the ice cream."),
      lexicon,
    );
    expect(multi.map((m) => m.surface)).toEqual([
      "Momo",
      "looked at",
      "the",
      "ice creams",
      "and",
      "the",
      "ice cream",
    ]);
    expect(multi[1]).toMatchObject({ start: 1, end: 3 });
    expect(multi[1]?.parts).toEqual([{ text: "looked at", ids: ["look at"] }]);
    expect(multi[3]?.parts[0]?.ids).toEqual(["ice cream"]);
    // 하이픈 조각
    expect(lemmaIdsOf("sun-hat")).toEqual([["sun", "hat"]]);
    // 찾지 못한 낱말은 빈 목록이다.
    expect(lemmasOf(tokenize("blorp"), lexicon)[0]?.parts).toEqual([
      { text: "blorp", ids: [] },
    ]);
    // 글에 나온 원형 id 모음
    expect([...wordIdsIn("The dogs ran to the ice cream.", lexicon)]).toEqual([
      "the",
      "dog",
      "run",
      "to",
      "ice cream",
    ]);
  });

  it("6.4 어휘 범위 밖: 새 단어 · 고유 명사 · 수 · {NAME} 을 빼고 센다", () => {
    const text = `Tori and the dog run to the zebra in the jungle at 3 with ${PLACEHOLDER_NAME} blorp.`;
    // 낱말 토큰 14개(3 · {NAME} 은 둘 다에서 뺀다).
    const base = { lexicon, level: 1 };
    expect(
      offbandRatio(text, {
        ...base,
        newWords: ["zebra"],
        properNouns: ["Tori"],
      }),
    ).toBeCloseTo(2 / 14);
    expect(
      offbandRatio(text, { ...base, newWords: [], properNouns: ["Tori"] }),
    ).toBeCloseTo(3 / 14);
    expect(
      offbandRatio(text, { ...base, newWords: [], properNouns: [] }),
    ).toBeCloseTo(4 / 14);
    // 단계가 오르면 그 단계 이하 단어는 범위 안이다.
    expect(
      offbandRatio(text, {
        lexicon,
        level: 6,
        newWords: [],
        properNouns: ["Tori"],
      }),
    ).toBeCloseTo(1 / 14);
    // 축약형은 조각이 모두 범위 안이어야 한다.
    expect(
      offbandRatio("I don't look", {
        lexicon,
        level: 1,
        newWords: [],
        properNouns: [],
      }),
    ).toBeCloseTo(1 / 3);
    // 낱말 토큰이 없으면 0
    expect(
      offbandRatio(`3 ${PLACEHOLDER_NAME} ___`, {
        lexicon,
        level: 1,
        newWords: [],
        properNouns: [],
      }),
    ).toBe(0);
  });

  it("6.4 글로서리: 기능어 밖 낱말 가운데 글로서리에 없는 표기형을 낸다", () => {
    const passage =
      "Momo has a red ball and the balls are big. Look at the ice cream! Momo looked at it.";
    expect(
      glossaryMissing(
        passage,
        [
          { surface: "red" },
          { surface: "Balls" },
          { surface: "ice cream" },
          { surface: "look" },
        ],
        lexicon,
      ),
    ).toEqual(["Momo", "has", "ball", "big", "looked at"]);
    // 여러 낱말 표제어는 그 표기나 그 안의 기능어 밖 낱말이 있으면 된다.
    expect(
      glossaryMissing(
        "Look at the ice cream.",
        [{ surface: "Look" }, { surface: "cream" }],
        lexicon,
      ),
    ).toEqual([]);
    expect(
      glossaryMissing("Look at the ice cream.", [{ surface: "at" }], lexicon),
    ).toEqual(["Look at", "ice cream"]);
    // 줄임말은 표기 그대로 글로서리에 적으면 빠짐이 없다(검토 I-1).
    expect(
      glossaryMissing(
        "Mr. Tori is here at 7 a.m.",
        [
          { surface: "Mr." },
          { surface: "Tori" },
          { surface: "here" },
          { surface: "a.m." },
        ],
        lexicon,
      ),
    ).toEqual([]);
    expect(
      glossaryMissing(
        "Mr. Tori is here.",
        [{ surface: "Tori" }, { surface: "here" }],
        lexicon,
      ),
    ).toEqual(["Mr."]);
  });

  it("3.6 형태 표: 정규식과 낱말 목록으로 형태를 찾는다", () => {
    const forms = [
      { id: "past-ed", patterns: ["\\b[a-z]+ed\\b"], words: [] },
      { id: "will", patterns: [], words: ["will", "won't"] },
      { id: "going-to", patterns: [], words: ["going to"] },
      { id: "be-ing", patterns: ["\\b(?:am|is|are) [a-z]+ing\\b"], words: [] },
    ];
    expect(formsIn("I played.", forms)).toEqual(["past-ed"]);
    expect(formsIn("I WILL go.", forms)).toEqual(["will"]);
    expect(formsIn("I won’t go.", forms)).toEqual(["will"]);
    expect(formsIn("I am going to swim.", forms)).toEqual([
      "going-to",
      "be-ing",
    ]);
    expect(formsIn("I like it.", forms)).toEqual([]);
  });

  it("6.4 금지 내용: 영어 낱말 · 한국어 부분 글 · 정규식에 걸린 곳을 낸다", () => {
    const list = {
      words: { en: ["kill", "shut up"], ko: ["바보"] },
      patterns: [
        {
          id: "phone",
          category: "contact" as const,
          lang: "ko" as const,
          regex: "\\d{3}-\\d{4}-\\d{4}",
        },
        {
          id: "where-live",
          category: "personal-info" as const,
          lang: "en" as const,
          regex: "where do you live",
        },
      ],
    };
    expect(forbiddenHits("Do not KILL it.", list)).toEqual([
      { kind: "en-word", match: "kill" },
    ]);
    // 낱말 단위라 다른 낱말 속은 걸리지 않는다.
    expect(forbiddenHits("It is a skill.", list)).toEqual([]);
    expect(forbiddenHits("Shut  up, please.", list)).toEqual([
      { kind: "en-word", match: "shut up" },
    ]);
    expect(forbiddenHits("너는 바보야", list)).toEqual([
      { kind: "ko-word", match: "바보" },
    ]);
    // 연락처 꼴은 실행 때 조각을 이어 만든다(시험 소스에 연락처 꼴을 적지 않는다).
    const phone = ["010", "1234", "5678"].join("-");
    expect(forbiddenHits(`Call ${phone}. Where do you live?`, list)).toEqual([
      { kind: "pattern", match: phone, id: "phone", category: "contact" },
      {
        kind: "pattern",
        match: "Where do you live",
        id: "where-live",
        category: "personal-info",
      },
    ]);
    expect(forbiddenHits("I like dogs.", list)).toEqual([]);
    // 하이픈 합성어 · 소유격 · 축약형 토큰 안의 금지어도 걸린다(검토 I-3).
    const stupid = { ...list, words: { en: ["stupid", "shut up"], ko: [] } };
    expect(forbiddenHits("You stupid-head.", stupid)).toEqual([
      { kind: "en-word", match: "stupid" },
    ]);
    expect(forbiddenHits("That stupid's toy.", stupid)).toEqual([
      { kind: "en-word", match: "stupid" },
    ]);
    expect(forbiddenHits("Just shut-up now.", stupid)).toEqual([
      { kind: "en-word", match: "shut up" },
    ]);
    expect(forbiddenHits("A stupidly long day.", stupid)).toEqual([]);
  });

  it("6.4 틀 자리: {NAME} 밖의 틀 자리를 찾고 빈칸은 세지 않는다", () => {
    expect(
      placeholdersIn(`Hi ${PLACEHOLDER_NAME}, I like ___ and {CHILD} {name}.`),
    ).toEqual([PLACEHOLDER_NAME, "{CHILD}", "{name}"]);
    expect(
      placeholdersIn(`Hi ${PLACEHOLDER_NAME}! I like _____.`).filter(
        (p) => p !== PLACEHOLDER_NAME,
      ),
    ).toEqual([]);
    expect(placeholdersIn("I like ___.")).toEqual([]);
  });

  it("글 도구: 한글이 든 문장은 영어 검사에서 뺀다", () => {
    expect(isEnglishSentence("I like apples.")).toBe(true);
    expect(isEnglishSentence("I like 사과.")).toBe(false);
    expect(isEnglishSentence("사과를 좋아해.")).toBe(false);
    expect(isEnglishSentence("ㅎㅎ ok")).toBe(false);
    expect(isEnglishSentence("123 !")).toBe(false);
    const english = splitSentences(
      "Tori likes red balls. 토리는 빨간 공을 좋아해. Momo has a big dog.",
    ).filter(isEnglishSentence);
    expect(english).toEqual(["Tori likes red balls.", "Momo has a big dog."]);
  });
});

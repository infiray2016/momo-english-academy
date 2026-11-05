// 회화 수업 새 꼴(C189) 정리 따라 말하기 · 마무리 둘째 장 '한 번 더 말해 보기'(3.3 정리 문단 · 4절 회화 마무리, 회화 plan 묶음 '5-나'
// 할 것 2 — wrap-up.ts) · 되짚을 말 · 끝인사(C33 — 옛 흐름 시험 conversation-flow 에서 묶음 12 가 옮김).
import { describe, expect, it } from "vitest";
import {
  farewellOf,
  lessonAgainLineOf,
  lessonWrapUpFollowOf,
  type WrapUpLine,
  wrapUpLinesOf,
} from "@/core/conversation/wrap-up";
import { values } from "../fixtures/talk-lesson";

const FEEDBACK_FROM = values["talk.feedback_from_level"] as number;

const lines: WrapUpLine[] = [
  { en: "You play soccer on Sunday.", source: "recast" },
  { en: "Weekends are fun!", ko: "주말은 재미있어!", source: "card" },
];

describe("정리 따라 말하기", () => {
  it("1~3단계는 되짚을 말 전체를 한 번 따라 말한다(문장마다가 아님)", () => {
    // 되풀이 문장에는 뜻이 없으므로 따라 말하기 항목에 뜻을 두지 않는다(영어의 일부만 덮는 뜻 줄을 막음)
    expect(lessonWrapUpFollowOf({ lines, lowBand: true })).toEqual([
      { en: "You play soccer on Sunday. Weekends are fun!" },
    ]);
    const allKo: WrapUpLine[] = [
      { en: "Weekends are fun!", ko: "주말은 재미있어!", source: "card" },
      { en: "See you!", ko: "또 만나!", source: "card" },
    ];
    expect(lessonWrapUpFollowOf({ lines: allKo, lowBand: true })).toEqual([
      { en: "Weekends are fun! See you!", ko: "주말은 재미있어! 또 만나!" },
    ]);
  });

  it("4단계부터 · 되짚을 말이 없으면 따라 말하기가 없다", () => {
    expect(lessonWrapUpFollowOf({ lines, lowBand: false })).toEqual([]);
    expect(lessonWrapUpFollowOf({ lines: [], lowBand: true })).toEqual([]);
  });
});

describe("마무리 둘째 장 '한 번 더 말해 보기'", () => {
  const closing = {
    goodLines: ["Good line."],
    nextTimeLines: ["Next time line."],
  };
  const recasts = ["First recast.", "Last recast."];

  it("AC-15e 1~3단계 마무리는 둘째 장이 없다(정리에서 한 번 따라 말했다)", () => {
    expect(
      lessonAgainLineOf({
        lowBand: true,
        level: 3,
        feedbackFromLevel: FEEDBACK_FROM,
        closing,
        recasts,
      }),
    ).toBeNull();
  });

  it("4단계는 마지막 되풀이 문장, talk.feedback_from_level 부터는 다음엔 이렇게 첫 줄(없으면 잘한 말)", () => {
    expect(
      lessonAgainLineOf({
        lowBand: false,
        level: FEEDBACK_FROM - 1,
        feedbackFromLevel: FEEDBACK_FROM,
        closing,
        recasts,
      }),
    ).toBe("Last recast.");
    expect(
      lessonAgainLineOf({
        lowBand: false,
        level: FEEDBACK_FROM,
        feedbackFromLevel: FEEDBACK_FROM,
        closing,
        recasts,
      }),
    ).toBe("Next time line.");
    expect(
      lessonAgainLineOf({
        lowBand: false,
        level: FEEDBACK_FROM,
        feedbackFromLevel: FEEDBACK_FROM,
        closing: { goodLines: ["Good line."], nextTimeLines: [] },
        recasts,
      }),
    ).toBe("Good line.");
  });
});

describe("회화 정리 · 끝인사(C33)", () => {
  const noLemma = () => undefined;

  it("AC-15n 정리 토막의 되짚을 말은 선생님이 되풀이한 바른 문장 가운데 오늘 쓸 말이 든 것과 카드 정리 대사로 오늘 쓸 말 단어 수까지이고 보일 단어가 없는 수업은 카드 정리 대사다", () => {
    const [w1, w2] = ["soccer", "beach"];
    const closingLines = [
      { en: "Today we talked a lot.", ko: "오늘 이야기 많이 했어." },
      { en: "You did great.", ko: "잘했어." },
    ];
    const lines = wrapUpLinesOf({
      recasts: [`I play ${w1}.`, "Good job.", `It is ${w1}.`, ""],
      todayWords: [w1, w2],
      closingLines,
      koMeaning: true,
      lemmaOf: noLemma,
    });
    expect(lines).toEqual([
      { en: `It is ${w1}.`, source: "recast" },
      { en: closingLines[0]?.en, ko: closingLines[0]?.ko, source: "card" },
    ]);
    // 같은 되풀이 문장은 두 번 쓰지 않는다
    const both = wrapUpLinesOf({
      recasts: [`I like ${w1} and the ${w2}.`],
      todayWords: [w1, w2],
      closingLines,
      koMeaning: false,
      lemmaOf: noLemma,
    });
    expect(both).toEqual([
      { en: `I like ${w1} and the ${w2}.`, source: "recast" },
      { en: closingLines[0]?.en, source: "card" },
    ]);
    // 보일 단어가 없는 수업은 카드 정리 대사 전부
    expect(
      wrapUpLinesOf({
        recasts: [`It is ${w1}.`],
        todayWords: [],
        closingLines,
        koMeaning: true,
        lemmaOf: noLemma,
      }),
    ).toEqual(closingLines.map((l) => ({ ...l, source: "card" })));
  });

  it("회화 정리: 끝인사는 검사를 지난 끝맺음 것이 와 있으면 그것, 아니면 카드 끝인사이고 뜻은 1~4단계만", () => {
    const card = {
      farewell: { en: "See you next time!", ko: "다음에 또 보자!" },
    };
    expect(
      farewellOf({
        closing: { farewell: "Bye, {NAME}!", farewellKo: "안녕!" },
        card,
        koMeaning: true,
      }),
    ).toEqual({ en: "Bye, {NAME}!", ko: "안녕!", source: "closing" });
    expect(farewellOf({ closing: null, card, koMeaning: true })).toEqual({
      en: card.farewell.en,
      ko: card.farewell.ko,
      source: "card",
    });
    expect(
      farewellOf({
        closing: { farewell: "", farewellKo: "" },
        card,
        koMeaning: false,
      }),
    ).toEqual({ en: card.farewell.en, source: "card" });
  });
});

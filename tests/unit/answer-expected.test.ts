// 쓰기 1~3 '정답은 이거예요'에 보일 정답 조각(plan-p11a 값 11 · C77 (2) · C73). 정답은 타일 · 카드 차례 그대로이고,
// 그 조각을 답 조각에 그대로 넣으면 checkAnswer 가 맞음이다(화면이 보인 정답 = 채점 정답).
import { describe, expect, it } from "vitest";
import { checkAnswer } from "@/core/answer/check";
import { displayCardsOf, expectedAnswerOf } from "@/core/answer/expected";
import {
  defaultSettings,
  referenceSet,
  writingLesson,
} from "../fixtures/seed/builders";

const ref = referenceSet(defaultSettings());

describe("쓰기 정답 조각", () => {
  it("쓰기 정답 조각: 고르기는 정답 번호, 글자 타일은 정답 낱말 글자, 빈 글자 채우기는 빈 자리 글자, 카드는 첫 글자 대문자 낱말과 마침표 카드다", () => {
    expect(
      expectedAnswerOf({
        type: "pick-word",
        picture: "dog",
        options: ["cat", "dog"],
        answerNo: 2,
        accepted: ["dog"],
      }),
    ).toEqual({ kind: "choice", no: 2 });
    expect(
      expectedAnswerOf({
        type: "copy-tiles",
        word: "ball",
        tiles: ["l", "b", "a", "l"],
        accepted: ["ball"],
      }),
    ).toEqual({ kind: "tiles", pieces: ["b", "a", "l", "l"] });
    expect(
      expectedAnswerOf({
        type: "fill-letters",
        word: "ball",
        pattern: "b_ll",
        tiles: ["a", "e"],
        accepted: ["ball"],
      }),
    ).toEqual({ kind: "tiles", pieces: ["a"] });
    expect(
      expectedAnswerOf({
        type: "assemble-sentence",
        cards: ["dogs", "i", "like", "."],
        accepted: ["I like dogs."],
      }),
    ).toEqual({ kind: "tiles", pieces: ["I", "like", "dogs", "."] });
    expect(
      expectedAnswerOf({
        type: "dictation",
        word: "cup",
        audioText: "cup",
        accepted: ["cup"],
      }),
    ).toEqual({ kind: "text", text: "cup" });
  });

  it("쓰기 정답 조각: 견본 빌더 1 · 3단계 문항의 정답 조각은 모두 checkAnswer 가 맞음이다", () => {
    for (const level of [1, 3] as const) {
      const content = writingLesson(ref, level).lesson.content;
      if (content.shape !== "items") throw new Error("견본 꼴");
      for (const item of content.items) {
        const answer = expectedAnswerOf(item);
        expect(
          checkAnswer(item, answer, { homophones: [] }).correct,
          `${level}단계 ${item.type}`,
        ).toBe(true);
      }
    }
  });

  it("쓰기 카드 표시: 문장 가운데 대문자 낱말(고유 명사 · I) 카드는 정답 꼴로 보이고 첫 카드는 소문자 그대로라 화면에서 낼 수 있는 답으로 모든 견본 문항을 맞힐 수 있다", () => {
    const item = {
      type: "assemble-sentence" as const,
      cards: ["momo", "with", "kububa", "they", "."],
      accepted: ["They kububa with Momo."],
    };
    // 첫 낱말(They)은 아이가 대문자 단추로 바꾼다 — 카드는 소문자 그대로(C73)
    expect(displayCardsOf(item)).toEqual([
      "Momo",
      "with",
      "kububa",
      "they",
      ".",
    ]);
    expect(
      displayCardsOf({
        type: "assemble-sentence",
        cards: ["go", "i", "can", "?"],
        accepted: ["Can I go?"],
      }),
    ).toEqual(["go", "I", "can", "?"]);
    // 화면이 낼 수 있는 답(보인 카드를 차례대로, 첫 카드만 대문자 단추)으로 견본 3단계 문항 전부 맞음
    const content = writingLesson(ref, 3).lesson.content;
    if (content.shape !== "items") throw new Error("견본 꼴");
    for (const each of content.items) {
      if (!("cards" in each)) continue;
      const shown = displayCardsOf(each);
      const want = expectedAnswerOf(each);
      if (want.kind !== "tiles") throw new Error("카드 정답 꼴");
      const pieces = want.pieces.map((token, i) => {
        const card = shown.find((c) =>
          i === 0 ? c === token.toLowerCase() : c === token,
        );
        if (card === undefined) throw new Error(`보인 카드에 없음: ${token}`);
        return i === 0 ? card.charAt(0).toUpperCase() + card.slice(1) : card;
      });
      expect(
        checkAnswer(each, { kind: "tiles", pieces }, { homophones: [] })
          .correct,
        each.accepted[0],
      ).toBe(true);
    }
  });
});

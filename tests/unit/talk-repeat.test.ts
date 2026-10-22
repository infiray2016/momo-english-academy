// 한 턴에 같은 말 두 번 안 읽기(13절 C125 (3) · 컨트롤러 판정 2026-10-23 04:3x): 1단계 답 두 개 줄(①②)은 늘 남기고, 겹치면 빠지는
// 쪽은 앱이 붙이는 답 예시 · 질문 줄과 토리 말 가운데 답 두 개 어느 하나가 든 문장이다. 대소문자 · 문장부호 · 띄어쓰기를 정규화해
// 견준다. 읽고 보이는 글만 줄이고 저장 글은 그대로다(턴 길이 맡음). 순수 함수만 본다.
import { describe, expect, it } from "vitest";
import { twoAnswersLine } from "@/core/ai/calls/talk";
import {
  type AppendLine,
  normalizeSpoken,
  sayingAnswer,
  shownTurnOf,
} from "@/core/conversation/flow";
import { splitSentences } from "@/core/seed/text";

const example: AppendLine = { kind: "answer_example", en: "I'm good." };
const question: AppendLine = {
  kind: "question",
  en: "How are you today?",
  ko: "오늘 기분 어때?",
};
const two: AppendLine = {
  kind: "two_answers",
  answers: ["I'm good.", "I'm fine."],
};

/** 그 턴에 읽힐 문장 수(토리 말 + 붙인 말 — 답 두 개는 읽는 한 줄 'I'm good. Or I'm fine.' 그대로 나눔). */
function sentencesOf(shown: {
  sentences: readonly string[];
  append: readonly AppendLine[];
}) {
  return [
    ...shown.sentences,
    ...shown.append.map((l) =>
      l.kind === "two_answers" ? twoAnswersLine(l.answers) : l.en,
    ),
  ].flatMap(splitSentences).length;
}

describe("한 턴에 같은 말 두 번 안 읽기(C125 (3))", () => {
  it("같은 말: 대소문자 · 문장부호 · 띄어쓰기 · 따옴표가 달라도 같은 문장으로 본다", () => {
    expect(normalizeSpoken("  I'm   GOOD!! ")).toBe(
      normalizeSpoken("i’m good."),
    );
    expect(normalizeSpoken("How are you, today?")).toBe(
      normalizeSpoken("how are you today"),
    );
    expect(normalizeSpoken("I'm good.")).not.toBe(normalizeSpoken("I'm fine."));
  });

  it("같은 말: 토리 말에 답 예시가 들어 있으면 앱이 답 예시를 붙이지 않는다", () => {
    expect(
      shownTurnOf(
        ["That's okay!", "You can say, i'm good!"],
        [example, question],
      ).append,
    ).toEqual([question]);
  });

  it("같은 말: 토리 말에 같은 질문이 있으면 앱이 질문을 붙이지 않는다", () => {
    expect(
      shownTurnOf(["Let's try again.", "How are you TODAY"], [question]).append,
    ).toEqual([]);
    // 다른 질문은 그대로 붙인다
    expect(shownTurnOf(["What do you like?"], [question]).append).toEqual([
      question,
    ]);
  });

  it("같은 말: 답 두 개 줄은 늘 남고, 답 두 개와 같은 답 예시 줄이 빠진다", () => {
    expect(shownTurnOf(["That's okay!"], [example, question, two])).toEqual({
      sentences: ["That's okay!"],
      append: [question, two],
    });
  });

  it("같은 말: 답 두 개 어느 하나가 든 토리 문장은 읽고 보이는 글에서 빠진다", () => {
    expect(
      shownTurnOf(
        ["That's okay!", "You can say, I'm fine."],
        [example, question, two],
      ),
    ).toEqual({ sentences: ["That's okay!"], append: [question, two] });
    expect(sayingAnswer("You can say, I'm fine.", [two.answers])).toBe(true);
    expect(sayingAnswer("That's okay!", [two.answers])).toBe(false);
  });

  it("같은 말: 겹치지 않으면 그대로 둔다(처음 묻는 턴의 질문 · 답 두 개)", () => {
    expect(shownTurnOf(["Nice!"], [question, two])).toEqual({
      sentences: ["Nice!"],
      append: [question, two],
    });
    expect(shownTurnOf(["Nice!"], [])).toEqual({
      sentences: ["Nice!"],
      append: [],
    });
  });

  it("같은 말: 처음 묻는 턴이 아닌 '모름'(답 두 개 없음)은 답 예시와 같은 질문을 그대로 붙인다", () => {
    const shown = shownTurnOf(["That's okay!"], [example, question]);
    expect(shown).toEqual({
      sentences: ["That's okay!"],
      append: [example, question],
    });
    expect(sentencesOf(shown)).toBe(3);
  });

  it("같은 말: 짧은 답(Yes. · No.)이 낱말 하나로 겹치는 토리 반응은 같은 말이 아니라 남는다(검토 rev-p13b I-1 (a))", () => {
    const yesNo: AppendLine = { kind: "two_answers", answers: ["Yes.", "No."] };
    expect(
      shownTurnOf(["Yes, that's right!", "No problem."], [question, yesNo])
        .sentences,
    ).toEqual(["Yes, that's right!", "No problem."]);
    expect(sayingAnswer("Yes, that's right!", [yesNo.answers])).toBe(false);
  });

  it("같은 말: 1~3단계 실패 길의 칭찬 대사는 다음 질문 답과 겹쳐도 빼지 않는다(I-1 (b))", () => {
    const praise: AppendLine = { kind: "praise", en: "Good!" };
    const pair: AppendLine = {
      kind: "two_answers",
      answers: ["It is good.", "It is bad."],
    };
    expect(shownTurnOf([], [praise, question, pair]).append).toEqual([
      praise,
      question,
      pair,
    ]);
    // 칭찬 대사는 토리 말과 똑같아도 토리 반응 자리라 남는다
    expect(shownTurnOf(["Good!"], [praise]).append).toEqual([praise]);
  });

  it("같은 말: 세 낱말 답 안에 든 짧은 반응(Yes!)은 남는다(I-1 (c))", () => {
    const pair: AppendLine = {
      kind: "two_answers",
      answers: ["Yes, I do.", "No, I don't."],
    };
    expect(shownTurnOf(["Yes!"], [question, pair]).sentences).toEqual(["Yes!"]);
  });

  it("같은 말: 반응이 짧은 답과 정규화해 똑같은 한 문장이면 빠진다(I-1 (d))", () => {
    const yesNo: AppendLine = { kind: "two_answers", answers: ["Yes.", "No."] };
    expect(
      shownTurnOf(["yes!", "Great."], [question, yesNo]).sentences,
    ).toEqual(["Great."]);
    expect(sayingAnswer("YES", [yesNo.answers])).toBe(true);
  });

  it("같은 말: 1단계 처음 묻는 턴의 '모름'은 견본 대화에서 4문장 이하다", () => {
    // 고치기 전: 토리 말(답 예시 포함) + 답 예시 + 같은 질문 + 답 두 개 = 6문장
    const ai = ["That's okay!", "You can say, I'm good."];
    expect(
      sentencesOf({ sentences: ai, append: [example, question, two] }),
    ).toBe(6);
    expect(
      sentencesOf(shownTurnOf(ai, [example, question, two])),
    ).toBeLessThanOrEqual(4);
    // 토리 말에 답 예시가 없어도 4문장 이하
    expect(
      sentencesOf(shownTurnOf(["That's okay!"], [example, question, two])),
    ).toBeLessThanOrEqual(4);
  });
});

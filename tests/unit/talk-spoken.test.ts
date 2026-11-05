// 같은 말 견주기 · 겹침 없애기 모듈(spoken.ts — 회화 plan 묶음 '5-나' 할 것 1 에서 flow.ts 로부터 동작 그대로 옮김, flow.ts 는 묶음 12 가 지움)의
// 값 표본. 같은 말 · 겹침 없애기의 자세한 시험은 talk-repeat 이 본다.
import { describe, expect, it } from "vitest";
import * as spoken from "@/core/conversation/spoken";

describe("spoken.ts 값 표본", () => {
  it("값 표본: 같은 말 꼴 · 마무리 물음 · 답 담음 · 겹침 없애기 · 뜻 줄", () => {
    expect(spoken.normalizeSpoken("I'm fine!")).toBe(
      spoken.normalizeSpoken("I am fine"),
    );
    expect(spoken.MORE_PROMPT).toEqual({
      en: "Do you want to talk more?",
      ko: "더 이야기할래?",
    });
    expect(
      spoken.sayingAnswer("You can say, I'm nine.", [
        ["I'm nine.", "I'm ten."],
      ]),
    ).toBe(true);
    expect(spoken.sayingAnswer("Yes, that's right!", [["Yes.", "No."]])).toBe(
      false,
    );
    const shown = spoken.shownTurnOf(
      ["Great!", "I'm nine."],
      [
        { kind: "two_answers", answers: ["I'm nine.", "I'm ten."] },
        { kind: "question", en: "How old are you?" },
      ],
    );
    expect(shown.sentences).toEqual(["Great!"]);
    expect(shown.append).toHaveLength(2);
    expect(
      spoken.toriKoShownOf({
        ko: "좋아!",
        sent: ["Great!", "I'm nine."],
        shown: ["Great!"],
        lowBand: true,
      }),
    ).toBeNull();
  });
});

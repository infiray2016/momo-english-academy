// 흘려 받는 동안 잡아 둘 토리 문장(13절 C125 (3) · C127): 막힘 판단(stuck)을 tori_en 앞 칸에서 먼저 읽어 잡아 둘 짝을 정한다 — '모름'
// 입력이거나 stuck 참이면 지금 질문(다시 묻는 자리)의 답 두 개, 아니면 다음 질문의 답 두 개. 가짜 흐름은 흘려 받기(createToriEnReader)에
// JSON 조각을 넣고 턴 길과 같은 차례로 잡기를 부른다. 순수 함수만 본다.
import { describe, expect, it } from "vitest";
import {
  type AppendLine,
  createAnswerHold,
  shownTurnOf,
} from "@/core/conversation/flow";
import { createToriEnReader } from "@/core/conversation/stream";

const NOW: readonly [string, string] = ["I'm good.", "I'm fine."];
const NEXT: readonly [string, string] = ["I see a cat.", "I see a dog."];

/** 턴 길과 같은 차례: 조각마다 stuck 을 먼저 알리고 문장마다 보냄 · 잡음을 가른다. */
function flow(
  json: string,
  hold: ReturnType<typeof createAnswerHold>,
  size = 3,
) {
  const reader = createToriEnReader();
  const sent: string[] = [];
  const held: string[] = [];
  let told = false;
  for (let i = 0; i < json.length; i += size) {
    const fresh = reader.push(json.slice(i, i + size));
    const stuck = reader.stuck();
    if (stuck !== undefined && !told) {
      told = true;
      hold.stuck(stuck);
    }
    for (const s of fresh) (hold.hold(s) ? held : sent).push(s);
  }
  for (const s of reader.finish()) (hold.hold(s) ? held : sent).push(s);
  return { sent, held };
}

const body = (stuck: boolean, tori: string) =>
  `{"stuck":${stuck},"tori_en":${JSON.stringify(tori)},"tori_ko":""}`;

describe("잡아 둘 토리 문장(C127)", () => {
  it("잡아 둠: stuck 거짓이면 지금 답과 겹치는 바른 말 되풀이 'I'm good too!' 도 첫 문장으로 곧바로 나간다", () => {
    const hold = createAnswerHold({
      dontKnow: false,
      samePair: NOW,
      nextPair: NEXT,
    });
    const { sent, held } = flow(body(false, "I'm good too! Let's talk."), hold);
    expect(sent).toEqual(["I'm good too!", "Let's talk."]);
    expect(held).toEqual([]);
  });

  it("잡아 둠: stuck 참이면 지금 질문의 답이 든 'You can say, I'm good.' 이 잡히고 보이는 글에서 빠진다", () => {
    const hold = createAnswerHold({
      dontKnow: false,
      samePair: NOW,
      nextPair: NEXT,
    });
    const { sent, held } = flow(
      body(true, "That's okay! You can say, I'm good."),
      hold,
    );
    expect(sent).toEqual(["That's okay!"]);
    expect(held).toEqual(["You can say, I'm good."]);
    const append: AppendLine[] = [
      { kind: "question", en: "How are you today?" },
      { kind: "two_answers", answers: [...NOW] },
    ];
    expect(shownTurnOf([...sent, ...held], append).sentences).toEqual([
      "That's okay!",
    ]);
  });

  it("잡아 둠: '모름' 입력은 stuck 칸을 읽기 전부터 지금 질문의 답으로 잡는다", () => {
    const hold = createAnswerHold({
      dontKnow: true,
      samePair: NOW,
      nextPair: NEXT,
    });
    // stuck 칸이 오기 전(옛 차례로 tori_en 이 먼저 와도) 잡는다
    expect(hold.hold("You can say, I'm good.")).toBe(true);
    // 한 번 잡으면 그 뒤 문장도 차례를 지키려고 잡는다
    expect(hold.hold("Let's try.")).toBe(true);
    // stuck 거짓이 와도 '모름' 입력은 지금 질문 짝 그대로
    const other = createAnswerHold({
      dontKnow: true,
      samePair: NOW,
      nextPair: NEXT,
    });
    other.stuck(false);
    expect(other.hold("I'm good, you can say.")).toBe(true);
  });

  it("잡아 둠: 다음 질문의 답과 겹치는 문장은 stuck 거짓일 때 잡는다(처음 묻는 턴 — 답 두 개가 붙음)", () => {
    const hold = createAnswerHold({
      dontKnow: false,
      samePair: NOW,
      nextPair: NEXT,
    });
    const { sent, held } = flow(body(false, "Great! I see a cat, too."), hold);
    expect(sent).toEqual(["Great!"]);
    expect(held).toEqual(["I see a cat, too."]);
  });

  it("잡아 둠: 답 두 개를 붙이지 않을 자리(짝 없음)면 아무것도 잡지 않는다", () => {
    const hold = createAnswerHold({ dontKnow: false });
    const { sent, held } = flow(body(true, "I'm good too! Nice."), hold);
    expect(sent).toEqual(["I'm good too!", "Nice."]);
    expect(held).toEqual([]);
  });
});

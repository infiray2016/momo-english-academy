// 새 꼴 회화 끝 줄 · 화면 자료의 칸 더하기(회화 plan 보정 11-05 (13) · 묶음 11 fix 1 — 검토 I-2 · I-3 · M-2 · M-6): 같은 질문 자리의 막힘 수
// (stuckInSlot — 둘째 막힘부터 힌트 다 열기), 1~3단계 그림 턴의 그림 키(imageKey — C32 · 03절 96줄), 그 차례 선생님 행 번호(turnNo).
import { describe, expect, it } from "vitest";
import { talkLessonPositionOf } from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import { lessonRetryTurnOf, positionViewOf } from "@/server/conversation";
import {
  lessonImageKeyOf,
  lessonNextOf,
} from "@/server/conversation/lesson-turn";
import {
  button,
  CARD3,
  LOW,
  NEW3,
  opening3,
  SPEC3,
  teacher,
} from "../fixtures/talk-lesson";

const withHints = <T extends object>(i: T) => ({
  ...i,
  hintKo: "주말에 하는 것",
  hints: ["I ___ on the weekend.", "I play on the weekend."],
});
const card = {
  ...CARD3,
  required: CARD3.required.map((i) =>
    withHints(i.no === 1 ? { ...i, imageKey: "beach" } : i),
  ),
  more: CARD3.more.map(withHints),
};
const spec = {
  ...SPEC3,
  turnImages: true,
  hintTiers: ["ko", "frame", "sentence"],
  usablePhrases: 0,
  koExplainFromStuck: 1,
};

/** 대화 첫 질문(필수 1) 뒤 '잘 모르겠어요' 한 번 → 같이 말하기(받침 첫째) 선생님 행. */
function stuckOnce(): TalkLessonTurn[] {
  return [
    ...opening3(),
    button({ targets: ["play"] }),
    teacher("That's okay! Let's say it together.", {
      kind: "card_slot",
      why: "support",
      item: { kind: "required", no: 1 },
      words: ["play"],
      stage: 1,
      cause: "button",
    }),
  ];
}

function stateOf(turns: TalkLessonTurn[], imageSpec = spec) {
  const position = talkLessonPositionOf({
    spec: SPEC3,
    card,
    newWords: NEW3,
    turns,
    segment: "talk",
    settings: LOW,
    prepWords: ["play", "soccer", "sunday"],
  });
  return {
    spec: imageSpec,
    card,
    turns,
    liveRows: [
      { speaker: "tori", turnNo: 4, aiQuestion: null },
      { speaker: "child", turnNo: 4, aiQuestion: null },
      { speaker: "tori", turnNo: 5, aiQuestion: null },
    ],
    segment: "talk",
    position,
    session: { status: "in_progress" },
  } as unknown as Parameters<typeof lessonNextOf>[0];
}

describe("끝 줄 · 화면 자료 칸 더하기(묶음 11 fix 1)", () => {
  it("AC-15p 끝 줄 stuckInSlot: 같은 질문 자리의 이어진 막힘 수를 그대로 싣는다(첫 막힘 뒤 1 — 둘째 막힘부터 힌트 다 열기의 서버 몫)", () => {
    const state = stateOf(stuckOnce());
    const next = lessonNextOf(state);
    expect(next.stuckInSlot).toBe(1);
    expect(next.stuckInSlot).toBe(state.position.stuckInSlot);
    // 막힘이 없는 자리는 0
    expect(lessonNextOf(stateOf(opening3())).stuckInSlot).toBe(0);
  });

  it("끝 줄 turnNo: 그 차례 선생님 행 번호(마지막 선생님 행)를 싣는다 — 화면이 다음 행 번호를 어림하지 않게(검토 M-2)", () => {
    expect(lessonNextOf(stateOf(stuckOnce())).turnNo).toBe(5);
  });

  it("C32 그림 턴: 1~3단계(단계 규격 turnImages)이고 지금 질문 자리의 카드 항목에 그림 키가 있으면 끝 줄 imageKey 로 싣고, 아니면 없다", () => {
    expect(lessonNextOf(stateOf(stuckOnce())).imageKey).toBe("beach");
    expect(
      lessonNextOf(stateOf(stuckOnce(), { ...spec, turnImages: false }))
        .imageKey,
    ).toBeUndefined();
    expect(
      lessonImageKeyOf({ spec, card }, { kind: "required", no: 2 }),
    ).toBeUndefined();
    expect(lessonImageKeyOf({ spec, card }, { kind: "required", no: 1 })).toBe(
      "beach",
    );
    expect(lessonImageKeyOf({ spec, card }, { kind: "none", no: 0 })).toBe(
      undefined,
    );
    expect(lessonImageKeyOf({ spec, card }, null)).toBeUndefined();
  });

  it("AC-15p 화면 자료 position 에 stuckInSlot 이 든다(이어 열어도 둘째 막힘부터 힌트 다 열기가 이어진다)", () => {
    const pos = stateOf(stuckOnce()).position;
    expect(positionViewOf(pos).stuckInSlot).toBe(1);
  });
});

describe("끊긴 아이 행 다시 보내기(묶음 11 fix 2 — 재검토 N-3)", () => {
  const orphan = (over: Record<string, unknown>) =>
    ({
      speaker: "child",
      segment: "talk",
      clientAttemptId: "attempt-1",
      inputMode: "dont_know",
      text: null,
      clientListen: null,
      stuckPhrase: null,
      targetWords: [],
      ...over,
    }) as unknown as Parameters<typeof lessonRetryTurnOf>[0];

  it("AC-15s 들리지 않음으로 끊긴 행은 nospeech 를 실어 다시 보낸다(기록은 회색 '못 들었어요' — 03절 94 · 100줄), 단추 '모름' · 말은 싣지 않는다", () => {
    expect(
      lessonRetryTurnOf(orphan({ clientListen: { src: "nospeech" } })),
    ).toEqual({
      clientAttemptId: "attempt-1",
      mode: "dont_know",
      text: null,
      nospeech: true,
    });
    expect(
      lessonRetryTurnOf(orphan({ clientListen: { src: "button" } })),
    ).toEqual({ clientAttemptId: "attempt-1", mode: "dont_know", text: null });
    expect(
      lessonRetryTurnOf(orphan({ inputMode: "speech", text: "I like it." })),
    ).toEqual({
      clientAttemptId: "attempt-1",
      mode: "speech",
      text: "I like it.",
    });
    expect(lessonRetryTurnOf(orphan({ clientAttemptId: null }))).toBeNull();
    expect(lessonRetryTurnOf(null)).toBeNull();
  });
});

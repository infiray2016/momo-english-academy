// 새 꼴 회화 끝 줄 · 화면 자료의 칸 더하기(회화 plan 보정 11-05 (13) · 묶음 11 fix 1 — 검토 I-2 · I-3 · M-2 · M-6): 같은 질문 자리의 막힘 수
// (stuckInSlot — 둘째 막힘부터 힌트 다 열기), 1~3단계 그림 턴의 그림 키(imageKey — C32 · 03절 96줄), 그 차례 선생님 행 번호(turnNo).
import { describe, expect, it } from "vitest";
import {
  isKoHelpAnswered,
  type KoHelpRowFacts,
  koAskTurnOpenOf,
  koHelpEarlierOf,
  koHelpReplayOf,
  koHelpTurnNosOf,
  koHelpViewsOf,
  nextKoHelpSeqOf,
} from "@/core/conversation/ko-help";
import { talkLessonPositionOf } from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import { talkMoveOf } from "@/core/conversation/move";
import {
  lessonKoHelpsOf,
  lessonRetryTurnOf,
  positionViewOf,
  TALK_NOTICE_KINDS,
} from "@/server/conversation";
import {
  lessonImageKeyOf,
  lessonNextOf,
} from "@/server/conversation/lesson-turn";
import { koHelpTurnRowOf } from "@/server/conversation/state";
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

// ── 수업 안 한국어로 묻기 묶음 4-나: 화면 자료의 한국어 도움 · 안내 열쇠 · 읽을 턴 번호(접점 라, [N-1]) ──

const tori = (turnNo: number, move: unknown = null) =>
  ({ speaker: "tori", turnNo, askAgain: null, move }) as const;
const kid = (turnNo: number, askAgain: boolean | null = null) =>
  ({ speaker: "child", turnNo, askAgain, move: null }) as const;
const helpRow = (over: Partial<KoHelpRowFacts> = {}): KoHelpRowFacts => ({
  turnNo: 5,
  seq: 1,
  question: "조개는 영어로 뭐야?",
  kind: "expression",
  sayKo: "이렇게 말하면 돼.",
  teachEn: "I found a shell.",
  textShown: false,
  fallback: "none",
  ...over,
});

describe("한국어 도움 — 읽을 턴 번호(koHelpTurnNosOf, [N-1])", () => {
  const T = (turnNo: number, askAgain?: boolean) =>
    ({
      speaker: "teacher",
      turnNo,
      ...(askAgain ? { askAgain } : {}),
    }) as const;
  const C = (turnNo: number, askAgain?: boolean) =>
    ({ speaker: "child", turnNo, ...(askAgain ? { askAgain } : {}) }) as const;

  it("한국어 도움 턴 번호: 마지막 행이 선생님 행이면 그 턴 번호, 아이 차례가 열려 있지 않으면(행 없음 · 마지막이 아이 행) 빈 목록", () => {
    expect(koHelpTurnNosOf([])).toEqual([]);
    expect(koHelpTurnNosOf([T(1), C(1)])).toEqual([]);
    expect(koHelpTurnNosOf([T(1), C(1), T(2)])).toEqual([2]);
  });

  it("한국어 도움 턴 번호: 되물은 아이 차례(아이 행 표지 또는 뒤 선생님 행이 되묻는 차례)를 건너 그 턴 번호도 읽는다 — 되묻기가 이어지면 계속 거슬러 간다", () => {
    expect(koHelpTurnNosOf([T(1), C(1), T(2), C(2, true), T(3)])).toEqual([
      2, 3,
    ]);
    expect(koHelpTurnNosOf([T(1), C(1), T(2), C(2), T(3, true)])).toEqual([
      2, 3,
    ]);
    expect(
      koHelpTurnNosOf([T(1), C(1), T(2), C(2, true), T(3), C(3, true), T(4)]),
    ).toEqual([2, 3, 4]);
  });

  it("한국어 도움 턴 번호: talk_turns 행의 되물음 표지 · move 까닭 ask_again · 새 엔진 move.lead.move ask_again 을 읽는다", () => {
    expect(koHelpTurnRowOf(kid(2, true) as never)).toEqual({
      speaker: "child",
      turnNo: 2,
      askAgain: true,
    });
    expect(koHelpTurnRowOf(kid(2) as never).askAgain).toBe(false);
    expect(
      koHelpTurnRowOf(
        tori(3, talkMoveOf({ kind: "card_slot", why: "ask_again" })) as never,
      ).askAgain,
    ).toBe(true);
    expect(koHelpTurnRowOf(tori(3) as never).askAgain).toBe(false);
  });

  it("한국어 도움 턴 번호: Claude 주도 방식 선생님 행은 move.lead.move 가 ask_again 일 때만 되묻는 차례다(move 까닭은 비어 있다 — 검토 rev-b4b M-3)", () => {
    const leadMove = (move: "ask_again" | "model_repeat") =>
      talkMoveOf({
        kind: "ai",
        lead: { reading: "clear_answer", move, asked: [], said: [] },
      });
    expect(leadMove("ask_again").why).toBeNull();
    expect(koHelpTurnRowOf(tori(3, leadMove("ask_again")) as never)).toEqual({
      speaker: "teacher",
      turnNo: 3,
      askAgain: true,
    });
    expect(
      koHelpTurnRowOf(tori(3, leadMove("model_repeat")) as never).askAgain,
    ).toBe(false);
  });
});

describe("한국어 도움 — 받을 차례 · 순번 · 앞 대화 · 답의 소리", () => {
  const open = {
    segment: "talk",
    orphan: false,
    closed: false,
    lastRowTeacher: true,
    firstQuestionDue: false,
    prepPending: false,
    choice: null,
  } as const;

  it("한국어 질문 받을 차례: 인사 · 대화 · 더 이야기하기 토막의 열린 아이 차례만이고 마무리 물음 · 마무리 제안 턴은 아니다", () => {
    expect(koAskTurnOpenOf(open)).toBe(true);
    for (const segment of ["greeting", "more_talk"])
      expect(koAskTurnOpenOf({ ...open, segment })).toBe(true);
    expect(koAskTurnOpenOf({ ...open, segment: "wrap_up" })).toBe(false);
    expect(koAskTurnOpenOf({ ...open, choice: "closing" })).toBe(false);
    expect(koAskTurnOpenOf({ ...open, choice: "suggestion" })).toBe(false);
    expect(koAskTurnOpenOf({ ...open, orphan: true })).toBe(false);
    expect(koAskTurnOpenOf({ ...open, lastRowTeacher: false })).toBe(false);
    expect(koAskTurnOpenOf({ ...open, closed: true })).toBe(false);
    expect(koAskTurnOpenOf({ ...open, firstQuestionDue: true })).toBe(false);
    expect(koAskTurnOpenOf({ ...open, prepPending: true })).toBe(false);
  });

  it("한국어 도움 순번: 같은 턴 번호의 가장 큰 순번 + 1(다른 턴의 행은 세지 않는다)", () => {
    expect(nextKoHelpSeqOf([], 5)).toBe(1);
    expect(
      nextKoHelpSeqOf(
        [
          { turnNo: 5, seq: 1 },
          { turnNo: 5, seq: 2 },
          { turnNo: 3, seq: 4 },
        ],
        5,
      ),
    ).toBe(3);
  });

  it("한국어 도움 앞 대화: 글 있는 줄만 오래된 것부터 talk.ko_ask_context_turns 줄까지, 0 이면 넣지 않는다", () => {
    const rows = [
      { who: "teacher" as const, text: "Hi {NAME}!" },
      { who: "child" as const, text: "Hi." },
      { who: "teacher" as const, text: "What  did you do?" },
      { who: "child" as const, text: null },
    ];
    expect(koHelpEarlierOf(rows, 2)).toEqual([
      { who: "child", text: "Hi." },
      { who: "teacher", text: "What did you do?" },
    ]);
    expect(koHelpEarlierOf(rows, 0)).toEqual([]);
  });

  it("한국어 도움 답의 소리: 가르친 표현이 있으면 taught, 없으면 선생님의 지금 말 다시 읽기", () => {
    expect(koHelpReplayOf("I found a shell.")).toBe("taught");
    expect(koHelpReplayOf("")).toBe("teacher_line");
    expect(koHelpReplayOf(null)).toBe("teacher_line");
  });
});

describe("화면 자료 koHelps · 안내 열쇠(접점 라)", () => {
  it("AC-25i 화면 자료 koHelps: 턴 번호 · 순번 차례이고 지금 열린 아이 차례가 읽는 도움만 open 이다", () => {
    const views = koHelpViewsOf(
      [helpRow({ turnNo: 5, seq: 2 }), helpRow({ turnNo: 3 }), helpRow()],
      { openTurnNos: [5], lowBand: false },
    );
    expect(views.map((v) => [v.turnNo, v.seq, v.open])).toEqual([
      [3, 1, false],
      [5, 1, true],
      [5, 2, true],
    ]);
    // 4단계부터는 가르친 표현을 글로 보였으므로 지난 도움에도 싣는다
    expect(views[0]?.teachEn).toBe("I found a shell.");
  });

  it("AC-25i 화면 자료 koHelps: 1~3단계는 open 이 거짓인 항목의 가르친 표현 글을 내리지 않는다(T2), 답의 소리 고르기는 그대로다", () => {
    const [past, now] = koHelpViewsOf([helpRow({ turnNo: 3 }), helpRow()], {
      openTurnNos: [5],
      lowBand: true,
    });
    expect(past).not.toHaveProperty("teachEn");
    expect(past?.replay).toBe("taught");
    expect(now?.teachEn).toBe("I found a shell.");
  });

  it("AC-25i 화면 자료 koHelps: 답이 아직 없는 행(호출 중에 끊김)은 물은 말만 싣는다", () => {
    const [view] = koHelpViewsOf(
      [
        helpRow({
          kind: null,
          sayKo: null,
          teachEn: null,
          textShown: null,
          fallback: null,
        }),
      ],
      { openTurnNos: [5], lowBand: true },
    );
    expect(view).toEqual({
      turnNo: 5,
      seq: 1,
      question: "조개는 영어로 뭐야?",
      kind: null,
      sayKo: null,
      textShown: false,
      fallback: null,
      replay: "teacher_line",
      open: true,
    });
  });

  it("한국어 도움 꼴: 답이 있는 도움은 sayKo · fallback 이 늘 있고, 답이 아직 없는 도움은 물은 말만 있다 — isKoHelpAnswered 로 가른다(검토 rev-b4b 4절 우려 2 의 5)", () => {
    const [answered, failed, pending] = koHelpViewsOf(
      [
        helpRow({ seq: 1 }),
        helpRow({
          seq: 2,
          kind: null,
          sayKo: "한 번 더 물어봐 줄래?",
          teachEn: null,
          fallback: "call_failed",
        }),
        helpRow({
          seq: 3,
          kind: null,
          sayKo: null,
          teachEn: null,
          textShown: null,
          fallback: null,
        }),
      ],
      { openTurnNos: [5], lowBand: true },
    );
    if (!answered || !failed || !pending) throw new Error("항목 셋이 없다");
    expect(isKoHelpAnswered(answered)).toBe(true);
    expect(isKoHelpAnswered(failed)).toBe(true);
    expect(failed).toMatchObject({ kind: null, fallback: "call_failed" });
    expect(isKoHelpAnswered(pending)).toBe(false);
    // 답이 있는 꼴로 좁히면 sayKo 는 글이다(형이 드러낸다)
    if (isKoHelpAnswered(answered)) {
      const say: string = answered.sayKo;
      expect(say).toBe("이렇게 말하면 돼.");
    }
    // 답 칸 가운데 하나라도 비면(쓰는 길에서는 생기지 않음) 답이 아직 없는 꼴로 읽는다 — 아이가 본 것이 없다
    const [half] = koHelpViewsOf([helpRow({ fallback: null })], {
      openTurnNos: [5],
      lowBand: false,
    });
    expect(half).toMatchObject({ sayKo: null, fallback: null, kind: null });
    expect(half).not.toHaveProperty("teachEn");
  });

  it("AC-25i 화면 자료 koHelps(서버): 살아 있는 talk_turns 행으로 되묻는 차례를 건너 open 을 정한다", () => {
    const state = {
      liveRows: [tori(1), kid(1), tori(2), kid(2, true), tori(3)],
      spec: { band: "1-3" },
    } as unknown as Parameters<typeof lessonKoHelpsOf>[0];
    const views = lessonKoHelpsOf(state, [
      helpRow({ turnNo: 1 }),
      helpRow({ turnNo: 2 }),
      helpRow({ turnNo: 3 }),
    ] as never);
    expect(views.map((v) => [v.turnNo, v.open, "teachEn" in v])).toEqual([
      [1, false, false],
      [2, true, true],
      [3, true, true],
    ]);
  });

  it("한국어 질문 첫 안내 열쇠 talk_ko_ask_tip 이 한 번 안내 열쇠 목록(profiles.notices_seen)에 있다", () => {
    expect(TALK_NOTICE_KINDS).toContain("talk_ko_ask_tip");
  });
});

// 이야기 방식 화면(회화 대화 구조 R plan 묶음 W — spec 설계 6 · 7 · 11, 13절 C243 보완 4 (4) · (9) · (11)). 화면에서 갈라낸 판단만 본다:
// 끝 줄 신호 읽기 · 힌트 응답 읽기 · 설명 응답 읽기 · 인식기 칸(talk-stream), 힌트 단의 상태와 연 단 수(child-turn), 차례 열쇠 · 열림 사건 ·
// 보낼지 · 실패한 조용함 요청의 갈래(talk-frame). 실제 타이머 · 누름 · 넘김은 브라우저 점검 장면(tests/browser-check/scenes/chat-*.mjs)의 몫이다.
// 시계는 시험이 정한 수(ms)이고, 기다림 시간 · 설명 기다림 · 후보 수는 끝 줄의 값으로 넘긴다(화면 코드에 고정한 값이 없음을 다른 값으로 본다).
import { describe, expect, it, vi } from "vitest";
import {
  CHAT_HINT_START,
  CHILD_TURN_TEXT,
  type ChatHintTiers,
  chatHintAutoOf,
  chatHintCanPressOf,
  chatHintOpenedOf,
  chatHintPressOf,
  chatHintReplyStepOf,
  chatHintRetryOf,
} from "@/components/conversation/child-turn";
import {
  chatOpenEventsOf,
  chatQuietFailOf,
  chatQuietResumeOf,
  chatQuietStepOf,
  chatTurnOf,
  leadOpenBodyOf,
  lessonAfterEndOf,
  lessonMoveActionOf,
  submitPlanOf,
} from "@/components/conversation/talk-frame";
import type { ChatHintReply } from "@/core/conversation/chat-hints";
import {
  CHAT_QUIET_OFF,
  type ChatQuietEvent,
  type ChatQuietState,
  chatQuietDueAt,
} from "@/core/conversation/chat-quiet";
import {
  chatEndSignalOfLine,
  chatExplainOfRaw,
  chatHintReplyOfRaw,
  chatRecognizerBodyOf,
  sendTalkLessonTurn,
  type TalkLessonStreamHandlers,
} from "@/lib/talk-stream";

// 틀 조각(talk-frame)이 가져오는 브라우저 전용 · 서버 액션 조각은 이 시험에서 부르지 않는다(talk-screen-s5 와 같은 꼴)
vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));

const SESSION = "00000000-0000-4000-8000-000000000001";

/** 사건을 차례로 넣고 보낸 횟수를 센다(화면이 보낼지 정하는 함수 그대로). */
function drive(
  events: readonly ChatQuietEvent[],
  start: ChatQuietState = CHAT_QUIET_OFF,
): { state: ChatQuietState; sends: number } {
  let state = start;
  let sends = 0;
  for (const event of events) {
    const step = chatQuietStepOf(state, event);
    state = step.state;
    if (step.send) sends += 1;
  }
  return { state, sends };
}

/** 열림 사건(끝 줄을 받은 때). 차례 열쇠는 chatTurnOf 가 만든 값. */
function opened(
  turnNo: number,
  signal: Parameters<typeof chatEndSignalOfLine>[0],
  now: number,
  flags: { hidden?: boolean; stopping?: boolean; reading?: boolean } = {},
): ChatQuietEvent[] {
  const turn = chatTurnOf(SESSION, turnNo, chatEndSignalOfLine(signal));
  return chatOpenEventsOf({
    turn,
    now,
    hidden: flags.hidden ?? false,
    stopping: flags.stopping ?? false,
    reading: flags.reading ?? true,
  });
}

describe("AC-27f 끝 줄 신호 읽기(spec 설계 6 · 7 · 11, 보완 4 (4))", () => {
  it("AC-27f 칸이 없는 끝 줄(기존 두 방식)은 신호가 없고 열림 사건도 없다", () => {
    expect(chatEndSignalOfLine(undefined)).toBeUndefined();
    expect(chatTurnOf(SESSION, 4, undefined)).toBeNull();
    expect(opened(4, undefined, 0)).toEqual([]);
    expect(drive(opened(4, undefined, 0)).state).toEqual(CHAT_QUIET_OFF);
  });

  it("AC-27f 네 칸을 그대로 읽고, 없는 칸은 지어내지 않는다(빈 신호 — 짧은 준비 앞 차례)", () => {
    expect(
      chatEndSignalOfLine({
        quietSeconds: 11,
        hint: true,
        explainWait: 0,
        alternatives: 3,
      }),
    ).toEqual({
      quietSeconds: 11,
      hint: true,
      explainWait: 0,
      alternatives: 3,
    });
    expect(chatEndSignalOfLine({})).toEqual({});
    expect(chatEndSignalOfLine({ hint: true })).toEqual({ hint: true });
  });

  it("AC-27f 설명 기다림은 칸이 있는지로 읽는다(값 0 도 칸이 있음)", () => {
    expect(
      "explainWait" in (chatEndSignalOfLine({ explainWait: 0 }) ?? {}),
    ).toBe(true);
    expect(
      "explainWait" in (chatEndSignalOfLine({ quietSeconds: 8 }) ?? {}),
    ).toBe(false);
  });

  it("AC-27f 꼴이 다른 칸은 버린다(힌트 표지는 참만 · 수는 유한한 0 이상 · 후보 수는 1 이상 정수)", () => {
    expect(
      chatEndSignalOfLine({
        quietSeconds: "8",
        hint: 1,
        explainWait: -1,
        alternatives: 1.5,
      }),
    ).toEqual({});
    expect(chatEndSignalOfLine({ hint: false, alternatives: 0 })).toEqual({});
    expect(chatEndSignalOfLine("chat")).toBeUndefined();
  });

  it("AC-27f 흘림 줄 읽기: 끝 줄의 chat 칸을 끝 처리기에 함께 넘기고, 칸이 없으면 넘기지 않는다", async () => {
    const seen: unknown[] = [];
    const handlers: TalkLessonStreamHandlers = {
      onSentence: () => {},
      onKo: () => {},
      onAdd: () => {},
      onSound: () => {},
      onEnd: (_next, chat) => seen.push(chat),
      onResting: () => {},
      onBreak: () => {},
      onClose: () => {},
      onError: () => {},
    };
    const fetchOf = (lines: object[]) => async () =>
      new Response(lines.map((l) => `${JSON.stringify(l)}\n`).join(""));
    const lesson = { talkCount: 1 };
    await sendTalkLessonTurn({ sessionId: SESSION, lead: "quiet" }, handlers, {
      fetchImpl: fetchOf([
        { t: "end", lesson, chat: { quietSeconds: 9, hint: true } },
      ]) as never,
    });
    await sendTalkLessonTurn({ sessionId: SESSION, lead: "start" }, handlers, {
      fetchImpl: fetchOf([{ t: "end", lesson }]) as never,
    });
    expect(seen).toEqual([{ quietSeconds: 9, hint: true }, undefined]);
  });
});

describe("AC-27f 조용함 타이머에 넣을 사건과 보낼지(spec 설계 6, 보완 4 (9))", () => {
  it("AC-27f 차례 열쇠는 선생님 행 번호로 만들어 다시 그려도 같고 차례마다 다르다", () => {
    const a = chatTurnOf(SESSION, 5, { quietSeconds: 8 });
    const b = chatTurnOf(SESSION, 5, { quietSeconds: 8 });
    const c = chatTurnOf(SESSION, 6, { quietSeconds: 8 });
    expect(a?.key).toBe(b?.key);
    expect(a?.key).not.toBe(c?.key);
  });

  it("AC-27f 열림 전에 읽기가 끝났으면 열림 바로 뒤에 읽기 끝을 넣는다 · 읽는 중이면 넣지 않는다", () => {
    expect(opened(3, { quietSeconds: 8 }, 100, { reading: false })).toEqual([
      {
        type: "open",
        now: 100,
        turnKey: chatTurnOf(SESSION, 3, {})?.key,
        signal: { quietSeconds: 8 },
      },
      { type: "read-end", now: 100 },
    ]);
    expect(
      opened(3, { quietSeconds: 8 }, 100, { reading: true }).map((e) => e.type),
    ).toEqual(["open"]);
  });

  it("AC-27f 쪽이 가려진 채 열리면 곧바로 가림, '그만하기'가 떠 있으면 곧바로 그만하기 입력", () => {
    expect(
      opened(3, { quietSeconds: 8 }, 0, { hidden: true }).map((e) => e.type),
    ).toEqual(["open", "hidden"]);
    expect(
      opened(3, { quietSeconds: 8 }, 0, { stopping: true }).map((e) =>
        e.type === "input" ? `input:${e.input}` : e.type,
      ),
    ).toEqual(["open", "input:stop"]);
    expect(
      drive([
        ...opened(3, { quietSeconds: 8 }, 0, { stopping: true }),
        { type: "read-end", now: 10 },
        { type: "tick", now: 60_000 },
      ]).sends,
    ).toBe(0);
  });

  it("AC-27f 읽기 끝 뒤 입력 없이 기다림 시간이 지나면 한 번 보낸다(끝 줄의 초 값 그대로)", () => {
    const events = [
      ...opened(3, { quietSeconds: 11 }, 0),
      { type: "read-end", now: 2000 } as const,
    ];
    const armed = drive(events).state;
    expect(chatQuietDueAt(armed)).toBe(13_000);
    expect(drive([...events, { type: "tick", now: 12_999 }]).sends).toBe(0);
    expect(
      drive([
        ...events,
        { type: "tick", now: 13_000 },
        { type: "tick", now: 30_000 },
      ]).sends,
    ).toBe(1);
  });

  it("AC-27f 기다림 시간 칸이 없거나 0 이면 끔(보내지 않음)", () => {
    for (const signal of [{}, { quietSeconds: 0 }, { hint: true as const }])
      expect(
        drive([
          ...opened(3, signal, 0, { reading: false }),
          { type: "tick", now: 600_000 },
        ]).sends,
      ).toBe(0);
  });

  it("AC-27f 같은 열쇠의 열림은 다시 넣어도(다시 그리기 · 실패한 요청 뒤 다시 열기) 다시 재지 않는다", () => {
    const first = drive([
      ...opened(3, { quietSeconds: 8 }, 0, { reading: false }),
      { type: "tick", now: 8000 },
    ]);
    expect(first.sends).toBe(1);
    const again = drive(
      [
        ...opened(3, { quietSeconds: 8 }, 9000, { reading: false }),
        { type: "tick", now: 30_000 },
      ],
      first.state,
    );
    expect(again.sends).toBe(0);
  });

  it("AC-27f 입력 없는 차례 둘이 잇달아 오면 두 번 보낸다(다른 열쇠)", () => {
    const one = drive([
      ...opened(3, { quietSeconds: 8 }, 0, { reading: false }),
      { type: "tick", now: 8000 },
    ]);
    const two = drive(
      [
        ...opened(4, { quietSeconds: 8 }, 12_000),
        { type: "read-end", now: 14_000 },
        { type: "tick", now: 22_000 },
      ],
      one.state,
    );
    expect(one.sends + two.sends).toBe(2);
  });

  it("AC-27f 여덟 입력 갈래 모두 그 차례를 거둔다(읽기 끝 전의 입력도)", () => {
    for (const input of [
      "talk",
      "hint",
      "dont_know",
      "korean_help",
      "replay",
      "sound_line",
      "hint_listen",
      "stop",
    ] as const)
      for (const at of [500, 5000])
        expect(
          drive([
            ...opened(3, { quietSeconds: 8 }, 0),
            { type: "input", now: at, input },
            { type: "read-end", now: 1000 },
            { type: "tick", now: 60_000 },
          ]).sends,
        ).toBe(0);
  });

  it("AC-27f 둘째 막힘으로 저절로 열린 힌트 단은 입력이 아니라 타이머가 돈다", () => {
    expect(
      drive([
        ...opened(3, { quietSeconds: 8, hint: true }, 0),
        { type: "hint-auto-open", now: 100 },
        { type: "read-end", now: 1000 },
        { type: "tick", now: 9000 },
      ]).sends,
    ).toBe(1);
  });

  it("AC-27f 설명 기다림 차례는 설명이 보인 때 · 실패한 때 · 상한 가운데 이른 때와 읽기 끝 가운데 늦은 때부터 잰다", () => {
    const base = opened(3, { quietSeconds: 8, explainWait: 6 }, 0);
    const shown = drive([
      ...base,
      { type: "read-end", now: 1000 },
      { type: "explain-shown", now: 3000 },
    ]).state;
    expect(chatQuietDueAt(shown)).toBe(11_000);
    const failed = drive([
      ...base,
      { type: "read-end", now: 1000 },
      { type: "explain-failed", now: 2500 },
    ]).state;
    expect(chatQuietDueAt(failed)).toBe(10_500);
    const capped = drive([...base, { type: "read-end", now: 1000 }]).state;
    expect(chatQuietDueAt(capped)).toBe(14_000);
  });

  it("AC-27f 실패한 조용함 요청: 연결 끊김은 다시 보내지 않고 이어 하기로 받는다(시도 id 가 없어 서버가 새 조용함 차례로 받음 — S1 검토 6절 W 2)", () => {
    expect(chatQuietFailOf({ result: "offline", lines: 0 })).toBe("resume");
    expect(chatQuietFailOf({ result: "offline", lines: 2 })).toBe("resume");
  });

  it("AC-27f 실패한 조용함 요청: 거절 · 오류 · 쉼은 줄을 받기 전이면 차례를 다시 열고, 받은 뒤 오류면 지금의 실패 길", () => {
    expect(chatQuietFailOf({ result: "stale", lines: 0 })).toBe("reopen");
    expect(chatQuietFailOf({ result: "error", lines: 0 })).toBe("reopen");
    expect(chatQuietFailOf({ result: "resting", lines: 0 })).toBe("reopen");
    expect(chatQuietFailOf({ result: "error", lines: 1 })).toBe("trouble");
    expect(chatQuietFailOf({ result: "done", lines: 0 })).toBe("none");
    expect(chatQuietFailOf({ result: "aborted", lines: 0 })).toBe("none");
  });

  it("AC-27f 이어 하기: 서버 자료가 그대로면 차례를 다시 열고, 새 선생님 행 · 끊긴 조용함 행이 있으면 판을 다시 읽으며, 자료를 못 읽으면 줄이 없을 때만 다시 연다", () => {
    const same = { retryLead: null, current: { turnNo: 7 } };
    expect(chatQuietResumeOf({ fresh: same, turnNo: 7, lines: 0 })).toBe(
      "reopen",
    );
    expect(chatQuietResumeOf({ fresh: same, turnNo: 7, lines: 2 })).toBe(
      "reopen",
    );
    expect(
      chatQuietResumeOf({
        fresh: { retryLead: null, current: { turnNo: 8 } },
        turnNo: 7,
        lines: 0,
      }),
    ).toBe("refresh");
    expect(
      chatQuietResumeOf({
        fresh: { retryLead: "quiet", current: { turnNo: 7 } },
        turnNo: 7,
        lines: 0,
      }),
    ).toBe("refresh");
    expect(chatQuietResumeOf({ fresh: undefined, turnNo: 7, lines: 0 })).toBe(
      "reopen",
    );
    expect(chatQuietResumeOf({ fresh: undefined, turnNo: 7, lines: 1 })).toBe(
      "trouble",
    );
  });

  it("AC-27f 이야기 방식 끝 줄(신호 칸 있음)은 대화 첫 질문 차례 값으로 아이 차례를 막지 않는다 · 기존 두 방식은 그대로(S1 검토 6절 W 3)", () => {
    const end = {
      choice: null,
      prep: null,
      firstQuestionDue: true,
      segment: "talk" as const,
      greetingDone: true,
    };
    expect(lessonAfterEndOf(end, { quietSeconds: 8 })).toEqual({
      kind: "child",
    });
    expect(lessonAfterEndOf(end, {})).toEqual({ kind: "child" });
    expect(lessonAfterEndOf(end)).toEqual({ kind: "reload" });
    // 인사 끝 · 대화 중 연 짧은 준비는 이야기 방식에서도 다시 읽는다
    expect(
      lessonAfterEndOf(
        { ...end, firstQuestionDue: false, segment: "greeting" },
        {},
      ),
    ).toEqual({ kind: "reload" });
  });
});

describe("AC-27f 입구 넓힘(보완 4 (5) — back · quiet)", () => {
  it("AC-27f 토막 넘김의 back 은 아이 말 없는 요청으로 보내고, 같은 입구를 보내는 중이면 건너뛴다", () => {
    expect(lessonMoveActionOf({ leadTurn: "back" }, null)).toEqual({
      kind: "lead",
      open: "back",
    });
    expect(lessonMoveActionOf({ leadTurn: "back" }, "back")).toEqual({
      kind: "skip",
    });
    expect(lessonMoveActionOf({}, null)).toEqual({ kind: "move" });
    expect(leadOpenBodyOf(SESSION, "quiet")).toEqual({
      sessionId: SESSION,
      lead: "quiet",
    });
  });

  it("AC-27f 조용함 요청은 읽기 줄을 끊지 않고 체감 대기를 재지 않는다", () => {
    expect(
      submitPlanOf({ sessionId: SESSION, lead: "quiet" }, "first"),
    ).toEqual({ cancelReading: false, measurePerceived: false });
  });
});

const tiers3 = [
  { kind: "ko" as const },
  { kind: "frame" as const },
  { kind: "sentence" as const, listen: true as const },
];
const ok = (tier: number, text: string, tiers = tiers3): ChatHintReply => ({
  ok: true,
  tiers,
  tier,
  text,
});

describe("AC-27g 힌트 단(spec 설계 7, 보완 4 (11))", () => {
  it("AC-27g 첫 누름은 단 0 을 점 셋으로 열고 받으러 간다(단 목록은 아직 모름)", () => {
    const step = chatHintPressOf(CHAT_HINT_START);
    expect(step.fetch).toEqual({ tier: 0, retry: 0 });
    expect(step.state.slots).toEqual([{ state: "loading" }]);
    expect(chatHintCanPressOf(step.state)).toBe(false);
    expect(chatHintOpenedOf(step.state)).toBe(0);
  });

  it("AC-27g 응답의 단 수만큼만 열 수 있다(셋 · 둘)", () => {
    for (const tiers of [tiers3, [tiers3[0], tiers3[2]]] as const) {
      let state: ChatHintTiers = CHAT_HINT_START;
      let pressed = 0;
      while (chatHintCanPressOf(state) && pressed < 10) {
        const press = chatHintPressOf(state);
        pressed += 1;
        const fetch = press.fetch;
        expect(fetch).not.toBeNull();
        state = chatHintReplyStepOf(
          press.state,
          fetch?.tier ?? 0,
          ok(fetch?.tier ?? 0, `t${fetch?.tier}`, [...tiers]),
        ).state;
      }
      expect(state.slots.length).toBe(tiers.length);
      expect(chatHintOpenedOf(state)).toBe(tiers.length);
      expect(chatHintPressOf(state).fetch).toBeNull();
    }
  });

  it("AC-27g 실패는 그 단 자리에 실패로 남고 연 단으로 세지 않는다 · 다시 받기가 남았을 때만 다시 받기", () => {
    const pressed = chatHintPressOf(CHAT_HINT_START).state;
    const failed = chatHintReplyStepOf(pressed, 0, {
      ok: false,
      retry: true,
    }).state;
    expect(failed.slots).toEqual([{ state: "failed", retry: true }]);
    expect(chatHintOpenedOf(failed)).toBe(0);
    expect(chatHintCanPressOf(failed)).toBe(false);
    const retry = chatHintRetryOf(failed, 0);
    expect(retry.fetch).toEqual({ tier: 0, retry: 1 });
    expect(retry.state.slots).toEqual([{ state: "loading" }]);
    const capped = chatHintReplyStepOf(retry.state, 0, {
      ok: false,
      retry: false,
    }).state;
    expect(capped.slots).toEqual([{ state: "failed", retry: false }]);
    expect(chatHintRetryOf(capped, 0).fetch).toBeNull();
  });

  it("AC-27g 다시 받기 뒤의 단은 그 다시 받기 번호로 받는다(서버의 표지 행 차례)", () => {
    let state = chatHintPressOf(CHAT_HINT_START).state;
    state = chatHintReplyStepOf(state, 0, { ok: false, retry: true }).state;
    const retry = chatHintRetryOf(state, 0);
    state = chatHintReplyStepOf(retry.state, 0, ok(0, "뜻")).state;
    expect(chatHintOpenedOf(state)).toBe(1);
    expect(chatHintPressOf(state).fetch).toEqual({ tier: 1, retry: 1 });
  });

  it("AC-27g 연 단 수는 누른 수가 아니라 글이 보인 단 수다(실패한 둘째 단은 세지 않음)", () => {
    let state = chatHintPressOf(CHAT_HINT_START).state;
    state = chatHintReplyStepOf(
      state,
      0,
      ok(0, "뜻", [tiers3[0], tiers3[2]]),
    ).state;
    state = chatHintPressOf(state).state;
    state = chatHintReplyStepOf(state, 1, { ok: false, retry: false }).state;
    expect(state.slots.length).toBe(2);
    expect(chatHintOpenedOf(state)).toBe(1);
  });

  it("AC-27g 다른 차례 · 늦은 응답(이미 글이 있는 단)은 바꾸지 않는다", () => {
    let state = chatHintPressOf(CHAT_HINT_START).state;
    state = chatHintReplyStepOf(state, 0, ok(0, "뜻")).state;
    const late = chatHintReplyStepOf(state, 0, { ok: false, retry: true });
    expect(late.state).toBe(state);
    expect(chatHintReplyStepOf(state, 5, ok(5, "x")).state).toBe(state);
  });

  it("AC-27g 둘째 막힘의 저절로 열림: 단 0 을 받고 단 목록을 알면 남은 단을 모두 연다", () => {
    const auto = chatHintAutoOf(CHAT_HINT_START);
    expect(auto.fetches).toEqual([{ tier: 0, retry: 0 }]);
    const next = chatHintReplyStepOf(auto.state, 0, ok(0, "뜻"));
    expect(next.fetches).toEqual([
      { tier: 1, retry: 0 },
      { tier: 2, retry: 0 },
    ]);
    expect(next.state.slots.map((s) => s.state)).toEqual([
      "text",
      "loading",
      "loading",
    ]);
    // 이미 연 단이 있으면 그대로 두고 남은 단만
    let pressed = chatHintPressOf(CHAT_HINT_START).state;
    pressed = chatHintReplyStepOf(pressed, 0, ok(0, "뜻")).state;
    expect(chatHintAutoOf(pressed).fetches).toEqual([
      { tier: 1, retry: 0 },
      { tier: 2, retry: 0 },
    ]);
  });

  it("AC-27g 힌트 응답 읽기: 성공 · 실패 · 옛 꼴({ ok: false }) · 받지 못함", () => {
    expect(chatHintReplyOfRaw(ok(0, "뜻"))).toEqual(ok(0, "뜻"));
    expect(chatHintReplyOfRaw({ ok: false, retry: true })).toEqual({
      ok: false,
      retry: true,
    });
    expect(chatHintReplyOfRaw({ ok: false })).toEqual({
      ok: false,
      retry: false,
    });
    expect(chatHintReplyOfRaw({ ok: true, text: "옛 꼴" })).toEqual({
      ok: false,
      retry: false,
    });
    expect(
      chatHintReplyOfRaw({ ok: true, tiers: [], tier: 0, text: "x" }),
    ).toEqual({ ok: false, retry: false });
    // 액션이 던졌거나 응답이 없으면 그 단에 실패 한 줄과 다시 받기(횟수는 서버 표지 행이 지킨다)
    expect(chatHintReplyOfRaw(undefined)).toEqual({ ok: false, retry: true });
  });

  it("AC-27g 설명 응답 읽기: 글이 있을 때만 글, 그 밖은 없음(문구 없이 차례를 잇는다)", () => {
    expect(chatExplainOfRaw({ ok: true, text: "무슨 뜻이냐면" })).toBe(
      "무슨 뜻이냐면",
    );
    expect(chatExplainOfRaw({ ok: true, text: "  " })).toBeUndefined();
    expect(chatExplainOfRaw({ ok: false })).toBeUndefined();
    expect(chatExplainOfRaw(undefined)).toBeUndefined();
  });

  it("AC-27g 문구 표의 두 문구(해요체 한 줄 · 다시 받기)", () => {
    expect(CHILD_TURN_TEXT.hintFailed).toBe("힌트를 못 가져왔어요");
    expect(CHILD_TURN_TEXT.hintRetry).toBe("다시 받기");
  });
});

describe("AC-27l 인식기 정보(spec 설계 11)", () => {
  it("AC-27l 턴 요청의 인식기 칸: 확신 정도 · 다른 후보 · 중간 결과만(섞임 표지 · 후보 수는 싣지 않음)", () => {
    expect(
      chatRecognizerBodyOf({
        confidence: 0.42,
        alternative: "I like dogs",
        alternatives: 2,
        interim: false,
      }),
    ).toEqual({
      confidence: 0.42,
      alternative: "I like dogs",
      interimOnly: false,
    });
    expect(
      chatRecognizerBodyOf({ alternatives: 1, interim: true, mixed: true }),
    ).toEqual({ interimOnly: true });
    expect(
      chatRecognizerBodyOf({
        confidence: 0.9,
        alternative: "  ",
        alternatives: 2,
        interim: false,
      }),
    ).toEqual({ confidence: 0.9, interimOnly: false });
  });

  it("AC-27l 인식기 정보가 없는 듣기(후보 수를 넘기지 않은 차례 · 기존 두 방식)는 칸이 없다", () => {
    expect(chatRecognizerBodyOf(undefined)).toBeUndefined();
  });
});

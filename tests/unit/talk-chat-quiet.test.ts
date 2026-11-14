// 이야기 방식 조용함 타이머(회화 대화 구조 R spec 설계 6 '타이머의 범위' · 설계 7 '막힌 뒤 한국어 설명' · AC-6 = AC-27f, plan 묶음 P6).
// 가짜 시계: 모든 사건의 now 를 시험이 정한다. 기다림 시간 · 설명 기다림은 끝 줄 신호의 값(초)으로 넘긴다(시험 값은 잠정 설정값 8 · 6 과 다른 값도 쓴다).
import { describe, expect, it } from "vitest";
import {
  CHAT_QUIET_INPUTS,
  CHAT_QUIET_OFF,
  type ChatQuietEvent,
  type ChatQuietState,
  chatQuietDueAt,
  chatQuietStartOf,
  reduceChatQuiet,
} from "@/core/conversation/chat-quiet";

/** 사건을 차례로 넣은 상태. */
function run(events: readonly ChatQuietEvent[]): ChatQuietState {
  return events.reduce(reduceChatQuiet, CHAT_QUIET_OFF);
}

/** 보낸 횟수: 사건마다 상태가 sent 로 바뀐 횟수(화면은 이 바뀜에서 quiet 요청을 보낸다). */
function sendCount(events: readonly ChatQuietEvent[]): number {
  let state = CHAT_QUIET_OFF;
  let sends = 0;
  for (const event of events) {
    const next = reduceChatQuiet(state, event);
    if (next.phase === "sent" && state.phase !== "sent") sends += 1;
    state = next;
  }
  return sends;
}

/** 아이 차례 열림. 차례 열쇠는 따로 주지 않으면 열린 때로 만든다(때가 다르면 다른 차례). */
const open = (
  now: number,
  quietSeconds?: number,
  explainWait?: number,
  turnKey = `teacher-row-${now}`,
) =>
  ({
    type: "open",
    now,
    turnKey,
    signal: {
      ...(quietSeconds === undefined ? {} : { quietSeconds }),
      ...(explainWait === undefined ? {} : { explainWait }),
    },
  }) as const satisfies ChatQuietEvent;
const readEnd = (now: number) =>
  ({ type: "read-end", now }) as const satisfies ChatQuietEvent;
const tick = (now: number) =>
  ({ type: "tick", now }) as const satisfies ChatQuietEvent;

describe("조용함 타이머 — 기본", () => {
  it("AC-27f 읽기 끝 뒤 입력 없이 기다림 시간이 지나면 한 번만 보낸다", () => {
    const events: ChatQuietEvent[] = [open(0, 8), readEnd(3_000), tick(10_999)];
    expect(run(events).phase).toBe("armed");
    expect(chatQuietStartOf(run(events))).toBe(3_000);
    expect(chatQuietDueAt(run(events))).toBe(11_000);
    const all = [...events, tick(11_000), tick(20_000), tick(90_000)];
    expect(run(all)).toMatchObject({
      phase: "sent",
      at: 11_000,
      startAt: 3_000,
    });
    expect(sendCount(all)).toBe(1);
  });

  it("AC-27f 기다림 시간은 끝 줄 신호의 값을 따른다(고정 값이 없다)", () => {
    expect(chatQuietDueAt(run([open(0, 3), readEnd(1_000)]))).toBe(4_000);
    expect(chatQuietDueAt(run([open(0, 12), readEnd(1_000)]))).toBe(13_000);
  });

  it("AC-27f 읽기가 끝나기 전에는 재지 않는다(아이 차례가 열린 때부터 재지 않음)", () => {
    const state = run([open(0, 8), tick(60_000), tick(600_000)]);
    expect(state.phase).toBe("armed");
    expect(chatQuietStartOf(state)).toBeUndefined();
    expect(chatQuietDueAt(state)).toBeUndefined();
  });

  it("AC-27f 기다림 시간이 없거나 0 이면 끈다(talk.chat_quiet_seconds 0 · 마무리 · 상한 차례는 신호에 칸이 없음)", () => {
    for (const quiet of [undefined, 0, -1, Number.NaN]) {
      const events = [open(0, quiet), readEnd(1_000), tick(1_000_000)];
      expect(run(events).phase).toBe("off");
      expect(sendCount(events)).toBe(0);
    }
  });

  it("AC-27f 읽기 끝이 여러 번 오면 보내기 전까지 마지막 읽기 끝부터 잰다(선생님 말이 문장마다 읽기 끝을 내도)", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8),
      readEnd(2_000),
      readEnd(6_000),
      tick(9_999),
      readEnd(9_500),
    ];
    expect(chatQuietStartOf(run(events))).toBe(9_500);
    expect(chatQuietDueAt(run(events))).toBe(17_500);
    // 첫 읽기 끝의 기한(10초)에는 보내지 않는다 — 선생님이 아직 말하는 중이었다.
    expect(sendCount([...events, tick(10_000), tick(17_499)])).toBe(0);
    expect(sendCount([...events, tick(17_500)])).toBe(1);
  });

  it("AC-27f 보낸 뒤 온 읽기 끝은 보낸 것을 바꾸지 않는다", () => {
    const state = run([
      open(0, 8),
      readEnd(1_000),
      tick(9_000),
      readEnd(9_500),
    ]);
    expect(state).toMatchObject({ phase: "sent", at: 9_000, startAt: 1_000 });
  });

  it("AC-27f 읽기 끝이 거꾸로 된 시각으로 와도 재기 시작을 앞당기지 않는다(늦은 쪽을 지킨다)", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8),
      readEnd(6_000),
      readEnd(2_000),
    ];
    expect(chatQuietStartOf(run(events))).toBe(6_000);
    expect(chatQuietDueAt(run(events))).toBe(14_000);
    // 앞당겨진 기한(10초)에는 보내지 않는다 — 틀려도 늦게 보내는 쪽이다.
    expect(sendCount([...events, tick(10_000)])).toBe(0);
    expect(sendCount([...events, tick(14_000)])).toBe(1);
  });

  it("AC-27f 새 아이 차례가 열리면 앞 차례의 상태를 버리고 그 차례에서 다시 한 번 잰다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8),
      readEnd(1_000),
      tick(9_000),
      open(20_000, 8),
      readEnd(22_000),
      tick(30_000),
    ];
    expect(sendCount(events)).toBe(2);
    // 입력으로 거둔 차례 뒤 새 차례도 다시 잰다.
    expect(
      run([
        open(0, 8),
        { type: "input", now: 500, input: "talk" },
        open(10_000, 8),
        readEnd(12_000),
      ]).phase,
    ).toBe("armed");
  });

  it("AC-27f 사건 없이 시간이 거꾸로 가지 않는다 — 기다림 시간 전의 tick 은 아무것도 바꾸지 않는다", () => {
    const before = run([open(0, 8), readEnd(1_000)]);
    expect(reduceChatQuiet(before, tick(8_999))).toEqual(before);
  });
});

describe("조용함 타이머 — 입력이 있었던 차례", () => {
  it("AC-27f 입력은 여덟 갈래다(spec 일곱 — 말하기 누름 · 힌트 · 잘 모르겠어요 · 한국어 도움 · 다시 듣기 · 소리 줄 듣기 · 힌트 문장 듣기 — 와 구석 '그만하기')", () => {
    expect([...CHAT_QUIET_INPUTS]).toEqual([
      "talk",
      "hint",
      "dont_know",
      "korean_help",
      "replay",
      "sound_line",
      "hint_listen",
      "stop",
    ]);
  });

  it("AC-27f 구석 '그만하기'를 누르면 그만둘지 고르는 동안과 그 뒤에도 그 차례에는 보내지 않는다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8),
      readEnd(2_000),
      { type: "input", now: 4_000, input: "stop" },
      tick(10_000),
      tick(600_000),
    ];
    expect(run(events)).toMatchObject({ phase: "dropped", why: "input" });
    expect(sendCount(events)).toBe(0);
  });

  for (const input of CHAT_QUIET_INPUTS) {
    it(`AC-27f 입력이 있었던 차례는 얼마가 지나도 보내지 않음 — 재는 도중의 ${input}`, () => {
      const events: ChatQuietEvent[] = [
        open(0, 8),
        readEnd(2_000),
        { type: "input", now: 5_000, input },
        tick(10_000),
        tick(3_600_000),
      ];
      expect(run(events)).toMatchObject({
        phase: "dropped",
        why: "input",
        at: 5_000,
      });
      expect(sendCount(events)).toBe(0);
    });

    it(`AC-27f 입력이 있었던 차례는 얼마가 지나도 보내지 않음 — 읽기 끝 전의 ${input}`, () => {
      const events: ChatQuietEvent[] = [
        open(0, 8),
        { type: "input", now: 1_000, input },
        readEnd(4_000),
        tick(3_600_000),
      ];
      expect(sendCount(events)).toBe(0);
    });
  }

  it("AC-27f 누른 뒤 말소리 없음 · '마이크 안 잡힘' 안내를 읽어도 그 차례는 다시 재지 않는다", () => {
    // 누름 → 말소리 없음 → '다시 말해 볼래요' 짧은 말 읽기 끝 → 오래 가만히 있음.
    const events: ChatQuietEvent[] = [
      open(0, 8),
      readEnd(2_000),
      { type: "input", now: 4_000, input: "talk" },
      readEnd(9_000),
      tick(17_000),
      tick(600_000),
    ];
    expect(sendCount(events)).toBe(0);
  });

  it("AC-27f 힌트 단추를 누르고 힌트 문장을 들은 뒤 오래 가만히 있어도 보내지 않는다(도움 직후 선생님이 끼어들지 않음)", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8),
      readEnd(2_000),
      { type: "input", now: 6_000, input: "hint" },
      { type: "input", now: 7_000, input: "hint_listen" },
      readEnd(9_000),
      tick(1_000_000),
    ];
    expect(sendCount(events)).toBe(0);
  });

  it("AC-27f '다시 듣기'만 누르고 말하지 않는 아이에게도 그 차례에는 보내지 않는다(spec m-1 (가))", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8),
      readEnd(2_000),
      { type: "input", now: 3_000, input: "replay" },
      readEnd(6_000),
      tick(14_000),
      tick(1_000_000),
    ];
    expect(sendCount(events)).toBe(0);
  });

  it("AC-27f 보낸 뒤의 입력은 보낸 것을 되돌리지 않는다", () => {
    const state = run([
      open(0, 8),
      readEnd(1_000),
      tick(9_000),
      { type: "input", now: 9_100, input: "talk" },
    ]);
    expect(state).toMatchObject({ phase: "sent", at: 9_000, startAt: 1_000 });
  });

  it("AC-27f 기다림 시간이 없는 차례(끔)에서 입력이 와도 끔 그대로다", () => {
    expect(
      run([open(0), { type: "input", now: 100, input: "talk" }, tick(1e6)])
        .phase,
    ).toBe("off");
  });
});

describe("조용함 타이머 — 같은 차례의 다시 열림(차례 열쇠)", () => {
  it("AC-27f 누름으로 거둔 뒤 같은 열쇠의 열림과 읽기 끝이 와도 보내지 않는다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8, undefined, "row-7"),
      readEnd(2_000),
      { type: "input", now: 4_000, input: "talk" },
      open(5_000, 8, undefined, "row-7"),
      readEnd(9_000),
      tick(17_000),
      tick(600_000),
    ];
    expect(run(events)).toMatchObject({ phase: "dropped", why: "input" });
    expect(sendCount(events)).toBe(0);
  });

  it("AC-27f 쪽 가림으로 거둔 뒤 같은 열쇠의 열림이 와도 되살아나지 않는다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8, undefined, "row-7"),
      { type: "hidden", now: 1_000 },
      open(30_000, 8, undefined, "row-7"),
      readEnd(31_000),
      tick(600_000),
    ];
    expect(sendCount(events)).toBe(0);
  });

  it("AC-27f 보낸 뒤 같은 열쇠의 열림이 와도 다시 보내지 않는다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8, undefined, "row-7"),
      readEnd(1_000),
      tick(9_000),
      open(9_100, 8, undefined, "row-7"),
      readEnd(10_000),
      tick(18_000),
      tick(600_000),
    ];
    expect(sendCount(events)).toBe(1);
    expect(run(events)).toMatchObject({ phase: "sent", at: 9_000 });
  });

  it("AC-27f 재는 중에 같은 열쇠의 열림이 다시 와도 재는 때가 바뀌지 않는다", () => {
    const state = run([
      open(0, 8, 6, "row-7"),
      readEnd(2_000),
      open(4_000, 8, 6, "row-7"),
    ]);
    expect(state).toMatchObject({ phase: "armed", openedAt: 0 });
    expect(chatQuietDueAt(state)).toBe(14_000);
  });

  it("AC-27f 다른 열쇠의 열림은 새 차례다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8, undefined, "row-7"),
      { type: "input", now: 500, input: "talk" },
      open(10_000, 8, undefined, "row-9"),
      readEnd(12_000),
      tick(20_000),
    ];
    expect(sendCount(events)).toBe(1);
  });

  it("AC-27f 기다림 시간이 없는 차례(끔)도 같은 열쇠의 열림으로 켜지지 않는다", () => {
    const events: ChatQuietEvent[] = [
      open(0, undefined, undefined, "row-7"),
      open(100, 8, undefined, "row-7"),
      readEnd(1_000),
      tick(600_000),
    ];
    expect(sendCount(events)).toBe(0);
  });

  it("AC-27f 읽기 끝이 열림보다 먼저 오면 그 읽기 끝은 버려지고, 뒤에 읽기 끝이 오지 않으면 그 차례에는 보내지 않는다(지금 동작 고정)", () => {
    const early: ChatQuietEvent[] = [
      readEnd(1_000),
      open(2_000, 8),
      tick(60_000),
      tick(600_000),
    ];
    expect(run(early).phase).toBe("armed");
    expect(chatQuietStartOf(run(early))).toBeUndefined();
    expect(sendCount(early)).toBe(0);
    // 앞 차례가 재는 중일 때 온 읽기 끝도 새 차례로 넘어가지 않는다.
    const carried: ChatQuietEvent[] = [
      open(0, 8),
      readEnd(1_000),
      { type: "input", now: 1_500, input: "talk" },
      readEnd(2_000),
      open(3_000, 8),
      tick(600_000),
    ];
    expect(sendCount(carried)).toBe(0);
    // 열림 뒤에 읽기 끝이 오면 그때부터 잰다.
    expect(sendCount([...early, readEnd(600_100), tick(608_100)])).toBe(1);
  });
});

describe("조용함 타이머 — 둘째 막힘으로 저절로 열린 단", () => {
  it("AC-27f 둘째 막힘으로 저절로 열린 단은 입력이 아님 — 타이머가 돌고 한 번 보낸다(spec 설계 6 의 예외)", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8, 6),
      { type: "hint-auto-open", now: 0 },
      readEnd(2_000),
      { type: "explain-shown", now: 3_000 },
      { type: "hint-auto-open", now: 3_000 },
      tick(11_000),
    ];
    expect(sendCount(events)).toBe(1);
    expect(run(events)).toMatchObject({
      phase: "sent",
      at: 11_000,
      startAt: 3_000,
    });
  });

  it("AC-27f 저절로 열린 단 뒤라도 아이가 힌트 단을 누르면 그 차례는 보내지 않는다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8, 6),
      { type: "hint-auto-open", now: 0 },
      readEnd(2_000),
      { type: "input", now: 4_000, input: "hint" },
      tick(1_000_000),
    ];
    expect(sendCount(events)).toBe(0);
  });
});

describe("조용함 타이머 — 막힌 뒤 설명을 기다리는 차례", () => {
  it("AC-27f 설명이 읽기 끝보다 늦게 보이면 보인 때부터 잰다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8, 6),
      readEnd(2_000),
      { type: "explain-shown", now: 4_000 },
    ];
    expect(chatQuietStartOf(run(events))).toBe(4_000);
    expect(sendCount([...events, tick(11_999)])).toBe(0);
    expect(sendCount([...events, tick(12_000)])).toBe(1);
  });

  it("AC-27f 설명이 읽기 끝보다 먼저 보이면 읽기 끝부터 잰다", () => {
    const state = run([
      open(0, 8, 6),
      { type: "explain-shown", now: 1_000 },
      readEnd(3_000),
    ]);
    expect(chatQuietDueAt(state)).toBe(11_000);
  });

  it("AC-27f 설명이 늦게 보임 — 상한이 지난 때부터 재고, 상한 뒤에 온 설명은 다시 재지 않는다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8, 6),
      readEnd(2_000),
      tick(13_999),
      { type: "explain-shown", now: 9_000 + 4_999 },
      tick(13_999),
    ];
    // 설명 기다림 상한 = 차례가 열린 0 + 6초. 읽기 끝(2초)보다 늦으므로 6초부터 잼 → 14초.
    expect(chatQuietStartOf(run(events))).toBe(6_000);
    expect(chatQuietDueAt(run(events))).toBe(14_000);
    expect(sendCount([...events, tick(14_000)])).toBe(1);
  });

  it("AC-27f 설명 호출이 실패하면 실패로 끝난 때부터 잰다(문구 없이 차례가 이어짐)", () => {
    const state = run([
      open(0, 8, 6),
      readEnd(2_000),
      { type: "explain-failed", now: 3_500 },
    ]);
    expect(chatQuietDueAt(state)).toBe(11_500);
  });

  it("AC-27f 설명이 보인 뒤 실패 알림이 와도 이른 때를 쓴다(재는 것은 한 번)", () => {
    const state = run([
      open(0, 8, 6),
      readEnd(1_000),
      { type: "explain-shown", now: 3_000 },
      { type: "explain-failed", now: 4_000 },
    ]);
    expect(chatQuietStartOf(state)).toBe(3_000);
  });

  it("AC-27f 설명 기다림 0 은 '청하되 타이머는 기다리지 않음'이라 읽기 끝부터 잰다", () => {
    const state = run([open(0, 8, 0), readEnd(2_000)]);
    expect(chatQuietDueAt(state)).toBe(10_000);
  });

  it("AC-27f 설명 기다림 칸이 없는 차례에서는 설명 알림이 재는 때를 바꾸지 않는다", () => {
    const state = run([
      open(0, 8),
      readEnd(2_000),
      { type: "explain-shown", now: 5_000 },
    ]);
    expect(chatQuietDueAt(state)).toBe(10_000);
  });

  it("AC-27f 설명을 기다리는 동안 아이가 말하기를 누르면 그 차례는 보내지 않는다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8, 6),
      readEnd(2_000),
      { type: "input", now: 3_000, input: "talk" },
      { type: "explain-shown", now: 4_000 },
      tick(1_000_000),
    ];
    expect(sendCount(events)).toBe(0);
  });
});

describe("조용함 타이머 — 쪽 가림", () => {
  it("AC-27f 쪽을 가렸다가 돌아옴 — 그 차례의 타이머를 거두고 돌아와도 다시 재지 않는다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8),
      readEnd(2_000),
      { type: "hidden", now: 5_000 },
      tick(60_000),
      tick(1_000_000),
    ];
    expect(run(events)).toMatchObject({
      phase: "dropped",
      why: "hidden",
      at: 5_000,
    });
    expect(sendCount(events)).toBe(0);
  });

  it("AC-27f 읽기 끝 전에 쪽을 가려도 그 차례에는 보내지 않는다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8),
      { type: "hidden", now: 1_000 },
      readEnd(30_000),
      tick(1_000_000),
    ];
    expect(sendCount(events)).toBe(0);
  });

  it("AC-27f 설명을 기다리는 동안 쪽을 가려도 다시 재지 않는다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8, 6),
      readEnd(2_000),
      { type: "hidden", now: 3_000 },
      { type: "explain-shown", now: 9_000 },
      tick(1_000_000),
    ];
    expect(sendCount(events)).toBe(0);
  });
});

describe("조용함 타이머 — 대화 기록 칸 넘김(13절 C243 보완 7 (7))", () => {
  const away = (now: number) =>
    ({ type: "log-away", now }) as const satisfies ChatQuietEvent;
  const back = (now: number) =>
    ({ type: "log-back", now }) as const satisfies ChatQuietEvent;

  it("AC-27f 넘김으로 칸이 맨 아래를 떠나 있는 동안은 기다림 시간이 지나도 보내지 않는다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8),
      readEnd(1_000),
      away(4_000),
      tick(9_000),
      tick(60_000),
      tick(1_000_000),
    ];
    expect(run(events).phase).toBe("armed");
    expect(chatQuietDueAt(run(events))).toBeUndefined();
    expect(sendCount(events)).toBe(0);
  });

  it("AC-27f 맨 아래로 돌아오면 그때부터 기다림 시간을 처음부터 잰다(끝 줄의 초 값 그대로)", () => {
    for (const quietSeconds of [8, 5, 11]) {
      const events: ChatQuietEvent[] = [
        open(0, quietSeconds),
        readEnd(1_000),
        away(4_000),
        back(20_000),
      ];
      expect(chatQuietStartOf(run(events))).toBe(20_000);
      expect(chatQuietDueAt(run(events))).toBe(20_000 + quietSeconds * 1000);
      expect(
        sendCount([...events, tick(20_000 + quietSeconds * 1000 - 1)]),
      ).toBe(0);
      expect(sendCount([...events, tick(20_000 + quietSeconds * 1000)])).toBe(
        1,
      );
    }
  });

  it("AC-27f 읽기가 끝나기 전에 떠났다 돌아오면 읽기 끝부터 잰다(늦은 쪽)", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8),
      away(500),
      back(1_500),
      readEnd(3_000),
    ];
    expect(chatQuietStartOf(run(events))).toBe(3_000);
    expect(sendCount([...events, tick(11_000)])).toBe(1);
  });

  it("AC-27f 떠난 채 읽기가 끝나면 돌아온 때부터 잰다 · 여러 번 떠나고 돌아오면 마지막 돌아옴부터", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8),
      away(500),
      readEnd(3_000),
      tick(11_000),
      back(12_000),
      away(15_000),
      tick(20_000),
      back(25_000),
    ];
    expect(sendCount(events)).toBe(0);
    expect(chatQuietDueAt(run(events))).toBe(33_000);
    expect(sendCount([...events, tick(33_000)])).toBe(1);
  });

  it("AC-27f 설명 기다림 차례도 돌아온 때가 늦으면 그때부터 잰다", () => {
    const events: ChatQuietEvent[] = [
      open(0, 8, 6),
      readEnd(2_000),
      { type: "explain-shown", now: 3_000 },
      away(4_000),
      back(9_000),
    ];
    expect(chatQuietStartOf(run(events))).toBe(9_000);
    const early: ChatQuietEvent[] = [
      open(0, 8, 6),
      readEnd(2_000),
      away(2_500),
      back(2_800),
      { type: "explain-shown", now: 3_000 },
    ];
    expect(chatQuietStartOf(run(early))).toBe(3_000);
  });

  it("AC-27f 붙어 있는 채 오는 돌아옴은 재기 시작을 바꾸지 않는다 · 넘김은 입력처럼 그 차례를 거두지 않는다", () => {
    const events: ChatQuietEvent[] = [open(0, 8), readEnd(1_000), back(5_000)];
    expect(chatQuietStartOf(run(events))).toBe(1_000);
    expect(run([open(0, 8), readEnd(1_000), away(2_000)]).phase).toBe("armed");
  });

  it("AC-27f 거둔 · 보낸 · 끈 차례에는 넘김이 아무것도 바꾸지 않는다", () => {
    const sent: ChatQuietEvent[] = [open(0, 8), readEnd(1_000), tick(9_000)];
    expect(run([...sent, away(10_000), back(11_000)])).toEqual(run(sent));
    const dropped: ChatQuietEvent[] = [
      open(0, 8),
      { type: "input", now: 500, input: "talk" },
    ];
    expect(run([...dropped, away(1_000), back(2_000)])).toEqual(run(dropped));
    expect(run([open(0), away(1_000), back(2_000)])).toEqual(run([open(0)]));
    expect(run([away(1_000), back(2_000)])).toEqual(CHAT_QUIET_OFF);
  });
});

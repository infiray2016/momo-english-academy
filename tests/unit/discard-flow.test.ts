// 버리는 듣기 차례 기계(iPad 버리는 듣기 spec 설계 1 표 · 보류한 읽기 · 기다리는 누름 · 굳은 읽기 · 분석 10.20.4 F1~F12, plan 묶음 1).
// 시험의 시각(ms)은 장면을 적은 자료다. 설계 숫자(쉼 · 판정 · 하한 · 여유 · 간격 · end 상한 · 안전 상한)는 시간 묶음 T 에서 읽는다.
// 시험 이름은 'AC-' 로 시작하지 않는다(plan 정한 것 11) — AC 는 괄호 안에 둔다.
import { describe, expect, it } from "vitest";
import {
  DISCARD_BRANCHES,
  DISCARD_END_WHYS,
  DISCARD_REOPEN_WHYS,
  DISCARD_SOUND_KINDS,
  type DiscardFlowEffect,
  type DiscardFlowInput,
  type DiscardFlowNote,
  type DiscardStep,
  type DiscardTimes,
  type DiscardView,
  discardTimesOf,
  type RealEndKind,
  startDiscardFlow,
  stepDiscardFlow,
} from "@/core/speech/discard";
import { speechSettingsFrom } from "@/core/speech/listen";
import * as speechTypes from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const speech = speechSettingsFrom((key) => values[key]);
// speech.discard_* 다섯은 시험용 설정(TEST_SETTINGS, 묶음 0)에서 읽는다. 없으면 던진다(조용한 기본값 없음).
function discardValue(key: string): number {
  const value = values[key];
  if (typeof value !== "number")
    throw new Error(`시험용 설정에 ${key} 가 없다`);
  return value;
}
const T: DiscardTimes = discardTimesOf(
  {
    restMs: discardValue("speech.discard_rest_ms"),
    liveAsMs: discardValue("speech.discard_live_as_ms"),
    minMs: discardValue("speech.discard_min_ms"),
    afterSoundMs: discardValue("speech.discard_after_sound_ms"),
    gapMs: discardValue("speech.discard_gap_ms"),
  },
  speech,
);

type Logged = { at: number; effect: DiscardFlowEffect };

/** 기계를 가짜 시계로 돌리는 도우미. send 는 한 걸음, runUntil 은 깨울 시각마다 tick 을 보낸다. */
class Flow {
  step: DiscardStep;
  now = 0;
  readonly log: Logged[] = [];

  constructor(readonly times: DiscardTimes = T) {
    this.step = startDiscardFlow(times);
    for (const effect of this.step.effects) this.log.push({ at: 0, effect });
  }

  get state() {
    return this.step.state;
  }

  send(input: DiscardFlowInput, at: number = this.now): DiscardFlowEffect[] {
    if (at < this.now) throw new Error(`시각이 줄었다: ${at} < ${this.now}`);
    this.now = at;
    this.step = stepDiscardFlow(this.step.state, input, at);
    for (const effect of this.step.effects) this.log.push({ at, effect });
    return this.step.effects;
  }

  runUntil(at: number): DiscardFlowEffect[] {
    const out: DiscardFlowEffect[] = [];
    while (this.step.wakeAt !== undefined && this.step.wakeAt <= at) {
      out.push(...this.send({ type: "tick" }, this.step.wakeAt));
    }
    this.now = Math.max(this.now, at);
    return out;
  }

  /** 기록에서 그 종류의 효과와 시각. */
  find<K extends DiscardFlowEffect["type"]>(type: K) {
    return this.log.filter(
      (
        l,
      ): l is { at: number; effect: Extract<DiscardFlowEffect, { type: K }> } =>
        l.effect.type === type,
    );
  }

  lastView(): DiscardView {
    const views = this.find("view");
    return views[views.length - 1].effect.view;
  }

  lastNote(): DiscardFlowNote {
    const notes = this.find("note");
    return notes[notes.length - 1].effect.dc;
  }
}

const types = (effects: DiscardFlowEffect[]) => effects.map((e) => e.type);
/** view 를 뺀 효과 종류(화면 상태 알림은 따로 본다). */
const acts = (effects: DiscardFlowEffect[]) =>
  types(effects).filter((t) => t !== "view");
const has = (effects: DiscardFlowEffect[], type: DiscardFlowEffect["type"]) =>
  effects.some((e) => e.type === type);
function discardIdOf(effects: DiscardFlowEffect[]): number {
  const start = effects.find((e) => e.type === "discard-start");
  if (start?.type !== "discard-start") throw new Error("버림 start 없음");
  return start.discard;
}

/** 첫 진짜를 0 에 열고 realEndAt 에 kind 로 끝낸다. 그 걸음의 버림 번호와 start 시각. */
function afterReal(
  kind: RealEndKind = "result",
  times: DiscardTimes = T,
  realEndAt = 3000,
) {
  const f = new Flow(times);
  f.send({ type: "unlock" }, 0);
  expect(types(f.send({ type: "press" }, 0))).toContain("real-start");
  const fx = f.send({ type: "real-end", kind }, realEndAt);
  return {
    f,
    fx,
    id: has(fx, "discard-start") ? discardIdOf(fx) : 0,
    s: realEndAt,
  };
}

/** 버림 id 에 as 뒤 audiostart 를 주고 live_as 판정까지 돌린다(죽은 버림). */
function toDead(f: Flow, id: number, s: number, as = 30) {
  f.send({ type: "discard-audio", discard: id }, s + as);
  const fx = f.runUntil(s + f.times.liveAsMs);
  expect(f.state.phase).toBe("dead");
  return fx;
}

/** 읽기 하나: from 에 요청, +start 에 시작 알림, to 에 끝(heard). */
function read(f: Flow, id: number, from: number, to: number, heard = true) {
  const fx = f.send({ type: "speak-request", id }, from);
  f.send({ type: "speak-start", id }, from + (to - from) / 4);
  f.send({ type: "speak-end", id, heard }, to);
  return fx;
}

/** 죽은 버림에서 선생님 말 하나를 읽고 소리 끝을 알려 닫고, end 를 받은 뒤 간격 끝까지 돌린다. 진짜를 열 수 있는 시각을 돌려준다. */
function closeWithTeacher(f: Flow, id: number, s: number, endLag = 50) {
  read(f, 100 + id, s + f.times.liveAsMs + 10, s + f.times.liveAsMs + 2000);
  const soundEnd = s + f.times.liveAsMs + 2000;
  f.send({ type: "sound-end" }, soundEnd);
  const stopAt = Math.max(soundEnd + f.times.afterSoundMs, s + f.times.minMs);
  f.runUntil(stopAt);
  expect(f.find("discard-stop").at(-1)?.at).toBe(stopAt);
  f.send({ type: "discard-end", discard: id }, stopAt + endLag);
  const ready = Math.max(stopAt + endLag, soundEnd) + f.times.gapMs;
  f.runUntil(ready);
  expect(f.state.phase).toBe("rest");
  return { soundEnd, stopAt, ready };
}

describe("버리는 듣기 차례 기계 — 대기 · 쉰 뒤(F1 · I-4)", () => {
  it("버림 F1 쪽 첫 읽기는 세션 없이 흘리고, 읽기 끝 + gap 전 누름은 걸었다가 그 시각에 진짜를 연다(갈래 rest)", () => {
    const f = new Flow();
    const fx = read(f, 1, 0, 2000);
    expect(acts(fx)).toEqual(["speak-release"]);
    f.send({ type: "unlock" }, 2200);
    const press = f.send({ type: "press" }, 2200);
    expect(has(press, "real-start")).toBe(false);
    expect(f.lastView().waiting).toBe(true);
    const later = f.runUntil(2000 + T.gapMs);
    expect(types(later)).toEqual(["note", "real-start", "view"]);
    expect(f.find("real-start")[0].at).toBe(2000 + T.gapMs);
    expect(f.lastNote()).toEqual({ g: "rest", w: 2000 + T.gapMs - 2200 });
    expect(f.lastView()).toMatchObject({ waiting: false, sayNow: true });
    expect(f.find("discard-start")).toHaveLength(0);
  });

  it("버림 F1 읽기 끝 + gap 뒤 누름은 그 걸음에 진짜를 열고 기다림 칸 · '말해 보세요'가 없다", () => {
    const f = new Flow();
    read(f, 1, 0, 2000);
    f.send({ type: "unlock" }, 2000 + T.gapMs);
    const fx = f.send({ type: "press" }, 2000 + T.gapMs);
    expect(types(fx)).toContain("real-start");
    expect(f.lastNote()).toEqual({ g: "rest" });
    expect(f.state.view.sayNow).toBe(false);
  });

  it("버림 F1 마지막 세션 끝에서 speech.discard_rest_ms 가 지나면 읽기를 세션 없이 흘리고 진짜 dc 갈래는 rest 다", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const { ready } = closeWithTeacher(f, id, s);
    const endAt = f.state.lastDiscardEndAt ?? 0;
    const late = endAt + T.restMs + 500;
    const fx = read(f, 7, late, late + 1500);
    expect(acts(fx)).toEqual(["speak-release"]);
    expect(f.state.betweenRead).toBe(false);
    f.send({ type: "press" }, late + 1500 + T.gapMs);
    expect(f.find("real-start")).toHaveLength(2);
    expect(f.lastNote()).toEqual({ g: "rest" });
    expect(ready).toBeLessThan(late);
  });

  it("버림 잠금 풀기 전에는 누름 · 시각이 지나도 어떤 start 효과도 없다(I-4 · AC-5)", () => {
    const f = new Flow();
    read(f, 1, 0, 1000);
    f.send({ type: "press" }, 1500);
    f.runUntil(1000 + T.restMs * 2);
    f.send({ type: "tick" }, 1000 + T.restMs * 2);
    expect(f.find("real-start")).toHaveLength(0);
    expect(f.find("discard-start")).toHaveLength(0);
    const fx = f.send({ type: "unlock" }, 1000 + T.restMs * 2 + 10);
    expect(types(fx)).toContain("real-start");
  });
});

describe("버리는 듣기 차례 기계 — 진짜 끝 · 버림 확인(F2 · F3)", () => {
  it("버림 F2 진짜가 끝난 그 걸음에 버림 start 가 나오고(결과 · 모름 · deaf · 결과 없음), 끊김 · 마이크를 쓸 수 없음 뒤에는 없다(AC-5)", () => {
    for (const kind of [
      "result",
      "no-result",
      "error",
      "stalled",
      "deaf",
    ] as const) {
      const { fx } = afterReal(kind);
      expect(types(fx), kind).toContain("discard-start");
    }
    const interrupted = afterReal("interrupted");
    expect(has(interrupted.fx, "discard-start")).toBe(false);
    expect(interrupted.f.state.phase).toBe("reopen");
    const unavailable = afterReal("unavailable");
    expect(has(unavailable.fx, "discard-start")).toBe(false);
    // '마이크를 쓸 수 없음' 뒤의 버림부터는 마이크 확인(check)과 가르는 값으로 적는다(M-5).
    expect(unavailable.f.state.reopenWhy).toBe("no_mic");
  });

  it("버림 확인: 그동안 온 읽기는 보류했다가 live_as 판정 뒤 죽은 버림 안에서 흘린다", () => {
    const { f, id, s } = afterReal("result");
    expect(f.state.phase).toBe("probe");
    expect(types(f.send({ type: "speak-request", id: 5 }, s + 20))).toEqual([]);
    const fx = toDead(f, id, s);
    expect(types(fx)).toContain("speak-release");
    expect(f.find("speak-release").at(-1)?.at).toBe(s + T.liveAsMs);
  });

  it("버림 F3 audiostart 없음은 stop 으로 닫고(abort 없음) end 까지 읽기를 보류한 뒤 대기(live)에서 세션 없이 읽는다(AC-6)", () => {
    const { f, id, s } = afterReal("result");
    const fx = f.runUntil(s + T.liveAsMs);
    expect(types(fx)).toContain("discard-stop");
    expect(f.state.phase).toBe("closing");
    expect(types(f.send({ type: "speak-request", id: 5 }, s + 300))).toEqual(
      [],
    );
    const end = f.send({ type: "discard-end", discard: id }, s + 700);
    expect(types(end)).toContain("speak-release");
    expect(has(end, "discard-start")).toBe(false);
    expect(f.state.phase).toBe("rest");
    f.send({ type: "speak-start", id: 5 }, s + 800);
    f.send({ type: "speak-end", id: 5, heard: true }, s + 2500);
    f.send({ type: "press" }, s + 2500 + T.gapMs);
    expect(f.find("discard-start")).toHaveLength(1);
    expect(f.lastNote()).toMatchObject({
      g: "live",
      why: "live",
      sr: true,
      d: 700,
    });
    expect(f.lastNote().as).toBeUndefined();
    expect(f.log.map((l) => l.effect.type).join(" ")).not.toMatch(/abort/);
  });

  it("버림 F3 as 가 live_as 를 넘은 audiostart(as 260 꼴)도 살아 있는 버림이고 다음 진짜까지 버림을 다시 열지 않는다", () => {
    const { f, id, s } = afterReal("result");
    const late = s + T.liveAsMs + 10;
    const fx = f.send({ type: "discard-audio", discard: id }, late);
    expect(types(fx)).toContain("discard-stop");
    f.send({ type: "discard-end", discard: id }, late + 200);
    read(f, 6, late + 300, late + 1800);
    read(f, 7, late + 2000, late + 3000);
    expect(f.find("discard-start")).toHaveLength(1);
    f.send({ type: "press" }, late + 3000 + T.gapMs);
    expect(f.lastNote()).toMatchObject({
      g: "live",
      why: "live",
      as: T.liveAsMs + 10,
    });
  });

  it("버림 F3 같은 버림 안 첫 '들려주지 못함'은 연 채 다음 읽기를 그 안에서 흘리고, 둘째에 stop 한다(not_played · M-3)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const a = s + T.liveAsMs;
    f.send({ type: "speak-request", id: 1 }, a + 10);
    const first = f.send({ type: "speak-end", id: 1, heard: false }, a + 2000);
    expect(has(first, "discard-stop")).toBe(false);
    expect(types(f.send({ type: "speak-request", id: 2 }, a + 2100))).toEqual([
      "speak-release",
    ]);
    const second = f.send({ type: "speak-end", id: 2, heard: false }, a + 4000);
    expect(types(second)).toContain("discard-stop");
    f.send({ type: "discard-end", discard: id }, a + 4100);
    f.send({ type: "press" }, a + 4100 + T.gapMs);
    expect(f.lastNote()).toMatchObject({
      g: "live",
      why: "not_played",
      np: 2,
      sk: "none",
    });
  });
});

describe("버리는 듣기 차례 기계 — 버림 안 소리 · 닫기(F4 · F5 · F6)", () => {
  it("버림 F4 소리 없는 죽은 버림은 하한이 지나도 stop 하지 않고, 걸린 누름에 짧은 말(again)을 부른 뒤 그 소리 끝에 닫는다(AC-3 · AC-5)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    f.runUntil(s + T.minMs * 4);
    expect(f.find("discard-stop")).toHaveLength(0);
    const p = s + T.minMs * 4;
    const press = f.send({ type: "press" }, p);
    expect(press).toContainEqual({ type: "need-sound", kind: "again" });
    expect(f.lastView().waiting).toBe(true);
    expect(f.runUntil(p + T.minMs)).toEqual([]);
    const q = p + T.minMs;
    f.send({ type: "speak-request", id: 9, sound: "short" }, q + 5);
    f.send({ type: "speak-start", id: 9 }, q + 100);
    f.send({ type: "speak-end", id: 9, heard: true }, q + 1800);
    expect(f.find("discard-stop")).toHaveLength(0);
    f.send({ type: "sound-end" }, q + 1800);
    f.runUntil(q + 1800 + T.afterSoundMs);
    expect(f.find("discard-stop")[0].at).toBe(q + 1800 + T.afterSoundMs);
    f.send({ type: "discard-end", discard: id }, q + 2200);
    f.runUntil(q + 2200 + T.gapMs);
    expect(f.find("real-start").at(-1)?.at).toBe(q + 2200 + T.gapMs);
    expect(f.lastNote()).toMatchObject({
      g: "discard",
      why: "sound",
      sk: "short",
    });
  });

  it("버림 F4 걸린 누름 동안 부른 짧은 말이 처음 '들려주지 못함'이면 그 걸음에 cancel 뒤 한 번 더 부르고, 그 소리 끝 + after · 하한에 닫아 안전 상한 전에 진짜를 연다(fix 2 · AC-6)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const p = s + T.liveAsMs + 10;
    expect(f.send({ type: "press" }, p)).toContainEqual({
      type: "need-sound",
      kind: "again",
    });
    f.send({ type: "speak-request", id: 9, sound: "short" }, p + 5);
    const first = f.send({ type: "speak-end", id: 9, heard: false }, p + 1500);
    expect(acts(first)).toEqual(["cancel-speaking", "need-sound"]);
    expect(first).toContainEqual({ type: "need-sound", kind: "again" });
    expect(f.find("need-sound")).toHaveLength(2);
    expect(f.state.phase).toBe("dead");
    expect(f.lastView().waiting).toBe(true);
    // 한 번 더 부른 짧은 말이 오기 전에는 같은 자리에서 다시 부르지 않는다.
    expect(has(f.send({ type: "tick" }, p + 1510), "need-sound")).toBe(false);
    const q = p + 1520;
    f.send({ type: "speak-request", id: 10, sound: "short" }, q);
    f.send({ type: "speak-start", id: 10 }, q + 100);
    f.send({ type: "speak-end", id: 10, heard: true }, q + 1800);
    expect(f.find("discard-stop")).toHaveLength(0);
    const shortEnd = q + 1800;
    f.send({ type: "sound-end" }, shortEnd);
    const stopAt = Math.max(shortEnd + T.afterSoundMs, s + T.minMs);
    f.runUntil(stopAt);
    expect(f.find("discard-stop").map((l) => l.at)).toEqual([stopAt]);
    f.send({ type: "discard-end", discard: id }, stopAt + 50);
    f.runUntil(stopAt + 50 + T.gapMs);
    const real = f.find("real-start");
    expect(real.at(-1)?.at).toBe(stopAt + 50 + T.gapMs);
    expect(real.at(-1)?.at).toBeLessThan(s + T.capMs);
    expect(f.find("need-sound")).toHaveLength(2);
    expect(f.lastNote()).toMatchObject({
      g: "discard",
      why: "sound",
      sk: "short",
      np: 1,
    });
  });

  it("버림 F4 걸린 누름 동안 한 번 더 부른 짧은 말도 '들려주지 못함'이면 살아 있는 버림으로 stop 하고(abort 없음) 대기(live)에서 간격 뒤 진짜를 연다(fix 2 · F3)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const p = s + T.liveAsMs + 10;
    f.send({ type: "press" }, p);
    f.send({ type: "speak-request", id: 9, sound: "short" }, p + 5);
    f.send({ type: "speak-end", id: 9, heard: false }, p + 1500);
    f.send({ type: "speak-request", id: 10, sound: "short" }, p + 1505);
    const second = f.send(
      { type: "speak-end", id: 10, heard: false },
      p + 3000,
    );
    expect(acts(second)).toEqual(["discard-stop"]);
    expect(f.find("need-sound")).toHaveLength(2);
    expect(f.state.phase).toBe("closing");
    f.send({ type: "discard-end", discard: id }, p + 3100);
    expect(f.state.phase).toBe("rest");
    f.runUntil(p + 3100 + T.gapMs);
    expect(f.find("real-start").at(-1)?.at).toBe(p + 3100 + T.gapMs);
    expect(f.find("need-sound")).toHaveLength(2);
    expect(f.lastNote()).toMatchObject({
      g: "live",
      why: "not_played",
      np: 2,
      sk: "none",
    });
  });

  it("버림 F4 따라 말하기(누름 없음)에서 again 으로 부른 들려줄 말이 처음 '들려주지 못함'이면 그 걸음에 cancel 뒤 한 번 더 부르고, 그 소리 끝 + after · 하한에 닫아 안전 상한 전에 canListen 이 참이 된다(fix 3 · 설계 1 '버림' 행 · AC-6)", () => {
    const { f, id, s } = afterReal("no-result");
    f.send({ type: "again" }, s + 5);
    expect(toDead(f, id, s)).toContainEqual({
      type: "need-sound",
      kind: "again",
    });
    const a = s + T.liveAsMs;
    f.send({ type: "speak-request", id: 9, sound: "word" }, a + 5);
    const first = f.send({ type: "speak-end", id: 9, heard: false }, a + 1500);
    expect(acts(first)).toEqual(["cancel-speaking", "need-sound"]);
    expect(first).toContainEqual({ type: "need-sound", kind: "again" });
    expect(f.state.phase).toBe("dead");
    expect(f.lastView().waiting).toBe(false);
    // 한 번 더 부른 들려줄 말이 오기 전에는 같은 자리에서 다시 부르지 않는다.
    expect(has(f.send({ type: "tick" }, a + 1510), "need-sound")).toBe(false);
    const q = a + 1520;
    f.send({ type: "speak-request", id: 10, sound: "word" }, q);
    f.send({ type: "speak-start", id: 10 }, q + 100);
    f.send({ type: "speak-end", id: 10, heard: true }, q + 1800);
    expect(f.find("discard-stop")).toHaveLength(0);
    const soundEnd = q + 1800;
    f.send({ type: "sound-end" }, soundEnd);
    const stopAt = Math.max(soundEnd + T.afterSoundMs, s + T.minMs);
    f.runUntil(stopAt);
    expect(f.find("discard-stop").map((l) => l.at)).toEqual([stopAt]);
    f.send({ type: "discard-end", discard: id }, stopAt + 50);
    const ready = Math.max(stopAt + 50, soundEnd) + T.gapMs;
    f.runUntil(ready);
    const flips = f.find("view").filter((v) => v.effect.view.canListen);
    expect(flips.at(-1)?.at).toBe(ready);
    expect(ready).toBeLessThan(s + T.capMs);
    expect(f.state.phase).toBe("rest");
    expect(f.find("need-sound")).toHaveLength(2);
    expect(f.find("real-start")).toHaveLength(1);
  });

  it("버림 F4 '잘 모르겠어요'로 턴을 보낸 뒤에는 부른 소리가 '들려주지 못함'이어도 다시 부르지 않는다(fix 3 재검토 N-5)", () => {
    const { f, id, s } = afterReal("no-result");
    f.send({ type: "again" }, s + 5);
    toDead(f, id, s);
    const a = s + T.liveAsMs;
    f.send({ type: "speak-request", id: 9, sound: "word" }, a + 5);
    f.send({ type: "dont-know" }, a + 500);
    const end = f.send({ type: "speak-end", id: 9, heard: false }, a + 1500);
    expect(has(end, "need-sound")).toBe(false);
    expect(has(end, "cancel-speaking")).toBe(false);
    expect(f.find("need-sound")).toHaveLength(1);
  });

  it("버림 F4 따라 말하기(누름 없음)에서 한 번 더 부른 들려줄 말도 '들려주지 못함'이면 살아 있는 버림으로 stop 하고(abort 없음) 간격 뒤 canListen 이 참이 된다(fix 3 · F3)", () => {
    const { f, id, s } = afterReal("no-result");
    f.send({ type: "again" }, s + 5);
    toDead(f, id, s);
    const a = s + T.liveAsMs;
    f.send({ type: "speak-request", id: 9, sound: "word" }, a + 5);
    f.send({ type: "speak-end", id: 9, heard: false }, a + 1500);
    f.send({ type: "speak-request", id: 10, sound: "word" }, a + 1505);
    const second = f.send(
      { type: "speak-end", id: 10, heard: false },
      a + 3000,
    );
    expect(acts(second)).toEqual(["discard-stop"]);
    expect(f.find("need-sound")).toHaveLength(2);
    expect(f.state.phase).toBe("closing");
    f.send({ type: "discard-end", discard: id }, a + 3100);
    expect(f.state.phase).toBe("rest");
    expect(f.lastView().canListen).toBe(false);
    const ready = a + 3100 + T.gapMs;
    f.runUntil(ready);
    const flips = f.find("view").filter((v) => v.effect.view.canListen);
    expect(flips.at(-1)?.at).toBe(ready);
    expect(ready).toBeLessThan(s + T.capMs);
    expect(f.find("need-sound")).toHaveLength(2);
    expect(f.find("real-start")).toHaveLength(1);
  });

  it("버림 F4 화면이 보낸 선생님 읽기의 첫 '들려주지 못함'은 누름이 없으면 효과가 없고 다음 읽기에 맡기며, 그 뒤 누르면 짧은 말을 처음 부른다(fix 3 · 설계 1 '버림' 행)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const a = s + T.liveAsMs;
    f.send({ type: "speak-request", id: 9 }, a + 5);
    const first = f.send({ type: "speak-end", id: 9, heard: false }, a + 1500);
    expect(acts(first)).toEqual([]);
    expect(f.runUntil(a + 1500 + T.minMs)).toEqual([]);
    expect(f.find("need-sound")).toHaveLength(0);
    const p = a + 1500 + T.minMs;
    const press = f.send({ type: "press" }, p);
    expect(acts(press)).toEqual(["need-sound"]);
    expect(f.find("need-sound")).toHaveLength(1);
    expect(has(f.send({ type: "tick" }, p + 10), "need-sound")).toBe(false);
  });

  it("버림 F4 진짜 결과 종류만으로는 소리를 부르지 않고(결과 · 말소리 없음 · 오류 · 감시 멈춤 · deaf), 화면의 다시 말할 차례(again)가 판정 앞이든 뒤든 한 번 부른다(I-1)", () => {
    for (const kind of [
      "result",
      "no-result",
      "error",
      "stalled",
      "deaf",
    ] as const) {
      const { f, id, s } = afterReal(kind);
      expect(has(toDead(f, id, s), "need-sound"), kind).toBe(false);
      expect(f.lastView().recovering, kind).toBe(false);
    }
    for (const before of [true, false]) {
      const { f, id, s } = afterReal("no-result");
      if (before) f.send({ type: "again" }, s + 20);
      const dead = toDead(f, id, s);
      const after = before ? [] : f.send({ type: "again" }, s + T.liveAsMs + 5);
      expect([...dead, ...after]).toContainEqual({
        type: "need-sound",
        kind: "again",
      });
      f.send({ type: "again" }, s + T.liveAsMs + 50);
      f.send({ type: "press" }, s + T.liveAsMs + 60);
      expect(f.find("need-sound"), String(before)).toHaveLength(1);
    }
  });

  it("버림 F4 다시 말할 차례 다섯(대화 다시 말하기 · 말소리 없음 · 다시 듣는 오류 · 쪽지 다시 · deaf 회복)마다 소리 요청이 하나 나오고 그 소리 끝 전에는 stop 이 없다(AC-24c)", () => {
    const turns: {
      name: string;
      kind: RealEndKind;
      inputs: DiscardFlowInput[];
      sound: "again" | "mic";
    }[] = [
      {
        name: "대화 다시 말하기",
        kind: "result",
        inputs: [{ type: "again" }, { type: "press" }],
        sound: "again",
      },
      {
        name: "말소리 없음",
        kind: "no-result",
        inputs: [{ type: "again" }],
        sound: "again",
      },
      {
        name: "다시 듣는 오류",
        kind: "error",
        inputs: [{ type: "again" }],
        sound: "again",
      },
      {
        name: "쪽지 다시",
        kind: "no-result",
        inputs: [{ type: "again" }],
        sound: "again",
      },
      {
        name: "deaf 회복",
        kind: "deaf",
        inputs: [{ type: "press", auto: true }],
        sound: "mic",
      },
    ];
    for (const turn of turns) {
      const { f, id, s } = afterReal(turn.kind);
      for (const input of turn.inputs) f.send(input, s + 20);
      toDead(f, id, s);
      const asked = f.find("need-sound");
      expect(
        asked.map((a) => a.effect.kind),
        turn.name,
      ).toEqual([turn.sound]);
      f.runUntil(s + T.capMs - 1);
      expect(f.find("discard-stop"), turn.name).toHaveLength(0);
    }
  });

  it("버림 F5 소리 끝 알림 없이 줄이 빈 틈(문장 사이 쉼 · 흘러 오는 문장 틈 · 앱 줄을 넣기 전)에는 stop 하지 않는다(I-3)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const a = s + T.liveAsMs;
    read(f, 1, a + 10, a + 1500);
    f.runUntil(a + 1500 + T.afterSoundMs + T.minMs);
    read(f, 2, a + 4000, a + 5000);
    expect(f.find("discard-stop")).toHaveLength(0);
    // 알림 뒤 여유 안에 새 읽기(다시 듣기 꼴)가 오면 알림을 거두고, 그 읽기 뒤 새 알림을 기다린다.
    f.send({ type: "sound-end" }, a + 5000);
    read(f, 3, a + 5000 + T.afterSoundMs / 2, a + 7000);
    f.runUntil(a + 7000 + T.afterSoundMs * 3);
    expect(f.find("discard-stop")).toHaveLength(0);
    const fx = f.send({ type: "sound-end" }, a + 9000);
    expect(types(fx)).toContain("discard-stop");
  });

  it("버림 F5 알림 뒤 소리 끝 + after 와 버림 start + min 을 둘 다 채운 때에만 stop 한다", () => {
    const short = afterReal("result");
    toDead(short.f, short.id, short.s);
    const a = short.s + T.liveAsMs;
    read(short.f, 1, a + 1, a + 2);
    short.f.send({ type: "sound-end" }, a + 2);
    const minAt = short.s + T.minMs;
    expect(short.f.runUntil(minAt - 1)).toEqual([]);
    short.f.runUntil(minAt);
    expect(short.f.find("discard-stop")[0].at).toBe(
      Math.max(minAt, a + 2 + T.afterSoundMs),
    );

    const long = afterReal("result");
    toDead(long.f, long.id, long.s);
    const b = long.s + T.liveAsMs;
    read(long.f, 1, b + 10, b + 3000);
    long.f.send({ type: "sound-end" }, b + 3000);
    expect(long.f.step.wakeAt).toBe(b + 3000 + T.afterSoundMs);
    long.f.runUntil(b + 3000 + T.afterSoundMs);
    expect(long.f.find("discard-stop")[0].at).toBe(b + 3000 + T.afterSoundMs);
  });

  it("버림 F6 진짜는 버림 end + gap 뒤에 열리고, end 가 오지 않으면 stop + end 상한을 end 로 본다(AC-7)", () => {
    const a = afterReal("result");
    toDead(a.f, a.id, a.s);
    read(a.f, 1, a.s + T.liveAsMs + 10, a.s + 3000);
    a.f.send({ type: "sound-end" }, a.s + 3000);
    a.f.runUntil(a.s + 3000 + T.afterSoundMs);
    const stopAt = a.s + 3000 + T.afterSoundMs;
    a.f.send({ type: "press" }, stopAt + 50);
    expect(a.f.lastView().waiting).toBe(true);
    a.f.send({ type: "discard-end", discard: a.id }, stopAt + 200);
    a.f.runUntil(stopAt + 200 + T.gapMs);
    expect(a.f.find("real-start").at(-1)?.at).toBe(stopAt + 200 + T.gapMs);
    expect(a.f.lastNote()).toMatchObject({ w: 150 + T.gapMs });

    const b = afterReal("result");
    toDead(b.f, b.id, b.s);
    read(b.f, 1, b.s + T.liveAsMs + 10, b.s + 3000);
    b.f.send({ type: "sound-end" }, b.s + 3000);
    b.f.runUntil(b.s + 3000 + T.afterSoundMs);
    b.f.send({ type: "press" }, b.s + 3000 + T.afterSoundMs + 10);
    b.f.runUntil(b.s + 3000 + T.afterSoundMs + T.endWaitMs + T.gapMs);
    expect(b.f.find("real-start").at(-1)?.at).toBe(
      b.s + 3000 + T.afterSoundMs + T.endWaitMs + T.gapMs,
    );
    expect(b.f.lastNote().d).toBe(3000 + T.afterSoundMs + T.endWaitMs);
  });

  it("버림 굳은 읽기: 진짜를 열 때 speaking 이 참이면 cancel 을 한 번 부르고 after 를 기다린 뒤 그대로 열고, 그 안에 거짓이 되면 바로 연다", () => {
    for (const recover of [false, true]) {
      const { f, id, s } = afterReal("result");
      toDead(f, id, s);
      const { stopAt } = closeWithTeacherWithPress(f, id, s);
      const ready = stopAt + 50 + T.gapMs;
      f.send({ type: "synth", speaking: true }, ready - 10);
      const at = f.runUntil(ready);
      expect(types(at)).toEqual(["cancel-speaking"]);
      expect(f.find("real-start")).toHaveLength(1);
      if (recover) {
        const fx = f.send({ type: "synth", speaking: false }, ready + 100);
        expect(types(fx)).toContain("real-start");
      } else {
        f.runUntil(ready + T.afterSoundMs);
        expect(f.find("real-start").at(-1)?.at).toBe(ready + T.afterSoundMs);
        expect(f.find("cancel-speaking")).toHaveLength(1);
      }
    }
  });
});

/** closeWithTeacher 와 같으나 stop 직후 누름을 걸어 두고 간격에서 멈춘다. */
function closeWithTeacherWithPress(f: Flow, id: number, s: number) {
  const soundEnd = s + f.times.liveAsMs + 2000;
  read(f, 100 + id, s + f.times.liveAsMs + 10, soundEnd);
  f.send({ type: "sound-end" }, soundEnd);
  const stopAt = Math.max(soundEnd + f.times.afterSoundMs, s + f.times.minMs);
  f.runUntil(stopAt);
  f.send({ type: "press" }, stopAt + 10);
  f.send({ type: "discard-end", discard: id }, stopAt + 50);
  expect(f.state.phase).toBe("gap");
  return { soundEnd, stopAt };
}

describe("버리는 듣기 차례 기계 — 읽기 보류 · 읽는 중 누름(F7 · F8 · F9)", () => {
  it("버림 F7 읽기를 흘리는 걸음에는 버림 stop · 끊기가 없다(AC-8)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const fx = f.send({ type: "speak-request", id: 1 }, s + T.liveAsMs + 5);
    expect(types(fx)).toEqual(["speak-release"]);
  });

  it("버림 F8 진짜 동안 온 읽기는 보류했다가 다음 버림이 죽은 버림으로 판정된 뒤 그 안에서 흘린다(I-1 · AC-7)", () => {
    const f = new Flow();
    f.send({ type: "unlock" }, 0);
    f.send({ type: "press" }, 0);
    expect(types(f.send({ type: "speak-request", id: 4 }, 500))).toEqual([]);
    const end = f.send({ type: "real-end", kind: "result" }, 3000);
    expect(has(end, "speak-release")).toBe(false);
    const id = discardIdOf(end);
    const fx = toDead(f, id, 3000);
    expect(types(fx)).toContain("speak-release");
    expect(f.find("speak-release").at(-1)?.at).toBe(3000 + T.liveAsMs);
  });

  it("버림 F8 진짜 동안 온 읽기는 다음 버림이 살아 있으면 그 end 뒤 대기(live)에서 흘린다", () => {
    const f = new Flow();
    f.send({ type: "unlock" }, 0);
    f.send({ type: "press" }, 0);
    f.send({ type: "speak-request", id: 4 }, 500);
    const id = discardIdOf(f.send({ type: "real-end", kind: "result" }, 3000));
    expect(types(f.runUntil(3000 + T.liveAsMs))).toEqual(["discard-stop"]);
    expect(types(f.send({ type: "discard-end", discard: id }, 3600))).toContain(
      "speak-release",
    );
  });

  it("버림 F8 닫는 중 · 간격 동안 온 읽기는 간격 끝 대기에서 버림 start 없이 흘리고, 진짜는 그 소리 끝 + gap 뒤 · dc sr 참이다(M-2)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const soundEnd = s + T.liveAsMs + 2000;
    read(f, 1, s + T.liveAsMs + 10, soundEnd);
    f.send({ type: "sound-end" }, soundEnd);
    const stopAt = soundEnd + T.afterSoundMs;
    f.runUntil(stopAt);
    expect(
      types(f.send({ type: "speak-request", id: 2 }, stopAt + 20)),
    ).toEqual([]);
    f.send({ type: "discard-end", discard: id }, stopAt + 100);
    expect(
      types(f.send({ type: "speak-request", id: 3 }, stopAt + 200)),
    ).toEqual([]);
    const at = f.runUntil(stopAt + 100 + T.gapMs);
    expect(types(at)).toEqual(["speak-release", "speak-release"]);
    f.send({ type: "speak-start", id: 2 }, stopAt + 100 + T.gapMs + 50);
    f.send({ type: "speak-end", id: 2, heard: true }, stopAt + 3000);
    f.send({ type: "speak-end", id: 3, heard: false }, stopAt + 3000);
    f.send({ type: "press" }, stopAt + 3000 + 10);
    expect(f.find("real-start")).toHaveLength(1);
    f.runUntil(stopAt + 3000 + T.gapMs);
    expect(f.find("real-start").at(-1)?.at).toBe(stopAt + 3000 + T.gapMs);
    expect(f.find("discard-start")).toHaveLength(1);
    expect(f.lastNote()).toMatchObject({
      g: "discard",
      sr: true,
      why: "sound",
    });
  });

  it("버림 F9 시작 알림 뒤 읽는 중 누름은 cancel 뒤 끊긴 소리(cut) 끝 + after · 하한에 stop 하고 end + gap 에 진짜를 연다(AC-2 · AC-8)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const a = s + T.liveAsMs;
    f.send({ type: "speak-request", id: 1 }, a + 10);
    f.send({ type: "speak-start", id: 1 }, a + 150);
    const p = a + 650;
    const press = f.send({ type: "press" }, p);
    expect(types(press)).toEqual(["cancel-speaking", "view"]);
    expect(f.lastView().waiting).toBe(true);
    f.send({ type: "speak-end", id: 1, heard: true }, p + 20);
    const stopAt = Math.max(p + T.afterSoundMs, s + T.minMs);
    f.runUntil(stopAt);
    expect(f.find("discard-stop")[0].at).toBe(stopAt);
    f.send({ type: "discard-end", discard: id }, stopAt + 40);
    f.runUntil(stopAt + 40 + T.gapMs);
    expect(f.find("real-start").at(-1)?.at).toBe(stopAt + 40 + T.gapMs);
    expect(f.lastNote()).toMatchObject({
      g: "discard",
      why: "sound",
      sk: "cut",
    });
    expect(f.lastView()).toMatchObject({ waiting: false, sayNow: true });
  });

  it("버림 F9 시작 알림 전 읽는 중 누름은 cancel 뒤 짧은 말을 부르고, 그 끝 알림 뒤에야 닫고 진짜를 연다(AC-8)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const a = s + T.liveAsMs;
    read(f, 1, a + 10, a + 1000);
    f.send({ type: "speak-request", id: 2 }, a + 1100);
    const p = a + 1150;
    const press = f.send({ type: "press" }, p);
    expect(types(press)).toEqual(["cancel-speaking", "need-sound", "view"]);
    f.runUntil(p + T.minMs + T.afterSoundMs);
    expect(f.find("discard-stop")).toHaveLength(0);
    read(
      f,
      3,
      p + T.minMs + T.afterSoundMs + 1,
      p + T.minMs + T.afterSoundMs + 2000,
    );
    const shortEnd = p + T.minMs + T.afterSoundMs + 2000;
    f.send({ type: "sound-end" }, shortEnd);
    f.runUntil(shortEnd + T.afterSoundMs);
    expect(f.find("discard-stop")[0].at).toBe(shortEnd + T.afterSoundMs);
  });

  it("버림 F9 시작 알림 전 읽기를 틀이 끊은(cut) 뒤 온 누름도, 앞 줄을 이미 들려준 버림에서 짧은 말을 부르고 그 끝 알림 뒤에야 닫는다(AC-8)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const a = s + T.liveAsMs;
    read(f, 1, a + 10, a + 1000);
    f.send({ type: "speak-request", id: 2 }, a + 1100);
    // 틀은 누름 때 listen 앞에 읽기 줄을 비운다(queue.cancel → 층 cut).
    f.send({ type: "cut", started: false }, a + 1140);
    const p = a + 1150;
    const press = f.send({ type: "press" }, p);
    expect(types(press)).toEqual(["need-sound", "view"]);
    f.runUntil(p + T.minMs + T.afterSoundMs);
    expect(f.find("discard-stop")).toHaveLength(0);
    read(
      f,
      3,
      p + T.minMs + T.afterSoundMs + 1,
      p + T.minMs + T.afterSoundMs + 2000,
    );
    const shortEnd = p + T.minMs + T.afterSoundMs + 2000;
    f.send({ type: "sound-end" }, shortEnd);
    f.runUntil(shortEnd + T.afterSoundMs);
    expect(f.find("discard-stop")[0].at).toBe(shortEnd + T.afterSoundMs);
  });

  it("버림 F9 시작 전 끊김(cut) 뒤 다른 줄이 들린 다음의 누름은 짧은 말 없이 F5 로 닫는다", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const a = s + T.liveAsMs;
    read(f, 1, a + 10, a + 1000);
    f.send({ type: "speak-request", id: 2 }, a + 1100);
    f.send({ type: "cut", started: false }, a + 1140);
    read(f, 3, a + 1200, a + 2200);
    const p = a + 2300;
    const press = f.send({ type: "press" }, p);
    expect(types(press)).not.toContain("need-sound");
    const stopAt = Math.max(a + 2200 + T.afterSoundMs, s + T.minMs, p);
    f.runUntil(stopAt + T.afterSoundMs);
    expect(f.find("need-sound")).toHaveLength(0);
    expect(f.find("discard-stop")).toHaveLength(1);
  });
});

describe("버리는 듣기 차례 기계 — 기다리는 누름 · 회복(F10)", () => {
  it("버림 기다리는 누름: 걸린 동안 다시 누름은 하나로 세고, '잘 모르겠어요'는 걸린 누름을 거두며 버림은 그대로다", () => {
    const one = afterReal("result");
    toDead(one.f, one.id, one.s);
    const { stopAt } = closeWithTeacherWithPress(one.f, one.id, one.s);
    one.f.send({ type: "press" }, stopAt + 60);
    one.f.send({ type: "press" }, stopAt + 70);
    one.f.runUntil(stopAt + 50 + T.gapMs * 3);
    expect(one.f.find("real-start")).toHaveLength(2);

    const two = afterReal("result");
    toDead(two.f, two.id, two.s);
    two.f.send({ type: "press" }, two.s + T.liveAsMs + 10);
    two.f.send({ type: "dont-know" }, two.s + T.liveAsMs + 20);
    expect(two.f.lastView().waiting).toBe(false);
    expect(two.f.state.phase).toBe("dead");
    two.f.runUntil(two.s + T.capMs / 2);
    expect(two.f.find("real-start")).toHaveLength(1);
  });

  it("버림 F10 deaf 끝 뒤 화면이 누름 없는 듣기(auto)를 걸면 회복 표시를 켜고 판정 뒤 짧은 말(mic)을 부르며, 그 소리 끝 + 간격에 진짜를 연다(AC-24c)", () => {
    const { f, id, s } = afterReal("deaf");
    expect(f.lastView().recovering).toBe(false);
    f.send({ type: "press", auto: true }, s + 20);
    expect(f.lastView()).toMatchObject({ recovering: true, waiting: true });
    const fx = toDead(f, id, s);
    expect(fx).toContainEqual({ type: "need-sound", kind: "mic" });
    read(f, 9, s + T.liveAsMs + 10, s + T.liveAsMs + 1800);
    f.send({ type: "sound-end" }, s + T.liveAsMs + 1800);
    const stopAt = s + T.liveAsMs + 1800 + T.afterSoundMs;
    f.runUntil(stopAt);
    f.send({ type: "discard-end", discard: id }, stopAt + 30);
    f.runUntil(stopAt + 30 + T.gapMs);
    expect(f.find("real-start")).toHaveLength(2);
    expect(f.lastView()).toMatchObject({ recovering: false, sayNow: true });
  });

  it("버림 F10 회복은 앞 진짜가 deaf 일 때의 auto 누름에만 켜지고, '잘 모르겠어요' · 떠남이 거둔다", () => {
    const plain = afterReal("no-result");
    plain.f.send({ type: "press", auto: true }, plain.s + 20);
    expect(plain.f.lastView().recovering).toBe(false);
    const manual = afterReal("deaf");
    manual.f.send({ type: "press" }, manual.s + 20);
    expect(manual.f.lastView().recovering).toBe(false);
    for (const input of [{ type: "dont-know" }, { type: "leave" }] as const) {
      const { f, id, s } = afterReal("deaf");
      f.send({ type: "press", auto: true }, s + 20);
      toDead(f, id, s);
      expect(f.lastView().recovering, input.type).toBe(true);
      f.send(input, s + T.liveAsMs + 100);
      expect(f.lastView().recovering, input.type).toBe(false);
    }
  });

  it("버림 F10 다시 말할 차례가 아닌 자리(deaf 가 speech.deaf_skip_after 번째 · 말소리 없음 넘김 · 따라 말하기 건너뜀)는 소리 요청 0 · 회복 거짓이고 진짜가 저절로 열리지 않는다(I-1 · AC-24c)", () => {
    const places: {
      name: string;
      kind: RealEndKind;
      follow?: DiscardFlowInput;
    }[] = [
      {
        name: "deaf 가 deaf_skip_after 번째(대화 · 따라 말하기)",
        kind: "deaf",
      },
      {
        name: "말소리 없음 넘김",
        kind: "no-result",
        follow: { type: "dont-know" },
      },
      { name: "따라 말하기 건너뜀", kind: "no-result" },
    ];
    for (const place of places) {
      const { f, id, s } = afterReal(place.kind);
      if (place.follow) f.send(place.follow, s + 10);
      toDead(f, id, s);
      f.runUntil(s + T.capMs * 2);
      expect(f.find("need-sound"), place.name).toHaveLength(0);
      expect(
        f.find("view").some((v) => v.effect.view.recovering),
        place.name,
      ).toBe(false);
      expect(f.find("real-start"), place.name).toHaveLength(1);
    }
  });
});

describe("버리는 듣기 차례 기계 — 숨김 · 떠남 · 저절로 끝남 · 안전 상한(F11 · I-2 · M-4)", () => {
  it("버림 F11 숨김: 열린 버림은 음성 접점이 끊으니 stop 을 내지 않고 end 뒤 버림부터, rest 안 누름은 버림 → 짧은 말 → 진짜(reopen · hidden, AC-9)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const hidden = f.send({ type: "hidden" }, s + 500);
    expect(has(hidden, "discard-stop")).toBe(false);
    f.send({ type: "discard-end", discard: id }, s + 520);
    expect(f.state.phase).toBe("reopen");
    f.send({ type: "visible" }, s + 5000);
    const press = f.send({ type: "press" }, s + 6000);
    expect(types(press)).toContain("discard-start");
    const second = discardIdOf(press);
    const dead = toDead(f, second, s + 6000);
    expect(dead).toContainEqual({ type: "need-sound", kind: "again" });
    read(f, 9, s + 6000 + T.liveAsMs + 10, s + 8000);
    f.send({ type: "sound-end" }, s + 8000);
    f.runUntil(s + 8000 + T.afterSoundMs);
    f.send({ type: "discard-end", discard: second }, s + 8400);
    f.runUntil(s + 8400 + T.gapMs);
    expect(f.find("real-start")).toHaveLength(2);
    expect(f.lastNote()).toMatchObject({
      g: "reopen",
      rw: "hidden",
      why: "sound",
    });
  });

  it("버림 F11 숨김 뒤 마지막 세션 끝에서 rest 가 지나면 누름에 곧바로 진짜다(갈래 rest)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    f.send({ type: "hidden" }, s + 500);
    f.send({ type: "discard-end", discard: id }, s + 520);
    f.send({ type: "visible" }, s + 520 + T.restMs);
    const fx = f.send({ type: "press" }, s + 520 + T.restMs + 1);
    expect(types(fx)).toContain("real-start");
    expect(has(fx, "discard-start")).toBe(false);
    expect(f.lastNote()).toEqual({ g: "rest" });
  });

  it("버림 F11 진짜 중 숨김은 끊김 뒤 버림을 열지 않고, 걸린 누름 · 보류한 읽기는 거둔다", () => {
    const f = new Flow();
    f.send({ type: "unlock" }, 0);
    f.send({ type: "press" }, 0);
    f.send({ type: "hidden" }, 1000);
    const end = f.send(
      { type: "real-end", kind: "interrupted", why: "hidden" },
      1001,
    );
    expect(has(end, "discard-start")).toBe(false);
    expect(f.state).toMatchObject({ phase: "reopen", reopenWhy: "hidden" });

    const g = afterReal("result");
    toDead(g.f, g.id, g.s);
    const { stopAt } = closeWithTeacherWithPress(g.f, g.id, g.s);
    g.f.send({ type: "speak-request", id: 77 }, stopAt + 60);
    const hidden = g.f.send({ type: "hidden" }, stopAt + 70);
    expect(hidden).toContainEqual({ type: "press-drop", reason: "hidden" });
    expect(hidden).toContainEqual({ type: "speak-drop", id: 77 });
    g.f.runUntil(stopAt + T.gapMs * 3);
    expect(g.f.find("real-start")).toHaveLength(1);
  });

  it("버림 떠남(쉬는 안내 · 막힘 · 마무리): 열린 버림에 stop 을 한 번 내고 그 뒤 버림부터다(AC-9)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const leave = f.send({ type: "leave" }, s + 900);
    expect(leave.filter((e) => e.type === "discard-stop")).toHaveLength(1);
    f.send({ type: "leave" }, s + 950);
    f.send({ type: "discard-end", discard: id }, s + 1000);
    expect(f.state).toMatchObject({ phase: "reopen", reopenWhy: "leave" });
    expect(f.find("discard-stop")).toHaveLength(1);
  });

  it("버림 저절로 끝남: 소리 전이면 버림부터(self_end)이고 다음 읽기 앞에 버림을 다시 연다(AC-6 · I-2)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    f.send({ type: "discard-end", discard: id }, s + 800);
    expect(f.state).toMatchObject({ phase: "reopen", reopenWhy: "self_end" });
    const req = f.send({ type: "speak-request", id: 1 }, s + 2000);
    expect(types(req)).toEqual(["discard-start", "view"]);
    const second = discardIdOf(req);
    expect(types(toDead(f, second, s + 2000))).toContain("speak-release");
    f.send({ type: "speak-start", id: 1 }, s + 2400);
    f.send({ type: "speak-end", id: 1, heard: true }, s + 4000);
    f.send({ type: "sound-end" }, s + 4000);
    f.runUntil(s + 4000 + T.afterSoundMs);
    f.send({ type: "discard-end", discard: second }, s + 4400);
    f.send({ type: "press" }, s + 4400 + T.gapMs);
    expect(f.lastNote()).toMatchObject({
      g: "reopen",
      rw: "self_end",
      why: "sound",
    });
  });

  it("버림 저절로 끝남: '버림부터'에서 연 버림도 소리 전에 끝나면 다시 열지 않고 대기(live)로 간다(되풀이 막음)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    f.send({ type: "discard-end", discard: id }, s + 800);
    const second = discardIdOf(f.send({ type: "press" }, s + 1000));
    toDead(f, second, s + 1000);
    f.send({ type: "discard-end", discard: second }, s + 1300);
    expect(f.state).toMatchObject({ phase: "rest", waitBranch: "live" });
    f.runUntil(s + 1300 + T.gapMs);
    expect(f.find("real-start").at(-1)?.at).toBe(s + 1300 + T.gapMs);
    expect(f.find("discard-start")).toHaveLength(2);
  });

  it("버림 저절로 끝남: 소리가 나오는 중이면 stop 없이 소리 끝 + after 뒤 간격으로 가고 진짜 dc 의 끝 까닭은 self_end 다", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    f.send({ type: "speak-request", id: 1 }, s + T.liveAsMs + 10);
    f.send({ type: "speak-start", id: 1 }, s + 400);
    f.send({ type: "discard-end", discard: id }, s + 900);
    expect(f.state.phase).toBe("dead");
    f.send({ type: "speak-end", id: 1, heard: true }, s + 2500);
    f.send({ type: "sound-end" }, s + 2500);
    f.send({ type: "press" }, s + 2600);
    f.runUntil(s + 2500 + T.gapMs + T.afterSoundMs);
    expect(f.find("discard-stop")).toHaveLength(0);
    expect(f.find("real-start").at(-1)?.at).toBe(s + 2500 + T.gapMs);
    expect(f.lastNote()).toMatchObject({
      g: "discard",
      why: "self_end",
      d: 900,
    });
  });

  it("버림 안전 상한: 소리 없으면 stop 뒤 버림부터(cap), 소리 있으면 소리 끝으로 보고 닫으며(M-4), 서버 기다림 동안에는 세지 않는다(N-1)", () => {
    const silent = afterReal("result");
    toDead(silent.f, silent.id, silent.s);
    silent.f.runUntil(silent.s + T.capMs);
    expect(silent.f.find("discard-stop")[0].at).toBe(silent.s + T.capMs);
    silent.f.send(
      { type: "discard-end", discard: silent.id },
      silent.s + T.capMs + 10,
    );
    expect(silent.f.state).toMatchObject({ phase: "reopen", reopenWhy: "cap" });
    const press = silent.f.send({ type: "press" }, silent.s + T.capMs + 20);
    expect(types(press)).toContain("discard-start");

    const sounded = afterReal("result");
    toDead(sounded.f, sounded.id, sounded.s);
    read(sounded.f, 1, sounded.s + T.liveAsMs + 10, sounded.s + 2000);
    sounded.f.runUntil(sounded.s + 2000 + T.capMs);
    expect(sounded.f.find("discard-stop")[0].at).toBe(
      sounded.s + 2000 + T.capMs,
    );
    sounded.f.send(
      { type: "discard-end", discard: sounded.id },
      sounded.s + 2000 + T.capMs + 5,
    );
    sounded.f.send({ type: "press" }, sounded.s + 2000 + T.capMs + 5 + T.gapMs);
    expect(sounded.f.lastNote()).toMatchObject({ g: "discard", why: "cap" });

    const waiting = afterReal("result");
    toDead(waiting.f, waiting.id, waiting.s);
    waiting.f.send({ type: "server-wait", on: true }, waiting.s + 300);
    waiting.f.runUntil(waiting.s + T.capMs * 3);
    expect(waiting.f.find("discard-stop")).toHaveLength(0);
    waiting.f.send({ type: "server-wait", on: false }, waiting.s + T.capMs * 3);
    waiting.f.runUntil(waiting.s + T.capMs * 4);
    expect(waiting.f.find("discard-stop")[0].at).toBe(waiting.s + T.capMs * 4);
  });
});

describe("버리는 듣기 차례 기계 — 표 빈 곳 · 지난 기다림 · 사이 읽기 표지(M-1 · M-3 · M-4 · M-8)", () => {
  it("버림 확인 중 end: audiostart 없이 끝나면 대기(live), audiostart 뒤 판정 전에 끝나면 버림부터(self_end)다(갈래 1)", () => {
    const none = afterReal("result");
    none.f.send({ type: "discard-end", discard: none.id }, none.s + 50);
    expect(none.f.state).toMatchObject({ phase: "rest", waitBranch: "live" });
    none.f.send({ type: "press" }, none.s + 50 + T.gapMs);
    expect(none.f.lastNote()).toMatchObject({ g: "live", why: "live", d: 50 });
    expect(none.f.lastNote().as).toBeUndefined();

    const heard = afterReal("result");
    heard.f.send({ type: "discard-audio", discard: heard.id }, heard.s + 30);
    heard.f.send({ type: "discard-end", discard: heard.id }, heard.s + 60);
    expect(heard.f.state).toMatchObject({
      phase: "reopen",
      reopenWhy: "self_end",
    });
    expect(heard.f.find("discard-stop")).toHaveLength(0);
  });

  it("버림 마이크 확인(check): 열린 버림에 stop 을 내지 않고 걸린 누름을 거두며, end 뒤 버림부터(check)다", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    f.send({ type: "press" }, s + T.liveAsMs + 10);
    const check = f.send({ type: "check" }, s + T.liveAsMs + 20);
    expect(check).toContainEqual({ type: "press-drop", reason: "check" });
    expect(has(check, "discard-stop")).toBe(false);
    expect(f.state.phase).toBe("closing");
    f.send({ type: "discard-end", discard: id }, s + T.liveAsMs + 60);
    expect(f.state).toMatchObject({ phase: "reopen", reopenWhy: "check" });
    expect(f.lastView().waiting).toBe(false);
  });

  it("버림 소리 없는 안전 상한 뒤 누름은 버림을 다시 열고 그 안에서 소리를 부른다(AC-6)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    f.runUntil(s + T.capMs);
    f.send({ type: "discard-end", discard: id }, s + T.capMs + 10);
    const p = s + T.capMs + 20;
    const second = discardIdOf(f.send({ type: "press" }, p));
    const dead = toDead(f, second, p);
    expect(dead).toContainEqual({ type: "need-sound", kind: "again" });
    expect(f.find("need-sound")).toHaveLength(1);
  });

  it("버림 굳은 읽기: 간격 끝의 지난 기다림은 대기의 새 읽기 뒤 굳음에 쓰지 않고 cancel 을 다시 부른다(M-1)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const soundEnd = s + T.liveAsMs + 2000;
    read(f, 1, s + T.liveAsMs + 10, soundEnd);
    f.send({ type: "sound-end" }, soundEnd);
    const stopAt = Math.max(soundEnd + T.afterSoundMs, s + T.minMs);
    f.runUntil(stopAt);
    f.send({ type: "discard-end", discard: id }, stopAt + 50);
    f.send({ type: "synth", speaking: true }, stopAt + 60);
    const ready = stopAt + 50 + T.gapMs;
    f.runUntil(ready + T.afterSoundMs);
    expect(f.state.phase).toBe("rest");
    expect(f.find("cancel-speaking")).toHaveLength(1);
    const late = ready + T.afterSoundMs + 1000;
    read(f, 2, late, late + 1500);
    f.send({ type: "synth", speaking: true }, late + 1500);
    const p = late + 1500 + T.gapMs;
    const press = f.send({ type: "press" }, p);
    expect(types(press)).toContain("cancel-speaking");
    expect(has(press, "real-start")).toBe(false);
    f.runUntil(p + T.afterSoundMs);
    expect(f.find("real-start").at(-1)?.at).toBe(p + T.afterSoundMs);
    expect(f.find("cancel-speaking")).toHaveLength(2);
  });

  it("버림 소리 뒤 저절로 끝난 죽은 버림에서 흘린 읽기는 세션 없는 사이 읽기로 적는다(dc sr 참 · s1 은 버림 안 소리, M-3)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    read(f, 1, s + T.liveAsMs + 10, s + 2000);
    f.send({ type: "discard-end", discard: id }, s + 2100);
    expect(f.state.phase).toBe("dead");
    read(f, 2, s + 2200, s + 3500);
    f.send({ type: "sound-end" }, s + 3500);
    f.runUntil(s + 3500 + T.afterSoundMs + T.gapMs);
    f.send({ type: "press" }, s + 3500 + T.afterSoundMs + T.gapMs);
    expect(f.find("real-start")).toHaveLength(2);
    expect(f.lastNote()).toMatchObject({
      g: "discard",
      why: "self_end",
      sr: true,
      s1: 2000,
      d: 2100,
    });
  });

  it("버림 대기 사이 읽기 표지는 '버림부터'가 연 새 버림에서 지운다(M-4)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    const { ready } = closeWithTeacher(f, id, s);
    read(f, 2, ready + 100, ready + 1500);
    expect(f.state.betweenRead).toBe(true);
    f.send({ type: "hidden" }, ready + 1600);
    expect(f.state.phase).toBe("reopen");
    f.send({ type: "visible" }, ready + 1700);
    const p = ready + 1800;
    const second = discardIdOf(f.send({ type: "press" }, p));
    expect(f.state.betweenRead).toBe(false);
    toDead(f, second, p);
    read(f, 3, p + T.liveAsMs + 10, p + T.liveAsMs + 1500);
    f.send({ type: "sound-end" }, p + T.liveAsMs + 1500);
    const stopAt = Math.max(
      p + T.liveAsMs + 1500 + T.afterSoundMs,
      p + T.minMs,
    );
    f.runUntil(stopAt);
    f.send({ type: "discard-end", discard: second }, stopAt + 30);
    f.runUntil(stopAt + 30 + T.gapMs);
    expect(f.find("real-start")).toHaveLength(2);
    expect(f.lastNote()).toMatchObject({
      g: "reopen",
      rw: "hidden",
      sr: false,
    });
  });
});

describe("버리는 듣기 차례 기계 — 기록 칸 · 화면 · 시간 묶음(F12)", () => {
  it("버림 F12 진짜 앞 dc 칸은 정수 ms 이고 정한 칸 이름만 있으며 글 칸이 없다(AC-10 · AC-12)", () => {
    const { f, id, s } = afterReal("result");
    f.send({ type: "discard-audio", discard: id }, s + 30.4);
    f.runUntil(s + T.liveAsMs);
    const soundEnd = s + 2000.6;
    read(f, 1, s + T.liveAsMs + 10.2, soundEnd);
    f.send({ type: "discard-result", discard: id }, soundEnd);
    f.send({ type: "discard-result", discard: id }, soundEnd);
    f.send({ type: "sound-end" }, soundEnd);
    f.runUntil(soundEnd + T.afterSoundMs);
    f.send({ type: "press" }, soundEnd + T.afterSoundMs + 5);
    f.send(
      { type: "discard-end", discard: id },
      soundEnd + T.afterSoundMs + 40,
    );
    f.runUntil(soundEnd + T.afterSoundMs + 40 + T.gapMs);
    const dc = f.lastNote();
    expect(Object.keys(dc).sort()).toEqual(
      ["as", "d", "g", "n", "np", "s0", "s1", "sk", "sr", "w", "why"].sort(),
    );
    expect(dc).toMatchObject({
      g: "discard",
      why: "sound",
      as: 30,
      n: 2,
      np: 0,
      sk: "teacher",
      sr: false,
    });
    for (const key of ["as", "d", "s0", "s1", "w", "n", "np"] as const) {
      expect(Number.isInteger(dc[key]), key).toBe(true);
    }
    expect(dc.s1).toBe(Math.round(soundEnd - s));
    expect(dc.w).toBe(35 + T.gapMs);
  });

  it("버림 따라 말하기 흐림: canListen 은 버림 · 닫는 중 · 간격에서 거짓이고 대기에서 gap 이 찬 시각에 참으로 바뀐다(M-5)", () => {
    const { f, id, s } = afterReal("result");
    expect(f.lastView().canListen).toBe(false);
    toDead(f, id, s);
    expect(f.lastView().canListen).toBe(false);
    const { ready } = closeWithTeacher(f, id, s);
    const flips = f.find("view").filter((v) => v.effect.view.canListen);
    expect(flips.at(-1)?.at).toBe(ready);
    expect(f.find("view").some((v) => v.effect.view.reopenIdle)).toBe(false);
  });

  it("버림 따라 말하기 흐림: '버림부터'에서는 canListen 거짓 · reopenIdle 참이고, 들려줄 말을 한 번 더 읽으면 그 읽기가 버림을 연 뒤 소리 끝 + 간격에 canListen 이 참이 된다(I-2 · M-5)", () => {
    const { f, id, s } = afterReal("result");
    toDead(f, id, s);
    f.send({ type: "hidden" }, s + 500);
    f.send({ type: "discard-end", discard: id }, s + 520);
    f.send({ type: "visible" }, s + 3000);
    expect(f.state.phase).toBe("reopen");
    expect(f.lastView()).toMatchObject({ canListen: false, reopenIdle: true });
    const req = f.send(
      { type: "speak-request", id: 31, sound: "word" },
      s + 3100,
    );
    expect(acts(req)).toEqual(["discard-start"]);
    expect(f.lastView()).toMatchObject({ canListen: false, reopenIdle: false });
    const second = discardIdOf(req);
    expect(types(toDead(f, second, s + 3100))).toContain("speak-release");
    f.send({ type: "speak-start", id: 31 }, s + 3400);
    f.send({ type: "speak-end", id: 31, heard: true }, s + 4200);
    f.send({ type: "sound-end" }, s + 4200);
    const stopAt = Math.max(s + 4200 + T.afterSoundMs, s + 3100 + T.minMs);
    f.runUntil(stopAt);
    expect(f.lastView().canListen).toBe(false);
    f.send({ type: "discard-end", discard: second }, stopAt + 40);
    const ready = Math.max(stopAt + 40, s + 4200) + T.gapMs;
    f.runUntil(ready);
    const flips = f.find("view").filter((v) => v.effect.view.canListen);
    expect(flips.at(-1)?.at).toBe(ready);
    expect(f.find("need-sound")).toHaveLength(0);
    expect(f.find("real-start")).toHaveLength(1);
  });

  it("버림 시점 값은 시간 묶음에서만 읽는다 — 다른 묶음이면 같은 차례가 그 값대로 움직인다(AC-N3)", () => {
    const scaled: DiscardTimes = {
      restMs: T.restMs * 2,
      liveAsMs: T.liveAsMs * 3,
      minMs: T.minMs * 2,
      afterSoundMs: T.afterSoundMs * 3,
      gapMs: T.gapMs * 2,
      endWaitMs: T.endWaitMs * 2,
      capMs: T.capMs * 2,
    };
    for (const times of [T, scaled]) {
      const { f, id, s } = afterReal("result", times);
      toDead(f, id, s);
      f.runUntil(s + times.liveAsMs + 1);
      const { stopAt, soundEnd } = closeWithTeacherWithPress(f, id, s);
      expect(stopAt).toBe(
        Math.max(soundEnd + times.afterSoundMs, s + times.minMs),
      );
      f.runUntil(stopAt + 50 + times.gapMs);
      expect(f.find("real-start").at(-1)?.at).toBe(stopAt + 50 + times.gapMs);
    }
  });

  it("버림 시간 묶음: end 상한은 speech.watchdog_extra_seconds, 안전 상한은 speech.max_listen_seconds 와의 합이고 틀린 값은 던진다", () => {
    expect(T.endWaitMs).toBe(speech.watchdogExtraMs);
    expect(T.capMs).toBe(speech.maxListenMs + speech.watchdogExtraMs);
    expect(() => startDiscardFlow({ ...T, gapMs: -1 })).toThrow(RangeError);
    expect(() => startDiscardFlow({ ...T, minMs: Number.NaN })).toThrow(
      RangeError,
    );
  });

  it("버림 기록 칸 값 목록은 음성 접점 형(src/lib/speech/types.ts)과 같고 dc 꼴이 DiscardNote 에 들어간다", () => {
    expect(DISCARD_BRANCHES).toEqual(speechTypes.DISCARD_BRANCHES);
    expect(DISCARD_END_WHYS).toEqual(speechTypes.DISCARD_END_WHYS);
    expect(DISCARD_REOPEN_WHYS).toEqual(speechTypes.DISCARD_REOPEN_WHYS);
    expect(DISCARD_SOUND_KINDS).toEqual(speechTypes.DISCARD_SOUND_KINDS);
    const dc: DiscardFlowNote = { g: "reopen", rw: "hidden", sk: "cut" };
    const asNote: speechTypes.DiscardNote = dc;
    expect(asNote).toBe(dc);
  });
});

// 버리는 듣기 층(iPad 버리는 듣기 plan 묶음 2-나 · 접점 표 '층', spec 설계 1 · 2 · 3). 손으로 쓴 가짜 음성 접점과 가짜 시계로
// 층이 기계의 효과를 음성 접점 호출로 옮기는지 본다: off · 켜지 않은 기기면 null · 접점 호출 0(AC-11), 손잡이 꼴, 보류한 읽기(F8),
// 순서 약속 셋(unlock → press · real-end → 화면 결과 · discard-note → listen-begin), 시작 알림 추적(F9), 소리 공급 · 대비 줄, 떠남 · 숨김.
// 시험의 시각(ms)은 장면을 적은 자료다. 설계 숫자는 시험용 설정(TEST_SETTINGS)에서 읽는다. 시험 이름은 'AC-' 로 시작하지 않는다.
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";
import type { DiscardNote } from "@/core/conversation/client-listen";
import type { DiscardFlowNote, DiscardView } from "@/core/speech/discard";
import { discardSettingsFrom } from "@/core/speech/discard-settings";
import {
  type EndRule,
  type ListenOutcome,
  speechSettingsFrom,
} from "@/core/speech/listen";
import {
  type DiscardLayer,
  type DiscardSoundLine,
  type DiscardSoundNeed,
  discardLayerFor,
  realEndOf,
} from "@/lib/speech/discard-layer";
import type {
  DiscardCallbacks,
  ListenCallbacks,
  SpeakOptions,
  SpeakOutcome,
  SpeechPort,
  SpeechTraceEntry,
} from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const speech = speechSettingsFrom((key) => values[key]);
const discard = discardSettingsFrom((key) => values[key]);
const IPAD = { name: "iPad Safari 27" };
const MAC_CHROME = { name: "Mac Chrome 140" };
const RULE: EndRule = { endSilenceMs: 1000, chunkMs: 60000 };
/** 버림 start 에서 audiostart 까지(죽은 버림 띠 — 기록 8 의 as 10~15). */
const DEAD_AS = 12;
/** 대비 줄(틀이 seed 짧은 말 목록 1-3 구간의 자리별 첫 줄을 넣는 꼴, 검토 2-나 M-1). */
const FALLBACK = {
  again: { text: "Okay, it's your turn.", sound: "short" },
  mic: {
    text: "Oops! Let me turn it on.",
    sound: "short",
    options: { pitch: 1.08 },
  },
} satisfies Record<DiscardSoundNeed, DiscardSoundLine>;
const FALLBACK_AGAIN = `speak:${FALLBACK.again.text}`;

// ── 손으로 쓴 가짜 음성 접점 ──

type FakeUtterance = {
  text: string;
  options: SpeakOptions | undefined;
  done: boolean;
  start(): void;
  end(outcome?: SpeakOutcome): void;
};

type FakeListen = {
  rule: EndRule;
  on: ListenCallbacks | undefined;
  presses: number;
  cancels: number;
  finish(outcome: ListenOutcome): void;
};

type FakeDiscard = {
  id: number;
  on: DiscardCallbacks;
  calls: ("stop" | "abort")[];
  /** stop 을 부른 시각(가짜 시계). */
  stopAt: number | undefined;
  ended: boolean;
  audio(): void;
  result(count: number): void;
  end(): void;
};

class FakePort implements SpeechPort {
  readonly calls: string[] = [];
  readonly utterances: FakeUtterance[] = [];
  readonly listens: FakeListen[] = [];
  readonly discards: FakeDiscard[] = [];
  speaking = false;
  /** 남은 수만큼 speak 가 거절한다(음성 접점 Promise 안 synth.speak 가 던지는 드문 거절, 검토 2-나 재검토 5절). */
  rejectSpeaks = 0;

  constructor(readonly trace: SpeechTraceEntry[] = []) {}

  device() {
    this.calls.push("device");
    return { verdict: "ok" as const, listed: true, synthesis: true, ...IPAD };
  }
  unlockFromGesture() {
    this.calls.push("unlock");
  }
  speak(text: string, options?: SpeakOptions): Promise<SpeakOutcome> {
    this.calls.push(`speak:${text}`);
    if (this.rejectSpeaks > 0) {
      this.rejectSpeaks -= 1;
      return Promise.reject(new Error("synth.speak threw"));
    }
    // 음성 접점처럼 앞 발화를 끊고 읽는다(browser.ts speak).
    for (const u of this.utterances) if (!u.done) u.end({ kind: "cancelled" });
    return new Promise((resolve) => {
      const utterance: FakeUtterance = {
        text,
        options,
        done: false,
        start: () => {
          this.speaking = true;
          options?.onStart?.();
        },
        end: (outcome = { kind: "ended", heard: "played" }) => {
          if (utterance.done) return;
          utterance.done = true;
          this.speaking = false;
          resolve(outcome);
        },
      };
      this.utterances.push(utterance);
    });
  }
  cancelSpeaking() {
    this.calls.push("cancelSpeaking");
    this.speaking = false;
    for (const u of this.utterances) if (!u.done) u.end({ kind: "cancelled" });
  }
  listen(rule: EndRule, on?: ListenCallbacks) {
    this.calls.push("listen");
    this.trace.push({
      at: performance.now(),
      kind: "listen-begin",
      listen: this.listens.length + 1,
      rule,
    });
    let resolve: (o: ListenOutcome) => void = () => {};
    const outcome = new Promise<ListenOutcome>((r) => {
      resolve = r;
    });
    const fake: FakeListen = {
      rule,
      on,
      presses: 0,
      cancels: 0,
      finish: (o) => resolve(o),
    };
    this.listens.push(fake);
    return {
      press: () => {
        fake.presses += 1;
      },
      cancel: () => {
        fake.cancels += 1;
        resolve({ kind: "interrupted", reason: "leave", partialText: "" });
      },
      outcome,
      capAt: 1234,
    };
  }
  checkMicrophone() {
    this.calls.push("checkMicrophone");
    return Promise.resolve({ ok: true as const });
  }
  dispose() {
    this.calls.push("dispose");
  }
  openDiscard(on: DiscardCallbacks) {
    const id = this.discards.length + 1;
    this.calls.push(`openDiscard:${id}`);
    const fake: FakeDiscard = {
      id,
      on,
      calls: [],
      stopAt: undefined,
      ended: false,
      audio: () => on.audio?.(),
      result: (count) => on.result?.(count),
      end: () => {
        if (fake.ended) return;
        fake.ended = true;
        on.end?.();
      },
    };
    this.discards.push(fake);
    return {
      stop: () => {
        fake.calls.push("stop");
        fake.stopAt ??= performance.now();
        this.calls.push(`stop:${id}`);
      },
      abort: () => {
        fake.calls.push("abort");
        this.calls.push(`abort:${id}`);
      },
    };
  }
  synthState() {
    return { speaking: this.speaking, pending: false };
  }

  lastUtterance(): FakeUtterance {
    const u = this.utterances.at(-1);
    if (u === undefined) throw new Error("읽기 없음");
    return u;
  }
  lastListen(): FakeListen {
    const l = this.listens.at(-1);
    if (l === undefined) throw new Error("진짜 듣기 없음");
    return l;
  }
  lastDiscard(): FakeDiscard {
    const d = this.discards.at(-1);
    if (d === undefined) throw new Error("버림 없음");
    return d;
  }
}

/** 쪽 숨김 알림 가짜. */
function fakeVisibility() {
  const state = { hidden: false, fns: new Set<() => void>() };
  return {
    visibility: {
      hidden: () => state.hidden,
      subscribe(fn: () => void) {
        state.fns.add(fn);
        return () => state.fns.delete(fn);
      },
    },
    set(hidden: boolean) {
      state.hidden = hidden;
      for (const fn of state.fns) fn();
    },
  };
}

function makeLayer(port = new FakePort()) {
  const vis = fakeVisibility();
  const layer = discardLayerFor(port, {
    discard,
    speech,
    verdict: IPAD,
    fallbackLines: FALLBACK,
    onTrace: (entry) => port.trace.push(entry),
    visibility: vis.visibility,
  });
  if (layer === null) throw new Error("층이 없다");
  const views: DiscardView[] = [];
  layer.subscribe((v) => views.push(v));
  return { port, layer, vis, views };
}

const flush = () => vi.advanceTimersByTimeAsync(0);
const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);
const notes = (trace: SpeechTraceEntry[]) =>
  trace.flatMap((e) => (e.kind === "discard-note" ? [e.dc] : []));

/** 첫 누름으로 진짜를 열고 결과로 끝낸 뒤 버림이 열린 상태까지(F2). 버림은 죽은 버림(audiostart 가 판정 안). */
async function firstTurnThenDeadDiscard(layer: DiscardLayer, port: FakePort) {
  layer.port.unlockFromGesture();
  const handle = layer.port.listen(RULE);
  port.lastListen().finish({
    kind: "result",
    text: "apple",
    pieces: [],
    endedBy: "silence",
    restarts: 0,
    watchdogRestarts: 0,
  });
  await flush();
  await handle.outcome;
  const d = port.lastDiscard();
  await advance(DEAD_AS);
  d.audio();
  await advance(discard.liveAsMs);
  return d;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("버림 층 만들기 — 끔 · 켜지 않은 기기(AC-11 층 몫)", () => {
  it("버림 층은 off 이거나 켜지 않은 기기면 null 이고, 음성 접점을 하나도 부르지 않는다", () => {
    const port = new FakePort();
    const spied = {
      openDiscard: vi.spyOn(port, "openDiscard"),
      synthState: vi.spyOn(port, "synthState"),
    };
    expect(
      discardLayerFor(port, {
        discard: { ...discard, mode: "off" },
        speech,
        verdict: IPAD,
        fallbackLines: FALLBACK,
      }),
    ).toBeNull();
    expect(
      discardLayerFor(port, {
        discard: { ...discard, mode: "ios" },
        speech,
        verdict: MAC_CHROME,
        fallbackLines: FALLBACK,
      }),
    ).toBeNull();
    expect(port.calls).toEqual([]);
    expect(spied.openDiscard).not.toHaveBeenCalled();
    expect(spied.synthState).not.toHaveBeenCalled();
  });

  it("버림 층은 openDiscard 가 없는 음성 접점이면 null 이다(감싸개를 거친 접점에 걸지 않음)", () => {
    const port = new FakePort();
    const bare: SpeechPort = {
      device: () => port.device(),
      unlockFromGesture: () => port.unlockFromGesture(),
      speak: (t, o) => port.speak(t, o),
      cancelSpeaking: () => port.cancelSpeaking(),
      listen: (r, o) => port.listen(r, o),
      checkMicrophone: () => port.checkMicrophone(),
      dispose: () => port.dispose(),
    };
    expect(
      discardLayerFor(bare, {
        discard,
        speech,
        verdict: IPAD,
        fallbackLines: FALLBACK,
      }),
    ).toBeNull();
    expect(
      discardLayerFor(port, {
        discard: { ...discard, mode: "all" },
        speech,
        verdict: MAC_CHROME,
        fallbackLines: FALLBACK,
      }),
    ).not.toBeNull();
  });

  it("버림 층이 내는 음성 접점에는 openDiscard · synthState 칸이 없다(감싸개에 새 능력을 넘기지 않음)", () => {
    const { layer } = makeLayer();
    expect(layer.port.openDiscard).toBeUndefined();
    expect(layer.port.synthState).toBeUndefined();
  });
});

describe("버림 층 손잡이 꼴과 순서 약속", () => {
  it("버림 층 첫 누름은 잠금 풀기(unlock)를 press 보다 먼저 보내 그 누름 안에서 진짜를 연다(순서 1, I-4)", () => {
    const { port, layer } = makeLayer();
    const started = vi.fn();
    // 화면이 잠금 풀기를 부르지 않아도 listen 이 먼저 부른다
    const handle = layer.port.listen(RULE, { started });
    expect(port.calls).toEqual(["unlock", "listen"]);
    expect(started).toHaveBeenCalledTimes(1);
    expect(handle.capAt).toBe(1234);
  });

  it("버림 층 listenAuto 는 잠금 풀기를 부르지 않고, 잠금 풀기 전에는 진짜를 열지 않는다(I-4)", async () => {
    const { port, layer, views } = makeLayer();
    const handle = layer.listenAuto(RULE);
    expect(port.calls).toEqual([]);
    expect(views.at(-1)?.waiting).toBe(true);
    expect(handle.capAt).toBeUndefined();
    layer.port.unlockFromGesture();
    expect(port.calls).toEqual(["unlock", "listen"]);
  });

  it("버림 층 손잡이는 걸린 동안 outcome 이 풀리지 않고 started 를 부르지 않으며, 다시 누름은 하나로 센다", async () => {
    const { port, layer, views } = makeLayer();
    const d = await firstTurnThenDeadDiscard(layer, port);
    void layer.port.speak("Good job.");
    port.lastUtterance().start();
    await advance(900);
    const started = vi.fn();
    const handle = layer.port.listen(RULE, { started });
    handle.press();
    handle.press();
    expect(started).not.toHaveBeenCalled();
    expect(views.at(-1)?.waiting).toBe(true);
    expect(port.listens).toHaveLength(1);
    // 시작 알림 뒤 끊긴 읽기(F9 첫 갈래): 소리 끝 + after 와 하한 → stop → end → gap → 진짜
    expect(port.calls).toContain("cancelSpeaking");
    await advance(discard.minMs);
    expect(d.calls).toEqual(["stop"]);
    d.end();
    await advance(discard.gapMs);
    expect(port.listens).toHaveLength(2);
    expect(started).toHaveBeenCalledTimes(1);
    expect(views.at(-1)).toMatchObject({ waiting: false, sayNow: true });
  });

  it("버림 층은 real-end 를 화면에 결과를 넘기기 전에 보낸다 — 결과를 본 화면의 again 이 짧은 말을 부른다(순서 2, 재검토 N-1)", async () => {
    const { port, layer } = makeLayer();
    layer.port.unlockFromGesture();
    const handle = layer.port.listen(RULE);
    const seenPhase: string[] = [];
    void handle.outcome.then(() => {
      // 화면은 결과를 받은 그 걸음에 다시 말할 차례를 보인다
      seenPhase.push("result");
      layer.again();
    });
    port.lastListen().finish({ kind: "no-result" });
    await flush();
    expect(seenPhase).toEqual(["result"]);
    const d = port.lastDiscard();
    d.audio();
    await advance(discard.liveAsMs);
    // 진짜 동안 again 이 왔다면 버려져 소리가 없다. real-end 가 먼저라 죽은 버림 판정 뒤 짧은 말을 읽는다
    expect(port.calls.filter((c) => c.startsWith("speak:"))).toEqual([
      FALLBACK_AGAIN,
    ]);
  });

  it("버림 층은 discard-note 를 같은 기록 통로에 진짜 listen-begin 바로 앞에 남긴다(순서 3, 검토 4)", async () => {
    const { port, layer } = makeLayer();
    const d = await firstTurnThenDeadDiscard(layer, port);
    void layer.port.speak("How are you?");
    port.lastUtterance().start();
    await advance(1500);
    port.lastUtterance().end();
    await flush();
    layer.soundEnd();
    await advance(discard.afterSoundMs);
    expect(d.calls).toEqual(["stop"]);
    d.end();
    await advance(discard.gapMs);
    layer.port.listen(RULE);
    const kinds = port.trace.map((e) => e.kind);
    // 첫 진짜(쪽 첫 · rest)와 둘째 진짜 모두 note 바로 뒤에 listen-begin
    expect(kinds).toEqual([
      "discard-note",
      "listen-begin",
      "discard-note",
      "listen-begin",
    ]);
    expect(notes(port.trace)[0]).toEqual({ g: "rest" });
    expect(notes(port.trace)[1]).toMatchObject({
      g: "discard",
      why: "sound",
      sk: "teacher",
      as: DEAD_AS,
    });
  });
});

describe("버림 층 읽기 — 보류 · 흘림(F8 · F1)", () => {
  it("버림 층은 진짜 동안 온 읽기를 보류하고 다음 죽은 버림 판정 뒤 그 안에서 읽는다(F8)", async () => {
    const { port, layer } = makeLayer();
    layer.port.unlockFromGesture();
    const handle = layer.port.listen(RULE);
    const held = layer.port.speak("Wait for me.");
    expect(port.calls).not.toContain("speak:Wait for me.");
    port.lastListen().finish({ kind: "no-result" });
    await handle.outcome;
    await flush();
    expect(port.lastListen().cancels).toBe(0);
    const d = port.lastDiscard();
    expect(port.calls).not.toContain("speak:Wait for me.");
    await advance(DEAD_AS);
    d.audio();
    await advance(discard.liveAsMs);
    expect(port.calls.at(-1)).toBe("speak:Wait for me.");
    port.lastUtterance().start();
    port.lastUtterance().end();
    await expect(held).resolves.toEqual({ kind: "ended", heard: "played" });
  });

  it("버림 층은 쪽 첫 대기에서 읽기를 세션 없이 흘리고, 누르면 소리 끝 + 간격 뒤 진짜를 연다(F1)", async () => {
    const { port, layer, views } = makeLayer();
    void layer.port.speak("Hello!");
    expect(port.calls).toEqual(["speak:Hello!"]);
    port.lastUtterance().start();
    await advance(800);
    port.lastUtterance().end();
    await flush();
    layer.port.unlockFromGesture();
    layer.port.listen(RULE);
    expect(port.listens).toHaveLength(0);
    expect(views.at(-1)?.waiting).toBe(true);
    await advance(discard.gapMs);
    expect(port.listens).toHaveLength(1);
    expect(port.discards).toHaveLength(0);
  });

  it("버림 층은 화면이 보류 중인 읽기를 거두면 끊김으로 돌려주고 읽지 않으며 기계를 멈추지 않는다", async () => {
    const { port, layer } = makeLayer();
    layer.port.unlockFromGesture();
    const handle = layer.port.listen(RULE);
    const held = layer.port.speak("Never mind.");
    layer.port.cancelSpeaking();
    await expect(held).resolves.toEqual({ kind: "cancelled" });
    port.lastListen().finish({ kind: "no-result" });
    await handle.outcome;
    await flush();
    const d = port.lastDiscard();
    d.audio();
    await advance(discard.liveAsMs);
    expect(port.calls).not.toContain("speak:Never mind.");
    // 거둔 읽기가 기계의 읽는 중 목록에 남지 않는다: 다시 말할 차례가 오면 짧은 말을 부른다(읽는 중이면 부르지 않는 F4 (2))
    layer.again();
    expect(port.calls.at(-1)).toBe(FALLBACK_AGAIN);
  });
});

describe("버림 층 누름 — 시작 알림 추적(F9) · 소리 공급", () => {
  it("버림 층은 시작 알림 전에 끊긴 읽기 뒤 화면이 공급한 짧은 말을 버림 안에서 읽고, 그 끝을 스스로 소리 끝으로 알린다(F9 둘째 갈래)", async () => {
    const { port, layer } = makeLayer();
    const source = vi.fn(() => ({
      text: "Okay, say it again.",
      sound: "short" as const,
      options: { pitch: 1.1 },
    }));
    layer.setSoundSource(source);
    const d = await firstTurnThenDeadDiscard(layer, port);
    void layer.port.speak("Next question.");
    // 시작 알림 전에 누름
    layer.port.listen(RULE);
    expect(source).toHaveBeenCalledWith("again");
    expect(port.calls.slice(-2)).toEqual([
      "cancelSpeaking",
      "speak:Okay, say it again.",
    ]);
    expect(port.lastUtterance().options?.pitch).toBe(1.1);
    port.lastUtterance().start();
    await advance(1200);
    port.lastUtterance().end();
    await flush();
    // 틀의 soundEnd 없이도 stop 한다
    await advance(discard.afterSoundMs);
    expect(d.calls).toEqual(["stop"]);
    d.end();
    await advance(discard.gapMs);
    expect(port.listens).toHaveLength(2);
    expect(notes(port.trace).at(-1)).toMatchObject({
      g: "discard",
      sk: "short",
      why: "sound",
    });
  });

  it.each([
    ["소리 공급이 없으면", undefined],
    ["공급이 줄을 주지 않으면", () => undefined],
    [
      "공급이 던지면",
      () => {
        throw new Error("목록 없음");
      },
    ],
  ])(
    "버림 층은 %s 틀이 넣은 자리별 대비 줄을 그 목소리로 읽는다(검토 1 6절 4 · 검토 2-나 M-1)",
    async (_label, source) => {
      const { port, layer } = makeLayer();
      layer.setSoundSource(source);
      await firstTurnThenDeadDiscard(layer, port);
      layer.port.listen(RULE);
      expect(port.calls.at(-1)).toBe(FALLBACK_AGAIN);
      // 회복 자리(mic)는 mic 줄을 options 째로 읽는다
      const recover = makeLayer();
      recover.layer.setSoundSource(source);
      recover.layer.port.unlockFromGesture();
      const first = recover.layer.port.listen(RULE);
      recover.port
        .lastListen()
        .finish({ kind: "deaf", audiostartMs: 30, retries: 0 });
      await first.outcome;
      recover.layer.listenAuto(RULE);
      recover.port.lastDiscard().audio();
      await advance(discard.liveAsMs);
      expect(recover.port.calls.at(-1)).toBe(`speak:${FALLBACK.mic.text}`);
      expect(recover.port.lastUtterance().options?.pitch).toBe(
        FALLBACK.mic.options.pitch,
      );
    },
  );

  it("버림 층 회복: deaf 로 끝난 진짜 뒤 listenAuto 는 mic 소리를 부르고 recovering 을 보인 뒤 누름 없이 진짜를 연다(F10)", async () => {
    const { port, layer, views } = makeLayer();
    const needs: string[] = [];
    layer.setSoundSource((need) => {
      needs.push(need);
      return {
        text: need === "mic" ? "Hold on." : "Once more.",
        sound: "short",
      };
    });
    layer.port.unlockFromGesture();
    const first = layer.port.listen(RULE);
    port.lastListen().finish({ kind: "deaf", audiostartMs: 30, retries: 0 });
    await first.outcome;
    const started = vi.fn();
    layer.listenAuto(RULE, { started });
    expect(views.at(-1)).toMatchObject({ waiting: true, recovering: true });
    const d = port.lastDiscard();
    d.audio();
    await advance(discard.liveAsMs);
    expect(needs).toEqual(["mic"]);
    port.lastUtterance().start();
    await advance(1000);
    port.lastUtterance().end();
    await flush();
    await advance(discard.minMs);
    d.end();
    await advance(discard.gapMs);
    expect(started).toHaveBeenCalledTimes(1);
    expect(views.at(-1)).toMatchObject({ recovering: false, sayNow: true });
  });

  it("버림 층 결과 수 n 은 버림의 마지막 결과 목록 길이다(검토 2-가 4절 6)", async () => {
    const { port, layer } = makeLayer();
    const d = await firstTurnThenDeadDiscard(layer, port);
    void layer.port.speak("Look at this.");
    port.lastUtterance().start();
    // 연속 인식은 같은 목록을 고쳐 보내며 늘린다: 1 · 1 · 1 · 3 → 사건 넷이지만 n 은 3
    d.result(1);
    d.result(1);
    d.result(1);
    d.result(3);
    port.lastUtterance().end();
    await flush();
    layer.soundEnd();
    await advance(discard.minMs);
    d.end();
    await advance(discard.gapMs);
    layer.port.listen(RULE);
    expect(notes(port.trace).at(-1)?.n).toBe(3);
  });
});

/** 결과 없음으로 끝난 진짜 뒤 죽은 버림이 열린 상태까지. */
async function noResultThenDeadDiscard(layer: DiscardLayer, port: FakePort) {
  layer.port.unlockFromGesture();
  const handle = layer.port.listen(RULE);
  port.lastListen().finish({ kind: "no-result" });
  await handle.outcome;
  const d = port.lastDiscard();
  await advance(DEAD_AS);
  d.audio();
  await advance(discard.liveAsMs);
  return d;
}

/** 틀의 아이 차례 누름: onListenStart(queue.cancel → cancelSpeaking)를 먼저 부르고 listen(child-turn · talk-frame 의 차례). */
function framePress(layer: DiscardLayer, on?: ListenCallbacks) {
  layer.port.cancelSpeaking();
  return layer.port.listen(RULE, on);
}

/** 버림의 소리 없는 안전 상한(speech.max_listen_seconds + speech.watchdog_extra_seconds). */
const CAP_MS = speech.maxListenMs + speech.watchdogExtraMs;
const SHORT_MS = 900;

describe("버림 층 틀 누름 차례 — cancelSpeaking 뒤 listen(검토 2-나 I-1)", () => {
  it("버림 층 다시 말할 차례의 짧은 말이 시작 알림 전이면 틀의 cancelSpeaking 이 그 줄을 끊지 않고, 누름이 짧은 말을 다시 불러 소리 끝 + 간격 안에 진짜를 연다", async () => {
    const { port, layer } = makeLayer();
    const d = await noResultThenDeadDiscard(layer, port);
    layer.again();
    expect(port.calls.at(-1)).toBe(FALLBACK_AGAIN);
    const pressAt = performance.now();
    framePress(layer);
    // 틀의 cancel 은 층이 부른 줄을 음성 접점에 넘기지 않는다. 누름(F9)이 시작 전 끊김을 보고 짧은 말을 한 번 더 부른다
    expect(port.calls.slice(-3)).toEqual([
      FALLBACK_AGAIN,
      "cancelSpeaking",
      FALLBACK_AGAIN,
    ]);
    const short = port.lastUtterance();
    short.start();
    await advance(SHORT_MS);
    short.end();
    await flush();
    await advance(Math.max(discard.afterSoundMs, discard.minMs));
    expect(d.calls).toEqual(["stop"]);
    d.end();
    await advance(discard.gapMs);
    expect(port.listens).toHaveLength(2);
    expect(performance.now() - pressAt).toBeLessThanOrEqual(
      SHORT_MS + Math.max(discard.afterSoundMs, discard.minMs) + discard.gapMs,
    );
    expect(performance.now() - pressAt).toBeLessThan(CAP_MS);
    expect(notes(port.trace).at(-1)).toMatchObject({
      g: "discard",
      why: "sound",
      sk: "short",
    });
  });

  it("버림 층 짧은 말이 시작한 뒤 틀이 누르면 누름이 그 줄을 끊고(sk cut) 소리 끝 + 간격 뒤 진짜를 연다", async () => {
    const { port, layer } = makeLayer();
    const d = await noResultThenDeadDiscard(layer, port);
    layer.again();
    port.lastUtterance().start();
    await advance(300);
    const pressAt = performance.now();
    framePress(layer);
    expect(port.lastUtterance().done).toBe(true);
    expect(port.calls.filter((c) => c === FALLBACK_AGAIN)).toHaveLength(1);
    await advance(Math.max(discard.afterSoundMs, discard.minMs));
    expect(d.calls).toEqual(["stop"]);
    d.end();
    await advance(discard.gapMs);
    expect(port.listens).toHaveLength(2);
    expect(performance.now() - pressAt).toBeLessThan(CAP_MS);
    expect(notes(port.trace).at(-1)).toMatchObject({ g: "discard", sk: "cut" });
  });

  it("버림 층 소리 없는 버림에서 선생님 줄이 시작 알림 전에 틀 누름을 맞으면, 그 줄은 끊고 버림 안 짧은 말 뒤 진짜를 연다", async () => {
    const { port, layer } = makeLayer();
    const d = await firstTurnThenDeadDiscard(layer, port);
    const teacher = layer.port.speak("Next question.");
    const pressAt = performance.now();
    framePress(layer);
    await expect(teacher).resolves.toEqual({ kind: "cancelled" });
    expect(port.calls.slice(-3)).toEqual([
      "speak:Next question.",
      "cancelSpeaking",
      FALLBACK_AGAIN,
    ]);
    const short = port.lastUtterance();
    short.start();
    await advance(SHORT_MS);
    short.end();
    await flush();
    await advance(Math.max(discard.afterSoundMs, discard.minMs));
    expect(d.calls).toEqual(["stop"]);
    d.end();
    await advance(discard.gapMs);
    expect(port.listens).toHaveLength(2);
    expect(performance.now() - pressAt).toBeLessThan(CAP_MS);
  });
});

/** 틀의 다시 듣기 · 힌트 듣기 · 말풍선 누르기: queue.cancel(→ cancelSpeaking) 뒤 첫 문장을 넣는다(tori.tsx replay 의 차례). */
function frameReplay(layer: DiscardLayer, text: string) {
  layer.port.cancelSpeaking();
  return layer.port.speak(text);
}

/** 틀이 한 줄을 끝까지 읽힌다(시작 알림 → 읽는 시간 → 끝). */
async function readThrough(port: FakePort, ms: number) {
  const u = port.lastUtterance();
  u.start();
  await advance(ms);
  u.end();
  await flush();
}

describe("버림 층 짧은 말 읽는 중 틀의 다시 듣기 — 두 문장이 한 버림 안(검토 2-나 재검토 N-1)", () => {
  const FIRST = "Good!";
  const SECOND = "What do you like?";
  const FIRST_MS = 600;
  const SECOND_MS = 900;

  /** 다시 듣기의 두 문장(사이 쉼 speech.sentence_pause_ms)을 읽고 틀이 소리 끝을 알린 뒤 진짜까지. 둘째 문장이 같은 버림 안에서 읽혔는지 본다. */
  async function replayTwoSentences(
    layer: DiscardLayer,
    port: FakePort,
    d: ReturnType<FakePort["lastDiscard"]>,
  ) {
    const first = frameReplay(layer, FIRST);
    expect(port.calls.at(-1)).toBe(`speak:${FIRST}`);
    await readThrough(port, FIRST_MS);
    await expect(first).resolves.toMatchObject({ kind: "ended" });
    // 문장 사이 쉼에는 틀이 아직 소리 끝을 알리지 않았다 — 버림이 닫히면 안 된다
    await advance(speech.sentencePauseMs);
    expect(d.calls).toEqual([]);
    const second = layer.port.speak(SECOND);
    expect(port.calls.at(-1)).toBe(`speak:${SECOND}`);
    await readThrough(port, SECOND_MS);
    await expect(second).resolves.toMatchObject({ kind: "ended" });
    const secondEndAt = performance.now();
    layer.soundEnd();
    await advance(Math.max(discard.afterSoundMs, discard.minMs));
    expect(d.calls).toEqual(["stop"]);
    expect(d.stopAt).toBeGreaterThanOrEqual(secondEndAt);
    d.end();
    await advance(discard.gapMs);
    framePress(layer);
    expect(port.listens).toHaveLength(2);
    expect(port.discards).toHaveLength(1);
    expect(notes(port.trace).at(-1)).toMatchObject({
      g: "discard",
      why: "sound",
      sr: false,
    });
  }

  it("버림 층 짧은 말이 시작한 뒤 틀이 다시 듣기를 하면, 짧은 말 끝에 소리 끝을 보내지 않아 둘째 문장까지 첫 버림 안에서 읽고 틀의 소리 끝 뒤에 닫는다", async () => {
    const { port, layer } = makeLayer();
    const events: string[] = [];
    layer.setSoundSource(() => ({
      ...FALLBACK.again,
      onEnd: (outcome) => events.push(`end:${outcome.kind}`),
    }));
    const d = await noResultThenDeadDiscard(layer, port);
    layer.again();
    port.lastUtterance().start();
    await advance(300);
    await replayTwoSentences(layer, port, d);
    // 짧은 말은 첫 문장이 끊었고(onEnd 한 번), 다시 부르지 않았다
    expect(events).toEqual(["end:cancelled"]);
    expect(port.calls.filter((c) => c === FALLBACK_AGAIN)).toHaveLength(1);
  });

  it("버림 층 짧은 말이 시작 알림 전에 틀의 다시 듣기에 끊기면, 걷어 낼 그 줄은 첫 문장 뒤에 걷히고 둘째 문장까지 첫 버림 안에서 읽는다", async () => {
    const { port, layer } = makeLayer();
    const d = await noResultThenDeadDiscard(layer, port);
    layer.again();
    expect(port.calls.at(-1)).toBe(FALLBACK_AGAIN);
    await replayTwoSentences(layer, port, d);
    expect(port.calls.filter((c) => c === FALLBACK_AGAIN)).toHaveLength(1);
  });
});

describe("버림 층 음성 접점 speak 거절 — 들려주지 못함으로 끝냄(검토 2-나 재검토 5절)", () => {
  it("버림 층 걸린 누름의 짧은 말을 음성 접점이 거절하면 들려주지 못함으로 끝내 onEnd 를 한 번 부르고, 기계가 한 번 더 부른 짧은 말 끝에 닫아 안전 상한 전에 진짜를 연다", async () => {
    const { port, layer } = makeLayer();
    const events: string[] = [];
    let count = 0;
    layer.setSoundSource(() => {
      count += 1;
      const n = count;
      return {
        ...FALLBACK.again,
        onStart: () => events.push(`start:${n}`),
        onEnd: (outcome) => events.push(`end:${n}:${outcome.kind}`),
      };
    });
    const d = await firstTurnThenDeadDiscard(layer, port);
    port.rejectSpeaks = 1;
    const pressAt = performance.now();
    framePress(layer);
    await flush();
    // 거절한 줄은 들려주지 못함(첫째 — 굳음)이라 기계가 cancel 뒤 짧은 말을 한 번 더 부른다
    expect(events).toEqual(["end:1:error"]);
    expect(port.calls.filter((c) => c === FALLBACK_AGAIN)).toHaveLength(2);
    expect(d.calls).toEqual([]);
    const short = port.lastUtterance();
    short.start();
    await advance(SHORT_MS);
    short.end();
    await flush();
    await advance(Math.max(discard.afterSoundMs, discard.minMs));
    expect(d.calls).toEqual(["stop"]);
    d.end();
    await advance(discard.gapMs);
    expect(port.listens).toHaveLength(2);
    expect(performance.now() - pressAt).toBeLessThan(CAP_MS);
    expect(events).toEqual(["end:1:error", "start:2", "end:2:ended"]);
    expect(notes(port.trace).at(-1)).toMatchObject({
      g: "discard",
      why: "sound",
      sk: "short",
      np: 1,
    });
    expect(port.discards.every((x) => !x.calls.includes("abort"))).toBe(true);
  });

  it("버림 층 틀의 선생님 줄을 음성 접점이 거절하면 그 읽기는 오류(시작 전)로 끝나 기계의 읽는 중 목록에 남지 않고, 다음 줄 소리 끝에 버림을 닫는다", async () => {
    const { port, layer } = makeLayer();
    const d = await firstTurnThenDeadDiscard(layer, port);
    port.rejectSpeaks = 1;
    const rejected = layer.port.speak("Next question.");
    await flush();
    await expect(rejected).resolves.toMatchObject({
      kind: "error",
      started: false,
    });
    const said = layer.port.speak("What do you like?");
    expect(port.calls.at(-1)).toBe("speak:What do you like?");
    const u = port.lastUtterance();
    u.start();
    await advance(SHORT_MS);
    u.end();
    await expect(said).resolves.toMatchObject({ kind: "ended" });
    layer.soundEnd();
    await advance(Math.max(discard.afterSoundMs, discard.minMs));
    expect(d.calls).toEqual(["stop"]);
    d.end();
    await advance(discard.gapMs);
    framePress(layer);
    expect(port.listens).toHaveLength(2);
    expect(notes(port.trace).at(-1)).toMatchObject({
      g: "discard",
      why: "sound",
      np: 1,
    });
  });
});

describe("버림 층 짧은 말의 시작 · 끝 알림(검토 2-나 I-2)", () => {
  /** 공급할 때마다 새 줄을 주고, 그 줄의 알림을 줄 번호와 함께 적는다. */
  function recordingSource(events: string[]) {
    let count = 0;
    return (): DiscardSoundLine => {
      count += 1;
      const n = count;
      return {
        text: "Okay, say it again.",
        sound: "short",
        onStart: () => events.push(`start:${n}`),
        onEnd: (outcome) => events.push(`end:${n}:${outcome.kind}`),
      };
    };
  }

  it("버림 층이 읽은 짧은 말은 실제 시작에 onStart, 끝에 onEnd 를 한 번씩 부른다", async () => {
    const { port, layer } = makeLayer();
    const events: string[] = [];
    layer.setSoundSource(recordingSource(events));
    await noResultThenDeadDiscard(layer, port);
    layer.again();
    expect(events).toEqual([]);
    port.lastUtterance().start();
    port.lastUtterance().start();
    expect(events).toEqual(["start:1"]);
    await advance(SHORT_MS);
    port.lastUtterance().end();
    await flush();
    expect(events).toEqual(["start:1", "end:1:ended"]);
  });

  it("버림 층 짧은 말이 시작 전에 누름으로 끊기면 onStart 없이 onEnd(cancelled) 하나이고, 다시 부른 줄은 제 알림을 따로 낸다", async () => {
    const { port, layer } = makeLayer();
    const events: string[] = [];
    layer.setSoundSource(recordingSource(events));
    await noResultThenDeadDiscard(layer, port);
    layer.again();
    framePress(layer);
    await flush();
    expect(events).toEqual(["end:1:cancelled"]);
    port.lastUtterance().start();
    port.lastUtterance().end();
    await flush();
    expect(events).toEqual(["end:1:cancelled", "start:2", "end:2:ended"]);
  });

  it("버림 층 짧은 말이 시작한 뒤 누름으로 끊겨도 onEnd 는 한 번이다(틀이 말하기를 끔)", async () => {
    const { port, layer } = makeLayer();
    const events: string[] = [];
    layer.setSoundSource(recordingSource(events));
    await noResultThenDeadDiscard(layer, port);
    layer.again();
    port.lastUtterance().start();
    framePress(layer);
    await flush();
    await advance(Math.max(discard.afterSoundMs, discard.minMs));
    expect(events).toEqual(["start:1", "end:1:cancelled"]);
  });

  it.each([
    ["떠남", (layer: DiscardLayer) => layer.leave()],
    ["'잘 모르겠어요'", (layer: DiscardLayer) => layer.dontKnow()],
  ])(
    "버림 층은 %s 때 화면 cancel 이 남겨 둔 짧은 말을 끊는다(onEnd 하나)",
    async (_label, act) => {
      const { port, layer } = makeLayer();
      const events: string[] = [];
      layer.setSoundSource(recordingSource(events));
      await noResultThenDeadDiscard(layer, port);
      layer.again();
      port.lastUtterance().start();
      layer.port.cancelSpeaking();
      expect(port.lastUtterance().done).toBe(false);
      act(layer);
      await flush();
      expect(port.lastUtterance().done).toBe(true);
      expect(events).toEqual(["start:1", "end:1:cancelled"]);
    },
  );

  it("버림 층 dispose 는 끝나지 않은 짧은 말의 onEnd 를 한 번 부른다", async () => {
    const { port, layer } = makeLayer();
    const events: string[] = [];
    layer.setSoundSource(recordingSource(events));
    await noResultThenDeadDiscard(layer, port);
    layer.again();
    port.lastUtterance().start();
    layer.dispose();
    port.lastUtterance().end({ kind: "cancelled" });
    await flush();
    expect(events).toEqual(["start:1", "end:1:cancelled"]);
  });
});

describe("버림 층 닫는 중 end 상한(검토 2-나 M-4)", () => {
  it("버림 층 stop 뒤 end 가 오지 않으면 end 상한 뒤 간격으로 진짜를 열고, 늦은 end 는 다음 버림 번호 · 차례와 섞이지 않는다", async () => {
    const { port, layer } = makeLayer();
    const d1 = await firstTurnThenDeadDiscard(layer, port);
    const line = layer.port.speak("Tell me more.");
    port.lastUtterance().start();
    await advance(1000);
    port.lastUtterance().end();
    await line;
    layer.port.listen(RULE);
    await advance(Math.max(discard.afterSoundMs, discard.minMs));
    expect(d1.calls).toEqual(["stop"]);
    const stopAt = d1.stopAt ?? Number.NaN;
    // end 없음: stop + end 상한 + 간격에 진짜
    const openAt = stopAt + speech.watchdogExtraMs + discard.gapMs;
    await advance(openAt - performance.now() - 1);
    expect(port.listens).toHaveLength(1);
    await advance(2);
    expect(port.listens).toHaveLength(2);
    port.lastListen().finish({
      kind: "result",
      text: "banana",
      pieces: [],
      endedBy: "silence",
      restarts: 0,
      watchdogRestarts: 0,
    });
    await flush();
    expect(port.discards).toHaveLength(2);
    const d2 = port.lastDiscard();
    await advance(DEAD_AS);
    d2.audio();
    await advance(discard.liveAsMs);
    // 앞 버림의 늦은 end: 새 버림을 닫지도, 진짜를 열지도 않는다
    d1.end();
    await flush();
    await advance(discard.gapMs);
    expect(d2.calls).toEqual([]);
    expect(port.discards).toHaveLength(2);
    expect(port.listens).toHaveLength(2);
    // 다음 차례는 새 버림 안에서 그대로 돈다
    const next = layer.port.speak("And then?");
    port.lastUtterance().start();
    await advance(1000);
    port.lastUtterance().end();
    await next;
    layer.port.listen(RULE);
    await advance(Math.max(discard.afterSoundMs, discard.minMs));
    expect(d2.calls).toEqual(["stop"]);
    d2.end();
    await advance(discard.gapMs);
    expect(port.listens).toHaveLength(3);
    expect(notes(port.trace).at(-1)).toMatchObject({
      g: "discard",
      why: "sound",
      sk: "teacher",
    });
  });
});

describe("버림 층 살아 있는 버림 · 떠남 · 숨김 · 마이크 확인", () => {
  it("버림 층 서버 기다림 동안은 소리 없는 버림의 안전 상한을 세지 않고, 끝난 뒤부터 다시 잰다(N-1)", async () => {
    const { port, layer } = makeLayer();
    const d = await firstTurnThenDeadDiscard(layer, port);
    const cap = speech.maxListenMs + speech.watchdogExtraMs;
    layer.serverWait(true);
    await advance(cap * 2);
    expect(d.calls).toEqual([]);
    layer.serverWait(false);
    await advance(cap - 10);
    expect(d.calls).toEqual([]);
    await advance(20);
    expect(d.calls).toEqual(["stop"]);
  });

  it("버림 층 진짜 중 새 listen 은 앞 진짜를 끊고, 그 끝 뒤 누름을 다시 걸어 버림부터 짧은 말 뒤 진짜를 연다", async () => {
    const { port, layer } = makeLayer();
    layer.port.unlockFromGesture();
    const first = layer.port.listen(RULE);
    const second = layer.port.listen(RULE);
    await expect(first.outcome).resolves.toMatchObject({
      kind: "interrupted",
      reason: "leave",
    });
    expect(port.listens[0]?.cancels).toBe(1);
    // 끊긴 진짜 뒤는 '버림부터': 걸린 누름이 버림을 열고 그 안 짧은 말 뒤에 진짜
    const d = port.lastDiscard();
    d.audio();
    await advance(discard.liveAsMs);
    expect(port.calls.at(-1)).toBe(FALLBACK_AGAIN);
    port.lastUtterance().start();
    await advance(1200);
    port.lastUtterance().end();
    await flush();
    await advance(discard.minMs);
    d.end();
    await advance(discard.gapMs);
    expect(port.listens).toHaveLength(2);
    port.lastListen().finish({ kind: "no-result" });
    await expect(second.outcome).resolves.toEqual({ kind: "no-result" });
  });

  it("버림 층은 살아 있는 버림을 stop 으로만 닫고(abort 0), end 뒤 읽기를 세션 없이 흘린다(F3)", async () => {
    const { port, layer } = makeLayer();
    layer.port.unlockFromGesture();
    const handle = layer.port.listen(RULE);
    port.lastListen().finish({ kind: "no-result" });
    await handle.outcome;
    const d = port.lastDiscard();
    const line = layer.port.speak("Are you there?");
    await advance(discard.liveAsMs);
    expect(d.calls).toEqual(["stop"]);
    expect(port.calls).not.toContain("speak:Are you there?");
    d.end();
    await flush();
    expect(port.calls.at(-1)).toBe("speak:Are you there?");
    expect(port.discards).toHaveLength(1);
    port.lastUtterance().start();
    port.lastUtterance().end();
    await line;
    expect(port.discards.flatMap((x) => x.calls)).not.toContain("abort");
  });

  it("버림 층 떠남은 열린 버림을 stop 하고 걸린 손잡이를 끊김(leave)으로 끝낸다", async () => {
    const { port, layer, views } = makeLayer();
    const d = await firstTurnThenDeadDiscard(layer, port);
    void layer.port.speak("Bye.");
    const handle = layer.port.listen(RULE);
    layer.leave();
    await expect(handle.outcome).resolves.toMatchObject({
      kind: "interrupted",
      reason: "leave",
    });
    expect(d.calls).toEqual(["stop"]);
    expect(views.at(-1)?.waiting).toBe(false);
  });

  it("버림 층 떠남은 열린 진짜를 끊고, 그 뒤 읽기는 '버림부터' 새 버림 안에서 읽는다", async () => {
    const { port, layer } = makeLayer();
    layer.port.unlockFromGesture();
    const handle = layer.port.listen(RULE);
    layer.leave();
    await expect(handle.outcome).resolves.toMatchObject({
      kind: "interrupted",
    });
    expect(port.lastListen().cancels).toBe(1);
    expect(port.discards).toHaveLength(0);
    void layer.port.speak("See you.");
    expect(port.discards).toHaveLength(1);
    port.lastDiscard().audio();
    await advance(discard.liveAsMs);
    expect(port.calls.at(-1)).toBe("speak:See you.");
  });

  it("버림 층 숨김은 걸린 손잡이를 끊김(hidden)으로 끝내고 abort 를 음성 접점에 맡긴다(층은 abort 0)", async () => {
    const { port, layer, vis } = makeLayer();
    const d = await firstTurnThenDeadDiscard(layer, port);
    void layer.port.speak("One moment.");
    const handle = layer.port.listen(RULE);
    vis.set(true);
    await expect(handle.outcome).resolves.toMatchObject({
      kind: "interrupted",
      reason: "hidden",
    });
    expect(d.calls).toEqual([]);
    // 음성 접점이 abort 해 end 가 온 뒤, 돌아와서 누르면 버림부터 열고 짧은 말
    d.end();
    vis.set(false);
    await flush();
    layer.port.listen(RULE);
    expect(port.discards).toHaveLength(2);
    port.lastDiscard().audio();
    await advance(discard.liveAsMs);
    expect(port.calls.at(-1)).toBe(FALLBACK_AGAIN);
  });

  it("버림 층 마이크 확인이 끊은 진짜 뒤 버림은 rw check 로 적힌다", async () => {
    const { port, layer } = makeLayer();
    layer.port.unlockFromGesture();
    layer.port.listen(RULE);
    // 음성 접점의 마이크 확인은 열린 듣기를 leave 로 끊는다
    void layer.port.checkMicrophone();
    port
      .lastListen()
      .finish({ kind: "interrupted", reason: "leave", partialText: "" });
    await flush();
    layer.port.listen(RULE);
    const d = port.lastDiscard();
    d.audio();
    await advance(discard.liveAsMs);
    port.lastUtterance().start();
    port.lastUtterance().end();
    await flush();
    await advance(discard.minMs);
    d.end();
    await advance(discard.gapMs);
    expect(notes(port.trace).at(-1)).toMatchObject({
      g: "reopen",
      rw: "check",
    });
  });

  it("버림 층 '잘 모르겠어요'와 걸린 손잡이 cancel 은 누름을 거두고 끊김(leave)으로 끝낸다", async () => {
    const { port, layer, views } = makeLayer();
    await firstTurnThenDeadDiscard(layer, port);
    void layer.port.speak("Tell me.");
    port.lastUtterance().start();
    const a = layer.port.listen(RULE);
    layer.dontKnow();
    await expect(a.outcome).resolves.toMatchObject({
      kind: "interrupted",
      reason: "leave",
    });
    expect(views.at(-1)?.waiting).toBe(false);
    const b = layer.port.listen(RULE);
    b.cancel();
    await expect(b.outcome).resolves.toMatchObject({
      kind: "interrupted",
      reason: "leave",
    });
    expect(views.at(-1)?.waiting).toBe(false);
  });

  it("버림 층 dispose 는 열린 버림을 stop 하고 타이머 · 알림을 거둔다(그 뒤 사건은 버린다)", async () => {
    const { port, layer } = makeLayer();
    const d = await firstTurnThenDeadDiscard(layer, port);
    layer.dispose();
    expect(d.calls).toEqual(["stop"]);
    d.end();
    await advance(60000);
    expect(port.discards).toHaveLength(1);
    layer.port.dispose();
    expect(port.calls.at(-1)).toBe("dispose");
  });
});

describe("버림 층 옮김표", () => {
  it("버림 층 진짜 결과 옮김: 다시 듣는 오류만 error, 마이크를 쓸 수 없음은 unavailable, 끊김은 층이 안 까닭", () => {
    const err = (group: "retry" | "network" | "mic-unavailable") =>
      realEndOf(
        { kind: "error", code: "x", group, partialText: "" },
        undefined,
      );
    expect(err("retry")).toEqual({ type: "real-end", kind: "error" });
    expect(err("network")).toEqual({ type: "real-end", kind: "error" });
    expect(err("mic-unavailable")).toEqual({
      type: "real-end",
      kind: "unavailable",
    });
    const cut = (reason: "hidden" | "leave" | "speak", why?: "check") =>
      realEndOf({ kind: "interrupted", reason, partialText: "" }, why);
    expect(cut("hidden")).toEqual({
      type: "real-end",
      kind: "interrupted",
      why: "hidden",
    });
    expect(cut("leave")).toEqual({
      type: "real-end",
      kind: "interrupted",
      why: "leave",
    });
    expect(cut("leave", "check")).toEqual({
      type: "real-end",
      kind: "interrupted",
      why: "check",
    });
    expect(
      realEndOf({ kind: "deaf", audiostartMs: 20, retries: 0 }, undefined),
    ).toEqual({ type: "real-end", kind: "deaf" });
  });

  it("버림 층 note 꼴은 기계의 칸과 기록 칸(Zod)이 같은 형이다(검토 4 M5)", () => {
    expectTypeOf<DiscardFlowNote>().toEqualTypeOf<DiscardNote>();
  });
});

// 마이크 점검 쪽 '자동 W 라운드 2'(브리프 task-mic-probe-fix8 갱신 절, 분석 10.19.5 Z-1~Z-7 · 차례 0~13). 차례 계획 · 버림 닫기(소리 끝 +
// 300ms 와 하한) · 읽기 앞 cancel(차례 9 예외) · speaking 거짓 확인 뒤 1초 · 차례 9 의 읽는 도중 진짜 · 굳음 뒤 cancel 복구 · 차례 12 의 S 꼴과
// banana 셈(중간 · 'banana' 든 final 만) · 차례 13 의 45초 쉼 · 갈래별 줄을 덮는다. 러너(w-round2.ts)는 가짜 인식 · 가짜 읽기(문장 · 차례마다
// 길이를 다르게, 캡처 시작과 겹치면 줄이 굳음) · 가짜 띵 · 가짜 시계로 돌린다.
import { describe, expect, it } from "vitest";
import {
  BEEP_HZ,
  BEEP_MS,
  copyTextOf,
  DECOY_GAP_MS,
  NO_RESULT_STOP_MS,
  type ProbeEnv,
  type ProbeEvent,
  type ProbeRecord,
  parseStored,
  ROUND_PAUSE_MS,
  ROUND_SILENCE_MS,
  ROUND2_BEEP_GAIN,
  ROUND2_CANCEL_SETTLE_MS,
  ROUND2_SENTENCE,
  ROUND2_SOUND_END_WAIT_MS,
  ROUND2_SOUND_TAIL_MS,
  type Round2PlanStep,
  recordLogOf,
  round2LineOf,
  round2LinesOf,
  round2LogOf,
  round2PlanOf,
  round2RowOf,
  roundRowOf,
  roundSurvivalOf,
  rowCells,
  rowOf,
  UNLOCK_TEXT,
} from "../../src/app/dev/mic-probe/probe-log";
import { MIC_TEXT } from "../../src/app/dev/mic-probe/probe-text";
import type {
  RoundRecognition,
  RoundSpeakHandlers,
  RoundSpeakOptions,
  RoundSpeech,
} from "../../src/app/dev/mic-probe/w-round";
import {
  type Round2View,
  type RoundBeepHandlers,
  WRound2Runner,
} from "../../src/app/dev/mic-probe/w-round2";

/** 가짜 시계: 예약을 시각 차례로 돌린다. */
class Clock {
  t = 0;
  private queue: { id: number; at: number; fn: () => void }[] = [];
  private nextId = 1;
  later = (fn: () => void, ms: number): number => {
    const id = this.nextId++;
    this.queue.push({ id, at: this.t + ms, fn });
    return id;
  };
  cancel = (id: number) => {
    this.queue = this.queue.filter((q) => q.id !== id);
  };
  advance(ms: number) {
    const end = this.t + ms;
    for (;;) {
      this.queue.sort((a, b) => a.at - b.at || a.id - b.id);
      const next = this.queue[0];
      if (next === undefined || next.at > end) break;
      this.queue.shift();
      this.t = next.at;
      next.fn();
    }
    this.t = end;
  }
}

type RecScript = {
  as: number | null;
  results?: { at: number; text: string; final: boolean }[];
};
const STOP_END_MS = 30;

class FakeRec implements RoundRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  onaudiostart: RoundRecognition["onaudiostart"] = null;
  onsoundstart: RoundRecognition["onsoundstart"] = null;
  onspeechstart: RoundRecognition["onspeechstart"] = null;
  onspeechend: RoundRecognition["onspeechend"] = null;
  onsoundend: RoundRecognition["onsoundend"] = null;
  onaudioend: RoundRecognition["onaudioend"] = null;
  onresult: RoundRecognition["onresult"] = null;
  onerror: RoundRecognition["onerror"] = null;
  onend: RoundRecognition["onend"] = null;
  calls: string[] = [];
  private pending: number[] = [];
  private heard: { text: string; final: boolean }[] = [];
  constructor(
    private readonly clock: Clock,
    private readonly script: RecScript,
    private readonly onStart: () => void,
  ) {}
  private at(ms: number, fn: () => void) {
    this.pending.push(this.clock.later(fn, ms));
  }
  private cut() {
    for (const id of this.pending) this.clock.cancel(id);
    this.pending = [];
  }
  start() {
    this.calls.push("start");
    this.onStart();
    if (this.script.as !== null)
      this.at(this.script.as, () => this.onaudiostart?.());
    for (const r of this.script.results ?? []) {
      this.at(r.at, () => {
        // 중간 결과는 같은 자리를 덮고, final 이 되면 다음 자리로 넘어간다(iOS 연속 인식 꼴)
        const last = this.heard.at(-1);
        if (last !== undefined && !last.final) this.heard.pop();
        this.heard.push(r);
        const results = this.heard.map((h) => ({
          isFinal: h.final,
          length: 1,
          0: { transcript: h.text },
        }));
        this.onresult?.({ resultIndex: this.heard.length - 1, results });
      });
    }
  }
  stop() {
    this.calls.push("stop");
    this.cut();
    this.clock.later(() => this.onend?.(), STOP_END_MS);
  }
  abort() {
    this.calls.push("abort");
    this.cut();
    this.clock.later(() => this.onend?.(), 10);
  }
}

const SPEAK_START_MS = 10;
const UNLOCK_MS = 50;
/** 문장마다 기본 길이(실기기 어림 — 짧은 말 0.6 · 보통 말 1.3 · 긴 문장 2.6초). */
const LENGTH_OF: Record<string, number> = {
  [UNLOCK_TEXT]: UNLOCK_MS,
  [ROUND2_SENTENCE.short]: 600,
  [ROUND2_SENTENCE.normal]: 1_300,
  [ROUND2_SENTENCE.long]: 2_600,
};

type Utter = {
  text: string;
  handlers: RoundSpeakHandlers;
  state: "pending" | "speaking";
  timers: number[];
};

/**
 * 가짜 읽기 줄. length(text, n)으로 부른 차례(n)마다 길이를 달리 줄 수 있고(null 이면 시작만 하고 끝 알림 없음), freeze() 하면 읽던 것이
 * speaking 참으로 멈추고 뒤에 부른 것은 pending 으로 쌓인다(기록 5 · 7 의 줄 굳음). cancel() 만 줄을 푼다.
 */
class FakeSpeech implements RoundSpeech {
  spoken: (RoundSpeakOptions & { at: number })[] = [];
  cancels: number[] = [];
  /** 끝 알림 뒤에도 speaking 이 참으로 남는 ms(거짓 확인 시험용). */
  lingerMs = 0;
  /** 이때까지 speaking 이 참으로 남는다(Infinity 면 늘). */
  private lingerUntil = 0;
  private queue: Utter[] = [];
  private frozen = false;
  constructor(
    private readonly clock: Clock,
    private readonly length: (
      text: string,
      n: number,
    ) => number | null | "never" = (text) => LENGTH_OF[text] ?? 1_000,
  ) {}
  state() {
    return {
      speaking:
        this.queue[0]?.state === "speaking" || this.clock.t < this.lingerUntil,
      pending: this.queue.some((u) => u.state === "pending"),
    };
  }
  freeze() {
    const current = this.queue[0];
    if (current?.state !== "speaking") return;
    this.frozen = true;
    for (const id of current.timers) this.clock.cancel(id);
  }
  /** 늘 speaking 참(굳어 풀리지 않는 줄). */
  stickSpeaking() {
    this.lingerUntil = Number.POSITIVE_INFINITY;
  }
  cancel() {
    this.cancels.push(this.clock.t);
    const dropped = this.queue;
    this.queue = [];
    this.frozen = false;
    if (this.lingerUntil !== Number.POSITIVE_INFINITY) this.lingerUntil = 0;
    for (const u of dropped) {
      for (const id of u.timers) this.clock.cancel(id);
      u.handlers.error("canceled");
    }
  }
  speak(options: RoundSpeakOptions, handlers: RoundSpeakHandlers) {
    const n = this.spoken.length;
    this.spoken.push({ ...options, at: this.clock.t });
    const utter: Utter = {
      text: options.text,
      handlers,
      state: "pending",
      timers: [],
    };
    this.queue.push(utter);
    if (this.queue.length === 1 && !this.frozen) this.begin(utter, n);
  }
  private begin(utter: Utter, n: number) {
    const ms = this.length(utter.text, n);
    // never: 시작 알림도 없다(iOS 가 사건 없이 버림)
    if (ms === "never") return;
    utter.timers.push(
      this.clock.later(() => {
        utter.state = "speaking";
        utter.handlers.start("기본");
      }, SPEAK_START_MS),
    );
    if (ms === null) return;
    utter.timers.push(
      this.clock.later(() => {
        if (this.queue[0] !== utter) return;
        this.queue.shift();
        if (this.lingerUntil !== Number.POSITIVE_INFINITY) {
          this.lingerUntil = this.clock.t + this.lingerMs;
        }
        utter.handlers.end();
        const next = this.queue[0];
        if (next !== undefined && !this.frozen) this.begin(next, n + 1);
      }, ms),
    );
  }
}

class FakeBeep {
  beeps: { at: number; hz: number; gain: number; ms: number }[] = [];
  ends = true;
  constructor(private readonly clock: Clock) {}
  play = (
    options: { hz: number; gain: number; ms: number },
    handlers: RoundBeepHandlers,
  ) => {
    this.beeps.push({ ...options, at: this.clock.t });
    handlers.start("running");
    if (this.ends) this.clock.later(() => handlers.end("running"), options.ms);
  };
}

const dead: RecScript = { as: 35 };
const apple: RecScript = {
  as: 380,
  results: [{ at: 1_200, text: "apple", final: true }],
};
const deaf: RecScript = { as: 35 };

type HarnessOptions = {
  length?: (text: string, n: number) => number | null | "never";
  /** 캡처 시작 때 읽는 중이면 줄이 굳는다(기본 켬). */
  freezeOnStart?: boolean;
};

function harness(
  scripts: RecScript[] | ((n: number) => RecScript),
  plan: readonly Round2PlanStep[] = round2PlanOf(),
  options: HarnessOptions = {},
) {
  const clock = new Clock();
  const speech = new FakeSpeech(clock, options.length);
  const beep = new FakeBeep(clock);
  const recs: FakeRec[] = [];
  const views: { at: number; view: Round2View | null }[] = [];
  const records: ProbeRecord[] = [];
  const done: { stopped: boolean; line: string }[] = [];
  let nth = 0;
  let lastEnd: {
    at: number | null;
    reason: ProbeRecord["stopReason"];
    method: ProbeRecord["stopMethod"];
  } = { at: null, reason: null, method: null };
  let spoke = false;
  const runner = new WRound2Runner(
    {
      header: {
        load: 1,
        tabId: "t1",
        tabFirstLoad: true,
        navigationType: "navigate",
      },
      nextNth: () => {
        nth += 1;
        return nth;
      },
      prevEnd: () => lastEnd,
      spokeSinceEnd: () => spoke,
      markSpoke: () => {
        spoke = true;
      },
      snapshot: () => ({ webAudioState: null, audioSessionType: "auto" }),
      teacher: { pitch: 1.1, prefer: ["Samantha"] },
    },
    {
      now: () => clock.t,
      later: clock.later,
      cancelLater: clock.cancel,
      createRecognition: () => {
        const script =
          typeof scripts === "function"
            ? scripts(recs.length)
            : (scripts[recs.length] ?? dead);
        const rec = new FakeRec(clock, script, () => {
          if (options.freezeOnStart !== false) speech.freeze();
        });
        recs.push(rec);
        return rec;
      },
      speech: () => speech,
      visibility: () => "visible",
      isoNow: () => "2026-11-07T00:00:00.000Z",
      beep: beep.play,
      audioState: () => "running",
    },
    {
      view: (view) => views.push({ at: clock.t, view }),
      finish: (record, at) => {
        records.push(record);
        lastEnd = { at, reason: record.stopReason, method: record.stopMethod };
        spoke = false;
      },
      done: (result) =>
        done.push({
          stopped: result.stopped,
          line: round2LineOf(result.lines),
        }),
    },
    plan,
    "run1",
  );
  return { clock, speech, beep, recs, views, records, done, runner };
}

const TEN_MIN = 600_000;

const planAt = (...steps: number[]): Round2PlanStep[] =>
  steps.map((step) => {
    const found = round2PlanOf()[step];
    if (found === undefined) throw new Error(`차례 ${step} 없음`);
    return found;
  });

const eventsOf = (record: ProbeRecord, type: ProbeEvent["type"]) =>
  record.events.filter((e) => e.type === type);
const first = (record: ProbeRecord, pick: (e: ProbeEvent) => boolean) => {
  const found = record.events.find(pick);
  if (found === undefined) throw new Error("사건 없음");
  return found;
};
const startOf = (record: ProbeRecord, attempt: number) =>
  record.attempts[attempt]?.startCallAt ?? Number.NaN;
const only = (records: readonly ProbeRecord[]) => {
  const [record] = records;
  if (record === undefined) throw new Error("기록 없음");
  return record;
};

const ENV: ProbeEnv = {
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  platform: "MacIntel",
  maxTouchPoints: 5,
  device: "iPad",
  micPermission: "granted",
  visibility: "visible",
  audioSessionType: "auto",
  recognition: "webkitSpeechRecognition",
  tabId: "t1",
  tabFirstLoad: true,
  newTab: false,
  navigationType: "navigate",
  openedAt: "2026-11-07T00:00:00.000Z",
  load: 1,
  webAudioState: null,
};

describe("마이크 점검 쪽 자동 W 라운드 2", () => {
  it("자동 차례는 0~13 열넷이고 버림 하한 · 소리 · cancel · 소리 끝 기다림 · 진짜 꼴 · 갈래 · 쉼이 브리프 갱신 절 표와 같다", () => {
    const plan = round2PlanOf();
    expect(plan.map((s) => s.step)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ]);
    expect(plan.map((s) => s.decoyMs)).toEqual([
      0, 5_000, 3_000, 3_000, 3_000, 1_500, 1_500, 3_000, 3_000, 3_000, 3_000,
      3_000, 3_000, 0,
    ]);
    expect(plan.map((s) => s.sound)).toEqual([
      "normal",
      "normal",
      "short",
      "short",
      "short",
      "short",
      "short",
      "beep",
      "beep",
      "long",
      "short",
      "short",
      "short",
      "normal",
    ]);
    // 읽기 앞 cancel 은 굳음 만들기(9)와 띵(7 · 8)만 없다
    expect(plan.filter((s) => !s.cancel).map((s) => s.step)).toEqual([7, 8, 9]);
    expect(plan.filter((s) => !s.waitSound).map((s) => s.step)).toEqual([9]);
    expect(plan.map((s) => s.soundAt)).toEqual([
      ...Array(9).fill("audiostart"),
      2_000,
      ...Array(4).fill("audiostart"),
    ]);
    expect(plan.filter((s) => s.real === "s").map((s) => s.step)).toEqual([12]);
    expect(plan.map((s) => s.group)).toEqual([
      "first",
      "control",
      "short3",
      "short3",
      "short3",
      "short15",
      "short15",
      "beep",
      "beep",
      "stuck",
      "recover",
      "recover",
      "u16",
      "first",
    ]);
    // 차례 0 은 무음 읽기 끝 뒤 곧바로, 차례 13 앞만 45초 쉼, 그 밖은 2초
    expect(plan.map((s) => s.waitMs)).toEqual([
      0,
      ...Array(12).fill(2_000),
      ROUND_PAUSE_MS,
    ]);
    expect(plan.filter((s) => s.rest).map((s) => s.step)).toEqual([13]);
    expect(plan.at(-1)?.resetStep).toBe("pause-45");
    expect(ROUND2_SENTENCE).toEqual({
      short: "Okay.",
      normal: "That is good.",
      long: "The sea is blue and the sun is warm today.",
    });
  });

  it("누름 안에서 줄을 비우고(cancel) 무음 읽기를 부르며, 차례 0 은 버림 없이 cancel → 0.3초 → 세션 없이 보통 말 → 끝 → 1초 → 진짜(start 때만 'apple')", () => {
    const h = harness([apple], planAt(0));
    h.runner.start();
    // 누름 안(시계가 가기 전): cancel 다음 무음 읽기
    expect(h.speech.cancels).toEqual([0]);
    expect(h.speech.spoken[0]).toMatchObject({ text: UNLOCK_TEXT, at: 0 });
    h.clock.advance(TEN_MIN);
    const record = only(h.records);
    expect(record.strategy).toBe("WR2");
    expect(record.round).toMatchObject({
      step: 0,
      sound: "normal",
      sentence: "That is good.",
      cancel: true,
      group: "first",
    });
    expect(record.round?.slots).toEqual([
      { role: "real", plannedMs: null, speak: false },
    ]);
    expect(record.unlockBefore).toMatchObject({ started: true, ended: true });
    // 누름 안에서 만든 AudioContext 상태를 첫 차례에 남긴다
    expect(first(record, (e) => e.type === "webaudio-start").code).toBe(
      "running",
    );
    // 무음 읽기 끝(50) 뒤 곧바로 cancel, 0.3초 뒤 보통 말(기본 빠르기 — rate 없음)
    expect(h.speech.cancels[1]).toBe(UNLOCK_MS);
    expect(h.speech.spoken[1]).toEqual({
      text: "That is good.",
      pitch: 1.1,
      prefer: ["Samantha"],
      at: UNLOCK_MS + ROUND2_CANCEL_SETTLE_MS,
    });
    const realStart = startOf(record, 0);
    const bareEnd = first(
      record,
      (e) => e.type === "speak-end" && e.utterance === "bare",
    );
    expect(realStart - bareEnd.at).toBe(DECOY_GAP_MS);
    expect(
      h.views.filter((v) => v.view?.kind === "say").map((v) => v.at),
    ).toEqual([realStart]);
    const row = round2RowOf(record);
    expect(row).toMatchObject({
      decoyMs: null,
      decoy: null,
      cancel: {
        at: { speaking: false, pending: false },
        after: { speaking: false, pending: false },
      },
      soundCall: -(1_300 + DECOY_GAP_MS),
      soundEnd: -DECOY_GAP_MS,
      soundEndMissing: false,
      clean: true,
    });
    expect(row?.session).toMatchObject({ as: 380, apple: true, banana: null });
    expect(record.stopReason).toBe("silence");
  });

  it("버림 닫기: 소리가 하한보다 짧으면 하한(3초)에 stop, 길면 '소리 끝 + 300ms' 에 stop 하고, 버림 앞 cancel 은 0.3초 먼저 · 소리는 audiostart 0.2초 뒤다", () => {
    // 차례 2(3초 · 짧은 말 0.6초)
    const short = harness([dead, apple], planAt(2));
    short.runner.start();
    short.clock.advance(TEN_MIN);
    const a = only(short.records);
    const decoyStart = startOf(a, 0);
    const cancel = first(
      a,
      (e) => e.type === "speak-cancel" && e.code === "before-speak",
    );
    expect(decoyStart - cancel.at).toBe(ROUND2_CANCEL_SETTLE_MS);
    // 차례 사이 2초: 무음 읽기 끝 → 버림 start
    expect(decoyStart).toBe(UNLOCK_MS + 2_000);
    const call = first(a, (e) => e.type === "speak-call");
    expect(call.at - decoyStart).toBe(35 + 200);
    expect(call.message).toBe("Okay.");
    const stop = first(a, (e) => e.type === "stop-call" && e.code === "decoy");
    expect(stop.at - decoyStart).toBe(3_000);
    expect(round2RowOf(a)).toMatchObject({
      soundCall: 235,
      soundStart: 245,
      soundEnd: 835,
      clean: true,
      decoy: { as: 35, alive: false, actualMs: 3_030, stopSpeaking: false },
    });

    // 차례 5(1.5초)에 이번만 짧은 말이 2초 걸리면: 끝 2235 + 300 = 2535 에 stop
    const long = harness([dead, apple], planAt(5), {
      length: (text) => (text === "Okay." ? 2_000 : (LENGTH_OF[text] ?? 0)),
    });
    long.runner.start();
    long.clock.advance(TEN_MIN);
    const b = only(long.records);
    const bStop = first(b, (e) => e.type === "stop-call" && e.code === "decoy");
    expect(bStop.at - startOf(b, 0)).toBe(235 + 2_000 + ROUND2_SOUND_TAIL_MS);
    expect(round2RowOf(b)?.clean).toBe(true);

    // audiostart 가 1초 안에 안 오면 1초에 부른다
    const late = harness([{ as: null }, apple], planAt(2));
    late.runner.start();
    late.clock.advance(TEN_MIN);
    const c = only(late.records);
    expect(first(c, (e) => e.type === "speak-call").at - startOf(c, 0)).toBe(
      1_000,
    );
  });

  it("소리 끝 알림이 소리 시작 뒤 3초 안에 안 오면 '끝 없음' 을 남기고 cancel 뒤 stop 하며, 그 차례는 깨끗하지 않아 갈래 셈에서 뺀다", () => {
    const h = harness([dead, apple], planAt(3), {
      length: (text) => (text === "Okay." ? null : (LENGTH_OF[text] ?? 0)),
    });
    h.runner.start();
    h.clock.advance(TEN_MIN);
    const record = only(h.records);
    // 3초는 시작 알림부터 잰다
    const started = first(record, (e) => e.type === "speak-start");
    const missing = first(record, (e) => e.type === "speak-end-missing");
    expect(missing.at - started.at).toBe(ROUND2_SOUND_END_WAIT_MS);
    const cancel = first(
      record,
      (e) => e.type === "speak-cancel" && e.code === "end-missing",
    );
    expect(cancel).toMatchObject({ speaking: true, at: missing.at });
    expect(h.speech.cancels).toContain(missing.at);
    const stop = first(
      record,
      (e) => e.type === "stop-call" && e.code === "decoy",
    );
    expect(stop.at).toBe(missing.at);
    const row = round2RowOf(record);
    expect(row).toMatchObject({ soundEndMissing: true, clean: false });
    const lines = round2LinesOf(h.records);
    expect(lines.excluded).toEqual([3]);
    expect(lines.groups.find((g) => g.group === "short3")).toEqual({
      group: "short3",
      n: 0,
      m: 0,
    });

    // 시작 알림도 없으면 부른 때부터 3초
    const never = harness([dead, apple], planAt(4), {
      length: (text) => (text === "Okay." ? "never" : (LENGTH_OF[text] ?? 0)),
    });
    never.runner.start();
    never.clock.advance(TEN_MIN);
    const nr = only(never.records);
    const nCall = first(nr, (e) => e.type === "speak-call");
    const nMissing = first(nr, (e) => e.type === "speak-end-missing");
    expect(nMissing.at - nCall.at).toBe(ROUND2_SOUND_END_WAIT_MS);
    expect(eventsOf(nr, "speak-start")).toHaveLength(0);
    expect(round2RowOf(nr)).toMatchObject({
      soundStart: null,
      soundEndMissing: true,
      clean: false,
    });
  });

  it("버림 end 뒤 speaking 이 거짓이 되기를 0.3초까지 기다려 남기고 그 뒤 1초에 진짜를 연다(거짓이 안 되면 0.3초에 그대로 남기고 연다)", () => {
    // 끝 알림 뒤에도 0.45초 speaking 이 참: end(3030) 은 끝 835 + 450 = 1285 보다 늦어 곧바로 거짓 → 기다림 0
    const quick = harness([dead, apple], planAt(2));
    quick.speech.lingerMs = 450;
    quick.runner.start();
    quick.clock.advance(TEN_MIN);
    const q = only(quick.records);
    expect(first(q, (e) => e.code === "gap")).toMatchObject({
      speaking: false,
      message: "0",
    });

    // 하한 1.5초 · 짧은 말 1.0초: 끝 1235 + 300 = 1535 stop → end 1565, speaking 은 1235 + 450 = 1685 까지 참
    const linger = harness([dead, apple], planAt(5), {
      length: (text) => (text === "Okay." ? 1_000 : (LENGTH_OF[text] ?? 0)),
    });
    linger.speech.lingerMs = 450;
    linger.runner.start();
    linger.clock.advance(TEN_MIN);
    const l = only(linger.records);
    const decoyEnd = first(l, (e) => e.type === "end" && e.attempt === 0);
    const gap = first(l, (e) => e.code === "gap");
    // 50ms 마다 재서 1565 → 1615 → 1665(참) → 1715(거짓)
    expect(gap.at - decoyEnd.at).toBe(150);
    expect(gap).toMatchObject({ speaking: false, message: "150" });
    expect(startOf(l, 1) - gap.at).toBe(DECOY_GAP_MS);

    // 늘 참이면 0.3초에 참으로 남기고 1초 뒤 연다
    const stuck = harness([dead, apple], planAt(2));
    stuck.speech.stickSpeaking();
    stuck.runner.start();
    stuck.clock.advance(TEN_MIN);
    const s = only(stuck.records);
    const sEnd = first(s, (e) => e.type === "end" && e.attempt === 0);
    const sGap = first(s, (e) => e.code === "gap");
    expect(sGap).toMatchObject({ speaking: true, message: "300" });
    expect(sGap.at - sEnd.at).toBe(300);
    expect(startOf(s, 1) - sEnd.at).toBe(300 + DECOY_GAP_MS);
    expect(round2RowOf(s)?.decoy?.gapSpeaking).toBe(true);
  });

  it("차례 7 · 8 의 띵: cancel 없이 audiostart 0.2초 뒤 440Hz · 1초 · 음량 0.1 을 내고, 재생 끝 + 300ms 와 하한 3초를 채운 뒤 stop 한다", () => {
    const h = harness([dead, apple], planAt(7));
    h.runner.start();
    h.clock.advance(TEN_MIN);
    const record = only(h.records);
    const decoyStart = startOf(record, 0);
    expect(h.beep.beeps).toEqual([
      {
        hz: BEEP_HZ,
        gain: ROUND2_BEEP_GAIN,
        ms: BEEP_MS,
        at: decoyStart + 235,
      },
    ]);
    expect(ROUND2_BEEP_GAIN).toBe(0.1);
    // 무음 읽기 앞 cancel 하나뿐(띵 차례는 읽기가 없어 cancel 도 없음)
    expect(h.speech.cancels).toEqual([0]);
    expect(eventsOf(record, "speak-cancel")).toHaveLength(0);
    expect(
      first(record, (e) => e.type === "stop-call" && e.code === "decoy").at -
        decoyStart,
    ).toBe(3_000);
    expect(round2RowOf(record)).toMatchObject({
      sound: "beep",
      cancel: null,
      soundCall: 235,
      soundEnd: 235 + BEEP_MS,
      clean: true,
    });

    // 띵이 끝나지 않으면 '끝 없음'(1초 + 3초 뒤) 으로 stop 하고 뺀다
    const silent = harness([dead, apple], planAt(8));
    silent.beep.ends = false;
    silent.runner.start();
    silent.clock.advance(TEN_MIN);
    const s = only(silent.records);
    const missing = first(
      s,
      (e) => e.type === "webaudio-beep" && e.code === "end-missing",
    );
    expect(missing.at - startOf(s, 0)).toBe(
      235 + BEEP_MS + ROUND2_SOUND_END_WAIT_MS,
    );
    expect(round2RowOf(s)).toMatchObject({
      soundEndMissing: true,
      clean: false,
    });
  });

  it("차례 9 는 cancel 없이 긴 문장을 버림 2초에 부르고 하한 3초에 바로 stop → 1초 뒤 읽는 도중 진짜를 열어 줄을 굳히고, 차례 10 의 cancel 이 그 줄을 풀어 읽기가 시작된다", () => {
    const h = harness([dead, apple, dead, apple], planAt(9, 10));
    h.runner.start();
    h.clock.advance(TEN_MIN);
    const [nine, ten] = h.records;
    if (nine === undefined || ten === undefined) throw new Error("기록 없음");
    const decoyStart = startOf(nine, 0);
    expect(eventsOf(nine, "speak-cancel")).toHaveLength(0);
    const call = first(nine, (e) => e.type === "speak-call");
    expect(call.at - decoyStart).toBe(2_000);
    expect(call.message).toBe(ROUND2_SENTENCE.long);
    const stop = first(
      nine,
      (e) => e.type === "stop-call" && e.code === "decoy",
    );
    expect(stop.at - decoyStart).toBe(3_000);
    // 거짓 확인 없이 end 1초 뒤 진짜(읽는 중)
    const end = first(nine, (e) => e.type === "end" && e.attempt === 0);
    expect(startOf(nine, 1) - end.at).toBe(DECOY_GAP_MS);
    const row9 = round2RowOf(nine);
    expect(row9).toMatchObject({
      group: "stuck",
      cancel: null,
      soundEnd: null,
      clean: false,
      decoy: { stopSpeaking: true, gapSpeaking: true },
    });
    expect(row9?.session?.startSpeaking).toBe(true);
    // 차례 10: 굳은 줄 위에서 cancel(그때 speaking 참) → 0.3초 뒤 거짓 → 짧은 말이 시작 · 끝
    const row10 = round2RowOf(ten);
    expect(row10?.cancel).toEqual({
      at: { speaking: true, pending: false },
      after: { speaking: false, pending: false },
    });
    expect(row10).toMatchObject({
      group: "recover",
      soundStart: 245,
      soundEnd: 835,
      clean: true,
    });
    expect(row10?.session?.apple).toBe(true);

    // cancel 이 없다면(가짜 줄이 굳은 채) 같은 차례의 읽기는 pending 으로 남는다 — 굳음이 정말 생겼는지 확인
    expect(h.speech.spoken.map((s) => s.text)).toEqual([
      UNLOCK_TEXT,
      ROUND2_SENTENCE.long,
      "Okay.",
    ]);
  });

  it("읽기 앞 cancel: 라운드 전체에서 버림 · 세션 없이 · 세션 중 읽기 모두 앞에 cancel 표지가 있고(차례 9 만 없음), 세션 없이 · 세션 중 읽기는 cancel 0.3초 뒤에 부른다", () => {
    const h = harness(fullScript());
    h.runner.start();
    h.clock.advance(TEN_MIN);
    expect(h.records).toHaveLength(14);
    for (const record of h.records) {
      const step = record.round?.step;
      const calls = eventsOf(record, "speak-call");
      const cancels = record.events.filter(
        (e) => e.type === "speak-cancel" && e.code === "before-speak",
      );
      if (step === 7 || step === 8) {
        expect(calls).toHaveLength(0);
        expect(cancels).toHaveLength(0);
        continue;
      }
      if (step === 9) {
        expect(cancels).toHaveLength(0);
        continue;
      }
      // 차례 12 는 버림 하나 · 세션 중 하나
      expect(cancels).toHaveLength(calls.length);
      calls.forEach((call, i) => {
        const cancel = cancels[i];
        expect(cancel).toBeDefined();
        expect(call.at).toBeGreaterThan(cancel?.at ?? Number.POSITIVE_INFINITY);
        const settled = record.events.find(
          (e) =>
            e.code === "after-cancel" &&
            e.at === (cancel?.at ?? 0) + ROUND2_CANCEL_SETTLE_MS,
        );
        expect(settled).toBeDefined();
        if (call.utterance === "bare" || call.attempt === 1) {
          expect(call.at - (cancel?.at ?? 0)).toBe(ROUND2_CANCEL_SETTLE_MS);
        }
      });
    }
  });

  it("차례 12(U16): 진짜를 S 꼴로 열어 'apple' 이 든 중간 결과 2초 뒤 cancel → 0.3초 → 짧은 말 → 끝 뒤 'banana' 를 보이고, 메아리 · 'banana' 없는 final · 중간 결과로는 멈추지 않고 'banana' 든 final 1.5초 뒤 stop 한다", () => {
    const real: RecScript = {
      as: 380,
      results: [
        { at: 1_000, text: "apple", final: false },
        // 읽기 메아리(final) — banana 가 아니라 멈추지 않는다
        { at: 3_900, text: " Okay", final: true },
        { at: 6_000, text: " ban", final: false },
        { at: 6_400, text: " banana", final: false },
        { at: 7_000, text: " banana", final: true },
      ],
    };
    const h = harness([dead, real], planAt(12));
    h.runner.start();
    h.clock.advance(TEN_MIN);
    const record = only(h.records);
    const realStart = startOf(record, 1);
    const rel = (e: ProbeEvent) => e.at - realStart;
    const cancel = first(
      record,
      (e) =>
        e.type === "speak-cancel" &&
        e.code === "before-speak" &&
        e.attempt === 1,
    );
    expect(rel(cancel)).toBe(1_000 + 2_000);
    expect(cancel.message).toBe("apple");
    const call = first(
      record,
      (e) => e.type === "speak-call" && e.attempt === 1,
    );
    expect(rel(call)).toBe(3_000 + ROUND2_CANCEL_SETTLE_MS);
    expect(call.message).toBe("Okay.");
    const banana = first(
      record,
      (e) => e.type === "prompt" && e.code === "banana",
    );
    expect(rel(banana)).toBe(3_300 + 600);
    const stop = first(
      record,
      (e) => e.type === "stop-call" && e.attempt === 1,
    );
    expect(record.stopReason).toBe("final");
    expect(rel(stop)).toBe(7_000 + ROUND_SILENCE_MS);
    const realViews = h.views
      .filter((v) => v.at >= realStart && v.view?.kind !== "done")
      .map((v) => (v.view?.kind === "say" ? v.view.word : v.view?.kind));
    expect(realViews).toEqual(["apple", "wait", "banana", "wait"]);
    const row = round2RowOf(record);
    expect(row?.session).toMatchObject({
      apple: true,
      banana: true,
      interims: 3,
      finals: 2,
      echo: 1,
      speakStart: 3_300 + SPEAK_START_MS,
      speakEnd: 3_900,
      speakEndMissing: false,
      bananaAt: 3_900,
      speakCancel: { speaking: false, pending: false },
    });
    expect(round2LinesOf(h.records).u16).toBe("됨");

    // banana 가 중간 결과에만 들고 final 이 없으면: 들음 아님 · 'banana' 6초 뒤 stop → U16 안 됨
    const interimOnly = harness(
      [
        dead,
        {
          as: 380,
          results: [
            { at: 1_000, text: "apple", final: true },
            { at: 6_000, text: " banana", final: false },
          ],
        },
      ],
      planAt(12),
    );
    interimOnly.runner.start();
    interimOnly.clock.advance(TEN_MIN);
    const io = only(interimOnly.records);
    const ioStart = startOf(io, 1);
    const ioBanana = first(
      io,
      (e) => e.type === "prompt" && e.code === "banana",
    );
    const ioStop = first(io, (e) => e.type === "stop-call" && e.attempt === 1);
    expect(ioStop.at - ioBanana.at).toBe(NO_RESULT_STOP_MS);
    expect(io.stopReason).toBe("no-result");
    expect(ioStop.at - ioStart).toBeLessThan(20_000);
    expect(round2RowOf(io)?.session?.banana).toBe(false);
    expect(round2LinesOf(interimOnly.records).u16).toBe("안 됨");

    // 세션 중 읽기가 시작만 하고 끝 알림이 없으면 5초 뒤 '끝 없음' 으로 'banana' 를 보인다. banana 를 들어도 '읽기 멈춤'(검토 fix 8 C1)
    const blocked = harness(
      [
        dead,
        {
          as: 380,
          results: [
            { at: 1_000, text: "apple", final: true },
            { at: 9_000, text: " banana", final: true },
          ],
        },
      ],
      planAt(12),
      { length: (text, n) => (n === 2 ? null : (LENGTH_OF[text] ?? 0)) },
    );
    blocked.runner.start();
    blocked.clock.advance(TEN_MIN);
    const bl = only(blocked.records);
    const blRow = round2RowOf(bl);
    expect(blRow?.session?.speakEndMissing).toBe(true);
    expect(blRow?.session?.bananaAt).toBe(1_000 + 2_000 + 300 + 5_000);
    expect(blRow?.session?.banana).toBe(true);
    expect(round2LinesOf(blocked.records).u16).toBe("읽기 멈춤");
    expect(round2LineOf(round2LinesOf(blocked.records))).toContain(
      "U16 읽기 멈춤(메아리 0)",
    );

    // 진짜가 아무것도 못 들으면 세션 중 읽기를 부르지 못해 '못 잼'(U16 을 재지 못함)
    const deafReal = harness([dead, deaf], planAt(12));
    deafReal.runner.start();
    deafReal.clock.advance(TEN_MIN);
    const dr = only(deafReal.records);
    expect(dr.stopReason).toBe("no-result");
    expect(
      eventsOf(dr, "speak-call").filter((e) => e.attempt === 1),
    ).toHaveLength(0);
    expect(round2LinesOf(deafReal.records).u16).toBe("못 잼");
    expect(round2LineOf(round2LinesOf(deafReal.records))).toContain(
      "U16 못 잼",
    );
  });

  it("보통 꼴 진짜: 'apple' 은 중간 결과에만 들어도 들음이고, 'apple' 이 든 결과 전의 메아리 결과로는 멈추지 않으며, 'apple' 이 6초 안에 없으면 stop 한다", () => {
    const h = harness(
      [
        dead,
        {
          as: 380,
          results: [
            { at: 300, text: "okay", final: false },
            { at: 1_500, text: "apple", final: false },
          ],
        },
      ],
      planAt(2),
    );
    h.runner.start();
    h.clock.advance(TEN_MIN);
    const record = only(h.records);
    const stop = first(
      record,
      (e) => e.type === "stop-call" && e.attempt === 1,
    );
    expect(stop.at - startOf(record, 1)).toBe(1_500 + ROUND_SILENCE_MS);
    expect(round2RowOf(record)?.session).toMatchObject({
      apple: true,
      finals: 0,
      interims: 2,
      echo: 1,
    });

    const none = harness([dead, deaf], planAt(2));
    none.runner.start();
    none.clock.advance(TEN_MIN);
    const n = only(none.records);
    expect(n.stopReason).toBe("no-result");
    expect(
      first(n, (e) => e.type === "stop-call" && e.attempt === 1).at -
        startOf(n, 1),
    ).toBe(NO_RESULT_STOP_MS);
    expect(round2RowOf(n)?.session?.apple).toBe(false);
  });

  it("버림이 소리 도중 저절로 끝나면 소리 끝 + 300ms 를 기다린 뒤 거짓 확인 → 1초 → 진짜를 열고, 그 차례는 '저절로 끝남' 으로 깨끗에서 뺀다(검토 fix 8 I1)", () => {
    // 차례 1(5초 · 보통 말 1.3초): 버림이 0.8초에 저절로 end
    const h = harness([dead, apple], planAt(1));
    h.runner.start();
    const decoyAt = UNLOCK_MS + 2_000;
    h.clock.advance(decoyAt + 800);
    const rec = h.recs[0];
    if (rec === undefined) throw new Error("인식 없음");
    rec.onend?.();
    h.clock.advance(TEN_MIN);
    const record = only(h.records);
    expect(
      eventsOf(record, "stop-call").filter((e) => e.code === "decoy"),
    ).toHaveLength(0);
    const soundEnd = first(
      record,
      (e) => e.type === "speak-end" && e.attempt === 0,
    );
    expect(soundEnd.at - decoyAt).toBe(235 + 1_300);
    const gap = first(record, (e) => e.code === "gap");
    expect(gap.at - soundEnd.at).toBe(ROUND2_SOUND_TAIL_MS);
    expect(startOf(record, 1) - gap.at).toBe(DECOY_GAP_MS);
    const row = round2RowOf(record);
    expect(row?.decoy).toMatchObject({ endedEarly: true, actualMs: 800 });
    expect(row?.clean).toBe(false);
    expect(rowCells(rowOf(record)).at(-1)).toContain("(저절로 끝남)");
    expect(round2LinesOf(h.records).excluded).toEqual([1]);

    // 소리를 부르기 전에 끝나면 기다리지 않고 곧바로 거짓 확인 → 1초 → 진짜(소리 없음)
    const before = harness([{ as: null }, apple], planAt(2));
    before.runner.start();
    before.clock.advance(UNLOCK_MS + 2_000 + 500);
    before.recs[0]?.onend?.();
    before.clock.advance(TEN_MIN);
    const b = only(before.records);
    expect(eventsOf(b, "speak-call")).toHaveLength(0);
    expect(startOf(b, 1) - (UNLOCK_MS + 2_000 + 500)).toBe(DECOY_GAP_MS);
    expect(round2RowOf(b)?.clean).toBe(false);
  });

  it("banana 는 이번 알림에 새로 final 이 된 글만 보고(앞 final 의 banana 뒤 메아리로 멈추지 않음), 낱말 검사는 복수형 apples · bananas 도 센다(검토 fix 8 M2 · M3)", () => {
    const h = harness(
      [
        dead,
        {
          as: 380,
          results: [
            { at: 1_000, text: "apples", final: true },
            // banana 를 보이기 전에 말한 banana(final)
            { at: 3_500, text: " banana", final: true },
            // 'banana' 를 보인 뒤 온 메아리 final — 이것으로 멈추지 않는다
            { at: 4_500, text: " Okay", final: true },
            { at: 6_000, text: " bananas", final: true },
          ],
        },
      ],
      planAt(12),
    );
    h.runner.start();
    h.clock.advance(TEN_MIN);
    const record = only(h.records);
    const realStart = startOf(record, 1);
    const stop = first(
      record,
      (e) => e.type === "stop-call" && e.attempt === 1,
    );
    expect(stop.at - realStart).toBe(6_000 + ROUND_SILENCE_MS);
    expect(record.stopReason).toBe("final");
    const flagged = record.events
      .filter((e) => e.type === "result" && e.banana === true)
      .map((e) => e.at - realStart);
    expect(flagged).toEqual([3_500, 6_000]);
    expect(round2RowOf(record)?.session).toMatchObject({
      apple: true,
      banana: true,
    });
  });

  it("복구 갈래 줄은 깨끗함과 따로 'cancel 뒤 읽기가 시작됐는지' 를 센다(검토 fix 8 M4)", () => {
    // 차례 10 의 짧은 말은 시작 알림이 없고(굳음이 안 풀린 꼴), 차례 11 은 시작 · 끝
    const h = harness([dead, apple, dead, apple], planAt(10, 11), {
      length: (text, n) => (n === 1 ? "never" : (LENGTH_OF[text] ?? 0)),
    });
    h.runner.start();
    h.clock.advance(TEN_MIN);
    const lines = round2LinesOf(h.records);
    expect(lines.recoverStarted).toEqual({ n: 1, m: 2 });
    expect(round2LineOf(lines)).toContain("복구 1/1 · 복구 읽기 시작 1/2");
    expect(lines.excluded).toEqual([10]);
  });

  it("버림 없는 차례는 시작하자마자 화면을 '기다려요' 로 바꿔 쉼 화면 '남은 0초' 를 남기지 않는다(검토 fix 8 M1)", () => {
    const h = harness([apple], planAt(13));
    h.runner.start();
    h.clock.advance(UNLOCK_MS + ROUND_PAUSE_MS);
    expect(h.views.at(-1)).toEqual({
      at: UNLOCK_MS + ROUND_PAUSE_MS,
      view: { kind: "wait" },
    });
  });

  it("차례 13 은 45초 쉼(화면 '쉬는 중 · 남은 초') 뒤 버림 없이 cancel → 세션 없이 보통 말 → 끝 → 1초 → 진짜를 연다", () => {
    const h = harness([apple], planAt(13));
    h.runner.start();
    h.clock.advance(UNLOCK_MS);
    expect(h.views.at(-1)?.view).toEqual({
      kind: "rest",
      until: UNLOCK_MS + ROUND_PAUSE_MS,
    });
    h.clock.advance(ROUND_PAUSE_MS - 1);
    expect(h.speech.cancels).toEqual([0]);
    h.clock.advance(TEN_MIN);
    const record = only(h.records);
    expect(record.resetStep).toBe("pause-45");
    expect(h.speech.cancels[1]).toBe(UNLOCK_MS + ROUND_PAUSE_MS);
    expect(h.recs).toHaveLength(1);
    const bareEnd = first(
      record,
      (e) => e.type === "speak-end" && e.utterance === "bare",
    );
    expect(startOf(record, 0) - bareEnd.at).toBe(DECOY_GAP_MS);
    expect(round2RowOf(record)).toMatchObject({
      step: 13,
      group: "first",
      clean: true,
    });
  });

  it("라운드 한 번은 차례 0~13 을 4분 안에 돌고 끝에 '끝났어요' 와 갈래별 줄을 화면 · 로그 · 복사 글에 남기며, 기록은 저장 꼴로 다시 읽히고 fix 7 셈과 섞이지 않는다", () => {
    const h = harness(fullScript({ deafStep: 6 }));
    h.runner.start();
    h.clock.advance(TEN_MIN);
    expect(h.records.map((r) => r.round?.step)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ]);
    const doneAt = h.views.at(-1)?.at ?? Number.POSITIVE_INFINITY;
    expect(doneAt).toBeLessThan(4 * 60_000);
    expect(doneAt).toBeGreaterThan(2 * 60_000 + 30_000);
    const line =
      "대조군 1/1 · 3초 짧은 말 3/3 · 1.5초 1/2 · 띵 2/2 · 복구 2/2 · 복구 읽기 시작 2/2 · 쉰 첫 2/2 · U16 됨(메아리 0)";
    expect(h.views.at(-1)?.view).toEqual({ kind: "done", line });
    expect(h.done).toEqual([{ stopped: false, line }]);
    expect(MIC_TEXT.round2Done).toBe("끝났어요");
    // 'apple' 은 차례마다 진짜 start 때만(차례 12 는 'banana' 도 한 번)
    const realStarts = h.records.map((r) => startOf(r, r.attempts.length - 1));
    expect(
      h.views
        .filter((v) => v.view?.kind === "say" && v.view.word === "apple")
        .map((v) => v.at),
    ).toEqual(realStarts);
    expect(
      h.views.filter((v) => v.view?.kind === "say" && v.view.word === "banana"),
    ).toHaveLength(1);
    // 차례 사이 2초(앞 진짜 end → 버림 start)
    const prevEnd = h.records[1]?.events.findLast((e) => e.type === "end");
    expect(startOf(h.records[2] as ProbeRecord, 0) - (prevEnd?.at ?? 0)).toBe(
      2_000,
    );
    expect(h.records[2]?.sincePrevEndMs).toBe(2_000);

    const log = JSON.parse(round2LogOf(h.records, ENV, "run1", 0, false)) as {
      kind: string;
      line: string;
      steps: unknown[];
    };
    expect(log.kind).toBe("round2");
    expect(log.line).toBe(line);
    expect(log.steps).toHaveLength(14);
    expect(JSON.stringify(log)).not.toContain("banana");
    expect(recordLogOf(h.records[12] as ProbeRecord, ENV)).not.toContain(
      '"finalText"',
    );
    expect(copyTextOf(h.records, ENV)).toContain(`- W 라운드 2 run1: ${line}`);
    expect(copyTextOf(h.records, ENV)).not.toContain("- W 라운드 run1");
    expect(rowCells(rowOf(h.records[2] as ProbeRecord)).at(-1)).toBe(
      "2·3초 짧은 말·short / 버림 3s·35·3030 · stop 아니요 · 거짓 확인 예(0) / cancel 아니요·아니요(아니요·아니요) · 부름 235(아니요·아니요) · 소리 245~835 → 진짜 380·- · 중간 0 · final 1 · apple 예 · 깨끗",
    );
    // fix 7 의 셈 · 행은 WR2 를 세지 않는다
    expect(roundSurvivalOf(h.records)).toEqual({ n: 0, m: 0 });
    expect(roundRowOf(h.records[0] as ProbeRecord)).toBeNull();
    const withIds = h.records.map((r, i) => ({ ...r, id: i + 1 }));
    expect(parseStored(JSON.stringify(withIds))).toEqual(withIds);
  });

  it("옛 기록(round 칸에 fix 8 칸 없음)은 기본값 null 로 읽히고 WR2 행이 생기지 않는다", () => {
    const old = {
      id: 1,
      load: 1,
      strategy: "WR",
      lang: "en-US",
      pressedAt: "2026-11-07T00:00:00.000Z",
      tapAt: 0,
      sincePrevEndMs: null,
      visibilityAtStart: "visible",
      attempts: [],
      events: [],
      stopReason: null,
      round: {
        step: 1,
        decoyMs: 10_000,
        speak: true,
        live: "na",
        real: "plain",
        path: "dead",
        slots: [],
      },
    };
    const [parsed] = parseStored(JSON.stringify([old]));
    expect(parsed?.round).toMatchObject({
      sound: null,
      sentence: null,
      cancel: null,
      waitSound: null,
      group: null,
    });
    expect(parsed === undefined ? "x" : round2RowOf(parsed)).toBeNull();
  });

  it("'멈추기'는 도는 차례를 abort 로 끝내 기록하고 읽기를 cancel 하며, 쪽을 떠나면(dispose) 알림 없이 인식 · 읽기를 끊는다", () => {
    const h = harness([dead, apple], planAt(1, 2));
    h.runner.start();
    h.clock.advance(UNLOCK_MS + 2_000 + 500);
    h.runner.stop();
    const stoppedAt = h.clock.t;
    h.clock.advance(TEN_MIN);
    expect(h.records).toHaveLength(1);
    expect(h.records[0]?.stopReason).toBe("user");
    expect(h.recs[0]?.calls).toEqual(["start", "abort"]);
    expect(h.speech.cancels).toContain(stoppedAt);
    expect(h.done).toEqual([expect.objectContaining({ stopped: true })]);
    expect(h.views.at(-1)?.view).toBeNull();

    const d = harness([dead, apple], planAt(1));
    d.runner.start();
    d.clock.advance(UNLOCK_MS + 2_000 + 500);
    d.runner.dispose();
    const disposedAt = d.clock.t;
    d.clock.advance(TEN_MIN);
    expect(d.records).toHaveLength(0);
    expect(d.done).toHaveLength(0);
    expect(d.recs[0]?.calls).toEqual(["start", "abort"]);
    expect(d.speech.cancels).toContain(disposedAt);
  });

  it("안내 글 상수: 요청자 안내 글과 단추 · 쉼 · 끝 글은 브리프 그대로다", () => {
    expect(MIC_TEXT.round2Start).toBe("자동 W 라운드 2");
    expect(MIC_TEXT.round2Guide).toBe(
      "'자동 W 라운드 2' 단추를 한 번 누르고 iPad 를 앞에 둔 채 기다려요. 화면에 큰 글씨로 '지금 apple 이라고 말해요'가 나올 때만 'apple' 이라고 말해요. '이제 banana 라고 말해요'가 나오면 'banana' 라고 말해요. 선생님 목소리나 '띵' 소리가 나와도 따라 하지 않아요. 중간에 45초 동안 '쉬는 중'이 나오면 그대로 기다려요. '끝났어요'가 나오면 끝이에요.",
    );
    expect(MIC_TEXT.round2Rest(12)).toBe("쉬는 중 · 남은 12초");
    expect(MIC_TEXT.roundSay).toBe("지금 apple 이라고 말해요");
    expect(MIC_TEXT.roundSayNext).toBe("이제 banana 라고 말해요");
    expect(MIC_TEXT.roundWait).toBe("기다려요");
  });
});

/** 라운드 전체의 인식 대본: 차례 0 · 13 은 진짜 하나, 그 밖은 버림 · 진짜 둘. 진짜는 apple(차례 12 는 banana final 도), deafStep 의 진짜만 못 듣는다. */
function fullScript(
  options: { deafStep?: number } = {},
): (n: number) => RecScript {
  const order: RecScript[] = [];
  for (const step of round2PlanOf()) {
    if (step.decoyMs > 0) order.push(dead);
    if (step.step === options.deafStep) {
      order.push(deaf);
    } else if (step.real === "s") {
      order.push({
        as: 380,
        results: [
          { at: 1_000, text: "apple", final: true },
          { at: 6_000, text: " banana", final: true },
        ],
      });
    } else {
      order.push(apple);
    }
  }
  return (n) => order[n] ?? dead;
}

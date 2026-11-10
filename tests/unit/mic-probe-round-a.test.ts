// 마이크 점검 쪽 '자동 A 라운드'(브리프 task-probe 2026-11-10 — 받아 온 소리). 소리 내는 길 셋(Web Audio · 오디오 요소 · 지금 읽기)의 차례
// 순서(읽기는 맨 뒤 · 앞 두 길이 도는 동안 speechSynthesis 를 부르지 않음) · 길 열기(누름 밖에서 막히면 '한 번 더 눌러 주세요') · 형식 측정 ·
// 꼴 다섯(쉰 뒤 첫 차례 · 버림 안 · 세션 없이 · 재우는 꼴 둘)의 때 맞춤 · 살아남 판정(apple · 깨끗한 차례만) · audiostart 분포 ·
// 읽기 뒤 다시 재생(M6)과 끝의 두 물음 · 요약 줄 · 라운드 끝 로그를 덮는다. 러너(a-round.ts)는 가짜 인식 · 가짜 소리 · 가짜 시계로 돌린다.
import { describe, expect, it } from "vitest";
import {
  type AOpenResult,
  ARoundRunner,
  type ARoundView,
} from "../../src/app/dev/mic-probe/a-round";
import {
  A_AFTER_GAP_MS,
  A_ASK_WAIT_MS,
  A_AUDIO_URL,
  A_COUNT_DEFAULT,
  A_COUNTS,
  A_DECOY_MS,
  A_FORMAT_REPS,
  A_FORMATS,
  A_MEASURE_WAIT_MS,
  A_NO_RESULT_STOP_MS,
  A_OPEN_GESTURE_WAIT_MS,
  A_OPEN_WAIT_MS,
  A_REPLAY_WAIT_MS,
  A_REST_MS,
  A_SENTENCE,
  A_SLEEP_WAIT_MS,
  A_SOUND_END_WAIT_MS,
  A_VIAS,
  type AFormat,
  type AHeard,
  type AMeasure,
  type APlanStep,
  type AReplay,
  type AReport,
  type AVia,
  type AVolume,
  aAsStatOf,
  aCellOf,
  aEstimateMinutes,
  aFormatLogOf,
  aFormatRowsOf,
  aIsBare,
  aLineOf,
  aLinesOf,
  aLogOf,
  aPlanOf,
  aPlayFormatOf,
  aRowOf,
  aStepLogsOf,
  BUTTON_STRATEGIES,
  copyTextOf,
  DECOY_GAP_MS,
  LOG_BODY_MAX_CHARS,
  medianOf,
  type ProbeEnv,
  type ProbeRecord,
  parseStored,
  ROUND_GAP_MS,
  ROUND_SILENCE_MS,
  ROUND2_CANCEL_SETTLE_MS,
  ROUND2_SOUND_AFTER_AS_MS,
  ROUND2_SOUND_TAIL_MS,
  recordLogOf,
  round2RowOf,
  roundRowOf,
  rowCells,
  rowOf,
} from "../../src/app/dev/mic-probe/probe-log";
import { MIC_TEXT } from "../../src/app/dev/mic-probe/probe-text";
import type {
  RoundRecognition,
  RoundSpeakHandlers,
  RoundSpeakOptions,
  RoundSpeech,
} from "../../src/app/dev/mic-probe/w-round";

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
  speechstart?: number;
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
  startedAt: number | null = null;
  private pending: number[] = [];
  constructor(
    private readonly clock: Clock,
    private readonly script: RecScript,
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
    this.startedAt = this.clock.t;
    if (this.script.as !== null)
      this.at(this.script.as, () => this.onaudiostart?.());
    if (this.script.speechstart !== undefined)
      this.at(this.script.speechstart, () => this.onspeechstart?.());
    for (const r of this.script.results ?? []) {
      this.at(r.at, () => {
        const results = [
          { isFinal: r.final, length: 1, 0: { transcript: r.text } },
        ];
        this.onresult?.({ resultIndex: 0, results });
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

const SOUND_LATENCY_MS = 80;
const SOUND_LENGTH_MS = 2_000;
const OPEN_MS = 5;
const SLEEP_MS = 5;

/** 가짜 소리(길 하나). 부르면 latency 뒤 시작 알림, length 뒤 끝 알림. fail 이면 오류, silent 면 시작도 끝도 없다. */
class FakeSound implements RoundSpeech {
  plays: (RoundSpeakOptions & { at: number })[] = [];
  cancels: number[] = [];
  mode: "ok" | "fail" | "silent" | "no-end" = "ok";
  latency = SOUND_LATENCY_MS;
  private speaking = false;
  private timers: number[] = [];
  constructor(private readonly clock: Clock) {}
  state() {
    return { speaking: this.speaking, pending: false };
  }
  speak(options: RoundSpeakOptions, handlers: RoundSpeakHandlers) {
    this.plays.push({ ...options, at: this.clock.t });
    if (this.mode === "silent") return;
    if (this.mode === "fail") {
      this.timers.push(
        this.clock.later(() => handlers.error("EncodingError"), 20),
      );
      return;
    }
    this.timers.push(
      this.clock.later(() => {
        this.speaking = true;
        handlers.start("running");
      }, this.latency),
    );
    if (this.mode === "no-end") return;
    this.timers.push(
      this.clock.later(() => {
        this.speaking = false;
        handlers.end();
      }, this.latency + SOUND_LENGTH_MS),
    );
  }
  cancel() {
    this.cancels.push(this.clock.t);
    for (const id of this.timers) this.clock.cancel(id);
    this.timers = [];
    this.speaking = false;
  }
}

const dead: RecScript = { as: 35 };
const apple: RecScript = {
  as: 380,
  speechstart: 900,
  results: [{ at: 1_200, text: "apple", final: true }],
};
/** audiostart 는 빠른 띠인데 듣는다(기록 8 차례 7 · 8 — AudioContext 가 도는 동안). */
const fastAlive: RecScript = {
  as: 14,
  speechstart: 900,
  results: [{ at: 1_200, text: "apple", final: true }],
};
/** 소리는 받았지만 다른 낱말로 들림. */
const other: RecScript = {
  as: 380,
  speechstart: 900,
  results: [{ at: 1_200, text: "april", final: true }],
};

type OpenScript = Partial<Record<AVia, AOpenResult[] | "never">>;
type HarnessOptions = {
  count?: number;
  /** 길마다 열기 결과(부른 차례대로, 모자라면 ok). never 면 답이 없다. */
  opens?: OpenScript;
  /** 형식 측정 결과를 바꾼다(없으면 모두 됨). */
  measure?: (via: "webaudio" | "element", format: AFormat) => Partial<AMeasure>;
  canPlay?: Partial<Record<AFormat, string>>;
  synthBefore?: number;
  noRecognition?: boolean;
  /** 읽기 뒤 다시 재생(M6)의 결과를 바꾼다(never 면 답이 없다). */
  replay?: (via: "webaudio" | "element") => Partial<AReplay> | "never";
  /** 재운 소리 출력을 다음 소리가 누름 밖에서 못 깨운다(resume-blocked). */
  wakeBlocked?: boolean;
  /** 재우기에 답이 없다. */
  sleepNever?: boolean;
  /** 라운드 앞에 이 쪽에서 끝난 듣기가 있다(그 end 때 — 시계 0 기준 ms). */
  lastEndAt?: number;
};

/** 차례의 꼴대로 인식 대본을 준다: 버림은 죽음, 진짜는 real 이 정한다. */
function harness(
  real: (step: APlanStep) => RecScript,
  options: HarnessOptions = {},
) {
  const clock = new Clock();
  const plan = aPlanOf(options.count ?? 1);
  const sounds: Record<AVia, FakeSound> = {
    webaudio: new FakeSound(clock),
    element: new FakeSound(clock),
    synth: new FakeSound(clock),
  };
  // 읽기(speechSynthesis)는 부른 수(speak · cancel)를 센다
  let synthCalls = options.synthBefore ?? 0;
  const synth: RoundSpeech = {
    state: () => sounds.synth.state(),
    speak: (o, h) => {
      synthCalls += 1;
      sounds.synth.speak(o, h);
    },
    cancel: () => {
      synthCalls += 1;
      sounds.synth.cancel();
    },
  };
  // Web Audio 의 AudioContext 상태: 재우면 suspended, 소리가 깨우면 running
  let audio: string | null = null;
  const web: RoundSpeech = {
    state: () => sounds.webaudio.state(),
    cancel: () => sounds.webaudio.cancel(),
    speak: (o, h) => {
      const asleep = audio === "suspended";
      if (asleep && options.wakeBlocked === true) {
        clock.later(() => h.error("resume-blocked(suspended)"), 1_000);
        return;
      }
      sounds.webaudio.speak(o, {
        ...h,
        start: (label) => {
          audio = "running";
          h.start(asleep ? "running resumed=40ms from=suspended" : label);
        },
      });
    },
  };
  const recs: { rec: FakeRec; step: number; role: "decoy" | "real" }[] = [];
  const views: { at: number; view: ARoundView | null }[] = [];
  const records: ProbeRecord[] = [];
  const done: { stopped: boolean; report: AReport }[] = [];
  const opens: { via: AVia; gesture: boolean; at: number }[] = [];
  const closes: { via: AVia; at: number }[] = [];
  const measures: { via: string; format: AFormat; at: number }[] = [];
  const measured: { count: number; records: number }[] = [];
  const sleeps: { via: AVia; at: number }[] = [];
  const replays: {
    via: string;
    format: AFormat;
    at: number;
    synthCalls: number;
  }[] = [];
  let nth = 0;
  let lastEnd: {
    at: number | null;
    reason: ProbeRecord["stopReason"];
    method: ProbeRecord["stopMethod"];
  } = { at: options.lastEndAt ?? null, reason: null, method: null };
  let spoke = false;
  let current = -1;
  let opened = 0;
  const openCount: Partial<Record<AVia, number>> = {};
  const runner: ARoundRunner = new ARoundRunner(
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
        if (options.noRecognition === true) return null;
        // 차례 안 첫 인식이 버림(버림 안 꼴만), 그 뒤가 진짜
        const index = runner.currentIndex;
        if (index !== current) {
          current = index;
          opened = 0;
        }
        opened += 1;
        const step = plan[index];
        const role =
          step !== undefined && !aIsBare(step.shape) && opened === 1
            ? "decoy"
            : "real";
        const script =
          role === "decoy" || step === undefined ? dead : real(step);
        const rec = new FakeRec(clock, script);
        recs.push({ rec, step: index, role });
        return rec;
      },
      visibility: () => "visible",
      isoNow: () => "2026-11-10T00:00:00.000Z",
      sound: (via) =>
        via === "synth" ? synth : via === "webaudio" ? web : sounds[via],
      open: (via, gesture, reply) => {
        opens.push({ via, gesture, at: clock.t });
        const script = options.opens?.[via];
        if (script === "never") return;
        const n = openCount[via] ?? 0;
        openCount[via] = n + 1;
        const result = script?.[n] ?? "ok";
        clock.later(() => {
          if (via === "webaudio" && result === "ok") audio = "running";
          reply(result, result === "ok" ? "running" : "");
        }, OPEN_MS);
      },
      close: (via) => {
        closes.push({ via, at: clock.t });
        // 쪽은 길을 떠날 때 AudioContext 를 닫지 않고 쉬게 한다
        if (via === "webaudio" && audio !== null) audio = "suspended";
      },
      canPlay: (format) => options.canPlay?.[format] ?? "probably",
      measure: (via, format, reply) => {
        measures.push({ via, format, at: clock.t });
        const base: AMeasure = {
          via,
          format,
          ok: true,
          firstSoundMs: via === "webaudio" ? 60 : 90,
          fetchMs: 40,
          decodeMs: via === "webaudio" ? 15 : null,
          error: null,
        };
        const result = { ...base, ...options.measure?.(via, format) };
        clock.later(() => reply(result), result.firstSoundMs ?? 30);
      },
      replay: (via, format, reply) => {
        replays.push({ via, format, at: clock.t, synthCalls });
        const custom = options.replay?.(via);
        if (custom === "never") return;
        clock.later(
          () =>
            reply({
              via,
              format,
              started: true,
              ended: true,
              stateAtStart: via === "webaudio" ? "running" : null,
              stateAtEnd: via === "webaudio" ? "running" : null,
              flowedMs: SOUND_LENGTH_MS,
              error: null,
              ...custom,
            }),
          SOUND_LENGTH_MS,
        );
      },
      sleep: (via, reply) => {
        sleeps.push({ via, at: clock.t });
        if (options.sleepNever === true) return;
        clock.later(() => {
          audio = "suspended";
          reply("suspended");
        }, SLEEP_MS);
      },
      synthCalls: () => synthCalls,
      audioState: () => audio,
    },
    {
      view: (view) => views.push({ at: clock.t, view }),
      finish: (record, endAt) => {
        records.push({ ...record, id: records.length + 1 });
        lastEnd = {
          at: endAt,
          reason: record.stopReason,
          method: record.stopMethod,
        };
        spoke = false;
      },
      measured: (report) =>
        measured.push({
          count: report.measures.length,
          records: records.length,
        }),
      done: (result) =>
        done.push({ stopped: result.stopped, report: result.report }),
    },
    plan,
    "run-a",
  );
  return {
    clock,
    runner,
    plan,
    sounds,
    recs,
    views,
    records,
    done,
    opens,
    closes,
    measures,
    measured,
    sleeps,
    replays,
    synthCalls: () => synthCalls,
  };
}

const ENV: ProbeEnv = {
  userAgent: "UA",
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
  openedAt: "2026-11-10T00:00:00.000Z",
  load: 1,
  webAudioState: null,
};

const eventOf = (
  record: ProbeRecord,
  type: string,
  pick: (e: ProbeRecord["events"][number]) => boolean = () => true,
) => record.events.find((e) => e.type === type && pick(e));

/**
 * 라운드를 끝까지 돌린다(도중에 '한 번 더'가 뜨면 누르고, 끝 물음 둘에 답한다). heard · volume 이 null 이면 그 물음에서 멈춘다(답은 시험이 준다).
 */
function runAll(
  h: ReturnType<typeof harness>,
  tap = true,
  heard: AHeard | null = "both",
  volume: AVolume | null = "same",
) {
  h.runner.start();
  for (let i = 0; i < 600 && h.done.length === 0; i++) {
    h.clock.advance(1_000);
    const last = h.views.at(-1)?.view;
    if (tap && last?.kind === "tap") h.runner.resume();
    if (last?.kind === "ask") {
      if (heard === null) return;
      h.runner.answer(heard);
    }
    if (h.views.at(-1)?.view?.kind === "ask-volume") {
      if (volume === null) return;
      h.runner.answerVolume(volume);
    }
  }
}

const stepOf = (
  h: ReturnType<typeof harness>,
  via: AVia,
  shape: string,
  rep = 1,
) =>
  h.records.find(
    (r) =>
      r.round?.a?.via === via &&
      r.round.a.shape === shape &&
      r.round.a.rep === rep,
  ) as ProbeRecord;

describe("자동 A 라운드 계획(aPlanOf)", () => {
  it("길마다 [쉰 뒤 첫 차례] → '버림 안 → 세션 없이'를 정한 횟수만큼 → [재우는 꼴 둘을 정한 횟수만큼] 순서로 돈다", () => {
    const plan = aPlanOf(3);
    expect(plan).toHaveLength(2 + 8 * 3);
    expect(plan.map((s) => s.step)).toEqual(plan.map((_, i) => i));
    const shapesOf = (via: AVia) =>
      plan.filter((s) => s.via === via).map((s) => s.shape);
    const pairs = (a: string, b: string) => [a, b, a, b, a, b];
    expect(shapesOf("webaudio")).toEqual([
      "first",
      ...pairs("inside", "bare"),
      ...pairs("inside-sleep", "bare-sleep"),
    ]);
    expect(shapesOf("element")).toEqual(pairs("inside", "bare"));
    expect(shapesOf("synth")).toEqual(["first", ...pairs("inside", "bare")]);
    expect(
      plan
        .filter((s) => s.via === "webaudio" && s.shape === "bare-sleep")
        .map((s) => s.rep),
    ).toEqual([1, 2, 3]);
    for (const s of plan) {
      expect(s.decoyMs).toBe(aIsBare(s.shape) ? 0 : A_DECOY_MS);
      expect(s.waitMs).toBe(s.step === 0 ? 0 : ROUND_GAP_MS);
      // 쉰 뒤 첫 차례만 앞 듣기 끝 뒤 45초 쉼을 요구한다
      expect(s.restMs).toBe(s.shape === "first" ? A_REST_MS : 0);
    }
    // 차례 0 은 Web Audio 의 첫 차례(문서를 연 뒤 첫 듣기)다
    expect(plan[0]).toMatchObject({ via: "webaudio", shape: "first" });
    expect(A_REST_MS).toBeGreaterThanOrEqual(45_000);
  });

  it("길의 순서는 Web Audio → 오디오 요소 → 지금 읽기(speechSynthesis 는 맨 뒤)이고 읽기 앞 cancel 은 읽기 길만 한다", () => {
    expect(A_VIAS).toEqual(["webaudio", "element", "synth"]);
    const plan = aPlanOf(A_COUNT_DEFAULT);
    const order = plan.map((s) => s.via);
    expect([...new Set(order)]).toEqual(["webaudio", "element", "synth"]);
    // 길이 한 번 바뀌면 앞 길로 돌아가지 않는다
    const firstSynth = order.indexOf("synth");
    expect(order.slice(firstSynth).every((v) => v === "synth")).toBe(true);
    const firstElement = order.indexOf("element");
    expect(order.slice(0, firstElement).every((v) => v === "webaudio")).toBe(
      true,
    );
    for (const s of plan) expect(s.cancel).toBe(s.via === "synth");
  });

  it("횟수는 2 · 3 · 4 가운데 고르고 기본 3번의 어림 시간은 6분 안이다", () => {
    expect(A_COUNTS).toEqual([2, 3, 4]);
    expect(A_COUNT_DEFAULT).toBe(3);
    expect(aPlanOf(2)).toHaveLength(18);
    expect(aPlanOf(4)).toHaveLength(34);
    expect(aEstimateMinutes(A_COUNT_DEFAULT)).toBeGreaterThanOrEqual(4);
    expect(aEstimateMinutes(A_COUNT_DEFAULT)).toBeLessThan(6);
    expect(aEstimateMinutes(4)).toBeGreaterThan(
      aEstimateMinutes(A_COUNT_DEFAULT),
    );
  });

  it("AR 는 전략 단추로 보이지 않는다(자동 A 라운드 단추로만 연다)", () => {
    expect(BUTTON_STRATEGIES).not.toContain("AR");
    expect(MIC_TEXT.strategy.AR).toContain("A 라운드");
  });
});

describe("자동 A 라운드 러너 — 길의 순서와 speechSynthesis 를 부르지 않음", () => {
  it("누름 안에서 Web Audio 만 열고, Web Audio · 오디오 요소 차례가 도는 동안 speechSynthesis 를 한 번도 부르지 않는다", () => {
    const h = harness(() => apple);
    h.runner.start();
    // 누름 안(같은 틱)에서 연 것은 Web Audio 하나다
    expect(h.opens).toEqual([{ via: "webaudio", gesture: true, at: 0 }]);
    expect(h.synthCalls()).toBe(0);
    runAll(h);
    expect(h.done).toHaveLength(1);
    expect(h.done[0]?.stopped).toBe(false);
    expect(h.records).toHaveLength(h.plan.length);
    expect(h.records.map((r) => r.round?.a?.via)).toEqual(
      h.plan.map((s) => s.via),
    );
    expect(h.records.map((r) => r.round?.a?.shape)).toEqual(
      h.plan.map((s) => s.shape),
    );
    for (const r of h.records) {
      expect(r.strategy).toBe("AR");
      expect(r.autoRun).toBe("run-a");
      if (r.round?.a?.via !== "synth") expect(r.round?.a?.synthCalls).toBe(0);
    }
    // 읽기 길을 여는 때는 오디오 요소의 마지막 차례가 끝난 뒤다
    const synthOpen = h.opens.find((o) => o.via === "synth");
    const lastElement = h.records.findLast(
      (r) => r.round?.a?.via === "element",
    );
    const lastEnd = lastElement?.events.findLast((e) => e.type === "end");
    expect(synthOpen).toBeDefined();
    expect(synthOpen?.at ?? 0).toBeGreaterThanOrEqual(lastEnd?.at ?? Infinity);
    expect(h.sounds.synth.plays[0]?.at ?? 0).toBeGreaterThan(
      synthOpen?.at ?? Infinity,
    );
    // 읽기 차례에는 부른 수가 는다
    expect(
      h.records.findLast((r) => r.round?.a?.via === "synth")?.round?.a
        ?.synthCalls,
    ).toBeGreaterThan(0);
  });

  it("길이 바뀔 때 앞 길을 닫고 다음 길을 연다(누름 밖), 열리면 누름 없이 잇는다", () => {
    const h = harness(() => apple);
    runAll(h, false);
    // 끝의 둘은 읽기 뒤 다시 재생(M6)이다
    expect(h.opens.map((o) => [o.via, o.gesture])).toEqual([
      ["webaudio", true],
      ["element", false],
      ["synth", false],
      ["webaudio", false],
      ["element", false],
    ]);
    expect(h.closes.map((c) => c.via)).toEqual([
      "webaudio",
      "element",
      "synth",
      "webaudio",
      "element",
    ]);
    const elementOpen = h.opens[1];
    expect(h.closes[0]?.at).toBeLessThanOrEqual(elementOpen?.at ?? -1);
    expect(h.views.some((v) => v.view?.kind === "tap")).toBe(false);
    expect(h.done[0]?.report.taps).toBe(0);
  });

  it("누름 밖에서 길이 안 열리면 '한 번 더 눌러 주세요'를 보이고 멈춰 있다가, 누르면 그 누름 안에서 다시 열고 잇는다", () => {
    const h = harness(() => apple, {
      opens: { element: ["need-gesture", "ok"] },
    });
    h.runner.start();
    h.clock.advance(120_000);
    const tap = h.views.at(-1);
    expect(tap?.view).toEqual({ kind: "tap", via: "element" });
    const before = h.records.length;
    // 누르지 않으면 더 가지 않는다
    h.clock.advance(120_000);
    expect(h.records).toHaveLength(before);
    expect(h.done).toHaveLength(0);
    const at = h.clock.t;
    h.runner.resume();
    expect(h.opens.at(-1)).toEqual({ via: "element", gesture: true, at });
    runAll(h);
    expect(h.done[0]?.report.taps).toBe(1);
    // 누름 밖 시도가 막혔는지와 누름 안에서 열렸는지가 기록에 남는다(재운 소리 출력을 깨운 것도 같이)
    expect(
      h.done[0]?.report.opens
        .filter((o) => o.purpose !== "wake")
        .map((o) => [o.via, o.gesture, o.result, o.purpose]),
    ).toEqual([
      ["webaudio", true, "ok", "enter"],
      ["element", false, "need-gesture", "enter"],
      ["element", true, "ok", "enter"],
      ["synth", false, "ok", "enter"],
      ["webaudio", false, "ok", "after"],
      ["element", false, "ok", "after"],
    ]);
    expect(h.records).toHaveLength(h.plan.length);
  });

  it("길 열기에 답이 없으면(iOS 가 누름 밖 speak 를 사건 없이 버림) 상한 뒤 '한 번 더'로 넘어간다", () => {
    const h = harness(() => apple, { opens: { synth: "never" } });
    h.runner.start();
    for (let i = 0; i < 300; i++) {
      h.clock.advance(1_000);
      if (h.views.at(-1)?.view?.kind === "tap") break;
    }
    expect(h.views.at(-1)?.view).toEqual({ kind: "tap", via: "synth" });
    const open = h.opens.find((o) => o.via === "synth");
    expect((h.views.at(-1)?.at ?? 0) - (open?.at ?? 0)).toBe(A_OPEN_WAIT_MS);
  });

  it("누름 안에서 연 길은 답이 늦어도 건너뛰지 않고 더 기다린 뒤 형식 측정으로 가른다", () => {
    const h = harness(() => apple, { opens: { webaudio: "never" } });
    h.runner.start();
    h.clock.advance(A_OPEN_WAIT_MS);
    expect(h.measures).toHaveLength(0);
    h.clock.advance(A_OPEN_GESTURE_WAIT_MS - A_OPEN_WAIT_MS);
    expect(h.views.some((v) => v.view?.kind === "tap")).toBe(false);
    expect(h.measures[0]).toMatchObject({ via: "webaudio", format: "wav" });
    expect(h.done).toHaveLength(0);
  });

  it("라운드 시작 때 이 쪽에서 이미 speechSynthesis 를 부른 수를 기록에 적는다", () => {
    const h = harness(() => apple, { synthBefore: 3 });
    runAll(h);
    expect(h.done[0]?.report.synthBefore).toBe(3);
    expect(h.records[0]?.round?.a?.synthCalls).toBe(3);
    const log = JSON.parse(
      aLogOf(h.records, ENV, "run-a", 0, false, h.done[0]?.report as AReport),
    );
    expect(log.synthBefore).toBe(3);
    expect(log.line).toContain("시작 전 speechSynthesis 3번");
  });

  it("못 연 길(지원 없음)의 차례는 건너뛰고 나머지 길은 돈다", () => {
    const h = harness(() => apple, { opens: { element: ["failed"] } });
    runAll(h);
    expect(h.records.some((r) => r.round?.a?.via === "element")).toBe(false);
    expect(h.records.filter((r) => r.round?.a?.via === "synth")).toHaveLength(
      3,
    );
    expect(h.done[0]?.report.skipped).toEqual(["element"]);
  });

  it("첫 길(Web Audio)을 건너뛰면 그 길의 차례는 모두 넘기고 다음 길부터 돈다", () => {
    const h = harness(() => apple, {
      measure: (via) =>
        via === "webaudio" ? { ok: false, firstSoundMs: null, error: "x" } : {},
    });
    runAll(h);
    expect(h.records.map((r) => r.round?.a?.via)).toEqual([
      "element",
      "element",
      "synth",
      "synth",
      "synth",
    ]);
    expect(h.done[0]?.report.skipped).toEqual(["webaudio"]);
    expect(
      aLineOf(aLinesOf(h.records), h.done[0]?.report as AReport),
    ).toContain("Web Audio 안 돎");
  });
});

describe("자동 A 라운드 러너 — 형식 측정", () => {
  it("길을 연 뒤 차례 앞에 세 형식을 정한 횟수만큼 재고, 차례의 소리는 재생이 된 첫 형식의 파일로 낸다", () => {
    const h = harness(() => apple);
    runAll(h);
    const web = h.measures.filter((m) => m.via === "webaudio");
    expect(web).toHaveLength(A_FORMATS.length * A_FORMAT_REPS);
    expect(web.slice(0, 3).map((m) => m.format)).toEqual([...A_FORMATS]);
    // Web Audio 측정은 오디오 요소를 열기 전에 끝난다(길이 섞이지 않음)
    const elementOpen = h.opens.find((o) => o.via === "element");
    expect(web.every((m) => m.at < (elementOpen?.at ?? 0))).toBe(true);
    expect(
      h.measures
        .filter((m) => m.via === "element")
        .every((m) => m.at > (elementOpen?.at ?? Infinity)),
    ).toBe(true);
    // 측정은 그 길의 첫 듣기보다 먼저다
    expect(Math.max(...web.map((m) => m.at))).toBeLessThan(
      h.recs[0]?.rec.startedAt ?? 0,
    );
    const report = h.done[0]?.report as AReport;
    expect(report.played).toEqual({
      webaudio: "wav",
      element: "wav",
      synth: null,
    });
    expect(
      h.sounds.webaudio.plays.every((p) => p.text === A_AUDIO_URL.wav),
    ).toBe(true);
    expect(h.sounds.synth.plays.every((p) => p.text === A_SENTENCE)).toBe(true);
    expect(stepOf(h, "webaudio", "inside").round?.a?.format).toBe("wav");
    expect(stepOf(h, "synth", "inside").round?.a?.format).toBeNull();
  });

  it("풀지 못한 형식은 한 번만 재고, 차례는 되는 다음 형식으로 돈다", () => {
    const h = harness(() => apple, {
      measure: (via, format) =>
        format === "ogg" || (via === "webaudio" && format === "wav")
          ? { ok: false, firstSoundMs: null, error: "EncodingError" }
          : {},
      canPlay: { ogg: "" },
    });
    runAll(h);
    const report = h.done[0]?.report as AReport;
    expect(h.measures.filter((m) => m.format === "ogg")).toHaveLength(2);
    expect(report.played.webaudio).toBe("mp3");
    expect(report.played.element).toBe("wav");
    expect(h.sounds.webaudio.plays[0]?.text).toBe(A_AUDIO_URL.mp3);
    const rows = aFormatRowsOf(report);
    expect(rows.find((r) => r.format === "ogg")).toMatchObject({
      canPlay: "",
      decode: false,
      element: false,
      webaudioMs: null,
      elementMs: null,
    });
    expect(rows.find((r) => r.format === "mp3")).toMatchObject({
      decode: true,
      element: true,
      webaudioMs: 60,
      elementMs: 90,
    });
    expect(rows.find((r) => r.format === "wav")?.errors).toEqual([
      "EncodingError",
    ]);
  });

  it("측정에 답이 없거나 '재생이 안 흐름'이면 실패로 적되 다음 바퀴에 다시 잰다(장치가 막 켜지는 때)", () => {
    let hang = true;
    let cold = true;
    const h = harness(() => apple, {
      measure: (_via, format) => {
        if (format === "mp3" && hang) {
          hang = false;
          return { firstSoundMs: A_MEASURE_WAIT_MS * 3 };
        }
        if (format === "wav" && cold) {
          cold = false;
          return {
            ok: false,
            firstSoundMs: null,
            error: "not-playing(running)",
          };
        }
        return {};
      },
    });
    runAll(h);
    const report = h.done[0]?.report as AReport;
    const timedOut = report.measures.filter((m) => m.error === "timeout");
    expect(timedOut).toHaveLength(1);
    expect(timedOut[0]).toMatchObject({ format: "mp3", ok: false });
    // 한 번 안 된 wav · mp3 도 둘째 · 셋째 바퀴에 다시 재어 쓴다
    const web = report.measures.filter((m) => m.via === "webaudio");
    expect(web.filter((m) => m.format === "wav")).toHaveLength(A_FORMAT_REPS);
    expect(web.filter((m) => m.format === "mp3" && m.ok)).toHaveLength(
      A_FORMAT_REPS - 1,
    );
    expect(report.played.webaudio).toBe("wav");
    expect(h.records).toHaveLength(h.plan.length);
  });

  it("어느 형식도 재생이 안 되는 길의 차례는 건너뛴다", () => {
    const h = harness(() => apple, {
      measure: (via) =>
        via === "element" ? { ok: false, firstSoundMs: null, error: "x" } : {},
    });
    runAll(h);
    expect(h.records.some((r) => r.round?.a?.via === "element")).toBe(false);
    expect(h.done[0]?.report.skipped).toEqual(["element"]);
  });

  it("길 하나의 측정이 끝날 때마다 알리고, 그 로그는 형식 표와 표본을 담는다", () => {
    const h = harness(() => apple);
    runAll(h);
    expect(h.measured.map((m) => m.count)).toEqual([
      A_FORMATS.length * A_FORMAT_REPS,
      A_FORMATS.length * A_FORMAT_REPS * 2,
    ]);
    // 첫 알림은 Web Audio 차례가 돌기 전이다
    expect(h.measured[0]?.records).toBe(0);
    const log = JSON.parse(
      aFormatLogOf(ENV, "run-a", h.done[0]?.report as AReport),
    );
    expect(log.kind).toBe("roundA-formats");
    expect(log.formats).toHaveLength(3);
    expect(log.samples).toHaveLength(18);
    expect(log.opens[0]).toEqual([
      "webaudio",
      true,
      "ok",
      "running",
      "enter",
      0,
    ]);
  });

  it("중앙값 · 재생 형식 고르기 · audiostart 분포", () => {
    expect(medianOf([])).toBeNull();
    expect(medianOf([5])).toBe(5);
    expect(medianOf([9, 1, 5])).toBe(5);
    expect(medianOf([1, 2, 3, 10])).toBe(3);
    const m = (format: AFormat, ok: boolean): AMeasure => ({
      via: "webaudio",
      format,
      ok,
      firstSoundMs: ok ? 10 : null,
      fetchMs: null,
      decodeMs: null,
      error: null,
    });
    expect(aPlayFormatOf([m("wav", false), m("mp3", true)], "webaudio")).toBe(
      "mp3",
    );
    expect(aPlayFormatOf([m("wav", true)], "element")).toBeNull();
    // 200ms 안(앱의 '마이크 안 잡힘' 의심 띠)인 수를 센다 — 200 은 안, 201 은 밖
    expect(aAsStatOf([12, 300, 14, 200, 201])).toEqual({
      n: 5,
      min: 12,
      median: 200,
      fast: 3,
    });
    expect(aAsStatOf([])).toEqual({ n: 0, min: null, median: null, fast: 0 });
  });
});

describe("자동 A 라운드 러너 — 차례의 때 맞춤", () => {
  it("버림 안: 버림 audiostart 0.2초 뒤 소리 → 소리 끝 + 0.3초에 버림 stop → end 1초 뒤 진짜, 'apple' 은 진짜를 열 때만 보인다", () => {
    const h = harness(() => apple);
    runAll(h);
    const record = stepOf(h, "webaudio", "inside");
    const decoyStart = record.attempts[0]?.startCallAt ?? 0;
    const call = eventOf(record, "speak-call");
    expect(call?.utterance).toBe("line");
    expect((call?.at ?? 0) - decoyStart).toBe(35 + ROUND2_SOUND_AFTER_AS_MS);
    const start = eventOf(record, "speak-start");
    expect((start?.at ?? 0) - (call?.at ?? 0)).toBe(SOUND_LATENCY_MS);
    // 시작 알림의 덧붙임(AudioContext 상태 · 목소리 이름)은 서버 기록에 가는 code 자리에도 둔다
    expect(start).toMatchObject({ code: "running", message: "running" });
    const end = eventOf(record, "speak-end");
    const stop = eventOf(record, "stop-call", (e) => e.code === "decoy");
    expect((stop?.at ?? 0) - (end?.at ?? 0)).toBe(ROUND2_SOUND_TAIL_MS);
    const decoyEnd = eventOf(record, "end", (e) => e.attempt === 0);
    const realStart = record.attempts[1]?.startCallAt ?? 0;
    expect(realStart - (decoyEnd?.at ?? 0)).toBe(DECOY_GAP_MS);
    const prompt = eventOf(record, "prompt");
    expect(prompt).toMatchObject({ code: "apple", at: realStart });
    // 'apple' 은 진짜 start 때만 보인다
    const say = h.views.filter((v) => v.view?.kind === "say");
    const realStarts = h.records.map(
      (r) => r.attempts.at(-1)?.startCallAt ?? -1,
    );
    expect(say.map((v) => v.at)).toEqual(realStarts);
    expect(record.round?.slots.map((s) => s.role)).toEqual(["decoy", "real"]);
    // Web Audio · 오디오 요소 길은 읽기 앞 cancel 을 하지 않는다
    expect(eventOf(record, "speak-cancel")).toBeUndefined();
    expect(h.sounds.webaudio.cancels).toHaveLength(0);
    // 차례 사이는 앞 진짜 end 뒤 2초다
    expect(record.sincePrevEndMs).toBe(ROUND_GAP_MS);
  });

  it("세션 없이: 소리 → 소리 끝 1초 뒤 진짜(버림 없음)", () => {
    const h = harness(() => apple);
    runAll(h);
    const record = stepOf(h, "element", "bare");
    expect(record.attempts).toHaveLength(1);
    const call = eventOf(record, "speak-call");
    expect(call?.utterance).toBe("bare");
    const end = eventOf(record, "speak-end");
    expect((record.attempts[0]?.startCallAt ?? 0) - (end?.at ?? 0)).toBe(
      DECOY_GAP_MS,
    );
    expect(record.round?.slots.map((s) => s.role)).toEqual(["real"]);
  });

  it("쉰 뒤 첫 차례: 차례 0 은 문서의 첫 듣기라 기다리지 않고, 읽기 길의 첫 차례는 앞 듣기 끝 45초 뒤에 '쉬는 중'을 보이며 돈다", () => {
    const h = harness(() => apple);
    runAll(h);
    const first = h.records[0] as ProbeRecord;
    expect(first.round?.a).toMatchObject({
      via: "webaudio",
      shape: "first",
      rep: 1,
    });
    // 세션 없이 소리 → 진짜(버림 없음), 문서의 첫 듣기라 앞 끝이 없다
    expect(first.attempts).toHaveLength(1);
    expect(eventOf(first, "speak-call")?.utterance).toBe("bare");
    expect(first.sincePrevEndMs).toBeNull();
    // 형식 측정이 끝나자마자 소리를 낸다(쉼을 기다리지 않는다)
    const lastMeasure = h.measures.filter((m) => m.via === "webaudio").at(-1);
    expect(
      (eventOf(first, "speak-call")?.at ?? 0) - (lastMeasure?.at ?? 0),
    ).toBe(60);

    const synthFirst = stepOf(h, "synth", "first");
    const prev = h.records[h.records.indexOf(synthFirst) - 1] as ProbeRecord;
    const prevEnd = prev.events.findLast((e) => e.type === "end")?.at ?? 0;
    // 앞 듣기 end 뒤 꼭 45초에 차례를 시작한다(읽기 길은 cancel 부터)
    const cancel = eventOf(synthFirst, "speak-cancel");
    expect((cancel?.at ?? 0) - prevEnd).toBe(A_REST_MS);
    expect(synthFirst.sincePrevEndMs ?? 0).toBeGreaterThan(A_REST_MS);
    expect(synthFirst.resetStep).toBe("pause-45");
    expect(h.views.map((v) => v.view)).toContainEqual({
      kind: "rest",
      until: prevEnd + A_REST_MS,
    });
    expect(aRowOf(synthFirst)?.sincePrevEndMs).toBe(synthFirst.sincePrevEndMs);
    expect(aCellOf(aRowOf(synthFirst) as never)).toContain("앞 끝 뒤");
  });

  it("이 쪽에서 이미 끝난 듣기가 있으면 차례 0 도 그 끝 뒤 45초를 채운 뒤에 돈다", () => {
    const h = harness(() => apple, { lastEndAt: -10_000 });
    runAll(h);
    const first = h.records[0] as ProbeRecord;
    expect(eventOf(first, "speak-call")?.at).toBe(-10_000 + A_REST_MS);
    expect(first.sincePrevEndMs ?? 0).toBeGreaterThan(A_REST_MS);
  });

  it("읽기 길은 소리 앞에 cancel 하고 0.3초 뒤 부른다(지금 앱 꼴), 버림 start 는 앞 end 뒤 2초를 지킨다", () => {
    const h = harness(() => apple);
    runAll(h);
    const inside = stepOf(h, "synth", "inside");
    const cancel = eventOf(
      inside,
      "speak-cancel",
      (e) => e.code === "before-speak",
    );
    expect(cancel).toBeDefined();
    expect((inside.attempts[0]?.startCallAt ?? 0) - (cancel?.at ?? 0)).toBe(
      ROUND2_CANCEL_SETTLE_MS,
    );
    expect(inside.sincePrevEndMs).toBe(ROUND_GAP_MS);
    const bare = stepOf(h, "synth", "bare");
    const bareCancel = eventOf(bare, "speak-cancel");
    const bareCall = eventOf(bare, "speak-call");
    expect((bareCall?.at ?? 0) - (bareCancel?.at ?? 0)).toBe(
      ROUND2_CANCEL_SETTLE_MS,
    );
  });

  it("진짜: 'apple' 을 들으면 1.5초 조용한 뒤 stop(silence), 정한 시간 안에 못 들으면 stop(no-result)", () => {
    const h = harness((step) => (step.shape === "bare" ? dead : apple));
    runAll(h);
    const heard = stepOf(h, "webaudio", "inside");
    const realStart = heard.attempts[1]?.startCallAt ?? 0;
    const stop = eventOf(heard, "stop-call", (e) => e.code === "silence");
    expect((stop?.at ?? 0) - realStart).toBe(1_200 + ROUND_SILENCE_MS);
    expect(heard.stopReason).toBe("silence");
    const deaf = stepOf(h, "webaudio", "bare");
    const deafStart = deaf.attempts[0]?.startCallAt ?? 0;
    const deafStop = eventOf(deaf, "stop-call", (e) => e.code === "no-result");
    expect((deafStop?.at ?? 0) - deafStart).toBe(A_NO_RESULT_STOP_MS);
    expect(deaf.stopReason).toBe("no-result");
  });

  it("소리가 오류로 끝나거나 끝 알림이 없어도 차례는 진짜까지 가고 그 차례는 깨끗에서 빠진다", () => {
    const failing = harness(() => apple);
    failing.sounds.element.mode = "fail";
    runAll(failing);
    const failed = stepOf(failing, "element", "inside");
    expect(eventOf(failed, "speak-error")?.code).toBe("EncodingError");
    expect(failed.attempts).toHaveLength(2);
    expect(aRowOf(failed)?.clean).toBe(false);

    const hanging = harness(() => apple);
    hanging.sounds.element.mode = "no-end";
    runAll(hanging);
    const hung = stepOf(hanging, "element", "inside");
    const start = eventOf(hung, "speak-start");
    const missing = eventOf(hung, "speak-end-missing");
    expect((missing?.at ?? 0) - (start?.at ?? 0)).toBe(A_SOUND_END_WAIT_MS);
    expect(hanging.sounds.element.cancels.length).toBeGreaterThan(0);
    expect(hung.attempts).toHaveLength(2);
    expect(aRowOf(hung)).toMatchObject({ clean: false, soundEndMissing: true });
    expect(hanging.records).toHaveLength(hanging.plan.length);
  });
});

describe("자동 A 라운드 러너 — 소리 출력을 재우는 꼴", () => {
  it("버림 안(재움): 소리가 끝나면 소리 출력을 재우고, 그 답 0.3초 뒤 버림을 닫아 진짜는 재운 채로 연다", () => {
    const h = harness(() => apple);
    runAll(h);
    const record = stepOf(h, "webaudio", "inside-sleep");
    const end = eventOf(record, "speak-end");
    const call = eventOf(record, "webaudio-sleep", (e) => e.code === "call");
    const reply = eventOf(
      record,
      "webaudio-sleep",
      (e) => e.message === "reply",
    );
    expect(call?.at).toBe(end?.at);
    expect((reply?.at ?? 0) - (call?.at ?? 0)).toBe(SLEEP_MS);
    expect(reply?.code).toBe("suspended");
    const stop = eventOf(record, "stop-call", (e) => e.code === "decoy");
    expect((stop?.at ?? 0) - (reply?.at ?? 0)).toBe(ROUND2_SOUND_TAIL_MS);
    const row = aRowOf(record);
    expect(row).toMatchObject({
      shape: "inside-sleep",
      sleep: { state: "suspended", ms: SLEEP_MS },
      audioAtReal: "suspended",
      clean: true,
      apple: true,
    });
    // 재우지 않는 꼴은 진짜를 열 때 AudioContext 가 돌고 있다
    expect(aRowOf(stepOf(h, "webaudio", "inside"))).toMatchObject({
      sleep: null,
      audioAtReal: "running",
    });
    expect(aCellOf(row as NonNullable<typeof row>)).toContain(
      "재움 suspended(5)",
    );
    expect(h.sleeps.map((s) => s.via)).toEqual(["webaudio", "webaudio"]);
  });

  it("세션 없이(재움): 소리 → 재움 → 1초 뒤 진짜. 재우는 꼴은 Web Audio 길에서만 돈다", () => {
    const h = harness(() => apple);
    runAll(h);
    const record = stepOf(h, "webaudio", "bare-sleep");
    const reply = eventOf(
      record,
      "webaudio-sleep",
      (e) => e.message === "reply",
    );
    expect((record.attempts[0]?.startCallAt ?? 0) - (reply?.at ?? 0)).toBe(
      DECOY_GAP_MS,
    );
    expect(aRowOf(record)?.audioAtReal).toBe("suspended");
    for (const r of h.records) {
      const a = r.round?.a;
      if (a?.via !== "webaudio") {
        expect(eventOf(r, "webaudio-sleep")).toBeUndefined();
      }
    }
  });

  it("재운 뒤의 다음 소리는 누름 밖에서 스스로 깨워 내고, 깨웠는지를 길 열기 기록에 '깨우기'로 남긴다", () => {
    const h = harness(() => apple, { count: 2 });
    runAll(h);
    const report = h.done[0]?.report as AReport;
    const wakes = report.opens.filter((o) => o.purpose === "wake");
    // 재우는 꼴 넷 가운데 뒤 셋의 소리가 앞 차례가 재운 것을 깨운다(마지막 재움 뒤는 길이 바뀐다)
    const sleepSteps = h.plan
      .filter((s) => s.shape.endsWith("-sleep"))
      .map((s) => s.step);
    expect(wakes.map((o) => o.step)).toEqual(sleepSteps.slice(1));
    expect(wakes.every((o) => o.result === "ok" && !o.gesture)).toBe(true);
    expect(wakes[0]?.detail).toContain("resumed=");
    expect(report.sleepDropped).toEqual([]);
    expect(report.taps).toBe(0);
    const line = aLineOf(aLinesOf(h.records), report);
    expect(line).toContain("깨우기 누름 밖 3/3");
    // 깨운 소리의 시작 알림에 깨운 흔적이 남는다
    const second = stepOf(h, "webaudio", "bare-sleep", 1);
    expect(eventOf(second, "speak-start")?.code).toContain("from=suspended");
  });

  it("누름 밖에서 못 깨우면 그 차례는 빼고, 다음 차례 앞에 길을 다시 열며('한 번 더') 남은 재우는 꼴은 돌지 않는다", () => {
    const h = harness(() => apple, {
      count: 2,
      wakeBlocked: true,
      opens: { webaudio: ["ok", "need-gesture", "ok"] },
    });
    runAll(h, false);
    // 재우는 꼴 첫 차례(버림 안) 뒤, 둘째 차례(세션 없이)의 소리가 못 깨웠다 → 그다음 차례 앞에서 '한 번 더'
    expect(h.views.at(-1)?.view).toEqual({ kind: "tap", via: "webaudio" });
    const blocked = stepOf(h, "webaudio", "bare-sleep", 1);
    expect(eventOf(blocked, "speak-error")?.code).toBe(
      "resume-blocked(suspended)",
    );
    expect(aRowOf(blocked)?.clean).toBe(false);
    h.runner.resume();
    runAll(h, false);
    const report = h.done[0]?.report as AReport;
    const dropped = h.plan
      .filter((s) => s.shape.endsWith("-sleep") && s.rep === 2)
      .map((s) => s.step);
    expect(report.sleepDropped).toEqual(dropped);
    expect(h.records.some((r) => dropped.includes(r.round?.step ?? -1))).toBe(
      false,
    );
    expect(report.taps).toBe(1);
    expect(
      report.opens
        .filter((o) => o.purpose === "wake")
        .map((o) => [o.gesture, o.result]),
    ).toEqual([
      [false, "need-gesture"],
      [false, "need-gesture"],
      [true, "ok"],
    ]);
    // 나머지 길은 그대로 돈다
    expect(h.records.filter((r) => r.round?.a?.via === "element")).toHaveLength(
      4,
    );
    expect(aLineOf(aLinesOf(h.records), report)).toContain(
      `깨우기 누름 밖 0/2 · 누름 필요 2 · 안 돈 재움 차례 ${dropped.join("·")}`,
    );
  });

  it("재우기에 답이 없으면 상한 뒤 '답 없음'으로 적고 잇는다", () => {
    const h = harness(() => apple, { sleepNever: true });
    runAll(h);
    const record = stepOf(h, "webaudio", "bare-sleep");
    const call = eventOf(record, "webaudio-sleep", (e) => e.code === "call");
    const reply = eventOf(
      record,
      "webaudio-sleep",
      (e) => e.message === "reply",
    );
    expect((reply?.at ?? 0) - (call?.at ?? 0)).toBe(A_SLEEP_WAIT_MS);
    expect(aRowOf(record)?.sleep).toEqual({
      state: "no-reply",
      ms: A_SLEEP_WAIT_MS,
    });
    expect(h.records).toHaveLength(h.plan.length);
  });
});

describe("자동 A 라운드 — 판정 · audiostart 분포 · 요약 줄 · 로그", () => {
  /** 기준 꼴: 버림 안은 살고 세션 없이는 죽는다(Web Audio 만 둘 다 산다). */
  const baseline = (step: APlanStep): RecScript =>
    aIsBare(step.shape) && step.via !== "webaudio" ? dead : apple;

  it("살아남은 깨끗한 차례 가운데 진짜가 'apple' 을 들은 수다(길 · 꼴마다)", () => {
    const h = harness(baseline, { count: 3 });
    runAll(h);
    const lines = aLinesOf(h.records, "run-a");
    expect(
      lines.cells.map((c) => [c.via, c.shape, c.apple, c.clean, c.tries]),
    ).toEqual([
      ["webaudio", "first", 1, 1, 1],
      ["webaudio", "inside", 3, 3, 3],
      ["webaudio", "bare", 3, 3, 3],
      ["webaudio", "inside-sleep", 3, 3, 3],
      ["webaudio", "bare-sleep", 3, 3, 3],
      ["element", "inside", 3, 3, 3],
      ["element", "bare", 0, 3, 3],
      ["synth", "first", 0, 1, 1],
      ["synth", "inside", 3, 3, 3],
      ["synth", "bare", 0, 3, 3],
    ]);
    expect(lines.excluded).toEqual([]);
    // 차례의 첫 소리까지(부름 → 시작) 중앙값
    expect(lines.cells[1]?.firstSoundMs).toBe(SOUND_LATENCY_MS);
    const report = h.done[0]?.report as AReport;
    const line = aLineOf(lines, report);
    expect(line).toContain(
      "Web Audio 쉰 뒤 첫 차례 1/1 · 버림 안 3/3 · 세션 없이 3/3 · 버림 안(재움) 3/3 · 세션 없이(재움) 3/3",
    );
    expect(line).toContain("오디오 요소 버림 안 3/3 · 세션 없이 0/3");
    expect(line).toContain(
      "지금 읽기 쉰 뒤 첫 차례 0/1 · 버림 안 3/3 · 세션 없이 0/3",
    );
    expect(line).toContain("wav");
    expect(line).toContain("첫 소리");
    expect(line).toContain("시작 전 speechSynthesis 0번");
    // 끝 화면이 같은 줄을 보인다
    expect(h.views.at(-1)?.view).toEqual({ kind: "done", line });
  });

  it("audiostart 분포: 길 · 꼴마다 진짜 듣기와 버리는 듣기의 가장 작은 값 · 중앙값 · 200ms 안인 수를 낸다", () => {
    // Web Audio 가 도는 동안의 진짜는 빠른 띠인데 듣고(기록 8), 재운 뒤의 진짜는 느린 띠로 돌아온다
    const h = harness(
      (step) =>
        step.via === "webaudio" && !step.shape.endsWith("-sleep")
          ? fastAlive
          : apple,
      { count: 3 },
    );
    runAll(h);
    const lines = aLinesOf(h.records);
    const cellOf = (via: AVia, shape: string) =>
      lines.cells.find((c) => c.via === via && c.shape === shape);
    expect(cellOf("webaudio", "inside")).toMatchObject({
      apple: 3,
      slow: 0,
      realAs: { n: 3, min: 14, median: 14, fast: 3 },
      decoyAs: { n: 3, min: 35, median: 35, fast: 3 },
    });
    expect(cellOf("webaudio", "bare")).toMatchObject({
      realAs: { n: 3, min: 14, median: 14, fast: 3 },
      decoyAs: null,
    });
    expect(cellOf("webaudio", "inside-sleep")).toMatchObject({
      apple: 3,
      slow: 3,
      realAs: { n: 3, min: 380, median: 380, fast: 0 },
      decoyAs: { n: 3, min: 35, median: 35, fast: 3 },
    });
    expect(cellOf("synth", "first")?.realAs).toEqual({
      n: 1,
      min: 380,
      median: 380,
      fast: 0,
    });
    const line = aLineOf(lines, h.done[0]?.report as AReport);
    expect(line).toContain(
      "audiostart(가장 작은 값·중앙값·200ms 안) Web Audio",
    );
    expect(line).toContain("버림 안 진짜 14·14·3/3 버림 35·35·3/3");
    expect(line).toContain("버림 안(재움) 진짜 380·380·0/3 버림 35·35·3/3");
    expect(line).toContain("세션 없이(재움) 진짜 380·380·0/3");
    const log = JSON.parse(
      aLogOf(h.records, ENV, "run-a", 0, false, h.done[0]?.report as AReport),
    );
    expect(log.cellKeys).toContain("realAs[n,min,median,fast200]");
    expect(log.cells[1]).toEqual([
      "webaudio",
      "inside",
      3,
      3,
      3,
      3,
      0,
      SOUND_LATENCY_MS,
      [3, 14, 14, 3],
      [3, 35, 35, 3],
    ]);
  });

  it("다른 낱말로 들린 진짜는 살아남에 세지 않고 '소리 받음'으로 따로 센다, 살아 있는 띠(as > 250)도 따로 센다", () => {
    const h = harness((step) => (step.shape === "inside" ? other : dead), {
      count: 2,
    });
    runAll(h);
    const lines = aLinesOf(h.records);
    const inside = lines.cells.find(
      (c) => c.via === "webaudio" && c.shape === "inside",
    );
    expect(inside).toMatchObject({ apple: 0, heard: 2, slow: 2, clean: 2 });
    const bare = lines.cells.find(
      (c) => c.via === "webaudio" && c.shape === "bare",
    );
    expect(bare).toMatchObject({ apple: 0, heard: 0, slow: 0, clean: 2 });
    const row = aRowOf(stepOf(h, "webaudio", "inside"));
    expect(row).toMatchObject({ apple: false, heard: true, slow: true });
    expect(aLineOf(lines, h.done[0]?.report as AReport)).toContain(
      "버림 안 0/2(소리 받음 2)",
    );
  });

  it("소리가 안 난 차례는 깨끗에서 빼고 뺀 차례로 적는다", () => {
    const h = harness(() => apple, { count: 2 });
    h.sounds.element.mode = "silent";
    runAll(h);
    const lines = aLinesOf(h.records);
    const element = lines.cells.filter((c) => c.via === "element");
    expect(element.map((c) => [c.clean, c.tries])).toEqual([
      [0, 2],
      [0, 2],
    ]);
    const steps = h.records
      .filter((r) => r.round?.a?.via === "element")
      .map((r) => r.round?.step);
    expect(lines.excluded).toEqual(steps);
    expect(aLineOf(lines, h.done[0]?.report as AReport)).toContain(
      `뺀 차례 ${steps.join("·")}`,
    );
  });

  it("차례 칸: 길 · 꼴 · 형식 · 소리 부름 → 첫 소리 · 버림 · 진짜 값을 한 줄로 적고, WR · WR2 칸으로는 읽히지 않는다", () => {
    const h = harness(baseline);
    runAll(h);
    const record = stepOf(h, "webaudio", "inside");
    expect(roundRowOf(record)).toBeNull();
    expect(round2RowOf(record)).toBeNull();
    const row = aRowOf(record);
    expect(row).toMatchObject({
      step: 1,
      via: "webaudio",
      shape: "inside",
      rep: 1,
      format: "wav",
      synthCalls: 0,
      firstSoundMs: SOUND_LATENCY_MS,
      apple: true,
      clean: true,
    });
    expect(row?.decoy).toMatchObject({ as: 35, alive: false });
    const cell = aCellOf(row as NonNullable<typeof row>);
    expect(cell).toContain("1·Web Audio·버림 안·wav");
    expect(cell).toContain("apple 예");
    expect(cell).toContain("AudioContext running");
    expect(cell).toContain("깨끗");
    expect(rowCells(rowOf(record)).at(-1)).toBe(cell);
    expect(aRowOf({ ...record, strategy: "WR2" })).toBeNull();
  });

  it("라운드 끝 로그는 요약 줄 · 길 · 꼴별 수 · 형식 표 · 차례 줄을 담고 들은 글은 담지 않으며 가장 긴 라운드도 상한 안이다", () => {
    const h = harness(baseline, { count: 4 });
    runAll(h, true, "both", "quieter");
    const report = h.done[0]?.report as AReport;
    const body = aLogOf(h.records, ENV, "run-a", 1, false, report);
    expect(body.length).toBeLessThanOrEqual(LOG_BODY_MAX_CHARS);
    const log = JSON.parse(body);
    expect(log.kind).toBe("roundA");
    expect(log.autoRun).toBe("run-a");
    expect(log.hiddenCount).toBe(1);
    expect(log.stopped).toBe(false);
    expect(log.line).toBe(aLineOf(aLinesOf(h.records, "run-a"), report));
    expect(log.cells).toHaveLength(10);
    expect(log.formats).toHaveLength(3);
    // 차례 줄은 따로 나눠 보낸다(몸마다 상한 안)
    const parts = aStepLogsOf(h.records, "run-a");
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) {
      expect(part.length).toBeLessThanOrEqual(LOG_BODY_MAX_CHARS);
      expect(part).not.toContain("finalText");
    }
    const stepLogs = parts.map((part) => JSON.parse(part));
    expect(stepLogs.map((p) => [p.kind, p.part, p.parts])).toEqual([
      ["roundA-steps", 1, 2],
      ["roundA-steps", 2, 2],
    ]);
    expect(stepLogs.flatMap((p) => p.steps)).toHaveLength(h.plan.length);
    expect(stepLogs[0].steps[0].slice(0, 3)).toEqual([0, "webaudio", "first"]);
    expect(stepLogs[0].stepKeys).toContain("sleep[state,ms]");
    expect(log.samples).toHaveLength(18);
    expect(log.taps).toBe(0);
    expect(log.volume).toBe("quieter");
    expect(log.played).toEqual({
      webaudio: "wav",
      element: "wav",
      synth: null,
    });
    expect(body).not.toContain("finalText");
    expect(body).not.toContain("lastText");
    // 기록 하나의 로그에도 차례 칸이 들어간다(요약이 잘려도 읽게)
    const one = JSON.parse(
      recordLogOf(stepOf(h, "webaudio", "inside-sleep"), ENV),
    );
    expect(one.row.roundA).toMatchObject({
      via: "webaudio",
      shape: "inside-sleep",
      audioAtReal: "suspended",
    });
    expect(JSON.stringify(one)).not.toContain('finalText"');
  });

  it("기록은 기기 안 저장 꼴로 다시 읽히고(새 칸 포함), 복사 글에 A 라운드 줄이 들어간다", () => {
    const h = harness(baseline);
    runAll(h);
    const again = parseStored(JSON.stringify(h.records));
    expect(again).toHaveLength(h.records.length);
    expect(again[3]?.round?.a).toEqual(h.records[3]?.round?.a);
    expect(aRowOf(again[3] as ProbeRecord)?.sleep?.state).toBe("suspended");
    const text = copyTextOf(h.records, ENV);
    expect(text).toContain("- A 라운드 run-a: ");
    expect(text).toContain("버림 안 1/1");
  });
});

describe("자동 A 라운드 러너 — 읽기 뒤 다시 재생(M6)과 끝의 두 물음", () => {
  it("읽기 길이 끝난 뒤 Web Audio · 오디오 요소로 같은 파일을 한 번씩 다시 재생하고, '들렸나요' · '작아졌나요'의 답을 받은 뒤에 끝난다", () => {
    const h = harness(() => apple);
    runAll(h, true, null);
    expect(h.done).toHaveLength(0);
    expect(h.records).toHaveLength(h.plan.length);
    expect(h.replays.map((r) => [r.via, r.format])).toEqual([
      ["webaudio", "wav"],
      ["element", "wav"],
    ]);
    // 다시 재생은 읽기(speechSynthesis)를 쓴 뒤다
    const lastSynth = h.records
      .at(-1)
      ?.events.findLast((e) => e.type === "end");
    expect(h.replays[0]?.at ?? 0).toBeGreaterThan(lastSynth?.at ?? Infinity);
    expect(h.replays[0]?.synthCalls).toBeGreaterThan(0);
    // 둘째 소리는 첫 소리 끝 1초 뒤(길 열기 5ms)에 낸다
    expect((h.replays[1]?.at ?? 0) - (h.replays[0]?.at ?? 0)).toBe(
      SOUND_LENGTH_MS + A_AFTER_GAP_MS + OPEN_MS,
    );
    const kinds = h.views.map((v) => v.view);
    expect(kinds).toContainEqual({ kind: "after", n: 1 });
    expect(kinds).toContainEqual({ kind: "after", n: 2 });
    expect(h.views.at(-1)?.view).toEqual({ kind: "ask" });
    // 첫 물음에 답하면 둘째 물음으로 넘어가고 아직 끝나지 않는다
    h.runner.answer("first");
    expect(h.views.at(-1)?.view).toEqual({ kind: "ask-volume" });
    expect(h.done).toHaveLength(0);
    h.runner.answerVolume("quieter");
    expect(h.done).toHaveLength(1);
    const report = h.done[0]?.report as AReport;
    expect(report.after?.heard).toBe("first");
    expect(report.volume).toBe("quieter");
    expect(report.after?.plays).toHaveLength(2);
    expect(report.after?.plays[0]).toMatchObject({
      via: "webaudio",
      started: true,
      ended: true,
      stateAtEnd: "running",
      flowedMs: SOUND_LENGTH_MS,
    });
    const line = aLineOf(aLinesOf(h.records), report);
    expect(line).toContain(
      "읽기 뒤 재생 Web Audio 시작 예·끝 예(running · 2000ms 흐름) · 오디오 요소 시작 예·끝 예",
    );
    expect(line).toContain("들림: 첫 번째만(Web Audio)");
    expect(line).toContain("듣기 중 소리 크기: 작아짐");
    expect(h.views.at(-1)?.view).toEqual({ kind: "done", line });
    const log = JSON.parse(aLogOf(h.records, ENV, "run-a", 0, false, report));
    expect(log.after.heard).toBe("first");
    expect(log.after.plays).toHaveLength(2);
    // 답은 한 번만 받는다
    h.runner.answer("none");
    h.runner.answerVolume("same");
    expect(h.done).toHaveLength(1);
    expect(report.volume).toBe("quieter");
  });

  it("답이 없으면 물음마다 정한 시간 뒤 '답 없음'으로 넘어가고, 재생에 답이 없으면 상한 뒤 그렇게 적고 넘어간다", () => {
    const h = harness(() => apple, {
      replay: (via) =>
        via === "webaudio"
          ? "never"
          : { ended: false, flowedMs: 0, error: null },
    });
    runAll(h, true, null);
    const asked = h.views.at(-1);
    expect(asked?.view).toEqual({ kind: "ask" });
    h.clock.advance(A_ASK_WAIT_MS - (h.clock.t - (asked?.at ?? 0)));
    expect(h.views.at(-1)?.view).toEqual({ kind: "ask-volume" });
    expect(h.done).toHaveLength(0);
    h.clock.advance(A_ASK_WAIT_MS);
    expect(h.done).toHaveLength(1);
    const report = h.done[0]?.report as AReport;
    expect(report.after?.heard).toBe("no-answer");
    expect(report.volume).toBe("no-answer");
    expect(report.after?.plays[0]).toMatchObject({
      via: "webaudio",
      started: false,
      ended: false,
      error: "timeout",
    });
    expect((h.replays[1]?.at ?? 0) - (h.replays[0]?.at ?? 0)).toBe(
      A_REPLAY_WAIT_MS + A_AFTER_GAP_MS + OPEN_MS,
    );
    const line = aLineOf(aLinesOf(h.records), report);
    expect(line).toContain("오디오 요소 시작 예·끝 아니요");
    expect(line).toContain("듣기 중 소리 크기: 답 없음");
  });

  it("다시 재생할 길이 누름 밖에서 안 열리면 '한 번 더'를 보이고, 누르면 잇는다", () => {
    const h = harness(() => apple, {
      opens: { webaudio: ["ok", "need-gesture", "ok"] },
    });
    runAll(h, false, null);
    expect(h.views.at(-1)?.view).toEqual({ kind: "tap", via: "webaudio" });
    expect(h.replays).toHaveLength(0);
    h.runner.resume();
    runAll(h, false);
    expect(h.replays).toHaveLength(2);
    expect(h.done[0]?.report.taps).toBe(1);
    expect(h.done[0]?.report.after?.heard).toBe("both");
    expect(
      h.done[0]?.report.opens
        .filter((o) => o.purpose === "after")
        .map((o) => [o.via, o.gesture, o.result]),
    ).toEqual([
      ["webaudio", false, "need-gesture"],
      ["webaudio", true, "ok"],
      ["element", false, "ok"],
    ]);
  });

  it("읽기 길이 돌지 않았으면(건너뜀) 다시 재생 없이 소리 크기만 묻고, 건너뛴 길은 다시 재생하지 않는다", () => {
    const noSynth = harness(() => apple, { opens: { synth: ["failed"] } });
    runAll(noSynth, true, null, null);
    expect(noSynth.views.at(-1)?.view).toEqual({ kind: "ask-volume" });
    expect(noSynth.replays).toHaveLength(0);
    noSynth.runner.answerVolume("unknown");
    expect(noSynth.done[0]?.report.after).toBeNull();
    expect(noSynth.done[0]?.report.volume).toBe("unknown");

    const noElement = harness(() => apple, { opens: { element: ["failed"] } });
    runAll(noElement);
    expect(noElement.replays.map((r) => r.via)).toEqual(["webaudio"]);
    expect(noElement.done[0]?.report.after?.plays[1]).toMatchObject({
      via: "element",
      started: false,
      error: "skipped",
    });
    // 소리 번호는 길에 붙는다(오디오 요소가 빠져도 Web Audio 가 첫 번째)
    expect(noElement.views.map((v) => v.view)).toContainEqual({
      kind: "after",
      n: 1,
    });
  });

  it("물음을 기다리는 동안 '멈추기'를 누르면 그때까지의 재생 기록과 함께 끝난다", () => {
    const h = harness(() => apple);
    runAll(h, true, null);
    h.runner.stop();
    expect(h.done[0]?.stopped).toBe(true);
    expect(h.done[0]?.report.after?.plays).toHaveLength(2);
    expect(h.done[0]?.report.after?.heard).toBeNull();
    h.runner.answer("both");
    h.runner.answerVolume("same");
    expect(h.done).toHaveLength(1);
  });
});

describe("자동 A 라운드 러너 — 멈춤 · 인식 없음", () => {
  it("'멈추기'는 도는 차례를 abort 로 끝내 기록하고, 그때까지 쓰지 않은 speechSynthesis 는 건드리지 않는다", () => {
    const h = harness(() => apple);
    h.runner.start();
    // 차례 1 이 도는 때
    h.clock.advance(9_500);
    const before = h.records.length;
    h.runner.stop();
    expect(h.done).toHaveLength(1);
    expect(h.done[0]?.stopped).toBe(true);
    expect(h.views.at(-1)?.view).toBeNull();
    expect(h.records.length).toBe(before + 1);
    expect(h.records.at(-1)?.stopReason).toBe("user");
    expect(h.synthCalls()).toBe(0);
    expect(h.closes.map((c) => c.via)).toEqual(["webaudio"]);
    const count = h.recs.length;
    h.clock.advance(60_000);
    expect(h.recs).toHaveLength(count);
    expect(h.done).toHaveLength(1);
  });

  it("'한 번 더'를 기다리는 동안 멈추면 그대로 끝난다, 쪽을 떠나면 알림 없이 끊는다", () => {
    const h = harness(() => apple, { opens: { element: ["need-gesture"] } });
    h.runner.start();
    h.clock.advance(120_000);
    expect(h.views.at(-1)?.view?.kind).toBe("tap");
    h.runner.stop();
    expect(h.done[0]?.stopped).toBe(true);
    h.runner.resume();
    h.clock.advance(60_000);
    expect(h.done).toHaveLength(1);

    const d = harness(() => apple);
    d.runner.start();
    d.clock.advance(9_500);
    d.runner.dispose();
    const records = d.records.length;
    d.clock.advance(60_000);
    expect(d.records).toHaveLength(records);
    expect(d.done).toHaveLength(0);
    expect(d.synthCalls()).toBe(0);
  });

  it("인식이 없으면 첫 차례에서 라운드를 끝낸다", () => {
    const h = harness(() => apple, { noRecognition: true });
    runAll(h);
    expect(h.done[0]?.stopped).toBe(true);
    expect(h.records).toHaveLength(1);
    expect(h.records[0]?.stopReason).toBe("no-recognition");
  });

  it("화면이 숨겨진 수를 세고 도는 차례에 적는다", () => {
    const h = harness(() => apple);
    h.runner.start();
    h.clock.advance(9_500);
    h.runner.note("hidden");
    h.runner.note("visible");
    runAll(h);
    expect(
      h.records.some((r) => r.events.some((e) => e.type === "hidden")),
    ).toBe(true);
  });
});

describe("자동 A 라운드 글(해요체)", () => {
  it("안내 · 단추 · 큰 글씨 글이 있다", () => {
    expect(MIC_TEXT.roundAStart).toBe("자동 A 라운드(받아 온 소리)");
    expect(MIC_TEXT.roundAGuide).toContain("'지금 apple 이라고 말해요'");
    expect(MIC_TEXT.roundAGuide).toContain(
      "말하지 않아도 라운드는 끝까지 돌아요",
    );
    expect(MIC_TEXT.roundAGuide.endsWith("요.")).toBe(true);
    expect(MIC_TEXT.roundATap).toBe("한 번 더 눌러 주세요");
    expect(MIC_TEXT.roundASynthUsed(2)).toContain("새로 고침");
    expect(MIC_TEXT.roundACount(3, 5)).toContain("3번");
    expect(MIC_TEXT.roundAAsk).toBe("방금 두 소리가 들렸나요?");
    expect(MIC_TEXT.roundAAskVolume).toBe(
      "듣기가 켜진 동안 소리가 작아졌나요?",
    );
    expect(Object.values(MIC_TEXT.roundAVolume)).toEqual([
      "그대로였어요",
      "작아졌어요",
      "모르겠어요",
    ]);
  });
});

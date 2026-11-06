// 마이크 점검 쪽 '자동 W 라운드'(브리프 task-mic-probe-fix7 2026-11-07, 분석 10.18.3 X-1~X-6 · 자동 차례 0~8). 차례 계획 · 살아 있는 버림의
// 길 고르기 · 차례 7 의 S 꼴 전환 · '진짜 살아남 n/m' · 안내 글 상수를 덮는다. 러너(w-round.ts)는 가짜 인식 · 가짜 읽기 · 가짜 시계로 돌린다.
import { describe, expect, it } from "vitest";
import {
  copyTextOf,
  DECOY_GAP_MS,
  DECOY_SPEAK_AT_MS,
  NO_RESULT_STOP_MS,
  type ProbeEnv,
  type ProbeRecord,
  parseStored,
  ROUND_PAUSE_MS,
  ROUND_SILENCE_MS,
  type RoundPlanStep,
  recordLogOf,
  roundLogOf,
  roundNextOf,
  roundPathOf,
  roundPlanOf,
  roundRowOf,
  roundSurvivalOf,
  rowCells,
  rowOf,
  UNLOCK_TEXT,
  W_ROUND_SENTENCE,
} from "../../src/app/dev/mic-probe/probe-log";
import { MIC_TEXT } from "../../src/app/dev/mic-probe/probe-text";
import {
  type RoundRecognition,
  type RoundSpeakHandlers,
  type RoundSpeakOptions,
  type RoundSpeech,
  type RoundView,
  WRoundRunner,
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

/** 가짜 인식 하나의 대본: start 뒤 시작 알림 ms(null 이면 없음) · 결과(start 기준 ms). */
type RecScript = {
  as: number | null;
  results?: { at: number; text: string; final: boolean }[];
};
const STOP_END_MS = 30;
const ABORT_END_MS = 10;

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
    if (this.script.as !== null)
      this.at(this.script.as, () => this.onaudiostart?.());
    for (const r of this.script.results ?? []) {
      this.at(r.at, () => {
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
    this.clock.later(() => {
      this.onerror?.({ error: "aborted" });
      this.onend?.();
    }, ABORT_END_MS);
  }
}

const LINE_MS = 1_500;
const UNLOCK_MS = 50;
const SPEAK_START_MS = 10;

class FakeSpeech implements RoundSpeech {
  spoken: (RoundSpeakOptions & { at: number })[] = [];
  cancels: number[] = [];
  private speaking = false;
  constructor(private readonly clock: Clock) {}
  state() {
    return { speaking: this.speaking, pending: false };
  }
  cancel() {
    this.cancels.push(this.clock.t);
  }
  speak(options: RoundSpeakOptions, handlers: RoundSpeakHandlers) {
    this.spoken.push({ ...options, at: this.clock.t });
    this.clock.later(() => {
      this.speaking = true;
      handlers.start("기본");
    }, SPEAK_START_MS);
    this.clock.later(
      () => {
        this.speaking = false;
        handlers.end();
      },
      options.volume === 0 ? UNLOCK_MS : LINE_MS,
    );
  }
}

const dead: RecScript = { as: 35 };
const alive: RecScript = { as: 300 };
const apple: RecScript = {
  as: 380,
  results: [{ at: 1_200, text: "apple", final: true }],
};
const deaf: RecScript = { as: 35 };

function harness(
  scripts: RecScript[] | ((n: number) => RecScript),
  plan: readonly RoundPlanStep[] = roundPlanOf(),
) {
  const clock = new Clock();
  const speech = new FakeSpeech(clock);
  const recs: FakeRec[] = [];
  const views: { at: number; view: RoundView | null }[] = [];
  const records: ProbeRecord[] = [];
  const done: { stopped: boolean; survived: { n: number; m: number } }[] = [];
  let nth = 0;
  let lastEnd: {
    at: number | null;
    reason: ProbeRecord["stopReason"];
    method: ProbeRecord["stopMethod"];
  } = { at: null, reason: null, method: null };
  let spoke = false;
  const runner = new WRoundRunner(
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
        const rec = new FakeRec(clock, script);
        recs.push(rec);
        return rec;
      },
      speech: () => speech,
      visibility: () => "visible",
      isoNow: () => "2026-11-07T00:00:00.000Z",
    },
    {
      view: (view) => views.push({ at: clock.t, view }),
      finish: (record, at) => {
        records.push(record);
        lastEnd = { at, reason: record.stopReason, method: record.stopMethod };
        spoke = false;
      },
      done: (result) => done.push(result),
    },
    plan,
    "run1",
  );
  return { clock, speech, recs, views, records, done, runner };
}

const planAt = (step: number): RoundPlanStep[] => {
  const found = roundPlanOf()[step];
  if (found === undefined) throw new Error(`차례 ${step} 없음`);
  return [found];
};

/** 차례 0 · 8 의 시작: 무음 읽기 끝(50ms) 뒤 45초. */
const REST_START = UNLOCK_MS + ROUND_PAUSE_MS;
const TEN_MIN = 600_000;

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

describe("마이크 점검 쪽 자동 W 라운드", () => {
  it("자동 차례는 0~8 아홉이고 버림 길이 · 읽기 · 살아 있는 버림의 길 · 진짜 꼴 · 쉼이 브리프 표와 같다", () => {
    const plan = roundPlanOf();
    expect(plan.map((s) => s.step)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(plan.map((s) => s.decoyMs / 1000)).toEqual([
      10, 10, 5, 3, 10, 10, 10, 10, 10,
    ]);
    expect(plan.map((s) => s.speak)).toEqual([
      true,
      true,
      true,
      true,
      false,
      true,
      false,
      true,
      true,
    ]);
    expect(plan.map((s) => s.live)).toEqual([
      "na",
      "na",
      "na",
      "na",
      "na",
      "na",
      "na",
      "na",
      "ga",
    ]);
    expect(plan.map((s) => s.real)).toEqual([
      "plain",
      "plain",
      "plain",
      "plain",
      "plain",
      "plain",
      "plain",
      "s",
      "plain",
    ]);
    // 차례 0 · 8 앞은 45초 쉼(화면 '준비 중'), 그 밖은 2초
    expect(plan.map((s) => s.waitMs)).toEqual([
      45_000, 2_000, 2_000, 2_000, 2_000, 2_000, 2_000, 2_000, 45_000,
    ]);
    expect(plan.filter((s) => s.rest).map((s) => s.step)).toEqual([0, 8]);
    expect(plan.filter((s) => s.resetStep === "pause-45").length).toBe(2);
  });

  it("살아 있는 버림의 길: 죽은 버림은 진짜, 살아 있는 첫 버림은 (나)면 두 번째 버림 · (가)면 세션 없이 읽기, 두 번째도 살아 있으면 세션 없이 읽기", () => {
    expect(roundNextOf("na", 0, false)).toBe("real");
    expect(roundNextOf("na", 0, true)).toBe("decoy");
    expect(roundNextOf("na", 1, false)).toBe("real");
    expect(roundNextOf("na", 1, true)).toBe("bare");
    expect(roundNextOf("ga", 0, true)).toBe("bare");
    expect(roundNextOf("ga", 0, false)).toBe("real");
    expect(roundPathOf("na", [])).toBe("dead");
    expect(roundPathOf("na", [false])).toBe("dead");
    expect(roundPathOf("na", [true])).toBe("na");
    expect(roundPathOf("na", [true, false])).toBe("na");
    expect(roundPathOf("na", [true, true])).toBe("na-ga");
    expect(roundPathOf("ga", [true])).toBe("ga");
    expect(roundPathOf("ga", [false])).toBe("dead");
  });

  it("누름 안에서 무음 읽기를 하고 끝 알림 뒤 45초 쉰 다음, 차례 0 의 첫 버림이 죽어 있으면 W10(2초 때 읽기 · 10초 stop · 1초 뒤 진짜)으로 이어 가고 진짜 start 때만 'apple' 을 보인다", () => {
    const h = harness([dead, apple], planAt(0));
    h.runner.start();
    // 누름 안(시계가 가기 전)에 무음 읽기를 부른다
    expect(h.speech.spoken[0]).toMatchObject({
      text: UNLOCK_TEXT,
      volume: 0,
      at: 0,
    });
    expect(h.recs).toHaveLength(0);
    h.clock.advance(UNLOCK_MS);
    expect(h.views.at(-1)?.view).toEqual({
      kind: "rest",
      until: REST_START,
    });
    h.clock.advance(ROUND_PAUSE_MS - 1);
    expect(h.recs).toHaveLength(0);
    h.clock.advance(TEN_MIN);
    const [record] = h.records;
    if (record === undefined) throw new Error("기록 없음");
    expect(record.strategy).toBe("WR");
    expect(record.resetStep).toBe("pause-45");
    expect(record.unlockBefore).toMatchObject({ started: true, ended: true });
    expect(record.ttsBetween).toBe(true);
    expect(record.round?.path).toBe("dead");
    expect(record.round?.slots).toEqual([
      { role: "decoy", plannedMs: 10_000, speak: true },
      { role: "real", plannedMs: null, speak: false },
    ]);
    const decoyStart = record.attempts[0]?.startCallAt ?? -1;
    const realStart = record.attempts[1]?.startCallAt ?? -1;
    expect(decoyStart).toBe(REST_START);
    const decoyEnd = record.events.find(
      (e) => e.type === "end" && e.attempt === 0,
    );
    expect(realStart - (decoyEnd?.at ?? 0)).toBe(DECOY_GAP_MS);
    // 버림 안 읽기는 버림 2초 때 선생님 꼴 한 문장(선생님 높이 · 목소리 순서)
    expect(h.speech.spoken[1]).toMatchObject({
      text: W_ROUND_SENTENCE,
      pitch: 1.1,
      prefer: ["Samantha"],
      at: decoyStart + DECOY_SPEAK_AT_MS,
    });
    // 'apple' 은 진짜 start 를 부를 때 한 번만, 그 밖에는 '기다려요' · '준비 중'
    const says = h.views.filter((v) => v.view?.kind === "say");
    expect(says).toEqual([
      { at: realStart, view: { kind: "say", word: "apple" } },
    ]);
    expect(
      h.views
        .filter((v) => v.at < realStart)
        .every((v) => v.view?.kind === "wait" || v.view?.kind === "rest"),
    ).toBe(true);
    const row = roundRowOf(record);
    expect(row?.decoys).toEqual([
      {
        plannedMs: 10_000,
        speak: true,
        as: 35,
        alive: false,
        actualMs: 10_000 + STOP_END_MS,
        speakStart: DECOY_SPEAK_AT_MS + SPEAK_START_MS,
        speakEnd: DECOY_SPEAK_AT_MS + LINE_MS,
      },
    ]);
    expect(row?.session).toMatchObject({
      as: 380,
      apple: true,
      banana: null,
      finalLength: 5,
      heardLength: 5,
    });
    // 결과 뒤 1.5초 조용하면 stop
    expect(record.stopReason).toBe("silence");
    const stop = record.events.find(
      (e) => e.type === "stop-call" && e.attempt === 1,
    );
    expect((stop?.at ?? 0) - realStart).toBe(1_200 + ROUND_SILENCE_MS);
    expect(h.done).toEqual([
      expect.objectContaining({ stopped: false, survived: { n: 1, m: 1 } }),
    ]);
    expect(h.views.at(-1)?.view).toEqual({ kind: "done", n: 1, m: 1 });
  });

  it("차례 0 의 첫 버림이 살아 있으면(as > 250) abort 하고 (나) 두 번째 버림 10초 · 읽기 켬 → 진짜, 두 번째도 살아 있으면 abort 뒤 세션 없이 읽기 → 진짜로 가며 탄 길을 남긴다", () => {
    const na = harness([alive, dead, apple], planAt(0));
    na.runner.start();
    na.clock.advance(TEN_MIN);
    const naRecord = na.records[0];
    expect(naRecord?.round?.path).toBe("na");
    expect(naRecord?.round?.slots.map((s) => s.role)).toEqual([
      "decoy",
      "decoy",
      "real",
    ]);
    expect(na.recs[0]?.calls).toEqual(["start", "abort"]);
    expect(na.recs[1]?.calls).toEqual(["start", "stop"]);
    const naRow = naRecord === undefined ? null : roundRowOf(naRecord);
    expect(naRow?.decoys.map((d) => [d.alive, d.as, d.plannedMs])).toEqual([
      [true, 300, 10_000],
      [false, 35, 10_000],
    ]);
    // 살아 있는 버림은 2초 전에 abort 해서 그 안 읽기가 없다
    expect(naRow?.decoys[0]?.speakStart).toBeNull();
    expect(naRow?.decoys[1]?.speakStart).toBe(
      DECOY_SPEAK_AT_MS + SPEAK_START_MS,
    );
    expect(naRow?.bare).toBeNull();
    expect(naRow?.session?.apple).toBe(true);

    const naGa = harness([alive, alive, apple], planAt(0));
    naGa.runner.start();
    naGa.clock.advance(TEN_MIN);
    const naGaRecord = naGa.records[0];
    expect(naGaRecord?.round?.path).toBe("na-ga");
    expect(naGaRecord?.round?.slots.map((s) => s.role)).toEqual([
      "decoy",
      "decoy",
      "real",
    ]);
    expect(naGa.recs.map((r) => r.calls)).toEqual([
      ["start", "abort"],
      ["start", "abort"],
      ["start", "stop"],
    ]);
    const naGaRow = naGaRecord === undefined ? null : roundRowOf(naGaRecord);
    expect(naGaRow?.bare).toEqual({
      started: true,
      ended: true,
      endToRealMs: DECOY_GAP_MS,
    });
    expect(naGaRow?.session?.apple).toBe(true);
  });

  it("차례 8 은 45초 쉰 뒤 첫 버림이 살아 있으면 abort 하고 (가) 세션 없이 읽기 → 진짜, 죽어 있으면 W10 으로 이어 간다", () => {
    const ga = harness([alive, apple], planAt(8));
    ga.runner.start();
    ga.clock.advance(UNLOCK_MS);
    expect(ga.views.at(-1)?.view?.kind).toBe("rest");
    ga.clock.advance(TEN_MIN);
    const gaRecord = ga.records[0];
    expect(gaRecord?.autoStep).toBe(0);
    expect(gaRecord?.round?.step).toBe(8);
    expect(gaRecord?.round?.path).toBe("ga");
    expect(gaRecord?.round?.slots.map((s) => s.role)).toEqual([
      "decoy",
      "real",
    ]);
    const bare = gaRecord?.events.filter(
      (e) => e.type === "speak-call" && e.utterance === "bare",
    );
    expect(bare).toHaveLength(1);
    const gaRow = gaRecord === undefined ? null : roundRowOf(gaRecord);
    expect(gaRow?.bare?.ended).toBe(true);
    expect(gaRow?.session?.apple).toBe(true);

    const w10 = harness([dead, apple], planAt(8));
    w10.runner.start();
    w10.clock.advance(TEN_MIN);
    expect(w10.records[0]?.round?.path).toBe("dead");
    expect(w10.recs.map((r) => r.calls)).toEqual([
      ["start", "stop"],
      ["start", "stop"],
    ]);
  });

  it("차례 7 의 진짜는 S 꼴: 첫 final 로 멈추지 않고 2초 뒤 줄을 비우고(speak-cancel) speak-call 표지와 한 문장을 읽은 뒤 '이제 banana' 를 보이고, banana final 이면 stop · 없으면 6초 뒤 stop 한다", () => {
    const bananaFinal: RecScript = {
      as: 380,
      results: [
        { at: 1_500, text: "apple", final: true },
        { at: 6_000, text: " banana", final: true },
      ],
    };
    const h = harness([dead, bananaFinal], planAt(7));
    h.runner.start();
    h.clock.advance(TEN_MIN);
    const record = h.records[0];
    if (record === undefined) throw new Error("기록 없음");
    const realStart = record.attempts[1]?.startCallAt ?? -1;
    const rel = (at: number | undefined) => (at ?? -1) - realStart;
    const cancel = record.events.find(
      (e) => e.type === "speak-cancel" && e.attempt === 1,
    );
    const call = record.events.find(
      (e) => e.type === "speak-call" && e.attempt === 1,
    );
    expect(cancel?.code).toBe("queue-clear");
    expect(rel(cancel?.at)).toBe(1_500 + 2_000);
    expect(h.speech.cancels).toContain(realStart + 3_500);
    expect(call?.utterance).toBe("line");
    const order = record.events
      .filter((e) => e.attempt === 1)
      .map((e) => e.type);
    expect(order.indexOf("speak-call")).toBeGreaterThan(
      order.indexOf("speak-cancel"),
    );
    const banana = record.events.find(
      (e) => e.type === "prompt" && e.code === "banana",
    );
    expect(rel(banana?.at)).toBe(3_500 + LINE_MS);
    expect(record.stopReason).toBe("final");
    expect(h.recs[1]?.calls).toEqual(["start", "stop"]);
    // 화면: 진짜 start 때 'apple' → 첫 final 뒤 '기다려요' → 읽기 끝 뒤 'banana'
    const realViews = h.views
      .filter((v) => v.at >= realStart && v.view?.kind !== "done")
      .map((v) => (v.view?.kind === "say" ? v.view.word : v.view?.kind));
    expect(realViews).toEqual(["apple", "wait", "banana"]);
    const row = roundRowOf(record);
    expect(row?.session).toMatchObject({
      apple: true,
      banana: true,
      speakStart: 3_500 + SPEAK_START_MS,
      speakEnd: 3_500 + LINE_MS,
      bananaAt: 3_500 + LINE_MS,
    });
    expect(h.done[0]?.survived).toEqual({ n: 2, m: 2 });

    // banana 가 없으면 'banana' 를 보인 뒤 6초에 stop(no-result) — 살아남 1/2
    const noBanana = harness(
      [dead, { as: 380, results: [{ at: 1_500, text: "apple", final: true }] }],
      planAt(7),
    );
    noBanana.runner.start();
    noBanana.clock.advance(TEN_MIN);
    const nb = noBanana.records[0];
    if (nb === undefined) throw new Error("기록 없음");
    const nbStart = nb.attempts[1]?.startCallAt ?? -1;
    const nbStop = nb.events.find(
      (e) => e.type === "stop-call" && e.attempt === 1,
    );
    expect((nbStop?.at ?? 0) - nbStart).toBe(5_000 + NO_RESULT_STOP_MS);
    expect(nb.stopReason).toBe("no-result");
    expect(roundRowOf(nb)?.session?.banana).toBe(false);
    expect(noBanana.done[0]?.survived).toEqual({ n: 1, m: 2 });

    // 진짜가 아무것도 못 들으면 'banana' 없이 6초에 stop — 살아남 0/2
    const none = harness([dead, deaf], planAt(7));
    none.runner.start();
    none.clock.advance(TEN_MIN);
    expect(none.records[0]?.stopReason).toBe("no-result");
    expect(none.records[0]?.events.some((e) => e.code === "banana")).toBe(
      false,
    );
    expect(none.done[0]?.survived).toEqual({ n: 0, m: 2 });
  });

  it("라운드 한 번은 차례 0~8 을 4분 안에 돌고 끝에 '진짜 살아남 n/m'(차례 7 은 apple · banana 둘 다)을 화면 · 로그 · 복사 글에 남기며, 기록은 저장 꼴로 다시 읽힌다", () => {
    // 버림은 모두 죽은 꼴, 진짜는 apple(차례 7 은 banana 도). 차례 4 의 진짜만 못 듣는다
    const script = (n: number): RecScript => {
      if (n % 2 === 0) return dead;
      const step = (n - 1) / 2;
      if (step === 4) return deaf;
      if (step === 7) {
        return {
          as: 380,
          results: [
            { at: 1_500, text: "apple", final: true },
            { at: 6_000, text: " banana", final: true },
          ],
        };
      }
      return apple;
    };
    const h = harness(script);
    h.runner.start();
    h.clock.advance(TEN_MIN);
    expect(h.records.map((r) => r.autoStep)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(h.records.every((r) => r.round?.path === "dead")).toBe(true);
    expect(h.done).toEqual([
      expect.objectContaining({ stopped: false, survived: { n: 9, m: 10 } }),
    ]);
    const doneAt = h.views.at(-1)?.at ?? Number.POSITIVE_INFINITY;
    expect(doneAt).toBeLessThan(4 * 60_000);
    expect(h.views.at(-1)?.view).toEqual({ kind: "done", n: 9, m: 10 });
    expect(roundSurvivalOf(h.records, "run1")).toEqual({ n: 9, m: 10 });
    expect(roundSurvivalOf(h.records, "other")).toEqual({ n: 0, m: 0 });
    // 'apple' 은 차례마다 진짜 start 때만
    const realStarts = h.records.map((r) => r.attempts[1]?.startCallAt);
    expect(
      h.views
        .filter((v) => v.view?.kind === "say" && v.view.word === "apple")
        .map((v) => v.at),
    ).toEqual(realStarts);
    // 차례 사이 2초 · 차례 8 앞 45초
    const gapTo = (i: number) => {
      const prevEnd = h.records[i - 1]?.events.findLast(
        (e) => e.type === "end",
      );
      return (h.records[i]?.attempts[0]?.startCallAt ?? 0) - (prevEnd?.at ?? 0);
    };
    expect(gapTo(1)).toBe(2_000);
    expect(gapTo(8)).toBe(ROUND_PAUSE_MS);
    // 앞 차례 끝이 다음 기록의 '앞 끝 뒤' · '앞 멈춤'으로 이어진다
    expect(h.records[1]?.sincePrevEndMs).toBe(2_000);
    expect(h.records[1]?.prevStopReason).toBe("silence");

    const log = JSON.parse(roundLogOf(h.records, ENV, "run1", 0, false)) as {
      kind: string;
      line: string;
      survived: { n: number; m: number };
      steps: unknown[];
    };
    expect(log.kind).toBe("round");
    expect(log.line).toBe("진짜 살아남 9/10");
    expect(log.steps).toHaveLength(9);
    expect(JSON.stringify(log)).not.toContain("banana");
    const recordLog = recordLogOf(h.records[0] as ProbeRecord, ENV);
    expect(recordLog).toContain('"round":{"step":0,"path":"dead"');
    expect(recordLog).not.toContain('"finalText"');
    expect(copyTextOf(h.records, ENV)).toContain(
      "- W 라운드 run1: 진짜 살아남 9/10",
    );
    expect(rowCells(rowOf(h.records[0] as ProbeRecord)).at(-1)).toBe(
      "0·dead / 10s·읽기·35·아니요·10030·2010~3500 → 진짜 380·-·apple 예",
    );
    expect(rowCells(rowOf(h.records[7] as ProbeRecord)).at(-1)).toContain(
      "apple 예·banana 예",
    );
    const withIds = h.records.map((r, i) => ({ ...r, id: i + 1 }));
    expect(parseStored(JSON.stringify(withIds))).toEqual(withIds);
  });

  it("'멈추기'를 누르면 도는 차례를 abort 로 끝내 기록하고(멈춤 user) 라운드를 끝낸다", () => {
    const h = harness([dead, apple]);
    h.runner.start();
    h.clock.advance(REST_START + 3_000);
    h.runner.stop();
    h.clock.advance(TEN_MIN);
    expect(h.records).toHaveLength(1);
    expect(h.records[0]?.stopReason).toBe("user");
    expect(h.records[0]?.stopMethod).toBe("abort");
    expect(h.recs).toHaveLength(1);
    expect(h.recs[0]?.calls).toEqual(["start", "abort"]);
    expect(h.done).toEqual([
      expect.objectContaining({ stopped: true, survived: { n: 0, m: 1 } }),
    ]);
    expect(h.views.at(-1)?.view).toBeNull();
  });

  it("안내 글 상수: 요청자 안내 글은 브리프 그대로이고, 화면 글은 '지금 apple 이라고 말해요' · '이제 banana 라고 말해요' · '기다려요' · '준비 중 · 남은 초' · '끝났어요 · 진짜 살아남 n/m' 이다", () => {
    expect(MIC_TEXT.roundStart).toBe("자동 W 라운드");
    expect(MIC_TEXT.roundGuide).toBe(
      "'자동 W 라운드' 단추를 한 번 누르고, iPad 를 앞에 둔 채 기다려요. 화면에 큰 글씨로 '지금 apple 이라고 말해요'가 나올 때만 'apple' 이라고 말해요. 마지막에 '이제 banana 라고 말해요'가 한 번 나와요. 그 밖에는 말하지 않고, 선생님 목소리가 나와도 따라 하지 않아요. 화면에 '끝났어요'가 나오면 끝이에요.",
    );
    expect(MIC_TEXT.roundSay).toBe("지금 apple 이라고 말해요");
    expect(MIC_TEXT.roundSayNext).toBe("이제 banana 라고 말해요");
    expect(MIC_TEXT.roundWait).toBe("기다려요");
    expect(MIC_TEXT.roundRest(12)).toBe("준비 중 · 남은 12초");
    expect(MIC_TEXT.roundDone(9, 10)).toBe("끝났어요 · 진짜 살아남 9/10");
    // 손 W 단추의 상태 글도 '10초 뒤 말하세요' 류 없이 같은 말
    expect(MIC_TEXT.decoyRunning).toBe("기다려요");
    expect(MIC_TEXT.decoyReal).toBe("지금 apple 이라고 말해요");
  });
});

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { BANDS, bandOf } from "@/core/level-band";
import {
  type CancelReason,
  classifyRecognitionError,
  type EndRule,
  endRuleFor,
  type ListenEffect,
  type ListenInput,
  type ListenOutcome,
  type ListenStep,
  SPEECH_SETTING_KEYS,
  type SpeechSettings,
  speechSettingsFrom,
  startListen,
  stepListen,
} from "@/core/speech/listen";
import {
  DEFAULT_ON_ABORT,
  DEFAULT_ON_STOP,
  parseSpeechScript,
  type RecognitionRun,
  type ScriptEvent,
  type SpeechScript,
  speechScriptSchema,
} from "@/core/speech/script";

// 시험의 시각(ms)은 장면을 적은 자료다. 설계 숫자(듣기 길이 · 조용함 · 감시 시간)는 모두 시험용 설정에서 읽는다.
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const FIXTURES = join(ROOT, "tests", "fixtures", "speech");
const SCRIPTS_DIR = join(FIXTURES, "scripts");
const RECORDED_DIR = join(FIXTURES, "recorded");
// 경로의 한글은 NFC 로 둔다(git 이 NFC 로 저장한다, plan-p01b 위험 5).
const SETTINGS_SPEC = join(ROOT, "specs", "09-설정값.md".normalize("NFC"));

const SETTINGS_FIXTURE = JSON.parse(
  readFileSync(join(FIXTURES, "settings.json"), "utf8"),
) as Record<string, unknown>;
const readFixture = (key: string): unknown => SETTINGS_FIXTURE[key];
const SETTINGS = speechSettingsFrom(readFixture);
/** 감시 타이머가 기다리는 시간. */
const WATCHDOG_MS = SETTINGS.maxListenMs + SETTINGS.watchdogExtraMs;

function loadScript(name: string): SpeechScript {
  return parseSpeechScript(
    JSON.parse(readFileSync(join(SCRIPTS_DIR, `${name}.json`), "utf8")),
  );
}

// ── 대본을 시각 순서로 stepListen 에 넣는 흉내(plan-p02 작업 순서 P2a 4) ──
// start() 마다 recognitions 의 다음 실행을 쓰고(모자라면 마지막 것을 되풀이), 이벤트의 at 은
// start() · stop() · abort() 를 부른 뒤의 ms 다. hang 이면 아무 일도 내지 않는다(plan-p02 값 4).

type Logged = { at: number; effect: ListenEffect };
type Simulation = { outcome: ListenOutcome; doneAt: number; log: Logged[] };
type Queued = {
  at: number;
  seq: number;
  recognizer: number;
  event: ScriptEvent | "start-failed";
};
type RunCursor = { next: number };

function scriptInput(item: Queued): ListenInput | undefined {
  const { at: now, recognizer, event } = item;
  if (event === "start-failed") {
    return { type: "start-failed", now, recognizer };
  }
  switch (event.type) {
    case "result":
      return {
        type: "result",
        now,
        recognizer,
        text: event.results.map((r) => r.transcript).join(" "),
      };
    case "error":
      return { type: "error", now, recognizer, code: event.error };
    case "end":
      return { type: "end", now, recognizer };
    default:
      return undefined;
  }
}

function simulate(
  script: SpeechScript,
  rule: EndRule,
  options: {
    settings?: SpeechSettings;
    buttonAt?: number;
    cursor?: RunCursor;
  } = {},
): Simulation {
  const settings = options.settings ?? SETTINGS;
  const cursor = options.cursor ?? { next: 0 };
  const queue: Queued[] = [];
  const runs = new Map<number, RecognitionRun>();
  const log: Logged[] = [];
  let seq = 0;
  let pendingButton = options.buttonAt;
  let done: { outcome: ListenOutcome; at: number } | undefined;

  const schedule = (
    recognizer: number,
    events: readonly ScriptEvent[],
    base: number,
  ) => {
    for (const event of events) {
      queue.push({ at: base + event.at, seq: seq++, recognizer, event });
    }
  };
  const drop = (recognizer: number) => {
    for (let i = queue.length - 1; i >= 0; i -= 1) {
      if (queue[i]?.recognizer === recognizer) queue.splice(i, 1);
    }
  };

  let step: ListenStep = startListen(rule, settings, 0);
  const apply = (next: ListenStep, now: number) => {
    step = next;
    for (const effect of next.effects) {
      log.push({ at: now, effect });
      if (effect.type === "done") {
        done = { outcome: effect.outcome, at: now };
        continue;
      }
      const id = effect.recognizer;
      if (effect.type === "start-recognizer") {
        const last = script.recognitions.length - 1;
        const run = script.recognitions[Math.min(cursor.next, last)];
        cursor.next += 1;
        if (run === undefined) throw new Error("대본에 인식 실행이 없다");
        runs.set(id, run);
        if (run.startThrows) {
          queue.push({
            at: now,
            seq: seq++,
            recognizer: id,
            event: "start-failed",
          });
        } else if (!run.hang) {
          schedule(id, run.events, now);
        }
        continue;
      }
      const run = runs.get(id);
      drop(id);
      if (run === undefined || run.hang) continue;
      schedule(
        id,
        effect.type === "stop-recognizer"
          ? (run.onStop ?? DEFAULT_ON_STOP)
          : (run.onAbort ?? DEFAULT_ON_ABORT),
        now,
      );
    }
  };
  apply(step, 0);

  for (let guard = 0; done === undefined; guard += 1) {
    if (guard > 10_000) throw new Error("흉내가 끝나지 않는다");
    queue.sort((a, b) => a.at - b.at || a.seq - b.seq);
    const head = queue[0];
    const times = [head?.at, pendingButton, step.wakeAt].filter(
      (t): t is number => t !== undefined,
    );
    if (times.length === 0) throw new Error("더 올 일이 없는데 끝나지 않았다");
    const now = Math.min(...times);
    if (head !== undefined && head.at === now) {
      queue.shift();
      const input = scriptInput(head);
      if (input !== undefined) apply(stepListen(step.state, input), now);
    } else if (pendingButton === now) {
      pendingButton = undefined;
      apply(stepListen(step.state, { type: "button", now }), now);
    } else {
      apply(stepListen(step.state, { type: "timer", now }), now);
    }
  }
  return { outcome: done.outcome, doneAt: done.at, log };
}

function effectsOf(sim: Simulation, type: ListenEffect["type"]): Logged[] {
  return sim.log.filter((entry) => entry.effect.type === type);
}

/** 대본 한 실행의 결과 이벤트 시각들. */
function resultTimes(run: RecognitionRun | undefined): number[] {
  return (run?.events ?? [])
    .filter((event) => event.type === "result")
    .map((event) => event.at);
}

/** 말이 이어지는 실행: interval 마다 결과가 하나씩 늘어난다. */
function talkingRun(interval: number, until: number): RecognitionRun {
  const events: ScriptEvent[] = [];
  for (let at = interval, n = 1; at <= until; at += interval, n += 1) {
    events.push({
      at,
      type: "result",
      results: [{ transcript: Array(n).fill("yes").join(" "), isFinal: false }],
    });
  }
  return { events, onStop: [{ at: 100, type: "end" }] };
}

function inlineScript(name: string, recognitions: RecognitionRun[]) {
  return parseSpeechScript({
    name,
    source: "손으로 씀 — 시험 안 장면",
    recognitions,
  });
}

/** observed 마다 그 규칙 · 설정 · 버튼 시각으로 다시 돌린다. start() 차례는 observed 를 건너 이어진다. */
function replayObserved(script: SpeechScript) {
  const cursor: RunCursor = { next: 0 };
  return (script.observed ?? []).map((observed) => ({
    label: observed.label,
    expected: observed.outcome,
    actual: simulate(script, observed.rule, {
      settings: observed.settings,
      buttonAt: observed.buttonAt,
      cursor,
    }).outcome,
  }));
}

const oneSentence = (level: number) =>
  endRuleFor({ area: "speaking", level, answer: "one-sentence" }, SETTINGS);
const multiSentence = (level: number) =>
  endRuleFor({ area: "speaking", level, answer: "multi-sentence" }, SETTINGS);

describe("듣기 끝(7절)", () => {
  it("AC-5e 말하기 1단계 한 문장 답은 마지막 중간 결과 뒤 speech.end_silence_seconds.1-3 만큼 조용하면 stop 을 부르고 끝난다", () => {
    const script = loadScript("one-sentence-ok");
    const lastResultAt = Math.max(...resultTimes(script.recognitions[0]));
    const sim = simulate(script, oneSentence(1));

    expect(effectsOf(sim, "stop-recognizer")).toEqual([
      {
        at: lastResultAt + SETTINGS.endSilenceMs["1-3"],
        effect: { type: "stop-recognizer", recognizer: 1 },
      },
    ]);
    expect(effectsOf(sim, "abort-recognizer")).toEqual([]);
    expect(sim.outcome).toEqual({
      kind: "result",
      text: "I like apples",
      pieces: ["I like apples"],
      endedBy: "silence",
      restarts: 0,
      watchdogRestarts: 0,
    });
  });

  it("AC-5e 말하기 4단계 한 문장 답은 speech.end_silence_seconds.4-6 만큼 조용하면 끝난다", () => {
    const script = loadScript("one-sentence-ok");
    const lastResultAt = Math.max(...resultTimes(script.recognitions[0]));
    const sim = simulate(script, oneSentence(4));

    expect(effectsOf(sim, "stop-recognizer").map((e) => e.at)).toEqual([
      lastResultAt + SETTINGS.endSilenceMs["4-6"],
    ]);
    expect(sim.outcome).toMatchObject({
      kind: "result",
      text: "I like apples",
      endedBy: "silence",
    });
  });

  it("AC-5e 말하기 6단계 그림 보고 말하기(두 문장 이상)는 2초 쉼 두 번에도 끝나지 않고 말하기 버튼('다 말했어요')을 누를 때 끝난다", () => {
    const script = loadScript("multi-sentence-pauses");
    const times = resultTimes(script.recognitions[0]);
    const gaps = times.slice(1).map((t, i) => t - (times[i] ?? 0));
    // 대본의 쉼은 한 문장 답이었다면 듣기를 끝냈을 길이다(장면이 뜻이 있는지 확인).
    const longPauses = gaps.filter((gap) => gap > SETTINGS.endSilenceMs["4-6"]);
    expect(longPauses).toHaveLength(2);

    const rule = multiSentence(6);
    expect(rule.endSilenceMs).toBeUndefined();
    const buttonAt = Math.max(...times) + 1600;
    expect(buttonAt).toBeLessThan(rule.chunkMs);
    const sim = simulate(script, rule, { buttonAt });

    expect(effectsOf(sim, "stop-recognizer")).toEqual([
      { at: buttonAt, effect: { type: "stop-recognizer", recognizer: 1 } },
    ]);
    expect(sim.outcome).toEqual({
      kind: "result",
      text: "I see a big park there is a dog the dog is running",
      pieces: ["I see a big park there is a dog the dog is running"],
      endedBy: "button",
      restarts: 0,
      watchdogRestarts: 0,
    });
  });

  it("AC-5e 브라우저가 첫 쉼에서 인식을 끝내면 새 인식 객체로 다시 시작해 두 조각을 이어 붙인다", () => {
    const script = loadScript("first-pause-end");
    const firstEnd = script.recognitions[0]?.events.find(
      (event) => event.type === "end",
    );
    if (firstEnd === undefined) throw new Error("대본에 끝 이벤트가 없다");
    const buttonAt = firstEnd.at + 3000;
    const sim = simulate(script, multiSentence(6), { buttonAt });

    expect(effectsOf(sim, "start-recognizer")).toEqual([
      { at: 0, effect: { type: "start-recognizer", recognizer: 1 } },
      { at: firstEnd.at, effect: { type: "start-recognizer", recognizer: 2 } },
    ]);
    expect(sim.outcome).toEqual({
      kind: "result",
      text: "I see a big park there is a dog",
      pieces: ["I see a big park", "there is a dog"],
      endedBy: "button",
      restarts: 1,
      watchdogRestarts: 0,
    });

    // 한 문장 답에서도 다시 시작해 이어 붙이고, 조용함으로 끝난다.
    const one = simulate(script, oneSentence(1));
    expect(one.outcome).toMatchObject({
      kind: "result",
      pieces: ["I see a big park", "there is a dog"],
      endedBy: "silence",
      restarts: 1,
    });
  });

  it("듣기 끝: 한 문장 답은 speech.max_listen_seconds 에서 끝나고 두 문장 이상 답은 그만큼마다 끊어 듣고 이어 붙인다", () => {
    const interval = 1000;
    // 결과 사이가 조용함 기준보다 짧아야 조용함으로 끝나지 않는다.
    expect(interval).toBeLessThan(SETTINGS.endSilenceMs["4-6"]);
    const script = inlineScript("talking", [
      talkingRun(interval, SETTINGS.maxListenMs * 2),
    ]);

    const one = simulate(script, oneSentence(4));
    expect(effectsOf(one, "stop-recognizer").map((e) => e.at)).toEqual([
      SETTINGS.maxListenMs,
    ]);
    expect(effectsOf(one, "start-recognizer")).toHaveLength(1);
    expect(one.outcome).toMatchObject({ kind: "result", endedBy: "cap" });

    const buttonAt = SETTINGS.maxListenMs + SETTINGS.maxListenMs / 2;
    const multi = simulate(script, multiSentence(9), { buttonAt });
    expect(effectsOf(multi, "stop-recognizer")).toEqual([
      {
        at: SETTINGS.maxListenMs,
        effect: { type: "stop-recognizer", recognizer: 1 },
      },
      { at: buttonAt, effect: { type: "stop-recognizer", recognizer: 2 } },
    ]);
    expect(effectsOf(multi, "start-recognizer")).toHaveLength(2);
    expect(multi.outcome).toMatchObject({
      kind: "result",
      endedBy: "button",
      restarts: 1,
    });
    if (multi.outcome.kind !== "result") throw new Error("결과가 아니다");
    expect(multi.outcome.pieces).toHaveLength(2);
    expect(multi.outcome.text).toBe(multi.outcome.pieces.join(" "));
  });

  it("듣기 끝: 단계 구간(1-3 · 4-6 · 7-9 · 10-12)과 답 꼴로 듣기 끝 규칙을 고른다", () => {
    expect([1, 3, 4, 6, 7, 9, 10, 12].map(bandOf)).toEqual([
      "1-3",
      "1-3",
      "4-6",
      "4-6",
      "7-9",
      "7-9",
      "10-12",
      "10-12",
    ]);
    for (const bad of [0, 13, 2.5, Number.NaN]) {
      expect(() => bandOf(bad)).toThrow();
    }
    for (const band of BANDS) {
      const level = Number(band.split("-")[0]);
      expect(
        endRuleFor(
          { area: "placement", level, answer: "one-sentence" },
          SETTINGS,
        ),
      ).toEqual({
        endSilenceMs: SETTINGS.endSilenceMs[band],
        capMs: SETTINGS.maxListenMs,
        chunkMs: SETTINGS.maxListenMs,
      });
    }
    expect(multiSentence(5)).toEqual({ chunkMs: SETTINGS.maxListenMs });
    // 활동 시간 상한(speaking.answer_max_seconds.<구간>)은 부르는 쪽이 준다(C53).
    const capSeconds = 45;
    expect(
      endRuleFor(
        { area: "speaking", level: 10, answer: "multi-sentence", capSeconds },
        SETTINGS,
      ),
    ).toEqual({ capMs: capSeconds * 1000, chunkMs: SETTINGS.maxListenMs });
  });

  it("듣기 끝: 앱이 끊은 객체와 옛 객체의 일은 버린다", () => {
    const rule = multiSentence(6);
    let step = startListen(rule, SETTINGS, 0);
    step = stepListen(step.state, { type: "timer", now: rule.chunkMs });
    expect(step.effects).toEqual([{ type: "stop-recognizer", recognizer: 1 }]);
    // 객체 1 이 아무 일도 내지 않아 감시 타이머가 끊고 새 객체를 연다.
    step = stepListen(step.state, { type: "timer", now: WATCHDOG_MS });
    expect(step.effects).toEqual([
      { type: "abort-recognizer", recognizer: 1 },
      { type: "start-recognizer", recognizer: 2 },
    ]);
    const afterRestart = step;
    // 앱이 끊은 객체 1 의 aborted · 끝 · 결과는 버린다(여섯 번 셈에 들지 않게).
    for (const late of [
      { type: "error", now: WATCHDOG_MS + 10, recognizer: 1, code: "aborted" },
      { type: "end", now: WATCHDOG_MS + 20, recognizer: 1 },
      { type: "result", now: WATCHDOG_MS + 30, recognizer: 1, text: "noise" },
    ] satisfies ListenInput[]) {
      step = stepListen(step.state, late);
      expect(step.effects).toEqual([]);
      expect(step.state).toEqual(afterRestart.state);
    }
    step = stepListen(step.state, {
      type: "result",
      now: WATCHDOG_MS + 500,
      recognizer: 2,
      text: "I like apples",
    });
    step = stepListen(step.state, { type: "button", now: WATCHDOG_MS + 900 });
    step = stepListen(step.state, {
      type: "end",
      now: WATCHDOG_MS + 1000,
      recognizer: 2,
    });
    expect(step.effects).toEqual([
      {
        type: "done",
        outcome: {
          kind: "result",
          text: "I like apples",
          pieces: ["I like apples"],
          endedBy: "button",
          restarts: 0,
          watchdogRestarts: 1,
        },
      },
    ]);
    expect(step.wakeAt).toBeUndefined();
    // 끝난 뒤의 일은 모두 버린다.
    const after = stepListen(step.state, {
      type: "result",
      now: WATCHDOG_MS + 1100,
      recognizer: 2,
      text: "more",
    });
    expect(after.effects).toEqual([]);
  });

  it("듣기 끝: 글 없이 끝나면 '결과 없음', 글 뒤 no-speech 는 한 문장 답이면 끝나고 두 문장 이상이면 다시 시작한다", () => {
    const silentEnd = inlineScript("silent-end", [
      {
        events: [
          { at: 50, type: "start" },
          { at: 3000, type: "end" },
        ],
      },
    ]);
    expect(simulate(silentEnd, oneSentence(1)).outcome).toEqual({
      kind: "no-result",
    });
    expect(simulate(silentEnd, multiSentence(6)).outcome).toEqual({
      kind: "no-result",
    });

    const resultAt = 600;
    const noSpeechAt = 2000;
    expect(noSpeechAt - resultAt).toBeLessThan(SETTINGS.endSilenceMs["1-3"]);
    const textThenNoSpeech = inlineScript("text-then-no-speech", [
      {
        events: [
          {
            at: resultAt,
            type: "result",
            results: [{ transcript: "I like apples", isFinal: true }],
          },
          { at: noSpeechAt, type: "error", error: "no-speech" },
          { at: noSpeechAt + 10, type: "end" },
        ],
      },
      {
        events: [
          {
            at: 500,
            type: "result",
            results: [{ transcript: "and bananas", isFinal: true }],
          },
        ],
        onStop: [{ at: 100, type: "end" }],
      },
    ]);
    const one = simulate(textThenNoSpeech, oneSentence(1));
    expect(one.outcome).toEqual({
      kind: "result",
      text: "I like apples",
      pieces: ["I like apples"],
      endedBy: "browser",
      restarts: 0,
      watchdogRestarts: 0,
    });
    expect(one.doneAt).toBe(noSpeechAt);

    const multi = simulate(textThenNoSpeech, multiSentence(6), {
      buttonAt: noSpeechAt + 2000,
    });
    expect(effectsOf(multi, "start-recognizer").map((e) => e.at)).toEqual([
      0,
      noSpeechAt,
    ]);
    // 옛 객체를 abort 한 뒤 새 객체를 연다(감시 다시 시작 길과 같은 차례).
    expect(
      multi.log.filter(
        (entry) =>
          entry.at === noSpeechAt &&
          (entry.effect.type === "abort-recognizer" ||
            entry.effect.type === "start-recognizer"),
      ),
    ).toEqual([
      {
        at: noSpeechAt,
        effect: { type: "abort-recognizer", recognizer: 1 },
      },
      {
        at: noSpeechAt,
        effect: { type: "start-recognizer", recognizer: 2 },
      },
    ]);
    expect(multi.outcome).toEqual({
      kind: "result",
      text: "I like apples and bananas",
      pieces: ["I like apples", "and bananas"],
      endedBy: "button",
      restarts: 1,
      watchdogRestarts: 0,
    });
  });

  it("듣기 끝: 말하기 버튼은 abort 가 아니라 stop 을 부른다", () => {
    for (const rule of [oneSentence(2), multiSentence(8)]) {
      let step = startListen(rule, SETTINGS, 0);
      step = stepListen(step.state, {
        type: "result",
        now: 500,
        recognizer: 1,
        text: "I like",
      });
      step = stepListen(step.state, { type: "button", now: 800 });
      expect(step.effects).toEqual([
        { type: "stop-recognizer", recognizer: 1 },
      ]);
      // 멈추는 중의 결과로 마지막 글을 확정한다.
      step = stepListen(step.state, {
        type: "result",
        now: 900,
        recognizer: 1,
        text: "I like apples",
      });
      expect(step.effects).toEqual([]);
      step = stepListen(step.state, { type: "end", now: 1000, recognizer: 1 });
      expect(step.effects).toEqual([
        {
          type: "done",
          outcome: {
            kind: "result",
            text: "I like apples",
            pieces: ["I like apples"],
            endedBy: "button",
            restarts: 0,
            watchdogRestarts: 0,
          },
        },
      ]);
    }
  });

  it("듣기 끝: cancel 은 abort 하고 '끊김'으로 끝난다", () => {
    const reasons: CancelReason[] = ["hidden", "speak", "leave"];
    for (const reason of reasons) {
      let step = startListen(oneSentence(1), SETTINGS, 0);
      step = stepListen(step.state, {
        type: "result",
        now: 500,
        recognizer: 1,
        text: "I like",
      });
      step = stepListen(step.state, { type: "cancel", now: 700, reason });
      expect(step.effects).toEqual([
        { type: "abort-recognizer", recognizer: 1 },
        {
          type: "done",
          outcome: { kind: "interrupted", reason, partialText: "I like" },
        },
      ]);
      // 앱이 끊은 객체의 aborted 는 버린다.
      const late = stepListen(step.state, {
        type: "error",
        now: 710,
        recognizer: 1,
        code: "aborted",
      });
      expect(late.effects).toEqual([]);
    }

    // 멈추는 중(stop 뒤)에도 같다.
    let step = startListen(multiSentence(6), SETTINGS, 0);
    step = stepListen(step.state, { type: "button", now: 300 });
    step = stepListen(step.state, {
      type: "cancel",
      now: 400,
      reason: "speak",
    });
    expect(step.effects).toEqual([
      { type: "abort-recognizer", recognizer: 1 },
      {
        type: "done",
        outcome: { kind: "interrupted", reason: "speak", partialText: "" },
      },
    ]);
  });

  it("듣기 끝: 새 인식 객체의 start 가 던지면 retry 오류로 끝난다", () => {
    const script = inlineScript("start-throws", [
      { events: [], startThrows: true },
    ]);
    expect(simulate(script, oneSentence(1)).outcome).toEqual({
      kind: "error",
      code: "start-failed",
      group: "retry",
      partialText: "",
    });
  });
});

describe("감시 타이머(7절)", () => {
  it("감시 타이머: 결과 · 오류 · 끝이 없으면 한 번 다시 시작하고 또 멈추면 '멈춤'으로 끝난다", () => {
    const script = loadScript("hang-twice");
    for (const rule of [oneSentence(1), multiSentence(6)]) {
      const sim = simulate(script, rule);
      expect(effectsOf(sim, "abort-recognizer")).toEqual([
        {
          at: WATCHDOG_MS,
          effect: { type: "abort-recognizer", recognizer: 1 },
        },
        {
          at: WATCHDOG_MS * 2,
          effect: { type: "abort-recognizer", recognizer: 2 },
        },
      ]);
      expect(effectsOf(sim, "start-recognizer").map((e) => e.at)).toEqual([
        0,
        WATCHDOG_MS,
      ]);
      expect(sim.outcome).toEqual({ kind: "stalled", partialText: "" });
      expect(sim.doneAt).toBe(WATCHDOG_MS * 2);
    }
  });

  it("감시 타이머: 다시 시작한 뒤 결과가 오면 이어 간다", () => {
    const script = loadScript("hang-then-ok");
    const lastResultAt = Math.max(...resultTimes(script.recognitions[1]));
    const sim = simulate(script, oneSentence(1));

    expect(effectsOf(sim, "start-recognizer").map((e) => e.at)).toEqual([
      0,
      WATCHDOG_MS,
    ]);
    expect(effectsOf(sim, "stop-recognizer").at(-1)).toEqual({
      at: WATCHDOG_MS + lastResultAt + SETTINGS.endSilenceMs["1-3"],
      effect: { type: "stop-recognizer", recognizer: 2 },
    });
    expect(sim.outcome).toEqual({
      kind: "result",
      text: "I like apples",
      pieces: ["I like apples"],
      endedBy: "silence",
      restarts: 0,
      watchdogRestarts: 1,
    });
  });

  it("감시 타이머: stop 뒤 끝이 오지 않으면 모은 글로 끝내고 다시 시작하지 않는다", () => {
    const resultAt = 600;
    const script = inlineScript("no-end-after-stop", [
      {
        events: [
          {
            at: resultAt,
            type: "result",
            results: [{ transcript: "I like apples", isFinal: false }],
          },
        ],
        onStop: [],
      },
    ]);
    const sim = simulate(script, oneSentence(1));

    expect(effectsOf(sim, "stop-recognizer").map((e) => e.at)).toEqual([
      resultAt + SETTINGS.endSilenceMs["1-3"],
    ]);
    expect(effectsOf(sim, "abort-recognizer")).toEqual([
      {
        at: resultAt + WATCHDOG_MS,
        effect: { type: "abort-recognizer", recognizer: 1 },
      },
    ]);
    expect(effectsOf(sim, "start-recognizer")).toHaveLength(1);
    expect(sim.outcome).toEqual({
      kind: "result",
      text: "I like apples",
      pieces: ["I like apples"],
      endedBy: "stall-after-stop",
      restarts: 0,
      watchdogRestarts: 0,
    });
  });
});

describe("감시 타이머 — 모은 글이 있을 때(검토 I-1 · I-2)", () => {
  const interval = 1000;
  /** 말이 이어지다 chunk 로 끊기는 실행. stop 뒤 onStop 의 끝까지 걸리는 시간은 talkingRun 의 100ms. */
  const talking = () => talkingRun(interval, SETTINGS.maxListenMs * 2);
  const hung: RecognitionRun = { events: [], hang: true };
  const STOP_TO_END = 100;

  it("감시 타이머: 두 문장 이상 답의 도중에 다시 시작해도 활동 시간 상한은 처음 잰 대로다", () => {
    const script = inlineScript("talk-talk-hang-talk", [
      talking(),
      talking(),
      hung,
      talking(),
    ]);
    // 객체 3 은 두 번째 chunk 끝에 열리고, 그 감시 다시 시작이 상한보다 앞서야 장면이 뜻을 가진다.
    const thirdStart = 2 * (SETTINGS.maxListenMs + STOP_TO_END);
    const watchdogRestartAt = thirdStart + WATCHDOG_MS;
    const capSeconds = 60;
    const rule = endRuleFor(
      { area: "speaking", level: 6, answer: "multi-sentence", capSeconds },
      SETTINGS,
    );
    expect(watchdogRestartAt).toBeLessThan(rule.capMs ?? 0);

    const sim = simulate(script, rule);
    expect(effectsOf(sim, "abort-recognizer")).toEqual([
      {
        at: watchdogRestartAt,
        effect: { type: "abort-recognizer", recognizer: 3 },
      },
    ]);
    expect(effectsOf(sim, "stop-recognizer").at(-1)).toEqual({
      at: capSeconds * 1000,
      effect: { type: "stop-recognizer", recognizer: 4 },
    });
    expect(sim.outcome).toMatchObject({
      kind: "result",
      endedBy: "cap",
      watchdogRestarts: 1,
    });
    expect(sim.doneAt).toBe(capSeconds * 1000 + STOP_TO_END);
  });

  it("감시 타이머: 말하기 버튼으로 stop 한 뒤 막 연 새 객체가 멈추면 모은 글로 끝나고 다시 듣지 않는다", () => {
    const script = inlineScript("talk-then-hang", [talking(), hung]);
    const secondStart = SETTINGS.maxListenMs + STOP_TO_END;
    const buttonAt = secondStart + 400;
    const sim = simulate(script, multiSentence(6), { buttonAt });

    expect(effectsOf(sim, "stop-recognizer").map((e) => e.effect)).toEqual([
      { type: "stop-recognizer", recognizer: 1 },
      { type: "stop-recognizer", recognizer: 2 },
    ]);
    expect(effectsOf(sim, "abort-recognizer")).toEqual([
      {
        at: secondStart + WATCHDOG_MS,
        effect: { type: "abort-recognizer", recognizer: 2 },
      },
    ]);
    expect(effectsOf(sim, "start-recognizer")).toHaveLength(2);
    expect(sim.doneAt).toBe(secondStart + WATCHDOG_MS);
    expect(sim.outcome).toMatchObject({
      kind: "result",
      endedBy: "stall-after-stop",
      restarts: 1,
      watchdogRestarts: 0,
    });
  });

  it("감시 타이머: 상한으로 stop 한 뒤 새 객체가 멈추면 상한을 넘겨 듣지 않는다", () => {
    const script = inlineScript("talk-then-hang", [talking(), hung]);
    const secondStart = SETTINGS.maxListenMs + STOP_TO_END;
    const capSeconds = 20;
    const rule = endRuleFor(
      { area: "speaking", level: 9, answer: "multi-sentence", capSeconds },
      SETTINGS,
    );
    expect(rule.capMs ?? 0).toBeGreaterThan(secondStart);
    expect(rule.capMs ?? 0).toBeLessThan(secondStart + WATCHDOG_MS);

    const sim = simulate(script, rule);
    expect(effectsOf(sim, "stop-recognizer").at(-1)).toEqual({
      at: capSeconds * 1000,
      effect: { type: "stop-recognizer", recognizer: 2 },
    });
    expect(effectsOf(sim, "start-recognizer")).toHaveLength(2);
    expect(sim.doneAt).toBe(secondStart + WATCHDOG_MS);
    expect(sim.outcome).toMatchObject({
      kind: "result",
      endedBy: "stall-after-stop",
      watchdogRestarts: 0,
    });
  });

  it("감시 타이머: 한 문장 답이 브라우저 끝 뒤 새 객체에서 멈추면 조용함 stop 뒤 모은 글로 끝난다", () => {
    const resultAt = 500;
    const endAt = 1000;
    const script = inlineScript("end-then-hang", [
      {
        events: [
          {
            at: resultAt,
            type: "result",
            results: [{ transcript: "I like apples", isFinal: true }],
          },
          { at: endAt, type: "end" },
        ],
      },
      hung,
    ]);
    const sim = simulate(script, oneSentence(1));

    expect(effectsOf(sim, "stop-recognizer")).toEqual([
      {
        at: resultAt + SETTINGS.endSilenceMs["1-3"],
        effect: { type: "stop-recognizer", recognizer: 2 },
      },
    ]);
    expect(effectsOf(sim, "start-recognizer")).toHaveLength(2);
    expect(sim.doneAt).toBe(endAt + WATCHDOG_MS);
    expect(sim.outcome).toEqual({
      kind: "result",
      text: "I like apples",
      pieces: ["I like apples"],
      endedBy: "stall-after-stop",
      restarts: 1,
      watchdogRestarts: 0,
    });
  });
});

describe("오류 갈래(7절 · 8절 · C53)", () => {
  it("오류 갈래: not-allowed · service-not-allowed 는 mic-unavailable, network 는 network, no-speech · aborted · audio-capture 는 retry", () => {
    expect(classifyRecognitionError("not-allowed")).toBe("mic-unavailable");
    expect(classifyRecognitionError("service-not-allowed")).toBe(
      "mic-unavailable",
    );
    expect(classifyRecognitionError("network")).toBe("network");
    for (const code of ["no-speech", "aborted", "audio-capture"]) {
      expect(classifyRecognitionError(code)).toBe("retry");
    }

    const rule = oneSentence(1);
    expect(simulate(loadScript("not-allowed"), rule).outcome).toEqual({
      kind: "error",
      code: "not-allowed",
      group: "mic-unavailable",
      partialText: "",
    });
    expect(simulate(loadScript("network"), rule).outcome).toEqual({
      kind: "error",
      code: "network",
      group: "network",
      partialText: "",
    });
    expect(simulate(loadScript("no-speech"), rule).outcome).toEqual({
      kind: "error",
      code: "no-speech",
      group: "retry",
      partialText: "",
    });
  });

  it("오류 갈래: language-not-supported 는 mic-unavailable, phrases-not-supported · bad-grammar 는 retry(C53)", () => {
    expect(classifyRecognitionError("language-not-supported")).toBe(
      "mic-unavailable",
    );
    expect(classifyRecognitionError("phrases-not-supported")).toBe("retry");
    expect(classifyRecognitionError("bad-grammar")).toBe("retry");
  });
});

describe("음성 설정(12절)", () => {
  /** 12절 표에서 speech.* 줄을 읽어 <구간> 을 펼친 키 → 기본값. */
  function specSpeechDefaults(): Map<string, string | number> {
    const defaults = new Map<string, string | number>();
    const parse = (raw: string) => {
      const value = raw.trim();
      return /^\d+(\.\d+)?$/.test(value) ? Number(value) : value;
    };
    for (const line of readFileSync(SETTINGS_SPEC, "utf8").split("\n")) {
      const cells = line.split("|").map((cell) => cell.trim());
      const key = cells[1];
      const value = cells[3];
      if (key === undefined || value === undefined) continue;
      if (!key.startsWith("speech.")) continue;
      if (key.includes("<구간>")) {
        const values = value.split("·");
        expect(values).toHaveLength(BANDS.length);
        BANDS.forEach((band, i) => {
          defaults.set(key.replace("<구간>", band), parse(values[i] ?? ""));
        });
      } else {
        defaults.set(key, parse(value));
      }
    }
    return defaults;
  }

  it("음성 설정: 시험용 음성 설정값은 12절 기본값과 같다", () => {
    const spec = specSpeechDefaults();
    const fixtureKeys = Object.keys(SETTINGS_FIXTURE).filter(
      (key) => key !== "_source",
    );
    expect(fixtureKeys.toSorted()).toEqual([...SPEECH_SETTING_KEYS].toSorted());
    for (const key of fixtureKeys) {
      expect({ key, value: SETTINGS_FIXTURE[key] }).toEqual({
        key,
        value: spec.get(key),
      });
    }
    expect(SETTINGS_FIXTURE._source).toBe("12절 기본값(2026-10-16)");
    // 초는 ms 로 바뀐다.
    expect(SETTINGS.maxListenMs).toBe(
      Number(SETTINGS_FIXTURE["speech.max_listen_seconds"]) * 1000,
    );
    expect(SETTINGS.endSilenceMs["4-6"]).toBe(
      Number(SETTINGS_FIXTURE["speech.end_silence_seconds.4-6"]) * 1000,
    );
    expect(SETTINGS.lang).toBe(SETTINGS_FIXTURE["speech.lang"]);
  });

  it("음성 설정: 키가 하나라도 없으면 읽기가 실패한다", () => {
    for (const missing of SPEECH_SETTING_KEYS) {
      const read = (key: string) =>
        key === missing ? undefined : readFixture(key);
      expect(() => speechSettingsFrom(read)).toThrow(missing);
    }
    // 꼴이 틀려도 조용한 기본값 없이 실패한다.
    const wrong = (key: string) =>
      key === "speech.max_listen_seconds" ? "15" : readFixture(key);
    expect(() => speechSettingsFrom(wrong)).toThrow(
      "speech.max_listen_seconds",
    );
  });
});

describe("대본 규격", () => {
  it("대본: 손으로 쓴 대본은 모두 대본 규격을 통과하고 파일 이름이 대본 이름이다", () => {
    const files = readdirSync(SCRIPTS_DIR).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(11);
    for (const file of files) {
      const script = loadScript(file.replace(/\.json$/, ""));
      expect(`${script.name}.json`).toBe(file);
    }
    expect(
      speechScriptSchema.safeParse({
        name: "broken",
        source: "손으로 씀 — 시험",
        recognitions: [{ events: [{ at: -1, type: "start" }] }],
      }).success,
    ).toBe(false);
    expect(
      speechScriptSchema.safeParse({
        name: "broken",
        source: "손으로 씀 — 시험",
        recognitions: [{ events: [{ at: 0, type: "unknown" }] }],
      }).success,
    ).toBe(false);
  });

  it("기록 대본 다시 돌려 보기 함수: observed 의 규칙 · 설정 · 버튼 시각으로 돌려 같은 결과를 낸다", () => {
    const base = loadScript("one-sentence-ok");
    const rule = oneSentence(1);
    const outcome = simulate(base, rule).outcome;
    const script = parseSpeechScript({
      ...base,
      observed: [
        { label: "1단계 따라 말하기", rule, settings: SETTINGS, outcome },
        {
          label: "6단계 그림 보고 말하기",
          rule: multiSentence(6),
          settings: SETTINGS,
          buttonAt: 5000,
          outcome: { ...outcome, endedBy: "button" },
        },
      ],
    });
    for (const replay of replayObserved(script)) {
      expect(replay.actual).toEqual(replay.expected);
    }
  });
});

// H2 뒤 기기에서 내보낸 대본(`recorded/`)마다 시험 하나. 파일이 없으면 시험이 생기지 않는다.
const recordedFiles = existsSync(RECORDED_DIR)
  ? readdirSync(RECORDED_DIR).filter((f) => f.endsWith(".json"))
  : [];
for (const file of recordedFiles) {
  const script = parseSpeechScript(
    JSON.parse(readFileSync(join(RECORDED_DIR, file), "utf8")),
  );
  it(`기록 대본 다시 돌려 보기: ${file} ${script.name}`, () => {
    for (const replay of replayObserved(script)) {
      expect({ label: replay.label, outcome: replay.actual }).toEqual({
        label: replay.label,
        outcome: replay.expected,
      });
    }
  });
}

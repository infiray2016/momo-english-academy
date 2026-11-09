// 버리는 듣기 차례를 앱 길로 다시 돌려 본다(iPad 버리는 듣기 plan 묶음 2-나 · 바뀌는 파일 표 'discard-replay', 기록 7 · 8 차례표).
// 음성 접점(createBrowserSpeech) 위에 버림 층(discardLayerFor)을 얹고 가짜 Web Speech · 가짜 시계로, 점검 쪽(w-round2)이 손으로 낸
// 효과 순서를 앱의 층이 같은 차례로 내는지 본다. 시험의 시각(ms)은 장면을 적은 자료이고, 설계 숫자는 시험용 설정(TEST_SETTINGS)에서
// 읽는다. 요청자 강조 '말하기 → 한 번 더 눌러 멈춤 → 선생님 말 → 다시 말하기'를 다섯 번 돈다. 시험 이름은 'AC-' 로 시작하지 않는다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));

import type { DiscardView } from "@/core/speech/discard";
import { discardSettingsFrom } from "@/core/speech/discard-settings";
import { type EndRule, speechSettingsFrom } from "@/core/speech/listen";
import {
  parseSpeechScript,
  type RecognitionRun,
  type UtteranceRun,
} from "@/core/speech/script";
import { createBrowserSpeech } from "@/lib/speech/browser";
import {
  type DiscardLayer,
  type DiscardSoundLine,
  type DiscardSoundNeed,
  discardLayerFor,
} from "@/lib/speech/discard-layer";
import { installFakeWebSpeech } from "@/lib/speech/fake-web-speech";
import type { SpeechTraceEntry } from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const speech = speechSettingsFrom((key) => values[key]);
const discard = discardSettingsFrom((key) => values[key]);
const RULE: EndRule = { endSilenceMs: 1000, chunkMs: 60000 };
/** 아이가 말을 이어 가 끝 조용함이 오기 전에 한 번 더 눌러 멈추는 진짜. */
const PRESS_RULE: EndRule = { endSilenceMs: 5000, chunkMs: 60000 };
/** 대비 줄(틀이 seed 짧은 말 목록 1-3 구간의 자리별 첫 줄을 넣는 꼴, 검토 2-나 M-1). */
const FALLBACK = {
  again: { text: "Okay, it's your turn.", sound: "short" },
  mic: { text: "Oops! Let me turn it on.", sound: "short" },
} satisfies Record<DiscardSoundNeed, DiscardSoundLine>;
const FALLBACK_AGAIN = `speak:${FALLBACK.again.text}`;
/** 버림 결과에 든 표지 글(어디에도 남으면 안 된다, AC-12). */
const MARK = "ZEBRA";

const IPAD = {
  userAgent:
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
  maxTouchPoints: 5,
};
const VOICE = {
  name: "Samantha",
  lang: "en-US",
  localService: true,
  default: true,
};

// ── 대본 조각(기록 7 · 8 의 꼴) ──

/** 죽은 버림: audiostart 가 판정 안(as 12, 기록 8 의 10~15)에 오고 선생님 소리를 받아 결과(표지 글)를 낸다 — 결과 목록 길이는 1 그대로라 n 은 1. stop 뒤 end. */
function deadDiscard(): RecognitionRun {
  return {
    events: [
      { at: 5, type: "start" },
      { at: 12, type: "audiostart" },
      { at: 700, type: "soundstart" },
      {
        at: 900,
        type: "result",
        results: [{ transcript: MARK, isFinal: false }],
      },
      {
        at: 1300,
        type: "result",
        results: [{ transcript: `${MARK} go`, isFinal: true }],
      },
    ],
    onStop: [{ at: 20, type: "end" }],
  };
}

/** 요청자 iPad 수업(11-08)에서 진짜 끝 2초 뒤에 열 버림의 꼴: audiostart 가 as 40(죽은 띠 10~202)에 오고 결과는 없다. stop 뒤 end. */
function lessonDiscard(): RecognitionRun {
  return {
    events: [
      { at: 5, type: "start" },
      { at: 40, type: "audiostart" },
    ],
    onStop: [{ at: 20, type: "end" }],
  };
}

/** 살아 있는 버림: audiostart 가 판정을 넘겨 온다(기록 7 차례 0 · 8 의 as 803 · 305). */
function liveDiscard(): RecognitionRun {
  return {
    events: [
      { at: 5, type: "start" },
      { at: 400, type: "audiostart" },
    ],
    onStop: [{ at: 20, type: "end" }],
  };
}

/** 진짜: 말소리 · 결과 뒤 끝 조용함으로 끝난다(기록 8 의 silence). */
function realRun(text = "apple"): RecognitionRun {
  return {
    events: [
      { at: 10, type: "start" },
      { at: 300, type: "audiostart" },
      { at: 400, type: "speechstart" },
      {
        at: 600,
        type: "result",
        results: [{ transcript: text, isFinal: true }],
      },
    ],
    onStop: [{ at: 20, type: "end" }],
  };
}

/** 진짜: 아이가 말하는 동안 한 번 더 눌러 멈춘다(끝 조용함 전에 결과가 이어진다). */
function realPressRun(text = "apple"): RecognitionRun {
  return {
    events: [
      { at: 10, type: "start" },
      { at: 300, type: "audiostart" },
      { at: 400, type: "speechstart" },
      {
        at: 600,
        type: "result",
        results: [{ transcript: text, isFinal: false }],
      },
      {
        at: 900,
        type: "result",
        results: [{ transcript: `${text} pie`, isFinal: false }],
      },
    ],
    onStop: [
      {
        at: 10,
        type: "result",
        results: [{ transcript: `${text} pie`, isFinal: true }],
      },
      { at: 20, type: "end" },
    ],
  };
}

/** 진짜: 소리 없이 브라우저가 스스로 끝낸다(결과 없음). */
function realSilentRun(): RecognitionRun {
  return {
    events: [
      { at: 10, type: "start" },
      { at: 300, type: "audiostart" },
      { at: 6000, type: "end" },
    ],
  };
}

const LINE_MS = 1500;
/** 보통 읽기(시작 알림 뒤 LINE_MS 에 끝). 잠금 풀기 무음 읽기는 곧바로 끝난다. */
const line = (endAfter = LINE_MS): UtteranceRun => ({
  startAfter: 2,
  endAfter,
});
const UNLOCK: UtteranceRun = { startAfter: 0, endAfter: 0 };

// ── 설치 ──

const doc = { hidden: false, handlers: new Set<() => void>() };

function setup(runs: RecognitionRun[], utterances: UtteranceRun[]) {
  doc.hidden = false;
  doc.handlers.clear();
  vi.stubGlobal("navigator", IPAD);
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("document", {
    get hidden() {
      return doc.hidden;
    },
    addEventListener: (_type: string, fn: () => void) => doc.handlers.add(fn),
    removeEventListener: (_type: string, fn: () => void) =>
      doc.handlers.delete(fn),
  });
  installFakeWebSpeech(
    parseSpeechScript({
      name: "discard-replay",
      source: "손으로 씀 — 기록 7 · 8 차례표를 앱 길로(버림 층 replay)",
      expose: { recognition: "webkit", synthesis: true },
      recognitions: runs,
      synthesis: { voices: [VOICE], utterances },
    }),
  );
  const trace: SpeechTraceEntry[] = [];
  const inner = createBrowserSpeech({
    settings: speech,
    onTrace: (e) => trace.push(e),
  });
  const layer = discardLayerFor(inner, {
    discard,
    speech,
    verdict: inner.device(),
    fallbackLines: FALLBACK,
    onTrace: (e) => trace.push(e),
  });
  if (layer === null) throw new Error("iPad 꼴인데 층이 없다");
  const views: DiscardView[] = [];
  layer.subscribe((v) => views.push(v));
  return { layer, trace, views, port: layer.port };
}

function setHidden(hidden: boolean) {
  doc.hidden = hidden;
  for (const fn of [...doc.handlers]) fn();
}

const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);

// ── 기록 읽기 ──

type Mark = { at: number; what: string };

/** 기록을 차례 표지로: 버림 start · stop · abort · end, 진짜 begin · done, 읽기 · 읽기 시작 · 끝, note. */
function marks(trace: SpeechTraceEntry[]): Mark[] {
  const out: Mark[] = [];
  for (const e of trace) {
    if (e.kind === "discard-call")
      out.push({ at: e.at, what: `d-${e.call}${e.by ? `:${e.by}` : ""}` });
    else if (e.kind === "discard-event" && e.event.type === "end")
      out.push({ at: e.at, what: "d-end" });
    else if (e.kind === "discard-event" && e.event.type === "audiostart")
      out.push({ at: e.at, what: "d-audio" });
    else if (e.kind === "listen-begin") out.push({ at: e.at, what: "real" });
    else if (e.kind === "listen-done")
      out.push({ at: e.at, what: `done:${e.outcome.kind}` });
    else if (e.kind === "speak" && e.text.trim() !== "")
      out.push({ at: e.at, what: `speak:${e.text}` });
    else if (e.kind === "discard-note") out.push({ at: e.at, what: "note" });
  }
  return out;
}

const whats = (trace: SpeechTraceEntry[]) => marks(trace).map((m) => m.what);
const atOf = (trace: SpeechTraceEntry[], what: string, nth = 0) => {
  const found = marks(trace).filter((m) => m.what === what)[nth];
  if (found === undefined) throw new Error(`${what} #${nth} 없음`);
  return found.at;
};
const speakEnds = (trace: SpeechTraceEntry[]) =>
  trace.flatMap((e) =>
    e.kind === "speak-event" && e.type === "end" ? [e.at] : [],
  );
const notes = (trace: SpeechTraceEntry[]) =>
  trace.flatMap((e) => (e.kind === "discard-note" ? [e.dc] : []));
const discardCalls = (
  trace: SpeechTraceEntry[],
  call: "start" | "stop" | "abort",
) => trace.filter((e) => e.kind === "discard-call" && e.call === call);

/** 진짜가 열린 동안(begin → done) 읽기 요청이 음성 접점에 닿지 않았다(F8 · AC-7). */
function noSpeakDuringReal(trace: SpeechTraceEntry[]) {
  let open = false;
  for (const e of trace) {
    if (e.kind === "listen-begin") open = true;
    if (e.kind === "listen-done") open = false;
    if (open && e.kind === "speak" && e.text.trim() !== "") return false;
  }
  return true;
}

/** 진짜가 열린 동안 버림을 열지 않았다(음성 접점은 막지 않으므로 층 몫, 검토 2-가 4절 3). */
function noDiscardDuringReal(trace: SpeechTraceEntry[]) {
  let open = false;
  for (const e of trace) {
    if (e.kind === "listen-begin") open = true;
    if (e.kind === "listen-done") open = false;
    if (open && e.kind === "discard-call" && e.call === "start") return false;
  }
  return true;
}

/** 첫 누름으로 진짜를 열고(쪽 첫 · rest), 결과로 끝나 F2 버림이 열릴 때까지(소리를 받은 진짜 뒤 open_after 를 채운 뒤, C216). */
async function firstPress(layer: DiscardLayer) {
  layer.port.unlockFromGesture();
  const handle = layer.port.listen(RULE);
  const outcome = await settleWithin(handle.outcome);
  await advance(discard.openAfterMs);
  return outcome;
}

/** 손잡이 outcome 을 가짜 시계를 돌리며 기다린다. */
async function settleWithin<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  let done = false;
  let value: T | undefined;
  void promise.then((v) => {
    done = true;
    value = v;
  });
  for (let waited = 0; !done && waited < ms; waited += 50) await advance(50);
  if (!done) throw new Error("손잡이가 풀리지 않았다");
  return value as T;
}

/** 틀의 아이 차례 누름: onListenStart(queue.cancel → cancelSpeaking)를 먼저 부르고 listen(child-turn · talk-frame 의 차례, 검토 2-나 I-1). */
function framePress(layer: DiscardLayer, rule: EndRule = RULE) {
  layer.port.cancelSpeaking();
  return layer.port.listen(rule);
}

/** 버림 안 선생님 말 하나를 읽고 틀이 소리 끝을 알린다. */
async function teacherLine(layer: DiscardLayer, text: string) {
  const said = layer.port.speak(text);
  await settleWithin(said);
  layer.soundEnd();
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  for (const name of [
    "SpeechRecognition",
    "webkitSpeechRecognition",
    "speechSynthesis",
    "SpeechSynthesisUtterance",
    "__fakeSpeech",
  ])
    delete (globalThis as Record<string, unknown>)[name];
});

describe("버림 다시 돌림 — 기록 8 차례 0 · 13(쉰 뒤 F1)", () => {
  it("버림 replay 쪽 첫 · 쉰 뒤에는 세션 없이 읽고, 누르면 읽기 끝 + 간격 뒤 진짜를 연다(기록 8 차례 0 · 13)", async () => {
    const { layer, trace } = setup(
      [realRun(), deadDiscard(), realRun()],
      [line(), UNLOCK, line()],
    );
    // 차례 0: 쪽 첫 선생님 말(세션 없음) → 읽기 끝 바로 뒤 누름 → 간격 뒤 진짜
    await settleWithin(layer.port.speak("Hello, I am Mina."));
    const firstEnd = speakEnds(trace).at(-1) ?? 0;
    const first = firstPress(layer);
    await first;
    expect(atOf(trace, "real") - firstEnd).toBeGreaterThanOrEqual(
      discard.gapMs,
    );
    expect(atOf(trace, "real") - firstEnd).toBeLessThan(discard.gapMs + 100);
    // F2: 소리를 받은 진짜가 끝나면 open_after 뒤 버림(C216 — firstPress 가 그만큼 돌린다)
    expect(whats(trace).slice(0, 5)).toEqual([
      "speak:Hello, I am Mina.",
      "note",
      "real",
      "done:result",
      "d-start",
    ]);
    // 선생님 말 없이 버림 안에서 쉬다가(소리 없는 버림은 stop 없음) — 차례 13: 47.2초 쉼
    await teacherLine(layer, "Nice!");
    await advance(discard.minMs + discard.gapMs);
    await advance(47200);
    const before = discardCalls(trace, "start").length;
    await settleWithin(layer.port.speak("Let's talk again."));
    expect(discardCalls(trace, "start")).toHaveLength(before);
    const lastEnd = speakEnds(trace).at(-1) ?? 0;
    layer.port.listen(RULE);
    await advance(discard.gapMs + 50);
    expect(atOf(trace, "real", 1) - lastEnd).toBeGreaterThanOrEqual(
      discard.gapMs,
    );
    // 쉰 뒤 갈래(rest)에는 버림 칸이 없고 누름에서 진짜까지 기다린 ms 만 있다
    expect(notes(trace).at(-1)).toEqual({ g: "rest", w: expect.any(Number) });
  });
});

describe("버림 다시 돌림 — 기록 8 차례 1~6(죽은 버림 + 소리)", () => {
  it.each([
    { name: "긴 선생님 말(소리 끝 + after 가 정함)", ms: 1900 },
    { name: "짧은 선생님 말(하한 min 이 정함)", ms: 300 },
  ])(
    "버림 replay 죽은 버림 안 읽기 → 소리 끝 + after 와 하한 → stop → end → 간격 → 진짜: $name",
    async ({ ms }) => {
      const { layer, trace, views } = setup(
        [realRun(), deadDiscard(), realRun()],
        [UNLOCK, line(ms)],
      );
      await firstPress(layer);
      const dStart = atOf(trace, "d-start");
      await teacherLine(layer, "What do you like?");
      const soundEnd = speakEnds(trace).at(-1) ?? 0;
      // 선생님 말 뒤 누름(기다림)
      layer.port.listen(RULE);
      expect(views.at(-1)?.waiting).toBe(true);
      await advance(discard.minMs + discard.gapMs + 200);
      const stop = atOf(trace, "d-stop");
      expect(stop).toBeGreaterThanOrEqual(
        Math.max(soundEnd + discard.afterSoundMs, dStart + discard.minMs),
      );
      expect(stop).toBeLessThan(
        Math.max(soundEnd + discard.afterSoundMs, dStart + discard.minMs) + 20,
      );
      const end = atOf(trace, "d-end");
      expect(atOf(trace, "real", 1) - end).toBeGreaterThanOrEqual(
        discard.gapMs,
      );
      expect(atOf(trace, "real", 1) - end).toBeLessThan(discard.gapMs + 20);
      // 차례: 버림 start → audiostart → 읽기 → stop → end → note → 진짜
      expect(whats(trace)).toEqual([
        "note",
        "real",
        "done:result",
        "d-start",
        "d-audio",
        "speak:What do you like?",
        "d-stop",
        "d-end",
        "note",
        "real",
      ]);
      expect(notes(trace).at(-1)).toMatchObject({
        g: "discard",
        why: "sound",
        sk: "teacher",
        as: 12,
        n: 1,
        np: 0,
      });
      expect(views.at(-1)).toMatchObject({ waiting: false, sayNow: true });
      // 버림 글 · 녹음 없음(FR-12 · AC-12), 버림 abort 0(F3)
      expect(JSON.stringify(trace)).not.toContain(MARK);
      expect(discardCalls(trace, "abort")).toHaveLength(0);
    },
  );
});

describe("버림 다시 돌림 — 요청자 iPad 수업(11-08) 꼴(C216)", () => {
  it("버림 replay 진짜 결과 → open_after(2초) → 버림 as 40 → 그 안 선생님 줄 → 진짜 결과를 두 차례 되풀이한다(분석 task-ana-lesson-1 2.1 · AC-24p)", async () => {
    const { layer, trace } = setup(
      [
        realRun("apple"),
        lessonDiscard(),
        realRun("banana"),
        lessonDiscard(),
        realRun("cherry"),
      ],
      [UNLOCK, line(), line()],
    );
    layer.port.unlockFromGesture();
    let handle = layer.port.listen(RULE);
    for (const [round, text] of [
      [0, "Good! What else do you like?"],
      [1, "Great! Tell me one more."],
    ] as const) {
      await settleWithin(handle.outcome);
      const realEnd = atOf(trace, "done:result", round);
      // 서버 첫 문장은 진짜 끝 바로 뒤에 오지만, 버림은 open_after 를 채운 뒤에 연다
      const said = layer.port.speak(text);
      await advance(discard.openAfterMs - 50);
      expect(discardCalls(trace, "start")).toHaveLength(round);
      expect(whats(trace)).not.toContain(`speak:${text}`);
      await settleWithin(said);
      layer.soundEnd();
      handle = layer.port.listen(RULE);
      const dStart = atOf(trace, "d-start", round);
      expect(dStart - realEnd).toBeGreaterThanOrEqual(discard.openAfterMs);
      expect(dStart - realEnd).toBeLessThan(discard.openAfterMs + 20);
      // 선생님 줄은 그 버림의 audiostart 걸음에 나간다(판정 일찍 넘김, AC-24r)
      expect(atOf(trace, `speak:${text}`)).toBe(atOf(trace, "d-audio", round));
      const order = whats(trace);
      expect(order.indexOf(`speak:${text}`)).toBeGreaterThan(
        order.lastIndexOf("d-audio"),
      );
      await advance(discard.minMs + discard.gapMs + 200);
      expect(notes(trace).at(-1)).toMatchObject({
        g: "discard",
        why: "sound",
        sk: "teacher",
        as: 40,
        n: 0,
        sr: false,
      });
    }
    await settleWithin(handle.outcome);
    expect(whats(trace).filter((w) => w.startsWith("done:"))).toEqual([
      "done:result",
      "done:result",
      "done:result",
    ]);
    expect(noSpeakDuringReal(trace)).toBe(true);
    expect(noDiscardDuringReal(trace)).toBe(true);
    expect(discardCalls(trace, "abort")).toHaveLength(0);
  });
});

describe("버림 다시 돌림 — 요청자 강조 '말하기 → 한 번 더 눌러 멈춤 → 선생님 말 → 다시 말하기'", () => {
  it("버림 replay 다섯 번 되풀이해도 진짜는 매번 열리고, 진짜 동안 읽기 0 · 버림 abort 0 · 버림 글 0 이다", async () => {
    const turns = 5;
    const runs: RecognitionRun[] = [];
    for (let i = 0; i <= turns; i += 1)
      runs.push(realPressRun(), deadDiscard());
    const { layer, trace, views } = setup(runs, [UNLOCK, line(1200)]);
    layer.port.unlockFromGesture();
    let handle = framePress(layer, PRESS_RULE);
    for (let turn = 1; turn <= turns; turn += 1) {
      // 말하기: 진짜가 열려 아이 말이 들어온다 → 한 번 더 눌러 멈춤
      await advance(1000);
      expect(views.at(-1)?.waiting).toBe(false);
      handle.press();
      const outcome = await settleWithin(handle.outcome);
      expect(outcome).toMatchObject({
        kind: "result",
        text: "apple pie",
        endedBy: "button",
      });
      // 선생님 말(버림 안)
      await advance(discard.liveAsMs);
      await teacherLine(layer, `Turn ${turn}. Tell me more.`);
      // 다시 말하기: 틀의 누름 차례(cancel → listen)로 기다림 → 진짜
      handle = framePress(layer, PRESS_RULE);
      expect(views.at(-1)?.waiting).toBe(true);
      await advance(discard.minMs + discard.gapMs + 100);
      expect(views.at(-1)).toMatchObject({ waiting: false, sayNow: true });
    }
    expect(trace.filter((e) => e.kind === "listen-begin")).toHaveLength(
      turns + 1,
    );
    expect(discardCalls(trace, "start")).toHaveLength(turns);
    expect(discardCalls(trace, "stop")).toHaveLength(turns);
    expect(discardCalls(trace, "abort")).toHaveLength(0);
    expect(noSpeakDuringReal(trace)).toBe(true);
    expect(noDiscardDuringReal(trace)).toBe(true);
    expect(JSON.stringify(trace)).not.toContain(MARK);
    // 진짜 요약마다 바로 앞 note(첫째는 rest, 그 뒤는 discard · sound)
    expect(notes(trace).map((n) => n.g)).toEqual([
      "rest",
      ...Array(turns).fill("discard"),
    ]);
  });
});

describe("버림 다시 돌림 — 기록 8 차례 9~11 · 기록 7 차례 3(굳은 읽기)", () => {
  it("버림 replay 진짜를 열 때 speaking 이 참이면 cancel 을 부르고, 풀리면 after 기다림 뒤 idle 로 연다(기록 8 차례 9~11)", async () => {
    const { layer, trace } = setup(
      [realRun(), deadDiscard(), realRun()],
      [UNLOCK, line()],
    );
    await firstPress(layer);
    await teacherLine(layer, "Good.");
    await advance(discard.minMs + discard.gapMs + 100);
    // 굳은 줄: 앱이 모르는 발화로 speaking 이 참에 머문다(cancel 이 풀어 준다 — 기록 8 차례 10 '참 → 거짓')
    const synth = window.speechSynthesis as unknown as {
      speaking: boolean;
      cancel(): void;
    };
    synth.speaking = true;
    const cancel = vi.spyOn(synth, "cancel");
    const pressAt = performance.now();
    layer.port.listen(RULE);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(trace.filter((e) => e.kind === "listen-begin")).toHaveLength(1);
    await advance(discard.afterSoundMs + 50);
    expect(atOf(trace, "real", 1) - pressAt).toBeGreaterThanOrEqual(
      discard.afterSoundMs,
    );
    const start = trace
      .filter((e) => e.kind === "recognizer-call" && e.call === "start")
      .at(-1);
    expect(start).toMatchObject({ synth: "idle" });
  });

  it("버림 replay cancel 로도 안 풀리는 굳은 읽기면 after 기다림 뒤 그대로 열고 ts 에 speaking 을 남긴다(기록 7 차례 3 · 우려 7 라)", async () => {
    const { layer, trace } = setup(
      [realRun(), deadDiscard(), realRun()],
      [UNLOCK, line()],
    );
    await firstPress(layer);
    await teacherLine(layer, "Good.");
    await advance(discard.minMs + discard.gapMs + 100);
    const synth = window.speechSynthesis as unknown as {
      speaking: boolean;
      cancel(): void;
    };
    const realCancel = synth.cancel.bind(synth);
    synth.cancel = () => {
      realCancel();
      synth.speaking = true;
    };
    synth.speaking = true;
    const pressAt = performance.now();
    layer.port.listen(RULE);
    await advance(discard.afterSoundMs - 10);
    expect(trace.filter((e) => e.kind === "listen-begin")).toHaveLength(1);
    await advance(20);
    expect(atOf(trace, "real", 1) - pressAt).toBeGreaterThanOrEqual(
      discard.afterSoundMs,
    );
    const start = trace
      .filter((e) => e.kind === "recognizer-call" && e.call === "start")
      .at(-1);
    expect(start).toMatchObject({ synth: "speaking" });
  });
});

describe("버림 다시 돌림 — 기록 7 차례 0 · 8(abort 뒤 버림부터)", () => {
  it("버림 replay 숨김이 버림을 abort 한 뒤에는 곧바로 진짜 · 세션 없는 읽기를 하지 않고, 다음 읽기 앞에 버림부터 연다", async () => {
    const { layer, trace } = setup(
      [realRun(), deadDiscard(), deadDiscard(), realRun()],
      [UNLOCK, line()],
    );
    await firstPress(layer);
    setHidden(true);
    await advance(100);
    expect(discardCalls(trace, "abort")).toEqual([
      expect.objectContaining({ by: "hidden" }),
    ]);
    setHidden(false);
    await advance(100);
    // 읽기 요청 → 버림 확인부터 → 그 안에서 읽기
    await teacherLine(layer, "Welcome back.");
    layer.port.listen(RULE);
    await advance(discard.minMs + discard.gapMs + 200);
    expect(whats(trace)).toEqual([
      "note",
      "real",
      "done:result",
      "d-start",
      "d-audio",
      "d-abort:hidden",
      "d-end",
      "d-start",
      "d-audio",
      "speak:Welcome back.",
      "d-stop",
      "d-end",
      "note",
      "real",
    ]);
    expect(notes(trace).at(-1)).toMatchObject({
      g: "reopen",
      rw: "hidden",
      sk: "teacher",
    });
  });

  it("버림 replay 진짜 중 숨김 뒤 돌아와 누르면 버림부터 열고 그 안에서 짧은 말을 읽은 뒤 진짜를 연다", async () => {
    const { layer, trace } = setup(
      [realPressRun(), deadDiscard(), realRun()],
      [UNLOCK, line(900)],
    );
    layer.port.unlockFromGesture();
    const handle = layer.port.listen(RULE);
    await advance(700);
    setHidden(true);
    await expect(settleWithin(handle.outcome)).resolves.toMatchObject({
      kind: "interrupted",
      reason: "hidden",
    });
    setHidden(false);
    await advance(100);
    expect(discardCalls(trace, "start")).toHaveLength(0);
    layer.port.unlockFromGesture();
    layer.port.listen(RULE);
    // 끊긴 진짜 끝 + open_after 를 채운 뒤 버림부터 연다(C216).
    await advance(
      discard.openAfterMs +
        discard.liveAsMs +
        900 +
        discard.minMs +
        discard.gapMs +
        200,
    );
    expect(whats(trace).slice(2)).toEqual([
      "done:interrupted",
      "d-start",
      "d-audio",
      FALLBACK_AGAIN,
      "d-stop",
      "d-end",
      "note",
      "real",
    ]);
    expect(notes(trace).at(-1)).toMatchObject({
      g: "reopen",
      rw: "hidden",
      sk: "short",
    });
  });

  it("버림 replay 살아 있는 버림은 판정 때 stop 으로 닫고(abort 0), end + open_after 뒤 다시 연 죽은 버림 안에서 선생님 줄을 읽은 뒤 진짜(AC-24q)", async () => {
    const { layer, trace } = setup(
      [realRun(), liveDiscard(), deadDiscard(), realRun()],
      [UNLOCK, line()],
    );
    await firstPress(layer);
    await advance(discard.liveAsMs + 50);
    expect(discardCalls(trace, "stop")).toHaveLength(1);
    const said = layer.port.speak("Are you ready?");
    await advance(discard.openAfterMs - 100);
    expect(discardCalls(trace, "start")).toHaveLength(1);
    expect(whats(trace)).not.toContain("speak:Are you ready?");
    await settleWithin(said);
    layer.soundEnd();
    layer.port.listen(RULE);
    await advance(discard.minMs + discard.gapMs + 200);
    expect(
      atOf(trace, "d-start", 1) - atOf(trace, "d-end"),
    ).toBeGreaterThanOrEqual(discard.openAfterMs);
    expect(whats(trace).slice(3)).toEqual([
      "d-start",
      "d-stop",
      "d-end",
      "d-start",
      "d-audio",
      "speak:Are you ready?",
      "d-stop",
      "d-end",
      "note",
      "real",
    ]);
    expect(notes(trace).at(-1)).toMatchObject({
      g: "reopen",
      why: "sound",
      sk: "teacher",
      sr: false,
    });
    expect(notes(trace).at(-1)?.rw).toBeUndefined();
    expect(discardCalls(trace, "abort")).toHaveLength(0);
  });

  it("버림 replay 다시 연 버림도 살아 있으면 되풀이하지 않고, 그 end 뒤 읽기는 세션 없이 · 누르면 간격 뒤 진짜(F3 · AC-24q)", async () => {
    const { layer, trace } = setup(
      [realRun(), liveDiscard(), liveDiscard(), realRun()],
      [UNLOCK, line()],
    );
    await firstPress(layer);
    await advance(discard.liveAsMs + 50 + discard.openAfterMs);
    await advance(discard.liveAsMs + 50);
    expect(discardCalls(trace, "stop")).toHaveLength(2);
    await teacherLine(layer, "Are you ready?");
    const lineEnd = speakEnds(trace).at(-1) ?? 0;
    layer.port.listen(RULE);
    await advance(discard.gapMs + 50);
    expect(discardCalls(trace, "start")).toHaveLength(2);
    expect(discardCalls(trace, "abort")).toHaveLength(0);
    expect(atOf(trace, "real", 1) - lineEnd).toBeGreaterThanOrEqual(
      discard.gapMs,
    );
    expect(notes(trace).at(-1)).toMatchObject({
      g: "live",
      why: "live",
      sr: true,
    });
  });
});

describe("버림 다시 돌림 — 기록 7 차례 4~7(소리 없는 버림)", () => {
  it("버림 replay 소리 없는 죽은 버림은 stop 하지 않고, 누르면 그 안에서 짧은 말을 읽은 뒤에야 stop 한다(F4)", async () => {
    const { layer, trace, views } = setup(
      [realRun(), deadDiscard(), realRun()],
      [UNLOCK, line(1900)],
    );
    await firstPress(layer);
    await advance(10000);
    expect(discardCalls(trace, "stop")).toHaveLength(0);
    layer.port.listen(RULE);
    expect(views.at(-1)?.waiting).toBe(true);
    await advance(1900 + discard.afterSoundMs + discard.gapMs + 200);
    const shortEnd = speakEnds(trace).at(-1) ?? 0;
    expect(atOf(trace, "d-stop")).toBeGreaterThanOrEqual(
      shortEnd + discard.afterSoundMs,
    );
    expect(whats(trace)).toEqual([
      "note",
      "real",
      "done:result",
      "d-start",
      "d-audio",
      FALLBACK_AGAIN,
      "d-stop",
      "d-end",
      "note",
      "real",
    ]);
    expect(notes(trace).at(-1)).toMatchObject({
      g: "discard",
      why: "sound",
      sk: "short",
    });
  });

  it("버림 replay 결과 없음 뒤 화면이 다시 말할 차례(again)를 보이면 누름 없이 짧은 말을 버림 안에서 읽는다", async () => {
    const { layer, trace } = setup(
      [realSilentRun(), deadDiscard(), realRun()],
      [UNLOCK, line(900)],
    );
    layer.port.unlockFromGesture();
    const handle = layer.port.listen(RULE);
    void handle.outcome.then((outcome) => {
      if (outcome.kind === "no-result") layer.again();
    });
    await settleWithin(handle.outcome);
    await advance(discard.openAfterMs + discard.liveAsMs + 50);
    expect(whats(trace).slice(2)).toEqual([
      "done:no-result",
      "d-start",
      "d-audio",
      FALLBACK_AGAIN,
    ]);
  });

  it("버림 replay 결과 없음 → 다시 말할 차례 → 짧은 말 시작 전 틀 누름(cancel → listen)이어도 진짜는 짧은 말 끝 + after + 간격 안에 열린다(검토 2-나 I-1)", async () => {
    const { layer, trace, views } = setup(
      [realSilentRun(), deadDiscard(), realRun()],
      [UNLOCK, line(900), line(900)],
    );
    layer.port.unlockFromGesture();
    const handle = layer.port.listen(RULE);
    await settleWithin(handle.outcome);
    await advance(discard.openAfterMs + discard.liveAsMs + 50);
    layer.again();
    // 시작 알림(2ms) 전에 아이가 '다시 말하기'를 누른다
    const pressAt = performance.now();
    framePress(layer);
    expect(views.at(-1)?.waiting).toBe(true);
    await advance(2 + 900 + Math.max(discard.afterSoundMs, discard.minMs) + 20);
    await advance(discard.gapMs + 50);
    const realAt = atOf(trace, "real", 1);
    const shortEnd = speakEnds(trace).at(-1) ?? 0;
    expect(realAt - pressAt).toBeLessThan(speech.maxListenMs);
    expect(realAt).toBeGreaterThanOrEqual(shortEnd + discard.gapMs);
    expect(whats(trace).slice(2)).toEqual([
      "done:no-result",
      "d-start",
      "d-audio",
      FALLBACK_AGAIN,
      FALLBACK_AGAIN,
      "d-stop",
      "d-end",
      "note",
      "real",
    ]);
    expect(notes(trace).at(-1)).toMatchObject({
      g: "discard",
      why: "sound",
      sk: "short",
    });
    expect(views.at(-1)).toMatchObject({ waiting: false, sayNow: true });
    expect(discardCalls(trace, "abort")).toHaveLength(0);
  });
  it("버림 replay 걸린 누름의 짧은 말이 처음 들려주지 못함으로 끝나면 한 번 더 불러 그 소리 끝에 닫고, 진짜는 안전 상한 전에 열린다(묶음 1 fix 2 · 기록 7 차례 5 · 7)", async () => {
    const { layer, trace, views } = setup(
      [realRun(), deadDiscard(), realRun()],
      [UNLOCK, { neverStart: true }, line(900)],
    );
    await firstPress(layer);
    await advance(discard.liveAsMs + 50);
    // 소리 없는 죽은 버림에서 아이가 '다시 말하기'를 누른다 — 누름이 짧은 말을 부르고, 그 줄은 시작 알림 없이 굳는다
    const pressAt = performance.now();
    framePress(layer);
    expect(views.at(-1)?.waiting).toBe(true);
    await advance(speech.speakStartTimeoutMs + 50);
    // 읽기 감시가 들려주지 못함으로 넘긴 그 걸음에 기계가 cancel 뒤 짧은 말을 한 번 더 부른다(층은 그 줄을 남긴 채 소리 끝을 보내지 않는다)
    expect(discardCalls(trace, "stop")).toHaveLength(0);
    await advance(2 + 900 + Math.max(discard.afterSoundMs, discard.minMs) + 20);
    await advance(discard.gapMs + 50);
    const realAt = atOf(trace, "real", 1);
    const shortEnd = speakEnds(trace).at(-1) ?? 0;
    expect(atOf(trace, "d-stop")).toBeGreaterThanOrEqual(
      shortEnd + discard.afterSoundMs,
    );
    expect(realAt).toBeGreaterThanOrEqual(shortEnd + discard.gapMs);
    expect(realAt - pressAt).toBeLessThan(
      speech.maxListenMs + speech.watchdogExtraMs,
    );
    expect(whats(trace).slice(2)).toEqual([
      "done:result",
      "d-start",
      "d-audio",
      FALLBACK_AGAIN,
      FALLBACK_AGAIN,
      "d-stop",
      "d-end",
      "note",
      "real",
    ]);
    expect(notes(trace).at(-1)).toMatchObject({
      g: "discard",
      why: "sound",
      sk: "short",
      np: 1,
    });
    expect(views.at(-1)).toMatchObject({ waiting: false, sayNow: true });
    expect(discardCalls(trace, "abort")).toHaveLength(0);
  });
});

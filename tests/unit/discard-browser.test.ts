// 버리는 듣기의 음성 접점 몫(iPad 버리는 듣기 plan 묶음 2-가 · 접점 표 '음성 접점' · '사건 기록', spec 설계 1 · 5).
// openDiscard 는 끝 규칙 · 감시 · deaf 판정 없이 인식 객체 하나를 열고 사건을 글 없이 알린다. 읽어 주기는 버림을 끊지 않는다(F8 ·
// AC-8). 숨김 · 마이크 확인 · 닫기는 버림을 abort 하고, 진짜 듣기는 열린 버림을 stop 으로 닫는다(안전망, plan 정한 것 10).
// synthState 는 speechSynthesis 의 speaking · pending 을 읽는다. 가짜 Web Speech(fake-web-speech)와 가짜 시계로 돌린다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));

import {
  NO_SPEECH_CODE,
  START_FAILED_CODE,
  speechSettingsFrom,
} from "@/core/speech/listen";
import {
  parseSpeechScript,
  type RecognitionRun,
  type UtteranceRun,
} from "@/core/speech/script";
import { createBrowserSpeech, NO_API_CODE } from "@/lib/speech/browser";
import {
  type FakeSpeechRecord,
  installFakeWebSpeech,
} from "@/lib/speech/fake-web-speech";
import type { SpeechPort, SpeechTraceEntry } from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const speech = speechSettingsFrom((key) => values[key]);

/** 버림 결과에 든 표지 글(어디에도 남으면 안 된다). */
const MARK = "ZEBRA";

/** iPad Safari(Playwright iPad 꼴 UA). */
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

/** 쪽 숨김 처리기(음성 접점이 document 에 거는 것). */
let visibilityHandler: (() => void) | undefined;
const doc = { hidden: false };

function install(
  runs: RecognitionRun[],
  options: {
    utterances?: UtteranceRun[];
    synthesis?: boolean;
    recognition?: "webkit" | "none";
  } = {},
) {
  doc.hidden = false;
  visibilityHandler = undefined;
  vi.stubGlobal("navigator", IPAD);
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("document", {
    get hidden() {
      return doc.hidden;
    },
    addEventListener: (_type: string, fn: () => void) => {
      visibilityHandler = fn;
    },
    removeEventListener: () => {
      visibilityHandler = undefined;
    },
  });
  installFakeWebSpeech(
    parseSpeechScript({
      name: "discard-browser",
      source: "손으로 씀 — 버리는 듣기 음성 접점 시험(기록 7 · 8 꼴)",
      expose: {
        recognition: options.recognition ?? "webkit",
        synthesis: options.synthesis ?? true,
      },
      recognitions: runs,
      synthesis: {
        voices: [VOICE],
        ...(options.utterances ? { utterances: options.utterances } : {}),
      },
    }),
  );
}

const fake = () =>
  (globalThis as unknown as { __fakeSpeech: FakeSpeechRecord }).__fakeSpeech;

/** 죽은 버림 꼴: audiostart 가 빨리 오고 선생님 소리를 받으며 결과(표지 글)를 낸다. stop 뒤 end. */
function deadDiscardRun(): RecognitionRun {
  return {
    events: [
      { at: 5, type: "start" },
      { at: 40, type: "audiostart" },
      { at: 600, type: "soundstart" },
      {
        at: 900,
        type: "result",
        results: [
          { transcript: MARK, isFinal: false },
          { transcript: `${MARK} two`, isFinal: true },
        ],
      },
    ],
    onStop: [{ at: 20, type: "end" }],
  };
}

/** 진짜 듣기: 말소리 · 결과 뒤 끝 조용함으로 끝난다. */
function realRun(text: string): RecognitionRun {
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

function openPort() {
  const trace: SpeechTraceEntry[] = [];
  const port = createBrowserSpeech({
    settings: speech,
    onTrace: (entry) => trace.push(entry),
  });
  return { port, trace };
}

function openWith(port: SpeechPort) {
  const seen: string[] = [];
  const open = port.openDiscard;
  if (open === undefined) throw new Error("openDiscard 없음");
  const handle = open({
    audio: () => seen.push("audio"),
    result: (count) => seen.push(`result:${count}`),
    end: () => seen.push("end"),
    error: (code) => seen.push(`error:${code}`),
  });
  return { handle, seen };
}

const discardEntries = (trace: SpeechTraceEntry[]) =>
  trace.filter((e) => e.kind.startsWith("discard-"));

const callsOf = (id: number) =>
  fake()
    .calls.filter((c) => c.id === id)
    .map((c) => c.method);

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

describe("버림 열기 · 사건 — 글 없음(FR-12)", () => {
  it("버림 사건은 audio · 결과 수 · end 만 알리고, 기록 어디에도 표지 글이 없다", async () => {
    install([deadDiscardRun()]);
    const { port, trace } = openPort();
    const { handle, seen } = openWith(port);
    await vi.advanceTimersByTimeAsync(1000);
    handle.stop();
    await vi.advanceTimersByTimeAsync(100);

    expect(seen).toEqual(["audio", "result:2", "end"]);
    expect(JSON.stringify(trace)).not.toContain(MARK);
    expect(discardEntries(trace).map((e) => e.kind)).toEqual([
      "discard-call",
      "discard-event",
      "discard-event",
      "discard-event",
      "discard-event",
      "discard-call",
      "discard-event",
    ]);
    const events = trace.flatMap((e) =>
      e.kind === "discard-event" ? [e.event] : [],
    );
    expect(events).toEqual([
      { type: "start" },
      { type: "audiostart" },
      { type: "soundstart" },
      { type: "result", count: 2 },
      { type: "end" },
    ]);
    // 버림은 진짜 듣기 기록(listen-begin · recognizer-*)을 내지 않는다
    expect(
      trace.some(
        (e) => e.kind === "listen-begin" || e.kind.startsWith("recognizer-"),
      ),
    ).toBe(false);
    port.dispose();
  });

  it("버림 start 기록은 버림 번호와 그때의 읽어 주기 상태(synth)를 싣는다", async () => {
    install([deadDiscardRun()], { utterances: [{ neverEnd: true }] });
    const { port, trace } = openPort();
    void port.speak("Hello there.");
    await vi.advanceTimersByTimeAsync(10);
    openWith(port);
    const start = trace.find(
      (e) => e.kind === "discard-call" && e.call === "start",
    );
    expect(start).toMatchObject({
      kind: "discard-call",
      discard: 1,
      synth: "speaking",
    });
    expect(start).not.toHaveProperty("by");
    port.dispose();
  });

  it("버림 오류는 정규화한 코드로 알리고, 기록에는 오류 이름만 둔다(메시지 없음)", async () => {
    install([
      {
        events: [
          { at: 5, type: "start" },
          { at: 30, type: "audiostart" },
          {
            at: 4000,
            type: "error",
            error: "aborted",
            message: "No speech detected",
          },
          { at: 4001, type: "end" },
        ],
      },
    ]);
    const { port, trace } = openPort();
    const { seen } = openWith(port);
    await vi.advanceTimersByTimeAsync(4100);
    expect(seen).toEqual(["audio", `error:${NO_SPEECH_CODE}`, "end"]);
    const error = trace.find(
      (e) => e.kind === "discard-event" && e.event.type === "error",
    );
    expect(error).toMatchObject({ event: { type: "error", error: "aborted" } });
    expect(JSON.stringify(error)).not.toContain("No speech");
    port.dispose();
  });

  it("start 가 던지면 열기를 돌려준 뒤에 오류(start-failed)와 end 가 온다", async () => {
    install([{ events: [], startThrows: true }]);
    const { port, trace } = openPort();
    const { handle, seen } = openWith(port);
    expect(seen).toEqual([]);
    await vi.advanceTimersByTimeAsync(0);
    expect(seen).toEqual([`error:${START_FAILED_CODE}`, "end"]);
    expect(
      trace.find((e) => e.kind === "discard-call" && e.call === "start"),
    ).toMatchObject({ threw: true });
    // 끝난 버림의 손잡이는 아무 일도 하지 않는다
    handle.stop();
    handle.abort();
    expect(fake().calls.map((c) => c.method)).toEqual(["start"]);
    port.dispose();
  });

  it("인식 API 가 없으면 객체 없이 오류(no-api)와 end 가 뒤이어 온다", async () => {
    install([], { recognition: "none" });
    const { port } = openPort();
    const { seen } = openWith(port);
    expect(seen).toEqual([]);
    await vi.advanceTimersByTimeAsync(0);
    expect(seen).toEqual([`error:${NO_API_CODE}`, "end"]);
    expect(fake().created).toBe(0);
    port.dispose();
  });

  it("손잡이 stop 은 한 번 부르고, end 뒤의 stop · abort 는 객체를 부르지 않는다", async () => {
    install([deadDiscardRun()]);
    const { port } = openPort();
    const { handle, seen } = openWith(port);
    await vi.advanceTimersByTimeAsync(100);
    handle.stop();
    await vi.advanceTimersByTimeAsync(100);
    handle.stop();
    handle.abort();
    expect(callsOf(1)).toEqual(["start", "stop"]);
    expect(seen.filter((s) => s === "end")).toHaveLength(1);
    port.dispose();
  });
});

describe("버림과 읽어 주기 — 읽기가 버림을 끊지 않는다(F8 · AC-8)", () => {
  it("버림이 열린 채 speak 해도 그 객체 stop · abort 0 이고, 읽기는 끝까지 간다", async () => {
    install([deadDiscardRun()], {
      utterances: [{ startAfter: 10, endAfter: 500 }],
    });
    const { port } = openPort();
    const { seen } = openWith(port);
    await vi.advanceTimersByTimeAsync(50);
    const spoken = port.speak("How are you today?");
    await vi.advanceTimersByTimeAsync(1000);
    expect(await spoken).toEqual({ kind: "ended", heard: "played" });
    expect(callsOf(1)).toEqual(["start"]);
    expect(seen).not.toContain("end");
    port.cancelSpeaking();
    expect(callsOf(1)).toEqual(["start"]);
    port.dispose();
  });

  it("버림을 열어도 읽는 중인 발화를 끊지 않는다", async () => {
    install([deadDiscardRun()], {
      utterances: [{ startAfter: 10, endAfter: 800 }],
    });
    const { port } = openPort();
    const spoken = port.speak("Let's talk about your weekend.");
    await vi.advanceTimersByTimeAsync(100);
    openWith(port);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await spoken).toEqual({ kind: "ended", heard: "played" });
    port.dispose();
  });
});

describe("버림 닫기 — 숨김 · 마이크 확인 · 닫기는 abort, 진짜 듣기는 stop(안전망)", () => {
  it("쪽이 숨으면 열린 버림을 abort 하고 기록에 by hidden 을 남긴다", async () => {
    install([deadDiscardRun()]);
    const { port, trace } = openPort();
    const { seen } = openWith(port);
    await vi.advanceTimersByTimeAsync(100);
    doc.hidden = true;
    visibilityHandler?.();
    await vi.advanceTimersByTimeAsync(100);
    expect(callsOf(1)).toEqual(["start", "abort"]);
    expect(
      trace.find((e) => e.kind === "discard-call" && e.call === "abort"),
    ).toMatchObject({ by: "hidden" });
    expect(seen).toContain("end");
    port.dispose();
  });

  it("마이크 확인은 열린 버림을 abort(by check)한 뒤 제 객체를 연다", async () => {
    install([
      deadDiscardRun(),
      {
        events: [
          { at: 5, type: "start" },
          { at: 100, type: "soundstart" },
        ],
      },
    ]);
    const { port, trace } = openPort();
    openWith(port);
    await vi.advanceTimersByTimeAsync(100);
    const check = port.checkMicrophone();
    await vi.advanceTimersByTimeAsync(200);
    expect(await check).toEqual({ ok: true });
    expect(callsOf(1)).toEqual(["start", "abort"]);
    expect(
      trace.find((e) => e.kind === "discard-call" && e.call === "abort"),
    ).toMatchObject({ by: "check" });
    port.dispose();
  });

  it("닫기는 열린 버림을 abort(by dispose)하고, 그 뒤 사건은 층에 알리지 않는다", async () => {
    install([deadDiscardRun()]);
    const { port, trace } = openPort();
    const { seen } = openWith(port);
    await vi.advanceTimersByTimeAsync(100);
    port.dispose();
    await vi.advanceTimersByTimeAsync(100);
    expect(callsOf(1)).toEqual(["start", "abort"]);
    expect(
      trace.find((e) => e.kind === "discard-call" && e.call === "abort"),
    ).toMatchObject({ by: "dispose" });
    expect(seen).toEqual(["audio"]);
    expect(() => port.openDiscard?.({})).toThrow();
  });

  it("진짜 듣기가 열린 버림을 만나면 그 버림을 stop(by listen)하고 새 객체로 듣는다", async () => {
    install([deadDiscardRun(), realRun("I like pizza")]);
    const { port, trace } = openPort();
    openWith(port);
    await vi.advanceTimersByTimeAsync(100);
    const handle = port.listen({ endSilenceMs: 1000, chunkMs: 60000 });
    await vi.advanceTimersByTimeAsync(3000);
    expect(await handle.outcome).toMatchObject({
      kind: "result",
      text: "I like pizza",
    });
    expect(callsOf(1)).toEqual(["start", "stop"]);
    expect(callsOf(2)[0]).toBe("start");
    const stop = trace.find(
      (e) => e.kind === "discard-call" && e.call === "stop",
    );
    expect(stop).toMatchObject({ by: "listen" });
    // 안전망의 stop 은 진짜 듣기 시작(listen-begin)보다 앞이다
    const begin = trace.findIndex((e) => e.kind === "listen-begin");
    expect(trace.indexOf(stop as SpeechTraceEntry)).toBeLessThan(begin);
    port.dispose();
  });

  it("버림을 또 열면 앞 버림을 stop(by open)하고 번호를 새로 센다", async () => {
    install([deadDiscardRun(), deadDiscardRun()]);
    const { port, trace } = openPort();
    openWith(port);
    await vi.advanceTimersByTimeAsync(100);
    openWith(port);
    await vi.advanceTimersByTimeAsync(100);
    expect(callsOf(1)).toEqual(["start", "stop"]);
    expect(callsOf(2)).toEqual(["start"]);
    expect(
      trace.find((e) => e.kind === "discard-call" && e.call === "stop"),
    ).toMatchObject({ discard: 1, by: "open" });
    expect(
      trace.filter((e) => e.kind === "discard-call" && e.call === "start"),
    ).toMatchObject([{ discard: 1 }, { discard: 2 }]);
    port.dispose();
  });

  it("닫는 중(손잡이 stop 뒤 end 전)에는 숨김 · 마이크 확인이 그 버림을 다시 abort 하지 않는다(F3 · 2-가 검토 M2)", async () => {
    install([
      {
        events: [
          { at: 5, type: "start" },
          { at: 40, type: "audiostart" },
        ],
        onStop: [{ at: 600, type: "end" }],
      },
      {
        events: [
          { at: 5, type: "start" },
          { at: 100, type: "soundstart" },
        ],
      },
    ]);
    const { port } = openPort();
    const { handle, seen } = openWith(port);
    await vi.advanceTimersByTimeAsync(100);
    handle.stop();
    doc.hidden = true;
    visibilityHandler?.();
    await vi.advanceTimersByTimeAsync(50);
    expect(callsOf(1)).toEqual(["start", "stop"]);
    doc.hidden = false;
    const check = port.checkMicrophone();
    await vi.advanceTimersByTimeAsync(200);
    expect(await check).toEqual({ ok: true });
    expect(callsOf(1)).toEqual(["start", "stop"]);
    await vi.advanceTimersByTimeAsync(600);
    expect(seen).toEqual(["audio", "end"]);
    port.dispose();
  });

  it("닫는 중인 버림의 늦은 end 는 음성 접점을 닫은 뒤면 층에 알리지 않는다(2-가 검토 M1)", async () => {
    install([
      {
        events: [
          { at: 5, type: "start" },
          { at: 40, type: "audiostart" },
        ],
        onStop: [{ at: 300, type: "end" }],
      },
    ]);
    const { port, trace } = openPort();
    const { handle, seen } = openWith(port);
    await vi.advanceTimersByTimeAsync(100);
    handle.stop();
    port.dispose();
    await vi.advanceTimersByTimeAsync(500);
    expect(callsOf(1)).toEqual(["start", "stop"]);
    expect(seen).toEqual(["audio"]);
    // 기록에는 남는다(사건 기록은 글 없이 그대로)
    expect(
      trace.some((e) => e.kind === "discard-event" && e.event.type === "end"),
    ).toBe(true);
  });

  it("열지 못한 버림의 늦은 error · end 도 음성 접점을 닫은 뒤면 층에 알리지 않는다(2-가 검토 M1)", async () => {
    install([], { recognition: "none" });
    const { port } = openPort();
    const { seen } = openWith(port);
    port.dispose();
    await vi.advanceTimersByTimeAsync(10);
    expect(seen).toEqual([]);
  });

  it("살아 있는 버림도 손잡이로는 stop 만 부른다(abort 0, F3)", async () => {
    install([
      {
        events: [
          { at: 5, type: "start" },
          { at: 600, type: "audiostart" },
        ],
        onStop: [{ at: 30, type: "end" }],
      },
    ]);
    const { port } = openPort();
    const { handle, seen } = openWith(port);
    await vi.advanceTimersByTimeAsync(250);
    handle.stop();
    await vi.advanceTimersByTimeAsync(100);
    expect(callsOf(1)).toEqual(["start", "stop"]);
    expect(seen).toEqual(["end"]);
    port.dispose();
  });
});

describe("읽어 주기 상태 synthState", () => {
  it("읽는 동안 speaking 참, 끝나면 둘 다 거짓이다", async () => {
    install([], { utterances: [{ startAfter: 10, endAfter: 300 }] });
    const { port } = openPort();
    expect(port.synthState?.()).toEqual({ speaking: false, pending: false });
    const spoken = port.speak("Good morning.");
    await vi.advanceTimersByTimeAsync(50);
    expect(port.synthState?.()).toEqual({ speaking: true, pending: false });
    await vi.advanceTimersByTimeAsync(400);
    await spoken;
    expect(port.synthState?.()).toEqual({ speaking: false, pending: false });
    port.dispose();
  });

  it("줄에 발화가 밀려 있으면 pending 을 그대로 읽는다", () => {
    install([], { utterances: [{ neverEnd: true }] });
    const { port } = openPort();
    const synth = (
      globalThis as unknown as {
        speechSynthesis: { speak(u: unknown): void };
        SpeechSynthesisUtterance: new (text: string) => unknown;
      }
    ).speechSynthesis;
    const Utter = (
      globalThis as unknown as {
        SpeechSynthesisUtterance: new (text: string) => unknown;
      }
    ).SpeechSynthesisUtterance;
    synth.speak(new Utter("one"));
    synth.speak(new Utter("two"));
    expect(port.synthState?.()).toEqual({ speaking: true, pending: true });
    port.dispose();
  });

  it("읽어 주기가 없는 브라우저는 둘 다 거짓이다", () => {
    install([], { synthesis: false });
    const { port } = openPort();
    expect(port.synthState?.()).toEqual({ speaking: false, pending: false });
    port.dispose();
  });
});

describe("버림을 쓰지 않으면 지금 길 그대로(AC-11 접점 몫)", () => {
  it("읽기 · 듣기만 하면 discard-* 기록이 없고 started 알림도 부르지 않는다", async () => {
    install([realRun("Hello")], {
      utterances: [{ startAfter: 10, endAfter: 100 }],
    });
    const { port, trace } = openPort();
    const hi = port.speak("Hi.");
    await vi.advanceTimersByTimeAsync(200);
    expect(await hi).toMatchObject({ kind: "ended" });
    const started = vi.fn();
    const handle = port.listen(
      { endSilenceMs: 1000, chunkMs: 60000 },
      { started },
    );
    await vi.advanceTimersByTimeAsync(3000);
    expect(await handle.outcome).toMatchObject({ kind: "result" });
    expect(discardEntries(trace)).toEqual([]);
    expect(started).not.toHaveBeenCalled();
    port.dispose();
  });
});

describe("가짜 Web Speech — 읽어 준 시각(spokenAt)", () => {
  it("spokenAt 은 spoken 과 같은 차례 · 같은 길이로 speak 시각을 둔다", async () => {
    install([], { utterances: [{ startAfter: 0, endAfter: 10 }] });
    const { port } = openPort();
    await vi.advanceTimersByTimeAsync(100);
    const one = port.speak("One.");
    await vi.advanceTimersByTimeAsync(400);
    await one;
    const two = port.speak("Two.");
    await vi.advanceTimersByTimeAsync(50);
    await two;
    const record = fake();
    expect(record.spoken).toEqual(["One.", "Two."]);
    expect(record.spokenAt).toHaveLength(2);
    const [first, second] = record.spokenAt;
    expect(first).toBeGreaterThanOrEqual(100);
    expect((second ?? 0) - (first ?? 0)).toBeGreaterThanOrEqual(400);
    port.dispose();
  });
});

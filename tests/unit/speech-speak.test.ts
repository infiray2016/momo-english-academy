// 음성 접점 읽어 주기(plan-p13b 파일별 값 11 · 코드 검토 I-2): 넘긴 빠르기는 utterance.rate 로, 넘기지 않으면 브라우저 기본 그대로,
// 닫은(dispose) 뒤 speak 는 읽지 않고 unsupported 를 돌린다(화면을 떠난 뒤 늦게 온 문장이 홈에서 읽히지 않게).
// 회화 선생님(plan 회화-선생님-캐릭터 값 12, AC-19g · AC-19j): 높이는 넘긴 때만, 목소리 순서가 있으면 그 목소리 · 없으면 pickVoice,
// 실제로 시작한 알림 뒤에만 onStart, 잠금 풀기는 시작 알림을 넘기지 않는다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));

import { createBrowserSpeech } from "@/lib/speech/browser";

const settings = {
  lang: "en-US",
  maxListenMs: 15_000,
  endSilenceMs: { "1-3": 3000, "4-6": 1500, "7-9": 1500, "10-12": 1500 },
  watchdogExtraMs: 3000,
  rate: { "1-3": 0.8, "4-6": 0.85, "7-9": 0.9, "10-12": 1 },
  sentencePauseMs: 700,
};

type Voice = {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
};
type Utter = {
  text: string;
  rate: number;
  pitch: number;
  voice: Voice | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};
let spoken: Utter[] = [];
let voices: Voice[] = [];
/** speak 받은 발화를 어떻게 끝낼지. 기본은 시작 알림 뒤 끝. */
let run: (u: Utter) => void;

const startThenEnd = (u: Utter) =>
  setTimeout(() => {
    u.onstart?.();
    u.onend?.();
  }, 0);

beforeEach(() => {
  spoken = [];
  voices = [];
  run = startThenEnd;
  class Utterance {
    text: string;
    rate = 1;
    pitch = 1;
    lang = "";
    voice: unknown = null;
    volume = 1;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("document", {
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => voices,
    cancel: () => {},
    speak: (u: Utter) => {
      spoken.push(u);
      run(u);
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("음성 접점 읽어 주기", () => {
  it("음성 접점: 넘긴 빠르기는 utterance.rate 로 읽고 넘기지 않으면 기본 빠르기 그대로다", async () => {
    const speech = createBrowserSpeech({ settings });
    expect(await speech.speak("Slow.", { rate: 0.8 })).toEqual({
      kind: "ended",
    });
    expect(await speech.speak("Normal.")).toEqual({ kind: "ended" });
    expect(spoken.map((u) => [u.text, u.rate])).toEqual([
      ["Slow.", 0.8],
      ["Normal.", 1],
    ]);
  });

  it("음성 접점: 닫은 뒤 speak 는 읽지 않고 unsupported 다", async () => {
    const speech = createBrowserSpeech({ settings });
    speech.dispose();
    expect(await speech.speak("Too late.")).toEqual({ kind: "unsupported" });
    expect(spoken).toEqual([]);
  });

  it("AC-19j 음성 접점: 넘긴 높이는 utterance.pitch 로 읽고 넘기지 않으면 기본 높이 그대로다", async () => {
    const speech = createBrowserSpeech({ settings });
    await speech.speak("High.", { pitch: 1.08 });
    await speech.speak("Plain.");
    expect(spoken.map((u) => [u.text, u.pitch])).toEqual([
      ["High.", 1.08],
      ["Plain.", 1],
    ]);
  });

  it("AC-19j 음성 접점: 목소리 순서가 있으면 그 목소리, 맞는 것이 없거나 순서가 없으면 pickVoice 목소리다", async () => {
    voices = [
      { name: "Daniel", lang: "en-GB", default: false, localService: true },
      { name: "Samantha", lang: "en-US", default: true, localService: true },
      { name: "Aaron", lang: "en-US", default: false, localService: true },
    ];
    const speech = createBrowserSpeech({ settings });
    await speech.speak("Teacher.", { voicePrefer: ["zoe", "aaron"] });
    await speech.speak("Nobody.", { voicePrefer: ["daniel"] });
    await speech.speak("Empty.", { voicePrefer: [] });
    await speech.speak("Plain.");
    expect(spoken.map((u) => [u.text, u.voice?.name])).toEqual([
      ["Teacher.", "Aaron"],
      ["Nobody.", "Samantha"],
      ["Empty.", "Samantha"],
      ["Plain.", "Samantha"],
    ]);
  });

  it("AC-19j 음성 접점: 기록 speak 줄에 넘긴 높이가 남는다", async () => {
    const trace: unknown[] = [];
    const speech = createBrowserSpeech({
      settings,
      onTrace: (entry) => trace.push(entry),
    });
    await speech.speak("High.", { pitch: 0.97, rate: 0.8 });
    await speech.speak("Plain.");
    const lines = trace.filter(
      (e): e is { kind: "speak"; pitch?: number; rate?: number } =>
        (e as { kind: string }).kind === "speak",
    );
    expect(lines.map((l) => [l.pitch, l.rate])).toEqual([
      [0.97, 0.8],
      [undefined, undefined],
    ]);
    expect("pitch" in (lines[1] ?? {})).toBe(false);
  });

  it("AC-19g 음성 접점: 시작 알림은 발화가 실제로 시작한 뒤 한 번, 결과보다 앞에 온다", async () => {
    const speech = createBrowserSpeech({ settings });
    const seen: string[] = [];
    const outcome = speech
      .speak("Hi.", { onStart: () => seen.push("start") })
      .then((o) => {
        seen.push(o.kind);
        return o;
      });
    expect(seen).toEqual([]);
    expect(await outcome).toEqual({ kind: "ended" });
    expect(seen).toEqual(["start", "ended"]);
  });

  it("AC-19g 음성 접점: 시작하지 않은 발화(오류로 끝남)는 시작 알림이 없다", async () => {
    run = (u) =>
      setTimeout(() => u.onerror?.({ error: "synthesis-failed" }), 0);
    const speech = createBrowserSpeech({ settings });
    let started = 0;
    const outcome = await speech.speak("Hi.", {
      onStart: () => {
        started += 1;
      },
    });
    expect(outcome).toEqual({ kind: "error", code: "synthesis-failed" });
    expect(started).toBe(0);
  });

  it("AC-19g 음성 접점: 끊긴 발화의 늦은 시작 알림은 넘기지 않는다", async () => {
    const held: Utter[] = [];
    run = (u) => held.push(u);
    const speech = createBrowserSpeech({ settings });
    let started = 0;
    const first = speech.speak("One.", {
      onStart: () => {
        started += 1;
      },
    });
    speech.cancelSpeaking();
    expect(await first).toEqual({ kind: "cancelled" });
    held[0]?.onstart?.();
    expect(started).toBe(0);
  });

  it("AC-19g 음성 접점: 잠금 풀기는 시작 알림을 넘기지 않고 이어진 읽어 주기만 알린다", async () => {
    const speech = createBrowserSpeech({ settings });
    let started = 0;
    speech.unlockFromGesture();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await speech.speak("Hello.", {
      onStart: () => {
        started += 1;
      },
    });
    expect(spoken).toHaveLength(2);
    expect(started).toBe(1);
  });
});

// 음성 접점 읽어 주기(plan-p13b 파일별 값 11 · 코드 검토 I-2): 넘긴 빠르기는 utterance.rate 로, 넘기지 않으면 브라우저 기본 그대로,
// 닫은(dispose) 뒤 speak 는 읽지 않고 unsupported 를 돌린다(화면을 떠난 뒤 늦게 온 문장이 홈에서 읽히지 않게).
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

type Utter = { text: string; rate: number; onend: (() => void) | null };
let spoken: Utter[] = [];

beforeEach(() => {
  spoken = [];
  class Utterance {
    text: string;
    rate = 1;
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
    getVoices: () => [],
    cancel: () => {},
    speak: (u: Utter) => {
      spoken.push(u);
      setTimeout(() => u.onend?.(), 0);
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
});

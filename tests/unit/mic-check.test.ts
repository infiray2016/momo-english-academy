// 마이크 확인의 성공 조건(7절 · 정할 것 터, 요청자 프리뷰 2026-10-18 — 원격 PC 에서 거짓 양성).
// 인식 API 가 있고 소리 받기(audiostart)가 시작돼도 소리가 들어오지 않으면 성공이 아니다. 소리 들어옴(soundstart ·
// speechstart) 또는 인식 결과가 한 번 와야 성공이다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 브라우저 전용 표시 모듈은 시험(node)에서 빈 모듈로
vi.mock("client-only", () => ({}));

import {
  createBrowserSpeech,
  MIC_CHECK_ENDED_CODE,
} from "@/lib/speech/browser";
import type { RecognitionLike } from "@/lib/speech/types";

type Step =
  | "start"
  | "audiostart"
  | "soundstart"
  | "speechstart"
  | "result"
  | "end";

/** start() 뒤 차례대로 사건을 내는 가짜 인식 객체. */
function fakeCtor(steps: Step[]) {
  return class Fake {
    lang = "";
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    onstart: ((e: Event) => void) | null = null;
    onaudiostart: ((e: Event) => void) | null = null;
    onsoundstart: ((e: Event) => void) | null = null;
    onspeechstart: ((e: Event) => void) | null = null;
    onspeechend: ((e: Event) => void) | null = null;
    onsoundend: ((e: Event) => void) | null = null;
    onaudioend: ((e: Event) => void) | null = null;
    onnomatch: ((e: Event) => void) | null = null;
    onresult: ((e: never) => void) | null = null;
    onerror: ((e: never) => void) | null = null;
    onend: ((e: Event) => void) | null = null;
    start() {
      let delay = 0;
      for (const step of steps) {
        delay += 10;
        setTimeout(() => {
          const handler = (this as unknown as Record<string, unknown>)[
            `on${step}`
          ];
          if (typeof handler !== "function") return;
          if (step === "result") {
            (handler as (e: unknown) => void)({
              resultIndex: 0,
              results: [[{ transcript: "hello", confidence: 1 }]],
            });
          } else (handler as (e: Event) => void)(new Event(step));
        }, delay);
      }
    }
    stop() {}
    abort() {}
  } as unknown as new () => RecognitionLike;
}

const settings = {
  lang: "en-US",
  maxListenMs: 15_000,
  endSilenceMs: { "1-3": 3000, "4-6": 1500, "7-9": 1500, "10-12": 1500 },
  watchdogExtraMs: 3000,
};

beforeEach(() => {
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("document", {
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("마이크 확인", () => {
  it("마이크 확인: 소리 받기만 시작하고 소리가 들어오지 않은 채 끝나면 실패다(가상 장치 거짓 양성 막기)", async () => {
    const port = createBrowserSpeech({
      settings,
      recognitionCtor: fakeCtor(["start", "audiostart", "end"]),
    });
    expect(await port.checkMicrophone()).toMatchObject({
      ok: false,
      code: MIC_CHECK_ENDED_CODE,
    });
  });

  it("마이크 확인: 소리 들어옴(soundstart · speechstart)이나 인식 결과가 한 번 오면 성공이다", async () => {
    for (const steps of [
      ["start", "audiostart", "soundstart", "end"],
      ["start", "audiostart", "speechstart", "end"],
      ["start", "audiostart", "result", "end"],
    ] as Step[][]) {
      const port = createBrowserSpeech({
        settings,
        recognitionCtor: fakeCtor(steps),
      });
      expect(await port.checkMicrophone(), steps.join(",")).toEqual({
        ok: true,
      });
    }
  });
});

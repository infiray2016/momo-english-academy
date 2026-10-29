// 세션 읽어 주기 감싸기(13절 C125 (1) · (2)): 읽기 지문 · 말하기 들려주기를 문장마다 나눠 단계 구간 빠르기로 읽고 문장 사이에
// speech.sentence_pause_ms 쉰다. 멈추면 쉼도 끝난다. 가짜 시계 · 가짜 음성 접점.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pacedSpeech } from "@/lib/speech/paced";
import type { SpeakOutcome, SpeechPort } from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const PAUSE = values["speech.sentence_pause_ms"] as number;
const RATE = values["speech.rate.4-6"] as number;

function fakePort() {
  const spoken: { text: string; rate: number | undefined; at: number }[] = [];
  let cancels = 0;
  const port = {
    device: () => ({ kind: "ok" }) as never,
    unlockFromGesture: () => {},
    speak: async (text: string, options?: { rate?: number }) => {
      spoken.push({ text, rate: options?.rate, at: Date.now() });
      return { kind: "ended" } satisfies SpeakOutcome;
    },
    cancelSpeaking: () => {
      cancels += 1;
    },
    listen: () => {
      throw new Error("듣지 않는다");
    },
    checkMicrophone: async () => ({ ok: true }) as const,
    dispose: () => {},
  } satisfies SpeechPort;
  return { port, spoken, cancels: () => cancels };
}

describe("세션 읽어 주기 감싸기(C125)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("문장 사이 쉼: 지문 읽어 주기는 문장마다 나눠 구간 빠르기로 읽고 문장 사이에 쉰다", async () => {
    const fake = fakePort();
    const paced = pacedSpeech(fake.port, { rate: RATE, pauseMs: PAUSE });
    const done = paced.speak("Tom has a dog. The dog is big!");
    await vi.advanceTimersByTimeAsync(PAUSE);
    expect(await done).toEqual({ kind: "ended" });
    expect(fake.spoken.map((s) => s.text)).toEqual([
      "Tom has a dog.",
      "The dog is big!",
    ]);
    expect(fake.spoken.every((s) => s.rate === RATE)).toBe(true);
    const [first, second] = fake.spoken;
    expect((second?.at ?? 0) - (first?.at ?? 0)).toBe(PAUSE);
  });

  it("문장 사이 쉼: 쉬는 동안 멈추면 남은 문장을 읽지 않고 끊김으로 끝난다", async () => {
    const fake = fakePort();
    const paced = pacedSpeech(fake.port, { rate: RATE, pauseMs: PAUSE });
    const done = paced.speak("Tom has a dog. The dog is big!");
    await vi.advanceTimersByTimeAsync(PAUSE / 2);
    paced.cancelSpeaking();
    expect(await done).toEqual({ kind: "cancelled" });
    await vi.advanceTimersByTimeAsync(PAUSE * 2);
    expect(fake.spoken.map((s) => s.text)).toEqual(["Tom has a dog."]);
    expect(fake.cancels()).toBe(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("문장 사이 쉼: 다른 말을 고르면 앞 말의 남은 문장은 읽지 않는다", async () => {
    const fake = fakePort();
    const paced = pacedSpeech(fake.port, { rate: RATE, pauseMs: PAUSE });
    const first = paced.speak("Tom has a dog. The dog is big!");
    await vi.advanceTimersByTimeAsync(0);
    const second = paced.speak("Hello.");
    await vi.advanceTimersByTimeAsync(PAUSE * 2);
    expect(await first).toEqual({ kind: "cancelled" });
    expect(await second).toEqual({ kind: "ended" });
    expect(fake.spoken.map((s) => s.text)).toEqual([
      "Tom has a dog.",
      "Hello.",
    ]);
  });

  it("읽어 주기 빠르기: 빈 글(읽어 주기 잠금 풀기)도 구간 빠르기로 그대로 넘긴다", async () => {
    const fake = fakePort();
    const paced = pacedSpeech(fake.port, { rate: RATE, pauseMs: PAUSE });
    expect(await paced.speak("")).toEqual({ kind: "ended" });
    expect(fake.spoken).toEqual([{ text: "", rate: RATE, at: Date.now() }]);
  });
});

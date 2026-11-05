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
      return { kind: "ended", heard: "played" } satisfies SpeakOutcome;
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
    expect(await done).toEqual({ kind: "ended", heard: "played" });
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
    expect(await second).toEqual({ kind: "ended", heard: "played" });
    expect(fake.spoken.map((s) => s.text)).toEqual([
      "Tom has a dog.",
      "Hello.",
    ]);
  });

  it("읽어 주기 빠르기: 빈 글(읽어 주기 잠금 풀기)도 구간 빠르기로 그대로 넘긴다", async () => {
    const fake = fakePort();
    const paced = pacedSpeech(fake.port, { rate: RATE, pauseMs: PAUSE });
    expect(await paced.speak("")).toEqual({ kind: "ended", heard: "played" });
    expect(fake.spoken).toEqual([{ text: "", rate: RATE, at: Date.now() }]);
  });
});

describe("문장 나눠 읽기의 감시 결과 모으기(R-48 · 검토 M1)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** 문장마다 정해 둔 결과를 차례로 돌리는 접점. */
  function scriptedPort(outcomes: SpeakOutcome[]) {
    const spoken: string[] = [];
    const port = {
      device: () => ({ kind: "ok" }) as never,
      unlockFromGesture: () => {},
      speak: async (text: string) => {
        spoken.push(text);
        return outcomes[spoken.length - 1] ?? { kind: "unsupported" };
      },
      cancelSpeaking: () => {},
      listen: () => {
        throw new Error("듣지 않는다");
      },
      checkMicrophone: async () => ({ ok: true }) as const,
      dispose: () => {},
    } satisfies SpeechPort;
    return { port, spoken };
  }
  const played: SpeakOutcome = { kind: "ended", heard: "played" };
  const failedBefore: SpeakOutcome = {
    kind: "error",
    code: "not-allowed",
    started: false,
  };

  async function read(outcomes: SpeakOutcome[], text: string) {
    const fake = scriptedPort(outcomes);
    const paced = pacedSpeech(fake.port, { rate: RATE, pauseMs: PAUSE });
    const done = paced.speak(text);
    await vi.advanceTimersByTimeAsync(PAUSE * outcomes.length);
    return { outcome: await done, spoken: fake.spoken };
  }

  it("R-48 모으기: 오류 문장이 앞이든 뒤든 들려준 문장과 섞이면 끝 알림 없음이다", async () => {
    const front = await read([failedBefore, played], "One. Two.");
    const back = await read([played, failedBefore], "One. Two.");
    expect(front.outcome).toEqual({ kind: "ended", heard: "no_end" });
    expect(back.outcome).toEqual({ kind: "ended", heard: "no_end" });
  });

  it("R-48 모으기: 가운데 문장이 끊기면 거기서 멈추고 끊김을 돌린다", async () => {
    const { outcome, spoken } = await read(
      [played, { kind: "cancelled" }, played],
      "One. Two. Three.",
    );
    expect(outcome).toEqual({ kind: "cancelled" });
    expect(spoken).toEqual(["One.", "Two."]);
  });

  it("R-48 모으기: 끝난 문장이 하나도 없으면 마지막 결과를 그대로 돌린다", async () => {
    const last: SpeakOutcome = {
      kind: "error",
      code: "synthesis-failed",
      started: true,
    };
    const { outcome, spoken } = await read([failedBefore, last], "One. Two.");
    expect(outcome).toEqual(last);
    expect(spoken).toEqual(["One.", "Two."]);
  });

  it("R-57 모으기: 들려주지 못한 문장과 시작 전 오류 문장만 있으면 '한 번도 들려주지 못함'이다(0-라 재검토 덧붙임)", async () => {
    const notPlayed: SpeakOutcome = { kind: "ended", heard: "not_played" };
    const { outcome, spoken } = await read(
      [notPlayed, failedBefore],
      "One. Two.",
    );
    expect(outcome).toEqual({ kind: "ended", heard: "not_played" });
    expect(spoken).toEqual(["One.", "Two."]);
  });

  it("R-48 모으기: 시작 뒤 오류 문장과 들려준 문장이 섞이면 끝 알림 없음이다(0-라 재검토 덧붙임)", async () => {
    const failedAfter: SpeakOutcome = {
      kind: "error",
      code: "synthesis-failed",
      started: true,
    };
    const { outcome } = await read([failedAfter, played], "One. Two.");
    expect(outcome).toEqual({ kind: "ended", heard: "no_end" });
  });

  const skipped: SpeakOutcome = { kind: "skipped", reason: "read_ko_off" };

  it("AC-N20 모으기: 모든 문장을 읽지 않았으면(skipped) 읽지 않음을 그대로 돌린다", async () => {
    const { outcome, spoken } = await read([skipped, skipped], "One. Two.");
    expect(outcome).toEqual(skipped);
    expect(spoken).toEqual(["One.", "Two."]);
  });

  it("AC-N20 모으기: 읽지 않은 문장은 모으지 않아 나머지를 들려줬으면 들려줌이다", async () => {
    const { outcome } = await read([skipped, played], "One. Two.");
    expect(outcome).toEqual({ kind: "ended", heard: "played" });
  });
});

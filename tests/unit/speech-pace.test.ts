// 읽어 주기 빠르기 · 문장 사이 쉼(13절 C125 (1) · (2) — 12절 speech.rate.<구간> · speech.sentence_pause_ms). 값은 시험용 설정에서
// 읽고, 쉼은 가짜 시계로 잰다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BANDS, bandOf } from "@/core/level-band";
import { speechSettingsFrom } from "@/core/speech/listen";
import {
  createSleeper,
  pauseLeftMs,
  speakInTurn,
  speakRateOf,
} from "@/core/speech/pace";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const read = (key: string) => values[key];
const speech = speechSettingsFrom(read);
const PAUSE = values["speech.sentence_pause_ms"] as number;

describe("읽어 주기 빠르기(C125 (2))", () => {
  it("읽어 주기 빠르기: 1~12단계마다 그 단계 구간의 speech.rate.<구간> 으로 읽는다", () => {
    for (let level = 1; level <= 12; level++)
      expect(speakRateOf(level, speech)).toBe(
        values[`speech.rate.${bandOf(level)}`],
      );
    // 구간마다 값이 다르다(시험용 설정 = 12절 기본값 0.8 · 0.85 · 0.9 · 1.0)
    expect(new Set(BANDS.map((band) => speech.rate[band])).size).toBe(4);
    expect(speech.sentencePauseMs).toBe(PAUSE);
  });

  it("읽어 주기 빠르기: speech.rate.<구간> 이나 speech.sentence_pause_ms 가 없으면 던진다", () => {
    for (const missing of [
      ...BANDS.map((band) => `speech.rate.${band}`),
      "speech.sentence_pause_ms",
    ])
      expect(() =>
        speechSettingsFrom((key) => (key === missing ? undefined : read(key))),
      ).toThrow();
  });
});

describe("문장 사이 쉼(C125 (1))", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("문장 사이 쉼: 앞 문장이 끝난 때부터 쉼이 다 지났으면 기다리지 않는다", () => {
    expect(pauseLeftMs({ endedAt: undefined, now: 5000, pauseMs: PAUSE })).toBe(
      0,
    );
    expect(pauseLeftMs({ endedAt: 1000, now: 1200, pauseMs: PAUSE })).toBe(
      PAUSE - 200,
    );
    expect(
      pauseLeftMs({ endedAt: 1000, now: 1000 + PAUSE + 1, pauseMs: PAUSE }),
    ).toBe(0);
  });

  it("문장 사이 쉼: 문장이 끝나면 speech.sentence_pause_ms 쉬고 다음 문장을 읽는다", async () => {
    const spoken: { text: string; at: number }[] = [];
    const sleeper = createSleeper();
    const done = speakInTurn(["Hi!", "How are you?", "Good."], {
      speak: async (text) => {
        spoken.push({ text, at: Date.now() });
        return { kind: "ended" };
      },
      pauseMs: PAUSE,
      sleeper,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(spoken.map((s) => s.text)).toEqual(["Hi!"]);
    await vi.advanceTimersByTimeAsync(PAUSE - 1);
    expect(spoken).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(spoken.map((s) => s.text)).toEqual(["Hi!", "How are you?"]);
    await vi.advanceTimersByTimeAsync(PAUSE);
    expect(await done).toBe(true);
    const at = spoken.map((s) => s.at);
    expect(at.slice(1).map((t, i) => t - (at[i] ?? 0))).toEqual([PAUSE, PAUSE]);
  });

  it("문장 사이 쉼: 쉬는 동안 멈추면 쉼도 끝나고 다음 문장을 읽지 않는다", async () => {
    const spoken: string[] = [];
    const sleeper = createSleeper();
    const done = speakInTurn(["Hi!", "How are you?"], {
      speak: async (text) => {
        spoken.push(text);
        return { kind: "ended" };
      },
      pauseMs: PAUSE,
      sleeper,
    });
    await vi.advanceTimersByTimeAsync(PAUSE / 2);
    sleeper.cancel();
    // 남은 쉼을 기다리지 않고 바로 끝난다
    await vi.advanceTimersByTimeAsync(0);
    expect(await done).toBe(false);
    await vi.advanceTimersByTimeAsync(PAUSE * 2);
    expect(spoken).toEqual(["Hi!"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("문장 사이 쉼: 다른 말을 고르면(alive 거짓) 남은 문장을 읽지 않는다", async () => {
    const spoken: string[] = [];
    let mine = true;
    const sleeper = createSleeper();
    const done = speakInTurn(["Hi!", "How are you?"], {
      speak: async (text) => {
        spoken.push(text);
        return { kind: "ended" };
      },
      pauseMs: PAUSE,
      sleeper,
      alive: () => mine,
    });
    await vi.advanceTimersByTimeAsync(0);
    mine = false;
    sleeper.cancel();
    expect(await done).toBe(false);
    await vi.advanceTimersByTimeAsync(PAUSE * 2);
    expect(spoken).toEqual(["Hi!"]);
  });

  it("문장 사이 쉼: 문장이 끝나지 않았거나(끊김) 읽을 수 없는 기기면 쉬지 않는다", async () => {
    const spoken: string[] = [];
    const cut = speakInTurn(["Hi!", "How are you?"], {
      speak: async (text) => {
        spoken.push(text);
        return { kind: "cancelled" };
      },
      pauseMs: PAUSE,
      sleeper: createSleeper(),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(await cut).toBe(true);
    expect(spoken).toEqual(["Hi!", "How are you?"]);

    const said: string[] = [];
    const silent = speakInTurn(["Hi!", "How are you?"], {
      speak: async (text) => {
        said.push(text);
        return { kind: "unsupported" };
      },
      pauseMs: PAUSE,
      sleeper: createSleeper(),
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(await silent).toBe(true);
    expect(said).toEqual(["Hi!", "How are you?"]);
    expect(vi.getTimerCount()).toBe(0);
  });
});

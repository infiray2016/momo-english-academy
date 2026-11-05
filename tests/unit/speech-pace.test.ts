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
  speakWatchOf,
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

describe("읽어 주기 감시(U5-1 · C166 R1)", () => {
  const START_KEY = "speech.speak_start_timeout_seconds";
  const EXTRA_KEY = "speech.speak_end_timeout_extra_seconds";
  const CPS_KEY = "speech.speak_chars_per_second";
  const SKIP_KEY = "speech.skip_notice_seconds";
  const startSeconds = values[START_KEY] as number;
  const extraSeconds = values[EXTRA_KEY] as number;
  const cps = values[CPS_KEY] as number;

  it("U5-1 읽어 주기 감시: 시작 안 옴 상한은 speech.speak_start_timeout_seconds, 끝 안 옴 상한은 글 길이 ÷ (speech.speak_chars_per_second × 빠르기) + speech.speak_end_timeout_extra_seconds 다", () => {
    expect(speech.speakStartTimeoutMs).toBe(startSeconds * 1000);
    expect(speech.speakEndExtraMs).toBe(extraSeconds * 1000);
    expect(speech.speakCharsPerSecond).toBe(cps);
    const text = "Hello! How are you today?";
    const rate = speech.rate["1-3"];
    const watch = speakWatchOf({ text, rate }, speech);
    expect(watch.startMs).toBe(startSeconds * 1000);
    expect(watch.endMs).toBe(
      Math.ceil((text.length / (cps * rate)) * 1000) + extraSeconds * 1000,
    );
    // 빠르기를 넘기지 않으면(브라우저 기본 빠르기 1) 같은 글은 더 짧게, 긴 글은 더 길게 기다린다
    const plain = speakWatchOf({ text }, speech);
    expect(plain.endMs).toBeLessThan(watch.endMs);
    expect(
      speakWatchOf({ text: text.repeat(4), rate }, speech).endMs,
    ).toBeGreaterThan(watch.endMs);
  });

  it("U4-4 건너뜀 안내: speech.skip_notice_seconds 를 ms 로 읽는다", () => {
    expect(speech.skipNoticeMs).toBe((values[SKIP_KEY] as number) * 1000);
  });

  it("U5-1 읽어 주기 감시: 감시 키 · 건너뜀 안내 키가 하나라도 없으면 던진다(조용한 기본값 없음)", () => {
    for (const missing of [START_KEY, EXTRA_KEY, CPS_KEY, SKIP_KEY])
      expect(() =>
        speechSettingsFrom((key) => (key === missing ? undefined : read(key))),
      ).toThrow(missing);
  });
});

describe("한국어 줄 감시 · 설정(가르치고 배우는 수업 spec 설계 10 · 12)", () => {
  const CPS_KO_KEY = "speech.speak_chars_per_second_ko";
  const RATE_KO_KEY = "speech.rate_ko";
  const READ_KO_KEY = "speech.read_ko";
  const extraMs =
    (values["speech.speak_end_timeout_extra_seconds"] as number) * 1000;

  it("AC-N20 한국어 감시 상한: 한국어 줄은 글자 수 ÷ (speech.speak_chars_per_second_ko × 빠르기) + speech.speak_end_timeout_extra_seconds 로 잰다", () => {
    const cpsKo = values[CPS_KO_KEY] as number;
    expect(speech.speakCharsPerSecondKo).toBe(cpsKo);
    expect(speech.rateKo).toBe(values[RATE_KO_KEY]);
    expect(speech.readKo).toBe(values[READ_KO_KEY]);
    const text = "오늘은 동물 이름을 배워요.";
    const ko = speakWatchOf(
      { text, rate: speech.rateKo, lang: "ko-KR" },
      speech,
    );
    expect(ko.startMs).toBe(speech.speakStartTimeoutMs);
    expect(ko.endMs).toBe(
      Math.ceil((text.length / (cpsKo * speech.rateKo)) * 1000) + extraMs,
    );
    // 영어 lang · lang 없음은 지금처럼 speech.speak_chars_per_second 로 잰다
    const en = speakWatchOf(
      { text, rate: speech.rateKo, lang: "en-US" },
      speech,
    );
    expect(en).toEqual(speakWatchOf({ text, rate: speech.rateKo }, speech));
    expect(en.endMs).toBe(
      Math.ceil(
        (text.length / (speech.speakCharsPerSecond * speech.rateKo)) * 1000,
      ) + extraMs,
    );
  });

  it("AC-N20 한국어 줄 설정: speech.read_ko · speak_chars_per_second_ko · rate_ko 가 없거나 꼴이 틀리면 던진다(조용한 기본값 없음)", () => {
    for (const missing of [CPS_KO_KEY, RATE_KO_KEY, READ_KO_KEY])
      expect(() =>
        speechSettingsFrom((key) => (key === missing ? undefined : read(key))),
      ).toThrow(missing);
    expect(() =>
      speechSettingsFrom((key) => (key === READ_KO_KEY ? "yes" : read(key))),
    ).toThrow(READ_KO_KEY);
  });
});

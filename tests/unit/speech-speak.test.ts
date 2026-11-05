// 음성 접점 읽어 주기(plan-p13b 파일별 값 11 · 코드 검토 I-2): 넘긴 빠르기는 utterance.rate 로, 넘기지 않으면 브라우저 기본 그대로,
// 닫은(dispose) 뒤 speak 는 읽지 않고 unsupported 를 돌린다(화면을 떠난 뒤 늦게 온 문장이 홈에서 읽히지 않게).
// 회화 선생님(plan 회화-선생님-캐릭터 값 12, AC-19g · AC-19j): 높이는 넘긴 때만, 목소리 순서가 있으면 그 목소리 · 없으면 pickVoice,
// 실제로 시작한 알림 뒤에만 onStart, 잠금 풀기는 시작 알림을 넘기지 않는다.
// 감시 결과 셋(UI · UX spec R-48 · 설계 3, plan 묶음 0-라): 시작 · 끝 알림이 다 오면 들려줌(played), 시작만 오고 감시가 넘기면
// 끝 알림 없음(no_end), 시작 알림 없이 감시가 넘기면 들려주지 못함(not_played).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));

import { speechSettingsFrom } from "@/core/speech/listen";
import {
  speakHeardOf,
  speakHeardOfAll,
  speakHeardOutcomeOf,
  speakWatchOf,
} from "@/core/speech/pace";
import { createBrowserSpeech } from "@/lib/speech/browser";
import { pacedSpeech } from "@/lib/speech/paced";
import type {
  SpeakOutcome,
  SpeechPort,
  SpeechTraceEntry,
} from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

// 설계 숫자(감시 상한 · 빠르기)는 시험용 설정(12절 기본값)에서 읽는다
const values = testSettingValues();
const settings = speechSettingsFrom((key) => values[key]);

type Voice = {
  name: string;
  lang: string;
  default: boolean;
  localService: boolean;
};
type Utter = {
  text: string;
  lang: string;
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
/** speechSynthesis.cancel() 을 부른 횟수. */
let cancels = 0;

const startThenEnd = (u: Utter) =>
  setTimeout(() => {
    u.onstart?.();
    u.onend?.();
  }, 0);

beforeEach(() => {
  spoken = [];
  voices = [];
  cancels = 0;
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
    speak: (u: Utter) => {
      spoken.push(u);
      run(u);
    },
    cancel: () => {
      cancels += 1;
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
      heard: "played",
    });
    expect(await speech.speak("Normal.")).toEqual({
      kind: "ended",
      heard: "played",
    });
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
    expect(await outcome).toEqual({ kind: "ended", heard: "played" });
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
    // 시작 알림 없이 난 오류는 시작 여부가 거짓이다(들려주지 못함 — 검토 M2)
    expect(outcome).toEqual({
      kind: "error",
      code: "synthesis-failed",
      started: false,
    });
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

describe("읽어 주기 감시(U5-1 · C166 R1)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const timeouts = (trace: SpeechTraceEntry[]) =>
    trace.flatMap((e) =>
      e.kind === "speak-event" && e.type === "timeout" ? [e.code] : [],
    );

  it("U5-1 읽어 주기 감시: 시작 알림이 speech.speak_start_timeout_seconds 안에 오지 않으면 끝난(ended) 것으로 보고 읽기 줄을 비운다", async () => {
    run = () => {};
    const trace: SpeechTraceEntry[] = [];
    const speech = createBrowserSpeech({
      settings,
      onTrace: (e) => trace.push(e),
    });
    let started = 0;
    let outcome: unknown;
    void speech
      .speak("Hello!", {
        rate: settings.rate["1-3"],
        onStart: () => {
          started += 1;
        },
      })
      .then((o) => {
        outcome = o;
      });
    const { startMs } = speakWatchOf(
      { text: "Hello!", rate: settings.rate["1-3"] },
      settings,
    );
    const before = cancels;
    await vi.advanceTimersByTimeAsync(startMs - 1);
    expect(outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    // 시작 알림이 없었으니 소리가 나지 않은 것으로 본다(R-48 들려주지 못함)
    expect(outcome).toEqual({ kind: "ended", heard: "not_played" });
    // 사건 없이 사라진 발화가 다음 읽기를 막지 않게 줄을 비운다(WebKit 321436)
    expect(cancels).toBe(before + 1);
    expect(timeouts(trace)).toEqual(["no-start"]);
    // 포기한 뒤 늦게 온 시작 알림은 넘기지 않는다
    spoken[0]?.onstart?.();
    expect(started).toBe(0);
  });

  it("U5-1 읽어 주기 감시: 시작은 왔는데 끝 알림이 글 길이로 잰 상한 안에 오지 않으면 끝난(ended) 것으로 본다", async () => {
    run = (u) => setTimeout(() => u.onstart?.(), 0);
    const trace: SpeechTraceEntry[] = [];
    const speech = createBrowserSpeech({
      settings,
      onTrace: (e) => trace.push(e),
    });
    const text = "This sentence never ends on this device.";
    let outcome: unknown;
    void speech.speak(text).then((o) => {
      outcome = o;
    });
    await vi.advanceTimersByTimeAsync(0);
    const { endMs } = speakWatchOf({ text }, settings);
    await vi.advanceTimersByTimeAsync(endMs - 1);
    expect(outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    // 시작은 왔으니 소리는 난 것으로 보되 정상 끝과 가른다(R-48 끝 알림 없음)
    expect(outcome).toEqual({ kind: "ended", heard: "no_end" });
    expect(timeouts(trace)).toEqual(["no-end"]);
  });

  it("U5-1 읽어 주기 감시: 제때 끝난 발화 · 끊은 발화에는 감시가 남지 않는다", async () => {
    const trace: SpeechTraceEntry[] = [];
    const speech = createBrowserSpeech({
      settings,
      onTrace: (e) => trace.push(e),
    });
    const ended = speech.speak("Hi.");
    await vi.advanceTimersByTimeAsync(0);
    expect(await ended).toEqual({ kind: "ended", heard: "played" });
    expect(vi.getTimerCount()).toBe(0);

    run = () => {};
    const cut = speech.speak("Wait.");
    speech.cancelSpeaking();
    expect(await cut).toEqual({ kind: "cancelled" });
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(settings.speakStartTimeoutMs * 2);
    expect(timeouts(trace)).toEqual([]);
  });
});

describe("읽어 주기 감시 결과 셋(R-48)", () => {
  it("R-48 감시 결과: 시작 · 끝 알림이 다 오면 들려줌, 시작만 오면 끝 알림 없음, 시작이 없으면 들려주지 못함이다", () => {
    expect(speakHeardOf({ started: true, endNotified: true })).toBe("played");
    expect(speakHeardOf({ started: true, endNotified: false })).toBe("no_end");
    expect(speakHeardOf({ started: false, endNotified: false })).toBe(
      "not_played",
    );
    // 시작 알림 없이 끝 알림만 온 발화도 시작 알림이 없으니 들려주지 못함으로 본다
    expect(speakHeardOf({ started: false, endNotified: true })).toBe(
      "not_played",
    );
  });

  it("R-48 음성 접점: 시작 알림 없이 끝 알림만 온 발화는 들려주지 못함이다", async () => {
    run = (u) => setTimeout(() => u.onend?.(), 0);
    const speech = createBrowserSpeech({ settings });
    expect(await speech.speak("Silent.")).toEqual({
      kind: "ended",
      heard: "not_played",
    });
  });

  it("R-48 음성 접점: 시작 뒤 오류는 시작 여부가 참이고, 끊은 발화는 끊김 그대로다", async () => {
    run = (u) =>
      setTimeout(() => {
        u.onstart?.();
        u.onerror?.({ error: "synthesis-failed" });
      }, 0);
    const speech = createBrowserSpeech({ settings });
    expect(await speech.speak("Broken.")).toEqual({
      kind: "error",
      code: "synthesis-failed",
      started: true,
    });
    run = () => {};
    const cut = speech.speak("Wait.");
    speech.cancelSpeaking();
    expect(await cut).toEqual({ kind: "cancelled" });
  });
});

describe("여러 문장의 감시 결과 모으기(R-48 · R-57)", () => {
  it("R-48 모으기: 모두 들려줌이면 들려줌, 모두 들려주지 못함이면 들려주지 못함, 섞이면 끝 알림 없음, 빈 목록은 들려줌이다", () => {
    expect(speakHeardOfAll(["played", "played"])).toBe("played");
    expect(speakHeardOfAll(["not_played", "not_played"])).toBe("not_played");
    expect(speakHeardOfAll(["not_played", "played"])).toBe("no_end");
    expect(speakHeardOfAll(["played", "no_end"])).toBe("no_end");
    expect(speakHeardOfAll(["no_end"])).toBe("no_end");
    expect(speakHeardOfAll([])).toBe("played");
  });

  it("R-48 문장 나눠 읽기: 앞 문장을 들려주지 못하고 뒤 문장을 들려주면 끝 알림 없음으로 돌린다", async () => {
    const heards: SpeakOutcome[] = [
      { kind: "ended", heard: "not_played" },
      { kind: "ended", heard: "played" },
    ];
    let index = 0;
    const port = {
      device: () => ({ kind: "ok" }) as never,
      unlockFromGesture: () => {},
      speak: async () => heards[index++] ?? { kind: "unsupported" },
      cancelSpeaking: () => {},
      listen: () => {
        throw new Error("듣지 않는다");
      },
      checkMicrophone: async () => ({ ok: true }) as const,
      dispose: () => {},
    } satisfies SpeechPort;
    const paced = pacedSpeech(port, {
      rate: settings.rate["4-6"],
      pauseMs: 0,
    });
    expect(await paced.speak("First one. Second one.")).toEqual({
      kind: "ended",
      heard: "no_end",
    });
    expect(index).toBe(2);
  });

  it("R-57 문장 나눠 읽기: 모든 문장을 들려주지 못했을 때만 들려주지 못함이다", async () => {
    const port = {
      device: () => ({ kind: "ok" }) as never,
      unlockFromGesture: () => {},
      speak: async (): Promise<SpeakOutcome> => ({
        kind: "ended",
        heard: "not_played",
      }),
      cancelSpeaking: () => {},
      listen: () => {
        throw new Error("듣지 않는다");
      },
      checkMicrophone: async () => ({ ok: true }) as const,
      dispose: () => {},
    } satisfies SpeechPort;
    const paced = pacedSpeech(port, {
      rate: settings.rate["4-6"],
      pauseMs: 0,
    });
    expect(await paced.speak("First one. Second one.")).toEqual({
      kind: "ended",
      heard: "not_played",
    });
  });
});

describe("결과 종류를 들려준 결과로 바꾸기(R-48 · R-57, 검토 M2)", () => {
  it("R-57 결과 바꾸기: 끝남은 heard 그대로, 시작 전 오류는 들려주지 못함, 시작 뒤 오류 · 끊김은 끝 알림 없음, 읽을 수 없음은 들려주지 못함이다", () => {
    expect(speakHeardOutcomeOf({ kind: "ended", heard: "played" })).toBe(
      "played",
    );
    expect(speakHeardOutcomeOf({ kind: "ended", heard: "no_end" })).toBe(
      "no_end",
    );
    expect(speakHeardOutcomeOf({ kind: "ended", heard: "not_played" })).toBe(
      "not_played",
    );
    expect(
      speakHeardOutcomeOf({
        kind: "error",
        code: "not-allowed",
        started: false,
      }),
    ).toBe("not_played");
    expect(
      speakHeardOutcomeOf({
        kind: "error",
        code: "synthesis-failed",
        started: true,
      }),
    ).toBe("no_end");
    expect(speakHeardOutcomeOf({ kind: "cancelled" })).toBe("no_end");
    expect(speakHeardOutcomeOf({ kind: "unsupported" })).toBe("not_played");
  });
});

describe("선생님 한국어 줄(가르치고 배우는 수업 spec 설계 4 · 10)", () => {
  const sora = {
    name: "Sora",
    lang: "ko-KR",
    default: false,
    localService: true,
  };
  const samantha = {
    name: "Samantha",
    lang: "en-US",
    default: true,
    localService: true,
  };

  it("AC-3h 음성 접점: 한국어 lang 은 ko-KR 목소리 · 선생님 높이 · speech.rate_ko 로 읽고, 넘긴 단계 빠르기는 쓰지 않는다", async () => {
    voices = [samantha, sora];
    const speech = createBrowserSpeech({ settings });
    expect(
      await speech.speak("오늘은 동물 이름을 배워요.", {
        lang: "ko-KR",
        pitch: 1.08,
        rate: settings.rate["1-3"],
      }),
    ).toEqual({ kind: "ended", heard: "played" });
    expect(spoken.map((u) => [u.lang, u.voice?.name, u.pitch, u.rate])).toEqual(
      [["ko-KR", "Sora", 1.08, settings.rateKo]],
    );
  });

  it("AC-N20 음성 접점: ko-KR 목소리가 없으면 읽지 않고 바로 '읽지 않음'(no_ko_voice)을 돌리며 읽던 말도 끊지 않는다", async () => {
    voices = [samantha];
    const speech = createBrowserSpeech({ settings });
    expect(await speech.speak("왜 그럴까요?", { lang: "ko-KR" })).toEqual({
      kind: "skipped",
      reason: "no_ko_voice",
    });
    expect(spoken).toEqual([]);
    expect(cancels).toBe(0);
  });

  it("AC-N20 음성 접점: speech.read_ko 가 끔이면 ko-KR 목소리가 있어도 읽지 않고 '읽지 않음'(read_ko_off)을 돌린다", async () => {
    voices = [samantha, sora];
    const speech = createBrowserSpeech({
      settings: { ...settings, readKo: false },
    });
    expect(await speech.speak("잘했어요.", { lang: "ko-KR" })).toEqual({
      kind: "skipped",
      reason: "read_ko_off",
    });
    // 영어 줄은 그대로 읽는다
    expect(await speech.speak("Good job.")).toEqual({
      kind: "ended",
      heard: "played",
    });
    expect(spoken.map((u) => [u.text, u.lang])).toEqual([
      ["Good job.", settings.lang],
    ]);
  });
});

describe("선생님 한국어 줄 감시(AC-N20 단위 몫)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-N20 음성 접점: 한국어 줄의 끝 알림 상한은 한국어 글자 수 ÷ speech.speak_chars_per_second_ko 로 잰다", async () => {
    voices = [
      { name: "Sora", lang: "ko-KR", default: true, localService: true },
    ];
    run = (u) => setTimeout(() => u.onstart?.(), 0);
    const speech = createBrowserSpeech({ settings });
    const text = "이 문장은 이 기기에서 끝 알림이 오지 않아요.";
    let outcome: unknown;
    void speech.speak(text, { lang: "ko-KR" }).then((o) => {
      outcome = o;
    });
    await vi.advanceTimersByTimeAsync(0);
    const { endMs } = speakWatchOf(
      { text, rate: settings.rateKo, lang: "ko-KR" },
      settings,
    );
    // 영어 글자 수로 잰 상한과 다르다(설정 값이 다를 때)
    expect(endMs).not.toBe(
      speakWatchOf({ text, rate: settings.rateKo }, settings).endMs,
    );
    await vi.advanceTimersByTimeAsync(endMs - 1);
    expect(outcome).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(outcome).toEqual({ kind: "ended", heard: "no_end" });
  });

  it("AC-N20 음성 접점: 한국어 줄이 시작하지 않으면 speech.speak_start_timeout_seconds 뒤 들려주지 못함이다", async () => {
    voices = [
      { name: "Sora", lang: "ko-KR", default: true, localService: true },
    ];
    run = () => {};
    const speech = createBrowserSpeech({ settings });
    let outcome: unknown;
    void speech.speak("시작하지 않아요.", { lang: "ko-KR" }).then((o) => {
      outcome = o;
    });
    await vi.advanceTimersByTimeAsync(settings.speakStartTimeoutMs);
    expect(outcome).toEqual({ kind: "ended", heard: "not_played" });
  });
});

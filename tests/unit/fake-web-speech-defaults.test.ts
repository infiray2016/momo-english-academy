import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { speechSettingsFrom } from "@/core/speech/listen";
import { speakWatchOf } from "@/core/speech/pace";
import {
  DEFAULT_EXPOSE,
  DEFAULT_ON_ABORT,
  DEFAULT_ON_STOP,
  parseSpeechScript,
  type ScriptEvent,
} from "@/core/speech/script";
import { createBrowserSpeech } from "@/lib/speech/browser";
import {
  type FakeSpeechRecord,
  installFakeWebSpeech,
} from "@/lib/speech/fake-web-speech";
import type { SpeakOutcome } from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

// 가짜는 addInitScript 제약(plan-p02 위험 11)으로 script.ts 의 기본값을 가져올 수 없어 함수 안에 다시 적는다.
// 그 둘이 같은지, 그리고 가짜가 실제로 그 기본값대로 도는지 본다. window 는 시험 안의 작은 흉내다.

type Timer = { fn: () => void; ms: number; seq: number; cleared: boolean };

function installWithStubWindow(
  recognitions: unknown[],
  synthesis?: { voices: unknown[] },
) {
  const timers: Timer[] = [];
  const win: Record<string, unknown> = {
    setTimeout: (fn: () => void, ms: number) => {
      timers.push({ fn, ms, seq: timers.length, cleared: false });
      return timers.length;
    },
    clearTimeout: (id: number) => {
      const timer = timers[id - 1];
      if (timer) timer.cleared = true;
    },
    performance: { now: () => 0 },
  };
  vi.stubGlobal("window", win);
  installFakeWebSpeech(
    parseSpeechScript({
      name: "defaults",
      source: "손으로 씀 — 시험 안 장면",
      recognitions,
      ...(synthesis === undefined ? {} : { synthesis }),
    }),
  );
  const runTimers = () => {
    const due = timers
      .filter((t) => !t.cleared)
      .sort((a, b) => a.ms - b.ms || a.seq - b.seq);
    for (const timer of due) {
      timer.cleared = true;
      timer.fn();
    }
  };
  return { win, runTimers };
}

const label = (event: ScriptEvent) =>
  event.type === "error" ? `error ${event.error}` : event.type;

type FakeRecognition = {
  start(): void;
  stop(): void;
  abort(): void;
  onend: ((event: Event) => void) | null;
  onerror: ((event: Event & { error: string }) => void) | null;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("가짜 Web Speech 기본값", () => {
  it("가짜 음성: 함수 안에 다시 적은 기본값이 대본 규격의 기본값과 같다", () => {
    const { win } = installWithStubWindow([{ events: [] }]);
    const record = win.__fakeSpeech as FakeSpeechRecord;
    expect(record.defaults.expose).toEqual(DEFAULT_EXPOSE);
    expect(record.defaults.onStop).toEqual(DEFAULT_ON_STOP);
    expect(record.defaults.onAbort).toEqual(DEFAULT_ON_ABORT);
  });

  it("가짜 음성: 기본값대로 webkit 인식 · 읽어 주기를 두고, stop 뒤 끝 · abort 뒤 aborted 와 끝을 낸다", () => {
    const { win, runTimers } = installWithStubWindow([{ events: [] }]);
    expect(typeof win.webkitSpeechRecognition).toBe("function");
    expect(win.SpeechRecognition).toBeUndefined();
    expect(typeof win.speechSynthesis).toBe("object");
    expect(typeof win.SpeechSynthesisUtterance).toBe("function");

    const Recognition =
      win.webkitSpeechRecognition as new () => FakeRecognition;
    const seen = (recognition: FakeRecognition) => {
      const out: string[] = [];
      recognition.onend = () => out.push("end");
      recognition.onerror = (event) => out.push(`error ${event.error}`);
      return out;
    };

    const stopped = new Recognition();
    const afterStop = seen(stopped);
    stopped.start();
    stopped.stop();
    runTimers();
    expect(afterStop).toEqual(DEFAULT_ON_STOP.map(label));

    const aborted = new Recognition();
    const afterAbort = seen(aborted);
    aborted.start();
    aborted.abort();
    runTimers();
    expect(afterAbort).toEqual(DEFAULT_ON_ABORT.map(label));
  });

  it("가짜 음성: 기록에 읽어 준 높이 · 목소리 이름이 spoken 과 같은 차례로 남는다(목소리 없으면 null)", () => {
    const { win } = installWithStubWindow([{ events: [] }], {
      voices: [
        { name: "Samantha", lang: "en-US", localService: true, default: true },
      ],
    });
    const record = win.__fakeSpeech as FakeSpeechRecord;
    type Utterance = { pitch: number; voice: unknown };
    const Ctor = win.SpeechSynthesisUtterance as new (
      text: string,
    ) => Utterance;
    const synth = win.speechSynthesis as {
      getVoices(): unknown[];
      speak(u: Utterance): void;
    };
    const teacher = new Ctor("Hello.");
    teacher.pitch = 1.08;
    teacher.voice = synth.getVoices()[0];
    synth.speak(teacher);
    synth.speak(new Ctor("Plain."));
    expect(record.spoken).toEqual(["Hello.", "Plain."]);
    expect(record.pitches).toEqual([1.08, 1]);
    expect(record.voices).toEqual(["Samantha", null]);
  });
});

describe("가짜 음성 대본으로 읽어 주기 감시 결과 셋(R-48)", () => {
  // 설계 숫자(감시 상한)는 시험용 설정(12절 기본값)에서 읽는다
  const values = testSettingValues();
  const settings = speechSettingsFrom((key) => values[key]);

  afterEach(() => {
    vi.useRealTimers();
    for (const name of ["speechSynthesis", "SpeechSynthesisUtterance"])
      Reflect.deleteProperty(globalThis, name);
  });

  it("R-48 가짜 음성: 대본의 보통 발화 · neverEnd · neverStart 가 음성 접점에서 들려줌 · 끝 알림 없음 · 들려주지 못함이 된다", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("document", {
      hidden: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    installFakeWebSpeech(
      parseSpeechScript({
        name: "speak-watch",
        source: "손으로 씀 — 시험 안 장면",
        recognitions: [{ events: [] }],
        synthesis: {
          voices: [],
          utterances: [{}, { neverEnd: true }, { neverStart: true }],
        },
      }),
    );
    const speech = createBrowserSpeech({ settings });
    const texts = ["Hello.", "This one never ends.", "Never starts."];
    const outcomes: SpeakOutcome[] = [];
    for (const text of texts) {
      const pending = speech.speak(text);
      const { startMs, endMs } = speakWatchOf({ text }, settings);
      await vi.advanceTimersByTimeAsync(startMs + endMs);
      outcomes.push(await pending);
    }
    expect(outcomes).toEqual([
      { kind: "ended", heard: "played" },
      { kind: "ended", heard: "no_end" },
      { kind: "ended", heard: "not_played" },
    ]);
    speech.dispose();
  });
});

describe("가짜 음성 대본의 ko-KR 목소리 있음 · 없음(AC-3h · AC-N20)", () => {
  const values = testSettingValues();
  const settings = speechSettingsFrom((key) => values[key]);
  const scriptOf = (name: string) =>
    parseSpeechScript(
      JSON.parse(
        readFileSync(
          join(process.cwd(), "tests/fixtures/speech/scripts", `${name}.json`),
          "utf8",
        ),
      ),
    );

  afterEach(() => {
    vi.useRealTimers();
    for (const name of ["speechSynthesis", "SpeechSynthesisUtterance"])
      Reflect.deleteProperty(globalThis, name);
  });

  async function speakKo(script: string) {
    vi.useFakeTimers();
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("document", {
      hidden: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    installFakeWebSpeech(scriptOf(script));
    const record = (globalThis as unknown as { __fakeSpeech: FakeSpeechRecord })
      .__fakeSpeech;
    const speech = createBrowserSpeech({ settings });
    const text = "오늘은 동물 이름을 배워요.";
    const pending = speech.speak(text, { lang: "ko-KR", pitch: 1.08 });
    const { startMs, endMs } = speakWatchOf(
      { text, rate: settings.rateKo, lang: "ko-KR" },
      settings,
    );
    await vi.advanceTimersByTimeAsync(startMs + endMs);
    const outcome = await pending;
    speech.dispose();
    return { outcome, record };
  }

  it("AC-3h 가짜 음성: ko-KR 목소리가 있는 대본이면 선생님 한국어 줄을 그 목소리 · 선생님 높이로 읽는다", async () => {
    const { outcome, record } = await speakKo("ko-voice");
    expect(outcome).toEqual({ kind: "ended", heard: "played" });
    expect(record.voices).toEqual(["Test Korean"]);
    expect(record.pitches).toEqual([1.08]);
    expect(record.rates).toEqual([settings.rateKo]);
  });

  it("AC-N20 가짜 음성: ko-KR 목소리가 없는 대본이면 선생님 한국어 줄을 읽지 않고 '읽지 않음'이다", async () => {
    const { outcome, record } = await speakKo("no-ko-voice");
    expect(outcome).toEqual({ kind: "skipped", reason: "no_ko_voice" });
    expect(record.spoken).toEqual([]);
  });
});

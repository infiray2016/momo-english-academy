import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EXPOSE,
  DEFAULT_ON_ABORT,
  DEFAULT_ON_STOP,
  parseSpeechScript,
  type ScriptEvent,
} from "@/core/speech/script";
import {
  type FakeSpeechRecord,
  installFakeWebSpeech,
} from "@/lib/speech/fake-web-speech";

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

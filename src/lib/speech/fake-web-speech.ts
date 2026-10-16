// 시험용 가짜 Web Speech(plan-p02 '파일별 값' 8). 대본(SpeechScript)대로 인식 · 읽어 주기 이벤트를 낸다.
// Playwright addInitScript(fn, arg) 는 함수 글을 쪽으로 옮긴다. 그래서 이 함수 밖의 이름(가져온 값 ·
// 모듈 상수)을 쓰지 않고 `import type` 만 쓴다. 클래스 필드 대신 생성자 안 대입과 `declare` 를 쓴다.
// 예약은 부를 때마다 window.setTimeout 을 읽는다(Playwright 시계가 덮은 것을 타려고).
// 앱 코드는 이 파일을 가져오지 않는다(의존 규칙 no-fake-speech-in-app).
import type {
  RecognitionRun,
  ScriptEvent,
  SpeechScript,
  UtteranceRun,
} from "@/core/speech/script";

export type FakeSpeechRecord = {
  created: number;
  calls: { at: number; id: number; method: "start" | "stop" | "abort" }[];
  spoken: string[];
  /** 함수 안에 다시 적은 기본값. script.ts 의 DEFAULT_* 와 같은지 단위 시험이 본다. */
  defaults: {
    expose: { recognition: string; synthesis: boolean };
    onStop: ScriptEvent[];
    onAbort: ScriptEvent[];
    utterance: UtteranceRun;
  };
};

export function installFakeWebSpeech(script: SpeechScript): void {
  // script.ts 의 DEFAULT_EXPOSE · DEFAULT_ON_STOP · DEFAULT_ON_ABORT 와 같은 값(밖 이름을 쓸 수 없어 다시 적는다).
  const defaultExpose = { recognition: "webkit", synthesis: true };
  const defaultOnStop: ScriptEvent[] = [{ at: 0, type: "end" }];
  const defaultOnAbort: ScriptEvent[] = [
    { at: 0, type: "error", error: "aborted" },
    { at: 0, type: "end" },
  ];
  // utterances 가 없을 때의 발화: 바로 시작하고 바로 끝난다.
  const defaultUtterance: UtteranceRun = { startAfter: 0, endAfter: 0 };

  const w = window as unknown as Record<string, unknown>;
  const clock = () => (window.performance ? window.performance.now() : 0);
  const later = (fn: () => void, ms: number) => window.setTimeout(fn, ms);
  const cancelLater = (id: number) => window.clearTimeout(id);

  const record: FakeSpeechRecord = {
    created: 0,
    calls: [],
    spoken: [],
    defaults: {
      expose: defaultExpose,
      onStop: defaultOnStop,
      onAbort: defaultOnAbort,
      utterance: defaultUtterance,
    },
  };
  w.__fakeSpeech = record;

  const expose = script.expose ?? defaultExpose;
  let runIndex = 0;

  type Handler = ((event: Event) => void) | null;

  function makeEvent(event: ScriptEvent): Event {
    const out = new Event(event.type);
    if (event.type === "result") {
      const list = event.results.map((r) =>
        Object.assign([{ transcript: r.transcript, confidence: 1 }], {
          isFinal: r.isFinal,
        }),
      );
      Object.defineProperty(out, "results", { value: list });
      Object.defineProperty(out, "resultIndex", { value: 0 });
    } else if (event.type === "error") {
      Object.defineProperty(out, "error", { value: event.error });
      Object.defineProperty(out, "message", { value: event.message ?? "" });
    }
    return out;
  }

  class FakeRecognition extends EventTarget {
    declare lang: string;
    declare continuous: boolean;
    declare interimResults: boolean;
    declare maxAlternatives: number;
    declare id: number;
    declare run: RecognitionRun | undefined;
    declare started: boolean;
    declare timers: number[];

    constructor() {
      super();
      this.lang = "";
      this.continuous = false;
      this.interimResults = false;
      this.maxAlternatives = 1;
      record.created += 1;
      this.id = record.created;
      this.run = undefined;
      this.started = false;
      this.timers = [];
      for (const name of [
        "start",
        "audiostart",
        "soundstart",
        "speechstart",
        "speechend",
        "soundend",
        "audioend",
        "nomatch",
        "result",
        "error",
        "end",
      ]) {
        (this as unknown as Record<string, Handler>)[`on${name}`] = null;
      }
    }

    start() {
      record.calls.push({ at: clock(), id: this.id, method: "start" });
      if (this.started) {
        throw new DOMException("already started", "InvalidStateError");
      }
      const runs = script.recognitions;
      const run = runs[Math.min(runIndex, runs.length - 1)];
      runIndex += 1;
      if (run === undefined || run.startThrows) {
        throw new DOMException("cannot start", "InvalidStateError");
      }
      this.run = run;
      this.started = true;
      if (!run.hang) this.schedule(run.events);
    }

    stop() {
      record.calls.push({ at: clock(), id: this.id, method: "stop" });
      this.finishWith(this.run?.onStop ?? defaultOnStop);
    }

    abort() {
      record.calls.push({ at: clock(), id: this.id, method: "abort" });
      this.finishWith(this.run?.onAbort ?? defaultOnAbort);
    }

    finishWith(events: ScriptEvent[]) {
      this.clear();
      if (!this.started || this.run === undefined || this.run.hang) return;
      this.schedule(events);
    }

    schedule(events: ScriptEvent[]) {
      for (const event of events) {
        this.timers.push(later(() => this.emit(event), event.at));
      }
    }

    clear() {
      for (const id of this.timers) cancelLater(id);
      this.timers = [];
    }

    emit(event: ScriptEvent) {
      if (event.type === "end") {
        this.clear();
        this.started = false;
      }
      const out = makeEvent(event);
      const handler = (this as unknown as Record<string, Handler>)[
        `on${event.type}`
      ];
      if (typeof handler === "function") handler.call(this, out);
      this.dispatchEvent(out);
    }
  }

  function define(name: string, value: unknown) {
    Object.defineProperty(window, name, {
      value,
      configurable: true,
      writable: true,
    });
  }

  const standard =
    expose.recognition === "standard" || expose.recognition === "both";
  const webkit =
    expose.recognition === "webkit" || expose.recognition === "both";
  define("SpeechRecognition", standard ? FakeRecognition : undefined);
  define("webkitSpeechRecognition", webkit ? FakeRecognition : undefined);

  // ── 읽어 주기 ──
  const voices = (script.synthesis ? script.synthesis.voices : []).map((v) => ({
    name: v.name,
    lang: v.lang,
    localService: v.localService,
    default: v.default,
    voiceURI: v.name,
  }));
  const utteranceRuns = script.synthesis
    ? script.synthesis.utterances
    : undefined;
  let utteranceIndex = 0;

  class FakeUtterance extends EventTarget {
    declare text: string;
    declare lang: string;
    declare voice: unknown;
    declare volume: number;
    declare rate: number;
    declare pitch: number;
    declare onstart: Handler;
    declare onend: Handler;
    declare onerror: Handler;

    constructor(text?: string) {
      super();
      this.text = text ?? "";
      this.lang = "";
      this.voice = null;
      this.volume = 1;
      this.rate = 1;
      this.pitch = 1;
      this.onstart = null;
      this.onend = null;
      this.onerror = null;
    }
  }

  function fire(
    utterance: FakeUtterance,
    type: "start" | "end" | "error",
    error?: string,
  ) {
    const event = new Event(type);
    if (error !== undefined)
      Object.defineProperty(event, "error", { value: error });
    Object.defineProperty(event, "utterance", { value: utterance });
    const handler =
      type === "start"
        ? utterance.onstart
        : type === "end"
          ? utterance.onend
          : utterance.onerror;
    if (typeof handler === "function") handler.call(utterance, event);
    utterance.dispatchEvent(event);
  }

  const queue: FakeUtterance[] = [];
  let current: { utterance: FakeUtterance; timers: number[] } | undefined;

  const synthesis = {
    speaking: false,
    pending: false,
    paused: false,
    onvoiceschanged: null as Handler,
    getVoices: () => voices,
    speak(utterance: FakeUtterance) {
      record.spoken.push(utterance.text);
      queue.push(utterance);
      pump();
    },
    cancel() {
      const dropped = queue.splice(0, queue.length);
      const active = current;
      current = undefined;
      synthesis.speaking = false;
      synthesis.pending = false;
      if (active !== undefined) {
        for (const id of active.timers) cancelLater(id);
        fire(active.utterance, "error", "interrupted");
      }
      for (const utterance of dropped) fire(utterance, "error", "canceled");
    },
    pause() {
      synthesis.paused = true;
    },
    resume() {
      synthesis.paused = false;
    },
    addEventListener() {},
    removeEventListener() {},
  };

  function pump() {
    synthesis.pending = queue.length > (current === undefined ? 1 : 0);
    if (current !== undefined) return;
    const utterance = queue.shift();
    if (utterance === undefined) return;
    const runs = utteranceRuns ?? [defaultUtterance];
    const run =
      runs[Math.min(utteranceIndex, runs.length - 1)] ?? defaultUtterance;
    utteranceIndex += 1;
    const active = { utterance, timers: [] as number[] };
    current = active;
    synthesis.speaking = true;
    synthesis.pending = queue.length > 0;
    if (run.neverStart) return;
    const done = () => {
      if (current !== active) return;
      current = undefined;
      synthesis.speaking = false;
      pump();
    };
    active.timers.push(
      later(() => {
        if (current !== active) return;
        fire(utterance, "start");
        if (run.error !== undefined) {
          const code = run.error;
          active.timers.push(
            later(() => {
              if (current !== active) return;
              fire(utterance, "error", code);
              done();
            }, run.endAfter ?? 0),
          );
          return;
        }
        if (run.neverEnd) return;
        active.timers.push(
          later(() => {
            if (current !== active) return;
            fire(utterance, "end");
            done();
          }, run.endAfter ?? 0),
        );
      }, run.startAfter ?? 0),
    );
  }

  if (expose.synthesis) {
    define("speechSynthesis", synthesis);
    define("SpeechSynthesisUtterance", FakeUtterance);
  } else {
    define("speechSynthesis", undefined);
    define("SpeechSynthesisUtterance", undefined);
  }
}

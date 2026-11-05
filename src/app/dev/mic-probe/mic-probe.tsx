"use client";

// 마이크 점검 쪽 본체(브리프 task-mic-probe 2026-11-06). iPad Safari 27 에서 회화 듣기가 '시작 알림 0.2초 안 + 소리 없음'으로 실패하는
// 꼴(분석 task-ipad-listen-analysis-report · 조사 docs/research/2026-11-06-iPad-사파리-음성-인식-no-speech-조사)의 회복 전략 일곱을
// 요청자 iPad 한 번(15분 안)으로 잰다. 앱 음성 접점(src/lib/speech)과 독립으로 webkitSpeechRecognition 을 직접 쓴다.
// fix 1(검토 I-3): D 는 읽기 끝 알림 안 자동 시작(누름 밖), F 는 읽기 끝 뒤 누름, G 는 읽는 중 누름(cancel 뒤 start)으로 갈라
// C210 의 'TTS 재생 종료 직후 마이크 시작'과 '누름 밖 시작'을 따로 잰다. 단추 한 번 = 듣기 한 번 = 표 한 줄.
// 기록은 sessionStorage 에만 두어 새로 고침 뒤에도 잇는다(새로 고침으로 회복되는지 가른다).
// DB 에 쓰지 않고 녹음하지 않는다(7절 — getUserMedia · MediaRecorder 없음). audioSession 은 읽기만 한다(조사 3절 — 바꾸면 해로움).
import { useEffect, useRef, useState } from "react";
import {
  copyTextOf,
  END_SILENCE_MS,
  END_WAIT_MS,
  FAST_CHECK_MS,
  fastRestartDue,
  keepResultEvent,
  LANG_OF,
  LONG_SENTENCE,
  MAX_LISTEN_MS,
  NO_RESULT_STOP_MS,
  type ProbeEnv,
  type ProbeEvent,
  type ProbeRecord,
  parseStored,
  RESTART_END_WAIT_MS,
  ROW_COLUMNS,
  rowCells,
  rowOf,
  SPEAK_END_WAIT_MS,
  SPEAK_FIRST,
  SPEAK_SENTENCE,
  STRATEGIES,
  type StopReason,
  type Strategy,
  summaryOf,
} from "./probe-log";
import { MIC_TEXT } from "./probe-text";

const RECORDS_KEY = "momo.mic-probe.records";
const LOAD_KEY = "momo.mic-probe.load";

type RecognitionAlternativeLike = { transcript: string };
type RecognitionResultLike = {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: RecognitionAlternativeLike | undefined;
};
type RecognitionEventLike = {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    readonly [index: number]: RecognitionResultLike | undefined;
  };
};
type RecognitionErrorLike = { error?: string; message?: string };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onaudiostart: (() => void) | null;
  onsoundstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onsoundend: (() => void) | null;
  onaudioend: (() => void) | null;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

/** webkitSpeechRecognition 을 먼저 쓴다(브리프 — Safari 의 이름). */
function recognitionCtor(): {
  name: ProbeEnv["recognition"];
  ctor?: RecognitionCtor;
} {
  const w = window as unknown as {
    webkitSpeechRecognition?: RecognitionCtor;
    SpeechRecognition?: RecognitionCtor;
  };
  if (typeof w.webkitSpeechRecognition === "function") {
    return { name: "webkitSpeechRecognition", ctor: w.webkitSpeechRecognition };
  }
  if (typeof w.SpeechRecognition === "function") {
    return { name: "SpeechRecognition", ctor: w.SpeechRecognition };
  }
  return { name: "없음" };
}

function envOf(load: number): ProbeEnv {
  const session = (
    navigator as unknown as { audioSession?: { type?: unknown } }
  ).audioSession;
  return {
    userAgent: navigator.userAgent,
    visibility: document.visibilityState,
    audioSessionType: typeof session?.type === "string" ? session.type : null,
    recognition: recognitionCtor().name,
    load,
  };
}

const now = () => performance.now();

type Status =
  | { kind: "idle" }
  | { kind: "speaking"; strategy: Strategy; pressable: boolean }
  | { kind: "await-press"; strategy: Strategy }
  | { kind: "listening"; strategy: Strategy; attempt: number }
  | { kind: "no-recognition" };

type Run = {
  record: ProbeRecord;
  rec: Recognition | null;
  attempt: number;
  timers: number[];
  silenceTimer: number | null;
  stopping: boolean;
  restarting: boolean;
  /** F · G: '지금 눌러 말하기'를 받을 때. */
  awaitingPress: boolean;
  done: boolean;
};

/** 듣기 한 번의 진행(React 밖 — 사건 시각을 화면 갱신과 떼어 잰다). */
class ProbeRunner {
  private run: Run | null = null;
  private nth = 0;
  private lastEndAt: number | null = null;
  private lastRec: Recognition | null = null;
  private nextId: number;

  constructor(
    private readonly load: number,
    firstId: number,
    private readonly on: {
      status: (status: Status) => void;
      finish: (record: ProbeRecord) => void;
    },
  ) {
    this.nextId = firstId;
  }

  press(strategy: Strategy) {
    if (this.run !== null) return;
    if (strategy === "C") {
      // C: 누름 처리 안의 첫 일로 start 를 동기로 부른다(화면 갱신 · 읽기 취소 · setTimeout · await 없이)
      this.startAttempt(this.begin(strategy));
      return;
    }
    if (SPEAK_FIRST.includes(strategy)) {
      this.speakFirst(this.begin(strategy));
      return;
    }
    // A · B · E: 지금 앱과 같은 꼴 — 읽기 취소 · 화면 갱신 뒤 같은 누름 처리 안에서 새 객체로 start
    const run = this.begin(strategy);
    cancelSpeech();
    this.on.status({ kind: "listening", strategy, attempt: 1 });
    this.startAttempt(run);
  }

  /** F · G 의 '지금 눌러 말하기'. 그 누름 처리 안에서 동기로 start 한다. */
  pressNow() {
    const run = this.run;
    if (run === null || !run.awaitingPress || run.rec !== null) return;
    run.awaitingPress = false;
    this.push(run, { type: "press", at: now(), attempt: 0 });
    if (run.record.strategy === "G") {
      // G: 앱의 '읽어 주는 중 누르면 끊고 듣기'(C53 (2)) — speechSynthesis.cancel() 바로 뒤 start
      const speaking =
        typeof window.speechSynthesis === "object" &&
        window.speechSynthesis.speaking;
      this.push(run, {
        type: "speak-cancel",
        at: now(),
        attempt: 0,
        code: speaking ? "speaking" : "ended",
      });
      cancelSpeech();
      this.startAttempt(run);
      return;
    }
    // F: 앱의 '선생님 말 끝 뒤 누름'(child-turn) 꼴 — 읽기 취소 · 화면 갱신 뒤 같은 누름 처리 안에서 start
    cancelSpeech();
    this.on.status({
      kind: "listening",
      strategy: run.record.strategy,
      attempt: 1,
    });
    this.startAttempt(run);
  }

  stopNow() {
    const run = this.run;
    if (run === null) return;
    if (run.rec === null) {
      run.awaitingPress = false;
      cancelSpeech();
      run.record.stopReason = "user";
      this.finish(run, null);
      return;
    }
    this.stop(run, "user");
  }

  note(type: "hidden" | "visible") {
    const run = this.run;
    if (run !== null) this.push(run, { type, at: now(), attempt: run.attempt });
  }

  dispose() {
    const run = this.run;
    if (run === null) return;
    run.done = true;
    this.clearTimers(run);
    tryCall(() => run.rec?.abort());
    cancelSpeech();
    this.run = null;
  }

  private begin(strategy: Strategy): Run {
    const run: Run = {
      record: {
        id: this.nextId++,
        load: this.load,
        strategy,
        lang: LANG_OF[strategy],
        pressedAt: new Date().toISOString(),
        tapAt: now(),
        sincePrevEndMs: null,
        visibilityAtStart: document.visibilityState,
        attempts: [],
        events: [],
        stopReason: null,
        droppedInterims: 0,
      },
      rec: null,
      attempt: 0,
      timers: [],
      silenceTimer: null,
      stopping: false,
      restarting: false,
      awaitingPress: false,
      done: false,
    };
    this.run = run;
    return run;
  }

  /**
   * D · F · G: 앞 인식기를 abort 하고 읽는다(조사 2절 #3 — 읽는 동안 인식기를 살려 두지 않음).
   * D 는 읽기 끝 알림 안에서 곧바로 새 객체로 start(누름 밖 시작 자료). F 는 끝 알림 뒤 '지금 눌러 말하기'를 켜고 기다린다.
   * G 는 긴 글을 읽는 동안 '지금 눌러 말하기'가 켜져 있다(읽기가 먼저 끝나면 F 처럼 기다린다 — 표의 '취소 뒤' 괄호가 '아니요').
   */
  private speakFirst(run: Run) {
    const strategy = run.record.strategy;
    tryCall(() => this.lastRec?.abort());
    let settled = false;
    const afterSpeak = () => {
      if (settled || run.done || this.run !== run) return;
      settled = true;
      if (strategy === "D") {
        this.startAttempt(run);
        return;
      }
      // G 가 읽는 중에 눌러 이미 듣고 있으면 할 일이 없다
      if (run.rec !== null) return;
      run.awaitingPress = true;
      this.on.status({ kind: "await-press", strategy });
    };
    const synth =
      typeof window.speechSynthesis === "object"
        ? window.speechSynthesis
        : undefined;
    if (
      synth === undefined ||
      typeof window.SpeechSynthesisUtterance !== "function"
    ) {
      this.push(run, {
        type: "speak-error",
        at: now(),
        attempt: 0,
        code: "no-synthesis",
      });
      afterSpeak();
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(
      strategy === "G" ? LONG_SENTENCE : SPEAK_SENTENCE,
    );
    utterance.lang = LANG_OF[strategy];
    utterance.onstart = () =>
      this.push(run, { type: "speak-start", at: now(), attempt: 0 });
    utterance.onend = () => {
      this.push(run, { type: "speak-end", at: now(), attempt: 0 });
      afterSpeak();
    };
    utterance.onerror = (event) => {
      this.push(run, {
        type: "speak-error",
        at: now(),
        attempt: 0,
        code: event.error,
      });
      afterSpeak();
    };
    if (strategy === "G") {
      run.awaitingPress = true;
    } else {
      this.after(run, SPEAK_END_WAIT_MS, () => {
        if (settled) return;
        this.push(run, { type: "speak-end-missing", at: now(), attempt: 0 });
        afterSpeak();
      });
    }
    this.on.status({
      kind: "speaking",
      strategy,
      pressable: strategy === "G",
    });
    synth.speak(utterance);
  }

  private startAttempt(run: Run) {
    this.clearTimers(run);
    run.restarting = false;
    run.stopping = false;
    const attempt = run.record.attempts.length;
    const { ctor } = recognitionCtor();
    if (ctor === undefined) {
      this.push(run, { type: "no-recognition", at: now(), attempt });
      run.record.stopReason = "no-recognition";
      this.finish(run, null);
      this.on.status({ kind: "no-recognition" });
      return;
    }
    const rec = new ctor();
    rec.lang = run.record.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    this.attach(run, rec, attempt);
    run.rec = rec;
    run.attempt = attempt;
    this.lastRec = rec;
    this.nth += 1;
    const at = now();
    run.record.attempts.push({ startCallAt: at, nth: this.nth, lastText: "" });
    if (attempt === 0) {
      run.record.sincePrevEndMs =
        this.lastEndAt === null ? null : at - this.lastEndAt;
    }
    this.push(run, { type: "start-call", at, attempt });
    try {
      rec.start();
    } catch (error) {
      this.push(run, {
        type: "start-threw",
        at: now(),
        attempt,
        ...errorFields(error),
      });
      run.record.stopReason = "start-failed";
      this.finish(run, null);
      return;
    }
    this.on.status({
      kind: "listening",
      strategy: run.record.strategy,
      attempt: attempt + 1,
    });
    const current = () =>
      this.run === run && run.attempt === attempt && !run.done;
    this.after(run, MAX_LISTEN_MS, () => {
      if (current()) this.stop(run, "cap");
    });
    this.after(run, NO_RESULT_STOP_MS, () => {
      if (current() && !this.heard(run, attempt, ["result"])) {
        this.stop(run, "no-result");
      }
    });
    if (run.record.strategy === "B") {
      this.after(run, FAST_CHECK_MS, () => {
        if (current()) this.checkFast(run, attempt);
      });
    }
  }

  private attach(run: Run, rec: Recognition, attempt: number) {
    const current = () =>
      this.run === run && run.attempt === attempt && !run.done;
    const log = (type: ProbeEvent["type"]) => () => {
      if (!run.done) this.push(run, { type, at: now(), attempt });
    };
    rec.onaudiostart = log("audiostart");
    rec.onsoundstart = log("soundstart");
    rec.onspeechstart = log("speechstart");
    rec.onspeechend = log("speechend");
    rec.onsoundend = log("soundend");
    rec.onaudioend = log("audioend");
    rec.onresult = (event) => {
      if (run.done) return;
      let text = "";
      let finalText = "";
      let final = false;
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const said = result?.[0]?.transcript ?? "";
        text += said;
        if (result?.isFinal) {
          finalText += said;
          if (i >= event.resultIndex) final = true;
        }
      }
      const heard = text.trim();
      const slot = run.record.attempts[attempt];
      if (slot !== undefined) slot.lastText = heard;
      // 중간 글 원문은 사건에 남기지 않고 길이만, final 글만 남긴다(검토 M-4 · M-5)
      if (keepResultEvent(run.record, { attempt, final })) {
        this.push(run, {
          type: "result",
          at: now(),
          attempt,
          final,
          length: heard.length,
          ...(final ? { finalText: finalText.trim() } : {}),
        });
      } else {
        run.record.droppedInterims += 1;
      }
      if (!current() || run.stopping || run.restarting) return;
      if (run.silenceTimer !== null) window.clearTimeout(run.silenceTimer);
      run.silenceTimer = window.setTimeout(() => {
        if (current()) this.stop(run, "silence");
      }, END_SILENCE_MS);
    };
    rec.onerror = (event) => {
      if (run.done) return;
      this.push(run, {
        type: "error",
        at: now(),
        attempt,
        code: event.error ?? "",
        message: event.message ?? "",
      });
    };
    rec.onend = () => {
      if (run.done) return;
      const at = now();
      this.push(run, { type: "end", at, attempt });
      if (!current()) return;
      if (run.restarting) {
        this.startAttempt(run);
        return;
      }
      if (!run.stopping) run.record.stopReason ??= "natural";
      this.finish(run, at);
    };
  }

  /** B: 시작 알림이 빠르고 소리 · 말 · 결과가 없으면 abort → (end 또는 300ms) → 새 객체로 start. */
  private checkFast(run: Run, attempt: number) {
    const base = run.record.attempts[attempt]?.startCallAt ?? 0;
    const audiostart = run.record.events.find(
      (e) => e.attempt === attempt && e.type === "audiostart",
    );
    const due = fastRestartDue({
      audiostartMs: audiostart === undefined ? null : audiostart.at - base,
      heard: this.heard(run, attempt, ["soundstart", "speechstart", "result"]),
      restarts: attempt,
    });
    if (!due || run.stopping) return;
    run.restarting = true;
    this.push(run, {
      type: "abort-call",
      at: now(),
      attempt,
      code: "fast-restart",
    });
    tryCall(() => run.rec?.abort());
    this.after(run, RESTART_END_WAIT_MS, () => {
      if (this.run !== run || run.done || !run.restarting) return;
      this.push(run, { type: "end-missing", at: now(), attempt });
      this.startAttempt(run);
    });
  }

  private heard(
    run: Run,
    attempt: number,
    types: readonly ProbeEvent["type"][],
  ): boolean {
    return run.record.events.some(
      (e) => e.attempt === attempt && types.includes(e.type),
    );
  }

  private stop(run: Run, reason: StopReason) {
    if (run.stopping || run.restarting || run.done) return;
    run.stopping = true;
    run.record.stopReason ??= reason;
    if (run.silenceTimer !== null) window.clearTimeout(run.silenceTimer);
    this.push(run, {
      type: "stop-call",
      at: now(),
      attempt: run.attempt,
      code: reason,
    });
    tryCall(() => run.rec?.stop());
    this.after(run, END_WAIT_MS, () => {
      if (this.run !== run || run.done) return;
      this.push(run, { type: "end-missing", at: now(), attempt: run.attempt });
      run.record.stopReason = "end-missing";
      tryCall(() => run.rec?.abort());
      this.finish(run, null);
    });
  }

  private finish(run: Run, endAt: number | null) {
    if (run.done) return;
    run.done = true;
    this.clearTimers(run);
    this.run = null;
    this.lastEndAt = endAt ?? now();
    this.on.finish(run.record);
    if (run.record.stopReason !== "no-recognition") {
      this.on.status({ kind: "idle" });
    }
  }

  private push(run: Run, event: ProbeEvent) {
    // 끝난 기록은 이미 화면 · 저장소로 넘겼으므로 늦게 온 알림(읽기 끝 등)으로 바꾸지 않는다
    if (!run.done) run.record.events.push(event);
  }

  private after(run: Run, ms: number, fn: () => void) {
    run.timers.push(window.setTimeout(fn, ms));
  }

  private clearTimers(run: Run) {
    for (const id of run.timers) window.clearTimeout(id);
    run.timers = [];
    if (run.silenceTimer !== null) window.clearTimeout(run.silenceTimer);
    run.silenceTimer = null;
  }
}

function cancelSpeech() {
  if (typeof window.speechSynthesis === "object") {
    tryCall(() => window.speechSynthesis.cancel());
  }
}

function tryCall(fn: () => void) {
  try {
    fn();
  } catch {
    // 이미 끝난 인식기의 stop · abort 는 브라우저마다 던질 수 있다. 기록은 사건으로 남긴다.
  }
}

function errorFields(error: unknown): { code: string; message: string } {
  if (error instanceof Error)
    return { code: error.name, message: error.message };
  return { code: "unknown", message: String(error) };
}

function readStorage(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 저장했으면 true. 못 하면(개인 정보 보호 모드 · 한도 넘음) 화면에 알려 새로 고침 전에 복사하게 한다(검토 M-4). */
function writeStorage(key: string, value: string): boolean {
  try {
    window.sessionStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

type Line = { tone: "ok" | "error"; text: string } | null;

const bigButton =
  "min-h-20 rounded-2xl border-2 border-neutral-700 bg-white px-5 py-4 text-left font-bold text-2xl disabled:opacity-40";
const sectionClass =
  "space-y-3 rounded-2xl border border-neutral-300 bg-white p-5";

export function MicProbe() {
  const [ready, setReady] = useState(false);
  const [records, setRecords] = useState<ProbeRecord[]>([]);
  const [env, setEnv] = useState<ProbeEnv | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [copyLine, setCopyLine] = useState<Line>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const runner = useRef<ProbeRunner | null>(null);

  useEffect(() => {
    const stored = parseStored(readStorage(RECORDS_KEY));
    const load = (Number(readStorage(LOAD_KEY)) || 0) + 1;
    writeStorage(LOAD_KEY, String(load));
    const firstId = Math.max(0, ...stored.map((r) => r.id)) + 1;
    const current = new ProbeRunner(load, firstId, {
      status: setStatus,
      finish: (record) => setRecords((prev) => [...prev, record]),
    });
    runner.current = current;
    setRecords(stored);
    setEnv(envOf(load));
    if (recognitionCtor().ctor === undefined) {
      setStatus({ kind: "no-recognition" });
    }
    const onVisibility = () => {
      current.note(document.hidden ? "hidden" : "visible");
      setEnv(envOf(load));
    };
    document.addEventListener("visibilitychange", onVisibility);
    setReady(true);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      current.dispose();
      runner.current = null;
    };
  }, []);

  // 새로 고침 뒤에도 기록을 잇는다(쪽 안 저장소, 기기 밖으로 나가지 않음)
  useEffect(() => {
    if (ready)
      setSaveFailed(!writeStorage(RECORDS_KEY, JSON.stringify(records)));
  }, [ready, records]);

  const busy =
    status.kind === "speaking" ||
    status.kind === "await-press" ||
    status.kind === "listening";
  const canPressNow =
    status.kind === "await-press" ||
    (status.kind === "speaking" && status.pressable);
  const summary = summaryOf(records);
  const rows = records.map(rowOf).reverse();
  const last = rows[0];

  async function copy() {
    if (env === null) return;
    const text = copyTextOf(records, env);
    try {
      await navigator.clipboard.writeText(text);
      setCopyLine({ tone: "ok", text: MIC_TEXT.copied });
      setFallbackText(null);
    } catch {
      setCopyLine({ tone: "error", text: MIC_TEXT.copyFailed });
      setFallbackText(text);
    }
  }

  function clear() {
    setRecords([]);
    setFallbackText(null);
    setCopyLine({ tone: "ok", text: MIC_TEXT.cleared });
  }

  return (
    <main
      data-testid="mic-probe"
      data-ready={ready ? "true" : undefined}
      className="mx-auto max-w-4xl space-y-5 bg-neutral-50 p-5 text-lg text-neutral-900"
    >
      <h1 className="font-bold text-3xl">{MIC_TEXT.title}</h1>
      <section className={sectionClass}>
        <p className="font-bold text-2xl">{MIC_TEXT.guide}</p>
        <p className="text-xl">{MIC_TEXT.pressGuide}</p>
        <p className="text-xl">{MIC_TEXT.reloadGuide}</p>
      </section>

      <section className={sectionClass} data-testid="mic-env">
        <h2 className="font-semibold text-xl">{MIC_TEXT.envHeading}</h2>
        {env !== null && (
          <ul className="space-y-1 break-all text-base">
            <li>
              {MIC_TEXT.userAgent}: {env.userAgent}
            </li>
            <li>
              {MIC_TEXT.visibility}: {env.visibility}
            </li>
            <li>
              {MIC_TEXT.audioSession}: {env.audioSessionType ?? MIC_TEXT.none}
            </li>
            <li>
              {MIC_TEXT.recognition}: {env.recognition}
            </li>
            <li>
              {MIC_TEXT.load}: {env.load}
            </li>
          </ul>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {STRATEGIES.map((strategy) => (
          <button
            key={strategy}
            type="button"
            className={bigButton}
            disabled={!ready || busy || status.kind === "no-recognition"}
            onClick={() => runner.current?.press(strategy)}
          >
            {MIC_TEXT.strategy[strategy]}
          </button>
        ))}
        <button
          type="button"
          className={`${bigButton} bg-neutral-200`}
          disabled={!busy}
          onClick={() => runner.current?.stopNow()}
        >
          {MIC_TEXT.stop}
        </button>
        <button
          type="button"
          data-testid="mic-press-now"
          className={`${bigButton} sm:col-span-2 ${canPressNow ? "bg-neutral-900 text-white" : ""}`}
          disabled={!canPressNow}
          onClick={() => runner.current?.pressNow()}
        >
          {MIC_TEXT.pressNow}
        </button>
      </section>

      <section className={sectionClass}>
        <p
          role="status"
          data-testid="mic-status"
          className="font-bold text-2xl"
        >
          {statusText(status)}
        </p>
        {last !== undefined && (
          <p data-testid="mic-last" className="text-2xl">
            {last.strategy} ·{" "}
            {last.finalText || last.heardText
              ? MIC_TEXT.lastHeard(last.finalText || last.heardText)
              : MIC_TEXT.lastNothing}
          </p>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="font-semibold text-xl">{MIC_TEXT.summaryHeading}</h2>
        <table data-testid="mic-summary" className="w-full text-left text-xl">
          <thead>
            <tr>
              {MIC_TEXT.summaryColumns.map((c) => (
                <th key={c} className="pr-4">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.strategy}>
                <td className="pr-4">{s.strategy}</td>
                <td className="pr-4">{s.tries}</td>
                <td className="pr-4">{s.successes}</td>
                <td>{s.rate === null ? "-" : `${s.rate}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={sectionClass}>
        <h2 className="font-semibold text-xl">{MIC_TEXT.recordsHeading}</h2>
        <p className="text-base">{MIC_TEXT.recordsNote}</p>
        {rows.length === 0 ? (
          <p>{MIC_TEXT.noRecords}</p>
        ) : (
          <div className="overflow-x-auto">
            <table data-testid="mic-records" className="text-left text-base">
              <thead>
                <tr>
                  {ROW_COLUMNS.map((c) => (
                    <th key={c} className="whitespace-nowrap pr-3">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={row.success ? "" : "text-red-800"}
                  >
                    {rowCells(row).map((text, i) => (
                      <td
                        key={ROW_COLUMNS[i]}
                        className="whitespace-nowrap pr-3"
                      >
                        {text}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={bigButton}
            disabled={!ready || env === null}
            onClick={() => void copy()}
          >
            {MIC_TEXT.copy}
          </button>
          <button
            type="button"
            className="min-h-14 rounded-xl border border-neutral-500 bg-neutral-100 px-4 py-2 text-lg disabled:opacity-40"
            disabled={busy || records.length === 0}
            onClick={clear}
          >
            {MIC_TEXT.clear}
          </button>
        </div>
        {saveFailed && (
          <p data-testid="mic-save-failed" className="font-bold text-red-800">
            {MIC_TEXT.saveFailed}
          </p>
        )}
        <p
          role="status"
          data-testid="mic-copy-line"
          data-tone={copyLine?.tone}
          className={copyLine?.tone === "error" ? "font-bold text-red-800" : ""}
        >
          {copyLine?.text ?? ""}
        </p>
        {fallbackText !== null && (
          <textarea
            data-testid="mic-copy-fallback"
            readOnly
            rows={10}
            value={fallbackText}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full rounded-lg border border-neutral-400 p-2 font-mono text-sm"
          />
        )}
      </section>
    </main>
  );
}

function statusText(status: Status): string {
  switch (status.kind) {
    case "idle":
      return MIC_TEXT.idle;
    case "speaking":
      return status.pressable
        ? MIC_TEXT.speakingPressable(status.strategy)
        : MIC_TEXT.speaking(status.strategy);
    case "await-press":
      return MIC_TEXT.awaitPress;
    case "listening":
      return MIC_TEXT.listening(status.strategy, status.attempt);
    case "no-recognition":
      return MIC_TEXT.noRecognition;
  }
}

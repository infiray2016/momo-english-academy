"use client";

// 마이크 점검 쪽 본체(브리프 task-mic-probe 2026-11-06). iPad Safari 27 에서 회화 듣기가 '시작 알림 0.2초 안 + 소리 없음'으로 실패하는
// 꼴(분석 task-ipad-listen-analysis-report · 조사 docs/research/2026-11-06-iPad-사파리-음성-인식-no-speech-조사)의 회복 전략을
// 요청자 iPad 한 번(15분 안)으로 잰다. 앱 음성 접점(src/lib/speech)과 독립으로 webkitSpeechRecognition 을 직접 쓴다.
// fix 1(검토 I-3): D 는 읽기 끝 알림 안 자동 시작(누름 밖), F 는 읽기 끝 뒤 누름, G 는 읽는 중 누름(cancel 뒤 start).
// fix 2(요청자 측정 둘 뒤 · 분석 task-mic-probe-analysis-report P1~P6 · 조사 '추가 조사'): H 무음 읽기 뒤 누름, I 앱 첫 차례 재현,
// K 무음 WebAudio 켜 둔 채, L audioSession.type 넷, M 새 탭 첫 듣기. 기기 · 마이크 권한 · 탭 표지 · 지금 한 일 · 앞 세션 칸.
// fix 3(분석 10절 — 앞 듣기 뒤 40초 넘게 쉬면 성공): 쉼 타이머 · 쉼 45 · 90초 값, S 한 세션 계속 듣기, S2 세션 중 읽기, T abort 로 끝낸 뒤 A.
// fix 4: '자동 측정 시작' 한 번이면 쪽이 타이머로 순서를 돌리고(autoPlanOf), 듣기 기록마다 · 자동 끝에 요약을 dev 로그 끝점
// (/api/dev/mic-probe-log — 서버 console 만, 들은 글은 길이만)으로 보낸다. I 는 앱처럼 문장마다 0.8 빠르기 · 사이 700ms 로 읽는다(검토 M-a).
// fix 5(분석 10.16 — iOS 는 누름 안에서 한 번도 읽지 않은 쪽의 speak() 를 사건 없이 버린다): S · S2 누름 안에서 무음 읽기를 먼저 하고,
// S 세션 중에는 '세션 중 읽기' 단추로 누름 안에서 읽으며, speak() 직전마다 'speak-call'(speaking · pending)을 남긴다.
// fix 6(분석 10.17): 무음 읽기는 '읽기 제약 풀기' 단추로 빼고(S · S2 는 start 만 — 캡처 시작과 겹침 제거), '세션 중 읽기'는 줄을 비운 뒤 읽으며,
// W3 · W10 · W25 는 누름 안에서 버림 세션을 열고 n초 뒤 stop → 1초 뒤 진짜 세션(누름 밖 타이머), WebAudio 소리 1초 단추를 둔다.
// 단추 한 번 = 듣기 한 번 = 표 한 줄. 기록은 localStorage 에만 두어 새로 고침 · 새 탭 · 사파리 종료를 넘어 잇고, 탭끼리는 저장소 알림으로 맞춘다.
// DB 에 쓰지 않고 녹음하지 않는다(7절 — getUserMedia · MediaRecorder 없음, K 는 0 음량 재생만). audioSession 은 L 만 바꾸고 끝나면 되돌린다.
import { useEffect, useRef, useState } from "react";
import {
  AUTO_LISTEN_MS,
  AUTO_PRESS_DELAY_MS,
  type AutoStep,
  appendRecord,
  autoPlanOf,
  BEEP_GAIN,
  BEEP_HZ,
  BEEP_MS,
  BUTTON_STRATEGIES,
  CONTINUOUS_SESSION,
  copyTextOf,
  DECOY_ALIVE_MS,
  DECOY_GAP_MS,
  DECOY_MS,
  DECOY_SPEAK_AT_MS,
  deviceKindOf,
  END_SILENCE_MS,
  END_WAIT_MS,
  FAST_CHECK_MS,
  fastRestartDue,
  I_PAUSE_MS,
  I_RATE,
  I_SENTENCE_PAUSE_MS,
  keepResultEvent,
  LANG_OF,
  LONG_SENTENCE,
  MAX_LISTEN_MS,
  NO_RESULT_STOP_MS,
  type ProbeEnv,
  type ProbeEvent,
  type ProbeRecord,
  parseStored,
  RESET_STEPS,
  RESTART_END_WAIT_MS,
  type ResetStep,
  ROW_COLUMNS,
  recordLogOf,
  rowCells,
  rowOf,
  SESSION_MAX_MS,
  SESSION_TYPE_RESTORE,
  type SessionType,
  SPEAK_END_WAIT_MS,
  SPEAK_FIRST,
  SPEAK_SENTENCE,
  type StopMethod,
  type StopReason,
  type Strategy,
  SUMMARY_COLUMNS,
  sentencesOf,
  sessionTypeOf,
  summaryCells,
  summaryLogOf,
  summaryOf,
  tabMarkOf,
  UNLOCK_TEXT,
  UNLOCK_VOLUME,
} from "./probe-log";
import { MIC_TEXT } from "./probe-text";

/** 기기 안 저장소(localStorage — 탭 · 사파리 종료를 넘어 남음, 분석 P2). */
const RECORDS_KEY = "momo.mic-probe.records.v2";
const LOAD_KEY = "momo.mic-probe.load.v2";
/** 탭마다(sessionStorage). */
const TAB_KEY = "momo.mic-probe.tab";
const NEWTAB_KEY = "momo.mic-probe.newtab";
/** 서버 로그 끝점(fix 4 — preview · dev 에서만, 운영 배포는 404). */
const LOG_URL = "/api/dev/mic-probe-log";

/** 로그 몸 하나를 보낸다(쪽을 떠나도 가게 keepalive). 결과는 보냄 · 실패 수로만 센다. */
function postLog(body: string, onResult: (ok: boolean) => void) {
  try {
    fetch(LOG_URL, {
      method: "POST",
      body,
      keepalive: true,
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
    })
      .then((response) => onResult(response.ok))
      .catch(() => onResult(false));
  } catch {
    onResult(false);
  }
}

type LogStats = { sent: number; failed: number };
const nextLogStats = (prev: LogStats, ok: boolean): LogStats =>
  ok ? { ...prev, sent: prev.sent + 1 } : { ...prev, failed: prev.failed + 1 };

/** M 이 여는 새 탭의 주소 끝. 새 탭은 이것으로 새 표지를 만든다(window.open 이 sessionStorage 를 복사해도 가르게). */
const NEW_TAB_HASH = "#newtab";

/** I 가 읽는 선생님 말(첫 선생님의 영어 인사 · 목소리 높이 · 목소리 순서 — seed/teachers.json, 쪽 몸이 넘김). */
export type TeacherLine = { text: string; pitch: number; prefer: string[] };

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
type AudioSessionLike = { type: string };

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

function audioSessionOf(): AudioSessionLike | undefined {
  const session = (navigator as unknown as { audioSession?: AudioSessionLike })
    .audioSession;
  return typeof session?.type === "string" ? session : undefined;
}

function audioContextCtor(): (new () => AudioContext) | undefined {
  const w = window as unknown as {
    AudioContext?: new () => AudioContext;
    webkitAudioContext?: new () => AudioContext;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

function synthOf(): SpeechSynthesis | undefined {
  return typeof window.speechSynthesis === "object" &&
    typeof window.SpeechSynthesisUtterance === "function"
    ? window.speechSynthesis
    : undefined;
}

function navigationTypeOf(): string {
  const entry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return entry?.type ?? "-";
}

function randomTabId(): string {
  const uuid =
    typeof crypto.randomUUID === "function" ? crypto.randomUUID() : undefined;
  return (uuid ?? Math.random().toString(36).slice(2)).slice(0, 8);
}

const now = () => performance.now();

type Status =
  | { kind: "idle" }
  | { kind: "speaking"; strategy: Strategy; pressable: boolean }
  | { kind: "pausing"; strategy: Strategy }
  | { kind: "await-press"; strategy: Strategy }
  | { kind: "listening"; strategy: Strategy; attempt: number }
  | { kind: "decoy"; strategy: Strategy; seconds: number }
  | { kind: "no-recognition" };

type Run = {
  record: ProbeRecord;
  rec: Recognition | null;
  attempt: number;
  timers: number[];
  silenceTimer: number | null;
  stopping: boolean;
  restarting: boolean;
  /** 다시 열기 전에 end 뒤 기다릴 ms(W 의 버림 stop 뒤 1초, 그 밖 0). */
  restartDelayMs: number;
  /** F · G · H · I: '지금 눌러 말하기'를 받을 때. */
  awaitingPress: boolean;
  /** L: 끝나면 audioSession.type 을 되돌린다. */
  restoreSession: boolean;
  /** S2: 세션 중 읽기를 했는가. */
  midSpoken: boolean;
  done: boolean;
};

type RunnerContext = {
  load: number;
  tabId: string;
  tabFirstLoad: boolean;
  navigationType: string;
  resetStep: () => ResetStep;
  teacherLine: TeacherLine | null;
  /** W 읽기 켬 · 끔(누를 때의 값이 기록에 붙는다). */
  decoySpeak: () => boolean;
};

/** '읽기 제약 풀기'(V-1)의 결과(화면 · 다음 기록 칸). */
export type UnlockLog = {
  at: number;
  started: boolean;
  ended: boolean;
  error: string | null;
};

type RunnerEvents = {
  status: (status: Status) => void;
  finish: (record: ProbeRecord) => void;
  webAudio: (state: string | null) => void;
  session: (type: string | null) => void;
  /** 듣기가 끝난 때(performance.now — 기록의 '앞 끝 뒤'와 같은 기준). 쉼 타이머가 쓴다. */
  lastEnd: (at: number) => void;
  unlock: (log: UnlockLog) => void;
  beep: (state: string) => void;
};

type SpeakOptions = {
  text: string;
  utterance: "unlock" | "line";
  volume?: number;
  rate?: number;
  pitch?: number;
  prefer?: readonly string[];
};

/** 자동 측정의 진행(화면 표시용). nextAt 은 다음 차례를 시작할 때(performance.now), 지금 차례가 도는 중이면 null. */
export type AutoProgress = {
  index: number;
  total: number;
  step: AutoStep;
  nextAt: number | null;
};

type AutoHooks = {
  progress: (progress: AutoProgress | null) => void;
  done: (autoRun: string, hiddenCount: number) => void;
};

type AutoState = {
  plan: AutoStep[];
  autoRun: string;
  index: number;
  timer: number | null;
  hidden: number;
  hooks: AutoHooks;
};

/** 듣기 한 번의 진행(React 밖 — 사건 시각을 화면 갱신과 떼어 잰다). */
class ProbeRunner {
  private run: Run | null = null;
  private nth = 0;
  private lastEndAt: number | null = null;
  private lastStopReason: StopReason | null = null;
  private lastStopMethod: StopMethod | null = null;
  /** T 가 끝난 뒤 '지금 눌러 말하기'로 T-next(A 꼴)를 받을 때. */
  private followUp = false;
  /** 앞 듣기 끝(쪽 연 때) 뒤에 읽기(무음 포함)를 했는가. */
  private spokeSinceEnd = false;
  private lastRec: Recognition | null = null;
  private audio: { ctx: AudioContext; osc: OscillatorNode } | null = null;
  private auto: AutoState | null = null;
  /** 앞 듣기 끝 뒤에 누른 '읽기 제약 풀기'(다음 기록에 붙이고 끝에서 지운다). */
  private unlockLog: UnlockLog | null = null;

  constructor(
    private readonly ctx: RunnerContext,
    private readonly on: RunnerEvents,
  ) {}

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
    // A · B · E · K · L · M(새 탭): 지금 앱과 같은 꼴 — 읽기 취소 · 화면 갱신 뒤 같은 누름 처리 안에서 새 객체로 start
    const run = this.begin(strategy);
    if (strategy === "K") this.ensureWebAudio(run);
    const sessionType = sessionTypeOf(strategy);
    if (sessionType !== undefined) this.setSessionType(run, sessionType);
    cancelSpeech();
    // S · S2 의 누름 안 무음 읽기는 fix 6 에서 '읽기 제약 풀기' 단추로 뺐다(캡처 시작과 겹친 읽기가 멈추는지 가르려고, 분석 10.17 V-1)
    this.on.status({ kind: "listening", strategy, attempt: 1 });
    this.startAttempt(run);
  }

  /** S · S2 세션 중 '세션 중 읽기': 인식을 끊지 않고 이 누름 안에서 짧은 영어 문장을 읽는다. 누를 때마다 읽는다(U-2). */
  speakInSession() {
    const run = this.run;
    if (
      run === null ||
      run.rec === null ||
      run.stopping ||
      !CONTINUOUS_SESSION.includes(run.record.strategy)
    ) {
      return;
    }
    this.push(run, { type: "press", at: now(), attempt: run.attempt });
    // 줄을 비운 뒤 읽는다(V-2 — 앞 읽기가 줄에 남아 뒤 읽기가 밀리지 않게). 비우기 전 상태를 남긴다
    const synth = synthOf();
    this.push(run, {
      type: "speak-cancel",
      at: now(),
      attempt: run.attempt,
      code: "queue-clear",
      speaking: synth?.speaking === true,
      pending: synth?.pending === true,
    });
    cancelSpeech();
    this.midSpeak(run);
  }

  /** '읽기 제약 풀기'(V-1): 이 누름 안에서 앱과 같은 무음 읽기만 한다(듣기 없음). 결과는 다음 기록의 '앞 제약 풀기' 칸에 붙는다. */
  unlockSpeech() {
    if (this.run !== null) return;
    const log: UnlockLog = {
      at: now(),
      started: false,
      ended: false,
      error: null,
    };
    this.unlockLog = log;
    const report = () => this.on.unlock({ ...log });
    const synth = synthOf();
    if (synth === undefined) {
      log.error = "no-synthesis";
      report();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(UNLOCK_TEXT);
    utterance.lang = LANG_OF.A;
    utterance.volume = UNLOCK_VOLUME;
    utterance.onstart = () => {
      log.started = true;
      report();
    };
    utterance.onend = () => {
      log.ended = true;
      report();
    };
    utterance.onerror = (event) => {
      log.error = event.error;
      report();
    };
    this.spokeSinceEnd = true;
    synth.speak(utterance);
    report();
  }

  /** WebAudio 소리 1초(V-4): 이 누름 안에서 새 AudioContext 로 발진기를 들리게 재생한다. 듣는 중이면 그 기록에 사건을 남긴다. */
  beep() {
    const run = this.run;
    const note = (code: string, message?: string) => {
      if (run !== null && this.run === run) {
        this.push(run, {
          type: "webaudio-beep",
          at: now(),
          attempt: run.attempt,
          code,
          ...(message === undefined ? {} : { message }),
        });
      }
      this.on.beep(code);
    };
    const Ctor = audioContextCtor();
    if (Ctor === undefined) {
      note("unsupported");
      return;
    }
    try {
      const ctx = new Ctor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = BEEP_HZ;
      gain.gain.value = BEEP_GAIN;
      osc.connect(gain);
      gain.connect(ctx.destination);
      void ctx.resume().catch(() => undefined);
      osc.onended = () => {
        note("ended", ctx.state);
        void ctx.close().catch(() => undefined);
      };
      osc.start();
      osc.stop(ctx.currentTime + BEEP_MS / 1000);
      note(ctx.state, "start");
    } catch (error) {
      const fields = errorFields(error);
      note(fields.code, fields.message);
    }
  }

  /** F · G · H · I 의 '지금 눌러 말하기'. 그 누름 처리 안에서 동기로 start 한다. */
  pressNow() {
    if (this.run === null && this.followUp) {
      // T 뒤: 같은 누름 안에서 A 꼴로 한 번 더(종료 방식이 다음 세션을 가르는지, 분석 Q5)
      this.followUp = false;
      this.press("T-next");
      return;
    }
    const run = this.run;
    if (run === null || !run.awaitingPress || run.rec !== null) return;
    run.awaitingPress = false;
    this.push(run, { type: "press", at: now(), attempt: 0 });
    if (run.record.strategy === "G") {
      // G: 앱의 '읽어 주는 중 누르면 끊고 듣기'(C53 (2)) — speechSynthesis.cancel() 바로 뒤 start
      const speaking = synthOf()?.speaking === true;
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
    // F · H · I: 앱의 '선생님 말 끝 뒤 누름'(child-turn) 꼴 — 읽기 취소 · 화면 갱신 뒤 같은 누름 처리 안에서 start
    cancelSpeech();
    this.on.status({
      kind: "listening",
      strategy: run.record.strategy,
      attempt: 1,
    });
    this.startAttempt(run);
  }

  /** 자동 측정(fix 4): 첫 차례는 이 누름 안에서 곧바로, 나머지는 타이머로 시작한다. */
  startAuto(plan: AutoStep[], autoRun: string, hooks: AutoHooks) {
    if (this.run !== null || this.auto !== null) return;
    this.followUp = false;
    this.auto = { plan, autoRun, index: -1, timer: null, hidden: 0, hooks };
    this.runStep(0);
  }

  private runStep(index: number) {
    const auto = this.auto;
    if (auto === null) return;
    auto.timer = null;
    const step = auto.plan[index];
    if (step === undefined) {
      this.auto = null;
      auto.hooks.progress(null);
      auto.hooks.done(auto.autoRun, auto.hidden);
      return;
    }
    auto.index = index;
    auto.hooks.progress({
      index,
      total: auto.plan.length,
      step,
      nextAt: null,
    });
    if (step.kind === "webaudio-off") {
      this.stopWebAudio();
      this.scheduleNext();
      return;
    }
    if (step.strategy === "T-next" && this.followUp) {
      this.pressNow();
      return;
    }
    this.followUp = false;
    this.press(step.strategy);
  }

  /** 자동 측정의 다음 차례를 그 차례의 waitMs 뒤에 시작한다. */
  private scheduleNext() {
    const auto = this.auto;
    if (auto === null) return;
    const nextIndex = auto.index + 1;
    const next = auto.plan[nextIndex];
    const wait = next?.waitMs ?? 0;
    if (next !== undefined) {
      auto.hooks.progress({
        index: nextIndex,
        total: auto.plan.length,
        step: next,
        nextAt: now() + wait,
      });
    }
    auto.timer = window.setTimeout(() => this.runStep(nextIndex), wait);
  }

  private cancelAuto() {
    const auto = this.auto;
    if (auto === null) return;
    if (auto.timer !== null) window.clearTimeout(auto.timer);
    this.auto = null;
    auto.hooks.progress(null);
  }

  stopNow() {
    this.cancelAuto();
    const run = this.run;
    if (run === null) {
      if (this.followUp) {
        this.followUp = false;
        this.on.status({ kind: "idle" });
      }
      return;
    }
    if (run.rec === null) {
      run.awaitingPress = false;
      cancelSpeech();
      run.record.stopReason = "user";
      this.finish(run, null);
      return;
    }
    this.stop(run, "user");
  }

  /** K 의 무음 WebAudio 를 끈다(다른 전략을 WebAudio 없이 재고 싶을 때). */
  stopWebAudio() {
    const audio = this.audio;
    if (audio === null || this.run !== null) return;
    this.audio = null;
    // 닫기가 끝나며 오는 상태 알림이 머리 표시를 'closed' 로 되살리지 않게 먼저 뗀다(검토 M-c)
    audio.ctx.onstatechange = null;
    tryCall(() => audio.osc.stop());
    void audio.ctx.close().catch(() => undefined);
    this.on.webAudio(null);
  }

  note(type: "hidden" | "visible") {
    if (type === "hidden" && this.auto !== null) this.auto.hidden += 1;
    const run = this.run;
    if (run !== null) this.push(run, { type, at: now(), attempt: run.attempt });
  }

  dispose() {
    const auto = this.auto;
    if (auto !== null && auto.timer !== null) window.clearTimeout(auto.timer);
    this.auto = null;
    const run = this.run;
    if (run !== null) {
      if (run.restoreSession) restoreSessionType();
      run.done = true;
      this.clearTimers(run);
      tryCall(() => run.rec?.abort());
      cancelSpeech();
      this.run = null;
    }
    const audio = this.audio;
    if (audio !== null) {
      this.audio = null;
      audio.ctx.onstatechange = null;
      tryCall(() => audio.osc.stop());
      void audio.ctx.close().catch(() => undefined);
    }
  }

  private begin(strategy: Strategy): Run {
    const auto = this.auto;
    const step = auto?.plan[auto.index];
    const run: Run = {
      record: {
        // 번호는 저장소에 붙일 때 매긴다(appendRecord — 여러 탭이 같은 저장소를 쓴다)
        id: 0,
        load: this.ctx.load,
        tabId: this.ctx.tabId,
        tabFirstLoad: this.ctx.tabFirstLoad,
        navigationType: this.ctx.navigationType,
        resetStep:
          step?.kind === "listen" ? step.resetStep : this.ctx.resetStep(),
        strategy,
        lang: LANG_OF[strategy],
        pressedAt: new Date().toISOString(),
        tapAt: now(),
        sincePrevEndMs: null,
        prevStopReason: this.lastStopReason,
        prevStopMethod: this.lastStopMethod,
        ttsBetween: null,
        webAudioState: null,
        audioSessionType: null,
        visibilityAtStart: document.visibilityState,
        attempts: [],
        events: [],
        stopReason: null,
        stopMethod: null,
        droppedInterims: 0,
        autoRun: auto?.autoRun ?? null,
        autoStep: auto === null ? null : auto.index,
        decoy:
          DECOY_MS[strategy] === undefined
            ? null
            : {
                lengthMs: DECOY_MS[strategy],
                speak: this.ctx.decoySpeak(),
              },
        unlockBefore:
          this.unlockLog === null
            ? null
            : {
                ageMs: now() - this.unlockLog.at,
                started: this.unlockLog.started,
                ended: this.unlockLog.ended,
                error: this.unlockLog.error,
              },
      },
      rec: null,
      attempt: 0,
      timers: [],
      silenceTimer: null,
      stopping: false,
      restarting: false,
      restartDelayMs: 0,
      awaitingPress: false,
      restoreSession: false,
      midSpoken: false,
      done: false,
    };
    this.run = run;
    return run;
  }

  /** K: 첫 누름에 AudioContext 와 0 음량 발진기를 켜 두고(누름 처리 안), 그 뒤 K 는 그대로 둔 채 듣는다. */
  private ensureWebAudio(run: Run) {
    const existing = this.audio;
    if (existing !== null) {
      if (existing.ctx.state === "suspended") {
        void existing.ctx.resume().catch(() => undefined);
      }
      this.push(run, {
        type: "webaudio-start",
        at: now(),
        attempt: 0,
        code: existing.ctx.state,
        message: "reuse",
      });
      return;
    }
    const Ctor = audioContextCtor();
    if (Ctor === undefined) {
      this.push(run, {
        type: "webaudio-start",
        at: now(),
        attempt: 0,
        code: "unsupported",
      });
      return;
    }
    try {
      const ctx = new Ctor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      ctx.onstatechange = () => this.on.webAudio(ctx.state);
      void ctx.resume().catch(() => undefined);
      this.audio = { ctx, osc };
      this.push(run, {
        type: "webaudio-start",
        at: now(),
        attempt: 0,
        code: ctx.state,
        message: "new",
      });
      this.on.webAudio(ctx.state);
    } catch (error) {
      this.push(run, {
        type: "webaudio-start",
        at: now(),
        attempt: 0,
        ...errorFields(error),
      });
    }
  }

  /** L: audioSession.type 을 두고 듣는다. 끝나면 'auto' 로 되돌린다(finish). */
  private setSessionType(run: Run, type: SessionType) {
    const session = audioSessionOf();
    if (session === undefined) {
      this.push(run, {
        type: "session-type",
        at: now(),
        attempt: 0,
        code: type,
        message: "unsupported",
      });
      return;
    }
    try {
      session.type = type;
    } catch (error) {
      this.push(run, {
        type: "session-type",
        at: now(),
        attempt: 0,
        code: type,
        message: `threw ${errorFields(error).message}`,
      });
      return;
    }
    run.restoreSession = true;
    this.push(run, {
      type: "session-type",
      at: now(),
      attempt: 0,
      code: type,
      message: session.type,
    });
    this.on.session(session.type);
  }

  /**
   * D · F · G · H · I: 앞 인식기를 abort 하고 읽는다(조사 2절 #3 — 읽는 동안 인식기를 살려 두지 않음).
   * D 는 읽기 끝 알림 안에서 곧바로 새 객체로 start(누름 밖 시작 자료). F 는 끝 알림 뒤 '지금 눌러 말하기'를 켜고 기다린다.
   * G 는 긴 글을 읽는 동안 '지금 눌러 말하기'가 켜져 있다(읽기가 먼저 끝나면 F 처럼 기다린다 — 표의 '취소 뒤' 괄호가 '아니요').
   * H 는 앱 unlockFromGesture 와 같은 무음 읽기만 부르고 곧바로 기다린다(앱도 끝 알림을 기다리지 않는다). I 는 무음 읽기 → 선생님 인사 → 끝 뒤 1.5초 쉼 → 기다린다.
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
      if (strategy === "I") {
        this.on.status({ kind: "pausing", strategy });
        this.after(run, I_PAUSE_MS, () => {
          if (this.run === run && !run.done && run.rec === null) {
            this.awaitPress(run);
          }
        });
        return;
      }
      this.awaitPress(run);
    };
    const synth = synthOf();
    if (synth === undefined) {
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
    if (strategy === "H" || strategy === "I") {
      this.speak(
        run,
        synth,
        { text: UNLOCK_TEXT, utterance: "unlock", volume: UNLOCK_VOLUME },
        undefined,
      );
    }
    if (strategy === "H") {
      // H: 앱 unlockFromGesture 처럼 무음 읽기를 부른 뒤 끝 알림을 기다리지 않고 '지금 눌러 말하기'를 켠다(사건은 그대로 남는다)
      afterSpeak();
      return;
    }
    if (strategy === "I") {
      // I: 앱 읽기 대기열처럼 문장마다 따로 읽고 사이에 700ms 쉰다(빠르기 0.8 · 선생님 높이 · 목소리 순서, 검토 M-a)
      const teacher = this.ctx.teacherLine;
      const sentences = sentencesOf(teacher?.text ?? SPEAK_SENTENCE);
      const voice =
        teacher === null
          ? {}
          : { pitch: teacher.pitch, prefer: teacher.prefer };
      const speakAt = (i: number) => {
        if (settled || run.done || this.run !== run) return;
        const text = sentences[i];
        if (text === undefined) {
          afterSpeak();
          return;
        }
        this.speak(
          run,
          synth,
          { text, utterance: "line", rate: I_RATE, ...voice },
          () => {
            if (i + 1 >= sentences.length) afterSpeak();
            else this.after(run, I_SENTENCE_PAUSE_MS, () => speakAt(i + 1));
          },
        );
      };
      speakAt(0);
    } else {
      this.speak(
        run,
        synth,
        {
          text: strategy === "G" ? LONG_SENTENCE : SPEAK_SENTENCE,
          utterance: "line",
        },
        afterSpeak,
      );
    }
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
  }

  private speak(
    run: Run,
    synth: SpeechSynthesis,
    options: SpeakOptions,
    done: (() => void) | undefined,
  ) {
    const utterance = new SpeechSynthesisUtterance(options.text);
    utterance.lang = LANG_OF.A;
    if (options.volume !== undefined) utterance.volume = options.volume;
    if (options.rate !== undefined) utterance.rate = options.rate;
    if (options.pitch !== undefined) utterance.pitch = options.pitch;
    const voice =
      options.prefer === undefined
        ? undefined
        : preferredVoice(synth, options.prefer);
    if (voice !== undefined) utterance.voice = voice;
    const label = options.utterance;
    utterance.onstart = () =>
      this.push(run, {
        type: "speak-start",
        at: now(),
        attempt: 0,
        utterance: label,
        message: voice?.name ?? "기본",
      });
    utterance.onend = () => {
      this.push(run, {
        type: "speak-end",
        at: now(),
        attempt: 0,
        utterance: label,
      });
      done?.();
    };
    utterance.onerror = (event) => {
      this.push(run, {
        type: "speak-error",
        at: now(),
        attempt: 0,
        utterance: label,
        code: event.error,
      });
      done?.();
    };
    this.spokeSinceEnd = true;
    // speak() 직전의 읽기 상태(U-3): 이 뒤에 speak-start 가 없으면 브라우저가 버린 것이다
    const speaking = synth.speaking;
    const pending = synth.pending;
    this.push(run, {
      type: "speak-call",
      at: now(),
      attempt: 0,
      utterance: label,
      speaking,
      pending,
      code: `speaking=${speaking} pending=${pending}`,
    });
    synth.speak(utterance);
  }

  private awaitPress(run: Run) {
    run.awaitingPress = true;
    this.on.status({ kind: "await-press", strategy: run.record.strategy });
    // 자동 측정: 사람 대신 누른다(누름 밖 start — 안 되면 그 사실이 기록)
    if (this.auto !== null) {
      this.after(run, AUTO_PRESS_DELAY_MS, () => {
        if (this.run === run && run.awaitingPress) this.pressNow();
      });
    }
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
      run.record.ttsBetween = this.spokeSinceEnd;
      run.record.webAudioState = this.audio?.ctx.state ?? null;
      run.record.audioSessionType = audioSessionOf()?.type ?? null;
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
    const decoy = run.record.decoy;
    if (decoy !== null && attempt === 0) {
      // W 버림 세션: n초 뒤 stop → end 뒤 1초 → 진짜 세션(시도 2). 읽기 켬이면 2초 때 짧은 문장을 읽는다(누름 밖)
      this.on.status({
        kind: "decoy",
        strategy: run.record.strategy,
        seconds: decoy.lengthMs / 1000,
      });
      if (decoy.speak) {
        this.after(run, DECOY_SPEAK_AT_MS, () => {
          if (current()) this.midSpeak(run);
        });
      }
      this.after(run, decoy.lengthMs, () => {
        if (current()) this.endDecoy(run, "stop");
      });
      return;
    }
    if (this.auto !== null) {
      // 자동 측정: 말 없이도 audiostart 띠로 가르므로 4초 뒤 stop(결과가 없으면 no-result)
      this.after(run, AUTO_LISTEN_MS, () => {
        if (current()) {
          this.stop(
            run,
            this.heard(run, attempt, ["result"]) ? "cap" : "no-result",
          );
        }
      });
      return;
    }
    if (CONTINUOUS_SESSION.includes(run.record.strategy)) {
      // S · S2: 자동 멈춤 없이 상한 · '멈추기'로만 끝낸다. 저절로 온 end 는 '멈춤' natural 로 남는다
      this.after(run, SESSION_MAX_MS, () => {
        if (current()) this.stop(run, "cap");
      });
      return;
    }
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
      this.push(run, { type, at: now(), attempt });
    };
    rec.onaudiostart = () => {
      const at = now();
      this.push(run, { type: "audiostart", at, attempt });
      // W: 버림 세션이 살아 있으면(as > 250) 그 사실을 남기고 abort 한 뒤 곧바로 진짜를 연다(V-3)
      const base = run.record.attempts[attempt]?.startCallAt;
      if (
        run.record.decoy !== null &&
        attempt === 0 &&
        base !== undefined &&
        at - base > DECOY_ALIVE_MS &&
        current()
      ) {
        this.push(run, {
          type: "decoy-alive",
          at: now(),
          attempt,
          code: String(Math.round(at - base)),
        });
        this.endDecoy(run, "abort");
      }
    };
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
      const strategy = run.record.strategy;
      if (CONTINUOUS_SESSION.includes(strategy)) {
        // S2: 첫 final(또는 첫 결과 뒤 조용함 — 세션 중에는 final 이 늦을 수 있다) 뒤에 한 번 읽는다. 세션은 살려 둔다
        if (strategy !== "S2" || run.midSpoken) return;
        if (final) {
          this.midSpeak(run);
          return;
        }
        if (run.silenceTimer !== null) window.clearTimeout(run.silenceTimer);
        run.silenceTimer = window.setTimeout(() => {
          if (current() && !run.midSpoken) this.midSpeak(run);
        }, END_SILENCE_MS);
        return;
      }
      if (run.silenceTimer !== null) window.clearTimeout(run.silenceTimer);
      run.silenceTimer = window.setTimeout(() => {
        if (current()) this.stop(run, "silence");
      }, END_SILENCE_MS);
    };
    rec.onerror = (event) => {
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
        const delay = run.restartDelayMs;
        run.restartDelayMs = 0;
        if (delay > 0) {
          this.clearTimers(run);
          this.after(run, delay, () => {
            if (this.run === run && !run.done) this.startAttempt(run);
          });
          return;
        }
        this.startAttempt(run);
        return;
      }
      if (!run.stopping) run.record.stopReason ??= "natural";
      this.finish(run, at);
    };
  }

  /** W: 버림 세션을 끝내고(stop 이면 end 뒤 1초, abort 면 곧바로) 진짜 세션을 연다. end 가 안 오면 END_WAIT_MS 뒤 연다. */
  private endDecoy(run: Run, method: StopMethod) {
    if (run.restarting || run.stopping || run.done) return;
    run.restarting = true;
    run.restartDelayMs = method === "abort" ? 0 : DECOY_GAP_MS;
    this.push(run, {
      type: method === "abort" ? "abort-call" : "stop-call",
      at: now(),
      attempt: run.attempt,
      code: "decoy",
    });
    tryCall(() => (method === "abort" ? run.rec?.abort() : run.rec?.stop()));
    this.after(run, END_WAIT_MS, () => {
      if (this.run !== run || run.done || !run.restarting) return;
      this.push(run, { type: "end-missing", at: now(), attempt: run.attempt });
      this.startAttempt(run);
    });
  }

  /** S2 자동 · S '세션 중 읽기': 세션을 멈추지 않고 짧은 영어 문장을 읽는다(읽는 중 · 뒤에 인식이 살아 있는지, 분석 Q4). */
  private midSpeak(run: Run) {
    run.midSpoken = true;
    if (run.silenceTimer !== null) window.clearTimeout(run.silenceTimer);
    run.silenceTimer = null;
    const synth = synthOf();
    if (synth === undefined) {
      this.push(run, {
        type: "speak-error",
        at: now(),
        attempt: run.attempt,
        code: "no-synthesis",
      });
      return;
    }
    this.speak(
      run,
      synth,
      { text: SPEAK_SENTENCE, utterance: "line" },
      undefined,
    );
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
    // T: stop() 대신 abort() 로 끝낸다(분석 Q5 — 캡처 쪽은 같고 인식 작업을 finish 대신 cancel)
    const method: StopMethod = run.record.strategy === "T" ? "abort" : "stop";
    run.record.stopMethod ??= method;
    this.push(run, {
      type: method === "abort" ? "abort-call" : "stop-call",
      at: now(),
      attempt: run.attempt,
      code: reason,
    });
    tryCall(() => (method === "abort" ? run.rec?.abort() : run.rec?.stop()));
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
    if (run.restoreSession) {
      const read = restoreSessionType();
      this.push(run, {
        type: "session-restore",
        at: now(),
        attempt: run.attempt,
        code: SESSION_TYPE_RESTORE,
        message: read ?? "unsupported",
      });
      this.on.session(read);
    }
    run.done = true;
    this.clearTimers(run);
    this.run = null;
    const endedAt = endAt ?? now();
    this.lastEndAt = endedAt;
    this.lastStopReason = run.record.stopReason;
    this.lastStopMethod = run.record.stopMethod;
    this.spokeSinceEnd = false;
    this.unlockLog = null;
    this.on.finish(run.record);
    this.on.lastEnd(endedAt);
    if (run.record.stopReason === "no-recognition") {
      this.cancelAuto();
      return;
    }
    if (run.record.strategy === "T") {
      this.followUp = true;
      this.on.status({ kind: "await-press", strategy: "T-next" });
    } else {
      this.on.status({ kind: "idle" });
    }
    this.scheduleNext();
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

/** 목소리 순서(선생님 명단 voice.prefer)의 첫 맞는 목소리. 없으면 기본(앱도 순서가 비면 기본 꼴로 고른다). */
function preferredVoice(
  synth: SpeechSynthesis,
  prefer: readonly string[],
): SpeechSynthesisVoice | undefined {
  const voices = synth.getVoices();
  for (const name of prefer) {
    const found = voices.find((v) => v.name === name);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** audioSession.type 을 'auto' 로 되돌리고 읽은 값을 돌려준다(없으면 null). */
function restoreSessionType(): string | null {
  const session = audioSessionOf();
  if (session === undefined) return null;
  tryCall(() => {
    session.type = SESSION_TYPE_RESTORE;
  });
  return session.type;
}

function cancelSpeech() {
  const synth = synthOf();
  if (synth !== undefined) tryCall(() => synth.cancel());
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

function readStore(store: "local" | "session", key: string): string | null {
  try {
    return (
      store === "local" ? window.localStorage : window.sessionStorage
    ).getItem(key);
  } catch {
    return null;
  }
}

/** 저장했으면 true. 못 하면(개인 정보 보호 모드 · 한도 넘음) 화면에 알려 탭을 닫기 전에 복사하게 한다(검토 M-4). */
function writeStore(
  store: "local" | "session",
  key: string,
  value: string,
): boolean {
  try {
    (store === "local" ? window.localStorage : window.sessionStorage).setItem(
      key,
      value,
    );
    return true;
  } catch {
    return false;
  }
}

type Line = { tone: "ok" | "error"; text: string } | null;

const bigButton =
  "min-h-20 w-full rounded-2xl border-2 border-neutral-700 bg-white px-5 py-4 text-left font-bold text-2xl disabled:opacity-40";
const sectionClass =
  "space-y-3 rounded-2xl border border-neutral-300 bg-white p-5";

export function MicProbe({ teacherLine }: { teacherLine: TeacherLine | null }) {
  const [ready, setReady] = useState(false);
  const [records, setRecords] = useState<ProbeRecord[]>([]);
  const [env, setEnv] = useState<ProbeEnv | null>(null);
  const [audioSupported, setAudioSupported] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [resetStep, setResetStep] = useState<ResetStep>("as-is");
  const [copyLine, setCopyLine] = useState<Line>(null);
  const [openLine, setOpenLine] = useState<Line>(null);
  const [fallbackText, setFallbackText] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  /** 쉼 타이머(분석 Q1): 앞 듣기가 끝난 때와 지금(performance.now). */
  const [lastEndAt, setLastEndAt] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const runner = useRef<ProbeRunner | null>(null);
  const recordsRef = useRef<ProbeRecord[]>([]);
  const resetRef = useRef<ResetStep>("as-is");
  const teacherRef = useRef(teacherLine);
  /** 자동 측정(fix 4)의 진행 · 끝 알림과 서버 로그 보냄 · 실패 수. */
  const [autoProgress, setAutoProgress] = useState<AutoProgress | null>(null);
  const [autoDone, setAutoDone] = useState(false);
  const [logStats, setLogStats] = useState<LogStats>({ sent: 0, failed: 0 });
  /** fix 6: W 읽기 켬 · 끔, '읽기 제약 풀기' 결과, WebAudio 소리 상태. */
  const [decoySpeak, setDecoySpeak] = useState(true);
  const decoySpeakRef = useRef(true);
  const [unlockLog, setUnlockLog] = useState<UnlockLog | null>(null);
  const [beepState, setBeepState] = useState<string | null>(null);
  const envRef = useRef<ProbeEnv | null>(null);
  useEffect(() => {
    envRef.current = env;
  }, [env]);

  useEffect(() => {
    const forceNew = window.location.hash === NEW_TAB_HASH;
    const newTab = forceNew || readStore("session", NEWTAB_KEY) === "1";
    const mark = tabMarkOf(
      readStore("session", TAB_KEY),
      forceNew,
      randomTabId,
    );
    writeStore("session", TAB_KEY, mark.tabId);
    if (forceNew) {
      writeStore("session", NEWTAB_KEY, "1");
      // 새로 고침하면 같은 표지(처음 연 쪽 아님)로 읽히게 주소 끝을 지운다
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
    const load = (Number(readStore("local", LOAD_KEY)) || 0) + 1;
    writeStore("local", LOAD_KEY, String(load));
    const navigationType = navigationTypeOf();
    const stored = parseStored(readStore("local", RECORDS_KEY));
    recordsRef.current = stored;
    setRecords(stored);
    const initialReset: ResetStep = newTab ? "new-tab" : "as-is";
    resetRef.current = initialReset;
    setResetStep(initialReset);
    setAudioSupported(audioContextCtor() !== undefined);
    setEnv({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
      device: deviceKindOf({
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        maxTouchPoints: navigator.maxTouchPoints,
      }),
      micPermission: "-",
      visibility: document.visibilityState,
      audioSessionType: audioSessionOf()?.type ?? null,
      recognition: recognitionCtor().name,
      tabId: mark.tabId,
      tabFirstLoad: mark.firstLoad,
      newTab,
      navigationType,
      openedAt: new Date().toISOString(),
      load,
      webAudioState: null,
    });
    const patchEnv = (patch: Partial<ProbeEnv>) =>
      setEnv((prev) => (prev === null ? prev : { ...prev, ...patch }));

    const current = new ProbeRunner(
      {
        load,
        tabId: mark.tabId,
        tabFirstLoad: mark.firstLoad,
        navigationType,
        resetStep: () => resetRef.current,
        teacherLine: teacherRef.current,
        decoySpeak: () => decoySpeakRef.current,
      },
      {
        status: setStatus,
        finish: (record) => {
          // 다른 탭이 쓴 기록과 합친다(저장소가 정본). 저장소를 못 읽으면 이 쪽의 기록에 붙인다
          const raw = readStore("local", RECORDS_KEY);
          const base = raw === null ? recordsRef.current : parseStored(raw);
          const next = appendRecord(base, record);
          setSaveFailed(
            !writeStore("local", RECORDS_KEY, JSON.stringify(next)),
          );
          recordsRef.current = next;
          setRecords(next);
          // 서버 로그(손으로 누른 기록도 같다). 들은 글은 길이만 간다
          const logEnv = envRef.current;
          if (logEnv !== null) {
            postLog(recordLogOf(record, logEnv), (ok) =>
              setLogStats((prev) => nextLogStats(prev, ok)),
            );
          }
        },
        webAudio: (state) => patchEnv({ webAudioState: state }),
        session: (type) => patchEnv({ audioSessionType: type }),
        lastEnd: setLastEndAt,
        unlock: setUnlockLog,
        beep: setBeepState,
      },
    );
    runner.current = current;
    if (recognitionCtor().ctor === undefined) {
      setStatus({ kind: "no-recognition" });
    }

    // 마이크 권한(분석 P1). Safari 가 이 이름을 모르면 '-' 그대로
    let alive = true;
    let permission: PermissionStatus | undefined;
    const permissions = (navigator as { permissions?: Permissions })
      .permissions;
    if (typeof permissions?.query === "function") {
      permissions
        .query({ name: "microphone" as PermissionName })
        .then((state) => {
          if (!alive) return;
          permission = state;
          patchEnv({ micPermission: state.state });
          state.onchange = () => patchEnv({ micPermission: state.state });
        })
        .catch(() => undefined);
    }
    const onVisibility = () => {
      current.note(document.hidden ? "hidden" : "visible");
      patchEnv({ visibility: document.visibilityState });
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== RECORDS_KEY) return;
      const next = parseStored(event.newValue);
      recordsRef.current = next;
      setRecords(next);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    const tick = window.setInterval(() => setNowMs(performance.now()), 250);
    setReady(true);
    return () => {
      alive = false;
      window.clearInterval(tick);
      if (permission !== undefined) permission.onchange = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
      current.dispose();
      runner.current = null;
    };
  }, []);

  const busy =
    autoProgress !== null ||
    status.kind === "speaking" ||
    status.kind === "pausing" ||
    status.kind === "await-press" ||
    status.kind === "decoy" ||
    status.kind === "listening";
  const canPressNow =
    status.kind === "await-press" ||
    (status.kind === "speaking" && status.pressable);
  /** S · S2 세션이 도는 동안만 '세션 중 읽기'를 켠다(U-2 — 다른 전략 단추는 듣는 동안 꺼져 있다). */
  const canSpeakInSession =
    status.kind === "listening" && CONTINUOUS_SESSION.includes(status.strategy);
  const newTab = env?.newTab === true;
  const shown: readonly Strategy[] = newTab ? ["M"] : BUTTON_STRATEGIES;
  const pauseSeconds =
    lastEndAt === null
      ? null
      : Math.max(0, Math.floor((nowMs - lastEndAt) / 1000));
  const summary = summaryOf(records);
  const rows = records.map(rowOf).reverse();
  const last = rows[0];

  function disabledOf(strategy: Strategy): boolean {
    if (!ready || busy || env === null) return true;
    if (strategy === "M" && !newTab) return false;
    if (status.kind === "no-recognition") return true;
    if (strategy === "K") return !audioSupported;
    if (sessionTypeOf(strategy) !== undefined) {
      return env.audioSessionType === null;
    }
    return false;
  }

  function pressStrategy(strategy: Strategy) {
    if (strategy === "M" && !newTab) {
      // 새 탭(opener 없이 — 같은 탭 묶음 상태를 나누지 않게). 막히면 아무것도 열리지 않는다
      window.open(
        `${window.location.pathname}${window.location.search}${NEW_TAB_HASH}`,
        "_blank",
        "noopener",
      );
      setOpenLine({ tone: "ok", text: MIC_TEXT.newTabOpened });
      return;
    }
    runner.current?.press(strategy);
  }

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
    setSaveFailed(!writeStore("local", RECORDS_KEY, "[]"));
    recordsRef.current = [];
    setRecords([]);
    setFallbackText(null);
    setCopyLine({ tone: "ok", text: MIC_TEXT.cleared });
  }

  function countLog(ok: boolean) {
    setLogStats((prev) => nextLogStats(prev, ok));
  }

  function startAuto() {
    setAutoDone(false);
    runner.current?.startAuto(autoPlanOf(), randomTabId(), {
      progress: setAutoProgress,
      done: (autoRun, hiddenCount) => {
        setAutoDone(true);
        const logEnv = envRef.current;
        if (logEnv !== null) {
          postLog(
            summaryLogOf(recordsRef.current, logEnv, autoRun, hiddenCount),
            countLog,
          );
        }
      },
    });
  }

  function pickReset(value: string) {
    const step = RESET_STEPS.find((s) => s === value) ?? "as-is";
    resetRef.current = step;
    setResetStep(step);
  }

  return (
    <main
      data-testid="mic-probe"
      data-ready={ready ? "true" : undefined}
      className="mx-auto max-w-4xl space-y-5 bg-neutral-50 p-5 text-lg text-neutral-900"
    >
      <h1 className="font-bold text-3xl">
        {MIC_TEXT.title}
        {newTab && (
          <span
            data-testid="mic-newtab-mark"
            className="ml-3 rounded-lg bg-neutral-900 px-3 py-1 text-white"
          >
            {MIC_TEXT.newTabMark}
          </span>
        )}
      </h1>

      {!newTab && (
        <section className={sectionClass} data-testid="mic-auto">
          <button
            type="button"
            className={`${bigButton} bg-neutral-900 text-white`}
            disabled={!ready || busy || status.kind === "no-recognition"}
            onClick={startAuto}
          >
            {MIC_TEXT.autoStart}
          </button>
          <p className="text-xl">{MIC_TEXT.autoGuide}</p>
          {autoProgress !== null && (
            <p data-testid="mic-auto-progress" className="font-bold text-3xl">
              {autoText(autoProgress, nowMs)}
            </p>
          )}
          {autoDone && (
            <p data-testid="mic-auto-done" className="font-bold text-3xl">
              {MIC_TEXT.autoDone}
            </p>
          )}
        </section>
      )}

      <section className={sectionClass}>
        {newTab ? (
          <p className="font-bold text-2xl">{MIC_TEXT.newTabGuide}</p>
        ) : (
          <>
            <h2 className="font-semibold text-xl">{MIC_TEXT.orderHeading}</h2>
            <ol className="list-decimal space-y-1 pl-6 text-xl">
              {MIC_TEXT.order.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </>
        )}
        <p className="font-bold text-2xl">{MIC_TEXT.guide}</p>
        <p className="text-xl">{MIC_TEXT.pressGuide}</p>
        <p className="text-xl">{MIC_TEXT.reloadGuide}</p>
      </section>

      <section className={sectionClass} data-testid="mic-env">
        <h2 className="font-semibold text-xl">{MIC_TEXT.envHeading}</h2>
        {env !== null && (
          <ul className="space-y-1 break-all text-base">
            <li>
              {MIC_TEXT.device}: {env.device} · {MIC_TEXT.platform}{" "}
              {env.platform} · {MIC_TEXT.touchPoints} {env.maxTouchPoints}
            </li>
            <li data-testid="mic-permission">
              {MIC_TEXT.micPermission}: {env.micPermission}
            </li>
            <li>
              {MIC_TEXT.tab}: {env.tabId} · {MIC_TEXT.tabFirst}:{" "}
              {env.tabFirstLoad ? MIC_TEXT.yes : MIC_TEXT.no}
              {env.newTab ? ` · ${MIC_TEXT.newTabMark}` : ""}
            </li>
            <li>{MIC_TEXT.tabNote}</li>
            <li>
              {MIC_TEXT.navigation}: {env.navigationType} · {MIC_TEXT.openedAt}:{" "}
              {env.openedAt} · {MIC_TEXT.load}: {env.load}
            </li>
            <li>
              {MIC_TEXT.visibility}: {env.visibility} · {MIC_TEXT.audioSession}:{" "}
              {env.audioSessionType ?? MIC_TEXT.none} · {MIC_TEXT.recognition}:{" "}
              {env.recognition}
            </li>
            <li data-testid="mic-log-stats">
              {MIC_TEXT.logStats(logStats.sent, logStats.failed)}
            </li>
            <li data-testid="mic-webaudio">
              {MIC_TEXT.webAudio}: {env.webAudioState ?? MIC_TEXT.webAudioOff}
            </li>
            <li>
              {MIC_TEXT.userAgent}: {env.userAgent}
            </li>
          </ul>
        )}
        {env?.webAudioState != null && (
          <button
            type="button"
            className="min-h-14 rounded-xl border border-neutral-500 bg-neutral-100 px-4 py-2 text-lg disabled:opacity-40"
            disabled={busy}
            onClick={() => runner.current?.stopWebAudio()}
          >
            {MIC_TEXT.webAudioStop}
          </button>
        )}
      </section>

      <section className={sectionClass}>
        <p data-testid="mic-pause" className="font-bold text-4xl">
          {pauseSeconds === null
            ? MIC_TEXT.pauseNone
            : MIC_TEXT.pause(pauseSeconds)}
        </p>
        <p className="text-base">{MIC_TEXT.pauseNote}</p>
      </section>

      <section className={sectionClass}>
        <label className="block space-y-2">
          <span className="font-semibold text-xl">{MIC_TEXT.resetLabel}</span>
          <select
            data-testid="mic-reset"
            className="block min-h-14 w-full rounded-xl border-2 border-neutral-700 bg-white px-4 text-2xl"
            value={resetStep}
            disabled={busy}
            onChange={(event) => pickReset(event.currentTarget.value)}
          >
            {RESET_STEPS.map((step) => (
              <option key={step} value={step}>
                {MIC_TEXT.reset[step]}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="space-y-3">
        {!newTab && (
          <>
            <button
              type="button"
              data-testid="mic-unlock"
              className={bigButton}
              disabled={!ready || busy}
              onClick={() => runner.current?.unlockSpeech()}
            >
              {MIC_TEXT.unlock}
            </button>
            <p role="status" data-testid="mic-unlock-line">
              {unlockLog === null
                ? ""
                : MIC_TEXT.unlockLine(
                    unlockLog.started,
                    unlockLog.ended,
                    unlockLog.error,
                  )}
            </p>
            <button
              type="button"
              data-testid="mic-decoy-speak"
              aria-pressed={decoySpeak}
              className={bigButton}
              disabled={busy}
              onClick={() => {
                decoySpeakRef.current = !decoySpeak;
                setDecoySpeak(!decoySpeak);
              }}
            >
              {MIC_TEXT.decoySpeakToggle(decoySpeak)}
            </button>
          </>
        )}
        {shown.map((strategy) => (
          <button
            key={strategy}
            type="button"
            className={bigButton}
            disabled={disabledOf(strategy)}
            onClick={() => pressStrategy(strategy)}
          >
            {newTab && strategy === "M"
              ? MIC_TEXT.newTabListen
              : MIC_TEXT.strategy[strategy]}
          </button>
        ))}
        <p role="status" data-testid="mic-open-line">
          {openLine?.text ?? ""}
        </p>
        <button
          type="button"
          data-testid="mic-press-now"
          className={`${bigButton} ${canPressNow ? "bg-neutral-900 text-white" : ""}`}
          disabled={!canPressNow}
          onClick={() => runner.current?.pressNow()}
        >
          {MIC_TEXT.pressNow}
        </button>
        <button
          type="button"
          data-testid="mic-speak-in-session"
          className={`${bigButton} ${canSpeakInSession ? "bg-neutral-900 text-white" : ""}`}
          disabled={!canSpeakInSession}
          onClick={() => runner.current?.speakInSession()}
        >
          {MIC_TEXT.speakInSession}
        </button>
        <button
          type="button"
          data-testid="mic-beep"
          className={bigButton}
          disabled={!ready}
          onClick={() => runner.current?.beep()}
        >
          {MIC_TEXT.beep}
        </button>
        <p role="status" data-testid="mic-beep-line">
          {beepState === null ? "" : MIC_TEXT.beepLine(beepState)}
        </p>
        <button
          type="button"
          className={`${bigButton} bg-neutral-200`}
          disabled={!busy}
          onClick={() => runner.current?.stopNow()}
        >
          {MIC_TEXT.stop}
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
              {SUMMARY_COLUMNS.map((c) => (
                <th key={c} className="pr-4">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.strategy}>
                {summaryCells(s).map((text, i) => (
                  <td key={SUMMARY_COLUMNS[i]} className="pr-4">
                    {text}
                  </td>
                ))}
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

/** 자동 측정 진행 한 줄: 차례 · 전략(지금 한 일) · 다음까지 남은 초 또는 '도는 중'. */
function autoText(progress: AutoProgress, nowMs: number): string {
  const { step } = progress;
  const label =
    step.kind === "webaudio-off"
      ? MIC_TEXT.autoWebAudioOff
      : step.resetStep === "as-is"
        ? step.strategy
        : `${step.strategy}(${MIC_TEXT.reset[step.resetStep]})`;
  const head = MIC_TEXT.autoStep(progress.index + 1, progress.total, label);
  if (progress.nextAt === null) return `${head} · ${MIC_TEXT.autoRunning}`;
  const left = Math.max(0, Math.ceil((progress.nextAt - nowMs) / 1000));
  return `${head} · ${MIC_TEXT.autoWait(left)}`;
}

function statusText(status: Status): string {
  switch (status.kind) {
    case "idle":
      return MIC_TEXT.idle;
    case "speaking":
      return status.pressable
        ? MIC_TEXT.speakingPressable(status.strategy)
        : MIC_TEXT.speaking(status.strategy);
    case "pausing":
      return MIC_TEXT.pausing(status.strategy);
    case "await-press":
      return status.strategy === "T-next"
        ? MIC_TEXT.awaitFollowUp
        : MIC_TEXT.awaitPress;
    case "decoy":
      return MIC_TEXT.decoyRunning(status.strategy, status.seconds);
    case "listening":
      return DECOY_MS[status.strategy] === undefined
        ? MIC_TEXT.listening(status.strategy, status.attempt)
        : MIC_TEXT.decoyReal(status.strategy);
    case "no-recognition":
      return MIC_TEXT.noRecognition;
  }
}

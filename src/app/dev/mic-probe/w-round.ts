// 마이크 점검 쪽(/dev/mic-probe)의 '자동 W 라운드' 러너(브리프 task-mic-probe-fix7 2026-11-07, 분석 10.18.3 X-1~X-6 · 자동 차례 0~8).
// 누름 안에서 무음 읽기로 읽기 제약을 풀고 끝 알림 뒤 45초 쉰 다음, 차례마다 버림 세션(3 · 5 · 10초, 2초 때 읽기 켬 · 끔) → stop → 1초 →
// 진짜 세션을 스스로 돌린다(인식 start 는 누름 밖 타이머). 버림이 살아 있으면(as > 250) abort 하고 (나) 두 번째 버림 10초 또는 (가) 세션
// 없이 읽기 → 진짜로 간다. 차례 7 의 진짜는 S 꼴(첫 final 2초 뒤 줄 비우기 → 한 문장 읽기 → 'banana'). 화면에는 진짜 start 를 부를 때만
// 'apple'(· 'banana'), 그 밖에는 '기다려요' · '준비 중'만 보인다(X-2 — 보이는 글은 view 로 넘기고 문구는 쪽이 고른다).
// React · DOM 없는 모듈이다. 인식 · 읽기 · 시계 · 타이머는 deps 로 받아 단위 시험(tests/unit/mic-probe-round.test.ts)이 가짜로 돌린다.
// 녹음하지 않는다(getUserMedia · MediaRecorder 없음). 기록 꼴은 probe-log 의 ProbeRecord(strategy WR · round 칸).
import {
  DECOY_ALIVE_MS,
  DECOY_GAP_MS,
  DECOY_SPEAK_AT_MS,
  END_WAIT_MS,
  I_RATE,
  keepResultEvent,
  LANG_OF,
  MAX_LISTEN_MS,
  NO_RESULT_STOP_MS,
  type ProbeEvent,
  type ProbeRecord,
  ROUND_S_MAX_MS,
  ROUND_S_SPEAK_AFTER_MS,
  ROUND_SECOND_DECOY_MS,
  ROUND_SILENCE_MS,
  type RoundPlanStep,
  type RoundWord,
  roundNextOf,
  roundPathOf,
  roundSurvivalOf,
  SPEAK_END_WAIT_MS,
  type StopMethod,
  type StopReason,
  UNLOCK_TEXT,
  UNLOCK_VOLUME,
  W_ROUND_SENTENCE,
} from "./probe-log";

type ResultLike = {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: { transcript: string } | undefined;
};
/** webkitSpeechRecognition 의 쓰는 몫(쪽의 Recognition 꼴과 같다). */
export type RoundRecognition = {
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
  onresult:
    | ((event: {
        readonly resultIndex: number;
        readonly results: {
          readonly length: number;
          readonly [index: number]: ResultLike | undefined;
        };
      }) => void)
    | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
};

export type RoundSpeakOptions = {
  text: string;
  volume?: number;
  rate?: number;
  pitch?: number;
  prefer?: readonly string[];
};
export type RoundSpeakHandlers = {
  /** 시작 알림(고른 목소리 이름, 없으면 '기본'). */
  start: (voice: string) => void;
  end: () => void;
  error: (code: string) => void;
};
/** speechSynthesis 의 쓰는 몫. 쪽이 SpeechSynthesisUtterance 로 잇는다. */
export type RoundSpeech = {
  state(): { speaking: boolean; pending: boolean };
  speak(options: RoundSpeakOptions, handlers: RoundSpeakHandlers): void;
  cancel(): void;
};

export type RoundDeps = {
  now(): number;
  later(fn: () => void, ms: number): number;
  cancelLater(id: number): void;
  /** 새 인식 객체. 인식이 없으면 null. */
  createRecognition(): RoundRecognition | null;
  /** 읽기. 없으면 null. */
  speech(): RoundSpeech | null;
  visibility(): string;
  isoNow(): string;
};

/** 쪽(ProbeRunner)과 나누는 상태: 기록 머리 · 이 쪽의 인식 객체 번호 · 앞 듣기 끝 · 그 뒤 읽기 여부. */
export type RoundContext = {
  header: Pick<
    ProbeRecord,
    "load" | "tabId" | "tabFirstLoad" | "navigationType"
  >;
  nextNth(): number;
  prevEnd(): {
    at: number | null;
    reason: StopReason | null;
    method: StopMethod | null;
  };
  spokeSinceEnd(): boolean;
  markSpoke(): void;
  /** 첫 start 호출 때의 무음 WebAudio · audioSession.type. */
  snapshot(): { webAudioState: string | null; audioSessionType: string | null };
  /** 읽는 목소리(첫 선생님 높이 · 목소리 순서). 없으면 기본 목소리 · 빠르기. */
  teacher: { pitch: number; prefer: readonly string[] } | null;
};

/** 화면에 보일 것(X-2). say 만 큰 글씨 낱말, rest 는 남은 초, 나머지는 '기다려요'. */
export type RoundView =
  | { kind: "wait" }
  | { kind: "rest"; until: number }
  | { kind: "say"; word: RoundWord }
  | { kind: "done"; n: number; m: number };

export type RoundEvents = {
  view(view: RoundView | null): void;
  /** 차례 하나가 끝난 때(기록 · 그 진짜 end 때). */
  finish(record: ProbeRecord, endAt: number): void;
  done(result: {
    autoRun: string;
    hidden: number;
    survived: { n: number; m: number };
    stopped: boolean;
  }): void;
};

type StepRun = {
  plan: RoundPlanStep;
  record: ProbeRecord;
  rec: RoundRecognition | null;
  attempt: number;
  phase: "decoy" | "ending" | "bare" | "real" | "stopping";
  /** 버림마다 살아 있었는가(차례 안 차례대로). */
  alive: boolean[];
  timers: number[];
  silence: number | null;
  /** stop · abort 뒤 end 를 기다리는 이음(END_WAIT_MS 뒤 end 없이 부른다). */
  onEnd: ((at: number | null) => void) | null;
  /** S 꼴: apple(첫 final 기다림) → reading(2초 뒤 읽기) → banana. */
  stage: "apple" | "reading" | "banana";
  bananaAt: number | null;
  done: boolean;
};

type Unlock = {
  at: number;
  started: boolean;
  ended: boolean;
  error: string | null;
};

export class WRoundRunner {
  private stepRun: StepRun | null = null;
  private roundTimers: number[] = [];
  private index = -1;
  private hidden = 0;
  private over = false;
  private unlock: Unlock | null = null;
  private readonly finished: ProbeRecord[] = [];

  constructor(
    private readonly ctx: RoundContext,
    private readonly deps: RoundDeps,
    private readonly on: RoundEvents,
    private readonly plan: readonly RoundPlanStep[],
    readonly autoRun: string,
  ) {}

  /** 단추 누름 안에서 부른다: 무음 읽기(앱 unlockFromGesture 와 같은 글 · 음량 0)로 제약을 풀고 끝 알림(또는 상한) 뒤 차례 0 을 기다린다. */
  start() {
    const unlock: Unlock = {
      at: this.deps.now(),
      started: false,
      ended: false,
      error: null,
    };
    this.unlock = unlock;
    this.on.view({ kind: "wait" });
    let settled = false;
    const next = () => {
      if (settled || this.over) return;
      settled = true;
      this.clearRoundTimers();
      this.schedule(0);
    };
    const speech = this.deps.speech();
    if (speech === null) {
      unlock.error = "no-synthesis";
      next();
      return;
    }
    this.ctx.markSpoke();
    speech.speak(
      { text: UNLOCK_TEXT, volume: UNLOCK_VOLUME },
      {
        start: () => {
          unlock.started = true;
        },
        end: () => {
          unlock.ended = true;
          next();
        },
        error: (code) => {
          unlock.error = code;
          next();
        },
      },
    );
    this.roundLater(SPEAK_END_WAIT_MS, next);
  }

  /** '멈추기': 도는 차례를 abort 로 끝내 기록하고(멈춤 user) 라운드를 끝낸다. */
  stop() {
    if (this.over) return;
    this.over = true;
    this.clearRoundTimers();
    const run = this.stepRun;
    if (run !== null && !run.done) {
      this.push(run, {
        type: "abort-call",
        at: this.deps.now(),
        attempt: run.attempt,
        code: "user",
      });
      run.record.stopReason ??= "user";
      run.record.stopMethod ??= "abort";
      const rec = run.rec;
      this.finishStep(run, null);
      tryCall(() => rec?.abort());
    }
    this.deps.speech()?.cancel();
    this.on.view(null);
    this.on.done({
      autoRun: this.autoRun,
      hidden: this.hidden,
      survived: roundSurvivalOf(this.finished),
      stopped: true,
    });
  }

  /** 쪽을 떠날 때: 알림 없이 모두 끊는다. */
  dispose() {
    this.over = true;
    this.clearRoundTimers();
    const run = this.stepRun;
    if (run !== null) {
      run.done = true;
      this.clearTimers(run);
      tryCall(() => run.rec?.abort());
      this.stepRun = null;
    }
  }

  note(type: "hidden" | "visible") {
    if (type === "hidden") this.hidden += 1;
    const run = this.stepRun;
    if (run !== null) {
      this.push(run, { type, at: this.deps.now(), attempt: run.attempt });
    }
  }

  // ---- 차례 ----

  private schedule(index: number) {
    if (this.over) return;
    const step = this.plan[index];
    if (step === undefined) {
      this.complete();
      return;
    }
    this.on.view(
      step.rest
        ? { kind: "rest", until: this.deps.now() + step.waitMs }
        : { kind: "wait" },
    );
    this.roundLater(step.waitMs, () => this.runStep(index));
  }

  private complete() {
    this.over = true;
    const survived = roundSurvivalOf(this.finished);
    this.on.view({ kind: "done", ...survived });
    this.on.done({
      autoRun: this.autoRun,
      hidden: this.hidden,
      survived,
      stopped: false,
    });
  }

  private runStep(index: number) {
    if (this.over) return;
    const plan = this.plan[index];
    if (plan === undefined) return;
    this.index = index;
    const prev = this.ctx.prevEnd();
    const unlock = this.unlock;
    this.unlock = null;
    const record: ProbeRecord = {
      id: 0,
      ...this.ctx.header,
      resetStep: plan.resetStep,
      strategy: "WR",
      lang: LANG_OF.WR,
      pressedAt: this.deps.isoNow(),
      tapAt: this.deps.now(),
      sincePrevEndMs: null,
      prevStopReason: prev.reason,
      prevStopMethod: prev.method,
      ttsBetween: null,
      webAudioState: null,
      audioSessionType: null,
      visibilityAtStart: this.deps.visibility(),
      attempts: [],
      events: [],
      stopReason: null,
      stopMethod: null,
      droppedInterims: 0,
      autoRun: this.autoRun,
      autoStep: index,
      decoy: null,
      unlockBefore:
        unlock === null
          ? null
          : {
              ageMs: this.deps.now() - unlock.at,
              started: unlock.started,
              ended: unlock.ended,
              error: unlock.error,
            },
      round: {
        step: plan.step,
        decoyMs: plan.decoyMs,
        speak: plan.speak,
        live: plan.live,
        real: plan.real,
        path: "dead",
        slots: [],
        sound: null,
        sentence: null,
        cancel: null,
        waitSound: null,
        group: null,
      },
    };
    const run: StepRun = {
      plan,
      record,
      rec: null,
      attempt: 0,
      phase: "decoy",
      alive: [],
      timers: [],
      silence: null,
      onEnd: null,
      stage: "apple",
      bananaAt: null,
      done: false,
    };
    this.stepRun = run;
    this.openDecoy(run, plan.decoyMs, plan.speak);
  }

  /** 버림 세션: 정한 길이 뒤 stop(죽은 버림), 시작 알림이 250ms 넘게 늦으면 곧바로 abort(살아 있는 버림). 읽기 켬이면 2초 때 한 문장. */
  private openDecoy(run: StepRun, plannedMs: number, speak: boolean) {
    run.phase = "decoy";
    run.record.round?.slots.push({ role: "decoy", plannedMs, speak });
    this.on.view({ kind: "wait" });
    const attempt = this.startRec(run);
    if (attempt === null) return;
    const current = () => this.isCurrent(run, attempt) && run.phase === "decoy";
    if (speak) {
      this.after(run, DECOY_SPEAK_AT_MS, () => {
        if (current()) this.speakLine(run, "line", undefined);
      });
    }
    this.after(run, plannedMs, () => {
      if (current()) this.endDecoy(run, "stop");
    });
  }

  private endDecoy(run: StepRun, method: StopMethod) {
    if (run.phase !== "decoy") return;
    run.phase = "ending";
    this.clearTimers(run);
    const alive = method === "abort";
    run.alive.push(alive);
    if (run.record.round !== null) {
      run.record.round.path = roundPathOf(run.plan.live, run.alive);
    }
    this.push(run, {
      type: method === "abort" ? "abort-call" : "stop-call",
      at: this.deps.now(),
      attempt: run.attempt,
      code: "decoy",
    });
    this.awaitEnd(run, () => this.afterDecoy(run, alive));
    tryCall(() => (method === "abort" ? run.rec?.abort() : run.rec?.stop()));
  }

  /** 버림이 저절로 끝났다(end 가 먼저 옴): 죽은 버림처럼 1초 뒤 진짜로 간다. 실제 길이는 기록에 남는다. */
  private decoyEndedEarly(run: StepRun) {
    run.phase = "ending";
    this.clearTimers(run);
    run.alive.push(false);
    if (run.record.round !== null) {
      run.record.round.path = roundPathOf(run.plan.live, run.alive);
    }
    this.afterDecoy(run, false);
  }

  private afterDecoy(run: StepRun, alive: boolean) {
    if (run.done || this.stepRun !== run) return;
    const next = roundNextOf(run.plan.live, run.alive.length - 1, alive);
    if (next === "decoy") {
      this.openDecoy(run, ROUND_SECOND_DECOY_MS, true);
      return;
    }
    if (next === "bare") {
      this.bareSpeak(run);
      return;
    }
    this.after(run, DECOY_GAP_MS, () => {
      if (!run.done && this.stepRun === run) this.openReal(run);
    });
  }

  /** 길 (가): 세션 없이 한 문장을 읽고, 끝 알림(또는 상한) 1초 뒤 진짜를 연다. */
  private bareSpeak(run: StepRun) {
    run.phase = "bare";
    let settled = false;
    const next = () => {
      if (settled || run.done || this.stepRun !== run) return;
      settled = true;
      this.clearTimers(run);
      this.after(run, DECOY_GAP_MS, () => {
        if (!run.done && this.stepRun === run) this.openReal(run);
      });
    };
    this.speakLine(run, "bare", next);
    this.after(run, SPEAK_END_WAIT_MS, () => {
      if (settled) return;
      this.push(run, {
        type: "speak-end-missing",
        at: this.deps.now(),
        attempt: run.attempt,
        utterance: "bare",
      });
      next();
    });
  }

  /** 진짜 세션: start 를 부를 때 화면에 크게 'apple'. 결과 없이 6초 · 결과 뒤 1.5초 조용하면 stop(S 꼴은 X-5). */
  private openReal(run: StepRun) {
    run.phase = "real";
    run.record.round?.slots.push({
      role: "real",
      plannedMs: null,
      speak: false,
    });
    this.push(run, {
      type: "prompt",
      at: this.deps.now(),
      attempt: run.record.attempts.length,
      code: "apple",
    });
    this.on.view({ kind: "say", word: "apple" });
    const attempt = this.startRec(run);
    if (attempt === null) return;
    const current = () => this.isCurrent(run, attempt) && run.phase === "real";
    this.after(
      run,
      run.plan.real === "s" ? ROUND_S_MAX_MS : MAX_LISTEN_MS,
      () => {
        if (current()) this.stopReal(run, "cap");
      },
    );
    this.after(run, NO_RESULT_STOP_MS, () => {
      if (current() && !this.heard(run, attempt)) {
        this.stopReal(run, "no-result");
      }
    });
  }

  private onRealResult(run: StepRun, final: boolean, at: number) {
    if (run.plan.real === "plain") {
      if (final) this.on.view({ kind: "wait" });
      this.quiet(run, () => this.stopReal(run, "silence"));
      return;
    }
    if (run.stage === "apple") {
      if (final) {
        this.toReading(run);
        return;
      }
      // 세션 중에는 final 이 늦을 수 있다: 결과 뒤 조용하면 apple 을 다 말한 것으로 본다
      this.quiet(run, () => this.toReading(run));
      return;
    }
    if (run.stage !== "banana") return;
    if (final && run.bananaAt !== null && at > run.bananaAt) {
      this.stopReal(run, "final");
      return;
    }
    this.quiet(run, () => this.stopReal(run, "silence"));
  }

  /** S 꼴: 첫 final(또는 조용함) 2초 뒤 줄을 비우고(speak-cancel) 한 문장을 읽고, 끝(또는 15초) 뒤 'banana'. */
  private toReading(run: StepRun) {
    if (run.stage !== "apple") return;
    run.stage = "reading";
    this.clearSilence(run);
    this.on.view({ kind: "wait" });
    const attempt = run.attempt;
    this.after(run, ROUND_S_SPEAK_AFTER_MS, () => {
      if (!this.isCurrent(run, attempt) || run.phase !== "real") return;
      const speech = this.deps.speech();
      const state = speech?.state();
      this.push(run, {
        type: "speak-cancel",
        at: this.deps.now(),
        attempt,
        code: "queue-clear",
        speaking: state?.speaking === true,
        pending: state?.pending === true,
      });
      speech?.cancel();
      let settled = false;
      const next = () => {
        if (settled) return;
        settled = true;
        this.promptBanana(run, attempt);
      };
      this.speakLine(run, "line", next);
      this.after(run, SPEAK_END_WAIT_MS, () => {
        if (settled) return;
        this.push(run, {
          type: "speak-end-missing",
          at: this.deps.now(),
          attempt,
          utterance: "line",
        });
        next();
      });
    });
  }

  private promptBanana(run: StepRun, attempt: number) {
    if (!this.isCurrent(run, attempt) || run.phase !== "real") return;
    if (run.stage !== "reading") return;
    run.stage = "banana";
    const at = this.deps.now();
    run.bananaAt = at;
    this.push(run, { type: "prompt", at, attempt, code: "banana" });
    this.on.view({ kind: "say", word: "banana" });
    this.after(run, NO_RESULT_STOP_MS, () => {
      if (this.isCurrent(run, attempt) && run.phase === "real") {
        this.stopReal(run, "no-result");
      }
    });
  }

  private stopReal(run: StepRun, reason: StopReason) {
    if (run.phase !== "real") return;
    run.phase = "stopping";
    this.clearTimers(run);
    run.record.stopReason ??= reason;
    run.record.stopMethod ??= "stop";
    this.push(run, {
      type: "stop-call",
      at: this.deps.now(),
      attempt: run.attempt,
      code: reason,
    });
    this.awaitEnd(run, (at) => {
      if (at === null) {
        run.record.stopReason = "end-missing";
        tryCall(() => run.rec?.abort());
      }
      this.finishStep(run, at);
    });
    tryCall(() => run.rec?.stop());
  }

  private finishStep(run: StepRun, endAt: number | null) {
    if (run.done) return;
    // 늦게 오는 알림(읽기 끝 · end)을 막기 전에 마지막 값을 남긴다
    run.done = true;
    this.clearTimers(run);
    if (this.stepRun === run) this.stepRun = null;
    const at = endAt ?? this.deps.now();
    this.finished.push(run.record);
    this.on.finish(run.record, at);
    if (run.record.stopReason === "no-recognition") {
      this.over = true;
      this.on.view(null);
      this.on.done({
        autoRun: this.autoRun,
        hidden: this.hidden,
        survived: roundSurvivalOf(this.finished),
        stopped: true,
      });
      return;
    }
    if (!this.over) this.schedule(this.index + 1);
  }

  // ---- 인식 · 읽기 ----

  /** 새 인식 객체로 start. 못 열면 그 차례를 끝내고 null. */
  private startRec(run: StepRun): number | null {
    const attempt = run.record.attempts.length;
    const rec = this.deps.createRecognition();
    if (rec === null) {
      this.push(run, { type: "no-recognition", at: this.deps.now(), attempt });
      run.record.stopReason = "no-recognition";
      this.finishStep(run, null);
      return null;
    }
    rec.lang = run.record.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    this.attach(run, rec, attempt);
    run.rec = rec;
    run.attempt = attempt;
    run.stage = "apple";
    const at = this.deps.now();
    run.record.attempts.push({
      startCallAt: at,
      nth: this.ctx.nextNth(),
      lastText: "",
    });
    if (attempt === 0) {
      const prevAt = this.ctx.prevEnd().at;
      run.record.sincePrevEndMs = prevAt === null ? null : at - prevAt;
      run.record.ttsBetween = this.ctx.spokeSinceEnd();
      const snap = this.ctx.snapshot();
      run.record.webAudioState = snap.webAudioState;
      run.record.audioSessionType = snap.audioSessionType;
    }
    this.push(run, { type: "start-call", at, attempt });
    try {
      rec.start();
    } catch (error) {
      this.push(run, {
        type: "start-threw",
        at: this.deps.now(),
        attempt,
        ...errorFields(error),
      });
      run.record.stopReason = "start-failed";
      this.finishStep(run, null);
      return null;
    }
    return attempt;
  }

  private attach(run: StepRun, rec: RoundRecognition, attempt: number) {
    const log = (type: ProbeEvent["type"]) => () => {
      this.push(run, { type, at: this.deps.now(), attempt });
    };
    rec.onaudiostart = () => {
      const at = this.deps.now();
      this.push(run, { type: "audiostart", at, attempt });
      const base = run.record.attempts[attempt]?.startCallAt;
      if (
        base !== undefined &&
        at - base > DECOY_ALIVE_MS &&
        this.isCurrent(run, attempt) &&
        run.phase === "decoy"
      ) {
        this.push(run, {
          type: "decoy-alive",
          at,
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
      const at = this.deps.now();
      if (keepResultEvent(run.record, { attempt, final })) {
        this.push(run, {
          type: "result",
          at,
          attempt,
          final,
          length: heard.length,
          ...(final ? { finalText: finalText.trim() } : {}),
        });
      } else {
        run.record.droppedInterims += 1;
      }
      if (this.isCurrent(run, attempt) && run.phase === "real") {
        this.onRealResult(run, final, at);
      }
    };
    rec.onerror = (event) => {
      this.push(run, {
        type: "error",
        at: this.deps.now(),
        attempt,
        code: event.error ?? "",
        message: event.message ?? "",
      });
    };
    rec.onend = () => {
      if (run.done) return;
      const at = this.deps.now();
      this.push(run, { type: "end", at, attempt });
      if (!this.isCurrent(run, attempt)) return;
      const cont = run.onEnd;
      if (cont !== null) {
        run.onEnd = null;
        cont(at);
        return;
      }
      if (run.phase === "decoy") {
        this.decoyEndedEarly(run);
        return;
      }
      if (run.phase === "real") {
        run.record.stopReason ??= "natural";
        this.finishStep(run, at);
      }
    };
  }

  /** stop · abort 뒤 end 를 기다린다. END_WAIT_MS 안에 안 오면 end-missing 을 남기고 end 없이(at null) 잇는다. */
  private awaitEnd(run: StepRun, cont: (at: number | null) => void) {
    run.onEnd = cont;
    const attempt = run.attempt;
    this.after(run, END_WAIT_MS, () => {
      if (run.done || run.onEnd !== cont) return;
      run.onEnd = null;
      this.push(run, { type: "end-missing", at: this.deps.now(), attempt });
      cont(null);
    });
  }

  /** 선생님 꼴 영어 한 문장(W_ROUND_SENTENCE — 따라 말하게 유도하지 않는 서술문 · 첫 선생님 높이 · 목소리 순서 · 앱 1~3단계 빠르기). speak() 직전에 speak-call 표지를 남긴다. */
  private speakLine(
    run: StepRun,
    utterance: "line" | "bare",
    done: (() => void) | undefined,
  ) {
    const attempt = run.attempt;
    const speech = this.deps.speech();
    if (speech === null) {
      this.push(run, {
        type: "speak-error",
        at: this.deps.now(),
        attempt,
        utterance,
        code: "no-synthesis",
      });
      done?.();
      return;
    }
    let called = false;
    const once = () => {
      if (called) return;
      called = true;
      done?.();
    };
    const teacher = this.ctx.teacher;
    const state = speech.state();
    this.ctx.markSpoke();
    this.push(run, {
      type: "speak-call",
      at: this.deps.now(),
      attempt,
      utterance,
      speaking: state.speaking,
      pending: state.pending,
      code: `speaking=${state.speaking} pending=${state.pending}`,
    });
    speech.speak(
      {
        text: W_ROUND_SENTENCE,
        ...(teacher === null
          ? {}
          : { rate: I_RATE, pitch: teacher.pitch, prefer: teacher.prefer }),
      },
      {
        start: (voice) =>
          this.push(run, {
            type: "speak-start",
            at: this.deps.now(),
            attempt,
            utterance,
            message: voice,
          }),
        end: () => {
          this.push(run, {
            type: "speak-end",
            at: this.deps.now(),
            attempt,
            utterance,
          });
          once();
        },
        error: (code) => {
          this.push(run, {
            type: "speak-error",
            at: this.deps.now(),
            attempt,
            utterance,
            code,
          });
          once();
        },
      },
    );
  }

  // ---- 작은 도움 ----

  private isCurrent(run: StepRun, attempt: number) {
    return this.stepRun === run && run.attempt === attempt && !run.done;
  }

  private heard(run: StepRun, attempt: number) {
    return run.record.events.some(
      (e) => e.attempt === attempt && e.type === "result",
    );
  }

  private quiet(run: StepRun, fn: () => void) {
    this.clearSilence(run);
    const attempt = run.attempt;
    run.silence = this.deps.later(() => {
      run.silence = null;
      if (this.isCurrent(run, attempt) && run.phase === "real") fn();
    }, ROUND_SILENCE_MS);
  }

  private clearSilence(run: StepRun) {
    if (run.silence !== null) this.deps.cancelLater(run.silence);
    run.silence = null;
  }

  private push(run: StepRun, event: ProbeEvent) {
    if (!run.done) run.record.events.push(event);
  }

  private after(run: StepRun, ms: number, fn: () => void) {
    run.timers.push(this.deps.later(fn, ms));
  }

  private clearTimers(run: StepRun) {
    for (const id of run.timers) this.deps.cancelLater(id);
    run.timers = [];
    this.clearSilence(run);
  }

  private roundLater(ms: number, fn: () => void) {
    this.roundTimers.push(this.deps.later(fn, ms));
  }

  private clearRoundTimers() {
    for (const id of this.roundTimers) this.deps.cancelLater(id);
    this.roundTimers = [];
  }
}

export function tryCall(fn: () => void) {
  try {
    fn();
  } catch {
    // 이미 끝난 인식기의 stop · abort 는 브라우저마다 던질 수 있다
  }
}

export function errorFields(error: unknown): { code: string; message: string } {
  if (error instanceof Error)
    return { code: error.name, message: error.message };
  return { code: "unknown", message: String(error) };
}

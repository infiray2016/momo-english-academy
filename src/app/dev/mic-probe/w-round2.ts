// 마이크 점검 쪽(/dev/mic-probe)의 '자동 W 라운드 2' 러너(브리프 task-mic-probe-fix8 2026-11-07 갱신 절, 분석 10.19.5 Z-1~Z-7 · 차례 0~13).
// 누름 안에서 읽기 줄을 비우고(cancel) 무음 읽기로 읽기 제약을 푼 뒤(AudioContext 는 쪽이 같은 누름 안에서 만든다), 끝 알림 뒤 곧바로
// 차례를 스스로 돈다. 차례마다: (버림 있음) 읽기 앞 cancel → 0.3초 → 버림 start → audiostart 0.2초 뒤 소리(짧은 말 · 보통 말 · 띵) →
// '소리 끝 + 300ms' 와 '버림 하한'을 둘 다 채운 뒤 stop → end → speaking 거짓 확인(0.3초 안) → 1초 → 진짜. (버림 없음, 차례 0 · 13)
// cancel → 0.3초 → 세션 없이 보통 말 → 끝 → 거짓 확인 → 1초 → 진짜. 차례 9 는 cancel 없이 긴 문장을 버림 2초에 부르고 하한 3초에 바로
// stop 해 읽는 도중에 진짜를 연다(굳음 만들기). 차례 12 의 진짜는 S 꼴(U16): 'apple' 이 든 첫 결과 2초 뒤 cancel → 짧은 말 → 끝(또는
// 5초) 뒤 'banana' → final 글에 'banana' 가 들면 1.5초 뒤 stop. 살아 있는 버림(as > 250)도 abort 하지 않는다(분석 10.19.2 규칙 5 —
// 기록의 as 로 가린다). React · DOM 없는 모듈이고, 인식 · 읽기 · 띵 · 시계는 deps 로 받아 단위 시험(tests/unit/mic-probe-round2.test.ts)이
// 가짜로 돌린다. 녹음하지 않는다(getUserMedia · MediaRecorder 없음). 기록 꼴은 probe-log 의 ProbeRecord(strategy WR2 · round 칸).
import {
  BEEP_HZ,
  BEEP_MS,
  DECOY_GAP_MS,
  END_WAIT_MS,
  hasWord,
  isEcho,
  keepResultEvent,
  LANG_OF,
  MAX_LISTEN_MS,
  NO_RESULT_STOP_MS,
  type ProbeEvent,
  type ProbeRecord,
  ROUND_S_MAX_MS,
  ROUND_S_SPEAK_AFTER_MS,
  ROUND_SILENCE_MS,
  ROUND2_BEEP_GAIN,
  ROUND2_CANCEL_SETTLE_MS,
  ROUND2_POLL_STEP_MS,
  ROUND2_S_SPEAK_END_WAIT_MS,
  ROUND2_SENTENCE,
  ROUND2_SOUND_AFTER_AS_MS,
  ROUND2_SOUND_END_WAIT_MS,
  ROUND2_SOUND_FALLBACK_MS,
  ROUND2_SOUND_TAIL_MS,
  ROUND2_SPEAKING_POLL_MS,
  type Round2Lines,
  type Round2PlanStep,
  type RoundWord,
  round2LineOf,
  round2LinesOf,
  round2SentenceOf,
  SPEAK_END_WAIT_MS,
  type StopReason,
  UNLOCK_TEXT,
  UNLOCK_VOLUME,
} from "./probe-log";
import {
  errorFields,
  type RoundContext,
  type RoundDeps,
  type RoundRecognition,
  tryCall,
} from "./w-round";

export type RoundBeepHandlers = {
  /** 재생을 시작했다(그때 AudioContext 상태). */
  start: (state: string) => void;
  /** 재생이 끝났다(onended, 그때 AudioContext 상태). */
  end: (state: string) => void;
  error: (code: string, message: string) => void;
};

export type Round2Deps = RoundDeps & {
  /** 누름 안에서 만든 AudioContext 로 발진기 소리를 낸다(Z-5). AudioContext 가 없으면 error('unsupported'). */
  beep(
    options: { hz: number; gain: number; ms: number },
    handlers: RoundBeepHandlers,
  ): void;
  /** 누름 안에서 만든 AudioContext 의 지금 상태(없으면 null). */
  audioState(): string | null;
};

/** 화면에 보일 것: say 만 큰 글씨 낱말, rest 는 남은 초, done 은 갈래별 줄, 나머지는 '기다려요'. */
export type Round2View =
  | { kind: "wait" }
  | { kind: "rest"; until: number }
  | { kind: "say"; word: RoundWord }
  | { kind: "done"; line: string };

export type Round2Events = {
  view(view: Round2View | null): void;
  /** 차례 하나가 끝난 때(기록 · 그 진짜 end 때). */
  finish(record: ProbeRecord, endAt: number): void;
  done(result: {
    autoRun: string;
    hidden: number;
    lines: Round2Lines;
    stopped: boolean;
  }): void;
};

type Run = {
  plan: Round2PlanStep;
  record: ProbeRecord;
  rec: RoundRecognition | null;
  attempt: number;
  phase: "pre" | "decoy" | "ending" | "gap" | "bare" | "real" | "stopping";
  timers: number[];
  silence: number | null;
  onEnd: ((at: number | null) => void) | null;
  /** 버림: 하한을 채웠는가 · 소리 끝 + 300ms 가 지났는가 · 소리를 불렀는가. */
  minMet: boolean;
  soundDone: boolean;
  soundCalled: boolean;
  /** 진짜: 'apple' 이 든 결과를 받았는가(보통 꼴은 그 뒤부터 조용함 멈춤), banana final 을 받았는가. */
  appleHit: boolean;
  bananaHit: boolean;
  /** 시도마다 표지(apple · echo)가 처음 든 결과는 중간 결과 상한을 넘어도 남긴다. */
  seen: Set<string>;
  /** S 꼴: apple(첫 apple 결과 기다림) → reading(2초 뒤 cancel · 읽기) → banana. */
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

export class WRound2Runner {
  private stepRun: Run | null = null;
  private roundTimers: number[] = [];
  private index = -1;
  private hidden = 0;
  private over = false;
  private unlock: Unlock | null = null;
  private readonly finished: ProbeRecord[] = [];

  constructor(
    private readonly ctx: RoundContext,
    private readonly deps: Round2Deps,
    private readonly on: Round2Events,
    private readonly plan: readonly Round2PlanStep[],
    readonly autoRun: string,
  ) {}

  /** 단추 누름 안에서 부른다: 줄을 비우고(cancel) 무음 읽기로 제약을 푼 뒤 끝 알림(또는 상한) 뒤 차례 0 을 연다. */
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
    // 모든 읽기 앞에 cancel(Z-2) — 무음 읽기도 같다
    speech.cancel();
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
      lines: round2LinesOf(this.finished),
      stopped: true,
    });
  }

  /** 쪽을 떠날 때: 알림 없이 인식 · 읽기를 모두 끊는다(검토 M3). */
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
    this.deps.speech()?.cancel();
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
    // 버림 앞 cancel 은 0.3초 먼저 불러, 버림 start 는 앞 진짜 end 뒤 차례 사이(2초)에 맞춘다
    const lead = step.decoyMs > 0 && step.cancel ? ROUND2_CANCEL_SETTLE_MS : 0;
    this.roundLater(Math.max(0, step.waitMs - lead), () => this.runStep(index));
  }

  private complete() {
    this.over = true;
    const lines = round2LinesOf(this.finished);
    this.on.view({ kind: "done", line: round2LineOf(lines) });
    this.on.done({
      autoRun: this.autoRun,
      hidden: this.hidden,
      lines,
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
    const reading = plan.sound !== "beep" && plan.sound !== "none";
    const record: ProbeRecord = {
      id: 0,
      ...this.ctx.header,
      resetStep: plan.resetStep,
      strategy: "WR2",
      lang: LANG_OF.WR2,
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
        speak: reading && plan.decoyMs > 0,
        live: "na",
        real: plan.real,
        path: "dead",
        slots: [],
        sound: plan.sound,
        sentence: round2SentenceOf(plan.sound),
        cancel: plan.cancel,
        waitSound: plan.waitSound,
        group: plan.group,
      },
    };
    const run: Run = {
      plan,
      record,
      rec: null,
      attempt: 0,
      phase: "pre",
      timers: [],
      silence: null,
      onEnd: null,
      minMet: false,
      soundDone: false,
      soundCalled: false,
      appleHit: false,
      bananaHit: false,
      seen: new Set(),
      stage: "apple",
      bananaAt: null,
      done: false,
    };
    this.stepRun = run;
    if (unlock !== null) {
      // 첫 차례에 누름 안에서 만든 AudioContext 상태를 남긴다(Z-1, 기록 3 의 suspended 가름)
      this.push(run, {
        type: "webaudio-start",
        at: this.deps.now(),
        attempt: 0,
        code: this.deps.audioState() ?? "none",
      });
    }
    if (plan.decoyMs === 0) {
      this.bareSpeak(run);
      return;
    }
    if (plan.cancel) {
      this.cancelFirst(run, () => this.openDecoy(run));
      return;
    }
    this.openDecoy(run);
  }

  /** 읽기 앞 cancel(Z-2): 부를 때의 speaking · pending 을 남기고 cancel, 0.3초 뒤 다시 재서 남긴 다음 잇는다. */
  private cancelFirst(run: Run, then: () => void, trigger?: string) {
    const attempt = run.attempt;
    const speech = this.deps.speech();
    const state = speech?.state();
    this.push(run, {
      type: "speak-cancel",
      at: this.deps.now(),
      attempt,
      code: "before-speak",
      speaking: state?.speaking === true,
      pending: state?.pending === true,
      ...(trigger === undefined ? {} : { message: trigger }),
    });
    speech?.cancel();
    this.after(run, ROUND2_CANCEL_SETTLE_MS, () => {
      if (run.done || this.stepRun !== run || run.attempt !== attempt) return;
      this.pushState(run, "after-cancel");
      then();
    });
  }

  /** 버림 없는 차례(0 · 13): 세션 없이 보통 말 → 끝(또는 3초 뒤 '끝 없음' · cancel) → 거짓 확인 → 1초 → 진짜. */
  private bareSpeak(run: Run) {
    run.phase = "bare";
    const speak = () => {
      let settled = false;
      const next = () => {
        if (settled || run.done || this.stepRun !== run) return;
        settled = true;
        this.clearTimers(run);
        this.gapThenReal(run, true);
      };
      this.speakLine(run, "bare", this.sentence(run), next);
      this.after(run, ROUND2_SOUND_END_WAIT_MS, () => {
        if (settled) return;
        this.soundMissing(run, "bare");
        next();
      });
    };
    if (run.plan.cancel) this.cancelFirst(run, speak);
    else speak();
  }

  /** 버림 세션: 하한 뒤 · 소리 끝 + 300ms 뒤 둘 다 채우면 stop(차례 9 는 하한에서 바로). 소리는 audiostart 0.2초 뒤(1초 대비) 또는 고정 때. */
  private openDecoy(run: Run) {
    run.phase = "decoy";
    const plan = run.plan;
    run.record.round?.slots.push({
      role: "decoy",
      plannedMs: plan.decoyMs,
      speak: plan.sound !== "beep" && plan.sound !== "none",
    });
    this.on.view({ kind: "wait" });
    const attempt = this.startRec(run);
    if (attempt === null) return;
    const current = () => this.isCurrent(run, attempt) && run.phase === "decoy";
    this.after(run, plan.decoyMs, () => {
      if (!current()) return;
      run.minMet = true;
      if (plan.waitSound) this.maybeClose(run);
      else this.closeDecoy(run);
    });
    if (plan.sound === "none") {
      run.soundDone = true;
      return;
    }
    const at =
      plan.soundAt === "audiostart" ? ROUND2_SOUND_FALLBACK_MS : plan.soundAt;
    this.after(run, at, () => {
      if (current()) this.callSound(run);
    });
  }

  /** 버림 audiostart: 소리를 audiostart 기준으로 부르는 차례면 0.2초 뒤 부른다(1초 대비보다 먼저면). */
  private onDecoyAudioStart(run: Run, attempt: number) {
    if (run.plan.soundAt !== "audiostart" || run.soundCalled) return;
    this.after(run, ROUND2_SOUND_AFTER_AS_MS, () => {
      if (this.isCurrent(run, attempt) && run.phase === "decoy") {
        this.callSound(run);
      }
    });
  }

  private callSound(run: Run) {
    if (run.soundCalled || run.phase !== "decoy") return;
    run.soundCalled = true;
    const attempt = run.attempt;
    let settled = false;
    const ended = () => {
      if (settled) return;
      settled = true;
      this.after(run, ROUND2_SOUND_TAIL_MS, () => {
        if (!this.isCurrent(run, attempt) || run.phase !== "decoy") return;
        run.soundDone = true;
        this.maybeClose(run);
      });
    };
    const beep = run.plan.sound === "beep";
    if (beep) this.playBeep(run, ended);
    else this.speakLine(run, "line", this.sentence(run), ended);
    this.after(run, ROUND2_SOUND_END_WAIT_MS + (beep ? BEEP_MS : 0), () => {
      if (settled || !this.isCurrent(run, attempt)) return;
      if (run.phase !== "decoy") return;
      settled = true;
      this.soundMissing(run, beep ? "beep" : "line");
      run.soundDone = true;
      this.maybeClose(run);
    });
  }

  /** 소리 끝이 상한 안에 안 왔다: 표지를 남기고, 읽기면 cancel 한다(Z-4 '소리 끝 없음' → cancel 뒤 stop). */
  private soundMissing(run: Run, kind: "line" | "bare" | "beep") {
    const at = this.deps.now();
    if (kind === "beep") {
      this.push(run, {
        type: "webaudio-beep",
        at,
        attempt: run.attempt,
        code: "end-missing",
      });
      return;
    }
    this.push(run, {
      type: "speak-end-missing",
      at,
      attempt: run.attempt,
      utterance: kind,
    });
    const speech = this.deps.speech();
    const state = speech?.state();
    this.push(run, {
      type: "speak-cancel",
      at,
      attempt: run.attempt,
      code: "end-missing",
      speaking: state?.speaking === true,
      pending: state?.pending === true,
    });
    speech?.cancel();
  }

  private maybeClose(run: Run) {
    if (run.phase === "decoy" && run.minMet && run.soundDone) {
      this.closeDecoy(run);
    }
  }

  private closeDecoy(run: Run) {
    if (run.phase !== "decoy") return;
    run.phase = "ending";
    this.clearTimers(run);
    this.pushState(run, "stop");
    this.push(run, {
      type: "stop-call",
      at: this.deps.now(),
      attempt: run.attempt,
      code: "decoy",
    });
    this.awaitEnd(run, () => this.gapThenReal(run, run.plan.waitSound));
    tryCall(() => run.rec?.stop());
  }

  /** 버림이 저절로 끝났다(end 가 먼저 옴): 그대로 거짓 확인 → 1초 → 진짜. 실제 길이는 기록에 남는다. */
  private decoyEndedEarly(run: Run) {
    run.phase = "ending";
    this.clearTimers(run);
    this.gapThenReal(run, run.plan.waitSound);
  }

  /** speaking 이 거짓이 되기를 0.3초까지 기다려 남기고(poll 이 거짓이면 곧바로 남김) 1초 뒤 진짜를 연다(Y-3 · Z-4). */
  private gapThenReal(run: Run, poll: boolean) {
    if (run.done || this.stepRun !== run) return;
    run.phase = "gap";
    const began = this.deps.now();
    const openLater = () =>
      this.after(run, DECOY_GAP_MS, () => {
        if (!run.done && this.stepRun === run) this.openReal(run);
      });
    const tick = () => {
      if (run.done || this.stepRun !== run) return;
      const state = this.deps.speech()?.state();
      const waited = this.deps.now() - began;
      if (
        !poll ||
        state === undefined ||
        !state.speaking ||
        waited >= ROUND2_SPEAKING_POLL_MS
      ) {
        this.pushState(run, "gap", String(Math.round(waited)));
        openLater();
        return;
      }
      this.after(run, ROUND2_POLL_STEP_MS, tick);
    };
    tick();
  }

  /** 진짜 세션: start 를 부를 때 화면에 크게 'apple'. 'apple' 이 든 결과가 6초 안에 없으면 stop, 든 뒤 1.5초 조용하면 stop(S 꼴은 Y-4). */
  private openReal(run: Run) {
    run.phase = "real";
    run.appleHit = false;
    run.bananaHit = false;
    run.record.round?.slots.push({
      role: "real",
      plannedMs: null,
      speak: false,
    });
    this.pushState(run, "real", undefined, run.record.attempts.length);
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
      if (!current() || run.stage !== "apple") return;
      // S 꼴은 결과가 하나라도 있으면 조용함 대비 길로 읽기에 넘어간다
      if (run.plan.real === "s" ? !this.heard(run, attempt) : !run.appleHit) {
        this.stopReal(run, "no-result");
      }
    });
  }

  private onRealResult(
    run: Run,
    hit: { apple: boolean; bananaFinal: boolean },
    at: number,
  ) {
    if (run.plan.real === "plain") {
      if (hit.apple && !run.appleHit) {
        run.appleHit = true;
        this.on.view({ kind: "wait" });
      }
      if (run.appleHit) this.quiet(run, () => this.stopReal(run, "silence"));
      return;
    }
    if (run.stage === "apple") {
      if (hit.apple) {
        this.toReading(run, "apple");
        return;
      }
      // 'apple' 로 안 들려도 결과 뒤 조용하면 다 말한 것으로 보고 읽기로 넘어간다(기록의 cancel message 가 'quiet')
      this.quiet(run, () => this.toReading(run, "quiet"));
      return;
    }
    if (run.stage !== "banana" || run.bananaHit) return;
    // banana 는 final 글에 'banana' 가 든 것만(검토 C3 · Z-6). 그 밖의 결과로는 멈추지 않는다
    if (hit.bananaFinal && run.bananaAt !== null && at > run.bananaAt) {
      run.bananaHit = true;
      const attempt = run.attempt;
      this.after(run, ROUND_SILENCE_MS, () => {
        if (this.isCurrent(run, attempt) && run.phase === "real") {
          this.stopReal(run, "final");
        }
      });
    }
  }

  /** S 꼴: 첫 apple 결과 2초 뒤 cancel → 0.3초 → 짧은 말 → 끝(또는 5초) 뒤 'banana'. */
  private toReading(run: Run, trigger: "apple" | "quiet") {
    if (run.stage !== "apple") return;
    run.stage = "reading";
    this.clearSilence(run);
    this.on.view({ kind: "wait" });
    const attempt = run.attempt;
    const live = () => this.isCurrent(run, attempt) && run.phase === "real";
    this.after(run, ROUND_S_SPEAK_AFTER_MS, () => {
      if (!live()) return;
      this.cancelFirst(
        run,
        () => {
          if (!live()) return;
          let settled = false;
          const next = () => {
            if (settled) return;
            settled = true;
            this.promptBanana(run, attempt);
          };
          this.speakLine(run, "line", this.sentence(run), next);
          this.after(run, ROUND2_S_SPEAK_END_WAIT_MS, () => {
            if (settled || !live()) return;
            this.push(run, {
              type: "speak-end-missing",
              at: this.deps.now(),
              attempt,
              utterance: "line",
            });
            next();
          });
        },
        trigger,
      );
    });
  }

  private promptBanana(run: Run, attempt: number) {
    if (!this.isCurrent(run, attempt) || run.phase !== "real") return;
    if (run.stage !== "reading") return;
    run.stage = "banana";
    const at = this.deps.now();
    run.bananaAt = at;
    this.push(run, { type: "prompt", at, attempt, code: "banana" });
    this.on.view({ kind: "say", word: "banana" });
    this.after(run, NO_RESULT_STOP_MS, () => {
      if (
        this.isCurrent(run, attempt) &&
        run.phase === "real" &&
        !run.bananaHit
      ) {
        this.stopReal(run, "no-result");
      }
    });
  }

  private stopReal(run: Run, reason: StopReason) {
    if (run.phase !== "real") return;
    run.phase = "stopping";
    this.clearTimers(run);
    // stop 뒤 end 까지 'apple' 을 보이지 않는다(검토 M2)
    this.on.view({ kind: "wait" });
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

  private finishStep(run: Run, endAt: number | null) {
    if (run.done) return;
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
        lines: round2LinesOf(this.finished),
        stopped: true,
      });
      return;
    }
    if (!this.over) this.schedule(this.index + 1);
  }

  // ---- 인식 · 읽기 · 띵 ----

  /** 새 인식 객체로 start. 못 열면 그 차례를 끝내고 null. */
  private startRec(run: Run): number | null {
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

  private attach(run: Run, rec: RoundRecognition, attempt: number) {
    const log = (type: ProbeEvent["type"]) => () => {
      this.push(run, { type, at: this.deps.now(), attempt });
    };
    rec.onaudiostart = () => {
      this.push(run, { type: "audiostart", at: this.deps.now(), attempt });
      if (this.isCurrent(run, attempt) && run.phase === "decoy") {
        this.onDecoyAudioStart(run, attempt);
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
      let changed = "";
      let finalText = "";
      let final = false;
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const said = result?.[0]?.transcript ?? "";
        text += said;
        if (i >= event.resultIndex) changed += said;
        if (result?.isFinal) {
          finalText += said;
          if (i >= event.resultIndex) final = true;
        }
      }
      const heard = text.trim();
      const slot = run.record.attempts[attempt];
      if (slot !== undefined) slot.lastText = heard;
      const at = this.deps.now();
      // Z-6: apple 은 중간 · final 어디든, banana 는 final 글에만, 메아리는 이번에 바뀐 결과 글에 읽은 문장의 낱말
      const apple = hasWord(heard, "apple");
      const bananaFinal = final && hasWord(finalText, "banana");
      const echo = isEcho(changed, run.plan.sound);
      const fresh = (key: string, on: boolean) => {
        const k = `${attempt}:${key}`;
        if (!on || run.seen.has(k)) return false;
        run.seen.add(k);
        return true;
      };
      const freshApple = fresh("apple", apple);
      const freshEcho = fresh("echo", echo);
      if (
        keepResultEvent(run.record, { attempt, final }) ||
        freshApple ||
        freshEcho
      ) {
        this.push(run, {
          type: "result",
          at,
          attempt,
          final,
          length: heard.length,
          ...(final ? { finalText: finalText.trim() } : {}),
          ...(apple ? { apple: true } : {}),
          ...(bananaFinal ? { banana: true } : {}),
          ...(echo ? { echo: true } : {}),
        });
      } else {
        run.record.droppedInterims += 1;
      }
      if (this.isCurrent(run, attempt) && run.phase === "real") {
        this.onRealResult(run, { apple, bananaFinal }, at);
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
  private awaitEnd(run: Run, cont: (at: number | null) => void) {
    run.onEnd = cont;
    const attempt = run.attempt;
    this.after(run, END_WAIT_MS, () => {
      if (run.done || run.onEnd !== cont) return;
      run.onEnd = null;
      this.push(run, { type: "end-missing", at: this.deps.now(), attempt });
      cont(null);
    });
  }

  private sentence(run: Run): string {
    const sound = run.plan.sound;
    return sound === "beep" || sound === "none"
      ? ROUND2_SENTENCE.short
      : ROUND2_SENTENCE[sound];
  }

  /** 한 문장을 기본 빠르기로 읽는다(첫 선생님 높이 · 목소리 순서). speak() 직전에 speak-call 표지(그때 speaking · pending)를 남긴다. */
  private speakLine(
    run: Run,
    utterance: "line" | "bare",
    text: string,
    done: () => void,
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
      done();
      return;
    }
    let called = false;
    const once = () => {
      if (called) return;
      called = true;
      done();
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
      message: text,
    });
    speech.speak(
      {
        text,
        ...(teacher === null
          ? {}
          : { pitch: teacher.pitch, prefer: teacher.prefer }),
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

  /** 띵(Z-5): 440Hz · 1초 · 음량 0.1. 시작 · 끝 · 오류를 webaudio-beep 사건으로 남긴다(시작은 message 'start'). */
  private playBeep(run: Run, done: () => void) {
    const attempt = run.attempt;
    let called = false;
    const once = () => {
      if (called) return;
      called = true;
      done();
    };
    this.ctx.markSpoke();
    this.deps.beep(
      { hz: BEEP_HZ, gain: ROUND2_BEEP_GAIN, ms: BEEP_MS },
      {
        start: (state) =>
          this.push(run, {
            type: "webaudio-beep",
            at: this.deps.now(),
            attempt,
            code: state,
            message: "start",
          }),
        end: (state) => {
          this.push(run, {
            type: "webaudio-beep",
            at: this.deps.now(),
            attempt,
            code: "ended",
            message: state,
          });
          once();
        },
        error: (code, message) => {
          this.push(run, {
            type: "webaudio-beep",
            at: this.deps.now(),
            attempt,
            code,
            message,
          });
          once();
        },
      },
    );
  }

  // ---- 작은 도움 ----

  /** speak-state(code 자리 · message 덧붙임): 그때 speaking · pending. */
  private pushState(
    run: Run,
    code: "after-cancel" | "stop" | "gap" | "real",
    message?: string,
    attempt: number = run.attempt,
  ) {
    const state = this.deps.speech()?.state();
    this.push(run, {
      type: "speak-state",
      at: this.deps.now(),
      attempt,
      code,
      speaking: state?.speaking === true,
      pending: state?.pending === true,
      ...(message === undefined ? {} : { message }),
    });
  }

  private isCurrent(run: Run, attempt: number) {
    return this.stepRun === run && run.attempt === attempt && !run.done;
  }

  private heard(run: Run, attempt: number) {
    return run.record.events.some(
      (e) => e.attempt === attempt && e.type === "result",
    );
  }

  private quiet(run: Run, fn: () => void) {
    this.clearSilence(run);
    const attempt = run.attempt;
    run.silence = this.deps.later(() => {
      run.silence = null;
      if (this.isCurrent(run, attempt) && run.phase === "real") fn();
    }, ROUND_SILENCE_MS);
  }

  private clearSilence(run: Run) {
    if (run.silence !== null) this.deps.cancelLater(run.silence);
    run.silence = null;
  }

  private push(run: Run, event: ProbeEvent) {
    if (!run.done) run.record.events.push(event);
  }

  private after(run: Run, ms: number, fn: () => void) {
    run.timers.push(this.deps.later(fn, ms));
  }

  private clearTimers(run: Run) {
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

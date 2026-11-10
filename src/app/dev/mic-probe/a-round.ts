// 마이크 점검 쪽(/dev/mic-probe)의 '자동 A 라운드' 러너(브리프 task-probe 2026-11-10 — 받아 온 소리의 재생 길이 iPad 음성 인식과 부딪히는가).
// 소리 내는 길 셋을 Web Audio → 오디오 요소 → 지금 읽기(speechSynthesis) 순서로 돈다. 앞 두 길이 도는 동안은 speechSynthesis 를
// 한 번도 부르지 않는다(할 일 2 — speechSynthesis 를 쓰면 AudioContext 가 새로 고침 전까지 무음이 됐다는 보고).
// 길마다: 길 열기(첫 길은 '시작' 누름 안, 다음 길은 누름 밖에서 먼저 해 보고 막히면 '한 번 더 눌러 주세요' — iOS 는 오디오 요소의 첫 재생과
// 첫 speak() 를 누름 안에서만 받는다) → 형식 측정(Web Audio · 오디오 요소만, 세 형식 × 정한 횟수) → 차례.
// 차례 꼴은 W 라운드 2 와 같다: (버림 안) 버림 start → audiostart 0.2초 뒤 소리 → '소리 끝 + 0.3초'와 '버림 하한'을 둘 다 채운 뒤 stop →
// end → 소리 멈춤 확인 → 1초 → 진짜. (세션 없이) 소리 → 끝 → 1초 → 진짜. 진짜는 화면에 크게 'apple' 을 보이고 'apple' 이 든 결과 뒤
// 1.5초 조용하면 stop, 정한 시간 안에 없으면 stop. 꼴은 다섯: 쉰 뒤 첫 차례(세션 없이 소리 → 진짜 — 차례 0 은 문서의 첫 듣기, 그 밖은 앞
// 듣기 끝 45초 뒤) · 버림 안 · 세션 없이 · 재우는 꼴 둘(소리가 끝나면 AudioContext 를 suspend 한 뒤 진짜를 열고, 다음 소리 앞에 누름 밖
// resume 이 되는지 본다 — 기록 8: AudioContext 가 도는 동안 진짜 audiostart 가 14 · 12ms 라 앱의 '마이크 안 잡힘' 감지에 걸린다).
// 읽기 길이 끝난 뒤(M6): Web Audio · 오디오 요소로 같은 파일을 한 번씩 다시 재생해 시작 · 끝 · 시간 흐름을 적고, 화면에서
// '방금 두 소리가 들렸나요?'의 답을 받는다(speechSynthesis 를 쓰면 Web Audio 가 무음이 된다는 보고 — 기계는 들렸는지 알 수 없다).
// 맨 끝에 '듣기가 켜진 동안 소리가 작아졌나요?'를 묻는다.
// React · DOM 없는 모듈이고, 인식 · 소리 · 길 열기 · 형식 측정 · 시계는 deps 로 받아 단위 시험(tests/unit/mic-probe-round-a.test.ts)이
// 가짜로 돌린다. 녹음하지 않는다(getUserMedia · MediaRecorder 없음). 기록 꼴은 probe-log 의 ProbeRecord(strategy AR · round.a 칸).
import {
  A_AFTER_GAP_MS,
  A_ASK_WAIT_MS,
  A_AUDIO_URL,
  A_FORMAT_REPS,
  A_FORMATS,
  A_MEASURE_WAIT_MS,
  A_NO_RESULT_STOP_MS,
  A_OPEN_GESTURE_WAIT_MS,
  A_OPEN_WAIT_MS,
  A_REPLAY_WAIT_MS,
  A_SENTENCE,
  A_SLEEP_WAIT_MS,
  A_SOUND_END_WAIT_MS,
  type AFormat,
  type AHeard,
  type AMeasure,
  type AOpen,
  type APlanStep,
  type AReplay,
  type AReport,
  type AVia,
  type AVolume,
  aIsBare,
  aIsSleep,
  aLineOf,
  aLinesOf,
  aPlayFormatOf,
  DECOY_GAP_MS,
  END_WAIT_MS,
  hasWord,
  isEcho,
  keepResultEvent,
  LANG_OF,
  MAX_LISTEN_MS,
  type ProbeEvent,
  type ProbeRecord,
  ROUND_SILENCE_MS,
  ROUND2_CANCEL_SETTLE_MS,
  ROUND2_POLL_STEP_MS,
  ROUND2_SOUND_AFTER_AS_MS,
  ROUND2_SOUND_FALLBACK_MS,
  ROUND2_SOUND_TAIL_MS,
  ROUND2_SPEAKING_POLL_MS,
  type RoundWord,
  type StopReason,
} from "./probe-log";
import {
  errorFields,
  type RoundContext,
  type RoundDeps,
  type RoundRecognition,
  type RoundSpeech,
  tryCall,
} from "./w-round";

export type AOpenResult = AOpen["result"];

export type ARoundDeps = Omit<RoundDeps, "speech"> & {
  /**
   * 그 길의 소리 내는 쪽(RoundSpeech 꼴 — 갈아 끼운다). Web Audio · 오디오 요소는 text 자리에 소리 파일 주소를 받아 새로 받아 와 재생하고,
   * 시작 알림은 첫 소리(Web Audio 는 재생 시작 · 오디오 요소는 playing 알림) 때 준다. 못 쓰면 null.
   */
  sound(via: AVia): RoundSpeech | null;
  /**
   * 그 길을 연다(Web Audio: AudioContext 만들고 resume · 오디오 요소: 그 요소의 첫 재생 · 읽기: 무음 읽기).
   * 누름 안이 아니라 막히면 'need-gesture', 아예 못 쓰면 'failed'. 답은 한 번만 준다.
   */
  open(
    via: AVia,
    inGesture: boolean,
    reply: (result: AOpenResult, detail: string) => void,
  ): void;
  /** 그 길을 닫는다(AudioContext 닫기 · 요소 비우기 · 읽기 줄 비우기 — 안 연 길에는 아무것도 하지 않는다). */
  close(via: AVia): void;
  /** canPlayType 값('' · maybe · probably). */
  canPlay(format: AFormat): string;
  /** 형식 하나를 그 길로 받아 와 재생해 본다(받기 시작 → 첫 소리 ms, 첫 소리 뒤 곧 멈춘다). */
  measure(
    via: AMeasure["via"],
    format: AFormat,
    reply: (result: AMeasure) => void,
  ): void;
  /** 읽기 뒤 다시 재생(M6): 그 길로 파일을 끝까지 한 번 재생하고 시작 · 끝 · 흐른 시간을 답한다(끝 알림이 없으면 스스로 끊고 답한다). */
  replay(
    via: AReplay["via"],
    format: AFormat,
    reply: (result: AReplay) => void,
  ): void;
  /**
   * 재우는 꼴: 그 길의 소리 출력을 재운다(Web Audio 의 AudioContext.suspend, 안 되면 close). 그 뒤의 상태를 답한다.
   * 다음 소리는 sound(via).speak 가 스스로 깨워(resume) 내고, 누름 밖이라 못 깨우면 'resume-blocked…' 오류로 알린다.
   */
  sleep(via: AVia, reply: (state: string) => void): void;
  /** 이 쪽을 연 뒤 speechSynthesis 를 부른 수(speak · cancel). */
  synthCalls(): number;
  /** Web Audio 길의 AudioContext 상태(없으면 null). */
  audioState(): string | null;
};

/**
 * 화면에 보일 것: say 만 큰 글씨 낱말, tap 은 '한 번 더 눌러 주세요' 단추, after 는 다시 재생 중인 소리 번호(1 Web Audio · 2 오디오 요소),
 * ask 는 '방금 두 소리가 들렸나요?'와 답 단추, ask-volume 은 '듣기가 켜진 동안 소리가 작아졌나요?'와 답 단추, rest 는 쉬는 중 · 남은 초,
 * done 은 요약 줄, 나머지는 '기다려요'.
 */
export type ARoundView =
  | { kind: "wait" }
  | { kind: "rest"; until: number }
  | { kind: "tap"; via: AVia }
  | { kind: "say"; word: RoundWord }
  | { kind: "after"; n: number }
  | { kind: "ask" }
  | { kind: "ask-volume" }
  | { kind: "done"; line: string };

export type ARoundEvents = {
  view(view: ARoundView | null): void;
  /** 차례 하나가 끝난 때(기록 · 그 진짜 end 때). */
  finish(record: ProbeRecord, endAt: number): void;
  /** 길 하나의 형식 측정이 끝난 때(라운드를 끝까지 못 돌아도 형식 표를 남기게). */
  measured?(report: AReport): void;
  done(result: {
    autoRun: string;
    hidden: number;
    stopped: boolean;
    report: AReport;
  }): void;
};

type Run = {
  plan: APlanStep;
  record: ProbeRecord;
  rec: RoundRecognition | null;
  attempt: number;
  phase: "pre" | "decoy" | "ending" | "gap" | "bare" | "real" | "stopping";
  timers: number[];
  silence: number | null;
  onEnd: ((at: number | null) => void) | null;
  /** 버림: 하한을 채웠는가 · 소리 끝 + 0.3초가 지났는가 · 소리를 불렀는가 · stop 전에 저절로 끝났는가. */
  minMet: boolean;
  soundDone: boolean;
  soundCalled: boolean;
  endedEarly: boolean;
  /** 진짜: 'apple' 이 든 결과를 받았는가. */
  appleHit: boolean;
  /** 시도마다 표지(apple · echo)가 처음 든 결과는 중간 결과 상한을 넘어도 남긴다. */
  seen: Set<string>;
  done: boolean;
};

/** 형식 측정의 실패가 잠깐일 수 있는 것인가(답 없음 · 재생이 흐르지 않음 — 장치가 막 켜지는 때). */
function isPassing(error: string | null): boolean {
  return error === "timeout" || (error?.startsWith("not-playing") ?? false);
}

export class ARoundRunner {
  private stepRun: Run | null = null;
  private roundTimers: number[] = [];
  private index = -1;
  private hidden = 0;
  private over = false;
  private started = false;
  /** 지금 열려 있는 길과 '한 번 더'를 기다리는 길 · 그 뒤 이을 차례. */
  private via: AVia | null = null;
  private awaiting: {
    via: AVia;
    then: (ok: boolean) => void;
    purpose: AOpen["purpose"];
    step: number | null;
  } | null = null;
  /** 읽기 뒤 다시 재생을 시작했는가 · '들렸나요' · '작아졌나요'의 답을 기다리는가. */
  private afterStarted = false;
  private asking = false;
  private askingVolume = false;
  /** 재우는 꼴: 소리 출력이 재워져 있는가 · 다음 소리가 누름 밖에서 못 깨웠는가(다음 차례 앞에 길을 다시 연다). */
  private asleep = false;
  private wakeBlocked = false;
  /** 길 열기 · 측정의 늦은 답을 버리는 표지. */
  private token = 0;
  private readonly finished: ProbeRecord[] = [];
  private readonly report: AReport;

  constructor(
    private readonly ctx: RoundContext,
    private readonly deps: ARoundDeps,
    private readonly on: ARoundEvents,
    private readonly plan: readonly APlanStep[],
    readonly autoRun: string,
  ) {
    this.report = {
      synthBefore: 0,
      taps: 0,
      canPlay: { wav: "", mp3: "", ogg: "" },
      opens: [],
      measures: [],
      played: { webaudio: null, element: null, synth: null },
      skipped: [],
      sleepDropped: [],
      after: null,
      volume: null,
    };
  }

  /** '시작' 누름 안에서 부른다: 이 쪽이 speechSynthesis 를 부른 수를 적고, 첫 길을 이 누름 안에서 연다. */
  start() {
    if (this.started || this.over) return;
    this.started = true;
    this.report.synthBefore = this.deps.synthCalls();
    for (const format of A_FORMATS) {
      this.report.canPlay[format] = this.deps.canPlay(format);
    }
    this.on.view({ kind: "wait" });
    // 첫 소리 길은 이 누름 안에서 연다
    const first = this.plan[0];
    if (first === undefined) this.schedule(0);
    else this.enterVia(first.via, 0, true);
  }

  /** 지금 도는(마지막으로 시작한) 차례 번호. 아직이면 -1. */
  get currentIndex() {
    return this.index;
  }

  /** '방금 두 소리가 들렸나요?'의 답 단추에서 부른다: 답을 적고 소리 크기 물음으로 넘어간다. */
  answer(value: AHeard | "no-answer") {
    if (this.over || !this.asking || this.report.after === null) return;
    this.asking = false;
    this.clearRoundTimers();
    this.report.after.heard = value;
    this.askVolume();
  }

  /** '듣기가 켜진 동안 소리가 작아졌나요?'의 답 단추에서 부른다: 답을 적고 라운드를 끝낸다. */
  answerVolume(value: AVolume | "no-answer") {
    if (this.over || !this.askingVolume) return;
    this.askingVolume = false;
    this.clearRoundTimers();
    this.report.volume = value;
    this.finishRound();
  }

  /** '한 번 더 눌러 주세요' 누름 안에서 부른다: 기다리던 길을 이 누름 안에서 다시 연다. */
  resume() {
    const awaiting = this.awaiting;
    if (this.over || awaiting === null) return;
    this.awaiting = null;
    this.report.taps += 1;
    this.on.view({ kind: "wait" });
    this.openVia(
      awaiting.via,
      true,
      awaiting.then,
      awaiting.purpose,
      awaiting.step,
    );
  }

  /** '멈추기': 도는 차례를 abort 로 끝내 기록하고(멈춤 user) 라운드를 끝낸다. */
  stop() {
    if (this.over) return;
    this.over = true;
    this.clearRoundTimers();
    this.awaiting = null;
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
    this.closeVia();
    this.on.view(null);
    this.on.done({
      autoRun: this.autoRun,
      hidden: this.hidden,
      stopped: true,
      report: this.report,
    });
  }

  /** 쪽을 떠날 때: 알림 없이 인식 · 소리를 모두 끊는다. */
  dispose() {
    this.over = true;
    this.clearRoundTimers();
    this.awaiting = null;
    const run = this.stepRun;
    if (run !== null) {
      run.done = true;
      this.clearTimers(run);
      tryCall(() => run.rec?.abort());
      this.stepRun = null;
    }
    this.closeVia();
  }

  note(type: "hidden" | "visible") {
    if (type === "hidden") this.hidden += 1;
    const run = this.stepRun;
    if (run !== null) {
      this.push(run, { type, at: this.deps.now(), attempt: run.attempt });
    }
  }

  // ---- 길 열기 · 형식 측정 ----

  /** 지금 길을 닫는다(소리 멈춤은 닫는 쪽 몫). 안 연 길 — 특히 아직 차례가 아닌 speechSynthesis — 은 건드리지 않는다. */
  private closeVia() {
    const via = this.via;
    if (via === null) return;
    this.via = null;
    this.asleep = false;
    this.wakeBlocked = false;
    this.token += 1;
    tryCall(() => this.deps.close(via));
  }

  /** 차례를 돌 길에 들어간다: 열리면 형식 측정으로, 못 열면 그 길의 차례를 건너뛴다. */
  private enterVia(via: AVia, index: number, inGesture: boolean) {
    this.openVia(
      via,
      inGesture,
      (ok) => {
        if (ok) this.measureVia(via, index);
        else this.skipVia(via, index);
      },
      "enter",
      index,
    );
  }

  /**
   * 재운 소리 출력을 다음 소리가 누름 밖에서 못 깨웠다: 길을 다시 연다(막히면 '한 번 더'). 누를 때마다 깨워야 한다면 요청자가 여러 번
   * 눌러야 하므로, 남은 재우는 꼴 차례는 돌지 않는다(안 돈 차례로 적는다).
   */
  private wakeVia(via: AVia, index: number) {
    for (const step of this.plan) {
      if (step.step >= index && step.via === via && aIsSleep(step.shape)) {
        this.report.sleepDropped.push(step.step);
      }
    }
    this.openVia(
      via,
      false,
      (ok) => {
        if (ok) this.schedule(index);
        else this.skipVia(via, index);
      },
      "wake",
      index,
    );
  }

  /** 길을 연다. 누름 밖에서 막히면(또는 답이 없으면) '한 번 더'를 보이고 resume() 을 기다린다. 열렸는지를 then 에 넘긴다. */
  private openVia(
    via: AVia,
    inGesture: boolean,
    then: (ok: boolean) => void,
    purpose: AOpen["purpose"],
    step: number | null,
  ) {
    // 여는 중에 멈춰도 닫히게 먼저 지금 길로 둔다
    this.via = via;
    this.token += 1;
    const token = this.token;
    let settled = false;
    const reply = (result: AOpenResult, detail: string) => {
      if (settled || this.over || token !== this.token) return;
      settled = true;
      this.clearRoundTimers();
      this.report.opens.push({
        via,
        gesture: inGesture,
        result,
        detail,
        purpose,
        step,
      });
      if (result === "need-gesture" && !inGesture) {
        this.awaiting = { via, then, purpose, step };
        this.on.view({ kind: "tap", via });
        return;
      }
      then(result === "ok");
    };
    // 누름 밖에서 답이 없으면 누름이 필요한 것으로 본다. 누름 안이면 더 기다린 뒤 그대로 가고 형식 측정이 가른다
    if (inGesture) {
      this.roundLater(A_OPEN_GESTURE_WAIT_MS, () => reply("ok", "no-reply"));
    } else {
      this.roundLater(A_OPEN_WAIT_MS, () => reply("need-gesture", "timeout"));
    }
    try {
      this.deps.open(via, inGesture, reply);
    } catch (error) {
      reply("failed", errorFields(error).code);
    }
  }

  private skipVia(via: AVia, index: number) {
    if (!this.report.skipped.includes(via)) this.report.skipped.push(via);
    this.closeVia();
    this.schedule(index);
  }

  /** 형식 측정(Web Audio · 오디오 요소): 세 형식을 번갈아 정한 횟수만큼. 처음에 안 된 형식은 다시 재지 않는다. 읽기 길은 재지 않는다. */
  private measureVia(via: AVia, index: number) {
    if (via === "synth") {
      this.schedule(index);
      return;
    }
    const token = this.token;
    const queue: AFormat[] = [];
    for (let rep = 0; rep < A_FORMAT_REPS; rep++) queue.push(...A_FORMATS);
    const failed = new Set<AFormat>();
    const next = () => {
      if (this.over || token !== this.token) return;
      const format = queue.shift();
      if (format === undefined) {
        const played = aPlayFormatOf(this.report.measures, via);
        this.report.played[via] = played;
        this.on.measured?.(this.report);
        if (played === null) {
          this.skipVia(via, index);
          return;
        }
        this.schedule(index);
        return;
      }
      if (failed.has(format)) {
        next();
        return;
      }
      let settled = false;
      const reply = (result: AMeasure) => {
        if (settled || this.over || token !== this.token) return;
        settled = true;
        this.clearRoundTimers();
        this.report.measures.push(result);
        // 풀지 못함 같은 분명한 실패만 다시 재지 않는다. 답 없음 · '재생이 안 흐름'은 잠깐일 수 있어 다음 바퀴에 다시 잰다
        if (!result.ok && !isPassing(result.error)) failed.add(format);
        next();
      };
      this.roundLater(A_MEASURE_WAIT_MS, () =>
        reply({
          via,
          format,
          ok: false,
          firstSoundMs: null,
          fetchMs: null,
          decodeMs: null,
          error: "timeout",
        }),
      );
      try {
        this.deps.measure(via, format, reply);
      } catch (error) {
        reply({
          via,
          format,
          ok: false,
          firstSoundMs: null,
          fetchMs: null,
          decodeMs: null,
          error: errorFields(error).code,
        });
      }
    };
    next();
  }

  // ---- 차례 ----

  /**
   * 다음 차례를 잡는다. 길이 바뀌면 앞 길을 닫고 새 길을 먼저 연다(건너뛴 길 · 안 돌기로 한 재우는 꼴 차례는 넘긴다).
   * 쉰 뒤 첫 차례는 앞 듣기 end 뒤 정한 쉼을 채운 뒤에 시작한다(문서의 첫 듣기면 기다리지 않는다).
   */
  private schedule(index: number) {
    if (this.over) return;
    let at = index;
    let step = this.plan[at];
    while (
      step !== undefined &&
      (this.report.skipped.includes(step.via) ||
        this.report.sleepDropped.includes(step.step))
    ) {
      at += 1;
      step = this.plan[at];
    }
    if (step === undefined) {
      this.complete();
      return;
    }
    this.on.view({ kind: "wait" });
    if (step.via !== this.via) {
      this.closeVia();
      this.enterVia(step.via, at, false);
      return;
    }
    if (this.wakeBlocked) {
      this.wakeBlocked = false;
      this.asleep = false;
      this.wakeVia(step.via, at);
      return;
    }
    const target = at;
    // 버림 앞 cancel 은 0.3초 먼저 불러, 버림 start 는 앞 진짜 end 뒤 차례 사이(2초)에 맞춘다
    const lead = step.decoyMs > 0 && step.cancel ? ROUND2_CANCEL_SETTLE_MS : 0;
    const prevAt = this.ctx.prevEnd().at;
    const rest =
      step.restMs > 0 && prevAt !== null
        ? step.restMs - (this.deps.now() - prevAt)
        : 0;
    const wait = Math.max(0, step.waitMs - lead, rest);
    if (rest > step.waitMs) {
      this.on.view({ kind: "rest", until: this.deps.now() + wait });
    }
    this.roundLater(wait, () => this.runStep(target));
  }

  /** 차례가 다 돌았다: 읽기 길이 돌았으면 읽기 뒤 다시 재생(M6)을 한 번 하고, 아니면 곧바로 소리 크기 물음으로 간다. */
  private complete() {
    const synthRan = this.finished.some((r) => r.round?.a?.via === "synth");
    if (synthRan && !this.afterStarted) {
      this.afterStarted = true;
      this.afterCheck();
      return;
    }
    this.askVolume();
  }

  /** 맨 끝 물음: '듣기가 켜진 동안 소리가 작아졌나요?'. 답이 없으면 정한 시간 뒤 '답 없음'으로 끝낸다. */
  private askVolume() {
    this.closeVia();
    this.askingVolume = true;
    this.on.view({ kind: "ask-volume" });
    this.roundLater(A_ASK_WAIT_MS, () => this.answerVolume("no-answer"));
  }

  /**
   * 읽기 뒤 다시 재생(M6): Web Audio(첫 번째) → 오디오 요소(두 번째) 순서로 같은 파일을 한 번씩 끝까지 재생하고 기록한 뒤 묻는다.
   * 길은 누름 밖에서 다시 열어 보고 막히면 '한 번 더'를 보인다. 차례를 건너뛴 길은 재생하지 않는다.
   */
  private afterCheck() {
    const after: NonNullable<AReport["after"]> = { plays: [], heard: null };
    this.report.after = after;
    const vias = ["webaudio", "element"] as const;
    const blank = (
      via: AReplay["via"],
      format: AFormat | null,
      error: string,
    ): AReplay => ({
      via,
      format,
      started: false,
      ended: false,
      stateAtStart: null,
      stateAtEnd: null,
      flowedMs: null,
      error,
    });
    const next = (i: number) => {
      if (this.over) return;
      this.closeVia();
      const via = vias[i];
      if (via === undefined) {
        this.asking = true;
        this.on.view({ kind: "ask" });
        this.roundLater(A_ASK_WAIT_MS, () => this.answer("no-answer"));
        return;
      }
      const format = this.report.played[via];
      if (format === null || this.report.skipped.includes(via)) {
        after.plays.push(blank(via, null, "skipped"));
        next(i + 1);
        return;
      }
      this.on.view({ kind: "wait" });
      const opened = (ok: boolean) => {
        if (!ok) {
          after.plays.push(blank(via, format, "open-failed"));
          next(i + 1);
          return;
        }
        this.on.view({ kind: "after", n: i + 1 });
        const token = this.token;
        let settled = false;
        const reply = (result: AReplay) => {
          if (settled || this.over || token !== this.token) return;
          settled = true;
          this.clearRoundTimers();
          after.plays.push(result);
          this.on.view({ kind: "wait" });
          this.roundLater(A_AFTER_GAP_MS, () => next(i + 1));
        };
        this.roundLater(A_REPLAY_WAIT_MS, () =>
          reply(blank(via, format, "timeout")),
        );
        try {
          this.deps.replay(via, format, reply);
        } catch (error) {
          reply(blank(via, format, errorFields(error).code));
        }
      };
      this.openVia(via, false, opened, "after", null);
    };
    next(0);
  }

  private finishRound() {
    this.over = true;
    this.closeVia();
    const line = aLineOf(aLinesOf(this.finished), this.report);
    this.on.view({ kind: "done", line });
    this.on.done({
      autoRun: this.autoRun,
      hidden: this.hidden,
      stopped: false,
      report: this.report,
    });
  }

  private runStep(index: number) {
    if (this.over) return;
    const plan = this.plan[index];
    if (plan === undefined) return;
    this.index = index;
    const prev = this.ctx.prevEnd();
    const record: ProbeRecord = {
      id: 0,
      ...this.ctx.header,
      resetStep: plan.resetStep,
      strategy: "AR",
      lang: LANG_OF.AR,
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
      unlockBefore: null,
      round: {
        step: plan.step,
        decoyMs: plan.decoyMs,
        speak: !aIsBare(plan.shape),
        live: "na",
        real: "plain",
        path: "dead",
        slots: [],
        sound: null,
        sentence: A_SENTENCE,
        cancel: plan.cancel,
        waitSound: true,
        group: null,
        a: {
          via: plan.via,
          shape: plan.shape,
          rep: plan.rep,
          format: this.report.played[plan.via],
          synthCalls: this.deps.synthCalls(),
        },
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
      endedEarly: false,
      appleHit: false,
      seen: new Set(),
      done: false,
    };
    this.stepRun = run;
    // 차례를 시작할 때와 진짜 듣기를 열 때(openReal) Web Audio 길의 AudioContext 상태를 남긴다(없으면 none)
    this.push(run, {
      type: "webaudio-start",
      at: this.deps.now(),
      attempt: 0,
      code: this.deps.audioState() ?? "none",
      message: "step",
    });
    if (aIsBare(plan.shape)) {
      this.bareSound(run);
      return;
    }
    if (plan.cancel) {
      this.cancelFirst(run, () => this.openDecoy(run));
      return;
    }
    this.openDecoy(run);
  }

  /** 읽기 길만: 읽기 앞 cancel — 부를 때의 speaking · pending 을 남기고 cancel, 0.3초 뒤 다시 재서 남긴 다음 잇는다. */
  private cancelFirst(run: Run, then: () => void) {
    const attempt = run.attempt;
    const sound = this.deps.sound(run.plan.via);
    const state = sound?.state();
    this.push(run, {
      type: "speak-cancel",
      at: this.deps.now(),
      attempt,
      code: "before-speak",
      speaking: state?.speaking === true,
      pending: state?.pending === true,
    });
    sound?.cancel();
    this.after(run, ROUND2_CANCEL_SETTLE_MS, () => {
      if (run.done || this.stepRun !== run || run.attempt !== attempt) return;
      this.pushState(run, "after-cancel");
      then();
    });
  }

  /** 세션 없이: 소리 → 끝(또는 '끝 없음') → 멈춤 확인 → 1초 → 진짜. */
  private bareSound(run: Run) {
    run.phase = "bare";
    this.on.view({ kind: "wait" });
    const play = () => {
      let settled = false;
      const next = () => {
        if (settled || run.done || this.stepRun !== run) return;
        settled = true;
        this.clearTimers(run);
        this.gapThenReal(run);
      };
      // 재우는 꼴: 소리가 끝나면 소리 출력을 재운 뒤에 잇는다
      const ended = () => {
        if (settled || run.done || this.stepRun !== run) return;
        if (aIsSleep(run.plan.shape)) this.sleepNow(run, next);
        else next();
      };
      const rearm = this.watch(run, A_SOUND_END_WAIT_MS, () => {
        if (settled) return;
        this.soundMissing(run, "bare");
        next();
      });
      this.playLine(run, "bare", ended, rearm);
    };
    if (run.plan.cancel) this.cancelFirst(run, play);
    else play();
  }

  /** 버림 세션: 하한 뒤 · 소리 끝 + 0.3초 뒤 둘 다 채우면 stop. 소리는 audiostart 0.2초 뒤(1초까지 없으면 1초 때). */
  private openDecoy(run: Run) {
    run.phase = "decoy";
    run.record.round?.slots.push({
      role: "decoy",
      plannedMs: run.plan.decoyMs,
      speak: true,
    });
    this.on.view({ kind: "wait" });
    const attempt = this.startRec(run);
    if (attempt === null) return;
    const current = () => this.isCurrent(run, attempt) && run.phase === "decoy";
    this.after(run, run.plan.decoyMs, () => {
      if (!current()) return;
      run.minMet = true;
      this.maybeClose(run);
    });
    this.after(run, ROUND2_SOUND_FALLBACK_MS, () => {
      if (current()) this.callSound(run);
    });
  }

  private onDecoyAudioStart(run: Run, attempt: number) {
    if (run.soundCalled) return;
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
      const tail = () =>
        this.after(run, ROUND2_SOUND_TAIL_MS, () => {
          if (!this.isCurrent(run, attempt) || run.phase !== "decoy") return;
          run.soundDone = true;
          this.maybeClose(run);
        });
      // 재우는 꼴: 소리가 끝나면 소리 출력을 재운 뒤 0.3초를 센다(버림은 그 뒤에 닫는다)
      if (aIsSleep(run.plan.shape)) this.sleepNow(run, tail);
      else tail();
    };
    const rearm = this.watch(run, A_SOUND_END_WAIT_MS, () => {
      if (settled || !this.isCurrent(run, attempt)) return;
      if (run.phase !== "decoy") return;
      settled = true;
      this.soundMissing(run, "line");
      run.soundDone = true;
      this.maybeClose(run);
    });
    this.playLine(run, "line", ended, rearm);
  }

  /**
   * 재우는 꼴: 소리 출력을 재우고(suspend) 그 답(재운 뒤 상태)을 적은 뒤 잇는다. 답이 없으면 상한 뒤 'no-reply' 로 적고 잇는다.
   * 다음 소리는 내는 쪽이 스스로 깨운다(playLine 이 그 결과를 길 열기 기록에 '깨우기'로 적는다).
   */
  private sleepNow(run: Run, then: () => void) {
    const attempt = run.attempt;
    this.asleep = true;
    this.push(run, {
      type: "webaudio-sleep",
      at: this.deps.now(),
      attempt,
      code: "call",
    });
    let settled = false;
    const reply = (state: string) => {
      if (settled) return;
      settled = true;
      this.push(run, {
        type: "webaudio-sleep",
        at: this.deps.now(),
        attempt,
        code: state,
        message: "reply",
      });
      if (!run.done && this.stepRun === run) then();
    };
    this.after(run, A_SLEEP_WAIT_MS, () => reply("no-reply"));
    try {
      this.deps.sleep(run.plan.via, reply);
    } catch (error) {
      reply(errorFields(error).code);
    }
  }

  /** 소리 끝이 상한 안에 안 왔다: 표지를 남기고 그 길의 소리를 멈춘다. */
  private soundMissing(run: Run, kind: "line" | "bare") {
    const at = this.deps.now();
    // 재운 소리 출력을 깨워야 하는 소리였다면 못 깨운 것으로 본다(다음 차례 앞에 길을 다시 연다)
    if (this.asleep) this.noteWake(run, "need-gesture", "timeout");
    this.push(run, {
      type: "speak-end-missing",
      at,
      attempt: run.attempt,
      utterance: kind,
    });
    const sound = this.deps.sound(run.plan.via);
    const state = sound?.state();
    this.push(run, {
      type: "speak-cancel",
      at,
      attempt: run.attempt,
      code: "end-missing",
      speaking: state?.speaking === true,
      pending: state?.pending === true,
    });
    sound?.cancel();
  }

  private maybeClose(run: Run) {
    if (run.phase !== "decoy" || !run.minMet || !run.soundDone) return;
    if (run.endedEarly) {
      // 버림은 이미 끝났다: stop 없이 소리 끝 + 0.3초 뒤 멈춤 확인으로
      run.phase = "ending";
      this.clearTimers(run);
      this.gapThenReal(run);
      return;
    }
    run.phase = "ending";
    this.clearTimers(run);
    this.pushState(run, "stop");
    this.push(run, {
      type: "stop-call",
      at: this.deps.now(),
      attempt: run.attempt,
      code: "decoy",
    });
    this.awaitEnd(run, () => this.gapThenReal(run));
    tryCall(() => run.rec?.stop());
  }

  /** 버림이 저절로 끝났다(end 가 먼저 옴): 부른 소리가 아직 나오는 중이면 그 끝을 기다리고, 아니면 곧바로 간다. 그 차례는 깨끗에서 빠진다. */
  private decoyEndedEarly(run: Run) {
    run.endedEarly = true;
    if (run.soundCalled && !run.soundDone) {
      run.minMet = true;
      return;
    }
    run.phase = "ending";
    this.clearTimers(run);
    this.gapThenReal(run);
  }

  /** 소리가 멈추기를 0.3초까지 기다려 남기고 1초 뒤 진짜를 연다. */
  private gapThenReal(run: Run) {
    if (run.done || this.stepRun !== run) return;
    run.phase = "gap";
    const began = this.deps.now();
    const tick = () => {
      if (run.done || this.stepRun !== run) return;
      const state = this.deps.sound(run.plan.via)?.state();
      const waited = this.deps.now() - began;
      if (
        state === undefined ||
        !state.speaking ||
        waited >= ROUND2_SPEAKING_POLL_MS
      ) {
        this.pushState(run, "gap", String(Math.round(waited)));
        this.after(run, DECOY_GAP_MS, () => {
          if (!run.done && this.stepRun === run) this.openReal(run);
        });
        return;
      }
      this.after(run, ROUND2_POLL_STEP_MS, tick);
    };
    tick();
  }

  /** 진짜 세션: start 를 부를 때 화면에 크게 'apple'. 'apple' 이 든 결과가 정한 시간 안에 없으면 stop, 든 뒤 1.5초 조용하면 stop. */
  private openReal(run: Run) {
    run.phase = "real";
    run.appleHit = false;
    run.record.round?.slots.push({
      role: "real",
      plannedMs: null,
      speak: false,
    });
    this.pushState(run, "real", undefined, run.record.attempts.length);
    this.push(run, {
      type: "webaudio-start",
      at: this.deps.now(),
      attempt: run.record.attempts.length,
      code: this.deps.audioState() ?? "none",
      message: "real",
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
    this.after(run, MAX_LISTEN_MS, () => {
      if (current()) this.stopReal(run, "cap");
    });
    this.after(run, A_NO_RESULT_STOP_MS, () => {
      if (current() && !run.appleHit) this.stopReal(run, "no-result");
    });
  }

  private onRealResult(run: Run, apple: boolean) {
    if (apple && !run.appleHit) {
      run.appleHit = true;
      this.on.view({ kind: "wait" });
    }
    if (run.appleHit) this.quiet(run, () => this.stopReal(run, "silence"));
  }

  private stopReal(run: Run, reason: StopReason) {
    if (run.phase !== "real") return;
    run.phase = "stopping";
    this.clearTimers(run);
    // stop 뒤 end 까지 'apple' 을 보이지 않는다
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
      this.closeVia();
      this.on.view(null);
      this.on.done({
        autoRun: this.autoRun,
        hidden: this.hidden,
        stopped: true,
        report: this.report,
      });
      return;
    }
    if (!this.over) this.schedule(this.index + 1);
  }

  // ---- 인식 · 소리 ----

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
      // Web Audio 칸에는 이 라운드가 연 AudioContext 의 상태를 둔다(없으면 쪽의 무음 WebAudio 상태)
      run.record.webAudioState = this.deps.audioState() ?? snap.webAudioState;
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
      // WR2 와 같은 표지: apple 은 중간 · final 어디든, 메아리는 이번에 바뀐 결과 글에 읽은 문장의 낱말
      const apple = hasWord(heard, "apple");
      const echo = isEcho(changed, "long");
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
          ...(echo ? { echo: true } : {}),
        });
      } else {
        run.record.droppedInterims += 1;
      }
      if (this.isCurrent(run, attempt) && run.phase === "real") {
        this.onRealResult(run, apple);
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

  /**
   * 그 길로 문장 하나를 낸다. 읽기 길은 문장을 읽고(첫 선생님 높이 · 목소리 순서), Web Audio · 오디오 요소 길은 형식 측정에서 고른
   * 형식의 파일을 새로 받아 와 재생한다. 부르기 직전에 speak-call 표지(그때 그 길의 재생 상태)를 남긴다.
   */
  private playLine(
    run: Run,
    utterance: "line" | "bare",
    done: () => void,
    started: () => void,
  ) {
    const attempt = run.attempt;
    const via = run.plan.via;
    const sound = this.deps.sound(via);
    const format = this.report.played[via];
    const text =
      via === "synth"
        ? A_SENTENCE
        : format === null
          ? null
          : A_AUDIO_URL[format];
    if (sound === null || text === null) {
      this.push(run, {
        type: "speak-error",
        at: this.deps.now(),
        attempt,
        utterance,
        code: sound === null ? "no-sound" : "no-format",
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
    const state = sound.state();
    // 재워 둔 소리 출력을 이 소리가 깨워야 하는가(재우는 꼴 다음 소리)
    const waking = this.asleep;
    this.ctx.markSpoke();
    this.push(run, {
      type: "speak-call",
      at: this.deps.now(),
      attempt,
      utterance,
      speaking: state.speaking,
      pending: state.pending,
      code: via,
      message: text,
    });
    sound.speak(
      {
        text,
        ...(via !== "synth" || teacher === null
          ? {}
          : { pitch: teacher.pitch, prefer: teacher.prefer }),
      },
      {
        start: (label) => {
          if (waking && this.asleep) this.noteWake(run, "ok", label);
          // 덧붙임(AudioContext 상태 · 요소 준비 상태 · 목소리 이름)은 서버 기록에 가는 code 자리에도 둔다
          this.push(run, {
            type: "speak-start",
            at: this.deps.now(),
            attempt,
            utterance,
            code: label,
            message: label,
          });
          started();
        },
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
          if (waking && this.asleep) {
            this.noteWake(
              run,
              code.startsWith("resume-blocked") ? "need-gesture" : "failed",
              code,
            );
          }
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

  /** 재운 소리 출력을 다음 소리가 누름 밖에서 깨웠는지를 길 열기 기록에 적는다. 못 깨웠으면 다음 차례 앞에 길을 다시 연다. */
  private noteWake(run: Run, result: AOpenResult, detail: string) {
    this.report.opens.push({
      via: run.plan.via,
      gesture: false,
      result,
      detail,
      purpose: "wake",
      step: run.plan.step,
    });
    if (result === "ok") this.asleep = false;
    else this.wakeBlocked = true;
  }

  // ---- 작은 도움 ----

  /** speak-state(code 자리 · message 덧붙임): 그때 그 길의 재생 상태(읽기 길은 speaking · pending). */
  private pushState(
    run: Run,
    code: "after-cancel" | "stop" | "gap" | "real",
    message?: string,
    attempt: number = run.attempt,
  ) {
    const state = this.deps.sound(run.plan.via)?.state();
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

  /** 상한 타이머를 걸고, 다시 재는 함수를 돌려준다(시작 알림이 오면 그때부터 다시 잰다). */
  private watch(run: Run, ms: number, fire: () => void): () => void {
    let id = this.deps.later(fire, ms);
    run.timers.push(id);
    return () => {
      this.deps.cancelLater(id);
      id = this.deps.later(fire, ms);
      run.timers.push(id);
    };
  }

  private isCurrent(run: Run, attempt: number) {
    return this.stepRun === run && run.attempt === attempt && !run.done;
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

// 버리는 듣기 층(iPad 버리는 듣기 plan 묶음 2-나 · 접점 표 '층' · 정한 것 1 · 2 · 4 · 5, spec 설계 1 · 2 · 3).
// 음성 접점(browser.ts) 바로 위 · 선생님 목소리 감싸기(teacher.ts) 아래에 놓여, 듣기 차례 기계(core/speech/discard)의 효과를 음성 접점
// 호출로 옮긴다. 화면 · 틀은 지금처럼 port 의 speak · listen 을 부르고, 층은 speak 를 가로채 보류 · 흘림 · 버림을 하며 listen 은 손잡이를
// 바로 주고 진짜는 기계가 정한 때에 연다. 깨울 시각 타이머 · 읽기 시작 알림 추적(F9) · discard-note 기록 · view 알림도 층이 맡는다.
// 끔 · 켜지 않은 기기는 discardLayerFor 가 null 을 돌려 층이 없고, 음성 접점의 openDiscard · synthState 를 부르는 곳이 없다(AC-11).
//
// 기계 파일 머리 '층과의 약속'을 이렇게 지킨다:
// - unlock 은 첫 누름의 press 보다 먼저 보낸다(listen 이 잠금 풀기를 먼저 부른다). 그 전에는 기계가 start 효과를 내지 않는다(I-4).
// - synth 는 매 입력 앞에 speechSynthesis.speaking 을 읽어 바뀐 때 보낸다(tick · press · speak-end · cut 앞 모두, 검토 1 6절 3).
// - 가로챈 읽기는 speak-release 뒤에만 읽고, speak-drop 이면 읽지 않고 끊김(cancelled)으로 돌려준다.
// - need-sound 에는 늘 읽기 하나(short · word)와 그 끝의 sound-end 로 답한다. 소리 공급이 없거나 비면 틀이 넣은 대비 줄을 읽는다(검토 1 6절 4).
// - 버림 사건은 openDiscard 를 부를 때 닫아 둔 버림 번호를 싣는다(음성 접점이 따로 세는 번호와 같다 — 이 접점에서 버림을 여는 것은 층뿐).
// - real-end 는 진짜가 끝난 그 걸음에, 화면에 결과를 넘기기(손잡이 outcome 풀기) 전에 보낸다(진짜 동안 온 again 은 버려짐, 재검토 N-1).
// - discard-note 는 기계의 note 효과를 real-start(음성 접점 listen) 바로 앞 같은 기록 통로(onTrace)에 남긴다(검토 4 '3 · 5 에 넘길 것').
// - 살아 있는 버림도 stop 으로만 닫는다. 층은 버림을 abort 하지 않는다(F3 — 숨김 · 마이크 확인 · 닫기의 abort 는 음성 접점 몫).
// - 닫는 중 end 상한(speech.watchdog_extra_seconds)과 상한 뒤 늦게 온 end 는 기계가 맡는다(검토 2-가 4절 1).
// 시점 숫자는 없다. 모두 DiscardSettings · SpeechSettings 에서 기계의 시간 묶음으로 만든다(plan 정한 것 4).
import type { DeviceVerdict } from "@/core/speech/device";
import {
  type DiscardFlowEffect,
  type DiscardFlowInput,
  type DiscardFlowState,
  type DiscardReadKind,
  type DiscardReopenWhy,
  type DiscardStep,
  type DiscardView,
  discardTimesOf,
  type RealEndKind,
  startDiscardFlow,
  stepDiscardFlow,
} from "@/core/speech/discard";
import {
  type DiscardSettings,
  discardOnDevice,
} from "@/core/speech/discard-settings";
import type {
  EndRule,
  ListenOutcome,
  SpeechSettings,
} from "@/core/speech/listen";
import type {
  DiscardHandle,
  ListenCallbacks,
  ListenHandle,
  MicrophoneCheck,
  SpeakOptions,
  SpeakOutcome,
  SpeechPort,
  SpeechTraceEntry,
} from "./types";

/** 기계가 부른 버림 안 소리의 자리: again 은 다시 말할 차례, mic 은 회복(F10). */
export type DiscardSoundNeed = "again" | "mic";
/**
 * 화면이 공급하는 버림 안 소리 한 줄. short 는 짧은 말, word 는 따라 말하기의 들려줄 말 다시 읽기다. 층이 teacherSpeech 아래에서 읽으므로
 * 화면은 onStart · onEnd 로 선생님 말하기 상태를 켜고 끈다(정본 03절 95줄 · spec 설계 3, 검토 2-나 I-2).
 */
export type DiscardSoundLine = {
  text: string;
  sound: Extract<DiscardReadKind, "short" | "word">;
  options?: SpeakOptions;
  /** 이 줄이 실제로 시작한 알림에 한 번(끝난 뒤 · 끊긴 뒤의 늦은 알림은 넘기지 않는다). options.onStart 는 그대로 넘긴다. */
  onStart?: () => void;
  /** 이 줄이 끝나는 모든 길(끝 · 끊김 · 오류 · 거둠 · 층 닫기)에서 한 번. 시작하지 못했어도 부른다. */
  onEnd?: (outcome: SpeakOutcome) => void;
};
/**
 * 소리 공급(화면이 setSoundSource 로 건다). 층이 줄을 읽는다(선생님 높이 · 목소리는 options 로 넘긴다). 말풍선 표시는 화면이 이
 * 함수 안에서 한다. undefined 를 돌리거나 던지면 DiscardLayerOptions.fallbackLines 의 그 자리 줄을 읽는다.
 */
export type DiscardSoundSource = (
  need: DiscardSoundNeed,
) => DiscardSoundLine | undefined;

/** 층의 타이머(시험이 가짜 시계를 넘긴다). */
export type DiscardLayerTimers = {
  set(fn: () => void, ms: number): unknown;
  clear(id: unknown): void;
};

/** 쪽 숨김 알림(기본은 document visibilitychange). */
export type DiscardVisibility = {
  hidden(): boolean;
  subscribe(fn: () => void): () => void;
};

export type DiscardLayerOptions = {
  discard: DiscardSettings;
  speech: Pick<SpeechSettings, "maxListenMs" | "watchdogExtraMs">;
  /** 음성 접점 device() 의 판정(렌더 뒤에 틀이 읽어 넘긴다). */
  verdict: Pick<DeviceVerdict, "name">;
  /**
   * 소리 공급이 없거나 줄을 주지 않거나 던질 때 읽는 자리별 대비 줄(검토 1 6절 4 · 검토 2-나 M-1). 걸린 누름이 소리 없는 버림 안에서
   * 안전 상한마다 다시 열며 끝없이 기다리지 않게 한다. 틀이 seed 짧은 말 목록 1-3 구간의 자리별 첫 줄을 선생님 목소리 options 와 넣는다.
   */
  fallbackLines: Readonly<Record<DiscardSoundNeed, DiscardSoundLine>>;
  /** 음성 접점과 같은 기록 통로(회화 틀은 listenLog.record). discard-note 를 남긴다. */
  onTrace?: (entry: SpeechTraceEntry) => void;
  now?: () => number;
  timers?: DiscardLayerTimers;
  visibility?: DiscardVisibility;
};

/** 화면 · 틀이 쓰는 층 접점(plan 접점 표 '층'). */
export interface DiscardLayer {
  /** 틀이 teacherSpeech 로 감싸 쓰는 음성 접점(openDiscard · synthState 는 넘기지 않는다). */
  readonly port: SpeechPort;
  /** 회복(F10 · 정한 것 5): deaf 로 끝난 진짜 뒤 화면이 누름 없이 거는 듣기(press auto). 잠금 풀기를 부르지 않는다. */
  listenAuto(rule: EndRule, on?: ListenCallbacks): ListenHandle;
  /**
   * 화면이 누름 없이 다시 말할 차례 안내를 보임(말소리 없음 · 결과 없음 · 다시 듣는 오류 뒤). '다시 말하기' 누름에는 부르지 않는다 — 누름만으로
   * 기계가 짧은 말을 부른다(F4 (2), 검토 2-나 I-1). 넘김 · 건너뜀에도 부르지 않는다(I-1).
   */
  again(): void;
  /** '잘 모르겠어요': 걸린 누름 · 회복 · 다시 말할 차례를 거둔다(걸린 손잡이는 끊김으로 끝남). */
  dontKnow(): void;
  /** 틀 · 따라 말하기 조각의 '소리 끝' 알림(설계 2). 여러 번 불러도 된다. */
  soundEnd(): void;
  /** 서버 차례 기다림(턴을 보낸 뒤 끝 줄 전). 켜진 동안 버림의 안전 상한을 세지 않는다(N-1). */
  serverWait(on: boolean): void;
  /** 떠남(쉬는 안내 · 막힘 · 마무리 · 홈 — 정리 따라 말하기는 떠남이 아님): 열린 버림을 stop 하고 진짜 · 걸린 누름을 끊는다. */
  leave(): void;
  setSoundSource(source: DiscardSoundSource | undefined): void;
  view(): DiscardView;
  /** view 가 바뀔 때마다 부른다(걸 때 지금 값으로 한 번). 돌려준 함수로 끊는다. */
  subscribe(fn: (view: DiscardView) => void): () => void;
  /** 타이머 · 숨김 알림을 거두고 열린 버림을 stop 한다. 음성 접점은 닫지 않는다(port.dispose 는 둘 다 닫는다). */
  dispose(): void;
}

/**
 * 버리는 듣기 층을 만든다. speech.discard_mode 가 이 기기에서 켜지지 않았거나(off · 켜지 않은 기기) 음성 접점에 openDiscard 가 없으면
 * null — 틀은 지금 객체를 그대로 쓰고 층 · 기계 · 접점의 새 능력 어느 것도 닿지 않는다(AC-11).
 */
export function discardLayerFor(
  port: SpeechPort,
  options: DiscardLayerOptions,
): DiscardLayer | null {
  if (!discardOnDevice(options.discard.mode, options.verdict)) return null;
  if (port.openDiscard === undefined) return null;
  return createDiscardLayer(port, options);
}

// ── 안쪽 ──

type Reading = {
  id: number;
  text: string;
  options: SpeakOptions | undefined;
  sound: DiscardReadKind;
  /** 결과를 한 번만 돌려준다(need-sound 줄이면 그 onEnd 도 이때). */
  resolve(outcome: SpeakOutcome): void;
  /** need-sound 줄의 시작 알림(한 번). */
  onStart: (() => void) | undefined;
  /** resolve 를 이미 불렀다. */
  ended: boolean;
  /** held 기계가 보류 중 · live 음성 접점이 읽는 중 · done 끝. */
  stage: "held" | "live" | "done";
  started: boolean;
  /** 층이 이미 기계에 끊김으로 알린 읽기(누름 · 화면 cancel) — 결과를 기계에 다시 알리지 않는다. */
  silent: boolean;
  /** 보류 중 화면이 거둔 읽기(cancelSpeaking) — 흘려도 읽지 않고 기계에서 걷어 낸다. */
  dropped: boolean;
  /** need-sound 에 답한 읽기(끝나면 층이 sound-end 를 보낸다). */
  needed: boolean;
};

type Listening = {
  rule: EndRule;
  on: ListenCallbacks | undefined;
  auto: boolean;
  resolve(outcome: ListenOutcome): void;
  /** 진짜를 연 뒤의 음성 접점 손잡이. */
  inner: ListenHandle | undefined;
  /** 층이 끊은 까닭(interrupted 의 why — 마이크 확인 · 떠남 · 숨김). */
  why: DiscardReopenWhy | undefined;
  settled: boolean;
};

const interrupted = (
  reason: "hidden" | "leave",
): ListenOutcome & { kind: "interrupted" } => ({
  kind: "interrupted",
  reason,
  partialText: "",
});

/** 진짜 듣기 결과를 기계 입력으로 옮긴다(검토 1 6절 2): 다시 듣는 오류만 error, 마이크를 쓸 수 없음은 unavailable, network 는 error. */
export function realEndOf(
  outcome: ListenOutcome,
  why: DiscardReopenWhy | undefined,
): Extract<DiscardFlowInput, { type: "real-end" }> {
  let kind: RealEndKind;
  switch (outcome.kind) {
    case "error":
      kind = outcome.group === "mic-unavailable" ? "unavailable" : "error";
      break;
    case "interrupted":
      return {
        type: "real-end",
        kind: "interrupted",
        why: why ?? (outcome.reason === "hidden" ? "hidden" : "leave"),
      };
    default:
      kind = outcome.kind;
  }
  return { type: "real-end", kind };
}

function defaultTimers(): DiscardLayerTimers {
  return {
    set: (fn, ms) => globalThis.setTimeout(fn, ms),
    clear: (id) => globalThis.clearTimeout(id as ReturnType<typeof setTimeout>),
  };
}

function documentVisibility(): DiscardVisibility | undefined {
  if (typeof document === "undefined") return undefined;
  return {
    hidden: () => document.hidden,
    subscribe(fn) {
      document.addEventListener("visibilitychange", fn);
      return () => document.removeEventListener("visibilitychange", fn);
    },
  };
}

function createDiscardLayer(
  inner: SpeechPort,
  options: DiscardLayerOptions,
): DiscardLayer {
  const now = options.now ?? (() => performance.now());
  const timers = options.timers ?? defaultTimers();
  const trace = (entry: SpeechTraceEntry) => options.onTrace?.(entry);
  const openDiscard = inner.openDiscard?.bind(inner);

  let disposed = false;
  let unlocked = false;
  // 처음 걸음의 효과는 view 하나뿐이고 상태에 이미 있다(깨울 시각도 없다).
  const first = startDiscardFlow(
    discardTimesOf(options.discard, options.speech),
  );
  let state: DiscardFlowState = first.state;
  let view: DiscardView = state.view;
  let wakeAt = first.wakeAt;
  let timer: unknown;
  /** 마지막으로 기계에 보낸 speechSynthesis.speaking. */
  let lastSpeaking = false;
  const queue: DiscardFlowInput[] = [];
  let draining = false;

  let readingCount = 0;
  const readings = new Map<number, Reading>();
  /** 기계의 읽는 중 목록에 남았지만 음성 접점에는 없는 읽기(거둔 · 시작 전 끊긴 · 건너뛴 읽기). 다른 읽기가 없을 때 cut 으로 걷는다. */
  const retiring = new Set<number>();
  const discards = new Map<number, DiscardHandle>();
  /** 결과 사건 수를 마지막 결과 목록 길이로 맞추려고 버림마다 본 가장 긴 목록(검토 2-가 4절 6). */
  const resultCounts = new Map<number, number>();
  let source: DiscardSoundSource | undefined;
  const listeners = new Set<(view: DiscardView) => void>();

  /** 걸린 누름의 손잡이(진짜를 열기 전). */
  let pending: Listening | undefined;
  /** 열린 진짜의 손잡이. */
  let active: Listening | undefined;

  // ── 기계 걸음 ──

  function send(input: DiscardFlowInput) {
    if (disposed) return;
    queue.push(input);
    if (draining) return;
    draining = true;
    try {
      while (queue.length > 0 && !disposed) {
        const next = queue.shift();
        if (next === undefined) break;
        syncSynth(next);
        apply(stepDiscardFlow(state, next, now()));
        reconcilePress();
      }
    } finally {
      draining = false;
    }
    schedule();
  }

  /** 매 입력 앞에 읽어 주기 상태를 읽어 바뀐 때만 synth 를 보낸다(기계는 마지막 값을 쓴다). */
  function syncSynth(next: DiscardFlowInput) {
    if (next.type === "synth") return;
    const speaking = inner.synthState?.().speaking ?? false;
    if (speaking === lastSpeaking) return;
    lastSpeaking = speaking;
    apply(stepDiscardFlow(state, { type: "synth", speaking }, now()));
  }

  /** 걸린 손잡이가 있는데 기계에 누름이 없으면(진짜가 끝나기 전에 온 listen) 누름을 다시 건다. */
  function reconcilePress() {
    if (pending === undefined) return;
    if (state.press !== undefined || state.phase === "real") return;
    queue.push({ type: "press", auto: pending.auto });
  }

  function apply(step: DiscardStep) {
    state = step.state;
    wakeAt = step.wakeAt;
    for (const effect of step.effects) run(effect);
  }

  function schedule() {
    if (timer !== undefined) timers.clear(timer);
    timer = undefined;
    if (disposed || wakeAt === undefined) return;
    timer = timers.set(
      () => {
        timer = undefined;
        send({ type: "tick" });
      },
      Math.max(0, wakeAt - now()),
    );
  }

  function run(effect: DiscardFlowEffect) {
    switch (effect.type) {
      case "discard-start":
        startDiscard(effect.discard);
        return;
      case "discard-stop":
        discards.get(effect.discard)?.stop();
        return;
      case "real-start":
        openReal();
        return;
      case "speak-release":
        release(effect.id);
        return;
      case "speak-drop":
        dropReading(effect.id);
        return;
      case "cancel-speaking":
        // 누름(F9)이나 굳은 읽기: 기계는 이미 읽는 중 목록을 비웠다. 남은 결과는 기계에 알리지 않는다.
        for (const reading of readings.values()) {
          if (reading.stage === "live") reading.silent = true;
        }
        retiring.clear();
        inner.cancelSpeaking();
        return;
      case "need-sound":
        needSound(effect.kind);
        return;
      case "press-drop":
        dropPress(effect.reason === "hidden" ? "hidden" : "leave");
        return;
      case "view":
        view = effect.view;
        for (const fn of listeners) fn(view);
        return;
      case "note":
        trace({ at: now(), kind: "discard-note", dc: effect.dc });
        return;
    }
  }

  // ── 버림 ──

  function startDiscard(id: number) {
    if (openDiscard === undefined) return;
    resultCounts.set(id, 0);
    let handle: DiscardHandle;
    try {
      handle = openDiscard({
        audio: () => send({ type: "discard-audio", discard: id }),
        result: (count) => {
          const seen = resultCounts.get(id) ?? 0;
          if (count <= seen) return;
          resultCounts.set(id, count);
          for (let i = seen; i < count; i += 1) {
            send({ type: "discard-result", discard: id });
          }
        },
        error: (code) => send({ type: "discard-error", discard: id, code }),
        end: () => {
          discards.delete(id);
          resultCounts.delete(id);
          send({ type: "discard-end", discard: id });
        },
      });
    } catch {
      // 음성 접점을 이미 닫음(화면이 사라지는 중) — 층도 멈춘다.
      dispose();
      return;
    }
    discards.set(id, handle);
  }

  // ── 읽기 ──

  function newReading(
    text: string,
    speakOptions: SpeakOptions | undefined,
    sound: DiscardReadKind,
    line: DiscardSoundLine | undefined,
  ): { reading: Reading; outcome: Promise<SpeakOutcome> } {
    readingCount += 1;
    let settle: (outcome: SpeakOutcome) => void = () => {};
    const outcome = new Promise<SpeakOutcome>((r) => {
      settle = r;
    });
    const reading: Reading = {
      id: readingCount,
      text,
      options: speakOptions,
      sound,
      resolve(result) {
        if (reading.ended) return;
        reading.ended = true;
        settle(result);
        line?.onEnd?.(result);
      },
      onStart: line?.onStart,
      ended: false,
      stage: "held",
      started: false,
      silent: false,
      dropped: false,
      needed: line !== undefined,
    };
    readings.set(reading.id, reading);
    return { reading, outcome };
  }

  function speak(
    text: string,
    speakOptions?: SpeakOptions,
  ): Promise<SpeakOutcome> {
    if (disposed) return inner.speak(text, speakOptions);
    const { reading, outcome } = newReading(
      text,
      speakOptions,
      "teacher",
      undefined,
    );
    send({ type: "speak-request", id: reading.id, sound: reading.sound });
    return outcome;
  }

  function release(id: number) {
    const reading = readings.get(id);
    if (reading === undefined || reading.stage !== "held") return;
    if (reading.dropped) {
      // 화면이 보류 중에 거둔 읽기: 읽지 않고 기계의 읽는 중 목록에서 걷어 낸다.
      reading.stage = "done";
      readings.delete(id);
      retire(id);
      return;
    }
    reading.stage = "live";
    void inner
      .speak(reading.text, {
        ...reading.options,
        onStart: () => {
          if (reading.stage === "live" && !reading.silent && !reading.started) {
            reading.started = true;
            send({ type: "speak-start", id });
          }
          reading.options?.onStart?.();
          if (!reading.ended && !reading.silent) {
            const announce = reading.onStart;
            reading.onStart = undefined;
            announce?.();
          }
        },
      })
      .then(
        (outcome) => spoken(reading, outcome),
        // 드문 거절(음성 접점 Promise 안 synth.speak 가 던짐 — teacher.ts '드문 거절'): 끝나지 않은 채 기계의 읽는 중 목록에 남지 않게
        // 오류로 끝낸다. 시작 알림 전이면 기계에는 들려주지 못함(speak-end heard 거짓)으로 가고 onEnd 도 한 번 온다(검토 2-나 재검토 5절).
        () =>
          spoken(reading, {
            kind: "error",
            code: "speak-rejected",
            started: reading.started,
          }),
      );
  }

  function spoken(reading: Reading, outcome: SpeakOutcome) {
    const wasLive = reading.stage === "live";
    reading.stage = "done";
    readings.delete(reading.id);
    const told = wasLive && !reading.silent;
    if (told) {
      switch (outcome.kind) {
        case "ended":
          send({
            type: "speak-end",
            id: reading.id,
            heard: outcome.heard !== "not_played",
          });
          break;
        case "error":
          send({ type: "speak-end", id: reading.id, heard: outcome.started });
          break;
        case "unsupported":
          send({ type: "speak-end", id: reading.id, heard: false });
          break;
        case "cancelled":
        case "skipped":
          // 시작한 뒤 끊겼으면 들려준 소리, 시작 전이면 소리 없이 걷어 낸다('들려주지 못함'으로 세지 않음).
          if (reading.started) {
            send({ type: "speak-end", id: reading.id, heard: true });
          } else {
            retire(reading.id);
          }
          break;
      }
      retireIfIdle();
    }
    reading.resolve(outcome);
    if (reading.needed && told) neededDone();
  }

  function retire(id: number) {
    retiring.add(id);
    retireIfIdle();
  }

  /** 음성 접점이 읽는 중인 읽기가 없을 때 걷어 낼 읽기를 cut(시작 전)으로 한꺼번에 걷는다. */
  function retireIfIdle() {
    if (retiring.size === 0) return;
    for (const reading of readings.values()) {
      if (reading.stage === "live" && !reading.silent) return;
    }
    retiring.clear();
    send({ type: "cut", started: false });
  }

  function dropReading(id: number) {
    const reading = readings.get(id);
    if (reading === undefined) return;
    reading.stage = "done";
    readings.delete(id);
    reading.resolve({ kind: "cancelled" });
  }

  function cancelSpeaking() {
    if (disposed) {
      inner.cancelSpeaking();
      return;
    }
    // 층이 need-sound 로 부른 줄은 화면 cancel 이 끊지 않는다(검토 2-나 I-1). 틀은 누를 때마다 listen 앞에 cancel 을 부르는데, 그 줄을
    // 시작 전에 끊으면 기계가 다시 부르지 않아(이미 asked) 진짜가 소리 없는 안전 상한 뒤에야 열린다. 뒤이은 누름이 기계의 F9 길
    // (시작 전이면 짧은 말을 다시 부름 · 시작 뒤면 cut 소리)을 탄다. 음성 접점이 읽는 중인 것이 그 줄뿐이면 접점 cancel 도 넘기지 않는다.
    const live = [...readings.values()].filter(
      (r) => r.stage === "live" && !r.silent,
    );
    const ownOnly = live.length > 0 && live.every((r) => r.needed);
    let cut = false;
    for (const reading of [...readings.values()]) {
      if (reading.needed) continue;
      if (reading.stage === "held") {
        // 보류 중: 지금 끊김으로 돌려주고, 기계가 흘리면 읽지 않고 걷어 낸다.
        reading.dropped = true;
        reading.resolve({ kind: "cancelled" });
      } else if (reading.stage === "live" && !reading.silent) {
        reading.silent = true;
        cut = true;
      }
    }
    // 층의 줄이 읽는 중이면 걷을 읽기는 그 줄이 끝난 뒤 retireIfIdle 이 걷는다(cut 은 기계의 읽는 중 목록 전부를 끊는다).
    if (ownOnly) return;
    if (cut || retiring.size > 0) {
      retiring.clear();
      send({ type: "cut", started: false });
    }
    inner.cancelSpeaking();
  }

  /** 버림 안 소리(F4 (2) · F9 · F10): 화면이 공급한 한 줄(없으면 대비 줄)을 그 안에서 읽는다. */
  function needSound(need: DiscardSoundNeed) {
    let line: DiscardSoundLine | undefined;
    try {
      line = source?.(need);
    } catch {
      line = undefined;
    }
    const chosen = line ?? options.fallbackLines[need];
    const { reading } = newReading(
      chosen.text,
      chosen.options,
      chosen.sound,
      chosen,
    );
    send({ type: "speak-request", id: reading.id, sound: reading.sound });
  }

  /** 떠남 · 모름: 화면 cancel 이 남겨 둔 층의 줄(I-1)을 끊는다. 다음 화면에서 짧은 말이 이어 들리지 않게 한다. */
  function cutOwnLines() {
    for (const reading of readings.values()) {
      if (reading.needed && reading.stage === "live" && !reading.silent) {
        inner.cancelSpeaking();
        return;
      }
    }
  }

  /**
   * need-sound 에 답한 읽기가 끝나고 남은 읽기가 없으면 소리 끝을 알린다(층이 부른 소리라 틀의 알림을 기다리지 않는다). 틀이 넣은 줄이
   * 남았으면(짧은 말을 끊은 다시 듣기 · 힌트 듣기 · 말풍선 — 보류든 읽는 중이든) 보내지 않고 그 차례의 소리 끝은 틀의 soundEnd 가 알린다
   * (설계 2 '틀은 그 차례의 줄을 모두 넣은 뒤에만 알린다', 검토 2-나 재검토 N-1). 거둔 줄 · 기계에 이미 끊김으로 알린 줄은 세지 않는다.
   */
  function neededDone() {
    for (const reading of readings.values()) {
      if (!reading.dropped && !reading.silent) return;
    }
    send({ type: "sound-end" });
  }

  // ── 듣기 ──

  function handleOf(
    listening: Listening,
    outcome: Promise<ListenOutcome>,
  ): ListenHandle {
    return {
      press() {
        // 진짜 중이면 단추 멈춤(stop). 걸린 동안 다시 온 누름은 하나로 센다.
        listening.inner?.press();
      },
      cancel() {
        if (listening.inner !== undefined) {
          listening.inner.cancel();
          return;
        }
        if (pending !== listening) return;
        pending = undefined;
        send({ type: "dont-know" });
        settle(listening, interrupted("leave"));
      },
      outcome,
      get capAt() {
        return listening.inner?.capAt;
      },
    };
  }

  function settle(listening: Listening, outcome: ListenOutcome) {
    if (listening.settled) return;
    listening.settled = true;
    listening.resolve(outcome);
  }

  function listen(
    rule: EndRule,
    on: ListenCallbacks | undefined,
    auto: boolean,
  ): ListenHandle {
    if (disposed) return inner.listen(rule, on);
    // 첫 누름: 잠금 풀기(무음 읽기)를 press 보다 먼저(I-4). 화면이 이미 불렀으면 음성 접점이 다시 읽지 않는다.
    if (!auto && !unlocked) unlockFromGesture();
    // 앞 손잡이는 새 듣기가 대신한다(음성 접점 listen 이 앞 듣기를 끊는 것과 같은 뜻).
    if (pending !== undefined) {
      const previous = pending;
      pending = undefined;
      settle(previous, interrupted("leave"));
    }
    if (active !== undefined) active.inner?.cancel();
    let resolve: (outcome: ListenOutcome) => void = () => {};
    const outcome = new Promise<ListenOutcome>((r) => {
      resolve = r;
    });
    const listening: Listening = {
      rule,
      on,
      auto,
      resolve,
      inner: undefined,
      why: undefined,
      settled: false,
    };
    pending = listening;
    const handle = handleOf(listening, outcome);
    send({ type: "press", auto });
    return handle;
  }

  function openReal() {
    const listening = pending;
    if (listening === undefined) {
      // 걸린 손잡이 없이 진짜를 열라는 효과 — 연 것으로 치고 곧바로 끊김으로 끝낸다(기계가 진짜에 머물지 않게).
      queue.push({ type: "real-end", kind: "interrupted", why: "leave" });
      return;
    }
    pending = undefined;
    const { started, ...passOn } = listening.on ?? {};
    const handle = inner.listen(listening.rule, passOn);
    listening.inner = handle;
    active = listening;
    started?.();
    void handle.outcome.then((outcome) => realEnded(listening, outcome));
  }

  function realEnded(listening: Listening, outcome: ListenOutcome) {
    if (active === listening) active = undefined;
    // 화면에 결과를 넘기기 전에 기계가 진짜 끝을 안다(재검토 N-1).
    send(realEndOf(outcome, listening.why));
    settle(listening, outcome);
  }

  function dropPress(reason: "hidden" | "leave") {
    const listening = pending;
    if (listening === undefined) return;
    pending = undefined;
    settle(listening, interrupted(reason));
  }

  // ── 접점 ──

  function unlockFromGesture() {
    inner.unlockFromGesture();
    if (unlocked || disposed) return;
    unlocked = true;
    send({ type: "unlock" });
  }

  function checkMicrophone(): Promise<MicrophoneCheck> {
    if (!disposed) {
      if (active !== undefined) active.why = "check";
      send({ type: "check" });
    }
    return inner.checkMicrophone();
  }

  function leave() {
    if (disposed) return;
    send({ type: "leave" });
    cutOwnLines();
    if (active !== undefined) {
      active.why = "leave";
      active.inner?.cancel();
    }
  }

  const visibility = options.visibility ?? documentVisibility();
  const unsubscribeVisibility = visibility?.subscribe(() => {
    if (visibility.hidden()) {
      if (active !== undefined) active.why = "hidden";
      send({ type: "hidden" });
    } else {
      send({ type: "visible" });
    }
  });

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (timer !== undefined) timers.clear(timer);
    timer = undefined;
    queue.length = 0;
    unsubscribeVisibility?.();
    listeners.clear();
    for (const handle of discards.values()) handle.stop();
    discards.clear();
    if (pending !== undefined) {
      const listening = pending;
      pending = undefined;
      settle(listening, interrupted("leave"));
    }
    active?.inner?.cancel();
    for (const reading of readings.values()) {
      if (reading.stage === "held") reading.resolve({ kind: "cancelled" });
    }
    readings.clear();
    retiring.clear();
  }

  const port: SpeechPort = {
    device: () => inner.device(),
    unlockFromGesture,
    speak,
    cancelSpeaking,
    listen: (rule, on) => listen(rule, on, false),
    checkMicrophone,
    dispose() {
      dispose();
      inner.dispose();
    },
  };

  return {
    port,
    listenAuto: (rule, on) => listen(rule, on, true),
    again: () => send({ type: "again" }),
    dontKnow() {
      if (pending !== undefined) {
        const listening = pending;
        pending = undefined;
        settle(listening, interrupted("leave"));
      }
      send({ type: "dont-know" });
      cutOwnLines();
    },
    soundEnd: () => send({ type: "sound-end" }),
    serverWait: (on) => send({ type: "server-wait", on }),
    leave,
    setSoundSource(next) {
      source = next;
    },
    view: () => view,
    subscribe(fn) {
      listeners.add(fn);
      fn(view);
      return () => {
        listeners.delete(fn);
      };
    },
    dispose,
  };
}

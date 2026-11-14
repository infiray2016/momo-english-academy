// 브라우저 Web Speech 구현(plan-p02 '파일별 값' 7). 듣기 판정은 P2a listen.ts 가 하고 여기서는
// 인식 객체 · 타이머 · 읽어 주기를 잇는다. 녹음하지 않는다(getUserMedia · MediaRecorder 를 쓰지 않음).
// window · document · navigator 는 함수 안에서만 읽는다.
// 서버 구성 요소가 가져오면 빌드가 막는다(Next 가 설치 없이 안에서 처리, 16.4.2 문서 05-server-and-client-components).
import "client-only";
import {
  type DeviceFacts,
  type DeviceVerdict,
  describeDevice,
} from "@/core/speech/device";
import {
  type CancelReason,
  classifyRecognitionError,
  deafRuleForDevice,
  type EndRule,
  type ListenInput,
  type ListenOutcome,
  type ListenState,
  type ListenStep,
  recognitionErrorCodeOf,
  type SpeechSettings,
  START_FAILED_CODE,
  startListen,
  stepListen,
} from "@/core/speech/listen";
import { speakHeardOf, speakWatchOf } from "@/core/speech/pace";
import { pickVoice, voiceFor, voiceUseOf } from "@/core/teacher/voice";
import {
  type DiscardCallbacks,
  type DiscardCloseBy,
  type DiscardHandle,
  type ListenCallbacks,
  type ListenHandle,
  type MicrophoneCheck,
  PLAIN_RECOGNITION_EVENTS,
  type RecognitionCtor,
  type RecognitionLike,
  type RecognizerInfo,
  type SpeakOptions,
  type SpeakOutcome,
  type SpeechPort,
  type SpeechTraceEntry,
  type SynthState,
} from "./types";

/** 마이크 확인에서 audiostart · 결과 없이 끝이 온 때의 코드. */
export const MIC_CHECK_ENDED_CODE = "ended-without-audio";
/** 마이크 확인이 시간 안에 아무것도 받지 못한 때의 코드. */
export const MIC_CHECK_TIMEOUT_CODE = "timeout";
/**
 * 마이크 확인을 새 듣기 · 읽어 주기 · 닫기 · 쪽 숨김이 끊은 때의 코드 앞부분. 뒤에 까닭(leave · speak · hidden)이
 * 붙는다. 끊긴 확인을 실패로 셀지는 부르는 쪽(P10) 몫이다(검토 p02b M-2).
 */
export const MIC_CHECK_INTERRUPTED_PREFIX = "interrupted-";
/** 인식 API 가 없을 때의 코드. */
export const NO_API_CODE = "no-api";
/** 읽어 주기 제약을 풀 때 읽는 소리 없는 글. */
const UNLOCK_TEXT = " ";
const UNLOCK_VOLUME = 0;

// 같은 ms 에 일이 겹치면 단위 흉내(tests/unit/listen-end.test.ts)와 같은 차례로 넣는다:
// 인식 이벤트 → 말하기 버튼 → 타이머. 기록 대본 다시 돌려 보기가 갈라지지 않게 한다.
const INPUT_ORDER: Record<ListenInput["type"], number> = {
  begin: 0,
  result: 0,
  error: 0,
  end: 0,
  audio: 0,
  sound: 0,
  "start-failed": 0,
  cancel: 0,
  button: 1,
  timer: 2,
};

type BrowserSpeechOptions = {
  settings: SpeechSettings;
  /** 관찰 페이지(기록 전부)와 회화 틀(듣기 사건 요약 — listen-log, C149)이 넘긴다. */
  onTrace?: (entry: SpeechTraceEntry) => void;
  /** 관찰 페이지만 넘긴다('이벤트 무시' · '같은 객체 되풀이' 흉내). */
  recognitionCtor?: RecognitionCtor;
};

type SpeechWindow = Window & {
  SpeechRecognition?: unknown;
  webkitSpeechRecognition?: unknown;
};

function speechWindow(): SpeechWindow {
  return window as SpeechWindow;
}

function nativeRecognitionCtor(): RecognitionCtor | undefined {
  const w = speechWindow();
  const ctor =
    typeof w.SpeechRecognition === "function"
      ? w.SpeechRecognition
      : w.webkitSpeechRecognition;
  return typeof ctor === "function" ? (ctor as RecognitionCtor) : undefined;
}

/** start 호출 때의 읽어 주기 상태(듣기 사건 기록 ts — 분석 task-ipad-listen-analysis 6.2 H3). 읽기만 한다. */
function synthesisStateOf(): "speaking" | "pending" | "idle" | undefined {
  if (!synthesisAvailable()) return undefined;
  const synth = window.speechSynthesis;
  if (synth.speaking) return "speaking";
  if (synth.pending) return "pending";
  return "idle";
}

function synthesisAvailable(): boolean {
  return (
    typeof window.speechSynthesis === "object" &&
    window.speechSynthesis !== null &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

// 지금 목소리 고르기는 순수 함수 쪽(core/teacher/voice)으로 옮겼다. 관찰 페이지가 여기서 가져오므로 그대로 내보낸다.
export { pickVoice };

/** 인식 객체 결과 목록 전체의 첫 후보를 확정 · 중간 가리지 않고 잇는다. */
function resultsOf(
  list: SpeechRecognitionResultList,
): { transcript: string; isFinal: boolean }[] {
  const out: { transcript: string; isFinal: boolean }[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const result = list[i];
    if (result === undefined) continue;
    out.push({
      transcript: result[0]?.transcript ?? "",
      isFinal: result.isFinal,
    });
  }
  return out;
}

/** 결과 하나에서 읽은 인식기 값(글은 둘째 후보만 — 턴 요청에만 간다, spec 설계 11). */
export type ResultReadout = {
  isFinal: boolean;
  confidence: number | undefined;
  second: string | undefined;
  count: number;
};

/** 결과마다 첫 후보의 확신 정도 · 둘째 후보 글 · 후보 수를 읽는다(후보 수를 넘겨 연 듣기만 부른다). */
function readoutsOf(list: SpeechRecognitionResultList): ResultReadout[] {
  const out: ResultReadout[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const result = list[i];
    if (result === undefined) continue;
    const confidence = result[0]?.confidence;
    out.push({
      isFinal: result.isFinal,
      confidence: typeof confidence === "number" ? confidence : undefined,
      second: result.length > 1 ? result[1]?.transcript : undefined,
      count: result.length,
    });
  }
  return out;
}

/** 확신 정도는 소수 둘째 자리로 남긴다(spec 설계 11 '싣는 곳'). */
const CONFIDENCE_PLACES = 100;

/**
 * 듣기 하나의 인식기 정보(순수 — spec 설계 11 '값의 뜻'). 인식 객체마다 마지막 결과 목록(연속 인식은 목록 전체를 다시 낸다)을 차례로
 * 이어 본다. 확신 정도는 확정 결과들의 confidence 가운데 가장 낮은 값이고, 확정 결과가 없거나 그 가운데 값이 없거나 0 인 것이 있으면
 * 비운다(가장 낮은 값을 모름 — 0 을 '모름'으로 내는 브라우저가 있다). 둘째 후보는 결과 전체가 확정 결과 하나일 때만 쓴다(뒤에 중간
 * 결과가 붙었거나 다른 인식 객체의 결과가 있으면 그 후보는 글의 일부만 담으므로 쓰지 않음 — 검토 rev-chat-v I-1). 확정 결과와 중간
 * 결과가 섞인 글이면 mixed 를 단다(컨트롤러 결정, fix 1). 결과가 하나도 없으면 없음.
 */
export function recognizerInfoOf(
  lists: readonly (readonly ResultReadout[])[],
): RecognizerInfo | undefined {
  const all = lists.flat();
  if (all.length === 0) return undefined;
  const finals = all.filter((r) => r.isFinal);
  const known = finals.every(
    (r) =>
      r.confidence !== undefined &&
      Number.isFinite(r.confidence) &&
      r.confidence > 0,
  );
  const lowest = Math.min(...finals.map((r) => r.confidence ?? 0));
  const counted = finals.length > 0 ? finals : all;
  const second =
    all.length === 1 && finals.length === 1
      ? finals[0]?.second?.trim()
      : undefined;
  const mixed = finals.length > 0 && finals.length < all.length;
  return {
    ...(finals.length > 0 && known
      ? {
          confidence:
            Math.round(Math.min(1, lowest) * CONFIDENCE_PLACES) /
            CONFIDENCE_PLACES,
        }
      : {}),
    ...(second ? { alternative: second } : {}),
    alternatives: Math.max(...counted.map((r) => r.count)),
    interim: finals.length === 0,
    ...(mixed ? { mixed: true } : {}),
  };
}

const joinTranscripts = (results: { transcript: string }[]) =>
  results
    .map((r) => r.transcript)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

/** 듣기 매개의 후보 수(1 이상 정수). 없거나 틀린 값이면 없음(지금처럼 1 · 인식기 정보 없음). */
function alternativesOf(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isInteger(value) || value < 1)
    return undefined;
  return value;
}

function collectedText(state: ListenState): string {
  return [...state.pieces, state.currentText].filter((t) => t !== "").join(" ");
}

/**
 * 이 브라우저의 기기 사실(P2a describeDevice 의 입력). 렌더 뒤 · 누름 처리 안에서만 부른다(window 를 읽는다).
 * 음성 접점(device())과 기기 마이크 상태(src/lib/mic-state.ts)가 같이 쓴다(한 벌, 검토 review-p10-2-code M-3).
 */
export function deviceFacts(): DeviceFacts {
  const w = speechWindow();
  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    hasStandardRecognition: typeof w.SpeechRecognition === "function",
    hasWebkitRecognition: typeof w.webkitSpeechRecognition === "function",
    hasSynthesis: synthesisAvailable(),
    isSecureContext: window.isSecureContext,
  };
}

export function createBrowserSpeech(options: BrowserSpeechOptions): SpeechPort {
  const { settings, onTrace, recognitionCtor } = options;
  const now = () => performance.now();
  const trace = (entry: SpeechTraceEntry) => onTrace?.(entry);
  const ctorOf = () => recognitionCtor ?? nativeRecognitionCtor();

  let listenCount = 0;
  let activeListen: { cancelNow(reason: CancelReason): void } | undefined;
  /** 지금 도는 마이크 확인. 듣기처럼 새 듣기 · 읽어 주기 · 닫기 · 숨김이 끊는다(위험 20 · 나-4). */
  let activeCheck: { cancelNow(reason: CancelReason): void } | undefined;
  let speaking:
    | { utterance: SpeechSynthesisUtterance; settle(o: SpeakOutcome): void }
    | undefined;
  let unlocked = false;
  let disposed = false;
  let discardCount = 0;
  /**
   * 지금 열린 버리는 듣기(iPad 버리는 듣기 plan 묶음 2-가). 진짜 듣기(activeListen)와 따로 두고 읽어 주기가 끊지 않는다(F8).
   * 숨김 · 마이크 확인 · 닫기는 abort, 진짜 듣기 · 새 버림은 stop 으로 닫는다.
   */
  let activeDiscard:
    | { close(call: "stop" | "abort", by: DiscardCloseBy): void }
    | undefined;

  /** alternatives 는 듣기 매개(ListenCallbacks.alternatives — 이야기 방식 차례만), 없으면 지금처럼 1 이다. */
  function prepare(recognition: RecognitionLike, alternatives = 1) {
    recognition.lang = settings.lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = alternatives;
  }

  function finishSpeaking(outcome: SpeakOutcome) {
    const current = speaking;
    speaking = undefined;
    current?.settle(outcome);
  }

  function cancelSpeaking() {
    finishSpeaking({ kind: "cancelled" });
    if (synthesisAvailable()) window.speechSynthesis.cancel();
  }

  function listen(asked: EndRule, on?: ListenCallbacks): ListenHandle {
    // 못 듣는 마이크 감지는 speech.deaf_detect 가 켠 기기에서만(기본 iOS · iPadOS WebKit — 잠정 11-06 fix 1)
    const rule = deafRuleForDevice(asked, settings.deafDetect, device());
    // 안전망(plan 정한 것 10): 열린 버림을 만나면 stop 으로 닫는다(버리는 듣기를 쓰지 않으면 닿지 않는다)
    activeDiscard?.close("stop", "listen");
    activeListen?.cancelNow("leave");
    activeCheck?.cancelNow("leave");
    // 읽어 주는 중이면 끊고 듣는다(토리 목소리를 인식하지 않게, 7절 · C53).
    if (speaking !== undefined) cancelSpeaking();

    listenCount += 1;
    const listenId = listenCount;
    // 후보 수를 넘긴 듣기만 인식기 정보를 읽는다(그 밖은 maxAlternatives 1 · 기록 그대로, spec 설계 11 · NFR-5).
    const alternatives = alternativesOf(on?.alternatives);
    const readouts =
      alternatives === undefined
        ? undefined
        : new Map<number, ResultReadout[]>();
    const recognizers = new Map<number, RecognitionLike>();
    const pending: { input: ListenInput; seq: number }[] = [];
    let seq = 0;
    let drainTimer: number | undefined;
    let wakeTimer: number | undefined;
    let finished = false;
    let resolveOutcome: (outcome: ListenOutcome) => void = () => {};
    const outcome = new Promise<ListenOutcome>((resolve) => {
      resolveOutcome = resolve;
    });

    const beganAt = now();
    trace({ at: beganAt, kind: "listen-begin", listen: listenId, rule });
    let step: ListenStep = startListen(rule, settings, beganAt);

    const push = (input: ListenInput, sync = false) => {
      if (finished) return;
      pending.push({ input, seq: seq++ });
      if (sync) drain();
      else if (drainTimer === undefined) {
        drainTimer = window.setTimeout(drain, 0);
      }
    };

    /** 이 듣기에서 소리 들어옴을 알렸는가(듣기마다 한 번 — 말하기 단추 표시, U4-2). */
    let soundTold = false;
    const attach = (id: number, recognition: RecognitionLike) => {
      const fromThis = (
        event: SpeechTraceEntry & { kind: "recognizer-event" },
      ) => trace(event);
      for (const name of PLAIN_RECOGNITION_EVENTS) {
        recognition[`on${name}`] = () => {
          fromThis({
            at: now(),
            kind: "recognizer-event",
            listen: listenId,
            recognizer: id,
            event: { type: name },
          });
          // 못 듣는 마이크 감지(DeafRule — 규칙에 deaf 가 없으면 상태 기계가 버린다)
          if (name === "audiostart")
            push({ type: "audio", now: now(), recognizer: id });
          if (name === "soundstart" || name === "speechstart")
            push({ type: "sound", now: now(), recognizer: id });
          if (
            (name === "soundstart" || name === "speechstart") &&
            !soundTold &&
            !finished
          ) {
            soundTold = true;
            on?.sound?.();
          }
        };
      }
      recognition.onresult = (event) => {
        const at = now();
        const results = resultsOf(event.results);
        readouts?.set(id, readoutsOf(event.results));
        fromThis({
          at,
          kind: "recognizer-event",
          listen: listenId,
          recognizer: id,
          event: { type: "result", results },
        });
        push({
          type: "result",
          now: at,
          recognizer: id,
          text: joinTranscripts(results),
        });
      };
      recognition.onerror = (event) => {
        const at = now();
        fromThis({
          at,
          kind: "recognizer-event",
          listen: listenId,
          recognizer: id,
          event: { type: "error", error: event.error, message: event.message },
        });
        // iPad Siri · 받아쓰기 꺼짐의 aborted 는 '마이크를 쓸 수 없음'으로(전체 디자인 리뷰 M-10), iPad WebKit 말소리 없음의
        // aborted('No speech detected')는 no-speech 로(C148 — 모은 글이 없으면 말소리 없음 오류)
        push({
          type: "error",
          now: at,
          recognizer: id,
          code: recognitionErrorCodeOf(event.error, event.message),
        });
      };
      recognition.onend = () => {
        const at = now();
        fromThis({
          at,
          kind: "recognizer-event",
          listen: listenId,
          recognizer: id,
          event: { type: "end" },
        });
        push({ type: "end", now: at, recognizer: id });
      };
    };

    const call = (id: number, which: "start" | "stop" | "abort") => {
      const recognition = recognizers.get(id);
      const synth = which === "start" ? synthesisStateOf() : undefined;
      let threw = false;
      try {
        recognition?.[which]();
      } catch {
        threw = true;
      }
      trace({
        at: now(),
        kind: "recognizer-call",
        listen: listenId,
        recognizer: id,
        call: which,
        ...(threw ? { threw } : {}),
        ...(synth ? { synth } : {}),
      });
      return threw;
    };

    const apply = (next: ListenStep) => {
      step = next;
      for (const effect of next.effects) {
        if (effect.type === "done") {
          finished = true;
          const info =
            readouts === undefined
              ? undefined
              : recognizerInfoOf(
                  [...readouts.entries()]
                    .sort(([a], [b]) => a - b)
                    .map(([, list]) => list),
                );
          if (info !== undefined) on?.recognizer?.(info);
          trace({
            at: now(),
            kind: "listen-done",
            listen: listenId,
            outcome: effect.outcome,
            ...(info === undefined
              ? {}
              : {
                  rec: {
                    ...(info.confidence === undefined
                      ? {}
                      : { cf: info.confidence }),
                    na: info.alternatives,
                    int: info.interim,
                    ...(info.mixed === true ? { mx: true } : {}),
                  },
                }),
          });
          resolveOutcome(effect.outcome);
          continue;
        }
        const id = effect.recognizer;
        if (effect.type === "start-recognizer") {
          // 듣기마다 · 다시 시작마다 새 인식 객체(WebKit 321436 우회).
          const Ctor = ctorOf();
          if (Ctor === undefined) {
            push({ type: "start-failed", now: now(), recognizer: id });
            continue;
          }
          const recognition = new Ctor();
          prepare(recognition, alternatives);
          attach(id, recognition);
          recognizers.set(id, recognition);
          if (call(id, "start")) {
            push({ type: "start-failed", now: now(), recognizer: id });
          }
        } else if (effect.type === "stop-recognizer") {
          call(id, "stop");
        } else {
          call(id, "abort");
          recognizers.delete(id);
        }
      }
      if (step.state.phase !== "done" && on?.text !== undefined) {
        on.text(collectedText(step.state));
      }
    };

    const scheduleWake = () => {
      if (wakeTimer !== undefined) window.clearTimeout(wakeTimer);
      wakeTimer = undefined;
      const { wakeAt } = step;
      if (finished || wakeAt === undefined) return;
      wakeTimer = window.setTimeout(
        () => {
          wakeTimer = undefined;
          push({ type: "timer", now: now() });
        },
        Math.max(0, wakeAt - now()),
      );
    };

    function drain() {
      if (drainTimer !== undefined) window.clearTimeout(drainTimer);
      drainTimer = undefined;
      while (pending.length > 0 && !finished) {
        pending.sort(
          (a, b) =>
            a.input.now - b.input.now ||
            INPUT_ORDER[a.input.type] - INPUT_ORDER[b.input.type] ||
            a.seq - b.seq,
        );
        const next = pending.shift();
        if (next === undefined) break;
        apply(stepListen(step.state, next.input));
      }
      if (finished) {
        pending.length = 0;
        if (wakeTimer !== undefined) window.clearTimeout(wakeTimer);
        wakeTimer = undefined;
        recognizers.clear();
        if (activeListen === session) activeListen = undefined;
        return;
      }
      scheduleWake();
    }

    const session = {
      cancelNow(reason: CancelReason) {
        if (finished) return;
        trace({ at: now(), kind: "cancel", listen: listenId, reason });
        push({ type: "cancel", now: now(), reason }, true);
      },
    };
    activeListen = session;
    apply(step);
    drain();

    return {
      press() {
        if (finished) return;
        trace({ at: now(), kind: "button", listen: listenId });
        push({ type: "button", now: now() });
      },
      cancel() {
        session.cancelNow("leave");
      },
      outcome,
      get capAt() {
        const { state } = step;
        return state.rule.capMs === undefined
          ? undefined
          : state.windowStartAt + state.rule.capMs;
      },
    };
  }

  function speak(text: string, options?: SpeakOptions): Promise<SpeakOutcome> {
    // 닫은 뒤(화면이 사라진 뒤) 늦게 온 읽기는 하지 않는다(P13b 차례 5 검토 I-2)
    if (disposed || !synthesisAvailable())
      return Promise.resolve({ kind: "unsupported" });
    // 쓰임별 목소리 · lang · 높이 · 빠르기(가르치고 spec 설계 4, AC-3h). 선생님 한국어 줄을 읽지 않는 때(read_ko 끔 · ko-KR 없음)는
    // 아무것도 끊지 않고 바로 skipped — 글로만 보이고 단추가 바로 밝다(설계 10)
    const synth = window.speechSynthesis;
    const choice = voiceFor({
      use: voiceUseOf(options ?? {}),
      voices: synth.getVoices(),
      teacher: { pitch: options?.pitch, prefer: options?.voicePrefer },
      rate: options?.rate,
      speech: settings,
    });
    if (choice.kind === "skip")
      return Promise.resolve({ kind: "skipped", reason: choice.reason });
    // 듣는 중이면 끊고, 밀린 줄을 비운 뒤 읽는다(end 가 안 온 발화 뒤 speak 는 cancel 전까지 대기, 321436).
    activeListen?.cancelNow("speak");
    activeCheck?.cancelNow("speak");
    finishSpeaking({ kind: "cancelled" });
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = choice.lang;
    // 선생님 영어는 목소리 순서(명단 voice.prefer)의 목소리, 맞는 것이 없거나 순서가 없으면 pickVoice(plan 회화-선생님-캐릭터 값 12)
    const { voice, rate, pitch } = choice;
    if (voice !== undefined) utterance.voice = voice;
    // 빠르기 · 높이는 정해진 때만(없으면 브라우저 기본 — 말하기 · 배치 · 읽기 동작 그대로)
    if (rate !== undefined) utterance.rate = rate;
    if (pitch !== undefined) utterance.pitch = pitch;
    trace({
      at: now(),
      kind: "speak",
      text,
      voice: voice?.name,
      ...(rate === undefined ? {} : { rate }),
      ...(pitch === undefined ? {} : { pitch }),
    });
    // 감시 상한(C166 R1 — U5-1): 시작 알림 · 끝 알림이 상한 안에 오지 않으면 끝난(ended) 것으로 보고 줄을 비운다. WebKit 은 cancel()
    // 바로 뒤 speak() 의 발화가 사건 없이 사라지기도 해(321436 계열 보고) 읽기 줄을 기다리는 아이 차례 · 따라 말하기가 멈추지 않게 한다.
    // 한국어 줄은 한국어 글자 수로 잰다(가르치고 spec 설계 10)
    const watch = speakWatchOf({ text, rate, lang: choice.lang }, settings);
    // await 없이 같은 차례에서 speak 를 부른다(누름 처리 안에서 불릴 수 있다).
    return new Promise<SpeakOutcome>((resolve) => {
      let watchTimer: number | undefined;
      // 이 발화의 시작 알림이 왔나(감시 결과 셋을 가른다 — R-48)
      let started = false;
      const stopWatch = () => {
        if (watchTimer !== undefined) window.clearTimeout(watchTimer);
        watchTimer = undefined;
      };
      const current = {
        utterance,
        settle(outcome: SpeakOutcome) {
          stopWatch();
          resolve(outcome);
        },
      };
      speaking = current;
      const settleIfCurrent = (outcome: SpeakOutcome) => {
        if (speaking === current) {
          speaking = undefined;
          stopWatch();
          resolve(outcome);
        }
      };
      const giveUp = (code: "no-start" | "no-end") => {
        watchTimer = undefined;
        if (speaking !== current) return;
        trace({ at: now(), kind: "speak-event", type: "timeout", code });
        // 감시가 넘긴 발화는 정상 끝과 가른다: 시작이 왔으면 끝 알림 없음, 없으면 들려주지 못함(R-48)
        settleIfCurrent({
          kind: "ended",
          heard: speakHeardOf({ started, endNotified: false }),
        });
        synth.cancel();
      };
      watchTimer = window.setTimeout(() => giveUp("no-start"), watch.startMs);
      utterance.onstart = () => {
        trace({ at: now(), kind: "speak-event", type: "start" });
        // 실제로 시작한 알림(선생님 말하기 상태의 시작). 이미 끊긴 발화의 늦은 알림은 넘기지 않는다.
        if (speaking !== current) return;
        started = true;
        stopWatch();
        watchTimer = window.setTimeout(() => giveUp("no-end"), watch.endMs);
        options?.onStart?.();
      };
      utterance.onend = () => {
        trace({ at: now(), kind: "speak-event", type: "end" });
        settleIfCurrent({
          kind: "ended",
          heard: speakHeardOf({ started, endNotified: true }),
        });
      };
      utterance.onerror = (event) => {
        trace({
          at: now(),
          kind: "speak-event",
          type: "error",
          code: event.error,
        });
        settleIfCurrent(
          event.error === "interrupted" || event.error === "canceled"
            ? { kind: "cancelled" }
            : { kind: "error", code: event.error, started },
        );
      };
      synth.speak(utterance);
    });
  }

  function unlockFromGesture() {
    if (unlocked || !synthesisAvailable()) return;
    // WebKit 은 누름 처리 중의 speak() 가 읽어 주기 제약을 푼다(plan-p02 위험 2).
    const utterance = new SpeechSynthesisUtterance(UNLOCK_TEXT);
    utterance.volume = UNLOCK_VOLUME;
    utterance.lang = settings.lang;
    // 기록에도 남긴다(내보낸 대본의 읽어 주기 차례가 가짜의 발화 차례와 맞게).
    trace({ at: now(), kind: "speak", text: UNLOCK_TEXT, voice: undefined });
    utterance.onstart = () =>
      trace({ at: now(), kind: "speak-event", type: "start" });
    utterance.onend = () =>
      trace({ at: now(), kind: "speak-event", type: "end" });
    utterance.onerror = (event) =>
      trace({
        at: now(),
        kind: "speak-event",
        type: "error",
        code: event.error,
      });
    window.speechSynthesis.speak(utterance);
    unlocked = true;
  }

  function checkMicrophone(): Promise<MicrophoneCheck> {
    activeDiscard?.close("abort", "check");
    activeListen?.cancelNow("leave");
    activeCheck?.cancelNow("leave");
    if (speaking !== undefined) cancelSpeaking();
    const report = (result: MicrophoneCheck) => {
      trace({ at: now(), kind: "mic-check", result });
      return result;
    };
    const Ctor = ctorOf();
    if (Ctor === undefined) {
      return Promise.resolve(
        report({ ok: false, code: NO_API_CODE, group: "mic-unavailable" }),
      );
    }
    // 새 객체를 start 하고 소리 들어옴(soundstart · speechstart)이나 첫 결과면 성공, 오류면 실패, 시간 안에 없으면 실패(나-5).
    // audiostart(소리 받기 시작)만으로는 성공이 아니다 — 원격 PC 의 가상 장치처럼 받기는 시작해도 소리가 안 들어오는 기기가
    // '잘 돼요'로 통과한 뒤 따라 말하기에서 실패했다(요청자 프리뷰 2026-10-18, P10 fix 5).
    return new Promise<MicrophoneCheck>((resolve) => {
      const recognition = new Ctor();
      prepare(recognition);
      let settled = false;
      let timer: number | undefined;
      const finish = (result: MicrophoneCheck) => {
        if (settled) return;
        settled = true;
        if (activeCheck === check) activeCheck = undefined;
        if (timer !== undefined) window.clearTimeout(timer);
        try {
          recognition.abort();
        } catch {
          // 이미 끝난 객체
        }
        resolve(report(result));
      };
      const fail = (code: string) =>
        finish({ ok: false, code, group: classifyRecognitionError(code) });
      const check = {
        cancelNow(reason: CancelReason) {
          // 객체를 abort 하고(finish) 끊김 까닭을 코드로 돌려준다.
          fail(`${MIC_CHECK_INTERRUPTED_PREFIX}${reason}`);
        },
      };
      activeCheck = check;
      recognition.onsoundstart = () => finish({ ok: true });
      recognition.onspeechstart = () => finish({ ok: true });
      recognition.onresult = () => finish({ ok: true });
      recognition.onerror = (event) => fail(event.error);
      recognition.onend = () => fail(MIC_CHECK_ENDED_CODE);
      timer = window.setTimeout(
        () => fail(MIC_CHECK_TIMEOUT_CODE),
        settings.maxListenMs + settings.watchdogExtraMs,
      );
      try {
        recognition.start();
      } catch {
        fail(START_FAILED_CODE);
      }
    });
  }

  /**
   * 버리는 듣기(iPad 버리는 듣기 spec 설계 1 · plan 접점 표): 끝 규칙 · 감시 · deaf 판정 없이 새 인식 객체 하나를 열고(prepare 같음),
   * 사건은 글 없이 알린다 — 결과는 목록 길이만 읽고 글(transcript)은 읽지도 남기지도 않는다(FR-12). 읽어 주기 · 진짜 듣기 상태는
   * 건드리지 않는다. start 가 던지거나 API 가 없으면 오류와 end 를 같은 차례 밖에서 알린다(층이 효과를 실행하는 중에 다시 불리지 않게).
   */
  function openDiscard(on: DiscardCallbacks): DiscardHandle {
    activeDiscard?.close("stop", "open");
    discardCount += 1;
    const discardId = discardCount;
    /** end 를 받았거나(또는 열지 못함) 닫기로 알림을 끊음. */
    let ended = false;
    let silenced = false;
    // 음성 접점을 닫은 뒤에는 어느 버림의 사건도 층에 알리지 않는다 — 손잡이로 stop 해 닫는 중인 버림 · 열기 실패의 늦은
    // error · end 도(2-가 검토 M1: silenced 는 열린 버림을 닫기가 abort 할 때만 켜진다)
    const tell = (fn: () => void) => {
      if (!silenced && !disposed) fn();
    };
    const traceEvent = (event: SpeechTraceEntry & { kind: "discard-event" }) =>
      trace(event);
    const failLater = (code: string) => {
      ended = true;
      window.setTimeout(() => {
        tell(() => on.error?.(code));
        tell(() => on.end?.());
      }, 0);
    };
    const Ctor = ctorOf();
    if (Ctor === undefined) {
      failLater(NO_API_CODE);
      return { stop() {}, abort() {} };
    }
    const recognition = new Ctor();
    prepare(recognition);
    for (const name of PLAIN_RECOGNITION_EVENTS) {
      recognition[`on${name}`] = () => {
        traceEvent({
          at: now(),
          kind: "discard-event",
          discard: discardId,
          event: { type: name },
        });
        if (name === "audiostart") tell(() => on.audio?.());
      };
    }
    recognition.onresult = (event) => {
      const count = event.results.length;
      traceEvent({
        at: now(),
        kind: "discard-event",
        discard: discardId,
        event: { type: "result", count },
      });
      tell(() => on.result?.(count));
    };
    recognition.onerror = (event) => {
      traceEvent({
        at: now(),
        kind: "discard-event",
        discard: discardId,
        event: { type: "error", error: event.error },
      });
      const code = recognitionErrorCodeOf(event.error, event.message);
      tell(() => on.error?.(code));
    };
    recognition.onend = () => {
      traceEvent({
        at: now(),
        kind: "discard-event",
        discard: discardId,
        event: { type: "end" },
      });
      if (ended) return;
      ended = true;
      if (activeDiscard === session) activeDiscard = undefined;
      tell(() => on.end?.());
    };

    const call = (which: "start" | "stop" | "abort", by?: DiscardCloseBy) => {
      const synth = which === "start" ? synthesisStateOf() : undefined;
      let threw = false;
      try {
        recognition[which]();
      } catch {
        threw = true;
      }
      trace({
        at: now(),
        kind: "discard-call",
        discard: discardId,
        call: which,
        ...(threw ? { threw } : {}),
        ...(synth ? { synth } : {}),
        ...(by ? { by } : {}),
      });
      return threw;
    };

    const session = {
      close(which: "stop" | "abort", by?: DiscardCloseBy) {
        if (ended) return;
        if (activeDiscard === session) activeDiscard = undefined;
        // 닫기 뒤의 사건은 기록만 하고 층에 알리지 않는다(층도 함께 닫힘)
        if (by === "dispose") silenced = true;
        call(which, by);
      },
    };
    activeDiscard = session;
    if (call("start")) {
      if (activeDiscard === session) activeDiscard = undefined;
      failLater(START_FAILED_CODE);
    }
    return {
      stop: () => session.close("stop"),
      abort: () => session.close("abort"),
    };
  }

  /** 읽어 주기 상태(speaking · pending)를 읽기만 한다. 읽어 주기가 없으면 둘 다 거짓. */
  function synthState(): SynthState {
    if (!synthesisAvailable()) return { speaking: false, pending: false };
    const synth = window.speechSynthesis;
    return { speaking: synth.speaking, pending: synth.pending };
  }

  function device(): DeviceVerdict {
    return describeDevice(deviceFacts());
  }

  // 쪽이 숨으면 듣기는 '끊김', 읽어 주기는 멈춘다. 숨은 동안 다시 시작하지 않는다(나-4).
  const onVisibility = () => {
    if (!document.hidden) return;
    trace({ at: now(), kind: "page-hidden" });
    activeDiscard?.close("abort", "hidden");
    activeListen?.cancelNow("hidden");
    activeCheck?.cancelNow("hidden");
    if (speaking !== undefined) cancelSpeaking();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return {
    device,
    unlockFromGesture,
    speak,
    cancelSpeaking,
    listen(rule, on) {
      if (disposed) throw new Error("음성 접점을 이미 닫았다");
      return listen(rule, on);
    },
    checkMicrophone,
    openDiscard(on) {
      if (disposed) throw new Error("음성 접점을 이미 닫았다");
      return openDiscard(on);
    },
    synthState,
    dispose() {
      if (disposed) return;
      disposed = true;
      activeDiscard?.close("abort", "dispose");
      activeListen?.cancelNow("leave");
      activeCheck?.cancelNow("leave");
      if (speaking !== undefined) cancelSpeaking();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

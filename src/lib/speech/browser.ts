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
  type EndRule,
  type ListenInput,
  type ListenOutcome,
  type ListenState,
  type ListenStep,
  type SpeechSettings,
  START_FAILED_CODE,
  startListen,
  stepListen,
} from "@/core/speech/listen";
import {
  type ListenHandle,
  type MicrophoneCheck,
  PLAIN_RECOGNITION_EVENTS,
  type RecognitionCtor,
  type RecognitionLike,
  type SpeakOutcome,
  type SpeechPort,
  type SpeechTraceEntry,
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
  "start-failed": 0,
  cancel: 0,
  button: 1,
  timer: 2,
};

type BrowserSpeechOptions = {
  settings: SpeechSettings;
  /** 관찰 페이지만 넘긴다. */
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

function synthesisAvailable(): boolean {
  return (
    typeof window.speechSynthesis === "object" &&
    window.speechSynthesis !== null &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

const normalizeLang = (lang: string) => lang.toLowerCase().replaceAll("_", "-");

/**
 * 영어 음성 고르기(plan-p02 나-3). lang 이 settings.lang 과 같은 것 가운데 기본 → 기기 안 → 첫째,
 * 없으면 그 언어 앞부분('en')으로 시작하는 것, 그것도 없으면 고르지 않는다(lang 만으로 읽는다).
 */
export function pickVoice<
  V extends { lang: string; default: boolean; localService: boolean },
>(voices: readonly V[], lang: string): V | undefined {
  const want = normalizeLang(lang);
  const exact = voices.filter((v) => normalizeLang(v.lang) === want);
  const chosen =
    exact.find((v) => v.default) ??
    exact.find((v) => v.localService) ??
    exact[0];
  if (chosen !== undefined) return chosen;
  const family = want.split("-")[0] ?? want;
  return voices.find((v) => normalizeLang(v.lang).startsWith(family));
}

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

const joinTranscripts = (results: { transcript: string }[]) =>
  results
    .map((r) => r.transcript)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

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

  function prepare(recognition: RecognitionLike) {
    recognition.lang = settings.lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
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

  function listen(
    rule: EndRule,
    on?: { text?(text: string): void },
  ): ListenHandle {
    activeListen?.cancelNow("leave");
    activeCheck?.cancelNow("leave");
    // 읽어 주는 중이면 끊고 듣는다(토리 목소리를 인식하지 않게, 7절 · C53).
    if (speaking !== undefined) cancelSpeaking();

    listenCount += 1;
    const listenId = listenCount;
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

    const attach = (id: number, recognition: RecognitionLike) => {
      const fromThis = (
        event: SpeechTraceEntry & { kind: "recognizer-event" },
      ) => trace(event);
      for (const name of PLAIN_RECOGNITION_EVENTS) {
        recognition[`on${name}`] = () =>
          fromThis({
            at: now(),
            kind: "recognizer-event",
            listen: listenId,
            recognizer: id,
            event: { type: name },
          });
      }
      recognition.onresult = (event) => {
        const at = now();
        const results = resultsOf(event.results);
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
        push({ type: "error", now: at, recognizer: id, code: event.error });
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
      });
      return threw;
    };

    const apply = (next: ListenStep) => {
      step = next;
      for (const effect of next.effects) {
        if (effect.type === "done") {
          finished = true;
          trace({
            at: now(),
            kind: "listen-done",
            listen: listenId,
            outcome: effect.outcome,
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
          prepare(recognition);
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

  function speak(text: string): Promise<SpeakOutcome> {
    if (!synthesisAvailable()) return Promise.resolve({ kind: "unsupported" });
    // 듣는 중이면 끊고, 밀린 줄을 비운 뒤 읽는다(end 가 안 온 발화 뒤 speak 는 cancel 전까지 대기, 321436).
    activeListen?.cancelNow("speak");
    activeCheck?.cancelNow("speak");
    finishSpeaking({ kind: "cancelled" });
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = settings.lang;
    const voice = pickVoice(synth.getVoices(), settings.lang);
    if (voice !== undefined) utterance.voice = voice;
    trace({ at: now(), kind: "speak", text, voice: voice?.name });
    // await 없이 같은 차례에서 speak 를 부른다(누름 처리 안에서 불릴 수 있다).
    return new Promise<SpeakOutcome>((resolve) => {
      const current = {
        utterance,
        settle(outcome: SpeakOutcome) {
          resolve(outcome);
        },
      };
      speaking = current;
      const settleIfCurrent = (outcome: SpeakOutcome) => {
        if (speaking === current) {
          speaking = undefined;
          resolve(outcome);
        }
      };
      utterance.onstart = () =>
        trace({ at: now(), kind: "speak-event", type: "start" });
      utterance.onend = () => {
        trace({ at: now(), kind: "speak-event", type: "end" });
        settleIfCurrent({ kind: "ended" });
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
            : { kind: "error", code: event.error },
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
    // 새 객체를 start 하고 audiostart 나 첫 결과면 성공, 오류면 실패, 시간 안에 없으면 실패(나-5).
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
      recognition.onaudiostart = () => finish({ ok: true });
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

  function device(): DeviceVerdict {
    return describeDevice(deviceFacts());
  }

  // 쪽이 숨으면 듣기는 '끊김', 읽어 주기는 멈춘다. 숨은 동안 다시 시작하지 않는다(나-4).
  const onVisibility = () => {
    if (!document.hidden) return;
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
    dispose() {
      if (disposed) return;
      disposed = true;
      activeListen?.cancelNow("leave");
      activeCheck?.cancelNow("leave");
      if (speaking !== undefined) cancelSpeaking();
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

// 음성 접점(plan-p02 '파일별 값' 6). 앱 화면은 SpeechPort 만 안다. 브라우저 구현은 browser.ts,
// 시험용 가짜는 fake-web-speech.ts(앱 코드는 가져오지 않는다, 의존 규칙 no-fake-speech-in-app).
import type { DeviceVerdict } from "@/core/speech/device";
import type {
  CancelReason,
  EndRule,
  ErrorGroup,
  ListenOutcome,
} from "@/core/speech/listen";

/** 읽어 주기 결과. cancelled 는 앱이나 다른 읽어 주기 · 듣기가 끊은 때다. */
export type SpeakOutcome =
  | { kind: "ended" }
  | { kind: "cancelled" }
  | { kind: "error"; code: string }
  | { kind: "unsupported" };

/** 마이크 확인 결과(plan-p02 나-5). */
export type MicrophoneCheck =
  | { ok: true }
  | { ok: false; code: string; group: ErrorGroup };

export interface ListenHandle {
  /** 말하기 버튼을 다시 누름. 어느 규칙에서나 stop 을 부른다. */
  press(): void;
  /** 앱이 듣기를 그만둠(까닭 leave). */
  cancel(): void;
  outcome: Promise<ListenOutcome>;
  /**
   * 듣기 전체 상한의 시각(performance.now() 기준 ms). 감시 다시 시작이 상한을 새로 잴 수 있어
   * 읽을 때마다 지금 상태에서 계산한다. 상한이 없는 규칙이면 없다.
   */
  readonly capAt: number | undefined;
}

export interface SpeechPort {
  /** 렌더 뒤(useEffect)에서만 부른다. */
  device(): DeviceVerdict;
  /** 누름 처리 안에서 동기로 부른다. iOS 첫 읽어 주기 제약을 푼다. */
  unlockFromGesture(): void;
  speak(text: string): Promise<SpeakOutcome>;
  cancelSpeaking(): void;
  listen(rule: EndRule, on?: { text?(text: string): void }): ListenHandle;
  checkMicrophone(): Promise<MicrophoneCheck>;
  dispose(): void;
}

// ── Web Speech 인식 최소 형 ──
// TypeScript 5.9 lib.dom 에는 SpeechRecognition · 그 이벤트 · 오류 이벤트 형이 없다. 쓰는 만큼만 둔다.
// 결과 목록은 lib.dom 의 SpeechRecognitionResultList 를 쓴다.

export interface RecognitionResultEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

export interface RecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message: string;
}

type Handler<E extends Event = Event> = ((event: E) => void) | null;

export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: Handler;
  onaudiostart: Handler;
  onsoundstart: Handler;
  onspeechstart: Handler;
  onspeechend: Handler;
  onsoundend: Handler;
  onaudioend: Handler;
  onnomatch: Handler;
  onresult: Handler<RecognitionResultEventLike>;
  onerror: Handler<RecognitionErrorEventLike>;
  onend: Handler;
}

export type RecognitionCtor = new () => RecognitionLike;

/** 인식 객체가 내는 이벤트 이름(결과 · 오류 밖). */
export const PLAIN_RECOGNITION_EVENTS = [
  "start",
  "audiostart",
  "soundstart",
  "speechstart",
  "speechend",
  "soundend",
  "audioend",
  "nomatch",
] as const;

// ── 관찰 기록(관찰 페이지만 받는다) ──

export type RecognitionTraceEvent =
  | { type: (typeof PLAIN_RECOGNITION_EVENTS)[number] | "end" }
  | { type: "result"; results: { transcript: string; isFinal: boolean }[] }
  | { type: "error"; error: string; message?: string };

/** at 은 performance.now() 기준 ms. listen 은 듣기 번호, recognizer 는 그 듣기 안의 객체 번호. */
export type SpeechTraceEntry =
  | { at: number; kind: "listen-begin"; listen: number; rule: EndRule }
  | {
      at: number;
      kind: "recognizer-call";
      listen: number;
      recognizer: number;
      call: "start" | "stop" | "abort";
      threw?: boolean;
    }
  | {
      at: number;
      kind: "recognizer-event";
      listen: number;
      recognizer: number;
      event: RecognitionTraceEvent;
    }
  | { at: number; kind: "button"; listen: number }
  | { at: number; kind: "cancel"; listen: number; reason: CancelReason }
  | { at: number; kind: "listen-done"; listen: number; outcome: ListenOutcome }
  | { at: number; kind: "speak"; text: string; voice: string | undefined }
  | {
      at: number;
      kind: "speak-event";
      type: "start" | "end" | "error";
      code?: string;
    }
  | { at: number; kind: "mic-check"; result: MicrophoneCheck };

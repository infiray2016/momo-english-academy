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

/** 읽어 주기 선택 칸(plan-p13b 파일별 값 11). */
export type SpeakOptions = { rate?: number };

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
  /**
   * 읽어 주기. options.rate 는 Web Speech 빠르기(회화 1~2단계 천천히 — speech.slow_rate, C96). 없으면 브라우저 기본 빠르기
   * (말하기 · 배치는 넘기지 않는다 — plan-p13b 위험 5).
   */
  speak(text: string, options?: SpeakOptions): Promise<SpeakOutcome>;
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
  | {
      at: number;
      kind: "speak";
      text: string;
      voice: string | undefined;
      rate?: number;
    }
  | {
      at: number;
      kind: "speak-event";
      type: "start" | "end" | "error";
      code?: string;
    }
  | { at: number; kind: "mic-check"; result: MicrophoneCheck }
  // ── 관찰 페이지 2판(task-speech-probe-2) — 관찰 페이지가 직접 남긴다. 음성 접점(browser.ts)은 내지 않는다 ──
  | { at: number; kind: "env"; reason: ProbeEnvReason; facts: ProbeEnvFacts }
  | {
      at: number;
      kind: "devices";
      phase: ProbeDevicesPhase;
      result:
        | { ok: true; devices: ProbeDevice[] }
        | { ok: false; code: string };
    }
  | { at: number; kind: "mic-level"; result: MicLevelResult }
  | {
      at: number;
      kind: "beep";
      phase: "start";
      contextState: string;
      audioSession: string | undefined;
      /** navigator.userActivation?.isActive(누름 처리 안인가). 없는 브라우저는 undefined. */
      userActive: boolean | undefined;
    }
  | { at: number; kind: "beep"; phase: "end" }
  /** 비프 길이 + 여유 뒤에도 end 가 오지 않아 처리기를 닫음. */
  | { at: number; kind: "beep"; phase: "no-end"; waitedMs: number }
  | { at: number; kind: "beep"; phase: "error"; code: string }
  /** 관찰 페이지가 읽어 주기를 부르기 바로 앞(그 뒤 speak 줄은 음성 접점이 남긴다). turn 은 교대 시험의 몇째 문장(1부터). */
  | {
      at: number;
      kind: "speak-request";
      source: ProbeOutputTest | "alternation";
      turn?: number;
      audioSession: string | undefined;
      userActive: boolean | undefined;
    }
  | {
      at: number;
      kind: "heard";
      test: ProbeOutputTest;
      heard: boolean;
      audioSession: string | undefined;
    }
  | {
      at: number;
      kind: "audio-session";
      action: "set";
      requested: string;
      before: string | undefined;
      after: string | undefined;
      /** 바꾸기가 던진 오류 이름. */
      threw?: string;
      /** 누가 바꿨나: 없으면 선택 상자, auto 는 '자동으로 두기' 스위치, button 은 'playback 으로 두고 읽어 주기' 단추. */
      by?: "auto" | "button";
      /** navigator.userActivation?.isActive(누름 처리 안인가). 없는 브라우저는 undefined. */
      userActive: boolean | undefined;
    }
  | {
      at: number;
      kind: "audio-session";
      action: "state";
      type: string | undefined;
      state: string | undefined;
    };

// ── 관찰 페이지 2판의 사실 꼴(수치 · 이름만, 소리는 없다) ──

/** env 줄을 남긴 때: 쪽이 열림 · 음성 목록이 바뀜 · 보이는 상태가 바뀜. */
export type ProbeEnvReason = "load" | "voices" | "visibility";

/** AudioContext 를 만들고 바로 닫으며 읽은 값. 없는 값은 undefined. */
export type AudioContextFacts =
  | {
      ok: true;
      sampleRate: number;
      state: string;
      outputLatency: number | undefined;
      baseLatency: number | undefined;
    }
  | { ok: false; code: string };

export type ProbeEnvFacts = {
  userAgent: string;
  /** navigator.standalone(iOS 홈 화면 아이콘으로 열면 true). 없는 브라우저는 undefined. */
  standalone: boolean | undefined;
  /** matchMedia('(display-mode: standalone)'). */
  displayModeStandalone: boolean;
  visibility: string;
  /** navigator.audioSession?.type(Safari 17+ Audio Session API). 없으면 undefined. */
  audioSessionType: string | undefined;
  audioSessionState: string | undefined;
  audioContext: AudioContextFacts;
  voices: number;
  englishVoices: number;
};

/** enumerateDevices 를 부른 때. 권한 전(쪽이 열림) · 권한 뒤(마이크 소리 재기 성공) · 다시 보기 단추. */
export type ProbeDevicesPhase =
  | "before-permission"
  | "after-permission"
  | "again";

/**
 * 장치 이름(label)의 갈래. 원문 이름은 어디에도 적지 않는다 — AirPods 기본 이름처럼 사람 이름이 들 수 있다
 * (검토 review-speech-probe-2 I-2). 이름이 비어 있으면(권한 전) '권한 전'.
 */
export type DeviceLabelGroup = "블루투스 · 외부" | "내장" | "권한 전" | "그 밖";

/** 장치 하나: kind 와 이름 갈래만. 원문 label · deviceId · groupId 는 담지 않는다. */
export type ProbeDevice = { kind: string; group: DeviceLabelGroup };

/** 소리 나가기 시험: 비프 · 읽어 주기 · 세션 꼴을 playback 으로 두고 읽어 주기. */
export type ProbeOutputTest = "beep" | "speak" | "speak-playback";

/** '마이크 소리 재기' 한 번의 결과. RMS 수치만 남기고 소리는 남기지 않는다. */
export type MicLevelResult =
  | {
      ok: true;
      /** 실제로 잰 시간(ms). */
      durationMs: number;
      frames: number;
      max: number;
      mean: number;
      /** 소리가 들린 틀(RMS 가 문턱 이상)의 비율 0~1. */
      heardRatio: number;
      /** 모든 틀이 정확히 0(소리 길이 막힘 · 멈춘 처리기). */
      allZero: boolean;
      sampleRate: number;
      /** 재는 동안의 AudioContext 상태. */
      contextState: string;
      track: {
        /** 마이크 이름의 갈래(원문 이름은 담지 않는다). */
        group: DeviceLabelGroup;
        muted: boolean;
        mutedAtEnd: boolean;
        readyState: string;
        settings: Record<string, string | number | boolean>;
      };
      /** 재기 뒤 모든 트랙이 ended 인가. */
      stopped: boolean;
      audioSession: string | undefined;
    }
  | {
      ok: false;
      code: string;
      /** api 없음 · 권한(getUserMedia) · 소리 처리(AudioContext) 가운데 어디서 실패했나. */
      stage: "api" | "permission" | "audio";
      audioSession: string | undefined;
      /** 스트림을 받은 뒤 실패했으면 그때의 처리기 상태 · 마이크를 껐는가. */
      contextState?: string;
      stopped?: boolean;
    };

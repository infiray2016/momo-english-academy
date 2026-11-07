// 음성 접점(plan-p02 '파일별 값' 6). 앱 화면은 SpeechPort 만 안다. 브라우저 구현은 browser.ts,
// 시험용 가짜는 fake-web-speech.ts(앱 코드는 가져오지 않는다, 의존 규칙 no-fake-speech-in-app).
import type { DiscardNote } from "@/core/conversation/client-listen";
import type { DeviceVerdict } from "@/core/speech/device";
import type {
  CancelReason,
  EndRule,
  ErrorGroup,
  ListenOutcome,
} from "@/core/speech/listen";
import type { SpeakHeard } from "@/core/speech/pace";
import type { SpeakSkipReason } from "@/core/teacher/voice";

/**
 * 읽어 주기 결과. cancelled 는 앱이나 다른 읽어 주기 · 듣기가 끊은 때다. ended 의 heard 는 감시 결과(R-48 — 들려줌 · 끝 알림 없음 ·
 * 들려주지 못함, core/speech/pace speakHeardOf · 여러 문장은 speakHeardOfAll)다. 들려주지 못함을 기술 오류로 적는 값이라 기본값
 * 없이 반드시 싣는다.
 */
export type SpeakOutcome =
  | { kind: "ended"; heard: SpeakHeard }
  | { kind: "cancelled" }
  /** started 는 시작 알림(onstart) 뒤에 난 오류인가(R-48 — 시작 전 오류는 들려주지 못함, pace speakHeardOutcomeOf). */
  | { kind: "error"; code: string; started: boolean }
  | { kind: "unsupported" }
  /**
   * 선생님 한국어 줄을 읽지 않음(가르치고 spec 설계 10): speech.read_ko 끔 · 기기에 ko-KR 목소리 없음. 들려주지 못함(R-57)과 달리
   * 글로만 보이고 단추가 바로 밝으며 안내 줄은 없다. 감시 결과(heard)가 없다.
   */
  | { kind: "skipped"; reason: SpeakSkipReason };

/**
 * 읽어 주기 선택 칸(plan-p13b 파일별 값 11 · plan 회화-선생님-캐릭터 값 12 · 가르치고 spec 설계 4).
 * lang 은 읽을 말의 언어(없으면 speech.lang). 한국어 lang 이면 선생님 한국어 줄로 ko-KR 목소리 · speech.rate_ko 로 읽고(rate 는
 * 쓰지 않는다), speech.read_ko 끔이나 ko-KR 목소리가 없으면 읽지 않고 skipped 를 돌린다(core/teacher/voice voiceFor).
 * pitch 는 넘긴 때만 utterance.pitch(회화 선생님 높이), voicePrefer 는 목소리 이름 조각 차례(맞는 것이 없거나 비면
 * pickVoice), onStart 는 발화가 실제로 시작한 알림(onstart) 뒤에 한 번 — 끊긴 발화의 늦은 알림은 넘기지 않는다.
 */
export type SpeakOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  voicePrefer?: readonly string[];
  onStart?: () => void;
};

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

/**
 * 듣기 알림(SpeechPort.listen 의 둘째 인자). started 는 진짜 듣기가 실제로 열린 때 한 번이다 — 버리는 듣기 층(discard-layer)이
 * 기다린 누름 뒤 진짜를 연 때 부른다(iPad 버리는 듣기 plan 접점 표). 브라우저 접점(browser.ts)은 부르지 않는다(끔 · 켜지 않은
 * 기기는 지금 그대로, AC-11).
 */
export type ListenCallbacks = {
  text?(text: string): void;
  sound?(): void;
  started?(): void;
};

/** 읽어 주기 상태(speechSynthesis 의 speaking · pending 을 읽기만 한다). 읽어 주기가 없는 브라우저는 둘 다 거짓이다. */
export type SynthState = { speaking: boolean; pending: boolean };

/**
 * 버리는 듣기의 알림(SpeechPort.openDiscard 의 인자). 글은 받지 않는다 — 결과는 그 사건의 결과 목록 길이(count)만, 오류는 코드만이다
 * (녹음 · 글 보관 없음, iPad 버리는 듣기 spec FR-12). error 의 code 는 진짜 듣기와 같은 정규화(recognitionErrorCodeOf)를 거친다.
 * start 가 던지거나 인식 API 가 없으면 error 와 end 가 뒤이어(같은 차례 밖에서) 온다.
 */
export type DiscardCallbacks = {
  audio?(): void;
  result?(count: number): void;
  end?(): void;
  error?(code: string): void;
};

/** 버리는 듣기 손잡이. stop 은 결과를 내며 닫고(살아 있는 버림도 stop, F3), abort 는 숨김 · 떠남처럼 바로 끊는다. end 뒤에는 아무 일도 하지 않는다. */
export interface DiscardHandle {
  stop(): void;
  abort(): void;
}

export interface SpeechPort {
  /** 렌더 뒤(useEffect)에서만 부른다. */
  device(): DeviceVerdict;
  /** 누름 처리 안에서 동기로 부른다. iOS 첫 읽어 주기 제약을 푼다. */
  unlockFromGesture(): void;
  /**
   * 읽어 주기. options.rate 는 Web Speech 빠르기(단계 구간마다 speech.rate.<구간> — C125, 회화 · 읽기 · 말하기가 넘김). 없으면
   * 브라우저 기본 빠르기(쓰기 · 배치는 넘기지 않는다).
   */
  speak(text: string, options?: SpeakOptions): Promise<SpeakOutcome>;
  cancelSpeaking(): void;
  /**
   * 듣기. on.text 는 모은 글이 바뀔 때, on.sound 는 그 듣기에서 소리가 처음 들어온 때(soundstart · speechstart) 한 번 — 말하기 단추의
   * 소리 들어옴 표시(C166 · UX 검토 U4-2).
   */
  listen(rule: EndRule, on?: ListenCallbacks): ListenHandle;
  checkMicrophone(): Promise<MicrophoneCheck>;
  dispose(): void;
  /**
   * 버리는 듣기(iPad 버리는 듣기 spec 설계 1 · plan 정한 것 2): 끝 규칙 · 감시 · deaf 판정 없이 인식 객체 하나를 열고 사건만 글 없이
   * 알린다. 진짜 듣기(listen)와 따로 돌며 읽어 주기가 끊지 않는다(F8 — 읽기를 그 안에서 흘림). 브라우저 접점만 채우는 선택 칸이고,
   * 버리는 듣기 층이 없으면 부르는 곳이 없다(AC-11). 감싸개(teacher · paced 등)는 넘기지 않는다.
   */
  openDiscard?(on: DiscardCallbacks): DiscardHandle;
  /** 읽어 주기 상태를 읽는다(선택 칸, 브라우저 접점만 채움 — openDiscard 와 같음). */
  synthState?(): SynthState;
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

/** 버리는 듣기 객체의 사건(글 없음 — 결과는 목록 길이만, 오류는 이름만, FR-12). */
export type DiscardTraceEvent =
  | { type: (typeof PLAIN_RECOGNITION_EVENTS)[number] | "end" }
  | { type: "result"; count: number }
  | { type: "error"; error: string };

/**
 * 음성 접점이 스스로 버리는 듣기를 닫은 까닭(discard-call 의 by). 손잡이로 닫으면 없다. listen 은 열린 버림을 만난 진짜 듣기의 안전망
 * (plan 정한 것 10), open 은 새 버림이 앞 버림을 닫음, hidden · check · dispose 는 숨김 · 마이크 확인 · 닫기다.
 */
export type DiscardCloseBy = "listen" | "open" | "hidden" | "check" | "dispose";

// ── 버리는 듣기 요약 칸(client_listen dc — plan 접점 표, iPad 버리는 듣기 spec 설계 5). 글 칸은 없다 ──
// 값 목록 넷은 버림 기계(core/speech/discard), 칸 꼴(DiscardNote — Zod 의 z.infer)은 기록 칸 묶음(core/conversation/client-listen)이 둔다.
// 여기서는 다시 내보내기만 한다(lib → core 방향 하나, 검토 2-가 M3).

export {
  DISCARD_BRANCHES,
  DISCARD_END_WHYS,
  DISCARD_REOPEN_WHYS,
  DISCARD_SOUND_KINDS,
} from "@/core/speech/discard";
export type { DiscardNote };

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
      /** start 호출 때의 읽어 주기 상태(speechSynthesis speaking · pending · idle — 듣기 사건 기록 ts). 읽어 주기가 없으면 없다. */
      synth?: "speaking" | "pending" | "idle";
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
      pitch?: number;
    }
  | {
      at: number;
      kind: "speak-event";
      /** timeout 은 음성 접점의 감시가 끝난 것으로 본 때(code no-start · no-end — C166 R1). */
      type: "start" | "end" | "error" | "timeout";
      code?: string;
    }
  | { at: number; kind: "mic-check"; result: MicrophoneCheck }
  /** 쪽이 숨음(visibilitychange → hidden — 듣기 사건 기록 hid). */
  | { at: number; kind: "page-hidden" }
  // ── 버리는 듣기(iPad 버리는 듣기 plan 접점 표 '사건 기록') — 셋 모두 글 칸이 없다 ──
  /** discard 는 버림 번호(진짜 듣기 번호 listen 과 따로 센다). synth 는 start 호출 때의 읽어 주기 상태. */
  | {
      at: number;
      kind: "discard-call";
      discard: number;
      call: "start" | "stop" | "abort";
      threw?: boolean;
      synth?: "speaking" | "pending" | "idle";
      by?: DiscardCloseBy;
    }
  | {
      at: number;
      kind: "discard-event";
      discard: number;
      event: DiscardTraceEvent;
    }
  /** 버리는 듣기 층이 진짜 listen-begin 바로 앞에 남기는 '그 앞 버림' 칸(듣기 사건 요약이 다음 진짜 요약의 dc 로 붙인다). */
  | { at: number; kind: "discard-note"; dc: DiscardNote }
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
  /** 3판: 마이크를 쓰는 일(듣기 · 마이크 확인 · 소리 재기)을 재생 전용 꼴(playback)에서 시작함 — 경고만, 꼴은 안 바꾼다. */
  | {
      at: number;
      kind: "session-warning";
      action: "listen" | "mic-check" | "mic-level";
      type: string;
    }
  /** 3판: 교대 시험 '읽어 주기 끝난 뒤 자동으로 듣기 시작' — 읽어 주기가 끝나고 waitMs 기다린 뒤 누름 없이 듣기를 시작함. */
  | {
      at: number;
      kind: "auto-listen";
      turn: number;
      /** 그 문장 읽어 주기의 결과(SpeakOutcome.kind). */
      speakOutcome: string;
      waitMs: number;
      userActive: boolean | undefined;
    }
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
      /**
       * 누가 바꿨나: 없으면 선택 상자, auto 는 '자동으로 두기' 스위치, button 은 'playback 으로 두고 읽어 주기' 단추,
       * restore 는 그 단추가 발화 뒤 앞 꼴로 되돌림(3판).
       */
      by?: "auto" | "button" | "restore";
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

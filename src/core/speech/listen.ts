// 한 번 듣기 판정(7절 '듣기를 끝내는 때' · '감시 타이머' · '오류', plan-p02 '파일별 값' 2).
// 브라우저 · 타이머 · 시각을 직접 읽지 않는 상태 기계다. 부르는 쪽(P2b browser.ts · 시험 흉내)이
// 일(begin · result · error · end · button · cancel · timer · start-failed)을 now 와 함께 넣고,
// 돌려받은 일(start · stop · abort · done)을 하고, wakeAt 에 timer 를 넣는다.
import { z } from "zod";
import { BANDS, type Band, bandOf } from "../level-band";
import type { DeviceVerdict } from "./device";

// ── 음성 설정(12절 speech.*) ──

/** 듣기 판정에 쓰는 음성 설정. 초는 ms 로 바꿔 둔다. */
export type SpeechSettings = {
  lang: string;
  maxListenMs: number;
  endSilenceMs: Readonly<Record<Band, number>>;
  watchdogExtraMs: number;
  /** speech.rate.<구간> — 읽어 주기 빠르기(Web Speech rate, C125). */
  rate: Readonly<Record<Band, number>>;
  /** speech.sentence_pause_ms — 읽어 주기 문장 사이 쉼(ms, C125). */
  sentencePauseMs: number;
  /** speech.speak_start_timeout_seconds — 읽어 주기 시작 알림을 기다리는 상한(ms, C166 R1 — U5-1). */
  speakStartTimeoutMs: number;
  /** speech.speak_end_timeout_extra_seconds — 읽어 주기 끝 알림 상한에서 글 길이로 잰 시간에 더하는 여유(ms, C166 R1). */
  speakEndExtraMs: number;
  /** speech.speak_chars_per_second — 끝 알림 상한을 잴 때 빠르기 1 에서 1초에 읽는 글자 수(넉넉히 느리게, C166 R1). */
  speakCharsPerSecond: number;
  /** speech.skip_notice_seconds — 인식이 안 돼 다음으로 넘어갈 때 한 줄 안내를 보이는 시간(ms, C166 — U4-4 · U5-4). */
  skipNoticeMs: number;
  /** speech.speak_chars_per_second_ko — 선생님 한국어 줄의 끝 알림 상한을 잴 때 빠르기 1 에서 1초에 읽는 글자 수(가르치고 spec 설계 10). */
  speakCharsPerSecondKo: number;
  /** speech.rate_ko — 선생님 한국어 줄의 읽어 주기 빠르기(Web Speech rate, 가르치고 spec 설계 4). */
  rateKo: number;
  /** speech.read_ko — 선생님 한국어 줄을 읽는가. 끔이면 읽지 않고 글로만 보인다(가르치고 spec 설계 4 · 10). */
  readKo: boolean;
  /**
   * speech.deaf_audiostart_ms — 인식 객체 start 뒤 audiostart 가 이보다 빨리 오면 '못 듣는 마이크' 의심(ms, iPad WebKit 326069 ·
   * 321436 꼴 — 분석 task-ipad-listen-analysis 표 A, 잠정 11-06).
   */
  deafAudiostartMs: number;
  /** speech.deaf_silence_ms — 그 의심 뒤 소리 · 결과가 이만큼 없으면 '마이크 안 잡힘'으로 끝낸다(ms, 잠정 11-06). */
  deafSilenceMs: number;
  /** speech.deaf_retry_max — '마이크 안 잡힘'에서 같은 듣기 안에서 조용히 새 객체를 여는 수(0 이면 안 함, 관찰 쪽 측정 뒤 올림, 잠정 11-06). */
  deafRetryMax: number;
  /**
   * speech.deaf_detect — 못 듣는 마이크 감지를 켤 기기: ios(iOS · iPadOS WebKit 만) · all(모든 기기) · off(끔). 데스크톱 크롬은 audiostart 가
   * 늘 빠르고 아이가 1.5초 안에 말을 시작하지 않는 일이 흔해 멀쩡한 마이크를 잘못 가르므로 기본은 ios(잠정 11-06 fix 1).
   */
  deafDetect: DeafDetect;
  /**
   * speech.deaf_skip_after — 같은 자리에서 '마이크 안 잡힘'이 이만큼 이어지면 짧은 준비 쪽지 낱말 · 정리 따라 말하기 항목을 기술 사유(mic_deaf)로
   * 건너뛴다(아이의 실패 · 말소리 없음 · 건너뜀 셈에 넣지 않음). 대화 차례는 안내 한 줄만(잠정 11-06 fix 2, 13절 C210 보완).
   */
  deafSkipAfter: number;
};

/** speech.deaf_detect 의 값. */
export const DEAF_DETECT_VALUES = ["ios", "all", "off"] as const;
export type DeafDetect = (typeof DEAF_DETECT_VALUES)[number];

const LANG_KEY = "speech.lang";
const MAX_LISTEN_KEY = "speech.max_listen_seconds";
const WATCHDOG_EXTRA_KEY = "speech.watchdog_extra_seconds";
const endSilenceKey = (band: Band) => `speech.end_silence_seconds.${band}`;
const rateKey = (band: Band) => `speech.rate.${band}`;
const SENTENCE_PAUSE_KEY = "speech.sentence_pause_ms";
const SPEAK_START_TIMEOUT_KEY = "speech.speak_start_timeout_seconds";
const SPEAK_END_EXTRA_KEY = "speech.speak_end_timeout_extra_seconds";
const SPEAK_CPS_KEY = "speech.speak_chars_per_second";
const SKIP_NOTICE_KEY = "speech.skip_notice_seconds";
const SPEAK_CPS_KO_KEY = "speech.speak_chars_per_second_ko";
const RATE_KO_KEY = "speech.rate_ko";
const READ_KO_KEY = "speech.read_ko";
const DEAF_AUDIOSTART_KEY = "speech.deaf_audiostart_ms";
const DEAF_SILENCE_KEY = "speech.deaf_silence_ms";
const DEAF_RETRY_MAX_KEY = "speech.deaf_retry_max";
const DEAF_DETECT_KEY = "speech.deaf_detect";
const DEAF_SKIP_AFTER_KEY = "speech.deaf_skip_after";

/**
 * speechSettingsFrom 이 읽는 12절 키(듣기 · 읽어 주기 빠르기 · 문장 사이 쉼 · 읽어 주기 감시 · 건너뜀 안내 · 선생님 한국어 줄 · 못 듣는
 * 마이크 감지). 회화
 * 듣기 키(talk 갈래)는 회화 설정이 더한다.
 */
export const SPEECH_SETTING_KEYS: readonly string[] = [
  LANG_KEY,
  MAX_LISTEN_KEY,
  ...BANDS.map(endSilenceKey),
  WATCHDOG_EXTRA_KEY,
  ...BANDS.map(rateKey),
  SENTENCE_PAUSE_KEY,
  SPEAK_START_TIMEOUT_KEY,
  SPEAK_END_EXTRA_KEY,
  SPEAK_CPS_KEY,
  SKIP_NOTICE_KEY,
  SPEAK_CPS_KO_KEY,
  RATE_KO_KEY,
  READ_KO_KEY,
  DEAF_AUDIOSTART_KEY,
  DEAF_SILENCE_KEY,
  DEAF_RETRY_MAX_KEY,
  DEAF_DETECT_KEY,
  DEAF_SKIP_AFTER_KEY,
];

const MS_PER_SECOND = 1000;
const positiveSeconds = z.number().positive();
const nonNegativeSeconds = z.number().nonnegative();

function readSetting<T>(
  read: (key: string) => unknown,
  key: string,
  schema: z.ZodType<T>,
): T {
  const parsed = schema.safeParse(read(key));
  if (!parsed.success) {
    const reason = parsed.error.issues[0]?.message ?? "";
    throw new Error(`음성 설정 '${key}' 가 없거나 꼴이 틀렸다: ${reason}`);
  }
  return parsed.data;
}

/**
 * 설정 읽기 함수로 음성 설정을 만든다. 키가 하나라도 없거나 꼴이 틀리면 던진다(조용한 기본값 없음).
 */
export function speechSettingsFrom(
  read: (key: string) => unknown,
): SpeechSettings {
  const lang = readSetting(read, LANG_KEY, z.string().min(1));
  const maxListenMs =
    readSetting(read, MAX_LISTEN_KEY, positiveSeconds) * MS_PER_SECOND;
  const endSilenceMs = Object.fromEntries(
    BANDS.map((band) => [
      band,
      readSetting(read, endSilenceKey(band), positiveSeconds) * MS_PER_SECOND,
    ]),
  ) as Record<Band, number>;
  const watchdogExtraMs =
    readSetting(read, WATCHDOG_EXTRA_KEY, nonNegativeSeconds) * MS_PER_SECOND;
  const rate = Object.fromEntries(
    BANDS.map((band) => [
      band,
      readSetting(read, rateKey(band), z.number().positive()),
    ]),
  ) as Record<Band, number>;
  const sentencePauseMs = readSetting(
    read,
    SENTENCE_PAUSE_KEY,
    z.int().nonnegative(),
  );
  const speakStartTimeoutMs =
    readSetting(read, SPEAK_START_TIMEOUT_KEY, positiveSeconds) * MS_PER_SECOND;
  const speakEndExtraMs =
    readSetting(read, SPEAK_END_EXTRA_KEY, nonNegativeSeconds) * MS_PER_SECOND;
  const speakCharsPerSecond = readSetting(
    read,
    SPEAK_CPS_KEY,
    z.number().positive(),
  );
  const skipNoticeMs =
    readSetting(read, SKIP_NOTICE_KEY, nonNegativeSeconds) * MS_PER_SECOND;
  const speakCharsPerSecondKo = readSetting(
    read,
    SPEAK_CPS_KO_KEY,
    z.number().positive(),
  );
  const rateKo = readSetting(read, RATE_KO_KEY, z.number().positive());
  const readKo = readSetting(read, READ_KO_KEY, z.boolean());
  const deafAudiostartMs = readSetting(
    read,
    DEAF_AUDIOSTART_KEY,
    z.int().nonnegative(),
  );
  const deafSilenceMs = readSetting(read, DEAF_SILENCE_KEY, z.int().positive());
  const deafRetryMax = readSetting(
    read,
    DEAF_RETRY_MAX_KEY,
    z.int().nonnegative(),
  );
  const deafDetect = readSetting(
    read,
    DEAF_DETECT_KEY,
    z.enum(DEAF_DETECT_VALUES),
  );
  const deafSkipAfter = readSetting(
    read,
    DEAF_SKIP_AFTER_KEY,
    z.int().positive(),
  );
  return {
    lang,
    maxListenMs,
    endSilenceMs,
    watchdogExtraMs,
    rate,
    sentencePauseMs,
    speakStartTimeoutMs,
    speakEndExtraMs,
    speakCharsPerSecond,
    skipNoticeMs,
    speakCharsPerSecondKo,
    rateKo,
    readKo,
    deafAudiostartMs,
    deafSilenceMs,
    deafRetryMax,
    deafDetect,
    deafSkipAfter,
  };
}

// ── 듣기 끝 규칙 ──

/**
 * endSilenceMs 가 있으면 한 문장 답(마지막 결과 뒤 조용하면 stop), 없으면 두 문장 이상 답.
 * capMs 는 듣기 전체 상한, chunkMs 는 인식 객체 하나의 길이(넘으면 끊어 듣고 이어 붙인다).
 * 말하기 버튼은 어느 규칙에서나 듣기를 끝낸다(7절). deaf 가 있으면 못 듣는 마이크를 가른다(DeafRule — 회화 듣기만 켠다).
 */
export type EndRule = {
  endSilenceMs?: number;
  capMs?: number;
  chunkMs: number;
  deaf?: DeafRule;
};

/**
 * 못 듣는 마이크 감지(iPad WebKit 326069 · 321436 꼴, 분석 task-ipad-listen-analysis 5절 (c) 의 감지 절반 · 잠정 11-06): 이 듣기에서 아직
 * 소리 · 결과가 없고 모은 글도 없을 때 지금 객체의 audiostart 가 start 뒤 audiostartMs 보다 빨리 오면 의심하고, 그 뒤 silenceMs 안에
 * 소리(soundstart · speechstart) · 결과가 없으면 '마이크 안 잡힘'(deaf)으로 끝낸다. 의심 중에 결과 없음 · 말소리 없음으로 끝나도 deaf 다.
 * retryMax 번까지는 끝내지 않고 조용히 새 객체를 연다(0 이면 안 함).
 */
export type DeafRule = {
  audiostartMs: number;
  silenceMs: number;
  retryMax: number;
};

/**
 * iOS · iPadOS WebKit 인가(순수 — 기기 판정 이름, client_listen 의 br 과 같은 판별 describeDevice). iOS 의 브라우저는 모두 WebKit 이라 기기
 * 이름(iPad · iPhone)으로 가른다. iPadOS 13+ 의 데스크톱 꼴 UA 도 터치 점으로 iPad 가 된다.
 */
export function isIosWebkit(verdict: Pick<DeviceVerdict, "name">): boolean {
  return /^(iPad|iPhone)( |$)/.test(verdict.name);
}

/** 이 기기에서 못 듣는 마이크 감지를 켜는가(순수, speech.deaf_detect). */
export function deafDetectsOn(
  detect: DeafDetect,
  verdict: Pick<DeviceVerdict, "name">,
): boolean {
  if (detect === "all") return true;
  if (detect === "off") return false;
  return isIosWebkit(verdict);
}

/** 기기에 맞춘 듣기 규칙(순수): 감지를 켜지 않는 기기면 deaf 를 뺀다(그 듣기는 지금처럼 말소리 없음 갈래). */
export function deafRuleForDevice(
  rule: EndRule,
  detect: DeafDetect,
  verdict: Pick<DeviceVerdict, "name">,
): EndRule {
  if (rule.deaf === undefined || deafDetectsOn(detect, verdict)) return rule;
  const { deaf: _off, ...rest } = rule;
  return rest;
}

/** 음성 설정의 못 듣는 마이크 감지 규칙(순수). */
export function deafRuleOf(
  settings: Pick<
    SpeechSettings,
    "deafAudiostartMs" | "deafSilenceMs" | "deafRetryMax"
  >,
): DeafRule {
  return {
    audiostartMs: settings.deafAudiostartMs,
    silenceMs: settings.deafSilenceMs,
    retryMax: settings.deafRetryMax,
  };
}

export type AnswerShape = "one-sentence" | "multi-sentence";

export type EndRuleInput = {
  area: "speaking" | "placement";
  /** 그 활동(배치 평가는 그 문항)의 단계. 구간을 고른다(plan-p02 나-7). */
  level: number;
  /** 부르는 쪽이 시드 활동에서 정한다. 이 함수는 3.3 단계표 경계를 박지 않는다. */
  answer: AnswerShape;
  /** 두 문장 이상 답의 활동 시간 상한(speaking.answer_max_seconds.<구간>, C53). 부르는 쪽이 준다. */
  capSeconds?: number;
};

export function endRuleFor(
  input: EndRuleInput,
  settings: SpeechSettings,
): EndRule {
  const band = bandOf(input.level);
  const chunkMs = settings.maxListenMs;
  if (input.answer === "one-sentence") {
    return {
      endSilenceMs: settings.endSilenceMs[band],
      capMs: settings.maxListenMs,
      chunkMs,
    };
  }
  if (input.capSeconds === undefined) return { chunkMs };
  if (!(input.capSeconds > 0)) {
    throw new RangeError(
      `활동 시간 상한은 0 보다 커야 한다: ${input.capSeconds}`,
    );
  }
  return { capMs: input.capSeconds * MS_PER_SECOND, chunkMs };
}

// ── 오류 갈래(7절 · 8절 · C53) ──

export type ErrorGroup = "retry" | "mic-unavailable" | "network";

/** 새 인식 객체의 start() 가 던졌을 때의 코드. */
export const START_FAILED_CODE = "start-failed";

/** iPad 에서 Siri · 받아쓰기가 꺼진 기기의 aborted(앱이 붙이는 코드 — START_FAILED_CODE 와 같은 꼴, 7절 11행 · 전체 디자인 리뷰 M-10). */
export const DICTATION_DISABLED_CODE = "dictation-disabled";
/** 그 aborted 를 가르는 메시지(실측 1 — "Siri and Dictation are disabled"). */
const DICTATION_MESSAGE = /dictation/i;
/** 말소리 없음 오류 코드(Web Speech). */
export const NO_SPEECH_CODE = "no-speech";
/**
 * iPad WebKit(사파리 · 크롬)이 말소리 없는 듣기를 앱이 stop 한 뒤 끝내는 aborted 의 메시지(10-22 실측 — "No speech detected").
 * 스스로 no-speech 를 내지 않으므로 이 aborted 를 no-speech 로 읽는다(C148).
 */
const NO_SPEECH_MESSAGE = /no speech detected/i;

const MIC_UNAVAILABLE_CODES: ReadonlySet<string> = new Set([
  "not-allowed",
  "service-not-allowed",
  "language-not-supported",
  DICTATION_DISABLED_CODE,
]);

/**
 * 인식 오류 사건(error · message)의 코드. aborted 인데 메시지가 받아쓰기를 말하면(iPad Siri · 받아쓰기 꺼짐) DICTATION_DISABLED_CODE —
 * '마이크를 쓸 수 없음' 갈래로 간다. 메시지가 'No speech detected' 면(iPad WebKit 의 말소리 없음, C148) no-speech — 모은 글이 없으면
 * 말소리 없음 오류로 끝나고(여섯 번 셈에 들지 않음, C22), 끊어 듣기(chunk) 중이면 이어 듣는다. 나머지는 코드 그대로(우리 쪽 멈춤의
 * aborted 는 메시지가 없다).
 */
export function recognitionErrorCodeOf(
  error: string,
  message: string | undefined,
): string {
  if (error === "aborted" && message && DICTATION_MESSAGE.test(message))
    return DICTATION_DISABLED_CODE;
  if (error === "aborted" && message && NO_SPEECH_MESSAGE.test(message))
    return NO_SPEECH_CODE;
  return error;
}

/**
 * 인식 오류 코드의 갈래. not-allowed · service-not-allowed · language-not-supported · dictation-disabled 는 '마이크를 쓸 수 없음',
 * network 는 network, 나머지(no-speech · aborted · audio-capture · phrases-not-supported · bad-grammar ·
 * start-failed · 모르는 코드)는 다시 듣기다. 셈(speech.max_retries · 여섯 번 · 세 번)은 부르는 쪽 몫이다.
 */
export function classifyRecognitionError(code: string): ErrorGroup {
  if (MIC_UNAVAILABLE_CODES.has(code)) return "mic-unavailable";
  if (code === "network") return "network";
  return "retry";
}

// ── 한 번 듣기 판정 ──

export type CancelReason = "hidden" | "speak" | "leave";
type StopReason = "cap" | "silence" | "button" | "chunk";
export type EndedBy =
  | "silence"
  | "button"
  | "cap"
  | "browser"
  | "stall-after-stop";

export type ListenOutcome =
  | {
      kind: "result";
      text: string;
      pieces: string[];
      endedBy: EndedBy;
      /** 이어 붙이려고 새 객체를 연 수(브라우저 스스로 끝 · 글 뒤 no-speech · chunk). */
      restarts: number;
      /** 감시 타이머가 새 객체를 연 수(0 또는 1). */
      watchdogRestarts: number;
    }
  | { kind: "no-result" }
  | { kind: "error"; code: string; group: ErrorGroup; partialText: string }
  | { kind: "stalled"; partialText: string }
  | { kind: "interrupted"; reason: CancelReason; partialText: string }
  /**
   * 마이크 안 잡힘(DeafRule): audiostart 가 빨리 오고 소리 · 결과가 없었다. 아이의 말소리 없음이 아니라 기기 쪽이라 셈에 넣지 않는다.
   * audiostartMs 는 끝낸 객체의 start → audiostart, retries 는 조용히 다시 연 수.
   */
  | { kind: "deaf"; audiostartMs: number; retries: number };

export type ListenInput =
  | { type: "begin"; now: number }
  | { type: "result"; now: number; recognizer: number; text: string }
  | { type: "error"; now: number; recognizer: number; code: string }
  | { type: "end"; now: number; recognizer: number }
  /** audiostart(소리 받기 시작 — 신호로 세지 않는다, 못 듣는 마이크 감지만 쓴다). */
  | { type: "audio"; now: number; recognizer: number }
  /** soundstart · speechstart(소리 들어옴 — 신호로 세지 않는다, 못 듣는 마이크 감지만 쓴다). */
  | { type: "sound"; now: number; recognizer: number }
  | { type: "start-failed"; now: number; recognizer: number }
  | { type: "button"; now: number }
  | { type: "cancel"; now: number; reason: CancelReason }
  | { type: "timer"; now: number };

export type ListenEffect =
  | { type: "start-recognizer"; recognizer: number }
  | { type: "stop-recognizer"; recognizer: number }
  | { type: "abort-recognizer"; recognizer: number }
  | { type: "done"; outcome: ListenOutcome };

export type ListenState = Readonly<{
  phase: "idle" | "listening" | "stopping" | "done";
  rule: EndRule;
  /** speech.max_listen_seconds + speech.watchdog_extra_seconds. */
  watchdogMs: number;
  /** capAt 을 재는 처음. begin 때, 감시 타이머가 다시 시작할 때 정한다. */
  windowStartAt: number;
  /** 지금 인식 객체의 번호. 이 번호가 아닌 객체의 일은 버린다. */
  recognizer: number;
  recognizerStartAt: number;
  lastResultAt: number | undefined;
  /** 마지막 신호(객체 시작 · 결과 · 오류 · 끝, plan-p02 나-2). */
  lastSignalAt: number;
  /** 지금 객체가 시작 뒤 결과 · 오류 · 끝을 하나라도 냈는가. */
  recognizerSignalled: boolean;
  currentText: string;
  pieces: readonly string[];
  restarts: number;
  watchdogRestarts: number;
  stopReason: StopReason | undefined;
  /** 이 듣기에서 소리 · 결과가 들어왔는가(못 듣는 마이크 감지). */
  heard: boolean;
  /** 못 듣는 마이크 의심의 기한(지금 객체의 audiostart + silenceMs). 의심이 없으면 없다. */
  deafAt: number | undefined;
  /** 의심한 객체의 start → audiostart(ms). */
  deafAudiostartMs: number | undefined;
  /** 못 듣는 마이크로 조용히 다시 연 수. */
  deafRetries: number;
}>;

export type ListenStep = {
  state: ListenState;
  effects: ListenEffect[];
  /** 가장 이른 기한. 끝났으면 없다. */
  wakeAt: number | undefined;
};

type Deadlines = {
  cap?: number;
  silence?: number;
  chunk?: number;
  watchdog?: number;
  deaf?: number;
};

function deadlinesOf(s: ListenState): Deadlines {
  const { rule } = s;
  const watchdog = s.lastSignalAt + s.watchdogMs;
  const cap =
    rule.capMs === undefined ? undefined : s.windowStartAt + rule.capMs;
  if (s.phase === "listening") {
    const silence =
      rule.endSilenceMs === undefined || s.lastResultAt === undefined
        ? undefined
        : s.lastResultAt + rule.endSilenceMs;
    return {
      cap,
      silence,
      chunk: s.recognizerStartAt + rule.chunkMs,
      watchdog,
      deaf: s.deafAt,
    };
  }
  if (s.phase === "stopping") {
    // chunk 로 멈추는 중에는 듣기가 이어지므로 상한도 본다.
    return s.stopReason === "chunk" ? { cap, watchdog } : { watchdog };
  }
  return {};
}

function wakeAtOf(s: ListenState): number | undefined {
  const times = Object.values(deadlinesOf(s)).filter(
    (t): t is number => t !== undefined,
  );
  return times.length === 0 ? undefined : Math.min(...times);
}

function stepOf(state: ListenState, effects: ListenEffect[] = []): ListenStep {
  return { state, effects, wakeAt: wakeAtOf(state) };
}

const collapse = (text: string) => text.replace(/\s+/g, " ").trim();

function collected(s: ListenState): string[] {
  return s.currentText === "" ? [...s.pieces] : [...s.pieces, s.currentText];
}

const joinedText = (s: ListenState) => collected(s).join(" ");

function finish(
  s: ListenState,
  outcome: ListenOutcome,
  before: ListenEffect[] = [],
): ListenStep {
  return stepOf({ ...s, phase: "done" }, [
    ...before,
    { type: "done", outcome },
  ]);
}

function resultOutcome(s: ListenState, endedBy: EndedBy): ListenOutcome {
  const pieces = collected(s);
  if (pieces.length === 0) return { kind: "no-result" };
  return {
    kind: "result",
    text: pieces.join(" "),
    pieces,
    endedBy,
    restarts: s.restarts,
    watchdogRestarts: s.watchdogRestarts,
  };
}

function errorOutcome(s: ListenState, code: string): ListenOutcome {
  return {
    kind: "error",
    code,
    group: classifyRecognitionError(code),
    partialText: joinedText(s),
  };
}

/**
 * 조각을 모으고 새 객체를 연다. 감시 타이머의 다시 시작은 아직 모은 글이 없을 때만 상한 · 조용함을
 * 새로 잰다(아이가 아직 아무 말도 못 한 때). 모은 글이 있으면 창을 그대로 둔다(활동 시간 상한을
 * 늘리지 않는다, plan-p02 값 2 기한 줄 · 검토 I-1).
 */
function restart(
  s: ListenState,
  now: number,
  kind: "continue" | "watchdog" | "deaf",
  before: ListenEffect[] = [],
): ListenStep {
  const recognizer = s.recognizer + 1;
  const reopenWindow = kind === "watchdog" && joinedText(s) === "";
  const next: ListenState = {
    ...s,
    phase: "listening",
    recognizer,
    recognizerStartAt: now,
    lastSignalAt: now,
    recognizerSignalled: false,
    currentText: "",
    pieces: collected(s),
    stopReason: undefined,
    restarts: kind === "continue" ? s.restarts + 1 : s.restarts,
    watchdogRestarts:
      kind === "watchdog" ? s.watchdogRestarts + 1 : s.watchdogRestarts,
    windowStartAt: reopenWindow ? now : s.windowStartAt,
    lastResultAt: reopenWindow ? undefined : s.lastResultAt,
    deafAt: undefined,
    deafAudiostartMs: undefined,
    deafRetries: kind === "deaf" ? s.deafRetries + 1 : s.deafRetries,
  };
  return stepOf(next, [...before, { type: "start-recognizer", recognizer }]);
}

function stop(s: ListenState, reason: StopReason): ListenStep {
  return stepOf({ ...s, phase: "stopping", stopReason: reason }, [
    { type: "stop-recognizer", recognizer: s.recognizer },
  ]);
}

/** 멈추는 중에 끝(또는 no-speech · aborted)이 왔다. */
function afterStop(s: ListenState, now: number): ListenStep {
  if (s.stopReason === "chunk") return restart(s, now, "continue");
  return finish(s, resultOutcome(s, s.stopReason ?? "button"));
}

function onWatchdog(s: ListenState, now: number): ListenStep {
  const abort: ListenEffect = {
    type: "abort-recognizer",
    recognizer: s.recognizer,
  };
  // stop 뒤 끝이 오지 않음: 모은 글로 끝내고 다시 시작하지 않는다(plan-p02 나-2).
  if (s.phase === "stopping" && s.recognizerSignalled) {
    return finish(s, resultOutcome(s, "stall-after-stop"), [abort]);
  }
  // 버튼 · 조용함 · 상한으로 끝내기로 한 뒤 새 객체가 멈췄고 모은 글이 있다: 그 결정을 지켜
  // 모은 글로 끝낸다(7절 말하기 버튼 행, 나-2 · 위험 5, 검토 I-2).
  if (
    s.phase === "stopping" &&
    s.stopReason !== "chunk" &&
    joinedText(s) !== ""
  ) {
    return finish(s, resultOutcome(s, "stall-after-stop"), [abort]);
  }
  // 객체가 시작 뒤 아무 일도 내지 않았다(7절 감시 타이머): 한 번 다시 시작하고, 또 멈추면 '멈춤'.
  if (s.watchdogRestarts === 0) return restart(s, now, "watchdog", [abort]);
  return finish(s, { kind: "stalled", partialText: joinedText(s) }, [abort]);
}

/** 못 듣는 마이크로 끝냄(DeafRule): 지금 객체를 abort 하고 deaf. */
function finishDeaf(s: ListenState): ListenStep {
  return finish(
    s,
    {
      kind: "deaf",
      audiostartMs: s.deafAudiostartMs ?? 0,
      retries: s.deafRetries,
    },
    [{ type: "abort-recognizer", recognizer: s.recognizer }],
  );
}

/** 의심 기한이 지났다: retryMax 번까지는 옛 객체를 abort 하고 조용히 새 객체, 넘으면 deaf. */
function onDeaf(s: ListenState, now: number): ListenStep {
  const retryMax = s.rule.deaf?.retryMax ?? 0;
  if (s.deafRetries < retryMax)
    return restart(s, now, "deaf", [
      { type: "abort-recognizer", recognizer: s.recognizer },
    ]);
  return finishDeaf(s);
}

/** 의심 중(소리 · 결과 · 글 없음)에 결과 없음 · 말소리 없음으로 끝나면 deaf 로 바꾼다(그 밖은 그대로). */
function deafOr(s: ListenState, step: ListenStep): ListenStep {
  if (s.deafAt === undefined) return step;
  const done = step.effects.find(
    (e): e is Extract<ListenEffect, { type: "done" }> => e.type === "done",
  );
  if (done === undefined) return step;
  const { outcome } = done;
  const silent =
    outcome.kind === "no-result" ||
    (outcome.kind === "error" &&
      outcome.code === NO_SPEECH_CODE &&
      outcome.partialText === "");
  if (!silent) return step;
  return stepOf(step.state, [
    ...step.effects.filter((e) => e.type !== "done"),
    {
      type: "done",
      outcome: {
        kind: "deaf",
        audiostartMs: s.deafAudiostartMs ?? 0,
        retries: s.deafRetries,
      },
    },
  ]);
}

function onTimer(s: ListenState, now: number): ListenStep {
  const due = (t: number | undefined) => t !== undefined && now >= t;
  const d = deadlinesOf(s);
  if (s.phase === "listening") {
    if (due(d.cap)) return stop(s, "cap");
    if (due(d.silence)) return stop(s, "silence");
    if (due(d.deaf)) return onDeaf(s, now);
    if (due(d.chunk)) return stop(s, "chunk");
    if (due(d.watchdog)) return onWatchdog(s, now);
    return stepOf(s);
  }
  if (due(d.cap)) return stepOf({ ...s, stopReason: "cap" });
  if (due(d.watchdog)) return onWatchdog(s, now);
  return stepOf(s);
}

function onRecognizerInput(
  s: ListenState,
  input: Extract<ListenInput, { recognizer: number }>,
): ListenStep {
  const { now } = input;
  if (input.type === "start-failed") {
    return finish(s, errorOutcome(s, START_FAILED_CODE));
  }
  if (input.type === "audio") {
    const deaf = s.rule.deaf;
    const audiostartMs = now - s.recognizerStartAt;
    if (
      deaf === undefined ||
      s.heard ||
      s.deafAt !== undefined ||
      joinedText(s) !== "" ||
      audiostartMs >= deaf.audiostartMs
    )
      return stepOf(s);
    return stepOf({
      ...s,
      deafAt: now + deaf.silenceMs,
      deafAudiostartMs: Math.max(0, Math.round(audiostartMs)),
    });
  }
  if (input.type === "sound") {
    return stepOf({
      ...s,
      heard: true,
      deafAt: undefined,
      deafAudiostartMs: undefined,
    });
  }
  const signalled: ListenState = {
    ...s,
    lastSignalAt: now,
    recognizerSignalled: true,
  };
  if (input.type === "result") {
    return stepOf({
      ...signalled,
      currentText: collapse(input.text),
      lastResultAt: now,
      heard: true,
      deafAt: undefined,
      deafAudiostartMs: undefined,
    });
  }
  if (input.type === "end") {
    if (s.phase === "stopping") return afterStop(signalled, now);
    // 브라우저가 스스로 끝냈다. 글이 있으면 이어 붙이고, 없으면 '결과 없음'(plan-p02 나-6).
    return joinedText(s) === ""
      ? finish(signalled, { kind: "no-result" })
      : restart(signalled, now, "continue");
  }
  // 오류
  const { code } = input;
  if (s.phase === "stopping") {
    // 끝내려고 stop 한 뒤 말소리 없음이 오고 모은 글이 없으면 말소리 없음 오류(iPad WebKit 'No speech detected', C148).
    // 끊어 듣기(chunk) 중이면 그대로 이어 듣고, 우리 쪽 멈춤의 aborted 는 모은 글로 끝낸다(없으면 결과 없음).
    if (
      code === NO_SPEECH_CODE &&
      s.stopReason !== "chunk" &&
      joinedText(s) === ""
    )
      return finish(signalled, errorOutcome(s, code));
    return code === NO_SPEECH_CODE || code === "aborted"
      ? afterStop(signalled, now)
      : finish(signalled, errorOutcome(s, code));
  }
  if (code === NO_SPEECH_CODE && joinedText(s) !== "") {
    // 두 문장 이상 답은 옛 객체를 abort 한 뒤 새 객체(감시 다시 시작 길과 같게, 검토 M-2 · 위험 20).
    // 옛 객체의 뒤늦은 일은 번호로 버린다.
    return s.rule.endSilenceMs !== undefined
      ? finish(signalled, resultOutcome(s, "browser"))
      : restart(signalled, now, "continue", [
          { type: "abort-recognizer", recognizer: s.recognizer },
        ]);
  }
  return finish(signalled, errorOutcome(s, code));
}

/** 듣기 하나의 판정 한 걸음. 끝난 뒤 · 앱이 끊은 객체 · 옛 번호의 일은 버린다. */
export function stepListen(state: ListenState, input: ListenInput): ListenStep {
  if (state.phase === "done") return stepOf(state);
  if (state.phase === "idle") {
    if (input.type !== "begin") return stepOf(state);
    const recognizer = 1;
    return stepOf(
      {
        ...state,
        phase: "listening",
        windowStartAt: input.now,
        recognizer,
        recognizerStartAt: input.now,
        lastSignalAt: input.now,
      },
      [{ type: "start-recognizer", recognizer }],
    );
  }
  switch (input.type) {
    case "begin":
      return stepOf(state);
    case "cancel":
      return finish(
        state,
        {
          kind: "interrupted",
          reason: input.reason,
          partialText: joinedText(state),
        },
        [{ type: "abort-recognizer", recognizer: state.recognizer }],
      );
    case "button":
      if (state.phase === "listening") return stop(state, "button");
      return state.stopReason === "chunk"
        ? stepOf({ ...state, stopReason: "button" })
        : stepOf(state);
    case "timer":
      return onTimer(state, input.now);
    default:
      if (input.recognizer !== state.recognizer) return stepOf(state);
      return deafOr(state, onRecognizerInput(state, input));
  }
}

/** 듣기를 시작한다(begin). 첫 인식 객체를 여는 일을 돌려준다. */
export function startListen(
  rule: EndRule,
  settings: SpeechSettings,
  now: number,
): ListenStep {
  if (!(rule.chunkMs > 0)) {
    throw new RangeError(`인식 객체 길이는 0 보다 커야 한다: ${rule.chunkMs}`);
  }
  const idle: ListenState = {
    phase: "idle",
    rule,
    watchdogMs: settings.maxListenMs + settings.watchdogExtraMs,
    windowStartAt: now,
    recognizer: 0,
    recognizerStartAt: now,
    lastResultAt: undefined,
    lastSignalAt: now,
    recognizerSignalled: false,
    currentText: "",
    pieces: [],
    restarts: 0,
    watchdogRestarts: 0,
    stopReason: undefined,
    heard: false,
    deafAt: undefined,
    deafAudiostartMs: undefined,
    deafRetries: 0,
  };
  return stepListen(idle, { type: "begin", now });
}

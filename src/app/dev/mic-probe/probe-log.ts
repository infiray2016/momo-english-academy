// 마이크 점검 쪽(/dev/mic-probe)의 기록 꼴 · 요약 · 복사 글(브리프 task-mic-probe 2026-11-06, iPad Safari 27 듣기 실패 회복 전략 실측).
// fix 1: F · G(검토 I-3), 중간 글 줄이기(M-4 · M-5). fix 2: H · I · K · L · M, 기기 · 권한 · 탭 표지 · 초기화 단계, 앞 세션 칸(분석
// task-mic-probe-analysis-report 5.1 P1~P6 · 조사 '추가 조사' 절). fix 3: 쉼 45 · 90초 값, S 한 세션 계속 듣기 · S2 세션 중 읽기 · T abort 로
// 끝낸 뒤(분석 10.8 Q1 · Q3 · Q4 · Q5 — 분석의 K · K2 가 여기의 S · S2). fix 4: 자동 측정 순서(autoPlanOf)와 서버 로그 몸(recordLogOf ·
// summaryLogOf · redactLogBody — 들은 글은 길이만), I 의 앱 꼴 읽기(빠르기 0.8 · 문장마다 · 사이 700ms, 검토 M-a). fix 5(분석 10.16): 'speak-call'
// 사건(speak() 직전의 speaking · pending — iOS 가 누름 밖 첫 speak() 를 사건 없이 버리는지 가름), 세션 중 읽기 앞 · 뒤 결과 칸.
// fix 6(분석 10.17): 전략 W3 · W10 · W25 '버림 → 진짜'(버림 세션 n초 뒤 진짜 세션), '읽기 제약 풀기' 결과 칸, WebAudio 소리 사건.
// fix 7(분석 10.18.3): '자동 W 라운드'(WR) 차례 0~8 계획(roundPlanOf) · 살아 있는 버림의 길(roundNextOf · roundPathOf) · 차례 칸(round) ·
// '진짜 살아남 n/m'(roundSurvivalOf) · 라운드 끝 로그(roundLogOf). 관찰 도구라 아이 화면 원칙 밖이다(선생님 관찰 쪽과 같음).
// fix 8(분석 10.19.5 Z-1~Z-7): '자동 W 라운드 2'(WR2) 차례 0~13 계획(round2PlanOf) · 버림 안 소리(짧은 말 · 보통 말 · 긴 문장 · 띵) ·
// 결과의 낱말 표지(apple · banana · 메아리) · 차례 칸(round2RowOf) · 갈래별 '진짜 살아남' 줄(round2LinesOf) · 라운드 끝 로그(round2LogOf).
// A 라운드(브리프 task-probe 2026-11-10 — 받아 온 소리): '자동 A 라운드'(AR) 계획(aPlanOf) · 소리 내는 길 셋(Web Audio · 오디오 요소 · 지금
// 읽기) · 형식 측정 표(aFormatRowsOf) · 차례 칸(aRowOf) · 길 · 꼴별 '진짜 살아남'(aLinesOf) · 요약 줄(aLineOf) · 라운드 끝 로그(aLogOf).
// DB · React 없는 순수 모듈이고 단위 시험 tests/unit/mic-probe.test.ts 가 덮는다. 시각(at)은 그 쪽을 연 동안의 performance.now() 이고,
// 표의 ms 는 모두 그 시도의 start 호출 기준이다. 기록은 기기 안(localStorage)에만 두고 복사할 때만 기기 밖(클립보드)으로 나간다.
// 소리는 저장하지 않는다(7절 — getUserMedia · MediaRecorder 를 쓰지 않음. K 의 WebAudio 는 재생만).
import { z } from "zod";

/** L 이 두는 audioSession.type 넷('play-and-record' 는 실패 확인됨, 조사 '추가 조사' 321436 댓글 3). 끝나면 'auto' 로 되돌린다. */
export const SESSION_TYPES = [
  "transient",
  "transient-solo",
  "ambient",
  "playback",
] as const;
export type SessionType = (typeof SESSION_TYPES)[number];
export const SESSION_TYPE_RESTORE = "auto";

/**
 * 전략(브리프 A~E, fix 1 F · G, fix 2 H · I · K · L 넷 · M). 단추 한 번 = 듣기 한 번 = 표 한 줄.
 * F · G · H · I 는 '지금 눌러 말하기'를 한 번 더 눌러야 듣는다. M 은 처음 탭에서는 새 탭만 열고, 새 탭에서 A 꼴로 듣는다.
 */
export const STRATEGIES = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "K",
  "L-transient",
  "L-transient-solo",
  "L-ambient",
  "L-playback",
  "M",
  "S",
  "S2",
  "T",
  "T-next",
  "W3",
  "W10",
  "W25",
  "WR",
  "WR2",
  "AR",
] as const;
export type Strategy = (typeof STRATEGIES)[number];

/** 단추로 보이는 전략(T-next 는 T 뒤 '지금 눌러 말하기'로만, WR · WR2 · AR 는 '자동 W 라운드' · '자동 W 라운드 2' · '자동 A 라운드' 단추로만 연다). */
export const BUTTON_STRATEGIES: readonly Strategy[] = STRATEGIES.filter(
  (s) => s !== "T-next" && s !== "WR" && s !== "WR2" && s !== "AR",
);

/** A 라운드의 소리 내는 길 셋(도는 순서 그대로 — 지금 읽기 speechSynthesis 는 맨 뒤, 브리프 task-probe 할 일 2). */
export const A_VIAS = ["webaudio", "element", "synth"] as const;
export type AVia = (typeof A_VIAS)[number];
/**
 * A 라운드 차례의 꼴: first 쉰 뒤(또는 문서의) 첫 차례 — 세션 없이 소리 → 진짜 · inside 버림 안에서 소리 → 진짜 · bare 세션 없이 소리 → 진짜 ·
 * inside-sleep · bare-sleep 은 소리가 끝난 뒤 소리 출력을 재우고(AudioContext.suspend) 진짜를 여는 꼴(Web Audio 길만).
 */
export const A_SHAPES = [
  "first",
  "inside",
  "bare",
  "inside-sleep",
  "bare-sleep",
] as const;
export type AShape = (typeof A_SHAPES)[number];
/** A 라운드가 재는 소리 형식 셋(WAV 16비트 PCM · MP3 · Ogg Opus). 차례의 소리는 이 순서로 처음 재생이 된 형식을 쓴다. */
export const A_FORMATS = ["wav", "mp3", "ogg"] as const;
export type AFormat = (typeof A_FORMATS)[number];
/** 한 세션을 멈추지 않고 듣는 전략(S · S2) — 자동 멈춤 없이 SESSION_MAX_MS 상한 · '멈추기'로만 끝난다. */
export const CONTINUOUS_SESSION: readonly Strategy[] = ["S", "S2"];

/** W: 버림 세션 길이(ms). W 가 아니면 undefined(분석 10.17 — 죽은 세션을 10초 넘게 열면 다음 세션이 살아남 3/3). */
export const DECOY_MS: Partial<Record<Strategy, number>> = {
  W3: 3_000,
  W10: 10_000,
  W25: 25_000,
};
export const DECOY_STRATEGIES = Object.keys(DECOY_MS) as Strategy[];
/** W: 버림 세션의 시작 알림이 이보다 늦으면 살아 있는 세션으로 본다(살아 있는 띠 278ms 이상 · 못 듣는 띠 200ms 안 사이). abort 하고 곧바로 진짜를 연다. */
export const DECOY_ALIVE_MS = 250;
/** W: 버림 세션을 stop 한 뒤(end 뒤) 진짜 세션을 열기까지. */
export const DECOY_GAP_MS = 1_000;
/** W 읽기 켬: 버림 세션 start 뒤 이 때 짧은 문장을 읽는다. */
export const DECOY_SPEAK_AT_MS = 2_000;
/** WebAudio 소리 단추(V-4): 발진기 높이 · 음량 · 길이(살아 있는 세션 중 WebAudio 재생이 되는지 — 들리는 크기). */
export const BEEP_HZ = 440;
export const BEEP_GAIN = 0.2;
export const BEEP_MS = 1_000;

/** L 전략이 두는 audioSession.type. L 이 아니면 undefined. */
export function sessionTypeOf(strategy: Strategy): SessionType | undefined {
  return SESSION_TYPES.find((t) => strategy === `L-${t}`);
}

/** 앱 읽기 대기열처럼 글을 문장으로 나눈다(마침표 · 물음표 · 느낌표 뒤 빈칸에서). 빈 문장은 뺀다. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((t) => t.trim())
    .filter((t) => t !== "");
}

/** 기록마다 붙는 '지금 한 일'(요청자가 고름, 분석 P3). */
export const RESET_STEPS = [
  "as-is",
  "reload",
  "new-tab",
  "safari-quit",
  "reboot",
  "dictation",
  "pause-45",
  "pause-90",
] as const;
export type ResetStep = (typeof RESET_STEPS)[number];

// 관찰 도구의 시험 값(브리프 · 조사 5절 순위 1). 앱 설정(settings)이 아니라 이 쪽의 측정 조건이다.
/** B: 시작 알림(audiostart)이 이보다 빨리 오면 못 듣는 징후로 본다(조사 1절 — 실패 31~158ms, 성공 278ms 이상). */
export const FAST_AUDIOSTART_MS = 200;
/** B: start 호출 뒤 이 때까지 소리 · 말 · 결과가 없으면 다시 시작한다. */
export const FAST_CHECK_MS = 1_500;
/** B: 다시 시작 최대 횟수. */
export const MAX_FAST_RESTARTS = 3;
/** B: abort 뒤 end 를 기다리는 상한(조사 5절 'end(상한 300ms)'). 넘으면 end 없이 새 객체를 연다. */
export const RESTART_END_WAIT_MS = 300;
/** 마지막 결과 뒤 이만큼 조용하면 stop(한 낱말 말하기라 짧게). */
export const END_SILENCE_MS = 2_000;
/** start 호출 뒤 결과가 하나도 없이 이만큼 지나면 stop. */
export const NO_RESULT_STOP_MS = 6_000;
/** 듣기 한 번의 상한. */
export const MAX_LISTEN_MS = 10_000;
/** S · S2: 한 세션의 상한(브리프 fix 3 — 10초 간격으로 세 번 말하기). */
export const SESSION_MAX_MS = 60_000;
/** stop 뒤 end 를 기다리는 상한. 넘으면 abort 하고 'end 없음'으로 끝낸다. */
export const END_WAIT_MS = 3_000;
/** 읽어 주기 끝 알림을 기다리는 상한(I 의 선생님 인사 세 문장 · 사이 쉼까지 덮는다). 넘으면 끝 알림 없이 다음으로 간다. */
export const SPEAK_END_WAIT_MS = 15_000;
/** I: 선생님 말 빠르기 — 앱 1~3단계 선생님 말(seed/settings.json speech.rate.1-3, 검토 M-a). 점검 쪽은 설정을 못 읽어 같은 값을 둔다. */
export const I_RATE = 0.8;
/** I: 문장 사이 쉼 — 앱 읽기 대기열(seed/settings.json speech.sentence_pause_ms, tori.tsx, 검토 M-a). */
export const I_SENTENCE_PAUSE_MS = 700;
/** I: 선생님 말 끝 뒤 '지금 눌러 말하기'를 켜기까지 쉼(앱 성공 턴의 tc 1541ms 꼴, 브리프 fix 2). */
export const I_PAUSE_MS = 1_500;
/** H · I 의 무음 읽기(앱 unlockFromGesture 와 같은 글 한 칸 · 음량 0 — src/lib/speech/browser.ts UNLOCK_TEXT · UNLOCK_VOLUME). */
export const UNLOCK_TEXT = " ";
export const UNLOCK_VOLUME = 0;
/** D · F 가 읽어 주는 짧은 영어 한 문장. */
export const SPEAK_SENTENCE = "Please say one word.";
/** 자동 W 라운드의 버림 안 · 진짜 세션 중 읽기 문장. 따라 말하게 유도하지 않는 서술문(fix 7 우려 — "Please say one word." 는 요청자가 따라 말할 수 있음). */
export const W_ROUND_SENTENCE = "The sea is blue and the sun is warm today.";
/** G 가 읽어 주는 긴 영어 문장(읽는 동안 누를 틈을 준다 — 보통 빠르기로 8초 안팎). */
export const LONG_SENTENCE =
  "Today we are going to talk about fruit. I like apples and bananas very much. What fruit do you like? Tell me one word when you are ready.";
/** 시도 하나에 남기는 중간 결과 사건 수 상한(검토 M-4 — 기기 안 저장소 크기). 넘는 중간 결과는 세기만 한다. final 은 늘 남긴다. */
export const MAX_INTERIM_EVENTS = 20;
/** 기기 안에 남기는 기록 수 상한. 넘으면 오래된 것부터 버린다. */
export const MAX_RECORDS = 300;
/** 전략별 인식 언어(E 만 한국어). */
export const LANG_OF: Record<Strategy, string> = Object.fromEntries(
  STRATEGIES.map((s) => [s, s === "E" ? "ko-KR" : "en-US"]),
) as Record<Strategy, string>;
/** 읽어 준 뒤 듣는 전략(D 누름 밖 자동 시작 · F 읽기 끝 뒤 누름 · G 읽는 중 누름 · H 무음 읽기 뒤 누름 · I 앱 첫 차례 재현). */
export const SPEAK_FIRST: readonly Strategy[] = ["D", "F", "G", "H", "I"];

export const EVENT_TYPES = [
  "start-call",
  "start-threw",
  "no-recognition",
  "audiostart",
  "soundstart",
  "speechstart",
  "speechend",
  "soundend",
  "audioend",
  "result",
  "error",
  "end",
  "stop-call",
  "abort-call",
  "end-missing",
  "speak-start",
  "speak-end",
  "speak-error",
  "speak-end-missing",
  "speak-cancel",
  "speak-call",
  "press",
  "hidden",
  "visible",
  "webaudio-start",
  "webaudio-beep",
  "webaudio-sleep",
  "decoy-alive",
  "session-type",
  "session-restore",
  "prompt",
  "speak-state",
] as const;
export type ProbeEventType = (typeof EVENT_TYPES)[number];

/** 듣기가 끝난 까닭. 다음 기록의 '앞 멈춤'이 된다(no-result 상한 · user · natural · end-missing 은 abort 로 끝냄). */
export const STOP_REASONS = [
  "silence",
  "no-result",
  "cap",
  "user",
  "natural",
  "end-missing",
  "start-failed",
  "no-recognition",
  "final",
] as const;
export type StopReason = (typeof STOP_REASONS)[number];
/** 앱이 듣기를 끝낸 방법(T 만 abort, 분석 Q5). 브라우저가 스스로 끝냈으면 null. */
export const STOP_METHODS = ["stop", "abort"] as const;
export type StopMethod = (typeof STOP_METHODS)[number];

const eventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  at: z.number(),
  attempt: z.number().int().nonnegative(),
  /** result: 이 알림에 새 final 결과가 있는가. */
  final: z.boolean().optional(),
  /** result: 그 시도에서 지금까지 들은 글 전체(final + 중간)의 길이. 중간 글 원문은 사건에 남기지 않는다(검토 M-4 · M-5). */
  length: z.number().int().nonnegative().optional(),
  /** result(final 만): final 결과만 이은 글. */
  finalText: z.string().optional(),
  /**
   * result(WR2): 그때까지 들은 글에 'apple' 이 들었는가(중간 · final 어디든), final 글에 'banana' 가 들었는가, 그 차례에 읽은 문장의
   * 낱말(메아리)이 들었는가(분석 10.19.5 Z-6). 참일 때만 둔다.
   */
  apple: z.boolean().optional(),
  banana: z.boolean().optional(),
  echo: z.boolean().optional(),
  /** 읽기 사건: 무음 읽기(unlock)인지 읽어 주기 글(line)인지, WR 의 세션 없이 읽기(bare — 살아 있는 버림 뒤 길 (가))인지. */
  utterance: z.enum(["unlock", "line", "bare"]).optional(),
  /** speak-call: speak() 를 부르기 직전의 speechSynthesis.speaking · pending(fix 5 — 시작 알림 없이 버려졌는지 가른다). */
  speaking: z.boolean().optional(),
  pending: z.boolean().optional(),
  /**
   * error · start-threw · speak-error: 오류 이름 · 글, stop-call · abort-call: 까닭, speak-cancel: 그때 읽는 중이었는가(speaking · ended),
   * speak-start: 목소리 이름(message), webaudio-start: AudioContext 상태, session-type · session-restore: 둔 값(code) · 읽은 값(message),
   * prompt(WR): 화면에 크게 보인 낱말(apple · banana). speak-state(WR2): 그때 speaking · pending 을 잰 자리(after-cancel 취소 0.3초 뒤 ·
   * stop 버림 stop 때 · gap 버림 end 뒤 거짓 확인 · real 진짜 start 때), message 는 gap 에서 기다린 ms.
   */
  code: z.string().optional(),
  message: z.string().optional(),
});
export type ProbeEvent = z.infer<typeof eventSchema>;

const attemptSchema = z.object({
  startCallAt: z.number(),
  /** 이 쪽을 연 뒤 몇 번째 인식 객체인가(조사 5절 측정 칸 '이 탭에서 몇 번째 인식'). */
  nth: z.number().int().positive(),
  /** 그 시도에서 마지막으로 들은 글 전체(중간 포함, 덮어씀). final 이 없을 때 '(중간)' 으로 보인다. */
  lastText: z.string().default(""),
});
export type ProbeAttempt = z.infer<typeof attemptSchema>;

/** WR 차례 안 시도 하나의 몫(record.attempts 와 같은 차례): 버림이면 정한 길이 · 버림 안 읽기 켬 여부, 진짜면 null · false. */
const roundSlotSchema = z.object({
  role: z.enum(["decoy", "real"]),
  plannedMs: z.number().nullable(),
  speak: z.boolean(),
});

const recordSchema = z.object({
  id: z.number().int().positive(),
  /** 몇 번째로 연 쪽인가(이 기기의 모든 탭을 합쳐 새로 고침 · 새 탭마다 1 씩). */
  load: z.number().int().positive(),
  /** 탭 표지(sessionStorage 의 무작위 글, 분석 P1 · P2). */
  tabId: z.string().default("-"),
  /** 그 탭에서 처음 연 쪽인가(새로 고침이면 아니요). 모르면 null. */
  tabFirstLoad: z.boolean().nullable().default(null),
  /** 쪽 연 방법(PerformanceNavigationTiming.type — navigate · reload · back_forward). */
  navigationType: z.string().default("-"),
  /** 요청자가 고른 '지금 한 일'(분석 P3). */
  resetStep: z.enum(RESET_STEPS).default("as-is"),
  strategy: z.enum(STRATEGIES),
  lang: z.string(),
  /** 누른 때(벽시계, ISO). */
  pressedAt: z.string(),
  tapAt: z.number(),
  /** 같은 쪽에서 앞 듣기 end 뒤 첫 start 호출까지 ms(그 쪽 첫 듣기는 null). */
  sincePrevEndMs: z.number().nullable(),
  /** 같은 쪽 앞 듣기가 끝난 까닭(그 쪽 첫 듣기는 null). */
  prevStopReason: z.enum(STOP_REASONS).nullable().default(null),
  /** 같은 쪽 앞 듣기를 앱이 끝낸 방법(stop · abort, 스스로 끝났으면 null). */
  prevStopMethod: z.enum(STOP_METHODS).nullable().default(null),
  /** 앞 듣기 끝(그 쪽 첫 듣기면 쪽 연 때) 뒤 첫 start 호출까지 읽기(무음 포함)가 있었는가. 모르면 null. */
  ttsBetween: z.boolean().nullable().default(null),
  /** 첫 start 호출 때 무음 WebAudio(K) 상태(running · suspended · closed). 꺼져 있으면 null. */
  webAudioState: z.string().nullable().default(null),
  /** 첫 start 호출 때 navigator.audioSession.type(없으면 null). */
  audioSessionType: z.string().nullable().default(null),
  visibilityAtStart: z.string(),
  attempts: z.array(attemptSchema),
  events: z.array(eventSchema),
  stopReason: z.enum(STOP_REASONS).nullable(),
  /** 앱이 이 듣기를 끝낸 방법(stop · abort). 브라우저가 스스로 끝냈으면 null. */
  stopMethod: z.enum(STOP_METHODS).nullable().default(null),
  /** 상한(MAX_INTERIM_EVENTS)을 넘어 남기지 않은 중간 결과 수. */
  droppedInterims: z.number().int().nonnegative().default(0),
  /** 자동 측정(fix 4)의 회차 표지와 차례(0 부터). 손으로 누른 기록은 null. */
  autoRun: z.string().nullable().default(null),
  autoStep: z.number().int().nonnegative().nullable().default(null),
  /** W: 버림 세션 길이 · 읽기 켬 여부. W 가 아니면 null. 시도 1(attempt 0)이 버림, 시도 2 가 진짜다. */
  decoy: z
    .object({ lengthMs: z.number(), speak: z.boolean() })
    .nullable()
    .default(null),
  /** 앞 듣기 끝(쪽 연 때) 뒤에 누른 '읽기 제약 풀기'(V-1): 누른 뒤 이 듣기 누름까지 ms · 시작 · 끝 알림 · 오류. 없으면 null. */
  unlockBefore: z
    .object({
      ageMs: z.number(),
      started: z.boolean(),
      ended: z.boolean(),
      error: z.string().nullable(),
    })
    .nullable()
    .default(null),
  /** WR(fix 7): 차례 번호 · 정한 버림 · 살아 있는 버림의 길 · 진짜 꼴 · 탄 길 · 시도마다의 몫. WR 이 아니면 null. */
  round: z
    .object({
      step: z.number().int().nonnegative(),
      decoyMs: z.number(),
      speak: z.boolean(),
      live: z.enum(["na", "ga"]),
      real: z.enum(["plain", "s"]),
      path: z.enum(["dead", "na", "na-ga", "ga"]),
      slots: z.array(roundSlotSchema),
      /** WR2(fix 8): 소리 종류 · 읽은 문장(띵 · 없음은 null) · 읽기 앞 cancel · 소리 끝을 기다려 닫는가 · 갈래. WR 기록은 null. */
      sound: z
        .enum(["short", "normal", "long", "beep", "none"])
        .nullable()
        .default(null),
      sentence: z.string().nullable().default(null),
      cancel: z.boolean().nullable().default(null),
      waitSound: z.boolean().nullable().default(null),
      group: z
        .enum([
          "first",
          "control",
          "short3",
          "short15",
          "beep",
          "stuck",
          "recover",
          "u16",
        ])
        .nullable()
        .default(null),
      /**
       * AR(A 라운드): 소리 내는 길 · 차례 꼴 · 그 길 · 꼴 안 몇 번째 · 차례의 소리 형식(읽기 길은 null) ·
       * 차례를 시작할 때까지 이 쪽에서 speechSynthesis 를 부른 수(speak · cancel). AR 이 아니면 없다.
       */
      a: z
        .object({
          via: z.enum(A_VIAS),
          shape: z.enum(A_SHAPES),
          rep: z.number().int().nonnegative(),
          format: z.enum(A_FORMATS).nullable(),
          synthCalls: z.number().int().nonnegative(),
        })
        .optional(),
    })
    .nullable()
    .default(null),
});
export type ProbeRecord = z.infer<typeof recordSchema>;

/** 기기 종류(분석 P1 — UA 가 Mac Safari 와 같은 꼴인 iPad 를 가른다). */
export type DeviceKind = "iPad" | "iPhone" | "Mac" | "기타";

/** iPadOS 의 데스크톱 꼴 UA 는 platform 'MacIntel' + 터치 점 2 이상으로 iPad 다. */
export function deviceKindOf(input: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}): DeviceKind {
  if (/iPad/.test(input.userAgent)) return "iPad";
  if (/iPhone|iPod/.test(input.userAgent)) return "iPhone";
  const macLike =
    /Macintosh/.test(input.userAgent) || input.platform === "MacIntel";
  if (macLike) return input.maxTouchPoints > 1 ? "iPad" : "Mac";
  return "기타";
}

/**
 * 탭 표지. 이 탭의 sessionStorage 에 표지가 없거나 새 탭으로 열렸으면(window.open 은 sessionStorage 를 복사하므로 '#newtab' 으로
 * 가른다) 새 표지를 만들고 '처음 연 쪽'이다. 있으면 그 표지를 쓰고 처음이 아니다(새로 고침).
 */
export function tabMarkOf(
  stored: string | null,
  forceNew: boolean,
  makeId: () => string,
): { tabId: string; firstLoad: boolean } {
  if (stored !== null && stored !== "" && !forceNew) {
    return { tabId: stored, firstLoad: false };
  }
  return { tabId: makeId(), firstLoad: true };
}

/** 쪽 머리의 환경 줄(복사 글 머리에도 넣는다). */
export type ProbeEnv = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  device: DeviceKind;
  /** navigator.permissions 의 microphone 상태(granted · prompt · denied), 못 읽으면 '-'. */
  micPermission: string;
  visibility: string;
  audioSessionType: string | null;
  recognition: "webkitSpeechRecognition" | "SpeechRecognition" | "없음";
  tabId: string;
  tabFirstLoad: boolean;
  newTab: boolean;
  navigationType: string;
  openedAt: string;
  load: number;
  webAudioState: string | null;
};

/** 기록 한 줄의 표 값. ms 는 그 시도의 start 호출 기준(반올림), 없으면 null. */
export type ProbeRow = {
  id: number;
  load: number;
  tabId: string;
  resetStep: ResetStep;
  strategy: Strategy;
  lang: string;
  nth: number | null;
  sincePrevEndMs: number | null;
  prevStopReason: StopReason | null;
  prevStopMethod: StopMethod | null;
  ttsBetween: boolean | null;
  webAudioState: string | null;
  audioSessionType: string | null;
  restarts: number;
  /** 시도마다 audiostart ms(없으면 null). */
  audiostarts: (number | null)[];
  audiostart: number | null;
  soundstart: number | null;
  speechstart: number | null;
  firstInterim: { ms: number; length: number } | null;
  final: { ms: number; length: number } | null;
  /** 마지막 시도의 final 결과 ms 모두(S · S2 는 세 개를 기대). */
  finalMs: number[];
  /**
   * 세션 중 읽기(S '세션 중 읽기' 단추 · S2 자동, 듣기 시작 뒤의 읽어 주기 글): 부른 수(speak-call) · 시작 알림 수(speak-start),
   * 첫 부름 앞 · 뒤의 결과 수, 뒤의 final 수, 들은 글에 읽은 문장의 낱말이 들었는지(분석 Q4 · 10.16 — 글은 남기지 않고 겹침만).
   * 세션 중 읽기가 없으면 null.
   */
  sessionSpeak: {
    calls: number;
    started: number;
    before: number;
    after: number;
    finalsAfter: number;
    echoed: boolean;
  } | null;
  /**
   * W: 버림 세션(시도 1)의 길이 · as · 살아 있음(as > 250 으로 abort) · 버림 중 읽기 부름 · 시작 알림 수와, 진짜 세션(시도 2)의 as · 성공.
   * 진짜가 열리지 않았으면 realAs · realSuccess 는 null. W 가 아니면 null.
   */
  decoy: {
    lengthMs: number;
    speak: boolean;
    as: number | null;
    alive: boolean;
    speakCalls: number;
    speakStarts: number;
    realAs: number | null;
    realSuccess: boolean | null;
  } | null;
  /** '읽기 제약 풀기'(V-1)를 이 듣기 앞에 했는가와 그 결과. */
  unlockBefore: ProbeRecord["unlockBefore"];
  /** WR(fix 7)의 차례 칸. WR 이 아니면 null. */
  round: RoundRow | null;
  /** WR2(fix 8)의 차례 칸. WR2 가 아니면 null. */
  round2: Round2Row | null;
  /** AR(A 라운드)의 차례 칸. AR 이 아니면 null. */
  roundA: ARow | null;
  error: { ms: number; code: string; message: string } | null;
  end: number | null;
  /** D · F · H · I: 듣기 앞 마지막 읽기 끝 알림 → 첫 start 호출 ms(F · H · I 는 누르기까지 기다린 시간, I 는 쉼도 포함). */
  speakEndToStart: number | null;
  /** G: speechSynthesis.cancel() 호출 → 첫 start 호출 ms. */
  cancelToStart: number | null;
  /** G: 누른 때 아직 읽는 중이었는가(cancel 앞의 speechSynthesis.speaking). G 가 아니면 null. */
  cancelWhileSpeaking: boolean | null;
  droppedInterims: number;
  hiddenDuring: boolean;
  stopReason: StopReason | null;
  stopMethod: StopMethod | null;
  finalText: string;
  heardText: string;
  success: boolean;
  /** final 없이 중간 결과만 있었다(분석 P6). */
  interimOnly: boolean;
};

const round = (ms: number) => Math.round(ms);

function firstOf(
  record: ProbeRecord,
  attempt: number,
  pick: (e: ProbeEvent) => boolean,
): ProbeEvent | undefined {
  return record.events.find((e) => e.attempt === attempt && pick(e));
}

function relMs(
  record: ProbeRecord,
  attempt: number,
  event: ProbeEvent | undefined,
): number | null {
  const base = record.attempts[attempt]?.startCallAt;
  if (event === undefined || base === undefined) return null;
  return round(event.at - base);
}

/** 성공 = 어느 시도든 final 결과가 있다(브리프). */
export function isSuccess(record: ProbeRecord): boolean {
  return record.events.some((e) => e.type === "result" && e.final === true);
}

/** final 없이 중간 결과만 있었다(분석 P6). */
export function isInterimOnly(record: ProbeRecord): boolean {
  return (
    !isSuccess(record) &&
    (record.events.some((e) => e.type === "result") ||
      record.droppedInterims > 0)
  );
}

/** 기록 하나를 표 한 줄로. 시도별 audiostart 를 빼면 마지막 시도의 값이다. */
export function rowOf(record: ProbeRecord): ProbeRow {
  const last = Math.max(0, record.attempts.length - 1);
  const ms = (type: ProbeEventType) =>
    relMs(
      record,
      last,
      firstOf(record, last, (e) => e.type === type),
    );
  const interim = firstOf(
    record,
    last,
    (e) => e.type === "result" && e.final !== true,
  );
  const final = firstOf(
    record,
    last,
    (e) => e.type === "result" && e.final === true,
  );
  const error = firstOf(record, last, (e) => e.type === "error");
  const results = record.events.filter(
    (e) => e.attempt === last && e.type === "result",
  );
  const firstStart = record.attempts[0]?.startCallAt;
  // 듣기 앞의 읽기 사건만 센다(G 는 cancel 뒤에 끝 알림이 늦게 올 수 있다). I 는 무음 읽기 뒤 선생님 말이라 마지막 끝 알림을 쓴다.
  const lastBeforeStart = (type: ProbeEventType) =>
    firstStart === undefined
      ? undefined
      : record.events.findLast((e) => e.type === type && e.at <= firstStart);
  const speakEnd = lastBeforeStart("speak-end");
  // 세션 중 읽기: 듣기 시작 뒤의 읽어 주기 글. fix 5 앞 기록에는 speak-call 이 없어 speak-start 로 센다
  const midOf = (type: ProbeEventType) =>
    firstStart === undefined
      ? []
      : record.events.filter(
          (e) =>
            e.type === type && e.utterance !== "unlock" && e.at > firstStart,
        );
  const midCalls = midOf("speak-call");
  const midStarts = midOf("speak-start");
  const midAnchor = (midCalls[0] ?? midStarts[0])?.at;
  const cancel = lastBeforeStart("speak-cancel");
  return {
    id: record.id,
    load: record.load,
    tabId: record.tabId,
    resetStep: record.resetStep,
    strategy: record.strategy,
    lang: record.lang,
    nth: record.attempts[0]?.nth ?? null,
    sincePrevEndMs:
      record.sincePrevEndMs === null ? null : round(record.sincePrevEndMs),
    prevStopReason: record.prevStopReason,
    prevStopMethod: record.prevStopMethod,
    ttsBetween: record.ttsBetween,
    webAudioState: record.webAudioState,
    audioSessionType: record.audioSessionType,
    restarts: Math.max(0, record.attempts.length - 1),
    audiostarts: record.attempts.map((_, i) =>
      relMs(
        record,
        i,
        firstOf(record, i, (e) => e.type === "audiostart"),
      ),
    ),
    audiostart: ms("audiostart"),
    soundstart: ms("soundstart"),
    speechstart: ms("speechstart"),
    firstInterim:
      interim === undefined
        ? null
        : {
            ms: relMs(record, last, interim) ?? 0,
            length: interim.length ?? 0,
          },
    final:
      final === undefined
        ? null
        : {
            ms: relMs(record, last, final) ?? 0,
            length: final.length ?? 0,
          },
    finalMs: results
      .filter((e) => e.final === true)
      .map((e) => relMs(record, last, e) ?? 0),
    decoy: decoyOf(record),
    unlockBefore: record.unlockBefore,
    round: roundRowOf(record),
    round2: round2RowOf(record),
    roundA: aRowOf(record),
    sessionSpeak:
      midAnchor === undefined || !CONTINUOUS_SESSION.includes(record.strategy)
        ? null
        : {
            calls: midCalls.length,
            started: midStarts.length,
            before: results.filter((e) => e.at <= midAnchor).length,
            ...afterSpeakOf(
              results.filter((e) => e.at > midAnchor),
              record.attempts[last]?.lastText ?? "",
            ),
          },
    error:
      error === undefined
        ? null
        : {
            ms: relMs(record, last, error) ?? 0,
            code: error.code ?? "",
            message: error.message ?? "",
          },
    end: ms("end"),
    speakEndToStart:
      speakEnd === undefined || firstStart === undefined
        ? null
        : round(firstStart - speakEnd.at),
    cancelToStart:
      cancel === undefined || firstStart === undefined
        ? null
        : round(firstStart - cancel.at),
    cancelWhileSpeaking:
      cancel === undefined ? null : cancel.code === "speaking",
    droppedInterims: record.droppedInterims,
    hiddenDuring: record.events.some((e) => e.type === "hidden"),
    stopReason: record.stopReason,
    stopMethod: record.stopMethod,
    finalText: [...results].reverse().find((e) => e.finalText)?.finalText ?? "",
    heardText: record.attempts[last]?.lastText ?? "",
    success: isSuccess(record),
    interimOnly: isInterimOnly(record),
  };
}

/** W 의 버림 · 진짜 칸(행 값 decoy). */
function decoyOf(record: ProbeRecord): ProbeRow["decoy"] {
  if (record.decoy === null) return null;
  const startOf = (attempt: number) => record.attempts[attempt]?.startCallAt;
  const decoyStart = startOf(0);
  const realStart = startOf(1);
  const asOf = (attempt: number) =>
    relMs(
      record,
      attempt,
      firstOf(record, attempt, (e) => e.type === "audiostart"),
    );
  const duringDecoy = (type: ProbeEventType) =>
    record.events.filter(
      (e) =>
        e.type === type &&
        e.utterance === "line" &&
        decoyStart !== undefined &&
        e.at > decoyStart &&
        (realStart === undefined || e.at < realStart),
    ).length;
  return {
    lengthMs: record.decoy.lengthMs,
    speak: record.decoy.speak,
    as: asOf(0),
    alive: record.events.some((e) => e.type === "decoy-alive"),
    speakCalls: duringDecoy("speak-call"),
    speakStarts: duringDecoy("speak-start"),
    realAs: realStart === undefined ? null : asOf(1),
    realSuccess:
      realStart === undefined
        ? null
        : record.events.some(
            (e) => e.type === "result" && e.final === true && e.attempt === 1,
          ),
  };
}

/** S2 가 세션 중에 읽는 문장의 낱말(소문자). 결과에 들면 인식이 읽기 소리를 들은 것이다. */
const SPEAK_WORDS: readonly string[] =
  SPEAK_SENTENCE.toLowerCase().match(/[a-z]+/g) ?? [];

/** 세션 중 읽기 뒤의 결과 수 · final 수와, 들은 글(final 글 · 마지막 들은 글)에 읽은 문장의 낱말이 들었는지. */
function afterSpeakOf(
  results: readonly ProbeEvent[],
  lastText: string,
): { after: number; finalsAfter: number; echoed: boolean } {
  const heard = [lastText, ...results.map((e) => e.finalText ?? "")]
    .join(" ")
    .toLowerCase()
    .match(/[a-z]+/g);
  return {
    after: results.length,
    finalsAfter: results.filter((e) => e.final === true).length,
    echoed:
      results.length > 0 && (heard ?? []).some((w) => SPEAK_WORDS.includes(w)),
  };
}

/**
 * 결과 사건을 남길지(검토 M-4). final 은 늘 남기고, 중간 결과는 그 시도에서 MAX_INTERIM_EVENTS 개까지만 남긴다.
 * 첫 중간 결과의 ms 는 늘 남는다.
 */
export function keepResultEvent(
  record: ProbeRecord,
  event: { attempt: number; final: boolean },
): boolean {
  if (event.final) return true;
  const interims = record.events.filter(
    (e) =>
      e.type === "result" && e.final !== true && e.attempt === event.attempt,
  ).length;
  return interims < MAX_INTERIM_EVENTS;
}

/** B 의 다시 시작 판정: 시작 알림이 빠르고(200ms 안) 1.5초 안에 소리 · 말 · 결과가 없으며 횟수가 남았다. */
export function fastRestartDue(input: {
  audiostartMs: number | null;
  heard: boolean;
  restarts: number;
}): boolean {
  return (
    input.audiostartMs !== null &&
    input.audiostartMs < FAST_AUDIOSTART_MS &&
    !input.heard &&
    input.restarts < MAX_FAST_RESTARTS
  );
}

/**
 * 기록 하나를 저장 목록 끝에 붙인다. 번호는 목록의 가장 큰 번호 + 1(여러 탭이 같은 저장소에 쓰므로 붙일 때 매긴다).
 * 상한을 넘으면 오래된 것부터 버린다.
 */
export function appendRecord(
  stored: readonly ProbeRecord[],
  record: ProbeRecord,
  max: number = MAX_RECORDS,
): ProbeRecord[] {
  const id = Math.max(0, ...stored.map((r) => r.id)) + 1;
  return [...stored, { ...record, id }].slice(-max);
}

export type StrategySummary = {
  strategy: Strategy;
  tries: number;
  successes: number;
  /** final 없이 중간 결과만 있었던 수(분석 P6). */
  interimOnly: number;
  /** 성공률(%, 반올림). 누른 적이 없으면 null. */
  rate: number | null;
};

/** 전략별 성공률(성공 = final 결과 있음). 전략 차례는 STRATEGIES 그대로. */
export function summaryOf(records: readonly ProbeRecord[]): StrategySummary[] {
  return STRATEGIES.map((strategy) => {
    const mine = records.filter((r) => r.strategy === strategy);
    const successes = mine.filter(isSuccess).length;
    return {
      strategy,
      tries: mine.length,
      successes,
      interimOnly: mine.filter(isInterimOnly).length,
      rate:
        mine.length === 0 ? null : Math.round((successes / mine.length) * 100),
    };
  });
}

/** 표 칸 글. 없음은 '-'. */
export const cell = (value: number | null) =>
  value === null ? "-" : String(value);

const yesNo = (value: boolean | null) =>
  value === null ? "-" : value ? "예" : "아니요";

/** 마크다운 표 칸 안의 '|' · 줄바꿈을 막는다. */
const escapeCell = (text: string) =>
  text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");

export const SUMMARY_COLUMNS = [
  "전략",
  "누름",
  "성공",
  "중간만",
  "성공률",
] as const;

export const ROW_COLUMNS = [
  "#",
  "쪽",
  "탭",
  "지금 한 일",
  "전략",
  "언어",
  "n번째",
  "앞 끝 뒤",
  "앞 멈춤",
  "사이 읽기",
  "WebAudio",
  "세션 꼴",
  "재시작",
  "시도별 as",
  "ss",
  "sp",
  "첫 중간(길이)",
  "final(길이)",
  "final ms",
  "세션 중 읽기(부름·시작 / 앞·뒤 결과 · 뒤 final · 들림)",
  "버림(길이·as·살아 있음·읽기 부름/시작) → 진짜(as·결과)",
  "앞 제약 풀기(누른 뒤 ms·시작·끝)",
  "오류",
  "end",
  "읽기 끝 뒤",
  "취소 뒤(읽는 중)",
  "숨김",
  "멈춤",
  "버린 중간",
  "들은 글",
  "W 라운드(차례·길 / 버림 길이·읽기·as·살아 있음·실제 길이·읽기 시작~끝 → 진짜 as·sp·apple·banana · WR2 · A 라운드는 아래 설명 줄)",
] as const;

/** 표 한 줄의 칸 글(화면 표 · 복사 글이 같이 쓴다). */
export function rowCells(row: ProbeRow): string[] {
  return [
    String(row.id),
    String(row.load),
    row.tabId,
    row.resetStep,
    row.strategy,
    row.lang,
    cell(row.nth),
    cell(row.sincePrevEndMs),
    row.prevStopReason === null
      ? "-"
      : `${row.prevStopReason}${row.prevStopMethod === null ? "" : `·${row.prevStopMethod}`}`,
    yesNo(row.ttsBetween),
    row.webAudioState ?? "-",
    row.audioSessionType ?? "-",
    String(row.restarts),
    row.audiostarts.map(cell).join(" → ") || "-",
    cell(row.soundstart),
    cell(row.speechstart),
    row.firstInterim === null
      ? "-"
      : `${row.firstInterim.ms}(${row.firstInterim.length})`,
    row.final === null ? "-" : `${row.final.ms}(${row.final.length})`,
    row.finalMs.length === 0 ? "-" : row.finalMs.join(" · "),
    row.sessionSpeak === null
      ? "-"
      : `${row.sessionSpeak.calls}·${row.sessionSpeak.started} / ${row.sessionSpeak.before}·${row.sessionSpeak.after} · ${row.sessionSpeak.finalsAfter} · ${yesNo(row.sessionSpeak.echoed)}`,
    row.decoy === null
      ? "-"
      : `${row.decoy.lengthMs / 1000}s·${cell(row.decoy.as)}·${yesNo(row.decoy.alive)}·${row.decoy.speak ? `${row.decoy.speakCalls}/${row.decoy.speakStarts}` : "끔"} → ${cell(row.decoy.realAs)}·${row.decoy.realSuccess === null ? "-" : row.decoy.realSuccess ? "성공" : "실패"}`,
    row.unlockBefore === null
      ? "-"
      : `${round(row.unlockBefore.ageMs)}·${yesNo(row.unlockBefore.started)}·${yesNo(row.unlockBefore.ended)}${row.unlockBefore.error === null ? "" : `·${row.unlockBefore.error}`}`,
    row.error === null
      ? "-"
      : `${row.error.code}${row.error.message ? ` "${row.error.message}"` : ""} @${row.error.ms}`,
    cell(row.end),
    cell(row.speakEndToStart),
    row.cancelToStart === null
      ? "-"
      : `${row.cancelToStart}(${yesNo(row.cancelWhileSpeaking)})`,
    row.hiddenDuring ? "예" : "-",
    row.stopReason === null
      ? "-"
      : `${row.stopReason}${row.stopMethod === null ? "" : `·${row.stopMethod}`}`,
    row.droppedInterims === 0 ? "-" : String(row.droppedInterims),
    row.finalText || (row.heardText ? `(중간) ${row.heardText}` : "-"),
    row.roundA !== null
      ? aCellOf(row.roundA)
      : row.round2 !== null
        ? round2CellOf(row.round2)
        : row.round === null
          ? "-"
          : roundCellOf(row.round),
  ];
}

/** 요약 한 줄의 칸 글. */
export function summaryCells(s: StrategySummary): string[] {
  return [
    s.strategy,
    String(s.tries),
    String(s.successes),
    String(s.interimOnly),
    s.rate === null ? "-" : `${s.rate}%`,
  ];
}

const tableLine = (cells: readonly string[]) =>
  `| ${cells.map(escapeCell).join(" | ")} |`;

/** 복사 글: 환경 줄 + 전략별 요약 표 + 기록 표(마크다운) + 원 기록 JSON. 요청자가 대화창에 붙여 넣는다. */
export function copyTextOf(
  records: readonly ProbeRecord[],
  env: ProbeEnv,
): string {
  const lines = [
    "## 마이크 점검 기록",
    "",
    `- UA: ${env.userAgent}`,
    `- 기기: ${env.device}(platform ${env.platform} · 터치 점 ${env.maxTouchPoints}) · 마이크 권한: ${env.micPermission} · 인식: ${env.recognition}`,
    `- 탭: ${env.tabId}(이 쪽에서 첫 듣기: ${yesNo(env.tabFirstLoad)}${env.newTab ? " · 새 탭" : ""}) · 연 방법: ${env.navigationType} · 연 때: ${env.openedAt} · 쪽 연 횟수: ${env.load}`,
    `- 화면: ${env.visibility} · audioSession.type: ${env.audioSessionType ?? "없음"} · 무음 WebAudio: ${env.webAudioState ?? "꺼짐"}`,
    "- ms 는 그 시도의 start 호출 기준. as audiostart · ss soundstart · sp speechstart",
    "- 앞 끝 뒤 · 앞 멈춤 · 사이 읽기: 같은 쪽의 앞 듣기 end → 첫 start 호출 ms · 앞 듣기가 끝난 까닭(·앱이 끝낸 방법 stop · abort) · 그 사이 읽기(무음 포함) 여부",
    "- S · S2 는 한 세션(60초 상한)이라 final ms 가 여럿. 세션 중 읽기: speak() 부른 수 · 시작 알림 수 / 첫 부름 앞 · 뒤 결과 수 · 뒤 final 수 · 들은 글에 읽은 문장 낱말이 들었는지(부름보다 시작이 적으면 iOS 가 버린 것)",
    "- 버림 → 진짜(W): 버림 세션 길이 · 버림 as · 살아 있음(as > 250 이면 abort 하고 곧바로 진짜) · 버림 중 읽기 부름/시작(끔이면 '끔') → 진짜 as · 진짜 결과. 앞 제약 풀기: '읽기 제약 풀기'를 누른 뒤 이 듣기 누름까지 ms · 시작 · 끝 알림",
    "- 읽기 끝 뒤: 듣기 앞 마지막 읽기 끝 알림 → 첫 start 호출(D 누름 밖 자동 · F · H · I 누름). 취소 뒤: G 의 speechSynthesis.cancel() → 첫 start 호출(괄호는 그때 읽는 중이었는지)",
    "- W 라운드 2(WR2): 차례 · 갈래 · 소리(short 짧은 말 · normal 보통 말 · long 긴 문장 · beep 띵 · none) / 버림 하한 · as · 실제 길이 · cancel 때 speaking·pending(0.3초 뒤) · 부른 때 · 소리 시작~끝(없으면 '끝 없음') · stop 때 speaking · 거짓 확인 / 진짜 as · sp · 중간 · final · apple · banana · 메아리 · 깨끗함(ms 는 그 시도 start 기준)",
    "- A 라운드(AR): 차례 · 소리 내는 길(Web Audio · 오디오 요소 · 지금 읽기) · 꼴(쉰 뒤 첫 차례 · 버림 안 · 세션 없이 · 재움 둘) · 형식 / 버림 하한 · as · 실제 길이 / 소리 부름 → 첫 소리 ms · 소리 시작~끝 · 재움 뒤 상태 / 진짜 as · sp · 중간 · final · apple · 소리 받음 · 깨끗함 · 그때까지 speechSynthesis 부른 수(ms 는 그 시도 start 기준)",
    "- W 라운드(WR): 차례 · 탄 길(dead 버림 죽음 · na 살아 있어 두 번째 버림 · na-ga 두 번째도 살아 있어 세션 없이 읽기 · ga 세션 없이 읽기) / 버림마다 길이 · 읽기 켬 끔 · as · 살아 있음 · 실제 길이 · 버림 안 읽기 시작~끝(ms, 버림 start 기준) → 진짜 as · sp · apple · banana(차례 7 만). 진짜 살아남은 apple · banana final 수",
    "",
    tableLine(SUMMARY_COLUMNS),
    tableLine(SUMMARY_COLUMNS.map(() => "---")),
    ...summaryOf(records)
      .filter((s) => s.tries > 0)
      .map((s) => tableLine(summaryCells(s))),
    ...roundRunsOf(records).map(
      (run) =>
        `- W 라운드 ${run}: ${survivalLineOf(roundSurvivalOf(records, run))}`,
    ),
    ...roundRunsOf(records, "WR2").map(
      (run) =>
        `- W 라운드 2 ${run}: ${round2LineOf(round2LinesOf(records, run))}`,
    ),
    ...roundRunsOf(records, "AR").map(
      (run) => `- A 라운드 ${run}: ${aCellsLineOf(aLinesOf(records, run))}`,
    ),
    "",
    tableLine(ROW_COLUMNS),
    tableLine(ROW_COLUMNS.map(() => "---")),
    ...records.map((r) => tableLine(rowCells(rowOf(r)))),
    "",
    "```json",
    JSON.stringify({ env, records }),
    "```",
  ];
  return lines.join("\n");
}

/** WR(또는 WR2 · AR) 기록의 라운드 표지(처음 나온 차례대로). */
function roundRunsOf(
  records: readonly ProbeRecord[],
  strategy: Strategy = "WR",
): string[] {
  const runs: string[] = [];
  for (const r of records) {
    if (
      r.round !== null &&
      r.strategy === strategy &&
      r.autoRun !== null &&
      !runs.includes(r.autoRun)
    ) {
      runs.push(r.autoRun);
    }
  }
  return runs;
}

/** 기기 안에 둔 기록을 읽는다. 꼴이 어긋나면 빈 목록. fix 1 · fix 2 앞의 꼴(새 칸 없음)도 기본값으로 읽힌다. */
export function parseStored(raw: string | null): ProbeRecord[] {
  if (raw === null) return [];
  try {
    const parsed = z.array(recordSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

// ---- 자동 측정(fix 4) ----

/** 자동 측정의 듣기 한 번: 이만큼 뒤에 stop(결과가 없으면 no-result, 있으면 cap). 말 없이도 audiostart 띠로 가른다. */
export const AUTO_LISTEN_MS = 4_000;
/** 자동 측정의 듣기 사이 간격(앞 듣기 end → 다음 start). */
export const AUTO_GAP_MS = 2_000;
/** 자동 측정의 쉼 두 블록(분석 10절 — 앞 듣기 뒤 40초 넘게 쉬면 5/5 성공). */
export const AUTO_PAUSE_45_MS = 45_000;
export const AUTO_PAUSE_90_MS = 90_000;
/** 자동 측정에서 '지금 눌러 말하기'가 켜진 뒤 대신 누르기까지(H · I · T 뒤). */
export const AUTO_PRESS_DELAY_MS = 1_000;

export type AutoStep =
  | {
      kind: "listen";
      strategy: Strategy;
      /** 앞 차례(듣기 end 또는 WebAudio 끄기) 뒤 이 차례를 시작하기까지 ms. 첫 차례는 0(누름 안에서 곧바로). */
      waitMs: number;
      resetStep: ResetStep;
    }
  | { kind: "webaudio-off"; waitMs: number };

/**
 * 자동 측정 순서(브리프 fix 4): A → (45초 쉼) A → (90초 쉼) A → H → I → L 넷 → T(+ T 뒤 A) → K 켜고 셋 → K 끄고 A.
 * 첫 A 만 단추 누름 안에서 시작하고, 나머지는 타이머로 시작한다(WebKit start() 에 사용자 제스처 검사가 없다 — 안 되면 그 사실이 기록).
 */
export function autoPlanOf(): AutoStep[] {
  const listen = (
    strategy: Strategy,
    waitMs: number = AUTO_GAP_MS,
    resetStep: ResetStep = "as-is",
  ): AutoStep => ({ kind: "listen", strategy, waitMs, resetStep });
  return [
    listen("A", 0),
    listen("A", AUTO_PAUSE_45_MS, "pause-45"),
    listen("A", AUTO_PAUSE_90_MS, "pause-90"),
    listen("H"),
    listen("I"),
    ...SESSION_TYPES.map((t) => listen(`L-${t}`)),
    listen("T"),
    listen("T-next"),
    listen("K"),
    listen("K"),
    listen("K"),
    { kind: "webaudio-off", waitMs: 0 },
    listen("A"),
  ];
}

// ---- 서버 로그(fix 4) ----

/** 서버 로그 한 줄의 머리(Route Handler 가 console.log 첫 인자로 쓴다). */
export const LOG_TAG = "[mic-probe]";
/** 로그 몸 상한(글자 — 브리프 8KB). 보내는 쪽은 넘지 않게 줄이고, 받는 쪽은 넘으면 413. */
export const LOG_BODY_MAX_CHARS = 8_000;
/** 들은 글이 들 수 있는 칸. 로그에는 원문 대신 길이(<칸>Length)만 남긴다. */
const TEXT_KEYS = ["finalText", "lastText", "heardText", "text"] as const;

/** 값 안의 글 칸을 길이로 바꾼다(받는 쪽의 깊이 방어 — 보내는 쪽도 이미 길이만 보낸다). */
export function redactLogBody(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactLogBody);
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    if ((TEXT_KEYS as readonly string[]).includes(key)) {
      out[`${key}Length`] = typeof inner === "string" ? inner.length : null;
      continue;
    }
    out[key] = redactLogBody(inner);
  }
  return out;
}

function logEnvOf(env: ProbeEnv) {
  return {
    device: env.device,
    userAgent: env.userAgent,
    micPermission: env.micPermission,
    tabId: env.tabId,
    load: env.load,
    navigationType: env.navigationType,
    visibility: env.visibility,
    audioSessionType: env.audioSessionType,
    webAudioState: env.webAudioState,
  };
}

/** 사건 한 줄을 짧은 배열로(종류 · 누른 때 기준 ms · 시도 · code · final · 길이). 글은 넣지 않는다. */
function compactEvent(record: ProbeRecord, e: ProbeEvent) {
  return [
    e.type,
    round(e.at - record.tapAt),
    e.attempt,
    e.code ?? null,
    e.final ?? null,
    e.length ?? null,
  ];
}

/**
 * 듣기 기록 하나의 로그 몸(JSON 글). 들은 글은 길이만 넣는다. LOG_BODY_MAX_CHARS 를 넘으면 사건 목록을 빼고(수만 남김),
 * 그래도 넘으면 UA 를 뺀다.
 */
export function recordLogOf(record: ProbeRecord, env: ProbeEnv): string {
  const { finalText, heardText, ...row } = rowOf(record);
  const base = {
    kind: "record" as const,
    autoRun: record.autoRun,
    autoStep: record.autoStep,
    env: logEnvOf(env),
    row: {
      ...row,
      finalLength: finalText.length,
      heardLength: heardText.length,
    },
    eventCount: record.events.length,
  };
  const full = JSON.stringify({
    ...base,
    events: record.events.map((e) => compactEvent(record, e)),
  });
  if (full.length <= LOG_BODY_MAX_CHARS) return full;
  const lean = JSON.stringify({ ...base, truncated: true });
  if (lean.length <= LOG_BODY_MAX_CHARS) return lean;
  return JSON.stringify({
    ...base,
    env: { ...base.env, userAgent: "" },
    truncated: true,
  });
}

/** 자동 측정 끝의 요약 로그 몸: 전략별 성공률과 차례마다 한 줄(전략 · 지금 한 일 · 시도별 as · 성공 · 멈춤). */
export function summaryLogOf(
  records: readonly ProbeRecord[],
  env: ProbeEnv,
  autoRun: string,
  hiddenCount: number,
): string {
  const mine = records.filter((r) => r.autoRun === autoRun);
  const base = {
    kind: "summary" as const,
    autoRun,
    hiddenCount,
    env: logEnvOf(env),
    summary: summaryOf(mine).filter((s) => s.tries > 0),
  };
  const steps = mine.map((r) => {
    const row = rowOf(r);
    return [
      r.autoStep,
      r.strategy,
      r.resetStep,
      row.sincePrevEndMs,
      row.audiostarts,
      row.success,
      row.stopReason,
      row.hiddenDuring,
    ];
  });
  const full = JSON.stringify({ ...base, steps });
  return full.length <= LOG_BODY_MAX_CHARS
    ? full
    : JSON.stringify({ ...base, truncated: true });
}

// ---- 자동 W 라운드(fix 7, 분석 10.18.3) ----

/** WR: 누름 안 무음 읽기 끝 뒤 · 차례 8 앞의 쉼(장치가 새로 열릴 만큼 — 분석 10.18.2 speech.discard_window_ms 잠정 45000). */
export const ROUND_PAUSE_MS = 45_000;
/** WR: 차례 사이(앞 차례 진짜 end → 다음 차례 버림 start). */
export const ROUND_GAP_MS = 2_000;
/** WR 버림 길이 셋(X-3 — 길이 3 · 5 · 10초). */
export const ROUND_DECOY_MS = { short: 3_000, mid: 5_000, long: 10_000 };
/** WR 길 (나): 살아 있는 첫 버림을 abort 한 뒤 여는 두 번째 버림의 길이(읽기 켬). */
export const ROUND_SECOND_DECOY_MS = 10_000;
/** WR 진짜 세션: 마지막 결과 뒤 이만큼 조용하면 stop(X-6). 결과가 없으면 NO_RESULT_STOP_MS 뒤 stop. */
export const ROUND_SILENCE_MS = 1_500;
/** WR 차례 7(S 꼴): 첫 final 뒤 이만큼 지나 줄을 비우고 한 문장을 읽는다(X-5). */
export const ROUND_S_SPEAK_AFTER_MS = 2_000;
/** WR 차례 7(S 꼴): 진짜 세션 상한(X-5). */
export const ROUND_S_MAX_MS = 20_000;
/** WR 이 화면에 크게 보이는 낱말(차례 7 만 둘째 낱말까지). */
export const ROUND_WORDS = ["apple", "banana"] as const;
export type RoundWord = (typeof ROUND_WORDS)[number];

/** 살아 있는 첫 버림 뒤의 길(분석 10.18.2): (나) 두 번째 버림 10초 → 진짜, (가) 세션 없이 읽기 → 진짜. */
export type RoundLive = "na" | "ga";
/** 진짜 세션 꼴: 보통(결과 뒤 1.5초 조용하면 stop) · S(멈추지 않고 첫 final 뒤 읽기 → banana, X-5). */
export type RoundReal = "plain" | "s";
/** 탄 길: dead 버림 죽음(W 꼴) · na 첫 버림 살아 있음 → 두 번째 버림 죽음 · na-ga 두 번째도 살아 있음 → 세션 없이 읽기 · ga 첫 버림 살아 있음 → 세션 없이 읽기. */
export type RoundPath = "dead" | "na" | "na-ga" | "ga";

export type RoundPlanStep = {
  step: number;
  /** 앞 차례 end(차례 0 은 무음 읽기 끝) 뒤 이 차례를 시작하기까지 ms. */
  waitMs: number;
  /** 긴 쉼이면 화면에 '준비 중 · 남은 초'를 보인다(그 밖은 '기다려요'). */
  rest: boolean;
  decoyMs: number;
  /** 버림 2초 때(DECOY_SPEAK_AT_MS) 한 문장을 읽는가. */
  speak: boolean;
  live: RoundLive;
  real: RoundReal;
  resetStep: ResetStep;
};

/**
 * 자동 차례 0~8(브리프 fix 7 표 그대로): 0 쉰 뒤 첫 버림 → 살아 있으면 (나) · 1 10초 읽기 · 2 5초 읽기 · 3 3초 읽기 · 4 10초 끔 · 5 10초 읽기 ·
 * 6 10초 끔 · 7 10초 읽기 → 진짜 S 꼴 · 8 45초 쉼 뒤 첫 버림 → 살아 있으면 (가). 차례 0 · 8 의 첫 버림이 죽어 있으면 W10(10초 · 읽기 켬)으로 이어 간다.
 * 차례 1~7 의 버림이 뜻밖에 살아 있으면 (나)로 간다(표에 없는 경우 — 탄 길이 기록에 남는다).
 */
export function roundPlanOf(): RoundPlanStep[] {
  const { short, mid, long } = ROUND_DECOY_MS;
  const step = (
    n: number,
    decoyMs: number,
    speak: boolean,
    more: Partial<RoundPlanStep> = {},
  ): RoundPlanStep => ({
    step: n,
    waitMs: ROUND_GAP_MS,
    rest: false,
    decoyMs,
    speak,
    live: "na",
    real: "plain",
    resetStep: "as-is",
    ...more,
  });
  const rested = {
    waitMs: ROUND_PAUSE_MS,
    rest: true,
    resetStep: "pause-45",
  } as const;
  return [
    step(0, long, true, rested),
    step(1, long, true),
    step(2, mid, true),
    step(3, short, true),
    step(4, long, false),
    step(5, long, true),
    step(6, long, false),
    step(7, long, true, { real: "s" }),
    step(8, long, true, { ...rested, live: "ga" }),
  ];
}

/** 버림 하나가 끝났을 때 다음 할 일: 죽은 버림이면 진짜, 살아 있는 첫 버림은 (나)면 두 번째 버림 · (가)면 세션 없이 읽기, 두 번째도 살아 있으면 세션 없이 읽기. */
export function roundNextOf(
  live: RoundLive,
  decoyIndex: number,
  alive: boolean,
): "real" | "decoy" | "bare" {
  if (!alive) return "real";
  if (decoyIndex === 0 && live === "na") return "decoy";
  return "bare";
}

/** 버림마다 살아 있었는지로 탄 길을 매긴다(첫 버림만 살아 있고 (나)면 두 번째 버림이 열리기 전에도 na). */
export function roundPathOf(
  live: RoundLive,
  alive: readonly boolean[],
): RoundPath {
  if (alive[0] !== true) return "dead";
  if (live === "ga") return "ga";
  return alive[1] === true ? "na-ga" : "na";
}

export type RoundDecoyRow = {
  plannedMs: number | null;
  speak: boolean;
  as: number | null;
  alive: boolean;
  /** 버림 start 호출 → end(없으면 stop · abort 호출) ms. */
  actualMs: number | null;
  /** 버림 안 읽기 시작 · 끝 알림(버림 start 기준 ms). 없으면 null. */
  speakStart: number | null;
  speakEnd: number | null;
};

export type RoundRow = {
  step: number;
  path: RoundPath;
  real: RoundReal;
  decoys: RoundDecoyRow[];
  /** 세션 없이 읽기(길 ga · na-ga): 시작 · 끝 알림과 끝 → 진짜 start ms. 없으면 null. */
  bare: { started: boolean; ended: boolean; endToRealMs: number | null } | null;
  /** 진짜 세션(진짜 start 기준 ms). 진짜가 열리지 않았으면 null. */
  session: {
    as: number | null;
    speechstart: number | null;
    finalLength: number;
    heardLength: number;
    /** 'banana' 를 보이기 전에 final 이 왔는가. */
    apple: boolean;
    /** 차례 7(S 꼴): 'banana' 를 보인 뒤 final 이 왔는가. 보통 꼴이면 null. */
    banana: boolean | null;
    /** 차례 7: 세션 중 읽기 시작 · 끝 알림 · 'banana' 를 보인 때. */
    speakStart: number | null;
    speakEnd: number | null;
    bananaAt: number | null;
  } | null;
};

/** WR 기록 하나의 차례 칸(시도마다의 몫 slots 로 버림 · 진짜를 가른다). WR 이 아니면 null(WR2 는 round2RowOf). */
export function roundRowOf(record: ProbeRecord): RoundRow | null {
  const round = record.round;
  if (round === null || record.strategy !== "WR") return null;
  const of = (attempt: number, pick: (e: ProbeEvent) => boolean) =>
    firstOf(record, attempt, pick);
  const ms = (attempt: number, e: ProbeEvent | undefined) =>
    relMs(record, attempt, e);
  const lineOf = (attempt: number, type: ProbeEventType) =>
    of(attempt, (e) => e.type === type && e.utterance === "line");
  const decoys: RoundDecoyRow[] = [];
  round.slots.forEach((slot, i) => {
    if (slot.role !== "decoy" || record.attempts[i] === undefined) return;
    const end =
      of(i, (e) => e.type === "end") ??
      of(i, (e) => e.type === "stop-call" || e.type === "abort-call");
    decoys.push({
      plannedMs: slot.plannedMs,
      speak: slot.speak,
      as: ms(
        i,
        of(i, (e) => e.type === "audiostart"),
      ),
      alive: of(i, (e) => e.type === "decoy-alive") !== undefined,
      actualMs: ms(i, end),
      speakStart: ms(i, lineOf(i, "speak-start")),
      speakEnd: ms(i, lineOf(i, "speak-end")),
    });
  });
  const r = round.slots.findIndex((s) => s.role === "real");
  const realStart =
    r < 0 ? undefined : (record.attempts[r]?.startCallAt ?? undefined);
  const bareOf = (type: ProbeEventType) =>
    record.events.find((e) => e.type === type && e.utterance === "bare");
  const bareCall = bareOf("speak-call");
  const bareEnd = bareOf("speak-end");
  const bare =
    bareCall === undefined
      ? null
      : {
          started: bareOf("speak-start") !== undefined,
          ended: bareEnd !== undefined,
          endToRealMs:
            bareEnd === undefined || realStart === undefined
              ? null
              : Math.round(realStart - bareEnd.at),
        };
  let session: RoundRow["session"] = null;
  if (realStart !== undefined) {
    const banana = of(r, (e) => e.type === "prompt" && e.code === "banana");
    const finals = record.events.filter(
      (e) => e.attempt === r && e.type === "result" && e.final === true,
    );
    const lastFinal = finals.findLast((e) => e.finalText !== undefined);
    session = {
      as: ms(
        r,
        of(r, (e) => e.type === "audiostart"),
      ),
      speechstart: ms(
        r,
        of(r, (e) => e.type === "speechstart"),
      ),
      finalLength: lastFinal?.finalText?.length ?? 0,
      heardLength: record.attempts[r]?.lastText.length ?? 0,
      apple: finals.some((e) => banana === undefined || e.at < banana.at),
      banana:
        round.real === "s"
          ? banana !== undefined && finals.some((e) => e.at > banana.at)
          : null,
      speakStart: ms(r, lineOf(r, "speak-start")),
      speakEnd: ms(r, lineOf(r, "speak-end")),
      bananaAt: ms(r, banana),
    };
  }
  return {
    step: round.step,
    path: round.path,
    real: round.real,
    decoys,
    bare,
    session,
  };
}

/** 차례 칸 글(표 · 복사 글). */
export function roundCellOf(row: RoundRow): string {
  const decoys = row.decoys
    .map((d) => {
      const length = d.plannedMs === null ? "-" : `${d.plannedMs / 1000}s`;
      const speak =
        d.speakStart === null && d.speakEnd === null
          ? "-"
          : `${cell(d.speakStart)}~${cell(d.speakEnd)}`;
      return `${length}·${d.speak ? "읽기" : "끔"}·${cell(d.as)}·${yesNo(d.alive)}·${cell(d.actualMs)}·${speak}`;
    })
    .join(" → ");
  const bare =
    row.bare === null
      ? ""
      : ` → 세션 없이 읽기 ${yesNo(row.bare.started)}·${yesNo(row.bare.ended)}`;
  const s = row.session;
  const real =
    s === null
      ? "진짜 없음"
      : `진짜 ${cell(s.as)}·${cell(s.speechstart)}·apple ${yesNo(s.apple)}${s.banana === null ? "" : `·banana ${yesNo(s.banana)}`}`;
  return `${row.step}·${row.path} / ${decoys || "-"}${bare} → ${real}`;
}

/** '진짜 살아남 n/m'(X-6): 차례마다 진짜 세션의 apple final 하나(차례 7 은 banana 도)를 센다. autoRun 을 주면 그 라운드만. */
export function roundSurvivalOf(
  records: readonly ProbeRecord[],
  autoRun?: string,
): { n: number; m: number } {
  let n = 0;
  let m = 0;
  for (const record of records) {
    if (autoRun !== undefined && record.autoRun !== autoRun) continue;
    const row = roundRowOf(record);
    if (row === null) continue;
    m += row.real === "s" ? 2 : 1;
    if (row.session?.apple === true) n += 1;
    if (row.session?.banana === true) n += 1;
  }
  return { n, m };
}

/** 로그 · 복사 글의 한 줄. */
export const survivalLineOf = (s: { n: number; m: number }) =>
  `진짜 살아남 ${s.n}/${s.m}`;

/** 라운드 끝 로그 몸: '진짜 살아남 n/m' 한 줄과 차례마다 짧은 줄(차례 · 길 · 버림 값 · 진짜 값 · 멈춤). 들은 글은 넣지 않는다. */
export function roundLogOf(
  records: readonly ProbeRecord[],
  env: ProbeEnv,
  autoRun: string,
  hiddenCount: number,
  stopped: boolean,
): string {
  const survived = roundSurvivalOf(records, autoRun);
  const base = {
    kind: "round" as const,
    autoRun,
    hiddenCount,
    stopped,
    line: survivalLineOf(survived),
    survived,
    env: logEnvOf(env),
  };
  const steps = records
    .filter((r) => r.autoRun === autoRun)
    .map((r) => {
      const row = roundRowOf(r);
      if (row === null) return null;
      return [
        row.step,
        row.path,
        row.decoys.map((d) => [
          d.plannedMs,
          d.speak,
          d.as,
          d.alive,
          d.actualMs,
          d.speakStart,
          d.speakEnd,
        ]),
        row.bare === null ? null : [row.bare.started, row.bare.ended],
        row.session === null
          ? null
          : [
              row.session.as,
              row.session.speechstart,
              row.session.apple,
              row.session.banana,
              row.session.speakStart,
              row.session.speakEnd,
            ],
        r.stopReason,
      ];
    })
    .filter((s) => s !== null);
  const full = JSON.stringify({ ...base, steps });
  return full.length <= LOG_BODY_MAX_CHARS
    ? full
    : JSON.stringify({ ...base, truncated: true });
}

// ---- 자동 W 라운드 2(fix 8, 분석 10.19.5 Z-1~Z-7 · 차례 0~13) ----

/** WR2 의 읽는 문장 셋(기본 빠르기 — 검토 C2 권고). 짧은 말 · 보통 말은 버림 안 · 세션 없이, 긴 문장은 굳음 만들기 차례(9)만. */
export const ROUND2_SENTENCE = {
  short: "Okay.",
  normal: "That is good.",
  long: W_ROUND_SENTENCE,
} as const;
/** 버림 audiostart 뒤 이만큼 지나 소리를 부른다(Z-3). */
export const ROUND2_SOUND_AFTER_AS_MS = 200;
/** 버림 start 뒤 이때까지 audiostart 가 없으면 이때 소리를 부른다. */
export const ROUND2_SOUND_FALLBACK_MS = 1_000;
/** 굳음 만들기(차례 9): 버림 start 뒤 이때 긴 문장을 cancel 없이 부른다. */
export const ROUND2_LONG_AT_MS = 2_000;
/** 소리 끝(읽기 끝 알림 · 띵 재생 끝) 뒤 버림 stop 까지의 여유(Z-4 · Z-5). */
export const ROUND2_SOUND_TAIL_MS = 300;
/** 소리를 부른 뒤 끝을 기다리는 상한. 넘으면 '소리 끝 없음'을 남기고 cancel 뒤 stop 한다(Z-4). 띵은 BEEP_MS 를 더한다. */
export const ROUND2_SOUND_END_WAIT_MS = 3_000;
/** 읽기 앞 cancel 뒤 speaking · pending 을 다시 재기까지(Z-2). 세션 없이 읽기 · 세션 중 읽기는 이 뒤에 부른다. */
export const ROUND2_CANCEL_SETTLE_MS = 300;
/** 버림 end 뒤 speaking 이 거짓이 되기를 기다리는 상한과 간격(Y-3). 거짓이 안 되면 그대로 적고 넘어간다. */
export const ROUND2_SPEAKING_POLL_MS = 300;
export const ROUND2_POLL_STEP_MS = 50;
/** WR2 띵 음량(Z-5). 높이 · 길이는 BEEP_HZ · BEEP_MS. */
export const ROUND2_BEEP_GAIN = 0.1;
/** 차례 12(U16): 세션 중 읽기 끝 알림의 상한(Y-4). 넘으면 끝 알림 없이 'banana' 를 보인다. */
export const ROUND2_S_SPEAK_END_WAIT_MS = 5_000;
/** WR2 버림 하한 셋(5 · 3 · 1.5초). */
export const ROUND2_DECOY_MS = { control: 5_000, short: 3_000, tiny: 1_500 };
/** 메아리 낱말(Z-6): 그 차례에 읽은 문장의 낱말이 결과 글에 들면 메아리로 센다. */
export const ROUND2_ECHO_WORDS = {
  short: ["okay", "ok"],
  normal: ["good"],
  long: ["sea", "blue", "sun", "warm", "today"],
} as const;

export type Round2Sound = "short" | "normal" | "long" | "beep" | "none";
/** 갈래: first 쉰 첫(0 · 13) · control 대조군(1) · short3 3초 짧은 말(2~4) · short15 1.5초(5 · 6) · beep 띵(7 · 8) · stuck 굳음 만들기(9) · recover 복구(10 · 11) · u16(12). */
export type Round2Group =
  | "first"
  | "control"
  | "short3"
  | "short15"
  | "beep"
  | "stuck"
  | "recover"
  | "u16";

export type Round2PlanStep = {
  step: number;
  /** 앞 차례 end(차례 0 은 무음 읽기 끝) 뒤 이 차례를 시작하기까지 ms. */
  waitMs: number;
  /** 긴 쉼이면 화면에 '쉬는 중 · 남은 초'. */
  rest: boolean;
  /** 버림 하한 ms. 0 이면 버림 없이 세션 없이 읽기 → 진짜. */
  decoyMs: number;
  sound: Round2Sound;
  /** 소리를 부르는 때: 'audiostart'(버림 audiostart 0.2초 뒤, 1초까지 없으면 1초) 또는 버림 start 뒤 고정 ms(차례 9). */
  soundAt: "audiostart" | number;
  /** 읽기 앞 cancel(Z-2 — 굳음 만들기 · 띵은 false). */
  cancel: boolean;
  /** 소리 끝 + 300ms 와 하한을 둘 다 채운 뒤 닫는가(차례 9 는 하한에서 바로 stop · 거짓 확인 없음). */
  waitSound: boolean;
  real: RoundReal;
  group: Round2Group;
  resetStep: ResetStep;
};

/** 차례 하나가 가르는 것의 이름(갈래별 줄 · 화면 끝 줄, stuck 은 줄에 넣지 않는다). */
export const ROUND2_GROUP_LABEL: Record<Round2Group, string> = {
  control: "대조군",
  short3: "3초 짧은 말",
  short15: "1.5초",
  beep: "띵",
  recover: "복구",
  first: "쉰 첫",
  stuck: "굳음 만들기",
  u16: "U16",
};
/** 갈래별 줄에 n/m 으로 세는 갈래(차례 순서가 아니라 줄 순서). */
const ROUND2_LINE_GROUPS: readonly Round2Group[] = [
  "control",
  "short3",
  "short15",
  "beep",
  "recover",
  "first",
];

/** 자동 차례 0~13(브리프 fix 8 갱신 절의 표 그대로). 차례 사이 2초, 차례 13 앞만 45초 쉼. */
export function round2PlanOf(): Round2PlanStep[] {
  const { control, short, tiny } = ROUND2_DECOY_MS;
  const step = (
    n: number,
    group: Round2Group,
    decoyMs: number,
    sound: Round2Sound,
    more: Partial<Round2PlanStep> = {},
  ): Round2PlanStep => ({
    step: n,
    waitMs: ROUND_GAP_MS,
    rest: false,
    decoyMs,
    sound,
    soundAt: "audiostart",
    cancel: sound !== "beep",
    waitSound: true,
    real: "plain",
    group,
    resetStep: "as-is",
    ...more,
  });
  return [
    step(0, "first", 0, "normal", { waitMs: 0 }),
    step(1, "control", control, "normal"),
    step(2, "short3", short, "short"),
    step(3, "short3", short, "short"),
    step(4, "short3", short, "short"),
    step(5, "short15", tiny, "short"),
    step(6, "short15", tiny, "short"),
    step(7, "beep", short, "beep"),
    step(8, "beep", short, "beep"),
    step(9, "stuck", short, "long", {
      soundAt: ROUND2_LONG_AT_MS,
      cancel: false,
      waitSound: false,
    }),
    step(10, "recover", short, "short"),
    step(11, "recover", short, "short"),
    step(12, "u16", short, "short", { real: "s" }),
    step(13, "first", 0, "normal", {
      waitMs: ROUND_PAUSE_MS,
      rest: true,
      resetStep: "pause-45",
    }),
  ];
}

/** 읽는 소리의 문장(띵 · 없음은 null). */
export function round2SentenceOf(sound: Round2Sound): string | null {
  return sound === "beep" || sound === "none" ? null : ROUND2_SENTENCE[sound];
}

/** 글에 낱말이 따로 들었는가(대소문자 무시, 낱말 경계, 복수형 -s 도 — apples · bananas, 검토 fix 8 M3). */
export function hasWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word}s?\\b`, "i").test(text);
}

/** 그 소리의 메아리 낱말이 글에 들었는가(띵 · 없음은 거짓). */
export function isEcho(text: string, sound: Round2Sound): boolean {
  if (sound === "beep" || sound === "none") return false;
  return ROUND2_ECHO_WORDS[sound].some((w) => hasWord(text, w));
}

type SpeakState = { speaking: boolean; pending: boolean };

export type Round2Row = {
  step: number;
  group: Round2Group;
  sound: Round2Sound;
  real: RoundReal;
  /** 버림 하한(ms). 버림 없는 차례는 null. */
  decoyMs: number | null;
  /** 소리 앞 cancel: 부를 때와 0.3초 뒤의 speaking · pending. 안 불렀으면 null. */
  cancel: { at: SpeakState; after: SpeakState | null } | null;
  /** 소리(버림 안 또는 세션 없이 읽기): ms 는 버림 start 기준(세션 없이 읽기는 진짜 start 기준이라 음수). */
  soundCall: number | null;
  callState: SpeakState | null;
  soundStart: number | null;
  soundEnd: number | null;
  soundEndMissing: boolean;
  decoy: {
    as: number | null;
    alive: boolean;
    /** stop 전에 저절로 끝났는가(그 차례는 깨끗에서 뺀다). */
    endedEarly: boolean;
    /** 버림 start → end(없으면 stop 호출) ms. */
    actualMs: number | null;
    stopSpeaking: boolean | null;
    gapSpeaking: boolean | null;
    gapWaitMs: number | null;
    echo: number;
  } | null;
  /** 진짜 세션(진짜 start 기준 ms). 진짜가 열리지 않았으면 null. */
  session: {
    as: number | null;
    speechstart: number | null;
    startSpeaking: boolean | null;
    interims: number;
    finals: number;
    heardLength: number;
    finalLength: number;
    /** 'banana' 를 보이기 전 결과(중간 · final)에 'apple' 이 들었는가(Z-6). */
    apple: boolean;
    /** 차례 12: 'banana' 를 보인 뒤 final 글에 'banana' 가 들었는가. 보통 꼴이면 null. */
    banana: boolean | null;
    echo: number;
    /** 차례 12: 세션 중 읽기 앞 cancel · 시작 · 끝 · 끝 없음 · 'banana' 를 보인 때. */
    speakCancel: SpeakState | null;
    speakStart: number | null;
    speakEnd: number | null;
    speakEndMissing: boolean;
    bananaAt: number | null;
  } | null;
  /** 깨끗한 차례: 버림이 죽어 있고(as ≤ 250) 소리가 시작 · 끝나 stop 전에 끝났다(세션 없이 읽기는 시작 · 끝). 굳음 만들기는 늘 거짓. */
  clean: boolean;
};

const stateOf = (e: ProbeEvent | undefined): SpeakState | null =>
  e === undefined
    ? null
    : { speaking: e.speaking === true, pending: e.pending === true };

/** WR2 기록 하나의 차례 칸. WR2 가 아니면 null. */
export function round2RowOf(record: ProbeRecord): Round2Row | null {
  const meta = record.round;
  if (meta === null || record.strategy !== "WR2") return null;
  return soundRowOf(record, meta, meta.sound ?? "none", meta.group ?? "stuck");
}

/** 버림 안 소리(또는 세션 없이 소리) → 진짜 꼴 차례의 칸(WR2 와 A 라운드가 같이 쓴다 — 판정 꼴을 같게). */
function soundRowOf(
  record: ProbeRecord,
  meta: NonNullable<ProbeRecord["round"]>,
  sound: Round2Sound,
  group: Round2Group,
): Round2Row {
  const d = meta.slots.findIndex((s) => s.role === "decoy");
  const r = meta.slots.findIndex((s) => s.role === "real");
  const realStart = r < 0 ? undefined : record.attempts[r]?.startCallAt;
  const inSession = (e: ProbeEvent) =>
    realStart !== undefined && e.attempt === r && e.at >= realStart;
  const beforeReal = (e: ProbeEvent) =>
    realStart === undefined || e.at < realStart;
  // 버림 안 소리는 버림 시도의 line · 띵(굳음 만들기의 끝 알림은 진짜 start 뒤에 올 수 있어 시각으로 거르지 않는다),
  // 세션 없이 읽기는 bare(진짜와 같은 시도 0 이라 진짜 start 앞만)
  const base = d >= 0 ? d : 0;
  const soundUtterance = d >= 0 ? "line" : "bare";
  const pre = record.events.filter(
    (e) => e.attempt === base && (d >= 0 || beforeReal(e)),
  );
  const find = (
    list: readonly ProbeEvent[],
    pick: (e: ProbeEvent) => boolean,
  ) => list.find(pick);
  const ms = (e: ProbeEvent | undefined) =>
    e === undefined ? null : relMs(record, d >= 0 ? d : r, e);
  const beep = sound === "beep";
  const call = beep
    ? find(pre, (e) => e.type === "webaudio-beep" && e.message === "start")
    : find(
        pre,
        (e) => e.type === "speak-call" && e.utterance === soundUtterance,
      );
  const start = beep
    ? call
    : find(
        pre,
        (e) => e.type === "speak-start" && e.utterance === soundUtterance,
      );
  const end = beep
    ? find(pre, (e) => e.type === "webaudio-beep" && e.code === "ended")
    : find(
        pre,
        (e) => e.type === "speak-end" && e.utterance === soundUtterance,
      );
  const missing = beep
    ? find(pre, (e) => e.type === "webaudio-beep" && e.code === "end-missing")
    : find(
        pre,
        (e) => e.type === "speak-end-missing" && e.utterance === soundUtterance,
      );
  const cancelAt = find(
    pre,
    (e) => e.type === "speak-cancel" && e.code === "before-speak",
  );
  const cancelAfter = find(
    pre,
    (e) => e.type === "speak-state" && e.code === "after-cancel",
  );
  const cancel =
    cancelAt === undefined
      ? null
      : {
          at: stateOf(cancelAt) ?? { speaking: false, pending: false },
          after: stateOf(cancelAfter),
        };
  let decoy: Round2Row["decoy"] = null;
  let stopAt: number | null = null;
  if (d >= 0 && record.attempts[d] !== undefined) {
    const own = record.events.filter((e) => e.attempt === d);
    const as = ms(find(own, (e) => e.type === "audiostart"));
    const stop = find(own, (e) => e.type === "stop-call");
    const endEvent = find(own, (e) => e.type === "end");
    // stop 전에 end 가 왔으면 저절로 끝난 버림이다. 소리 끝은 그 end 와 견준다(검토 fix 8 I1)
    const early =
      endEvent !== undefined && (stop === undefined || endEvent.at < stop.at);
    stopAt = early ? endEvent.at : (stop?.at ?? null);
    const ended = endEvent ?? stop;
    const gap = find(own, (e) => e.type === "speak-state" && e.code === "gap");
    decoy = {
      as,
      alive: as !== null && as > DECOY_ALIVE_MS,
      endedEarly: early,
      actualMs: ms(ended),
      stopSpeaking:
        stateOf(find(own, (e) => e.type === "speak-state" && e.code === "stop"))
          ?.speaking ?? null,
      gapSpeaking: stateOf(gap)?.speaking ?? null,
      gapWaitMs:
        gap?.message === undefined ? null : Number.parseInt(gap.message, 10),
      echo: own.filter((e) => e.type === "result" && e.echo === true).length,
    };
  }
  let session: Round2Row["session"] = null;
  if (realStart !== undefined) {
    const own = record.events.filter(inSession);
    const rel = (e: ProbeEvent | undefined) =>
      e === undefined ? null : round(e.at - realStart);
    const banana = find(own, (e) => e.type === "prompt" && e.code === "banana");
    const results = own.filter((e) => e.type === "result");
    const finals = results.filter((e) => e.final === true);
    const lastFinal = finals.findLast((e) => e.finalText !== undefined);
    const line = (type: ProbeEventType) =>
      find(own, (e) => e.type === type && e.utterance === "line");
    session = {
      as: rel(find(own, (e) => e.type === "audiostart")),
      speechstart: rel(find(own, (e) => e.type === "speechstart")),
      // 진짜 start 직전에 남긴 표지라 시각으로 거르지 않는다
      startSpeaking:
        stateOf(
          record.events.find(
            (e) =>
              e.attempt === r && e.type === "speak-state" && e.code === "real",
          ),
        )?.speaking ?? null,
      interims: results.length - finals.length,
      finals: finals.length,
      heardLength: record.attempts[r]?.lastText.length ?? 0,
      finalLength: lastFinal?.finalText?.length ?? 0,
      apple: results.some(
        (e) => e.apple === true && (banana === undefined || e.at < banana.at),
      ),
      banana:
        meta.real === "s"
          ? banana !== undefined &&
            finals.some((e) => e.banana === true && e.at > banana.at)
          : null,
      echo: results.filter((e) => e.echo === true).length,
      speakCancel: stateOf(
        find(
          own,
          (e) => e.type === "speak-cancel" && e.code === "before-speak",
        ),
      ),
      speakStart: rel(line("speak-start")),
      speakEnd: rel(line("speak-end")),
      speakEndMissing: line("speak-end-missing") !== undefined,
      bananaAt: rel(banana),
    };
  }
  const soundClean =
    start !== undefined &&
    end !== undefined &&
    missing === undefined &&
    (stopAt === null || end.at < stopAt);
  const clean =
    group !== "stuck" &&
    soundClean &&
    (decoy === null ? d < 0 : !decoy.alive && !decoy.endedEarly);
  return {
    step: meta.step,
    group,
    sound,
    real: meta.real,
    decoyMs: d >= 0 ? meta.decoyMs : null,
    cancel,
    soundCall: ms(call),
    callState: beep ? null : stateOf(call),
    soundStart: ms(start),
    soundEnd: ms(end),
    soundEndMissing: missing !== undefined,
    decoy,
    session,
    clean,
  };
}

const stateCell = (s: SpeakState | null) =>
  s === null ? "-" : `${yesNo(s.speaking)}·${yesNo(s.pending)}`;

/** WR2 차례 칸 글(표 · 복사 글). */
export function round2CellOf(row: Round2Row): string {
  const cancel =
    row.cancel === null
      ? "cancel 없음"
      : `cancel ${stateCell(row.cancel.at)}(${stateCell(row.cancel.after)})`;
  const soundEnd = row.soundEndMissing ? "끝 없음" : cell(row.soundEnd);
  const sound = `${cancel} · 부름 ${cell(row.soundCall)}(${stateCell(row.callState)}) · 소리 ${cell(row.soundStart)}~${soundEnd}`;
  const dc = row.decoy;
  const decoy =
    dc === null
      ? "세션 없이"
      : `버림 ${(row.decoyMs ?? 0) / 1000}s·${cell(dc.as)}${dc.alive ? "(살아 있음)" : ""}·${cell(dc.actualMs)}${dc.endedEarly ? "(저절로 끝남)" : ""} · stop ${yesNo(dc.stopSpeaking)} · 거짓 확인 ${yesNo(dc.gapSpeaking === null ? null : !dc.gapSpeaking)}(${cell(dc.gapWaitMs)})${dc.echo > 0 ? ` · 버림 메아리 ${dc.echo}` : ""}`;
  const s = row.session;
  const real =
    s === null
      ? "진짜 없음"
      : `진짜 ${cell(s.as)}·${cell(s.speechstart)} · 중간 ${s.interims} · final ${s.finals} · apple ${yesNo(s.apple)}${s.banana === null ? "" : ` · 읽기 ${cell(s.speakStart)}~${s.speakEndMissing ? "끝 없음" : cell(s.speakEnd)} · banana ${yesNo(s.banana)}`}${s.echo > 0 ? ` · 메아리 ${s.echo}` : ""}`;
  return `${row.step}·${ROUND2_GROUP_LABEL[row.group]}·${row.sound} / ${decoy} / ${sound} → ${real} · ${row.clean ? "깨끗" : "뺌"}`;
}

/**
 * 차례 12(U16)의 결과(검토 fix 8 C1, 분석 10.19.5 판정 표): 됨 세션 중 읽기가 시작 · 끝나고 banana final 이 듦 · 안 됨 읽기는 끝났는데 banana
 * final 이 없음 · 읽기 멈춤 세션 중 읽기를 불렀지만 끝 알림이 없음(시작만 했거나 시작도 없음 — 캡처와 겹쳐 멈춘 꼴) · 못 잼 세션 중 읽기를
 * 부르지 못함(진짜가 죽어 apple 결과가 없음).
 */
export type Round2U16 = "됨" | "안 됨" | "읽기 멈춤" | "못 잼";

export type Round2Lines = {
  groups: { group: Round2Group; n: number; m: number }[];
  /** 차례 12 의 결과와 그 세션의 메아리 결과 수. 차례 12 가 없으면 null. */
  u16: Round2U16 | null;
  u16Echo: number;
  /** 복구 갈래(10 · 11): cancel 뒤 읽기 시작 알림이 온 차례 수 / 그 갈래 차례 수(깨끗함과 무관, 검토 fix 8 M4). */
  recoverStarted: { n: number; m: number };
  /** 세는 갈래인데 깨끗하지 않아 뺀 차례. */
  excluded: number[];
};

/** 갈래별 '진짜 살아남'(Z-7 — 깨끗한 차례만): apple 을 들은 진짜 수 / 깨끗한 차례 수. autoRun 을 주면 그 라운드만. */
export function round2LinesOf(
  records: readonly ProbeRecord[],
  autoRun?: string,
): Round2Lines {
  const groups = ROUND2_LINE_GROUPS.map((group) => ({ group, n: 0, m: 0 }));
  const excluded: number[] = [];
  let u16: Round2Lines["u16"] = null;
  let u16Echo = 0;
  const recoverStarted = { n: 0, m: 0 };
  for (const record of records) {
    if (autoRun !== undefined && record.autoRun !== autoRun) continue;
    const row = round2RowOf(record);
    if (row === null) continue;
    if (row.group === "u16") {
      u16 = u16Of(row);
      u16Echo = row.session?.echo ?? 0;
      continue;
    }
    if (row.group === "recover") {
      recoverStarted.m += 1;
      if (row.soundStart !== null) recoverStarted.n += 1;
    }
    const slot = groups.find((g) => g.group === row.group);
    if (slot === undefined) continue;
    if (!row.clean) {
      excluded.push(row.step);
      continue;
    }
    slot.m += 1;
    if (row.session?.apple === true) slot.n += 1;
  }
  return { groups, u16, u16Echo, recoverStarted, excluded };
}

function u16Of(row: Round2Row): Round2U16 {
  const s = row.session;
  // 세션 중 읽기 앞 cancel 표지가 없으면 읽기를 부르지 못한 것(진짜가 apple 결과 없이 멈춤)
  if (s === null || s.speakCancel === null) return "못 잼";
  if (s.speakEndMissing || s.speakEnd === null) return "읽기 멈춤";
  return s.banana === true ? "됨" : "안 됨";
}

/** 갈래별 줄 글: '대조군 1/1 · 3초 짧은 말 3/3 · … · 복구 2/2 · 복구 읽기 시작 2/2 · … · U16 됨(메아리 0) · 뺀 차례 3'. */
export function round2LineOf(lines: Round2Lines): string {
  const parts = lines.groups.flatMap((g) => {
    const part = `${ROUND2_GROUP_LABEL[g.group]} ${g.n}/${g.m}`;
    if (g.group !== "recover") return [part];
    const r = lines.recoverStarted;
    return [part, `복구 읽기 시작 ${r.n}/${r.m}`];
  });
  parts.push(
    lines.u16 === null
      ? "U16 -"
      : lines.u16 === "못 잼"
        ? "U16 못 잼"
        : `U16 ${lines.u16}(메아리 ${lines.u16Echo})`,
  );
  if (lines.excluded.length > 0) {
    parts.push(`뺀 차례 ${lines.excluded.join("·")}`);
  }
  return parts.join(" · ");
}

/** 라운드 2 끝 로그 몸: 갈래별 줄과 차례마다 짧은 줄(차례 · 갈래 · 소리 · 버림 값 · 진짜 값 · 깨끗함 · 멈춤). 들은 글은 넣지 않는다. */
export function round2LogOf(
  records: readonly ProbeRecord[],
  env: ProbeEnv,
  autoRun: string,
  hiddenCount: number,
  stopped: boolean,
): string {
  const lines = round2LinesOf(records, autoRun);
  const base = {
    kind: "round2" as const,
    autoRun,
    hiddenCount,
    stopped,
    line: round2LineOf(lines),
    lines,
    env: logEnvOf(env),
  };
  const steps = records
    .filter((r) => r.autoRun === autoRun)
    .map((r) => {
      const row = round2RowOf(r);
      if (row === null) return null;
      return [
        row.step,
        row.group,
        row.sound,
        row.cancel === null
          ? null
          : [row.cancel.at.speaking, row.cancel.after?.speaking ?? null],
        [row.soundCall, row.soundStart, row.soundEnd, row.soundEndMissing],
        row.decoy === null
          ? null
          : [
              row.decoy.as,
              row.decoy.actualMs,
              row.decoy.endedEarly,
              row.decoy.stopSpeaking,
              row.decoy.gapSpeaking,
              row.decoy.echo,
            ],
        row.session === null
          ? null
          : [
              row.session.as,
              row.session.speechstart,
              row.session.interims,
              row.session.finals,
              row.session.apple,
              row.session.banana,
              row.session.echo,
              row.session.speakStart,
              row.session.speakEnd,
            ],
        row.clean,
        r.stopReason,
      ];
    })
    .filter((s) => s !== null);
  const full = JSON.stringify({ ...base, steps });
  return full.length <= LOG_BODY_MAX_CHARS
    ? full
    : JSON.stringify({ ...base, truncated: true });
}

// ---- 자동 A 라운드(브리프 task-probe 2026-11-10 — 받아 온 소리의 재생 길이 iPad 음성 인식과 부딪히는가) ----

/** 길 · 꼴의 이름(차례 칸 · 요약 줄). */
export const A_VIA_LABEL: Record<AVia, string> = {
  webaudio: "Web Audio",
  element: "오디오 요소",
  synth: "지금 읽기",
};
export const A_SHAPE_LABEL: Record<AShape, string> = {
  first: "쉰 뒤 첫 차례",
  inside: "버림 안",
  bare: "세션 없이",
  "inside-sleep": "버림 안(재움)",
  "bare-sleep": "세션 없이(재움)",
};
/** 버림 세션 없이 소리를 내는 꼴인가 · 소리 뒤 소리 출력을 재우는 꼴인가. */
export const aIsBare = (shape: AShape) =>
  shape === "first" || shape === "bare" || shape === "bare-sleep";
export const aIsSleep = (shape: AShape) =>
  shape === "inside-sleep" || shape === "bare-sleep";
/**
 * '쉰 뒤 첫 차례'를 도는 길: Web Audio(라운드 맨 앞 — 문서를 연 뒤 첫 듣기라 쉼을 기다리지 않는다)와 지금 읽기(앞 듣기 끝 뒤 45초 쉼).
 * 오디오 요소는 돌지 않는다(쉼 45초가 한 번 더 들어 전체가 6분을 넘는다 — 컨트롤러 2026-11-10 'Web Audio 길만 해도 된다').
 */
export const A_FIRST_VIAS: readonly AVia[] = ["webaudio", "synth"];
/** 소리 출력을 재우는 꼴을 도는 길(AudioContext 가 있는 Web Audio 만). */
export const A_SLEEP_VIAS: readonly AVia[] = ["webaudio"];
/** 길마다 도는 꼴(요약 줄 · 셈의 순서). */
export function aShapesOf(via: AVia): AShape[] {
  return [
    ...(A_FIRST_VIAS.includes(via) ? (["first"] as const) : []),
    "inside",
    "bare",
    ...(A_SLEEP_VIAS.includes(via)
      ? (["inside-sleep", "bare-sleep"] as const)
      : []),
  ];
}
/** 형식의 MIME(canPlayType 에 묻는 값)과 시험용 소리 파일(public/dev/probe-audio — 같은 문장 2초 남짓, 세 형식). */
export const A_FORMAT_MIME: Record<AFormat, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  ogg: 'audio/ogg; codecs="opus"',
};
export const A_AUDIO_URL: Record<AFormat, string> = {
  wav: "/dev/probe-audio/line.wav",
  mp3: "/dev/probe-audio/line.mp3",
  ogg: "/dev/probe-audio/line.ogg",
};
/** 소리 파일의 문장이자 읽기 길이 읽는 문장(세 길의 소리 길이를 비슷하게 — 따라 말하게 유도하지 않는 서술문). */
export const A_SENTENCE = W_ROUND_SENTENCE;
/** 길 · 꼴마다 도는 횟수(화면에서 고른다). 기본 3번이 5분 남짓이다(컨트롤러 2026-11-10 '전체 6분 안, 3번으로 내려도 좋다'). */
export const A_COUNTS = [2, 3, 4] as const;
export const A_COUNT_DEFAULT = 3;
/** '쉰 뒤 첫 차례' 앞의 쉼: 앞 듣기 end 뒤 이만큼 지난 뒤에 소리를 낸다(문서의 첫 듣기면 기다리지 않는다). */
export const A_REST_MS = ROUND_PAUSE_MS;
/** 형식 하나를 길마다 재는 횟수(첫 소리까지의 중앙값용). 풀지 못한 형식은 다시 재지 않는다. */
export const A_FORMAT_REPS = 3;
/** A 버림 하한(소리 끝 + 0.3초가 더 늦으면 그때 닫는다 — 기록 8 '하한은 소리 끝 + 0.3초가 정한다'). */
export const A_DECOY_MS = 1_500;
/** A 진짜: 'apple' 결과가 이 안에 없으면 stop(WR2 는 6초 — 라운드를 줄이려고 1초 줄임). */
export const A_NO_RESULT_STOP_MS = 5_000;
/** A 소리 끝을 기다리는 상한(부른 때부터, 시작 알림이 오면 그때부터 다시). 넘으면 '소리 끝 없음'을 남기고 멈춘 뒤 잇는다. */
export const A_SOUND_END_WAIT_MS = 6_000;
/** 길 열기 응답 상한. 누름 밖에서 넘으면 '한 번 더 눌러 주세요'로 간다(iOS 는 누름 밖 speak() 를 사건 없이 버림 — 분석 10.16). */
export const A_OPEN_WAIT_MS = 1_500;
/** 누름 안에서 연 길의 응답 상한. 넘어도 건너뛰지 않고(답 없음으로 적고) 형식 측정으로 가른다 — 다시 누르게 할 길이 없어서 더 기다린다. */
export const A_OPEN_GESTURE_WAIT_MS = 4_000;
/** 형식 측정 한 번의 상한. 넘으면 실패(timeout)로 적는다. */
export const A_MEASURE_WAIT_MS = 4_000;
/** 소리 출력 재우기(suspend)의 답을 기다리는 상한. 넘으면 '답 없음'으로 적고 잇는다. */
export const A_SLEEP_WAIT_MS = 1_000;
/** 읽기 뒤 다시 재생(M6): 한 번의 재생에 답을 기다리는 상한 · 두 소리 사이 · 끝 물음의 답을 기다리는 상한(넘으면 '답 없음'으로 넘어간다). */
export const A_REPLAY_WAIT_MS = 8_000;
export const A_AFTER_GAP_MS = 1_000;
export const A_ASK_WAIT_MS = 60_000;
/** 차례 하나의 어림 길이(어림 시간 표시용 — 차례 사이 2초 + 소리 2초 남짓 + 1초 + 진짜 4초쯤)와 차례 밖(형식 측정 · 다시 재생 · 물음)의 어림. */
export const A_STEP_EST_MS = 9_300;
export const A_EXTRA_EST_MS = 30_000;

export type APlanStep = {
  step: number;
  via: AVia;
  shape: AShape;
  /** 그 길 · 꼴 안 몇 번째(1부터). */
  rep: number;
  /** 앞 차례 end(차례 0 은 길 준비 끝) 뒤 이 차례를 시작하기까지 ms. */
  waitMs: number;
  /** 앞 듣기 end 뒤 적어도 이만큼 쉰 뒤에 시작한다(쉰 뒤 첫 차례만 0 보다 크다 — 문서의 첫 듣기면 기다리지 않는다). */
  restMs: number;
  /** 버림 하한 ms. 버림 안 꼴만 0 보다 크다. */
  decoyMs: number;
  /** 소리 앞 cancel(읽기 길만 — Web Audio · 오디오 요소 길은 speechSynthesis 를 건드리지 않는다). */
  cancel: boolean;
  resetStep: ResetStep;
};

/**
 * 자동 차례. 길마다(Web Audio → 오디오 요소 → 지금 읽기): [쉰 뒤 첫 차례 한 번(A_FIRST_VIAS)] → '버림 안 → 세션 없이'를 count 번 번갈아 →
 * [재우는 꼴 '버림 안(재움) → 세션 없이(재움)'를 count 번(A_SLEEP_VIAS)]. 차례 0 은 Web Audio 의 첫 차례라 문서를 연 뒤 첫 듣기다.
 * '세션 없이' 차례가 늘 '소리를 받았을 듣기' 바로 뒤에 오게 번갈아 돈다.
 */
export function aPlanOf(count: number): APlanStep[] {
  const plan: APlanStep[] = [];
  const add = (via: AVia, shape: AShape, rep: number) => {
    plan.push({
      step: plan.length,
      via,
      shape,
      rep,
      waitMs: plan.length === 0 ? 0 : ROUND_GAP_MS,
      restMs: shape === "first" ? A_REST_MS : 0,
      decoyMs: aIsBare(shape) ? 0 : A_DECOY_MS,
      cancel: via === "synth",
      resetStep: shape === "first" && plan.length > 0 ? "pause-45" : "as-is",
    });
  };
  for (const via of A_VIAS) {
    if (A_FIRST_VIAS.includes(via)) add(via, "first", 1);
    for (let rep = 1; rep <= count; rep++) {
      add(via, "inside", rep);
      add(via, "bare", rep);
    }
    if (!A_SLEEP_VIAS.includes(via)) continue;
    for (let rep = 1; rep <= count; rep++) {
      add(via, "inside-sleep", rep);
      add(via, "bare-sleep", rep);
    }
  }
  return plan;
}

/** 라운드의 어림 시간(분, 반올림 — 화면의 횟수 고르기 옆에 보인다): 차례 + 쉼(차례 0 은 빼고) + 차례 밖. */
export function aEstimateMinutes(count: number): number {
  const plan = aPlanOf(count);
  const rest = plan.slice(1).reduce((sum, s) => sum + s.restMs, 0);
  return Math.round(
    (plan.length * A_STEP_EST_MS + rest + A_EXTRA_EST_MS) / 60_000,
  );
}

/** 형식 측정 한 번: 받기 시작 → 첫 소리 ms(Web Audio 는 받기 · 풀기 ms 도), 재생이 됐는가, 오류 이름. */
export type AMeasure = {
  via: "webaudio" | "element";
  format: AFormat;
  ok: boolean;
  firstSoundMs: number | null;
  fetchMs: number | null;
  decodeMs: number | null;
  error: string | null;
};
/**
 * 길 열기 한 번: 누름 안이었는가 · 결과 · 덧붙임(AudioContext 상태 · 오류 이름) · 까닭(enter 길에 들어감 · wake 재운 소리 출력을 다음
 * 소리 앞에 깨움 · after 읽기 뒤 다시 재생)과 그때 이을 차례(after 는 null).
 */
export type AOpen = {
  via: AVia;
  gesture: boolean;
  result: "ok" | "need-gesture" | "failed";
  detail: string;
  purpose: "enter" | "wake" | "after";
  step: number | null;
};
/**
 * 읽기 뒤 다시 재생 한 번(M6 — speechSynthesis 를 쓴 뒤에도 받아 온 소리가 나는가): 재생이 시작 · 끝났는가, 시작 · 끝 때의
 * AudioContext 상태(오디오 요소는 null), 재생하는 동안 흐른 시간 ms(Web Audio 는 AudioContext.currentTime, 요소는 재생 자리), 오류.
 */
export type AReplay = {
  via: "webaudio" | "element";
  format: AFormat | null;
  started: boolean;
  ended: boolean;
  stateAtStart: string | null;
  stateAtEnd: string | null;
  flowedMs: number | null;
  error: string | null;
};
/** '방금 두 소리가 들렸나요?'의 답(첫 번째 = Web Audio, 두 번째 = 오디오 요소). */
export const A_HEARD = ["both", "first", "second", "none"] as const;
export type AHeard = (typeof A_HEARD)[number];
export const A_HEARD_LABEL: Record<AHeard | "no-answer", string> = {
  both: "둘 다",
  first: "첫 번째만(Web Audio)",
  second: "두 번째만(오디오 요소)",
  none: "둘 다 안 들림",
  "no-answer": "답 없음",
};
/** '듣기가 켜진 동안 소리가 작아졌나요?'의 답(WebKit 236219 — 마이크가 열리면 재생 소리가 작아진다는 보고). */
export const A_VOLUME = ["same", "quieter", "unknown"] as const;
export type AVolume = (typeof A_VOLUME)[number];
export const A_VOLUME_LABEL: Record<AVolume | "no-answer", string> = {
  same: "그대로",
  quieter: "작아짐",
  unknown: "모르겠음",
  "no-answer": "답 없음",
};

/** 라운드가 차례 밖에서 잰 것(기록에 안 들어가는 몫 — 라운드 끝 로그 · 요약 줄에 쓴다). */
export type AReport = {
  /** 라운드를 시작할 때까지 이 쪽에서 speechSynthesis 를 부른 수(0 이어야 깨끗한 측정). */
  synthBefore: number;
  /** '한 번 더 눌러 주세요'를 누른 수(처음 '시작' 누름은 빼고). */
  taps: number;
  canPlay: Record<AFormat, string>;
  opens: AOpen[];
  measures: AMeasure[];
  /** 길마다 차례의 소리로 쓴 형식(읽기 길 · 못 고른 길은 null). */
  played: Record<AVia, AFormat | null>;
  /** 못 열었거나 재생되는 형식이 없어 차례를 건너뛴 길. */
  skipped: AVia[];
  /** 재운 소리 출력을 누름 밖에서 못 깨워(누름이 필요해) 그 뒤로 돌지 않은 재우는 꼴 차례. */
  sleepDropped: number[];
  /** 읽기 뒤 다시 재생(M6)의 기계 기록과 요청자의 답(물음 전이면 null). 읽기 길이 돌지 않았으면 null. */
  after: { plays: AReplay[]; heard: AHeard | "no-answer" | null } | null;
  /** '듣기가 켜진 동안 소리가 작아졌나요?'의 답(물음 전이면 null). */
  volume: AVolume | "no-answer" | null;
};

/** 그 길에서 재생이 된 첫 형식(A_FORMATS 순서). 없으면 null. */
export function aPlayFormatOf(
  measures: readonly AMeasure[],
  via: AVia,
): AFormat | null {
  return (
    A_FORMATS.find((format) =>
      measures.some((m) => m.via === via && m.format === format && m.ok),
    ) ?? null
  );
}

/** 중앙값(반올림, 짝수 개면 가운데 둘의 평균). 비면 null. */
export function medianOf(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid] ?? 0;
  if (sorted.length % 2 === 1) return round(upper);
  return round(((sorted[mid - 1] ?? upper) + upper) / 2);
}

/** 형식 하나의 측정 줄: canPlayType 값 · decodeAudioData 로 풀려 재생됐는가 · 오디오 요소로 재생됐는가 · 첫 소리까지의 중앙값. 안 쟀으면 null. */
export type AFormatRow = {
  format: AFormat;
  canPlay: string;
  decode: boolean | null;
  element: boolean | null;
  webaudioMs: number | null;
  elementMs: number | null;
  /** Web Audio 의 받기 · 풀기 ms 중앙값. */
  fetchMs: number | null;
  decodeMs: number | null;
  errors: string[];
};

export function aFormatRowsOf(report: AReport): AFormatRow[] {
  return A_FORMATS.map((format) => {
    const of = (via: AMeasure["via"]) =>
      report.measures.filter((m) => m.via === via && m.format === format);
    const web = of("webaudio");
    const element = of("element");
    const okOf = (list: readonly AMeasure[]) =>
      list.length === 0 ? null : list.some((m) => m.ok);
    const msOf = (
      list: readonly AMeasure[],
      pick: (m: AMeasure) => number | null,
    ) =>
      medianOf(
        list
          .filter((m) => m.ok)
          .map(pick)
          .filter((v) => v !== null),
      );
    return {
      format,
      canPlay: report.canPlay[format],
      decode: okOf(web),
      element: okOf(element),
      webaudioMs: msOf(web, (m) => m.firstSoundMs),
      elementMs: msOf(element, (m) => m.firstSoundMs),
      fetchMs: msOf(web, (m) => m.fetchMs),
      decodeMs: msOf(web, (m) => m.decodeMs),
      errors: [
        ...new Set(
          [...web, ...element].map((m) => m.error).filter((e) => e !== null),
        ),
      ],
    };
  });
}

/** AR 기록 하나의 차례 칸: WR2 차례 칸의 버림 · 소리 · 진짜 값에 길 · 꼴 · 형식 · 판정 셋을 더한다. */
export type ARow = Omit<Round2Row, "group" | "sound" | "real"> & {
  via: AVia;
  shape: AShape;
  rep: number;
  format: AFormat | null;
  synthCalls: number;
  /** 소리 부름 → 첫 소리(시작 알림) ms. 차례의 소리는 부를 때마다 새로 받아 온다(받기 · 풀기 포함). */
  firstSoundMs: number | null;
  /** 재우는 꼴: 소리 끝 뒤 suspend 를 부른 뒤의 AudioContext 상태(suspended · closed · 답 없음 no-reply)와 걸린 ms. 재우지 않았으면 null. */
  sleep: { state: string; ms: number | null } | null;
  /** 진짜 듣기를 열 때 Web Audio 길의 AudioContext 상태(running · suspended · …, 없으면 none). 진짜가 안 열렸으면 null. */
  audioAtReal: string | null;
  /** 앞 듣기 end → 이 차례의 첫 start 호출 ms(쉰 뒤 첫 차례를 읽을 때 쓴다 — 문서의 첫 듣기면 null). */
  sincePrevEndMs: number | null;
  /** 진짜가 살았는가(WR2 와 같은 판정): 진짜 세션의 결과 글에 'apple' 이 들었다. */
  apple: boolean;
  /** 마이크가 소리를 받았는가(기록 8 의 둘째 기준): speechstart 또는 결과 글이 왔다. */
  heard: boolean;
  /** 진짜의 audiostart 가 살아 있는 띠(250ms 넘음)인가. 말하지 않고 돌렸을 때의 보조 값(AudioContext 가 도는 동안은 맞지 않음 — 기록 8). */
  slow: boolean | null;
};

/** AR 기록 하나의 차례 칸. AR 이 아니면 null. */
export function aRowOf(record: ProbeRecord): ARow | null {
  const meta = record.round;
  const a = meta?.a;
  if (meta === null || a === undefined || record.strategy !== "AR") return null;
  // 문장이 W_ROUND_SENTENCE 라 메아리 낱말은 long, 갈래는 굳음 만들기가 아닌 아무 갈래(깨끗함 판정만 쓴다)
  const base = soundRowOf(record, meta, "long", "control");
  const s = base.session;
  const sleepCall = record.events.find(
    (e) => e.type === "webaudio-sleep" && e.code === "call",
  );
  const sleepReply = record.events.find(
    (e) => e.type === "webaudio-sleep" && e.message === "reply",
  );
  return {
    step: base.step,
    via: a.via,
    shape: a.shape,
    rep: a.rep,
    format: a.format,
    synthCalls: a.synthCalls,
    decoyMs: base.decoyMs,
    cancel: base.cancel,
    soundCall: base.soundCall,
    callState: base.callState,
    soundStart: base.soundStart,
    soundEnd: base.soundEnd,
    soundEndMissing: base.soundEndMissing,
    decoy: base.decoy,
    session: s,
    clean: base.clean,
    firstSoundMs:
      base.soundCall === null || base.soundStart === null
        ? null
        : base.soundStart - base.soundCall,
    sleep:
      sleepCall === undefined
        ? null
        : {
            state: sleepReply?.code ?? "no-reply",
            ms:
              sleepReply === undefined
                ? null
                : round(sleepReply.at - sleepCall.at),
          },
    audioAtReal:
      record.events.find(
        (e) => e.type === "webaudio-start" && e.message === "real",
      )?.code ?? null,
    sincePrevEndMs:
      record.sincePrevEndMs === null ? null : round(record.sincePrevEndMs),
    apple: s?.apple === true,
    heard:
      s !== null &&
      (s.speechstart !== null ||
        s.interims + s.finals > 0 ||
        s.heardLength > 0),
    slow: s === null || s.as === null ? null : s.as > DECOY_ALIVE_MS,
  };
}

/** A 차례 칸 글(표 · 복사 글). */
export function aCellOf(row: ARow): string {
  const head = `${row.step}·${A_VIA_LABEL[row.via]}·${A_SHAPE_LABEL[row.shape]}·${row.format ?? "-"}`;
  const dc = row.decoy;
  const decoy =
    dc === null
      ? `세션 없이${row.shape === "first" ? `(앞 끝 뒤 ${cell(row.sincePrevEndMs)})` : ""}`
      : `버림 ${(row.decoyMs ?? 0) / 1000}s·${cell(dc.as)}${dc.alive ? "(살아 있음)" : ""}·${cell(dc.actualMs)}${dc.endedEarly ? "(저절로 끝남)" : ""}`;
  const sleep =
    row.sleep === null
      ? ""
      : ` · 재움 ${row.sleep.state}(${cell(row.sleep.ms)})`;
  const sound = `부름 ${cell(row.soundCall)} → 첫 소리 ${cell(row.firstSoundMs)} · 소리 ${cell(row.soundStart)}~${row.soundEndMissing ? "끝 없음" : cell(row.soundEnd)}${sleep}`;
  const s = row.session;
  const real =
    s === null
      ? "진짜 없음"
      : `진짜 ${cell(s.as)}·${cell(s.speechstart)}(AudioContext ${row.audioAtReal ?? "-"}) · 중간 ${s.interims} · final ${s.finals} · apple ${yesNo(row.apple)} · 소리 받음 ${yesNo(row.heard)}${s.echo > 0 ? ` · 메아리 ${s.echo}` : ""}`;
  return `${head} / ${decoy} / ${sound} → ${real} · ${row.clean ? "깨끗" : "뺌"} · 읽기 부름 ${row.synthCalls}`;
}

/** audiostart ms 의 분포: 잰 수 · 가장 작은 값 · 중앙값 · 200ms 안(FAST_AUDIOSTART_MS — 앱의 '마이크 안 잡힘' 의심 띠)인 수. */
export type AAsStat = {
  n: number;
  min: number | null;
  median: number | null;
  fast: number;
};
export function aAsStatOf(values: readonly number[]): AAsStat {
  return {
    n: values.length,
    min: values.length === 0 ? null : round(Math.min(...values)),
    median: medianOf(values),
    fast: values.filter((v) => v <= FAST_AUDIOSTART_MS).length,
  };
}

/**
 * 길 · 꼴 하나의 셈: 돈 수 · 깨끗한 수 · 그 가운데 apple 들음 · 소리 받음 · 살아 있는 띠 수 · 첫 소리까지 중앙값, 그리고 돈 차례 모두의
 * 진짜 듣기 · 버리는 듣기 audiostart 분포(버림이 없는 꼴은 null).
 */
export type ACell = {
  via: AVia;
  shape: AShape;
  tries: number;
  clean: number;
  apple: number;
  heard: number;
  slow: number;
  firstSoundMs: number | null;
  realAs: AAsStat;
  decoyAs: AAsStat | null;
};
export type ALines = {
  cells: ACell[];
  /** 길마다 차례의 첫 소리까지(부름 → 시작) 중앙값. */
  firstSound: Record<AVia, number | null>;
  /** 깨끗하지 않아 뺀 차례. */
  excluded: number[];
};

/** 길 · 꼴별 '진짜 살아남'(깨끗한 차례만): apple 을 들은 진짜 수 / 깨끗한 차례 수. autoRun 을 주면 그 라운드만. */
export function aLinesOf(
  records: readonly ProbeRecord[],
  autoRun?: string,
): ALines {
  const cells: ACell[] = A_VIAS.flatMap((via) =>
    aShapesOf(via).map((shape) => ({
      via,
      shape,
      tries: 0,
      clean: 0,
      apple: 0,
      heard: 0,
      slow: 0,
      firstSoundMs: null,
      realAs: aAsStatOf([]),
      decoyAs: aIsBare(shape) ? null : aAsStatOf([]),
    })),
  );
  const empty = () => new Map<ACell, number[]>(cells.map((c) => [c, []]));
  const latency = empty();
  const realAs = empty();
  const decoyAs = empty();
  const excluded: number[] = [];
  for (const record of records) {
    if (autoRun !== undefined && record.autoRun !== autoRun) continue;
    const row = aRowOf(record);
    if (row === null) continue;
    const slot = cells.find((c) => c.via === row.via && c.shape === row.shape);
    if (slot === undefined) continue;
    slot.tries += 1;
    if (row.firstSoundMs !== null) latency.get(slot)?.push(row.firstSoundMs);
    // audiostart 분포는 깨끗함과 무관하게 돈 차례 모두에서 모은다
    const real = row.session?.as ?? null;
    if (real !== null) realAs.get(slot)?.push(real);
    const decoy = row.decoy?.as ?? null;
    if (decoy !== null) decoyAs.get(slot)?.push(decoy);
    if (!row.clean) {
      excluded.push(row.step);
      continue;
    }
    slot.clean += 1;
    if (row.apple) slot.apple += 1;
    if (row.heard) slot.heard += 1;
    if (row.slow === true) slot.slow += 1;
  }
  for (const c of cells) {
    c.firstSoundMs = medianOf(latency.get(c) ?? []);
    c.realAs = aAsStatOf(realAs.get(c) ?? []);
    if (c.decoyAs !== null) c.decoyAs = aAsStatOf(decoyAs.get(c) ?? []);
  }
  const firstSound = Object.fromEntries(
    A_VIAS.map((via) => [
      via,
      medianOf(
        cells.filter((c) => c.via === via).flatMap((c) => latency.get(c) ?? []),
      ),
    ]),
  ) as Record<AVia, number | null>;
  return { cells, firstSound, excluded };
}

/** 길마다 살아난 수 / 깨끗한 차례 수: 'Web Audio 쉰 뒤 첫 차례 1/1 · 버림 안 3/3 · 세션 없이 0/3 · … | 오디오 요소 … | 지금 읽기 …'. 돈 차례가 없는 길은 '안 돎'. */
export function aCellsLineOf(lines: ALines): string {
  return A_VIAS.map((via) => {
    const mine = lines.cells.filter((c) => c.via === via);
    if (mine.every((c) => c.tries === 0)) return `${A_VIA_LABEL[via]} 안 돎`;
    const parts = mine.map(
      (c) =>
        `${A_SHAPE_LABEL[c.shape]} ${c.apple}/${c.clean}${c.heard > c.apple ? `(소리 받음 ${c.heard})` : ""}`,
    );
    return `${A_VIA_LABEL[via]} ${parts.join(" · ")}`;
  }).join(" | ");
}

const asStatCell = (s: AAsStat) =>
  s.n === 0 ? "-" : `${cell(s.min)}·${cell(s.median)}·${s.fast}/${s.n}`;

/**
 * audiostart 분포 줄(길 · 꼴마다 '가장 작은 값·중앙값·200ms 안인 수/잰 수', 진짜 듣기와 버리는 듣기를 따로):
 * 'Web Audio 버림 안 진짜 12·14·3/3 버림 11·13·3/3 · 세션 없이 진짜 … | …'. 앱의 '마이크 안 잡힘' 감지(audiostart 200ms 안 + 조용함)가
 * 새 소리 길에서 살아 있는 듣기를 끊을지를 본다(기록 8 차례 7 · 8 — Web Audio 소리 뒤 진짜 as 14 · 12 인데 들음).
 */
export function aAsLineOf(lines: ALines): string {
  return A_VIAS.flatMap((via) => {
    const mine = lines.cells.filter((c) => c.via === via && c.tries > 0);
    if (mine.length === 0) return [];
    const parts = mine.map(
      (c) =>
        `${A_SHAPE_LABEL[c.shape]} 진짜 ${asStatCell(c.realAs)}${c.decoyAs === null ? "" : ` 버림 ${asStatCell(c.decoyAs)}`}`,
    );
    return [`${A_VIA_LABEL[via]} ${parts.join(" · ")}`];
  }).join(" | ");
}

const msCell = (value: number | null) => (value === null ? "-" : `${value}ms`);

/** 읽기 뒤 다시 재생 줄: '읽기 뒤 재생 Web Audio 시작 예·끝 예(running · 2040ms 흐름) · 오디오 요소 … · 들림: 둘 다'. */
export function aAfterLineOf(after: NonNullable<AReport["after"]>): string {
  const plays = after.plays.map((p) => {
    const label = A_VIA_LABEL[p.via];
    if (p.error === "skipped") return `${label} 안 함`;
    const notes = [
      ...(p.stateAtEnd === null ? [] : [p.stateAtEnd]),
      ...(p.flowedMs === null ? [] : [`${p.flowedMs}ms 흐름`]),
      ...(p.error === null ? [] : [p.error]),
    ];
    return `${label} 시작 ${yesNo(p.started)}·끝 ${yesNo(p.ended)}${notes.length === 0 ? "" : `(${notes.join(" · ")})`}`;
  });
  const heard = after.heard === null ? "묻기 전" : A_HEARD_LABEL[after.heard];
  return `읽기 뒤 재생 ${plays.join(" · ")} · 들림: ${heard}`;
}

/** 재운 소리 출력을 다음 소리 앞에 깨운 기록 줄: '깨우기 누름 밖 3/3'(누름이 필요했으면 '· 누름 필요 1 · 안 돈 재움 차례 5·6'). 깨운 적이 없으면 null. */
export function aWakeLineOf(report: AReport): string | null {
  const wakes = report.opens.filter((o) => o.purpose === "wake" && !o.gesture);
  if (wakes.length === 0) return null;
  const ok = wakes.filter((o) => o.result === "ok").length;
  const blocked = wakes.filter((o) => o.result === "need-gesture").length;
  return [
    `깨우기 누름 밖 ${ok}/${wakes.length}`,
    ...(blocked === 0 ? [] : [`누름 필요 ${blocked}`]),
    ...(report.sleepDropped.length === 0
      ? []
      : [`안 돈 재움 차례 ${report.sleepDropped.join("·")}`]),
  ].join(" · ");
}

/**
 * 요약 한 줄(화면 끝 · 서버 로그): 길마다 살아난 수/깨끗한 차례 수 || audiostart 분포 || 형식마다 재생 여부(decodeAudioData · 오디오 요소 ·
 * canPlayType 값) || 첫 소리까지의 중앙값(차례의 길마다 · 형식 측정의 Web Audio/오디오 요소) || 읽기 뒤 다시 재생 || 시작 전 speechSynthesis
 * 부른 수 · 누른 수 · 깨우기 · 소리 크기 답 · 뺀 차례.
 */
export function aLineOf(lines: ALines, report: AReport): string {
  const rows = aFormatRowsOf(report);
  const formats = rows
    .map(
      (r) =>
        `${r.format} 풀기 ${yesNo(r.decode)}·요소 ${yesNo(r.element)}(${r.canPlay === "" ? "빈 값" : r.canPlay})`,
    )
    .join(" · ");
  const stepMs = A_VIAS.map(
    (via) => `${A_VIA_LABEL[via]} ${msCell(lines.firstSound[via])}`,
  ).join(" · ");
  const formatMs = rows
    .map((r) => `${r.format} ${cell(r.webaudioMs)}/${cell(r.elementMs)}`)
    .join(" · ");
  const wake = aWakeLineOf(report);
  const tail = [
    `시작 전 speechSynthesis ${report.synthBefore}번`,
    `누름 ${1 + report.taps}번`,
    ...(wake === null ? [] : [wake]),
    ...(report.volume === null
      ? []
      : [`듣기 중 소리 크기: ${A_VOLUME_LABEL[report.volume]}`]),
    ...(report.skipped.length === 0
      ? []
      : [`건너뛴 길 ${report.skipped.map((v) => A_VIA_LABEL[v]).join("·")}`]),
    ...(lines.excluded.length === 0
      ? []
      : [`뺀 차례 ${lines.excluded.join("·")}`]),
  ].join(" · ");
  return [
    `살아남 ${aCellsLineOf(lines)}`,
    `audiostart(가장 작은 값·중앙값·200ms 안) ${aAsLineOf(lines)}`,
    `형식 ${formats}`,
    `첫 소리 중앙값 ${stepMs} · 형식 측정(Web Audio/요소) ${formatMs}`,
    ...(report.after === null ? [] : [aAfterLineOf(report.after)]),
    tail,
  ].join(" || ");
}

/** 로그의 cells 줄 순서(칸 이름). */
export const A_CELL_KEYS =
  "via,shape,tries,clean,apple,heard,slow,firstSoundMs,realAs[n,min,median,fast200],decoyAs[n,min,median,fast200]";
/** 로그의 steps 줄 순서(칸 이름). */
export const A_STEP_KEYS =
  "step,via,shape,format,synthCalls,sincePrevEndMs,sound[call,start,end,endMissing],sleep[state,ms],decoy[as,actualMs,endedEarly,echo],real[as,speechstart,interims,finals,apple,heard,echo,audioAtReal],clean,stopReason";

const statArray = (s: AAsStat) => [s.n, s.min, s.median, s.fast];
const opensLog = (report: AReport) =>
  report.opens.map((o) => [
    o.via,
    o.gesture,
    o.result,
    o.detail,
    o.purpose,
    o.step,
  ]);
const samplesLog = (report: AReport) =>
  report.measures.map((m) => [
    m.via,
    m.format,
    m.ok,
    m.firstSoundMs,
    m.fetchMs,
    m.decodeMs,
    m.error,
  ]);

/**
 * A 라운드 끝 로그 몸(요약): 요약 줄 · 길 · 꼴별 수와 audiostart 분포 · 형식 표 · 길 열기(누름 밖 시도가 막혔는지 · 깨우기) · 다시 재생 ·
 * 두 답 · 측정 표본. 들은 글은 넣지 않는다. 상한을 넘으면 측정 표본을 뺀다(형식 로그 roundA-formats 에 있다).
 * 차례 줄은 길어서 따로 보낸다(aStepLogsOf).
 */
export function aLogOf(
  records: readonly ProbeRecord[],
  env: ProbeEnv,
  autoRun: string,
  hiddenCount: number,
  stopped: boolean,
  report: AReport,
): string {
  const lines = aLinesOf(records, autoRun);
  const base = {
    kind: "roundA" as const,
    autoRun,
    hiddenCount,
    stopped,
    line: aLineOf(lines, report),
    synthBefore: report.synthBefore,
    taps: report.taps,
    played: report.played,
    skipped: report.skipped,
    sleepDropped: report.sleepDropped,
    opens: opensLog(report),
    after: report.after,
    volume: report.volume,
    cellKeys: A_CELL_KEYS,
    cells: lines.cells.map((c) => [
      c.via,
      c.shape,
      c.tries,
      c.clean,
      c.apple,
      c.heard,
      c.slow,
      c.firstSoundMs,
      statArray(c.realAs),
      c.decoyAs === null ? null : statArray(c.decoyAs),
    ]),
    excluded: lines.excluded,
    formats: aFormatRowsOf(report),
    env: logEnvOf(env),
  };
  const full = JSON.stringify({ ...base, samples: samplesLog(report) });
  if (full.length <= LOG_BODY_MAX_CHARS) return full;
  const lean = JSON.stringify(base);
  return lean.length <= LOG_BODY_MAX_CHARS
    ? lean
    : JSON.stringify({ ...base, opens: [], truncated: true });
}

/** 차례 줄 로그 한 몸에 담는 차례 수(한 몸이 상한 안에 들게 나눈다). */
export const A_STEP_LOG_CHUNK = 20;

/**
 * A 라운드 끝의 차례 줄 로그 몸들(kind roundA-steps, part 몇 번째 / 모두 몇): 차례마다 짧은 줄(A_STEP_KEYS 순서). 들은 글은 넣지 않는다.
 * 차례 칸 전문은 기록마다의 로그 row.roundA 에도 있다.
 */
export function aStepLogsOf(
  records: readonly ProbeRecord[],
  autoRun: string,
): string[] {
  const steps = records
    .filter((r) => r.autoRun === autoRun)
    .map((r) => {
      const row = aRowOf(r);
      if (row === null) return null;
      return [
        row.step,
        row.via,
        row.shape,
        row.format,
        row.synthCalls,
        row.sincePrevEndMs,
        [row.soundCall, row.soundStart, row.soundEnd, row.soundEndMissing],
        row.sleep === null ? null : [row.sleep.state, row.sleep.ms],
        row.decoy === null
          ? null
          : [
              row.decoy.as,
              row.decoy.actualMs,
              row.decoy.endedEarly,
              row.decoy.echo,
            ],
        row.session === null
          ? null
          : [
              row.session.as,
              row.session.speechstart,
              row.session.interims,
              row.session.finals,
              row.apple,
              row.heard,
              row.session.echo,
              row.audioAtReal,
            ],
        row.clean,
        r.stopReason,
      ];
    })
    .filter((s) => s !== null);
  const parts = Math.ceil(steps.length / A_STEP_LOG_CHUNK);
  return Array.from({ length: parts }, (_, i) =>
    JSON.stringify({
      kind: "roundA-steps" as const,
      autoRun,
      part: i + 1,
      parts,
      stepKeys: A_STEP_KEYS,
      steps: steps.slice(i * A_STEP_LOG_CHUNK, (i + 1) * A_STEP_LOG_CHUNK),
    }),
  );
}

/** 길 하나의 형식 측정이 끝날 때마다 보내는 로그 몸(라운드를 끝까지 못 돌아도 형식 표가 남게): 형식 표 · 길 열기 · 측정 표본. */
export function aFormatLogOf(
  env: ProbeEnv,
  autoRun: string,
  report: AReport,
): string {
  const base = {
    kind: "roundA-formats" as const,
    autoRun,
    synthBefore: report.synthBefore,
    played: report.played,
    opens: opensLog(report),
    formats: aFormatRowsOf(report),
    env: logEnvOf(env),
  };
  const full = JSON.stringify({ ...base, samples: samplesLog(report) });
  return full.length <= LOG_BODY_MAX_CHARS
    ? full
    : JSON.stringify({ ...base, truncated: true });
}

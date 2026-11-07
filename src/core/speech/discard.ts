// 버리는 듣기 차례 기계(iPad 버리는 듣기 spec 설계 1 · 분석 10.20.4 F1~F12 · plan 접점 표 '기계' · 정한 것 4).
// DB · 시계 · 브라우저 없는 순수 함수다. 입력은 사건과 now 이고 출력은 다음 상태 · 효과 · 깨울 시각이다(listen.ts 의 startListen ·
// stepListen 꼴). 효과는 음성 접점을 감싸는 층(discard-layer)이 실행한다. 진짜 안의 일(끝 규칙 · 감시 · deaf)은 지금처럼 stepListen 이 맡고,
// 이 기계는 진짜를 언제 여는지 · 읽기를 언제 흘리는지 · 버림을 언제 여닫는지만 정한다.
//
// 시점 숫자는 없다. 모두 DiscardTimes 에서 읽는다(층이 speech.discard_* 다섯과 speech.max_listen_seconds · speech.watchdog_extra_seconds 로
// 만든다, spec 설계 4 '남은 시점 값'). 상태 이름(대기 · 버림 확인 · 버림 · 살아 있는 버림 · 닫는 중 · 간격 · 버림부터 · 진짜)과 갈래(rest ·
// discard · live · reopen)는 spec 설계 1 표 그대로다.
//
// 층과의 약속(plan 접점 표의 입력을 이렇게 보낸다):
// - unlock 은 첫 누름 처리 안에서 잠금 풀기(무음 읽기) 뒤, 그 누름의 press 보다 먼저 보낸다. 그 전에는 어떤 start 효과도 내지 않는다(I-4).
// - synth 는 speechSynthesis.speaking 을 읽은 값이다. tick · press 앞에 보낸다(기계는 마지막 값을 쓴다).
// - speak-request 는 가로챈 읽기 하나다. speak-release 를 받은 뒤에만 실제로 읽고, speak-drop 이면 읽지 않고 끊김으로 돌려준다.
//   need-sound 로 부른 짧은 말 · 들려줄 말은 sound 'short' · 'word' 로 보내고, 끝까지 읽은 뒤 sound-end 를 보낸다.
// - 버림 사건(discard-*)은 discard-start 효과의 번호를 싣는다. 번호가 다르면 버린다(listen.ts 의 recognizer 번호와 같은 뜻).
// - real-end 는 진짜 듣기의 결과 종류다. interrupted 이면 why(hidden · leave · check)를 싣는다. 결과 종류만으로는 소리 · 회복을 걸지 않는다.
//   real-end 는 진짜가 끝난 그 걸음에, 화면에 결과를 넘기기 전에 보낸다. 진짜 동안 온 again 은 버리므로(stepDiscardFlow 의 again 갈래)
//   화면이 결과를 보고 보낸 again 이 앞서 도착하면 짧은 말이 나오지 않는다(묶음 1 fix 1 재검토 N-1 — 2-나 시험이 순서를 단언한다).
// - again 은 화면이 다시 말할 차례(못 들었어요 안내 · 다시 말하기 누름)를 보일 때 보낸다. 회복은 deaf 로 끝난 진짜 뒤 화면이 보내는
//   press(auto)다. 넘김 · 건너뜀(speech.deaf_skip_after 닿음 · 말소리 없음 넘김 · 따라 말하기 건너뜀)에는 둘 다 보내지 않는다(I-1).
// - 누름 뒤에 온 읽기는 흘리고 소리 끝 알림을 다시 기다린다. 틀은 그 읽기 뒤에도 sound-end 를 보낸다(안 오면 안전 상한까지 연다, M-10).
// - 버림 안 첫 '들려주지 못함'은 다음 읽기에 맡긴다. 기계가 부른 소리(need-sound — again · 걸린 누름 · 회복)가 들려주지 못함이면
//   화면은 그 소리를 다시 보내지 않으므로 다음 읽기는 기계가 부른다: 누름이 없어도 cancel-speaking 뒤 need-sound 를 한 번 더 낸다(그
//   걸음). 화면이 보낸 읽기가 들려주지 못함이면 내지 않고, 그 뒤 누름 걸음에 need-sound 를 처음 낸다(cancel 없음). 층은 다른 need-sound
//   와 같게 읽기 하나와 sound-end 로 답한다. 그 읽기도 들려주지 못하면 살아 있는 버림으로 닫는다(묶음 1 fix 2 · fix 3 · 층 검토 2-나 6절).

import type { SpeechSettings } from "@/core/speech/listen";

// ── 기록 칸 값(plan 접점 표 'client_listen dc' · src/lib/speech/types.ts 의 같은 이름 목록과 같아야 한다 — 시험이 맞댐) ──

/** 진짜 앞 버림의 갈래: rest(F1 쉰 뒤) · discard(F2) · live(F3) · reopen('버림부터'에서 다시 연 버림). */
export const DISCARD_BRANCHES = ["rest", "discard", "live", "reopen"] as const;
export type DiscardBranch = (typeof DISCARD_BRANCHES)[number];
/** 이 진짜 앞 버림이 닫힌 까닭. */
export const DISCARD_END_WHYS = [
  "sound",
  "self_end",
  "cap",
  "not_played",
  "live",
] as const;
export type DiscardEndWhy = (typeof DISCARD_END_WHYS)[number];
/** reopen 이면 다시 열게 한 앞 닫힘의 까닭. check 는 마이크 확인, no_mic 은 '마이크를 쓸 수 없음'으로 끝난 진짜(M-5). */
export const DISCARD_REOPEN_WHYS = [
  "self_end",
  "cap",
  "hidden",
  "leave",
  "check",
  "no_mic",
] as const;
export type DiscardReopenWhy = (typeof DISCARD_REOPEN_WHYS)[number];
/** 버림 안에서 낸 소리 종류(마지막 소리). cut 은 읽는 중 끊긴 읽기(대개 누름 — 화면이 누름 없이 끊은 때도 같은 값, 묶음 2-나 검토 M-3), none 은 소리 없음. */
export const DISCARD_SOUND_KINDS = [
  "teacher",
  "word",
  "short",
  "cut",
  "none",
] as const;
export type DiscardSoundKind = (typeof DISCARD_SOUND_KINDS)[number];
/** 층이 읽기마다 알리는 소리 종류(speak-request 의 sound). 없으면 teacher. */
export type DiscardReadKind = Extract<
  DiscardSoundKind,
  "teacher" | "word" | "short"
>;

/** 진짜 듣기 요약의 '그 앞 버림' 칸(dc). 모두 선택 칸이고 글 칸이 없다. ms 는 정수 밀리초다. */
export type DiscardFlowNote = {
  g?: DiscardBranch;
  sr?: boolean;
  why?: DiscardEndWhy;
  rw?: DiscardReopenWhy;
  as?: number;
  d?: number;
  s0?: number;
  s1?: number;
  w?: number;
  sk?: DiscardSoundKind;
  np?: number;
  n?: number;
};

// ── 시간 묶음(plan 정한 것 4) ──

/** 기계가 쓰는 시점 값(ms). 층이 두 설정에서 만든다(discardTimesOf). */
export type DiscardTimes = Readonly<{
  /** speech.discard_rest_ms — 마지막 세션 끝에서 이만큼 지나면 버림 없이 읽고 누를 때 진짜를 연다(F1). */
  restMs: number;
  /** speech.discard_live_as_ms — 버림 start 뒤 이 안에 audiostart 가 오면 죽은 버림(F3). */
  liveAsMs: number;
  /** speech.discard_min_ms — 버림을 닫는 하한(버림 start 기준, F5). */
  minMs: number;
  /** speech.discard_after_sound_ms — 소리 끝에서 stop 까지 · 굳은 speaking 을 기다리는 상한(F5 · F9). */
  afterSoundMs: number;
  /** speech.discard_gap_ms — 버림 end 와 마지막 소리 끝에서 진짜 start 까지의 최소 간격(F6). */
  gapMs: number;
  /** speech.watchdog_extra_seconds(ms) — stop 뒤 end 를 기다리는 상한. */
  endWaitMs: number;
  /** speech.max_listen_seconds + speech.watchdog_extra_seconds(ms) — 버림의 안전 상한(M-4). */
  capMs: number;
}>;

/** 버리는 듣기 설정 다섯(묶음 0 의 DiscardSettings 가 이 꼴에 맞춘다). */
export interface DiscardTimingSettings {
  restMs: number;
  liveAsMs: number;
  minMs: number;
  afterSoundMs: number;
  gapMs: number;
}

/** 두 설정에서 기계의 시간 묶음을 만든다(spec 설계 4 '남은 시점 값은 같은 뜻의 기존 키'). */
export function discardTimesOf(
  discard: DiscardTimingSettings,
  speech: Pick<SpeechSettings, "maxListenMs" | "watchdogExtraMs">,
): DiscardTimes {
  return {
    restMs: discard.restMs,
    liveAsMs: discard.liveAsMs,
    minMs: discard.minMs,
    afterSoundMs: discard.afterSoundMs,
    gapMs: discard.gapMs,
    endWaitMs: speech.watchdogExtraMs,
    capMs: speech.maxListenMs + speech.watchdogExtraMs,
  };
}

// ── 입력 · 효과 · 상태 ──

/** 진짜 듣기의 결과 종류(ListenOutcome 을 층이 옮긴다). error 는 다시 듣는 오류, unavailable 은 '마이크를 쓸 수 없음'. */
export type RealEndKind =
  | "result"
  | "no-result"
  | "error"
  | "stalled"
  | "deaf"
  | "unavailable"
  | "interrupted";

export type DiscardFlowInput =
  | { type: "unlock" }
  | { type: "speak-request"; id: number; sound?: DiscardReadKind }
  | { type: "speak-start"; id: number }
  /** heard 는 실제로 들려줬는가(끝 알림 · 읽기 감시 상한으로 끝난 발화는 참, '들려주지 못함'은 거짓). */
  | { type: "speak-end"; id: number; heard: boolean }
  /** 읽는 중인 읽기가 끊김(cancel). started 는 층이 본 시작 알림 여부다(기계가 본 것과 합친다). */
  | { type: "cut"; started: boolean }
  /** 틀 · 따라 말하기 조각의 '소리 끝' 알림(설계 2). 여러 번 와도 하나다. */
  | { type: "sound-end" }
  /** 서버 차례 기다림(턴을 보낸 뒤 끝 줄 전). 켜진 동안 버림의 안전 상한을 세지 않는다(N-1). */
  | { type: "server-wait"; on: boolean }
  /** 말하기 누름. auto 는 회복(F10)에서 화면이 누름 없이 부른 것(앞 진짜가 deaf 이면 회복 표시를 켠다). */
  | { type: "press"; auto?: boolean }
  /** 화면이 다시 말할 차례를 보임(못 들었어요 안내 · 다시 말하기 누름) — 버림 안 짧은 말 · 들려줄 말을 한 번 부른다(I-1). */
  | { type: "again" }
  | { type: "dont-know" }
  | { type: "discard-audio"; discard: number }
  | { type: "discard-result"; discard: number }
  | { type: "discard-end"; discard: number }
  | { type: "discard-error"; discard: number; code: string }
  | { type: "real-end"; kind: RealEndKind; why?: DiscardReopenWhy }
  | { type: "hidden" }
  | { type: "visible" }
  /** 대화가 쉬는 안내 · 막힘 · 마무리 · 홈으로 감(정리 따라 말하기는 떠남이 아님). */
  | { type: "leave" }
  /** 마이크 확인이 열린 세션을 닫음(음성 접점이 닫는다). */
  | { type: "check" }
  | { type: "synth"; speaking: boolean }
  | { type: "tick" };

/** 화면이 받는 기다림 상태(층 subscribe 의 view). */
export type DiscardView = Readonly<{
  /** 걸어 둔 누름이 있다 — '준비 중이에요'와 기다림 표시. */
  waiting: boolean;
  /** 기다린 누름 · 회복으로 진짜가 열렸다 — '말해 보세요'(소리가 들어오면 화면이 지움). */
  sayNow: boolean;
  /** deaf 로 끝난 진짜 뒤 auto 누름이 걸린 동안(다음 진짜 전) — '잠깐만요, 마이크를 다시 켤게요'. */
  recovering: boolean;
  /** 대기에서 간격이 찼다 — 지금 누르면 바로 진짜를 연다(따라 말하기 흐림을 거둠). */
  canListen: boolean;
  /**
   * '버림부터'에서 쉬는 중(읽기 · 보류 없음) — 따라 말하기는 그 낱말 · 줄의 들려줄 말을 한 번 더 읽는다. 그 읽기가 버림을 열고,
   * 소리 끝 + 간격 뒤 canListen 이 참이 된다(설계 2 '다시 듣기 · 힌트 듣기 · 말풍선 누르기' 행 · M-5, I-2).
   */
  reopenIdle: boolean;
}>;

export type DiscardFlowEffect =
  | { type: "discard-start"; discard: number }
  | { type: "discard-stop"; discard: number }
  | { type: "real-start" }
  | { type: "speak-release"; id: number }
  | { type: "speak-drop"; id: number }
  | { type: "cancel-speaking" }
  /** 버림 안 소리가 필요하다(F4 (2)) — again 은 다시 말할 차례의 짧은 말 · 들려줄 말, mic 은 회복의 짧은 말. */
  | { type: "need-sound"; kind: "again" | "mic" }
  /** 걸어 둔 누름을 거둠(숨김 · 떠남 · 마이크 확인). 층은 그 손잡이를 끊김으로 끝낸다. */
  | { type: "press-drop"; reason: "hidden" | "leave" | "check" }
  | { type: "view"; view: DiscardView }
  /** 진짜 start 바로 앞의 '그 앞 버림' 칸(층이 discard-note 사건으로 남긴다). */
  | { type: "note"; dc: DiscardFlowNote };

/**
 * 상태 이름(spec 설계 1): rest 대기 · probe 버림 확인 · dead 버림 · closing 닫는 중(살아 있는 버림의 닫힘도 여기, closeNext live) ·
 * gap 간격 · reopen 버림부터 · real 진짜.
 */
export type DiscardPhase =
  | "rest"
  | "probe"
  | "dead"
  | "closing"
  | "gap"
  | "reopen"
  | "real";

type Reading = Readonly<{
  id: number;
  sound: DiscardReadKind;
  started: boolean;
  /** 흘린 때 열려 있던 버림 번호(세션 없이 읽었으면 없음). */
  discard: number | undefined;
}>;

type HeldReading = Readonly<{ id: number; sound: DiscardReadKind }>;

/** 지금 · 마지막 버림 하나의 기록(시각은 now 와 같은 기준의 절대값). */
export type DiscardRecord = Readonly<{
  id: number;
  /** discard 는 진짜 끝(F2), reopen 은 '버림부터'에서 연 버림. */
  via: "discard" | "reopen";
  rw: DiscardReopenWhy | undefined;
  startAt: number;
  audioAt: number | undefined;
  stopAt: number | undefined;
  endAt: number | undefined;
  /** 이 버림 안에서 흘린 읽기가 있었나. */
  called: boolean;
  /** 이 버림 안에서 들려준 소리가 있었나(시작 알림 뒤 끊긴 읽기 포함). */
  heard: boolean;
  soundStartAt: number | undefined;
  soundEndAt: number | undefined;
  sk: DiscardSoundKind | undefined;
  /** 들려주지 못한 읽기 수. */
  np: number;
  /** 결과 사건 수(글 없음). */
  n: number;
  /** 소리 끝 알림을 받았나(그 뒤 새 읽기 요청이 오면 거둔다). */
  notified: boolean;
  /** 이 버림에서 need-sound 를 냈나. */
  asked: boolean;
  /** 마지막 need-sound 를 낸 때의 np(그 뒤 np 가 늘면 부른 소리가 들려주지 못함으로 끝난 것이다). */
  askNp: number;
  /** '잘 모르겠어요'로 그 턴을 보냈나 — 그 뒤에는 부른 소리가 들려주지 못함이어도 다시 부르지 않는다(fix 3 재검토 N-5). */
  noReask: boolean;
  why: DiscardEndWhy | undefined;
}>;

type CloseNext =
  | { to: "gap" }
  | { to: "live" }
  | { to: "reopen"; why: DiscardReopenWhy };

export type DiscardFlowState = Readonly<{
  times: DiscardTimes;
  phase: DiscardPhase;
  unlocked: boolean;
  hidden: boolean;
  /** 마지막으로 받은 speechSynthesis.speaking. */
  speaking: boolean;
  discard: DiscardRecord | undefined;
  /** 연 버림 수(버림 번호). */
  discards: number;
  /** 대기의 갈래(rest 는 쪽 첫 · 쉰 뒤). 쉼 넘음은 쓸 때 시각으로 다시 가른다. */
  waitBranch: "rest" | "discard" | "live";
  reopenWhy: DiscardReopenWhy | undefined;
  closeNext: CloseNext | undefined;
  /** 간격을 재는 처음(버림 end 또는 end 상한). */
  gapFrom: number | undefined;
  inflight: readonly Reading[];
  held: readonly HeldReading[];
  lastSessionEndAt: number | undefined;
  lastDiscardEndAt: number | undefined;
  lastSoundEndAt: number | undefined;
  press: Readonly<{ at: number; auto: boolean }> | undefined;
  /** 화면이 보낸 다시 말할 차례(again)를 아직 소리로 부르지 않았다. */
  againPending: boolean;
  /** 마지막 진짜가 deaf 로 끝났다(그 뒤 auto 누름이 회복을 켠다). */
  lastRealDeaf: boolean;
  recovering: boolean;
  realWaited: boolean;
  /** discard · live 갈래 대기나 저절로 끝난 죽은 버림에서 세션 없이 읽은 것이 있나(dc.sr). 새 버림 · 진짜에서 지운다. */
  betweenRead: boolean;
  serverWaiting: boolean;
  serverWaitEndAt: number | undefined;
  /** 굳은 speaking 에 cancel 을 부른 때(그 뒤 afterSoundMs 를 기다린다). */
  stuckSince: number | undefined;
  view: DiscardView;
}>;

export type DiscardStep = {
  state: DiscardFlowState;
  effects: DiscardFlowEffect[];
  /** 가장 이른 기한(그때 tick 을 보낸다). 없으면 사건만 기다린다. */
  wakeAt: number | undefined;
};

/** 같은 버림 안 '들려주지 못함'이 이만큼이면 살아 있는 버림으로 본다(첫째는 굳음, 둘째에 닫음 — spec 설계 1 · 우려 7 (사)). */
const NOT_PLAYED_LIVE_COUNT = 2;
/** 한 걸음 안에서 상태를 넘기는 횟수 상한(정상 길은 넷 이하다 — 닿으면 기계 결함이라 던진다, M-2). */
const ADVANCE_LIMIT = 16;

// ── 만들기 ──

/** 쪽을 연 때의 기계(대기 · 갈래 rest, 세션 없음). 시점 값이 수가 아니거나 음수이면 던진다. */
export function startDiscardFlow(times: DiscardTimes): DiscardStep {
  for (const [key, value] of Object.entries(times)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`버리는 듣기 시점 값이 틀렸다: ${key}=${value}`);
    }
  }
  const view: DiscardView = {
    waiting: false,
    sayNow: false,
    recovering: false,
    canListen: true,
    reopenIdle: false,
  };
  const state: DiscardFlowState = {
    times,
    phase: "rest",
    unlocked: false,
    hidden: false,
    speaking: false,
    discard: undefined,
    discards: 0,
    waitBranch: "rest",
    reopenWhy: undefined,
    closeNext: undefined,
    gapFrom: undefined,
    inflight: [],
    held: [],
    lastSessionEndAt: undefined,
    lastDiscardEndAt: undefined,
    lastSoundEndAt: undefined,
    press: undefined,
    againPending: false,
    lastRealDeaf: false,
    recovering: false,
    realWaited: false,
    betweenRead: false,
    serverWaiting: false,
    serverWaitEndAt: undefined,
    stuckSince: undefined,
    view,
  };
  return { state, effects: [{ type: "view", view }], wakeAt: undefined };
}

// ── 한 걸음 ──

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
type Draft = Omit<
  Mutable<DiscardFlowState>,
  "discard" | "inflight" | "held"
> & {
  discard: Mutable<DiscardRecord> | undefined;
  inflight: Reading[];
  held: HeldReading[];
};

/** 기계 한 걸음. now 는 줄지 않는 시각(ms)이다. */
export function stepDiscardFlow(
  state: DiscardFlowState,
  input: DiscardFlowInput,
  now: number,
): DiscardStep {
  const d: Draft = {
    ...state,
    discard: state.discard ? { ...state.discard } : undefined,
    inflight: [...state.inflight],
    held: [...state.held],
  };
  const fx: DiscardFlowEffect[] = [];
  onInput(d, input, now, fx);
  for (let moves = 0; advanceOnce(d, now, fx); moves++) {
    if (moves + 1 >= ADVANCE_LIMIT) {
      throw new Error(
        `버리는 듣기 기계가 한 걸음에 상태를 ${ADVANCE_LIMIT}번 넘겼다(${input.type} → ${d.phase})`,
      );
    }
  }
  const view = viewOf(d, now);
  if (!sameView(view, d.view)) {
    fx.push({ type: "view", view });
    d.view = view;
  }
  return { state: d, effects: fx, wakeAt: wakeOf(d, now) };
}

function onInput(
  d: Draft,
  input: DiscardFlowInput,
  now: number,
  fx: DiscardFlowEffect[],
): void {
  switch (input.type) {
    case "unlock":
      d.unlocked = true;
      return;
    case "synth":
      d.speaking = input.speaking;
      return;
    case "tick":
      return;
    case "server-wait":
      d.serverWaiting = input.on;
      if (!input.on) d.serverWaitEndAt = now;
      return;
    case "speak-request":
      onSpeakRequest(d, input.id, input.sound ?? "teacher", now, fx);
      return;
    case "speak-start":
      onSpeakStart(d, input.id, now);
      return;
    case "speak-end":
      onSpeakEnd(d, input.id, input.heard, now, fx);
      return;
    case "cut":
      cutReadings(d, now, input.started);
      return;
    case "sound-end":
      if (d.discard && (d.phase === "probe" || d.phase === "dead")) {
        d.discard.notified = true;
      }
      return;
    case "press":
      onPress(d, input.auto === true, now, fx);
      return;
    case "again":
      if (d.phase !== "real") d.againPending = true;
      return;
    case "dont-know":
      // 걸린 누름 · 회복 · 다시 말할 차례를 거두고 그 턴을 보낸다(버림은 그대로 다음 소리를 받는다).
      d.press = undefined;
      d.recovering = false;
      d.againPending = false;
      if (d.discard) d.discard.noReask = true;
      return;
    case "discard-audio":
      if (isCurrent(d, input.discard) && d.discard) {
        d.discard.audioAt ??= now;
      }
      return;
    case "discard-result":
      if (isCurrent(d, input.discard) && d.discard) d.discard.n += 1;
      return;
    case "discard-error":
      // 오류 뒤에는 end 가 온다. 버림 오류는 아이 셈 · 기록 어디에도 넣지 않는다(FR-13).
      return;
    case "discard-end":
      onDiscardEnd(d, input.discard, now);
      return;
    case "real-end":
      onRealEnd(d, input.kind, input.why, now, fx);
      return;
    case "hidden":
      d.hidden = true;
      closeFor(d, now, fx, "hidden", false);
      return;
    case "visible":
      d.hidden = false;
      return;
    case "leave":
      closeFor(d, now, fx, "leave", true);
      return;
    case "check":
      closeFor(d, now, fx, "check", false);
      return;
  }
}

function isCurrent(d: Draft, discard: number): boolean {
  return (
    d.discard !== undefined &&
    d.discard.id === discard &&
    d.discard.endAt === undefined
  );
}

/** 이 버림이 아직 열려 있나(stop · 숨김으로 닫는 중이 아니고 end 도 없음). */
function discardOpen(d: Draft): boolean {
  return (
    (d.phase === "probe" || d.phase === "dead") &&
    d.discard !== undefined &&
    d.discard.endAt === undefined
  );
}

// ── 읽기 ──

function onSpeakRequest(
  d: Draft,
  id: number,
  sound: DiscardReadKind,
  now: number,
  fx: DiscardFlowEffect[],
): void {
  // 소리 끝 알림 뒤 새 읽기가 오면 소리가 더 있다(다시 듣기 · 힌트 듣기 · 짧은 말 — 설계 2).
  if (d.discard && (d.phase === "probe" || d.phase === "dead")) {
    d.discard.notified = false;
  }
  if (d.phase === "rest" || d.phase === "dead") {
    release(d, { id, sound }, now, fx);
    return;
  }
  // 버림 확인 · 닫는 중 · 간격 · 버림부터 · 진짜 동안은 보류한다(F8 · 보류한 읽기).
  d.held.push({ id, sound });
}

function release(
  d: Draft,
  reading: HeldReading,
  now: number,
  fx: DiscardFlowEffect[],
): void {
  const disc = d.discard;
  // 저절로 끝난 죽은 버림에서 흘린 읽기는 세션 없이 나온다(M-3).
  const inDiscard =
    d.phase === "dead" && disc !== undefined && disc.endAt === undefined;
  fx.push({ type: "speak-release", id: reading.id });
  d.inflight.push({
    id: reading.id,
    sound: reading.sound,
    started: false,
    discard: inDiscard ? disc.id : undefined,
  });
  if (inDiscard) disc.called = true;
  if (
    (d.phase === "rest" && effectiveBranch(d, now) !== "rest") ||
    (d.phase === "dead" && !inDiscard)
  ) {
    d.betweenRead = true;
  }
  // 새 읽기 뒤의 굳음은 새로 cancel 한다(지난 굳음 기다림을 쓰지 않음, M-1).
  d.stuckSince = undefined;
}

function releaseHeld(d: Draft, now: number, fx: DiscardFlowEffect[]): void {
  const held = d.held;
  d.held = [];
  for (const reading of held) release(d, reading, now, fx);
}

function dropHeld(d: Draft, fx: DiscardFlowEffect[]): void {
  for (const reading of d.held) fx.push({ type: "speak-drop", id: reading.id });
  d.held = [];
}

function onSpeakStart(d: Draft, id: number, now: number): void {
  const index = d.inflight.findIndex((r) => r.id === id);
  if (index < 0) return;
  const reading = d.inflight[index];
  d.inflight[index] = { ...reading, started: true };
  const disc = d.discard;
  if (disc && reading.discard === disc.id && disc.soundStartAt === undefined) {
    disc.soundStartAt = now;
  }
}

function onSpeakEnd(
  d: Draft,
  id: number,
  heard: boolean,
  now: number,
  fx: DiscardFlowEffect[],
): void {
  const index = d.inflight.findIndex((r) => r.id === id);
  if (index < 0) return;
  const [reading] = d.inflight.splice(index, 1);
  const disc = d.discard;
  const inThis = disc !== undefined && reading.discard === disc.id;
  if (heard) {
    soundEnded(d, reading, now, reading.sound);
    return;
  }
  if (!inThis || d.phase !== "dead" || disc.endAt !== undefined) return;
  // 들려주지 못함: 첫째는 굳음(버림을 연 채 다음 읽기에 맡김 — 기계가 부른 소리였으면 advanceDead 가 한 번 더 부른다), 둘째는 살아
  // 있는 버림(F3 · 기록 5 규칙 2).
  disc.np += 1;
  if (disc.np >= NOT_PLAYED_LIVE_COUNT) {
    stopDiscard(d, now, fx, "not_played", { to: "live" });
  }
}

/** 들려준 소리 하나가 끝났다(끝 알림 · 감시 상한 · 시작 알림 뒤 끊김). */
function soundEnded(
  d: Draft,
  reading: Reading,
  now: number,
  kind: DiscardSoundKind,
): void {
  d.lastSoundEndAt = now;
  const disc = d.discard;
  if (!disc || reading.discard !== disc.id) return;
  disc.heard = true;
  disc.soundStartAt ??= now;
  disc.soundEndAt = now;
  disc.sk = kind;
  d.againPending = false;
}

/** 읽는 중인 읽기를 모두 끊김으로 본다. 시작 알림 뒤면 소리(cut)로 친다. 시작 전 읽기가 있었는지 돌려준다. */
function cutReadings(d: Draft, now: number, startedHint: boolean): boolean {
  let unstarted = false;
  for (const reading of d.inflight) {
    if (reading.started || startedHint) soundEnded(d, reading, now, "cut");
    else unstarted = true;
  }
  d.inflight = [];
  return unstarted;
}

// ── 누름 ──

function onPress(
  d: Draft,
  auto: boolean,
  now: number,
  fx: DiscardFlowEffect[],
): void {
  // 진짜 중 누름은 단추 멈춤이라 층이 진짜 손잡이에 넘긴다. 걸린 동안 다시 온 누름은 하나로 센다.
  if (d.phase === "real" || d.press !== undefined) return;
  // 회복(F10 · plan 정한 것 5): deaf 로 끝난 진짜 뒤 화면이 누름 없이 건 듣기.
  if (auto && d.lastRealDeaf) d.recovering = true;
  let unstartedCut = false;
  if (d.inflight.length > 0) {
    // 읽는 중 누름(C53 (2) · F9): 읽기를 멈추고, 시작 알림이 있었는지로 가른다.
    fx.push({ type: "cancel-speaking" });
    unstartedCut = cutReadings(d, now, false);
  }
  // 누름 때 읽기 줄을 비운다(설계 2 '듣기가 읽기를 끊음').
  dropHeld(d, fx);
  if (d.discard && (d.phase === "probe" || d.phase === "dead")) {
    d.discard.notified = true;
  }
  d.press = { at: now, auto };
  if (unstartedCut && discardOpen(d) && d.phase === "dead" && d.discard) {
    // F9: 시작 알림 전에 끊긴 읽기 — 짧은 말 한 줄을 버림 안에서 끝까지 읽은 뒤 진짜.
    askSound(d, d.discard, fx);
  }
}

/** 버림 안 소리를 부른다(F4 (2) · F9 · F10). 부른 소리가 끝나 층이 sound-end 를 보낼 때까지 stop 하지 않는다. */
function askSound(
  d: Draft,
  disc: Mutable<DiscardRecord>,
  fx: DiscardFlowEffect[],
): void {
  fx.push({ type: "need-sound", kind: d.recovering ? "mic" : "again" });
  disc.asked = true;
  disc.askNp = disc.np;
  disc.notified = false;
  d.againPending = false;
}

// ── 진짜 ──

function onRealEnd(
  d: Draft,
  kind: RealEndKind,
  why: DiscardReopenWhy | undefined,
  now: number,
  fx: DiscardFlowEffect[],
): void {
  if (d.phase !== "real") return;
  d.lastSessionEndAt = now;
  d.realWaited = false;
  // 다시 말할 차례인지는 화면이 정한다(again · press(auto)) — 결과 종류만으로 소리 · 회복을 걸지 않는다(I-1).
  d.lastRealDeaf = kind === "deaf";
  if (kind === "interrupted") {
    toReopen(d, why ?? (d.hidden ? "hidden" : "leave"));
    return;
  }
  if (kind === "unavailable") {
    // '마이크를 쓸 수 없음' 뒤에는 버림을 열지 않는다(F2 예외). 다음 읽기 · 누름 앞에 버림부터 연다(까닭 no_mic, M-5).
    toReopen(d, "no_mic");
    return;
  }
  if (d.hidden || !d.unlocked) {
    toReopen(d, "hidden");
    return;
  }
  // F2: 진짜가 끝나면 곧바로 버림을 연다.
  startProbe(d, now, fx, "discard", undefined);
}

function openReal(d: Draft, now: number, fx: DiscardFlowEffect[]): void {
  const press = d.press;
  const waited = press !== undefined && (press.auto || now > press.at);
  fx.push({ type: "note", dc: noteOf(d, now) });
  fx.push({ type: "real-start" });
  d.phase = "real";
  d.realWaited = waited;
  d.press = undefined;
  d.recovering = false;
  d.againPending = false;
  d.lastRealDeaf = false;
  d.betweenRead = false;
  d.stuckSince = undefined;
  d.reopenWhy = undefined;
}

// ── 버림 ──

function startProbe(
  d: Draft,
  now: number,
  fx: DiscardFlowEffect[],
  via: "discard" | "reopen",
  rw: DiscardReopenWhy | undefined,
): void {
  const id = d.discards + 1;
  d.discards = id;
  d.discard = {
    id,
    via,
    rw,
    startAt: now,
    audioAt: undefined,
    stopAt: undefined,
    endAt: undefined,
    called: false,
    heard: false,
    soundStartAt: undefined,
    soundEndAt: undefined,
    sk: undefined,
    np: 0,
    n: 0,
    notified: false,
    asked: false,
    askNp: 0,
    noReask: false,
    why: undefined,
  };
  d.phase = "probe";
  d.reopenWhy = undefined;
  // 사이 읽기 표지는 그 뒤 연 버림까지만이다(M-4).
  d.betweenRead = false;
  fx.push({ type: "discard-start", discard: id });
}

function stopDiscard(
  d: Draft,
  now: number,
  fx: DiscardFlowEffect[],
  why: DiscardEndWhy | undefined,
  next: CloseNext,
): void {
  const disc = d.discard;
  if (!disc) return;
  if (why !== undefined) disc.why = why;
  disc.stopAt = now;
  // 살아 있는 버림도 stop 으로 닫는다(abort 는 쓰지 않음, F3 · N-2).
  fx.push({ type: "discard-stop", discard: disc.id });
  d.phase = "closing";
  d.closeNext = next;
}

function onDiscardEnd(d: Draft, discard: number, now: number): void {
  if (!isCurrent(d, discard) || !d.discard) return;
  const disc = d.discard;
  disc.endAt = now;
  d.lastDiscardEndAt = now;
  d.lastSessionEndAt = now;
  if (d.phase === "probe") {
    if (disc.audioAt === undefined) {
      // 판정 전에 audiostart 없이 끝남: 살아 있는 버림과 같게 본다(다음 진짜까지 버림을 다시 열지 않음).
      disc.why = "live";
      toWait(d, "live");
    } else {
      selfEndedSilent(d);
    }
    return;
  }
  if (d.phase === "dead" && !disc.heard && d.inflight.length === 0) {
    selfEndedSilent(d);
  }
  // dead 에서 소리가 있었거나 나오는 중이면 소리 끝 + after 뒤 간격(advanceDead), closing 은 advanceClosing 이 잇는다.
}

/** 소리 전에 저절로 끝난 버림: '버림부터'(I-2). 그 버림이 이미 '버림부터'에서 연 것이면 다시 열지 않고 대기(live)로 간다(되풀이 막음). */
function selfEndedSilent(d: Draft): void {
  if (d.discard) d.discard.why = "self_end";
  if (d.discard?.via === "reopen") toWait(d, "live");
  else toReopen(d, "self_end");
}

function toReopen(d: Draft, why: DiscardReopenWhy): void {
  d.phase = "reopen";
  d.reopenWhy = why;
  d.closeNext = undefined;
}

function toWait(d: Draft, branch: "discard" | "live"): void {
  d.phase = "rest";
  d.waitBranch = branch;
  d.closeNext = undefined;
}

/** 숨김 · 떠남 · 마이크 확인: 걸린 누름 · 보류한 읽기를 거두고, 열린 버림을 닫은 뒤 '버림부터'로 간다(F11 · FR-9). */
function closeFor(
  d: Draft,
  now: number,
  fx: DiscardFlowEffect[],
  why: "hidden" | "leave" | "check",
  emitStop: boolean,
): void {
  if (d.press !== undefined) {
    fx.push({ type: "press-drop", reason: why });
    d.press = undefined;
  }
  // 거둔 누름이 받던 회복 · 다시 말할 차례도 거둔다(돌아오면 화면이 다시 보낸다).
  d.recovering = false;
  d.againPending = false;
  dropHeld(d, fx);
  switch (d.phase) {
    case "probe":
    case "dead":
      if (discardOpen(d) && d.discard) {
        if (emitStop) {
          stopDiscard(d, now, fx, undefined, { to: "reopen", why });
        } else {
          // 숨김 · 마이크 확인은 음성 접점이 끊는다(abort). end 를 기다린 뒤 버림부터.
          d.discard.stopAt = now;
          d.phase = "closing";
          d.closeNext = { to: "reopen", why };
        }
      } else {
        toReopen(d, why);
      }
      return;
    case "closing":
      d.closeNext = { to: "reopen", why };
      return;
    case "gap":
      toReopen(d, why);
      return;
    case "rest":
      if (effectiveBranch(d, now) !== "rest") toReopen(d, why);
      return;
    case "reopen":
      d.reopenWhy = why;
      return;
    case "real":
      // 진짜는 층이 끊고 real-end(interrupted)가 온다.
      return;
  }
}

// ── 상태 넘김 ──

function advanceOnce(d: Draft, now: number, fx: DiscardFlowEffect[]): boolean {
  switch (d.phase) {
    case "rest":
      return advanceRest(d, now, fx);
    case "reopen":
      return advanceReopen(d, now, fx);
    case "probe":
      return advanceProbe(d, now, fx);
    case "dead":
      return advanceDead(d, now, fx);
    case "closing":
      return advanceClosing(d, now);
    case "gap":
      return advanceGap(d, now, fx);
    case "real":
      return false;
  }
}

function advanceRest(d: Draft, now: number, fx: DiscardFlowEffect[]): boolean {
  // 대기의 읽기는 세션 없이 한다(F1 · F3 · 사이 읽기).
  if (d.held.length > 0) releaseHeld(d, now, fx);
  if (d.hidden || !d.unlocked || d.press === undefined) return false;
  if (d.inflight.length > 0 || now < realReadyAt(d)) return false;
  if (!settled(d, now, fx)) return false;
  openReal(d, now, fx);
  return true;
}

function advanceReopen(
  d: Draft,
  now: number,
  fx: DiscardFlowEffect[],
): boolean {
  if (d.hidden) return false;
  if (restElapsed(d, now)) {
    toWait(d, "discard");
    d.waitBranch = "rest";
    return true;
  }
  if (!d.unlocked) return false;
  if (d.press === undefined && d.held.length === 0) return false;
  // 버림부터: 읽기 요청이나 누름이 오면 버림 확인부터(설계 1).
  startProbe(d, now, fx, "reopen", d.reopenWhy);
  return true;
}

function advanceProbe(d: Draft, now: number, fx: DiscardFlowEffect[]): boolean {
  const disc = d.discard;
  if (!disc || now < disc.startAt + d.times.liveAsMs) return false;
  if (
    disc.audioAt !== undefined &&
    disc.audioAt - disc.startAt <= d.times.liveAsMs
  ) {
    d.phase = "dead";
    return true;
  }
  // 살아 있는 버림(F3): as 가 문턱을 넘거나 audiostart 없음.
  stopDiscard(d, now, fx, "live", { to: "live" });
  return true;
}

function advanceDead(d: Draft, now: number, fx: DiscardFlowEffect[]): boolean {
  const disc = d.discard;
  if (!disc) return false;
  const t = d.times;
  const ended = disc.endAt !== undefined;
  if (ended && !disc.heard && d.inflight.length === 0) {
    // 소리 전에 저절로 끝남: 보류한 읽기는 '버림부터'가 다시 연 버림에서 흘린다.
    selfEndedSilent(d);
    return true;
  }
  if (d.held.length > 0) releaseHeld(d, now, fx);
  if (!ended && !disc.heard && d.inflight.length === 0) {
    if (!disc.asked && (d.againPending || d.press !== undefined)) {
      // F4 (2): 읽기 없는 자리 — 버림 안 소리를 부른다(다시 말할 차례 · 걸린 누름 · 회복의 auto 누름).
      askSound(d, disc, fx);
    } else if (
      disc.asked &&
      !disc.noReask &&
      disc.np > disc.askNp &&
      disc.np < NOT_PLAYED_LIVE_COUNT
    ) {
      // 기계가 부른 소리가 처음 들려주지 못함으로 끝났다: 화면은 그 소리를 다시 보내지 않으니(누름이 없는 따라 말하기도) cancel 뒤 한 번
      // 더 부른다(fix 2 · fix 3).
      if (!fx.some((e) => e.type === "cancel-speaking")) {
        fx.push({ type: "cancel-speaking" });
      }
      askSound(d, disc, fx);
    }
  }
  if (d.inflight.length > 0) return false;
  if (disc.heard && !disc.notified && !d.serverWaiting && now >= capAt(d)) {
    // 안전 상한: 소리가 있었으면 소리 끝으로 본다(M-4).
    disc.notified = true;
    disc.why = "cap";
  }
  if (disc.heard && disc.notified) {
    const soundEnd = d.lastSoundEndAt ?? disc.startAt;
    if (ended) {
      // 저절로 끝난 뒤 소리가 끝남: 소리 끝 + after 뒤 간격(점검 쪽 fix 8-1 꼴).
      if (now < soundEnd + t.afterSoundMs) return false;
      disc.why ??= "self_end";
      d.phase = "gap";
      d.gapFrom = disc.endAt;
      return true;
    }
    if (now < soundEnd + t.afterSoundMs || now < disc.startAt + t.minMs) {
      return false;
    }
    // F5: 소리 끝 + after 와 하한을 둘 다 채움.
    stopDiscard(d, now, fx, disc.why ?? "sound", { to: "gap" });
    return true;
  }
  if (!disc.heard && !ended && !d.serverWaiting && now >= capAt(d)) {
    // 소리 없는 안전 상한: stop 한 뒤 버림부터(끝 까닭 cap).
    stopDiscard(d, now, fx, "cap", { to: "reopen", why: "cap" });
    return true;
  }
  return false;
}

function advanceClosing(d: Draft, now: number): boolean {
  const disc = d.discard;
  if (!disc || disc.stopAt === undefined) return false;
  if (disc.endAt === undefined) {
    if (now < disc.stopAt + d.times.endWaitMs) return false;
    // end 상한: end 없이 그 시각을 end 로 본다.
    disc.endAt = disc.stopAt + d.times.endWaitMs;
    d.lastDiscardEndAt = disc.endAt;
    d.lastSessionEndAt = disc.endAt;
  }
  const next = d.closeNext ?? { to: "gap" };
  d.closeNext = undefined;
  if (next.to === "reopen") {
    toReopen(d, next.why);
  } else if (d.hidden) {
    toReopen(d, "hidden");
  } else if (next.to === "live") {
    toWait(d, "live");
  } else {
    d.phase = "gap";
    d.gapFrom = disc.endAt;
  }
  return true;
}

function advanceGap(d: Draft, now: number, fx: DiscardFlowEffect[]): boolean {
  const from = d.gapFrom ?? now;
  const ready = Math.max(
    from + d.times.gapMs,
    (d.lastSoundEndAt ?? from) + d.times.gapMs,
  );
  if (now < ready) return false;
  if (!settled(d, now, fx)) return false;
  toWait(d, "discard");
  return true;
}

/**
 * speaking 이 거짓인가. 참이면 cancel 을 한 번 부르고 afterSoundMs 를 기다린 뒤 그대로 간다(굳은 읽기). 간격 끝에서 건 기다림은
 * 대기의 진짜 열기까지 잇는다(한 번만 기다림). 거짓을 보면 지운다.
 */
function settled(d: Draft, now: number, fx: DiscardFlowEffect[]): boolean {
  if (!d.speaking) {
    d.stuckSince = undefined;
    return true;
  }
  if (d.stuckSince === undefined) {
    fx.push({ type: "cancel-speaking" });
    d.stuckSince = now;
    return d.times.afterSoundMs <= 0;
  }
  return now >= d.stuckSince + d.times.afterSoundMs;
}

// ── 시각 계산 ──

function restElapsed(d: Draft, now: number): boolean {
  return (
    d.lastSessionEndAt === undefined ||
    now - d.lastSessionEndAt >= d.times.restMs
  );
}

function effectiveBranch(d: Draft, now: number): "rest" | "discard" | "live" {
  return restElapsed(d, now) ? "rest" : d.waitBranch;
}

/** 대기에서 진짜를 열 수 있는 가장 이른 시각(버림 end 와 마지막 소리 끝에서 각각 gap, F6 · 우려 7 (가)). */
function realReadyAt(d: Draft): number {
  const gap = d.times.gapMs;
  return Math.max(
    d.lastDiscardEndAt === undefined ? -Infinity : d.lastDiscardEndAt + gap,
    d.lastSoundEndAt === undefined ? -Infinity : d.lastSoundEndAt + gap,
  );
}

/** 버림의 안전 상한 시각: 버림 start · 그 안 마지막 소리 끝 · 서버 기다림 끝 가운데 늦은 것 + capMs. */
function capAt(d: Draft): number {
  const disc = d.discard;
  if (!disc) return Infinity;
  return (
    Math.max(
      disc.startAt,
      disc.soundEndAt ?? -Infinity,
      d.serverWaitEndAt ?? -Infinity,
    ) + d.times.capMs
  );
}

function wakeOf(d: Draft, now: number): number | undefined {
  const t = d.times;
  const at: number[] = [];
  const disc = d.discard;
  switch (d.phase) {
    case "probe":
      if (disc) at.push(disc.startAt + t.liveAsMs);
      break;
    case "dead":
      if (!disc || d.inflight.length > 0) break;
      if (disc.heard && disc.notified) {
        const soundEnd = (d.lastSoundEndAt ?? disc.startAt) + t.afterSoundMs;
        at.push(
          disc.endAt === undefined
            ? Math.max(soundEnd, disc.startAt + t.minMs)
            : soundEnd,
        );
      }
      if (!d.serverWaiting) at.push(capAt(d));
      break;
    case "closing":
      if (disc?.stopAt !== undefined && disc.endAt === undefined) {
        at.push(disc.stopAt + t.endWaitMs);
      }
      break;
    case "gap": {
      const from = d.gapFrom ?? now;
      at.push(Math.max(from + t.gapMs, (d.lastSoundEndAt ?? from) + t.gapMs));
      if (d.stuckSince !== undefined) at.push(d.stuckSince + t.afterSoundMs);
      break;
    }
    case "rest":
      if (d.inflight.length > 0 || d.held.length > 0) break;
      at.push(realReadyAt(d));
      if (d.stuckSince !== undefined) at.push(d.stuckSince + t.afterSoundMs);
      break;
    case "reopen":
      if (d.lastSessionEndAt !== undefined) {
        at.push(d.lastSessionEndAt + t.restMs);
      }
      break;
    case "real":
      break;
  }
  const future = at.filter((x) => Number.isFinite(x) && x > now);
  return future.length > 0 ? Math.min(...future) : undefined;
}

// ── 화면 · 기록 ──

function viewOf(d: Draft, now: number): DiscardView {
  const idle = !d.hidden && d.inflight.length === 0 && d.held.length === 0;
  return {
    waiting: d.press !== undefined,
    sayNow: d.phase === "real" && d.realWaited,
    recovering: d.recovering,
    canListen: idle && d.phase === "rest" && now >= realReadyAt(d),
    reopenIdle: idle && d.phase === "reopen",
  };
}

function sameView(a: DiscardView, b: DiscardView): boolean {
  return (
    a.waiting === b.waiting &&
    a.sayNow === b.sayNow &&
    a.recovering === b.recovering &&
    a.canListen === b.canListen &&
    a.reopenIdle === b.reopenIdle
  );
}

/** 진짜 start 바로 앞의 dc 칸(spec 설계 5). rest 갈래(쉰 뒤 · 쪽 첫)에는 버림 칸이 없다. */
function noteOf(d: Draft, now: number): DiscardFlowNote {
  const branch = effectiveBranch(d, now);
  const disc = d.discard;
  const dc: DiscardFlowNote = {};
  const g: DiscardBranch =
    branch === "discard" && disc?.via === "reopen" ? "reopen" : branch;
  dc.g = g;
  if (g !== "rest" && disc) {
    dc.sr = d.betweenRead;
    if (disc.why !== undefined) dc.why = disc.why;
    if (disc.via === "reopen" && disc.rw !== undefined) dc.rw = disc.rw;
    if (disc.audioAt !== undefined) dc.as = ms(disc.audioAt - disc.startAt);
    if (disc.endAt !== undefined) dc.d = ms(disc.endAt - disc.startAt);
    if (disc.soundStartAt !== undefined) {
      dc.s0 = ms(disc.soundStartAt - disc.startAt);
    }
    if (disc.soundEndAt !== undefined) {
      dc.s1 = ms(disc.soundEndAt - disc.startAt);
    }
    dc.sk = disc.sk ?? "none";
    dc.np = disc.np;
    dc.n = disc.n;
  }
  const press = d.press;
  if (press !== undefined && now > press.at) dc.w = ms(now - press.at);
  return dc;
}

function ms(value: number): number {
  return Math.round(value);
}

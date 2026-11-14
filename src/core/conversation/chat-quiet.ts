// 이야기 방식 조용함 타이머(회화 대화 구조 R spec 설계 6 '타이머의 범위' · 설계 7 '막힌 뒤 한국어 설명' · AC-6, plan 묶음 P6). 순수 모듈이다.
// 화면(묶음 W)이 아이 차례마다 사건을 넣고, 상태가 sent 로 바뀐 걸음에서 조용함 입구(lead quiet)를 한 번 보낸다. 시계는 사건의 now(ms)로 받는다.
//
// 규칙(spec 설계 6 문장 그대로):
// - 아이 차례가 열리고 선생님 말의 읽기(소리 줄 포함, iPad 는 버리는 듣기 층의 마지막 읽기 끝 알림)가 끝난 때부터 그 차례에 한 번만 잰다.
//   읽기 끝이 여러 번 오면(문장마다) 보내기 전까지 마지막 읽기 끝으로 재기 시작을 다시 잡는다(P6 fix 1 M-1 — 아이가 연 읽기는 입력이라
//   이미 거두었으므로, 거두지 않은 채 오는 읽기 끝은 선생님 말 · 소리 줄 같은 시스템 읽기뿐이다). 열림 전에 온 읽기 끝은 버린다.
// - 그 차례에 아이의 입력(여덟 갈래 CHAT_QUIET_INPUTS — spec 일곱과 구석 '그만하기', 컨트롤러 결정 P6 fix 1)이 하나라도 있었으면 거두고
//   그 차례에는 보내지 않는다(읽기 끝 전의 입력도 같다).
// - 열림은 차례 열쇠(선생님 행을 가리키는 값)를 싣는다. 같은 열쇠의 열림이 다시 오면 무시해, 거둔 · 보낸 상태가 같은 차례 안에서 되살아나지
//   않는다(P6 fix 1 M-2 — 화면 효과의 다시 돎 · 실패한 quiet 요청 뒤 다시 열기).
// - 이어진 둘째 막힘으로 힌트 단이 저절로 열린 것(hint-auto-open)은 아이의 입력이 아니다(spec 설계 6 의 예외 · m-4 (라)).
// - 설명 기다림 칸이 있는 차례는 읽기 끝과 '설명이 보인 때 · 설명 호출이 실패로 끝난 때 · 설명 기다림 상한이 지난 때 가운데 가장 이른 때'
//   가운데 늦은 때부터 잰다. 상한 뒤에 온 설명은 재는 때를 바꾸지 않는다. 상한은 아이 차례가 열린 때(끝 줄을 받은 때)부터 센다.
// - 쪽이 가려지면 그 차례의 타이머를 거두고 돌아와도 다시 재지 않는다.
// 기다림 시간(talk.chat_quiet_seconds)과 설명 기다림(talk.chat_explain_wait_seconds)은 끝 줄 신호(chat-turn-core ChatEndSignal)의 초 값으로
// 받는다. 기다림 시간 칸이 없거나 0 이하이면 그 차례는 끔이다(서버가 싣지 않는 때 · 0 이면 끔).

/**
 * 조용함 타이머를 거두는 아이의 입력 여덟 갈래: spec 설계 6 · AC-6 의 일곱(말하기 누름 · 힌트 · '잘 모르겠어요' · 한국어 도움 · 다시 듣기 ·
 * 소리 줄 듣기 · 힌트 문장 듣기)과 구석 '그만하기' 누름(stop — 아이가 그만둘지 고르는 중에 선생님이 말을 걸지 않게, 컨트롤러 결정 P6 fix 1).
 */
export const CHAT_QUIET_INPUTS = [
  "talk",
  "hint",
  "dont_know",
  "korean_help",
  "replay",
  "sound_line",
  "hint_listen",
  "stop",
] as const;
export type ChatQuietInput = (typeof CHAT_QUIET_INPUTS)[number];

/** 끝 줄 신호 가운데 타이머가 읽는 칸(초). 칸이 없으면 그 값이 없는 것이다(P3 규격 — 싣지 않는 칸은 칸 자체가 없음). */
export type ChatQuietSignal = {
  quietSeconds?: number | undefined;
  explainWait?: number | undefined;
};

export type ChatQuietEvent =
  /**
   * 아이 차례가 열림(끝 줄 신호를 받은 때). turnKey 는 그 차례를 가리키는 값(선생님 행 id 등). 다른 열쇠면 앞 차례의 상태를 버리고, 지금 상태와
   * 같은 열쇠면 무시한다.
   */
  | { type: "open"; now: number; turnKey: string; signal: ChatQuietSignal }
  /** 선생님 말의 읽기가 끝남. 보내기 전까지는 마지막 것을 쓴다. */
  | { type: "read-end"; now: number }
  /** 아이의 입력(일곱 갈래). */
  | { type: "input"; now: number; input: ChatQuietInput }
  /** 이어진 둘째 막힘으로 힌트 단이 저절로 열림 — 입력이 아니므로 상태를 바꾸지 않는다. */
  | { type: "hint-auto-open"; now: number }
  /** 막힌 뒤 설명이 말풍선 아래에 보임. */
  | { type: "explain-shown"; now: number }
  /** 막힌 뒤 설명 호출이 실패로 끝남. */
  | { type: "explain-failed"; now: number }
  /** 쪽이 가려짐. */
  | { type: "hidden"; now: number }
  /** 시계 걸음(화면의 setTimeout · 가짜 시계). */
  | { type: "tick"; now: number };

export type ChatQuietState =
  /** 재지 않음(차례가 열리기 전 · 기다림 시간 없음). 기다림 시간이 없는 차례면 그 차례 열쇠를 지닌다. */
  | { phase: "off"; turnKey?: string }
  /** 재는 중이거나 읽기 끝 · 설명을 기다리는 중. */
  | {
      phase: "armed";
      turnKey: string;
      quietMs: number;
      openedAt: number;
      readEndAt?: number;
      /** 설명 기다림 상한이 지나는 때(설명 기다림 칸이 있는 차례만). */
      explainCapAt?: number;
      /** 설명이 보였거나 실패로 끝난 가장 이른 때. */
      explainAt?: number;
    }
  /** 그 차례의 타이머를 거둠(입력 · 쪽 가림). */
  | { phase: "dropped"; turnKey: string; why: "input" | "hidden"; at: number }
  /** 조용함 입구를 보냄(그 차례에 한 번). */
  | { phase: "sent"; turnKey: string; at: number; startAt: number };

export const CHAT_QUIET_OFF: ChatQuietState = { phase: "off" };

/** 초 → ms(단위 바꿈). */
const MS_PER_SECOND = 1000;

function positiveSeconds(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}

/** 설명 기다림(초). 칸이 없으면 없음, 값이 음수 · 수가 아니면 0(기다리지 않음)으로 읽는다. */
function explainWaitSeconds(value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * 재기 시작 시각(ms). 읽기 끝이 아직 없으면 없음. 설명 기다림 차례는 설명이 보이거나 실패하기 전에는 상한을 넣은 값이다(그 뒤 이른 때가 오면
 * 그때로 당겨진다 — 사건은 시각 차례로 오므로 당겨진 값도 이미 지난 tick 보다 늦다). 늦게 온 읽기 끝은 이 값을 뒤로 민다(M-1). 그래서
 * 화면은 사건마다 chatQuietDueAt 으로 시계를 다시 건다.
 */
export function chatQuietStartOf(state: ChatQuietState): number | undefined {
  if (state.phase === "sent") return state.startAt;
  if (state.phase !== "armed" || state.readEndAt === undefined)
    return undefined;
  if (state.explainCapAt === undefined) return state.readEndAt;
  const explained = Math.min(
    state.explainAt ?? Number.POSITIVE_INFINITY,
    state.explainCapAt,
  );
  return Math.max(state.readEndAt, explained);
}

/** 보낼 시각(ms) — 화면이 setTimeout 을 거는 때. 재는 중이 아니면 없음. */
export function chatQuietDueAt(state: ChatQuietState): number | undefined {
  if (state.phase !== "armed") return undefined;
  const start = chatQuietStartOf(state);
  return start === undefined ? undefined : start + state.quietMs;
}

/** 상태 줄임 함수. 화면은 바뀐 상태가 sent 이고 앞 상태가 sent 가 아니면 quiet 요청을 보낸다. */
export function reduceChatQuiet(
  state: ChatQuietState,
  event: ChatQuietEvent,
): ChatQuietState {
  if (event.type === "open") {
    if ("turnKey" in state && state.turnKey === event.turnKey) return state;
    const quiet = positiveSeconds(event.signal.quietSeconds);
    if (quiet === undefined) return { phase: "off", turnKey: event.turnKey };
    const wait = explainWaitSeconds(event.signal.explainWait);
    return {
      phase: "armed",
      turnKey: event.turnKey,
      quietMs: quiet * MS_PER_SECOND,
      openedAt: event.now,
      ...(wait === undefined
        ? {}
        : { explainCapAt: event.now + wait * MS_PER_SECOND }),
    };
  }
  if (state.phase !== "armed") return state;
  switch (event.type) {
    case "read-end":
      // 읽기 끝이 거꾸로 된 시각으로 와도 재기 시작을 앞당기지 않는다(늦은 쪽을 지킨다 — 틀려도 늦게 보내는 쪽, 재검토 N-1).
      return {
        ...state,
        readEndAt: Math.max(state.readEndAt ?? event.now, event.now),
      };
    case "input":
      return {
        phase: "dropped",
        turnKey: state.turnKey,
        why: "input",
        at: event.now,
      };
    case "hidden":
      return {
        phase: "dropped",
        turnKey: state.turnKey,
        why: "hidden",
        at: event.now,
      };
    case "hint-auto-open":
      return state;
    case "explain-shown":
    case "explain-failed":
      if (state.explainCapAt === undefined) return state;
      return state.explainAt === undefined || event.now < state.explainAt
        ? { ...state, explainAt: event.now }
        : state;
    case "tick": {
      const due = chatQuietDueAt(state);
      const start = chatQuietStartOf(state);
      if (due === undefined || start === undefined || event.now < due)
        return state;
      return {
        phase: "sent",
        turnKey: state.turnKey,
        at: event.now,
        startAt: start,
      };
    }
  }
}

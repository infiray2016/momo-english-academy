// 선생님 그림 층 판정(선생님 화면 plan 값 14, 10절 '선생님 그림' 행 · 4절 회화 세션 '선생님 창' 행 · C122 · C130 (5) · AC-19i).
// DB · 화면 없는 순수 함수다. 그림 층은 처음에 초상이고, 첫 장을 그리면 3D 로 바뀐다. WebGL 없음 · 불러오기 실패(코드 조각 · 모델) ·
// 첫 장 시간 넘김 · 3D 맥락 잃음 · 설정(talk.teacher_render=portrait)이면 대신 표시(초상)로 가고, 한 번 초상으로 가면 그 세션 끝까지
// 초상이다. 불러오기마다 차례 번호를 붙여 늦게 온 결과(지난 차례의 첫 장 · 실패 · 시간 넘김)는 버린다(시제품 generation).
// 아이 화면에 오류 글 · 다시 불러오기 단추를 두지 않는다 — 까닭은 화면 속성(data-teacher-fallback)과 사건에만 남는다.
import type { TeacherState } from "@/core/teacher/state";

/** 대신 표시 까닭 다섯(화면 속성 data-teacher-fallback 값과 같다). */
export const LAYER_FALLBACKS = [
  "no-webgl",
  "load-failed",
  "timeout",
  "context-lost",
  "setting",
] as const;
export type LayerFallback = (typeof LAYER_FALLBACKS)[number];

/** 그림 층 단계: 시작 전 · 불러오는 중 · 3D 로 그림 · 대신 표시(세션 끝까지) · 닫힘(회화 마무리). */
export type LayerPhase = "idle" | "loading" | "ready" | "fallback" | "closed";

export type LayerState = {
  render: "3d" | "portrait";
  /** 대신 표시 까닭(phase 가 fallback 일 때만). */
  fallback?: LayerFallback;
  /** 지금 불러오기 차례 번호(start · close 마다 하나 늚). */
  turn: number;
  phase: LayerPhase;
};

/** 처음 상태 — 초상, 까닭 없음(3D 를 시작하기 전 초상은 까닭이 없다). */
export const LAYER_START: LayerState = {
  render: "portrait",
  turn: 0,
  phase: "idle",
};

/**
 * 그림 층 사건. start · setting-portrait · no-webgl 은 불러오기 전(또는 그 자리)에서 나고, 나머지는 불러오기 차례 번호를 단다.
 * import-failed(3D 코드 조각을 못 받음)는 load-failed 로 다룬다.
 */
export type LayerEvent =
  | { type: "start" }
  | { type: "setting-portrait" }
  | { type: "no-webgl" }
  | { type: "import-failed"; turn: number }
  | { type: "load-failed"; turn: number }
  | { type: "timeout"; turn: number }
  | { type: "context-lost"; turn: number }
  | { type: "first-frame"; turn: number }
  | { type: "close" };

function fallen(state: LayerState, fallback: LayerFallback): LayerState {
  return { render: "portrait", fallback, turn: state.turn, phase: "fallback" };
}

/**
 * 그림 층 한 걸음. 바뀌지 않으면 같은 객체를 돌려준다(부르는 쪽이 '버린 사건'을 가른다).
 * - 대신 표시 · 닫힘 뒤에는 모든 사건을 버린다(세션 끝까지 초상).
 * - 차례 번호가 지금과 다른 사건은 늦게 온 결과라 버린다.
 * - 첫 장 · 불러오기 실패 · 시간 넘김은 불러오는 중에만, 맥락 잃음은 불러오는 중 · 3D 일 때만 받는다(3D 가 된 뒤 시간 넘김은 없다).
 */
export function layerStep(state: LayerState, event: LayerEvent): LayerState {
  if (state.phase === "fallback" || state.phase === "closed") return state;
  if (event.type === "start")
    return { render: "portrait", turn: state.turn + 1, phase: "loading" };
  if (event.type === "setting-portrait") return fallen(state, "setting");
  if (event.type === "no-webgl") return fallen(state, "no-webgl");
  if (event.type === "close")
    return { render: "portrait", turn: state.turn + 1, phase: "closed" };
  if (event.turn !== state.turn) return state;
  switch (event.type) {
    case "first-frame":
      return state.phase === "loading"
        ? { render: "3d", turn: state.turn, phase: "ready" }
        : state;
    case "import-failed":
    case "load-failed":
      return state.phase === "loading" ? fallen(state, "load-failed") : state;
    case "timeout":
      return state.phase === "loading" ? fallen(state, "timeout") : state;
    case "context-lost":
      return state.phase === "loading" || state.phase === "ready"
        ? fallen(state, "context-lost")
        : state;
  }
}

/** 그 차례의 불러오기 결과(코드 조각 · 모델)를 받아도 되는가 — 아니면 늦은 결과라 버리고 자원을 푼다. */
export function acceptsLoad(state: LayerState, turn: number): boolean {
  return state.phase === "loading" && state.turn === turn;
}

/** 세션 끝까지 초상을 고른 대신 표시 상태(같은 세션에서 그림 층을 다시 만들 때 까닭을 이어 감). */
export function fallbackState(fallback: LayerFallback): LayerState {
  return fallen(LAYER_START, fallback);
}

/** 그림 층 사건 이름(window 의 CustomEvent — 관찰 쪽 재기 · e2e 셈이 쓴다). */
export const TEACHER_EVENT = "momo:teacher";

/**
 * 그림 층 사건 내용. ms 는 load-start 부터의 시간(first-frame · fallback), loadMs 는 load-start 부터 모델을 다 받아 푼 때까지
 * (first-frame 에만 — 관찰 쪽 '불러오기').
 */
export type TeacherLayerSignal = {
  type: "load-start" | "first-frame" | "fallback" | "dispose";
  reason?: LayerFallback;
  ms?: number;
  loadMs?: number;
};

/** 3D 그림 층(avatar-3d)이 그림 층 보관 조각에 알리는 일. */
export type AvatarCallbacks = {
  /** 모델을 올린 뒤 첫 장을 그렸다(한 번). */
  onFirstFrame(): void;
  /** 3D 맥락을 잃었거나 장 그리기 안에서 오류가 났다(다시 불러오기 안내 없음 — C122). */
  onFailure(reason: "context-lost"): void;
};

/** 3D 그림 층 손잡이. 보관 조각은 이 꼴로만 다룬다(three 를 형으로도 가져오지 않게 — 의존 규칙 three-only-in-avatar). */
export interface TeacherAvatarHandle {
  /** 모델을 받아 올린다. 멈췄거나(signal) 닫힌 뒤 끝나면 풀고 false. 받기 · 풀기 실패는 던진다. */
  load(url: string, signal: AbortSignal): Promise<boolean>;
  setState(state: TeacherState): void;
  setReducedMotion(reduced: boolean): void;
  /** 자원 풀기 — 한 번만(두 번째부터 아무것도 안 함), 뒤에 momo:teacher { type: "dispose" }. */
  dispose(): void;
}

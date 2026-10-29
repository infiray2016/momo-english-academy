"use client";

// 선생님 그림 층 보관 조각(선생님 화면 plan 값 14 · 위험 3 · 12 · 13, 10절 '선생님 그림' 행 · 4절 회화 세션 '선생님 창' 행 · C122 · FR-6 · FR-9).
// 세션 쪽이 판(version)을 키로 둔 회화 틀 바깥에 둔다 — 회화 틀이 판 바뀜으로 다시 그려져도 그림 층(3D 맥락 · 모델)은 세션에 하나다.
// 선생님이 있고 회화 틀이 창을 처음 보이면(want — '시작!' 화면부터, 막힘 · 쉼 화면에서는 받지 않음) 3D 를 준비하고 수업은 기다리지
// 않는다: 처음엔 초상, 첫 장을 그리면 3D(창은 '시작!'을 누른 뒤에만 바꿈), 설정 · WebGL 없음 · 불러오기 실패 · 시간 넘김 · 맥락
// 잃음이면 그 세션 끝까지 초상 + 까닭 속성(아이에게 오류 글 · 단추 없음).
// 3D 코드(three · three-vrm)는 여기서 동적 가져오기로만 받는다 — 회화 세션 밖 쪽과 회화 세션 첫 JS 에 들어가지 않는다(NFR-2 · 의존 규칙).
// 판정은 순수 함수(src/core/teacher/layer.ts)이고, 늦게 끝난 불러오기는 차례 번호로 버린다.
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  type AvatarCallbacks,
  acceptsLoad,
  fallbackState,
  LAYER_START,
  type LayerEvent,
  type LayerFallback,
  type LayerState,
  layerStep,
  TEACHER_EVENT,
  type TeacherAvatarHandle,
  type TeacherLayerSignal,
} from "@/core/teacher/layer";
import type { TeacherState } from "@/core/teacher/state";

const MS_PER_SECOND = 1000;

/** 3D 그림 층을 만드는 함수(avatar-3d 가 내보냄 — 형은 손잡이 꼴만 쓴다). */
export type CreateAvatar = (
  canvas: HTMLCanvasElement,
  callbacks: AvatarCallbacks,
) => TeacherAvatarHandle;

/** 불러오기 차례가 바깥에 기대는 것(브라우저 · 시험에서 바꿔 넣음). */
export type LayerRunDeps = {
  /** WebGL 2 맥락을 만들 수 있는가(three r180 은 WebGL 2 만). */
  hasWebgl(): boolean;
  /** 3D 코드 조각(동적 가져오기). */
  importAvatar(): Promise<{ createTeacherAvatar: CreateAvatar }>;
  createCanvas(): HTMLCanvasElement;
  /** 캔버스를 지금 창 칸에 붙인다(칸이 없으면 칸이 생길 때 붙인다). */
  mount(canvas: HTMLCanvasElement): void;
  emit(signal: TeacherLayerSignal): void;
  now(): number;
};

export type LayerRun = {
  /** 선생님 상태 · 움직임 줄이기(3D 그림 층이 생기기 전에 받은 값도 생길 때 넘김). */
  setPose(state: TeacherState, reduced: boolean): void;
  /** 회화 마무리 — 그림 층을 닫고 자원을 푼다(메모리를 일찍 풂). */
  close(): void;
  /** 보관 조각이 사라짐 — 자원 풀기(닫기와 합쳐 한 번). */
  dispose(): void;
  /** 지금 3D 캔버스(없으면 null). */
  canvas(): HTMLCanvasElement | null;
};

/**
 * 그림 층 불러오기 차례 하나. 설정 → WebGL → load-start → 코드 조각 → 그림 층 만들기 → 모델 받기 → 첫 장. 첫 장이
 * timeoutSeconds 안에 없으면 받기를 멈추고 timeout. 모든 결과는 layerStep 을 지나고, 받아들여지지 않은(늦은) 결과는 버린다.
 */
export function startTeacherLayer({
  modelUrl,
  render,
  timeoutSeconds,
  initialFallback,
  onChange,
  deps,
}: {
  modelUrl: string;
  render: "3d" | "portrait";
  timeoutSeconds: number;
  /** 같은 세션에서 앞서 대신 표시로 갔으면 그 까닭(세션 끝까지 초상). */
  initialFallback?: LayerFallback;
  onChange(state: LayerState): void;
  deps: LayerRunDeps;
}): LayerRun {
  let state: LayerState = LAYER_START;
  let avatar: TeacherAvatarHandle | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let startedAt: number | undefined;
  let loadedAt: number | undefined;
  let pose: { state: TeacherState; reduced: boolean } = {
    state: "idle",
    reduced: false,
  };

  const since = (at: number | undefined) =>
    at === undefined || startedAt === undefined ? undefined : at - startedAt;

  function teardown() {
    clearTimeout(timer);
    timer = undefined;
    controller?.abort();
    controller = null;
    avatar?.dispose();
    avatar = null;
    canvas?.remove();
    canvas = null;
  }

  function apply(event: LayerEvent): boolean {
    const next = layerStep(state, event);
    if (next === state) return false;
    state = next;
    if (next.phase === "fallback") {
      teardown();
      const ms = since(deps.now());
      deps.emit({
        type: "fallback",
        ...(next.fallback ? { reason: next.fallback } : {}),
        ...(ms === undefined ? {} : { ms }),
      });
    } else if (next.phase === "closed") {
      teardown();
    } else if (next.phase === "ready") {
      clearTimeout(timer);
      timer = undefined;
      const ms = since(deps.now());
      const loadMs = since(loadedAt);
      deps.emit({
        type: "first-frame",
        ...(ms === undefined ? {} : { ms }),
        ...(loadMs === undefined ? {} : { loadMs }),
      });
    }
    onChange(next);
    return true;
  }

  async function load(turn: number) {
    let mod: { createTeacherAvatar: CreateAvatar };
    try {
      mod = await deps.importAvatar();
    } catch {
      apply({ type: "import-failed", turn });
      return;
    }
    if (!acceptsLoad(state, turn)) return;
    const made = deps.createCanvas();
    let handle: TeacherAvatarHandle;
    try {
      handle = mod.createTeacherAvatar(made, {
        onFirstFrame: () => apply({ type: "first-frame", turn }),
        onFailure: () => apply({ type: "context-lost", turn }),
      });
    } catch {
      apply({ type: "no-webgl" });
      return;
    }
    canvas = made;
    avatar = handle;
    handle.setState(pose.state);
    handle.setReducedMotion(pose.reduced);
    deps.mount(made);
    const signal = controller?.signal ?? new AbortController().signal;
    try {
      const ok = await handle.load(modelUrl, signal);
      if (ok && acceptsLoad(state, turn)) loadedAt = deps.now();
    } catch {
      apply({ type: "load-failed", turn });
    }
  }

  if (initialFallback) {
    state = fallbackState(initialFallback);
    onChange(state);
  } else if (render === "portrait") {
    apply({ type: "setting-portrait" });
  } else if (!deps.hasWebgl()) {
    apply({ type: "no-webgl" });
  } else {
    apply({ type: "start" });
    const turn = state.turn;
    startedAt = deps.now();
    deps.emit({ type: "load-start" });
    controller = new AbortController();
    timer = setTimeout(
      () => apply({ type: "timeout", turn }),
      timeoutSeconds * MS_PER_SECOND,
    );
    void load(turn);
  }

  return {
    setPose(next, reduced) {
      pose = { state: next, reduced };
      avatar?.setState(next);
      avatar?.setReducedMotion(reduced);
    },
    close() {
      apply({ type: "close" });
    },
    dispose() {
      // 닫힌 상태로 두어 이 뒤에 오는 코드 조각 · 불러오기 · 첫 장 · 시간 넘김을 모두 버린다(알림 없이 — 보관 조각이 사라지는 중)
      state = layerStep(state, { type: "close" });
      teardown();
    },
    canvas: () => canvas,
  };
}

/** 브라우저에서 WebGL 2 맥락을 만들어 보고 바로 놓는다(그림 층 캔버스와 다른 캔버스). */
function browserHasWebgl(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function emitSignal(signal: TeacherLayerSignal) {
  window.dispatchEvent(new CustomEvent(TEACHER_EVENT, { detail: signal }));
}

/** 보관 조각이 그림 층 차례를 만드는 값(고른 선생님의 모델 · talk.teacher_render · talk.teacher_load_timeout_seconds). */
export type LayerHostConfig = {
  modelUrl: string;
  render: "3d" | "portrait";
  timeoutSeconds: number;
};

/** 창이 보는 그림 층 모습. */
export type LayerView = {
  render: "3d" | "portrait";
  fallback?: LayerFallback;
};

/** 보관 조각의 몸(React 밖 — 단위 시험이 돌린다). */
export type LayerHost = {
  /** 선생님 · 설정(고르기 전 null). 바뀌면 지금 차례를 풀고 새 차례를 만든다(창이 원한 뒤에만). */
  configure(config: LayerHostConfig | null): void;
  /**
   * 창이 처음 보임 — 이 뒤에만 차례를 시작한다(설정 → WebGL → 코드 조각). 회화 틀은 막힘 · 쉼 판정이 끝난 뒤 창이 보일 때 부른다
   * (막힘 · 쉼 화면에서는 3D 를 받지 않음 — 검토 4 M-1). 두 번째부터는 아무 일도 하지 않는다.
   */
  want(): void;
  /** 창 안 칸(ref) — 3D 캔버스를 붙인다(칸이 바뀌면 옮김). */
  attach(slot: HTMLElement | null): void;
  setPose(state: TeacherState, reduced: boolean): void;
  close(): void;
  /** 보관 조각이 사라짐 — 지금 차례를 풀고 설정을 잊는다(다시 붙으면 configure 로 새 차례, 대신 표시 까닭 · 상태는 기억). */
  dispose(): void;
  canvas(): HTMLCanvasElement | null;
};

/**
 * 보관 조각의 몸. 선생님(configure)과 창의 원함(want)이 둘 다 있을 때 그림 층 차례를 시작한다. 한 번 간 대신 표시 까닭과 마지막
 * 상태 · 움직임 줄이기는 차례를 다시 만들어도 넘긴다(세션 끝까지 초상 · 회화 틀의 효과가 차례보다 먼저 돌 수 있음).
 */
export function createLayerHost({
  onView,
  deps,
}: {
  onView(view: LayerView): void;
  deps: Omit<LayerRunDeps, "mount">;
}): LayerHost {
  let config: LayerHostConfig | null = null;
  let wanted = false;
  let slot: HTMLElement | null = null;
  let run: LayerRun | null = null;
  /** 이 세션에서 간 대신 표시 까닭(그림 층 차례를 다시 만들어도 세션 끝까지 초상). */
  let fallen: LayerFallback | undefined;
  /** 마지막으로 받은 상태 · 움직임 줄이기(새 차례에 넘긴다). */
  let pose: { state: TeacherState; reduced: boolean } = {
    state: "idle",
    reduced: false,
  };

  function restart() {
    run?.dispose();
    run = null;
    if (!config || !wanted) return;
    const layer = startTeacherLayer({
      ...config,
      initialFallback: fallen,
      onChange: (s) => {
        if (s.fallback) fallen = s.fallback;
        onView(
          s.fallback
            ? { render: s.render, fallback: s.fallback }
            : { render: s.render },
        );
      },
      deps: {
        ...deps,
        mount: (canvas) => {
          slot?.appendChild(canvas);
        },
      },
    });
    layer.setPose(pose.state, pose.reduced);
    run = layer;
  }

  return {
    configure(next) {
      if (
        next?.modelUrl === config?.modelUrl &&
        next?.render === config?.render &&
        next?.timeoutSeconds === config?.timeoutSeconds
      )
        return;
      config = next;
      restart();
    },
    want() {
      if (wanted) return;
      wanted = true;
      restart();
    },
    attach(el) {
      slot = el;
      const canvas = run?.canvas();
      if (el && canvas && canvas.parentElement !== el) el.appendChild(canvas);
    },
    setPose(state, reduced) {
      pose = { state, reduced };
      run?.setPose(state, reduced);
    },
    close() {
      run?.close();
    },
    dispose() {
      run?.dispose();
      run = null;
      config = null;
    },
    canvas: () => run?.canvas() ?? null,
  };
}

/** 브라우저의 그림 층 바깥(보관 조각이 쓴다). */
const BROWSER_DEPS: Omit<LayerRunDeps, "mount"> = {
  hasWebgl: browserHasWebgl,
  importAvatar: () => import("@/components/teacher/avatar-3d"),
  createCanvas: () => {
    const canvas = document.createElement("canvas");
    canvas.dataset.teacherCanvas = "";
    canvas.className = "block size-full";
    return canvas;
  },
  emit: emitSignal,
  now: () => performance.now(),
};

/** 창이 읽는 그림 층 값. */
export type TeacherLayerValue = LayerView &
  Pick<LayerHost, "want" | "attach" | "setPose" | "close">;

export const TeacherLayerContext = createContext<TeacherLayerValue | null>(
  null,
);

/** 그림 층 공유 값(보관 조각 밖이면 null — 창은 늘 초상). */
export function useTeacherLayer(): TeacherLayerValue | null {
  return useContext(TeacherLayerContext);
}

/**
 * 그림 층 보관 조각. teacher(고른 선생님 — 고르기 전 null)가 있고 창이 그림 층을 원하면(want) 그림 층 차례를 시작하고, 사라질 때
 * 자원을 푼다. settings 는 talk.teacher_render · talk.teacher_load_timeout_seconds.
 */
export function TeacherLayerHost({
  teacher,
  settings,
  children,
}: {
  teacher: { modelPath: string } | null;
  settings: { render: "3d" | "portrait"; loadTimeoutSeconds: number };
  children: ReactNode;
}) {
  const [view, setView] = useState<LayerView>({ render: "portrait" });
  const [host] = useState(() =>
    createLayerHost({ onView: setView, deps: BROWSER_DEPS }),
  );
  const modelUrl = teacher?.modelPath;
  const render = settings.render;
  const timeoutSeconds = settings.loadTimeoutSeconds;

  useEffect(() => {
    host.configure(modelUrl ? { modelUrl, render, timeoutSeconds } : null);
  }, [host, modelUrl, render, timeoutSeconds]);
  useEffect(() => () => host.dispose(), [host]);

  return (
    <TeacherLayerContext.Provider
      value={{
        ...view,
        want: host.want,
        attach: host.attach,
        setPose: host.setPose,
        close: host.close,
      }}
    >
      {children}
    </TeacherLayerContext.Provider>
  );
}

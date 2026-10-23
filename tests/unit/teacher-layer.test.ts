// 선생님 그림 층 판정 · 보관 조각의 불러오기 차례(선생님 화면 plan 값 14 · 증명 표 AC-19i 단위 몫 — 그림 층 판정 · 늦은 결과 버림).
// 판정은 순수 함수(src/core/teacher/layer.ts), 차례는 보관 조각의 몸(startTeacherLayer)을 가짜 3D · 가짜 시계로 돌린다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type CreateAvatar,
  type LayerRunDeps,
  startTeacherLayer,
} from "@/components/teacher/teacher-layer";
import {
  type AvatarCallbacks,
  acceptsLoad,
  fallbackState,
  LAYER_FALLBACKS,
  LAYER_START,
  type LayerEvent,
  type LayerState,
  layerStep,
  type TeacherLayerSignal,
} from "@/core/teacher/layer";
import type { TeacherState } from "@/core/teacher/state";

const run = (events: LayerEvent[], from: LayerState = LAYER_START) =>
  events.reduce(layerStep, from);
const loading = run([{ type: "start" }]);

describe("그림 층 판정(layerStep)", () => {
  it("AC-19i 그림 층 판정: 처음은 까닭 없는 초상이고 시작하면 초상인 채 불러오고 첫 장을 그리면 3D 다", () => {
    expect(LAYER_START).toEqual({ render: "portrait", turn: 0, phase: "idle" });
    expect(loading).toEqual({ render: "portrait", turn: 1, phase: "loading" });
    expect(loading.fallback).toBeUndefined();
    expect(run([{ type: "first-frame", turn: 1 }], loading)).toEqual({
      render: "3d",
      turn: 1,
      phase: "ready",
    });
  });

  it("AC-19i 그림 층 판정: 대신 표시 까닭 다섯(설정 · WebGL 없음 · 코드 조각 실패 · 모델 실패 · 시간 넘김 · 맥락 잃음)이 초상과 그 까닭이 된다", () => {
    expect(LAYER_FALLBACKS).toEqual([
      "no-webgl",
      "load-failed",
      "timeout",
      "context-lost",
      "setting",
    ]);
    const cases: [LayerState, LayerEvent, string][] = [
      [LAYER_START, { type: "setting-portrait" }, "setting"],
      [LAYER_START, { type: "no-webgl" }, "no-webgl"],
      [loading, { type: "no-webgl" }, "no-webgl"],
      [loading, { type: "import-failed", turn: 1 }, "load-failed"],
      [loading, { type: "load-failed", turn: 1 }, "load-failed"],
      [loading, { type: "timeout", turn: 1 }, "timeout"],
      [loading, { type: "context-lost", turn: 1 }, "context-lost"],
      [
        run([{ type: "first-frame", turn: 1 }], loading),
        { type: "context-lost", turn: 1 },
        "context-lost",
      ],
    ];
    for (const [from, event, reason] of cases) {
      const next = layerStep(from, event);
      expect(next.render, event.type).toBe("portrait");
      expect(next.fallback, event.type).toBe(reason);
      expect(next.phase, event.type).toBe("fallback");
    }
  });

  it("AC-19i 그림 층 판정: 한 번 초상으로 가면 다시 시작 · 첫 장 · 다른 실패가 와도 그 세션 끝까지 같은 까닭의 초상이다", () => {
    const failed = run([{ type: "timeout", turn: 1 }], loading);
    for (const event of [
      { type: "start" },
      { type: "first-frame", turn: 1 },
      { type: "first-frame", turn: 2 },
      { type: "context-lost", turn: 1 },
      { type: "no-webgl" },
      { type: "setting-portrait" },
      { type: "close" },
    ] as LayerEvent[]) {
      expect(layerStep(failed, event), event.type).toBe(failed);
    }
    expect(fallbackState("no-webgl")).toEqual({
      render: "portrait",
      fallback: "no-webgl",
      turn: 0,
      phase: "fallback",
    });
  });

  it("AC-19i 늦은 결과 버림: 지난 차례 번호의 첫 장 · 실패 · 시간 넘김은 버리고 지금 차례만 받는다", () => {
    // 선생님을 바꿔 다시 시작(차례 2) — 차례 1 의 결과는 늦게 온 것
    const second = run([{ type: "start" }], loading);
    expect(second.turn).toBe(2);
    for (const type of [
      "first-frame",
      "load-failed",
      "import-failed",
      "timeout",
      "context-lost",
    ] as const) {
      expect(layerStep(second, { type, turn: 1 }), type).toBe(second);
    }
    expect(acceptsLoad(second, 1)).toBe(false);
    expect(acceptsLoad(second, 2)).toBe(true);
    expect(layerStep(second, { type: "first-frame", turn: 2 }).render).toBe(
      "3d",
    );
  });

  it("AC-19i 늦은 결과 버림: 회화 마무리에서 닫은 뒤 온 첫 장 · 실패는 버리고 닫힌 그림 층은 까닭 없는 초상이다", () => {
    const closed = run([{ type: "close" }], loading);
    expect(closed).toEqual({ render: "portrait", turn: 2, phase: "closed" });
    expect(layerStep(closed, { type: "first-frame", turn: 1 })).toBe(closed);
    expect(layerStep(closed, { type: "load-failed", turn: 1 })).toBe(closed);
    expect(layerStep(closed, { type: "start" })).toBe(closed);
    expect(acceptsLoad(closed, 1)).toBe(false);
    const readyClosed = run(
      [{ type: "first-frame", turn: 1 }, { type: "close" }],
      loading,
    );
    expect(readyClosed.render).toBe("portrait");
    expect(readyClosed.fallback).toBeUndefined();
  });

  it("AC-19i 그림 층 판정: 3D 가 된 뒤 시간 넘김 · 불러오기 실패는 버리고 불러오기 전 첫 장은 받지 않는다", () => {
    const ready = run([{ type: "first-frame", turn: 1 }], loading);
    expect(layerStep(ready, { type: "timeout", turn: 1 })).toBe(ready);
    expect(layerStep(ready, { type: "load-failed", turn: 1 })).toBe(ready);
    expect(layerStep(ready, { type: "first-frame", turn: 1 })).toBe(ready);
    expect(layerStep(LAYER_START, { type: "first-frame", turn: 0 })).toBe(
      LAYER_START,
    );
  });
});

// ── 보관 조각의 불러오기 차례(가짜 3D) ──

type FakeAvatar = {
  callbacks: AvatarCallbacks;
  states: TeacherState[];
  reduced: boolean[];
  disposed: number;
  signal: AbortSignal | undefined;
  url: string | undefined;
  resolveLoad(ok: boolean): void;
  rejectLoad(error: Error): void;
};

type Harness = {
  deps: LayerRunDeps;
  signals: TeacherLayerSignal[];
  avatars: FakeAvatar[];
  mounted: unknown[];
  imports: number;
  resolveImport(): void;
  rejectImport(): void;
};

function harness({
  webgl = true,
  throwOnCreate = false,
}: {
  webgl?: boolean;
  throwOnCreate?: boolean;
} = {}): Harness {
  const signals: TeacherLayerSignal[] = [];
  const avatars: FakeAvatar[] = [];
  const mounted: unknown[] = [];
  let importDone: { resolve(): void; reject(): void } | undefined;
  const createTeacherAvatar: CreateAvatar = (_canvas, callbacks) => {
    if (throwOnCreate) throw new Error("맥락을 못 만듦");
    let settle: { resolve(ok: boolean): void; reject(e: Error): void } = {
      resolve: () => {},
      reject: () => {},
    };
    const fake: FakeAvatar = {
      callbacks,
      states: [],
      reduced: [],
      disposed: 0,
      signal: undefined,
      url: undefined,
      resolveLoad: (ok) => settle.resolve(ok),
      rejectLoad: (e) => settle.reject(e),
    };
    avatars.push(fake);
    return {
      load(url, signal) {
        fake.url = url;
        fake.signal = signal;
        return new Promise<boolean>((resolve, reject) => {
          settle = { resolve, reject };
        });
      },
      setState: (s) => fake.states.push(s),
      setReducedMotion: (r) => fake.reduced.push(r),
      dispose() {
        fake.disposed += 1;
      },
    };
  };
  const h: Harness = {
    signals,
    avatars,
    mounted,
    imports: 0,
    resolveImport: () => importDone?.resolve(),
    rejectImport: () => importDone?.reject(),
    deps: {
      hasWebgl: () => webgl,
      importAvatar: () => {
        h.imports += 1;
        return new Promise((resolve, reject) => {
          importDone = {
            resolve: () => resolve({ createTeacherAvatar }),
            reject: () => reject(new Error("조각 없음")),
          };
        });
      },
      createCanvas: () =>
        ({ remove: () => {} }) as unknown as HTMLCanvasElement,
      mount: (canvas) => mounted.push(canvas),
      emit: (signal) => signals.push(signal),
      now: () => Date.now(),
    },
  };
  return h;
}

const MODEL = "/teachers/mina.1a2b3c4d.vrm";
const TIMEOUT_SECONDS = 6;
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

function start(h: Harness, over: { render?: "3d" | "portrait" } = {}) {
  const states: LayerState[] = [];
  const layer = startTeacherLayer({
    modelUrl: MODEL,
    render: over.render ?? "3d",
    timeoutSeconds: TIMEOUT_SECONDS,
    onChange: (s) => states.push(s),
    deps: h.deps,
  });
  return { layer, states, last: () => states.at(-1) };
}

describe("그림 층 보관 조각의 불러오기 차례(startTeacherLayer)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-19i 설정 talk.teacher_render=portrait 면 3D 코드 조각 · 모델을 받지 않고 'setting' 초상이다", async () => {
    const h = harness();
    const { last } = start(h, { render: "portrait" });
    await flush();
    expect(h.imports).toBe(0);
    expect(h.avatars).toHaveLength(0);
    expect(last()).toMatchObject({ render: "portrait", fallback: "setting" });
    expect(h.signals).toEqual([{ type: "fallback", reason: "setting" }]);
  });

  it("AC-19i WebGL 2 맥락을 못 만드는 기기면 3D 코드 조각을 받지 않고 'no-webgl' 초상이다", async () => {
    const h = harness({ webgl: false });
    const { last } = start(h);
    await flush();
    expect(h.imports).toBe(0);
    expect(last()).toMatchObject({ render: "portrait", fallback: "no-webgl" });
    expect(h.signals.map((s) => s.type)).toEqual(["fallback"]);
  });

  it("AC-19i 3D 코드 조각을 못 받거나 모델 받기 · 풀기가 실패하면 'load-failed' 초상이고 3D 자원을 푼다", async () => {
    const a = harness();
    const first = start(a);
    a.rejectImport();
    await flush();
    expect(first.last()).toMatchObject({ fallback: "load-failed" });

    const b = harness();
    const second = start(b);
    b.resolveImport();
    await flush();
    const avatar = b.avatars[0];
    expect(avatar?.url).toBe(MODEL);
    avatar?.rejectLoad(new Error("404"));
    await flush();
    expect(second.last()).toMatchObject({
      render: "portrait",
      fallback: "load-failed",
    });
    expect(avatar?.disposed).toBe(1);
  });

  it("AC-19i 첫 장을 그리면 3D 이고 사건은 load-start → first-frame(시간 · 불러오기 시간) 차례다", async () => {
    const h = harness();
    const { last } = start(h);
    expect(h.signals).toEqual([{ type: "load-start" }]);
    h.resolveImport();
    await flush();
    expect(h.mounted).toHaveLength(1);
    const avatar = h.avatars[0];
    vi.advanceTimersByTime(1200);
    avatar?.resolveLoad(true);
    await flush();
    vi.advanceTimersByTime(30);
    avatar?.callbacks.onFirstFrame();
    expect(last()).toEqual({ render: "3d", turn: 1, phase: "ready" });
    expect(h.signals.at(-1)).toEqual({
      type: "first-frame",
      ms: 1230,
      loadMs: 1200,
    });
    // 3D 가 된 뒤에는 시간 넘김이 없다
    vi.advanceTimersByTime(TIMEOUT_SECONDS * 1000);
    expect(last()?.render).toBe("3d");
  });

  it("AC-19i 늦은 결과 버림: talk.teacher_load_timeout_seconds 안에 첫 장이 없으면 받기를 멈추고 'timeout' 초상이며 그 뒤 끝난 불러오기 · 첫 장은 버린다", async () => {
    const h = harness();
    const { last, states } = start(h);
    h.resolveImport();
    await flush();
    const avatar = h.avatars[0];
    vi.advanceTimersByTime(TIMEOUT_SECONDS * 1000);
    expect(last()).toMatchObject({ render: "portrait", fallback: "timeout" });
    expect(avatar?.signal?.aborted).toBe(true);
    expect(avatar?.disposed).toBe(1);
    const seen = states.length;
    // 늦게 끝난 불러오기 · 첫 장
    avatar?.resolveLoad(true);
    await flush();
    avatar?.callbacks.onFirstFrame();
    expect(states).toHaveLength(seen);
    expect(last()?.render).toBe("portrait");
    expect(h.signals.filter((s) => s.type === "first-frame")).toHaveLength(0);
    expect(h.signals.filter((s) => s.type === "fallback")).toEqual([
      { type: "fallback", reason: "timeout", ms: TIMEOUT_SECONDS * 1000 },
    ]);
  });

  it("AC-19i 늦은 결과 버림: 시간 넘김 뒤에 온 3D 코드 조각으로는 3D 그림 층을 만들지 않는다", async () => {
    const h = harness();
    const { last } = start(h);
    vi.advanceTimersByTime(TIMEOUT_SECONDS * 1000);
    h.resolveImport();
    await flush();
    expect(h.avatars).toHaveLength(0);
    expect(h.mounted).toHaveLength(0);
    expect(last()).toMatchObject({ fallback: "timeout" });
  });

  it("AC-19i 3D 가 된 뒤 맥락을 잃으면 'context-lost' 초상이고 3D 그림 층을 한 번 푼다", async () => {
    const h = harness();
    const { last } = start(h);
    h.resolveImport();
    await flush();
    const avatar = h.avatars[0];
    avatar?.resolveLoad(true);
    await flush();
    avatar?.callbacks.onFirstFrame();
    avatar?.callbacks.onFailure("context-lost");
    expect(last()).toMatchObject({
      render: "portrait",
      fallback: "context-lost",
    });
    expect(avatar?.disposed).toBe(1);
  });

  it("AC-19i WebGL 검사를 지났어도 3D 그림 층을 만들다 던지면 'no-webgl' 초상이다", async () => {
    const h = harness({ throwOnCreate: true });
    const { last } = start(h);
    h.resolveImport();
    await flush();
    expect(last()).toMatchObject({ fallback: "no-webgl" });
  });

  it("AC-19i 회화 마무리에서 닫으면 까닭 없는 초상이고 자원 풀기는 닫기 · 보관 조각 사라짐을 합쳐 한 번이며 닫은 뒤 온 첫 장은 버린다", async () => {
    const h = harness();
    const { layer, last } = start(h);
    h.resolveImport();
    await flush();
    const avatar = h.avatars[0];
    avatar?.resolveLoad(true);
    await flush();
    avatar?.callbacks.onFirstFrame();
    layer.close();
    expect(last()).toEqual({ render: "portrait", turn: 2, phase: "closed" });
    layer.dispose();
    expect(avatar?.disposed).toBe(1);
    avatar?.callbacks.onFirstFrame();
    expect(last()?.phase).toBe("closed");
  });

  it("AC-19i 늦은 결과 버림: 보관 조각이 사라진 뒤 온 3D 코드 조각 · 끝난 불러오기로는 그림 층을 만들거나 바꾸지 않는다", async () => {
    const early = harness();
    const first = start(early);
    first.layer.dispose();
    early.resolveImport();
    await flush();
    expect(early.avatars).toHaveLength(0);
    expect(early.mounted).toHaveLength(0);

    const late = harness();
    const second = start(late);
    late.resolveImport();
    await flush();
    const avatar = late.avatars[0];
    const seen = second.states.length;
    second.layer.dispose();
    expect(avatar?.disposed).toBe(1);
    expect(avatar?.signal?.aborted).toBe(true);
    avatar?.resolveLoad(true);
    await flush();
    avatar?.callbacks.onFirstFrame();
    vi.advanceTimersByTime(TIMEOUT_SECONDS * 1000);
    expect(second.states).toHaveLength(seen);
    expect(late.signals.map((s) => s.type)).toEqual(["load-start"]);
  });

  it("AC-19i 선생님 상태 · 움직임 줄이기는 3D 그림 층이 생기기 전에 받은 값도 그대로 넘긴다", async () => {
    const h = harness();
    const { layer } = start(h);
    layer.setPose("listening", true);
    h.resolveImport();
    await flush();
    const avatar = h.avatars[0];
    expect(avatar?.states.at(-1)).toBe("listening");
    expect(avatar?.reduced.at(-1)).toBe(true);
    layer.setPose("praise", false);
    expect(avatar?.states.at(-1)).toBe("praise");
    expect(avatar?.reduced.at(-1)).toBe(false);
  });
});

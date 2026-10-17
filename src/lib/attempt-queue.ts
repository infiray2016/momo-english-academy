// 시도 대기열(8절 네트워크 끊김 '진행 중 세션의 답만 기기에 쌓는다' · 같은 시도 id 는 한 번만, plan-p10b 파일별 값 8 · 위험 10).
// 시도는 기기가 만든 시도 id 와 함께 이 브라우저의 localStorage 에 쌓고 곧바로 보낸다. 보내기가 실패하면 남겨 두고
// 다시 연결(online)될 때와 다음 넣기 때 다시 보낸다. 서버가 받았다고 돌려준 id 만 지운다(서버가 세션 소유 · 진행을 본다).
// localStorage 를 못 쓰면 메모리로만 쌓는다. 대기열 키는 기기 하나에 하나다. 순수 함수와 감싼 대기열로 나눴다(단위 시험).
// 'use client' 를 두지 않는다 — 브라우저 API 는 부르는 쪽이 넘긴다(storage · onlineTarget).

/** 저장 키(제안, 판 1). */
export const ATTEMPT_QUEUE_KEY = "momo.attempts.v1";

export type QueuedAttempt = {
  clientAttemptId: string;
  sessionId: string;
  activityNo: number;
  input: unknown;
};
export type QueueState = { items: QueuedAttempt[] };

/** 쌓기(같은 시도 id 는 한 번만). */
export function queueAdd(
  state: QueueState,
  attempt: QueuedAttempt,
): QueueState {
  if (state.items.some((a) => a.clientAttemptId === attempt.clientAttemptId))
    return state;
  return { items: [...state.items, attempt] };
}

/** 서버가 받은 id 를 지운다. */
export function queueAccept(
  state: QueueState,
  ids: readonly string[],
): QueueState {
  const accepted = new Set(ids);
  return {
    items: state.items.filter((a) => !accepted.has(a.clientAttemptId)),
  };
}

/** 아직 보내지 못한(받았다는 답이 없는) 시도. */
export function queuePending(state: QueueState): QueuedAttempt[] {
  return [...state.items];
}

function load(storage: Storage | undefined): QueueState {
  try {
    const raw = storage?.getItem(ATTEMPT_QUEUE_KEY);
    if (!raw) return { items: [] };
    const parsed = JSON.parse(raw) as { items?: unknown };
    if (!Array.isArray(parsed.items)) return { items: [] };
    return {
      items: parsed.items.filter(
        (a): a is QueuedAttempt =>
          typeof a === "object" &&
          a !== null &&
          typeof (a as QueuedAttempt).clientAttemptId === "string" &&
          typeof (a as QueuedAttempt).sessionId === "string" &&
          typeof (a as QueuedAttempt).activityNo === "number",
      ),
    };
  } catch {
    return { items: [] };
  }
}

function save(storage: Storage | undefined, state: QueueState): void {
  try {
    storage?.setItem(ATTEMPT_QUEUE_KEY, JSON.stringify(state));
  } catch {
    // 저장할 수 없으면 메모리에만 남는다
  }
}

export type AttemptQueue = {
  /** 쌓고 곧바로 보낸다(실패해도 던지지 않는다 — 남겨 두고 다시 보냄). */
  add(attempt: QueuedAttempt): Promise<void>;
  /** 남은 것을 보낸다. */
  flush(): Promise<void>;
  pending(): QueuedAttempt[];
  /** 지금 보내는 중이면 그것이 끝날 때까지 기다린다(시험 · 화면 떠나기 전). */
  idle(): Promise<void>;
  dispose(): void;
};

/**
 * 감싼 대기열. send 는 시도 묶음을 서버에 보내고 받은 id 목록을 돌려준다(서버 액션 saveAttempts).
 * onlineTarget 이 있으면 'online' 이벤트에 다시 보낸다(브라우저는 window).
 */
export function createAttemptQueue({
  storage,
  send,
  onlineTarget,
}: {
  storage: Storage | undefined;
  send: (batch: QueuedAttempt[]) => Promise<readonly string[]>;
  onlineTarget?: EventTarget;
}): AttemptQueue {
  let state = load(storage);
  let running: Promise<void> | undefined;
  let again = false;

  async function sendOnce(): Promise<void> {
    const batch = queuePending(state);
    if (batch.length === 0) return;
    try {
      const accepted = await send(batch);
      // 다시 읽어 그 사이 쌓인 것과 합친다(같은 기기의 다른 쪽이 쌓았을 수 있다)
      state = queueAccept(mergeStates(load(storage), state), accepted);
      save(storage, state);
    } catch {
      // 끊김 · 서버 오류 — 남겨 두고 다음에 다시 보낸다
    }
  }

  function flush(): Promise<void> {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      do {
        again = false;
        await sendOnce();
      } while (again);
    })().finally(() => {
      running = undefined;
    });
    return running;
  }

  const onOnline = () => {
    void flush();
  };
  onlineTarget?.addEventListener("online", onOnline);

  return {
    async add(attempt) {
      state = queueAdd(state, attempt);
      save(storage, state);
      await flush();
    },
    flush,
    pending: () => queuePending(state),
    idle: async () => {
      while (running) await running;
    },
    dispose() {
      onlineTarget?.removeEventListener("online", onOnline);
    },
  };
}

function mergeStates(a: QueueState, b: QueueState): QueueState {
  return b.items.reduce(queueAdd, a);
}

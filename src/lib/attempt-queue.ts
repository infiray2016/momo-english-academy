// 시도 대기열(8절 네트워크 끊김 '진행 중 세션의 답만 기기에 쌓는다' · 같은 시도 id 는 한 번만, plan-p10b 파일별 값 8 · 위험 10,
// plan-p11a 값 6 · 장부 M-2). 시도는 기기가 만든 시도 id 와 함께 이 브라우저의 localStorage 에 쌓고 곧바로 보낸다.
// ATTEMPTS_PER_BATCH_MAX 개씩 차례로 나눠 보내고, 한 묶음이 실패하면 남은 묶음은 다음에 처음부터 다시 보낸다(다시 연결(online) ·
// 다음 넣기 · flush). 서버가 받았다고 돌려준 id 와 꼴이 틀려 거부한 id 를 둘 다 지운다(꼴이 틀린 시도가 영영 남지 않게).
// 버린 수만 console.warn 에 남기고 입력 글은 내지 않는다. localStorage 를 못 쓰면 메모리로만 쌓는다. 대기열 키는 기기 하나에 하나다.
// 'use client' 를 두지 않는다 — 브라우저 API 는 부르는 쪽이 넘긴다(storage · onlineTarget).
import {
  ATTEMPTS_PER_BATCH_MAX,
  parseAttemptInput,
} from "@/core/session/attempt";

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

/** 보낼 묶음(차례대로 size 개씩, 서버 상한과 같은 수). */
export function queueBatches(
  items: readonly QueuedAttempt[],
  size: number = ATTEMPTS_PER_BATCH_MAX,
): QueuedAttempt[][] {
  const out: QueuedAttempt[][] = [];
  for (let at = 0; at < items.length; at += size)
    out.push(items.slice(at, at + size));
  return out;
}

/** 이 기기에 남은 그 세션의 끝 시도 활동 번호(이어 할 자리를 셀 때 서버 끝 시도와 합친다 — 값 2). */
export function queueFinals(state: QueueState, sessionId: string): number[] {
  const nos = new Set<number>();
  for (const item of state.items)
    if (
      item.sessionId === sessionId &&
      parseAttemptInput(item.input)?.step === "final"
    )
      nos.add(item.activityNo);
  return [...nos].sort((a, b) => a - b);
}

/** 서버의 답: 받은 id(이미 있던 것 · 늦은 시도 포함) · 꼴이 틀려 거부한 id. */
export type SendResult = {
  accepted: readonly string[];
  rejected: readonly string[];
};

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
  /** 이 기기에 남은 그 세션의 끝 시도 활동 번호. */
  finals(sessionId: string): number[];
  /** 지금 보내는 중이면 그것이 끝날 때까지 기다린다(시험 · 화면 떠나기 전). */
  idle(): Promise<void>;
  dispose(): void;
};

/**
 * 감싼 대기열. send 는 시도 묶음 하나를 서버에 보내고 받은 id · 거부한 id 를 돌려준다(서버 액션 saveAttempts).
 * onlineTarget 이 있으면 'online' 이벤트에 다시 보낸다(브라우저는 window).
 */
export function createAttemptQueue({
  storage,
  send,
  onlineTarget,
}: {
  storage: Storage | undefined;
  send: (batch: QueuedAttempt[]) => Promise<SendResult>;
  onlineTarget?: EventTarget;
}): AttemptQueue {
  let state = load(storage);
  let running: Promise<void> | undefined;
  let again = false;

  async function sendOnce(): Promise<void> {
    for (const batch of queueBatches(queuePending(state))) {
      let result: SendResult;
      try {
        result = await send(batch);
      } catch {
        // 끊김 · 서버 오류 — 남겨 두고 다음에 처음부터 다시 보낸다
        return;
      }
      // 다시 읽어 그 사이 쌓인 것과 합친다(같은 기기의 다른 쪽이 쌓았을 수 있다)
      state = queueAccept(mergeStates(load(storage), state), [
        ...result.accepted,
        ...result.rejected,
      ]);
      save(storage, state);
      if (result.rejected.length > 0)
        console.warn(
          `시도 ${result.rejected.length}개를 꼴이 틀려 서버가 받지 않아 버렸습니다`,
        );
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
      // 저장 전에 저장소와 합친다 — 같은 기기의 다른 탭이 끊긴 채 쌓은 답을 덮어쓰지 않게(Codex 지적 2, 2026-10-22)
      state = queueAdd(mergeStates(load(storage), state), attempt);
      save(storage, state);
      await flush();
    },
    flush,
    pending: () => queuePending(state),
    finals: (sessionId) => queueFinals(state, sessionId),
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

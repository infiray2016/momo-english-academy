// 시도 대기열(8절 '진행 중 세션의 답만 기기에 쌓는다' · 네트워크 끊김, plan-p10b 파일별 값 8 · 위험 10).
import { describe, expect, it } from "vitest";
import {
  ATTEMPT_QUEUE_KEY,
  createAttemptQueue,
  type QueuedAttempt,
  queueAccept,
  queueAdd,
  queuePending,
} from "@/lib/attempt-queue";

const attempt = (id: string, activityNo = 1): QueuedAttempt => ({
  clientAttemptId: id,
  sessionId: "s-1",
  activityNo,
  input: { shownWords: ["apple"] },
});

/** localStorage 흉내(기기 하나). */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, v),
  };
}

describe("시도 대기열", () => {
  it("세션 틀: 보내지 못한 시도는 기기에 쌓였다가 다시 보내고 받은 id 는 지운다", async () => {
    // 순수 함수: 같은 id 는 한 번만 쌓이고, 받은 id 는 빠진다
    let state = queueAdd({ items: [] }, attempt("a"));
    state = queueAdd(state, attempt("a"));
    state = queueAdd(state, attempt("b", 2));
    expect(queuePending(state).map((a) => a.clientAttemptId)).toEqual([
      "a",
      "b",
    ]);
    state = queueAccept(state, ["a"]);
    expect(queuePending(state).map((a) => a.clientAttemptId)).toEqual(["b"]);

    // 감싼 대기열: 보내기가 실패하면 기기에 남고, 다음 넣기 · 다시 연결 때 다시 보낸다
    const storage = memoryStorage();
    const sent: string[][] = [];
    let online = false;
    const send = async (batch: QueuedAttempt[]) => {
      sent.push(batch.map((a) => a.clientAttemptId));
      if (!online) throw new Error("끊김");
      return batch.map((a) => a.clientAttemptId);
    };
    const events = new EventTarget();
    const queue = createAttemptQueue({ storage, send, onlineTarget: events });
    await queue.add(attempt("a"));
    expect(queue.pending().map((a) => a.clientAttemptId)).toEqual(["a"]);
    expect(
      JSON.parse(storage.getItem(ATTEMPT_QUEUE_KEY) ?? "{}").items,
    ).toHaveLength(1);
    // 같은 기기에서 다시 열어도 남아 있다
    const reopened = createAttemptQueue({
      storage,
      send,
      onlineTarget: events,
    });
    expect(reopened.pending().map((a) => a.clientAttemptId)).toEqual(["a"]);
    reopened.dispose();
    await queue.add(attempt("b", 2));
    expect(sent.at(-1)).toEqual(["a", "b"]);
    online = true;
    events.dispatchEvent(new Event("online"));
    await queue.idle();
    expect(queue.pending()).toEqual([]);
    expect(
      JSON.parse(storage.getItem(ATTEMPT_QUEUE_KEY) ?? "{}").items,
    ).toEqual([]);
    queue.dispose();
  });

  it("시도 대기열: 서버가 받은 id 만 지우고 저장소를 못 쓰면 메모리로만 쌓는다", async () => {
    const queue = createAttemptQueue({
      storage: undefined,
      send: async (batch) => batch.slice(0, 1).map((a) => a.clientAttemptId),
    });
    await queue.add(attempt("a"));
    expect(queue.pending()).toEqual([]);
    await queue.add(attempt("b"));
    await queue.add(attempt("c"));
    // 한 번에 하나씩만 받는 서버 — 남은 것은 다음 보내기에서
    expect(queue.pending().length).toBeLessThanOrEqual(1);
    queue.dispose();
  });
});

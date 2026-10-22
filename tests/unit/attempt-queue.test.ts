// 시도 대기열(8절 '진행 중 세션의 답만 기기에 쌓는다' · 네트워크 끊김, plan-p10b 파일별 값 8 · 위험 10, plan-p11a 값 6 · 장부 M-2).
import { afterEach, describe, expect, it, vi } from "vitest";
import { ATTEMPTS_PER_BATCH_MAX } from "@/core/session/attempt";
import {
  ATTEMPT_QUEUE_KEY,
  createAttemptQueue,
  type QueuedAttempt,
  queueAccept,
  queueAdd,
  queueBatches,
  queueFinals,
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
      return { accepted: batch.map((a) => a.clientAttemptId), rejected: [] };
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
      send: async (batch) => ({
        accepted: batch.slice(0, 1).map((a) => a.clientAttemptId),
        rejected: [],
      }),
    });
    await queue.add(attempt("a"));
    expect(queue.pending()).toEqual([]);
    await queue.add(attempt("b"));
    await queue.add(attempt("c"));
    // 한 번에 하나씩만 받는 서버 — 남은 것은 다음 보내기에서
    expect(queue.pending().length).toBeLessThanOrEqual(1);
    queue.dispose();
  });

  it("대기열: 50개씩 나눠 보내고 거부된 id 도 지운다", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const total = ATTEMPTS_PER_BATCH_MAX * 2 + 1;
    const secret = "아이가 말한 글";
    const items = Array.from({ length: total }, (_, i) => ({
      ...attempt(`id-${i}`, i + 1),
      input: {
        v: 1,
        kind: "repeat-word",
        step: "final",
        heard: [secret],
        failures: 0,
      },
    }));
    // 순수 함수: 상한 크기로 차례대로 나눈다
    expect(queueBatches(items).map((b) => b.length)).toEqual([
      ATTEMPTS_PER_BATCH_MAX,
      ATTEMPTS_PER_BATCH_MAX,
      1,
    ]);
    const sizes: number[] = [];
    let online = false;
    const rejectedIds = new Set(["id-3", "id-10"]);
    const queue = createAttemptQueue({
      storage: memoryStorage(),
      send: async (batch) => {
        if (!online) throw new Error("끊김");
        sizes.push(batch.length);
        const ids = batch.map((a) => a.clientAttemptId);
        return {
          accepted: ids.filter((id) => !rejectedIds.has(id)),
          rejected: ids.filter((id) => rejectedIds.has(id)),
        };
      },
    });
    for (const item of items) await queue.add(item);
    expect(queue.pending()).toHaveLength(total);
    online = true;
    await queue.flush();
    expect(sizes).toEqual([ATTEMPTS_PER_BATCH_MAX, ATTEMPTS_PER_BATCH_MAX, 1]);
    // 받은 id 와 거부된 id 를 둘 다 지운다(꼴이 틀린 시도가 영영 남지 않게)
    expect(queue.pending()).toEqual([]);
    // 버린 시도는 수만 남기고 입력 글은 내지 않는다
    const logged = warn.mock.calls.flat().join(" ");
    expect(logged).toContain(String(rejectedIds.size));
    expect(logged).not.toContain(secret);
    queue.dispose();
  });

  it("대기열: 앞 묶음이 실패하면 뒤 묶음은 보내지 않고 다음에 처음부터 보낸다", async () => {
    let calls = 0;
    const queue = createAttemptQueue({
      storage: undefined,
      send: async (batch) => {
        calls += 1;
        throw new Error(`끊김 ${batch.length}`);
      },
    });
    for (let i = 0; i < ATTEMPTS_PER_BATCH_MAX + 1; i += 1)
      await queue.add(attempt(`x-${i}`));
    calls = 0;
    await queue.flush();
    expect(calls).toBe(1);
    expect(queue.pending()).toHaveLength(ATTEMPTS_PER_BATCH_MAX + 1);
    queue.dispose();
  });

  it("대기열: 이 기기에 남은 그 세션의 끝 시도 활동 번호를 낸다(진행 시도 · 다른 세션은 빼고 P10 미리보기 시도는 끝)", () => {
    let state = queueAdd({ items: [] }, attempt("p", 1));
    state = queueAdd(state, {
      clientAttemptId: "q",
      sessionId: "s-1",
      activityNo: 3,
      input: { v: 1, kind: "reading-question", step: "final", tries: [1] },
    });
    state = queueAdd(state, {
      clientAttemptId: "r",
      sessionId: "s-1",
      activityNo: 4,
      input: { v: 1, kind: "reading-question", step: "progress", tries: [1] },
    });
    state = queueAdd(state, { ...attempt("o", 2), sessionId: "s-2" });
    expect(queueFinals(state, "s-1")).toEqual([1, 3]);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("시도 대기열 · 여러 탭", () => {
  it("대기열: 한 기기 저장소를 쓰는 두 쪽(탭)이 끊긴 채 각각 쌓아도 둘 다 남는다", async () => {
    // Codex 지적 2(review-codex-2026-10-19 판정 2) — 나중 탭이 앞 탭 답을 덮어쓰지 않게 저장 전에 저장소와 합친다
    const storage = memoryStorage();
    const offline = async () => {
      throw new Error("offline");
    };
    const tabA = createAttemptQueue({ storage, send: offline });
    const tabB = createAttemptQueue({ storage, send: offline });
    await tabA.add(attempt("a"));
    await tabB.add(attempt("b"));
    const stored = JSON.parse(storage.getItem(ATTEMPT_QUEUE_KEY) ?? "{}") as {
      items: QueuedAttempt[];
    };
    expect(stored.items.map((i) => i.clientAttemptId).sort()).toEqual([
      "a",
      "b",
    ]);
    // 다시 연 쪽은 둘 다 본다
    const reopened = createAttemptQueue({ storage, send: offline });
    expect(
      reopened
        .pending()
        .map((i) => i.clientAttemptId)
        .sort(),
    ).toEqual(["a", "b"]);
  });
});

// 활동 안 입력 되살리기(plan-p11a 값 6 · AC-6a 바탕): 같은 기기면 활동 안 입력까지 되살린다. 저장 키 하나에 세션 · 활동마다.
import { describe, expect, it } from "vitest";
import {
  createSessionInputStore,
  SESSION_INPUT_KEY,
} from "@/lib/session-input";

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

describe("활동 안 입력", () => {
  it("활동 안 입력: 세션 · 활동마다 조각 상태를 쓰고 다시 열면 읽으며 끝 시도 · 세션 끝에 지운다", () => {
    const storage = memoryStorage();
    const store = createSessionInputStore(storage);
    expect(store.read("s-1", 3)).toBeUndefined();
    store.write("s-1", 3, { tries: [2] });
    store.write("s-1", 4, { tappedWords: ["bababa"] });
    store.write("s-2", 3, { tries: [1] });
    // 같은 기기에서 다시 열면 그대로
    const reopened = createSessionInputStore(storage);
    expect(reopened.read("s-1", 3)).toEqual({ tries: [2] });
    expect(JSON.parse(storage.getItem(SESSION_INPUT_KEY) ?? "{}")).toEqual({
      "s-1": { "3": { tries: [2] }, "4": { tappedWords: ["bababa"] } },
      "s-2": { "3": { tries: [1] } },
    });
    // 끝 시도를 대기열에 넣으면 그 활동만, 세션이 끝나면 세션 전체를 지운다
    reopened.clear("s-1", 3);
    expect(reopened.read("s-1", 3)).toBeUndefined();
    expect(reopened.read("s-1", 4)).toEqual({ tappedWords: ["bababa"] });
    reopened.clear("s-1");
    expect(reopened.read("s-1", 4)).toBeUndefined();
    expect(reopened.read("s-2", 3)).toEqual({ tries: [1] });
  });

  it("활동 안 입력: 저장소를 못 쓰거나 글이 깨졌으면 메모리로만 둔다", () => {
    const broken = memoryStorage();
    broken.setItem(SESSION_INPUT_KEY, "{not json");
    const store = createSessionInputStore(broken);
    expect(store.read("s-1", 1)).toBeUndefined();
    const none = createSessionInputStore(undefined);
    none.write("s-1", 2, { tries: [1] });
    expect(none.read("s-1", 2)).toEqual({ tries: [1] });
    const throwing = {
      ...memoryStorage(),
      getItem: () => {
        throw new Error("막힘");
      },
      setItem: () => {
        throw new Error("막힘");
      },
    } as Storage;
    const fallback = createSessionInputStore(throwing);
    fallback.write("s-1", 2, { tries: [3] });
    expect(fallback.read("s-1", 2)).toEqual({ tries: [3] });
  });
});

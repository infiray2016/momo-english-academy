// 활동 안 입력 되살리기(plan-p11a 값 6 · 4절 '닫았다 열면 같은 자리' · AC-6a). 같은 기기에서 세션을 다시 열면 그 활동 안
// 입력(고른 보기 · 누른 낱말 · 놓은 카드 …)까지 되살린다. 저장 키 하나에 { [세션 id]: { [활동 번호]: 조각 상태 } }.
// 조각이 바뀔 때 쓰고, 그 활동의 끝 시도를 대기열에 넣거나 세션이 끝나면 지우며, 세션 쪽을 열 때 그 프로필의 진행 세션이 아닌 줄을 지운다. 다른 기기에서 이어 하면 활동은 같고 입력은 빈 채다
// (8절 '두 번째 기기는 이어 한다'의 범위). localStorage 를 못 쓰면 메모리로만 둔다.
// 'use client' 를 두지 않는다 — 저장소는 부르는 쪽이 넘긴다(대기열과 같은 꼴).

/** 저장 키(제안, 판 1). */
export const SESSION_INPUT_KEY = "momo.session-input.v1";

type Saved = Record<string, Record<string, unknown>>;

export type SessionInputStore = {
  read(sessionId: string, activityNo: number): unknown;
  write(sessionId: string, activityNo: number, value: unknown): void;
  /** 활동 번호를 주면 그 활동만, 없으면 그 세션 전체를 지운다. */
  clear(sessionId: string, activityNo?: number): void;
  /** 남길 세션(그 프로필의 진행 세션) 밖의 줄을 지운다 — 중단 · 다른 기기에서 끝낸 세션의 입력이 기기에 쌓이지 않게(검토 review-p11-2-code M-1). */
  prune(keep: readonly string[]): void;
};

function load(storage: Storage | undefined): Saved {
  try {
    const raw = storage?.getItem(SESSION_INPUT_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Saved)
      : {};
  } catch {
    return {};
  }
}

export function createSessionInputStore(
  storage: Storage | undefined,
): SessionInputStore {
  let saved = load(storage);
  const persist = () => {
    try {
      storage?.setItem(SESSION_INPUT_KEY, JSON.stringify(saved));
    } catch {
      // 저장할 수 없으면 메모리에만 남는다
    }
  };
  return {
    read: (sessionId, activityNo) => saved[sessionId]?.[String(activityNo)],
    write(sessionId, activityNo, value) {
      saved = {
        ...saved,
        [sessionId]: { ...saved[sessionId], [String(activityNo)]: value },
      };
      persist();
    },
    clear(sessionId, activityNo) {
      const { [sessionId]: session, ...rest } = saved;
      if (activityNo === undefined || !session) saved = rest;
      else {
        const { [String(activityNo)]: _gone, ...others } = session;
        saved =
          Object.keys(others).length > 0
            ? { ...rest, [sessionId]: others }
            : rest;
      }
      persist();
    },
    prune(keep) {
      const wanted = new Set(keep);
      const next = Object.fromEntries(
        Object.entries(saved).filter(([sessionId]) => wanted.has(sessionId)),
      );
      if (Object.keys(next).length === Object.keys(saved).length) return;
      saved = next;
      persist();
    },
  };
}

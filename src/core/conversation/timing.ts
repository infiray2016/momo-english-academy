// 턴 길 준비 시간 재기(13절 C125 (4) · NFR-8 — 아이가 말을 마친 뒤 토리 첫 말까지의 서버 준비 시간). 구간마다 앞 표시부터의 ms 를
// 남긴다. 시계는 부르는 쪽이 넘긴다(서버는 performance.now). 순수 모듈이다.

export type StageTimings = {
  stages: { stage: string; ms: number }[];
  /** 처음부터 마지막 표시까지. */
  totalMs: number;
};

export function createStageTimer(now: () => number): {
  mark: (stage: string) => void;
  result: () => StageTimings;
} {
  const start = now();
  let last = start;
  const stages: { stage: string; ms: number }[] = [];
  return {
    mark(stage) {
      const at = now();
      stages.push({ stage, ms: Math.round(at - last) });
      last = at;
    },
    result: () => ({
      stages: stages.map((s) => ({ ...s })),
      totalMs: Math.round(last - start),
    }),
  };
}

/** 기록 한 줄(구간 이름과 ms 만 — 아이 글은 들지 않는다). 예: "profile 12 · state 40 · 합 52ms". */
export function stageTimingsLine(t: StageTimings): string {
  return [
    ...t.stages.map((s) => `${s.stage} ${s.ms}`),
    `합 ${t.totalMs}ms`,
  ].join(" · ");
}

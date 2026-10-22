// 턴 길 준비 시간 재기(13절 C125 (4) — 아이가 말을 마친 뒤 토리 첫 말까지의 서버 준비 시간을 구간마다 잰다). 순수 함수만 본다.
import { describe, expect, it } from "vitest";
import { createStageTimer, stageTimingsLine } from "@/core/conversation/timing";

describe("준비 시간 재기(C125 (4))", () => {
  it("준비 시간: 구간마다 앞 표시부터의 ms 와 처음부터의 합을 남긴다", () => {
    let t = 1000;
    const timer = createStageTimer(() => t);
    t = 1040;
    timer.mark("profile");
    t = 1100;
    timer.mark("state");
    t = 1350;
    timer.mark("ai_prep");
    expect(timer.result()).toEqual({
      stages: [
        { stage: "profile", ms: 40 },
        { stage: "state", ms: 60 },
        { stage: "ai_prep", ms: 250 },
      ],
      totalMs: 350,
    });
  });

  it("준비 시간: 기록 한 줄은 구간 이름과 ms 와 합만 담는다", () => {
    expect(
      stageTimingsLine({
        stages: [
          { stage: "profile", ms: 12 },
          { stage: "state", ms: 40 },
        ],
        totalMs: 52,
      }),
    ).toBe("profile 12 · state 40 · 합 52ms");
  });
});

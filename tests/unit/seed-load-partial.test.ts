// 개발 일부 받기(--partial)의 판정 · 인자 갈래(회화 plan 묶음 2 · 정한 것 15, 검토 task-talk-1-review-report M-2).
// 통합 시험(seed-load.test.ts)은 이 Mac 에서 돌지 않으므로, DB 없이 도는 판정 함수와 인자 해석을 단위로 덮는다.
import { describe, expect, it } from "vitest";
import type { SeedReport } from "@/core/seed/validate";
import { loadValidationCode } from "@/server/seed/load";
import { parseArgs } from "../../scripts/seed-load";

/** 판정에 쓰는 칸만 채운 검증 보고(나머지 칸은 판정 함수가 읽지 않는다). */
function reportOf(
  over: Partial<
    Record<"errors" | "empty" | "unchecked" | "pendingHuman", unknown[]>
  >,
): SeedReport {
  return {
    mode: "complete",
    errors: [],
    warnings: [],
    empty: [],
    unchecked: [],
    pendingHuman: [],
    ...over,
  } as unknown as SeedReport;
}

describe("AC-7a 일부 받기 판정(loadValidationCode)", () => {
  it("AC-7a 일부 받기는 완전성 빈 칸만 있으면 0 이고, 완전성 모드(일부 받기 아님)는 같은 보고에 1 이다", () => {
    const r = reportOf({ empty: [{ cell: "lesson:talk:3:1:assigned:3:1" }] });
    expect(loadValidationCode(r, true)).toBe(0);
    expect(loadValidationCode(r, false)).toBe(1);
  });
  it("AC-7a 일부 받기도 풀이 검사 안 됨 · 사람 확인 남음 · 검증 오류는 막는다(1)", () => {
    expect(
      loadValidationCode(reportOf({ unchecked: [{ cell: "x" }] }), true),
    ).toBe(1);
    expect(
      loadValidationCode(reportOf({ pendingHuman: [{ cell: "x" }] }), true),
    ).toBe(1);
    expect(
      loadValidationCode(
        reportOf({
          errors: [{ rule: "r", file: "f", path: "p", message: "m" }],
        }),
        true,
      ),
    ).toBe(1);
  });
});

describe("AC-7a 일부 받기 인자(parseArgs)", () => {
  it("AC-7a --partial 은 --reference-only 와 함께 쓰면 거부하고, --complete-through · --areas 와는 받는다", () => {
    const bad = parseArgs(["--partial", "--reference-only"]);
    expect(bad.ok).toBe(false);
    const good = parseArgs([
      "--partial",
      "--complete-through",
      "1",
      "--areas",
      "talk",
    ]);
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.args.partial).toBe(true);
  });
});

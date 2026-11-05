// 별 셈(3.5 별 행 · 요청자 결정 R12 · S6 · 13절 C166 R3 — P12 전 잠정 셈, UX 검토 3판 U4-1 fix 1).
// 끝낸 새 수업(정규 · 보강 · 연습 · 안 해 본 수업) 하나에 reward.star_complete 개. 다시 하기 · 복습 · 평가 · 배치는 없음.
// 쓰기 6단계 이상은 둘째 세션(고쳐 쓰기)을 끝낼 때, 회화는 목표 턴에 닿을 때(세션 '완료') 붙는다. 결과 · 마무리의 별과
// 홈의 '별 n개'가 같은 함수(earnsStar)를 쓴다.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { resultRewardOf } from "@/app/(child)/result/[id]/result-view";
import {
  ClosingFirst,
  closingRewardOf,
} from "@/components/conversation/closing-cards";
import { REWARD_TEXT } from "@/components/session/reward";
import { earnsStar, type StarSession, starTotalOf } from "@/core/reward/star";
import { NEW_LESSON_KINDS } from "@/core/today/done";
import { TEST_SETTINGS } from "../fixtures/settings";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/writing", () => ({}));

const PER = TEST_SETTINGS["reward.star_complete"].value;

const done = (over: Partial<StarSession> = {}): StarSession => ({
  area: "reading",
  kind: "regular",
  status: "completed",
  writingPart: null,
  ...over,
});

describe("별 셈(R12 — P12 전 잠정)", () => {
  it("U4-1 fix 1 끝낸 새 수업(정규 · 보강 · 연습 · 안 해 본 수업)만 별을 받고 다시 하기 · 복습 · 단계 평가 · 배치 평가는 받지 않는다", () => {
    for (const kind of ["regular", "remedial", "practice", "untried"] as const)
      expect(earnsStar(done({ kind })), kind).toBe(true);
    for (const kind of ["retry", "review", "level_test", "placement"] as const)
      expect(earnsStar(done({ kind })), kind).toBe(false);
  });

  it("M-3 별을 받는 종류는 오늘 완료의 새 수업 종류(NEW_LESSON_KINDS) 한 벌과 같다", () => {
    const all = [
      "regular",
      "remedial",
      "practice",
      "untried",
      "retry",
      "review",
      "level_test",
      "placement",
    ] as const;
    for (const kind of all)
      expect(earnsStar(done({ kind })), kind).toBe(NEW_LESSON_KINDS.has(kind));
  });

  it("U4-1 fix 1 끝나지 않은 세션(진행 · 중단 — 회화는 목표 턴 전 그만둔 대화)은 별이 없다", () => {
    expect(earnsStar(done({ status: "in_progress" }))).toBe(false);
    expect(earnsStar(done({ area: "talk", status: "aborted" }))).toBe(false);
    // 회화는 목표 턴에 닿으면 세션이 '완료'다
    expect(earnsStar(done({ area: "talk" }))).toBe(true);
  });

  it("U4-1 fix 1 쓰기 6단계 이상은 첫 세션(초고)이 아니라 둘째 세션(고쳐 쓰기)을 끝낼 때 별이다", () => {
    expect(earnsStar(done({ area: "writing", writingPart: "draft" }))).toBe(
      false,
    );
    expect(earnsStar(done({ area: "writing", writingPart: "rewrite" }))).toBe(
      true,
    );
    // 쓰기 1~5단계(한 세션)
    expect(earnsStar(done({ area: "writing" }))).toBe(true);
  });

  it("U4-1 fix 1 홈의 별 합은 별을 받는 세션 수 × reward.star_complete 이다(성적 · 하루 상한 없음)", () => {
    const sessions: StarSession[] = [
      done(),
      done({ area: "speaking", kind: "remedial" }),
      done({ area: "talk", kind: "practice" }),
      done({ area: "writing", writingPart: "draft" }),
      done({ area: "writing", writingPart: "rewrite" }),
      done({ kind: "retry" }),
      done({ kind: "placement" }),
      done({ area: "talk", status: "aborted" }),
    ];
    expect(starTotalOf(sessions, PER)).toBe(4 * PER);
    expect(starTotalOf([], PER)).toBe(0);
    expect(starTotalOf(sessions, 2)).toBe(8);
  });

  it("U4-1 fix 1 결과 화면의 별도 같은 셈이다 — 초고 · 다시 하기는 별이 없고 고쳐 쓰기 · 보강 · 안 해 본 수업은 별이 있다", () => {
    const view = (over: Partial<Parameters<typeof resultRewardOf>[0]>) =>
      resultRewardOf({
        area: "reading",
        kind: "regular",
        writingPart: null,
        ...over,
      });
    expect(view({})).toBe("star");
    expect(view({ kind: "remedial" })).toBe("star");
    expect(view({ kind: "untried" })).toBe("star");
    expect(view({ area: "writing", writingPart: "rewrite" })).toBe("star");
    expect(view({ area: "writing", writingPart: "draft" })).toBe("none");
    expect(view({ kind: "retry" })).toBe("retried");
  });

  it("U4-1 fix 1 · M-4 회화 마무리의 별도 같은 셈에 실제 세션 종류를 그대로 넘긴다 — 목표 턴까지 한 새 대화만", () => {
    const wrap = {
      lines: [],
      farewell: { en: "Bye!" },
      aborted: false,
      retry: false,
      kind: "regular" as const,
      starsPerLesson: PER,
      metWords: [],
      friendship: null,
      nextLesson: null,
    };
    expect(closingRewardOf(wrap)).toBe("star");
    expect(closingRewardOf({ ...wrap, kind: "remedial" })).toBe("star");
    expect(closingRewardOf({ ...wrap, aborted: true })).toBe("none");
    expect(closingRewardOf({ ...wrap, kind: "retry" })).toBe("none");
    // 평가 대화처럼 새 수업이 아닌 종류는 홈 합과 같이 별이 없다(종류를 지어 넘기지 않음)
    expect(closingRewardOf({ ...wrap, kind: "level_test" })).toBe("none");
    const html = renderToStaticMarkup(
      createElement(ClosingFirst, {
        wrap,
        onListen: () => {},
        onNext: () => {},
      }),
    );
    expect(html).toContain(REWARD_TEXT.star);
  });
});

// 첨삭 상태(plan-p11b 파일별 값 5 · 정할 것 ㄱ · 13절 C79 · 8절 '첨삭 대기' · '안전 분류기 거절' · 3.7 쓰기 6~12 행).
// 실패 수 상한은 시험용 설정(ai.feedback_max_attempts)에서 읽는다.
import { describe, expect, it } from "vitest";
import { INPUT_JSON_MAX, parseAttemptInput } from "@/core/session/attempt";
import {
  DRAFT_TEXT_MAX,
  feedbackStateOf,
  nextFeedbackState,
  type PendingFeedback,
  REFUSALS_TO_FAIL,
  rubricScore,
  THINKOUT_ANSWER_MAX,
} from "@/core/writing/feedback";
import { TEST_SETTINGS } from "../fixtures/settings";

const MAX = TEST_SETTINGS["ai.feedback_max_attempts"].value;
const start: PendingFeedback = { state: "pending", failures: 0, refusals: 0 };
const value = {
  praise: "잘 썼어요.",
  corrections: [],
  modelAnswer: "I like it.",
  rubric: { task: 4, grammar: 3, vocabulary: 2 },
};
const fail = (reason: string) => ({ ok: false as const, reason });

describe("첨삭 상태", () => {
  it("첨삭 상태: 거절 둘이면 못 함 · 그 밖 실패는 ai.feedback_max_attempts 에서 못 함 · 안전 상한과 설정 문제는 셈이 그대로다", () => {
    // 성공이면 옴
    expect(
      nextFeedbackState(start, { ok: true, value }, { maxFailures: MAX }),
    ).toEqual({ state: "ready", value });
    // 거절: REFUSALS_TO_FAIL 번째에 못 함(refusal)
    let s: PendingFeedback = start;
    for (let i = 1; i < REFUSALS_TO_FAIL; i += 1) {
      s = nextFeedbackState(s, fail("refusal"), {
        maxFailures: MAX,
      }) as PendingFeedback;
      expect(s).toEqual({ state: "pending", failures: 0, refusals: i });
    }
    expect(nextFeedbackState(s, fail("refusal"), { maxFailures: MAX })).toEqual(
      {
        state: "failed",
        reason: "refusal",
        failures: 0,
        refusals: REFUSALS_TO_FAIL,
      },
    );
    // 그 밖 실패: maxFailures 번째에 못 함(failures) — 갈래마다 같은 셈
    const others = [
      "invalid",
      "output_blocked",
      "timeout",
      "connection",
      "server",
      "rate_limit",
      "console_limit",
      "account",
      "same_error",
      "error",
    ];
    s = start;
    for (let i = 1; i < MAX; i += 1) {
      s = nextFeedbackState(s, fail(others[i % others.length] ?? "server"), {
        maxFailures: MAX,
      }) as PendingFeedback;
      expect(s).toEqual({ state: "pending", failures: i, refusals: 0 });
    }
    expect(nextFeedbackState(s, fail("timeout"), { maxFailures: MAX })).toEqual(
      { state: "failed", reason: "failures", failures: MAX, refusals: 0 },
    );
    // 안전 상한 · 설정 문제는 셈 그대로(대기 — 8절 '첨삭을 기다리던 글은 그대로 둔다', 정할 것 ㄱ)
    const mid: PendingFeedback = { state: "pending", failures: 2, refusals: 1 };
    for (const reason of ["safety_cap", "config"])
      expect(
        nextFeedbackState(mid, fail(reason), { maxFailures: MAX }),
      ).toEqual(mid);
    // 잡은 시각은 다음 상태에 남지 않는다
    expect(
      nextFeedbackState(
        { ...mid, claimedAt: "2026-10-22T00:00:00.000Z" },
        fail("config"),
        { maxFailures: MAX },
      ),
    ).toEqual(mid);
  });

  it("첨삭 상태: 채점표 점수는 평균 ÷ 4 이고 저장된 상태 글을 읽으며 꼴이 아니면 없다", () => {
    expect(rubricScore({ task: 4, grammar: 3, vocabulary: 2 })).toBe(
      (4 + 3 + 2) / 3 / 4,
    );
    expect(feedbackStateOf(start)).toEqual(start);
    expect(
      feedbackStateOf({ ...start, claimedAt: "2026-10-22T00:00:00.000Z" }),
    ).toMatchObject({ state: "pending" });
    expect(feedbackStateOf({ state: "ready", value })).toEqual({
      state: "ready",
      value,
    });
    expect(
      feedbackStateOf({
        state: "failed",
        reason: "refusal",
        failures: 0,
        refusals: 2,
      }),
    ).toMatchObject({ state: "failed" });
    for (const bad of [null, {}, { state: "pending" }, { state: "x" }, "s"])
      expect(feedbackStateOf(bad)).toBeUndefined();
  });

  it("글자 상한: 초고 · 생각 꺼내기 답을 상한까지 써도 시도 꼴 상한 안이다", () => {
    const draft = {
      v: 1,
      kind: "draft",
      step: "final",
      text: "x".repeat(DRAFT_TEXT_MAX),
    };
    expect(JSON.stringify(draft).length).toBeLessThan(INPUT_JSON_MAX);
    expect(parseAttemptInput(draft)).toBeDefined();
    // 생각 꺼내기 진행 시도: 답 상한 + 넉넉한 질문 · 보기 · 기록 글(한글은 JSON 에서 한 글자)
    const turn = {
      v: 1,
      kind: "thinkout",
      step: "progress",
      turn: 2,
      answer: "가".repeat(THINKOUT_ANSWER_MAX),
      question: "가".repeat(200),
      options: ["가".repeat(100), "나".repeat(100), "다".repeat(100)],
      historyEntry: "가".repeat(1000),
    };
    expect(parseAttemptInput(turn)).toBeDefined();
  });
});

// 세션 점수(3.7 점수 표 · 점수가 비는 경우 표, plan-p11a 파일별 값 3). a · L 은 시험용 설정(speaking.match_weight ·
// speaking.listening_weight)에서 읽고, 기대값은 3.7 식을 시험 안에서 다시 세어 맞댄다(반올림 없음).
import { describe, expect, it } from "vitest";
import {
  cleanSentenceRate,
  rubricScoreOf,
  type ScoredActivity,
  sessionScoreOf,
} from "@/core/scoring/score";
import { TEST_SETTINGS } from "../fixtures/settings";

const weights = {
  a: TEST_SETTINGS["speaking.match_weight"].value,
  L: TEST_SETTINGS["speaking.listening_weight"].value,
};
const scored = (kind: ScoredActivity["kind"], ...scores: (number | null)[]) =>
  scores.map((score) => ({ kind, score }));
const mean = (list: number[]) => list.reduce((s, x) => s + x, 0) / list.length;

describe("세션 점수", () => {
  it("AC-6c 점수 함수는 3.7 표의 경계값을 맞게 낸다(읽기 · 쓰기 1~3 첫 시도 정답률 · 쓰기 6~12 채점표 평균 ÷ 4 · 말하기 9~12)", () => {
    // 읽기: 첫 시도 정답 수 ÷ 문항 수(미리보기 · 지문은 점수 없음)
    const readingOf = (...scores: number[]) =>
      sessionScoreOf({
        area: "reading",
        activities: [
          ...scored("preview", null),
          ...scored("reading-passage", null),
          ...scored("reading-question", ...scores),
        ],
      });
    expect(readingOf(1, 1, 1, 1, 1)).toBe(1);
    expect(readingOf(0, 0, 0, 0, 0)).toBe(0);
    expect(readingOf(1, 0, 1, 0, 1)).toBe(3 / 5);
    // 쓰기 1~3: 첫 시도 정답률
    expect(
      sessionScoreOf({
        area: "writing",
        shape: "items",
        activities: [
          ...scored("preview", null),
          ...scored("writing-item", 1, 1, 0, 1, 0, 1),
        ],
      }),
    ).toBe(4 / 6);
    // 쓰기 6~12 첫 세션: 채점표 세 항목(1~4) 평균 ÷ 4
    const draftOf = (task: number, grammar: number, vocabulary: number) =>
      sessionScoreOf({
        area: "writing",
        shape: "composition",
        part: "draft",
        activities: scored("draft", null),
        rubric: { task, grammar, vocabulary },
      });
    expect(draftOf(4, 4, 4)).toBe(1);
    expect(draftOf(1, 1, 1)).toBe(1 / 4);
    expect(draftOf(3, 2, 4)).toBe(3 / 4);
    // 말하기 9~12: (1 − L) × AI 평가 활동 평균 + L × 듣기 정답률. 활동 점수는 (내용 + 문법) ÷ 2 ÷ 4
    const presentation = rubricScoreOf([3, 3]);
    const confirms = [
      rubricScoreOf([2, 2]),
      rubricScoreOf([4, 4]),
      rubricScoreOf([1, 1]),
    ];
    expect(presentation).toBe(3 / 4);
    expect(confirms).toEqual([2 / 4, 1, 1 / 4]);
    const E = mean([presentation, ...confirms]);
    const Lr = mean([1, 1, 0]);
    expect(
      sessionScoreOf({
        area: "speaking",
        weights,
        activities: [
          ...scored("preview", null),
          ...scored("listening", 1, 1, 0),
          ...scored("presentation", presentation),
          ...scored("confirm-question", ...confirms),
        ],
      }),
    ).toBeCloseTo((1 - weights.L) * E + weights.L * Lr, 12);
  });

  it("AC-6c 쓰기 4단계 3문장 가운데 고칠 곳 없는 문장이 2개면 0.67 이다", () => {
    const rate = cleanSentenceRate([true, false, true]);
    expect(rate).toBeCloseTo(0.67, 2);
    const score = sessionScoreOf({
      area: "writing",
      shape: "guided",
      activities: [
        ...scored("preview", null),
        ...scored("writing-task", null),
        ...scored("writing-guided", rate),
        ...scored("writing-own-repeat", null),
      ],
    });
    expect(score).toBe(2 / 3);
    expect(score).toBeCloseTo(0.67, 2);
  });

  it("AC-6c 말하기 1~8단계는 a = speaking.match_weight · L = speaking.listening_weight 로 계산하고 질문 답 평가가 하나도 없으면 a = 1 이다", () => {
    const R = [1, 0.8, 0.6, 1, 0.5];
    const Q = [1, 0, 1, 0.5];
    const Lr = [1, 0, 1];
    const all = sessionScoreOf({
      area: "speaking",
      weights,
      activities: [
        ...scored("preview", null),
        ...scored("repeat-word", ...R.slice(0, 2)),
        ...scored("repeat-sentence", ...R.slice(2)),
        ...scored("listening", ...Lr),
        ...scored("picture-task", Q[0] ?? 0),
        ...scored("question", ...Q.slice(1)),
      ],
    });
    expect(all).toBeCloseTo(
      (1 - weights.L) * (weights.a * mean(R) + (1 - weights.a) * mean(Q)) +
        weights.L * mean(Lr),
      12,
    );
    // 질문 답 평가가 하나도 없으면(AI 평가 실패 · 'AI 쉬는 중'의 3~8단계) a = 1
    const noQ = sessionScoreOf({
      area: "speaking",
      weights,
      activities: [
        ...scored("repeat-sentence", ...R),
        ...scored("listening", ...Lr),
        ...scored("question", null, null, null, null),
      ],
    });
    expect(noQ).toBeCloseTo(
      (1 - weights.L) * mean(R) + weights.L * mean(Lr),
      12,
    );
    // 따라 말하기가 모두 건너뛰어졌으면 a = 0, 듣기가 없으면 L = 0
    expect(
      sessionScoreOf({
        area: "speaking",
        weights,
        activities: [
          ...scored("repeat-word", null),
          ...scored("question", ...Q),
        ],
      }),
    ).toBeCloseTo(mean(Q), 12);
  });

  it("AC-6c 점수 없는 세션(쓰기 확인 실패 · 첨삭 전 · 말하기 9~12 AI 평가 없음)은 점수가 비어 최근 성적에서 빠진다", () => {
    // 쓰기 4~5 확인 실패
    expect(
      sessionScoreOf({
        area: "writing",
        shape: "guided",
        activities: [
          ...scored("writing-task", null),
          ...scored("writing-guided", null),
        ],
      }),
    ).toBeNull();
    // 쓰기 6~12 첨삭 전(채점표 없음) · 둘째 세션
    expect(
      sessionScoreOf({
        area: "writing",
        shape: "composition",
        part: "draft",
        activities: scored("draft", null),
      }),
    ).toBeNull();
    expect(
      sessionScoreOf({
        area: "writing",
        shape: "composition",
        part: "rewrite",
        activities: scored("rewrite", null),
        rubric: { task: 4, grammar: 4, vocabulary: 4 },
      }),
    ).toBeNull();
    // 말하기 9~12 AI 평가 없음(듣기만 있음)
    expect(
      sessionScoreOf({
        area: "speaking",
        weights,
        activities: [
          ...scored("listening", 1, 1, 1),
          ...scored("presentation", null),
          ...scored("confirm-question", null, null, null),
        ],
      }),
    ).toBeNull();
    // 말하기 1~8 에서 따라 말하기 · 질문 답이 모두 비면 비움
    expect(
      sessionScoreOf({
        area: "speaking",
        weights,
        activities: [
          ...scored("repeat-word", null),
          ...scored("listening", 1),
          ...scored("question", null),
        ],
      }),
    ).toBeNull();
  });

  it("세션 점수: 회화와 문항이 없는 세션은 점수가 없고 고칠 곳 비율은 문장이 없으면 비운다", () => {
    expect(sessionScoreOf({ area: "talk" })).toBeNull();
    expect(
      sessionScoreOf({ area: "reading", activities: scored("preview", null) }),
    ).toBeNull();
    expect(cleanSentenceRate([])).toBeNull();
    expect(() => rubricScoreOf([])).toThrow();
  });
});

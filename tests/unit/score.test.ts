// 세션 점수(3.7 점수 표 · 점수가 비는 경우 표, plan-p11a 파일별 값 3). a · L 은 시험용 설정(speaking.match_weight ·
// speaking.listening_weight)에서 읽고, 기대값은 3.7 식을 시험 안에서 다시 세어 맞댄다(반올림 없음).
import { describe, expect, it } from "vitest";
import {
  cleanSentenceRate,
  rubricScoreOf,
  type ScoredActivity,
  sessionScoreOf,
} from "@/core/scoring/score";
import {
  type AttemptInput,
  appActivityResult,
  lemmaLookup,
  parseAttemptInput,
  speakFailFields,
} from "@/core/session/attempt";
import { type Activity, activitiesOf } from "@/core/session/preview";
import {
  defaultSettings,
  referenceSet,
  speakingLesson,
} from "../fixtures/seed/builders";
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

// 소리를 들려주지 못한 문항(UI · UX spec 2판 R-55 · R-57 · AC-23a (5)): 세션 틀이 끝 시도 { v: 1, kind, step, ...내용 } 에 speakFailFields 를
// 펼친 꼴 그대로 읽고, 앱 채점 결과를 세션 점수에 넣는다.
describe("기술 오류 문항(R-55)", () => {
  const ref = referenceSet(defaultSettings());
  const lesson = speakingLesson(ref, 1).lesson;
  const ctx = {
    answerMatchPass: TEST_SETTINGS["speaking.answer_match_pass"].value,
    homophones: [],
    unitWords: lesson.unitWords,
    lemmaOf: lemmaLookup(ref.vocab.vocab),
    appJudgedQuestions: true,
    meaningWords: [],
  };
  const activities = activitiesOf({
    area: "speaking",
    level: 1,
    content: lesson.content,
  });
  /** 세션 틀 complete 와 같은 꼴(내용의 v 가 이긴다). */
  const frameInput = (kind: string, content: Record<string, unknown>) => {
    const input = parseAttemptInput({
      v: 1,
      kind,
      step: "final",
      ...content,
    });
    if (!input) throw new Error(`시도 꼴이 틀림: ${kind}`);
    return input;
  };
  const resultOf = (activity: Activity, input: AttemptInput) =>
    appActivityResult(activity, lesson, input, ctx);
  const listening = activities.filter((a) => a.kind === "listening");
  const repeats = activities.filter(
    (a) => a.kind === "repeat-word" || a.kind === "repeat-sentence",
  );
  const items = lesson.content.listening;
  const targets = [
    ...lesson.content.repeat.words,
    ...lesson.content.repeat.sentences,
  ];

  it("AC-23a (5) R-55 들려주지 못한 채 받은 답 · 답 없이 넘김은 맞고 틀림과 관계없이 점수 · 단어별 정오가 없고(0 이 아님), 판 1 시도에 섞으면 판 2 로 읽힌다", () => {
    const first = listening[0];
    const item = items[0];
    if (!first || !item) throw new Error("견본 꼴 — 듣기");
    const wrong = item.answerNo === 1 ? 2 : 1;
    for (const tries of [[item.answerNo], [wrong], []]) {
      const input = frameInput("listening", { tries, ...speakFailFields });
      expect(input.v).toBe(speakFailFields.v);
      expect(resultOf(first, input)).toEqual({
        score: null,
        wordResults: [],
        wordCount: null,
      });
    }
    // 들려준 뒤의 답은 보통대로(맞음 1)
    expect(
      resultOf(first, frameInput("listening", { tries: [item.answerNo] }))
        .score,
    ).toBe(1);
    // 기술 오류가 아니면 빈 보기 목록은 받지 않는다
    expect(
      parseAttemptInput({ v: 1, kind: "listening", step: "final", tries: [] }),
    ).toBeUndefined();
    // 따라 말하기: 본보기를 못 들려준 채 똑같이 말해도 점수 없음, 말한 낱말 수는 남는다
    const repeat = repeats[0];
    const target = targets[0];
    if (!repeat || !target) throw new Error("견본 꼴 — 따라 말하기");
    const tech = resultOf(
      repeat,
      frameInput(repeat.kind, {
        heard: [target],
        failures: 0,
        ...speakFailFields,
      }),
    );
    expect(tech.score).toBeNull();
    expect(tech.wordResults).toEqual([]);
    expect(tech.wordCount).toBe(target.split(/\s+/).length);
  });

  it("AC-23a (5) R-55 기술 오류 문항은 그 종류 평균의 분모 · 분자에서 빠지고, 듣기가 다 빠지면 듣기 가중치가 0 이다", () => {
    const scoredOf = (techListening: number[]) =>
      activities.map((activity) => {
        if (activity.kind === "listening") {
          const item = items[activity.index];
          if (!item) throw new Error("견본 꼴 — 듣기");
          const tech = techListening.includes(activity.index);
          // 기술 오류 문항은 일부러 틀린 답 — 0 으로 세면 점수가 내려간다
          const tries = [tech ? (item.answerNo === 1 ? 2 : 1) : item.answerNo];
          const input = frameInput("listening", {
            tries,
            ...(tech ? speakFailFields : {}),
          });
          return {
            kind: activity.kind,
            score: resultOf(activity, input).score,
          };
        }
        if (
          activity.kind === "repeat-word" ||
          activity.kind === "repeat-sentence"
        ) {
          const list =
            activity.kind === "repeat-word"
              ? lesson.content.repeat.words
              : lesson.content.repeat.sentences;
          const input = frameInput(activity.kind, {
            heard: [list[activity.index] ?? ""],
            failures: 0,
          });
          return {
            kind: activity.kind,
            score: resultOf(activity, input).score,
          };
        }
        return { kind: activity.kind, score: null };
      });
    expect(items.length).toBeGreaterThan(1);
    // 듣기 하나만 기술 오류: 남은 듣기는 다 맞음이라 듣기 평균 1(오답 0 이 섞이지 않음)
    const one = sessionScoreOf({
      area: "speaking",
      weights,
      activities: scoredOf([0]),
    });
    expect(one).toBeCloseTo(1, 12);
    // 듣기가 모두 기술 오류: 듣기 항 가중치 0 — 따라 말하기만으로 1
    const all = scoredOf(items.map((_item, i) => i));
    expect(
      all.filter((a) => a.kind === "listening").every((a) => a.score === null),
    ).toBe(true);
    expect(
      sessionScoreOf({ area: "speaking", weights, activities: all }),
    ).toBeCloseTo(1, 12);
  });
});

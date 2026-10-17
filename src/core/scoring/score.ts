// 세션 점수(3.7 점수 규격 · 점수가 비거나 따로 세는 경우 표, plan-p11a 파일별 값 3). DB · 시계 없는 순수 함수다.
// 모든 점수는 0~1 이고 반올림하지 않는다. 점수가 null 인 세션은 P12 가 최근 성적 평균에서 뺀다(첨삭 전 · 쓰기 확인 실패 ·
// 말하기 9~12 AI 평가 없음). 보강 · 연습 · 안 해 본 수업 · 다시 하기를 빼는 일도 P12 몫이다(점수는 남긴다).
// a(speaking.match_weight) · L(speaking.listening_weight)는 부르는 쪽이 설정에서 읽어 넘긴다.
import type { ActivityKind } from "@/core/session/preview";

/** 채점표 · AI 평가 항목의 만점(3.7 '각 1~4' — 채점표 꼴의 구조 수). */
const RUBRIC_MAX = 4;

/** 활동 하나의 점수(없으면 null — 건너뜀 · AI 평가 없음 · 점수 없는 활동). */
export type ScoredActivity = { kind: ActivityKind; score: number | null };

export type SessionScoreInput =
  | { area: "reading"; activities: readonly ScoredActivity[] }
  | {
      area: "writing";
      /** 수업 내용 꼴(items 1~3 · guided 4~5 · composition 6~12). */
      shape: "items" | "guided" | "composition";
      /** 쓰기 6~12 세션(없으면 첫 세션). */
      part?: "draft" | "rewrite";
      activities: readonly ScoredActivity[];
      /** 쓰기 6~12 첫 제출 글의 채점표(각 1~4, 첨삭이 올 때 b 가 넘김). */
      rubric?: { task: number; grammar: number; vocabulary: number };
    }
  | {
      area: "speaking";
      activities: readonly ScoredActivity[];
      weights: { a: number; L: number };
    }
  | { area: "talk" };

const REPEAT_KINDS: ReadonlySet<ActivityKind> = new Set([
  "repeat-word",
  "repeat-sentence",
]);
const ANSWER_KINDS: ReadonlySet<ActivityKind> = new Set([
  "question",
  "picture-task",
]);
const TALK_KINDS: ReadonlySet<ActivityKind> = new Set([
  "presentation",
  "confirm-question",
]);

/** 고른 종류의 null 아닌 점수 평균(없으면 null). */
function meanOf(
  activities: readonly ScoredActivity[],
  kinds: ReadonlySet<ActivityKind>,
): number | null {
  const scores = activities
    .filter((a) => kinds.has(a.kind) && a.score !== null)
    .map((a) => a.score as number);
  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

/** 쓰기 4~5 활동 점수: 첫 제출에서 고칠 곳이 없는 문장 수 ÷ 문장 수(문장이 없으면 null). */
export function cleanSentenceRate(clean: readonly boolean[]): number | null {
  if (clean.length === 0) return null;
  return clean.filter(Boolean).length / clean.length;
}

/** 채점표 · AI 평가 항목(각 1~4) 평균 ÷ 4 — 쓰기 6~12 채점표 · 말하기 9~12 내용 · 문법 점수(3.7). 항목이 없으면 던진다. */
export function rubricScoreOf(points: readonly number[]): number {
  if (points.length === 0) throw new Error("채점표 항목이 없다");
  return points.reduce((sum, p) => sum + p, 0) / points.length / RUBRIC_MAX;
}

function speakingScore(
  activities: readonly ScoredActivity[],
  { a, L }: { a: number; L: number },
): number | null {
  const listening = meanOf(activities, new Set(["listening"]));
  const listenWeight = listening === null ? 0 : L;
  const withListening = (main: number) =>
    (1 - listenWeight) * main + listenWeight * (listening ?? 0);
  // 9~12: 발표 · 확인 질문이 있는 세션(3.7 말하기 9~12 행)
  if (activities.some((x) => TALK_KINDS.has(x.kind))) {
    const evaluated = meanOf(activities, TALK_KINDS);
    return evaluated === null ? null : withListening(evaluated);
  }
  const repeat = meanOf(activities, REPEAT_KINDS);
  const answers = meanOf(activities, ANSWER_KINDS);
  if (repeat === null && answers === null) return null;
  // 질문 답 평가가 없으면 a = 1(3.7 'AI 평가를 못 한 3~8단계'), 따라 말하기가 없으면 a = 0
  const repeatWeight = answers === null ? 1 : repeat === null ? 0 : a;
  return withListening(
    repeatWeight * (repeat ?? 0) + (1 - repeatWeight) * (answers ?? 0),
  );
}

/** 세션 점수(0~1) 또는 null(점수 없는 세션). */
export function sessionScoreOf(input: SessionScoreInput): number | null {
  switch (input.area) {
    case "reading":
      return meanOf(input.activities, new Set(["reading-question"]));
    case "writing":
      switch (input.shape) {
        case "items":
          return meanOf(input.activities, new Set(["writing-item"]));
        case "guided":
          // 확인이 실패했으면 writing-guided 점수가 null — 점수 없는 세션
          return meanOf(input.activities, new Set(["writing-guided"]));
        case "composition": {
          if (input.part === "rewrite" || !input.rubric) return null;
          const { task, grammar, vocabulary } = input.rubric;
          return rubricScoreOf([task, grammar, vocabulary]);
        }
      }
      return null;
    case "speaking":
      return speakingScore(input.activities, input.weights);
    case "talk":
      return null;
  }
}

// 첨삭 상태(5절 attempts 상태 · 8절 '첨삭 대기' · '안전 분류기 거절' · 3.7 쓰기 6~12 행, plan-p11b 파일별 값 5 · 정할 것 ㄱ · 13절 C79).
// DB · 시계 없는 순수 함수다. 상태는 attempts.ai_feedback 에 둔다(JSON null 없음). 실패 수 상한(ai.feedback_max_attempts)은
// 부르는 쪽이 설정에서 넘긴다. 거절이 둘이면 못 함(8절 '같은 입력이 거절로 두 번'의 고정 수), 안전 상한 · 설정 문제는 호출이 아니라
// 셈에 넣지 않는다(8절 '첨삭을 기다리던 글은 그대로 둔다').
import { z } from "zod";
import { rubricScoreOf } from "@/core/scoring/score";

/** 8절 '같은 입력이 거절로 두 번'의 고정 수(설계 구조 수 — 12절 키가 아니다). */
export const REFUSALS_TO_FAIL = 2;
/** 생각 꺼내기 한 답(한글로 짧게) 글자 수 상한(기술 값 — 시도 꼴 상한 안, 화면 입력란 · 서버가 같이 씀). */
export const THINKOUT_ANSWER_MAX = 100;
/** 초고 글자 수 상한(기술 값 — 시도 꼴 상한 INPUT_JSON_MAX 안, 12단계 분량보다 넉넉히). */
export const DRAFT_TEXT_MAX = 3000;

const RubricSchema = z.object({
  task: z.number(),
  grammar: z.number(),
  vocabulary: z.number(),
});

/** 첨삭 결과 값(P9c writeFeedback 의 정규화한 값 — 화면이 쓰는 칸만 본다). */
const FeedbackValueSchema = z.looseObject({
  praise: z.string(),
  corrections: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      reason: z.string(),
    }),
  ),
  modelAnswer: z.string(),
  rubric: RubricSchema,
});
export type FeedbackValue = z.infer<typeof FeedbackValueSchema>;

const Count = z.int().min(0);
const FeedbackStateSchema = z.discriminatedUnion("state", [
  z.strictObject({
    state: z.literal("pending"),
    failures: Count,
    refusals: Count,
    /** 지금 부르고 있는 요청이 잡은 시각(ISO). 그동안 다른 요청은 부르지 않는다. */
    claimedAt: z.string().optional(),
  }),
  z.strictObject({ state: z.literal("ready"), value: FeedbackValueSchema }),
  z.strictObject({
    state: z.literal("failed"),
    reason: z.enum(["refusal", "failures"]),
    failures: Count,
    refusals: Count,
  }),
]);
export type FeedbackState = z.infer<typeof FeedbackStateSchema>;
export type PendingFeedback = Extract<FeedbackState, { state: "pending" }>;
type Pending = PendingFeedback;

/** 저장된 ai_feedback 을 읽는다(꼴이 아니면 undefined). */
export function feedbackStateOf(raw: unknown): FeedbackState | undefined {
  const parsed = FeedbackStateSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

/** 셈에 넣지 않는 실패(호출이 아니거나 아이 글과 관계없는 운영 상태). */
const NOT_COUNTED: ReadonlySet<string> = new Set(["safety_cap", "config"]);

/**
 * 첨삭 한 번 부른 결과로 다음 상태(값 5). 성공 → 옴. 거절 → 거절 수 + 1, REFUSALS_TO_FAIL 이면 못 함(refusal). 안전 상한 · 설정 문제
 * → 셈 그대로. 그 밖(검증 · 출력 막힘 · 시간 · 연결 · 서버 · 한도 · 콘솔 한도 · 계정 · 같은 오류 · 서버에서 던짐) → 실패 수 + 1,
 * maxFailures 이면 못 함(failures). 잡은 시각은 남기지 않는다.
 */
export function nextFeedbackState(
  before: Pending,
  outcome: { ok: true; value: unknown } | { ok: false; reason: string },
  { maxFailures }: { maxFailures: number },
): FeedbackState {
  const { failures, refusals } = before;
  if (outcome.ok) {
    const value = FeedbackValueSchema.parse(outcome.value);
    return { state: "ready", value };
  }
  if (NOT_COUNTED.has(outcome.reason))
    return { state: "pending", failures, refusals };
  if (outcome.reason === "refusal") {
    const next = refusals + 1;
    return next >= REFUSALS_TO_FAIL
      ? { state: "failed", reason: "refusal", failures, refusals: next }
      : { state: "pending", failures, refusals: next };
  }
  const next = failures + 1;
  return next >= maxFailures
    ? { state: "failed", reason: "failures", failures: next, refusals }
    : { state: "pending", failures: next, refusals };
}

/** 쓰기 6~12 첫 세션 점수 = 채점표 평균 ÷ 4(3.7). */
export function rubricScore(rubric: {
  task: number;
  grammar: number;
  vocabulary: number;
}): number {
  return rubricScoreOf([rubric.task, rubric.grammar, rubric.vocabulary]);
}

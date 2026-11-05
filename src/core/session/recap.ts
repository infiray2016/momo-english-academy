// 되짚기 마무리 줄 고르기(델타 spec 2026-10-29 가르치고 배우는 수업 설계 5 · 8 끝, plan 사, 정본 03 세션 결과 행 · 02-3 3.8 '적은 근거로
// 단정하지 않기' · 15절 AC-6g, 13절 C174 (5) · C175 (4) · C177 (1)). DB · 시계 없는 순수 함수다. 결과 화면 자료(서버)가 저장된 첫 끝
// 시도로 이 함수를 돌리므로 새 열은 없다. 문턱 lesson.recap_min_evidence · lesson.recap_can_ratio 는 부르는 쪽이 설정에서 읽어 넘긴다.
//
// teach.goals 첫 값(이 수업의 핵심 can-do)에 이어진 혼자 문항마다 결과를 하나로 정한다.
// - 해냄: 첫 시도가 맞음(soloOutcomeOf), 또는 첫 시도가 틀렸고 그 짝의 첫 시도가 맞음(spareOutcomeOf).
// - 독립 해냄: 해냄 가운데 센 시도에 도움 기록(읽기 aid — 읽어 주기 · 뜻 보기)이 없고 의사소통 정답(judge.communicative —
//   acceptedMeaning 으로 갈린 답)이 아닌 것. 의사소통 정답은 평가 spec [승인 A9] 와 상관없이 독립 해냄이 아니다(설계 8 끝).
// - 해내지 못함: 첫 시도가 틀렸고 짝이 틀림 · 짝을 판정하지 못함(건너뜀 · 소리 없음) · 짝이 없음 · 상한 때문에 짝을 내지 못함(짝 시도
//   행 없음) — 해냄 정의(짝 첫 시도 맞음)를 채우지 못했으므로 유효 문항으로 남는다(검토 I1).
// - U: 그 문항의 첫 시도 자체를 판정하지 못함(건너뜀 · 'AI 쉬는 중' · 소리 없음 · 판정 없는 AI 질문) — 셈에서 뺀다.
// 유효 문항(U 뺌)이 minEvidence 이상이고 독립 해냄 ÷ 유효 문항이 canRatio 이상일 때만 closeKo, 아니면 closeKoPracticed 다.
// 이 비율은 세션 한 번의 신호이고 숙달('안다')이나 단원 통과가 아니다(C173 (1)).
import type { GoalRef, LessonOf } from "@/core/seed/schema/lesson";
import {
  type AttemptInput,
  type OutcomeContext,
  questionJudgeContextOf,
  soloOutcomeOf,
} from "@/core/session/attempt";
import type { Activity, SpareBase } from "@/core/session/preview";
import { spareOutcomeOf } from "@/core/session/spare-outcome";
import {
  type JudgeableQuestion,
  judgeableQuestion,
  judgeSpeakingQuestion,
} from "@/core/speaking/judge";

type AppLesson = LessonOf["reading" | "writing" | "speaking"];

/** 마무리 줄: 시드 teach.recap 의 closeKo('할 수 있어요') · closeKoPracticed('배우고 연습했어요'). */
export type RecapLine = "closeKo" | "closeKoPracticed";

/** 문턱(부르는 쪽이 설정에서 읽음): minEvidence = lesson.recap_min_evidence, canRatio = lesson.recap_can_ratio. */
export type RecapSettings = { minEvidence: number; canRatio: number };

/** 핵심 목표 혼자 문항 하나의 결과. */
export type RecapItemOutcome =
  /** 도움 없이 해냄(첫 시도 맞음 또는 짝 첫 시도 맞음). */
  | "independent"
  /** 해냈지만 도움 기록 · 의사소통 정답이 붙음. */
  | "assisted"
  /** 해내지 못함(짝도 틀림 · 짝을 판정하지 못함 · 짝 없음 · 상한 때문에 짝을 내지 못함). */
  | "not_done"
  /** 판정하지 못함(U — 셈에서 뺌). */
  | "unscored";

export type RecapItem = { activityNo: number; outcome: RecapItemOutcome };

/** 되짚기 결과: 고른 줄과 그 근거(유효 문항 수 · 독립 해냄 수 · 비율, 유효 문항이 없으면 비율 null). */
export type RecapResult = {
  line: RecapLine;
  evidence: { valid: number; done: number; ratio: number | null };
};

export type RecapInput = {
  lesson: AppLesson;
  /** 그 세션 활동 차례(activitiesOf — 활동 번호는 1부터). */
  activities: readonly Activity[];
  /** 활동 번호 → 그 활동의 첫 끝 시도(서버는 저장 시각 차례로 고른 값). */
  finals: ReadonlyMap<number, AttemptInput>;
  ctx: OutcomeContext;
};

const SOLO_KINDS: ReadonlySet<string> = new Set<SpareBase>([
  "reading-question",
  "writing-item",
  "question",
  "listening",
  "repeat-sentence",
  "repeat-word",
]);

const goalIncludes = (ref: GoalRef | undefined, goal: string): boolean =>
  ref === undefined
    ? false
    : typeof ref === "string"
      ? ref === goal
      : ref.includes(goal);

type ItemWithGoal = { goal?: GoalRef };

/** 혼자 문항 활동이 이어진 목표(문항 칸 goal, 따라 말하기는 묶음 하나의 repeat.goal). */
function goalOf(activity: Activity, lesson: AppLesson): GoalRef | undefined {
  if (!("index" in activity)) return undefined;
  const c = lesson.content as Partial<{
    questions: readonly ItemWithGoal[];
    items: readonly ItemWithGoal[];
    listening: readonly ItemWithGoal[];
    repeat: ItemWithGoal;
  }>;
  switch (activity.kind) {
    case "reading-question":
    case "question":
      return c.questions?.[activity.index]?.goal;
    case "writing-item":
      return c.items?.[activity.index]?.goal;
    case "listening":
      return c.listening?.[activity.index]?.goal;
    case "repeat-word":
    case "repeat-sentence":
      return c.repeat?.goal;
    default:
      return undefined;
  }
}

/** 짝 활동의 번호(1부터) — 혼자 문항과 같은 종류 · 차례의 짝. 없으면 undefined. */
function spareNoOf(
  activities: readonly Activity[],
  solo: Activity,
): number | undefined {
  if (!("index" in solo)) return undefined;
  const index = activities.findIndex(
    (a) => a.kind === "spare" && a.base === solo.kind && a.index === solo.index,
  );
  return index < 0 ? undefined : index + 1;
}

const firstHeard = (heard: readonly string[]): string | undefined =>
  heard.find((h) => h.trim() !== "");

/**
 * 센 시도(맞은 첫 시도)에 도움이 붙었나. 읽기는 aid(읽어 주기 · 열어 본 뜻), 말하기 질문은 의사소통 정답(judge.communicative). 판정 칸이
 * 없는 질문 시도(기기 대기열 · 앱 판정 단계)는 같은 판정 함수(judgeSpeakingQuestion)로 가른다.
 */
function assisted(
  input: AttemptInput,
  item: JudgeableQuestion | undefined,
  ctx: OutcomeContext,
): boolean {
  if (input.kind === "reading-question")
    return input.aid?.readAloud === true || (input.aid?.gloss?.length ?? 0) > 0;
  if (input.kind === "question") {
    if (input.judge) return input.judge.communicative === true;
    const heard = firstHeard(input.heard);
    if (!item || heard === undefined || !judgeableQuestion(item)) return false;
    return (
      judgeSpeakingQuestion(item, heard, questionJudgeContextOf(ctx))
        .communicative === true
    );
  }
  return false;
}

/** 말하기 질문 혼자 문항 · 그 짝의 판정 재료(질문이 아니면 undefined). */
function questionItemOf(
  activity: Activity,
  lesson: AppLesson,
  spare: boolean,
): JudgeableQuestion | undefined {
  if (activity.kind !== "question") return undefined;
  const q = (
    lesson.content as Partial<{
      questions: readonly (JudgeableQuestion & { spare?: JudgeableQuestion })[];
    }>
  ).questions?.[activity.index];
  return spare ? q?.spare : q;
}

/** 핵심 목표 혼자 문항 하나(활동 번호 activityNo)의 결과. */
function recapItemOutcomeOf(
  input: RecapInput,
  activity: Activity,
  activityNo: number,
): RecapItemOutcome {
  const { lesson, activities, finals, ctx } = input;
  const first = finals.get(activityNo);
  if (!first) return "unscored";
  const solo = soloOutcomeOf(activity, lesson, first, ctx);
  if (solo === "unscored") return "unscored";
  if (solo === "correct")
    return assisted(first, questionItemOf(activity, lesson, false), ctx)
      ? "assisted"
      : "independent";
  // 첫 시도 틀림 → 짝 첫 시도로 정한다. 짝이 없거나 내지 않은 짝(상한)은 해내지 못함
  const spareNo = spareNoOf(activities, activity);
  const spareActivity =
    spareNo === undefined ? undefined : activities[spareNo - 1];
  const spareInput = spareNo === undefined ? undefined : finals.get(spareNo);
  if (spareActivity?.kind !== "spare" || !spareInput) return "not_done";
  const spare = spareOutcomeOf(spareActivity, lesson, spareInput, ctx);
  // 짝을 판정하지 못한 것(unscored)도 짝 첫 시도 맞음이 아니므로 해내지 못함이다(U 는 문항 첫 시도 자체를 판정하지 못한 것뿐)
  if (spare !== "correct") return "not_done";
  return assisted(spareInput, questionItemOf(activity, lesson, true), ctx)
    ? "assisted"
    : "independent";
}

/** teach.goals 첫 목표에 이어진 혼자 문항마다의 결과(활동 차례). teach 가 없는 수업은 빈 목록. */
export function recapItemsOf(input: RecapInput): RecapItem[] {
  const goal = input.lesson.teach?.goals[0];
  if (goal === undefined) return [];
  return input.activities.flatMap((activity, i) =>
    SOLO_KINDS.has(activity.kind) &&
    goalIncludes(goalOf(activity, input.lesson), goal)
      ? [
          {
            activityNo: i + 1,
            outcome: recapItemOutcomeOf(input, activity, i + 1),
          },
        ]
      : [],
  );
}

/**
 * 되짚기 마무리 줄(AC-6g): 유효 문항(U 뺌)이 settings.minEvidence 이상이고 독립 해냄 비율이 settings.canRatio 이상이면 closeKo, 아니면
 * closeKoPracticed. teach 칸이 없는 수업은 되짚기가 없어 undefined.
 */
export function recapLineOf(
  input: RecapInput & { settings: RecapSettings },
): RecapResult | undefined {
  if (!input.lesson.teach) return undefined;
  const items = recapItemsOf(input);
  const valid = items.filter((item) => item.outcome !== "unscored").length;
  const done = items.filter((item) => item.outcome === "independent").length;
  const ratio = valid === 0 ? null : done / valid;
  const can =
    ratio !== null &&
    valid >= input.settings.minEvidence &&
    ratio >= input.settings.canRatio;
  return {
    line: can ? "closeKo" : "closeKoPracticed",
    evidence: { valid, done, ratio },
  };
}

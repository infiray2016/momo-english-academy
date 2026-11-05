// 짝 · 같이 해 보기 첫 시도의 맞음 · 틀림 · U(델타 spec 2026-10-29 가르치고 배우는 수업 설계 1 '채점' · 8 · plan 다, 아 검토 M1 —
// 지표(teach-metrics)와 되짚기(사)가 같이 쓰는 공용 순수 함수). 짝은 짝을 둔 혼자 문항과 같은 판정이다: 읽기 · 듣기 · 쓰기는 첫 시도 정답
// 비교(checkAnswer), 따라 말하기는 첫 인식 글의 결과 말이 '잘 말했어요'(repeatGoodRate) 이상, 말하기 질문 짝 · 같이 해 보기(질문)는
// judgeSpeakingQuestion(의미 검사 → 두 묶음, AI 없음)이다. 저장된 시도의 judge 칸은 서버가 저장 때 같은 함수로 다시 쓴 값(withAppJudge)
// 이라 있으면 그것을 따르고, 없으면(기기 대기열 · 옛 시도) 같은 함수로 셈한다. DB 없는 순수 함수다.
import { type CheckItem, checkAnswer } from "@/core/answer/check";
import type { LessonOf } from "@/core/seed/schema/lesson";
import {
  type AttemptInput,
  inputFitsActivity,
  type OutcomeContext,
  questionJudgeContextOf,
  type SoloOutcome,
} from "@/core/session/attempt";
import type { Activity } from "@/core/session/preview";
import {
  type JudgeableQuestion,
  judgeableQuestion,
  judgeSpeakingQuestion,
} from "@/core/speaking/judge";
import { bestMatchRate } from "@/core/speech/match-rate";

type AppLesson = LessonOf["reading" | "writing" | "speaking"];

const skippedOrSilent = (input: AttemptInput): boolean =>
  ("techError" in input && input.techError !== undefined) ||
  ("skipped" in input && input.skipped !== undefined);

const firstHeard = (heard: readonly string[]): string | undefined =>
  heard.find((h) => h.trim() !== "");

const verdict = (correct: boolean): SoloOutcome =>
  correct ? "correct" : "wrong";

/** 말하기 질문 꼴 문항 하나의 앱 판정(맞음인가). 허용 답이 없는 문항은 undefined. */
function questionCorrect(
  item: JudgeableQuestion,
  heard: string,
  ctx: OutcomeContext,
): boolean | undefined {
  if (!judgeableQuestion(item)) return undefined;
  return (
    judgeSpeakingQuestion(item, heard, questionJudgeContextOf(ctx)).final ===
    "correct"
  );
}

// ── 짝 첫 시도 ──

/**
 * 짝 첫 시도의 맞음 · 틀림 · U(짝을 둔 혼자 문항과 같은 판정 — 델타 spec 설계 1 '채점'). 읽기 · 듣기 · 쓰기는 첫 시도 정답 비교,
 * 따라 말하기는 첫 인식 글이 '잘 말했어요'(repeatGoodRate) 이상, 질문 짝은 판정 칸(judge)이 있으면 그 합친 판정, 없으면
 * judgeSpeakingQuestion 이다. 건너뜀 · 소리 없음 · 인식 글 없음은 U.
 */
export function spareOutcomeOf(
  activity: Extract<Activity, { kind: "spare" }>,
  lesson: AppLesson,
  input: AttemptInput,
  ctx: OutcomeContext,
): SoloOutcome {
  if (input.step !== "final" || !inputFitsActivity(activity, input))
    return "unscored";
  if (skippedOrSilent(input)) return "unscored";
  const c = lesson.content as Partial<{
    questions: readonly {
      spare?: JudgeableQuestion & { answerNo?: number };
    }[];
    listening: readonly { spare?: { answerNo: number } }[];
    items: readonly { spare?: CheckItem }[];
    repeat: { spares?: { words: string[]; sentences: string[] } };
  }>;
  switch (input.kind) {
    case "reading-question":
    case "listening": {
      const list =
        input.kind === "listening" ? c.listening : (c.questions ?? []);
      const answerNo = list?.[activity.index]?.spare?.answerNo;
      if (answerNo === undefined) return "unscored";
      return verdict(input.tries[0] === answerNo);
    }
    case "writing-item": {
      const item = c.items?.[activity.index]?.spare;
      const first = input.tries[0];
      if (!item || !first) return "unscored";
      return verdict(
        checkAnswer(item, first, { homophones: ctx.homophones }).correct,
      );
    }
    case "repeat-word":
    case "repeat-sentence": {
      const spares = c.repeat?.spares;
      const list =
        input.kind === "repeat-word" ? spares?.words : spares?.sentences;
      const target = list?.[activity.index];
      const heard = firstHeard(input.heard);
      if (target === undefined || heard === undefined) return "unscored";
      const rate = bestMatchRate([target], heard, {
        homophones: ctx.homophones,
        nameSlot: "any-word",
      });
      return verdict(rate >= ctx.repeatGoodRate);
    }
    case "question": {
      if (input.judge) return verdict(input.judge.final === "correct");
      const sp = c.questions?.[activity.index]?.spare;
      const heard = firstHeard(input.heard);
      if (!sp || heard === undefined) return "unscored";
      const correct = questionCorrect(sp, heard, ctx);
      return correct === undefined ? "unscored" : verdict(correct);
    }
    default:
      return "unscored";
  }
}

// ── 같이 해 보기 첫 시도 ──

type TogetherItem = JudgeableQuestion & {
  answerNo?: number;
  cards?: readonly string[];
  slot?: readonly number[] | string;
  type?: string;
};
type TogetherTry = Extract<AttemptInput, { kind: "together" }>["tries"][number];

/**
 * 첫 시도에서 앱이 맞출 수 있는 칸마다의 정오(고른 보기 · 놓은 카드 · 인식 글). 맞출 칸이 없으면 빈 목록. 인식 글의 정오는 저장된 판정
 * (judgeFinal — 서버가 처음 말한 시도로 매긴 judge.final, 첫 시도에 말이 있을 때 그 말의 판정)이 있으면 그것이고, 없으면 셈한다.
 */
function togetherChecks(
  item: TogetherItem,
  first: TogetherTry,
  ctx: OutcomeContext,
  judgeFinal: string | undefined,
): boolean[] {
  const checks: boolean[] = [];
  if (first.choice !== undefined && item.answerNo !== undefined)
    checks.push(first.choice === item.answerNo);
  if (first.pieces !== undefined) {
    const slot = item.slot;
    if (
      Array.isArray(slot) &&
      first.pieces.length === slot.length &&
      item.cards
    )
      // 빈칸 카드: 칸 번호(1부터) 차례로 놓은 카드가 그 자리 카드와 같은가
      checks.push(
        slot.every((p, i) => first.pieces?.[i] === item.cards?.[p - 1]),
      );
    else if (item.accepted !== undefined && item.type !== undefined)
      checks.push(
        checkAnswer(
          item as CheckItem,
          { kind: "tiles", pieces: first.pieces },
          { homophones: ctx.homophones },
        ).correct,
      );
  }
  if (first.heard !== undefined && first.heard.trim() !== "") {
    const correct =
      judgeFinal === undefined
        ? questionCorrect(item, first.heard, ctx)
        : judgeFinal === "correct";
    if (correct !== undefined) checks.push(correct);
  }
  return checks;
}

/**
 * 같이 해 보기 첫 시도: 첫 시도에서 앱이 맞출 칸(보기 · 카드 · 말)의 정오이고 하나라도 틀리면 틀림이다. 말의 정오는 판정 칸(judge —
 * 서버가 처음 말한 시도로 다시 쓴 말하기 판정, 델타 spec 설계 8)이 있으면 그 final, 없으면 judgeSpeakingQuestion 이다. judge 가 있어도
 * 첫 시도의 고른 보기는 따로 본다(고르고 같이 말하는 문항 — 검토 I1). 대문자 단추처럼 맞출 칸이 없으면 '맞힐 때까지 다시'(설계 1)로
 * 보아 시도가 하나뿐이면 맞음, 둘 이상이면 틀림이다. 시도가 없으면 U.
 */
export function togetherOutcomeOf(
  activity: Extract<Activity, { kind: "together" }>,
  lesson: AppLesson,
  input: AttemptInput,
  ctx: OutcomeContext,
): SoloOutcome {
  if (
    input.kind !== "together" ||
    input.step !== "final" ||
    !inputFitsActivity(activity, input)
  )
    return "unscored";
  const item = lesson.teach?.together[activity.index] as
    | TogetherItem
    | undefined;
  const [first] = input.tries;
  if (!item || !first) return "unscored";
  // 일치율만으로 뜻이 맞다고 보지 않는다(설계 8 — 짝 판정 spareOutcomeOf 와 같은 차례). 말의 정오만 judge 를 따른다
  const checks = togetherChecks(item, first, ctx, input.judge?.final);
  if (checks.length === 0)
    return input.tries.length === 1 ? "correct" : "wrong";
  return checks.every(Boolean) ? "correct" : "wrong";
}

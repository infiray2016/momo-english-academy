import "server-only";
// P11 이 부르는 AI 공개 함수 넷과 결과 꼴(6.2 · 8절, plan-p09c 파일별 값 5). P11 은 이 파일만 가져온다.
// 접근 확인은 하지 않는다 — 부르는 서버 액션의 첫 문장이 requireAccess() 다(P3b).
import {
  type SpeakingAnswerInput,
  type SpeakingAnswerOutput,
  type SpeakingConfirmInput,
  type SpeakingConfirmOutput,
  type SpeakingPresentationInput,
  type SpeakingPresentationOutput,
  speakingAnswerSpec,
  speakingConfirmSpec,
  speakingPresentationSpec,
} from "@/core/ai/calls/speaking";
import {
  type ThinkoutInput,
  type ThinkoutOutput,
  thinkoutSpec,
} from "@/core/ai/calls/thinkout";
import {
  type WritingCheckInput,
  type WritingCheckOutput,
  type WritingFeedbackInput,
  type WritingFeedbackOutput,
  writingCheckSpec,
  writingFeedbackSpec,
} from "@/core/ai/calls/writing";
import {
  type AiCallContext,
  type AiDeps,
  type AiOutcome,
  allowedWordsOf,
  runAiCall,
} from "@/server/ai/run";
import { getDb } from "@/server/db";

export type {
  AiCallContext,
  AiDeps,
  AiFailureReason,
  AiOutcome,
} from "@/server/ai/run";

/** 쓰기 확인(4~5단계). 실패면 P11 은 확인 없이 넘어가고 점수 없는 세션(8절). */
export function checkWriting(
  input: WritingCheckInput,
  ctx: AiCallContext,
  deps?: AiDeps,
): Promise<AiOutcome<WritingCheckOutput>> {
  return runAiCall(writingCheckSpec, input, ctx, deps);
}

/**
 * 쓰기 첨삭. P11 이 초고 제출 서버 액션의 after() 안에서 부른다. ctx.sessionId 는 그 초고의 첫 세션이다.
 * 거절 · 실패 수는 P11 이 attempts 에 센다(8절 '같은 입력이 거절로 두 번' · ai.feedback_max_attempts).
 */
export function writeFeedback(
  input: WritingFeedbackInput,
  ctx: AiCallContext,
  deps?: AiDeps,
): Promise<AiOutcome<WritingFeedbackOutput>> {
  return runAiCall(writingFeedbackSpec, input, ctx, deps);
}

export type SpeakingEvalInput =
  | ({ mode: "answer" } & SpeakingAnswerInput)
  | ({ mode: "presentation" } & SpeakingPresentationInput)
  | ({ mode: "confirm" } & SpeakingConfirmInput);

export type SpeakingEvalOutcome =
  | AiOutcome<SpeakingAnswerOutput>
  | AiOutcome<SpeakingPresentationOutput>
  | AiOutcome<SpeakingConfirmOutput>;

/** 말하기 평가 셋(mode 로 고름). 실패면 판정 없이 다음 문항(8절). */
export function evaluateSpeaking(
  input: SpeakingEvalInput,
  ctx: AiCallContext,
  deps?: AiDeps,
): Promise<SpeakingEvalOutcome> {
  switch (input.mode) {
    case "answer": {
      const { mode: _mode, ...rest } = input;
      return runAiCall(speakingAnswerSpec, rest, ctx, deps);
    }
    case "presentation": {
      const { mode: _mode, ...rest } = input;
      return runAiCall(speakingPresentationSpec, rest, ctx, deps);
    }
    case "confirm": {
      const { mode: _mode, ...rest } = input;
      return runAiCall(speakingConfirmSpec, rest, ctx, deps);
    }
  }
}

/**
 * 생각 꺼내기 한 턴. allowedWords 는 vocab 의 band_level ≤ 단계 낱말(소문자)로 채운다(넘긴 값은 쓰지 않는다).
 * 결과의 historyEntry 를 P11 이 턴마다 글자 그대로 저장해 다음 턴 history 로 돌려준다(fillName 전 글).
 * 실패 · output_blocked 면 '이번에는 바로 써 볼까요' 초고 화면(8절).
 */
export async function thinkoutTurn(
  input: Omit<ThinkoutInput, "allowedWords"> & {
    allowedWords?: ThinkoutInput["allowedWords"];
  },
  ctx: AiCallContext,
  deps?: AiDeps,
): Promise<AiOutcome<ThinkoutOutput>> {
  const allowedWords = await allowedWordsOf(deps?.db ?? getDb(), input.level);
  return runAiCall(thinkoutSpec, { ...input, allowedWords }, ctx, deps);
}

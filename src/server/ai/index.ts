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
  type TalkTurnInput,
  talkClosingSpec,
  talkTurnSpec,
} from "@/core/ai/calls/talk";
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
import {
  runTalkCall,
  type TalkCallContext,
  type TalkDeps,
  type TalkOutcome,
} from "@/server/ai/talk";
import { getDb } from "@/server/db";

export type {
  AiCallContext,
  AiDeps,
  AiFailureReason,
  AiOutcome,
} from "@/server/ai/run";
export type {
  TalkCallContext,
  TalkDeps,
  TalkOutcome,
  TalkSuccess,
} from "@/server/ai/talk";

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

/**
 * 회화 턴 한 번(6.2 · 8절 회화 턴 실패 · C92). 검사를 지난 영어 문장을 ctx.onSentence 로 흘려 보낸다(브라우저는 검사 전 글을 받지 않음).
 * 결과의 sentSentences 로 b 가 다시 쓸 토리 차례(toriRewriteOf)를 만든다. 실패 길(첫 문장 뒤 끊김 · 첫 문장 전 실패 · 거절)의 화면은 b.
 * 계약: onSentence 는 던지지 않는다 — 브라우저 연결이 닫혀도 쓰기 실패를 삼키고 응답을 끝까지 받아 토리 행을 저장한다(5절 · 8절).
 * 그래도 던지면 그 시도를 ai_calls 에 연결 실패로 남긴 뒤 그 오류를 다시 던진다.
 */
export function talkTurn(
  input: TalkTurnInput,
  ctx: TalkCallContext & { onSentence: (sentence: string) => void },
  deps?: TalkDeps,
): Promise<TalkOutcome> {
  return runTalkCall(talkTurnSpec, input, ctx, deps);
}

/**
 * 끝맺음 턴(같은 규격 · 같은 대화, ai.max_tokens.talk_closing · ai.timeout_seconds.feedback — 6.1 · C21). 흘려 보내지 않는다.
 * '그만하기' 응답 뒤(after)에서 부른다. input.turn.closing 은 참이어야 한다.
 */
export function talkClosing(
  input: TalkTurnInput,
  ctx: Omit<TalkCallContext, "onSentence">,
  deps?: TalkDeps,
): Promise<TalkOutcome> {
  if (!input.turn.closing)
    throw new RangeError("끝맺음 턴 입력의 closing 이 참이 아니다");
  return runTalkCall(talkClosingSpec, input, ctx, deps);
}

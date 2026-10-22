"use server";
// 쓰기 AI 서버 액션(plan-p11b 파일별 값 3, 6.2 · 8절 · 10절 운영). 모든 함수의 첫 문장은 requireAccess() 다(P3b 훑기 시험).
// AI 는 서버 함수(src/server/writing)가 P9c 공개 함수로 부른다. 입력은 화면에서 온 그대로 받아 서버에서 다시 본다(Zod).
// 아이 글 · AI 글을 로그에 내지 않는다. 첨삭은 초고 제출 응답 뒤(after())에 부른다.
import { after } from "next/server";
import { requireAccess } from "@/server/access/guard";
import { now } from "@/server/clock";
import {
  checkGuided,
  type DraftOutcome,
  feedbackStatus,
  type GuidedCheckOutcome,
  type RewriteOutcome,
  submitDraft as submitDraftText,
  submitRewrite as submitRewriteText,
  type ThinkoutOutcome,
  thinkoutStep,
} from "@/server/writing";

/** 쓰기 4~5 '다 썼어요' — 확인(칭찬 · 고칠 곳 하나) 또는 확인 없이 넘어감 · 하루 안전 상한. 같은 시도 id 는 저장한 결과 그대로. */
export async function checkGuidedWriting(
  input: unknown,
): Promise<GuidedCheckOutcome> {
  await requireAccess();
  return checkGuided(input, { now });
}

/** 쓰기 6~12 생각 꺼내기 한 턴(첫 턴은 답 없이) — 다음 질문 · 끝(요약 · 낱말 · 틀) · '이번에는 바로 써 볼까요' · 하루 안전 상한. */
export async function thinkoutNext(input: unknown): Promise<ThinkoutOutcome> {
  await requireAccess();
  return thinkoutStep(input, { now });
}

/** 쓰기 6~12 '다 썼어요' — 초고를 첨삭 대기로 저장하고 첫 세션을 끝낸 뒤 바로 돌아온다(첨삭은 응답 뒤). */
export async function submitDraft(input: unknown): Promise<DraftOutcome> {
  await requireAccess();
  return submitDraftText(input, { now, schedule: (task) => after(task) });
}

/** 결과 화면이 다시 읽는 첨삭 상태(대기 · 옴 · 못 함 · 낸 시각). */
export async function draftFeedbackStatus(
  input: unknown,
): ReturnType<typeof feedbackStatus> {
  await requireAccess();
  return feedbackStatus(input);
}

/** 쓰기 6~12 둘째 세션 '다 고쳤어요' — 고쳐 쓴 글을 저장하고 그 초고 첨삭의 모범 답안을 돌려준다(그 전에는 보이지 않음). */
export async function submitRewrite(input: unknown): Promise<RewriteOutcome> {
  await requireAccess();
  return submitRewriteText(input, { now });
}

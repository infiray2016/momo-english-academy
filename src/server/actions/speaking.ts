"use server";
// 말하기 AI 서버 액션 — 질문 답 몫(plan-p11c 파일별 값 1 · 가르치고 배우는 수업 plan 다 · 정한 것 5). 모든 함수의 첫 문장은
// requireAccess() 다(접근 쿠키가 없으면 401, P3b 훑기 시험). AI 는 서버 함수(src/server/speaking)가 P9c 공개 함수로 부른다. 입력은 화면에서
// 온 그대로 받아 서버에서 다시 본다(Zod). 아이 글 · AI 글을 로그에 내지 않는다. 발표 · 확인 질문 액션은 P11c 가 더한다.
import { requireAccess } from "@/server/access/guard";
import { now } from "@/server/clock";
import { evaluateAnswer, type SpeakingAnswerOutcome } from "@/server/speaking";

/** 말하기 질문 답(AI 판정 단계) — 합친 판정 · 피드백 · 바른 답, 또는 판정 없이 넘어감 · 하루 안전 상한. 같은 시도 id 는 저장한 결과 그대로. */
export async function evaluateSpeakingAnswer(
  input: unknown,
): Promise<SpeakingAnswerOutcome> {
  await requireAccess();
  return evaluateAnswer(input, { now });
}

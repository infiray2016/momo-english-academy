"use server";
// 쓰기 AI 서버 액션(plan-p11b 파일별 값 3, 6.2 · 8절). 모든 함수의 첫 문장은 requireAccess() 다(P3b 훑기 시험).
// AI 는 서버 함수(src/server/writing)가 P9c 공개 함수로 부른다. 입력은 화면에서 온 그대로 받아 서버에서 다시 본다(Zod).
// 아이 글 · AI 글을 로그에 내지 않는다. 생각 꺼내기 · 초고 · 첨삭 상태 · 고쳐 쓰기는 차례 6 · 7 이 더한다.
import { requireAccess } from "@/server/access/guard";
import { now } from "@/server/clock";
import { checkGuided, type GuidedCheckOutcome } from "@/server/writing";

/** 쓰기 4~5 '다 썼어요' — 확인(칭찬 · 고칠 곳 하나) 또는 확인 없이 넘어감 · 하루 안전 상한. 같은 시도 id 는 저장한 결과 그대로. */
export async function checkGuidedWriting(
  input: unknown,
): Promise<GuidedCheckOutcome> {
  await requireAccess();
  return checkGuided(input, { now });
}

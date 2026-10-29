"use server";
// 회화 선생님 서버 액션(선생님 화면 plan 값 6, 3.3 '선생님을 골라요' · 10절 접근 제어). 모든 함수의 첫 문장은 requireAccess() 다(P3b 훑기 시험).
// 입력은 화면에서 온 그대로 받아 서버(src/server/teacher)의 Zod 로 다시 본다. 관찰 쪽 지우기(clearTeacherForPreview)는 따로 둔다(d6).
import { requireAccess } from "@/server/access/guard";
import { type ChooseTeacherOutcome, chooseTeacherFor } from "@/server/teacher";

/** 선생님 고르기 — 명단 밖 · 보이지 않는 선생님 · 이미 고른 프로필은 거부한다. */
export async function chooseTeacher(
  input: unknown,
): Promise<ChooseTeacherOutcome> {
  await requireAccess();
  return chooseTeacherFor(input);
}

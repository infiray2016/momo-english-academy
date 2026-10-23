"use server";
// 관찰 쪽(/dev/teacher-probe — 프리뷰 배포만) 서버 액션(선생님 화면 plan 값 6 · 16, 컨트롤러 덧 2026-10-23 '단원 바로 가기').
// 모든 함수의 첫 문장은 requireAccess() 다(P3b 훑기 시험). 운영 빌드에는 이 파일을 가져오는 쪽이 없고(관찰 쪽만 가져옴), 몸
// (src/server/preview)이 운영 배포(VERCEL_ENV=production)면 아무것도 쓰지 않는다 — 깊이 방어.
import { requireAccess } from "@/server/access/guard";
import { now } from "@/server/clock";
import {
  clearTeacherForPreviewFor,
  type JumpUnitOutcome,
  jumpUnitForPreviewFor,
} from "@/server/preview";

/** 이 프로필의 선생님 지우기 — 다음 회화에서 다시 고른다. */
export async function clearTeacherForPreview(): Promise<{ ok: boolean }> {
  await requireAccess();
  return clearTeacherForPreviewFor();
}

/** 단원 바로 가기 — 영역 하나의 지금 단원을 1단계 단원 하나로. */
export async function jumpUnitForPreview(
  input: unknown,
): Promise<JumpUnitOutcome> {
  await requireAccess();
  return jumpUnitForPreviewFor(input, { now });
}

// 점검 틀용 대역: 서버 액션(정리의 따라 말하기 저장)은 부르지 않는다.
export async function saveLessonFollowAlong(): Promise<{ ok: true }> {
  return { ok: true };
}

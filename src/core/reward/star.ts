// 별 셈(3.5 별 행 · 요청자 결정 R12 · S6, 13절 C166 R3 · C167 (5) — P12 전 잠정 셈). DB 없는 순수 모듈이다.
// 끝낸 새 수업(오늘 완료와 같은 한 벌 NEW_LESSON_KINDS — 정규 · 보강 · 연습 · 안 해 본 수업) 하나에 reward.star_complete 개이고,
// 성적 · 시간 · 힌트 · 하루 상한과 관계없다. 다시 하기 · 복습 · 단계 평가 · 배치 평가에는 없다. 쓰기 6단계 이상은 둘째 세션(고쳐 쓰기)을
// 끝낼 때 붙고, 회화는 목표 턴에 닿을 때 세션이 '완료'가 되므로(그 전에 그치면 '중단') 끝낸 세션이면 붙는다. 홈의 별 합 · 결과 화면 ·
// 회화 마무리가 이 셈 하나를 쓴다.
// 잠정 셈 — 장부는 P12: 홈 합은 끝낸 세션 수에 지금 설정값을 곱하므로, reward.star_complete 를 바꾸면 지난 별도 다시 센다(3.5 '줄지 않고
// 쌓인다'는 P12 별 장부(star_ledger)가 세션마다 그때 값을 적으면서 지킨다).
// 안 해 본 수업의 '처음 끝낼 때만'(S6)은 같은 수업을 다시 하면 세션 종류가 다시 하기(retry)라 종류만으로 가른다.
import type { Area } from "@/core/seed/structure";
import { type DoneSession, NEW_LESSON_KINDS } from "@/core/today/done";

export type StarSession = {
  area: Area;
  kind: DoneSession["kind"];
  /** 5절 sessions.status — 별은 '완료'만. */
  status: DoneSession["status"];
  /** 쓰기 6단계 이상의 첫 세션(draft) · 둘째 세션(rewrite), 그 밖 null. */
  writingPart: "draft" | "rewrite" | null;
};

/** 이 세션이 별을 받는가(끝낸 새 수업 — 쓰기 초고는 아니고 고쳐 쓰기에서). */
export function earnsStar(session: StarSession): boolean {
  if (session.status !== "completed") return false;
  if (!NEW_LESSON_KINDS.has(session.kind)) return false;
  if (session.area === "writing" && session.writingPart === "draft")
    return false;
  return true;
}

/** 별 합: 별을 받는 세션 수 × reward.star_complete(perLesson). */
export function starTotalOf(
  sessions: readonly StarSession[],
  perLesson: number,
): number {
  return sessions.filter(earnsStar).length * perLesson;
}

// 단계가 없는 영역의 배치 평가 자리(plan-p13b 값 12). 수업 목록 · 지난 수업 쪽이 같이 쓴다.
import type { Area } from "@/core/seed/structure";

/** 회화는 배치 평가가 없어 말하기 배치 평가로(회화 단계는 말하기 배치에서 정해진다 — 3.2, 4절 홈 표 회화 카드 행과 같은 길). */
export function placementPathOf(area: Area): string {
  return area === "talk" ? "/speaking/placement" : `/${area}/placement`;
}

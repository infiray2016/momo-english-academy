// 홈 위 띠 오른쪽 칸(4절 홈 표 R-12 · AC-U3 · 13절 C179 (1), UI · UX 묶음 0-다). DB 없는 순수 함수.
// 연속 학습 일수와 별 수는 뜻 있는 값(1 이상)이 생긴 뒤에만 칸이 된다 — 첫 사용 홈의 위 띠에는 0 이 없다.
// 연속 학습 일수는 P12 가 값을 넣는다(그 전에는 값이 없어 칸을 만들지 않는다).

/** 위 띠 칸 하나(차례는 연속 학습 일수 → 별 수). */
export type HomeBandChip =
  | { kind: "streak"; value: number }
  | { kind: "stars"; value: number };

/** 위 띠 오른쪽 칸 목록(순수 함수): 값이 없거나 1 보다 작으면 그 칸을 만들지 않는다. */
export function homeBandChipsOf({
  starTotal,
  streakDays,
}: {
  starTotal: number;
  /** 연속 학습 일수(P12 — 그 전에는 넘기지 않는다). */
  streakDays?: number | null | undefined;
}): HomeBandChip[] {
  const chips: HomeBandChip[] = [];
  if (streakDays != null && streakDays >= 1)
    chips.push({ kind: "streak", value: streakDays });
  if (starTotal >= 1) chips.push({ kind: "stars", value: starTotal });
  return chips;
}

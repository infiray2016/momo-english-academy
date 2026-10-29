// 토리와 친한 정도 · 토리 이야기 열기(3.5 친한 정도 행 · AC-16a, plan-p13a 파일별 값 12). 순수 모듈이다.

export type FriendshipRules = {
  /** talk.friendship_per_talk */
  per: number;
  /** talk.friendship_max */
  max: number;
};

/**
 * 새 대화를 목표 턴까지 했을 때(3.5): 다시 하기면 그대로. 칸 + per 가 max 에 닿으면 지금 구간의 다음 이야기를 열고 0칸.
 * 구간 이야기를 다 열었으면 열지 않고 max 에서 멈춘다. 구간이 바뀌면 열린 수는 새 구간 기준이다(opened = 그 구간 연 수) —
 * 차 있던 칸은 그대로 두되, 앞 구간에서 다 열어 max 에서 멈춰 있던 칸은 새 구간에서 0칸부터 다시 오른다.
 * unlocked 는 새로 연 이야기의 그 구간 안 차례(1부터).
 */
export function friendshipAfter(
  {
    friendship,
    opened,
    storiesInBand,
    isRetry,
  }: {
    friendship: number;
    /** 지금 구간에서 연 이야기 수. */
    opened: number;
    /** 구간 이야기 수(STORIES_PER_BAND — 시드 규격 수). */
    storiesInBand: number;
    isRetry: boolean;
  },
  { per, max }: FriendshipRules,
): { friendship: number; opened: number; unlocked: number | null } {
  if (isRetry) return { friendship, opened, unlocked: null };
  if (opened >= storiesInBand)
    return {
      friendship: Math.min(max, friendship + per),
      opened,
      unlocked: null,
    };
  const start = friendship >= max ? 0 : friendship;
  const next = start + per;
  if (next >= max)
    return { friendship: 0, opened: opened + 1, unlocked: opened + 1 };
  return { friendship: next, opened, unlocked: null };
}

// 읽기 지문 뜻 쪽지 자리(화면 검토 I-3): 낱말이 카드 오른쪽 반이면 쪽지의 오른쪽 끝을 낱말에 맞추고(end), 그래도 카드를 넘으면
// 넘친 만큼 카드 안으로 당긴다. 화면이 잰 상자(px)만 받는 순수 함수다.

type Span = { left: number; right: number };

/** 낱말 가운데가 카드 가운데보다 오른쪽이면 오른쪽 끝 맞춤. */
export function noteAlignOf(
  word: { left: number; width: number },
  card: Span,
): "start" | "end" {
  return word.left + word.width / 2 > (card.left + card.right) / 2
    ? "end"
    : "start";
}

/** 쪽지를 카드 안에 넣는 가로 옮김(px — 음수면 왼쪽). 이미 안이면 0. */
export function noteShiftOf(note: Span, card: Span): number {
  if (note.right > card.right) return card.right - note.right;
  if (note.left < card.left) return card.left - note.left;
  return 0;
}

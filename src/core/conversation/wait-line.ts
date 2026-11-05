// 회화 앱 맞장구 한 줄 고르기(회화 plan 정한 것 20, 정본 03 4절 '선생님 차례'): 보낸 뒤 talk.wait_line_seconds 안에 첫 문장이 오지 않으면
// 선생님 목소리로 읽는 줄. 목록은 시드 목록 lists/talk-wait-lines.json(빌드에 묶음, 서버 seedTalkWaitLines 가 화면 자료로 내림)이고,
// 고르기는 턴 번호로 돌린다(stream.ts safeLineOf 꼴 — 같은 줄이 턴마다 되풀이되지 않게). 맞장구는 대화 기록 · 다시 쓸 선생님 차례에 넣지 않는다.
// 화면과 서버가 함께 쓰는 순수 모듈이다.

/** 그 선생님 차례(턴 번호)의 맞장구 한 줄. 목록이 비었으면 null(읽지 않는다). */
export function waitLineOf(
  lines: readonly string[],
  turnNo: number,
): string | null {
  if (lines.length === 0) return null;
  const index =
    ((Math.trunc(turnNo) % lines.length) + lines.length) % lines.length;
  return lines[index] ?? null;
}

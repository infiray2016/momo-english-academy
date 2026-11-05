// 힌트 글을 받는 동안의 점 셋(UX 검토 3판 U5-10 · 13절 C166). 1~3단계 힌트 단은 글을 서버에서 그때 받는데, 그동안 빈 점선 상자만
// 보여 아이가 눌린 줄 몰랐다. 아이 차례 힌트 단이 글이 아직 없을 때(text === undefined) 그 자리에 그린다. 높이는 힌트 단 글 한 줄과
// 같게(min-h-9 — 안내 글 20px 줄 높이 · 위아래 틈), 움직임 줄이기면 멈춘 점. 훅 없음 · 속성 없음.

/** 점 수 · 점마다 늦춤(화면 꼴 값 — 말풍선 기다림 점과 같은 값). */
const DOTS = [0, 1, 2] as const;
const DOT_DELAY_MS = 150;

export function HintLoadingDots() {
  return (
    <span
      data-hint-loading=""
      role="status"
      className="flex min-h-9 items-center gap-2"
    >
      {DOTS.map((i) => (
        <span
          key={i}
          aria-hidden
          className="size-3 rounded-full bg-ink motion-safe:animate-bounce"
          style={{ animationDelay: `${i * DOT_DELAY_MS}ms` }}
        />
      ))}
    </span>
  );
}

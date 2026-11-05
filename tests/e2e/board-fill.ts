// 판 상자 셈 도우미(UI · UX plan 묶음 5-가 · spec 설계 5.4 화면 가족 · 15절 AC-23j '판 아래 빈 바탕이 화면 높이의 1/3 아래' · D-1 · D-14).
// 보는 창 높이에서 종이(위 띠 [data-paper-band] · 큰 판 [data-family-board])가 덮지 않은 몫이 빈 바탕(책상)이다. 겹친 상자는 한 번만,
// 창 밖으로 나간 부분은 빼고 센다. 세션 판은 판 아래 끝이 보는 창 아래 끝(ChildScreen 아래 여백만 남음)인지도 잰다. 첫 실행 종이는 높이가
// 내용(첫 자식 위 ~ 끝 자식 아래 + 안 여백 · 테)과 같은지 잰다(D-14). 셈 함수 deskEmptyShareOf 는 순수라 tests/unit/ux-progress.test.ts 가
// 잠근다. 이 파일은 Playwright 형만 가져온다(값 없음). 시험 쪽 상수(앱 설정값이 아님): DESK_EMPTY_MAX 는 AC-23j 의 1/3, 나머지는 화면 꼴 값.
import type { Page } from "@playwright/test";

/** 빈 바탕 몫의 상한(AC-23j · 설계 5.4 '화면 높이의 1/3'). */
export const DESK_EMPTY_MAX = 1 / 3;
/** 세션 판 아래 끝과 보는 창 아래 끝 사이의 허용 틈(px) — ChildScreen 아래 여백 24px(py-6) + 반올림 1px. */
export const BOARD_BOTTOM_GAP_MAX = 25;
/** 첫 실행 종이 높이와 내용 높이의 허용 차(px, 반올림). */
export const FIT_TOLERANCE_PX = 2;
/** 종이로 치는 상자(위 띠 · 큰 판). */
export const PAPER_SELECTORS = "[data-paper-band], [data-family-board]";

export type Span = { top: number; bottom: number };

/** 빈 바탕 몫(순수): 보는 창 [0, height] 에서 상자들이 덮지 않은 길이 ÷ height. */
export function deskEmptyShareOf(
  height: number,
  papers: readonly Span[],
): number {
  const spans = papers
    .map((p) => ({
      top: Math.max(0, p.top),
      bottom: Math.min(height, p.bottom),
    }))
    .filter((p) => p.bottom > p.top)
    .sort((a, b) => a.top - b.top);
  let covered = 0;
  let end = 0;
  for (const span of spans) {
    const from = Math.max(span.top, end);
    if (span.bottom > from) covered += span.bottom - from;
    end = Math.max(end, span.bottom);
  }
  return (height - covered) / height;
}

/** 지금 쪽(지금 창 크기)의 판 상자 셈: 빈 바탕 몫 · 가장 아래 판의 아래 틈(창 아래 끝 − 판 아래 끝). 맨 위로 굴린 뒤 잰다. */
export async function boardFill(
  page: Page,
): Promise<{ emptyShare: number; bottomGap: number; boards: number }> {
  const { height, spans, boardBottom, boards } = await page.evaluate(
    (selector) => {
      window.scrollTo(0, 0);
      const visible = (el: Element) => el.getClientRects().length > 0;
      const papers = Array.from(document.querySelectorAll(selector)).filter(
        visible,
      );
      const rects = papers.map((el) => el.getBoundingClientRect());
      const boardRects = papers
        .filter((el) => el.hasAttribute("data-family-board"))
        .map((el) => el.getBoundingClientRect());
      return {
        height: window.innerHeight,
        spans: rects.map((r) => ({ top: r.top, bottom: r.bottom })),
        boardBottom: Math.max(...boardRects.map((r) => r.bottom)),
        boards: boardRects.length,
      };
    },
    PAPER_SELECTORS,
  );
  return {
    emptyShare: deskEmptyShareOf(height, spans),
    bottomGap: height - boardBottom,
    boards,
  };
}

/** 그 종이의 높이와 내용 높이의 차(px, 절댓값) — 종이 높이 = 내용(D-14). */
export async function paperOverContent(
  page: Page,
  selector: string,
): Promise<number> {
  return page.locator(selector).evaluate((paper) => {
    const box = paper.getBoundingClientRect();
    const style = getComputedStyle(paper);
    const kids = Array.from(paper.children).filter(
      (el) =>
        el.getClientRects().length > 0 &&
        getComputedStyle(el).position !== "absolute",
    );
    const first = kids[0]?.getBoundingClientRect();
    const last = kids.at(-1)?.getBoundingClientRect();
    if (!first || !last) return box.height;
    const inner =
      last.bottom -
      first.top +
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom) +
      Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderBottomWidth);
    return Math.abs(box.height - inner);
  });
}

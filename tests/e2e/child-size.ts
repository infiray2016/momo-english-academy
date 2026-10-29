// 아이 화면 크기 훑기(4절 아이 화면 크기 · AC-N9, plan-p10b 파일별 값 9). P5b e2e-local '활동 표시' 훑기를 일반화했다.
// 뿌리(기본 [data-child-screen]) 안에서: 자기 글이 있는 요소는 20px 이상, lang="en" 조상이 있으면 24px 이상,
// 누르는 것(button · a · [role=button] · [data-touch]) 안의 글은 22px 이상이고 그 상자는 56 × 56 이상.
// [data-parent-info](부모용 정보) · [data-size-exempt](지문 안 낱말 단추 등 예외 표시) 안은 뺀다. '%' 가 없고 가로 넘침이 없다.
// '버튼 글자 22px' 는 누르는 것의 이름표(영역 이름 · 단계 · 수업 번호 · 띠 · 단추 글)에 건다. 카드 꼴 단추 안의 보조 줄은 안내 글이라
// 누르는 것 안쪽에 [data-size-guide] 표시(그 요소 또는 누르는 것 안쪽 조상)가 있으면 20px 기준이다(13절 C82). 누르는 것 바깥 표시는 효과가 없다.
// 기준 수는 4절 잠정 값이라 이름 붙인 상수다(P5b 시험과 같은 값).
import type { Locator, Page } from "@playwright/test";

export const MIN_GUIDE_PX = 20;
export const MIN_ENGLISH_PX = 24;
export const MIN_BUTTON_TEXT_PX = 22;
export const MIN_TARGET_PX = 56;
/** 4절 기준 기기(10.9형 태블릿) 세로 · 가로. */
export const CHILD_VIEWPORTS = {
  portrait: { width: 820, height: 1180 },
  landscape: { width: 1180, height: 820 },
} as const;
/** 크기 훑기에서 빼는 표시(지문 안 낱말 단추처럼 글줄 크기를 따라야 하는 것 — plan-p11a 위험 9). */
export const SIZE_EXEMPT_ATTR = "data-size-exempt";
/** 카드 꼴 단추 안 보조 줄 표시(안내 글 20px 기준, 13절 C82). */
export const SIZE_GUIDE_ATTR = "data-size-guide";

type Limits = {
  guide: number;
  english: number;
  button: number;
  target: number;
  exempt: string;
  guideMark: string;
};

/** 지금 쪽(지금 화면 크기)의 크기 위반 목록. 비면 통과. */
export async function childSizeProblems(
  page: Page,
  root = "[data-child-screen]",
): Promise<string[]> {
  const limits: Limits = {
    guide: MIN_GUIDE_PX,
    english: MIN_ENGLISH_PX,
    button: MIN_BUTTON_TEXT_PX,
    target: MIN_TARGET_PX,
    exempt: SIZE_EXEMPT_ATTR,
    guideMark: SIZE_GUIDE_ATTR,
  };
  return page.evaluate(
    ({ selector, min }) => {
      const out: string[] = [];
      const base = document.querySelector(selector);
      if (!base) return [`뿌리 ${selector} 가 없다`];
      const skipped = (el: Element) =>
        el.closest(`[data-parent-info], [${min.exempt}]`) !== null;
      const interactive = "button, a, [role=button], [data-touch]";
      // '%' — 부모용 정보 밖의 글에서
      const walker = document.createTreeWalker(base, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        if (
          parent &&
          !skipped(parent) &&
          (node.textContent ?? "").includes("%")
        )
          out.push(`'%': ${(node.textContent ?? "").trim()}`);
      }
      for (const el of base.querySelectorAll("*")) {
        if (skipped(el)) continue;
        const ownText = [...el.childNodes]
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent ?? "")
          .join("")
          .trim();
        if (ownText !== "") {
          const size = Number.parseFloat(getComputedStyle(el).fontSize);
          const english = (
            el.closest("[lang]")?.getAttribute("lang") ?? ""
          ).startsWith("en");
          const target = el.closest(interactive);
          // 보조 줄 표시는 누르는 것 안쪽에 있을 때만 듣는다
          const guideMark = target ? el.closest(`[${min.guideMark}]`) : null;
          const guided =
            guideMark !== null && target?.contains(guideMark) === true;
          const need = Math.max(
            english ? min.english : min.guide,
            target && !guided ? min.button : 0,
          );
          if (size < need) out.push(`'${ownText}' ${size}px < ${need}px`);
        }
        if (el.matches(interactive)) {
          const box = el.getBoundingClientRect();
          // 그리지 않는 것(숨김)은 누를 수 없어 뺀다
          if (box.width === 0 && box.height === 0) continue;
          if (box.width < min.target || box.height < min.target) {
            const name = (el.textContent ?? "").trim().slice(0, 20);
            out.push(
              `누르는 곳 '${name}' ${Math.round(box.width)}x${Math.round(box.height)}`,
            );
          }
        }
      }
      const doc = document.documentElement;
      if (doc.scrollWidth > doc.clientWidth)
        out.push(`가로 넘침 ${doc.scrollWidth} > ${doc.clientWidth}`);
      return out;
    },
    { selector: root, min: limits },
  );
}

/** 세로 820 · 가로 1180 둘 다 훑어 위반을 '<이름> <방향>: …' 으로 모은다. 끝나면 세로로 돌려 둔다. */
export async function childSizeBothWays(
  page: Page,
  name: string,
  root?: string,
): Promise<string[]> {
  const out: string[] = [];
  for (const [label, size] of Object.entries(CHILD_VIEWPORTS)) {
    await page.setViewportSize(size);
    // 방향 미디어 질의가 다시 맞춰지도록 한 그림 기다린다
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
    );
    for (const problem of await childSizeProblems(page, root))
      out.push(`${name} ${label}: ${problem}`);
  }
  await page.setViewportSize(CHILD_VIEWPORTS.portrait);
  return out;
}

/** 기울기 없는 레이아웃 상자(offset 너비 · 높이 · 쪽 위에서 잰 위 · 아래 끝). */
export type LayoutBox = {
  width: number;
  height: number;
  top: number;
  bottom: number;
};

/**
 * 요소들의 레이아웃 크기 · 자리(기울기 · 변형을 빼고 — offsetWidth · offsetHeight · offsetParent 사슬의 offsetTop 합). 포스트잇은 보드 꼴로
 * 기울어 있어(board.tsx TILT) getBoundingClientRect 상자가 각도만큼 커지므로, 같은 크기 · 같은 아래 끝 단언은 이 값으로 잰다(디자인 fix 1b).
 */
export async function layoutBoxesOf(locator: Locator): Promise<LayoutBox[]> {
  return locator.evaluateAll((els) =>
    els.map((el) => {
      const node = el as HTMLElement;
      let top = 0;
      for (
        let n: HTMLElement | null = node;
        n;
        n = n.offsetParent as HTMLElement | null
      )
        top += n.offsetTop;
      return {
        width: node.offsetWidth,
        height: node.offsetHeight,
        top,
        bottom: top + node.offsetHeight,
      };
    }),
  );
}

/** 값들의 가장 큰 차이(같은 크기 단언용). */
export function spreadOf(values: readonly number[]): number {
  return values.length === 0 ? 0 : Math.max(...values) - Math.min(...values);
}

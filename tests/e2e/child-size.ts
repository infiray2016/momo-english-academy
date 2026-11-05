// 아이 화면 크기 훑기(4절 아이 화면 크기 · AC-N9, plan-p10b 파일별 값 9). P5b e2e-local '활동 표시' 훑기를 일반화했다.
// 뿌리(기본 [data-child-screen]) 안에서: 자기 글이 있는 요소는 20px 이상, lang="en" 조상이 있으면 24px 이상,
// 누르는 것(button · a · [role=button] · [data-touch]) 안의 글은 22px 이상이고 그 상자는 56 × 56 이상.
// [data-parent-info](부모용 정보) · [data-size-exempt](지문 안 낱말 단추 등 예외 표시) 안은 뺀다. '%' 가 없고 가로 넘침이 없다.
// '버튼 글자 22px' 는 누르는 것의 이름표(영역 이름 · 단계 · 수업 번호 · 띠 · 단추 글)에 건다. 카드 꼴 단추 안의 보조 줄은 안내 글이라
// 누르는 것 안쪽에 [data-size-guide] 표시(그 요소 또는 누르는 것 안쪽 조상)가 있으면 20px 기준이다(13절 C82). 누르는 것 바깥 표시는 효과가 없다.
// 기준 수는 4절 잠정 값이라 이름 붙인 상수다(P5b 시험과 같은 값).
// 대비 · 꾸밈 훑기(UI · UX plan 묶음 2-다 · spec 설계 5 · NFR-U1 · AC-23e (2) (3) · AC-N9 고친 문장):
// - 대비: 자기 글이 있는 요소마다 글자색과 조상 층(바탕색 · 흐림)을 모아 실제 글자 화소 · 바탕 화소 색으로 풀고(공용 색 모듈 textPixels)
//   7:1 이상인지 본다. 글에서 가장 가까운 불투명 바탕이 책상(--color-desk)이거나 없으면 '글 바로 아래가 책상'으로 위반이다(모눈 · 여백 선이
//   글 밑에 깔린다, spec R-2). 흐린 단추(:disabled · aria-disabled="true" 안의 글, 5.2 흐린 단추 꼴)는 뺀다. 다만 정답 보이기 상태의 보기
//   (data-choice-state 가 none 이 아님)는 꺼진 단추가 아니라 결과 표시라 빼지 않는다(2-나 검토 M1 '틀린 보기 70%').
//   흐림(opacity)으로 옅게 한 글도 그대로 잰다. 형제 · 위치 지정 층과 바탕 그림(그라데이션)은 보지 않는다.
// - 꾸밈: 꾸밈 상자([data-decor] 만, 바탕 층 [data-desk] 는 아님)가 뿌리 안의 글 · 누르는 것 상자와 겹치지 않는다(지금 굴린 자리에서).
import type { Locator, Page } from "@playwright/test";
import {
  contrastRatio,
  type Layer,
  nearestOpaqueLayer,
  type Rgba,
  textPixels,
} from "../../src/core/color/contrast";

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
/** 글자와 바로 아래 바탕의 대비 하한(NFR-U1 · AC-N9, spec 설계 5.1 '7:1'). */
export const MIN_TEXT_CONTRAST = 7;
/** 꾸밈 상자 표지(decor.tsx — 낙서마다). 바탕 층 data-desk 는 화면 전체라 겹침 훑기에서 보지 않는다(2-가 보고). */
export const DECOR_ATTR = "data-decor";

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

/** 대비 훑기가 브라우저에서 모은 글 하나(셈은 Node 의 공용 색 모듈이 한다). */
type TextSample = {
  text: string;
  glyph: Rgba;
  /** 바깥(<html>)부터 글 요소까지. desk 는 바탕색이 책상 토큰과 같은 층. */
  layers: (Layer & { desk: boolean })[];
  /** 브라우저가 읽지 못한 색 글자(있으면 위반으로 알린다). */
  unreadable: string[];
};

/** 지금 쪽 뿌리 안 글의 글자색 · 조상 층(흐린 단추 글 · 보이지 않는 글 · svg 글은 뺌). */
async function textSamples(page: Page, root: string): Promise<TextSample[]> {
  return page.evaluate((selector) => {
    const base = document.querySelector(selector);
    if (!base) return [];
    // 계산된 색(rgb · color() · oklab 무엇이든)을 1 × 1 캔버스에 칠해 0~255 채널 · 0~1 투명도로 읽는다
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const SENTINEL = "rgba(1, 2, 3, 0.5)";
    const unreadable: string[] = [];
    const rgbaOf = (color: string): [number, number, number, number] => {
      if (!ctx) return [0, 0, 0, 0];
      ctx.fillStyle = SENTINEL;
      const before = ctx.fillStyle;
      ctx.fillStyle = color;
      if (
        ctx.fillStyle === before &&
        color.replace(/\s/g, "") !== SENTINEL.replace(/\s/g, "")
      )
        unreadable.push(color);
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 0] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const deskToken = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-desk")
      .trim();
    const desk = deskToken ? rgbaOf(deskToken) : undefined;
    const same = (a: readonly number[], b: readonly number[] | undefined) =>
      b !== undefined &&
      a.every((v, i) => Math.abs(v - (b[i] ?? 0)) < 0.01 * 255);
    // 흐린 단추: 꺼진 누르는 것 안의 글. 정답 보이기 상태의 보기는 결과 표시라 빼지 않는다
    const dimmed = (el: Element) => {
      const control = el.closest(':disabled, [aria-disabled="true"]');
      if (!control) return false;
      const state = control.getAttribute("data-choice-state");
      return state === null || state === "none";
    };
    const out: {
      text: string;
      glyph: [number, number, number, number];
      layers: {
        background: [number, number, number, number];
        opacity: number;
        desk: boolean;
      }[];
      unreadable: string[];
    }[] = [];
    for (const el of base.querySelectorAll("*")) {
      if (el.closest("svg")) continue;
      const own = [...el.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent ?? "")
        .join("")
        .trim();
      if (own === "" || dimmed(el)) continue;
      const style = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      if (style.visibility !== "visible" || box.width <= 1 || box.height <= 1)
        continue;
      unreadable.length = 0;
      const chain: Element[] = [];
      for (let n: Element | null = el; n; n = n.parentElement) chain.unshift(n);
      const layers = chain.map((n) => {
        const s = getComputedStyle(n);
        const background = rgbaOf(s.backgroundColor);
        return {
          background,
          opacity: Number.parseFloat(s.opacity),
          desk: background[3] > 0.999 && same(background, desk),
        };
      });
      out.push({
        text: own.slice(0, 24),
        glyph: rgbaOf(style.color),
        layers,
        unreadable: [...unreadable],
      });
    }
    return out;
  }, root);
}

/** 지금 쪽(지금 화면 크기)의 대비 위반 목록(NFR-U1 · AC-23e (2) · AC-N9). 비면 통과. */
export async function childContrastProblems(
  page: Page,
  root = "[data-child-screen]",
): Promise<string[]> {
  const out: string[] = [];
  for (const sample of await textSamples(page, root)) {
    if (sample.unreadable.length > 0) {
      out.push(
        `색을 못 읽음 '${sample.text}': ${sample.unreadable.join(" · ")}`,
      );
      continue;
    }
    const near = nearestOpaqueLayer(sample.layers);
    if (near === -1 || sample.layers[near]?.desk) {
      out.push(`글 바로 아래가 책상 '${sample.text}'`);
      continue;
    }
    const pixels = textPixels(sample.layers, sample.glyph);
    const ratio = contrastRatio(pixels.text, pixels.background);
    if (ratio < MIN_TEXT_CONTRAST)
      out.push(
        `대비 '${sample.text}' ${ratio.toFixed(2)}:1 < ${MIN_TEXT_CONTRAST}:1(글 ${pixels.text} · 바탕 ${pixels.background})`,
      );
  }
  return out;
}

/** 지금 쪽의 꾸밈 상자가 뿌리 안 글 · 누르는 것 상자와 겹친 목록(AC-23e (3)). 비면 통과. */
export async function decorOverlapProblems(
  page: Page,
  root = "[data-child-screen]",
): Promise<string[]> {
  return page.evaluate(
    ({ selector, decorAttr }) => {
      const base = document.querySelector(selector);
      if (!base) return [`뿌리 ${selector} 가 없다`];
      const shown = (box: DOMRect) => box.width > 1 && box.height > 1;
      const decor = [...document.querySelectorAll(`[${decorAttr}]`)]
        .map((el) => ({
          name: el.getAttribute(decorAttr) ?? "",
          box: el.getBoundingClientRect(),
        }))
        .filter((d) => shown(d.box));
      const targets: { name: string; box: DOMRect }[] = [];
      const interactive = "button, a, [role=button], [data-touch]";
      for (const el of base.querySelectorAll("*")) {
        if (el.closest(`[${decorAttr}], [data-desk]`)) continue;
        if (getComputedStyle(el).visibility !== "visible") continue;
        if (el.matches(interactive)) {
          const box = el.getBoundingClientRect();
          if (shown(box))
            targets.push({
              name: `누르는 것 '${(el.textContent ?? "").trim().slice(0, 20)}'`,
              box,
            });
        }
        // 글은 글자 줄 상자(Range)로 잰다 — 넓은 블록의 빈 자리는 글이 아니다
        for (const node of el.childNodes) {
          if (node.nodeType !== Node.TEXT_NODE) continue;
          const text = (node.textContent ?? "").trim();
          if (text === "") continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const box of range.getClientRects())
            if (shown(box))
              targets.push({ name: `글 '${text.slice(0, 20)}'`, box });
        }
      }
      const out: string[] = [];
      for (const d of decor) {
        for (const t of targets) {
          const overlap =
            d.box.left < t.box.right &&
            t.box.left < d.box.right &&
            d.box.top < t.box.bottom &&
            t.box.top < d.box.bottom;
          if (overlap) out.push(`꾸밈 '${d.name}' 이 ${t.name} 와 겹침`);
        }
      }
      return out;
    },
    { selector: root, decorAttr: DECOR_ATTR },
  );
}

/**
 * 세로 820 · 가로 1180 둘 다에서 크기 · 대비 · 꾸밈 겹침을 훑어 위반을 '<이름> <방향>: …' 으로 모은다(AC-N9 · AC-23e (2) (3)).
 * 끝나면 세로로 돌려 둔다.
 */
export async function childLookBothWays(
  page: Page,
  name: string,
  root?: string,
): Promise<string[]> {
  const out: string[] = [];
  for (const [label, size] of Object.entries(CHILD_VIEWPORTS)) {
    await page.setViewportSize(size);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
    );
    for (const problem of [
      ...(await childSizeProblems(page, root)),
      ...(await childContrastProblems(page, root)),
      ...(await decorOverlapProblems(page, root)),
    ])
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

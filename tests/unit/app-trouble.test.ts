// 앱 오류 화면 · 없는 주소 판(UI · UX plan 묶음 0-나 · spec 설계 4 '필수 (나) 막다른 화면이 없다' N-15 · N-16 · 8절 '앱 오류' 행 R-52 ·
// 설계 6 문구 표). 앱 오류 화면은 '잠깐 문제가 생겼어요' · 큰 '다시 해 볼래요'(같은 화면을 다시 그림) · 작은 '홈'이고, 없는 주소 · 열 수
// 없는 세션은 '찾는 화면이 없어요' · 큰 '홈'(돌아갈 자리가 없어 '홈'만 두는 유일한 화면)이다. 오류 경계 둘((child) · 루트)은 같은 판을
// 그리고 '다시 해 볼래요'에 Next 의 retry(한 전환 안에서 router.refresh + reset — plan 위험 9)를 넘긴다.
import { createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));

import ChildError from "@/app/(child)/error";
import ChildNotFound from "@/app/(child)/not-found";
import RootError from "@/app/error";
import RootNotFound from "@/app/not-found";
import {
  APP_TROUBLE_TEXT,
  AppErrorBoard,
  AppErrorPanel,
  NotFoundPanel,
  troubleButtonsOf,
} from "@/components/session/app-trouble";
import {
  MIC_BLOCKED_TEXT,
  stuckButtonsOf,
} from "@/components/session/mic-blocked";

/** 그림에서 큰 · 작은 단추 표지가 나오는 차례(그 표지 뒤 글을 함께). */
const sizedButtons = (html: string) =>
  [...html.matchAll(/data-button-size="(big|small)"[^>]*>([^<]*)</g)].map(
    (m) => [m[1], m[2]],
  );

/** 홈('/')으로 가는 링크의 단추 크기(속성 차례와 관계없이). */
const homeLinkSizes = (html: string) =>
  [...html.matchAll(/<a\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => tag.includes('href="/"'))
    .map((tag) => tag.match(/data-button-size="(big|small)"/)?.[1]);

/** 요소 나무에서 속성 하나를 가진 첫 요소(훅 없는 조각을 함수로 펼친 나무 — 그리지 않고 누름 처리를 꺼낸다). */
function findByProp(node: ReactNode, prop: string): Record<string, unknown> {
  const stack: ReactNode[] = [node];
  while (stack.length > 0) {
    const here = stack.pop();
    if (Array.isArray(here)) {
      stack.push(...here);
      continue;
    }
    if (!isValidElement(here)) continue;
    const props = here.props as Record<string, unknown>;
    if (prop in props) return props;
    if (typeof here.type === "function" && !("children" in props)) {
      stack.push((here.type as (p: unknown) => ReactNode)(props));
      continue;
    }
    stack.push(props.children as ReactNode);
  }
  throw new Error(`${prop} 없음`);
}

describe("앱 오류 화면 · 없는 주소 판(R-52)", () => {
  it("R-52 문구: 앱 오류는 '잠깐 문제가 생겼어요', 없는 주소는 '찾는 화면이 없어요'이고 단추 말은 막힘 판과 같은 '다시 해 볼래요' · '홈'이다", () => {
    expect(APP_TROUBLE_TEXT.error).toBe("잠깐 문제가 생겼어요");
    expect(APP_TROUBLE_TEXT.missing).toBe("찾는 화면이 없어요");
    expect(APP_TROUBLE_TEXT.retry).toBe(MIC_BLOCKED_TEXT.retry);
    expect(APP_TROUBLE_TEXT.home).toBe(MIC_BLOCKED_TEXT.home);
  });

  it("R-52 단추 차례: 앱 오류는 막힘 판과 같은 큰 '다시 해 볼래요' · 작은 '홈'이고, 없는 주소는 큰 '홈' 하나뿐이다", () => {
    expect(troubleButtonsOf("error")).toEqual(stuckButtonsOf("blocked"));
    expect(troubleButtonsOf("error")).toEqual({ big: "retry", small: "home" });
    expect(troubleButtonsOf("missing")).toEqual({ big: "home" });
  });

  it("R-52 앱 오류 판: 안내 줄 뒤 큰 '다시 해 볼래요' · 작은 '홈'(홈으로 가는 링크) 차례로 그린다", () => {
    const html = renderToStaticMarkup(
      createElement(AppErrorPanel, { onRetry: () => {} }),
    );
    expect(html).toContain("data-app-error");
    expect(html).toContain(APP_TROUBLE_TEXT.error);
    expect(sizedButtons(html)).toEqual([
      ["big", APP_TROUBLE_TEXT.retry],
      ["small", APP_TROUBLE_TEXT.home],
    ]);
    expect(homeLinkSizes(html)).toEqual(["small"]);
    // 안내 줄이 단추보다 앞, 쪽의 제목(h1)이다
    expect(html).toMatch(new RegExp(`<h1[^>]*>${APP_TROUBLE_TEXT.error}</h1>`));
    expect(html.indexOf(APP_TROUBLE_TEXT.error)).toBeLessThan(
      html.indexOf("data-button-size"),
    );
  });

  it("R-52 앱 오류 판: '다시 해 볼래요'를 누르면 받은 다시 그리기를 한 번 부른다", () => {
    const onRetry = vi.fn();
    const button = findByProp(
      AppErrorBoard({ onRetry, retrying: false }) as ReactNode,
      "data-app-retry",
    );
    expect(button["data-button-size"]).toBe("big");
    expect(button.disabled).toBe(false);
    expect(button["data-trouble-retrying"]).toBeUndefined();
    (button.onClick as () => void)();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("R-52 앱 오류 판: 다시 읽는 동안 '다시 해 볼래요'는 흐리고(누를 수 없음) 다시 읽는 중 표지가 붙으며 새 문구는 없다", () => {
    const html = renderToStaticMarkup(
      createElement(AppErrorBoard, { onRetry: () => {}, retrying: true }),
    );
    expect(html).toMatch(
      /<button[^>]*data-trouble-retrying=""[^>]*disabled=""/,
    );
    expect(sizedButtons(html)).toEqual([
      ["big", APP_TROUBLE_TEXT.retry],
      ["small", APP_TROUBLE_TEXT.home],
    ]);
    // 처음 그림(다시 읽기 전)에는 표지가 없다
    const idle = renderToStaticMarkup(
      createElement(AppErrorPanel, { onRetry: () => {} }),
    );
    expect(idle).not.toContain("data-trouble-retrying");
    expect(idle).not.toMatch(/<button[^>]*disabled=""/);
  });

  it("R-52 없는 주소 판: '찾는 화면이 없어요' 뒤 큰 '홈' 하나만 있고 '다시 해 볼래요'는 없다", () => {
    const html = renderToStaticMarkup(createElement(NotFoundPanel));
    expect(html).toContain("data-not-found");
    expect(html).toMatch(
      new RegExp(`<h1[^>]*>${APP_TROUBLE_TEXT.missing}</h1>`),
    );
    expect(sizedButtons(html)).toEqual([["big", APP_TROUBLE_TEXT.home]]);
    expect(homeLinkSizes(html)).toEqual(["big"]);
    expect(html).not.toContain(APP_TROUBLE_TEXT.retry);
  });
});

describe("오류 경계 · 없는 주소 파일(R-52 · plan 위험 9)", () => {
  it("R-52 오류 경계: (child) · 루트 둘 다 앱 오류 판을 그리고 '다시 해 볼래요'에 Next 의 retry 를 넘긴다(reset 만 넘기지 않는다)", () => {
    for (const Boundary of [ChildError, RootError]) {
      const retry = vi.fn();
      const reset = vi.fn();
      const element = Boundary({ error: new Error("시험"), reset, retry });
      expect(isValidElement(element)).toBe(true);
      if (!isValidElement(element)) continue;
      expect(element.type).toBe(AppErrorPanel);
      expect((element.props as { onRetry: unknown }).onRetry).toBe(retry);
      const html = renderToStaticMarkup(element);
      expect(html).toContain(APP_TROUBLE_TEXT.error);
    }
  });

  it("R-52 없는 주소: (child) · 루트 not-found 둘 다 없는 주소 판을 그린다", () => {
    for (const Page of [ChildNotFound, RootNotFound]) {
      const element = Page();
      expect(isValidElement(element)).toBe(true);
      if (!isValidElement(element)) continue;
      expect(element.type).toBe(NotFoundPanel);
    }
  });
});

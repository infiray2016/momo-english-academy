// 힌트 글을 받는 동안의 점 셋(UX 검토 3판 U5-10 · 13절 C166, src/components/conversation/hint-loading-dots.tsx).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HintLoadingDots } from "@/components/conversation/hint-loading-dots";

describe("힌트 기다림 점 셋(U5-10)", () => {
  it("U5-10 힌트 글이 아직 없으면 빈 점선 상자 대신 점 셋(상태 알림)이 보이고 움직임 줄이기면 멈춘다", () => {
    const html = renderToStaticMarkup(createElement(HintLoadingDots));
    expect(html).toContain("data-hint-loading");
    expect(html).toContain('role="status"');
    expect(html.match(/rounded-full bg-ink/g)).toHaveLength(3);
    // 움직임은 motion-safe 에만(움직임 줄이기면 멈춘 점)
    expect(html).not.toMatch(/(^|\s)animate-bounce/);
    expect(html).toContain("motion-safe:animate-bounce");
  });
});

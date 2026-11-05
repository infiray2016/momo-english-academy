// '시작!' 화면 무음 모드 한 줄(UX 검토 3판 U5-8 · 13절 C166, src/components/conversation/silent-mode-note.tsx).
// 아이패드 사파리일 때만 그린다. 기기 판정은 P2a 판정 이름(isIpadSafari)을 쓰고, 그리기 뒤에 읽으므로 서버 그림은 처음엔 없다.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  SILENT_MODE_TEXT,
  SilentModeLine,
  SilentModeNote,
} from "@/components/conversation/silent-mode-note";

vi.mock("client-only", () => ({}));

describe("무음 모드 한 줄(U5-8)", () => {
  it("U5-8 아이패드 사파리면 '소리가 안 나면 무음 모드를 꺼 주세요' 한 줄을 그리고 그 밖 기기는 그리지 않는다", () => {
    expect(SILENT_MODE_TEXT).toBe("소리가 안 나면 무음 모드를 꺼 주세요");
    const ipad = renderToStaticMarkup(
      createElement(SilentModeLine, { shown: true }),
    );
    expect(ipad).toContain("data-talk-silent-note");
    expect(ipad).toContain(SILENT_MODE_TEXT);
    expect(
      renderToStaticMarkup(createElement(SilentModeLine, { shown: false })),
    ).toBe("");
  });

  it("U5-8 속성 없는 조각은 기기 판정 전(서버 그림 · 첫 그리기)에는 아무것도 그리지 않는다(판정은 그리기 뒤 — 하이드레이션이 어긋나지 않게)", () => {
    expect(renderToStaticMarkup(createElement(SilentModeNote))).toBe("");
  });
});

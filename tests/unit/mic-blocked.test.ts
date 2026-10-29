// 마이크 막힘 안내 · 아이패드 사파리 무음 모드 줄(전체 디자인 리뷰 I-1 · 13절 C111 · 7절 · plan-p11a 정본 밖 문구 표 새 행).
// 둘째 줄은 아이패드 사파리일 때만 보인다(한 화면 한 안내). 기기 판정은 P2a describeDevice 의 이름.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  MIC_BLOCKED_TEXT,
  MicBlockedText,
  micBlockedLinesOf,
} from "@/components/session/mic-blocked";
import { describeDevice, isIpadSafari } from "@/core/speech/device";

vi.mock("client-only", () => ({}));

const facts = (userAgent: string, maxTouchPoints: number) => ({
  userAgent,
  maxTouchPoints,
  isSecureContext: true,
  hasStandardRecognition: false,
  hasWebkitRecognition: true,
  hasSynthesis: true,
});
// MDN 'Safari' 데스크톱 예 — iPadOS 13 부터 iPad Safari 는 데스크톱 UA(터치 점으로 가름)
const IPAD_SAFARI = facts(
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15",
  5,
);
// Chromium 문서의 '데스크톱 사이트 요청' Chrome iOS 예(CriOS)
const IPAD_CHROME = facts(
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/85 Version/11.1.1 Safari/605.1.15",
  5,
);
const MAC_SAFARI = facts(IPAD_SAFARI.userAgent, 0);

describe("마이크 막힘 안내(C111)", () => {
  it("마이크 막힘 안내: 아이패드 사파리만 둘째 줄 '아이패드 제어 센터에서 무음 모드를 꺼 주세요'가 붙는다", () => {
    expect(isIpadSafari(describeDevice(IPAD_SAFARI))).toBe(true);
    expect(isIpadSafari(describeDevice(IPAD_CHROME))).toBe(false);
    expect(isIpadSafari(describeDevice(MAC_SAFARI))).toBe(false);
    expect(MIC_BLOCKED_TEXT.ipadSilentMode).toBe(
      "아이패드 제어 센터에서 무음 모드를 꺼 주세요",
    );
    for (const kind of ["needsMic", "stalled", "silent"] as const) {
      expect(micBlockedLinesOf(kind, true)).toEqual([
        MIC_BLOCKED_TEXT[kind],
        MIC_BLOCKED_TEXT.ipadSilentMode,
      ]);
      expect(micBlockedLinesOf(kind, false)).toEqual([MIC_BLOCKED_TEXT[kind]]);
    }
    const ipad = renderToStaticMarkup(
      createElement(MicBlockedText, { kind: "needsMic", ipadSafari: true }),
    );
    expect(ipad).toContain("마이크가 필요해요. 부모님께 말해 주세요");
    expect(ipad).toContain("data-blocked-hint");
    expect(ipad).toContain(MIC_BLOCKED_TEXT.ipadSilentMode);
    const other = renderToStaticMarkup(
      createElement(MicBlockedText, { kind: "needsMic", ipadSafari: false }),
    );
    expect(other).not.toContain("data-blocked-hint");
  });
});

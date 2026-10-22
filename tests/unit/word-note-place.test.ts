// 읽기 지문 뜻 쪽지 자리(화면 검토 I-3 · 디자인 fix 1d): 낱말이 카드 오른쪽 반이면 오른쪽 끝을 맞추고, 그래도 카드를 넘으면
// 카드 안으로 당긴다. 상자 크기는 지어낸 값(px).
import { describe, expect, it } from "vitest";
import { noteAlignOf, noteShiftOf } from "@/core/session/note-place";

const card = { left: 100, right: 900 };

describe("뜻 쪽지 자리", () => {
  it("뜻 쪽지: 카드 오른쪽 반의 낱말은 오른쪽 끝을 맞추고 왼쪽 반은 왼쪽 끝을 맞춘다", () => {
    expect(noteAlignOf({ left: 800, width: 60 }, card)).toBe("end");
    expect(noteAlignOf({ left: 150, width: 60 }, card)).toBe("start");
    // 가운데 금은 낱말 가운데로 본다
    expect(noteAlignOf({ left: 470, width: 60 }, card)).toBe("start");
    expect(noteAlignOf({ left: 471, width: 60 }, card)).toBe("end");
  });

  it("뜻 쪽지: 카드 오른쪽을 넘는 쪽지는 넘친 만큼 왼쪽으로 당긴다", () => {
    // 왼쪽 맞춤이었다면 넘쳤을 자리 — 낱말 왼쪽 820 + 쪽지 너비 200 = 1020 > 900
    expect(noteShiftOf({ left: 820, right: 1020 }, card)).toBe(-120);
    const shifted = { left: 820 - 120, right: 1020 - 120 };
    expect(shifted.right).toBeLessThanOrEqual(card.right);
    expect(shifted.left).toBeGreaterThanOrEqual(card.left);
  });

  it("뜻 쪽지: 카드 왼쪽을 넘는 쪽지는 넘친 만큼 오른쪽으로 민다", () => {
    expect(noteShiftOf({ left: 60, right: 260 }, card)).toBe(40);
  });

  it("뜻 쪽지: 카드 안에 드는 쪽지는 옮기지 않는다", () => {
    expect(noteShiftOf({ left: 300, right: 500 }, card)).toBe(0);
    expect(noteShiftOf({ left: 100, right: 900 }, card)).toBe(0);
  });
});

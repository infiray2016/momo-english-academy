// 문장부호를 앞 낱말 · 빈칸에 붙이기(전체 디자인 리뷰 M-7 · fix 8b N-3): 읽기 지문 낱말 상자 · 쓰기 5단계 빈칸 줄이 문장부호로 시작하는 줄을
// 만들지 않게, 뒤따르는 문장부호를 앞 상자 안에 붙여 그린다. 순수 함수만 본다(그림은 e2e).
import { describe, expect, it, vi } from "vitest";
import { splitPassage } from "@/components/activities/reading";
import { splitLeadingPunctuation } from "@/core/text/punctuation";
import { frameSegments } from "@/core/writing/guided";

vi.mock("client-only", () => ({}));

describe("문장부호 붙이기", () => {
  it("문장부호 붙이기: 토막 앞의 문장부호(. , ! ? ; :)만 떼어 앞 상자에 붙인다", () => {
    expect(splitLeadingPunctuation(". Tori can")).toEqual({
      punct: ".",
      rest: " Tori can",
    });
    expect(splitLeadingPunctuation("?! Yes")).toEqual({
      punct: "?!",
      rest: " Yes",
    });
    expect(splitLeadingPunctuation(" and")).toEqual({
      punct: "",
      rest: " and",
    });
    expect(splitLeadingPunctuation("")).toEqual({ punct: "", rest: "" });
  });

  it("읽기 지문: 표시 낱말 뒤 문장부호는 그 낱말 상자의 꼬리로 붙고 다음 토막에서 빠진다", () => {
    const parts = splitPassage("Tori can mudeba. Tori runs, mudeba!", [
      "mudeba",
    ]);
    expect(parts).toEqual([
      { text: "Tori can ", mark: false, at: 0, tail: "" },
      { text: "mudeba", mark: true, at: 9, tail: "." },
      { text: " Tori runs, ", mark: false, at: 16, tail: "" },
      { text: "mudeba", mark: true, at: 28, tail: "!" },
    ]);
    expect(parts.map((p) => p.text + p.tail).join("")).toBe(
      "Tori can mudeba. Tori runs, mudeba!",
    );
  });

  it("쓰기 5단계: 빈칸 뒤 토막의 문장부호는 빈칸 꼬리로 붙고 온 글은 그대로다", () => {
    const segments = frameSegments("I see the ___ and the ___.");
    expect(segments).toEqual([
      { text: "I see the ", blankTail: "" },
      { text: " and the ", blankTail: "." },
      { text: "", blankTail: "" },
    ]);
    expect(frameSegments("___, I like it.")).toEqual([
      { text: "", blankTail: "," },
      { text: " I like it.", blankTail: "" },
    ]);
  });
});

// 세션 · 결과 주소의 갈 곳(UI · UX plan 묶음 0-나 fix 1 · 검토 M3 · spec 설계 4 N-16 · 8절 '앱 오류' 행 R-52 · AC-U7 '/' 0회).
// 그 프로필에서 찾지 못한 세션은 없는 주소 판, 끝난 수업 세션은 결과, 닫힌 세션 · 회화는 그 영역 수업 목록이고, 결과 주소에서 결과를 못
// 여는 세션은 그 영역 수업 목록이다. 어느 갈래도 홈('/')으로 보내지 않는다.
import { describe, expect, it } from "vitest";
import {
  resultDestinationOf,
  type SessionPlace,
  sessionDestinationOf,
} from "@/core/session/destination";

const ID = "6b1f6f0e-5f7a-4a35-9d8c-0d7f8b6b2a11";
const AREAS = ["reading", "writing", "speaking", "talk"] as const;

describe("세션 · 결과 주소의 갈 곳(N-16 · R-52)", () => {
  it("N-16 세션 주소: 찾지 못한 세션은 없는 주소 판이다", () => {
    expect(sessionDestinationOf(ID, undefined)).toEqual({ kind: "missing" });
  });

  it("N-16 세션 주소: 끝난 수업 세션은 그 결과로, 닫힌 세션은 그 영역 수업 목록으로 간다", () => {
    expect(
      sessionDestinationOf(ID, { area: "reading", completed: true }),
    ).toEqual({ kind: "redirect", to: `/result/${ID}` });
    for (const area of AREAS) {
      expect(sessionDestinationOf(ID, { area, completed: false })).toEqual({
        kind: "redirect",
        to: `/${area}/lessons`,
      });
    }
  });

  it("N-16 세션 주소: 닫힌 회화는 끝났어도 결과 쪽이 없어 회화 수업 목록으로 간다", () => {
    expect(sessionDestinationOf(ID, { area: "talk", completed: true })).toEqual(
      { kind: "redirect", to: "/talk/lessons" },
    );
  });

  it("N-16 결과 주소: 찾지 못한 세션은 없는 주소 판, 찾았지만 결과를 못 여는 세션(진행 · 닫힘 · 회화)은 그 영역 수업 목록이다", () => {
    expect(resultDestinationOf(undefined)).toEqual({ kind: "missing" });
    for (const area of AREAS) {
      for (const completed of [true, false]) {
        expect(resultDestinationOf({ area, completed })).toEqual({
          kind: "redirect",
          to: `/${area}/lessons`,
        });
      }
    }
  });

  it("R-52 어느 갈래도 홈('/')으로 보내지 않는다", () => {
    const places: (SessionPlace | undefined)[] = [
      undefined,
      ...AREAS.flatMap((area) =>
        [true, false].map((completed) => ({ area, completed })),
      ),
    ];
    for (const place of places) {
      for (const out of [
        sessionDestinationOf(ID, place),
        resultDestinationOf(place),
      ]) {
        if (out.kind === "redirect") expect(out.to).not.toBe("/");
      }
    }
  });
});

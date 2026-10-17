// DB 오류 도우미(src/server/db/safe-error.ts). 유일 제약 위반 판정을 한 곳에 모은다(P7b check:ids — 같은 함수 셋의 'depth < 3').
import { describe, expect, it } from "vitest";
import {
  CAUSE_CHAIN_DEPTH,
  dbErrorTag,
  isUniqueViolation,
  PG_UNIQUE_VIOLATION,
} from "@/server/db/safe-error";

/** cause 를 n 겹 감싼 오류(맨 안에 Postgres 코드). */
function wrapped(code: string, layers: number): Error {
  let error: Error & { code?: string } = Object.assign(new Error("pg"), {
    code,
  });
  for (let i = 0; i < layers; i += 1)
    error = new Error("drizzle", { cause: error });
  return error;
}

describe("DB 오류 도우미", () => {
  it("DB 오류 도우미: 유일 제약 위반(23505)은 원인 사슬 CAUSE_CHAIN_DEPTH 겹 안에서 찾고 다른 코드 · 더 깊은 것은 아니다", () => {
    expect(isUniqueViolation(wrapped(PG_UNIQUE_VIOLATION, 0))).toBe(true);
    expect(
      isUniqueViolation(wrapped(PG_UNIQUE_VIOLATION, CAUSE_CHAIN_DEPTH - 1)),
    ).toBe(true);
    expect(
      isUniqueViolation(wrapped(PG_UNIQUE_VIOLATION, CAUSE_CHAIN_DEPTH)),
    ).toBe(false);
    expect(isUniqueViolation(wrapped("P0001", 1))).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    // 이름 · 코드만 내는 글은 같은 깊이로 찾는다
    expect(dbErrorTag(wrapped(PG_UNIQUE_VIOLATION, 1))).toBe(
      `Error ${PG_UNIQUE_VIOLATION}`,
    );
  });
});

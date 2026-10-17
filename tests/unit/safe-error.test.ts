// DB 오류 도우미(src/server/db/safe-error.ts). 유일 제약 위반 판정을 한 곳에 모은다(P7b check:ids — 같은 함수 셋의 'depth < 3').
import { describe, expect, it } from "vitest";
import {
  CAUSE_CHAIN_DEPTH,
  dbErrorTag,
  isUniqueViolation,
  PG_UNIQUE_VIOLATION,
  safeDbError,
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

  it("DB 오류 도우미: 시도 저장 질의 오류(글에 아이 답 · 인식 글이 실림)를 감싸면 이름 · 코드만 남고 원인을 붙이지 않는다", () => {
    const answer = "I like bababa very much";
    const drizzleLike = new Error(
      `Failed query: insert into "attempts" ("input") values ($1)\nparams: {"heard":["${answer}"]}`,
      {
        cause: Object.assign(new Error(`invalid input ${answer}`), {
          code: "22P02",
        }),
      },
    );
    const safe = safeDbError(drizzleLike);
    expect(safe.message).toBe("DB 오류(Error 22P02)");
    expect(safe.message).not.toContain(answer);
    expect(safe.cause).toBeUndefined();
    expect(dbErrorTag(drizzleLike)).not.toContain(answer);
  });
});

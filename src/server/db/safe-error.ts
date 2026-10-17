import "server-only";

// DB 오류를 밖으로 낼 때 이름 · Postgres 코드만 남긴다(검토 review-p10-2-code I-1).
// drizzle 의 질의 오류(DrizzleQueryError)는 글에 SQL 과 매개변수(아이 이름 · 영어 이름 · PIN 해시 · 답 글)를 싣는다.
// 그 오류를 로그 · 서버 액션 바깥으로 그대로 내지 않고, 이 도우미의 글만 쓴다. cause 를 붙이지 않는다.
// P10 첫 실행 · 이름 확인이 먼저 쓰고 P11(attempts 의 아이 답 글) · 1-나도 같은 꼴로 쓴다(장부).

/** 원인 사슬을 따라가는 깊이(기술 값 — drizzle 질의 오류 → postgres 오류 몇 겹). */
export const CAUSE_CHAIN_DEPTH = 4;
/** Postgres 유일 제약 위반 SQLSTATE(두 기기가 함께 시작 · 저장한 때). */
export const PG_UNIQUE_VIOLATION = "23505";

/** 오류 이름과 원인 사슬의 첫 Postgres 코드(SQLSTATE 등 글 코드)만, 예: 'Error P0001'(drizzle 질의 오류는 이름이 Error 이고 코드는 원인의 Postgres 오류에 있다). */
export function dbErrorTag(error: unknown): string {
  const name = error instanceof Error ? error.name : "Error";
  let current: unknown = error;
  for (let depth = 0; current && depth < CAUSE_CHAIN_DEPTH; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && code !== "") return `${name} ${code}`;
    current = (current as { cause?: unknown }).cause;
  }
  return name;
}

/** 이름 · 코드만 담은 새 오류(던져야 할 때). */
export function safeDbError(error: unknown): Error {
  const safe = new Error(`DB 오류(${dbErrorTag(error)})`);
  safe.name = "DbError";
  return safe;
}

/**
 * 원인 사슬 안에 유일 제약 위반(PG_UNIQUE_VIOLATION)이 있는가. 첫 실행 저장 · 배치 시작 · 세션 시작이 같이 쓴다
 * (같은 함수 셋이 깊이를 숫자로 박던 것을 합침 — P7b check:ids).
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < CAUSE_CHAIN_DEPTH; depth += 1) {
    if ((current as { code?: unknown }).code === PG_UNIQUE_VIOLATION)
      return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

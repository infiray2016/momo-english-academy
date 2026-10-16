// 다시 풀지 않는 jsonb 열(검토 A1 M-3, plan-p03a 공통 규칙 2).
// Drizzle 기본 jsonb 는 postgres.js 가 이미 푼 값이 문자열이면 한 번 더 JSON.parse 해서,
// 최상위 문자열 "12" · "true" · "null" 이 수 · 불 · null 로 바뀐다. 이 열은 받은 값을 그대로 돌려준다.
// 생성 SQL 은 기본 jsonb 와 같다(꼴 이름 jsonb). 형은 `.$type<T>()` 로 좁힌다.
// server-only 를 가져오지 않는다(drizzle-kit · 시험이 Node 에서 바로 읽는다).
import { customType } from "drizzle-orm/pg-core";

export const jsonb = customType<{ data: unknown; driverData: unknown }>({
  dataType() {
    return "jsonb";
  },
  toDriver(value) {
    return JSON.stringify(value);
  },
  fromDriver(value) {
    return value;
  },
});

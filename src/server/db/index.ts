import "server-only";
// 서버 DB 연결(10절 DB · 접근 제어, plan-p03a 파일별 값 5).
// Supabase 트랜잭션 풀러(6543)는 prepared statement 를 받지 않으므로 prepare 를 끈다.
// 모듈을 읽을 때는 연결하지 않는다(빌드가 DB 를 요구하지 않게).
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as content from "@/db/schema/content";
import * as learning from "@/db/schema/learning";
import * as operations from "@/db/schema/operations";

/** 인스턴스 하나의 연결 상한(기술 값, 서버리스 인스턴스가 늘 때 연결이 쌓이지 않게, plan-p03a 위험 2). */
export const POOL_MAX = 3;

export const schema = { ...content, ...learning, ...operations };

export class DbNotConfiguredError extends Error {
  constructor() {
    super("DATABASE_URL 이 없습니다");
    this.name = "DbNotConfiguredError";
  }
}

export function createDb(
  url: string,
  { max = POOL_MAX }: { max?: number } = {},
) {
  const client = postgres(url, { prepare: false, max });
  return drizzle({ client, schema });
}

export type Db = ReturnType<typeof createDb>;
/** 트랜잭션 안 연결(db.transaction 의 tx). */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** 읽기 함수가 받는 연결 — 바깥 연결 또는 트랜잭션(같은 연결로 읽어 풀이 차도 서로 기다리지 않게, 검토 review-p10-5-6-code M-1). */
export type DbOrTx = Db | Tx;

type DbCache = { url: string; db: Db };
const CACHE_KEY = Symbol.for("momo.server.db");
const holder = globalThis as typeof globalThis & {
  [CACHE_KEY]?: DbCache;
};

/**
 * 처음 부를 때 DATABASE_URL 로 연결을 한 번 만들고 다시 쓴다.
 * 개발 서버가 모듈을 다시 읽어도 연결이 늘지 않게 globalThis 에 주소와 함께 둔다.
 * 주소가 바뀌면 앞 연결을 닫고 새로 만든다(시험 파일이 이어 돌 때 지운 DB 를 가리키지 않게).
 */
export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DbNotConfiguredError();
  const cached = holder[CACHE_KEY];
  if (cached && cached.url === url) return cached.db;
  if (cached) void cached.db.$client.end();
  const db = createDb(url);
  holder[CACHE_KEY] = { url, db };
  return db;
}

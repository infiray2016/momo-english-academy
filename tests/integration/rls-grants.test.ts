// AC-N5 의 DB 몫 · 더하기만 정적 검사 · 스키마 제약 · DB 연결(plan-p03a 증명 표).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getTableName, inArray, is, sql } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import type { Sql } from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as content from "@/db/schema/content";
import * as learning from "@/db/schema/learning";
import { profiles, sessions } from "@/db/schema/learning";
import * as operations from "@/db/schema/operations";
import { parentAuth, settings as settingsTable } from "@/db/schema/operations";
import { createDb, DbNotConfiguredError, getDb, POOL_MAX } from "@/server/db";
import { createTestDatabase, type TestDatabase } from "./test-db";

/** 5절 'Postgres 테이블은 29개다'. */
const SPEC_TABLE_COUNT = 29;
const API_ROLES: string[] = ["anon", "authenticated"];
const CHECKED_SCHEMAS: string[] = ["public", "drizzle"];
const MIGRATIONS_DIR = join(process.cwd(), "drizzle");
const INSUFFICIENT_PRIVILEGE = "42501";
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
/** 시험 행에 넣는 고정 시각(시계를 읽지 않는다). */
const FIXED_INSTANT = new Date("2026-10-16T00:00:00Z");

const schemaTableNames = [content, learning, operations]
  .flatMap((mod) => Object.values(mod))
  .filter((value): value is PgTable => is(value, PgTable))
  .map((table) => getTableName(table))
  .sort();

let testDb: TestDatabase;
let client: Sql;

beforeAll(async () => {
  testDb = await createTestDatabase();
  client = testDb.db.$client;
});

afterAll(async () => {
  await testDb?.drop();
});

/**
 * 실행해서 난 Postgres 오류 코드를 돌려준다. 오류가 없으면 null.
 * Drizzle 은 드라이버 오류를 감싸므로(DrizzleQueryError) cause 의 코드도 본다.
 */
async function errorCode(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (error) {
    const err = error as { code?: string; cause?: { code?: string } };
    return err.code ?? err.cause?.code ?? String(error);
  }
}

async function insertProfile(): Promise<string> {
  const [row] = await testDb.db
    .insert(profiles)
    .values({
      displayName: "시험 프로필",
      englishName: "Tester",
      avatar: "fox",
      topicBundle: "animals",
      alphabetStart: false,
    })
    .returning({ id: profiles.id });
  return row.id;
}

describe("AC-N5 DB 접근 제어", () => {
  it("AC-N5 public 의 테이블 29개가 모두 RLS 켜짐이고 스키마의 테이블 목록과 같다", async () => {
    const rows = await client<{ name: string; rls: boolean }[]>`
      SELECT c.relname AS name, c.relrowsecurity AS rls
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      ORDER BY c.relname`;
    expect(schemaTableNames).toHaveLength(SPEC_TABLE_COUNT);
    expect(rows.map((r) => r.name).sort()).toEqual(schemaTableNames);
    expect(rows.filter((r) => !r.rls).map((r) => r.name)).toEqual([]);
  });

  it("AC-N5 anon · authenticated 는 public · drizzle 의 테이블 · 시퀀스 · 함수 권한이 없다", async () => {
    // 직접 준 권한(ACL 항목)과 실제로 쓸 수 있는 권한을 둘 다 본다
    const relationGrants = await client<{ name: string; grantee: string }[]>`
      SELECT n.nspname || '.' || c.relname AS name, r.rolname AS grantee
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      CROSS JOIN LATERAL aclexplode(c.relacl) a
      JOIN pg_roles r ON r.oid = a.grantee
      WHERE n.nspname = ANY(${CHECKED_SCHEMAS})
        AND r.rolname = ANY(${API_ROLES})`;
    const functionGrants = await client<{ name: string; grantee: string }[]>`
      SELECT n.nspname || '.' || p.proname AS name, r.rolname AS grantee
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      CROSS JOIN LATERAL aclexplode(p.proacl) a
      JOIN pg_roles r ON r.oid = a.grantee
      WHERE n.nspname = ANY(${CHECKED_SCHEMAS})
        AND r.rolname = ANY(${API_ROLES})`;
    const usable = await client<{ name: string; role: string }[]>`
      SELECT n.nspname || '.' || c.relname AS name, r.rolname AS role
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      CROSS JOIN pg_roles r
      WHERE n.nspname = ANY(${CHECKED_SCHEMAS})
        AND r.rolname = ANY(${API_ROLES})
        AND (
          (c.relkind IN ('r', 'p', 'v', 'm')
            AND has_table_privilege(r.oid, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))
          OR (c.relkind = 'S'
            AND has_sequence_privilege(r.oid, c.oid, 'USAGE,SELECT,UPDATE'))
        )`;
    expect(relationGrants).toEqual([]);
    expect(functionGrants).toEqual([]);
    expect(usable).toEqual([]);
  });

  it("AC-N5 anon · authenticated 로 바꿔 조회하면 모든 테이블이 권한 오류(42501)다", async () => {
    const results: string[] = [];
    for (const role of API_ROLES) {
      for (const table of schemaTableNames) {
        const code = await errorCode(() =>
          client.begin(async (tx) => {
            await tx.unsafe(`SET LOCAL ROLE ${role}`);
            await tx.unsafe(`SELECT 1 FROM public."${table}" LIMIT 1`);
          }),
        );
        results.push(`${role} ${table} ${code}`);
      }
    }
    expect(results).toEqual(
      API_ROLES.flatMap((role) =>
        schemaTableNames.map(
          (table) => `${role} ${table} ${INSUFFICIENT_PRIVILEGE}`,
        ),
      ),
    );
  });

  it("AC-N5 기본 권한도 회수되어 새로 만든 테이블에 anon · authenticated 권한이 붙지 않는다", async () => {
    const rollback = new Error("rollback");
    let grants: { name: string; grantee: string }[] = [];
    const code = await errorCode(() =>
      client.begin(async (tx) => {
        await tx.unsafe("CREATE TABLE public.grant_probe (id integer)");
        await tx.unsafe("CREATE SEQUENCE public.grant_probe_seq");
        await tx.unsafe(
          "CREATE FUNCTION public.grant_probe_fn() RETURNS integer LANGUAGE sql AS 'SELECT 1'",
        );
        grants = await tx<{ name: string; grantee: string }[]>`
          SELECT c.relname AS name, r.rolname AS grantee
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          CROSS JOIN LATERAL aclexplode(c.relacl) a
          JOIN pg_roles r ON r.oid = a.grantee
          WHERE n.nspname = 'public' AND c.relname LIKE 'grant_probe%'
            AND r.rolname = ANY(${API_ROLES})
          UNION ALL
          SELECT p.proname AS name, r.rolname AS grantee
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          CROSS JOIN LATERAL aclexplode(p.proacl) a
          JOIN pg_roles r ON r.oid = a.grantee
          WHERE n.nspname = 'public' AND p.proname = 'grant_probe_fn'
            AND r.rolname = ANY(${API_ROLES})`;
        throw rollback;
      }),
    );
    expect(code).toBe(String(rollback));
    expect(grants).toEqual([]);
  });
});

describe("마이그레이션", () => {
  it("마이그레이션: drizzle/*.sql 에 DROP TABLE · DROP COLUMN · DROP TYPE · DROP SCHEMA · RENAME · SET DATA TYPE · SET NOT NULL 이 없다", () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
    expect(files.length).toBeGreaterThan(0);
    const forbidden =
      /\bDROP\s+(TABLE|COLUMN|TYPE|SCHEMA)\b|\bRENAME\b|\bSET\s+DATA\s+TYPE\b|\bSET\s+NOT\s+NULL\b/i;
    // drizzle-kit 이 꼴 바꾸기 · NOT NULL 조이기에 만드는 문장을 잡는다
    expect(
      forbidden.test('ALTER TABLE "t" ALTER COLUMN "c" SET DATA TYPE text;'),
    ).toBe(true);
    expect(
      forbidden.test('ALTER TABLE "t" ALTER COLUMN "c" SET NOT NULL;'),
    ).toBe(true);
    expect(
      forbidden.test('ALTER TABLE "t" ADD COLUMN "c" text NOT NULL;'),
    ).toBe(false);
    const offending = files.filter((file) =>
      forbidden.test(readFileSync(join(MIGRATIONS_DIR, file), "utf8")),
    );
    expect(offending).toEqual([]);
  });
});

describe("스키마 제약", () => {
  it("스키마: 프로필 × 영역마다 진행 중 세션은 하나다(부분 유일 색인)", async () => {
    const profileId = await insertProfile();
    const session = (
      area: "reading" | "writing",
      status: "in_progress" | "completed",
    ) => ({
      profileId,
      area,
      kind: "regular" as const,
      status,
      startedAt: FIXED_INSTANT,
    });
    await testDb.db.insert(sessions).values(session("reading", "in_progress"));
    await testDb.db.insert(sessions).values(session("reading", "completed"));
    await testDb.db.insert(sessions).values(session("writing", "in_progress"));
    expect(
      await errorCode(() =>
        testDb.db.insert(sessions).values(session("reading", "in_progress")),
      ),
    ).toBe(UNIQUE_VIOLATION);
  });

  it("스키마: 집 전체 설정 행은 profile_id 가 비어 있다(확인 제약)", async () => {
    const profileId = await insertProfile();
    await testDb.db.insert(settingsTable).values({
      key: "schema.household_probe",
      scope: "household",
      value: 1,
      version: 1,
    });
    expect(
      await errorCode(() =>
        testDb.db.insert(settingsTable).values({
          key: "schema.household_probe_with_profile",
          scope: "household",
          profileId,
          value: 1,
          version: 2,
        }),
      ),
    ).toBe(CHECK_VIOLATION);
  });

  it("스키마: PIN 행은 하나뿐이다", async () => {
    const row = (kind: "pin" | "access_ip", ipHash: string | null) => ({
      kind,
      pinHash: kind === "pin" ? "hash" : null,
      ipHash,
      updatedAt: FIXED_INSTANT,
    });
    await testDb.db.insert(parentAuth).values(row("pin", null));
    await testDb.db.insert(parentAuth).values(row("access_ip", "ip-a"));
    await testDb.db.insert(parentAuth).values(row("access_ip", "ip-b"));
    expect(
      await errorCode(() =>
        testDb.db.insert(parentAuth).values(row("pin", null)),
      ),
    ).toBe(UNIQUE_VIOLATION);
  });
});

describe("DB 연결", () => {
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("DB 연결: 트랜잭션 풀러용으로 prepare 를 끈다", async () => {
    const db = createDb(testDb.url);
    try {
      expect(db.$client.options.prepare).toBe(false);
      expect(db.$client.options.max).toBe(POOL_MAX);
      const [row] = await db.$client`SELECT 1 AS one`;
      expect(row.one).toBe(1);
    } finally {
      await db.$client.end();
    }
  });

  it("DB 연결: DATABASE_URL 이 없으면 DbNotConfiguredError", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    expect(() => getDb()).toThrow(DbNotConfiguredError);
    vi.stubEnv("DATABASE_URL", "");
    expect(() => getDb()).toThrow(DbNotConfiguredError);
  });

  it("DB 연결: jsonb 의 최상위 문자열 · 수 · 불 · null 값은 그대로 읽힌다", async () => {
    const samples: unknown[] = ["12", 12, true, null, "1.0", "true", "null"];
    const rows = await testDb.db
      .insert(settingsTable)
      .values(
        samples.map((value, index) => ({
          key: `jsonb.round_trip_${index}`,
          scope: "household" as const,
          // Drizzle 은 JS null 을 SQL NULL 로 보내므로 JSON null 은 SQL 로 적는다
          value: value === null ? sql`'null'::jsonb` : value,
          version: index + 1,
        })),
      )
      .returning({ id: settingsTable.id });
    const read = await testDb.db
      .select({ key: settingsTable.key, value: settingsTable.value })
      .from(settingsTable)
      .where(
        inArray(
          settingsTable.id,
          rows.map((r) => r.id),
        ),
      );
    const byKey = new Map(read.map((r) => [r.key, r.value]));
    expect(
      samples.map((_, index) => byKey.get(`jsonb.round_trip_${index}`)),
    ).toStrictEqual(samples);
    // DB 안의 꼴도 최상위 문자열 · 수 · 불 · null 이다(두 번 싸지 않았다)
    const types = await client<{ type: string }[]>`
      SELECT jsonb_typeof(value) AS type FROM settings
      WHERE key LIKE 'jsonb.round_trip_%' ORDER BY key`;
    expect(types.map((t) => t.type)).toEqual([
      "string",
      "number",
      "boolean",
      "null",
      "string",
      "string",
      "string",
    ]);
  });

  it("DB 연결: DATABASE_URL 이 바뀌면 새 연결을 만든다", async () => {
    vi.stubEnv("DATABASE_URL", testDb.url);
    const first = getDb();
    expect(getDb()).toBe(first);
    const other = new URL(testDb.url);
    other.searchParams.set("application_name", "momo_url_change");
    vi.stubEnv("DATABASE_URL", other.toString());
    const second = getDb();
    try {
      expect(second).not.toBe(first);
      const [row] =
        await second.$client`SELECT current_setting('application_name') AS name`;
      expect(row.name).toBe("momo_url_change");
    } finally {
      await second.$client.end();
    }
  });
});

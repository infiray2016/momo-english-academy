// e2e DB 도우미(plan-p10a 파일별 값 3, C70). playwright.config 가 띄운 임시 DB(scripts/dev-db.ts --ephemeral)에 붙는다.
// Playwright 쪽은 server-only 모듈을 가져오지 못하므로 postgres + drizzle-orm/postgres-js 와 스키마 세 파일만 쓴다.
// 접속 주소는 E2E_DB_PASSWORD · E2E_DB_PORT 로 조립한다(playwright.config e2eDatabaseUrl). 값을 출력하지 않는다.
// DB 를 쓰는 e2e 파일은 test.beforeEach(resetHousehold) 로 시작하고, 접근 쿠키 · 가짜 음성은 ./fixtures 의 test 를 쓴다.
// 이 도우미의 시각 당기기는 SQL 안 now() 를 쓰지 않고 기록된 시각에서 뺀다(P3a 메모).
// insertHousehold(첫 실행을 화면으로 거치지 않는 집 넣기)는 src/core/profile/start.ts 의 행 만들기 함수와 함께 차례 2 에서 더한다.
import { and, count, eq, isNull, max, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { e2eDatabaseUrl } from "../../playwright.config";
import * as content from "../../src/db/schema/content";
import * as learning from "../../src/db/schema/learning";
import * as operations from "../../src/db/schema/operations";

const schema = { ...content, ...learning, ...operations };
/** 시험 도우미는 연결 하나로 돈다(workers 1, 기술 값). */
const CONNECTIONS = 1;
/** 한 시간의 밀리초(단위 바꿈 상수). */
const MS_PER_HOUR = 60 * 60 * 1000;

function open() {
  const client = postgres(e2eDatabaseUrl(), {
    max: CONNECTIONS,
    prepare: false,
    onnotice: () => {},
  });
  return drizzle({ client, schema });
}

export type E2eDb = ReturnType<typeof open>;
let cached: E2eDb | undefined;

/** 이 일꾼의 e2e DB 연결(처음 부를 때 연다). */
export function e2eDb(): E2eDb {
  cached ??= open();
  return cached;
}

/** 연결을 닫는다(test.afterAll). */
export async function closeE2eDb(): Promise<void> {
  const db = cached;
  cached = undefined;
  await db?.$client.end();
}

/**
 * 집 기록을 비운다: 프로필(따라 지움 — 트랙 · 세션 · 시도 · unit_progress · level_tests · 프로필 설정 행 · 별 · 사건 · 프로필 알림),
 * parent_auth(pin · access_ip), 프로필 없는 parent_alerts. 시드 테이블 · 집 전체 설정은 두고, AI 기록(ai_calls · ai_status)도 둔다.
 */
export async function resetHousehold(): Promise<void> {
  const db = e2eDb();
  await db.transaction(async (tx) => {
    await tx.delete(learning.profiles);
    await tx.delete(operations.parentAuth);
    await tx
      .delete(operations.parentAlerts)
      .where(isNull(operations.parentAlerts.profileId));
  });
}

/** 집 전체 설정 하나를 그 동안만 바꾸고(설정 판은 가장 큰 판 + 1) 끝나면 되돌린다. 없던 키면 넣었다가 지운다. */
export async function withHouseholdSetting<T>(
  key: string,
  value: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  const db = e2eDb();
  const { settings } = operations;
  const where = and(eq(settings.key, key), isNull(settings.profileId));
  const nextVersion = async () => {
    const [row] = await db.select({ v: max(settings.version) }).from(settings);
    return Number(row?.v ?? 0) + 1;
  };
  const [before] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(where);
  if (before) {
    await db
      .update(settings)
      .set({ value, version: await nextVersion() })
      .where(where);
  } else {
    await db.insert(settings).values({
      key,
      scope: "household",
      profileId: null,
      value,
      version: await nextVersion(),
    });
  }
  try {
    return await fn();
  } finally {
    if (before) {
      await db
        .update(settings)
        .set({ value: before.value, version: await nextVersion() })
        .where(where);
    } else {
      await db.delete(settings).where(where);
    }
  }
}

/**
 * e2e 전용 수업 복제(정할 것 서): 시험용 시드에 없는 단계 · 주제 변형 칸을 있는 칸의 내용 그대로 만든다(검증 밖).
 * 같은 칸 · 판이 이미 있으면 건너뛴다. 넣은 행 수를 돌려준다.
 */
export async function cloneLessons(opts: {
  area: (typeof content.lessons.$inferSelect)["area"];
  fromLevel: number;
  toLevel?: number;
  unit: number;
  fromVariant?: number;
  toVariant?: number;
}): Promise<number> {
  const db = e2eDb();
  const { lessons } = content;
  const fromVariant = opts.fromVariant ?? 1;
  const rows = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, opts.area),
        eq(lessons.level, opts.fromLevel),
        eq(lessons.unit, opts.unit),
        eq(lessons.topicVariant, fromVariant),
      ),
    );
  if (rows.length === 0) {
    throw new Error(
      `복제할 수업이 없다: ${opts.area} ${opts.fromLevel}단계 단원 ${opts.unit} 변형 ${fromVariant}`,
    );
  }
  const copies = rows.map(({ id: _id, ...row }) => ({
    ...row,
    level: opts.toLevel ?? row.level,
    topicVariant: opts.toVariant ?? row.topicVariant,
  }));
  const inserted = await db
    .insert(lessons)
    .values(copies)
    .onConflictDoNothing()
    .returning({ id: lessons.id });
  return inserted.length;
}

/** e2e 전용 세션 넣기(P11 전에는 세션을 끝낼 길이 없어 끝낸 세션을 그 학습일로 넣는다). 넣은 id 를 차례대로 돌려준다. */
export async function insertSessions(
  rows: readonly (typeof learning.sessions.$inferInsert)[],
): Promise<string[]> {
  if (rows.length === 0) return [];
  const inserted = await e2eDb()
    .insert(learning.sessions)
    .values([...rows])
    .returning({ id: learning.sessions.id });
  return inserted.map((r) => r.id);
}

/** 테이블의 행 수(조건이 있으면 그 조건만). */
export async function countRows(table: PgTable, where?: SQL): Promise<number> {
  const [row] = await e2eDb().select({ n: count() }).from(table).where(where);
  return Number(row?.n ?? 0);
}

/**
 * 기록된 시각을 hours 시간만큼 앞으로 당긴다(AC-11d '24시간 뒤'). sessions 는 그 세션의 시작 · 끝 시각과 그 세션 시도의 시각을,
 * level_tests 는 시작 · 끝 시각을 당긴다. 끝 시각이 비었으면 비운 채로 둔다.
 */
export async function shiftTimes(
  table: "sessions" | "level_tests",
  id: string,
  hours: number,
): Promise<void> {
  const db = e2eDb();
  const ms = hours * MS_PER_HOUR;
  const back = (d: Date | null) => (d ? new Date(d.getTime() - ms) : null);
  await db.transaction(async (tx) => {
    if (table === "sessions") {
      const { sessions, attempts } = learning;
      const [row] = await tx
        .select({ s: sessions.startedAt, c: sessions.completedAt })
        .from(sessions)
        .where(eq(sessions.id, id));
      if (!row) throw new Error(`세션이 없다: ${id}`);
      await tx
        .update(sessions)
        .set({ startedAt: back(row.s) ?? row.s, completedAt: back(row.c) })
        .where(eq(sessions.id, id));
      const tries = await tx
        .select({ id: attempts.id, at: attempts.attemptedAt })
        .from(attempts)
        .where(eq(attempts.sessionId, id));
      for (const t of tries) {
        await tx
          .update(attempts)
          .set({ attemptedAt: back(t.at) ?? t.at })
          .where(eq(attempts.id, t.id));
      }
      return;
    }
    const { levelTests } = learning;
    const [row] = await tx
      .select({ s: levelTests.startedAt, c: levelTests.completedAt })
      .from(levelTests)
      .where(eq(levelTests.id, id));
    if (!row) throw new Error(`평가 기록이 없다: ${id}`);
    await tx
      .update(levelTests)
      .set({ startedAt: back(row.s) ?? row.s, completedAt: back(row.c) })
      .where(eq(levelTests.id, id));
  });
}

// 시험 파일마다 본 DB(momo_template)를 복사한 깨끗한 DB 를 만들고 지우는 도우미(plan-p03a 파일별 값 10).
// 본 DB 복사라 마이그레이션 · 기본 권한이 그대로다. 시험 파일끼리 나란히 돌아도 섞이지 않는다.
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { inject } from "vitest";
import { settings } from "@/db/schema/operations";
import { createDb, type Db } from "@/server/db";

/** 시험 DB 이름의 난수 바이트 수. */
const DB_NAME_BYTES = 6;

export type TestDatabase = {
  db: Db;
  url: string;
  drop: () => Promise<void>;
};

function adminClient() {
  return postgres(inject("pgAdminUrl"), { max: 1, onnotice: () => {} });
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const name = `t_${randomBytes(DB_NAME_BYTES).toString("hex")}`;
  const template = inject("pgTemplateDb");
  const admin = adminClient();
  try {
    await admin.unsafe(`CREATE DATABASE "${name}" TEMPLATE "${template}"`);
  } finally {
    await admin.end();
  }
  const target = new URL(inject("pgAdminUrl"));
  target.pathname = `/${name}`;
  const url = target.toString();
  const db = createDb(url);
  return {
    db,
    url,
    drop: async () => {
      await db.$client.end();
      const cleanup = adminClient();
      try {
        await cleanup.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      } finally {
        await cleanup.end();
      }
    },
  };
}

export type SettingEntry = {
  key: string;
  scope: "household" | "profile";
  value: unknown;
  profileId?: string | null;
};

/** settings 행을 넣는다. 설정 판(version)은 이미 있는 가장 큰 판 다음부터(빈 DB 면 1부터) 차례로 붙는다. */
export async function seedSettings(
  db: Db,
  entries: readonly SettingEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  const [{ maxVersion }] = await db
    .select({
      maxVersion:
        sql<number>`coalesce(max(${settings.version}), 0)::int8`.mapWith(
          Number,
        ),
    })
    .from(settings);
  await db.insert(settings).values(
    entries.map((entry, index) => ({
      key: entry.key,
      scope: entry.scope,
      profileId: entry.profileId ?? null,
      value: entry.value,
      version: maxVersion + index + 1,
    })),
  );
}

// 12절 설정 읽기 · 묶음 위험 4(plan-p03a 증명 표). 값은 TEST_SETTINGS 에서 읽는다.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { profiles } from "@/db/schema/learning";
import { settings } from "@/db/schema/operations";
import { schema } from "@/server/db";
import {
  appDayStartHourSchema,
  appTimezoneSchema,
  getSetting,
  getSettings,
  SettingInvalidError,
  SettingMissingError,
} from "@/server/settings";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  createTestDatabase,
  type SettingEntry,
  seedSettings,
  type TestDatabase,
} from "./test-db";

const TIMEZONE = "app.timezone";
const DAY_START_HOUR = "app.day_start_hour";
const LENGTH_FACTOR = "session.length_factor";
const lengthFactorSchema = z.number().positive();
/** 프로필 행에 넣는 값(기본값과 다르기만 하면 된다). */
const PROFILE_LENGTH_FACTOR = TEST_SETTINGS[LENGTH_FACTOR].value / 2;

function entry(
  key: keyof typeof TEST_SETTINGS,
  overrides: Partial<SettingEntry> = {},
): SettingEntry {
  const { scope, value } = TEST_SETTINGS[key];
  return { key, scope, value, ...overrides };
}

let testDb: TestDatabase;
let profileA = "";
let profileB = "";

beforeAll(async () => {
  testDb = await createTestDatabase();
  const rows = await testDb.db
    .insert(profiles)
    .values(
      ["A", "B"].map((tag) => ({
        displayName: `시험 프로필 ${tag}`,
        englishName: `Tester${tag}`,
        avatar: "fox",
        topicBundle: "animals",
        alphabetStart: false,
      })),
    )
    .returning({ id: profiles.id });
  [profileA, profileB] = rows.map((r) => r.id);
});

beforeEach(async () => {
  await testDb.db.delete(settings);
});

afterAll(async () => {
  await testDb?.drop();
});

describe("설정 읽기", () => {
  it("설정 읽기: 집 전체 키는 profile_id 가 빈 행을 읽는다", async () => {
    await seedSettings(testDb.db, [entry(TIMEZONE), entry(DAY_START_HOUR)]);
    const { db } = testDb;
    expect(await getSetting(TIMEZONE, appTimezoneSchema, { db })).toBe(
      TEST_SETTINGS[TIMEZONE].value,
    );
    // 프로필을 넘겨도 집 전체 키는 같은 기본 행이다
    expect(
      await getSetting(DAY_START_HOUR, appDayStartHourSchema, {
        db,
        profileId: profileA,
      }),
    ).toBe(TEST_SETTINGS[DAY_START_HOUR].value);
  });

  it("설정 읽기: 프로필 키는 그 프로필 행을 먼저, 없으면 기본 행을 읽는다(B5-19)", async () => {
    const defaultValue = TEST_SETTINGS[LENGTH_FACTOR].value;
    const profileValue = PROFILE_LENGTH_FACTOR;
    await seedSettings(testDb.db, [
      entry(LENGTH_FACTOR),
      entry(LENGTH_FACTOR, { profileId: profileA, value: profileValue }),
    ]);
    const { db } = testDb;
    expect(
      await getSetting(LENGTH_FACTOR, lengthFactorSchema, {
        db,
        profileId: profileA,
      }),
    ).toBe(profileValue);
    expect(
      await getSetting(LENGTH_FACTOR, lengthFactorSchema, {
        db,
        profileId: profileB,
      }),
    ).toBe(defaultValue);
    expect(await getSetting(LENGTH_FACTOR, lengthFactorSchema, { db })).toBe(
      defaultValue,
    );
  });

  it("설정 읽기: 없는 키는 SettingMissingError 이고 코드 기본값으로 메우지 않는다", async () => {
    await seedSettings(testDb.db, [entry(TIMEZONE)]);
    const { db } = testDb;
    const missing = getSettings(
      {
        [TIMEZONE]: appTimezoneSchema,
        [DAY_START_HOUR]: appDayStartHourSchema,
      },
      { db },
    );
    await expect(missing).rejects.toBeInstanceOf(SettingMissingError);
    await expect(missing).rejects.toMatchObject({ key: DAY_START_HOUR });
    // 프로필 키의 프로필 행만 있고 기본 행이 없으면 다른 프로필에서는 없는 키다
    await seedSettings(testDb.db, [
      entry(LENGTH_FACTOR, { profileId: profileA }),
    ]);
    await expect(
      getSetting(LENGTH_FACTOR, lengthFactorSchema, {
        db,
        profileId: profileB,
      }),
    ).rejects.toMatchObject({
      name: "SettingMissingError",
      key: LENGTH_FACTOR,
    });
  });

  it("설정 읽기: 값이 규격에 어긋나면 SettingInvalidError 다", async () => {
    const { db } = testDb;
    await seedSettings(db, [
      // 수가 아니라 글자인 시각(jsonb 가 다시 풀지 않으므로 글자 그대로 읽힌다, 검토 A1 M-3)
      entry(DAY_START_HOUR, {
        value: String(TEST_SETTINGS[DAY_START_HOUR].value),
      }),
      entry(TIMEZONE, { value: "Not/A_Zone" }),
    ]);
    await expect(
      getSetting(DAY_START_HOUR, appDayStartHourSchema, { db }),
    ).rejects.toMatchObject({
      name: "SettingInvalidError",
      key: DAY_START_HOUR,
    });
    await expect(
      getSetting(TIMEZONE, appTimezoneSchema, { db }),
    ).rejects.toBeInstanceOf(SettingInvalidError);
  });

  it("설정 읽기: 여러 키를 질의 한 번으로 읽는다", async () => {
    await seedSettings(testDb.db, [
      entry(TIMEZONE),
      entry(DAY_START_HOUR),
      entry(LENGTH_FACTOR),
      entry(LENGTH_FACTOR, {
        profileId: profileA,
        value: PROFILE_LENGTH_FACTOR,
      }),
    ]);
    const queries: string[] = [];
    const client = postgres(testDb.url, {
      prepare: false,
      max: 1,
      debug: (_connection, query) => {
        queries.push(query);
      },
    });
    try {
      const db = drizzle({ client, schema });
      // 첫 연결 때 드라이버가 보내는 형 조회는 세지 않는다
      await client`SELECT 1`;
      queries.length = 0;
      const values = await getSettings(
        {
          [TIMEZONE]: appTimezoneSchema,
          [DAY_START_HOUR]: appDayStartHourSchema,
          [LENGTH_FACTOR]: lengthFactorSchema,
        },
        { db, profileId: profileA },
      );
      expect(values).toEqual({
        [TIMEZONE]: TEST_SETTINGS[TIMEZONE].value,
        [DAY_START_HOUR]: TEST_SETTINGS[DAY_START_HOUR].value,
        [LENGTH_FACTOR]: PROFILE_LENGTH_FACTOR,
      });
      expect(queries).toHaveLength(1);
    } finally {
      await client.end();
    }
  });
});

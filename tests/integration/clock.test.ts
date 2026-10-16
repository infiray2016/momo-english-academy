// AC-7g 의 P3 몫(시계 · 시각 당기기, plan-p03a 증명 표, C55 (3)).
// 학습일은 시험용 DB 의 설정 app.timezone · app.day_start_hour 를 읽어 learningDayOf 로 센다.
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { learningDayOf } from "@/core/learning-day";
import { profiles, sessions } from "@/db/schema/learning";
import { ClockConfigError, createClock, readShiftDays } from "@/server/clock";
import {
  appDayStartHourSchema,
  appTimezoneSchema,
  getSettings,
} from "@/server/settings";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  createTestDatabase,
  type SettingEntry,
  seedSettings,
  type TestDatabase,
} from "./test-db";

const SHIFT_ENV = "CLOCK_SHIFT_DAYS";
/** 시험에서 당기는 날 수(아무 양의 정수나 된다). */
const SHIFT_DAYS = 3;
/** 시험의 '실제' 시각(시계를 읽지 않는다). */
const REAL_INSTANT = new Date("2026-10-16T03:00:00Z");
const realNow = () => REAL_INSTANT.getTime();
const MS_PER_DAY = 86_400_000;
const CURRENT_TIME_FUNCTIONS =
  /\b(now|clock_timestamp|statement_timestamp|transaction_timestamp|timeofday)\s*\(|\b(current_timestamp|current_date|current_time|localtimestamp|localtime)\b/i;

type Env = Record<string, string | undefined>;

/** 읽은 이름을 기록하는 환경 객체. */
function recordingEnv(values: Env): { env: Env; reads: string[] } {
  const reads: string[] = [];
  const env = new Proxy(values, {
    get(target, name) {
      if (typeof name === "string") reads.push(name);
      return Reflect.get(target, name);
    },
    has(target, name) {
      if (typeof name === "string") reads.push(name);
      return Reflect.has(target, name);
    },
  });
  return { env, reads };
}

function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const entries: SettingEntry[] = (
    ["app.timezone", "app.day_start_hour"] as const
  ).map((key) => ({ key, ...TEST_SETTINGS[key] }));
  await seedSettings(testDb.db, entries);
});

afterAll(async () => {
  await testDb?.drop();
});

async function learningDayFromSettings(instant: Date): Promise<string> {
  const values = await getSettings(
    {
      "app.timezone": appTimezoneSchema,
      "app.day_start_hour": appDayStartHourSchema,
    },
    { db: testDb.db },
  );
  return learningDayOf(
    instant,
    values["app.timezone"],
    values["app.day_start_hour"],
  );
}

describe("한 시계 · 시각 당기기", () => {
  it("AC-7g 프리뷰(VERCEL_ENV=preview)는 CLOCK_SHIFT_DAYS 만큼 시계와 학습일이 넘어간다", async () => {
    const clock = createClock({
      env: { VERCEL_ENV: "preview", [SHIFT_ENV]: String(SHIFT_DAYS) },
      realNow,
    });
    expect(clock.shiftDays).toBe(SHIFT_DAYS);
    expect(clock.now().getTime() - REAL_INSTANT.getTime()).toBe(
      SHIFT_DAYS * MS_PER_DAY,
    );
    const realDay = await learningDayFromSettings(REAL_INSTANT);
    expect(await learningDayFromSettings(clock.now())).toBe(
      addDays(realDay, SHIFT_DAYS),
    );
  });

  it("AC-7g 운영 배포(VERCEL_ENV=production)는 CLOCK_SHIFT_DAYS 를 읽지 않는다", () => {
    const { env, reads } = recordingEnv({
      VERCEL_ENV: "production",
      NODE_ENV: "production",
      [SHIFT_ENV]: String(SHIFT_DAYS),
    });
    const clock = createClock({ env, realNow });
    expect(reads).not.toContain(SHIFT_ENV);
    expect(clock.shiftDays).toBe(0);
    expect(clock.now().getTime()).toBe(REAL_INSTANT.getTime());
    // 값이 틀려도 읽지 않으므로 오류가 아니다
    const broken = recordingEnv({
      VERCEL_ENV: "production",
      NODE_ENV: "production",
      [SHIFT_ENV]: "not-a-number",
    });
    expect(readShiftDays(broken.env)).toBe(0);
    expect(broken.reads).not.toContain(SHIFT_ENV);
  });

  it("AC-7g VERCEL_ENV 없는 next start · next dev 도 당기지 않는다", () => {
    for (const nodeEnv of ["production", "development"]) {
      const { env, reads } = recordingEnv({
        NODE_ENV: nodeEnv,
        [SHIFT_ENV]: String(SHIFT_DAYS),
      });
      const clock = createClock({ env, realNow });
      expect(reads, nodeEnv).not.toContain(SHIFT_ENV);
      expect(clock.shiftDays, nodeEnv).toBe(0);
      expect(clock.now().getTime(), nodeEnv).toBe(REAL_INSTANT.getTime());
    }
  });

  it("AC-7g 잘못된 CLOCK_SHIFT_DAYS(음수 · 소수 · 글자)는 시계를 만들 때 오류다", () => {
    for (const bad of ["-1", "1.5", "abc", " 1"]) {
      expect(
        () =>
          createClock({
            env: { VERCEL_ENV: "preview", [SHIFT_ENV]: bad },
            realNow,
          }),
        bad,
      ).toThrow(ClockConfigError);
    }
    // 시험 환경(NODE_ENV=test)도 같은 규칙으로 읽는다
    expect(() =>
      createClock({ env: { NODE_ENV: "test", [SHIFT_ENV]: "-1" }, realNow }),
    ).toThrow(ClockConfigError);
    // 비었거나 없으면 0
    expect(readShiftDays({ VERCEL_ENV: "preview", [SHIFT_ENV]: "" })).toBe(0);
    expect(readShiftDays({ VERCEL_ENV: "preview" })).toBe(0);
  });

  it("AC-7g 기록 시각 · 학습일은 앱 시계 값 그대로 sessions 에 저장된다", async () => {
    const clock = createClock({
      env: { VERCEL_ENV: "preview", [SHIFT_ENV]: String(SHIFT_DAYS) },
      realNow,
    });
    const [profile] = await testDb.db
      .insert(profiles)
      .values({
        displayName: "시험 프로필",
        englishName: "Tester",
        avatar: "fox",
        topicBundle: "animals",
        alphabetStart: false,
      })
      .returning({ id: profiles.id });
    const startedAt = clock.now();
    const completedAt = clock.now();
    const learningDay = await learningDayFromSettings(completedAt);
    const [inserted] = await testDb.db
      .insert(sessions)
      .values({
        profileId: profile.id,
        area: "reading",
        kind: "regular",
        status: "completed",
        startedAt,
        completedAt,
        learningDay,
      })
      .returning({ id: sessions.id });
    const [row] = await testDb.db
      .select({
        startedAt: sessions.startedAt,
        completedAt: sessions.completedAt,
        learningDay: sessions.learningDay,
      })
      .from(sessions)
      .where(eq(sessions.id, inserted.id));
    expect(row.startedAt.getTime()).toBe(startedAt.getTime());
    expect(row.completedAt?.getTime()).toBe(completedAt.getTime());
    expect(row.learningDay).toBe(learningDay);
    expect(row.learningDay).toBe(
      addDays(await learningDayFromSettings(REAL_INSTANT), SHIFT_DAYS),
    );
  });

  it("AC-7g 어느 열의 기본값에도 현재 시각 함수(now() · CURRENT_TIMESTAMP 등)가 없다", async () => {
    const columns = await testDb.db.$client<
      { name: string; column_default: string }[]
    >`
      SELECT table_schema || '.' || table_name || '.' || column_name AS name, column_default
      FROM information_schema.columns
      WHERE table_schema IN ('public', 'drizzle') AND column_default IS NOT NULL`;
    expect(columns.length).toBeGreaterThan(0);
    const offending = columns.filter((c) =>
      CURRENT_TIME_FUNCTIONS.test(c.column_default),
    );
    expect(offending).toEqual([]);
  });
});

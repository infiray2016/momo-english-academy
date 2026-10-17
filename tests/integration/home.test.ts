// 홈 자료(4절 홈 표 · AC-2a, plan-p10b 파일별 값 4) — 시험 DB 에 시험용 시드를 넣고 첫 실행 저장 뒤 본다.
// 설계 숫자(최근 성적 칸 수 · 기준)는 단원 복사본(unit_progress)에서 읽어 단언한다.
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { learningDayOf } from "@/core/learning-day";
import { AVATARS, TOPIC_BUNDLES } from "@/core/profile/start";
import { UNITS_PER_LEVEL } from "@/core/seed/structure";
import { profiles, sessions, unitProgress } from "@/db/schema/learning";
import { parentAlerts, parentAuth } from "@/db/schema/operations";
import type { Db } from "@/server/db";
import { readHome } from "@/server/home";
import { readHouseholdProfile, saveFirstRun } from "@/server/profile";
import { loadSeed } from "@/server/seed/load";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import { TEST_SETTINGS } from "../fixtures/settings";
import { createTestDatabase, type TestDatabase } from "./test-db";

/** 시드 적재 시각(시험용 단가표가 이 날부터라 적재만 따로 둔다). */
const LOADED_AT = new Date("2026-10-17T10:00:00+09:00");
const SAVED_AT = new Date("2026-10-15T10:00:00+09:00"); // 목요일
const NOW = new Date("2026-10-15T20:00:00+09:00");
const TODAY = learningDayOf(
  NOW,
  TEST_SETTINGS["app.timezone"].value,
  TEST_SETTINGS["app.day_start_hour"].value,
);
const MONDAY = "2026-10-12";
const LAST_SUNDAY = "2026-10-11";

let testDb: TestDatabase;
let db: Db;

beforeAll(async () => {
  testDb = await createTestDatabase();
  db = testDb.db;
  const report = await loadSeed(db, {
    files: filesOf(devSeedTree()),
    completeThrough: DEV_SEED_THROUGH,
    areas: [...DEV_SEED_AREAS],
    now: LOADED_AT,
  });
  if (report.outcome !== "loaded") throw new Error("시험 시드 적재 실패");
});
afterAll(async () => {
  await testDb.drop();
});
beforeEach(async () => {
  await db.delete(profiles);
  await db.delete(parentAuth);
  await db.delete(parentAlerts);
  const saved = await saveFirstRun(
    {
      pin: "246813",
      displayName: "모모",
      englishName: "Momo",
      avatar: AVATARS[0].id,
      topicBundle: TOPIC_BUNDLES[0].id,
      alphabetUnknown: false,
      startLevels: { reading: 1 },
      mic: { result: "not_checked" },
    },
    { db, now: () => SAVED_AT },
  );
  if (!saved.ok) throw new Error("첫 실행 저장 실패");
});

async function profileId(): Promise<string> {
  const p = await readHouseholdProfile({ db });
  if (!p) throw new Error("프로필 없음");
  return p.id;
}

describe("홈 자료", () => {
  it("홈 자료: 단계가 정해진 영역은 단계 · 지금 단원 칸 · 단원 단어 수 · 빈 최근 성적 칸이고, 배치 전 영역은 배치, 회화는 말하기 시작 단계 전이다", async () => {
    const home = await readHome({ db, now: NOW });
    expect(home?.displayName).toBe("모모");
    expect(home?.starTotal).toBe(0);
    const [reading, writing, speaking, talk] = home?.cards ?? [];
    expect(reading).toMatchObject({
      area: "reading",
      gate: null,
      level: 1,
      unit: 1,
    });
    expect(reading?.unitCells).toEqual([
      "current",
      ...Array.from({ length: UNITS_PER_LEVEL - 1 }, () => "upcoming"),
    ]);
    expect(reading?.unitWords).toBeGreaterThan(0);
    expect(typeof reading?.unitTopic).toBe("string");
    const [progress] = await db
      .select()
      .from(unitProgress)
      .where(eq(unitProgress.area, "reading"));
    const snapshot = progress?.settingsSnapshot as
      | Record<string, number>
      | undefined;
    const window = snapshot?.["unit.recent_window"] ?? 0;
    expect(reading?.recent).toEqual(
      Array.from({ length: window }, () => "empty"),
    );
    expect(reading?.today).toEqual({ done: false, newLessonDone: false });
    expect(writing).toMatchObject({ gate: "placement" });
    expect(speaking).toMatchObject({ gate: "placement" });
    expect(talk).toMatchObject({ gate: "needs_speaking" });
    // 첫 실행 저장이 만든 범위 끝 알림이 확인 전이라 부모 점이 켜진다
    expect(home?.parentDot).toBe(true);
    await db.update(parentAlerts).set({ acknowledgedAt: NOW });
    expect((await readHome({ db, now: NOW }))?.parentDot).toBe(false);
  });

  it("홈 자료: 오늘 끝낸 새 수업으로 오늘 완료 · 이번 주는 월요일부터 서로 다른 학습일 · 최근 성적은 기준 넘은 수업만 pass 이고 통과한 단원은 passed 칸이다", async () => {
    const id = await profileId();
    const [progress] = await db
      .select()
      .from(unitProgress)
      .where(
        and(eq(unitProgress.profileId, id), eq(unitProgress.area, "reading")),
      );
    if (!progress) throw new Error("단원 회차 없음");
    const pass = (progress.settingsSnapshot as Record<string, number>)[
      "unit.recent_score"
    ];
    const row = (
      learningDay: string,
      score: number,
      kind: "regular" | "retry" = "regular",
    ) => ({
      profileId: id,
      area: "reading" as const,
      level: 1,
      unit: 1,
      kind,
      status: "completed" as const,
      score,
      startedAt: SAVED_AT,
      completedAt: new Date(`${learningDay}T12:00:00+09:00`),
      learningDay,
    });
    await db.insert(sessions).values([
      row(LAST_SUNDAY, pass), // 지난 주 — 이번 주에 안 셈, 회차 시작 전이라 성적에도 안 듦
      row(MONDAY, pass - 0.1),
      row(TODAY, pass),
      row(TODAY, 1, "retry"),
    ]);
    // 지난 주 세션은 회차 시작(SAVED_AT, 목요일) 뒤에 끝난 것이 아니게 completedAt 을 당긴다
    await db
      .update(unitProgress)
      .set({ startedAt: new Date(`${MONDAY}T00:00:00+09:00`) })
      .where(eq(unitProgress.id, progress.id));
    // 단원 2 를 통과한 회차가 있으면 passed 칸
    await db.insert(unitProgress).values({
      ...progress,
      id: undefined,
      unit: 2,
      passedAt: NOW,
    });
    const reading = (await readHome({ db, now: NOW }))?.cards[0];
    expect(reading?.today).toEqual({ done: true, newLessonDone: true });
    expect(reading?.thisWeek).toBe(2);
    expect(reading?.recent.slice(0, 2)).toEqual(["miss", "pass"]);
    expect(reading?.recent.filter((c) => c === "empty")).toHaveLength(
      (reading?.recent.length ?? 0) - 2,
    );
    expect(reading?.unitCells.slice(0, 2)).toEqual(["current", "passed"]);

    // 통과 시각 없는 단원 3 회차는 아직 남은 칸(검토 review-p10-3-code M-1)
    await db.insert(unitProgress).values({
      ...progress,
      id: undefined,
      unit: 3,
      passedAt: null,
    });
    // 최근 성적 칸 수는 그 회차 복사본의 unit.recent_window 를 따른다(다른 수로 바꿔 봄)
    const snapshot = progress.settingsSnapshot as Record<string, number>;
    const window = (snapshot["unit.recent_window"] ?? 0) - 2;
    await db
      .update(unitProgress)
      .set({ settingsSnapshot: { ...snapshot, "unit.recent_window": window } })
      .where(eq(unitProgress.id, progress.id));
    const again = (await readHome({ db, now: NOW }))?.cards[0];
    expect(again?.unitCells.slice(0, 3)).toEqual([
      "current",
      "passed",
      "upcoming",
    ]);
    expect(again?.recent).toHaveLength(window);
  });

  it("홈 자료: '이번 주 n일'은 배치 평가 세션을 끝낸 날도 세고 오늘 완료는 배치 평가로 켜지지 않는다", async () => {
    const id = await profileId();
    await db.insert(sessions).values({
      profileId: id,
      area: "writing",
      kind: "placement",
      status: "completed",
      startedAt: NOW,
      completedAt: NOW,
      learningDay: TODAY,
    });
    const writing = (await readHome({ db, now: NOW }))?.cards[1];
    expect(writing?.area).toBe("writing");
    expect(writing?.thisWeek).toBe(1);
    expect(writing?.today).toEqual({ done: false, newLessonDone: false });
  });
});

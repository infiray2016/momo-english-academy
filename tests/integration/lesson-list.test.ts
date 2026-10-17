// 수업 목록 자료(plan-p10b 파일별 값 5 · 정할 것 ㄷ · ㅂ · ㅅ · ㅇ) — 시험 DB 에 시험용 시드를 넣고 첫 실행 저장 뒤 본다.
// 설계 숫자(session.resume_hours · unit.min_lessons · unit.min_days)는 설정 · 단원 복사본에서 읽어 단언한다.
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { learningDayOf } from "@/core/learning-day";
import { AVATARS, TOPIC_BUNDLES } from "@/core/profile/start";
import { lessons, levelSpecs } from "@/db/schema/content";
import {
  profiles,
  profileTracks,
  sessions,
  unitProgress,
} from "@/db/schema/learning";
import { parentAlerts, parentAuth } from "@/db/schema/operations";
import type { Db } from "@/server/db";
import { readLessonList } from "@/server/lesson-list";
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

const LOADED_AT = new Date("2026-10-17T10:00:00+09:00");
const SAVED_AT = new Date("2026-10-17T11:00:00+09:00");
const NOW = new Date("2026-10-17T20:00:00+09:00");
const HOUR_MS = 60 * 60 * 1000;
const RESUME_HOURS = TEST_SETTINGS["session.resume_hours"].value;
const learningDay = (at: Date) =>
  learningDayOf(
    at,
    TEST_SETTINGS["app.timezone"].value,
    TEST_SETTINGS["app.day_start_hour"].value,
  );

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
      // 시험용 시드는 변형 1 뿐 — 묶음 2 를 고르면 가장 낮은 변형으로 연다(정할 것 ㅂ)
      topicBundle: TOPIC_BUNDLES[1].id,
      alphabetUnknown: false,
      startLevels: { reading: 1 },
      mic: { result: "not_checked" },
    },
    { db, now: () => SAVED_AT },
  );
  if (!saved.ok) throw new Error("첫 실행 저장 실패");
});

async function ids() {
  const profile = await readHouseholdProfile({ db });
  if (!profile) throw new Error("프로필 없음");
  const [round] = await db
    .select()
    .from(unitProgress)
    .where(
      and(
        eq(unitProgress.profileId, profile.id),
        eq(unitProgress.area, "reading"),
      ),
    );
  if (!round) throw new Error("단원 회차 없음");
  return { profileId: profile.id, round };
}

async function readingLessonId(
  unit: number,
  kind: "assigned" | "reinforce",
  lessonNo: number,
) {
  const [row] = await db
    .select({ id: lessons.id })
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "reading"),
        eq(lessons.level, 1),
        eq(lessons.unit, unit),
        eq(lessons.kind, kind),
        eq(lessons.lessonNo, lessonNo),
      ),
    );
  if (!row) throw new Error("수업 행 없음");
  return row.id;
}

describe("수업 목록 자료", () => {
  it("수업 목록 자료: 배치 전 영역은 배치로, 단계가 정해진 영역은 지금 단원 묶음 · 잠긴 다음 단원 줄(최소 수업 수 − 끝낸 정규 수업) · 고른 묶음 변형이 없으면 가장 낮은 변형이다", async () => {
    expect(await readLessonList({ db, area: "writing", now: NOW })).toEqual({
      kind: "placement",
    });
    const list = await readLessonList({ db, area: "reading", now: NOW });
    if (list.kind !== "list") throw new Error("목록이어야 한다");
    const { view, input } = list;
    expect(view.band).toEqual({ level: 1, unit: 1 });
    const assigned =
      input.lessonsByUnit[1]?.filter((c) => c.kind === "assigned") ?? [];
    expect(assigned.length).toBeGreaterThan(0);
    expect(view.current?.front.map((l) => l.ref.kind)).toEqual(
      assigned.map(() => "assigned"),
    );
    expect(view.current?.back.length).toBeGreaterThan(0);
    for (const cells of Object.values(input.lessonsByUnit)) {
      for (const c of cells) expect(c.variant).toBe(1);
    }
    const { round } = await ids();
    const snapshot = round.settingsSnapshot as Record<string, number>;
    const minLessons = Math.max(
      assigned.length,
      snapshot["unit.min_lessons"] ?? 0,
    );
    expect(view.lockedNext).toEqual({
      unit: 2,
      line: { kind: "lessons", n: minLessons },
    });
    expect(view.past).toBe(false);
    expect(view.hereStart).toEqual({
      kind: "lesson",
      ref: assigned[0] && {
        unit: 1,
        kind: "assigned",
        lessonNo: assigned[0].lessonNo,
      },
    });
  });

  it("수업 목록 자료: 이 회차에서 끝낸 정규 수업이 수업 수 줄을 줄이고, 수업 수가 차면 학습일 줄(unit.min_days − 끝낸 학습일 수)이다", async () => {
    const { profileId, round } = await ids();
    const snapshot = round.settingsSnapshot as Record<string, number>;
    const list = await readLessonList({ db, area: "reading", now: NOW });
    if (list.kind !== "list") throw new Error("목록이어야 한다");
    const cells = list.input.lessonsByUnit[1] ?? [];
    const regular = cells.filter(
      (c) => c.kind === "assigned" || c.kind === "reinforce",
    );
    const minLessons = Math.max(
      cells.filter((c) => c.kind === "assigned").length,
      snapshot["unit.min_lessons"] ?? 0,
    );
    // 정규 수업을 최소 수업 수만큼 같은 학습일에 끝냄(수업이 모자라면 다시 하기 아닌 정규만 센다)
    const doneAt = new Date(NOW.getTime() - HOUR_MS);
    const rows = regular.slice(0, minLessons).map((c) => ({
      profileId,
      area: "reading" as const,
      level: 1,
      unit: 1,
      lessonId: c.lessonId,
      kind: "regular" as const,
      status: "completed" as const,
      startedAt: doneAt,
      completedAt: doneAt,
      learningDay: learningDay(doneAt),
      seedRevision: c.revision,
      seedCorrection: c.correction,
    }));
    await db.insert(sessions).values(rows);
    const after = await readLessonList({ db, area: "reading", now: NOW });
    if (after.kind !== "list") throw new Error("목록이어야 한다");
    const left = minLessons - rows.length;
    expect(after.view.lockedNext?.line).toEqual(
      left > 0
        ? { kind: "lessons", n: left }
        : { kind: "days", n: (snapshot["unit.min_days"] ?? 0) - 1 },
    );
    expect(
      after.view.current?.front.filter((l) => l.done).length,
    ).toBeGreaterThan(0);
  });

  it("세션 틀: session.resume_hours 가 지난 진행 세션은 수업 목록 요청 때 중단으로 닫히고 배치 평가는 닫히지 않는다", async () => {
    const { profileId } = await ids();
    const old = new Date(NOW.getTime() - (RESUME_HOURS + 1) * HOUR_MS);
    const fresh = new Date(NOW.getTime() - (RESUME_HOURS - 1) * HOUR_MS);
    const lessonId = await readingLessonId(1, "assigned", 1);
    await db.insert(sessions).values([
      {
        profileId,
        area: "reading",
        level: 1,
        unit: 1,
        lessonId,
        kind: "regular",
        status: "in_progress",
        startedAt: old,
      },
      {
        profileId,
        area: "writing",
        kind: "placement",
        status: "in_progress",
        startedAt: old,
      },
      {
        profileId,
        area: "speaking",
        level: 1,
        unit: 1,
        kind: "regular",
        status: "in_progress",
        startedAt: fresh,
      },
    ]);
    await readLessonList({ db, area: "reading", now: NOW });
    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.profileId, profileId));
    const byArea = Object.fromEntries(rows.map((r) => [r.area, r]));
    expect(byArea.reading).toMatchObject({
      status: "aborted",
      learningDay: learningDay(NOW),
      completedAt: null,
    });
    expect(byArea.writing?.status).toBe("in_progress");
    expect(byArea.speaking?.status).toBe("in_progress");
  });

  it("수업 목록 자료: 통과한 단원이 있으면 '지난 수업 다시 하기'가 있고, 부모 확인 대기(pending)면 안내가 지금 단원 묶음 자리다", async () => {
    const { profileId, round } = await ids();
    await db
      .update(unitProgress)
      .set({ passedAt: NOW })
      .where(eq(unitProgress.id, round.id));
    await db.insert(unitProgress).values({
      ...round,
      id: undefined,
      unit: 2,
      passedAt: null,
      parentCheck: "pending",
    });
    await db
      .update(profileTracks)
      .set({ unit: 2 })
      .where(
        and(
          eq(profileTracks.profileId, profileId),
          eq(profileTracks.area, "reading"),
        ),
      );
    const list = await readLessonList({ db, area: "reading", now: NOW });
    if (list.kind !== "list") throw new Error("목록이어야 한다");
    expect(list.input.unitsPassed).toEqual([1]);
    expect(list.view.past).toBe(true);
    expect(list.view.notice).toBe("parent_check");
    expect(list.view.current).toBeNull();
    expect(list.input.lessonsByUnit[1]?.length).toBeGreaterThan(0);
  });

  it("수업 목록 자료: 남은 수업 수는 이 회차에서 끝낸 정규 수업만 빼고 다시 하기는 학습일에만 들며, 회차 전에 끝낸 수업은 안 들고 회차 전에 시작해 뒤에 끝낸 수업은 든다", async () => {
    const { profileId, round } = await ids();
    const lessonId = await readingLessonId(1, "assigned", 1);
    const before = await readLessonList({ db, area: "reading", now: NOW });
    if (before.kind !== "list") throw new Error("목록이어야 한다");
    const base = before.input.gate;
    const day = (offsetH: number) =>
      new Date(NOW.getTime() - offsetH * HOUR_MS);
    const row = (
      kind: "regular" | "retry",
      started: Date,
      completed: Date,
    ) => ({
      profileId,
      area: "reading" as const,
      level: 1,
      unit: 1,
      lessonId,
      kind,
      status: "completed" as const,
      startedAt: started,
      completedAt: completed,
      learningDay: learningDay(completed),
    });
    // (가) 다시 하기 하나: 수업 수는 그대로, 학습일은 하나 준다
    await db.insert(sessions).values(row("retry", day(2), day(2)));
    const afterRetry = await readLessonList({ db, area: "reading", now: NOW });
    if (afterRetry.kind !== "list") throw new Error("목록이어야 한다");
    expect(afterRetry.input.gate).toEqual({
      remainingLessons: base.remainingLessons,
      remainingDays: Math.max(0, base.remainingDays - 1),
    });
    // (나) 회차 시작 전에 시작하고 끝낸 정규 수업은 안 든다
    const beforeRound = new Date(round.startedAt.getTime() - 2 * HOUR_MS);
    await db.insert(sessions).values(row("regular", beforeRound, beforeRound));
    const afterOld = await readLessonList({ db, area: "reading", now: NOW });
    if (afterOld.kind !== "list") throw new Error("목록이어야 한다");
    expect(afterOld.input.gate.remainingLessons).toBe(base.remainingLessons);
    // 회차 전에 시작해 뒤에 끝낸 정규 수업은 든다(끝낸 시각이 경계, 검토 M-3)
    await db.insert(sessions).values(row("regular", beforeRound, day(2)));
    const afterCross = await readLessonList({ db, area: "reading", now: NOW });
    if (afterCross.kind !== "list") throw new Error("목록이어야 한다");
    expect(afterCross.input.gate.remainingLessons).toBe(
      Math.max(0, base.remainingLessons - 1),
    );
  });

  it("수업 목록 자료: 복사본 unit.min_lessons 가 배정 수보다 작으면 남은 수업 수는 배정 수에서 세고, 지금 회차를 통과했으면 currentPassed 다", async () => {
    const { round } = await ids();
    const snapshot = round.settingsSnapshot as Record<string, number>;
    await db
      .update(unitProgress)
      .set({ settingsSnapshot: { ...snapshot, "unit.min_lessons": 1 } })
      .where(eq(unitProgress.id, round.id));
    const list = await readLessonList({ db, area: "reading", now: NOW });
    if (list.kind !== "list") throw new Error("목록이어야 한다");
    const assigned = (list.input.lessonsByUnit[1] ?? []).filter(
      (c) => c.kind === "assigned",
    ).length;
    expect(assigned).toBeGreaterThan(1);
    expect(list.input.gate.remainingLessons).toBe(assigned);
    expect(list.input.currentPassed).toBe(false);
    await db
      .update(unitProgress)
      .set({ passedAt: NOW })
      .where(eq(unitProgress.id, round.id));
    const passed = await readLessonList({ db, area: "reading", now: NOW });
    if (passed.kind !== "list") throw new Error("목록이어야 한다");
    expect(passed.input.currentPassed).toBe(true);
    expect(passed.view.lockedNext?.line ?? null).toBeNull();
  });
  it("수업 목록 자료: 쓰기 6단계부터는 남은 수업 수를 level_specs frame.minLessons 에서 세고 복사본 unit.min_lessons 는 안 쓴다", async () => {
    // 시험용 수업 칸은 1단계까지 — 읽기 1단계 단원 1 수업 칸을 쓰기 6단계로 복사해 넣는다
    const { profileId, round } = await ids();
    const readingCells = await db
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.area, "reading"),
          eq(lessons.level, 1),
          eq(lessons.unit, 1),
        ),
      );
    await db.insert(lessons).values(
      readingCells.map(({ id: _id, ...cell }) => ({
        ...cell,
        area: "writing" as const,
        level: 6,
      })),
    );
    // 규격 행(level_specs)은 전 단계가 적재돼 있다 — 쓰기 6단계 행의 frame.minLessons 만 바꾸고 끝에 되돌린다
    const [writingSpec] = await db
      .select()
      .from(levelSpecs)
      .where(and(eq(levelSpecs.area, "writing"), eq(levelSpecs.level, 6)));
    if (!writingSpec) throw new Error("쓰기 6단계 규격 행 없음");
    const snapshot = round.settingsSnapshot as Record<string, number>;
    const assigned = readingCells.filter((c) => c.kind === "assigned").length;
    const snapshotMin = snapshot["unit.min_lessons"] ?? 0;
    const frameMin = Math.max(assigned, snapshotMin) + 2;
    const original = writingSpec.spec as Record<string, unknown>;
    await db
      .update(levelSpecs)
      .set({ spec: { ...original, frame: { minLessons: frameMin } } })
      .where(eq(levelSpecs.id, writingSpec.id));
    await db
      .update(profileTracks)
      .set({ level: 6, unit: 1 })
      .where(
        and(
          eq(profileTracks.profileId, profileId),
          eq(profileTracks.area, "writing"),
        ),
      );
    const { id: _roundId, ...roundRow } = round;
    await db.insert(unitProgress).values({
      ...roundRow,
      area: "writing",
      level: 6,
      unit: 1,
    });
    try {
      const list = await readLessonList({ db, area: "writing", now: NOW });
      if (list.kind !== "list") throw new Error("목록이어야 한다");
      expect(list.input.gate.remainingLessons).toBe(frameMin);
      expect(list.input.gate.remainingLessons).not.toBe(
        Math.max(assigned, snapshotMin),
      );
    } finally {
      await db
        .delete(lessons)
        .where(and(eq(lessons.area, "writing"), eq(lessons.level, 6)));
      await db
        .update(levelSpecs)
        .set({ spec: original })
        .where(eq(levelSpecs.id, writingSpec.id));
    }
  });
});

// 홈 자료(4절 홈 표 · AC-2a, plan-p10b 파일별 값 4) — 시험 DB 에 시험용 시드를 넣고 첫 실행 저장 뒤 본다.
// 단원 5칸 · 막대 둘(최근 성적 · 아는 단어 · 끝낸 대화)은 수업 목록 위 띠로 옮겼다(UI · UX 묶음 3 · [승인 UX2] — 그 단언은 lesson-list.test).
// 회화 카드의 오늘 이야기 제목은 수업 목록 '여기부터 해요' 회화 수업의 제목이다(4절 회화 카드 행).
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { learningDayOf } from "@/core/learning-day";
import { AVATARS, TOPIC_BUNDLES } from "@/core/profile/start";
import { profiles, sessions, unitProgress } from "@/db/schema/learning";
import { parentAlerts, parentAuth } from "@/db/schema/operations";
import type { Db } from "@/server/db";
import { readHome } from "@/server/home";
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
  it("AC-2a 홈 자료: 단계가 정해진 영역은 단계 · 오늘 · 이번 주이고(단원 5칸 · 막대는 홈에 없음), 배치 전 영역은 배치, 회화는 말하기 시작 단계 전이다", async () => {
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
    for (const gone of ["unitCells", "knownWords", "recent", "talks"])
      expect(reading).not.toHaveProperty(gone);
    expect(reading?.firstLesson).toBe(true);
    expect(reading?.today).toEqual({ done: false, newLessonDone: false });
    expect(writing).toMatchObject({ gate: "placement" });
    expect(speaking).toMatchObject({ gate: "placement" });
    expect(talk).toMatchObject({ gate: "needs_speaking" });
    // 첫 실행 저장이 만든 범위 끝 알림이 확인 전이라 부모 점이 켜진다
    expect(home?.parentDot).toBe(true);
    await db.update(parentAlerts).set({ acknowledgedAt: NOW });
    expect((await readHome({ db, now: NOW }))?.parentDot).toBe(false);
  });

  it("U2-1 홈 자료: 배치 평가 말고 끝낸 세션이 하나도 없는 영역은 firstLesson 이고, 끝낸 수업(정규 · 다시 하기 · 단계 평가 무엇이든)이 하나라도 있으면 아니다", async () => {
    const id = await profileId();
    const first = await readHome({ db, now: NOW });
    expect(first?.cards.map((c) => [c.area, c.firstLesson])).toEqual([
      ["reading", true],
      ["writing", true],
      ["speaking", true],
      ["talk", true],
    ]);
    const done = (
      area: "reading" | "writing" | "speaking",
      kind: "placement" | "retry",
    ) => ({
      profileId: id,
      area,
      level: 1,
      unit: 1,
      kind,
      status: "completed" as const,
      startedAt: SAVED_AT,
      completedAt: SAVED_AT,
      learningDay: LAST_SUNDAY,
    });
    await db
      .insert(sessions)
      .values([done("reading", "retry"), done("writing", "placement")]);
    // 진행 중 세션은 세지 않는다
    await db.insert(sessions).values({
      ...done("speaking", "retry"),
      status: "in_progress",
      completedAt: null,
      learningDay: null,
    });
    const after = await readHome({ db, now: NOW });
    expect(after?.cards.map((c) => [c.area, c.firstLesson])).toEqual([
      ["reading", false],
      ["writing", true],
      ["speaking", true],
      ["talk", true],
    ]);
  });

  it("U4-1 fix 1 홈 별 합 = 끝낸 새 수업(정규 · 보강 · 연습 · 안 해 본 수업, 쓰기 초고 · 다시 하기 · 배치 · 중단 · 진행 제외) 수 × reward.star_complete(3.5 R12 — P12 전 잠정)", async () => {
    const id = await profileId();
    const row = (over: Partial<typeof sessions.$inferInsert>) => ({
      profileId: id,
      area: "reading" as const,
      level: 1,
      unit: 1,
      kind: "regular" as const,
      status: "completed" as const,
      startedAt: SAVED_AT,
      completedAt: SAVED_AT,
      learningDay: LAST_SUNDAY,
      ...over,
    });
    await db.insert(sessions).values([
      row({}),
      row({ kind: "remedial" }),
      row({ area: "writing", writingPart: "draft" }),
      row({ area: "writing", writingPart: "rewrite" }),
      row({ area: "talk" }),
      row({ area: "talk", status: "aborted" }),
      row({ kind: "retry" }),
      row({ area: "speaking", kind: "placement" }),
      row({
        area: "speaking",
        status: "in_progress",
        completedAt: null,
        learningDay: null,
      }),
    ]);
    const home = await readHome({ db, now: NOW });
    expect(home?.starTotal).toBe(
      4 * TEST_SETTINGS["reward.star_complete"].value,
    );
  });

  it("AC-2a 홈 자료: 오늘 끝낸 새 수업으로 오늘 완료 · 이번 주는 월요일부터 서로 다른 학습일이다", async () => {
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
    const reading = (await readHome({ db, now: NOW }))?.cards[0];
    expect(reading?.today).toEqual({ done: true, newLessonDone: true });
    expect(reading?.thisWeek).toBe(2);
    expect(reading?.firstLesson).toBe(false);
  });

  it("AC-2a 홈 자료: 회화 카드의 오늘 이야기 제목은 수업 목록 '여기부터 해요' 회화 수업의 제목이고, 첫 사용 꼴 · 배치 전에는 없다", async () => {
    const id = await profileId();
    // 배치 전 회화(말하기 시작 단계 전)는 제목이 없다
    expect((await readHome({ db, now: NOW }))?.cards[3]).not.toHaveProperty(
      "storyTitle",
    );
    // 회화 1단계를 연 집(첫 실행 다시) — 끝낸 회화가 없으면 첫 사용 꼴이라 제목을 읽지 않는다
    await db.delete(profiles);
    await db.delete(parentAuth);
    const saved = await saveFirstRun(
      {
        pin: "246813",
        displayName: "모모",
        englishName: "Momo",
        avatar: AVATARS[0].id,
        topicBundle: TOPIC_BUNDLES[0].id,
        alphabetUnknown: false,
        startLevels: { talk: 1 },
        mic: { result: "not_checked" },
      },
      { db, now: () => SAVED_AT },
    );
    if (!saved.ok) throw new Error("첫 실행 저장 실패");
    const first = (await readHome({ db, now: NOW }))?.cards[3];
    expect(first).toMatchObject({ area: "talk", firstLesson: true });
    expect(first).not.toHaveProperty("storyTitle");
    // 오래전에 끝낸 회화가 있으면(회차 전이라 목록의 끝낸 수업에는 안 듦) 보통 꼴 — 제목은 목록의 '여기부터 해요' 수업 제목
    const talkId = await profileId();
    expect(talkId).not.toBe(id);
    await db.insert(sessions).values({
      profileId: talkId,
      area: "talk",
      level: 1,
      unit: 1,
      kind: "regular",
      status: "completed",
      startedAt: new Date(`${LAST_SUNDAY}T12:00:00+09:00`),
      completedAt: new Date(`${LAST_SUNDAY}T12:10:00+09:00`),
      learningDay: LAST_SUNDAY,
    });
    const list = await readLessonList({ db, area: "talk", now: NOW });
    if (list.kind !== "list") throw new Error("회화 목록이어야 한다");
    const here = list.view.hereStart;
    if (here?.kind !== "lesson") throw new Error("여기부터 해요 수업 없음");
    const title = list.input.lessonsByUnit[here.ref.unit]?.find(
      (c) => c.kind === here.ref.kind && c.lessonNo === here.ref.lessonNo,
    )?.title;
    expect(title).toBeTruthy();
    const talk = (await readHome({ db, now: NOW }))?.cards[3];
    expect(talk).toMatchObject({
      area: "talk",
      firstLesson: false,
      storyTitle: title,
    });
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

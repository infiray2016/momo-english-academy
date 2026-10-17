// 세션 시작 · 시도 저장 · 첫 활동 '홈' · 세션 화면 자료(5절 sessions · attempts · 전이 표 · 8절, plan-p10b 파일별 값 6 · 위험 4 · 5).
// 시험 DB 에 시험용 시드(완전성 1단계, 작은 틀)를 넣고 첫 실행(읽기 1단계를 고름) 뒤 본다. 설계 숫자는 설정 · 복사본에서 읽는다.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AVATARS, TOPIC_BUNDLES } from "@/core/profile/start";
import { lessons } from "@/db/schema/content";
import {
  attempts,
  profiles,
  profileTracks,
  sessions,
  unitProgress,
} from "@/db/schema/learning";
import {
  aiCalls,
  parentAlerts,
  parentAuth,
  settings,
} from "@/db/schema/operations";
import type { Db } from "@/server/db";
import { readLessonList } from "@/server/lesson-list";
import { readHouseholdProfile, saveFirstRun } from "@/server/profile";
import { loadSeed } from "@/server/seed/load";
import {
  leaveLessonSession,
  loadSessionView,
  saveSessionAttempts,
  startLessonSession,
} from "@/server/session";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import { createTestDatabase, type TestDatabase } from "./test-db";

const LOADED_AT = new Date("2026-10-17T10:00:00+09:00");
const SAVED_AT = new Date("2026-10-17T11:00:00+09:00");
const NOW = new Date("2026-10-17T20:00:00+09:00");
const LATER = new Date("2026-10-17T20:30:00+09:00");

let testDb: TestDatabase;
let db: Db;
const deps = (at = NOW) => ({ db, now: () => at });

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
  // 시험이 더한 수업 행(다른 판 · 변형 · 단계)을 지운다 — 시드 판은 revision 1 · correction 0 · 변형 1 · 1단계
  const extra = (
    await db.select().from(lessons).where(eq(lessons.area, "reading"))
  ).filter(
    (l) =>
      l.kind !== "tori_story" &&
      (l.revision !== 1 ||
        l.correction !== 0 ||
        l.topicVariant === 2 ||
        l.level !== 1),
  );
  for (const row of extra)
    await db.delete(lessons).where(eq(lessons.id, row.id));
  const saved = await saveFirstRun(
    {
      pin: "246813",
      displayName: "모모",
      englishName: "Momo",
      avatar: AVATARS[0].id,
      topicBundle: TOPIC_BUNDLES[1].id,
      alphabetUnknown: false,
      startLevels: { reading: 1 },
      mic: { result: "not_checked" },
    },
    { db, now: () => SAVED_AT },
  );
  if (!saved.ok) throw new Error("첫 실행 저장 실패");
});

async function profileId() {
  const profile = await readHouseholdProfile({ db });
  if (!profile) throw new Error("프로필 없음");
  return profile.id;
}

async function lessonRow(
  unit: number,
  kind: "assigned" | "reinforce",
  lessonNo: number,
) {
  const [row] = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "reading"),
        eq(lessons.level, 1),
        eq(lessons.unit, unit),
        eq(lessons.kind, kind),
        eq(lessons.lessonNo, lessonNo),
        eq(lessons.revision, 1),
        eq(lessons.correction, 0),
      ),
    );
  if (!row) throw new Error("수업 행 없음");
  return row;
}

/** 그 단원의 첫 다지기 칸(시험용 시드는 배정 · 다지기를 이어 1부터 센다 — 번호를 박지 않고 DB 에서 읽는다, 검토 I-2). */
async function firstReinforce(unit: number) {
  const rows = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "reading"),
        eq(lessons.level, 1),
        eq(lessons.unit, unit),
        eq(lessons.kind, "reinforce"),
        eq(lessons.revision, 1),
        eq(lessons.correction, 0),
      ),
    );
  const row = rows.sort((a, b) => a.lessonNo - b.lessonNo)[0];
  if (!row) throw new Error("다지기 칸 없음");
  return row;
}

async function start(lessonId: string, confirmAbort = false, at = NOW) {
  return startLessonSession({ lessonId, confirmAbort }, deps(at));
}

async function readingSessions() {
  return db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.profileId, await profileId()),
        eq(sessions.area, "reading"),
      ),
    );
}

/** 칸을 복사해 다른 판 · 변형 · 단계의 행을 더한다. */
async function copyLesson(
  row: typeof lessons.$inferSelect,
  over: Partial<typeof lessons.$inferInsert>,
) {
  const { id: _id, ...rest } = row;
  const [inserted] = await db
    .insert(lessons)
    .values({ ...rest, ...over })
    .returning();
  if (!inserted) throw new Error("복사 실패");
  return inserted;
}

describe("세션 시작", () => {
  it("AC-1b 세션을 여는 동안 AI 호출은 0회다(ai_calls 0행 · 세션 모듈이 AI 층을 가져오지 않음)", async () => {
    const before = (await db.select().from(aiCalls)).length;
    const opened = await start((await lessonRow(1, "assigned", 1)).id);
    expect(opened.ok).toBe(true);
    expect((await db.select().from(aiCalls)).length).toBe(before);
    for (const file of [
      "src/server/session/index.ts",
      "src/server/actions/session.ts",
      "src/core/session/preview.ts",
    ]) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/@\/server\/ai|@anthropic-ai\/sdk/);
    }
  });

  it("AC-2b 잠긴 다음 단원의 lesson_id 로 세션 시작 서버 액션을 직접 부르면 거부된다", async () => {
    const locked = await lessonRow(2, "assigned", 1);
    expect(await start(locked.id)).toEqual({
      ok: false,
      reason: "locked_unit",
    });
    expect(await readingSessions()).toHaveLength(0);
    expect(await start(randomUUID())).toEqual({ ok: false, reason: "unknown" });
    expect(await start("not-a-uuid")).toEqual({ ok: false, reason: "invalid" });
  });

  it("AC-2e 진행 중 세션이 있는 영역에서 다른 수업을 고르면 확인을 요구하고, 확인 뒤 이전 세션이 중단으로 닫히며 진행 중 세션은 하나만 남고 중단 세션은 완료 수에 들지 않는다", async () => {
    const before = await readLessonList({ db, area: "reading", now: NOW });
    if (before.kind !== "list") throw new Error();
    const first = await start((await lessonRow(1, "assigned", 1)).id);
    if (!first.ok) throw new Error("첫 세션이 열려야 한다");
    const other = (await lessonRow(1, "assigned", 2)).id;
    expect(await start(other, false, LATER)).toEqual({
      ok: false,
      reason: "needs_confirm",
    });
    const unchanged = await readingSessions();
    expect(unchanged).toHaveLength(1);
    expect(unchanged[0]?.status).toBe("in_progress");
    const second = await start(other, true, LATER);
    if (!second.ok) throw new Error("확인 뒤 새 세션이 열려야 한다");
    expect(second.sessionId).not.toBe(first.sessionId);
    const rows = await readingSessions();
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    expect(byId[first.sessionId]).toMatchObject({ status: "aborted" });
    expect(byId[first.sessionId]?.learningDay).not.toBeNull();
    expect(rows.filter((r) => r.status === "in_progress")).toHaveLength(1);
    const after = await readLessonList({ db, area: "reading", now: LATER });
    if (after.kind !== "list") throw new Error();
    expect(after.input.gate.remainingLessons).toBe(
      before.input.gate.remainingLessons,
    );
  });

  it("AC-2e 세션 첫 활동에서 '홈'을 누르면 그 세션 행이 남지 않는다", async () => {
    const opened = await start((await lessonRow(1, "assigned", 1)).id);
    if (!opened.ok) throw new Error();
    expect(
      await leaveLessonSession(
        { sessionId: opened.sessionId, onFirstActivity: true },
        deps(),
      ),
    ).toEqual({ ok: true, deleted: true });
    expect(await readingSessions()).toHaveLength(0);
    // 시도가 있으면(둘째 활동에서 누른 '홈'과 엇갈린 첫 시도) 지우지 않는다
    const again = await start((await lessonRow(1, "assigned", 1)).id);
    if (!again.ok) throw new Error();
    await saveSessionAttempts(
      [
        {
          clientAttemptId: randomUUID(),
          sessionId: again.sessionId,
          activityNo: 1,
          input: { shownWords: [] },
        },
      ],
      deps(),
    );
    expect(
      await leaveLessonSession(
        { sessionId: again.sessionId, onFirstActivity: true },
        deps(),
      ),
    ).toEqual({ ok: true, deleted: false });
    expect(
      await leaveLessonSession(
        { sessionId: again.sessionId, onFirstActivity: false },
        deps(),
      ),
    ).toEqual({ ok: true, deleted: false });
    expect(await readingSessions()).toHaveLength(1);
  });

  it("세션 틀: 같은 client_attempt_id 는 한 번만 저장된다", async () => {
    const opened = await start((await lessonRow(1, "assigned", 1)).id);
    if (!opened.ok) throw new Error();
    const one = {
      clientAttemptId: randomUUID(),
      sessionId: opened.sessionId,
      activityNo: 1,
      input: { shownWords: ["a"] },
    };
    const first = await saveSessionAttempts([one], deps());
    const second = await saveSessionAttempts([one], deps());
    expect(first).toEqual({ ok: true, accepted: [one.clientAttemptId] });
    expect(second).toEqual({ ok: true, accepted: [one.clientAttemptId] });
    expect(
      await db
        .select()
        .from(attempts)
        .where(eq(attempts.sessionId, opened.sessionId)),
    ).toHaveLength(1);
    // 남의(없는) 세션 · 끝난 세션의 늦은 시도는 받은 것으로 치고 넣지 않는다
    const stray = {
      ...one,
      clientAttemptId: randomUUID(),
      sessionId: randomUUID(),
    };
    expect(await saveSessionAttempts([stray], deps())).toEqual({
      ok: true,
      accepted: [stray.clientAttemptId],
    });
    expect(
      await db
        .select()
        .from(attempts)
        .where(eq(attempts.clientAttemptId, stray.clientAttemptId)),
    ).toHaveLength(0);
    expect(await saveSessionAttempts([{ nope: 1 }], deps())).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("세션 틀: 다시 열면 저장한 시도 다음 활동부터 이어진다", async () => {
    const opened = await start((await lessonRow(1, "assigned", 1)).id);
    if (!opened.ok) throw new Error();
    const fresh = await loadSessionView(
      { sessionId: opened.sessionId },
      deps(),
    );
    expect(fresh).toMatchObject({
      current: 1,
      area: "reading",
      level: 1,
      unit: 1,
    });
    expect(fresh?.activities[0]).toEqual({ kind: "preview" });
    expect(fresh?.preview.length).toBeGreaterThan(0);
    await saveSessionAttempts(
      [
        {
          clientAttemptId: randomUUID(),
          sessionId: opened.sessionId,
          activityNo: 1,
          input: { shownWords: fresh?.preview.map((w) => w.word) },
        },
      ],
      deps(),
    );
    const reopened = await loadSessionView(
      { sessionId: opened.sessionId },
      deps(),
    );
    expect(reopened?.current).toBe(2);
    // 그 프로필의 진행 세션이 아니면 없음
    expect(
      await loadSessionView({ sessionId: randomUUID() }, deps()),
    ).toBeUndefined();
    // 미리보기에서 보인 단어는 같은 영역의 다음 세션에서 '만난 단어'다(정할 것 ㄹ)
    await start((await lessonRow(1, "assigned", 1)).id); // 같은 칸 — 이어 하기
    const nextLesson = await start((await firstReinforce(1)).id, true);
    if (!nextLesson.ok) throw new Error();
    const view = await loadSessionView(
      { sessionId: nextLesson.sessionId },
      deps(),
    );
    const shown = new Set(fresh?.preview.map((w) => w.word));
    for (const w of view?.preview ?? []) {
      if (w.added) expect(shown.has(w.word)).toBe(false);
    }
  });

  it("세션 틀: 두 번째 기기에서 같은 영역을 열면 진행 중 세션을 이어 하고 새 세션을 만들지 않는다", async () => {
    const id = (await lessonRow(1, "assigned", 1)).id;
    const [a, b] = await Promise.all([start(id), start(id)]);
    if (!a.ok || !b.ok) throw new Error("둘 다 열려야 한다");
    expect(a.sessionId).toBe(b.sessionId);
    const again = await start(id, false, LATER);
    expect(again).toEqual({ ok: true, sessionId: a.sessionId });
    expect(await readingSessions()).toHaveLength(1);
  });

  it("세션 틀: 판은 그 단원 회차의 시작 개정으로 고르고 다시 하기는 처음 쓴 개정의 가장 높은 정정과 처음 변형으로 연다", async () => {
    const pid = await profileId();
    const [round] = await db
      .select()
      .from(unitProgress)
      .where(
        and(eq(unitProgress.profileId, pid), eq(unitProgress.area, "reading")),
      );
    if (!round) throw new Error();
    const base = await lessonRow(1, "assigned", 1);
    // 회차 시작 개정보다 높은 판(아직 이 단원에 닿지 않음)과 프로필 묶음 변형(2)
    await copyLesson(base, {
      revision: round.startRevision + 1,
      correction: 0,
    });
    const variant2 = await copyLesson(base, { topicVariant: 2 });
    const opened = await start(base.id);
    if (!opened.ok) throw new Error();
    const [s1] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, opened.sessionId));
    // 프로필 묶음(2)의 변형 · 회차 시작 개정의 판
    expect(s1).toMatchObject({
      lessonId: variant2.id,
      seedRevision: round.startRevision,
      seedCorrection: 0,
      kind: "regular",
    });
    // 끝낸 것으로 두고(처음 변형 2) 같은 개정의 정정 판(변형 1 · 2)과 더 높은 판을 더한다
    await db
      .update(sessions)
      .set({ status: "completed", completedAt: NOW, learningDay: "2026-10-17" })
      .where(eq(sessions.id, opened.sessionId));
    const corrected2 = await copyLesson(base, {
      topicVariant: 2,
      correction: 1,
    });
    await copyLesson(base, { correction: 1 });
    // 프로필 묶음을 1 로 바꿔도 다시 하기는 처음 변형(2)으로 연다
    await db
      .update(profiles)
      .set({ topicBundle: TOPIC_BUNDLES[0].id })
      .where(eq(profiles.id, pid));
    const retry = await start(base.id, false, LATER);
    if (!retry.ok) throw new Error();
    const [s2] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, retry.sessionId));
    expect(s2).toMatchObject({
      kind: "retry",
      lessonId: corrected2.id,
      seedRevision: round.startRevision,
      seedCorrection: 1,
    });
  });

  it("세션 틀: seed.complete_through_level 보다 높은 단계와 다른 단계의 수업은 열지 않는다", async () => {
    const base = await lessonRow(1, "assigned", 1);
    const level2 = await copyLesson(base, { level: 2 });
    expect(await start(level2.id)).toEqual({
      ok: false,
      reason: "beyond_seed",
    });
    const where = eq(settings.key, "seed.complete_through_level");
    const [before] = await db.select().from(settings).where(where);
    await db.update(settings).set({ value: 2 }).where(where);
    try {
      expect(await start(level2.id)).toEqual({
        ok: false,
        reason: "other_level",
      });
    } finally {
      await db.update(settings).set({ value: before?.value }).where(where);
    }
    // 배치 전 영역의 수업도 열지 않는다
    const [writing] = await db
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.area, "writing"),
          eq(lessons.level, 1),
          eq(lessons.unit, 1),
        ),
      );
    if (!writing) throw new Error();
    expect(await start(writing.id)).toEqual({
      ok: false,
      reason: "not_placed",
    });
    expect(
      await db
        .select()
        .from(profileTracks)
        .where(eq(profileTracks.area, "writing")),
    ).toHaveLength(1);
  });
});

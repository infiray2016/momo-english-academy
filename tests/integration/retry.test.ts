// 다시 하기(3.2 지난 수업 다시 하기 · 3.7 '다시 하기' 행 · AC-2c 읽기 몫, plan-p11a 증명 표). c 가 말하기 몫을 더한다.
// 시험용 시드(1단계, 작은 틀)에서 읽기 단원 1 의 배정 수업 1 을 끝낸 뒤 단원 1 을 통과한 것으로 두고(단원 2 회차) 같은 수업을 다시 한다.
import { randomUUID } from "node:crypto";
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
import { parentAlerts, parentAuth } from "@/db/schema/operations";
import type { Db } from "@/server/db";
import { readLessonList } from "@/server/lesson-list";
import { readHouseholdProfile, saveFirstRun } from "@/server/profile";
import { loadSeed } from "@/server/seed/load";
import {
  finishLessonSession,
  loadSessionView,
  type SessionView,
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
const FIRST = new Date("2026-10-17T20:00:00+09:00");
const RETRY = new Date("2026-10-18T20:00:00+09:00");

let testDb: TestDatabase;
let db: Db;
const deps = (at: Date) => ({ db, now: () => at, homophones: () => [] });

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

/** 읽기 세션을 끝 시도로 다 채우고 끝낸다. 첫 문항만 처음에 틀린다. 세션 화면 자료를 돌려준다. */
async function doReading(lessonId: string, at: Date): Promise<SessionView> {
  const started = await startLessonSession(
    { lessonId, confirmAbort: false },
    deps(at),
  );
  if (!started.ok) throw new Error(`세션이 열려야 한다: ${started.reason}`);
  const view = await loadSessionView(
    { sessionId: started.sessionId },
    deps(at),
  );
  if (view?.area !== "reading") throw new Error("읽기 화면 자료 없음");
  const batch = view.activities.map((activity, i) => {
    const input =
      activity.kind === "preview"
        ? { shownWords: [] }
        : activity.kind === "reading-passage"
          ? { v: 1, kind: "reading-passage", step: "final", tappedWords: [] }
          : (() => {
              if (activity.kind !== "reading-question") throw new Error();
              const q = view.lesson.content.questions[activity.index];
              if (!q) throw new Error();
              const wrong = q.answerNo === 1 ? 2 : 1;
              return {
                v: 1,
                kind: "reading-question",
                step: "final",
                tries:
                  activity.index === 0 ? [wrong, q.answerNo] : [q.answerNo],
              };
            })();
    return {
      clientAttemptId: randomUUID(),
      sessionId: view.sessionId,
      activityNo: i + 1,
      input,
    };
  });
  expect(await saveSessionAttempts(batch, deps(at))).toMatchObject({
    ok: true,
    rejected: [],
  });
  expect(
    await finishLessonSession({ sessionId: view.sessionId }, deps(at)),
  ).toEqual({ ok: true, already: false });
  return view;
}

async function passUnitOne(profileId: string) {
  const [round] = await db
    .select()
    .from(unitProgress)
    .where(
      and(
        eq(unitProgress.profileId, profileId),
        eq(unitProgress.area, "reading"),
        eq(unitProgress.unit, 1),
      ),
    );
  if (!round) throw new Error("단원 회차 없음");
  await db
    .update(unitProgress)
    .set({ passedAt: FIRST })
    .where(eq(unitProgress.id, round.id));
  await db.insert(unitProgress).values({
    ...round,
    id: undefined,
    unit: 2,
    passedAt: null,
    startedAt: FIRST,
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
}

describe("다시 하기", () => {
  it("AC-2c 지난 단원의 읽기 수업을 다시 하기로 끝내면 세션 점수가 sessions 에 남고 단어별 정오가 attempts 에 남으며 정규 수업 수(잠긴 단원 줄의 수)는 그대로다", async () => {
    const profile = await readHouseholdProfile({ db });
    if (!profile) throw new Error("프로필 없음");
    const [cell] = await db
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.area, "reading"),
          eq(lessons.level, 1),
          eq(lessons.unit, 1),
          eq(lessons.kind, "assigned"),
          eq(lessons.lessonNo, 1),
          eq(lessons.topicVariant, 1),
        ),
      );
    if (!cell) throw new Error("수업 행 없음");
    await doReading(cell.id, FIRST);
    await passUnitOne(profile.id);

    const before = await readLessonList({ db, area: "reading", now: RETRY });
    if (before.kind !== "list") throw new Error("목록이어야 한다");
    const view = await doReading(cell.id, RETRY);
    const [retry] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, view.sessionId));
    expect(retry?.kind).toBe("retry");
    expect(retry?.status).toBe("completed");
    // 세션 점수는 남는다(최근 성적에서 빼는 일은 P12, 3.7 '다시 하기' 행)
    if (view.area !== "reading") throw new Error();
    const questions = view.lesson.content.questions.length;
    expect(retry?.score).toBe((questions - 1) / questions);
    // 단어별 정오가 attempts 에 남는다(앱이 정답을 아는 그림 문항의 단원 단어)
    const rows = await db
      .select()
      .from(attempts)
      .where(eq(attempts.sessionId, view.sessionId));
    const results = rows.flatMap(
      (r) =>
        (r.wordResults as { word: string; correct: boolean }[] | null) ?? [],
    );
    const expected = view.lesson.content.questions.flatMap((q, index) => {
      const word = q.kind === "picture" ? q.options[q.answerNo - 1] : undefined;
      return word && view.lesson.unitWords.includes(word)
        ? [{ word, correct: index !== 0 }]
        : [];
    });
    expect(expected.length).toBeGreaterThan(0);
    expect(results).toEqual(expect.arrayContaining(expected));
    expect(results).toHaveLength(expected.length);
    // 지금 단원(2)의 남은 정규 수업 수 · 잠긴 단원 줄은 그대로
    const after = await readLessonList({ db, area: "reading", now: RETRY });
    if (after.kind !== "list") throw new Error("목록이어야 한다");
    expect(after.input.gate.remainingLessons).toBe(
      before.input.gate.remainingLessons,
    );
    expect(after.view.lockedNext).toEqual(before.view.lockedNext);
  });
});

// 시드 판 고르기 읽기(plan-p07a 파일별 값 4, 5절 시드 판 · R5, AC-17a 적재와 읽기 · 5절 시드 최신 개정).
// 판 3.0 · 4.0 같은 값은 시험이 차례로 적재해 만든다(1.0 → 2.0 → 3.0 → 4.0 → 정정 → 5.0).
// 작은 틀(정규 수업 3 · 보강 1)에는 수업 번호 4 · 5 가 없어, AC 의 '수업 4' 는 단원 1 의 다지기 수업 3,
// '수업 5' 는 단원 1 의 보강 수업 1 로 둔다(같은 단원의 서로 다른 칸 둘이면 된다).
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cellKey } from "@/core/seed/structure";
import type { SeedVersion } from "@/core/seed/version-pick";
import { lessons } from "@/db/schema/content";
import { sessions } from "@/db/schema/learning";
import { loadSeed } from "@/server/seed/load";
import {
  currentSeedRevision,
  readLessonsOfUnit,
  readLevelSpec,
  readLevelTestForm,
  readPlacementForm,
  readUnitSpec,
} from "@/server/seed/read";
import type { SeedTree } from "../fixtures/seed/builders";
import {
  filesOf,
  insertProfileSession,
  loadableSeed,
  withCellVersion,
  withLevelSpecVersion,
  withUnitSpecVersion,
} from "../fixtures/seed/loadable";
import { createTestDatabase, type TestDatabase } from "./test-db";

const NOW = new Date("2026-10-17T03:00:00.000Z");
const AREA = "reading" as const;
const LEVEL = 1;

const lessonCell = (
  unit: number,
  kind: "assigned" | "reinforce" | "remedial",
  lessonNo: number,
) =>
  cellKey({
    type: "lesson",
    area: AREA,
    level: LEVEL,
    unit,
    kind,
    lessonNo,
    variant: 1,
  });
/** AC 의 '단원 1 수업 4'. */
const UNIT1_LESSON4 = lessonCell(1, "reinforce", 3);
/** AC 의 '단원 1 수업 5'. */
const UNIT1_LESSON5 = lessonCell(1, "remedial", 1);
const UNIT2_LESSON = lessonCell(2, "reinforce", 3);
const PLACEMENT = cellKey({
  type: "placement",
  area: AREA,
  level: LEVEL,
  form: 1,
  no: 1,
  spare: false,
});
const TEST_ITEM = cellKey({
  type: "level-test",
  area: AREA,
  level: LEVEL,
  form: 1,
  no: 1,
});

let testDb: TestDatabase;
beforeEach(async () => {
  testDb = await createTestDatabase();
});
afterEach(async () => {
  await testDb.drop();
});

const v = (revision: number, correction = 0): SeedVersion => ({
  revision,
  correction,
});
const tag = (version: SeedVersion) =>
  `판 ${version.revision}.${version.correction}`;

/**
 * 칸 하나의 판을 바꾸고 내용을 고친다: 수업은 목록 제목 끝에 판을, 단계 평가 문항은 해설에 판을 붙인다.
 * 배치 문항은 한국어 칸이 없어(영어 글은 범위 검사가 본다) 판만 올린다.
 */
function bump(tree: SeedTree, key: string, version: SeedVersion): SeedTree {
  return withCellVersion(tree, key, version, (cell) => {
    if (typeof cell.title === "string")
      cell.title = `${cell.title} ${tag(version)}`;
    else if ("unit" in cell) cell.explanationKo = `해설 ${tag(version)}`;
  });
}

async function load(tree: SeedTree): Promise<void> {
  const report = await loadSeed(testDb.db, { files: filesOf(tree), now: NOW });
  expect(report.violations).toEqual([]);
  expect(report.outcome).toBe("loaded");
}

const current = () => currentSeedRevision({ db: testDb.db });

async function lessonOf(unit: number, key: string, startRevision: number) {
  const rows = await readLessonsOfUnit(
    { area: AREA, level: LEVEL, unit, startRevision },
    { db: testDb.db },
  );
  const row = rows.find(
    (r) =>
      lessonCell(
        unit,
        r.kind as "assigned" | "reinforce" | "remedial",
        r.lessonNo,
      ) === key,
  );
  if (!row) throw new Error(`읽은 수업에 없는 칸: ${key}`);
  return { row, rows };
}
/** 회화 단계 규격 행의 목표 턴 수(행이 없거나 회화 규격이 아니면 던진다). */
function targetTurnsOf(row: { spec: unknown } | undefined): number {
  const turns = (row?.spec as { targetTurns?: unknown } | undefined)
    ?.targetTurns;
  if (typeof turns !== "number") throw new Error("회화 단계 규격 행이 없다");
  return turns;
}
const versionOf = (row: SeedVersion) => `${row.revision}.${row.correction}`;

describe("판 고르기 읽기(AC-17a)", () => {
  it("AC-17a 개정 3.0 에서 시작한 단원 1 의 수업 4 는 개정 4.0 적재 뒤에도 3.0 으로, 그 뒤 시작한 단원 2 는 4.0 으로 열린다", async () => {
    const base = loadableSeed();
    await load(base);
    await load(bump(base, UNIT1_LESSON4, v(2)));
    const third = bump(base, UNIT1_LESSON4, v(3));
    await load(third);
    const unit1Start = await current();
    expect(unit1Start).toBe(3);
    await load(bump(bump(third, UNIT1_LESSON4, v(4)), UNIT2_LESSON, v(4)));
    const unit2Start = await current();
    expect(unit2Start).toBe(4);
    const unit1 = await lessonOf(1, UNIT1_LESSON4, unit1Start);
    expect(versionOf(unit1.row)).toBe("3.0");
    expect(unit1.row.listTitle).toContain(tag(v(3)));
    expect(unit1.row.listTitle).not.toContain(tag(v(4)));
    const unit2 = await lessonOf(2, UNIT2_LESSON, unit2Start);
    expect(versionOf(unit2.row)).toBe("4.0");
    // 단원 수업 목록은 칸마다 하나이고 종류 · 번호 차례다
    expect(unit1.rows.map((r) => `${r.kind}:${r.lessonNo}`)).toEqual([
      "assigned:1",
      "assigned:2",
      "reinforce:3",
      "remedial:1",
    ]);
  });

  it("AC-17a 정정 3.1 을 적재하면 진행 중인 단원 1 의 수업 5 와 그 다시 하기가 3.1 로 열린다", async () => {
    const base = loadableSeed();
    await load(base);
    const third = bump(base, UNIT1_LESSON5, v(3));
    await load(third);
    const start = await current();
    const before = await lessonOf(1, UNIT1_LESSON5, start);
    expect(versionOf(before.row)).toBe("3.0");
    const { profileId, sessionId } = await insertProfileSession(testDb.db, {
      lessonId: before.row.id,
      at: NOW,
    });
    // 정정 전에 3.0 으로 끝낸 세션 하나(다시 하기의 바탕)
    const [done] = await testDb.db
      .insert(sessions)
      .values({
        profileId,
        area: AREA,
        level: LEVEL,
        unit: 1,
        lessonId: before.row.id,
        kind: "regular",
        status: "completed",
        startedAt: NOW,
        completedAt: NOW,
        learningDay: NOW.toISOString().slice(0, 10),
        seedRevision: before.row.revision,
        seedCorrection: before.row.correction,
      })
      .returning({ id: sessions.id });
    await load(bump(third, UNIT1_LESSON5, v(3, 1)));
    expect(await current()).toBe(start);
    const opened = await lessonOf(1, UNIT1_LESSON5, start);
    expect(versionOf(opened.row)).toBe("3.1");
    // 끝낸 세션은 3.0 행을 그대로 가리키고, 그 수업의 다시 하기는 같은 시작 개정으로 새로 읽어 3.1 을 연다
    const sessionOf = async (id: string | undefined) => {
      const [row] = await testDb.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, id ?? ""));
      return row;
    };
    expect((await sessionOf(done?.id))?.lessonId).toBe(before.row.id);
    const retry = await lessonOf(1, UNIT1_LESSON5, start);
    expect(retry.row.id).not.toBe(before.row.id);
    expect(versionOf(retry.row)).toBe("3.1");
    // 이미 연 세션은 시작할 때 고른 행을 끝까지 쓴다
    expect((await sessionOf(sessionId))?.lessonId).toBe(before.row.id);
  });

  it("AC-17a 개정 4.0 뒤 2.0 행에 2.1 정정을 적재하면 2.0 을 읽던 단원은 2.1, 4.0 을 읽던 단원은 4.0 이다", async () => {
    const base = loadableSeed();
    await load(base);
    await load(bump(base, UNIT1_LESSON4, v(2)));
    const atTwo = await current();
    await load(bump(base, UNIT1_LESSON4, v(4)));
    const atFour = await current();
    expect([atTwo, atFour]).toEqual([2, 4]);
    await load(bump(base, UNIT1_LESSON4, v(2, 1)));
    expect(await current()).toBe(atFour);
    expect(versionOf((await lessonOf(1, UNIT1_LESSON4, atTwo)).row)).toBe(
      "2.1",
    );
    expect(versionOf((await lessonOf(1, UNIT1_LESSON4, atTwo + 1)).row)).toBe(
      "2.1",
    );
    expect(versionOf((await lessonOf(1, UNIT1_LESSON4, atFour)).row)).toBe(
      "4.0",
    );
  });

  it("AC-17a 멈춘 배치 평가는 그 사이 적재된 새 개정 문항을 읽지 않는다", async () => {
    const base = loadableSeed();
    await load(base);
    const paused = await current();
    await load(bump(base, PLACEMENT, v(2)));
    const later = await current();
    expect(later).toBeGreaterThan(paused);
    const read = async (startRevision: number) => {
      const rows = await readPlacementForm(
        { area: AREA, form: 1, startRevision },
        { db: testDb.db },
      );
      const row = rows.find(
        (r) => r.level === LEVEL && !r.isSpare && r.itemNo === 1,
      );
      if (!row) throw new Error("배치 문항이 없다");
      return { row, rows };
    };
    const old = await read(paused);
    const fresh = await read(later);
    expect(versionOf(old.row)).toBe("1.0");
    expect(versionOf(fresh.row)).toBe("2.0");
    expect(old.rows).toHaveLength(fresh.rows.length);
  });

  it("AC-17a 판을 적재한 뒤에도 이전 판 행과 sessions.lesson_id 는 그대로 남는다", async () => {
    const base = loadableSeed();
    await load(base);
    const first = await lessonOf(1, UNIT1_LESSON4, await current());
    const { sessionId } = await insertProfileSession(testDb.db, {
      lessonId: first.row.id,
      at: NOW,
    });
    await load(bump(base, UNIT1_LESSON4, v(2)));
    const [kept] = await testDb.db
      .select()
      .from(lessons)
      .where(eq(lessons.id, first.row.id));
    expect(kept).toEqual(first.row);
    const [session] = await testDb.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    expect(session?.lessonId).toBe(first.row.id);
    const all = await testDb.db.select().from(lessons);
    expect(
      all
        .filter(
          (r) =>
            r.unit === 1 &&
            r.area === AREA &&
            r.kind === "reinforce" &&
            r.lessonNo === 3,
        )
        .map(versionOf)
        .sort(),
    ).toEqual(["1.0", "2.0"]);
  });

  it("AC-17a 개정 3 에서 시작한 단원은 개정 4 · 5 의 칸을 열지 않고 회화 단계 규격의 목표 턴 수도 개정 3 의 값을 읽는다", async () => {
    const base = loadableSeed();
    await load(base);
    const third = bump(base, UNIT1_LESSON4, v(3));
    await load(third);
    const start = await current();
    const fourth = withUnitSpecVersion(
      bump(third, UNIT1_LESSON4, v(4)),
      AREA,
      LEVEL,
      1,
      v(4),
      (spec) => {
        spec.topic = `${spec.topic} ${tag(v(4))}`;
      },
    );
    await load(fourth);
    // 회화 단계 규격은 시험용 시드에 카드가 없는 5단계 행을 바꿔 검증이 막지 않게 한다
    const TALK_LEVEL = 5;
    const before = await readLevelSpec(
      { area: "talk", level: TALK_LEVEL, startRevision: start },
      { db: testDb.db },
    );
    const targetTurns = targetTurnsOf(before);
    const fifth = withLevelSpecVersion(
      bump(fourth, UNIT1_LESSON5, v(5)),
      "talk",
      TALK_LEVEL,
      v(5),
      (spec) => {
        if (spec.area === "talk") spec.targetTurns = targetTurns + 1;
      },
    );
    await load(fifth);
    expect(await current()).toBe(5);
    const unit1 = await readLessonsOfUnit(
      { area: AREA, level: LEVEL, unit: 1, startRevision: start },
      { db: testDb.db },
    );
    expect(unit1.every((r) => r.revision <= start)).toBe(true);
    expect(versionOf((await lessonOf(1, UNIT1_LESSON4, start)).row)).toBe(
      "3.0",
    );
    expect(versionOf((await lessonOf(1, UNIT1_LESSON5, start)).row)).toBe(
      "1.0",
    );
    const unitSpec = await readUnitSpec(
      { area: AREA, level: LEVEL, unit: 1, startRevision: start },
      { db: testDb.db },
    );
    expect(unitSpec && versionOf(unitSpec)).toBe("1.0");
    const talk = await readLevelSpec(
      { area: "talk", level: TALK_LEVEL, startRevision: start },
      { db: testDb.db },
    );
    expect(targetTurnsOf(talk)).toBe(targetTurns);
    const latest = await readLevelSpec(
      { area: "talk", level: TALK_LEVEL, startRevision: 5 },
      { db: testDb.db },
    );
    expect(targetTurnsOf(latest)).toBe(targetTurns + 1);
    expect(latest && versionOf(latest)).toBe("5.0");
  });
});

describe("시드 최신 개정(5절)", () => {
  it("5절 시드 최신 개정: 적재 뒤 currentSeedRevision 은 시드 테이블 다섯의 가장 큰 개정이다", async () => {
    expect(await current()).toBe(0);
    let tree = loadableSeed();
    await load(tree);
    expect(await current()).toBe(1);
    tree = withLevelSpecVersion(tree, "talk", 5, v(2));
    await load(tree);
    expect(await current()).toBe(2);
    tree = withUnitSpecVersion(tree, AREA, LEVEL, 2, v(3));
    await load(tree);
    expect(await current()).toBe(3);
    tree = bump(tree, UNIT2_LESSON, v(4));
    await load(tree);
    expect(await current()).toBe(4);
    tree = bump(tree, TEST_ITEM, v(5));
    await load(tree);
    expect(await current()).toBe(5);
    tree = bump(tree, PLACEMENT, v(6));
    await load(tree);
    expect(await current()).toBe(6);
    const form = await readLevelTestForm(
      { area: AREA, level: LEVEL, form: 1, startRevision: 4 },
      { db: testDb.db },
    );
    expect(form.map((r) => r.itemNo)).toEqual(
      [...form.map((r) => r.itemNo)].sort((a, b) => a - b),
    );
    expect(versionOf(form.find((r) => r.itemNo === 1) ?? v(0))).toBe("1.0");
    const later = await readLevelTestForm(
      { area: AREA, level: LEVEL, form: 1, startRevision: 5 },
      { db: testDb.db },
    );
    expect(versionOf(later.find((r) => r.itemNo === 1) ?? v(0))).toBe("5.0");
  });
});

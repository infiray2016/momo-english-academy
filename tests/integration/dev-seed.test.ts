// 개발용 시험 시드 나무 적재(검토 review-p10-1 M-5): devSeedTree 를 실제 loadSeed 로 넣으면 받아들여지고
// 테이블별 행 수가 나무에서 센 수와 같다. 기대 수는 나무에서 세어 숫자를 박지 않는다.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  lessons,
  levelSpecs,
  levelTestItems,
  placementItems,
  unitSpecs,
  vocab,
} from "@/db/schema/content";
import { settings } from "@/db/schema/operations";
import type { LoadReport } from "@/server/seed/load";
import { loadSeed } from "@/server/seed/load";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import { createTestDatabase, type TestDatabase } from "./test-db";

const NOW = new Date("2026-10-17T10:00:00+09:00");
let testDb: TestDatabase;
let report: LoadReport;
const tree = devSeedTree();
const areas: readonly string[] = DEV_SEED_AREAS;

beforeAll(async () => {
  testDb = await createTestDatabase();
  report = await loadSeed(testDb.db, {
    files: filesOf(tree),
    completeThrough: DEV_SEED_THROUGH,
    areas: [...DEV_SEED_AREAS],
    now: NOW,
  });
});
afterAll(async () => {
  await testDb.drop();
});

describe("개발용 시드 나무 적재", () => {
  it("개발용 시드 나무: loadSeed 로 넣으면 loaded 이고 테이블별 행 수가 나무에서 센 수와 같다", async () => {
    expect(report.outcome).toBe("loaded");
    expect(report.violations).toEqual([]);
    const db = testDb.db;
    const expected = {
      lessons: tree.lessons
        .filter((f) => areas.includes(f.area))
        .reduce((n, f) => n + f.lessons.length, 0),
      placementItems: tree.placements
        .filter((f) => areas.includes(f.area))
        .reduce(
          (n, f) =>
            n +
            f.levels.reduce((m, l) => m + l.items.length + l.spares.length, 0),
          0,
        ),
      levelTestItems: tree.levelTests
        .filter((f) => areas.includes(f.area))
        .reduce(
          (n, f) =>
            n +
            f.forms.reduce(
              (m, form) => m + ("items" in form ? form.items.length : 0),
              0,
            ),
          0,
        ),
      levelSpecs: tree.reference.levelSpecs.levelSpecs.length,
      unitSpecs: tree.reference.unitSpecs.unitSpecs.length,
      vocab: tree.reference.vocab.vocab.length,
      settings: tree.reference.settings.settings.length,
    };
    // 빈 길이 아님(나무에 실제 칸이 있다)
    for (const [name, n] of Object.entries(expected)) {
      expect(n, name).toBeGreaterThan(0);
    }
    expect({
      lessons: await db.$count(lessons),
      placementItems: await db.$count(placementItems),
      levelTestItems: await db.$count(levelTestItems),
      levelSpecs: await db.$count(levelSpecs),
      unitSpecs: await db.$count(unitSpecs),
      vocab: await db.$count(vocab),
      settings: await db.$count(settings),
    }).toEqual(expected);
  });
});

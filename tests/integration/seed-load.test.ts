// 시드 적재(plan-p07a 파일별 값 3 · 5 · 6, 5절 적재 · 설정값 시드 · 11절 (4-1) · C68, AC-17b · AC-7e · AC-7g · AC-8i 적재 몫).
// 시험용 Postgres(embedded-postgres)만 쓴다. 설계 숫자는 시험용 자료(loadableSettings · TEST_SETTINGS · MODEL_PRICES_FIXTURE)에서 읽는다.

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { and, count, DrizzleQueryError, eq, isNull } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { priceBookOf, priceRowsOfSeed } from "@/core/ai/cost";
import { learningDayOf } from "@/core/learning-day";
import { SEED_LOAD_SOURCE } from "@/core/seed/settings-compare";
import { cellKey, type PlacementArea, SEED_FILES } from "@/core/seed/structure";
import { exitCodeOf, validateSeed } from "@/core/seed/validate";
import type { SeedTable } from "@/core/seed/version-pick";
import {
  images,
  lessons,
  levelSpecs,
  levelTestItems,
  modelPrices,
  placementItems,
  unitSpecs,
  vocab,
} from "@/db/schema/content";
import {
  levelTests,
  profiles,
  sessions,
  unitProgress,
} from "@/db/schema/learning";
import { seedReports, settings, settingsHistory } from "@/db/schema/operations";
import { loadPriceBook } from "@/server/ai/store";
import type { Db } from "@/server/db";
import {
  answerOf,
  buildIncoming,
  type LoadOptions,
  type LoadReport,
  loadSeed,
  SeedLoadInvariantError,
} from "@/server/seed/load";
import { currentSeedRevision } from "@/server/seed/read";
import {
  type DbHandle,
  parseArgs,
  runSeedLoad,
  SETTING_KEY_LINES,
} from "../../scripts/seed-load";
import { readSeedTree } from "../../scripts/seed-validate";
import { MODEL_PRICES_FIXTURE } from "../fixtures/ai/model-prices";
import type { SeedTree } from "../fixtures/seed/builders";
import {
  defaultSettings,
  settingNumber,
  writeSeedTree,
} from "../fixtures/seed/builders";
import {
  cellValueOf,
  filesOf,
  insertProfileSession,
  LOADABLE_THROUGH,
  loadableSeed,
  loadableSettings,
  withCellVersion,
  withSetting,
} from "../fixtures/seed/loadable";
import { TEST_SETTINGS } from "../fixtures/settings";
import { createTestDatabase, type TestDatabase } from "./test-db";

/** 시험의 한 시계(고정 값). */
const NOW = new Date("2026-10-17T03:00:00.000Z");
const THROUGH = "seed.complete_through_level";
/** 12절 기본값(설정값 시드의 seed.complete_through_level). */
const THROUGH_DEFAULT = settingNumber(defaultSettings(), THROUGH);

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const TMP_ROOT = join(REPO_ROOT, "tests/.tmp");
const SCRIPT = join(REPO_ROOT, "scripts/seed-load.ts");
const SPAWN_TIMEOUT_MS = 60_000;
/** 실기 출력 머리(보고에 옮기려고 찾는다). */
const PROBE = "[seed-load 실기]";
const TMP_NAME_BYTES = 6;
/** 배치 정답 칸 이름(plan-p07a 값 3 answerOf). */
const ANSWER_FIELDS = ["answerNo", "accepted", "sentence"] as const;
/** 가짜 DB 오류에 넣는 표지 글(출력에 새면 안 된다). */
const CONTENT_MARKER = "CELL-CONTENT-MARKER";

const LESSON = cellKey({
  type: "lesson",
  area: "reading",
  level: 1,
  unit: 1,
  kind: "assigned",
  lessonNo: 1,
  variant: 1,
});
const OTHER_LESSON = cellKey({
  type: "lesson",
  area: "writing",
  level: 1,
  unit: 2,
  kind: "reinforce",
  lessonNo: 3,
  variant: 1,
});

let testDb: TestDatabase;
const made: string[] = [];

beforeEach(async () => {
  testDb = await createTestDatabase();
});
afterEach(async () => {
  await testDb.drop();
});
afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

function load(
  tree: SeedTree,
  options: Partial<Omit<LoadOptions, "files">> = {},
  db: Db = testDb.db,
): Promise<LoadReport> {
  return loadSeed(db, { files: filesOf(tree), now: NOW, ...options });
}

const COUNTED = {
  level_specs: levelSpecs,
  unit_specs: unitSpecs,
  lessons,
  level_test_items: levelTestItems,
  placement_items: placementItems,
  vocab,
  images,
  model_prices: modelPrices,
  settings,
  settings_history: settingsHistory,
} as const;
type Counted = keyof typeof COUNTED;

async function rowCounts(db: Db = testDb.db): Promise<Record<Counted, number>> {
  const out = {} as Record<Counted, number>;
  for (const [name, table] of Object.entries(COUNTED) as [
    Counted,
    (typeof COUNTED)[Counted],
  ][]) {
    const [{ n }] = await db.select({ n: count() }).from(table);
    out[name] = n;
  }
  return out;
}

async function settingRow(key: string, db: Db = testDb.db) {
  const [row] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.key, key), isNull(settings.profileId)));
  return row;
}

function cellsOf(report: LoadReport, table: SeedTable): number {
  return report.counts.cells.inserted[table];
}

function writeTree(tree: SeedTree): string {
  const root = join(
    TMP_ROOT,
    `seed-load-${randomBytes(TMP_NAME_BYTES).toString("hex")}`,
  );
  mkdirSync(root, { recursive: true });
  made.push(root);
  return writeSeedTree(root, tree);
}

describe("적재 시험용 자료", () => {
  it("loadableSeed 는 시드가 차 있는 단계까지 완전성 검증을 오류 · 빈 칸 없이 넘고 판을 바꾼 나무도 그렇다", () => {
    const tree = loadableSeed();
    const report = validateSeed(filesOf(tree), {
      mode: "complete",
      through: LOADABLE_THROUGH,
    });
    expect(report.errors).toEqual([]);
    expect(report.empty).toEqual([]);
    expect(exitCodeOf(report)).toBe(0);
    const changed = withCellVersion(
      tree,
      LESSON,
      { revision: 3, correction: 1 },
      (cell) => {
        cell.title = `${String(cell.title)} 고침`;
      },
    );
    const again = validateSeed(filesOf(changed), {
      mode: "complete",
      through: LOADABLE_THROUGH,
    });
    expect(again.errors).toEqual([]);
    expect(exitCodeOf(again)).toBe(0);
    expect(cellValueOf(changed, LESSON)).toMatchObject({
      revision: 3,
      correction: 1,
    });
    const keys = new Set(loadableSettings().settings.map((r) => r.key));
    for (const key of Object.keys(TEST_SETTINGS))
      expect(keys.has(key)).toBe(true);
  });
});

describe("적재(AC-17b)", () => {
  it("AC-17b 같은 판을 두 번 적재하면 시드 테이블 · settings · settings_history 행 수가 같다", async () => {
    const tree = loadableSeed();
    const first = await load(tree);
    expect(first.outcome).toBe("loaded");
    expect(first.violations).toEqual([]);
    const afterFirst = await rowCounts();
    expect(afterFirst.lessons).toBeGreaterThan(0);
    expect(afterFirst.level_test_items).toBeGreaterThan(0);
    expect(afterFirst.placement_items).toBeGreaterThan(0);
    expect(afterFirst.settings).toBe(loadableSettings().settings.length);
    expect(afterFirst.settings_history).toBe(0);
    const second = await load(tree);
    expect(second.outcome).toBe("loaded");
    expect(await rowCounts()).toEqual(afterFirst);
    expect(second.inserted).toEqual([]);
    expect(second.counts.settings).toMatchObject({ inserted: 0, updated: 0 });
    expect(second.counts.vocab).toMatchObject({ inserted: 0, updated: 0 });
    expect(second.counts.images).toMatchObject({ inserted: 0, updated: 0 });
    expect(second.counts.modelPrices.inserted).toBe(0);
    const skipped = Object.values(second.counts.cells.skipped).reduce(
      (a, b) => a + b,
      0,
    );
    const inserted = Object.values(first.counts.cells.inserted).reduce(
      (a, b) => a + b,
      0,
    );
    expect(skipped).toBe(inserted);
    expect(first.inserted).toHaveLength(inserted);
    // 배치 문항 answer 열은 칸 객체의 answerNo · accepted · sentence 가운데 문항에 있는 것이다(P11 채점이 기댄다)
    const placed = await testDb.db.select().from(placementItems);
    expect(placed.length).toBeGreaterThan(0);
    for (const row of placed) {
      const cell = cellValueOf(
        tree,
        cellKey({
          type: "placement",
          area: row.area as PlacementArea,
          level: row.level,
          form: row.form,
          no: row.itemNo,
          spare: row.isSpare,
        }),
      );
      const expected = Object.fromEntries(
        ANSWER_FIELDS.filter((k) => cell[k] !== undefined).map((k) => [
          k,
          cell[k],
        ]),
      );
      expect(Object.keys(expected).length).toBeGreaterThan(0);
      expect(row.answer).toEqual(expected);
      expect(row.answer).toEqual(answerOf(cell));
    }
    // 시험용 시드에 없는 sentence 갈래(말하기 배치 따라 말하기, P11 채점이 기댄다)
    expect(
      answerOf({
        type: "repeat",
        sentence: "I like it.",
        no: 1,
        revision: 1,
        correction: 0,
      }),
    ).toEqual({ sentence: "I like it." });
  });

  it("AC-17b 검증에 실패한 칸이 하나라도 있으면 한 행도 넣지 않는다", async () => {
    const broken = withCellVersion(
      loadableSeed(),
      LESSON,
      { revision: 2, correction: 0 },
      (cell) => {
        cell.title = "";
      },
    );
    const fresh = await load(broken);
    expect(fresh.outcome).toBe("refused");
    expect(fresh.validation?.code).toBe(1);
    expect(fresh.violations[0]?.rule).toBe("validate");
    const empty = await rowCounts();
    expect(Object.values(empty).every((n) => n === 0)).toBe(true);
    await load(loadableSeed());
    const before = await rowCounts();
    const again = await load(broken);
    expect(again.outcome).toBe("refused");
    expect(await rowCounts()).toEqual(before);
  });

  it("AC-17b 판 규칙에 어긋난 칸(같은 판 · 다른 내용)이 있으면 한 행도 넣지 않는다", async () => {
    await load(loadableSeed());
    const before = await rowCounts();
    // 칸 하나는 판을 올리지 않고 고치고, 다른 칸은 바르게 올린다 — 바른 칸도 들어가지 않는다
    const tree = withCellVersion(
      withCellVersion(
        loadableSeed(),
        LESSON,
        { revision: 1, correction: 0 },
        (cell) => {
          cell.title = `${String(cell.title)} 고침`;
        },
      ),
      OTHER_LESSON,
      { revision: 2, correction: 0 },
      (cell) => {
        cell.title = `${String(cell.title)} 새 개정`;
      },
    );
    const report = await load(tree);
    expect(report.outcome).toBe("refused");
    expect(report.violations).toEqual([
      expect.objectContaining({
        rule: "version-content-changed",
        table: "lessons",
        cell: LESSON,
      }),
    ]);
    expect(await rowCounts()).toEqual(before);
    expect(report.latestRevision).toEqual({ before: 1, after: 1 });
  });
});

describe("설정값 시드 적재(AC-7e · AC-7g · AC-8i · 5절)", () => {
  it("AC-7e 설정값 시드의 seed.complete_through_level 을 6 → 7 로 적재하면 settings 가 7 이고 settings_history 에 seed_load 한 행이 생기며 설정 판이 오른다", async () => {
    // 시험용 시드는 1단계까지라 규격만 적재(칸 완전성을 보지 않음)로 값을 넣는다(plan 위험 10)
    const base = withSetting(loadableSeed(), THROUGH, THROUGH_DEFAULT);
    const first = await load(base, { referenceOnly: true });
    expect(first.outcome).toBe("loaded");
    const before = await settingRow(THROUGH);
    expect(before?.value).toBe(THROUGH_DEFAULT);
    const next = THROUGH_DEFAULT + 1;
    const report = await load(withSetting(base, THROUGH, next), {
      referenceOnly: true,
    });
    expect(report.outcome).toBe("loaded");
    expect(report.counts.settings).toMatchObject({ inserted: 0, updated: 1 });
    const after = await settingRow(THROUGH);
    expect(after?.value).toBe(next);
    expect(after?.version).toBeGreaterThan(
      before?.version ?? Number.POSITIVE_INFINITY,
    );
    const history = await testDb.db.select().from(settingsHistory);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      key: THROUGH,
      profileId: null,
      oldValue: THROUGH_DEFAULT,
      newValue: next,
      source: SEED_LOAD_SOURCE,
      appliesFrom: null,
    });
    expect(history[0]?.changedAt.toISOString()).toBe(NOW.toISOString());
    // 한 번의 적재가 설정 판 하나
    expect(report.counts.settings.version).toBe(after?.version);
  });

  it("AC-7g 개발용 적재(--complete-through 1)는 settings 의 seed.complete_through_level 을 1 로 덮어 넣고 그 단계까지 완전성을 본다(2 면 빈 칸으로 거부)", async () => {
    const tree = withSetting(loadableSeed(), THROUGH, THROUGH_DEFAULT);
    const main = await load(tree);
    expect(main.outcome).toBe("refused");
    expect(main.validation?.summary.empty).toBeGreaterThan(0);
    const beyond = await load(tree, { completeThrough: LOADABLE_THROUGH + 1 });
    expect(beyond.outcome).toBe("refused");
    expect(beyond.completeThrough).toBe(LOADABLE_THROUGH + 1);
    expect(beyond.validation?.summary.empty).toBeGreaterThan(0);
    expect((await rowCounts()).settings).toBe(0);
    const dev = await load(tree, { completeThrough: LOADABLE_THROUGH });
    expect(dev.outcome).toBe("loaded");
    expect(dev.completeThrough).toBe(LOADABLE_THROUGH);
    expect((await settingRow(THROUGH))?.value).toBe(LOADABLE_THROUGH);
    // 다시 돌려도 덮어쓴 값과 같아 고치지 않는다
    const again = await load(tree, { completeThrough: LOADABLE_THROUGH });
    expect(again.counts.settings.updated).toBe(0);
  });

  it("AC-8i 설정값 시드에 ai.effort.talk_turn.1-3 xhigh(끔)이나 쓰기 확인 Opus 5.5 '끔'이 있으면 적재 전체가 실패하고 settings 가 바뀌지 않는다", async () => {
    expect(TEST_SETTINGS["ai.thinking.talk_turn.1-3"].value).toBe("off");
    const xhigh = withSetting(
      loadableSeed(),
      "ai.effort.talk_turn.1-3",
      "xhigh",
    );
    const r1 = await load(xhigh);
    expect(r1.outcome).toBe("refused");
    expect(r1.violations.map((v) => v.rule)).toEqual([
      "combo:talk_turn.1-3:effort-not-allowed-with-off",
    ]);
    const opusOff = withSetting(
      withSetting(
        loadableSeed(),
        "ai.model.writing_check",
        TEST_SETTINGS["ai.model.writing_feedback"].value,
      ),
      "ai.thinking.writing_check",
      "off",
    );
    const r2 = await load(opusOff);
    expect(r2.violations.map((v) => v.rule)).toEqual([
      "combo:writing_check:thinking-off-unsupported",
    ]);
    expect(Object.values(await rowCounts()).every((n) => n === 0)).toBe(true);
    // 견준 뒤의 값으로 본다: 고급 키를 DB 에서 바꾼 값(지킨 값)이 끔과 맞지 않으면 시드가 바르더라도 실패한다
    await load(loadableSeed());
    await testDb.db
      .update(settings)
      .set({ value: "xhigh" })
      .where(
        and(
          eq(settings.key, "ai.effort.talk_turn.1-3"),
          isNull(settings.profileId),
        ),
      );
    const before = await testDb.db.select().from(settings);
    const r3 = await load(loadableSeed());
    expect(r3.outcome).toBe("refused");
    expect(r3.violations.map((v) => v.rule)).toContain(
      "combo:talk_turn.1-3:effort-not-allowed-with-off",
    );
    expect(await testDb.db.select().from(settings)).toEqual(before);
  });

  it("5절 설정값 시드: DB 의 unit.max_remedial(고급)이 새 seed.remedial_per_unit 보다 크면 3.2 관계 표로 적재 전체가 실패한다", async () => {
    const seeded = settingNumber(
      loadableSettings(),
      "seed.remedial_per_unit.4-6",
    );
    const raised = seeded + 1;
    const first = withSetting(
      withSetting(loadableSeed(), "seed.remedial_per_unit.4-6", raised),
      "unit.max_remedial.4-6",
      raised,
    );
    expect((await load(first)).outcome).toBe("loaded");
    const before = await testDb.db.select().from(settings);
    // 새 시드는 둘을 함께 내리지만 unit.max_remedial 은 고급이라 DB 값(raised)을 지킨다
    const lowered = withSetting(
      withSetting(loadableSeed(), "seed.remedial_per_unit.4-6", seeded),
      "unit.max_remedial.4-6",
      seeded,
    );
    const report = await load(lowered);
    expect(report.outcome).toBe("refused");
    expect(report.violations.map((v) => v.rule)).toEqual(["frame-remedial"]);
    expect(await testDb.db.select().from(settings)).toEqual(before);
    expect(await testDb.db.select().from(settingsHistory)).toEqual([]);
  });
});

describe("판 없는 표 · 범위 · 지키는 표(5절 적재)", () => {
  it("5절 적재: 단가표는 capabilitiesOf 꼴로 넣고 loadPriceBook 이 시드 파일과 같은 단가표를 읽으며 (모델, 적용일)이 같은데 값이 다르면 실패한다", async () => {
    const tree = loadableSeed();
    const report = await load(tree);
    expect(report.counts.modelPrices.inserted).toBe(
      MODEL_PRICES_FIXTURE.models.length,
    );
    const day = learningDayOf(
      NOW,
      TEST_SETTINGS["app.timezone"].value,
      TEST_SETTINGS["app.day_start_hour"].value,
    );
    expect(await loadPriceBook(testDb.db, day)).toEqual(
      priceBookOf(priceRowsOfSeed(MODEL_PRICES_FIXTURE), day),
    );
    const before = await rowCounts();
    const changed = structuredClone(tree);
    const first = changed.reference.modelPrices.models[0];
    if (!first) throw new Error("단가표가 비었다");
    first.outputUsdPerMTok += 1;
    const refused = await load(changed);
    expect(refused.outcome).toBe("refused");
    expect(refused.violations).toEqual([
      expect.objectContaining({
        rule: "price-row-changed",
        key: `${first.model} ${first.effectiveFrom}`,
      }),
    ]);
    expect(await rowCounts()).toEqual(before);
    // 바꾸려면 새 적용일 행을 더한다
    const added = structuredClone(tree);
    added.reference.modelPrices.models.push({
      ...first,
      effectiveFrom: "2026-11-01",
    });
    const ok = await load(added);
    expect(ok.outcome).toBe("loaded");
    expect(ok.counts.modelPrices).toEqual({
      inserted: 1,
      unchanged: MODEL_PRICES_FIXTURE.models.length,
    });
  });

  it("5절 적재: DB 단가 행의 조합 칸이 규격에 맞지 않으면 price-row-invalid 로 적재 전체를 거부하고 값을 내지 않는다", async () => {
    const tree = loadableSeed();
    await load(tree);
    const broken = MODEL_PRICES_FIXTURE.models[0];
    if (!broken) throw new Error("단가표가 비었다");
    await testDb.db
      .update(modelPrices)
      .set({ capabilities: { thinkingDefault: CONTENT_MARKER } })
      .where(
        and(
          eq(modelPrices.model, broken.model),
          eq(modelPrices.effectiveFrom, broken.effectiveFrom),
        ),
      );
    const before = await rowCounts();
    const report = await load(
      withCellVersion(tree, LESSON, { revision: 2, correction: 0 }, (cell) => {
        cell.title = `${String(cell.title)} 새 개정`;
      }),
    );
    expect(report.outcome).toBe("refused");
    expect(report.violations).toEqual([
      expect.objectContaining({
        rule: "price-row-invalid",
        table: "model_prices",
        key: `${broken.model} ${broken.effectiveFrom}`,
      }),
    ]);
    expect(JSON.stringify(report)).not.toContain(CONTENT_MARKER);
    expect(await rowCounts()).toEqual(before);
  });

  it("5절 적재: 낱말 · 그림은 word · key 로 있으면 고치고 없으면 넣으며 vocab id 는 그대로, 시드에서 빠진 행은 남긴다", async () => {
    const tree = loadableSeed();
    await load(tree);
    const word = tree.reference.vocab.vocab[0];
    const image = tree.reference.images.images[0];
    if (!word || !image) throw new Error("낱말 · 그림이 비었다");
    const [original] = await testDb.db
      .select()
      .from(vocab)
      .where(eq(vocab.word, word.word));
    // 새 낱말 · 새 그림을 더한다
    const extra = structuredClone(tree);
    extra.reference.vocab.vocab.push({
      ...word,
      word: "tori-extra",
      forms: [],
      imageKey: "tori-extra",
    });
    extra.reference.images.images.push({
      ...image,
      key: "tori-extra",
      file: "images/vocab/tori-extra.png",
      word: "tori-extra",
    });
    const added = await load(extra);
    expect(added.outcome).toBe("loaded");
    expect(added.counts.vocab).toMatchObject({ inserted: 1, updated: 0 });
    expect(added.counts.images).toMatchObject({ inserted: 1, updated: 0 });
    // 처음 나무로 되돌리고 낱말 뜻 · 그림 출처를 고친다
    const fixed = structuredClone(tree);
    const fixedWord = fixed.reference.vocab.vocab[0];
    const fixedImage = fixed.reference.images.images[0];
    if (!fixedWord || !fixedImage) throw new Error("낱말 · 그림이 비었다");
    fixedWord.meaningKo = `${fixedWord.meaningKo} 고침`;
    fixedImage.source = `${fixedImage.source} 고침`;
    const report = await load(fixed);
    expect(report.outcome).toBe("loaded");
    expect(report.counts.vocab).toMatchObject({
      inserted: 0,
      updated: 1,
      absentFromSeed: 1,
    });
    expect(report.counts.images).toMatchObject({
      inserted: 0,
      updated: 1,
      absentFromSeed: 1,
    });
    const [after] = await testDb.db
      .select()
      .from(vocab)
      .where(eq(vocab.word, word.word));
    expect(after?.id).toBe(original?.id);
    expect(after?.meaning).toBe(fixedWord.meaningKo);
    const [kept] = await testDb.db
      .select()
      .from(vocab)
      .where(eq(vocab.word, "tori-extra"));
    expect(kept?.imageKey).toBe("tori-extra");
    const [keptImage] = await testDb.db
      .select()
      .from(images)
      .where(eq(images.key, image.key));
    expect(keptImage?.source).toBe(fixedImage.source);
  });

  it("5절 적재: --areas 밖 영역의 수업 · 평가 칸은 넣지 않고 규격 파일은 모두 넣으며 규격만 적재는 수업 · 평가 · 배치 칸을 넣지 않는다", async () => {
    const tree = loadableSeed();
    const specOnly = await load(tree, { referenceOnly: true });
    expect(specOnly.outcome).toBe("loaded");
    expect(specOnly.areas).toEqual([]);
    let counts = await rowCounts();
    expect(counts).toMatchObject({
      lessons: 0,
      level_test_items: 0,
      placement_items: 0,
    });
    expect(counts.level_specs).toBe(
      tree.reference.levelSpecs.levelSpecs.length,
    );
    expect(counts.unit_specs).toBe(tree.reference.unitSpecs.unitSpecs.length);
    expect(counts.vocab).toBe(tree.reference.vocab.vocab.length);
    expect(counts.settings).toBe(tree.reference.settings.settings.length);
    const reading = await load(tree, { areas: ["reading"] });
    expect(reading.outcome).toBe("loaded");
    const areasOf = async (
      table: typeof lessons | typeof levelTestItems | typeof placementItems,
    ) =>
      new Set(
        (await testDb.db.select({ area: table.area }).from(table)).map(
          (r) => r.area,
        ),
      );
    expect(await areasOf(lessons)).toEqual(new Set(["reading"]));
    expect(await areasOf(levelTestItems)).toEqual(new Set(["reading"]));
    expect(await areasOf(placementItems)).toEqual(new Set(["reading"]));
    counts = await rowCounts();
    expect(cellsOf(reading, "level_specs")).toBe(0);
    expect(cellsOf(reading, "lessons")).toBe(counts.lessons);
    // 나머지 영역을 뒤에 넣어도 빈 묶음이라 받는다
    const rest = await load(tree);
    expect(rest.outcome).toBe("loaded");
    expect((await areasOf(lessons)).size).toBe(4);
  });

  it("5절 적재: 학습 기록 · 운영 테이블(profiles · sessions · unit_progress · level_tests · seed_reports 등)은 바꾸지 않는다", async () => {
    await load(loadableSeed());
    const [lesson] = await testDb.db.select().from(lessons).limit(1);
    if (!lesson) throw new Error("수업 행이 없다");
    const { profileId } = await insertProfileSession(testDb.db, {
      lessonId: lesson.id,
      at: NOW,
    });
    const start = await currentSeedRevision({ db: testDb.db });
    await testDb.db.insert(unitProgress).values({
      profileId,
      area: lesson.area,
      level: lesson.level,
      unit: lesson.unit ?? 1,
      round: 1,
      startedAt: NOW,
      startRevision: start,
      settingsVersion: 1,
      settingsSnapshot: { note: "시험" },
    });
    await testDb.db.insert(levelTests).values({
      profileId,
      kind: "placement",
      area: "reading",
      round: 1,
      form: 1,
      startRevision: start,
      settingsSnapshot: { note: "시험" },
      itemIds: [],
      startedAt: NOW,
    });
    await testDb.db.insert(seedReports).values({
      profileId,
      lessonId: lesson.id,
      reporter: "developer",
      reason: "review_ok",
      status: "received",
      reportedAt: NOW,
    });
    const snapshot = async () => ({
      profiles: await testDb.db.select().from(profiles),
      sessions: await testDb.db.select().from(sessions),
      unitProgress: await testDb.db.select().from(unitProgress),
      levelTests: await testDb.db.select().from(levelTests),
      seedReports: await testDb.db.select().from(seedReports),
    });
    const before = await snapshot();
    const report = await load(
      withCellVersion(
        loadableSeed(),
        LESSON,
        { revision: 2, correction: 0 },
        (cell) => {
          cell.title = `${String(cell.title)} 새 개정`;
        },
      ),
    );
    expect(report.outcome).toBe("loaded");
    expect(report.inserted).toEqual([
      { table: "lessons", cell: LESSON, revision: 2, correction: 0 },
    ]);
    expect(await snapshot()).toEqual(before);
  });

  it.skipIf(!existsSync(join(REPO_ROOT, "seed", SEED_FILES.settings)))(
    "5절 적재: 저장소 seed/ 규격 파일을 규격만 적재로 넣을 수 있다(seed/ 가 있을 때만)",
    async () => {
      const files = readSeedTree(join(REPO_ROOT, "seed"));
      if (!files) throw new Error("seed/ 를 읽지 못했다");
      const report = await loadSeed(testDb.db, {
        files,
        referenceOnly: true,
        completeThrough: LOADABLE_THROUGH,
        now: NOW,
      });
      expect(report.violations).toEqual([]);
      expect(report.outcome).toBe("loaded");
    },
  );
});

describe("적재 명령(pnpm seed:load)", () => {
  function args(argv: string[]) {
    const parsed = parseArgs(argv);
    if (!parsed.ok) throw new Error(parsed.error);
    return parsed.args;
  }
  /** 접속 문자열은 기본이 시험 DB 이고, { url: undefined } 로 '없음'을 준다. */
  const run = (
    argv: string[],
    files: ReadonlyMap<string, string> | null,
    env: { url: string | undefined } = { url: testDb.url },
  ) => runSeedLoad(args(argv), { files, databaseUrl: env.url, now: () => NOW });

  it("적재 명령: 모르는 인자 · 뿌리 없음 · 규격 파일 없음 · MIGRATION_DATABASE_URL 없음은 2, 거부는 1, 적재는 0 이고 출력에 접속 문자열이 없다", async () => {
    expect(parseArgs(["--nope"]).ok).toBe(false);
    expect(parseArgs(["--complete-through", "13"]).ok).toBe(false);
    expect(parseArgs(["--reference-only"]).ok).toBe(false);
    expect(
      parseArgs([
        "--reference-only",
        "--complete-through",
        "1",
        "--areas",
        "reading",
      ]).ok,
    ).toBe(false);
    expect(parseArgs(["--areas", "reading,math"]).ok).toBe(false);
    // dev-load 입력에 공백이 들어와도 된다
    expect(args(["--areas", " reading , writing,speaking "]).areas).toEqual([
      "reading",
      "writing",
      "speaking",
    ]);
    const files = filesOf(loadableSeed());
    const outputs: string[] = [];
    const check = async (
      result: Promise<{ code: number; lines: string[] }>,
      code: number,
    ) => {
      const { code: got, lines } = await result;
      outputs.push(...lines);
      expect(got).toBe(code);
      return lines;
    };
    await check(run([], null), 2);
    const missing = new Map(files);
    missing.delete(SEED_FILES.levelSpecs);
    await check(run([], missing), 2);
    const notJson = new Map(files);
    notJson.set(SEED_FILES.settings, "{");
    await check(run([], notJson), 2);
    await check(run([], files, { url: undefined }), 2);
    const closed = new URL(testDb.url);
    closed.port = "1";
    await check(run([], files, { url: closed.toString() }), 2);
    const broken = filesOf(
      withCellVersion(
        loadableSeed(),
        LESSON,
        { revision: 1, correction: 0 },
        (cell) => {
          cell.title = "";
        },
      ),
    );
    const refusedLines = await check(run([], broken), 1);
    expect(refusedLines.join("\n")).toContain(
      "pnpm seed:validate --complete-through",
    );
    await check(run([], files), 0);
    await check(run([], files), 0);
    const text = outputs.join("\n");
    expect(text).not.toContain(testDb.url);
    expect(text).not.toMatch(/postgres(ql)?:\/\//);
    // 조건 플래그로 띄운 명령은 server-only 를 넘고, 접속 문자열이 없으면 2 로 끝난다(.env.local 은 읽지 않는다)
    const env = { ...process.env };
    delete env.MIGRATION_DATABASE_URL;
    delete env.DATABASE_URL;
    const root = writeTree(loadableSeed());
    const spawned = spawnSync(
      process.execPath,
      ["--conditions=react-server", "--import", "tsx", SCRIPT, "--root", root],
      { cwd: REPO_ROOT, env, encoding: "utf8", timeout: SPAWN_TIMEOUT_MS },
    );
    expect(spawned.status).toBe(2);
    expect(spawned.stderr).toContain("MIGRATION_DATABASE_URL");
    expect(`${spawned.stdout}${spawned.stderr}`).not.toMatch(
      /postgres(ql)?:\/\//,
    );
  });

  it("적재 명령: 첫 줄 요약 꼴과 --json(version 1) 꼴 · --dry-run 은 계획만 내고 한 행도 넣지 않는다", async () => {
    const SUMMARY =
      /^seed-load: (넣음|미리 돌림|거부) · 칸 넣음 \d+ · 건너뜀 \d+ · 낱말 넣음 \d+ 고침 \d+ · 그림 넣음 \d+ 고침 \d+ · 단가 넣음 \d+ · 설정 넣음 \d+ 고침 \d+ 지킴 \d+ · 이력 \d+ · 최신 개정 (\d+|-)→(\d+|-) · 위반 \d+$/;
    const root = writeTree(loadableSeed());
    const files = readSeedTree(root);
    const dry = await run(["--root", root, "--dry-run"], files);
    expect(dry.code).toBe(0);
    expect(dry.lines[0]).toMatch(SUMMARY);
    expect(dry.lines[0]).toMatch(/^seed-load: 미리 돌림 /);
    expect(Object.values(await rowCounts()).every((n) => n === 0)).toBe(true);
    const real = await run(["--root", root], files);
    expect(real.code).toBe(0);
    expect(real.lines[0]).toMatch(/^seed-load: 넣음 /);
    expect(real.lines[0]?.replace("넣음", "미리 돌림")).toBe(dry.lines[0]);
    const again = await run(["--root", root], files);
    expect(again.lines[0]).toMatch(/^seed-load: 넣음 · 칸 넣음 0 /);
    console.info(`${PROBE} --dry-run: ${dry.lines[0]}`);
    console.info(`${PROBE} 실제: ${real.lines[0]}`);
    console.info(`${PROBE} 다시 한 번: ${again.lines[0]}`);
    const json = await run(["--root", root, "--json"], files);
    expect(json.lines).toHaveLength(1);
    const report = JSON.parse(json.lines[0] ?? "") as LoadReport;
    expect(report).toMatchObject({
      version: 1,
      outcome: "loaded",
      completeThrough: LOADABLE_THROUGH,
      referenceOnly: false,
      validation: { code: 0 },
      latestRevision: { before: 1, after: 1 },
      violations: [],
      inserted: [],
    });
    expect(Object.keys(report.counts.cells.inserted)).toEqual([
      "level_specs",
      "unit_specs",
      "lessons",
      "level_test_items",
      "placement_items",
    ]);
    const refused = await run(
      ["--root", root, "--json"],
      filesOf(withSetting(loadableSeed(), THROUGH, THROUGH_DEFAULT)),
    );
    expect(refused.code).toBe(1);
    expect((JSON.parse(refused.lines[0] ?? "") as LoadReport).outcome).toBe(
      "refused",
    );
  });
  it("적재 명령: 적재 중 DB 오류는 종료 2 와 오류 이름 · 코드 한 줄이고 칸 내용 · SQL 을 내지 않으며, 접속 확인이 실패하면 접속을 닫는다", async () => {
    const files = filesOf(loadableSeed());
    const printed: string[] = [];
    const capture = (...parts: unknown[]) => {
      printed.push(parts.map(String).join(" "));
    };
    const log = vi.spyOn(console, "log").mockImplementation(capture);
    const error = vi.spyOn(console, "error").mockImplementation(capture);
    const warn = vi.spyOn(console, "warn").mockImplementation(capture);
    try {
      // select 1 은 지나고 트랜잭션이 drizzle 질의 오류(SQL · params 에 칸 내용)를 던지는 가짜 접속
      const cause = Object.assign(
        new Error("Connection terminated unexpectedly"),
        { code: "CONNECTION_CLOSED" },
      );
      const queryError = new DrizzleQueryError(
        'insert into "lessons" ("content") values ($1)',
        [JSON.stringify({ passage: CONTENT_MARKER })],
        cause,
      );
      const close = vi.fn(async () => {});
      const failing: DbHandle = {
        db: new Proxy(testDb.db, {
          get(target, prop, receiver) {
            if (prop === "transaction") {
              return async () => {
                throw queryError;
              };
            }
            return Reflect.get(target, prop, receiver);
          },
        }),
        close,
      };
      const result = await runSeedLoad(args([]), {
        files,
        databaseUrl: testDb.url,
        now: () => NOW,
        openDb: () => failing,
      });
      expect(result.code).toBe(2);
      expect(result.lines).toEqual([
        "seed-load: 적재 중 오류(Error CONNECTION_CLOSED)",
      ]);
      expect(close).toHaveBeenCalledTimes(1);
      // 접속 확인(select 1)이 실패해도 연 접속을 닫는다
      const closeProbe = vi.fn(async () => {});
      const refused: DbHandle = {
        db: new Proxy(testDb.db, {
          get(target, prop, receiver) {
            if (prop === "execute") {
              return async () => {
                throw cause;
              };
            }
            return Reflect.get(target, prop, receiver);
          },
        }),
        close: closeProbe,
      };
      const probe = await runSeedLoad(args([]), {
        files,
        databaseUrl: testDb.url,
        now: () => NOW,
        openDb: () => refused,
      });
      expect(probe.code).toBe(2);
      expect(probe.lines).toEqual([
        "seed-load: DB 에 접속하지 못했다(Error CONNECTION_CLOSED)",
      ]);
      expect(closeProbe).toHaveBeenCalledTimes(1);
      const text = [...result.lines, ...probe.lines, ...printed].join("\n");
      expect(text).not.toContain(CONTENT_MARKER);
      expect(text).not.toContain("insert into");
      expect(text).not.toContain(testDb.url);
    } finally {
      log.mockRestore();
      error.mockRestore();
      warn.mockRestore();
    }
    expect(await rowCounts()).toMatchObject({ lessons: 0, settings: 0 });
  });

  it("적재 명령: 사람용 출력은 지킨 키 · 시드에 없는 DB 키를 값 없이 이름만 줄마다 내고 --json 꼴은 그대로다", async () => {
    const files = filesOf(loadableSeed());
    expect((await run([], files)).code).toBe(0);
    const KEPT = "ai.daily_cost_alert_usd";
    /** 부모가 바꾼 값(출력에 나오지 않아야 해서 다른 줄에 없을 꼴로 둔다). */
    const parentValue = TEST_SETTINGS[KEPT].value + 0.125;
    await testDb.db
      .update(settings)
      .set({ value: parentValue })
      .where(and(eq(settings.key, KEPT), isNull(settings.profileId)));
    const extra = 2;
    const orphanKeys = Array.from(
      { length: SETTING_KEY_LINES + extra },
      (_, i) => `old.removed_key_${String(i).padStart(2, "0")}`,
    );
    await testDb.db.insert(settings).values(
      orphanKeys.map((key) => ({
        key,
        scope: "household" as const,
        profileId: null,
        value: CONTENT_MARKER,
        version: 1,
      })),
    );
    const human = await run([], files);
    expect(human.code).toBe(0);
    expect(human.lines).toContain(`kept ${KEPT}`);
    const orphanLines = human.lines.filter((l) => l.startsWith("orphan "));
    expect(orphanLines).toEqual([
      ...orphanKeys.slice(0, SETTING_KEY_LINES).map((k) => `orphan ${k}`),
      `orphan … 외 ${extra}`,
    ]);
    const text = human.lines.join("\n");
    expect(text).not.toContain(CONTENT_MARKER);
    expect(text).not.toContain(String(parentValue));
    const json = await run(["--json"], files);
    expect(json.lines).toHaveLength(1);
    const report = JSON.parse(json.lines[0] ?? "") as LoadReport;
    expect(report.counts.settings).toMatchObject({
      kept: 1,
      orphans: orphanKeys.length,
    });
    expect(json.lines[0]).not.toContain(KEPT);
    expect(json.lines[0]).not.toContain("old.removed_key");
  });
  it("적재 명령: 칸 종류 불일치 같은 불변식 오류는 칸 키만 담은 메시지를 그대로 내고 종료 2 다", async () => {
    // 칸 키는 수업인데 칸 종류가 이야기인 칸(collectCells 로는 닿지 않는 길)
    const thrown = (() => {
      try {
        buildIncoming(
          [],
          [],
          [
            {
              key: LESSON,
              kind: "story",
              area: "talk",
              value: { title: CONTENT_MARKER },
              file: "stories/1-3.json",
              path: "stories.0",
            },
          ],
        );
      } catch (error) {
        return error;
      }
      return undefined;
    })();
    expect(thrown).toBeInstanceOf(SeedLoadInvariantError);
    const message = (thrown as Error).message;
    expect(message).toBe(`칸 키와 칸 종류가 맞지 않는다: ${LESSON}`);
    // 명령은 그 갈래의 메시지를 그대로 낸다(가짜 접속이 적재 중에 그 오류를 던진다)
    const close = vi.fn(async () => {});
    const handle: DbHandle = {
      db: new Proxy(testDb.db, {
        get(target, prop, receiver) {
          if (prop === "transaction") {
            return async () => {
              throw thrown;
            };
          }
          return Reflect.get(target, prop, receiver);
        },
      }),
      close,
    };
    const result = await runSeedLoad(args([]), {
      files: filesOf(loadableSeed()),
      databaseUrl: testDb.url,
      now: () => NOW,
      openDb: () => handle,
    });
    expect(result.code).toBe(2);
    expect(result.lines).toEqual([`seed-load: ${message}`]);
    expect(result.lines.join("\n")).not.toContain(CONTENT_MARKER);
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("적재 명령: 적재 뒤 접속 닫기가 실패해도 적재 결과와 종료 코드는 그대로다", async () => {
    // 닫기가 던지는 접속(review-p07a-2 4절 — 예전에는 결과를 덮어 '예상 밖 오류' 종료 2 였다)
    const close = vi.fn(async () => {
      throw Object.assign(new Error("end failed"), {
        code: "CONNECTION_ENDED",
      });
    });
    const result = await runSeedLoad(args([]), {
      files: filesOf(loadableSeed()),
      databaseUrl: testDb.url,
      now: () => NOW,
      openDb: () => ({ db: testDb.db, close }),
    });
    expect(result.code).toBe(0);
    expect(result.lines[0]).toMatch(/^seed-load: 넣음 · /);
    expect(close).toHaveBeenCalledTimes(1);
    expect((await rowCounts()).settings).toBeGreaterThan(0);
  });
});

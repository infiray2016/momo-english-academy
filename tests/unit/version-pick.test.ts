// 시드 판 고르기 · 판 적재 규칙(plan-p07a 파일별 값 1, 5절 · R5 · C68 (2), AC-17a).
// 이름의 3.0 · 4.0 같은 판은 시험이 만든 값이고 설계 숫자가 아니다.
import { describe, expect, it } from "vitest";
import { cellKey } from "@/core/seed/structure";
import {
  cellGroupOf,
  compareVersions,
  formatVersion,
  latestRevision,
  levelSpecCell,
  pickByCell,
  pickVersion,
  planVersionRows,
  SEED_TABLES,
  type SeedTable,
  unitSpecCell,
  VERSION_RULES,
  type VersionRow,
} from "@/core/seed/version-pick";

type Row = { revision: number; correction: number; tag: string };
const row = (revision: number, correction: number): Row => ({
  revision,
  correction,
  tag: `${revision}.${correction}`,
});

const LESSON_4 = cellKey({
  type: "lesson",
  area: "reading",
  level: 1,
  unit: 1,
  kind: "assigned",
  lessonNo: 4,
  variant: 1,
});
const LESSON_5 = cellKey({
  type: "lesson",
  area: "reading",
  level: 1,
  unit: 1,
  kind: "reinforce",
  lessonNo: 5,
  variant: 1,
});
const REMEDIAL_4 = cellKey({
  type: "lesson",
  area: "reading",
  level: 1,
  unit: 1,
  kind: "remedial",
  lessonNo: 4,
  variant: 1,
});
const UNIT_2_LESSON = cellKey({
  type: "lesson",
  area: "reading",
  level: 1,
  unit: 2,
  kind: "assigned",
  lessonNo: 1,
  variant: 1,
});
const TEST_ITEM = (form: number, no: number) =>
  cellKey({ type: "level-test", area: "reading", level: 1, form, no });
const PLACEMENT = (level: number, no: number, form = 1) =>
  cellKey({
    type: "placement",
    area: "reading",
    level,
    form,
    no,
    spare: false,
  });

function vrow(
  table: SeedTable,
  cell: string,
  revision: number,
  correction: number,
  hash = "h",
): VersionRow {
  return { table, cell, revision, correction, hash };
}

describe("판 견주기", () => {
  it("판은 개정 먼저, 같으면 정정으로 견주고 '개정.정정' 글로 적는다", () => {
    expect(
      compareVersions(
        { revision: 3, correction: 1 },
        { revision: 4, correction: 0 },
      ),
    ).toBeLessThan(0);
    expect(
      compareVersions(
        { revision: 3, correction: 2 },
        { revision: 3, correction: 1 },
      ),
    ).toBeGreaterThan(0);
    expect(
      compareVersions(
        { revision: 2, correction: 0 },
        { revision: 2, correction: 0 },
      ),
    ).toBe(0);
    expect(formatVersion({ revision: 3, correction: 1 })).toBe("3.1");
  });
});

describe("판 고르기(AC-17a)", () => {
  it("AC-17a 판 고르기: 시작 개정 3 인 단원은 3.0 · 4.0 가운데 3.0 을, 시작 개정 4 인 단원은 4.0 을 고른다", () => {
    const rows = [row(4, 0), row(3, 0)];
    expect(pickVersion(rows, 3)?.tag).toBe("3.0");
    expect(pickVersion(rows, 4)?.tag).toBe("4.0");
  });

  it("AC-17a 판 고르기: 같은 개정의 정정 3.1 은 시작 개정 3 인 단원에 바로 고른다", () => {
    const rows = [row(3, 0), row(3, 1), row(4, 0)];
    expect(pickVersion(rows, 3)?.tag).toBe("3.1");
  });

  it("AC-17a 판 고르기: 2.0 · 4.0 이 있는 칸에 2.1 이 들면 시작 개정 2 · 3 인 단원은 2.1 을, 4 인 단원은 4.0 을 고른다", () => {
    const rows = [row(2, 0), row(4, 0), row(2, 1)];
    expect(pickVersion(rows, 2)?.tag).toBe("2.1");
    expect(pickVersion(rows, 3)?.tag).toBe("2.1");
    expect(pickVersion(rows, 4)?.tag).toBe("4.0");
  });

  it("AC-17a 판 고르기: 시작 개정 이하 행이 없는 칸(뒤 개정에 생긴 칸)은 열지 않는다", () => {
    expect(pickVersion([row(4, 0), row(5, 0)], 3)).toBeUndefined();
    expect(pickVersion([], 3)).toBeUndefined();
    const cells = [
      { cell: "a", ...row(1, 0) },
      { cell: "a", ...row(3, 0) },
      { cell: "b", ...row(4, 0) },
    ];
    const picked = pickByCell(cells, (r) => r.cell, 3);
    expect([...picked.keys()]).toEqual(["a"]);
    expect(picked.get("a")?.tag).toBe("3.0");
  });

  it("5절 시드 최신 개정: 행들의 가장 큰 개정이고 행이 없으면 0 이다", () => {
    expect(latestRevision([])).toBe(0);
    expect(latestRevision([row(2, 3), row(4, 0), row(1, 0)])).toBe(4);
  });
});

describe("판 적재 규칙(5절 · C68 (2))", () => {
  it("규칙 이름은 다섯이고 시드 테이블은 넣는 차례대로 다섯이다", () => {
    expect([...VERSION_RULES]).toEqual([
      "version-content-changed",
      "revision-not-new",
      "new-cell-in-open-group",
      "correction-without-revision",
      "correction-not-new",
    ]);
    expect([...SEED_TABLES]).toEqual([
      "level_specs",
      "unit_specs",
      "lessons",
      "level_test_items",
      "placement_items",
    ]);
  });

  it("5절 판 적재: 같은 칸 · 같은 판 · 같은 내용은 건너뛰고 내용이 다르면 version-content-changed 다", () => {
    const existing = [vrow("lessons", LESSON_4, 1, 0, "x")];
    const same = planVersionRows(
      [vrow("lessons", LESSON_4, 1, 0, "x")],
      existing,
    );
    expect(same.violations).toEqual([]);
    expect(same.insert).toEqual([]);
    expect(same.skip.map((r) => r.cell)).toEqual([LESSON_4]);
    const changed = planVersionRows(
      [vrow("lessons", LESSON_4, 1, 0, "y")],
      existing,
    );
    expect(changed.violations.map((v) => v.rule)).toEqual([
      "version-content-changed",
    ]);
    expect(changed.violations[0]).toMatchObject({
      table: "lessons",
      cell: LESSON_4,
    });
  });

  it("5절 판 적재: 있는 칸의 새 개정이 DB 의 가장 큰 개정 이하면 revision-not-new 다(크면 받고 건너뛴 번호도 받는다)", () => {
    // G = 4(다른 칸의 4.0 이 있다)
    const existing = [
      vrow("lessons", LESSON_4, 2, 0),
      vrow("lessons", UNIT_2_LESSON, 4, 0),
    ];
    const atG = planVersionRows([vrow("lessons", LESSON_4, 4, 0)], existing);
    expect(atG.violations.map((v) => v.rule)).toEqual(["revision-not-new"]);
    const belowG = planVersionRows([vrow("lessons", LESSON_4, 3, 0)], existing);
    expect(belowG.violations.map((v) => v.rule)).toEqual(["revision-not-new"]);
    const next = planVersionRows([vrow("lessons", LESSON_4, 5, 0)], existing);
    expect(next.violations).toEqual([]);
    expect(next.insert.map((r) => formatVersion(r))).toEqual(["5.0"]);
    expect(next.latestBefore).toBe(4);
    expect(next.latestAfter).toBe(5);
    const skipped = planVersionRows(
      [vrow("lessons", LESSON_4, 6, 0)],
      existing,
    );
    expect(skipped.violations).toEqual([]);
    expect(skipped.latestAfter).toBe(6);
  });

  it("5절 판 적재: 행이 있는 단원 · 벌 · 배치 벌에 새로 생긴 칸은 가장 큰 개정보다 커야 하고 빈 묶음의 새 칸은 받는다", () => {
    const existing = [
      vrow("lessons", LESSON_4, 1, 0),
      vrow("level_test_items", TEST_ITEM(1, 1), 1, 0),
      vrow("placement_items", PLACEMENT(1, 1), 1, 0),
    ];
    // 단원 1 에 보강 수업 4 를 1.0 으로 더함
    const openUnit = planVersionRows(
      [
        vrow("lessons", REMEDIAL_4, 1, 0),
        vrow("level_test_items", TEST_ITEM(1, 2), 1, 0),
        vrow("placement_items", PLACEMENT(5, 1), 1, 0),
      ],
      existing,
    );
    expect(openUnit.violations.map((v) => [v.rule, v.cell])).toEqual([
      ["new-cell-in-open-group", REMEDIAL_4],
      ["new-cell-in-open-group", TEST_ITEM(1, 2)],
      ["new-cell-in-open-group", PLACEMENT(5, 1)],
    ]);
    // G 를 넘으면 받는다
    const newer = planVersionRows(
      [vrow("lessons", REMEDIAL_4, 2, 0)],
      existing,
    );
    expect(newer.violations).toEqual([]);
    // 빈 묶음(단원 2 · 벌 2 · 배치 벌 2)의 새 칸은 개정과 관계없이 받는다
    const empty = planVersionRows(
      [
        vrow("lessons", UNIT_2_LESSON, 1, 0),
        vrow("level_test_items", TEST_ITEM(2, 1), 1, 0),
        vrow("placement_items", PLACEMENT(1, 1, 2), 1, 0),
      ],
      existing,
    );
    expect(empty.violations).toEqual([]);
    expect(empty.insert).toHaveLength(3);
    // 칸이 처음이면 정정 판이라도 새 칸 규칙을 따른다
    const firstCorrection = planVersionRows(
      [vrow("lessons", UNIT_2_LESSON, 1, 1)],
      existing,
    );
    expect(firstCorrection.violations).toEqual([]);
  });

  it("5절 판 적재: 정정은 DB 에 그 개정 행이 있어야 하고(correction-without-revision) 그 개정의 가장 큰 정정보다 커야 한다(correction-not-new)", () => {
    const existing = [
      vrow("lessons", LESSON_5, 2, 0),
      vrow("lessons", LESSON_5, 4, 0),
      vrow("lessons", LESSON_4, 2, 0),
      vrow("lessons", LESSON_4, 2, 2),
    ];
    const missingRevision = planVersionRows(
      [vrow("lessons", LESSON_5, 3, 1)],
      existing,
    );
    expect(missingRevision.violations.map((v) => v.rule)).toEqual([
      "correction-without-revision",
    ]);
    const old = planVersionRows([vrow("lessons", LESSON_4, 2, 1)], existing);
    expect(old.violations.map((v) => v.rule)).toEqual(["correction-not-new"]);
    // 옛 개정 행의 정정(4.0 뒤의 2.1)은 받는다. 최신 개정은 그대로다
    const correction = planVersionRows(
      [vrow("lessons", LESSON_5, 2, 1), vrow("lessons", LESSON_4, 2, 3)],
      existing,
    );
    expect(correction.violations).toEqual([]);
    expect(correction.insert.map((r) => formatVersion(r))).toEqual([
      "2.1",
      "2.3",
    ]);
    expect(correction.latestAfter).toBe(4);
  });

  it("규칙은 칸마다 따로 보고 걸린 칸을 모두 낸다", () => {
    const existing = [
      vrow("lessons", LESSON_4, 1, 0, "x"),
      vrow("lessons", LESSON_5, 1, 0, "x"),
    ];
    const plan = planVersionRows(
      [
        vrow("lessons", LESSON_4, 1, 0, "y"),
        vrow("lessons", LESSON_5, 1, 0, "z"),
      ],
      existing,
    );
    expect(plan.violations.map((v) => v.cell)).toEqual([LESSON_4, LESSON_5]);
  });

  it("5절 칸 묶음: 수업은 단원, 토리 이야기는 구간, 단계 평가는 벌, 배치는 영역 · 벌, 규격 행은 그 행이다", () => {
    expect(cellGroupOf(LESSON_4)).toBe("lesson:reading:1:1");
    expect(cellGroupOf(REMEDIAL_4)).toBe("lesson:reading:1:1");
    expect(cellGroupOf(cellKey({ type: "story", band: "4-6", no: 3 }))).toBe(
      "story:4-6",
    );
    expect(cellGroupOf(TEST_ITEM(2, 7))).toBe("level-test:reading:1:2");
    expect(
      cellGroupOf(
        cellKey({ type: "level-test", area: "talk", level: 1, form: 1, no: 2 }),
      ),
    ).toBe("level-test:talk:1:1");
    expect(cellGroupOf(PLACEMENT(7, 2))).toBe("placement:reading:1");
    expect(
      cellGroupOf(
        cellKey({
          type: "placement",
          area: "speaking",
          level: 3,
          form: 1,
          no: 1,
          spare: true,
        }),
      ),
    ).toBe("placement:speaking:1");
    expect(levelSpecCell("writing", 6)).toBe("level-spec:writing:6");
    expect(unitSpecCell("reading", 1, 0)).toBe("unit-spec:reading:1:0");
    expect(cellGroupOf(levelSpecCell("writing", 6))).toBe(
      "level-spec:writing:6",
    );
    expect(cellGroupOf(unitSpecCell("reading", 1, 0))).toBe(
      "unit-spec:reading:1:0",
    );
    expect(() => cellGroupOf("lesson:reading:x")).toThrow();
    expect(() => cellGroupOf("level-spec:reading:13")).toThrow();
  });
});

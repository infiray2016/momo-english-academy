// 단원 규격 목표 칸 적재(회화 plan 묶음 8 fix 1 · plan 보정 11-05 (7) — 회화 턴 가변부의 단원 목표 글). 적재기가 단원 규격의 goals 를
// unit_specs.goals 에 담고 판 해시 몸통에도 넣는지, 목표가 없는 행의 해시는 그대로인지(이미 적재한 판을 바꾸지 않음) DB 없이 본다.
// 통합 적재 시험(seed-load.test.ts)은 CI 가 돈다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { UnitSpec } from "@/core/seed/schema/reference";
import { cellHash } from "@/core/seed/validate";
import {
  planVersionRows,
  unitSpecCell,
  type VersionRow,
} from "@/core/seed/version-pick";
import {
  buildIncoming,
  unitGoalFillsOf,
  unitGoalKeyOf,
} from "@/server/seed/load";

const SPEC: UnitSpec = {
  area: "talk",
  level: 3,
  unit: 1,
  learningElement: "일반동사 현재",
  topic: "주말에 하는 일",
  words: ["play", "weekend"],
  revision: 1,
  correction: 0,
};
const GOAL = {
  id: "talk-3-1-1",
  ko: "주말에 하는 일을 말한다",
  core: "speaking",
  tasks: ["card-answer"],
  home: ["home"],
  needs: ["word" as const],
  accept: "meaning" as const,
};
const CELL = unitSpecCell("talk", 3, 1);

function unitRow(spec: UnitSpec) {
  const incoming = buildIncoming([], [spec], []);
  const row = incoming.rows.find((r) => r.table === "unit_specs");
  return { payload: incoming.payloads.unit_specs.get(CELL), hash: row?.hash };
}

describe("단원 규격 목표 칸 적재(묶음 8 fix 1)", () => {
  it("적재기는 단원 규격의 목표를 unit_specs.goals 에 담고 판 해시 몸통에도 넣는다", () => {
    const withGoals = unitRow({ ...SPEC, goals: [GOAL] });
    expect(withGoals.payload?.goals).toEqual([GOAL]);
    expect(withGoals.hash).not.toBe(unitRow(SPEC).hash);
  });

  it("목표가 없는 단원 규격은 goals 칸을 두지 않고(열 NULL) 해시는 목표 칸 앞의 몸통과 같다(이미 적재한 판을 바꾸지 않음)", () => {
    const plain = unitRow(SPEC);
    expect(plain.payload?.goals).toBeUndefined();
    expect(plain.hash).toBe(
      cellHash(CELL, {
        area: SPEC.area,
        level: SPEC.level,
        unit: SPEC.unit,
        learningElement: SPEC.learningElement,
        topic: SPEC.topic,
        words: SPEC.words,
      }),
    );
  });
});

describe("마이그레이션 0007(unit_specs.goals)", () => {
  it("0007 은 unit_specs 에 비울 수 있는 goals jsonb 열 하나를 더하기만 하고 journal 에 든다(개발 DB 적용은 컨트롤러)", () => {
    const dir = join(process.cwd(), "drizzle");
    const sql = readFileSync(join(dir, "0007_unit_specs_goals.sql"), "utf8");
    expect(sql.trim()).toBe(
      'ALTER TABLE "unit_specs" ADD COLUMN "goals" jsonb;',
    );
    const journal = JSON.parse(
      readFileSync(join(dir, "meta/_journal.json"), "utf8"),
    ) as { entries: { idx: number; tag: string }[] };
    expect(
      journal.entries.find((e) => e.tag === "0007_unit_specs_goals"),
    ).toMatchObject({ idx: 7 });
  });
});

/** DB 에 목표 없이 적재된 같은 판 단원 규격 행(열에서 되살린 해시 — 목표 칸 앞의 몸통). */
function dbRow(spec: UnitSpec): VersionRow {
  return {
    table: "unit_specs",
    cell: CELL,
    revision: spec.revision,
    correction: spec.correction,
    hash: cellHash(CELL, {
      area: spec.area,
      level: spec.level,
      unit: spec.unit,
      learningElement: spec.learningElement,
      topic: spec.topic,
      words: spec.words,
    }),
  };
}

describe("목표 채움(컨트롤러 결정 T-87 — 같은 판에 goals 만 뒤늦게 더해진 행)", () => {
  it("같은 판 단원 규격 행이 DB 에 goals 없이 있고 goals 를 뺀 몸통이 같으면 거부하지 않고 그 행의 goals 를 채운다(목표 채움 1)", () => {
    const incoming = buildIncoming([], [{ ...SPEC, goals: [GOAL] }], []);
    const existing = [dbRow(SPEC)];
    const missing = new Set([unitGoalKeyOf(existing[0] as VersionRow)]);
    // 채움 규칙이 없으면 같은 판 다른 내용으로 거부된다
    expect(planVersionRows(incoming.rows, existing).violations).toHaveLength(1);
    const filled = unitGoalFillsOf(incoming, existing, missing);
    expect(filled.fills).toEqual([
      { cell: CELL, revision: 1, correction: 0, goals: [GOAL] },
    ]);
    const plan = planVersionRows(incoming.rows, filled.existing);
    expect(plan.violations).toEqual([]);
    expect(plan.insert).toEqual([]);
    expect(plan.skip).toHaveLength(1);
  });

  it("goals 밖의 칸도 다른 행은 채우지 않고 지금처럼 version-content-changed 로 거부한다(DB 에 목표가 이미 있어도 채우지 않음)", () => {
    const incoming = buildIncoming(
      [],
      [{ ...SPEC, topic: "주말 계획", goals: [GOAL] }],
      [],
    );
    const existing = [dbRow(SPEC)];
    const missing = new Set([unitGoalKeyOf(existing[0] as VersionRow)]);
    const filled = unitGoalFillsOf(incoming, existing, missing);
    expect(filled.fills).toEqual([]);
    expect(
      planVersionRows(incoming.rows, filled.existing).violations.map(
        (v) => v.rule,
      ),
    ).toEqual(["version-content-changed"]);
    const same = buildIncoming([], [{ ...SPEC, goals: [GOAL] }], []);
    expect(unitGoalFillsOf(same, existing, new Set()).fills).toEqual([]);
  });
});

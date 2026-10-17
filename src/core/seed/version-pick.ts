// 시드 판 고르기 · 판 적재 규칙(plan-p07a 파일별 값 1, 5절 시드 판 · 요청자 결정 R5 · 13절 C68 (2)).
// 판은 칸마다 '개정.정정' 두 자리다. 앱은 칸마다 개정 자리가 시작 개정 이하인 행 가운데 가장 높은 판을 읽는다.
// 적재는 지켜야 하는 성질 하나(새 개정 · 열린 묶음의 새 칸은 적재 앞 DB 의 가장 큰 개정을 넘는다)만 막는다(plan 위험 1).
// DB · 파일 · 시계를 가져오지 않는 순수 모듈이다(의존 규칙 core-no-framework · core-no-io).
import {
  AREAS,
  type Area,
  isLevel,
  isUnitOf,
  parseCellKey,
} from "@/core/seed/structure";

// ── 판 ───────────────────────────────────────────────────────────

/** 시드 판 '개정.정정'(5절). */
export type SeedVersion = { revision: number; correction: number };

/** 개정 먼저, 같으면 정정으로 견준다(음수 · 0 · 양수). */
export function compareVersions(a: SeedVersion, b: SeedVersion): number {
  return a.revision !== b.revision
    ? a.revision - b.revision
    : a.correction - b.correction;
}

/** `3.1` 꼴 글(출력 · 메시지용). */
export function formatVersion(v: SeedVersion): string {
  return `${v.revision}.${v.correction}`;
}

/**
 * 한 칸의 행들 가운데 개정 자리가 시작 개정 이하인 행에서 판이 가장 높은 행(5절).
 * 없으면 undefined — 뒤 개정에 생긴 칸은 열지 않는다.
 */
export function pickVersion<T extends SeedVersion>(
  rows: readonly T[],
  startRevision: number,
): T | undefined {
  let best: T | undefined;
  for (const row of rows) {
    if (row.revision > startRevision) continue;
    if (!best || compareVersions(row, best) > 0) best = row;
  }
  return best;
}

/** 칸마다 pickVersion 한 결과(칸 → 행). 칸 차례는 처음 나온 차례다. */
export function pickByCell<T extends SeedVersion>(
  rows: readonly T[],
  cellOf: (row: T) => string,
  startRevision: number,
): Map<string, T> {
  const byCell = new Map<string, T[]>();
  for (const row of rows) {
    const cell = cellOf(row);
    byCell.set(cell, [...(byCell.get(cell) ?? []), row]);
  }
  const picked = new Map<string, T>();
  for (const [cell, list] of byCell) {
    const row = pickVersion(list, startRevision);
    if (row) picked.set(cell, row);
  }
  return picked;
}

/** 행들의 가장 큰 개정(5절 '시드 전체 최신 개정 번호'). 행이 없으면 0. */
export function latestRevision(rows: readonly { revision: number }[]): number {
  let latest = 0;
  for (const row of rows) if (row.revision > latest) latest = row.revision;
  return latest;
}

// ── 시드 테이블 · 칸 ─────────────────────────────────────────────

/** 판 열이 있는 시드 테이블 다섯(5절). 차례가 넣는 차례다. */
export const SEED_TABLES = [
  "level_specs",
  "unit_specs",
  "lessons",
  "level_test_items",
  "placement_items",
] as const;
export type SeedTable = (typeof SEED_TABLES)[number];

const LEVEL_SPEC_HEAD = "level-spec";
const UNIT_SPEC_HEAD = "unit-spec";

/** 단계 규격 행의 칸 키 `level-spec:<영역>:<단계>`(제안, 판 규칙 쪽에서만 쓴다). */
export function levelSpecCell(area: Area, level: number): string {
  return [LEVEL_SPEC_HEAD, area, level].join(":");
}

/** 단원 규격 행의 칸 키 `unit-spec:<영역>:<단계>:<단원>`(제안). */
export function unitSpecCell(area: Area, level: number, unit: number): string {
  return [UNIT_SPEC_HEAD, area, level, unit].join(":");
}

const NUMBER_PART = /^(?:0|[1-9][0-9]*)$/;

function isSpecCell(cell: string): boolean {
  const parts = cell.split(":");
  const [head, areaText, levelText, unitText] = parts;
  const area = AREAS.find((a) => a === areaText);
  if (!area || !levelText || !NUMBER_PART.test(levelText)) return false;
  const level = Number(levelText);
  if (!isLevel(level)) return false;
  if (head === LEVEL_SPEC_HEAD) return parts.length === 3;
  if (head === UNIT_SPEC_HEAD && parts.length === 4) {
    return (
      unitText !== undefined &&
      NUMBER_PART.test(unitText) &&
      isUnitOf(area, level, Number(unitText))
    );
  }
  return false;
}

/**
 * 칸이 속한 묶음(판 적재 규칙 new-cell-in-open-group): 수업 → 단원, 토리 이야기 → 구간,
 * 단계 평가 문항 · 회화 평가 카드 장 → 벌, 배치 문항 → 영역 · 벌, 규격 행 → 그 칸 자신. 꼴을 모르는 칸은 던진다.
 */
export function cellGroupOf(cell: string): string {
  if (isSpecCell(cell)) return cell;
  const ref = parseCellKey(cell);
  if (!ref) throw new RangeError(`칸 키 꼴을 모른다: ${cell}`);
  switch (ref.type) {
    case "lesson":
      return ["lesson", ref.area, ref.level, ref.unit].join(":");
    case "story":
      return ["story", ref.band].join(":");
    case "level-test":
      return ["level-test", ref.area, ref.level, ref.form].join(":");
    case "placement":
      return ["placement", ref.area, ref.form].join(":");
  }
}

// ── 판 적재 계획 ─────────────────────────────────────────────────

/** 판 적재 규칙 이름 다섯(plan-p07a 판 적재 규칙 표, C68 (2)). */
export const VERSION_RULES = [
  "version-content-changed",
  "revision-not-new",
  "new-cell-in-open-group",
  "correction-without-revision",
  "correction-not-new",
] as const;
export type VersionRule = (typeof VERSION_RULES)[number];

/** 판 적재 계획이 보는 행 하나. hash 는 P4c cellHash(칸 키, 칸 객체). */
export type VersionRow = SeedVersion & {
  table: SeedTable;
  cell: string;
  hash: string;
};
export type VersionViolation = {
  rule: VersionRule;
  table: SeedTable;
  cell: string;
  message: string;
};
export type VersionPlan = {
  /** 적재 앞 DB 다섯 표의 가장 큰 개정(G). */
  latestBefore: number;
  /** max(G, 넣는 행의 가장 큰 개정). */
  latestAfter: number;
  insert: VersionRow[];
  skip: VersionRow[];
  violations: VersionViolation[];
};

const placeOf = (table: SeedTable, cell: string) => `${table}\n${cell}`;

/**
 * 판 적재 계획(5절 · R5 · C68 (2)). existing 은 다섯 표의 모든 행이다(넣는 칸과 관계없이 G 를 세려고).
 * 규칙은 칸마다 따로 보고, 하나라도 걸리면 부르는 쪽이 적재 전체를 거부한다.
 */
export function planVersionRows(
  incoming: readonly VersionRow[],
  existing: readonly VersionRow[],
): VersionPlan {
  const latestBefore = latestRevision(existing);
  const byPlace = new Map<string, VersionRow[]>();
  const groupsWithRows = new Set<string>();
  for (const row of existing) {
    const place = placeOf(row.table, row.cell);
    byPlace.set(place, [...(byPlace.get(place) ?? []), row]);
    groupsWithRows.add(placeOf(row.table, cellGroupOf(row.cell)));
  }
  const insert: VersionRow[] = [];
  const skip: VersionRow[] = [];
  const violations: VersionViolation[] = [];
  const G = formatVersion({ revision: latestBefore, correction: 0 });

  for (const row of incoming) {
    const here = byPlace.get(placeOf(row.table, row.cell)) ?? [];
    const v = formatVersion(row);
    const fail = (rule: VersionRule, message: string) => {
      violations.push({ rule, table: row.table, cell: row.cell, message });
    };
    const same = here.find((e) => compareVersions(e, row) === 0);
    if (same) {
      if (same.hash === row.hash) skip.push(row);
      else
        fail(
          "version-content-changed",
          `${v} 판은 DB 에 있는데 내용이 다르다(판을 올리지 않고 고쳤다)`,
        );
      continue;
    }
    if (here.length === 0) {
      // 처음 생긴 칸: 행이 있는 묶음이면 G 를 넘어야 한다. 빈 묶음은 아직 아무도 시작하지 못했다.
      const group = placeOf(row.table, cellGroupOf(row.cell));
      if (groupsWithRows.has(group) && row.revision <= latestBefore) {
        fail(
          "new-cell-in-open-group",
          `행이 있는 묶음 ${cellGroupOf(row.cell)} 에 새로 생긴 칸의 판 ${v} 이 DB 의 가장 큰 개정 ${G} 을 넘지 않는다`,
        );
        continue;
      }
      insert.push(row);
      continue;
    }
    if (row.correction === 0) {
      if (row.revision <= latestBefore) {
        fail(
          "revision-not-new",
          `새 개정 ${v} 이 DB 의 가장 큰 개정 ${G} 을 넘지 않는다`,
        );
        continue;
      }
      insert.push(row);
      continue;
    }
    const sameRevision = here.filter((e) => e.revision === row.revision);
    if (sameRevision.length === 0) {
      fail(
        "correction-without-revision",
        `정정 ${v} 의 개정 ${row.revision} 행이 DB 에 없다`,
      );
      continue;
    }
    const maxCorrection = Math.max(...sameRevision.map((e) => e.correction));
    if (row.correction <= maxCorrection) {
      fail(
        "correction-not-new",
        `정정 ${v} 이 DB 의 ${formatVersion({ revision: row.revision, correction: maxCorrection })} 보다 크지 않다`,
      );
      continue;
    }
    insert.push(row);
  }
  return {
    latestBefore,
    latestAfter: Math.max(latestBefore, latestRevision(insert)),
    insert,
    skip,
    violations,
  };
}

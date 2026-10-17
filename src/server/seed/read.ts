import "server-only";
// 시드 판 고르기 읽기(plan-p07a 파일별 값 4, 5절 시드 판 · 요청자 결정 R5 · 4절 단원 미리보기).
// 시작 개정 이하 행만 SQL 로 걸러 읽고, 칸 고르기는 pickByCell · pickVersion 하나로 한다(고르기를 SQL 에 두지 않는다).
// 단원 · 단계 평가 · 배치 평가의 시작 개정은 시작할 때의 currentSeedRevision() 이다(5절). 시작 전 단원은 그 값을 넘긴다.
// 돌려주는 행은 Drizzle 선택 형 그대로이고, 내용 JSON 의 Zod 풀기는 부르는 쪽(P10~P12)이 P4a 규격으로 한다.
import { and, eq, isNotNull, lte, max, ne } from "drizzle-orm";
import type { Area, LESSON_KINDS, PlacementArea } from "@/core/seed/structure";
import {
  latestRevision,
  pickByCell,
  pickVersion,
} from "@/core/seed/version-pick";
import {
  lessons,
  levelSpecs,
  levelTestItems,
  placementItems,
  unitSpecs,
} from "@/db/schema/content";
import { type Db, getDb } from "@/server/db";

export type SeedReadOptions = { db?: Db };

/** 시드 테이블 다섯의 가장 큰 개정(빈 DB 0, 5절 '시드 전체 최신 개정 번호'). */
export async function currentSeedRevision({
  db = getDb(),
}: SeedReadOptions = {}): Promise<number> {
  const tables = [
    levelSpecs,
    unitSpecs,
    lessons,
    levelTestItems,
    placementItems,
  ];
  const maxima: { revision: number }[] = [];
  for (const table of tables) {
    const [row] = await db
      .select({ revision: max(table.revision) })
      .from(table);
    if (row?.revision !== null && row?.revision !== undefined) {
      maxima.push({ revision: row.revision });
    }
  }
  return latestRevision(maxima);
}

/** 수업 종류 차례(배정 · 다지기 · 알파벳 · 보강) — 단원 수업 목록의 차례. */
const KIND_ORDER: readonly string[] = [
  "assigned",
  "reinforce",
  "alphabet",
  "remedial",
] satisfies readonly (typeof LESSON_KINDS)[number][];

export type LessonRow = typeof lessons.$inferSelect;

/** 그 단원 칸마다 고른 lessons 행(종류 차례 assigned · reinforce · alphabet · remedial, 그다음 수업 번호 · 변형). */
export async function readLessonsOfUnit(
  input: { area: Area; level: number; unit: number; startRevision: number },
  { db = getDb() }: SeedReadOptions = {},
): Promise<LessonRow[]> {
  const rows = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, input.area),
        eq(lessons.level, input.level),
        eq(lessons.unit, input.unit),
        ne(lessons.kind, "tori_story"),
        isNotNull(lessons.topicVariant),
        lte(lessons.revision, input.startRevision),
      ),
    );
  const picked = pickByCell(
    rows,
    (r) => `${r.kind}:${r.lessonNo}:${r.topicVariant}`,
    input.startRevision,
  );
  return [...picked.values()].sort(
    (a, b) =>
      KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
      a.lessonNo - b.lessonNo ||
      (a.topicVariant ?? 0) - (b.topicVariant ?? 0),
  );
}

export type LevelSpecRow = typeof levelSpecs.$inferSelect;
export type UnitSpecRow = typeof unitSpecs.$inferSelect;

/** 고른 단계 규격 행 하나(없으면 undefined). */
export async function readLevelSpec(
  input: { area: Area; level: number; startRevision: number },
  { db = getDb() }: SeedReadOptions = {},
): Promise<LevelSpecRow | undefined> {
  const rows = await db
    .select()
    .from(levelSpecs)
    .where(
      and(
        eq(levelSpecs.area, input.area),
        eq(levelSpecs.level, input.level),
        lte(levelSpecs.revision, input.startRevision),
      ),
    );
  return pickVersion(rows, input.startRevision);
}

/** 고른 단원 규격 행 하나(없으면 undefined). */
export async function readUnitSpec(
  input: { area: Area; level: number; unit: number; startRevision: number },
  { db = getDb() }: SeedReadOptions = {},
): Promise<UnitSpecRow | undefined> {
  const rows = await db
    .select()
    .from(unitSpecs)
    .where(
      and(
        eq(unitSpecs.area, input.area),
        eq(unitSpecs.level, input.level),
        eq(unitSpecs.unit, input.unit),
        lte(unitSpecs.revision, input.startRevision),
      ),
    );
  return pickVersion(rows, input.startRevision);
}

export type LevelTestItemRow = typeof levelTestItems.$inferSelect;

/** 문항(회화는 장) 번호마다 고른 level_test_items 행(번호 차례). */
export async function readLevelTestForm(
  input: { area: Area; level: number; form: number; startRevision: number },
  { db = getDb() }: SeedReadOptions = {},
): Promise<LevelTestItemRow[]> {
  const rows = await db
    .select()
    .from(levelTestItems)
    .where(
      and(
        eq(levelTestItems.area, input.area),
        eq(levelTestItems.level, input.level),
        eq(levelTestItems.form, input.form),
        lte(levelTestItems.revision, input.startRevision),
      ),
    );
  return [
    ...pickByCell(rows, (r) => String(r.itemNo), input.startRevision).values(),
  ].sort((a, b) => a.itemNo - b.itemNo);
}

export type PlacementItemRow = typeof placementItems.$inferSelect;

/** (단계, 예비 여부, 문항 번호)마다 고른 placement_items 행(단계 · 본 문항 먼저 · 번호 차례). */
export async function readPlacementForm(
  input: { area: PlacementArea; form: number; startRevision: number },
  { db = getDb() }: SeedReadOptions = {},
): Promise<PlacementItemRow[]> {
  const rows = await db
    .select()
    .from(placementItems)
    .where(
      and(
        eq(placementItems.area, input.area),
        eq(placementItems.form, input.form),
        lte(placementItems.revision, input.startRevision),
      ),
    );
  return [
    ...pickByCell(
      rows,
      (r) => `${r.level}:${r.isSpare}:${r.itemNo}`,
      input.startRevision,
    ).values(),
  ].sort(
    (a, b) =>
      a.level - b.level ||
      Number(a.isSpare) - Number(b.isSpare) ||
      a.itemNo - b.itemNo,
  );
}

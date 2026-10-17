import "server-only";
// 시드 적재(plan-p07a 파일별 값 3, 5절 적재 · 설정값 시드 · 시드 테이블, 11절 (4-1), 13절 C68 (1) · (2) · (5)).
// 차례: 완전성 범위 → 시드 검증(P4c validateSeed) → 칸 모으기(collectCells) → 한 트랜잭션(자문 잠금 → 읽기 → 계획 → 검사 → 넣기) → 보고.
// 검증이나 검사에 하나라도 걸리면 한 행도 넣지 않는다(AC-17b). 행을 지우지 않는다. 학습 기록 · 운영 표는 읽지도 쓰지도 않는다.
// 시각은 부르는 쪽이 한 시계 값을 now 로 넘긴다. 질의 SQL 안에 now() 를 쓰지 않는다. 비울 수 있는 jsonb 에 JSON null 을 넣지 않는다.
// 목록 넷(동음이의어 · 금지어 · 형태 표 · 메타 문장)은 DB 에 넣지 않는다(5절 '빌드에 묶어 배포'). seed/reviews 는 읽지 않는다(C68 (3)).
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  capabilitiesOf,
  checkSettingsCombos,
  ModelCapabilitiesSchema,
} from "@/core/ai/combo";
import { type PriceRowLike, priceBookOf } from "@/core/ai/cost";
import { learningDayOf } from "@/core/learning-day";
import type {
  ImageEntry,
  LevelSpec,
  ModelPrice,
  UnitSpec,
  VocabEntry,
} from "@/core/seed/schema/reference";
import {
  compareSettings,
  type DbDefaultSetting,
  numberReader,
  SEED_LOAD_SOURCE,
  SettingsIncompleteError,
  type SettingsPlan,
  type SettingValue,
} from "@/core/seed/settings-compare";
import {
  AREAS,
  type Area,
  bandInfo,
  bandOf,
  cellKey,
  isLevel,
  LEVEL_MAX,
  LEVEL_MIN,
  type LessonKind,
  type PlacementArea,
  parseCellKey,
  SEED_FILES,
} from "@/core/seed/structure";
import {
  type CollectedCell,
  canonicalJson,
  cellHash,
  collectCells,
  exitCodeOf,
  type SeedReport,
  validateSeed,
} from "@/core/seed/validate";
import {
  levelSpecCell,
  planVersionRows,
  SEED_TABLES,
  type SeedTable,
  unitSpecCell,
  type VersionPlan,
  type VersionRow,
} from "@/core/seed/version-pick";
import { checkFrameRelations } from "@/core/vocab/allocate";
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
import { settings, settingsHistory } from "@/db/schema/operations";
import type { Db } from "@/server/db";

/** 동시 적재를 줄 세우는 자문 잠금 이름(기술 값). */
export const SEED_LOAD_LOCK_KEY = "momo.seed-load";
/** 한 번에 묶어 넣는 행 수(기술 값). */
export const INSERT_CHUNK_ROWS = 200;
/** 검증 거부 보고에 옮기는 오류 줄 수(기술 값). */
export const VALIDATION_ERROR_LINES = 20;
/** 단가 numeric(10,4) 의 소수 자리(5절 model_prices, P9a seedModelPrices 와 같다). */
const PRICE_DIGITS = 4;
/** 회화 평가 카드 장 행의 유형 값(제안). */
const TALK_SHEET_ITEM_TYPE = "talk-sheet";
/** 토리 이야기 행의 변형(P4a 칸 키의 변형 1). */
const STORY_TOPIC_VARIANT = 1;
const THROUGH_KEY = "seed.complete_through_level";
const TIMEZONE_KEY = "app.timezone";
const DAY_START_KEY = "app.day_start_hour";

// ── 보고 ─────────────────────────────────────────────────────────

export type LoadOptions = {
  /** seed/ 뿌리 기준 경로 → 글(P4c readSeedTree · 만들기 함수 seedTreeFiles 와 같은 꼴). */
  files: ReadonlyMap<string, string>;
  /** 완전성 범위의 마지막 단계. 개발용 적재의 덮어쓰기이기도 하다(11절 (4-1)). 없으면 settings.json 값. */
  completeThrough?: number;
  /** 수업 · 평가 · 배치 · 이야기 칸을 넣을 영역(기본 넷). */
  areas?: readonly Area[];
  /** 규격 파일만 넣는다(C68 (1)). 칸 영역은 비운다. */
  referenceOnly?: boolean;
  /** 계획 · 검사만 하고 되돌린다. */
  dryRun?: boolean;
  /** 한 시계 값(settings_history.changed_at · 단가 고르기 학습일). */
  now: Date;
};

export type LoadOutcome = "loaded" | "dry-run" | "refused";
export type LoadViolation = {
  rule: string;
  table?: string;
  cell?: string;
  key?: string;
  message: string;
};
export type UpsertCounts = {
  inserted: number;
  updated: number;
  unchanged: number;
  absentFromSeed: number;
};

/** 적재 보고(명령의 `--json` 꼴, version 1). counts 는 넣은 것(미리 돌림은 넣을 것), 거부면 0 이다. */
export type LoadReport = {
  version: 1;
  outcome: LoadOutcome;
  completeThrough: number | null;
  areas: Area[];
  referenceOnly: boolean;
  /** 검증 전에 거부하면 null. */
  validation: { code: 0 | 1; summary: SeedReport["summary"] } | null;
  /** DB 를 읽기 전에 거부하면 null. */
  latestRevision: { before: number; after: number } | null;
  counts: {
    cells: {
      inserted: Record<SeedTable, number>;
      skipped: Record<SeedTable, number>;
    };
    images: UpsertCounts;
    vocab: UpsertCounts;
    modelPrices: { inserted: number; unchanged: number };
    settings: {
      inserted: number;
      updated: number;
      kept: number;
      orphans: number;
      version: number;
    };
    history: number;
  };
  violations: LoadViolation[];
  /** 넣은 칸(seed/manifest 판 기록에 옮겨 쓴다, P8). */
  inserted: {
    table: SeedTable;
    cell: string;
    revision: number;
    correction: number;
  }[];
};

function tableCounts(): Record<SeedTable, number> {
  return Object.fromEntries(SEED_TABLES.map((t) => [t, 0])) as Record<
    SeedTable,
    number
  >;
}
function zeroUpsert(): UpsertCounts {
  return { inserted: 0, updated: 0, unchanged: 0, absentFromSeed: 0 };
}
function zeroCounts(settingsVersion = 0): LoadReport["counts"] {
  return {
    cells: { inserted: tableCounts(), skipped: tableCounts() },
    images: zeroUpsert(),
    vocab: zeroUpsert(),
    modelPrices: { inserted: 0, unchanged: 0 },
    settings: {
      inserted: 0,
      updated: 0,
      kept: 0,
      orphans: 0,
      version: settingsVersion,
    },
    history: 0,
  };
}

/** 사람용 출력에만 쓰는 설정 키 이름(값 없음). `--json` version 1 꼴에는 넣지 않는다(검토 M-4). */
export type SettingKeyNames = { kept: string[]; orphans: string[] };
export type LoadResult = { report: LoadReport; settingKeys: SettingKeyNames };

/** 트랜잭션을 되돌리며 보고를 들고 나가는 신호(거부 · 미리 돌림). */
class RollbackWith extends Error {
  constructor(readonly report: LoadReport) {
    super(`seed-load: ${report.outcome}`);
    this.name = "RollbackWith";
  }
}

// ── 시드 → 행 ────────────────────────────────────────────────────

type Payloads = {
  level_specs: Map<string, typeof levelSpecs.$inferInsert>;
  unit_specs: Map<string, typeof unitSpecs.$inferInsert>;
  lessons: Map<string, typeof lessons.$inferInsert>;
  level_test_items: Map<string, typeof levelTestItems.$inferInsert>;
  placement_items: Map<string, typeof placementItems.$inferInsert>;
};

type Incoming = {
  rows: VersionRow[];
  payloads: Payloads;
  violations: LoadViolation[];
};

function field(value: unknown, key: string): unknown {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)[key]
    : undefined;
}
function versionOf(value: unknown): { revision: number; correction: number } {
  return {
    revision: field(value, "revision") as number,
    correction: field(value, "correction") as number,
  };
}

/** 배치 문항의 정답 칸(answerNo · accepted · sentence 가운데 있는 것만, 제안). */
export function answerOf(item: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ["answerNo", "accepted", "sentence"]) {
    const value = field(item, key);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function unitSpecBody(spec: {
  area: Area;
  level: number;
  unit: number;
  learningElement: unknown;
  topic: string;
  words: readonly string[];
}) {
  return {
    area: spec.area,
    level: spec.level,
    unit: spec.unit,
    learningElement: spec.learningElement,
    topic: spec.topic,
    words: [...spec.words],
  };
}

/**
 * 적재의 불변식 오류(검토 N-1). 메시지에는 칸 키 · 파일 이름만 담는다(칸 내용 · SQL · 질의 인자 없음).
 * 명령은 이 갈래의 메시지를 그대로 내고, 다른 오류는 이름 · 코드만 낸다.
 */
export class SeedLoadInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedLoadInvariantError";
  }
}

/** 칸 키와 칸 종류가 맞지 않는 불변식 오류(collectCells 가 cellKey 로 키를 만들어 닿지 않아야 한다, 검토 M-3). */
function cellKindMismatch(key: string): SeedLoadInvariantError {
  return new SeedLoadInvariantError(`칸 키와 칸 종류가 맞지 않는다: ${key}`);
}

/** 시드 규격 행 · 칸을 넣을 행과 판 계획 행으로 바꾼다(시험이 불변식 오류를 보려고 내보낸다). */
export function buildIncoming(
  levelSpecRows: readonly LevelSpec[],
  unitSpecRows: readonly UnitSpec[],
  cells: readonly CollectedCell[],
): Incoming {
  const payloads: Payloads = {
    level_specs: new Map(),
    unit_specs: new Map(),
    lessons: new Map(),
    level_test_items: new Map(),
    placement_items: new Map(),
  };
  const rows: VersionRow[] = [];
  const violations: LoadViolation[] = [];
  /** 판은 칸 객체에서, 해시는 cellHash(칸 키, 칸 객체)로(단원 규격은 DB 열에서 되살릴 수 있는 꼴로). */
  const add = (
    table: SeedTable,
    cell: string,
    value: unknown,
    hashed: unknown = value,
  ) => {
    rows.push({
      table,
      cell,
      ...versionOf(value),
      hash: cellHash(cell, hashed),
    });
  };

  for (const spec of levelSpecRows) {
    const cell = levelSpecCell(spec.area, spec.level);
    add("level_specs", cell, spec);
    payloads.level_specs.set(cell, {
      area: spec.area,
      level: spec.level,
      cefr: spec.cefr,
      band: spec.band,
      canDo: spec.canDo,
      spec,
      revision: spec.revision,
      correction: spec.correction,
    });
  }
  for (const spec of unitSpecRows) {
    const cell = unitSpecCell(spec.area, spec.level, spec.unit);
    add("unit_specs", cell, spec, unitSpecBody(spec));
    payloads.unit_specs.set(cell, {
      area: spec.area,
      level: spec.level,
      unit: spec.unit,
      learningPoints: spec.learningElement,
      topic: spec.topic,
      targetVocab: [...spec.words],
      revision: spec.revision,
      correction: spec.correction,
    });
  }

  for (const cell of cells) {
    const ref = parseCellKey(cell.key);
    const value = cell.value;
    const version = versionOf(value);
    switch (cell.kind) {
      case "lesson": {
        if (ref?.type !== "lesson") throw cellKindMismatch(cell.key);
        add("lessons", cell.key, value);
        payloads.lessons.set(cell.key, {
          area: ref.area,
          level: ref.level,
          unit: ref.unit,
          kind: ref.kind,
          lessonNo: ref.lessonNo,
          topicVariant: ref.variant,
          listTitle: field(value, "title") as string,
          content: value,
          newWords: [...(field(value, "newWords") as string[])],
          unitWords: [...(field(value, "unitWords") as string[])],
          generation: field(value, "generation"),
          ...version,
        });
        break;
      }
      case "story": {
        if (ref?.type !== "story") throw cellKindMismatch(cell.key);
        const title = field(value, "title");
        const generation = field(value, "generation");
        const missing = [
          ...(typeof title === "string" ? [] : ["title"]),
          ...(generation === undefined ? ["generation"] : []),
        ];
        if (missing.length > 0) {
          // lessons 의 목록 제목 · 생성 기록은 비울 수 없다. 지어내지 않고 거부한다(정할 것 타)
          violations.push({
            rule: "story-field-missing",
            table: "lessons",
            cell: cell.key,
            message: `토리 이야기에 ${missing.join(" · ")} 가 없다`,
          });
          break;
        }
        add("lessons", cell.key, value);
        payloads.lessons.set(cell.key, {
          area: "talk",
          level: bandInfo(ref.band).first,
          unit: null,
          kind: "tori_story",
          lessonNo: ref.no,
          topicVariant: STORY_TOPIC_VARIANT,
          listTitle: title as string,
          content: value,
          newWords: [],
          unitWords: [],
          generation,
          ...version,
        });
        break;
      }
      case "test-item":
      case "talk-sheet": {
        if (ref?.type !== "level-test") throw cellKindMismatch(cell.key);
        add("level_test_items", cell.key, value);
        payloads.level_test_items.set(cell.key, {
          area: ref.area,
          level: ref.level,
          form: ref.form,
          itemNo: ref.no,
          itemType:
            cell.kind === "talk-sheet"
              ? TALK_SHEET_ITEM_TYPE
              : (field(value, "type") as string),
          item: value,
          ...version,
        });
        break;
      }
      case "placement": {
        if (ref?.type !== "placement") throw cellKindMismatch(cell.key);
        add("placement_items", cell.key, value);
        payloads.placement_items.set(cell.key, {
          area: ref.area,
          level: ref.level,
          form: ref.form,
          itemNo: ref.no,
          isSpare: ref.spare,
          itemType: field(value, "type") as string,
          item: value,
          answer: answerOf(value),
          ...version,
        });
        break;
      }
    }
  }
  return { rows, payloads, violations };
}

// ── DB 읽기 ──────────────────────────────────────────────────────

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function readVersionRows(tx: Tx): Promise<VersionRow[]> {
  const out: VersionRow[] = [];
  for (const row of await tx
    .select({
      area: levelSpecs.area,
      level: levelSpecs.level,
      spec: levelSpecs.spec,
      revision: levelSpecs.revision,
      correction: levelSpecs.correction,
    })
    .from(levelSpecs)) {
    const cell = levelSpecCell(row.area, row.level);
    out.push({
      table: "level_specs",
      cell,
      revision: row.revision,
      correction: row.correction,
      hash: cellHash(cell, row.spec),
    });
  }
  for (const row of await tx.select().from(unitSpecs)) {
    const cell = unitSpecCell(row.area, row.level, row.unit);
    out.push({
      table: "unit_specs",
      cell,
      revision: row.revision,
      correction: row.correction,
      hash: cellHash(
        cell,
        unitSpecBody({
          area: row.area,
          level: row.level,
          unit: row.unit,
          learningElement: row.learningPoints,
          topic: row.topic,
          words: row.targetVocab,
        }),
      ),
    });
  }
  for (const row of await tx
    .select({
      area: lessons.area,
      level: lessons.level,
      unit: lessons.unit,
      kind: lessons.kind,
      lessonNo: lessons.lessonNo,
      topicVariant: lessons.topicVariant,
      content: lessons.content,
      revision: lessons.revision,
      correction: lessons.correction,
    })
    .from(lessons)) {
    let cell: string;
    if (row.kind === "tori_story") {
      cell = cellKey({
        type: "story",
        band: bandOf(row.level),
        no: row.lessonNo,
      });
    } else {
      if (row.unit === null || row.topicVariant === null) {
        throw new Error(
          `lessons 행의 단원 · 변형이 비었다(${row.area} ${row.level} ${row.kind} ${row.lessonNo})`,
        );
      }
      cell = cellKey({
        type: "lesson",
        area: row.area,
        level: row.level,
        unit: row.unit,
        kind: row.kind as LessonKind,
        lessonNo: row.lessonNo,
        variant: row.topicVariant,
      });
    }
    out.push({
      table: "lessons",
      cell,
      revision: row.revision,
      correction: row.correction,
      hash: cellHash(cell, row.content),
    });
  }
  for (const row of await tx
    .select({
      area: levelTestItems.area,
      level: levelTestItems.level,
      form: levelTestItems.form,
      itemNo: levelTestItems.itemNo,
      item: levelTestItems.item,
      revision: levelTestItems.revision,
      correction: levelTestItems.correction,
    })
    .from(levelTestItems)) {
    const cell = cellKey({
      type: "level-test",
      area: row.area,
      level: row.level,
      form: row.form,
      no: row.itemNo,
    });
    out.push({
      table: "level_test_items",
      cell,
      revision: row.revision,
      correction: row.correction,
      hash: cellHash(cell, row.item),
    });
  }
  for (const row of await tx
    .select({
      area: placementItems.area,
      level: placementItems.level,
      form: placementItems.form,
      itemNo: placementItems.itemNo,
      isSpare: placementItems.isSpare,
      item: placementItems.item,
      revision: placementItems.revision,
      correction: placementItems.correction,
    })
    .from(placementItems)) {
    const cell = cellKey({
      type: "placement",
      area: row.area as PlacementArea,
      level: row.level,
      form: row.form,
      no: row.itemNo,
      spare: row.isSpare,
    });
    out.push({
      table: "placement_items",
      cell,
      revision: row.revision,
      correction: row.correction,
      hash: cellHash(cell, row.item),
    });
  }
  return out;
}

// ── 판 없는 표의 계획(C68 (2)) ───────────────────────────────────

type UpsertPlan<Row> = {
  inserts: Row[];
  updates: Row[];
  unchanged: number;
  absentFromSeed: number;
};

function planUpsert<Row extends Record<string, unknown>>(
  seedRows: readonly Row[],
  dbRows: readonly Row[],
  keyOf: (row: Row) => string,
): UpsertPlan<Row> {
  const dbByKey = new Map(dbRows.map((row) => [keyOf(row), row]));
  const seedKeys = new Set(seedRows.map(keyOf));
  const plan: UpsertPlan<Row> = {
    inserts: [],
    updates: [],
    unchanged: 0,
    absentFromSeed: dbRows.filter((row) => !seedKeys.has(keyOf(row))).length,
  };
  for (const row of seedRows) {
    const current = dbByKey.get(keyOf(row));
    if (!current) plan.inserts.push(row);
    else if (canonicalJson(current) === canonicalJson(row)) plan.unchanged++;
    else plan.updates.push(row);
  }
  return plan;
}

type ImageRow = {
  key: string;
  path: string;
  source: string;
  license: ImageEntry["license"];
  attribution: string | null;
  word: string | null;
};
function imageRowOf(entry: ImageEntry): ImageRow {
  return {
    key: entry.key,
    path: entry.file,
    source: entry.source,
    license: entry.license,
    attribution: entry.attribution ?? null,
    word: entry.word,
  };
}

type VocabRow = {
  word: string;
  meaning: string;
  partsOfSpeech: string[];
  example: string | null;
  bandLevel: number;
  forms: unknown;
  imageKey: string | null;
};
function vocabRowOf(entry: VocabEntry): VocabRow {
  return {
    word: entry.word,
    meaning: entry.meaningKo,
    partsOfSpeech: [...entry.pos],
    example: entry.example,
    bandLevel: entry.level,
    forms: [...entry.forms],
    imageKey: entry.imageKey ?? null,
  };
}

type PriceRow = typeof modelPrices.$inferInsert;
function priceRowOf(entry: ModelPrice): PriceRow {
  return {
    model: entry.model,
    effectiveFrom: entry.effectiveFrom,
    inputUsdPerMtok: entry.inputUsdPerMTok.toFixed(PRICE_DIGITS),
    outputUsdPerMtok: entry.outputUsdPerMTok.toFixed(PRICE_DIGITS),
    cacheWriteUsdPerMtok: entry.cacheWriteUsdPerMTok.toFixed(PRICE_DIGITS),
    cacheReadUsdPerMtok: entry.cacheReadUsdPerMTok.toFixed(PRICE_DIGITS),
    capabilities: capabilitiesOf(entry),
  };
}
const priceKeyOf = (row: { model: string; effectiveFrom: string }) =>
  `${row.model} ${row.effectiveFrom}`;
function samePrice(a: PriceRow, b: PriceRow): boolean {
  return (
    a.inputUsdPerMtok === b.inputUsdPerMtok &&
    a.outputUsdPerMtok === b.outputUsdPerMtok &&
    a.cacheWriteUsdPerMtok === b.cacheWriteUsdPerMtok &&
    a.cacheReadUsdPerMtok === b.cacheReadUsdPerMtok &&
    canonicalJson(a.capabilities) === canonicalJson(b.capabilities)
  );
}
function priceRowLikeOf(row: PriceRow): PriceRowLike | undefined {
  const caps = ModelCapabilitiesSchema.safeParse(row.capabilities);
  if (!caps.success) return undefined;
  return {
    model: row.model,
    effectiveFrom: row.effectiveFrom,
    inputUsd: row.inputUsdPerMtok,
    outputUsd: row.outputUsdPerMtok,
    cacheWriteUsd: row.cacheWriteUsdPerMtok,
    cacheReadUsd: row.cacheReadUsdPerMtok,
    caps: caps.data,
  };
}

// ── 검사 ─────────────────────────────────────────────────────────

function settingsChecks(
  plan: SettingsPlan,
  priceRows: readonly PriceRow[],
  levelSpecRows: readonly LevelSpec[],
  now: Date,
  /** DB 단가 행이 규격에 맞지 않으면 단가표를 믿을 수 없어 조합 검사를 건너뛴다(그 행으로 이미 거부한다). */
  { skipCombos = false }: { skipCombos?: boolean } = {},
): LoadViolation[] {
  const out: LoadViolation[] = [];
  const values = plan.values;
  const timezone = values[TIMEZONE_KEY];
  const dayStart = values[DAY_START_KEY];
  let onDay: string | undefined;
  if (typeof timezone !== "string" || typeof dayStart !== "number") {
    out.push({
      rule: "settings-incomplete",
      key: typeof timezone !== "string" ? TIMEZONE_KEY : DAY_START_KEY,
      message: "학습일을 셀 설정값이 없거나 꼴이 틀리다",
    });
  } else {
    try {
      onDay = learningDayOf(now, timezone, dayStart);
    } catch (error) {
      out.push({
        rule: "settings-incomplete",
        key: TIMEZONE_KEY,
        message: `학습일을 세지 못했다: ${(error as Error).message}`,
      });
    }
  }
  if (onDay !== undefined && !skipCombos) {
    const rows = priceRows
      .map(priceRowLikeOf)
      .filter((r): r is PriceRowLike => r !== undefined);
    const book = priceBookOf(rows, onDay);
    for (const v of checkSettingsCombos(values, book)) {
      for (const reason of v.reasons) {
        out.push({
          rule: `combo:${v.keyBase}:${reason}`,
          key: `ai.model.${v.keyBase}`,
          message: `ai.model · ai.effort · ai.thinking.${v.keyBase} 조합을 6.1 조합 표가 받지 않는다(${reason})`,
        });
      }
    }
  }
  try {
    for (const v of checkFrameRelations({
      settings: numberReader(values),
      levelSpecs: levelSpecRows,
    })) {
      out.push({
        rule: v.rule,
        ...(v.area ? { table: "level_specs" } : {}),
        key: v.band,
        message: v.message,
      });
    }
  } catch (error) {
    if (!(error instanceof SettingsIncompleteError)) throw error;
    out.push({
      rule: "settings-incomplete",
      key: error.key,
      message: error.message,
    });
  }
  return out;
}

// ── 넣기 ─────────────────────────────────────────────────────────

function chunks<T>(rows: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += INSERT_CHUNK_ROWS) {
    out.push(rows.slice(i, i + INSERT_CHUNK_ROWS));
  }
  return out;
}

async function insertSeedRows(
  tx: Tx,
  plan: VersionPlan,
  payloads: Payloads,
): Promise<void> {
  const rowsOf = <T>(table: SeedTable, map: Map<string, T>): T[] =>
    plan.insert
      .filter((r) => r.table === table)
      .map((r) => {
        const row = map.get(r.cell);
        if (!row) throw new Error(`넣을 행이 없다: ${table} ${r.cell}`);
        return row;
      });
  for (const chunk of chunks(rowsOf("level_specs", payloads.level_specs)))
    await tx.insert(levelSpecs).values(chunk);
  for (const chunk of chunks(rowsOf("unit_specs", payloads.unit_specs)))
    await tx.insert(unitSpecs).values(chunk);
  for (const chunk of chunks(rowsOf("lessons", payloads.lessons)))
    await tx.insert(lessons).values(chunk);
  for (const chunk of chunks(
    rowsOf("level_test_items", payloads.level_test_items),
  ))
    await tx.insert(levelTestItems).values(chunk);
  for (const chunk of chunks(
    rowsOf("placement_items", payloads.placement_items),
  ))
    await tx.insert(placementItems).values(chunk);
}

// ── 적재 ─────────────────────────────────────────────────────────

/** settings.json 의 seed.complete_through_level(1~12 정수가 아니면 undefined). */
function throughOfSettings(
  files: ReadonlyMap<string, string>,
): number | undefined {
  try {
    const parsed = JSON.parse(files.get(SEED_FILES.settings) ?? "") as {
      settings?: { key?: unknown; value?: unknown }[];
    };
    const value = parsed.settings?.find((r) => r.key === THROUGH_KEY)?.value;
    return isLevel(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function validationViolations(report: SeedReport): LoadViolation[] {
  const out: LoadViolation[] = report.errors
    .slice(0, VALIDATION_ERROR_LINES)
    .map((e) => ({
      rule: "validate",
      ...(e.cell ? { cell: e.cell } : {}),
      message: `${e.rule} ${e.file}:${e.path} ${e.message}`,
    }));
  if (report.errors.length > VALIDATION_ERROR_LINES) {
    out.push({
      rule: "validate",
      message: `오류 ${report.errors.length} 줄 가운데 앞 ${VALIDATION_ERROR_LINES} 줄만 옮겼다`,
    });
  }
  const s = report.summary;
  if (s.empty > 0 || s.unchecked > 0 || s.pendingHuman > 0) {
    out.push({
      rule: "validate",
      message: `빈 칸 ${s.empty} · 풀이 검사 안 됨 ${s.unchecked} · 사람 확인 ${s.pendingHuman}`,
    });
  }
  return out;
}

/**
 * 시드를 적재한다(5절). 검증 → 계획 → 조합 · 관계 검사 → 한 트랜잭션에 넣기 → 보고.
 * 거부 · 미리 돌림은 트랜잭션을 되돌리고 보고를 돌려준다. DB 오류는 그대로 던진다(트랜잭션은 되돌아간다).
 */
export async function loadSeed(
  db: Db,
  options: LoadOptions,
): Promise<LoadReport> {
  return (await loadSeedWithKeys(db, options)).report;
}

/** loadSeed 와 같고, 지킨 키 · 시드에 없는 DB 키의 이름을 함께 돌려준다(명령의 사람용 출력). */
export async function loadSeedWithKeys(
  db: Db,
  options: LoadOptions,
): Promise<LoadResult> {
  const settingKeys: SettingKeyNames = { kept: [], orphans: [] };
  const result = (report: LoadReport): LoadResult => ({ report, settingKeys });
  const referenceOnly = options.referenceOnly ?? false;
  const areas: Area[] = referenceOnly ? [] : [...(options.areas ?? AREAS)];
  const through = options.completeThrough ?? throughOfSettings(options.files);
  const report: LoadReport = {
    version: 1,
    outcome: "refused",
    completeThrough: through ?? null,
    areas,
    referenceOnly,
    validation: null,
    latestRevision: null,
    counts: zeroCounts(),
    violations: [],
    inserted: [],
  };
  if (through === undefined || !isLevel(through)) {
    report.violations.push({
      rule: "settings-incomplete",
      key: THROUGH_KEY,
      message: `완전성 범위가 단계 ${LEVEL_MIN}~${LEVEL_MAX} 정수가 아니다`,
    });
    return result(report);
  }

  // 1) 검증(AC-17b): 실패하면 DB 에 닿지 않는다
  const validation = validateSeed(options.files, {
    mode: "complete",
    through,
    areas,
  });
  const code = exitCodeOf(validation);
  report.validation = { code, summary: validation.summary };
  if (code !== 0) {
    report.violations = validationViolations(validation);
    return result(report);
  }

  // 2) 칸 모으기(손으로 다시 걷지 않는다, P4c 위험 11)
  const seed = collectCells(options.files, { areas });
  const ref = seed.reference;
  if (
    !ref.settings ||
    !ref.levelSpecs ||
    !ref.unitSpecs ||
    !ref.vocab ||
    !ref.images ||
    !ref.modelPrices
  ) {
    const missing = (
      [
        ["settings", ref.settings],
        ["levelSpecs", ref.levelSpecs],
        ["unitSpecs", ref.unitSpecs],
        ["vocab", ref.vocab],
        ["images", ref.images],
        ["modelPrices", ref.modelPrices],
      ] as const
    )
      .filter(([, file]) => file === undefined)
      .map(([name]) => SEED_FILES[name]);
    throw new SeedLoadInvariantError(
      `검증을 넘었는데 규격 파일이 없다: ${missing.join(" · ")}`,
    );
  }
  const {
    settings: settingsFile,
    images: imagesFile,
    vocab: vocabFile,
    modelPrices: pricesFile,
  } = ref;
  const levelSpecRows = ref.levelSpecs.levelSpecs;
  const incoming = buildIncoming(
    levelSpecRows,
    ref.unitSpecs.unitSpecs,
    seed.cells,
  );
  const overrides: Record<string, SettingValue> =
    options.completeThrough !== undefined
      ? { [THROUGH_KEY]: options.completeThrough }
      : {};

  try {
    return result(
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtext(${SEED_LOAD_LOCK_KEY}))`,
        );
        // 3) 읽기
        const existing = await readVersionRows(tx);
        const dbImages = await tx.select().from(images);
        const dbVocab = await tx
          .select({
            word: vocab.word,
            meaning: vocab.meaning,
            partsOfSpeech: vocab.partsOfSpeech,
            example: vocab.example,
            bandLevel: vocab.bandLevel,
            forms: vocab.forms,
            imageKey: vocab.imageKey,
          })
          .from(vocab);
        const dbPrices = (
          await tx
            .select({
              model: modelPrices.model,
              effectiveFrom: modelPrices.effectiveFrom,
              inputUsdPerMtok: modelPrices.inputUsdPerMtok,
              outputUsdPerMtok: modelPrices.outputUsdPerMtok,
              cacheWriteUsdPerMtok: modelPrices.cacheWriteUsdPerMtok,
              cacheReadUsdPerMtok: modelPrices.cacheReadUsdPerMtok,
              capabilities: modelPrices.capabilities,
            })
            .from(modelPrices)
        ).map((row): PriceRow => row);
        const dbSettings = await tx
          .select({
            key: settings.key,
            scope: settings.scope,
            profileId: settings.profileId,
            value: settings.value,
            version: settings.version,
          })
          .from(settings);
        const maxVersion = dbSettings.reduce(
          (m, r) => Math.max(m, r.version),
          0,
        );

        // 4) 계획
        const versionPlan = planVersionRows(incoming.rows, existing);
        const defaults: DbDefaultSetting[] = dbSettings
          .filter((r) => r.profileId === null)
          .map((r) => ({ key: r.key, scope: r.scope, value: r.value }));
        const settingsPlan = compareSettings(
          settingsFile.settings,
          defaults,
          overrides,
        );
        settingKeys.kept = settingsPlan.kept.map((k) => k.key);
        settingKeys.orphans = [...settingsPlan.orphans];
        const imagePlan = planUpsert(
          imagesFile.images.map(imageRowOf),
          dbImages,
          (r) => r.key,
        );
        const vocabPlan = planUpsert(
          vocabFile.vocab.map(vocabRowOf),
          dbVocab,
          (r) => r.word,
        );
        // DB 단가 행의 조합 칸이 규격에 맞지 않으면(사람이 SQL 로 고친 행) 적재 전체를 거부한다 — 검사하지 않은 값으로
        // 조합 검사를 지나게 두지 않는다(검토 M-2, 컨트롤러 판정). 위반 줄에는 모델 · 적용일만 둔다(값 없음).
        const invalidPriceKeys = new Set(
          dbPrices
            .filter((r) => priceRowLikeOf(r) === undefined)
            .map(priceKeyOf),
        );
        const dbPriceByKey = new Map(dbPrices.map((r) => [priceKeyOf(r), r]));
        const priceInserts: PriceRow[] = [];
        let priceUnchanged = 0;
        const priceViolations: LoadViolation[] = [...invalidPriceKeys].map(
          (key) => ({
            rule: "price-row-invalid",
            table: "model_prices",
            key,
            message:
              "DB 단가 줄의 조합 칸(capabilities)이 규격에 맞지 않는다. 그 행을 SQL 편집기에서 바로잡는다. 이 행을 바로잡기 전까지 조합 검사는 건너뛴다",
          }),
        );
        for (const entry of pricesFile.models) {
          const row = priceRowOf(entry);
          const current = dbPriceByKey.get(priceKeyOf(row));
          if (invalidPriceKeys.has(priceKeyOf(row))) continue;
          if (!current) priceInserts.push(row);
          else if (samePrice(current, row)) priceUnchanged++;
          else
            priceViolations.push({
              rule: "price-row-changed",
              table: "model_prices",
              key: priceKeyOf(row),
              message:
                "같은 (모델, 적용일) 단가 줄의 단가나 조합 칸이 DB 와 다르다(바꾸려면 새 적용일 행을 더한다)",
            });
        }

        // 5) 검사
        const violations: LoadViolation[] = [
          ...incoming.violations,
          ...versionPlan.violations.map((v) => ({
            rule: v.rule,
            table: v.table,
            cell: v.cell,
            message: v.message,
          })),
          ...settingsPlan.violations.map((v) => ({
            rule: v.rule,
            table: "settings",
            key: v.key,
            message: v.message,
          })),
          ...priceViolations,
          ...settingsChecks(
            settingsPlan,
            [...dbPrices, ...priceInserts],
            levelSpecRows,
            options.now,
            { skipCombos: invalidPriceKeys.size > 0 },
          ),
        ];
        const latest = versionPlan.latestBefore;
        if (violations.length > 0) {
          throw new RollbackWith({
            ...report,
            latestRevision: { before: latest, after: latest },
            counts: zeroCounts(maxVersion),
            violations,
          });
        }

        const changed =
          settingsPlan.inserts.length > 0 || settingsPlan.updates.length > 0;
        const version = changed ? maxVersion + 1 : maxVersion;
        const counts = zeroCounts(version);
        for (const r of versionPlan.insert) counts.cells.inserted[r.table]++;
        for (const r of versionPlan.skip) counts.cells.skipped[r.table]++;
        counts.images = {
          inserted: imagePlan.inserts.length,
          updated: imagePlan.updates.length,
          unchanged: imagePlan.unchanged,
          absentFromSeed: imagePlan.absentFromSeed,
        };
        counts.vocab = {
          inserted: vocabPlan.inserts.length,
          updated: vocabPlan.updates.length,
          unchanged: vocabPlan.unchanged,
          absentFromSeed: vocabPlan.absentFromSeed,
        };
        counts.modelPrices = {
          inserted: priceInserts.length,
          unchanged: priceUnchanged,
        };
        counts.settings = {
          inserted: settingsPlan.inserts.length,
          updated: settingsPlan.updates.length,
          kept: settingsPlan.kept.length,
          orphans: settingsPlan.orphans.length,
          version,
        };
        counts.history = settingsPlan.updates.length;
        const planned: LoadReport = {
          ...report,
          latestRevision: { before: latest, after: versionPlan.latestAfter },
          counts,
          inserted: versionPlan.insert.map((r) => ({
            table: r.table,
            cell: r.cell,
            revision: r.revision,
            correction: r.correction,
          })),
        };
        if (options.dryRun) {
          throw new RollbackWith({ ...planned, outcome: "dry-run" });
        }

        // 6) 넣기: images → vocab → model_prices → 시드 테이블 다섯 → settings → settings_history
        for (const chunk of chunks(imagePlan.inserts))
          await tx.insert(images).values(chunk);
        for (const row of imagePlan.updates) {
          const { key, ...rest } = row;
          await tx.update(images).set(rest).where(eq(images.key, key));
        }
        for (const chunk of chunks(vocabPlan.inserts))
          await tx.insert(vocab).values(chunk);
        for (const row of vocabPlan.updates) {
          // id 는 DB 가 처음 만든 것을 그대로 둔다(vocab_progress 가 가리킨다, C54 (3) · C56 (5))
          const { word, ...rest } = row;
          await tx.update(vocab).set(rest).where(eq(vocab.word, word));
        }
        for (const chunk of chunks(priceInserts))
          await tx.insert(modelPrices).values(chunk);
        await insertSeedRows(tx, versionPlan, incoming.payloads);
        for (const chunk of chunks(settingsPlan.inserts)) {
          await tx.insert(settings).values(
            chunk.map((row) => ({
              key: row.key,
              scope: row.scope,
              profileId: null,
              value: row.value,
              version,
            })),
          );
        }
        for (const row of settingsPlan.updates) {
          await tx
            .update(settings)
            .set({ value: row.newValue, version })
            .where(and(eq(settings.key, row.key), isNull(settings.profileId)));
        }
        for (const chunk of chunks(settingsPlan.updates)) {
          await tx.insert(settingsHistory).values(
            chunk.map((row) => ({
              key: row.key,
              profileId: null,
              oldValue: row.oldValue,
              newValue: row.newValue,
              changedAt: options.now,
              appliesFrom: null,
              source: SEED_LOAD_SOURCE,
            })),
          );
        }
        return { ...planned, outcome: "loaded" as const };
      }),
    );
  } catch (error) {
    if (error instanceof RollbackWith) return result(error.report);
    throw error;
  }
}

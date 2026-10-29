// 시드 검증(plan-p04c 'validate.ts'): 읽은 파일 묶음을 규격으로 풀고 모든 검사(P4b 정합 · 칸 검사, P4c 회화 · 평가 · 묶음)를 돌려
// 보고를 만든다. 칸 내용 해시 · 문항 번호 · 풀이 대상 · 풀이 검사 상태 · 완전성 · 종료 코드. 풀이 검사는 seed/checks 기록만 읽고
// API 를 부르지 않는다(AC-7d). 파일 시스템을 읽지 않는다(파일 읽기는 scripts/seed-validate.ts). node:crypto 만 쓴다.
import { createHash } from "node:crypto";
import type { z } from "zod";
import {
  checkLevelTestFile,
  checkPlacementFile,
  checkStoryFile,
  type LessonCorpus,
  lessonCorpus,
} from "@/core/seed/check-assessment";
import {
  checkCanDo,
  checkDistribution,
  checkRelations,
  checkRemedialCoverage,
  checkTopicVariants,
  type SeedWarning,
  type UnitLessons,
  unitStats,
} from "@/core/seed/check-cross";
import {
  type CheckedArea,
  checkLessonCell,
  type SeedIssue,
} from "@/core/seed/check-lesson";
import { checkTalkCard, checkTalkUnit } from "@/core/seed/check-talk";
import {
  checkTeacherAssets,
  type TeacherAssetIo,
} from "@/core/seed/check-teacher";
import {
  buildReferenceIndex,
  type ReferenceFiles,
  type ReferenceIndex,
} from "@/core/seed/reference-index";
import {
  type LevelTestFile,
  LevelTestFileSchema,
  type PlacementFile,
  PlacementFileSchema,
  type StoryFile,
  StoryFileSchema,
} from "@/core/seed/schema/assessment";
import {
  LESSON_SCHEMAS,
  type Lesson,
  LessonFileShellSchema,
  type LessonOf,
  type TalkLesson,
} from "@/core/seed/schema/lesson";
import {
  CheckFileSchema,
  type CheckRecord,
  ReviewFileSchema,
} from "@/core/seed/schema/records";
import {
  ForbiddenFileSchema,
  HomophonesFileSchema,
  ImagesFileSchema,
  LevelSpecsFileSchema,
  ListFormsFileSchema,
  MetaSentencesFileSchema,
  ModelPricesFileSchema,
  SettingsFileSchema,
  UnitSpecsFileSchema,
  VocabFileSchema,
} from "@/core/seed/schema/reference";
import { TeachersFileSchema } from "@/core/seed/schema/teachers";
import {
  ALPHABET_UNIT,
  AREAS,
  type Area,
  BAND_INFOS,
  cellKey,
  isAlphabetUnit,
  LESSON_KINDS,
  LEVEL_MAX,
  LEVEL_MIN,
  type LessonKind,
  PLACEMENT_AREAS,
  type PlacementArea,
  parseSeedPath,
  READING_QUESTION_TYPES,
  SEED_FILES,
  type SeedContentPath,
  type SeedFileName,
  type SeedPath,
  STORIES_PER_BAND,
  UNITS_PER_LEVEL,
  WRITING_ITEM_TYPES,
} from "@/core/seed/structure";

// ── 칸 · 해시 · 문항 번호 · 풀이 대상 ─────────────────────────────

export type CellKind =
  | "lesson"
  | "test-item"
  | "talk-sheet"
  | "placement"
  | "story";
/** 검증기가 보는 칸 하나(칸 키 · 종류 · 영역 · 칸 객체). */
export type SeedCell = {
  key: string;
  kind: CellKind;
  area?: Area;
  value: unknown;
};
/** 칸 안의 문항 하나(5절 seed_reports '문항 번호', path 는 칸 객체 기준). */
export type SeedItem = { no: number; path: string };

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value as object)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])]),
    );
  }
  return value;
}

/** 정규 JSON: 객체 키를 사전 순으로, 공백 없이(undefined 칸은 JSON 처럼 뺀다). */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(JSON.parse(JSON.stringify(value ?? null))));
}

/**
 * 칸 내용 해시(6.4 '칸의 내용 해시'): sha256 16진(칸 키 + 줄바꿈 + 정규 JSON(칸에서 revision · correction · generation 을 뺀 것)).
 * P5 풀이 검사 · P7 적재가 기댄다. 정의를 바꾸면 seed/checks 를 모두 다시 풀어야 한다(plan 위험 5).
 */
export function cellHash(key: string, cell: unknown): string {
  const body =
    cell && typeof cell === "object" && !Array.isArray(cell)
      ? Object.fromEntries(
          Object.entries(cell as Record<string, unknown>).filter(
            ([k]) =>
              k !== "revision" && k !== "correction" && k !== "generation",
          ),
        )
      : cell;
  return createHash("sha256")
    .update(`${key}\n${canonicalJson(body)}`)
    .digest("hex");
}

function list<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
function field(value: unknown, key: string): unknown {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

/**
 * 문항 번호(1부터, plan-p04c itemsOf): 읽기 = 문항 차례, 쓰기 = items 문항 · 문장 틀 차례 · 작문 1,
 * 말하기 = 따라 말하기 단어 → 문장 → 듣기 → 질문 → 그림 보고 말하기 → 발표, 회화 카드 = 인사 → 대화 턴(또는 질문 목록) → 더 이야기할 거리,
 * 평가 · 배치 문항 칸 = 1, 회화 평가 카드 장 = 턴 차례(5절 '(장, 턴)'), 토리 이야기 = 질문 차례.
 */
export function itemsOf(cell: SeedCell): SeedItem[] {
  const out: SeedItem[] = [];
  const push = (path: string) => out.push({ no: out.length + 1, path });
  const each = (path: string, value: unknown) => {
    list(value).forEach((_, i) => {
      push(`${path}.${i}`);
    });
  };
  const v = cell.value;
  switch (cell.kind) {
    case "test-item":
    case "placement":
      push("");
      return out;
    case "talk-sheet":
      each("turns", field(v, "turns"));
      return out;
    case "story":
      each("questions", field(v, "questions"));
      return out;
    case "lesson":
      break;
  }
  const content = field(v, "content");
  switch (cell.area) {
    case "reading":
      each("content.questions", field(content, "questions"));
      break;
    case "writing": {
      const shape = field(content, "shape");
      if (shape === "items") each("content.items", field(content, "items"));
      else if (shape === "guided")
        each("content.sentences", field(content, "sentences"));
      else push("content");
      break;
    }
    case "speaking": {
      const repeat = field(content, "repeat");
      each("content.repeat.words", field(repeat, "words"));
      each("content.repeat.sentences", field(repeat, "sentences"));
      each("content.listening", field(content, "listening"));
      each("content.questions", field(content, "questions"));
      if (field(content, "pictureTask") !== undefined)
        push("content.pictureTask");
      if (field(content, "presentation") !== undefined)
        push("content.presentation");
      break;
    }
    case "talk": {
      const card = field(v, "card");
      const greeting = field(card, "greeting");
      if (field(greeting, "questions") !== undefined) {
        each("card.greeting.questions", field(greeting, "questions"));
      } else {
        push("card.greeting.firstLine");
      }
      if (field(card, "turns") !== undefined)
        each("card.turns", field(card, "turns"));
      else each("card.questions", field(card, "questions"));
      each("card.moreTalk", field(card, "moreTalk"));
      break;
    }
  }
  return out;
}

const SOLVED_TEST_TYPES = new Set<string>([
  ...READING_QUESTION_TYPES,
  ...WRITING_ITEM_TYPES,
  "fill-blank",
  "fix-sentence",
  "listening",
]);

/**
 * 풀이 검사 대상 문항 번호(6.4): 읽기 문항 전부, 쓰기 items 단계 문항 전부, 말하기 듣기 문항, 평가 · 배치의 읽기 · 듣기 · 쓰기 앱 채점 문항,
 * 토리 이야기 질문. 회화 카드 · 회화 평가 카드 · 쓰기 4단계 이상 과제 · 말하기 질문 답 · 따라 말하기 · AI 과제는 대상이 아니다.
 */
export function solveTargets(cell: SeedCell): number[] {
  const items = itemsOf(cell);
  switch (cell.kind) {
    case "test-item":
    case "placement":
      return SOLVED_TEST_TYPES.has(String(field(cell.value, "type")))
        ? [1]
        : [];
    case "story":
      return items.map((i) => i.no);
    case "talk-sheet":
      return [];
    case "lesson":
      break;
  }
  switch (cell.area) {
    case "reading":
      return items.map((i) => i.no);
    case "writing":
      return field(field(cell.value, "content"), "shape") === "items"
        ? items.map((i) => i.no)
        : [];
    case "speaking":
      return items
        .filter((i) => i.path.startsWith("content.listening."))
        .map((i) => i.no);
    default:
      return [];
  }
}

/** 문항의 시드 허용 정답(풀이 모델의 추가 후보를 견줄 때). */
function acceptedOf(cell: SeedCell, no: number): string[] {
  const item = itemsOf(cell).find((i) => i.no === no);
  if (!item) return [];
  let value: unknown = cell.value;
  for (const key of item.path.split(".").filter((k) => k !== "")) {
    value = Array.isArray(value) ? value[Number(key)] : field(value, key);
  }
  return list<string>(field(value, "accepted")).map((a) =>
    a.trim().toLowerCase(),
  );
}

export type SolveStatus =
  | "not-needed"
  | "unchecked"
  | "pending-human"
  | "passed";

/**
 * 풀이 검사 상태(6.4): 대상이 없으면 not-needed, 기록이 없거나 해시가 다르면 unchecked, 판단이 same 이 아니거나
 * 추가 허용 정답 후보가 시드 밖인 문항에 같은 해시의 사람 확인 'correct' 가 없으면 pending-human, 그 밖은 passed.
 */
export function solveStatus(
  cell: SeedCell,
  record: CheckRecord | undefined,
): SolveStatus {
  const targets = solveTargets(cell);
  if (targets.length === 0) return "not-needed";
  const hash = cellHash(cell.key, cell.value);
  if (!record || record.contentHash !== hash) return "unchecked";
  let pending = false;
  for (const no of targets) {
    const solved = record.solve.items.find((i) => i.no === no);
    if (!solved) return "unchecked";
    const accepted = acceptedOf(cell, no);
    const extra = (solved.extraAccepted ?? []).some(
      (a) => !accepted.includes(a.trim().toLowerCase()),
    );
    if (solved.verdict === "same" && !extra) continue;
    const human =
      record.human?.contentHash === hash &&
      record.human.items.some((h) => h.no === no && h.decision === "correct");
    if (!human) pending = true;
  }
  return pending ? "pending-human" : "passed";
}

// ── 완전성 ───────────────────────────────────────────────────────

/** 내용 파일 하나에 차 있어야 하는 칸 키(완전성 표의 그 파일 몫). 규격 파일이 준비되지 않았으면 빈 목록. */
export function expectedCellsOf(
  target: SeedContentPath,
  index: ReferenceIndex,
): string[] {
  const out: string[] = [];
  if (!index.ready) return out;
  switch (target.kind) {
    case "lessons": {
      const { area, level, unit } = target;
      const frame = index.frame(area, level, unit);
      const allocation = index.allocation(area, level, unit);
      if (!frame || !allocation?.ok) return out;
      for (let variant = 1; variant <= frame.topicVariants; variant++) {
        for (let no = 1; no <= frame.regularLessons; no++) {
          const kind: LessonKind = isAlphabetUnit(area, level, unit)
            ? "alphabet"
            : no <= allocation.assignedCount
              ? "assigned"
              : "reinforce";
          out.push(
            cellKey({
              type: "lesson",
              area,
              level,
              unit,
              kind,
              lessonNo: no,
              variant,
            }),
          );
        }
        for (let no = 1; no <= frame.remedialLessons; no++) {
          out.push(
            cellKey({
              type: "lesson",
              area,
              level,
              unit,
              kind: "remedial",
              lessonNo: no,
              variant,
            }),
          );
        }
      }
      return out;
    }
    case "level-tests": {
      const { area, level } = target;
      const forms = index.num("level.test_forms");
      const total = index.num("level.test_items");
      const count =
        area === "talk"
          ? total / index.num("level.test_items_per_session")
          : total;
      for (let form = 1; form <= forms; form++) {
        for (let no = 1; no <= count; no++) {
          out.push(cellKey({ type: "level-test", area, level, form, no }));
        }
      }
      return out;
    }
    case "placement": {
      const { area } = target;
      const per = index.num("placement.items_per_level");
      for (let level = LEVEL_MIN; level <= LEVEL_MAX; level++) {
        for (let no = 1; no <= per; no++) {
          out.push(
            cellKey({
              type: "placement",
              area,
              level,
              form: 1,
              no,
              spare: false,
            }),
          );
          if (area === "speaking") {
            out.push(
              cellKey({
                type: "placement",
                area,
                level,
                form: 1,
                no,
                spare: true,
              }),
            );
          }
        }
      }
      return out;
    }
    case "stories":
      for (let no = 1; no <= STORIES_PER_BAND; no++) {
        out.push(cellKey({ type: "story", band: target.band, no }));
      }
      return out;
  }
}

function unitsOfLevel(area: Area, level: number): number[] {
  return [
    ...(isAlphabetUnit(area, level, ALPHABET_UNIT.unit)
      ? [ALPHABET_UNIT.unit]
      : []),
    ...Array.from({ length: UNITS_PER_LEVEL }, (_, i) => i + 1),
  ];
}

/** 완전성 표(plan-p04c): 그 범위 · 영역에 차 있어야 하는 칸 키. 규격 파일 행은 따로 본다. */
export function expectedCells(input: {
  through: number;
  areas: readonly Area[];
  index: ReferenceIndex;
}): string[] {
  const { through, areas, index } = input;
  const out: string[] = [];
  if (!index.ready) return out;
  for (const area of areas) {
    for (
      let level = LEVEL_MIN;
      level <= Math.min(through, LEVEL_MAX);
      level++
    ) {
      for (const unit of unitsOfLevel(area, level)) {
        out.push(
          ...expectedCellsOf({ kind: "lessons", area, level, unit }, index),
        );
      }
      out.push(...expectedCellsOf({ kind: "level-tests", area, level }, index));
    }
  }
  for (const area of PLACEMENT_AREAS) {
    if (areas.includes(area))
      out.push(...expectedCellsOf({ kind: "placement", area }, index));
  }
  if (areas.includes("talk")) {
    for (const band of BAND_INFOS) {
      if (band.first <= through)
        out.push(
          ...expectedCellsOf({ kind: "stories", band: band.band }, index),
        );
    }
  }
  return out;
}

// ── 보고 ─────────────────────────────────────────────────────────

export type ValidateMode = "pr" | "complete";
export type ValidateOptions = {
  mode: ValidateMode;
  /** 완전성 모드의 마지막 단계(PR 모드는 settings 의 seed.complete_through_level 로 빈 칸만 센다). */
  through?: number;
  /** 영역 거르기(기본 넷). */
  areas?: readonly Area[];
  /**
   * 선생님 자산 검사가 읽는 것(public/ · CREDITS.md · 해시 · 크기 상한, 6.4 자산 검사 · AC-19k). 넘기지 않으면 자산 검사를 건너뛴다.
   * 명령(scripts/seed-validate.ts)이 저장소 뿌리에서 만들어 넘긴다.
   */
  teacherAssets?: TeacherAssetIo;
};
export type ReportError = {
  rule: string;
  cell: string | null;
  file: string;
  path: string;
  message: string;
};
export type ReportStats = {
  area: Area;
  level: number;
  unit: number;
  passageWords?: number;
  sentenceWords: number;
  offbandRatio?: number;
  answerTargetWords?: number;
  /** 단원 안 최소 · 최대(plan '평균 · 최소 · 최대', 더한 칸). */
  ranges: {
    passageWords?: [number, number];
    sentenceWords?: [number, number];
    offbandRatio?: [number, number];
  };
};
/** `--json` 보고 꼴(version 1, P8 시드 묶음 워크플로가 errors[].cell 로 실패 칸만 되돌린다). */
export type SeedReport = {
  version: 1;
  mode: ValidateMode;
  completeThrough: number | null;
  areas: Area[];
  summary: {
    cells: number;
    passed: number;
    /** 실패한 칸 수 + 칸 키 없는 오류(파일 · 단원 단위, 규격 파일 오류 밖) 수. 종료 코드와 맞는 셈(P4c 검토 M-1). */
    failed: number;
    empty: number;
    unchecked: number;
    pendingHuman: number;
    warnings: number;
    referenceErrors: number;
  };
  errors: ReportError[];
  warnings: SeedWarning[];
  empty: string[];
  unchecked: string[];
  pendingHuman: string[];
  stats: ReportStats[];
};

const REFERENCE_SCHEMAS: Record<SeedFileName, z.ZodType> = {
  settings: SettingsFileSchema,
  levelSpecs: LevelSpecsFileSchema,
  unitSpecs: UnitSpecsFileSchema,
  vocab: VocabFileSchema,
  images: ImagesFileSchema,
  modelPrices: ModelPricesFileSchema,
  homophones: HomophonesFileSchema,
  forbidden: ForbiddenFileSchema,
  forms: ListFormsFileSchema,
  metaSentences: MetaSentencesFileSchema,
  teachers: TeachersFileSchema,
};

function issuePath(prefix: string, path: readonly PropertyKey[]): string {
  return [prefix, ...path.map(String)].filter((p) => p !== "").join(".");
}

function prefixed(prefix: string, path: string): string {
  return [prefix, path].filter((p) => p !== "").join(".");
}

/** 칸 키를 날 수업에서 만들 수 있으면 만든다(규격이 깨진 수업의 칸 키). */
function rawLessonKey(
  area: Area,
  level: number,
  unit: number,
  raw: unknown,
): string | null {
  const kind = field(raw, "kind");
  const no = field(raw, "lessonNo");
  const variant = field(raw, "variant");
  if (
    !LESSON_KINDS.includes(kind as LessonKind) ||
    !Number.isInteger(no) ||
    !Number.isInteger(variant)
  ) {
    return null;
  }
  return cellKey({
    type: "lesson",
    area,
    level,
    unit,
    kind: kind as LessonKind,
    lessonNo: no as number,
    variant: variant as number,
  });
}

// ── 칸 걷기(collectCells) ────────────────────────────────────────

/** 걸은 칸 하나: 칸(키 · 종류 · 영역 · 칸 객체)과 그 칸이 든 파일 · 파일 안 경로. */
export type CollectedCell = SeedCell & { file: string; path: string };

/**
 * 파일 묶음을 걸은 결과(P5 풀이 검사 · P7 적재가 같은 걷기를 쓴다, P4c 검토 M-4).
 * cells 는 규격을 통과한 칸과 규격이 깨진 수업 칸(칸 키를 만들 수 있을 때, value 는 날 JSON)이고 걷기 차례 · 칸 키마다 하나다.
 */
export type CollectedSeed = {
  areas: Area[];
  /** Zod 규격을 통과한 규격 파일. */
  reference: Partial<ReferenceFiles>;
  index: ReferenceIndex;
  /** 배치 · JSON · 규격 · 겹친 칸 · 규격 파일 정합 · 규격 파일 완전성 오류. */
  errors: ReportError[];
  /** errors 가운데 규격 파일 오류 수. */
  referenceErrors: number;
  cells: CollectedCell[];
  /** 걷기에서 이미 실패한 칸(규격이 깨진 수업 · 겹친 칸). */
  failedKeys: Set<string>;
  /** JSON 이 아닌 내용 파일의 칸(빈 칸이 아니라 json 오류로 센다, plan-p04c 명령). */
  brokenKeys: Set<string>;
  lessonFiles: {
    path: string;
    area: Area;
    level: number;
    unit: number;
    lessons: { lesson: Lesson; at: string }[];
  }[];
  levelTests: { path: string; file: LevelTestFile }[];
  placements: { path: string; file: PlacementFile }[];
  stories: { path: string; file: StoryFile }[];
  /** 풀이 검사 기록(칸 키 → 기록). */
  records: Map<string, CheckRecord>;
};

/** 파일 묶음(seed/ 뿌리 기준 경로 → 글)을 걸어 규격 파일을 풀고 칸을 모은다. 칸 검사는 하지 않는다. */
export function collectCells(
  files: ReadonlyMap<string, string>,
  options: { areas?: readonly Area[] } = {},
): CollectedSeed {
  const areas = [...(options.areas ?? AREAS)];
  const errors: ReportError[] = [];
  let referenceErrors = 0;
  const error = (
    rule: string,
    cell: string | null,
    file: string,
    path: string,
    message: string,
  ) => {
    errors.push({ rule, cell, file, path, message });
  };
  const referenceError = (
    rule: string,
    file: string,
    path: string,
    message: string,
  ) => {
    referenceErrors++;
    error(rule, null, file, path, message);
  };
  const schemaErrors = (
    path: string,
    issues: readonly { path: readonly PropertyKey[]; message: string }[],
  ) => {
    for (const issue of issues)
      error("schema", null, path, issuePath("", issue.path), issue.message);
  };

  // 1) JSON 읽기 · 배치
  const json = new Map<string, unknown>();
  const brokenContent: { path: string; target: SeedPath }[] = [];
  for (const [path, text] of files) {
    const parsed = parseSeedPath(path);
    if (!parsed) {
      error("path", null, path, "", "시드 파일 배치(plan-p04a)에 없는 경로다");
      continue;
    }
    try {
      json.set(path, JSON.parse(text));
    } catch {
      if (parsed.kind === "reference")
        referenceError("json", path, "", "JSON 이 아니다");
      else brokenContent.push({ path, target: parsed });
    }
  }

  // 2) 규격 파일
  const reference: Partial<ReferenceFiles> = {};
  for (const name of Object.keys(SEED_FILES) as SeedFileName[]) {
    const path = SEED_FILES[name];
    if (!files.has(path)) {
      referenceError("reference-missing", path, "", "규격 파일이 없다");
      continue;
    }
    if (!json.has(path)) continue;
    const result = REFERENCE_SCHEMAS[name].safeParse(json.get(path));
    if (!result.success) {
      for (const issue of result.error.issues) {
        referenceError(
          "schema",
          path,
          issuePath("", issue.path),
          issue.message,
        );
      }
      continue;
    }
    (reference as Record<string, unknown>)[name] = result.data;
  }
  const { index, issues: refIssues } = buildReferenceIndex(reference);
  for (const i of refIssues) referenceError(i.rule, i.file, i.path, i.message);
  // 규격 파일 완전성(범위와 상관없이 늘 본다)
  if (reference.levelSpecs) {
    for (const area of AREAS) {
      for (let level = LEVEL_MIN; level <= LEVEL_MAX; level++) {
        if (!index.levelSpec(area, level)) {
          referenceError(
            "reference-complete",
            SEED_FILES.levelSpecs,
            "levelSpecs",
            `${area} ${level}단계 규격 행이 없다`,
          );
        }
      }
    }
  }
  if (reference.unitSpecs) {
    for (const area of AREAS) {
      for (let level = LEVEL_MIN; level <= LEVEL_MAX; level++) {
        for (const unit of unitsOfLevel(area, level)) {
          if (!index.unitSpec(area, level, unit)) {
            referenceError(
              "reference-complete",
              SEED_FILES.unitSpecs,
              "unitSpecs",
              `${area} ${level}단계 단원 ${unit} 규격 행이 없다`,
            );
          }
        }
      }
    }
  }

  // JSON 이 아닌 내용 파일: 그 파일 칸 전부를 json 오류로(칸을 알 수 없으면 한 줄)
  const brokenKeys = new Set<string>();
  for (const { path, target } of brokenContent) {
    const content =
      target.kind === "checks" ||
      target.kind === "reviews" ||
      target.kind === "reference"
        ? undefined
        : target;
    const inArea =
      content === undefined ||
      (content.kind === "stories"
        ? areas.includes("talk")
        : areas.includes(content.area));
    if (!inArea) continue;
    const keys = content ? expectedCellsOf(content, index) : [];
    if (keys.length === 0) {
      error("json", null, path, "", "JSON 이 아니다");
      continue;
    }
    for (const key of keys) {
      brokenKeys.add(key);
      error("json", key, path, "", "JSON 이 아니다(이 파일의 칸)");
    }
  }

  // 3) 칸 모으기
  const cells = new Map<string, CollectedCell>();
  const failedKeys = new Set<string>();
  const addCell = (cell: CollectedCell) => {
    if (cells.has(cell.key)) {
      error(
        "duplicate-cell",
        cell.key,
        cell.file,
        cell.path,
        `칸 ${cell.key} 가 두 번 있다`,
      );
      failedKeys.add(cell.key);
      return;
    }
    cells.set(cell.key, cell);
  };
  const pathsOf = (kind: string) =>
    [...json.keys()].filter((p) => parseSeedPath(p)?.kind === kind).sort();
  const collected: CollectedSeed = {
    areas,
    reference,
    index,
    errors,
    referenceErrors: 0,
    cells: [],
    failedKeys,
    brokenKeys,
    lessonFiles: [],
    levelTests: [],
    placements: [],
    stories: [],
    records: new Map(),
  };

  for (const path of pathsOf("lessons")) {
    const where = parseSeedPath(path);
    if (where?.kind !== "lessons" || !areas.includes(where.area)) continue;
    const shell = LessonFileShellSchema.safeParse(json.get(path));
    if (!shell.success) {
      schemaErrors(path, shell.error.issues);
      continue;
    }
    const { area, level, unit } = where;
    if (
      shell.data.area !== area ||
      shell.data.level !== level ||
      shell.data.unit !== unit
    ) {
      error(
        "path",
        null,
        path,
        "",
        `파일 안의 영역 · 단계 · 단원(${shell.data.area} ${shell.data.level} ${shell.data.unit})이 경로와 다르다`,
      );
      continue;
    }
    const lessons: { lesson: Lesson; at: string }[] = [];
    shell.data.lessons.forEach((raw, i) => {
      const at = `lessons.${i}`;
      const result = LESSON_SCHEMAS[area].safeParse(raw);
      if (!result.success) {
        const key = rawLessonKey(area, level, unit, raw);
        for (const issue of result.error.issues)
          error("schema", key, path, issuePath(at, issue.path), issue.message);
        if (key) {
          failedKeys.add(key);
          addCell({
            key,
            kind: "lesson",
            area,
            value: raw,
            file: path,
            path: at,
          });
        }
        return;
      }
      const lesson = result.data as Lesson;
      const key = cellKey({
        type: "lesson",
        area,
        level,
        unit,
        kind: lesson.kind,
        lessonNo: lesson.lessonNo,
        variant: lesson.variant,
      });
      addCell({
        key,
        kind: "lesson",
        area,
        value: lesson,
        file: path,
        path: at,
      });
      lessons.push({ lesson, at });
    });
    collected.lessonFiles.push({ path, area, level, unit, lessons });
  }

  for (const path of pathsOf("level-tests")) {
    const where = parseSeedPath(path);
    if (where?.kind !== "level-tests" || !areas.includes(where.area)) continue;
    const result = LevelTestFileSchema.safeParse(json.get(path));
    if (!result.success) {
      schemaErrors(path, result.error.issues);
      continue;
    }
    const file = result.data;
    if (file.area !== where.area || file.level !== where.level) {
      error("path", null, path, "", "파일 안의 영역 · 단계가 경로와 다르다");
      continue;
    }
    file.forms.forEach((form, f) => {
      if ("sheets" in form) {
        form.sheets.forEach((sheet, s) => {
          addCell({
            key: cellKey({
              type: "level-test",
              area: file.area,
              level: file.level,
              form: form.form,
              no: sheet.sheet,
            }),
            kind: "talk-sheet",
            area: file.area,
            value: sheet,
            file: path,
            path: `forms.${f}.sheets.${s}`,
          });
        });
      } else {
        form.items.forEach((item, i) => {
          addCell({
            key: cellKey({
              type: "level-test",
              area: file.area,
              level: file.level,
              form: form.form,
              no: item.no,
            }),
            kind: "test-item",
            area: file.area,
            value: item,
            file: path,
            path: `forms.${f}.items.${i}`,
          });
        });
      }
    });
    collected.levelTests.push({ path, file });
  }

  for (const path of pathsOf("placement")) {
    const where = parseSeedPath(path);
    if (where?.kind !== "placement" || !areas.includes(where.area)) continue;
    const result = PlacementFileSchema.safeParse(json.get(path));
    if (!result.success) {
      schemaErrors(path, result.error.issues);
      continue;
    }
    const file = result.data;
    if (file.area !== where.area) {
      error("path", null, path, "", "파일 안의 영역이 경로와 다르다");
      continue;
    }
    file.levels.forEach((entry, l) => {
      for (const [group, spare] of [
        ["items", false],
        ["spares", true],
      ] as const) {
        (entry[group] as { no: number }[]).forEach((item, i) => {
          addCell({
            key: cellKey({
              type: "placement",
              area: file.area as PlacementArea,
              level: entry.level,
              form: file.form,
              no: item.no,
              spare,
            }),
            kind: "placement",
            area: file.area,
            value: item,
            file: path,
            path: `levels.${l}.${group}.${i}`,
          });
        });
      }
    });
    collected.placements.push({ path, file });
  }

  for (const path of pathsOf("stories")) {
    const where = parseSeedPath(path);
    if (where?.kind !== "stories" || !areas.includes("talk")) continue;
    const result = StoryFileSchema.safeParse(json.get(path));
    if (!result.success) {
      schemaErrors(path, result.error.issues);
      continue;
    }
    const file = result.data;
    if (file.band !== where.band) {
      error("path", null, path, "", "파일 안의 구간이 경로와 다르다");
      continue;
    }
    file.stories.forEach((story, s) => {
      addCell({
        key: cellKey({ type: "story", band: file.band, no: story.no }),
        kind: "story",
        area: "talk",
        value: story,
        file: path,
        path: `stories.${s}`,
      });
    });
    collected.stories.push({ path, file });
  }

  for (const path of pathsOf("checks")) {
    const result = CheckFileSchema.safeParse(json.get(path));
    if (!result.success) {
      schemaErrors(path, result.error.issues);
      continue;
    }
    for (const record of result.data.records)
      collected.records.set(record.cell, record);
  }
  for (const path of pathsOf("reviews")) {
    const result = ReviewFileSchema.safeParse(json.get(path));
    if (!result.success) schemaErrors(path, result.error.issues);
  }

  collected.cells = [...cells.values()];
  collected.referenceErrors = referenceErrors;
  return collected;
}

// ── 검증 ─────────────────────────────────────────────────────────

/** 읽은 파일 묶음(seed/ 뿌리 기준 경로 → 글)을 검증해 보고를 만든다(collectCells 위에서 모든 검사를 돈다). */
export function validateSeed(
  files: ReadonlyMap<string, string>,
  options: ValidateOptions,
): SeedReport {
  const seed = collectCells(files, { areas: options.areas });
  const { areas, index, reference, errors, failedKeys, brokenKeys } = seed;
  if (reference.teachers && options.teacherAssets) {
    for (const i of checkTeacherAssets(
      reference.teachers,
      options.teacherAssets,
    )) {
      seed.referenceErrors++;
      errors.push({
        rule: i.rule,
        cell: null,
        file: i.file,
        path: i.path,
        message: i.message,
      });
    }
  }
  const warnings: SeedWarning[] = [];
  const addIssues = (issues: readonly SeedIssue[], prefix: string) => {
    for (const i of issues) {
      if (i.severity === "warning") {
        warnings.push({
          id: `${i.rule}:${i.cell ?? i.file}:${prefixed(prefix, i.path)}`,
          rule: i.rule,
          ...(i.cell ? { cell: i.cell } : {}),
          file: i.file,
          message: i.message,
        });
      } else {
        errors.push({
          rule: i.rule,
          cell: i.cell ?? null,
          file: i.file,
          path: prefixed(prefix, i.path),
          message: i.message,
        });
      }
    }
  };
  if (reference.levelSpecs)
    warnings.push(...checkCanDo(reference.levelSpecs.levelSpecs));

  // 수업 칸 · 단원 단위
  const corpusLessons = new Map<string, Lesson[]>();
  const groups: UnitLessons[] = [];
  for (const entry of seed.lessonFiles) {
    const { path, area, level, unit } = entry;
    for (const { lesson, at } of entry.lessons) {
      const ctx = { area, level, unit, file: path, index };
      const issues =
        area === "talk"
          ? checkTalkCard(lesson as TalkLesson, ctx)
          : checkLessonCell(lesson as LessonOf[CheckedArea], {
              ...ctx,
              area: area as CheckedArea,
            });
      addIssues(issues, at);
    }
    if (!index.ready) continue;
    const valid = entry.lessons.map((l) => l.lesson);
    const group: UnitLessons = {
      area,
      level,
      unit,
      file: path,
      lessons: valid,
    };
    groups.push(group);
    corpusLessons.set(`${area}:${level}`, [
      ...(corpusLessons.get(`${area}:${level}`) ?? []),
      ...valid,
    ]);
    if (area === "talk") {
      addIssues(
        checkTalkUnit(valid as TalkLesson[], {
          area,
          level,
          unit,
          file: path,
          index,
        }),
        "",
      );
    }
    addIssues(checkTopicVariants(group), "");
    warnings.push(...checkRelations(group, index));
  }

  // 단계 평가 · 배치 · 이야기
  const corpusOf = (area: Area, level: number): LessonCorpus =>
    lessonCorpus(area, corpusLessons.get(`${area}:${level}`) ?? []);
  for (const { path, file } of seed.levelTests) {
    addIssues(
      checkLevelTestFile(file, {
        file: path,
        index,
        corpus: corpusOf(file.area, file.level),
      }),
      "",
    );
  }
  for (const { path, file } of seed.placements) {
    addIssues(checkPlacementFile(file, { file: path, index }), "");
  }
  for (const { path, file } of seed.stories) {
    addIssues(checkStoryFile(file, { file: path, index }), "");
  }

  // 통계 · 분포
  const stats: ReportStats[] = [];
  const unitStatList = [];
  for (const group of groups) {
    const s = unitStats(group, index);
    const coverage = checkRemedialCoverage(group, index);
    addIssues(coverage.issues, "");
    if (coverage.answerTargetWords !== undefined)
      s.answerTargetWords = coverage.answerTargetWords;
    unitStatList.push(s);
    stats.push({
      area: s.area,
      level: s.level,
      unit: s.unit,
      ...(s.passageWords ? { passageWords: s.passageWords.avg } : {}),
      sentenceWords: s.sentenceWords?.avg ?? 0,
      ...(s.offbandRatio ? { offbandRatio: s.offbandRatio.avg } : {}),
      ...(s.answerTargetWords !== undefined
        ? { answerTargetWords: s.answerTargetWords }
        : {}),
      ranges: {
        ...(s.passageWords
          ? {
              passageWords: [s.passageWords.min, s.passageWords.max] as [
                number,
                number,
              ],
            }
          : {}),
        ...(s.sentenceWords
          ? {
              sentenceWords: [s.sentenceWords.min, s.sentenceWords.max] as [
                number,
                number,
              ],
            }
          : {}),
        ...(s.offbandRatio
          ? {
              offbandRatio: [s.offbandRatio.min, s.offbandRatio.max] as [
                number,
                number,
              ],
            }
          : {}),
      },
    });
  }
  if (index.ready) warnings.push(...checkDistribution(unitStatList, index));

  // 칸 상태 · 완전성
  for (const e of errors)
    if (e.cell && !brokenKeys.has(e.cell)) failedKeys.add(e.cell);
  const unchecked: string[] = [];
  const pendingHuman: string[] = [];
  let passed = 0;
  let failedCells = 0;
  for (const cell of seed.cells) {
    const status = solveStatus(cell, seed.records.get(cell.key));
    if (status === "unchecked") unchecked.push(cell.key);
    if (status === "pending-human") pendingHuman.push(cell.key);
    if (failedKeys.has(cell.key)) failedCells++;
    else if (status === "passed" || status === "not-needed") passed++;
  }
  const present = new Set([...seed.cells.map((c) => c.key), ...brokenKeys]);
  let through: number | null =
    options.mode === "complete" ? (options.through ?? null) : null;
  if (options.mode === "pr" && index.ready)
    through = index.num("seed.complete_through_level");
  const empty =
    through === null
      ? []
      : expectedCells({ through, areas, index }).filter(
          (key) => !present.has(key),
        );
  // 칸 키 없는 오류(파일 · 단원 단위)도 실패로 센다. 규격 파일 오류는 따로 센다.
  const otherErrors =
    errors.filter((e) => e.cell === null).length - seed.referenceErrors;
  return {
    version: 1,
    mode: options.mode,
    completeThrough: through,
    areas,
    summary: {
      cells: present.size,
      passed,
      failed: failedCells + brokenKeys.size + otherErrors,
      empty: empty.length,
      unchecked: unchecked.length,
      pendingHuman: pendingHuman.length,
      warnings: warnings.length,
      referenceErrors: seed.referenceErrors,
    },
    errors,
    warnings,
    empty,
    unchecked,
    pendingHuman,
    stats,
  };
}

/** 종료 코드(plan-p04c 모드 표): 오류 · 규격 파일 오류 · 사람 확인 남음은 늘 1, 완전성 모드는 빈 칸 · 풀이 검사 안 됨도 1. 경고는 0. */
export function exitCodeOf(report: SeedReport): 0 | 1 {
  if (report.errors.length > 0 || report.pendingHuman.length > 0) return 1;
  if (
    report.mode === "complete" &&
    (report.empty.length > 0 || report.unchecked.length > 0)
  )
    return 1;
  return 0;
}

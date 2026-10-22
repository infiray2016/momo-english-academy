// 시드 보기 화면의 서버 읽기(plan-p05b '서버 읽기')와 쓰기 둘(plan-p05c '서버 쓰기': 표본 검토 행 · 사람 확인). 로컬 next dev 전용.
// node:fs 는 이 파일에서만 쓴다. 시각을 읽지 않는다(쓰기의 시각은 서버 액션이 한 시계 now() 로 넘긴다).
// 시드 전체 검증(validateSeed)은 돌리지 않는다 — 칸 검사는 pnpm seed:validate.
// 접근 확인은 proxy 와 서버 액션 첫 문장이 한다(C57). 이 파일은 src/app/dev/seed-viewer 와 자기 폴더에서만 가져온다(의존 규칙 seed-viewer-only-from-viewer).
import "server-only";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { notFound } from "next/navigation";
import type { z } from "zod";
import type {
  PictureInfo,
  PictureLookup,
} from "@/components/activities/common";
import type { ReferenceIndex } from "@/core/seed/reference-index";
import {
  CheckFileSchema,
  type CheckRecord,
  ReviewFileSchema,
  type ReviewRow,
} from "@/core/seed/schema/records";
import {
  type SettingsFile,
  SettingsFileSchema,
} from "@/core/seed/schema/reference";
import { withHumanDecisions } from "@/core/seed/solve-check";
import {
  AREAS,
  type Area,
  BAND_INFOS,
  bandInfo,
  checksFilePath,
  contentFilePath,
  PLACEMENT_AREAS,
  parseCellKey,
  parseSeedPath,
  reviewFilePath,
  SEED_FILES,
  type SeedContentPath,
} from "@/core/seed/structure";
import {
  type CollectedCell,
  cellHash,
  collectCells,
  itemsOf,
  type ReportError,
  type SeedItem,
  type SolveStatus,
  solveStatus,
} from "@/core/seed/validate";

/** 시드 뿌리의 기본 폴더(seed-validate 의 기본과 같다). */
const DEFAULT_SEED_ROOT = "seed";
/** 내용 파일이 있는 폴더(목록에 보이는 것). checks · reviews · prompts · manifest · reports 는 뺀다. */
const CONTENT_DIRS = [
  "lessons",
  "level-tests",
  "placement",
  "stories",
] as const;
/** 그림 파일이 있는 폴더(images.json 의 file 은 이 폴더 기준). */
const PUBLIC_DIR = "public";
const JSON_EXT = ".json";

/** 두 번째 겹: next dev(NODE_ENV development)가 아니면 404(쪽 · P5c 서버 액션 첫 문장, 정할 것 아). */
export function assertSeedViewerLocal(): void {
  if (process.env.NODE_ENV !== "development") notFound();
}

/** 시드 뿌리: SEED_VIEWER_ROOT(상대 경로는 process.cwd() 기준) 아니면 seed. */
export function seedViewerRoot(): string {
  const configured = process.env.SEED_VIEWER_ROOT?.trim();
  return resolve(process.cwd(), configured ? configured : DEFAULT_SEED_ROOT);
}

/**
 * seed/ 뿌리 기준 경로를 파일 경로로 푼다. 시드 파일 배치(parseSeedPath)가 받는 경로만 받고,
 * 절대 경로 · `..` · 역슬래시 · 빈 조각을 거부하며 푼 경로가 뿌리 안인지 본다. 아니면 null(P5c 쓰기도 쓴다).
 */
export function resolveSeedFile(root: string, seedPath: string): string | null {
  if (seedPath === "" || isAbsolute(seedPath) || seedPath.includes("\\")) {
    return null;
  }
  const parts = seedPath.split("/");
  if (parts.some((part) => part === "" || part === "." || part === "..")) {
    return null;
  }
  if (parseSeedPath(seedPath) === null) return null;
  const full = resolve(root, ...parts);
  const inside = relative(resolve(root), full);
  if (inside === "" || inside.startsWith("..") || isAbsolute(inside)) {
    return null;
  }
  return full;
}

function readText(root: string, seedPath: string): string | undefined {
  const full = resolveSeedFile(root, seedPath);
  if (!full || !existsSync(full) || !statSync(full).isFile()) return undefined;
  return readFileSync(full, "utf8");
}

/** 목록의 내용 파일 하나. */
export type ContentFileEntry = { path: string; target: SeedContentPath };

function sortKeyOf(target: SeedContentPath): [number, number, number, number] {
  const kindOrder = CONTENT_DIRS.indexOf(target.kind);
  switch (target.kind) {
    case "lessons":
      return [kindOrder, AREAS.indexOf(target.area), target.level, target.unit];
    case "level-tests":
      return [kindOrder, AREAS.indexOf(target.area), target.level, 0];
    case "placement":
      return [kindOrder, PLACEMENT_AREAS.indexOf(target.area), 0, 0];
    case "stories":
      return [
        kindOrder,
        BAND_INFOS.findIndex((b) => b.band === target.band),
        0,
        0,
      ];
  }
}

function compareTargets(a: SeedContentPath, b: SeedContentPath): number {
  const ka = sortKeyOf(a);
  const kb = sortKeyOf(b);
  for (let i = 0; i < ka.length; i++) {
    const d = (ka[i] ?? 0) - (kb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

function walkJson(dir: string, prefix: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) walkJson(join(dir, entry.name), path, out);
    else if (entry.isFile() && entry.name.endsWith(JSON_EXT)) out.push(path);
  }
}

/**
 * 시드 뿌리의 내용 파일(lessons · level-tests · placement · stories 아래 `.json` 가운데 배치에 맞는 것)을
 * 종류 · 영역 · 단계 · 단원 차례로 낸다. 뿌리 폴더가 없으면 null.
 */
export function listContentFiles(root: string): ContentFileEntry[] | null {
  if (!existsSync(root) || !statSync(root).isDirectory()) return null;
  const paths: string[] = [];
  for (const dir of CONTENT_DIRS) {
    const full = join(root, dir);
    if (existsSync(full) && statSync(full).isDirectory()) {
      walkJson(full, dir, paths);
    }
  }
  const entries: ContentFileEntry[] = [];
  for (const path of paths) {
    const target = parseSeedPath(path);
    if (
      target &&
      (target.kind === "lessons" ||
        target.kind === "level-tests" ||
        target.kind === "placement" ||
        target.kind === "stories")
    ) {
      entries.push({ path, target });
    }
  }
  return entries.sort((a, b) => compareTargets(a.target, b.target));
}

/** 칸 하나와 보기 화면이 함께 보일 것(해시 · 풀이 검사 상태 · 문항 번호 · 기록 · 검토 행 · 규격 오류). */
export type ViewerCell = CollectedCell & {
  hash: string;
  status: SolveStatus;
  items: SeedItem[];
  record: CheckRecord | undefined;
  reviews: ReviewRow[];
  /** 그 칸의 오류(칸 키가 붙은 것). */
  errors: ReportError[];
  /** 규격이 깨진 칸(날 JSON 을 보인다). */
  broken: boolean;
};

export type LoadedContentFile = {
  path: string;
  target: SeedContentPath;
  /** 파일이 없으면 거짓(목록에서 고른 뒤 지워졌을 때). */
  exists: boolean;
  cells: ViewerCell[];
  records: Map<string, CheckRecord>;
  index: ReferenceIndex;
  /** 이 파일 · 그 기록 파일 · 검토 파일의 오류. */
  errors: ReportError[];
  /** 규격 파일 오류 수. */
  referenceErrors: number;
  /** 칸 키 → 표본 검토 행. */
  reviews: Map<string, ReviewRow[]>;
};

/**
 * 칸의 표본 검토 파일(`reviews/<영역>-<단계>.json`, 이야기 칸은 회화 · 구간 첫 단계). 칸 키를 parseCellKey 로 푼다.
 * P5c 의 표본 검토 쓰기가 같은 함수를 쓴다(읽기 · 쓰기 경로 규칙 하나). 칸 키 꼴이 아니면 null.
 */
export function reviewPathOf(key: string): string | null {
  const cell = parseCellKey(key);
  if (!cell) return null;
  switch (cell.type) {
    case "lesson":
    case "level-test":
    case "placement":
      return reviewFilePath(cell.area, cell.level);
    case "story":
      return reviewFilePath("talk" satisfies Area, bandInfo(cell.band).first);
  }
}

/**
 * 내용 파일 하나를 읽는다: 규격 파일 열 + 그 내용 파일 + `checks/<경로>` + 그 칸들의 `reviews/<영역>-<단계>.json` 을
 * collectCells 로 걸어 그 파일의 칸 · 오류와 규격 파일 오류 수, 칸마다 해시 · 풀이 검사 상태 · 문항 번호를 낸다.
 * 내용 파일 경로가 배치에 없으면 null.
 */
export function loadContentFile(
  root: string,
  contentPath: string,
): LoadedContentFile | null {
  const target = parseSeedPath(contentPath);
  if (
    !target ||
    (target.kind !== "lessons" &&
      target.kind !== "level-tests" &&
      target.kind !== "placement" &&
      target.kind !== "stories")
  ) {
    return null;
  }
  const path = contentFilePath(target);
  const files = new Map<string, string>();
  for (const name of Object.values(SEED_FILES)) {
    const text = readText(root, name);
    if (text !== undefined) files.set(name, text);
  }
  const content = readText(root, path);
  if (content !== undefined) files.set(path, content);
  const checksPath = checksFilePath(path);
  const checks = readText(root, checksPath);
  if (checks !== undefined) files.set(checksPath, checks);

  const first = collectCells(files);
  const fileCells = first.cells.filter((cell) => cell.file === path);
  const reviewPaths = [
    ...new Set(
      fileCells
        .map((cell) => reviewPathOf(cell.key))
        .filter((p): p is string => p !== null),
    ),
  ].sort();
  const reviews = new Map<string, ReviewRow[]>();
  const reviewErrors: ReportError[] = [];
  for (const reviewPath of reviewPaths) {
    const text = readText(root, reviewPath);
    if (text === undefined) continue;
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      reviewErrors.push({
        rule: "json",
        cell: null,
        file: reviewPath,
        path: "",
        message: "JSON 이 아니다",
      });
      continue;
    }
    const parsed = ReviewFileSchema.safeParse(json);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        reviewErrors.push({
          rule: "schema",
          cell: null,
          file: reviewPath,
          path: issue.path.map(String).join("."),
          message: issue.message,
        });
      }
      continue;
    }
    for (const row of parsed.data.rows) {
      reviews.set(row.cell, [...(reviews.get(row.cell) ?? []), row]);
    }
  }

  const ownFiles = new Set([path, checksPath]);
  const errors = [
    ...first.errors.filter((error) => ownFiles.has(error.file)),
    ...reviewErrors,
  ];
  const cells: ViewerCell[] = fileCells.map((cell) => {
    const cellErrors = first.errors.filter((error) => error.cell === cell.key);
    return {
      ...cell,
      hash: cellHash(cell.key, cell.value),
      status: solveStatus(cell, first.records.get(cell.key)),
      items: itemsOf(cell),
      record: first.records.get(cell.key),
      reviews: reviews.get(cell.key) ?? [],
      errors: cellErrors,
      broken: cellErrors.some((error) => error.rule === "schema"),
    };
  });
  return {
    path,
    target,
    exists: content !== undefined,
    cells,
    records: first.records,
    index: first.index,
    errors,
    referenceErrors: first.referenceErrors,
    reviews,
  };
}

/** 그림 파일이 public/ 아래 있는가(없으면 보기 화면은 그림 자리에 한국어 뜻을 보인다). */
export function publicFileExists(file: string): boolean {
  if (file === "" || isAbsolute(file) || file.split("/").includes("..")) {
    return false;
  }
  const publicRoot = resolve(process.cwd(), PUBLIC_DIR);
  const full = resolve(publicRoot, ...file.split("/"));
  const inside = relative(publicRoot, full);
  if (inside.startsWith("..") || isAbsolute(inside)) return false;
  return existsSync(full) && statSync(full).isFile();
}

/** 덧붙임에 적는 그림 정보(H7 확인용: 그림 키 · 라이선스 · 저작자 표시 · 파일이 있는가). */
export type PictureNote = {
  /** 찾은 이름(단어 id 또는 그림 키). */
  name: string;
  meaningKo: string;
  key?: string;
  file?: string;
  license?: string;
  attribution?: string;
  /** 그림 파일이 public/ 아래 있는가. */
  exists: boolean;
};

/** 시드 규격 파일(vocab · images)로 만든 그림 찾기. 같은 파일은 한 번만 확인한다. */
export type PictureCatalog = PictureLookup & {
  noteOfWord: (word: string) => PictureNote;
  noteOfKey: (key: string) => PictureNote;
};

export function pictureCatalog(index: ReferenceIndex): PictureCatalog {
  const imageByKey = index.images;
  const existence = new Map<string, boolean>();
  const exists = (file: string) => {
    let known = existence.get(file);
    if (known === undefined) {
      known = publicFileExists(file);
      existence.set(file, known);
    }
    return known;
  };
  const note = (name: string, key: string | undefined, meaningKo: string) => {
    const image = key === undefined ? undefined : imageByKey.get(key);
    return {
      name,
      meaningKo,
      ...(key === undefined ? {} : { key }),
      ...(image
        ? {
            file: image.file,
            license: image.license,
            ...(image.attribution === undefined
              ? {}
              : { attribution: image.attribution }),
          }
        : {}),
      exists: image ? exists(image.file) : false,
    } satisfies PictureNote;
  };
  const noteOfWord = (word: string): PictureNote => {
    const entry = index.vocab.get(word);
    return note(word, entry?.imageKey, entry?.meaningKo ?? word);
  };
  const noteOfKey = (key: string): PictureNote => {
    const image = imageByKey.get(key);
    const word = image ? index.vocab.get(image.word) : undefined;
    return note(key, key, word?.meaningKo ?? image?.word ?? key);
  };
  const toInfo = (picture: PictureNote): PictureInfo => ({
    meaningKo: picture.meaningKo,
    catalogued: picture.file !== undefined,
    ...(picture.exists && picture.file ? { src: `/${picture.file}` } : {}),
  });
  return {
    noteOfWord,
    noteOfKey,
    ofWord: (word) => toInfo(noteOfWord(word)),
    ofKey: (key) => toInfo(noteOfKey(key)),
  };
}

// ── 쓰기(P5c, plan-p05c '서버 쓰기') ───────────────────────────────

/** 쓰기 결과. 거부 글은 어른용 해요체이고 경로 · 칸 키 밖의 내부 값(스택 · 파일 시스템 오류 원문)을 담지 않는다. */
export type SeedWriteResult = { ok: true } | { ok: false; message: string };
type Rejected = { ok: false; message: string };

/** 표본 검토 날짜의 시간대 설정 키(12절). 코드에 기본값을 두지 않는다. */
const TIMEZONE_KEY = "app.timezone";
/** 임시 파일 이름의 무작위 부분(바이트, 기술 값). */
const TEMP_RANDOM_BYTES = 4;
const STALE_MESSAGE = "내용이 바뀌었어요. 다시 열어 주세요";
const NO_RECORD_MESSAGE =
  "이 내용의 풀이 기록이 없어요. 풀이 검사(pnpm seed:check)를 다시 해 주세요";

function reject(message: string): Rejected {
  return { ok: false, message };
}

/** JSON 을 같은 폴더 임시 파일에 쓰고 이름을 바꾼다(폴더는 처음 쓸 때 만든다, P5a 기록 쓰기와 같은 꼴). */
function writeJsonAtomic(full: string, data: unknown): void {
  mkdirSync(dirname(full), { recursive: true });
  const temp = `${full}.${process.pid}.${randomBytes(TEMP_RANDOM_BYTES).toString("hex")}.tmp`;
  try {
    writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`);
    renameSync(temp, full);
  } finally {
    rmSync(temp, { force: true });
  }
}

/** 기록 파일(reviews · checks)을 읽는다. 없으면 value 가 undefined, JSON · 규격이 깨졌으면 거부(덮어쓰지 않는다). */
function readRecordFile<T>(
  full: string,
  schema: z.ZodType<T>,
  label: string,
): { ok: true; value: T | undefined } | Rejected {
  if (!existsSync(full)) return { ok: true, value: undefined };
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(full, "utf8"));
  } catch {
    return reject(`${label}이 JSON 이 아니에요. 고친 뒤 다시 남겨 주세요`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return reject(`${label}이 규격에 맞지 않아요. 고친 뒤 다시 남겨 주세요`);
  }
  return { ok: true, value: parsed.data };
}

/** 내용 파일(배치 안 · 뿌리 안)을 지금 다시 읽어 그 칸을 찾는다. */
function findCell(
  root: string,
  file: string,
  key: string,
): { ok: true; loaded: LoadedContentFile; cell: ViewerCell } | Rejected {
  if (resolveSeedFile(root, file) === null) {
    return reject(`시드 파일 배치에 없는 경로예요: ${file}`);
  }
  const loaded = loadContentFile(root, file);
  if (loaded === null) return reject(`내용 파일이 아니에요: ${file}`);
  if (!loaded.exists) return reject(`내용 파일이 없어요: ${file}`);
  const cell = loaded.cells.find((c) => c.key === key);
  if (!cell) return reject(`이 파일에 그런 칸이 없어요: ${key}`);
  return { ok: true, loaded, cell };
}

/** seed/settings.json 을 읽는다. 없거나 JSON · 규격이 깨졌으면 undefined. */
export function readSeedSettings(root: string): SettingsFile | undefined {
  const text = readText(root, SEED_FILES.settings);
  if (text === undefined) return undefined;
  try {
    const parsed = SettingsFileSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 표본 검토 행의 날짜(정할 것 하): 한 시계 now() 를 설정값 시드의 app.timezone 으로 본 달력 날짜 `YYYY-MM-DD`
 * (학습일 경계 아님). 키가 없거나 시간대 이름이 아니면 거부한다(코드 기본값 없음).
 */
export function reviewDateOf(
  now: Date,
  settings: SettingsFile | undefined,
): { ok: true; date: string } | Rejected {
  if (!settings) return reject("설정값 시드(settings.json)를 읽지 못했어요");
  const row = settings.settings.find((r) => r.key === TIMEZONE_KEY);
  if (!row) return reject(`설정값 시드에 ${TIMEZONE_KEY} 이 없어요`);
  const invalid = `설정값 시드의 ${TIMEZONE_KEY} 이 시간대 이름이 아니에요`;
  if (typeof row.value !== "string") return reject(invalid);
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: row.value,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
  } catch {
    return reject(invalid);
  }
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (!year || !month || !day) return reject(invalid);
  return { ok: true, date: `${year}-${month}-${day}` };
}

/**
 * 6.3 표본 검토 행 하나를 `reviews/<영역>-<단계>.json` 에 더한다(AC-7f). 내용 파일 · 칸 · 문항 번호를 지금 파일에서 확인하고,
 * 검토 파일을 쓰기 바로 앞에 다시 읽어(없으면 `{ rows: [] }`) 행 하나를 더한 뒤 ReviewFileSchema 로 확인하고
 * 임시 파일 → 이름 바꾸기로 쓴다. 있던 행은 건드리지 않는다. 검토 파일이 깨져 있으면 쓰지 않는다.
 */
export function appendReviewRow(
  root: string,
  input: { file: string; row: ReviewRow },
): SeedWriteResult {
  const { file, row } = input;
  const target = findCell(root, file, row.cell);
  if (!target.ok) return target;
  if (
    row.itemNo !== null &&
    !target.cell.items.some((item) => item.no === row.itemNo)
  ) {
    return reject(`이 칸에 문항 ${row.itemNo} 이 없어요`);
  }
  const reviewPath = reviewPathOf(row.cell);
  const full = reviewPath === null ? null : resolveSeedFile(root, reviewPath);
  if (reviewPath === null || full === null) {
    return reject(`표본 검토 파일 경로를 만들지 못했어요: ${row.cell}`);
  }
  const current = readRecordFile(
    full,
    ReviewFileSchema,
    `표본 검토 파일(${reviewPath})`,
  );
  if (!current.ok) return current;
  const next = ReviewFileSchema.safeParse({
    rows: [...(current.value?.rows ?? []), row],
  });
  if (!next.success) return reject("남길 행이 규격에 맞지 않아요");
  writeJsonAtomic(full, next.data);
  return { ok: true };
}

/**
 * 6.4 사람 확인: 내용 파일을 다시 읽어 그 칸의 지금 해시를 세고, 화면을 연 때의 해시(contentHash)와 다르면 거부한다.
 * `checks/<내용 파일>` 을 쓰기 바로 앞에 다시 읽어 withHumanDecisions(P5a)로 합치고(풀이 기록이 없거나 해시가 다르면 거부)
 * CheckFileSchema 로 확인한 뒤 임시 파일 → 이름 바꾸기로 쓴다. at 은 부르는 쪽이 한 시계로 만든 UTC ISO 다.
 */
export function saveHumanDecisions(
  root: string,
  input: {
    file: string;
    cell: string;
    contentHash: string;
    at: string;
    items: readonly { no: number; decision: "correct" | "fixed" }[];
  },
): SeedWriteResult {
  const target = findCell(root, input.file, input.cell);
  if (!target.ok) return target;
  if (input.items.length === 0) return reject("고른 문항이 없어요");
  const numbers = new Set(target.cell.items.map((item) => item.no));
  const seen = new Set<number>();
  for (const item of input.items) {
    if (!numbers.has(item.no)) {
      return reject(`이 칸에 문항 ${item.no} 이 없어요`);
    }
    if (seen.has(item.no)) return reject(`문항 ${item.no} 을 두 번 골랐어요`);
    seen.add(item.no);
  }
  if (target.cell.hash !== input.contentHash) return reject(STALE_MESSAGE);
  const checksPath = checksFilePath(target.loaded.path);
  const full = resolveSeedFile(root, checksPath);
  if (full === null) {
    return reject(`풀이 기록 파일 경로를 만들지 못했어요: ${checksPath}`);
  }
  const current = readRecordFile(
    full,
    CheckFileSchema,
    `풀이 기록 파일(${checksPath})`,
  );
  if (!current.ok) return current;
  if (current.value === undefined) return reject(NO_RECORD_MESSAGE);
  const merged = withHumanDecisions(current.value, {
    cell: input.cell,
    contentHash: input.contentHash,
    at: input.at,
    items: input.items.map((item) => ({ ...item })),
  });
  if (!merged.ok) return reject(NO_RECORD_MESSAGE);
  const next = CheckFileSchema.safeParse(merged.file);
  if (!next.success) return reject("남길 기록이 규격에 맞지 않아요");
  writeJsonAtomic(full, next.data);
  return { ok: true };
}

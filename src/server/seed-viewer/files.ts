// 시드 보기 화면의 서버 읽기(plan-p05b '서버 읽기'). 로컬 next dev 전용이고 seed/ 파일을 읽기만 한다(쓰기는 P5c).
// node:fs 는 이 파일에서만 쓴다. 시각을 읽지 않는다. 시드 전체 검증(validateSeed)은 돌리지 않는다 — 칸 검사는 pnpm seed:validate.
// 접근 확인은 proxy 가 한다(C57). 이 파일은 src/app/dev/seed-viewer 와 자기 폴더에서만 가져온다(의존 규칙 seed-viewer-only-from-viewer).
import "server-only";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { notFound } from "next/navigation";
import type {
  PictureInfo,
  PictureLookup,
} from "@/components/activities/common";
import type { ReferenceIndex } from "@/core/seed/reference-index";
import {
  type CheckRecord,
  ReviewFileSchema,
  type ReviewRow,
} from "@/core/seed/schema/records";
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

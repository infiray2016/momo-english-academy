// 그림 카탈로그 명령(plan-p06b '스크립트', 5절 images · C65).
// 사용: pnpm images:fetch [--root <폴더>] · pnpm images:check [--root <폴더>]
// --root 는 seed/images.json 과 public/images/vocab/ 를 품은 저장소 뿌리(기본 .).
// fetch: Twemoji 행마다 고정 판 SVG 를 받아 public/<file> 에 쓴다(같은 내용이면 건너뜀). 네트워크는 이 명령에서만, CI 는 부르지 않는다.
// check: 출처 글 · 출처와 라이선스 짝 · 행마다 파일 · 크기 상한 · 카탈로그 밖 파일 · SVG 안전을 본다. 네트워크 없음.
// 종료 코드: 0 통과, 1 위반, 2 입력 오류(모르는 인자 · 카탈로그 없음 · JSON 깨짐 · 꼴 틀림 · 행이 있는데 그림 폴더 없음).
// 순수 함수를 내보내고 파일 · 네트워크 · 출력은 직접 실행될 때만 한다. src/core 와 seed-validate 는 이 파일을 가져오지 않는다.
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type ImageEntry,
  ImagesFileSchema,
} from "../src/core/seed/schema/reference";
import { IMAGE_MAX_BYTES, SEED_FILES } from "../src/core/seed/structure";

export const DEFAULT_ROOT = ".";
/** 저장소 뿌리 기준 시드 폴더 · 공개 폴더. */
export const SEED_DIR = "seed";
export const PUBLIC_DIR = "public";
/** 그림 파일이 놓이는 곳(public/ 기준, 5절 images.file). */
export const IMAGE_DIR = "images/vocab";
/** 받는 곳(고정 판 태그). 대안은 raw.githubusercontent.com/jdecked/twemoji/v<판>/assets/svg/(plan 위험 5). */
export const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji";

const TWEMOJI_SOURCE = /^twemoji v(\d+\.\d+\.\d+) ([0-9a-f]+(?:-[0-9a-f]+)*)$/;
const SELF_SOURCE = /^self-made (\d{4})-(\d{2})-(\d{2})$/;

export type Source =
  | { kind: "twemoji"; version: string; code: string }
  | { kind: "self" }
  | { kind: "invalid"; message: string };

/** images.json 의 source 글을 읽는다: `twemoji v<판> <코드>` · `self-made <YYYY-MM-DD>`. */
export function parseSource(text: string): Source {
  const twemoji = TWEMOJI_SOURCE.exec(text);
  if (twemoji?.[1] && twemoji[2]) {
    return { kind: "twemoji", version: twemoji[1], code: twemoji[2] };
  }
  const self = SELF_SOURCE.exec(text);
  if (self) {
    const [y, m, d] = [Number(self[1]), Number(self[2]), Number(self[3])];
    const date = new Date(Date.UTC(y, m - 1, d));
    if (
      date.getUTCFullYear() === y &&
      date.getUTCMonth() === m - 1 &&
      date.getUTCDate() === d
    ) {
      return { kind: "self" };
    }
    return { kind: "invalid", message: `없는 날짜다: ${text}` };
  }
  return {
    kind: "invalid",
    message: `출처 글은 'twemoji v<판> <코드>' 나 'self-made <YYYY-MM-DD>' 다: ${text}`,
  };
}

/** 고정 판 Twemoji SVG 주소. */
export function twemojiUrl(version: string, code: string): string {
  return `${TWEMOJI_BASE}@v${version}/assets/svg/${code}.svg`;
}

/** 출처 종류마다 와야 하는 라이선스(plan-p06b 'images.json 행'). */
const LICENSE_OF_SOURCE = { twemoji: "cc_by", self: "generated" } as const;

// SVG 안전 규칙(plan-p06b checkSvg). xmlns 의 이름 공간 주소는 href · url( 꼴이 아니라 걸리지 않는다.
// href · xlink:href 는 # 안쪽 참조만 받는다(javascript: · data: · 바깥 주소 모두 문제, P6b 검토 M-1).
const SVG_RULES: readonly { pattern: RegExp; message: string }[] = [
  { pattern: /<script\b/i, message: "script 요소가 있다" },
  { pattern: /<foreignObject\b/i, message: "foreignObject 요소가 있다" },
  { pattern: /<image\b/i, message: "image 요소가 있다" },
  {
    pattern: /href\s*=(?!\s*["']?\s*#)/i,
    message: "href 가 안쪽(#) 참조가 아니다",
  },
  {
    pattern: /attributeName\s*=\s*["']?\s*(?:xlink:)?href\b/i,
    message: "href 를 바꾸는 애니메이션(animate · set)이 있다",
  },
  {
    pattern: /url\(\s*["']?\s*(?:https?:)?\/\//i,
    message: "url( 이 바깥 주소를 가리킨다",
  },
  { pattern: /\son[a-z]+\s*=/i, message: "이벤트 속성(on…)이 있다" },
  { pattern: /@import\b/i, message: "@import 가 있다" },
];

/** SVG 글의 안전 문제 목록(없으면 빈 배열). */
export function checkSvg(text: string): string[] {
  return SVG_RULES.filter((rule) => rule.pattern.test(text)).map(
    (rule) => rule.message,
  );
}

export type FileSize = { name: string; bytes: number };
export type ImageFile = FileSize & { text: string };

/** 그림 파일 이름(images/vocab/ 뒤). 꼴이 다르면 null. */
function fileNameOf(file: string): string | null {
  const prefix = `${IMAGE_DIR}/`;
  if (!file.startsWith(prefix)) return null;
  const name = file.slice(prefix.length);
  return name.includes("/") ? null : name;
}

/** 행마다 파일 있음 · 파일 이름 = 키 · 크기 ≤ IMAGE_MAX_BYTES, 카탈로그 밖 파일 없음. 문제 목록을 돌려준다. */
export function checkCatalogFiles(input: {
  images: readonly ImageEntry[];
  files: readonly FileSize[];
}): string[] {
  const problems: string[] = [];
  const sizes = new Map(input.files.map((f) => [f.name, f.bytes]));
  const listed = new Set<string>();
  for (const image of input.images) {
    const name = fileNameOf(image.file);
    if (name === null) {
      problems.push(
        `${image.key}: 그림 파일이 ${IMAGE_DIR}/ 밖이다: ${image.file}`,
      );
      continue;
    }
    listed.add(name);
    if (name.replace(/\.[^.]+$/, "") !== image.key) {
      problems.push(`${image.key}: 파일 이름이 키와 다르다: ${name}`);
    }
    const bytes = sizes.get(name);
    if (bytes === undefined) {
      problems.push(`${image.key}: 파일이 없다: ${name}`);
    } else if (bytes > IMAGE_MAX_BYTES) {
      problems.push(
        `${image.key}: 파일이 ${bytes}바이트로 상한 ${IMAGE_MAX_BYTES}바이트를 넘는다: ${name}`,
      );
    }
  }
  for (const file of input.files) {
    if (!listed.has(file.name)) {
      problems.push(`카탈로그 밖 파일이 있다: ${IMAGE_DIR}/${file.name}`);
    }
  }
  return problems;
}

export type CommandResult = { code: 0 | 1 | 2; lines: string[] };
type CatalogParse =
  | { ok: true; images: ImageEntry[] }
  | { ok: false; error: string };

/** 카탈로그 글(없으면 null)을 읽고 규격으로 본다. */
export function parseCatalog(
  text: string | null,
  root: string = DEFAULT_ROOT,
): CatalogParse {
  const path = join(root, SEED_DIR, SEED_FILES.images);
  if (text === null) return { ok: false, error: `카탈로그가 없다: ${path}` };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: `카탈로그가 JSON 이 아니다: ${path}` };
  }
  const parsed = ImagesFileSchema.safeParse(json);
  if (!parsed.success) {
    const where = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".") || "(뿌리)"} ${i.message}`)
      .join(" / ");
    return { ok: false, error: `카탈로그 꼴이 틀리다: ${path}: ${where}` };
  }
  return { ok: true, images: parsed.data.images };
}

/** 행의 출처 글과 라이선스 짝 문제. */
function sourceProblems(image: ImageEntry): string[] {
  const source = parseSource(image.source);
  if (source.kind === "invalid") return [`${image.key}: ${source.message}`];
  const want = LICENSE_OF_SOURCE[source.kind];
  return image.license === want
    ? []
    : [
        `${image.key}: 출처 ${image.source} 의 라이선스는 ${want} 여야 한다: ${image.license}`,
      ];
}

/**
 * check 명령의 본체(파일은 읽어서 넘긴다). files 가 null 이면 그림 폴더가 없다.
 * 행이 0 이면 폴더가 없어도 통과한다(빈 카탈로그를 먼저 넣고 git 은 빈 폴더를 싣지 않는다, P6b 검토 I-1).
 * root 는 오류 글에 실제로 본 경로를 보이는 데만 쓴다(M-3).
 */
export function runCheck(input: {
  catalog: string | null;
  files: readonly ImageFile[] | null;
  root?: string;
}): CommandResult {
  const root = input.root ?? DEFAULT_ROOT;
  const catalog = parseCatalog(input.catalog, root);
  if (!catalog.ok)
    return { code: 2, lines: [`vocab-images: ${catalog.error}`] };
  if (input.files === null && catalog.images.length > 0) {
    return {
      code: 2,
      lines: [
        `vocab-images: 그림 폴더가 없다: ${join(root, PUBLIC_DIR, IMAGE_DIR)}`,
      ],
    };
  }
  const files = input.files ?? [];
  const problems = [
    ...catalog.images.flatMap(sourceProblems),
    ...checkCatalogFiles({ images: catalog.images, files }),
  ];
  for (const file of files) {
    if (!file.name.endsWith(".svg")) continue;
    for (const p of checkSvg(file.text)) {
      problems.push(`${IMAGE_DIR}/${file.name}: ${p}`);
    }
  }
  return {
    code: problems.length === 0 ? 0 : 1,
    lines: [
      `vocab-images check: 행 ${catalog.images.length} · 파일 ${files.length} · 위반 ${problems.length}`,
      ...problems,
    ],
  };
}

export type CliArgs = { command: "fetch" | "check"; root: string };
export type ParsedArgs =
  | { ok: true; args: CliArgs }
  | { ok: false; error: string };

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const [command, ...rest] = argv;
  if (command !== "fetch" && command !== "check") {
    return {
      ok: false,
      error: `첫 인자는 fetch 나 check 다: ${command ?? ""}`,
    };
  }
  const args: CliArgs = { command, root: DEFAULT_ROOT };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === "--root") {
      const v = rest[++i];
      if (!v) return { ok: false, error: "--root 다음에 폴더가 없다" };
      args.root = v;
    } else {
      return { ok: false, error: `모르는 인자: ${arg}` };
    }
  }
  return { ok: true, args };
}

/** macOS Finder 가 만드는 파일. 그림 폴더에서 건너뛴다(그 밖 숨은 파일은 카탈로그 밖으로 잡는다, P6b 검토 M-4). */
export const SKIPPED_FILES: readonly string[] = [".DS_Store"];

/** 그림 폴더의 파일을 읽는다(폴더가 없으면 null). 없음(ENOENT) 밖의 오류와 폴더 자리에 파일이 있는 경우는 삼키지 않고 던진다(P6b 재검토 N-1). 하위 폴더는 이름 끝에 / 를 붙여 카탈로그 밖으로 잡히게 한다. */
export function readImageFiles(dir: string): ImageFile[] | null {
  let stat: ReturnType<typeof statSync>;
  try {
    stat = statSync(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  if (!stat.isDirectory()) {
    throw new Error(`그림 폴더 자리에 폴더가 아닌 것이 있다: ${dir}`);
  }
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !SKIPPED_FILES.includes(entry.name))
    .map((entry): ImageFile => {
      const name = entry.name.normalize("NFC");
      if (!entry.isFile()) return { name: `${name}/`, bytes: 0, text: "" };
      const buffer = readFileSync(join(dir, entry.name));
      return { name, bytes: buffer.length, text: buffer.toString("utf8") };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function readCatalog(root: string): string | null {
  try {
    return readFileSync(join(root, SEED_DIR, SEED_FILES.images), "utf8");
  } catch {
    return null;
  }
}

/** fetch: Twemoji 행마다 받아 쓴다. 받은 글도 크기 · SVG 안전을 본 뒤에만 쓴다. */
async function runFetch(root: string): Promise<CommandResult> {
  const catalog = parseCatalog(readCatalog(root), root);
  if (!catalog.ok)
    return { code: 2, lines: [`vocab-images: ${catalog.error}`] };
  const problems: string[] = [];
  let written = 0;
  let same = 0;
  let twemoji = 0;
  for (const image of catalog.images) {
    const source = parseSource(image.source);
    if (source.kind === "invalid") {
      problems.push(`${image.key}: ${source.message}`);
      continue;
    }
    if (source.kind !== "twemoji") continue;
    twemoji++;
    if (!image.file.endsWith(".svg")) {
      problems.push(
        `${image.key}: Twemoji 그림 파일은 .svg 여야 한다: ${image.file}`,
      );
      continue;
    }
    const url = twemojiUrl(source.version, source.code);
    let text: string;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        problems.push(`${image.key}: 받기 실패 ${response.status}: ${url}`);
        continue;
      }
      text = await response.text();
    } catch (error) {
      problems.push(
        `${image.key}: 받기 실패: ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }
    const bytes = Buffer.byteLength(text, "utf8");
    const unsafe = checkSvg(text);
    if (unsafe.length > 0 || bytes > IMAGE_MAX_BYTES) {
      problems.push(
        `${image.key}: 받은 SVG 를 쓰지 않았다(${[...unsafe, ...(bytes > IMAGE_MAX_BYTES ? [`${bytes}바이트 상한 넘음`] : [])].join(" · ")}): ${url}`,
      );
      continue;
    }
    const target = join(root, PUBLIC_DIR, image.file);
    let current: string | null = null;
    try {
      current = readFileSync(target, "utf8");
    } catch {
      current = null;
    }
    if (current === text) {
      same++;
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
    written++;
  }
  return {
    code: problems.length === 0 ? 0 : 1,
    lines: [
      `vocab-images fetch: Twemoji 행 ${twemoji} · 씀 ${written} · 같아서 건너뜀 ${same} · 실패 ${problems.length}`,
      ...problems,
    ],
  };
}

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`vocab-images: ${parsed.error}`);
    return 2;
  }
  const root = resolve(process.cwd(), parsed.args.root);
  let files: ImageFile[] | null;
  try {
    files = readImageFiles(join(root, PUBLIC_DIR, IMAGE_DIR));
  } catch (error) {
    // 없음(ENOENT) 밖의 오류 · 폴더 자리에 파일은 입력 오류(2)로 알린다(P6b 재검토 N-1).
    console.error(
      `vocab-images: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 2;
  }
  const { code, lines } =
    parsed.args.command === "fetch"
      ? await runFetch(root)
      : runCheck({ catalog: readCatalog(root), files, root });
  const write = code === 2 ? console.error : console.log;
  for (const line of lines) write(line);
  return code;
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

// fetch 는 네트워크를 기다리므로 main 이 Promise 를 돌려준다.
if (isDirectRun()) {
  void main().then((code) => {
    process.exitCode = code;
  });
}

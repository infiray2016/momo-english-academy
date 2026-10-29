// 시드 검증 명령(plan-p04c '명령', 6.3 순서 (0) · 6.4 · 9절 시드 검증 행).
// 사용: pnpm seed:validate [--root <폴더>] [--complete-through <n|settings>] [--areas <영역,…>] [--json] [--stats]
// 종료 코드: 0 통과(경고가 있어도), 1 위반, 2 입력 오류(모르는 인자 · 잘못된 값 · 뿌리 폴더 없음 · 꼭 있어야 하는 규격 파일 없음 ·
// --complete-through settings 인데 키 없음 · 선생님 자산 크기 상한 설정 없음). 순수 함수(parseArgs · runValidate)를 내보내고 파일 걷기 · 출력은 직접 실행될 때만 한다.
// API 를 부르지 않는다(seed/checks 의 저장 결과만 읽는다, AC-7d).
// 선생님 자산 검사(AC-19k)는 --root 가 달라도 저장소 뿌리(실행 폴더)의 public/ · CREDITS.md 를 읽고, 크기 상한은 읽은 시드 settings.json 에서 가져온다.
import { createHash } from "node:crypto";
import {
  type Dirent,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { TeacherAssetIo } from "../src/core/seed/check-teacher";
import {
  AREAS,
  type Area,
  LEVEL_MAX,
  LEVEL_MIN,
  SEED_FILES,
  SEED_UNWALKED_DIRS,
} from "../src/core/seed/structure";
import {
  exitCodeOf,
  type SeedReport,
  validateSeed,
} from "../src/core/seed/validate";

export const DEFAULT_ROOT = "seed";
/** 없거나 JSON 이 아니면 종료 2 인 규격 파일(plan-p04c 명령). */
export const REQUIRED_FILES: readonly string[] = [
  SEED_FILES.settings,
  SEED_FILES.levelSpecs,
  SEED_FILES.unitSpecs,
  SEED_FILES.vocab,
  SEED_FILES.images,
  SEED_FILES.forms,
  SEED_FILES.forbidden,
];

export type CliArgs = {
  root: string;
  completeThrough?: number | "settings";
  areas: Area[];
  json: boolean;
  stats: boolean;
};
export type ParsedArgs =
  | { ok: true; args: CliArgs }
  | { ok: false; error: string };

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const args: CliArgs = {
    root: DEFAULT_ROOT,
    areas: [...AREAS],
    json: false,
    stats: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => argv[++i];
    switch (arg) {
      case "--root": {
        const v = value();
        if (!v) return { ok: false, error: "--root 다음에 폴더가 없다" };
        args.root = v;
        break;
      }
      case "--complete-through": {
        const v = value();
        if (v === "settings") {
          args.completeThrough = "settings";
          break;
        }
        const n = Number(v);
        if (!v || !Number.isInteger(n) || n < LEVEL_MIN || n > LEVEL_MAX) {
          return {
            ok: false,
            error: `--complete-through 는 ${LEVEL_MIN}~${LEVEL_MAX} 정수나 settings 다: ${v ?? ""}`,
          };
        }
        args.completeThrough = n;
        break;
      }
      case "--areas": {
        const v = value();
        const list = (v ?? "").split(",").filter((a) => a !== "");
        const bad = list.filter(
          (a) => !(AREAS as readonly string[]).includes(a),
        );
        if (list.length === 0 || bad.length > 0) {
          return {
            ok: false,
            error: `--areas 는 ${AREAS.join(",")} 가운데에서 쉼표로 잇는다: ${v ?? ""}`,
          };
        }
        args.areas = list as Area[];
        break;
      }
      case "--json":
        args.json = true;
        break;
      case "--stats":
        args.stats = true;
        break;
      default:
        return { ok: false, error: `모르는 인자: ${arg}` };
    }
  }
  return { ok: true, args };
}

function summaryLine(report: SeedReport): string {
  const s = report.summary;
  return `seed-validate: 칸 ${s.cells} · 통과 ${s.passed} · 실패 ${s.failed} · 빈 칸 ${s.empty} · 풀이 검사 안 됨 ${s.unchecked} · 사람 확인 ${s.pendingHuman} · 경고 ${s.warnings} · 규격 파일 오류 ${s.referenceErrors}`;
}

function humanLines(report: SeedReport, stats: boolean): string[] {
  const lines = [summaryLine(report)];
  for (const e of report.errors) {
    lines.push(`${e.file}:${e.path} ${e.rule} ${e.cell ?? "-"} ${e.message}`);
  }
  for (const w of report.warnings) {
    lines.push(`경고 ${w.file ?? "-"} ${w.rule} ${w.id} ${w.message}`);
  }
  for (const key of report.pendingHuman) lines.push(`사람 확인 ${key}`);
  if (stats) {
    for (const s of report.stats) {
      const parts = [
        `${s.area} ${s.level}단계 단원 ${s.unit}`,
        `문장 낱말 ${s.sentenceWords.toFixed(2)}`,
        ...(s.passageWords !== undefined
          ? [`지문 낱말 ${s.passageWords.toFixed(1)}`]
          : []),
        ...(s.offbandRatio !== undefined
          ? [`범위 밖 ${(s.offbandRatio * 100).toFixed(1)}%`]
          : []),
        ...(s.answerTargetWords !== undefined
          ? [`답하는 대상 단원 단어 ${s.answerTargetWords}`]
          : []),
      ];
      lines.push(`통계 ${parts.join(" · ")}`);
    }
  }
  return lines;
}

/** 명단의 모델 · 초상 경로를 찾는 정적 자산 폴더(같은 출처, 저장소 뿌리 기준, C130). */
export const PUBLIC_DIR = "public";
/** 선생님 자산 검사의 출처 문서(저장소 뿌리 기준, 자산 검사 (f)). */
export const CREDITS_FILE = "CREDITS.md";
/** 선생님 자산 크기 상한 설정 키(12절 · C131). */
export const TEACHER_LIMIT_KEYS = {
  modelMaxMb: "talk.teacher_model_max_mb",
  portraitMaxKb: "talk.teacher_portrait_max_kb",
} as const;

/** 자산 검사 io 가운데 저장소 뿌리에서 읽는 몫(크기 상한은 시드 settings.json 에서 runValidate 가 붙인다). */
export type TeacherAssetFiles = Omit<TeacherAssetIo, "limits">;

/** 읽은 시드의 settings.json 에서 선생님 자산 크기 상한 둘을 읽는다(없거나 양수가 아니면 오류 글). */
export function teacherAssetLimits(
  files: ReadonlyMap<string, string>,
):
  | { ok: true; limits: TeacherAssetIo["limits"] }
  | { ok: false; error: string } {
  let rows: { key?: unknown; value?: unknown }[] = [];
  try {
    const parsed = JSON.parse(files.get(SEED_FILES.settings) ?? "{}") as {
      settings?: unknown;
    };
    if (Array.isArray(parsed.settings)) rows = parsed.settings;
  } catch {
    return { ok: false, error: "settings.json 이 JSON 이 아니다" };
  }
  const read = (key: string) => {
    const value = rows.find((r) => r.key === key)?.value;
    return typeof value === "number" && value > 0 ? value : undefined;
  };
  const modelMaxMb = read(TEACHER_LIMIT_KEYS.modelMaxMb);
  const portraitMaxKb = read(TEACHER_LIMIT_KEYS.portraitMaxKb);
  if (modelMaxMb === undefined)
    return {
      ok: false,
      error: `settings.json 에 ${TEACHER_LIMIT_KEYS.modelMaxMb}(양수)가 없다 — 선생님 자산 검사가 읽는다`,
    };
  if (portraitMaxKb === undefined)
    return {
      ok: false,
      error: `settings.json 에 ${TEACHER_LIMIT_KEYS.portraitMaxKb}(양수)가 없다 — 선생님 자산 검사가 읽는다`,
    };
  return { ok: true, limits: { modelMaxMb, portraitMaxKb } };
}

/** 저장소 뿌리의 public/(파일 읽기 · .vrm 목록)과 CREDITS.md 로 자산 검사 io 를 만든다. */
export function publicAssetFiles(repoRoot: string): TeacherAssetFiles {
  const publicRoot = resolve(repoRoot, PUBLIC_DIR);
  const vrms: string[] = [];
  const walk = (dir: string) => {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".vrm"))
        vrms.push(relative(publicRoot, full).split(sep).join("/"));
    }
  };
  walk(publicRoot);
  let credits: string | undefined;
  try {
    credits = readFileSync(resolve(repoRoot, CREDITS_FILE), "utf8");
  } catch {
    credits = undefined;
  }
  return {
    read: (path) => {
      try {
        return new Uint8Array(readFileSync(join(publicRoot, path)));
      } catch {
        return undefined;
      }
    },
    sha256: (bytes) => createHash("sha256").update(bytes).digest("hex"),
    publicVrmFiles: vrms.sort(),
    credits,
  };
}

/**
 * 인자와 읽은 파일 묶음(seed/ 뿌리 기준 경로 → 글, 뿌리가 없으면 null)으로 검증하고 종료 코드와 출력 줄을 돌려준다.
 * 종료 2 의 출력은 표준 오류로 낸다(직접 실행 때). assets 를 넘기면 선생님 자산 검사를 한다(크기 상한은 settings.json — 없으면 2).
 */
export function runValidate(
  args: CliArgs,
  files: ReadonlyMap<string, string> | null,
  assets?: TeacherAssetFiles,
): { code: 0 | 1 | 2; lines: string[] } {
  if (files === null) {
    return {
      code: 2,
      lines: [`seed-validate: 시드 뿌리 폴더가 없다: ${args.root}`],
    };
  }
  for (const path of REQUIRED_FILES) {
    const text = files.get(path);
    if (text === undefined) {
      return {
        code: 2,
        lines: [`seed-validate: 꼭 있어야 하는 규격 파일이 없다: ${path}`],
      };
    }
    try {
      JSON.parse(text);
    } catch {
      return {
        code: 2,
        lines: [`seed-validate: 규격 파일이 JSON 이 아니다: ${path}`],
      };
    }
  }
  let through: number | undefined;
  if (args.completeThrough === "settings") {
    const settings = JSON.parse(files.get(SEED_FILES.settings) ?? "{}") as {
      settings?: { key?: unknown; value?: unknown }[];
    };
    const row = settings.settings?.find(
      (r) => r.key === "seed.complete_through_level",
    );
    if (typeof row?.value !== "number") {
      return {
        code: 2,
        lines: [
          "seed-validate: settings.json 에 seed.complete_through_level 이 없다",
        ],
      };
    }
    // 1~12 정수가 아니면 조용히 0 으로 끝나지 않게 입력 오류로 끝낸다(P4c 검토 M-2).
    if (
      !Number.isInteger(row.value) ||
      row.value < LEVEL_MIN ||
      row.value > LEVEL_MAX
    ) {
      return {
        code: 2,
        lines: [
          `seed-validate: seed.complete_through_level ${row.value} 이 ${LEVEL_MIN}~${LEVEL_MAX} 정수가 아니다`,
        ],
      };
    }
    through = row.value;
  } else {
    through = args.completeThrough;
  }
  let teacherAssets: TeacherAssetIo | undefined;
  if (assets) {
    const limits = teacherAssetLimits(files);
    if (!limits.ok)
      return { code: 2, lines: [`seed-validate: ${limits.error}`] };
    teacherAssets = { ...assets, limits: limits.limits };
  }
  const report = validateSeed(files, {
    mode: through === undefined ? "pr" : "complete",
    ...(through === undefined ? {} : { through }),
    areas: args.areas,
    ...(teacherAssets ? { teacherAssets } : {}),
  });
  const code = exitCodeOf(report);
  return {
    code,
    lines: args.json
      ? [JSON.stringify(report, null, 2)]
      : humanLines(report, args.stats),
  };
}

/** 시드 뿌리를 걸어 .json 파일을 읽는다(prompts · manifest · reports 는 걷지 않는다). 뿌리가 없으면 null. */
export function readSeedTree(root: string): Map<string, string> | null {
  let isDir = false;
  try {
    isDir = statSync(root).isDirectory();
  } catch {
    isDir = false;
  }
  if (!isDir) return null;
  const files = new Map<string, string>();
  const walk = (dir: string) => {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      const rel = relative(root, full).split(sep).join("/").normalize("NFC");
      if (entry.isDirectory()) {
        if (
          dir === root &&
          (SEED_UNWALKED_DIRS as readonly string[]).includes(entry.name)
        )
          continue;
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        files.set(rel, readFileSync(full, "utf8"));
      }
    }
  };
  walk(root);
  return files;
}

function main(): number {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`seed-validate: ${parsed.error}`);
    return 2;
  }
  const root = resolve(process.cwd(), parsed.args.root);
  const { code, lines } = runValidate(
    parsed.args,
    readSeedTree(root),
    publicAssetFiles(process.cwd()),
  );
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

if (isDirectRun()) process.exitCode = main();

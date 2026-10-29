// 풀이 검사 명령(plan-p05a '명령', 6.4 '풀이 검사' 행 · 6.3 순서 (0) · AC-7d).
// 사용: pnpm seed:check [--root <폴더>] [--areas <영역,…>] [--levels <n|n-m>] [--file <내용 파일 경로>] [--force]
//        [--max-calls <n>] [--concurrency <n>] [--dry-run] [--probe] [--json]
// 종료 코드: 0 대상 칸을 모두 풂(사람 확인이 생겨도) · --dry-run · --probe 성공, 1 실패 칸 · 검증 실패로 건너뛴 칸 · --max-calls 로 남은 칸 ·
// --probe 실패, 2 입력 · 환경 오류. 요청자의 개발용 키(.env.local, H4)로 요청자 컴퓨터에서만 돈다. CI 는 부르지 않는다(AC-7d).
// 순수 꼴(parseArgs · checkEnvironment · runCheck · runProbe)을 내보내고 파일 읽기 · 쓰기 · 출력은 직접 실행될 때만 한다.
// @anthropic-ai/sdk 를 값으로 가져오는 파일은 이것 하나다(의존 규칙 sdk-only-in-ai 는 scripts/ 를 보지 않는다).
import { randomBytes } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  type CheckFile,
  CheckFileSchema,
  type CheckRecord,
} from "../src/core/seed/schema/records";
import {
  type ModelPrice,
  ModelPricesFileSchema,
} from "../src/core/seed/schema/reference";
import {
  buildCheckRecord,
  buildSolveRequest,
  costOf,
  interpretSolveMessage,
  isContentFilePath,
  judgeSolve,
  mergeCheckFile,
  priceOf,
  roundCost,
  SOLVE_INSTRUCTIONS,
  type SolveIndex,
  type SolveMessage,
  SolveOutputSchema,
  type SolveRequest,
  type Solver,
  type SolveUsage,
  selectSolveTargets,
  solveCallAccepted,
  solveUserMessage,
  tokensOf,
} from "../src/core/seed/solve-check";
import {
  AREAS,
  type Area,
  cellKey,
  checksFilePath,
  type Effort,
  LEVEL_MAX,
  LEVEL_MIN,
  parseSeedPath,
  SEED_FILES,
} from "../src/core/seed/structure";
import {
  type CollectedCell,
  type SeedCell,
  solveStatus,
  solveTargets,
} from "../src/core/seed/validate";
import { DEFAULT_ROOT, REQUIRED_FILES, readSeedTree } from "./seed-validate";

// ── 호출 설정(정할 것 나, C62 (2): 12절 키가 아니라 이름 붙인 상수) ──────

/** 6.4(잠정) · 10절 AI 행. */
export const SOLVE_MODEL = "claude-sonnet-5-5";
/** 6.4 · 6.6. */
export const SOLVE_EFFORT: Effort = "low";
/** 6.4 · 6.1 '답 앞의 생각 단계 끔'. Sonnet 5.5 는 effort high 이하에서만 받는다. */
export const SOLVE_THINKING = { type: "between_tools" } as const;
/** 기술 값: 생각을 끈 JSON 답이라 6.6 가정 출력 300 의 열 배 넘게 둔다. 6.3 순서 (2) 표본의 출력 p99 로 고친다. */
export const SOLVE_MAX_TOKENS = 4000;
/** 기술 값(요청 하나). */
export const SOLVE_TIMEOUT_MS = 60_000;
/** SDK 기본(408 · 409 · 429 · 5xx · 연결 오류). 아이가 기다리는 실시간 호출이 아니어서 6.1 의 0(C1)을 쓰지 않는다(정할 것 다). */
export const SOLVE_MAX_RETRIES = 2;
/** 동시 호출 수(기술 값): 기본 1, 1~8. */
export const SOLVE_CONCURRENCY_DEFAULT = 1;
export const SOLVE_CONCURRENCY_MAX = 8;
/** 출력에 싣는 오류 글의 최대 길이(기술 값). */
export const REASON_MAX_CHARS = 300;
/** 사람 확인을 여는 시드 보기 화면(P5b). */
export const VIEWER_PATH = "/dev/seed-viewer";
/** 출력에서 비밀값을 바꿔 쓰는 글. */
const REDACTED = "***";

/** --probe 고정 문항(읽기 지문 한 줄 · 보기 넷). 시드 대신 실제로 한 번 불러 조합 · 응답 꼴을 확인한다(작업 7). */
export const PROBE_CELL: SeedCell = {
  key: cellKey({
    type: "level-test",
    area: "reading",
    level: LEVEL_MIN,
    form: 1,
    no: 1,
  }),
  kind: "test-item",
  area: "reading",
  value: {
    no: 1,
    unit: 1,
    revision: 1,
    correction: 0,
    type: "fact",
    passage: "Tori has a red ball.",
    prompt: "What color is Tori's ball?",
    options: ["blue", "red", "green", "yellow"],
    answerNo: 2,
  },
};

// ── 인자 ─────────────────────────────────────────────────────────

export type CheckArgs = {
  root: string;
  areas: Area[];
  levels: { min: number; max: number } | null;
  file: string | null;
  force: boolean;
  maxCalls: number | null;
  concurrency: number;
  dryRun: boolean;
  probe: boolean;
  json: boolean;
};
export type ParsedArgs =
  | { ok: true; args: CheckArgs }
  | { ok: false; error: string };

function positiveInt(text: string | undefined): number | undefined {
  return text !== undefined && /^[1-9][0-9]*$/.test(text)
    ? Number(text)
    : undefined;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const args: CheckArgs = {
    root: DEFAULT_ROOT,
    areas: [...AREAS],
    levels: null,
    file: null,
    force: false,
    maxCalls: null,
    concurrency: SOLVE_CONCURRENCY_DEFAULT,
    dryRun: false,
    probe: false,
    json: false,
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
      case "--levels": {
        const v = value();
        const match = /^([0-9]+)(?:-([0-9]+))?$/.exec(v ?? "");
        const min = positiveInt(match?.[1]);
        const max = match?.[2] === undefined ? min : positiveInt(match[2]);
        if (
          min === undefined ||
          max === undefined ||
          min < LEVEL_MIN ||
          max > LEVEL_MAX ||
          min > max
        ) {
          return {
            ok: false,
            error: `--levels 는 ${LEVEL_MIN}~${LEVEL_MAX} 의 n 또는 n-m 이다: ${v ?? ""}`,
          };
        }
        args.levels = { min, max };
        break;
      }
      case "--file": {
        const v = value();
        if (!v || !isContentFilePath(v)) {
          return {
            ok: false,
            error: `--file 은 내용 파일 경로(lessons/reading/4/2.json 꼴)다: ${v ?? ""}`,
          };
        }
        args.file = v;
        break;
      }
      case "--force":
        args.force = true;
        break;
      case "--max-calls": {
        const v = value();
        const n = positiveInt(v);
        if (n === undefined)
          return {
            ok: false,
            error: `--max-calls 는 1 이상 정수다: ${v ?? ""}`,
          };
        args.maxCalls = n;
        break;
      }
      case "--concurrency": {
        const v = value();
        const n = positiveInt(v);
        if (n === undefined || n > SOLVE_CONCURRENCY_MAX)
          return {
            ok: false,
            error: `--concurrency 는 1~${SOLVE_CONCURRENCY_MAX} 정수다: ${v ?? ""}`,
          };
        args.concurrency = n;
        break;
      }
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--probe":
        args.probe = true;
        break;
      case "--json":
        args.json = true;
        break;
      default:
        return { ok: false, error: `모르는 인자: ${arg}` };
    }
  }
  if (args.probe && args.dryRun)
    return { ok: false, error: "--probe 와 --dry-run 은 함께 쓰지 않는다" };
  return { ok: true, args };
}

export type RunMode = "solve" | "dry-run" | "probe";
export function modeOf(args: CheckArgs): RunMode {
  if (args.probe) return "probe";
  return args.dryRun ? "dry-run" : "solve";
}

// ── 환경 확인 ────────────────────────────────────────────────────

/**
 * CI 가 비지 않으면 풀이 · --probe 를 거부한다(CI 는 API 를 부르지 않는다, AC-7d). --dry-run 은 부르지 않으므로 된다.
 * 키가 없으면 거부한다. 키 값은 어느 출력에도 내지 않는다.
 */
export function checkEnvironment(
  env: Readonly<Record<string, string | undefined>>,
  mode: RunMode,
): { ok: true; apiKey: string | null } | { ok: false; error: string } {
  if (mode === "dry-run") return { ok: true, apiKey: null };
  if (env.CI)
    return {
      ok: false,
      error:
        "CI 환경(CI 변수)에서는 풀이 검사가 API 를 부르지 않는다. 저장 결과는 seed:validate 가 읽는다(--dry-run 은 된다)",
    };
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return {
      ok: false,
      error: "개발용 키(.env.local, H4)가 없다",
    };
  return { ok: true, apiKey };
}

// ── 기록 파일 읽기 · 쓰기 ────────────────────────────────────────

/** seed/ 뿌리 기준 경로로 기록 파일을 읽고 쓰는 곳(시험은 메모리, 직접 실행은 파일). */
export type CheckStore = {
  read(path: string): string | undefined;
  write(path: string, text: string): void;
};

/** 시드 뿌리 폴더의 파일. 쓰기는 같은 폴더 임시 파일에 쓰고 이름을 바꾼다(폴더는 처음 쓸 때 만든다). */
export function fileStore(root: string): CheckStore {
  const full = (path: string) => join(root, ...path.split("/"));
  return {
    read(path) {
      try {
        return readFileSync(full(path), "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT")
          return undefined;
        throw error;
      }
    },
    write(path, text) {
      const target = full(path);
      mkdirSync(dirname(target), { recursive: true });
      const temp = `${target}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
      writeFileSync(temp, text);
      renameSync(temp, target);
    },
  };
}

// ── 출력 도구 ────────────────────────────────────────────────────

/** 비밀값(키)을 바꿔 쓴다. */
export function redact(text: string, secrets: readonly string[]): string {
  let out = text;
  for (const secret of secrets) {
    if (secret) out = out.split(secret).join(REDACTED);
  }
  return out;
}

function oneLine(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > REASON_MAX_CHARS
    ? `${flat.slice(0, REASON_MAX_CHARS)}…`
    : flat;
}

/** SDK 예외를 한 줄 까닭으로(상태 · 이름 · 글, 비밀값 가림). */
function errorReason(error: unknown, secrets: readonly string[]): string {
  if (error instanceof Error) {
    const status = (error as { status?: unknown }).status;
    const head = typeof status === "number" ? `API 오류 ${status}` : "API 오류";
    return redact(`${head} ${error.name}: ${oneLine(error.message)}`, secrets);
  }
  return redact(`API 오류: ${oneLine(String(error))}`, secrets);
}

function viewerUrl(cell: CollectedCell): string {
  return `${VIEWER_PATH}?file=${encodeURIComponent(cell.file)}&cell=${encodeURIComponent(cell.key)}`;
}

function formatCost(usd: number | null): string {
  return usd === null ? "-" : String(roundCost(usd));
}

/** 내용 파일 경로의 영역(토리 이야기는 회화). 내용 파일이 아니면 undefined. */
function fileArea(path: string): Area | undefined {
  const parsed = parseSeedPath(path);
  if (!parsed) return undefined;
  switch (parsed.kind) {
    case "lessons":
    case "level-tests":
    case "placement":
      return parsed.area;
    case "stories":
      return "talk";
    default:
      return undefined;
  }
}

/**
 * SDK 는 ANTHROPIC_BASE_URL 을 환경에서 읽어 그 주소로 키를 보낸다. 풀이 · --probe 때 값이 있으면 알린다
 * (동작은 바꾸지 않는다, 검토 범위 밖 관찰 1). 늘 표준 오류로 내어 사람 출력 첫 줄 꼴을 지키고, 접속 정보가 섞이지 않게
 * 호스트만 낸다(재검토 N-1).
 */
export function baseUrlNotice(
  env: Readonly<Record<string, string | undefined>>,
  mode: RunMode,
): string | null {
  const base = env.ANTHROPIC_BASE_URL;
  if (mode === "dry-run" || !base) return null;
  try {
    return `seed-check: 주소 ${new URL(base).host}`;
  } catch {
    return "seed-check: 주소 꼴이 아닌 값";
  }
}

// ── 실행 ─────────────────────────────────────────────────────────

export type CellStatus =
  | "passed"
  | "pending-human"
  | "failed"
  | "skipped"
  | "remaining"
  | "planned";
/** `--json` 보고 꼴(version 1, P8 시드 묶음 워크플로가 읽는다). 꼴을 바꿀 때는 version 을 올리고 P8 과 맞춘다. */
export type CheckReport = {
  version: 1;
  mode: "solve" | "dry-run";
  model: string;
  effort: Effort;
  thinking: string;
  filter: {
    areas: Area[];
    levels: { min: number; max: number } | null;
    file: string | null;
  };
  summary: {
    targets: number;
    solved: number;
    passed: number;
    pendingHuman: number;
    failed: number;
    skipped: number;
    remaining: number;
    refused: number;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number | null;
  };
  cells: {
    cell: string;
    file: string;
    status: CellStatus;
    verdicts?: { no: number; verdict: string }[];
    reason?: string;
  }[];
};
export type RunResult = { code: 0 | 1 | 2; lines: string[] };

export type CheckDeps = {
  /** 읽은 시드(seed/ 뿌리 기준 경로 → 글). 뿌리가 없으면 null. */
  files: ReadonlyMap<string, string> | null;
  /** 풀이 함수(--dry-run 은 부르지 않는다). */
  solver?: Solver;
  /** 실행 시각(풀이 at · 단가 날짜). */
  now: () => Date;
  store: CheckStore;
  /** 출력에서 가릴 비밀값. */
  secrets?: readonly string[];
};

function inputError(message: string): RunResult {
  return { code: 2, lines: [`seed-check: ${message}`] };
}

/** 시드 · 단가 확인(종료 2 갈래). 맞으면 오늘 단가 행. */
function prepare(
  args: CheckArgs,
  files: ReadonlyMap<string, string> | null,
  today: string,
): { ok: true; price: ModelPrice } | { ok: false; result: RunResult } {
  const fail = (message: string) => ({
    ok: false as const,
    result: inputError(message),
  });
  if (files === null) return fail(`시드 뿌리 폴더가 없다: ${args.root}`);
  for (const path of [...REQUIRED_FILES, SEED_FILES.modelPrices]) {
    const text = files.get(path);
    if (text === undefined)
      return fail(`꼭 있어야 하는 규격 파일이 없다: ${path}`);
    try {
      JSON.parse(text);
    } catch {
      return fail(`규격 파일이 JSON 이 아니다: ${path}`);
    }
  }
  const prices = ModelPricesFileSchema.safeParse(
    JSON.parse(files.get(SEED_FILES.modelPrices) ?? "{}"),
  );
  if (!prices.success)
    return fail(`${SEED_FILES.modelPrices} 가 규격에 맞지 않는다`);
  const price = priceOf(prices.data.models, SOLVE_MODEL, today);
  if (!price)
    return fail(
      `${SEED_FILES.modelPrices} 에 ${SOLVE_MODEL} 의 ${today} 단가 행이 없다`,
    );
  if (
    !solveCallAccepted(price, {
      thinking: SOLVE_THINKING.type,
      effort: SOLVE_EFFORT,
    })
  ) {
    return fail(
      `${SOLVE_MODEL} 단가 행이 생각 단계 ${SOLVE_THINKING.type} · effort ${SOLVE_EFFORT} 조합을 받지 않는다(6.1 조합 표)`,
    );
  }
  return { ok: true, price };
}

type CellResult = {
  cell: CollectedCell;
  status: "passed" | "pending-human" | "failed";
  reason?: string;
  verdicts?: { no: number; verdict: string }[];
  refused: boolean;
  called: boolean;
  usage?: SolveUsage;
  costUsd: number;
};

/** 기록 파일을 읽는다. 없으면 file 이 undefined, JSON 이 아니거나 규격에 맞지 않으면 실패(덮어쓰지 않는다). */
function readCheckFile(
  store: CheckStore,
  path: string,
): { ok: true; file: CheckFile | undefined } | { ok: false; reason: string } {
  const text = store.read(path);
  if (text === undefined) return { ok: true, file: undefined };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, reason: `기록 파일이 깨졌다(JSON 이 아니다): ${path}` };
  }
  const parsed = CheckFileSchema.safeParse(json);
  if (!parsed.success)
    return {
      ok: false,
      reason: `기록 파일이 깨졌다(규격에 맞지 않는다): ${path}`,
    };
  return { ok: true, file: parsed.data };
}

/** 그 칸의 기록 파일을 다시 읽어 이 칸 기록만 바꿔 쓴다(위험 8). */
function writeRecord(
  store: CheckStore,
  cell: CollectedCell,
  order: readonly string[],
  make: (previous: CheckRecord | undefined) => CheckRecord,
): { ok: true; record: CheckRecord } | { ok: false; reason: string } {
  const path = checksFilePath(cell.file);
  const read = readCheckFile(store, path);
  if (!read.ok) return read;
  const existing = read.file;
  const record = make(existing?.records.find((r) => r.cell === cell.key));
  const merged = CheckFileSchema.safeParse(
    mergeCheckFile(existing, [record], order),
  );
  if (!merged.success)
    return { ok: false, reason: `기록이 규격에 맞지 않는다: ${cell.key}` };
  store.write(path, `${JSON.stringify(merged.data, null, 2)}\n`);
  return { ok: true, record };
}

async function solveCell(
  cell: CollectedCell,
  context: {
    index: SolveIndex;
    solver: Solver;
    price: ModelPrice;
    now: () => Date;
    store: CheckStore;
    order: readonly string[];
    secrets: readonly string[];
  },
): Promise<CellResult> {
  const base = { cell, refused: false, called: false, costUsd: 0 };
  const request = buildSolveRequest(cell, context.index);
  if (!request)
    return { ...base, status: "failed", reason: "풀이 요청을 만들지 못했다" };
  let message: SolveMessage;
  try {
    message = await context.solver(request);
  } catch (error) {
    return {
      ...base,
      called: true,
      status: "failed",
      reason: errorReason(error, context.secrets),
    };
  }
  const answer = interpretSolveMessage(message);
  const usage = answer.usage;
  const spent = {
    ...base,
    called: true,
    ...(usage ? { usage, costUsd: costOf(usage, context.price) } : {}),
  };
  if (answer.kind === "failed")
    return {
      ...spent,
      status: "failed",
      reason: redact(answer.reason, context.secrets),
    };
  const judged = judgeSolve(cell, request, answer);
  if (!judged.ok) return { ...spent, status: "failed", reason: judged.reason };
  let written: ReturnType<typeof writeRecord>;
  try {
    written = writeRecord(context.store, cell, context.order, (previous) =>
      buildCheckRecord({
        request,
        items: judged.items,
        model: answer.model,
        usage: answer.usage,
        costUsd: spent.costUsd,
        at: context.now().toISOString(),
        ...(previous ? { previous } : {}),
      }),
    );
  } catch (error) {
    written = {
      ok: false,
      reason: `기록을 쓰지 못했다: ${redact(oneLine(String(error)), context.secrets)}`,
    };
  }
  if (!written.ok)
    return { ...spent, status: "failed", reason: written.reason };
  return {
    ...spent,
    refused: answer.kind === "refusal",
    status:
      solveStatus(cell, written.record) === "passed"
        ? "passed"
        : "pending-human",
    verdicts: written.record.solve.items.map((i) => ({
      no: i.no,
      verdict: i.verdict,
    })),
  };
}

/** 동시 호출 수만큼 차례대로 꺼내 푼다(결과는 대상 차례). */
async function pool<T, R>(
  list: readonly T[],
  concurrency: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(list.length);
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const i = next++;
      out[i] = await run(list[i] as T);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, list.length) }, worker),
  );
  return out;
}

function summaryLine(s: CheckReport["summary"]): string {
  return `seed-check: 대상 ${s.targets} · 푼 칸 ${s.solved} · 통과 ${s.passed} · 사람 확인 ${s.pendingHuman} · 실패 ${s.failed} · 건너뜀 ${s.skipped} · 남음 ${s.remaining} · 거절 ${s.refused} · 호출 ${s.calls} · 입력 ${s.inputTokens} · 출력 ${s.outputTokens} 토큰 · 비용 ${formatCost(s.costUsd)}달러`;
}

/**
 * 인자 · 읽은 시드 · 풀이 함수로 풀이 검사를 하고 종료 코드와 출력 줄을 돌려준다(기록은 store 에 칸마다 바로 쓴다).
 * 종료 2 의 출력은 표준 오류로 낸다(직접 실행 때).
 */
export async function runCheck(
  args: CheckArgs,
  deps: CheckDeps,
): Promise<RunResult & { report: CheckReport | null }> {
  const secrets = deps.secrets ?? [];
  const today = deps.now().toISOString().slice(0, 10);
  const ready = prepare(args, deps.files, today);
  if (!ready.ok || deps.files === null)
    return {
      ...(ready.ok ? inputError("시드가 없다") : ready.result),
      report: null,
    };
  const mode = args.dryRun ? "dry-run" : "solve";
  if (mode === "solve" && !deps.solver)
    return { ...inputError("풀이 함수가 없다"), report: null };
  // --file 이 시드에 없거나 --areas 밖이면 대상 0 성공으로 끝나지 않게 입력 오류로 끝낸다(검토 M-2).
  if (args.file !== null) {
    if (!deps.files.has(args.file))
      return {
        ...inputError(`--file 이 시드에 없다: ${args.file}`),
        report: null,
      };
    const area = fileArea(args.file);
    if (area && !args.areas.includes(area))
      return {
        ...inputError(`--file 의 영역(${area})이 --areas 밖이다: ${args.file}`),
        report: null,
      };
  }
  const picked = selectSolveTargets(deps.files, {
    areas: args.areas,
    levels: args.levels,
    file: args.file,
    force: args.force,
  });
  // 규격 파일이 깨지면 평가 · 배치 · 이야기 칸이 칸 검사 없이 대상이 되고 그림 보기가 낱말로 나간다(검토 I-1).
  if (picked.seed.referenceErrors > 0)
    return {
      ...inputError(
        `규격 파일 오류 ${picked.seed.referenceErrors}건 — pnpm seed:validate 로 먼저 고친다`,
      ),
      report: null,
    };
  const report: CheckReport = {
    version: 1,
    mode,
    model: SOLVE_MODEL,
    effort: SOLVE_EFFORT,
    thinking: SOLVE_THINKING.type,
    filter: { areas: args.areas, levels: args.levels, file: args.file },
    summary: {
      targets: picked.targets.length,
      solved: 0,
      passed: 0,
      pendingHuman: 0,
      failed: 0,
      skipped: picked.skipped.length,
      remaining: 0,
      refused: 0,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
    },
    cells: [],
  };
  const skippedCells = picked.skipped.map((cell) => ({
    cell: cell.key,
    file: cell.file,
    status: "skipped" as const,
    reason: "검증 실패",
  }));
  const skippedLines = picked.skipped.map((c) => `건너뜀 ${c.key} 검증 실패`);

  if (mode === "dry-run") {
    const records = [...picked.seed.records.values()];
    const average =
      records.length === 0
        ? null
        : records.reduce((sum, r) => sum + r.solve.costUsd, 0) / records.length;
    report.summary.costUsd =
      average === null ? null : roundCost(average * picked.targets.length);
    report.cells = [
      ...picked.targets.map((cell) => ({
        cell: cell.key,
        file: cell.file,
        status: "planned" as const,
      })),
      ...skippedCells,
    ];
    const items = picked.targets.reduce(
      (sum, cell) => sum + solveTargets(cell).length,
      0,
    );
    const lines = args.json
      ? [JSON.stringify(report, null, 2)]
      : [
          summaryLine(report.summary),
          `미리 보기: 대상 칸 ${picked.targets.length} · 문항 ${items} · 어림 비용 ${formatCost(report.summary.costUsd)}달러(기록 ${records.length}칸 평균)`,
          ...skippedLines,
        ];
    return { code: 0, lines, report };
  }

  const solver = deps.solver as Solver;
  const limit = args.maxCalls ?? picked.targets.length;
  const toSolve = picked.targets.slice(0, limit);
  const remaining = picked.targets.slice(limit);
  const orders = new Map<string, string[]>();
  for (const cell of picked.seed.cells) {
    orders.set(cell.file, [...(orders.get(cell.file) ?? []), cell.key]);
  }
  // 부르기 전에 대상 칸의 기록 파일을 본다. 깨졌으면 그 칸은 부르지 않고 실패로 둔다(검토 M-1).
  const brokenFiles = new Map<string, string>();
  for (const path of new Set(toSolve.map((c) => checksFilePath(c.file)))) {
    let read: ReturnType<typeof readCheckFile>;
    try {
      read = readCheckFile(deps.store, path);
    } catch (error) {
      read = {
        ok: false,
        reason: `기록 파일을 읽지 못했다: ${redact(oneLine(String(error)), secrets)}`,
      };
    }
    if (!read.ok) brokenFiles.set(path, read.reason);
  }
  const results = await pool(toSolve, args.concurrency, (cell) => {
    const broken = brokenFiles.get(checksFilePath(cell.file));
    if (broken !== undefined)
      return Promise.resolve<CellResult>({
        cell,
        status: "failed",
        reason: broken,
        refused: false,
        called: false,
        costUsd: 0,
      });
    return solveCell(cell, {
      index: picked.seed.index,
      solver,
      price: ready.price,
      now: deps.now,
      store: deps.store,
      order: orders.get(cell.file) ?? [],
      secrets,
    });
  });
  const s = report.summary;
  let cost = 0;
  for (const r of results) {
    if (r.called) s.calls++;
    if (r.usage) {
      const tokens = tokensOf(r.usage);
      s.inputTokens += tokens.inputTokens;
      s.outputTokens += tokens.outputTokens;
    }
    cost += r.costUsd;
    if (r.refused) s.refused++;
    if (r.status === "failed") s.failed++;
    else {
      s.solved++;
      if (r.status === "passed") s.passed++;
      else s.pendingHuman++;
    }
  }
  s.costUsd = roundCost(cost);
  s.remaining = remaining.length;
  report.cells = [
    ...results.map((r) => ({
      cell: r.cell.key,
      file: r.cell.file,
      status: r.status,
      ...(r.verdicts ? { verdicts: r.verdicts } : {}),
      ...(r.reason === undefined ? {} : { reason: r.reason }),
    })),
    ...remaining.map((cell) => ({
      cell: cell.key,
      file: cell.file,
      status: "remaining" as const,
    })),
    ...skippedCells,
  ];
  const code: 0 | 1 = s.failed > 0 || s.skipped > 0 || s.remaining > 0 ? 1 : 0;
  const lines = args.json
    ? [JSON.stringify(report, null, 2)]
    : [
        summaryLine(s),
        ...results
          .filter((r) => r.status === "pending-human")
          .map((r) => `사람 확인 ${r.cell.key} ${viewerUrl(r.cell)}`),
        ...results
          .filter((r) => r.status === "failed")
          .map((r) => `실패 ${r.cell.key} ${r.reason ?? ""}`),
        ...skippedLines,
      ];
  return {
    code,
    lines: lines.map((l) => redact(l, secrets)),
    report,
  };
}

/**
 * --probe: 시드 대신 고정 문항 하나를 실제로 불러 모델 · stop_reason · 토큰 · 판단을 낸다. 파일을 쓰지 않는다.
 * 시드 뿌리에 model-prices 가 있으면 비용도 낸다. API 오류 · 응답 실패면 1.
 */
export async function runProbe(
  _args: CheckArgs,
  deps: {
    files: ReadonlyMap<string, string> | null;
    solver: Solver;
    now: () => Date;
    secrets?: readonly string[];
  },
): Promise<RunResult> {
  const secrets = deps.secrets ?? [];
  const request = buildSolveRequest(PROBE_CELL, { vocab: new Map() });
  if (!request) return inputError("--probe 문항을 만들지 못했다");
  let message: SolveMessage;
  try {
    message = await deps.solver(request);
  } catch (error) {
    return {
      code: 1,
      lines: [`seed-check probe: 실패 ${errorReason(error, secrets)}`],
    };
  }
  const answer = interpretSolveMessage(message);
  const tokens = tokensOf(message.usage);
  const price = probePrice(deps.files, deps.now().toISOString().slice(0, 10));
  let verdict: string;
  let code: 0 | 1 = 0;
  if (answer.kind === "failed") {
    verdict = `실패 ${answer.reason}`;
    code = 1;
  } else {
    const judged = judgeSolve(PROBE_CELL, request, answer);
    if (judged.ok) {
      verdict = judged.items.map((i) => i.verdict).join(",");
      if (answer.kind === "refusal") verdict = `거절(${verdict})`;
    } else {
      verdict = `실패 ${judged.reason}`;
      code = 1;
    }
  }
  const cost = price
    ? ` · 비용 ${formatCost(costOf(message.usage, price))}달러`
    : "";
  return {
    code,
    lines: [
      redact(
        `seed-check probe: 모델 ${message.model} · stop_reason ${message.stop_reason ?? "null"} · 입력 ${tokens.inputTokens} · 출력 ${tokens.outputTokens} 토큰 · 판단 ${verdict}${cost}`,
        secrets,
      ),
    ],
  };
}

function probePrice(
  files: ReadonlyMap<string, string> | null,
  today: string,
): ModelPrice | undefined {
  const text = files?.get(SEED_FILES.modelPrices);
  if (text === undefined) return undefined;
  try {
    const parsed = ModelPricesFileSchema.safeParse(JSON.parse(text));
    return parsed.success
      ? priceOf(parsed.data.models, SOLVE_MODEL, today)
      : undefined;
  } catch {
    return undefined;
  }
}

// ── SDK 를 부르는 얇은 함수 ──────────────────────────────────────

/**
 * 개발용 키로 풀이 함수를 만든다. 키를 직접 넘기고 authToken 을 null 로 두어 ANTHROPIC_AUTH_TOKEN · 프로필 같은 다른 자격 증명이
 * 끼어들지 않게 한다(10절 개발용 워크스페이스, 위험 5). temperature · top_p · top_k · fallbacks · 베타 헤더 · cache_control · metadata 는
 * 보내지 않는다(C62 (2)). messages.parse() 는 거절 · 잘림에서 예외를 던져 stop_reason 을 잃으므로 create 를 쓰고 응답은 직접 읽는다.
 */
export function createAnthropicSolver(apiKey: string): Solver {
  const client = new Anthropic({
    apiKey,
    authToken: null,
    maxRetries: SOLVE_MAX_RETRIES,
    timeout: SOLVE_TIMEOUT_MS,
  });
  const format = zodOutputFormat(SolveOutputSchema);
  return async (request: SolveRequest): Promise<SolveMessage> =>
    client.messages.create({
      model: SOLVE_MODEL,
      max_tokens: SOLVE_MAX_TOKENS,
      thinking: SOLVE_THINKING,
      output_config: { effort: SOLVE_EFFORT, format },
      system: SOLVE_INSTRUCTIONS,
      messages: [{ role: "user", content: solveUserMessage(request) }],
    });
}

// ── 직접 실행 ────────────────────────────────────────────────────

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`seed-check: ${parsed.error}`);
    return 2;
  }
  const { args } = parsed;
  const mode = modeOf(args);
  const env = checkEnvironment(process.env, mode);
  if (!env.ok) {
    console.error(`seed-check: ${env.error}`);
    return 2;
  }
  const secrets = env.apiKey ? [env.apiKey] : [];
  const notice = baseUrlNotice(process.env, mode);
  // 늘 표준 오류로 낸다 — 표준 출력 첫 줄(요약 · JSON)을 차지하지 않는다(재검토 N-1).
  if (notice) console.error(notice);
  try {
    const root = resolve(process.cwd(), args.root);
    const files = readSeedTree(root);
    const now = () => new Date();
    const solver = env.apiKey ? createAnthropicSolver(env.apiKey) : undefined;
    const result =
      mode === "probe" && solver
        ? await runProbe(args, { files, solver, now, secrets })
        : await runCheck(args, {
            files,
            ...(solver ? { solver } : {}),
            now,
            store: fileStore(root),
            secrets,
          });
    const write = result.code === 2 ? console.error : console.log;
    for (const line of result.lines) write(redact(line, secrets));
    return result.code;
  } catch (error) {
    console.error(
      `seed-check: 뜻밖의 오류 ${redact(oneLine(String(error)), secrets)}`,
    );
    return 1;
  }
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

if (isDirectRun()) {
  main().then((code) => {
    process.exitCode = code;
  });
}

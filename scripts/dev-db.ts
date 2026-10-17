// 개발용 로컬 DB(plan-p10a 파일별 값 1, C70). 요청자 컴퓨터의 내장 Postgres 와 e2e 임시 DB 를 같은 길로 띄운다.
// 사용: pnpm db:dev [--reset] [--port <n>] — 개발용(지속, 자료 .dev/db/data · 포트 DEV_DB_PORT)
//       node --conditions=react-server --import tsx scripts/dev-db.ts --ephemeral --port <n> — e2e(임시, 끄면 지움)
// 처음 만들 때 Supabase 역할 흉내(anon · authenticated · service_role) · DB · 기본 권한, 그 뒤 늘 마이그레이션,
// 시드 테이블(content 스키마)이 모두 비었으면 시험용 시드 나무 devSeedTree 를 loadSeed 로 넣는다(영역 셋 · 완전성 1단계).
// 개발용은 .env.local 의 DATABASE_URL · MIGRATION_DATABASE_URL 이 없거나 로컬 개발용 주소일 때만 고친다(위험 15).
// 준비되면 `DEV_DB_READY …` 줄을 표준 출력에 내고(Playwright webServer 가 기다린다) SIGINT · SIGTERM · SIGHUP 까지 켜 둔다.
// 접속 문자열 · 비밀번호는 어디에도 출력하지 않는다.
// 종료 코드: 0 정상 끔 · 1 시드 적재 거부 · 2 인자 · 환경 · 포트 사용 중 · 시작 실패(로그 끝 줄을 붙임).
// 띄우기: node --conditions=react-server — server-only 를 빈 모듈로 풀어 src/server/{db,clock,seed} 를 가져온다(P7a seed:load 와 같음).
// 이 파일 맨 위는 Node 기본 모듈만 가져온다 — playwright.config · tests/e2e/db.ts 가 순수 꼴(databaseUrl · DB_NAMES)을 가져가도
// server-only 모듈을 읽지 않게, DB · 시드 모듈은 실행 때 동적으로 가져온다.
import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type EmbeddedPostgres from "embedded-postgres";
import {
  createLogTail,
  importEmbeddedPostgres,
  PG_ADMIN_DB,
  PG_ADMIN_USER,
  pgUrl,
  SUPABASE_ROLES,
  supabaseDefaultPrivilegeSql,
} from "./pg-local";

/** 개발용 DB 포트(기술 값). 다른 Postgres(5432) · e2e(54339)와 겹치지 않게. */
export const DEV_DB_PORT = 54329;
/** 준비 줄의 표지(Playwright webServer wait.stdout 이 기다린다). */
export const READY_MARK = "DEV_DB_READY";
/** DB 이름(개발용 · e2e). */
export const DB_NAMES = { dev: "momo_dev", e2e: "momo_e2e" } as const;
/** e2e 임시 DB 비밀번호 환경 변수(playwright.config 가 실행 때 만든다). */
export const E2E_PASSWORD_ENV = "E2E_DB_PASSWORD";
/** dev-db 가 고치는 .env.local 키. */
export const ENV_LOCAL_KEYS = [
  "DATABASE_URL",
  "MIGRATION_DATABASE_URL",
] as const;
export type EnvLocalKey = (typeof ENV_LOCAL_KEYS)[number];

const MIGRATIONS_FOLDER = "drizzle";
/** 비밀번호 바이트 수(처음 한 번 만든다, 저장소에 적지 않는다). */
const PASSWORD_BYTES = 24;
/** 사람이 고를 수 있는 포트 범위(기술 값, 1024 아래는 특권 포트). */
const PORT_MIN = 1024;
const PORT_MAX = 65535;
/** 시드 적재 거부 때 내는 위반 줄 수(기술 값). */
const VIOLATION_LINES = 20;
/** 파일 권한(주인만 읽고 씀). */
const OWNER_ONLY_FILE = 0o600;
const OWNER_ONLY_DIR = 0o700;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const ACCESS_CODE_HASH_KEY = "ACCESS_CODE_HASH";
/** 받으면 DB 를 끄고 0 으로 끝내는 신호(Ctrl+C · Playwright gracefulShutdown · 터미널 닫기). */
const STOP_SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const;
/** 끌 때 pg.stop() 을 기다리는 상한(ms, 기술 값 — playwright.config 의 SIGKILL 대기 10초보다 짧게, 검토 M-2). */
const STOP_WAIT_MS = 5_000;
/** Postgres 가 켜져 있는 동안 자료 폴더에 두는 파일(첫 줄이 pid). */
const POSTMASTER_PID_FILE = "postmaster.pid";

// ── 인자 ─────────────────────────────────────────────────────────

export type DevDbArgs =
  | { mode: "dev"; reset: boolean; port: number }
  | { mode: "e2e"; port: number };
export type ParsedDevDbArgs =
  | { ok: true; args: DevDbArgs }
  | { ok: false; error: string };

export function parseArgs(argv: readonly string[]): ParsedDevDbArgs {
  let reset = false;
  let ephemeral = false;
  let port: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--reset":
        reset = true;
        break;
      case "--ephemeral":
        ephemeral = true;
        break;
      case "--port": {
        const v = argv[++i];
        const n = Number(v);
        if (!v || !Number.isInteger(n) || n < PORT_MIN || n > PORT_MAX) {
          return {
            ok: false,
            error: `--port 는 ${PORT_MIN}~${PORT_MAX} 정수예요: ${v ?? ""}`,
          };
        }
        port = n;
        break;
      }
      default:
        return { ok: false, error: `모르는 인자예요: ${arg}` };
    }
  }
  if (ephemeral) {
    if (reset)
      return { ok: false, error: "--reset 은 --ephemeral 과 함께 못 써요" };
    if (port === undefined)
      return { ok: false, error: "--ephemeral 은 --port 와 함께 써요" };
    return { ok: true, args: { mode: "e2e", port } };
  }
  return { ok: true, args: { mode: "dev", reset, port: port ?? DEV_DB_PORT } };
}

// ── 접속 문자열 ───────────────────────────────────────────────────

/** 접속 문자열(scripts/pg-local.ts pgUrl — URL 속성으로 조립). playwright.config · tests/e2e 가 이 이름으로 쓴다. */
export const databaseUrl = pgUrl;

/**
 * 자료 폴더를 켜 둔 Postgres 가 쓰고 있는가(검토 M-1). postmaster.pid 첫 줄의 pid 가 살아 있으면 참.
 * isAlive 는 부르는 쪽이 넘긴다(실행은 process.kill(pid, 0)).
 */
export function postmasterAlive(
  pidFileText: string | null,
  isAlive: (pid: number) => boolean,
): boolean {
  if (pidFileText === null) return false;
  const pid = Number(pidFileText.split("\n")[0]?.trim());
  return Number.isInteger(pid) && pid > 0 && isAlive(pid);
}

// ── .env.local ───────────────────────────────────────────────────

const ENV_LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/;

/** dotenv 꼴 값 한 칸(따옴표를 벗기고, 따옴표 없는 값의 ' #' 뒤 주석을 뺀다). */
function envValue(raw: string): string {
  const quoted = /^(["'])(.*)\1$/.exec(raw);
  if (quoted) return quoted[2] ?? "";
  const comment = raw.search(/\s#/);
  return (comment >= 0 ? raw.slice(0, comment) : raw).trim();
}

/** 글 안에서 키의 값들(줄 차례대로, 주석 줄 밖). */
function envValuesOf(
  lines: readonly string[],
  key: string,
): { index: number; value: string }[] {
  const out: { index: number; value: string }[] = [];
  lines.forEach((line, index) => {
    const m = ENV_LINE.exec(line);
    if (m && m[1] === key) out.push({ index, value: envValue(m[2] ?? "") });
  });
  return out;
}

/** 키가 비지 않은 값으로 있는지(값은 돌려주지 않는다). */
export function hasEnvValue(text: string | null, key: string): boolean {
  if (text === null) return false;
  return envValuesOf(text.split("\n"), key).some((v) => v.value !== "");
}

/**
 * 우리 개발용 DB 주소인가: 로컬(127.0.0.1 · localhost)이고 주어진 포트이거나, 경로가 개발용 DB 이름이면 포트가 달라도
 * (예전 --port 실행의 흔적, 검토 M-3). 다른 호스트 · 다른 DB 이름은 다른 주소다.
 */
function isLocalDbAddress(value: string, ports: readonly number[]): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:")
    return false;
  if (!LOCAL_HOSTS.has(url.hostname)) return false;
  return (
    ports.includes(Number(url.port)) || url.pathname === `/${DB_NAMES.dev}`
  );
}

export type EnvLocalPlan =
  | { kind: "write"; text: string }
  | { kind: "same" }
  | { kind: "other-address"; keys: EnvLocalKey[] };

/**
 * .env.local 고치기 계획(순수). 두 키가 없거나 빈 값이거나 로컬 개발용 주소(DEV_DB_PORT · 이번 포트 · 로컬의 momo_dev)면 새 주소로 쓰고,
 * 하나라도 다른 주소(Supabase 등)면 두 줄 모두 손대지 않는다(섞인 접속을 만들지 않게). 다른 줄 · 차례 · 끝 줄바꿈은 그대로 둔다.
 */
export function planEnvLocal(
  text: string | null,
  urls: Readonly<Record<EnvLocalKey, string>>,
): EnvLocalPlan {
  const ports = [DEV_DB_PORT, Number(new URL(urls.DATABASE_URL).port)];
  const lines = text === null ? [] : text.split("\n");
  const other = ENV_LOCAL_KEYS.filter((key) =>
    envValuesOf(lines, key).some(
      (v) => v.value !== "" && !isLocalDbAddress(v.value, ports),
    ),
  );
  if (other.length > 0) return { kind: "other-address", keys: other };
  const next = [...lines];
  for (const key of ENV_LOCAL_KEYS) {
    const line = `${key}=${urls[key]}`;
    const found = envValuesOf(next, key);
    if (found.length > 0) {
      for (const { index } of found) next[index] = line;
    } else if (next.length > 0 && next[next.length - 1] === "") {
      next.splice(next.length - 1, 0, line);
    } else {
      next.push(line);
    }
  }
  // 새 파일은 줄바꿈으로 끝낸다(있던 파일의 끝 꼴은 그대로)
  if (text === null) next.push("");
  const out = next.join("\n");
  return out === text ? { kind: "same" } : { kind: "write", text: out };
}

// ── 준비 줄 ──────────────────────────────────────────────────────

export type SeedState = "loaded" | "kept";

/** 준비 줄과 다음 할 일(값 없음). e2e 는 표지 한 줄. */
export function readyLines(input: {
  mode: DevDbArgs["mode"];
  port: number;
  seed: SeedState;
  accessCodeHashSet: boolean;
  env: EnvLocalPlan["kind"];
}): string[] {
  if (input.mode === "e2e") return [`${READY_MARK} e2e`];
  const lines = [`${READY_MARK} dev port=${input.port} seed=${input.seed}`];
  if (input.seed === "kept") {
    lines.push(
      "시드가 이미 있어 그대로 두었어요. 시험용 시드 꼴이 바뀌었으면 pnpm db:dev --reset 으로 처음부터 만들어요",
    );
  }
  if (input.env === "write") {
    lines.push(
      ".env.local 의 DATABASE_URL · MIGRATION_DATABASE_URL 을 이 로컬 DB 로 맞췄어요",
    );
  } else if (input.env === "same") {
    lines.push(
      ".env.local 의 DATABASE_URL · MIGRATION_DATABASE_URL 이 이미 이 로컬 DB 를 가리켜요",
    );
  } else {
    lines.push(
      "다른 DB 주소가 있어 고치지 않았어요(.env.local 의 DATABASE_URL · MIGRATION_DATABASE_URL)",
    );
  }
  if (!input.accessCodeHashSet) {
    lines.push(
      `.env.local 에 ${ACCESS_CODE_HASH_KEY} 가 없어요. pnpm access:hash 로 만들어 넣어 주세요`,
    );
  }
  lines.push(
    "다음: 다른 터미널에서 pnpm dev 를 띄우고 http://localhost:3000 을 열어요. 끄려면 Ctrl+C",
  );
  return lines;
}

// ── 실행 ─────────────────────────────────────────────────────────

class ExitError extends Error {
  constructor(
    readonly code: 1 | 2,
    readonly lines: string[],
  ) {
    super(lines[0] ?? "dev-db");
    this.name = "ExitError";
  }
}

/**
 * 저장소 뿌리. pnpm 스크립트와 Playwright webServer(설정 파일 폴더)가 모두 뿌리에서 띄운다.
 * import.meta 를 쓰지 않는다 — Playwright 가 설정(이 파일의 순수 꼴을 가져감)을 CommonJS 로 읽어 import.meta 가 구문 오류다.
 */
const repoRoot = process.cwd();
/** 이 명령의 파일(뿌리 기준, 직접 실행 판정). */
const SCRIPT_PATH = join("scripts", "dev-db.ts");

/** 운영 체제가 그 포트를 줄 수 있는지(127.0.0.1 에서 잠깐 열어 본다). */
function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}

/** 오류의 이름 · 코드 · 메시지(비밀번호는 가린다). */
export function describeError(error: unknown, password: string): string {
  const name = error instanceof Error ? error.name : "Error";
  const code = (error as { code?: unknown })?.code;
  const message = error instanceof Error ? error.message : String(error);
  const text = `${name}${typeof code === "string" ? ` ${code}` : ""}: ${message}`;
  return password ? text.split(password).join("***") : text;
}

/** 개발용 비밀번호(.dev/db/password, 처음 한 번 만들고 0600). */
function devPassword(dir: string): string {
  const file = join(dir, "password");
  if (existsSync(file)) {
    const saved = readFileSync(file, "utf8").trim();
    if (saved) return saved;
  }
  const password = randomBytes(PASSWORD_BYTES).toString("hex");
  writeFileSync(file, password, { mode: OWNER_ONLY_FILE });
  chmodSync(file, OWNER_ONLY_FILE);
  return password;
}

type Cluster = {
  pg: EmbeddedPostgres;
  password: string;
  port: number;
  database: string;
};

/** 끌 때 정리할 것(시작 중에도 신호가 오면 쓴다, 검토 M-2). */
type Running = {
  pg?: EmbeddedPostgres;
  /** 끈 뒤 지울 임시 폴더(e2e). */
  tempDir?: string;
};

/** pid 가 살아 있는가(다른 사용자 프로세스면 EPERM 이라도 살아 있음). */
function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as { code?: unknown }).code === "EPERM";
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms).unref();
  });
}

/** 클러스터를 끄고(기다림은 STOP_WAIT_MS 까지) 임시 폴더를 지운다. 시작 중이어도 된다. */
async function shutdown(running: Running): Promise<void> {
  try {
    if (running.pg) {
      // 이미 끝난 자식에도 'exit' 를 기다리는 일이 있어(embedded-postgres stop) 상한을 둔다
      await Promise.race([
        running.pg.stop().catch(() => {}),
        delay(STOP_WAIT_MS),
      ]);
    }
  } finally {
    if (running.tempDir)
      rmSync(running.tempDir, { recursive: true, force: true });
  }
}

async function startCluster(
  args: DevDbArgs,
  running: Running,
): Promise<Cluster> {
  if (!(await portFree(args.port))) {
    throw new ExitError(2, [
      `dev-db: 포트 ${args.port} 이 이미 쓰이고 있어요. 켜 둔 db:dev 가 있는지 보거나 --port 로 다른 포트를 주세요`,
    ]);
  }
  let password: string;
  let databaseDir: string;
  if (args.mode === "e2e") {
    const fromEnv = process.env[E2E_PASSWORD_ENV];
    if (!fromEnv)
      throw new ExitError(2, [`dev-db: ${E2E_PASSWORD_ENV} 이 없어요`]);
    password = fromEnv;
    running.tempDir = mkdtempSync(join(tmpdir(), "momo-e2e-pg-"));
    databaseDir = running.tempDir;
  } else {
    const dir = join(repoRoot, ".dev", "db");
    databaseDir = join(dir, "data");
    // 다른 포트로 켜 둔 db:dev 가 이 자료 폴더를 쓰고 있으면 지우거나 덧붙지 않는다(검토 M-1)
    const pidFile = join(databaseDir, POSTMASTER_PID_FILE);
    const pidText = existsSync(pidFile) ? readFileSync(pidFile, "utf8") : null;
    if (postmasterAlive(pidText, pidAlive)) {
      throw new ExitError(2, [
        "dev-db: 다른 db:dev 가 이 자료 폴더를 쓰고 있어요. 그것을 끈 뒤 다시 해 주세요",
      ]);
    }
    if (args.reset) rmSync(databaseDir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true, mode: OWNER_ONLY_DIR });
    password = devPassword(dir);
  }
  const fresh = !existsSync(join(databaseDir, "PG_VERSION"));
  const log = createLogTail();
  // embedded-postgres 는 읽힐 때 async-exit-hook 로 신호 · beforeExit 처리기를 걸어 끈 뒤 종료 코드를 바꾼다.
  // 이 명령은 자기 처리기(main 이 먼저 건다)로 끄고 0 으로 끝내므로, 읽은 뒤 새로 걸린 것을 떼는 공용 도우미로 읽는다('exit' 쪽은 그대로)
  const Postgres = await importEmbeddedPostgres();
  const pg = new Postgres({
    databaseDir,
    port: args.port,
    user: PG_ADMIN_USER,
    password,
    persistent: args.mode === "dev",
    onLog: log.push,
    onError: log.push,
  });
  running.pg = pg;
  try {
    if (fresh) await pg.initialise();
    await pg.start();
  } catch (error) {
    if (running.tempDir)
      rmSync(running.tempDir, { recursive: true, force: true });
    throw new ExitError(2, [
      `dev-db: Postgres 를 띄우지 못했어요(${describeError(error, password)}). 로그 끝 ${log.lines.length}줄:`,
      ...log.lines.map((l) => l.split(password).join("***")),
      ...(args.mode === "dev"
        ? [
            "dev-db: 자료 폴더가 반쯤 만들어졌을 수 있어요. pnpm db:dev --reset 으로 처음부터 만들 수 있어요",
          ]
        : []),
    ]);
  }
  return {
    pg,
    password,
    port: args.port,
    database: args.mode === "e2e" ? DB_NAMES.e2e : DB_NAMES.dev,
  };
}

/** 역할 · DB(없을 때만) · 기본 권한(DB 를 만들 때) · 마이그레이션(늘). */
async function prepareDatabase(cluster: Cluster): Promise<void> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const url = (database: string) =>
    databaseUrl({ password: cluster.password, port: cluster.port, database });
  const admin = postgres(url(PG_ADMIN_DB), { max: 1, onnotice: () => {} });
  let created = false;
  try {
    for (const role of SUPABASE_ROLES) {
      const rows =
        await admin`select 1 from pg_roles where rolname = ${role.name}`;
      if (rows.length === 0) await admin.unsafe(role.sql);
    }
    const rows =
      await admin`select 1 from pg_database where datname = ${cluster.database}`;
    if (rows.length === 0) {
      await admin.unsafe(`CREATE DATABASE "${cluster.database}"`);
      created = true;
    }
  } finally {
    await admin.end();
  }
  const client = postgres(url(cluster.database), {
    max: 1,
    onnotice: () => {},
  });
  try {
    if (created) {
      // 본 DB 안에서 Supabase 기본 권한을 흉내 낸 뒤 마이그레이션한다(plan-p03a 위험 6, 통합 시험과 같은 SQL — pg-local)
      for (const statement of supabaseDefaultPrivilegeSql()) {
        await client.unsafe(statement);
      }
    }
    await migrate(drizzle({ client }), {
      migrationsFolder: join(repoRoot, MIGRATIONS_FOLDER),
    });
  } finally {
    await client.end();
  }
}

/** 시드 테이블이 모두 비었으면 devSeedTree 를 넣는다. 거부면 ExitError(1). */
async function seedIfEmpty(cluster: Cluster): Promise<SeedState> {
  const { createDb } = await import("../src/server/db");
  const content = await import("../src/db/schema/content");
  const { loadSeed } = await import("../src/server/seed/load");
  const { now } = await import("../src/server/clock");
  const { DEV_SEED_AREAS, DEV_SEED_THROUGH, devSeedTree } = await import(
    "../tests/fixtures/seed/dev-tree"
  );
  const { filesOf } = await import("../tests/fixtures/seed/loadable");
  const { summaryLine } = await import("./seed-load");
  const db = createDb(
    databaseUrl({
      password: cluster.password,
      port: cluster.port,
      database: cluster.database,
    }),
    { max: 1 },
  );
  try {
    const tables = [
      content.levelSpecs,
      content.unitSpecs,
      content.images,
      content.vocab,
      content.placementItems,
      content.lessons,
      content.levelTestItems,
      content.modelPrices,
    ];
    const counts = await Promise.all(tables.map((t) => db.$count(t)));
    if (counts.some((n) => n > 0)) return "kept";
    const report = await loadSeed(db, {
      files: filesOf(devSeedTree()),
      completeThrough: DEV_SEED_THROUGH,
      areas: [...DEV_SEED_AREAS],
      now: now(),
    });
    if (report.outcome === "refused") {
      throw new ExitError(1, [
        summaryLine(report),
        ...report.violations
          .slice(0, VIOLATION_LINES)
          .map((v) => `${v.rule} ${v.table ?? "-"} ${v.cell ?? v.key ?? "-"}`),
        "dev-db: 시험용 시드 나무가 적재 검사를 넘지 못했어요",
      ]);
    }
    return "loaded";
  } finally {
    await db.$client.end();
  }
}

/** 개발용 .env.local 을 맞춘다(값은 내지 않는다). */
function syncEnvLocal(cluster: Cluster): {
  env: EnvLocalPlan["kind"];
  accessCodeHashSet: boolean;
} {
  const file = join(repoRoot, ".env.local");
  const text = existsSync(file) ? readFileSync(file, "utf8") : null;
  const url = databaseUrl({
    password: cluster.password,
    port: cluster.port,
    database: cluster.database,
  });
  const plan = planEnvLocal(text, {
    DATABASE_URL: url,
    MIGRATION_DATABASE_URL: url,
  });
  if (plan.kind === "write") {
    writeFileSync(file, plan.text, { mode: OWNER_ONLY_FILE });
  }
  const final = plan.kind === "write" ? plan.text : text;
  return {
    env: plan.kind,
    accessCodeHashSet: hasEnvValue(final, ACCESS_CODE_HASH_KEY),
  };
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) throw new ExitError(2, [`dev-db: ${parsed.error}`]);
  if (!existsSync(join(repoRoot, MIGRATIONS_FOLDER))) {
    throw new ExitError(2, [
      `dev-db: 저장소 뿌리에서 돌려 주세요(${MIGRATIONS_FOLDER}/ 폴더가 없어요)`,
    ]);
  }
  const { args } = parsed;
  // 신호 처리기를 시작보다 먼저 건다 — 시작 중(준비 줄 전)의 신호에도 DB 를 끄고 임시 폴더를 지운다(검토 M-2)
  const running: Running = {};
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    shutdown(running).then(
      () => process.exit(0),
      () => process.exit(2),
    );
  };
  for (const signal of STOP_SIGNALS) process.on(signal, stop);
  let cluster: Cluster;
  try {
    cluster = await startCluster(args, running);
  } catch (error) {
    if (stopping) return;
    throw error;
  }
  if (stopping) return;
  let seed: SeedState;
  let env: EnvLocalPlan["kind"] = "same";
  let accessCodeHashSet = false;
  try {
    await prepareDatabase(cluster);
    seed = await seedIfEmpty(cluster);
    if (args.mode === "dev")
      ({ env, accessCodeHashSet } = syncEnvLocal(cluster));
  } catch (error) {
    if (stopping) return;
    stopping = true;
    await shutdown(running).catch(() => {});
    if (error instanceof ExitError) throw error;
    throw new ExitError(2, [
      `dev-db: DB 를 준비하지 못했어요(${describeError(error, cluster.password)})`,
    ]);
  }
  if (stopping) return;
  for (const line of readyLines({
    mode: args.mode,
    port: cluster.port,
    seed,
    accessCodeHashSet,
    env,
  })) {
    console.log(line);
  }
  // 신호가 올 때까지 켜 둔다
  setInterval(() => {}, 1 << 30);
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(resolve(repoRoot, SCRIPT_PATH));
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main().catch((error: unknown) => {
    if (error instanceof ExitError) {
      for (const line of error.lines) console.error(line);
      process.exit(error.code);
    }
    // 예상 밖 오류도 스택을 내지 않는다(접속 문자열이 들 수 있다)
    console.error(
      `dev-db: 예상 밖 오류(${error instanceof Error ? error.name : "Error"})`,
    );
    process.exit(2);
  });
}

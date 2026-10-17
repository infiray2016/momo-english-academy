// 시드 적재 명령(plan-p07a 파일별 값 5, 5절 적재 · 11절 (4-1) · 13절 C68 (1) · (5)).
// 사용: pnpm seed:load [--root <폴더>] [--complete-through <n>] [--areas <영역,…>] [--reference-only] [--dry-run] [--json]
// 띄우기: node --conditions=react-server --import tsx — server-only 를 빈 모듈로 풀어 src/server/{db,clock,seed} 를 가져온다.
// 접속 문자열은 MIGRATION_DATABASE_URL(세션 풀러 — 마이그레이션과 같은 배치 작업 접속, 긴 트랜잭션 하나).
// 종료 코드: 0 넣음(바뀐 것이 없어도) · 미리 돌림, 1 거부(검증 · 판 규칙 · 설정 · 조합 · 관계 · 단가),
// 2 입력 · 환경 오류(모르는 인자 · 잘못된 값 · 뿌리 없음 · 꼭 있어야 하는 규격 파일 없음이나 JSON 아님 · 접속 문자열 없음 · 접속 실패 ·
// 적재 중 오류 — 트랜잭션은 되돌아가 있다. 불변식 오류(SeedLoadInvariantError, 칸 키 · 파일 이름만)는 메시지를 그대로,
// 나머지는 오류 이름 · 코드만 낸다. 질의 오류의 메시지 · SQL · params 에 칸 내용이 들어 내지 않는다).
// 접속 문자열 · 키 · 칸 내용을 내지 않는다. 순수 꼴(parseArgs · runSeedLoad)을 내보내고 파일 걷기 · 접속 · 출력은 직접 실행될 때만 한다.
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import {
  AREAS,
  type Area,
  LEVEL_MAX,
  LEVEL_MIN,
} from "../src/core/seed/structure";
import { now } from "../src/server/clock";
import { createDb, type Db } from "../src/server/db";
import {
  type LoadReport,
  loadSeedWithKeys,
  SeedLoadInvariantError,
  type SettingKeyNames,
} from "../src/server/seed/load";
import { DEFAULT_ROOT, REQUIRED_FILES, readSeedTree } from "./seed-validate";

/** 접속 문자열 환경 변수 이름(10절 · .env.example). */
export const DATABASE_URL_ENV = "MIGRATION_DATABASE_URL";
/** 적재는 연결 하나로 돈다(기술 값). */
const CONNECTIONS = 1;
/** 사람용 출력에 내는 지킨 키 · 시드에 없는 DB 키 줄 수(종류마다, 기술 값). 넘으면 '… 외 n' 한 줄. */
export const SETTING_KEY_LINES = 20;

export type LoadCliArgs = {
  root: string;
  completeThrough?: number;
  areas: Area[];
  /** --areas 를 적었는지(--reference-only 와 함께 못 쓴다). */
  areasGiven: boolean;
  referenceOnly: boolean;
  dryRun: boolean;
  json: boolean;
};
export type ParsedLoadArgs =
  | { ok: true; args: LoadCliArgs }
  | { ok: false; error: string };

export function parseArgs(argv: readonly string[]): ParsedLoadArgs {
  const args: LoadCliArgs = {
    root: DEFAULT_ROOT,
    areas: [...AREAS],
    areasGiven: false,
    referenceOnly: false,
    dryRun: false,
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
      case "--complete-through": {
        const v = value();
        const n = Number(v);
        if (!v || !Number.isInteger(n) || n < LEVEL_MIN || n > LEVEL_MAX) {
          return {
            ok: false,
            error: `--complete-through 는 ${LEVEL_MIN}~${LEVEL_MAX} 정수다: ${v ?? ""}`,
          };
        }
        args.completeThrough = n;
        break;
      }
      case "--areas": {
        const v = value();
        const list = (v ?? "")
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean);
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
        args.areasGiven = true;
        break;
      }
      case "--reference-only":
        args.referenceOnly = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--json":
        args.json = true;
        break;
      default:
        return { ok: false, error: `모르는 인자: ${arg}` };
    }
  }
  if (args.referenceOnly && args.completeThrough === undefined) {
    return {
      ok: false,
      error: "--reference-only 는 --complete-through 와 함께만 쓴다",
    };
  }
  if (args.referenceOnly && args.areasGiven) {
    return {
      ok: false,
      error: "--reference-only 는 --areas 와 함께 못 쓴다",
    };
  }
  return { ok: true, args };
}

const OUTCOME_WORDS: Record<LoadReport["outcome"], string> = {
  loaded: "넣음",
  "dry-run": "미리 돌림",
  refused: "거부",
};

function sum(record: Record<string, number>): number {
  return Object.values(record).reduce((a, b) => a + b, 0);
}

/** 출력 첫 줄(요약). */
export function summaryLine(report: LoadReport): string {
  const c = report.counts;
  const latest = report.latestRevision;
  return [
    `seed-load: ${OUTCOME_WORDS[report.outcome]}`,
    `칸 넣음 ${sum(c.cells.inserted)}`,
    `건너뜀 ${sum(c.cells.skipped)}`,
    `낱말 넣음 ${c.vocab.inserted} 고침 ${c.vocab.updated}`,
    `그림 넣음 ${c.images.inserted} 고침 ${c.images.updated}`,
    `단가 넣음 ${c.modelPrices.inserted}`,
    `설정 넣음 ${c.settings.inserted} 고침 ${c.settings.updated} 지킴 ${c.settings.kept}`,
    `이력 ${c.history}`,
    `최신 개정 ${latest ? latest.before : "-"}→${latest ? latest.after : "-"}`,
    `위반 ${report.violations.length}`,
  ].join(" · ");
}

/** 키 이름 줄(값 없이, 많으면 SETTING_KEY_LINES 줄 뒤 '… 외 n'). */
function keyLines(label: string, keys: readonly string[]): string[] {
  const lines = keys.slice(0, SETTING_KEY_LINES).map((k) => `${label} ${k}`);
  if (keys.length > SETTING_KEY_LINES) {
    lines.push(`${label} … 외 ${keys.length - SETTING_KEY_LINES}`);
  }
  return lines;
}

function humanLines(report: LoadReport, keys: SettingKeyNames): string[] {
  const lines = [summaryLine(report)];
  if (report.validation && report.validation.code !== 0) {
    const s = report.validation.summary;
    lines.push(
      `seed-validate: 칸 ${s.cells} · 통과 ${s.passed} · 실패 ${s.failed} · 빈 칸 ${s.empty} · 풀이 검사 안 됨 ${s.unchecked} · 사람 확인 ${s.pendingHuman} · 경고 ${s.warnings} · 규격 파일 오류 ${s.referenceErrors}`,
    );
  }
  for (const v of report.violations) {
    lines.push(
      `${v.rule} ${v.table ?? "-"} ${v.cell ?? v.key ?? "-"} ${v.message}`,
    );
  }
  // 지킨 '고급' · '기본' 키와 시드에 없는 DB 키(plan 위험 7 — 요청자가 어느 행을 지울지 본다)
  lines.push(
    ...keyLines("kept", keys.kept),
    ...keyLines("orphan", keys.orphans),
  );
  if (report.validation && report.validation.code !== 0) {
    const areas = report.referenceOnly ? [] : report.areas;
    lines.push(
      `다시 볼 명령: pnpm seed:validate --complete-through ${report.completeThrough ?? "settings"}${areas.length > 0 ? ` --areas ${areas.join(",")}` : ""}`,
    );
  }
  return lines;
}

export type DbHandle = { db: Db; close: () => Promise<void> };
export type LoadDeps = {
  /** seed/ 뿌리 기준 경로 → 글. 뿌리가 없으면 null. */
  files: ReadonlyMap<string, string> | null;
  /** MIGRATION_DATABASE_URL 값. */
  databaseUrl: string | undefined;
  /** 한 시계. */
  now: () => Date;
  /** 접속(기본은 createDb(url, { max: 1 })). */
  openDb?: (url: string) => DbHandle;
};
export type LoadRun = { code: 0 | 1 | 2; lines: string[] };

function defaultOpenDb(url: string): DbHandle {
  const db = createDb(url, { max: CONNECTIONS });
  return { db, close: () => db.$client.end() };
}

/** 접속 실패 오류의 갈래 이름만(메시지에 주소가 들 수 있어 내지 않는다). */
function errorTag(error: unknown): string {
  const code = (error as { code?: unknown })?.code;
  const name = error instanceof Error ? error.name : "Error";
  return typeof code === "string" ? `${name} ${code}` : name;
}

/**
 * 인자 · 파일 묶음 · 접속 문자열로 적재하고 종료 코드와 출력 줄을 돌려준다.
 * 종료 2 의 출력은 표준 오류로 낸다(직접 실행 때). 접속 문자열을 출력에 넣지 않는다.
 */
export async function runSeedLoad(
  args: LoadCliArgs,
  deps: LoadDeps,
): Promise<LoadRun> {
  const fail = (line: string): LoadRun => ({
    code: 2,
    lines: [`seed-load: ${line}`],
  });
  if (deps.files === null) return fail(`시드 뿌리 폴더가 없다: ${args.root}`);
  for (const path of REQUIRED_FILES) {
    const text = deps.files.get(path);
    if (text === undefined)
      return fail(`꼭 있어야 하는 규격 파일이 없다: ${path}`);
    try {
      JSON.parse(text);
    } catch {
      return fail(`규격 파일이 JSON 이 아니다: ${path}`);
    }
  }
  if (!deps.databaseUrl) return fail(`${DATABASE_URL_ENV} 이 없다`);
  let handle: DbHandle | undefined;
  try {
    handle = (deps.openDb ?? defaultOpenDb)(deps.databaseUrl);
    await handle.db.execute(sql`select 1`);
  } catch (error) {
    // 연 접속은 닫는다(닫기 실패는 접속 실패 보고를 덮지 않는다, 검토 M-1)
    await handle?.close().catch(() => {});
    return fail(`DB 에 접속하지 못했다(${errorTag(error)})`);
  }
  try {
    const { report, settingKeys } = await loadSeedWithKeys(handle.db, {
      files: deps.files,
      ...(args.completeThrough !== undefined
        ? { completeThrough: args.completeThrough }
        : {}),
      ...(args.referenceOnly ? {} : { areas: args.areas }),
      referenceOnly: args.referenceOnly,
      dryRun: args.dryRun,
      now: deps.now(),
    });
    return {
      code: report.outcome === "refused" ? 1 : 0,
      lines: args.json
        ? [JSON.stringify(report, null, 2)]
        : humanLines(report, settingKeys),
    };
  } catch (error) {
    // 불변식 오류는 칸 키 · 파일 이름만 담으므로 메시지를 그대로 낸다(검토 N-1)
    if (error instanceof SeedLoadInvariantError) return fail(error.message);
    // 적재 중 오류(연결 끊김 · 시간 상한 등, plan 위험 4). 트랜잭션은 되돌아가 있다.
    // drizzle 질의 오류는 메시지에 SQL · params(칸 내용)가 들어 원인(cause)의 이름 · 코드만 낸다(검토 I-1)
    const cause = (error as { cause?: unknown })?.cause;
    return fail(`적재 중 오류(${errorTag(cause ?? error)})`);
  } finally {
    await handle.close();
  }
}

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`seed-load: ${parsed.error}`);
    return 2;
  }
  const root = resolve(process.cwd(), parsed.args.root);
  const { code, lines } = await runSeedLoad(parsed.args, {
    files: readSeedTree(root),
    databaseUrl: process.env[DATABASE_URL_ENV],
    now,
  });
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

if (isDirectRun()) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      // 예상 밖 오류도 메시지 · 스택을 내지 않는다(칸 내용 · 접속 문자열이 들 수 있다)
      console.error(`seed-load: 예상 밖 오류(${errorTag(error)})`);
      process.exitCode = 2;
    },
  );
}

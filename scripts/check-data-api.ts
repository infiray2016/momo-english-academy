// Data API 닫힘 확인(AC-N5 · 10절 접근 제어, plan-p03b 파일별 값 11).
// publishable 키(있으면 레거시 anon 키도)로 모든 테이블을 조회해, 닫힘(2xx 아님) 또는 0행인지 본다.
// 사용: pnpm check:data-api — 요청자 터미널에서(H3 뒤). 입력은 process.env 와 .env.local(있으면, process.env 를 바꾸지 않음).
// 종료 코드: 0 위반 없음, 1 '행 있음' · '모름'이 하나라도, 2 입력 없음 · 테이블 0개 · '닿지 않음'이 하나라도.
// 출력에는 테이블 · 키 종류 · 분류 · 상태 코드 · PostgREST 오류 코드만 낸다. 키 값 · 응답 본문은 앞 몇 글자도 내지 않는다.
import { readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as content from "../src/db/schema/content";
import * as learning from "../src/db/schema/learning";
import * as operations from "../src/db/schema/operations";

/** 요청 하나의 시간 상한(기술 값). */
export const REQUEST_TIMEOUT_MS = 10_000;
export const ENV_FILE = ".env.local";
export const EXIT_OK = 0;
export const EXIT_VIOLATION = 1;
export const EXIT_INPUT = 2;
const REST_PATH = "/rest/v1/";
const ERROR_CODE = /^[A-Za-z0-9_]{1,16}$/;

export type Classification =
  | "closed"
  | "empty"
  | "rows"
  | "unknown"
  | "unreachable";
export type KeyKind = "publishable" | "legacy_anon";
export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<Response>;
export type Probe = {
  table: string;
  keyKind: KeyKind;
  classification: Classification;
  /** 닫힘일 때 '상태 [PostgREST 코드]'. */
  closedAs?: string;
};

const LABELS: Record<Classification, string> = {
  closed: "닫힘",
  empty: "0행",
  rows: "행 있음",
  unknown: "모름",
  unreachable: "닿지 않음",
};
const ORDER: Classification[] = [
  "closed",
  "empty",
  "rows",
  "unknown",
  "unreachable",
];

/** P3a 스키마 세 파일의 테이블 이름(29개). */
export function schemaTableNames(): string[] {
  return [content, learning, operations]
    .flatMap((mod) => Object.values(mod))
    .filter((value): value is PgTable => is(value, PgTable))
    .map((table) => getTableName(table))
    .sort();
}

/** 응답 하나의 분류. 응답이 없으면(요청 실패) 닿지 않음. */
export function classifyResponse(
  response: { status: number; body: unknown } | null,
): { classification: Classification; closedAs?: string } {
  if (!response) return { classification: "unreachable" };
  const { status, body } = response;
  if (status < 200 || status >= 300) {
    const code =
      body && typeof body === "object" && "code" in body
        ? String((body as { code: unknown }).code)
        : "";
    return {
      classification: "closed",
      closedAs: ERROR_CODE.test(code) ? `${status} ${code}` : String(status),
    };
  }
  if (!Array.isArray(body)) return { classification: "unknown" };
  return { classification: body.length === 0 ? "empty" : "rows" };
}

/** 첫 줄 요약, 닫힘 응답 분포, 그다음 위반마다 `테이블 키종류 분류`. */
export function summarize(
  probes: readonly Probe[],
  tableCount: number,
  keyCount: number,
): string[] {
  const counts = ORDER.map(
    (c) =>
      `${LABELS[c]} ${probes.filter((p) => p.classification === c).length}`,
  );
  const lines = [
    `check-data-api: 테이블 ${tableCount} · 키 ${keyCount} · ${counts.join(" · ")}`,
  ];
  const closed = new Map<string, number>();
  for (const probe of probes) {
    if (probe.closedAs) {
      closed.set(probe.closedAs, (closed.get(probe.closedAs) ?? 0) + 1);
    }
  }
  if (closed.size > 0) {
    lines.push(
      `닫힘 응답: ${[...closed.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([as, n]) => `${as} ×${n}`)
        .join(" · ")}`,
    );
  }
  for (const probe of probes) {
    if (["rows", "unknown", "unreachable"].includes(probe.classification)) {
      lines.push(
        `${probe.table} ${probe.keyKind} ${LABELS[probe.classification]}`,
      );
    }
  }
  return lines;
}

export function exitCode(probes: readonly Probe[]): number {
  if (probes.some((p) => p.classification === "unreachable")) return EXIT_INPUT;
  if (
    probes.some(
      (p) => p.classification === "rows" || p.classification === "unknown",
    )
  ) {
    return EXIT_VIOLATION;
  }
  return EXIT_OK;
}

export async function runDataApiCheck({
  env,
  tables,
  fetch: fetchFn,
}: {
  env: Readonly<Record<string, string | undefined>>;
  tables: readonly string[];
  fetch: FetchLike;
}): Promise<{ code: number; lines: string[] }> {
  const rawUrl = env.SUPABASE_URL?.trim();
  const publishable = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  const legacy = env.SUPABASE_LEGACY_ANON_KEY?.trim();
  if (!rawUrl || !publishable) {
    return {
      code: EXIT_INPUT,
      lines: [
        "check-data-api: SUPABASE_URL · SUPABASE_PUBLISHABLE_KEY 가 없습니다",
      ],
    };
  }
  let base: URL;
  try {
    base = new URL(rawUrl);
  } catch {
    return {
      code: EXIT_INPUT,
      lines: ["check-data-api: SUPABASE_URL 이 주소 꼴이 아닙니다"],
    };
  }
  if (tables.length === 0) {
    return { code: EXIT_INPUT, lines: ["check-data-api: 테이블이 0개입니다"] };
  }
  const keys: { kind: KeyKind; headers: Record<string, string> }[] = [
    { kind: "publishable", headers: { apikey: publishable } },
  ];
  if (legacy) {
    keys.push({
      kind: "legacy_anon",
      headers: { apikey: legacy, authorization: `Bearer ${legacy}` },
    });
  }

  const probes: Probe[] = [];
  for (const key of keys) {
    for (const table of tables) {
      const url = new URL(`${REST_PATH}${table}`, base);
      url.search = "select=*&limit=1";
      let response: { status: number; body: unknown } | null = null;
      try {
        const res = await fetchFn(url.toString(), {
          headers: key.headers,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        const text = await res.text();
        let body: unknown = null;
        try {
          body = text === "" ? null : JSON.parse(text);
        } catch {
          body = null;
        }
        response = { status: res.status, body };
      } catch {
        response = null;
      }
      probes.push({ table, keyKind: key.kind, ...classifyResponse(response) });
    }
  }
  return {
    code: exitCode(probes),
    lines: summarize(probes, tables.length, keys.length),
  };
}

function readEnvFile(path: string): Record<string, string> {
  try {
    return parseEnv(readFileSync(path, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

async function main(): Promise<number> {
  const env = { ...readEnvFile(join(process.cwd(), ENV_FILE)), ...process.env };
  const { code, lines } = await runDataApiCheck({
    env,
    tables: schemaTableNames(),
    fetch: (url, init) => fetch(url, init),
  });
  const write = code === EXIT_OK ? console.log : console.error;
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
  main().then((code) => {
    process.exitCode = code;
  });
}

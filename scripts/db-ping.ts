// 활동 유지 명령(plan-p07b 파일별 값 2, 10절 운영 행 — Supabase Free 의 1주 비활성 정지를 막는 활동 유지 요청).
// 사용: pnpm db:ping — DATABASE_URL(트랜잭션 풀러)에 사용자 표 읽기 질의 하나를 보낸다.
// server-only 를 가져오지 않고 postgres 를 바로 쓴다(스크립트는 의존 규칙 대상 밖).
// 종료 코드: 0 읽음, 2 접속 문자열 없음 · 접속 실패 · 질의 실패.
// 접속 문자열 · 행 내용 · 오류 원문(접속 정보가 섞일 수 있다)을 내지 않는다.
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

/** 접속 문자열 환경 변수 이름(10절 · .env.example, keepalive 작업이 넘긴다). */
export const DATABASE_URL_ENV = "DATABASE_URL";
/** 접속을 기다리는 시간(초, 기술 값). */
const PING_TIMEOUT_SECONDS = 20;
/** 끝낼 때 남은 질의를 기다리는 시간(초, 기술 값). */
const CLOSE_TIMEOUT_SECONDS = 5;

export type PingResult =
  | { ok: true; settingsRows: number }
  | { ok: false; reason: "connect" | "query" };

/** 접속 하나를 잡고(접속 실패와 질의 실패를 가른다) settings 행 수를 읽은 뒤 닫는다. */
export async function ping(url: string): Promise<PingResult> {
  const sql = postgres(url, {
    prepare: false, // 트랜잭션 풀러(6543)용, P3a 와 같다
    max: 1,
    connect_timeout: PING_TIMEOUT_SECONDS,
    onnotice: () => {},
  });
  try {
    let reserved: postgres.ReservedSql;
    try {
      reserved = await sql.reserve();
    } catch {
      return { ok: false, reason: "connect" };
    }
    try {
      const rows = await reserved<
        { n: number }[]
      >`select count(*)::int as n from settings`;
      return { ok: true, settingsRows: rows[0]?.n ?? 0 };
    } catch {
      return { ok: false, reason: "query" };
    } finally {
      reserved.release();
    }
  } finally {
    await sql.end({ timeout: CLOSE_TIMEOUT_SECONDS }).catch(() => {});
  }
}

const REASON_WORDS = { connect: "접속", query: "질의" } as const;

export async function runPing(
  env: Readonly<Record<string, string | undefined>>,
  deps: { ping?: (url: string) => Promise<PingResult> } = {},
): Promise<{ code: 0 | 2; lines: string[] }> {
  const url = env[DATABASE_URL_ENV];
  if (!url) return { code: 2, lines: [`db-ping: ${DATABASE_URL_ENV} 이 없다`] };
  const result = await (deps.ping ?? ping)(url);
  if (result.ok) {
    return { code: 0, lines: [`db-ping: settings ${result.settingsRows}행`] };
  }
  return { code: 2, lines: [`db-ping: 실패(${REASON_WORDS[result.reason]})`] };
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
  runPing(process.env).then(
    ({ code, lines }) => {
      const write = code === 0 ? console.log : console.error;
      for (const line of lines) write(line);
      process.exitCode = code;
    },
    (error: unknown) => {
      // 예상 밖 오류도 메시지를 내지 않는다(접속 정보가 섞일 수 있다)
      console.error(
        `db-ping: 예상 밖 오류(${error instanceof Error ? error.name : "Error"})`,
      );
      process.exitCode = 2;
    },
  );
}

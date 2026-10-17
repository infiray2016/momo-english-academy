// 로컬 내장 Postgres 공용 조각(검토 review-p10-1 M-4). 개발용 · e2e DB(scripts/dev-db.ts)와 통합 시험 DB(tests/integration/global-setup.ts)가
// 같은 Supabase 흉내 · 접속 문자열 조립 · 로그 끝 줄을 쓰게 한 곳에 둔다(묶음 위험 15 · plan-p03a 위험 6).
// Node 기본 모듈도 가져오지 않는 순수 조각이라 Playwright 설정 · Vitest · tsx 어디서나 읽힌다.

/** 내장 Postgres 의 관리자 사용자. */
export const PG_ADMIN_USER = "postgres";
/** 관리자 DB. */
export const PG_ADMIN_DB = "postgres";
/** 시작 실패 때 붙일 Postgres 로그 끝 줄 수. */
export const LOG_TAIL_LINES = 40;

/** Supabase 의 API 역할 흉내(anon · authenticated 는 로그인 없음, service_role 은 RLS 우회). */
export const SUPABASE_ROLES = [
  { name: "anon", sql: "CREATE ROLE anon NOLOGIN" },
  { name: "authenticated", sql: "CREATE ROLE authenticated NOLOGIN" },
  { name: "service_role", sql: "CREATE ROLE service_role NOLOGIN BYPASSRLS" },
] as const;

/** Supabase 의 public 기본 권한 흉내(본 DB 안에서, 마이그레이션 앞에 돈다). */
export function supabaseDefaultPrivilegeSql(
  adminUser: string = PG_ADMIN_USER,
): string[] {
  return [
    "GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role",
    ...["TABLES", "SEQUENCES", "FUNCTIONS"].map(
      (kind) =>
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${adminUser} IN SCHEMA public GRANT ALL ON ${kind} TO anon, authenticated, service_role`,
    ),
  ];
}

/** '사용자:비밀번호@' 꼴의 문자열 틀을 쓰지 않고 URL 속성으로 조립한다(P3a 꼴). */
export function pgUrl(opts: {
  password: string;
  port: number;
  database: string;
  user?: string;
}): string {
  const url = new URL("postgres://127.0.0.1");
  url.username = opts.user ?? PG_ADMIN_USER;
  url.password = opts.password;
  url.port = String(opts.port);
  url.pathname = `/${opts.database}`;
  return url.toString();
}

/** Postgres 로그의 끝 줄만 모은다(빈 줄 빼고 LOG_TAIL_LINES 줄까지). */
export function createLogTail(): {
  push: (message: unknown) => void;
  lines: string[];
} {
  const lines: string[] = [];
  return {
    lines,
    push(message) {
      for (const line of String(message).split(/\r?\n/)) {
        if (line.trim() === "") continue;
        lines.push(line);
        if (lines.length > LOG_TAIL_LINES) lines.shift();
      }
    },
  };
}

/**
 * embedded-postgres 가 읽힐 때 async-exit-hook 로 거는 처리기 가운데 종료 코드를 바꾸는 것(검토 review-p10-5-6-code I-1).
 * beforeExit 는 '코드 0 으로 끝내기'라 vitest 의 실패 종료 코드(1)를 덮고, 신호 · message 는 128 + 번호 · 0 으로 끝낸다.
 * 'exit'(끝날 때 자식 Postgres 정리)는 남긴다.
 */
export const EXIT_HOOK_EVENTS = [
  "beforeExit",
  "message",
  "SIGHUP",
  "SIGINT",
  "SIGTERM",
  "SIGBREAK",
] as const;

type EmbeddedPostgresModule = typeof import("embedded-postgres");

/**
 * embedded-postgres 를 동적으로 읽고, 읽는 동안 새로 걸린 EXIT_HOOK_EVENTS 처리기를 뗀다. 개발용 · e2e DB(dev-db)와
 * 통합 시험 global setup 이 함께 쓴다. 끄기는 부르는 쪽(stop · cleanUp · 자기 신호 처리기)이 한다. load 는 시험이 바꾼다.
 */
export async function importEmbeddedPostgres(
  load: () => Promise<EmbeddedPostgresModule> = () =>
    import("embedded-postgres"),
): Promise<EmbeddedPostgresModule["default"]> {
  const emitter = process as unknown as NodeJS.EventEmitter;
  const before = new Map(
    EXIT_HOOK_EVENTS.map((event) => [event, new Set(emitter.listeners(event))]),
  );
  const loaded = await load();
  for (const event of EXIT_HOOK_EVENTS) {
    for (const listener of emitter.listeners(event)) {
      if (!before.get(event)?.has(listener))
        emitter.off(event, listener as (...args: unknown[]) => void);
    }
  }
  return loaded.default;
}

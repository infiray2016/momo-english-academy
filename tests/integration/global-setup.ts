// 통합 시험의 시험용 Postgres(Vitest globalSetup, plan-p03a 파일별 값 9, C55 (1)).
// 컨테이너 없이 embedded-postgres 로 띄워 로컬 · CI 가 같은 방법이다.
// Supabase 의 anon · authenticated · service_role 역할과 public 기본 권한을 흉내 낸 뒤
// 마이그레이션을 본 DB(momo_template) 하나에 적용한다. 시험 파일은 이 DB 를 복사해 쓴다(test-db.ts).
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import EmbeddedPostgres from "embedded-postgres";
import postgres from "postgres";
import type { TestProject } from "vitest/node";

const TEMPLATE_DB = "momo_template";
const ADMIN_USER = "postgres";
const ADMIN_DB = "postgres";
const MIGRATIONS_FOLDER = "drizzle";
/** 비밀번호 바이트 수(실행 때 만든다, 저장소에 적지 않는다). */
const PASSWORD_BYTES = 24;
/** 시작 실패 때 오류에 붙일 Postgres 로그 끝 줄 수. */
const LOG_TAIL_LINES = 40;

declare module "vitest" {
  interface ProvidedContext {
    pgAdminUrl: string;
    pgTemplateDb: string;
  }
}

/** 운영 체제가 고른 빈 포트를 받고 닫는다. */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("빈 포트를 받지 못했다"));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

/** '사용자:비밀번호@' 꼴의 문자열 틀을 쓰지 않고 URL 속성으로 조립한다. */
function buildPgUrl(opts: {
  user: string;
  password: string;
  port: number;
  database: string;
}): string {
  const url = new URL("postgres://127.0.0.1");
  url.username = opts.user;
  url.password = opts.password;
  url.port = String(opts.port);
  url.pathname = `/${opts.database}`;
  return url.toString();
}

export default async function setup(project: TestProject) {
  const databaseDir = mkdtempSync(join(tmpdir(), "momo-pg-"));
  const port = await freePort();
  const password = randomBytes(PASSWORD_BYTES).toString("hex");
  // Postgres 로그의 끝 줄만 모은다. 성공 때는 내지 않고, 시작 실패 때 원인으로 붙인다(검토 A1 M-2)
  const logTail: string[] = [];
  const pg = new EmbeddedPostgres({
    databaseDir,
    port,
    user: ADMIN_USER,
    password,
    persistent: false,
    onLog: (message) => {
      for (const line of message.split(/\r?\n/)) {
        if (line.trim() === "") continue;
        logTail.push(line);
        if (logTail.length > LOG_TAIL_LINES) logTail.shift();
      }
    },
  });

  // start() 가 끝나기 전에 실패하면 서버 프로세스가 이미 닫혀 stop() 이 기다릴 'exit' 가 오지 않으므로,
  // 시작에 성공한 때만 stop() 한다.
  let started = false;
  const cleanUp = async () => {
    try {
      if (started) await pg.stop();
    } finally {
      rmSync(databaseDir, { recursive: true, force: true });
    }
  };

  try {
    await prepareCluster(project, pg, { password, port, logTail }, () => {
      started = true;
    });
  } catch (error) {
    // 실패 경로에서도 Postgres 와 데이터 폴더를 정리한 뒤 다시 던진다(검토 A1 M-1)
    await cleanUp();
    throw error;
  }

  return cleanUp;
}

async function prepareCluster(
  project: TestProject,
  pg: EmbeddedPostgres,
  {
    password,
    port,
    logTail,
  }: { password: string; port: number; logTail: string[] },
  markStarted: () => void,
) {
  const startedAt = performance.now();
  await pg.initialise();
  try {
    await pg.start();
  } catch (cause) {
    throw new Error(
      `시험용 Postgres 를 띄우지 못했다. 로그 끝 ${logTail.length}줄:\n${logTail.join("\n")}`,
      { cause },
    );
  }
  markStarted();
  const startMs = Math.round(performance.now() - startedAt);
  console.info(`[global-setup] 시험용 Postgres 시작 ${startMs}ms`);

  const adminUrl = buildPgUrl({
    user: ADMIN_USER,
    password,
    port,
    database: ADMIN_DB,
  });
  const templateUrl = buildPgUrl({
    user: ADMIN_USER,
    password,
    port,
    database: TEMPLATE_DB,
  });

  // Supabase 역할 흉내(묶음 위험 15)
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  try {
    await admin.unsafe("CREATE ROLE anon NOLOGIN");
    await admin.unsafe("CREATE ROLE authenticated NOLOGIN");
    await admin.unsafe("CREATE ROLE service_role NOLOGIN BYPASSRLS");
    await admin.unsafe(`CREATE DATABASE "${TEMPLATE_DB}"`);
  } finally {
    await admin.end();
  }

  // 본 DB 안에서 Supabase 기본 권한을 흉내 낸 뒤 마이그레이션한다(plan-p03a 위험 6)
  const templateClient = postgres(templateUrl, {
    max: 1,
    onnotice: () => {},
  });
  try {
    await templateClient.unsafe(
      "GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role",
    );
    for (const kind of ["TABLES", "SEQUENCES", "FUNCTIONS"]) {
      await templateClient.unsafe(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${ADMIN_USER} IN SCHEMA public GRANT ALL ON ${kind} TO anon, authenticated, service_role`,
      );
    }
    await migrate(drizzle({ client: templateClient }), {
      migrationsFolder: MIGRATIONS_FOLDER,
    });
  } finally {
    // 본 DB 를 복사하려면 그 DB 에 연결이 없어야 한다
    await templateClient.end();
  }

  project.provide("pgAdminUrl", adminUrl);
  project.provide("pgTemplateDb", TEMPLATE_DB);
}

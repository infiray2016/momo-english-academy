import { randomBytes, randomInt } from "node:crypto";
import { hashSync } from "@node-rs/argon2";
import { defineConfig, devices } from "@playwright/test";
import {
  DB_NAMES,
  databaseUrl,
  E2E_PASSWORD_ENV,
  READY_MARK,
} from "./scripts/dev-db";
import {
  ACCESS_CODE_MIN_LENGTH,
  encodeAccessCodeHash,
} from "./src/core/access-token";
import { FAKE_AI_READY } from "./tests/e2e/fake-ai-server";

/** 10.9형 태블릿(정본 4절 아이 화면 글자 기준, 잠정). Apple iPad Air(5세대) 2360 × 1640 을 2배율로 나눈 값 */
export const TABLET_10_9_VIEWPORT = { width: 820, height: 1180 } as const;
const E2E_PORT = 3100;
/** e2e 임시 DB 포트(기술 값, 개발용 54329 · 통합 시험의 빈 포트와 겹치지 않게, plan-p10a 공용 변경 3). */
export const E2E_DB_PORT = 54339;
/** e2e 임시 DB 비밀번호 바이트 수(실행 때 만든다, 저장소에 적지 않는다). */
const E2E_DB_PASSWORD_BYTES = 24;
/** e2e DB 를 끌 때 SIGTERM 뒤 기다리는 시간(기술 값, 넘으면 SIGKILL). */
const E2E_DB_SHUTDOWN_TIMEOUT_MS = 10_000;
/** e2e 가짜 Anthropic 서버 포트(기술 값, e2e DB 54339 와 겹치지 않게, plan-p11b 공용 변경 1 · 13절 C81). */
export const E2E_AI_PORT = 54349;
/** e2e 가짜 AI 서버만 받는 시험 키(비밀값 아님 — 실제 키가 아니고 가짜 서버는 키를 보지 않는다). */
export const E2E_FAKE_AI_KEY = "e2e-fake-key";
/** 가짜 AI 서버를 끌 때 SIGTERM 뒤 기다리는 시간(기술 값). */
const E2E_AI_SHUTDOWN_TIMEOUT_MS = 5_000;
const SERVER_START_TIMEOUT_MS = 180_000;
const CI_RETRIES = 1;
const ALPHANUMERIC =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// 시험용 가족 접근 코드와 그 해시를 실행 때 만든다(값은 저장소에 없다, plan-p03b 공용 변경 4).
// 일꾼 프로세스도 이 설정을 다시 읽으므로 이미 있으면 그대로 둔다(e2e 서버와 시험이 같은 열쇠를 쓴다).
if (!process.env.E2E_ACCESS_CODE || !process.env.E2E_ACCESS_CODE_HASH) {
  let code = "";
  for (let i = 0; i < ACCESS_CODE_MIN_LENGTH * 2; i += 1) {
    code += ALPHANUMERIC[randomInt(ALPHANUMERIC.length)];
  }
  process.env.E2E_ACCESS_CODE = code;
  process.env.E2E_ACCESS_CODE_HASH = encodeAccessCodeHash(hashSync(code));
}

// 시험용 DB 비밀번호도 같은 꼴로 실행 때 만든다(일꾼이 다시 읽어도 같은 값, tests/e2e/db.ts 가 같이 쓴다)
if (!process.env[E2E_PASSWORD_ENV]) {
  process.env[E2E_PASSWORD_ENV] = randomBytes(E2E_DB_PASSWORD_BYTES).toString(
    "hex",
  );
}

/** e2e 임시 DB 접속 문자열(URL 속성으로 조립 — scripts/dev-db.ts databaseUrl). */
export function e2eDatabaseUrl(): string {
  return databaseUrl({
    password: process.env[E2E_PASSWORD_ENV] ?? "",
    port: E2E_DB_PORT,
    database: DB_NAMES.e2e,
  });
}

const serverEnv: Record<string, string> = {};
for (const [name, value] of Object.entries(process.env)) {
  if (value !== undefined) serverEnv[name] = value;
}
serverEnv.ACCESS_CODE_HASH = process.env.E2E_ACCESS_CODE_HASH ?? "";
// Next 서버는 가짜 AI 서버로만 부른다(e2e 는 실제 API 를 부르지 않는다 — 묶음 제약, C81). VERCEL_ENV 가 있으면 P9a
// clientOptionsOf 가 기본 주소로 고정하므로 지운다(그때만 SDK 가 ANTHROPIC_BASE_URL 을 읽는다)
const { VERCEL_ENV: _vercelEnv, ...withoutVercel } = serverEnv;
const nextEnv = {
  ...withoutVercel,
  DATABASE_URL: e2eDatabaseUrl(),
  ANTHROPIC_BASE_URL: `http://127.0.0.1:${E2E_AI_PORT}`,
  ANTHROPIC_API_KEY: E2E_FAKE_AI_KEY,
};

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? CI_RETRIES : 0,
  use: { baseURL: `http://localhost:${E2E_PORT}` },
  projects: [
    {
      name: "tablet-10-9-webkit",
      use: { ...devices["iPad Pro 11"], viewport: TABLET_10_9_VIEWPORT },
    },
  ],
  // P10 e2e 는 집 하나(프로필 하나 · PIN 하나)의 DB 를 함께 쓰므로 한 번에 하나씩(plan-p10a 공용 변경 3)
  workers: 1,
  // 배열 차례로 하나씩 띄운다 — 임시 DB(준비 줄을 기다림) · 가짜 AI 서버(준비 줄) 다음 Next 서버. 낡은 서버를 다시 쓰지 않는다
  webServer: [
    {
      name: "e2e-db",
      command: `node --conditions=react-server --import tsx scripts/dev-db.ts --ephemeral --port ${E2E_DB_PORT}`,
      wait: { stdout: new RegExp(`${READY_MARK} e2e`) },
      reuseExistingServer: false,
      gracefulShutdown: {
        signal: "SIGTERM",
        timeout: E2E_DB_SHUTDOWN_TIMEOUT_MS,
      },
      timeout: SERVER_START_TIMEOUT_MS,
      env: serverEnv,
    },
    {
      name: "fake-ai",
      command: `node --import tsx tests/e2e/fake-ai-server.ts --port ${E2E_AI_PORT}`,
      wait: { stdout: new RegExp(FAKE_AI_READY) },
      reuseExistingServer: false,
      gracefulShutdown: {
        signal: "SIGTERM",
        timeout: E2E_AI_SHUTDOWN_TIMEOUT_MS,
      },
      timeout: SERVER_START_TIMEOUT_MS,
      env: serverEnv,
    },
    {
      command: `pnpm build && pnpm start --port ${E2E_PORT}`,
      url: `http://localhost:${E2E_PORT}`,
      reuseExistingServer: false,
      timeout: SERVER_START_TIMEOUT_MS,
      env: nextEnv,
    },
  ],
});

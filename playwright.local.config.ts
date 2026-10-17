import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
// playwright.config 를 가져오면 시험용 E2E_ACCESS_CODE · E2E_ACCESS_CODE_HASH 가 만들어진다(P3b)
import { TABLET_10_9_VIEWPORT } from "./playwright.config";

/** 로컬 전용 화면 시험의 개발 서버 자리(e2e 3100 · 요청자 개발 서버 3000 과 다르게). */
const E2E_LOCAL_PORT = 3200;
/** next dev 시작 시간 상한(기술 값). */
const SERVER_START_TIMEOUT_MS = 120_000;
/** 개발 서버의 첫 컴파일까지 든 시험 하나의 시간 상한(기술 값). */
const TEST_TIMEOUT_MS = 60_000;
const CI_RETRIES = 1;
/** 시드 보기 화면이 읽고 쓰는 시험용 시드 뿌리(tests/.tmp 는 .gitignore · tsconfig 에서 빠져 있다). */
export const SEED_VIEWER_E2E_ROOT = join(
  __dirname,
  "tests",
  ".tmp",
  "seed-viewer-e2e",
);

const serverEnv: Record<string, string> = {};
for (const [name, value] of Object.entries(process.env)) {
  if (value !== undefined) serverEnv[name] = value;
}
serverEnv.ACCESS_CODE_HASH = process.env.E2E_ACCESS_CODE_HASH ?? "";
serverEnv.SEED_VIEWER_ROOT = SEED_VIEWER_E2E_ROOT;

export default defineConfig({
  testDir: "tests/e2e-local",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? CI_RETRIES : 0,
  workers: 1,
  timeout: TEST_TIMEOUT_MS,
  use: { baseURL: `http://localhost:${E2E_LOCAL_PORT}` },
  projects: [
    {
      name: "tablet-10-9-webkit",
      use: { ...devices["iPad Pro 11"], viewport: TABLET_10_9_VIEWPORT },
    },
  ],
  webServer: {
    command: `pnpm dev --port ${E2E_LOCAL_PORT}`,
    url: `http://localhost:${E2E_LOCAL_PORT}`,
    // 진짜 seed/ 를 읽는 요청자 개발 서버를 시험이 쓰지 않는다(P5c 시험은 seed/reviews 에 쓴다)
    reuseExistingServer: false,
    timeout: SERVER_START_TIMEOUT_MS,
    env: serverEnv,
  },
});

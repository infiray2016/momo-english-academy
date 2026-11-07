import { defineConfig, devices } from "@playwright/test";

/** 10.9형 태블릿(정본 4절 아이 화면 글자 기준, 잠정). Apple iPad Air(5세대) 2360 × 1640 을 2배율로 나눈 값 */
export const TABLET_10_9_VIEWPORT = { width: 820, height: 1180 } as const;
const E2E_PORT = 3100;
const SERVER_START_TIMEOUT_MS = 180_000;
const CI_RETRIES = 1;

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
  webServer: {
    command: `pnpm build && pnpm start --port ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: SERVER_START_TIMEOUT_MS,
  },
});

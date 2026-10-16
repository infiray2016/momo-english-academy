import { randomInt } from "node:crypto";
import { hashSync } from "@node-rs/argon2";
import { defineConfig, devices } from "@playwright/test";
import {
  ACCESS_CODE_MIN_LENGTH,
  encodeAccessCodeHash,
} from "./src/core/access-token";

/** 10.9형 태블릿(정본 4절 아이 화면 글자 기준, 잠정). Apple iPad Air(5세대) 2360 × 1640 을 2배율로 나눈 값 */
export const TABLET_10_9_VIEWPORT = { width: 820, height: 1180 } as const;
const E2E_PORT = 3100;
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

const serverEnv: Record<string, string> = {};
for (const [name, value] of Object.entries(process.env)) {
  if (value !== undefined) serverEnv[name] = value;
}
serverEnv.ACCESS_CODE_HASH = process.env.E2E_ACCESS_CODE_HASH ?? "";

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
    env: serverEnv,
  },
});

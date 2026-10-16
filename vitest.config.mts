import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** 통합 시험 하나의 시간 상한. 시험 DB 를 복사해 만들고 지우는 시간까지 든다(기술 값). */
const INTEGRATION_TEST_TIMEOUT_MS = 30_000;

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // server-only 의 기본 내보내기는 Node 에서 오류를 던진다. 시험에서는 빈 모듈로 바꾼다(두 프로젝트 공통).
    // 꾸러미의 exports 가 "./empty.js" 를 내보내지 않아 'server-only/empty.js' 로는 풀리지 않으므로 파일 경로로 준다.
    alias: {
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts", "tests/contract/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/integration/global-setup.ts"],
          testTimeout: INTEGRATION_TEST_TIMEOUT_MS,
        },
      },
    ],
  },
});

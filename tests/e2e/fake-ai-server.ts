// e2e 가짜 Anthropic 서버(plan-p11b 공용 변경 1 · 파일별 값 8 · 13절 C81). Playwright webServer 가 임시 DB 다음 · Next 서버 앞에
//   node --import tsx tests/e2e/fake-ai-server.ts --port <E2E_AI_PORT>
// 로 띄운다. P9a startFakeAnthropicServer(규칙 없음으로 시작 — 맞는 규칙이 없으면 501)를 그대로 쓰고, 준비 줄 FAKE_AI_READY 를 낸다.
// 시험은 tests/e2e/fake-ai.ts 로 /__fake/{reset,rules,requests} 를 불러 규칙을 넣고 받은 요청을 본다. 실제 API 주소 · 키를 쓰지 않는다.
// import.meta 를 쓰지 않는다 — Playwright 가 설정(이 파일의 준비 줄 상수를 가져감)을 CommonJS 로 읽는다(scripts/dev-db.ts 와 같은 결).
import { realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  type FakeAnthropicServer,
  startFakeAnthropicServer,
} from "../fixtures/ai/fake-anthropic";

/** 띄워졌다고 알리는 준비 줄(playwright.config 의 webServer wait 가 기다린다). */
export const FAKE_AI_READY = "FAKE_AI_READY";
/** 이 명령의 파일(뿌리 기준, 직접 실행 판정). */
const SCRIPT_PATH = join("tests", "e2e", "fake-ai-server.ts");
const PORT_FLAG = "--port";
/** 신호를 기다리며 켜 두는 빈 시계 간격(기술 값). */
const KEEP_ALIVE_MS = 1 << 30;

function portOf(argv: readonly string[]): number {
  const at = argv.indexOf(PORT_FLAG);
  const port = Number(at >= 0 ? argv[at + 1] : Number.NaN);
  if (!Number.isInteger(port) || port <= 0)
    throw new Error("fake-ai-server: --port <n> 이 필요해요");
  return port;
}

async function main(): Promise<void> {
  const server: FakeAnthropicServer = await startFakeAnthropicServer({
    port: portOf(process.argv),
  });
  console.log(FAKE_AI_READY);
  const keepAlive = setInterval(() => {}, KEEP_ALIVE_MS);
  const stop = () => {
    clearInterval(keepAlive);
    void server.close().finally(() => process.exit(0));
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return (
      realpathSync(entry) === realpathSync(resolve(process.cwd(), SCRIPT_PATH))
    );
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main().catch((error: unknown) => {
    console.error(
      `fake-ai-server: 띄우지 못했어요(${error instanceof Error ? error.message : "Error"})`,
    );
    process.exit(1);
  });
}

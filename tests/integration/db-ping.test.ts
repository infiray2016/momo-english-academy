// 활동 유지 명령(plan-p07b 파일별 값 2, 10절 운영 행 '1주 비활성 정지를 막는 활동 유지 요청').
// 시험용 Postgres(embedded-postgres)만 쓴다.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { DATABASE_URL_ENV, ping, runPing } from "../../scripts/db-ping";
import { TEST_SETTINGS } from "../fixtures/settings";
import { createTestDatabase, seedSettings, type TestDatabase } from "./test-db";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SCRIPT = resolve(REPO_ROOT, "scripts/db-ping.ts");

let testDb: TestDatabase;
beforeAll(async () => {
  testDb = await createTestDatabase();
});
afterAll(async () => {
  await testDb.drop();
});

/** 닿지 않는 주소(닫힌 포트). 비밀번호 칸은 출력에 나오지 않는지 보려고 둔다. */
function unreachableUrl(): string {
  const url = new URL(testDb.url);
  url.port = "1";
  url.password = "unreachable-marker";
  return url.toString();
}

describe("활동 유지 명령(pnpm db:ping)", () => {
  it("10절 활동 유지: db:ping 은 시험용 DB 의 settings 행 수를 읽고 0 으로 끝나며 출력에 접속 문자열이 없다", async () => {
    const entries = Object.entries(TEST_SETTINGS)
      .slice(0, 3)
      .map(([key, { scope, value }]) => ({ key, scope, value }));
    await seedSettings(testDb.db, entries);
    expect(await ping(testDb.url)).toEqual({
      ok: true,
      settingsRows: entries.length,
    });
    const result = await runPing({ [DATABASE_URL_ENV]: testDb.url });
    expect(result).toEqual({
      code: 0,
      lines: [`db-ping: settings ${entries.length}행`],
    });
    // 명령으로 띄워도 같다(.env.local 은 읽지 않게 플래그 없이 띄운다)
    const run = spawnSync(process.execPath, ["--import", "tsx", SCRIPT], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { ...process.env, [DATABASE_URL_ENV]: testDb.url },
    });
    expect(run.status).toBe(0);
    expect(run.stdout.trim()).toBe(`db-ping: settings ${entries.length}행`);
    const text = `${run.stdout}\n${run.stderr}\n${result.lines.join("\n")}`;
    expect(text).not.toContain(testDb.url);
    expect(text).not.toContain(new URL(testDb.url).password);
  });

  it("10절 활동 유지: DATABASE_URL 이 없거나 닿지 않으면 2 다", async () => {
    expect(await runPing({})).toEqual({
      code: 2,
      lines: [`db-ping: ${DATABASE_URL_ENV} 이 없다`],
    });
    const url = unreachableUrl();
    expect(await ping(url)).toEqual({ ok: false, reason: "connect" });
    const result = await runPing({ [DATABASE_URL_ENV]: url });
    expect(result).toEqual({ code: 2, lines: ["db-ping: 실패(접속)"] });
    const run = spawnSync(process.execPath, ["--import", "tsx", SCRIPT], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: { ...process.env, [DATABASE_URL_ENV]: url },
    });
    expect(run.status).toBe(2);
    expect(`${run.stdout}${run.stderr}`).not.toContain("unreachable-marker");
  });

  it("10절 활동 유지: settings 표가 없는 DB 는 질의 실패로 2 이고 오류 원문을 내지 않는다", async () => {
    // 관리 DB(postgres)에는 마이그레이션을 걸지 않아 settings 표가 없다
    const adminUrl = inject("pgAdminUrl");
    expect(await ping(adminUrl)).toEqual({ ok: false, reason: "query" });
    const result = await runPing({ [DATABASE_URL_ENV]: adminUrl });
    expect(result).toEqual({ code: 2, lines: ["db-ping: 실패(질의)"] });
    expect(result.lines.join("\n")).not.toContain('settings" does not exist');
  });
});

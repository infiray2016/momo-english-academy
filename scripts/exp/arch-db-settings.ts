// 회화 구조 비교 실험(task-exp-harness): 도구가 쓰는 회화 설정값(seed/settings.json — talk.* · ai.*talk_turn*)을 개발 DB 의 settings 와 견준다.
// 사용: node --env-file-if-exists=.env.local --import tsx scripts/exp/arch-db-settings.ts <출력 JSON 경로>
// DB 는 SELECT 만 한다. 접속 문자열 · 프로필 id 는 내지 않는다(프로필 행은 키마다 수와 값만).
import { writeFileSync } from "node:fs";
import postgres from "postgres";
import { loadScriptConfig } from "../ai-contract";

const isTalkKey = (key: string) =>
  key.startsWith("talk.") || key.includes(".talk_turn");

async function main(): Promise<number> {
  const outPath = process.argv[2];
  const url = process.env.DATABASE_URL;
  if (!outPath || !url) {
    console.error("arch-db-settings: 출력 경로와 DATABASE_URL 이 필요하다");
    return 2;
  }
  const config = loadScriptConfig({ root: process.cwd() });
  const seed = Object.fromEntries(
    Object.entries(config.values).filter(([k]) => isTalkKey(k)),
  );
  const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
  try {
    const rows = await sql<
      { key: string; scope: string; is_default: boolean; value: unknown }[]
    >`select key, scope::text as scope, (profile_id is null) as is_default, value
      from settings
      where key like 'talk.%' or key like '%.talk_turn%'
      order by key`;
    const keys = [
      ...new Set([...Object.keys(seed), ...rows.map((r) => r.key)]),
    ].sort();
    const table = keys.map((key) => {
      const def = rows.find((r) => r.key === key && r.is_default);
      const profiles = rows.filter((r) => r.key === key && !r.is_default);
      const seedValue = seed[key];
      const same =
        def !== undefined &&
        JSON.stringify(def.value) === JSON.stringify(seedValue);
      return {
        key,
        seed: seedValue ?? null,
        db: def ? def.value : null,
        dbProfileRows: profiles.length,
        dbProfileValues: profiles.map((p) => p.value),
        same,
      };
    });
    const differ = table.filter((t) => !t.same || t.dbProfileRows > 0);
    writeFileSync(
      outPath,
      `${JSON.stringify({ settingsSource: config.settingsSource, checkedAt: new Date().toISOString(), keys: table.length, differ, table }, null, 2)}\n`,
    );
    console.log(
      `arch-db-settings: 키 ${table.length} · 다르거나 프로필 행이 있는 키 ${differ.length}`,
    );
    return 0;
  } finally {
    await sql.end({ timeout: 5 }).catch(() => {});
  }
}

void main().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(
      `arch-db-settings: ${error instanceof Error ? error.name : "Error"}`,
    );
    process.exitCode = 2;
  },
);

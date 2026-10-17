// 개발용 로컬 DB 길(plan-p10a 파일별 값 1 · 2, C70): 시험용 시드 나무 devSeedTree 와 scripts/dev-db.ts 의 순수 꼴.
// 접속 문자열 · 비밀번호는 시험 안에서도 지어낸 값만 쓴다(실제 값 없음).
import { describe, expect, it } from "vitest";
import {
  cellKey,
  checksFilePath,
  placementFilePath,
} from "@/core/seed/structure";
import { validateSeed } from "@/core/seed/validate";
import {
  DB_NAMES,
  DEV_DB_PORT,
  databaseUrl,
  describeError,
  ENV_LOCAL_KEYS,
  parseArgs,
  planEnvLocal,
  postmasterAlive,
  READY_MARK,
  readyLines,
} from "../../scripts/dev-db";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf, loadableSeed } from "../fixtures/seed/loadable";
import { TEST_SETTINGS } from "../fixtures/settings";

/** P10 이 읽는 12절 키(plan-p10a 값 2 — 공용 변경 4 로 TEST_SETTINGS 에 들어온다). */
const P10_KEYS = [
  "placement.start_level",
  "placement.items_per_level",
  "placement.items_per_area",
  "placement.retest_months",
  "placement.recommend_up",
  "placement.recommend_down",
  "placement.repeat_pass",
  "placement.repeat_tries",
  "placement.target_minutes",
  "talk.placement_cap",
  "speech.lang",
  "speech.max_listen_seconds",
  "speech.end_silence_seconds.1-3",
  "speech.end_silence_seconds.4-6",
  "speech.end_silence_seconds.7-9",
  "speech.end_silence_seconds.10-12",
  "speech.watchdog_extra_seconds",
  "speech.max_retries",
  "speech.silent_items_max",
  "session.resume_hours",
  "seed.range_end_alert_margin",
  "unit.min_days.1-3",
  "unit.min_days.4-6",
  "unit.min_days.7-9",
  "unit.min_days.10-12",
  "unit.recent_score",
  "unit.recent_window",
  "unit.remedial_batch",
  "unit.parent_decision_days",
  "level.pass_score",
  "level.remedial_before_retest",
  "level.retest_gap_days",
  "level.near_pass_gap",
] as const;

describe("개발용 시드 나무", () => {
  it("개발용 시드 나무: 완전성 1단계 · 영역 셋에서 검증 오류 0 이고 말하기 배치 본 문항은 따라 말하기다", () => {
    const tree = devSeedTree();
    const report = validateSeed(filesOf(tree), {
      mode: "complete",
      through: DEV_SEED_THROUGH,
      areas: DEV_SEED_AREAS,
    });
    expect(report.errors).toEqual([]);
    expect(report.summary.failed).toBe(0);
    expect(report.empty).toEqual([]);
    expect(report.unchecked).toEqual([]);
    expect(report.summary.referenceErrors).toBe(0);

    expect(DEV_SEED_AREAS).toEqual(["reading", "writing", "speaking"]);
    const base = loadableSeed();
    const speaking = tree.placements.find((f) => f.area === "speaking");
    const before = base.placements.find((f) => f.area === "speaking");
    if (!speaking || !before) throw new Error("말하기 배치 파일이 없다");
    expect(speaking.levels.length).toBe(before.levels.length);
    for (const [i, entry] of speaking.levels.entries()) {
      const old = before.levels[i];
      if (!old) throw new Error("단계가 어긋났다");
      expect(entry.items.length).toBe(old.items.length);
      for (const [j, item] of entry.items.entries()) {
        const was = old.items[j] as { script?: string; no: number };
        // 본 문항은 그 문항의 대본 문장을 따라 말하는 문항이 된다
        expect(item).toMatchObject({
          no: was.no,
          type: "repeat",
          sentence: was.script,
        });
      }
      // 예비 문항(듣고 고르기)은 그대로다
      expect(entry.spares).toEqual(old.spares);
    }

    // 바꾼 칸(따라 말하기)은 풀이 검사 대상이 아니라 그 칸의 기록이 빠진다
    const checks = tree.checks.find(
      (c) => c.path === checksFilePath(placementFilePath("speaking")),
    );
    const records = checks?.file.records ?? [];
    const mainKey = cellKey({
      type: "placement",
      area: "speaking",
      level: 1,
      form: speaking.form,
      no: 1,
      spare: false,
    });
    const spareKey = cellKey({
      type: "placement",
      area: "speaking",
      level: 1,
      form: speaking.form,
      no: 1,
      spare: true,
    });
    expect(records.some((r) => r.cell === mainKey)).toBe(false);
    expect(records.some((r) => r.cell === spareKey)).toBe(true);

    // 다른 영역의 배치 · 수업은 손대지 않는다
    expect(tree.placements.filter((f) => f.area !== "speaking")).toEqual(
      base.placements.filter((f) => f.area !== "speaking"),
    );
    expect(tree.lessons).toEqual(base.lessons);
  });

  it("개발용 시드 나무의 설정값 시드에는 P10 이 읽는 12절 키가 모두 있고 작은 틀에 이미 있는 키는 작은 틀 값이다", () => {
    const rows = devSeedTree().reference.settings.settings;
    const byKey = new Map(rows.map((r) => [r.key, r]));
    for (const key of P10_KEYS) {
      expect(TEST_SETTINGS).toHaveProperty([key]);
      expect(byKey.has(key), key).toBe(true);
    }
    // 작은 틀 값이 이긴다(배치 문항은 단계마다 하나, 시드는 1단계까지)
    expect(byKey.get("placement.items_per_level")?.value).toBe(1);
    expect(byKey.get("seed.complete_through_level")?.value).toBe(
      DEV_SEED_THROUGH,
    );
    // 키는 한 번씩만
    expect(byKey.size).toBe(rows.length);
  });
});

describe("dev-db 인자", () => {
  it("인자 없음은 개발용, --reset 은 개발용 처음부터, --ephemeral --port 는 e2e 다", () => {
    expect(parseArgs([])).toEqual({
      ok: true,
      args: { mode: "dev", reset: false, port: DEV_DB_PORT },
    });
    expect(parseArgs(["--reset"])).toEqual({
      ok: true,
      args: { mode: "dev", reset: true, port: DEV_DB_PORT },
    });
    expect(parseArgs(["--ephemeral", "--port", "54339"])).toEqual({
      ok: true,
      args: { mode: "e2e", port: 54339 },
    });
    // 개발용도 다른 포트로 띄울 수 있다(기본 포트가 쓰이고 있을 때)
    expect(parseArgs(["--port", "54400"])).toEqual({
      ok: true,
      args: { mode: "dev", reset: false, port: 54400 },
    });
  });

  it("모르는 인자 · 포트 없는 --ephemeral · --reset 과 --ephemeral 함께 · 잘못된 포트는 거부한다", () => {
    for (const argv of [
      ["--wipe"],
      ["--ephemeral"],
      ["--ephemeral", "--reset", "--port", "54339"],
      ["--port"],
      ["--port", "abc"],
      ["--port", "80"],
      ["--port", "70000"],
    ]) {
      const parsed = parseArgs(argv);
      expect(parsed.ok, argv.join(" ")).toBe(false);
    }
  });
});

describe("dev-db .env.local", () => {
  const password = "pw-for-test-only";
  const urls = {
    DATABASE_URL: databaseUrl({
      password,
      port: DEV_DB_PORT,
      database: DB_NAMES.dev,
    }),
    MIGRATION_DATABASE_URL: databaseUrl({
      password,
      port: DEV_DB_PORT,
      database: DB_NAMES.dev,
    }),
  };
  const otherRemote = "postgres://user:secret@db.example.supabase.co:6543/x";

  it("개발용 DB: `.env.local` 은 비었거나 로컬 주소일 때만 고친다", () => {
    // 파일이 없으면 두 줄을 새로 쓴다
    const created = planEnvLocal(null, urls);
    expect(created.kind).toBe("write");
    if (created.kind !== "write") throw new Error("write 여야 한다");
    for (const key of ENV_LOCAL_KEYS) {
      expect(created.text).toContain(`${key}=${urls[key]}`);
    }

    // 값이 빈 줄(.env.example 을 베낀 꼴)은 그 자리에 채우고 다른 줄은 그대로 둔다
    const blank = [
      "# 메모",
      "DATABASE_URL=",
      "ACCESS_CODE_HASH=keep-me",
      "MIGRATION_DATABASE_URL=",
      "",
    ].join("\n");
    const filled = planEnvLocal(blank, urls);
    if (filled.kind !== "write") throw new Error("write 여야 한다");
    expect(filled.text.split("\n")).toEqual([
      "# 메모",
      `DATABASE_URL=${urls.DATABASE_URL}`,
      "ACCESS_CODE_HASH=keep-me",
      `MIGRATION_DATABASE_URL=${urls.MIGRATION_DATABASE_URL}`,
      "",
    ]);

    // 로컬 개발용 포트를 가리키던 옛 값(다른 비밀번호)은 새 값으로 바꾼다
    const oldLocal = databaseUrl({
      password: "old",
      port: DEV_DB_PORT,
      database: DB_NAMES.dev,
    }).replace("127.0.0.1", "localhost");
    const replaced = planEnvLocal(
      `DATABASE_URL="${oldLocal}"\nMIGRATION_DATABASE_URL=${oldLocal}\n`,
      urls,
    );
    if (replaced.kind !== "write") throw new Error("write 여야 한다");
    expect(replaced.text).toBe(
      `DATABASE_URL=${urls.DATABASE_URL}\nMIGRATION_DATABASE_URL=${urls.MIGRATION_DATABASE_URL}\n`,
    );

    // 예전 --port 실행이 남긴 로컬 momo_dev 주소는 포트가 달라도 우리 주소로 보고 바꾼다(검토 M-3)
    const oldPort = databaseUrl({
      password: "old",
      port: DEV_DB_PORT + 2,
      database: DB_NAMES.dev,
    });
    const movedPort = planEnvLocal(
      `DATABASE_URL=${oldPort}\nMIGRATION_DATABASE_URL=${oldPort}\n`,
      urls,
    );
    expect(movedPort).toEqual({
      kind: "write",
      text: `DATABASE_URL=${urls.DATABASE_URL}\nMIGRATION_DATABASE_URL=${urls.MIGRATION_DATABASE_URL}\n`,
    });
    // 원격 호스트의 momo_dev 는 다른 주소다
    expect(
      planEnvLocal(
        "DATABASE_URL=postgres://user:secret@db.example.com:5432/momo_dev\n",
        urls,
      ),
    ).toEqual({ kind: "other-address", keys: ["DATABASE_URL"] });

    // 이미 같은 값이면 쓰지 않는다
    expect(planEnvLocal(replaced.text, urls)).toEqual({ kind: "same" });

    // 다른 DB 주소(원격)가 하나라도 있으면 두 줄 모두 손대지 않는다
    expect(
      planEnvLocal(
        `DATABASE_URL=${otherRemote}\nMIGRATION_DATABASE_URL=\n`,
        urls,
      ),
    ).toEqual({ kind: "other-address", keys: ["DATABASE_URL"] });
    // 로컬이어도 개발용 포트가 아니면 다른 주소다
    const otherLocalPort = databaseUrl({
      password: "x",
      port: 5432,
      database: "mine",
    });
    expect(
      planEnvLocal(`MIGRATION_DATABASE_URL=${otherLocalPort}\n`, urls),
    ).toEqual({ kind: "other-address", keys: ["MIGRATION_DATABASE_URL"] });
    // 주소 꼴이 아니면 다른 주소로 보고 지키고, 주석 줄은 값으로 보지 않는다
    expect(planEnvLocal("DATABASE_URL=not a url\n", urls)).toEqual({
      kind: "other-address",
      keys: ["DATABASE_URL"],
    });
    const commented = planEnvLocal(`# DATABASE_URL=${otherRemote}\n`, urls);
    expect(commented.kind).toBe("write");
  });

  it("준비 줄은 표지 · 포트 · 시드 상태와 다음 할 일만 내고 접속 문자열 · 비밀번호를 내지 않는다", () => {
    const dev = readyLines({
      mode: "dev",
      port: DEV_DB_PORT,
      seed: "loaded",
      accessCodeHashSet: false,
      env: "write",
    });
    expect(dev[0]).toBe(`${READY_MARK} dev port=${DEV_DB_PORT} seed=loaded`);
    expect(dev.join("\n")).toContain("pnpm access:hash");
    expect(dev.join("\n")).toContain("pnpm dev");
    const kept = readyLines({
      mode: "dev",
      port: DEV_DB_PORT,
      seed: "kept",
      accessCodeHashSet: true,
      env: "other-address",
    });
    expect(kept[0]).toBe(`${READY_MARK} dev port=${DEV_DB_PORT} seed=kept`);
    expect(kept.join("\n")).not.toContain("pnpm access:hash");
    expect(kept.join("\n")).toContain("다른 DB 주소가 있어 고치지 않았어요");
    expect(
      readyLines({
        mode: "e2e",
        port: 54339,
        seed: "loaded",
        accessCodeHashSet: false,
        env: "same",
      }),
    ).toEqual([`${READY_MARK} e2e`]);
    for (const line of [...dev, ...kept]) {
      expect(line).not.toMatch(/postgres(ql)?:\/\//);
      expect(line).not.toContain(password);
    }
  });

  it("접속 문자열은 URL 속성으로 조립해 비밀번호의 특수 글자를 그대로 싣는다", () => {
    const url = new URL(
      databaseUrl({ password: "a/b@c:d", port: 54339, database: DB_NAMES.e2e }),
    );
    expect(decodeURIComponent(url.password)).toBe("a/b@c:d");
    expect(url.hostname).toBe("127.0.0.1");
    expect(url.port).toBe("54339");
    expect(url.pathname).toBe(`/${DB_NAMES.e2e}`);
  });

  it("오류 글은 이름 · 코드 · 메시지를 내고 비밀번호는 가린다", () => {
    const secret = "pw-0123456789abcdef";
    const error = Object.assign(
      new Error(`password authentication failed for ${secret} at ${secret}`),
      { name: "PostgresError", code: "28P01" },
    );
    const text = describeError(error, secret);
    expect(text).toBe(
      "PostgresError 28P01: password authentication failed for *** at ***",
    );
    expect(text).not.toContain(secret);
  });
});

describe("dev-db 자료 폴더", () => {
  it("--reset 은 켜 둔 인스턴스(postmaster.pid 의 pid 가 살아 있음)의 자료 폴더를 지우지 않게 막는다", () => {
    const alive = new Set([4242]);
    const isAlive = (pid: number) => alive.has(pid);
    // postmaster.pid 첫 줄이 pid, 그 뒤는 자료 폴더 · 시작 시각 · 포트 …
    expect(postmasterAlive("4242\n/data\n1760000000\n54331\n", isAlive)).toBe(
      true,
    );
    // 꺼진 뒤 남은 파일 · 파일 없음 · 꼴이 아님은 막지 않는다
    expect(postmasterAlive("5151\n/data\n", isAlive)).toBe(false);
    expect(postmasterAlive(null, isAlive)).toBe(false);
    expect(postmasterAlive("\n", isAlive)).toBe(false);
    expect(postmasterAlive("abc\n", isAlive)).toBe(false);
  });
});

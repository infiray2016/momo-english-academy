import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { CheckFileSchema } from "@/core/seed/schema/records";
import {
  cellLevel,
  roundCost,
  type SolveMessage,
  selectSolveTargets,
} from "@/core/seed/solve-check";
import {
  AREAS,
  type Area,
  checksFilePath,
  lessonFilePath,
  SEED_FILES,
} from "@/core/seed/structure";
import { collectCells } from "@/core/seed/validate";
import {
  baseUrlNotice,
  type CheckArgs,
  type CheckReport,
  type CheckStore,
  checkEnvironment,
  fileStore,
  PROBE_CELL,
  parseArgs,
  runCheck,
  runProbe,
  SOLVE_EFFORT,
  SOLVE_MODEL,
  SOLVE_THINKING,
  VIEWER_PATH,
} from "../../scripts/seed-check";
import {
  parseArgs as parseValidateArgs,
  readSeedTree,
  runValidate,
} from "../../scripts/seed-validate";
import {
  miniSeed,
  type SeedTree,
  seedTreeFiles,
  writeSeedTree,
} from "../fixtures/seed/builders";
import {
  FAKE_USAGE,
  fakeSolver,
  solveMessage,
} from "../fixtures/seed/fake-solver";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const TSX = join(REPO_ROOT, "node_modules/.bin/tsx");
const SCRIPT = join(REPO_ROOT, "scripts/seed-check.ts");
const TMP_ROOT = join(REPO_ROOT, "tests/.tmp");
const SPAWN_TIMEOUT_MS = 60_000;
/** 시험용 키 자리 값(실제 키 꼴이 아니다). 출력에 나오지 않는지 본다. */
const TEST_KEY = "test-only-placeholder-key-value";
const made: string[] = [];

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

function mini(areas: readonly Area[] = AREAS): SeedTree {
  return miniSeed({ areas, through: 1, frame: "small" });
}
/** 풀이 검사 기록을 뺀 시드 파일 묶음. */
function unsolved(areas: readonly Area[] = AREAS): Map<string, string> {
  const tree = mini(areas);
  tree.checks = [];
  return seedTreeFiles(tree);
}
/** 견본 단가 행이 효력을 가진 날의 시각(실행 시각은 인자). */
const NOW = (() => {
  const row = mini().reference.modelPrices.models.find(
    (m) => m.model === SOLVE_MODEL,
  );
  if (!row) throw new Error("견본 단가 행 없음");
  return new Date(`${row.effectiveFrom}T12:00:00.000Z`);
})();
const now = () => NOW;

function args(argv: string[] = []): CheckArgs {
  const parsed = parseArgs(argv);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.args;
}
function memory(files: Map<string, string>): CheckStore {
  return {
    read: (path) => files.get(path),
    write: (path, text) => {
      files.set(path, text);
    },
  };
}
function validate(argv: string[], files: ReadonlyMap<string, string>) {
  const parsed = parseValidateArgs(argv);
  if (!parsed.ok) throw new Error(parsed.error);
  return runValidate(parsed.args, files);
}
function tmpDir(): string {
  mkdirSync(TMP_ROOT, { recursive: true });
  const dir = mkdtempSync(join(TMP_ROOT, "seed-check-"));
  made.push(dir);
  return dir;
}
function spawn(argv: string[], env: Record<string, string>) {
  return spawnSync(TSX, [SCRIPT, ...argv], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: SPAWN_TIMEOUT_MS,
    env: { ...process.env, ...env },
  });
}
function reportOf(lines: string[]): CheckReport {
  return JSON.parse(lines.join("\n")) as CheckReport;
}
const SUMMARY =
  /^seed-check: 대상 \d+ · 푼 칸 \d+ · 통과 \d+ · 사람 확인 \d+ · 실패 \d+ · 건너뜀 \d+ · 남음 \d+ · 거절 \d+ · 호출 \d+ · 입력 \d+ · 출력 \d+ 토큰 · 비용 (?:\d+(?:\.\d+)?|-)달러$/;

describe("명령 seed:check", () => {
  it("AC-7d 명령: 기록 없는 시험용 시드를 가짜 풀이로 풀면 seed/checks 에 적히고 seed:validate --complete-through 1 이 API 없이 통과한다", async () => {
    const tree = mini();
    tree.checks = [];
    const dir = tmpDir();
    writeSeedTree(dir, tree);
    const files = readSeedTree(dir);
    if (!files) throw new Error("시드 없음");
    expect(validate(["--complete-through", "1"], files).code).toBe(1);
    const targets = selectSolveTargets(files, {}).targets;
    expect(targets.length).toBeGreaterThan(0);
    const solver = fakeSolver(files, { model: SOLVE_MODEL });
    const result = await runCheck(args(), {
      files,
      solver,
      now,
      store: fileStore(dir),
    });
    expect(result.code, result.lines.join("\n")).toBe(0);
    expect(result.lines[0]).toMatch(SUMMARY);
    expect(result.lines[0]).toContain(
      `대상 ${targets.length} · 푼 칸 ${targets.length} · 통과 ${targets.length} · 사람 확인 0 · 실패 0`,
    );
    expect(solver.calls).toHaveLength(targets.length);
    // 기록 파일: 내용 파일마다 checks/<경로>, P4a 쓰기 꼴(들여쓰기 2 + 줄바꿈), 임시 파일 없음
    const after = readSeedTree(dir);
    if (!after) throw new Error("시드 없음");
    const checkPaths = [...after.keys()].filter((p) => p.startsWith("checks/"));
    expect(checkPaths.sort()).toEqual(
      [...new Set(targets.map((c) => checksFilePath(c.file)))].sort(),
    );
    for (const path of checkPaths) {
      const text = after.get(path) ?? "";
      const file = CheckFileSchema.parse(JSON.parse(text));
      expect(text).toBe(`${JSON.stringify(file, null, 2)}\n`);
      for (const r of file.records) {
        expect(r.solve.model).toBe(SOLVE_MODEL);
        expect(r.solve.at).toBe(NOW.toISOString());
      }
    }
    const leftovers = readdirSync(join(dir, "checks"), {
      recursive: true,
    }).filter((name) => String(name).endsWith(".tmp"));
    expect(leftovers).toEqual([]);
    // CI 와 같은 길: 저장 결과만 읽고 통과(풀이 함수는 더 불리지 않는다)
    expect(validate(["--complete-through", "1"], after).code).toBe(0);
    expect(solver.calls).toHaveLength(targets.length);
    // 다시 돌리면 풀 칸이 없다(해시가 그대로)
    const again = await runCheck(args(), {
      files: after,
      solver,
      now,
      store: fileStore(dir),
    });
    expect(again.code).toBe(0);
    expect(again.lines[0]).toContain("대상 0 · 푼 칸 0");
    expect(solver.calls).toHaveLength(targets.length);
  });

  it("AC-7d 명령: 다르게 풀린 칸은 사람 확인 목록으로 나오고 종료 0 이며 seed:validate PR 모드는 그 칸으로 1 이다", async () => {
    const files = unsolved();
    const target = selectSolveTargets(files, {}).targets[0];
    if (!target) throw new Error("대상 없음");
    const solver = fakeSolver(files, {
      model: SOLVE_MODEL,
      behaviors: { [target.key]: { kind: "different" } },
    });
    const result = await runCheck(args(), {
      files,
      solver,
      now,
      store: memory(files),
    });
    expect(result.code).toBe(0);
    expect(result.lines[0]).toContain("사람 확인 1 · 실패 0");
    expect(result.lines).toContain(
      `사람 확인 ${target.key} ${VIEWER_PATH}?file=${encodeURIComponent(target.file)}&cell=${encodeURIComponent(target.key)}`,
    );
    const pr = validate([], files);
    expect(pr.code).toBe(1);
    expect(pr.lines).toContain(`사람 확인 ${target.key}`);
    expect(pr.lines.filter((l) => l.startsWith("사람 확인 "))).toHaveLength(1);
  });

  it("AC-7d 명령: CI 환경 변수가 있으면 풀지 않고 2 로 끝난다", () => {
    const env = { CI: "true", ANTHROPIC_API_KEY: TEST_KEY };
    for (const mode of ["solve", "probe"] as const) {
      const checked = checkEnvironment(env, mode);
      expect(checked.ok, mode).toBe(false);
      if (!checked.ok) {
        expect(checked.error).toContain("CI");
        expect(checked.error).not.toContain(TEST_KEY);
      }
    }
    // 미리 보기는 API 를 부르지 않으므로 CI 에서도 된다.
    expect(checkEnvironment(env, "dry-run").ok).toBe(true);
    expect(checkEnvironment({ ...env, CI: "" }, "solve").ok).toBe(true);
    // 직접 실행: CI 가 있으면 시드를 읽기 전에 2(키도 넘기지 않는다)
    const dir = tmpDir();
    const tree = mini(["reading"]);
    tree.checks = [];
    writeSeedTree(dir, tree);
    const result = spawn(["--root", dir], {
      CI: "true",
      ANTHROPIC_API_KEY: "",
    });
    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).toContain("CI");
    expect(result.stdout).toBe("");
    expect(
      readSeedTree(dir)?.has(checksFilePath(lessonFilePath("reading", 1, 1))),
    ).toBe(false);
    const dry = spawn(["--root", dir, "--dry-run"], {
      CI: "true",
      ANTHROPIC_API_KEY: "",
    });
    expect(dry.status, dry.stderr).toBe(0);
    expect(dry.stdout.split("\n")[0]).toMatch(SUMMARY);
  });

  it("명령: 키가 없거나 모르는 인자 · 뿌리 없음 · 단가 행 없음이면 2 이고 출력에 키 값이 없다", async () => {
    const noKey = checkEnvironment({ CI: "" }, "solve");
    expect(noKey.ok).toBe(false);
    if (!noKey.ok)
      expect(noKey.error).toContain("개발용 키(.env.local, H4)가 없다");
    expect(checkEnvironment({ ANTHROPIC_API_KEY: "" }, "probe").ok).toBe(false);
    for (const bad of [
      ["--nope"],
      ["--areas", "reading,music"],
      ["--levels", "0"],
      ["--levels", "3-2"],
      ["--levels", "13"],
      ["--concurrency", "0"],
      ["--concurrency", "9"],
      ["--max-calls", "0"],
      ["--max-calls", "two"],
      ["--file", "lessons/reading/1/9.json"],
      ["--file", SEED_FILES.settings],
      ["--root"],
      ["--probe", "--dry-run"],
    ]) {
      expect(parseArgs(bad).ok, bad.join(" ")).toBe(false);
    }
    const solver = fakeSolver(unsolved(), { model: SOLVE_MODEL });
    const deps = (files: Map<string, string> | null) => ({
      files,
      solver,
      now,
      store: memory(files ?? new Map()),
      secrets: [TEST_KEY],
    });
    expect((await runCheck(args(), deps(null))).code).toBe(2);
    const cases: [string, (files: Map<string, string>) => void][] = [
      ["단가 파일 없음", (f) => f.delete(SEED_FILES.modelPrices)],
      ["단가 파일 JSON 아님", (f) => f.set(SEED_FILES.modelPrices, "{ nope")],
      ["규격 파일 없음", (f) => f.delete(SEED_FILES.vocab)],
      [
        "단가 행 없음",
        (f) => {
          const prices = JSON.parse(f.get(SEED_FILES.modelPrices) ?? "{}") as {
            models: { model: string }[];
          };
          prices.models = prices.models.filter((m) => m.model !== SOLVE_MODEL);
          f.set(SEED_FILES.modelPrices, JSON.stringify(prices));
        },
      ],
      [
        "조합 안 받음",
        (f) => {
          const prices = JSON.parse(f.get(SEED_FILES.modelPrices) ?? "{}") as {
            models: { model: string; thinkingOffEfforts: string[] }[];
          };
          for (const m of prices.models)
            if (m.model === SOLVE_MODEL) m.thinkingOffEfforts = ["medium"];
          f.set(SEED_FILES.modelPrices, JSON.stringify(prices));
        },
      ],
    ];
    for (const [label, change] of cases) {
      const files = unsolved();
      change(files);
      const result = await runCheck(args(), deps(files));
      expect(result.code, label).toBe(2);
      expect(result.lines.join("\n"), label).not.toContain(TEST_KEY);
    }
    // --file 이 시드에 없는 파일이거나 --areas 밖이면 2(검토 M-2)
    const notInSeed = await runCheck(
      args(["--file", lessonFilePath("reading", 4, 2)]),
      deps(unsolved()),
    );
    expect(notInSeed.code).toBe(2);
    expect(notInSeed.lines[0]).toContain("시드에 없다");
    const outsideAreas = await runCheck(
      args(["--areas", "writing", "--file", lessonFilePath("reading", 1, 1)]),
      deps(unsolved()),
    );
    expect(outsideAreas.code).toBe(2);
    expect(outsideAreas.lines[0]).toContain("--areas 밖");
    expect(solver.calls).toHaveLength(0);
    // API 오류 글에 키가 섞여 와도 출력에는 내지 않는다.
    const files = unsolved(["reading"]);
    const first = selectSolveTargets(files, {}).targets[0];
    if (!first) throw new Error("대상 없음");
    const leaky = fakeSolver(files, {
      model: SOLVE_MODEL,
      behaviors: {
        [first.key]: {
          kind: "api-error",
          status: 401,
          message: `invalid x-api-key ${TEST_KEY}`,
        },
      },
    });
    const leaked = await runCheck(args(["--json"]), {
      ...deps(files),
      solver: leaky,
    });
    expect(leaked.code).toBe(1);
    expect(leaked.lines.join("\n")).not.toContain(TEST_KEY);
    const failedCell = reportOf(leaked.lines).cells.find(
      (c) => c.cell === first.key,
    );
    expect(failedCell?.status).toBe("failed");
    expect(failedCell?.reason).toContain("401");
    // 직접 실행: 키가 없으면 2
    const result = spawn(["--root", tmpDir()], {
      CI: "",
      ANTHROPIC_API_KEY: "",
    });
    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).toContain("개발용 키(.env.local, H4)가 없다");
    const missing = spawn(
      ["--root", join(TMP_ROOT, "no-such-seed-root"), "--dry-run"],
      {
        CI: "",
        ANTHROPIC_API_KEY: "",
      },
    );
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain("seed-check:");
  });

  it("명령: 규격 파일(vocab)이 규격에 맞지 않으면 2 로 끝나고 풀이 함수를 부르지 않으며 checks 를 쓰지 않는다", async () => {
    const files = unsolved();
    const vocab = JSON.parse(files.get(SEED_FILES.vocab) ?? "{}") as {
      vocab: Record<string, unknown>[];
    };
    const entry = vocab.vocab[0];
    if (!entry) throw new Error("vocab 없음");
    entry.unknownField = true;
    files.set(SEED_FILES.vocab, JSON.stringify(vocab));
    const solver = fakeSolver(unsolved(), { model: SOLVE_MODEL });
    for (const argv of [[], ["--dry-run"], ["--json"]]) {
      const result = await runCheck(args(argv), {
        files,
        solver,
        now,
        store: memory(files),
      });
      expect(result.code, argv.join(" ")).toBe(2);
      expect(result.lines[0]).toMatch(
        /^seed-check: 규격 파일 오류 [1-9]\d*건 — pnpm seed:validate 로 먼저 고친다$/,
      );
    }
    expect(solver.calls).toHaveLength(0);
    expect([...files.keys()].some((p) => p.startsWith("checks/"))).toBe(false);
  });

  it("명령: 기록 파일이 깨진 칸은 부르지 않고 실패로 센다", async () => {
    const files = unsolved(["reading"]);
    const notJson = checksFilePath(lessonFilePath("reading", 1, 1));
    const badShape = checksFilePath(lessonFilePath("reading", 1, 2));
    files.set(notJson, "{ not json");
    files.set(badShape, JSON.stringify({ records: "none" }));
    const picked = selectSolveTargets(files, {}).targets;
    const broken = picked.filter(
      (c) =>
        checksFilePath(c.file) === notJson ||
        checksFilePath(c.file) === badShape,
    );
    expect(broken.length).toBeGreaterThan(0);
    const solver = fakeSolver(files, { model: SOLVE_MODEL });
    const result = await runCheck(args(["--json"]), {
      files,
      solver,
      now,
      store: memory(files),
    });
    expect(result.code).toBe(1);
    const report = reportOf(result.lines);
    expect(report.summary.failed).toBe(broken.length);
    expect(report.summary.calls).toBe(picked.length - broken.length);
    const called = new Set(solver.calls.map((r) => r.cell));
    for (const cell of broken) {
      expect(called.has(cell.key)).toBe(false);
      const row = report.cells.find((c) => c.cell === cell.key);
      expect(row?.status).toBe("failed");
      expect(row?.reason).toMatch(/^기록 파일이 깨졌다/);
    }
    // 깨진 파일은 덮어쓰지 않는다.
    expect(files.get(notJson)).toBe("{ not json");
    expect(files.get(badShape)).toBe(JSON.stringify({ records: "none" }));
  });

  it("명령: --dry-run 은 풀이 함수를 부르지 않고 대상 칸 수를 낸다", async () => {
    const files = unsolved();
    const picked = selectSolveTargets(files, {}).targets;
    const solver = fakeSolver(files, { model: SOLVE_MODEL });
    const dry = await runCheck(args(["--dry-run"]), {
      files,
      solver,
      now,
      store: memory(files),
    });
    expect(dry.code).toBe(0);
    expect(dry.lines[0]).toMatch(SUMMARY);
    expect(dry.lines[0]).toContain(`대상 ${picked.length} · 푼 칸 0`);
    expect(dry.lines[0]).toContain("호출 0");
    expect(dry.lines[0]).toMatch(/비용 -달러$/);
    expect(solver.calls).toHaveLength(0);
    expect([...files.keys()].some((p) => p.startsWith("checks/"))).toBe(false);
    const json = reportOf(
      (
        await runCheck(args(["--dry-run", "--json"]), {
          files,
          solver,
          now,
          store: memory(files),
        })
      ).lines,
    );
    expect(json.mode).toBe("dry-run");
    expect(json.summary.targets).toBe(picked.length);
    expect(json.summary.costUsd).toBeNull();
    expect(json.cells.map((c) => c.cell)).toEqual(picked.map((c) => c.key));
    expect(json.cells.every((c) => c.status === "planned")).toBe(true);
    // 기록이 있으면 칸당 평균 비용 × 대상 칸 수로 어림한다.
    const file = lessonFilePath("reading", 1, 1);
    const part = await runCheck(args(["--file", file]), {
      files,
      solver,
      now,
      store: memory(files),
    });
    expect(part.code).toBe(0);
    const solved = solver.calls.length;
    const records = collectCells(files).records;
    const costs = [...records.values()].map((r) => r.solve.costUsd);
    expect(costs).toHaveLength(solved);
    const rest = selectSolveTargets(files, {}).targets.length;
    const estimate = reportOf(
      (
        await runCheck(args(["--dry-run", "--json"]), {
          files,
          solver,
          now,
          store: memory(files),
        })
      ).lines,
    );
    expect(estimate.summary.targets).toBe(rest);
    expect(estimate.summary.costUsd).toBe(
      roundCost((costs.reduce((a, b) => a + b, 0) / costs.length) * rest),
    );
    expect(solver.calls).toHaveLength(solved);
  });

  it("명령: --areas · --levels · --file 로 대상을 거르고 --max-calls 에서 멈춘다", async () => {
    const run = async (argv: string[]) => {
      const files = unsolved();
      const solver = fakeSolver(files, { model: SOLVE_MODEL });
      const result = await runCheck(args(argv), {
        files,
        solver,
        now,
        store: memory(files),
      });
      return { files, solver, result };
    };
    const reading = await run(["--areas", "reading"]);
    const readingTargets = selectSolveTargets(unsolved(), {
      areas: ["reading"],
    }).targets;
    expect(reading.result.code).toBe(0);
    expect(reading.solver.calls.length).toBe(readingTargets.length);
    expect(reading.solver.calls.every((r) => r.area === "reading")).toBe(true);
    const level = await run(["--levels", "2-3"]);
    expect(level.solver.calls.length).toBeGreaterThan(0);
    expect(level.solver.calls.every((r) => r.level >= 2 && r.level <= 3)).toBe(
      true,
    );
    expect(level.solver.calls.length).toBe(
      selectSolveTargets(unsolved(), { levels: { min: 2, max: 3 } }).targets
        .length,
    );
    const path = lessonFilePath("writing", 1, 1);
    const one = await run(["--file", path]);
    const inFile = collectCells(one.files).cells.filter((c) => c.file === path);
    expect(one.solver.calls.map((r) => r.cell)).toEqual(
      selectSolveTargets(unsolved(), { file: path }).targets.map((c) => c.key),
    );
    expect(
      one.solver.calls.every((r) => inFile.some((c) => c.key === r.cell)),
    ).toBe(true);
    expect(
      [...one.files.keys()].filter((p) => p.startsWith("checks/")),
    ).toEqual([checksFilePath(path)]);
    const total = selectSolveTargets(unsolved(), {}).targets.length;
    const capped = await run(["--max-calls", "3", "--json"]);
    expect(capped.result.code).toBe(1);
    expect(capped.solver.calls).toHaveLength(3);
    const report = reportOf(capped.result.lines);
    expect(report.summary.calls).toBe(3);
    expect(report.summary.solved).toBe(3);
    expect(report.summary.remaining).toBe(total - 3);
    expect(report.cells.filter((c) => c.status === "remaining")).toHaveLength(
      total - 3,
    );
    // 단계 거르기는 칸 키의 단계(토리 이야기는 구간 첫 단계)로 본다.
    for (const r of level.solver.calls) expect(cellLevel(r.cell)).toBe(r.level);
  });

  it("명령: 풀지 못한 칸이 있으면 1 이고 다시 돌리면 그 칸만 푼다", async () => {
    const files = unsolved(["reading", "speaking"]);
    const [a, b, c, d, e] = selectSolveTargets(files, {}).targets;
    if (!a || !b || !c || !d || !e) throw new Error("대상 없음");
    const solver = fakeSolver(files, {
      model: SOLVE_MODEL,
      behaviors: {
        [a.key]: { kind: "api-error", status: 529 },
        [b.key]: { kind: "max_tokens" },
        [c.key]: { kind: "refusal" },
        [d.key]: { kind: "missing-item" },
        [e.key]: { kind: "broken" },
      },
    });
    const first = await runCheck(args(), {
      files,
      solver,
      now,
      store: memory(files),
    });
    expect(first.code).toBe(1);
    expect(first.lines[0]).toContain("실패 4");
    expect(first.lines[0]).toContain("거절 1");
    expect(
      first.lines.some((l) => l.startsWith(`실패 ${a.key} API 오류`)),
    ).toBe(true);
    expect(first.lines).toContain(`실패 ${b.key} stop_reason max_tokens`);
    expect(first.lines.some((l) => l.startsWith(`실패 ${d.key} `))).toBe(true);
    // 규격 깨짐(검토 M-4)은 기록 없는 실패다.
    expect(
      first.lines.some((l) =>
        l.startsWith(`실패 ${e.key} 응답이 규격에 맞지 않는다`),
      ),
    ).toBe(true);
    expect(collectCells(files).records.has(e.key)).toBe(false);
    // 거절은 답 없음으로 적혀 사람 확인으로 간다(정할 것 라).
    expect(first.lines.some((l) => l.startsWith(`사람 확인 ${c.key} `))).toBe(
      true,
    );
    // 다음에 풀 칸은 실패한 칸뿐이다(기록을 쓰지 않았다).
    const report = reportOf(
      (
        await runCheck(args(["--dry-run", "--json"]), {
          files,
          solver,
          now,
          store: memory(files),
        })
      ).lines,
    );
    expect(report.cells.map((x) => x.cell).sort()).toEqual(
      [a.key, b.key, d.key, e.key].sort(),
    );
    const calls = solver.calls.length;
    solver.behaviors.clear();
    const second = await runCheck(args(), {
      files,
      solver,
      now,
      store: memory(files),
    });
    expect(second.code).toBe(0);
    expect(solver.calls.slice(calls).map((r) => r.cell)).toEqual([
      a.key,
      b.key,
      d.key,
      e.key,
    ]);
    // 실패한 칸이 다시 풀릴 때 앞서 쓴 칸의 기록은 그대로다(다시 읽고 그 칸만 바꾼다).
    const records = collectCells(files).records;
    expect(
      records.get(c.key)?.solve.items.every((i) => i.verdict === "none"),
    ).toBe(true);
    expect(records.size).toBe(
      selectSolveTargets(files, { force: true }).targets.length,
    );
  });

  it("명령: 첫 줄 요약 꼴과 --json 보고 꼴(version 1)", async () => {
    const files = unsolved(["reading", "writing"]);
    const solver = fakeSolver(files, { model: SOLVE_MODEL });
    const human = await runCheck(args(["--areas", "reading,writing"]), {
      files: new Map(files),
      solver,
      now,
      store: memory(new Map(files)),
    });
    expect(human.lines[0]).toMatch(SUMMARY);
    const calls = solver.calls.length;
    const tokens =
      calls *
      (FAKE_USAGE.input_tokens +
        (FAKE_USAGE.cache_creation_input_tokens ?? 0) +
        (FAKE_USAGE.cache_read_input_tokens ?? 0));
    expect(human.lines[0]).toContain(
      `호출 ${calls} · 입력 ${tokens} · 출력 ${calls * FAKE_USAGE.output_tokens} 토큰`,
    );
    // 동시 호출을 올려도 결과 차례는 대상 차례다.
    const json = await runCheck(
      args(["--areas", "reading,writing", "--json", "--concurrency", "4"]),
      { files, solver, now, store: memory(files) },
    );
    const report = reportOf(json.lines);
    expect(Object.keys(report).sort()).toEqual(
      [
        "version",
        "mode",
        "model",
        "effort",
        "thinking",
        "filter",
        "summary",
        "cells",
      ].sort(),
    );
    expect(report.version).toBe(1);
    expect(report.mode).toBe("solve");
    expect(report.model).toBe(SOLVE_MODEL);
    expect(report.effort).toBe(SOLVE_EFFORT);
    expect(report.thinking).toBe(SOLVE_THINKING.type);
    expect(report.filter).toEqual({
      areas: ["reading", "writing"],
      levels: null,
      file: null,
    });
    expect(Object.keys(report.summary).sort()).toEqual(
      [
        "targets",
        "solved",
        "passed",
        "pendingHuman",
        "failed",
        "skipped",
        "remaining",
        "refused",
        "calls",
        "inputTokens",
        "outputTokens",
        "costUsd",
      ].sort(),
    );
    expect(report.cells.map((c) => c.cell)).toEqual(
      solver.calls.slice(0, calls).map((r) => r.cell),
    );
    for (const cell of report.cells) {
      expect(cell.status).toBe("passed");
      expect(cell.file).toBe(
        collectCells(files).cells.find((c) => c.key === cell.cell)?.file,
      );
      expect(cell.verdicts?.every((v) => v.verdict === "same")).toBe(true);
    }
    // --probe 첫 줄(SDK 대신 시험 응답): 모델 · stop_reason · 토큰 · 판단
    const probe = await runProbe(args(["--probe"]), {
      files,
      now,
      solver: async (request) => {
        const answerNo = (PROBE_CELL.value as { answerNo: number }).answerNo;
        const message: SolveMessage = solveMessage(
          {
            items: request.items.map((i) => ({
              no: i.no,
              status: "one",
              choice: answerNo,
              text: null,
              alternatives: [],
            })),
          },
          { model: SOLVE_MODEL },
        );
        return message;
      },
    });
    expect(probe.code).toBe(0);
    expect(probe.lines[0]).toMatch(
      /^seed-check probe: 모델 \S+ · stop_reason end_turn · 입력 \d+ · 출력 \d+ 토큰 · 판단 same · 비용 [\d.]+달러$/,
    );
    const broken = await runProbe(args(["--probe"]), {
      files: null,
      now,
      solver: async () => {
        throw Object.assign(new Error("bad request"), { status: 400 });
      },
    });
    expect(broken.code).toBe(1);
    expect(broken.lines[0]).toContain("400");
    // ANTHROPIC_BASE_URL 이 있으면 풀이 · --probe 때 호스트만 표준 오류로 알린다(검토 범위 밖 관찰 1 · 재검토 N-1).
    const base = "https://user:secret@proxy.example.test:8443/v1?token=abc";
    expect(baseUrlNotice({ ANTHROPIC_BASE_URL: base }, "solve")).toBe(
      "seed-check: 주소 proxy.example.test:8443",
    );
    expect(baseUrlNotice({ ANTHROPIC_BASE_URL: base }, "probe")).toBe(
      "seed-check: 주소 proxy.example.test:8443",
    );
    expect(baseUrlNotice({ ANTHROPIC_BASE_URL: "not a url" }, "solve")).toBe(
      "seed-check: 주소 꼴이 아닌 값",
    );
    expect(baseUrlNotice({ ANTHROPIC_BASE_URL: base }, "dry-run")).toBeNull();
    expect(baseUrlNotice({ ANTHROPIC_BASE_URL: "" }, "solve")).toBeNull();
    expect(baseUrlNotice({}, "probe")).toBeNull();
  });
});

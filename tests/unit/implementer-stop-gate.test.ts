import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// TypeScript 는 '.mjs' 를 '.mts' 로 풀고 Vite 도 푼다(확장자 없음은 TS2307, '.mts' 는 TS5097).
import {
  BIOME_BIN,
  COMMAND_TIMEOUT_MS,
  COMMANDS,
  type CommandResult,
  childEnv,
  type Decision,
  decide,
  formatLogLine,
  type Runner,
  resolveNodeBinDir,
  runGate,
  TAIL_LINES,
  VITEST_BIN,
  writeDecision,
} from "../../.claude/hooks/implementer-stop-gate.mjs";

const CWD = "/work/momo";

type Call = { bin: string; args: string[]; cwd: string; timeoutMs: number };

// 진짜 vitest 를 다시 돌리면 이 시험이 끝없이 돈다. 명령 실행은 언제나 가짜다.
function fakeRun(results: Record<string, CommandResult>) {
  const calls: Call[] = [];
  const run: Runner = (bin, args, opts) => {
    calls.push({ bin, args, ...opts });
    return results[bin] ?? { code: 0, output: "" };
  };
  return { run, calls };
}

const allBinsExist = () => true;
const input = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    cwd: CWD,
    stop_hook_active: false,
    agent_id: "agent-1",
    agent_type: "implementer",
    last_assistant_message: "DONE\n시험 12개 통과",
    ...overrides,
  });

describe("구현자 끝내기 관문", () => {
  it("구현자 끝내기 관문: 린트와 단위 시험이 모두 통과하면 허락한다", () => {
    const { run, calls } = fakeRun({});
    const decision = decide(input(), { run, exists: allBinsExist });
    expect(decision.exitCode).toBe(0);
    expect(decision.allow).toBe(true);
    expect(decision.stderr).toBe("");
    expect(calls.map((c) => [c.bin, c.args])).toEqual([
      [BIOME_BIN, ["ci", "--colors=off", "."]],
      [VITEST_BIN, ["run", "--project", "unit"]],
    ]);
  });

  it("구현자 끝내기 관문: 린트가 실패하면 2 로 막고 실패 출력 끝부분을 낸다", () => {
    const output = Array.from(
      { length: 100 },
      (_, i) => `biome line ${i + 1}`,
    ).join("\n");
    const { run, calls } = fakeRun({ [BIOME_BIN]: { code: 1, output } });
    const decision = decide(input(), { run, exists: allBinsExist });
    expect(decision.exitCode).toBe(2);
    expect(decision.allow).toBe(false);
    expect(decision.stderr.split("\n")[0]).toContain("끝내기 전에 고칠 것");
    expect(decision.stderr).toContain("biome line 100");
    expect(decision.stderr).toContain(`biome line ${100 - TAIL_LINES + 1}`);
    expect(decision.stderr).not.toContain(`biome line ${100 - TAIL_LINES}\n`);
    // 린트가 실패해도 단위 시험까지 돌려 실패를 한 번에 알린다.
    expect(calls).toHaveLength(2);
  });

  it("구현자 끝내기 관문: 단위 시험이 실패하면 막는다", () => {
    const { run } = fakeRun({
      [VITEST_BIN]: { code: 1, output: "FAIL tests/unit/x.test.ts" },
    });
    const decision = decide(input(), { run, exists: allBinsExist });
    expect(decision.exitCode).toBe(2);
    expect(decision.stderr).toContain("FAIL tests/unit/x.test.ts");
    expect(decision.stderr).toContain(VITEST_BIN);
    expect(decision.stderr).not.toContain(`${BIOME_BIN} ci`);

    // 시간 초과(종료 코드 없음)도 실패다.
    const timedOut = fakeRun({ [VITEST_BIN]: { code: null, output: "" } });
    expect(
      decide(input(), { run: timedOut.run, exists: allBinsExist }).exitCode,
    ).toBe(2);
  });

  it("구현자 끝내기 관문: 첫 줄이 NEEDS_CONTEXT · BLOCKED 면 허락한다", () => {
    for (const message of [
      "NEEDS_CONTEXT\n브리프의 설정 키가 없다",
      "\n\n  BLOCKED: fix 라운드 3회",
    ]) {
      const { run, calls } = fakeRun({
        [VITEST_BIN]: { code: 1, output: "FAIL" },
      });
      const decision = decide(input({ last_assistant_message: message }), {
        run,
        exists: allBinsExist,
      });
      expect(decision.exitCode).toBe(0);
      expect(calls).toHaveLength(0);
    }
    for (const message of [
      "DONE_WITH_CONCERNS\nBLOCKED 는 아니다",
      "상태: BLOCKED",
      "",
    ]) {
      const { run } = fakeRun({ [VITEST_BIN]: { code: 1, output: "FAIL" } });
      expect(
        decide(input({ last_assistant_message: message }), {
          run,
          exists: allBinsExist,
        }).exitCode,
      ).toBe(2);
    }
  });

  it("구현자 끝내기 관문: node_modules 가 없으면 막고 pnpm install 을 알린다", () => {
    const { run, calls } = fakeRun({});
    const checked: string[] = [];
    const decision = runGate({
      cwd: CWD,
      run,
      exists: (path) => {
        checked.push(path);
        return !path.endsWith("vitest");
      },
    });
    expect(decision.exitCode).toBe(2);
    expect(decision.stderr).toContain("pnpm install 을 먼저 하세요");
    expect(calls).toHaveLength(0);
    expect(checked).toEqual([`${CWD}/${BIOME_BIN}`, `${CWD}/${VITEST_BIN}`]);
  });

  it("구현자 끝내기 관문: 입력의 cwd 에서 명령을 돈다", () => {
    const { run, calls } = fakeRun({});
    const decision = decide(input({ cwd: "/elsewhere/worktree" }), {
      run,
      exists: allBinsExist,
    });
    expect(decision.cwd).toBe("/elsewhere/worktree");
    expect(calls.map((c) => c.cwd)).toEqual([
      "/elsewhere/worktree",
      "/elsewhere/worktree",
    ]);
    expect(calls.every((c) => c.timeoutMs === COMMAND_TIMEOUT_MS)).toBe(true);
  });

  it("구현자 끝내기 관문: 입력 JSON 이 깨지면 막는다", () => {
    for (const raw of [
      "{not json",
      "",
      "[]",
      JSON.stringify({ agent_id: "x" }),
    ]) {
      const { run, calls } = fakeRun({});
      const decision = decide(raw, { run, exists: allBinsExist });
      expect(decision.exitCode).toBe(2);
      expect(decision.allow).toBe(false);
      expect(calls).toHaveLength(0);
    }
  });

  it("구현자 끝내기 관문: 로그 한 줄에 시각 · agent_id · 허락/막음 · 까닭을 적는다", () => {
    const { run } = fakeRun({ [BIOME_BIN]: { code: 1, output: "x\ny" } });
    const decision = decide(input({ stop_hook_active: true }), {
      run,
      exists: allBinsExist,
    });
    const line = formatLogLine(new Date("2026-10-16T03:00:00.000Z"), decision);
    expect(line).toBe(
      "2026-10-16T03:00:00.000Z\tagent-1\timplementer\tstop_hook_active=true\t막음\tbiome ci 실패\t-\n",
    );
    expect(line.trimEnd().includes("\n")).toBe(false);
    const withBin = formatLogLine(new Date("2026-10-16T03:00:00.000Z"), {
      ...decision,
      nodeBinDir: "/home/u/.nvm/versions/node/v24.22.0/bin",
    });
    expect(withBin.trimEnd().split("\t").at(-1)).toBe(
      "/home/u/.nvm/versions/node/v24.22.0/bin",
    );
  });

  it("구현자 끝내기 관문: .nvmrc 판 가운데 가장 높은 설치 판의 bin 을 PATH 앞에 붙인다", () => {
    const binDir = (nvmrc: string) =>
      resolveNodeBinDir(fakeNvm({ nvmrc, versions: INSTALLED }));
    expect(binDir("24\n")).toBe(`${NVM}/versions/node/v24.22.0/bin`);
    expect(binDir("v24.16")).toBe(`${NVM}/versions/node/v24.16.0/bin`);
    expect(binDir(" 26.8.2 ")).toBe(`${NVM}/versions/node/v26.8.2/bin`);
    const env = childEnv({ PATH: "/usr/bin:/bin" }, binDir("24"));
    expect(env.PATH?.split(":")[0]).toBe(`${NVM}/versions/node/v24.22.0/bin`);
    expect(env.PATH).toBe(`${NVM}/versions/node/v24.22.0/bin:/usr/bin:/bin`);
    // NVM_DIR 가 없으면 HOME 아래 .nvm 을 본다.
    expect(
      resolveNodeBinDir(
        fakeNvm({ nvmrc: "24", versions: INSTALLED, env: { HOME: "/home/u" } }),
      ),
    ).toBe("/home/u/.nvm/versions/node/v24.22.0/bin");
  });

  it("구현자 끝내기 관문: .nvmrc 가 없거나 숫자 꼴이 아니면 PATH 를 그대로 둔다", () => {
    for (const nvmrc of [undefined, "lts/*", "node", ""]) {
      const binDir = resolveNodeBinDir(fakeNvm({ nvmrc, versions: INSTALLED }));
      expect(binDir).toBeNull();
      expect(childEnv({ PATH: "/usr/bin:/bin" }, binDir).PATH).toBe(
        "/usr/bin:/bin",
      );
    }
    // HOME · NVM_DIR 이 없거나 nvm 폴더가 없어도 그대로다.
    expect(
      resolveNodeBinDir(fakeNvm({ nvmrc: "24", versions: INSTALLED, env: {} })),
    ).toBeNull();
    expect(
      resolveNodeBinDir(fakeNvm({ nvmrc: "24", versions: undefined })),
    ).toBeNull();
  });

  it("구현자 끝내기 관문: 맞는 판이 없으면 PATH 를 그대로 둔다", () => {
    const binDir = resolveNodeBinDir(
      fakeNvm({ nvmrc: "20", versions: INSTALLED }),
    );
    expect(binDir).toBeNull();
    expect(childEnv({ PATH: "/usr/bin" }, binDir).PATH).toBe("/usr/bin");
  });

  it("구현자 끝내기 관문: 하위 명령 환경에 NO_COLOR 가 있다", () => {
    for (const binDir of [null, `${NVM}/versions/node/v24.22.0/bin`]) {
      const env = childEnv({ PATH: "/usr/bin", HOME: "/home/u" }, binDir);
      expect(env.NO_COLOR).toBe("1");
      expect(env.FORCE_COLOR).toBe("0");
      expect(env.HOME).toBe("/home/u");
    }
  });

  it("구현자 끝내기 관문: 명령 상한 합이 훅 timeout 안이다", () => {
    const agent = readFileSync(
      new URL("../../.claude/agents/implementer.md", import.meta.url),
      "utf8",
    );
    const timeout = /timeout:\s*(\d+)/.exec(agent)?.[1];
    expect(timeout).toBeDefined();
    expect(COMMAND_TIMEOUT_MS * COMMANDS.length + 30_000).toBeLessThanOrEqual(
      Number(timeout) * 1000,
    );
  });

  it("구현자 끝내기 관문: 막을 때 stdout 이 비지 않는다", () => {
    const blocked = [
      decide("{not json", { run: fakeRun({}).run, exists: allBinsExist }),
      decide(input(), {
        run: fakeRun({ [VITEST_BIN]: { code: 1, output: "FAIL x" } }).run,
        exists: allBinsExist,
      }),
    ];
    for (const decision of blocked) {
      const { out, err } = capture(decision);
      expect(decision.exitCode).toBe(2);
      expect(out.split("\n").filter(Boolean)).toHaveLength(1);
      expect(err).toContain(decision.stderr);
      expect(err.trim()).not.toBe("");
    }
    const allowed = capture(
      decide(input(), { run: fakeRun({}).run, exists: allBinsExist }),
    );
    expect(allowed).toEqual({ out: "", err: "" });
  });

  it("구현자 끝내기 관문: 실패 출력에 no such file 이 있어도 막는다", () => {
    const enoent =
      "Error: ENOENT: no such file or directory, open 'tests/fixtures/x.json'";
    const decision = decide(input(), {
      run: fakeRun({ [VITEST_BIN]: { code: 1, output: enoent } }).run,
      exists: allBinsExist,
    });
    expect(decision.exitCode).toBe(2);
    const { out, err } = capture(decision);
    expect(out.split("\n").filter(Boolean)).toHaveLength(1);
    expect(err).toContain(enoent);
  });
});

const NVM = "/opt/nvm";
const INSTALLED = ["v22.23.1", "v24.16.0", "v24.22.0", "v26.8.2", ".cache"];

// 진짜 파일 시스템을 쓰지 않는 가짜 nvm.
function fakeNvm(opts: {
  nvmrc: string | undefined;
  versions: string[] | undefined;
  env?: Record<string, string | undefined>;
}) {
  const nvmDir = opts.env ? opts.env.NVM_DIR : NVM;
  const home = opts.env ? opts.env.HOME : "/home/u";
  const root = nvmDir ?? (home ? `${home}/.nvm` : "");
  return {
    cwd: CWD,
    env: opts.env ?? { NVM_DIR: NVM, HOME: "/home/u" },
    readFile: (path: string) => {
      if (path === `${CWD}/.nvmrc` && opts.nvmrc !== undefined) {
        return opts.nvmrc;
      }
      throw new Error(`ENOENT ${path}`);
    },
    readdir: (path: string) => {
      if (path === `${root}/versions/node` && opts.versions) {
        return opts.versions;
      }
      throw new Error(`ENOENT ${path}`);
    },
    exists: (path: string) =>
      (opts.versions ?? []).some(
        (v) => path === `${root}/versions/node/${v}/bin/node`,
      ),
  };
}

function capture(decision: Decision) {
  let out = "";
  let err = "";
  writeDecision(
    decision,
    { write: (text) => (out += text) },
    { write: (text) => (err += text) },
  );
  return { out, err };
}

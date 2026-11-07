// 구현자 끝내기 관문(그래프 엔지니어링 F3, plan-p01b 파일별 값 5).
// implementer 서브에이전트가 끝나려 하면 biome ci 와 단위 시험을 다시 돌려, 실패면 끝내지 못하게 한다.
// SubagentStop 훅으로 돈다. 종료 코드 0 은 허락, 2 는 막음(stderr 가 서브에이전트의 다음 지시가 된다).
// 0 · 2 밖의 종료 코드는 Claude Code 가 막지 않는 오류로 다루므로, 관문 자체 오류도 2 로 끝낸다.
// Node 24 가 타입을 지우고 바로 돈다. `.mts` 라 package.json 의 type 과 무관하게 ESM 으로 읽힌다(typeless 경고 없음).
// node:* 만 쓰고 외부 패키지가 없다. pnpm 을 거치지 않는다.
// 하위 명령(node_modules/.bin 의 셸 shim)은 PATH 의 node 를 부르므로, .nvmrc 판 가운데 가장 높은 설치 판의 bin 을 PATH 앞에 붙인다
// (node_modules 를 설치한 `nvm use` 가 고르는 판과 같다. 아키텍처로 거르거나 탐침하지 않는다).
import { spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** 명령마다 기다리는 시간. 두 명령 합 240초 + 여유가 훅 timeout 300초 안. */
export const COMMAND_TIMEOUT_MS = 120_000;
/** 실패한 명령마다 stderr 에 내는 끝 줄 수. */
export const TAIL_LINES = 60;
/** 판단마다 한 줄씩 더하는 기록(입력 cwd 기준, .gitignore 에 있다). */
export const LOG_PATH = ".claude/state/implementer-stop-gate.log";
export const BIOME_BIN = "node_modules/.bin/biome";
export const VITEST_BIN = "node_modules/.bin/vitest";
/** 답장 첫 줄이 이것으로 시작하면 관문 없이 끝낸다(컨트롤러가 요청자에게 올리는 신호, C51 나). */
export const ESCAPE_STATUSES = ["NEEDS_CONTEXT", "BLOCKED"] as const;
const OUTPUT_MAX_BYTES = 64 * 1024 * 1024;

/** nvm 이 판을 두는 곳(NVM_DIR 또는 ~/.nvm 아래). */
export const NVM_VERSIONS_DIR = "versions/node";
const NVMRC_VERSION = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/;
const INSTALLED_VERSION = /^v(\d+)\.(\d+)\.(\d+)$/;

export const COMMANDS = [
  { label: "biome ci", bin: BIOME_BIN, args: ["ci", "--colors=off", "."] },
  { label: "vitest", bin: VITEST_BIN, args: ["run", "--project", "unit"] },
] as const;

export type CommandResult = { code: number | null; output: string };
export type Runner = (
  bin: string,
  args: string[],
  opts: { cwd: string; timeoutMs: number },
) => CommandResult;
export type Exists = (path: string) => boolean;

export type GateInput = {
  cwd: string;
  stopHookActive: boolean;
  agentId: string;
  agentType: string;
  lastAssistantMessage: string;
};

export type Decision = {
  exitCode: 0 | 2;
  allow: boolean;
  /** 로그 한 줄에 들어갈 짧은 까닭. */
  reason: string;
  /** 막을 때 서브에이전트에게 갈 글. 허락이면 빈 글. */
  stderr: string;
  cwd?: string;
  agentId?: string;
  agentType?: string;
  stopHookActive?: boolean;
  /** 하위 명령 PATH 앞에 붙인 node bin. 못 고르면 null. */
  nodeBinDir?: string | null;
};

export type Writer = { write(text: string): void };

class InputError extends Error {}

/** SubagentStop 입력 JSON 을 읽는다. 깨졌거나 cwd 가 없으면 InputError. */
export function parseInput(raw: string): GateInput {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new InputError("입력 JSON 을 읽지 못했다");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new InputError("입력이 JSON 객체가 아니다");
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.cwd !== "string" || obj.cwd === "") {
    throw new InputError("입력에 cwd 가 없다");
  }
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  return {
    cwd: obj.cwd,
    stopHookActive: obj.stop_hook_active === true,
    agentId: text(obj.agent_id),
    agentType: text(obj.agent_type),
    lastAssistantMessage: text(obj.last_assistant_message),
  };
}

/** 빈 줄을 뺀 첫 줄이 NEEDS_CONTEXT 또는 BLOCKED 로 시작하는가. */
export function isEscapeMessage(message: string): boolean {
  const first = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== "");
  return (
    first !== undefined &&
    ESCAPE_STATUSES.some((status) => first.startsWith(status))
  );
}

export function tail(text: string, lines: number): string {
  return text.replace(/\s+$/, "").split(/\r?\n/).slice(-lines).join("\n");
}

/** 입력 cwd 에서 biome ci 와 단위 시험을 차례로 돌려 판단한다. */
export function runGate(opts: {
  cwd: string;
  run: Runner;
  exists?: Exists;
}): Decision {
  const exists = opts.exists ?? existsSync;
  const missing = COMMANDS.filter((c) => !exists(join(opts.cwd, c.bin)));
  if (missing.length > 0) {
    return {
      exitCode: 2,
      allow: false,
      reason: "node_modules 없음",
      stderr: `끝내기 전에 고칠 것: ${missing.map((c) => c.bin).join(" · ")} 가 없어 확인을 못 했어요. pnpm install 을 먼저 하세요`,
      cwd: opts.cwd,
    };
  }
  const failures: { label: string; command: string; result: CommandResult }[] =
    [];
  for (const command of COMMANDS) {
    const result = opts.run(command.bin, [...command.args], {
      cwd: opts.cwd,
      timeoutMs: COMMAND_TIMEOUT_MS,
    });
    if (result.code !== 0) {
      failures.push({
        label: command.label,
        command: [command.bin, ...command.args].join(" "),
        result,
      });
    }
  }
  if (failures.length === 0) {
    return {
      exitCode: 0,
      allow: true,
      reason: "통과",
      stderr: "",
      cwd: opts.cwd,
    };
  }
  const labels = failures.map((f) => f.label).join(" · ");
  const sections = failures.map((f) => {
    const code =
      f.result.code === null
        ? "시간 초과 또는 실행 실패"
        : `종료 코드 ${f.result.code}`;
    return [
      `--- ${f.command} (${code}), 끝 ${TAIL_LINES}줄 ---`,
      tail(f.result.output, TAIL_LINES),
    ].join("\n");
  });
  return {
    exitCode: 2,
    allow: false,
    reason: `${labels} 실패`,
    stderr: [
      `끝내기 전에 고칠 것: ${labels} 이(가) 실패했어요. 시험을 건너뛰거나 지우지 말고 고친 뒤 끝내세요. 브리프 밖 원인으로 못 고치면 답장 첫 줄에 NEEDS_CONTEXT 또는 BLOCKED 를 적고 끝내세요.`,
      ...sections,
    ].join("\n"),
    cwd: opts.cwd,
  };
}

/** 입력 글 하나로 끝내기를 판단한다. 관문 자체 오류도 막음(2)이다. */
export function decide(
  raw: string,
  deps: { run: Runner; exists?: Exists },
): Decision {
  let input: GateInput;
  try {
    input = parseInput(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: 2,
      allow: false,
      reason: `관문 오류: ${message}`,
      stderr: `구현자 끝내기 관문 오류: ${message}. 확인을 못 해서 끝내기를 막았어요.`,
    };
  }
  const who = {
    cwd: input.cwd,
    agentId: input.agentId,
    agentType: input.agentType,
    stopHookActive: input.stopHookActive,
  };
  if (isEscapeMessage(input.lastAssistantMessage)) {
    const status =
      ESCAPE_STATUSES.find((s) =>
        input.lastAssistantMessage.trimStart().startsWith(s),
      ) ?? "상태";
    return {
      exitCode: 0,
      allow: true,
      reason: `${status} 로 끝냄`,
      stderr: "",
      ...who,
    };
  }
  return {
    ...runGate({ cwd: input.cwd, run: deps.run, exists: deps.exists }),
    ...who,
  };
}

/**
 * .nvmrc 의 판 가운데 가장 높은 설치 판의 bin 폴더. .nvmrc 없음 · 숫자 꼴 아님(lts/* 등) ·
 * nvm 폴더 없음 · 맞는 판 없음 · HOME 없음이면 null. 아키텍처로 거르거나 하위 프로세스를 띄우지 않는다.
 */
export function resolveNodeBinDir(deps: {
  cwd: string;
  env: Record<string, string | undefined>;
  readFile: (path: string) => string;
  readdir: (path: string) => string[];
  exists: Exists;
}): string | null {
  let nvmrc: string;
  try {
    nvmrc = deps.readFile(join(deps.cwd, ".nvmrc")).trim();
  } catch {
    return null;
  }
  const want = NVMRC_VERSION.exec(nvmrc);
  if (!want) return null;
  const nvmDir =
    deps.env.NVM_DIR ??
    (deps.env.HOME ? join(deps.env.HOME, ".nvm") : undefined);
  if (!nvmDir) return null;
  const versionsDir = join(nvmDir, NVM_VERSIONS_DIR);
  let names: string[];
  try {
    names = deps.readdir(versionsDir);
  } catch {
    return null;
  }
  const wanted = want
    .slice(1)
    .filter((part) => part !== undefined)
    .map(Number);
  const candidates = names
    .map((name) => ({ name, match: INSTALLED_VERSION.exec(name) }))
    .filter(
      (c): c is { name: string; match: RegExpExecArray } => c.match !== null,
    )
    .map((c) => ({ name: c.name, parts: c.match.slice(1).map(Number) }))
    .filter((c) => wanted.every((part, i) => c.parts[i] === part))
    .sort(
      (a, b) =>
        (b.parts[0] ?? 0) - (a.parts[0] ?? 0) ||
        (b.parts[1] ?? 0) - (a.parts[1] ?? 0) ||
        (b.parts[2] ?? 0) - (a.parts[2] ?? 0),
    );
  for (const c of candidates) {
    const bin = join(versionsDir, c.name, "bin");
    if (deps.exists(join(bin, "node"))) return bin;
  }
  return null;
}

/** 하위 명령 환경. binDir 이 있으면 PATH 앞에 붙이고, 색 글자를 끈다. */
export function childEnv(
  base: Record<string, string | undefined>,
  binDir: string | null,
): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {
    ...base,
    NO_COLOR: "1",
    FORCE_COLOR: "0",
  };
  if (binDir) env.PATH = `${binDir}:${base.PATH ?? ""}`;
  return env;
}

/**
 * 판단을 표준 출력 · 표준 오류에 쓴다. 막을 때 stdout 을 비워 두면 Claude Code 는 stderr 에
 * 'no such file' 이 든 종료 2 를 '훅 스크립트가 없다'로 보고 막지 않으므로 stdout 에도 한 줄을 쓴다.
 */
export function writeDecision(
  decision: Decision,
  out: Writer,
  err: Writer,
): void {
  if (decision.allow) return;
  out.write("구현자 끝내기 관문: 막음. 까닭은 stderr 에 있어요.\n");
  err.write(`${decision.stderr}\n`);
}

/** 기록 한 줄: 시각 · agent_id · agent_type · stop_hook_active · 허락/막음 · 까닭 · node bin(탭으로 나눔). */
export function formatLogLine(now: Date, decision: Decision): string {
  const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();
  return `${[
    now.toISOString(),
    oneLine(decision.agentId ?? "") || "-",
    oneLine(decision.agentType ?? "") || "-",
    `stop_hook_active=${decision.stopHookActive === true}`,
    decision.allow ? "허락" : "막음",
    oneLine(decision.reason),
    decision.nodeBinDir ?? "-",
  ].join("\t")}\n`;
}

function realNodeBinDir(cwd: string): string | null {
  return resolveNodeBinDir({
    cwd,
    env: process.env,
    readFile: (path) => readFileSync(path, "utf8"),
    readdir: (path) => readdirSync(path),
    exists: existsSync,
  });
}

export const realRun: Runner = (bin, args, opts) => {
  const result = spawnSync(join(opts.cwd, bin), args, {
    cwd: opts.cwd,
    encoding: "utf8",
    timeout: opts.timeoutMs,
    killSignal: "SIGKILL",
    maxBuffer: OUTPUT_MAX_BYTES,
    // Next 의 타입은 ProcessEnv 에 NODE_ENV 를 필수로 더한다. 값은 process.env 를 펼친 것이라 그대로 맞다.
    env: childEnv(process.env, realNodeBinDir(opts.cwd)) as NodeJS.ProcessEnv,
  });
  const output = [result.stdout ?? "", result.stderr ?? ""]
    .filter((part) => part !== "")
    .join("\n");
  if (result.error) {
    return { code: null, output: `${output}\n${result.error.message}` };
  }
  return { code: result.status, output };
};

function appendLog(cwd: string, decision: Decision): void {
  try {
    const path = join(cwd, LOG_PATH);
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, formatLogLine(new Date(), decision));
  } catch {
    // 기록 실패는 판단을 바꾸지 않는다.
  }
}

function main(): number {
  let decision: Decision;
  try {
    decision = decide(readFileSync(0, "utf8"), { run: realRun });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    decision = {
      exitCode: 2,
      allow: false,
      reason: `관문 오류: ${message}`,
      stderr: `구현자 끝내기 관문 오류: ${message}. 확인을 못 해서 끝내기를 막았어요.`,
    };
  }
  if (decision.cwd) decision.nodeBinDir = realNodeBinDir(decision.cwd);
  appendLog(
    decision.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
    decision,
  );
  writeDecision(decision, process.stdout, process.stderr);
  return decision.exitCode;
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectRun()) process.exitCode = main();

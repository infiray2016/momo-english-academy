// spec 추적(그래프 엔지니어링 F2 = 조사 P3 번호 뽑기 + 조사 P4 AC ↔ 시험).
// 15절 수용 기준 표 · 묶음 plan 증명 표 · 시험 이름을 맞대어 센다.
// 사용: pnpm spec:trace [--plan <경로>] [--fail-on <규칙,…>]
// 종료 코드: 0 보고만(기본) 또는 --fail-on 규칙에 위반 없음, 1 --fail-on 규칙에 위반, 2 입력을 못 읽음.
import { type Dirent, readdirSync, readFileSync, realpathSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// 경로의 한글은 NFC 로 둔다(git 이 NFC 로 저장한다, plan-p01b 위험 5).
export const SPEC_PATH = "specs/11-요구사항과-수용-기준.md".normalize("NFC");
export const DEFAULT_PLAN_PATH =
  "intent/2026-10-15-모모-잉글리시-아카데미/plan.md".normalize("NFC");
export const TESTS_DIR = "tests";
const TEST_FILE = /\.(test|spec)\.ts$/;

const SPEC_SECTION_HEADING = /^## 15\./;
const PLAN_PROOF_HEADING = /^## 증명 \(Proof\)/;
const NEXT_HEADING = /^## /;
// 15절의 AC 번호 꼴(2026-10-16 셈으로 116개 모두 이 꼴).
const SPEC_AC = /^AC-(?:\d{1,2}[a-z]|N\d{1,2})$/;
// 증명 표 · 시험 이름 쪽은 꼴이 어긋난 번호도 뽑아서 15절 대조에서 걸리게 한다.
const LOOSE_AC = /^AC-[A-Za-z0-9]+$/;
// test( · it( · describe( · test.describe( 와 뒤에 붙는 수식어. 첫 인자가 'AC-' 로 시작하는 글자 그대로일 때만.
// 첫 인자 글 전체를 잡는다(같은 따옴표가 닫을 때까지, '\' 다음 한 글자는 건너뜀, 줄바꿈 없음).
const TEST_CALL =
  /(?<![\w$.])(?:test|it|describe)(?:\.(?:describe|only|skip|fixme|todo|concurrent))*\s*\(\s*(["'`])((?:\\[^\n]|(?!\1)[^\\\n])*)\1/g;
// 이름 맨 앞의 AC 토큰과, 구분자(공백 · '·' · ',' · '/') 뒤에 이어지는 AC 토큰.
const LEADING_AC = /^AC-[A-Za-z0-9]+/;
const NEXT_AC = /^[\s·,/]+(AC-[A-Za-z0-9]+)/;

export const RULES = [
  "unknown-ac",
  "plan-ac-not-in-spec",
  "missing-test",
] as const;
export type Rule = (typeof RULES)[number];
export type Counts = Record<Rule, number>;

export type SpecAc = { ac: string; line: number };
export type PlanAc = { ac: string; line: number; p: string };
export type TestAc = {
  ac: string;
  file: string;
  line: number;
  /** 'AC-' 로 시작하나 번호 토큰이 없는 이름(예: 'AC-가 …'). */
  malformed?: boolean;
};
export type Violation = {
  rule: Rule;
  ac: string;
  location: string;
  detail: string;
};
export type TraceResult = { violations: Violation[]; counts: Counts };

export class InputError extends Error {}

function tableCells(line: string): string[] | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return undefined;
  // `\|` 는 칸 안의 글자이므로 나누지 않는다.
  return trimmed
    .split(/(?<!\\)\|/)
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function sectionLines(
  text: string,
  heading: RegExp,
  label: string,
): { line: string; number: number }[] {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => heading.test(line));
  if (start < 0) throw new InputError(`${label} 머리를 찾지 못했다`);
  const out: { line: string; number: number }[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (NEXT_HEADING.test(line)) break;
    out.push({ line, number: i + 1 });
  }
  return out;
}

/** 15절 표 줄의 첫 칸에서 AC 번호를 뽑는다. 줄 번호는 1부터. */
export function parseSpecAcs(text: string): SpecAc[] {
  const acs: SpecAc[] = [];
  for (const { line, number } of sectionLines(
    text,
    SPEC_SECTION_HEADING,
    "15절",
  )) {
    const first = tableCells(line)?.[0];
    if (first && SPEC_AC.test(first)) acs.push({ ac: first, line: number });
  }
  if (acs.length === 0)
    throw new InputError("15절 표에서 AC 를 하나도 못 뽑았다");
  return acs;
}

/** 묶음 plan 증명 표에서 첫 칸이 AC 번호인 줄과 넷째 칸(P)을 뽑는다. '공통' 같은 줄은 뺀다. */
export function parsePlanProofAcs(text: string): PlanAc[] {
  const acs: PlanAc[] = [];
  for (const { line, number } of sectionLines(
    text,
    PLAN_PROOF_HEADING,
    "증명 (Proof)",
  )) {
    const cells = tableCells(line);
    const first = cells?.[0];
    if (cells && first && LOOSE_AC.test(first)) {
      acs.push({ ac: first, line: number, p: cells[3] ?? "" });
    }
  }
  if (acs.length === 0) {
    throw new InputError("증명 표에서 AC 를 하나도 못 뽑았다");
  }
  return acs;
}

/**
 * 줄 주석(// 부터 줄 끝)과 블록 주석을 같은 길이의 공백으로 바꾼다. 줄바꿈은 둬 줄 번호를 지킨다.
 * 따옴표 글('…' · "…" 는 줄 끝까지, `…` 는 닫을 때까지) 안의 '//' · '/*' 는 주석으로 보지 않는다.
 */
export function blankComments(source: string): string {
  const out = source.split("");
  let i = 0;
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k++) if (out[k] !== "\n") out[k] = " ";
  };
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      const stop = end < 0 ? source.length : end;
      blank(i, stop);
      i = stop;
    } else if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end < 0 ? source.length : end + 2;
      blank(i, stop);
      i = stop;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      i++;
      while (i < source.length && source[i] !== ch) {
        if (source[i] === "\n" && ch !== "`") break;
        i += source[i] === "\\" ? 2 : 1;
      }
      i++;
    } else {
      i++;
    }
  }
  return out.join("");
}

/** 시험 소스에서 'AC-' 로 시작하는 시험 이름의 앞에 이어진 AC 토큰 모두와 그 줄을 뽑는다. */
export function extractTestAcs(file: string, source: string): TestAc[] {
  const code = blankComments(source);
  const lineAt = (index: number) => code.slice(0, index).split("\n").length;
  const found: TestAc[] = [];
  for (const match of code.matchAll(TEST_CALL)) {
    const name = match[2] ?? "";
    if (!name.startsWith("AC-")) continue;
    const nameStart = (match.index ?? 0) + match[0].length - name.length - 1;
    const first = LEADING_AC.exec(name)?.[0];
    if (!first) {
      found.push({
        ac: name.split(/\s/)[0] ?? name,
        file,
        line: lineAt(nameStart),
        malformed: true,
      });
      continue;
    }
    found.push({ ac: first, file, line: lineAt(nameStart) });
    let offset = first.length;
    for (;;) {
      const more = NEXT_AC.exec(name.slice(offset));
      if (!more?.[1]) break;
      const tokenOffset = offset + more[0].length - more[1].length;
      found.push({ ac: more[1], file, line: lineAt(nameStart + tokenOffset) });
      offset += more[0].length;
    }
  }
  return found;
}

export function trace(input: {
  specAcs: SpecAc[];
  planAcs: PlanAc[];
  testAcs: TestAc[];
  planPath: string;
}): TraceResult {
  const inSpec = new Set(input.specAcs.map((a) => a.ac));
  const tested = new Set(input.testAcs.map((t) => t.ac));
  const violations: Violation[] = [];
  for (const t of input.testAcs) {
    if (t.malformed || !inSpec.has(t.ac)) {
      violations.push({
        rule: "unknown-ac",
        ac: t.ac,
        location: `${t.file}:${t.line}`,
        detail: t.malformed
          ? "시험 이름의 AC 가 번호 꼴이 아니다"
          : "시험 이름의 AC 가 15절에 없다",
      });
    }
  }
  for (const a of input.planAcs) {
    if (!inSpec.has(a.ac)) {
      violations.push({
        rule: "plan-ac-not-in-spec",
        ac: a.ac,
        location: `${input.planPath}:${a.line}`,
        detail: "증명 표의 AC 가 15절에 없다",
      });
    }
  }
  for (const a of input.planAcs) {
    if (!tested.has(a.ac)) {
      violations.push({
        rule: "missing-test",
        ac: a.ac,
        location: `${input.planPath}:${a.line}`,
        detail: `이름이 이 AC 로 시작하는 시험이 없다 (P: ${a.p})`,
      });
    }
  }
  const counts: Counts = {
    "unknown-ac": 0,
    "plan-ac-not-in-spec": 0,
    "missing-test": 0,
  };
  for (const v of violations) counts[v.rule]++;
  return { violations, counts };
}

export function exitCode(counts: Counts, failOn: readonly string[]): 0 | 1 {
  return failOn.some((rule) => (counts[rule as Rule] ?? 0) > 0) ? 1 : 0;
}

export type ParsedArgs =
  | { ok: true; plan: string | undefined; failOn: string[] }
  | { ok: false; error: string };

export function parseArgs(argv: readonly string[]): ParsedArgs {
  let plan: string | undefined;
  let failOn: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === "--plan" || arg === "--fail-on") {
      if (value === undefined || value.startsWith("--")) {
        return { ok: false, error: `${arg} 뒤에 값이 없다` };
      }
      if (arg === "--plan") plan = value;
      else
        failOn = value
          .split(",")
          .map((rule) => rule.trim())
          .filter(Boolean);
      i++;
    } else {
      return { ok: false, error: `모르는 인자: ${arg}` };
    }
  }
  return { ok: true, plan, failOn };
}

export function runTrace(input: {
  specText: string | undefined;
  planText: string | undefined;
  planPath: string;
  tests: { path: string; text: string }[];
  failOn: readonly string[];
}): { code: 0 | 1 | 2; lines: string[] } {
  try {
    const unknownRules = input.failOn.filter(
      (rule) => !(RULES as readonly string[]).includes(rule),
    );
    if (unknownRules.length > 0) {
      throw new InputError(
        `--fail-on 에 모르는 규칙: ${unknownRules.join(",")} (규칙: ${RULES.join(",")})`,
      );
    }
    if (input.specText === undefined) {
      throw new InputError(`${SPEC_PATH} 를 읽지 못했다`);
    }
    if (input.planText === undefined) {
      throw new InputError(`${input.planPath} 를 읽지 못했다`);
    }
    const specAcs = parseSpecAcs(input.specText);
    const planAcs = parsePlanProofAcs(input.planText);
    const testAcs = input.tests.flatMap((t) => extractTestAcs(t.path, t.text));
    const result = trace({
      specAcs,
      planAcs,
      testAcs,
      planPath: input.planPath,
    });
    const summary = [
      `spec-trace: 15절 AC ${specAcs.length}`,
      `증명 표 AC ${planAcs.length}`,
      `AC 이름 시험 ${testAcs.length}`,
      ...RULES.map((rule) => `${rule} ${result.counts[rule]}`),
    ].join(" · ");
    const lines = [
      summary,
      ...result.violations.map(
        (v) => `${v.location} ${v.rule} ${v.ac} ${v.detail}`,
      ),
    ];
    return { code: exitCode(result.counts, input.failOn), lines };
  } catch (error) {
    if (error instanceof InputError) {
      return {
        code: 2,
        lines: [`spec-trace: 입력을 못 읽었다: ${error.message}`],
      };
    }
    throw error;
  }
}

function readIfExists(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

function listTestFiles(root: string, dir: string): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(resolve(root, dir), { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    // 숨은 폴더(tests/.tmp 의 시험용 임시 프로젝트 등)와 node_modules 는 보지 않는다.
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...listTestFiles(root, rel));
    else if (entry.isFile() && TEST_FILE.test(entry.name)) files.push(rel);
  }
  return files.sort();
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));
  if (!args.ok) {
    console.error(`spec-trace: ${args.error}`);
    return 2;
  }
  const root = process.cwd();
  // 절대 · 상대 경로 둘 다 받는다. 출력 · 위반 위치는 저장소 뿌리 기준 상대 경로다.
  const planAbs = resolve(
    root,
    (args.plan ?? DEFAULT_PLAN_PATH).normalize("NFC"),
  );
  const planRel = relative(root, planAbs).split(sep).join("/");
  const tests = listTestFiles(root, TESTS_DIR).map((path) => ({
    path,
    text: readFileSync(resolve(root, path), "utf8"),
  }));
  const { code, lines } = runTrace({
    specText: readIfExists(resolve(root, SPEC_PATH)),
    planText: readIfExists(planAbs),
    planPath: planRel,
    tests,
    failOn: args.failOn,
  });
  const write = code === 2 ? console.error : console.log;
  for (const line of lines) write(line);
  return code;
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

// 식별자 대조(plan-p07b 파일별 값 1, 역분석 제안 6 · 조사 P5 · 묶음 위험 4 · C51 '설정 키 대조는 P7 check-ids').
// 그래프 엔지니어링 '자료 그래프': 점 일곱(12절 키 · settings.json 행 · 코드 글자 · 5절 테이블 · 스키마 테이블 ·
// 쓰기 단계 규격 행 · 시험 설정값)과 선(펼침 · 같은 키 · 읽음 · 같은 이름 · 같은 값)을 맞댄다.
// 뽑기는 정규식 · 표 풀기 · TypeScript 구문 트리로만 한다(모델 추출 없음).
// 사용: pnpm check:ids [--specs <폴더>] [--seed-root <폴더>] [--fail-on <규칙,…>] [--json]
// 종료 코드: 0 보고만(기본) 또는 --fail-on 규칙에 위반 없음, 1 --fail-on 규칙에 위반,
// 2 정본 파일을 못 읽음 · 정본 꼴 오류 · 모르는 인자 · 모르는 규칙 · seed/ 가 있는데 풀리지 않음.
// 순수 함수와 runCheckIds(args, io) 를 내보내고 파일 읽기 · 출력은 직접 실행될 때만 한다.
import {
  type Dirent,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import ts from "typescript";
import { AI_PURPOSES } from "../src/core/ai/combo";
import {
  LevelSpecsFileSchema,
  SettingsFileSchema,
} from "../src/core/seed/schema/reference";
import { AREAS, BAND_NAMES, SEED_FILES } from "../src/core/seed/structure";
import { canonicalJson } from "../src/core/seed/validate";

// 경로의 한글은 NFC 로 둔다(git 이 NFC 로 저장한다, spec-trace 와 같음).
export const SETTINGS_SPEC_FILE = "09-설정값.md".normalize("NFC");
export const DATA_SPEC_FILE = "04-데이터.md".normalize("NFC");
export const DEFAULT_SPECS_ROOT = "specs";
export const DEFAULT_SEED_ROOT = "seed";

/** 설정 키 글자를 훑는 폴더(src · scripts · 시험용 자료). */
export const CODE_DIRS = ["src", "scripts", "tests/fixtures"] as const;
/** 설계 숫자를 훑는 폴더. */
export const DESIGN_DIRS = ["src"] as const;
const CODE_EXTENSIONS = [".ts", ".tsx"] as const;
/** 설계 숫자 훑기에서 통째로 빼는 파일(C54 (2) 허용 목록 — 구조 상수). */
export const DESIGN_NUMBER_EXCLUDED_FILES = ["src/core/seed/structure.ts"];
/**
 * 설계 숫자 훑기에서 빼는 이름(어디에 있든). 맨 위 대문자 이름 상수는 규칙으로 빠지지만
 * 장부 '구현하며 확인할 것'이 이름으로 적은 것은 여기에도 둔다.
 * - PASSAGE_PICTURE_UNTIL_LEVEL: 읽기 지문 옆 그림을 두는 마지막 단계, 화면 구조 수라 12절 키가 아니다(C67 · P5b fix 1).
 */
export const DESIGN_NUMBER_ALLOWED_NAMES = ["PASSAGE_PICTURE_UNTIL_LEVEL"];
/** 흔한 수라 설계 숫자로 보지 않는 값. */
const COMMON_NUMBERS = new Set([0, 1, 2]);
/** 설계 숫자 보고 줄에 붙이는 같은 값 키 수. */
const DESIGN_NUMBER_KEY_LIMIT = 3;

/** 설정 키 꼴(끝 '.' 은 틀 글자 · 키 머리). */
const SETTING_KEY_LIKE = /^[a-z][a-z0-9_]*(\.[a-z0-9_-]+)+\.?$/;
/** 파일 이름 꼴 글자를 가르는 확장자. */
const FILE_EXTENSIONS = [
  ".json",
  ".ts",
  ".tsx",
  ".md",
  ".sql",
  ".svg",
  ".png",
  ".webp",
  ".jpg",
  ".css",
  ".js",
  ".mjs",
  ".cjs",
  ".yml",
];
/** 12절 표의 키 칸 꼴(자리 표시 <…> 포함). */
const SPEC_KEY = /^[a-z][a-z0-9_]*(\.([a-z0-9_-]+|<[^>]+>))+$/;
const SETTINGS_HEADER =
  /^\|\s*키\s*\|\s*범위\s*\|\s*기본값\s*\|\s*뜻\s*\|\s*바꾸는 곳\s*\|$/;
const TABLES_HEADER = /^\|\s*테이블\s*\|\s*역할\s*\|$/;
const TABLE_NAME = /^[a-z][a-z0-9_]*$/;

const SCOPE_WORDS: Record<string, "household" | "profile"> = {
  "집 전체": "household",
  프로필: "profile",
};
export type SpecChangeVia =
  | "seed"
  | "decision-first"
  | "advanced"
  | "basic"
  | "first-run";
const CHANGE_VIA_WORDS: Record<string, SpecChangeVia> = {
  시드: "seed",
  "결정 기록 먼저": "decision-first",
  고급: "advanced",
  기본: "basic",
  // profile.start_level.<영역> — 기본 행을 두지 않는다(C61 (2))
  "첫 실행 화면": "first-run",
};
/** 기본값 칸의 낱말 → 저장 값(plan-p06a 정할 것 마). */
const VALUE_WORDS: Record<string, string> = { 끔: "off", 적응: "adaptive" };
/**
 * ai.model · ai.effort · ai.thinking 의 <호출> 에서 빼는 호출. 회화 턴은 구간 키를 따로 두고,
 * 끝맺음 턴 · 확인 호출은 이 키를 쓰지 않는다(12절 ai.model 뜻 칸 · 13절 '데이터 · 운영 세부').
 */
const CALLS_WITHOUT_OWN_KEY = ["talk_turn", "talk_closing", "probe"];
/** AI 없이 정답 비교하는 쓰기 마지막 단계의 설정 키(12절). */
const RULE_CHECK_UNTIL_KEY = "writing.rule_check_until_level";
/** <호출> 을 일곱 모두로 펼치는 키 머리. */
const ALL_CALL_PREFIXES = ["ai.max_tokens."];

export const RULES = [
  "spec-setting-missing",
  "seed-setting-unknown",
  "setting-scope",
  "setting-change-via",
  "setting-default",
  "code-setting-unknown",
  "table-mismatch",
  "max-corrections",
  "fixture-setting",
  "design-number",
] as const;
export type Rule = (typeof RULES)[number];
/** seed/ 가 없으면 건너뛰는 규칙. */
export const SEED_RULES: readonly Rule[] = [
  "spec-setting-missing",
  "seed-setting-unknown",
  "setting-scope",
  "setting-change-via",
  "setting-default",
  "max-corrections",
  "fixture-setting",
  "design-number",
];
/** CI 작업 check-ids 가 막는 규칙(design-number 는 보고만 — 묶음 plan 작업 10 차수 경계에서 막음으로). */
export const CI_FAIL_ON: readonly Rule[] = RULES.filter(
  (rule) => rule !== "design-number",
);

export class InputError extends Error {}

export type SpecSettingRow = {
  /** 12절 키 칸(자리 표시 그대로). */
  key: string;
  scope: "household" | "profile";
  defaultCell: string;
  changeVia: SpecChangeVia;
  line: number;
};
export type SpecKey = {
  key: string;
  template: string;
  scope: "household" | "profile";
  changeVia: SpecChangeVia;
  line: number;
};
export type CodeKey = {
  text: string;
  /** 틀 글자의 머리(뒤에 무엇이 이어져도 된다). */
  template: boolean;
  file: string;
  line: number;
};
export type DesignNumber = {
  file: string;
  line: number;
  value: number;
  keys: string[];
};
export type Violation = { rule: Rule; location: string; detail: string };
export type Counts = Record<Rule, number>;
export type SourceFile = { path: string; text: string };
export type SeedSettingRow = {
  key: string;
  scope: string;
  value: unknown;
  changeVia: string;
};
export type SeedInput = {
  settings: readonly SeedSettingRow[];
  levelSpecs: readonly {
    area: string;
    level: number;
    maxCorrections?: number;
  }[];
};
export type TestSettings = Readonly<
  Record<string, { readonly scope: string; readonly value: unknown }>
>;

// ── 표 풀기 ─────────────────────────────────────────────────────

function tableCells(line: string): string[] | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return undefined;
  return trimmed
    .split(/(?<!\\)\|/)
    .slice(1, -1)
    .map((cell) => cell.trim());
}

/** 같은 머리 줄의 표 모두(머리 줄마다 구분 줄 다음부터 표 줄이 끝날 때까지, 검토 M-1). */
function tableRows(
  text: string,
  header: RegExp,
  label: string,
): { cells: string[]; line: number }[] {
  const lines = text.split(/\r?\n/);
  const rows: { cells: string[]; line: number }[] = [];
  let headers = 0;
  for (let start = 0; start < lines.length; start++) {
    if (!header.test((lines[start] ?? "").trim())) continue;
    headers++;
    let i = start + 2;
    for (; i < lines.length; i++) {
      const cells = tableCells(lines[i] ?? "");
      if (!cells) break;
      rows.push({ cells, line: i + 1 });
    }
    start = i - 1;
  }
  if (headers === 0) throw new InputError(`${label} 표 머리를 찾지 못했다`);
  if (rows.length === 0) throw new InputError(`${label} 표에 줄이 없다`);
  return rows;
}

/** 12절 `| 키 | 범위 | 기본값 | 뜻 | 바꾸는 곳 |` 표. */
export function parseSettingsTable(text: string): SpecSettingRow[] {
  return tableRows(text, SETTINGS_HEADER, "12절 설정값").map(
    ({ cells, line }) => {
      const [key = "", scopeWord = "", defaultCell = "", , via = ""] = cells;
      if (!SPEC_KEY.test(key)) {
        throw new InputError(`12절 ${line}줄 키 칸 꼴이 아니다: ${key}`);
      }
      const scope = SCOPE_WORDS[scopeWord];
      if (!scope) {
        throw new InputError(`12절 ${line}줄 모르는 범위: ${scopeWord}`);
      }
      const changeVia = CHANGE_VIA_WORDS[via];
      if (!changeVia) {
        throw new InputError(`12절 ${line}줄 모르는 바꾸는 곳: ${via}`);
      }
      return { key, scope, defaultCell, changeVia, line };
    },
  );
}

function callsFor(template: string): readonly string[] {
  if (ALL_CALL_PREFIXES.some((p) => template.startsWith(p))) return AI_PURPOSES;
  return AI_PURPOSES.filter((c) => !CALLS_WITHOUT_OWN_KEY.includes(c));
}

/** 자리 표시를 펼친다: <구간> → 구간 넷, <영역> → 영역 넷, <호출> → 호출(ai.max_tokens 일곱, 그 밖 넷). */
export function expandSpecKeys(rows: readonly SpecSettingRow[]): SpecKey[] {
  const out: SpecKey[] = [];
  for (const row of rows) {
    let keys = [row.key];
    for (;;) {
      const first = keys[0] ?? "";
      const match = /<([^>]+)>/.exec(first);
      if (!match) break;
      const placeholder = match[0];
      const values: readonly string[] =
        match[1] === "구간"
          ? BAND_NAMES
          : match[1] === "영역"
            ? AREAS
            : match[1] === "호출"
              ? callsFor(row.key)
              : [];
      if (values.length === 0) {
        throw new InputError(
          `12절 ${row.line}줄 모르는 자리 표시: ${placeholder}`,
        );
      }
      keys = keys.flatMap((k) => values.map((v) => k.replace(placeholder, v)));
    }
    for (const key of keys) {
      out.push({
        key,
        template: row.key,
        scope: row.scope,
        changeVia: row.changeVia,
        line: row.line,
      });
    }
  }
  return out;
}

const NUMBER = /^-?\d+(\.\d+)?$/;
const PLAIN_WORD = /^[A-Za-z][A-Za-z0-9/_-]*$/;

function scalarOf(part: string): unknown {
  const text = part.trim();
  if (NUMBER.test(text)) return Number(text);
  const word = VALUE_WORDS[text];
  if (word !== undefined) return word;
  if (PLAIN_WORD.test(text)) return text;
  return undefined;
}

/**
 * 12절 기본값 칸을 펼친 키 → 값으로 푼다. 못 푸는 칸(`6.1 표` 등)은 undefined(대조 안 함).
 * 꼴: <구간> 넷 · 'a~b단계 v' 단계 사전 · '이름 수 · 이름 · …' 호출별 수 · "나머지 '적응'" · 수 목록 · 수 · 낱말.
 */
export function parseSpecDefault(
  row: SpecSettingRow,
  keys: readonly string[],
): Map<string, unknown> | undefined {
  const cell = row.defaultCell.trim();
  const parts = cell.split(" · ").map((p) => p.trim());
  const single = (value: unknown) =>
    value === undefined || keys.length !== 1
      ? undefined
      : new Map([[keys[0] as string, value]]);

  if (row.key.includes("<구간>")) {
    if (parts.length !== BAND_NAMES.length || keys.length !== BAND_NAMES.length)
      return undefined;
    const values = parts.map(scalarOf);
    if (values.some((v) => v === undefined)) return undefined;
    return new Map(keys.map((k, i) => [k, values[i]]));
  }
  if (row.key.includes("<호출>")) {
    const rest = /나머지\s*'([^']+)'/.exec(cell);
    if (rest) {
      const value = scalarOf(rest[1] ?? "");
      if (value === undefined) return undefined;
      return new Map(keys.map((k) => [k, value]));
    }
    const prefix = row.key.slice(0, row.key.indexOf("<호출>"));
    const byCall = new Map<string, number>();
    let pending: string[] = [];
    for (const part of parts) {
      const m = /^([a-z_]+)(?:\([^)]*\))?(?:\s+(-?\d+(?:\.\d+)?))?$/.exec(part);
      if (!m) return undefined;
      pending.push(m[1] ?? "");
      if (m[2] !== undefined) {
        for (const name of pending)
          byCall.set(`${prefix}${name}`, Number(m[2]));
        pending = [];
      }
    }
    if (pending.length > 0) return undefined;
    if (byCall.size !== keys.length || keys.some((k) => !byCall.has(k)))
      return undefined;
    return new Map(keys.map((k) => [k, byCall.get(k)]));
  }
  const ranges = [...cell.matchAll(/(\d+)~(\d+)단계\s+(-?\d+(?:\.\d+)?)/g)];
  if (ranges.length > 0) {
    const rebuilt = ranges.map((m) => m[0]).join(", ");
    if (rebuilt !== cell) return undefined;
    const dict: Record<string, number> = {};
    for (const m of ranges) {
      for (let level = Number(m[1]); level <= Number(m[2]); level++) {
        dict[String(level)] = Number(m[3]);
      }
    }
    return single(dict);
  }
  if (parts.length > 1) {
    if (!parts.every((p) => NUMBER.test(p))) return undefined;
    return single(parts.map(Number));
  }
  return single(scalarOf(cell));
}

/** 5절 `| 테이블 | 역할 |` 표의 첫 칸. */
export function parseTableNames(
  text: string,
): { name: string; line: number }[] {
  return tableRows(text, TABLES_HEADER, "5절 테이블").map(({ cells, line }) => {
    const name = cells[0] ?? "";
    if (!TABLE_NAME.test(name)) {
      throw new InputError(`5절 ${line}줄 테이블 이름 꼴이 아니다: ${name}`);
    }
    return { name, line };
  });
}

/** 스키마 모듈들의 내보낸 값 가운데 pgTable 의 이름(P3b check-data-api 와 같은 길). */
export function schemaTableNames(modules: readonly object[]): string[] {
  const names: string[] = [];
  for (const mod of modules) {
    for (const value of Object.values(mod)) {
      if (is(value, PgTable)) names.push(getTableName(value));
    }
  }
  return names;
}

// ── 코드 훑기 ───────────────────────────────────────────────────

function parseSource(file: SourceFile): ts.SourceFile {
  return ts.createSourceFile(
    file.path,
    file.text,
    ts.ScriptTarget.Latest,
    true,
    file.path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function lineOf(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

/** 글 글자 · 틀 글자 머리 가운데 설정 키 꼴(첫 마디가 12절 키의 첫 마디)인 것. */
export function collectCodeKeys(
  files: readonly SourceFile[],
  firstSegments: ReadonlySet<string>,
): CodeKey[] {
  const found: CodeKey[] = [];
  for (const file of files) {
    const sf = parseSource(file);
    const take = (text: string, template: boolean, node: ts.Node) => {
      if (!SETTING_KEY_LIKE.test(text)) return;
      if (!firstSegments.has(text.split(".")[0] ?? "")) return;
      if (FILE_EXTENSIONS.some((ext) => text.endsWith(ext))) return;
      found.push({ text, template, file: file.path, line: lineOf(sf, node) });
    };
    const visit = (node: ts.Node) => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node)
      ) {
        take(node.text, false, node);
      } else if (ts.isTemplateExpression(node)) {
        take(node.head.text, true, node);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return found;
}

function isKnownKey(
  code: CodeKey,
  keys: readonly string[],
  keySet: ReadonlySet<string>,
): boolean {
  if (!code.template && keySet.has(code.text)) return true;
  const head =
    code.template || code.text.endsWith(".") ? code.text : `${code.text}.`;
  return keys.some((k) => k.startsWith(head));
}

/** settings.json 의 수 값(수 · 수 목록 · 사전 값을 펼친 모음, 0 · 1 · 2 뺌) → 같은 값의 키. */
export function settingNumbers(
  settings: readonly SeedSettingRow[],
): Map<number, string[]> {
  const map = new Map<number, string[]>();
  const add = (n: unknown, key: string) => {
    if (typeof n !== "number" || COMMON_NUMBERS.has(n)) return;
    const keys = map.get(n) ?? [];
    if (!keys.includes(key)) keys.push(key);
    map.set(n, keys);
  };
  for (const row of settings) {
    const v = row.value;
    if (Array.isArray(v)) for (const n of v) add(n, row.key);
    else if (v && typeof v === "object")
      for (const n of Object.values(v)) add(n, row.key);
    else add(v, row.key);
  }
  return map;
}

const UPPER_NAME = /^[A-Z][A-Z0-9_]*$/;

function isTopLevelUpperConst(node: ts.Node): boolean {
  if (!ts.isVariableStatement(node) || !ts.isSourceFile(node.parent))
    return false;
  if ((node.declarationList.flags & ts.NodeFlags.Const) === 0) return false;
  return node.declarationList.declarations.every(
    (d) => ts.isIdentifier(d.name) && UPPER_NAME.test(d.name.text),
  );
}

function isAllowedName(node: ts.Node): boolean {
  return (
    ts.isVariableDeclaration(node) &&
    ts.isIdentifier(node.name) &&
    DESIGN_NUMBER_ALLOWED_NAMES.includes(node.name.text)
  );
}

/** src 의 수 글자 가운데 설정값과 같은 것(structure.ts · 맨 위 대문자 이름 상수 · 허용 이름 · 0 · 1 · 2 뺌). */
export function collectDesignNumbers(
  files: readonly SourceFile[],
  numbers: ReadonlyMap<number, readonly string[]>,
): DesignNumber[] {
  const found: DesignNumber[] = [];
  for (const file of files) {
    if (DESIGN_NUMBER_EXCLUDED_FILES.includes(file.path)) continue;
    const sf = parseSource(file);
    const visit = (node: ts.Node) => {
      if (isTopLevelUpperConst(node) || isAllowedName(node)) return;
      if (ts.isNumericLiteral(node)) {
        const value = Number(node.text.replaceAll("_", ""));
        const keys = numbers.get(value);
        if (keys) {
          found.push({
            file: file.path,
            line: lineOf(sf, node),
            value,
            keys: keys.slice(0, DESIGN_NUMBER_KEY_LIMIT),
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  return found;
}

// ── 대조 ────────────────────────────────────────────────────────

export type CheckInput = {
  settingsSpecText: string;
  dataSpecText: string;
  schemaTables: readonly string[];
  codeFiles: readonly SourceFile[];
  designFiles: readonly SourceFile[];
  /** seed/ 가 없으면 null(시드 규칙을 건너뛴다). */
  seed: SeedInput | null;
  testSettings: TestSettings;
};
export type CheckResult = {
  violations: Violation[];
  counts: Counts;
  /** 건너뛴 규칙(seed/ 없음). */
  skipped: Rule[];
  /** 기본값 칸을 못 풀어 대조하지 않은 키. */
  unparsedDefaults: string[];
  stats: {
    specKeys: number;
    seedKeys: number;
    codeKeys: number;
    specTables: number;
    schemaTables: number;
  };
};

export function checkIds(input: CheckInput): CheckResult {
  const rows = parseSettingsTable(input.settingsSpecText);
  const specKeys = expandSpecKeys(rows);
  const keyNames = specKeys.map((k) => k.key);
  const keySet = new Set(keyNames);
  const specByKey = new Map(specKeys.map((k) => [k.key, k]));
  const violations: Violation[] = [];
  const add = (rule: Rule, location: string, detail: string) =>
    violations.push({ rule, location, detail });

  // 기본값 칸 풀기
  const defaults = new Map<string, unknown>();
  const unparsedDefaults: string[] = [];
  for (const row of rows) {
    const keys = specKeys
      .filter((k) => k.template === row.key)
      .map((k) => k.key);
    if (row.changeVia === "first-run") continue;
    const parsed = parseSpecDefault(row, keys);
    if (parsed) for (const [k, v] of parsed) defaults.set(k, v);
    else unparsedDefaults.push(...keys);
  }

  const seed = input.seed;
  if (seed) {
    const seedByKey = new Map(seed.settings.map((r) => [r.key, r]));
    for (const spec of specKeys) {
      const row = seedByKey.get(spec.key);
      if (!row) {
        if (spec.changeVia !== "first-run") {
          add(
            "spec-setting-missing",
            spec.key,
            "12절 키가 settings.json 에 없다",
          );
        }
        continue;
      }
      if (row.scope !== spec.scope) {
        add(
          "setting-scope",
          spec.key,
          `12절 범위 ${spec.scope}, settings.json ${row.scope}`,
        );
      }
      if (spec.changeVia === "first-run") {
        add(
          "setting-change-via",
          spec.key,
          "12절 바꾸는 곳 '첫 실행 화면' 키는 기본 행을 두지 않는다(C61)",
        );
      } else if (row.changeVia !== spec.changeVia) {
        add(
          "setting-change-via",
          spec.key,
          `12절 바꾸는 곳 ${spec.changeVia}, settings.json ${row.changeVia}`,
        );
      }
      if (
        defaults.has(spec.key) &&
        canonicalJson(defaults.get(spec.key)) !== canonicalJson(row.value)
      ) {
        add(
          "setting-default",
          spec.key,
          `12절 기본값 ${canonicalJson(defaults.get(spec.key))}, settings.json ${canonicalJson(row.value)}`,
        );
      }
    }
    for (const row of seed.settings) {
      if (!specByKey.has(row.key)) {
        add("seed-setting-unknown", row.key, "settings.json 키가 12절에 없다");
      }
    }
  }

  // 코드의 설정 키 글자
  const firstSegments = new Set(keyNames.map((k) => k.split(".")[0] ?? ""));
  const codeKeys = collectCodeKeys(input.codeFiles, firstSegments);
  for (const code of codeKeys) {
    if (!isKnownKey(code, keyNames, keySet)) {
      add(
        "code-setting-unknown",
        `${code.file}:${code.line}`,
        `${code.template ? "틀 머리" : "키 글자"} ${code.text} 가 12절 키도 키 머리도 아니다`,
      );
    }
  }

  // 5절 테이블 ↔ 스키마
  const specTables = parseTableNames(input.dataSpecText);
  const schemaSet = new Set(input.schemaTables);
  const specTableSet = new Set(specTables.map((t) => t.name));
  for (const t of specTables) {
    if (!schemaSet.has(t.name)) {
      add(
        "table-mismatch",
        `${DATA_SPEC_FILE}:${t.line}`,
        `5절의 ${t.name} 가 스키마에 없다`,
      );
    }
  }
  for (const name of input.schemaTables) {
    if (!specTableSet.has(name)) {
      add("table-mismatch", name, `스키마의 ${name} 가 5절에 없다`);
    }
  }

  if (seed) {
    // 쓰기 교정 상한 두 출처(plan-p06a 정할 것 바). 사전에 없는 단계(4~5단계 가벼운 확인)는 보지 않는다.
    const dictRow = seed.settings.find(
      (r) => r.key === "writing.max_corrections",
    );
    const dict =
      dictRow?.value &&
      typeof dictRow.value === "object" &&
      !Array.isArray(dictRow.value)
        ? (dictRow.value as Record<string, unknown>)
        : {};
    const writing = seed.levelSpecs.filter((s) => s.area === "writing");
    const levels = new Set([
      ...Object.keys(dict).map(Number),
      ...writing.filter((s) => String(s.level) in dict).map((s) => s.level),
    ]);
    for (const level of [...levels].sort((a, b) => a - b)) {
      const expected = dict[String(level)];
      const specs = writing.filter((s) => s.level === level);
      const withValue = specs.filter((s) => s.maxCorrections !== undefined);
      if (withValue.length === 0) {
        add(
          "max-corrections",
          `writing:${level}`,
          `writing.max_corrections 는 ${String(expected)} 인데 쓰기 ${level}단계 규격 값이 없다`,
        );
        continue;
      }
      for (const s of withValue) {
        if (s.maxCorrections !== expected) {
          add(
            "max-corrections",
            `writing:${level}`,
            `쓰기 ${level}단계 규격 ${s.maxCorrections}, writing.max_corrections ${String(expected)}`,
          );
        }
      }
    }

    // AI 를 쓰지 않는 쓰기 단계(≤ writing.rule_check_until_level)에는 교정 상한이 없어야 한다(검토 M-3).
    // 경계는 설정값으로만 잡고, 키가 시드에 없으면 건너뛴다. 4~5단계 값('고칠 곳 최대 1개')은 설정값이 아니라 보지 않는다.
    const ruleBound = seed.settings.find(
      (r) => r.key === RULE_CHECK_UNTIL_KEY,
    )?.value;
    if (typeof ruleBound === "number") {
      for (const s of writing) {
        if (s.level <= ruleBound && s.maxCorrections !== undefined) {
          add(
            "max-corrections",
            `writing:${s.level}`,
            `쓰기 ${s.level}단계는 AI 없는 단계(${RULE_CHECK_UNTIL_KEY} ${ruleBound})인데 규격에 교정 상한 ${s.maxCorrections} 이 있다`,
          );
        }
      }
    }

    // 시험 설정값 ↔ settings.json(P3a 정할 것 사 · 이 plan 정할 것 카)
    const seedByKey = new Map(seed.settings.map((r) => [r.key, r]));
    for (const [key, entry] of Object.entries(input.testSettings)) {
      const row = seedByKey.get(key);
      if (!row) {
        add("fixture-setting", key, "TEST_SETTINGS 키가 settings.json 에 없다");
      } else if (row.scope !== entry.scope) {
        add(
          "fixture-setting",
          key,
          `TEST_SETTINGS 범위 ${entry.scope}, settings.json ${row.scope}`,
        );
      } else if (canonicalJson(row.value) !== canonicalJson(entry.value)) {
        add(
          "fixture-setting",
          key,
          `TEST_SETTINGS 값 ${canonicalJson(entry.value)}, settings.json ${canonicalJson(row.value)}`,
        );
      }
    }

    // 설계 숫자(보고만)
    for (const d of collectDesignNumbers(
      input.designFiles,
      settingNumbers(seed.settings),
    )) {
      add(
        "design-number",
        `${d.file}:${d.line}`,
        `${d.value} ← ${d.keys.join(" · ")}`,
      );
    }
  }

  const counts = Object.fromEntries(RULES.map((r) => [r, 0])) as Counts;
  for (const v of violations) counts[v.rule]++;
  return {
    violations,
    counts,
    skipped: seed ? [] : [...SEED_RULES],
    unparsedDefaults,
    stats: {
      specKeys: specKeys.length,
      seedKeys: seed ? seed.settings.length : 0,
      codeKeys: codeKeys.length,
      specTables: specTables.length,
      schemaTables: input.schemaTables.length,
    },
  };
}

// ── 명령 ────────────────────────────────────────────────────────

export type CheckIdsArgs = {
  specsRoot: string;
  seedRoot: string;
  /** --seed-root 를 적었는지(적은 뿌리가 없으면 종료 2, 검토 M-2). */
  seedRootGiven: boolean;
  failOn: string[];
  json: boolean;
};
export type ParsedArgs =
  | { ok: true; args: CheckIdsArgs }
  | { ok: false; error: string };

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const args: CheckIdsArgs = {
    specsRoot: DEFAULT_SPECS_ROOT,
    seedRoot: DEFAULT_SEED_ROOT,
    seedRootGiven: false,
    failOn: [],
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--specs" || arg === "--seed-root" || arg === "--fail-on") {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) {
        return { ok: false, error: `${arg} 뒤에 값이 없다` };
      }
      if (arg === "--specs") args.specsRoot = value;
      else if (arg === "--seed-root") {
        args.seedRoot = value;
        args.seedRootGiven = true;
      } else
        args.failOn = value
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean);
      i++;
      continue;
    }
    return { ok: false, error: `모르는 인자: ${arg}` };
  }
  return { ok: true, args };
}

export type CheckIdsIo = {
  /** 경로의 글. 없으면 undefined. */
  readText: (path: string) => string | undefined;
  dirExists: (path: string) => boolean;
  /** 폴더 아래 확장자가 맞는 파일(저장소 뿌리 기준 상대 경로). */
  listFiles: (dirs: readonly string[]) => SourceFile[];
  schemaTables: () => string[];
  testSettings: TestSettings;
};

function readSeed(args: CheckIdsArgs, io: CheckIdsIo): SeedInput | null {
  if (!io.dirExists(args.seedRoot)) {
    // 기본 seed 가 없을 때만 건너뛴다(1-가 초반). 적은 뿌리가 없으면 오타로 본다
    if (args.seedRootGiven) throw new InputError(`${args.seedRoot} 가 없다`);
    return null;
  }
  const parse = <T>(
    name: string,
    schema: {
      safeParse: (
        v: unknown,
      ) => { success: true; data: T } | { success: false };
    },
  ): T => {
    const path = join(args.seedRoot, name);
    const text = io.readText(path);
    if (text === undefined) throw new InputError(`${path} 가 없다`);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new InputError(`${path} 가 JSON 이 아니다`);
    }
    const result = schema.safeParse(json);
    if (!result.success) throw new InputError(`${path} 가 규격에 맞지 않는다`);
    return result.data;
  };
  const settings = parse(SEED_FILES.settings, SettingsFileSchema);
  const levelSpecs = parse(SEED_FILES.levelSpecs, LevelSpecsFileSchema);
  return { settings: settings.settings, levelSpecs: levelSpecs.levelSpecs };
}

export function runCheckIds(
  args: CheckIdsArgs,
  io: CheckIdsIo,
): { code: 0 | 1 | 2; lines: string[] } {
  try {
    const unknown = args.failOn.filter(
      (r) => !(RULES as readonly string[]).includes(r),
    );
    if (unknown.length > 0) {
      throw new InputError(
        `--fail-on 에 모르는 규칙: ${unknown.join(",")} (규칙: ${RULES.join(",")})`,
      );
    }
    const readSpec = (file: string) => {
      const path = join(args.specsRoot, file);
      const text = io.readText(path);
      if (text === undefined) throw new InputError(`${path} 를 읽지 못했다`);
      return text;
    };
    const settingsSpecText = readSpec(SETTINGS_SPEC_FILE);
    const dataSpecText = readSpec(DATA_SPEC_FILE);
    const seed = readSeed(args, io);
    const result = checkIds({
      settingsSpecText,
      dataSpecText,
      schemaTables: io.schemaTables(),
      codeFiles: io.listFiles(CODE_DIRS),
      designFiles: seed ? io.listFiles(DESIGN_DIRS) : [],
      seed,
      testSettings: io.testSettings,
    });
    const code = args.failOn.some((r) => result.counts[r as Rule] > 0) ? 1 : 0;
    if (args.json) {
      return {
        code,
        lines: [
          JSON.stringify(
            {
              version: 1,
              counts: result.counts,
              violations: result.violations,
              skipped: result.skipped,
              unparsedDefaults: result.unparsedDefaults,
            },
            null,
            2,
          ),
        ],
      };
    }
    const s = result.stats;
    const summary = [
      `check-ids: 12절 키 ${s.specKeys}`,
      `시드 키 ${s.seedKeys}`,
      `코드 키 글자 ${s.codeKeys}`,
      `테이블 ${s.specTables}/${s.schemaTables}`,
      `대조 안 함 ${result.unparsedDefaults.length}`,
      ...RULES.map((r) => `${r} ${result.counts[r]}`),
      ...(result.skipped.length > 0 ? ["건너뜀(seed/ 없음)"] : []),
    ].join(" · ");
    return {
      code,
      lines: [
        summary,
        ...result.violations.map((v) => `${v.rule} ${v.location} ${v.detail}`),
      ],
    };
  } catch (error) {
    if (error instanceof InputError) {
      return {
        code: 2,
        lines: [`check-ids: 입력을 못 읽었다: ${error.message}`],
      };
    }
    throw error;
  }
}

// ── 파일 읽기(직접 실행 · 저장소 시험) ─────────────────────────

function walk(root: string, dir: string): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(resolve(root, dir), { withFileTypes: true });
  } catch {
    return [];
  }
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...walk(root, rel));
    else if (
      entry.isFile() &&
      CODE_EXTENSIONS.some((ext) => entry.name.endsWith(ext)) &&
      !entry.name.endsWith(".d.ts")
    )
      files.push(rel);
  }
  return files.sort();
}

/** 저장소 뿌리 아래 폴더들의 .ts · .tsx(상대 경로 · 글). */
export function listSourceFiles(
  root: string,
  dirs: readonly string[],
): SourceFile[] {
  return dirs.flatMap((dir) =>
    walk(root, dir).map((path) => ({
      path,
      text: readFileSync(resolve(root, path), "utf8"),
    })),
  );
}

/** 설정 키 글자를 훑는 파일(src · scripts · tests/fixtures). */
export function listCodeFiles(root: string): SourceFile[] {
  return listSourceFiles(root, CODE_DIRS);
}

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`check-ids: ${parsed.error}`);
    return 2;
  }
  const root = process.cwd();
  const [content, learning, operations, fixtures] = await Promise.all([
    import("../src/db/schema/content"),
    import("../src/db/schema/learning"),
    import("../src/db/schema/operations"),
    import("../tests/fixtures/settings"),
  ]);
  const args = {
    ...parsed.args,
    specsRoot: resolve(root, parsed.args.specsRoot.normalize("NFC")),
    seedRoot: resolve(root, parsed.args.seedRoot),
  };
  const { code, lines } = runCheckIds(args, {
    readText: (path) => {
      try {
        return readFileSync(path, "utf8");
      } catch {
        return undefined;
      }
    },
    dirExists: (path) => {
      try {
        return statSync(path).isDirectory();
      } catch {
        return false;
      }
    },
    listFiles: (dirs) =>
      listSourceFiles(root, dirs).map((f) => ({
        ...f,
        path: relative(root, resolve(root, f.path)).split(sep).join("/"),
      })),
    schemaTables: () => schemaTableNames([content, learning, operations]),
    testSettings: fixtures.TEST_SETTINGS,
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

if (isDirectRun()) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      console.error(
        `check-ids: 예상 밖 오류(${error instanceof Error ? error.name : "Error"})`,
      );
      process.exitCode = 2;
    },
  );
}

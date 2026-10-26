// 클라이언트 묶음 비밀 검사(9절 CI 검사, AC-N4 의 P1 몫).
// 빌드한 묶음에 Anthropic 키 꼴 · DB 접속 문자열 · 서버 환경 변수 이름과 (환경에 있으면) 그 값이 없는지 본다.
// 사용: pnpm build && pnpm check:bundle
// 종료 코드: 0 깨끗함, 1 위반, 2 대상 파일 0개 또는 .env.example 없음.
// 출력에는 파일 · 규칙 · 변수 이름만 낸다. 키 · 값 · 접속 문자열 원문은 앞 몇 글자도 내지 않는다.
import { type Dirent, readdirSync, readFileSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

/** 빌드 결과 폴더(저장소 뿌리 기준). */
export const BUILD_DIR = ".next";
/** 이 폴더 아래 모든 파일을 본다. 배치는 (추측), 이 폴더의 대상이 0개면 2 로 끝낸다. */
export const STATIC_DIR = "static";
/** 이 폴더 아래 미리 만든 화면(html · rsc)만 본다. */
export const PRERENDER_DIR = "server/app";
export const PRERENDER_FILE = /\.(html|rsc)$/;
export const ENV_EXAMPLE_PATH = ".env.example";
/** 값 대조에 쓰는 환경 파일(있을 때만). process.env 는 바꾸지 않는다. */
export const ENV_FILES = [".env.local", ".env"] as const;
/** 이보다 짧은 값은 흔한 글과 겹치므로 대조하지 않는다. */
export const MIN_SECRET_LENGTH = 8;
export const PUBLIC_PREFIX = "NEXT_PUBLIC_";
/** server-only 패키지가 클라이언트 쪽에서 던지는 오류 문장(보조 검사). */
export const SERVER_ONLY_MARKER =
  "This module cannot be imported from a Client Component module";

const ANTHROPIC_KEY = /sk-ant-[A-Za-z0-9_-]{16,}/;
const DB_URL_WITH_CREDENTIALS = /postgres(?:ql)?:\/\/[^\s:@/'"`]+:[^\s@/'"`]+@/;
const ENV_NAME_LINE = /^([A-Za-z_][A-Za-z0-9_]*)=/;

export type Rule =
  | "anthropic-key"
  | "db-url"
  | "server-env-name"
  | "server-env-value"
  | "server-only-marker";
export type Leak = { file: string; rule: Rule; name: string };
export type BundleFile = { path: string; content: string };
export type SecretValue = { name: string; value: string };
export type EnvSource = Record<string, string | undefined>;

/** .env.example 의 '이름=' 줄 가운데 NEXT_PUBLIC_ 로 시작하지 않는 이름. */
export function parseServerEnvNames(envExampleText: string): string[] {
  const names: string[] = [];
  for (const line of envExampleText.split(/\r?\n/)) {
    const name = ENV_NAME_LINE.exec(line.trim())?.[1];
    if (name && !name.startsWith(PUBLIC_PREFIX) && !names.includes(name)) {
      names.push(name);
    }
  }
  return names;
}

/** 서버 변수의 값 가운데 대조할 것(MIN_SECRET_LENGTH 이상, 겹침 없음). 앞 출처가 먼저다. */
export function collectSecretValues(
  names: readonly string[],
  sources: readonly EnvSource[],
): SecretValue[] {
  const out: SecretValue[] = [];
  for (const source of sources) {
    for (const name of names) {
      const value = source[name];
      if (value === undefined || value.length < MIN_SECRET_LENGTH) continue;
      if (out.some((v) => v.name === name && v.value === value)) continue;
      out.push({ name, value });
    }
  }
  return out;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findLeaks(
  files: readonly BundleFile[],
  opts: { names: readonly string[]; values: readonly SecretValue[] },
): Leak[] {
  const namePatterns = opts.names.map((name) => ({
    name,
    pattern: new RegExp(
      `(?<![A-Za-z0-9_])${escapeRegExp(name)}(?![A-Za-z0-9_])`,
    ),
  }));
  const leaks: Leak[] = [];
  for (const file of files) {
    const add = (rule: Rule, name = "-") => {
      if (
        !leaks.some(
          (l) => l.file === file.path && l.rule === rule && l.name === name,
        )
      ) {
        leaks.push({ file: file.path, rule, name });
      }
    };
    if (ANTHROPIC_KEY.test(file.content)) add("anthropic-key");
    if (DB_URL_WITH_CREDENTIALS.test(file.content)) add("db-url");
    for (const { name, pattern } of namePatterns) {
      if (pattern.test(file.content)) add("server-env-name", name);
    }
    for (const { name, value } of opts.values) {
      if (file.content.includes(value)) add("server-env-value", name);
    }
    if (file.content.includes(SERVER_ONLY_MARKER)) add("server-only-marker");
  }
  return leaks;
}

export function runCheck(input: {
  files: readonly BundleFile[];
  envExampleText: string | undefined;
  envSources: readonly EnvSource[];
}): { code: 0 | 1 | 2; lines: string[] } {
  if (input.envExampleText === undefined) {
    return {
      code: 2,
      lines: [`check-bundle: ${ENV_EXAMPLE_PATH} 가 없다`],
    };
  }
  // 클라이언트 묶음(.next/static)이 0개면 멈춘다. 미리 만든 화면이 0개인 것은 화면이 동적이 되면 정상이다.
  const staticCount = input.files.filter((f) =>
    f.path.startsWith(`${BUILD_DIR}/${STATIC_DIR}/`),
  ).length;
  const prerenderCount = input.files.length - staticCount;
  if (staticCount === 0) {
    return {
      code: 2,
      lines: [
        `check-bundle: ${BUILD_DIR}/${STATIC_DIR} 아래 검사할 파일이 0개다(화면 파일 ${prerenderCount}). 빌드를 먼저 하거나 배치가 바뀌었는지 본다`,
      ],
    };
  }
  const names = parseServerEnvNames(input.envExampleText);
  const values = collectSecretValues(names, input.envSources);
  const leaks = findLeaks(input.files, { names, values });
  const summary = [
    `check-bundle: 파일 ${input.files.length}`,
    `static ${staticCount}`,
    `화면 파일 ${prerenderCount}`,
    `서버 변수 이름 ${names.length}`,
    `대조한 값 ${values.length}`,
    `위반 ${leaks.length}`,
  ].join(" · ");
  return {
    code: leaks.length > 0 ? 1 : 0,
    lines: [summary, ...leaks.map((l) => `${l.file} ${l.rule} ${l.name}`)],
  };
}

function walk(root: string, rel: string): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(join(root, rel), { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const child = `${rel}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(root, child));
    else if (entry.isFile()) out.push(child);
  }
  return out;
}

/** 저장소 뿌리 root 기준의 대상 파일 경로(정렬). */
export function listTargetFiles(root: string): string[] {
  const statics = walk(root, `${BUILD_DIR}/${STATIC_DIR}`);
  const prerendered = walk(root, `${BUILD_DIR}/${PRERENDER_DIR}`).filter((p) =>
    PRERENDER_FILE.test(p),
  );
  return [...statics, ...prerendered].sort();
}

function readIfExists(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

function main(): number {
  const root = process.cwd();
  const envSources: EnvSource[] = [process.env];
  for (const file of ENV_FILES) {
    const text = readIfExists(join(root, file));
    if (text !== undefined) envSources.push(parseEnv(text));
  }
  const files = listTargetFiles(root).map((path) => ({
    path,
    content: readFileSync(join(root, path), "utf8"),
  }));
  const { code, lines } = runCheck({
    files,
    envExampleText: readIfExists(join(root, ENV_EXAMPLE_PATH)),
    envSources,
  });
  const write = code === 0 ? console.log : console.error;
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

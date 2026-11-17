// AC-N5 의 P3b 몫: 함수 안 확인 훑기 · requireAccess · requireCron · proxy(plan-p03b 증명 표).
// 접근 코드 해시 · 쿠키 · CRON_SECRET 은 실행 때 만든다.
import { randomBytes } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  getRewrittenUrl,
  isRewrite,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import ts from "typescript";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCESS_COOKIE_NAME, issueAccessToken } from "@/core/access-token";
import { proxy, config as proxyConfig } from "@/proxy";
import { requireAccess, requireCron } from "@/server/access/guard";
import { now as clockNow } from "@/server/clock";
import { TEST_SETTINGS } from "../fixtures/settings";

const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));
class UnauthorizedSignal extends Error {}
const unauthorizedSpy = vi.fn(() => {
  throw new UnauthorizedSignal("unauthorized");
});
vi.mock("next/navigation", () => ({
  unauthorized: () => unauthorizedSpy(),
}));

const SECONDS_PER_DAY = 86_400;
const NONCE_BYTES = 16;
const TTL_SECONDS = TEST_SETTINGS["access.cookie_days"].value * SECONDS_PER_DAY;
const randomSecret = () => randomBytes(24).toString("base64url");

afterEach(() => {
  cookieJar.clear();
  unauthorizedSpy.mockClear();
  vi.unstubAllEnvs();
});

async function validCookie(keyMaterial: string): Promise<string> {
  return issueAccessToken({
    keyMaterial,
    now: clockNow(),
    ttlSeconds: TTL_SECONDS,
    nonce: new Uint8Array(randomBytes(NONCE_BYTES)),
  });
}

// ── 함수 안 확인 훑기 ──

const REPO_ROOT = join(import.meta.dirname, "../..");
const SCAN_ROOT = "src";
const SOURCE_FILE = /\.(ts|tsx)$/;
const ROUTE_FILE = /(^|\/)route\.(ts|tsx)$/;
const CRON_PREFIX = "src/app/api/cron/";
const ROUTE_METHODS = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);
/** 첫 문장 requireAccess() 를 두지 않는 Route Handler 와 그 까닭. */
const ROUTE_ALLOWLIST: Record<string, string> = {
  "src/app/(setup)/access/submit/route.ts":
    "접근 코드 제출 끝점 — 쿠키 없는 기기가 쓰는 유일한 입구다(plan-p03b 값 9)",
};

type FunctionLike =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration;

function hasUseServer(statements: readonly ts.Statement[]): boolean {
  for (const statement of statements) {
    if (
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression)
    ) {
      if (statement.expression.text === "use server") return true;
      continue;
    }
    break;
  }
  return false;
}

/** 지시문('use server' 등)을 건너뛴 첫 문장. */
function firstStatement(fn: FunctionLike): ts.Statement | undefined {
  if (!fn.body || !ts.isBlock(fn.body)) return undefined;
  return fn.body.statements.find(
    (s) => !(ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression)),
  );
}

/** `await requireAccess()` 또는 `requireCron(…)` / `await requireCron(…)` 인지. */
function isGuardCall(
  statement: ts.Statement | undefined,
  name: "requireAccess" | "requireCron",
): boolean {
  if (!statement || !ts.isExpressionStatement(statement)) return false;
  let expr: ts.Expression = statement.expression;
  const awaited = ts.isAwaitExpression(expr);
  if (awaited) expr = (expr as ts.AwaitExpression).expression;
  if (!ts.isCallExpression(expr)) return false;
  if (!ts.isIdentifier(expr.expression) || expr.expression.text !== name) {
    return false;
  }
  return name === "requireAccess" ? awaited : true;
}

function isExported(node: ts.Node): boolean {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    )
  );
}

type ExportedFunction = {
  name: string;
  /** 따라간 함수 본문. 함수 리터럴로 풀리지 않으면 null(닫힌 쪽 — 위반으로 센다). */
  fn: FunctionLike | null;
};

function asFunctionLiteral(
  expr: ts.Expression | undefined,
): FunctionLike | null {
  if (!expr) return null;
  let inner = expr;
  while (
    ts.isParenthesizedExpression(inner) ||
    ts.isAsExpression(inner) ||
    ts.isSatisfiesExpression(inner)
  ) {
    inner = inner.expression;
  }
  return ts.isArrowFunction(inner) || ts.isFunctionExpression(inner)
    ? inner
    : null;
}

/**
 * 모듈 맨 위에서 내보내는 값들과 그 함수 본문(검토 I-1).
 * `export function` · `export const x = 함수 리터럴` · `export default 함수` 와 함께,
 * `export { a, b as GET }` 지정자는 같은 파일의 선언(함수 선언 · 함수 리터럴을 담은 변수)으로 풀어 본문을 따라간다.
 * 함수 리터럴이 아닌 값(`export const GET = handler` 등), 다른 파일에서 다시 내보낸 것, `export *` 는 fn 이 null 이다.
 */
function exportedFunctions(source: ts.SourceFile): ExportedFunction[] {
  const functions = new Map<string, ts.FunctionDeclaration>();
  const variables = new Map<string, ts.Expression | undefined>();
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      functions.set(statement.name.text, statement);
    } else if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          variables.set(decl.name.text, decl.initializer);
        }
      }
    }
  }
  const resolveLocal = (name: string): FunctionLike | null => {
    const declared = functions.get(name);
    if (declared) return declared;
    return variables.has(name) ? asFunctionLiteral(variables.get(name)) : null;
  };

  const out: ExportedFunction[] = [];
  for (const statement of source.statements) {
    if (ts.isFunctionDeclaration(statement) && isExported(statement)) {
      const isDefault = (ts.getModifiers(statement) ?? []).some(
        (m) => m.kind === ts.SyntaxKind.DefaultKeyword,
      );
      out.push({
        name: isDefault ? "default" : (statement.name?.text ?? "default"),
        fn: statement,
      });
    } else if (ts.isVariableStatement(statement) && isExported(statement)) {
      for (const decl of statement.declarationList.declarations) {
        out.push({
          name: decl.name.getText(source),
          fn: asFunctionLiteral(decl.initializer),
        });
      }
    } else if (ts.isExportAssignment(statement)) {
      const literal = asFunctionLiteral(statement.expression);
      out.push({
        name: "default",
        fn:
          literal ??
          (ts.isIdentifier(statement.expression)
            ? resolveLocal(statement.expression.text)
            : null),
      });
    } else if (ts.isExportDeclaration(statement)) {
      // 형만 내보내는 선언(export type { … })은 실행되는 값이 아니다(재검토 N-1)
      if (statement.isTypeOnly) continue;
      const fromOther = statement.moduleSpecifier !== undefined;
      const clause = statement.exportClause;
      if (!clause || !ts.isNamedExports(clause)) {
        // export * from … · export * as ns from …
        out.push({ name: "*", fn: null });
        continue;
      }
      for (const element of clause.elements) {
        if (element.isTypeOnly) continue;
        const local = (element.propertyName ?? element.name).getText(source);
        out.push({
          name: element.name.getText(source),
          fn: fromOther ? null : resolveLocal(local),
        });
      }
    }
  }
  return out;
}

/** 확인 함수가 오는 모듈(P3b)과 그 파일(자기 선언은 판정하지 않는다). */
const GUARD_MODULE = "@/server/access/guard";
const GUARD_FILE = "src/server/access/guard.ts";

/**
 * requireAccess 라는 이름이 이 파일에서 guard 가 아닌 곳에서 오는가 — 같은 이름의 지역 함수 · 변수 선언이나 다른 모듈에서 가져옴.
 * 가져오기 줄이 없는 조각(시험 견본)은 판정하지 않는다(실제 파일은 tsc 가 막는다).
 */
function requireAccessFromElsewhere(source: ts.SourceFile): boolean {
  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if (
            element.name.text === "requireAccess" &&
            statement.moduleSpecifier.text !== GUARD_MODULE
          )
            return true;
        }
      }
    }
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === "requireAccess"
    )
      return true;
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.name.text === "requireAccess")
          return true;
      }
    }
  }
  return false;
}

/** 파일 하나에서 첫 문장 확인을 빠뜨린 곳. `경로 함수이름 까닭` 꼴. */
function findGuardViolations(path: string, text: string): string[] {
  const source = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const violations: string[] = [];
  const fileUseServer = hasUseServer(source.statements);
  // 첫 문장 꼴이 맞아도 같은 이름의 가짜 확인이면 아무것도 막지 않는다(P3b 완료 보고 메모 'P10 때')
  if (path !== GUARD_FILE && requireAccessFromElsewhere(source)) {
    violations.push(`${path} requireAccess 가 ${GUARD_MODULE} 에서 오지 않음`);
    return violations;
  }

  if (fileUseServer) {
    for (const { name, fn } of exportedFunctions(source)) {
      if (!fn) {
        violations.push(
          `${path} ${name} 파일 지시 'use server'(함수 본문을 따라가지 못함)`,
        );
      } else if (!isGuardCall(firstStatement(fn), "requireAccess")) {
        violations.push(`${path} ${name} 파일 지시 'use server'`);
      }
    }
  }

  // 함수 안 지시 'use server'
  const visit = (node: ts.Node) => {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isFunctionExpression(node) ||
        ts.isArrowFunction(node) ||
        ts.isMethodDeclaration(node)) &&
      node.body &&
      ts.isBlock(node.body) &&
      hasUseServer(node.body.statements) &&
      !isGuardCall(firstStatement(node), "requireAccess")
    ) {
      const name =
        (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
        node.name
          ? node.name.getText(source)
          : "(이름 없음)";
      violations.push(`${path} ${name} 함수 안 지시 'use server'`);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(source, visit);

  if (ROUTE_FILE.test(path) && !(path in ROUTE_ALLOWLIST)) {
    const guard = path.startsWith(CRON_PREFIX)
      ? "requireCron"
      : "requireAccess";
    for (const { name, fn } of exportedFunctions(source)) {
      if (!ROUTE_METHODS.has(name) && name !== "*") continue;
      if (!fn) {
        violations.push(
          `${path} ${name} route.ts 처리기(${guard}, 함수 본문을 따라가지 못함)`,
        );
      } else if (!isGuardCall(firstStatement(fn), guard)) {
        violations.push(`${path} ${name} route.ts 처리기(${guard})`);
      }
    }
  }
  return violations;
}

function sourceFiles(path: string): string[] {
  const full = join(REPO_ROOT, path);
  if (!existsSync(full)) return [];
  if (statSync(full).isFile()) return SOURCE_FILE.test(full) ? [path] : [];
  return readdirSync(full).flatMap((name) => sourceFiles(join(path, name)));
}

describe("함수 안 확인", () => {
  it("AC-N5 함수 안 확인: 모든 'use server' 함수와 route.ts 처리기의 첫 문장이 requireAccess() 다(Cron 은 requireCron, 허용 목록 밖)", () => {
    const files = sourceFiles(SCAN_ROOT).map((p) =>
      relative(REPO_ROOT, join(REPO_ROOT, p)).split(sep).join("/"),
    );
    expect(files.length).toBeGreaterThan(0);
    const violations = files.flatMap((path) =>
      findGuardViolations(path, readFileSync(join(REPO_ROOT, path), "utf8")),
    );
    expect(violations).toEqual([]);
    // 허용 목록의 파일은 실제로 있다(이름이 바뀌어 목록이 낡지 않게)
    for (const path of Object.keys(ROUTE_ALLOWLIST)) {
      expect(files, path).toContain(path);
    }
  });

  it("AC-N5 함수 안 확인: 첫 문장을 빠뜨린 견본(파일 지시 · 함수 안 지시 · route.ts)을 잡는다", () => {
    const fileDirective = `"use server";
import { requireAccess } from "@/server/access/guard";
export async function good() { await requireAccess(); return 1; }
export async function missing() { return 1; }
export const arrowMissing = async () => { const x = 1; await requireAccess(); return x; };
export async function notAwaited() { requireAccess(); }
`;
    expect(findGuardViolations("src/app/actions.ts", fileDirective)).toEqual([
      "src/app/actions.ts missing 파일 지시 'use server'",
      "src/app/actions.ts arrowMissing 파일 지시 'use server'",
      "src/app/actions.ts notAwaited 파일 지시 'use server'",
    ]);

    const inlineDirective = `export default function Page() {
  async function save() { "use server"; await doThing(); }
  async function ok() { "use server"; await requireAccess(); }
  return null;
}
`;
    expect(findGuardViolations("src/app/page.tsx", inlineDirective)).toEqual([
      "src/app/page.tsx save 함수 안 지시 'use server'",
    ]);

    const route = `export async function GET() { return new Response(null); }
export async function POST(request: Request) { await requireAccess(); return new Response(null); }
export function helper() { return 1; }
`;
    expect(findGuardViolations("src/app/api/things/route.ts", route)).toEqual([
      "src/app/api/things/route.ts GET route.ts 처리기(requireAccess)",
    ]);

    const cron = `export async function GET(request: Request) { await requireAccess(); return new Response(null); }
`;
    expect(
      findGuardViolations("src/app/api/cron/daily/route.ts", cron),
    ).toEqual([
      "src/app/api/cron/daily/route.ts GET route.ts 처리기(requireCron)",
    ]);
    const cronOk = `export async function GET(request: Request) { requireCron(request); return new Response(null); }
`;
    expect(
      findGuardViolations("src/app/api/cron/daily/route.ts", cronOk),
    ).toEqual([]);
    // 허용 목록의 제출 끝점은 확인하지 않는다
    expect(
      findGuardViolations("src/app/(setup)/access/submit/route.ts", route),
    ).toEqual([]);

    // 지정자로 이름을 바꿔 내보낸 처리기 · 변수에 담은 처리기(검토 I-1)
    const renamedRoute = `async function handler(request: Request) { return new Response(null); }
const guarded = async (request: Request) => { await requireAccess(); return new Response(null); };
export { handler as GET, guarded as POST };
export const PUT = handler;
export const DELETE = withLog(async () => new Response(null));
export const PATCH = guarded;
export const dynamic = "force-dynamic";
`;
    expect(
      findGuardViolations("src/app/api/things/route.ts", renamedRoute),
    ).toEqual([
      "src/app/api/things/route.ts GET route.ts 처리기(requireAccess)",
      "src/app/api/things/route.ts PUT route.ts 처리기(requireAccess, 함수 본문을 따라가지 못함)",
      "src/app/api/things/route.ts DELETE route.ts 처리기(requireAccess, 함수 본문을 따라가지 못함)",
      "src/app/api/things/route.ts PATCH route.ts 처리기(requireAccess, 함수 본문을 따라가지 못함)",
    ]);
    const renamedActions = `"use server";
async function save() { return 1; }
async function ok() { await requireAccess(); return 1; }
const remove = async () => { return 1; };
export { save, ok, remove as removeItem };
export const wrapped = withLog(async () => { await requireAccess(); });
export { other } from "./other";
`;
    expect(findGuardViolations("src/app/actions.ts", renamedActions)).toEqual([
      "src/app/actions.ts save 파일 지시 'use server'",
      "src/app/actions.ts removeItem 파일 지시 'use server'",
      "src/app/actions.ts wrapped 파일 지시 'use server'(함수 본문을 따라가지 못함)",
      "src/app/actions.ts other 파일 지시 'use server'(함수 본문을 따라가지 못함)",
    ]);

    // 형만 내보내는 것은 위반이 아니다(재검토 N-1)
    const typeExports = `"use server";
type Foo = { id: string };
interface Bar { id: string }
async function ok() { await requireAccess(); return 1; }
export type { Foo };
export { type Bar, ok };
export type { Baz } from "./types";
`;
    expect(findGuardViolations("src/app/actions.ts", typeExports)).toEqual([]);
  });
});

describe("함수 안 확인 · 가져온 곳", () => {
  it("AC-N5 함수 안 확인: 첫 문장의 requireAccess 는 @/server/access/guard 에서 가져온 것이다(같은 이름 지역 함수 견본을 잡는다)", () => {
    // 같은 이름의 지역 함수 — 첫 문장 꼴은 맞지만 아무것도 확인하지 않는다(P3b 완료 보고 메모 'P10 때')
    const localGuard = `"use server";
async function requireAccess() { return; }
export async function save() { await requireAccess(); return 1; }
`;
    expect(findGuardViolations("src/app/actions.ts", localGuard)).toEqual([
      "src/app/actions.ts requireAccess 가 @/server/access/guard 에서 오지 않음",
    ]);
    const otherModule = `"use server";
import { requireAccess } from "./fake-guard";
export async function save() { await requireAccess(); return 1; }
`;
    expect(findGuardViolations("src/app/actions.ts", otherModule)).toEqual([
      "src/app/actions.ts requireAccess 가 @/server/access/guard 에서 오지 않음",
    ]);
    const fromGuard = `"use server";
import { requireAccess } from "@/server/access/guard";
export async function save() { await requireAccess(); return 1; }
`;
    expect(findGuardViolations("src/app/actions.ts", fromGuard)).toEqual([]);
  });
});

// ── 쪽 · 틀의 접근 확인(13절 C247 보완 1 (2)) ──
// proxy 의 일치식에만 기대지 않게, 쪽(page) · 틀(layout)의 기본 내보내기도 첫 문장이 `await requireAccess()` 다(DB 를 읽기 전에).
// 틀과 쪽은 Next 가 나란히 그리므로 틀의 확인만으로는 쪽의 DB 읽기를 막지 못한다 — 쪽마다 둔다.

const PAGE_OR_LAYOUT_FILE =
  /(^|\/)(page|layout)\.(?:(?:preview|local)\.)?(ts|tsx|js|jsx)$/;
/** 첫 문장 requireAccess() 를 두지 않는 쪽 · 틀과 그 까닭. */
const PAGE_ALLOWLIST: Record<string, string> = {
  "src/app/layout.tsx":
    "루트 틀 — 쿠키 없는 기기의 접근 코드 화면(/access)도 감싼다. DB 를 읽지 않는다",
  "src/app/(setup)/access/page.tsx":
    "접근 코드 화면 — 쿠키 없는 기기의 입구다. hasValidAccess() 로 유효하면 홈으로 보내고 아니면 unauthorized()",
  "src/app/dev/mic-probe/page.preview.tsx":
    "운영 배포에서 빠지는 관찰 쪽. 빌드 때 그리는 정적 쪽이고 DB 를 읽지 않는다(명단 파일만). 주소가 정해져 proxy 가 거른다",
  "src/app/dev/speech-probe/page.preview.tsx":
    "운영 배포에서 빠지는 관찰 쪽. 빌드 때 그리는 정적 쪽이고 시험 자료 파일만 읽는다. 주소가 정해져 proxy 가 거른다",
  "src/app/dev/seed-viewer/page.local.tsx":
    "next dev 에서만 묶이는 로컬 시드 보기. 첫 문장이 assertSeedViewerLocal() 이고 DB 를 읽지 않는다(P5b, AC-7f)",
};

/** 쪽 · 틀 파일 하나에서 첫 문장 확인을 빠뜨린 곳. */
function findPageGuardViolations(path: string, text: string): string[] {
  const source = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  if (requireAccessFromElsewhere(source)) {
    return [`${path} requireAccess 가 ${GUARD_MODULE} 에서 오지 않음`];
  }
  const defaults = exportedFunctions(source).filter(
    (e) => e.name === "default",
  );
  if (defaults.length === 0) return [`${path} 기본 내보내기가 없음`];
  return defaults.flatMap(({ fn }) => {
    if (!fn)
      return [`${path} 쪽 · 틀(requireAccess, 함수 본문을 따라가지 못함)`];
    return isGuardCall(firstStatement(fn), "requireAccess")
      ? []
      : [`${path} 쪽 · 틀(requireAccess)`];
  });
}

describe("쪽 · 틀의 접근 확인", () => {
  it("AC-N5 쪽 · 틀 확인: src/app 의 모든 쪽 · 틀의 첫 문장이 @/server/access/guard 의 requireAccess() 다(허용 목록 밖, C247 보완 1)", () => {
    const files = sourceFiles("src/app")
      .map((p) => relative(REPO_ROOT, join(REPO_ROOT, p)).split(sep).join("/"))
      .filter((p) => PAGE_OR_LAYOUT_FILE.test(p));
    // 훑기가 실제로 아이 쪽 틀과 주소 조각을 받는 쪽을 찾는다(빈 목록으로 통과하지 않게)
    expect(files).toEqual(
      expect.arrayContaining([
        "src/app/(child)/layout.tsx",
        "src/app/(child)/page.tsx",
        "src/app/(child)/[area]/lessons/page.tsx",
        "src/app/(child)/[area]/lessons/past/page.tsx",
        "src/app/(child)/[area]/placement/page.tsx",
        "src/app/(child)/result/[id]/page.tsx",
        "src/app/(child)/session/[id]/page.tsx",
      ]),
    );
    const violations = files
      .filter((p) => !(p in PAGE_ALLOWLIST))
      .flatMap((p) => {
        const text = readFileSync(join(REPO_ROOT, p), "utf8");
        const own = findPageGuardViolations(p, text);
        // 실제 파일은 확인 함수를 guard 에서 가져와야 한다(가져오기 줄 없는 조각 견본과 달리)
        const imported = text.includes(
          `import { requireAccess } from "${GUARD_MODULE}"`,
        );
        return imported
          ? own
          : [
              ...own,
              `${p} requireAccess 를 ${GUARD_MODULE} 에서 가져오지 않음`,
            ];
      });
    expect(violations).toEqual([]);
    for (const path of Object.keys(PAGE_ALLOWLIST)) {
      expect(files, path).toContain(path);
    }
  });

  it("AC-N5 쪽 · 틀 확인: 첫 문장을 빠뜨리거나 DB 읽기 뒤에 둔 견본 쪽 · 틀을 잡는다", () => {
    const missing = `export default async function Page() { const v = await readHome(); return v; }`;
    expect(
      findPageGuardViolations("src/app/(child)/x/page.tsx", missing),
    ).toEqual(["src/app/(child)/x/page.tsx 쪽 · 틀(requireAccess)"]);
    const late = `export default async function Page(props) { const { id } = await props.params; await readProfile(); await requireAccess(); }`;
    expect(findPageGuardViolations("src/app/(child)/x/page.tsx", late)).toEqual(
      ["src/app/(child)/x/page.tsx 쪽 · 틀(requireAccess)"],
    );
    const notAwaited = `export default async function Layout({ children }) { requireAccess(); return children; }`;
    expect(
      findPageGuardViolations("src/app/(child)/layout.tsx", notAwaited),
    ).toEqual(["src/app/(child)/layout.tsx 쪽 · 틀(requireAccess)"]);
    const opaque = `const Page = withFrame(Inner); export default Page;`;
    expect(
      findPageGuardViolations("src/app/(child)/x/page.tsx", opaque),
    ).toEqual([
      "src/app/(child)/x/page.tsx 쪽 · 틀(requireAccess, 함수 본문을 따라가지 못함)",
    ]);
    const fake = `import { requireAccess } from "./fake";
export default async function Page() { await requireAccess(); }`;
    expect(findPageGuardViolations("src/app/(child)/x/page.tsx", fake)).toEqual(
      [
        "src/app/(child)/x/page.tsx requireAccess 가 @/server/access/guard 에서 오지 않음",
      ],
    );
    const good = `import { requireAccess } from "@/server/access/guard";
export default async function Page(props) { await requireAccess(); const { id } = await props.params; return id; }`;
    expect(findPageGuardViolations("src/app/(child)/x/page.tsx", good)).toEqual(
      [],
    );
    const goodArrow = `const Layout = async ({ children }) => { await requireAccess(); return children; };
export default Layout;`;
    expect(
      findPageGuardViolations("src/app/(child)/layout.tsx", goodArrow),
    ).toEqual([]);
  });
});

// 관문에서 빠지는 주소가 404 가 되면 루트 '없는 주소' 판이 proxy 없이 그려진다(검토 rev-sec-bypass M-2). 그래서 Next 의 특수 판
// (not-found · error · global-error · template · default · unauthorized · forbidden · loading)은 서버 모듈(@/server/ · @/db/)을
// 가져오지 않는다 — 'use client' 판이거나 서버 모듈 가져오기가 없어야 한다.

const SPECIAL_FILE =
  /(^|\/)(not-found|error|global-error|template|default|unauthorized|forbidden|loading)\.(?:(?:preview|local)\.)?(ts|tsx|js|jsx)$/;
const SERVER_MODULE = /^@\/(server|db)(\/|$)/;
const SERVER_DIR = /^src\/(server|db)(\/|$)/;

/** 가져오는 모듈 이름이 서버 모듈인가. 상대 경로는 파일 자리에서 풀어 src/server · src/db 안인지 본다. */
function isServerModule(fromPath: string, specifier: string): boolean {
  if (SERVER_MODULE.test(specifier)) return true;
  if (!specifier.startsWith(".")) return false;
  const resolved = relative(
    REPO_ROOT,
    join(REPO_ROOT, fromPath, "..", specifier),
  )
    .split(sep)
    .join("/");
  return SERVER_DIR.test(resolved);
}

/** 특수 판 하나가 서버 모듈을 가져오는 곳. 'use client' 판은 보지 않는다. */
function findSpecialFileViolations(path: string, text: string): string[] {
  const source = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const first = source.statements[0];
  if (
    first &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === "use client"
  )
    return [];
  const specifiers: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      specifiers.push(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      specifiers.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return specifiers
    .filter((spec) => isServerModule(path, spec))
    .map((spec) => `${path} 서버 모듈 ${spec} 을 가져옴`);
}

describe("특수 판의 서버 모듈", () => {
  it("AC-N5 특수 판: src/app 의 not-found · error · global-error · template · default · unauthorized · forbidden · loading 판이 @/server/ · @/db/ 를 가져오지 않는다('use client' 이거나, 검토 rev-sec-bypass M-2)", () => {
    const files = sourceFiles("src/app")
      .map((p) => relative(REPO_ROOT, join(REPO_ROOT, p)).split(sep).join("/"))
      .filter((p) => SPECIAL_FILE.test(p));
    // 훑기가 실제로 루트 '없는 주소' 판과 오류 판을 찾는다(빈 목록으로 통과하지 않게)
    expect(files).toEqual(
      expect.arrayContaining(["src/app/not-found.tsx", "src/app/error.tsx"]),
    );
    const violations = files.flatMap((p) =>
      findSpecialFileViolations(p, readFileSync(join(REPO_ROOT, p), "utf8")),
    );
    expect(violations).toEqual([]);
  });

  it("AC-N5 특수 판: 서버 모듈을 가져오는 견본 판(가져오기 · 다시 내보내기 · 동적 가져오기 · 상대 경로)을 잡고 'use client' · 부품만 가져오는 판은 잡지 않는다", () => {
    const fake: Record<string, string> = {
      "src/app/not-found.tsx": `import { readHome } from "@/server/home";
export default async function NotFound() { return readHome(); }`,
      "src/app/(child)/template.tsx": `export { db } from "@/db";
export default function Template({ children }) { return children; }`,
      "src/app/(child)/x/default.tsx": `export default async function Default() { const m = await import("@/server/profile"); return m.read(); }`,
      "src/app/(child)/loading.tsx": `import { db } from "../../db/client";
export default function Loading() { return null; }`,
      "src/app/forbidden.tsx": `import { readSettings } from "../server/settings";
export default function Forbidden() { return null; }`,
      "src/app/error.tsx": `"use client";
import { AppErrorPanel } from "@/components/session/app-trouble";
export default function ErrorPage() { return null; }`,
      "src/app/(setup)/access/unauthorized.tsx": `import { AccessCodeForm } from "./access-code-form";
import { serverish } from "@/serverless/x";
export default function Unauthorized() { return null; }`,
    };
    for (const path of Object.keys(fake)) {
      expect(SPECIAL_FILE.test(path), path).toBe(true);
    }
    const violations = Object.entries(fake).flatMap(([p, text]) =>
      findSpecialFileViolations(p, text),
    );
    expect(violations).toEqual([
      "src/app/not-found.tsx 서버 모듈 @/server/home 을 가져옴",
      "src/app/(child)/template.tsx 서버 모듈 @/db 을 가져옴",
      "src/app/(child)/x/default.tsx 서버 모듈 @/server/profile 을 가져옴",
      "src/app/(child)/loading.tsx 서버 모듈 ../../db/client 을 가져옴",
      "src/app/forbidden.tsx 서버 모듈 ../server/settings 을 가져옴",
    ]);
  });
});

describe("requireAccess · requireCron", () => {
  it("AC-N5 requireAccess: 쿠키가 없거나 무효면 unauthorized() 를 부르고 유효하면 부르지 않는다", async () => {
    const keyMaterial = randomSecret();
    vi.stubEnv("ACCESS_CODE_HASH", keyMaterial);
    // 쿠키 없음
    await expect(requireAccess()).rejects.toBeInstanceOf(UnauthorizedSignal);
    // 다른 열쇠로 만든 쿠키
    cookieJar.set(ACCESS_COOKIE_NAME, await validCookie(randomSecret()));
    await expect(requireAccess()).rejects.toBeInstanceOf(UnauthorizedSignal);
    // 깨진 값
    cookieJar.set(ACCESS_COOKIE_NAME, "v1.x.y.z");
    await expect(requireAccess()).rejects.toBeInstanceOf(UnauthorizedSignal);
    expect(unauthorizedSpy).toHaveBeenCalledTimes(3);
    // 유효한 쿠키
    unauthorizedSpy.mockClear();
    cookieJar.set(ACCESS_COOKIE_NAME, await validCookie(keyMaterial));
    await expect(requireAccess()).resolves.toBeUndefined();
    expect(unauthorizedSpy).not.toHaveBeenCalled();
    // ACCESS_CODE_HASH 가 없으면 유효했던 쿠키도 거부한다(닫힌 쪽)
    vi.stubEnv("ACCESS_CODE_HASH", "");
    await expect(requireAccess()).rejects.toBeInstanceOf(UnauthorizedSignal);
  });

  it("AC-N5 requireCron: Authorization 이 'Bearer CRON_SECRET' 과 다르거나 CRON_SECRET 이 비면 unauthorized()", () => {
    const secret = randomSecret();
    const request = (authorization?: string) =>
      new Request("http://localhost/api/cron/daily", {
        headers: authorization ? { authorization } : {},
      });
    vi.stubEnv("CRON_SECRET", secret);
    expect(() => requireCron(request(`Bearer ${secret}`))).not.toThrow();
    expect(unauthorizedSpy).not.toHaveBeenCalled();
    for (const header of [
      undefined,
      secret,
      `Bearer ${secret}x`,
      `Bearer ${secret.slice(1)}`,
      `bearer ${secret}`,
      `Bearer ${randomSecret()}`,
    ]) {
      expect(() => requireCron(request(header)), String(header)).toThrow(
        UnauthorizedSignal,
      );
    }
    vi.stubEnv("CRON_SECRET", "");
    expect(() => requireCron(request("Bearer "))).toThrow(UnauthorizedSignal);
    expect(() => requireCron(request(`Bearer ${secret}`))).toThrow(
      UnauthorizedSignal,
    );
  });
});

// ── proxy ──

const ORIGIN = "http://localhost:3100";
type ProxyInit = {
  method?: string;
  headers?: Record<string, string>;
  cookie?: string;
};
const proxyRequest = (path: string, init: ProxyInit = {}) => {
  const headers = new Headers(init.headers);
  if (init.cookie) {
    headers.set("cookie", `${ACCESS_COOKIE_NAME}=${init.cookie}`);
  }
  return new NextRequest(new URL(path, ORIGIN), {
    method: init.method ?? "GET",
    headers,
  });
};
const isNext = (response: Response) =>
  response.headers.get("x-middleware-next") === "1";

describe("proxy", () => {
  it("AC-N5 proxy: 쿠키 없는 페이지 요청(GET · HEAD)은 /access 로 다시 쓴다", async () => {
    vi.stubEnv("ACCESS_CODE_HASH", randomSecret());
    for (const path of ["/", "/dev/speech", "/lessons/reading?x=1"]) {
      for (const method of ["GET", "HEAD"]) {
        const response = await proxy(proxyRequest(path, { method }));
        expect(isRewrite(response), `${method} ${path}`).toBe(true);
        expect(getRewrittenUrl(response)).toBe(`${ORIGIN}/access`);
        expect(response.status).toBe(200);
      }
    }
  });

  it("AC-N5 proxy: 쿠키 없는 서버 액션 POST(next-action) · /api · 그 밖 메서드는 401 이고 WWW-Authenticate 가 없다", async () => {
    vi.stubEnv("ACCESS_CODE_HASH", randomSecret());
    const action = { "next-action": "abc123" };
    const cases: [string, ProxyInit][] = [
      ["/", { method: "POST", headers: action }],
      ["/lessons", { method: "POST", headers: action }],
      ["/", { method: "POST" }],
      ["/api/things", {}],
      ["/api", {}],
      ["/api/things", { method: "POST" }],
      ["/", { method: "PUT" }],
      ["/", { method: "DELETE" }],
      ["/", { headers: action }],
      // 공개 경로라도 서버 액션 호출은 401(검토 M-1)
      ["/access", { method: "POST", headers: action }],
      ["/access/submit", { method: "POST", headers: action }],
      ["/api/cron/daily", { method: "POST", headers: action }],
    ];
    for (const [path, init] of cases) {
      const response = await proxy(proxyRequest(path, init));
      const label = `${init.method ?? "GET"} ${path}`;
      expect(response.status, label).toBe(401);
      expect(isRewrite(response), label).toBe(false);
      expect(isNext(response), label).toBe(false);
      expect(response.headers.has("www-authenticate"), label).toBe(false);
    }
  });

  it("AC-N5 proxy: /access · /access/submit · /api/cron/ 은 쿠키 없이 넘긴다", async () => {
    vi.stubEnv("ACCESS_CODE_HASH", randomSecret());
    for (const [path, method] of [
      ["/access", "GET"],
      ["/access/submit", "POST"],
      ["/api/cron/daily", "GET"],
    ]) {
      const response = await proxy(proxyRequest(path, { method }));
      expect(isNext(response), `${method} ${path}`).toBe(true);
      expect(isRewrite(response)).toBe(false);
    }
    // 이름이 비슷한 다른 경로는 넘기지 않는다
    for (const path of ["/accessx", "/api/cronjob", "/access/other"]) {
      const response = await proxy(proxyRequest(path));
      expect(isNext(response), path).toBe(false);
    }
  });

  it("AC-1a proxy: 유효한 쿠키가 있으면 잠금 상태와 관계없이 넘긴다(DB 를 보지 않는다)", async () => {
    const keyMaterial = randomSecret();
    vi.stubEnv("ACCESS_CODE_HASH", keyMaterial);
    // DB 연결 주소가 없어도 넘긴다(proxy 는 DB 를 가져오지 않는다 — 의존 규칙 proxy-stays-light)
    vi.stubEnv("DATABASE_URL", "");
    const cookie = await validCookie(keyMaterial);
    const cases: [string, ProxyInit][] = [
      ["/", {}],
      ["/api/things", { method: "POST" }],
      ["/", { method: "POST", headers: { "next-action": "abc123" } }],
    ];
    for (const [path, init] of cases) {
      const response = await proxy(proxyRequest(path, { ...init, cookie }));
      expect(isNext(response), path).toBe(true);
    }
    const imports = readFileSync(join(REPO_ROOT, "src/proxy.ts"), "utf8")
      .split("\n")
      .filter((line) => line.startsWith("import "));
    expect(imports.join("\n")).not.toMatch(
      /server\/(db|settings)|attempts|argon2|drizzle|postgres/,
    );
  });

  it("AC-N5 proxy: ACCESS_CODE_HASH 가 없으면 모든 쿠키를 거부한다", async () => {
    const keyMaterial = randomSecret();
    const cookie = await validCookie(keyMaterial);
    vi.stubEnv("ACCESS_CODE_HASH", "");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const page = await proxy(proxyRequest("/", { cookie }));
      expect(isRewrite(page)).toBe(true);
      const api = await proxy(proxyRequest("/api/things", { cookie }));
      expect(api.status).toBe(401);
      // 서버 기록에는 한 번만 남긴다(값은 남기지 않는다)
      expect(log).toHaveBeenCalledTimes(1);
      expect(String(log.mock.calls[0]?.[0])).toContain("ACCESS_CODE_HASH");
    } finally {
      log.mockRestore();
    }
  });

  it("proxy matcher: 정적 파일 · 그림 · 선생님 모델 · 초상(/teachers/) · favicon 은 proxy 를 타지 않고 페이지 · /api 는 탄다", () => {
    const matches = (url: string) =>
      unstable_doesMiddlewareMatch({ config: proxyConfig, url });
    for (const url of [
      "/",
      "/access",
      "/dev/speech",
      "/lessons/reading",
      "/api/things",
      "/api/cron/daily",
      // 두 조각 이상의 확장자 주소는 images/ · teachers/ 아래가 아니면 관문을 지난다(C247 보완 1 — 글꼴은 _next/static/media 로 온다)
      "/fonts/jua.woff2",
      "/session/abc.png",
    ]) {
      expect(matches(url), url).toBe(true);
    }
    for (const url of [
      "/_next/static/chunks/main.js",
      "/_next/image?url=x",
      "/favicon.ico",
      "/images/apple.webp",
      "/teachers/mina.1a2b3c4d.vrm",
      "/teachers/mina.fdc5f7f2.webp",
      "/robots.txt",
      "/icon.png",
    ]) {
      expect(matches(url), url).toBe(false);
    }
  });
});

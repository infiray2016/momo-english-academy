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

  it("proxy matcher: 정적 파일 · 그림 · favicon 은 proxy 를 타지 않고 페이지 · /api 는 탄다", () => {
    const matches = (url: string) =>
      unstable_doesMiddlewareMatch({ config: proxyConfig, url });
    for (const url of [
      "/",
      "/access",
      "/dev/speech",
      "/lessons/reading",
      "/api/things",
      "/api/cron/daily",
    ]) {
      expect(matches(url), url).toBe(true);
    }
    for (const url of [
      "/_next/static/chunks/main.js",
      "/_next/image?url=x",
      "/favicon.ico",
      "/images/apple.webp",
      "/robots.txt",
      "/icon.png",
      "/fonts/jua.woff2",
    ]) {
      expect(matches(url), url).toBe(false);
    }
  });
});

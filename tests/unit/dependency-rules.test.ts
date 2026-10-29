import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CONFIG = join(REPO_ROOT, ".dependency-cruiser.cjs");
const DEPCRUISE = join(REPO_ROOT, "node_modules/.bin/depcruise");
const DEPCRUISE_TIMEOUT_MS = 120_000;

// 임시 프로젝트의 파일. 표는 plan-p01b 파일별 값 2 그대로다.
const FIXTURE_FILES: Record<string, string> = {
  "tsconfig.json": JSON.stringify({
    compilerOptions: { paths: { "@/*": ["./src/*"] } },
  }),
  "src/core/uses-next.ts":
    'import { NextResponse } from "next/server";\nexport const r = NextResponse;\n',
  "src/core/uses-react.ts":
    'import type { ReactNode } from "react";\nexport type Node = ReactNode;\n',
  "src/core/uses-drizzle.ts":
    'import { sql } from "drizzle-orm";\nexport const q = sql;\n',
  "src/core/uses-db.ts":
    'import { table } from "@/db/schema";\nexport const t = table;\n',
  "src/core/uses-server.ts":
    'import { now } from "@/server/clock";\nexport const n = now;\n',
  "src/core/uses-fs.ts":
    'import { readFileSync } from "node:fs";\nexport const r = readFileSync;\n',
  "src/core/uses-fs-bare.ts":
    'import { readdirSync } from "fs";\nexport const r = readdirSync;\n',
  "src/core/uses-http.ts":
    'import { request } from "node:https";\nexport const r = request;\n',
  "src/core/uses-crypto.ts":
    'import { createHash } from "node:crypto";\nexport const h = createHash;\n',
  "src/core/uses-zod.ts":
    'import { z } from "zod";\nexport const s = z.string();\n',
  "src/db/schema.ts": 'export const table = "t";\n',
  "src/server/clock.ts": "export const now = 0;\n",
  "src/app/page.tsx":
    'import { client } from "@/server/ai/client";\nexport default function Page() {\n  return client;\n}\n',
  "src/server/actions/write.ts":
    'import { client } from "@/server/ai/client";\nexport const c = client;\n',
  "src/server/ai/client.ts":
    'import Anthropic from "@anthropic-ai/sdk";\nexport const client = Anthropic;\n',
  "src/app/direct-sdk.ts":
    'import Anthropic from "@anthropic-ai/sdk";\nexport const a = Anthropic;\n',
  "src/app/uses-db.ts":
    'import { table } from "@/db/schema";\nexport const t = table;\n',
  "src/server/db/index.ts":
    'import { sql } from "drizzle-orm";\nimport { table } from "@/db/schema";\nexport const q = [sql, table];\n',
  "src/lib/speech/fake-web-speech.ts":
    'import type { T } from "./types";\nexport const fake = (t?: T) => t;\n',
  "src/lib/speech/types.ts": "export type T = string;\n",
  "src/lib/speech/browser.ts": "export const browser = 1;\n",
  "src/app/uses-fake-speech.ts":
    'import { fake } from "@/lib/speech/fake-web-speech";\nexport const f = fake;\n',
  "src/app/uses-browser-speech.ts":
    'import { browser } from "@/lib/speech/browser";\nexport const b = browser;\n',
  "src/server/settings/index.ts": "export const s = 1;\n",
  "src/proxy.ts":
    'import { s } from "@/server/settings";\nimport { r } from "./server/relay";\nexport const p = [s, r];\n',
  // proxy 가 한 단계 건너 DB 를 끌어오는 길(검토 M-2)
  "src/server/relay.ts":
    'import { q } from "@/server/db/index";\nexport const r = q;\n',
  // 로컬 전용 시드 보기(P5b 공용 변경 5): 앱 화면은 못 가져오고 보기 화면은 가져온다
  "src/server/seed-viewer/files.ts": "export const files = 1;\n",
  "src/app/uses-seed-viewer.tsx":
    'import { files } from "@/server/seed-viewer/files";\nexport const f = files;\n',
  "src/app/dev/seed-viewer/page.local.tsx":
    'import { files } from "@/server/seed-viewer/files";\nexport default function Page() {\n  return files;\n}\n',
  // 3D 그림 층(선생님 화면 plan 값 15): three 는 avatar-3d 만, avatar-3d 는 동적 가져오기로만
  "src/components/teacher/avatar-3d.ts":
    'import * as THREE from "three";\nimport { VRMUtils } from "@pixiv/three-vrm";\nexport const a = [THREE, VRMUtils];\n',
  "src/components/teacher/teacher-layer.tsx":
    'export const load = () => import("@/components/teacher/avatar-3d");\n',
  "src/components/uses-three.ts":
    'import { Scene } from "three";\nexport const s = Scene;\n',
  "src/components/uses-three-vrm.ts":
    'import { VRMUtils } from "@pixiv/three-vrm";\nexport const v = VRMUtils;\n',
  "src/app/static-avatar.tsx":
    'import { a } from "@/components/teacher/avatar-3d";\nexport const s = a;\n',
  "src/lib/a.ts": 'import { b } from "./b";\nexport const a = () => b;\n',
  "src/lib/b.ts": 'import { a } from "./a";\nexport const b = () => a;\n',
};

type Violation = { from: string; to: string; rule: { name: string } };
type Dependency = {
  module: string;
  resolved: string;
  couldNotResolve: boolean;
};
type CruiseModule = { source: string; dependencies: Dependency[] };
type CruiseResult = {
  modules: CruiseModule[];
  summary: { violations: Violation[] };
};

let tmpDir = "";
let result: CruiseResult;

beforeAll(() => {
  tmpDir = join(
    REPO_ROOT,
    "tests/.tmp",
    `depcruise-${randomBytes(6).toString("hex")}`,
  );
  for (const [relPath, content] of Object.entries(FIXTURE_FILES)) {
    const full = join(tmpDir, relPath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  const run = spawnSync(
    DEPCRUISE,
    ["--config", CONFIG, "--output-type", "json", "src"],
    {
      cwd: tmpDir,
      encoding: "utf8",
      timeout: DEPCRUISE_TIMEOUT_MS,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (!run.stdout) {
    throw new Error(`depcruise 출력 없음: ${run.stderr ?? run.error}`);
  }
  result = JSON.parse(run.stdout) as CruiseResult;
}, DEPCRUISE_TIMEOUT_MS);

afterAll(() => {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

function violationsFrom(source: string): string[] {
  return result.summary.violations
    .filter((v) => v.from === source)
    .map((v) => v.rule.name);
}

// 허용 예가 '못 찾아서 통과'가 아님을 보인다: 가져온 것이 실제로 풀렸다.
function resolvedDependency(source: string, moduleName: string): Dependency {
  const mod = result.modules.find((m) => m.source === source);
  const dep = mod?.dependencies.find((d) => d.module === moduleName);
  if (!dep) throw new Error(`${source} 의 ${moduleName} 의존이 없다`);
  return dep;
}

describe("의존 규칙", () => {
  it("의존 규칙: src/core 가 next 를 가져오면 core-no-framework 위반", () => {
    expect(violationsFrom("src/core/uses-next.ts")).toEqual([
      "core-no-framework",
    ]);
  });

  it("의존 규칙: src/core 가 react 타입만 가져와도 core-no-framework 위반", () => {
    expect(violationsFrom("src/core/uses-react.ts")).toEqual([
      "core-no-framework",
    ]);
  });

  it("의존 규칙: src/core 가 drizzle-orm 을 가져오면 core-no-framework 위반", () => {
    expect(violationsFrom("src/core/uses-drizzle.ts")).toEqual([
      "core-no-framework",
    ]);
  });

  it("의존 규칙: src/core 가 별칭 @/db 를 가져오면 core-no-framework 위반", () => {
    expect(violationsFrom("src/core/uses-db.ts")).toEqual([
      "core-no-framework",
    ]);
  });

  it("의존 규칙: src/core 가 별칭 @/server 를 가져오면 core-no-framework 위반", () => {
    expect(violationsFrom("src/core/uses-server.ts")).toEqual([
      "core-no-framework",
    ]);
  });

  it("의존 규칙: src/core 가 fs · https(node: 접두 있든 없든)를 가져오면 core-no-io 위반", () => {
    expect(violationsFrom("src/core/uses-fs.ts")).toEqual(["core-no-io"]);
    expect(violationsFrom("src/core/uses-fs-bare.ts")).toEqual(["core-no-io"]);
    expect(violationsFrom("src/core/uses-http.ts")).toEqual(["core-no-io"]);
  });

  it("의존 규칙: src/core 가 node:crypto 를 가져오는 것은 허용", () => {
    const dep = resolvedDependency("src/core/uses-crypto.ts", "crypto");
    // dependency-cruiser 는 node: 접두를 떼고 적는다(module · resolved 모두 "crypto", dependencyTypes core).
    expect(dep.resolved).toBe("crypto");
    expect(dep.couldNotResolve).toBe(false);
    expect(violationsFrom("src/core/uses-crypto.ts")).toEqual([]);
  });

  it("의존 규칙: src/core 가 zod 를 가져오는 것은 허용", () => {
    const dep = resolvedDependency("src/core/uses-zod.ts", "zod");
    expect(dep.couldNotResolve).toBe(false);
    expect(dep.resolved).toMatch(/node_modules\//);
    expect(violationsFrom("src/core/uses-zod.ts")).toEqual([]);
  });

  it("의존 규칙: src/app 이 src/server/ai 를 가져오면 ai-only-from-server 위반", () => {
    expect(violationsFrom("src/app/page.tsx")).toEqual(["ai-only-from-server"]);
  });

  it("의존 규칙: src/server 안에서 src/server/ai 를 가져오는 것은 허용", () => {
    const dep = resolvedDependency(
      "src/server/actions/write.ts",
      "@/server/ai/client",
    );
    expect(dep.resolved).toBe("src/server/ai/client.ts");
    expect(violationsFrom("src/server/actions/write.ts")).toEqual([]);
  });

  it("의존 규칙: src/server/ai 가 @anthropic-ai/sdk 를 가져오는 것은 허용", () => {
    const dep = resolvedDependency(
      "src/server/ai/client.ts",
      "@anthropic-ai/sdk",
    );
    expect(dep.couldNotResolve).toBe(false);
    expect(dep.resolved).toMatch(/node_modules\//);
    expect(violationsFrom("src/server/ai/client.ts")).toEqual([]);
  });

  it("의존 규칙: src/server/ai 밖에서 @anthropic-ai/sdk 를 가져오면 sdk-only-in-ai 위반", () => {
    expect(violationsFrom("src/app/direct-sdk.ts")).toEqual(["sdk-only-in-ai"]);
  });

  it("의존 규칙: src/app 이 별칭 @/db 를 가져오면 db-only-from-server 위반", () => {
    expect(violationsFrom("src/app/uses-db.ts")).toEqual([
      "db-only-from-server",
    ]);
  });

  it("의존 규칙: src/server 가 src/db · drizzle-orm 을 가져오는 것은 허용", () => {
    expect(
      resolvedDependency("src/server/db/index.ts", "@/db/schema").resolved,
    ).toBe("src/db/schema.ts");
    const orm = resolvedDependency("src/server/db/index.ts", "drizzle-orm");
    expect(orm.couldNotResolve).toBe(false);
    expect(orm.resolved).toMatch(/node_modules\//);
    expect(violationsFrom("src/server/db/index.ts")).toEqual([]);
  });

  it("의존 규칙: 앱 코드가 가짜 Web Speech 를 가져오면 no-fake-speech-in-app 위반", () => {
    expect(violationsFrom("src/app/uses-fake-speech.ts")).toEqual([
      "no-fake-speech-in-app",
    ]);
  });

  it("의존 규칙: 앱 코드가 브라우저 음성 구현을 가져오는 것은 허용", () => {
    const dep = resolvedDependency(
      "src/app/uses-browser-speech.ts",
      "@/lib/speech/browser",
    );
    expect(dep.resolved).toBe("src/lib/speech/browser.ts");
    expect(violationsFrom("src/app/uses-browser-speech.ts")).toEqual([]);
    expect(violationsFrom("src/lib/speech/fake-web-speech.ts")).toEqual([]);
  });

  it("의존 규칙: src/proxy.ts 가 src/server/settings 를 가져오면 proxy-stays-light 위반", () => {
    const targets = result.summary.violations
      .filter(
        (v) => v.from === "src/proxy.ts" && v.rule.name === "proxy-stays-light",
      )
      .map((v) => v.to);
    expect(targets).toContain("src/server/settings/index.ts");
    expect(
      violationsFrom("src/proxy.ts").every((n) => n === "proxy-stays-light"),
    ).toBe(true);
  });

  it("의존 규칙: src/proxy.ts 가 한 단계 건너(src/server/relay → src/server/db) DB 를 끌어와도 proxy-stays-light 위반", () => {
    const targets = result.summary.violations
      .filter(
        (v) => v.from === "src/proxy.ts" && v.rule.name === "proxy-stays-light",
      )
      .map((v) => v.to);
    expect(targets).toContain("src/server/db/index.ts");
    // 건너는 모듈 자체(relay)는 막는 대상이 아니다
    expect(targets).not.toContain("src/server/relay.ts");
  });

  it("의존 규칙: 앱 화면이 src/server/seed-viewer 를 가져오면 seed-viewer-only-from-viewer 위반", () => {
    expect(violationsFrom("src/app/uses-seed-viewer.tsx")).toEqual([
      "seed-viewer-only-from-viewer",
    ]);
  });

  it("의존 규칙: 시드 보기 화면(src/app/dev/seed-viewer)이 src/server/seed-viewer 를 가져오는 것은 허용", () => {
    const dep = resolvedDependency(
      "src/app/dev/seed-viewer/page.local.tsx",
      "@/server/seed-viewer/files",
    );
    expect(dep.resolved).toBe("src/server/seed-viewer/files.ts");
    expect(violationsFrom("src/app/dev/seed-viewer/page.local.tsx")).toEqual(
      [],
    );
  });

  it("AC-N12 의존 규칙: 3D 그림 층(avatar-3d) 밖에서 three · @pixiv/three-vrm 을 가져오면 three-only-in-avatar 위반", () => {
    expect(violationsFrom("src/components/uses-three.ts")).toEqual([
      "three-only-in-avatar",
    ]);
    expect(violationsFrom("src/components/uses-three-vrm.ts")).toEqual([
      "three-only-in-avatar",
    ]);
  });

  it("AC-N12 의존 규칙: 3D 그림 층(avatar-3d)이 three · @pixiv/three-vrm 을 가져오는 것은 허용", () => {
    expect(violationsFrom("src/components/teacher/avatar-3d.ts")).toEqual([]);
    for (const name of ["three", "@pixiv/three-vrm"]) {
      const dep = resolvedDependency(
        "src/components/teacher/avatar-3d.ts",
        name,
      );
      expect(dep.couldNotResolve, name).toBe(false);
    }
  });

  it("AC-N12 의존 규칙: avatar-3d 를 정적으로 가져오면 avatar-only-dynamic 위반이고 동적 가져오기(import())는 허용", () => {
    expect(violationsFrom("src/app/static-avatar.tsx")).toEqual([
      "avatar-only-dynamic",
    ]);
    expect(violationsFrom("src/components/teacher/teacher-layer.tsx")).toEqual(
      [],
    );
    const dep = resolvedDependency(
      "src/components/teacher/teacher-layer.tsx",
      "@/components/teacher/avatar-3d",
    );
    expect(dep.resolved).toBe("src/components/teacher/avatar-3d.ts");
  });

  it("의존 규칙: 서로 가져오는 두 파일은 no-circular 위반", () => {
    // dependency-cruiser 는 한 고리를 한 번만(먼저 만난 쪽에서) 보고한다.
    const circular = result.summary.violations
      .filter((v) => v.rule.name === "no-circular")
      .map((v) => `${v.from} -> ${v.to}`);
    expect(circular).toHaveLength(1);
    expect([
      "src/lib/a.ts -> src/lib/b.ts",
      "src/lib/b.ts -> src/lib/a.ts",
    ]).toContain(circular[0]);
  });
});

type ForbiddenRule = { name: string; to: { path?: string } };

describe("의존 규칙 정규식", () => {
  it("의존 규칙: 패키지 정규식이 두 경로 꼴을 받고 이름이 비슷한 다른 패키지는 안 받는다", () => {
    const config = createRequire(import.meta.url)(CONFIG) as {
      forbidden: ForbiddenRule[];
    };
    const packageRules: Record<string, { take: string[]; reject: string[] }> = {
      "core-no-framework": {
        take: [
          "next",
          "react",
          "react-dom",
          "drizzle-orm",
          "drizzle-kit",
          "postgres",
        ],
        reject: [
          "next-themes",
          "postgres-array",
          "@types/react",
          "react-is",
          "drizzle-zod",
          "zod",
        ],
      },
      "db-only-from-server": {
        take: ["drizzle-orm", "postgres"],
        reject: ["postgres-array", "drizzle-zod", "zod"],
      },
      "sdk-only-in-ai": {
        take: ["@anthropic-ai/sdk"],
        reject: ["@anthropic-ai/sdk-extra", "@anthropic-ai/tokenizer", "zod"],
      },
      "three-only-in-avatar": {
        take: [
          "three",
          "@types/three",
          "@pixiv/three-vrm",
          "@pixiv/three-vrm-core",
          "@pixiv/three-vrm-materials-mtoon",
        ],
        reject: ["three-mesh-bvh", "threejs", "@pixiv/other", "zod"],
      },
    };
    const forms = (name: string) => [
      `node_modules/${name}/index.js`,
      `node_modules/.pnpm/${name.replace("/", "+")}@1.0.0/node_modules/${name}/index.js`,
      `../../node_modules/${name}/index.js`,
    ];
    for (const [ruleName, expected] of Object.entries(packageRules)) {
      const rule = config.forbidden.find((r) => r.name === ruleName);
      expect(rule?.to.path, ruleName).toBeDefined();
      const pattern = new RegExp(rule?.to.path ?? "");
      for (const name of expected.take) {
        for (const path of forms(name)) {
          expect(pattern.test(path), `${ruleName} 가 ${path} 를 받는다`).toBe(
            true,
          );
        }
      }
      for (const name of expected.reject) {
        for (const path of forms(name)) {
          expect(
            pattern.test(path),
            `${ruleName} 가 ${path} 를 안 받는다`,
          ).toBe(false);
        }
      }
    }
    // core-no-framework 의 앱 쪽 갈래는 src/db · src/server 만 받는다.
    const core = new RegExp(
      config.forbidden.find((r) => r.name === "core-no-framework")?.to.path ??
        "",
    );
    expect(core.test("src/db/schema.ts")).toBe(true);
    expect(core.test("src/server/clock.ts")).toBe(true);
    expect(core.test("src/serverless/x.ts")).toBe(false);
    expect(core.test("src/core/x.ts")).toBe(false);
  });
});

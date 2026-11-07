import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import {
  collectSecretValues,
  findLeaks,
  listTargetFiles,
  MIN_SECRET_LENGTH,
  parseServerEnvNames,
  runCheck,
} from "../../scripts/check-bundle";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// 가짜 키 · 접속 문자열은 실행 때 조각을 잇는다. 원문 꼴이 저장소에 들어가면
// GitHub push 보호에 걸리고 비밀 검사가 시끄러워진다(plan-p01b 위험 9).
const fakeAnthropicKey = () => ["sk", "ant", "api03", "x".repeat(40)].join("-");
const fakeDbUrl = () =>
  [
    ["postgresql", ""].join(":"),
    "",
    ["app_user", ["p".repeat(12), "db.example.test"].join("@")].join(":"),
    "postgres",
  ].join("/");

const ENV_EXAMPLE = [
  "# 주석",
  "DATABASE_URL=",
  "ACCESS_CODE_HASH=",
  "ANTHROPIC_API_KEY=",
  "CLOCK_SHIFT_DAYS=",
  "NEXT_PUBLIC_SITE_NAME=",
  "",
].join("\n");

const clean = (content = "console.log('hello')") => ({
  path: ".next/static/chunks/app.js",
  content,
});

const tmpDirs: string[] = [];
afterAll(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});

describe("번들 검사", () => {
  it("AC-N4 번들 검사: Anthropic 키 꼴이 있으면 위반을 낸다", () => {
    const key = fakeAnthropicKey();
    const leaks = findLeaks([clean(`const k="${key}";`)], {
      names: [],
      values: [],
    });
    expect(leaks).toEqual([
      { file: ".next/static/chunks/app.js", rule: "anthropic-key", name: "-" },
    ]);
    // 'sk-ant-' 뒤가 16자보다 짧으면 키 꼴이 아니다.
    expect(
      findLeaks([clean(["sk", "ant", "short"].join("-"))], {
        names: [],
        values: [],
      }),
    ).toEqual([]);
  });

  it("AC-N4 번들 검사: 사용자:비밀번호가 든 DB 접속 문자열이 있으면 위반을 낸다", () => {
    const leaks = findLeaks([clean(`fetch("${fakeDbUrl()}")`)], {
      names: [],
      values: [],
    });
    expect(leaks).toEqual([
      { file: ".next/static/chunks/app.js", rule: "db-url", name: "-" },
    ]);
    // 사용자:비밀번호가 없는 주소는 위반이 아니다.
    const noCredentials = [
      ["postgres", ""].join(":"),
      "",
      "localhost",
      "db",
    ].join("/");
    expect(
      findLeaks([clean(noCredentials)], { names: [], values: [] }),
    ).toEqual([]);
  });

  it("AC-N4 번들 검사: .env.example 의 서버 변수 이름이 있으면 위반을 내고 NEXT_PUBLIC_ 는 뺀다", () => {
    const names = parseServerEnvNames(ENV_EXAMPLE);
    expect(names).toEqual([
      "DATABASE_URL",
      "ACCESS_CODE_HASH",
      "ANTHROPIC_API_KEY",
      "CLOCK_SHIFT_DAYS",
    ]);
    const leaks = findLeaks(
      [
        clean(
          "process.env.ACCESS_CODE_HASH; process.env.NEXT_PUBLIC_SITE_NAME",
        ),
        {
          path: ".next/static/chunks/other.js",
          content: "MY_DATABASE_URL_EXTRA ACCESS_CODE_HASHED",
        },
      ],
      { names, values: [] },
    );
    expect(leaks).toEqual([
      {
        file: ".next/static/chunks/app.js",
        rule: "server-env-name",
        name: "ACCESS_CODE_HASH",
      },
    ]);
  });

  it("AC-N4 번들 검사: 환경에 있는 서버 변수 값이 있으면 위반을 내고 값은 출력하지 않는다", () => {
    const hash = randomBytes(24).toString("hex");
    const names = parseServerEnvNames(ENV_EXAMPLE);
    const values = collectSecretValues(names, [
      { ACCESS_CODE_HASH: hash, CLOCK_SHIFT_DAYS: "3" },
      { NEXT_PUBLIC_SITE_NAME: "momo-english-academy" },
    ]);
    // 짧은 값(MIN_SECRET_LENGTH 미만)과 NEXT_PUBLIC_ 값은 대조하지 않는다.
    expect(values.map((v) => v.name)).toEqual(["ACCESS_CODE_HASH"]);
    expect("3".length).toBeLessThan(MIN_SECRET_LENGTH);

    const { code, lines } = runCheck({
      files: [clean(`const h = "${hash}";`)],
      envExampleText: ENV_EXAMPLE,
      envSources: [{ ACCESS_CODE_HASH: hash }],
    });
    expect(code).toBe(1);
    expect(lines).toContain(
      ".next/static/chunks/app.js server-env-value ACCESS_CODE_HASH",
    );
    expect(lines[0]).toContain("대조한 값 1");
    expect(lines.join("\n")).not.toContain(hash);
    expect(lines.join("\n")).not.toContain(hash.slice(0, 6));
  });

  it("AC-N4 번들 검사: 키 · 접속 문자열 원문은 출력에 나오지 않는다", () => {
    const key = fakeAnthropicKey();
    const url = fakeDbUrl();
    const { code, lines } = runCheck({
      files: [clean(`"${key}" "${url}"`)],
      envExampleText: ENV_EXAMPLE,
      envSources: [],
    });
    expect(code).toBe(1);
    const output = lines.join("\n");
    expect(output).not.toContain("sk-ant");
    expect(output).not.toContain("app_user");
    expect(output).not.toContain("p".repeat(12));
  });

  it("AC-N4 번들 검사: 검사할 파일이 0개면 실패한다", () => {
    expect(
      runCheck({ files: [], envExampleText: ENV_EXAMPLE, envSources: [] }).code,
    ).toBe(2);
    expect(
      runCheck({ files: [clean()], envExampleText: undefined, envSources: [] })
        .code,
    ).toBe(2);
    // static 0 · 화면 파일만 있음: 클라이언트 묶음을 하나도 안 본 것이므로 실패다.
    const onlyPrerendered = runCheck({
      files: [{ path: ".next/server/app/index.html", content: "<p>hi</p>" }],
      envExampleText: ENV_EXAMPLE,
      envSources: [],
    });
    expect(onlyPrerendered.code).toBe(2);
    expect(onlyPrerendered.lines[0]).toContain(".next/static");
    // 화면 파일 0 · static 만 있음: 화면이 동적이 되면 정상이다.
    expect(
      runCheck({
        files: [clean()],
        envExampleText: ENV_EXAMPLE,
        envSources: [],
      }).code,
    ).toBe(0);
  });

  it("AC-N4 번들 검사: 깨끗한 묶음은 위반 0", () => {
    const { code, lines } = runCheck({
      files: [
        clean(),
        { path: ".next/server/app/index.html", content: "<p>hi</p>" },
      ],
      envExampleText: ENV_EXAMPLE,
      envSources: [],
    });
    expect(code).toBe(0);
    expect(lines).toEqual([
      "check-bundle: 파일 2 · static 1 · 화면 파일 1 · 서버 변수 이름 4 · 대조한 값 0 · 위반 0",
    ]);
  });

  it("AC-N4 번들 검사: .next/static 의 모든 파일과 server/app 의 html · rsc 만 본다", () => {
    const root = join(
      REPO_ROOT,
      "tests/.tmp",
      `bundle-${randomBytes(6).toString("hex")}`,
    );
    tmpDirs.push(root);
    const files = [
      ".next/static/chunks/a.js",
      ".next/static/media/font.woff2",
      ".next/server/app/index.html",
      ".next/server/app/index.rsc",
      ".next/server/app/page.js",
      ".next/server/chunks/ssr.js",
      ".next/cache/x.json",
    ];
    for (const rel of files) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), "x");
    }
    expect(listTargetFiles(root)).toEqual([
      ".next/server/app/index.html",
      ".next/server/app/index.rsc",
      ".next/static/chunks/a.js",
      ".next/static/media/font.woff2",
    ]);
    expect(listTargetFiles(join(root, "no-such-dir"))).toEqual([]);
  });
});

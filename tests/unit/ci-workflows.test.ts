// 작업 파일 대조(plan-p07b 파일별 값 6, 5절 적재 문단 · 10절 배포 · CI · 운영, AC-17b · AC-7a · AC-7g CI 몫).
// 작업 파일을 글로 읽어 맞댄다(YAML 풀기 꾸러미는 새 개발 의존이라 들이지 않는다, plan 위험 7).
// 작업 파일 꼴을 크게 바꾸면 이 시험도 같이 바꾼다.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CI_FAIL_ON } from "../../scripts/check-ids";

const WORKFLOWS = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../.github/workflows",
);

/** 따옴표 밖의 ' #' 뒤를 지운다(줄 전체 주석 포함). */
function stripComment(line: string): string {
  let quote: string | undefined;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote) quote = undefined;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "#" && (i === 0 || /\s/.test(line[i - 1] ?? ""))) {
      return line.slice(0, i).trimEnd();
    }
  }
  return line;
}

/** 주석 · 빈 줄을 뺀 글. */
function clean(text: string): string {
  return text
    .split("\n")
    .map(stripComment)
    .filter((line) => line.trim() !== "")
    .join("\n");
}

function read(name: string): string {
  return clean(readFileSync(resolve(WORKFLOWS, name), "utf8"));
}

const indentOf = (line: string) => line.length - line.trimStart().length;

/** 들여쓰기 indent 의 `key:` 아래 블록(그보다 깊은 줄). */
function blockAt(lines: string[], start: number, indent: number): string[] {
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (indentOf(line) <= indent) break;
    out.push(line);
  }
  return out;
}

/** 맨 위 키의 블록. */
function topBlock(text: string, key: string): string[] {
  const lines = text.split("\n");
  const start = lines.indexOf(`${key}:`);
  return start < 0 ? [] : blockAt(lines, start, 0);
}

/** `jobs:` 아래 두 칸 들여쓴 키 → 작업 몸통 줄. */
function jobsOf(text: string): Map<string, string[]> {
  const lines = topBlock(text, "jobs");
  const jobs = new Map<string, string[]>();
  lines.forEach((line, i) => {
    const m = /^ {2}([A-Za-z0-9_-]+):$/.exec(line);
    if (m?.[1]) jobs.set(m[1], blockAt(lines, i, 2));
  });
  return jobs;
}

type Step = {
  name?: string;
  run?: string;
  if?: string;
  uses?: string;
  env: Record<string, string>;
  raw: string;
};

/** 작업 몸통의 `steps:` 아래 `- ` 항목. */
function stepsOf(job: string[]): Step[] {
  const start = job.findIndex((l) => /^ {4}steps:$/.test(l));
  if (start < 0) return [];
  const body = blockAt(job, start, 4);
  const items: string[][] = [];
  for (const line of body) {
    if (/^ {6}- /.test(line)) items.push([line.replace(/^( {6})- /, "$1  ")]);
    else items.at(-1)?.push(line);
  }
  return items.map((lines) => {
    const step: Step = { env: {}, raw: lines.join("\n") };
    lines.forEach((line, i) => {
      const m = /^ {8}([a-z-]+):\s?(.*)$/.exec(line);
      if (!m?.[1]) return;
      const [, key, value = ""] = m;
      const block = blockAt(lines, i, 8);
      if (key === "run") {
        // 블록 꼴 | · |- · |+ · > · >- · >+ 는 아래 줄이 글이다(검토 M-4)
        step.run = /^[|>][-+]?$/.test(value.trim())
          ? block.map((l) => l.trim()).join("\n")
          : value.trim();
      } else if (key === "env") {
        for (const l of block) {
          const e = /^\s*([A-Z_]+):\s*(.*)$/.exec(l);
          if (e?.[1]) step.env[e[1]] = e[2] ?? "";
        }
      } else if (key === "name" || key === "if" || key === "uses") {
        step[key] = value.trim();
      }
    });
    return step;
  });
}

/** 작업 몸통의 `env:` (작업 수준). */
function jobEnv(job: string[]): string[] {
  const start = job.findIndex((l) => /^ {4}env:$/.test(l));
  return start < 0 ? [] : blockAt(job, start, 4);
}

const secretsIn = (text: string) =>
  [...text.matchAll(/secrets\.([A-Z0-9_]+)/g)].map((m) => m[1] ?? "");

/** 작업 파일의 식 글자 `${{ … }}`(글자 그대로 적으면 Biome 이 틀 글자 실수로 본다). */
const expr = (body: string) => `$\{{ ${body} }}`;

/** run 글에 식으로 바로 넣으면 안 되는 것(공백 유무와 무관, 검토 M-4). */
const FORBIDDEN_IN_RUN = /\$\{\{\s*(inputs|secrets|github\.event\.inputs)\b/;
/** 비밀값을 통째로 넘기는 꼴(점 꼴 secrets.X 밖, 검토 M-4). */
const BULK_SECRETS = /toJSON\(\s*secrets\s*\)|secrets\s*\[|secrets:\s*inherit/;
/** 운영 비밀값을 읽어도 되는 작업 파일(C68 (4)). */
const PROD_READERS = ["main.yml", "keepalive.yml"];

/** 작업 파일 하나의 '입력 · 비밀값은 env 로만 · 시각 당기기 없음 · 운영 비밀값 자리' 위반(주석 뺀 글). */
function problemsOf(file: string, text: string): string[] {
  const problems: string[] = [];
  if (text.includes("CLOCK_SHIFT_DAYS"))
    problems.push(`${file}: CLOCK_SHIFT_DAYS`);
  // 맨 위 env 와 작업 수준 env 에 비밀값을 두지 않는다(설치 단계가 읽을 수 있다, plan 위험 11)
  if (/secrets\s*[.[]/.test(topBlock(text, "env").join("\n"))) {
    problems.push(`${file}: 맨 위 env 에 비밀값`);
  }
  for (const [name, job] of jobsOf(text)) {
    if (/secrets\s*[.[]/.test(jobEnv(job).join("\n"))) {
      problems.push(`${file} ${name}: 작업 수준 env 에 비밀값`);
    }
    for (const step of stepsOf(job)) {
      if (FORBIDDEN_IN_RUN.test(step.run ?? "")) {
        problems.push(`${file} ${name}: run 글에 입력 · 비밀값 식`);
      }
    }
  }
  if (!PROD_READERS.includes(file)) {
    if (BULK_SECRETS.test(text)) problems.push(`${file}: 비밀값을 통째로 넘김`);
    if (text.includes("PROD_")) problems.push(`${file}: 운영 비밀값`);
  }
  return problems;
}

const runIndex = (steps: Step[], command: string) =>
  steps.findIndex((s) =>
    (s.run ?? "").split("\n").some((l) => l.trim() === command),
  );

const workflowFiles = () =>
  readdirSync(WORKFLOWS).filter(
    (f) => f.endsWith(".yml") || f.endsWith(".yaml"),
  );

describe("CI 작업 파일(main · dev-load · keepalive · ci)", () => {
  it("AC-17b · AC-7a main 작업: 한 작업(main) 안에서 migrate → seed:validate --complete-through settings → seed:load 차례이고 continue-on-error · always() · failure() 가 없어 앞 단계가 실패하면 뒤 단계가 돌지 않는다", () => {
    const text = read("main.yml");
    const jobs = jobsOf(text);
    expect([...jobs.keys()]).toEqual(["main"]);
    const job = jobs.get("main") ?? [];
    const steps = stepsOf(job);
    const migrate = runIndex(steps, "pnpm db:migrate");
    const validate = runIndex(
      steps,
      "pnpm seed:validate --complete-through settings",
    );
    const load = runIndex(steps, "pnpm seed:load");
    expect(migrate).toBeGreaterThan(-1);
    expect(validate).toBeGreaterThan(migrate);
    expect(load).toBeGreaterThan(validate);
    expect(steps.map((s) => s.name).filter(Boolean)).toEqual([
      "prod-secrets",
      "migrate",
      "seed-validate",
      "seed-load",
    ]);
    for (const banned of [
      "continue-on-error",
      "always()",
      "failure()",
      "cancelled()",
      "needs:",
    ]) {
      expect(text).not.toContain(banned);
    }
    // 비밀값이 없으면 마이그레이션 전에 실패한다
    expect(steps[runIndex(steps, "exit 1")]?.name).toBe("prod-secrets");
  });

  it("AC-17b main 작업: main 갈래 push 로 돌고 저장소 변수 PROD_RELEASE 가 on 일 때만 돌며 운영 비밀값(PROD_)만 읽는다", () => {
    const text = read("main.yml");
    expect(topBlock(text, "on")).toEqual(["  push:", "    branches: [main]"]);
    const job = jobsOf(text).get("main") ?? [];
    expect(job).toContain(`    if: ${expr("vars.PROD_RELEASE == 'on'")}`);
    expect(topBlock(text, "concurrency")).toContain(
      "  cancel-in-progress: false",
    );
    const secrets = secretsIn(text);
    expect(secrets.length).toBeGreaterThan(0);
    expect(secrets.every((s) => s.startsWith("PROD_"))).toBe(true);
    const steps = stepsOf(job);
    for (const name of ["migrate", "seed-load"]) {
      expect(steps.find((s) => s.name === name)?.env).toEqual({
        MIGRATION_DATABASE_URL: expr("secrets.PROD_MIGRATION_DATABASE_URL"),
      });
    }
    // 시드 검증은 DB 에 닿지 않는다
    expect(steps.find((s) => s.name === "seed-validate")?.env).toEqual({});
  });

  it("AC-7g dev-load: 수동 실행이고 complete_through · areas 입력을 seed:validate · seed:load 에 그대로 넘기며 운영 비밀값(PROD_)을 읽지 않는다", () => {
    const text = read("dev-load.yml");
    const on = topBlock(text, "on");
    expect(on[0]).toBe("  workflow_dispatch:");
    expect(on.some((l) => /^ {2}(push|pull_request|schedule):/.test(l))).toBe(
      false,
    );
    const inputs = on.join("\n");
    expect(inputs).toMatch(
      /complete_through:\n(?: {8}.*\n)*? {8}type: number\n(?: {8}.*\n)*? {8}required: true/,
    );
    expect(inputs).toMatch(/areas:\n(?: {8}.*\n)*? {8}type: string/);
    expect(inputs).toMatch(/reference_only:\n(?: {8}.*\n)*? {8}type: boolean/);
    const jobs = jobsOf(text);
    expect([...jobs.keys()]).toEqual(["dev-load"]);
    const job = jobs.get("dev-load") ?? [];
    expect(jobEnv(job)).toEqual([
      `      THROUGH: ${expr("inputs.complete_through")}`,
      `      AREAS: ${expr("inputs.areas")}`,
      `      REFERENCE_ONLY: ${expr("inputs.reference_only")}`,
    ]);
    const steps = stepsOf(job);
    expect(steps.map((s) => s.name).filter(Boolean)).toEqual([
      "dev-secrets",
      "migrate",
      "seed-validate",
      "seed-load",
      "check-data-api",
    ]);
    const validate = steps.find((s) => s.name === "seed-validate")?.run ?? "";
    expect(validate).toContain(
      'pnpm seed:validate --complete-through "$THROUGH" --areas "$AREAS"',
    );
    const load = steps.find((s) => s.name === "seed-load")?.run ?? "";
    expect(load).toContain(
      'pnpm seed:load --complete-through "$THROUGH" --areas "$AREAS"',
    );
    expect(load).toContain(
      'pnpm seed:load --reference-only --complete-through "$THROUGH"',
    );
    expect(steps.find((s) => s.name === "check-data-api")?.run).toContain(
      "pnpm check:data-api",
    );
    const secrets = secretsIn(text);
    expect(secrets.length).toBeGreaterThan(0);
    expect(secrets.every((s) => s.startsWith("DEV_"))).toBe(true);
    expect(text).not.toContain("PROD_");
  });

  it("AC-7g ci / seed-validate: PR 은 --complete-through 없이 돌아 빈 칸을 보고만 한다", () => {
    const text = read("ci.yml");
    expect(topBlock(text, "on")).toContain("  pull_request:");
    const steps = stepsOf(jobsOf(text).get("seed-validate") ?? []);
    const runs = steps
      .map((s) => s.run ?? "")
      .filter((r) => r.includes("seed:validate"));
    expect(runs).toEqual(["pnpm seed:validate"]);
  });

  it("식별자 대조 ci / check-ids: PR 마다 --fail-on 으로 돌고 그 규칙이 check-ids 의 CI 규칙 목록(design-number 뺀 아홉)과 같다", () => {
    const text = read("ci.yml");
    const job = jobsOf(text).get("check-ids");
    expect(job).toBeDefined();
    const runs = stepsOf(job ?? []).map((s) => s.run ?? "");
    expect(runs).toContain("pnpm install --frozen-lockfile");
    expect(runs).toContain(`pnpm check:ids --fail-on ${CI_FAIL_ON.join(",")}`);
    expect(CI_FAIL_ON).not.toContain("design-number");
  });

  it("AC-7g 작업 파일: 입력과 비밀값은 env 로만 넘기고 어느 작업도 CLOCK_SHIFT_DAYS 를 두지 않는다", () => {
    const files = workflowFiles();
    expect(files).toEqual(
      expect.arrayContaining([
        "ci.yml",
        "main.yml",
        "dev-load.yml",
        "keepalive.yml",
      ]),
    );
    for (const file of files) {
      expect(problemsOf(file, read(file))).toEqual([]);
    }
  });

  it("AC-7g 작업 파일 검사: run 의 |- · > 블록, 공백 없는 식, toJSON(secrets) · secrets[…] · secrets: inherit 도 잡는다(거짓 통과 막기)", () => {
    const sample = (job: string[]) =>
      clean(
        ["name: other", "on:", "  workflow_dispatch:", "jobs:", ...job].join(
          "\n",
        ),
      );
    const inputs = expr("inputs.areas").replaceAll(" ", "");
    const secret = expr("secrets.DEV_X").replaceAll(" ", "");
    const bulk = expr("toJSON(secrets)");
    const cases: [string, string[]][] = [
      [
        "run |- 블록의 공백 없는 입력 식",
        [
          "  a:",
          "    steps:",
          "      - name: x",
          "        run: |-",
          `          echo ${inputs}`,
        ],
      ],
      [
        "run > 블록의 공백 없는 비밀값 식",
        [
          "  a:",
          "    steps:",
          "      - name: x",
          "        run: >",
          `          echo ${secret}`,
        ],
      ],
      [
        "작업 수준 env 의 secrets[…]",
        [
          "  a:",
          "    env:",
          `      X: ${expr("secrets['DEV_X']")}`,
          "    steps:",
          "      - run: echo",
        ],
      ],
      [
        "단계 env 의 toJSON(secrets)",
        [
          "  a:",
          "    steps:",
          "      - name: x",
          "        env:",
          `          ALL: ${bulk}`,
          "        run: echo",
        ],
      ],
      [
        "재사용 작업의 secrets: inherit",
        ["  a:", "    uses: ./.github/workflows/x.yml", "    secrets: inherit"],
      ],
      [
        "운영 비밀값 이름",
        [
          "  a:",
          "    steps:",
          "      - name: x",
          "        env:",
          `          U: ${expr("secrets.PROD_DATABASE_URL")}`,
          "        run: echo",
        ],
      ],
    ];
    for (const [label, job] of cases) {
      expect(problemsOf("other.yml", sample(job)), label).not.toEqual([]);
    }
    // 같은 꼴이라도 env 로 넘기고 run 은 셸 변수만 쓰면 위반이 아니다
    const ok = sample([
      "  a:",
      "    steps:",
      "      - name: x",
      "        env:",
      `          AREAS: ${expr("inputs.areas")}`,
      "        run: |-",
      '          echo "$AREAS"',
    ]);
    expect(problemsOf("other.yml", ok)).toEqual([]);
  });

  it("10절 활동 유지(keepalive): 일정과 수동 실행으로 돌고 개발용 · 운영 DB 에 pnpm db:ping 을 보낸다", () => {
    const text = read("keepalive.yml");
    const on = topBlock(text, "on");
    expect(on).toContain("  schedule:");
    expect(on.some((l) => /^ {4}- cron: "[^"]+"$/.test(l))).toBe(true);
    expect(on).toContain("  workflow_dispatch:");
    const jobs = jobsOf(text);
    expect([...jobs.keys()]).toEqual(["keepalive"]);
    const steps = stepsOf(jobs.get("keepalive") ?? []);
    for (const [name, secret] of [
      ["dev-db", "DEV_DATABASE_URL"],
      ["prod-db", "PROD_DATABASE_URL"],
    ] as const) {
      const step = steps.find((s) => s.name === name);
      expect(step?.env).toEqual({ DATABASE_URL: expr(`secrets.${secret}`) });
      expect(step?.run?.split("\n").map((l) => l.trim())).toContain(
        "pnpm db:ping",
      );
    }
    expect(secretsIn(text).sort()).toEqual([
      "DEV_DATABASE_URL",
      "PROD_DATABASE_URL",
    ]);
  });

  it("작업 이름: main · dev-load · keepalive · check-ids 는 다른 작업 파일의 작업 이름과 겹치지 않는다(Vercel Deployment Checks 는 이름으로 고른다)", () => {
    const owners = new Map<string, string[]>();
    for (const file of workflowFiles()) {
      for (const name of jobsOf(read(file)).keys()) {
        owners.set(name, [...(owners.get(name) ?? []), file]);
      }
    }
    expect(owners.get("main")).toEqual(["main.yml"]);
    expect(owners.get("dev-load")).toEqual(["dev-load.yml"]);
    expect(owners.get("keepalive")).toEqual(["keepalive.yml"]);
    expect(owners.get("check-ids")).toEqual(["ci.yml"]);
    for (const [name, files] of owners) expect(files, name).toHaveLength(1);
  });
});

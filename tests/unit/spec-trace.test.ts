import { describe, expect, it } from "vitest";
import {
  exitCode,
  extractTestAcs,
  parseArgs,
  parsePlanProofAcs,
  parseSpecAcs,
  runTrace,
  trace,
} from "../../scripts/spec-trace";

// 견본 시험 소스의 따옴표는 실행 때 잇는다. 글자 그대로 적으면 저장소 전체를 보는
// `pnpm spec:trace` 가 이 견본을 진짜 시험 이름으로 센다.
const Q = '"';
const B = "`";
const call = (fn: string, name: string, quote = Q) =>
  `${fn}(${quote}${name}${quote}, () => {});`;

const SPEC = [
  "# 11. 요구사항과 수용 기준",
  "",
  "## 14. 요구사항 (Requirements)",
  "",
  "| 번호 | 요구 |",
  "|---|---|",
  "| AC-9z | 14절 표의 줄은 세지 않는다 |",
  "",
  "## 15. 수용 기준 (Acceptance)",
  "",
  "| 번호 | 기준 | 증명 방식 | 대상 |",
  "|---|---|---|---|",
  "| AC-1a | 접근 코드 | Playwright | FR-1 |",
  "| AC-1b | 첫 실행 | 통합 | FR-1 |",
  "| AC-12h | 회화 | 단위 | FR-12 |",
  "| AC-N4 | 번들 | CI | NFR |",
  "",
  "## 16. 다음 절",
  "",
  "| AC-2a | 다음 절 표는 세지 않는다 | x | y |",
].join("\n");

const PLAN = [
  "# Plan",
  "",
  "## 작업 순서 (Order of work)",
  "",
  "| AC-1b | 증명 절 밖은 세지 않는다 | x | P1 |",
  "",
  "## 증명 (Proof)",
  "",
  "| 수용 기준 | 증명(시험 이름 · 검사) | 파일 · 명령 | P |",
  "|---|---|---|---|",
  '| AC-1a | 통합 "AC-1a 맞는 코드" | `access.test.ts` | P3 · P10 |',
  "| AC-N4 | CI bundle-secrets | `scripts/check-bundle.ts` | P1 · P9 |",
  "| AC-7q | 15절에 없는 번호 | `x.test.ts` | P5 |",
  "| 공통 | 위 명령과 CI 작업 전부 | `ci` | 전부 |",
  "",
  "## 완료 보고 (Done)",
].join("\n");

describe("spec 추적", () => {
  it("spec 추적: 15절 표에서 AC 번호 두 꼴을 뽑는다", () => {
    const acs = parseSpecAcs(SPEC);
    expect(acs.map((a) => a.ac)).toEqual(["AC-1a", "AC-1b", "AC-12h", "AC-N4"]);
    expect(acs[0]?.line).toBe(13);
  });

  it("spec 추적: 증명 표에서 AC 행만 뽑고 '공통' 행은 뺀다", () => {
    const acs = parsePlanProofAcs(PLAN);
    expect(acs).toEqual([
      { ac: "AC-1a", line: 11, p: "P3 · P10" },
      { ac: "AC-N4", line: 12, p: "P1 · P9" },
      { ac: "AC-7q", line: 13, p: "P5" },
    ]);
  });

  it("spec 추적: test · it · describe · test.describe 의 AC 이름을 뽑는다", () => {
    const source = [
      call("test", "AC-1a 맞는 코드면 쿠키가 생긴다"),
      call("it", "AC-1b 첫 실행", "'"),
      call("describe", "AC-12h 회화 묶음", B),
      call("test.describe", "AC-N4 번들"),
      call("it.concurrent", "AC-2a 홈 카드"),
      call("test.fixme", "AC-2b 수업 목록"),
      call("it", "AC 없이 시작하는 이름"),
      call("it", "중간의 AC-3a 는 세지 않는다"),
      "const name = 'AC-4a 시험 호출이 아닌 글은 세지 않는다';",
      call("it", "AC-5a 마지막 줄"),
    ].join("\n");
    const found = extractTestAcs("tests/unit/x.test.ts", source);
    expect(found.map((f) => [f.ac, f.line])).toEqual([
      ["AC-1a", 1],
      ["AC-1b", 2],
      ["AC-12h", 3],
      ["AC-N4", 4],
      ["AC-2a", 5],
      ["AC-2b", 6],
      ["AC-5a", 10],
    ]);
    expect(found[0]?.file).toBe("tests/unit/x.test.ts");
  });

  it("spec 추적: 15절에 없는 AC 를 쓴 시험은 unknown-ac", () => {
    const result = trace({
      specAcs: parseSpecAcs(SPEC),
      planAcs: [],
      testAcs: extractTestAcs(
        "tests/unit/x.test.ts",
        [call("it", "AC-1a 있다"), call("it", "AC-99z 없다")].join("\n"),
      ),
      planPath: "plan.md",
    });
    expect(result.violations).toEqual([
      expect.objectContaining({
        rule: "unknown-ac",
        ac: "AC-99z",
        location: "tests/unit/x.test.ts:2",
      }),
    ]);
  });

  it("spec 추적: 15절에 없는 증명 표 AC 는 plan-ac-not-in-spec", () => {
    const result = trace({
      specAcs: parseSpecAcs(SPEC),
      planAcs: parsePlanProofAcs(PLAN),
      testAcs: [],
      planPath: "plan.md",
    });
    const notInSpec = result.violations.filter(
      (v) => v.rule === "plan-ac-not-in-spec",
    );
    expect(notInSpec).toEqual([
      expect.objectContaining({ ac: "AC-7q", location: "plan.md:13" }),
    ]);
  });

  it("spec 추적: 시험 없는 증명 표 AC 는 missing-test", () => {
    const result = trace({
      specAcs: parseSpecAcs(SPEC),
      planAcs: parsePlanProofAcs(PLAN),
      testAcs: extractTestAcs(
        "tests/unit/x.test.ts",
        call("it", "AC-1a 맞는 코드"),
      ),
      planPath: "plan.md",
    });
    const missing = result.violations.filter((v) => v.rule === "missing-test");
    expect(missing.map((v) => [v.ac, v.location])).toEqual([
      ["AC-N4", "plan.md:12"],
      ["AC-7q", "plan.md:13"],
    ]);
    expect(missing[0]?.detail).toContain("P1 · P9");
    expect(result.counts).toEqual({
      "unknown-ac": 0,
      "plan-ac-not-in-spec": 1,
      "missing-test": 2,
    });
  });

  it("spec 추적: 기본 0, --fail-on 규칙 위반이면 1, 입력을 못 읽으면 2", () => {
    const counts = {
      "unknown-ac": 0,
      "plan-ac-not-in-spec": 0,
      "missing-test": 3,
    };
    expect(exitCode(counts, [])).toBe(0);
    expect(exitCode(counts, ["unknown-ac", "plan-ac-not-in-spec"])).toBe(0);
    expect(exitCode(counts, ["missing-test"])).toBe(1);

    const tests = [
      { path: "tests/unit/x.test.ts", text: call("it", "AC-1a 맞는 코드") },
    ];
    const ok = runTrace({
      specText: SPEC,
      planText: PLAN,
      planPath: "plan.md",
      tests,
      failOn: [],
    });
    expect(ok.code).toBe(0);
    expect(ok.lines[0]).toContain("missing-test 2");
    expect(
      runTrace({
        specText: SPEC,
        planText: PLAN,
        planPath: "plan.md",
        tests,
        failOn: ["plan-ac-not-in-spec"],
      }).code,
    ).toBe(1);

    // 입력을 못 읽음: 파일 없음 · 표 머리 없음 · AC 0개 · 모르는 규칙 이름
    const base = { planPath: "plan.md", tests, failOn: [] as string[] };
    expect(
      runTrace({ ...base, specText: undefined, planText: PLAN }).code,
    ).toBe(2);
    expect(
      runTrace({ ...base, specText: SPEC, planText: undefined }).code,
    ).toBe(2);
    expect(
      runTrace({ ...base, specText: "# 머리 없음", planText: PLAN }).code,
    ).toBe(2);
    expect(
      runTrace({ ...base, specText: SPEC, planText: "## 증명 (Proof)\n\n없음" })
        .code,
    ).toBe(2);
    expect(
      runTrace({
        ...base,
        specText: SPEC,
        planText: PLAN,
        failOn: ["no-such-rule"],
      }).code,
    ).toBe(2);
  });

  it("spec 추적: 이름 앞의 AC 여럿을 모두 센다", () => {
    const source = [
      call("it", "AC-6a · AC-6b 둘을 덮는다"),
      call("test", "AC-6c, AC-6d/AC-6e 셋"),
    ].join("\n");
    expect(
      extractTestAcs("tests/unit/x.test.ts", source).map((f) => [f.ac, f.line]),
    ).toEqual([
      ["AC-6a", 1],
      ["AC-6b", 1],
      ["AC-6c", 2],
      ["AC-6d", 2],
      ["AC-6e", 2],
    ]);
  });

  it("spec 추적: 본문 속 AC 는 세지 않는다", () => {
    const source = call("it", "AC-7a 는 AC-3b 와 다르다");
    expect(
      extractTestAcs("tests/unit/x.test.ts", source).map((f) => f.ac),
    ).toEqual(["AC-7a"]);
  });

  it("spec 추적: 주석 처리한 시험은 세지 않는다", () => {
    const source = [
      `// ${call("it", "AC-1a 줄 주석 안")}`,
      `/* ${call("it", "AC-1b 블록 주석 안")}`,
      `${call("it", "AC-1c 여러 줄 블록 주석 안")} */`,
      // 글 안의 '/*' · '//' 는 주석이 아니다(아래 진짜 호출을 가리지 않는다).
      'const glob = "tests/**/*.test.ts"; const url = "https://example.test";',
      call("it", "AC-2a 진짜 호출"),
      `/* 닫힌 블록 */ ${call("it", "AC-2b 주석 뒤 같은 줄")}`,
    ].join("\n");
    expect(
      extractTestAcs("tests/unit/x.test.ts", source).map((f) => [f.ac, f.line]),
    ).toEqual([
      ["AC-2a", 5],
      ["AC-2b", 6],
    ]);
  });

  it("spec 추적: AC- 뒤에 토큰이 없는 이름은 unknown-ac 다", () => {
    const result = trace({
      specAcs: parseSpecAcs(SPEC),
      planAcs: [],
      testAcs: extractTestAcs(
        "tests/unit/x.test.ts",
        call("it", "AC-가 이상한 이름"),
      ),
      planPath: "plan.md",
    });
    expect(result.counts["unknown-ac"]).toBe(1);
    expect(result.violations).toEqual([
      expect.objectContaining({
        rule: "unknown-ac",
        ac: "AC-가",
        location: "tests/unit/x.test.ts:1",
        detail: "시험 이름의 AC 가 번호 꼴이 아니다",
      }),
    ]);
  });

  it("spec 추적: 명령 인자 --plan · --fail-on 을 읽는다", () => {
    expect(parseArgs([])).toEqual({ ok: true, plan: undefined, failOn: [] });
    expect(
      parseArgs([
        "--plan",
        "intent/x/plan.md",
        "--fail-on",
        "unknown-ac,missing-test",
      ]),
    ).toEqual({
      ok: true,
      plan: "intent/x/plan.md",
      failOn: ["unknown-ac", "missing-test"],
    });
    expect(parseArgs(["--fail-on"]).ok).toBe(false);
    expect(parseArgs(["--what"]).ok).toBe(false);
  });
});

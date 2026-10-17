// 식별자 대조(plan-p07b 파일별 값 1, 역분석 제안 6 · 조사 P5 · 묶음 위험 4 · C51).
// 견본 정본 · 시드 · 코드는 시험 안에서 만든다. 저장소 시험 하나만 실제 specs/ · 스키마 · 코드를 읽는다.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AI_PURPOSES } from "@/core/ai/combo";
import { AREAS, BAND_NAMES } from "@/core/seed/structure";
import {
  type CheckIdsIo,
  CI_FAIL_ON,
  checkIds,
  collectCodeKeys,
  collectDesignNumbers,
  DATA_SPEC_FILE,
  expandSpecKeys,
  parseArgs,
  parseSettingsTable,
  parseSpecDefault,
  parseTableNames,
  RULES,
  runCheckIds,
  SEED_RULES,
  SETTINGS_SPEC_FILE,
  type SeedInput,
  schemaTableNames,
  settingNumbers,
} from "../../scripts/check-ids";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** 견본 12절 표 줄. 칸: 키 · 범위 · 기본값 · 바꾸는 곳. */
const ROWS: [string, string, string, string][] = [
  ["unit.vocab_count.<구간>", "집 전체", "25 · 30 · 30 · 30", "시드"],
  ["unit.vocab_mastery", "집 전체", "0.80", "결정 기록 먼저"],
  ["unit.remedial_batch", "집 전체", "7", "고급"],
  [
    "profile.start_level.<영역>",
    "프로필",
    "비움(기본 행 없음, C61)",
    "첫 실행 화면",
  ],
  [
    "writing.max_corrections",
    "집 전체",
    "6~9단계 2, 10~12단계 3",
    "결정 기록 먼저",
  ],
  ["writing.rule_check_until_level", "집 전체", "3", "결정 기록 먼저"],
  ["speech.lang", "집 전체", "en-US", "시드"],
  ["review.intervals_days", "집 전체", "1 · 2 · 4 · 30", "고급"],
  ["session.length_factor", "프로필", "1.0", "기본"],
  ["ai.model.<호출>", "집 전체", "6.1 표", "고급"],
  ["ai.effort.<호출>", "집 전체", "6.1 표", "고급"],
  ["ai.thinking.<호출>", "집 전체", "회화 턴 '끔', 나머지 '적응'", "고급"],
  ["ai.thinking.talk_turn.<구간>", "집 전체", "끔 · 끔 · 끔 · 끔", "고급"],
  [
    "ai.max_tokens.<호출>",
    "집 전체",
    "writing_feedback 8000 · writing_check · speaking_eval · thinkout 4000 · talk_turn 1000 · talk_closing(끝맺음 턴) 2000 · probe 1",
    "고급",
  ],
];

function specText(rows = ROWS): string {
  return [
    "# spec — 12절 — 설정값",
    "",
    "## 12. 설정값",
    "",
    "| 키 | 범위 | 기본값 | 뜻 | 바꾸는 곳 |",
    "|---|---|---|---|---|",
    ...rows.map(([k, s, d, c]) => `| ${k} | ${s} | ${d} | 뜻 칸 | ${c} |`),
    "",
    "이전 판의 unit.generated_sessions 는 표 밖이라 세지 않는다.",
  ].join("\n");
}

const DATA_SPEC = [
  "## 5. 데이터",
  "",
  "| 테이블 | 역할 |",
  "|---|---|",
  "| profiles | 아이 |",
  "| settings | 설정값 |",
  "",
  "| 전이 | 계기 |",
  "|---|---|",
  "| 진행 → 완료 | 표 밖 |",
].join("\n");

type Row = {
  key: string;
  scope: "household" | "profile";
  value: unknown;
  changeVia: string;
};

/** 견본 12절과 같은 시드 행(펼친 키 모두, 기본값 그대로). */
function goodSettings(): Row[] {
  const band = (prefix: string, values: unknown[], changeVia: string) =>
    BAND_NAMES.map((b, i) => ({
      key: `${prefix}.${b}`,
      scope: "household" as const,
      value: values[i],
      changeVia,
    }));
  const calls4 = [
    "writing_feedback",
    "writing_check",
    "speaking_eval",
    "thinkout",
  ];
  const tokens: Record<string, number> = {
    writing_feedback: 8000,
    writing_check: 4000,
    speaking_eval: 4000,
    thinkout: 4000,
    talk_turn: 1000,
    talk_closing: 2000,
    probe: 1,
  };
  return [
    ...band("unit.vocab_count", [25, 30, 30, 30], "seed"),
    {
      key: "unit.vocab_mastery",
      scope: "household",
      value: 0.8,
      changeVia: "decision-first",
    },
    {
      key: "unit.remedial_batch",
      scope: "household",
      value: 7,
      changeVia: "advanced",
    },
    {
      key: "writing.max_corrections",
      scope: "household",
      value: { "6": 2, "7": 2, "8": 2, "9": 2, "10": 3, "11": 3, "12": 3 },
      changeVia: "decision-first",
    },
    {
      key: "writing.rule_check_until_level",
      scope: "household",
      value: 3,
      changeVia: "decision-first",
    },
    {
      key: "speech.lang",
      scope: "household",
      value: "en-US",
      changeVia: "seed",
    },
    {
      key: "review.intervals_days",
      scope: "household",
      value: [1, 2, 4, 30],
      changeVia: "advanced",
    },
    {
      key: "session.length_factor",
      scope: "profile",
      value: 1,
      changeVia: "basic",
    },
    ...calls4.map((c) => ({
      key: `ai.model.${c}`,
      scope: "household" as const,
      value: "claude-sonnet-5-5",
      changeVia: "advanced",
    })),
    ...calls4.map((c) => ({
      key: `ai.effort.${c}`,
      scope: "household" as const,
      value: "low",
      changeVia: "advanced",
    })),
    ...calls4.map((c) => ({
      key: `ai.thinking.${c}`,
      scope: "household" as const,
      value: "adaptive",
      changeVia: "advanced",
    })),
    ...band("ai.thinking.talk_turn", ["off", "off", "off", "off"], "advanced"),
    ...AI_PURPOSES.map((c) => ({
      key: `ai.max_tokens.${c}`,
      scope: "household" as const,
      value: tokens[c],
      changeVia: "advanced",
    })),
  ];
}

/** 쓰기 단계 규격 행(maxCorrections 만 보는 꼴). */
function writingSpecs(values: Record<number, number | undefined>) {
  return Object.entries(values).map(([level, maxCorrections]) => ({
    area: "writing" as const,
    level: Number(level),
    ...(maxCorrections === undefined ? {} : { maxCorrections }),
  }));
}

function seedOf(
  settings: Row[] = goodSettings(),
  levelSpecs = writingSpecs({
    4: 1,
    6: 2,
    7: 2,
    8: 2,
    9: 2,
    10: 3,
    11: 3,
    12: 3,
  }),
): SeedInput {
  return { settings, levelSpecs } as SeedInput;
}

function baseInput(overrides: Partial<Parameters<typeof checkIds>[0]> = {}) {
  return {
    settingsSpecText: specText(),
    dataSpecText: DATA_SPEC,
    schemaTables: ["profiles", "settings"],
    codeFiles: [],
    designFiles: [],
    seed: seedOf(),
    testSettings: {},
    ...overrides,
  } satisfies Parameters<typeof checkIds>[0];
}

const rulesOf = (result: ReturnType<typeof checkIds>) =>
  result.violations.map((v) => `${v.rule} ${v.location}`);

describe("식별자 대조(pnpm check:ids)", () => {
  it("식별자 대조: 12절 표를 읽어 <구간> 넷 · <영역> 넷 · <호출>(ai.max_tokens 일곱, ai.model · effort · thinking 넷)으로 펼친다", () => {
    const rows = parseSettingsTable(specText());
    expect(rows.map((r) => r.key)).toEqual(ROWS.map((r) => r[0]));
    expect(rows[0]).toMatchObject({
      scope: "household",
      changeVia: "seed",
      defaultCell: "25 · 30 · 30 · 30",
    });
    expect(rows[3]).toMatchObject({ scope: "profile", changeVia: "first-run" });
    const keys = expandSpecKeys(rows).map((k) => k.key);
    for (const b of BAND_NAMES) expect(keys).toContain(`unit.vocab_count.${b}`);
    for (const a of AREAS) expect(keys).toContain(`profile.start_level.${a}`);
    for (const c of AI_PURPOSES) expect(keys).toContain(`ai.max_tokens.${c}`);
    const models = keys.filter((k) => k.startsWith("ai.model."));
    expect(models).toEqual([
      "ai.model.writing_feedback",
      "ai.model.writing_check",
      "ai.model.speaking_eval",
      "ai.model.thinkout",
    ]);
    expect(keys.filter((k) => k.startsWith("ai.effort."))).toEqual([
      "ai.effort.writing_feedback",
      "ai.effort.writing_check",
      "ai.effort.speaking_eval",
      "ai.effort.thinkout",
    ]);
    expect(keys.filter((k) => /^ai\.thinking\.[a-z_]+$/.test(k))).toHaveLength(
      4,
    );
    expect(keys).toHaveLength(
      BAND_NAMES.length * 2 + AREAS.length + AI_PURPOSES.length + 4 * 3 + 7,
    );
    // 같은 머리의 표가 둘 이상이면 모두 읽는다(검토 M-1)
    const twoTables = [
      specText(),
      "",
      "### 12.1 덧붙인 키",
      "",
      "| 키 | 범위 | 기본값 | 뜻 | 바꾸는 곳 |",
      "|---|---|---|---|---|",
      "| talk.extra_key | 집 전체 | 3 | 뜻 칸 | 고급 |",
    ].join("\n");
    const both = parseSettingsTable(twoTables);
    expect(both.map((r) => r.key)).toEqual([
      ...ROWS.map((r) => r[0]),
      "talk.extra_key",
    ]);
    expect(expandSpecKeys(both).map((k) => k.key)).toContain("talk.extra_key");
    // 표 머리가 없으면 정본을 못 읽은 것이다
    expect(() => parseSettingsTable("## 12. 설정값\n\n표 없음")).toThrow();
    // 모르는 자리 표시 · 범위 · 바꾸는 곳도 정본 꼴 오류다
    expect(() =>
      expandSpecKeys(
        parseSettingsTable(specText([["a.b.<모름>", "집 전체", "1", "고급"]])),
      ),
    ).toThrow();
    expect(() =>
      parseSettingsTable(specText([["a.b", "가정", "1", "고급"]])),
    ).toThrow();
    expect(() =>
      parseSettingsTable(specText([["a.b", "집 전체", "1", "어딘가"]])),
    ).toThrow();
  });

  it("식별자 대조: 12절 키와 settings.json 키 · 범위 · 바꾸는 곳이 다르면 낸다(profile.start_level.<영역>은 C61 예외)", () => {
    expect(checkIds(baseInput()).violations).toEqual([]);
    const settings = goodSettings()
      .filter((r) => r.key !== "unit.vocab_mastery")
      .map((r) =>
        r.key === "session.length_factor"
          ? { ...r, scope: "household" as const }
          : r.key === "unit.remedial_batch"
            ? { ...r, changeVia: "seed" }
            : r,
      );
    settings.push({
      key: "unit.min_sessions.1-3",
      scope: "household",
      value: 6,
      changeVia: "decision-first",
    });
    const result = checkIds(baseInput({ seed: seedOf(settings) }));
    expect(rulesOf(result).sort()).toEqual(
      [
        "spec-setting-missing unit.vocab_mastery",
        "seed-setting-unknown unit.min_sessions.1-3",
        "setting-scope session.length_factor",
        "setting-change-via unit.remedial_batch",
      ].sort(),
    );
    // 첫 실행 화면 키는 시드에 없어도 되고, 있으면 바꾸는 곳 위반이다
    const withStart = [
      ...goodSettings(),
      {
        key: "profile.start_level.reading",
        scope: "profile" as const,
        value: 1,
        changeVia: "basic",
      },
    ];
    expect(rulesOf(checkIds(baseInput({ seed: seedOf(withStart) })))).toEqual([
      "setting-change-via profile.start_level.reading",
    ]);
  });

  it("식별자 대조: 기본값 칸(구간 넷 · 목록 · 단계 사전 · 호출별 수 · 끔 → off)을 풀어 settings.json 값과 맞대고 못 푸는 칸은 대조 안 함으로 센다", () => {
    const rows = parseSettingsTable(specText());
    const keysOf = (template: string) =>
      expandSpecKeys(rows.filter((r) => r.key === template)).map((k) => k.key);
    const parse = (template: string) => {
      const row = rows.find((r) => r.key === template);
      if (!row) throw new Error(template);
      const parsed = parseSpecDefault(row, keysOf(template));
      return parsed ? Object.fromEntries(parsed) : undefined;
    };
    expect(parse("unit.vocab_count.<구간>")).toEqual({
      "unit.vocab_count.1-3": 25,
      "unit.vocab_count.4-6": 30,
      "unit.vocab_count.7-9": 30,
      "unit.vocab_count.10-12": 30,
    });
    expect(parse("unit.vocab_mastery")).toEqual({ "unit.vocab_mastery": 0.8 });
    expect(parse("session.length_factor")).toEqual({
      "session.length_factor": 1,
    });
    expect(parse("speech.lang")).toEqual({ "speech.lang": "en-US" });
    expect(parse("review.intervals_days")).toEqual({
      "review.intervals_days": [1, 2, 4, 30],
    });
    expect(parse("writing.max_corrections")).toEqual({
      "writing.max_corrections": {
        "6": 2,
        "7": 2,
        "8": 2,
        "9": 2,
        "10": 3,
        "11": 3,
        "12": 3,
      },
    });
    expect(parse("ai.max_tokens.<호출>")).toMatchObject({
      "ai.max_tokens.writing_feedback": 8000,
      "ai.max_tokens.writing_check": 4000,
      "ai.max_tokens.speaking_eval": 4000,
      "ai.max_tokens.thinkout": 4000,
      "ai.max_tokens.talk_turn": 1000,
      "ai.max_tokens.talk_closing": 2000,
      "ai.max_tokens.probe": 1,
    });
    expect(parse("ai.thinking.<호출>")).toEqual({
      "ai.thinking.writing_feedback": "adaptive",
      "ai.thinking.writing_check": "adaptive",
      "ai.thinking.speaking_eval": "adaptive",
      "ai.thinking.thinkout": "adaptive",
    });
    expect(parse("ai.thinking.talk_turn.<구간>")).toMatchObject({
      "ai.thinking.talk_turn.1-3": "off",
    });
    expect(parse("ai.model.<호출>")).toBeUndefined();

    const changed = goodSettings().map((r) =>
      r.key === "unit.vocab_count.1-3"
        ? { ...r, value: 30 }
        : r.key === "ai.thinking.talk_turn.4-6"
          ? { ...r, value: "adaptive" }
          : r,
    );
    const result = checkIds(baseInput({ seed: seedOf(changed) }));
    expect(rulesOf(result).sort()).toEqual([
      "setting-default ai.thinking.talk_turn.4-6",
      "setting-default unit.vocab_count.1-3",
    ]);
    // ai.model · ai.effort 의 <호출> 넷은 '6.1 표'라 대조 안 함, 첫 실행 화면 키는 행이 없어 세지 않는다
    expect(result.unparsedDefaults).toEqual([
      "ai.model.writing_feedback",
      "ai.model.writing_check",
      "ai.model.speaking_eval",
      "ai.model.thinkout",
      "ai.effort.writing_feedback",
      "ai.effort.writing_check",
      "ai.effort.speaking_eval",
      "ai.effort.thinkout",
    ]);
  });

  it("식별자 대조: 코드의 설정 키 글자와 틀 머리가 12절에 없으면 낸다(파일 이름 꼴 글자는 뺀다)", () => {
    const keys = expandSpecKeys(parseSettingsTable(specText()));
    const firstSegments = new Set(keys.map((k) => k.key.split(".")[0] ?? ""));
    const source = [
      'const a = getSetting("unit.vocab_mastery");',
      'const b = bandKey("unit.vocab_count", band);',
      `const c = \`ai.model.$\{purpose}\`;`,
      'const d = getSetting("unit.recent_windw");',
      `const e = \`unit.vocab_counts.$\{band}\`;`,
      'const f = "review.json";',
      'const g = "seed.unknown";',
      'const h = "talk.unknown_key";',
      "// 주석의 'unit.not_a_key' 는 글자가 아니다",
    ].join("\n");
    const found = collectCodeKeys(
      [{ path: "src/x.ts", text: source }],
      firstSegments,
    );
    expect(found.map((k) => `${k.text}:${k.line}`)).toEqual([
      "unit.vocab_mastery:1",
      "unit.vocab_count:2",
      "ai.model.:3",
      "unit.recent_windw:4",
      "unit.vocab_counts.:5",
    ]);
    const result = checkIds(
      baseInput({ codeFiles: [{ path: "src/x.ts", text: source }] }),
    );
    expect(rulesOf(result)).toEqual([
      "code-setting-unknown src/x.ts:4",
      "code-setting-unknown src/x.ts:5",
    ]);
    expect(result.stats.codeKeys).toBe(5);
  });

  it("식별자 대조: 5절 테이블 표와 스키마 테이블 이름이 다르면 낸다", () => {
    expect(parseTableNames(DATA_SPEC).map((t) => t.name)).toEqual([
      "profiles",
      "settings",
    ]);
    expect(() => parseTableNames("| 다른 | 표 |\n|---|---|")).toThrow();
    const result = checkIds(
      baseInput({ schemaTables: ["profiles", "settings_history"] }),
    );
    expect(rulesOf(result)).toEqual([
      `table-mismatch ${DATA_SPEC_FILE}:6`,
      "table-mismatch settings_history",
    ]);
    expect(result.violations.map((v) => v.detail)).toEqual([
      "5절의 settings 가 스키마에 없다",
      "스키마의 settings_history 가 5절에 없다",
    ]);
  });

  it("식별자 대조: 쓰기 단계 규격 maxCorrections 와 writing.max_corrections 가 다르면 낸다", () => {
    const specs = writingSpecs({ 4: 1, 6: 2, 7: 2, 8: 2, 9: 2, 10: 2, 11: 3 });
    const result = checkIds(baseInput({ seed: seedOf(goodSettings(), specs) }));
    expect(rulesOf(result)).toEqual([
      "max-corrections writing:10",
      "max-corrections writing:12",
    ]);
    expect(result.violations[0]?.detail).toContain("2");
    expect(result.violations[1]?.detail).toContain("규격 값이 없다");
    // AI 를 쓰지 않는 쓰기 단계(≤ writing.rule_check_until_level)에 교정 상한이 있으면 위반, 4~5단계 값은 보지 않는다(검토 M-3)
    const low = writingSpecs({
      2: 2,
      4: 1,
      5: 1,
      6: 2,
      7: 2,
      8: 2,
      9: 2,
      10: 3,
      11: 3,
      12: 3,
    });
    const lowResult = checkIds(
      baseInput({ seed: seedOf(goodSettings(), low) }),
    );
    expect(rulesOf(lowResult)).toEqual(["max-corrections writing:2"]);
    expect(lowResult.violations[0]?.detail).toContain("AI 없는 단계");
    // 경계 키가 시드에 없으면 그 대조는 건너뛴다
    const withoutBound = goodSettings().filter(
      (r) => r.key !== "writing.rule_check_until_level",
    );
    const skipped = checkIds(
      baseInput({
        settingsSpecText: specText(
          ROWS.filter((r) => r[0] !== "writing.rule_check_until_level"),
        ),
        seed: seedOf(withoutBound, low),
      }),
    );
    expect(rulesOf(skipped)).toEqual([]);
  });

  it("식별자 대조: TEST_SETTINGS 의 키 · 범위 · 값이 settings.json 과 다르면 낸다", () => {
    const testSettings = {
      "unit.vocab_mastery": { scope: "household", value: 0.8 },
      "session.length_factor": { scope: "household", value: 1.0 },
      "review.intervals_days": { scope: "household", value: [1, 2, 4, 31] },
      "ai.max_tokens.not_here": { scope: "household", value: 1 },
    };
    const result = checkIds(baseInput({ testSettings }));
    expect(rulesOf(result)).toEqual([
      "fixture-setting session.length_factor",
      "fixture-setting review.intervals_days",
      "fixture-setting ai.max_tokens.not_here",
    ]);
  });

  it("식별자 대조: src 의 수 글자가 설정값과 같으면 보고하고 structure.ts · 맨 위 대문자 이름 상수 · 0 · 1 · 2 는 뺀다", () => {
    const numbers = settingNumbers(goodSettings());
    expect(numbers.get(0.8)).toEqual(["unit.vocab_mastery"]);
    expect(numbers.has(1)).toBe(false);
    expect(numbers.get(30)).toEqual([
      "unit.vocab_count.4-6",
      "unit.vocab_count.7-9",
      "unit.vocab_count.10-12",
      "review.intervals_days",
    ]);
    const source = [
      "export const PASS_RATIO = 0.8;",
      "const MAX = { a: 30 };",
      "export function f(avg: number) {",
      "  if (avg >= 0.8) return 2;",
      "  const LOCAL_UPPER = 30;",
      "  return [0, 1, 2, 4_000].length + LOCAL_UPPER;",
      "}",
      "const PASSAGE_PICTURE_UNTIL_LEVEL = 4;",
      // 맨 위 대문자 상수가 아닌 자리 — 허용 이름 목록으로만 빠진다(검토 M-5). 4 는 review.intervals_days 값이다
      "function g() { const PASSAGE_PICTURE_UNTIL_LEVEL = 4; return PASSAGE_PICTURE_UNTIL_LEVEL; }",
      "function h() { const OTHER_LOCAL = 4; return OTHER_LOCAL; }",
    ].join("\n");
    const tokensSeed = goodSettings();
    const found = collectDesignNumbers(
      [
        { path: "src/a.ts", text: source },
        {
          path: "src/core/seed/structure.ts",
          text: "export const X = [30, 0.8];\nf(30);",
        },
      ],
      settingNumbers(tokensSeed),
    );
    expect(found.map((d) => `${d.file}:${d.line} ${d.value}`)).toEqual([
      "src/a.ts:4 0.8",
      "src/a.ts:5 30",
      "src/a.ts:6 4000",
      "src/a.ts:10 4",
    ]);
    expect(found[1]?.keys).toHaveLength(3);
    const result = checkIds(
      baseInput({ designFiles: [{ path: "src/a.ts", text: source }] }),
    );
    expect(result.counts["design-number"]).toBe(4);
    expect(result.violations[0]?.detail).toBe("0.8 ← unit.vocab_mastery");
  });

  it("식별자 대조: --fail-on 규칙에 위반이 있으면 1, 정본을 못 읽거나 모르는 규칙이면 2, seed/ 가 없으면 시드 규칙을 건너뛰고 0", () => {
    expect(parseArgs(["--nope"]).ok).toBe(false);
    expect(parseArgs(["--fail-on"]).ok).toBe(false);
    const settingsJson = JSON.stringify({ settings: goodSettings() });
    const levelJson = JSON.stringify({ levelSpecs: [] });
    const memoryIo = (
      files: Record<string, string>,
      opts: { dirs?: string[]; testSettings?: CheckIdsIo["testSettings"] } = {},
    ): CheckIdsIo => ({
      readText: (path) => files[path],
      dirExists: (path) => (opts.dirs ?? []).includes(path),
      listFiles: () => [],
      schemaTables: () => ["profiles", "settings"],
      testSettings: opts.testSettings ?? {},
    });
    const specs = {
      [`specs/${SETTINGS_SPEC_FILE}`]: specText(),
      [`specs/${DATA_SPEC_FILE}`]: DATA_SPEC,
    };
    const args = (argv: string[]) => {
      const parsed = parseArgs(argv);
      if (!parsed.ok) throw new Error(parsed.error);
      return parsed.args;
    };
    // seed/ 없음: 시드 규칙은 건너뛰고 0
    const skipped = runCheckIds(
      args(["--fail-on", CI_FAIL_ON.join(",")]),
      memoryIo(specs),
    );
    expect(skipped.code).toBe(0);
    expect(skipped.lines[0]).toMatch(
      /^check-ids: 12절 키 \d+ · 시드 키 0 · 코드 키 글자 0 · 테이블 2\/2 · 대조 안 함 \d+ · /,
    );
    expect(skipped.lines[0]).toMatch(/ · 건너뜀\(seed\/ 없음\)$/);
    for (const rule of RULES) expect(skipped.lines[0]).toContain(`${rule} 0`);
    // seed/ 있음 · 위반 하나 · --fail-on 이면 1, 보고만이면 0
    const badSeed = {
      ...specs,
      "seed/settings.json": JSON.stringify({
        settings: goodSettings().filter((r) => r.key !== "speech.lang"),
      }),
      "seed/level-specs.json": levelJson,
    };
    const withSeed = memoryIo(badSeed, { dirs: ["seed"] });
    expect(runCheckIds(args([]), withSeed).code).toBe(0);
    const failing = runCheckIds(
      args(["--fail-on", "spec-setting-missing"]),
      withSeed,
    );
    expect(failing.code).toBe(1);
    expect(failing.lines).toContain(
      "spec-setting-missing speech.lang 12절 키가 settings.json 에 없다",
    );
    // --json 꼴
    const json = runCheckIds(args(["--json"]), withSeed);
    const parsed = JSON.parse(json.lines[0] ?? "");
    expect(parsed).toMatchObject({ version: 1, skipped: [] });
    expect(parsed.counts["spec-setting-missing"]).toBe(1);
    expect(Array.isArray(parsed.violations)).toBe(true);
    expect(Array.isArray(parsed.unparsedDefaults)).toBe(true);
    // 정본 없음 · 모르는 규칙 · seed/ 가 있는데 풀리지 않음은 2
    expect(runCheckIds(args([]), memoryIo({})).code).toBe(2);
    expect(runCheckIds(args(["--fail-on", "nope"]), memoryIo(specs)).code).toBe(
      2,
    );
    const broken = memoryIo(
      {
        ...specs,
        "seed/settings.json": "{",
        "seed/level-specs.json": levelJson,
      },
      { dirs: ["seed"] },
    );
    expect(runCheckIds(args([]), broken).code).toBe(2);
    const wrongShape = memoryIo(
      {
        ...specs,
        "seed/settings.json": settingsJson.replace('"scope"', '"scoop"'),
        "seed/level-specs.json": levelJson,
      },
      { dirs: ["seed"] },
    );
    expect(runCheckIds(args([]), wrongShape).code).toBe(2);
    // 명시한 --seed-root 가 없으면 2(기본 seed 가 없을 때만 건너뜀, 검토 M-2)
    const missingRoot = runCheckIds(
      args(["--seed-root", "nowhere"]),
      memoryIo(specs),
    );
    expect(missingRoot.code).toBe(2);
    expect(missingRoot.lines).toEqual([
      "check-ids: 입력을 못 읽었다: nowhere 가 없다",
    ]);
    // 정본 뿌리 · 시드 뿌리 선택지
    const elsewhere = memoryIo({
      [`/main/specs/${SETTINGS_SPEC_FILE}`]: specText(),
      [`/main/specs/${DATA_SPEC_FILE}`]: DATA_SPEC,
    });
    expect(runCheckIds(args(["--specs", "/main/specs"]), elsewhere).code).toBe(
      0,
    );
    expect(SEED_RULES).toContain("fixture-setting");
    expect(CI_FAIL_ON).not.toContain("design-number");
  });

  it("식별자 대조: 저장소의 5절 테이블이 스키마와 같고 코드의 설정 키 글자가 모두 12절에 있다", async () => {
    const content = await import("@/db/schema/content");
    const learning = await import("@/db/schema/learning");
    const operations = await import("@/db/schema/operations");
    const tables = schemaTableNames([content, learning, operations]);
    const spec = readFileSync(
      resolve(REPO_ROOT, "specs", DATA_SPEC_FILE),
      "utf8",
    );
    expect([...tables].sort()).toEqual(
      parseTableNames(spec)
        .map((t) => t.name)
        .sort(),
    );
    const { listCodeFiles } = await import("../../scripts/check-ids");
    const settingsSpec = readFileSync(
      resolve(REPO_ROOT, "specs", SETTINGS_SPEC_FILE),
      "utf8",
    );
    const result = checkIds({
      settingsSpecText: settingsSpec,
      dataSpecText: spec,
      schemaTables: tables,
      codeFiles: listCodeFiles(REPO_ROOT),
      designFiles: [],
      seed: null,
      testSettings: {},
    });
    expect(
      result.violations.filter((v) => v.rule === "code-setting-unknown"),
    ).toEqual([]);
    expect(result.stats.codeKeys).toBeGreaterThan(0);
  });
});

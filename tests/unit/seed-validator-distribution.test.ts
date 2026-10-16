import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  checkCanDo,
  checkDistribution,
  checkRelations,
  checkRemedialCoverage,
  checkTopicVariants,
  type UnitStats,
} from "@/core/seed/check-cross";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import type { ReadingLesson } from "@/core/seed/schema/lesson";
import {
  AREAS,
  DISTRIBUTION_HALF,
  DISTRIBUTION_UPPER_ONLY_WIDTH,
  lessonFilePath,
} from "@/core/seed/structure";
import {
  cellHash,
  exitCodeOf,
  solveStatus,
  validateSeed,
} from "@/core/seed/validate";
import {
  defaultSettings,
  miniSeed,
  readingLesson,
  referenceSet,
  type SeedTree,
  seedTreeFiles,
  settingNumber,
} from "../fixtures/seed/builders";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ref = referenceSet(defaultSettings());
const { index } = buildReferenceIndex(ref);
const THROUGH = 1;

function mini(): SeedTree {
  return miniSeed({ areas: AREAS, through: THROUGH, frame: "small" });
}

function readingStats(level: number, passageWords: number[]): UnitStats[] {
  return passageWords.map((words, i) => ({
    area: "reading",
    level,
    unit: i + 1,
    passageWords: { avg: words, min: words, max: words },
    sentenceWords: { avg: 5, min: 5, max: 5 },
    offbandRatio: { avg: 0, min: 0, max: 0 },
  }));
}

/** 미니 시드의 읽기 1단계 단원 1 수업들(묶음 검사 입력). */
function readingUnit(tree: SeedTree, unit = 1) {
  const file = tree.lessons.find(
    (f) => f.area === "reading" && f.level === THROUGH && f.unit === unit,
  );
  if (file?.area !== "reading") throw new Error("읽기 수업 파일 없음");
  return {
    area: "reading" as const,
    level: THROUGH,
    unit,
    file: lessonFilePath("reading", THROUGH, unit),
    lessons: file.lessons,
  };
}

describe("묶음 검사 · 분포 · 풀이 검사", () => {
  it("AC-7d 단계 분포: 같은 단계 단원 평균 지문 길이 차이가 규격 폭의 절반을 넘으면 경고를 내고 종료 코드는 0 이다", () => {
    const spec = index.levelSpec("reading", 4);
    if (spec?.area !== "reading" || !spec.passage.words)
      throw new Error("규격 없음");
    const { min, max } = spec.passage.words;
    const half = (max - min) * DISTRIBUTION_HALF;
    expect(
      checkDistribution(readingStats(4, [min, min + half]), index),
    ).toEqual([]);
    const warnings = checkDistribution(
      readingStats(4, [min, min + half + 1]),
      index,
    );
    expect(warnings.map((w) => w.id)).toEqual([
      "distribution:reading:4:passage-words",
    ]);
    // 경고는 종료 코드를 바꾸지 않는다.
    const report = validateSeed(seedTreeFiles(mini()), {
      mode: "complete",
      through: THROUGH,
      areas: AREAS,
    });
    expect(report.errors).toEqual([]);
    const withWarnings = {
      ...report,
      warnings: [...report.warnings, ...warnings],
    };
    expect(exitCodeOf(withWarnings)).toBe(0);
    expect(report.stats.length).toBeGreaterThan(0);
  });

  it("AC-7d 단계 분포: 상한만 있는 지표는 상한의 20% 를 폭으로 본다", () => {
    const spec = index.levelSpec("speaking", 3);
    if (!spec) throw new Error("규격 없음");
    const width = spec.sentenceMaxWords * DISTRIBUTION_UPPER_ONLY_WIDTH;
    const stats = (spread: number): UnitStats[] =>
      [0, spread].map((d, i) => ({
        area: "speaking",
        level: 3,
        unit: i + 1,
        sentenceWords: { avg: 3 + d, min: 3, max: 3 + d },
      }));
    expect(checkDistribution(stats(width * DISTRIBUTION_HALF), index)).toEqual(
      [],
    );
    expect(
      checkDistribution(stats(width * DISTRIBUTION_HALF + 0.01), index).map(
        (w) => w.id,
      ),
    ).toEqual(["distribution:speaking:3:sentence-words"]);
    // 범위 밖 비율은 seed.max_offband_ratio × 20% 가 폭이다.
    const ratioWidth =
      settingNumber(ref.settings, "seed.max_offband_ratio") *
      DISTRIBUTION_UPPER_ONLY_WIDTH;
    const offband = (spread: number): UnitStats[] =>
      [0, spread].map((d, i) => ({
        area: "reading",
        level: 6,
        unit: i + 1,
        sentenceWords: { avg: 5, min: 5, max: 5 },
        offbandRatio: { avg: d, min: d, max: d },
      }));
    expect(
      checkDistribution(offband(ratioWidth * DISTRIBUTION_HALF), index),
    ).toEqual([]);
    expect(
      checkDistribution(
        offband(ratioWidth * DISTRIBUTION_HALF * 1.1),
        index,
      ).map((w) => w.id),
    ).toEqual(["distribution:reading:6:offband-ratio"]);
  });

  it("AC-7d 풀이 검사: 앱 정답과 다르게 풀린 문항은 사람 확인 목록에 들고 PR 모드도 실패한다", () => {
    const tree = mini();
    const check = tree.checks.find((c) =>
      c.path.startsWith("checks/lessons/reading/"),
    );
    const record = check?.file.records[0];
    const item = record?.solve.items[0];
    if (!record || !item) throw new Error("풀이 검사 기록 없음");
    item.verdict = "different";
    item.solverAnswer = 2;
    const report = validateSeed(seedTreeFiles(tree), {
      mode: "pr",
      areas: AREAS,
    });
    expect(report.pendingHuman).toEqual([record.cell]);
    expect(report.errors).toEqual([]);
    expect(exitCodeOf(report)).toBe(1);
  });

  it("AC-7d 풀이 검사: 같은 해시의 사람 확인 '정답 맞음'이 있으면 통과하고 내용이 바뀌면 풀이 검사 안 됨이다", () => {
    const tree = mini();
    const file = tree.lessons.find((f) => f.area === "reading" && f.unit === 1);
    const lesson = file?.lessons[0] as ReadingLesson | undefined;
    const check = tree.checks.find(
      (c) => c.path === "checks/lessons/reading/1/1.json",
    );
    const record = check?.file.records.find((r) =>
      r.cell.endsWith(":assigned:1:1"),
    );
    if (!lesson || !record) throw new Error("견본 없음");
    const cell = {
      key: record.cell,
      kind: "lesson" as const,
      area: "reading" as const,
      value: lesson,
    };
    expect(record.contentHash).toBe(cellHash(record.cell, lesson));
    expect(solveStatus(cell, record)).toBe("passed");
    const differs = structuredClone(record);
    const first = differs.solve.items[0];
    if (!first) throw new Error("문항 없음");
    first.verdict = "multiple";
    expect(solveStatus(cell, differs)).toBe("pending-human");
    differs.human = {
      contentHash: record.contentHash,
      at: "2026-10-16T10:00:00+09:00",
      items: [{ no: first.no, decision: "correct" }],
    };
    expect(solveStatus(cell, differs)).toBe("passed");
    // 내용이 바뀌면(정정 '고침') 해시가 달라져 풀이 검사 안 됨이다.
    const changed = structuredClone(lesson);
    changed.content.passage = `${changed.content.passage} It is.`;
    expect(solveStatus({ ...cell, value: changed }, differs)).toBe("unchecked");
    // 판 · 생성 기록만 바뀌면 해시는 그대로다.
    expect(
      cellHash(record.cell, { ...lesson, correction: lesson.correction + 1 }),
    ).toBe(record.contentHash);
    expect(solveStatus(cell, undefined)).toBe("unchecked");
  });

  it("AC-7d 시드 검증은 API 를 부르지 않는다: 명령의 가져오기 그래프에 @anthropic-ai/sdk · http 가 없고 fetch 가 없다", () => {
    const IMPORT =
      /(?:import|export)\s[^"']*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;
    const seen = new Set<string>();
    const external = new Set<string>();
    const resolveLocal = (from: string, spec: string): string | undefined => {
      const base = spec.startsWith("@/")
        ? resolve(REPO_ROOT, "src", spec.slice(2))
        : spec.startsWith(".")
          ? resolve(dirname(from), spec)
          : undefined;
      return base === undefined
        ? undefined
        : base.endsWith(".ts")
          ? base
          : `${base}.ts`;
    };
    const visit = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      const text = readFileSync(file, "utf8");
      expect(text.includes("fetch("), file).toBe(false);
      for (const m of text.matchAll(IMPORT)) {
        const spec = m[1] ?? m[2] ?? "";
        const local = resolveLocal(file, spec);
        if (local) visit(local);
        else external.add(spec);
      }
    };
    visit(resolve(REPO_ROOT, "scripts/seed-validate.ts"));
    expect(seen.size).toBeGreaterThan(5);
    expect([...seen].some((f) => f.endsWith("src/core/seed/validate.ts"))).toBe(
      true,
    );
    const forbidden = [
      "@anthropic-ai/sdk",
      "node:http",
      "node:https",
      "http",
      "https",
      "node:net",
      "net",
    ];
    expect([...external].filter((e) => forbidden.includes(e))).toEqual([]);
  });

  it("6.4 보강 덮기: 단원 단어가 보강 수업들에 seed.remedial_coverage 번 미만이면 거부하고 답하는 대상 단어 수를 보고한다", () => {
    const tree = mini();
    const unit = readingUnit(tree);
    const { index: miniIndex } = buildReferenceIndex(tree.reference);
    const ok = checkRemedialCoverage(unit, miniIndex);
    expect(ok.issues).toEqual([]);
    expect(ok.answerTargetWords).toBeGreaterThan(0);
    const remedial = unit.lessons.find((l) => l.kind === "remedial");
    const word = miniIndex.unitSpec("reading", THROUGH, 1)?.words[0];
    if (!remedial || !word) throw new Error("보강 수업 없음");
    const pattern = new RegExp(`\\b${word}\\b`, "g");
    remedial.content.passage = remedial.content.passage.replace(pattern, "it");
    remedial.content.questions = remedial.content.questions.map((q) => ({
      ...q,
      prompt: q.prompt.replace(pattern, "it"),
      options: q.options
        .filter((o) => o !== word)
        .concat(q.options.includes(word) ? ["it"] : []),
    })) as ReadingLesson["content"]["questions"];
    const missing = checkRemedialCoverage(unit, miniIndex);
    expect(missing.issues.map((i) => i.rule)).toEqual(["remedial-coverage"]);
    expect(missing.issues[0]?.message).toContain(word);
  });

  it("6.4 주제 변형: 같은 수업의 변형끼리 새 단어 · 분량이 다르면 거부한다", () => {
    const base = readingLesson(ref, 4).lesson;
    const group = (second: ReadingLesson) => ({
      area: "reading" as const,
      level: 4,
      unit: 1,
      file: lessonFilePath("reading", 4, 1),
      lessons: [base, second],
    });
    expect(
      checkTopicVariants(group({ ...structuredClone(base), variant: 2 })),
    ).toEqual([]);
    const fewer = { ...structuredClone(base), variant: 2 };
    fewer.content.questions.pop();
    expect(checkTopicVariants(group(fewer)).map((i) => i.rule)).toEqual([
      "topic-variants",
    ]);
    const otherWords = {
      ...structuredClone(base),
      variant: 2,
      newWords: base.newWords.slice(1),
    };
    expect(checkTopicVariants(group(otherWords)).map((i) => i.rule)).toEqual([
      "topic-variants",
    ]);
  });

  it("조사 P6 관계: 배정 전에 쓰인 단원 단어와 다지기에서 다시 안 나온 단원 단어를 경고한다", () => {
    const tree = mini();
    const { index: miniIndex } = buildReferenceIndex(tree.reference);
    const unit = readingUnit(tree, 2);
    expect(checkRelations(unit, miniIndex)).toEqual([]);
    const words = miniIndex.unitSpec("reading", THROUGH, 2)?.words ?? [];
    const allocation = miniIndex.allocation("reading", THROUGH, 2);
    if (!allocation?.ok) throw new Error("배정표 없음");
    const second = allocation.lessons[1]?.newWords[0];
    const first = unit.lessons.find(
      (l) => l.kind === "assigned" && l.lessonNo === 1,
    );
    if (!second || !first) throw new Error("수업 없음");
    // 수업 1 지문에 수업 2 의 새 단어를 쓴다.
    first.content.passage = `${first.content.passage} This is ${second}.`;
    const early = checkRelations(unit, miniIndex);
    expect(early.map((w) => w.rule)).toEqual(["relation-early-use"]);
    expect(early[0]?.id).toContain(second);
    // 다지기 수업에서 한 단어를 지운다.
    const reused = readingUnit(mini(), 2);
    const reinforce = reused.lessons.find((l) => l.kind === "reinforce");
    const word = words.find((w) => reinforce?.content.passage.includes(w));
    if (!reinforce || !word) throw new Error("다지기 없음");
    const pattern = new RegExp(`\\b${word}\\b`, "g");
    reinforce.content.passage = reinforce.content.passage.replace(
      pattern,
      "it",
    );
    reinforce.content.questions = reinforce.content.questions.map((q) => ({
      ...q,
      prompt: q.prompt.replace(pattern, "it"),
      options: q.options.map((o) => (o === word ? "it" : o)),
    })) as ReadingLesson["content"]["questions"];
    expect(checkRelations(reused, miniIndex).map((w) => w.rule)).toEqual([
      "relation-not-reused",
    ]);
  });

  it("3.1 can-do: 단계 규격에 없는 숫자가 든 can-do 를 경고한다", () => {
    expect(checkCanDo(ref.levelSpecs.levelSpecs)).toEqual([]);
    const specs = structuredClone(ref.levelSpecs.levelSpecs);
    const spec = specs.find((s) => s.area === "reading" && s.level === 4);
    if (!spec) throw new Error("규격 없음");
    spec.canDo = `${spec.canDo} 99개`;
    const warnings = checkCanDo(specs);
    expect(warnings.map((w) => w.id)).toEqual(["can-do-numbers:reading:4"]);
    expect(warnings[0]?.message).toContain("99");
  });
});

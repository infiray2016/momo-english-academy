import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import type { ReadingLesson } from "@/core/seed/schema/lesson";
import {
  AREAS,
  type Area,
  cellKey,
  lessonFilePath,
  SEED_FILES,
} from "@/core/seed/structure";
import { validateSeed } from "@/core/seed/validate";
import {
  type CliArgs,
  parseArgs,
  runValidate,
} from "../../scripts/seed-validate";
import {
  miniSeed,
  type SeedTree,
  seedTreeFiles,
  writeSeedTree,
} from "../fixtures/seed/builders";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const TSX = join(REPO_ROOT, "node_modules/.bin/tsx");
const SCRIPT = join(REPO_ROOT, "scripts/seed-validate.ts");
const TMP_ROOT = join(REPO_ROOT, "tests/.tmp");
const SPAWN_TIMEOUT_MS = 60_000;
const made: string[] = [];

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

function mini(areas: readonly Area[] = AREAS): SeedTree {
  return miniSeed({ areas, through: 1, frame: "small" });
}
function args(extra: Partial<CliArgs> = {}): CliArgs {
  const parsed = parseArgs([]);
  if (!parsed.ok) throw new Error(parsed.error);
  return { ...parsed.args, ...extra };
}
function spawn(argv: string[]) {
  return spawnSync(TSX, [SCRIPT, ...argv], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: SPAWN_TIMEOUT_MS,
  });
}
const SUMMARY =
  /^seed-validate: 칸 \d+ · 통과 \d+ · 실패 \d+ · 빈 칸 \d+ · 풀이 검사 안 됨 \d+ · 사람 확인 \d+ · 경고 \d+ · 규격 파일 오류 \d+$/;

describe("명령 seed:validate", () => {
  it("AC-7a · AC-7d 명령: PR 모드는 빈 칸을 보고만 하고 0, --complete-through 1 은 빈 칸이 있으면 1", () => {
    const tree = mini();
    expect(runValidate(args(), seedTreeFiles(tree)).code).toBe(0);
    expect(
      runValidate(args({ completeThrough: 1 }), seedTreeFiles(tree)).code,
    ).toBe(0);
    tree.lessons[0]?.lessons.pop();
    const files = seedTreeFiles(tree);
    const pr = runValidate(args(), files);
    expect(pr.code).toBe(0);
    expect(pr.lines[0]).toMatch(SUMMARY);
    expect(pr.lines[0]).not.toContain("빈 칸 0 ");
    expect(runValidate(args({ completeThrough: 1 }), files).code).toBe(1);
  });

  it("AC-7a 명령: 검증 실패 칸이 있으면 1 이고 칸 · 규칙 · 파일을 한 줄씩 낸다", () => {
    const tree = mini();
    const file = tree.lessons.find(
      (f) => f.area === "reading" && f.level === 1 && f.unit === 2,
    );
    const lesson = file?.lessons[0] as ReadingLesson | undefined;
    const question = lesson?.content.questions[0];
    if (!lesson || !question) throw new Error("견본 없음");
    question.answerNo = question.options.length + 1;
    const { code, lines } = runValidate(args(), seedTreeFiles(tree));
    expect(code).toBe(1);
    const key = cellKey({
      type: "lesson",
      area: "reading",
      level: 1,
      unit: 2,
      kind: lesson.kind,
      lessonNo: lesson.lessonNo,
      variant: lesson.variant,
    });
    expect(lines).toContain(
      `${lessonFilePath("reading", 1, 2)}:lessons.0.content.questions.0.answerNo answer ${key} 정답 번호 ${question.answerNo} 가 보기 1~${question.options.length} 밖이다`,
    );
    // 칸 키 없는 오류(파일 규격)만 있어도 첫 줄 '실패' 가 0 이 아니다(P4c 검토 M-1).
    const fileOnly = mini();
    const test = fileOnly.levelTests.find((f) => f.area === "reading");
    const form = test?.forms[0];
    if (!form || !("items" in form)) throw new Error("평가 없음");
    (form.items[0] as unknown as Record<string, unknown>).unknownKey = 1;
    const fileRun = runValidate(args(), seedTreeFiles(fileOnly));
    expect(fileRun.code).toBe(1);
    expect(fileRun.lines[0]).toMatch(/ · 실패 [1-9]\d* · /);
    // JSON 이 아닌 수업 파일은 그 파일 칸 전부가 json 오류(빈 칸이 아니라 실패)다.
    const broken = mini();
    const target = broken.lessons.find(
      (f) => f.area === "writing" && f.level === 1 && f.unit === 3,
    );
    if (!target) throw new Error("수업 파일 없음");
    const files = seedTreeFiles(broken);
    files.set(lessonFilePath("writing", 1, 3), "{ not json");
    const report = validateSeed(files, {
      mode: "complete",
      through: 1,
      areas: AREAS,
    });
    const jsonErrors = report.errors.filter((e) => e.rule === "json");
    expect(jsonErrors.map((e) => e.cell).sort()).toEqual(
      target.lessons
        .map((l) =>
          cellKey({
            type: "lesson",
            area: "writing",
            level: 1,
            unit: 3,
            kind: l.kind,
            lessonNo: l.lessonNo,
            variant: l.variant,
          }),
        )
        .sort(),
    );
    expect(report.empty).toEqual([]);
    expect(report.summary.failed).toBe(target.lessons.length);
    expect(runValidate(args({ completeThrough: 1 }), files).lines[0]).toContain(
      `실패 ${target.lessons.length} · 빈 칸 0`,
    );
  });

  it("명령: 첫 줄 요약 꼴과 --json 보고 꼴", () => {
    const tree = mini();
    const human = runValidate(args({ stats: true }), seedTreeFiles(tree));
    expect(human.lines[0]).toMatch(SUMMARY);
    expect(human.lines.some((l) => l.startsWith("통계 "))).toBe(true);
    mkdirSync(TMP_ROOT, { recursive: true });
    const dir = mkdtempSync(join(TMP_ROOT, "seed-"));
    made.push(dir);
    writeSeedTree(dir, tree);
    const result = spawn(["--root", dir, "--complete-through", "1", "--json"]);
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(result.stdout) as Record<string, unknown>;
    expect(Object.keys(report).sort()).toEqual(
      [
        "version",
        "mode",
        "completeThrough",
        "areas",
        "summary",
        "errors",
        "warnings",
        "empty",
        "unchecked",
        "pendingHuman",
        "stats",
      ].sort(),
    );
    expect(report.version).toBe(1);
    expect(report.mode).toBe("complete");
    expect(report.completeThrough).toBe(1);
    expect(Object.keys(report.summary as object).sort()).toEqual(
      [
        "cells",
        "passed",
        "failed",
        "empty",
        "unchecked",
        "pendingHuman",
        "warnings",
        "referenceErrors",
      ].sort(),
    );
  });

  it("명령: 뿌리 폴더가 없거나 설정값 시드가 깨졌거나 모르는 인자면 2", () => {
    const missing = spawn(["--root", join(TMP_ROOT, "no-such-seed-root")]);
    expect(missing.status).toBe(2);
    expect(missing.stderr).toContain("seed-validate:");
    const unknown = spawn(["--nope"]);
    expect(unknown.status).toBe(2);
    expect(parseArgs(["--complete-through", "13"]).ok).toBe(false);
    expect(parseArgs(["--areas", "reading,music"]).ok).toBe(false);
    expect(runValidate(args(), null).code).toBe(2);
    const files = seedTreeFiles(mini());
    files.set(SEED_FILES.settings, "{ not json");
    expect(runValidate(args(), files).code).toBe(2);
    const noVocab = seedTreeFiles(mini());
    noVocab.delete(SEED_FILES.vocab);
    expect(runValidate(args(), noVocab).code).toBe(2);
  });

  it("명령: --areas 와 --complete-through settings", () => {
    // settings 의 seed.complete_through_level(작은 틀에서도 12절 기본값)까지는 비어 있으므로 1
    const tree = mini();
    expect(
      runValidate(args({ completeThrough: "settings" }), seedTreeFiles(tree))
        .code,
    ).toBe(1);
    const row = tree.reference.settings.settings.find(
      (r) => r.key === "seed.complete_through_level",
    );
    if (!row) throw new Error("설정값 없음");
    row.value = 1;
    expect(
      runValidate(args({ completeThrough: "settings" }), seedTreeFiles(tree))
        .code,
    ).toBe(0);
    // 회화 없는 시드는 회화를 빼고 보면 통과하고, 넷을 다 보면 빈 칸이 생긴다.
    const noTalk = mini(["reading", "writing", "speaking"]);
    const rws = parseArgs([
      "--areas",
      "reading,writing,speaking",
      "--complete-through",
      "1",
    ]);
    if (!rws.ok) throw new Error(rws.error);
    expect(rws.args.areas).toEqual(["reading", "writing", "speaking"]);
    expect(runValidate(rws.args, seedTreeFiles(noTalk)).code).toBe(0);
    expect(
      runValidate(args({ completeThrough: 1 }), seedTreeFiles(noTalk)).code,
    ).toBe(1);
    // --complete-through settings 인데 키가 없으면 2
    const noKey = mini();
    noKey.reference.settings.settings =
      noKey.reference.settings.settings.filter(
        (r) => r.key !== "seed.complete_through_level",
      );
    expect(
      runValidate(args({ completeThrough: "settings" }), seedTreeFiles(noKey))
        .code,
    ).toBe(2);
    // 1~12 정수가 아니면 --complete-through settings 는 2, PR 모드는 규격 파일 오류(P4c 검토 M-2)
    for (const bad of [0, 13, 1.5]) {
      const outOfRange = mini();
      const through = outOfRange.reference.settings.settings.find(
        (r) => r.key === "seed.complete_through_level",
      );
      if (!through) throw new Error("설정값 없음");
      through.value = bad;
      const files = seedTreeFiles(outOfRange);
      expect(
        runValidate(args({ completeThrough: "settings" }), files).code,
        String(bad),
      ).toBe(2);
      const pr = runValidate(args(), files);
      expect(pr.code, String(bad)).toBe(1);
      expect(pr.lines[0]).toMatch(/규격 파일 오류 [1-9]/);
    }
  });
});

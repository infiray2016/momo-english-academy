import { describe, expect, it } from "vitest";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import type { SettingsFile } from "@/core/seed/schema/reference";
import { BAND_NAMES, type Band } from "@/core/seed/structure";
import {
  allocateUnit,
  checkFrameRelations,
  lastLessonWords,
  resolveUnitFrame,
} from "@/core/vocab/allocate";
import {
  defaultSettings,
  type ReferenceSet,
  referenceSet,
  settingNumber,
  smallReferenceSet,
  unitWordsOf,
} from "../fixtures/seed/builders";

const ref = referenceSet(defaultSettings());
const reader = (settings: SettingsFile) => (key: string) =>
  settingNumber(settings, key);
const num = reader(ref.settings);

function bandFrame(band: Band) {
  return {
    vocabCount: num(`unit.vocab_count.${band}`),
    k: num(`unit.new_words_per_lesson.${band}`),
    regularLessons: num(`unit.regular_lessons.${band}`),
    minLessonsSetting: num(`unit.min_lessons.${band}`),
  };
}

/** 첫 단계가 그 구간인 단원 1 의 단어. */
function wordsOfBand(band: Band): string[] {
  const level = Number(band.split("-")[0]);
  return unitWordsOf(ref, "reading", level, 1);
}

function expectAllocation(band: Band) {
  const frame = bandFrame(band);
  const words = wordsOfBand(band);
  expect(words).toHaveLength(frame.vocabCount);
  const result = allocateUnit({ words, ...frame });
  if (!result.ok) throw new Error(`배정 실패: ${result.reason}`);
  const assigned = Math.ceil(frame.vocabCount / frame.k);
  expect(result.assignedCount).toBe(assigned);
  expect(result.reinforceCount).toBe(frame.regularLessons - assigned);
  expect(result.lessons).toHaveLength(frame.regularLessons);
  result.lessons.forEach((lesson, i) => {
    expect(lesson.lessonNo).toBe(i + 1);
    expect(lesson.kind).toBe(i < assigned ? "assigned" : "reinforce");
    expect(lesson.newWords).toEqual(
      i < assigned ? words.slice(i * frame.k, (i + 1) * frame.k) : [],
    );
  });
  return { result, frame, assigned };
}

function cloneRef(source: ReferenceSet = ref): ReferenceSet {
  return structuredClone(source);
}

function setSetting(settings: SettingsFile, key: string, value: unknown) {
  const row = settings.settings.find((r) => r.key === key);
  if (!row) throw new Error(`설정값 ${key} 가 없다`);
  (row as { value: unknown }).value = value;
}

function rulesOf(r: ReferenceSet): string[] {
  return [...new Set(buildReferenceIndex(r).issues.map((i) => i.rule))].sort();
}

describe("어휘 배정(allocate.ts)", () => {
  it("AC-7c 어휘 배정: 30단어 · k 5 · 정규 10 → 배정 수업 6개에 5개씩, 다지기 4", () => {
    const { result, frame, assigned } = expectAllocation("1-3");
    // 나누어떨어지므로 배정 수업마다 k 개다.
    expect(frame.vocabCount % frame.k).toBe(0);
    expect(
      result.lessons
        .slice(0, assigned)
        .every((l) => l.newWords.length === frame.k),
    ).toBe(true);
  });

  it("AC-7c 어휘 배정: 30단어 · k 4 · 정규 13 → 4 · 4 · 4 · 4 · 4 · 4 · 4 · 2 와 다지기 5", () => {
    const { result, frame, assigned } = expectAllocation("4-6");
    // 나머지는 마지막 배정 수업에 간다.
    const sizes = result.lessons
      .slice(0, assigned)
      .map((l) => l.newWords.length);
    expect(sizes).toEqual([
      ...Array.from({ length: assigned - 1 }, () => frame.k),
      lastLessonWords(frame.vocabCount, frame.k),
    ]);
    expect(lastLessonWords(frame.vocabCount, frame.k)).toBe(
      frame.vocabCount - (assigned - 1) * frame.k,
    );
  });

  it("AC-7c 어휘 배정: 30단어 · k 3 · 정규 15 → 배정 10 · 다지기 5", () => {
    expectAllocation("10-12");
  });

  it("AC-7c 어휘 배정: 최소 수업 수는 배정 수업 수와 unit.min_lessons 가운데 큰 값이다", () => {
    for (const band of BAND_NAMES) {
      const frame = bandFrame(band);
      const result = allocateUnit({ words: wordsOfBand(band), ...frame });
      if (!result.ok) throw new Error(result.reason);
      expect(result.minLessons).toBe(
        Math.max(result.assignedCount, frame.minLessonsSetting),
      );
    }
    // 설정값이 배정 수업 수보다 작으면 배정 수업 수, 크면 설정값
    const frame = bandFrame("1-3");
    const words = wordsOfBand("1-3");
    const assigned = Math.ceil(words.length / frame.k);
    const low = allocateUnit({
      words,
      ...frame,
      minLessonsSetting: assigned - 1,
    });
    const high = allocateUnit({
      words,
      ...frame,
      minLessonsSetting: frame.regularLessons,
    });
    expect(low.ok && low.minLessons).toBe(assigned);
    expect(high.ok && high.minLessons).toBe(frame.regularLessons);
    // 배정할 수 없는 틀
    expect(allocateUnit({ words: [], ...frame })).toEqual({
      ok: false,
      reason: "empty-words",
    });
    expect(allocateUnit({ words, ...frame, k: 0 })).toEqual({
      ok: false,
      reason: "bad-k",
    });
    expect(
      allocateUnit({ words, ...frame, regularLessons: assigned - 1 }),
    ).toEqual({ ok: false, reason: "too-many-assigned" });
  });

  it("AC-7c 단원 틀: 쓰기 6단계 이상은 level_specs 의 k · 정규 · 최소 수업 수를 쓴다", () => {
    const { index } = buildReferenceIndex(ref);
    const split = num("writing.split_from_level");
    const writing = index.levelSpec("writing", split);
    if (writing?.area !== "writing" || !writing.frame) {
      throw new Error("쓰기 단원 틀 견본이 없다");
    }
    const frame = resolveUnitFrame({
      area: "writing",
      level: split,
      unit: 1,
      levelSpec: writing,
      settings: num,
    });
    expect(frame).toMatchObject({
      band: writing.band,
      k: writing.frame.k,
      regularLessons: writing.frame.regularLessons,
      minLessonsSetting: writing.frame.minLessons,
      vocabCount: num(`unit.vocab_count.${writing.band}`),
      remedialLessons: num(`seed.remedial_per_unit.${writing.band}`),
      topicVariants: num(`seed.topic_variants.${writing.band}`),
      remedialCoverage: num(`seed.remedial_coverage.${writing.band}`),
    });
    // 같은 단계의 읽기는 구간 키를 쓴다.
    const reading = index.levelSpec("reading", split);
    if (!reading) throw new Error("읽기 단계 규격이 없다");
    expect(
      resolveUnitFrame({
        area: "reading",
        level: split,
        unit: 1,
        levelSpec: reading,
        settings: num,
      }),
    ).toMatchObject({
      k: num(`unit.new_words_per_lesson.${reading.band}`),
      regularLessons: num(`unit.regular_lessons.${reading.band}`),
      minLessonsSetting: num(`unit.min_lessons.${reading.band}`),
    });
    // 알파벳 단원(단원 0)의 단어 수는 그 단원의 단어 수다(C54 (4)).
    const alphabet = index.unitSpec("reading", 1, 0);
    const level1 = index.levelSpec("reading", 1);
    if (!alphabet || !level1) throw new Error("알파벳 단원 견본이 없다");
    expect(
      resolveUnitFrame({
        area: "reading",
        level: 1,
        unit: 0,
        levelSpec: level1,
        settings: num,
        unitWordCount: alphabet.words.length,
      }).vocabCount,
    ).toBe(alphabet.words.length);
    expect(index.frame("writing", split, 1)).toEqual(frame);
  });

  it("3.2 관계 표: 마지막 배정 수업 새 단어 6 은 30 × (1 − 0.8) 경계라 통과하고 7 이면 걸린다", () => {
    const split = num("writing.split_from_level");
    const spec = ref.levelSpecs.levelSpecs.find(
      (s) => s.area === "writing" && s.level === split,
    );
    if (spec?.area !== "writing" || !spec.frame)
      throw new Error("쓰기 틀 없음");
    const vocab = num(`unit.vocab_count.${spec.band}`);
    const mastery = num("unit.vocab_mastery");
    const boundary = Math.round(vocab * (1 - mastery));
    // 견본 쓰기 6단계 틀은 경계 그대로다(1 − 비율을 먼저 셈하면 걸린다).
    expect(lastLessonWords(vocab, spec.frame.k)).toBe(boundary);
    expect(vocab * (1 - mastery)).toBeLessThan(boundary);
    expect(
      checkFrameRelations({
        settings: num,
        levelSpecs: ref.levelSpecs.levelSpecs,
      }),
    ).toEqual([]);
    // 마지막 배정 수업이 경계 + 1 개가 되는 k
    const k = vocab - (boundary + 1);
    expect(lastLessonWords(vocab, k)).toBe(boundary + 1);
    const broken = cloneRef();
    const brokenSpec = broken.levelSpecs.levelSpecs.find(
      (s) => s.area === "writing" && s.level === split,
    );
    if (brokenSpec?.area !== "writing" || !brokenSpec.frame)
      throw new Error("쓰기 틀 없음");
    brokenSpec.frame.k = k;
    const violations = checkFrameRelations({
      settings: num,
      levelSpecs: broken.levelSpecs.levelSpecs,
    });
    expect(violations.map((v) => v.rule)).toContain("frame-last-lesson");
    expect(
      violations.find((v) => v.rule === "frame-last-lesson"),
    ).toMatchObject({
      area: "writing",
      level: split,
    });
    expect(rulesOf(broken)).toContain("frame-last-lesson");
  });

  it("3.2 관계 표: unit.max_remedial 이 seed.remedial_per_unit 보다 크면 걸린다", () => {
    const broken = cloneRef();
    const band: Band = "4-6";
    setSetting(
      broken.settings,
      `unit.max_remedial.${band}`,
      num(`seed.remedial_per_unit.${band}`) + 1,
    );
    const violations = checkFrameRelations({
      settings: reader(broken.settings),
      levelSpecs: broken.levelSpecs.levelSpecs,
    });
    expect(violations).toEqual([
      expect.objectContaining({ rule: "frame-remedial", band }),
    ]);
    expect(rulesOf(broken)).toEqual(["frame-remedial"]);
  });

  it("3.2 관계 표: 배정 수업 수가 정규 수업 수보다 많으면 걸린다", () => {
    const broken = cloneRef();
    const band: Band = "1-3";
    const assigned = Math.ceil(
      num(`unit.vocab_count.${band}`) /
        num(`unit.new_words_per_lesson.${band}`),
    );
    setSetting(broken.settings, `unit.regular_lessons.${band}`, assigned - 1);
    const violations = checkFrameRelations({
      settings: reader(broken.settings),
      levelSpecs: broken.levelSpecs.levelSpecs,
    });
    expect(violations).toEqual([
      expect.objectContaining({ rule: "frame-assigned-fits", band }),
    ]);
    // 그 구간 단원은 배정할 수 없다.
    expect(rulesOf(broken)).toEqual(["allocation", "frame-assigned-fits"]);
  });

  it("규격 파일: 설정값 키가 없거나 수가 아니면 오류", () => {
    expect(buildReferenceIndex(ref).issues).toEqual([]);
    expect(buildReferenceIndex(smallReferenceSet()).issues).toEqual([]);
    const missing = cloneRef();
    missing.settings.settings = missing.settings.settings.filter(
      (r) => r.key !== "seed.max_offband_ratio",
    );
    const missingIssues = buildReferenceIndex(missing).issues;
    expect(missingIssues).toEqual([
      expect.objectContaining({ rule: "settings", severity: "error" }),
    ]);
    expect(missingIssues[0]?.message).toContain("seed.max_offband_ratio");
    const text = cloneRef();
    setSetting(text.settings, "unit.vocab_count.7-9", "30");
    expect(rulesOf(text)).toEqual(["settings"]);
    // 쓰기 모양 사이에 빈 단계가 없어야 한다.
    const gap = cloneRef();
    setSetting(
      gap.settings,
      "writing.split_from_level",
      num("writing.light_check_until_level") + 2,
    );
    expect(rulesOf(gap)).toContain("settings");
  });

  it("규격 파일: 단원 단어 수가 unit.vocab_count 와 다르면 오류", () => {
    const broken = cloneRef();
    const unit = broken.unitSpecs.unitSpecs.find(
      (u) => u.area === "speaking" && u.level === 7 && u.unit === 3,
    );
    if (!unit) throw new Error("단원 규격 없음");
    unit.words = unit.words.slice(1);
    const issues = buildReferenceIndex(broken).issues;
    expect(issues.map((i) => i.rule)).toEqual(["reference-unit-spec"]);
    expect(issues[0]?.path).toMatch(/^unitSpecs\.\d+\.words$/);
  });

  it("규격 파일: 단원 단어의 단계 어휘 범위가 단원 단계와 다르면 오류", () => {
    const broken = cloneRef();
    const word = unitWordsOf(broken, "reading", 5, 2)[0];
    const entry = broken.vocab.vocab.find((v) => v.word === word);
    if (!entry) throw new Error("vocab 없음");
    entry.level = 4;
    // 네 영역이 같은 단원 단어를 쓰므로 네 번 걸린다.
    const issues = buildReferenceIndex(broken).issues;
    expect(issues.map((i) => i.rule)).toEqual(
      Array.from({ length: 4 }, () => "reference-unit-spec"),
    );
    expect(issues[0]?.message).toContain(String(word));
  });

  it("규격 파일: 한 영역에서 한 단어가 두 단원의 단원 단어면 오류", () => {
    const broken = cloneRef();
    const unit2 = broken.unitSpecs.unitSpecs.find(
      (u) => u.area === "writing" && u.level === 2 && u.unit === 2,
    );
    const first = unitWordsOf(broken, "writing", 2, 1)[0];
    if (!unit2 || !first) throw new Error("단원 규격 없음");
    unit2.words[0] = first;
    // 단원 2 의 원래 첫 단어는 vocab 에만 남는다(규격 파일 정합은 그 단어를 보지 않는다).
    expect(rulesOf(broken)).toEqual(["reference-unit-word-dup"]);
  });

  it("규격 파일: 쓰기 6단계 이상 단계 규격에 단원 틀이 없으면 오류", () => {
    const broken = cloneRef();
    const level = num("writing.split_from_level") + 1;
    const spec = broken.levelSpecs.levelSpecs.find(
      (s) => s.area === "writing" && s.level === level,
    );
    if (spec?.area !== "writing") throw new Error("쓰기 단계 규격 없음");
    delete spec.frame;
    expect(rulesOf(broken)).toContain("reference-level-spec");
    // 쓰기 5단계 이하에 단원 틀을 두어도 오류
    const early = cloneRef();
    const earlySpec = early.levelSpecs.levelSpecs.find(
      (s) => s.area === "writing" && s.level === level - 2,
    );
    if (earlySpec?.area !== "writing") throw new Error("쓰기 단계 규격 없음");
    earlySpec.frame = { k: 1, regularLessons: 1, minLessons: 1 };
    expect(rulesOf(early)).toContain("reference-level-spec");
  });
});

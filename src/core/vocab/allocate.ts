// 어휘 배정과 단원 틀(plan-p04b '배정 함수', 3.2 '단원 수업 수는 어휘 배정에서 나온다', AC-7c).
// 숫자는 모두 12절 설정값(구간 키)과 level_specs 칸에서 읽는다. DB 없는 순수 함수다.
// P7 의 설정값 시드 적재와 2차 고급 화면이 checkFrameRelations 를 같이 쓴다(5절 · 12절).
import {
  type Area,
  approxGe,
  BAND_NAMES,
  type Band,
  bandKey,
  isAlphabetUnit,
} from "@/core/seed/structure";

/** 설정값 읽기(12절 키 → 수). 없으면 부르는 쪽이 예외를 낸다. */
export type SettingsReader = (key: string) => number;

/** 쓰기 6단계 이상 단원 틀(level_specs `frame`, 3.2). */
export type FrameOverride = {
  k: number;
  regularLessons: number;
  minLessons: number;
};

/** 단원 틀 고르기에 쓰는 단계 규격 칸. */
export type LevelSpecFrameSource = {
  area: Area;
  level: number;
  band: Band;
  frame?: FrameOverride;
};

export type UnitFrame = {
  band: Band;
  vocabCount: number;
  k: number;
  regularLessons: number;
  minLessonsSetting: number;
  remedialLessons: number;
  topicVariants: number;
  remedialCoverage: number;
};

/**
 * 단원 틀(3.2 단원 틀 표 · 쓰기 6단계 이상 문단, 12절). 구간은 단계 규격의 band.
 * 단원 1~5 의 단어 수는 unit.vocab_count.<구간>, 알파벳 단원(단원 0)은 그 단원의 단어 수(C54 (4)).
 * k · 정규 · 최소는 구간 키에서 읽되 단계 규격에 frame 이 있으면 그것을 쓴다. 보강 · 변형 · 보강 덮기는 늘 구간 키.
 */
export function resolveUnitFrame(input: {
  area: Area;
  level: number;
  unit: number;
  levelSpec: LevelSpecFrameSource;
  settings: SettingsReader;
  /** 알파벳 단원의 단어 수(단원 0 일 때 쓴다). */
  unitWordCount?: number;
}): UnitFrame {
  const { area, level, unit, levelSpec, settings } = input;
  const band = levelSpec.band;
  const key = (prefix: string) => settings(bandKey(prefix, band));
  const vocabCount = isAlphabetUnit(area, level, unit)
    ? (input.unitWordCount ?? 0)
    : key("unit.vocab_count");
  const frame = levelSpec.frame;
  return {
    band,
    vocabCount,
    k: frame?.k ?? key("unit.new_words_per_lesson"),
    regularLessons: frame?.regularLessons ?? key("unit.regular_lessons"),
    minLessonsSetting: frame?.minLessons ?? key("unit.min_lessons"),
    remedialLessons: key("seed.remedial_per_unit"),
    topicVariants: key("seed.topic_variants"),
    remedialCoverage: key("seed.remedial_coverage"),
  };
}

export type AllocatedLesson = {
  lessonNo: number;
  kind: "assigned" | "reinforce";
  newWords: string[];
};
export type AllocationFailure = "empty-words" | "bad-k" | "too-many-assigned";
export type Allocation =
  | {
      ok: true;
      lessons: AllocatedLesson[];
      assignedCount: number;
      reinforceCount: number;
      minLessons: number;
    }
  | { ok: false; reason: AllocationFailure };

/** 배정 수업 수 ⌈단어 수 ÷ k⌉. */
export function assignedLessonCount(words: number, k: number): number {
  return Math.ceil(words / k);
}

/** 마지막 배정 수업의 새 단어 수(나머지, 나누어떨어지면 k). */
export function lastLessonWords(words: number, k: number): number {
  return words - (assignedLessonCount(words, k) - 1) * k;
}

/**
 * 어휘 배정(3.2 · AC-7c). 단원 단어를 배정 차례대로 k 개씩 배정 수업 1~A 에 넣고(나머지는 마지막 수업),
 * 그 뒤를 새 단어 없는 다지기 수업으로 채워 정규 수업 수를 맞춘다. 최소 수업 수 = max(A, 설정값).
 */
export function allocateUnit(input: {
  words: readonly string[];
  k: number;
  regularLessons: number;
  minLessonsSetting: number;
}): Allocation {
  const { words, k, regularLessons, minLessonsSetting } = input;
  if (words.length === 0) return { ok: false, reason: "empty-words" };
  if (!Number.isInteger(k) || k < 1) return { ok: false, reason: "bad-k" };
  const assignedCount = assignedLessonCount(words.length, k);
  if (assignedCount > regularLessons) {
    return { ok: false, reason: "too-many-assigned" };
  }
  const lessons: AllocatedLesson[] = [];
  for (let no = 1; no <= regularLessons; no++) {
    lessons.push(
      no <= assignedCount
        ? {
            lessonNo: no,
            kind: "assigned",
            newWords: words.slice((no - 1) * k, no * k),
          }
        : { lessonNo: no, kind: "reinforce", newWords: [] },
    );
  }
  return {
    ok: true,
    lessons,
    assignedCount,
    reinforceCount: regularLessons - assignedCount,
    minLessons: Math.max(assignedCount, minLessonsSetting),
  };
}

export type FrameRule =
  | "frame-assigned-fits"
  | "frame-last-lesson"
  | "frame-remedial";
export type FrameViolation = {
  rule: FrameRule;
  band: Band;
  /** 쓰기 단계 규격의 틀이면 영역 · 단계. */
  area?: Area;
  level?: number;
  message: string;
};

function frameViolations(
  where: { band: Band; area?: Area; level?: number },
  label: string,
  vocab: number,
  k: number,
  regular: number,
  mastery: number,
): FrameViolation[] {
  const out: FrameViolation[] = [];
  if (!Number.isInteger(k) || k < 1) return out;
  const assigned = assignedLessonCount(vocab, k);
  if (assigned > regular) {
    out.push({
      rule: "frame-assigned-fits",
      ...where,
      message: `${label}: 배정 수업 ${assigned}개가 정규 수업 ${regular}개보다 많다`,
    });
  }
  const last = lastLessonWords(vocab, k);
  // V − L ≥ V × 비율 꼴로 견준다((1 − 비율)을 먼저 셈하면 경계에서 오차가 난다).
  if (!approxGe(vocab - last, vocab * mastery)) {
    out.push({
      rule: "frame-last-lesson",
      ...where,
      message: `${label}: 마지막 배정 수업 새 단어 ${last}개가 단원 단어 ${vocab} × (1 − unit.vocab_mastery ${mastery}) 를 넘는다`,
    });
  }
  return out;
}

/**
 * 3.2 관계 표의 셈할 수 있는 관계: 구간마다와 frame 이 있는 쓰기 단계마다 배정 수업 수 ≤ 정규 수업 수,
 * 마지막 배정 수업 새 단어 수 ≤ 단원 단어 × (1 − unit.vocab_mastery). 구간마다 unit.max_remedial ≤ seed.remedial_per_unit.
 */
export function checkFrameRelations(input: {
  settings: SettingsReader;
  levelSpecs: readonly LevelSpecFrameSource[];
}): FrameViolation[] {
  const { settings, levelSpecs } = input;
  const mastery = settings("unit.vocab_mastery");
  const out: FrameViolation[] = [];
  for (const band of BAND_NAMES) {
    const key = (prefix: string) => settings(bandKey(prefix, band));
    out.push(
      ...frameViolations(
        { band },
        `구간 ${band}`,
        key("unit.vocab_count"),
        key("unit.new_words_per_lesson"),
        key("unit.regular_lessons"),
        mastery,
      ),
    );
    const maxRemedial = key("unit.max_remedial");
    const seeded = key("seed.remedial_per_unit");
    if (maxRemedial > seeded) {
      out.push({
        rule: "frame-remedial",
        band,
        message: `구간 ${band}: unit.max_remedial ${maxRemedial} 이 seed.remedial_per_unit ${seeded} 보다 크다`,
      });
    }
  }
  for (const spec of levelSpecs) {
    if (!spec.frame) continue;
    out.push(
      ...frameViolations(
        { band: spec.band, area: spec.area, level: spec.level },
        `${spec.area} ${spec.level}단계 단원 틀`,
        settings(bandKey("unit.vocab_count", spec.band)),
        spec.frame.k,
        spec.frame.regularLessons,
        mastery,
      ),
    );
  }
  return out;
}

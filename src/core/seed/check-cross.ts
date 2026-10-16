// 묶음 검사(plan-p04c '묶음 검사'): 주제 변형 · 보강 덮기(오류), 칸 사이 관계 · 단계 분포 · can-do 숫자(경고).
// 관계 경고는 그래프 엔지니어링 '자료 그래프' 절차: 점은 단원 단어와 수업 칸, 선은 '배정됨'(배정 함수)과 '나옴'(글 도구)이다.
// 숫자는 설정값 · 단계 규격 · structure.ts 상수에서 읽는다. DB 없는 순수 함수다.
import {
  ENGLISH_ROLES,
  makeReport,
  type SeedIssue,
} from "@/core/seed/check-lesson";
import { TALK_ROLES } from "@/core/seed/check-talk";
import type { ReferenceIndex } from "@/core/seed/reference-index";
import {
  type Lesson,
  type LessonOf,
  type ReadingLesson,
  type SpeakingLesson,
  type TalkLesson,
  textsOfLesson,
  type WritingLesson,
} from "@/core/seed/schema/lesson";
import type { LevelSpec } from "@/core/seed/schema/reference";
import {
  type Area,
  cellKey,
  DISTRIBUTION_HALF,
  DISTRIBUTION_UPPER_ONLY_WIDTH,
  FLOAT_TOLERANCE,
  type TextFragment,
  type TextRole,
} from "@/core/seed/structure";
import {
  isEnglishSentence,
  lemmasOf,
  offbandRatio,
  sentenceWords,
  splitSentences,
  tokenize,
} from "@/core/seed/text";

/** 경고 하나. id 는 P8 이 seed/manifest 에 '그대로 · 다시 만들기'를 적을 때 쓰는 열쇠다. */
export type SeedWarning = {
  id: string;
  rule: string;
  cell?: string;
  file?: string;
  message: string;
};

/** 한 단원의 수업 칸 전부(그 단원 수업 파일의 lessons, 차례 그대로). */
export type UnitLessons = {
  area: Area;
  level: number;
  unit: number;
  file: string;
  lessons: readonly Lesson[];
};

/** 보강 덮기 · 관계에서 단어가 '나옴'으로 세는 role(plan-p04c 보강 덮기 행). */
const COVERAGE_ROLES: readonly TextRole[] = [
  "passage",
  "script",
  "prompt",
  "option",
  "answer",
  "example",
  "hint",
  "tori",
  "child",
];

function lessonKey(group: UnitLessons, lesson: Lesson): string {
  return cellKey({
    type: "lesson",
    area: group.area,
    level: group.level,
    unit: group.unit,
    kind: lesson.kind,
    lessonNo: lesson.lessonNo,
    variant: lesson.variant,
  });
}

function fragmentsOf(area: Area, lesson: Lesson): TextFragment[] {
  return textsOfLesson(area, lesson as LessonOf[typeof area]);
}

/** 글 조각에 나온 원형 id 의 수(겹쳐 나오면 그만큼). */
function countIds(
  fragments: readonly TextFragment[],
  roles: readonly TextRole[],
  index: ReferenceIndex,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const f of fragments) {
    if (!roles.includes(f.role) || f.path.startsWith("preview.")) continue;
    for (const match of lemmasOf(tokenize(f.text), index.lexicon)) {
      for (const id of new Set(match.parts.flatMap((p) => p.ids))) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return counts;
}

// ── 주제 변형 ────────────────────────────────────────────────────

/** 분량 서명(문항 수 · 유형별 수, 쓰기 문항 유형 · 문장 틀 수, 말하기 수, 회화 턴 · 질문 수). */
function amountSignature(area: Area, lesson: Lesson): string {
  switch (area) {
    case "reading": {
      const { content } = lesson as ReadingLesson;
      return JSON.stringify([
        "reading",
        content.questions.map((q) => q.type).sort(),
      ]);
    }
    case "writing": {
      const { content } = lesson as WritingLesson;
      return JSON.stringify([
        content.shape,
        content.shape === "items"
          ? content.items.map((i) => i.type).sort()
          : [],
        content.shape === "guided" ? content.sentences.length : 0,
      ]);
    }
    case "speaking": {
      const { content } = lesson as SpeakingLesson;
      return JSON.stringify([
        content.repeat.words.length,
        content.repeat.sentences.length,
        content.listening.map((l) => l.kind),
        content.questions.length,
        content.pictureTask?.images.length ?? 0,
        content.presentation
          ? content.presentation.fallbackQuestions.length
          : -1,
      ]);
    }
    case "talk": {
      const { card } = lesson as TalkLesson;
      return JSON.stringify([
        card.turns?.length ?? 0,
        card.questions?.length ?? 0,
      ]);
    }
  }
}

/** 같은 (종류, 수업 번호)의 변형끼리 새 단어 모음과 분량 서명이 같다(6.4 주제 변형). 가장 낮은 변형과 견준다. */
export function checkTopicVariants(group: UnitLessons): SeedIssue[] {
  const out: SeedIssue[] = [];
  const firsts = new Map<string, Lesson>();
  const sorted = group.lessons
    .map((lesson, i) => ({ lesson, i }))
    .sort((a, b) => a.lesson.variant - b.lesson.variant);
  for (const { lesson, i } of sorted) {
    const key = `${lesson.kind}:${lesson.lessonNo}`;
    const base = firsts.get(key);
    if (!base) {
      firsts.set(key, lesson);
      continue;
    }
    const report = makeReport(out, group.file, lessonKey(group, lesson));
    const sameWords =
      base.newWords.length === lesson.newWords.length &&
      base.newWords.every((w) => lesson.newWords.includes(w));
    if (!sameWords) {
      report(
        "topic-variants",
        `lessons.${i}.newWords`,
        `변형 ${lesson.variant} 의 새 단어가 변형 ${base.variant} 와 다르다`,
      );
    }
    if (
      amountSignature(group.area, base) !== amountSignature(group.area, lesson)
    ) {
      report(
        "topic-variants",
        `lessons.${i}`,
        `변형 ${lesson.variant} 의 분량(문항 · 활동 수)이 변형 ${base.variant} 와 다르다`,
      );
    }
  }
  return out;
}

// ── 보강 덮기 ────────────────────────────────────────────────────

/** 아이가 답하는 대상으로 나온 단원 단어(정답 보기 · 허용 정답 · 바른 답 · 따라 말할 말 · 회화 노리는 단어). */
function answerTargets(
  area: Area,
  lesson: Lesson,
  index: ReferenceIndex,
): Set<string> {
  const texts: string[] = fragmentsOf(area, lesson)
    .filter((f) => f.role === "answer")
    .map((f) => f.text);
  if (area === "reading") {
    for (const q of (lesson as ReadingLesson).content.questions) {
      texts.push(q.options[q.answerNo - 1] ?? "");
    }
  }
  if (area === "speaking") {
    for (const l of (lesson as SpeakingLesson).content.listening) {
      texts.push(l.options[l.answerNo - 1] ?? "");
    }
  }
  const ids = new Set<string>();
  for (const text of texts) {
    for (const match of lemmasOf(tokenize(text), index.lexicon)) {
      for (const p of match.parts) for (const id of p.ids) ids.add(id);
    }
  }
  if (area === "talk") {
    const { card } = lesson as TalkLesson;
    for (const t of [
      ...(card.turns ?? []),
      ...(card.moreTalk ?? []),
      ...(card.questions ?? []),
    ]) {
      for (const w of t.targets) ids.add(w);
    }
  }
  return ids;
}

/**
 * 보강 덮기(6.4): 주제 변형마다 단원 단어마다 보강 수업들의 영어 글에 나온 수 ≥ seed.remedial_coverage.<구간>.
 * 그 변형의 보강 수업이 1~seed.remedial_per_unit 다 있을 때만 본다(빈 칸은 완전성이 센다).
 * answerTargetWords 는 아이가 답하는 대상으로 한 번 이상 나온 단원 단어 수(변형 가운데 가장 적은 값, 6.3 보강 수업 행).
 */
export function checkRemedialCoverage(
  group: UnitLessons,
  index: ReferenceIndex,
): { issues: SeedIssue[]; answerTargetWords: number | undefined } {
  const out: SeedIssue[] = [];
  const frame = index.frame(group.area, group.level, group.unit);
  const words =
    index.unitSpec(group.area, group.level, group.unit)?.words ?? [];
  if (!frame || words.length === 0)
    return { issues: out, answerTargetWords: undefined };
  const report = makeReport(out, group.file, undefined);
  const byVariant = new Map<number, Lesson[]>();
  for (const lesson of group.lessons) {
    if (lesson.kind !== "remedial") continue;
    byVariant.set(lesson.variant, [
      ...(byVariant.get(lesson.variant) ?? []),
      lesson,
    ]);
  }
  let answerTargetWords: number | undefined;
  for (const [variant, lessons] of [...byVariant].sort((a, b) => a[0] - b[0])) {
    const nos = new Set(lessons.map((l) => l.lessonNo));
    const complete = Array.from(
      { length: frame.remedialLessons },
      (_, i) => i + 1,
    ).every((n) => nos.has(n));
    if (!complete) continue;
    const counts = new Map<string, number>();
    const targets = new Set<string>();
    for (const lesson of lessons) {
      for (const [id, n] of countIds(
        fragmentsOf(group.area, lesson),
        COVERAGE_ROLES,
        index,
      )) {
        counts.set(id, (counts.get(id) ?? 0) + n);
      }
      for (const id of answerTargets(group.area, lesson, index))
        targets.add(id);
    }
    const short = words.filter(
      (w) => (counts.get(w) ?? 0) < frame.remedialCoverage,
    );
    if (short.length > 0) {
      report(
        "remedial-coverage",
        `variant.${variant}`,
        `주제 변형 ${variant} 보강 수업들에 seed.remedial_coverage ${frame.remedialCoverage} 번 미만으로 나온 단원 단어: ${short.join(", ")}`,
      );
    }
    const answered = words.filter((w) => targets.has(w)).length;
    answerTargetWords =
      answerTargetWords === undefined
        ? answered
        : Math.min(answerTargetWords, answered);
  }
  return { issues: out, answerTargetWords };
}

// ── 관계(조사 P6 둘째 · 셋째) ────────────────────────────────────

/**
 * 관계 경고: 정규 수업 m 의 글에 배정 수업 번호가 m 보다 큰 단원 단어가 나온다(relation-early-use),
 * 단원 단어가 같은 변형의 다지기 수업 어디에도 다시 나오지 않는다(relation-not-reused, 다른 수업에는 나온 단어만).
 */
export function checkRelations(
  group: UnitLessons,
  index: ReferenceIndex,
): SeedWarning[] {
  const out: SeedWarning[] = [];
  const allocation = index.allocation(group.area, group.level, group.unit);
  const words =
    index.unitSpec(group.area, group.level, group.unit)?.words ?? [];
  if (!allocation?.ok) return out;
  const assignedAt = new Map<string, number>();
  for (const l of allocation.lessons)
    for (const w of l.newWords) assignedAt.set(w, l.lessonNo);
  const unitWords = new Set(words);
  const seenByVariant = new Map<
    number,
    { any: Set<string>; reinforce: Set<string>; hasReinforce: boolean }
  >();
  for (const lesson of group.lessons) {
    const counts = countIds(
      fragmentsOf(group.area, lesson),
      COVERAGE_ROLES,
      index,
    );
    const used = [...counts.keys()].filter((w) => unitWords.has(w));
    const key = lessonKey(group, lesson);
    const regular = lesson.kind !== "remedial";
    if (regular) {
      for (const word of used) {
        const at = assignedAt.get(word);
        if (at !== undefined && at > lesson.lessonNo) {
          out.push({
            id: `relation-early-use:${key}:${word}`,
            rule: "relation-early-use",
            cell: key,
            file: group.file,
            message: `수업 ${lesson.lessonNo} 의 글에 배정 수업 ${at} 의 새 단어 ${word} 가 먼저 나온다`,
          });
        }
      }
    }
    const state = seenByVariant.get(lesson.variant) ?? {
      any: new Set(),
      reinforce: new Set(),
      hasReinforce: false,
    };
    for (const w of used) state.any.add(w);
    if (lesson.kind === "reinforce") {
      state.hasReinforce = true;
      for (const w of used) state.reinforce.add(w);
    }
    seenByVariant.set(lesson.variant, state);
  }
  for (const [variant, state] of [...seenByVariant].sort(
    (a, b) => a[0] - b[0],
  )) {
    if (!state.hasReinforce) continue;
    for (const word of words) {
      if (state.any.has(word) && !state.reinforce.has(word)) {
        out.push({
          id: `relation-not-reused:${group.area}:${group.level}:${group.unit}:${variant}:${word}`,
          rule: "relation-not-reused",
          file: group.file,
          message: `주제 변형 ${variant}: 단원 단어 ${word} 가 다지기 수업 어디에도 다시 나오지 않는다`,
        });
      }
    }
  }
  return out;
}

// ── 단계 분포 ────────────────────────────────────────────────────

export type Spread = { avg: number; min: number; max: number };
/** 단원 하나의 지표(그 단원 모든 수업 · 변형). */
export type UnitStats = {
  area: Area;
  level: number;
  unit: number;
  /** 지문 낱말 수(읽기). */
  passageWords?: Spread;
  /** 영어 문장 낱말 수. */
  sentenceWords?: Spread;
  /** 어휘 범위 밖 비율(읽기 지문). */
  offbandRatio?: Spread;
  /** 아이가 답하는 대상으로 나온 단원 단어 수(보강 덮기 보고). */
  answerTargetWords?: number;
};

function spread(values: readonly number[]): Spread | undefined {
  if (values.length === 0) return undefined;
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    avg: sum / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

/** 단원 하나의 지표를 센다(보고 통계 · 분포 경고 입력). */
export function unitStats(
  group: UnitLessons,
  index: ReferenceIndex,
): UnitStats {
  const roles = group.area === "talk" ? TALK_ROLES : ENGLISH_ROLES;
  const sentenceCounts: number[] = [];
  const passages: number[] = [];
  const ratios: number[] = [];
  for (const lesson of group.lessons) {
    for (const f of fragmentsOf(group.area, lesson)) {
      if (!roles.includes(f.role)) continue;
      for (const s of splitSentences(f.text).filter(isEnglishSentence)) {
        sentenceCounts.push(sentenceWords(s));
      }
    }
    if (group.area === "reading") {
      const { content, newWords } = lesson as ReadingLesson;
      passages.push(sentenceWords(content.passage));
      ratios.push(
        offbandRatio(content.passage, {
          lexicon: index.lexicon,
          level: group.level,
          newWords,
          properNouns: content.glossary
            .filter((g) => g.proper)
            .map((g) => g.surface),
        }),
      );
    }
  }
  const stats: UnitStats = {
    area: group.area,
    level: group.level,
    unit: group.unit,
  };
  const words = spread(sentenceCounts);
  if (words) stats.sentenceWords = words;
  const passageSpread = spread(passages);
  if (passageSpread) stats.passageWords = passageSpread;
  const ratioSpread = spread(ratios);
  if (ratioSpread) stats.offbandRatio = ratioSpread;
  return stats;
}

type Metric = "passage-words" | "sentence-words" | "offband-ratio";

/**
 * 단계 분포(6.4 · AC-7d): 영역 · 단계마다 지표의 단원 평균 최댓값 − 최솟값이 폭 × DISTRIBUTION_HALF 를 넘으면 경고.
 * 폭: 지문 낱말 수 = 단계 규격 passage.words 의 max − min, 문장 낱말 수 = sentenceMaxWords × DISTRIBUTION_UPPER_ONLY_WIDTH,
 * 범위 밖 비율 = seed.max_offband_ratio × DISTRIBUTION_UPPER_ONLY_WIDTH. 경고는 종료 코드를 바꾸지 않는다.
 */
export function checkDistribution(
  stats: readonly UnitStats[],
  index: ReferenceIndex,
): SeedWarning[] {
  const out: SeedWarning[] = [];
  const groups = new Map<string, UnitStats[]>();
  for (const s of stats) {
    const key = `${s.area}:${s.level}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  for (const [key, list] of groups) {
    const [area, levelText] = key.split(":");
    const level = Number(levelText);
    const spec = index.levelSpec(area as Area, level);
    if (!spec) continue;
    const metrics: {
      metric: Metric;
      pick: (s: UnitStats) => Spread | undefined;
      width: number | undefined;
    }[] = [
      {
        metric: "passage-words",
        pick: (s) => s.passageWords,
        width:
          spec.area === "reading" && spec.passage.words
            ? spec.passage.words.max - spec.passage.words.min
            : undefined,
      },
      {
        metric: "sentence-words",
        pick: (s) => s.sentenceWords,
        width: spec.sentenceMaxWords * DISTRIBUTION_UPPER_ONLY_WIDTH,
      },
      {
        metric: "offband-ratio",
        pick: (s) => s.offbandRatio,
        width: index.ready
          ? index.num("seed.max_offband_ratio") * DISTRIBUTION_UPPER_ONLY_WIDTH
          : undefined,
      },
    ];
    for (const { metric, pick, width } of metrics) {
      if (width === undefined) continue;
      const avgs = list
        .map(pick)
        .filter((v): v is Spread => v !== undefined)
        .map((v) => v.avg);
      if (avgs.length < 2) continue;
      const diff = Math.max(...avgs) - Math.min(...avgs);
      if (diff > width * DISTRIBUTION_HALF + FLOAT_TOLERANCE) {
        out.push({
          id: `distribution:${area}:${level}:${metric}`,
          rule: "distribution",
          message: `${area} ${level}단계 단원 평균 ${metric} 차이 ${diff.toFixed(3)} 가 폭 ${width.toFixed(3)} 의 절반을 넘는다`,
        });
      }
    }
  }
  return out;
}

// ── can-do 숫자(3.1) ─────────────────────────────────────────────

function numbersIn(value: unknown, out: Set<number>, key = ""): void {
  if (key === "revision" || key === "correction") return;
  if (typeof value === "number") out.add(value);
  else if (Array.isArray(value)) for (const v of value) numbersIn(v, out);
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) numbersIn(v, out, k);
  }
}

/** can-do 글의 숫자가 그 단계 규격 JSON 의 숫자 모음에 없으면 경고(3.1 'can-do 문장의 숫자는 3.3 표의 숫자와 같아야'). */
export function checkCanDo(levelSpecs: readonly LevelSpec[]): SeedWarning[] {
  const out: SeedWarning[] = [];
  for (const spec of levelSpecs) {
    const allowed = new Set<number>();
    numbersIn(spec, allowed);
    const strange = (spec.canDo.match(/\d+(?:\.\d+)?/g) ?? [])
      .map(Number)
      .filter((n) => !allowed.has(n));
    if (strange.length > 0) {
      out.push({
        id: `can-do-numbers:${spec.area}:${spec.level}`,
        rule: "can-do-numbers",
        message: `${spec.area} ${spec.level}단계 can-do 의 숫자 ${strange.join(", ")} 가 단계 규격에 없다`,
      });
    }
  }
  return out;
}

// 시험용 시드 만들기 함수(plan-p04a '시험용 시드 만들기 함수'). P4b · P4c · P5 · P7 이 같이 쓴다.
// 설계 숫자는 여기의 defaultSettings()(12절 기본값)와 단계 규격 견본(3.3 단계표 값)에만 두고, 시험은 여기서 읽는다(묶음 위험 4).
// 이름은 앱 안 이름(Tori · Momo)만 쓰고, 연락처 꼴 글은 두지 않는다. 무작위 값을 쓰지 않는다(같은 입력이면 같은 시드).
// 회화 카드 · 회화 평가 카드 · 선생님 이야기에는 선생님 이름(Tori · 토리 · 명단 이름)을 두지 않는다(6.4 '선생님 이름', C130).
// 읽기 · 쓰기 · 말하기 글의 Tori 는 등장인물이라 그대로 둔다(C122).
// 견본은 P4a 규격을 통과하면 된다. P4b · P4c 는 자기 검사에 맞게 내용을 고칠 수 있다(함수 이름 · 돌려주는 꼴은 바꾸지 않는다).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ENGLISH_ROLES } from "@/core/seed/check-lesson";
import { TALK_ROLES } from "@/core/seed/check-talk";
import type {
  LevelTestFile,
  PlacementFile,
  StoryFile,
  TestItem,
} from "@/core/seed/schema/assessment";
import {
  type Generation,
  type Lesson,
  type LessonFile,
  type LessonOf,
  type ReadingLesson,
  type ReadingQuestion,
  type SpeakingLesson,
  type TalkLesson,
  textsOfLesson,
  type WritingItem,
  type WritingLesson,
} from "@/core/seed/schema/lesson";
import type {
  CheckFile,
  CheckRecord,
  ReviewFile,
} from "@/core/seed/schema/records";
import type {
  ForbiddenFile,
  HomophonesFile,
  ImageEntry,
  ImagesFile,
  LevelSpec,
  LevelSpecsFile,
  ListFormsFile,
  MetaSentencesFile,
  ModelPricesFile,
  Range,
  SettingRow,
  SettingsFile,
  UnitSpec,
  UnitSpecsFile,
  VocabEntry,
  VocabFile,
  WritingFrame,
} from "@/core/seed/schema/reference";
import type {
  GreetingTurn,
  Line,
  QuestionCard,
  TalkCard,
  TalkTestSheet,
  TurnCard,
} from "@/core/seed/schema/talk";
import type { TeachersFile } from "@/core/seed/schema/teachers";
import {
  ALPHABET_UNIT,
  AREAS,
  type Area,
  BAND_INFOS,
  BAND_NAMES,
  type Band,
  bandInfo,
  bandOf,
  cefrOf,
  cellKey,
  checksFilePath,
  isAlphabetUnit,
  LEVEL_MAX,
  LEVEL_MIN,
  lessonFilePath,
  levelTestFilePath,
  PLACEHOLDER_NAME,
  PLACEMENT_AREAS,
  type PlacementArea,
  placementFilePath,
  READING_OPTIONS,
  reviewFilePath,
  SEED_FILES,
  STORIES_PER_BAND,
  STORY_KO_BANDS,
  STORY_OPTIONS,
  STORY_QUESTIONS,
  storyFilePath,
  UNITS_PER_LEVEL,
} from "@/core/seed/structure";
import { buildLexicon, type Lexicon, wordIdsIn } from "@/core/seed/text";
import { cellHash, type SeedCell, solveTargets } from "@/core/seed/validate";

// ── 작은 도구 ────────────────────────────────────────────────────

function at<T>(list: readonly T[], i: number, label = "견본"): T {
  const value = list[i];
  if (value === undefined) throw new Error(`${label}: ${i} 번째 값이 없다`);
  return value;
}

function range(min: number, max: number): Range {
  return { min, max };
}

function levels(): number[] {
  return Array.from(
    { length: LEVEL_MAX - LEVEL_MIN + 1 },
    (_, i) => LEVEL_MIN + i,
  );
}

/** 정답이 answerIndex(0부터) 자리에 오도록 보기를 돌린다. */
function placeAnswer<T>(
  answer: T,
  others: readonly T[],
  answerIndex: number,
): T[] {
  const rest = [...others];
  rest.splice(answerIndex, 0, answer);
  return rest;
}

const VERSION = { revision: 1, correction: 0 } as const;
const CREATED_ON = "2026-10-16";
const GENERATION: Generation = {
  method: "generated",
  model: "claude-opus-5-5",
  effort: "high",
  briefHash: "0123456789abcdef".repeat(4),
  agentHash: "fedcba9876543210".repeat(4),
  createdOn: CREATED_ON,
};

// ── 설정값(12절 기본값) ──────────────────────────────────────────

type ChangeVia = SettingRow["changeVia"];
type BandValues = readonly [number, number, number, number];

/** 구간 키 8종(12절 기본값 칸, 구간 차례 1-3 · 4-6 · 7-9 · 10-12). */
const BAND_SETTINGS: readonly {
  key: string;
  values: BandValues;
  changeVia: ChangeVia;
}[] = [
  { key: "unit.vocab_count", values: [30, 30, 30, 30], changeVia: "seed" },
  { key: "unit.new_words_per_lesson", values: [5, 4, 4, 3], changeVia: "seed" },
  { key: "unit.regular_lessons", values: [10, 13, 13, 15], changeVia: "seed" },
  {
    key: "unit.min_lessons",
    values: [6, 8, 9, 10],
    changeVia: "decision-first",
  },
  { key: "unit.max_remedial", values: [3, 4, 4, 5], changeVia: "advanced" },
  { key: "seed.remedial_per_unit", values: [3, 4, 4, 5], changeVia: "seed" },
  { key: "seed.remedial_coverage", values: [1, 2, 2, 2], changeVia: "seed" },
  { key: "seed.topic_variants", values: [2, 2, 2, 2], changeVia: "seed" },
];

/** 하나짜리 키 13(12절). */
const SINGLE_SETTINGS: readonly {
  key: string;
  value: number;
  changeVia: ChangeVia;
}[] = [
  { key: "unit.vocab_mastery", value: 0.8, changeVia: "decision-first" },
  { key: "seed.max_offband_ratio", value: 0.05, changeVia: "seed" },
  { key: "seed.complete_through_level", value: 6, changeVia: "seed" },
  { key: "level.test_items", value: 20, changeVia: "decision-first" },
  { key: "level.test_items_per_session", value: 10, changeVia: "seed" },
  { key: "level.test_forms", value: 3, changeVia: "seed" },
  { key: "placement.items_per_level", value: 3, changeVia: "seed" },
  { key: "talk.more_talk_turns", value: 5, changeVia: "seed" },
  { key: "talk.said_ratio", value: 0.8, changeVia: "decision-first" },
  { key: "talk.known_days", value: 2, changeVia: "decision-first" },
  {
    key: "writing.rule_check_until_level",
    value: 3,
    changeVia: "decision-first",
  },
  {
    key: "writing.light_check_until_level",
    value: 5,
    changeVia: "decision-first",
  },
  { key: "writing.split_from_level", value: 6, changeVia: "decision-first" },
];

/** 검증기(P4b · P4c)가 읽는 45 키의 12절 기본값. */
export function defaultSettings(): SettingsFile {
  const settings: SettingRow[] = [];
  for (const { key, values, changeVia } of BAND_SETTINGS) {
    BAND_NAMES.forEach((band, i) => {
      settings.push({
        key: `${key}.${band}`,
        scope: "household",
        value: at(values, i),
        changeVia,
      });
    });
  }
  for (const { key, value, changeVia } of SINGLE_SETTINGS) {
    settings.push({ key, scope: "household", value, changeVia });
  }
  return { settings };
}

/** 설정값 하나를 수로 읽는다(없거나 수가 아니면 예외). */
export function settingNumber(file: SettingsFile, key: string): number {
  const row = file.settings.find((r) => r.key === key);
  if (!row || typeof row.value !== "number") {
    throw new Error(`설정값 ${key} 가 없거나 수가 아니다`);
  }
  return row.value;
}

function bandSetting(
  file: SettingsFile,
  prefix: string,
  level: number,
): number {
  return settingNumber(file, `${prefix}.${bandOf(level)}`);
}

function withValues(
  file: SettingsFile,
  overrides: Record<string, number>,
): SettingsFile {
  return {
    settings: file.settings.map((row) => {
      const exact = overrides[row.key];
      const prefix = row.key.slice(0, row.key.lastIndexOf("."));
      const banded = BAND_NAMES.some((b) => row.key === `${prefix}.${b}`)
        ? overrides[prefix]
        : undefined;
      const value = exact ?? banded;
      return value === undefined ? row : { ...row, value };
    }),
  };
}

/**
 * 완전성 시험용 작은 단원 틀. 단어 4개에 마지막 배정 수업 새 단어 2개가 3.2 관계 표 첫 줄을 지키도록
 * unit.vocab_mastery 를 0.5 로 둔다(0.8 이면 4 × 0.2 = 0.8 개라 어떤 배정도 걸린다).
 */
export function smallFrameSettings(): SettingsFile {
  return withValues(defaultSettings(), {
    "unit.vocab_count": 4,
    "unit.new_words_per_lesson": 2,
    "unit.regular_lessons": 3,
    "unit.min_lessons": 2,
    "seed.remedial_per_unit": 1,
    "unit.max_remedial": 1,
    "seed.topic_variants": 1,
    "seed.remedial_coverage": 1,
    "level.test_items": 5,
    "level.test_items_per_session": 5,
    "level.test_forms": 1,
    "placement.items_per_level": 1,
    "talk.more_talk_turns": 2,
    "unit.vocab_mastery": 0.5,
  });
}

/** 쓰기 6단계 이상 단원 틀(3.2: 6~9단계 k 6 · 정규 7 · 최소 5, 10~12단계 k 5 · 정규 8 · 최소 6). */
export type WritingFrames = { lower: WritingFrame; upper: WritingFrame };
export function defaultWritingFrames(): WritingFrames {
  return {
    lower: { k: 6, regularLessons: 7, minLessons: 5 },
    upper: { k: 5, regularLessons: 8, minLessons: 6 },
  };
}
/** 작은 틀의 쓰기 6단계 이상 frame(2 · 3 · 2). */
export function smallWritingFrames(): WritingFrames {
  const frame = { k: 2, regularLessons: 3, minLessons: 2 };
  return { lower: { ...frame }, upper: { ...frame } };
}

// ── 단계 규격 48행(3.3 단계표 값 그대로) ───────────────────────────

/** 3.6 문장 길이 상한(단계 1~12). */
const SENTENCE_MAX_WORDS = [5, 6, 7, 8, 9, 10, 12, 13, 15, 18, 20, 22] as const;

type ReadingRow = {
  passage: { words?: Range; sentences?: Range };
  textTypes: string[];
  mix: Record<string, number>;
  minutes: number;
};
/** 3.3 읽기 표. */
const READING_TABLE: readonly ReadingRow[] = [
  {
    passage: { sentences: range(1, 3) },
    textTypes: ["그림과 짝지은 단어 · 문장"],
    mix: { picture: 5 },
    minutes: 4,
  },
  {
    passage: { words: range(20, 35), sentences: range(3, 5) },
    textTypes: ["단어 그림이 붙은 짧은 글"],
    mix: { picture: 2, fact: 3 },
    minutes: 5,
  },
  {
    passage: { words: range(35, 55) },
    textTypes: ["일상 이야기"],
    mix: { fact: 3 },
    minutes: 5,
  },
  {
    passage: { words: range(55, 80) },
    textTypes: ["일상 이야기", "짧은 안내문"],
    mix: { fact: 4 },
    minutes: 6,
  },
  {
    passage: { words: range(80, 110) },
    textTypes: ["이야기", "짧은 편지"],
    mix: { fact: 3, sequence: 1 },
    minutes: 6,
  },
  {
    passage: { words: range(100, 130) },
    textTypes: ["이야기", "편지", "안내문"],
    mix: { fact: 2, sequence: 1, "main-idea": 1 },
    minutes: 7,
  },
  {
    passage: { words: range(120, 160) },
    textTypes: ["이야기", "편지", "설명문"],
    mix: { fact: 2, inference: 1, "main-idea": 1 },
    minutes: 7,
  },
  {
    passage: { words: range(150, 190) },
    textTypes: ["이야기", "설명문", "일기"],
    mix: { fact: 2, inference: 1, "vocab-in-context": 1, "main-idea": 1 },
    minutes: 8,
  },
  {
    passage: { words: range(180, 220) },
    textTypes: ["설명문", "기사"],
    mix: { topic: 1, fact: 2, inference: 1, "vocab-in-context": 1 },
    minutes: 8,
  },
  {
    passage: { words: range(200, 250) },
    textTypes: ["설명문", "기사", "짧은 에세이"],
    mix: { gist: 1, fact: 1, inference: 2, "vocab-in-context": 1 },
    minutes: 8,
  },
  {
    passage: { words: range(230, 280) },
    textTypes: ["기사", "에세이", "의견 글"],
    mix: { topic: 1, inference: 2, purpose: 1, "vocab-in-context": 1 },
    minutes: 8,
  },
  {
    passage: { words: range(260, 300) },
    textTypes: ["에세이", "의견 글", "비교 글"],
    mix: { gist: 1, inference: 2, purpose: 1, structure: 1 },
    minutes: 8,
  },
];

/** 3.3 쓰기 표(분량 · 목표 시간)와 교정 상한(4~5단계 1, 6~9단계 2, 10~12단계 3). */
const WRITING_TABLE = [
  {
    amount: {
      kind: "items",
      words: 6,
      itemTypes: ["pick-word", "copy-tiles", "fill-letters"],
    },
    minutes: 5,
  },
  {
    amount: {
      kind: "items",
      words: 6,
      phrases: 3,
      itemTypes: ["dictation", "build-tiles", "assemble-phrase"],
    },
    minutes: 6,
  },
  {
    amount: {
      kind: "items",
      sentences: 5,
      sentenceWords: range(3, 5),
      itemTypes: ["assemble-sentence"],
    },
    minutes: 6,
  },
  {
    amount: { kind: "guided", sentences: range(3, 3), input: "word-box" },
    minutes: 5,
    maxCorrections: 1,
  },
  {
    amount: { kind: "guided", sentences: range(3, 4), input: "slot" },
    minutes: 6,
    maxCorrections: 1,
  },
  {
    amount: {
      kind: "composition",
      sentences: range(4, 5),
      words: range(30, 45),
    },
    minutes: { draft: 7, revise: 6 },
    maxCorrections: 2,
  },
  {
    amount: {
      kind: "composition",
      sentences: range(5, 6),
      words: range(45, 60),
    },
    minutes: { draft: 8, revise: 6 },
    maxCorrections: 2,
  },
  {
    amount: {
      kind: "composition",
      sentences: range(6, 7),
      words: range(55, 75),
    },
    minutes: { draft: 8, revise: 6 },
    maxCorrections: 2,
  },
  {
    amount: {
      kind: "composition",
      sentences: range(7, 8),
      words: range(70, 90),
    },
    minutes: { draft: 8, revise: 7 },
    maxCorrections: 2,
  },
  {
    amount: { kind: "composition", words: range(90, 110) },
    minutes: { draft: 10, revise: 7 },
    maxCorrections: 3,
  },
  {
    amount: { kind: "composition", words: range(110, 130) },
    minutes: { draft: 10, revise: 8 },
    maxCorrections: 3,
  },
  {
    amount: { kind: "composition", words: range(130, 150) },
    minutes: { draft: 10, revise: 8 },
    maxCorrections: 3,
  },
] as const;

type SpeakingRow = Omit<
  Extract<LevelSpec, { area: "speaking" }>,
  | "area"
  | "level"
  | "band"
  | "cefr"
  | "canDo"
  | "sentenceMaxWords"
  | "targetMinutes"
  | "revision"
  | "correction"
> & { minutes: number };
/** 3.3 말하기 표, 6.3(1~3단계 바른 답 · 1~2단계 허용 답 셋 이상 · 1~4단계 한국어 뜻). */
const SPEAKING_TABLE: readonly SpeakingRow[] = [
  {
    repeat: { words: 5, sentences: 5 },
    listening: { items: 3, options: "picture" },
    questions: { count: 4, modelAnswer: true, acceptedMin: 3, koMeaning: true },
    minutes: 8,
  },
  {
    repeat: { words: 5, sentences: 5, sentenceWords: range(3, 5) },
    listening: { items: 3, options: "picture" },
    questions: { count: 4, modelAnswer: true, acceptedMin: 3, koMeaning: true },
    minutes: 9,
  },
  {
    repeat: { words: 5, sentences: 6, sentenceWords: range(4, 6) },
    listening: { items: 3, options: "text" },
    questions: {
      count: 4,
      answerSentences: range(1, 1),
      modelAnswer: true,
      acceptedMin: 0,
      koMeaning: true,
    },
    minutes: 10,
  },
  {
    repeat: { words: 0, sentences: 4, sentenceWords: range(5, 7) },
    listening: { items: 3, options: "text" },
    questions: {
      count: 5,
      answerSentences: range(1, 1),
      modelAnswer: false,
      acceptedMin: 0,
      koMeaning: true,
    },
    minutes: 10,
  },
  {
    repeat: { words: 0, sentences: 4 },
    listening: { items: 3, options: "text" },
    questions: {
      count: 5,
      answerSentences: range(1, 2),
      modelAnswer: false,
      acceptedMin: 0,
      koMeaning: false,
    },
    minutes: 10,
  },
  {
    repeat: { words: 0, sentences: 3 },
    listening: { items: 3, options: "text" },
    questions: {
      count: 4,
      answerSentences: range(2, 2),
      modelAnswer: false,
      acceptedMin: 0,
      koMeaning: false,
    },
    pictureTask: {
      images: range(2, 3),
      ordered: false,
      sentences: range(2, 2),
    },
    minutes: 11,
  },
  {
    repeat: { words: 0, sentences: 3 },
    listening: { items: 3, options: "text" },
    questions: {
      count: 5,
      answerSentences: range(2, 3),
      modelAnswer: false,
      acceptedMin: 0,
      koMeaning: false,
    },
    minutes: 11,
  },
  {
    repeat: { words: 0, sentences: 3 },
    listening: { items: 3, options: "text" },
    questions: {
      count: 4,
      answerSentences: range(2, 3),
      modelAnswer: false,
      acceptedMin: 0,
      koMeaning: false,
    },
    pictureTask: { images: range(3, 3), ordered: true, sentences: range(3, 4) },
    minutes: 12,
  },
  {
    repeat: { words: 0, sentences: 0 },
    listening: { items: 3, options: "text" },
    questions: {
      count: 0,
      modelAnswer: false,
      acceptedMin: 0,
      koMeaning: false,
    },
    presentation: { seconds: 45, prepWords: 3, confirmQuestions: 3 },
    minutes: 10,
  },
  {
    repeat: { words: 0, sentences: 0 },
    listening: { items: 3, options: "text" },
    questions: {
      count: 0,
      modelAnswer: false,
      acceptedMin: 0,
      koMeaning: false,
    },
    presentation: { seconds: 60, prepWords: 3, confirmQuestions: 3 },
    minutes: 11,
  },
  {
    repeat: { words: 0, sentences: 0 },
    listening: { items: 3, options: "text" },
    questions: {
      count: 0,
      modelAnswer: false,
      acceptedMin: 0,
      koMeaning: false,
    },
    presentation: { seconds: 90, prepWords: 3, confirmQuestions: 3 },
    minutes: 11,
  },
  {
    repeat: { words: 0, sentences: 0 },
    listening: { items: 3, options: "text" },
    questions: {
      count: 0,
      modelAnswer: false,
      acceptedMin: 0,
      koMeaning: false,
    },
    presentation: { seconds: 120, prepWords: 3, confirmQuestions: 3 },
    minutes: 12,
  },
];

type TalkRow = {
  mode: string;
  targetTurns: number;
  missions: number;
  hintTiers: ("ko" | "frame" | "sentence")[];
  usablePhrases: number;
  minutes: number;
};
/** 3.3 회화 표 · 말 표(힌트 단 · 쓸 수 있는 말). */
const TALK_TABLE: readonly TalkRow[] = [
  {
    mode: "정해진 질문 · 답 두 개 들려주기",
    targetTurns: 15,
    missions: 0,
    hintTiers: ["ko", "sentence"],
    usablePhrases: 0,
    minutes: 10,
  },
  {
    mode: "정해진 질문 · 선생님이 되묻기",
    targetTurns: 15,
    missions: 0,
    hintTiers: ["ko", "sentence"],
    usablePhrases: 0,
    minutes: 10,
  },
  {
    mode: "정해진 질문에 한 문장으로",
    targetTurns: 15,
    missions: 0,
    hintTiers: ["ko", "frame", "sentence"],
    usablePhrases: 0,
    minutes: 10,
  },
  {
    mode: "틀 없이 한 문장으로",
    targetTurns: 20,
    missions: 0,
    hintTiers: ["ko", "frame", "sentence"],
    usablePhrases: 0,
    minutes: 15,
  },
  {
    mode: "상황극(가게 · 학교)",
    targetTurns: 20,
    missions: 3,
    hintTiers: ["ko", "frame", "sentence"],
    usablePhrases: 3,
    minutes: 15,
  },
  {
    mode: "상황극 · 아이가 먼저 묻기",
    targetTurns: 20,
    missions: 4,
    hintTiers: ["frame", "sentence"],
    usablePhrases: 2,
    minutes: 15,
  },
  {
    mode: "상황극(길 묻기 · 계획 세우기)",
    targetTurns: 20,
    missions: 5,
    hintTiers: ["frame", "sentence"],
    usablePhrases: 0,
    minutes: 15,
  },
  {
    mode: "어제 한 일 · 주말 이야기",
    targetTurns: 25,
    missions: 0,
    hintTiers: ["frame"],
    usablePhrases: 0,
    minutes: 20,
  },
  {
    mode: "취미 · 계획 이야기",
    targetTurns: 25,
    missions: 0,
    hintTiers: ["frame"],
    usablePhrases: 0,
    minutes: 20,
  },
  {
    mode: "의견과 이유 주고받기",
    targetTurns: 25,
    missions: 0,
    hintTiers: [],
    usablePhrases: 0,
    minutes: 20,
  },
  {
    mode: "들은 이야기 다시 전하기",
    targetTurns: 25,
    missions: 0,
    hintTiers: [],
    usablePhrases: 0,
    minutes: 20,
  },
  {
    mode: "두 주제 오가기",
    targetTurns: 25,
    missions: 0,
    hintTiers: [],
    usablePhrases: 0,
    minutes: 20,
  },
];

function rangeText(r: Range | undefined, unit: string): string {
  if (!r) return "";
  return r.min === r.max ? `${r.min}${unit}` : `${r.min}~${r.max}${unit}`;
}

function levelSpecRows(
  settings: SettingsFile,
  frames: WritingFrames,
): LevelSpec[] {
  const split = settingNumber(settings, "writing.split_from_level");
  const rows: LevelSpec[] = [];
  for (const level of levels()) {
    const i = level - LEVEL_MIN;
    const common = {
      level,
      band: bandOf(level),
      cefr: cefrOf(level),
      sentenceMaxWords: at(SENTENCE_MAX_WORDS, i),
      ...VERSION,
    };
    const reading = at(READING_TABLE, i);
    const total = Object.values(reading.mix).reduce((a, b) => a + b, 0);
    rows.push({
      area: "reading",
      ...common,
      canDo: `${rangeText(reading.passage.words, "단어") || rangeText(reading.passage.sentences, "문장")} 글을 읽고 문제 ${total}개에 답할 수 있다`,
      targetMinutes: reading.minutes,
      passage: reading.passage,
      textTypes: [...reading.textTypes],
      questions: { total, mix: { ...reading.mix } },
    });
    const writing = at(WRITING_TABLE, i);
    const amount = structuredClone(writing.amount) as Extract<
      LevelSpec,
      { area: "writing" }
    >["amount"];
    const writingCanDo =
      amount.kind === "items"
        ? `단어 · 어구 · 문장을 고르고 베끼고 조립해 ${amount.sentences ?? amount.words ?? 0}개를 쓸 수 있다`
        : amount.kind === "guided"
          ? `문장 틀로 ${rangeText(amount.sentences, "문장")}을 완성할 수 있다`
          : `${rangeText(amount.sentences, "문장")} ${rangeText(amount.words, "단어")} 글을 쓸 수 있다`.trim();
    rows.push({
      area: "writing",
      ...common,
      canDo: writingCanDo,
      targetMinutes: structuredClone(writing.minutes),
      amount,
      ...(level >= split
        ? {
            frame: {
              ...(bandOf(level) === "10-12" ? frames.upper : frames.lower),
            },
          }
        : {}),
      ...("maxCorrections" in writing
        ? { maxCorrections: writing.maxCorrections }
        : {}),
    });
    const { minutes: speakingMinutes, ...speaking } = structuredClone(
      at(SPEAKING_TABLE, i),
    );
    rows.push({
      area: "speaking",
      ...common,
      canDo: speaking.presentation
        ? `주제로 ${speaking.presentation.seconds}초 말하고 확인 질문 ${speaking.presentation.confirmQuestions}개에 답할 수 있다`
        : `문장 ${speaking.repeat.sentences}개를 따라 말하고 질문 ${speaking.questions.count}개에 답할 수 있다`,
      targetMinutes: speakingMinutes,
      ...speaking,
    });
    const talk = at(TALK_TABLE, i);
    const low = level <= bandInfo("1-3").last;
    rows.push({
      area: "talk",
      ...common,
      canDo:
        talk.missions > 0
          ? `선생님과 ${talk.targetTurns}번 말을 주고받으며 미션 ${talk.missions}개를 해낼 수 있다`
          : `선생님과 ${talk.targetTurns}번 말을 주고받을 수 있다`,
      targetMinutes: talk.minutes,
      segments: low
        ? ["greeting", "today_words", "practice", "talk", "wrap_up"]
        : ["greeting", "today_words", "talk", "wrap_up"],
      mode: talk.mode,
      targetTurns: talk.targetTurns,
      missions: talk.missions,
      hintTiers: [...talk.hintTiers],
      usablePhrases: talk.usablePhrases,
      cardShape: low ? "turns" : "questions",
      twoAnswers: level === 1,
      frameInTurns: level === 3,
      turnImages: low,
      koMeaning: level <= 4,
      moreTalk: low,
    });
  }
  const order = new Map(AREAS.map((a, i) => [a, i]));
  return rows.sort(
    (a, b) =>
      (order.get(a.area) ?? 0) - (order.get(b.area) ?? 0) || a.level - b.level,
  );
}

// ── 어휘 · 단원 규격 · 그림 ───────────────────────────────────────

const CONSONANTS = "bdfgklmnprstvz";
const VOWELS = "aeiou";
const SYLLABLES = CONSONANTS.length * VOWELS.length;

/** 영문자만 쓴 지어낸 낱말(자음 + 모음 세 음절, 같은 n 이면 같은 낱말). */
export function inventedWord(n: number): string {
  const syllable = (k: number) =>
    CONSONANTS.charAt(Math.floor(k / VOWELS.length) % CONSONANTS.length) +
    VOWELS.charAt(k % VOWELS.length);
  return (
    syllable(n % SYLLABLES) +
    syllable(Math.floor(n / SYLLABLES) % SYLLABLES) +
    syllable(Math.floor(n / SYLLABLES / SYLLABLES) % SYLLABLES)
  );
}

/** 단원 단어의 품사 차례(명사 · 동사 · 형용사). 명사 · 동사에는 그림이 있다. */
const POS_CYCLE = ["noun", "verb", "adjective"] as const;

function inventedEntry(word: string, index: number, level: number): VocabEntry {
  const pos = at(POS_CYCLE, index % POS_CYCLE.length);
  const example =
    pos === "noun"
      ? `This is a ${word}.`
      : pos === "verb"
        ? `I can ${word}.`
        : `It is ${word}.`;
  return {
    word,
    meaningKo: `가상 낱말 ${level}-${index + 1}`,
    example,
    pos: [pos],
    level,
    forms:
      pos === "noun"
        ? [`${word}s`]
        : pos === "verb"
          ? [`${word}s`, `${word}d`, `${word}ing`]
          : [],
    ...(pos === "adjective" ? {} : { imageKey: word }),
  };
}

/** 기능어(C54 (1))와 1단계 기본 낱말. 글로서리 · 범위 밖 비율에서 기능어를 뺀다. */
const BASE_WORDS: readonly (readonly [
  string,
  string,
  readonly string[],
  readonly VocabEntry["pos"][number][],
])[] = [
  ["a", "하나의", [], ["function"]],
  ["an", "하나의", [], ["function"]],
  ["the", "그", [], ["function"]],
  ["be", "이다", ["am", "is", "are", "was", "were"], ["verb", "function"]],
  ["do", "하다", ["does", "did"], ["verb", "function"]],
  ["have", "가지다", ["has", "had"], ["verb", "function"]],
  ["can", "할 수 있다", [], ["function"]],
  ["will", "할 것이다", [], ["function"]],
  ["not", "아니다", [], ["function"]],
  ["and", "그리고", [], ["function"]],
  ["but", "그러나", [], ["function"]],
  ["or", "또는", [], ["function"]],
  ["in", "안에", [], ["function"]],
  ["on", "위에", [], ["function"]],
  ["at", "에서", [], ["function"]],
  ["to", "에게", [], ["function"]],
  ["of", "의", [], ["function"]],
  ["with", "함께", [], ["function"]],
  ["for", "위해", [], ["function"]],
  ["this", "이것", ["these"], ["pronoun", "function"]],
  ["that", "저것", ["those"], ["pronoun", "function"]],
  ["there", "거기", [], ["function"]],
  ["here", "여기", [], ["function"]],
  ["what", "무엇", [], ["function"]],
  ["where", "어디", [], ["function"]],
  ["who", "누구", [], ["function"]],
  ["how", "어떻게", [], ["function"]],
  ["very", "아주", [], ["adverb", "function"]],
  ["too", "또한", [], ["adverb", "function"]],
  ["let", "하게 하다", ["lets"], ["verb", "function"]],
  ["I", "나", ["me", "my"], ["pronoun", "function"]],
  ["you", "너", ["your"], ["pronoun", "function"]],
  ["he", "그", ["him", "his"], ["pronoun", "function"]],
  ["she", "그녀", ["her"], ["pronoun", "function"]],
  ["it", "그것", ["its"], ["pronoun", "function"]],
  ["we", "우리", ["us", "our"], ["pronoun", "function"]],
  ["they", "그들", ["them", "their"], ["pronoun", "function"]],
  ["like", "좋아하다", ["likes", "liked"], ["verb"]],
];

/** 이미지 몇 장마다 하나를 cc_by 로 두어 저작자 표시 칸을 쓴다(견본 선택). */
const CC_BY_EVERY = 7;

export type ReferenceSet = {
  settings: SettingsFile;
  levelSpecs: LevelSpecsFile;
  unitSpecs: UnitSpecsFile;
  vocab: VocabFile;
  images: ImagesFile;
  modelPrices: ModelPricesFile;
  homophones: HomophonesFile;
  forbidden: ForbiddenFile;
  forms: ListFormsFile;
  metaSentences: MetaSentencesFile;
  teachers: TeachersFile;
};

/** 시제품 출처(seed/teachers.json 과 같은 꼴, 견본 값). */
const TEACHER_SOURCE: TeachersFile["teachers"][number]["source"] = {
  creator: "VRoid Project",
  distributionUrl: "https://opengameart.org/content/vroid-studio-cc0-models",
  originalTitle: "fixture",
  originalFile: "fixture.vrm",
  originalSha256: "0".repeat(64),
  licenseName: "CC0",
  permissions: "allowedUserName=Everyone · commercialUssageName=Allow",
  conditionsUrl: "https://hub.vroid.com/license",
};

/** 견본 명단(1-가 명단과 같은 이름 미나 · 리오, 5절 · C130). 모델 · 초상 칸은 비운다(선생님 화면 plan 때 필수). */
export function teacherRoster(): TeachersFile {
  return {
    teachers: [
      {
        key: "mina",
        kind: "vrm",
        nameKo: "미나",
        nameEn: "Mina",
        introKo: "작은 목소리도 귀 기울여 듣는,\n다정한 영어 친구예요.",
        traitsKo: ["다정하게", "차근차근", "함께 웃어요"],
        personaEn:
          "Warm and patient. You go step by step and laugh together with the child.",
        greetingEn:
          "Hello! I'm Mina. It's nice to meet you. Let's learn English together!",
        color: { room: "#e8e9d9", accent: "#386449" },
        voice: { pitch: 1.08 },
        source: { ...TEACHER_SOURCE },
      },
      {
        key: "leo",
        kind: "vrm",
        nameKo: "리오",
        nameEn: "Leo",
        introKo: "새로운 이야기가 늘 궁금한,\n밝고 편안한 영어 친구예요.",
        traitsKo: ["호기심 가득", "편안하게", "한 번 더 해요"],
        personaEn:
          "Curious and relaxed. You love new stories and cheerfully invite the child to try one more time.",
        greetingEn: "Hey! I'm Leo. I'm happy you're here.",
        color: { room: "#e0e8e8", accent: "#43667b" },
        voice: { pitch: 0.97 },
        source: { ...TEACHER_SOURCE },
      },
    ],
  };
}

/**
 * 규격 파일 한 벌: level_specs 48행(3.3 단계표 값), unit_specs 240 + 알파벳 2행, vocab(지어낸 낱말과 기능어),
 * 그림, 목록 넷, 모델 단가표. 단원 단어는 단계 · 단원마다 unit.vocab_count.<구간> 개이고 네 영역이 같이 쓴다(3.4 영역끼리 맞추지 않음).
 * 알파벳 단원 어휘 수는 unit.vocab_count 를 보지 않으므로(C54 (4)) 견본은 1~3 구간 k 개로 둔다.
 */
export function referenceSet(
  settings: SettingsFile,
  options: { writingFrames?: WritingFrames } = {},
): ReferenceSet {
  const frames = options.writingFrames ?? defaultWritingFrames();
  const vocab: VocabEntry[] = BASE_WORDS.map(
    ([word, meaningKo, forms, pos]) => ({
      word,
      meaningKo,
      example: word === "I" ? "I like it." : `It is ${word}.`,
      pos: [...pos],
      level: LEVEL_MIN,
      forms: [...forms],
    }),
  );
  let n = 0;
  const unitWords = new Map<string, string[]>();
  for (const level of levels()) {
    const count = bandSetting(settings, "unit.vocab_count", level);
    for (let unit = 1; unit <= UNITS_PER_LEVEL; unit++) {
      const words: string[] = [];
      for (let i = 0; i < count; i++) {
        const word = inventedWord(n++);
        vocab.push(inventedEntry(word, i, level));
        words.push(word);
      }
      unitWords.set(`${level}:${unit}`, words);
    }
  }
  const alphabetWords: string[] = [];
  const alphabetCount = bandSetting(
    settings,
    "unit.new_words_per_lesson",
    ALPHABET_UNIT.level,
  );
  for (let i = 0; i < alphabetCount; i++) {
    const word = inventedWord(n++);
    vocab.push(inventedEntry(word, i, ALPHABET_UNIT.level));
    alphabetWords.push(word);
  }
  const unitSpecs: UnitSpec[] = [];
  for (const area of AREAS) {
    if ((ALPHABET_UNIT.areas as readonly Area[]).includes(area)) {
      unitSpecs.push({
        area,
        level: ALPHABET_UNIT.level,
        unit: ALPHABET_UNIT.unit,
        learningElement: "알파벳 이름과 기본 소리",
        topic: "알파벳",
        words: [...alphabetWords],
        ...VERSION,
      });
    }
    for (const level of levels()) {
      for (let unit = 1; unit <= UNITS_PER_LEVEL; unit++) {
        unitSpecs.push({
          area,
          level,
          unit,
          learningElement: `${level}단계 단원 ${unit} 학습 요소`,
          topic: `${level}단계 단원 ${unit} 주제`,
          words: [...(unitWords.get(`${level}:${unit}`) ?? [])],
          ...VERSION,
        });
      }
    }
  }
  const images: ImageEntry[] = vocab
    .filter((v) => v.imageKey !== undefined)
    .map((v, i) => {
      const key = v.imageKey ?? v.word;
      const base = {
        key,
        file: `images/vocab/${key}.png`,
        source: "momo-fixture",
        word: v.word,
      };
      return i % CC_BY_EVERY === 0
        ? {
            ...base,
            license: "cc_by" as const,
            attribution: "Momo English Academy fixture",
          }
        : { ...base, license: "cc0" as const };
    });
  return {
    settings,
    levelSpecs: { levelSpecs: levelSpecRows(settings, frames) },
    unitSpecs: { unitSpecs },
    vocab: { vocab },
    images: { images },
    modelPrices: {
      models: [
        {
          // 6.6: 입력 4 · 출력 20. Opus 캐시 단가는 정본에 없어 Sonnet 과 같은 비율(쓰기 1.25배 · 읽기 0.05배)로 셈한 견본 값.
          model: "claude-opus-5-5",
          inputUsdPerMTok: 4,
          outputUsdPerMTok: 20,
          cacheWriteUsdPerMTok: 5,
          cacheReadUsdPerMTok: 0.2,
          effectiveFrom: CREATED_ON,
          thinkingDefault: "adaptive",
          thinkingOff: "between_tools",
          thinkingOffEfforts: ["low", "medium"],
          effortDefault: "high",
          serverFallback: true,
        },
        {
          // 6.6: 입력 2 · 출력 10, 5분 캐시 쓰기 2.50 · 캐시 읽기 0.10.
          model: "claude-sonnet-5-5",
          inputUsdPerMTok: 2,
          outputUsdPerMTok: 10,
          cacheWriteUsdPerMTok: 2.5,
          cacheReadUsdPerMTok: 0.1,
          effectiveFrom: CREATED_ON,
          thinkingDefault: "adaptive",
          thinkingOff: "between_tools",
          thinkingOffEfforts: ["low"],
          effortDefault: "medium",
          serverFallback: true,
        },
        {
          // 6.6: 입력 0.10 · 출력 0.50, 5분 캐시 쓰기 0.125 · 캐시 읽기 0.01.
          model: "claude-haiku-5-5",
          inputUsdPerMTok: 0.1,
          outputUsdPerMTok: 0.5,
          cacheWriteUsdPerMTok: 0.125,
          cacheReadUsdPerMTok: 0.01,
          effectiveFrom: CREATED_ON,
          thinkingDefault: "adaptive",
          thinkingOff: "disabled",
          thinkingOffEfforts: ["low", "medium", "high"],
          effortDefault: "low",
          serverFallback: false,
          fallbackOnly: false,
        },
      ],
    },
    homophones: {
      groups: [
        ["to", "too", "two"],
        ["there", "their"],
      ],
    },
    forbidden: {
      words: { en: ["kill", "stupid"], ko: ["바보", "죽어"] },
      patterns: [
        {
          id: "hit-person",
          category: "violence",
          lang: "en",
          regex: "\\bhit (?:you|him|her)\\b",
        },
        {
          id: "ask-home-en",
          category: "personal-info",
          lang: "en",
          regex: "\\bwhere do you live\\b",
        },
        {
          id: "ask-phone-en",
          category: "personal-info",
          lang: "en",
          regex: "\\bwhat(?: is|'s) your (?:phone number|address)\\b",
        },
        {
          id: "ask-home-ko",
          category: "personal-info",
          lang: "ko",
          regex: "(?:어디|주소).*(?:살아|사니|알려)",
        },
        {
          id: "phone-number",
          category: "contact",
          lang: "ko",
          regex: "\\d{2,3}-\\d{3,4}-\\d{4}",
        },
      ],
    },
    forms: {
      forms: [
        {
          id: "present-progressive",
          labelKo: "현재진행",
          introducedAt: {
            rst: { level: 4, unit: 3 },
            writing: { level: 5, unit: 4 },
          },
          patterns: ["\\b(?:am|is|are) [a-z]+ing\\b"],
          words: [],
        },
        {
          id: "was-were",
          labelKo: "was · were",
          introducedAt: {
            rst: { level: 6, unit: 1 },
            writing: { level: 7, unit: 1 },
          },
          patterns: [],
          words: ["was", "were"],
        },
        {
          id: "past-ed",
          labelKo: "규칙 동사 과거 -ed",
          introducedAt: {
            rst: { level: 6, unit: 2 },
            writing: { level: 7, unit: 2 },
          },
          patterns: [],
          // 정규식 \b[a-z]+ed\b 는 red · bed 를 잡는다(P4b 검토 M-2). 견본은 낱말 목록으로 둔다.
          words: ["jumped", "looked", "played", "walked", "liked", "wanted"],
        },
        {
          id: "will",
          labelKo: "will",
          introducedAt: {
            rst: { level: 7, unit: 4 },
            writing: { level: 8, unit: 1 },
          },
          patterns: [],
          words: ["will", "won't"],
        },
        {
          id: "present-perfect",
          labelKo: "현재완료",
          introducedAt: {
            rst: { level: 9, unit: 3 },
            writing: { level: 10, unit: 5 },
          },
          patterns: ["\\b(?:have|has) [a-z]+(?:ed|en)\\b"],
          words: [],
        },
        {
          id: "relative-who",
          labelKo: "관계대명사 who",
          introducedAt: { rst: { level: 10, unit: 1 }, writing: null },
          patterns: [],
          words: ["who is", "who are"],
        },
      ],
    },
    metaSentences: {
      phrases: [
        "the child",
        "the user",
        "the student",
        "I should",
        "I will now",
      ],
    },
    teachers: teacherRoster(),
  };
}

/** 작은 틀 규격 파일(smallFrameSettings + 쓰기 frame 2 · 3 · 2). */
export function smallReferenceSet(): ReferenceSet {
  return referenceSet(smallFrameSettings(), {
    writingFrames: smallWritingFrames(),
  });
}

// ── 견본을 만들 때 쓰는 읽기 도구 ────────────────────────────────

/** 단원 규격의 단어(배정 차례). */
export function unitWordsOf(
  ref: ReferenceSet,
  area: Area,
  level: number,
  unit: number,
): string[] {
  const spec = ref.unitSpecs.unitSpecs.find(
    (u) => u.area === area && u.level === level && u.unit === unit,
  );
  if (!spec) throw new Error(`단원 규격 없음: ${area} ${level} ${unit}`);
  return [...spec.words];
}

/** 그 단계의 k(쓰기 6단계 이상은 level_specs frame, 그 밖은 구간 키). */
export function newWordsPerLesson(
  ref: ReferenceSet,
  area: Area,
  level: number,
): number {
  const spec = ref.levelSpecs.levelSpecs.find(
    (s) => s.area === area && s.level === level,
  );
  if (spec?.area === "writing" && spec.frame) return spec.frame.k;
  return bandSetting(ref.settings, "unit.new_words_per_lesson", level);
}

function vocabEntry(ref: ReferenceSet, word: string): VocabEntry {
  const entry = ref.vocab.vocab.find((v) => v.word === word);
  if (!entry) throw new Error(`vocab 에 없는 단어: ${word}`);
  return entry;
}

function preview(ref: ReferenceSet, words: readonly string[]) {
  return words.map((word) => {
    const entry = vocabEntry(ref, word);
    return { word, meaningKo: entry.meaningKo, example: entry.example };
  });
}

/** 단원 단어를 품사로 가른다(견본 문장 틀에 넣는다). */
function wordsByPos(words: readonly string[]) {
  const pick = (pos: number) =>
    words.filter((_, i) => i % POS_CYCLE.length === pos);
  return { nouns: pick(0), verbs: pick(1), adjectives: pick(2) };
}

export type LessonSample<A extends Area = Area> = {
  area: A;
  level: number;
  unit: number;
  lesson: LessonOf[A];
};
export type AnyLessonSample = { [A in Area]: LessonSample<A> }[Area];

const SAMPLE_UNIT = 1;

function lessonHead(
  ref: ReferenceSet,
  area: Area,
  level: number,
  title: string,
) {
  const words = unitWordsOf(ref, area, level, SAMPLE_UNIT);
  const newWords = words.slice(0, newWordsPerLesson(ref, area, level));
  return {
    words,
    newWords,
    head: {
      kind: "assigned" as const,
      lessonNo: 1,
      variant: 1,
      ...VERSION,
      generation: { ...GENERATION },
      title,
      newWords: [...newWords],
    },
  };
}

// ── 읽기 견본(1 · 4단계) ─────────────────────────────────────────

function readingLessonDraft(
  ref: ReferenceSet,
  level: 1 | 4,
): LessonSample<"reading"> {
  const { words, newWords, head } = lessonHead(
    ref,
    "reading",
    level,
    `읽기 ${level}단계 첫 수업`,
  );
  const w = (i: number) => at(words, i, "읽기 단원 단어");
  if (level === 1) {
    // 단어와 짧은 문장 1~3개, 그림 고르기 5문제(3.3 읽기 1단계).
    const passage = `It is a ${w(2)} ${w(0)}. This is a ${w(3)}. I can ${w(1)} and ${w(4)}.`;
    const pictureWords = words.filter((_, i) => i % POS_CYCLE.length !== 2);
    const questions: ReadingQuestion[] = [0, 1, 2, 3, 4].map((q) => {
      const answer = at(pictureWords, q);
      const others = pictureWords
        .filter((x) => x !== answer)
        .slice(q, q + READING_OPTIONS - 1);
      return {
        kind: "picture",
        type: "picture",
        prompt: `Find the ${answer}.`,
        options: placeAnswer(answer, others, q % READING_OPTIONS),
        answerNo: (q % READING_OPTIONS) + 1,
        explanationKo: `${answer} 그림을 골라요.`,
      };
    });
    const used = [w(0), w(1), w(2), w(3), w(4)];
    return {
      area: "reading",
      level,
      unit: SAMPLE_UNIT,
      lesson: {
        ...head,
        unitWords: used,
        preview: preview(ref, newWords),
        content: {
          passage,
          targetWords: [...newWords],
          glossary: used.map((word) => ({
            surface: word,
            lemma: word,
            meaningKo: vocabEntry(ref, word).meaningKo,
          })),
          questions,
        },
      },
    };
  }
  // 4단계: 55~80단어, 사실 확인 4문제. 문장은 8단어 이하.
  const { nouns, verbs, adjectives } = wordsByPos(words);
  const [n0, n3, n6, n9, n12] = [0, 1, 2, 3, 4].map((i) => at(nouns, i));
  const [v1, v4] = [0, 1].map((i) => at(verbs, i));
  const [a2, a5] = [0, 1].map((i) => at(adjectives, i));
  const sentences = [
    `Tori has a ${a2} ${n0}.`,
    `The ${n0} is in the ${n3}.`,
    `Momo can ${v1} with the ${n0}.`,
    `They ${v4} the ${n6} at the ${n9}.`,
    `The ${n6} is very ${a5}.`,
    `Tori and Momo ${v1} there too.`,
    `Where is the ${n9}?`,
    `It is on the ${n3}.`,
    `Momo has a ${n12} for Tori.`,
    `It is ${a2} and ${a5}.`,
    `Tori can ${v4} the ${n12} too.`,
    `They are in the ${n3} with the ${n6}.`,
  ];
  const used = [n0, v1, a2, n3, v4, a5, n6, n9, n12];
  const fact = (
    prompt: string,
    answer: string,
    others: string[],
    answerIndex: number,
    explanationKo: string,
  ): ReadingQuestion => ({
    kind: "text",
    type: "fact",
    prompt,
    options: placeAnswer(answer, others, answerIndex),
    answerNo: answerIndex + 1,
    explanationKo,
  });
  return {
    area: "reading",
    level,
    unit: SAMPLE_UNIT,
    lesson: {
      ...head,
      unitWords: used,
      preview: preview(ref, newWords),
      content: {
        passage: sentences.join(" "),
        targetWords: [...newWords],
        glossary: [
          ...used.map((word) => ({
            surface: word,
            lemma: word,
            meaningKo: vocabEntry(ref, word).meaningKo,
          })),
          {
            surface: "Tori",
            lemma: "Tori",
            meaningKo: "토리(다람쥐 친구)",
            proper: true,
          },
          { surface: "Momo", lemma: "Momo", meaningKo: "모모", proper: true },
        ],
        questions: [
          fact(
            "What does Tori have?",
            `a ${a2} ${n0}`,
            [`a ${n3}`, `a ${n6}`, `a ${n9}`],
            0,
            "첫 문장에 나와요.",
          ),
          fact(
            `Where is the ${n0}?`,
            `in the ${n3}`,
            [`on the ${n9}`, `at the ${n6}`, "with Momo"],
            1,
            "둘째 문장에 나와요.",
          ),
          fact(
            "What does Momo have for Tori?",
            `a ${n12}`,
            [`a ${n0}`, `a ${n3}`, `a ${n9}`],
            2,
            "아홉째 문장에 나와요.",
          ),
          fact(
            `Where is the ${n9}?`,
            `on the ${n3}`,
            [`in the ${n6}`, `at the ${n0}`, "with Tori"],
            3,
            "여덟째 문장에 나와요.",
          ),
        ],
      },
    },
  };
}

// ── 쓰기 견본(1 · 3 · 4 · 6단계) ─────────────────────────────────

function reversedLetters(word: string): string[] {
  return word.split("").reverse();
}

function writingLessonDraft(
  ref: ReferenceSet,
  level: 1 | 3 | 4 | 6,
): LessonSample<"writing"> {
  const { words, newWords, head } = lessonHead(
    ref,
    "writing",
    level,
    `쓰기 ${level}단계 첫 수업`,
  );
  const w = (i: number) => at(words, i, "쓰기 단원 단어");
  const sample = (
    lesson: Omit<LessonOf["writing"], keyof typeof head | "preview">,
  ) => ({
    area: "writing" as const,
    level,
    unit: SAMPLE_UNIT,
    lesson: { ...head, preview: preview(ref, newWords), ...lesson },
  });
  if (level === 1) {
    // 단어 6개: 그림 보고 고르기 · 철자 타일로 베끼기 · 빠진 글자 채우기(3.3 쓰기 1단계).
    const blank = (word: string, i: number) =>
      `${word.slice(0, i)}_${word.slice(i + 1)}`;
    const items: WritingItem[] = [
      {
        type: "pick-word",
        picture: w(0),
        options: placeAnswer(w(0), [w(3), w(6)], 0),
        answerNo: 1,
        accepted: [w(0)],
      },
      {
        type: "pick-word",
        picture: w(1),
        options: placeAnswer(w(1), [w(4), w(7)], 2),
        answerNo: 3,
        accepted: [w(1)],
      },
      {
        type: "copy-tiles",
        word: w(2),
        tiles: reversedLetters(w(2)),
        accepted: [w(2)],
      },
      {
        type: "copy-tiles",
        word: w(3),
        tiles: reversedLetters(w(3)),
        accepted: [w(3)],
      },
      {
        type: "fill-letters",
        word: w(4),
        pattern: blank(w(4), 1),
        tiles: [w(4).charAt(1), "z"],
        accepted: [w(4)],
      },
      {
        type: "fill-letters",
        word: w(0),
        pattern: blank(w(0), 3),
        tiles: [w(0).charAt(3), "x"],
        accepted: [w(0)],
      },
    ];
    return sample({
      unitWords: [w(0), w(1), w(2), w(3), w(4), w(6), w(7)],
      content: { shape: "items", items },
    });
  }
  if (level === 3) {
    // 섞인 단어 카드로 문장 5개(3~5단어). 카드는 소문자, 마침표 카드를 따로 둔다.
    const sentence = (
      text: string,
      cards: string[],
      meaningKo: string,
    ): WritingItem => ({
      type: "assemble-sentence",
      cards,
      meaningKo,
      accepted: [text],
    });
    const items: WritingItem[] = [
      sentence(
        `I like the ${w(0)}.`,
        ["the", w(0), "like", "i", "."],
        "나는 그것이 좋아.",
      ),
      sentence(
        `We can ${w(1)}.`,
        [w(1), "can", "we", "."],
        "우리는 할 수 있어.",
      ),
      sentence(`It is ${w(2)}.`, ["is", w(2), "it", "."], "그건 그래."),
      sentence(
        `This is a ${w(3)}.`,
        ["a", "is", w(3), "this", "."],
        "이건 그거야.",
      ),
      sentence(
        `They ${w(4)} with Momo.`,
        ["momo", "with", w(4), "they", "."],
        "그들은 모모랑 해.",
      ),
    ];
    return sample({
      unitWords: [w(0), w(1), w(2), w(3), w(4)],
      content: { shape: "items", items },
    });
  }
  if (level === 4) {
    // 문장 틀 + 단어 상자로 3문장(3.3 쓰기 4단계).
    return sample({
      unitWords: [w(0), w(1), w(2), w(3)],
      content: {
        shape: "guided",
        task: "그림을 보고 단어 상자에서 골라 문장을 완성해요.",
        example: `I like the ${w(0)}.`,
        hints: ["Use the word box."],
        rubric: ["단어 상자의 낱말을 알맞게 골랐다"],
        sentences: [
          {
            frame: "I like the ___ and the ___.",
            wordBox: [w(0), w(3), w(6)],
            model: `I like the ${w(0)} and the ${w(3)}.`,
          },
          {
            frame: "We can ___ with Momo.",
            wordBox: [w(1), w(4)],
            model: `We can ${w(1)} with Momo.`,
          },
          {
            frame: "It is very ___.",
            wordBox: [w(2), w(5)],
            model: `It is very ${w(2)}.`,
          },
        ],
      },
    });
  }
  // 6단계: 4~5문장(30~45단어) 자유 작문. 배정 새 단어를 과제 · 예시 · 힌트에 넣는다(6.3).
  return sample({
    unitWords: [w(0), w(1), w(2), w(3), w(4), w(5)],
    content: {
      shape: "composition",
      task: "나의 하루를 4~5문장으로 써요.",
      example: [
        `I have a ${w(2)} ${w(0)} and a ${w(3)}.`,
        `Every morning, I ${w(1)} with my ${w(0)}.`,
        `My friend Momo can ${w(4)} very well.`,
        `The ${w(3)} is ${w(5)} and fun.`,
        "I like my day with Tori.",
      ].join(" "),
      hints: [`Use ${w(0)} and ${w(3)}.`, `What can you ${w(1)}?`],
      rubric: ["과제 충족", "문법", "어휘"],
    },
  });
}

// ── 말하기 견본(1 · 6 · 10단계) ──────────────────────────────────

function speakingLessonDraft(
  ref: ReferenceSet,
  level: 1 | 6 | 10,
): LessonSample<"speaking"> {
  const { words, newWords, head } = lessonHead(
    ref,
    "speaking",
    level,
    `말하기 ${level}단계 첫 수업`,
  );
  const w = (i: number) => at(words, i, "말하기 단원 단어");
  const sample = (
    unitWords: string[],
    content: LessonOf["speaking"]["content"],
  ) => ({
    area: "speaking" as const,
    level,
    unit: SAMPLE_UNIT,
    lesson: { ...head, unitWords, preview: preview(ref, newWords), content },
  });
  const textListening = (
    script: string,
    prompt: string,
    answer: string,
    others: string[],
    i: number,
  ) => ({
    kind: "text" as const,
    script,
    prompt,
    options: placeAnswer(answer, others, i),
    answerNo: i + 1,
  });
  if (level === 1) {
    // 단어 5 + 짧은 문장 5, 듣고 그림 고르기 3, 단어로 답하기 4(바른 답 · 허용 답 셋 · 한국어 뜻).
    const pictures = [w(0), w(1), w(3), w(4), w(6)];
    return sample([w(0), w(1), w(2), w(3), w(4), w(6)], {
      repeat: {
        words: [w(0), w(1), w(2), w(3), w(4)],
        sentences: [
          `This is a ${w(0)}.`,
          `I can ${w(1)}.`,
          `It is ${w(2)}.`,
          `This is a ${w(3)}.`,
          `I can ${w(4)}.`,
        ],
      },
      listening: [0, 1, 2].map((i) => {
        const answer = at(pictures, i);
        return {
          kind: "picture" as const,
          script: `This is a ${answer}.`,
          options: placeAnswer(
            answer,
            pictures.filter((p) => p !== answer).slice(0, READING_OPTIONS - 1),
            i,
          ),
          answerNo: i + 1,
        };
      }),
      questions: [
        {
          en: "What is this?",
          ko: "이거 뭐야?",
          modelAnswer: `It is a ${w(0)}.`,
          accepted: [w(0), `a ${w(0)}`, `It is a ${w(0)}.`],
        },
        {
          en: "What can you do?",
          ko: "너는 뭘 할 수 있어?",
          modelAnswer: `I can ${w(1)}.`,
          accepted: [w(1), `${w(1)}!`, `I can ${w(1)}.`],
        },
        {
          en: "How is it?",
          ko: "그거 어때?",
          modelAnswer: `It is ${w(2)}.`,
          accepted: [w(2), `very ${w(2)}`, `It is ${w(2)}.`],
        },
        {
          en: "What do you see?",
          ko: "뭐가 보여?",
          modelAnswer: `I see a ${w(3)}.`,
          accepted: [w(3), `a ${w(3)}`, `I see a ${w(3)}.`],
        },
      ],
    });
  }
  if (level === 6) {
    // 문장 3, 짧은 대화 듣고 고르기 3, 그림 보고 2문장 1 + 질문 4.
    return sample([w(0), w(1), w(2), w(3)], {
      repeat: {
        words: [],
        sentences: [
          `Momo has a ${w(2)} ${w(0)}.`,
          `We ${w(1)} in the ${w(3)} every day.`,
          `Tori likes the ${w(0)} very much.`,
        ],
      },
      listening: [
        textListening(
          `Tori: Do you like the ${w(0)}? Momo: Yes, I do.`,
          "What does Momo like?",
          `the ${w(0)}`,
          [`the ${w(3)}`, `the ${w(6)}`],
          0,
        ),
        textListening(
          `Momo: Where is my ${w(3)}? Tori: It is on the desk.`,
          "Where is the bag?",
          "on the desk",
          ["in the box", "under the bed"],
          1,
        ),
        textListening(
          `Tori: Can you ${w(1)}? Momo: No, but I can ${w(4)}.`,
          "What can Momo do?",
          w(4),
          [w(1), w(7)],
          2,
        ),
      ],
      questions: [
        { en: "What do you have in your bag?" },
        { en: "What do you like to do after school?" },
        { en: "Where do you play with your friends?" },
        { en: "What did you eat this morning?" },
      ],
      pictureTask: {
        images: [w(0), w(3)],
        scene: `A ${w(2)} ${w(0)} is next to a ${w(3)}.`,
        prompt: "Look at the pictures. Say two sentences.",
      },
    });
  }
  // 10단계: 따라 말하기 없음, 설명 듣고 고르기 3, 주제 발표 1분 + 쓸 말 셋 + 예비 확인 질문 3.
  return sample([w(0), w(1), w(2)], {
    repeat: { words: [], sentences: [] },
    listening: [
      textListening(
        `Many people use a ${w(0)} at home because it saves time.`,
        "Why do people use it?",
        "It saves time.",
        ["It is cheap.", "It is new."],
        0,
      ),
      textListening(
        `Some students ${w(1)} after school, but others prefer to rest.`,
        "What do some students prefer?",
        "to rest",
        ["to study", "to run"],
        1,
      ),
      textListening(
        `The new park is ${w(2)}, so families visit it on weekends.`,
        "When do families visit?",
        "on weekends",
        ["every morning", "at night"],
        2,
      ),
    ],
    questions: [],
    presentation: {
      topic: `Is a ${w(0)} useful for students?`,
      prepWords: [w(0), w(1), w(2)],
      fallbackQuestions: [
        "Why do you think so?",
        "Can you give an example?",
        "What would your friends say?",
      ],
    },
  });
}

// ── 단원 단어 목록 채우기 ────────────────────────────────────────

const LEXICONS = new WeakMap<ReferenceSet, Lexicon>();
function lexiconOf(ref: ReferenceSet): Lexicon {
  let lexicon = LEXICONS.get(ref);
  if (!lexicon) {
    lexicon = buildLexicon(ref.vocab.vocab);
    LEXICONS.set(ref, lexicon);
  }
  return lexicon;
}

/**
 * 견본 수업의 단원 단어 목록을 수업 글에 나온 단원 단어로 채운다(6.3 '수업에 나오는 단원 단어 목록').
 * 칸 검사의 unit-words 와 같은 role(읽기 · 쓰기 · 말하기는 미리보기 밖 영어 role, 회화는 회화 몫 role) · 원형 찾기를 쓴다.
 */
function usedUnitWords<A extends Area>(
  ref: ReferenceSet,
  area: A,
  place: { level: number; unit: number },
  lesson: LessonOf[A],
): string[] {
  const lexicon = lexiconOf(ref);
  const roles = area === "talk" ? TALK_ROLES : ENGLISH_ROLES;
  const seen = new Set<string>();
  for (const fragment of textsOfLesson(area, lesson)) {
    if (
      !roles.includes(fragment.role) ||
      fragment.path.startsWith("preview.")
    ) {
      continue;
    }
    for (const id of wordIdsIn(fragment.text, lexicon)) seen.add(id);
  }
  return unitWordsOf(ref, area, place.level, place.unit).filter((w) =>
    seen.has(w),
  );
}

function withUsedUnitWords<A extends "reading" | "writing" | "speaking">(
  ref: ReferenceSet,
  sample: LessonSample<A>,
): LessonSample<A> {
  return {
    ...sample,
    lesson: {
      ...sample.lesson,
      unitWords: usedUnitWords(ref, sample.area, sample, sample.lesson),
    },
  };
}

export function readingLesson(
  ref: ReferenceSet,
  level: 1 | 4,
): LessonSample<"reading"> {
  return withUsedUnitWords(ref, readingLessonDraft(ref, level));
}

export function writingLesson(
  ref: ReferenceSet,
  level: 1 | 3 | 4 | 6,
): LessonSample<"writing"> {
  return withUsedUnitWords(ref, writingLessonDraft(ref, level));
}

export function speakingLesson(
  ref: ReferenceSet,
  level: 1 | 6 | 10,
): LessonSample<"speaking"> {
  return withUsedUnitWords(ref, speakingLessonDraft(ref, level));
}

// ── 회화 견본(1 · 3 · 4 · 5단계와 단원 카드) ─────────────────────

type Pos = (typeof POS_CYCLE)[number];
type QuestionBank = readonly { en: string; ko: string }[];
/** 품사별 선생님 질문(노리는 단어를 질문에 넣지 않는다, 6.3). 1단계 문장 길이(5) 안. 선생님 이름은 두지 않는다(C130). */
const QUESTION_BANK: Record<Pos, QuestionBank> = {
  noun: [
    { en: "What do you see?", ko: "뭐가 보여?" },
    { en: "What is this?", ko: "이거 뭐야?" },
    { en: "What do you have?", ko: "뭘 가지고 있어?" },
    { en: "What is in it?", ko: "그 안에 뭐가 있어?" },
    { en: "What do you like?", ko: "뭘 좋아해?" },
    { en: "What is on it?", ko: "그 위에 뭐가 있어?" },
  ],
  verb: [
    { en: "What can you do?", ko: "뭘 할 수 있어?" },
    { en: "What do you do?", ko: "뭐 해?" },
    { en: "What can Momo do?", ko: "모모는 뭘 할 수 있어?" },
    { en: "What can they do?", ko: "걔들은 뭘 할 수 있어?" },
    { en: "What can we do?", ko: "우리는 뭘 할 수 있어?" },
  ],
  adjective: [
    { en: "How is it?", ko: "그거 어때?" },
    { en: "How does it look?", ko: "어떻게 생겼어?" },
    { en: "Is it nice?", ko: "그거 좋아?" },
    { en: "How is that?", ko: "저거 어때?" },
  ],
};

function childLine(
  pos: Pos,
  word: string,
): { en: string; frame: string; ko: string } {
  if (pos === "noun")
    return {
      en: `I see a ${word}.`,
      frame: "I see a ___.",
      ko: "나는 그걸 봐.",
    };
  if (pos === "verb")
    return {
      en: `I can ${word}.`,
      frame: "I can ___.",
      ko: "나는 그걸 할 수 있어.",
    };
  return { en: `It is ${word}.`, frame: "It is ___.", ko: "그건 그래." };
}

/** 단어의 품사(지어낸 낱말은 하나, 견본 vocab 의 첫 품사). */
function posOfWord(ref: ReferenceSet, word: string): Pos {
  const pos = vocabEntry(ref, word).pos[0];
  return pos === "verb" || pos === "adjective" ? pos : "noun";
}

function talkLines(ko: boolean, en: string, koText: string): Line {
  return ko ? { en, ko: koText } : { en };
}

/** 수업 하나의 자리(견본 칸을 만드는 함수가 같이 쓴다). */
export type CellPlace = {
  level: number;
  unit: number;
  kind: "assigned" | "reinforce" | "remedial" | "alphabet";
  lessonNo: number;
  variant: number;
};

/** 그 자리의 새 단어(배정표, 3.2)와 이미 만난 단원 단어. */
function wordsAt(
  ref: ReferenceSet,
  area: Area,
  place: CellPlace,
): { words: string[]; newWords: string[]; met: string[] } {
  const words = unitWordsOf(ref, area, place.level, place.unit);
  const k = newWordsPerLesson(ref, area, place.level);
  if (place.kind === "assigned" || place.kind === "alphabet") {
    const newWords = words.slice((place.lessonNo - 1) * k, place.lessonNo * k);
    return { words, newWords, met: words.slice(0, place.lessonNo * k) };
  }
  return { words, newWords: [], met: words };
}

function talkSpecOf(ref: ReferenceSet, level: number) {
  const spec = ref.levelSpecs.levelSpecs.find(
    (s) => s.area === "talk" && s.level === level,
  );
  if (spec?.area !== "talk") throw new Error(`회화 ${level}단계 규격이 없다`);
  return spec;
}

/**
 * 회화 카드 하나(견본). 배정 카드는 새 단어를 앞쪽에서 처음 묻고, 다시 묻는 턴은 이 수업 새 단어 → 최근에 만난 단어 차례로 돌린다.
 * 다지기 · 보강 카드는 단원 단어 전부를 수업 번호만큼 비켜 돌린다(talk.known_days 를 채우게).
 */
export function talkCard(ref: ReferenceSet, place: CellPlace): TalkLesson {
  const spec = talkSpecOf(ref, place.level);
  const { words, newWords, met } = wordsAt(ref, "talk", place);
  const greetingTurns = 1;
  const counters: Record<Pos, number> = { noun: 0, verb: 0, adjective: 0 };
  const nextQuestion = (pos: Pos) => {
    const bank = QUESTION_BANK[pos];
    const q = at(bank, counters[pos] % bank.length);
    counters[pos]++;
    return q;
  };
  const otherSamePos = (word: string) => {
    const pos = posOfWord(ref, word);
    const inUnit = words.find((x) => x !== word && posOfWord(ref, x) === pos);
    if (inUnit) return inUnit;
    const pool = ref.vocab.vocab.find(
      (v) =>
        v.word !== word &&
        v.level <= place.level &&
        v.pos.length === 1 &&
        v.pos[0] === pos,
    );
    return pool?.word ?? word;
  };
  const turnCard = (
    word: string,
    ask: TurnCard["ask"],
    withPair: boolean,
  ): TurnCard => {
    const pos = posOfWord(ref, word);
    const q = nextQuestion(pos);
    const line = childLine(pos, word);
    const imageKey = spec.turnImages
      ? vocabEntry(ref, word).imageKey
      : undefined;
    return {
      question: { en: q.en, ko: q.ko },
      hintKo: line.ko,
      hintEn: line.en,
      ...(spec.frameInTurns ? { frameEn: line.frame } : {}),
      answerExample: line.en,
      ...(withPair
        ? {
            twoAnswers: [line.en, childLine(pos, otherSamePos(word)).en] as [
              string,
              string,
            ],
          }
        : {}),
      ...(imageKey ? { imageKey } : {}),
      targets: [word],
      ask,
    };
  };
  // 다시 묻는 턴의 차례: 배정 카드는 새 단어 → 최근 단어, 다지기 · 보강은 수업 번호만큼 비켜 단원 단어 전부.
  const dialogueTurns = spec.targetTurns - greetingTurns;
  const again =
    newWords.length > 0
      ? [
          ...newWords,
          ...[...met].reverse().filter((w) => !newWords.includes(w)),
        ]
      : words.map((_, i) =>
          at(words, (i + (place.lessonNo - 1) * dialogueTurns) % words.length),
        );
  const ko = spec.koMeaning;
  const focus = newWords.length > 0 ? newWords : words.slice(0, 2);
  const card: TalkCard = {
    topic: "좋아하는 물건 이야기",
    targetExpressions: focus.map((w) => childLine(posOfWord(ref, w), w).en),
    greetingTurns,
    greeting:
      spec.cardShape === "turns"
        ? {
            questions: [
              {
                question: { en: "How are you today?", ko: "오늘 기분 어때?" },
                hintKo: "나는 좋아.",
                hintEn: "I'm good.",
                ...(spec.frameInTurns ? { frameEn: "I'm ___." } : {}),
                answerExample: "I'm good.",
                ...(spec.twoAnswers
                  ? {
                      twoAnswers: ["I'm good.", "I'm fine."] as [
                        string,
                        string,
                      ],
                    }
                  : {}),
              } satisfies GreetingTurn,
            ],
          }
        : {
            firstLine: talkLines(
              ko,
              `Hi ${PLACEHOLDER_NAME}! How are you today?`,
              `안녕 ${PLACEHOLDER_NAME}! 오늘 어때?`,
            ),
          },
    todayWords: newWords.map((word) => {
      const entry = vocabEntry(ref, word);
      return {
        word,
        meaningKo: entry.meaningKo,
        example: entry.example,
        ...(spec.segments.includes("practice")
          ? { exampleKo: "이건 오늘 쓸 말이야." }
          : {}),
      };
    }),
    firstQuestion: "",
    flow: [
      "The teacher asks about things.",
      "The child answers.",
      "The teacher says the words again.",
    ],
    todayTopicsKo: ["좋아하는 물건", "할 수 있는 것", "물건 모양"],
    closingLines: [
      talkLines(ko, `Today you said ${at(focus, 0)}.`, "오늘 그 말을 했어."),
    ],
    safeLines: [
      talkLines(
        ko,
        "That's fun! Let's keep talking.",
        "재밌다! 계속 이야기하자.",
      ),
    ],
    endCondition: "대화 턴을 모두 마치면 정리로 간다.",
    farewell: talkLines(ko, "Bye! See you soon.", "안녕! 또 만나."),
    safetyFarewell: talkLines(
      ko,
      "Let's talk about something new!",
      "새 이야기로 이어 가자!",
    ),
    praiseLines: ["Great job!", "Good!"],
  };
  if (spec.cardShape === "turns") {
    const turns: TurnCard[] = newWords.map((w) =>
      turnCard(w, "first", spec.twoAnswers),
    );
    for (let i = 0; turns.length < dialogueTurns; i++) {
      turns.push(
        turnCard(at(again, i % again.length), "re_ask", spec.twoAnswers),
      );
    }
    const targets = turns.flatMap((t) => t.targets);
    card.turns = turns;
    if (spec.moreTalk) {
      const more = settingNumber(ref.settings, "talk.more_talk_turns");
      card.moreTalk = Array.from({ length: more }, (_, i) =>
        turnCard(at(targets, i % targets.length), "re_ask", false),
      );
    }
    card.firstQuestion = at(turns, 0).question.en;
  } else {
    const count = spec.targetTurns - greetingTurns;
    const tiers = spec.hintTiers.filter((t) => t !== "ko");
    const order = [...newWords, ...again.filter((w) => !newWords.includes(w))];
    const questions: QuestionCard[] = Array.from({ length: count }, (_, i) => {
      const word = at(order, i % order.length);
      const pos = posOfWord(ref, word);
      const q = nextQuestion(pos);
      const line = childLine(pos, word);
      return {
        en: q.en,
        ko: q.ko,
        targets: [word],
        hintKo: line.ko,
        hintTiers: tiers.map((t) => (t === "frame" ? line.frame : line.en)),
        ...(spec.usablePhrases > 0
          ? {
              usablePhrases: [line.en, "Here you are.", "Thank you."].slice(
                0,
                spec.usablePhrases,
              ),
            }
          : {}),
        answerExample: line.en,
      };
    });
    card.questions = questions;
    card.firstQuestion = at(questions, 0).en;
    if (spec.missions > 0) {
      card.missions = Array.from({ length: spec.missions }, (_, i) => ({
        ko: `미션 ${i + 1}: 물건 하나 사기`,
        en: `Buy the ${at(focus, i % focus.length)}.`,
      }));
    }
  }
  const lesson: TalkLesson = {
    kind: place.kind,
    lessonNo: place.lessonNo,
    variant: place.variant,
    ...VERSION,
    generation: { ...GENERATION },
    title: `회화 ${place.level}단계 대화 ${place.lessonNo}`,
    newWords: [...newWords],
    unitWords: [],
    card,
  };
  return { ...lesson, unitWords: usedUnitWords(ref, "talk", place, lesson) };
}

export function talkLesson(
  ref: ReferenceSet,
  level: 1 | 3 | 4 | 5,
): LessonSample<"talk"> {
  return {
    area: "talk",
    level,
    unit: SAMPLE_UNIT,
    lesson: talkCard(ref, {
      level,
      unit: SAMPLE_UNIT,
      kind: "assigned",
      lessonNo: 1,
      variant: 1,
    }),
  };
}

/** 한 단원 · 한 주제 변형의 정규 회화 카드 전부(배정 · 다지기, 3.2 배정표 차례). */
export function talkUnitCards(
  ref: ReferenceSet,
  level: number,
  unit = SAMPLE_UNIT,
  variant = 1,
): TalkLesson[] {
  const words = unitWordsOf(ref, "talk", level, unit);
  const k = newWordsPerLesson(ref, "talk", level);
  const assigned = Math.ceil(words.length / k);
  const regular = settingNumber(
    ref.settings,
    `unit.regular_lessons.${bandOf(level)}`,
  );
  return Array.from({ length: regular }, (_, i) =>
    talkCard(ref, {
      level,
      unit,
      kind: i < assigned ? "assigned" : "reinforce",
      lessonNo: i + 1,
      variant,
    }),
  );
}

/** 수업 견본 열셋(읽기 1 · 4, 쓰기 1 · 3 · 4 · 6, 말하기 1 · 6 · 10, 회화 1 · 3 · 4 · 5). */
export function lessonSamples(ref: ReferenceSet): AnyLessonSample[] {
  return [
    readingLesson(ref, 1),
    readingLesson(ref, 4),
    writingLesson(ref, 1),
    writingLesson(ref, 3),
    writingLesson(ref, 4),
    writingLesson(ref, 6),
    speakingLesson(ref, 1),
    speakingLesson(ref, 6),
    speakingLesson(ref, 10),
    talkLesson(ref, 1),
    talkLesson(ref, 3),
    talkLesson(ref, 4),
    talkLesson(ref, 5),
  ];
}

/** 견본 수업 하나를 수업 파일로 싼다. */
export function lessonFileOf(sample: AnyLessonSample): LessonFile {
  return {
    area: sample.area,
    level: sample.level,
    unit: sample.unit,
    lessons: [sample.lesson],
  } as LessonFile;
}

// ── 평가 · 배치 · 이야기 · 기록 견본 ─────────────────────────────

/** 읽기 4단계 단계 평가 1벌(level.test_items 문항, 단원마다 같은 수). */
export function readingLevelTest(ref: ReferenceSet): LevelTestFile {
  const level = 4;
  const total = settingNumber(ref.settings, "level.test_items");
  const perUnit = total / UNITS_PER_LEVEL;
  const items = Array.from({ length: total }, (_, i) => {
    const unit = Math.floor(i / perUnit) + 1;
    const words = unitWordsOf(ref, "reading", level, unit);
    const { nouns } = wordsByPos(words);
    const k = i % perUnit;
    const answer = at(nouns, k);
    const others = nouns
      .filter((x) => x !== answer)
      .slice(0, READING_OPTIONS - 1);
    return {
      no: i + 1,
      unit,
      ...VERSION,
      type: "fact" as const,
      passage: `Momo has a ${answer}. Tori looks at it.`,
      prompt: "What does Momo have?",
      options: placeAnswer(
        `a ${answer}`,
        others.map((x) => `a ${x}`),
        k % READING_OPTIONS,
      ),
      answerNo: (k % READING_OPTIONS) + 1,
      explanationKo: "첫 문장에 나와요.",
    };
  });
  return { area: "reading", level, forms: [{ form: 1, items }] };
}

/** 회화 1단계 평가 카드 1벌(level.test_items ÷ level.test_items_per_session 장, 장마다 단원별 같은 턴 수). */
export function talkLevelTest(ref: ReferenceSet): LevelTestFile {
  const level = 1;
  return {
    area: "talk",
    level,
    forms: [{ form: 1, sheets: talkSheets(ref, level, 1) }],
  };
}

/** 말하기 배치 평가 가 벌(1~12단계, 단계마다 placement.items_per_level 문항과 같은 수의 듣고 고르기 예비 문항). */
export function speakingPlacement(ref: ReferenceSet): PlacementFile {
  const count = settingNumber(ref.settings, "placement.items_per_level");
  const repeatSpec = (level: number) => {
    const spec = ref.levelSpecs.levelSpecs.find(
      (s) => s.area === "speaking" && s.level === level,
    );
    return spec?.area === "speaking" && spec.repeat.sentences > 0;
  };
  const listening = (no: number, word: string, other: string) => ({
    no,
    ...VERSION,
    type: "listening" as const,
    kind: "text" as const,
    script: `Momo has a ${word}.`,
    prompt: "What does Momo have?",
    options: placeAnswer(`a ${word}`, [`a ${other}`], no % 2),
    answerNo: (no % 2) + 1,
  });
  return {
    area: "speaking",
    form: 1,
    levels: levels().map((level) => {
      const { nouns } = wordsByPos(
        unitWordsOf(ref, "speaking", level, SAMPLE_UNIT),
      );
      const items = Array.from({ length: count }, (_, i) => {
        const word = at(nouns, i);
        const other = at(nouns, i + 1);
        return i === 0 && repeatSpec(level)
          ? {
              no: 1,
              ...VERSION,
              type: "repeat" as const,
              sentence: `This is a ${word}.`,
            }
          : listening(i + 1, word, other);
      });
      const spares = Array.from({ length: count }, (_, i) =>
        listening(i + 1, at(nouns, i + 1), at(nouns, i + 2)),
      );
      return { level, items, spares };
    }),
  };
}

/** 선생님 이야기(종류 tori_story) 한 구간(STORIES_PER_BAND 장, 장마다 질문 STORY_QUESTIONS 개 · 보기 STORY_OPTIONS 개). 선생님 이름은 두지 않는다(C130). */
export function storyFile(ref: ReferenceSet, band: Band): StoryFile {
  const first = bandInfo(band).first;
  const { nouns } = wordsByPos(unitWordsOf(ref, "talk", first, SAMPLE_UNIT));
  const withKo = STORY_KO_BANDS.includes(band);
  return {
    band,
    stories: Array.from({ length: STORIES_PER_BAND }, (_, i) => {
      const word = at(nouns, i % nouns.length);
      const options = Array.from({ length: STORY_OPTIONS }, (_, o) =>
        at(nouns, (i + o) % nouns.length),
      );
      return {
        no: i + 1,
        ...VERSION,
        generation: { ...GENERATION },
        title: `선생님 이야기 ${i + 1}`,
        textEn: `Momo finds a ${word}. They play with it.`,
        ...(withKo ? { textKo: "모모가 그걸 찾아. 다 같이 놀아." } : {}),
        questions: Array.from({ length: STORY_QUESTIONS }, (_, q) => ({
          prompt: q === 0 ? "What does Momo find?" : "Who finds it?",
          options:
            q === 0
              ? options
              : ["Momo", "a cat", "a bird"].slice(0, STORY_OPTIONS),
          answerNo: 1,
          explanationKo: "첫 문장과 둘째 문장에 나와요.",
        })),
      };
    }),
  };
}

/** 읽기 4단계 견본 수업 칸의 풀이 검사 기록(해시는 견본 값, P4c 가 cellHash 로 바꾼다). */
export function checkFile(ref: ReferenceSet): CheckFile {
  const lesson = readingLesson(ref, 4).lesson;
  return {
    records: [
      {
        cell: cellKey({
          type: "lesson",
          area: "reading",
          level: 4,
          unit: SAMPLE_UNIT,
          kind: lesson.kind,
          lessonNo: lesson.lessonNo,
          variant: lesson.variant,
        }),
        contentHash: "ab".repeat(32),
        solve: {
          at: "2026-10-16T09:00:00+09:00",
          model: "claude-sonnet-5-5",
          inputTokens: 1200,
          outputTokens: 80,
          costUsd: 0.005,
          items: lesson.content.questions.map((q, i) => ({
            no: i + 1,
            verdict: "same" as const,
            solverAnswer: q.answerNo,
          })),
        },
      },
    ],
  };
}

/** 표본 검토 줄 하나. */
export function reviewFile(): ReviewFile {
  return {
    rows: [
      {
        cell: cellKey({
          type: "lesson",
          area: "reading",
          level: 4,
          unit: SAMPLE_UNIT,
          kind: "assigned",
          lessonNo: 1,
          variant: 1,
        }),
        itemNo: null,
        reason: "ok",
        memo: "",
        date: CREATED_ON,
      },
    ],
  };
}

// ── 시드 나무 쓰기 ───────────────────────────────────────────────

export type SeedTree = {
  reference: ReferenceSet;
  lessons: LessonFile[];
  levelTests: LevelTestFile[];
  placements: PlacementFile[];
  stories: StoryFile[];
  checks: { path: string; file: CheckFile }[];
  reviews: { path: string; file: ReviewFile }[];
};

/** 견본 전부를 시드 나무 하나로 묶는다. */
export function sampleSeedTree(ref: ReferenceSet): SeedTree {
  return {
    reference: ref,
    lessons: lessonSamples(ref).map(lessonFileOf),
    levelTests: [readingLevelTest(ref), talkLevelTest(ref)],
    placements: [speakingPlacement(ref)],
    stories: [storyFile(ref, "1-3")],
    checks: [
      {
        path: checksFilePath(lessonFilePath("reading", 4, SAMPLE_UNIT)),
        file: checkFile(ref),
      },
    ],
    reviews: [{ path: reviewFilePath("reading", 4), file: reviewFile() }],
  };
}

/** 시드 나무를 파일 묶음(seed/ 뿌리 기준 경로 → JSON 글)으로 바꾼다(검증기에 바로 넘길 때). */
export function seedTreeFiles(tree: SeedTree): Map<string, string> {
  const files = new Map<string, string>();
  const put = (path: string, data: unknown) => {
    files.set(path, `${JSON.stringify(data, null, 2)}\n`);
  };
  for (const name of Object.keys(SEED_FILES) as (keyof typeof SEED_FILES)[]) {
    put(SEED_FILES[name], tree.reference[name]);
  }
  for (const file of tree.lessons)
    put(lessonFilePath(file.area, file.level, file.unit), file);
  for (const file of tree.levelTests)
    put(levelTestFilePath(file.area, file.level), file);
  for (const file of tree.placements) put(placementFilePath(file.area), file);
  for (const file of tree.stories) put(storyFilePath(file.band), file);
  for (const check of tree.checks) put(check.path, check.file);
  for (const review of tree.reviews) put(review.path, review.file);
  return files;
}

/**
 * plan-p04a '시드 파일 배치'대로 JSON 파일을 쓰고 뿌리 경로를 돌려준다.
 * 시험은 `tests/.tmp/seed-<무작위>/` 에 쓰고 지운다(`tests/.tmp` 는 .gitignore · tsconfig 에서 빠져 있다).
 */
export function writeSeedTree(root: string, tree: SeedTree): string {
  for (const [path, text] of seedTreeFiles(tree)) {
    const full = join(root, ...path.split("/"));
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
  return root;
}

// ── 꽉 찬 작은 시드(miniSeed, plan-p04c 작업 4) ──────────────────

/** 회화 평가 카드의 선생님 질문(수업 카드 질문과 겹치지 않게 따로 둔다, 6.4 단계 평가). 1단계 문장 길이(5) 안. 선생님 이름은 두지 않는다(C130). */
const SHEET_BANK: QuestionBank = [
  { en: "What is your toy?", ko: "네 장난감은 뭐야?" },
  { en: "What color is it?", ko: "그건 무슨 색이야?" },
  { en: "Where is it now?", ko: "그건 지금 어디 있어?" },
  { en: "Who has it?", ko: "누가 그걸 가지고 있어?" },
  { en: "What is your pet?", ko: "네 반려동물은 뭐야?" },
  { en: "What is on the desk?", ko: "책상 위에 뭐가 있어?" },
];

/** 회화 평가 카드 한 벌(장 level.test_items ÷ level.test_items_per_session, 장마다 단원별 같은 턴 수). */
function talkSheets(
  ref: ReferenceSet,
  level: number,
  form: number,
): TalkTestSheet[] {
  const perSheet = settingNumber(ref.settings, "level.test_items_per_session");
  const sheetCount = settingNumber(ref.settings, "level.test_items") / perSheet;
  const perUnit = perSheet / UNITS_PER_LEVEL;
  return Array.from({ length: sheetCount }, (_, s) => ({
    sheet: s + 1,
    ...VERSION,
    firstLine: {
      en: `Hi ${PLACEHOLDER_NAME}! Let's talk.`,
      ko: `안녕 ${PLACEHOLDER_NAME}! 이야기하자.`,
    },
    turns: Array.from({ length: perSheet }, (_, t) => {
      const unit = Math.floor(t / perUnit) + 1;
      const words = unitWordsOf(ref, "talk", level, unit);
      const { nouns } = wordsByPos(words);
      const word = at(nouns, (s * perSheet + t + form) % nouns.length);
      const q = at(SHEET_BANK, (t + (form - 1) * perSheet) % SHEET_BANK.length);
      return {
        question: { en: q.en, ko: q.ko },
        allowed: [
          { text: "It is a ___.", slotPos: "noun" as const },
          { text: `It is a ${word}.` },
          { text: `a ${word}` },
        ],
        childKo: "그건 그거야.",
        frameEn: "It is a ___.",
        sentenceEn: `It is a ${word}.`,
        unit,
      };
    }),
  }));
}

export type MiniSeedOptions = {
  areas: readonly Area[];
  /** 완전성 범위의 마지막 단계(지금은 1단계만 만든다). */
  through: number;
  /** 'small' 은 smallReferenceSet, 'default' 는 12절 기본값. 오류 0 은 small 에서 시험한다. */
  frame: "small" | "default";
};

/** 그림이 있는 단어(그림 보기 · 듣고 그림 고르기 · 그림 고르기에 쓴다). */
function hasImage(ref: ReferenceSet, word: string): boolean {
  return ref.vocab.vocab.find((v) => v.word === word)?.imageKey !== undefined;
}

/** 이 단원 밖의 1단계 그림 단어. */
function outsideImages(
  ref: ReferenceSet,
  unitWords: readonly string[],
): string[] {
  return ref.vocab.vocab
    .filter(
      (v) =>
        v.imageKey !== undefined &&
        v.level === LEVEL_MIN &&
        !unitWords.includes(v.word),
    )
    .map((v) => v.word);
}

/** 그림 보기 4개: 정답 · 같은 수업 글의 그림 단어 · 이 단원 밖의 그림 단어(배정 전 단원 단어를 쓰지 않게). */
function pictureOptions(
  ref: ReferenceSet,
  answer: string,
  focus: readonly string[],
  unitWords: readonly string[],
  answerIndex: number,
): string[] {
  const outside = outsideImages(ref, unitWords);
  const pool = [
    ...new Set([...focus.filter((w) => hasImage(ref, w)), ...outside]),
  ].filter((w) => w !== answer);
  return placeAnswer(
    answer,
    pool.slice(0, READING_OPTIONS - 1),
    answerIndex % READING_OPTIONS,
  );
}

/** 이 칸의 글에 넣을 단어: 배정 · 알파벳 수업은 새 단어, 다지기 · 보강은 단원 단어 전부. */
function focusOf(ref: ReferenceSet, area: Area, place: CellPlace) {
  const { words, newWords } = wordsAt(ref, area, place);
  return { words, newWords, focus: newWords.length > 0 ? newWords : words };
}

function cellHead(place: CellPlace, area: Area, newWords: readonly string[]) {
  return {
    kind: place.kind,
    lessonNo: place.lessonNo,
    variant: place.variant,
    ...VERSION,
    generation: { ...GENERATION },
    title: `${area} ${place.level}단계 수업 ${place.lessonNo}`,
    newWords: [...newWords],
  };
}

function miniReading(ref: ReferenceSet, place: CellPlace): ReadingLesson {
  const spec = ref.levelSpecs.levelSpecs.find(
    (s) => s.area === "reading" && s.level === place.level,
  );
  if (spec?.area !== "reading" || !spec.passage.sentences)
    throw new Error("miniSeed 읽기 규격(문장 수)이 없다");
  const { words, newWords, focus } = focusOf(ref, "reading", place);
  const maxSentences = spec.passage.sentences.max;
  const used = focus.slice(0, maxSentences * 2);
  const sentences: string[] = [];
  for (let i = 0; i < used.length; i += 2) {
    const [a, b] = [used[i], used[i + 1]];
    sentences.push(b ? `This is ${a} and ${b}.` : `This is ${a}.`);
  }
  const imageFocus = focus.filter((w) => hasImage(ref, w));
  const questions: ReadingQuestion[] = [];
  let n = 0;
  for (const [type, count] of Object.entries(spec.questions.mix)) {
    for (let i = 0; i < (count ?? 0); i++, n++) {
      if (type !== "picture")
        throw new Error("miniSeed 는 그림 고르기 단계만 만든다");
      const answer =
        imageFocus.length > 0
          ? at(imageFocus, n % imageFocus.length)
          : at(outsideImages(ref, words), n);
      questions.push({
        kind: "picture",
        type: "picture",
        prompt: `Find the ${answer}.`,
        options: pictureOptions(ref, answer, focus, words, n),
        answerNo: (n % READING_OPTIONS) + 1,
        explanationKo: "그림을 골라요.",
      });
    }
  }
  const lesson: ReadingLesson = {
    ...cellHead(place, "reading", newWords),
    unitWords: [],
    preview: preview(ref, newWords),
    content: {
      passage: sentences.join(" "),
      targetWords: [...newWords],
      glossary: used.map((word) => ({
        surface: word,
        lemma: word,
        meaningKo: vocabEntry(ref, word).meaningKo,
      })),
      questions,
    },
  };
  return { ...lesson, unitWords: usedUnitWords(ref, "reading", place, lesson) };
}

function miniWriting(ref: ReferenceSet, place: CellPlace): WritingLesson {
  const spec = ref.levelSpecs.levelSpecs.find(
    (s) => s.area === "writing" && s.level === place.level,
  );
  if (spec?.area !== "writing" || spec.amount.kind !== "items")
    throw new Error("miniSeed 쓰기 규격(items)이 없다");
  const { newWords, focus } = focusOf(ref, "writing", place);
  const types = spec.amount.itemTypes;
  const items: WritingItem[] = Array.from(
    { length: spec.amount.words ?? 0 },
    (_, i) => {
      const word = at(focus, i % focus.length);
      const type = at(types, i % types.length);
      if (type === "pick-word" && hasImage(ref, word)) {
        const others = ref.vocab.vocab
          .filter(
            (v) =>
              v.level === LEVEL_MIN &&
              v.word !== word &&
              v.pos[0] !== "function",
          )
          .slice(0, 2)
          .map((v) => v.word);
        return {
          type: "pick-word",
          picture: word,
          options: [word, ...others],
          answerNo: 1,
          accepted: [word],
        };
      }
      if (type === "fill-letters") {
        return {
          type: "fill-letters",
          word,
          pattern: `${word.charAt(0)}_${word.slice(2)}`,
          tiles: [word.charAt(1), "z"],
          accepted: [word],
        };
      }
      return {
        type: "copy-tiles",
        word,
        tiles: word.split("").reverse(),
        accepted: [word],
      };
    },
  );
  const lesson: WritingLesson = {
    ...cellHead(place, "writing", newWords),
    unitWords: [],
    preview: preview(ref, newWords),
    content: { shape: "items", items },
  };
  return { ...lesson, unitWords: usedUnitWords(ref, "writing", place, lesson) };
}

function miniSpeaking(ref: ReferenceSet, place: CellPlace): SpeakingLesson {
  const spec = ref.levelSpecs.levelSpecs.find(
    (s) => s.area === "speaking" && s.level === place.level,
  );
  if (spec?.area !== "speaking") throw new Error("miniSeed 말하기 규격이 없다");
  const { words, newWords, focus } = focusOf(ref, "speaking", place);
  const line = (word: string) => childLine(posOfWord(ref, word), word).en;
  const pictureFocus = focus.filter((w) => hasImage(ref, w));
  const accepted = (word: string) =>
    [word, `a ${word}`, line(word), `This is ${word}.`].slice(
      0,
      Math.max(spec.questions.acceptedMin, 1),
    );
  const lesson: SpeakingLesson = {
    ...cellHead(place, "speaking", newWords),
    unitWords: [],
    preview: preview(ref, newWords),
    content: {
      repeat: {
        words: Array.from({ length: spec.repeat.words }, (_, i) =>
          at(focus, i % focus.length),
        ),
        sentences: Array.from({ length: spec.repeat.sentences }, (_, i) =>
          line(at(focus, i % focus.length)),
        ),
      },
      listening: Array.from({ length: spec.listening.items }, (_, i) => {
        const answer =
          pictureFocus.length > 0
            ? at(pictureFocus, i % pictureFocus.length)
            : at(outsideImages(ref, words), i);
        return {
          kind: "picture" as const,
          script: `This is a ${answer}.`,
          options: pictureOptions(ref, answer, focus, words, i),
          answerNo: (i % READING_OPTIONS) + 1,
        };
      }),
      questions: Array.from({ length: spec.questions.count }, (_, i) => {
        const word = at(focus, i % focus.length);
        return {
          en: at(QUESTION_BANK[posOfWord(ref, word)], i % 2).en,
          ...(spec.questions.koMeaning
            ? { ko: at(QUESTION_BANK[posOfWord(ref, word)], i % 2).ko }
            : {}),
          ...(spec.questions.modelAnswer ? { modelAnswer: line(word) } : {}),
          ...(spec.questions.acceptedMin > 0
            ? { accepted: accepted(word) }
            : {}),
        };
      }),
    },
  };
  return {
    ...lesson,
    unitWords: usedUnitWords(ref, "speaking", place, lesson),
  };
}

function miniLesson(ref: ReferenceSet, area: Area, place: CellPlace) {
  switch (area) {
    case "reading":
      return miniReading(ref, place);
    case "writing":
      return miniWriting(ref, place);
    case "speaking":
      return miniSpeaking(ref, place);
    case "talk":
      return talkCard(ref, place);
  }
}

/** 단계 평가 한 벌의 문항(읽기 그림 · 쓰기 베끼기 · 말하기 듣고 그림 고르기). */
function miniTestItems(
  ref: ReferenceSet,
  area: "reading" | "writing" | "speaking",
  level: number,
  form: number,
): TestItem[] {
  const total = settingNumber(ref.settings, "level.test_items");
  const perUnit = total / UNITS_PER_LEVEL;
  return Array.from({ length: total }, (_, i) => {
    const unit = Math.floor(i / perUnit) + 1;
    const words = unitWordsOf(ref, area, level, unit);
    const images = words.filter((w) => hasImage(ref, w));
    const w = at(images, (i + form) % images.length);
    const head = { no: i + 1, unit, ...VERSION };
    if (area === "writing") {
      return {
        ...head,
        type: "copy-tiles" as const,
        word: w,
        tiles: w.split("").sort(),
        accepted: [w],
      };
    }
    const options = pictureOptions(ref, w, [], words, i + form);
    const answerNo = options.indexOf(w) + 1;
    if (area === "speaking") {
      return {
        ...head,
        type: "listening" as const,
        kind: "picture" as const,
        script: `Look at the ${w}.`,
        options,
        answerNo,
      };
    }
    return {
      ...head,
      type: "picture" as const,
      passage: `Look at the ${w}.`,
      prompt: `Which one is the ${w}?`,
      options,
      answerNo,
    };
  });
}

function miniPlacement(ref: ReferenceSet, area: PlacementArea): PlacementFile {
  const per = settingNumber(ref.settings, "placement.items_per_level");
  const pool = ref.vocab.vocab
    .filter((v) => v.imageKey !== undefined && v.level === LEVEL_MIN)
    .map((v) => v.word);
  const item = (level: number, no: number, spare: boolean) => {
    const w = at(pool, (level * per + no + (spare ? 1 : 0)) % pool.length);
    const options = pictureOptions(ref, w, [], [], level + no);
    const answerNo = options.indexOf(w) + 1;
    const head = { no, ...VERSION };
    if (area === "writing") {
      return {
        ...head,
        type: "copy-tiles" as const,
        word: w,
        tiles: w.split("").sort(),
        accepted: [w],
      };
    }
    if (area === "speaking") {
      return {
        ...head,
        type: "listening" as const,
        kind: "picture" as const,
        script: `Look at the ${w}.`,
        options,
        answerNo,
      };
    }
    return {
      ...head,
      type: "picture" as const,
      passage: `Look at the ${w}.`,
      prompt: `Which one is the ${w}?`,
      options,
      answerNo,
    };
  };
  return {
    area,
    form: 1,
    levels: levels().map((level) => ({
      level,
      items: Array.from({ length: per }, (_, i) => item(level, i + 1, false)),
      spares:
        area === "speaking"
          ? Array.from({ length: per }, (_, i) => item(level, i + 1, true))
          : [],
    })),
  } as PlacementFile;
}

/** 칸 하나의 풀이 검사 기록(판단 same, 해시는 validate.ts cellHash). 풀이 대상이 없으면 undefined. */
function passedRecord(cell: SeedCell): CheckRecord | undefined {
  const targets = solveTargets(cell);
  if (targets.length === 0) return undefined;
  return {
    cell: cell.key,
    contentHash: cellHash(cell.key, cell.value),
    solve: {
      at: "2026-10-16T09:00:00+09:00",
      model: "claude-sonnet-5-5",
      inputTokens: 1000,
      outputTokens: 50,
      costUsd: 0.003,
      items: targets.map((no) => ({ no, verdict: "same" as const })),
    },
  };
}

/**
 * 범위까지 꽉 찬 작은 시드(plan-p04c 작업 4): 영역 · 1~through 단계 · 단원(알파벳 단원 포함)의 정규 · 보강 · 변형 수업,
 * 단계 평가 · 회화 평가 카드, 배치 평가 가 벌 전부(1~12단계, 말하기 예비 문항), 구간 첫 단계 ≤ through 인 토리 이야기,
 * 풀이 검사 대상 칸마다 통과한 풀이 검사 기록. 지금은 through 1 만 만든다(읽기 · 쓰기 · 말하기 1단계 꼴 생성기).
 */
export function miniSeed(options: MiniSeedOptions): SeedTree {
  if (options.through !== LEVEL_MIN)
    throw new Error("miniSeed 는 지금 1단계(through 1)까지만 만든다");
  const ref =
    options.frame === "small"
      ? smallReferenceSet()
      : referenceSet(defaultSettings());
  const num = (key: string) => settingNumber(ref.settings, key);
  const lessons: LessonFile[] = [];
  const levelTests: LevelTestFile[] = [];
  const records = new Map<string, CheckRecord[]>();
  const record = (contentPath: string, cell: SeedCell) => {
    const r = passedRecord(cell);
    if (r) records.set(contentPath, [...(records.get(contentPath) ?? []), r]);
  };
  for (const area of options.areas) {
    for (let level = LEVEL_MIN; level <= options.through; level++) {
      const units = [
        ...(isAlphabetUnit(area, level, ALPHABET_UNIT.unit)
          ? [ALPHABET_UNIT.unit]
          : []),
        ...Array.from({ length: UNITS_PER_LEVEL }, (_, i) => i + 1),
      ];
      const band = bandOf(level);
      for (const unit of units) {
        const words = unitWordsOf(ref, area, level, unit);
        const k = newWordsPerLesson(ref, area, level);
        const assigned = Math.ceil(words.length / k);
        const regular = num(`unit.regular_lessons.${band}`);
        const unitLessons: Lesson[] = [];
        for (
          let variant = 1;
          variant <= num(`seed.topic_variants.${band}`);
          variant++
        ) {
          for (let no = 1; no <= regular; no++) {
            const kind = isAlphabetUnit(area, level, unit)
              ? "alphabet"
              : no <= assigned
                ? "assigned"
                : "reinforce";
            unitLessons.push(
              miniLesson(ref, area, {
                level,
                unit,
                kind,
                lessonNo: no,
                variant,
              }),
            );
          }
          for (let no = 1; no <= num(`seed.remedial_per_unit.${band}`); no++) {
            unitLessons.push(
              miniLesson(ref, area, {
                level,
                unit,
                kind: "remedial",
                lessonNo: no,
                variant,
              }),
            );
          }
        }
        const path = lessonFilePath(area, level, unit);
        for (const lesson of unitLessons) {
          const key = cellKey({
            type: "lesson",
            area,
            level,
            unit,
            kind: lesson.kind,
            lessonNo: lesson.lessonNo,
            variant: lesson.variant,
          });
          record(path, { key, kind: "lesson", area, value: lesson });
        }
        lessons.push({ area, level, unit, lessons: unitLessons } as LessonFile);
      }
      const testPath = levelTestFilePath(area, level);
      const forms = Array.from(
        { length: num("level.test_forms") },
        (_, f) => f + 1,
      );
      if (area === "talk") {
        const file: LevelTestFile = {
          area,
          level,
          forms: forms.map((form) => ({
            form,
            sheets: talkSheets(ref, level, form),
          })),
        };
        levelTests.push(file);
      } else {
        const file = {
          area,
          level,
          forms: forms.map((form) => ({
            form,
            items: miniTestItems(ref, area, level, form),
          })),
        } as LevelTestFile;
        for (const form of file.forms) {
          if (!("items" in form)) continue;
          for (const item of form.items) {
            const key = cellKey({
              type: "level-test",
              area,
              level,
              form: form.form,
              no: item.no,
            });
            record(testPath, { key, kind: "test-item", area, value: item });
          }
        }
        levelTests.push(file);
      }
    }
  }
  const placements = PLACEMENT_AREAS.filter((a) =>
    options.areas.includes(a),
  ).map((area) => miniPlacement(ref, area));
  for (const file of placements) {
    for (const entry of file.levels) {
      for (const [group, spare] of [
        ["items", false],
        ["spares", true],
      ] as const) {
        for (const item of entry[group] as { no: number }[]) {
          const key = cellKey({
            type: "placement",
            area: file.area,
            level: entry.level,
            form: file.form,
            no: item.no,
            spare,
          });
          record(placementFilePath(file.area), {
            key,
            kind: "placement",
            area: file.area,
            value: item,
          });
        }
      }
    }
  }
  const stories = options.areas.includes("talk")
    ? BAND_INFOS.filter((b) => b.first <= options.through).map((b) =>
        storyFile(ref, b.band),
      )
    : [];
  for (const file of stories) {
    for (const story of file.stories) {
      record(storyFilePath(file.band), {
        key: cellKey({ type: "story", band: file.band, no: story.no }),
        kind: "story",
        area: "talk",
        value: story,
      });
    }
  }
  return {
    reference: ref,
    lessons,
    levelTests,
    placements,
    stories,
    checks: [...records].map(([path, list]) => ({
      path: checksFilePath(path),
      file: { records: list },
    })),
    reviews: [],
  };
}

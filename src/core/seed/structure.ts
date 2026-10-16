// 시드 구조(plan-p04a '영어 값과 칸 키' · '상수' · '시드 파일 배치').
// 영역 · 단계 · 구간 · 종류 · 품사 값, 칸 키와 파일 경로, 12절 키도 level_specs 칸도 아닌 꼴 · 구조 수(C54 (2)),
// 부동소수 비교를 둔다. DB · Next · React · 파일 시스템을 가져오지 않는 순수 모듈이다.
// 이 파일의 상수 밖에 설계 숫자를 두지 않는다(묶음 위험 4). P7 check-ids 가 이 파일을 허용 목록으로 본다.

// ── 영역 · 단계 · 구간 ───────────────────────────────────────────

/** 영역 넷(3.1). 코드 값은 P3a DB 열과 같다(C54 (3)). */
export const AREAS = ["reading", "writing", "speaking", "talk"] as const;
export type Area = (typeof AREAS)[number];

/** 배치 평가가 있는 영역(3.2 '회화는 배치 평가를 따로 보지 않는다'). */
export const PLACEMENT_AREAS = ["reading", "writing", "speaking"] as const;
export type PlacementArea = (typeof PLACEMENT_AREAS)[number];

/** 단계 1~12(3.1). */
export const LEVEL_MIN = 1;
export const LEVEL_MAX = 12;

/** 단계 구간(12절 키의 `<구간>` 꼴). 차례가 12절 기본값 칸의 차례다. */
export const BAND_NAMES = ["1-3", "4-6", "7-9", "10-12"] as const;
export type Band = (typeof BAND_NAMES)[number];
export const CEFRS = ["Pre-A1", "A1", "A2", "B1"] as const;
export type Cefr = (typeof CEFRS)[number];
export type BandInfo = {
  readonly band: Band;
  readonly first: number;
  readonly last: number;
  readonly cefr: Cefr;
};

/** 구간 넷(3.1 표 · 12절). 차례가 12절 기본값 칸의 차례다. */
export const BAND_INFOS: readonly BandInfo[] = [
  { band: "1-3", first: 1, last: 3, cefr: "Pre-A1" },
  { band: "4-6", first: 4, last: 6, cefr: "A1" },
  { band: "7-9", first: 7, last: 9, cefr: "A2" },
  { band: "10-12", first: 10, last: 12, cefr: "B1" },
];

export function isLevel(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= LEVEL_MIN &&
    value <= LEVEL_MAX
  );
}

function bandInfoOfLevel(level: number): BandInfo {
  const info = isLevel(level)
    ? BAND_INFOS.find((b) => level >= b.first && level <= b.last)
    : undefined;
  if (!info)
    throw new RangeError(`단계가 ${LEVEL_MIN}~${LEVEL_MAX} 밖이다: ${level}`);
  return info;
}

/**
 * 단계 → 구간. 꼴은 P2a 의 공용 `src/core/level-band.ts` 와 같게 둔다(컨트롤러 결정,
 * plan-p04a '정할 것' 끝 문단). 합칠 때 이 함수를 그쪽 가져오기 한 줄로 바꾼다.
 */
export function bandOf(level: number): Band {
  return bandInfoOfLevel(level).band;
}

export function bandInfo(band: Band): BandInfo {
  const info = BAND_INFOS.find((b) => b.band === band);
  if (!info) throw new RangeError(`모르는 구간: ${band}`);
  return info;
}

export function isBand(value: unknown): value is Band {
  return BAND_INFOS.some((b) => b.band === value);
}

/** 단계의 CEFR(3.1 표). */
export function cefrOf(level: number): Cefr {
  return bandInfoOfLevel(level).cefr;
}

/** 구간 키(`unit.regular_lessons.1-3` 꼴)를 만든다(12절). */
export function bandKey(prefix: string, band: Band): string {
  return `${prefix}.${band}`;
}

// ── 단원 ─────────────────────────────────────────────────────────

/** 단계마다 단원 5개(3.2 단위 표 · 5절 unit_specs 240행). */
export const UNITS_PER_LEVEL = 5;

/** 알파벳 · 소리 단원: 단원 0, 1단계, 읽기 · 쓰기(5절 · 6.3 · 3.1, C54 (4)). */
export const ALPHABET_UNIT = {
  unit: 0,
  level: 1,
  areas: ["reading", "writing"],
} as const satisfies {
  unit: number;
  level: number;
  areas: readonly Area[];
};

export function isAlphabetUnit(
  area: Area,
  level: number,
  unit: number,
): boolean {
  return (
    unit === ALPHABET_UNIT.unit &&
    level === ALPHABET_UNIT.level &&
    (ALPHABET_UNIT.areas as readonly Area[]).includes(area)
  );
}

/** 그 (영역, 단계)에 있을 수 있는 단원 번호인지(1~5, 알파벳 단원 0). */
export function isUnitOf(area: Area, level: number, unit: number): boolean {
  if (!Number.isInteger(unit)) return false;
  if (unit >= 1 && unit <= UNITS_PER_LEVEL) return true;
  return isAlphabetUnit(area, level, unit);
}

// ── 종류 · 품사 · 판 ─────────────────────────────────────────────

/** 수업 파일에 드는 수업 종류(5절 lessons, P3a `lesson_kind`). */
export const LESSON_KINDS = [
  "assigned",
  "reinforce",
  "remedial",
  "alphabet",
] as const;
export type LessonKind = (typeof LESSON_KINDS)[number];
/** 토리 이야기 행의 종류(5절 lessons '종류가 토리 이야기인 행'). */
export const TORI_STORY_KIND = "tori_story";

/** 처음 묻는 턴 · 다시 묻는 턴(3.3 말 표, P3a `ask_kind`). */
export const ASK_KINDS = ["first", "re_ask"] as const;
export type AskKind = (typeof ASK_KINDS)[number];

/** 틀 자리 품사 여섯(6.4 회화 평가 카드, 13절 B5-17). */
export const SLOT_POS = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "number",
  "pronoun",
] as const;
export type SlotPos = (typeof SLOT_POS)[number];
/** 기능어 표시(5절 vocab, C54 (1)). 글로서리 · 범위 밖 비율에서 뺀다. 틀 자리 품사는 아니다. */
export const FUNCTION_POS = "function";
/** vocab 품사 값(5절 · C54 (1)). */
export const VOCAB_POS = [...SLOT_POS, FUNCTION_POS] as const;
export type VocabPos = (typeof VOCAB_POS)[number];

/** effort(6.1). */
export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORTS)[number];

/** 읽기 문항 유형(3.3 읽기 표). '글쓴이 의도 · 태도'는 purpose 하나다. */
export const READING_QUESTION_TYPES = [
  "picture",
  "fact",
  "sequence",
  "main-idea",
  "inference",
  "vocab-in-context",
  "topic",
  "gist",
  "purpose",
  "structure",
] as const;
export type ReadingQuestionType = (typeof READING_QUESTION_TYPES)[number];
export const READING_TEXT_QUESTION_TYPES = READING_QUESTION_TYPES.filter(
  (t): t is Exclude<ReadingQuestionType, "picture"> => t !== "picture",
);

/** 쓰기 1~3단계 문항 유형(3.3 쓰기 표). */
export const WRITING_ITEM_TYPES = [
  "pick-word",
  "copy-tiles",
  "fill-letters",
  "dictation",
  "build-tiles",
  "assemble-phrase",
  "assemble-sentence",
] as const;
export type WritingItemType = (typeof WRITING_ITEM_TYPES)[number];

/** 단계 평가 문항 유형(3.2 문항 점수 · 6.3). */
export const WRITING_TEST_EXTRA_TYPES = [
  "fill-blank",
  "fix-sentence",
  "composition",
] as const;
export const SPEAKING_TEST_TYPES = [
  "repeat",
  "listening",
  "question",
  "presentation",
] as const;
export const TEST_ITEM_TYPES = [
  ...READING_QUESTION_TYPES,
  ...WRITING_ITEM_TYPES,
  ...WRITING_TEST_EXTRA_TYPES,
  ...SPEAKING_TEST_TYPES,
] as const;
export type TestItemType = (typeof TEST_ITEM_TYPES)[number];

/** 회화 토막(3.3 토막 표)과 힌트 단(3.3 말 표). */
export const TALK_SEGMENTS = [
  "greeting",
  "today_words",
  "practice",
  "talk",
  "more_talk",
  "wrap_up",
] as const;
export const TALK_HINT_TIERS = ["ko", "frame", "sentence"] as const;

// ── 꼴 · 구조 수(C54 (2), 줄마다 정본 절) ─────────────────────────

/** 6.3 읽기 '보기 4개'. */
export const READING_OPTIONS = 4;
/** 3.5 '토리 이야기는 단계 구간마다 20장' · 6.3. */
export const STORIES_PER_BAND = 20;
/** 6.3 토리 이야기 '질문 2개'. */
export const STORY_QUESTIONS = 2;
/** 6.3 토리 이야기 '보기 3개'. */
export const STORY_OPTIONS = 3;
/** 6.3 토리 이야기 '한국어 뜻(1~3 · 4~6 구간)'. */
export const STORY_KO_BANDS: readonly Band[] = ["1-3", "4-6"];
/** 6.3 · 6.4 인사 턴 수 '1 또는 2'. */
export const TALK_GREETING_TURNS = { min: 1, max: 2 } as const;
/** 6.3 '한 턴은 단원 단어를 하나 또는 둘 노린다'. */
export const TALK_TARGETS_PER_TURN = { min: 1, max: 2 } as const;
/** 6.3 · 6.4 '한 카드 안에서 글자가 같은 토리 질문은 두 번까지'. */
export const TALK_SAME_QUESTION_MAX = 2;
/** 6.3 오늘 이야기 목록 '한국어 짧은 말 3~5개'. */
export const TALK_TODAY_TOPICS = { min: 3, max: 5 } as const;
/** plan-p04b 쓰기 guided · 3.3 쓰기 4~5단계 '단어 상자': 틀마다 고를 낱말이 둘 이상. */
export const WORD_BOX_MIN = 2;
/** 6.3 · 6.4 회화 평가 '허용 답 셋 이상'. */
export const TALK_TEST_ALLOWED_MIN = 3;
/** 6.4 단계 평가 '장마다 3개 이하'(잠정, 표본에서 고친다). */
export const TALK_TEST_SAME_QUESTIONS_MAX = 3;
/** 6.4 단계 평가 '같은 차례로 두 턴 넘게 이어지지 않는다'(잠정). */
export const TALK_TEST_SAME_ORDER_RUN_MAX = 2;
/** 6.3 · 13절 AI 과제 문항 '평가 전체에 2개까지'. */
export const TEST_AI_ITEMS_MAX = 2;
/** 6.4 단계 분포 '규격 폭의 절반'. */
export const DISTRIBUTION_HALF = 0.5;
/** 6.4 단계 분포 '상한만 있는 지표는 상한의 20% 를 폭으로'. */
export const DISTRIBUTION_UPPER_ONLY_WIDTH = 0.2;
/** 5절 회화 문장 단위 검사 'Mr. · Mrs. · Dr. · a.m. · p.m. 은 문장 끝이 아니다'. */
export const SENTENCE_END_ABBREVIATIONS = [
  "Mr.",
  "Mrs.",
  "Dr.",
  "a.m.",
  "p.m.",
] as const;
/** 6.4 '예 · 아니오로 답할 수 있는 질문'의 첫 낱말(영어 문법 목록). */
export const YES_NO_AUXILIARIES = [
  "do",
  "does",
  "did",
  "is",
  "are",
  "am",
  "was",
  "were",
  "can",
  "could",
  "will",
  "would",
  "shall",
  "should",
  "may",
  "might",
  "must",
  "have",
  "has",
  "had",
] as const;
/** 6.4 '틀 자리는 {NAME} 하나만'. */
export const PLACEHOLDER_NAME = "{NAME}";
/** 6.4 영어 틀의 빈칸(밑줄 셋 이상). 빈칸은 틀 자리로 세지 않는다. */
export const BLANK = /_{3,}/;
/** 부동소수 비교 오차(설계 숫자 아님). */
export const FLOAT_TOLERANCE = 1e-9;

// ── 부동소수 비교 ────────────────────────────────────────────────

export function approxEq(a: number, b: number): boolean {
  return Math.abs(a - b) <= FLOAT_TOLERANCE;
}
export function approxLe(a: number, b: number): boolean {
  return a <= b + FLOAT_TOLERANCE;
}
export function approxGe(a: number, b: number): boolean {
  return a >= b - FLOAT_TOLERANCE;
}

// ── 글 조각(plan-p04a '글 조각 목록') ─────────────────────────────

export const TEXT_ROLES = [
  "passage",
  "script",
  "story",
  "prompt",
  "option",
  "answer",
  "example",
  "hint",
  "child",
  "pair",
  "tori",
  "expression",
  "scene",
  "piece",
  "ko",
  /** 글로서리 표기형 · 원형. 영어 범위 · 길이 검사 밖, 금지어 검사 안(검토 M-1, 컨트롤러 19:1x). */
  "gloss",
] as const;
export type TextRole = (typeof TEXT_ROLES)[number];
/** 경로는 넘긴 객체 기준, 점으로 이은 칸 이름과 배열 차례(`content.questions.0.prompt`). */
export type TextFragment = { path: string; role: TextRole; text: string };

/** 경로를 잇는다(앞이 빈 글이면 뒤만). */
export function joinPath(prefix: string, key: string | number): string {
  return prefix === "" ? String(key) : `${prefix}.${key}`;
}

/** 글 조각을 모으는 도구. 값이 없으면(선택 칸) 넣지 않는다. */
export function fragmentSink() {
  const out: TextFragment[] = [];
  return {
    out,
    one(path: string, role: TextRole, text: string | undefined): void {
      if (text !== undefined) out.push({ path, role, text });
    },
    all(
      path: string,
      role: TextRole,
      texts: readonly string[] | undefined,
    ): void {
      texts?.forEach((text, i) => {
        out.push({ path: joinPath(path, i), role, text });
      });
    },
  };
}

// ── 칸 키(5절 '칸', 13절) ────────────────────────────────────────

export type LessonCell = {
  type: "lesson";
  area: Area;
  level: number;
  unit: number;
  kind: LessonKind;
  lessonNo: number;
  variant: number;
};
export type StoryCell = { type: "story"; band: Band; no: number };
export type LevelTestCell = {
  type: "level-test";
  area: Area;
  level: number;
  form: number;
  no: number;
};
export type PlacementCell = {
  type: "placement";
  area: PlacementArea;
  level: number;
  form: number;
  no: number;
  spare: boolean;
};
export type CellRef = LessonCell | StoryCell | LevelTestCell | PlacementCell;

const POSITIVE_INT = /^[1-9][0-9]*$/;
const NON_NEGATIVE_INT = /^(?:0|[1-9][0-9]*)$/;
/** 토리 이야기 칸의 비운 단원 자리와 변형(5절 lessons '단원은 비우며', 변형이 없어 1). */
const STORY_UNIT_MARK = "-";
const STORY_VARIANT = 1;

function positive(text: string | undefined): number | undefined {
  return text !== undefined && POSITIVE_INT.test(text)
    ? Number(text)
    : undefined;
}
function nonNegative(text: string | undefined): number | undefined {
  return text !== undefined && NON_NEGATIVE_INT.test(text)
    ? Number(text)
    : undefined;
}
function areaOf(text: string | undefined): Area | undefined {
  return AREAS.find((a) => a === text);
}
function levelOf(text: string | undefined): number | undefined {
  const n = positive(text);
  return n !== undefined && isLevel(n) ? n : undefined;
}

/** 칸 키를 만든다. `lesson:reading:4:2:assigned:3:1` 꼴(plan-p04a 칸 키 표). */
export function cellKey(cell: CellRef): string {
  switch (cell.type) {
    case "lesson":
      return [
        "lesson",
        cell.area,
        cell.level,
        cell.unit,
        cell.kind,
        cell.lessonNo,
        cell.variant,
      ].join(":");
    case "story":
      return [
        "lesson",
        "talk",
        bandInfo(cell.band).first,
        STORY_UNIT_MARK,
        TORI_STORY_KIND,
        cell.no,
        STORY_VARIANT,
      ].join(":");
    case "level-test":
      return ["level-test", cell.area, cell.level, cell.form, cell.no].join(
        ":",
      );
    case "placement":
      return [
        "placement",
        cell.area,
        cell.level,
        cell.form,
        cell.no,
        cell.spare ? "spare" : "main",
      ].join(":");
  }
}

/** 칸 키를 푼다. 꼴이나 값이 맞지 않으면 null. */
export function parseCellKey(key: string): CellRef | null {
  const parts = key.split(":");
  const [head] = parts;
  if (head === "lesson" && parts.length === 7) {
    const [, areaText, levelText, unitText, kindText, noText, variantText] =
      parts;
    const level = levelOf(levelText);
    const no = positive(noText);
    const variant = positive(variantText);
    if (level === undefined || no === undefined || variant === undefined) {
      return null;
    }
    if (kindText === TORI_STORY_KIND) {
      const band = BAND_INFOS.find((b) => b.first === level);
      if (
        areaText !== "talk" ||
        unitText !== STORY_UNIT_MARK ||
        variant !== STORY_VARIANT ||
        !band
      ) {
        return null;
      }
      return { type: "story", band: band.band, no };
    }
    const area = areaOf(areaText);
    const unit = nonNegative(unitText);
    const kind = LESSON_KINDS.find((k) => k === kindText);
    if (!area || unit === undefined || !kind || !isUnitOf(area, level, unit)) {
      return null;
    }
    return { type: "lesson", area, level, unit, kind, lessonNo: no, variant };
  }
  if (head === "level-test" && parts.length === 5) {
    const [, areaText, levelText, formText, noText] = parts;
    const area = areaOf(areaText);
    const level = levelOf(levelText);
    const form = positive(formText);
    const no = positive(noText);
    if (
      !area ||
      level === undefined ||
      form === undefined ||
      no === undefined
    ) {
      return null;
    }
    return { type: "level-test", area, level, form, no };
  }
  if (head === "placement" && parts.length === 6) {
    const [, areaText, levelText, formText, noText, spareText] = parts;
    const area = PLACEMENT_AREAS.find((a) => a === areaText);
    const level = levelOf(levelText);
    const form = positive(formText);
    const no = positive(noText);
    if (
      !area ||
      level === undefined ||
      form === undefined ||
      no === undefined ||
      (spareText !== "main" && spareText !== "spare")
    ) {
      return null;
    }
    return {
      type: "placement",
      area,
      level,
      form,
      no,
      spare: spareText === "spare",
    };
  }
  return null;
}

// ── 시드 파일 배치(plan-p04a '시드 파일 배치', 5절) ───────────────

/** 규격 파일(seed/ 뿌리 기준). */
export const SEED_FILES = {
  settings: "settings.json",
  levelSpecs: "level-specs.json",
  unitSpecs: "unit-specs.json",
  vocab: "vocab.json",
  images: "images.json",
  modelPrices: "model-prices.json",
  homophones: "lists/homophones.json",
  forbidden: "lists/forbidden.json",
  forms: "lists/forms.json",
  metaSentences: "lists/meta-sentences.json",
} as const;
export type SeedFileName = keyof typeof SEED_FILES;

/** 검증기가 걷지 않는 폴더(생성 브리프 · 시드 기록 · 신고). */
export const SEED_UNWALKED_DIRS = ["prompts", "manifest", "reports"] as const;

export function lessonFilePath(
  area: Area,
  level: number,
  unit: number,
): string {
  return `lessons/${area}/${level}/${unit}.json`;
}
export function levelTestFilePath(area: Area, level: number): string {
  return `level-tests/${area}/${level}.json`;
}
export function placementFilePath(area: PlacementArea): string {
  return `placement/${area}.json`;
}
export function storyFilePath(band: Band): string {
  return `stories/${band}.json`;
}
/** 풀이 검사 기록은 내용 파일 경로 앞에 `checks/` 를 붙인다. */
export function checksFilePath(contentPath: string): string {
  return `checks/${contentPath}`;
}
export function reviewFilePath(area: Area, level: number): string {
  return `reviews/${area}-${level}.json`;
}

export type SeedContentPath =
  | { kind: "lessons"; area: Area; level: number; unit: number }
  | { kind: "level-tests"; area: Area; level: number }
  | { kind: "placement"; area: PlacementArea }
  | { kind: "stories"; band: Band };
export type SeedPath =
  | { kind: "reference"; name: SeedFileName }
  | SeedContentPath
  | { kind: "checks"; target: SeedContentPath }
  | { kind: "reviews"; area: Area; level: number };

function parseContentPath(parts: readonly string[]): SeedContentPath | null {
  const [dir, a, b, c] = parts;
  if (dir === "lessons" && parts.length === 4) {
    const area = areaOf(a);
    const level = levelOf(b);
    const unitMatch = c?.endsWith(".json")
      ? c.slice(0, -".json".length)
      : undefined;
    const unit = nonNegative(unitMatch);
    if (!area || level === undefined || unit === undefined) return null;
    if (!isUnitOf(area, level, unit)) return null;
    return { kind: "lessons", area, level, unit };
  }
  if (dir === "level-tests" && parts.length === 3) {
    const area = areaOf(a);
    const level = levelOf(
      b?.endsWith(".json") ? b.slice(0, -".json".length) : undefined,
    );
    if (!area || level === undefined) return null;
    return { kind: "level-tests", area, level };
  }
  if (dir === "placement" && parts.length === 2) {
    const area = PLACEMENT_AREAS.find((x) => `${x}.json` === a);
    return area ? { kind: "placement", area } : null;
  }
  if (dir === "stories" && parts.length === 2) {
    const band = BAND_INFOS.find((x) => `${x.band}.json` === a);
    return band ? { kind: "stories", band: band.band } : null;
  }
  return null;
}

/** seed/ 뿌리 기준 경로(`/` 로 나눔)를 푼다. 배치에 없는 경로면 null. */
export function parseSeedPath(path: string): SeedPath | null {
  const name = (Object.keys(SEED_FILES) as SeedFileName[]).find(
    (k) => SEED_FILES[k] === path,
  );
  if (name) return { kind: "reference", name };
  const parts = path.split("/");
  if (parts[0] === "checks") {
    const target = parseContentPath(parts.slice(1));
    return target ? { kind: "checks", target } : null;
  }
  if (parts[0] === "reviews" && parts.length === 2) {
    const match = /^([a-z]+)-([1-9][0-9]*)\.json$/.exec(parts[1] ?? "");
    const area = areaOf(match?.[1]);
    const level = levelOf(match?.[2]);
    if (!area || level === undefined) return null;
    return { kind: "reviews", area, level };
  }
  return parseContentPath(parts);
}

/** 내용 파일 경로를 만든다(parseSeedPath 의 반대). */
export function contentFilePath(target: SeedContentPath): string {
  switch (target.kind) {
    case "lessons":
      return lessonFilePath(target.area, target.level, target.unit);
    case "level-tests":
      return levelTestFilePath(target.area, target.level);
    case "placement":
      return placementFilePath(target.area);
    case "stories":
      return storyFilePath(target.band);
  }
}

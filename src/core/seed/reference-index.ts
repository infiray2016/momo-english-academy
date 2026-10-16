// 규격 파일 묶음과 정합(plan-p04b '규격 파일 정합'). 규격 파일을 읽기 좋은 꼴로 묶어(index) 칸 검사(P4b · P4c)에 내주고,
// 규격 파일끼리 맞는지를 본다. 정합 위반은 모두 오류다(plan-p04a 정할 것 ㄹ). DB 없는 순수 함수다.
// Zod 규격에서 깨진 규격 파일은 넘기지 않는다(Partial). 빠진 파일을 쓰는 정합 검사는 건너뛰고, P4c 가 '규격 파일 오류로 건너뜀'을 보고한다.
import type {
  ForbiddenFile,
  FormEntry,
  HomophonesFile,
  ImageEntry,
  ImagesFile,
  LevelSpec,
  LevelSpecsFile,
  ListFormsFile,
  MetaSentencesFile,
  ModelPricesFile,
  SettingsFile,
  UnitSpec,
  UnitSpecsFile,
  VocabEntry,
  VocabFile,
} from "@/core/seed/schema/reference";
import {
  ALPHABET_UNIT,
  type Area,
  BAND_NAMES,
  bandKey,
  bandOf,
  cefrOf,
  isAlphabetUnit,
  isLevel,
  LEVEL_MAX,
  LEVEL_MIN,
  SEED_FILES,
  type SeedFileName,
  UNITS_PER_LEVEL,
} from "@/core/seed/structure";
import { buildLexicon, type Lexicon } from "@/core/seed/text";
import {
  type Allocation,
  allocateUnit,
  checkFrameRelations,
  resolveUnitFrame,
  type UnitFrame,
} from "@/core/vocab/allocate";

/** 검사 결과 하나(규격 파일 정합 · 칸 검사 공통). 경로는 그 파일 안의 점 경로다. */
export type SeedIssue = {
  rule: string;
  severity: "error" | "warning";
  /** 한국어 설명. */
  message: string;
  /** seed/ 뿌리 기준 파일 경로. */
  file: string;
  /** 칸 키(칸 검사일 때). */
  cell?: string;
  path: string;
};

/** 규격 파일 열(이름은 `SEED_FILES` 의 열쇠와 같다). */
export type ReferenceFiles = {
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
};

/** 검증기가 읽는 구간 키 8종(12절, plan-p04a '설정값 시드'). */
export const BAND_SETTING_PREFIXES = [
  "unit.vocab_count",
  "unit.new_words_per_lesson",
  "unit.regular_lessons",
  "unit.min_lessons",
  "unit.max_remedial",
  "seed.remedial_per_unit",
  "seed.remedial_coverage",
  "seed.topic_variants",
] as const;
/** 검증기가 읽는 하나짜리 키 13(12절). */
export const SINGLE_SETTING_KEYS = [
  "unit.vocab_mastery",
  "seed.max_offband_ratio",
  "seed.complete_through_level",
  "level.test_items",
  "level.test_items_per_session",
  "level.test_forms",
  "placement.items_per_level",
  "talk.more_talk_turns",
  "talk.said_ratio",
  "talk.known_days",
  "writing.rule_check_until_level",
  "writing.light_check_until_level",
  "writing.split_from_level",
] as const;
/** 검증기가 읽는 45 키. */
export const REQUIRED_SETTING_KEYS: readonly string[] = [
  ...BAND_SETTING_PREFIXES.flatMap((prefix) =>
    BAND_NAMES.map((band) => bandKey(prefix, band)),
  ),
  ...SINGLE_SETTING_KEYS,
];

export type WritingShape = "items" | "guided" | "composition";
/** 학습 요소 범위를 고르는 자리: 수업이면 단원 번호, 단계 평가 · 배치면 'test', 토리 이야기면 'story'(정할 것 ㅅ). */
export type FormScope = number | "test" | "story";

export type ReferenceIndex = {
  /**
   * 칸 검사를 돌릴 수 있는가: 설정값 정합(`settings`)이 통과하고 settings · level-specs · unit-specs · vocab 이 있다.
   * 거짓이면 칸 검사는 `reference-not-ready` 한 건만 내고 멈춘다(P4b 검토 M-1).
   */
  ready: boolean;
  /** 설정값 읽기. 키가 없거나 수가 아니면 예외(정합 `settings` 오류가 먼저 잡는다). */
  num(key: string): number;
  levelSpec(area: Area, level: number): LevelSpec | undefined;
  unitSpec(area: Area, level: number, unit: number): UnitSpec | undefined;
  /** 그 (영역, 단계)의 단원 규격(단원 번호 차례, 알파벳 단원 0 포함). */
  unitsOf(area: Area, level: number): UnitSpec[];
  lexicon: Lexicon;
  vocab: ReadonlyMap<string, VocabEntry>;
  images: ReadonlyMap<string, ImageEntry>;
  forms: readonly FormEntry[];
  forbidden: ForbiddenFile;
  homophones: HomophonesFile;
  metaSentences: MetaSentencesFile;
  /** 단원 틀(그 단계 규격 · 단원 규격 · 설정값이 있을 때). */
  frame(area: Area, level: number, unit: number): UnitFrame | undefined;
  /** 단원 배정표(단원 틀이 있을 때). */
  allocation(area: Area, level: number, unit: number): Allocation | undefined;
  /** 그 자리에서 쓸 수 있는 형태 id(3.6 · 정할 것 ㅅ). 쓰기는 writing 차례, 나머지는 rst 차례. 차례가 null 인 형태는 늘 범위 밖. */
  allowedForms(area: Area, level: number, scope: FormScope): Set<string>;
  /** 쓰기 단계의 모양(writing.rule_check_until_level · light_check_until_level · split_from_level). */
  writingShape(level: number): WritingShape;
};

const EMPTY_FORBIDDEN: ForbiddenFile = {
  words: { en: [], ko: [] },
  patterns: [],
};

function writingShapeOf(
  level: number,
  num: (key: string) => number,
): WritingShape {
  if (level <= num("writing.rule_check_until_level")) return "items";
  if (level <= num("writing.light_check_until_level")) return "guided";
  return "composition";
}

/** 규격 파일을 묶고 정합을 본다. 빠진 파일 이름은 `missing` 에 낸다. */
export function buildReferenceIndex(files: Partial<ReferenceFiles>): {
  index: ReferenceIndex;
  issues: SeedIssue[];
  missing: SeedFileName[];
} {
  const missing = (Object.keys(SEED_FILES) as SeedFileName[]).filter(
    (name) => files[name] === undefined,
  );
  const settingRows = files.settings?.settings ?? [];
  const levelSpecs = files.levelSpecs?.levelSpecs ?? [];
  const unitSpecs = files.unitSpecs?.unitSpecs ?? [];
  const vocabList = files.vocab?.vocab ?? [];
  const imageList = files.images?.images ?? [];
  const forms = files.forms?.forms ?? [];

  const settingMap = new Map(settingRows.map((row) => [row.key, row.value]));
  const num = (key: string): number => {
    const value = settingMap.get(key);
    if (typeof value !== "number") {
      throw new Error(`설정값 ${key} 가 없거나 수가 아니다`);
    }
    return value;
  };
  const vocab = new Map(vocabList.map((v) => [v.word, v]));
  const images = new Map(imageList.map((i) => [i.key, i]));
  const levelSpecMap = new Map(
    levelSpecs.map((s) => [`${s.area}:${s.level}`, s]),
  );
  const unitSpecMap = new Map(
    unitSpecs.map((u) => [`${u.area}:${u.level}:${u.unit}`, u]),
  );

  const issues: SeedIssue[] = [];
  const issue = (
    rule: string,
    file: string,
    path: string,
    message: string,
  ): void => {
    issues.push({ rule, severity: "error", message, file, path });
  };

  // ── settings ──
  let settingsOk = files.settings !== undefined;
  if (files.settings) {
    for (const key of REQUIRED_SETTING_KEYS) {
      const at = settingRows.findIndex((row) => row.key === key);
      if (at < 0) {
        issue(
          "settings",
          SEED_FILES.settings,
          "settings",
          `설정값 ${key} 가 없다`,
        );
        settingsOk = false;
      } else if (typeof settingRows[at]?.value !== "number") {
        issue(
          "settings",
          SEED_FILES.settings,
          `settings.${at}.value`,
          `설정값 ${key} 가 수가 아니다`,
        );
        settingsOk = false;
      }
    }
    if (settingsOk) {
      const rule = num("writing.rule_check_until_level");
      const light = num("writing.light_check_until_level");
      const split = num("writing.split_from_level");
      if (!(rule < light && light + 1 === split)) {
        issue(
          "settings",
          SEED_FILES.settings,
          "settings",
          `쓰기 모양 경계가 맞지 않는다: rule_check ${rule} < light_check ${light}, light_check + 1 = split ${split} 이어야 한다`,
        );
        settingsOk = false;
      }
      // 완전성 범위의 마지막 단계는 단계 1~12 정수다(P4c 검토 M-2, 12절 seed.complete_through_level).
      const through = num("seed.complete_through_level");
      if (!isLevel(through)) {
        issue(
          "settings",
          SEED_FILES.settings,
          "settings",
          `seed.complete_through_level ${through} 이 단계 ${LEVEL_MIN}~${LEVEL_MAX} 정수가 아니다`,
        );
        settingsOk = false;
      }
    }
  }

  const frameCache = new Map<string, UnitFrame | undefined>();
  const frame = (
    area: Area,
    level: number,
    unit: number,
  ): UnitFrame | undefined => {
    const key = `${area}:${level}:${unit}`;
    if (frameCache.has(key)) return frameCache.get(key);
    const spec = levelSpecMap.get(`${area}:${level}`);
    const unitSpec = unitSpecMap.get(key);
    const value =
      settingsOk && spec && unitSpec
        ? resolveUnitFrame({
            area,
            level,
            unit,
            levelSpec: spec,
            settings: num,
            unitWordCount: unitSpec.words.length,
          })
        : undefined;
    frameCache.set(key, value);
    return value;
  };
  const allocationCache = new Map<string, Allocation | undefined>();
  const allocation = (
    area: Area,
    level: number,
    unit: number,
  ): Allocation | undefined => {
    const key = `${area}:${level}:${unit}`;
    if (allocationCache.has(key)) return allocationCache.get(key);
    const unitFrame = frame(area, level, unit);
    const unitSpec = unitSpecMap.get(key);
    const value =
      unitFrame && unitSpec
        ? allocateUnit({
            words: unitSpec.words,
            k: unitFrame.k,
            regularLessons: unitFrame.regularLessons,
            minLessonsSetting: unitFrame.minLessonsSetting,
          })
        : undefined;
    allocationCache.set(key, value);
    return value;
  };

  // ── frame-*(3.2 관계 표) ──
  if (settingsOk && files.levelSpecs) {
    for (const v of checkFrameRelations({ settings: num, levelSpecs })) {
      const at =
        v.area === undefined
          ? -1
          : levelSpecs.findIndex(
              (s) => s.area === v.area && s.level === v.level,
            );
      if (at < 0) issue(v.rule, SEED_FILES.settings, "settings", v.message);
      else
        issue(
          v.rule,
          SEED_FILES.levelSpecs,
          `levelSpecs.${at}.frame`,
          v.message,
        );
    }
  }

  // ── reference-image(5절 vocab · images) ──
  if (files.vocab && files.images) {
    vocabList.forEach((entry, i) => {
      if (entry.imageKey === undefined) return;
      const image = images.get(entry.imageKey);
      if (!image) {
        issue(
          "reference-image",
          SEED_FILES.vocab,
          `vocab.${i}.imageKey`,
          `${entry.word} 의 그림 키 ${entry.imageKey} 가 그림 카탈로그에 없다`,
        );
      } else if (image.word !== entry.word) {
        issue(
          "reference-image",
          SEED_FILES.vocab,
          `vocab.${i}.imageKey`,
          `그림 ${entry.imageKey} 의 단어가 ${image.word} 라 ${entry.word} 와 다르다`,
        );
      }
    });
    const seenKeys = new Set<string>();
    imageList.forEach((image, i) => {
      if (seenKeys.has(image.key)) {
        issue(
          "reference-image",
          SEED_FILES.images,
          `images.${i}.key`,
          `그림 키 ${image.key} 가 겹친다`,
        );
      }
      seenKeys.add(image.key);
      if (!vocab.has(image.word)) {
        issue(
          "reference-image",
          SEED_FILES.images,
          `images.${i}.word`,
          `그림 ${image.key} 의 단어 ${image.word} 가 vocab 에 없다`,
        );
      }
    });
  }

  // ── reference-level-spec(3.1 · 3.2 · 3.3 · 5절) ──
  const seenLevelSpecs = new Set<string>();
  levelSpecs.forEach((spec, i) => {
    const at = `levelSpecs.${i}`;
    const key = `${spec.area}:${spec.level}`;
    if (seenLevelSpecs.has(key)) {
      issue(
        "reference-level-spec",
        SEED_FILES.levelSpecs,
        at,
        `${spec.area} ${spec.level}단계 규격이 겹친다`,
      );
    }
    seenLevelSpecs.add(key);
    if (spec.band !== bandOf(spec.level) || spec.cefr !== cefrOf(spec.level)) {
      issue(
        "reference-level-spec",
        SEED_FILES.levelSpecs,
        at,
        `${spec.area} ${spec.level}단계의 구간 · CEFR(${spec.band} · ${spec.cefr})이 ${bandOf(spec.level)} · ${cefrOf(spec.level)} 와 다르다`,
      );
    }
    if (spec.area !== "writing" || !settingsOk) return;
    const shape = writingShapeOf(spec.level, num);
    if (spec.amount.kind !== shape) {
      issue(
        "reference-level-spec",
        SEED_FILES.levelSpecs,
        `${at}.amount.kind`,
        `쓰기 ${spec.level}단계 분량 모양이 ${spec.amount.kind} 라 ${shape} 와 다르다`,
      );
    }
    const split = num("writing.split_from_level");
    if (spec.level >= split && !spec.frame) {
      issue(
        "reference-level-spec",
        SEED_FILES.levelSpecs,
        `${at}.frame`,
        `쓰기 ${spec.level}단계 규격에 단원 틀(frame)이 없다`,
      );
    }
    if (spec.level < split && spec.frame) {
      issue(
        "reference-level-spec",
        SEED_FILES.levelSpecs,
        `${at}.frame`,
        `쓰기 ${spec.level}단계는 단원 틀(frame)을 두지 않는다(writing.split_from_level ${split} 부터)`,
      );
    }
  });

  // ── reference-unit-spec · reference-unit-word-dup(3.2 · 3.4 · 5절) ──
  const seenUnits = new Set<string>();
  const unitOfWord = new Map<string, string>();
  unitSpecs.forEach((spec, i) => {
    const at = `unitSpecs.${i}`;
    const label = `${spec.area} ${spec.level}단계 단원 ${spec.unit}`;
    const key = `${spec.area}:${spec.level}:${spec.unit}`;
    if (seenUnits.has(key)) {
      issue(
        "reference-unit-spec",
        SEED_FILES.unitSpecs,
        at,
        `${label} 규격이 겹친다`,
      );
    }
    seenUnits.add(key);
    const alphabet = spec.unit === ALPHABET_UNIT.unit;
    if (alphabet && !isAlphabetUnit(spec.area, spec.level, spec.unit)) {
      issue(
        "reference-unit-spec",
        SEED_FILES.unitSpecs,
        `${at}.unit`,
        `단원 ${ALPHABET_UNIT.unit}(알파벳 · 소리 단원)은 ${ALPHABET_UNIT.areas.join(" · ")} ${ALPHABET_UNIT.level}단계에만 있다: ${label}`,
      );
    }
    if (!alphabet && settingsOk) {
      const expected = num(bandKey("unit.vocab_count", bandOf(spec.level)));
      if (spec.words.length !== expected) {
        issue(
          "reference-unit-spec",
          SEED_FILES.unitSpecs,
          `${at}.words`,
          `${label} 단원 단어가 ${spec.words.length}개라 unit.vocab_count ${expected} 와 다르다`,
        );
      }
    }
    spec.words.forEach((word, j) => {
      const entry = vocab.get(word);
      if (files.vocab && !entry) {
        issue(
          "reference-unit-spec",
          SEED_FILES.unitSpecs,
          `${at}.words.${j}`,
          `${label} 단원 단어 ${word} 가 vocab 에 없다`,
        );
      }
      if (entry) {
        const levelOk = alphabet
          ? entry.level <= ALPHABET_UNIT.level
          : entry.level === spec.level;
        if (!levelOk) {
          issue(
            "reference-unit-spec",
            SEED_FILES.unitSpecs,
            `${at}.words.${j}`,
            `${label} 단원 단어 ${word} 의 단계 어휘 범위가 ${entry.level} 이다(단원 단계 ${spec.level})`,
          );
        }
      }
      const dupKey = `${spec.area}:${word}`;
      const first = unitOfWord.get(dupKey);
      if (first !== undefined && first !== key) {
        issue(
          "reference-unit-word-dup",
          SEED_FILES.unitSpecs,
          `${at}.words.${j}`,
          `${spec.area} 영역에서 ${word} 가 두 단원(${first.split(":").slice(1).join("단계 단원 ")} · ${spec.level}단계 단원 ${spec.unit})의 단원 단어다`,
        );
      } else if (first === undefined) {
        unitOfWord.set(dupKey, key);
      }
    });
  });

  // ── reference-forms(3.6) ──
  forms.forEach((form, i) => {
    for (const order of ["rst", "writing"] as const) {
      const at = form.introducedAt[order];
      if (!at) continue;
      if (
        !isLevel(at.level) ||
        !Number.isInteger(at.unit) ||
        at.unit < 1 ||
        at.unit > UNITS_PER_LEVEL
      ) {
        issue(
          "reference-forms",
          SEED_FILES.forms,
          `forms.${i}.introducedAt.${order}`,
          `형태 ${form.id} 의 ${order} 차례 자리(${at.level}단계 단원 ${at.unit})가 단계 ${LEVEL_MIN}~${LEVEL_MAX} · 단원 1~${UNITS_PER_LEVEL} 밖이다`,
        );
      }
    }
  });

  // ── allocation(3.2) ──
  unitSpecs.forEach((spec, i) => {
    const result = allocation(spec.area, spec.level, spec.unit);
    if (result && !result.ok) {
      issue(
        "allocation",
        SEED_FILES.unitSpecs,
        `unitSpecs.${i}`,
        `${spec.area} ${spec.level}단계 단원 ${spec.unit} 의 어휘를 배정할 수 없다(${result.reason})`,
      );
    }
  });

  const index: ReferenceIndex = {
    ready:
      settingsOk &&
      files.levelSpecs !== undefined &&
      files.unitSpecs !== undefined &&
      files.vocab !== undefined,
    num,
    levelSpec: (area, level) => levelSpecMap.get(`${area}:${level}`),
    unitSpec: (area, level, unit) =>
      unitSpecMap.get(`${area}:${level}:${unit}`),
    unitsOf: (area, level) =>
      unitSpecs
        .filter((u) => u.area === area && u.level === level)
        .sort((a, b) => a.unit - b.unit),
    lexicon: buildLexicon(vocabList),
    vocab,
    images,
    forms,
    forbidden: files.forbidden ?? EMPTY_FORBIDDEN,
    homophones: files.homophones ?? { groups: [] },
    metaSentences: files.metaSentences ?? { phrases: [] },
    frame,
    allocation,
    allowedForms: (area, level, scope) => {
      const order = area === "writing" ? "writing" : "rst";
      return new Set(
        forms
          .filter((form) => {
            const at = form.introducedAt[order];
            if (!at) return false;
            if (scope === "test") return at.level <= level;
            if (scope === "story") return at.level < level;
            return (
              at.level < level || (at.level === level && at.unit === scope)
            );
          })
          .map((form) => form.id),
      );
    },
    writingShape: (level) => writingShapeOf(level, num),
  };
  return { index, issues, missing };
}

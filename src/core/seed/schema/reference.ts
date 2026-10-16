// 규격 파일의 Zod 규격(plan-p04a '규격 칸': 설정값 시드 · level_specs · unit_specs · vocab · images · model_prices · 목록 넷).
// 모든 객체는 모르는 키를 거부한다(z.strictObject). 변환 · 날짜 객체를 쓰지 않는다(JSON 그대로 읽는다, plan 위험 9).
// 영역 · 단계마다 맞는지(구간 · CEFR · 쓰기 모양 · 단원 단어 수 등)는 P4b 규격 파일 정합이 본다.
import { z } from "zod";
import {
  AREAS,
  BAND_NAMES,
  CEFRS,
  EFFORTS,
  LEVEL_MAX,
  LEVEL_MIN,
  READING_QUESTION_TYPES,
  TALK_HINT_TIERS,
  TALK_SEGMENTS,
  TEST_ITEM_TYPES,
  UNITS_PER_LEVEL,
  VOCAB_POS,
  WRITING_ITEM_TYPES,
} from "@/core/seed/structure";

// ── 공통 조각 ────────────────────────────────────────────────────

/** 0 이상 정수. */
export const Count = z.int().min(0);
/** 1 이상 정수. */
export const PositiveInt = z.int().min(1);
/** 단계 1~12(3.1). */
export const LevelSchema = z.int().min(LEVEL_MIN).max(LEVEL_MAX);
export const AreaSchema = z.enum(AREAS);
export const BandSchema = z.enum(BAND_NAMES);
export const EffortSchema = z.enum(EFFORTS);
/** 빈 글이 아닌 글. */
export const Text = z
  .string()
  .regex(/\S/, { message: "빈 글이거나 공백뿐이다" });
/** vocab 의 `word`(C54 (3) 시드 규격에서 word 가 id). 앞뒤 공백 없음. */
export const WordIdSchema = z
  .string()
  .min(1)
  .refine((s) => s.trim() === s, { message: "단어 id 앞뒤에 공백이 있다" });
/** 그림 카탈로그 키(5절 images). */
export const ImageKeySchema = z.string().regex(/^[a-z0-9-]+$/);
/** 날짜(ISO, YYYY-MM-DD). */
export const IsoDateSchema = z.iso.date();
/** 시각(ISO, 시간대 표시 필수). */
export const IsoDateTimeSchema = z.iso.datetime({ offset: true });
/** 소문자 16진 64자 해시(제안, sha256). */
export const Hex64Schema = z.string().regex(/^[0-9a-f]{64}$/);

/** `{ min, max }`(정수, min ≤ max). */
export const RangeSchema = z
  .strictObject({ min: Count, max: Count })
  .refine((r) => r.min <= r.max, {
    message: "범위의 min 이 max 보다 크다",
  });
export type Range = z.infer<typeof RangeSchema>;

/** 시드 판 '개정.정정'(5절). 정수 칸 둘, 0 이상. */
export const seedVersionShape = { revision: Count, correction: Count };

/** 목록 안에서 겹치는 값의 차례(두 번째부터). */
export function duplicateIndexes<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
): number[] {
  const seen = new Set<string>();
  const out: number[] = [];
  items.forEach((item, i) => {
    const key = keyOf(item);
    if (seen.has(key)) out.push(i);
    seen.add(key);
  });
  return out;
}

/** 글 목록 안에서 겹침이 없다(정확히 같은 글). */
export function uniqueStrings(schema: z.ZodType<string>) {
  return z.array(schema).refine((list) => new Set(list).size === list.length, {
    message: "목록에 같은 값이 둘 있다",
  });
}

/** 정규식이 `iu` 로 컴파일되는가(형태 표 · 금지어, plan 위험 4). */
export function regexCompiles(source: string): boolean {
  try {
    new RegExp(source, "iu");
    return true;
  } catch {
    return false;
  }
}
const RegexSchema = z.string().min(1).refine(regexCompiles, {
  message: "정규식이 iu 로 컴파일되지 않는다",
});

// ── 설정값 시드 settings.json(12절) ──────────────────────────────

export const SettingScopeSchema = z.enum(["household", "profile"]);
/** 12절 '바꾸는 곳'. 5절 적재 규칙이 쓴다. */
export const SettingChangeViaSchema = z.enum([
  "seed",
  "decision-first",
  "advanced",
  "basic",
]);
export const SettingValueSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.array(z.number()),
  z.array(z.string()),
  z.record(z.string(), z.number()),
]);
export const SettingRowSchema = z.strictObject({
  /** 12절 키. `<구간>` 은 펼쳐 쓴다(`unit.regular_lessons.1-3`). */
  key: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z0-9_-]+)+$/),
  scope: SettingScopeSchema,
  value: SettingValueSchema,
  changeVia: SettingChangeViaSchema,
});
export type SettingRow = z.infer<typeof SettingRowSchema>;
export const SettingsFileSchema = z
  .strictObject({ settings: z.array(SettingRowSchema) })
  .superRefine((file, ctx) => {
    for (const i of duplicateIndexes(file.settings, (r) => r.key)) {
      ctx.addIssue({
        code: "custom",
        path: ["settings", i, "key"],
        message: `설정값 키가 겹친다: ${file.settings[i]?.key}`,
      });
    }
  });
export type SettingsFile = z.infer<typeof SettingsFileSchema>;

// ── level-specs.json(5절 단계표 규격 JSON · 3.3 · 6.3 단계 경계) ──

const levelSpecCommon = {
  level: LevelSchema,
  /** 3.1 구간 · CEFR. 단계와 맞는지는 P4b 정합. */
  band: BandSchema,
  cefr: z.enum(CEFRS),
  /** 3.1 can-do 문장. */
  canDo: Text,
  /** 3.6 문장 길이 상한(단어). */
  sentenceMaxWords: PositiveInt,
  /** 3.3 목표 시간(분). 쓰기 6단계 이상은 초고 · 고쳐 쓰기. */
  targetMinutes: z.union([
    z.number().positive(),
    z.strictObject({
      draft: z.number().positive(),
      revise: z.number().positive(),
    }),
  ]),
  /** 6.3 · 13절 '영역 × 구간 유형별 문항 수'(H5 로 정하면 채움). */
  testMix: z.partialRecord(z.enum(TEST_ITEM_TYPES), Count).optional(),
  ...seedVersionShape,
};

/** 3.3 읽기 표. */
export const ReadingLevelSpecSchema = z.strictObject({
  area: z.literal("reading"),
  ...levelSpecCommon,
  passage: z
    .strictObject({
      words: RangeSchema.optional(),
      sentences: RangeSchema.optional(),
    })
    .refine((p) => p.words !== undefined || p.sentences !== undefined, {
      message: "지문 규격에 words · sentences 가운데 하나는 있어야 한다",
    }),
  textTypes: z.array(Text).min(1),
  questions: z
    .strictObject({
      total: PositiveInt,
      mix: z.partialRecord(z.enum(READING_QUESTION_TYPES), PositiveInt),
    })
    .refine(
      (q) =>
        Object.values(q.mix).reduce<number>((sum, n) => sum + (n ?? 0), 0) ===
        q.total,
      { message: "읽기 문항 유형 수 합이 문항 수와 다르다" },
    ),
});

const WritingItemTypeSchema = z.enum(WRITING_ITEM_TYPES);
/** 3.3 쓰기 표의 분량. 단계 ≤ writing.rule_check_until_level 은 items, ≤ light 는 guided, ≥ split 은 composition(P4b 정합). */
export const WritingAmountSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("items"),
    words: Count.optional(),
    phrases: Count.optional(),
    sentences: Count.optional(),
    sentenceWords: RangeSchema.optional(),
    itemTypes: z.array(WritingItemTypeSchema).min(1),
  }),
  z.strictObject({
    kind: z.literal("guided"),
    sentences: RangeSchema,
    input: z.enum(["word-box", "slot"]),
  }),
  z.strictObject({
    kind: z.literal("composition"),
    sentences: RangeSchema.optional(),
    words: RangeSchema.optional(),
  }),
]);
/** 3.2 쓰기 6단계 이상 단원 틀(k · 정규 수업 · 최소 수업 수). */
export const WritingFrameSchema = z.strictObject({
  k: PositiveInt,
  regularLessons: PositiveInt,
  minLessons: PositiveInt,
});
export type WritingFrame = z.infer<typeof WritingFrameSchema>;
export const WritingLevelSpecSchema = z.strictObject({
  area: z.literal("writing"),
  ...levelSpecCommon,
  amount: WritingAmountSchema,
  frame: WritingFrameSchema.optional(),
  /** 3.3 교정 상한(writing.max_corrections). */
  maxCorrections: Count.optional(),
});

/** 3.3 말하기 표 · 6.3(1~3단계 바른 답 · 1~2단계 허용 답 셋 이상 · 1~4단계 한국어 뜻). */
export const SpeakingLevelSpecSchema = z.strictObject({
  area: z.literal("speaking"),
  ...levelSpecCommon,
  repeat: z.strictObject({
    words: Count,
    sentences: Count,
    sentenceWords: RangeSchema.optional(),
  }),
  listening: z.strictObject({
    items: Count,
    options: z.enum(["picture", "text"]),
  }),
  questions: z.strictObject({
    count: Count,
    answerSentences: RangeSchema.optional(),
    modelAnswer: z.boolean(),
    acceptedMin: Count,
    koMeaning: z.boolean(),
  }),
  pictureTask: z
    .strictObject({
      images: RangeSchema,
      ordered: z.boolean(),
      sentences: RangeSchema,
    })
    .optional(),
  presentation: z
    .strictObject({
      seconds: PositiveInt,
      prepWords: Count,
      confirmQuestions: Count,
    })
    .optional(),
});

/** 3.3 회화 표 · 토막 표 · 말 표, 6.3 카드. */
export const TalkLevelSpecSchema = z.strictObject({
  area: z.literal("talk"),
  ...levelSpecCommon,
  segments: z.array(z.enum(TALK_SEGMENTS)).min(1),
  mode: Text,
  targetTurns: PositiveInt,
  /** 0 이면 미션 없음. */
  missions: Count,
  hintTiers: z.array(z.enum(TALK_HINT_TIERS)),
  /** 0 이면 쓸 수 있는 말 없음. */
  usablePhrases: Count,
  cardShape: z.enum(["turns", "questions"]),
  twoAnswers: z.boolean(),
  frameInTurns: z.boolean(),
  turnImages: z.boolean(),
  koMeaning: z.boolean(),
  moreTalk: z.boolean(),
});

export const LevelSpecSchema = z.discriminatedUnion("area", [
  ReadingLevelSpecSchema,
  WritingLevelSpecSchema,
  SpeakingLevelSpecSchema,
  TalkLevelSpecSchema,
]);
export type LevelSpec = z.infer<typeof LevelSpecSchema>;
export type ReadingLevelSpec = z.infer<typeof ReadingLevelSpecSchema>;
export type WritingLevelSpec = z.infer<typeof WritingLevelSpecSchema>;
export type SpeakingLevelSpec = z.infer<typeof SpeakingLevelSpecSchema>;
export type TalkLevelSpec = z.infer<typeof TalkLevelSpecSchema>;
export const LevelSpecsFileSchema = z.strictObject({
  levelSpecs: z.array(LevelSpecSchema),
});
export type LevelSpecsFile = z.infer<typeof LevelSpecsFileSchema>;

// ── unit-specs.json(5절 unit_specs) ──────────────────────────────

export const UnitSpecSchema = z.strictObject({
  area: AreaSchema,
  level: LevelSchema,
  /** 0 은 알파벳 · 소리 단원(읽기 · 쓰기 1단계만, P4b 정합). */
  unit: z.int().min(0).max(UNITS_PER_LEVEL),
  /** 3.6 학습 요소. */
  learningElement: Text,
  topic: Text,
  /** 3.2 목표 어휘. 차례가 배정 차례다. */
  words: uniqueStrings(WordIdSchema).min(1),
  ...seedVersionShape,
});
export type UnitSpec = z.infer<typeof UnitSpecSchema>;
export const UnitSpecsFileSchema = z.strictObject({
  unitSpecs: z.array(UnitSpecSchema),
});
export type UnitSpecsFile = z.infer<typeof UnitSpecsFileSchema>;

// ── vocab.json · images.json(5절) ────────────────────────────────

export const VocabEntrySchema = z.strictObject({
  /** 원형. 띄어 쓴 여러 낱말 표제어를 받는다. */
  word: WordIdSchema,
  meaningKo: Text,
  example: Text,
  /** 품사 목록(C54 (1) 기능어 function 포함). */
  pos: uniqueStrings(z.enum(VOCAB_POS)).min(1),
  /** 3.4 단계 어휘 범위(정해 둔 단계). */
  level: LevelSchema,
  /** 활용형(축약형도 둘 수 있음). */
  forms: z.array(Text),
  imageKey: ImageKeySchema.optional(),
});
export type VocabEntry = z.infer<typeof VocabEntrySchema>;
export const VocabFileSchema = z
  .strictObject({ vocab: z.array(VocabEntrySchema) })
  .superRefine((file, ctx) => {
    for (const i of duplicateIndexes(file.vocab, (v) => v.word.toLowerCase())) {
      ctx.addIssue({
        code: "custom",
        path: ["vocab", i, "word"],
        message: `vocab 낱말이 겹친다(대소문자 무시): ${file.vocab[i]?.word}`,
      });
    }
  });
export type VocabFile = z.infer<typeof VocabFileSchema>;

const IMAGE_FILE = /^images\/vocab\/([a-z0-9-]+)\.(?:png|webp|jpg)$/;
export const ImageEntrySchema = z
  .strictObject({
    key: ImageKeySchema,
    /** public/ 아래 경로. */
    file: z.string().regex(IMAGE_FILE),
    source: Text,
    /** DB 열거형과 같은 값(C60): cc0 · cc_by · generated. */
    license: z.enum(["cc0", "cc_by", "generated"]),
    attribution: Text.optional(),
    word: WordIdSchema,
  })
  .superRefine((image, ctx) => {
    if (IMAGE_FILE.exec(image.file)?.[1] !== image.key) {
      ctx.addIssue({
        code: "custom",
        path: ["file"],
        message: "그림 파일 이름이 키와 다르다",
      });
    }
    if (image.license === "cc_by" && image.attribution === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["attribution"],
        message: "cc_by 그림에 저작자 표시가 없다",
      });
    }
  });
export type ImageEntry = z.infer<typeof ImageEntrySchema>;
export const ImagesFileSchema = z.strictObject({
  images: z.array(ImageEntrySchema),
});
export type ImagesFile = z.infer<typeof ImagesFileSchema>;

// ── model-prices.json(5절 model_prices · 6.1 조합 표) ─────────────

const UsdPerMTok = z.number().min(0);
export const ModelPriceSchema = z.strictObject({
  model: Text,
  inputUsdPerMTok: UsdPerMTok,
  outputUsdPerMTok: UsdPerMTok,
  cacheWriteUsdPerMTok: UsdPerMTok,
  cacheReadUsdPerMTok: UsdPerMTok,
  effectiveFrom: IsoDateSchema,
  thinkingDefault: z.literal("adaptive"),
  thinkingOff: z.enum(["between_tools", "disabled"]).nullable(),
  thinkingOffEfforts: z.array(EffortSchema),
  effortDefault: EffortSchema,
  serverFallback: z.boolean(),
  /** 서버 측 대체 모델로만 답하는 모델. */
  fallbackOnly: z.boolean().optional(),
});
export type ModelPrice = z.infer<typeof ModelPriceSchema>;
export const ModelPricesFileSchema = z.strictObject({
  models: z.array(ModelPriceSchema),
});
export type ModelPricesFile = z.infer<typeof ModelPricesFileSchema>;

// ── 목록 넷 lists/(5절 '빌드에 묶어 배포') ───────────────────────

/** 6.2 · 3.4 동음이의어. 묶음마다 2개 이상. */
export const HomophonesFileSchema = z.strictObject({
  groups: z.array(z.array(Text).min(2)),
});
export type HomophonesFile = z.infer<typeof HomophonesFileSchema>;

const ForbiddenPatternSchema = z.strictObject({
  id: Text,
  category: z.enum(["violence", "personal-info", "contact"]),
  lang: z.enum(["en", "ko"]),
  regex: RegexSchema,
});
/** 6.4 금지 내용. 개인 정보 질문 패턴은 영어 · 한국어 두 벌. */
export const ForbiddenFileSchema = z
  .strictObject({
    words: z.strictObject({ en: z.array(Text), ko: z.array(Text) }),
    patterns: z.array(ForbiddenPatternSchema),
  })
  .superRefine((file, ctx) => {
    for (const i of duplicateIndexes(file.patterns, (p) => p.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["patterns", i, "id"],
        message: `금지 정규식 id 가 겹친다: ${file.patterns[i]?.id}`,
      });
    }
    for (const lang of ["en", "ko"] as const) {
      if (
        !file.patterns.some(
          (p) => p.category === "personal-info" && p.lang === lang,
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["patterns"],
          message: `개인 정보 질문 패턴(${lang})이 없다`,
        });
      }
    }
  });
export type ForbiddenFile = z.infer<typeof ForbiddenFileSchema>;

/** 형태가 처음 나오는 (단계, 단원). 범위(1~12 · 1~5)는 P4b 정합이 본다. */
const IntroducedAtSchema = z
  .strictObject({ level: z.int(), unit: z.int() })
  .nullable();
export const FormEntrySchema = z
  .strictObject({
    id: Text,
    labelKo: Text,
    /** 3.6 읽기 · 말하기 · 회화 차례(rst)와 쓰기 차례(writing). null 이면 그 차례에 없다. */
    introducedAt: z.strictObject({
      rst: IntroducedAtSchema,
      writing: IntroducedAtSchema,
    }),
    patterns: z.array(RegexSchema),
    words: z.array(Text),
  })
  .refine((f) => f.patterns.length > 0 || f.words.length > 0, {
    message: "형태에 정규식이나 낱말 목록이 하나는 있어야 한다",
  });
export type FormEntry = z.infer<typeof FormEntrySchema>;
/** 3.6 형태 표. */
export const ListFormsFileSchema = z
  .strictObject({ forms: z.array(FormEntrySchema) })
  .superRefine((file, ctx) => {
    for (const i of duplicateIndexes(file.forms, (f) => f.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["forms", i, "id"],
        message: `형태 id 가 겹친다: ${file.forms[i]?.id}`,
      });
    }
  });
export type ListFormsFile = z.infer<typeof ListFormsFileSchema>;

/** 6.4 메타 문장(검사는 P9 · 1-나). */
export const MetaSentencesFileSchema = z.strictObject({
  phrases: z.array(Text),
});
export type MetaSentencesFile = z.infer<typeof MetaSentencesFileSchema>;

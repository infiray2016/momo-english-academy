// 규격 파일의 Zod 규격(plan-p04a '규격 칸': 설정값 시드 · level_specs · unit_specs · vocab · images · model_prices · 목록 넷).
// 모든 객체는 모르는 키를 거부한다(z.strictObject). 변환 · 날짜 객체를 쓰지 않는다(JSON 그대로 읽는다, plan 위험 9).
// 영역 · 단계마다 맞는지(구간 · CEFR · 쓰기 모양 · 단원 단어 수 등)는 P4b 규격 파일 정합이 본다.
import { z } from "zod";
import {
  AREAS,
  BAND_NAMES,
  CEFRS,
  EFFORTS,
  GOAL_ACCEPTS,
  GOAL_NEEDS,
  LEVEL_MAX,
  LEVEL_MIN,
  READING_QUESTION_TYPES,
  TALK_CARD_SHAPES,
  TALK_CUE_BANDS,
  TALK_CUE_PLACES,
  TALK_HINT_TIERS,
  TALK_SHORT_BANDS,
  TALK_SHORT_PLACES,
  TALK_SITUATION_FORBIDDEN_SCOPES,
  TALK_SITUATION_PLACES,
  TALK_SPEC_SEGMENTS,
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
  /** TALK_SPEC_SEGMENTS(인사 · 준비 · 대화 · 정리) 그대로다(차례는 규격 정합 level-spec-talk-v1). */
  segments: z.array(z.enum(TALK_SPEC_SEGMENTS)).min(1),
  mode: Text,
  targetTurns: PositiveInt,
  /** 0 이면 미션 없음. */
  missions: Count,
  hintTiers: z.array(z.enum(TALK_HINT_TIERS)),
  /** 0 이면 쓸 수 있는 말 없음. */
  usablePhrases: Count,
  /** required 하나(C189). */
  cardShape: z.enum(TALK_CARD_SHAPES),
  /** 1단계 처음 묻는 턴의 선택지(옛 twoAnswers, C189). */
  choices: z.boolean(),
  frameInTurns: z.boolean(),
  turnImages: z.boolean(),
  koMeaning: z.boolean(),
  /**
   * 한국어 설명(뜻 힌트 한두 문장)을 보이는 같은 질문 자리의 막힘 차례(02-2 263줄 — 1~4단계 1 첫 막힘부터 · 5단계부터 2 둘째 막힘부터,
   * C195). 힌트 고르기(hints.ts)와 회화 턴 고정부가 같은 칸을 읽는다. 앱 동작만 바꾸는 칸이라 시드를 다시 만드는 키가 아니다.
   */
  koExplainFromStuck: PositiveInt,
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

/**
 * 단원 목표 하나(평가 spec 2절 목표 칸): id(`<영역>-<단계>-<단원>-<n>`, 꼴 · 유일은 규격 파일 정합) · ko(목표 글) · core(주된 핵심 능력) ·
 * tasks(근거가 되는 과제 유형) · home(배우는 상황) · needs(근거 꼴) · accept(받는 정확도), 선택 demands · words · independent.
 * core · home · demands 가 목표 용어 목록 안인지는 그 목록(seed/lists/goal-terms.json)이 생기면 본다.
 */
export const UnitGoalSchema = z.strictObject({
  id: Text,
  ko: Text,
  core: Text,
  tasks: uniqueStrings(Text).min(1),
  home: z.array(Text).min(1),
  needs: uniqueStrings(z.enum(GOAL_NEEDS)).min(1),
  accept: z.enum(GOAL_ACCEPTS),
  demands: z.array(Text).min(1).optional(),
  words: uniqueStrings(WordIdSchema).optional(),
  independent: Text.optional(),
});
export type UnitGoal = z.infer<typeof UnitGoalSchema>;
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
  /**
   * 단원 목표(평가 spec 2절 · 가르치고 배우는 수업 설계 6 teach.goals 의 바탕). 칸 꼴은 UnitGoalSchema, id 꼴 · 유일 · 목표 수 ·
   * tasks · needs 는 규격 파일 정합(reference-index unit-goals), 수업 teach.goals · 혼자 문항 goal 대조는 칸 검사(check-teach goal, 오류)가 본다.
   * seed.goals_required_levels 단계에 목표가 없으면 검증 보고에 경고, 명령 인자 --require-unit-goals 일 때만 오류다(C186).
   */
  goals: z.array(UnitGoalSchema).optional(),
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

/** 그림 파일 꼴(svg 는 P6b · C65 — Twemoji 와 자체 그림을 SVG 로 둔다). */
const IMAGE_FILE = /^images\/vocab\/([a-z0-9-]+)\.(?:png|webp|jpg|svg)$/;
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
  /** 'none' = thinking 을 빼면 생각 없이 돈다(Opus 4.8 등, plan-p06a 정할 것 아). 요청은 늘 thinking 을 적어 보내므로 기록 · 대조용이다. */
  thinkingDefault: z.enum(["adaptive", "none"]),
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

/**
 * 회화 앱 맞장구 목록 lists/talk-wait-lines.json(회화 plan 정한 것 20, 정본 03 4절 '선생님 차례'). 영어 한 줄씩이고 턴 번호로 돌려 고른다
 * (core/conversation/wait-line). 검사(금지어 · 선생님 이름 · 물음표 · 1단계 문장 길이 상한 · 겹침)는 check-wait-lines.ts 가 한다.
 */
export const TalkWaitLinesFileSchema = z.strictObject({
  lines: z.array(Text).min(1),
});
export type TalkWaitLinesFile = z.infer<typeof TalkWaitLinesFileSchema>;

// ── 회화 1~3단계 시드 목록 넷('AI 몫 넓힘' plan 정한 것 5 · spec 판 4 설계 6 · 9, 정본 06:187) ──
// 여기는 꼴만 본다(빈 목록 · 모르는 키 · 겹침 거부). 꼴 수(셋 이상 · 하나 이상 · 둘 이상) · 어휘 · 길이 · 물음표 · 금지 구 · 지어낸 경험 꼴 검사는
// 시드 검증기(check-talk-lists, 묶음 3)가 한다. 모두 빌드에 묶고(next.config.ts outputFileTracingIncludes) DB 에 넣지 않는다.

/** 목록 한 줄: 영어와 한국어 뜻(1~3단계 화면은 뜻을 보인다 — 뜻은 반말). */
const TalkListLineSchema = z.strictObject({ en: Text, ko: Text });
export type TalkListLine = z.infer<typeof TalkListLineSchema>;
/** 소문자 한 낱말(감탄 · 수업 말 · 느낌 낱말). 상황 차례 어휘 검사가 낱말로 견준다. */
const ListWordSchema = z
  .string()
  .regex(/^[a-z][a-z'-]*$/, { message: "소문자 한 낱말이 아니다" });
/** 정규화한 구(normalizeSpoken 꼴: 소문자 · 숫자 낱말을 빈칸 하나로 이음). 낱말 경계로 견준다. */
const NormalizedPhraseSchema = z
  .string()
  .regex(/^[a-z0-9]+( [a-z0-9]+)*$/, { message: "정규화한 구가 아니다" });

/** 한 자리 · 한 구간의 신호 말: 첫 신호 말은 긴 꼴, 그 뒤는 짧은 꼴을 돌려 쓴다(02-2:212). */
const TalkCueFormsSchema = z.strictObject({
  long: z.array(TalkListLineSchema).min(1),
  short: z.array(TalkListLineSchema).min(1),
});
/**
 * 신호 말 목록 lists/talk-cue-lines.json(C207). 자리(introduce · together · choices) × 단계 구간("1" · "2-3")마다 긴 꼴 · 짧은 꼴.
 * 자리 · 구간은 모두 있어야 하고 모르는 열쇠는 거부한다(z.record + z.enum 은 열쇠를 다 요구한다).
 */
export const TalkCueLinesFileSchema = z.record(
  z.enum(TALK_CUE_PLACES),
  z.record(z.enum(TALK_CUE_BANDS), TalkCueFormsSchema),
);
export type TalkCueLinesFile = z.infer<typeof TalkCueLinesFileSchema>;

/**
 * 짧은 말 목록 lists/talk-short-lines.json(C213 · iPad 버리는 듣기 plan 정한 것 6). 자리(again · mic) × 단계 구간("1-3" · "4-6" · "7-9" ·
 * "10-12")마다 줄 하나 이상(화면이 고른다). 자리 · 구간은 모두 있어야 하고 모르는 열쇠는 거부한다. 물음표 · 길이 · 어휘 범위는 check-talk-lists 가 본다.
 */
export const TalkShortLinesFileSchema = z.record(
  z.enum(TALK_SHORT_PLACES),
  z.record(z.enum(TALK_SHORT_BANDS), z.array(TalkListLineSchema).min(1)),
);
export type TalkShortLinesFile = z.infer<typeof TalkShortLinesFileSchema>;

/**
 * 상황 줄 · 상황 금지 구 목록 lists/talk-situation-lines.json(C209 · C211, 02-2:208). lines 는 자리(인사 끝 · 받침 첫째 · 둘째 · 셋째 ·
 * 들리지 않음)마다 줄 여럿(턴 번호로 돌림), forbidden 은 모든 상황 차례(all)와 들리지 않음에 더하는 구(nospeech)다.
 */
export const TalkSituationLinesFileSchema = z.strictObject({
  lines: z.record(
    z.enum(TALK_SITUATION_PLACES),
    z.array(TalkListLineSchema).min(1),
  ),
  forbidden: z.record(
    z.enum(TALK_SITUATION_FORBIDDEN_SCOPES),
    uniqueStrings(Text).min(1),
  ),
});
export type TalkSituationLinesFile = z.infer<
  typeof TalkSituationLinesFileSchema
>;

/** 허용 낱말 목록 lists/talk-allowed-words.json(C209 · C211 (1)): 감탄 · 수업 말(allowed, 상황 차례 어휘 범위에 더함) · 느낌 낱말(feeling, 'Child said more'). */
export const TalkAllowedWordsFileSchema = z.strictObject({
  allowed: uniqueStrings(ListWordSchema).min(1),
  feeling: uniqueStrings(ListWordSchema).min(1),
});
export type TalkAllowedWordsFile = z.infer<typeof TalkAllowedWordsFileSchema>;

/** 지어낸 경험 꼴 목록 lists/talk-made-up-phrases.json(C211 (1)): 1인칭 과거 경험 · 기억 꼴의 정규화한 구('yesterday i' 꼴). */
export const TalkMadeUpPhrasesFileSchema = z.strictObject({
  phrases: uniqueStrings(NormalizedPhraseSchema).min(1),
});
export type TalkMadeUpPhrasesFile = z.infer<typeof TalkMadeUpPhrasesFileSchema>;

/**
 * 문법 용어 목록 lists/grammar-terms.json(델타 spec 2026-10-29 설계 7). 항목은 낱말과 열리는 단계(fromLevel, 비면 모든 단계 금지).
 * 선생님 말 칸 · 칩 글에 이 낱말이 있으면 막는다. 메타 문장 목록과는 별개다.
 */
export const GrammarTermsFileSchema = z
  .strictObject({
    terms: z.array(
      z.strictObject({
        term: Text,
        fromLevel: LevelSchema.optional(),
        /** 용어로 시작하는 보통 낱말(주어진 · 주어요 …). 글이 이 낱말로 시작하면 걸지 않는다. */
        exceptions: z.array(Text).optional(),
      }),
    ),
  })
  .superRefine((file, ctx) => {
    for (const i of duplicateIndexes(file.terms, (t) => t.term)) {
      ctx.addIssue({
        code: "custom",
        path: ["terms", i, "term"],
        message: `문법 용어가 겹친다: ${file.terms[i]?.term}`,
      });
    }
  });
export type GrammarTermsFile = z.infer<typeof GrammarTermsFileSchema>;

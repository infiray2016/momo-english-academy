// 수업 · 수업 파일의 Zod 규격(plan-p04a '수업 파일', 6.3 출력 규격 · 3.3 · 5절 lessons).
// 수업 파일 seed/lessons/<영역>/<단계>/<단원>.json = { area, level, unit, lessons }. 영역으로 수업 꼴이 갈린다.
// 정본에 없는 활동(예: 말하기 5~8단계의 대화 주고받기)은 모르는 키로 거부된다. 단계에 맞는 수 · 칸은 P4b · P4c 가 본다.
import { z } from "zod";
import {
  AreaSchema,
  Count,
  EffortSchema,
  Hex64Schema,
  ImageKeySchema,
  IsoDateSchema,
  LevelSchema,
  PositiveInt,
  seedVersionShape,
  Text,
  uniqueStrings,
  WordIdSchema,
} from "@/core/seed/schema/reference";
import { TalkCardSchema, textsOfTalkCard } from "@/core/seed/schema/talk";
import {
  type Area,
  ASK_ROLES,
  fragmentSink,
  joinPath,
  LESSON_KINDS,
  READING_OPTIONS,
  READING_QUESTION_TYPES,
  READING_TEXT_QUESTION_TYPES,
  TEACH_CHIP_ROLES,
  type TextFragment,
  UNITS_PER_LEVEL,
} from "@/core/seed/structure";

// ── 수업 겉(모든 영역 공통) ──────────────────────────────────────

/** 생성 기록(5절 lessons · 6.3 프롬프트 판). 해시는 소문자 16진 64자(제안). */
export const GenerationSchema = z.discriminatedUnion("method", [
  z.strictObject({
    method: z.literal("generated"),
    model: Text,
    effort: EffortSchema,
    briefHash: Hex64Schema,
    agentHash: Hex64Schema,
    createdOn: IsoDateSchema,
    retries: Count.optional(),
  }),
  z.strictObject({
    method: z.literal("human"),
    createdOn: IsoDateSchema,
    note: Text.optional(),
  }),
]);
export type Generation = z.infer<typeof GenerationSchema>;

export const lessonBaseShape = {
  kind: z.enum(LESSON_KINDS),
  lessonNo: PositiveInt,
  /** 주제 변형(1 이상 정수, C54 (3)). */
  variant: PositiveInt,
  ...seedVersionShape,
  generation: GenerationSchema,
  /** 한국어 목록 제목(6.3 '10자 안팎', 길이는 보지 않는다). */
  title: Text,
  /** 새 단어 목록(다지기 · 보강은 빈 목록, 배정표 대조는 P4b). */
  newWords: uniqueStrings(WordIdSchema),
  /** 수업에 나오는 단원 단어 목록. */
  unitWords: uniqueStrings(WordIdSchema),
};

/**
 * 새 단어 미리보기(3.3 첫 활동). 가르치는 수업(teach 가 있는 수업)은 예문을 비울 수 있고(C170 (3)) 낱말 쪼개기 parts 를 둘 수 있다
 * (델타 spec 2026-10-29 설계 6). 예문이 빈 글인지는 칸 검사가 teach 가 없는 수업에서만 막는다.
 */
export const PreviewSchema = z.array(
  z.strictObject({
    word: WordIdSchema,
    meaningKo: Text,
    /** 빈 글("")이면 예문 없음(teach 가 있는 수업만, C170 (3)). 공백뿐인 글은 받지 않는다. */
    example: z.union([z.literal(""), Text]),
    parts: z.array(Text).min(2).optional(),
  }),
);

// ── 가르치는 수업 칸(델타 spec 2026-10-29 가르치고 배우는 수업 설계 6, 표본 2판 부록 B) ──
// 모두 선택 칸이다. teach 가 있는 수업은 칸 검사(check-teach.ts)가 자리 꼴 · 줄 길이 · 시간 합 · 문법 용어 · 짝 · '왜' · 목표 · 선생님 이름을 본다.

/** 닿는 목표 ID 하나 또는 목록(설계 6 '부록 B 와 다르게 한 곳' goal). ID 꼴은 칸 검사가 본다. */
export const GoalRefSchema = z.union([Text, z.array(Text).min(1)]);
export type GoalRef = z.infer<typeof GoalRefSchema>;
/** 이름표(읽기 사실 확인 · 듣기 이해 빈칸 문항, 설계 6 label — 시드 칸 이름은 askRole). */
export const AskRoleSchema = z.enum(ASK_ROLES);
/** 혼자 문항에 붙는 칸(설계 6 문항 칸). */
const soloExtra = {
  goal: GoalRefSchema.optional(),
  whyKo: Text.optional(),
};

// ── 읽기(6.3 읽기, 3.3) ──────────────────────────────────────────

const readingQuestionCommon = {
  prompt: Text,
  /** 정답 번호(1부터). 보기 범위 안인지는 P4b. */
  answerNo: PositiveInt,
};
/** 그림 문제 · 글 문제 꼴 둘에 같은 칸을 더해 만든다(혼자 문항 · 짝). */
function readingQuestionVariants<S extends z.core.$ZodLooseShape>(extra: S) {
  return [
    z.strictObject({
      kind: z.literal("picture"),
      type: z.literal("picture"),
      options: z.array(WordIdSchema).length(READING_OPTIONS),
      ...readingQuestionCommon,
      ...extra,
    }),
    z.strictObject({
      kind: z.literal("text"),
      type: z.enum(READING_TEXT_QUESTION_TYPES),
      options: z.array(Text).length(READING_OPTIONS),
      ...readingQuestionCommon,
      ...extra,
    }),
  ] as const;
}
/** 읽기 짝: 같은 꼴 문항 + 제 짧은 글 textEn · 이름표 · '왜'. */
export const ReadingSpareSchema = z.discriminatedUnion(
  "kind",
  readingQuestionVariants({
    textEn: Text,
    askRole: AskRoleSchema.optional(),
    whyKo: Text.optional(),
  }),
);
/**
 * 그림 문제의 보기는 그림 카탈로그 키가 있는 단어 id 로만 낸다(6.3). 해설 explanationKo 는 whyKo 가 있으면 없어도 된다
 * (델타 spec 설계 6 — 둘 다 없으면 칸 검사가 막는다).
 */
export const ReadingQuestionSchema = z.discriminatedUnion(
  "kind",
  readingQuestionVariants({
    explanationKo: Text.optional(),
    askRole: AskRoleSchema.optional(),
    retryHighlight: Text.optional(),
    spare: ReadingSpareSchema.optional(),
    ...soloExtra,
  }),
);
export type ReadingQuestion = z.infer<typeof ReadingQuestionSchema>;

/** 칩 하나. 말하기 본보기의 from 은 질문 칩(그 칩이 온 자리). */
export const TeachChipSchema = z.strictObject({
  text: Text,
  role: z.enum(TEACH_CHIP_ROLES),
  from: Text.optional(),
});
/** 본보기 하나(보여 주기). 쓰기는 fromEn, 말하기는 storyEn · questionEn · wordAnswerEn. */
export const TeachModelSchema = z.strictObject({
  en: Text,
  ko: Text,
  chips: z.array(TeachChipSchema),
  lineKo: Text,
  picture: ImageKeySchema.optional(),
  fromEn: Text.optional(),
  storyEn: Text.optional(),
  questionEn: Text.optional(),
  wordAnswerEn: Text.optional(),
});
/** 되짚기: 문장 틀 · 칩 · 마무리 줄 둘(closeKo '할 수 있어요' · closeKoPracticed 배우고 연습한 것, C174 (5)). */
export const TeachRecapSchema = z.strictObject({
  frameEn: Text,
  chips: z.array(TeachChipSchema),
  closeKo: Text,
  closeKoPracticed: Text,
});
/** 같이 해 보기 문항의 선생님 칸(영역 공통). */
const togetherCommon = {
  /** 띠 칠 낱말. */
  highlight: z.array(Text).optional(),
  lineKo: Text.optional(),
  rightKo: Text,
  wrongKo: Text,
};
function teachSchema<T extends z.ZodType>(together: T) {
  return z.strictObject({
    /** 이 수업이 닿는 단원 목표 ID(하나 이상, 겹치지 않게). */
    goals: z
      .array(Text)
      .min(1)
      .refine((list) => new Set(list).size === list.length, {
        message: "목록에 같은 값이 둘 있다",
      }),
    shiftKo: z.strictObject({ before: Text, after: Text }),
    todayKo: Text,
    todayEn: Text.optional(),
    models: z.array(TeachModelSchema),
    together: z.array(together),
    recap: TeachRecapSchema,
  });
}
export type TeachModel = z.infer<typeof TeachModelSchema>;
export type TeachChip = z.infer<typeof TeachChipSchema>;
export const ReadingTogetherSchema = z.strictObject({
  kind: z.enum(["text", "picture"]),
  type: z.enum(READING_QUESTION_TYPES),
  textEn: Text,
  prompt: Text,
  askRole: AskRoleSchema.optional(),
  choices: z.array(Text).min(2),
  answerNo: PositiveInt,
  ...togetherCommon,
});
export const ReadingTeachSchema = teachSchema(ReadingTogetherSchema);
export type ReadingTeach = z.infer<typeof ReadingTeachSchema>;

export const ReadingLessonSchema = z.strictObject({
  ...lessonBaseShape,
  preview: PreviewSchema,
  teach: ReadingTeachSchema.optional(),
  content: z.strictObject({
    passage: Text,
    targetWords: uniqueStrings(WordIdSchema),
    /** 지문에 나온 기능어 밖 모든 단어의 표기형 · 원형 · 한국어 뜻. `proper` 는 고유 명사(제안). */
    glossary: z.array(
      z.strictObject({
        surface: Text,
        lemma: Text,
        meaningKo: Text,
        proper: z.boolean().optional(),
      }),
    ),
    questions: z.array(ReadingQuestionSchema).min(1),
  }),
});
export type ReadingLesson = z.infer<typeof ReadingLessonSchema>;

// ── 쓰기(6.3 쓰기, 3.3 쓰기 표) ──────────────────────────────────

const accepted = z.array(Text).min(1);
/** 쓰기 1~3단계 문항 갈래의 칸(수업 · 단계 평가 · 배치 평가가 같이 쓴다). */
export const writingItemShapes = {
  "pick-word": {
    type: z.literal("pick-word"),
    picture: WordIdSchema,
    options: z.array(Text).min(1),
    answerNo: PositiveInt,
    accepted,
  },
  "copy-tiles": {
    type: z.literal("copy-tiles"),
    word: Text,
    tiles: z.array(Text).min(1),
    accepted,
  },
  "build-tiles": {
    type: z.literal("build-tiles"),
    word: Text,
    tiles: z.array(Text).min(1),
    meaningKo: Text,
    accepted,
  },
  "fill-letters": {
    type: z.literal("fill-letters"),
    word: Text,
    /** 밑줄로 빈 글자를 표시한 꼴(b_ll). */
    pattern: Text.regex(/_/),
    tiles: z.array(Text).min(1),
    accepted,
  },
  dictation: {
    type: z.literal("dictation"),
    word: Text,
    /** 읽어 줄 글. */
    audioText: Text,
    accepted,
  },
  "assemble-phrase": {
    type: z.literal("assemble-phrase"),
    cards: z.array(Text).min(2),
    meaningKo: Text.optional(),
    accepted,
  },
  "assemble-sentence": {
    type: z.literal("assemble-sentence"),
    cards: z.array(Text).min(2),
    meaningKo: Text.optional(),
    accepted,
  },
} as const;

/** 쓰기 문항 갈래 일곱에 같은 칸(평가 · 배치의 번호 · 판 등)을 더해 만든다. */
export function writingItemVariants<S extends z.core.$ZodLooseShape>(extra: S) {
  return [
    z.strictObject({ ...writingItemShapes["pick-word"], ...extra }),
    z.strictObject({ ...writingItemShapes["copy-tiles"], ...extra }),
    z.strictObject({ ...writingItemShapes["build-tiles"], ...extra }),
    z.strictObject({ ...writingItemShapes["fill-letters"], ...extra }),
    z.strictObject({ ...writingItemShapes.dictation, ...extra }),
    z.strictObject({ ...writingItemShapes["assemble-phrase"], ...extra }),
    z.strictObject({ ...writingItemShapes["assemble-sentence"], ...extra }),
  ] as const;
}

/** 쓰기 짝: 같은 꼴 문항 + '왜'. */
export const WritingSpareSchema = z.discriminatedUnion(
  "type",
  writingItemVariants({ whyKo: Text.optional() }),
);
export const WritingItemSchema = z.discriminatedUnion(
  "type",
  writingItemVariants({ ...soloExtra, spare: WritingSpareSchema.optional() }),
);
export type WritingItem = z.infer<typeof WritingItemSchema>;

export const WritingContentSchema = z.discriminatedUnion("shape", [
  z.strictObject({
    shape: z.literal("items"),
    items: z.array(WritingItemSchema).min(1),
  }),
  z.strictObject({
    shape: z.literal("guided"),
    task: Text,
    example: Text,
    hints: z.array(Text),
    rubric: z.array(Text),
    sentences: z
      .array(
        z.strictObject({
          frame: Text,
          wordBox: z.array(Text).optional(),
          model: Text,
        }),
      )
      .min(1),
  }),
  z.strictObject({
    shape: z.literal("composition"),
    task: Text,
    example: Text,
    hints: z.array(Text).min(1),
    rubric: z.array(Text),
  }),
]);
export type WritingContent = z.infer<typeof WritingContentSchema>;

/** 쓰기 같이 해 보기: 쓰기 문항 꼴 + 앱이 채운 것(filled) · 아이 자리(slot: 칸 번호 목록이나 'capital' 같은 자리 이름) · 남은 카드. */
export const WritingTogetherSchema = z.discriminatedUnion(
  "type",
  writingItemVariants({
    filled: z
      .strictObject({
        cards: z.array(Text.nullable()),
        capital: z.boolean(),
      })
      .optional(),
    slot: z.union([z.array(PositiveInt).min(1), Text]),
    choices: z.array(Text).optional(),
    ...togetherCommon,
  }),
);
export const WritingTeachSchema = teachSchema(WritingTogetherSchema);
export type WritingTeach = z.infer<typeof WritingTeachSchema>;

export const WritingLessonSchema = z.strictObject({
  ...lessonBaseShape,
  preview: PreviewSchema,
  teach: WritingTeachSchema.optional(),
  content: WritingContentSchema,
});
export type WritingLesson = z.infer<typeof WritingLessonSchema>;

// ── 말하기(6.3 말하기, 3.3 말하기 표, C27 · C47) ───────────────────

const listeningPicture = {
  kind: z.literal("picture"),
  /** 읽어 줄 글. */
  script: Text,
  options: z.array(WordIdSchema).min(1),
  answerNo: PositiveInt,
};
const listeningText = {
  kind: z.literal("text"),
  script: Text,
  prompt: Text.optional(),
  options: z.array(Text).min(1),
  answerNo: PositiveInt,
};
/** 듣기 이해 문항 갈래 둘에 같은 칸을 더해 만든다(단계 평가 · 배치 평가가 같이 쓴다). */
export function listeningVariants<S extends z.core.$ZodLooseShape>(extra: S) {
  return [
    z.strictObject({ ...listeningPicture, ...extra }),
    z.strictObject({ ...listeningText, ...extra }),
  ] as const;
}
export const ListeningSchema = z.discriminatedUnion(
  "kind",
  listeningVariants({}),
);
export type Listening = z.infer<typeof ListeningSchema>;
/** 말하기 수업 듣기 짝: 같은 꼴 + 이름표 · '왜'. */
export const ListeningSpareSchema = z.discriminatedUnion(
  "kind",
  listeningVariants({
    askRole: AskRoleSchema.optional(),
    whyKo: Text.optional(),
  }),
);
/** 말하기 수업의 듣기 문항(듣기 꼴 + 설계 6 문항 칸). 단계 평가 · 배치는 ListeningSchema 그대로다. */
export const LessonListeningSchema = z.discriminatedUnion(
  "kind",
  listeningVariants({
    askRole: AskRoleSchema.optional(),
    retryHighlight: Text.optional(),
    spare: ListeningSpareSchema.optional(),
    ...soloExtra,
  }),
);
export type LessonListening = z.infer<typeof LessonListeningSchema>;
/** 말하기 질문 짝: 앞 화면 이야기 storyEn · 질문 · 앱 판정 허용 답(셋 이상은 칸 검사) · '왜'. */
export const SpeakingQuestionSpareSchema = z.strictObject({
  storyEn: Text,
  en: Text,
  ko: Text.optional(),
  modelAnswer: Text.optional(),
  accepted: z.array(Text).min(1),
  acceptedMeaning: z.array(Text).optional(),
  whyKo: Text.optional(),
});

/** 말하기 같이 해 보기: 질문 꼴 + 틀(filled, 빈칸 ___) · 아이 자리(slot) · 고를 것 · 앱 판정 허용 답. */
export const SpeakingTogetherSchema = z.strictObject({
  type: z.literal("question"),
  storyEn: Text.optional(),
  en: Text,
  ko: Text.optional(),
  filled: Text,
  slot: Text,
  choices: z.array(Text).min(2).optional(),
  answerNo: PositiveInt.optional(),
  modelAnswer: Text.optional(),
  accepted: z.array(Text).min(1),
  /** 뜻으로 받되 완전 수행 근거는 아닌 꼴(혼자 질문의 acceptedMeaning 과 같은 뜻). */
  acceptedMeaning: z.array(Text).optional(),
  ...togetherCommon,
});

export const SpeakingTeachSchema = teachSchema(SpeakingTogetherSchema);
export type SpeakingTeach = z.infer<typeof SpeakingTeachSchema>;

export const SpeakingLessonSchema = z.strictObject({
  ...lessonBaseShape,
  preview: PreviewSchema,
  teach: SpeakingTeachSchema.optional(),
  content: z.strictObject({
    /**
     * 따라 말할 단어 · 문장(9단계부터 빈 목록). 글 배열이라 설계 6 문항 칸은 같은 차례 배열이다:
     * goal(묶음 하나) · chunks(문장마다 '/' 로 끊은 꼴) · spares(단어 · 문장 짝).
     */
    repeat: z.strictObject({
      words: z.array(Text),
      sentences: z.array(Text),
      goal: GoalRefSchema.optional(),
      chunks: z.array(Text).optional(),
      spares: z
        .strictObject({ words: z.array(Text), sentences: z.array(Text) })
        .optional(),
    }),
    listening: z.array(LessonListeningSchema),
    /**
     * 질문. 1~3단계 바른 답, 1~2단계 허용 답 셋 이상, 1~4단계 한국어 뜻(검사는 P4b).
     * storyEn 은 질문 직전에 들려줄 이야기, acceptedMeaning 은 뜻으로 받되 완전 수행 근거는 아닌 꼴(델타 spec 설계 6).
     */
    questions: z.array(
      z.strictObject({
        en: Text,
        ko: Text.optional(),
        modelAnswer: Text.optional(),
        accepted: z.array(Text).optional(),
        storyEn: Text.optional(),
        acceptedMeaning: z.array(Text).optional(),
        spare: SpeakingQuestionSpareSchema.optional(),
        ...soloExtra,
      }),
    ),
    /** 6 · 8단계 그림 보고 말하기(그림 키와 아이에게 안 보이는 장면 설명, C27). */
    pictureTask: z
      .strictObject({
        images: z.array(ImageKeySchema).min(1),
        scene: Text,
        prompt: Text.optional(),
      })
      .optional(),
    /** 9단계부터 발표 주제 · 쓸 말 · 예비 확인 질문(C47). */
    presentation: z
      .strictObject({
        topic: Text,
        prepWords: z.array(Text),
        fallbackQuestions: z.array(Text),
      })
      .optional(),
  }),
});
export type SpeakingLesson = z.infer<typeof SpeakingLessonSchema>;

// ── 회화(6.3 회화, 카드는 talk.ts) ───────────────────────────────

/** 회화 수업(새 꼴 카드, C189). 시드 파일 · 검증기 · 새 흐름이 읽는다. */
export const TalkLessonSchema = z.strictObject({
  ...lessonBaseShape,
  card: TalkCardSchema,
});
export type TalkLesson = z.infer<typeof TalkLessonSchema>;

// ── 수업 파일 ────────────────────────────────────────────────────

/** 영역마다 수업 규격(검증기가 수업마다 따로 풀어 깨진 칸만 실패로 낼 때 쓴다). */
export const LESSON_SCHEMAS = {
  reading: ReadingLessonSchema,
  writing: WritingLessonSchema,
  speaking: SpeakingLessonSchema,
  talk: TalkLessonSchema,
} as const;
export type LessonOf = {
  reading: ReadingLesson;
  writing: WritingLesson;
  speaking: SpeakingLesson;
  talk: TalkLesson;
};
export type Lesson = LessonOf[Area];

const lessonFileHead = {
  level: LevelSchema,
  /** 0 은 알파벳 · 소리 단원(읽기 · 쓰기 1단계만, 경로 · 정합 검사). */
  unit: z.int().min(0).max(UNITS_PER_LEVEL),
};
/** 수업 파일의 겉(수업 내용을 풀지 않는다). 검증기가 겉을 먼저 푼다. */
export const LessonFileShellSchema = z.strictObject({
  area: AreaSchema,
  ...lessonFileHead,
  lessons: z.array(z.unknown()),
});
export const LessonFileSchema = z.discriminatedUnion("area", [
  z.strictObject({
    area: z.literal("reading"),
    ...lessonFileHead,
    lessons: z.array(ReadingLessonSchema),
  }),
  z.strictObject({
    area: z.literal("writing"),
    ...lessonFileHead,
    lessons: z.array(WritingLessonSchema),
  }),
  z.strictObject({
    area: z.literal("speaking"),
    ...lessonFileHead,
    lessons: z.array(SpeakingLessonSchema),
  }),
  z.strictObject({
    area: z.literal("talk"),
    ...lessonFileHead,
    lessons: z.array(TalkLessonSchema),
  }),
]);
export type LessonFile = z.infer<typeof LessonFileSchema>;

// ── 글 조각 ──────────────────────────────────────────────────────

type Sink = ReturnType<typeof fragmentSink>;

function previewTexts(
  sink: Sink,
  prefix: string,
  preview: z.infer<typeof PreviewSchema>,
): void {
  preview.forEach((entry, i) => {
    sink.one(joinPath(prefix, `preview.${i}.meaningKo`), "ko", entry.meaningKo);
    if (entry.example !== "")
      sink.one(
        joinPath(prefix, `preview.${i}.example`),
        "example",
        entry.example,
      );
    sink.all(joinPath(prefix, `preview.${i}.parts`), "piece", entry.parts);
  });
}

function chipTexts(
  sink: Sink,
  path: string,
  chips: readonly TeachChip[],
): void {
  chips.forEach((chip, i) => {
    sink.one(joinPath(path, `${i}.text`), "piece", chip.text);
    sink.one(joinPath(path, `${i}.from`), "piece", chip.from);
  });
}

/** 같이 해 보기 문항의 선생님 칸 · 띠 낱말(영역 공통). */
function togetherCommonTexts(
  sink: Sink,
  path: string,
  item: {
    highlight?: string[];
    lineKo?: string;
    rightKo: string;
    wrongKo: string;
  },
): void {
  sink.all(joinPath(path, "highlight"), "piece", item.highlight);
  sink.one(joinPath(path, "lineKo"), "ko", item.lineKo);
  sink.one(joinPath(path, "rightKo"), "ko", item.rightKo);
  sink.one(joinPath(path, "wrongKo"), "ko", item.wrongKo);
}

/**
 * 가르치는 수업 칸(teach)의 글 조각(델타 spec 설계 7 '범위(넓힘)'). 영어 칸은 영어 role(본보기 · 틀 example, 이야기 script,
 * 질문 prompt, 답 answer)로 내어 지금의 학습 요소 범위 · 금지어 검사를 받게 하고, 선생님 줄 · 뜻은 ko, 칩 글은 piece 다.
 */
function teachTexts<T>(
  sink: Sink,
  prefix: string,
  teach: {
    shiftKo: { before: string; after: string };
    todayKo: string;
    todayEn?: string;
    models: readonly TeachModel[];
    together: readonly T[];
    recap: z.infer<typeof TeachRecapSchema>;
  },
  together: (path: string, item: T) => void,
): void {
  const t = joinPath(prefix, "teach");
  sink.one(joinPath(t, "shiftKo.before"), "ko", teach.shiftKo.before);
  sink.one(joinPath(t, "shiftKo.after"), "ko", teach.shiftKo.after);
  sink.one(joinPath(t, "todayKo"), "ko", teach.todayKo);
  sink.one(joinPath(t, "todayEn"), "example", teach.todayEn);
  teach.models.forEach((m, i) => {
    const at = joinPath(t, `models.${i}`);
    sink.one(joinPath(at, "storyEn"), "script", m.storyEn);
    sink.one(joinPath(at, "questionEn"), "prompt", m.questionEn);
    sink.one(joinPath(at, "wordAnswerEn"), "answer", m.wordAnswerEn);
    sink.one(joinPath(at, "fromEn"), "example", m.fromEn);
    sink.one(joinPath(at, "en"), "example", m.en);
    sink.one(joinPath(at, "ko"), "ko", m.ko);
    chipTexts(sink, joinPath(at, "chips"), m.chips);
    sink.one(joinPath(at, "lineKo"), "ko", m.lineKo);
  });
  teach.together.forEach((item, i) => {
    together(joinPath(t, `together.${i}`), item);
  });
  const r = joinPath(t, "recap");
  sink.one(joinPath(r, "frameEn"), "example", teach.recap.frameEn);
  chipTexts(sink, joinPath(r, "chips"), teach.recap.chips);
  sink.one(joinPath(r, "closeKo"), "ko", teach.recap.closeKo);
  sink.one(joinPath(r, "closeKoPracticed"), "ko", teach.recap.closeKoPracticed);
}

/** 쓰기 문항 하나의 글 조각(수업 · 평가 · 배치 공통). 그림 단어 id 는 내지 않는다. */
export function writingItemTexts(
  sink: Sink,
  path: string,
  item: WritingItem,
): void {
  const at = (key: string) => joinPath(path, key);
  switch (item.type) {
    case "pick-word":
      sink.all(at("options"), "option", item.options);
      break;
    case "copy-tiles":
      sink.one(at("word"), "answer", item.word);
      sink.all(at("tiles"), "piece", item.tiles);
      break;
    case "build-tiles":
      sink.one(at("word"), "answer", item.word);
      sink.all(at("tiles"), "piece", item.tiles);
      sink.one(at("meaningKo"), "ko", item.meaningKo);
      break;
    case "fill-letters":
      sink.one(at("word"), "answer", item.word);
      sink.one(at("pattern"), "piece", item.pattern);
      sink.all(at("tiles"), "piece", item.tiles);
      break;
    case "dictation":
      sink.one(at("word"), "answer", item.word);
      sink.one(at("audioText"), "script", item.audioText);
      break;
    case "assemble-phrase":
    case "assemble-sentence":
      sink.all(at("cards"), "piece", item.cards);
      sink.one(at("meaningKo"), "ko", item.meaningKo);
      break;
  }
  sink.all(at("accepted"), "answer", item.accepted);
}

/** 듣기 문항 하나의 글 조각. 그림 보기의 단어 id 는 그 단어 글로 낸다(role option). */
export function listeningTexts(
  sink: Sink,
  path: string,
  item: Listening,
): void {
  sink.one(joinPath(path, "script"), "script", item.script);
  if (item.kind === "text")
    sink.one(joinPath(path, "prompt"), "prompt", item.prompt);
  sink.all(joinPath(path, "options"), "option", item.options);
}

function readingQuestionTexts(
  sink: Sink,
  at: string,
  q: {
    prompt: string;
    options: readonly string[];
    whyKo?: string;
  },
): void {
  sink.one(joinPath(at, "prompt"), "prompt", q.prompt);
  sink.all(joinPath(at, "options"), "option", q.options);
  sink.one(joinPath(at, "whyKo"), "ko", q.whyKo);
}

function readingTexts(sink: Sink, lesson: ReadingLesson, prefix: string): void {
  previewTexts(sink, prefix, lesson.preview);
  if (lesson.teach)
    teachTexts(sink, prefix, lesson.teach, (at, item) => {
      sink.one(joinPath(at, "textEn"), "passage", item.textEn);
      sink.one(joinPath(at, "prompt"), "prompt", item.prompt);
      sink.all(joinPath(at, "choices"), "option", item.choices);
      togetherCommonTexts(sink, at, item);
    });
  const c = joinPath(prefix, "content");
  sink.one(joinPath(c, "passage"), "passage", lesson.content.passage);
  lesson.content.glossary.forEach((entry, i) => {
    sink.one(joinPath(c, `glossary.${i}.surface`), "gloss", entry.surface);
    sink.one(joinPath(c, `glossary.${i}.lemma`), "gloss", entry.lemma);
    sink.one(joinPath(c, `glossary.${i}.meaningKo`), "ko", entry.meaningKo);
  });
  lesson.content.questions.forEach((q, i) => {
    const at = joinPath(c, `questions.${i}`);
    readingQuestionTexts(sink, at, q);
    sink.one(joinPath(at, "explanationKo"), "ko", q.explanationKo);
    sink.one(joinPath(at, "retryHighlight"), "piece", q.retryHighlight);
    if (q.spare) {
      const sp = joinPath(at, "spare");
      sink.one(joinPath(sp, "textEn"), "passage", q.spare.textEn);
      readingQuestionTexts(sink, sp, q.spare);
    }
  });
}

function writingTexts(sink: Sink, lesson: WritingLesson, prefix: string): void {
  previewTexts(sink, prefix, lesson.preview);
  if (lesson.teach)
    teachTexts(sink, prefix, lesson.teach, (at, item) => {
      writingItemTexts(sink, at, item);
      sink.all(
        joinPath(at, "filled.cards"),
        "piece",
        item.filled?.cards.map((card) => card ?? ""),
      );
      sink.all(joinPath(at, "choices"), "piece", item.choices);
      togetherCommonTexts(sink, at, item);
    });
  const c = joinPath(prefix, "content");
  const content = lesson.content;
  switch (content.shape) {
    case "items":
      content.items.forEach((item, i) => {
        const at = joinPath(c, `items.${i}`);
        writingItemTexts(sink, at, item);
        sink.one(joinPath(at, "whyKo"), "ko", item.whyKo);
        if (item.spare) {
          writingItemTexts(sink, joinPath(at, "spare"), item.spare);
          sink.one(joinPath(at, "spare.whyKo"), "ko", item.spare.whyKo);
        }
      });
      return;
    case "guided":
      sink.one(joinPath(c, "task"), "prompt", content.task);
      sink.one(joinPath(c, "example"), "example", content.example);
      sink.all(joinPath(c, "hints"), "hint", content.hints);
      sink.all(joinPath(c, "rubric"), "ko", content.rubric);
      content.sentences.forEach((s, i) => {
        const at = joinPath(c, `sentences.${i}`);
        sink.one(joinPath(at, "frame"), "answer", s.frame);
        sink.all(joinPath(at, "wordBox"), "option", s.wordBox);
        sink.one(joinPath(at, "model"), "answer", s.model);
      });
      return;
    case "composition":
      sink.one(joinPath(c, "task"), "prompt", content.task);
      sink.one(joinPath(c, "example"), "example", content.example);
      sink.all(joinPath(c, "hints"), "hint", content.hints);
      sink.all(joinPath(c, "rubric"), "ko", content.rubric);
      return;
  }
}

function speakingTexts(
  sink: Sink,
  lesson: SpeakingLesson,
  prefix: string,
): void {
  previewTexts(sink, prefix, lesson.preview);
  if (lesson.teach)
    teachTexts(sink, prefix, lesson.teach, (at, item) => {
      sink.one(joinPath(at, "storyEn"), "script", item.storyEn);
      sink.one(joinPath(at, "en"), "prompt", item.en);
      sink.one(joinPath(at, "ko"), "ko", item.ko);
      sink.one(joinPath(at, "filled"), "prompt", item.filled);
      sink.all(joinPath(at, "choices"), "option", item.choices);
      sink.one(joinPath(at, "modelAnswer"), "answer", item.modelAnswer);
      sink.all(joinPath(at, "accepted"), "answer", item.accepted);
      sink.all(joinPath(at, "acceptedMeaning"), "answer", item.acceptedMeaning);
      togetherCommonTexts(sink, at, item);
    });
  const c = joinPath(prefix, "content");
  const content = lesson.content;
  const repeat = content.repeat;
  sink.all(joinPath(c, "repeat.words"), "answer", repeat.words);
  sink.all(joinPath(c, "repeat.sentences"), "answer", repeat.sentences);
  sink.all(joinPath(c, "repeat.chunks"), "piece", repeat.chunks);
  sink.all(joinPath(c, "repeat.spares.words"), "answer", repeat.spares?.words);
  sink.all(
    joinPath(c, "repeat.spares.sentences"),
    "answer",
    repeat.spares?.sentences,
  );
  content.listening.forEach((item, i) => {
    const at = joinPath(c, `listening.${i}`);
    listeningTexts(sink, at, item);
    sink.one(joinPath(at, "whyKo"), "ko", item.whyKo);
    sink.one(joinPath(at, "retryHighlight"), "piece", item.retryHighlight);
    if (item.spare) {
      listeningTexts(sink, joinPath(at, "spare"), item.spare);
      sink.one(joinPath(at, "spare.whyKo"), "ko", item.spare.whyKo);
    }
  });
  const question = (
    at: string,
    q: {
      storyEn?: string;
      en: string;
      ko?: string;
      modelAnswer?: string;
      accepted?: string[];
      acceptedMeaning?: string[];
      whyKo?: string;
    },
  ) => {
    sink.one(joinPath(at, "storyEn"), "script", q.storyEn);
    sink.one(joinPath(at, "en"), "prompt", q.en);
    sink.one(joinPath(at, "ko"), "ko", q.ko);
    sink.one(joinPath(at, "modelAnswer"), "answer", q.modelAnswer);
    sink.all(joinPath(at, "accepted"), "answer", q.accepted);
    sink.all(joinPath(at, "acceptedMeaning"), "answer", q.acceptedMeaning);
    sink.one(joinPath(at, "whyKo"), "ko", q.whyKo);
  };
  content.questions.forEach((q, i) => {
    const at = joinPath(c, `questions.${i}`);
    question(at, q);
    if (q.spare) question(joinPath(at, "spare"), q.spare);
  });
  if (content.pictureTask) {
    const at = joinPath(c, "pictureTask");
    sink.one(joinPath(at, "scene"), "scene", content.pictureTask.scene);
    sink.one(joinPath(at, "prompt"), "prompt", content.pictureTask.prompt);
  }
  if (content.presentation) {
    const at = joinPath(c, "presentation");
    sink.one(joinPath(at, "topic"), "prompt", content.presentation.topic);
    sink.all(joinPath(at, "prepWords"), "hint", content.presentation.prepWords);
    sink.all(
      joinPath(at, "fallbackQuestions"),
      "prompt",
      content.presentation.fallbackQuestions,
    );
  }
}

/**
 * 수업 하나의 글 조각(plan-p04a '글 조각 목록'). 경로는 수업 객체 기준이다(prefix 를 주면 앞에 붙인다).
 * 내지 않는 칸: 종류 · 번호 · 판 · 생성 기록 · 새 단어 · 단원 단어 · 목표 단어 · 미리보기 단어 · 그림 키.
 * 글로서리 표기형 · 원형은 role gloss 로 낸다(영어 검사 밖, 금지어 검사 안).
 */
export function textsOfLesson<A extends Area>(
  area: A,
  lesson: LessonOf[A],
  prefix = "",
): TextFragment[] {
  const sink = fragmentSink();
  sink.one(joinPath(prefix, "title"), "ko", lesson.title);
  switch (area) {
    case "reading":
      readingTexts(sink, lesson as ReadingLesson, prefix);
      break;
    case "writing":
      writingTexts(sink, lesson as WritingLesson, prefix);
      break;
    case "speaking":
      speakingTexts(sink, lesson as SpeakingLesson, prefix);
      break;
    case "talk":
      sink.out.push(
        ...textsOfTalkCard(
          (lesson as TalkLesson).card,
          joinPath(prefix, "card"),
        ),
      );
      break;
  }
  return sink.out;
}

/** 수업 파일 전체의 글 조각(경로는 `lessons.<차례>.…`). */
export function textsOfLessonFile(file: LessonFile): TextFragment[] {
  return file.lessons.flatMap((lesson, i) =>
    textsOfLesson(
      file.area,
      lesson as LessonOf[typeof file.area],
      `lessons.${i}`,
    ),
  );
}

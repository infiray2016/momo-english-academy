// 단계 평가 · 배치 평가 · 토리 이야기의 Zod 규격(plan-p04a '단계 평가 · 배치 평가 · 토리 이야기', 6.3 · 5절).
// 수 · 번호 · 연결 단원 분포 · 겹침은 P4c 의 평가 검사가 본다.
import { z } from "zod";
import {
  GenerationSchema,
  type Listening,
  listeningTexts,
  listeningVariants,
  type WritingItem,
  writingItemTexts,
  writingItemVariants,
} from "@/core/seed/schema/lesson";
import {
  BandSchema,
  LevelSchema,
  PositiveInt,
  seedVersionShape,
  Text,
  WordIdSchema,
} from "@/core/seed/schema/reference";
import {
  TalkTestSheetSchema,
  textsOfTalkTestSheet,
} from "@/core/seed/schema/talk";
import {
  fragmentSink,
  joinPath,
  READING_OPTIONS,
  READING_TEXT_QUESTION_TYPES,
  STORY_OPTIONS,
  STORY_QUESTIONS,
  type TextFragment,
  UNITS_PER_LEVEL,
} from "@/core/seed/structure";

// ── 문항 갈래(평가 · 배치 공통 칸을 받아 만든다) ───────────────────

function readingItemVariants<S extends z.core.$ZodLooseShape>(extra: S) {
  const common = {
    passage: Text,
    prompt: Text,
    answerNo: PositiveInt,
  };
  return [
    z.strictObject({
      type: z.literal("picture"),
      options: z.array(WordIdSchema).length(READING_OPTIONS),
      ...common,
      ...extra,
    }),
    z.strictObject({
      type: z.enum(READING_TEXT_QUESTION_TYPES),
      options: z.array(Text).length(READING_OPTIONS),
      ...common,
      ...extra,
    }),
  ] as const;
}

/** 쓰기 4~5단계 · 높은 단계의 앱 채점 문항(빈칸 채우기 · 문장 고치기, 3.2 배치). */
function writingAppVariants<S extends z.core.$ZodLooseShape>(extra: S) {
  return [
    ...writingItemVariants(extra),
    z.strictObject({
      type: z.literal("fill-blank"),
      prompt: Text,
      accepted: z.array(Text).min(1),
      ...extra,
    }),
    z.strictObject({
      type: z.literal("fix-sentence"),
      prompt: Text,
      accepted: z.array(Text).min(1),
      ...extra,
    }),
  ] as const;
}

function speakingAppVariants<S extends z.core.$ZodLooseShape>(extra: S) {
  return [
    z.strictObject({ type: z.literal("repeat"), sentence: Text, ...extra }),
    z.discriminatedUnion(
      "kind",
      listeningVariants({ type: z.literal("listening"), ...extra }),
    ),
  ] as const;
}

// ── 단계 평가 level-tests/<영역>/<단계>.json ──────────────────────

/** 단계 평가 문항 공통(6.3 '유형 · 지문 · 보기 · 정답 · 해설 · 연결 단원'). */
const testItemCommon = {
  no: PositiveInt,
  /** 연결 단원 1~5. */
  unit: z.int().min(1).max(UNITS_PER_LEVEL),
  ...seedVersionShape,
  explanationKo: Text.optional(),
};

export const ReadingTestItemSchema = z.discriminatedUnion(
  "type",
  readingItemVariants(testItemCommon),
);
export const WritingTestItemSchema = z.discriminatedUnion("type", [
  ...writingAppVariants(testItemCommon),
  /** AI 과제 문항(쓰기 4단계 이상 작문). */
  z.strictObject({
    type: z.literal("composition"),
    task: Text,
    example: Text.optional(),
    rubric: z.array(Text),
    ...testItemCommon,
  }),
]);
export const SpeakingTestItemSchema = z.discriminatedUnion("type", [
  ...speakingAppVariants(testItemCommon),
  z.strictObject({
    type: z.literal("question"),
    en: Text,
    ko: Text.optional(),
    accepted: z.array(Text).optional(),
    modelAnswer: Text.optional(),
    ...testItemCommon,
  }),
  /** 발표 문항에는 확인 질문을 붙이지 않는다(6.3) — 확인 질문 칸이 없다. */
  z.strictObject({
    type: z.literal("presentation"),
    topic: Text,
    prepWords: z.array(Text),
    ...testItemCommon,
  }),
]);
export type ReadingTestItem = z.infer<typeof ReadingTestItemSchema>;
export type WritingTestItem = z.infer<typeof WritingTestItemSchema>;
export type SpeakingTestItem = z.infer<typeof SpeakingTestItemSchema>;
export type TestItem = ReadingTestItem | WritingTestItem | SpeakingTestItem;

/** 벌 번호(1 이상 정수). */
const FormNo = PositiveInt;
function testForms<T extends z.ZodType>(item: T) {
  return z.array(z.strictObject({ form: FormNo, items: z.array(item) }));
}

export const LevelTestFileSchema = z.discriminatedUnion("area", [
  z.strictObject({
    area: z.literal("reading"),
    level: LevelSchema,
    forms: testForms(ReadingTestItemSchema),
  }),
  z.strictObject({
    area: z.literal("writing"),
    level: LevelSchema,
    forms: testForms(WritingTestItemSchema),
  }),
  z.strictObject({
    area: z.literal("speaking"),
    level: LevelSchema,
    forms: testForms(SpeakingTestItemSchema),
  }),
  z.strictObject({
    area: z.literal("talk"),
    level: LevelSchema,
    forms: z.array(
      z.strictObject({ form: FormNo, sheets: z.array(TalkTestSheetSchema) }),
    ),
  }),
]);
export type LevelTestFile = z.infer<typeof LevelTestFileSchema>;

// ── 배치 평가 placement/<영역>.json(가 벌 = 1, C54 (3)) ───────────

/** 배치 문항은 앱이 채점하는 유형만(3.2). 연결 단원 · 해설 칸이 없다. */
const placementItemCommon = { no: PositiveInt, ...seedVersionShape };

export const ReadingPlacementItemSchema = z.discriminatedUnion(
  "type",
  readingItemVariants(placementItemCommon),
);
export const WritingPlacementItemSchema = z.discriminatedUnion(
  "type",
  writingAppVariants(placementItemCommon),
);
export const SpeakingPlacementItemSchema = z.discriminatedUnion(
  "type",
  speakingAppVariants(placementItemCommon),
);
export type PlacementItem =
  | z.infer<typeof ReadingPlacementItemSchema>
  | z.infer<typeof WritingPlacementItemSchema>
  | z.infer<typeof SpeakingPlacementItemSchema>;

function placementLevels<T extends z.ZodType>(item: T) {
  return z.array(
    z.strictObject({
      level: LevelSchema,
      items: z.array(item),
      /** 말하기 듣고 고르기 예비 문항(C54 (5), 말하기에만 · 검사는 P4c). */
      spares: z.array(item),
    }),
  );
}

export const PlacementFileSchema = z.discriminatedUnion("area", [
  z.strictObject({
    area: z.literal("reading"),
    form: FormNo,
    levels: placementLevels(ReadingPlacementItemSchema),
  }),
  z.strictObject({
    area: z.literal("writing"),
    form: FormNo,
    levels: placementLevels(WritingPlacementItemSchema),
  }),
  z.strictObject({
    area: z.literal("speaking"),
    form: FormNo,
    levels: placementLevels(SpeakingPlacementItemSchema),
  }),
]);
export type PlacementFile = z.infer<typeof PlacementFileSchema>;

// ── 토리 이야기 stories/<구간>.json(6.3) ─────────────────────────

export const StorySchema = z.strictObject({
  /** 여는 순서. */
  no: PositiveInt,
  ...seedVersionShape,
  generation: GenerationSchema.optional(),
  title: Text.optional(),
  textEn: Text,
  /** 한국어 뜻(1~3 · 4~6 구간, 검사는 P4c). */
  textKo: Text.optional(),
  questions: z
    .array(
      z.strictObject({
        prompt: Text,
        options: z.array(Text).length(STORY_OPTIONS),
        answerNo: PositiveInt,
        explanationKo: Text,
      }),
    )
    .length(STORY_QUESTIONS),
});
export type Story = z.infer<typeof StorySchema>;
export const StoryFileSchema = z.strictObject({
  band: BandSchema,
  stories: z.array(StorySchema),
});
export type StoryFile = z.infer<typeof StoryFileSchema>;

// ── 글 조각 ──────────────────────────────────────────────────────

type Sink = ReturnType<typeof fragmentSink>;
type AnyItem = TestItem | PlacementItem;

/** 평가 · 배치 문항 하나의 글 조각. 번호 · 판 · 연결 단원 · 그림 단어 id 는 내지 않는다. */
function itemTexts(sink: Sink, path: string, item: AnyItem): void {
  const at = (key: string) => joinPath(path, key);
  switch (item.type) {
    case "picture":
    case "fact":
    case "sequence":
    case "main-idea":
    case "inference":
    case "vocab-in-context":
    case "topic":
    case "gist":
    case "purpose":
    case "structure":
      sink.one(at("passage"), "passage", item.passage);
      sink.one(at("prompt"), "prompt", item.prompt);
      sink.all(at("options"), "option", item.options);
      break;
    case "pick-word":
    case "copy-tiles":
    case "build-tiles":
    case "fill-letters":
    case "dictation":
    case "assemble-phrase":
    case "assemble-sentence":
      writingItemTexts(sink, path, item as WritingItem);
      break;
    case "fill-blank":
    case "fix-sentence":
      sink.one(at("prompt"), "prompt", item.prompt);
      sink.all(at("accepted"), "answer", item.accepted);
      break;
    case "composition":
      sink.one(at("task"), "prompt", item.task);
      sink.one(at("example"), "example", item.example);
      sink.all(at("rubric"), "ko", item.rubric);
      break;
    case "repeat":
      sink.one(at("sentence"), "answer", item.sentence);
      break;
    case "listening":
      listeningTexts(sink, path, item as Listening);
      break;
    case "question":
      sink.one(at("en"), "prompt", item.en);
      sink.one(at("ko"), "ko", item.ko);
      sink.all(at("accepted"), "answer", item.accepted);
      sink.one(at("modelAnswer"), "answer", item.modelAnswer);
      break;
    case "presentation":
      sink.one(at("topic"), "prompt", item.topic);
      sink.all(at("prepWords"), "hint", item.prepWords);
      break;
  }
  if ("explanationKo" in item)
    sink.one(at("explanationKo"), "ko", item.explanationKo);
}

export function textsOfTestItem(item: TestItem, prefix = ""): TextFragment[] {
  const sink = fragmentSink();
  itemTexts(sink, prefix, item);
  return sink.out;
}

export function textsOfPlacementItem(
  item: PlacementItem,
  prefix = "",
): TextFragment[] {
  const sink = fragmentSink();
  itemTexts(sink, prefix, item);
  return sink.out;
}

/** 단계 평가 파일의 글 조각(경로는 파일 기준 `forms.<차례>.items.<차례>.…` · `…sheets.<차례>.…`). */
export function textsOfLevelTestFile(file: LevelTestFile): TextFragment[] {
  const out: TextFragment[] = [];
  file.forms.forEach((form, f) => {
    if ("sheets" in form) {
      form.sheets.forEach((sheet, s) => {
        out.push(...textsOfTalkTestSheet(sheet, `forms.${f}.sheets.${s}`));
      });
      return;
    }
    (form.items as TestItem[]).forEach((item, i) => {
      out.push(...textsOfTestItem(item, `forms.${f}.items.${i}`));
    });
  });
  return out;
}

export function textsOfPlacementFile(file: PlacementFile): TextFragment[] {
  const out: TextFragment[] = [];
  file.levels.forEach((level, l) => {
    (level.items as PlacementItem[]).forEach((item, i) => {
      out.push(...textsOfPlacementItem(item, `levels.${l}.items.${i}`));
    });
    (level.spares as PlacementItem[]).forEach((item, i) => {
      out.push(...textsOfPlacementItem(item, `levels.${l}.spares.${i}`));
    });
  });
  return out;
}

export function textsOfStory(story: Story, prefix = ""): TextFragment[] {
  const sink = fragmentSink();
  const at = (key: string) => joinPath(prefix, key);
  sink.one(at("title"), "ko", story.title);
  sink.one(at("textEn"), "story", story.textEn);
  sink.one(at("textKo"), "ko", story.textKo);
  story.questions.forEach((q, i) => {
    sink.one(at(`questions.${i}.prompt`), "prompt", q.prompt);
    sink.all(at(`questions.${i}.options`), "option", q.options);
    sink.one(at(`questions.${i}.explanationKo`), "ko", q.explanationKo);
  });
  return sink.out;
}

export function textsOfStoryFile(file: StoryFile): TextFragment[] {
  return file.stories.flatMap((story, i) =>
    textsOfStory(story, `stories.${i}`),
  );
}

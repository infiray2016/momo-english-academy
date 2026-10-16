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
  fragmentSink,
  joinPath,
  LESSON_KINDS,
  READING_OPTIONS,
  READING_TEXT_QUESTION_TYPES,
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

/** 새 단어 미리보기(3.3 첫 활동). */
export const PreviewSchema = z.array(
  z.strictObject({ word: WordIdSchema, meaningKo: Text, example: Text }),
);

// ── 읽기(6.3 읽기, 3.3) ──────────────────────────────────────────

const readingQuestionCommon = {
  prompt: Text,
  /** 정답 번호(1부터). 보기 범위 안인지는 P4b. */
  answerNo: PositiveInt,
  explanationKo: Text,
};
/** 그림 문제의 보기는 그림 카탈로그 키가 있는 단어 id 로만 낸다(6.3). */
export const ReadingQuestionSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("picture"),
    type: z.literal("picture"),
    options: z.array(WordIdSchema).length(READING_OPTIONS),
    ...readingQuestionCommon,
  }),
  z.strictObject({
    kind: z.literal("text"),
    type: z.enum(READING_TEXT_QUESTION_TYPES),
    options: z.array(Text).length(READING_OPTIONS),
    ...readingQuestionCommon,
  }),
]);
export type ReadingQuestion = z.infer<typeof ReadingQuestionSchema>;

export const ReadingLessonSchema = z.strictObject({
  ...lessonBaseShape,
  preview: PreviewSchema,
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

export const WritingItemSchema = z.discriminatedUnion(
  "type",
  writingItemVariants({}),
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

export const WritingLessonSchema = z.strictObject({
  ...lessonBaseShape,
  preview: PreviewSchema,
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

export const SpeakingLessonSchema = z.strictObject({
  ...lessonBaseShape,
  preview: PreviewSchema,
  content: z.strictObject({
    /** 따라 말할 단어 · 문장(9단계부터 빈 목록). */
    repeat: z.strictObject({ words: z.array(Text), sentences: z.array(Text) }),
    listening: z.array(ListeningSchema),
    /** 질문. 1~3단계 바른 답, 1~2단계 허용 답 셋 이상, 1~4단계 한국어 뜻(검사는 P4b). */
    questions: z.array(
      z.strictObject({
        en: Text,
        ko: Text.optional(),
        modelAnswer: Text.optional(),
        accepted: z.array(Text).optional(),
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
    sink.one(
      joinPath(prefix, `preview.${i}.example`),
      "example",
      entry.example,
    );
  });
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

function readingTexts(sink: Sink, lesson: ReadingLesson, prefix: string): void {
  previewTexts(sink, prefix, lesson.preview);
  const c = joinPath(prefix, "content");
  sink.one(joinPath(c, "passage"), "passage", lesson.content.passage);
  lesson.content.glossary.forEach((entry, i) => {
    sink.one(joinPath(c, `glossary.${i}.surface`), "gloss", entry.surface);
    sink.one(joinPath(c, `glossary.${i}.lemma`), "gloss", entry.lemma);
    sink.one(joinPath(c, `glossary.${i}.meaningKo`), "ko", entry.meaningKo);
  });
  lesson.content.questions.forEach((q, i) => {
    const at = joinPath(c, `questions.${i}`);
    sink.one(joinPath(at, "prompt"), "prompt", q.prompt);
    sink.all(joinPath(at, "options"), "option", q.options);
    sink.one(joinPath(at, "explanationKo"), "ko", q.explanationKo);
  });
}

function writingTexts(sink: Sink, lesson: WritingLesson, prefix: string): void {
  previewTexts(sink, prefix, lesson.preview);
  const c = joinPath(prefix, "content");
  const content = lesson.content;
  switch (content.shape) {
    case "items":
      content.items.forEach((item, i) => {
        writingItemTexts(sink, joinPath(c, `items.${i}`), item);
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
  const c = joinPath(prefix, "content");
  const content = lesson.content;
  sink.all(joinPath(c, "repeat.words"), "answer", content.repeat.words);
  sink.all(joinPath(c, "repeat.sentences"), "answer", content.repeat.sentences);
  content.listening.forEach((item, i) => {
    listeningTexts(sink, joinPath(c, `listening.${i}`), item);
  });
  content.questions.forEach((q, i) => {
    const at = joinPath(c, `questions.${i}`);
    sink.one(joinPath(at, "en"), "prompt", q.en);
    sink.one(joinPath(at, "ko"), "ko", q.ko);
    sink.one(joinPath(at, "modelAnswer"), "answer", q.modelAnswer);
    sink.all(joinPath(at, "accepted"), "answer", q.accepted);
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

// 회화 대화 시나리오 카드 · 회화 평가 카드 장의 Zod 규격(plan-p04a '회화 카드 TalkCard', 6.3 회화 행 · 6.4).
// 단계에 맞는 칸이 있는지(1~3단계 turns, 4단계부터 questions 등)는 P4c 의 칸 검사가 level_specs 회화 칸으로 본다.
// 회화 수업(수업 겉 + card)은 수업 파일과 함께 lesson.ts 에 둔다(lesson.ts 가 이 파일을 가져오므로 반대 방향은 순환이 된다).
import { z } from "zod";
import {
  ImageKeySchema,
  seedVersionShape,
  Text,
  WordIdSchema,
} from "@/core/seed/schema/reference";
import {
  ASK_KINDS,
  BLANK,
  fragmentSink,
  joinPath,
  SLOT_POS,
  TALK_GREETING_TURNS,
  type TextFragment,
  UNITS_PER_LEVEL,
} from "@/core/seed/structure";

/** 대사 한 줄. 1~4단계는 한국어 뜻(반말)을 둔다(6.3, 검사는 P4c). */
export const LineSchema = z.strictObject({ en: Text, ko: Text.optional() });
export type Line = z.infer<typeof LineSchema>;

const greetingTurnShape = {
  /** 토리 질문(영어 · 한국어 뜻). */
  question: z.strictObject({ en: Text, ko: Text }),
  /** 한국어 뜻 힌트. */
  hintKo: Text,
  /** 영어 문장 힌트. */
  hintEn: Text,
  /** 3단계 영어 틀(C31). */
  frameEn: Text.optional(),
  /** 답 예시. */
  answerExample: Text,
  /** 1단계 답 두 개(C2). */
  twoAnswers: z.tuple([Text, Text]).optional(),
  /** 1~3단계 턴 그림(C32). */
  imageKey: ImageKeySchema.optional(),
};
/** 1~3단계 인사 질문 한 턴. */
export const GreetingTurnSchema = z.strictObject(greetingTurnShape);
export type GreetingTurn = z.infer<typeof GreetingTurnSchema>;

/** 1~3단계 대화 턴 · 더 이야기할 거리 한 턴. */
export const TurnCardSchema = z.strictObject({
  ...greetingTurnShape,
  /** 노리는 단원 단어(1~2개, 수는 P4c). */
  targets: z.array(WordIdSchema),
  ask: z.enum(ASK_KINDS),
});
export type TurnCard = z.infer<typeof TurnCardSchema>;

/** 4단계부터 카드 질문 목록 한 줄(배열 차례가 번호, C19). */
export const QuestionCardSchema = z.strictObject({
  en: Text,
  ko: Text,
  targets: z.array(WordIdSchema),
  hintKo: Text,
  /** 단계 규격 수만큼의 영어 힌트 단. */
  hintTiers: z.array(Text),
  /** 5~6단계 쓸 수 있는 말. */
  usablePhrases: z.array(Text).optional(),
  answerExample: Text,
});
export type QuestionCard = z.infer<typeof QuestionCardSchema>;

export const TalkCardSchema = z.strictObject({
  topic: Text,
  targetExpressions: z.array(Text).min(1),
  greetingTurns: z
    .int()
    .min(TALK_GREETING_TURNS.min)
    .max(TALK_GREETING_TURNS.max),
  /** 1~3단계 인사 질문, 4단계부터 토리의 첫 말. */
  greeting: z.union([
    z.strictObject({ questions: z.array(GreetingTurnSchema).min(1) }),
    z.strictObject({ firstLine: LineSchema }),
  ]),
  /** 오늘 쓸 말. `exampleKo` 는 말해 보기 예문의 뜻(1~3단계). */
  todayWords: z.array(
    z.strictObject({
      word: WordIdSchema,
      meaningKo: Text,
      example: Text,
      exampleKo: Text.optional(),
    }),
  ),
  firstQuestion: Text,
  /** 턴마다의 예상 흐름(영어). */
  flow: z.array(Text).min(1),
  /** 옆 칸에 보일 오늘 이야기 목록(한국어). */
  todayTopicsKo: z.array(Text),
  closingLines: z.array(LineSchema).min(1),
  safeLines: z.array(LineSchema).min(1),
  endCondition: Text,
  /** 5~7단계 미션 목록(칸 꼴은 제안). */
  missions: z.array(z.strictObject({ ko: Text, en: Text })).optional(),
  farewell: LineSchema,
  /** '새 이야기로 이어 가자' 끝인사(안전 상한용). */
  safetyFarewell: LineSchema,
  praiseLines: z.array(Text).min(1),
  turns: z.array(TurnCardSchema).optional(),
  moreTalk: z.array(TurnCardSchema).optional(),
  questions: z.array(QuestionCardSchema).optional(),
});
export type TalkCard = z.infer<typeof TalkCardSchema>;

// ── 회화 평가 카드 장(5절 level_test_items · 6.4 회화 평가 카드) ──

export const AllowedAnswerSchema = z
  .strictObject({ text: Text, slotPos: z.enum(SLOT_POS).optional() })
  .superRefine((answer, ctx) => {
    const hasBlank = BLANK.test(answer.text);
    if (hasBlank && answer.slotPos === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["slotPos"],
        message: "허용 답의 빈칸에 들어갈 품사가 없다",
      });
    }
    if (!hasBlank && answer.slotPos !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["slotPos"],
        message: "빈칸이 없는 허용 답에 품사가 있다",
      });
    }
  });
export type AllowedAnswer = z.infer<typeof AllowedAnswerSchema>;

export const TalkTestTurnSchema = z.strictObject({
  question: z.strictObject({ en: Text, ko: Text.optional() }),
  allowed: z.array(AllowedAnswerSchema).min(1),
  /** 아이가 할 말의 한국어 뜻. */
  childKo: Text,
  frameEn: Text,
  sentenceEn: Text,
  /** 연결 단원 1~5. */
  unit: z.int().min(1).max(UNITS_PER_LEVEL),
});
export const TalkTestSheetSchema = z.strictObject({
  sheet: z.int().min(1),
  ...seedVersionShape,
  firstLine: LineSchema,
  turns: z.array(TalkTestTurnSchema).min(1),
});
export type TalkTestSheet = z.infer<typeof TalkTestSheetSchema>;

// ── 글 조각 ──────────────────────────────────────────────────────

type Sink = ReturnType<typeof fragmentSink>;

function lineTexts(sink: Sink, path: string, line: Line | undefined): void {
  if (!line) return;
  sink.one(joinPath(path, "en"), "tori", line.en);
  sink.one(joinPath(path, "ko"), "ko", line.ko);
}

function greetingTurnTexts(
  sink: Sink,
  path: string,
  turn: GreetingTurn | TurnCard,
): void {
  sink.one(joinPath(path, "question.en"), "tori", turn.question.en);
  sink.one(joinPath(path, "question.ko"), "ko", turn.question.ko);
  sink.one(joinPath(path, "hintKo"), "ko", turn.hintKo);
  sink.one(joinPath(path, "hintEn"), "hint", turn.hintEn);
  sink.one(joinPath(path, "frameEn"), "hint", turn.frameEn);
  sink.one(joinPath(path, "answerExample"), "child", turn.answerExample);
  sink.all(joinPath(path, "twoAnswers"), "pair", turn.twoAnswers);
}

/** 회화 카드의 글 조각. id(노리는 단어 · 오늘 쓸 말 단어) · 그림 키 · 열거 값은 내지 않는다. */
export function textsOfTalkCard(card: TalkCard, prefix = ""): TextFragment[] {
  const sink = fragmentSink();
  const at = (key: string) => joinPath(prefix, key);
  sink.one(at("topic"), "ko", card.topic);
  sink.all(at("targetExpressions"), "expression", card.targetExpressions);
  if ("questions" in card.greeting) {
    card.greeting.questions.forEach((turn, i) => {
      greetingTurnTexts(sink, at(`greeting.questions.${i}`), turn);
    });
  } else {
    lineTexts(sink, at("greeting.firstLine"), card.greeting.firstLine);
  }
  card.todayWords.forEach((word, i) => {
    sink.one(at(`todayWords.${i}.meaningKo`), "ko", word.meaningKo);
    sink.one(at(`todayWords.${i}.example`), "example", word.example);
    sink.one(at(`todayWords.${i}.exampleKo`), "ko", word.exampleKo);
  });
  sink.one(at("firstQuestion"), "tori", card.firstQuestion);
  sink.all(at("flow"), "flow", card.flow);
  sink.all(at("todayTopicsKo"), "ko", card.todayTopicsKo);
  card.closingLines.forEach((line, i) => {
    lineTexts(sink, at(`closingLines.${i}`), line);
  });
  card.safeLines.forEach((line, i) => {
    lineTexts(sink, at(`safeLines.${i}`), line);
  });
  sink.one(at("endCondition"), "ko", card.endCondition);
  card.missions?.forEach((mission, i) => {
    sink.one(at(`missions.${i}.ko`), "ko", mission.ko);
    sink.one(at(`missions.${i}.en`), "prompt", mission.en);
  });
  lineTexts(sink, at("farewell"), card.farewell);
  lineTexts(sink, at("safetyFarewell"), card.safetyFarewell);
  sink.all(at("praiseLines"), "tori", card.praiseLines);
  card.turns?.forEach((turn, i) => {
    greetingTurnTexts(sink, at(`turns.${i}`), turn);
  });
  card.moreTalk?.forEach((turn, i) => {
    greetingTurnTexts(sink, at(`moreTalk.${i}`), turn);
  });
  card.questions?.forEach((question, i) => {
    const q = at(`questions.${i}`);
    sink.one(joinPath(q, "en"), "tori", question.en);
    sink.one(joinPath(q, "ko"), "ko", question.ko);
    sink.one(joinPath(q, "hintKo"), "ko", question.hintKo);
    sink.all(joinPath(q, "hintTiers"), "hint", question.hintTiers);
    sink.all(joinPath(q, "usablePhrases"), "hint", question.usablePhrases);
    sink.one(joinPath(q, "answerExample"), "child", question.answerExample);
  });
  return sink.out;
}

/** 회화 평가 카드 장의 글 조각. 품사 · 연결 단원은 내지 않는다. */
export function textsOfTalkTestSheet(
  sheet: TalkTestSheet,
  prefix = "",
): TextFragment[] {
  const sink = fragmentSink();
  const at = (key: string) => joinPath(prefix, key);
  lineTexts(sink, at("firstLine"), sheet.firstLine);
  sheet.turns.forEach((turn, i) => {
    const t = at(`turns.${i}`);
    sink.one(joinPath(t, "question.en"), "tori", turn.question.en);
    sink.one(joinPath(t, "question.ko"), "ko", turn.question.ko);
    turn.allowed.forEach((answer, j) => {
      sink.one(joinPath(t, `allowed.${j}.text`), "child", answer.text);
    });
    sink.one(joinPath(t, "childKo"), "ko", turn.childKo);
    sink.one(joinPath(t, "frameEn"), "hint", turn.frameEn);
    sink.one(joinPath(t, "sentenceEn"), "child", turn.sentenceEn);
  });
  return sink.out;
}

// 회화 대화 시나리오 카드 · 회화 평가 카드 장의 Zod 규격(6.3 회화 카드 행 · 6.4, C189 새 꼴 — 회화 plan 묶음 3 · 12).
// 카드 꼴은 하나다(목표 · 오늘 쓸 말 · 짧은 준비 · 필수 질문 · 더 이야기할 거리 · 미션 · 역할 바꾸기). 옛 꼴(C189 앞 turns · moreTalk ·
// questions)의 규격은 묶음 12 가 지웠고, talkCardKindOf 는 옛 꼴에만 있던 칸으로 옛 꼴 카드를 알아본다(시드 검증기의 까닭 한 줄 ·
// 개발 DB 의 옛 개정 세션 닫기). 단계에 맞는 칸이 있는지는 칸 검사(check-talk)가 level_specs 회화 칸으로 본다.
// 회화 수업(수업 겉 + card)은 수업 파일과 함께 lesson.ts 에 둔다(lesson.ts 가 이 파일을 가져오므로 반대 방향은 순환이 된다).
import { z } from "zod";
import {
  ImageKeySchema,
  seedVersionShape,
  Text,
  uniqueStrings,
  WordIdSchema,
} from "@/core/seed/schema/reference";
import {
  ASK_KINDS,
  BLANK,
  fragmentSink,
  joinPath,
  SLOT_POS,
  TALK_FIRST_FORMS,
  TALK_GREETING_TURNS,
  type TextFragment,
  UNITS_PER_LEVEL,
} from "@/core/seed/structure";

/** 대사 한 줄. 1~4단계는 한국어 뜻(반말)을 둔다(6.3, 검사는 P4c). */
export const LineSchema = z.strictObject({ en: Text, ko: Text.optional() });
export type Line = z.infer<typeof LineSchema>;

// ── 새 꼴 카드(6.3 회화 카드 행, C189) ─────────────────────────

/** 목표 ID 목록(하나 이상, 겹침 없음). ID 꼴 · 단원 목표 대조 · 카드 goals 안인지는 칸 검사(check-talk talk-goals)가 본다. */
const GoalIdsSchema = uniqueStrings(Text).min(1);
/** 요구 능력(핵심 능력 코드 하나 이상, 첫 값이 주된 요구 능력). 목표가 여럿이면 칸 검사가 필수로 본다(6.4 회화 카드 목표). */
const DemandsSchema = z.array(Text).min(1);

/** 1~3단계 인사 질문 한 턴(새 꼴 — 1단계 인사 질문의 답 두 개 칸은 없앴다, C189). */
export const TalkGreetingQuestionSchema = z.strictObject({
  question: z.strictObject({ en: Text, ko: Text }),
  hintKo: Text,
  hintEn: Text,
  /** 3단계 영어 틀(C31). */
  frameEn: Text.optional(),
  answerExample: Text,
  imageKey: ImageKeySchema.optional(),
});
export type TalkGreetingQuestion = z.infer<typeof TalkGreetingQuestionSchema>;

/** 오늘 쓸 말 한 낱말(새 단어마다). 짧은 준비 · 꺼내기 · 바닥선 듣기 활동이 읽는다(6.3). */
export const TalkTodayWordSchema = z.strictObject({
  word: WordIdSchema,
  meaningKo: Text,
  example: Text,
  /** 그림 키(있으면, 1~3단계 쪽지 · 꺼내기 그림). */
  imageKey: ImageKeySchema.optional(),
  /** 들려줄 짧은 말(1~3단계는 'An apple.' 꼴, 4단계부터 예문). 선생님이 읽고 아이가 한 번 따라 말한다. */
  modelLine: Text,
});
export type TalkTodayWord = z.infer<typeof TalkTodayWordSchema>;

/** 필수 질문 · 더 이야기할 거리가 함께 쓰는 칸(6.3 '필수 질문과 같은 칸에서 첫 꼴을 뺀다'). */
const talkItemShape = {
  /** 번호(1부터, 그 목록 안 차례 그대로). 회화 턴 출력의 카드 항목(card_item.no)이 가리킨다. */
  no: z.int().min(1),
  /** 질문(영어). */
  en: Text,
  /** 질문의 한국어 뜻(1~4단계, 칸 검사가 단계 규격 koMeaning 으로 본다). */
  ko: Text.optional(),
  /** 노리는 단원 단어 1~2(수 · 단원 단어인지는 칸 검사). */
  targets: z.array(WordIdSchema),
  /** 노리는 목표 ID(카드 goals 안). */
  goals: GoalIdsSchema,
  demands: DemandsSchema.optional(),
  /** 상황 · 목적 꼬리표(비면 카드 purpose, 그것도 비면 목표 home). */
  purpose: Text.optional(),
  /** 처음 묻는 턴 · 다시 묻는 턴(C2). 더 이야기할 거리는 모두 다시(칸 검사). */
  ask: z.enum(ASK_KINDS),
  /** 한국어 뜻 힌트. */
  hintKo: Text,
  /** 영어 힌트 단(단계 규격 hintTiers 의 ko 밖 차례 그대로 — 3단계는 [영어 틀, 영어 문장]). */
  hints: z.array(Text),
  answerExample: Text,
  /** 받침 둘째의 쉬운 질문(물음표로 끝남 · 그 질문과 정규화한 글이 다름, 1~4단계 한국어 뜻 — 13절 C194 (2)). */
  easyQuestion: z.strictObject({ en: Text, ko: Text.optional() }),
  /** 1~3단계 그림 키. */
  imageKey: ImageKeySchema.optional(),
  /** 5~6단계 쓸 수 있는 말. */
  usablePhrases: z.array(Text).optional(),
};
/** 필수 질문 한 줄(6.3, C181 · C188 — 카드가 준비하는 기회이고 수업 완료 조건이 아니다). 첫 필수 질문이 대화 첫 질문이다. */
export const TalkRequiredSchema = z.strictObject({
  ...talkItemShape,
  /** 1단계 처음 묻는 턴의 첫 꼴(그냥 · 선택지 · 꺼내기). 다른 단계 · 다시 묻는 턴에는 없다. */
  firstForm: z.enum(TALK_FIRST_FORMS).optional(),
  /** 1단계 첫 꼴이 선택지일 때의 선택지 둘(같은 꼴 · 하나는 노리는 단어). */
  choices: z.tuple([Text, Text]).optional(),
});
export type TalkRequired = z.infer<typeof TalkRequiredSchema>;
/**
 * 1~3단계 장면 여는 질문(C206 · 02-2:200 · 06:186). 장면 말 한 문장과 예 · 아니요 질문 하나이고 노리는 단원 단어가 없으며 필수 질문이
 * 아니다. 받침 칸은 필수 질문을 따른다: 질문(영어 · 뜻) · 한국어 뜻 힌트 · 영어 문장 힌트 · 영어 틀(3단계) · 답 예시 · 쉬운 질문(1단계는
 * 선택지 둘). 카드의 선택 칸이다 — '1~3단계 새 꼴 카드의 필수'는 검증기(check-talk)가 보고, Zod 필수로 두면 DB 의 개정 4 카드가
 * talkCardKindOf 에서 틀림이 되어 세션이 닫힌다('AI 몫 넓힘' plan 정한 것 3). 칸이 없는 카드는 첫 필수 질문으로 시작한다.
 */
export const TalkSceneOpenerSchema = z.strictObject({
  question: z.strictObject({ en: Text, ko: Text.optional() }),
  hintKo: Text,
  hintEn: Text,
  /** 3단계 영어 틀. */
  frameEn: Text.optional(),
  answerExample: Text,
  /** 받침 둘째의 쉬운 질문(물음표로 끝남 · 장면 여는 질문과 정규화한 글이 다름 — 검사는 check-talk). */
  easyQuestion: z.strictObject({ en: Text, ko: Text.optional() }),
  /** 1단계 쉬운 질문의 선택지 둘(같은 꼴에 낱말 하나만 다름). */
  choices: z.tuple([Text, Text]).optional(),
});
export type TalkSceneOpener = z.infer<typeof TalkSceneOpenerSchema>;
/** 더 이야기할 거리 한 줄(다시 묻는 질문, 모든 단계). */
export const TalkMoreSchema = z.strictObject(talkItemShape);
export type TalkMore = z.infer<typeof TalkMoreSchema>;

/** 미션 하나(5~7단계): 글(ko · en) · 목표 ID · 요구 능력(목표가 여럿이면). */
export const TalkMissionSchema = z.strictObject({
  ko: Text,
  en: Text,
  goals: GoalIdsSchema,
  demands: DemandsSchema.optional(),
  purpose: Text.optional(),
});
export type TalkMission = z.infer<typeof TalkMissionSchema>;

/** 역할 바꾸기(5~7단계, 선택적 확장): 선생님 첫 말 · 아이 쪽 힌트 하나 · purpose. 목표 ID 는 두지 않는다(3.3 승인 바). */
export const TalkRoleSwapSchema = z.strictObject({
  firstLine: Text,
  hint: Text,
  purpose: Text,
});
export type TalkRoleSwap = z.infer<typeof TalkRoleSwapSchema>;

/**
 * 새 꼴 회화 카드(6.3 회화 카드 행, C189). 그대로인 칸에 학습 목표 · 오늘 쓸 말(그림 키 · 들려줄 말) · 짧은 준비 낱말 · 필수 질문 ·
 * 더 이야기할 거리 · 미션 · 역할 바꾸기를 더했다. 옛 칸(turns · moreTalk · questions · firstQuestion · 말해 보기 예문 뜻 · 1단계 인사 답 두 개)은
 * 모르는 키라 거부된다(AC-15m).
 */
export const TalkCardSchema = z.strictObject({
  topic: Text,
  targetExpressions: z.array(Text).min(1),
  /** 학습 목표: 이 카드가 기회를 준비하는 단원 목표 ID(단원 규격 goals 의 id). */
  goals: GoalIdsSchema,
  /** 카드의 상황 · 목적 꼬리표(비면 목표 home). */
  purpose: Text.optional(),
  greetingTurns: z
    .int()
    .min(TALK_GREETING_TURNS.min)
    .max(TALK_GREETING_TURNS.max),
  /** 1~3단계 인사 질문, 4단계부터 선생님의 첫 말. */
  greeting: z.union([
    z.strictObject({ questions: z.array(TalkGreetingQuestionSchema).min(1) }),
    z.strictObject({ firstLine: LineSchema }),
  ]),
  todayWords: z.array(TalkTodayWordSchema),
  /** 짧은 준비 낱말(배정 수업, 오늘 쓸 말 가운데 talk.prep_words.<구간> 개와 그 차례). 다지기 · 보강은 비우고 앱이 고른다. */
  prep: uniqueStrings(WordIdSchema).optional(),
  /** 1~3단계 장면 여는 질문(C206, 선택 칸 — 위 TalkSceneOpenerSchema). 4단계부터는 없다. */
  sceneOpener: TalkSceneOpenerSchema.optional(),
  required: z.array(TalkRequiredSchema).min(1),
  more: z.array(TalkMoreSchema),
  /** 예상 흐름(영어, 'The teacher asks …' 꼴 — 필수 질문을 꺼내기 좋은 이야기 흐름의 예). */
  flow: z.array(Text).min(1),
  /** 옆 칸에 보일 오늘 이야기 목록(한국어). */
  todayTopicsKo: z.array(Text),
  closingLines: z.array(LineSchema).min(1),
  safeLines: z.array(LineSchema).min(1),
  endCondition: Text,
  missions: z.array(TalkMissionSchema).optional(),
  roleSwap: TalkRoleSwapSchema.optional(),
  farewell: LineSchema,
  /** '새 이야기로 이어 가자' 끝인사(안전 상한용). */
  safetyFarewell: LineSchema,
  praiseLines: z.array(Text).min(1),
});
export type TalkCard = z.infer<typeof TalkCardSchema>;

// ── 꼴 가르기(회화 plan 정한 것 1 · 2) ─────────

/** 카드 꼴: 새 꼴 · 옛 꼴(C189 앞) · 틀림. */
export type TalkCardKind = "new" | "old" | "invalid";

/** 옛 꼴 카드에만 있던 칸(firstQuestion 은 옛 꼴의 필수 칸, turns · moreTalk 는 1~3단계, questions 는 4단계부터). */
const OLD_TALK_CARD_KEYS = [
  "firstQuestion",
  "turns",
  "moreTalk",
  "questions",
] as const;

/** 카드 꼴 가르기(순수 함수). 새 꼴 규격에 맞으면 새 꼴, 아니고 옛 꼴에만 있던 칸이 있으면 옛 꼴, 둘 다 아니면 틀림이다. */
export function talkCardKindOf(card: unknown): TalkCardKind {
  if (TalkCardSchema.safeParse(card).success) return "new";
  if (
    typeof card === "object" &&
    card !== null &&
    OLD_TALK_CARD_KEYS.some((key) => key in card)
  )
    return "old";
  return "invalid";
}

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

function greetingQuestionTexts(
  sink: Sink,
  path: string,
  turn: TalkGreetingQuestion,
): void {
  sink.one(joinPath(path, "question.en"), "tori", turn.question.en);
  sink.one(joinPath(path, "question.ko"), "ko", turn.question.ko);
  sink.one(joinPath(path, "hintKo"), "ko", turn.hintKo);
  sink.one(joinPath(path, "hintEn"), "hint", turn.hintEn);
  sink.one(joinPath(path, "frameEn"), "hint", turn.frameEn);
  sink.one(joinPath(path, "answerExample"), "child", turn.answerExample);
}

function sceneOpenerTexts(
  sink: Sink,
  path: string,
  opener: TalkSceneOpener,
): void {
  sink.one(joinPath(path, "question.en"), "tori", opener.question.en);
  sink.one(joinPath(path, "question.ko"), "ko", opener.question.ko);
  sink.one(joinPath(path, "hintKo"), "ko", opener.hintKo);
  sink.one(joinPath(path, "hintEn"), "hint", opener.hintEn);
  sink.one(joinPath(path, "frameEn"), "hint", opener.frameEn);
  sink.one(joinPath(path, "answerExample"), "child", opener.answerExample);
  sink.one(joinPath(path, "easyQuestion.en"), "tori", opener.easyQuestion.en);
  sink.one(joinPath(path, "easyQuestion.ko"), "ko", opener.easyQuestion.ko);
  sink.all(joinPath(path, "choices"), "pair", opener.choices);
}

function itemTexts(
  sink: Sink,
  path: string,
  item: TalkRequired | TalkMore,
): void {
  sink.one(joinPath(path, "en"), "tori", item.en);
  sink.one(joinPath(path, "ko"), "ko", item.ko);
  sink.one(joinPath(path, "hintKo"), "ko", item.hintKo);
  sink.all(joinPath(path, "hints"), "hint", item.hints);
  sink.one(joinPath(path, "answerExample"), "child", item.answerExample);
  sink.one(joinPath(path, "easyQuestion.en"), "tori", item.easyQuestion.en);
  sink.one(joinPath(path, "easyQuestion.ko"), "ko", item.easyQuestion.ko);
  sink.all(joinPath(path, "usablePhrases"), "hint", item.usablePhrases);
  if ("choices" in item)
    sink.all(joinPath(path, "choices"), "pair", item.choices);
}

/**
 * 새 꼴 회화 카드의 글 조각. id(노리는 단어 · 오늘 쓸 말 단어 · 짧은 준비 낱말 · 목표 ID) · 그림 키 · 열거 값 · 꼬리표(purpose ·
 * demands)는 내지 않는다. 들려줄 말은 role example(영어 범위 검사 안 · 어휘 배정 세기 밖), 쉬운 질문은 tori, 선택지는 pair,
 * 역할 바꾸기 첫 말은 tori · 힌트는 hint 다. 장면 여는 질문(있으면)은 필수 질문과 같은 역할로 sceneOpener.* 경로에 낸다.
 */
export function textsOfTalkCard(card: TalkCard, prefix = ""): TextFragment[] {
  const sink = fragmentSink();
  const at = (key: string) => joinPath(prefix, key);
  sink.one(at("topic"), "ko", card.topic);
  sink.all(at("targetExpressions"), "expression", card.targetExpressions);
  if ("questions" in card.greeting) {
    card.greeting.questions.forEach((turn, i) => {
      greetingQuestionTexts(sink, at(`greeting.questions.${i}`), turn);
    });
  } else {
    lineTexts(sink, at("greeting.firstLine"), card.greeting.firstLine);
  }
  card.todayWords.forEach((word, i) => {
    sink.one(at(`todayWords.${i}.meaningKo`), "ko", word.meaningKo);
    sink.one(at(`todayWords.${i}.example`), "example", word.example);
    sink.one(at(`todayWords.${i}.modelLine`), "example", word.modelLine);
  });
  if (card.sceneOpener) {
    sceneOpenerTexts(sink, at("sceneOpener"), card.sceneOpener);
  }
  card.required.forEach((item, i) => {
    itemTexts(sink, at(`required.${i}`), item);
  });
  card.more.forEach((item, i) => {
    itemTexts(sink, at(`more.${i}`), item);
  });
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
  if (card.roleSwap) {
    sink.one(at("roleSwap.firstLine"), "tori", card.roleSwap.firstLine);
    sink.one(at("roleSwap.hint"), "hint", card.roleSwap.hint);
  }
  lineTexts(sink, at("farewell"), card.farewell);
  lineTexts(sink, at("safetyFarewell"), card.safetyFarewell);
  sink.all(at("praiseLines"), "tori", card.praiseLines);
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

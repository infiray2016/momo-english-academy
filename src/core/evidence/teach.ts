// 가르치는 수업(1~3단계 앱 채점 활동) 시도의 수행 근거 값(plan 2026-10-29 가르치고 배우는 수업 바 · 정한 것 9 · '이름' 절 근거 칸 표,
// 델타 spec 설계 8 · 9 · 10, 평가 spec 5판 3절 · 정본 04 '수행 근거 칸' · 02-3 3.8, 정본 15절 AC-22e · 22g · 22h · 22j · 22k).
// DB · 시계 없는 순수 함수다. 시도 꼴 판 2 의 사실(자리 · 도움 · 가른 묶음 · 의사소통 정답 · 표현 수행 · 이야기 다시 듣기 · 소리 없음 ·
// 읽기 도움)을 근거 칸 값으로 바꾼다. attempts.evidence 열과 기록 함수 · 근거 상태(수준) 함수는 평가 plan(P12 앞머리) 몫이다. 열이 먼저
// 생기면 서버 저장 길이 끝 시도와 함께 이 값을 쓰고, 늦으면 평가 plan 의 채움 함수가 원문이 남은 시도 꼴에서 이 함수로 채운다.
//
// 근거 칸에는 수준 값이 없다. 의사소통 정답(acceptedMeaning 으로 갈린 답)은 정확도 '부분'과 communicative 표시 · 가른 묶음 · 표현
// 수행 여부를 남기고(판정 그대로의 맞음은 result.judge), 그 수준(평가 spec [승인 A9], 잠정 · 요청자 확인 대기, C182 (3))은 근거 상태 함수가 '잠정 A9' 규칙으로만 계산한다.
// 그래서 A9 확정 전에는 운영 판정 입력에 의사소통 정답의 수준 값이 생기지 않는다. 값은 단원 단어 원형 · 시드 키 · 열거 값 · 수뿐이고
// 원문 · 인식 글 · 이름 · 소리가 없다(NFR-15).
//
// 한 근거 칸은 끝 시도 행 하나다. 혼자 문항의 첫 시도가 독립 시도이고, '왜' 뒤 같은 문제 다시(읽기 · 쓰기 · 듣기 retry_after_answer,
// 말하기 질문 '같이 말해 볼까요' 뒤 echo, 따라 말하기 끊어 들은 뒤 model_heard)는 같은 칸의 retry(도움받은 시도)다. 짝 첫 시도는 새 칸이고(retry 없음)
// task · goals 는 짝을 둔 혼자 문항과 같으며 ctx.item 은 짝 키, ctx.example 은 짝 자극이다. 같이 해 보기는 validity practice(기회 아님)다.
import { type Answer, checkAnswer } from "@/core/answer/check";
import { metWordsIn } from "@/core/conversation/said";
import type { GoalRef, LessonOf } from "@/core/seed/schema/lesson";
import {
  type AttemptInput,
  inputFitsActivity,
  type OutcomeContext,
  questionJudgeContextOf,
} from "@/core/session/attempt";
import type { Activity } from "@/core/session/preview";
import { togetherOutcomeOf } from "@/core/session/spare-outcome";
import {
  type JudgeableQuestion,
  judgeAppAnswer,
  judgeableQuestion,
  judgeSpeakingQuestion,
  type SpeakingQuestionJudge,
} from "@/core/speaking/judge";
import { bestMatchRate } from "@/core/speech/match-rate";
import { writingWhyOf } from "@/core/writing/why";

// ── 근거 칸 값(정본 04 '수행 근거 칸' 값 이름 그대로) ──

/** 도움 목록 값(정본 04 assist). */
export type EvidenceAssist =
  | "none"
  | "choices"
  | "model_shown"
  | "model_heard"
  | "retry_after_answer"
  | "echo"
  | "together"
  | "hint_meaning"
  | "hint_english"
  | "two_answers"
  | "answer_example"
  | "ko_help"
  | "read_aloud"
  | "gloss";
/** 아이가 쓴 단원 단어마다의 노출(정본 04 exposure). */
export type EvidenceExposure =
  | "answer_exposed"
  | "choice"
  | "question_word"
  | "none";
/** 정확도(정답 · 부분 · 오답 · 무응답). */
export type EvidenceAccuracy = "correct" | "partial" | "wrong" | "no_answer";
/**
 * 기술 오류 종류(정본 04 validity technical). speak_fail 은 7절 '들려주지 못함'의 읽어 주기 실패(시도 꼴 techError 와 같은 이름 — 정본이
 * 코드 이름을 plan 에 맡김).
 */
export type EvidenceTechnical =
  | "recognition"
  | "no_mic"
  | "nospeech"
  | "ai_fail"
  | "ai_rest"
  | "network"
  | "speak_fail";
export type EvidenceValidity =
  | "valid"
  | "practice"
  | "dont_know"
  | "stuck"
  | { technical: EvidenceTechnical };
/** 값의 출처: 서버가 확인한 값 · 기기가 보낸 값(정본 04 '입력의 출처와 서버 확인 범위'). */
export type EvidenceSource = "server" | "device";

/** 원 결과(판정 그대로). 수준 값은 두지 않는다. */
export type EvidenceResult = {
  /** 고른 보기 · 카드 · 쓴 답의 첫 시도 정오. */
  correct?: boolean;
  /** 따라 말하기 첫 시도 일치율. */
  rate?: number;
  /** 말하기 질문 합친 판정(맞음 · 부분 · 다시). */
  judge?: SpeakingQuestionJudge["final"];
  /** AI 원 판정(혼자 질문만). */
  ai?: SpeakingQuestionJudge["ai"];
  /** 가른 묶음(accepted · acceptedMeaning). */
  bundle?: SpeakingQuestionJudge["bundle"];
  /** 의사소통 정답 표시(acceptedMeaning 으로 갈린 맞음). */
  communicative?: true;
  /** 표현 수행(accepted 쪽 맞음일 때만 참). */
  expressionDone?: boolean;
};

/** 같은 근거 칸의 도움받은 시도('왜' 뒤 같은 문제 다시). */
export type EvidenceRetry = {
  assist: EvidenceAssist[];
  accuracy: EvidenceAccuracy;
};

/** 가르치는 수업 시도 하나의 근거 칸(평가 spec 3절 값 · plan 이름 표). purpose 는 비운다(home). */
export type TeachEvidence = {
  /** 과제 유형 코드(시드 문항 type, 따라 말하기 repeat · 듣기 listening · 질문 question). */
  task: string;
  /** 이어진 목표 ID 목록(문항 goal — 하나도 목록, 목표마다 나누지 않는다). 정의 전이면 빈 목록. */
  goals: string[];
  /** 노린 단원 단어 원형(문항 정답에 든 단원 단어). */
  words: string[];
  /** 첫 시도의 도움(없으면 ["none"]). */
  assist: EvidenceAssist[];
  /** 아이가 쓴 단원 단어마다의 노출(말하기 질문 답만 — 질문 글에 있으면 question_word, 없으면 none). */
  exposure: Record<string, EvidenceExposure>;
  /** 첫 시도의 정확도. */
  accuracy: EvidenceAccuracy;
  /** '왜' 뒤 같은 문제 다시(같은 칸의 도움받은 시도). 없으면 칸이 없다. */
  retry?: EvidenceRetry;
  result: EvidenceResult;
  validity: EvidenceValidity;
  /** item: 문항 키(시드 행 id + 문항 자리, 짝은 짝 키), example: 자극 키(지문 · 이야기 · 대본 · 짝 글). */
  ctx: { item: string; example: string };
  source: {
    assist: EvidenceSource;
    accuracy: EvidenceSource;
    validity: EvidenceSource;
  };
};

/**
 * 채점 맥락(OutcomeContext) + 따라 말하기 정확도 경계. matchCut 은 평가 spec 8절 evidence.match_cut([부분 경계, 정답 경계])이고 부르는
 * 쪽이 설정에서 읽어 넘긴다.
 */
export type TeachEvidenceContext = OutcomeContext & {
  matchCut: readonly [number, number];
};

type AppLesson = LessonOf["reading" | "writing" | "speaking"];

export type TeachEvidenceInput = {
  /** 시드 행 id(ctx.item 의 머리 — 부르는 쪽이 수업 행 키를 넘긴다). */
  lessonKey: string;
  lesson: AppLesson;
  activity: Activity;
  /** 그 활동의 끝 시도. */
  input: AttemptInput;
  ctx: TeachEvidenceContext;
};

// ── 수업 내용 읽기(시드 꼴 그대로, 칸이 없으면 undefined) ──

type ChoiceItem = {
  kind?: "picture" | "text";
  type?: string;
  options?: readonly string[];
  answerNo: number;
  goal?: GoalRef;
  storyEn?: string;
};
type WritingItem = Parameters<typeof checkAnswer>[0] & {
  type: string;
  goal?: GoalRef;
  whyKo?: string;
  picture?: string;
  word?: string;
  accepted: readonly string[];
};
type QuestionItem = JudgeableQuestion & { goal?: GoalRef; storyEn?: string };
type Content = Partial<{
  passage: string;
  questions: readonly (ChoiceItem &
    QuestionItem & { spare?: ChoiceItem & QuestionItem })[];
  items: readonly (WritingItem & { spare?: WritingItem })[];
  listening: readonly (ChoiceItem & { spare?: ChoiceItem })[];
  repeat: {
    words: readonly string[];
    sentences: readonly string[];
    goal?: GoalRef;
    spares?: { words: readonly string[]; sentences: readonly string[] };
  };
}>;

const goalsOf = (ref: GoalRef | undefined): string[] =>
  ref === undefined ? [] : typeof ref === "string" ? [ref] : [...ref];

const texts = (heard: readonly string[]) =>
  heard.filter((h) => h.trim() !== "");

const skippedOf = (input: AttemptInput): string | undefined =>
  "skipped" in input ? input.skipped : undefined;

/** 건너뛴 까닭 → 정본 04 기술 오류 이름(silent 는 말소리 없음, stalled 는 인식 감시 타이머 멈춤). */
const TECHNICAL_OF_SKIP: Readonly<Record<string, EvidenceTechnical>> = {
  recognition: "recognition",
  stalled: "recognition",
  no_mic: "no_mic",
  silent: "nospeech",
  ai_rest: "ai_rest",
};

/** 기기가 알린 기술 오류(소리를 들려주지 못함 · 건너뜀). 없으면 undefined. */
function deviceTechnical(input: AttemptInput): EvidenceTechnical | undefined {
  if ("techError" in input && input.techError !== undefined)
    return input.techError;
  const skipped = skippedOf(input);
  return skipped === undefined ? undefined : TECHNICAL_OF_SKIP[skipped];
}

const choiceAccuracy = (
  tried: number | undefined,
  answerNo: number,
): EvidenceAccuracy =>
  tried === undefined ? "no_answer" : tried === answerNo ? "correct" : "wrong";

/** 쓰기 1~3 답의 정확도: 정답, 낱말 · 차례가 맞고 대문자 · 마침표만 다르면 부분(설계 8 · 평가 spec A1), 그 밖 오답. */
function writingAccuracy(
  item: WritingItem,
  answer: Answer | undefined,
  ctx: TeachEvidenceContext,
): EvidenceAccuracy {
  if (answer === undefined) return "no_answer";
  if (checkAnswer(item, answer, { homophones: ctx.homophones }).correct)
    return "correct";
  const why = writingWhyOf(item, answer);
  return why?.reason === "capital" || why?.reason === "period"
    ? "partial"
    : "wrong";
}

/** 따라 말하기 일치율 → 정확도(matchCut 둘째 값 이상 정답, 첫째 값 이상 부분). */
function repeatRate(target: string, heard: string, ctx: TeachEvidenceContext) {
  return bestMatchRate([target], heard, {
    homophones: ctx.homophones,
    nameSlot: "any-word",
  });
}
const rateAccuracy = (
  rate: number,
  ctx: TeachEvidenceContext,
): EvidenceAccuracy =>
  rate >= ctx.matchCut[1]
    ? "correct"
    : rate >= ctx.matchCut[0]
      ? "partial"
      : "wrong";

/**
 * 말하기 질문 판정 하나의 정확도. 의사소통 정답(communicative — acceptedMeaning 으로 갈린 맞음)은 판정이 맞음이어도 정확도 '부분'이다
 * (정본 3.8 A1 표 · [승인 A9] · 정본 04 accuracy 칸). C182 (3)이 막는 것은 그 수준 값의 운영 반영뿐이라, A9 가 확정되어도 이 값은 그대로이고
 * 근거 상태 함수의 수준 값만 바뀐다. 판정 그대로의 맞음은 result.judge 에 남는다.
 */
const judgedAccuracy = (judge: SpeakingQuestionJudge): EvidenceAccuracy =>
  judge.communicative ? "partial" : judgeAccuracy(judge.final);

const judgeAccuracy = (
  final: SpeakingQuestionJudge["final"],
): EvidenceAccuracy =>
  final === "correct" ? "correct" : final === "partial" ? "partial" : "wrong";

/** 말하기 질문 판정의 원 결과(의사소통 정답도 판정 그대로 — 맞음 + communicative). */
function judgeResult(judge: SpeakingQuestionJudge): EvidenceResult {
  return {
    judge: judge.final,
    ...(judge.ai === undefined ? {} : { ai: judge.ai }),
    ...(judge.bundle === undefined ? {} : { bundle: judge.bundle }),
    ...(judge.communicative ? { communicative: true as const } : {}),
    expressionDone: judge.expressionDone,
  };
}

/** 앱이 판정하는 말(짝 · 같이 해 보기 · 1~2단계 질문 · echo) 하나의 판정. 허용 답이 없으면 undefined. */
function appJudge(
  item: QuestionItem,
  heard: string,
  ctx: TeachEvidenceContext,
): SpeakingQuestionJudge | undefined {
  if (!judgeableQuestion(item)) return undefined;
  return judgeSpeakingQuestion(item, heard, questionJudgeContextOf(ctx));
}

const unitWordsIn = (text: string | undefined, ctx: TeachEvidenceContext) =>
  text === undefined ? [] : metWordsIn(text, ctx);

/**
 * 말하기 질문 답의 노출(평가 spec 3절 '노출 판정' · 설계 8): 아이가 쓴 단원 단어가 질문 글에 있으면 question_word, 없으면 none. 질문 앞
 * 이야기는 노출 판정 밖이다(이야기에만 있는 낱말은 none, C175 (3)). 견줌은 '말했다'와 같은 정규화(동음이의어 묶음 없음)다.
 */
function questionExposure(
  question: string,
  heard: string | undefined,
  ctx: TeachEvidenceContext,
): Record<string, EvidenceExposure> {
  const inQuestion = new Set(unitWordsIn(question, ctx));
  const out: Record<string, EvidenceExposure> = {};
  for (const word of unitWordsIn(heard, ctx))
    out[word] = inQuestion.has(word) ? "question_word" : "none";
  return out;
}

// ── 활동별 사실 ──

type Facts = {
  task: string;
  goals: string[];
  words: string[];
  assist: EvidenceAssist[];
  assistFrom: EvidenceSource;
  exposure: Record<string, EvidenceExposure>;
  accuracy: EvidenceAccuracy;
  retry?: EvidenceRetry;
  result: EvidenceResult;
  /** 판정이 없어 생긴 기술 오류(AI 질문의 판정 칸 없음). */
  technical?: EvidenceTechnical;
  item: string;
  example: string;
};

const NO_ASSIST: EvidenceAssist[] = ["none"];

/** 읽기 첫 답 전 도움(aid — 기기 값): 읽어 주기 read_aloud · 뜻 보기 gloss. 안 썼으면 none(출처는 둘 다 기기). */
function readingAssist(
  input: Extract<AttemptInput, { kind: "reading-question" }>,
): EvidenceAssist[] {
  const list: EvidenceAssist[] = [];
  if (input.aid?.readAloud === true) list.push("read_aloud");
  if ((input.aid?.gloss?.length ?? 0) > 0) list.push("gloss");
  return list.length === 0 ? NO_ASSIST : list;
}

const pictureWord = (item: ChoiceItem): string | undefined =>
  item.kind === "picture" ? item.options?.[item.answerNo - 1] : undefined;

function choiceFacts(
  key: string,
  base: { task: string; goals: string[] },
  item: ChoiceItem,
  tries: readonly number[],
  example: string,
  ctx: TeachEvidenceContext,
): Omit<Facts, "assist" | "assistFrom"> {
  const accuracy = choiceAccuracy(tries[0], item.answerNo);
  const retried = tries[1];
  return {
    ...base,
    words: unitWordsIn(pictureWord(item), ctx),
    exposure: {},
    accuracy,
    ...(retried === undefined
      ? {}
      : {
          retry: {
            assist: ["retry_after_answer"],
            accuracy: choiceAccuracy(retried, item.answerNo),
          },
        }),
    result: tries[0] === undefined ? {} : { correct: accuracy === "correct" },
    item: key,
    example,
  };
}

function writingWords(item: WritingItem, ctx: TeachEvidenceContext): string[] {
  switch (item.type) {
    case "pick-word":
      return unitWordsIn(item.picture, ctx);
    case "assemble-phrase":
    case "assemble-sentence":
      return unitWordsIn(item.accepted[0], ctx);
    default:
      return unitWordsIn(item.word, ctx);
  }
}

/** 짝 활동이면 짝 내용, 아니면 혼자 문항 내용. */
const pick = <T extends { spare?: unknown }>(
  item: T,
  spare: boolean,
): T | NonNullable<T["spare"]> | undefined =>
  spare ? (item.spare as NonNullable<T["spare"]> | undefined) : item;

function factsOf(x: TeachEvidenceInput): Facts | undefined {
  const { lesson, activity, input, ctx } = x;
  const c = lesson.content as Content;
  const isSpare = activity.kind === "spare";
  const kind = activity.kind === "spare" ? activity.base : activity.kind;
  if (!("index" in activity)) return undefined;
  const { index } = activity;
  const soloKey = `${x.lessonKey}:${kind}.${index}`;
  const key = isSpare ? `${soloKey}.spare` : soloKey;

  switch (input.kind) {
    case "reading-question": {
      const q = c.questions?.[index];
      const item = q && pick(q, isSpare);
      if (!q || !item) return undefined;
      const example = isSpare ? `${key}.textEn` : `${x.lessonKey}:passage`;
      return {
        ...choiceFacts(
          key,
          { task: q.type ?? kind, goals: goalsOf(q.goal) },
          item,
          input.tries,
          example,
          ctx,
        ),
        assist: readingAssist(input),
        assistFrom: "device",
      };
    }
    case "listening": {
      const l = c.listening?.[index];
      const item = l && pick(l, isSpare);
      if (!l || !item) return undefined;
      return {
        ...choiceFacts(
          key,
          { task: "listening", goals: goalsOf(l.goal) },
          item,
          input.tries,
          `${key}.script`,
          ctx,
        ),
        assist: NO_ASSIST,
        assistFrom: "server",
      };
    }
    case "writing-item": {
      const w = c.items?.[index];
      const item = w && pick(w, isSpare);
      if (!w || !item) return undefined;
      const accuracy = writingAccuracy(item, input.tries[0], ctx);
      const retried = input.tries[1];
      return {
        task: w.type,
        goals: goalsOf(w.goal),
        words: writingWords(item, ctx),
        assist: NO_ASSIST,
        assistFrom: "server",
        exposure: {},
        accuracy,
        ...(retried === undefined
          ? {}
          : {
              retry: {
                assist: ["retry_after_answer"],
                accuracy: writingAccuracy(item, retried, ctx),
              },
            }),
        result: { correct: accuracy === "correct" },
        item: key,
        example: key,
      };
    }
    case "repeat-word":
    case "repeat-sentence": {
      const r = c.repeat;
      const list = isSpare
        ? kind === "repeat-word"
          ? r?.spares?.words
          : r?.spares?.sentences
        : kind === "repeat-word"
          ? r?.words
          : r?.sentences;
      const target = list?.[index];
      if (!r || target === undefined) return undefined;
      const [first, second] = texts(input.heard);
      const rate =
        first === undefined ? undefined : repeatRate(target, first, ctx);
      return {
        task: "repeat",
        goals: goalsOf(r.goal),
        words: unitWordsIn(target, ctx),
        assist: NO_ASSIST,
        assistFrom: "server",
        exposure: {},
        accuracy: rate === undefined ? "no_answer" : rateAccuracy(rate, ctx),
        ...(second === undefined
          ? {}
          : {
              retry: {
                assist: ["model_heard"],
                accuracy: rateAccuracy(repeatRate(target, second, ctx), ctx),
              },
            }),
        result: rate === undefined ? {} : { rate },
        item: key,
        example: key,
      };
    }
    case "question": {
      const q = c.questions?.[index];
      const item = q && pick(q, isSpare);
      if (!q || !item) return undefined;
      const first = texts(input.heard)[0];
      const asked = { ...item, goal: q.goal } as QuestionItem;
      // 판정: 시도 꼴 judge(서버가 저장 때 쓴 값 — 혼자 질문은 AI 와 합친 판정, 짝은 앱 판정)가 정본이고, 없는 앱 판정 문항(짝 ·
      // 1~2단계)은 같은 함수로 셈한다. AI 판정 혼자 질문에 판정 칸이 없으면 판정이 없는 끝 시도라 기술 오류다
      const appJudged = isSpare || ctx.appJudgedQuestions;
      let judge: SpeakingQuestionJudge | undefined = input.judge;
      let accuracy: EvidenceAccuracy = "no_answer";
      let result: EvidenceResult = {};
      let technical: EvidenceTechnical | undefined;
      if (judge === undefined && first !== undefined && appJudged) {
        judge = appJudge(asked, first, ctx);
        if (judge === undefined) {
          // 허용 답이 없어 의미 검사를 못 하는 질문: 허용 답 일치율만(평가 spec A1 1~2 질문 행 — 문턱 이상 정답, 첫 경계 이상 부분)
          const app = judgeAppAnswer(first, asked.accepted ?? [], {
            pass: ctx.answerMatchPass,
            homophones: ctx.homophones,
          });
          accuracy = app.correct
            ? "correct"
            : app.rate >= ctx.matchCut[0]
              ? "partial"
              : "wrong";
          result = { correct: app.correct };
        }
      }
      if (judge !== undefined) {
        accuracy = judgedAccuracy(judge);
        result = judgeResult(judge);
      } else if (first !== undefined && !appJudged) technical = "ai_fail";
      const echo = input.echo?.trim() ? input.echo : undefined;
      const echoJudge =
        echo === undefined ? undefined : appJudge(asked, echo, ctx);
      return {
        task: "question",
        goals: goalsOf(q.goal),
        words: unitWordsIn(asked.modelAnswer ?? asked.accepted?.[0], ctx),
        assist: NO_ASSIST,
        assistFrom: "server",
        exposure: questionExposure(asked.en, first, ctx),
        accuracy,
        ...(echo === undefined
          ? {}
          : {
              retry: {
                assist: ["echo"],
                accuracy:
                  echoJudge === undefined
                    ? "no_answer"
                    : judgedAccuracy(echoJudge),
              },
            }),
        result,
        ...(technical === undefined ? {} : { technical }),
        item: key,
        example: asked.storyEn === undefined ? key : `${key}.storyEn`,
      };
    }
    default:
      return undefined;
  }
}

/** 같이 해 보기의 사실(연습 — 기회가 아니다). 정확도는 지표 · 되짚기와 같은 첫 시도 판정(togetherOutcomeOf)이다. */
function togetherFacts(x: TeachEvidenceInput): Facts | undefined {
  const { lesson, activity, input, ctx } = x;
  if (activity.kind !== "together" || input.kind !== "together")
    return undefined;
  const item = lesson.teach?.together[activity.index] as
    | (QuestionItem & { type?: string })
    | undefined;
  if (!item) return undefined;
  const outcome = togetherOutcomeOf(activity, lesson, input, ctx);
  const heard = input.tries.find((t) => (t.heard ?? "").trim() !== "")?.heard;
  const key = `${x.lessonKey}:together.${activity.index}`;
  return {
    task: item.type ?? "together",
    goals: [],
    words: [],
    assist: ["together"],
    assistFrom: "server",
    exposure:
      item.type === "question" ? questionExposure(item.en, heard, ctx) : {},
    accuracy:
      outcome === "unscored"
        ? "no_answer"
        : outcome === "wrong"
          ? "wrong"
          : input.judge?.communicative
            ? "partial"
            : "correct",
    result: input.judge === undefined ? {} : judgeResult(input.judge),
    item: key,
    example: key,
  };
}

/**
 * 끝 시도 하나의 근거 칸(가르치는 수업 plan 바 — teachEvidenceOf). 근거 칸이 없는 자리(오늘 배울 것 · 본보기 · 미리보기 · 지문 ·
 * 쓰기 4~12 · 진행 시도)와 활동에 맞지 않는 시도는 undefined.
 */
export function teachEvidenceOf(
  x: TeachEvidenceInput,
): TeachEvidence | undefined {
  const { activity, input } = x;
  if (input.step !== "final" || !inputFitsActivity(activity, input))
    return undefined;
  const practice = activity.kind === "together";
  const facts = practice ? togetherFacts(x) : factsOf(x);
  if (!facts) return undefined;
  const fromDevice = deviceTechnical(input);
  const technical = fromDevice ?? facts.technical;
  const validity: EvidenceValidity = practice
    ? "practice"
    : technical === undefined
      ? "valid"
      : { technical };
  return {
    task: facts.task,
    goals: facts.goals,
    words: facts.words,
    assist: facts.assist,
    exposure: facts.exposure,
    accuracy: facts.accuracy,
    // 짝 행에는 다시 시도를 적지 않는다(정본 3.8 — 짝을 틀리면 그 기회는 0 이고 바른 답 · '왜'를 본 기록만 남는다)
    ...(facts.retry === undefined || activity.kind === "spare"
      ? {}
      : { retry: facts.retry }),
    result: facts.result,
    validity,
    ctx: { item: facts.item, example: facts.example },
    source: {
      assist: facts.assistFrom,
      accuracy: "server",
      validity: fromDevice === undefined ? "server" : "device",
    },
  };
}

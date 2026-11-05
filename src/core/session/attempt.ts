// 시도 꼴 · 앱 채점 활동 결과 · 단어별 정오 · 단어 수 · 이어 할 자리(plan-p11a 파일별 값 2 · 정할 것 다 · 라 · 위험 2 · 3,
// 13절 C38 · C73 · C76 · C77, 3.7 활동 점수, 6.2 앱 채점 · 일치율). DB · 시계 없는 순수 함수다. 화면은 같은 함수로 바로 판정하고
// 서버는 저장 때 수업 내용으로 다시 채점한다(서버 값이 정본). 허용 답 기준(speaking.answer_match_pass)은 부르는 쪽이 넘긴다.
// a 몫 종류(AI 없이 채점하는 활동)에 b 몫(쓰기 4~12, plan-p11b 값 4) 종류를 더했다 — c 가 자기 종류를 더한다.
// AI 결과를 함께 저장하는 끝 시도(쓰기 확인 · 생각 꺼내기 · 초고 · 고쳐 쓰기)는 서버 액션만 저장한다(serverActionOnly).
// 시도 꼴 판 2(가르치고 배우는 수업 plan 나 · 정한 것 2 · 3 · 9): 오늘 배울 것 · 본보기 · 같이 해 보기 꼴, 짝(base 꼴 + slot "spare"),
// 혼자 문항의 선택 칸(읽기 aid · 질문 story · judge · 듣기 · 질문 · 따라 말하기 techError — 값은 다 · 라 · 바 가 채운다). 판 1 시도도 그대로 읽는다.
// 같이 해 보기는 점수 · 단어별 정오가 없고, 짝은 점수 없이 짝 내용의 단어별 정오만 낸다(3.7 · 델타 spec 설계 8 '점수와 셈').
// 말하기 질문 짝 · 같이 해 보기(질문)는 단계와 상관없이 앱이 judgeSpeakingQuestion(의미 검사 → 두 묶음)으로 판정하고, 서버는 저장 때
// 그 판정을 시도 꼴 judge 칸에 다시 써 넣는다(withAppJudge — plan 다, 서버 값이 정본).
import { z } from "zod";
import { type Answer, checkAnswer } from "@/core/answer/check";
import type { LessonOf } from "@/core/seed/schema/lesson";
import type { Area } from "@/core/seed/structure";
import type { Activity } from "@/core/session/preview";
import {
  judgeAppAnswer,
  judgeableQuestion,
  judgeSpeakingQuestion,
  type QuestionJudgeContext,
} from "@/core/speaking/judge";
import type { MeaningWord } from "@/core/speaking/meaning";
import {
  bestMatchRate,
  type MatchOptions,
  matchedTargetWords,
  normalizeForMatch,
} from "@/core/speech/match-rate";

// 시도 입력 상한(기술 값 — 서버 · 기기 대기열이 함께 가져온다)
/** 한 번에 보내고 받는 시도 수. */
export const ATTEMPTS_PER_BATCH_MAX = 50;
/** 시도 입력 JSON 글자 수 상한. */
export const INPUT_JSON_MAX = 4000;
/** 시도 꼴 판(서버 액션이 저장하는 b · c 끝 시도도 같은 판). 판 2 = 가르치는 수업 자리 · 짝 · 선택 칸. */
export const INPUT_VERSION = 2;
/** 판 1(P11 · 판 2 앞 시도 — 기기 대기열 · 저장된 행). 지금 종류는 판 1 도 그대로 읽는다. */
const INPUT_VERSION_1 = 1;

// ── 시도 꼴(attempts.input) ──

const step = z.enum(["final", "progress"]);
/** 판 1 부터 있던 종류의 머리(판 1 · 2 둘 다 읽음). 판 2 에 생긴 칸은 판 2 에서만 받는다(V2_FIELDS). */
const head = <K extends string>(kind: K) => ({
  v: z.union([z.literal(INPUT_VERSION_1), z.literal(INPUT_VERSION)]),
  kind: z.literal(kind),
  step,
});
/** 판 2 에 생긴 종류의 머리(판 2 만). */
const headV2 = <K extends string>(kind: K) => ({
  v: z.literal(INPUT_VERSION),
  kind: z.literal(kind),
  step,
});
/** 판 2 에 생긴 옛 종류의 선택 칸(판 1 시도에 있으면 거부). */
const V2_FIELDS = ["slot", "aid", "story", "judge", "techError"] as const;
/** 짝 시도 표시(정한 것 2 — 짝을 둔 혼자 문항과 같은 꼴에 단다). 없으면 혼자 문항 시도. */
const spareSlot = { slot: z.literal("spare").optional() };
/**
 * 소리를 한 번도 들려주지 못한 채 낸 답 · '다음'(UI · UX spec 2판 R-57 · 묶음 5-나 — 기술 오류 U 문항). 맞고 틀림과 관계없이 활동 점수의
 * 분모 · 분자 · 단어별 정오에서 빼고(R-55 — appActivityResult 가 점수 없음으로 낸다), 짝 고르기 · 지표에서는 U 다. 듣기 문항은 답 없이 '다음'을
 * 누를 수 있어 이 칸이 있으면 고른 보기가 없어도 된다(아래 superRefine).
 */
const techError = { techError: z.literal("speak_fail").optional() };
/** 읽기 혼자 문항 · 짝의 첫 답 전 도움(지문 · 짝 글 읽어 주기 누름 · 뜻을 연 낱말, 델타 spec 설계 9 — 라-2 가 채운다). */
const ReadingAidSchema = z.strictObject({
  readAloud: z.literal(true).optional(),
  gloss: z.array(z.string()).optional(),
});
/**
 * 말하기 질문 · 질문 짝 · 같이 해 보기 판정(plan 이름 표 '말하기 질문 판정' · 정한 것 6 — 다 가 채운다). meaning 은 의미 검사,
 * bundle 은 가른 묶음(accepted · acceptedMeaning), ai 는 AI 원 판정, final 은 합친 판정이다. 의사소통 정답(communicative) ·
 * 표현 수행(expressionDone — accepted 쪽일 때만 참)도 이 칸에 둔다.
 */
export const QuestionJudgeSchema = z.strictObject({
  meaning: z.enum(["ok", "direction", "key", "negated", "wrong_info"]),
  bundle: z.enum(["accepted", "meaning"]).optional(),
  ai: z.enum(["correct", "partial", "retry"]).optional(),
  final: z.enum(["correct", "partial", "retry"]),
  by: z.enum(["app", "ai"]),
  communicative: z.literal(true).optional(),
  expressionDone: z.boolean(),
});
export type QuestionJudge = z.infer<typeof QuestionJudgeSchema>;
/** 같이 해 보기 시도 하나: 고른 보기 번호 · 놓은 카드 · 인식 글 가운데 그 문항 꼴의 것. */
const TogetherTrySchema = z.strictObject({
  choice: z.int().min(1).optional(),
  pieces: z.array(z.string()).optional(),
  heard: z.string().optional(),
});
/** 고른 보기 번호(1부터) — 시도마다 하나, 첫째가 점수. */
const choiceTries = z.array(z.int().min(1)).min(1);
/** 쓰기 1~3 답 조각의 답(P10 Answer 의 choice · tiles · text). 몰라요는 수업에 없다. */
const AnswerTrySchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("choice"), no: z.int().min(1) }),
  z.strictObject({ kind: z.literal("tiles"), pieces: z.array(z.string()) }),
  z.strictObject({ kind: z.literal("text"), text: z.string() }),
]);
/** 말로 답한 활동의 공통 칸: 시도마다 인식 글 · 다시 듣기 갈래 실패 수 · 건너뛴 까닭(7절). */
const spoken = {
  heard: z.array(z.string()),
  failures: z.int().min(0),
  skipped: z.enum(["recognition", "no_mic", "silent", "stalled"]).optional(),
};
/** 질문 답의 건너뛴 까닭: 말로 답한 활동의 까닭 + 'AI 쉬는 중'(ai_rest — 안전 상한 뒤 남은 AI 판정 질문, plan-p11c 값 3). */
const questionSkipped = z
  .enum(["recognition", "no_mic", "silent", "stalled", "ai_rest"])
  .optional();

/** 쓰기 4~5 문장(빈칸을 채운 온 문장 · 쓰던 글은 빈 글도). */
const sentenceList = z.array(z.string()).min(1);
/** 내 문장 말하기(선택 — 점수 없음 · 영어로 말한 문장 수에 안 셈): 인식 글 · 건너뛴 까닭(스스로 · 마이크 없음). */
const ownSpoken = {
  heard: z.array(z.string()).optional(),
  skipped: z.enum(["chose_skip", "no_mic"]).optional(),
};

export const AttemptInputSchema = z
  .discriminatedUnion("kind", [
    // ── 가르치는 수업 자리(판 2) ──
    z.strictObject({ ...headV2("today") }),
    z.strictObject({ ...headV2("model"), index: z.int().min(0) }),
    /** 같이 해 보기(연습 — 점수 · 단어별 정오 · 기회 없음). 맞힐 때까지 시도마다 하나. */
    z.strictObject({
      ...headV2("together"),
      index: z.int().min(0),
      tries: z.array(TogetherTrySchema),
      judge: QuestionJudgeSchema.optional(),
    }),
    z.strictObject({ ...head("preview"), shownWords: z.array(z.string()) }),
    /** 누른 글로서리 낱말의 원형(P12 단어장). */
    z.strictObject({
      ...head("reading-passage"),
      tappedWords: z.array(z.string()),
    }),
    z.strictObject({
      ...head("reading-question"),
      tries: choiceTries,
      ...spareSlot,
      aid: ReadingAidSchema.optional(),
    }),
    /** 듣기 이해. 고른 보기는 하나 이상이고, 기술 오류(techError)로 답 없이 넘긴 끝 시도만 빈 목록이다. */
    z.strictObject({
      ...head("listening"),
      tries: z.array(z.int().min(1)),
      ...spareSlot,
      ...techError,
    }),
    z.strictObject({
      ...head("writing-item"),
      tries: z.array(AnswerTrySchema).min(1),
      ...spareSlot,
    }),
    z.strictObject({
      ...head("repeat-word"),
      ...spoken,
      ...spareSlot,
      ...techError,
    }),
    z.strictObject({
      ...head("repeat-sentence"),
      ...spoken,
      ...spareSlot,
      ...techError,
    }),
    /** 질문 답. echo = '같이 말해 볼까요' 뒤 말, story = 이야기 다시 듣기, judge = 판정(다). */
    z.strictObject({
      ...head("question"),
      ...spoken,
      skipped: questionSkipped,
      echo: z.string().optional(),
      ...spareSlot,
      ...techError,
      story: z.strictObject({ replayed: z.boolean() }).optional(),
      judge: QuestionJudgeSchema.optional(),
    }),
    // ── b: 쓰기 4~5(과제 → 문장 → 내 문장 듣고 따라 말하기) ──
    z.strictObject({ ...head("writing-task") }),
    /** 진행: 쓰던 글(대기열 — 되살리기), 끝: 낸 문장(서버 액션 — 확인 결과와 함께). */
    z.strictObject({ ...head("writing-guided"), sentences: sentenceList }),
    /** 진행: 고칠 곳을 고친 문장(내 문장 듣기에 씀). 쓰기 문장 활동의 시도다. */
    z.strictObject({ ...head("writing-guided-fix"), fixed: sentenceList }),
    z.strictObject({ ...head("writing-own-repeat"), ...ownSpoken }),
    // ── b: 쓰기 6~12 첫 세션(생각 꺼내기 · 초고 — 서버 액션) · 둘째 세션 ──
    z.discriminatedUnion("step", [
      z.strictObject({
        v: z.union([z.literal(INPUT_VERSION_1), z.literal(INPUT_VERSION)]),
        kind: z.literal("thinkout"),
        step: z.literal("progress"),
        turn: z.int().min(1),
        answer: z.string().nullable(),
        question: z.string(),
        options: z.array(z.string()),
        historyEntry: z.string(),
      }),
      z.strictObject({
        v: z.union([z.literal(INPUT_VERSION_1), z.literal(INPUT_VERSION)]),
        kind: z.literal("thinkout"),
        step: z.literal("final"),
        summary: z.string().optional(),
        words: z.array(z.string()).optional(),
        starters: z.array(z.string()).optional(),
        /** 생각 꺼내기 실패 · 출력 막힘 — '이번에는 바로 써 볼까요'(8절). */
        failed: z.literal(true).optional(),
        /** 중단된 초고를 되살릴 때 앞 생각 꺼내기를 그대로 씀(AI 다시 안 부름). */
        restored: z.literal(true).optional(),
      }),
    ]),
    z.strictObject({ ...head("draft"), text: z.string() }),
    z.strictObject({ ...head("feedback-praise") }),
    z.strictObject({ ...head("feedback-correction") }),
    z.strictObject({ ...head("model-answer") }),
    z.strictObject({ ...head("rewrite"), text: z.string() }),
    z.strictObject({ ...head("own-speak"), ...ownSpoken }),
  ])
  .superRefine((input, ctx) => {
    // 듣기 문항의 빈 보기 목록은 기술 오류로 답 없이 넘긴 때만(R-57)
    if (
      input.kind === "listening" &&
      input.tries.length === 0 &&
      input.techError === undefined
    )
      ctx.addIssue({
        code: "custom",
        path: ["tries"],
        message: "고른 보기가 없다",
      });
    // 판 1 시도는 판 2 에 생긴 칸을 지닐 수 없다 — 평가가 '도움을 쓰지 않은 판 2 시도'와 '도움을 기록하지 않던 판 1 시도'를 가르게
    if (input.v !== INPUT_VERSION_1) return;
    for (const field of V2_FIELDS)
      if (field in input)
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `판 1 시도에 판 2 칸(${field})이 있다`,
        });
  });
export type AttemptInput = z.infer<typeof AttemptInputSchema>;
export type AttemptKind = AttemptInput["kind"];

/**
 * 끝 시도 내용에 펼쳐 넣는 기술 오류 칸(R-57 — 듣기 · 따라 말하기 · 질문 시도). techError 는 판 2 칸이라 판도 2 로 올린다: 세션 틀은 끝 시도를
 * { v: 1, kind, step, ...내용 } 으로 만들어 내용의 v 가 이긴다(판 1 시도에 판 2 칸이 있으면 거부 — V2_FIELDS).
 */
export const speakFailFields = {
  v: INPUT_VERSION,
  techError: "speak_fail",
} as const;

/** 기술 오류(소리를 들려주지 못함)로 적은 시도인가(R-55 · R-57). */
const isTechError = (input: AttemptInput): boolean =>
  "techError" in input && input.techError !== undefined;

/** P10 미리보기 시도(꼬리표 없음) — 미리보기 끝 시도로 읽는다. */
const LegacyPreviewSchema = z.strictObject({
  shownWords: z.array(z.string()),
});

/** JSON 글의 NUL 글자 표기 — Postgres jsonb 가 받지 않아 묶음 저장 전체를 막는다(그 시도만 거부). */
const JSON_NUL = "\\u0000";

/**
 * 시도 입력을 읽는다. 꼴이 틀리거나 JSON 글자 수가 INPUT_JSON_MAX 를 넘거나 NUL 글자가 들었으면 undefined
 * (NUL 이 든 시도 하나가 묶음 넣기를 늘 실패시켜 기기 대기열이 막히지 않게 — 차례 2).
 */
export function parseAttemptInput(raw: unknown): AttemptInput | undefined {
  let json: string | undefined;
  try {
    json = JSON.stringify(raw);
  } catch {
    return undefined;
  }
  if (json === undefined || json.length > INPUT_JSON_MAX) return undefined;
  if (json.includes(JSON_NUL)) return undefined;
  const parsed = AttemptInputSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const legacy = LegacyPreviewSchema.safeParse(raw);
  if (legacy.success)
    return {
      v: INPUT_VERSION_1,
      kind: "preview",
      step: "final",
      shownWords: legacy.data.shownWords,
    };
  return undefined;
}

/** 짝 시도인가(slot "spare"). */
export const isSpareInput = (input: AttemptInput): boolean =>
  "slot" in input && input.slot === "spare";

/**
 * 시도가 그 활동의 것인가(종류가 같은가 — 고친 문장 진행 시도는 쓰기 문장 활동의 것). 짝 활동은 base 종류 꼴에 slot "spare" 를 단
 * 시도만, 그 밖 활동은 slot 이 없는 시도만 맞다. 본보기 · 같이 해 보기는 차례(index)도 같아야 한다. 서버는 다르면 그 시도를 거부한다.
 */
export function inputFitsActivity(
  activity: Activity,
  input: AttemptInput,
): boolean {
  if (activity.kind === "spare")
    return isSpareInput(input) && input.kind === activity.base;
  if (isSpareInput(input)) return false;
  if (input.kind === "writing-guided-fix")
    return activity.kind === "writing-guided";
  if (
    (activity.kind === "model" && input.kind === "model") ||
    (activity.kind === "together" && input.kind === "together")
  )
    return activity.index === input.index;
  return activity.kind === input.kind;
}

/**
 * 대기열 길(saveSessionAttempts)이 받지 않는 시도 — AI 결과와 함께 서버 액션이 저장한다(plan-p11b 값 4):
 * 쓰기 확인 끝 · 생각 꺼내기(진행 · 끝) · 초고 끝 · 고쳐 쓰기 끝.
 */
export function serverActionOnly(input: AttemptInput): boolean {
  switch (input.kind) {
    case "thinkout":
      return true;
    case "writing-guided":
    case "draft":
    case "rewrite":
      return input.step === "final";
    default:
      return false;
  }
}

/**
 * AI 가 필요한 수업인가(13절 C80 · 8절 '동안' — 1-가 하루 안전 상한에 닿은 학습일에 시작하지 않는 수업): 쓰기 4~5 와
 * 6~12 첫 세션, 발표가 있는 말하기(9~12). 쓰기 둘째 세션(고쳐 쓰기)은 AI 를 부르지 않고, 말하기 3~8 은 막지 않고 질문 답만
 * 건너뛴다(8절 예외 — c). 시드 내용 꼴로 가른다(단계 숫자를 박지 않는다).
 */
export function aiNeededLesson(input: {
  area: Area;
  content: object;
  part?: "draft" | "rewrite";
}): boolean {
  const c = input.content as { shape?: unknown; presentation?: unknown };
  switch (input.area) {
    case "writing":
      return (
        c.shape === "guided" ||
        (c.shape === "composition" && input.part !== "rewrite")
      );
    case "speaking":
      return c.presentation !== undefined && c.presentation !== null;
    default:
      return false;
  }
}

// ── 이어 할 자리 ──

/** 저장된 시도 행에서 끝 시도가 있는 활동 번호(차례대로, 겹침 없음). 진행 시도 · 꼴이 틀린 시도는 넣지 않는다. */
export function finalActivityNos(
  rows: readonly { activityNo: number; input: unknown }[],
): number[] {
  const finals = new Set<number>();
  for (const row of rows)
    if (parseAttemptInput(row.input)?.step === "final")
      finals.add(row.activityNo);
  return [...finals].sort((a, b) => a - b);
}

/**
 * 이어 할 자리 = 끝 시도가 없는 가장 앞 활동(1부터). finals 는 서버의 끝 시도 번호 ∪ 이 기기 대기열에 남은 끝 시도 번호.
 * 서버 액션이 저장한 AI 활동이 앞 활동의 대기열 시도보다 먼저 닿아도 건너뛰지 않는다. skipped 는 시도 행 없이 끝난 것으로 볼
 * 번호(내지 않은 짝 — sparesToShow 의 skip, 정한 것 3)다.
 */
export function resumePointOf(
  activities: readonly Activity[],
  finals: Iterable<number>,
  skipped: Iterable<number> = [],
): { next: number } | { done: true } {
  const done = new Set([...finals, ...skipped]);
  for (let no = 1; no <= activities.length; no += 1)
    if (!done.has(no)) return { next: no };
  return { done: true };
}

// ── 앱 채점 활동 결과 ──

export type WordResult = { word: string; correct: boolean };
export type ActivityResult = {
  /** 활동 점수(3.7, 0~1). 점수 없는 활동 · 건너뜀은 null. */
  score: number | null;
  /** 단어별 정오(C76 — 단원 단어 · 앱이 정답을 아는 낱말 문항만). */
  wordResults: WordResult[];
  /** 말한 낱말 수(말하기 활동 — 인식 글 낱말 수의 합). 그 밖은 null. */
  wordCount: number | null;
};

export type AppScoringContext = {
  /** speaking.answer_match_pass */
  answerMatchPass: number;
  /** 동음이의어 묶음(시드 lists/homophones.json). */
  homophones: MatchOptions["homophones"];
  /** 그 수업의 단원 단어(원형, 수업 unitWords). */
  unitWords: readonly string[];
  /** 표기형 → 원형(vocab forms, lemmaLookup). 모르면 undefined. */
  lemmaOf: (surface: string) => string | undefined;
  /** 그 단계 말하기 질문 답을 앱이 판정하는가(level_specs questions.acceptedMin > 0 — 1~2단계, C38 · C66). */
  appJudgedQuestions: boolean;
  /**
   * 말하기 질문 판정의 낱말 품사 표(plan 다 · 정한 것 7 — meaningWordsFor(questionTextsOf(수업), 어휘 목록)). 기기와 서버가 같은 표를
   * 쓴다. 질문이 없는 수업은 빈 목록이다.
   */
  meaningWords: readonly MeaningWord[];
};

/** 채점 맥락의 말하기 질문 판정 맥락(문턱 · 동음이의어 · 품사 표). */
export const questionJudgeContextOf = (
  ctx: AppScoringContext,
): QuestionJudgeContext => ({
  pass: ctx.answerMatchPass,
  homophones: ctx.homophones,
  words: ctx.meaningWords,
});

/** 견줌 꼴: 일치율과 같은 정규화(소문자 · 하이픈은 빈칸 · 문장 부호 지움 · 축약 펼침)를 거쳐 빈칸으로 이은 글. */
const matchFormOf = (text: string): string =>
  normalizeForMatch(text, []).join(" ");

/** 낱말 원형 표(vocab 의 word · forms). 적힌 꼴(대소문자 무시)과 견줌 꼴('yo-yos' → 'yo yos') 둘 다로 찾는다. */
export function lemmaLookup(
  entries: readonly { word: string; forms: readonly string[] }[],
): (surface: string) => string | undefined {
  const map = new Map<string, string>();
  const put = (key: string, word: string) => {
    if (key !== "" && !map.has(key)) map.set(key, word);
  };
  for (const { word, forms } of entries)
    for (const surface of [word, ...forms]) {
      put(surface.toLowerCase(), word);
      put(matchFormOf(surface), word);
    }
  return (surface) =>
    map.get(surface.trim().toLowerCase()) ?? map.get(matchFormOf(surface));
}

type AppLesson = LessonOf["reading" | "writing" | "speaking"];
type ReadingContent = LessonOf["reading"]["content"];
type WritingContent = LessonOf["writing"]["content"];
type SpeakingContent = LessonOf["speaking"]["content"];

const NO_RESULT: ActivityResult = {
  score: null,
  wordResults: [],
  wordCount: null,
};

function readingContent(lesson: AppLesson): ReadingContent {
  if ("passage" in lesson.content) return lesson.content;
  throw new Error("읽기 활동인데 읽기 수업이 아니다");
}
function writingContent(lesson: AppLesson): WritingContent {
  if ("shape" in lesson.content) return lesson.content;
  throw new Error("쓰기 활동인데 쓰기 수업이 아니다");
}
function speakingContent(lesson: AppLesson): SpeakingContent {
  if ("repeat" in lesson.content) return lesson.content;
  throw new Error("말하기 활동인데 말하기 수업이 아니다");
}
function at<T>(list: readonly T[], index: number, what: string): T {
  const value = list[index];
  if (value === undefined) throw new Error(`${what} ${index} 번째가 없다`);
  return value;
}

const wordsIn = (text: string | undefined): number =>
  (text ?? "").trim().split(/\s+/).filter(Boolean).length;
const textOf = (heard: readonly string[]) =>
  heard.filter((h) => h.trim() !== "");

/** 낱말 하나(시드 낱말 id · 표기형)가 가리키는 단원 단어. 아니면 undefined. */
function unitWordOf(
  surface: string,
  ctx: AppScoringContext,
): string | undefined {
  // 단원 단어 쪽도 같은 견줌 꼴로('yo-yo' ↔ 인식 'yo yo', "o'clock" ↔ 'oclock')
  const form = matchFormOf(surface);
  const lemma = ctx.lemmaOf(surface);
  const lemmaForm = lemma === undefined ? undefined : matchFormOf(lemma);
  return ctx.unitWords.find((w) => {
    const unit = matchFormOf(w);
    return unit !== "" && (unit === form || unit === lemmaForm);
  });
}

/** 정규화한 낱말 줄에서 단원 단어가 나온 자리(여러 낱말 표제어는 이어진 낱말로). */
function unitWordSpans(
  tokens: readonly string[],
  ctx: AppScoringContext,
): { word: string; spans: [number, number][] }[] {
  const found: { word: string; spans: [number, number][] }[] = [];
  for (const word of ctx.unitWords) {
    const size = normalizeForMatch(word, []).length;
    if (size === 0) continue;
    const spans: [number, number][] = [];
    for (let i = 0; i + size <= tokens.length; i += 1) {
      const surface = tokens.slice(i, i + size).join(" ");
      if (unitWordOf(surface, { ...ctx, unitWords: [word] }) !== undefined)
        spans.push([i, i + size]);
    }
    if (spans.length > 0) found.push({ word, spans });
  }
  return found;
}

/** 글(허용 답 · 정답 문장)에 든 단원 단어마다 같은 정오. */
function wordsOfText(
  text: string,
  correct: boolean,
  ctx: AppScoringContext,
): WordResult[] {
  return unitWordSpans(normalizeForMatch(text, []), ctx).map(({ word }) => ({
    word,
    correct,
  }));
}

/** 낱말 하나 문항의 단어별 정오(단원 단어가 아니면 없음). */
function wordOfItem(
  surface: string | undefined,
  correct: boolean,
  ctx: AppScoringContext,
): WordResult[] {
  const word = surface === undefined ? undefined : unitWordOf(surface, ctx);
  return word === undefined ? [] : [{ word, correct }];
}

function choiceResult(
  answerNo: number,
  tries: readonly number[],
  type: "picture" | "listening" | "pick-word",
  pictureWord: string | undefined,
  ctx: AppScoringContext,
): ActivityResult {
  const first = at(tries, 0, "고른 보기");
  const correct = checkAnswer(
    { type, answerNo },
    { kind: "choice", no: first },
    { homophones: ctx.homophones },
  ).correct;
  return {
    score: correct ? 1 : 0,
    wordResults: wordOfItem(pictureWord, correct, ctx),
    wordCount: null,
  };
}

type WritingItemOf = Extract<
  WritingContent,
  { shape: "items" }
>["items"][number];
/** 쓰기 1~3 문항 또는 그 짝(같은 꼴 — 짝은 문항 칸 대신 '왜'만 있다). */
type WritingItemLike = WritingItemOf | NonNullable<WritingItemOf["spare"]>;

function writingItemResult(
  item: WritingItemLike,
  tries: readonly Answer[],
  ctx: AppScoringContext,
): ActivityResult {
  const correct = checkAnswer(item, at(tries, 0, "쓰기 답"), {
    homophones: ctx.homophones,
  }).correct;
  let wordResults: WordResult[];
  switch (item.type) {
    case "pick-word":
      wordResults = wordOfItem(item.picture, correct, ctx);
      break;
    case "assemble-phrase":
    case "assemble-sentence":
      wordResults = wordsOfText(item.accepted[0] ?? "", correct, ctx);
      break;
    default:
      wordResults = wordOfItem(item.word, correct, ctx);
  }
  return { score: correct ? 1 : 0, wordResults, wordCount: null };
}

function repeatResult(
  target: string,
  input: Extract<AttemptInput, { kind: "repeat-word" | "repeat-sentence" }>,
  ctx: AppScoringContext,
): ActivityResult {
  const wordCount = input.heard.reduce((sum, h) => sum + wordsIn(h), 0);
  const texts = textOf(input.heard);
  // 건너뛴 활동 · 기술 오류(본보기를 한 번도 들려주지 못함, R-55 · R-57)는 인식 글이 있어도 점수 · 단어별 정오에서 뺀다
  // (7절 · plan 값 2 · 컨트롤러 결정 1). 단어 수는 남긴다
  if (texts.length === 0 || input.skipped !== undefined || isTechError(input))
    return { score: null, wordResults: [], wordCount };
  const match: MatchOptions = {
    homophones: ctx.homophones,
    nameSlot: "any-word",
  };
  const rates = texts.map((h) => bestMatchRate([target], h, match));
  const score = Math.max(...rates);
  const best = texts[rates.indexOf(score)] ?? "";
  const aligned = matchedTargetWords(target, best, match);
  const tokens = aligned.map((w) => w.word);
  const wordResults = unitWordSpans(tokens, ctx).map(({ word, spans }) => ({
    word,
    correct: spans.some(([from, to]) =>
      aligned.slice(from, to).every((w) => w.matched),
    ),
  }));
  return { score, wordResults, wordCount };
}

function questionResult(
  question: { accepted?: readonly string[] },
  input: Extract<AttemptInput, { kind: "question" }>,
  ctx: AppScoringContext,
): ActivityResult {
  const wordCount =
    input.heard.reduce((sum, h) => sum + wordsIn(h), 0) + wordsIn(input.echo);
  const first = textOf(input.heard)[0];
  const accepted = question.accepted ?? [];
  // 3단계부터는 AI 판정(c) — 이 길은 건너뛴 끝 시도만 받는다. 허용 답이 없는 수업도 판정하지 않는다.
  // 건너뛴 질문 · 기술 오류는 첫 답이 있어도 점수 · 단어별 정오를 내지 않는다(7절 '점수에서 뺀다' · 결정 1 · R-55)
  if (
    !ctx.appJudgedQuestions ||
    accepted.length === 0 ||
    first === undefined ||
    input.skipped !== undefined ||
    isTechError(input)
  )
    return { score: null, wordResults: [], wordCount };
  const judged = judgeAppAnswer(first, accepted, {
    pass: ctx.answerMatchPass,
    homophones: ctx.homophones,
  });
  return {
    score: judged.correct ? 1 : 0,
    wordResults: wordsOfText(judged.closest, judged.correct, ctx),
    wordCount,
  };
}

/** 같이 해 보기 결과(연습 — 점수 · 단어별 정오 없음). 말로 한 시도가 있으면 말한 낱말 수만 남긴다. */
function togetherResult(
  input: Extract<AttemptInput, { kind: "together" }>,
): ActivityResult {
  const heard = input.tries.flatMap((t) =>
    t.heard === undefined ? [] : [t.heard],
  );
  return {
    score: null,
    wordResults: [],
    wordCount:
      heard.length === 0 ? null : heard.reduce((sum, h) => sum + wordsIn(h), 0),
  };
}

const spareOf = <T extends { spare?: unknown }>(
  item: T,
  what: string,
): NonNullable<T["spare"]> => {
  if (item.spare === undefined || item.spare === null)
    throw new Error(`${what}에 짝이 없다`);
  return item.spare as NonNullable<T["spare"]>;
};

/**
 * 짝 시도의 결과: base 종류의 채점 함수를 짝 내용(짝 보기 · 짝 문장 · 짝 글)으로 부른다(점수는 부르는 쪽이 지운다). 말하기 질문 짝은
 * 단계와 상관없이 앱이 허용 답(accepted · acceptedMeaning)으로 본다(델타 spec 설계 1 '채점' — 두 묶음 판정은 다 몫).
 */
function spareResult(
  activity: Extract<Activity, { kind: "spare" }>,
  lesson: AppLesson,
  input: AttemptInput,
  ctx: AppScoringContext,
): ActivityResult {
  const { base, index } = activity;
  switch (base) {
    case "reading-question": {
      if (input.kind !== base) return NO_RESULT;
      const q = at(readingContent(lesson).questions, index, "문항");
      const sp = spareOf(q, "읽기 문항");
      const word =
        sp.kind === "picture" ? sp.options[sp.answerNo - 1] : undefined;
      return choiceResult(sp.answerNo, input.tries, "picture", word, ctx);
    }
    case "listening": {
      if (input.kind !== base || isTechError(input)) return NO_RESULT;
      const l = at(speakingContent(lesson).listening, index, "듣기");
      const sp = spareOf(l, "듣기 문항");
      const word =
        sp.kind === "picture" ? sp.options[sp.answerNo - 1] : undefined;
      return choiceResult(sp.answerNo, input.tries, "listening", word, ctx);
    }
    case "writing-item": {
      if (input.kind !== base) return NO_RESULT;
      const c = writingContent(lesson);
      if (c.shape !== "items")
        throw new Error("쓰기 문항 짝인데 1~3단계 수업이 아니다");
      const sp = spareOf(at(c.items, index, "쓰기 문항"), "쓰기 문항");
      return writingItemResult(sp, input.tries, ctx);
    }
    case "repeat-word":
    case "repeat-sentence": {
      if (input.kind !== base) return NO_RESULT;
      const spares = speakingContent(lesson).repeat.spares;
      const list = base === "repeat-word" ? spares?.words : spares?.sentences;
      return repeatResult(at(list ?? [], index, "따라 말하기 짝"), input, ctx);
    }
    case "question": {
      if (input.kind !== base) return NO_RESULT;
      const q = at(speakingContent(lesson).questions, index, "질문");
      return spareQuestionResult(spareOf(q, "질문"), input, ctx);
    }
  }
}

/**
 * 질문 짝의 결과: 첫 인식 글을 judgeSpeakingQuestion(의미 검사 → 두 묶음, AI 없음)으로 판정한다(델타 spec 설계 8 — 혼자 질문과 같은
 * 함수). 단어별 정오는 두 묶음 가운데 가장 가까운 허용 답에 든 단원 단어에 그 맞음 여부를 단다. 건너뛰었으면 단어 수만.
 */
function spareQuestionResult(
  item: NonNullable<SpeakingContent["questions"][number]["spare"]>,
  input: Extract<AttemptInput, { kind: "question" }>,
  ctx: AppScoringContext,
): ActivityResult {
  const wordCount =
    input.heard.reduce((sum, h) => sum + wordsIn(h), 0) + wordsIn(input.echo);
  const first = textOf(input.heard)[0];
  if (first === undefined || input.skipped !== undefined || isTechError(input))
    return { score: null, wordResults: [], wordCount };
  const judge = judgeSpeakingQuestion(item, first, questionJudgeContextOf(ctx));
  const correct = judge.final === "correct";
  const { closest } = judgeAppAnswer(
    first,
    [...item.accepted, ...(item.acceptedMeaning ?? [])],
    { pass: ctx.answerMatchPass, homophones: ctx.homophones },
  );
  return {
    score: correct ? 1 : 0,
    wordResults: wordsOfText(closest, correct, ctx),
    wordCount,
  };
}

// ── 앱 판정을 시도 꼴에 다시 쓰기(서버 값이 정본) ──

/** 같이 해 보기 시도에서 판정할 말(첫 인식 글이 든 시도의 글). */
const firstHeardTry = (
  input: Extract<AttemptInput, { kind: "together" }>,
): string | undefined =>
  input.tries.find((t) => t.heard !== undefined && t.heard.trim() !== "")
    ?.heard;

/** judge 칸을 뺀 시도(판정할 말이 없거나 판정할 문항이 아닌 때). */
function withoutJudge<T extends AttemptInput>(input: T): T {
  if (!("judge" in input)) return input;
  const { judge: _judge, ...rest } = input as T & { judge?: unknown };
  return rest as T;
}

/**
 * 앱이 판정하는 말하기 질문 시도(질문 짝 · 말하기 같이 해 보기)의 judge 칸을 앱 판정(judgeSpeakingQuestion, AI 없음)으로 바꾼 시도
 * (plan 이름 표 '말하기 질문 판정' · 델타 spec 설계 9 '가른 묶음과 표현 수행 여부를 남긴다'). 기기가 보낸 judge 는 믿지 않고 서버가
 * 저장 때 이 함수로 다시 쓴다. 판정할 말이 없거나(건너뜀 · 빈 글) 질문 꼴이 아닌 같이 해 보기는 judge 를 뺀다. 이 함수는 대기열 길
 * (saveSessionAttempts)만 부르므로, 혼자 질문 시도(대기열로는 3단계 건너뜀 끝 시도 · 1~2단계 앱 판정 시도만 온다)의 judge 도 뺀다
 * (AI 와 합친 judge 는 서버 액션만 저장 — 검토 M1). 그 밖 시도는 그대로다. 부르는 쪽이 inputFitsActivity 로 먼저 거른다.
 */
export function withAppJudge(
  activity: Activity,
  lesson: AppLesson,
  input: AttemptInput,
  ctx: AppScoringContext,
): AttemptInput {
  const judgeCtx = questionJudgeContextOf(ctx);
  if (
    activity.kind === "spare" &&
    activity.base === "question" &&
    input.kind === "question"
  ) {
    const item = speakingContent(lesson).questions[activity.index]?.spare;
    const first = textOf(input.heard)[0];
    if (!item || first === undefined || input.skipped !== undefined)
      return withoutJudge(input);
    return { ...input, judge: judgeSpeakingQuestion(item, first, judgeCtx) };
  }
  if (activity.kind === "together" && input.kind === "together") {
    const raw = lesson.teach?.together[activity.index] as
      | ({ type?: string } & Parameters<typeof judgeableQuestion>[0])
      | undefined;
    const heard = firstHeardTry(input);
    if (
      raw?.type !== "question" ||
      !judgeableQuestion(raw) ||
      heard === undefined
    )
      return withoutJudge(input);
    return { ...input, judge: judgeSpeakingQuestion(raw, heard, judgeCtx) };
  }
  if (activity.kind === "question" && input.kind === "question")
    return withoutJudge(input);
  return input;
}

/**
 * 앱 채점 활동의 결과(3.7 활동 점수 · C76 단어별 정오 · 단어 수). 진행 시도는 점수 없음. 시도 종류가 활동과 다르면 던진다
 * (부르는 쪽이 inputFitsActivity 로 먼저 거른다). 읽기 · 듣기 · 쓰기 1~3 은 첫 시도 정오(C77 (1)~(3)), 따라 말하기는 시도 가운데
 * 가장 높은 일치율(C77 (4)), 1~2단계 질문 답은 첫 인식 글의 허용 답 판정(C38). 기술 오류(techError — 소리를 한 번도 들려주지 못함)
 * 시도는 맞고 틀림과 관계없이 점수 · 단어별 정오가 없다(R-55 · R-57, 세션 점수 sessionScoreOf 가 분모 · 분자에서 뺀다).
 */
export function appActivityResult(
  activity: Activity,
  lesson: AppLesson,
  input: AttemptInput,
  ctx: AppScoringContext,
): ActivityResult {
  if (!inputFitsActivity(activity, input))
    throw new Error(
      `시도 종류(${input.kind})가 활동 종류(${activity.kind})와 다르다`,
    );
  if (input.step !== "final") return NO_RESULT;
  // 짝: 점수 없음(새 기회 · 단어별 정오만 — 3.7 '혼자 첫 시도만 센다')
  if (activity.kind === "spare")
    return { ...spareResult(activity, lesson, input, ctx), score: null };
  switch (input.kind) {
    case "today":
    case "model":
    case "preview":
    case "reading-passage":
      return NO_RESULT;
    case "together":
      return togetherResult(input);
    case "reading-question": {
      if (activity.kind !== "reading-question") return NO_RESULT;
      const q = at(readingContent(lesson).questions, activity.index, "문항");
      // 글 보기 이해 문항은 단어별 정오를 내지 않는다(C76)
      const word = q.kind === "picture" ? q.options[q.answerNo - 1] : undefined;
      return choiceResult(q.answerNo, input.tries, "picture", word, ctx);
    }
    case "listening": {
      // 대본을 한 번도 들려주지 못한 채 고른 답 · 답 없이 넘김은 점수 · 단어별 정오에서 뺀다(R-55 · R-57)
      if (activity.kind !== "listening" || isTechError(input)) return NO_RESULT;
      const l = at(speakingContent(lesson).listening, activity.index, "듣기");
      const word = l.kind === "picture" ? l.options[l.answerNo - 1] : undefined;
      return choiceResult(l.answerNo, input.tries, "listening", word, ctx);
    }
    case "writing-item": {
      if (activity.kind !== "writing-item") return NO_RESULT;
      const c = writingContent(lesson);
      if (c.shape !== "items")
        throw new Error("쓰기 문항 활동인데 1~3단계 수업이 아니다");
      return writingItemResult(
        at(c.items, activity.index, "쓰기 문항"),
        input.tries,
        ctx,
      );
    }
    case "repeat-word":
    case "repeat-sentence": {
      if (
        activity.kind !== "repeat-word" &&
        activity.kind !== "repeat-sentence"
      )
        return NO_RESULT;
      const { repeat } = speakingContent(lesson);
      const list =
        input.kind === "repeat-word" ? repeat.words : repeat.sentences;
      return repeatResult(at(list, activity.index, "따라 말하기"), input, ctx);
    }
    case "question": {
      if (activity.kind !== "question") return NO_RESULT;
      const q = at(speakingContent(lesson).questions, activity.index, "질문");
      return questionResult(q, input, ctx);
    }
    // b: 과제 · 첨삭 보기 · 모범 답안은 점수 없음, 내 문장 말하기는 선택(점수 · 단어 수 없음), 쓰기 확인 · 초고 · 고쳐 쓰기의
    // 점수는 서버 액션이 AI 결과로 쓴다(이 길로 오지 않음)
    case "writing-task":
    case "writing-guided":
    case "writing-guided-fix":
    case "writing-own-repeat":
    case "thinkout":
    case "draft":
    case "feedback-praise":
    case "feedback-correction":
    case "model-answer":
    case "rewrite":
    case "own-speak":
      return NO_RESULT;
  }
}

// ── 혼자 첫 시도 결과(짝 고르기 입력 — 정한 것 3) ──

/** 혼자 문항 첫 시도: 맞음 · 틀림 · U(건너뜀 · 'AI 쉬는 중' · 소리 없음 · 판정 없음 — 짝을 내지 않는다). */
export type SoloOutcome = "correct" | "wrong" | "unscored";

export type OutcomeContext = AppScoringContext & {
  /** ui.match_phrase_levels 첫 값('잘 말했어요' 경계) — 따라 말하기 첫 시도의 맞음 기준(델타 spec 설계 1 틀린 뒤 차례 표). */
  repeatGoodRate: number;
};

/**
 * 혼자 문항 첫 시도의 결과(기기와 서버가 같은 함수 — 서버 값이 정본). 읽기 · 듣기 · 쓰기 · 1~2단계 질문은 첫 시도 점수(앱 채점),
 * 따라 말하기는 첫 인식 글의 결과 말이 '잘 말했어요'인가, AI 로 판정하는 질문은 시도 꼴 judge 의 합친 판정(맞음 밖은 틀림)이다.
 * 건너뜀 · 소리 없음(techError) · 판정 없는 AI 질문 · 진행 시도 · 짝 시도는 U.
 */
export function soloOutcomeOf(
  activity: Activity,
  lesson: AppLesson,
  input: AttemptInput,
  ctx: OutcomeContext,
): SoloOutcome {
  if (
    activity.kind === "spare" ||
    !inputFitsActivity(activity, input) ||
    input.step !== "final"
  )
    return "unscored";
  if (isTechError(input)) return "unscored";
  if ("skipped" in input && input.skipped !== undefined) return "unscored";
  if (
    (input.kind === "repeat-word" || input.kind === "repeat-sentence") &&
    (activity.kind === "repeat-word" || activity.kind === "repeat-sentence")
  ) {
    const { repeat } = speakingContent(lesson);
    const list = input.kind === "repeat-word" ? repeat.words : repeat.sentences;
    const target = at(list, activity.index, "따라 말하기");
    const first = textOf(input.heard)[0];
    if (first === undefined) return "unscored";
    const rate = bestMatchRate([target], first, {
      homophones: ctx.homophones,
      nameSlot: "any-word",
    });
    return rate >= ctx.repeatGoodRate ? "correct" : "wrong";
  }
  if (input.kind === "question" && !ctx.appJudgedQuestions) {
    if (input.judge === undefined) return "unscored";
    return input.judge.final === "correct" ? "correct" : "wrong";
  }
  const { score } = appActivityResult(activity, lesson, input, ctx);
  if (score === null) return "unscored";
  return score >= 1 ? "correct" : "wrong";
}

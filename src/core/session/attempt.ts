// 시도 꼴 · 앱 채점 활동 결과 · 단어별 정오 · 단어 수 · 이어 할 자리(plan-p11a 파일별 값 2 · 정할 것 다 · 라 · 위험 2 · 3,
// 13절 C38 · C73 · C76 · C77, 3.7 활동 점수, 6.2 앱 채점 · 일치율). DB · 시계 없는 순수 함수다. 화면은 같은 함수로 바로 판정하고
// 서버는 저장 때 수업 내용으로 다시 채점한다(서버 값이 정본). 허용 답 기준(speaking.answer_match_pass)은 부르는 쪽이 넘긴다.
// 이 파일은 a 몫 종류(AI 없이 채점하는 활동)만 꼴을 둔다 — b · c 가 자기 종류를 더한다.
import { z } from "zod";
import { type Answer, checkAnswer } from "@/core/answer/check";
import type { LessonOf } from "@/core/seed/schema/lesson";
import type { Activity } from "@/core/session/preview";
import { judgeAppAnswer } from "@/core/speaking/judge";
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
/** 시도 꼴 판. */
const INPUT_VERSION = 1;

// ── 시도 꼴(attempts.input) ──

const step = z.enum(["final", "progress"]);
const head = <K extends string>(kind: K) => ({
  v: z.literal(INPUT_VERSION),
  kind: z.literal(kind),
  step,
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

export const AttemptInputSchema = z.discriminatedUnion("kind", [
  z.strictObject({ ...head("preview"), shownWords: z.array(z.string()) }),
  /** 누른 글로서리 낱말의 원형(P12 단어장). */
  z.strictObject({
    ...head("reading-passage"),
    tappedWords: z.array(z.string()),
  }),
  z.strictObject({ ...head("reading-question"), tries: choiceTries }),
  z.strictObject({ ...head("listening"), tries: choiceTries }),
  z.strictObject({
    ...head("writing-item"),
    tries: z.array(AnswerTrySchema).min(1),
  }),
  z.strictObject({ ...head("repeat-word"), ...spoken }),
  z.strictObject({ ...head("repeat-sentence"), ...spoken }),
  /** 1~2단계 질문 답(앱 판정). echo = '같이 말해 볼까요' 뒤 말. */
  z.strictObject({
    ...head("question"),
    ...spoken,
    echo: z.string().optional(),
  }),
]);
export type AttemptInput = z.infer<typeof AttemptInputSchema>;
export type AttemptKind = AttemptInput["kind"];

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
      v: INPUT_VERSION,
      kind: "preview",
      step: "final",
      shownWords: legacy.data.shownWords,
    };
  return undefined;
}

/** 시도가 그 활동의 것인가(종류가 같은가). 서버는 다르면 그 시도를 거부한다. */
export function inputFitsActivity(
  activity: Activity,
  input: AttemptInput,
): boolean {
  return activity.kind === input.kind;
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
 * 서버 액션이 저장한 AI 활동이 앞 활동의 대기열 시도보다 먼저 닿아도 건너뛰지 않는다.
 */
export function resumePointOf(
  activities: readonly Activity[],
  finals: Iterable<number>,
): { next: number } | { done: true } {
  const done = new Set(finals);
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
};

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

function writingItemResult(
  item: Extract<WritingContent, { shape: "items" }>["items"][number],
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
  // 건너뛴 활동은 인식 글이 있어도 점수에서 뺀다(7절 · plan 값 2 · 컨트롤러 결정 1). 단어 수는 남긴다
  if (texts.length === 0 || input.skipped !== undefined)
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
  question: SpeakingContent["questions"][number],
  input: Extract<AttemptInput, { kind: "question" }>,
  ctx: AppScoringContext,
): ActivityResult {
  const wordCount =
    input.heard.reduce((sum, h) => sum + wordsIn(h), 0) + wordsIn(input.echo);
  const first = textOf(input.heard)[0];
  const accepted = question.accepted ?? [];
  // 3단계부터는 AI 판정(c) — 이 길은 건너뛴 끝 시도만 받는다. 허용 답이 없는 수업도 판정하지 않는다.
  // 건너뛴 질문은 첫 답이 있어도 점수 · 단어별 정오를 내지 않는다(7절 '점수에서 뺀다' · 결정 1)
  if (
    !ctx.appJudgedQuestions ||
    accepted.length === 0 ||
    first === undefined ||
    input.skipped !== undefined
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

/**
 * 앱 채점 활동의 결과(3.7 활동 점수 · C76 단어별 정오 · 단어 수). 진행 시도는 점수 없음. 시도 종류가 활동과 다르면 던진다
 * (부르는 쪽이 inputFitsActivity 로 먼저 거른다). 읽기 · 듣기 · 쓰기 1~3 은 첫 시도 정오(C77 (1)~(3)), 따라 말하기는 시도 가운데
 * 가장 높은 일치율(C77 (4)), 1~2단계 질문 답은 첫 인식 글의 허용 답 판정(C38).
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
  switch (input.kind) {
    case "preview":
    case "reading-passage":
      return NO_RESULT;
    case "reading-question": {
      if (activity.kind !== "reading-question") return NO_RESULT;
      const q = at(readingContent(lesson).questions, activity.index, "문항");
      // 글 보기 이해 문항은 단어별 정오를 내지 않는다(C76)
      const word = q.kind === "picture" ? q.options[q.answerNo - 1] : undefined;
      return choiceResult(q.answerNo, input.tries, "picture", word, ctx);
    }
    case "listening": {
      if (activity.kind !== "listening") return NO_RESULT;
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
  }
}

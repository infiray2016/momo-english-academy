// 말하기 판정(plan-p11a 파일별 값 4 · 3.3 말하기 · 4절 결과 말 · 6.2 허용 답 · 7절 오류 · 감시 타이머 · 마이크를 쓸 수 없음 행,
// 13절 C22 · C38 · C39 · C53). DB · 시계 · 브라우저 없는 순수 함수다. 결과 말 경계(ui.match_phrase_levels) · 허용 답 기준
// (speaking.answer_match_pass) · 재시도 수(speech.max_retries) · 말소리 없음 수(speech.silent_items_max)는 부르는 쪽이
// 설정에서 읽어 넘긴다. 화면(P11 말하기 조각)과 서버 채점(appActivityResult)이 같은 함수를 쓴다(위험 2).
// 말하기 3단계 질문 · 질문 짝 · 같이 해 보기 판정(judgeSpeakingQuestion — 델타 spec 2026-10-29 가르치고 배우는 수업 설계 8 · plan 다 ·
// 정한 것 6 · 7, 정본 15절 AC-22k)과 AI 판정 점수 · 안전 상한 뒤 건너뛸 활동(plan-p11c 값 2 의 질문 답 몫)도 여기 둔다.
import { bandOf } from "@/core/level-band";
import type { SPEAKING_JUDGEMENTS } from "@/core/seed/structure";
import {
  checkMeaning,
  type MeaningVerdict,
  type MeaningWord,
} from "@/core/speaking/meaning";
import {
  type AnswerShape,
  classifyRecognitionError,
  type ListenOutcome,
} from "@/core/speech/listen";
import { bestMatchRate, type MatchOptions } from "@/core/speech/match-rate";

/** audio-capture 가 같은 활동에서 이어지면 '마이크를 쓸 수 없음'으로 보는 수(7절 고정 수 '세 번' — 12절 키 없음). */
export const MIC_CAPTURE_STREAK = 3;
const AUDIO_CAPTURE = "audio-capture";
const NO_SPEECH = "no-speech";
/** 두 문장 이상 답의 활동 시간 상한 키 머리(speaking.answer_max_seconds.<구간>, C53 (3)). */
const ANSWER_MAX_SECONDS_KEY = "speaking.answer_max_seconds.";
/** '마이크가 멈춤'으로 보는 이어진 실패 수 = speech.max_retries × 이 배수(7절 '여섯 번(speech.max_retries 의 두 배)'). */
const MIC_STALL_RETRY_MULTIPLE = 2;

// ── 결과 말(4절 · C39) ──

export type ResultPhrase = "good" | "close" | "again";

/** 결과 말 셋의 글(4절 · 3.3 — 아이 화면 문구 그대로). */
export const RESULT_PHRASES: Readonly<Record<ResultPhrase, string>> = {
  good: "잘 말했어요",
  close: "거의 다 맞았어요",
  again: "한 번 더 들어 볼까요",
};

/** 일치율의 결과 말. levels = ui.match_phrase_levels [위, 가운데](경계값은 위 말). */
export function resultPhraseOf(
  rate: number,
  levels: readonly [number, number] | readonly number[],
): ResultPhrase {
  const [high, mid] = levels;
  if (high === undefined || mid === undefined)
    throw new Error("결과 말 경계(ui.match_phrase_levels)가 둘이 아니다");
  if (rate >= high) return "good";
  if (rate >= mid) return "close";
  return "again";
}

// ── 1~2단계 질문 답 앱 판정(6.2 · C38) ──

export type AppAnswerJudgement = {
  correct: boolean;
  /** 허용 답 가운데 가장 높은 일치율. */
  rate: number;
  /** 그 일치율의 허용 답(같으면 앞의 것). 단어별 정오가 이 답에 든 단원 단어를 본다(C76). */
  closest: string;
};

/** 인식 글을 허용 답 전부와 견준다. 가장 높은 일치율이 pass(speaking.answer_match_pass) 이상이면 맞음. */
export function judgeAppAnswer(
  heard: string,
  accepted: readonly string[],
  options: { pass: number; homophones: MatchOptions["homophones"] },
): AppAnswerJudgement {
  const match: MatchOptions = {
    homophones: options.homophones,
    nameSlot: "any-word",
  };
  const rate = bestMatchRate(accepted, heard, match);
  const closest =
    accepted.find((a) => bestMatchRate([a], heard, match) === rate) ?? "";
  return { correct: rate >= options.pass, rate, closest };
}

// ── 말하기 질문 판정(델타 spec 설계 8 '말하기 질문 판정과 의사소통 정답' · 정한 것 6 · C182 (1) (2)) ──

/** AI 말하기 평가 판정(6.2 — 맞음 · 부분 · 다시). */
export type SpeakingJudgement = (typeof SPEAKING_JUDGEMENTS)[number];

/**
 * 말하기 질문 판정(시도 꼴 judge 칸 — core/session/attempt 의 QuestionJudgeSchema 와 같은 꼴, plan 이름 표). meaning 은 의미 검사,
 * bundle 은 가른 묶음(accepted · acceptedMeaning), ai 는 AI 원 판정(혼자 질문만), final 은 합친 판정, by 는 합친 판정을 정한 쪽이다.
 * communicative 는 의사소통 정답(acceptedMeaning 쪽 맞음), expressionDone 은 표현 수행(accepted 쪽 맞음일 때만 참)이다.
 */
export type SpeakingQuestionJudge = {
  meaning: MeaningVerdict;
  bundle?: "accepted" | "meaning";
  ai?: SpeakingJudgement;
  final: SpeakingJudgement;
  by: "app" | "ai";
  communicative?: true;
  expressionDone: boolean;
};

/** 판정할 질문 문항(혼자 질문 · 질문 짝 · 말하기 같이 해 보기의 공통 칸). */
export type JudgeableQuestion = {
  en: string;
  modelAnswer?: string;
  accepted?: readonly string[];
  acceptedMeaning?: readonly string[];
};

export type QuestionJudgeContext = {
  /** speaking.answer_match_pass */
  pass: number;
  /** 동음이의어 묶음(6.2 일치율 · 의미 검사가 같이 쓴다). */
  homophones: MatchOptions["homophones"];
  /** 낱말 품사 표(정한 것 7 — meaningWordsFor(questionTextsOf(수업), 어휘 목록), 기기와 서버가 같은 표). */
  words: readonly MeaningWord[];
};

/** 허용 답이 있어 앱이 판정할 수 있는 문항인가(1~3단계 질문 · 짝 · 같이 해 보기 — 4단계부터 질문은 AI 판정만). */
export function judgeableQuestion(item: JudgeableQuestion): boolean {
  return (item.accepted?.length ?? 0) > 0;
}

/**
 * 말하기 질문 판정(설계 8 — 혼자 질문 · 질문 짝 · 같이 해 보기가 같은 함수). 첫째 의미 검사(방향 · 핵심 정보 · 부정 · 틀린 정보 ·
 * 덧붙인 정보)가 실패하면 AI 가 맞음이라 해도 '다시'(오답, 정한 것 6)이고 AI 원 판정은 ai 에 남는다. 둘째 accepted · acceptedMeaning
 * 각각의 가장 높은 일치율 가운데 높은 것이 문턱(speaking.answer_match_pass) 이상이면 맞음이고 높은 쪽 묶음으로 가른다(같으면
 * accepted — accepted 를 먼저 보지 않는다). 이때는 AI 가 '부분' · '다시'라 해도 그 묶음의 맞음이다. 셋째 두 묶음 모두와 문턱 아래인
 * 바꿔 말하기만 AI 판정을 따르고(맞음이면 높은 쪽 묶음, 표현 수행은 거짓 — 문턱 이상으로 accepted 와 맞을 때만 참), AI 판정이 없는
 * 짝 · 같이 해 보기에서는 '다시'다(알려진 차이, 우려 19).
 * 바른 답(modelAnswer)이 없으면 첫 accepted 를 바른 답으로 본다. 허용 답이 없는 문항은 판정하지 않는다(던진다 — judgeableQuestion).
 */
export function judgeSpeakingQuestion(
  item: JudgeableQuestion,
  heard: string,
  ctx: QuestionJudgeContext,
  ai?: SpeakingJudgement,
): SpeakingQuestionJudge {
  const accepted = item.accepted ?? [];
  const modelAnswer = item.modelAnswer ?? accepted[0];
  if (modelAnswer === undefined)
    throw new RangeError("말하기 질문 판정: 허용 답이 없는 문항이다");
  const aiPart = ai === undefined ? {} : { ai };
  const meaning = checkMeaning({
    question: item.en,
    modelAnswer,
    answer: heard,
    words: ctx.words,
    homophones: ctx.homophones,
  });
  if (meaning !== "ok")
    return {
      meaning,
      ...aiPart,
      final: "retry",
      by: "app",
      expressionDone: false,
    };
  const match: MatchOptions = {
    homophones: ctx.homophones,
    nameSlot: "any-word",
  };
  const meaningAnswers = item.acceptedMeaning ?? [];
  const acceptedRate =
    accepted.length > 0 ? bestMatchRate(accepted, heard, match) : 0;
  const meaningRate =
    meaningAnswers.length > 0 ? bestMatchRate(meaningAnswers, heard, match) : 0;
  const bundled =
    acceptedRate >= meaningRate
      ? ({ bundle: "accepted", expressionDone: true } as const)
      : ({
          bundle: "meaning",
          communicative: true,
          expressionDone: false,
        } as const);
  if (Math.max(acceptedRate, meaningRate) >= ctx.pass)
    return { meaning, ...bundled, ...aiPart, final: "correct", by: "app" };
  if (ai === undefined)
    return { meaning, final: "retry", by: "app", expressionDone: false };
  // AI 맞음인 바꿔 말하기: 묶음은 높은 쪽으로 가르되, 어느 허용 답과도 문턱 이상으로 맞지 않았으니 표현 수행은 거짓이다
  // (spec 설계 9 '목표 표현을 다 갖춰 말했는가' — 컨트롤러 판단, 검토 M2)
  if (ai === "correct")
    return {
      meaning,
      ...bundled,
      expressionDone: false,
      ai,
      final: "correct",
      by: "ai",
    };
  return { meaning, ai, final: ai, by: "ai", expressionDone: false };
}

/** 질문 문항 하나의 판정 재료 글(질문 · 이야기 · 바른 답 · 허용 답 · 고를 말). */
function questionItemTexts(
  item: JudgeableQuestion & { storyEn?: string; choices?: readonly string[] },
): string[] {
  return [
    item.en,
    ...(item.storyEn === undefined ? [] : [item.storyEn]),
    ...(item.modelAnswer === undefined ? [] : [item.modelAnswer]),
    ...(item.accepted ?? []),
    ...(item.acceptedMeaning ?? []),
    ...(item.choices ?? []),
  ];
}

type QuestionLesson = {
  content: object;
  teach?: { together: readonly object[] } | undefined;
};

/**
 * 낱말 품사 표를 좁힐 수업 글(정한 것 7 — meaningWordsFor 의 첫 인자): 말하기 수업의 질문 · 질문 짝 · 말하기 같이 해 보기(질문 꼴)
 * 글. 질문이 없는 수업(읽기 · 쓰기)은 빈 목록이다. 기기의 바로 판정과 서버의 다시 판정이 같은 글로 같은 표를 만든다.
 */
export function questionTextsOf(lesson: QuestionLesson): string[] {
  const content = lesson.content as {
    repeat?: unknown;
    questions?: readonly (JudgeableQuestion & {
      storyEn?: string;
      spare?: JudgeableQuestion & { storyEn?: string };
    })[];
  };
  if (content.repeat === undefined || content.questions === undefined)
    return [];
  const texts: string[] = [];
  for (const q of content.questions) {
    texts.push(...questionItemTexts(q));
    if (q.spare) texts.push(...questionItemTexts(q.spare));
  }
  for (const raw of lesson.teach?.together ?? []) {
    const t = raw as JudgeableQuestion & {
      type?: string;
      storyEn?: string;
      choices?: readonly string[];
    };
    if (t.type === "question") texts.push(...questionItemTexts(t));
  }
  return texts;
}

/** AI 판정의 활동 점수(3.7 말하기 3~8 질문 답 '맞음 1 · 부분 0.5 · 다시 0', plan-p11c 값 2 — 규칙 표의 고정 값, 설정 키 없음). */
export const AI_ANSWER_SCORES: Readonly<Record<SpeakingJudgement, number>> = {
  correct: 1,
  partial: 0.5,
  retry: 0,
};

/** AI 판정(합친 판정 final)의 활동 점수. */
export function aiAnswerScore(judgement: SpeakingJudgement): number {
  return AI_ANSWER_SCORES[judgement];
}

/** AI 판정 혼자 질문 활동 종류(core/session/preview 의 question — 짝은 kind spare, 같이 해 보기는 together 라 들지 않는다). */
const AI_QUESTION_KIND = "question";

/**
 * 안전 상한('AI 쉬는 중') 뒤 건너뛸 활동(plan-p11c 값 2 의 질문 답 몫): from(1부터) 차례부터 남은 혼자 질문 답의 활동 번호. 질문 짝 ·
 * 같이 해 보기는 앱이 판정하므로 남는다(델타 spec 설계 10). 화면이 이 번호들을 건너뜀 끝 시도(skipped ai_rest)로 대기열에 넣는다.
 */
export function skipAfterAiRest(
  activities: readonly { kind: string }[],
  from: number,
): number[] {
  const out: number[] = [];
  activities.forEach((activity, i) => {
    if (i + 1 >= from && activity.kind === AI_QUESTION_KIND) out.push(i + 1);
  });
  return out;
}

// ── 답 꼴(7절 '듣기를 끝내는 때') ──

/** 말로 답하는 말하기 활동 종류. */
export type SpeechActivityKind =
  | "repeat-word"
  | "repeat-sentence"
  | "question"
  | "picture-task"
  | "presentation"
  | "confirm-question";

/**
 * 한 문장 답(조용하면 끝) · 두 문장 이상 답('다 말했어요' · 시간 상한으로 끝). 따라 말하기는 한 문장, 질문 답은 그 단계
 * level_specs questions.answerSentences.max 가 2 이상이면 두 문장 이상(5~8단계), 그림 보고 말하기 · 발표 · 확인 질문은 두 문장 이상.
 */
export function answerShapeOf(
  activity: { kind: SpeechActivityKind },
  levelSpec: { questions: { answerSentences?: { max: number } } },
): AnswerShape {
  switch (activity.kind) {
    case "repeat-word":
    case "repeat-sentence":
      return "one-sentence";
    case "question":
      return (levelSpec.questions.answerSentences?.max ?? 1) >= 2
        ? "multi-sentence"
        : "one-sentence";
    default:
      return "multi-sentence";
  }
}

/** 두 문장 이상 답의 시간 상한 설정 키(그 단계 구간). 값은 P2a endRuleFor 의 capSeconds 로 넘긴다. */
export function answerMaxSecondsKey(level: number): string {
  return `${ANSWER_MAX_SECONDS_KEY}${bandOf(level)}`;
}

// ── 인식 실패 셈(7절 오류 · 감시 타이머 · 마이크를 쓸 수 없음 · 네트워크 행, C22 · C53) ──

/** 셈 상태. 활동 몫(activity*)은 다음 활동에서 지우고, 세션 몫(micFailures · silentItems)은 세션 내내 이어진다. */
export type SpeakingCounters = Readonly<{
  /** 이 활동의 다시 듣기 갈래 실패 수(no-speech · aborted · 결과 없음 · audio-capture …). */
  activityFailures: number;
  /** 이 활동에서 이어진 audio-capture 수. */
  captureStreak: number;
  /** 이 활동이 아직 성공 없이 no-speech 로만 실패했는가. */
  onlyNoSpeech: boolean;
  /** 세션에서 성공 없이 이어진 audio-capture · aborted · 결과 없음 수(no-speech · network 는 안 셈). */
  micFailures: number;
  /** no-speech 로만 끝나 건너뛴 활동이 이어진 수. */
  silentItems: number;
}>;

/** 셈에 넣는 일. heard 의 빈 글은 '결과 없음'이다. */
export type SpeechEvent =
  | { type: "heard"; text: string }
  | { type: "no-result" }
  | { type: "error"; code: string }
  | { type: "stalled" }
  | { type: "next-activity" };

/**
 * 판정: heard 들음 · retry '다시 한 번 말해 볼까요' · skip 이 활동을 건너뛰고 점수에서 뺌 · mic-unavailable '마이크가 필요해요' ·
 * mic-stalled '마이크가 잘 안 돼요'(부모 알림 '마이크가 멈춤') · speech-silent '말소리가 잘 안 들려요'(이 활동도 건너뜀, 알림
 * '말소리가 들어오지 않음') · offline '인터넷이 끊겼어요'(셈 없음) · none 다음 활동으로 넘김.
 */
export type SpeechVerdict =
  | "heard"
  | "retry"
  | "skip"
  | "mic-unavailable"
  | "mic-stalled"
  | "speech-silent"
  | "offline"
  | "none";

export type SpeakingLimits = {
  /** speech.max_retries */
  maxRetries: number;
  /** speech.silent_items_max */
  silentItemsMax: number;
};

export function speakingCountersStart(): SpeakingCounters {
  return {
    activityFailures: 0,
    captureStreak: 0,
    onlyNoSpeech: true,
    micFailures: 0,
    silentItems: 0,
  };
}

type Step = { state: SpeakingCounters; verdict: SpeechVerdict };

/** 다시 듣기 갈래 실패 하나. code 가 없으면 '결과 없음'. */
function failure(
  state: SpeakingCounters,
  code: string | undefined,
  limits: SpeakingLimits,
): Step {
  const noSpeech = code === NO_SPEECH;
  const next: SpeakingCounters = {
    ...state,
    activityFailures: state.activityFailures + 1,
    captureStreak: code === AUDIO_CAPTURE ? state.captureStreak + 1 : 0,
    onlyNoSpeech: state.onlyNoSpeech && noSpeech,
    micFailures: noSpeech ? state.micFailures : state.micFailures + 1,
  };
  if (next.captureStreak >= MIC_CAPTURE_STREAK)
    return { state: next, verdict: "mic-unavailable" };
  if (next.micFailures >= limits.maxRetries * MIC_STALL_RETRY_MULTIPLE)
    return { state: next, verdict: "mic-stalled" };
  if (next.activityFailures < limits.maxRetries)
    return { state: next, verdict: "retry" };
  // 건너뜀: no-speech 로만 끝난 활동이면 말소리 없음 수를 올린다(C22)
  if (!next.onlyNoSpeech)
    return { state: { ...next, silentItems: 0 }, verdict: "skip" };
  const silentItems = next.silentItems + 1;
  return {
    state: { ...next, silentItems },
    verdict: silentItems >= limits.silentItemsMax ? "speech-silent" : "skip",
  };
}

/** 셈 줄이기 함수(활동마다 · 세션 전체). 부르는 쪽은 판정대로 안내하고, 새 활동에 들어갈 때 next-activity 를 넣는다. */
export function speakingCounters(
  state: SpeakingCounters,
  event: SpeechEvent,
  limits: SpeakingLimits,
): Step {
  switch (event.type) {
    case "next-activity":
      return {
        state: {
          ...state,
          activityFailures: 0,
          captureStreak: 0,
          onlyNoSpeech: true,
        },
        verdict: "none",
      };
    case "heard":
      if (event.text.trim() === "") return failure(state, undefined, limits);
      return {
        state: {
          ...state,
          captureStreak: 0,
          onlyNoSpeech: false,
          micFailures: 0,
          silentItems: 0,
        },
        verdict: "heard",
      };
    case "no-result":
      return failure(state, undefined, limits);
    case "stalled":
      // 감시 타이머가 한 번 다시 시작한 뒤 또 멈춤(P2b stalled)
      return { state, verdict: "mic-stalled" };
    case "error":
      switch (classifyRecognitionError(event.code)) {
        case "network":
          return { state, verdict: "offline" };
        case "mic-unavailable":
          return { state, verdict: "mic-unavailable" };
        default:
          return failure(state, event.code, limits);
      }
  }
}

/** 듣기 결과(P2b)를 셈의 일로. 중단(화면 떠남 · 가려짐 · 말하기 누름)은 세지 않는다(undefined). */
export function speechEventOf(outcome: ListenOutcome): SpeechEvent | undefined {
  switch (outcome.kind) {
    case "result":
      return { type: "heard", text: outcome.text };
    case "no-result":
      return { type: "no-result" };
    case "error":
      return { type: "error", code: outcome.code };
    case "stalled":
      return { type: "stalled" };
    case "interrupted":
      return undefined;
  }
}

// ── 영어로 말한 문장 수(4절 부모 화면 '오늘 영어로 말한 문장' · 5절 sessions.english_sentences · C12 · C41) ──

/** 세는 말하기 세션 활동 종류. 쓰기 세션의 내 문장 말하기는 넣지 않는다(5절 '말하기 · 회화 세션'). */
const SPOKEN_KINDS: ReadonlySet<string> = new Set<SpeechActivityKind>([
  "repeat-word",
  "repeat-sentence",
  "question",
  "picture-task",
  "presentation",
  "confirm-question",
]);

/** 같이 해 보기 시도 꼴 종류(core/session/attempt 의 together). */
const TOGETHER_KIND = "together";

const hasText = (text: unknown): boolean =>
  typeof text === "string" && text.trim() !== "";

/**
 * 말하기 세션 끝 시도의 인식 글이 있는 발화 수(시도마다 인식 글 하나 · '같이 말해 볼까요' 뒤 말 하나). 빈 글 · 실패는 안 셈.
 * 같이 해 보기(가르치고 배우는 수업 plan 나)는 시도마다 인식 글 하나를 센다. 짝 시도는 base 종류 꼴이라 그대로 센다.
 */
export function englishSentencesOf(
  inputs: readonly {
    kind: string;
    step?: string;
    heard?: readonly string[];
    echo?: string;
    /** 건너뛴 활동도 인식 글은 센다(점수에서만 뺀다). */
    skipped?: string;
    /** 같이 해 보기 시도들(말로 한 것만 heard). */
    tries?: readonly unknown[];
  }[],
): number {
  let count = 0;
  for (const input of inputs) {
    if (input.step !== "final") continue;
    if (input.kind === TOGETHER_KIND) {
      for (const t of input.tries ?? [])
        if (typeof t === "object" && t !== null && "heard" in t)
          count += hasText(t.heard) ? 1 : 0;
      continue;
    }
    if (!SPOKEN_KINDS.has(input.kind)) continue;
    count += (input.heard ?? []).filter(hasText).length;
    if (hasText(input.echo)) count += 1;
  }
  return count;
}

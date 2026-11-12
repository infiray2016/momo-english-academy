// 새 회화 엔진(Claude 가 이끄는 대화, talk.lead_mode claude)의 평가 입력 기록(spec '회화 Claude 주도' 설계 4 · 데이터 절, plan 묶음 R2).
// 지금 판정은 지금 함수(heardHelpsOfMove · hintKindOf · saidWordsOf · effectiveStuckOf · 위치 되짚기)와 지금 입력 꼴 그대로다. 이 모듈은 지금
// 길이 계획 · 출력 칸으로 알던 사실(답을 들려줬는지 · 막혔는지 · 어느 자리인지)을 새 엔진의 응답 글과 아이의 들린 글에서 다시 찾아, 그
// 입력을 같은 뜻으로 채운다. 새 규칙을 만들지 않고, AI 의 신호는 근거를 줄이는 쪽에만 쓴다(검토 I-4 (d)). 순수 모듈이다(시각 · DB 없음).
import {
  effectiveStuckOf,
  type TalkChildKind,
} from "@/core/conversation/child-kind";
import {
  childCauseOf,
  isLowBand,
  type TalkHeardHelp,
  type TalkHintKind,
  type TalkInputMode,
  type TalkLessonChildTurn,
  type TalkLessonSpec,
} from "@/core/conversation/lesson-turns";
import {
  readTalkMove,
  TALK_SUPPORT_STAGE_EASY,
  TALK_SUPPORT_STAGE_TOGETHER,
  type TalkLead,
  type TalkLeadMove,
  type TalkLeadReading,
  type TalkMove,
  type TalkMoveKind,
  talkMoveOf,
} from "@/core/conversation/move";
import {
  isClosingQuestion,
  questionsOfText,
} from "@/core/conversation/question-check";
import { metWordsIn, saidWordsOf } from "@/core/conversation/said";
import { normalizeSpoken } from "@/core/conversation/spoken";
import { isQuestionSentence } from "@/core/conversation/stream";
import { splitSentences } from "@/core/seed/text";

/** 새 엔진 응답에서 기록이 읽는 칸(응답 규격은 묶음 R1 — 칸 이름은 설계 2 작은 응답 표 그대로). */
export type LeadResponse = {
  reading: TalkLeadReading;
  move: TalkLeadMove;
  /** 아이에게 나간 말 칸(문장 문 · 다시 말하기를 지난 글. 1~3단계에서 글로 뺀 문장도 든 글 — 소리로 나갔다). */
  say: string;
  model_sentence: string;
};

// ── 막힘 값과 아이 말 갈래(설계 4 넷째 줄) ─────────────────────────

/** 막힘 값이 참인 읽기 칸 값(설계 4: likely_misheard · does_not_know · does_not_fit). */
export const LEAD_STUCK_READINGS: ReadonlySet<TalkLeadReading> = new Set([
  "likely_misheard",
  "does_not_know",
  "does_not_fit",
]);

const CHILD_KIND_OF_READING: Record<TalkLeadReading, TalkChildKind> = {
  clear_answer: "answer",
  repeated_my_model: "answer",
  new_topic: "new_topic",
  asks_teacher: "new_topic",
  likely_misheard: "not_understood",
  does_not_know: "not_understood",
  does_not_fit: "unrelated_words",
};

/** 읽기 칸 값 → 지금의 아이 말 갈래(설계 4 표 그대로). */
export function leadChildKindOf(reading: TalkLeadReading): TalkChildKind {
  return CHILD_KIND_OF_READING[reading];
}

/**
 * 이 아이 차례의 막힘(설계 4): 읽기 칸을 지금의 막힘 값과 아이 말 갈래로 옮긴 뒤 지금 무름(effectiveStuckOf: 영어 낱말 셋 이상 · 장면 낱말 ·
 * 같은 소리)을 건다. 무름의 재료(장면 낱말 · 동음이의어 묶음)는 지금 길과 같은 것을 부르는 쪽이 넘긴다.
 */
export function leadStuckOf({
  reading,
  child,
  input,
  sceneWords,
  homophones,
}: {
  reading: TalkLeadReading;
  child: string;
  input: TalkInputMode;
  sceneWords?: ReadonlySet<string>;
  homophones?: readonly (readonly string[])[];
}): { aiStuck: boolean; childKind: TalkChildKind; stuck: boolean } {
  const aiStuck = LEAD_STUCK_READINGS.has(reading);
  const childKind = leadChildKindOf(reading);
  return {
    aiStuck,
    childKind,
    stuck: effectiveStuckOf({
      aiStuck,
      childKind,
      child,
      input,
      ...(sceneWords === undefined ? {} : { sceneWords }),
      ...(homophones === undefined ? {} : { homophones }),
    }),
  };
}

/** 앞 아이 차례가 아이 쪽 막힘(단추 · 막힘 말)인가. 말소리 없음 · 말로 답함 · 앞 차례 없음은 아니다(지금 childCauseOf 그대로). */
export function leadPrevStuckOf(
  prevChild: Pick<TalkLessonChildTurn, "input" | "stuck" | "nospeech"> | null,
): boolean {
  if (prevChild === null) return false;
  const cause = childCauseOf(prevChild);
  return cause === "button" || cause === "stuck";
}

// ── 들려준 답(설계 4 첫째 · 둘째 줄) ─────────────────────────────

/** 정규화한 글(소문자 · 문장 부호 · 축약형 펼침, C127 보완)에 문장이 낱말 경계로 그대로 드는가. */
function sayContains(say: string, sentence: string): boolean {
  const s = normalizeSpoken(sentence);
  if (s === "") return false;
  return ` ${normalizeSpoken(say)} `.includes(` ${s} `);
}

/**
 * 따라 할 문장(설계 4 첫 줄): move 가 model_repeat 이거나 model_sentence 가 비지 않으면 들려준 것으로 본다(given). 문장이 나간 말 칸에 그대로
 * 들었는지는 맞음 · 어긋남(inSay)으로 기록만 하고, 어긋나도 들려준 것으로 둔다(근거를 줄이는 쪽). 문장이 빈 model_repeat 는 sentence · inSay 가 null.
 */
export function leadModelOf({
  move,
  modelSentence,
  say,
}: {
  move: TalkLeadMove;
  modelSentence: string;
  say: string;
}): { given: boolean; sentence: string | null; inSay: boolean | null } {
  const sentence = modelSentence.trim();
  const given = move === "model_repeat" || sentence !== "";
  if (sentence === "") return { given, sentence: null, inSay: null };
  return { given, sentence, inSay: sayContains(say, sentence) };
}

/** 글이 'or' 로 이은 답 후보를 갖는가(or 앞뒤에 낱말이 있음). */
function hasOrBetween(text: string): boolean {
  const words = normalizeSpoken(text).split(" ");
  return words.some((w, i) => w === "or" && i > 0 && i < words.length - 1);
}

/** 기록이 보는 물음 문장인가(물음표 문장 · 앱 고정 마무리 물음은 뺌 — questionsOfText 와 같은 거르기). */
function isAskedSentence(sentence: string): boolean {
  return isQuestionSentence(sentence) && !isClosingQuestion(sentence);
}

/**
 * 말 칸의 물음 문장 가운데 하나(마지막 문장만이 아님, 검토 I-4 (b))가 'or' 로 이은 답 후보를 갖는가. 'Or' 로 시작하는 물음 문장은 바로 앞
 * 문장이 물음 문장이면 그것과 이어 붙여 본다(정본 02-2 질문 문장 규칙 — 'Do you go to the beach? Or the mountain?' 은 고르기 하나, R2 검토
 * I-1). 앞에 물음 문장이 없는 'Or what?' 와 or 가 없는 물음 둘('Do you like it? Do you swim?')은 아니다.
 */
export function hasLeadChoiceQuestion(say: string): boolean {
  const sentences = splitSentences(say);
  return sentences.some((sentence, i) => {
    if (!isAskedSentence(sentence)) return false;
    if (hasOrBetween(sentence)) return true;
    const prev = i > 0 ? sentences[i - 1] : undefined;
    return (
      prev !== undefined &&
      isAskedSentence(prev) &&
      normalizeSpoken(sentence).split(" ")[0] === "or" &&
      hasOrBetween(`${prev} ${sentence}`)
    );
  });
}

/**
 * 막힌 뒤 고르기 답을 들려줌(설계 4 둘째 줄): move 가 easier_or_choices 이거나 앞 아이 차례가 막힘이고, 말 칸의 물음 문장이 'or' 로 이은 답
 * 후보를 가진다(hasLeadChoiceQuestion). 보통 차례의 이어 묻는 고르기 질문은 선택지로 적지 않는다(C205 · I-4 (c)). 마무리 차례 · move
 * wrap_up 차례의 물음은 넣지 않는다(두 단추로 답하는 고르기, spec 설계 4 · M2-1 · R2 검토 I-2).
 */
export function leadChoicesOf({
  move,
  say,
  prevStuck,
  closing,
}: {
  move: TalkLeadMove;
  say: string;
  prevStuck: boolean;
  /** 앱이 정한 마무리 차례(move kind closing_slot). */
  closing: boolean;
}): boolean {
  if (closing || move === "wrap_up") return false;
  if (move !== "easier_or_choices" && !prevStuck) return false;
  return hasLeadChoiceQuestion(say);
}

// ── 선생님 행 move 채움(설계 4 표 · 위치 되짚기 문단) ───────────────

/** 받침 행의 단계(앞 아이 차례가 막힘일 때만): model_repeat 첫째(같이 말하기) · easier_or_choices 와 ask_again 둘째(쉬운 질문). */
function supportStageOf(move: TalkLeadMove, prevStuck: boolean): number {
  if (!prevStuck) return 0;
  if (move === "model_repeat") return TALK_SUPPORT_STAGE_TOGETHER;
  if (move === "easier_or_choices" || move === "ask_again")
    return TALK_SUPPORT_STAGE_EASY;
  return 0;
}

/** S1 이 문장 문 · 좁은 정의 · 글 빼기 뒤에 채우는 lead 칸(이 모듈이 정하지 않는 기록). */
export type LeadExtra = Pick<
  TalkLead,
  "narrow" | "wide" | "gate" | "closingAdded" | "removed" | "soundMoved"
>;

/**
 * 새 엔진 선생님 행의 move(설계 4 · 데이터 절 move 행). 지금 판정 · 위치 되짚기가 읽는 칸을 채운다:
 * - kind: 앱이 정한 마무리 차례 closing_slot · 대화 토막 첫 선생님 행 first_question · 그 밖 ai.
 * - next: move wrap_up 이면 closing(마무리 제안 길), 아니면 none.
 * - stage · cause: 앞 아이 차례가 막힘이고 move 가 ask_again · easier_or_choices · model_repeat 이면 받침 행(질문 자리를 잇는다). cause 는 앞
 *   아이 차례의 까닭(지금 childCauseOf).
 * - ai · sound: 따라 할 문장을 들려줬으면 ai model_line(모든 단계), 1~3단계이고 문장이 말 칸에 그대로 들었으면 sound.model(글에서 빼 소리로
 *   내는 문장 — 4단계부터는 글로 남아 소리 줄을 두지 않는다). 막힌 뒤 고르기면 ai choices(1~3단계는 sound.model 과 함께, 4단계부터는 따라 할
 *   문장이 함께 있으면 model_line — 들은 도움은 어느 쪽이든 답 예시가 이긴다, heardHelpOf). 마무리 차례 · wrap_up 차례는 고르기가 아니다.
 * - lead: 읽기 · 갈래 · 따라 할 문장 대조 · 고르기 · 물음 문장과 말 칸의 단원 단어 + S1 이 채운 기록(extra).
 * 단원 단어 대조는 만남(metWordsIn)과 같다. 노린 단원 단어(words) · 카드 항목은 비운다(새 엔진에 카드 질문이 없다).
 */
export function leadTeacherMoveOf({
  response,
  prevChild,
  spec,
  closingSlot,
  firstQuestion,
  unitWords,
  lemmaOf,
  extra,
}: {
  response: LeadResponse;
  /** 이 선생님 행 바로 앞의 아이 행(없으면 null). */
  prevChild: Pick<TalkLessonChildTurn, "input" | "stuck" | "nospeech"> | null;
  spec: Pick<TalkLessonSpec, "band">;
  /** 앱이 정한 마무리 차례(지금 때 — 단계 규격 참고 턴 · 더 이야기하기 한 바퀴 끝). */
  closingSlot: boolean;
  /** 대화 토막의 첫 선생님 행. */
  firstQuestion: boolean;
  unitWords: readonly string[];
  lemmaOf: (surface: string) => string | undefined;
  extra?: LeadExtra;
}): TalkMove {
  const { reading, move, say } = response;
  const kind: TalkMoveKind = closingSlot
    ? "closing_slot"
    : firstQuestion
      ? "first_question"
      : "ai";
  const prevStuck = leadPrevStuckOf(prevChild);
  const low = isLowBand(spec);
  const model = leadModelOf({
    move,
    modelSentence: response.model_sentence,
    say,
  });
  const choices = leadChoicesOf({
    move,
    say,
    prevStuck,
    closing: closingSlot,
  });
  const ai: TalkMove["ai"] = choices
    ? model.given && !low
      ? "model_line"
      : "choices"
    : model.given
      ? "model_line"
      : "none";
  const lex = { unitWords, lemmaOf };
  const lead: TalkLead = {
    reading,
    move,
    asked: metWordsIn(questionsOfText(say).join(" "), lex),
    said: metWordsIn(say, lex),
    ...(model.sentence !== null && model.inSay !== null
      ? { model: { sentence: model.sentence, inSay: model.inSay } }
      : {}),
    ...(choices ? { choices: true as const } : {}),
    ...(extra ?? {}),
  };
  return talkMoveOf({
    kind,
    next: move === "wrap_up" ? "closing" : "none",
    stage: kind === "ai" ? supportStageOf(move, prevStuck) : 0,
    cause: prevChild === null ? null : childCauseOf(prevChild),
    ai,
    ...(low && model.sentence !== null && model.inSay === true
      ? { sound: { model: model.sentence } }
      : {}),
    lead,
  });
}

// ── 되물은 뒤의 답(설계 4 셋째 줄 · 02-2 259줄) ─────────────────────

/** 이 선생님 move 가 새 엔진의 되묻기인가(앞 아이 행의 ask_again 표지 · 다음 아이 행의 하한 이어 받기). 옛 행 · 지금 길 행은 아니다. */
export function isLeadAskAgain(move: TalkMove | null): boolean {
  return move?.lead?.move === "ask_again";
}

/** 아이 행의 힌트 칸(talk_turns 아이 행 hint_kind · hint_level · heard_help). */
export type LeadChildHelp = {
  hintKind: TalkHintKind;
  hintLevel: number;
  heardHelp: Exclude<TalkHeardHelp, "none"> | null;
};

const HINT_KIND_ORDER: readonly TalkHintKind[] = [
  "none",
  "meaning_only",
  "english",
];
const HEARD_HELP_ORDER: readonly (TalkHeardHelp | null)[] = [
  null,
  "two_answers",
  "answer_example",
];

/**
 * 되물은 뒤의 답 행(앞 선생님 move 가 ask_again): 되물은 아이 행의 힌트 종류 · 쓴 힌트 단 · 들은 도움을 하한으로 이어 받는다(02-2 259줄 —
 * 되묻기가 도움 기록을 지워 '말했다'를 만들지 않게). 칸마다 큰 쪽: 힌트 종류 없음 < 뜻만 < 영어, 들은 도움 없음 < 답 두 개 < 답 예시.
 */
export function leadAskAgainFloorOf(
  own: LeadChildHelp,
  asked: LeadChildHelp,
): LeadChildHelp {
  const hintKind =
    HINT_KIND_ORDER.indexOf(own.hintKind) >=
    HINT_KIND_ORDER.indexOf(asked.hintKind)
      ? own.hintKind
      : asked.hintKind;
  const heardHelp =
    HEARD_HELP_ORDER.indexOf(own.heardHelp) >=
    HEARD_HELP_ORDER.indexOf(asked.heardHelp)
      ? own.heardHelp
      : asked.heardHelp;
  return {
    hintKind,
    hintLevel: Math.max(own.hintLevel, asked.hintLevel),
    heardHelp,
  };
}

// ── 지금 판정(설계 4 다섯째 줄) ────────────────────────────────

/**
 * 이 아이 차례의 '말했다'(지금 판정 saidWordsOf 그대로): Claude 가 낸 후보(child_used_on_own)를 그대로 넘긴다 — 질문 문장에 든 낱말을 빼지
 * 않는다(검토 C-1 (가)). 말 입력이 아니거나 막힘인 차례는 빈 목록이다(설계 4 '막힘이면 그 차례 말했다 없음'). 선생님이 되물은 아이 차례
 * (askAgain — 다음 선생님 move 가 ask_again)도 빈 목록이다(정본 02-2 '되물은 차례는 말했다를 만들지 않는다', R2 검토 M-2).
 */
export function leadSaidWordsOf({
  candidates,
  heard,
  hintKind,
  speech,
  stuck,
  askAgain,
  unitWords,
  lemmaOf,
  homophones,
}: {
  candidates: readonly string[];
  heard: string;
  hintKind: TalkHintKind;
  speech: boolean;
  stuck: boolean;
  /** 이 아이 차례 뒤 선생님이 되물었다(아이 행 ask_again, isLeadAskAgain). */
  askAgain: boolean;
  unitWords: readonly string[];
  lemmaOf: (surface: string) => string | undefined;
  homophones: readonly (readonly string[])[];
}): string[] {
  if (!speech || stuck || askAgain) return [];
  return saidWordsOf({
    aiWords: candidates,
    heard,
    hintKind,
    unitWords,
    lemmaOf,
    homophones,
  });
}

// ── 정리 되짚을 말 출처(plan 확인할 것 9) ─────────────────────────

/**
 * 정리 토막 되짚을 말의 문장 출처(설계 3 · 우려 8): 새 엔진 응답에 recast 칸이 없으므로, 이 수업에서 앱이 확인한 따라 할 문장(lead.model 이
 * 맞음인 선생님 행)을 차례대로 돌려준다. 부르는 쪽(정리 · 쉬는 중 닫기)이 wrapUpLinesOf 의 recasts 자리에 넘긴다. 어긋난 문장 · 옛 행 ·
 * move 없는 행은 뺀다.
 */
export function leadWrapSourcesOf(
  rows: readonly { move?: unknown }[],
): string[] {
  const out: string[] = [];
  for (const row of rows) {
    const model = readTalkMove(row.move)?.lead?.model;
    if (model?.inSay === true && model.sentence.trim() !== "")
      out.push(model.sentence);
  }
  return out;
}

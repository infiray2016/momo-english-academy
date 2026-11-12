// 새 회화 엔진(N)의 단계에 맞는 말(spec '회화 Claude 주도' 설계 6 · 13절 C238 (3) · 분류 표 task-level-fit-report 4절, 묶음 R4).
// (나) 좁은 정의: 질문 문장 하나가 (ㄱ) 답 틀 꼴 · (ㄴ) 고르기 낱말 · (ㄷ) 축 기능어에 걸리는가. 걸리면 같은 뜻을 쉬운 말로 한 번 다시 받고,
// 다시 걸려도 · 받지 못해도 질문을 지우거나 다른 질문으로 바꾸지 않는다. 넓은 검사(지금 함수)는 수치만 내는 기록 전용이다.
// 순수 모듈이다. 낱말 · 형태 목록은 시드(vocab.json · lists/forms.json · talk-allowed-words.json)를 부르는 쪽이 넘기고, 기존 검사 함수
// (offbandWordsIn · formsIn)를 그대로 부른다. 지금 엔진의 질문 검사(question-check checkLowLevelQuestion)와 다시 쓰기(question-retry)는 쓰지 않는다.

import {
  CLOSED_CLASS_PASS_WORDS,
  isClosingQuestion,
  type LowLevelLineOptions,
  type OffbandExtra,
  offbandWordsIn,
  questionKeyOf,
  type SameQuestionHit,
  sameQuestionHit,
} from "@/core/conversation/question-check";
import { isQuestionSentence } from "@/core/conversation/stream";
import {
  expandContraction,
  type FormRule,
  formsIn,
  isEnglishSentence,
  type Lexicon,
  normalizeQuotes,
  resolveWord,
  sentenceWords,
  splitSentences,
  tokenize,
} from "@/core/seed/text";

// ── 좁은 정의의 꼴 상수(분류 표 4절 — 설계 숫자가 아닌 영어 문법 갈래) ───────────────

/**
 * (ㄱ) 답 틀 꼴: 아이의 답이 그 꼴을 되써야 하는 형태 id(분류 표 4절의 열아홉 꼴, forms.json 의 id). 3인칭 -s · to 부정사 · 시각 · 요일 ·
 * 목적격 · there is · let's 는 넣지 않는다('Who goes with you?' 의 답은 'My dad.').
 */
export const LEAD_ANSWER_FRAME_FORMS: ReadonlySet<string> = new Set([
  "does",
  "did",
  "past-be",
  "past-regular",
  "past-irregular",
  "present-progressive",
  "past-progressive",
  "will",
  "going-to",
  "want-to",
  "would-like",
  "have-to",
  "should",
  "must",
  "present-perfect",
  "comparative",
  "superlative",
  "used-to",
  "second-conditional",
]);

/** (ㄷ) 물음 낱말(분류 표 4절). 이 낱말로 시작하는 질문만 축 기능어를 본다. */
const QUESTION_WORDS: ReadonlySet<string> = new Set([
  "what",
  "where",
  "who",
  "which",
  "when",
  "how",
  "why",
]);

/**
 * (ㄴ) 선택지의 오른쪽 끝을 가르는 전치사(분류 표 4절 'or 오른쪽의 첫 전치사 앞까지'). 시드 vocab 의 품사는 전치사를 기능어(function)로
 * 묶어 가르지 못하므로 코드 상수로 둔다. 부사로도 쓰는 짝말(out · up · off · outside · inside · around · over · down)은 'go outside' 처럼
 * 선택지 안에 들므로 넣지 않는다.
 */
const CHOICE_END_PREPOSITIONS: ReadonlySet<string> = new Set([
  "about",
  "after",
  "at",
  "before",
  "behind",
  "between",
  "by",
  "during",
  "for",
  "from",
  "in",
  "into",
  "near",
  "of",
  "on",
  "to",
  "under",
  "until",
  "with",
  "without",
]);

/** (ㄷ) 축 기능어로 보는 품사와, 함께 있으면 빼는 품사(vocab.json pos — 'How are you today?' 의 today 는 명사라 빠진다). */
const AXIS_POS: ReadonlySet<string> = new Set(["function", "adverb"]);
const AXIS_SKIP_POS: ReadonlySet<string> = new Set(["noun", "pronoun"]);

const OR = "or";

// ── 입력 ─────────────────────────────────────────────────────────

/** 형태 표 한 줄(forms.json — FormRule 에 읽기 · 말하기 · 회화 차례가 처음 나오는 단계를 더함). */
export type LeadFormRule = FormRule & {
  introducedAt: { rst: { level: number } | null };
};

/** 좁은 정의 검사 재료(spec 설계 6 (나)). */
export type LeadLevelInput = {
  /** 회화 단계 L. */
  level: number;
  /**
   * 지금 범위 검사 재료(question-check LowLevelLineOptions — 단계 L 이하 어휘 · 단원 단어 · 아이가 이 수업에서 말한 낱말 · 선생님 이름 ·
   * 원형 찾기). 지금 offbandWordsIn 이 빼는 것이 '아는 낱말'의 바탕이다. forms 는 이 검사가 쓰지 않고 아래 forms 를 쓴다.
   */
  range: LowLevelLineOptions;
  /** 형태 표(forms.json 전부). (ㄱ)은 introducedAt.rst.level > L 인 답 틀 꼴만 본다. */
  forms: readonly LeadFormRule[];
  /** 모든 단계 어휘 사전(vocab.json 전부 — buildLexicon). (ㄴ) · (ㄷ)의 단계 · 품사와, 안내문 줄 낱말의 활용 꼴을 찾는다. */
  lexicon: Lexicon;
  /**
   * 안내문 목표 줄의 글(Topic 줄 · 'sentences like' 줄 — spec 설계 6 아는 낱말, 재검토 M2-4). 이 줄의 낱말과 그 활용 꼴은 아는 낱말이다
   * (weekends 같은 단원 주제 낱말).
   */
  promptLines: readonly string[];
  /** 허용 목록(talk-allowed-words.json allowed — 지금 1~3단계에서만 넘긴다, 우려 5). */
  allowed?: ReadonlySet<string> | undefined;
  /** 허용 낱말 대조의 모든 단계 원형 찾기(situation allowedLemmaOfVocab — 지금 길과 같은 대조, 없으면 규칙 활용 꼬리로 본다). */
  allowedLemmaOf?: ((surface: string) => string | undefined) | undefined;
};

/** 좁은 정의 걸림 하나: 갈래와 걸린 글(질문에 나온 꼴 · 낱말, 소문자). */
export type LeadNarrowHit =
  | { kind: "form"; id: string; text: string }
  | { kind: "choice"; text: string }
  | { kind: "axis"; text: string };

// ── 낱말 도구 ────────────────────────────────────────────────────

function lowerWords(text: string): string[] {
  return tokenize(text)
    .filter((t) => t.kind === "word")
    .map((t) => t.text.toLowerCase());
}

/** 시드 사전의 단계 · 품사(조각이 하나라도 시드에 없으면 null — '시드에 없는 낱말'). */
function seedEntryOf(
  word: string,
  lexicon: Lexicon,
): { level: number; pos: Set<string> } | null {
  const parts = resolveWord(word, lexicon);
  if (parts.length === 0 || parts.some((p) => p.ids.length === 0)) return null;
  let level = 0;
  const pos = new Set<string>();
  for (const part of parts) {
    let partLevel = Number.POSITIVE_INFINITY;
    for (const id of part.ids) {
      const entry = lexicon.entries.get(id);
      if (entry === undefined) continue;
      partLevel = Math.min(partLevel, entry.level);
      for (const p of entry.pos) pos.add(p);
    }
    if (partLevel === Number.POSITIVE_INFINITY) return null;
    level = Math.max(level, partLevel);
  }
  return { level, pos };
}

/** 안내문 줄의 낱말과 그 원형 · 원형의 활용 꼴(시드 사전에 있으면). */
function promptWordsOf(
  lines: readonly string[],
  lexicon: Lexicon,
): Set<string> {
  const out = new Set<string>();
  for (const word of lines.flatMap(lowerWords)) {
    out.add(word);
    for (const part of resolveWord(word, lexicon))
      for (const id of part.ids) {
        const entry = lexicon.entries.get(id);
        if (entry === undefined) continue;
        out.add(entry.word.toLowerCase());
        for (const form of entry.forms) out.add(form.toLowerCase());
      }
  }
  return out;
}

/** 아는 낱말 밖의 낱말(지금 offbandWordsIn 에 안내문 목표 줄 낱말 · 허용 목록을 더한 것, 소문자 · 차례대로). */
function unknownWordsIn(sentence: string, input: LeadLevelInput): string[] {
  const allowed = new Set<string>([
    ...(input.allowed ?? []),
    ...promptWordsOf(input.promptLines, input.lexicon),
  ]);
  const extra: OffbandExtra = { allowed };
  if (input.allowedLemmaOf !== undefined)
    extra.allowedLemmaOf = input.allowedLemmaOf;
  return offbandWordsIn(sentence, input.range, extra);
}

/** 위 단계(L 보다 높음)이거나 시드에 없는 낱말인가. */
function aboveOrUnseeded(word: string, input: LeadLevelInput): boolean {
  const entry = seedEntryOf(word, input.lexicon);
  return entry === null || entry.level > input.level;
}

// ── (ㄱ) 답 틀 꼴 ────────────────────────────────────────────────

/** 형태가 문장에 나온 글(낱말 목록이면 그 낱말, 정규식이면 맞은 글 — 다시 말하기 요청 글에 넣는다). 못 찾으면 id. */
function formTextOf(sentence: string, form: FormRule): string {
  const lower = normalizeQuotes(sentence).toLowerCase();
  const tokens = lowerWords(lower).join(" ");
  for (const word of form.words) {
    const w = lowerWords(word).join(" ");
    if (w !== "" && ` ${tokens} `.includes(` ${w} `)) return w;
  }
  for (const pattern of form.patterns) {
    const hit = new RegExp(pattern, "iu").exec(lower)?.[0]?.trim();
    if (hit !== undefined && hit !== "") return hit;
  }
  return form.id;
}

function frameHits(sentence: string, input: LeadLevelInput): LeadNarrowHit[] {
  const above = input.forms.filter(
    (f) =>
      LEAD_ANSWER_FRAME_FORMS.has(f.id) &&
      f.introducedAt.rst !== null &&
      f.introducedAt.rst.level > input.level,
  );
  return formsIn(sentence, above).flatMap((id) => {
    const form = above.find((f) => f.id === id);
    return form === undefined
      ? []
      : [{ kind: "form" as const, id, text: formTextOf(sentence, form) }];
  });
}

// ── (ㄴ) 고르기 낱말 ──────────────────────────────────────────────

/**
 * 'or' 질문의 선택지 낱말(분류 표 4절): 'or' 오른쪽은 첫 전치사 앞까지, 왼쪽은 'or' 바로 앞에서 같은 낱말 수만큼이고, 양쪽에 다 있는 낱말
 * (a lot)은 뺀다. 오른쪽이 전치사로 시작하면('… in the park or in the sea?') 그 전치사부터 다음 전치사 앞까지를 오른쪽으로 본다.
 */
export function leadChoiceWordsOf(sentence: string): string[] {
  const words = lowerWords(sentence);
  const out: string[] = [];
  words.forEach((word, at) => {
    if (word !== OR || at === 0) return;
    const right: string[] = [];
    for (let i = at + 1; i < words.length; i++) {
      const w = words[i] ?? "";
      if (w === OR) break;
      if (CHOICE_END_PREPOSITIONS.has(w) && right.length > 0) break;
      right.push(w);
    }
    if (right.length === 0) return;
    const left = words.slice(Math.max(0, at - right.length), at);
    const both = new Set(left.filter((w) => right.includes(w)));
    for (const w of [...left, ...right])
      if (!both.has(w) && !out.includes(w)) out.push(w);
  });
  return out;
}

function choiceHits(
  sentence: string,
  unknown: readonly string[],
  input: LeadLevelInput,
): LeadNarrowHit[] {
  const choices = leadChoiceWordsOf(sentence);
  if (choices.length === 0) return [];
  return unknown
    .filter((w) => choices.includes(w) && aboveOrUnseeded(w, input))
    .map((text) => ({ kind: "choice" as const, text }));
}

// ── (ㄷ) 축 기능어 ────────────────────────────────────────────────

function startsWithQuestionWord(sentence: string): boolean {
  const first = lowerWords(sentence)[0];
  if (first === undefined) return false;
  const head = expandContraction(first)[0] ?? first;
  return QUESTION_WORDS.has(head);
}

function axisHits(
  sentence: string,
  unknown: readonly string[],
  input: LeadLevelInput,
): LeadNarrowHit[] {
  if (!startsWithQuestionWord(sentence)) return [];
  return unknown
    .filter((w) => {
      if (QUESTION_WORDS.has(w)) return false;
      const entry = seedEntryOf(w, input.lexicon);
      if (entry === null || entry.level <= input.level) return false;
      const pos = [...entry.pos];
      return (
        pos.some((p) => AXIS_POS.has(p)) &&
        !pos.some((p) => AXIS_SKIP_POS.has(p))
      );
    })
    .map((text) => ({ kind: "axis" as const, text }));
}

// ── 좁은 정의 ────────────────────────────────────────────────────

/**
 * 문장 하나의 좁은 정의 걸림(spec 설계 6 (나)). 물음표 문장만 보고(반응 · 감탄 · 다시 말해 달라는 말은 빈 목록), 앱 고정 마무리 물음
 * ('Do you want to talk more?')도 빈 목록이다. 마무리 차례 · move wrap_up 차례의 물음은 부르는 쪽이 넘기지 않는다(재검토 M2-1).
 * 여러 문장이 들어오면 마무리 물음이 아닌 마지막 물음표 문장만 본다(반응 속 낱말이 걸리거나 반응 뒤 질문을 놓치지 않게, 검토 R4 Minor 2).
 */
export function leadNarrowHitsOf(
  text: string,
  input: LeadLevelInput,
): LeadNarrowHit[] {
  const sentence = splitSentences(text)
    .filter((s) => isQuestionSentence(s) && !isClosingQuestion(s))
    .at(-1);
  if (sentence === undefined) return [];
  const unknown = unknownWordsIn(sentence, input);
  const out: LeadNarrowHit[] = [...frameHits(sentence, input)];
  const seen = new Set(out.map((h) => h.text));
  for (const hit of [
    ...choiceHits(sentence, unknown, input),
    ...axisHits(sentence, unknown, input),
  ])
    if (!seen.has(hit.text)) {
      seen.add(hit.text);
      out.push(hit);
    }
  return out;
}

/** 다시 말하기 요청 글과 기록(move.lead.narrow.item)에 쓰는 걸린 항목 글(걸린 글을 차례대로 ', ' 로 이음). */
export function leadNarrowItemOf(hits: readonly LeadNarrowHit[]): string {
  return hits.map((h) => h.text).join(", ");
}

/**
 * 다시 말하기 요청 글(spec 설계 6 (나)의 글 그대로): 같은 질문을 같은 뜻으로 더 쉬운 말로, 그 질문만. 다른 것을 물으라는 지시는 넣지 않는다.
 */
export function leadNarrowRetryPrompt(
  sentence: string,
  hits: readonly LeadNarrowHit[],
): string {
  return `Your question "${sentence.trim()}" uses "${leadNarrowItemOf(hits)}", which may be hard for this child. Say the same question again in easier words, with the same meaning. Output only that question.`;
}

/** 양끝을 감싼 따옴표 짝(곧은 · 굽은). 한 겹만 벗긴다. */
const WRAP_QUOTES: readonly (readonly [string, string])[] = [
  ['"', '"'],
  ["'", "'"],
  ["“", "”"],
  ["‘", "’"],
];

/**
 * 다시 받은 글에 남아도 되는 글자: 영어 글자 · 숫자 · 빈칸 · 보통의 문장 부호(쉼표 · 마침표 · 느낌표 · 물음표 · 줄임 따옴표 · 붙임표)뿐이다.
 * 중괄호 · 대괄호 · 괄호 · 백틱 · 큰따옴표 · 콜론 · 줄바꿈 · 한글은 여기에 없으므로 JSON · 감싼 글 · 칸 이름 · 한국어 물음은 받지 않는다(검토 R4 Critical 1).
 */
const PLAIN_ENGLISH_QUESTION = /^[A-Za-z0-9 ,.!?'’-]+\?$/;

function unwrapQuotesOnce(text: string): string {
  for (const [open, close] of WRAP_QUOTES)
    if (
      text.length > open.length + close.length &&
      text.startsWith(open) &&
      text.endsWith(close)
    )
      return text.slice(open.length, text.length - close.length).trim();
  return text;
}

/**
 * 다시 받은 글을 쓸 수 있는 꼴인가(spec 설계 6 (나) 받는 조건의 꼴 몫 · 'Output JSON only' 지시와 부딪히지 않게). 앞뒤 빈칸을 떼고 양끝을
 * 감싼 따옴표 한 겹을 벗긴 글이 영어 글자와 보통의 문장 부호로만 된, 물음표로 끝나는 한 문장일 때만 그 문장을 낸다. 비었거나 JSON · 괄호 ·
 * 대괄호 · 백틱 · 콜론 칸 이름 · 줄바꿈 · 한글이 있거나 두 문장('반응 + 질문')이거나 물음표로 끝나지 않으면 null(원래 질문을 그대로 내보냄).
 * 안전 검사는 부르는 쪽(서버 문장 문)의 몫이다.
 */
export function leadNarrowRetryAccepted(
  text: string | null | undefined,
): string | null {
  const only = unwrapQuotesOnce((text ?? "").trim());
  if (!PLAIN_ENGLISH_QUESTION.test(only) || !isEnglishSentence(only))
    return null;
  if (splitSentences(only).length !== 1) return null;
  return isQuestionSentence(only) ? only : null;
}

/** 다시 말하기 한 번의 끝(spec 설계 6 (나) · (다)). */
export type LeadNarrowOutcome = {
  /** 아이에게 나갈 질문 문장(다시 받은 문장이거나 원래 질문 — 지우지도, 다른 질문으로 바꾸지도 않는다). */
  sentence: string;
  /** 받은 다시 말한 문장(받는 조건을 지나지 못했으면 ""). */
  retry: string;
  /** 다시 받은 문장이 또 좁은 정의에 걸렸다(그래도 그대로 나간다). */
  again: boolean;
};

/**
 * 원래 질문과 다시 받은 글(비었거나 오류 · 시간 넘음이면 null)로 나갈 문장을 정한다. 받는 꼴(leadNarrowRetryAccepted)을 지나고 부르는 쪽의
 * 안전 검사(passes, 서버 문장 문 — 필수, 검토 R4 Minor 3)를 지나면 그 문장, 아니면 원래 질문이다. 다시 걸려도 다시 받은 문장을 그대로 낸다(한 번만).
 */
export function leadNarrowOutcomeOf({
  original,
  received,
  input,
  passes,
}: {
  original: string;
  received: string | null | undefined;
  input: LeadLevelInput;
  passes: (sentence: string) => boolean;
}): LeadNarrowOutcome {
  const accepted = leadNarrowRetryAccepted(received);
  if (accepted === null || !passes(accepted))
    return { sentence: original, retry: "", again: false };
  return {
    sentence: accepted,
    retry: accepted,
    again: leadNarrowHitsOf(accepted, input).length > 0,
  };
}

// ── 넓은 검사(기록 전용) ───────────────────────────────────────────

/** 넓은 검사 재료(지금 함수 그대로). */
export type LeadWideInput = {
  /** 지금 범위 검사 재료(질문 검사와 같은 범위 — 형태 표 · 그 단계 · 단원까지 쓸 수 있는 형태 포함). */
  range: LowLevelLineOptions;
  /** 범위 밖 낱말 셈의 덧붙임(허용 목록 · 원형 찾기, 지금 길과 같게). */
  extra?: OffbandExtra | undefined;
  /** 선생님 한 차례 문장 상한(talk.teacher_sentences_max.<구간>). */
  sentenceMax: number;
  /** 같은 질문 재료(있으면 셈 — question-check sameQuestionHit). */
  same?:
    | {
        blocked: readonly string[];
        asked: ReadonlyMap<string, number>;
        max: number;
      }
    | undefined;
};

/** 넓은 검사 수치의 칸 이름(move.lead.wide 의 열쇠). */
export type LeadWideKey =
  | "sentences"
  | "overSentenceMax"
  | "longSentences"
  | "maxWords"
  | "offbandWords"
  | "offbandForms"
  | "questionsHit"
  | "sameQuestion";

const SAME_HIT_CODE: Readonly<Record<SameQuestionHit, number>> = {
  after_stuck: 1,
  max: 2,
};

/**
 * 나간 말 전체의 넓은 검사 수치(spec 설계 6 '넓은 검사는 기록 전용' — 문장 수 · 문장 길이 · 범위 밖 낱말 · 범위 밖 형태 · 같은 질문 열쇠). 걸러
 * 내거나 고치지 않고 수만 낸다. 범위 밖 낱말은 문장마다 지금 셈(offbandWordsIn, 범위 밖이 닫힌 품사 한 낱말뿐인 문장은 뺌)이고 같은 낱말은 한
 * 번, 범위 밖 형태는 formsIn 가운데 그 단계 · 단원에 아직 쓸 수 없는 형태 id 수다. questionsHit 은 낱말 · 형태가 걸린 물음표 문장 수(마무리
 * 물음 뺌), sameQuestion 은 마지막 질문이 같은 질문에 걸렸는지(0 없음 · 1 막힌 뒤 · 2 상한, same 이 없으면 칸 없음)다. 참 · 거짓은 1 · 0 이다.
 */
export function leadWideCheckOf(
  text: string,
  input: LeadWideInput,
): Partial<Record<LeadWideKey, number>> {
  const { range } = input;
  const sentences = splitSentences(text).filter((s) => isEnglishSentence(s));
  const offband: string[] = [];
  const forms: string[] = [];
  let questionsHit = 0;
  let longSentences = 0;
  let maxWords = 0;
  for (const s of sentences) {
    const words = sentenceWords(s);
    maxWords = Math.max(maxWords, words);
    if (words > range.sentenceMaxWords) longSentences++;
    const off = offbandWordsIn(s, range, input.extra);
    const closedOnly =
      off.length === 1 && CLOSED_CLASS_PASS_WORDS.has(off[0] ?? "");
    const offHere = closedOnly ? [] : off;
    for (const w of offHere) if (!offband.includes(w)) offband.push(w);
    const formsHere = formsIn(s, range.forms).filter(
      (id) => !range.allowedForms.has(id),
    );
    for (const id of formsHere) if (!forms.includes(id)) forms.push(id);
    if (
      isQuestionSentence(s) &&
      !isClosingQuestion(s) &&
      (offHere.length > 0 || formsHere.length > 0)
    )
      questionsHit++;
  }
  const out: Partial<Record<LeadWideKey, number>> = {
    sentences: sentences.length,
    overSentenceMax: sentences.length > input.sentenceMax ? 1 : 0,
    longSentences,
    maxWords,
    offbandWords: offband.length,
    offbandForms: forms.length,
    questionsHit,
  };
  if (input.same !== undefined) {
    const question = sentences
      .filter((s) => isQuestionSentence(s) && !isClosingQuestion(s))
      .at(-1);
    const hit =
      question === undefined || questionKeyOf(question) === ""
        ? null
        : sameQuestionHit({ question, ...input.same });
    out.sameQuestion = hit === null ? 0 : SAME_HIT_CODE[hit];
  }
  return out;
}

export { unknownWordsIn as leadUnknownWordsIn };

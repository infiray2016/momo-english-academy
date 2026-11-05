// 말하기 질문 답의 의미 검사(델타 spec 2026-10-29 가르치고 배우는 수업 설계 8 '의미 검사', C182 (1)).
// 문자열 일치율만으로 뜻이 맞다고 보지 않으려고, 방향 · 핵심 정보 · 부정 · 틀린 정보 넷을 먼저 본다.
// 정규화는 6.2 일치율과 같은 것(normalizeForMatch: 소문자 · 축약 펼침 · 문장 부호 빼기 · 동음이의어 묶음)을 쓰고,
// 어휘 목록의 기본형과 forms 는 같은 낱말로 본다. 핵심 낱말은 품사에 function · pronoun 이 없는 낱말(어휘 목록에 없는 이름도 핵심)이다.
// 검증기(시드의 바른 답 · 허용 답)와 판정(아이 답, 묶음 다)이 같이 쓴다. DB · 브라우저 없는 순수 함수다.
// 이 규칙은 3단계 단원 1~4 의 Do 질문 꼴에 맞춘 것이고, 다른 질문 꼴은 그 묶음 표본에서 정한다(설계 3).
import { normalizeForMatch } from "@/core/speech/match-rate";

/** 판정 결과(plan 이름 표 judge.meaning). */
export type MeaningVerdict =
  | "ok"
  | "direction"
  | "key"
  | "negated"
  | "wrong_info";

/** 낱말 품사 표 한 줄(어휘 목록 vocab 행과 같은 꼴의 일부, plan 정한 것 7 — 세션 자료가 싣는 표와 검증기가 읽는 vocab 이 같다). */
export type MeaningWord = {
  word: string;
  pos: readonly string[];
  forms: readonly string[];
};

export type MeaningInput = {
  /** 질문 글(Do … ?). */
  question: string;
  /** 바른 답(시드 modelAnswer). */
  modelAnswer: string;
  /** 견줄 답(아이 답이나 시드 허용 답). */
  answer: string;
  /** 낱말 품사 표. */
  words: readonly MeaningWord[];
  /** 동음이의어 묶음(6.2 일치율과 같은 묶음). */
  homophones: readonly (readonly string[])[];
};

/** 질문 글 · 바른 답에서 뽑은 정보(검증기의 '아니요 질문에는 틀린 정보 낱말이 있다' 검사가 쓴다). */
export type MeaningFrame = {
  /** 바른 답의 방향(yes · no, 없으면 undefined). */
  direction: "yes" | "no" | undefined;
  /** 바른 답의 핵심 낱말(they 뒤, 기본형). */
  answerCore: string[];
  /** 바로잡은 정보: 바른 답 핵심 낱말 가운데 질문에 없는 것. */
  corrected: string[];
  /** 틀린 정보: 질문 핵심 낱말 가운데 바른 답에 없는 것. */
  wrong: string[];
};

const YES = "yes";
const NO = "no";
const NOT = "not";
const DO_WORDS = ["do", "does", "did"];
/** 바른 답에서 누가 자리를 넘기는 낱말(설계 8 'they 뒤'). */
const ANSWER_SUBJECT = "they";
/** 예 질문에서 무엇 자리를 받는 대명사(설계 8 'it · them 으로 받아도 된다'). */
const OBJECT_PRONOUNS = ["it", "them"];
/** not 의 범위를 닫는 낱말(설계 8 '다음 and · but · 대명사 앞까지'). */
const SCOPE_CLOSERS = ["and", "but"];
const FUNCTION = "function";
const PRONOUN = "pronoun";
const VERB = "verb";

type Lexicon = {
  lemma(token: string): string;
  pos(token: string): readonly string[];
};

function lexiconOf(words: readonly MeaningWord[]): Lexicon {
  const lemmas = new Map<string, string>();
  const posOf = new Map<string, readonly string[]>();
  for (const w of words) {
    const base = w.word.toLowerCase();
    posOf.set(base, w.pos);
    for (const surface of [w.word, ...w.forms]) {
      const key = surface.toLowerCase();
      if (!lemmas.has(key)) lemmas.set(key, base);
    }
  }
  const lemma = (token: string) => lemmas.get(token) ?? token;
  return { lemma, pos: (token) => posOf.get(lemma(token)) ?? [] };
}

function isCore(token: string, lex: Lexicon): boolean {
  const pos = lex.pos(token);
  return !pos.includes(FUNCTION) && !pos.includes(PRONOUN);
}

function directionOf(tokens: readonly string[]): "yes" | "no" | undefined {
  const first = tokens.find((t) => t === YES || t === NO);
  return first === YES ? "yes" : first === NO ? "no" : undefined;
}

/** 바른 답에서 they 뒤(없으면 첫 yes · no 뒤, 그것도 없으면 처음부터)의 핵심 낱말(기본형). */
function answerCoreOf(tokens: readonly string[], lex: Lexicon): string[] {
  let from = tokens.indexOf(ANSWER_SUBJECT);
  if (from < 0) from = tokens.findIndex((t) => t === YES || t === NO);
  return unique(
    tokens
      .slice(from + 1)
      .filter((t) => isCore(t, lex))
      .map(lex.lemma),
  );
}

/** 질문에서 do 뒤 첫 동사(하는 일)부터의 핵심 낱말(기본형). 누가 자리(이름)는 빠진다. */
function questionCoreOf(tokens: readonly string[], lex: Lexicon): string[] {
  const doAt = tokens.findIndex((t) => DO_WORDS.includes(t));
  const after = tokens.slice(doAt + 1);
  const verbAt = after.findIndex(
    (t) => lex.pos(t).includes(VERB) && !DO_WORDS.includes(lex.lemma(t)),
  );
  return unique(
    after
      .slice(Math.max(verbAt, 0))
      .filter((t) => isCore(t, lex))
      .map(lex.lemma),
  );
}

function unique(list: readonly string[]): string[] {
  return [...new Set(list)];
}

/** not 의 범위 안 낱말 자리(not 뒤에서 다음 and · but · 대명사 앞까지). */
function negatedIndexes(tokens: readonly string[], lex: Lexicon): Set<number> {
  const out = new Set<number>();
  tokens.forEach((t, i) => {
    if (t !== NOT) return;
    for (let j = i + 1; j < tokens.length; j++) {
      const next = tokens[j] ?? "";
      if (SCOPE_CLOSERS.includes(next) || lex.pos(next).includes(PRONOUN))
        break;
      out.add(j);
    }
  });
  return out;
}

/** 질문 · 바른 답에서 방향 · 핵심 낱말 · 바로잡은 정보 · 틀린 정보를 뽑는다. */
export function meaningFrame(
  input: Omit<MeaningInput, "answer">,
): MeaningFrame {
  const lex = lexiconOf(input.words);
  const model = normalizeForMatch(input.modelAnswer, input.homophones);
  const question = normalizeForMatch(input.question, input.homophones);
  const answerCore = answerCoreOf(model, lex);
  const questionCore = questionCoreOf(question, lex);
  return {
    direction: directionOf(model),
    answerCore,
    corrected: answerCore.filter((w) => !questionCore.includes(w)),
    wrong: questionCore.filter((w) => !answerCore.includes(w)),
  };
}

/**
 * 답 하나의 의미 검사(설계 8). 넷을 차례로 보고 처음 어긋난 것을 낸다.
 * (가) direction: 처음 나오는 yes · no 가 바른 답의 방향과 같다(없어도 된다).
 * (나) key: 바른 답의 핵심 낱말이 모두 있다. 예 질문은 do 로 받거나 무엇을 it · them 으로 받아도 된다.
 * (다) negated: not 의 범위에 바로잡은 정보가 없고, 예 질문에는 not 이 없다.
 * (라) wrong_info: 틀린 정보 낱말은 not 의 범위 안에서만 나온다.
 */
export function checkMeaning(input: MeaningInput): MeaningVerdict {
  const lex = lexiconOf(input.words);
  const frame = meaningFrame(input);
  const tokens = normalizeForMatch(input.answer, input.homophones);
  const lemmas = tokens.map(lex.lemma);
  const direction = directionOf(tokens);
  if (
    direction !== undefined &&
    frame.direction !== undefined &&
    direction !== frame.direction
  )
    return "direction";
  const has = (w: string) => lemmas.includes(w);
  const allCore = frame.answerCore.every(has);
  if (!allCore) {
    const yesQuestion = frame.direction === "yes";
    const verbs = frame.answerCore.filter((w) => lex.pos(w).includes(VERB));
    const byDo = lemmas.some((w) => DO_WORDS.includes(w));
    const byPronoun =
      verbs.every(has) && tokens.some((t) => OBJECT_PRONOUNS.includes(t));
    if (!(yesQuestion && (byDo || byPronoun))) return "key";
  }
  const negated = negatedIndexes(tokens, lex);
  if (frame.direction === "yes" && tokens.includes(NOT)) return "negated";
  if (lemmas.some((w, i) => negated.has(i) && frame.corrected.includes(w)))
    return "negated";
  if (lemmas.some((w, i) => !negated.has(i) && frame.wrong.includes(w)))
    return "wrong_info";
  // (마) 덧붙인 정보: 답의 핵심 낱말 가운데 질문 · 바른 답 어디에도 없는 낱말이 not 범위 밖에 있으면 틀린 정보다
  // (이름은 질문에 있으므로 통과, C187 · C182 (1) 범위 안 보완).
  const seen = new Set(
    [
      ...normalizeForMatch(input.question, input.homophones),
      ...normalizeForMatch(input.modelAnswer, input.homophones),
    ].map(lex.lemma),
  );
  if (
    lemmas.some(
      (w, i) => !negated.has(i) && isCore(tokens[i] ?? w, lex) && !seen.has(w),
    )
  )
    return "wrong_info";
  return "ok";
}

/**
 * 판정에 실을 낱말 품사 표(plan 정한 것 7): 수업 글(질문 · 바른 답 · 허용 답 · 이야기 …)에 나온 낱말의 어휘 목록 행과,
 * 어휘 목록의 function · pronoun 행 전부. 아이 답의 대명사 · 기능어(she · we · not · and …)가 표에 없어 not 범위가 닫히지 않는 일이
 * 없게 한다. 그래서 이 표의 판정은 전체 어휘 목록의 판정과 같다(아이 답의 낯선 내용 낱말은 두 쪽 모두 핵심 낱말이다).
 */
export function meaningWordsFor(
  lessonTexts: readonly string[],
  vocab: readonly MeaningWord[],
  homophones: readonly (readonly string[])[] = [],
): MeaningWord[] {
  const tokens = new Set(
    lessonTexts.flatMap((text) => normalizeForMatch(text, homophones)),
  );
  return vocab.filter(
    (w) =>
      w.pos.includes(FUNCTION) ||
      w.pos.includes(PRONOUN) ||
      [w.word, ...w.forms].some((f) => tokens.has(f.toLowerCase())),
  );
}

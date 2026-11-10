// 아이 말 갈래와 막힘 판정(13절 C204 (1)~(3) 컨트롤러 잠정, 대본 2회차 설계 검토 C-1). 회화 턴 응답의 child_kind 칸(AI 가 먼저 정함)과 인식 글로
// 앱이 막힘을 다시 본다: 막힘은 '못 알아들었다' · '질문과도 장면과도 관계없는 한두 낱말'에만 쓰고(02-2 251), 뜻이 통하는 영어 말은 답이나 아이
// 이야기로 받는다(02-2 194 · 196). 앱은 막힘을 무르기만 한다(AI 가 막힘이 아니라고 한 말을 막힘으로 바꾸지 않음). 순수 모듈이다.
import { normalizeSpoken } from "@/core/conversation/spoken";

/** 회화 턴 응답 child_kind 칸의 값(답 · 새 이야기 · 질문 · 장면에 닿는 짧은 말 · 못 알아들음 · 관계없는 낱말). */
export const TALK_CHILD_KINDS = [
  "answer",
  "new_topic",
  "short_related",
  "not_understood",
  "unrelated_words",
] as const;
export type TalkChildKind = (typeof TALK_CHILD_KINDS)[number];

/** 막힘으로 세는 갈래(C204 (1)). 그 밖의 갈래는 AI 가 막힘이라 해도 막힘이 아니다. */
export const STUCK_CHILD_KINDS: ReadonlySet<TalkChildKind> = new Set([
  "not_understood",
  "unrelated_words",
]);

/** 영어 말로 보는 가장 적은 낱말 수(C204 (3) 앱 안전망 '영어 낱말 2개 이상의 문장' — 설계 숫자가 아닌 판정 기준). 갈래가 비었을 때 쓴다. */
export const ENGLISH_SAYING_MIN_WORDS = 2;
/**
 * 갈래와 관계없이 막힘이 아닌 영어 말의 가장 적은 낱말 수(02-2 251 '한두 낱말' 밖 — 검토 rev-prompt-2 D, 설계 숫자가 아닌 판정 기준). 두 낱말
 * ('Blue car.')은 갈래가 정한다.
 */
export const ENGLISH_SENTENCE_MIN_WORDS = 3;

/** 모름 · 못 알아들음 표현(정규화 글, 낱말 경계로 든다 — C204 (3)). */
const DONT_KNOW_PHRASES = [
  "I don't know",
  "I dont know",
  "don't know",
  "dont know",
  "no idea",
  "not sure",
  "I don't understand",
  "I dont understand",
  "say again",
  "one more time",
].map((p) => normalizeSpoken(p));
/** 홀로 쓰면 못 알아들었다는 말(이 낱말들로만 된 짧은 말). */
const DONT_KNOW_WORDS = new Set([
  "huh",
  "what",
  "pardon",
  "sorry",
  "eh",
  "hm",
  "hmm",
]);

/** 갈래 값으로 읽는다(모르는 값 · 빈 값은 undefined). */
export function childKindOf(value: unknown): TalkChildKind | undefined {
  return typeof value === "string" &&
    (TALK_CHILD_KINDS as readonly string[]).includes(value)
    ? (value as TalkChildKind)
    : undefined;
}

/** 모름 · 못 알아들음 표현인가(정규화 글에 모름 구가 들거나, 모름 낱말로만 되어 있음). */
export function isDontKnowSaying(text: string): boolean {
  const n = normalizeSpoken(text);
  if (n === "") return false;
  if (DONT_KNOW_PHRASES.some((p) => ` ${n} `.includes(` ${p} `))) return true;
  return n.split(" ").every((w) => DONT_KNOW_WORDS.has(w));
}

/**
 * 뜻이 통하는 영어 말로 보는가(C204 (3) 앱 안전망): 영어 낱말이 ENGLISH_SAYING_MIN_WORDS 개 이상이고 모름 표현이 아니다. 한국어만 · 한 낱말 ·
 * 'I don't know.' · 'Huh what?' 은 아니다.
 */
export function isEnglishSaying(
  text: string,
  minWords: number = ENGLISH_SAYING_MIN_WORDS,
): boolean {
  const words = normalizeSpoken(text)
    .split(" ")
    .filter((w) => /^[a-z]+$/.test(w));
  return words.length >= minWords && !isDontKnowSaying(text);
}

/**
 * 앱이 보는 막힘(C204 (3)): 말 입력 턴에서 AI 의 막힘 판단(aiStuck)을 무르기만 한다. 인식 글이 영어 낱말 ENGLISH_SENTENCE_MIN_WORDS 개 이상의
 * 말이고 모름 표현이 아니면 갈래와 관계없이 막힘이 아니다(검토 rev-prompt-2 D — 앱 셈이 AI 갈래에 기대지 않게). 그보다 짧으면 갈래가 있을 때
 * 막힘 갈래(못 알아들음 · 관계없는 낱말)일 때만 막힘이고('Blue car.' 는 갈래가 정함), 갈래가 비었거나 모르는 값이면 영어 낱말 둘 이상의 말인지로
 * 본다. 말 입력이 아니면(단추 · 들리지 않음) AI 판단을 쓰지 않으므로 그대로 돌려준다. 맞바꿈: 한국어 말이 영어 낱말 셋 이상으로 잘못 인식되면 무른다.
 */
export function effectiveStuckOf({
  aiStuck,
  childKind,
  child,
  input,
  sceneWords,
  homophones,
}: {
  aiStuck: boolean;
  childKind: TalkChildKind | undefined;
  child: string;
  input: string;
  /**
   * 질문 · 오늘 장면 · 카드의 내용 낱말(소문자). 영어 낱말 한두 개의 말에 이 낱말이 들면 질문 · 장면에 닿는 짧은 말(short_related)이라 막힘이
   * 아니다('Big fish.' — 대본 4회차 설계 재판정 · 'Rice.' — 대본 회차 r1 판정 I-4, 13절 C204 (2) '낱말 하나도 닿으면 답'). 없으면 이 조건을
   * 보지 않는다.
   */
  sceneWords?: ReadonlySet<string>;
  /**
   * 동음이의어 묶음(시드 lists/homophones.json). 주면 장면 낱말 대조를 같은 소리 낱말까지 넓힌다 — 맞는 답 'sea' 가 'See' 로 들린 한 낱말 말을
   * 막힘으로 세지 않는다(13절 C217 (1) · 분석 A2). 없으면 글자 그대로만 본다.
   */
  homophones?: readonly (readonly string[])[];
}): boolean {
  if (!aiStuck || input !== "speech") return aiStuck;
  if (isEnglishSaying(child, ENGLISH_SENTENCE_MIN_WORDS)) return false;
  if (sceneWords !== undefined && touchesScene(child, sceneWords, homophones))
    return false;
  if (childKind !== undefined) return STUCK_CHILD_KINDS.has(childKind);
  return !isEnglishSaying(child);
}

/**
 * 아이 말이 '내용 있는 말'인가(1~3단계 사용자 메시지 'Child said more', 02-2 3.3 말 길이와 자기 이야기 · spec 설계 3 [I-2]): 영어 낱말
 * ENGLISH_SENTENCE_MIN_WORDS 개 이상이고 모름 표현이 아닌 말이거나, 느낌 낱말(시드 목록 talk-allowed-words feeling — happy · tired · fun 꼴)이 든
 * 말이다. 느낌 낱말은 표기형을 원형으로 바꿔 본다(lemmaOf, 없으면 소문자 그대로). 'Rice.' · 'Big fish.' 는 아니고 'Happy!' 는 그렇다.
 */
export function childSaidMoreOf(
  text: string,
  feelingWords: readonly string[],
  lemmaOf: (surface: string) => string | undefined,
): boolean {
  if (isEnglishSaying(text, ENGLISH_SENTENCE_MIN_WORDS)) return true;
  const feelings = new Set(feelingWords.map((w) => w.toLowerCase()));
  if (feelings.size === 0) return false;
  return normalizeSpoken(text)
    .split(" ")
    .filter((w) => /^[a-z]+$/.test(w))
    .some(
      (w) => feelings.has(w) || feelings.has((lemmaOf(w) ?? "").toLowerCase()),
    );
}

/** 이 낱말들은 장면 낱말로 세지 않는다(기능어 · 대답 말 — 'Yes it.' 이 장면에 닿는다고 보지 않게). */
const NOT_SCENE_WORDS = new Set([
  // 진행 · 지시 말(카드 글에 섞이는 흔한 말 — 검토 rev-prompt-2 P3-5)
  "one",
  "now",
  "time",
  "more",
  "can",
  "me",
  "let",
  "lets",
  "here",
  "there",
  "today",
  "a",
  "an",
  "the",
  "i",
  "you",
  "it",
  "we",
  "he",
  "she",
  "they",
  "my",
  "your",
  "is",
  "am",
  "are",
  "do",
  "does",
  "yes",
  "no",
  "and",
  "or",
  "to",
  "in",
  "on",
  "at",
  "with",
  "of",
  "for",
  "this",
  "that",
  "what",
  "huh",
  "ok",
  "okay",
]);

/** 장면 낱말로 세지 않는 낱말인가(기능어 · 대답 말 · 진행 말 — 들은 글 귀띔 heard-hint 와 시드 검사가 같은 표를 본다). */
export function isSceneFunctionWord(word: string): boolean {
  return NOT_SCENE_WORDS.has(word.toLowerCase());
}

/**
 * 아이 말에서 같은 소리 대조를 거르는 낱말(13절 C217 보완 · 코드 검토 rev-content-1 I-2 · M-2): 인사 · 맞장구 · 덧붙이는 말과, 동음이의어 묶음에 든
 * 흔한 기능어다. 아이가 'Hi!' · 'I like it too.' · 'Right!' 라고 한 것은 단원 단어 high · two · write 를 말해 본 것이 아니므로, 묶음을 거치기 전에 글자로
 * 걸러 귀띔 · 막힘 무름 · 먼저 답한 필수 질문 셈이 그 낱말을 단원 단어로 읽지 않게 한다. 카드 글 쪽(장면 낱말 표)에는 쓰지 않는다 — 카드의 right ·
 * well 은 내용 낱말일 수 있다. 영어 말버릇 목록이라 코드 상수다.
 */
const CHILD_FILLER_WORDS: ReadonlySet<string> = new Set([
  // 인사
  "hi",
  "hello",
  "hey",
  "bye",
  "goodbye",
  // 맞장구 · 덧붙이는 말
  "too",
  "right",
  "so",
  "well",
  "oh",
  "wow",
  "yeah",
  "yep",
  "sure",
  "please",
  "thanks",
  // 묶음에 든 기능어(by = buy · be = bee · our = hour · where = wear · would = wood · some = sum · their = there)
  "by",
  "be",
  "our",
  "where",
  "would",
  "some",
  "their",
]);

/**
 * 아이 말의 이 낱말은 같은 소리 묶음으로 넓혀 읽지 않는가(기능어 · 대답 말 NOT_SCENE_WORDS 와 인사 · 맞장구 말 CHILD_FILLER_WORDS). 들은 글 귀띔 ·
 * 막힘 무름(touchesScene) · 먼저 답한 필수 질문(childAnsweredRequiredOf)이 같은 판정을 쓴다. 글자 그대로의 대조는 막지 않는다.
 */
export function isChildFillerWord(word: string): boolean {
  const lower = word.toLowerCase();
  return NOT_SCENE_WORDS.has(lower) || CHILD_FILLER_WORDS.has(lower);
}

/**
 * 동음이의어 묶음의 대표 낱말 찾기(소문자 낱말 → 그 묶음의 첫 낱말, 묶음에 없으면 그 낱말 그대로). 일치율 정규화(match-rate normalizeForMatch
 * (6))와 같은 규칙이다: 한 낱말이 두 묶음에 들면 앞 묶음이 이긴다. 묶음이 비면 낱말을 그대로 돌려준다.
 */
export function homophoneHeadOf(
  homophones: readonly (readonly string[])[] = [],
): (word: string) => string {
  const heads = new Map<string, string>();
  for (const group of homophones) {
    const head = group[0]?.toLowerCase();
    if (head === undefined) continue;
    for (const word of group) {
      const key = word.toLowerCase();
      if (!heads.has(key)) heads.set(key, head);
    }
  }
  return (word) => heads.get(word.toLowerCase()) ?? word.toLowerCase();
}

/**
 * 영어 낱말 한두 개(ENGLISH_SAYING_MIN_WORDS 이하)의 말이고 모름 표현이 아니며, 그 가운데 하나가 질문 · 장면 · 카드의 내용 낱말인가('Rice.' ·
 * 'Big fish.' · 'Cold juice.' — 13절 C204 (2) 경계 그대로, 대본 회차 r1 판정 I-4). 'Blue car.' 처럼 장면에 없는 낱말 · 'Huh?' · 'Yes.' 같은
 * 기능어 · 대답 말은 아니다(갈래가 정함). 동음이의어 묶음을 주면 같은 소리 낱말도 닿은 것으로 본다('See.' 와 장면 낱말 sea — 13절 C217 (1)).
 * 아이 말의 기능어 · 인사 · 맞장구 말은 묶음을 거치기 전 글자로 거른다('To.' · 'Me too.' 가 장면 낱말 two 에, 'Hi!' 가 high 에 닿지 않게 —
 * isChildFillerWord). 글자 그대로 장면 낱말인 말('Right.' 과 장면 낱말 right)은 그대로 닿는다.
 */
export function touchesScene(
  child: string,
  sceneWords: ReadonlySet<string>,
  homophones: readonly (readonly string[])[] = [],
): boolean {
  if (isDontKnowSaying(child)) return false;
  const words = normalizeSpoken(child)
    .split(" ")
    .filter((w) => /^[a-z]+$/.test(w));
  if (words.length === 0 || words.length > ENGLISH_SAYING_MIN_WORDS)
    return false;
  const content = words.filter((w) => !NOT_SCENE_WORDS.has(w));
  if (content.some((w) => sceneWords.has(w))) return true;
  if (homophones.length === 0) return false;
  const headOf = homophoneHeadOf(homophones);
  const sceneHeads = new Set([...sceneWords].map(headOf));
  return content
    .filter((w) => !isChildFillerWord(w))
    .some((w) => sceneHeads.has(headOf(w)));
}

/** 장면 낱말 표(카드 글 · 단원 단어에서 기능어를 뺀 소문자 낱말 — 부르는 쪽이 카드 글을 넘긴다). */
export function sceneWordsOf(texts: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const text of texts)
    for (const w of normalizeSpoken(text).split(" "))
      if (/^[a-z]+$/.test(w) && !NOT_SCENE_WORDS.has(w)) out.add(w);
  return out;
}

/**
 * 막힘을 무른 턴의 잡아 두기(13절 C204 (3) · 검토 rev-prompt-2 C · Minor 5 · 6): 회화 턴 흘려 받기에서 서버가 문장을 아이에게 보낼지 정한다.
 * 시도마다 막힘 판단을 알릴 때(onStuck) 덮어써, 앱이 막힘을 물렀고 · 아직 보낸 문장이 없고 · 1~3단계 범위를 읽었고 · 고른 계획이 질문을 쓰는
 * 차례일 때만 잡아 둔다(끝에서 통째로 다시 쓴다). 순수 상태 꼴이다(서버 lesson-turn 과 시험이 같이 쓴다).
 */
export function createRewriteHold({
  low,
  rangeOk,
}: {
  low: boolean;
  rangeOk: boolean;
}): {
  /** 막힘 판단을 알릴 때(앱이 다시 본 값의 무름 여부 · 그때 고른 계획이 질문을 쓰는가). */
  onStuck(overridden: boolean, asks: boolean): void;
  /** 문장 문을 지나 보낼 문장인가(보내면 셈을 올린다). 잡아 두는 동안은 보내지 않는다. */
  sends(accepted: boolean): boolean;
  /** 지금 잡아 두는가(끝에서 통째로 다시 쓸 턴). */
  holding(): boolean;
} {
  let sent = 0;
  let hold = false;
  return {
    onStuck(overridden, asks) {
      hold = overridden && sent === 0 && low && rangeOk && asks;
    },
    sends(accepted) {
      if (!accepted || hold) return false;
      sent += 1;
      return true;
    },
    holding: () => hold,
  };
}

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
}: {
  aiStuck: boolean;
  childKind: TalkChildKind | undefined;
  child: string;
  input: string;
  /**
   * 질문 · 오늘 장면 · 카드의 내용 낱말(소문자). 영어 낱말 두 개의 말에 이 낱말이 들면 질문 · 장면에 닿는 짧은 말(short_related)이라 막힘이
   * 아니다('Big fish.' — 대본 4회차 설계 재판정, 앱 안전망 셋 이상 밖의 자리). 없으면 이 조건을 보지 않는다.
   */
  sceneWords?: ReadonlySet<string>;
}): boolean {
  if (!aiStuck || input !== "speech") return aiStuck;
  if (isEnglishSaying(child, ENGLISH_SENTENCE_MIN_WORDS)) return false;
  if (sceneWords !== undefined && touchesScene(child, sceneWords)) return false;
  if (childKind !== undefined) return STUCK_CHILD_KINDS.has(childKind);
  return !isEnglishSaying(child);
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

/**
 * 영어 낱말 두 개(ENGLISH_SAYING_MIN_WORDS)의 말이고 모름 표현이 아니며, 그 가운데 하나가 질문 · 장면 · 카드의 내용 낱말인가('Big fish.' · 'Cold
 * juice.'). 'Blue car.' 처럼 장면에 없는 두 낱말은 아니다(갈래가 정함).
 */
export function touchesScene(
  child: string,
  sceneWords: ReadonlySet<string>,
): boolean {
  if (!isEnglishSaying(child)) return false;
  const words = normalizeSpoken(child)
    .split(" ")
    .filter((w) => /^[a-z]+$/.test(w));
  if (words.length !== ENGLISH_SAYING_MIN_WORDS) return false;
  return words.some((w) => !NOT_SCENE_WORDS.has(w) && sceneWords.has(w));
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

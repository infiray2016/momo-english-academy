// 회화 '말했다' · '안다' · 만남 · 단원 단어 조건 · 영어로 말한 문장 · S-3 단어 수(3.4 '말함' 문단 · 3.2 회화 단원 통과 ·
// 5절 vocab_progress · C41 · AC-9d · AC-15c, plan-p13a 파일별 값 9). 순수 모듈이다.
import type { TalkHintKind, TalkInputMode } from "@/core/ai/calls/talk";
import { FLOAT_TOLERANCE } from "@/core/seed/structure";
import { normalizeForMatch } from "@/core/speech/match-rate";

export type SaidHintKind = TalkHintKind;

type Lexicon = {
  unitWords: readonly string[];
  /** 표기형 → 원형(vocab forms, P11a lemmaLookup). */
  lemmaOf: (surface: string) => string | undefined;
  /** 동음이의어 묶음(시드 lists/homophones.json groups). */
  homophones: readonly (readonly string[])[];
};

/** 견줌 열쇠: 일치율과 같은 정규화(소문자 · 문장 부호 · 숫자 · 축약형 · 동음이의어)를 거친 낱말. */
function keysOfWord(word: string, lex: Lexicon): string[] {
  const keys = new Set<string>();
  const add = (w: string | undefined) => {
    if (!w) return;
    const lower = w.toLowerCase();
    keys.add(lower);
    for (const n of normalizeForMatch(lower, lex.homophones)) keys.add(n);
  };
  add(word);
  add(lex.lemmaOf(word));
  return [...keys];
}

/**
 * 단원 단어 원형(인식 글의 낱말을 원형으로) 찾기 — 처음 나온 차례, 같은 말 하나로. 띄어 쓴 단원 단어(여러 낱말)는 정규화한
 * 낱말이 차례대로 이어질 때만 맞는다(낱말 하나만으로 맞지 않게).
 */
function unitWordsIn(text: string, lex: Lexicon): string[] {
  const singleByKey = new Map<string, string>();
  const multi: { unit: string; words: string[] }[] = [];
  for (const unit of lex.unitWords) {
    const words = normalizeForMatch(unit, lex.homophones);
    if (words.length > 1) {
      multi.push({ unit, words });
      continue;
    }
    for (const key of keysOfWord(unit, lex))
      if (!singleByKey.has(key)) singleByKey.set(key, unit);
  }
  const tokens = normalizeForMatch(text, lex.homophones);
  const found: { unit: string; at: number }[] = [];
  tokens.forEach((token, at) => {
    const hit = keysOfWord(token, lex)
      .map((key) => singleByKey.get(key))
      .find((unit) => unit !== undefined);
    if (hit !== undefined) found.push({ unit: hit, at });
  });
  for (const { unit, words } of multi) {
    for (let i = 0; i + words.length <= tokens.length; i++) {
      if (words.every((w, j) => tokens[i + j] === w)) {
        found.push({ unit, at: i });
        break;
      }
    }
  }
  const out: string[] = [];
  for (const { unit } of found.sort((a, b) => a.at - b.at))
    if (!out.includes(unit)) out.push(unit);
  return out;
}

/**
 * '말했다'(3.4 · AC-9d): 힌트 종류가 '영어'면 없음. 아니면 AI 가 돌려준 단어를 원형으로 바꿔 단원 단어 목록에 있고
 * 인식 글(같은 정규화 · 원형)에도 든 것만(돌려준 차례, 같은 말 하나로).
 */
export function saidWordsOf({
  aiWords,
  heard,
  hintKind,
  ...lex
}: Lexicon & {
  aiWords: readonly string[];
  heard: string;
  hintKind: SaidHintKind;
}): string[] {
  if (hintKind === "english") return [];
  const inHeard = new Set(unitWordsIn(heard, lex));
  const unit = new Set(lex.unitWords);
  const out: string[] = [];
  for (const word of aiWords) {
    const lemma = lex.lemmaOf(word) ?? word.toLowerCase();
    if (!unit.has(lemma) || !inHeard.has(lemma) || out.includes(lemma))
      continue;
    out.push(lemma);
  }
  return out;
}

/**
 * 만남(5절 vocab_progress · 13절 C99): 토리 말 · 카드 질문 · 오늘 쓸 말에서 찾은 단원 단어. 소문자 · 문장 부호 · 숫자 · 축약형 · 원형까지
 * 맞추고 동음이의어 묶음은 쓰지 않는다 — 생성된 글이라 인식 오류가 없고, 기능어(to · for · I)가 단원 단어(two · four · eye)를
 * '만남'으로 만들지 않게. 동음이의어는 아이 인식 글의 '말했다'(saidWordsOf)에만 쓴다.
 */
export function metWordsIn(
  text: string,
  lex: Pick<Lexicon, "unitWords" | "lemmaOf">,
): string[] {
  return unitWordsIn(text, { ...lex, homophones: [] });
}

/** '말했다'를 세는 자리(3.4): 회화 턴만. 오늘 쓸 말 · 말해 보기 · 정리 · 한 번 더 말해 보기의 따라 말하기는 세지 않는다. 다시 하기 · 중단된 대화의 턴은 센다. */
export function countsAsSaid({
  source,
}: {
  source: "turn" | "today_words" | "practice" | "wrap_up" | "again";
  sessionKind: "regular" | "retry" | "aborted";
}): boolean {
  return source === "turn";
}

/** '말했다' 학습일을 겹치지 않게 더하고, 서로 다른 학습일이 talk.known_days 이상이면 '안다'(3.4). */
export function sayStateAfter({
  saidDays,
  day,
  knownDays,
}: {
  saidDays: readonly string[];
  day: string;
  knownDays: number;
}): { saidDays: string[]; known: boolean } {
  const days = [...new Set([...saidDays, day])].sort();
  return { saidDays: days, known: days.length >= knownDays };
}

/** 회화 단원 통과의 단어 조건(3.2 · AC-15c): '말함' '안다'인 단원 단어 비율 ≥ 단원 복사본 talk.said_ratio. */
export function talkWordConditionOf({
  knownSay,
  unitWords,
  ratio,
}: {
  knownSay: readonly string[];
  unitWords: readonly string[];
  ratio: number;
}): { ok: boolean; known: number; total: number } {
  const unit = new Set(unitWords);
  const known = new Set(knownSay.filter((w) => unit.has(w))).size;
  const total = unit.size;
  return {
    ok: total > 0 && known / total >= ratio - FLOAT_TOLERANCE,
    known,
    total,
  };
}

/** 영어로 말한 문장 수의 증가(C41): '말' 턴 · 따라 말하기 · 한 번 더 말해 보기에서 인식 글이 있으면 1, '모름' · 빈 글은 0. */
export function talkEnglishSentenceDelta(
  kind: TalkInputMode | "follow" | "again",
  text: string,
): number {
  if (kind === "dont_know") return 0;
  return text.trim() === "" ? 0 : 1;
}

/** 회화 S-3 단어 수(AC-15c): 힌트 종류 '영어'를 뺀 아이 턴의 단어 수 합. */
export function s3WordCountOf(
  turns: readonly { hintKind: TalkHintKind; wordCount: number | null }[],
): number {
  return turns
    .filter((t) => t.hintKind !== "english")
    .reduce((sum, t) => sum + (t.wordCount ?? 0), 0);
}

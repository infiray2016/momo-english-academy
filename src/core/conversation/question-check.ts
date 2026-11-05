// 회화 수업 질문 검사(3.3 '같은 질문 되풀이 막기' · '1~3단계 AI 질문 검사' · '1~3단계 소리 줄', 6.4, 회화 plan 정한 것 19 ·
// 이름 절 응답 칸 3 · 4번). 같은 질문은 normalizeSpoken 글로 견주고, 1~3단계 질문 · 소리 줄은 길이 · 어휘 범위 · 형태를 본다.
// 순수 모듈이다. 숫자(같은 질문 상한 · 문장 길이 상한)는 부르는 쪽이 설정 · 단계 규격에서 넘긴다.

import type { TalkMoveKind } from "@/core/conversation/move";
import { MORE_PROMPT, normalizeSpoken } from "@/core/conversation/spoken";
import { isQuestionSentence } from "@/core/conversation/stream";
import {
  type FormRule,
  formsIn,
  isEnglishSentence,
  sentenceWords,
  splitSentences,
  tokenize,
} from "@/core/seed/text";

// ── 같은 질문 ────────────────────────────────────────────────────

/** 같은 질문을 견주는 글 꼴(대소문자 · 따옴표 · 문장 부호 · 띄어쓰기 · 줄임꼴, C125 (3) · C127). */
export function questionKeyOf(text: string): string {
  return normalizeSpoken(text);
}

const CLOSING_KEY = questionKeyOf(MORE_PROMPT.en);

/** 같은 질문 셈에서 빼는 앱 고정 대사('Do you want to talk more?', 3.3)인가. */
export function isClosingQuestion(text: string): boolean {
  return questionKeyOf(text) === CLOSING_KEY;
}

/** 화면 글(선생님 행 text)의 물음표 문장. 마무리 물음(앱 고정 대사)은 뺀다. */
export function questionsOfText(text: string): string[] {
  return splitSentences(text).filter(
    (s) => isQuestionSentence(s) && !isClosingQuestion(s),
  );
}

/**
 * 그 선생님 차례의 질문(같은 질문 셈 · 막힌 질문 글의 재료, 정본 02-2 200 · 202줄 — 셈 대상은 '선생님 질문'이고 반응 부분의 물음표
 * 문장은 따로다). AI 차례 · 대화 첫 질문은 화면 글의 마지막 물음표 문장이다(한 차례에 질문은 하나이고 반응 뒤에 온다). 카드 자리 ·
 * 마무리 자리는 앱이 붙인 줄이 끝에 오므로 끝 문장이 질문일 때만 그 줄이다(같이 말하기 · 마무리 물음이면 없음). 마무리 물음은 뺀다.
 * move 가 없는 행(kind null)은 AI 차례처럼 본다.
 */
export function turnQuestionOf(
  text: string,
  kind: TalkMoveKind | null,
): string | null {
  if (kind === "card_slot" || kind === "closing_slot") {
    const last = splitSentences(text).at(-1);
    return last !== undefined &&
      isQuestionSentence(last) &&
      !isClosingQuestion(last)
      ? last
      : null;
  }
  return questionsOfText(text).at(-1) ?? null;
}

/**
 * 카드 항목 · 시드 질문 글의 같은 질문 열쇠: 마지막 물음표 문장을 questionKeyOf 로 정규화한 것(물음표 문장이 없으면 글 전체). 앱이
 * 선생님 차례의 질문을 마지막 물음표 문장(turnQuestionOf)으로 세고 막힌 질문도 그 열쇠로 들므로(02-2 200 · 202줄), 카드 자리에 붙일
 * 항목 고르기(chances.ts)와 시드 검증기(check-talk.ts)가 같은 열쇠로 견준다. 앞 장면이 달라도 꼬리가 같으면 같은 질문이다.
 */
export function cardQuestionKeyOf(text: string): string {
  return questionKeyOf(turnQuestionOf(text, null) ?? text);
}

export type SameQuestionHit = "after_stuck" | "max";

/**
 * 같은 질문 되풀이 막기(3.3, C181 · C188): 막힌 바로 뒤 선생님 차례에는 막힌 질문과 같은 글을 쓰지 않고(after_stuck), 한 대화에서
 * 글이 같은 선생님 질문(카드 · AI 모두)은 talk.same_question_max 번까지다(max — 이미 그만큼 나왔으면 걸림). 마무리 물음은 세지 않는다.
 * blocked · asked 의 열쇠는 questionKeyOf 꼴이다.
 */
export function sameQuestionHit({
  question,
  blocked,
  asked,
  max,
}: {
  question: string;
  blocked: readonly string[];
  asked: ReadonlyMap<string, number>;
  max: number;
}): SameQuestionHit | null {
  return sameQuestionKeyHit({
    key: questionKeyOf(question),
    blocked,
    asked,
    max,
  });
}

/** sameQuestionHit 의 열쇠 꼴(이미 questionKeyOf · cardQuestionKeyOf 로 만든 열쇠를 견준다). */
export function sameQuestionKeyHit({
  key,
  blocked,
  asked,
  max,
}: {
  key: string;
  blocked: readonly string[];
  asked: ReadonlyMap<string, number>;
  max: number;
}): SameQuestionHit | null {
  if (key === "" || key === CLOSING_KEY) return null;
  if (blocked.includes(key)) return "after_stuck";
  if ((asked.get(key) ?? 0) >= max) return "max";
  return null;
}

// ── 1~3단계 질문 · 소리 줄 ─────────────────────────────────────────

export type LowLevelLineOptions = {
  /** 그 단계 문장 길이 상한(3.6, level_specs sentenceMaxWords). */
  sentenceMaxWords: number;
  /** 그 단계 어휘 범위의 낱말(소문자 원형). */
  allowedWords: ReadonlySet<string>;
  /** 이번 단원 단어. */
  unitWords: readonly string[];
  /** 아이가 이 대화에서 말한 낱말(인식 글의 낱말, 3.3 '아이가 이 대화에서 말한 낱말'). */
  childWords: readonly string[];
  /** 그 대화 선생님의 영어 이름(소유격 's 포함 범위 안). */
  teacherName: string;
  lemmaOf: (surface: string) => string | undefined;
  /** 형태 표와 그 단계 · 단원에 쓸 수 있는 형태 id. */
  forms: readonly FormRule[];
  allowedForms: ReadonlySet<string>;
};

export type LowLevelLineReason =
  | "empty"
  | "too_long"
  | "target_word"
  | "offband"
  | "form"
  | "shape"
  | "no_target";
export type LineCheck =
  | { ok: true }
  | { ok: false; reason: LowLevelLineReason };

const OK: LineCheck = { ok: true };
const fail = (reason: LowLevelLineReason): LineCheck => ({ ok: false, reason });

function lowerSet(words: readonly string[]): Set<string> {
  return new Set(words.map((w) => w.toLowerCase()));
}

/** 낱말 토큰의 소문자 꼴과 원형(모르면 undefined). */
function wordTokens(
  text: string,
  options: Pick<LowLevelLineOptions, "lemmaOf">,
): { lower: string; lemma: string | undefined }[] {
  return tokenize(text)
    .filter((t) => t.kind === "word")
    .map((t) => ({
      lower: t.text.toLowerCase(),
      lemma: options.lemmaOf(t.text)?.toLowerCase(),
    }));
}

function overLength(text: string, max: number): boolean {
  return splitSentences(text).some(
    (s) => isEnglishSentence(s) && sentenceWords(s) > max,
  );
}

function hasOffband(text: string, options: LowLevelLineOptions): boolean {
  const extra = lowerSet([...options.unitWords, ...options.childWords]);
  const teacher = options.teacherName.toLowerCase();
  const inRange = (word: string) =>
    options.allowedWords.has(word) ||
    extra.has(word) ||
    word === teacher ||
    word === `${teacher}'s`;
  return wordTokens(text, options).some(
    ({ lower, lemma }) =>
      !(inRange(lower) || (lemma !== undefined && inRange(lemma))),
  );
}

function hasOffbandForm(text: string, options: LowLevelLineOptions): boolean {
  return splitSentences(text).some((sentence) =>
    formsIn(sentence, options.forms).some(
      (id) => !options.allowedForms.has(id),
    ),
  );
}

function hasTarget(
  text: string,
  targets: readonly string[],
  options: Pick<LowLevelLineOptions, "lemmaOf">,
): boolean {
  const wanted = lowerSet(targets);
  return wordTokens(text, options).some(
    ({ lower, lemma }) =>
      wanted.has(lower) || (lemma !== undefined && wanted.has(lemma)),
  );
}

/** 길이 · 어휘 · 형태 범위(질문 · 소리 줄 공통). */
function rangeCheck(text: string, options: LowLevelLineOptions): LineCheck {
  if (overLength(text, options.sentenceMaxWords)) return fail("too_long");
  if (hasOffband(text, options)) return fail("offband");
  if (hasOffbandForm(text, options)) return fail("form");
  return OK;
}

/**
 * 1~3단계 AI 질문 문장 검사(3.3 · 6.4 06:110 에 더함): 문장 길이 상한 안, 노리는 단원 단어(원형 포함)를 넣지 않음(A4-03),
 * 그 단계 어휘 범위 · 이번 단원 단어 · 아이가 이 대화에서 말한 낱말 · {NAME} · 선생님 영어 이름 밖 낱말 없음, 범위 밖 형태 없음.
 * 걸린 질문 문장은 화면 · 읽어 주기 · 응답 본문에서 빠지고 그 턴은 카드 자리가 된다(부르는 쪽 몫). 같은 질문은 sameQuestionHit.
 */
export function checkLowLevelQuestion(
  sentence: string,
  options: LowLevelLineOptions & { targets: readonly string[] },
): LineCheck {
  if (sentence.trim() === "") return fail("empty");
  if (overLength(sentence, options.sentenceMaxWords)) return fail("too_long");
  if (hasTarget(sentence, options.targets, options)) return fail("target_word");
  return rangeCheck(sentence, options);
}

/**
 * 1~3단계 따라 할 말 검사(응답 칸 model_line, 3.3 소리 줄 · 6.2): 비지 않고 길이 · 어휘 · 형태 범위 안. 걸리면 부르는 쪽이 카드의
 * 답 예시 · 들려줄 말로 바꾼다.
 */
export function checkSoundLine(
  line: string,
  options: LowLevelLineOptions,
): LineCheck {
  if (line.trim() === "") return fail("empty");
  return rangeCheck(line, options);
}

/** 소문자 · 문장 부호 뺀 낱말(선택지 견주기 — 6.4 검증기의 선택지 꼴과 같은 꼴). */
function plainWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w !== "");
}

/**
 * 1~3단계 선택지 둘 검사(응답 칸 choices, 06:30 답 두 개 규칙): 두 줄이 소리 줄 범위 안이고, 같은 꼴 문장에서 낱말 하나만 다르며,
 * 하나는 노리는 단어를 담는다. 걸리면 부르는 쪽이 선택지를 비워 질문만 남긴다.
 */
export function checkChoices(
  pair: readonly [string, string],
  options: LowLevelLineOptions & { targets: readonly string[] },
): LineCheck {
  for (const line of pair) {
    const result = checkSoundLine(line, options);
    if (!result.ok) return result;
  }
  const [a, b] = pair.map(plainWords) as [string[], string[]];
  if (a.length !== b.length || a.filter((w, i) => w !== b[i]).length !== 1)
    return fail("shape");
  if (!pair.some((line) => hasTarget(line, options.targets, options)))
    return fail("no_target");
  return OK;
}

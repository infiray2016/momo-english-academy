// 회화 수업 질문 검사(3.3 '같은 질문 되풀이 막기' · '1~3단계 AI 질문 검사' · '1~3단계 소리 줄', 6.4, 회화 plan 정한 것 19 ·
// 이름 절 응답 칸 3 · 4번). 같은 질문은 normalizeSpoken 글로 견주고, 1~3단계 질문 · 소리 줄은 길이 · 어휘 범위 · 형태를 본다.
// 순수 모듈이다. 숫자(같은 질문 상한 · 문장 길이 상한)는 부르는 쪽이 설정 · 단계 규격에서 넘긴다.

import type { TalkMoveKind } from "@/core/conversation/move";
import { MORE_PROMPT, normalizeSpoken } from "@/core/conversation/spoken";
import { isQuestionSentence } from "@/core/conversation/stream";
import {
  expandContraction,
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
  /**
   * 이 대화의 아이 말(인식 글, 차례대로 — 끝이 이번 말). 주면 질문 검사가 아이 말을 되묻는 질문을 건다(echo — 대본 회차 r1 판정 I-6). 없으면
   * 보지 않는다(소리 줄 · 선택지 검사는 쓰지 않음).
   */
  childLines?: readonly string[] | undefined;
};

/** echo: 아이가 방금 · 앞서 한 말을 되묻는 질문(판정 r1 I-6 — 'Big.' → 'Is the lake big or small?', 'I like fish.' → 'Do you like the fish?'). */
export type LowLevelLineReason =
  | "empty"
  | "too_long"
  | "target_word"
  | "offband"
  | "form"
  | "shape"
  | "no_target"
  | "echo";
export type LineCheck =
  | { ok: true }
  /** words: 걸린 낱말(노리는 단어 · 범위 밖 낱말 — AI 에 다시 쓰게 알릴 때 쓴다, 13절 C203 (3)). 그 밖의 까닭은 비운다. */
  | { ok: false; reason: LowLevelLineReason; words?: string[] };

const OK: LineCheck = { ok: true };
const fail = (reason: LowLevelLineReason, words?: string[]): LineCheck =>
  words === undefined ? { ok: false, reason } : { ok: false, reason, words };

/**
 * 1~3단계 AI 질문에서 범위 밖이어도 한 낱말뿐이면 통과시키는 닫힌 품사 낱말(13절 C203 (2) — 'Do you like rice too?' 의 too 처럼 되묻기에 붙는
 * 작은 부사 · 지시어). 설계 숫자가 아닌 코드 상수다(C203 '코드 상수'). 질문 검사에만 쓰고 소리 줄 · 선택지에는 쓰지 않는다.
 */
export const CLOSED_CLASS_PASS_WORDS: ReadonlySet<string> = new Set([
  "too",
  "also",
  "now",
  "here",
  "there",
  "then",
  "very",
  "so",
  "really",
]);

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

/** 범위 밖 낱말 셈의 덧붙임('AI 몫 넓힘' 상황 차례 검사 — 질문 검사는 쓰지 않는다). */
export type OffbandExtra = {
  /** 늘 범위 안으로 보는 낱말(시드 '감탄 · 수업 말' 허용 목록 — 소문자 표기 · 원형). */
  allowed?: ReadonlySet<string>;
  /** 범위 밖 낱말을 축약형 조각으로 펼쳐 다시 본다(that's → that · is, core/seed/text 의 표 — spec 설계 1 말 검사 (가)). */
  expand?: boolean;
  /**
   * 허용 낱말 대조에 쓰는 모든 단계 어휘의 원형 찾기(표기형 → 원형 — 컨트롤러 결정 (나): 허용 목록은 원형만 담고 범위의 lemmaOf 는 그 단계 이하만
   * 안다). 주면 표기형 그대로 · 이 원형으로만 대조하고, 없으면(사전이 없는 대본 도구 · 순수 시험) 규칙 활용 꼬리를 떼어 본다(allowedBases).
   */
  allowedLemmaOf?: (surface: string) => string | undefined;
};

/**
 * 사전 없이 허용 낱말 목록이 덮는 꼴(목록은 원형만 적는다 — words → word · going → go · tries → try · liked → like). 모든 단계 원형 사전
 * (OffbandExtra.allowedLemmaOf)을 넘기지 않는 길의 대신 길이다(영어 문법 꼴이라 코드 상수, 허용 목록에만 쓴다).
 */
function allowedBases(word: string): string[] {
  const out = [word];
  const cut = (suffix: string, add = "") => {
    if (word.length > suffix.length + 1 && word.endsWith(suffix))
      out.push(`${word.slice(0, -suffix.length)}${add}`);
  };
  cut("ies", "y");
  cut("es");
  cut("s");
  cut("ing");
  cut("ing", "e");
  cut("ed");
  cut("d");
  return out;
}

/**
 * 범위 밖 낱말(소문자, 같은 낱말은 한 번 — 차례대로). 범위는 그 단계 어휘 범위 · 이번 단원 단어 · 아이가 이 대화에서 말한 낱말 · 선생님 영어
 * 이름(소유격 포함)이고, extra.allowed 를 더할 수 있다. extra.expand 면 범위 밖 낱말을 축약형 조각으로 펼쳐 조각마다 보고 범위 밖 조각을 낸다.
 */
export function offbandWordsIn(
  text: string,
  options: LowLevelLineOptions,
  extra: OffbandExtra = {},
): string[] {
  const more = lowerSet([...options.unitWords, ...options.childWords]);
  const teacher = options.teacherName.toLowerCase();
  const allowed = extra.allowed;
  const allowedHas = (word: string): boolean => {
    if (allowed === undefined) return false;
    if (allowed.has(word)) return true;
    if (extra.allowedLemmaOf === undefined)
      return allowedBases(word).some((b) => allowed.has(b));
    const lemma = extra.allowedLemmaOf(word)?.toLowerCase();
    return lemma !== undefined && allowed.has(lemma);
  };
  const inRange = (word: string) =>
    options.allowedWords.has(word) ||
    more.has(word) ||
    allowedHas(word) ||
    word === teacher ||
    word === `${teacher}'s`;
  const fits = (word: string, lemma: string | undefined) =>
    inRange(word) || (lemma !== undefined && inRange(lemma));
  const out: string[] = [];
  const add = (word: string) => {
    if (!out.includes(word)) out.push(word);
  };
  for (const { lower, lemma } of wordTokens(text, options)) {
    if (fits(lower, lemma)) continue;
    const pieces = extra.expand === true ? expandContraction(lower) : [lower];
    if (pieces.length < 2) {
      add(lower);
      continue;
    }
    for (const piece of pieces)
      if (!fits(piece, options.lemmaOf(piece)?.toLowerCase())) add(piece);
  }
  return out;
}

function hasOffband(text: string, options: LowLevelLineOptions): boolean {
  return offbandWordsIn(text, options).length > 0;
}

function hasOffbandForm(text: string, options: LowLevelLineOptions): boolean {
  return splitSentences(text).some((sentence) =>
    formsIn(sentence, options.forms).some(
      (id) => !options.allowedForms.has(id),
    ),
  );
}

/** 글에 든 노리는 단어(원형 포함, 소문자 노리는 단어 꼴 — 같은 낱말은 한 번). */
function targetWordsIn(
  text: string,
  targets: readonly string[],
  options: Pick<LowLevelLineOptions, "lemmaOf">,
): string[] {
  const wanted = lowerSet(targets);
  const out: string[] = [];
  for (const { lower, lemma } of wordTokens(text, options)) {
    const hit = wanted.has(lower)
      ? lower
      : lemma !== undefined && wanted.has(lemma)
        ? lemma
        : null;
    if (hit !== null && !out.includes(hit)) out.push(hit);
  }
  return out;
}

function hasTarget(
  text: string,
  targets: readonly string[],
  options: Pick<LowLevelLineOptions, "lemmaOf">,
): boolean {
  return targetWordsIn(text, targets, options).length > 0;
}

/**
 * 아이가 이 대화에서 말한 낱말(소문자 꼴과 원형). 노리는 단어라도 아이가 먼저 말했으면 되묻기 질문에 쓸 수 있다(13절 C203 (1) — childWords 와
 * 같은 자격).
 */
function childSaidSet(
  options: Pick<LowLevelLineOptions, "childWords" | "lemmaOf">,
): Set<string> {
  const out = new Set<string>();
  for (const word of options.childWords) {
    const lower = word.toLowerCase();
    out.add(lower);
    const lemma = options.lemmaOf(word)?.toLowerCase();
    if (lemma !== undefined) out.add(lemma);
  }
  return out;
}

/** 길이 · 어휘 · 형태 범위(질문 · 소리 줄 공통). */
function rangeCheck(text: string, options: LowLevelLineOptions): LineCheck {
  if (overLength(text, options.sentenceMaxWords)) return fail("too_long");
  if (hasOffband(text, options)) return fail("offband");
  if (hasOffbandForm(text, options)) return fail("form");
  return OK;
}

/**
 * 1~3단계 AI 질문 문장 검사(3.3 · 6.4 06:110 에 더함, 13절 C203 잠정): 문장 길이 상한 안, 노리는 단원 단어(원형 포함)를 넣지 않음(A4-03 —
 * 아이가 이 대화에서 말한 낱말은 되묻기에 쓸 수 있어 뺀다, C203 (1)), 그 단계 어휘 범위 · 이번 단원 단어 · 아이가 이 대화에서 말한 낱말 ·
 * {NAME} · 선생님 영어 이름 밖 낱말 없음(범위 밖이 닫힌 품사 한 낱말뿐이면 통과, C203 (2)), 범위 밖 형태 없음. 걸리면 걸린 낱말을 함께 낸다.
 * 걸린 질문은 부르는 쪽이 AI 에 한 번 다시 쓰게 하고(C203 (3), question-retry), 그래도 걸리면 카드 자리로 바꾼다. 같은 질문은 sameQuestionHit.
 */
export function checkLowLevelQuestion(
  sentence: string,
  options: LowLevelLineOptions & { targets: readonly string[] },
): LineCheck {
  if (sentence.trim() === "") return fail("empty");
  if (overLength(sentence, options.sentenceMaxWords)) return fail("too_long");
  const said = childSaidSet(options);
  const targets = options.targets.filter((t) => !said.has(t.toLowerCase()));
  const hit = targetWordsIn(sentence, targets, options);
  if (hit.length > 0) return fail("target_word", hit);
  const off = offbandWordsIn(sentence, options);
  const closedOnly =
    off.length === 1 && CLOSED_CLASS_PASS_WORDS.has(off[0] ?? "");
  if (off.length > 0 && !closedOnly) return fail("offband", off);
  if (hasOffbandForm(sentence, options)) return fail("form");
  if (
    options.childLines !== undefined &&
    questionEchoesChild(
      sentence,
      options.childLines,
      options.lemmaOf,
      options.targets,
    )
  )
    return fail("echo");
  return OK;
}

/** 되묻기 판정에서 보지 않는 낱말(관사 · 대명사 · 조동사 · 이음말 · 전치사 · 대답 말 · 묻는 말 — 내용 낱말만 견준다). */
const ECHO_SKIP_WORDS = new Set(
  "a an the i you it we he she they my your his her its our their me us them is am are was were do does did will or and to in on at with of for this that these those too also so very really yes no oh what which who where when how why now today here there".split(
    " ",
  ),
);
/** 무엇을 하느냐 질문의 do 꼴 수(조동사 하나 + 본동사 하나 — 'What do you do …?', 판정 기준이 아닌 코드 상수). */
const ACTION_QUESTION_DO_COUNT = 2;
/** 혼자서는 '같은 물음'을 만들지 않는 낱말('Do you like it?' 은 무엇을 좋아하느냐가 글에 없다). */
const ECHO_FRAME_VERBS = new Set(["like", "have", "has", "want", "can"]);
/** 예 · 아니요 질문의 첫 낱말. */
const YES_NO_STARTS = new Set([
  "do",
  "does",
  "did",
  "is",
  "are",
  "am",
  "was",
  "were",
  "can",
  "will",
]);

/** 글의 낱말과 그 원형(소문자). */
function wordKeysOf(
  text: string,
  lemmaOf: (surface: string) => string | undefined,
): Set<string> {
  const out = new Set<string>();
  for (const w of plainWords(text)) {
    out.add(w);
    const lemma = lemmaOf(w)?.toLowerCase();
    if (lemma !== undefined) out.add(lemma);
  }
  return out;
}

/**
 * 질문이 아이 말을 되묻는가(대본 회차 r1 판정 I-6 · 02-2 196 · 고정부 'never ask again in the same words a question the child already
 * answered'). (가) 고르기 질문('A or B?')의 'or' 양옆 낱말 가운데 하나가 아이의 이번 말에 있다('Big.' → 'Is the lake big or small?').
 * (나) 예 · 아니요 질문의 내용 낱말(좋아하다 · 가지다 꼴만이 아닌)이 모두 아이의 한 말에 있다('Yes I like fish.' → 'Do you like the fish?').
 * 무엇 · 누구 · 어디 질문과 'Do you like it?' 처럼 내용 낱말이 없는 질문은 아니다. 원형으로 견준다.
 */
export function questionEchoesChild(
  question: string,
  childLines: readonly string[],
  lemmaOf: (surface: string) => string | undefined,
  /**
   * 그 질문이 노리는 단원 단어(응답 next_targets). 주면 (다) 무엇을 하느냐 질문('What do you do …?' — what 과 do 꼴 둘)이 노리는 단어를 아이가
   * 이번 말에서 이미 말했는데 질문 글에는 없으면(그 질문의 답이 아이가 방금 한 말) 되묻기다('I drink juice.' → 'What do you do with the
   * juice?', 노림 drink — 대본 회차 r2 판정 N-3). 질문에 그 낱말이 들거나('What juice do you drink?') 무엇을 하느냐 꼴이 아니면 보지 않는다.
   */
  targets: readonly string[] = [],
): boolean {
  const words = plainWords(question);
  const last = childLines.at(-1);
  if (words.length === 0 || last === undefined) return false;
  const lastKeys = wordKeysOf(last, lemmaOf);
  const known = (w: string, keys: ReadonlySet<string>) =>
    keys.has(w) || keys.has(lemmaOf(w)?.toLowerCase() ?? "");
  // (다) 무엇을 하느냐 질문 · 노리는 단어를 아이가 방금 말함 · 질문 글에는 없음
  const questionKeys = wordKeysOf(question, lemmaOf);
  const asksAction =
    words.includes("what") &&
    words.filter((w) => w === "do" || w === "does" || w === "did").length >=
      ACTION_QUESTION_DO_COUNT;
  if (
    asksAction &&
    targets.some(
      (t) =>
        known(t.toLowerCase(), lastKeys) &&
        !known(t.toLowerCase(), questionKeys),
    )
  )
    return true;
  // (가) 'A or B' 의 바뀌는 자리(기능어는 건너뛰고, 'red apples or green apples' 처럼 같은 명사가 되풀이되면 그 앞 꾸밈말 — 코드 검토 Minor 1)
  for (const [i, w] of words.entries()) {
    if (w !== "or") continue;
    let r = i + 1;
    while (r < words.length && ECHO_SKIP_WORDS.has(words[r] ?? "")) r++;
    let l = i - 1;
    while (l >= 0 && ECHO_SKIP_WORDS.has(words[l] ?? "")) l--;
    const left = words[l];
    const right = words[r];
    const repeatedNoun =
      left !== undefined && words.slice(r + 1).includes(left);
    const sides = (repeatedNoun ? [words[l - 1], right] : [left, right]).filter(
      (s): s is string => s !== undefined && !ECHO_SKIP_WORDS.has(s),
    );
    if (sides.some((s) => known(s, lastKeys))) return true;
  }
  // (나) 예 · 아니요 질문의 내용 낱말이 모두 아이의 한 말에
  if (!YES_NO_STARTS.has(words[0] ?? "")) return false;
  if (words.includes("or")) return false;
  const content = words.filter((w) => !ECHO_SKIP_WORDS.has(w));
  if (!content.some((w) => !ECHO_FRAME_VERBS.has(w))) return false;
  return childLines.some((line) => {
    const keys = wordKeysOf(line, lemmaOf);
    return content.every((w) => known(w, keys));
  });
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

/**
 * 고르기 답이 아이가 방금 한 말을 되묻는가(대본 4회차 설계 재판정 N-1, 02-2 196 · 184): 두 선택지에서 서로 다른 낱말(바뀌는 자리) 가운데 하나라도
 * 아이의 마지막 말에 든 낱말(소문자 · 원형)이면 참. 'Cold.' 에 'It is cold.' / 'It is hot.', 'Yes I like fish.' 에 'I like fish.' / 'I like rice.' 처럼
 * 아이가 이미 한 말을 문장으로 다시 하게 하는 질문이 된다. 바뀌는 자리가 아이 말과 다르면('apple' / 'orange' — 새 물음) 거짓.
 */
/** 질문의 '새 것'을 가릴 때 보지 않는 낱말(기능어 · 묻는 말 · 흔한 동사 — 검토 rev-prompt-2 P3-2). */
const QUESTION_FRAME_WORDS = new Set(
  "a an the i you it we he she they my your his her its our their is am are was do does did or and to in on at with of for this that what which who where when how like have has can".split(
    " ",
  ),
);

export function choicesEchoChild(
  pair: readonly [string, string],
  child: string,
  lemmaOf: (surface: string) => string | undefined,
  /**
   * 그 선택지에 딸린 질문 문장(선생님의 마지막 물음표 문장). 주면, 질문에 아이 말에도 바뀌는 자리에도 없는 내용 낱말(다른 사람 · 다른 물건 —
   * 'Is the water hot or cold?' 의 water)이 있으면 새 물음으로 보고 되묻기가 아니다(검토 rev-prompt-2 P3-2). 없으면 이 조건을 보지 않는다.
   */
  question?: string,
  /**
   * 같은 선생님 말에서 질문 앞에 나온 글(반응 · 되풀이). 이 낱말은 '새 내용 낱말'로 치지 않는다 — 'Yes, the lake is big! Is the lake big or small?'
   * 의 lake 는 선생님이 방금 되풀이에서 꺼낸 낱말이라 새 물음이 아니다(검토 rev-prompt-2 fix1 M-1).
   */
  lead?: string,
): boolean {
  const said = new Set<string>();
  for (const t of tokenize(child)) {
    if (t.kind !== "word") continue;
    said.add(t.text.toLowerCase());
    const lemma = lemmaOf(t.text)?.toLowerCase();
    if (lemma !== undefined) said.add(lemma);
  }
  const [a, b] = pair.map(plainWords) as [string[], string[]];
  if (a.length !== b.length) return false;
  const slot = new Set<string>();
  a.forEach((word, i) => {
    const other = b[i] ?? "";
    if (word !== other) slot.add(word).add(other);
  });
  const known = (w: string) =>
    said.has(w) || said.has(lemmaOf(w)?.toLowerCase() ?? "");
  const echoes = [...slot].some(known);
  if (!echoes || question === undefined) return echoes;
  const led = new Set(plainWords(lead ?? ""));
  const fresh = plainWords(question).some(
    (w) =>
      !QUESTION_FRAME_WORDS.has(w) && !slot.has(w) && !known(w) && !led.has(w),
  );
  return !fresh;
}

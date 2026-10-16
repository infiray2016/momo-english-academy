// 글 도구(plan-p04a '글 도구'). 6.4 시드 검사(P4b · P4c)와 6.4 끝 문단의 실시간 출력 검사(P9 · 1-나)가 같은 함수를 쓴다.
// 모두 순수 함수다. 정규식 리터럴에 ES2018 문법(\p{…} · 뒤보기)을 쓰지 않는다(tsconfig target ES2017, plan 위험 5).
import {
  FUNCTION_POS,
  SENTENCE_END_ABBREVIATIONS,
} from "@/core/seed/structure";

// ── 글자 다듬기 ──────────────────────────────────────────────────

/** 한글(자모 · 호환 자모 · 음절). */
const HANGUL = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/;
const LATIN = /[A-Za-z]/;
const CURLY_QUOTES = /[\u2018\u2019]/g;

/** 굽은 따옴표를 곧은 따옴표로 바꾼다(센 뒤가 아니라 세기 전에). */
export function normalizeQuotes(text: string): string {
  return text.replace(CURLY_QUOTES, "'");
}

/** 영문자가 있고 한글이 없는 문장. 영어 검사(길이 · 형태 · 범위)는 이 문장만 본다. */
export function isEnglishSentence(sentence: string): boolean {
  return LATIN.test(sentence) && !HANGUL.test(sentence);
}

// ── 문장 자르기(5절 회화 문장 단위 검사) ──────────────────────────

const SENTENCE_ENDERS = ".!?";
const CLOSERS = "\"')]}\u201D\u2019\u00BB";
const WHITESPACE = /\s/;
const LOWER_ABBREVIATIONS = SENTENCE_END_ABBREVIATIONS.map((a) =>
  a.toLowerCase(),
);

/** 줄임말을 이루는 글자(영문자 · 점). 토큰의 줄임말 갈래와 같은 왼쪽 경계를 쓴다(검토 M-8). */
const ABBREVIATION_CHAR = /[A-Za-z.]/;

/** i 의 점 앞 낱말이 문장 끝이 아닌 줄임말(Mr. · a.m. …)인가. 영문자 · 점이 아닌 글자에서 거슬러 보기를 멈춘다. */
function endsWithAbbreviation(text: string, dot: number): boolean {
  let k = dot;
  while (k > 0 && ABBREVIATION_CHAR.test(text.charAt(k - 1))) k--;
  const word = text.slice(k, dot + 1).toLowerCase();
  return LOWER_ABBREVIATIONS.includes(word);
}

/**
 * 문장으로 자른다. `.` · `!` · `?` 와 그 뒤의 닫는 따옴표 · 괄호 다음이 공백이나 글 끝이면 자른다.
 * 앞 낱말이 SENTENCE_END_ABBREVIATIONS 이면 자르지 않는다. 숫자 사이 점(3.5)은 뒤가 공백이 아니라 자르지 않는다.
 * 줄바꿈도 문장 끝으로 본다. 빈 문장은 내지 않는다.
 */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  const push = (end: number, next: number) => {
    const sentence = text.slice(start, end).trim();
    if (sentence !== "") out.push(sentence);
    start = next;
  };
  let i = 0;
  while (i < text.length) {
    const ch = text.charAt(i);
    if (ch === "\n" || ch === "\r") {
      push(i, i + 1);
      i++;
      continue;
    }
    if (!SENTENCE_ENDERS.includes(ch)) {
      i++;
      continue;
    }
    let j = i;
    while (j < text.length && SENTENCE_ENDERS.includes(text.charAt(j))) j++;
    const singleDot = ch === "." && j === i + 1;
    while (j < text.length && CLOSERS.includes(text.charAt(j))) j++;
    const atBoundary = j >= text.length || WHITESPACE.test(text.charAt(j));
    if (atBoundary && !(singleDot && endsWithAbbreviation(text, i))) {
      push(j, j);
    }
    i = j;
  }
  push(text.length, text.length);
  return out;
}

// ── 토큰(6.4 틀 자리 · 빈칸, 3.6 문장 길이) ───────────────────────

export type TokenKind = "word" | "number" | "placeholder" | "blank";
export type Token = { kind: TokenKind; text: string };

/** 줄임말(Mr. · a.m. …)을 점까지 한 낱말로 잡는 갈래. 대소문자를 가리지 않고, 긴 것을 먼저 맞춘다(Mrs. 가 Mr. 보다 먼저). */
const ABBREVIATION_SOURCE = [...SENTENCE_END_ABBREVIATIONS]
  .sort((a, b) => b.length - a.length)
  .map((abbr) =>
    abbr
      .split("")
      .map((ch) =>
        ch === "." ? "\\." : `[${ch.toLowerCase()}${ch.toUpperCase()}]`,
      )
      .join(""),
  )
  .join("|");

// 차례: 틀 자리({NAME}, 뒤의 소유격 's 까지 한 토큰) · 빈칸 · 수(서수 꼬리 3rd 포함) · 줄임말 · 낱말. 나머지는 버린다.
// 줄임말 갈래는 SENTENCE_END_ABBREVIATIONS 로 만들어 RegExp 생성자로 컴파일한다(리터럴이 아니다).
const TOKEN = new RegExp(
  [
    "(\\{[A-Z_]+\\}(?:'s)?)",
    "(_{3,})",
    "(\\d+(?:[.,]\\d+)*(?:(?:st|nd|rd|th)(?![A-Za-z]))?)",
    `((?:${ABBREVIATION_SOURCE})(?![A-Za-z])|[A-Za-z]+(?:'[A-Za-z]+)*(?:-[A-Za-z]+)*)`,
  ].join("|"),
  "g",
);

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const m of normalizeQuotes(text).matchAll(TOKEN)) {
    const [whole, placeholder, blank, number] = m;
    const kind: TokenKind = placeholder
      ? "placeholder"
      : blank
        ? "blank"
        : number
          ? "number"
          : "word";
    out.push({ kind, text: whole });
  }
  return out;
}

/** 문장 낱말 수(3.6): 낱말 · 수 · 틀 자리 · 빈칸 토큰 수. 축약형은 한 낱말이다. */
export function sentenceWords(sentence: string): number {
  return tokenize(sentence).length;
}

// ── 단어 사전 · 원형 찾기(3.4 '활용형은 원형으로') ────────────────

/** vocab 행 가운데 글 도구가 쓰는 칸(5절 vocab). `word` 가 id 다(C54 (3)). */
export type LexiconEntry = {
  word: string;
  pos: readonly string[];
  level: number;
  forms: readonly string[];
};
type MultiEntry = { tokens: string[]; ids: string[] };
export type Lexicon = {
  /** 한 토큰 표기(소문자) → 원형 id 들. */
  forms: Map<string, string[]>;
  /** 여러 낱말 표기의 첫 토큰(소문자) → 표기 목록(긴 것 먼저). */
  multi: Map<string, MultiEntry[]>;
  entries: Map<string, LexiconEntry>;
};

function addId(list: string[], id: string): void {
  if (!list.includes(id)) list.push(id);
}

/** 원형 · 활용형을 소문자로 원형 id 에 잇는다. 띄어 쓴 표제어 · 활용형은 여러 낱말 표로 따로 둔다. */
export function buildLexicon(vocab: readonly LexiconEntry[]): Lexicon {
  const forms = new Map<string, string[]>();
  const multi = new Map<string, MultiEntry[]>();
  const entries = new Map<string, LexiconEntry>();
  for (const entry of vocab) {
    entries.set(entry.word, entry);
    for (const surface of [entry.word, ...entry.forms]) {
      const tokens = tokenize(surface).map((t) => t.text.toLowerCase());
      const [first] = tokens;
      if (first === undefined) continue;
      if (tokens.length === 1) {
        const list = forms.get(first) ?? [];
        addId(list, entry.word);
        forms.set(first, list);
        continue;
      }
      const list = multi.get(first) ?? [];
      const same = list.find((m) => m.tokens.join(" ") === tokens.join(" "));
      if (same) addId(same.ids, entry.word);
      else list.push({ tokens, ids: [entry.word] });
      multi.set(first, list);
    }
  }
  for (const list of multi.values()) {
    list.sort((a, b) => b.tokens.length - a.tokens.length);
  }
  return { forms, multi, entries };
}

export type LemmaPart = { text: string; ids: string[] };
/** 낱말 토큰 [start, end) 하나 또는 여러 낱말 표제어 하나. 조각마다 원형 id 들(찾지 못하면 빈 목록). */
export type LemmaMatch = {
  start: number;
  end: number;
  surface: string;
  parts: LemmaPart[];
};

/** 축약형 표(영어 문법 목록이라 코드 상수다, plan-p04a 글 도구). */
const IRREGULAR_CONTRACTIONS: Record<string, readonly string[]> = {
  "can't": ["can", "not"],
  "won't": ["will", "not"],
  "shan't": ["shall", "not"],
  "ain't": ["am", "not"],
};
const CONTRACTION_SUFFIXES: readonly (readonly [string, string])[] = [
  ["n't", "not"],
  ["'m", "am"],
  ["'re", "are"],
  ["'ve", "have"],
  ["'ll", "will"],
  ["'d", "would"],
  ["'s", "is"],
];

function lookup(text: string, lexicon: Lexicon): string[] {
  return [...(lexicon.forms.get(text.toLowerCase()) ?? [])];
}

/** 소유격 's · s' 를 뗀 꼴(없으면 undefined). */
function withoutPossessive(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (lower.endsWith("'s") && text.length > 2) return text.slice(0, -2);
  if (lower.endsWith("s'") && text.length > 2) return text.slice(0, -1);
  return undefined;
}

/** 한 낱말 토큰: 그대로 → 소유격을 뗀 것 → 축약형 → 하이픈 조각. */
export function resolveWord(text: string, lexicon: Lexicon): LemmaPart[] {
  const direct = lookup(text, lexicon);
  if (direct.length > 0) return [{ text, ids: direct }];
  const base = withoutPossessive(text);
  if (base !== undefined) {
    const ids = lookup(base, lexicon);
    if (ids.length > 0) return [{ text: base, ids }];
  }
  const lower = text.toLowerCase();
  const irregular = IRREGULAR_CONTRACTIONS[lower];
  if (irregular) {
    return irregular.map((w) => ({ text: w, ids: lookup(w, lexicon) }));
  }
  for (const [suffix, expansion] of CONTRACTION_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length) {
      const stem = text.slice(0, -suffix.length);
      return [
        { text: stem, ids: lookup(stem, lexicon) },
        { text: expansion, ids: lookup(expansion, lexicon) },
      ];
    }
  }
  if (text.includes("-")) {
    return text.split("-").map((piece) => ({
      text: piece,
      ids: lookup(piece, lexicon),
    }));
  }
  return [{ text, ids: [] }];
}

function matchMulti(
  tokens: readonly Token[],
  at: number,
  lexicon: Lexicon,
): LemmaMatch | undefined {
  const first = tokens[at];
  if (!first) return undefined;
  for (const entry of lexicon.multi.get(first.text.toLowerCase()) ?? []) {
    const end = at + entry.tokens.length;
    const window = tokens.slice(at, end);
    const same =
      window.length === entry.tokens.length &&
      window.every(
        (t, i) => t.kind === "word" && t.text.toLowerCase() === entry.tokens[i],
      );
    if (same) {
      const surface = window.map((t) => t.text).join(" ");
      return {
        start: at,
        end,
        surface,
        parts: [{ text: surface, ids: [...entry.ids] }],
      };
    }
  }
  return undefined;
}

/** 낱말 토큰마다 원형을 찾는다. 여러 낱말 표제어를 가장 길게 먼저 맞춘다. 수 · 틀 자리 · 빈칸은 내지 않는다. */
export function lemmasOf(
  tokens: readonly Token[],
  lexicon: Lexicon,
): LemmaMatch[] {
  const out: LemmaMatch[] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token?.kind !== "word") {
      i++;
      continue;
    }
    const multi = matchMulti(tokens, i, lexicon);
    if (multi) {
      out.push(multi);
      i = multi.end;
      continue;
    }
    out.push({
      start: i,
      end: i + 1,
      surface: token.text,
      parts: resolveWord(token.text, lexicon),
    });
    i++;
  }
  return out;
}

function isFunctionId(id: string, lexicon: Lexicon): boolean {
  return lexicon.entries.get(id)?.pos.includes(FUNCTION_POS) ?? false;
}

/** 모든 조각이 기능어로 찾아진 낱말인가(찾지 못한 조각이 있으면 아니다). */
function isFunctionParts(
  parts: readonly LemmaPart[],
  lexicon: Lexicon,
): boolean {
  return (
    parts.length > 0 &&
    parts.every((p) => p.ids.some((id) => isFunctionId(id, lexicon)))
  );
}

/** 글에 나온 원형 id 모음(6.4 어휘 배정). 넣은 차례를 지킨다. */
export function wordIdsIn(text: string, lexicon: Lexicon): Set<string> {
  const ids = new Set<string>();
  for (const match of lemmasOf(tokenize(text), lexicon)) {
    for (const part of match.parts) {
      for (const id of part.ids) ids.add(id);
    }
  }
  return ids;
}

export function containsWord(
  text: string,
  id: string,
  lexicon: Lexicon,
): boolean {
  return wordIdsIn(text, lexicon).has(id);
}

// ── 어휘 범위 밖(6.4 · 3.4) ──────────────────────────────────────

export type OffbandOptions = {
  lexicon: Lexicon;
  /** 그 수업 단계. 정해 둔 단계가 이 값 이하인 단어가 범위 안이다(3.4). */
  level: number;
  /** 이번 수업 새 단어 id. */
  newWords: readonly string[];
  /** 고유 명사 표기(글로서리 proper). 대소문자를 가린다. */
  properNouns: readonly string[];
};

function properSet(properNouns: readonly string[]): Set<string> {
  return new Set(properNouns.flatMap((p) => tokenize(p).map((t) => t.text)));
}

function isProper(surface: string, proper: Set<string>): boolean {
  const base = withoutPossessive(surface);
  return proper.has(surface) || (base !== undefined && proper.has(base));
}

/** 범위 밖 낱말 토큰의 표기(나온 차례, 겹쳐도 그대로). 여러 낱말 표제어는 토큰 수만큼 낸다. */
export function offbandWords(text: string, options: OffbandOptions): string[] {
  const { lexicon, level } = options;
  const fresh = new Set(options.newWords);
  const proper = properSet(options.properNouns);
  const inRange = (part: LemmaPart) =>
    part.ids.some(
      (id) =>
        fresh.has(id) ||
        (lexicon.entries.get(id)?.level ?? Number.POSITIVE_INFINITY) <= level,
    );
  const tokens = tokenize(text);
  const out: string[] = [];
  for (const match of lemmasOf(tokens, lexicon)) {
    const single = match.end - match.start === 1;
    if (single && isProper(match.surface, proper)) continue;
    if (match.parts.length > 0 && match.parts.every(inRange)) continue;
    for (const token of tokens.slice(match.start, match.end))
      out.push(token.text);
  }
  return out;
}

/**
 * 어휘 범위 밖 비율: 낱말 토큰 가운데 원형이 모두 단계 이하인 것 · 이번 수업 새 단어 · 고유 명사를 뺀 나머지 수 ÷ 낱말 토큰 수.
 * 수 · 틀 자리 · 빈칸은 둘 다에서 뺀다. 낱말 토큰이 없으면 0.
 */
export function offbandRatio(text: string, options: OffbandOptions): number {
  const words = tokenize(text).filter((t) => t.kind === "word").length;
  if (words === 0) return 0;
  return offbandWords(text, options).length / words;
}

// ── 글로서리(6.4) ────────────────────────────────────────────────

function glossaryKey(surface: string): string {
  return normalizeQuotes(surface).trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * 원형이 기능어가 아닌(또는 찾지 못한) 낱말 토큰 가운데 글로서리 surface(대소문자 무시, 소유격을 뗀 꼴도 본다)에 없는 표기형.
 * 여러 낱말 표제어는 그 표기나 그 안의 기능어 밖 낱말이 있으면 된다. 같은 표기는 한 번만 낸다.
 */
export function glossaryMissing(
  text: string,
  glossary: readonly { surface: string }[],
  lexicon: Lexicon,
): string[] {
  const have = new Set(glossary.map((g) => glossaryKey(g.surface)));
  const covered = (surface: string) => {
    const base = withoutPossessive(surface);
    return (
      have.has(glossaryKey(surface)) ||
      (base !== undefined && have.has(glossaryKey(base)))
    );
  };
  const tokens = tokenize(text);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of lemmasOf(tokens, lexicon)) {
    if (isFunctionParts(match.parts, lexicon)) continue;
    if (covered(match.surface)) continue;
    if (match.end - match.start > 1) {
      const inner = tokens
        .slice(match.start, match.end)
        .filter((t) => !isFunctionParts(resolveWord(t.text, lexicon), lexicon));
      if (inner.some((t) => covered(t.text))) continue;
    }
    const key = glossaryKey(match.surface);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(match.surface);
  }
  return out;
}

// ── 시드 정규식(형태 표 · 금지어) ─────────────────────────────────

const COMPILED = new Map<string, RegExp>();

/**
 * 시드 정규식을 iu 로 컴파일한다(같은 식은 한 번만). g 플래그가 없어 test · exec 가 상태를 남기지 않는다.
 * 컴파일되지 않는 식은 규격(schema/reference.ts)이 미리 거부한다.
 */
function compiled(source: string): RegExp {
  let re = COMPILED.get(source);
  if (!re) {
    re = new RegExp(source, "iu");
    COMPILED.set(source, re);
  }
  return re;
}

// ── 형태 표(3.6) ─────────────────────────────────────────────────

export type FormRule = {
  id: string;
  patterns: readonly string[];
  words: readonly string[];
};

function containsSequence(
  haystack: readonly string[],
  needle: readonly string[],
): boolean {
  if (needle.length === 0) return false;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((w, j) => haystack[i + j] === w)) return true;
  }
  return false;
}

function lowerTokens(text: string): string[] {
  return tokenize(text).map((t) => t.text.toLowerCase());
}

/** 소문자 문장에 정규식(iu)이 맞거나 토큰이 words 에 있으면 그 형태 id(형태 표 차례). */
export function formsIn(
  sentence: string,
  forms: readonly FormRule[],
): string[] {
  const lower = normalizeQuotes(sentence).toLowerCase();
  const tokens = lowerTokens(lower);
  return forms
    .filter(
      (form) =>
        form.patterns.some((p) => compiled(p).test(lower)) ||
        form.words.some((w) => containsSequence(tokens, lowerTokens(w))),
    )
    .map((form) => form.id);
}

// ── 금지 내용(6.4) ───────────────────────────────────────────────

export type ForbiddenList = {
  words: { en: readonly string[]; ko: readonly string[] };
  patterns: readonly {
    id: string;
    category: string;
    lang: string;
    regex: string;
  }[];
};
export type ForbiddenHit =
  | { kind: "en-word"; match: string }
  | { kind: "ko-word"; match: string }
  | { kind: "pattern"; match: string; id: string; category: string };

/**
 * 금지어 비교용 조각: 소유격 · 축약형을 뗀 줄기(불규칙 축약형은 펼친 낱말)를 하이픈으로 나눈 것.
 * 토큰 규칙이 stupid-head · stupid's 를 한 토큰으로 묶어 금지어가 새지 않게 한다(검토 I-3).
 */
function stemPieces(token: string): string[] {
  const irregular = IRREGULAR_CONTRACTIONS[token];
  if (irregular) return [...irregular];
  let stem = withoutPossessive(token) ?? token;
  if (stem === token) {
    const suffix = CONTRACTION_SUFFIXES.find(
      ([s]) => token.endsWith(s) && token.length > s.length,
    );
    if (suffix) stem = token.slice(0, -suffix[0].length);
  }
  return stem.split("-").filter((piece) => piece !== "");
}

/**
 * 영어 금지어는 낱말(여러 낱말은 낱말 경계) 단위로, 토큰 그대로와 소유격 · 축약형을 뗀 줄기의 하이픈 조각 둘 다에서 찾는다.
 * 한국어 금지어는 부분 글, 정규식은 모두(iu, 첫 걸림).
 */
export function forbiddenHits(
  text: string,
  list: ForbiddenList,
): ForbiddenHit[] {
  const hits: ForbiddenHit[] = [];
  const tokens = lowerTokens(text);
  const pieces = tokens.flatMap(stemPieces);
  for (const word of list.words.en) {
    const needle = lowerTokens(word);
    if (containsSequence(tokens, needle) || containsSequence(pieces, needle)) {
      hits.push({ kind: "en-word", match: word });
    }
  }
  for (const word of list.words.ko) {
    if (word !== "" && text.includes(word))
      hits.push({ kind: "ko-word", match: word });
  }
  for (const pattern of list.patterns) {
    const found = compiled(pattern.regex).exec(text);
    if (found) {
      hits.push({
        kind: "pattern",
        match: found[0],
        id: pattern.id,
        category: pattern.category,
      });
    }
  }
  return hits;
}

// ── 틀 자리(6.4) ─────────────────────────────────────────────────

/** `{…}` 틀 자리 목록(나온 차례). 빈칸(___)은 세지 않는다. {NAME} 밖의 것을 가리는 일은 부르는 쪽이 한다. */
export function placeholdersIn(text: string): string[] {
  return text.match(/\{[^{}]*\}/g) ?? [];
}

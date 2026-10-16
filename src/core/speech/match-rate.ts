// 6.2 일치율. 목표 문장 낱말 가운데 순서를 지켜 맞은 수 ÷ 목표 낱말 수.
// 정규화 차례와 표기는 plan-p02 '파일별 값' 1 이고, P4 검증기 · P8 생성 브리프가 같은 표기를 쓴다(다-7).
// DB · 브라우저 없는 순수 함수다. 1~3단계 따라 말하기 · 허용 답 판정에 AI 를 쓰지 않는다.

/** 이름 자리. 시드 문장의 {NAME} 은 정규화 뒤에도 이 낱말로 남는다. */
export const NAME_SLOT = "{NAME}";

export type MatchOptions = {
  /** 동음이의어 묶음(낱말 묶음의 배열). 묶음의 낱말은 그 묶음의 첫 낱말로 본다. */
  homophones: readonly (readonly string[])[];
  /** any-word: {NAME} 은 인식 낱말 아무것 하나와 맞다(6.2). excluded: 분자 · 분모에서 뺀다(talk.hint_read_match). */
  nameSlot: "any-word" | "excluded";
};

// 정규화 중 {NAME} 을 지켜 두는 표지. 글자 · 숫자가 아닌 사용자 정의 영역 글자(U+E000)라
// 문장 부호 지우기에서 따로 남긴다.
const NAME_MARK = String.fromCodePoint(0xe000);
// 하이픈과 줄표(U+2010~U+2015), 지울 문장 부호(표지는 남김), 굽은 따옴표.
const HYPHENS = /[-\u2010-\u2015]/g;
const PUNCTUATION = /[^\p{L}\p{N}\s\ue000]/gu;
const CURLY_QUOTES = /[\u2018\u2019\u02bc]/g;
// {NAME} 과 바로 뒤에 붙은 축약(곧은 · 굽은 따옴표 둘 다). 's 는 자리에 흡수하고, 'll · 'd · 've · 're · 'm 은
// 값 1 (3) 펼침 표대로 낱말로 펴서 표지 뒤에 둔다(재검토 M-A).
const NAME_WITH_CONTRACTION =
  /\{NAME\}(?:['\u2018\u2019\u02bc](s|ll|d|ve|re|m)\b)?/gi;
const NAME_CONTRACTION_WORDS: Readonly<Record<string, string>> = {
  ll: "will",
  d: "would",
  ve: "have",
  re: "are",
  m: "am",
};

function spellNameSlot(_whole: string, suffix?: string): string {
  const word =
    suffix === undefined
      ? undefined
      : NAME_CONTRACTION_WORDS[suffix.toLowerCase()];
  return word === undefined ? ` ${NAME_MARK} ` : ` ${NAME_MARK} ${word} `;
}

// 숫자를 낱말로 바꾸는 범위의 끝(plan-p02 값 1 (4)). 넘는 수는 그대로 둔다.
const MAX_SPELLED_NUMBER = 999_999;

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];
const IRREGULAR_ORDINALS: Readonly<Record<string, string>> = {
  one: "first",
  two: "second",
  three: "third",
  five: "fifth",
  eight: "eighth",
  nine: "ninth",
  twelve: "twelfth",
};

function belowHundred(n: number): string {
  if (n < 20) return ONES[n] ?? "";
  const ones = n % 10;
  const tens = TENS[Math.floor(n / 10)] ?? "";
  return ones === 0 ? tens : `${tens} ${ONES[ones]}`;
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(`${ONES[hundreds]} hundred`);
  if (rest > 0 || hundreds === 0) parts.push(belowHundred(rest));
  return parts.join(" ");
}

/** 0 ~ 999,999 를 'and' 없는 기수 낱말로. 105 → 'one hundred five'. */
function cardinalWords(n: number): string {
  const thousands = Math.floor(n / 1000);
  const rest = n % 1000;
  if (thousands === 0) return belowThousand(rest);
  const head = `${belowThousand(thousands)} thousand`;
  return rest === 0 ? head : `${head} ${belowThousand(rest)}`;
}

function ordinalWords(n: number): string {
  const words = cardinalWords(n).split(" ");
  const last = words.pop() ?? "";
  const irregular = IRREGULAR_ORDINALS[last];
  const ordinal =
    irregular ??
    (last.endsWith("y") ? `${last.slice(0, -1)}ieth` : `${last}th`);
  return [...words, ordinal].join(" ");
}

function parseNumber(digits: string): number | undefined {
  const value = Number(digits.replaceAll(",", ""));
  return Number.isSafeInteger(value) && value <= MAX_SPELLED_NUMBER
    ? value
    : undefined;
}

function spellTime(hourText: string, minuteText: string): string | undefined {
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (hour > 23 || minute > 59) return undefined;
  const hourWords = cardinalWords(hour);
  if (minute === 0) return `${hourWords} oclock`;
  if (minute < 10) return `${hourWords} oh ${ONES[minute]}`;
  return `${hourWords} ${belowHundred(minute)}`;
}

// 숫자 앞뒤가 낱말 · 소수점 · 시각이면 바꾸지 않는다('그 밖의 숫자 꼴은 그대로').
const NUMBER = String.raw`(\d{1,3}(?:,\d{3})+|\d+)`;
const TIME_PATTERN = /(?<![\w.,:])(\d{1,2}):(\d{2})(?![\w:]|[.,]\d)/g;
const ORDINAL_PATTERN = new RegExp(
  String.raw`(?<![\w.,:])${NUMBER}(st|nd|rd|th)(?![\w:]|[.,]\d)`,
  "g",
);
const CARDINAL_PATTERN = new RegExp(
  String.raw`(?<![\w.,:])${NUMBER}(?![\w:]|[.,]\d)`,
  "g",
);

// 's → is 는 이 낱말 뒤에서만(대명사 · i 빼고). 소유의 's 는 두고 따옴표만 지운다.
const IS_CONTRACTION_HOSTS =
  "he|she|it|you|we|they|this|that|there|here|what|where|who|how";

const CONTRACTIONS: readonly [RegExp, string][] = [
  [/\bwon't\b/g, "will not"],
  [/\bcan't\b/g, "can not"],
  [/\bshan't\b/g, "shall not"],
  [/\b(\w+)n't\b/g, "$1 not"],
  [/\bcannot\b/g, "can not"],
  [/\blet's\b/g, "let us"],
  [/\b(\w+)'m\b/g, "$1 am"],
  [/\b(\w+)'re\b/g, "$1 are"],
  [/\b(\w+)'ve\b/g, "$1 have"],
  [/\b(\w+)'ll\b/g, "$1 will"],
  [/\b(\w+)'d\b/g, "$1 would"],
  [new RegExp(String.raw`\b(${IS_CONTRACTION_HOSTS})'s\b`, "g"), "$1 is"],
];

function homophoneMap(
  homophones: readonly (readonly string[])[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const group of homophones) {
    const head = group[0]?.toLowerCase();
    if (head === undefined) continue;
    for (const word of group) {
      const key = word.toLowerCase();
      if (!map.has(key)) map.set(key, head);
    }
  }
  return map;
}

/**
 * 견주기 전 정규화(plan-p02 값 1 의 (1)~(6)). 낱말 배열을 돌려준다.
 * {NAME} 자리는 '{NAME}' 낱말 하나로 남는다.
 */
export function normalizeForMatch(
  text: string,
  homophones: readonly (readonly string[])[],
): string[] {
  // (1) 소문자로, 굽은 따옴표는 ' 로. {NAME} 은 앞뒤 빈칸으로 감싼 표지로 지켜 두어 이웃 낱말과
  // 붙지 않게 하고, 바로 뒤의 소유 's 는 표지에 흡수하고 'll 등은 편다. 입력에 든 표지 글자는 먼저 지운다(검토 M-1).
  let s = text
    .replaceAll(NAME_MARK, "")
    .replace(NAME_WITH_CONTRACTION, spellNameSlot)
    .toLowerCase()
    .replace(CURLY_QUOTES, "'");
  // (2) 시각 h:mm 을 낱말로.
  s = s.replace(
    TIME_PATTERN,
    (whole, hour: string, minute: string) => spellTime(hour, minute) ?? whole,
  );
  // (3) 축약형 펼침.
  for (const [pattern, replacement] of CONTRACTIONS) {
    s = s.replace(pattern, replacement);
  }
  // (4) 서수 · 기수를 낱말로(쉼표 든 수 포함, 0 ~ 999,999).
  s = s.replace(ORDINAL_PATTERN, (whole, digits: string) => {
    const value = parseNumber(digits);
    return value === undefined ? whole : ordinalWords(value);
  });
  s = s.replace(CARDINAL_PATTERN, (whole, digits: string) => {
    const value = parseNumber(digits);
    return value === undefined ? whole : cardinalWords(value);
  });
  // (5) 하이픈은 빈칸으로, 나머지 문장 부호는 지운다({NAME} 표지는 남긴다).
  s = s.replace(HYPHENS, " ").replace(PUNCTUATION, "");
  // (6) 빈칸으로 자르고 동음이의어를 묶음의 첫 낱말로.
  const map = homophoneMap(homophones);
  return s
    .split(/\s+/)
    .filter((word) => word !== "")
    .map((word) => (word === NAME_MARK ? NAME_SLOT : (map.get(word) ?? word)));
}

/** 가장 긴 공통 부분열 길이(바꿔치기 없는 정렬, plan-p02 나-1). {NAME} 은 아무 낱말 하나와 맞다. */
function orderedMatches(
  target: readonly string[],
  heard: readonly string[],
): number {
  let previous: number[] = new Array(heard.length + 1).fill(0);
  for (const want of target) {
    const current: number[] = [0];
    for (let j = 1; j <= heard.length; j += 1) {
      const same = want === NAME_SLOT || want === heard[j - 1];
      const diagonal = previous[j - 1] ?? 0;
      const up = previous[j] ?? 0;
      const left = current[j - 1] ?? 0;
      current.push(same ? diagonal + 1 : Math.max(up, left));
    }
    previous = current;
  }
  return previous[heard.length] ?? 0;
}

/**
 * 일치율(0~1). 덧붙인 말은 감점하지 않는다. 인식이 비면 0, 목표가 비면 던진다(시드 검증기가 막을 일).
 */
export function matchRate(
  target: string,
  heard: string,
  options: MatchOptions,
): number {
  const normalized = normalizeForMatch(target, options.homophones);
  const targetWords =
    options.nameSlot === "excluded"
      ? normalized.filter((word) => word !== NAME_SLOT)
      : normalized;
  if (targetWords.length === 0) {
    throw new Error(`일치율: 목표 문장에 견줄 낱말이 없다: '${target}'`);
  }
  const heardWords = normalizeForMatch(heard, options.homophones);
  if (heardWords.length === 0) return 0;
  return orderedMatches(targetWords, heardWords) / targetWords.length;
}

/** 허용 답이 여럿이면 가장 높은 일치율(6.2). 허용 답이 없으면 던진다. */
export function bestMatchRate(
  targets: readonly string[],
  heard: string,
  options: MatchOptions,
): number {
  if (targets.length === 0) {
    throw new Error("일치율: 허용 답이 하나도 없다");
  }
  return Math.max(
    ...targets.map((target) => matchRate(target, heard, options)),
  );
}

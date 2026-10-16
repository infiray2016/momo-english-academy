// 입력 가림(6.1 '아이 이름은 보내지 않는다' · 전화번호 · 주소 형태 가림, AC-N4 · C63 (5), plan-p09b 파일별 값 2).
// 아이 입력 · 인식 글 · 대화 기록을 AI 로 보내기 전에 이름을 {NAME} 으로, 연락처를 *** 로 바꾼다.
// 순수 모듈이다. 정규식에 뒤보기 · \p{…} 를 쓰지 않는다(tsconfig ES2017, P4a 위험 5).
import { PLACEHOLDER_NAME } from "@/core/seed/structure";

/** 가린 연락처 자리(정할 것 나). */
export const CONTACT_MASK = "***";

/** 넉 자 한글 이름의 두 글자 성(언어 사실이라 설정값이 아니다, 6.1 '성을 뺀 이름'). */
export const TWO_SYLLABLE_SURNAMES = [
  "남궁",
  "황보",
  "제갈",
  "선우",
  "독고",
  "사공",
  "서문",
] as const;

/** 앱 연락처 정규식 하나. keepsPrefix 면 1번 묶음이 앞 글자(뒤보기 대신)이고 2번 묶음이 연락처다. */
export type ContactPattern = { source: string; keepsPrefix: boolean };

/**
 * 앱에 둔 최소 연락처 정규식(6.1 · 3.3). 휴대 · 지역 전화번호(0 으로 시작하는 2~3자리 · 3~4자리 · 4자리,
 * 사이에 - · . · 공백 또는 붙여 씀)와 전자 우편. 주소 꼴은 시드 forbidden 의 contact 정규식(P6, C67 (4))이 맡는다.
 * 전화번호의 경계는 숫자다 — 영문자에 붙여 쓴 번호(call010…, Ganada010-…)도 가린다(검토 I-2).
 */
export const BUILTIN_CONTACT_PATTERNS: readonly ContactPattern[] = [
  {
    source: "(^|[^0-9])(0\\d{1,2}[-. ]?\\d{3,4}[-. ]?\\d{4})(?![0-9])",
    keepsPrefix: true,
  },
  {
    source: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}",
    keepsPrefix: false,
  },
];

/** 이름 변형 · 한글 · 영어 이름의 짧은 조각 하한(두 글자 미만 변형은 버린다). */
const MIN_VARIANT_LENGTH = 2;
/** 성을 뺄 수 있는 한글 이름 길이(세 글자 → 뒤 두 글자, 넉 자 → 두 글자 성이면 뒤 두 글자). */
const THREE_SYLLABLES = 3;
const FOUR_SYLLABLES = 4;
const SURNAME_TWO = 2;
const SURNAME_ONE = 1;

const HANGUL = /[\uAC00-\uD7A3]/;
const LATIN_LETTER = "A-Za-z";
const NAME_SEPARATORS = /[\s-]+/;
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

export type NameSource = {
  /** 한글 이름(홈 화면 이름). */
  displayName: string;
  englishName: string;
  /** 영어 이름이 vocab 단어와 같을 때의 별명(FR-1). */
  nickname?: string | null;
};

export type MaskResult = { text: string; names: number; contacts: number };
export type Masker = (text: string) => MaskResult;

function koreanVariants(displayName: string): string[] {
  const name = displayName.trim();
  if (name === "") return [];
  const out = [name];
  const chars = Array.from(name);
  if (chars.length === THREE_SYLLABLES) {
    out.push(chars.slice(SURNAME_ONE).join(""));
  } else if (
    chars.length === FOUR_SYLLABLES &&
    (TWO_SYLLABLE_SURNAMES as readonly string[]).includes(
      chars.slice(0, SURNAME_TWO).join(""),
    )
  ) {
    out.push(chars.slice(SURNAME_TWO).join(""));
  }
  return out;
}

function englishVariants(names: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (name === "") continue;
    out.push(name);
    const pieces = name.split(NAME_SEPARATORS);
    if (pieces.length > 1) out.push(...pieces);
  }
  return out;
}

/**
 * 이름 변형 목록(긴 것부터). 한글: 이름 그대로 · 세 글자면 뒤 두 글자 · 넉 자이고 앞 두 글자가 두 글자 성이면 뒤 두 글자.
 * 영어: 영어 이름 · 별명 그대로와 띄어쓰기 · 하이픈으로 나눈 조각. 두 글자 미만과 isVocabWord 가 참인 변형은 뺀다(6.1 끝 문장).
 * 영어 변형은 대소문자를 가리지 않고 겹침을 뺀다.
 */
export function nameVariantsOf(
  source: NameSource,
  isVocabWord: (variant: string) => boolean,
): string[] {
  const candidates = [
    ...koreanVariants(source.displayName),
    ...englishVariants([source.englishName, source.nickname ?? ""]),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const variant of candidates) {
    const key = HANGUL.test(variant) ? variant : variant.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (Array.from(variant).length < MIN_VARIANT_LENGTH) continue;
    if (isVocabWord(variant)) continue;
    out.push(variant);
  }
  // 차례를 지키는 정렬(같은 길이는 넣은 차례)
  return out
    .map((variant, index) => ({ variant, index }))
    .sort(
      (a, b) =>
        Array.from(b.variant).length - Array.from(a.variant).length ||
        a.index - b.index,
    )
    .map(({ variant }) => variant);
}

/**
 * 영어 변형의 정규식: 글자 사이에 공백 · 하이픈이 있어도 맞고 대소문자를 가리지 않는다.
 * 앞뒤가 영문자가 아닐 때만 맞는다 — 앞 글자는 뒤보기 대신 잡아서(1번 묶음) 되돌려 넣는다.
 */
function englishPattern(variant: string): RegExp {
  const letters = Array.from(variant.replace(/[\s-]+/g, "")).map((ch) =>
    ch.replace(REGEX_SPECIAL, "\\$&"),
  );
  const body = letters.join("[\\s-]*");
  return new RegExp(
    `(^|[^${LATIN_LETTER}])(${body})(?![${LATIN_LETTER}])`,
    "gi",
  );
}

function compileContact({ source, keepsPrefix }: ContactPattern): {
  regex: RegExp;
  keepsPrefix: boolean;
} {
  return { regex: new RegExp(source, "giu"), keepsPrefix };
}

/**
 * 가림 함수. 연락처를 먼저, 이름을 뒤에(긴 변형부터) 바꾼다(이름이 든 전자 우편이 통째로 가려지게). 한글 변형은 글 그대로 찾는다(조사가 붙어도 바꾼다).
 * 연락처는 BUILTIN_CONTACT_PATTERNS 와 넘긴 시드 contact 정규식을 모두 CONTACT_MASK 로.
 */
export function createMasker({
  names,
  isVocabWord,
  contactPatterns,
}: {
  names: NameSource;
  isVocabWord: (variant: string) => boolean;
  contactPatterns: readonly string[];
}): Masker {
  const variants = nameVariantsOf(names, isVocabWord);
  const contacts = [
    ...BUILTIN_CONTACT_PATTERNS,
    ...contactPatterns.map((source) => ({ source, keepsPrefix: false })),
  ].map(compileContact);
  return (input) => {
    let text = input;
    let nameCount = 0;
    let contactCount = 0;
    // 연락처를 먼저 가린다. 이름을 먼저 바꾸면 이름이 든 전자 우편(ganada@…)의 이름 자리만 바뀌고 나머지가 남는다
    for (const { regex, keepsPrefix } of contacts) {
      text = text.replace(regex, (_match, before: unknown) => {
        contactCount += 1;
        return keepsPrefix ? `${before}${CONTACT_MASK}` : CONTACT_MASK;
      });
    }
    for (const variant of variants) {
      if (HANGUL.test(variant)) {
        const parts = text.split(variant);
        nameCount += parts.length - 1;
        text = parts.join(PLACEHOLDER_NAME);
      } else {
        text = text.replace(englishPattern(variant), (_m, before: string) => {
          nameCount += 1;
          return `${before}${PLACEHOLDER_NAME}`;
        });
      }
    }
    return { text, names: nameCount, contacts: contactCount };
  };
}

/** {NAME} 을 영어 이름으로 채운다(화면 · 읽어 주기용, P11). */
export function fillName(text: string, englishName: string): string {
  return text.split(PLACEHOLDER_NAME).join(englishName);
}

// 한글 이름 → 토리가 부를 영어 이름 미리 채움(4절 첫 실행 행 · AC-1c, plan-p10a 파일별 값 6).
// 국어의 로마자 표기법(문화체육관광부 고시 2014-42호) 제2장 표기 일람과 제3장 제4항을 따른다.
// 인명은 이름에서 일어나는 음운 변화를 표기에 반영하지 않는다(보기: 한복남 Han Boknam · 홍빛나 Hong Bitna).
// 그래서 음절마다 첫소리 · 가운뎃소리 · 끝소리를 표대로 적고(끝소리는 대표음), 음절 사이 연음 · 동화를 하지 않는다.
// 제2장 붙임 2 의 'ㄹㄹ 은 ll' 은 표기 일람의 규칙이라 따른다. 첫 글자만 대문자, 붙임표 없이 붙여 쓴다.
// 부모가 고치는 미리 채움이다. 여기서 틀려도 부모가 바로잡는다.
// 13절 C74(잠정): 음절마다 관용 철자 표(여권 통계 1위, romanize-spellings.ts)를 먼저 찾고, 표에 없는 음절만 위 고시 규칙으로 적는다.
// 이어 붙인 철자를 다시 맞추지 않는다(Hyun + woo). ㄹㄹ 은 표의 철자에도 같게 l 로.

import { GIVEN_NAME_SPELLINGS } from "./romanize-spellings";

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
/** 가운뎃소리 21 × 끝소리 28(유니코드 한글 음절 배열). */
const MEDIAL_COUNT = 21;
const FINAL_COUNT = 28;

/** 첫소리 19(ㄱ ㄲ ㄴ ㄷ ㄸ ㄹ ㅁ ㅂ ㅃ ㅅ ㅆ ㅇ ㅈ ㅉ ㅊ ㅋ ㅌ ㅍ ㅎ). ㅇ 은 소리 없음. */
const INITIALS = [
  "g",
  "kk",
  "n",
  "d",
  "tt",
  "r",
  "m",
  "b",
  "pp",
  "s",
  "ss",
  "",
  "j",
  "jj",
  "ch",
  "k",
  "t",
  "p",
  "h",
] as const;
/** 가운뎃소리 21(ㅏ ㅐ ㅑ ㅒ ㅓ ㅔ ㅕ ㅖ ㅗ ㅘ ㅙ ㅚ ㅛ ㅜ ㅝ ㅞ ㅟ ㅠ ㅡ ㅢ ㅣ). */
const MEDIALS = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
] as const;
/**
 * 끝소리 28(없음 ㄱ ㄲ ㄳ ㄴ ㄵ ㄶ ㄷ ㄹ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅁ ㅂ ㅄ ㅅ ㅆ ㅇ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ).
 * 받침은 대표음(k · t · p · n · l · m · ng)으로 적는다(제2장 붙임 1). 겹받침은 대표음 하나.
 */
const FINALS = [
  "",
  "k",
  "k",
  "k",
  "n",
  "n",
  "n",
  "t",
  "l",
  "k",
  "m",
  "l",
  "l",
  "l",
  "p",
  "l",
  "m",
  "p",
  "p",
  "t",
  "t",
  "ng",
  "t",
  "t",
  "k",
  "t",
  "p",
  "t",
] as const;
/** 첫소리 ㄹ · 끝소리 ㄹ 의 자리(위 배열 안 번호). */
const INITIAL_RIEUL = 5;
const FINAL_RIEUL = 8;

/** 두 글자 성(이름 넉 자일 때 앞 두 글자, P9b mask.ts 의 이름 변형과 같은 목록 — P9 합칠 때 하나로). */
export const TWO_SYLLABLE_SURNAMES: readonly string[] = [
  "남궁",
  "황보",
  "제갈",
  "선우",
  "독고",
  "사공",
  "서문",
];
/** 성을 빼는 글자 수(세 글자 이름은 앞 한 글자가 성, 넉 자는 두 글자 성일 때). */
const THREE_SYLLABLES = 3;
const FOUR_SYLLABLES = 4;

type Syllable = { initial: number; medial: number; final: number };

function decompose(char: string): Syllable {
  const offset = (char.codePointAt(0) ?? HANGUL_FIRST) - HANGUL_FIRST;
  return {
    initial: Math.floor(offset / (MEDIAL_COUNT * FINAL_COUNT)),
    medial: Math.floor((offset % (MEDIAL_COUNT * FINAL_COUNT)) / FINAL_COUNT),
    final: offset % FINAL_COUNT,
  };
}

function isHangulSyllable(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return code >= HANGUL_FIRST && code <= HANGUL_LAST;
}

/** 성을 뺀 이름 부분(세 글자는 뒤 두 글자, 넉 자이고 앞 두 글자가 두 글자 성이면 뒤 두 글자, 그 밖은 그대로). */
function givenPart(syllables: readonly string[]): readonly string[] {
  if (syllables.length === THREE_SYLLABLES) return syllables.slice(1);
  if (
    syllables.length === FOUR_SYLLABLES &&
    TWO_SYLLABLE_SURNAMES.includes(syllables.slice(0, 2).join(""))
  ) {
    return syllables.slice(2);
  }
  return syllables;
}

/** 한글 이름(성 포함 가능)의 이름 부분을 로마자로. 한글 음절이 아닌 글자는 버리고, 남는 것이 없으면 빈 글자. */
export function romanizeGivenName(displayName: string): string {
  const syllables = [...displayName].filter(isHangulSyllable);
  const given = givenPart(syllables);
  const parts = given.map(decompose);
  let out = "";
  parts.forEach((s, i) => {
    const previous = parts[i - 1];
    // ㄹㄹ 은 ll(제2장 붙임 2): 앞 끝소리가 ㄹ 이면 첫소리 ㄹ 을 l 로
    const rieulRieul =
      s.initial === INITIAL_RIEUL && previous?.final === FINAL_RIEUL;
    const common = GIVEN_NAME_SPELLINGS[given[i] ?? ""];
    if (common !== undefined) {
      out += rieulRieul ? common.replace(/^r/, "l") : common;
      return;
    }
    const initial = rieulRieul ? "l" : INITIALS[s.initial];
    out += `${initial}${MEDIALS[s.medial]}${FINALS[s.final]}`;
  });
  return out.charAt(0).toUpperCase() + out.slice(1);
}

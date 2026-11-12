// 회화 구조 비교 실험(13절 C234 · task-exp-harness): 아이 역이 낸 말에 정해진 차례에만 넣는 음성 인식 잡음(순수 함수).
// 같은 씨앗이면 네 방식 모두 같은 차례에 넣는다. 그 차례의 행동이 speak 일 때만 넣고, 아니면 건너뛴다(다음 차례로 미루지 않음).

/** 씨앗마다 잡음을 넣는 아이 차례 번호(1부터). */
export const NOISE_TURNS: Readonly<Record<number, readonly number[]>> = {
  1: [4, 9, 14],
  2: [3, 7, 12, 16],
};

/** 잘못 들리는 낱말 짝(들은 말에 처음 나오는 하나만 바꾼다). */
export const NOISE_SWAPS: readonly (readonly [string, string])[] = [
  ["sea", "see"],
  ["beach", "teach"],
  ["whale", "well"],
  ["swim", "swing"],
  ["dog", "dock"],
  ["park", "pork"],
  ["read", "red"],
  ["bread", "red"],
  ["cat", "cap"],
  ["ramen", "lemon"],
  ["walk", "work"],
];

/** 바꿀 낱말이 없을 때 말 전체를 바꾸는 글(그 수업에서 잡음을 넣은 횟수 차례대로). */
export const NOISE_FALLBACKS = [
  "Tomorrow",
  "Pad",
  "I can see",
  "Sure",
] as const;

export type NoiseResult = {
  heard: string;
  how: "swap" | "replace";
  from?: string;
  to?: string;
};

export function isNoiseTurn(seed: number, childTurnNo: number): boolean {
  return (NOISE_TURNS[seed] ?? []).includes(childTurnNo);
}

const SWAP = new Map(NOISE_SWAPS.map(([a, b]) => [a, b]));

/** 원래 낱말의 대소문자 꼴을 따른다(첫 글자가 대문자면 대문자, 모두 대문자면 모두 대문자). */
function caseLike(original: string, to: string): string {
  if (original.length > 1 && original === original.toUpperCase())
    return to.toUpperCase();
  const first = original.charAt(0);
  return first === first.toUpperCase() && first !== first.toLowerCase()
    ? to.charAt(0).toUpperCase() + to.slice(1)
    : to;
}

/**
 * 잡음 하나: 말에 바꿀 낱말(온 낱말 일치, 대소문자 무시)이 있으면 말 안에서 처음 나오는 것 하나를 바꾸고, 없으면 말 전체를
 * NOISE_FALLBACKS[injectedBefore % 4] 로 바꾼다. injectedBefore 는 그 수업에서 이번 앞까지 잡음을 넣은 횟수다.
 */
export function noiseOf(says: string, injectedBefore: number): NoiseResult {
  const re = /[A-Za-z]+/g;
  for (let m = re.exec(says); m !== null; m = re.exec(says)) {
    const word = m[0];
    const to = SWAP.get(word.toLowerCase());
    if (to === undefined) continue;
    const at = m.index;
    return {
      heard: `${says.slice(0, at)}${caseLike(word, to)}${says.slice(at + word.length)}`,
      how: "swap",
      from: word,
      to: caseLike(word, to),
    };
  }
  const heard =
    NOISE_FALLBACKS[
      ((injectedBefore % NOISE_FALLBACKS.length) + NOISE_FALLBACKS.length) %
        NOISE_FALLBACKS.length
    ] ?? NOISE_FALLBACKS[0];
  return { heard, how: "replace" };
}

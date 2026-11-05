// 쓰기 1~3단계 문항의 틀린 까닭 가르기(델타 spec 2026-10-29 가르치고 배우는 수업 설계 1 '틀린 뒤 차례' · 2 쓰기 행 · 5 '정본 밖 문구'
// 표, plan 다 · 정한 것 8, 정본 15절 AC-3d). DB · 화면 없는 순수 함수다. 조립 문항은 낱말 차례가 다르면 시드 whyKo, 차례가 같고
// 첫 낱말이 정답처럼 대문자로 시작하지 않으면 대문자 문구, 그 밖에 마침표 자리가 다르면 마침표 문구다. 대문자와 마침표가 함께 틀리면
// 대문자 문구 하나만 보인다(한 화면 한 줄). 앱 문구는 설계 5 표 글자 그대로이고, 새 문구를 만들지 않는다.
import {
  type Answer,
  type CheckItem,
  checkAnswer,
  normalizeTyped,
} from "@/core/answer/check";

/** 쓰기 '왜' 앱 문구(델타 spec 설계 5 '정본 밖 문구' 표 쓰기 행, 표본 W9). */
export const WRITING_WHY_KO = {
  capital: "첫 글자를 대문자 단추로 바꿔요.",
  period: "마침표는 맨 끝에 놓아요.",
} as const;

/** 틀린 까닭: 차례(시드 whyKo — 조립이 아닌 문항도 이 자리) · 대문자 · 마침표. */
export type WritingWhyReason = "order" | "capital" | "period";

export type WritingWhy = {
  reason: WritingWhyReason;
  /** 보일 '왜' 한 줄. 차례는 시드 whyKo(없으면 undefined — 화면은 '왜' 줄 없이 같은 문제 다시), 대문자 · 마침표는 앱 문구. */
  textKo: string | undefined;
};

/** 문장 끝 표시 카드(마침표 카드). */
const PERIOD = ".";
/** 문장 부호 카드(앞 카드에 붙는 카드 — check.ts joinCards 와 같은 갈래). */
const PUNCTUATION = /^[.,?!]$/;

const isAssemble = (
  item: CheckItem,
): item is Extract<
  CheckItem,
  { type: "assemble-phrase" | "assemble-sentence" }
> => item.type === "assemble-phrase" || item.type === "assemble-sentence";

/** 허용 정답 글을 카드 차례로(낱말 · 문장 부호 카드). */
function cardsOf(text: string): string[] {
  return normalizeTyped(text)
    .split(" ")
    .flatMap((word) => {
      const mark = word.at(-1) ?? "";
      return word.length > 1 && PUNCTUATION.test(mark)
        ? [word.slice(0, -1), mark]
        : [word];
    })
    .filter((card) => card !== "");
}

const wordsOf = (cards: readonly string[]) =>
  cards.filter((c) => !PUNCTUATION.test(c)).map((c) => c.toLowerCase());

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** 첫 낱말 카드가 대문자로 시작하는가. */
const startsUpper = (cards: readonly string[]): boolean => {
  const first = cards.find((c) => !PUNCTUATION.test(c)) ?? "";
  const letter = first.charAt(0);
  return (
    letter !== "" &&
    letter === letter.toUpperCase() &&
    letter !== letter.toLowerCase()
  );
};

/** 마침표 카드가 놓인 자리(낱말 카드 몇 개 뒤인가, 없으면 -1). */
const periodAt = (cards: readonly string[]): number => {
  const at = cards.indexOf(PERIOD);
  return at < 0 ? -1 : wordsOf(cards.slice(0, at)).length;
};

/**
 * 틀린 답의 까닭(정한 것 8). 맞힌 답이면 undefined. 조립 문항이 아니면(고르기 · 베끼기 · 받아쓰기 …) 차례 갈래의 시드 whyKo 다.
 * 허용 정답이 여럿이면 낱말 차례가 같은 정답과 견주고, 차례가 같은 정답이 없으면 차례다.
 */
export function writingWhyOf(
  item: CheckItem & { whyKo?: string },
  answer: Answer,
): WritingWhy | undefined {
  if (checkAnswer(item, answer, { homophones: [] }).correct) return undefined;
  const order: WritingWhy = { reason: "order", textKo: item.whyKo };
  if (!isAssemble(item) || answer.kind !== "tiles") return order;
  const given = answer.pieces;
  const words = wordsOf(given);
  const expected = item.accepted
    .map(cardsOf)
    .find((cards) => sameList(wordsOf(cards), words));
  if (!expected) return order;
  // 차례가 같다: 대문자(마침표와 함께 틀려도 대문자 하나) → 마침표
  if (startsUpper(expected) && !startsUpper(given))
    return { reason: "capital", textKo: WRITING_WHY_KO.capital };
  if (periodAt(expected) !== periodAt(given))
    return { reason: "period", textKo: WRITING_WHY_KO.period };
  // 카드는 정답 카드뿐이라 여기 오지 않는다(다른 낱말의 대소문자 등) — 차례 갈래로 둔다
  return order;
}

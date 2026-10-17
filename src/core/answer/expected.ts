// 쓰기 1~3 문항의 정답 조각(plan-p11a 값 11 · C77 (2) '틀리면 정답을 보여 주고 맞힐 때까지' · C73). 화면은 '정답은 이거예요'에
// 이 조각을 타일 · 카드 차례 그대로 보인다. 첫 허용 정답에서 만들며, 그 조각을 그대로 답으로 넣으면 checkAnswer 가 맞음이다
// (단위 시험이 견본 수업으로 맞댄다). DB 없는 순수 함수다.
import type { Answer } from "@/core/answer/check";
import type { WritingItem } from "@/core/seed/schema/lesson";

/** fill-letters 무늬의 빈 글자 자리(P4a). */
const BLANK_LETTER = "_";
/** 문장 · 어구를 낱말 카드와 문장 부호 카드로 가른다(C73 — 마침표 카드는 따로). */
const CARD_TOKENS = /[^\s.,?!]+|[.,?!]/g;

/** 문장 · 어구를 낱말 카드 · 문장 부호 카드 차례로 가른다. */
export function cardTokensOf(sentence: string): string[] {
  return sentence.match(CARD_TOKENS) ?? [];
}

/**
 * 조립 카드의 화면 글. 시드 카드는 소문자 그대로이고(C73) 아이는 첫 칸 카드만 '대문자' 단추로 바꾼다. 그래서 문장 가운데 대문자로
 * 쓰는 낱말(고유 명사 · I)의 카드는 첫 허용 정답의 꼴로 보인다 — 그렇지 않으면 화면으로 낼 수 없는 정답이 생긴다(차례 3 CI 3차,
 * 견본 'They kububa with Momo.'). 첫 낱말 카드는 그대로 둔다(대문자 판정 · C73).
 */
export function displayCardsOf(
  item: Extract<WritingItem, { type: "assemble-phrase" | "assemble-sentence" }>,
): string[] {
  const capitalized = new Map(
    cardTokensOf(item.accepted[0] ?? "")
      .slice(1)
      .filter((token) => token !== token.toLowerCase())
      .map((token) => [token.toLowerCase(), token]),
  );
  return item.cards.map((card) => capitalized.get(card) ?? card);
}

/** 그 문항의 정답(고르기 번호 · 타일 · 카드 · 쓴 글). */
export function expectedAnswerOf(item: WritingItem): Answer {
  const first = item.accepted[0] ?? "";
  switch (item.type) {
    case "pick-word":
      return { kind: "choice", no: item.answerNo };
    case "copy-tiles":
    case "build-tiles":
      return { kind: "tiles", pieces: [...first] };
    case "fill-letters":
      return {
        kind: "tiles",
        pieces: [...item.pattern].flatMap((c, i) =>
          c === BLANK_LETTER ? [first[i] ?? ""] : [],
        ),
      };
    case "dictation":
      return { kind: "text", text: first };
    case "assemble-phrase":
    case "assemble-sentence":
      return { kind: "tiles", pieces: cardTokensOf(first) };
  }
}

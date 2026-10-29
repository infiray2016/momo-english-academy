// 문장부호 붙이기(전체 디자인 리뷰 M-7 · fix 8b N-3): 낱말 상자 · 빈칸 상자 뒤의 문장부호가 다음 줄 첫 글자가 되지 않게, 토막 앞의
// 문장부호를 떼어 앞 상자 안에 붙여 그린다. 순수 함수다.

/** 토막 앞의 문장부호(. , ! ? ; :). */
const LEADING_PUNCTUATION = /^[.,!?;:]+/;

/** 토막 앞 문장부호와 나머지(문장부호가 없으면 punct 빈 글). */
export function splitLeadingPunctuation(text: string): {
  punct: string;
  rest: string;
} {
  const punct = LEADING_PUNCTUATION.exec(text)?.[0] ?? "";
  return { punct, rest: text.slice(punct.length) };
}

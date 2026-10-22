// 회화 정리 토막의 되짚을 말 · 끝인사 · 마무리 '한 번 더 말해 보기' 문장(3.3 정리 문단 · 4절 회화 마무리 · C21 · C33 ·
// 회11 (11) · (13), plan-p13a 파일별 값 10). AI 를 기다리지 않고 앱이 만든다. 순수 모듈이다.

import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import type { TalkCard } from "@/core/seed/schema/talk";
import { tokenize } from "@/core/seed/text";

export type WrapUpLine = { en: string; ko?: string; source: "recast" | "card" };

function lemmasOf(
  text: string,
  lemmaOf: (surface: string) => string | undefined,
): Set<string> {
  const out = new Set<string>();
  for (const token of tokenize(text)) {
    if (token.kind !== "word") continue;
    out.add(token.text.toLowerCase());
    const lemma = lemmaOf(token.text);
    if (lemma) out.add(lemma);
  }
  return out;
}

/**
 * 되짚을 말(C33): 오늘 쓸 말 단어마다 그 원형이 든 가장 늦은 되풀이 문장 하나(같은 문장은 두 번 쓰지 않음), 모자란 자리는
 * 카드 정리 대사를 차례로. 줄 수는 오늘 쓸 말 단어 수(카드 대사가 모자라면 그만큼 적다). 오늘 쓸 말이 없으면 카드 정리 대사 전부.
 * 카드 정리 대사는 단계 규격 koMeaning(1~4단계)이면 한국어 뜻을 함께.
 */
export function wrapUpLinesOf({
  recasts,
  todayWords,
  closingLines,
  koMeaning,
  lemmaOf,
}: {
  /** 토리가 되풀이한 바른 문장(대화 차례). */
  recasts: readonly string[];
  todayWords: readonly string[];
  closingLines: TalkCard["closingLines"];
  koMeaning: boolean;
  lemmaOf: (surface: string) => string | undefined;
}): WrapUpLine[] {
  const cardLine = (line: TalkCard["closingLines"][number]): WrapUpLine => ({
    en: line.en,
    ...(koMeaning && line.ko !== undefined ? { ko: line.ko } : {}),
    source: "card",
  });
  if (todayWords.length === 0) return closingLines.map(cardLine);
  const candidates = recasts
    .map((text, order) => ({ text: text.trim(), order }))
    .filter((r) => r.text !== "")
    .map((r) => ({ ...r, lemmas: lemmasOf(r.text, lemmaOf) }));
  const used = new Set<number>();
  let nextCard = 0;
  const out: WrapUpLine[] = [];
  for (const word of todayWords) {
    const key = word.toLowerCase();
    const hit = [...candidates]
      .reverse()
      .find(
        (r) => !used.has(r.order) && (r.lemmas.has(word) || r.lemmas.has(key)),
      );
    if (hit) {
      used.add(hit.order);
      out.push({ en: hit.text, source: "recast" });
      continue;
    }
    const line = closingLines[nextCard];
    if (!line) continue;
    nextCard += 1;
    out.push(cardLine(line));
  }
  return out;
}

/** 끝인사(3.3): 끝맺음 턴의 끝인사가 와 있고 검사를 지났으면 그것, 아니면 카드 끝인사. 뜻은 koMeaning 단계만. */
export function farewellOf({
  closing,
  card,
  koMeaning,
}: {
  /** 검사를 지난 끝맺음 결과(걸린 끝인사는 빈 글). 없으면 null. */
  closing: { farewell: string; farewellKo: string } | null;
  card: Pick<TalkCard, "farewell">;
  koMeaning: boolean;
}): { en: string; ko?: string; source: "closing" | "card" } {
  if (closing && closing.farewell.trim() !== "")
    return {
      en: closing.farewell,
      ...(koMeaning && closing.farewellKo !== ""
        ? { ko: closing.farewellKo }
        : {}),
      source: "closing",
    };
  return {
    en: card.farewell.en,
    ...(koMeaning && card.farewell.ko !== undefined
      ? { ko: card.farewell.ko }
      : {}),
    source: "card",
  };
}

/**
 * 마무리 둘째 장 '한 번 더 말해 보기' 문장(4절 · 회11 (13)): talk.feedback_from_level 부터는 다음엔 이렇게 첫 줄(없으면 잘한 말 첫 줄),
 * 그 아래 4단계 꼴(카드 질문 목록)은 마지막 되풀이 문장, 1~3단계 꼴(카드 턴)은 정리에서 따라 말했으므로 없음.
 */
export function againLineOf({
  spec,
  level,
  feedbackFromLevel,
  closing,
  recasts,
}: {
  spec: Pick<TalkLevelSpec, "cardShape">;
  level: number;
  feedbackFromLevel: number;
  closing: {
    goodLines: readonly string[];
    nextTimeLines: readonly string[];
  } | null;
  recasts: readonly string[];
}): string | null {
  if (spec.cardShape === "turns") return null;
  if (level >= feedbackFromLevel)
    return closing?.nextTimeLines[0] ?? closing?.goodLines[0] ?? null;
  const last = [...recasts].reverse().find((r) => r.trim() !== "");
  return last ?? null;
}

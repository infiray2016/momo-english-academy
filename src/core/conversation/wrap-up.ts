// 회화 정리 토막의 되짚을 말 · 끝인사 · 마무리 '한 번 더 말해 보기' 문장(3.3 정리 문단 · 4절 회화 마무리 · C21 · C33 ·
// 회11 (11) · (13), plan-p13a 파일별 값 10). AI 를 기다리지 않고 앱이 만든다. 순수 모듈이다.

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

type AgainInput = {
  level: number;
  feedbackFromLevel: number;
  closing: {
    goodLines: readonly string[];
    nextTimeLines: readonly string[];
  } | null;
  recasts: readonly string[];
};

function againFrom({
  level,
  feedbackFromLevel,
  closing,
  recasts,
}: AgainInput): string | null {
  if (level >= feedbackFromLevel)
    return closing?.nextTimeLines[0] ?? closing?.goodLines[0] ?? null;
  const last = [...recasts].reverse().find((r) => r.trim() !== "");
  return last ?? null;
}

// ── 정리 따라 말하기 · 한 번 더 말해 보기(C189, 회화 plan 묶음 '5-나') ─────────────────────

/**
 * 정리 따라 말하기(3.3 정리 토막 · C189): 1~3단계는 아이가 되짚을 말 전체를 한 번 따라 말한다(문장마다가 아님). 4단계부터는 정리
 * 따라 말하기가 없다. 되짚을 말이 없으면 없다. 뜻은 모든 줄에 뜻이 있을 때만 이어 붙인다 — 되풀이 문장에는 뜻이 없어 일부만 이으면
 * 영어와 맞지 않는 뜻이 된다. 줄마다의 뜻은 정리 말풍선(부르는 쪽)이 보인다.
 */
export function lessonWrapUpFollowOf({
  lines,
  lowBand,
}: {
  lines: readonly WrapUpLine[];
  lowBand: boolean;
}): { en: string; ko?: string }[] {
  if (!lowBand || lines.length === 0) return [];
  const allKo = lines.every((l) => l.ko !== undefined && l.ko !== "");
  return [
    {
      en: lines.map((l) => l.en).join(" "),
      ...(allKo ? { ko: lines.map((l) => l.ko).join(" ") } : {}),
    },
  ];
}

/**
 * 마무리 둘째 장 '한 번 더 말해 보기' 문장(4절 · AC-15e, 새 꼴): 1~3단계는 정리에서 한 번 따라 말했으므로 둘째 장이 없다(null).
 * 4단계부터는 talk.feedback_from_level 부터 다음엔 이렇게 첫 줄(없으면 잘한 말 첫 줄), 그 아래는 마지막 되풀이 문장이다.
 */
export function lessonAgainLineOf({
  lowBand,
  ...rest
}: AgainInput & { lowBand: boolean }): string | null {
  return lowBand ? null : againFrom(rest);
}

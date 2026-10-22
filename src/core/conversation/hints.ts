// 회화 힌트 단 · 힌트 종류 · 들은 도움(3.3 '회화에서 쓰는 말' 표 · 힌트 문단 · 단계표 힌트 열 · C10 · C19 · C20 · C31 · C89,
// plan-p13a 파일별 값 8). 단 수와 차례는 단계 규격 hintTiers 에서 읽는다. 순수 모듈이다.
import type { TalkHeardHelp, TalkHintKind } from "@/core/ai/calls/talk";
import type { PendingQuestion } from "@/core/conversation/flow";
import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import type { TalkCard } from "@/core/seed/schema/talk";

/** 힌트 단 하나. 쓸 수 있는 말은 영어 틀 단과 함께 열린다(5단계는 둘째 단, 6단계는 첫 단 — 3.3). */
export type HintTier = {
  kind: "ko" | "frame" | "sentence";
  text: string;
  /** 1~3단계 영어 문장 힌트의 작은 듣기 단추. */
  listen?: boolean;
  usable?: string[];
};

/** 같은 질문에서 '모름'이 이 번째부터 힌트 마지막 단까지 열어 둔다(3.3 '두 번째 '모름'부터'). */
export const OPEN_ALL_HINTS_FROM_DONT_KNOW = 2;

/** AI 가 낸 다음 턴 힌트(검사를 지난 것만). 없거나 걸렸으면 넘기지 않는다 — 카드 힌트로(C19 · 6.2). */
export type AiHints = { hintKo: string; hints: string[]; usable: string[] };

type HintSpec = Pick<
  TalkLevelSpec,
  "hintTiers" | "cardShape" | "usablePhrases"
>;

function turnsShapeTiers(
  spec: HintSpec,
  pending: PendingQuestion,
  ai: AiHints | undefined,
): HintTier[] {
  // AI 자리(1~3단계 '더 이야기할 거리'를 다 쓴 뒤): AI 힌트, 없으면 대신 쓴 '더 이야기할 거리'의 카드 힌트
  const fromAi = pending.source === "ai_more_talk" && pending.en === undefined;
  if (fromAi && !ai)
    return pending.fallback
      ? turnsShapeTiers(spec, pending.fallback, undefined)
      : [];
  const english = spec.hintTiers.filter((t) => t !== "ko");
  const textOf = (kind: HintTier["kind"]): string | undefined => {
    if (fromAi && ai) {
      if (kind === "ko") return ai.hintKo;
      return ai.hints[english.indexOf(kind)];
    }
    if (kind === "ko") return pending.hintKo;
    if (kind === "frame") return pending.frameEn;
    return pending.hintEn;
  };
  return spec.hintTiers.flatMap((kind): HintTier[] => {
    const text = textOf(kind);
    if (text === undefined || text === "") return [];
    return kind === "sentence"
      ? [{ kind, text, listen: true }]
      : [{ kind, text }];
  });
}

function questionsShapeTiers(
  spec: HintSpec,
  card: Pick<TalkCard, "questions">,
  pending: PendingQuestion,
  ai: AiHints | undefined,
): HintTier[] {
  if (spec.hintTiers.length === 0) return [];
  const english = spec.hintTiers.filter((t) => t !== "ko");
  // 한국어 뜻: 규격에 있으면(4~5단계) 늘 첫 단, 없으면(6~9단계) 앱이 다시 묻는 턴으로 정한 턴에만 맨 앞(C20)
  const withKo = spec.hintTiers.includes("ko") || pending.askKind === "re_ask";
  const card4 =
    pending.questionNo !== undefined && pending.questionNo > 0
      ? card.questions?.[pending.questionNo - 1]
      : undefined;
  const source = ai
    ? { ko: ai.hintKo, english: ai.hints, usable: ai.usable }
    : card4
      ? {
          ko: card4.hintKo,
          english: card4.hintTiers,
          usable: card4.usablePhrases ?? [],
        }
      : null;
  // AI 힌트가 없거나 걸렸고 카드 질문 번호가 0 이면 '힌트' 단추 없음(C19)
  if (!source) return [];
  const usable =
    spec.usablePhrases > 0 ? source.usable.slice(0, spec.usablePhrases) : [];
  const tiers: HintTier[] = [];
  if (withKo && source.ko !== "") tiers.push({ kind: "ko", text: source.ko });
  english.forEach((kind, i) => {
    const text = source.english[i];
    if (text === undefined || text === "") return;
    tiers.push(
      kind === "frame" && usable.length > 0
        ? { kind, text, usable }
        : { kind, text },
    );
  });
  return tiers;
}

/**
 * 지금 질문의 힌트 단(차례대로). 1~2단계 뜻 → 영어 문장(듣기), 3단계 뜻 → 영어 틀 → 영어 문장(듣기), 4~5단계 뜻 → 영어 틀 → 영어 문장
 * (5단계는 영어 틀 단에 쓸 수 있는 말), 6~7단계 영어 틀(6단계는 쓸 수 있는 말 함께) → 영어 문장 · 다시 묻는 턴이면 맨 앞에 뜻,
 * 8~9단계 영어 틀 · 다시 묻는 턴이면 앞에 뜻, 10~12단계 없음. 4단계부터 AI 힌트가 없거나 걸리면 카드 질문 번호의 카드 힌트.
 */
export function hintTiersOf({
  spec,
  card,
  pending,
  ai,
}: {
  spec: HintSpec;
  card: Pick<TalkCard, "questions">;
  pending: PendingQuestion | null;
  ai?: AiHints;
}): HintTier[] {
  if (!pending) return [];
  return spec.cardShape === "turns"
    ? turnsShapeTiers(spec, pending, ai)
    : questionsShapeTiers(spec, card, pending, ai);
}

/** 열린 단 수: '힌트'를 누른 수만큼, 같은 질문 둘째 '모름'부터는 마지막 단까지(3.3). */
export function openedTierCount({
  tiers,
  pressed,
  dontKnowCount,
}: {
  tiers: readonly HintTier[];
  pressed: number;
  dontKnowCount: number;
}): number {
  if (dontKnowCount >= OPEN_ALL_HINTS_FROM_DONT_KNOW) return tiers.length;
  return Math.min(Math.max(0, pressed), tiers.length);
}

/**
 * 힌트 종류(3.3): 영어 단(영어 틀 · 영어 문장 · 쓸 수 있는 말)을 하나라도 열었거나 답 두 개 · 답 예시를 들었으면 '영어',
 * 뜻만 열었으면 '뜻만', 아니면 '없음'.
 */
export function hintKindOf({
  opened,
  heard,
}: {
  opened: readonly HintTier[];
  heard: readonly Exclude<TalkHeardHelp, "none">[];
}): TalkHintKind {
  if (heard.length > 0 || opened.some((t) => t.kind !== "ko")) return "english";
  return opened.length > 0 ? "meaning_only" : "none";
}

/** 들은 도움 열거 하나(C89): 답 예시를 들었으면 '답 예시', 답 두 개만이면 '답 두 개', 아니면 없음. */
export function heardHelpOf(
  heard: readonly Exclude<TalkHeardHelp, "none">[],
): TalkHeardHelp {
  if (heard.includes("answer_example")) return "answer_example";
  if (heard.includes("two_answers")) return "two_answers";
  return "none";
}

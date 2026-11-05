// 회화 힌트 단 · 힌트 종류 · 들은 도움(3.3 '회화에서 쓰는 말' 표 · 힌트 문단 · 단계표 힌트 열 · C10 · C19 · C20 · C31 · C89,
// plan-p13a 파일별 값 8). 단 수와 차례는 단계 규격 hintTiers 에서 읽는다. 순수 모듈이다.
// 같은 층 모듈은 정의 자리에서 가져온다(talk-lesson.ts 는 lesson-flow.ts 를 가져오므로 그 다시 내보내기를 거치면 순환 여지가 생김, '5-다' 검토 M-4)
import {
  isLowBand,
  type TalkHeardHelp,
  type TalkHintKind,
  type TalkLessonSpec,
} from "@/core/conversation/lesson-turns";
import {
  TALK_SUPPORT_STAGE_MAX,
  TALK_SUPPORT_STAGE_TOGETHER,
  type TalkChildCause,
  type TalkMove,
} from "@/core/conversation/move";
import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import type { TalkRequired } from "@/core/seed/schema/talk";
import { type AskKind, TALK_LOW_BAND } from "@/core/seed/structure";

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

// ── 새 꼴 카드(C189, 회화 plan 묶음 '5-나') ─────────────────────

/** 새 꼴 카드 항목(필수 질문 · 더 이야기할 거리)의 힌트 칸(6.3). */
export type LessonHintItem = Pick<
  TalkRequired,
  "hintKo" | "hints" | "usablePhrases"
>;

/** 힌트에 쓰는 단계 규격 칸(level_specs 회화 행 — 묶음 3 의 형이 바뀌면 tsc 가 잡는다). */
export type LessonHintSpec = Pick<
  TalkLevelSpec,
  "band" | "hintTiers" | "usablePhrases"
>;

/**
 * 새 꼴 지금 질문의 힌트 단(3.3 힌트 문단 · C189). 카드 항목(필수 질문 · 더 이야기할 거리)을 노린 턴은 그 카드 항목의 힌트를 쓰고(AI 힌트가
 * 와도), 이어 묻기 · 따라가기 · 꺼내기 턴(카드 항목 없음)은 회화 턴 출력의 힌트(검사를 지난 것만)를 쓴다. 둘 다 없으면 '힌트' 단추가 없다
 * (C19 의 번호 0 규칙을 모든 단계로). 단 수와 차례는 단계 규격 hintTiers 그대로다: 한국어 뜻은 규격에 있거나(1~5단계) 다시 묻는 턴이면
 * (6~9단계, C20) 맨 앞, 영어 단은 hintTiers 의 ko 밖 차례(카드 hints 칸과 같은 차례), 쓸 수 있는 말은 영어 틀 단에 함께(usablePhrases 개까지),
 * 1~3단계 영어 문장 단에는 작은 듣기 단추. 10~12단계(hintTiers 없음)는 없다.
 */
export function lessonHintTiersOf({
  spec,
  item,
  ai,
  askKind,
}: {
  spec: LessonHintSpec;
  /** 이 턴이 노린 카드 항목(없으면 null). */
  item: LessonHintItem | null;
  ai: AiHints | undefined;
  askKind: AskKind;
}): HintTier[] {
  if (spec.hintTiers.length === 0) return [];
  const source = item
    ? { ko: item.hintKo, english: item.hints, usable: item.usablePhrases ?? [] }
    : ai
      ? { ko: ai.hintKo, english: ai.hints, usable: ai.usable }
      : null;
  if (!source) return [];
  const withKo = spec.hintTiers.includes("ko") || askKind === "re_ask";
  const listen = spec.band === TALK_LOW_BAND;
  const usable =
    spec.usablePhrases > 0 ? source.usable.slice(0, spec.usablePhrases) : [];
  const tiers: HintTier[] = [];
  if (withKo && source.ko !== "") tiers.push({ kind: "ko", text: source.ko });
  spec.hintTiers
    .filter((t) => t !== "ko")
    .forEach((kind, i) => {
      const text = source.english[i];
      if (text === undefined || text === "") return;
      if (kind === "frame" && usable.length > 0)
        tiers.push({ kind, text, usable });
      else if (kind === "sentence" && listen)
        tiers.push({ kind, text, listen: true });
      else tiers.push({ kind, text });
    });
  return tiers;
}

/**
 * 한국어 설명(뜻 힌트 한두 문장)을 보일지(02-2 263줄 · C195): 아이 쪽 막힘(단추 · 막힘 말) 차례에서만, 같은 질문 자리의 막힘 수가 회화
 * 단계 규격 칸 koExplainFromStuck(1~4단계 1 첫 막힘부터 · 5단계부터 2 둘째 막힘부터) 이상일 때. 들리지 않음 · 말로 답한 차례는 보이지
 * 않는다. 설명은 선생님 말풍선 아래 글이고 읽어 주지 않는다(부르는 쪽). stuckInSlot 은 위치 되짚기(talkLessonPositionOf)의 그 자리 막힘
 * 수다(칸은 단계 규격 필수 칸 — 묶음 12).
 */
export function koExplanationShownOf({
  spec,
  stuckInSlot,
  cause,
}: {
  spec: Pick<TalkLevelSpec, "koExplainFromStuck">;
  stuckInSlot: number;
  cause: TalkChildCause | null;
}): boolean {
  const from = spec.koExplainFromStuck;
  if (cause !== "button" && cause !== "stuck") return false;
  return stuckInSlot >= from;
}

/**
 * 앞 선생님 행 move 로 본 들은 도움(5절 '서버가 붙인 소리 줄은 앞 선생님 행 move 로 안다', 회화 plan 정한 것 8): 선택지 → 선택지 도움
 * (two_answers), 같이 말하기의 답 · 답 예시 · 따라 할 말 · 꺼내기 → 답 예시(answer_example). 서버가 붙인 것(app · sound)과 AI 가 준 것
 * (ai · intro)을 함께 본다. 4단계부터 AI 가 선생님 말 안에 답을 주는 차례(같이 말하기 stage 1 · 닫기 stage 3 · 들리지 않음 닫기)는 계획이
 * 정한 사실(move.stage · cause)로 보아 AI 의 support 값이 비어도 답 예시를 들은 것이다(02-2 263줄). 이 사실은 4단계부터의 AI 차례
 * (move.kind ai)에만 쓰고, 1~3단계는 카드 자리 · AI 차례 모두 서버가 붙인 소리 줄만 본다(1~3단계 답은 소리 줄로만 준다). 들은 턴은 힌트를 열지 않아도 힌트 종류가
 * '영어'다(hintKindOf). 같은 질문 자리 안에서 열린 힌트 단 수는
 * openedTierCount 에 dontKnowCount 로 위치의 stuckInSlot 을 넘긴다(둘째 막힘부터 마지막 단, 들리지 않음은 셈 밖).
 */
export function heardHelpsOfMove(
  move: TalkMove | null,
  spec: Pick<TalkLessonSpec, "band">,
): Exclude<TalkHeardHelp, "none">[] {
  if (!move) return [];
  const app = new Set<string>(move.app);
  const choices =
    app.has("choices") ||
    move.ai === "choices" ||
    move.sound?.choices !== undefined;
  // 계획이 정한 사실(답을 말로 준 받침 차례)은 4단계부터의 AI 차례에만 쓴다. 1~3단계는 서버가 붙인 app · sound 가 사실 기록이다('5-나' 재검토 N-1 ·
  // '5-다' 검토 M-2 — 1~3단계 AI 차례의 답은 소리 줄뿐이라 소리 줄이 비면 아이는 답을 듣지 못했다)
  const aiGaveAnswer =
    !isLowBand(spec) &&
    move.kind === "ai" &&
    (move.stage === TALK_SUPPORT_STAGE_TOGETHER ||
      move.stage === TALK_SUPPORT_STAGE_MAX ||
      move.cause === "nospeech");
  const answer =
    app.has("together") ||
    app.has("answer_example") ||
    app.has("model_line") ||
    move.ai === "together" ||
    move.ai === "model_line" ||
    move.sound?.model !== undefined ||
    move.sound?.answer !== undefined ||
    move.intro.length > 0 ||
    aiGaveAnswer;
  return [
    ...(choices ? (["two_answers"] as const) : []),
    ...(answer ? (["answer_example"] as const) : []),
  ];
}

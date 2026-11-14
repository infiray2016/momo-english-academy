// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 7 · FR-7, plan 묶음 P5)의 힌트 단 · 막힌 뒤 설명 ·
// 화면에 줄 응답 · 저장 꼴 · 아이 행 힌트 종류. 힌트 호출(talk-chat-hint.ts)이 6.4 검사를 지난 세 칸을 내면 단계 규격 hintTiers 의 차례(C31)대로
// 단을 만든다: 1~2단계 뜻 → 영어 문장, 3단계 뜻 → 영어 틀(hint_en 에 단원 단어가 있을 때만) → 영어 문장. 빈 칸(검사에 걸려 비운 칸 포함)으로 만들
// 단은 만들지 않으므로 단 수는 응답과 재료가 정한다. 뜻 단 · explain_ko 는 1~3단계 영어 문장 거르개를 지난다. 아는 낱말 범위는 기록 전용이다
// (C243 보완 '힌트 범위 막기 없음'). 힌트 종류 값(TALK_HINT_KINDS)의 뜻은 그대로다. 순수 모듈이다(DB · 서버 없음).
import type { TalkChatHintOutput } from "@/core/ai/calls/talk-chat-hint";
import {
  type HintTier,
  hintKindOf,
  type LessonHintSpec,
  lessonHintTiersOf,
  openedTierCount,
} from "@/core/conversation/hints";
import { leadHintFrameOf } from "@/core/conversation/lead-hints";
import {
  type LeadLevelInput,
  leadUnknownWordsIn,
} from "@/core/conversation/lead-level";
import type {
  TalkHeardHelp,
  TalkHintKind,
} from "@/core/conversation/lesson-turns";
import { withoutEnglishSentencesOf } from "@/core/conversation/spoken";
import { TALK_LOW_BAND } from "@/core/seed/structure";
import { splitSentences } from "@/core/seed/text";

// ── 단 만들기(spec 설계 7 '단 만들기') ─────────────────────────────────

/** 1~3단계 구간이면 영어 문장 거르개를 지난 글(spec 설계 7 · M-3), 아니면 그대로. 앞뒤 빈칸은 뺀다. */
function lowBandKoOf(text: string, spec: Pick<LessonHintSpec, "band">): string {
  return (
    spec.band === TALK_LOW_BAND ? withoutEnglishSentencesOf(text) : text
  ).trim();
}

/**
 * 이 차례의 힌트 단(검사를 지난 응답에서). 지금 단 함수(lessonHintTiersOf — 카드 항목 없이 AI 힌트로)를 그대로 쓴다: 영어 단은 hintTiers 의 ko 밖
 * 차례대로 틀(leadHintFrameOf — hint_en 의 처음 나온 단원 단어 자리를 비움, 없으면 빈 글) · 문장(hint_en)이고, 빈 글의 단은 거기서 빠진다.
 * 1~3단계 영어 문장 단에는 듣기 단추가 붙는다. 이야기 방식에는 질문 자리가 없어 다시 묻는 턴(re_ask)이 없다.
 */
export function chatHintTiersOf({
  output,
  spec,
  unitWords,
  lemmaOf,
}: {
  output: TalkChatHintOutput;
  spec: LessonHintSpec;
  /** 틀 단 재료를 찾는 단원 단어(호출 입력에는 싣지 않는다). */
  unitWords: readonly string[];
  lemmaOf: (surface: string) => string | undefined;
}): HintTier[] {
  const ko = lowBandKoOf(output.hint_ko, spec);
  const en = output.hint_en.trim();
  const frame =
    en === ""
      ? ""
      : (leadHintFrameOf({ hintEn: en, unitWords, lemmaOf }) ?? "");
  const hints = spec.hintTiers
    .filter((tier) => tier !== "ko")
    .map((tier) => (tier === "frame" ? frame : en));
  return lessonHintTiersOf({
    spec,
    item: null,
    ai: { hintKo: ko, hints, usable: [] },
    askKind: "first",
  });
}

/** 막힌 뒤 한국어 설명(spec 설계 7 '막힌 뒤 한국어 설명'): 1~3단계는 영어 문장 거르개를 지난 explain_ko, 다 빠지면 빈 글(설명 없음). */
export function chatExplainOf({
  explainKo,
  spec,
}: {
  explainKo: string;
  spec: Pick<LessonHintSpec, "band">;
}): string {
  return lowBandKoOf(explainKo, spec);
}

/** 한 선생님 행의 힌트 재료: 만든 단 · 거른 설명. */
export type ChatHintRecord = { tiers: HintTier[]; explainKo: string };

/** 검사를 지난 힌트 호출 응답 → 힌트 재료(단 목록 · 설명). */
export function chatHintRecordOf({
  output,
  spec,
  unitWords,
  lemmaOf,
}: {
  output: TalkChatHintOutput;
  spec: LessonHintSpec;
  unitWords: readonly string[];
  lemmaOf: (surface: string) => string | undefined;
}): ChatHintRecord {
  return {
    tiers: chatHintTiersOf({ output, spec, unitWords, lemmaOf }),
    explainKo: chatExplainOf({ explainKo: output.explain_ko, spec }),
  };
}

/**
 * 아는 낱말 범위(묶음 R4 의 leadUnknownWordsIn — 지금 새 방식이 힌트를 막던 범위) 밖 낱말(소문자 · 차례대로). 기록 전용이다: 단을 막지 않고
 * 부르는 쪽이 수치로만 남긴다(C243 보완 '힌트 범위 막기 없음', 우려 9).
 */
export function chatHintRangeNoteOf({
  hintEn,
  range,
}: {
  hintEn: string;
  range: LeadLevelInput;
}): string[] {
  const words: string[] = [];
  for (const sentence of splitSentences(hintEn))
    for (const word of leadUnknownWordsIn(sentence, range))
      if (!words.includes(word)) words.push(word);
  return words;
}

// ── 저장 꼴(선생님 행 ai_question, spec 설계 7 '저장과 힌트 종류') ─────────────

type EnglishTierKind = Exclude<HintTier["kind"], "ko">;

/**
 * 이야기 방식 선생님 행의 ai_question: 질문 글 칸(en · ko · answerExample)은 비고, 뜻(hintKo) · 실제로 만든 영어 단의 글(hints)과 그 종류
 * (hintKinds, hints 와 같은 차례 · 같은 길이) · 거른 설명(explainKo)이다. 단이 없던 칸은 빈 글 · 빈 목록이다.
 */
export type ChatAiQuestion = {
  en: "";
  ko: "";
  answerExample: "";
  hintKo: string;
  hints: string[];
  hintKinds: EnglishTierKind[];
  explainKo: string;
};

/** 힌트 재료 → 저장할 ai_question 값. */
export function chatAiQuestionOf(record: ChatHintRecord): ChatAiQuestion {
  const english = record.tiers.filter(
    (tier): tier is HintTier & { kind: EnglishTierKind } => tier.kind !== "ko",
  );
  return {
    en: "",
    ko: "",
    answerExample: "",
    hintKo: record.tiers.find((tier) => tier.kind === "ko")?.text ?? "",
    hints: english.map((tier) => tier.text),
    hintKinds: english.map((tier) => tier.kind),
    explainKo: record.explainKo,
  };
}

const ENGLISH_TIER_KINDS: ReadonlySet<string> = new Set<EnglishTierKind>([
  "frame",
  "sentence",
]);

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === "string");

/**
 * 저장된 ai_question → 힌트 재료. 이야기 방식 꼴(hintKinds · explainKo 칸이 있고 hints 와 길이가 같음)이 아니면 null(아직 힌트를 받지 않은 행 ·
 * 다른 방식의 행). 1~3단계 영어 문장 단의 듣기 단추는 단계 구간으로 다시 붙인다(저장하지 않는다).
 */
export function chatHintRecordOfRow(
  raw: unknown,
  spec: Pick<LessonHintSpec, "band">,
): ChatHintRecord | null {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw))
    return null;
  const row = raw as Record<string, unknown>;
  const { hintKo, hints, hintKinds, explainKo } = row;
  if (
    typeof hintKo !== "string" ||
    typeof explainKo !== "string" ||
    !isStringArray(hints) ||
    !isStringArray(hintKinds) ||
    hints.length !== hintKinds.length ||
    !hintKinds.every((kind) => ENGLISH_TIER_KINDS.has(kind))
  )
    return null;
  const listen = spec.band === TALK_LOW_BAND;
  const tiers: HintTier[] = [];
  if (hintKo !== "") tiers.push({ kind: "ko", text: hintKo });
  hints.forEach((text, i) => {
    const kind = hintKinds[i] as EnglishTierKind;
    tiers.push(
      kind === "sentence" && listen
        ? { kind, text, listen: true }
        : { kind, text },
    );
  });
  return { tiers, explainKo };
}

// ── 화면에 줄 응답(spec 설계 7 '누를 때' · '실패와 다시 받기') ─────────────────

/** 단 목록의 한 칸(글 없이 종류 · 듣기 단추만 — 글은 그 단을 누를 때 온다). */
export type ChatHintTierView = { kind: HintTier["kind"]; listen?: true };

/**
 * 힌트 받는 서버 액션이 화면에 주는 응답. 성공: 이 차례의 단 목록 · 청한 단 번호 · 그 단의 글. 실패: 그 단 자리에 한 줄 문구를 두고, retry 가
 * 참이면 다시 받기 단추도 둔다(문구는 화면의 문구 표).
 */
export type ChatHintReply =
  | { ok: true; tiers: ChatHintTierView[]; tier: number; text: string }
  | { ok: false; retry: boolean };

function countOf(value: number, what: string): number {
  if (!Number.isInteger(value) || value < 0)
    throw new RangeError(`${what}는 0 이상 정수여야 한다: ${value}`);
  return value;
}

/**
 * 화면 응답을 만든다. record 가 null 이면 힌트 호출이 실패했다(실패 · 시간 넘음 · 검증 실패). 저장된 단이 있으면 'AI 쉬는 중'과 무관하게 그
 * 단을 낸다(spec 설계 7 '있으면 저장된 것을 쓴다'). 받지 못했거나 만든 단이 없으면 실패이고, 'AI 쉬는 중'이 아니며 이미 쓴 다시 받기 수가
 * talk.chat_hint_retry_max 보다 적을 때만 다시 받기가 있다. 단 목록 밖의 단을 청하면 다시 받기 없는 실패다. 횟수 · 단 번호가 0 이상 정수가
 * 아니면 던진다.
 */
export function chatHintReplyOf({
  record,
  tier,
  retriesUsed,
  retryMax,
  aiResting,
}: {
  record: ChatHintRecord | null;
  /** 청한 단 번호(0 부터 — 첫 누름은 0). */
  tier: number;
  /** 그 선생님 행에서 이미 쓴 다시 받기 수. */
  retriesUsed: number;
  /** talk.chat_hint_retry_max. */
  retryMax: number;
  aiResting: boolean;
}): ChatHintReply {
  countOf(tier, "단 번호");
  const used = countOf(retriesUsed, "다시 받기 수");
  const max = countOf(retryMax, "다시 받기 상한");
  if (record === null || record.tiers.length === 0)
    return { ok: false, retry: !aiResting && used < max };
  const asked = record.tiers[tier];
  if (asked === undefined) return { ok: false, retry: false };
  return {
    ok: true,
    tiers: record.tiers.map((t) =>
      t.listen === true ? { kind: t.kind, listen: true } : { kind: t.kind },
    ),
    tier,
    text: asked.text,
  };
}

/**
 * 막힌 뒤 설명 요청의 응답: 설명이 있으면 그 글, 받지 못했거나 거른 뒤 비었으면 ok 거짓(화면은 설명 없이 차례를 잇고 문구를 두지 않는다).
 */
export function chatExplainReplyOf(
  record: ChatHintRecord | null,
): { ok: true; text: string } | { ok: false } {
  if (record === null || record.explainKo === "") return { ok: false };
  return { ok: true, text: record.explainKo };
}

// ── 아이 행 힌트 종류(spec 설계 7 '저장과 힌트 종류') ─────────────────────────

/**
 * 아이 행의 힌트 칸: 그 선생님 행에 실제로 있는 단과 화면이 보낸 연 단 수로 정한다(지금 lessonChildRowOf 의 규칙을 '실제로 받은 단의 종류'로 읽음).
 * 연 단 수는 실제로 만든 단 수를 넘지 않고(실패 문구로 끝난 단은 셈 밖), 힌트가 없으면(누르지 않음 · 받지 못함) 열린 단이 없다. 이어진 막힘이
 * 둘째부터면 마지막 단까지 연 것으로 센다(지금 openedTierCount, 이야기 방식에서는 '이어진 둘째 막힘부터'로 읽음). 힌트 종류는 지금 hintKindOf
 * 그대로다(들은 도움이 있으면 '영어'). openedKinds 는 연 단의 실제 종류다(틀 없는 차례의 둘째 단은 sentence).
 */
export function chatChildHintOf({
  record,
  opened,
  stuckRun,
  heard,
}: {
  record: ChatHintRecord | null;
  /** 화면이 보낸 연 단 수(다음 턴 요청의 hint.opened). */
  opened: number;
  /** 지금 이어진 앱이 아는 막힘 수. */
  stuckRun: number;
  heard: readonly Exclude<TalkHeardHelp, "none">[];
}): {
  hintKind: TalkHintKind;
  hintLevel: number;
  openedKinds: HintTier["kind"][];
} {
  const tiers = record?.tiers ?? [];
  const count =
    tiers.length === 0
      ? 0
      : openedTierCount({ tiers, pressed: opened, dontKnowCount: stuckRun });
  const openedTiers = tiers.slice(0, count);
  return {
    hintKind: hintKindOf({ opened: openedTiers, heard }),
    hintLevel: count,
    openedKinds: openedTiers.map((tier) => tier.kind),
  };
}

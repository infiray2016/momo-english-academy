// 회화 수업 흐름(3.3 토막 표 · 토막 전환 · 오늘 쓸 말 · 말해 보기 · 막힘 · 1~3단계 토리 말 · 처음/다시 묻는 턴 · 목표 턴과
// '대화가 멈추는 경우' · C2 · C3 · C5 · C19 · C30 · C33 · C36 · C44 · C95(정할 것 회11) · C97, plan-p13a 파일별 값 7 · 회화 수업 모델 1~3).
// 서버(b 턴 길 · 이어 하기)와 화면이 같은 값을 쓰도록 talk_turns 의 가벼운 꼴을 차례로 되짚어 지금 자리를 낸다.
// 순수 모듈이다(시각 · DB · 무작위 없음). 설계 숫자는 설정 · 단계 규격 · 카드에서 받는다.
import { z } from "zod";
import type {
  TalkInputMode,
  TalkSpecView,
  TalkTurnSegment,
} from "@/core/ai/calls/talk";
import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import type { TalkCard, TurnCard } from "@/core/seed/schema/talk";
import type { AskKind, TALK_SEGMENTS } from "@/core/seed/structure";
import { type PreviewWord, previewWordsOf } from "@/core/session/preview";

export type TalkSegment = (typeof TALK_SEGMENTS)[number];

/** 목표 턴에 닿은 턴 · '더 이야기하기' 한 번이 끝난 턴에 붙이는 말(3.3 — 'Do you want to talk more?'(더 이야기할래?)). */
export const MORE_PROMPT = {
  en: "Do you want to talk more?",
  ko: "더 이야기할래?",
} as const;

// ── 설정(12절 talk.*) ────────────────────────────────────────────

export type TalkFlowSettings = {
  /** talk.dontknow_max — 같은 질문에 이만큼 '모름'이면 다음 질문. */
  dontknowMax: number;
  /** talk.more_talk_round_turns — '더 이야기하기' 한 번의 턴 수(C30). */
  moreRoundTurns: number;
  /** talk.nospeech_dontknow_count — no-speech 듣기가 이만큼 이어지면 '모름'(C44). */
  nospeechDontknowCount: number;
};

const FLOW_KEYS = {
  dontknowMax: "talk.dontknow_max",
  moreRoundTurns: "talk.more_talk_round_turns",
  nospeechDontknowCount: "talk.nospeech_dontknow_count",
} as const;

/** 흐름 설정을 읽는다. 없거나 1 이상 정수가 아니면 던진다(조용한 기본값 없음). */
export function talkFlowSettingsFrom(
  read: (key: string) => unknown,
): TalkFlowSettings {
  const out = {} as TalkFlowSettings;
  for (const [name, key] of Object.entries(FLOW_KEYS) as [
    keyof TalkFlowSettings,
    string,
  ][]) {
    const parsed = z.int().min(1).safeParse(read(key));
    if (!parsed.success)
      throw new Error(`회화 설정 '${key}' 가 없거나 1 이상 정수가 아니다`);
    out[name] = parsed.data;
  }
  return out;
}

/** no-speech 로 끝난 듣기가 이어진 수로 '모름'을 보낼지(평가 턴은 아님 — 3.2 · 3.3). */
export function sendsAsDontKnow(
  { nospeechInRow, levelTest }: { nospeechInRow: number; levelTest: boolean },
  settings: Pick<TalkFlowSettings, "nospeechDontknowCount">,
): boolean {
  return !levelTest && nospeechInRow >= settings.nospeechDontknowCount;
}

// ── 토막 차례 ────────────────────────────────────────────────────

export type TalkFlowSpec = TalkSpecView &
  Pick<TalkLevelSpec, "segments" | "twoAnswers">;

/**
 * 토막 차례(3.3 토막 표 · C3): 단계 규격 segments 그대로. 오늘 쓸 말 단어가 없으면 오늘 쓸 말과 말해 보기를(C33),
 * 말해 보기 예문이 없으면 말해 보기를(C97) 건너뛴다. '더 이야기하기'는 고를 때만 들어가므로 차례에 넣지 않는다.
 */
export function talkFlowOf({
  spec,
  todayWordCount,
  practiceCount,
}: {
  spec: Pick<TalkLevelSpec, "segments">;
  todayWordCount: number;
  practiceCount: number;
}): TalkSegment[] {
  return spec.segments.filter((segment) => {
    if (segment === "today_words") return todayWordCount > 0;
    if (segment === "practice") return todayWordCount > 0 && practiceCount > 0;
    return segment !== "more_talk";
  });
}

/** 다음 토막(차례대로만). '더 이야기하기' 다음은 정리다. 정리 다음은 없다. */
export function nextSegmentOf(
  flow: readonly TalkSegment[],
  current: TalkSegment,
): TalkSegment | null {
  if (current === "more_talk")
    return flow.includes("wrap_up") ? "wrap_up" : null;
  const index = flow.indexOf(current);
  if (index < 0) return null;
  return flow[index + 1] ?? null;
}

// ── 오늘 쓸 말 · 말해 보기 ─────────────────────────────────────────

/**
 * 오늘 쓸 말 단어(3.3 첫 활동 문단 · AC-2f): P10 previewWordsOf 그대로 — 배정 수업은 카드 오늘 쓸 말 + 안 만난 단원 단어,
 * 다지기 · 보강은 아직 '안다'가 아닌 단원 단어 k 개. metBefore 는 처음 스냅숏의 만난 단어, known 은 '말함' known.
 */
export function todayWordsOf(input: {
  card: Pick<TalkCard, "todayWords">;
  lesson: { newWords: readonly string[]; unitWords: readonly string[] };
  metBefore: readonly string[];
  known: readonly string[];
  k: number;
  vocab: (word: string) => { meaningKo: string; example: string } | undefined;
}): PreviewWord[] {
  return previewWordsOf({
    lesson: {
      newWords: input.lesson.newWords,
      unitWords: input.lesson.unitWords,
      preview: input.card.todayWords.map(({ word, meaningKo, example }) => ({
        word,
        meaningKo,
        example,
      })),
    },
    metWords: input.metBefore,
    knownWords: input.known,
    k: input.k,
    vocab: input.vocab,
  });
}

export type PracticeItem = { word: string; example: string; exampleKo: string };

/** 말해 보기 예문(C97): 1~3단계(규격에 practice 토막)에서 카드 오늘 쓸 말 가운데 예문 뜻이 있는 것만. */
export function practiceItemsOf({
  spec,
  card,
}: {
  spec: Pick<TalkLevelSpec, "segments">;
  card: Pick<TalkCard, "todayWords">;
}): PracticeItem[] {
  if (!spec.segments.includes("practice")) return [];
  return card.todayWords.flatMap(({ word, example, exampleKo }) =>
    exampleKo === undefined ? [] : [{ word, example, exampleKo }],
  );
}

/** FNV-1a 32비트(기술 값 — 세션 id 로 정하는 섞기의 씨앗). */
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
/** mulberry32 의 상수(기술 값). */
const MULBERRY_INCREMENT = 0x6d2b79f5;
const MULBERRY_SHIFT_A = 15;
const MULBERRY_SHIFT_B = 7;
const MULBERRY_SHIFT_C = 14;
const MULBERRY_OR = 61;
const UINT32 = 4294967296;

function hashOf(text: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

function randomFrom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + MULBERRY_INCREMENT) | 0;
    let t = Math.imul(a ^ (a >>> MULBERRY_SHIFT_A), 1 | a);
    t = (t + Math.imul(t ^ (t >>> MULBERRY_SHIFT_B), MULBERRY_OR | t)) ^ t;
    return ((t ^ (t >>> MULBERRY_SHIFT_C)) >>> 0) / UINT32;
  };
}

/**
 * 말해 보기 바퀴마다의 차례(3.3 · 회11 (3)): 첫 바퀴는 카드 차례, 둘째 바퀴부터 세션 id 로 정한 섞기이고 첫 바퀴와 다르다
 * (예문이 둘 이상일 때). 시계 · 무작위가 없어 같은 세션은 늘 같은 차례다.
 */
export function practiceOrderOf(
  sessionId: string,
  n: number,
  rounds: number,
): number[][] {
  const identity = Array.from({ length: Math.max(0, n) }, (_, i) => i);
  return Array.from({ length: Math.max(0, rounds) }, (_, round) => {
    if (round === 0 || identity.length < 2) return [...identity];
    const next = randomFrom(hashOf(`${sessionId}:${round}`));
    const order = [...identity];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [order[i], order[j]] = [order[j] as number, order[i] as number];
    }
    // 첫 바퀴와 같으면 한 칸 돌린다
    if (order.every((v, i) => v === i)) order.push(order.shift() as number);
    return order;
  });
}

// ── 처음 · 다시 묻는 턴(C2 · 회11 (5)) ────────────────────────────

/** 노리는 단어 가운데 하나라도 앞 회화 세션에서 만나지 않았고 이 대화에서도 아직 묻지 않았으면 처음 묻는 턴. */
export function askKindOf({
  targets,
  metBefore,
  askedTargets,
}: {
  targets: readonly string[];
  metBefore: readonly string[];
  askedTargets: Iterable<string>;
}): AskKind {
  const met = new Set(metBefore);
  const asked = new Set(askedTargets);
  return targets.some((w) => !met.has(w) && !asked.has(w)) ? "first" : "re_ask";
}

// ── 지금 자리 ────────────────────────────────────────────────────

export type QuestionSource =
  | "card_greeting"
  | "card_turn"
  | "card_skipped"
  | "more_talk"
  | "ai_more_talk"
  | "card_question"
  | "ai_question";

/** 아이가 답할 지금 질문. en · ko 가 없으면 AI 가 쓴 질문(토리 말 · 응답 칸)이다. */
export type PendingQuestion = {
  source: QuestionSource;
  /** card_greeting · card_turn · card_skipped · more_talk: 카드 배열 차례(0부터). ai_more_talk 를 대신한 것이면 그 '더 이야기할 거리' 차례. */
  index?: number;
  /** 4단계부터 카드 질문 번호(1부터, 이어 묻는 질문은 0). */
  questionNo?: number;
  en?: string;
  ko?: string;
  targets: string[];
  askKind: AskKind;
  /** 1단계 처음 묻는 턴 · 인사 턴의 답 두 개(들려줌). */
  twoAnswers?: [string, string];
  answerExample: string;
  imageKey?: string;
  /** 1~3단계 카드 힌트(뜻 · 영어 틀 · 영어 문장). */
  hintKo?: string;
  frameEn?: string;
  hintEn?: string;
  /** 넘어간 질문을 다시 물을 때는 답 예시와 함께(C36). */
  withAnswerExample?: boolean;
  /** ai_more_talk: AI 질문이 없거나 걸리면 쓸 '더 이야기할 거리'(이 대화에서 가장 오래전에 쓴 것, AC-15i). */
  fallback?: PendingQuestion;
};

/** talk_turns 의 가벼운 꼴(차례대로 — 토리 행 n 은 아이 말 n 앞의 토리 말, C89). */
export type TalkTurnLite =
  | {
      speaker: "child";
      segment: TalkTurnSegment;
      input: TalkInputMode;
      /** 막힘으로 볼 말(AI stuck 참 — '모름'과 같이, C36). */
      stuck: boolean;
      /** 이 턴이 노린 단원 단어(talk_turns.target_words). */
      targets: string[];
    }
  | {
      speaker: "tori";
      /** 4단계부터 이 토리 행이 묻는 카드 질문 번호(C19, 이어 묻는 질문 0, 없으면 null). */
      cardQuestionNo: number | null;
      /** 1~3단계: AI 질문 대신 붙인 '더 이야기할 거리' 차례(없으면 null). */
      moreTalkFallback: number | null;
      /**
       * 1~3단계: 이 토리 행이 붙인 AI 질문(검사를 지난 것 — 영어 · 뜻 · 답 예시, 있으면 힌트). '모름'이면 같은 질문을 다시 붙이는 재료다
       * (fix 1 M3). 없으면 null. 채우는 것은 b(토리 행 저장 때 붙인 말에서).
       */
      aiQuestion: AiQuestionLite | null;
      /**
       * 고르기를 이어 간 표지(fix 1 I2): 목표 턴 · '더 이야기하기' 한 바퀴를 끝낸 아이 턴 바로 뒤의 이 토리 행에 아이가 '더 이야기하기'를
       * 골라 앱이 다음 질문을 붙였다. 고르기 차례는 흐름이 스스로 판정하고 이 표지가 참이 될 때까지 기다린다.
       */
      moreChosen: boolean;
    };

/** 토리 행이 붙인 1~3단계 AI 질문(답 두 개는 없다 — AI 턴은 늘 다시 묻는 턴, C36). */
export type AiQuestionLite = {
  en: string;
  ko: string;
  answerExample: string;
  /** 다음 턴 한국어 뜻 힌트 · 영어 힌트(단계 영어 단 차례 — 3단계는 영어 틀 · 영어 문장). */
  hintKo?: string;
  hints?: string[];
};

export type TalkPosition = {
  /** 지금 토막(sessions.talk_segment). */
  segment: TalkSegment;
  /** 아이가 답할 질문. 인사가 끝났거나 · 고르기를 기다리거나 · 대화가 닫혔으면 null. */
  pending: PendingQuestion | null;
  /** 지금 질문의 '모름' 수(질문이 바뀌면 0). */
  dontKnowCount: number;
  /** 인사 질문 차례(0부터). 인사가 끝났으면 카드 인사 턴 수. */
  greetingIndex: number;
  /** 인사 턴을 다 했다(서버가 다음 토막으로 넘김). */
  greetingDone: boolean;
  /** 지금 질문이 마지막 인사 질문이다(그 턴을 끝내는 말은 '인사 끝'으로 보낸다). */
  lastGreetingQuestion: boolean;
  /** '말 주고받기 n' — 인사 · 대화 토막의 '모름' · 막힘이 아닌 아이 턴(4절 위 띠 · 3.3). */
  talkCount: number;
  targetReached: boolean;
  /** '더 이야기하기' · '그만하기'를 고를 차례. */
  awaitingChoice: boolean;
  /** '더 이야기하기' 몇 번째인지(0 이면 아직). */
  moreRound: number;
  /** 이번 '더 이야기하기'에서 한 턴 수 · 남은 턴 수. */
  moreInRound: number;
  moreTurnsLeft: number;
  /** 1~3단계 '더 이야기할 거리'를 다 썼다(회화 턴 입력 칸). */
  moreTalkUsedUp: boolean;
  /** 4단계부터 토리 행이 가리킨 카드 질문 번호(차례대로). */
  usedQuestionNos: number[];
  /** 대화 닫힘(정리 토막). */
  closed: boolean;
  /** 아이 턴 수('모름' 포함 — 대화 안전 상한, 회11 (14)). */
  childTurns: number;
  /** 따라 말하기 토막(오늘 쓸 말 · 말해 보기 · 정리)의 지금 차례와 다 했는지. */
  followIndex: number;
  followDone: boolean;
};

type Cursor = {
  phase: "greeting" | "talk";
  greetingIndex: number;
  cardIndex: number;
  skipped: number[];
  skippedIndex: number;
  moreIndex: number;
  /** '더 이야기할 거리'를 마지막으로 물은 차례(물을 때마다 는다). */
  lastUse: number[];
  askSeq: number;
  asked: Set<string>;
  current: PendingQuestion | null;
  /** 4단계부터 · 1~3단계 AI 자리: 다음 토리 행이 질문을 정한다. */
  awaitingTori: boolean;
  dontKnow: number;
  talkCount: number;
  moreCount: number;
  childTurns: number;
  usedQuestionNos: number[];
  /** 목표 턴에 닿았거나 '더 이야기하기' 한 번을 끝낸 아이 턴 뒤 아직 고르지 않았다. */
  choicePending: boolean;
};

const pair = (
  spec: Pick<TalkFlowSpec, "twoAnswers">,
  askKind: AskKind,
  turn: { twoAnswers?: [string, string] },
): [string, string] | undefined =>
  spec.twoAnswers && askKind === "first" ? turn.twoAnswers : undefined;

function fromTurnCard(
  turn: Omit<TurnCard, "targets" | "ask"> & { targets?: string[] },
  head: Pick<PendingQuestion, "source" | "index" | "askKind">,
  spec: Pick<TalkFlowSpec, "twoAnswers">,
): PendingQuestion {
  return {
    ...head,
    en: turn.question.en,
    ko: turn.question.ko,
    targets: [...(turn.targets ?? [])],
    answerExample: turn.answerExample,
    hintKo: turn.hintKo,
    hintEn: turn.hintEn,
    ...(turn.frameEn === undefined ? {} : { frameEn: turn.frameEn }),
    ...(turn.imageKey === undefined ? {} : { imageKey: turn.imageKey }),
    ...(() => {
      const two = pair(spec, head.askKind, turn);
      return two ? { twoAnswers: two } : {};
    })(),
  };
}

type Ctx = {
  spec: TalkFlowSpec;
  card: TalkCard;
  metBefore: readonly string[];
  settings: TalkFlowSettings;
};

const isTurns = (spec: Pick<TalkFlowSpec, "cardShape">) =>
  spec.cardShape === "turns";

function greetingQuestion(ctx: Ctx, index: number): PendingQuestion {
  const { card, spec } = ctx;
  if ("questions" in card.greeting) {
    const turn = card.greeting.questions[index];
    if (!turn) throw new RangeError(`카드 인사 질문 ${index} 이 없다`);
    // 1단계 인사 턴은 노리는 단어가 없어도 처음 묻는 턴처럼 답 두 개(3.3)
    return fromTurnCard(
      turn,
      { source: "card_greeting", index, askKind: "first" },
      spec,
    );
  }
  if (index === 0) {
    const line = card.greeting.firstLine;
    return {
      source: "card_greeting",
      index,
      en: line.en,
      ...(line.ko === undefined ? {} : { ko: line.ko }),
      targets: [],
      askKind: "first",
      answerExample: "",
    };
  }
  // 4단계부터 둘째 인사 턴은 AI 가 쓴다
  return {
    source: "ai_question",
    questionNo: 0,
    targets: [],
    askKind: "re_ask",
    answerExample: "",
  };
}

function cardQuestion(ctx: Ctx, cur: Cursor, no: number): PendingQuestion {
  const q = ctx.card.questions?.[no - 1];
  if (!q || no < 1)
    return {
      source: "ai_question",
      questionNo: 0,
      targets: [],
      askKind: "re_ask",
      answerExample: "",
    };
  return {
    source: "card_question",
    questionNo: no,
    en: q.en,
    ko: q.ko,
    targets: [...q.targets],
    askKind: askKindOf({
      targets: q.targets,
      metBefore: ctx.metBefore,
      askedTargets: cur.asked,
    }),
    answerExample: q.answerExample,
  };
}

/** 이 대화에서 가장 오래전에 쓴 '더 이야기할 거리'(같으면 앞 차례). */
function oldestMoreTalk(cur: Cursor): number {
  let best = 0;
  cur.lastUse.forEach((seq, i) => {
    if (seq < (cur.lastUse[best] ?? 0)) best = i;
  });
  return best;
}

function moreTalkQuestion(
  ctx: Ctx,
  index: number,
  source: QuestionSource,
): PendingQuestion {
  const turn = ctx.card.moreTalk?.[index];
  if (!turn) throw new RangeError(`카드 '더 이야기할 거리' ${index} 가 없다`);
  // '더 이야기할 거리' 턴과 AI 가 이어 만든 턴은 늘 다시 묻는 턴(C36 · B5-M-04)
  return fromTurnCard(turn, { source, index, askKind: "re_ask" }, ctx.spec);
}

/** 1~3단계 대화 질문(C36 · 회11 (4)). 목표 턴 뒤는 '더 이야기할 거리'부터. */
function turnsQuestion(ctx: Ctx, cur: Cursor): PendingQuestion {
  const turns = ctx.card.turns ?? [];
  const more = ctx.card.moreTalk ?? [];
  const reached = cur.talkCount >= ctx.spec.targetTurns;
  cur.askSeq += 1;
  if (!reached && cur.cardIndex < turns.length) {
    const turn = turns[cur.cardIndex] as TurnCard;
    return fromTurnCard(
      turn,
      {
        source: "card_turn",
        index: cur.cardIndex,
        askKind: askKindOf({
          targets: turn.targets,
          metBefore: ctx.metBefore,
          askedTargets: cur.asked,
        }),
      },
      ctx.spec,
    );
  }
  if (!reached && cur.skippedIndex < cur.skipped.length) {
    const index = cur.skipped[cur.skippedIndex] as number;
    const turn = turns[index] as TurnCard;
    return {
      ...fromTurnCard(
        turn,
        {
          source: "card_skipped",
          index,
          askKind: askKindOf({
            targets: turn.targets,
            metBefore: ctx.metBefore,
            askedTargets: cur.asked,
          }),
        },
        ctx.spec,
      ),
      withAnswerExample: true,
    };
  }
  if (cur.moreIndex < more.length) {
    cur.lastUse[cur.moreIndex] = cur.askSeq;
    return moreTalkQuestion(ctx, cur.moreIndex, "more_talk");
  }
  cur.awaitingTori = true;
  return {
    source: "ai_more_talk",
    targets: [],
    askKind: "re_ask",
    answerExample: "",
    ...(more.length > 0
      ? { fallback: moreTalkQuestion(ctx, oldestMoreTalk(cur), "more_talk") }
      : {}),
  };
}

/** 대화 토막의 첫 질문 — 4단계부터 카드 질문 목록 1번(C19). 앱이 붙이므로 흐름이 '쓴 카드 질문'에 스스로 넣는다(fix 1 M6). */
const FIRST_CARD_QUESTION_NO = 1;

function talkFirstQuestion(ctx: Ctx, cur: Cursor): PendingQuestion {
  if (isTurns(ctx.spec)) return turnsQuestion(ctx, cur);
  cur.usedQuestionNos.push(FIRST_CARD_QUESTION_NO);
  return cardQuestion(ctx, cur, FIRST_CARD_QUESTION_NO);
}

/** 지금 질문이 끝났다(답함 · '모름' 끝까지). 다음 질문으로 간다. */
function advance(ctx: Ctx, cur: Cursor, skipped: boolean): void {
  const q = cur.current;
  for (const w of q?.targets ?? []) cur.asked.add(w);
  cur.dontKnow = 0;
  if (cur.phase === "greeting") {
    cur.greetingIndex += 1;
    if (cur.greetingIndex < ctx.card.greetingTurns) {
      cur.current = greetingQuestion(ctx, cur.greetingIndex);
      cur.awaitingTori = cur.current.source === "ai_question";
      return;
    }
    cur.phase = "talk";
    cur.current = talkFirstQuestion(ctx, cur);
    return;
  }
  if (isTurns(ctx.spec)) {
    if (q?.source === "card_turn") {
      if (skipped) cur.skipped.push(q.index ?? 0);
      cur.cardIndex += 1;
    } else if (q?.source === "card_skipped") cur.skippedIndex += 1;
    else if (q?.source === "more_talk") cur.moreIndex += 1;
    cur.current = turnsQuestion(ctx, cur);
    return;
  }
  // 4단계부터: 다음 질문은 AI 가 쓰고 다음 토리 행이 카드 질문 번호를 알린다
  cur.current = cardQuestion(ctx, cur, 0);
  cur.awaitingTori = true;
}

/** 토리 행에 실린 AI 질문으로 AI 자리 질문을 채운다(힌트는 단계 영어 단 차례 — 영어 틀이 있으면 앞). */
function withAiQuestion(
  q: PendingQuestion,
  ai: AiQuestionLite,
): PendingQuestion {
  const hints = ai.hints ?? [];
  const hintEn = hints.at(-1);
  const frameEn = hints.length > 1 ? hints[0] : undefined;
  return {
    ...q,
    en: ai.en,
    ko: ai.ko,
    answerExample: ai.answerExample,
    ...(ai.hintKo === undefined || ai.hintKo === ""
      ? {}
      : { hintKo: ai.hintKo }),
    ...(hintEn === undefined ? {} : { hintEn }),
    ...(frameEn === undefined ? {} : { frameEn }),
  };
}

function onTori(
  ctx: Ctx,
  cur: Cursor,
  row: Extract<TalkTurnLite, { speaker: "tori" }>,
): void {
  // 고르기 차례의 토리 행은 아이가 '더 이야기하기'를 골라 질문을 붙였을 때만 고르기를 끝낸다(fix 1 I2)
  if (row.moreChosen) cur.choicePending = false;
  if (row.cardQuestionNo !== null) cur.usedQuestionNos.push(row.cardQuestionNo);
  if (!cur.awaitingTori) return;
  cur.awaitingTori = false;
  if (isTurns(ctx.spec)) {
    if (cur.current?.source !== "ai_more_talk") return;
    if (row.moreTalkFallback !== null) {
      cur.lastUse[row.moreTalkFallback] = cur.askSeq;
      cur.current = moreTalkQuestion(ctx, row.moreTalkFallback, "ai_more_talk");
    } else if (row.aiQuestion) {
      cur.current = withAiQuestion(cur.current, row.aiQuestion);
    }
    return;
  }
  if (row.cardQuestionNo !== null && cur.phase === "talk")
    cur.current = cardQuestion(ctx, cur, row.cardQuestionNo);
}

function onChild(
  ctx: Ctx,
  cur: Cursor,
  row: Extract<TalkTurnLite, { speaker: "child" }>,
): void {
  cur.childTurns += 1;
  cur.choicePending = false;
  // 이 대화에서 이미 물은 단어(talk_turns.target_words — 4단계부터 AI 이어 묻는 질문이 노린 것 포함, fix 1 M2)
  for (const w of row.targets) cur.asked.add(w);
  // 자리가 어긋난 행(AI 자리를 정하는 토리 행 없이 이어진 아이 행)은 지금 질문에 답한 것으로 본다
  cur.awaitingTori = false;
  const dontKnow = row.input === "dont_know" || row.stuck;
  if (dontKnow) {
    cur.dontKnow += 1;
    if (cur.dontKnow >= ctx.settings.dontknowMax) advance(ctx, cur, true);
    return;
  }
  const wasReached = cur.talkCount >= ctx.spec.targetTurns;
  if (row.segment === "more_talk") {
    cur.moreCount += 1;
    if (cur.moreCount % ctx.settings.moreRoundTurns === 0)
      cur.choicePending = true;
  } else {
    cur.talkCount += 1;
    if (!wasReached && cur.talkCount >= ctx.spec.targetTurns)
      cur.choicePending = true;
  }
  advance(ctx, cur, false);
}

/**
 * 지금 자리(회화 수업 모델 1 · 3 · 5, 정할 것 회11). turns 를 차례로 되짚는다:
 * 아이 행은 지금 질문에 답함(말 · 막힘 아님) → 다음 질문 · '말 주고받기' +1, '모름' · 막힘 → 같은 질문(talk.dontknow_max 번째면 다음).
 * 1~3단계 질문 차례: 카드 턴 → (목표 턴 전에 다 쓰면) 넘어간 질문을 답 예시와 함께 한 번씩 → '더 이야기할 거리' → AI(C36),
 * 목표 턴 뒤 '더 이야기하기'는 남은 '더 이야기할 거리'부터. 4단계부터 대화 첫 질문은 카드 질문 1번, 그 뒤는 토리 행의 카드 질문 번호.
 * 고르기: 목표 턴에 닿은 턴과 '더 이야기하기' 한 번(talk.more_talk_round_turns)을 끝낸 아이 턴 뒤부터, 그 뒤 토리 행에
 * moreChosen 표지가 서거나 다음 아이 턴이 올 때까지(흐름이 스스로 판정 — 4단계부터 AI 가 제 말로 묻는 때도 같다, fix 1 I2).
 */
export function talkPositionOf({
  spec,
  card,
  metBefore,
  turns,
  segment,
  follow,
  settings,
}: {
  spec: TalkFlowSpec;
  card: TalkCard;
  metBefore: readonly string[];
  turns: readonly TalkTurnLite[];
  segment: TalkSegment;
  follow?: { done: number; total: number };
  settings: TalkFlowSettings;
}): TalkPosition {
  const ctx: Ctx = { spec, card, metBefore, settings };
  const cur: Cursor = {
    phase: "greeting",
    greetingIndex: 0,
    cardIndex: 0,
    skipped: [],
    skippedIndex: 0,
    moreIndex: 0,
    lastUse: (card.moreTalk ?? []).map(() => -1),
    askSeq: 0,
    asked: new Set(),
    current: null,
    awaitingTori: false,
    dontKnow: 0,
    talkCount: 0,
    moreCount: 0,
    childTurns: 0,
    usedQuestionNos: [],
    choicePending: false,
  };
  cur.current = greetingQuestion(ctx, 0);
  for (const row of turns) {
    if (row.speaker === "tori") onTori(ctx, cur, row);
    else onChild(ctx, cur, row);
  }
  const targetReached = cur.talkCount >= spec.targetTurns;
  const awaitingChoice = targetReached && cur.choicePending;
  const greetingDone = cur.phase === "talk";
  const closed = segment === "wrap_up";
  const asking =
    !closed &&
    !awaitingChoice &&
    (segment === "talk" ||
      segment === "more_talk" ||
      (segment === "greeting" && !greetingDone));
  const round = settings.moreRoundTurns;
  const inRound = cur.moreCount % round;
  const roundEnded = awaitingChoice && cur.moreCount > 0 && inRound === 0;
  const moreRound =
    segment !== "more_talk" && !roundEnded
      ? 0
      : roundEnded
        ? cur.moreCount / round
        : Math.floor(cur.moreCount / round) + 1;
  return {
    segment,
    pending: asking ? cur.current : null,
    dontKnowCount: cur.dontKnow,
    greetingIndex: cur.greetingIndex,
    greetingDone,
    lastGreetingQuestion:
      !greetingDone && cur.greetingIndex === card.greetingTurns - 1,
    talkCount: cur.talkCount,
    targetReached,
    awaitingChoice,
    moreRound,
    moreInRound: roundEnded ? round : inRound,
    moreTurnsLeft:
      segment === "more_talk" && !awaitingChoice ? round - inRound : 0,
    moreTalkUsedUp: cur.moreIndex >= (card.moreTalk ?? []).length,
    usedQuestionNos: [...cur.usedQuestionNos],
    closed,
    childTurns: cur.childTurns,
    followIndex: follow?.done ?? 0,
    followDone: follow ? follow.done >= follow.total : false,
  };
}

/**
 * 이번 턴에 답하면 다음 질문이 1~3단계 AI 자리인가(13절 C100 — 회화 턴 사용자 메시지 'AI question slot', 목표 턴 전 · 뒤 모두).
 * 지금 질문에 말로 답한 아이 행을 하나 더한 자리로 본다. 4단계부터는 늘 거짓(AI 가 tori_en 에 묻는다).
 */
export function nextQuestionIsAi(
  args: Parameters<typeof talkPositionOf>[0],
): boolean {
  if (!isTurns(args.spec)) return false;
  const now = talkPositionOf(args);
  if (!now.pending) return false;
  const after = talkPositionOf({
    ...args,
    turns: [
      ...args.turns,
      {
        speaker: "child",
        segment: args.segment === "more_talk" ? "more_talk" : "talk",
        input: "speech",
        stuck: false,
        targets: now.pending.targets,
      },
    ],
  });
  return !after.awaitingChoice && after.pending?.source === "ai_more_talk";
}

/**
 * 이번 아이 말을 보낼 토막(회화 턴 입력 · 6.2): 인사 토막의 마지막 인사 질문에 말로 답하거나 '모름'이 talk.dontknow_max 번째에
 * 닿으면 '인사 끝'(C19), 그 밖은 지금 토막.
 */
export function turnSegmentOf(
  position: Pick<
    TalkPosition,
    "segment" | "lastGreetingQuestion" | "dontKnowCount"
  >,
  input: TalkInputMode,
  settings: Pick<TalkFlowSettings, "dontknowMax">,
): TalkTurnSegment {
  if (position.segment === "more_talk") return "more_talk";
  if (position.segment !== "greeting") return "talk";
  const movesOn =
    input === "speech" || position.dontKnowCount + 1 >= settings.dontknowMax;
  return position.lastGreetingQuestion && movesOn ? "greeting_end" : "greeting";
}

/** 아직 쓰지 않은 가장 앞 카드 질문 번호(C19 · 회11 (8) — 끊긴 턴 · 걸린 힌트의 대신 질문). 다 썼으면 null. */
export function nextUnusedQuestionNo(
  position: Pick<TalkPosition, "usedQuestionNos">,
  card: Pick<TalkCard, "questions">,
): number | null {
  const used = new Set(position.usedQuestionNos);
  const total = card.questions?.length ?? 0;
  for (let no = 1; no <= total; no++) if (!used.has(no)) return no;
  return null;
}

// ── 앱이 붙일 말(3.3 1~3단계 토리 말 · 8절 회화 턴 실패 · C19 · C36) ──

export type AppendLine =
  | { kind: "question"; en: string; ko?: string }
  | { kind: "answer_example"; en: string }
  | { kind: "two_answers"; answers: [string, string] }
  | { kind: "more_prompt"; en: string; ko?: string }
  | { kind: "praise"; en: string };

/** 카드의 짧은 칭찬 대사를 턴 번호로 돌려 고른다(8절 — 1~3단계 회화 턴 실패). */
export function praiseLineOf(
  card: Pick<TalkCard, "praiseLines">,
  turnNo: number,
): string {
  const lines = card.praiseLines;
  return (
    lines[
      ((Math.trunc(turnNo) % lines.length) + lines.length) % lines.length
    ] ?? ""
  );
}

function questionLines(
  q: PendingQuestion,
  repeat: boolean,
  ko: boolean,
): AppendLine[] {
  const lines: AppendLine[] = [];
  if ((repeat || q.withAnswerExample) && q.answerExample !== "")
    lines.push({ kind: "answer_example", en: q.answerExample });
  if (q.en !== undefined)
    lines.push({
      kind: "question",
      en: q.en,
      ...(ko && q.ko !== undefined ? { ko: q.ko } : {}),
    });
  if (q.twoAnswers) lines.push({ kind: "two_answers", answers: q.twoAnswers });
  return lines;
}

/**
 * 토리 말 뒤에 앱이 붙일 말(after = 이번 아이 턴을 넣은 자리). 1~3단계: 인사 끝 턴 없음 · 고를 차례면 'Do you want to talk more?' ·
 * '모름' · 막힘이면 카드 답 예시 + 같은 질문(1단계 처음 묻는 턴이면 답 두 개도) · 그 밖 다음 카드 질문(넘어간 질문은 답 예시와 함께,
 * 1단계 처음 묻는 턴이면 답 두 개) · AI 자리는 AI 질문(없거나 걸리면 가장 오래전에 쓴 '더 이야기할 거리') · 두 번 실패한 턴은 칭찬 대사부터.
 * 4단계부터: 끊긴 턴에 보낸 문장에 물음표 문장이 없을 때만 아직 쓰지 않은 가장 앞 카드 질문.
 */
export function appendAfter({
  spec,
  card,
  after,
  outcome,
  turnNo,
  sentHasQuestion,
  ai,
}: {
  spec: TalkFlowSpec;
  card: TalkCard;
  after: TalkPosition;
  outcome: "ok" | "cut" | "failed";
  turnNo: number;
  sentHasQuestion?: boolean;
  /** 1~3단계 AI 질문(검사를 지난 것만, checkLowLevelAiQuestion). */
  ai?: { en: string; ko: string; answerExample: string } | null;
}): AppendLine[] {
  const ko = spec.koMeaning;
  if (!isTurns(spec)) {
    if (outcome !== "cut" || sentHasQuestion) return [];
    const no = nextUnusedQuestionNo(after, card);
    const q = no === null ? undefined : card.questions?.[no - 1];
    if (!q) return [];
    return [{ kind: "question", en: q.en, ...(ko ? { ko: q.ko } : {}) }];
  }
  const lines: AppendLine[] =
    outcome === "failed"
      ? [{ kind: "praise", en: praiseLineOf(card, turnNo) }]
      : [];
  if (after.awaitingChoice) {
    lines.push({
      kind: "more_prompt",
      en: MORE_PROMPT.en,
      ...(ko ? { ko: MORE_PROMPT.ko } : {}),
    });
    return lines;
  }
  let q = after.pending;
  if (!q) return lines;
  if (q.source === "ai_more_talk" && q.en === undefined) {
    if (ai) q = { ...q, en: ai.en, ko: ai.ko, answerExample: ai.answerExample };
    else if (q.fallback) q = q.fallback;
  }
  lines.push(...questionLines(q, after.dontKnowCount > 0, ko));
  return lines;
}

/** 카드가 노리는 단어 목록(P12 연습 수업 고르기): 1~3단계 카드 턴마다, 4단계부터 카드 질문마다. */
export function talkTargetsOf(
  card: Pick<TalkCard, "turns" | "questions">,
): string[][] {
  if (card.turns) return card.turns.map((t) => [...t.targets]);
  return (card.questions ?? []).map((q) => [...q.targets]);
}

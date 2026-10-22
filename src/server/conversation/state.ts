import "server-only";
// 회화 세션 서버의 공용 바탕(plan-p13b 파일별 값 1 · 2 · 3 이 같이 쓴다 — a '회화 수업 모델' 4 · 5, 13절 C89 · C101).
// 세션 상태 읽기(세션 행 · 카드 · 단계 규격 · talk_turns · 처음 스냅숏 · 따라 말하기 시도 → a 의 talkPositionOf), 토리 행 가벼운 꼴의
// 네 칸 유도(a 보고 '요청 2'), 앱이 붙일 말 ↔ 흘려 보낼 줄, 회화 턴 입력 만들기, '말함' 행 쓰기(만남 · '말했다'), 목표 턴 닿음과
// 세션이 끝날 때의 이음매. AI 를 부르지 않는다. 시각은 인자로 받고 SQL 안에 now() 를 쓰지 않는다. 아이 글을 로그에 내지 않는다.
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import type { LevelContext } from "@/core/ai/calls/common";
import {
  type TalkHistoryEntry,
  type TalkTurn,
  type TalkTurnContext,
  type TalkTurnInput,
  talkContextDelta,
  twoAnswersLine,
} from "@/core/ai/calls/talk";
import { parseTalkAttemptInput } from "@/core/conversation/attempt";
import {
  type AiQuestionLite,
  type AppendLine,
  MORE_PROMPT,
  type PendingQuestion,
  practiceItemsOf,
  type TalkFlowSettings,
  type TalkPosition,
  type TalkSegment,
  type TalkTurnLite,
  talkFlowOf,
  talkFlowSettingsFrom,
  talkPositionOf,
} from "@/core/conversation/flow";
import { friendshipAfter } from "@/core/conversation/friendship";
import type { HintTier } from "@/core/conversation/hints";
import { metWordsIn, sayStateAfter } from "@/core/conversation/said";
import { learningDayOf } from "@/core/learning-day";
import { bandOf } from "@/core/level-band";
import { LESSON_SCHEMAS, type TalkLesson } from "@/core/seed/schema/lesson";
import {
  type TalkLevelSpec,
  TalkLevelSpecSchema,
} from "@/core/seed/schema/reference";
import type { TalkCard } from "@/core/seed/schema/talk";
import { STORIES_PER_BAND } from "@/core/seed/structure";
import { splitSentences } from "@/core/seed/text";
import { lemmaLookup } from "@/core/session/attempt";
import { lessons, vocab } from "@/db/schema/content";
import {
  attempts,
  profileTracks,
  sessions,
  talkSummaries,
  talkTurns,
  unitProgress,
  vocabProgress,
} from "@/db/schema/learning";
import type { TalkDeps } from "@/server/ai";
import type { Db, DbOrTx } from "@/server/db";
import { readLevelSpec } from "@/server/seed/read";
import {
  appDayStartHourSchema,
  appTimezoneSchema,
  getSettings,
} from "@/server/settings";

// ── 의존 · 형 ────────────────────────────────────────────────────

export type TalkServerDeps = {
  db?: Db;
  now: () => Date;
  /** 동음이의어 묶음(시드 lists/homophones.json). 시험이 바꾼다. */
  homophones?: () => string[][];
  /** 회화 턴 · 끝맺음 턴의 AI 의존(시험의 가짜 클라이언트). */
  ai?: TalkDeps;
  /** 응답 뒤 할 일(서버 액션은 after). 시험은 모으거나 바로 돌린다. */
  schedule?: (task: () => Promise<void>) => void;
};

export type TalkTurnRow = typeof talkTurns.$inferSelect;
type SessionRow = typeof sessions.$inferSelect;
type LessonRow = typeof lessons.$inferSelect;

export type TalkStart = {
  shownWords: string[];
  metBefore: string[];
  practiceOrder: number[][];
};

/** 따라 말하기 토막의 끝낸 차례(attempts — 같은 차례를 두 번 세지 않는다). */
export type FollowDone = {
  today: number[];
  practice: { round: number; index: number }[];
  wrapUp: number[];
  again: boolean;
};

export type TalkState = {
  profileId: string;
  session: SessionRow;
  lessonRow: LessonRow;
  lesson: TalkLesson;
  card: TalkCard;
  spec: TalkLevelSpec;
  level: number;
  unit: number;
  /** 지금 토막(sessions.talk_segment — 비었으면 인사). */
  segment: TalkSegment;
  /** 토막 차례(a talkFlowOf). */
  flow: TalkSegment[];
  flowSettings: TalkFlowSettings;
  /** talk.practice_rounds */
  practiceRounds: number;
  start: TalkStart | null;
  /** 이 세션 talk_turns(턴 번호 차례, 같은 번호는 토리 행 먼저 — C89). */
  rows: TalkTurnRow[];
  /** 끝의 '토리의 말이 없는 아이 행'을 뺀 것(자리 판정은 이것으로). */
  liveRows: TalkTurnRow[];
  /** 토리의 말이 없는 마지막 아이 행(같은 시도 id 로 다시 받는다 — 8절 · AC-15f). */
  orphan: TalkTurnRow | null;
  /** 지금 자리(a talkPositionOf, liveRows). */
  position: TalkPosition;
  follows: FollowDone;
  lemmaOf: (surface: string) => string | undefined;
  lemmaEntries: { word: string; forms: string[] }[];
  /** 단원 회차 복사본(12절 머리 — unit.new_words_per_lesson · talk.known_days). */
  snapshot: Record<string, unknown>;
  learningDay: string;
  timezone: string;
  dayStartHour: number;
};

/** 대화가 열려 있는가(진행 · 또는 완료이고 정리 토막 전 — 목표 턴 뒤 '더 이야기하기', 회16). */
export function isTalkOpen(
  s: Pick<SessionRow, "status" | "talkSegment">,
): boolean {
  if (s.talkSegment === "wrap_up") return false;
  return s.status === "in_progress" || s.status === "completed";
}

// ── 설정 ─────────────────────────────────────────────────────────

const STATE_KEYS = [
  "talk.dontknow_max",
  "talk.more_talk_round_turns",
  "talk.nospeech_dontknow_count",
  "talk.practice_rounds",
] as const;

const stateSettingSchemas = {
  ...Object.fromEntries(STATE_KEYS.map((key) => [key, z.unknown()])),
  "app.timezone": appTimezoneSchema,
  "app.day_start_hour": appDayStartHourSchema,
} as Record<string, z.ZodType>;

/** 정수 1 이상 설정 하나(없거나 꼴이 틀리면 던진다 — 조용한 기본값 없음). */
export function positiveInt(values: Record<string, unknown>, key: string) {
  const parsed = z.int().min(1).safeParse(values[key]);
  if (!parsed.success)
    throw new Error(`회화 설정 '${key}' 가 없거나 1 이상 정수가 아니다`);
  return parsed.data;
}

// ── 토리 행 원문(첫 줄 = 검사를 지난 AI 글, 그 뒤 줄 = 앱이 붙인 말) ────

/** 토리 행 원문: 첫 줄은 검사를 지난 tori_en(문장을 띄어 이음, 없으면 빈 줄), 그 뒤로 앱이 붙인 말 한 줄씩. {NAME} 틀 그대로. */
export function toriTextOf(
  aiPart: string,
  appended: readonly string[],
): string {
  return [aiPart, ...appended].join("\n");
}

export function toriLinesOf(text: string | null): {
  aiPart: string;
  appended: string[];
} {
  const [aiPart = "", ...appended] = (text ?? "").split("\n");
  return { aiPart, appended: appended.filter((line) => line !== "") };
}

/** 앱이 붙인 말 한 줄의 영어(토리 행 원문 · 다시 쓸 토리 차례에 넣는 글). */
export function appendEnOf(line: AppendLine): string {
  return line.kind === "two_answers" ? twoAnswersLine(line.answers) : line.en;
}

/** a 보고 '요청 2' — 붙인 질문이 '더 이야기할 거리' 질문이면 그 차례(1~3단계 AI 자리를 대신한 것). */
export function moreTalkFallbackOf(
  text: string | null,
  card: Pick<TalkCard, "moreTalk">,
): number | null {
  const { appended } = toriLinesOf(text);
  const more = card.moreTalk ?? [];
  for (const line of appended) {
    const i = more.findIndex((t) => t.question.en === line);
    if (i >= 0) return i;
  }
  return null;
}

/**
 * a 보고 '요청 2' — 고르기 차례의 토리 행에 아이가 '더 이야기하기'를 골라 앱이 다음 질문을 붙였는가. 1~3단계는 원문 마지막 줄이
 * 'Do you want to talk more?' 가 아니면 참, 4단계부터는 AI 글 줄 뒤에 앱이 붙인 줄이 있고 그 마지막이 그 말이 아니면 참(끊긴 목표 턴에
 * 앱이 붙인 '더 이야기할래?'는 '골랐음'이 아니다 — 차례 2 N1). 고르기 차례가 아닌 행에서 참이어도 흐름은 쓰지 않는다.
 */
export function moreChosenOf(
  text: string | null,
  spec: Pick<TalkLevelSpec, "cardShape">,
): boolean {
  const { aiPart, appended } = toriLinesOf(text);
  if (spec.cardShape === "turns") {
    const last = appended.at(-1) ?? aiPart;
    return last !== "" && last !== MORE_PROMPT.en;
  }
  const last = appended.at(-1);
  return last !== undefined && last !== MORE_PROMPT.en;
}

const AiQuestionSchema = z.object({
  en: z.string().min(1),
  ko: z.string(),
  answerExample: z.string(),
  hintKo: z.string().optional(),
  hints: z.array(z.string()).optional(),
});

export function aiQuestionOf(raw: unknown): AiQuestionLite | null {
  const parsed = AiQuestionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** talk_turns 행 → 흐름의 가벼운 꼴(a TalkTurnLite). */
export function liteOf(
  row: TalkTurnRow,
  ctx: { card: TalkCard; spec: Pick<TalkLevelSpec, "cardShape"> },
): TalkTurnLite {
  if (row.speaker === "child")
    return {
      speaker: "child",
      segment:
        row.segment === "more_talk"
          ? "more_talk"
          : row.segment === "greeting"
            ? "greeting"
            : "talk",
      input: row.inputMode ?? "speech",
      stuck: row.stuckPhrase !== null,
      targets: [...(row.targetWords ?? [])],
    };
  return {
    speaker: "tori",
    cardQuestionNo: row.cardQuestionNo,
    moreTalkFallback: moreTalkFallbackOf(row.text, ctx.card),
    aiQuestion: aiQuestionOf(row.aiQuestion),
    moreChosen: moreChosenOf(row.text, ctx.spec),
  };
}

/** 턴 번호 차례, 같은 번호는 토리 행 먼저(토리 행 n = 아이 말 n 앞의 토리 말, C89). */
export function sortTurns<T extends Pick<TalkTurnRow, "turnNo" | "speaker">>(
  rows: readonly T[],
): T[] {
  return [...rows].sort(
    (a, b) =>
      a.turnNo - b.turnNo ||
      (a.speaker === b.speaker ? 0 : a.speaker === "tori" ? -1 : 1),
  );
}

/** 끝의 토리의 말이 없는 아이 행을 떼어 낸다. */
export function splitOrphan<T extends Pick<TalkTurnRow, "speaker">>(
  rows: readonly T[],
): { live: T[]; orphan: T | null } {
  const last = rows.at(-1);
  if (last?.speaker === "child")
    return { live: rows.slice(0, -1), orphan: last };
  return { live: [...rows], orphan: null };
}

// ── 흘려 보낼 줄(C92 NDJSON — Route Handler 가 JSON 한 줄씩) ───────

export type HintView = {
  kind: HintTier["kind"];
  /** 1~3단계 영어 단은 비운다 — 연 단만 revealTalkHint 로 받는다(영어 문장을 미리 내려 주지 않음). */
  text?: string;
  listen?: boolean;
  usable?: string[];
};

/** 아이가 답할 지금 질문(화면 몫). 1~3단계는 아이가 말할 영어(답 예시 · 힌트 글)를 넣지 않는다. */
export type PendingView = {
  source: PendingQuestion["source"];
  questionNo?: number;
  /** 토리가 묻는 질문(말풍선 · 읽어 주기). AI 가 tori_en 에 쓴 질문이면 없음. */
  en?: string;
  ko?: string;
  targets: string[];
  askKind: PendingQuestion["askKind"];
  /** 1단계 처음 묻는 턴 · 인사 턴의 답 두 개(읽어 주기만 — 글로 보이지 않는다). */
  twoAnswers?: [string, string];
  imageKey?: string;
  /** 4단계부터 '모름' 뒤 답 예시(1~3단계는 앱이 붙인 말로만). */
  answerExample?: string;
};

export type TurnNext = {
  pending: PendingView | null;
  hints: HintView[];
  /** '말 주고받기 n'. */
  talkCount: number;
  target: number;
  targetReached: boolean;
  awaitingChoice: boolean;
  moreRound: number;
  moreLeft: number;
  segment: TalkSegment;
  greetingDone: boolean;
  dontKnowCount: number;
  /** 토리 말풍선 아래 글(읽지 않음). */
  explanation?: string;
  missionsDone?: number[];
};

/**
 * 앱이 붙인 말 한 줄(C92 add). en 은 토리가 묻는 말(말풍선 글 · 읽어 주기). 아이가 말할 영어는 글 칸에 넣지 않는다 —
 * again 의 say(답 예시)와 two_answers 의 answers(답 두 개)는 **읽어 주기 재료**이고 1~3단계 화면은 글로 보이지 않는다(3.3 · T2 ·
 * 검토 I-3). 'Or' 이음은 화면이 공용 twoAnswersLine 으로.
 */
export type AddLineOut =
  | { t: "add"; kind: "question" | "more_prompt"; en: string; ko?: string }
  | {
      t: "add";
      kind: "again";
      /** 읽어 주기 전용: 답 예시(아이가 말할 영어 — 글로 보이지 않는다). */
      say: string;
      /** 같은 질문(토리가 다시 묻는 말). AI 질문 자리에서 질문 글이 없으면 비움. */
      en?: string;
      ko?: string;
    }
  | {
      t: "add";
      kind: "two_answers";
      /** 읽어 주기 전용: 답 두 개(1단계 처음 묻는 턴 · 인사 턴 — 글로 보이지 않는다). */
      answers: [string, string];
    };

export type TalkLine =
  | { t: "s"; en: string }
  | { t: "ko"; ko: string }
  | AddLineOut
  | { t: "end"; next: TurnNext }
  | { t: "resting" }
  | { t: "break"; en: string; ko?: string }
  | {
      t: "close";
      reason: "resting" | "safety";
      lines?: { en: string; ko?: string }[];
      farewell: { en: string; ko?: string };
    }
  | { t: "stale" }
  | { t: "error" };

export type AddLine = Extract<TalkLine, { t: "s" } | { t: "add" }>;

/**
 * 앱이 붙일 말 → 흘려 보낼 줄. 칭찬 대사는 토리 말(s), 답 예시 뒤 같은 질문은 again 한 줄(say = 답 예시 · en = 질문), 답 두 개는
 * two_answers(answers), 'Do you want to talk more?' 는 more_prompt. 뜻은 koMeaning 단계만(a appendAfter 가 이미 가름).
 */
export function addLinesOf(lines: readonly AppendLine[]): AddLine[] {
  const out: AddLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as AppendLine;
    switch (line.kind) {
      case "praise":
        out.push({ t: "s", en: line.en });
        break;
      case "answer_example": {
        const next = lines[i + 1];
        if (next?.kind === "question") {
          out.push({
            t: "add",
            kind: "again",
            say: line.en,
            en: next.en,
            ...(next.ko === undefined ? {} : { ko: next.ko }),
          });
          i += 1;
        } else out.push({ t: "add", kind: "again", say: line.en });
        break;
      }
      case "question":
      case "more_prompt":
        out.push({
          t: "add",
          kind: line.kind,
          en: line.en,
          ...(line.ko === undefined ? {} : { ko: line.ko }),
        });
        break;
      case "two_answers":
        out.push({ t: "add", kind: "two_answers", answers: line.answers });
        break;
    }
  }
  return out;
}

/** 카드에서 영어 질문의 뜻을 찾는다(이어 할 때 · 다시 흘려 보낼 때). */
function questionKoOf(card: TalkCard, en: string): string | undefined {
  const turns = [
    ...("questions" in card.greeting ? card.greeting.questions : []),
    ...(card.turns ?? []),
    ...(card.moreTalk ?? []),
  ];
  return (
    turns.find((t) => t.question.en === en)?.question.ko ??
    card.questions?.find((q) => q.en === en)?.ko
  );
}

/**
 * 저장된 토리 행의 붙인 줄 → 앱이 붙일 말(이어 하기 · 같은 시도 id 다시 흘림 — AI 없음). 저장 글에는 갈래가 없어 줄 글로 가른다:
 * 'Do you want to talk more?' · 카드 칭찬 대사 · 지금 질문의 답 두 개 줄 · 지금 질문의 답 예시(다음 줄이 그 질문) · 그 밖은 질문.
 */
export function appendLinesFromText(
  appended: readonly string[],
  ctx: {
    card: TalkCard;
    pending: PendingQuestion | null;
    koMeaning: boolean;
  },
): AppendLine[] {
  const { card, pending, koMeaning } = ctx;
  const out: AppendLine[] = [];
  appended.forEach((line, i) => {
    if (line === MORE_PROMPT.en) {
      out.push({
        kind: "more_prompt",
        en: line,
        ...(koMeaning ? { ko: MORE_PROMPT.ko } : {}),
      });
      return;
    }
    if (card.praiseLines.includes(line)) {
      out.push({ kind: "praise", en: line });
      return;
    }
    if (pending?.twoAnswers && line === twoAnswersLine(pending.twoAnswers)) {
      out.push({ kind: "two_answers", answers: pending.twoAnswers });
      return;
    }
    if (
      pending &&
      pending.answerExample !== "" &&
      line === pending.answerExample &&
      appended[i + 1] === pending.en
    ) {
      out.push({ kind: "answer_example", en: line });
      return;
    }
    const ko = pending?.en === line ? pending.ko : questionKoOf(card, line);
    out.push({
      kind: "question",
      en: line,
      ...(koMeaning && ko !== undefined ? { ko } : {}),
    });
  });
  return out;
}

/** 지금 질문의 화면 몫. */
export function pendingViewOf(
  q: PendingQuestion | null,
  lowLevel: boolean,
): PendingView | null {
  if (!q) return null;
  return {
    source: q.source,
    ...(q.questionNo === undefined ? {} : { questionNo: q.questionNo }),
    ...(q.en === undefined ? {} : { en: q.en }),
    ...(q.ko === undefined ? {} : { ko: q.ko }),
    targets: [...q.targets],
    askKind: q.askKind,
    ...(q.twoAnswers ? { twoAnswers: q.twoAnswers } : {}),
    ...(q.imageKey === undefined ? {} : { imageKey: q.imageKey }),
    ...(lowLevel || q.answerExample === ""
      ? {}
      : { answerExample: q.answerExample }),
  };
}

/** 힌트 단의 화면 몫(1~3단계 영어 단은 글을 빼고 연 단만 따로 받는다). */
export function hintViewsOf(
  tiers: readonly HintTier[],
  lowLevel: boolean,
): HintView[] {
  return tiers.map((tier) => {
    if (lowLevel && tier.kind !== "ko")
      return { kind: tier.kind, ...(tier.listen ? { listen: true } : {}) };
    return {
      kind: tier.kind,
      text: tier.text,
      ...(tier.listen ? { listen: true } : {}),
      ...(tier.usable ? { usable: [...tier.usable] } : {}),
    };
  });
}

export function nextOf(
  position: TalkPosition,
  ctx: {
    spec: Pick<TalkLevelSpec, "targetTurns" | "cardShape">;
    hints: readonly HintTier[];
    explanation?: string;
    missionsDone?: number[];
  },
): TurnNext {
  const lowLevel = ctx.spec.cardShape === "turns";
  return {
    pending: pendingViewOf(position.pending, lowLevel),
    hints: hintViewsOf(ctx.hints, lowLevel),
    talkCount: position.talkCount,
    target: ctx.spec.targetTurns,
    targetReached: position.targetReached,
    awaitingChoice: position.awaitingChoice,
    moreRound: position.moreRound,
    moreLeft: position.moreTurnsLeft,
    segment: position.segment,
    greetingDone: position.greetingDone,
    dontKnowCount: position.dontKnowCount,
    ...(ctx.explanation ? { explanation: ctx.explanation } : {}),
    ...(ctx.missionsDone && ctx.missionsDone.length > 0
      ? { missionsDone: [...ctx.missionsDone] }
      : {}),
  };
}

// ── 상태 읽기 ────────────────────────────────────────────────────

/** 단원 단어의 원형 표 자료(vocab word · forms). */
export async function lemmaEntriesOf(
  db: DbOrTx,
  words: readonly string[],
): Promise<{ word: string; forms: string[] }[]> {
  if (words.length === 0) return [];
  const rows = await db
    .select({ word: vocab.word, forms: vocab.forms })
    .from(vocab)
    .where(inArray(vocab.word, [...words]));
  return rows.map((r) => ({
    word: r.word,
    forms: Array.isArray(r.forms)
      ? r.forms.filter((f): f is string => typeof f === "string")
      : [],
  }));
}

/** 따라 말하기 시도(오늘 쓸 말 · 말해 보기 · 정리 · 한 번 더)의 끝낸 차례. */
export function followDoneOf(inputs: readonly unknown[]): FollowDone {
  const out: FollowDone = {
    today: [],
    practice: [],
    wrapUp: [],
    again: false,
  };
  for (const raw of inputs) {
    const input = parseTalkAttemptInput(raw);
    if (!input) continue;
    if (input.kind === "talk-today" && !out.today.includes(input.index))
      out.today.push(input.index);
    else if (
      input.kind === "talk-practice" &&
      !out.practice.some(
        (p) => p.round === input.round && p.index === input.index,
      )
    )
      out.practice.push({ round: input.round, index: input.index });
    else if (input.kind === "talk-wrapup" && !out.wrapUp.includes(input.index))
      out.wrapUp.push(input.index);
    else if (input.kind === "talk-again") out.again = true;
  }
  return out;
}

/** 지금 토막의 따라 말하기 자리(a talkPositionOf 의 follow). */
function followOf(
  segment: TalkSegment,
  follows: FollowDone,
  counts: { today: number; practice: number },
): { done: number; total: number } | undefined {
  if (segment === "today_words")
    return { done: follows.today.length, total: counts.today };
  if (segment === "practice")
    return { done: follows.practice.length, total: counts.practice };
  return undefined;
}

/**
 * 그 프로필의 회화 세션 상태. lock 이면 세션 행을 FOR UPDATE 로 잡는다(두 기기 줄 세움 — 회18). 회화가 아니거나 남의 세션이면
 * undefined. 카드 · 규격이 깨졌으면 던진다(시드 결함 — 부르는 쪽이 서버 오류로).
 */
export async function readTalkState(
  db: DbOrTx,
  {
    sessionId,
    profileId,
    lock = false,
    at,
  }: { sessionId: string; profileId: string; lock?: boolean; at: Date },
): Promise<TalkState | undefined> {
  const base = db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.profileId, profileId),
        eq(sessions.area, "talk"),
      ),
    );
  const [session] = lock ? await base.for("update") : await base;
  if (!session?.lessonId || session.level === null || session.unit === null)
    return undefined;
  const [lessonRow] = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, session.lessonId));
  if (!lessonRow) return undefined;
  const lesson = LESSON_SCHEMAS.talk.parse(lessonRow.content);
  const card = lesson.card;
  const level = session.level;
  const unit = session.unit;

  const specRow = await readLevelSpec(
    {
      area: "talk",
      level,
      startRevision: session.seedRevision ?? lessonRow.revision,
    },
    { db },
  );
  const spec = TalkLevelSpecSchema.parse(specRow?.spec);

  const values = await getSettings(stateSettingSchemas, { db, profileId });
  const flowSettings = talkFlowSettingsFrom((key) => values[key]);
  const practiceRounds = positiveInt(values, "talk.practice_rounds");
  const timezone = values["app.timezone"] as string;
  const dayStartHour = values["app.day_start_hour"] as number;
  const learningDay = learningDayOf(at, timezone, dayStartHour);

  const rows = sortTurns(
    await db.select().from(talkTurns).where(eq(talkTurns.sessionId, sessionId)),
  );
  const { live, orphan } = splitOrphan(rows);
  const tried = await db
    .select({ input: attempts.input })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId));
  let start: TalkStart | null = null;
  for (const t of tried) {
    const input = parseTalkAttemptInput(t.input);
    if (input?.kind === "talk-start")
      start = {
        shownWords: input.shownWords,
        metBefore: input.metBefore,
        practiceOrder: input.practiceOrder,
      };
  }
  const follows = followDoneOf(tried.map((t) => t.input));

  const [round] = await db
    .select({ snapshot: unitProgress.settingsSnapshot })
    .from(unitProgress)
    .where(
      and(
        eq(unitProgress.profileId, profileId),
        eq(unitProgress.area, "talk"),
        eq(unitProgress.level, level),
        eq(unitProgress.unit, unit),
      ),
    )
    .orderBy(desc(unitProgress.round))
    .limit(1);
  const snapshot = (round?.snapshot ?? {}) as Record<string, unknown>;

  const lemmaEntries = await lemmaEntriesOf(db, lesson.unitWords);
  const practiceItems = practiceItemsOf({ spec, card });
  const todayCount = start?.shownWords.length ?? card.todayWords.length;
  const flow = talkFlowOf({
    spec,
    todayWordCount: todayCount,
    practiceCount: practiceItems.length,
  });
  const segment: TalkSegment = session.talkSegment ?? "greeting";
  const position = talkPositionOf({
    spec,
    card,
    metBefore: start?.metBefore ?? [],
    turns: live.map((row) => liteOf(row, { card, spec })),
    segment,
    ...(() => {
      const follow = followOf(segment, follows, {
        today: todayCount,
        practice: practiceItems.length * practiceRounds,
      });
      return follow ? { follow } : {};
    })(),
    settings: flowSettings,
  });
  return {
    profileId,
    session,
    lessonRow,
    lesson,
    card,
    spec,
    level,
    unit,
    segment,
    flow,
    flowSettings,
    practiceRounds,
    start,
    rows,
    liveRows: live,
    orphan,
    position,
    follows,
    lemmaOf: lemmaLookup(lemmaEntries),
    lemmaEntries,
    snapshot,
    learningDay,
    timezone,
    dayStartHour,
  };
}

/** 같은 상태에서 턴 행만 바꾼 자리(아이 행 · 토리 행을 더해 본 자리). */
export function positionWith(
  state: Pick<
    TalkState,
    "spec" | "card" | "start" | "flowSettings" | "segment"
  >,
  turns: readonly TalkTurnLite[],
  segment: TalkSegment = state.segment,
): TalkPosition {
  return talkPositionOf({
    spec: state.spec,
    card: state.card,
    metBefore: state.start?.metBefore ?? [],
    turns,
    segment,
    settings: state.flowSettings,
  });
}

export function liveLites(
  state: Pick<TalkState, "liveRows" | "card" | "spec">,
): TalkTurnLite[] {
  return state.liveRows.map((row) =>
    liteOf(row, { card: state.card, spec: state.spec }),
  );
}

/** 단원 복사본의 수(12절 머리). 없으면 던진다. */
export function snapshotNumber(
  state: Pick<TalkState, "snapshot">,
  key: string,
) {
  const value = state.snapshot[key];
  if (typeof value !== "number")
    throw new Error(`단원 복사본에 ${key} 가 없다`);
  return value;
}

// ── 회화 턴 입력(6.1 · 6.2 · AC-15k) ─────────────────────────────

/** 지난 대화 요약: 그 세션이 시작되기 전에 남은 것 최근 n 개(대화 시작 때 고정 — 저장 없이 같은 값, 6.1 · B4-07). */
export async function summariesBefore(
  db: DbOrTx,
  {
    profileId,
    before,
    limit,
  }: { profileId: string; before: Date; limit: number },
): Promise<string[]> {
  const rows = await db
    .select({ summary: talkSummaries.summary })
    .from(talkSummaries)
    .where(
      and(
        eq(talkSummaries.profileId, profileId),
        lt(talkSummaries.recordedAt, before),
      ),
    )
    .orderBy(desc(talkSummaries.recordedAt))
    .limit(limit);
  return rows.map((r) => r.summary).reverse();
}

/** 앞 턴 짝: 아이 행 n 의 보낸 사용자 메시지 전문 + 토리 행 n+1 의 다시 쓸 토리 차례(글자 그대로, 6.1). */
export function historyOf(
  rows: readonly TalkTurnRow[],
  beforeTurnNo?: number,
): TalkHistoryEntry[] {
  const out: TalkHistoryEntry[] = [];
  for (const child of rows) {
    if (child.speaker !== "child" || child.sentUserMessage === null) continue;
    if (beforeTurnNo !== undefined && child.turnNo >= beforeTurnNo) continue;
    const tori = rows.find(
      (r) => r.speaker === "tori" && r.turnNo === child.turnNo + 1,
    );
    if (!tori || tori.toriRewrite === null) continue;
    out.push({ user: child.sentUserMessage, assistant: tori.toriRewrite });
  }
  return out;
}

/** 앱의 첫 말(토리 행 1 — 첫 사용자 메시지 앞머리, 6.1). */
export function openingLineOf(
  rows: readonly TalkTurnRow[],
): string | undefined {
  const first = rows.find((r) => r.speaker === "tori" && r.turnNo === 1);
  const text = first?.toriRewrite ?? first?.text;
  if (!text) return undefined;
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .join(" ");
}

/**
 * 첫 턴 · 값이 바뀐 턴에만 넣는 값(6.1 · B5-13). 만난 단어는 처음 스냅숏 + 오늘 쓸 말(대화 토막부터) + 그 자리까지의 토리 말에서
 * 찾은 단원 단어, 미션은 그 자리까지 토리 행의 미션 체크. 아직 '안다'가 아닌 단어 · 새 단어 · 친한 정도는 지금 값(대화 안에서
 * 바뀌어도 바뀐 턴으로 보지 않는다 — 보고 '정할 것').
 */
export function talkContextAt(
  state: Pick<TalkState, "start" | "lesson" | "lemmaOf">,
  {
    rows,
    inTalk,
    knownSay,
    friendship,
    unitWords,
  }: {
    rows: readonly TalkTurnRow[];
    inTalk: boolean;
    knownSay: ReadonlySet<string>;
    friendship: number;
    unitWords: readonly string[];
  },
): TalkTurnContext {
  const met = new Set(state.start?.metBefore ?? []);
  if (inTalk) for (const w of state.start?.shownWords ?? []) met.add(w);
  const missions = new Set<number>();
  for (const row of rows) {
    if (row.speaker !== "tori") continue;
    for (const w of metWordsIn(row.text ?? "", {
      unitWords,
      lemmaOf: state.lemmaOf,
    }))
      met.add(w);
    if (Array.isArray(row.missionChecks))
      for (const n of row.missionChecks)
        if (Number.isInteger(n)) missions.add(n as number);
  }
  const unknownWords = unitWords.filter((w) => !knownSay.has(w));
  return {
    unknownWords,
    metUnknownWords: unknownWords.filter((w) => met.has(w)),
    newWords: [...state.lesson.newWords],
    friendship,
    missionsDone: [...missions].sort((a, b) => a - b),
  };
}

/** '말함' known 인 단원 단어(지금). */
export async function knownSayOf(
  db: DbOrTx,
  { profileId, words }: { profileId: string; words: readonly string[] },
): Promise<Set<string>> {
  if (words.length === 0) return new Set();
  const rows = await db
    .select({ word: vocab.word })
    .from(vocabProgress)
    .innerJoin(vocab, eq(vocab.id, vocabProgress.vocabId))
    .where(
      and(
        eq(vocabProgress.profileId, profileId),
        eq(vocabProgress.state, "say"),
        eq(vocabProgress.known, true),
        inArray(vocab.word, [...words]),
      ),
    );
  return new Set(rows.map((r) => r.word));
}

/** 그 프로필 회화 영역 행의 친한 정도(비었으면 0). */
export async function friendshipOf(
  db: DbOrTx,
  profileId: string,
): Promise<number> {
  const [track] = await db
    .select({ friendship: profileTracks.friendship })
    .from(profileTracks)
    .where(
      and(
        eq(profileTracks.profileId, profileId),
        eq(profileTracks.area, "talk"),
      ),
    );
  return track?.friendship ?? 0;
}

/**
 * 회화 턴 입력(a TalkTurnInput). 이번 턴 칸(바뀐 값)은 앞 아이 행 자리의 값과 견줘 바뀐 것만, 첫 턴이면 모두.
 * rowsBefore = 이번 아이 말 앞까지의 행(이번 아이 행 · 그 뒤 행 없음).
 */
export async function talkInputOf(
  db: DbOrTx,
  {
    state,
    ctx,
    rowsBefore,
    turn,
    summaryLimit,
  }: {
    state: TalkState;
    ctx: LevelContext;
    rowsBefore: readonly TalkTurnRow[];
    turn: Omit<TalkTurn, "context">;
    summaryLimit: number;
  },
): Promise<TalkTurnInput> {
  const unitWords = ctx.unitWords;
  const knownSay = await knownSayOf(db, {
    profileId: state.profileId,
    words: unitWords,
  });
  const friendship = await friendshipOf(db, state.profileId);
  const inTalkNow = turn.segment === "talk" || turn.segment === "more_talk";
  const now = talkContextAt(state, {
    rows: rowsBefore,
    inTalk: inTalkNow,
    knownSay,
    friendship,
    unitWords,
  });
  const prevChildIndex = rowsBefore.findLastIndex(
    (r) => r.speaker === "child" && r.sentUserMessage !== null,
  );
  const prevChild = rowsBefore[prevChildIndex];
  const prev = prevChild
    ? talkContextAt(state, {
        rows: rowsBefore.slice(0, prevChildIndex),
        inTalk:
          prevChild.segment === "talk" || prevChild.segment === "more_talk",
        knownSay,
        friendship,
        unitWords,
      })
    : null;
  const history = historyOf(rowsBefore);
  const summaries = await summariesBefore(db, {
    profileId: state.profileId,
    before: state.session.startedAt,
    limit: summaryLimit,
  });
  const opening = openingLineOf(state.rows);
  return {
    ...ctx,
    spec: state.spec,
    card: state.card,
    summaries,
    history,
    turn: { ...turn, context: talkContextDelta(prev, now) },
    ...(history.length === 0 && opening !== undefined
      ? { openingLine: opening }
      : {}),
    lemmaOf: state.lemmaOf,
  };
}

/** 검사를 지난 영어 글을 문장으로(다시 흘려 보낼 때). */
export function sentencesOf(aiPart: string): string[] {
  return splitSentences(aiPart)
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

// ── '말함' 행(5절 vocab_progress · 3.4) ──────────────────────────

/**
 * 만남 · '말했다'를 '말함' 행에 남긴다. 만남은 행이 없을 때만 넣고(first_area talk · met_areas · first_met_day), '말했다'는
 * said_days 에 학습일을 겹치지 않게 더해 서로 다른 학습일이 talk.known_days 이상이면 known. next_review_day 는 늘 비운다(AC-9b · P12).
 */
export async function writeSay(
  tx: DbOrTx,
  {
    profileId,
    met,
    said,
    day,
    knownDays,
  }: {
    profileId: string;
    met: readonly string[];
    said: readonly string[];
    day: string;
    knownDays: number;
  },
): Promise<void> {
  const words = [...new Set([...met, ...said])];
  if (words.length === 0) return;
  const vocabRows = await tx
    .select({ id: vocab.id, word: vocab.word })
    .from(vocab)
    .where(inArray(vocab.word, words));
  const idOf = new Map(vocabRows.map((v) => [v.word, v.id]));
  const ids = words.flatMap((w) => {
    const id = idOf.get(w);
    return id ? [id] : [];
  });
  if (ids.length === 0) return;
  await tx
    .insert(vocabProgress)
    .values(
      ids.map((vocabId) => ({
        profileId,
        vocabId,
        state: "say" as const,
        firstArea: "talk" as const,
        metAreas: ["talk" as const],
        firstMetDay: day,
        saidDays: [],
      })),
    )
    .onConflictDoNothing({
      target: [
        vocabProgress.profileId,
        vocabProgress.vocabId,
        vocabProgress.state,
      ],
    });
  const saidIds = said.flatMap((w) => {
    const id = idOf.get(w);
    return id ? [id] : [];
  });
  if (saidIds.length === 0) return;
  const existing = await tx
    .select({ id: vocabProgress.id, saidDays: vocabProgress.saidDays })
    .from(vocabProgress)
    .where(
      and(
        eq(vocabProgress.profileId, profileId),
        eq(vocabProgress.state, "say"),
        inArray(vocabProgress.vocabId, saidIds),
      ),
    );
  for (const row of existing) {
    const next = sayStateAfter({
      saidDays: row.saidDays ?? [],
      day,
      knownDays,
    });
    await tx
      .update(vocabProgress)
      .set({ saidDays: next.saidDays, known: next.known, nextReviewDay: null })
      .where(eq(vocabProgress.id, row.id));
  }
}

/** 그때 이미 만난 단원 단어(처음 스냅숏 — '말함' 행이 있는 것). */
export async function metSayOf(
  db: DbOrTx,
  { profileId, words }: { profileId: string; words: readonly string[] },
): Promise<string[]> {
  if (words.length === 0) return [];
  const rows = await db
    .select({ word: vocab.word, known: vocabProgress.known })
    .from(vocabProgress)
    .innerJoin(vocab, eq(vocab.id, vocabProgress.vocabId))
    .where(
      and(
        eq(vocabProgress.profileId, profileId),
        eq(vocabProgress.state, "say"),
        inArray(vocab.word, [...words]),
      ),
    );
  const met = new Set(rows.map((r) => r.word));
  return words.filter((w) => met.has(w));
}

// ── 세션이 끝나는 자리(5절 전이 · 3.2 · 회화 수업 모델 5) ─────────────

export type TalkSessionEnd = {
  sessionId: string;
  profileId: string;
  /** completed: 목표 턴 닿음. aborted: 그만하기(목표 턴 전) · 다른 수업 고르기 · 이어 하기 시간 지남. */
  ended: "completed" | "aborted";
};

/**
 * 회화 세션이 끝날 때(완료 · 중단 모두 — 3.2 '회화는 회화 세션이 끝날 때') 부르는 이음매. 지금은 빈 함수다 — P12 가 별 · 단원 통과
 * 판정을 이 트랜잭션에 붙인다(a 'P12 와 나누는 몫').
 */
export async function onTalkSessionEnded(
  _tx: DbOrTx,
  _end: TalkSessionEnd,
): Promise<void> {}

/**
 * 목표 턴에 닿은 턴(회화 수업 모델 5): 완료 · 완료 시각 · 학습일(C56 (1)), 다시 하기가 아니면 친한 정도(a friendshipAfter) →
 * profile_tracks(talk) friendship · 지금 구간 연 수 · 구간별 연 수(C98), 그다음 이음매.
 */
export async function reachTalkTarget(
  tx: DbOrTx,
  {
    state,
    at,
    rules,
  }: {
    state: Pick<TalkState, "session" | "profileId" | "level" | "learningDay">;
    at: Date;
    rules: { per: number; max: number };
  },
): Promise<void> {
  await tx
    .update(sessions)
    .set({
      status: "completed",
      completedAt: at,
      learningDay: state.learningDay,
    })
    .where(
      and(
        eq(sessions.id, state.session.id),
        eq(sessions.status, "in_progress"),
      ),
    );
  if (state.session.kind !== "retry") {
    const [track] = await tx
      .select({
        id: profileTracks.id,
        friendship: profileTracks.friendship,
        byBand: profileTracks.toriStoriesByBand,
      })
      .from(profileTracks)
      .where(
        and(
          eq(profileTracks.profileId, state.profileId),
          eq(profileTracks.area, "talk"),
        ),
      )
      .for("update");
    if (track) {
      const band = bandOf(state.level);
      const byBand = storiesByBandOf(track.byBand);
      const next = friendshipAfter(
        {
          friendship: track.friendship ?? 0,
          opened: byBand[band] ?? 0,
          storiesInBand: STORIES_PER_BAND,
          isRetry: false,
        },
        rules,
      );
      await tx
        .update(profileTracks)
        .set({
          friendship: next.friendship,
          toriStoriesOpened: next.opened,
          toriStoriesByBand: { ...byBand, [band]: next.opened },
        })
        .where(eq(profileTracks.id, track.id));
    }
  }
  await onTalkSessionEnded(tx, {
    sessionId: state.session.id,
    profileId: state.profileId,
    ended: "completed",
  });
}

/** profile_tracks.tori_stories_by_band(구간 → 연 수). 꼴이 틀린 칸은 버린다. */
export function storiesByBandOf(raw: unknown): Record<string, number> {
  const parsed = z.record(z.string(), z.int().min(0)).safeParse(raw);
  return parsed.success ? parsed.data : {};
}

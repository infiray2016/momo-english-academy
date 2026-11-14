import "server-only";
// 회화 세션 서버의 공용 바탕(plan-p13b 파일별 값 1 · 2 · 3 이 같이 쓴다 — a '회화 수업 모델' 4 · 5, 13절 C89 · C101).
// 세션 상태 읽기(세션 행 · 카드 · 단계 규격 · talk_turns · 처음 스냅숏 · 따라 말하기 시도 → a 의 talkPositionOf), 토리 행 가벼운 꼴의
// 네 칸 유도(a 보고 '요청 2'), 앱이 붙일 말 ↔ 흘려 보낼 줄, 회화 턴 입력 만들기, '말함' 행 쓰기(만남 · '말했다'), 목표 턴 닿음과
// 세션이 끝날 때의 이음매. AI 를 부르지 않는다. 시각은 인자로 받고 SQL 안에 now() 를 쓰지 않는다. 아이 글을 로그에 내지 않는다.
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import type { TalkHistoryEntry } from "@/core/ai/calls/talk-lesson";
import {
  type LessonFollowDone,
  lessonFollowDoneOf,
  parseTalkAttemptInput,
  prepWordsShownOf,
} from "@/core/conversation/attempt";
import type { TalkCarry } from "@/core/conversation/chances";
import { chatFlowRowsOf } from "@/core/conversation/chat-turn-core";
import type { HintTier } from "@/core/conversation/hints";
import {
  isChatSession,
  leadModeOf,
  TALK_LEAD_MODE_KEY,
  type TalkLeadMode,
} from "@/core/conversation/lead-mode";
import {
  type TalkLessonPosition,
  talkLessonPositionOf,
} from "@/core/conversation/lesson-flow";
import {
  TALK_CHAT_KEYS,
  type TalkInputMode,
  type TalkLessonSettings,
  type TalkLessonSpec,
  type TalkLessonTurn,
  talkLessonSettingsFrom,
} from "@/core/conversation/lesson-turns";
import { readTalkMove } from "@/core/conversation/move";
import { sayStateAfter } from "@/core/conversation/said";
import { toriKoShownOf } from "@/core/conversation/spoken";
import { learningDayOf } from "@/core/learning-day";
import { type TalkLesson, TalkLessonSchema } from "@/core/seed/schema/lesson";
import {
  type TalkLevelSpec,
  TalkLevelSpecSchema,
} from "@/core/seed/schema/reference";
import { type TalkCard, talkCardKindOf } from "@/core/seed/schema/talk";
import type { Teacher } from "@/core/seed/schema/teachers";
import { TALK_LOW_BAND, TALK_SEGMENTS } from "@/core/seed/structure";
import { lemmaLookup } from "@/core/session/attempt";
import { resolveTeacher } from "@/core/teacher/roster";
import { lessons, vocab } from "@/db/schema/content";
import {
  attempts,
  profiles,
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
import { rosterOf } from "@/server/teacher";

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

/** 대화가 열려 있는가(진행 · 또는 완료이고 정리 토막 전 — 목표 턴 뒤 '더 이야기하기', 회16). */
export function isTalkOpen(
  s: Pick<SessionRow, "status" | "talkSegment">,
): boolean {
  if (s.talkSegment === "wrap_up") return false;
  return s.status === "in_progress" || s.status === "completed";
}

// ── 설정 ─────────────────────────────────────────────────────────

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

/** 회화 토막(sessions.talk_segment 가운데 새 흐름이 쓰는 값 — DB 열거에 남은 옛 흐름 토막 값 둘은 쓰지 않는다, 정한 것 8). */
export type TalkSegment = (typeof TALK_SEGMENTS)[number];

/**
 * DB 토막 값 → 새 흐름 토막(비었으면 인사). 옛 흐름 값(오늘 쓸 말 · 말해 보기 토막)은 새 꼴 세션에 들지 않으므로 던진다(조용히 바꾸지 않음).
 */
export function talkSegmentOf(value: SessionRow["talkSegment"]): TalkSegment {
  const segment = value ?? "greeting";
  if (!(TALK_SEGMENTS as readonly string[]).includes(segment))
    throw new Error(`새 흐름에 없는 회화 토막 값이다(${segment})`);
  return segment as TalkSegment;
}

const AiQuestionSchema = z.object({
  en: z.string().min(1),
  ko: z.string(),
  answerExample: z.string(),
  hintKo: z.string().optional(),
  hints: z.array(z.string()).optional(),
});

/** 선생님 행 ai_question 칸(이 차례 AI 질문 — 답 예시를 읽는다, C101). 꼴이 틀리면 null. */
export function aiQuestionOf(
  raw: unknown,
): z.infer<typeof AiQuestionSchema> | null {
  const parsed = AiQuestionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
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

type ReadTalkArgs = {
  sessionId: string;
  profileId: string;
  lock?: boolean;
  at: Date;
};
type TalkBase = {
  session: SessionRow & { level: number; unit: number };
  lessonRow: LessonRow;
  /** 카드 꼴(talkCardKindOf — 새 꼴 · 옛 꼴 · 틀림). */
  kind: ReturnType<typeof talkCardKindOf>;
};

/** 세션 행(lock 이면 FOR UPDATE)과 수업 행 · 카드 꼴. 회화가 아니거나 남의 세션 · 수업 행이 없으면 undefined. */
async function readTalkBase(
  db: DbOrTx,
  { sessionId, profileId, lock = false }: ReadTalkArgs,
): Promise<TalkBase | undefined> {
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
  const content = lessonRow.content as { card?: unknown } | null;
  return {
    session: { ...session, level: session.level, unit: session.unit },
    lessonRow,
    kind: talkCardKindOf(content?.card),
  };
}

/**
 * 회화 세션 상태 — 카드 꼴로 가른다(회화 plan 정한 것 1 · 2): 새 꼴 카드는 상태, 옛 꼴 카드(C189 앞 — 개발 DB 의 옛 개정 행)는 세션 행만
 * (부르는 쪽이 끝맺음 없이 닫거나 건너뛴다).
 */
export type TalkAnyState =
  | { kind: "old"; session: TalkBase["session"] }
  | { kind: "new"; state: TalkLessonState };

/**
 * 그 프로필의 회화 세션 상태를 카드 꼴로 갈라 읽는다(회화 plan 묶음 7 · 12). lock 이면 세션 행을 FOR UPDATE 로 잡는다. 회화가 아니거나
 * 남의 세션이면 undefined. 카드 · 규격이 깨졌으면 던진다(시드 결함).
 */
export async function readTalkAnyState(
  db: DbOrTx,
  args: ReadTalkArgs,
): Promise<TalkAnyState | undefined> {
  const base = await readTalkBase(db, args);
  if (!base) return undefined;
  if (base.kind === "old") return { kind: "old", session: base.session };
  if (base.kind !== "new")
    throw new Error("회화 카드가 새 꼴 규격에 맞지 않는다(시드 결함)");
  return { kind: "new", state: await lessonStateOf(db, base, args) };
}

/** 새 꼴 카드 회화 세션 상태. 옛 꼴 · 틀린 카드 세션이면 던진다. 회화가 아니거나 남의 세션이면 undefined. */
export async function readTalkLessonState(
  db: DbOrTx,
  args: ReadTalkArgs,
): Promise<TalkLessonState | undefined> {
  const base = await readTalkBase(db, args);
  if (!base) return undefined;
  if (base.kind !== "new")
    throw new Error("새 꼴 회화 카드가 아닌 세션은 읽지 않는다(정한 것 2)");
  return lessonStateOf(db, base, args);
}

/** 단원 복사본의 수(12절 머리). 없으면 던진다. */
export function snapshotNumber(
  state: Pick<TalkLessonState, "snapshot">,
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

/** profile_tracks.tori_stories_by_band(구간 → 연 수). 꼴이 틀린 칸은 버린다. */
export function storiesByBandOf(raw: unknown): Record<string, number> {
  const parsed = z.record(z.string(), z.int().min(0)).safeParse(raw);
  return parsed.success ? parsed.data : {};
}

// ── 새 갈래(C189 새 꼴 카드, 회화 plan 묶음 7) ─────────────────────

/** 새 갈래 처음 스냅숏(talk-start): 만난 단원 단어 · 짧은 준비 계획 · 이월 · 선생님 키. */
export type TalkLessonStart = {
  metBefore: string[];
  /** 세션 시작 때 정한 짧은 준비 낱말 계획(실제로 보인 낱말은 TalkLessonState.prepWords). */
  prepPlan: string[];
  carry: TalkCarry;
  /**
   * 회화 방식(회화 Claude 주도 묶음 M): 처음 스냅숏의 leadMode 를 leadModeOf 로 읽은 값(칸 없는 옛 스냅숏 · 모르는 값은 app). 세션 도중
   * 설정이 바뀌어도 이 값이다. 상태 읽기는 늘 채우고, 비어 있으면(시험 재료 등) app 으로 읽는다(leadModeOf(start)).
   */
  leadMode?: TalkLeadMode;
};

export type TalkLessonState = {
  profileId: string;
  session: SessionRow & { level: number; unit: number };
  lessonRow: LessonRow;
  lesson: TalkLesson;
  card: TalkCard;
  /** 단계 규격 행 그대로(choices · koExplainFromStuck 는 필수 칸 — 묶음 12, 흐름은 band · targetTurns · koMeaning 을 읽는다). */
  spec: TalkLevelSpec;
  level: number;
  unit: number;
  /** 지금 토막(sessions.talk_segment — 비었으면 인사). */
  segment: TalkSegment;
  settings: TalkLessonSettings;
  /** talk.nospeech_dontknow_count — 같은 질문 자리에서 말소리 없는 듣기가 이만큼이면 들리지 않음으로 보낸다(서버 턴 길). */
  nospeechDontknowCount: number;
  start: TalkLessonStart | null;
  teacher: Teacher | null;
  rows: TalkTurnRow[];
  liveRows: TalkTurnRow[];
  orphan: TalkTurnRow | null;
  /** liveRows 의 흐름 꼴(move 읽기). */
  turns: TalkLessonTurn[];
  /**
   * 흐름 입력 prepWords: 인사 뒤 준비 토막에서 쪽지로 보인 낱말 전부(건너뛴 낱말 포함) — talk-prep 시도(자리 greeting)로 되짚는다.
   * 처음 스냅숏의 계획(start.prepPlan)이 아니다(묶음 5 검토 I-2).
   */
  prepWords: string[];
  follows: LessonFollowDone;
  /** 지금 자리(lesson-flow talkLessonPositionOf, turns). */
  position: TalkLessonPosition;
  lemmaOf: (surface: string) => string | undefined;
  lemmaEntries: { word: string; forms: string[] }[];
  snapshot: Record<string, unknown>;
  learningDay: string;
  timezone: string;
  dayStartHour: number;
};

/** 새 갈래가 읽는 회화 설정(구간 키는 그 단계 구간 값). lesson-turns talkLessonSettingsFrom 과 같은 키다. */
const LESSON_STATE_KEYS = [
  "talk.dontknow_max",
  "talk.floor_after_stuck",
  "talk.follow_child_turns",
  "talk.same_question_max",
  "talk.required_gap_turns",
  "talk.prep_offer_stuck",
  "talk.more_talk_round_turns",
  "talk.reask_per_word",
  "talk.ask_again_max",
  "talk.nospeech_dontknow_count",
  "speech.silent_items_max",
  // 회화 방식(회화 Claude 주도 묶음 M) — 처음 열 때 스냅숏에 적는 값. 빠진 DB 는 다른 키처럼 SettingMissingError 로 드러난다
  TALK_LEAD_MODE_KEY,
  // 이야기 방식 talk.chat_*(이야기 방식 묶음 C — 세 방식 모두 늘 읽는다, 코드 배포 전에 개발 DB 에 적재)
  ...Object.values(TALK_CHAT_KEYS),
];
const LESSON_BAND_KEYS = ["talk.prep_words", "talk.prep_mode"] as const;

/** 수업 상태가 읽는 회화 설정 키(구간 키는 그 단계 구간 값 — 시험이 목록을 본다). */
export function lessonStateKeysOf(band: string): string[] {
  return [
    ...LESSON_STATE_KEYS,
    ...LESSON_BAND_KEYS.map((key) => `${key}.${band}`),
  ];
}

function lessonSettingSchemas(band: string): Record<string, z.ZodType> {
  return {
    ...Object.fromEntries(
      lessonStateKeysOf(band).map((key) => [key, z.unknown()]),
    ),
    "app.timezone": appTimezoneSchema,
    "app.day_start_hour": appDayStartHourSchema,
  };
}

const ClientListenSrcSchema = z.object({ src: z.enum(["button", "nospeech"]) });

/**
 * 아이 행의 입력 방식(talk_turns.input_mode)을 흐름이 읽는 두 값으로 좁힌다. 빈 옛 행은 말(speech)이다. quiet(이야기 방식의 조용함 입구 행)는 아이의
 * 답이 아니라 말한 차례로 세면 참여 완료 · 참고 턴의 셈이 틀어지므로 speech 로 읽지 않고 던진다. 기존 방식 · 지금 새 방식 수업에는 quiet 행이 생기지
 * 않는다(turn.ts 의 아이 말 요청 꼴이 두 값만 받음). 이야기 방식 수업은 흐름 꼴로 바꾸기 전 한 자리(lessonFlowTurnsOf)에서 quiet 행을 거르므로, 이 던짐은
 * 그 거름을 빠뜨린 자리를 잡는 안전망으로 남긴다(묶음 S1). 대화 기록 · 이어하기 · 다시 보내기의 quiet 행 읽기는 묶음 S2 의 몫이다.
 */
export function childInputModeOf(
  mode: TalkTurnRow["inputMode"],
): TalkInputMode {
  if (mode === null) return "speech";
  if (mode === "quiet")
    throw new Error("아이 행 입력 방식 quiet 는 흐름이 읽는 두 값이 아니다");
  return mode;
}

/**
 * talk_turns 행 → 새 흐름의 가벼운 꼴(lesson-turns TalkLessonTurn). 아이 행: 토막(인사 · 더 이야기하기 · 그 밖은 대화) · 입력 방식(빈 옛 행은 말) ·
 * 막힘 말 · 들리지 않음(client_listen 출처 nospeech, C149) · 노린 단어 · 되물음 표지(ask_again 참인 행만 칸을 둔다, C218). 선생님 행: 화면 글
 * 줄(text, 정한 것 5) · move(readTalkMove — 비었거나 꼴이 틀리면 null) · 이 차례 AI 질문의 답 예시(C101).
 */
export function lessonTurnOf(row: TalkTurnRow): TalkLessonTurn {
  if (row.speaker === "child") {
    const src = ClientListenSrcSchema.safeParse(row.clientListen);
    return {
      speaker: "child",
      segment:
        row.segment === "more_talk"
          ? "more_talk"
          : row.segment === "greeting"
            ? "greeting"
            : "talk",
      input: childInputModeOf(row.inputMode),
      stuck: row.stuckPhrase !== null,
      nospeech: src.success && src.data.src === "nospeech",
      targets: [...(row.targetWords ?? [])],
      ...(row.askAgain === true ? { askAgain: true } : {}),
    };
  }
  const answer = aiQuestionOf(row.aiQuestion)?.answerExample;
  return {
    speaker: "teacher",
    text: row.text ?? "",
    move: readTalkMove(row.move),
    answerExample: answer === undefined || answer === "" ? null : answer,
  };
}

/**
 * 살아 있는 행 → 흐름 꼴(위치 되짚기 · 참여 판정의 입력). 이야기 방식 수업(isChatSession — 처음 스냅숏 · 단계)은 행을 흐름 꼴로 바꾸기 전 이 한 자리에서
 * quiet 행을 거른다(묶음 P3 chatFlowRowsOf, spec 설계 6 · 보완 4 (1) — quiet 행은 아이의 답이 아님). 거르지 않은 행(state.rows · liveRows)은 잇달아 말한
 * 수 · 안전 상한 · 조용함 입구를 받을지 · 끝맺음 턴의 입력만 읽는다. 기존 두 방식은 거르지 않으므로 quiet 행이 있으면 lessonTurnOf 의
 * childInputModeOf 가 던진다(빠뜨린 자리를 잡는 안전망 — 그 수업에는 quiet 행이 생기지 않는다).
 */
export function lessonFlowTurnsOf(
  live: readonly TalkTurnRow[],
  session: Parameters<typeof isChatSession>[0],
): TalkLessonTurn[] {
  return (isChatSession(session) ? chatFlowRowsOf(live) : live).map(
    lessonTurnOf,
  );
}

/**
 * 옛 규칙 — 쓰지 않음(13절 C202 (5) 뒤, 검토 rev-night-2 M-7). 회화 턴 끝 처리는 이제 lesson-turn.ts 에서 문장마다의 뜻으로 toriKoShownOf 를
 * 바로 부른다(빠진 문장의 뜻만 뺌). 아래는 옛 정한 것 9 의 저장 조건(1~3단계는 선생님 문장이 하나라도 빠지면 뜻 전체를 저장하지 않음)을
 * 한 글 꼴로 남긴 것이며 부르는 곳이 없다. 다음 정리 때 지운다.
 */
export function lessonToriKoOf({
  ko,
  spec,
  sent,
  shown,
}: {
  ko: string | null;
  spec: Pick<TalkLessonSpec, "band" | "koMeaning">;
  sent: readonly string[];
  shown: readonly string[];
}): string | null {
  if (!spec.koMeaning || ko === null || ko === "") return null;
  return toriKoShownOf({
    ko,
    sent,
    shown,
    lowBand: spec.band === TALK_LOW_BAND,
  });
}

/** 새 갈래 상태(새 꼴 카드): 카드 · 단계 규격 · 설정 · talk_turns(move 읽기) · 처음 스냅숏 · 짧은 준비 시도 → talkLessonPositionOf. */
async function lessonStateOf(
  db: DbOrTx,
  { session, lessonRow }: TalkBase,
  { sessionId, profileId, at }: ReadTalkArgs,
): Promise<TalkLessonState> {
  const lesson = TalkLessonSchema.parse(lessonRow.content);
  const card = lesson.card;
  const { level, unit } = session;
  const specRow = await readLevelSpec(
    {
      area: "talk",
      level,
      startRevision: session.seedRevision ?? lessonRow.revision,
    },
    { db },
  );
  const spec = TalkLevelSpecSchema.parse(specRow?.spec);
  const values = await getSettings(lessonSettingSchemas(spec.band), {
    db,
    profileId,
  });
  const settings = talkLessonSettingsFrom((key) => values[key], spec.band);
  const nospeechDontknowCount = positiveInt(
    values,
    "talk.nospeech_dontknow_count",
  );
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
  const inputs = tried.map((t) => t.input);
  let start: TalkLessonStart | null = null;
  let startTeacherKey: string | undefined;
  for (const raw of inputs) {
    const input = parseTalkAttemptInput(raw);
    if (input?.kind !== "talk-start") continue;
    start = {
      metBefore: input.metBefore,
      prepPlan: input.prepWords ?? [],
      carry: input.carry ?? { goals: [], words: [] },
      leadMode: leadModeOf(input),
    };
    startTeacherKey = input.teacherKey;
  }
  const [chosen] = await db
    .select({ teacherKey: profiles.teacherKey })
    .from(profiles)
    .where(eq(profiles.id, profileId));
  const teacher =
    resolveTeacher(rosterOf(), startTeacherKey, chosen?.teacherKey) ?? null;
  const follows = lessonFollowDoneOf(inputs);
  const prepWords = prepWordsShownOf(inputs);

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
  const segment = talkSegmentOf(session.talkSegment);
  const turns = lessonFlowTurnsOf(live, { start, level });
  const position = talkLessonPositionOf({
    spec,
    card,
    newWords: lesson.newWords,
    turns,
    segment,
    settings,
    ...(start ? { carry: start.carry } : {}),
    prepWords,
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
    settings,
    nospeechDontknowCount,
    start,
    teacher,
    rows,
    liveRows: live,
    orphan,
    turns,
    prepWords,
    follows,
    position,
    lemmaOf: lemmaLookup(lemmaEntries),
    lemmaEntries,
    snapshot,
    learningDay,
    timezone,
    dayStartHour,
  };
}

// 회화 세션 서버 통합 시험의 공용 바탕(plan-p13b 작업 2 — conversation-session · conversation-turn 이 같이 쓴다).
// 시험용 시드(작은 틀 · 1단계)를 넣고 시드 완전성 끝을 12단계로 올린 뒤, 회화 1단계 · 4단계 단원 1 정규 카드(견본 빌더 talkUnitCards —
// 같은 시드 나무의 규격)를 수업 행으로 더한다(쓰기 6단계 첨삭 시험과 같은 길). AI 는 가짜 Anthropic(fetch 주입, SSE 'stream' 응답)만 쓴다.
// 응답 뒤 할 일(after)은 모아 두었다가 시험이 돌린다. 시각은 고정 시계 하나. 아이 이름 · 연락처는 지어낸 값(앱 안 이름 Momo)이다.
import { and, eq, inArray, isNull, max } from "drizzle-orm";
import type { TalkOutput } from "@/core/ai/calls/talk";
import type { StageTimings } from "@/core/conversation/timing";
import { AVATARS, TOPIC_BUNDLES } from "@/core/profile/start";
import { LESSON_SCHEMAS } from "@/core/seed/schema/lesson";
import type { TalkCard } from "@/core/seed/schema/talk";
import { LEVEL_MAX } from "@/core/seed/structure";
import { lessons } from "@/db/schema/content";
import { profiles, sessions, talkTurns } from "@/db/schema/learning";
import {
  aiCalls,
  parentAlerts,
  parentAuth,
  settings,
} from "@/db/schema/operations";
import { SEED_REVISION_TABLES } from "@/db/schema/seed-revision";
import { createAnthropicClient } from "@/server/ai/client";
import {
  advanceTalk,
  loadTalkView,
  type TalkLine,
  type TalkServerDeps,
  type TalkView,
} from "@/server/conversation";
import { runTalkTurnRequest } from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import { readHouseholdProfile, saveFirstRun } from "@/server/profile";
import { loadSeed } from "@/server/seed/load";
import { startLessonSession } from "@/server/session";
import {
  createFakeAnthropic,
  type FakeRule,
  messageBody,
} from "../fixtures/ai/fake-anthropic";
import { talkUnitCards } from "../fixtures/seed/builders";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import { TEST_SETTINGS } from "../fixtures/settings";
import { createTestDatabase, seedSettings, type TestDatabase } from "./test-db";

export const LOADED_AT = new Date("2026-10-20T10:00:00+09:00");
export const SAVED_AT = new Date("2026-10-20T11:00:00+09:00");
/** 시험의 지금(학습일 2026-10-22). */
export const NOW = new Date("2026-10-22T19:00:00+09:00");
/** 다음 학습일(session.resume_hours 안 — 진행 세션이 닫히지 않는다). */
export const NEXT_DAY = new Date("2026-10-23T15:00:00+09:00");
export const MS_PER_MINUTE = 60_000;
/** 시험 집의 영어 이름 · 한글 이름(첫 실행 값). */
export const ENGLISH_NAME = "Momo";
export const DISPLAY_NAME = "모모";
/** 1~3 구간 회화 턴 모델(시험 설정 — C112 뒤 Sonnet). 가짜 응답의 모델 칸 기본값. */
export const LOW_MODEL = TEST_SETTINGS["ai.model.talk_turn.1-3"].value;
/** Haiku 5.5 — 설정으로 1~3 구간을 Haiku 로 고른 시험(거절 뒤 Sonnet 재시도 길). */
export const HAIKU = "claude-haiku-5-5";
export const SONNET = TEST_SETTINGS["ai.model.talk_turn.4-6"].value;
/** 회화 턴 · 끝맺음 턴 요청을 가르는 사용자 메시지 줄(JSON 본문 안 — 고정부의 'Closing: yes' 설명과 겹치지 않게 줄바꿈부터). */
export const TURN_MARK = "\\nClosing: no";
export const CLOSING_MARK = "\\nClosing: yes";
const THROUGH_KEY = "seed.complete_through_level";
const UNIT = 1;
const VARIANT = 1;

export type TalkDb = { testDb: TestDatabase; db: Db };

/**
 * 시험 DB · 시드 · 회화 수업 행(1 · 4단계 단원 1). 시험용 시드가 회화 1단계를 이미 넣으므로(같은 견본 빌더 · 같은 칸) 겹치는 칸은 그대로
 * 둔다(onConflictDoNothing — 개발용 시드 회화, task-p13-dev-seed-talk).
 */
export async function setupTalkDb(): Promise<TalkDb> {
  const testDb = await createTestDatabase();
  const db = testDb.db;
  const tree = devSeedTree();
  const report = await loadSeed(db, {
    files: filesOf(tree),
    completeThrough: DEV_SEED_THROUGH,
    areas: [...DEV_SEED_AREAS],
    now: LOADED_AT,
  });
  if (report.outcome !== "loaded") throw new Error("시험 시드 적재 실패");
  await db
    .update(settings)
    .set({ value: LEVEL_MAX })
    .where(and(eq(settings.key, THROUGH_KEY), isNull(settings.profileId)));
  let revision = 0;
  for (const table of SEED_REVISION_TABLES) {
    const [row] = await db.select({ r: max(table.revision) }).from(table);
    revision = Math.max(revision, Number(row?.r ?? 0));
  }
  for (const level of [1, 4]) {
    for (const card of talkUnitCards(tree.reference, level, UNIT, VARIANT)) {
      await db
        .insert(lessons)
        .values({
          area: "talk",
          level,
          unit: UNIT,
          kind: card.kind,
          lessonNo: card.lessonNo,
          topicVariant: card.variant,
          listTitle: card.title,
          content: { ...card, revision, correction: 0 },
          newWords: [...card.newWords],
          unitWords: [...card.unitWords],
          generation: card.generation,
          revision,
          correction: 0,
        })
        .onConflictDoNothing();
    }
  }
  return { testDb, db };
}

/**
 * 집을 비우고 첫 실행(회화 그 단계 · 단원 1). 회화 선생님은 기본 미나다 — 선생님이 없으면 처음 스냅숏 · 토리 행 1 을 미루므로(선생님 화면
 * plan 값 7) 고르는 길을 보는 시험만 null 을 넘긴다.
 */
export async function resetHousehold(
  db: Db,
  level = 1,
  teacherKey: string | null = "mina",
): Promise<string> {
  await db.delete(profiles);
  await db.delete(parentAuth);
  await db.delete(parentAlerts);
  await db.delete(aiCalls);
  const saved = await saveFirstRun(
    {
      pin: "246813",
      displayName: DISPLAY_NAME,
      englishName: ENGLISH_NAME,
      avatar: AVATARS[0].id,
      topicBundle: TOPIC_BUNDLES[0].id,
      alphabetUnknown: false,
      startLevels: { talk: level },
      mic: { result: "not_checked" },
    },
    { db, now: () => SAVED_AT },
  );
  if (!saved.ok) throw new Error("첫 실행 저장 실패");
  const profile = await readHouseholdProfile({ db });
  if (!profile) throw new Error("프로필 없음");
  if (teacherKey !== null)
    await db
      .update(profiles)
      .set({ teacherKey })
      .where(eq(profiles.id, profile.id));
  return profile.id;
}

/** 회화 수업 행(그 단계 단원 1 · 정규(배정 · 다지기) · 수업 번호 — 시험용 시드의 보강 수업은 고르지 않는다). */
export async function talkLessonRow(db: Db, level: number, lessonNo = 1) {
  const [row] = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "talk"),
        eq(lessons.level, level),
        eq(lessons.unit, UNIT),
        eq(lessons.lessonNo, lessonNo),
        inArray(lessons.kind, ["assigned", "reinforce"]),
      ),
    );
  if (!row) throw new Error(`회화 수업 행 없음: ${level} ${lessonNo}`);
  return row;
}

/** 수업 행의 카드. */
export function cardOf(row: { content: unknown }): TalkCard {
  return LESSON_SCHEMAS.talk.parse(row.content).card;
}

// ── 가짜 AI · 의존 ───────────────────────────────────────────────

export type TalkHarness = {
  db: Db;
  fake: ReturnType<typeof createFakeAnthropic>;
  /** 응답 뒤 할 일(끝맺음 턴). */
  tasks: (() => Promise<void>)[];
  clock: { now: Date };
  deps(): TalkServerDeps;
  runTasks(): Promise<void>;
};

export function harnessOf(db: Db): TalkHarness {
  const fake = createFakeAnthropic();
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "test-key" },
    fetch: fake.fetch,
  });
  const tasks: (() => Promise<void>)[] = [];
  const clock = { now: NOW };
  return {
    db,
    fake,
    tasks,
    clock,
    deps: () => ({
      db,
      now: () => clock.now,
      homophones: () => [],
      ai: { client: () => client, clock: () => clock.now },
      schedule: (task) => {
        tasks.push(task);
      },
    }),
    async runTasks() {
      while (tasks.length > 0) await tasks.shift()?.();
    },
  };
}

/** 가짜 응답 JSON 글에서 tori_en 글이 시작되기 전 앞머리(stuck 거짓 · C127 차례) — 글자 수로 끊는 시험이 끊을 자리를 센다. */
export const TORI_EN_LEAD = '{"stuck":false,"tori_en":"';
/** tori_en 글의 이 앞부분까지 받고 끊는 글자 자리. */
export const cutAfter = (toriPrefix: string) =>
  TORI_EN_LEAD.length + toriPrefix.length;

/** 회화 턴 응답 칸(빈 값 + 덮어쓴 칸, stuck · tori_en 먼저 — C127). */
export function answer(over: Partial<TalkOutput> = {}): TalkOutput {
  return {
    stuck: false,
    tori_en: "Nice!",
    tori_ko: "좋아!",
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    card_question_no: 0,
    next_question_en: "",
    next_question_ko: "",
    next_hint_ko: "",
    next_hints: [],
    next_usable_phrases: [],
    next_targets: [],
    next_answer_example: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
}

type StreamOptions = {
  model?: string;
  times?: number;
  chunks?: number;
  delayMs?: number;
  cutAfterChars?: number;
};

/** 회화 턴 한 번(가짜 SSE). */
export function turnRule(
  over: Partial<TalkOutput> = {},
  opts: StreamOptions = {},
): FakeRule {
  return {
    when: { bodyIncludes: TURN_MARK },
    reply: {
      kind: "stream",
      body: messageBody({ model: opts.model ?? LOW_MODEL, json: answer(over) }),
      chunks: opts.chunks ?? 4,
      ...(opts.delayMs === undefined ? {} : { delayMs: opts.delayMs }),
      ...(opts.cutAfterChars === undefined
        ? {}
        : { cutAfterChars: opts.cutAfterChars }),
    },
    times: opts.times ?? 1,
  };
}

/** 회화 턴 거절(모델마다 — Haiku 거절 뒤 Sonnet 한 번까지 거절). */
export function refusalRule(): FakeRule {
  return {
    when: { bodyIncludes: TURN_MARK },
    reply: {
      kind: "stream",
      body: messageBody({
        model: HAIKU,
        json: answer({ tori_en: "" }),
        stopReason: "refusal",
        stopDetails: { category: "cyber", explanation: null },
      }),
    },
  };
}

/** 끝맺음 턴(같은 대화 · 끝맺음 칸). */
export function closingRule(
  over: Partial<TalkOutput> = {},
  opts: StreamOptions = {},
): FakeRule {
  return {
    when: { bodyIncludes: CLOSING_MARK },
    reply: {
      kind: "stream",
      body: messageBody({
        model: opts.model ?? LOW_MODEL,
        json: answer({
          tori_en: "",
          tori_ko: "",
          farewell: "Bye bye!",
          farewell_ko: "안녕!",
          summary: "사과 이야기를 했어요.",
          ...over,
        }),
      }),
      chunks: opts.chunks ?? 2,
      ...(opts.delayMs === undefined ? {} : { delayMs: opts.delayMs }),
    },
    ...(opts.times === undefined ? {} : { times: opts.times }),
  };
}

/** 가짜에 들어온 회화 턴 · 끝맺음 요청 수. */
export function requestsOf(h: TalkHarness, mark: string): number {
  return h.fake.requests.filter((r) => r.bodyText.includes(mark)).length;
}

// ── 화면 흉내 ─────────────────────────────────────────────────────

let attemptSeq = 0;

export type SayOptions = {
  text?: string;
  mode?: "speech" | "dont_know";
  hint?: {
    opened: number;
    heard: ("two_answers" | "answer_example")[];
  };
  clientAttemptId?: string;
  prevPerceivedWaitMs?: number;
  /** AI 를 부르기 전 구간마다 준비 시간(C125 (4)). */
  onPrepTimings?: (timings: StageTimings) => void;
};

/** 아이 말 하나(Route Handler 가 부르는 턴 길 — 줄을 모은다). */
export async function say(
  h: TalkHarness,
  sessionId: string,
  opts: SayOptions = {},
): Promise<{ lines: TalkLine[]; last: TalkLine | undefined; id: string }> {
  attemptSeq += 1;
  const id = opts.clientAttemptId ?? `talk-turn-${attemptSeq}`;
  const mode = opts.mode ?? "speech";
  const lines: TalkLine[] = [];
  await runTalkTurnRequest(
    {
      sessionId,
      clientAttemptId: id,
      input: {
        mode,
        ...(mode === "speech" ? { text: opts.text ?? "I like it." } : {}),
      },
      hint: opts.hint ?? { opened: 0, heard: [] },
      ...(opts.prevPerceivedWaitMs === undefined
        ? {}
        : { prevPerceivedWaitMs: opts.prevPerceivedWaitMs }),
    },
    {
      ...h.deps(),
      write: (line) => lines.push(line),
      requestReceivedAt: h.clock.now,
      ...(opts.onPrepTimings ? { onPrepTimings: opts.onPrepTimings } : {}),
    },
  );
  return { lines, last: lines.at(-1), id };
}

/** 회화 수업 시작(P11 수업 시작 — 회화도 같은 길). */
export async function startTalk(
  h: TalkHarness,
  level: number,
  lessonNo = 1,
): Promise<string> {
  const row = await talkLessonRow(h.db, level, lessonNo);
  const started = await startLessonSession(
    { lessonId: row.id, confirmAbort: true },
    { db: h.db, now: () => h.clock.now },
  );
  if (!started.ok) throw new Error(`회화 시작 실패: ${started.reason}`);
  return started.sessionId;
}

export async function viewOf(
  h: TalkHarness,
  sessionId: string,
): Promise<TalkView> {
  const view = await loadTalkView({ sessionId }, h.deps());
  if (!view) throw new Error("회화 화면 자료 없음");
  return view;
}

/** 처음 열고 인사 턴에 답한 뒤 대화 토막까지 넘긴다(인사 턴 응답은 가짜 한 번씩). */
export async function intoTalk(
  h: TalkHarness,
  sessionId: string,
  { model = LOW_MODEL }: { model?: string } = {},
): Promise<TalkView> {
  let view = await viewOf(h, sessionId);
  while (!view.next.greetingDone) {
    h.fake.push(
      turnRule({ tori_en: "Great! Let's learn some words." }, { model }),
    );
    const { last } = await say(h, sessionId, { text: "I'm good." });
    if (last?.t !== "end") throw new Error(`인사 턴 실패: ${last?.t}`);
    view = await viewOf(h, sessionId);
  }
  for (const to of view.flow.slice(view.flow.indexOf("greeting") + 1)) {
    if (to === "wrap_up") break;
    const moved = await advanceTalk({ sessionId, to }, h.deps());
    if (!moved.ok) throw new Error(`토막 넘김 실패: ${moved.reason}`);
    if (to === "talk") break;
  }
  return viewOf(h, sessionId);
}

/** 목표 턴에 닿을 때까지 답한다(턴마다 가짜 한 번). 마지막 끝 줄을 돌려준다. */
export async function playToTarget(
  h: TalkHarness,
  sessionId: string,
  {
    model = LOW_MODEL,
    maxTurns = 60,
  }: { model?: string; maxTurns?: number } = {},
): Promise<Extract<TalkLine, { t: "end" }>> {
  for (let i = 0; i < maxTurns; i++) {
    h.fake.push(turnRule({ tori_en: "Good job!" }, { model }));
    const { last } = await say(h, sessionId, { text: "It is good." });
    if (last?.t !== "end") throw new Error(`턴 실패: ${last?.t}`);
    if (last.next.targetReached) return last;
  }
  throw new Error("목표 턴에 닿지 않았다");
}

/** 그 세션의 talk_turns(턴 번호 · 화자 차례). */
export async function turnsOf(db: Db, sessionId: string) {
  const rows = await db
    .select()
    .from(talkTurns)
    .where(eq(talkTurns.sessionId, sessionId));
  return rows.sort(
    (a, b) =>
      a.turnNo - b.turnNo ||
      (a.speaker === b.speaker ? 0 : a.speaker === "tori" ? -1 : 1),
  );
}

export async function sessionOf(db: Db, sessionId: string) {
  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  if (!row) throw new Error("세션 없음");
  return row;
}

/** 프로필의 하루 안전 상한을 지금까지 호출 수로 둔다(그 학습일은 쉼 — 1-가 C80). */
export async function capAtCurrentCalls(db: Db, profileId: string) {
  const calls = await db
    .select({ id: aiCalls.id })
    .from(aiCalls)
    .where(eq(aiCalls.profileId, profileId));
  await seedSettings(db, [
    {
      key: "ai.safety_daily_calls",
      scope: "profile",
      value: Math.max(1, calls.length),
      profileId,
    },
  ]);
}

/** 집 전체 설정 하나를 바꾼다(시험이 되돌린다). */
export async function setHouseholdSetting(db: Db, key: string, value: unknown) {
  await db
    .update(settings)
    .set({ value })
    .where(and(eq(settings.key, key), isNull(settings.profileId)));
}

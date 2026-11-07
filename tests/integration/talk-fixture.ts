// 회화 수업 통합 시험의 공용 바탕(plan-p13b 작업 2 · 회화 plan 묶음 7~12 — talk-lesson-* 통합 시험이 같이 쓴다). 집 비우기 · 첫 실행, 가짜
// Anthropic(fetch 주입, SSE 'stream' 응답) 의존 · 응답 뒤 할 일 모으기, 고정 시계, 턴 · 세션 행 읽기, 설정 바꾸기. 옛 흐름 견본(옛 꼴 카드 ·
// 옛 액션으로 대화를 미는 도우미)은 묶음 12 가 지웠다 — 시험용 시드의 회화 카드는 새 꼴이다. 아이 이름 · 연락처는 지어낸 값(앱 안 이름 Momo)이다.
import { and, eq, isNull } from "drizzle-orm";
import { AVATARS, TOPIC_BUNDLES } from "@/core/profile/start";
import { LEVEL_MAX } from "@/core/seed/structure";
import { profiles, sessions, talkTurns } from "@/db/schema/learning";
import {
  aiCalls,
  parentAlerts,
  parentAuth,
  settings,
} from "@/db/schema/operations";
import { createAnthropicClient } from "@/server/ai/client";
import type { TalkServerDeps } from "@/server/conversation";
import type { Db } from "@/server/db";
import { readHouseholdProfile, saveFirstRun } from "@/server/profile";
import { loadSeed } from "@/server/seed/load";
import {
  createFakeAnthropic,
  type FakeRule,
  messageBody,
} from "../fixtures/ai/fake-anthropic";
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

export type TalkDb = { testDb: TestDatabase; db: Db };

/**
 * 시험 DB · 시드(작은 틀 · 1단계)를 넣고 시드 완전성 끝을 12단계로 올린다. 시험용 시드의 회화 카드는 새 꼴(C189)이라 그대로 쓴다(옛 꼴 견본을
 * 넣던 몫은 회화 plan 묶음 12 가 지웠다 — 수업 목록은 새 꼴 카드만 칸 후보다, 정한 것 2).
 */
export async function setupTalkDb(): Promise<TalkDb> {
  const testDb = await createTestDatabase();
  const db = testDb.db;
  const report = await loadSeed(db, {
    files: filesOf(devSeedTree()),
    completeThrough: DEV_SEED_THROUGH,
    areas: [...DEV_SEED_AREAS],
    now: LOADED_AT,
  });
  if (report.outcome !== "loaded") throw new Error("시험 시드 적재 실패");
  await db
    .update(settings)
    .set({ value: LEVEL_MAX })
    .where(and(eq(settings.key, THROUGH_KEY), isNull(settings.profileId)));
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

/** 새 꼴 회화 턴 · 끝맺음 턴 응답(모든 칸 — 빈 값 + 덮어쓴 칸, 칸 차례는 stuck · tori_en 먼저). */
export function lessonAnswer(
  over: Record<string, unknown>,
): Record<string, unknown> {
  return {
    child_kind: over.stuck === true ? "not_understood" : "answer",
    stuck: false,
    tori_en: "Nice!",
    model_line: "",
    choices: [],
    tori_ko: [],
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    response_fit: true,
    child_topic: false,
    child_asked: false,
    goal_suggest: [],
    next_move: "none",
    card_item: { kind: "none", no: 0 },
    next_goal: [],
    support: "none",
    next_targets: [],
    next_hint_ko: "",
    next_hints: [],
    next_usable_phrases: [],
    next_answer_example: "",
    image_word: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
}

type RuleOptions = {
  times?: number;
  model?: string;
  /** 조각 사이 기다림(ms). */
  delayMs?: number;
  /** 첫 조각 앞 기다림(ms — 첫 바이트 늦춤). */
  firstDelayMs?: number;
  chunks?: number;
};

/** 회화 턴 요청('Closing: no')에만 답하는 새 꼴 응답 규칙. */
export function lessonTurnRule(
  over: Record<string, unknown>,
  { times = 1, model = LOW_MODEL, delayMs, chunks = 4 }: RuleOptions = {},
): FakeRule {
  return {
    when: { bodyIncludes: TURN_MARK },
    reply: {
      kind: "stream",
      body: messageBody({ model, json: lessonAnswer(over) }),
      chunks,
      ...(delayMs === undefined ? {} : { delayMs }),
    },
    times,
  };
}

/** 끝맺음 요청('Closing: yes')에만 답하는 새 꼴 응답 규칙(끝인사 · 요약 기본값). */
export function lessonClosingRule(
  over: Record<string, unknown> = {},
  {
    times = 1,
    model = LOW_MODEL,
    delayMs,
    firstDelayMs,
    chunks = 4,
  }: RuleOptions = {},
): FakeRule {
  return {
    when: { bodyIncludes: CLOSING_MARK },
    reply: {
      kind: "stream",
      body: messageBody({
        model,
        json: lessonAnswer({
          tori_en: "",
          farewell: "Bye bye!",
          farewell_ko: "안녕!",
          summary: "사과 이야기를 했어요.",
          ...over,
        }),
      }),
      chunks,
      ...(delayMs === undefined ? {} : { delayMs }),
      ...(firstDelayMs === undefined ? {} : { firstDelayMs }),
    },
    times,
  };
}

/** 가짜에 들어온 회화 턴 · 끝맺음 요청 수. */
export function requestsOf(h: TalkHarness, mark: string): number {
  return h.fake.requests.filter((r) => r.bodyText.includes(mark)).length;
}

/**
 * 가짜에 들어온 요청 본문(시스템 · 메시지)의 글 아닌 블록 종류('AI 몫 넓힘' AC-8 (마) — Anthropic 으로 가는 것은 인식 글뿐, 소리 · 그림 · 파일
 * 블록이 없어야 한다). 글 꼴 content 는 블록이 아니라 세지 않는다.
 */
export function nonTextBlocksOf(h: TalkHarness): string[] {
  const out: string[] = [];
  const visit = (content: unknown) => {
    if (!Array.isArray(content)) return;
    for (const block of content) {
      const type = (block as { type?: unknown } | null)?.type;
      if (type !== "text") out.push(String(type));
    }
  };
  for (const r of h.fake.requests) {
    const body = r.body as {
      system?: unknown;
      messages?: { content?: unknown }[];
    } | null;
    visit(body?.system);
    for (const m of body?.messages ?? []) visit(m.content);
  }
  return out;
}

// ── 행 읽기 · 설정 ─────────────────────────────────────────────────

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

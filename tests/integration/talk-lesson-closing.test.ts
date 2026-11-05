// 새 꼴 회화 수업의 끝맺음 · 홈 진입 정리 · 공용 서버 길 통합 시험(회화 plan 묶음 12 fix 1 — 지운 conversation-session · conversation-turn
// 통합 시험의 뜻을 새 꼴 견본으로 옮김, 정적 · 실행은 CI). 시험용 시드의 회화 1단계 단원 1 카드는 새 꼴이라 그 수업으로 세션을 열고(세션 시작
// 액션 · 처음 열기), 인사 턴은 talk_turns 에 바로 넣으며(묶음 9 시험과 같은 꼴), 대화 토막의 아이 말은 runTalkTurnRequest 를 가짜
// Anthropic 으로 부른다. 끝맺음은 응답 뒤 할 일(tasks)을 돌려 runTalkClosing 을 부른다.
// 증명: (가) AC-8c(끝맺음 max_tokens · feedback 기다림) · AC-16b(요약 한국어 · 가림 · 상한 · 다음 대화 요청에 최근 n 개) · AC-16c(보낸 메시지 지움)
// · 끝맺음 두 요청이면 호출 하나 · AC-15f(참여 완료 뒤 떠난 대화는 talk.idle_close_minutes 뒤 첫 홈 진입에 한 번, 그 전 다른 기기 홈 진입은 닫지
// 않음) · 홈 진입 정리 (다) · 옛 꼴 대기 기록 건너뜀(정한 것 2). (다) 1-가 하루 안전 상한 회화 셋 · 같은 시도 id 겹침 · 두 기기 · 선생님 말
// 없는 마지막 턴 다시 받기(AC-15f) · AC-2c 다시 하기. 숫자는 TEST_SETTINGS 에서 읽는다. 아이 이름 · 연락처는 지어낸 값이다.
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  parseTalkAttemptInput,
  talkClosingAttemptId,
} from "@/core/conversation/attempt";
import { type TalkMoveInput, talkMoveOf } from "@/core/conversation/move";
import { learningDayOf } from "@/core/learning-day";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { lessons } from "@/db/schema/content";
import {
  attempts,
  sessions,
  talkSummaries,
  talkTurns,
} from "@/db/schema/learning";
import { aiCalls } from "@/db/schema/operations";
import { insertAiCall } from "@/server/ai/store";
import {
  advanceTalkLesson,
  chooseLessonMoreTalk,
  loadTalkLessonView,
  stopTalkLesson,
} from "@/server/conversation";
import {
  closeIdleTalks,
  closingStateOf,
  insertClosingRecord,
  runTalkClosing,
  talkClosingStatus,
} from "@/server/conversation/closing";
import {
  type TalkLessonLine,
  TURN_IN_FLIGHT_MS,
} from "@/server/conversation/lesson-turn";
import { friendshipOf } from "@/server/conversation/state";
import { runTalkTurnRequest } from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import { startLessonSession } from "@/server/session";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  CLOSING_MARK,
  capAtCurrentCalls,
  DISPLAY_NAME,
  ENGLISH_NAME,
  harnessOf,
  lessonClosingRule,
  lessonTurnRule,
  MS_PER_MINUTE,
  NEXT_DAY,
  NOW,
  requestsOf,
  resetHousehold,
  sessionOf,
  setHouseholdSetting,
  setupTalkDb,
  type TalkDb,
  type TalkHarness,
  TURN_MARK,
  turnsOf,
} from "./talk-fixture";

type LessonRow = typeof lessons.$inferSelect;

const MS_PER_SECOND = 1000;
const TZ = TEST_SETTINGS["app.timezone"].value;
const DAY_START = TEST_SETTINGS["app.day_start_hour"].value;
const TODAY = learningDayOf(NOW, TZ, DAY_START);
const IDLE_MINUTES = TEST_SETTINGS["talk.idle_close_minutes"].value;
const MEMORY = TEST_SETTINGS["talk.memory_summaries"].value;
const SUMMARY_MAX = TEST_SETTINGS["talk.summary_max_chars"].value;
const FRIENDSHIP_PER = TEST_SETTINGS["talk.friendship_per_talk"].value;
const CLOSING_MAX_TOKENS = TEST_SETTINGS["ai.max_tokens.talk_closing"].value;
const REALTIME_SECONDS = TEST_SETTINGS["ai.timeout_seconds.realtime"].value;
const FEEDBACK_SECONDS = TEST_SETTINGS["ai.timeout_seconds.feedback"].value;
/** 짧은 실시간 타임아웃(초) — 끝맺음 턴이 이것이 아니라 feedback 으로 기다리는지 본다(시험 값). */
const SHORT_REALTIME_SECONDS = 1;
/** 첫 조각을 늦추는 시간(ms) — SHORT_REALTIME_SECONDS 보다 길고 feedback 보다 짧게(시험 값). */
const DELAY_PAST_REALTIME_MS = 1500;

let talkDb: TalkDb;
let db: Db;
let h: TalkHarness;
let profileId: string;
let first: LessonRow;
let second: LessonRow;

async function assignedRow(lessonNo: number): Promise<LessonRow> {
  const [row] = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "talk"),
        eq(lessons.level, 1),
        eq(lessons.unit, 1),
        eq(lessons.kind, "assigned"),
        eq(lessons.lessonNo, lessonNo),
      ),
    );
  if (!row) throw new Error(`회화 1단계 단원 1 수업 ${lessonNo} 이 없다`);
  return row;
}

beforeAll(async () => {
  talkDb = await setupTalkDb();
  db = talkDb.db;
  first = await assignedRow(1);
  second = await assignedRow(2);
});

afterAll(async () => {
  await talkDb?.testDb.drop();
});

beforeEach(async () => {
  h = harnessOf(db);
  profileId = await resetHousehold(db, 1);
});

// ── 도우미 ─────────────────────────────────────────────────────

/** 세션 시작 액션으로 그 수업을 연다(지금 시계). */
async function start(row: LessonRow = first): Promise<string> {
  const started = await startLessonSession(
    { lessonId: row.id, confirmAbort: true },
    { db, now: () => h.clock.now },
  );
  if (!started.ok) throw new Error(`회화 시작 실패: ${started.reason}`);
  return started.sessionId;
}

async function maxTurn(sessionId: string): Promise<number> {
  const rows = await turnsOf(db, sessionId);
  return rows.reduce((m, r) => Math.max(m, r.turnNo), 0);
}

/** 아이 행 하나와 그 뒤 선생님 행 하나(AI 없이 — 인사 턴 · 마무리 물음 자리). */
async function exchange(
  sessionId: string,
  {
    segment,
    text,
    teacher,
  }: {
    segment: "greeting" | "talk" | "more_talk";
    text: string;
    teacher: { text: string; move: TalkMoveInput };
  },
): Promise<void> {
  const turnNo = await maxTurn(sessionId);
  await db.insert(talkTurns).values([
    {
      sessionId,
      turnNo,
      segment,
      speaker: "child",
      text,
      inputMode: "speech",
      clientAttemptId: `child-${sessionId}-${turnNo}`,
      recordedAt: NOW,
    },
    {
      sessionId,
      turnNo: turnNo + 1,
      segment,
      speaker: "tori",
      text: teacher.text,
      move: talkMoveOf(teacher.move),
      recordedAt: NOW,
    },
  ]);
}

/** 처음 열기 → 인사 턴(바로 넣음) → (짧은 준비) → 대화 첫 질문까지. */
async function inTalk(sessionId: string): Promise<void> {
  const opened = await loadTalkLessonView({ sessionId }, h.deps());
  if (!opened) throw new Error("화면 자료가 없다");
  const [row] = await db
    .select({ content: lessons.content })
    .from(sessions)
    .innerJoin(lessons, eq(lessons.id, sessions.lessonId))
    .where(eq(sessions.id, sessionId));
  const turns = TalkLessonSchema.parse(row?.content).card.greetingTurns;
  for (let i = 0; i < turns; i++)
    await exchange(sessionId, {
      segment: "greeting",
      text: "I'm good.",
      teacher: { text: "Great!", move: { kind: "ai" } },
    });
  const view = await loadTalkLessonView({ sessionId }, h.deps());
  if (view?.step.kind === "advance" && view.step.to === "prep")
    await advanceTalkLesson({ sessionId, to: "prep" }, h.deps());
  const moved = await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
  if (!moved.ok) throw new Error("대화로 넘기지 못했다");
}

let seq = 0;
/** 아이 말 하나(회화 턴 길 — 가짜 AI). */
async function say(
  sessionId: string,
  {
    text = "I like apples.",
    clientAttemptId,
  }: { text?: string; clientAttemptId?: string } = {},
): Promise<TalkLessonLine[]> {
  const lines: TalkLessonLine[] = [];
  seq += 1;
  await runTalkTurnRequest(
    {
      sessionId,
      clientAttemptId: clientAttemptId ?? `say-${seq}`,
      input: { mode: "speech", text },
      hint: { opened: 0, heard: [] },
    },
    {
      ...h.deps(),
      write: (line) => lines.push(line),
      requestReceivedAt: h.clock.now,
    },
  );
  return lines;
}

/** 대화 토막에서 말로 한 턴(가짜 AI 한 번) — 그 뒤 '그만하기'는 참여 완료(AC-15t (가)). */
async function talkedOnce(sessionId: string): Promise<void> {
  h.fake.push(lessonTurnRule({ tori_en: "Nice! What else?" }));
  const lines = await say(sessionId);
  if (lines.at(-1)?.t !== "end") throw new Error("회화 턴이 끝나지 않았다");
}

async function closingRecord(sessionId: string) {
  const [row] = await db
    .select()
    .from(attempts)
    .where(eq(attempts.clientAttemptId, talkClosingAttemptId(sessionId)));
  return row;
}

async function closingReasonOf(sessionId: string): Promise<string | null> {
  const input = parseTalkAttemptInput((await closingRecord(sessionId))?.input);
  return input?.kind === "talk-closing" ? input.reason : null;
}

async function summariesOf(sessionId: string) {
  return db
    .select()
    .from(talkSummaries)
    .where(eq(talkSummaries.sessionId, sessionId));
}

async function callsOf(purpose: string) {
  return (
    await db.select().from(aiCalls).where(eq(aiCalls.profileId, profileId))
  ).filter((r) => r.purpose === purpose);
}

/** 그 프로필의 오늘 호출 한 행(AI 를 부르지 않은 대화에서 하루 안전 상한을 지금 수로 두려고). */
async function usedCallToday(): Promise<void> {
  await insertAiCall(db, {
    profileId,
    sessionId: null,
    calledAt: NOW,
    learningDay: TODAY,
    purpose: "talk_turn",
    requestedModel: TEST_SETTINGS["ai.model.talk_turn.1-3"].value,
    answeredModel: TEST_SETTINGS["ai.model.talk_turn.1-3"].value,
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    costUsd: "0.000000",
    priceMissing: false,
    latencyMs: null,
    status: "success",
    errorCode: null,
  });
}

/** 선생님 말 없는 아이 행 하나(앞 요청이 저장 전에 끊긴 꼴 — 마지막 선생님 행 턴 번호). */
async function orphanChild(
  sessionId: string,
  clientAttemptId: string,
): Promise<void> {
  await db.insert(talkTurns).values({
    sessionId,
    turnNo: await maxTurn(sessionId),
    segment: "talk",
    speaker: "child",
    text: "I like apples.",
    inputMode: "speech",
    clientAttemptId,
    recordedAt: NOW,
  });
}

// ── (가) 끝맺음 실행 ────────────────────────────────────────────

describe("새 꼴 끝맺음 실행(runTalkClosing · talkClosingStatus)", () => {
  it("AC-8c 참여가 있는 '그만하기' 응답은 끝맺음을 기다리지 않고, 응답 뒤 할 일이 talk_closing 최대 출력 · ai.timeout_seconds.feedback 기다림으로 끝맺음 턴을 한 번 불러 요약 · 끝인사를 남긴다", async () => {
    await setHouseholdSetting(
      db,
      "ai.timeout_seconds.realtime",
      SHORT_REALTIME_SECONDS,
    );
    try {
      expect(DELAY_PAST_REALTIME_MS).toBeGreaterThan(
        SHORT_REALTIME_SECONDS * MS_PER_SECOND,
      );
      expect(DELAY_PAST_REALTIME_MS).toBeLessThan(
        FEEDBACK_SECONDS * MS_PER_SECOND,
      );
      const sessionId = await start();
      await inTalk(sessionId);
      await talkedOnce(sessionId);
      h.fake.push(
        lessonClosingRule({}, { firstDelayMs: DELAY_PAST_REALTIME_MS }),
      );
      const stopped = await stopTalkLesson(
        { sessionId, confirmed: false },
        h.deps(),
      );
      if (!stopped.ok) throw new Error(stopped.reason);
      expect(stopped.wrap.aborted).toBe(false);
      expect((await sessionOf(db, sessionId)).status).toBe("completed");
      expect(h.tasks).toHaveLength(1);
      expect(requestsOf(h, CLOSING_MARK)).toBe(0);
      await h.runTasks();
      expect(requestsOf(h, CLOSING_MARK)).toBe(1);
      const closing = h.fake.requests.find((r) =>
        r.bodyText.includes(CLOSING_MARK),
      );
      expect(
        (closing?.body as { max_tokens?: number } | undefined)?.max_tokens,
      ).toBe(CLOSING_MAX_TOKENS);
      expect(await callsOf("talk_closing")).toHaveLength(1);
      expect(await closingReasonOf(sessionId)).toBe("stop");
      expect((await summariesOf(sessionId)).map((s) => s.summary)).toEqual([
        "사과 이야기를 했어요.",
      ]);
      expect(
        closingStateOf((await closingRecord(sessionId))?.aiFeedback),
      ).toEqual({
        state: "ready",
        value: {
          farewell: "Bye bye!",
          farewellKo: "안녕!",
          goodLines: [],
          nextTime: [],
        },
      });
      expect(await talkClosingStatus({ sessionId }, h.deps())).toMatchObject({
        state: "ready",
        farewell: { en: "Bye bye!" },
      });
    } finally {
      await setHouseholdSetting(
        db,
        "ai.timeout_seconds.realtime",
        REALTIME_SECONDS,
      );
    }
  });

  it("AC-16b 끝맺음 턴 요약은 한국어로 {NAME} 바꾸기와 가림을 거쳐 talk.summary_max_chars 자 이하로 저장되고 다음 대화의 회화 턴 요청에 최근 talk.memory_summaries 개가 들어간다", async () => {
    const sessionId = await start();
    await inTalk(sessionId);
    await talkedOnce(sessionId);
    const long = `${ENGLISH_NAME}는 사과를 좋아했어요. ${"가".repeat(SUMMARY_MAX)}`;
    h.fake.push(lessonClosingRule({ summary: long }));
    await stopTalkLesson({ sessionId, confirmed: false }, h.deps());
    await h.runTasks();
    const [saved] = await summariesOf(sessionId);
    expect(saved?.summary).toContain("{NAME}");
    expect(saved?.summary).not.toContain(ENGLISH_NAME);
    expect(saved?.summary).toMatch(/[가-힣]/);
    expect(Array.from(saved?.summary ?? "").length).toBeLessThanOrEqual(
      SUMMARY_MAX,
    );
    // 더 오래된 요약 셋(앞 대화)
    const older = ["옛 요약 하나", "옛 요약 둘", "옛 요약 셋"];
    for (const [i, summary] of older.entries())
      await db.insert(talkSummaries).values({
        profileId,
        sessionId,
        learningDay: TODAY,
        summary,
        recordedAt: new Date(
          NOW.getTime() - (older.length - i) * MS_PER_MINUTE,
        ),
      });
    h.clock.now = new Date(NOW.getTime() + MS_PER_MINUTE);
    const next = await start(second);
    await inTalk(next);
    await talkedOnce(next);
    const request = h.fake.requests
      .filter((r) => r.bodyText.includes(TURN_MARK))
      .at(-1);
    const text = request?.bodyText ?? "";
    expect(text).toContain("{NAME}");
    expect(text).toContain(older[2]);
    expect(text).toContain(older[1]);
    expect(text).not.toContain(older[0]);
    expect(MEMORY).toBe(3);
  });

  it("AC-16b 저장된 새 꼴 회화 아이 원문 · 보낸 메시지에는 프로필 이름과 전화번호 형태가 없다", async () => {
    const sessionId = await start();
    await inTalk(sessionId);
    const phone = "010-1234-5678";
    h.fake.push(lessonTurnRule({ tori_en: "Nice!" }));
    await say(sessionId, {
      text: `I am ${ENGLISH_NAME} ${DISPLAY_NAME} and my phone is ${phone}`,
    });
    const child = (await turnsOf(db, sessionId))
      .filter((r) => r.speaker === "child")
      .at(-1);
    for (const leak of [ENGLISH_NAME, DISPLAY_NAME, phone]) {
      expect(child?.text ?? "").not.toContain(leak);
      expect(child?.sentUserMessage ?? "").not.toContain(leak);
    }
    expect(child?.sentUserMessage).not.toBeNull();
  });

  it("AC-16c 끝맺음 뒤 보낸 메시지 전문과 다시 쓸 선생님 차례가 지워지고 단어 수 · 입력 방식 · 힌트 종류는 남는다", async () => {
    const sessionId = await start();
    await inTalk(sessionId);
    await talkedOnce(sessionId);
    const before = await turnsOf(db, sessionId);
    expect(before.some((r) => r.sentUserMessage !== null)).toBe(true);
    expect(before.some((r) => r.toriRewrite !== null)).toBe(true);
    const kept = (rows: typeof before) =>
      rows
        .filter((r) => r.speaker === "child")
        .map((r) => ({
          id: r.id,
          wordCount: r.wordCount,
          inputMode: r.inputMode,
          hintKind: r.hintKind,
        }));
    h.fake.push(lessonClosingRule());
    await stopTalkLesson({ sessionId, confirmed: false }, h.deps());
    await h.runTasks();
    expect(
      closingStateOf((await closingRecord(sessionId))?.aiFeedback)?.state,
    ).toBe("ready");
    const after = await turnsOf(db, sessionId);
    for (const r of after) {
      expect(r.sentUserMessage).toBeNull();
      expect(r.toriRewrite).toBeNull();
    }
    expect(kept(after)).toEqual(kept(before));
    const child = after
      .filter((r) => r.speaker === "child" && r.segment === "talk")
      .at(-1);
    expect(child?.wordCount).toBeGreaterThan(0);
    expect(child?.inputMode).toBe("speech");
  });

  it("새 꼴 끝맺음을 두 요청이 함께 부르면 호출은 하나다", async () => {
    const sessionId = await start();
    await inTalk(sessionId);
    await talkedOnce(sessionId);
    const stopped = await stopTalkLesson(
      { sessionId, confirmed: false },
      h.deps(),
    );
    expect(stopped.ok).toBe(true);
    h.tasks.length = 0;
    h.fake.push(lessonClosingRule({}, { delayMs: 50, chunks: 6 }));
    const results = await Promise.all([
      runTalkClosing(sessionId, h.deps()),
      runTalkClosing(sessionId, h.deps()),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(requestsOf(h, CLOSING_MARK)).toBe(1);
  });
});

// ── (가) 홈 진입 정리 ───────────────────────────────────────────

describe("새 꼴 홈 진입 정리(closeIdleTalks)", () => {
  it("AC-15f 참여 완료 뒤 떠난 대화는 talk.idle_close_minutes 뒤 첫 홈 진입 때 정리로 닫히고 끝맺음 턴이 한 번 불리며 그 전 다른 기기의 홈 진입은 대화를 닫지 않는다", async () => {
    const sessionId = await start();
    await inTalk(sessionId);
    await exchange(sessionId, {
      segment: "talk",
      text: "I like apples.",
      teacher: {
        text: "Great talk!\nDo you want to talk more?",
        move: { kind: "closing_slot" },
      },
    });
    const more = await chooseLessonMoreTalk({ sessionId }, h.deps());
    if (!more.ok) throw new Error("더 이야기하기를 받지 않았다");
    expect((await sessionOf(db, sessionId)).status).toBe("completed");
    h.fake.push(lessonClosingRule());
    const early = new Date(NOW.getTime() + (IDLE_MINUTES - 1) * MS_PER_MINUTE);
    h.clock.now = early;
    expect(await closeIdleTalks({ profileId, at: early }, h.deps())).toBe(0);
    expect((await sessionOf(db, sessionId)).talkSegment).toBe("more_talk");
    expect(await closingRecord(sessionId)).toBeUndefined();
    const late = new Date(NOW.getTime() + (IDLE_MINUTES + 1) * MS_PER_MINUTE);
    h.clock.now = late;
    expect(await closeIdleTalks({ profileId, at: late }, h.deps())).toBe(1);
    expect((await sessionOf(db, sessionId)).talkSegment).toBe("wrap_up");
    expect(await closingReasonOf(sessionId)).toBe("idle");
    expect(requestsOf(h, CLOSING_MARK)).toBe(1);
    expect(await closeIdleTalks({ profileId, at: late }, h.deps())).toBe(0);
    expect(requestsOf(h, CLOSING_MARK)).toBe(1);
    expect(
      closingStateOf((await closingRecord(sessionId))?.aiFeedback)?.state,
    ).toBe("ready");
  });

  it("홈 진입 정리 (다): 끝맺음 기록 없이 중단으로 닫힌 새 꼴 회화는 건너뜀 기록 · 보낸 메시지 지움으로 닫히고 AI 를 부르지 않는다", async () => {
    const sessionId = await start();
    await inTalk(sessionId);
    await talkedOnce(sessionId);
    await db
      .update(sessions)
      .set({ status: "aborted", learningDay: TODAY })
      .where(eq(sessions.id, sessionId));
    const calls = h.fake.requests.length;
    expect(await closeIdleTalks({ profileId, at: NOW }, h.deps())).toBe(0);
    expect(await closingReasonOf(sessionId)).toBe("aborted");
    expect(
      closingStateOf((await closingRecord(sessionId))?.aiFeedback),
    ).toEqual({ state: "skipped" });
    for (const r of await turnsOf(db, sessionId)) {
      expect(r.sentUserMessage).toBeNull();
      expect(r.toriRewrite).toBeNull();
    }
    expect(h.fake.requests).toHaveLength(calls);
  });

  it("회화 plan 정한 것 2 옛 꼴 카드 세션의 끝맺음 대기 기록은 runTalkClosing · 홈 진입 정리가 AI 없이 건너뜀으로 닫고 보낸 메시지를 지우며 끝맺음 상태는 none 이다", async () => {
    const original = second.content;
    const content = original as { card: Record<string, unknown> };
    await db
      .update(lessons)
      .set({
        content: {
          ...content,
          card: {
            ...content.card,
            firstQuestion: "What do you see?",
            turns: [],
          },
        },
      })
      .where(eq(lessons.id, second.id));
    try {
      const [session] = await db
        .insert(sessions)
        .values({
          profileId,
          area: "talk",
          level: 1,
          unit: 1,
          lessonId: second.id,
          kind: "regular",
          talkSegment: "wrap_up",
          status: "completed",
          startedAt: NOW,
          completedAt: NOW,
          learningDay: TODAY,
          seedRevision: second.revision,
          seedCorrection: 0,
        })
        .returning({ id: sessions.id });
      if (!session) throw new Error("세션을 넣지 못했다");
      const sessionId = session.id;
      await db.insert(talkTurns).values({
        sessionId,
        turnNo: 1,
        segment: "talk",
        speaker: "child",
        text: "I like apples.",
        inputMode: "speech",
        clientAttemptId: `old-${sessionId}`,
        sentUserMessage: "Child: I like apples.",
        toriRewrite: "Nice!",
        recordedAt: NOW,
      });
      expect(
        await insertClosingRecord(db, { sessionId, at: NOW, reason: "stop" }),
      ).toBe(true);
      expect(
        closingStateOf((await closingRecord(sessionId))?.aiFeedback),
      ).toEqual({ state: "pending", failures: 0 });
      expect(await runTalkClosing(sessionId, h.deps())).toBe(false);
      const record = await closingRecord(sessionId);
      expect(closingStateOf(record?.aiFeedback)).toEqual({ state: "skipped" });
      expect(record?.status).toBe("done");
      for (const r of await turnsOf(db, sessionId)) {
        expect(r.sentUserMessage).toBeNull();
        expect(r.toriRewrite).toBeNull();
      }
      expect(await closeIdleTalks({ profileId, at: NOW }, h.deps())).toBe(0);
      expect(await talkClosingStatus({ sessionId }, h.deps())).toEqual({
        state: "none",
      });
      expect(h.fake.requests).toHaveLength(0);
    } finally {
      await db
        .update(lessons)
        .set({ content: original })
        .where(eq(lessons.id, second.id));
    }
  });
});

// ── (다) 1-가 하루 안전 상한 ────────────────────────────────────

describe("1-가 하루 안전 상한(새 꼴 회화, a 회4 · C80)", () => {
  it("1-가 안전 상한(회화): 상한 날에는 새 회화 수업이 시작되지 않고 참여 완료 전 도중이면 그 턴에서 쉬는 안내를 돌려주며 세션은 진행으로 남고 다음 학습일에 같은 시도 id 로 이어 받는다", async () => {
    const sessionId = await start();
    await inTalk(sessionId);
    await talkedOnce(sessionId);
    await capAtCurrentCalls(db, profileId);
    expect(
      await startLessonSession(
        { lessonId: second.id, confirmAbort: true },
        { db, now: () => NOW },
      ),
    ).toEqual({ ok: false, reason: "ai_resting" });
    const calls = h.fake.requests.length;
    const rested = await say(sessionId, { clientAttemptId: "rest-1" });
    expect(rested).toEqual([{ t: "resting" }]);
    expect(h.fake.requests).toHaveLength(calls);
    expect((await sessionOf(db, sessionId)).status).toBe("in_progress");
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.resting).toBe(true);
    expect(view?.retryTurn?.clientAttemptId).toBe("rest-1");
    h.clock.now = NEXT_DAY;
    h.fake.push(lessonTurnRule({ tori_en: "Welcome back!" }));
    const again = await say(sessionId, { clientAttemptId: "rest-1" });
    expect(again.at(-1)?.t).toBe("end");
    const rows = await turnsOf(db, sessionId);
    expect(rows.filter((r) => r.clientAttemptId === "rest-1")).toHaveLength(1);
    expect(rows.at(-1)?.speaker).toBe("tori");
    expect(rows.at(-1)?.text?.split("\n")[0]).toBe("Welcome back!");
  });

  it("1-가 안전 상한(회화): 쉬는 날 참여가 거의 없는 '그만하기'는 확인 뒤 끝맺음 턴 없이 중단되고 풀린 학습일의 홈 진입도 끝맺음을 부르지 않는다", async () => {
    const sessionId = await start();
    await inTalk(sessionId);
    await usedCallToday();
    await capAtCurrentCalls(db, profileId);
    expect(
      await stopTalkLesson({ sessionId, confirmed: false }, h.deps()),
    ).toEqual({ ok: false, reason: "needs_confirm" });
    const stopped = await stopTalkLesson(
      { sessionId, confirmed: true },
      h.deps(),
    );
    expect(stopped.ok && stopped.wrap.aborted).toBe(true);
    expect(h.tasks).toHaveLength(0);
    expect((await sessionOf(db, sessionId)).status).toBe("aborted");
    expect(
      closingStateOf((await closingRecord(sessionId))?.aiFeedback),
    ).toEqual({ state: "skipped" });
    for (const r of await turnsOf(db, sessionId)) {
      expect(r.sentUserMessage).toBeNull();
      expect(r.toriRewrite).toBeNull();
    }
    h.clock.now = NEXT_DAY;
    expect(await closeIdleTalks({ profileId, at: NEXT_DAY }, h.deps())).toBe(0);
    expect(requestsOf(h, CLOSING_MARK)).toBe(0);
  });

  it("1-가 안전 상한(회화): 쉬는 날 참여가 있는 '그만하기'는 참여 완료 · 끝맺음 대기만 두고 끝맺음 턴은 상한이 풀린 학습일의 첫 홈 진입에서 한 번 불린다", async () => {
    const sessionId = await start();
    await inTalk(sessionId);
    await talkedOnce(sessionId);
    await capAtCurrentCalls(db, profileId);
    const stopped = await stopTalkLesson(
      { sessionId, confirmed: false },
      h.deps(),
    );
    expect(stopped.ok && stopped.wrap.aborted).toBe(false);
    expect((await sessionOf(db, sessionId)).status).toBe("completed");
    expect(h.tasks).toHaveLength(0);
    expect(
      closingStateOf((await closingRecord(sessionId))?.aiFeedback)?.state,
    ).toBe("pending");
    h.fake.push(lessonClosingRule());
    expect(await closeIdleTalks({ profileId, at: NOW }, h.deps())).toBe(0);
    expect(requestsOf(h, CLOSING_MARK)).toBe(0);
    h.clock.now = NEXT_DAY;
    expect(await closeIdleTalks({ profileId, at: NEXT_DAY }, h.deps())).toBe(1);
    expect(requestsOf(h, CLOSING_MARK)).toBe(1);
    expect(await closeIdleTalks({ profileId, at: NEXT_DAY }, h.deps())).toBe(0);
  });
});

// ── (다) 같은 시도 id · 두 기기 · 선생님 말 없는 마지막 턴 ──────────

describe("새 꼴 회화 턴 겹침 · 두 기기 · 선생님 말 없는 마지막 턴", () => {
  it("새 꼴 회화: 두 기기가 같은 턴을 보내면 하나만 받고 늦은 쪽은 AI 없이 다시 읽으라는 답(stale)을 받는다", async () => {
    const sessionId = await start();
    await inTalk(sessionId);
    const before = requestsOf(h, TURN_MARK);
    h.fake.push(
      lessonTurnRule({ tori_en: "Nice one!" }, { delayMs: 50, chunks: 6 }),
    );
    const [a, b] = await Promise.all([
      say(sessionId, { clientAttemptId: "device-a" }),
      say(sessionId, { clientAttemptId: "device-b" }),
    ]);
    expect([a.at(-1)?.t, b.at(-1)?.t].sort()).toEqual(["end", "stale"]);
    expect(requestsOf(h, TURN_MARK)).toBe(before + 1);
    const rows = await turnsOf(db, sessionId);
    expect(
      rows.filter(
        (r) =>
          r.clientAttemptId === "device-a" || r.clientAttemptId === "device-b",
      ),
    ).toHaveLength(1);
  });

  it("새 꼴 회화: 같은 시도 id 를 겹쳐 보내면 둘째 요청은 AI 를 부르지 않고 다시 읽으라는 답을 받으며 저장된 선생님 말은 첫 요청의 것이다", async () => {
    const sessionId = await start();
    await inTalk(sessionId);
    const before = requestsOf(h, TURN_MARK);
    h.fake.push(
      lessonTurnRule({ tori_en: "Nice one!" }, { delayMs: 50, chunks: 6 }),
    );
    h.fake.push(lessonTurnRule({ tori_en: "Second call!" }));
    const [a, b] = await Promise.all([
      say(sessionId, { clientAttemptId: "same-1" }),
      say(sessionId, { clientAttemptId: "same-1" }),
    ]);
    expect([a.at(-1)?.t, b.at(-1)?.t].sort()).toEqual(["end", "stale"]);
    expect(requestsOf(h, TURN_MARK)).toBe(before + 1);
    const rows = await turnsOf(db, sessionId);
    expect(rows.filter((r) => r.clientAttemptId === "same-1")).toHaveLength(1);
    expect(rows.at(-1)?.text?.split("\n")[0]).toBe("Nice one!");
  });

  it("AC-15f 선생님 말이 없는 마지막 아이 턴은 화면 자료가 다시 보낼 턴으로 주고, 진행 중(TURN_IN_FLIGHT_MS 안 · 호출 기록 없음)이면 AI 없이 stale, 그 뒤 같은 시도 id 로 한 번 다시 받으며 한 번 더 보내면 저장한 말을 AI 없이 다시 흘린다", async () => {
    const sessionId = await start();
    await inTalk(sessionId);
    await orphanChild(sessionId, "orphan-1");
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.retryTurn?.clientAttemptId).toBe("orphan-1");
    // 다른 시도 id 는 받지 않는다
    expect((await say(sessionId, { clientAttemptId: "other" })).at(-1)).toEqual(
      { t: "stale" },
    );
    // 아이 행이 막 들어온 때(호출 기록 없음)는 아직 진행 중으로 본다
    expect(
      (await say(sessionId, { clientAttemptId: "orphan-1" })).at(-1),
    ).toEqual({ t: "stale" });
    expect(h.fake.requests).toHaveLength(0);
    h.clock.now = new Date(NOW.getTime() + TURN_IN_FLIGHT_MS + MS_PER_SECOND);
    h.fake.push(lessonTurnRule({ tori_en: "Great to hear!" }));
    const again = await say(sessionId, {
      text: "ignored text",
      clientAttemptId: "orphan-1",
    });
    expect(again.at(-1)?.t).toBe("end");
    expect(requestsOf(h, TURN_MARK)).toBe(1);
    const rows = await turnsOf(db, sessionId);
    const own = rows.filter((r) => r.clientAttemptId === "orphan-1");
    expect(own).toHaveLength(1);
    expect(own[0]?.text).toBe("I like apples.");
    expect(rows.at(-1)?.speaker).toBe("tori");
    const calls = h.fake.requests.length;
    const replayed = await say(sessionId, { clientAttemptId: "orphan-1" });
    expect(replayed.at(-1)?.t).toBe("end");
    expect(JSON.stringify(replayed)).toContain("Great to hear!");
    expect(h.fake.requests).toHaveLength(calls);
  });
});

// ── (다) AC-2c 다시 하기 ────────────────────────────────────────

describe("AC-2c 새 꼴 회화 다시 하기", () => {
  it("AC-2c 끝낸 회화 수업을 다시 하기로 열면 처음 했을 때와 같은 수업 행(주제 변형)으로 열리고 회화 턴 호출이 새 수업과 같이 일어나며 친한 정도는 오르지 않는다", async () => {
    const firstSession = await start();
    await inTalk(firstSession);
    await talkedOnce(firstSession);
    h.fake.push(lessonClosingRule());
    await stopTalkLesson(
      { sessionId: firstSession, confirmed: false },
      h.deps(),
    );
    await h.runTasks();
    expect(await friendshipOf(db, profileId)).toBe(FRIENDSHIP_PER);
    const firstRow = await sessionOf(db, firstSession);
    expect(firstRow.status).toBe("completed");
    h.clock.now = new Date(NOW.getTime() + MS_PER_MINUTE);
    const retry = await start(first);
    const retryRow = await sessionOf(db, retry);
    expect(retryRow.kind).toBe("retry");
    expect(retryRow.lessonId).toBe(firstRow.lessonId);
    const calls = requestsOf(h, TURN_MARK);
    await inTalk(retry);
    await talkedOnce(retry);
    expect(requestsOf(h, TURN_MARK)).toBeGreaterThan(calls);
    h.fake.push(lessonClosingRule());
    await stopTalkLesson({ sessionId: retry, confirmed: false }, h.deps());
    await h.runTasks();
    expect((await sessionOf(db, retry)).status).toBe("completed");
    expect(await friendshipOf(db, profileId)).toBe(FRIENDSHIP_PER);
  });
});

// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R plan 묶음 S2)의 토막 접점 통합 시험(15절 AC-27a · AC-27e · AC-27f · AC-27k).
// 시험용 시드의 회화 1단계 단원 1 수업 1 로 세션을 넣고, 처음 열 때의 설정 talk.lead_mode 로 방식을 정한다. 단원 재료(이야기 방식 주제 칸)는 3단계
// 단원 1 에만 있으므로 처음 스냅숏을 적는 자리에 그 표를 넘긴다(새 방식 시험과 같은 자리). 이야기 방식의 턴 길(chat-turn.ts)은 묶음 S1 몫이라 선생님 ·
// 아이 행은 시험이 talk_turns 에 바로 넣는다. 다만 수업 첫 말 호출이 실패하거나 'AI 쉬는 중'일 때 카드 인사 첫 줄로 여는 것(spec 설계 5 · M-5)은 턴 길이
// 하는 일이라 턴 요청으로 본다. 공용 재료(talk-fixture.ts)는 S1 만 고치므로 도우미는 이 파일 안에 둔다. 이 기기에서는 돌지 않고 CI 가 돌린다.
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TALK_LEAD_TEXT_L3U1 } from "@/core/ai/calls/talk-lead";
import { parseTalkAttemptInput } from "@/core/conversation/attempt";
import { readTalkMove, talkMoveOf } from "@/core/conversation/move";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { lessons } from "@/db/schema/content";
import { attempts, sessions, talkTurns } from "@/db/schema/learning";
import { insertAiCall } from "@/server/ai/store";
import {
  advanceTalkLesson,
  chooseLessonMoreTalk,
  loadTalkLessonView,
  revealTalkLessonHint,
  saveLessonFollowAlong,
} from "@/server/conversation";
import type { TalkLessonLine } from "@/server/conversation/lesson-turn";
import { runTalkTurnRequest } from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import { messageBody } from "../fixtures/ai/fake-anthropic";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  CHAT_SYSTEM_MARK,
  capAtCurrentCalls,
  harnessOf,
  NOW,
  resetHousehold,
  setHouseholdSetting,
  setupTalkDb,
  type TalkDb,
  type TalkHarness,
} from "./talk-fixture";

type LessonRow = typeof lessons.$inferSelect;
type Card = ReturnType<typeof TalkLessonSchema.parse>["card"];
type Mode = "app" | "claude" | "chat";

const LEAD_MODE_KEY = "talk.lead_mode";
const PREP_MODE_KEY = "talk.prep_mode.1-3";

let talk: TalkDb;
let db: Db;
let h: TalkHarness;
let assigned: LessonRow;
let card: Card;

beforeAll(async () => {
  talk = await setupTalkDb();
  db = talk.db;
  const rows = await db
    .select()
    .from(lessons)
    .where(
      and(eq(lessons.area, "talk"), eq(lessons.level, 1), eq(lessons.unit, 1)),
    );
  const first = rows.find((r) => r.kind === "assigned" && r.lessonNo === 1);
  if (!first) throw new Error("회화 1단계 단원 1 수업 1 이 없다");
  assigned = first;
  card = TalkLessonSchema.parse(first.content).card;
});

afterAll(async () => {
  await talk?.testDb.drop();
});

beforeEach(async () => {
  h = harnessOf(db);
  await setHouseholdSetting(db, LEAD_MODE_KEY, "app");
  await setHouseholdSetting(db, PREP_MODE_KEY, "always");
});

// ── 도우미(이 파일 몫) ──────────────────────────────────────────────

/** 처음 열 때의 설정 값을 mode 로 두고 집을 비운 뒤 새 세션을 넣고 연다. material 이 거짓이면 단원 재료 표를 넘기지 않는다(시험용 1단계에는 재료가 없음). */
async function newSession(
  mode: Mode,
  {
    teacherKey = "mina",
    material = true,
  }: { teacherKey?: string; material?: boolean } = {},
): Promise<{ profileId: string; sessionId: string }> {
  await setHouseholdSetting(db, LEAD_MODE_KEY, mode);
  const profileId = await resetHousehold(db, 1, teacherKey);
  return { profileId, sessionId: await openSession(profileId, material) };
}

/** 같은 프로필에 새 세션을 넣고 연다(처음 스냅숏은 지금 설정 값). */
async function openSession(
  profileId: string,
  material = true,
): Promise<string> {
  const [session] = await db
    .insert(sessions)
    .values({
      profileId,
      area: "talk",
      level: 1,
      unit: 1,
      lessonId: assigned.id,
      kind: "regular",
      status: "in_progress",
      startedAt: NOW,
      seedRevision: assigned.revision,
      seedCorrection: 0,
    })
    .returning({ id: sessions.id });
  if (!session) throw new Error("세션을 넣지 못했다");
  const view = await loadTalkLessonView(
    { sessionId: session.id },
    {
      ...h.deps(),
      ...(material ? { leadText: () => TALK_LEAD_TEXT_L3U1 } : {}),
    },
  );
  if (!view) throw new Error("화면 자료가 없다");
  return session.id;
}

async function rowsOf(sessionId: string) {
  return db
    .select()
    .from(talkTurns)
    .where(eq(talkTurns.sessionId, sessionId))
    .orderBy(talkTurns.turnNo);
}

async function maxTurn(sessionId: string): Promise<number> {
  return (await rowsOf(sessionId)).reduce((m, r) => Math.max(m, r.turnNo), 0);
}

async function startModeOf(sessionId: string): Promise<unknown> {
  const rows = await db
    .select({ input: attempts.input })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId));
  for (const r of rows) {
    const input = parseTalkAttemptInput(r.input);
    if (input?.kind === "talk-start") return input.leadMode;
  }
  throw new Error("처음 스냅숏이 없다");
}

async function segmentOf(sessionId: string) {
  const [row] = await db
    .select({ segment: sessions.talkSegment, status: sessions.status })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  return row;
}

const sayJson = (say: string) =>
  JSON.stringify({ listen_sentence: "", say, say_ko: "", wrap_up: false });

/** 이야기 방식 선생님 행(턴 길이 쓰는 꼴 — 기록 글은 응답 JSON, move 에 chat 묶음). */
async function chatTeacher(
  sessionId: string,
  {
    segment,
    say,
    kind = "ai",
  }: {
    segment: "greeting" | "talk" | "more_talk";
    say: string;
    kind?: "ai" | "first_question" | "closing_slot";
  },
) {
  await db.insert(talkTurns).values({
    sessionId,
    turnNo: (await maxTurn(sessionId)) + 1,
    segment,
    speaker: "tori",
    text: say,
    toriRewrite: sayJson(say),
    move: talkMoveOf({
      kind,
      chat: { level: {}, madeUp: [], facts: [], run: 0 },
    }),
    recordedAt: NOW,
  });
}

/** 이야기 방식 아이 행(말 · 조용함). */
async function chatChild(
  sessionId: string,
  {
    segment,
    text,
    quiet = false,
  }: {
    segment: "greeting" | "talk" | "more_talk";
    text?: string;
    quiet?: boolean;
  },
) {
  const turnNo = (await maxTurn(sessionId)) + 1;
  await db.insert(talkTurns).values({
    sessionId,
    turnNo,
    segment,
    speaker: "child",
    text: quiet ? null : (text ?? "I'm good."),
    inputMode: quiet ? "quiet" : "speech",
    clientAttemptId: `chat-seg-${sessionId}-${turnNo}`,
    sentUserMessage: quiet
      ? "(The child did not press the talk button.)"
      : `Child (speech-to-text): "${text ?? "I'm good."}"`,
    recordedAt: NOW,
  });
}

/** 이야기 방식 인사를 끝까지(선생님 첫 말 → (아이 → 선생님) × 카드 인사 차례 수). 마지막 아이 행이 인사 끝이다. */
async function chatGreeted(sessionId: string) {
  await chatTeacher(sessionId, {
    segment: "greeting",
    say: "Good evening! How was your day?",
  });
  for (let i = 0; i < card.greetingTurns; i++) {
    await chatChild(sessionId, { segment: "greeting" });
    await chatTeacher(sessionId, { segment: "greeting", say: "Nice!" });
  }
}

/** 카드 인사 첫 줄(4단계부터는 선생님 첫 말 — 시험 카드는 1단계라 인사 질문). */
function cardOpeningEn(c: Card): string {
  const g = c.greeting;
  return "questions" in g
    ? (g.questions[0]?.question.en ?? "")
    : g.firstLine.en;
}

/**
 * 턴 길의 단원 주제 출처(chat-turn ChatTurnDeps.chatTopic): 수업을 연 재료 표(openSession 의 leadText — 3단계 단원 1 의 표)와 같은 표에서 읽는다.
 * 기본 출처 talkChatTopicOf 는 시험 시드의 1단계 단원 1 에 주제가 없어 null 을 내고, 턴 길은 그 수업을 '재료 없음' 오류로 닫는다(행 없음 — CI 43565405821).
 */
const chatTopicOfL3U1 = () => TALK_LEAD_TEXT_L3U1.chatTopicEn ?? null;

async function openTurn(
  sessionId: string,
  lead: "start" | "back" | "more",
): Promise<TalkLessonLine[]> {
  const lines: TalkLessonLine[] = [];
  await runTalkTurnRequest({ sessionId, lead }, {
    ...h.deps(),
    write: (line: TalkLessonLine) => lines.push(line),
    requestReceivedAt: h.clock.now,
    chatTopic: chatTopicOfL3U1,
  } as Parameters<typeof runTalkTurnRequest>[1]);
  return lines;
}

/**
 * 수업 첫 말이 실패하거나 'AI 쉬는 중'일 때의 카드 인사 첫 줄 행(컨트롤러 결정 T-492 — S1 의 이야기 방식 꼴 하나): 선생님 행 하나 · 인사 토막 · 글은
 * 카드 인사 첫 줄 · 기록 글 없음 · move.kind ai 이고 move.chat 이 있다.
 */
async function expectChatOpeningRow(sessionId: string) {
  const rows = await rowsOf(sessionId);
  expect(rows.map((r) => [r.turnNo, r.speaker, r.segment])).toEqual([
    [1, "tori", "greeting"],
  ]);
  expect(rows[0]?.text).toContain(cardOpeningEn(card));
  expect(rows[0]?.toriRewrite).toBeNull();
  const move = readTalkMove(rows[0]?.move);
  expect(move?.kind).toBe("ai");
  expect(move?.chat).toBeDefined();
}

/** 오늘 호출 하나를 남기고 하루 안전 상한을 그 수로 둔다('AI 쉬는 중' — 1-가 C80). */
async function restToday(profileId: string) {
  await insertAiCall(db, {
    profileId,
    sessionId: null,
    calledAt: NOW,
    learningDay: "2026-10-22",
    purpose: "talk_turn",
    requestedModel: "claude-sonnet-5-5",
    answeredModel: null,
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    costUsd: "0.000000",
    priceMissing: false,
    latencyMs: null,
    status: "error",
    errorCode: null,
  });
  await capAtCurrentCalls(db, profileId);
}

// ── 수업 열기(AC-27a · AC-27e) ───────────────────────────────────────

describe("AC-27a 수업을 열 때 조건 넷이 서야 이야기 방식(묶음 S2)", () => {
  it("AC-27a 설정 chat · 미나 · 재료가 있는 단원이면 처음 스냅숏이 chat 이고 카드 인사 행을 넣지 않는다", async () => {
    const { sessionId } = await newSession("chat");
    expect(await startModeOf(sessionId)).toBe("chat");
    expect(await rowsOf(sessionId)).toEqual([]);
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.step).toEqual({ kind: "advance", to: "talk" });
    expect(view?.current).toBeNull();
    expect(view?.retryLead).toBeNull();
    expect(h.fake.requests).toHaveLength(0);
  });

  it("AC-27a 리오(선생님 재료 없음)는 설정이 chat 이어도 기존 방식으로 열린다(스냅숏 칸 없음 · 카드 인사 행)", async () => {
    const { sessionId } = await newSession("chat", { teacherKey: "leo" });
    expect(await startModeOf(sessionId)).toBeUndefined();
    const rows = await rowsOf(sessionId);
    expect(rows.map((r) => [r.turnNo, r.speaker, r.segment])).toEqual([
      [1, "tori", "greeting"],
    ]);
    expect(rows[0]?.text).toContain(cardOpeningEn(card));
  });

  it("AC-27a 재료가 없는 단원(이야기 방식 주제 칸 없음)은 설정이 chat 이어도 기존 방식으로 열린다", async () => {
    const { sessionId } = await newSession("chat", { material: false });
    expect(await startModeOf(sessionId)).toBeUndefined();
    expect((await rowsOf(sessionId)).map((r) => r.speaker)).toEqual(["tori"]);
  });

  it("AC-27a 설정 app 은 고치기 전과 같은 줄로 열린다(스냅숏 칸 없음 · 카드 인사 행)", async () => {
    const { sessionId } = await newSession("app");
    expect(await startModeOf(sessionId)).toBeUndefined();
    expect((await rowsOf(sessionId)).map((r) => r.turnNo)).toEqual([1]);
  });

  it("AC-27a 진행 중인 이야기 방식 수업은 설정이 바뀌어도 처음 값 그대로다", async () => {
    const { sessionId } = await newSession("chat");
    await setHouseholdSetting(db, LEAD_MODE_KEY, "app");
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.step).toEqual({ kind: "advance", to: "talk" });
    expect(await rowsOf(sessionId)).toEqual([]);
  });

  it("AC-27e 수업 첫 말: 토막 넘김이 카드 행 없이 신호 start 를 내고 토막은 인사 그대로다", async () => {
    const { sessionId } = await newSession("chat");
    const moved = await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
    expect(moved).toMatchObject({ ok: true, leadTurn: "start" });
    expect((await segmentOf(sessionId))?.segment ?? "greeting").toBe(
      "greeting",
    );
    expect(await rowsOf(sessionId)).toEqual([]);
  });

  it("AC-27e 첫 말 호출이 다시 시도 뒤에도 실패하면 카드 인사 첫 줄로 열고(턴 길 S1 의 이야기 방식 꼴 행), 그 뒤 할 일 · 힌트가 이야기 방식대로 돈다", async () => {
    const { sessionId } = await newSession("chat");
    // 망 오류는 대화 호출(이야기 방식 안내문)에만 건다 — 뒤의 힌트 호출까지 걸리지 않게(재검토 rev-chat-s2-2 N-1)
    h.fake.push({
      when: { bodyIncludes: CHAT_SYSTEM_MARK },
      reply: { kind: "network-error" },
    });
    await openTurn(sessionId, "start");
    await expectChatOpeningRow(sessionId);
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.step).toEqual({ kind: "child" });
    expect(view?.current?.hints).toEqual([]);
    expect(view?.current?.chat?.quietSeconds).toBe(
      TEST_SETTINGS["talk.chat_quiet_seconds"].value,
    );
    // 힌트는 카드가 아니라 힌트 호출에서 온다(한 번)
    const calls = h.fake.requests.length;
    h.fake.push({
      reply: {
        kind: "message",
        body: messageBody({
          model: TEST_SETTINGS["ai.model.talk_chat_hint"].value,
          json: {
            hint_ko: "나는 좋아요.",
            hint_en: "I'm good.",
            explain_ko: "기분을 물었어요.",
          },
        }),
      },
      times: 1,
    });
    expect(
      await revealTalkLessonHint({ sessionId, tier: 0 }, h.deps()),
    ).toMatchObject({ ok: true, text: "나는 좋아요." });
    expect(h.fake.requests.length).toBe(calls + 1);
  });

  it("AC-27e 'AI 쉬는 중'이어도 토막 넘김은 행 없이 신호 start 를 내고, 턴 길이 호출 없이 카드 인사 첫 줄 행을 넣는다(조용함 기다림 없음)", async () => {
    const { profileId, sessionId } = await newSession("chat");
    await restToday(profileId);
    const moved = await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
    expect(moved).toMatchObject({ ok: true, leadTurn: "start" });
    expect(await rowsOf(sessionId)).toEqual([]);
    const before = h.fake.requests.length;
    await openTurn(sessionId, "start");
    expect(h.fake.requests.length).toBe(before);
    await expectChatOpeningRow(sessionId);
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.resting).toBe(true);
    expect(view?.step).toEqual({ kind: "child" });
    expect(view?.current?.chat?.quietSeconds).toBeUndefined();
    expect(view?.current?.hints).toEqual([]);
  });
});

// ── 토막 넘김(AC-27e) ───────────────────────────────────────────────

describe("AC-27e 인사 → 짧은 준비 → 돌아옴 · 준비 없는 수업의 인사 → 대화(묶음 S2)", () => {
  it("AC-27e 짧은 준비가 열리면 준비가 닫힌 뒤 첫 대화 차례를 돌아옴 신호 back 으로 열고, 다시 열어도 같은 신호다", async () => {
    const { sessionId } = await newSession("chat");
    await chatGreeted(sessionId);
    let view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.step).toEqual({ kind: "advance", to: "prep" });
    const toPrep = await advanceTalkLesson({ sessionId, to: "prep" }, h.deps());
    expect(toPrep).toMatchObject({ ok: true, segment: "prep" });
    expect(toPrep.ok && toPrep.leadTurn).toBeFalsy();
    // 쪽지의 첫 낱말을 따라 말한다(보인 낱말이 있어야 돌아옴 — 턴 길의 back 받기 조건 prepOpened)
    const word = (toPrep.ok ? toPrep.prep?.words[0]?.word : undefined) ?? "";
    expect(word).not.toBe("");
    expect(
      await saveLessonFollowAlong(
        {
          sessionId,
          clientAttemptId: `prep-${sessionId}-0`,
          segment: "prep",
          index: 0,
          target: word,
          heard: [word],
          failures: 0,
        },
        h.deps(),
      ),
    ).toEqual({ ok: true, saved: true });
    const rowsBefore = (await rowsOf(sessionId)).length;
    const back = await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
    expect(back).toMatchObject({ ok: true, segment: "talk", leadTurn: "back" });
    expect((await rowsOf(sessionId)).length).toBe(rowsBefore);
    // 돌아옴 차례가 쓰이기 전에 다시 열면 같은 넘김 · 같은 신호(행 없음)
    view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.step).toEqual({ kind: "advance", to: "talk" });
    const again = await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
    expect(again).toMatchObject({ ok: true, leadTurn: "back" });
    // 돌아옴 차례(대화 토막 첫 선생님 행)가 쓰이면 아이 차례
    await chatTeacher(sessionId, {
      segment: "talk",
      say: "Welcome back! What did you eat?",
      kind: "first_question",
    });
    view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.step).toEqual({ kind: "child" });
    expect(h.fake.requests).toHaveLength(0);
  });

  it("AC-27e 준비가 없는 합성 카드는 인사 → 대화 사이에 입구 호출 없음", async () => {
    // 준비 계획이 비는 수업(talk.prep_mode.1-3 when_needed — 이야기 방식 실험의 3단계 단원 1 재료처럼 준비 계획이 빈 목록)
    await setHouseholdSetting(db, PREP_MODE_KEY, "when_needed");
    const { sessionId } = await newSession("chat");
    await chatGreeted(sessionId);
    let view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.step).toEqual({ kind: "advance", to: "talk" });
    const rowsBefore = (await rowsOf(sessionId)).length;
    const moved = await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
    expect(moved).toMatchObject({
      ok: true,
      segment: "talk",
      step: { kind: "child" },
    });
    expect(moved.ok && "leadTurn" in moved).toBe(false);
    expect((await rowsOf(sessionId)).length).toBe(rowsBefore);
    view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.step).toEqual({ kind: "child" });
    // 아이 차례의 끝 줄 신호(다시 들어올 때) — 힌트 단은 카드에서 오지 않는다
    expect(view?.current?.hints).toEqual([]);
    expect(view?.current?.chat?.hint).toBe(true);
    expect(h.fake.requests).toHaveLength(0);
  });

  it("AC-27k '더 이야기하기'는 카드 거리 행 없이 신호 more 이고 참여 완료는 지금 뜻 그대로다", async () => {
    await setHouseholdSetting(db, PREP_MODE_KEY, "when_needed");
    const { sessionId } = await newSession("chat");
    await chatGreeted(sessionId);
    await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
    await chatChild(sessionId, { segment: "talk", text: "I ate rice." });
    await chatTeacher(sessionId, {
      segment: "talk",
      say: "Yum! Do you want to talk more?",
      kind: "closing_slot",
    });
    const rowsBefore = (await rowsOf(sessionId)).length;
    const more = await chooseLessonMoreTalk({ sessionId }, h.deps());
    expect(more).toMatchObject({
      ok: true,
      segment: "more_talk",
      leadTurn: "more",
    });
    expect((await rowsOf(sessionId)).length).toBe(rowsBefore);
    expect((await segmentOf(sessionId))?.status).toBe("completed");
  });
});

// ── 조용함 행이 있는 수업의 화면 자료(AC-27f) ───────────────────────────

describe("AC-27f 조용함 행이 있는 수업의 화면 자료 · 다시 보낼 자료(묶음 S2 · 상태 읽기는 묶음 S1)", () => {
  it("AC-27f 조용함 행이 있어도 화면 자료가 열리고, 대화 기록에서는 그 행이 빠져 선생님 말풍선이 잇달아 쌓인다", async () => {
    await setHouseholdSetting(db, PREP_MODE_KEY, "when_needed");
    const { sessionId } = await newSession("chat");
    await chatGreeted(sessionId);
    await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
    await chatChild(sessionId, { segment: "talk", text: "I ate rice." });
    await chatTeacher(sessionId, { segment: "talk", say: "Yum! I like rice." });
    await chatChild(sessionId, { segment: "talk", quiet: true });
    await chatTeacher(sessionId, { segment: "talk", say: "I ate noodles." });
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view).toBeDefined();
    const log = view?.log ?? [];
    expect(log.some((r) => r.speaker === "child" && r.input !== "speech")).toBe(
      false,
    );
    expect(log.slice(-2).map((r) => r.speaker)).toEqual(["teacher", "teacher"]);
    expect(view?.step).toEqual({ kind: "child" });
  });

  it("AC-27f 선생님 말이 없는 마지막 아이 행이 조용함 행이면 retryTurn 없이 조용함 입구(retryLead quiet)로 다시 보낸다", async () => {
    await setHouseholdSetting(db, PREP_MODE_KEY, "when_needed");
    const { sessionId } = await newSession("chat");
    await chatGreeted(sessionId);
    await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
    await chatChild(sessionId, { segment: "talk", quiet: true });
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.step).toEqual({ kind: "retry" });
    expect(view?.retryTurn).toBeNull();
    expect(view?.retryLead).toBe("quiet");
  });
});

// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 2 · 7 · 8-2 · 8-4 · 13, plan 묶음 S0)의 호출 셋과 그 저장 — DB 몫:
// 대화 호출의 ai_calls 표지(chat)와 같은 오류 셈, 힌트 호출의 표지 행 묶음 · 실패 · 다시 받기 · ai_question 저장, 평가 호출의 chat_judge 저장 ·
// 수업 단위 줄 세우기(두 값이 함께 와도 모두 남음) · 'AI 쉬는 중' 셈 밖 · 비교 표지 행. 실제 API 를 부르지 않는다(가짜 Anthropic). 이 기기에서는
// 돌지 않고 CI 가 돌린다. 공용 재료(talk-fixture)는 고치지 않고 가져다 쓴다.
import { and, eq, like } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { type TalkChatInput, talkChatTopicOf } from "@/core/ai/calls/talk-chat";
import type { TalkChatEvalOutput } from "@/core/ai/calls/talk-chat-eval";
import type { TalkChatHintInput } from "@/core/ai/calls/talk-chat-hint";
import { chatHintRecordOfRow } from "@/core/conversation/chat-hints";
import {
  type ChatJudgeContext,
  chatJudgeChangesOf,
  chatJudgesOf,
  readChatJudge,
} from "@/core/conversation/chat-judge";
import { AI_WAIT_TIMEOUT_MULTIPLE } from "@/core/seed/structure";
import { lessons } from "@/db/schema/content";
import { attempts, sessions, talkTurns } from "@/db/schema/learning";
import { aiCalls, parentAlerts } from "@/db/schema/operations";
import { insertAiCall, sameErrorCount } from "@/server/ai/store";
import { talkChatTurn } from "@/server/ai/talk";
import {
  ChatCompareMarkSchema,
  chatCompareAttemptId,
  chatJudgeRowsOf,
  runChatEval,
  runChatEvalsOnClose,
  writeChatCompare,
} from "@/server/conversation/chat-eval";
import {
  ChatHintMarkSchema,
  chatExplainAttemptId,
  chatHintAttemptId,
  requestChatHint,
} from "@/server/conversation/chat-hint";
import { createDb, type Db } from "@/server/db";
import { messageBody } from "../fixtures/ai/fake-anthropic";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  harnessOf,
  NOW,
  resetHousehold,
  setupTalkDb,
  type TalkDb,
  type TalkHarness,
} from "./talk-fixture";

const EVAL_MODEL = TEST_SETTINGS["ai.model.talk_chat_eval"].value;
/** 겹침 시험에서 다른 연결이 행 잠금을 쥐는 시간(기술 값). */
const HOLD_MS = 800;
const HINT_MODEL = TEST_SETTINGS["ai.model.talk_chat_hint"].value;
const LEARNING_DAY = "2026-10-22";

let talk: TalkDb;
let db: Db;
let h: TalkHarness;
let lessonId: string;
let revision: number;

beforeAll(async () => {
  talk = await setupTalkDb();
  db = talk.db;
  const rows = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.area, "talk"), eq(lessons.level, 1)));
  const first = rows.find((r) => r.kind === "assigned" && r.unit === 1);
  if (!first) throw new Error("회화 1단계 단원 1 수업이 없다");
  lessonId = first.id;
  revision = first.revision;
});

afterAll(async () => {
  await talk?.testDb.drop();
});

beforeEach(() => {
  h = harnessOf(db);
});

/** 호출 의존: 시험 DB · 가짜 클라이언트 · 고정 시계. */
const ai = () => ({ db, ...h.deps().ai });

async function newSession(): Promise<{ profileId: string; sessionId: string }> {
  const profileId = await resetHousehold(db, 1);
  const [session] = await db
    .insert(sessions)
    .values({
      profileId,
      area: "talk",
      level: 1,
      unit: 1,
      lessonId,
      kind: "regular",
      status: "in_progress",
      talkSegment: "talk",
      startedAt: NOW,
      seedRevision: revision,
      seedCorrection: 0,
    })
    .returning({ id: sessions.id });
  if (!session) throw new Error("세션을 넣지 못했다");
  return { profileId, sessionId: session.id };
}

const CTX: ChatJudgeContext = {
  unitWords: ["beach", "sea", "park"],
  lemmaOf: () => undefined,
  homophones: [],
  sceneWords: new Set(),
  spec: { band: "1-3" },
  teacherName: "Mina",
};

const sayJson = (say: string) =>
  JSON.stringify({ listen_sentence: "", say, say_ko: "", wrap_up: false });

/** 선생님 · 아이 행을 바로 넣는다(턴 길을 거치지 않음 — 묶음 S1 이 쓰는 꼴: 아이 행의 첫 chat_judge 는 기다림 · 부르지 않음). */
async function seedDialog(
  sessionId: string,
  turns: ({ teacher: string } | { child: string })[],
): Promise<string[]> {
  const values = turns.map((turn, i) =>
    "teacher" in turn
      ? {
          sessionId,
          turnNo: i + 1,
          segment: "talk" as const,
          speaker: "tori" as const,
          text: turn.teacher,
          toriRewrite: sayJson(turn.teacher),
          recordedAt: NOW,
        }
      : {
          sessionId,
          turnNo: i + 1,
          segment: "talk" as const,
          speaker: "child" as const,
          text: turn.child,
          inputMode: "speech" as const,
          hintLevel: 0,
          sentUserMessage: `Child (speech-to-text): "${turn.child}"`,
          recordedAt: NOW,
        },
  );
  const inserted = await db
    .insert(talkTurns)
    .values(values)
    .returning({ id: talkTurns.id, turnNo: talkTurns.turnNo });
  const rows = await rowsOf(sessionId);
  const judged = chatJudgeRowsOf(rows, CTX.spec);
  for (const { row, judge } of chatJudgesOf(judged.rows, CTX))
    await db
      .update(talkTurns)
      .set({ chatJudge: judge })
      .where(eq(talkTurns.id, judged.ids[row] ?? ""));
  return inserted.sort((a, b) => a.turnNo - b.turnNo).map((r) => r.id);
}

async function rowsOf(sessionId: string) {
  return db.select().from(talkTurns).where(eq(talkTurns.sessionId, sessionId));
}

const EVAL_OUT: TalkChatEvalOutput = {
  reading: "clear_answer",
  teacher_move: "react_and_follow_up",
  model_sentence: "",
  child_used_on_own: ["beach"],
};

const evalReq = (profileId: string, sessionId: string) => ({
  profileId,
  sessionId,
  level: 1,
  sentenceMaxWords: 5,
  contextTurns: TEST_SETTINGS["talk.chat_eval_context_turns"].value,
  ctx: CTX,
});

// ── 대화 호출의 표지 · 같은 오류 셈 ─────────────────────────────────────

describe("AC-27h 이야기 방식 대화 호출의 ai_calls 표지와 같은 오류 셈", () => {
  it("AC-27h 대화 호출은 목적 talk_turn · 표지 chat 으로 남고, 첫 문장이 응답 끝 전에 나간다", async () => {
    const { profileId, sessionId } = await newSession();
    const answer = {
      listen_sentence: "",
      say: "Oh, the beach! I like the sea. What do you see?",
      say_ko: "오, 바다! 나는 바다가 좋아. 뭐가 보여?",
      wrap_up: false,
    };
    h.fake.push({
      reply: {
        kind: "stream",
        body: messageBody({
          model: TEST_SETTINGS["ai.model.talk_turn.1-3"].value,
          json: answer,
        }),
      },
      times: 1,
    });
    const topic = talkChatTopicOf(3, 1);
    if (topic === null) throw new Error("단원 주제가 없다");
    const input: TalkChatInput = {
      level: 1,
      unitWords: ["beach", "sea"],
      teacher: {
        nameEn: "Mina",
        chatPersonaEn: "You are warm.",
        chatFavoritesEn: "you like cats.",
      },
      topicEn: topic,
      history: [],
      message: {
        facts: [],
        input: { kind: "speech", heard: "I go to the beach." },
      },
    };
    const events: string[] = [];
    const result = await talkChatTurn(
      input,
      {
        profileId,
        sessionId,
        level: 1,
        requestReceivedAt: NOW,
        safeLine: "Let's talk about something fun!",
        sentenceMaxWords: 5,
        onListen: (l) => events.push(`listen:${l}`),
        onSentence: (s) => events.push(`s:${s}`),
      },
      ai(),
    );
    expect(result.ok).toBe(true);
    expect(events[0]).toBe("listen:");
    const calls = await db
      .select()
      .from(aiCalls)
      .where(eq(aiCalls.sessionId, sessionId));
    expect(calls.map((c) => [c.purpose, c.errorCode])).toEqual([
      ["talk_turn", "chat"],
    ]);
  });

  it("AC-27h 표지 chat 을 단 같은 오류 행도 대화 호출의 같은 오류로 센다", async () => {
    await db.delete(aiCalls);
    const base = {
      profileId: null,
      sessionId: null,
      calledAt: NOW,
      learningDay: LEARNING_DAY,
      requestedModel: "claude-sonnet-5-5",
      answeredModel: null,
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      costUsd: "0.000000",
      priceMissing: false,
      latencyMs: null,
      status: "error" as const,
    };
    await insertAiCall(db, {
      ...base,
      purpose: "talk_turn",
      errorCode: "chat:same_error:400",
    });
    await insertAiCall(db, {
      ...base,
      purpose: "talk_turn",
      errorCode: "same_error:400",
    });
    expect(
      await sameErrorCount(db, {
        purpose: "talk_turn",
        learningDay: LEARNING_DAY,
      }),
    ).toBe(2);
  });

  it("AC-27h 평가 성공이 대화 호출의 이어진 실패 셈을 끊지 않음", async () => {
    await db.delete(aiCalls);
    await db.delete(parentAlerts);
    const base = {
      profileId: null,
      sessionId: null,
      calledAt: NOW,
      learningDay: LEARNING_DAY,
      requestedModel: "claude-sonnet-5-5",
      answeredModel: null,
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      costUsd: "0.000000",
      priceMissing: false,
      latencyMs: null,
    };
    await insertAiCall(db, {
      ...base,
      purpose: "talk_turn",
      status: "error",
      errorCode: "chat:same_error:400",
    });
    // 평가 호출의 성공 · 같은 오류 행이 사이에 끼어도 대화 호출의 셈은 그대로이고, 평가 목적의 셈은 늘 0 이다
    await insertAiCall(db, {
      ...base,
      purpose: "talk_chat_eval",
      status: "success",
      errorCode: null,
    });
    for (let i = 0; i < 5; i++)
      await insertAiCall(db, {
        ...base,
        purpose: "talk_chat_eval",
        status: "error",
        errorCode: "same_error:400",
      });
    await insertAiCall(db, {
      ...base,
      purpose: "talk_turn",
      status: "error",
      errorCode: "chat:same_error:400",
    });
    expect(
      await sameErrorCount(db, {
        purpose: "talk_turn",
        learningDay: LEARNING_DAY,
      }),
    ).toBe(2);
    expect(
      await sameErrorCount(db, {
        purpose: "talk_chat_eval",
        learningDay: LEARNING_DAY,
      }),
    ).toBe(0);
  });
});

// ── 힌트 호출 ─────────────────────────────────────────────────────

const HINT_JSON = {
  hint_ko: "나는 바다에 가.",
  hint_en: "I go to the beach.",
  explain_ko: "선생님이 어디 가는지 물었어요.",
};

function hintInput(): TalkChatHintInput {
  return {
    level: 1,
    sentenceMaxWords: 5,
    hintTiers: ["ko", "sentence"],
    teacherNameEn: "Mina",
    say: "Where do you go on weekends?",
    context: [],
  };
}

const hintReq = (
  profileId: string,
  sessionId: string,
  teacherRowId: string,
  retry = 0,
) => ({
  profileId,
  sessionId,
  teacherRowId,
  retry,
  retryMax: TEST_SETTINGS["talk.chat_hint_retry_max"].value,
  waitMs: TEST_SETTINGS["ai.timeout_seconds.realtime"].value * 1000,
  aiResting: false,
  spec: {
    band: "1-3" as const,
    hintTiers: ["ko" as const, "sentence" as const],
    usablePhrases: 0,
  },
  unitWords: ["beach"],
  lemmaOf: () => undefined,
  input: hintInput(),
});

describe("AC-27g 힌트 호출: 표지 행 묶음 · 실패 · 다시 받기 · ai_question 저장", () => {
  it("AC-27g 같은 선생님 행의 두 요청이 함께 오면 표지 행 하나 · 호출 하나이고 두 요청 모두 같은 단을 받는다", async () => {
    const { profileId, sessionId } = await newSession();
    const [teacherId = ""] = await seedDialog(sessionId, [
      { teacher: "Where do you go on weekends?" },
    ]);
    h.fake.push({
      reply: {
        kind: "message",
        body: messageBody({ model: HINT_MODEL, json: HINT_JSON }),
        delayMs: 200,
      },
    });
    const req = hintReq(profileId, sessionId, teacherId);
    const [a, b] = await Promise.all([
      requestChatHint(req, ai()),
      requestChatHint(req, ai()),
    ]);
    expect(a.ok && b.ok).toBe(true);
    expect(h.fake.requests).toHaveLength(1);
    const marks = await db
      .select()
      .from(attempts)
      .where(like(attempts.clientAttemptId, "talk-chat-hint:%"));
    expect(marks.map((m) => m.clientAttemptId)).toEqual([
      chatHintAttemptId(teacherId, 0),
    ]);
    expect(ChatHintMarkSchema.parse(marks[0]?.input).state).toBe("done");
    const [row] = await db
      .select()
      .from(talkTurns)
      .where(eq(talkTurns.id, teacherId));
    expect(
      chatHintRecordOfRow(row?.aiQuestion, { band: "1-3" })?.tiers.length,
    ).toBe(2);
  });

  it("AC-27g 실패는 표지 행에 적고 ai_question 은 비고, 다시 받기는 번호 표지 행으로 다시 부른다", async () => {
    const { profileId, sessionId } = await newSession();
    const [teacherId = ""] = await seedDialog(sessionId, [
      { teacher: "Where do you go on weekends?" },
    ]);
    h.fake.push({
      reply: {
        kind: "message",
        body: messageBody({
          model: HINT_MODEL,
          json: { hint_ko: "", hint_en: "", explain_ko: "" },
        }),
      },
      times: 2,
    });
    const first = await requestChatHint(
      hintReq(profileId, sessionId, teacherId),
      ai(),
    );
    expect(first.ok).toBe(false);
    // 번호 0 이 실패한 뒤 같은 번호의 요청은 호출 없이 그 실패를 낸다(검토 rev-chat-s0 M-4 (라))
    const calls = h.fake.requests.length;
    const same = await requestChatHint(
      hintReq(profileId, sessionId, teacherId),
      ai(),
    );
    expect(same).toMatchObject({ ok: false, retriesUsed: 0 });
    expect(h.fake.requests).toHaveLength(calls);
    h.fake.reset();
    h.fake.push({
      reply: {
        kind: "message",
        body: messageBody({ model: HINT_MODEL, json: HINT_JSON }),
      },
    });
    const again = await requestChatHint(
      hintReq(profileId, sessionId, teacherId, 1),
      ai(),
    );
    expect(again).toMatchObject({ ok: true, via: "called" });
    const marks = await db
      .select()
      .from(attempts)
      .where(like(attempts.clientAttemptId, `talk-chat-hint:${teacherId}%`));
    const byId = new Map(
      marks.map((m) => [m.clientAttemptId, ChatHintMarkSchema.parse(m.input)]),
    );
    expect(byId.get(chatHintAttemptId(teacherId, 0))?.state).toBe("failed");
    expect(byId.get(chatHintAttemptId(teacherId, 1))?.state).toBe("done");
  });
});

// ── 평가 호출 · 비교 표지 행 ──────────────────────────────────────────

describe("AC-27g 힌트 호출: 설명 표지 행 · 끊긴 표지 고쳐 잡기 · 저장하지 못함(검토 rev-chat-s0 I-2 · M-1 · M-4)", () => {
  it("AC-27g 막힌 뒤 설명이 실패하면 설명 표지 행에 적히고, 힌트 첫 누름은 제 표지 행으로 한 번 불러 단을 낸다", async () => {
    const { profileId, sessionId } = await newSession();
    const [teacherId = ""] = await seedDialog(sessionId, [
      { teacher: "Where do you go on weekends?" },
    ]);
    h.fake.push({
      reply: { kind: "network-error" },
      times: 1,
    });
    h.fake.push({
      reply: {
        kind: "message",
        body: messageBody({ model: HINT_MODEL, json: HINT_JSON }),
      },
    });
    const explain = await requestChatHint(
      { ...hintReq(profileId, sessionId, teacherId), kind: "explain" },
      ai(),
    );
    expect(explain.ok).toBe(false);
    const hint = await requestChatHint(
      hintReq(profileId, sessionId, teacherId),
      ai(),
    );
    expect(hint).toMatchObject({ ok: true, via: "called" });
    const marks = await db
      .select()
      .from(attempts)
      .where(like(attempts.clientAttemptId, `talk-chat-hint:${teacherId}%`));
    const byId = new Map(
      marks.map((m) => [m.clientAttemptId, ChatHintMarkSchema.parse(m.input)]),
    );
    expect(byId.get(chatExplainAttemptId(teacherId))).toMatchObject({
      state: "failed",
      explain: true,
    });
    expect(byId.get(chatHintAttemptId(teacherId, 0))?.state).toBe("done");
  });

  it("AC-27g 끊긴 부르는 중 표지(시간 상한의 AI_WAIT_TIMEOUT_MULTIPLE 배를 넘김)는 시각을 조건으로 고쳐 잡아 부른다(DB 판)", async () => {
    const { profileId, sessionId } = await newSession();
    const [teacherId = ""] = await seedDialog(sessionId, [
      { teacher: "Where do you go on weekends?" },
    ]);
    const req = hintReq(profileId, sessionId, teacherId);
    const old = new Date(
      NOW.getTime() - AI_WAIT_TIMEOUT_MULTIPLE * req.waitMs - 1,
    );
    await db.insert(attempts).values({
      sessionId,
      clientAttemptId: chatHintAttemptId(teacherId, 0),
      activityNo: 0,
      input: { v: 1, kind: "talk-chat-hint", retry: 0, state: "calling" },
      attemptedAt: old,
      status: "done",
    });
    h.fake.push({
      reply: {
        kind: "message",
        body: messageBody({ model: HINT_MODEL, json: HINT_JSON }),
      },
    });
    expect(await requestChatHint(req, ai())).toMatchObject({
      ok: true,
      via: "called",
    });
    const [mark] = await db
      .select()
      .from(attempts)
      .where(eq(attempts.clientAttemptId, chatHintAttemptId(teacherId, 0)));
    expect(mark?.attemptedAt.getTime()).toBe(NOW.getTime());
    expect(ChatHintMarkSchema.parse(mark?.input).state).toBe("done");
  });

  it("AC-27g 선생님 행 ai_question 에 다른 꼴의 값이 있으면 저장하지 못함(not_saved)으로 적고 단을 내지 않는다", async () => {
    const { profileId, sessionId } = await newSession();
    const [teacherId = ""] = await seedDialog(sessionId, [
      { teacher: "Where do you go on weekends?" },
    ]);
    await db
      .update(talkTurns)
      .set({
        aiQuestion: { en: "Where do you go?", ko: "", answerExample: "" },
      })
      .where(eq(talkTurns.id, teacherId));
    h.fake.push({
      reply: {
        kind: "message",
        body: messageBody({ model: HINT_MODEL, json: HINT_JSON }),
      },
    });
    expect(
      await requestChatHint(hintReq(profileId, sessionId, teacherId), ai()),
    ).toEqual({ ok: false, reason: "not_saved", retriesUsed: 0 });
    const [mark] = await db
      .select()
      .from(attempts)
      .where(eq(attempts.clientAttemptId, chatHintAttemptId(teacherId, 0)));
    expect(ChatHintMarkSchema.parse(mark?.input)).toMatchObject({
      state: "failed",
      reason: "not_saved",
    });
  });
});

describe("AC-27i 평가 호출의 저장 · 줄 세우기 · 비교 표지 행", () => {
  it("AC-27i 두 평가가 함께 와도 두 값이 모두 남는다(세션 행 잠금으로 수업 단위로 줄 세움)", async () => {
    const { profileId, sessionId } = await newSession();
    const ids = await seedDialog(sessionId, [
      { teacher: "Where do you go?" },
      { child: "I go to the beach." },
      { teacher: "Nice! What do you see?" },
      { child: "I see the sea." },
      { teacher: "Wow!" },
    ]);
    // 겹침을 확정한다(검토 rev-chat-s0 I-1 (나)): c4 평가의 응답은 바로, c2 평가의 응답은 늦게 오게 하고, 다른 연결에서 c4 행을 잠가 c4 쓰기를
    // 붙잡는다. 세션 잠금이 있으면 c2 쓰기는 c4 쓰기가 끝난 뒤의 행을 읽어 c4 를 다시 세어 쓰고, 없으면 c2 가 옛 c4 를 읽어 c4 가 옛 상태로 센 값으로
    // 남는다 — 그러면 아래 (가)의 다시 세기가 바뀐 행을 낸다
    h.fake.push({
      when: { bodyIncludes: "I see the sea" },
      reply: {
        kind: "message",
        body: messageBody({ model: EVAL_MODEL, json: EVAL_OUT }),
      },
    });
    h.fake.push({
      reply: {
        kind: "message",
        body: messageBody({ model: EVAL_MODEL, json: EVAL_OUT }),
        delayMs: HOLD_MS / 2,
      },
    });
    const other = createDb(talk.testDb.url, { max: 1 });
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let lockedNow = () => {};
    const locked = new Promise<void>((resolve) => {
      lockedNow = resolve;
    });
    const holder = other.transaction(async (tx) => {
      await tx
        .select({ id: talkTurns.id })
        .from(talkTurns)
        .where(eq(talkTurns.id, ids[3] ?? ""))
        .for("update");
      lockedNow();
      await gate;
    });
    try {
      await locked;
      const req = evalReq(profileId, sessionId);
      const both = Promise.all([
        runChatEval({ ...req, childRowId: ids[3] ?? "" }, ai()),
        runChatEval({ ...req, childRowId: ids[1] ?? "" }, ai()),
      ]);
      await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
      release();
      await holder;
      const [a, b] = await both;
      expect(a.written && b.written).toBe(true);
    } finally {
      release();
      await other.$client.end();
    }
    const rows = await rowsOf(sessionId);
    for (const id of [ids[1], ids[3]])
      expect(
        readChatJudge(rows.find((r) => r.id === id)?.chatJudge)?.legacy.status,
      ).toBe("done");
    // (가) 끝난 수업 행으로 다시 세어 저장값과 달라지는 행이 0 이다(뒤 행이 앞 행의 옛 상태로 센 값으로 남지 않음)
    const judged = chatJudgeRowsOf(rows, CTX.spec);
    expect(
      chatJudgeChangesOf({
        rows: judged.rows,
        stored: judged.stored,
        ctx: CTX,
      }),
    ).toEqual([]);
  });

  it("AC-27i 실패는 판정 없음으로 적고 다시 부르지 않는다(두 번째 부름은 호출 없이 끝남)", async () => {
    const { profileId, sessionId } = await newSession();
    const ids = await seedDialog(sessionId, [
      { teacher: "Where do you go?" },
      { child: "I go to the beach." },
      { teacher: "Nice!" },
    ]);
    h.fake.push({
      reply: {
        kind: "message",
        body: messageBody({
          model: EVAL_MODEL,
          json: { ...EVAL_OUT, reading: "not_a_reading" },
        }),
      },
    });
    const req = { ...evalReq(profileId, sessionId), childRowId: ids[1] ?? "" };
    const first = await runChatEval(req, ai());
    expect(first).toEqual({ called: true, written: true, failure: "invalid" });
    const calls = h.fake.requests.length;
    const second = await runChatEval(req, ai());
    expect(second.called).toBe(false);
    expect(h.fake.requests).toHaveLength(calls);
    const rows = await rowsOf(sessionId);
    expect(
      readChatJudge(rows.find((r) => r.id === ids[1])?.chatJudge)?.legacy,
    ).toMatchObject({ status: "failed", failure: "invalid" });
  });

  it("AC-27i 닫을 때 남은 기다림을 평가한 뒤 비교 표지 행(real)을 쓰고, 닫힌 뒤 늦게 온 값은 표지 행을 다시 센다", async () => {
    const { profileId, sessionId } = await newSession();
    const ids = await seedDialog(sessionId, [
      { teacher: "Where do you go?" },
      { child: "I go to the beach." },
      { teacher: "Nice!" },
      { child: "I see the sea." },
    ]);
    // 닫기 전에 표지 행을 먼저 쓴 꼴(기다림 둘)
    const early = await writeChatCompare(db, {
      sessionId,
      met: ["beach"],
      homophones: [],
      at: NOW,
    });
    expect(early.summary.counts.waiting).toBe(2);
    h.fake.push({
      reply: {
        kind: "message",
        body: messageBody({ model: EVAL_MODEL, json: EVAL_OUT }),
      },
    });
    const late = await runChatEval(
      { ...evalReq(profileId, sessionId), childRowId: ids[1] ?? "" },
      ai(),
    );
    expect(late.written).toBe(true);
    const [mark] = await db
      .select()
      .from(attempts)
      .where(eq(attempts.clientAttemptId, chatCompareAttemptId(sessionId)));
    const recount = ChatCompareMarkSchema.parse(mark?.input);
    expect(recount.summary.counts).toMatchObject({ done: 1, waiting: 1 });
    expect(recount.summary.met).toEqual(["beach"]);

    const closed = await runChatEvalsOnClose(
      { ...evalReq(profileId, sessionId), met: ["beach", "sea"] },
      ai(),
    );
    expect(closed.evals).toHaveLength(1);
    expect(closed.compare?.summary).toMatchObject({
      source: "real",
      counts: { childTurns: 2, done: 2, waiting: 0 },
      met: ["beach", "sea"],
    });
  });
});

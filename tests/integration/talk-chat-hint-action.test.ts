// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R plan 묶음 S2)의 힌트 받는 서버 액션 통합 시험(15절 AC-27g).
// 이야기 방식 수업이면 revealTalkLessonHint 가 S0 의 힌트 요청(requestChatHint — 표지 행으로 묶은 힌트 호출 · 선생님 행 ai_question 저장)으로 간다:
// 단 목록 · 청한 단의 글(P5 chatHintReplyOf), 실패와 다시 받기(상한 talk.chat_hint_retry_max), 막힌 뒤 설명(다른 표지 행 — 설명의 실패가 힌트의 첫 누름에
// 닿지 않음), 'AI 쉬는 중'에도 저장된 단은 냄, 카드 인사 질문과 같은 말이어도 카드 힌트가 끼어들지 않음, 대화 토막 선생님 행이 아니면 부르지 않음.
// 기존 방식 수업은 지금 길 그대로(연 단 글 하나, AI 없음). 이야기 방식의 행은 턴 길(묶음 S1)을 거치지 않고 바로 넣는다. 수업 상태 읽기가 조용함 행을
// 거르는 것은 묶음 S1 몫이다. 이 기기에서는 돌지 않고 CI 가 돌린다.
import { and, eq, isNull, like } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TALK_LEAD_TEXT_L3U1 } from "@/core/ai/calls/talk-lead";
import { talkMoveOf } from "@/core/conversation/move";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { lessons } from "@/db/schema/content";
import { attempts, sessions, talkTurns } from "@/db/schema/learning";
import { settings } from "@/db/schema/operations";
import {
  loadTalkLessonView,
  revealTalkLessonHint,
} from "@/server/conversation";
import {
  ChatHintMarkSchema,
  chatExplainAttemptId,
  chatHintAttemptId,
} from "@/server/conversation/chat-hint";
import type { Db } from "@/server/db";
import { messageBody } from "../fixtures/ai/fake-anthropic";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  capAtCurrentCalls,
  harnessOf,
  NOW,
  resetHousehold,
  setHouseholdSetting,
  setupTalkDb,
  type TalkDb,
  type TalkHarness,
} from "./talk-fixture";

type Card = ReturnType<typeof TalkLessonSchema.parse>["card"];

const HINT_MODEL = TEST_SETTINGS["ai.model.talk_chat_hint"].value;
const RETRY_MAX = TEST_SETTINGS["talk.chat_hint_retry_max"].value;
const HINT_JSON = {
  hint_ko: "나는 바다에 가요.",
  hint_en: "I go to the beach.",
  explain_ko: "선생님이 주말에 어디 가는지 물었어요.",
};

let talk: TalkDb;
let db: Db;
let h: TalkHarness;
let lessonId: string;
let revision: number;
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
  lessonId = first.id;
  revision = first.revision;
  card = TalkLessonSchema.parse(first.content).card;
});

afterAll(async () => {
  await talk?.testDb.drop();
});

beforeEach(async () => {
  h = harnessOf(db);
  await setHouseholdSetting(db, "talk.lead_mode", "chat");
});

// ── 도우미(이 파일 몫) ──────────────────────────────────────────────

async function session(
  mode: "chat" | "app" = "chat",
  segment: "talk" | "prep" = "talk",
): Promise<{ profileId: string; sessionId: string }> {
  await setHouseholdSetting(db, "talk.lead_mode", mode);
  const profileId = await resetHousehold(db, 1);
  const [row] = await db
    .insert(sessions)
    .values({
      profileId,
      area: "talk",
      level: 1,
      unit: 1,
      lessonId,
      kind: "regular",
      status: "in_progress",
      startedAt: NOW,
      seedRevision: revision,
      seedCorrection: 0,
    })
    .returning({ id: sessions.id });
  if (!row) throw new Error("세션을 넣지 못했다");
  await loadTalkLessonView(
    { sessionId: row.id },
    { ...h.deps(), leadText: () => TALK_LEAD_TEXT_L3U1 },
  );
  if (mode === "chat")
    await db
      .update(sessions)
      .set({ talkSegment: segment })
      .where(eq(sessions.id, row.id));
  return { profileId, sessionId: row.id };
}

const sayJson = (say: string) =>
  JSON.stringify({ listen_sentence: "", say, say_ko: "", wrap_up: false });

async function nextTurn(sessionId: string): Promise<number> {
  const rows = await db
    .select({ turnNo: talkTurns.turnNo })
    .from(talkTurns)
    .where(eq(talkTurns.sessionId, sessionId));
  return rows.reduce((m, r) => Math.max(m, r.turnNo), 0) + 1;
}

/** 이야기 방식 선생님 행 하나(ai_question 빔 — 턴 길이 넣는 꼴). id 를 돌려준다. */
async function teacherRow(
  sessionId: string,
  say: string,
  segment: "talk" | "prep" = "talk",
): Promise<string> {
  const [row] = await db
    .insert(talkTurns)
    .values({
      sessionId,
      turnNo: await nextTurn(sessionId),
      segment,
      speaker: "tori",
      text: say,
      toriRewrite: sayJson(say),
      move: talkMoveOf({
        kind: "ai",
        chat: { level: {}, madeUp: [], facts: [], run: 0 },
      }),
      recordedAt: NOW,
    })
    .returning({ id: talkTurns.id });
  if (!row) throw new Error("선생님 행을 넣지 못했다");
  return row.id;
}

async function childRow(
  sessionId: string,
  over: { text?: string; quiet?: boolean; dontKnow?: boolean } = {},
) {
  const turnNo = await nextTurn(sessionId);
  await db.insert(talkTurns).values({
    sessionId,
    turnNo,
    segment: "talk",
    speaker: "child",
    text: over.quiet || over.dontKnow ? null : (over.text ?? "I like it."),
    inputMode: over.quiet ? "quiet" : over.dontKnow ? "dont_know" : "speech",
    clientAttemptId: `hint-${sessionId}-${turnNo}`,
    recordedAt: NOW,
  });
}

const hintOk = (times = 1) => ({
  reply: {
    kind: "message" as const,
    body: messageBody({ model: HINT_MODEL, json: HINT_JSON }),
  },
  times,
});

async function marksOf(sessionId: string) {
  return db
    .select({ id: attempts.clientAttemptId, input: attempts.input })
    .from(attempts)
    .where(
      and(
        eq(attempts.sessionId, sessionId),
        like(attempts.clientAttemptId, "talk-chat-hint:%"),
      ),
    );
}

const reveal = (sessionId: string, over: Record<string, unknown> = {}) =>
  revealTalkLessonHint({ sessionId, tier: 0, ...over }, h.deps());

// ── 시험 ───────────────────────────────────────────────────────────

describe("AC-27g 이야기 방식의 힌트 받는 서버 액션(묶음 S2)", () => {
  it("AC-27g 첫 누름은 힌트 호출 한 번으로 단 목록과 첫 단의 글을 받고, 다음 단은 저장된 값으로 낸다(호출 1)", async () => {
    const { sessionId } = await session();
    await teacherRow(sessionId, "Where do you go on weekends?");
    h.fake.push(hintOk());
    const first = await reveal(sessionId);
    expect(first).toMatchObject({ ok: true, tier: 0, text: HINT_JSON.hint_ko });
    const tiers = "tiers" in first ? first.tiers : [];
    expect(tiers.length).toBeGreaterThanOrEqual(2);
    const last = await reveal(sessionId, { tier: tiers.length - 1 });
    expect(last).toMatchObject({ ok: true, text: HINT_JSON.hint_en });
    expect(h.fake.requests).toHaveLength(1);
  });

  it("AC-27g 선생님 말이 카드 인사 질문과 같아도 카드 힌트가 끼어들지 않고 힌트 호출의 단이 나온다", async () => {
    const { sessionId } = await session();
    const g = card.greeting;
    const cardQuestion =
      "questions" in g ? (g.questions[0]?.question.en ?? "") : g.firstLine.en;
    await teacherRow(sessionId, cardQuestion);
    h.fake.push(hintOk());
    expect(await reveal(sessionId)).toMatchObject({
      ok: true,
      text: HINT_JSON.hint_ko,
    });
    expect(h.fake.requests).toHaveLength(1);
    // 다시 들어올 때의 자료도 카드 힌트를 싣지 않는다
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.current?.hints).toEqual([]);
  });

  it("AC-27g 호출이 실패하면 다시 받기가 있고, 다시 받기 상한을 넘으면 문구만이다", async () => {
    const { sessionId } = await session();
    const teacherId = await teacherRow(sessionId, "What do you like to eat?");
    h.fake.push({ reply: { kind: "network-error" } });
    expect(await reveal(sessionId)).toEqual({ ok: false, retry: true });
    for (let n = 1; n <= RETRY_MAX; n++)
      expect(await reveal(sessionId, { retry: n })).toEqual({
        ok: false,
        retry: n < RETRY_MAX,
      });
    const ids = (await marksOf(sessionId)).map((m) => m.id).sort();
    expect(ids).toEqual(
      Array.from({ length: RETRY_MAX + 1 }, (_, n) =>
        chatHintAttemptId(teacherId, n),
      ).sort(),
    );
  });

  it("AC-27g 막힌 뒤 설명은 같은 액션으로 받고(설명 표지 행), 설명이 실패해도 힌트 첫 누름은 제 표지 행으로 한 번 부른다", async () => {
    const { sessionId } = await session();
    await teacherRow(sessionId, "Do you like the sea?");
    await childRow(sessionId, { dontKnow: true });
    const teacherId = await teacherRow(
      sessionId,
      "Do you like the sea? Yes or no?",
    );
    h.fake.push({ reply: { kind: "network-error" }, times: 1 });
    expect(await reveal(sessionId, { explain: true })).toEqual({ ok: false });
    h.fake.push(hintOk());
    expect(await reveal(sessionId)).toMatchObject({
      ok: true,
      text: HINT_JSON.hint_ko,
    });
    const marks = await marksOf(sessionId);
    const explain = marks.find((m) => m.id === chatExplainAttemptId(teacherId));
    const hint = marks.find((m) => m.id === chatHintAttemptId(teacherId, 0));
    expect(ChatHintMarkSchema.parse(explain?.input)).toMatchObject({
      state: "failed",
      explain: true,
    });
    expect(ChatHintMarkSchema.parse(hint?.input).state).toBe("done");
    // 설명을 다시 청하면 저장된 설명이 나온다(호출 없음)
    const before = h.fake.requests.length;
    expect(await reveal(sessionId, { explain: true })).toEqual({
      ok: true,
      text: HINT_JSON.explain_ko,
    });
    expect(h.fake.requests.length).toBe(before);
  });

  it("AC-27g 'AI 쉬는 중'이면 부르지 않고 다시 받기 없이 문구만, 저장된 단은 그대로 낸다", async () => {
    const { profileId, sessionId } = await session();
    await teacherRow(sessionId, "Where do you go on weekends?");
    h.fake.push(hintOk());
    expect((await reveal(sessionId)).ok).toBe(true);
    await capAtCurrentCalls(db, profileId);
    const calls = h.fake.requests.length;
    expect((await reveal(sessionId, { tier: 1 })).ok).toBe(true);
    await childRow(sessionId, { text: "I go to the park." });
    await teacherRow(sessionId, "The park! What do you do there?");
    expect(await reveal(sessionId)).toEqual({ ok: false, retry: false });
    expect(h.fake.requests.length).toBe(calls);
  });

  it("AC-27g 조용함 행이 있는 수업에서도 힌트가 나온다(상태는 조용함 행을 거른 꼴로 읽음)", async () => {
    const { sessionId } = await session();
    await teacherRow(sessionId, "I went to the zoo today.");
    await childRow(sessionId, { quiet: true });
    await teacherRow(sessionId, "I saw a big lion!");
    h.fake.push(hintOk());
    expect(await reveal(sessionId)).toMatchObject({
      ok: true,
      text: HINT_JSON.hint_ko,
    });
  });

  it("AC-27g 지금 선생님 행이 대화 토막의 행이 아니면 힌트 호출을 부르지 않는다", async () => {
    const { sessionId } = await session("chat", "prep");
    await teacherRow(sessionId, "Let's practice words.", "prep");
    expect(await reveal(sessionId)).toEqual({ ok: false, retry: false });
    expect(h.fake.requests).toHaveLength(0);
    expect(await marksOf(sessionId)).toEqual([]);
  });

  it("AC-27g 힌트 액션이 던짐으로 끝나면 힌트는 P5 의 실패 꼴(다시 받기 없음), 설명은 문구 없는 실패다(검토 M-6)", async () => {
    const { sessionId } = await session();
    await teacherRow(sessionId, "Where do you go on weekends?");
    // 힌트 받기가 읽는 설정 하나를 지워 설정 읽기가 던지게 한다(시험 뒤 되돌림)
    const key = "ai.timeout_seconds.realtime";
    const saved = await db
      .select()
      .from(settings)
      .where(and(eq(settings.key, key), isNull(settings.profileId)));
    await db
      .delete(settings)
      .where(and(eq(settings.key, key), isNull(settings.profileId)));
    try {
      expect(await reveal(sessionId)).toEqual({ ok: false, retry: false });
      expect(await reveal(sessionId, { explain: true })).toEqual({ ok: false });
      expect(h.fake.requests).toHaveLength(0);
    } finally {
      if (saved.length > 0) await db.insert(settings).values(saved);
    }
  });

  it("AC-27g 기존 방식 수업은 지금 길 그대로다(연 단의 글 하나, AI 호출 없음, 표지 행 없음)", async () => {
    const { sessionId } = await session("app");
    const out = await reveal(sessionId);
    expect(Object.keys(out).sort()).toEqual(out.ok ? ["ok", "text"] : ["ok"]);
    expect(h.fake.requests).toHaveLength(0);
    expect(await marksOf(sessionId)).toEqual([]);
  });
});

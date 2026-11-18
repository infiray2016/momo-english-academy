// 수업 안 한국어 질문 길 통합 시험(수업 안 한국어로 묻기 plan 묶음 4-나 — 이 기기에서는 돌지 않고 CI 에서 돈다). 시험용 시드의 회화 1단계
// 단원 1 수업으로 세션을 넣고 talk_turns 를 대화 첫 질문(아이 차례가 열린 상태)까지 넣은 뒤 runTalkKoHelpRequest 를 가짜 Anthropic 으로 부른다.
// 증명: AC-25g(회화 턴 호출 0 · 한국어 도움 호출 1 · ai_calls 목적 행 · 대신 줄 두 꼴이 남음) · AC-25i(행 하나 · talk_turns 불변 · 같은 시도 id ·
// 세션과 함께 지움 · 화면 자료 koHelps) · AC-25m(끔이면 요청 거절 · 화면 자료에 단추 없음) · AC-N29(하루 호출 셈에 듦 — 상한에 닿으면 쉼).
// 검토 rev-b4b I-2(같은 시도 id 의 겹친 요청은 먼저 채운 쪽이 이김) · M-4(화면 자료 쪽 단언 · 답 없는 행의 낡음)도 여기서 본다.
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { talkMoveOf } from "@/core/conversation/move";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { LEVEL_MAX } from "@/core/seed/structure";
import { lessons } from "@/db/schema/content";
import { sessions, talkKoHelps, talkTurns } from "@/db/schema/learning";
import { aiCalls, settings } from "@/db/schema/operations";
import { loadTalkLessonView } from "@/server/conversation";
import { runTalkKoHelpRequest } from "@/server/conversation/ko-help";
import type { Db } from "@/server/db";
import { loadSeed } from "@/server/seed/load";
import {
  errorBody,
  TALK_KO_HELP_PURPOSE,
  talkKoHelpRule,
} from "../fixtures/ai/fake-anthropic";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import {
  capAtCurrentCalls,
  ENGLISH_NAME,
  harnessOf,
  LOADED_AT,
  LOW_MODEL,
  NOW,
  resetHousehold,
  setHouseholdSetting,
  type TalkHarness,
} from "./talk-fixture";
import { createTestDatabase, type TestDatabase } from "./test-db";

let testDb: TestDatabase;
let db: Db;
let h: TalkHarness;
let lessonId: string;
let lessonRevision: number;
let card: ReturnType<typeof TalkLessonSchema.parse>["card"];

beforeAll(async () => {
  testDb = await createTestDatabase();
  db = testDb.db;
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
    .where(
      and(
        eq(settings.key, "seed.complete_through_level"),
        isNull(settings.profileId),
      ),
    );
  const [row] = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "talk"),
        eq(lessons.level, 1),
        eq(lessons.unit, 1),
        eq(lessons.kind, "assigned"),
        eq(lessons.lessonNo, 1),
      ),
    );
  if (!row) throw new Error("회화 1단계 단원 1 수업 1 이 없다");
  lessonId = row.id;
  lessonRevision = row.revision;
  card = TalkLessonSchema.parse(row.content).card;
});

afterAll(async () => {
  await testDb?.drop();
});

beforeEach(async () => {
  h = harnessOf(db);
  await setHouseholdSetting(db, "talk.ko_ask_mode", "on");
});

/** 세션 하나를 대화 첫 질문(필수 1, 아이 차례가 열림)까지 넣는다. */
async function openSession(profileId: string): Promise<string> {
  const [session] = await db
    .insert(sessions)
    .values({
      profileId,
      area: "talk",
      level: 1,
      unit: 1,
      lessonId,
      kind: "regular",
      talkSegment: "talk",
      status: "in_progress",
      startedAt: NOW,
      seedRevision: lessonRevision,
      seedCorrection: 0,
    })
    .returning({ id: sessions.id });
  if (!session) throw new Error("세션을 넣지 못했다");
  const first = card.required[0];
  if (!first) throw new Error("필수 질문이 없다");
  const greeting = "questions" in card.greeting ? card.greeting.questions : [];
  let turnNo = 1;
  for (const [i, q] of greeting.slice(0, card.greetingTurns).entries()) {
    await db.insert(talkTurns).values([
      {
        sessionId: session.id,
        turnNo,
        segment: "greeting",
        speaker: "tori",
        text: q.question.en,
        move: talkMoveOf({ kind: i === 0 ? "first_question" : "card_slot" }),
        recordedAt: NOW,
      },
      {
        sessionId: session.id,
        turnNo,
        segment: "greeting",
        speaker: "child",
        text: q.answerExample,
        inputMode: "speech",
        clientAttemptId: `greet-${session.id}-${i}`,
        recordedAt: NOW,
      },
    ]);
    turnNo += 1;
  }
  await db.insert(talkTurns).values([
    {
      sessionId: session.id,
      turnNo,
      segment: "greeting",
      speaker: "tori",
      text: "Great!",
      move: talkMoveOf({ kind: "ai" }),
      recordedAt: NOW,
    },
    {
      sessionId: session.id,
      turnNo: turnNo + 1,
      segment: "talk",
      speaker: "tori",
      text: first.en,
      move: talkMoveOf({
        kind: "first_question",
        item: { kind: "required", no: first.no },
        words: [...first.targets],
        goals: [...first.goals],
      }),
      recordedAt: NOW,
    },
  ]);
  return session.id;
}

let attempt = 0;
const nextAttempt = () => {
  attempt += 1;
  return `ko-${attempt}`;
};

function ask(
  sessionId: string,
  over: Record<string, unknown> = {},
): ReturnType<typeof runTalkKoHelpRequest> {
  return runTalkKoHelpRequest(
    {
      sessionId,
      clientAttemptId: nextAttempt(),
      question: "조개는 영어로 뭐야?",
      hint: { opened: 0 },
      ...over,
    },
    h.deps(),
  );
}

const koHelpRows = (sessionId: string) =>
  db.select().from(talkKoHelps).where(eq(talkKoHelps.sessionId, sessionId));
const turnRows = (sessionId: string) =>
  db.select().from(talkTurns).where(eq(talkTurns.sessionId, sessionId));
const callRows = (profileId: string) =>
  db.select().from(aiCalls).where(eq(aiCalls.profileId, profileId));
const koHelpRequests = () =>
  h.fake.requests.filter((r) => r.bodyText.includes(TALK_KO_HELP_PURPOSE));

const expressionRule = () =>
  talkKoHelpRule({
    model: LOW_MODEL,
    kind: "expression",
    sayKo: "이렇게 말하면 돼. 잘 듣고 따라 해 봐.",
    teachEn: "I found a shell.",
  });

describe("수업 안 한국어 질문 길(통합)", () => {
  it("AC-25g AC-25i 한국어 질문: 한국어 도움 호출 한 번 · 회화 턴 호출 0 · ai_calls 목적 talk_ko_help 행 · talk_ko_helps 한 행이고 talk_turns 는 그대로다", async () => {
    const profileId = await resetHousehold(db, 1);
    const sessionId = await openSession(profileId);
    const before = await turnRows(sessionId);
    h.fake.push(expressionRule());
    const reply = await ask(sessionId, {
      question: `${ENGLISH_NAME}는 조개를 영어로 어떻게 말해?`,
    });
    expect(reply).toMatchObject({
      t: "ok",
      help: {
        seq: 1,
        kind: "expression",
        sayKo: "이렇게 말하면 돼. 잘 듣고 따라 해 봐.",
        teachEn: "I found a shell.",
        textShown: false,
        fallback: "none",
        replay: "taught",
      },
    });
    expect(h.fake.requests).toHaveLength(1);
    expect(koHelpRequests()).toHaveLength(1);
    // 아이 이름은 보내지 않는다(가린 질문)
    expect(h.fake.requests[0]?.bodyText).not.toContain(ENGLISH_NAME);
    expect(h.fake.requests[0]?.bodyText).toContain("Your last words");
    const calls = await callRows(profileId);
    expect(calls.map((c) => c.purpose)).toEqual(["talk_ko_help"]);
    expect(calls[0]?.sessionId).toBe(sessionId);
    const rows = await koHelpRows(sessionId);
    expect(rows).toHaveLength(1);
    const lastTeacher = before
      .filter((r) => r.speaker === "tori")
      .sort((a, b) => a.turnNo - b.turnNo)
      .at(-1);
    expect(rows[0]).toMatchObject({
      turnNo: lastTeacher?.turnNo,
      seq: 1,
      kind: "expression",
      fallback: "none",
      textShown: false,
    });
    expect(rows[0]?.question).not.toContain(ENGLISH_NAME);
    expect(rows[0]?.question).toContain("{NAME}");
    expect(rows[0]?.answeredAt).not.toBeNull();
    expect(await turnRows(sessionId)).toEqual(before);
    // 화면 자료(접점 라 · 검토 rev-b4b M-4): 단추가 켜져 있고, 지금 열린 아이 차례가 읽는 도움 하나(1단계라도 open 이면 가르친 표현 글을 싣는다)
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.settings.koAsk.on).toBe(true);
    expect(view?.koHelps).toHaveLength(1);
    expect(view?.koHelps[0]).toMatchObject({
      turnNo: lastTeacher?.turnNo,
      seq: 1,
      open: true,
      sayKo: "이렇게 말하면 돼. 잘 듣고 따라 해 봐.",
      teachEn: "I found a shell.",
      replay: "taught",
    });
  });

  it("같은 시도 id 의 두 요청이 겹쳐 둘 다 불러도 답은 먼저 채운 쪽이 이겨서 두 응답과 저장된 답이 같다(검토 rev-b4b I-2)", async () => {
    const profileId = await resetHousehold(db, 1);
    const sessionId = await openSession(profileId);
    // 먼저 닿은 호출이 늦게 끝나게 한다(기기가 느린 첫 요청을 같은 id 로 다시 보낸 꼴)
    h.fake.push(
      talkKoHelpRule({
        model: LOW_MODEL,
        kind: "meaning",
        sayKo: "느린 첫 답이야.",
        times: 1,
        delayMs: 500,
      }),
    );
    h.fake.push(
      talkKoHelpRule({
        model: LOW_MODEL,
        kind: "meaning",
        sayKo: "빠른 둘째 답이야.",
        times: 1,
      }),
    );
    const id = nextAttempt();
    const [a, b] = await Promise.all([
      ask(sessionId, { clientAttemptId: id }),
      ask(sessionId, { clientAttemptId: id }),
    ]);
    if (a.t !== "ok" || b.t !== "ok") throw new Error("두 응답이 ok 가 아니다");
    const rows = await koHelpRows(sessionId);
    expect(rows).toHaveLength(1);
    expect(a.help.sayKo).toBe(b.help.sayKo);
    expect(rows[0]?.sayKo).toBe(a.help.sayKo);
  });

  it("AC-25i 같은 시도 id 를 다시 보내면 행이 늘지 않고 호출 없이 저장된 답을 돌려준다 — 다른 세션의 같은 시도 id 는 stale", async () => {
    const profileId = await resetHousehold(db, 1);
    const sessionId = await openSession(profileId);
    h.fake.push(expressionRule());
    const id = nextAttempt();
    const first = await ask(sessionId, { clientAttemptId: id });
    const again = await ask(sessionId, { clientAttemptId: id });
    expect(again).toEqual(first);
    expect(koHelpRequests()).toHaveLength(1);
    expect(await koHelpRows(sessionId)).toHaveLength(1);
    // 진행 중인 세션은 프로필 · 영역마다 하나뿐이다(sessions_one_in_progress_unique). 앞 세션을 닫은 뒤에 새 세션을 연다(도움 행은 남는다)
    await db
      .update(sessions)
      .set({ status: "aborted" })
      .where(eq(sessions.id, sessionId));
    const other = await openSession(profileId);
    expect(await ask(other, { clientAttemptId: id })).toEqual({ t: "stale" });
    expect(await koHelpRows(other)).toHaveLength(0);
  });

  it("AC-25i 답이 비어 있는 행(호출 중에 끊김)은 같은 시도 id 로 다시 부르고 같은 행을 채운다", async () => {
    const profileId = await resetHousehold(db, 1);
    const sessionId = await openSession(profileId);
    const teacher = (await turnRows(sessionId))
      .filter((r) => r.speaker === "tori")
      .sort((a, b) => a.turnNo - b.turnNo)
      .at(-1);
    await db.insert(talkKoHelps).values([
      {
        sessionId,
        turnNo: teacher?.turnNo ?? 0,
        seq: 1,
        clientAttemptId: "ko-cut",
        question: "조개는 영어로 뭐야?",
        askedAt: NOW,
      },
      {
        sessionId,
        turnNo: teacher?.turnNo ?? 0,
        seq: 2,
        clientAttemptId: "ko-cut-late",
        question: "방금 뭐라고 했어?",
        askedAt: NOW,
      },
    ]);
    h.fake.push(expressionRule());
    const reply = await ask(sessionId, { clientAttemptId: "ko-cut" });
    expect(reply).toMatchObject({ t: "ok", help: { seq: 1 } });
    const rows = await koHelpRows(sessionId);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.seq === 1)?.sayKo).not.toBeNull();
    // 답 없는 자기 행인데 아이 차례가 넘어갔으면(그 차례의 아이 행이 생김) 다시 부르지 않고 stale 이다(검토 rev-b4b M-4)
    await db.insert(talkTurns).values({
      sessionId,
      turnNo: teacher?.turnNo ?? 0,
      segment: "talk",
      speaker: "child",
      text: "I like it.",
      inputMode: "speech",
      clientAttemptId: "child-after-cut",
      recordedAt: NOW,
    });
    expect(await ask(sessionId, { clientAttemptId: "ko-cut-late" })).toEqual({
      t: "stale",
    });
    expect(koHelpRequests()).toHaveLength(1);
    const late = (await koHelpRows(sessionId)).find((r) => r.seq === 2);
    expect(late?.sayKo).toBeNull();
    expect(late?.answeredAt).toBeNull();
  });

  it("AC-25g 호출이 실패하면 호출 실패 꼴의 대신 줄이고 그 차례도 talk_ko_helps 에 남는다 — 순번은 이어진다", async () => {
    const profileId = await resetHousehold(db, 1);
    const sessionId = await openSession(profileId);
    h.fake.push({
      when: { purpose: TALK_KO_HELP_PURPOSE },
      reply: {
        kind: "error",
        status: 400,
        body: errorBody(400, "invalid_request_error", "bad request"),
      },
    });
    const reply = await ask(sessionId);
    expect(reply).toMatchObject({
      t: "ok",
      help: { kind: null, fallback: "call_failed", replay: "teacher_line" },
    });
    h.fake.reset();
    h.fake.push(
      talkKoHelpRule({
        model: LOW_MODEL,
        kind: "meaning",
        sayKo: "방금 무엇을 찾았는지 물어본 거야.",
      }),
    );
    const second = await ask(sessionId, { question: "방금 뭐라고 했어?" });
    expect(second).toMatchObject({
      t: "ok",
      help: { seq: 2, kind: "meaning", fallback: "none" },
    });
    const rows = await koHelpRows(sessionId);
    expect(rows.map((r) => r.fallback).sort()).toEqual(["call_failed", "none"]);
  });

  it("AC-25m talk.ko_ask_mode 가 off 면 요청을 받지 않는다(행 · 호출 없음)", async () => {
    const profileId = await resetHousehold(db, 1);
    const sessionId = await openSession(profileId);
    await setHouseholdSetting(db, "talk.ko_ask_mode", "off");
    h.fake.push(expressionRule());
    expect(await ask(sessionId)).toEqual({ t: "off" });
    expect(h.fake.requests).toHaveLength(0);
    expect(await koHelpRows(sessionId)).toHaveLength(0);
    // 화면 자료(검토 rev-b4b M-4): 끔이면 단추가 없고(on 거짓) 도움 목록도 비어 있다
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.settings.koAsk.on).toBe(false);
    expect(view?.koHelps).toEqual([]);
  });

  it("AC-N29 한국어 도움 호출은 하루 호출 셈에 든다 — 상한에 닿으면 'AI 쉬는 중'이고 행 · 호출이 없다", async () => {
    const profileId = await resetHousehold(db, 1);
    const sessionId = await openSession(profileId);
    h.fake.push(expressionRule());
    await ask(sessionId);
    await capAtCurrentCalls(db, profileId);
    expect(await ask(sessionId)).toEqual({ t: "resting" });
    expect(koHelpRequests()).toHaveLength(1);
    expect(await koHelpRows(sessionId)).toHaveLength(1);
  });

  it("한국어 질문은 아이 차례가 열려 있을 때만이다 — 마지막 행이 아이 행이면 stale", async () => {
    const profileId = await resetHousehold(db, 1);
    const sessionId = await openSession(profileId);
    const teacher = (await turnRows(sessionId))
      .filter((r) => r.speaker === "tori")
      .sort((a, b) => a.turnNo - b.turnNo)
      .at(-1);
    await db.insert(talkTurns).values({
      sessionId,
      turnNo: teacher?.turnNo ?? 0,
      segment: "talk",
      speaker: "child",
      text: "I like it.",
      inputMode: "speech",
      clientAttemptId: "orphan-1",
      recordedAt: NOW,
    });
    h.fake.push(expressionRule());
    expect(await ask(sessionId)).toEqual({ t: "stale" });
    expect(h.fake.requests).toHaveLength(0);
  });

  it("AC-25i 세션을 지우면 그 세션의 한국어 도움 행도 함께 지워진다", async () => {
    const profileId = await resetHousehold(db, 1);
    const sessionId = await openSession(profileId);
    h.fake.push(expressionRule());
    await ask(sessionId);
    expect(await koHelpRows(sessionId)).toHaveLength(1);
    await db.delete(talkTurns).where(eq(talkTurns.sessionId, sessionId));
    await db.delete(aiCalls).where(eq(aiCalls.sessionId, sessionId));
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    expect(await koHelpRows(sessionId)).toHaveLength(0);
  });
});

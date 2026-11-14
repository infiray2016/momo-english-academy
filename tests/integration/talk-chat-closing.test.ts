// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R plan 묶음 S2)의 닫는 길 통합 시험(15절 AC-27i · AC-27u).
// (1) 닫는 세 길(정리 끝 · 중단 · 30분 닫힘)에서 남은 '기다림' 아이 행의 평가를 한 번 부르고 비교 표지 행을 쓴다. 그 일은 닫는 응답 뒤에 돌고, 실패해도
//     닫힘(정리 토막 · 끝맺음 기록)은 그대로다. 끝맺음의 보낸 메시지 지우기는 기존 두 방식과 같이 끝맺음 결과와 한 거래다(평가를 기다리지 않음 —
//     fix 1 I-3). 'AI 쉬는 중'이면 평가를 부르지 않고 기다림으로 남긴 채 비교 표지 행만 쓴다(M-1). 판정 맥락의 단원 단어는 턴 길과 같은 단계 맥락의
//     값이라 닫은 뒤의 다시 세기가 앞 차례의 판정 기록을 바꾸지 않는다(I-2).
// (2) 끝맺음 턴의 입력은 지금 길 그대로 대화 기록의 짝(아이 행의 보낸 사용자 메시지 · 다음 선생님 행의 기록 글)이고, 조용함 행은 '누르지 않음' 입력
//     줄로 들어가며 입구로 연 선생님 차례의 말(수업 첫 말 · 짧은 준비 뒤 돌아옴)은 짝에 들지 않는다. 그 꼴로 끝맺음 응답 검증 · 끝인사 검사를 지난다.
// 이야기 방식의 턴 길(묶음 S1)을 거치지 않고 행을 바로 넣는다(턴 길이 쓰는 꼴 — 아이 행 첫 chat_judge 는 기다림 · 부르지 않음). 수업 상태 읽기가 조용함
// 행을 거르는 것은 묶음 S1 몫이다. 공용 재료(talk-fixture.ts)는 고치지 않는다. 이 기기에서는 돌지 않고 CI 가 돌린다.
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TALK_CHAT_EVAL_SYSTEM } from "@/core/ai/calls/talk-chat-eval";
import { TALK_LEAD_TEXT_L3U1 } from "@/core/ai/calls/talk-lead";
import { chatJudgesOf, readChatJudge } from "@/core/conversation/chat-judge";
import { talkMoveOf } from "@/core/conversation/move";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { lessons, vocab } from "@/db/schema/content";
import { attempts, sessions, talkTurns } from "@/db/schema/learning";
import { aiCalls } from "@/db/schema/operations";
import { insertAiCall } from "@/server/ai/store";
import {
  chooseLessonMoreTalk,
  closeIdleTalks,
  leaveTalkLesson,
  loadTalkLessonView,
  stopTalkLesson,
  talkClosingStatus,
} from "@/server/conversation";
import {
  ChatCompareMarkSchema,
  chatCompareAttemptId,
  chatJudgeRowsOf,
  runChatEval,
} from "@/server/conversation/chat-eval";
import {
  chatJudgeContextFrom,
  readChatUnitWords,
} from "@/server/conversation/chat-unit-words";
import {
  readTalkAnyState,
  type TalkLessonState,
} from "@/server/conversation/state";
import type { Db } from "@/server/db";
import { levelContextOf } from "@/server/session/ai-context";
import { messageBody } from "../fixtures/ai/fake-anthropic";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  CLOSING_MARK,
  capAtCurrentCalls,
  harnessOf,
  lessonClosingRule,
  MS_PER_MINUTE,
  NOW,
  requestsOf,
  resetHousehold,
  setHouseholdSetting,
  setupTalkDb,
  type TalkDb,
  type TalkHarness,
} from "./talk-fixture";

const EVAL_MODEL = TEST_SETTINGS["ai.model.talk_chat_eval"].value;
/** 평가 호출 요청을 가르는 글(평가 안내문 첫머리). */
const EVAL_MARK = TALK_CHAT_EVAL_SYSTEM.slice(0, 40);
const EVAL_OUT = {
  reading: "clear_answer",
  teacher_move: "react_and_follow_up",
  model_sentence: "",
  child_used_on_own: [],
};
const QUIET_LINE = "(The child did not press the talk button.)";

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
    .where(
      and(eq(lessons.area, "talk"), eq(lessons.level, 1), eq(lessons.unit, 1)),
    );
  const first = rows.find((r) => r.kind === "assigned" && r.lessonNo === 1);
  if (!first) throw new Error("회화 1단계 단원 1 수업 1 이 없다");
  lessonId = first.id;
  revision = first.revision;
});

afterAll(async () => {
  await talk?.testDb.drop();
});

beforeEach(async () => {
  h = harnessOf(db);
  await setHouseholdSetting(db, "talk.lead_mode", "chat");
});

// ── 도우미(이 파일 몫) ──────────────────────────────────────────────

/** 이야기 방식으로 연 세션(처음 스냅숏 chat, 행 없음). */
async function chatSession(
  segment: "greeting" | "talk" = "talk",
): Promise<{ profileId: string; sessionId: string }> {
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
      startedAt: NOW,
      seedRevision: revision,
      seedCorrection: 0,
    })
    .returning({ id: sessions.id });
  if (!session) throw new Error("세션을 넣지 못했다");
  await loadTalkLessonView(
    { sessionId: session.id },
    { ...h.deps(), leadText: () => TALK_LEAD_TEXT_L3U1 },
  );
  await db
    .update(sessions)
    .set({ talkSegment: segment })
    .where(eq(sessions.id, session.id));
  return { profileId, sessionId: session.id };
}

const sayJson = (say: string) =>
  JSON.stringify({ listen_sentence: "", say, say_ko: "", wrap_up: false });

type Turn =
  | {
      teacher: string;
      /** 입구로 연 차례면 그 사용자 메시지(선생님 행에 둔다 — 턴 길의 꼴). */
      entry?: string;
      kind?: "ai" | "first_question" | "closing_slot";
    }
  | { child: string }
  | { quiet: true };

/** 행을 차례대로 넣고 아이 행의 첫 chat_judge(기다림 · 부르지 않음)를 쓴다. 아이 행 id 를 차례대로 돌려준다. */
async function seed(
  sessionId: string,
  segment: "greeting" | "talk",
  turns: Turn[],
  recordedAt = NOW,
): Promise<string[]> {
  const values = turns.map((turn, i) => {
    const base = { sessionId, turnNo: i + 1, segment, recordedAt };
    if ("teacher" in turn)
      return {
        ...base,
        speaker: "tori" as const,
        text: turn.teacher,
        toriRewrite: sayJson(turn.teacher),
        sentUserMessage: turn.entry ?? null,
        move: talkMoveOf({
          kind: turn.kind ?? "ai",
          chat: { level: {}, madeUp: [], facts: [], run: 0 },
        }),
      };
    if ("quiet" in turn)
      return {
        ...base,
        speaker: "child" as const,
        text: null,
        inputMode: "quiet" as const,
        clientAttemptId: `quiet-${sessionId}-${i}`,
        sentUserMessage: QUIET_LINE,
      };
    return {
      ...base,
      speaker: "child" as const,
      text: turn.child,
      inputMode: "speech" as const,
      clientAttemptId: `child-${sessionId}-${i}`,
      sentUserMessage: `Child (speech-to-text): "${turn.child}"`,
    };
  });
  await db.insert(talkTurns).values(values);
  const rows = await rowsOf(sessionId);
  const judged = chatJudgeRowsOf(rows, { band: "1-3" });
  const any = await readTalkAnyState(db, {
    sessionId,
    profileId: (await profileOf(sessionId)) ?? "",
    at: NOW,
  });
  if (any?.kind !== "new") throw new Error("새 꼴 상태가 아니다");
  for (const { row, judge } of chatJudgesOf(
    judged.rows,
    await turnCtxOf(any.state),
  ))
    await db
      .update(talkTurns)
      .set({ chatJudge: judge })
      .where(eq(talkTurns.id, judged.ids[row] ?? ""));
  return rows.filter((r) => r.speaker === "child").map((r) => r.id);
}

/** 턴 길과 같은 출처의 판정 맥락(단계 맥락의 단원 단어 — spec 표 85줄 · 검토 I-2). 동음이의어는 시험 의존과 같은 빈 목록. */
async function turnCtxOf(state: TalkLessonState) {
  const level = await levelContextOf(
    {
      area: "talk",
      level: state.level,
      unit: state.unit,
      revision: state.session.seedRevision ?? state.lessonRow.revision,
    },
    { db },
  );
  // 턴 길 · 닫기 · 힌트 액션이 같은 단원 낱말 재료(단계 맥락의 단원 단어 · 그 낱말의 원형 표)를 쓴다(fix 2 — 13절 C243 보완 6 (5))
  return chatJudgeContextFrom(
    state,
    await readChatUnitWords(db, level.unitWords),
    [],
  );
}

async function stateOf(sessionId: string): Promise<TalkLessonState> {
  const any = await readTalkAnyState(db, {
    sessionId,
    profileId: (await profileOf(sessionId)) ?? "",
    at: NOW,
  });
  if (any?.kind !== "new") throw new Error("새 꼴 상태가 아니다");
  return any.state;
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

async function rowsOf(sessionId: string) {
  return db
    .select()
    .from(talkTurns)
    .where(eq(talkTurns.sessionId, sessionId))
    .orderBy(talkTurns.turnNo);
}

async function profileOf(sessionId: string) {
  const [row] = await db
    .select({ profileId: sessions.profileId })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  return row?.profileId;
}

async function compareOf(sessionId: string) {
  const [row] = await db
    .select({ input: attempts.input })
    .from(attempts)
    .where(eq(attempts.clientAttemptId, chatCompareAttemptId(sessionId)));
  return row ? ChatCompareMarkSchema.parse(row.input) : null;
}

async function legacyStatusesOf(sessionId: string) {
  return (await rowsOf(sessionId))
    .filter((r) => r.speaker === "child")
    .map((r) => readChatJudge(r.chatJudge)?.legacy.status ?? null);
}

async function evalCallsOf(profileId: string) {
  return (
    await db
      .select({ purpose: aiCalls.purpose })
      .from(aiCalls)
      .where(eq(aiCalls.profileId, profileId))
  ).filter((r) => r.purpose === "talk_chat_eval").length;
}

const evalRule = (times: number) => ({
  when: { bodyIncludes: EVAL_MARK },
  reply: {
    kind: "message" as const,
    body: messageBody({ model: EVAL_MODEL, json: EVAL_OUT }),
  },
  times,
});

/** 대화 두 차례 뒤 마무리 물음까지(아이 말 둘이 평가 기다림). */
const TALK_TO_CLOSING: Turn[] = [
  { teacher: "Where do you go on weekends?" },
  { child: "I go to the beach." },
  { teacher: "Nice! What do you see there?" },
  { child: "I see the sea." },
  { teacher: "Great talk! Do you want to talk more?", kind: "closing_slot" },
];

// ── 닫는 세 길(AC-27i) ──────────────────────────────────────────────

describe("AC-27i 닫는 세 길에서 남은 평가를 한 번 부르고 비교 표지 행을 쓴다(묶음 S2)", () => {
  it("AC-27i 정리 끝(마무리 물음의 그만하기): 닫는 응답 뒤에 남은 기다림 평가 둘을 부르고 비교 표지 행을 쓴다", async () => {
    const { profileId, sessionId } = await chatSession();
    await seed(sessionId, "talk", TALK_TO_CLOSING);
    expect(await legacyStatusesOf(sessionId)).toEqual(["waiting", "waiting"]);
    h.fake.push(evalRule(2));
    h.fake.push(lessonClosingRule());
    const out = await stopTalkLesson({ sessionId, confirmed: false }, h.deps());
    expect(out.ok).toBe(true);
    // 닫는 응답은 평가를 기다리지 않는다(응답 뒤 작업)
    expect(await evalCallsOf(profileId)).toBe(0);
    expect(await compareOf(sessionId)).toBeNull();
    await h.runTasks();
    expect(await evalCallsOf(profileId)).toBe(2);
    expect(await legacyStatusesOf(sessionId)).toEqual(["done", "done"]);
    const mark = await compareOf(sessionId);
    expect(mark?.summary.counts).toMatchObject({ done: 2, waiting: 0 });
    // 끝맺음도 그대로 돌고, 보낸 메시지는 끝맺음 결과와 한 거래에서 지워진다
    expect(requestsOf(h, CLOSING_MARK)).toBe(1);
    expect(
      (await rowsOf(sessionId)).every(
        (r) => r.sentUserMessage === null && r.toriRewrite === null,
      ),
    ).toBe(true);
    // 다시 닫혀도(이미 닫힘) 평가를 다시 부르지 않는다
    expect(
      (await stopTalkLesson({ sessionId, confirmed: false }, h.deps())).ok,
    ).toBe(false);
    await h.runTasks();
    expect(await evalCallsOf(profileId)).toBe(2);
  });

  it("AC-27i 중단(참여가 거의 없어 확인 뒤 그만두기)도 남은 평가와 비교 표지 행을 쓴다", async () => {
    const { profileId, sessionId } = await chatSession("greeting");
    await seed(sessionId, "greeting", [
      { teacher: "Good evening! How was your day?" },
      { child: "Good." },
      { teacher: "Nice!" },
    ]);
    h.fake.push(evalRule(1));
    h.fake.push(lessonClosingRule());
    expect(
      await stopTalkLesson({ sessionId, confirmed: false }, h.deps()),
    ).toEqual({ ok: false, reason: "needs_confirm" });
    const out = await stopTalkLesson({ sessionId, confirmed: true }, h.deps());
    expect(out.ok && out.wrap.aborted).toBe(true);
    await h.runTasks();
    expect(await evalCallsOf(profileId)).toBe(1);
    expect((await compareOf(sessionId))?.summary.counts.done).toBe(1);
  });

  it("AC-27i 30분 닫힘(홈 진입 정리): 정리로 닫기 전에 남은 평가를 부르고 비교 표지 행을 쓴다", async () => {
    const { profileId, sessionId } = await chatSession();
    const longAgo = new Date(
      NOW.getTime() -
        (TEST_SETTINGS["talk.idle_close_minutes"].value + 5) * MS_PER_MINUTE,
    );
    await seed(sessionId, "talk", TALK_TO_CLOSING, longAgo);
    // 마무리 물음에 답해 참여 완료 뒤 '더 이야기하기'로 남은 수업(완료 · 정리 전)
    await db
      .update(sessions)
      .set({ status: "completed", completedAt: longAgo })
      .where(eq(sessions.id, sessionId));
    h.fake.push(evalRule(2));
    h.fake.push(lessonClosingRule());
    await closeIdleTalks({ profileId, at: NOW }, h.deps());
    expect(await evalCallsOf(profileId)).toBe(2);
    expect((await compareOf(sessionId))?.summary.counts.done).toBe(2);
    const [row] = await db
      .select({ segment: sessions.talkSegment })
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    expect(row?.segment).toBe("wrap_up");
  });

  it("AC-27i 평가 호출이 실패해도 닫힘은 그대로이고, 판정 없음으로 남아 표지 행이 그 수를 센다", async () => {
    const { sessionId } = await chatSession();
    await seed(sessionId, "talk", TALK_TO_CLOSING);
    h.fake.push({
      when: { bodyIncludes: EVAL_MARK },
      reply: { kind: "network-error" },
    });
    h.fake.push(lessonClosingRule());
    const out = await stopTalkLesson({ sessionId, confirmed: false }, h.deps());
    expect(out.ok).toBe(true);
    await h.runTasks();
    const [row] = await db
      .select({ segment: sessions.talkSegment, status: sessions.status })
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    expect(row).toEqual({ segment: "wrap_up", status: "completed" });
    expect(await legacyStatusesOf(sessionId)).toEqual(["failed", "failed"]);
    expect((await compareOf(sessionId))?.summary.counts).toMatchObject({
      done: 0,
      failed: 2,
    });
    expect((await talkClosingStatus({ sessionId }, h.deps())).state).toBe(
      "ready",
    );
  });

  it("AC-27i 보낸 메시지 지우기는 끝맺음 결과와 한 거래다 — 끝맺음이 옴이 된 때 평가가 아직 도는 중이어도 원문이 이미 지워져 있다", async () => {
    const { profileId, sessionId } = await chatSession();
    await seed(sessionId, "talk", TALK_TO_CLOSING);
    // 평가 응답은 늦게(5초), 끝맺음은 바로. 옴을 기다리는 기한(4초)을 평가 지연보다 짧게 묶어, 옴이 보인 때 평가가 아직 끝나지 않았음이
    // 시각으로 서게 한다(재검토 rev-chat-s2-2 N-4 — 기한을 넘기면 거짓 실패일 뿐 거짓 통과는 없음)
    h.fake.push({
      when: { bodyIncludes: EVAL_MARK },
      reply: {
        kind: "message",
        body: messageBody({ model: EVAL_MODEL, json: EVAL_OUT }),
        delayMs: 5_000,
      },
      times: 2,
    });
    h.fake.push(lessonClosingRule());
    await stopTalkLesson({ sessionId, confirmed: false }, h.deps());
    const run = h.runTasks();
    const deadline = Date.now() + 4_000;
    let ready = false;
    while (!ready && Date.now() < deadline) {
      ready =
        (await talkClosingStatus({ sessionId }, h.deps())).state === "ready";
      if (!ready) await new Promise((r) => setTimeout(r, 20));
    }
    expect(ready).toBe(true);
    // 끝맺음이 보이는 그때 평가는 아직 끝나지 않았고(호출 기록 없음), 원문은 이미 지워졌다
    expect(await evalCallsOf(profileId)).toBe(0);
    expect(
      (await rowsOf(sessionId)).every(
        (r) => r.sentUserMessage === null && r.toriRewrite === null,
      ),
    ).toBe(true);
    await run;
    expect(await evalCallsOf(profileId)).toBe(2);
    expect((await compareOf(sessionId))?.summary.counts.done).toBe(2);
  });

  it("AC-27i 닫을 때의 다시 세기는 앞 차례의 판정 기록을 바꾸지 않는다(판정 맥락의 단원 단어가 턴 길과 같은 출처)", async () => {
    const { profileId, sessionId } = await chatSession();
    // 단원 규격에는 있고 이 수업의 단원 단어에는 없는 낱말을 아이가 말한다(두 출처가 다르면 앱 판정이 갈린다)
    const state0 = await stateOf(sessionId);
    const ctx0 = await turnCtxOf(state0);
    const lessonWords = TalkLessonSchema.parse(
      state0.lessonRow.content,
    ).unitWords;
    const extra = ctx0.unitWords.find((w) => !lessonWords.includes(w));
    expect(extra).toBeDefined();
    const ids = await seed(sessionId, "talk", [
      { teacher: "What do you like?" },
      { child: `I like ${extra}.` },
      { teacher: "Nice! What else?" },
      { child: "I see the sea." },
      {
        teacher: "Great talk! Do you want to talk more?",
        kind: "closing_slot",
      },
    ]);
    // 첫 아이 차례는 턴 중에 평가가 끝났다(응답 뒤 작업 — 턴 길과 같은 맥락)
    h.fake.push(evalRule(1));
    await runChatEval(
      {
        profileId,
        sessionId,
        level: 1,
        sentenceMaxWords: 5,
        contextTurns: TEST_SETTINGS["talk.chat_eval_context_turns"].value,
        ctx: await turnCtxOf(await stateOf(sessionId)),
        childRowId: ids[0] ?? "",
      },
      { db, clock: () => NOW, ...h.deps().ai },
    );
    const before = (await rowsOf(sessionId)).find((r) => r.id === ids[0]);
    expect(readChatJudge(before?.chatJudge)?.legacy.status).toBe("done");
    // 가르는 낱말을 턴 길의 맥락이 실제로 단원 단어로 셌다(그래야 다른 출처의 맥락이면 갈림 — 재검토 rev-chat-s2-2 N-3)
    expect(
      readChatJudge(before?.chatJudge)?.app.words.map((w) => w.word),
    ).toContain(extra);
    h.fake.push(evalRule(1));
    h.fake.push(lessonClosingRule());
    await stopTalkLesson({ sessionId, confirmed: false }, h.deps());
    await h.runTasks();
    const after = (await rowsOf(sessionId)).find((r) => r.id === ids[0]);
    expect(after?.chatJudge).toEqual(before?.chatJudge);
    expect(await legacyStatusesOf(sessionId)).toEqual(["done", "done"]);
  });

  it("AC-27i 'AI 쉬는 중'인 날 닫으면 평가를 부르지 않고 기다림으로 남긴 채 비교 표지 행만 쓴다", async () => {
    const { profileId, sessionId } = await chatSession();
    await seed(sessionId, "talk", TALK_TO_CLOSING);
    await restToday(profileId);
    h.fake.push(evalRule(2));
    const out = await stopTalkLesson({ sessionId, confirmed: false }, h.deps());
    expect(out.ok).toBe(true);
    await h.runTasks();
    expect(await evalCallsOf(profileId)).toBe(0);
    expect(h.fake.requests.some((r) => r.bodyText.includes(EVAL_MARK))).toBe(
      false,
    );
    expect(await legacyStatusesOf(sessionId)).toEqual(["waiting", "waiting"]);
    expect((await compareOf(sessionId))?.summary.counts).toMatchObject({
      done: 0,
      failed: 0,
      waiting: 2,
    });
  });

  it("AC-27i 단계 맥락에는 있고 수업 단원 단어에는 없는 낱말의 다른 꼴을 아이가 말하면, 닫은 뒤의 판정도 그 단원 단어로 센다(원형 표가 단계 맥락의 낱말로 만든 것)", async () => {
    const { sessionId } = await chatSession();
    const state0 = await stateOf(sessionId);
    const level = await levelContextOf(
      {
        area: "talk",
        level: state0.level,
        unit: state0.unit,
        revision: state0.session.seedRevision ?? state0.lessonRow.revision,
      },
      { db },
    );
    const lessonWords = TalkLessonSchema.parse(
      state0.lessonRow.content,
    ).unitWords;
    // 단계 맥락에만 있는 낱말 가운데 낱말과 다른 꼴(forms)이 있는 것
    const rows = await db
      .select({ word: vocab.word, forms: vocab.forms })
      .from(vocab);
    const pick = rows.find(
      (r) =>
        level.unitWords.includes(r.word) &&
        !lessonWords.includes(r.word) &&
        Array.isArray(r.forms) &&
        r.forms.some((f) => typeof f === "string" && f !== r.word),
    );
    expect(pick).toBeDefined();
    const forms = Array.isArray(pick?.forms) ? (pick.forms as string[]) : [];
    const form = forms.find((f) => f !== pick?.word) ?? "";
    expect(state0.lemmaOf(form)).toBeUndefined();
    const ids = await seed(sessionId, "talk", [
      { teacher: "What did you do yesterday?" },
      { child: `I like ${form} so much.` },
      {
        teacher: "Great talk! Do you want to talk more?",
        kind: "closing_slot",
      },
    ]);
    const wordsOf = async () =>
      readChatJudge(
        (await rowsOf(sessionId)).find((r) => r.id === ids[0])?.chatJudge,
      )?.app.words.map((w) => w.word) ?? [];
    expect(await wordsOf()).toContain(pick?.word);
    h.fake.push(evalRule(1));
    h.fake.push(lessonClosingRule());
    await stopTalkLesson({ sessionId, confirmed: false }, h.deps());
    await h.runTasks();
    expect(await legacyStatusesOf(sessionId)).toEqual(["done"]);
    expect(await wordsOf()).toContain(pick?.word);
  });

  it("AC-27i '홈'(참여 완료 뒤 더 이야기하는 중에 떠남)도 정리로 닫고 남은 평가 · 비교 표지 행 · 끝맺음을 부른다", async () => {
    const { profileId, sessionId } = await chatSession();
    await seed(sessionId, "talk", TALK_TO_CLOSING);
    expect((await chooseLessonMoreTalk({ sessionId }, h.deps())).ok).toBe(true);
    h.fake.push(evalRule(2));
    h.fake.push(lessonClosingRule());
    const out = await leaveTalkLesson({ sessionId }, h.deps());
    expect(out).toMatchObject({ ok: true, closed: true });
    await h.runTasks();
    expect(await evalCallsOf(profileId)).toBe(2);
    expect((await compareOf(sessionId))?.summary.counts.done).toBe(2);
    expect(requestsOf(h, CLOSING_MARK)).toBe(1);
  });

  it("AC-27i 기존 방식 수업의 닫기는 평가를 부르지 않고 비교 표지 행도 없다", async () => {
    await setHouseholdSetting(db, "talk.lead_mode", "app");
    const { profileId, sessionId } = await chatSession();
    await seed(sessionId, "talk", TALK_TO_CLOSING);
    h.fake.push(lessonClosingRule());
    await stopTalkLesson({ sessionId, confirmed: false }, h.deps());
    await h.runTasks();
    expect(await evalCallsOf(profileId)).toBe(0);
    expect(await compareOf(sessionId)).toBeNull();
    expect(h.fake.requests.every((r) => !r.bodyText.includes(EVAL_MARK))).toBe(
      true,
    );
  });
});

// ── 끝맺음 턴의 입력(AC-27u) ─────────────────────────────────────────

describe("AC-27u 이야기 방식 수업의 끝맺음 턴 입력(지금 길 그대로의 대화 기록 짝)", () => {
  const START_SAY = "Good evening! It is a quiet Sunday.";
  const BACK_SAY = "Welcome back from the word game!";

  it("AC-27u 끝맺음 history 에 입구 차례의 말이 없음", async () => {
    const { sessionId } = await chatSession();
    await seed(sessionId, "talk", [
      {
        teacher: START_SAY,
        entry: "(The chat starts now. It is Sunday evening.) Say hello.",
      },
      { child: "I went to the beach." },
      { teacher: "Wow, the beach! What did you see?" },
      { quiet: true },
      { teacher: "I saw a big shell once." },
      {
        teacher: BACK_SAY,
        entry: "(The child is back from a short word practice in the app.)",
      },
      { child: "I like shells." },
      { teacher: "Me too! Do you want to talk more?", kind: "closing_slot" },
    ]);
    h.fake.push(evalRule(2));
    h.fake.push(lessonClosingRule({ farewell: "Bye! See you soon." }));
    await stopTalkLesson({ sessionId, confirmed: false }, h.deps());
    await h.runTasks();
    const closing = h.fake.requests.find((r) =>
      r.bodyText.includes(CLOSING_MARK),
    );
    expect(closing).toBeDefined();
    const body = closing?.bodyText ?? "";
    // 아이 행의 보낸 사용자 메시지 · 다음 선생님 행의 기록 글 짝(조용함 행은 '누르지 않음' 입력 줄로 듦)
    expect(body).toContain("I went to the beach.");
    expect(body).toContain("Wow, the beach! What did you see?");
    expect(body).toContain("did not press the talk button");
    expect(body).toContain("I saw a big shell once.");
    expect(body).toContain("I like shells.");
    // 입구로 연 선생님 차례(수업 첫 말 · 짧은 준비 뒤 돌아옴)의 말은 짝에 들지 않는다
    expect(body).not.toContain(START_SAY);
    expect(body).not.toContain(BACK_SAY);
    // 그 꼴로 끝맺음 응답 검증 · 끝인사 검사를 지난다(아이 이름 칸 없음)
    expect(await talkClosingStatus({ sessionId }, h.deps())).toMatchObject({
      state: "ready",
      farewell: { en: "Bye! See you soon." },
    });
    expect(body).not.toContain("Momo");
  });
});

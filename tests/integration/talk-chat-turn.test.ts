// 회화 이야기 방식 턴 길 통합 시험(intent 2026-11-13-회화-대화-구조-R plan 묶음 S1 — spec 설계 2~11, FR-2~6 · 8 · 10~12, AC-3 · 4 · 6 · 8 · 10 · 11 ·
// 12 · 16 · 19 의 서버 몫). 시험용 시드의 회화 1단계 단원 1 수업 1 로 세션을 바로 넣고 처음 스냅숏에 방식 chat(선생님 미나)을 적은 뒤, 턴 요청
// (runTalkTurnRequest)으로 입구(start · quiet · more · back)와 아이 차례를 부른다. 단원 주제 재료는 3단계 단원 1 에만 있으므로 의존 chatTopic 으로
// 넘긴다(지금 새 방식 시험의 leadText 와 같은 자리). 토막 넘김 · 수업 열기는 묶음 S2 의 몫이라 여기서는 행 · 토막을 바로 넣는다. 가짜 Anthropic 은
// 안내문 마지막 문단(CHAT_SYSTEM_MARK)으로 이야기 방식 요청을 가른다. 이 기기에서는 돌지 않고 CI 가 돌린다(아이 이름 · 연락처는 지어낸 값).
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TALK_LEAD_TEXT_L3U1 } from "@/core/ai/calls/talk-lead";
import {
  TALK_START_ACTIVITY_NO,
  talkStartAttemptId,
} from "@/core/conversation/attempt";
import { readChatJudge } from "@/core/conversation/chat-judge";
import { leadModeStartField } from "@/core/conversation/lead-mode";
import { leadOpenAttemptId } from "@/core/conversation/lead-turn-core";
import { readTalkMove, talkMoveOf } from "@/core/conversation/move";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { lessons } from "@/db/schema/content";
import { attempts, sessions, talkTurns } from "@/db/schema/learning";
import { insertAiCall } from "@/server/ai/store";
import { loadTalkLessonView } from "@/server/conversation";
import { chatCompareAttemptId } from "@/server/conversation/chat-eval";
import type { TalkLessonLine } from "@/server/conversation/lesson-turn";
import { runTalkTurnRequest } from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import {
  chatDontKnowBody,
  chatOpenBody,
  chatSayBody,
} from "./talk-chat-requests";
import {
  CHAT_SYSTEM_MARK,
  capAtCurrentCalls,
  chatTurnRule,
  ENGLISH_NAME,
  harnessOf,
  LEAD_STATUS_MARK,
  leadTurnRule,
  lessonTurnRule,
  NOW,
  requestsOf,
  resetHousehold,
  setHouseholdSetting,
  setupTalkDb,
  type TalkDb,
  type TalkHarness,
  TURN_MARK,
  turnsOf,
} from "./talk-fixture";

const TOPIC = "weekends and nature";
const SAFETY_KEY = "talk.safety_max_turns";
const LEAD_MODE_KEY = "talk.lead_mode";

let talk: TalkDb;
let db: Db;
let h: TalkHarness;
let lessonId: string;
let revision: number;
let greetingEn: string;

beforeAll(async () => {
  talk = await setupTalkDb();
  db = talk.db;
  const rows = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.area, "talk"), eq(lessons.level, 1)));
  const first = rows.find(
    (r) => r.kind === "assigned" && r.unit === 1 && r.lessonNo === 1,
  );
  if (!first) throw new Error("회화 1단계 단원 1 수업 1 이 없다");
  lessonId = first.id;
  revision = first.revision;
  const greeting = TalkLessonSchema.parse(first.content).card.greeting;
  greetingEn =
    "questions" in greeting
      ? (greeting.questions[0]?.question.en ?? "")
      : greeting.firstLine.en;
});

afterAll(async () => {
  await talk?.testDb.drop();
});

beforeEach(async () => {
  h = harnessOf(db);
  await setHouseholdSetting(db, SAFETY_KEY, 80);
});

// ── 세션 · 요청 도우미 ─────────────────────────────────────────────────

type Mode = "app" | "claude" | "chat";

/** 세션 행과 처음 스냅숏(방식 · 선생님 미나 · 짧은 준비 계획)을 바로 넣는다(수업 열기는 묶음 S2 몫). */
async function newSession(
  mode: Mode,
  {
    segment = "greeting",
    prepWords = [],
  }: { segment?: "greeting" | "talk"; prepWords?: string[] } = {},
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
      talkSegment: segment,
      startedAt: NOW,
      seedRevision: revision,
      seedCorrection: 0,
    })
    .returning({ id: sessions.id });
  if (!session) throw new Error("세션을 넣지 못했다");
  await db.insert(attempts).values({
    sessionId: session.id,
    clientAttemptId: talkStartAttemptId(session.id),
    activityNo: TALK_START_ACTIVITY_NO,
    input: {
      v: 1,
      kind: "talk-start",
      step: "final",
      shownWords: [],
      metBefore: [],
      practiceOrder: [],
      teacherKey: "mina",
      prepWords,
      carry: { goals: [], words: [] },
      ...leadModeStartField(mode),
    },
    attemptedAt: NOW,
    status: "done",
  });
  return { profileId, sessionId: session.id };
}

/** 턴 요청 하나를 돌려 흘린 줄을 모은다(이야기 방식 주제 재료는 의존으로). */
async function turn(body: Record<string, unknown>): Promise<TalkLessonLine[]> {
  const lines: TalkLessonLine[] = [];
  await runTalkTurnRequest(body, {
    ...h.deps(),
    write: (line) => lines.push(line),
    chatTopic: () => TOPIC,
  } as Parameters<typeof runTalkTurnRequest>[1]);
  return lines;
}

// 요청 본문은 재료 함수(talk-chat-requests — 단위 시험이 같은 본문을 턴 요청 규격에 넣어 봄, 검토 rev-chat-s1 I-3)
const say = chatSayBody;
const dontKnow = chatDontKnowBody;
const open = chatOpenBody;

const textOf = (lines: readonly TalkLessonLine[]) =>
  lines.flatMap((l) => (l.t === "s" ? [l.en] : [])).join(" ");
const endOf = (lines: readonly TalkLessonLine[]) =>
  lines.find((l): l is Extract<TalkLessonLine, { t: "end" }> => l.t === "end");
const chatBodies = () =>
  h.fake.requests.filter((r) => r.bodyText.includes(CHAT_SYSTEM_MARK));
/** 이야기 방식 요청 본문의 마지막 사용자 메시지 글. */
function lastUserMessage(index = -1): string {
  const body = chatBodies().at(index)?.body as {
    messages?: { role: string; content: unknown }[];
  };
  const last = body?.messages?.at(-1)?.content;
  if (typeof last === "string") return last;
  if (Array.isArray(last))
    return last
      .map((b) => (b as { text?: unknown }).text)
      .filter((t): t is string => typeof t === "string")
      .join("");
  return "";
}

/** 그 학습일에 호출 하나를 남기고 하루 안전 상한을 그 수로 둔다('AI 쉬는 중'). */
async function restToday(profileId: string) {
  await insertAiCall(db, {
    profileId,
    sessionId: null,
    calledAt: NOW,
    learningDay: "2026-10-22",
    requestedModel: "claude-sonnet-5-5",
    answeredModel: null,
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    costUsd: "0.000000",
    priceMissing: false,
    latencyMs: null,
    purpose: "talk_turn",
    status: "success",
    errorCode: null,
  });
  await capAtCurrentCalls(db, profileId);
}

/** 그 수업의 비교 표지 행(묶음 S2 의 닫기 scheduleChatClose 가 씀)이 있는가. */
async function hasCompareMark(sessionId: string): Promise<boolean> {
  const rows = await db
    .select({ id: attempts.id })
    .from(attempts)
    .where(eq(attempts.clientAttemptId, chatCompareAttemptId(sessionId)));
  return rows.length > 0;
}

/** 수업 첫 말까지 연 이야기 방식 수업. */
async function startedChat(opts?: Parameters<typeof newSession>[1]) {
  const ids = await newSession("chat", opts);
  h.fake.push(chatTurnRule({ say: "Hi! How are you today?" }));
  const lines = await turn(open(ids.sessionId, "start"));
  return { ...ids, lines };
}

/** 인사를 마친 것으로 대화 토막으로 넘긴다(토막 넘김은 묶음 S2 몫 — 짧은 준비 없는 수업). */
async function toTalk(sessionId: string) {
  await db
    .update(sessions)
    .set({ talkSegment: "talk" })
    .where(eq(sessions.id, sessionId));
}

// ── 시험 ───────────────────────────────────────────────────────────

describe("이야기 방식 턴 길(묶음 S1)", () => {
  it("AC-27c 수업 첫 말: 입구 start 의 사용자 메시지는 수업 시작 줄이고 선생님 행에 둔다 · 기록 글은 응답 JSON · ai_question 은 빈 칸 · 끝 줄에 신호", async () => {
    const { sessionId, lines } = await startedChat();
    expect(requestsOf(h, CHAT_SYSTEM_MARK)).toBe(1);
    expect(requestsOf(h, LEAD_STATUS_MARK)).toBe(0);
    expect(lastUserMessage()).toMatch(
      /^\(The chat starts now\. It is \w+ (morning|afternoon|evening)\. This is your first chat with this child\. Say hello\.\)$/,
    );
    const rows = await turnsOf(db, sessionId);
    expect(rows).toHaveLength(1);
    const teacher = rows[0];
    expect(teacher?.speaker).toBe("tori");
    expect(teacher?.segment).toBe("greeting");
    expect(teacher?.sentUserMessage).toBe(lastUserMessage());
    expect(teacher?.aiQuestion).toBeNull();
    expect(JSON.parse(teacher?.toriRewrite ?? "{}")).toMatchObject({
      say: "Hi! How are you today?",
    });
    const chat = readTalkMove(teacher?.move)?.chat;
    expect(chat).toMatchObject({ facts: [], run: 0 });
    // 마무리 보류가 없는 차례는 그 칸을 두지 않는다(move.ts copyChat — 값이 있는 선택 칸만, DB JSON 에서도 빠짐). toMatchObject 의 undefined 칸은
    // 받은 쪽에 그 열쇠가 있어야 맞으므로 따로 본다(CI 43565405821)
    expect(chat).not.toHaveProperty("wrapUpHeld");
    expect(textOf(lines)).toBe(teacher?.text);
    expect(endOf(lines)?.chat).toEqual({
      quietSeconds: 8,
      hint: true,
      alternatives: 2,
    });
    expect(endOf(lines)?.lesson.hints).toEqual([]);
  });

  it("AC-27c 수업 첫 말 호출이 실패하면 카드 인사 첫 줄로 연다", async () => {
    const { sessionId } = await newSession("chat");
    h.fake.push({
      when: { bodyIncludes: CHAT_SYSTEM_MARK },
      reply: { kind: "error", status: 500, body: { type: "error" } },
    });
    const lines = await turn(open(sessionId, "start"));
    const rows = await turnsOf(db, sessionId);
    expect(rows[0]?.text).toBe(greetingEn);
    expect(rows[0]?.toriRewrite).toBeNull();
    expect(textOf(lines)).toBe(greetingEn);
  });

  it("AC-27d 흘린 줄을 이은 글 = 저장된 글이고, say 에 든 따라 할 문장은 글에서 빠져 소리 줄로 나간다(앱의 신호 말 · 상수 물음 없음)", async () => {
    const { sessionId } = await startedChat();
    h.fake.push(
      chatTurnRule({
        listen_sentence: "I like cats.",
        say: "Nice! I like cats. What about you?",
      }),
    );
    const lines = await turn(say(sessionId, "I am fine."));
    const rows = await turnsOf(db, sessionId);
    const teacher = rows.at(-1);
    expect(textOf(lines)).toBe("Nice! What about you?");
    expect(teacher?.text).toBe(textOf(lines));
    expect(lines).toContainEqual({
      t: "sound",
      kind: "model",
      say: "I like cats.",
    });
    expect(lines.some((l) => l.t === "add")).toBe(false);
    expect(readTalkMove(teacher?.move)?.chat?.listen).toMatchObject({
      sentence: "I like cats.",
      inSay: true,
    });
  });

  it("AC-27h 아이 행: 공식 '말했다' 빈 목록 · 스스로 쓴 낱말 비움 · 첫 판정 기록 기다림 · 보낸 사용자 메시지는 가린 뒤의 글, 평가는 응답 뒤 작업 하나", async () => {
    const { sessionId } = await startedChat();
    h.fake.push(chatTurnRule({ say: "Cool!" }));
    await turn(say(sessionId, `I am ${ENGLISH_NAME}.`));
    const child = (await turnsOf(db, sessionId)).find(
      (r) => r.speaker === "child",
    );
    expect(child?.saidWords).toEqual([]);
    expect(child?.selfUsedWords).toEqual([]);
    expect(child?.sentUserMessage).toContain("{NAME}");
    expect(child?.sentUserMessage).not.toContain(ENGLISH_NAME);
    expect(readChatJudge(child?.chatJudge)?.legacy.status).toBe("waiting");
    expect(h.tasks).toHaveLength(1);
  });

  it("AC-27f 조용함 → 조용함 → 상한: quiet 행(글 없음 · 판정 '부르지 않음') · 잇달아 말한 수 1 · 2 · 둘째 뒤 기다림 시간 없음 · 셋째는 받지 않음", async () => {
    const { sessionId } = await startedChat();
    await toTalk(sessionId);
    h.fake.push(chatTurnRule({ say: "Soccer or tennis?" }));
    const a = await turn(open(sessionId, "quiet"));
    expect(lastUserMessage()).toBe(
      "(The child did not press the talk button.)",
    );
    expect(endOf(a)?.chat?.quietSeconds).toBe(8);
    h.fake.push(chatTurnRule({ say: "I like soccer!" }));
    const b = await turn(open(sessionId, "quiet"));
    expect(endOf(b)?.chat?.quietSeconds).toBeUndefined();
    expect(endOf(b)?.chat?.hint).toBe(true);
    const c = await turn(open(sessionId, "quiet"));
    expect(c).toEqual([{ t: "stale" }]);
    const rows = await turnsOf(db, sessionId);
    const quiet = rows.filter((r) => r.inputMode === "quiet");
    expect(quiet).toHaveLength(2);
    for (const q of quiet) {
      expect(q.text).toBeNull();
      expect(q.sentUserMessage).toBe(
        "(The child did not press the talk button.)",
      );
      expect(readChatJudge(q.chatJudge)?.legacy.status).toBe("not_called");
    }
    expect(
      rows
        .filter((r) => r.speaker === "tori")
        .map((r) => readTalkMove(r.move)?.chat?.run),
    ).toEqual([0, 1, 2]);
    // 조용함 차례는 평가를 부르지 않는다
    expect(h.tasks).toHaveLength(0);
  });

  it("AC-27f 조용함 요청이 끊긴 뒤 다시 보냄: 고아 quiet 행을 새로 쓰지 않고 그 행으로 다시 부른다", async () => {
    const { sessionId } = await startedChat();
    await toTalk(sessionId);
    const rows = await turnsOf(db, sessionId);
    const turnNo = rows.at(-1)?.turnNo ?? 1;
    const longAgo = new Date(NOW.getTime() - 10 * 60_000);
    await db.insert(talkTurns).values({
      sessionId,
      turnNo,
      segment: "talk",
      speaker: "child",
      inputMode: "quiet",
      hintKind: "none",
      hintLevel: 0,
      saidWords: [],
      selfUsedWords: [],
      recordedAt: longAgo,
    });
    await db.insert(attempts).values({
      sessionId,
      clientAttemptId: leadOpenAttemptId(sessionId, turnNo + 1),
      activityNo: 0,
      input: { v: 1, kind: "talk-lead-open" },
      attemptedAt: longAgo,
      status: "done",
    });
    // 고아가 있으면 아이 말 요청은 받지 않는다(다시 보낼 자료는 조용함 입구 — 묶음 S2)
    expect(await turn(say(sessionId, "Hi."))).toEqual([{ t: "stale" }]);
    h.fake.push(chatTurnRule({ say: "Are you there?" }));
    const lines = await turn(open(sessionId, "quiet"));
    expect(endOf(lines)).toBeDefined();
    const after = await turnsOf(db, sessionId);
    expect(after.filter((r) => r.inputMode === "quiet")).toHaveLength(1);
    expect(after.at(-1)?.speaker).toBe("tori");
  });

  it("AC-27f 모름 단추가 이어짐: 선생님 행 move 에 받침 단계 1 · 2 와 chat 묶음이 함께, 끝 줄의 자리 막힘 수 1 · 2, 설명 기다림 신호", async () => {
    const { sessionId } = await startedChat();
    await toTalk(sessionId);
    const stages: number[] = [];
    const stuck: number[] = [];
    for (let i = 0; i < 2; i++) {
      h.fake.push(chatTurnRule({ say: "It's okay. Is it fun?" }));
      const lines = await turn(dontKnow(sessionId));
      const teacher = (await turnsOf(db, sessionId)).at(-1);
      const move = readTalkMove(teacher?.move);
      stages.push(move?.stage ?? -1);
      expect(move?.chat).toBeDefined();
      stuck.push(endOf(lines)?.lesson.stuckInSlot ?? -1);
      expect(endOf(lines)?.chat?.explainWait).toBe(6);
    }
    expect(stages).toEqual([1, 2]);
    expect(stuck).toEqual([1, 2]);
  });

  it("AC-27f 말소리 없음 → 조용함 → 말소리 없음: 입력 줄이 '듣지 못함'이고 막힘 · 설명 기다림이 없다", async () => {
    const { sessionId } = await startedChat();
    await toTalk(sessionId);
    h.fake.push(chatTurnRule({ say: "I can't hear you." }, { times: 3 }));
    const a = await turn(dontKnow(sessionId, true));
    expect(lastUserMessage()).toBe(
      "(The child pressed the talk button, but the app could not hear any words.)",
    );
    const q = await turn(open(sessionId, "quiet"));
    const b = await turn(dontKnow(sessionId, true));
    for (const lines of [a, q, b])
      expect(endOf(lines)?.chat?.explainWait).toBeUndefined();
    const teachers = (await turnsOf(db, sessionId)).filter(
      (r) => r.speaker === "tori",
    );
    expect(teachers.slice(1).map((r) => readTalkMove(r.move)?.stage)).toEqual([
      0, 0, 0,
    ]);
  });

  it("AC-27l 인식기 알림: 확신 정도가 문턱 아래면 알림 줄이 붙고 다른 후보는 다듬기 · 이름 가림 뒤 보낸 사용자 메시지에만 남는다", async () => {
    const { sessionId } = await startedChat();
    h.fake.push(chatTurnRule({ say: "Oh!" }));
    await turn(
      say(sessionId, "I like cats.", {
        recognizer: {
          confidence: 0.3,
          alternative: `I like\n${ENGLISH_NAME}.`,
        },
      }),
    );
    expect(lastUserMessage()).toBe(
      'Child (speech-to-text): "I like cats."\n(The recognizer was unsure about this. It may also have been: "I like {NAME}.")',
    );
    const child = (await turnsOf(db, sessionId)).find(
      (r) => r.speaker === "child",
    );
    expect(child?.sentUserMessage).toBe(lastUserMessage());
  });

  it("AC-27k 안전 상한 차례: 사실 줄을 붙여 부르고 그 말을 닫는 줄의 끝인사로 낸 뒤 수업을 닫는다(셈은 quiet 포함)", async () => {
    const { sessionId } = await startedChat();
    await toTalk(sessionId);
    h.fake.push(chatTurnRule({ say: "Soccer or tennis?" }));
    await turn(open(sessionId, "quiet"));
    await setHouseholdSetting(db, SAFETY_KEY, 2);
    h.fake.push(chatTurnRule({ say: "It was fun. Bye for now!" }));
    const lines = await turn(say(sessionId, "Tennis."));
    expect(lastUserMessage()).toBe(
      'This is the last turn of today\'s chat. After your turn the app ends the chat.\nChild (speech-to-text): "Tennis."',
    );
    expect(lines.filter((l) => l.t === "s")).toEqual([]);
    expect(lines.at(-1)).toMatchObject({
      t: "close",
      reason: "safety",
      farewell: { en: "It was fun. Bye for now!" },
    });
    const session = (
      await db.select().from(sessions).where(eq(sessions.id, sessionId))
    )[0];
    expect(session?.talkSegment).toBe("wrap_up");
    // 이야기 방식의 닫기(scheduleChatClose)가 남은 평가 뒤 비교 표지 행을 쓴다(토막 접점 검토 rev-chat-s2 6절 S1)
    await h.runTasks();
    expect(await hasCompareMark(sessionId)).toBe(true);
    expect((await turnsOf(db, sessionId)).at(-1)?.text).toBe(
      "It was fun. Bye for now!",
    );
  });

  it("AC-27c 같은 시도 id 를 다시 보내면 저장한 행 그대로 다시 흘린다(신호 말 없음 · 끝 줄 신호 같음 · 호출 없음)", async () => {
    const { sessionId } = await startedChat();
    h.fake.push(chatTurnRule({ say: "Great! Do you like cats?" }));
    const body = say(sessionId, "I am fine.");
    const first = await turn(body);
    const calls = requestsOf(h, CHAT_SYSTEM_MARK);
    const again = await turn(body);
    expect(requestsOf(h, CHAT_SYSTEM_MARK)).toBe(calls);
    expect(textOf(again)).toBe(textOf(first));
    expect(again.some((l) => l.t === "add")).toBe(false);
    expect(endOf(again)?.chat).toEqual(endOf(first)?.chat);
  });

  it("AC-27s app · claude 요청 본문 · 행이 기준 파일과 같음 — 서버 몫: 두 방식의 수업은 이야기 방식 길에 들지 않는다(입구 quiet · back 은 받지 않고, start · more 는 지금 새 엔진 입구로 가며 이야기 방식 요청 · 행이 없다)", async () => {
    // 모의 실행기 몫의 요청 본문 · 행 글자 대조는 단위 시험 talk-chat-mode('AC-27s 모의 실행기의 … 기준 파일과 글자까지 같다')가 지킨다
    for (const mode of ["app", "claude"] as const) {
      const { sessionId } = await newSession(mode);
      for (const lead of ["quiet", "back"] as const)
        expect(await turn(open(sessionId, lead))).toEqual([{ t: "stale" }]);
      await turn(open(sessionId, "more"));
      expect(requestsOf(h, CHAT_SYSTEM_MARK)).toBe(0);
      for (const row of await turnsOf(db, sessionId)) {
        expect(row.chatJudge).toBeNull();
        expect(readTalkMove(row.move)?.chat).toBeUndefined();
        expect(row.inputMode).not.toBe("quiet");
      }
      const marks = await db
        .select()
        .from(attempts)
        .where(eq(attempts.sessionId, sessionId));
      expect(marks.filter((m) => m.activityNo === 0)).toEqual([]);
    }
  });

  it("AC-27s 서버 몫(검토 M-4): 마무리 제안 뒤 지금 새 방식 세션의 more 는 지금 새 방식 요청 하나로 가고 이야기 방식 요청은 0 이다", async () => {
    const { sessionId } = await newSession("claude", { segment: "talk" });
    await db.insert(talkTurns).values({
      sessionId,
      turnNo: 1,
      segment: "talk",
      speaker: "tori",
      text: "You did great today!",
      move: talkMoveOf({ kind: "ai", next: "closing" }),
      recordedAt: NOW,
    });
    h.fake.push(leadTurnRule({ say: "Let's talk more! What else?" }));
    const lines: TalkLessonLine[] = [];
    await runTalkTurnRequest(open(sessionId, "more"), {
      ...h.deps(),
      write: (line) => lines.push(line),
      leadText: () => TALK_LEAD_TEXT_L3U1,
    } as Parameters<typeof runTalkTurnRequest>[1]);
    expect(requestsOf(h, LEAD_STATUS_MARK)).toBe(1);
    expect(requestsOf(h, CHAT_SYSTEM_MARK)).toBe(0);
    expect(endOf(lines)?.chat).toBeUndefined();
    const rows = await turnsOf(db, sessionId);
    expect(readTalkMove(rows.at(-1)?.move)?.lead).toBeDefined();
    expect(readTalkMove(rows.at(-1)?.move)?.chat).toBeUndefined();
  });

  it("AC-27s 서버 몫(검토 M-4 · plan 위험 2): 설정을 chat 으로 바꿔도 app 스냅숏 세션의 아이 차례는 이야기 방식 길에 들지 않는다", async () => {
    await setHouseholdSetting(db, LEAD_MODE_KEY, "app");
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
    // 수업 열기(처음 스냅숏 · 첫 선생님 행 — 설정 app 일 때)
    await loadTalkLessonView({ sessionId: session.id }, h.deps());
    await setHouseholdSetting(db, LEAD_MODE_KEY, "chat");
    h.fake.push(lessonTurnRule({ tori_en: "Nice!" }));
    const lines = await turn(say(session.id, "I am fine."));
    expect(requestsOf(h, TURN_MARK)).toBe(1);
    expect(requestsOf(h, CHAT_SYSTEM_MARK)).toBe(0);
    expect(endOf(lines)?.chat).toBeUndefined();
    const rows = await turnsOf(db, session.id);
    expect(rows.length).toBeGreaterThan(1);
    for (const row of rows) {
      expect(row.chatJudge).toBeNull();
      expect(readTalkMove(row.move)?.chat).toBeUndefined();
    }
    await setHouseholdSetting(db, LEAD_MODE_KEY, "app");
  });

  it("AC-27c 'AI 쉬는 중'에 행 없이 넘겨받은 수업 첫 말(묶음 S2 의 start 신호)은 호출 없이 카드 인사 첫 줄의 이야기 방식 행으로 열고, 다시 보낸 start 는 그 행을 다시 흘린다", async () => {
    const { profileId, sessionId } = await newSession("chat");
    await restToday(profileId);
    const first = await turn(open(sessionId, "start"));
    expect(requestsOf(h, CHAT_SYSTEM_MARK)).toBe(0);
    const rows = await turnsOf(db, sessionId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text).toBe(greetingEn);
    expect(readTalkMove(rows[0]?.move)?.chat).toBeDefined();
    expect(rows[0]?.sentUserMessage).toMatch(/^\(The chat starts now\./);
    expect(endOf(first)?.chat?.quietSeconds).toBeUndefined();
    const again = await turn(open(sessionId, "start"));
    expect(textOf(again)).toBe(greetingEn);
    expect(await turnsOf(db, sessionId)).toHaveLength(1);
  });

  it("AC-27c 첫 말 호출이 실패해 연 카드 인사 첫 줄 행도 다시 보낸 start 에 다시 흘린다(새로 부르지 않음)", async () => {
    const { sessionId } = await newSession("chat");
    h.fake.push({
      when: { bodyIncludes: CHAT_SYSTEM_MARK },
      reply: { kind: "error", status: 500, body: { type: "error" } },
    });
    await turn(open(sessionId, "start"));
    const calls = requestsOf(h, CHAT_SYSTEM_MARK);
    const again = await turn(open(sessionId, "start"));
    expect(requestsOf(h, CHAT_SYSTEM_MARK)).toBe(calls);
    expect(textOf(again)).toBe(greetingEn);
  });

  it("AC-27k more 입구 차례가 마무리 제안으로 끝나면(wrap_up 참) 다음 more 는 같은 행을 다시 흘리지 않고 새로 부른다(검토 I-1)", async () => {
    const { sessionId } = await startedChat();
    await toTalk(sessionId);
    // 인사 끝 차례(그 뒤 선생님 행은 넘어가는 말이라 마무리 제안이 서지 않음)를 먼저 지난다
    h.fake.push(chatTurnRule({ say: "Great! What do you play?" }));
    await turn(say(sessionId, "I am good."));
    h.fake.push(chatTurnRule({ say: "You did great!", wrap_up: true }));
    const suggested = await turn(say(sessionId, "I like soccer."));
    expect(endOf(suggested)?.lesson.choice).toBe("suggestion");
    h.fake.push(chatTurnRule({ say: "That was fun. See you!", wrap_up: true }));
    await turn(open(sessionId, "more"));
    const calls = requestsOf(h, CHAT_SYSTEM_MARK);
    h.fake.push(chatTurnRule({ say: "Okay! What else do you like?" }));
    const next = await turn(open(sessionId, "more"));
    expect(requestsOf(h, CHAT_SYSTEM_MARK)).toBe(calls + 1);
    expect(textOf(next)).toBe("Okay! What else do you like?");
  });

  it("AC-27k 참여 완료 뒤 'AI 쉬는 중'으로 닫은 이야기 방식 수업(아이 차례 · 조용함 입구)도 비교 표지 행을 남긴다(끝맺음은 쉬는 중이 풀린 뒤)", async () => {
    for (const via of ["child", "quiet"] as const) {
      const { profileId, sessionId } = await startedChat();
      await toTalk(sessionId);
      await db
        .update(sessions)
        .set({ status: "completed" })
        .where(eq(sessions.id, sessionId));
      await restToday(profileId);
      const lines =
        via === "child"
          ? await turn(say(sessionId, "I like cats."))
          : await turn(open(sessionId, "quiet"));
      expect(lines.at(-1)).toMatchObject({ t: "close", reason: "resting" });
      await h.runTasks();
      expect(await hasCompareMark(sessionId)).toBe(true);
    }
  });
});

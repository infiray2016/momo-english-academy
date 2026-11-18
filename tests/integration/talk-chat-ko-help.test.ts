// 이야기 방식 수업의 한국어로 묻기 통합 시험(수업 안 한국어로 묻기 묶음 K — 이야기 방식 spec FR-13 · 설계 12 · AC-13(정본 AC-27m), 검토 rev-b4b 6절 'K').
// 이 기기에서는 돌지 않고 CI 에서 돈다. 시험용 시드의 회화 1단계 단원 1 수업 1 로 세션을 넣고 처음 스냅숏에 방식 chat(선생님 미나)을 적은 뒤 턴 요청
// (runTalkTurnRequest)으로 수업 첫 말 · 조용함 · 아이 차례를 부르고, 한국어 질문(runTalkKoHelpRequest)을 가짜 Anthropic 으로 부른다. 증명:
// (a) 받을 차례 판정(chatFirstQuestionBlocksOf — 짧은 준비 없는 대화 토막은 대화 첫 질문을 기다리지 않음, 아이 행이 마지막이면 stale)
// (b) 조용함 행을 뺀 앞 대화 (c) 물음이 없는 차례에서도 도움 호출의 '선생님의 지금 말'이 빈 글이 아님 (d) 연 힌트 글(힌트 받는 서버 액션이 저장한 단)
// (e) 도움 뒤 턴의 사실 줄(입력 줄 바로 앞)과 대화 기록에 한국어 문답 없음 · 아이 행 힌트 종류 · 첫 판정(도움받은 상황) · 기기 값 적기
// (f) 답 없는 행 · 대신 줄 · 묻지 않은 턴은 사실 줄이 없다.
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  TALK_START_ACTIVITY_NO,
  talkStartAttemptId,
} from "@/core/conversation/attempt";
import { chatAiQuestionOf } from "@/core/conversation/chat-hints";
import { readChatJudge } from "@/core/conversation/chat-judge";
import { leadModeStartField } from "@/core/conversation/lead-mode";
import { lessons } from "@/db/schema/content";
import {
  attempts,
  sessions,
  talkKoHelps,
  talkTurns,
} from "@/db/schema/learning";
import { runTalkKoHelpRequest } from "@/server/conversation/ko-help";
import type { TalkLessonLine } from "@/server/conversation/lesson-turn";
import { runTalkTurnRequest } from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import {
  TALK_KO_HELP_PURPOSE,
  talkKoHelpRule,
} from "../fixtures/ai/fake-anthropic";
import { chatOpenBody, chatSayBody } from "./talk-chat-requests";
import {
  CHAT_SYSTEM_MARK,
  chatTurnRule,
  harnessOf,
  LOW_MODEL,
  NOW,
  resetHousehold,
  setHouseholdSetting,
  setupTalkDb,
  type TalkDb,
  type TalkHarness,
  turnsOf,
} from "./talk-fixture";

const TOPIC = "weekends and nature";
const TAUGHT = "I like gimbap.";
const LINE = `Korean help before this answer: taught '${TAUGHT}'`;
const KO_LINE_HEAD = "Korean help before this answer:";
const SAY_KO = "김밥이 좋다고 말하고 싶구나. 이렇게 말해 봐.";

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
  const first = rows.find(
    (r) => r.kind === "assigned" && r.unit === 1 && r.lessonNo === 1,
  );
  if (!first) throw new Error("회화 1단계 단원 1 수업 1 이 없다");
  lessonId = first.id;
  revision = first.revision;
});

afterAll(async () => {
  await talk?.testDb.drop();
});

beforeEach(async () => {
  h = harnessOf(db);
  await setHouseholdSetting(db, "talk.ko_ask_mode", "on");
  await setHouseholdSetting(db, "talk.safety_max_turns", 80);
});

// ── 세션 · 요청 도우미(talk-chat-turn.test.ts 와 같은 꼴) ─────────────────────

/** 이야기 방식 세션(처음 스냅숏 방식 chat · 선생님 미나 · 짧은 준비 없음)을 바로 넣는다. */
async function newChatSession(): Promise<{
  profileId: string;
  sessionId: string;
}> {
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
      talkSegment: "greeting",
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
      prepWords: [],
      carry: { goals: [], words: [] },
      ...leadModeStartField("chat"),
    },
    attemptedAt: NOW,
    status: "done",
  });
  return { profileId, sessionId: session.id };
}

async function turn(body: Record<string, unknown>): Promise<TalkLessonLine[]> {
  const lines: TalkLessonLine[] = [];
  await runTalkTurnRequest(body, {
    ...h.deps(),
    write: (line) => lines.push(line),
    chatTopic: () => TOPIC,
  });
  return lines;
}

/** 수업 첫 말까지 연 뒤 대화 토막으로 넘긴 수업(토막 넘김은 묶음 S2 몫이라 바로 넣는다). */
async function talkingChat(firstSay = "Hi! How are you today?") {
  const ids = await newChatSession();
  h.fake.push(chatTurnRule({ say: firstSay }));
  await turn(chatOpenBody(ids.sessionId, "start"));
  await db
    .update(sessions)
    .set({ talkSegment: "talk" })
    .where(eq(sessions.id, ids.sessionId));
  return ids;
}

let attempt = 0;
function ask(sessionId: string, over: Record<string, unknown> = {}) {
  attempt += 1;
  return runTalkKoHelpRequest(
    {
      sessionId,
      clientAttemptId: `chat-ko-${attempt}`,
      question: "김밥 좋다고 어떻게 말해?",
      hint: { opened: 0 },
      ...over,
    },
    h.deps(),
  );
}

const koRequests = () =>
  h.fake.requests.filter((r) => r.bodyText.includes(TALK_KO_HELP_PURPOSE));
const chatBodies = () =>
  h.fake.requests.filter((r) => r.bodyText.includes(CHAT_SYSTEM_MARK));

/** 이야기 방식 요청의 메시지(마지막 사용자 메시지 글 · 그 앞 기록 글). */
function chatMessagesOf(index = -1): { last: string; before: string } {
  const body = chatBodies().at(index)?.body as {
    messages?: { role: string; content: unknown }[];
  };
  const textOf = (content: unknown): string =>
    typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content
            .map((b) => (b as { text?: unknown }).text)
            .filter((t): t is string => typeof t === "string")
            .join("")
        : "";
  const messages = body?.messages ?? [];
  return {
    last: textOf(messages.at(-1)?.content),
    before: messages
      .slice(0, -1)
      .map((m) => textOf(m.content))
      .join("\n"),
  };
}

/** 지금 아이 차례(마지막 선생님 행)의 턴 번호. */
async function openTurnNo(sessionId: string): Promise<number> {
  const rows = await turnsOf(db, sessionId);
  const last = rows.at(-1);
  if (last?.speaker !== "tori") throw new Error("아이 차례가 열려 있지 않다");
  return last.turnNo;
}

/** 그 아이 차례의 한국어 도움 행을 바로 넣는다(호출 없이 — 답을 채운 꼴). */
async function insertHelp(
  sessionId: string,
  turnNo: number,
  over: Partial<typeof talkKoHelps.$inferInsert> = {},
) {
  attempt += 1;
  await db.insert(talkKoHelps).values({
    sessionId,
    turnNo,
    seq: 1,
    clientAttemptId: `chat-ko-row-${attempt}`,
    question: "김밥 좋다고 어떻게 말해?",
    kind: "expression",
    sayKo: SAY_KO,
    teachEn: TAUGHT,
    shownEn: [],
    textShown: false,
    fallback: "none",
    askedAt: NOW,
    answeredAt: NOW,
    ...over,
  });
}

// ── 시험 ───────────────────────────────────────────────────────────

describe("이야기 방식 수업의 한국어로 묻기(묶음 K)", () => {
  it("AC-27m 받을 차례: 짧은 준비 없는 대화 토막은 대화 첫 질문을 기다리지 않아 받고(chatFirstQuestionBlocksOf), 마지막 행이 아이 행이면 stale", async () => {
    const { sessionId } = await talkingChat();
    h.fake.push(
      talkKoHelpRule({ model: LOW_MODEL, kind: "meaning", sayKo: SAY_KO }),
    );
    expect(await ask(sessionId)).toMatchObject({ t: "ok" });
    expect(koRequests()).toHaveLength(1);
    // 아이 행이 마지막인 차례(선생님 말이 아직 없음)는 받지 않는다
    const rows = await turnsOf(db, sessionId);
    const last = rows.at(-1);
    if (!last) throw new Error("행이 없다");
    await db.insert(talkTurns).values({
      sessionId,
      turnNo: last.turnNo,
      segment: "talk",
      speaker: "child",
      text: "Hello.",
      inputMode: "speech",
      recordedAt: NOW,
    });
    expect(await ask(sessionId)).toEqual({ t: "stale" });
    expect(koRequests()).toHaveLength(1);
  });

  it("AC-27m 물음이 없는 차례에서도 도움 호출의 '선생님의 지금 말'은 빈 글이 아니고, 앞 대화는 조용함 행을 뺀 행이다", async () => {
    const { sessionId } = await talkingChat("Hi! How are you today?");
    // 조용함 입구 — quiet 아이 행(글 없음)과 그 뒤 선생님 행(물음 없음)
    h.fake.push(chatTurnRule({ say: "Mina likes rice a lot." }));
    await turn(chatOpenBody(sessionId, "quiet"));
    const rows = await turnsOf(db, sessionId);
    expect(rows.some((r) => r.speaker === "child")).toBe(true);
    h.fake.push(
      talkKoHelpRule({ model: LOW_MODEL, kind: "meaning", sayKo: SAY_KO }),
    );
    expect(await ask(sessionId)).toMatchObject({ t: "ok" });
    const text = koRequests().at(-1)?.bodyText ?? "";
    // 선생님 행의 글은 나간 say 그대로다(수준 검사는 기록 전용이라 글을 바꾸지 않음 — chat-reply ChatReplyCheck)
    const current = (await turnsOf(db, sessionId)).at(-1);
    expect(current?.speaker).toBe("tori");
    expect(current?.text).toBe("Mina likes rice a lot.");
    expect(text).toContain(
      "Your last words (the child sees this): Mina likes rice a lot.",
    );
    // 앞 대화: 수업 첫 말만(조용함 행은 줄이 아님 · 지금 말은 앞 대화에 없음)
    expect(text).toContain("Hi! How are you today?");
    expect(text).not.toContain("did not press");
  });

  it("AC-27m 연 힌트 글: 힌트 받는 서버 액션이 지금 선생님 행에 저장한 단 가운데 연 만큼을 싣고, 저장된 단이 없으면 빈 목록 그대로다", async () => {
    const { sessionId } = await talkingChat("What do you like?");
    h.fake.push(
      talkKoHelpRule({
        model: LOW_MODEL,
        kind: "meaning",
        sayKo: SAY_KO,
        times: 2,
      }),
    );
    expect(await ask(sessionId, { hint: { opened: 1 } })).toMatchObject({
      t: "ok",
    });
    expect(koRequests().at(-1)?.bodyText).toContain(
      "Hints the child opened: (none)",
    );
    const rows = await turnsOf(db, sessionId);
    const teacher = rows.at(-1);
    if (teacher?.speaker !== "tori") throw new Error("선생님 행이 없다");
    await db
      .update(talkTurns)
      .set({
        aiQuestion: chatAiQuestionOf({
          tiers: [
            { kind: "ko", text: "좋아하는 음식을 말해 봐." },
            { kind: "sentence", text: TAUGHT },
          ],
          explainKo: "",
        }),
      })
      .where(eq(talkTurns.id, teacher.id));
    expect(await ask(sessionId, { hint: { opened: 1 } })).toMatchObject({
      t: "ok",
    });
    const text = koRequests().at(-1)?.bodyText ?? "";
    expect(text).toContain("Hints the child opened: 좋아하는 음식을 말해 봐.");
    expect(text).not.toContain(
      `Hints the child opened: 좋아하는 음식을 말해 봐.; ${TAUGHT}`,
    );
  });

  it("AC-27m 도움 뒤 턴: 사실 줄은 입력 줄 바로 앞 한 줄이고 대화 기록에 한국어 문답이 없으며, 아이 행 힌트 종류 · 첫 판정은 '영어' · 도움받은 상황, 기기 값을 적는다", async () => {
    const { sessionId } = await talkingChat("What do you like?");
    const turnNo = await openTurnNo(sessionId);
    await insertHelp(sessionId, turnNo);
    h.fake.push(chatTurnRule({ say: "Gimbap is yummy!" }));
    await turn(
      chatSayBody(sessionId, TAUGHT, {
        koHelp: [{ turnNo, seq: 1, heard: true, replays: 2 }],
      }),
    );
    const { last, before } = chatMessagesOf();
    const lines = last.split("\n");
    expect(lines.at(-2)).toBe(LINE);
    expect(lines.filter((l) => l.startsWith(KO_LINE_HEAD))).toHaveLength(1);
    expect(before).not.toContain(SAY_KO);
    expect(before).not.toContain("김밥 좋다고");
    const rows = await turnsOf(db, sessionId);
    const child = rows.find((r) => r.speaker === "child");
    expect(child?.sentUserMessage).toBe(last);
    expect(child?.hintKind).toBe("english");
    const judge = readChatJudge(child?.chatJudge ?? null);
    expect(judge?.app.hintKind).toBe("english");
    expect(judge?.app.said).toEqual([]);
    expect(
      judge?.app.words.every((w) => w.category === "helped" && !w.accepted),
    ).toBe(true);
    const [help] = await db
      .select()
      .from(talkKoHelps)
      .where(eq(talkKoHelps.sessionId, sessionId));
    expect(help?.heard).toBe(true);
    expect(help?.replays).toBe(2);
  });

  it("AC-27m 1~3단계에서 들려주지 못한 표현 · 답 없는 행 · 대신 줄 · 묻지 않은 턴은 사실 줄이 없고 보낸 메시지가 같다", async () => {
    const messages: string[] = [];
    const hintKinds: (string | null | undefined)[] = [];
    for (const variant of [
      "plain",
      "not_heard",
      "pending",
      "call_failed",
    ] as const) {
      const { sessionId } = await talkingChat("What do you like?");
      const turnNo = await openTurnNo(sessionId);
      if (variant === "pending")
        await insertHelp(sessionId, turnNo, {
          kind: null,
          sayKo: null,
          teachEn: null,
          fallback: null,
        });
      if (variant === "call_failed")
        await insertHelp(sessionId, turnNo, { fallback: "call_failed" });
      if (variant === "not_heard") await insertHelp(sessionId, turnNo);
      h.fake.push(chatTurnRule({ say: "Gimbap is yummy!" }));
      await turn(
        chatSayBody(
          sessionId,
          TAUGHT,
          variant === "not_heard"
            ? { koHelp: [{ turnNo, seq: 1, heard: false }] }
            : {},
        ),
      );
      messages.push(chatMessagesOf().last);
      const child = (await turnsOf(db, sessionId)).find(
        (r) => r.speaker === "child",
      );
      hintKinds.push(child?.hintKind);
    }
    expect(messages.every((m) => !m.includes(KO_LINE_HEAD))).toBe(true);
    expect(new Set(messages).size).toBe(1);
    expect(new Set(hintKinds).size).toBe(1);
  });
});

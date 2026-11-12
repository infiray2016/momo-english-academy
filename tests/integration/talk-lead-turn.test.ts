// 회화 Claude 주도 묶음 S1 새 엔진 턴 길 통합 시험(spec '회화 Claude 주도' 설계 1~8 · 데이터 절, 15절 AC-26a · 26b · 26c 일부 · 26g · 26i).
// 시험용 시드의 회화 1단계 단원 1 수업 1 로 세션을 열고(처음 열 때의 설정 talk.lead_mode 로 방식이 스냅숏에 적힘), 인사를 지금 길로 마친 뒤
// 앱의 대화 첫 질문 뒤 아이 차례를 runTalkTurnRequest 로 부른다. 안내문 글은 3단계 단원 1 에만 있으므로(spec 미결 2) 이 시험은 의존 leadText 로
// 그 글을 넘겨 1단계 시드에서 새 엔진을 돌린다. 가짜 Anthropic 은 사실 알림 머리 줄로 새 엔진 요청을, 다시 말하기 요청 글로 그 요청을 가른다.
// 증명: (가) app 세션은 지금 길 그대로 (나) claude 세션의 대화 차례는 새 요청 · 응답의 말이 그대로 나감 (다) 따라 말한 다음 차례는 '영어' · '말했다'
// 빔 (라) 좁은 정의 다시 말하기 한 번 · 질문이 사라지지 않음 (마) 금지어는 지금 규칙의 안전한 대사 (바) 1~3단계 글 빼기 (사) 마무리 차례
// (아) 진행 중 설정이 바뀌어도 처음 값.
import { and, eq, isNull, like } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { TALK_LEAD_TEXT_L3U1 } from "@/core/ai/calls/talk-lead";
import {
  parseTalkAttemptInput,
  talkClosingAttemptId,
} from "@/core/conversation/attempt";
import {
  LEAD_OPEN_ACTIVITY_NO,
  LEAD_OPEN_INPUT,
  type LeadTextOf,
  leadOpenAttemptId,
} from "@/core/conversation/lead-turn-core";
import { readTalkMove, talkMoveOf } from "@/core/conversation/move";
import { MORE_PROMPT } from "@/core/conversation/spoken";
import { safeLineOf } from "@/core/conversation/stream";
import { createStageTimer } from "@/core/conversation/timing";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { LEVEL_MAX } from "@/core/seed/structure";
import { lessons, levelSpecs } from "@/db/schema/content";
import { attempts, sessions, talkTurns } from "@/db/schema/learning";
import { aiCalls, settings } from "@/db/schema/operations";
import { maskerFor } from "@/server/ai/run";
import { insertAiCall, sameErrorCount } from "@/server/ai/store";
import {
  advanceTalkLesson,
  chooseLessonMoreTalk,
  loadTalkLessonView,
} from "@/server/conversation";
import { runLeadOpenTurn } from "@/server/conversation/lead-turn";
import {
  runTalkLessonTurn,
  type TalkLessonLine,
  TURN_IN_FLIGHT_MS,
} from "@/server/conversation/lesson-turn";
import { readTalkLessonState } from "@/server/conversation/state";
import { runTalkTurnRequest, turnSettings } from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import { loadSeed } from "@/server/seed/load";
import { getOutputCheckLists } from "@/server/seed-lists";
import { levelContextOf } from "@/server/session/ai-context";
import { getSettings } from "@/server/settings";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import {
  harnessOf,
  LEAD_RETRY_MARK,
  LEAD_STATUS_MARK,
  LOADED_AT,
  leadRetryRule,
  leadTurnRule,
  lessonTurnRule,
  NOW,
  resetHousehold,
  setHouseholdSetting,
  type TalkHarness,
  TURN_MARK,
} from "./talk-fixture";
import { createTestDatabase, type TestDatabase } from "./test-db";

type LessonRow = typeof lessons.$inferSelect;
type Card = ReturnType<typeof TalkLessonSchema.parse>["card"];
type Mode = "app" | "claude";

const LEAD_MODE_KEY = "talk.lead_mode";

let testDb: TestDatabase;
let db: Db;
let h: TalkHarness;
let assigned: LessonRow;
let card: Card;
let unitWords: string[];

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
  unitWords = (
    await levelContextOf(
      { area: "talk", level: 1, unit: 1, revision: first.revision },
      { db },
    )
  ).unitWords;
});

afterAll(async () => {
  await testDb?.drop();
});

beforeEach(async () => {
  h = harnessOf(db);
  await setHouseholdSetting(db, LEAD_MODE_KEY, "app");
});

// ── 세션 도우미(이 파일 몫 — S2 시험과 같은 꼴) ───────────────────────

/** 처음 열 때의 설정 값을 mode 로 두고 새 세션을 연다(처음 스냅숏은 화면 자료를 처음 읽을 때 적힌다). */
async function newSession(
  mode: Mode,
  { withText = true } = {},
): Promise<{ profileId: string; sessionId: string }> {
  await setHouseholdSetting(db, LEAD_MODE_KEY, mode);
  const profileId = await resetHousehold(db, 1);
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
    withText ? leadDeps() : h.deps(),
  );
  if (!view) throw new Error("화면 자료가 없다");
  return { profileId, sessionId: session.id };
}

/**
 * 처음 스냅숏을 적을 때 안내문 글이 있는 단원으로 보게 하는 의존(13절 C241 보완 — 글은 3단계 단원 1 에만 있으므로 시험용 1단계 시드로 새 방식을
 * 열게 그 글을 넘긴다. 턴 길의 leadText 와 같은 자리).
 */
const leadDeps = () => ({ ...h.deps(), leadText: () => TALK_LEAD_TEXT_L3U1 });

async function rowsOf(sessionId: string) {
  return (
    await db.select().from(talkTurns).where(eq(talkTurns.sessionId, sessionId))
  ).sort(
    (a, b) =>
      a.turnNo - b.turnNo ||
      (a.speaker === b.speaker ? 0 : a.speaker === "tori" ? -1 : 1),
  );
}

async function maxTurn(sessionId: string): Promise<number> {
  return (await rowsOf(sessionId)).reduce((m, r) => Math.max(m, r.turnNo), 0);
}

/** 아이 행 하나와 그 뒤 선생님 행 하나를 바로 넣는다(인사 · 앞선 대화 차례 — 턴 길을 거치지 않음). */
async function exchange(
  sessionId: string,
  segment: "greeting" | "talk",
  childText: string,
  teacherText: string,
) {
  const turnNo = await maxTurn(sessionId);
  await db.insert(talkTurns).values([
    {
      sessionId,
      turnNo,
      segment,
      speaker: "child",
      text: childText,
      inputMode: "speech",
      clientAttemptId: `pre-${sessionId}-${turnNo}`,
      recordedAt: NOW,
    },
    {
      sessionId,
      turnNo: turnNo + 1,
      segment,
      speaker: "tori",
      text: teacherText,
      move: talkMoveOf({ kind: "ai" }),
      recordedAt: NOW,
    },
  ]);
}

/** 새 엔진의 대화 첫 차례 말(시험 기본값 — 좁은 정의에 걸리지 않는 물음). */
const OPENING_SAY = "Hello again! Do you like it?";

/**
 * 인사(지금 길) → (짧은 준비) → 대화 첫 질문까지 온 세션. 지금 길은 토막 넘김이 카드 첫 질문을 붙이고, 새 엔진은 넘김이 신호(leadTurn start)만
 * 내므로 아이 말 없이 부르는 입구(start)로 Claude 의 첫 차례를 쓴다(opening 이 false 면 신호까지만).
 */
async function inTalk(mode: Mode, { opening = true } = {}) {
  const ids = await newSession(mode);
  for (let i = 0; i < card.greetingTurns; i++)
    await exchange(ids.sessionId, "greeting", "I'm good.", "Great!");
  const view = await loadTalkLessonView({ sessionId: ids.sessionId }, h.deps());
  if (view?.step.kind === "advance" && view.step.to === "prep")
    await advanceTalkLesson({ sessionId: ids.sessionId, to: "prep" }, h.deps());
  const moved = await advanceTalkLesson(
    { sessionId: ids.sessionId, to: "talk" },
    h.deps(),
  );
  if (!moved.ok) throw new Error("대화로 넘기지 못했다");
  if (mode === "claude") {
    if (moved.leadTurn !== "start") throw new Error("새 엔진 신호가 없다");
    if (opening) {
      h.fake.push(
        leadTurnRule({ say: OPENING_SAY, move: "react_and_follow_up" }),
      );
      const lines = await openLead(ids, "start");
      if (lines.at(-1)?.t !== "end")
        throw new Error("대화 첫 차례가 끝나지 않았다");
    }
  }
  return ids;
}

/** 아이 말 없이 부르는 입구(묶음 S3 가 turn.ts 에서 잇는 자리 — 시험은 턴 길의 공통 값을 직접 만들어 부른다). */
async function openLead(
  { sessionId, profileId }: { sessionId: string; profileId: string },
  open: "start" | "more",
  {
    resting = false,
    leadText = () => TALK_LEAD_TEXT_L3U1,
  }: {
    resting?: boolean;
    leadText?: LeadTextOf;
  } = {},
): Promise<TalkLessonLine[]> {
  const lines: TalkLessonLine[] = [];
  const contact = getOutputCheckLists()
    .forbidden.patterns.filter((p) => p.category === "contact")
    .map((p) => p.regex);
  await runLeadOpenTurn(
    { sessionId, open },
    {
      ...h.deps(),
      leadText,
      write: (line) => lines.push(line),
    },
    {
      db,
      profileId,
      masker: await maskerFor(db, profileId, contact),
      settings: await getSettings(turnSettings, { db, profileId }),
      at: h.clock.now,
      received: h.clock.now,
      restingP: Promise.resolve(resting),
      timer: createStageTimer(() => performance.now()),
    },
  );
  return lines;
}

/**
 * 참고 턴까지 대화한 뒤 마무리 차례에 답하고 '더 이야기하기'를 고른 세션(새 엔진 — 화면이 leadTurn more 를 받아 입구 more 를 부를 차례). 마무리
 * 차례에 답해 참여 완료가 이미 기록되어 있다.
 */
async function toMore(ids: { sessionId: string; profileId: string }) {
  const { sessionId } = ids;
  const state = await readTalkLessonState(db, {
    sessionId,
    profileId: ids.profileId,
    at: NOW,
  });
  if (!state) throw new Error("상태가 없다");
  for (let i = 1; i < state.spec.targetTurns; i++)
    await exchange(sessionId, "talk", "I like it.", "Nice!");
  h.fake.push(
    leadTurnRule({ say: "You did great today!", move: "react_only" }),
  );
  await say(sessionId, speech("I like apples."));
  const more = await chooseLessonMoreTalk({ sessionId }, h.deps());
  if (!more.ok || more.leadTurn !== "more")
    throw new Error("새 엔진 더 이야기하기 신호가 없다");
}

async function sessionRowOf(sessionId: string) {
  const [row] = await db
    .select({ status: sessions.status, talkSegment: sessions.talkSegment })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  return row;
}

let seq = 0;
async function say(
  sessionId: string,
  input: { mode: "speech" | "dont_know"; text?: string; nospeech?: boolean },
  clientAttemptId = `lead-turn-${++seq}`,
): Promise<TalkLessonLine[]> {
  const lines: TalkLessonLine[] = [];
  const deps = {
    ...h.deps(),
    // 안내문 글은 3단계 단원 1 에만 있다(spec 미결 2) — 시험용 1단계 시드로 새 엔진을 돌리게 그 글을 넘긴다
    leadText: () => TALK_LEAD_TEXT_L3U1,
    write: (line: unknown) => lines.push(line as TalkLessonLine),
    requestReceivedAt: h.clock.now,
  };
  await runTalkTurnRequest(
    { sessionId, clientAttemptId, input, hint: { opened: 0, heard: [] } },
    deps,
  );
  return lines;
}

const speech = (text: string) => ({ mode: "speech" as const, text });

function leadRequests() {
  return h.fake.requests.filter(
    (r) =>
      r.bodyText.includes(LEAD_STATUS_MARK) &&
      !r.bodyText.includes(LEAD_RETRY_MARK),
  );
}

/** 요청 본문의 마지막 사용자 메시지 글. */
function lastUserOf(body: unknown): string {
  const messages = (body as { messages?: { role: string; content: unknown }[] })
    ?.messages;
  const last = messages?.at(-1);
  return typeof last?.content === "string" ? last.content : "";
}

function systemOf(body: unknown): string {
  const system = (body as { system?: unknown })?.system;
  if (typeof system === "string") return system;
  if (Array.isArray(system))
    return system
      .map((b) => (b as { text?: unknown }).text)
      .filter((t): t is string => typeof t === "string")
      .join("\n");
  return "";
}

async function lastTeacher(sessionId: string) {
  return (await rowsOf(sessionId)).filter((r) => r.speaker === "tori").at(-1);
}

async function lastChild(sessionId: string) {
  return (await rowsOf(sessionId)).filter((r) => r.speaker === "child").at(-1);
}

async function callTagsOf(sessionId: string) {
  return (
    await db
      .select({ errorCode: aiCalls.errorCode, purpose: aiCalls.purpose })
      .from(aiCalls)
      .where(eq(aiCalls.sessionId, sessionId))
  ).map((r) => r.errorCode);
}

/** 이 세션의 입구 표지 행(talk-lead-open:). */
async function openMarksOf(sessionId: string) {
  return db
    .select({ input: attempts.input, attemptedAt: attempts.attemptedAt })
    .from(attempts)
    .where(
      and(
        eq(attempts.sessionId, sessionId),
        like(attempts.clientAttemptId, "talk-lead-open:%"),
      ),
    );
}

const sOf = (lines: TalkLessonLine[]) =>
  lines.flatMap((l) => (l.t === "s" ? [l.en] : []));

// ── 시험 ───────────────────────────────────────────────────────────

describe("회화 Claude 주도 묶음 S1 새 엔진 턴 길", () => {
  it("AC-26a 기존 방식(app) 세션의 대화 차례는 지금 길 그대로다(지금 회화 턴 요청 · 새 엔진 요청 없음 · move.lead 없음)", async () => {
    const { sessionId } = await inTalk("app");
    h.fake.push(lessonTurnRule({ tori_en: "Oh, nice!" }));
    const lines = await say(sessionId, speech("I like apples."));
    expect(lines.at(-1)?.t).toBe("end");
    expect(lines).toContainEqual({ t: "s", en: "Oh, nice!" });
    expect(
      h.fake.requests.filter((r) => r.bodyText.includes(TURN_MARK)),
    ).toHaveLength(1);
    expect(leadRequests()).toHaveLength(0);
    const teacher = await lastTeacher(sessionId);
    expect(readTalkMove(teacher?.move)?.lead).toBeUndefined();
    expect(await callTagsOf(sessionId)).not.toContain("lead");
  });

  it("AC-26c 새 엔진의 대화 첫 차례는 아이 말 없이 부르는 입구로 Claude 가 쓰고(카드 첫 질문 없음 · 인사 이음 · 대화 시작 줄 · 아이 행 없음), 같은 입구를 다시 보내면 저장한 행을 그대로 다시 낸다", async () => {
    const ids = await inTalk("claude", { opening: false });
    const before = await rowsOf(ids.sessionId);
    h.fake.push(
      leadTurnRule({
        say: OPENING_SAY,
        say_ko: "다시 만나서 반가워! 그거 좋아해?",
      }),
    );
    const lines = await openLead(ids, "start");
    expect(sOf(lines)).toEqual(["Hello again!", "Do you like it?"]);
    expect(lines.at(-1)?.t).toBe("end");
    const user = lastUserOf(leadRequests()[0]?.body);
    expect(user).toContain("Greeting so far:");
    expect(user).toContain("The talk part starts now.");
    expect(user).not.toContain("Child (speech-to-text)");
    expect(user).not.toContain("Child turn");
    const after = await rowsOf(ids.sessionId);
    expect(after).toHaveLength(before.length + 1);
    const opened = after.at(-1);
    expect(opened?.speaker).toBe("tori");
    expect(opened?.segment).toBe("talk");
    expect(opened?.sentUserMessage).toBe(user);
    expect(readTalkMove(opened?.move)?.kind).toBe("first_question");
    expect(readTalkMove(opened?.move)?.lead).toBeDefined();
    // 다시 보냄: AI 없이 같은 줄
    const sent = h.fake.requests.length;
    const again = await openLead(ids, "start");
    expect(h.fake.requests.length).toBe(sent);
    expect(again.filter((l) => l.t !== "end")).toEqual(
      lines.filter((l) => l.t !== "end"),
    );
    expect(await rowsOf(ids.sessionId)).toHaveLength(after.length);
  });

  it("AC-26b 대화 첫 차례 → 아이의 첫 답 → 둘째 선생님 차례가 이어진다: 아이 차례마다 요청 하나, 응답의 말이 그대로 나가고 행이 데이터 표대로 남으며 기록이 이어진다", async () => {
    const { sessionId } = await inTalk("claude");
    const opening = await lastTeacher(sessionId);
    const word = unitWords[0] ?? "apple";
    h.fake.push(
      leadTurnRule({
        reading: "clear_answer",
        move: "react_and_follow_up",
        say: "Oh, nice! Do you like it?",
        say_ko: "오, 좋아! 그거 좋아해?",
        hint_ko: "응, 좋아해.",
        hint_en: `I like ${word}.`,
        child_used_on_own: [word],
      }),
    );
    const lines = await say(sessionId, speech(`I like ${word}.`));
    // 아이의 첫 답이 받아들여졌다(대화 첫 질문 차례가 닫혔다) · 차례당 호출 1 · 지금 회화 턴 요청 없음
    expect(lines.at(-1)?.t).toBe("end");
    expect(leadRequests()).toHaveLength(2);
    expect(
      h.fake.requests.filter((r) => r.bodyText.includes(TURN_MARK)),
    ).toHaveLength(0);
    const req = leadRequests()[1];
    if (!req) throw new Error("아이 첫 답의 새 엔진 요청이 없다");
    const system = systemOf(req.body);
    expect(system).toContain("You lead this conversation.");
    expect(system).toContain("Never say you are a human.");
    expect(system).not.toContain("first an easier question");
    const user = lastUserOf(req.body);
    expect(user).toContain(`Child (speech-to-text): "I like ${word}."`);
    expect(user).toContain(LEAD_STATUS_MARK);
    expect(user).not.toContain("Greeting so far:");
    expect(user).toMatch(
      /Child turn 1 \(the app offers to finish around turn \d+\)\./,
    );
    // 기록: 첫 차례의 사용자 메시지(선생님 행에 둠)와 응답 원문
    const messages = (
      req.body as { messages: { role: string; content: string }[] }
    ).messages;
    expect(messages).toHaveLength(3);
    expect(messages[0]?.content).toBe(opening?.sentUserMessage);
    expect(messages[1]?.content).toBe(opening?.toriRewrite);
    // 나간 글 = 말 칸(고쳐 쓰지 않음)
    expect(sOf(lines)).toEqual(["Oh, nice!", "Do you like it?"]);
    expect(lines).toContainEqual({ t: "ko", ko: "오, 좋아! 그거 좋아해?" });
    const teacher = await lastTeacher(sessionId);
    expect(teacher?.text).toBe("Oh, nice! Do you like it?");
    expect(teacher?.toriKo).toBe("오, 좋아! 그거 좋아해?");
    expect(teacher?.sentUserMessage).toBeNull();
    expect(JSON.parse(teacher?.toriRewrite ?? "{}").say).toBe(
      "Oh, nice! Do you like it?",
    );
    expect(teacher?.recast).toBeNull();
    expect(teacher?.aiQuestion).toMatchObject({
      en: "Do you like it?",
      answerExample: `I like ${word}.`,
    });
    const move = readTalkMove(teacher?.move);
    expect(move?.kind).toBe("ai");
    expect(move?.lead).toMatchObject({
      reading: "clear_answer",
      move: "react_and_follow_up",
    });
    expect(move?.lead?.wide).toBeDefined();
    const child = await lastChild(sessionId);
    expect(child?.sentUserMessage).toBe(user);
    expect(child?.selfUsedWords).toEqual([word]);
    expect(child?.saidWords).toEqual([word]);
    expect(child?.askAgain).not.toBe(true);
    // ai_calls 표지(방식별로 셀 수 있게)
    expect(await callTagsOf(sessionId)).toEqual(["lead", "lead"]);
    // 둘째 아이 차례: 기록이 둘로 이어지고 아이 차례 번호가 오른다
    h.fake.push(leadTurnRule({ say: "Yummy!", move: "react_only" }));
    const next = await say(sessionId, speech("Rice."));
    expect(next.at(-1)?.t).toBe("end");
    const third = leadRequests()[2];
    if (!third) throw new Error("셋째 새 엔진 요청이 없다");
    const thirdMessages = (
      third.body as { messages: { role: string; content: string }[] }
    ).messages;
    expect(thirdMessages).toHaveLength(5);
    expect(thirdMessages[2]?.content).toBe(child?.sentUserMessage);
    expect(thirdMessages[3]?.content).toBe(teacher?.toriRewrite);
    expect(lastUserOf(third.body)).toContain("Child turn 2");
  });

  it("AC-26c '더 이야기하기'를 고른 뒤의 입구(more)는 '(The child chose to talk more.)' 줄로 Claude 를 부르고 더 이야기하기 토막의 선생님 행 하나를 남긴다", async () => {
    const ids = await inTalk("claude");
    const { sessionId } = ids;
    await toMore(ids);
    const before = (await rowsOf(sessionId)).length;
    h.fake.push(
      leadTurnRule({
        say: "Yay! What else do you like?",
        move: "react_and_follow_up",
      }),
    );
    const lines = await openLead(ids, "more");
    expect(lines.at(-1)?.t).toBe("end");
    expect(lastUserOf(leadRequests().at(-1)?.body)).toContain(
      "(The child chose to talk more.)",
    );
    const rows = await rowsOf(sessionId);
    expect(rows).toHaveLength(before + 1);
    const added = rows.at(-1);
    expect(added?.speaker).toBe("tori");
    expect(added?.segment).toBe("more_talk");
    expect(readTalkMove(added?.move)?.kind).toBe("ai");
    const end = lines.at(-1);
    expect(end?.t === "end" ? end.lesson.choice : "x").toBeNull();
  });

  it("AC-26i 1~3단계 model_repeat 차례: 따라 할 문장은 글에서 빠져 소리 줄로, 뜻 줄의 영어 문장은 걸러지고 다음 아이 차례는 '영어' · 답 예시 · '말했다' 빔이다(AC-26d)", async () => {
    const { sessionId } = await inTalk("claude");
    const word = unitWords[0] ?? "apple";
    h.fake.push(
      leadTurnRule({
        reading: "does_not_know",
        move: "model_repeat",
        say: "That's okay! Say it with me: I see the sun.",
        say_ko: '맞아, 해가 밝지! "I see the sun."이라고 말해 봐.',
        model_sentence: "I see the sun.",
      }),
    );
    const attempt = `lead-model-${++seq}`;
    const lines = await say(sessionId, { mode: "dont_know" }, attempt);
    expect(sOf(lines).join(" ")).not.toContain("I see the sun");
    expect(lines).toContainEqual({
      t: "sound",
      kind: "model",
      say: "I see the sun.",
    });
    expect(lines).toContainEqual({ t: "ko", ko: "맞아, 해가 밝지!" });
    const teacher = await lastTeacher(sessionId);
    expect(teacher?.text).not.toContain("I see the sun");
    expect(teacher?.toriKo).toBe("맞아, 해가 밝지!");
    const move = readTalkMove(teacher?.move);
    expect(move?.ai).toBe("model_line");
    expect(move?.sound).toEqual({ model: "I see the sun." });
    expect(move?.lead?.model).toEqual({
      sentence: "I see the sun.",
      inSay: true,
    });
    expect(move?.lead?.removed).toEqual(["I see the sun."]);
    // 같은 시도 다시 흘림은 저장한 행을 그대로(신호 말 없이) 다시 낸다 — AI 를 다시 부르지 않음
    const before = h.fake.requests.length;
    const replay = await say(sessionId, { mode: "dont_know" }, attempt);
    expect(h.fake.requests.length).toBe(before);
    expect(replay.filter((l) => l.t !== "end")).toEqual(
      lines.filter((l) => l.t !== "end"),
    );
    // 다음 아이 차례: 들은 도움 답 예시 → 힌트 종류 '영어' → '말했다' 빔(Claude 가 후보를 내도)
    h.fake.push(
      leadTurnRule({
        reading: "repeated_my_model",
        move: "react_only",
        say: "Great job!",
        child_used_on_own: [word],
      }),
    );
    await say(sessionId, speech(`I see the sun ${word}.`));
    expect(lastUserOf(leadRequests().at(-1)?.body)).toContain(
      'Your last turn gave a model sentence to repeat: "I see the sun."',
    );
    const child = await lastChild(sessionId);
    expect(child?.hintKind).toBe("english");
    expect(child?.heardHelp).toBe("answer_example");
    expect(child?.saidWords).toEqual([]);
  });

  it("AC-26i 1~3단계 막힌 뒤 고르기: or 물음 문장은 글 대신 소리 줄 하나로 나가고 앞 반응은 그대로이며, 막힌 뒤 한국어 뜻(hint_ko)이 말풍선 아래 글로 간다(AC-26c)", async () => {
    const { sessionId } = await inTalk("claude");
    h.fake.push(
      leadTurnRule({
        reading: "does_not_know",
        move: "easier_or_choices",
        say: "That's okay! Apples or bananas?",
        say_ko: "괜찮아! 사과야, 바나나야?",
        hint_ko: "사과라고 말해 봐.",
        hint_en: "Apples.",
      }),
    );
    const lines = await say(sessionId, { mode: "dont_know" });
    expect(sOf(lines)).toEqual(["That's okay!"]);
    expect(lines).toContainEqual({
      t: "sound",
      kind: "answer",
      say: "Apples or bananas?",
    });
    const end = lines.at(-1);
    expect(end?.t === "end" ? end.lesson.explanation : undefined).toBe(
      "사과라고 말해 봐.",
    );
    const teacher = await lastTeacher(sessionId);
    expect(teacher?.text).toBe("That's okay!");
    expect(teacher?.explanation).toBe("사과라고 말해 봐.");
    const move = readTalkMove(teacher?.move);
    expect(move?.ai).toBe("choices");
    expect(move?.sound).toEqual({ answer: "Apples or bananas?" });
    expect(move?.lead?.choices).toBe(true);
    expect(move?.cause).toBe("button");
  });

  it("AC-26g 좁은 정의에 걸린 질문은 같은 뜻 다시 말하기를 한 번 요청하고, 받는 조건을 지난 문장이 그 자리에 나가며 앞 반응 문장은 그대로다", async () => {
    const { sessionId } = await inTalk("claude");
    // 시험 시드에 없는 낱말(zebras · giraffes)의 고르기 질문 — 좁은 정의 (ㄴ) 고르기 낱말
    h.fake.push(leadRetryRule("Do you like big or small animals?"));
    h.fake.push(
      leadTurnRule({
        say: "You went outside! Do you like zebras or giraffes?",
        say_ko: "밖에 나갔구나! 얼룩말이 좋아, 기린이 좋아?",
      }),
    );
    const lines = await say(sessionId, speech("I play outside."));
    const retries = h.fake.requests.filter((r) =>
      r.bodyText.includes(LEAD_RETRY_MARK),
    );
    expect(retries).toHaveLength(1);
    const prompt = lastUserOf(retries[0]?.body);
    expect(prompt).toContain('Your question "Do you like zebras or giraffes?"');
    expect(prompt).not.toMatch(
      /different question|another question|ask about/i,
    );
    expect(sOf(lines)).toEqual([
      "You went outside!",
      "Do you like big or small animals?",
    ]);
    expect(JSON.stringify(lines)).not.toContain("zebras");
    const teacher = await lastTeacher(sessionId);
    expect(teacher?.text).toBe(
      "You went outside! Do you like big or small animals?",
    );
    expect(JSON.parse(teacher?.toriRewrite ?? "{}").say).toBe(
      "You went outside! Do you like big or small animals?",
    );
    const narrow = readTalkMove(teacher?.move)?.lead?.narrow;
    expect(narrow?.item).toContain("zebras");
    expect(narrow?.retry).toBe("Do you like big or small animals?");
    // 대화 첫 차례 · 이 차례 · 다시 말하기
    expect((await callTagsOf(sessionId)).sort()).toEqual([
      "lead",
      "lead",
      "lead.narrow",
    ]);
  });

  it("AC-26g 다시 받은 글이 받는 조건에 맞지 않거나(두 문장) 호출이 실패하면 원래 질문이 그대로 나간다(질문을 지우거나 바꾸지 않음)", async () => {
    for (const retry of ["Okay! Do you like big animals?", null] as const) {
      const { sessionId } = await inTalk("claude");
      if (retry !== null) h.fake.push(leadRetryRule(retry));
      h.fake.push(
        leadTurnRule({ say: "Cool! Do you like zebras or giraffes?" }),
      );
      const lines = await say(sessionId, speech("I play outside."));
      expect(sOf(lines)).toEqual(["Cool!", "Do you like zebras or giraffes?"]);
      const teacher = await lastTeacher(sessionId);
      expect(teacher?.text).toBe("Cool! Do you like zebras or giraffes?");
      expect(readTalkMove(teacher?.move)?.lead?.narrow?.retry).toBe("");
      expect(lines.at(-1)?.t).toBe("end");
    }
  });

  it("AC-26g 금지어가 든 문장은 지금 문장 문 규칙대로 카드 안전한 대사로 바뀌고 나머지 문장은 그대로 나간다", async () => {
    const { sessionId } = await inTalk("claude");
    h.fake.push(
      leadTurnRule({ say: "Haha! That is stupid. Do you like apples?" }),
    );
    const lines = await say(sessionId, speech("I like apples."));
    const safe = safeLineOf(card.safeLines, 1);
    expect(sOf(lines)).toEqual(["Haha!", safe, "Do you like apples?"]);
    expect(JSON.stringify(lines)).not.toContain("stupid");
    const teacher = await lastTeacher(sessionId);
    expect(teacher?.text).not.toContain("stupid");
    expect(readTalkMove(teacher?.move)?.lead?.gate).toContain("forbidden");
  });

  it("AC-26c 말소리 없음 차례는 '(The child said nothing.)' 줄로 부르고, 되묻기를 고르면 그 아이 행에 되물음 표지가 남으며 '말했다'가 없다", async () => {
    const { sessionId } = await inTalk("claude");
    h.fake.push(leadTurnRule({ say: "Are you there?", move: "react_only" }));
    await say(sessionId, { mode: "dont_know", nospeech: true });
    expect(lastUserOf(leadRequests().at(-1)?.body)).toContain(
      "(The child said nothing.)",
    );
    const word = unitWords[0] ?? "apple";
    h.fake.push(
      leadTurnRule({
        reading: "likely_misheard",
        move: "ask_again",
        say: "Sorry, say it again, please!",
        child_used_on_own: [word],
      }),
    );
    await say(sessionId, speech(`Pad ${word} pad pad.`));
    const child = await lastChild(sessionId);
    expect(child?.askAgain).toBe(true);
    expect(child?.saidWords).toEqual([]);
  });

  it("AC-26c 마무리 차례: 앱이 정한 때에 사실 줄로 알리고, 말 칸에 물음이 없을 때만 지금 상수 물음을 붙이며 두 단추 차례가 된다. move wrap_up 은 마무리 제안 길이다", async () => {
    for (const ownQuestion of [false, true]) {
      const { sessionId, profileId } = await inTalk("claude");
      const state = await readTalkLessonState(db, {
        sessionId,
        profileId,
        at: NOW,
      });
      if (!state) throw new Error("상태가 없다");
      for (let i = 1; i < state.spec.targetTurns; i++)
        await exchange(sessionId, "talk", "I like it.", "Nice!");
      h.fake.push(
        leadTurnRule({
          say: ownQuestion
            ? "You did great! Shall we talk a little more?"
            : "You did great today!",
          move: "react_only",
        }),
      );
      const lines = await say(sessionId, speech("I like apples."));
      expect(lastUserOf(leadRequests().at(-1)?.body)).toContain(
        "This is the closing turn.",
      );
      const added = lines.filter((l) => l.t === "add");
      const teacher = await lastTeacher(sessionId);
      const move = readTalkMove(teacher?.move);
      expect(move?.kind).toBe("closing_slot");
      if (ownQuestion) {
        expect(added).toEqual([]);
        expect(teacher?.text).toBe(
          "You did great! Shall we talk a little more?",
        );
        expect(move?.lead?.closingAdded).toBeUndefined();
      } else {
        expect(added).toEqual([
          {
            t: "add",
            kind: "more_prompt",
            en: MORE_PROMPT.en,
            ...(state.spec.koMeaning ? { ko: MORE_PROMPT.ko } : {}),
          },
        ]);
        expect(teacher?.text).toBe(`You did great today!\n${MORE_PROMPT.en}`);
        expect(move?.lead?.closingAdded).toBe(true);
      }
      const end = lines.at(-1);
      expect(end?.t === "end" ? end.lesson.choice : null).toBe("closing");
    }
    // Claude 가 스스로 마무리를 고른 차례(참고 턴 전) → 마무리 제안 길
    const { sessionId } = await inTalk("claude");
    h.fake.push(
      leadTurnRule({
        say: "That was fun! Shall we stop here?",
        move: "wrap_up",
      }),
    );
    const lines = await say(sessionId, speech("I'm tired."));
    expect(lastUserOf(leadRequests().at(-1)?.body)).not.toContain(
      "This is the closing turn.",
    );
    const move = readTalkMove((await lastTeacher(sessionId))?.move);
    expect(move?.next).toBe("closing");
    const end = lines.at(-1);
    expect(end?.t === "end" ? end.lesson.choice : null).toBe("suggestion");
  });

  it("AC-26a 진행 중인 수업은 설정이 바뀌어도 처음 값으로 간다(claude 로 연 수업 → 설정 app 이어도 새 엔진, app 으로 연 수업 → 설정 claude 여도 지금 길)", async () => {
    const lead = await inTalk("claude");
    const startRows = await db
      .select({ input: attempts.input })
      .from(attempts)
      .where(eq(attempts.sessionId, lead.sessionId));
    expect(
      startRows
        .map((r) => parseTalkAttemptInput(r.input))
        .find((i) => i?.kind === "talk-start"),
    ).toMatchObject({ leadMode: "claude" });
    await setHouseholdSetting(db, LEAD_MODE_KEY, "app");
    h.fake.push(leadTurnRule({ say: "Nice!" }));
    const sentBefore = leadRequests().length;
    await say(lead.sessionId, speech("I like apples."));
    expect(leadRequests().length - sentBefore).toBe(1);
    expect(
      readTalkMove((await lastTeacher(lead.sessionId))?.move)?.lead,
    ).toBeDefined();

    h = harnessOf(db);
    const app = await inTalk("app");
    await setHouseholdSetting(db, LEAD_MODE_KEY, "claude");
    h.fake.push(lessonTurnRule({ tori_en: "Oh, nice!" }));
    await say(app.sessionId, speech("I like apples."));
    expect(leadRequests()).toHaveLength(0);
    expect(
      h.fake.requests.filter((r) => r.bodyText.includes(TURN_MARK)),
    ).toHaveLength(1);
    expect(
      readTalkMove((await lastTeacher(app.sessionId))?.move)?.lead,
    ).toBeUndefined();
  });

  it("AC-26a 설정이 claude 여도 안내문 글이 없는 단원(시험 시드의 1단계 단원 1)은 처음 스냅숏에 claude 를 적지 않아 기존 방식으로 간다(13절 C241 보완)", async () => {
    const ids = await newSession("claude", { withText: false });
    const startRows = await db
      .select({ input: attempts.input })
      .from(attempts)
      .where(eq(attempts.sessionId, ids.sessionId));
    const start = startRows
      .map((r) => parseTalkAttemptInput(r.input))
      .find((i) => i?.kind === "talk-start");
    expect(start).toBeDefined();
    expect(start).not.toHaveProperty("leadMode");
    for (let i = 0; i < card.greetingTurns; i++)
      await exchange(ids.sessionId, "greeting", "I'm good.", "Great!");
    const view = await loadTalkLessonView(
      { sessionId: ids.sessionId },
      h.deps(),
    );
    if (view?.step.kind === "advance" && view.step.to === "prep")
      await advanceTalkLesson(
        { sessionId: ids.sessionId, to: "prep" },
        h.deps(),
      );
    const moved = await advanceTalkLesson(
      { sessionId: ids.sessionId, to: "talk" },
      h.deps(),
    );
    expect(moved.ok).toBe(true);
    expect(moved.ok ? moved.leadTurn : "x").toBeUndefined();
    h.fake.push(lessonTurnRule({ tori_en: "Oh, nice!" }));
    // 턴 길에 안내문 글을 넘겨도 스냅숏이 app 이면 지금 길이다(판단은 스냅숏 값 하나)
    await say(ids.sessionId, speech("I like apples."));
    expect(leadRequests()).toHaveLength(0);
    expect(
      h.fake.requests.filter((r) => r.bodyText.includes(TURN_MARK)),
    ).toHaveLength(1);
  });

  it("AC-26c 같은 차례의 입구 둘이 겹쳐도 AI 호출은 한 번만 나가고 행 하나가 더해지며, 아이에게 나간 글은 저장된 글과 같다(진 쪽은 stale 이거나 저장한 행의 다시 흘림 — 검토 rev-s1 I-3 · rev-s1-2 N-2 (나))", async () => {
    const ids = await inTalk("claude", { opening: false });
    const before = await rowsOf(ids.sessionId);
    // 겹칠 틈을 주려고 조각 사이를 늦춘다(막기가 틀리면 두 번째 응답도 받도록 두 번 답한다). 두 요청이 잠금을 지나는 차례는 부하에 따라 달라
    // 차례가 아니라 불변식을 본다: 호출 하나 · 행 하나 · 나간 글 = 저장된 글
    h.fake.push(
      leadTurnRule({ say: OPENING_SAY }, { times: 2, delayMs: 100, chunks: 4 }),
    );
    const both = await Promise.all([
      openLead(ids, "start"),
      openLead(ids, "start"),
    ]);
    expect(leadRequests()).toHaveLength(1);
    const after = await rowsOf(ids.sessionId);
    expect(after).toHaveLength(before.length + 1);
    const saved = after.at(-1);
    expect(saved?.speaker).toBe("tori");
    const ends = both.map((lines) => lines.at(-1)?.t);
    expect(ends).toContain("end");
    for (const lines of both) {
      const end = lines.at(-1)?.t;
      expect(["end", "stale"]).toContain(end);
      if (end === "stale") expect(sOf(lines)).toEqual([]);
      else expect(sOf(lines).join(" ")).toBe(saved?.text);
    }
    expect(await openMarksOf(ids.sessionId)).toHaveLength(1);
  });

  it("AC-26c 같은 차례의 입구 표지가 막 들어 있고(기다림 상한 안 · 호출 기록 없음) 그 호출이 진행 중이면, 다시 부른 입구는 호출 없이 stale 이고 표지 시각은 그대로다(검토 rev-s1-2 N-2 (가))", async () => {
    const ids = await inTalk("claude", { opening: false });
    const before = await rowsOf(ids.sessionId);
    const turnNo = (await maxTurn(ids.sessionId)) + 1;
    await db.insert(attempts).values({
      sessionId: ids.sessionId,
      clientAttemptId: leadOpenAttemptId(ids.sessionId, turnNo),
      activityNo: LEAD_OPEN_ACTIVITY_NO,
      input: LEAD_OPEN_INPUT,
      attemptedAt: NOW,
      status: "done",
    });
    h.fake.push(leadTurnRule({ say: OPENING_SAY }));
    const lines = await openLead(ids, "start");
    expect(lines).toEqual([{ t: "stale" }]);
    expect(leadRequests()).toHaveLength(0);
    expect(await rowsOf(ids.sessionId)).toHaveLength(before.length);
    const marks = await openMarksOf(ids.sessionId);
    expect(marks).toHaveLength(1);
    expect(marks[0]?.attemptedAt.getTime()).toBe(NOW.getTime());
  });

  it("AC-26c 안내문 글이 없어 호출 전에 끝난 입구는 표지를 지워, 바로 다시 부르면 받아들여진다(13절 C241 보완 2 · 검토 rev-s1-2 N-1)", async () => {
    const ids = await inTalk("claude", { opening: false });
    const failed = await openLead(ids, "start", { leadText: () => null });
    expect(failed).toEqual([{ t: "error" }]);
    expect(leadRequests()).toHaveLength(0);
    expect(await openMarksOf(ids.sessionId)).toHaveLength(0);
    h.fake.push(leadTurnRule({ say: OPENING_SAY }));
    const lines = await openLead(ids, "start");
    expect(lines.at(-1)?.t).toBe("end");
    expect(leadRequests()).toHaveLength(1);
    expect(await openMarksOf(ids.sessionId)).toHaveLength(1);
  });

  it("AC-26c 재료 읽기(단계 규격 CEFR)가 실패해 호출 전에 끝난 입구는 표지를 지워, 바로 다시 부르면 받아들여진다(13절 C241 보완 2 · 검토 rev-s1-2 N-1)", async () => {
    const ids = await inTalk("claude", { opening: false });
    const where = and(eq(levelSpecs.area, "talk"), eq(levelSpecs.level, 1));
    const saved = await db
      .select({ id: levelSpecs.id, cefr: levelSpecs.cefr })
      .from(levelSpecs)
      .where(where);
    expect(saved.length).toBeGreaterThan(0);
    let failed: TalkLessonLine[];
    try {
      await db.update(levelSpecs).set({ cefr: "?" }).where(where);
      failed = await openLead(ids, "start");
    } finally {
      for (const row of saved)
        await db
          .update(levelSpecs)
          .set({ cefr: row.cefr })
          .where(eq(levelSpecs.id, row.id));
    }
    expect(failed).toEqual([{ t: "error" }]);
    expect(leadRequests()).toHaveLength(0);
    expect(await openMarksOf(ids.sessionId)).toHaveLength(0);
    h.fake.push(leadTurnRule({ say: OPENING_SAY }));
    const lines = await openLead(ids, "start");
    expect(lines.at(-1)?.t).toBe("end");
    expect(leadRequests()).toHaveLength(1);
    expect(await openMarksOf(ids.sessionId)).toHaveLength(1);
  });

  it("AC-26c 'AI 쉬는 중'으로 끝난 입구는 표지 행을 남기지 않아, 쉬는 중이 풀린 뒤 다시 부르면 바로 받아들여진다(검토 rev-s1 I-3)", async () => {
    const ids = await inTalk("claude", { opening: false });
    const rested = await openLead(ids, "start", { resting: true });
    expect(rested).toEqual([{ t: "resting" }]);
    expect(await openMarksOf(ids.sessionId)).toHaveLength(0);
    expect(leadRequests()).toHaveLength(0);
    // 참여 완료 전(대화 토막 첫 차례)이라 세션은 열린 채 대화 토막에 남는다(아이 차례 길과 같은 규칙)
    expect(await sessionRowOf(ids.sessionId)).toEqual({
      status: "in_progress",
      talkSegment: "talk",
    });
    h.fake.push(leadTurnRule({ say: OPENING_SAY }));
    const lines = await openLead(ids, "start");
    expect(lines.at(-1)?.t).toBe("end");
    expect(leadRequests()).toHaveLength(1);
    expect(await openMarksOf(ids.sessionId)).toHaveLength(1);
  });

  it("AC-26c '더 이야기하기' 뒤의 입구가 'AI 쉬는 중'이면 참여 완료 뒤라 수업을 정리로 닫고 close 줄(쉬는 중 · 되짚을 말)을 내며, AI 호출이 없고 표지 행이 늘지 않는다(대화 첫 차례 입구의 표지 행은 그대로 남는다 · 8절 — 아이 차례 길과 같은 규칙, 화면 묶음 S3 보고 4절 1)", async () => {
    const ids = await inTalk("claude");
    const { sessionId } = ids;
    await toMore(ids);
    const requests = leadRequests().length;
    const rowsBefore = (await rowsOf(sessionId)).length;
    // 대화 첫 차례 입구(inTalk)가 넣은 표지 행이 이미 있다(표지는 호출이 끝나도 지우지 않는다) — 쉬는 중 닫기가 표지를 더하지 않음을 본다
    const marksBefore = (await openMarksOf(sessionId)).length;
    expect(marksBefore).toBe(1);
    const lines = await openLead(ids, "more", { resting: true });
    expect(lines).toHaveLength(1);
    const close = lines[0];
    if (close?.t !== "close") throw new Error("close 줄이 아니다");
    expect(close.reason).toBe("resting");
    expect(close.farewell.en).toBe(card.farewell.en);
    expect(Array.isArray(close.lines)).toBe(true);
    expect(leadRequests()).toHaveLength(requests);
    expect(await openMarksOf(sessionId)).toHaveLength(marksBefore);
    expect(await rowsOf(sessionId)).toHaveLength(rowsBefore);
    expect(await sessionRowOf(sessionId)).toEqual({
      status: "completed",
      talkSegment: "wrap_up",
    });
    // 끝맺음은 대기로 미룬다(쉬는 중이 풀린 뒤 홈 진입이 부른다)
    const [closing] = await db
      .select({ input: attempts.input, status: attempts.status })
      .from(attempts)
      .where(eq(attempts.clientAttemptId, talkClosingAttemptId(sessionId)));
    expect(closing?.status).toBe("awaiting_feedback");
    expect(parseTalkAttemptInput(closing?.input)).toMatchObject({
      kind: "talk-closing",
      reason: "resting",
    });
    // 닫힌 뒤 다시 부르면 stale 이다
    expect(await openLead(ids, "more")).toEqual([{ t: "stale" }]);
  });

  it("AC-26c 호출이 끊겨 남은 표지(행 없이 기다림 상한이 지난 것) 뒤의 다시 부름은 표지 시각을 고쳐 잡고 받아들여진다(검토 rev-s1 I-3)", async () => {
    const ids = await inTalk("claude", { opening: false });
    const turnNo = (await maxTurn(ids.sessionId)) + 1;
    const stale = new Date(NOW.getTime() - 2 * TURN_IN_FLIGHT_MS);
    await db.insert(attempts).values({
      sessionId: ids.sessionId,
      clientAttemptId: leadOpenAttemptId(ids.sessionId, turnNo),
      activityNo: LEAD_OPEN_ACTIVITY_NO,
      input: LEAD_OPEN_INPUT,
      attemptedAt: stale,
      status: "done",
    });
    h.fake.push(leadTurnRule({ say: OPENING_SAY }));
    const lines = await openLead(ids, "start");
    expect(lines.at(-1)?.t).toBe("end");
    expect(leadRequests()).toHaveLength(1);
    const marks = await openMarksOf(ids.sessionId);
    expect(marks).toHaveLength(1);
    expect(marks[0]?.attemptedAt.getTime()).toBe(NOW.getTime());
    // 표지 행은 처음 스냅숏 찾기 · 짧은 준비 읽기 같은 회화 시도 읽기에 닿지 않는다
    expect(parseTalkAttemptInput(marks[0]?.input)).toBeUndefined();
  });

  it("AC-26c 입구 차례가 실패해 카드 안전한 대사로 닫혀도 다음 아이 차례에 인사 이음과 대화 시작 줄을 다시 싣지 않는다(검토 rev-s1 M-1)", async () => {
    const ids = await inTalk("claude", { opening: false });
    // 새 엔진 요청에 답하는 규칙이 없다 — 호출이 실패해 카드 안전한 대사로 닫는다
    const opened = await openLead(ids, "start");
    expect(opened.at(-1)?.t).toBe("end");
    const failed = await lastTeacher(ids.sessionId);
    expect(readTalkMove(failed?.move)?.kind).toBe("first_question");
    expect(failed?.toriRewrite).toBeNull();
    h.fake.push(leadTurnRule({ say: "Nice! Do you like apples?" }));
    const lines = await say(ids.sessionId, speech("I like apples."));
    expect(lines.at(-1)?.t).toBe("end");
    const user = lastUserOf(leadRequests().at(-1)?.body);
    expect(user).toContain("Child turn");
    expect(user).not.toContain("Greeting so far:");
    expect(user).not.toContain("The talk part starts now.");
  });

  it("AC-26a 새 엔진의 호출 실패도 '같은 오류' 셈에 든다: 표지(lead · lead.narrow)를 단 행을 지금 엔진의 행과 같은 갈래로 세고, 질문 다시 쓰기 표지 행은 지금처럼 세지 않는다(13절 C241 보완 · 검토 rev-s1 I-4)", async () => {
    const learningDay = "2030-01-01";
    const row = (errorCode: string, status: "error" | "success" = "error") =>
      insertAiCall(db, {
        profileId: null,
        sessionId: null,
        calledAt: NOW,
        learningDay,
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
        status,
        errorCode,
      });
    await row("same_error:404");
    expect(
      await sameErrorCount(db, { purpose: "talk_turn", learningDay }),
    ).toBe(1);
    await row("lead:same_error:404");
    await row("lead.narrow:same_error:404");
    await row("question_retry:same_error:404");
    await row("lead:timeout");
    await row("lead:server:529");
    await row("leadx:same_error:404");
    expect(
      await sameErrorCount(db, { purpose: "talk_turn", learningDay }),
    ).toBe(3);
  });

  it("AC-26a 새 엔진 수업의 대화 차례에 처리기 없이 지금 턴 길(runTalkLessonTurn)을 부르면 지금 길로 조용히 가지 않고 error 줄로 끝나며 AI 를 부르지 않는다(운영의 부르는 곳 turn.ts 는 처리기를 넘긴다 — 의존 방향 고침)", async () => {
    const { sessionId, profileId } = await inTalk("claude");
    const before = h.fake.requests.length;
    const lines: TalkLessonLine[] = [];
    const contact = getOutputCheckLists()
      .forbidden.patterns.filter((p) => p.category === "contact")
      .map((p) => p.regex);
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await runTalkLessonTurn(
        {
          sessionId,
          clientAttemptId: `lead-turn-${++seq}`,
          input: speech("I like apples."),
          hint: { opened: 0, heard: [] },
        },
        { ...h.deps(), write: (line) => lines.push(line) },
        {
          db,
          profileId,
          masker: await maskerFor(db, profileId, contact),
          settings: await getSettings(turnSettings, { db, profileId }),
          at: h.clock.now,
          received: h.clock.now,
          restingP: Promise.resolve(false),
          timer: createStageTimer(() => performance.now()),
        },
      );
      expect(logged).toHaveBeenCalledWith(
        expect.stringContaining("회화 수업 턴 길 실패"),
      );
    } finally {
      logged.mockRestore();
    }
    expect(lines).toEqual([{ t: "error" }]);
    expect(h.fake.requests.length).toBe(before);
  });
});

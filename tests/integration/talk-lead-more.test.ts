// 회화 Claude 주도 묶음 S3 통합 시험(spec '회화 Claude 주도' 설계 3 · 13절 C241 · 정본 15절 AC-26c): 턴 요청의 아이 말 없는 꼴 둘
// ({ sessionId, lead: "start" | "more" })이 턴 요청 입구(turn.ts runTalkTurnRequest)에서 새 엔진 입구(lead-turn.ts runLeadOpenTurn)로 이어지는지 본다.
// 세션은 시험용 시드의 회화 1단계 단원 1 수업 1 로 열고, 안내문 글은 3단계 단원 1 에만 있으므로 처음 스냅숏 · 턴 길에 의존 leadText 로 그 글을
// 넘긴다(묶음 S1 고침 1 의 talk-lead-turn.test.ts 와 같은 꼴). 가짜 Anthropic 은 사실 알림 머리 줄로 새 엔진 요청을 가른다.
// 증명: (가) start → 대화 토막 첫 차례의 선생님 행 하나 (나) more → 더 이야기하기 토막의 선생님 행 하나 · 그 말의 단원 단어가 '만났다'
// (다) 새 방식이 아닌 수업 · 그 차례가 아닌 요청은 거절(AI 없음 · 행 그대로) (라) 기존 방식의 아이 말 턴 요청은 그대로.
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TALK_LEAD_TEXT_L3U1 } from "@/core/ai/calls/talk-lead";
import { readTalkMove, talkMoveOf } from "@/core/conversation/move";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { LEVEL_MAX } from "@/core/seed/structure";
import { lessons, vocab } from "@/db/schema/content";
import { sessions, talkTurns, vocabProgress } from "@/db/schema/learning";
import { settings } from "@/db/schema/operations";
import {
  advanceTalkLesson,
  chooseLessonMoreTalk,
  loadTalkLessonView,
} from "@/server/conversation";
import type { TalkLessonLine } from "@/server/conversation/lesson-turn";
import { readTalkLessonState } from "@/server/conversation/state";
import { runTalkTurnRequest } from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import { loadSeed } from "@/server/seed/load";
import { levelContextOf } from "@/server/session/ai-context";
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
/** 새 엔진의 대화 첫 차례 말(좁은 정의에 걸리지 않는 물음 — talk-lead-turn.test.ts 와 같은 값). */
const OPENING_SAY = "Hello again! Do you like it?";

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

// ── 도우미(talk-lead-turn.test.ts 와 같은 꼴 — 이 파일 몫) ─────────────

/** 처음 스냅숏을 적을 때 · 턴 길에서 안내문 글이 있는 단원으로 보게 하는 의존(13절 C241 보완, 묶음 S1 고침 1 의 주입 자리). */
const leadDeps = () => ({ ...h.deps(), leadText: () => TALK_LEAD_TEXT_L3U1 });

/** 처음 열 때의 설정 값을 mode 로 두고 새 세션을 연다(처음 스냅숏은 화면 자료를 처음 읽을 때 적힌다). */
async function newSession(
  mode: Mode,
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
  const view = await loadTalkLessonView({ sessionId: session.id }, leadDeps());
  if (!view) throw new Error("화면 자료가 없다");
  return { profileId, sessionId: session.id };
}

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

/** 턴 요청 하나를 턴 요청 입구로 보내고 흘린 줄을 모은다(Route Handler 가 넘기는 의존 꼴 + 안내문 글). */
async function request(body: unknown): Promise<TalkLessonLine[]> {
  const lines: TalkLessonLine[] = [];
  await runTalkTurnRequest(body, {
    ...leadDeps(),
    write: (line: TalkLessonLine) => lines.push(line),
    requestReceivedAt: h.clock.now,
  });
  return lines;
}

/** 인사(지금 길) → (짧은 준비) → 대화로 넘김까지 온 세션과 그 넘김 결과(새 방식이면 leadTurn start). */
async function toTalk(mode: Mode) {
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
  return { ...ids, moved };
}

let seq = 0;
/** 아이 말 턴 요청(지금 꼴). */
const childBody = (sessionId: string, text: string) => ({
  sessionId,
  clientAttemptId: `lead-more-${++seq}`,
  input: { mode: "speech", text },
  hint: { opened: 0, heard: [] },
});

/** 새 엔진 수업을 마무리 차례에 답할 자리까지(대화 첫 차례 → 앞선 대화 차례 → 마무리 차례) 데려가 '더 이야기하기'를 고른다. */
async function toMoreSignal() {
  const ids = await toTalk("claude");
  h.fake.push(leadTurnRule({ say: OPENING_SAY }));
  const opened = await request({ sessionId: ids.sessionId, lead: "start" });
  if (opened.at(-1)?.t !== "end")
    throw new Error("대화 첫 차례가 끝나지 않았다");
  const state = await readTalkLessonState(db, {
    sessionId: ids.sessionId,
    profileId: ids.profileId,
    at: NOW,
  });
  if (!state) throw new Error("상태가 없다");
  for (let i = 1; i < state.spec.targetTurns; i++)
    await exchange(ids.sessionId, "talk", "I like it.", "Nice!");
  h.fake.push(
    leadTurnRule({ say: "You did great today!", move: "react_only" }),
  );
  const closing = await request(childBody(ids.sessionId, "I like apples."));
  const end = closing.at(-1);
  if (end?.t !== "end" || end.lesson.choice !== "closing")
    throw new Error("마무리 차례가 아니다");
  const more = await chooseLessonMoreTalk(
    { sessionId: ids.sessionId },
    h.deps(),
  );
  if (!more.ok || more.leadTurn !== "more")
    throw new Error("새 엔진 '더 이야기하기' 신호가 없다");
  return ids;
}

function leadRequests() {
  return h.fake.requests.filter(
    (r) =>
      r.bodyText.includes(LEAD_STATUS_MARK) &&
      !r.bodyText.includes(LEAD_RETRY_MARK),
  );
}

function turnRequests() {
  return h.fake.requests.filter((r) => r.bodyText.includes(TURN_MARK));
}

/** 요청 본문의 마지막 사용자 메시지 글. */
function lastUserOf(body: unknown): string {
  const messages = (body as { messages?: { role: string; content: unknown }[] })
    ?.messages;
  const last = messages?.at(-1);
  return typeof last?.content === "string" ? last.content : "";
}

const sOf = (lines: TalkLessonLine[]) =>
  lines.flatMap((l) => (l.t === "s" ? [l.en] : []));

/** 그 프로필의 그 낱말 '말함' 행(만났다 · 말했다). */
async function sayRowOf(profileId: string, word: string) {
  const [row] = await db
    .select({ saidDays: vocabProgress.saidDays })
    .from(vocabProgress)
    .innerJoin(vocab, eq(vocab.id, vocabProgress.vocabId))
    .where(
      and(
        eq(vocabProgress.profileId, profileId),
        eq(vocabProgress.state, "say"),
        eq(vocab.word, word),
      ),
    );
  return row;
}

// ── 시험 ───────────────────────────────────────────────────────────

describe("회화 Claude 주도 묶음 S3 아이 말 없는 턴 요청", () => {
  it("AC-26c 턴 요청 start 는 새 엔진 입구로 이어져 대화 토막 첫 차례의 선생님 행 하나를 남긴다(아이 행 없음 · 지금 회화 턴 요청 없음 · 흘린 말 = 말 칸)", async () => {
    const { sessionId, moved } = await toTalk("claude");
    expect(moved.leadTurn).toBe("start");
    const before = await rowsOf(sessionId);
    h.fake.push(leadTurnRule({ say: OPENING_SAY }));
    const lines = await request({ sessionId, lead: "start" });
    expect(lines.at(-1)?.t).toBe("end");
    expect(sOf(lines)).toEqual(["Hello again!", "Do you like it?"]);
    expect(leadRequests()).toHaveLength(1);
    expect(turnRequests()).toHaveLength(0);
    expect(lastUserOf(leadRequests()[0]?.body)).toContain(
      "The talk part starts now.",
    );
    const after = await rowsOf(sessionId);
    expect(after).toHaveLength(before.length + 1);
    const added = after.at(-1);
    expect(added?.speaker).toBe("tori");
    expect(added?.segment).toBe("talk");
    expect(added?.text).toBe(OPENING_SAY);
    // 대화 첫 질문 차례를 닫는 행(묶음 S1 — 아이의 첫 답이 거절되지 않게)
    expect(readTalkMove(added?.move)?.kind).toBe("first_question");
    expect(readTalkMove(added?.move)?.lead).toBeDefined();
    // 같은 요청을 다시 보내면 AI 없이 저장한 행을 그대로 다시 낸다(화면의 다시 해 보기 · 끊김 뒤 다시 보냄)
    const again = await request({ sessionId, lead: "start" });
    expect(sOf(again)).toEqual(sOf(lines));
    expect(again.at(-1)?.t).toBe("end");
    expect(leadRequests()).toHaveLength(1);
    expect(await rowsOf(sessionId)).toHaveLength(after.length);
  });

  it("AC-26c 턴 요청 more 는 '(The child chose to talk more.)' 로 부르고 더 이야기하기 토막의 선생님 행 하나를 남기며, 그 말의 단원 단어가 '만났다'로 적힌다(검토 rev-s2 6절 2)", async () => {
    const word = unitWords.find(
      (w) => !`${OPENING_SAY} You did great today! Nice!`.includes(w),
    );
    if (!word) throw new Error("시험 단원 단어가 없다");
    const { sessionId, profileId } = await toMoreSignal();
    expect(await sayRowOf(profileId, word)).toBeUndefined();
    const before = await rowsOf(sessionId);
    const say = `Yay! Let's talk about ${word}.`;
    h.fake.push(leadTurnRule({ say, move: "react_only" }));
    const lines = await request({ sessionId, lead: "more" });
    expect(lines.at(-1)?.t).toBe("end");
    expect(sOf(lines).join(" ")).toBe(say);
    expect(lastUserOf(leadRequests().at(-1)?.body)).toContain(
      "(The child chose to talk more.)",
    );
    const after = await rowsOf(sessionId);
    expect(after).toHaveLength(before.length + 1);
    const added = after.at(-1);
    expect(added?.speaker).toBe("tori");
    expect(added?.segment).toBe("more_talk");
    const end = lines.at(-1);
    expect(end?.t === "end" ? end.lesson.choice : "x").toBeNull();
    // 선생님 말의 단원 단어는 '만났다'(말함 행이 생기고 '말했다' 학습일은 비어 있음)
    const met = await sayRowOf(profileId, word);
    expect(met).toBeDefined();
    expect(met?.saidDays ?? ["x"]).toEqual([]);
  });

  it("AC-26c 새 방식이 아닌 수업(app)의 start · more 요청은 거절되고(stale) AI 를 부르지 않으며 행이 늘지 않는다", async () => {
    const { sessionId, moved } = await toTalk("app");
    expect(moved.leadTurn).toBeUndefined();
    const before = await rowsOf(sessionId);
    for (const lead of ["start", "more"] as const) {
      const lines = await request({ sessionId, lead });
      expect(lines).toEqual([{ t: "stale" }]);
    }
    expect(h.fake.requests).toHaveLength(0);
    expect(await rowsOf(sessionId)).toHaveLength(before.length);
  });

  it("AC-26c 새 방식 수업이라도 그 차례가 아닌 입구(대화 첫 차례 뒤 아이가 답한 다음의 start · 고를 차례가 없는 more)는 거절된다", async () => {
    const { sessionId } = await toTalk("claude");
    h.fake.push(leadTurnRule({ say: OPENING_SAY }));
    await request({ sessionId, lead: "start" });
    h.fake.push(leadTurnRule({ say: "Nice! Do you like it?" }));
    const answered = await request(childBody(sessionId, "Yes."));
    expect(answered.at(-1)?.t).toBe("end");
    const calls = h.fake.requests.length;
    const before = await rowsOf(sessionId);
    for (const lead of ["start", "more"] as const)
      expect(await request({ sessionId, lead })).toEqual([{ t: "stale" }]);
    expect(h.fake.requests).toHaveLength(calls);
    expect(await rowsOf(sessionId)).toHaveLength(before.length);
  });

  it("AC-26c 아이 말 없는 요청 꼴이 아닌 본문(다른 칸이 섞임 · 모르는 입구)은 오류 줄 하나이고 AI 를 부르지 않는다", async () => {
    const { sessionId } = await toTalk("claude");
    for (const body of [
      { sessionId, lead: "start", clientAttemptId: "x" },
      { sessionId, lead: "again" },
    ])
      expect(await request(body)).toEqual([{ t: "error" }]);
    expect(h.fake.requests).toHaveLength(0);
  });

  it("AC-26a 기존 방식(app)의 아이 말 턴 요청은 지금 길 그대로다(지금 회화 턴 요청 하나 · 새 엔진 요청 없음 · move.lead 없음)", async () => {
    const { sessionId } = await toTalk("app");
    h.fake.push(lessonTurnRule({ tori_en: "Oh, nice!" }));
    const lines = await request(childBody(sessionId, "I like apples."));
    expect(lines.at(-1)?.t).toBe("end");
    expect(lines).toContainEqual({ t: "s", en: "Oh, nice!" });
    expect(turnRequests()).toHaveLength(1);
    expect(leadRequests()).toHaveLength(0);
    const teacher = (await rowsOf(sessionId))
      .filter((r) => r.speaker === "tori")
      .at(-1);
    expect(readTalkMove(teacher?.move)?.lead).toBeUndefined();
  });
});

// 회화 세션 서버(plan-p13b 작업 2 증명 표 — AC-15c · 15f · 16b · 16c · 2c · 8c · 1-가 안전 상한(회화) · '회화 세션:' 여덟,
// a '회화 수업 모델' 5 세션 상태 표 · 5절 전이 · 3.3 '대화가 멈추는 경우' · 8절 · C89 · C90 · C101). 가짜 Anthropic(SSE)만 쓴다.
// 설계 숫자는 TEST_SETTINGS · 단계 규격 · 카드에서 읽는다. 아이 이름 · 연락처는 지어낸 값이다.
import { and, eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { twoAnswersLine } from "@/core/ai/calls/talk";
import { talkClosingAttemptId } from "@/core/conversation/attempt";
import { normalizeSpoken } from "@/core/conversation/flow";
import {
  type StageTimings,
  stageTimingsLine,
} from "@/core/conversation/timing";
import { learningDayOf } from "@/core/learning-day";
import { AI_WAIT_TIMEOUT_MULTIPLE } from "@/core/seed/structure";
import { splitSentences } from "@/core/seed/text";
import { feedbackStateOf } from "@/core/writing/feedback";
import { lessons, vocab } from "@/db/schema/content";
import {
  attempts,
  profiles,
  profileTracks,
  sessions,
  talkSummaries,
  vocabProgress,
} from "@/db/schema/learning";
import { aiCalls } from "@/db/schema/operations";
import {
  advanceTalk,
  chooseMoreTalk,
  closeIdleTalks,
  leaveTalk,
  readTalkWrap,
  runTalkClosing,
  saveFollowAlong,
  stopTalk,
  type TalkLine,
  talkClosingStatus,
} from "@/server/conversation";
import { closingStateOf } from "@/server/conversation/closing";
import {
  TURN_IN_FLIGHT_MS,
  TURN_SAVE_GRACE_MS,
} from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import { readLessonList } from "@/server/lesson-list";
import { startLessonSession } from "@/server/session";
import { chooseTeacherFor } from "@/server/teacher";
import { retryPendingFeedback } from "@/server/writing";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  CLOSING_MARK,
  capAtCurrentCalls,
  cardOf,
  closingRule,
  DISPLAY_NAME,
  ENGLISH_NAME,
  harnessOf,
  intoTalk,
  MS_PER_MINUTE,
  NEXT_DAY,
  NOW,
  playToTarget,
  requestsOf,
  resetHousehold,
  type SayOptions,
  say,
  sessionOf,
  setHouseholdSetting,
  setupTalkDb,
  startTalk,
  type TalkDb,
  type TalkHarness,
  TURN_MARK,
  talkLessonRow,
  turnRule,
  turnsOf,
  viewOf,
} from "./talk-fixture";

const TZ = TEST_SETTINGS["app.timezone"].value;
const DAY_START = TEST_SETTINGS["app.day_start_hour"].value;
const TODAY = learningDayOf(NOW, TZ, DAY_START);
const IDLE_MINUTES = TEST_SETTINGS["talk.idle_close_minutes"].value;
const REALTIME_TIMEOUT_SECONDS =
  TEST_SETTINGS["ai.timeout_seconds.realtime"].value;
/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;
const MEMORY = TEST_SETTINGS["talk.memory_summaries"].value;
const SUMMARY_MAX = TEST_SETTINGS["talk.summary_max_chars"].value;
const FRIENDSHIP_PER = TEST_SETTINGS["talk.friendship_per_talk"].value;
const CLOSING_MAX_TOKENS = TEST_SETTINGS["ai.max_tokens.talk_closing"].value;

let talkDb: TalkDb;
let db: Db;
let h: TalkHarness;
let profileId: string;
const touched = new Map<string, unknown>();

beforeAll(async () => {
  talkDb = await setupTalkDb();
  db = talkDb.db;
});
afterAll(async () => {
  await talkDb.testDb.drop();
});
beforeEach(async () => {
  profileId = await resetHousehold(db, 1);
  h = harnessOf(db);
});
afterEach(async () => {
  for (const [key, value] of touched) await setHouseholdSetting(db, key, value);
  touched.clear();
  vi.restoreAllMocks();
});

async function closingRecord(sessionId: string) {
  const [row] = await db
    .select()
    .from(attempts)
    .where(eq(attempts.clientAttemptId, talkClosingAttemptId(sessionId)));
  return row;
}

async function callsOf(purpose: "talk_turn" | "talk_closing") {
  return db.select().from(aiCalls).where(eq(aiCalls.purpose, purpose));
}

/** 한 턴(가짜 한 번 + 아이 말). */
async function turn(sessionId: string, opts: SayOptions = {}, tori = "Good!") {
  h.fake.push(turnRule({ tori_en: tori }));
  return say(h, sessionId, opts);
}

describe("회화 세션: 시작 · 상태 전이", () => {
  it("회화 세션: 세션 시작 · 처음 열기 · 대화 첫 질문 · 이어 하기에서 AI 호출이 0회다", async () => {
    const sessionId = await startTalk(h, 1);
    const started = await sessionOf(db, sessionId);
    expect(started).toMatchObject({
      area: "talk",
      status: "in_progress",
      talkSegment: "greeting",
    });
    const card = cardOf(await talkLessonRow(db, 1));
    const greeting =
      "questions" in card.greeting ? card.greeting.questions[0] : undefined;
    const view = await viewOf(h, sessionId);
    expect(view.next.pending?.en).toBe(greeting?.question.en);
    expect(h.fake.requests).toHaveLength(0);
    // 처음 스냅숏(activity_no 1) · 토리 행 1(인사 질문 + 답 두 개)
    const start = await db
      .select()
      .from(attempts)
      .where(eq(attempts.clientAttemptId, `talk-start:${sessionId}`));
    expect(start).toHaveLength(1);
    expect(start[0]?.activityNo).toBe(1);
    const rows = await turnsOf(db, sessionId);
    expect(rows.map((r) => `${r.speaker}${r.turnNo}`)).toEqual(["tori1"]);
    expect(rows[0]?.text).toContain(greeting?.question.en ?? "?");

    await intoTalk(h, sessionId);
    expect(requestsOf(h, TURN_MARK)).toBe(1);
    const resumed = await viewOf(h, sessionId);
    const firstTalk = card.turns?.[0]?.question.en;
    expect(resumed.next.pending?.en).toBe(firstTalk);
    expect(
      resumed.lastTori?.add.some(
        (l) => l.t === "add" && "en" in l && l.en === firstTalk,
      ),
    ).toBe(true);
    // 다시 열어도 AI 를 부르지 않는다
    await viewOf(h, sessionId);
    expect(h.fake.requests).toHaveLength(1);
    expect(await callsOf("talk_turn")).toHaveLength(1);
  });

  it("회화 세션: 목표 턴에 닿은 턴에서 완료가 되고 완료 시각 · 학습일이 차며 그 뒤 '더 이야기하기' 턴은 목표 턴 밖으로 붙는다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    const reached = await playToTarget(h, sessionId);
    expect(reached.next.awaitingChoice).toBe(true);
    const done = await sessionOf(db, sessionId);
    expect(done.status).toBe("completed");
    expect(done.completedAt?.getTime()).toBe(NOW.getTime());
    expect(done.learningDay).toBe(TODAY);
    expect(done.talkSegment).toBe("talk");
    // 고르기 전에는 아이 턴을 받지 않는다
    expect((await turn(sessionId)).last).toEqual({ t: "stale" });
    const more = await chooseMoreTalk({ sessionId }, h.deps());
    if (!more.ok) throw new Error(more.reason);
    expect(more.segment).toBe("more_talk");
    expect(more.add.some((l) => l.t === "add" && l.kind === "question")).toBe(
      true,
    );
    const { last } = await turn(sessionId);
    if (last?.t !== "end") throw new Error("끝 줄");
    expect(last.next.segment).toBe("more_talk");
    const rows = await turnsOf(db, sessionId);
    const lastChild = rows.filter((r) => r.speaker === "child").at(-1);
    expect(lastChild).toMatchObject({
      segment: "more_talk",
      withinTarget: false,
    });
    expect((await sessionOf(db, sessionId)).status).toBe("completed");
  });

  it("AC-15c 회화 세션의 점수는 끝나도 비어 있다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await playToTarget(h, sessionId);
    h.fake.push(closingRule());
    const stopped = await stopTalk({ sessionId, confirmed: false }, h.deps());
    expect(stopped.ok).toBe(true);
    await h.runTasks();
    const row = await sessionOf(db, sessionId);
    expect(row.status).toBe("completed");
    expect(row.score).toBeNull();
    const tried = await db
      .select({ score: attempts.score, wordResults: attempts.wordResults })
      .from(attempts)
      .where(eq(attempts.sessionId, sessionId));
    for (const t of tried) {
      expect(t.score).toBeNull();
      expect(t.wordResults).toBeNull();
    }
  });

  it("회화 세션: 목표 턴 전에 그만둔 회화는 중단이고 완료로 세지 않는다(연속 일수 · 별의 회화 조건 — P12)", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await turn(sessionId);
    expect(await stopTalk({ sessionId, confirmed: false }, h.deps())).toEqual({
      ok: false,
      reason: "needs_confirm",
    });
    const stopped = await stopTalk({ sessionId, confirmed: true }, h.deps());
    if (!stopped.ok) throw new Error(stopped.reason);
    expect(stopped.wrap.aborted).toBe(true);
    const row = await sessionOf(db, sessionId);
    expect(row).toMatchObject({
      status: "aborted",
      completedAt: null,
      learningDay: TODAY,
      talkSegment: "wrap_up",
    });
    const list = await readLessonList({ db, area: "talk", now: NOW });
    if (list.kind !== "list") throw new Error("목록");
    expect(list.input.sessions.filter((s) => s.status === "completed")).toEqual(
      [],
    );
  });

  it("회화 세션: 따라 말하기 시도는 attempts 에, 회화 턴은 talk_turns 에 남고 영어로 말한 문장 수가 인식 글이 있는 발화마다 는다", async () => {
    const sessionId = await startTalk(h, 1);
    const view = await viewOf(h, sessionId);
    // 인사 '모름'은 세지 않는다(C41)
    h.fake.push(turnRule({ tori_en: "That's okay!" }));
    await say(h, sessionId, { mode: "dont_know" });
    expect((await sessionOf(db, sessionId)).englishSentences).toBe(0);
    h.fake.push(turnRule({ tori_en: "Great!" }));
    await say(h, sessionId, { text: "I'm good." });
    expect((await sessionOf(db, sessionId)).englishSentences).toBe(1);
    const moved = await advanceTalk({ sessionId, to: "today_words" }, h.deps());
    expect(moved.ok).toBe(true);
    const word = view.follow.todayWords[0]?.word ?? "";
    const follow = {
      sessionId,
      clientAttemptId: "follow-1",
      segment: "today_words",
      index: 0,
      target: word,
      heard: [word, ""],
      failures: 1,
    };
    expect(await saveFollowAlong(follow, h.deps())).toEqual({
      ok: true,
      saved: true,
    });
    expect(await saveFollowAlong(follow, h.deps())).toEqual({
      ok: true,
      saved: false,
    });
    const [saved] = await db
      .select()
      .from(attempts)
      .where(eq(attempts.clientAttemptId, "follow-1"));
    expect(saved).toMatchObject({ activityNo: 2, status: "done", score: null });
    expect(saved?.input).toMatchObject({ kind: "talk-today", index: 0 });
    // 빈 인식 글은 세지 않는다
    expect((await sessionOf(db, sessionId)).englishSentences).toBe(2);
    const rows = await turnsOf(db, sessionId);
    expect(rows.filter((r) => r.speaker === "child")).toHaveLength(2);
    // 말해 보기 토막 전에는 말해 보기 시도를 받지 않는다
    expect(
      await saveFollowAlong(
        {
          ...follow,
          clientAttemptId: "follow-2",
          segment: "practice",
          round: 0,
        },
        h.deps(),
      ),
    ).toEqual({ ok: false, reason: "invalid" });
  });

  it("회화 세션: 두 기기가 같은 턴을 보내면 하나만 받고 늦은 쪽은 다시 읽으라는 답을 받는다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    const before = requestsOf(h, TURN_MARK);
    h.fake.push(turnRule({ tori_en: "Nice one!" }, { delayMs: 50, chunks: 6 }));
    const [a, b] = await Promise.all([
      say(h, sessionId, { clientAttemptId: "device-a" }),
      say(h, sessionId, { clientAttemptId: "device-b" }),
    ]);
    const ends = [a.last?.t, b.last?.t].sort();
    expect(ends).toEqual(["end", "stale"]);
    expect(requestsOf(h, TURN_MARK)).toBe(before + 1);
    const rows = await turnsOf(db, sessionId);
    expect(
      rows.filter(
        (r) =>
          r.clientAttemptId === "device-a" || r.clientAttemptId === "device-b",
      ),
    ).toHaveLength(1);
  });

  it("회화 세션: 만남과 '말했다'는 '말함' 행에 남고 next_review_day 는 비어 있다", async () => {
    const sessionId = await startTalk(h, 1);
    const view = await intoTalk(h, sessionId);
    const card = cardOf(await talkLessonRow(db, 1));
    const first = card.turns?.[0];
    if (!first) throw new Error("견본 꼴");
    h.fake.push(
      turnRule({ tori_en: "Yes!", self_used_words: [...first.targets] }),
    );
    await say(h, sessionId, {
      text: first.answerExample,
      hint: { opened: 0, heard: [] },
    });
    const rows = await db
      .select({
        word: vocab.word,
        saidDays: vocabProgress.saidDays,
        nextReviewDay: vocabProgress.nextReviewDay,
        firstArea: vocabProgress.firstArea,
      })
      .from(vocabProgress)
      .innerJoin(vocab, eq(vocab.id, vocabProgress.vocabId))
      .where(
        and(
          eq(vocabProgress.profileId, profileId),
          eq(vocabProgress.state, "say"),
        ),
      );
    const met = new Set(rows.map((r) => r.word));
    for (const w of view.follow.todayWords) expect(met.has(w.word)).toBe(true);
    for (const r of rows) {
      expect(r.nextReviewDay).toBeNull();
      expect(r.firstArea).toBe("talk");
    }
    const said = rows.find((r) => r.word === first.targets[0]);
    expect(said?.saidDays).toEqual([TODAY]);
    const child = (await turnsOf(db, sessionId))
      .filter((r) => r.speaker === "child")
      .at(-1);
    expect(child?.saidWords).toEqual([first.targets[0]]);
  });
});

describe("회화 선생님(선생님 화면 plan 값 7 — 처음 스냅숏 키 · 고르기 전 미룸)", () => {
  async function startInput(sessionId: string) {
    const [row] = await db
      .select({ input: attempts.input })
      .from(attempts)
      .where(eq(attempts.clientAttemptId, `talk-start:${sessionId}`));
    return row?.input as Record<string, unknown> | undefined;
  }

  it("AC-19b 처음 스냅숏에 고른 선생님 키가 남고 프로필 선생님이 바뀌어도 그 대화는 스냅숏 키로 가며 스냅숏 키가 명단에 없으면 프로필의 지금 선생님이다", async () => {
    const sessionId = await startTalk(h, 1);
    const view = await viewOf(h, sessionId);
    expect(view.teacher).toMatchObject({ key: "mina", nameKo: "미나" });
    expect(view.teacherChoices).toEqual([]);
    expect(view.teacherSettings).toEqual({
      render: TEST_SETTINGS["talk.teacher_render"].value,
      loadTimeoutSeconds:
        TEST_SETTINGS["talk.teacher_load_timeout_seconds"].value,
      praiseSeconds: TEST_SETTINGS["talk.teacher_praise_seconds"].value,
    });
    expect(await startInput(sessionId)).toMatchObject({
      kind: "talk-start",
      teacherKey: "mina",
    });

    await db
      .update(profiles)
      .set({ teacherKey: "leo" })
      .where(eq(profiles.id, profileId));
    expect((await viewOf(h, sessionId)).teacher?.key).toBe("mina");

    // 명단에서 빠진 키가 남은 스냅숏(명단을 줄인 뒤)은 프로필의 지금 선생님
    const input = await startInput(sessionId);
    await db
      .update(attempts)
      .set({ input: { ...input, teacherKey: "tori" } })
      .where(eq(attempts.clientAttemptId, `talk-start:${sessionId}`));
    expect((await viewOf(h, sessionId)).teacher?.key).toBe("leo");
    // 선생님 전 옛 스냅숏(키 없음)도 읽힌다
    const { teacherKey: _dropped, ...old } = input ?? {};
    await db
      .update(attempts)
      .set({ input: old })
      .where(eq(attempts.clientAttemptId, `talk-start:${sessionId}`));
    const legacy = await viewOf(h, sessionId);
    expect(legacy.teacher?.key).toBe("leo");
    expect(legacy.next.pending?.en).toBe(view.next.pending?.en);
    expect(h.fake.requests).toHaveLength(0);
  });

  it("AC-19b 선생님이 없는 프로필이 회화를 열면 처음 스냅숏 · 토리 행 1 을 넣지 않고 보일 선생님을 주며 고른 뒤 다시 읽으면 스냅숏 · 토리 행 1 이 들어가 판이 바뀐다", async () => {
    profileId = await resetHousehold(db, 1, null);
    const sessionId = await startTalk(h, 1);
    const before = await viewOf(h, sessionId);
    expect(before.teacher).toBeNull();
    expect(before.teacherChoices.map((t) => t.key)).toEqual(["mina", "leo"]);
    expect(before.teacherChoices[0]).not.toHaveProperty("personaEn");
    expect(before.lastTori).toBeNull();
    expect(await startInput(sessionId)).toBeUndefined();
    expect(await turnsOf(db, sessionId)).toEqual([]);
    // 다시 열어도 미룬 그대로다
    expect((await viewOf(h, sessionId)).version).toBe(before.version);
    expect(await startInput(sessionId)).toBeUndefined();

    expect(await chooseTeacherFor({ key: "leo" }, { db })).toEqual({
      ok: true,
    });
    const after = await viewOf(h, sessionId);
    expect(after.teacher?.key).toBe("leo");
    expect(after.teacherChoices).toEqual([]);
    expect(after.version).not.toBe(before.version);
    expect(await startInput(sessionId)).toMatchObject({ teacherKey: "leo" });
    const rows = await turnsOf(db, sessionId);
    expect(rows.map((r) => `${r.speaker}${r.turnNo}`)).toEqual(["tori1"]);
    expect(h.fake.requests).toHaveLength(0);
  });

  it("AC-19b 영어 이름이 Mina 인 프로필의 고를 선생님은 리오만이다", async () => {
    profileId = await resetHousehold(db, 1, null);
    await db
      .update(profiles)
      .set({ englishName: "Mina" })
      .where(eq(profiles.id, profileId));
    const sessionId = await startTalk(h, 1);
    const view = await viewOf(h, sessionId);
    expect(view.teacher).toBeNull();
    expect(view.teacherChoices.map((t) => t.key)).toEqual(["leo"]);
  });
});

describe("그만하기 · 홈 · 끝맺음(3.3 '대화가 멈추는 경우' · 8절)", () => {
  it("AC-15f 목표 턴 전 '그만하기'를 확인하면 세션이 중단이 되고 끝맺음 턴이 응답 뒤에 불려 요약이 저장된다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await turn(sessionId);
    h.fake.push(closingRule({ summary: "사과 이야기를 했어요." }));
    const stopped = await stopTalk({ sessionId, confirmed: true }, h.deps());
    if (!stopped.ok) throw new Error(stopped.reason);
    expect(stopped.wrap.lines.length).toBeGreaterThan(0);
    expect(requestsOf(h, CLOSING_MARK)).toBe(0);
    expect((await sessionOf(db, sessionId)).status).toBe("aborted");
    await h.runTasks();
    expect(requestsOf(h, CLOSING_MARK)).toBe(1);
    const summaries = await db
      .select()
      .from(talkSummaries)
      .where(eq(talkSummaries.sessionId, sessionId));
    expect(summaries.map((s) => s.summary)).toEqual(["사과 이야기를 했어요."]);
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
    const status = await talkClosingStatus({ sessionId }, h.deps());
    expect(status).toMatchObject({
      state: "ready",
      farewell: { en: "Bye bye!", ko: "안녕!" },
    });
  });

  it("AC-8c 끝맺음 턴은 '그만하기' 응답 뒤에 talk_closing 최대 출력으로 불리고 '그만하기' 응답은 끝맺음을 기다리지 않는다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await turn(sessionId);
    h.fake.push(closingRule());
    const stopped = await stopTalk({ sessionId, confirmed: true }, h.deps());
    expect(stopped.ok).toBe(true);
    expect(h.tasks).toHaveLength(1);
    expect(requestsOf(h, CLOSING_MARK)).toBe(0);
    await h.runTasks();
    const closing = h.fake.requests.find((r) =>
      r.bodyText.includes(CLOSING_MARK),
    );
    expect(
      (closing?.body as { max_tokens?: number } | undefined)?.max_tokens,
    ).toBe(CLOSING_MAX_TOKENS);
    expect(await callsOf("talk_closing")).toHaveLength(1);
  });

  it("AC-15f 목표 턴 전에 떠난 대화는 진행으로 남고 다시 열면 토리의 마지막 질문부터 AI 호출 없이 이어진다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    const { last } = await turn(sessionId);
    if (last?.t !== "end") throw new Error("끝 줄");
    const asked = last.next.pending?.en;
    expect(await leaveTalk({ sessionId }, h.deps())).toEqual({
      ok: true,
      closed: false,
    });
    expect((await sessionOf(db, sessionId)).status).toBe("in_progress");
    const before = h.fake.requests.length;
    const view = await viewOf(h, sessionId);
    expect(view.next.pending?.en).toBe(asked);
    expect(view.lastTori?.sentences).toEqual(["Good!"]);
    // 1~3단계 토리 반응 뜻도 다시 낸다(C103 — 가짜 응답 tori_ko)
    expect(view.lastTori?.ko).toBe("좋아!");
    expect(
      view.lastTori?.add.some(
        (l) => l.t === "add" && "en" in l && l.en === asked,
      ),
    ).toBe(true);
    expect(h.fake.requests).toHaveLength(before);
    expect(h.tasks).toHaveLength(0);
    // 열린 대화의 마무리 자료는 없다(정리 토막 뒤에만)
    expect(await readTalkWrap({ sessionId }, h.deps())).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("AC-15f 목표 턴 뒤에 떠난 대화는 talk.idle_close_minutes 뒤 첫 홈 진입 때 끝맺음 턴이 한 번 불리고 그 전 다른 기기의 홈 진입은 대화를 닫지 않는다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await playToTarget(h, sessionId);
    h.fake.push(closingRule());
    const early = new Date(NOW.getTime() + (IDLE_MINUTES - 1) * MS_PER_MINUTE);
    expect(await closeIdleTalks({ profileId, at: early }, h.deps())).toBe(0);
    expect((await sessionOf(db, sessionId)).talkSegment).toBe("talk");
    const late = new Date(NOW.getTime() + (IDLE_MINUTES + 1) * MS_PER_MINUTE);
    h.clock.now = late;
    expect(await closeIdleTalks({ profileId, at: late }, h.deps())).toBe(1);
    expect((await sessionOf(db, sessionId)).talkSegment).toBe("wrap_up");
    expect(requestsOf(h, CLOSING_MARK)).toBe(1);
    expect(await closeIdleTalks({ profileId, at: late }, h.deps())).toBe(0);
    expect(requestsOf(h, CLOSING_MARK)).toBe(1);
    expect(
      closingStateOf((await closingRecord(sessionId))?.aiFeedback)?.state,
    ).toBe("ready");
  });

  it("AC-15f 토리의 말이 없는 마지막 턴이 있으면 같은 시도 id 로 다시 받는다", async () => {
    profileId = await resetHousehold(db, 4);
    const sessionId = await startTalk(h, 4);
    await viewOf(h, sessionId);
    // 4단계: 첫 문장 전 연결 실패 두 번 → 'Oops' 쉼, 토리 행 없음
    h.fake.push({
      when: { bodyIncludes: TURN_MARK },
      reply: { kind: "network-error" },
      times: 2,
    });
    const broke = await say(h, sessionId, {
      text: "I'm fine.",
      clientAttemptId: "orphan-1",
    });
    expect(broke.last).toMatchObject({ t: "break" });
    const view = await viewOf(h, sessionId);
    expect(view.retryTurn?.clientAttemptId).toBe("orphan-1");
    // 다른 시도 id 는 받지 않는다
    expect(
      (await say(h, sessionId, { clientAttemptId: "other" })).last,
    ).toEqual({
      t: "stale",
    });
    // 마지막 호출이 막 끝난 때(저장 여유 TURN_SAVE_GRACE_MS 안)의 같은 시도 id 는 아직 진행 중으로 보고 AI 를 부르지 않는다(재검토 N-2)
    const calls = h.fake.requests.length;
    expect(
      (await say(h, sessionId, { clientAttemptId: "orphan-1" })).last,
    ).toEqual({ t: "stale" });
    expect(h.fake.requests).toHaveLength(calls);
    // 'Oops' 뒤 다시 보냄은 마지막 호출이 끝난 뒤 저장 여유가 지난 때다(진행 중이 아님)
    h.clock.now = new Date(NOW.getTime() + 2 * MS_PER_MINUTE);
    h.fake.push(
      turnRule({ tori_en: "Great to hear!" }, { model: "claude-sonnet-5-5" }),
    );
    const again = await say(h, sessionId, {
      text: "ignored text",
      clientAttemptId: "orphan-1",
    });
    expect(again.last?.t).toBe("end");
    const rows = await turnsOf(db, sessionId);
    expect(rows.filter((r) => r.clientAttemptId === "orphan-1")).toHaveLength(
      1,
    );
    expect(rows.filter((r) => r.speaker === "tori")).toHaveLength(2);
    // 4단계부터는 토리 반응 뜻을 저장하지 않는다(C103)
    expect(rows.at(-1)?.toriKo).toBeNull();
    expect((await viewOf(h, sessionId)).lastTori?.ko).toBeUndefined();
    // 같은 시도 id 를 한 번 더 보내면 저장한 토리 말을 다시 흘린다(AI 없음)
    const before = h.fake.requests.length;
    const replayed = await say(h, sessionId, { clientAttemptId: "orphan-1" });
    expect(replayed.lines[0]).toEqual({ t: "s", en: "Great to hear!" });
    expect(replayed.last?.t).toBe("end");
    expect(h.fake.requests).toHaveLength(before);
  });

  it("AC-15f 토리의 말이 없는 마지막 턴의 같은 시도 id 는 마지막 호출이 실패면 그 요청의 기다림 상한과 저장 여유가 지날 때까지 다시 부르지 않고 그 뒤 TURN_IN_FLIGHT_MS 안이면 다시 부른다", async () => {
    profileId = await resetHousehold(db, 4);
    const sessionId = await startTalk(h, 4);
    await viewOf(h, sessionId);
    // 4단계: 첫 문장 전 연결 실패 두 번 → 'Oops' 쉼, 토리 행 없음(마지막 호출이 실패)
    h.fake.push({
      when: { bodyIncludes: TURN_MARK },
      reply: { kind: "network-error" },
      times: 2,
    });
    const broke = await say(h, sessionId, {
      text: "I'm fine.",
      clientAttemptId: "orphan-2",
    });
    expect(broke.last).toMatchObject({ t: "break" });
    const calls = h.fake.requests.length;
    // 저장 여유는 지났지만 그 요청의 기다림 상한(첫 호출 + 두 배 타임아웃) 안 — 한 요청 안 다시 시도가 아직 돌 수 있다(재검토 P-1)
    h.clock.now = new Date(NOW.getTime() + TURN_SAVE_GRACE_MS + MS_PER_SECOND);
    expect(
      (await say(h, sessionId, { clientAttemptId: "orphan-2" })).last,
    ).toEqual({ t: "stale" });
    expect(h.fake.requests).toHaveLength(calls);
    // 기다림 상한 + 저장 여유가 지났고 TURN_IN_FLIGHT_MS 안이면 진행 중이 아니다 — 다시 부른다(재검토 P-2)
    const waitEnd =
      AI_WAIT_TIMEOUT_MULTIPLE * REALTIME_TIMEOUT_SECONDS * MS_PER_SECOND +
      TURN_SAVE_GRACE_MS;
    expect(waitEnd + MS_PER_SECOND).toBeLessThan(TURN_IN_FLIGHT_MS);
    h.clock.now = new Date(NOW.getTime() + waitEnd + MS_PER_SECOND);
    h.fake.push(
      turnRule({ tori_en: "Great to hear!" }, { model: "claude-sonnet-5-5" }),
    );
    const again = await say(h, sessionId, {
      text: "ignored text",
      clientAttemptId: "orphan-2",
    });
    expect(again.last?.t).toBe("end");
    expect(h.fake.requests).toHaveLength(calls + 1);
  });

  it("회화 세션: 끝맺음을 두 요청이 함께 부르면 호출은 하나다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await turn(sessionId);
    const stopped = await stopTalk({ sessionId, confirmed: true }, h.deps());
    expect(stopped.ok).toBe(true);
    h.tasks.length = 0;
    h.fake.push(closingRule({}, { delayMs: 50, chunks: 6 }));
    const results = await Promise.all([
      runTalkClosing(sessionId, h.deps()),
      runTalkClosing(sessionId, h.deps()),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(requestsOf(h, CLOSING_MARK)).toBe(1);
  });

  it("AC-16c 대화가 끝나면 보낸 메시지 전문과 다시 쓸 토리 차례가 지워지고 단어 수 · 말한 단원 단어 · 입력 방식 · 힌트 종류는 남는다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    const card = cardOf(await talkLessonRow(db, 1));
    const first = card.turns?.[0];
    if (!first) throw new Error("견본 꼴");
    h.fake.push(
      turnRule({ tori_en: "Yes!", self_used_words: [...first.targets] }),
    );
    await say(h, sessionId, { text: first.answerExample });
    const before = await turnsOf(db, sessionId);
    expect(before.some((r) => r.sentUserMessage !== null)).toBe(true);
    expect(before.some((r) => r.toriRewrite !== null)).toBe(true);
    h.fake.push(closingRule());
    await stopTalk({ sessionId, confirmed: true }, h.deps());
    await h.runTasks();
    const after = await turnsOf(db, sessionId);
    for (const r of after) {
      expect(r.sentUserMessage).toBeNull();
      expect(r.toriRewrite).toBeNull();
    }
    const child = after.filter((r) => r.speaker === "child").at(-1);
    expect(child?.wordCount).toBeGreaterThan(0);
    expect(child?.saidWords).toEqual([first.targets[0]]);
    expect(child?.inputMode).toBe("speech");
    expect(child?.hintKind).toBe("none");
  });

  it("AC-2c 지난 단원의 회화 수업을 다시 하기로 열면 처음 했을 때와 같은 주제 변형으로 열리고 회화 턴 호출이 새 수업과 같이 일어나며 친한 정도는 오르지 않는다", async () => {
    const first = await startTalk(h, 1);
    await intoTalk(h, first);
    await playToTarget(h, first);
    h.fake.push(closingRule());
    await stopTalk({ sessionId: first, confirmed: false }, h.deps());
    await h.runTasks();
    const track = async () =>
      (
        await db
          .select({ friendship: profileTracks.friendship })
          .from(profileTracks)
          .where(
            and(
              eq(profileTracks.profileId, profileId),
              eq(profileTracks.area, "talk"),
            ),
          )
      )[0]?.friendship;
    expect(await track()).toBe(FRIENDSHIP_PER);
    const firstRow = await sessionOf(db, first);
    const retry = await startTalk(h, 1);
    const retryRow = await sessionOf(db, retry);
    expect(retryRow.kind).toBe("retry");
    expect(retryRow.lessonId).toBe(firstRow.lessonId);
    const calls = requestsOf(h, TURN_MARK);
    await intoTalk(h, retry);
    await playToTarget(h, retry);
    expect(requestsOf(h, TURN_MARK)).toBeGreaterThan(calls);
    expect((await sessionOf(db, retry)).status).toBe("completed");
    expect(await track()).toBe(FRIENDSHIP_PER);
  });
});

describe("이름 가림 · 지난 대화 요약(AC-16b)", () => {
  it("AC-16b 끝맺음 턴 요약은 한국어로 {NAME} 바꾸기와 가림을 거쳐 talk.summary_max_chars 자 이하로 저장되고 다음 대화의 회화 턴 요청에 최근 talk.memory_summaries 개가 들어간다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await turn(sessionId);
    const long = `${ENGLISH_NAME}는 사과를 좋아했어요. ${"가".repeat(SUMMARY_MAX)}`;
    h.fake.push(closingRule({ summary: long }));
    await stopTalk({ sessionId, confirmed: true }, h.deps());
    await h.runTasks();
    const [saved] = await db
      .select()
      .from(talkSummaries)
      .where(eq(talkSummaries.sessionId, sessionId));
    expect(saved?.summary).toContain("{NAME}");
    expect(saved?.summary).not.toContain(ENGLISH_NAME);
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
    const next = await startTalk(h, 1, 2);
    await intoTalk(h, next);
    const request = h.fake.requests
      .filter((r) => r.bodyText.includes(TURN_MARK))
      .at(-1);
    const system = JSON.stringify(
      (request?.body as { system?: unknown } | undefined)?.system,
    );
    expect(system).toContain("{NAME}");
    expect(system).toContain(older[2]);
    expect(system).toContain(older[1]);
    expect(system).not.toContain(older[0]);
    expect(MEMORY).toBe(3);
  });

  it("AC-16b 저장된 회화 아이 원문에는 프로필 이름과 전화번호 형태가 없다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    const phone = "010-1234-5678";
    await turn(sessionId, {
      text: `I am ${ENGLISH_NAME} ${DISPLAY_NAME} and my phone is ${phone}`,
    });
    const child = (await turnsOf(db, sessionId))
      .filter((r) => r.speaker === "child")
      .at(-1);
    expect(child?.text).not.toContain(ENGLISH_NAME);
    expect(child?.text).not.toContain(DISPLAY_NAME);
    expect(child?.text).not.toContain(phone);
    expect(child?.sentUserMessage).not.toContain(ENGLISH_NAME);
    expect(child?.sentUserMessage).not.toContain(phone);
  });
});

describe("1-가 하루 안전 상한(회화, a 회4 · C80)", () => {
  it("1-가 안전 상한(회화): 상한 날에는 새 회화 수업이 시작되지 않고 목표 턴 전 도중이면 그 턴에서 쉬는 안내를 돌려주며 세션은 진행으로 남고 다음 학습일에 같은 시도 id 로 이어 받는다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await capAtCurrentCalls(db, profileId);
    const other = await talkLessonRow(db, 1, 2);
    expect(
      await startLessonSession(
        { lessonId: other.id, confirmAbort: true },
        { db, now: () => NOW },
      ),
    ).toEqual({ ok: false, reason: "ai_resting" });
    const rested = await say(h, sessionId, { clientAttemptId: "rest-1" });
    expect(rested.lines).toEqual([{ t: "resting" }]);
    expect((await sessionOf(db, sessionId)).status).toBe("in_progress");
    const view = await viewOf(h, sessionId);
    expect(view.resting).toBe(true);
    expect(view.retryTurn?.clientAttemptId).toBe("rest-1");
    h.clock.now = NEXT_DAY;
    h.fake.push(turnRule({ tori_en: "Welcome back!" }));
    const again = await say(h, sessionId, { clientAttemptId: "rest-1" });
    expect(again.last?.t).toBe("end");
    const rows = await turnsOf(db, sessionId);
    expect(rows.filter((r) => r.clientAttemptId === "rest-1")).toHaveLength(1);
    expect(rows.at(-1)?.speaker).toBe("tori");
  });

  it("1-가 안전 상한(회화): 목표 턴 뒤 '더 이야기하기' 중에 닿으면 다음 턴에 카드 정리 대사와 끝인사로 닫고 끝맺음 턴은 상한이 풀린 학습일의 첫 홈 진입에서 응답 뒤에 한 번 불린다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await playToTarget(h, sessionId);
    const more = await chooseMoreTalk({ sessionId }, h.deps());
    expect(more.ok).toBe(true);
    await capAtCurrentCalls(db, profileId);
    const card = cardOf(await talkLessonRow(db, 1));
    const closed = await say(h, sessionId);
    expect(closed.last).toMatchObject({
      t: "close",
      reason: "resting",
      farewell: { en: card.farewell.en },
    });
    const last = closed.last;
    if (last?.t !== "close") throw new Error("닫힘 줄");
    expect(last.lines?.length).toBeGreaterThan(0);
    expect((await sessionOf(db, sessionId)).talkSegment).toBe("wrap_up");
    expect(h.tasks).toHaveLength(0);
    // 닫힌 뒤 화면이 정리 · 마무리 자료를 다시 읽는다(8절 '목표 턴 뒤의 회화' — 정리 뒤 마무리 첫 장 · 셋째 장, AI 없음)
    const calls = h.fake.requests.length;
    const wrap = await readTalkWrap({ sessionId }, h.deps());
    if (!wrap.ok) throw new Error("마무리 자료");
    // 화면이 쓰는 칸(en · ko)만 견준다 — 마무리 자료의 되짚을 말에는 고른 곳(source) 칸이 더 있다(검토 b3 I-3)
    expect(
      wrap.wrap.lines.map(({ en, ko }) => ({
        en,
        ...(ko === undefined ? {} : { ko }),
      })),
    ).toEqual(last.lines);
    expect(wrap.wrap.farewell.en).toBe(card.farewell.en);
    expect(wrap.wrap.aborted).toBe(false);
    expect(wrap.wrap.friendship).not.toBeNull();
    expect(h.fake.requests).toHaveLength(calls);
    h.fake.push(closingRule());
    expect(await closeIdleTalks({ profileId, at: NOW }, h.deps())).toBe(0);
    expect(requestsOf(h, CLOSING_MARK)).toBe(0);
    h.clock.now = NEXT_DAY;
    expect(await closeIdleTalks({ profileId, at: NEXT_DAY }, h.deps())).toBe(1);
    expect(requestsOf(h, CLOSING_MARK)).toBe(1);
    expect(await closeIdleTalks({ profileId, at: NEXT_DAY }, h.deps())).toBe(0);
  });

  it("1-가 안전 상한(회화): 쉬는 날 목표 턴 전 '그만하기'는 끝맺음 턴 없이 중단된다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await turn(sessionId);
    await capAtCurrentCalls(db, profileId);
    const stopped = await stopTalk({ sessionId, confirmed: true }, h.deps());
    expect(stopped.ok).toBe(true);
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
});

describe("공유 상태 · 정리 따라 말하기 · 같은 시도 id 겹침(fix 1)", () => {
  it("회화 세션: 회화 끝맺음 대기 둘이 있어도 홈 진입 밀린 첨삭은 쓰기 초고만 부르고 끝맺음 claimedAt 은 그대로다", async () => {
    // 끝맺음 대기 둘(응답 뒤 일은 돌리지 않음 — 미룬 끝맺음과 같은 꼴)
    const closings: string[] = [];
    for (const lessonNo of [1, 2]) {
      const sessionId = await startTalk(h, 1, lessonNo);
      await intoTalk(h, sessionId);
      const stopped = await stopTalk({ sessionId, confirmed: true }, h.deps());
      expect(stopped.ok).toBe(true);
      closings.push(sessionId);
    }
    h.tasks.length = 0;
    const before = await Promise.all(closings.map((id) => closingRecord(id)));
    // 쓰기 첫 세션의 대기 초고 하나(끝맺음보다 늦게 — 오래된 둘을 고르면 끝맺음만 걸리는 자리)
    const [writingLesson] = await db
      .select({ id: lessons.id, level: lessons.level, unit: lessons.unit })
      .from(lessons)
      .where(eq(lessons.area, "writing"))
      .limit(1);
    if (!writingLesson) throw new Error("쓰기 수업 행 없음");
    const later = new Date(NOW.getTime() + MS_PER_MINUTE);
    const [writing] = await db
      .insert(sessions)
      .values({
        profileId,
        area: "writing",
        level: writingLesson.level,
        unit: writingLesson.unit,
        lessonId: writingLesson.id,
        kind: "regular",
        status: "completed",
        writingPart: "draft",
        startedAt: later,
        completedAt: later,
        learningDay: TODAY,
      })
      .returning({ id: sessions.id });
    if (!writing) throw new Error("쓰기 세션을 넣지 못했다");
    const [draft] = await db
      .insert(attempts)
      .values({
        sessionId: writing.id,
        clientAttemptId: "draft-pending-1",
        activityNo: 1,
        input: { v: 1, kind: "draft", step: "final", text: "I like it." },
        attemptedAt: later,
        aiFeedback: { state: "pending", failures: 0, refusals: 0 },
        status: "awaiting_feedback",
      })
      .returning({ id: attempts.id });
    if (!draft) throw new Error("초고 시도를 넣지 못했다");
    h.clock.now = new Date(later.getTime() + MS_PER_MINUTE);
    await retryPendingFeedback({ profileId }, { db, now: () => h.clock.now });
    expect(requestsOf(h, CLOSING_MARK)).toBe(0);
    for (const [i, id] of closings.entries()) {
      const after = await closingRecord(id);
      expect(after?.aiFeedback).toEqual(before[i]?.aiFeedback);
      expect(after?.status).toBe("awaiting_feedback");
    }
    const [draftAfter] = await db
      .select({ aiFeedback: attempts.aiFeedback })
      .from(attempts)
      .where(eq(attempts.id, draft.id));
    // 쓰기 초고는 불렸다(견본이 첨삭 꼴이 아니라 실패 하나로 센다)
    expect(feedbackStateOf(draftAfter?.aiFeedback)).toMatchObject({
      state: "pending",
      failures: 1,
    });
    // 끝맺음은 홈 진입 정리가 잡는다
    for (const _ of closings) h.fake.push(closingRule());
    expect(await closeIdleTalks({ profileId, at: h.clock.now }, h.deps())).toBe(
      2,
    );
  });

  it("회화 세션: 목표 턴 전 그만하기 뒤 정리 따라 말하기는 attempts 에 남고 영어로 말한 문장 수가 는다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await turn(sessionId);
    const stopped = await stopTalk({ sessionId, confirmed: true }, h.deps());
    if (!stopped.ok) throw new Error(stopped.reason);
    expect((await sessionOf(db, sessionId)).status).toBe("aborted");
    const line = stopped.wrap.lines[0];
    if (!line) throw new Error("되짚을 말 없음");
    const before = (await sessionOf(db, sessionId)).englishSentences;
    expect(
      await saveFollowAlong(
        {
          sessionId,
          clientAttemptId: "wrap-1",
          segment: "wrap_up",
          index: 0,
          target: line.en,
          heard: [line.en],
          failures: 0,
        },
        h.deps(),
      ),
    ).toEqual({ ok: true, saved: true });
    const [saved] = await db
      .select()
      .from(attempts)
      .where(eq(attempts.clientAttemptId, "wrap-1"));
    expect(saved?.input).toMatchObject({ kind: "talk-wrapup", index: 0 });
    expect((await sessionOf(db, sessionId)).englishSentences).toBe(before + 1);
  });

  it("회화 세션: 같은 시도 id 를 겹쳐 보내면 둘째 요청은 AI 를 부르지 않고 다시 읽으라는 답을 받는다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    // 앞 턴의 호출 기록보다 늦은 시각(시계가 고정이라 한 칸 옮긴다)
    h.clock.now = new Date(NOW.getTime() + MS_PER_MINUTE);
    const before = requestsOf(h, TURN_MARK);
    h.fake.push(turnRule({ tori_en: "Nice one!" }, { delayMs: 50, chunks: 6 }));
    h.fake.push(turnRule({ tori_en: "Second call!" }));
    const [a, b] = await Promise.all([
      say(h, sessionId, { clientAttemptId: "same-1" }),
      say(h, sessionId, { clientAttemptId: "same-1" }),
    ]);
    expect([a.last?.t, b.last?.t].sort()).toEqual(["end", "stale"]);
    expect(requestsOf(h, TURN_MARK)).toBe(before + 1);
    const rows = await turnsOf(db, sessionId);
    expect(rows.filter((r) => r.clientAttemptId === "same-1")).toHaveLength(1);
    // 저장된 토리 말은 첫 요청의 것(원문 첫 줄 = AI 글)
    expect(rows.at(-1)?.text?.split("\n")[0]).toBe("Nice one!");
  });
});

/** 한 턴에 읽힐 문장(토리 말 · 붙인 말 — 답 두 개는 읽는 한 줄 'A. Or B.' 그대로). */
function spokenSentencesOf(lines: readonly TalkLine[]): string[] {
  return lines
    .flatMap((l) => {
      if (l.t === "s") return [l.en];
      if (l.t !== "add") return [];
      if (l.kind === "two_answers") return [twoAnswersLine(l.answers)];
      if (l.kind === "again") return [l.say, ...(l.en ? [l.en] : [])];
      return [l.en];
    })
    .flatMap(splitSentences);
}

describe("한 턴에 같은 말 두 번 안 읽기(C125 (3))", () => {
  it("회화 세션: 1단계 처음 묻는 턴의 '모름'은 답 두 개를 남기고 겹치는 답 예시 · 토리 문장을 빼 4문장 이하다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    const card = cardOf(await talkLessonRow(db, 1));
    const first = card.turns?.[0];
    if (!first?.twoAnswers) throw new Error("견본 꼴 — 1단계 처음 묻는 턴");
    const view = await viewOf(h, sessionId);
    expect(view.next.pending?.en).toBe(first.question.en);
    const told = `You can say, ${first.answerExample}`;

    const check = (lines: readonly TalkLine[]) => {
      const sentences = spokenSentencesOf(lines);
      expect(sentences.length).toBeLessThanOrEqual(4);
      const norm = sentences.map(normalizeSpoken);
      expect(new Set(norm).size).toBe(norm.length);
      // 답 두 개 줄(①②)은 남고 같은 질문을 다시 묻는다. 답 예시 줄(again)은 답 두 개와 겹쳐 빠진다
      expect(
        lines.filter((l) => l.t === "add" && l.kind === "two_answers"),
      ).toEqual([{ t: "add", kind: "two_answers", answers: first.twoAnswers }]);
      expect(lines.some((l) => l.t === "add" && l.kind === "again")).toBe(
        false,
      );
      expect(
        lines.some(
          (l) =>
            l.t === "add" &&
            l.kind === "question" &&
            l.en === first.question.en,
        ),
      ).toBe(true);
      return sentences.length;
    };

    // 토리 말(AI)이 답 예시를 이미 말한 '모름' — 그 토리 문장은 읽고 보이는 글에서 빠진다
    h.fake.push(turnRule({ tori_en: `That's okay! ${told}` }));
    const withExample = await say(h, sessionId, { mode: "dont_know" });
    const withCount = check(withExample.lines);
    expect(withExample.lines.some((l) => l.t === "s" && l.en === told)).toBe(
      false,
    );
    // 저장하는 토리 말(다시 쓸 토리 차례 포함)은 그대로
    const saved = (await turnsOf(db, sessionId)).at(-1);
    expect(saved?.text).toContain(told);
    expect(saved?.text).toContain(twoAnswersLine(first.twoAnswers));
    // 이어 하기로 다시 그려도 같은 말은 빠진다
    const again = await viewOf(h, sessionId);
    expect(again.lastTori?.sentences).not.toContain(told);

    // 토리 말에 답 예시가 없는 '모름'
    h.fake.push(turnRule({ tori_en: "That's okay!" }));
    const plain = await say(h, sessionId, { mode: "dont_know" });
    const plainCount = check(plain.lines);
    console.info(
      `회화 '모름' 턴 문장 수: 토리 말에 답 예시 있음 ${withCount} · 없음 ${plainCount}`,
    );
  });
});

describe("턴 길 준비 시간(C125 (4))", () => {
  it("회화 세션: 턴 길은 AI 를 부르기 전 구간마다 준비 시간을 남긴다", async () => {
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    const seen: StageTimings[] = [];
    h.fake.push(turnRule({ tori_en: "Good!" }));
    await say(h, sessionId, { onPrepTimings: (t) => seen.push(t) });
    expect(seen).toHaveLength(1);
    const [t] = seen;
    expect(t?.stages.map((s) => s.stage)).toEqual([
      "profile",
      "masker_settings",
      "state",
      "checks_context",
      "input",
      "ai_prep",
    ]);
    for (const stage of t?.stages ?? [])
      expect(stage.ms).toBeGreaterThanOrEqual(0);
    // 합은 구간 합과 반올림 한 칸씩만 다르다
    const sum = (t?.stages ?? []).reduce((total, s) => total + s.ms, 0);
    expect(Math.abs((t?.totalMs ?? 0) - sum)).toBeLessThanOrEqual(
      t?.stages.length ?? 0,
    );
    // 재기 값(시험 DB — 보고에 남김)
    if (t) console.info(`회화 턴 준비 시간 ${stageTimingsLine(t)}`);
  });
});

describe("로그", () => {
  it("회화 세션: 로그에 아이 말 글이 없다", async () => {
    const secret = "Zebra marmalade sunrise";
    const logged: string[] = [];
    for (const method of ["error", "warn", "log", "info"] as const)
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(" "));
      });
    const sessionId = await startTalk(h, 1);
    await intoTalk(h, sessionId);
    await turn(sessionId, { text: secret });
    // 실패 길(첫 문장 전 연결 실패 두 번)도 아이 글을 남기지 않는다
    h.fake.push({
      when: { bodyIncludes: TURN_MARK },
      reply: { kind: "network-error" },
      times: 2,
    });
    await say(h, sessionId, { text: secret });
    h.fake.push(closingRule());
    await stopTalk({ sessionId, confirmed: true }, h.deps());
    await h.runTasks();
    expect(logged.join("\n")).not.toContain(secret);
    expect(logged.join("\n")).not.toContain("marmalade");
  });
});

// 회화 Claude 주도 묶음 S2 토막 접점 통합 시험(spec '회화 Claude 주도' 설계 3 · AC-3 → 15절 AC-26c, 세션 고정 → AC-26a). 시험용 시드의 회화
// 1단계 단원 1 수업 1 로 세션을 넣고, 처음 열 때의 설정 talk.lead_mode 로 방식을 정한다. 새 엔진의 턴 길(lead-turn.ts)은 묶음 S1 몫이라 새 엔진의
// 선생님 행(move.lead)은 시험이 talk_turns 에 바로 넣는다. 공용 픽스처(talk-fixture.ts)는 S1 만 고치므로 세션 도우미는 이 파일 안에 둔다(plan
// 위험 6). 증명: 기존 방식의 '더 이야기하기'는 지금 행 그대로 · 새 엔진은 카드 거리 행 없이 신호 · 참여 완료 기록이 두 방식에서 같음 · 정리
// 되짚을 말 출처 · 이어하기와 같은 시도 다시 흘림(AI 없음) · 진행 중 수업은 설정이 바뀌어도 처음 값.
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TALK_LEAD_TEXT_L3U1 } from "@/core/ai/calls/talk-lead";
import { parseTalkAttemptInput } from "@/core/conversation/attempt";
import {
  readTalkMove,
  type TalkLead,
  type TalkMoveInput,
  talkMoveOf,
} from "@/core/conversation/move";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { LEVEL_MAX } from "@/core/seed/structure";
import { lessons } from "@/db/schema/content";
import {
  attempts,
  profileTracks,
  sessions,
  talkTurns,
} from "@/db/schema/learning";
import { settings } from "@/db/schema/operations";
import {
  advanceTalkLesson,
  chooseLessonMoreTalk,
  loadTalkLessonView,
  stopTalkLesson,
} from "@/server/conversation";
import type { TalkLessonLine } from "@/server/conversation/lesson-turn";
import { runTalkTurnRequest } from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import { loadSeed } from "@/server/seed/load";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import {
  harnessOf,
  LOADED_AT,
  NOW,
  resetHousehold,
  setHouseholdSetting,
  type TalkHarness,
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
});

afterAll(async () => {
  await testDb?.drop();
});

beforeEach(async () => {
  h = harnessOf(db);
  await setHouseholdSetting(db, LEAD_MODE_KEY, "app");
});

// ── 세션 도우미(이 파일 몫) ─────────────────────────────────────────

/** 처음 열 때의 설정 값을 mode 로 두고 새 세션을 넣는다(스냅숏은 처음 열 때 적힌다). */
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
  // 안내문 글은 3단계 단원 1 에만 있다(13절 C241 보완 — 글이 없는 단원은 스냅숏에 claude 를 적지 않음). 시험용 1단계 시드로 새 방식을 열게
  // 처음 스냅숏을 적는 자리에 그 글을 넘긴다(S1 시험과 같은 자리)
  const view = await loadTalkLessonView(
    { sessionId: session.id },
    { ...h.deps(), leadText: () => TALK_LEAD_TEXT_L3U1 },
  );
  if (!view) throw new Error("화면 자료가 없다");
  return { profileId, sessionId: session.id };
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

type TeacherInput = {
  text: string;
  move: TalkMoveInput;
  toriKo?: string;
  recast?: string;
  explanation?: string;
};

/** 아이 행 하나와 그 뒤 선생님 행 하나(회화 턴 길 대신 — 새 엔진 턴은 묶음 S1 몫). 아이 행의 시도 id 를 돌려준다. */
async function exchange(
  sessionId: string,
  {
    segment,
    text,
    teacher,
  }: {
    segment: "greeting" | "talk" | "more_talk";
    text: string | null;
    teacher: TeacherInput;
  },
): Promise<string> {
  const turnNo = await maxTurn(sessionId);
  const clientAttemptId = `child-${sessionId}-${turnNo}`;
  await db.insert(talkTurns).values([
    {
      sessionId,
      turnNo,
      segment,
      speaker: "child",
      text,
      inputMode: text === null ? "dont_know" : "speech",
      clientAttemptId,
      recordedAt: NOW,
    },
    {
      sessionId,
      turnNo: turnNo + 1,
      segment,
      speaker: "tori",
      text: teacher.text,
      move: talkMoveOf(teacher.move),
      ...(teacher.toriKo === undefined ? {} : { toriKo: teacher.toriKo }),
      ...(teacher.recast === undefined ? {} : { recast: teacher.recast }),
      ...(teacher.explanation === undefined
        ? {}
        : { explanation: teacher.explanation }),
      recordedAt: NOW,
    },
  ]);
  return clientAttemptId;
}

/** 인사 → (짧은 준비)까지, 대화로 넘기기 바로 앞(인사 · 준비는 두 방식 모두 지금 길 그대로 — spec 설계 3). */
async function beforeTalk(mode: Mode) {
  const ids = await newSession(mode);
  for (let i = 0; i < card.greetingTurns; i++)
    await exchange(ids.sessionId, {
      segment: "greeting",
      text: "I'm good.",
      teacher: { text: "Great!", move: { kind: "ai" } },
    });
  const view = await loadTalkLessonView({ sessionId: ids.sessionId }, h.deps());
  if (view?.step.kind === "advance" && view.step.to === "prep")
    await advanceTalkLesson({ sessionId: ids.sessionId, to: "prep" }, h.deps());
  return ids;
}

const LEAD_OPENING = "Let's talk about your day. What do you like to do?";

/**
 * 대화 첫 질문까지. 기존 방식은 넘김이 카드 첫 질문 행을 붙이고, 새 엔진은 넘김이 신호(leadTurn start)만 내므로 그 첫 차례(묶음 S1 의
 * 입구가 쓰는 선생님 행)를 시험이 talk_turns 에 바로 넣는다. 그 행은 입구가 쓰는 실제 꼴처럼 대화 첫 질문(kind first_question)이라 위치
 * 되짚기의 대화 첫 질문 차례를 닫는다(검토 rev-s1 M-7).
 */
async function inTalk(mode: Mode) {
  const ids = await beforeTalk(mode);
  const moved = await advanceTalkLesson(
    { sessionId: ids.sessionId, to: "talk" },
    h.deps(),
  );
  if (!moved.ok) throw new Error("대화로 넘기지 못했다");
  if (mode === "claude") {
    if (moved.leadTurn !== "start") throw new Error("새 엔진 신호가 없다");
    await db.insert(talkTurns).values({
      sessionId: ids.sessionId,
      turnNo: (await maxTurn(ids.sessionId)) + 1,
      segment: "talk",
      speaker: "tori",
      text: LEAD_OPENING,
      move: talkMoveOf({ kind: "first_question", lead: leadOf() }),
      recordedAt: NOW,
    });
  }
  return ids;
}

/** 대화 한 차례 뒤 마무리 물음(선생님 행 closing_slot)까지 온 세션. */
async function atClosing(mode: Mode) {
  const ids = await inTalk(mode);
  await exchange(ids.sessionId, {
    segment: "talk",
    text: "I like apples.",
    teacher: {
      text: "Me too! Do you want to talk more?",
      move: { kind: "closing_slot" },
    },
  });
  return ids;
}

const leadOf = (over: Partial<TalkLead> = {}): TalkLead => ({
  reading: "clear_answer",
  move: "react_and_follow_up",
  asked: [],
  said: [],
  ...over,
});

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

/** 참여 완료가 남기는 기록(closing.ts completeTalk: 세션 상태 · 완료 시각 · 학습일 · 토막, 회화 트랙의 친한 정도 · 이야기 연 수). */
async function completionRecordOf(sessionId: string, profileId: string) {
  const [session] = await db
    .select({
      status: sessions.status,
      completedAt: sessions.completedAt,
      learningDay: sessions.learningDay,
      talkSegment: sessions.talkSegment,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  const [track] = await db
    .select({
      friendship: profileTracks.friendship,
      opened: profileTracks.toriStoriesOpened,
      byBand: profileTracks.toriStoriesByBand,
    })
    .from(profileTracks)
    .where(
      and(
        eq(profileTracks.profileId, profileId),
        eq(profileTracks.area, "talk"),
      ),
    );
  const kinds = (
    await db
      .select({ input: attempts.input })
      .from(attempts)
      .where(eq(attempts.sessionId, sessionId))
  )
    .map((r) => parseTalkAttemptInput(r.input)?.kind ?? "other")
    .sort();
  return { session, track, kinds };
}

let seq = 0;
async function say(
  sessionId: string,
  input: { mode: "speech" | "dont_know"; text?: string },
  clientAttemptId = `lead-seg-${++seq}`,
): Promise<TalkLessonLine[]> {
  const lines: TalkLessonLine[] = [];
  await runTalkTurnRequest(
    { sessionId, clientAttemptId, input, hint: { opened: 0, heard: [] } },
    {
      ...h.deps(),
      write: (line) => lines.push(line as TalkLessonLine),
      requestReceivedAt: h.clock.now,
    },
  );
  return lines;
}

// ── 시험 ───────────────────────────────────────────────────────────

describe("회화 Claude 주도 묶음 S2 토막 접점", () => {
  it("AC-26c 기존 방식 세션이 대화로 넘어가면 지금처럼 카드 첫 질문 행 하나를 붙이고 새 엔진 신호가 없다", async () => {
    const { sessionId } = await beforeTalk("app");
    const before = await rowsOf(sessionId);
    const moved = await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
    if (!moved.ok) throw new Error("대화로 넘기지 못했다");
    expect("leadTurn" in moved).toBe(false);
    expect(moved.segment).toBe("talk");
    const after = await rowsOf(sessionId);
    expect(after).toHaveLength(before.length + 1);
    const added = after.at(-1);
    expect(added?.speaker).toBe("tori");
    expect(added?.segment).toBe("talk");
    const move = readTalkMove(added?.move);
    expect(move?.kind).toBe("first_question");
    expect(move?.lead).toBeUndefined();
    expect(moved.step).toEqual({ kind: "child" });
    expect(h.fake.requests).toHaveLength(0);
  });

  it("AC-26c 새 엔진 세션이 대화로 넘어가면 카드 첫 질문 행을 붙이지 않고 토막만 대화로 바꾼 뒤 첫 차례 신호(leadTurn start)를 돌려주며, 첫 차례 전에는 같은 신호를 다시 낸다", async () => {
    const { sessionId } = await beforeTalk("claude");
    expect(await startModeOf(sessionId)).toBe("claude");
    const before = await rowsOf(sessionId);
    const moved = await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
    if (!moved.ok) throw new Error("대화로 넘기지 못했다");
    expect(moved.leadTurn).toBe("start");
    expect(moved.segment).toBe("talk");
    // 대화 첫 질문 차례가 그대로 남는다(첫 질문은 새 엔진의 차례가 씀 — 아이 말 없이 부르는 입구는 묶음 S1)
    expect(moved.step).toEqual({ kind: "advance", to: "talk" });
    expect(await rowsOf(sessionId)).toEqual(before);
    expect(
      (
        await db
          .select({ talkSegment: sessions.talkSegment })
          .from(sessions)
          .where(eq(sessions.id, sessionId))
      )[0]?.talkSegment,
    ).toBe("talk");
    const again = await advanceTalkLesson({ sessionId, to: "talk" }, h.deps());
    expect(again.ok && again.leadTurn).toBe("start");
    expect(await rowsOf(sessionId)).toEqual(before);
    expect(h.fake.requests).toHaveLength(0);
  });

  it("AC-26c 기존 방식 세션의 '더 이야기하기'는 지금처럼 카드 더 이야기할 거리 행 하나를 붙이고 새 엔진 신호가 없다", async () => {
    const { sessionId } = await atClosing("app");
    expect(await startModeOf(sessionId)).toBeUndefined();
    const before = await rowsOf(sessionId);
    const more = await chooseLessonMoreTalk({ sessionId }, h.deps());
    if (!more.ok) throw new Error("더 이야기하기를 받지 않았다");
    expect("leadTurn" in more).toBe(false);
    expect(more.segment).toBe("more_talk");
    expect(more.step).toEqual({ kind: "child" });
    const after = await rowsOf(sessionId);
    expect(after).toHaveLength(before.length + 1);
    const added = after.at(-1);
    expect(added?.speaker).toBe("tori");
    expect(added?.segment).toBe("more_talk");
    const move = readTalkMove(added?.move);
    expect(move?.kind).toBe("card_slot");
    expect(move?.item.kind).toBe("more");
    expect(move?.lead).toBeUndefined();
    const item = card.more.find((m) => m.no === move?.item.no);
    expect(added?.text).toContain(item?.en ?? "?");
    expect(more.current?.kind).toBe("card_slot");
    expect(h.fake.requests).toHaveLength(0);
  });

  it("AC-26c 새 엔진 세션의 '더 이야기하기'는 카드 거리 행을 붙이지 않고 토막만 바꾼 뒤 새 엔진 차례를 부를 신호(leadTurn more)를 돌려주며 AI 를 부르지 않는다", async () => {
    const { sessionId } = await atClosing("claude");
    expect(await startModeOf(sessionId)).toBe("claude");
    const before = await rowsOf(sessionId);
    const more = await chooseLessonMoreTalk({ sessionId }, h.deps());
    if (!more.ok) throw new Error("더 이야기하기를 받지 않았다");
    expect(more.leadTurn).toBe("more");
    expect(more.segment).toBe("more_talk");
    // 고를 차례가 그대로 남는다(묶음 S3 의 more 턴 요청이 기대는 중간 상태 — 검토 M-2)
    expect(more.step).toEqual({ kind: "choice", choice: "closing" });
    const after = await rowsOf(sessionId);
    expect(after).toEqual(before);
    // 지금 차례는 여전히 마무리 물음 행이다(다음 선생님 말은 새 엔진의 차례 — 묶음 S3 의 턴 요청 more)
    expect(more.current?.kind).toBe("closing_slot");
    expect(
      (
        await db
          .select({ talkSegment: sessions.talkSegment })
          .from(sessions)
          .where(eq(sessions.id, sessionId))
      )[0]?.talkSegment,
    ).toBe("more_talk");
    expect(h.fake.requests).toHaveLength(0);
  });

  it("AC-26c 새 엔진 세션의 마무리 제안 뒤 '더 이야기하기'는 행 없이 토막 그대로 · 참여 완료 아님 · 신호(leadTurn more)다(검토 M-2)", async () => {
    const { profileId, sessionId } = await inTalk("claude");
    await exchange(sessionId, {
      segment: "talk",
      text: "I like apples.",
      teacher: {
        text: "That was fun. Shall we stop here?",
        move: {
          kind: "ai",
          next: "closing",
          lead: leadOf({ move: "wrap_up" }),
        },
      },
    });
    const before = await rowsOf(sessionId);
    const more = await chooseLessonMoreTalk({ sessionId }, h.deps());
    if (!more.ok) throw new Error("더 이야기하기를 받지 않았다");
    expect(more.leadTurn).toBe("more");
    expect(more.segment).toBe("talk");
    expect(more.step).toEqual({ kind: "choice", choice: "suggestion" });
    expect(await rowsOf(sessionId)).toEqual(before);
    const record = await completionRecordOf(sessionId, profileId);
    expect(record.session?.status).toBe("in_progress");
    expect(record.session?.completedAt).toBeNull();
    expect(record.session?.talkSegment).toBe("talk");
    expect(h.fake.requests).toHaveLength(0);
  });

  it("AC-26c 참여 완료의 기록은 두 방식에서 같다(상태 · 완료 시각 · 학습일 · 토막 · 친한 정도 한 번 · 시도 행 갈래), 다시 골라도 한 번이다", async () => {
    const records: Record<Mode, unknown> = { app: null, claude: null };
    for (const mode of ["app", "claude"] as const) {
      const { profileId, sessionId } = await atClosing(mode);
      const first = await chooseLessonMoreTalk({ sessionId }, h.deps());
      expect(first.ok).toBe(true);
      const once = await completionRecordOf(sessionId, profileId);
      expect(once.session?.status).toBe("completed");
      expect(once.session?.learningDay).not.toBeNull();
      // 기존 방식은 더 이야기하기 뒤 한 차례를 더 한 다음 마무리 물음에, 새 엔진은 같은 고를 차례에 다시 고른다 — 어느 쪽도 다시 완료하지 않는다
      if (mode === "app")
        await exchange(sessionId, {
          segment: "more_talk",
          text: "I like bananas.",
          teacher: {
            text: "Cool!\nDo you want to talk more?",
            move: { kind: "closing_slot" },
          },
        });
      expect((await chooseLessonMoreTalk({ sessionId }, h.deps())).ok).toBe(
        true,
      );
      expect(await completionRecordOf(sessionId, profileId)).toEqual(once);
      records[mode] = once;
    }
    expect(records.claude).toEqual(records.app);
  });

  it("AC-26a 진행 중 수업의 방식은 처음 스냅숏 값이다: claude 로 연 수업은 설정을 app 으로 바꿔도 행을 붙이지 않고, app 으로 연 수업은 claude 로 바꿔도 카드 행을 붙인다", async () => {
    const lead = await atClosing("claude");
    await setHouseholdSetting(db, LEAD_MODE_KEY, "app");
    const leadBefore = await rowsOf(lead.sessionId);
    const leadMore = await chooseLessonMoreTalk(
      { sessionId: lead.sessionId },
      h.deps(),
    );
    expect(leadMore.ok && leadMore.leadTurn).toBe("more");
    expect(await rowsOf(lead.sessionId)).toEqual(leadBefore);

    const app = await atClosing("app");
    await setHouseholdSetting(db, LEAD_MODE_KEY, "claude");
    const appBefore = await rowsOf(app.sessionId);
    const appMore = await chooseLessonMoreTalk(
      { sessionId: app.sessionId },
      h.deps(),
    );
    expect(appMore.ok && "leadTurn" in appMore).toBe(false);
    const appAfter = await rowsOf(app.sessionId);
    expect(appAfter).toHaveLength(appBefore.length + 1);
    expect(readTalkMove(appAfter.at(-1)?.move)?.kind).toBe("card_slot");
    expect(await startModeOf(app.sessionId)).toBeUndefined();
  });

  it("AC-26c 정리 토막의 되짚을 말: 새 엔진은 recast 칸 대신 확인된 따라 할 문장과 카드 정리 대사에서 고르고, 기존 방식은 지금처럼 recast 에서 고른다", async () => {
    const today = card.todayWords[0];
    if (!today) throw new Error("시험 시드 카드에 오늘 쓸 말이 없다");
    const model = `I see ${today.word}.`;
    const recast = `Yes, ${today.word}!`;
    const wraps: Record<Mode, { en: string; source: string }[]> = {
      app: [],
      claude: [],
    };
    for (const mode of ["app", "claude"] as const) {
      const { sessionId } = await inTalk(mode);
      // 확인된 따라 할 문장(맞음)이 든 새 엔진 꼴 행과, recast 칸만 찬 지금 길 꼴 행을 같이 둔다
      await exchange(sessionId, {
        segment: "talk",
        text: "Hmm.",
        teacher: {
          text: "Say it with me.",
          move: {
            kind: "ai",
            sound: { model },
            lead: leadOf({
              move: "model_repeat",
              model: { sentence: model, inSay: true },
              removed: [model],
            }),
          },
        },
      });
      await exchange(sessionId, {
        segment: "talk",
        text: today.word,
        teacher: { text: "Nice!", move: { kind: "ai" }, recast },
      });
      const out = await stopTalkLesson(
        { sessionId, confirmed: false },
        h.deps(),
      );
      if (!out.ok) throw new Error("그만하기를 받지 않았다");
      wraps[mode] = out.wrap.lines.map((l) => ({ en: l.en, source: l.source }));
    }
    expect(wraps.claude).toContainEqual({ en: model, source: "recast" });
    expect(wraps.claude.map((l) => l.en)).not.toContain(recast);
    expect(wraps.app).toContainEqual({ en: recast, source: "recast" });
    expect(wraps.app.map((l) => l.en)).not.toContain(model);
    // 모자란 자리는 두 방식 모두 카드 정리 대사다
    const cardLines = card.closingLines.map((l) => l.en);
    for (const mode of ["app", "claude"] as const)
      for (const line of wraps[mode].filter((l) => l.source === "card"))
        expect(cardLines).toContain(line.en);
  });

  it("AC-26c 이어하기: 새 엔진의 선생님 행(say · say_ko · 막힌 뒤 뜻)을 저장한 그대로 다시 내보내고 AI 를 부르지 않는다", async () => {
    const { sessionId } = await inTalk("claude");
    const say1 = "Wow, apples! I like apples too. Do you eat apples at home?";
    const ko1 = "와, 사과! 나도 사과 좋아해. 집에서 사과 먹어?";
    const hintKo = "집에서 사과를 먹는지 묻고 있어요.";
    await exchange(sessionId, {
      segment: "talk",
      text: null,
      teacher: {
        text: say1,
        toriKo: ko1,
        explanation: hintKo,
        move: {
          kind: "ai",
          lead: leadOf({ reading: "does_not_know", asked: [] }),
        },
      },
    });
    const view = await loadTalkLessonView({ sessionId }, h.deps());
    expect(view?.current?.kind).toBe("ai");
    expect(view?.current?.lines).toEqual([{ en: say1, ko: ko1, app: false }]);
    expect(view?.current?.explanation).toBe(hintKo);
    expect(view?.current?.sound).toBeNull();
    const last = view?.log.at(-1);
    expect(last?.speaker === "teacher" && last.lines).toEqual([
      { en: say1, ko: ko1, app: false },
    ]);
    const again = await loadTalkLessonView({ sessionId }, h.deps());
    expect(again?.current).toEqual(view?.current);
    expect(h.fake.requests).toHaveLength(0);
  });

  it("AC-26c 같은 시도 다시 흘림: 같은 시도 id 로 다시 보내면 저장한 새 엔진 행의 문장 · 뜻을 그대로 다시 흘리고 AI 를 다시 부르지 않는다", async () => {
    const { sessionId } = await inTalk("claude");
    const say1 = "Wow, apples! Do you like red apples?";
    const ko1 = "와, 사과! 빨간 사과 좋아해?";
    const attemptId = await exchange(sessionId, {
      segment: "talk",
      text: "I like apples.",
      teacher: {
        text: say1,
        toriKo: ko1,
        move: { kind: "ai", lead: leadOf({ said: [] }) },
      },
    });
    const replay = await say(
      sessionId,
      { mode: "speech", text: "I like apples." },
      attemptId,
    );
    expect(h.fake.requests).toHaveLength(0);
    expect(replay.filter((l) => l.t === "s")).toEqual([
      { t: "s", en: "Wow, apples!" },
      { t: "s", en: "Do you like red apples?" },
    ]);
    expect(replay.filter((l) => l.t === "ko")).toEqual([{ t: "ko", ko: ko1 }]);
    expect(replay.at(-1)?.t).toBe("end");
    // 다시 흘림은 행을 더하지 않는다
    expect(
      (await rowsOf(sessionId)).filter((r) => r.speaker === "tori").at(-1)
        ?.text,
    ).toBe(say1);
  });
});

// 회화 수업 새 갈래 액션 · 화면 자료 통합 시험(회화 plan 묶음 9 — 정적, 실행은 11-01 뒤 CI). 시험용 시드의 회화 1단계 단원 1 카드는 새 꼴이라
// (묶음 3) 그 수업으로 세션을 넣고 처음 열기 · 토막 넘김 · 짧은 준비 저장 · '더 이야기하기' · '그만하기' · '홈'을 부른다. 회화 턴(AI)은 묶음 8
// 몫이라 아이 행 · 선생님 행(move)은 시험이 talk_turns 에 바로 넣는다. AI 는 부르지 않는다(끝맺음 턴은 모아 두기만 하고 돌리지 않는다).
// 증명: AC-15f(이어 하기 · 홈) · AC-15t (가) · (나) · AC-16a(참여 완료 때만 친한 정도, 세션마다 한 번) · AC-12h(짧은 준비 문장 셈) · 정한 것 11 · 12.
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  parseTalkAttemptInput,
  talkClosingAttemptId,
} from "@/core/conversation/attempt";
import { type TalkMoveInput, talkMoveOf } from "@/core/conversation/move";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { LEVEL_MAX } from "@/core/seed/structure";
import { lessons, vocab } from "@/db/schema/content";
import {
  attempts,
  sessions,
  talkTurns,
  vocabProgress,
} from "@/db/schema/learning";
import { parentAlerts, settings } from "@/db/schema/operations";
import {
  advanceTalkLesson,
  chooseLessonMoreTalk,
  leaveTalkLesson,
  loadTalkLessonView,
  revealTalkLessonHint,
  saveLessonFollowAlong,
  stopTalkLesson,
} from "@/server/conversation";
import { closingStateOf } from "@/server/conversation/closing";
import type { TalkLessonLine } from "@/server/conversation/lesson-turn";
import { friendshipOf, type TalkServerDeps } from "@/server/conversation/state";
import { runTalkTurnRequest } from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import { readLessonList } from "@/server/lesson-list";
import { loadSeed } from "@/server/seed/load";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  LOADED_AT,
  NOW,
  resetHousehold,
  setHouseholdSetting,
} from "./talk-fixture";
import { createTestDatabase, type TestDatabase } from "./test-db";

type LessonRow = typeof lessons.$inferSelect;
type Card = ReturnType<typeof TalkLessonSchema.parse>["card"];

let testDb: TestDatabase;
let db: Db;
let assigned: LessonRow;
let card: Card;
let reinforce: { row: LessonRow; card: Card } | undefined;
let unitCards: Card[] = [];

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
  const parsed = rows.map((row) => ({
    row,
    card: TalkLessonSchema.parse(row.content).card,
  }));
  const first = parsed.find(
    (p) => p.row.kind === "assigned" && p.row.lessonNo === 1,
  );
  if (!first) throw new Error("회화 1단계 단원 1 수업 1 이 없다");
  assigned = first.row;
  card = first.card;
  unitCards = parsed
    .filter((p) => p.row.kind === "assigned")
    .map((p) => p.card);
  reinforce = parsed.find((p) => p.card.todayWords.length === 0);
});

afterAll(async () => {
  await testDb?.drop();
});

const tasks: (() => Promise<void>)[] = [];
const deps = (): TalkServerDeps => ({
  db,
  now: () => NOW,
  homophones: () => [],
  schedule: (task) => {
    tasks.push(task);
  },
});

async function newSession(
  row: LessonRow = assigned,
): Promise<{ profileId: string; sessionId: string }> {
  const profileId = await resetHousehold(db, 1);
  return { profileId, sessionId: await sessionFor(profileId, row) };
}

/** 그 프로필의 진행 세션 하나(집을 비우지 않음 — 같은 학습일 여러 대화). */
async function sessionFor(
  profileId: string,
  row: LessonRow = assigned,
): Promise<string> {
  const [session] = await db
    .insert(sessions)
    .values({
      profileId,
      area: "talk",
      level: 1,
      unit: 1,
      lessonId: row.id,
      kind: "regular",
      status: "in_progress",
      startedAt: NOW,
      seedRevision: row.revision,
      seedCorrection: 0,
    })
    .returning({ id: sessions.id });
  if (!session) throw new Error("세션을 넣지 못했다");
  return session.id;
}

async function maxTurn(sessionId: string): Promise<number> {
  const rows = await db
    .select({ turnNo: talkTurns.turnNo })
    .from(talkTurns)
    .where(eq(talkTurns.sessionId, sessionId));
  return rows.reduce((m, r) => Math.max(m, r.turnNo), 0);
}

/** 아이 행 하나와 그 뒤 선생님 행 하나(회화 턴 길 대신 — 묶음 8 몫). */
async function exchange(
  sessionId: string,
  {
    segment,
    text,
    teacher,
  }: {
    segment: "greeting" | "talk" | "more_talk";
    text: string | null;
    teacher: { text: string; move: TalkMoveInput };
  },
): Promise<void> {
  const turnNo = await maxTurn(sessionId);
  await db.insert(talkTurns).values([
    {
      sessionId,
      turnNo,
      segment,
      speaker: "child",
      text,
      inputMode: text === null ? "dont_know" : "speech",
      clientAttemptId: `child-${sessionId}-${turnNo}`,
      recordedAt: NOW,
    },
    {
      sessionId,
      turnNo: turnNo + 1,
      segment,
      speaker: "tori",
      text: teacher.text,
      move: talkMoveOf(teacher.move),
      recordedAt: NOW,
    },
  ]);
}

/** 처음 열고 인사 턴을 다 한 세션(인사 끝 반응까지). */
async function greeted(row?: LessonRow) {
  const ids = await newSession(row);
  const view = await loadTalkLessonView({ sessionId: ids.sessionId }, deps());
  if (!view) throw new Error("화면 자료가 없다");
  const turns = (row ? TalkLessonSchema.parse(row.content).card : card)
    .greetingTurns;
  for (let i = 0; i < turns; i++)
    await exchange(ids.sessionId, {
      segment: "greeting",
      text: "I'm good.",
      teacher: { text: "Great!", move: { kind: "ai" } },
    });
  return ids;
}

/** 인사 → (짧은 준비) → 대화 첫 질문까지. */
async function inTalk() {
  const ids = await greeted();
  const view = await loadTalkLessonView({ sessionId: ids.sessionId }, deps());
  if (view?.step.kind === "advance" && view.step.to === "prep")
    await advanceTalkLesson({ sessionId: ids.sessionId, to: "prep" }, deps());
  const moved = await advanceTalkLesson(
    { sessionId: ids.sessionId, to: "talk" },
    deps(),
  );
  if (!moved.ok) throw new Error("대화로 넘기지 못했다");
  return ids;
}

async function sessionRow(sessionId: string) {
  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  return row;
}

async function closingReasonOf(sessionId: string): Promise<string | null> {
  const rows = await db
    .select({ input: attempts.input })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId));
  for (const r of rows) {
    const input = parseTalkAttemptInput(r.input);
    if (input?.kind === "talk-closing") return input.reason;
  }
  return null;
}

describe("회화 수업 새 갈래 액션 · 화면 자료(묶음 9)", () => {
  it("AC-15f 처음 열면 처음 스냅숏(짧은 준비 계획)과 첫 선생님 행(카드 인사 질문)을 넣고, 다시 열면 같은 자리에서 AI 없이 잇는다", async () => {
    const { sessionId } = await newSession();
    const view = await loadTalkLessonView({ sessionId }, deps());
    expect(view?.step).toEqual({ kind: "child" });
    expect(view?.segment).toBe("greeting");
    const [start] = await db
      .select({ input: attempts.input })
      .from(attempts)
      .where(eq(attempts.sessionId, sessionId));
    const input = parseTalkAttemptInput(start?.input);
    // 1단계는 talk.prep_mode.1-3 always — 카드 짧은 준비 낱말을 talk.prep_words.1-3 개까지
    expect(input?.kind === "talk-start" && input.prepWords).toEqual(
      (card.prep ?? []).slice(0, TEST_SETTINGS["talk.prep_words.1-3"].value),
    );
    const rows = await db
      .select()
      .from(talkTurns)
      .where(eq(talkTurns.sessionId, sessionId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.speaker).toBe("tori");
    expect((rows[0]?.move as { kind?: string } | null)?.kind).toBe(
      "first_question",
    );
    expect(view?.current?.lines.map((l) => l.en)).toEqual(
      "questions" in card.greeting
        ? [card.greeting.questions[0]?.question.en]
        : [card.greeting.firstLine.en],
    );
    expect(view?.waitLines.length).toBeGreaterThan(0);
    const again = await loadTalkLessonView({ sessionId }, deps());
    expect(again?.version).toBe(view?.version);
    expect(again?.log).toEqual(view?.log);
  });

  it("토막 넘김: 인사 끝 → 짧은 준비(쪽지 · 들려줄 말) → 저장(만남 · 영어 문장 수 · 같은 시도 한 번) → 대화 첫 질문(1~3단계는 장면 여는 질문 — C206)", async () => {
    const { profileId, sessionId } = await greeted();
    const view = await loadTalkLessonView({ sessionId }, deps());
    expect(view?.step).toEqual({ kind: "advance", to: "prep" });
    expect(view?.prep?.place).toBe("greeting");
    expect(
      (await advanceTalkLesson({ sessionId, to: "talk" }, deps())).ok,
    ).toBe(false);
    const toPrep = await advanceTalkLesson({ sessionId, to: "prep" }, deps());
    if (!toPrep.ok) throw new Error("짧은 준비로 넘기지 못했다");
    expect(toPrep.segment).toBe("prep");
    const word = toPrep.prep?.words[0];
    if (!word) throw new Error("쪽지 낱말이 없다");
    expect(word.source).toBe("card");
    expect(word.modelLine).toBe(
      card.todayWords.find((w) => w.word === word.word)?.modelLine,
    );
    const save = {
      sessionId,
      clientAttemptId: `prep-${sessionId}-0`,
      segment: "prep",
      index: 0,
      target: word.modelLine,
      heard: [word.modelLine],
      failures: 0,
    };
    expect(await saveLessonFollowAlong(save, deps())).toEqual({
      ok: true,
      saved: true,
    });
    expect(await saveLessonFollowAlong(save, deps())).toEqual({
      ok: true,
      saved: false,
    });
    expect((await sessionRow(sessionId))?.englishSentences).toBe(1);
    const met = await db
      .select({ id: vocabProgress.id })
      .from(vocabProgress)
      .innerJoin(vocab, eq(vocab.id, vocabProgress.vocabId))
      .where(
        and(
          eq(vocabProgress.profileId, profileId),
          eq(vocabProgress.state, "say"),
          eq(vocab.word, word.word),
        ),
      );
    expect(met).toHaveLength(1);
    const toTalk = await advanceTalkLesson({ sessionId, to: "talk" }, deps());
    if (!toTalk.ok) throw new Error("대화로 넘기지 못했다");
    expect(toTalk.segment).toBe("talk");
    expect(toTalk.step).toEqual({ kind: "child" });
    expect(toTalk.current?.kind).toBe("first_question");
    // 1~3단계 카드의 대화 첫 질문은 장면 여는 질문이다 — 카드 항목 · 노리는 단어 없음, 앱이 읽고 AI 를 부르지 않는다(C206 · 02-2 200줄)
    const opener = card.sceneOpener;
    if (!opener)
      throw new Error("시험 시드 1단계 카드에 장면 여는 질문이 없다");
    expect(toTalk.current?.item).toEqual({ kind: "none", no: 0 });
    expect(toTalk.current?.lines.at(-1)?.en).toBe(opener.question.en);
  });

  it("AC-15t (나) 인사만 하고 그만하기는 확인 쪽지, 확인하면 중단 · 끝맺음 까닭 stop_confirmed · 친한 정도 그대로(AC-16a)", async () => {
    const { profileId, sessionId } = await inTalk();
    const before = await friendshipOf(db, profileId);
    tasks.length = 0;
    expect(
      await stopTalkLesson({ sessionId, confirmed: false }, deps()),
    ).toEqual({ ok: false, reason: "needs_confirm" });
    expect(tasks).toHaveLength(0);
    const out = await stopTalkLesson({ sessionId, confirmed: true }, deps());
    // 그만두면 끝맺음 턴이 응답 뒤에 불린다(AC-15f — 'AI 쉬는 중'이 아니면 하나 모임, 검토 M-2)
    expect(tasks).toHaveLength(1);
    expect(out.ok && out.wrap.aborted).toBe(true);
    const row = await sessionRow(sessionId);
    expect(row?.status).toBe("aborted");
    expect(row?.talkSegment).toBe("wrap_up");
    expect(await closingReasonOf(sessionId)).toBe("stop_confirmed");
    expect(await friendshipOf(db, profileId)).toBe(before);
  });

  it("AC-15t (가) 대화 토막에서 말로 한 턴이라도 했으면 확인 없이 참여 완료 · 끝맺음 까닭 stop · 친한 정도 1칸(AC-16a)", async () => {
    const { profileId, sessionId } = await inTalk();
    await exchange(sessionId, {
      segment: "talk",
      text: "I like apples.",
      teacher: { text: "Nice! What else?", move: { kind: "ai" } },
    });
    const before = await friendshipOf(db, profileId);
    tasks.length = 0;
    const out = await stopTalkLesson({ sessionId, confirmed: false }, deps());
    expect(out.ok && out.wrap.aborted).toBe(false);
    const row = await sessionRow(sessionId);
    expect(row?.status).toBe("completed");
    expect(row?.learningDay).not.toBeNull();
    expect(await closingReasonOf(sessionId)).toBe("stop");
    expect(await friendshipOf(db, profileId)).toBe(before + 1);
    expect(tasks).toHaveLength(1);
  });

  it("정한 것 11 마무리 물음 뒤 '더 이야기하기'는 참여 완료(한 번) · 더 이야기하기 토막 · 더 이야기할 거리 카드 자리, 다시 골라도 친한 정도는 한 번", async () => {
    const { profileId, sessionId } = await inTalk();
    await exchange(sessionId, {
      segment: "talk",
      text: "I like apples.",
      teacher: {
        text: "Great talk!\nDo you want to talk more?",
        move: { kind: "closing_slot" },
      },
    });
    const before = await friendshipOf(db, profileId);
    const more = await chooseLessonMoreTalk({ sessionId }, deps());
    if (!more.ok) throw new Error("더 이야기하기를 받지 않았다");
    expect(more.segment).toBe("more_talk");
    expect(more.step).toEqual({ kind: "child" });
    expect(more.current?.kind).toBe("card_slot");
    expect(more.current?.item?.kind).toBe("more");
    expect((await sessionRow(sessionId))?.status).toBe("completed");
    expect(await friendshipOf(db, profileId)).toBe(before + 1);
    await exchange(sessionId, {
      segment: "more_talk",
      text: "I like bananas.",
      teacher: {
        text: "Cool!\nDo you want to talk more?",
        move: { kind: "closing_slot" },
      },
    });
    expect((await chooseLessonMoreTalk({ sessionId }, deps())).ok).toBe(true);
    expect(await friendshipOf(db, profileId)).toBe(before + 1);
    // 참여 완료 뒤 '홈'은 정리로 닫고 끝맺음은 응답 뒤(leave)
    const left = await leaveTalkLesson({ sessionId }, deps());
    expect(left.ok && left.closed).toBe(true);
    expect(await closingReasonOf(sessionId)).toBe("leave");
    expect(await friendshipOf(db, profileId)).toBe(before + 1);
  });

  it("AC-15a · AC-15p 대화 첫 질문 자리의 힌트 단: 화면 자료는 1~3단계 영어 단 글을 비우고, 누른 단만 장면 여는 질문 칸의 힌트 글로 받는다", async () => {
    const { sessionId } = await inTalk();
    const view = await loadTalkLessonView({ sessionId }, deps());
    const hints = view?.current?.hints ?? [];
    // 1~3단계 대화 첫 질문은 장면 여는 질문이라 힌트 단은 그 칸의 뜻 · 영어 문장이다(C206 · 02-2 200줄 '받침 줄은 필수 질문과 같은 카드 칸',
    // 1단계 힌트 단 ko · sentence)
    const opener = card.sceneOpener;
    if (!opener)
      throw new Error("시험 시드 1단계 카드에 장면 여는 질문이 없다");
    expect(hints[0]).toEqual({ kind: "ko", text: opener.hintKo });
    expect(hints.length).toBeGreaterThan(1);
    expect(hints.slice(1).every((h) => h.text === undefined)).toBe(true);
    expect(await revealTalkLessonHint({ sessionId, tier: 0 }, deps())).toEqual({
      ok: true,
      text: opener.hintKo,
    });
    expect(await revealTalkLessonHint({ sessionId, tier: 1 }, deps())).toEqual({
      ok: true,
      text: opener.hintEn,
    });
    expect(
      await revealTalkLessonHint({ sessionId, tier: hints.length }, deps()),
    ).toEqual({ ok: false });
  });

  it("AC-15f 참여 완료 전 '홈'은 아무것도 바꾸지 않고 세션은 진행으로 남는다", async () => {
    const { sessionId } = await inTalk();
    expect(await leaveTalkLesson({ sessionId }, deps())).toEqual({
      ok: true,
      closed: false,
    });
    const row = await sessionRow(sessionId);
    expect(row?.status).toBe("in_progress");
    expect(row?.talkSegment).toBe("talk");
  });

  it("다지기 짧은 준비 쪽지의 들려줄 말은 같은 단원 배정 카드의 오늘 쓸 말 → 품사 규칙 → 낱말만에서 온다", async () => {
    if (!reinforce) throw new Error("시험 시드에 다지기 회화 카드가 없다");
    const { sessionId } = await greeted(reinforce.row);
    const view = await loadTalkLessonView({ sessionId }, deps());
    const words = view?.prep?.words ?? [];
    expect(words.length).toBeGreaterThan(0);
    for (const w of words) {
      const fromUnit = unitCards
        .flatMap((c) => c.todayWords)
        .find((t) => t.word === w.word);
      if (fromUnit) {
        expect(w.source).toBe("unit_card");
        expect(w.modelLine).toBe(fromUnit.modelLine);
      } else expect(["rule", "word"]).toContain(w.source);
    }
  });
});

describe("대화 안전 상한 · 옛 꼴 카드 닫기(회화 plan 묶음 12)", () => {
  it("AC-15j 대화 하나가 talk.safety_max_turns 에 닿으면 AI 를 부르지 않고 카드의 '새 이야기로 이어 가자' 끝인사로 닫으며(중단 · 학습일 · 끝맺음 대기) 같은 학습일에 talk.safety_alert_count 번째로 닿을 때만 부모 알림이 생긴다", async () => {
    const alertCount = TEST_SETTINGS["talk.safety_alert_count"].value;
    await setHouseholdSetting(db, "talk.safety_max_turns", 1);
    try {
      const { profileId, sessionId: first } = await newSession();
      const alerts = async () =>
        (
          await db
            .select({ kind: parentAlerts.kind })
            .from(parentAlerts)
            .where(eq(parentAlerts.profileId, profileId))
        ).filter((a) => a.kind === "talk_safety_cap");
      // 한 프로필 · 영역에 진행 세션은 하나다(sessions_one_in_progress_unique). 앞 대화가 상한으로 중단된 뒤에 다음 대화를 넣는다
      for (let i = 0; i < alertCount; i++) {
        const sessionId = i === 0 ? first : await sessionFor(profileId);
        // 처음 열기(첫 선생님 행) 뒤 아이 말 하나가 상한(1)에 닿는다 — 회화 턴 호출 없이 닫힌다(deps 에 AI 가 없다)
        expect(await loadTalkLessonView({ sessionId }, deps())).toBeDefined();
        const lines: TalkLessonLine[] = [];
        const scheduled = tasks.length;
        await runTalkTurnRequest(
          {
            sessionId,
            clientAttemptId: `safety-${sessionId}`,
            input: { mode: "speech", text: "I'm good." },
            hint: { opened: 0, heard: [] },
          },
          { ...deps(), write: (line) => lines.push(line) },
        );
        expect(lines.at(-1)).toEqual({
          t: "close",
          reason: "safety",
          farewell: {
            en: card.safetyFarewell.en,
            ...(card.safetyFarewell.ko === undefined
              ? {}
              : { ko: card.safetyFarewell.ko }),
          },
        });
        const row = await sessionRow(sessionId);
        expect(row?.talkSegment).toBe("wrap_up");
        expect(row?.status).toBe("aborted");
        expect(row?.learningDay).not.toBeNull();
        expect(await closingReasonOf(sessionId)).toBe("safety");
        const [closing] = await db
          .select({ aiFeedback: attempts.aiFeedback })
          .from(attempts)
          .where(eq(attempts.clientAttemptId, talkClosingAttemptId(sessionId)));
        expect(closingStateOf(closing?.aiFeedback)?.state).toBe("pending");
        // 끝맺음 턴은 응답 뒤(after)로 하나 예약된다
        expect(tasks.length).toBe(scheduled + 1);
        expect(await alerts()).toHaveLength(i + 1 === alertCount ? 1 : 0);
      }
    } finally {
      await setHouseholdSetting(
        db,
        "talk.safety_max_turns",
        TEST_SETTINGS["talk.safety_max_turns"].value,
      );
      tasks.length = 0;
    }
  });

  it("회화 plan 정한 것 2 옛 꼴 카드(C189 앞 칸 firstQuestion · turns) 수업은 수업 목록 칸 후보가 아니고, 그 카드로 진행 중인 세션은 열 때 끝맺음 없이 중단으로 닫힌다(화면 자료 없음 · AI 없음)", async () => {
    const [second] = await db
      .select()
      .from(lessons)
      .where(
        and(
          eq(lessons.area, "talk"),
          eq(lessons.level, 1),
          eq(lessons.unit, 1),
          eq(lessons.kind, "assigned"),
          eq(lessons.lessonNo, 2),
        ),
      );
    if (!second) throw new Error("회화 1단계 단원 1 수업 2 가 없다");
    const original = second.content;
    const content = original as { card: Record<string, unknown> };
    await db
      .update(lessons)
      .set({
        content: {
          ...content,
          card: {
            ...content.card,
            firstQuestion: "What do you see?",
            turns: [],
          },
        },
      })
      .where(eq(lessons.id, second.id));
    try {
      const { profileId, sessionId } = await newSession(second);
      // 목록: 옛 꼴 카드 행은 칸이 되지 않는다(새 꼴 첫 수업은 그대로)
      const list = await readLessonList({ db, area: "talk", now: NOW });
      if (list.kind !== "list") throw new Error("목록이어야 한다");
      const cells = list.input.lessonsByUnit[1] ?? [];
      expect(cells.some((c) => c.lessonId === second.id)).toBe(false);
      expect(cells.some((c) => c.lessonId === assigned.id)).toBe(true);
      // 그 카드로 진행 중인 세션: 쪽 자료 읽기가 끝맺음 없이 중단으로 닫는다
      expect(await loadTalkLessonView({ sessionId }, deps())).toBeUndefined();
      const row = await sessionRow(sessionId);
      expect(row?.status).toBe("aborted");
      expect(row?.talkSegment).toBe("wrap_up");
      expect(row?.learningDay).not.toBeNull();
      expect(await closingReasonOf(sessionId)).toBe("aborted");
      const [closing] = await db
        .select({ aiFeedback: attempts.aiFeedback })
        .from(attempts)
        .where(eq(attempts.clientAttemptId, talkClosingAttemptId(sessionId)));
      expect(closingStateOf(closing?.aiFeedback)?.state).toBe("skipped");
      expect(profileId).not.toBe("");
    } finally {
      await db
        .update(lessons)
        .set({ content: original })
        .where(eq(lessons.id, second.id));
    }
  });
});

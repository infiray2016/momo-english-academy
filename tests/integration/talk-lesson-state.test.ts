// 회화 수업 새 갈래 상태 읽기 통합 시험(회화 plan 묶음 7 — 정적, 실행은 11-01 뒤 CI). 시험용 시드의 회화 1단계 단원 1 카드는 새 꼴이라
// (묶음 3) 그 수업으로 세션을 넣고 talk_turns(move) · attempts(talk-start · talk-prep)를 넣은 뒤 readTalkAnyState · readTalkLessonState 를 본다.
// 마이그레이션 0006(talk_segment prep · talk_turns move)이 시험 본 DB 에 들었는지도 같이 본다. AI 는 부르지 않는다.
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { talkStartAttemptId } from "@/core/conversation/attempt";
import { talkMoveOf } from "@/core/conversation/move";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { LEVEL_MAX } from "@/core/seed/structure";
import { lessons } from "@/db/schema/content";
import { attempts, sessions, talkTurns } from "@/db/schema/learning";
import { settings } from "@/db/schema/operations";
import {
  readTalkAnyState,
  readTalkLessonState,
} from "@/server/conversation/state";
import type { Db } from "@/server/db";
import { loadSeed } from "@/server/seed/load";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import { LOADED_AT, NOW, resetHousehold } from "./talk-fixture";
import { createTestDatabase, type TestDatabase } from "./test-db";

let testDb: TestDatabase;
let db: Db;
let lessonId: string;
let lessonRevision: number;
let card: ReturnType<typeof TalkLessonSchema.parse>["card"];

beforeAll(async () => {
  testDb = await createTestDatabase();
  db = testDb.db;
  const tree = devSeedTree();
  const report = await loadSeed(db, {
    files: filesOf(tree),
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

const head = { v: 1, step: "final" } as const;

async function newSession(
  segment: "greeting" | "prep" | "talk",
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
      talkSegment: segment,
      status: "in_progress",
      startedAt: NOW,
      seedRevision: lessonRevision,
      seedCorrection: 0,
    })
    .returning({ id: sessions.id });
  if (!session) throw new Error("세션을 넣지 못했다");
  return { profileId, sessionId: session.id };
}

async function addAttempt(
  sessionId: string,
  activityNo: number,
  clientAttemptId: string,
  input: Record<string, unknown>,
) {
  await db.insert(attempts).values({
    sessionId,
    clientAttemptId,
    activityNo,
    input,
    attemptedAt: NOW,
    status: "done",
  });
}

const spoken = { target: "Listen!", heard: [], failures: 0 };

describe("회화 수업 새 갈래 상태 읽기(묶음 7)", () => {
  it("새 꼴 카드 세션은 새 갈래로 읽힌다(짧은 준비 토막 prep 이 DB 열거에 든다 — 옛 갈래 readTalkState 는 묶음 12 가 지웠다)", async () => {
    const { profileId, sessionId } = await newSession("prep");
    const args = { sessionId, profileId, at: NOW };
    const any = await readTalkAnyState(db, args);
    expect(any?.kind).toBe("new");
    if (any?.kind !== "new") throw new Error("새 갈래여야 한다");
    expect(any.state.segment).toBe("prep");
    expect(any.state.card).toEqual(card);
    expect(any.state.settings.prepWords).toBeGreaterThan(0);
    const direct = await readTalkLessonState(db, args);
    expect(direct?.segment).toBe("prep");
  });

  it("흐름 입력 prepWords 는 talk-prep 시도(인사 뒤 자리)에서 되짚은 보인 낱말이고 처음 스냅숏의 계획이 아니다", async () => {
    const { profileId, sessionId } = await newSession("talk");
    const plan = card.todayWords.map((w) => w.word);
    await addAttempt(sessionId, 1, talkStartAttemptId(sessionId), {
      ...head,
      kind: "talk-start",
      shownWords: [],
      metBefore: [],
      practiceOrder: [],
      prepWords: plan,
      teacherKey: "mina",
    });
    const args = { sessionId, profileId, at: NOW };
    // when_needed 처럼 인사 뒤 준비를 하지 않았으면 계획이 있어도 빈 목록
    const before = await readTalkLessonState(db, args);
    expect(before?.start?.prepPlan).toEqual(plan);
    expect(before?.prepWords).toEqual([]);
    const [first] = plan;
    if (!first) throw new Error("오늘 쓸 말이 없다");
    await addAttempt(sessionId, 2, `prep-${sessionId}-0`, {
      ...head,
      kind: "talk-prep",
      ...spoken,
      index: 0,
      word: first,
      place: "greeting",
      skipped: "recognition",
    });
    const after = await readTalkLessonState(db, args);
    expect(after?.prepWords).toEqual([first]);
    expect(after?.follows.prep).toEqual([
      { place: "greeting", index: 0, word: first },
    ]);
  });

  it("AC-15v 선생님 행 move 를 읽어 흐름 꼴로 되짚고(꼴이 틀린 move 는 null), 아이 행의 들리지 않음 출처를 옮긴다", async () => {
    const { profileId, sessionId } = await newSession("talk");
    const move = talkMoveOf({
      kind: "first_question",
      item: { kind: "required", no: 1 },
      words: card.required[0]?.targets ?? [],
    });
    await db.insert(talkTurns).values([
      {
        sessionId,
        turnNo: 1,
        segment: "talk",
        speaker: "tori",
        text: card.required[0]?.en ?? "",
        move,
        recordedAt: NOW,
      },
      {
        sessionId,
        turnNo: 1,
        segment: "talk",
        speaker: "child",
        inputMode: "dont_know",
        clientListen: { src: "nospeech" },
        clientAttemptId: `child-${sessionId}-1`,
        recordedAt: NOW,
      },
      {
        sessionId,
        turnNo: 2,
        segment: "talk",
        speaker: "tori",
        text: "I couldn't hear you.",
        move: { v: 99 },
        recordedAt: NOW,
      },
    ]);
    const state = await readTalkLessonState(db, {
      sessionId,
      profileId,
      at: NOW,
    });
    expect(state?.turns).toEqual([
      {
        speaker: "teacher",
        text: card.required[0]?.en ?? "",
        move,
        answerExample: null,
      },
      {
        speaker: "child",
        segment: "talk",
        input: "dont_know",
        stuck: false,
        nospeech: true,
        targets: [],
      },
      {
        speaker: "teacher",
        text: "I couldn't hear you.",
        move: null,
        answerExample: null,
      },
    ]);
    expect(state?.position.lastCause).toBe("nospeech");
  });
});

// 새 꼴 회화 수업 턴 길 통합 시험(회화 plan 묶음 8 — 정적, 실행은 11-01 뒤 CI). 시험용 시드의 회화 1단계 단원 1 카드는 새 꼴이라(묶음 3)
// 그 수업으로 세션을 넣고 talk_turns(move)를 대화 첫 질문까지 넣은 뒤 runTalkTurnRequest(카드 꼴로 새 갈래)를 가짜 Anthropic 으로 부른다.
// 증명: AC-15v(선생님 행 move · text 는 화면 글 줄만) · AC-15i(범위 밖 질문 → 카드 자리) · AC-15k(둘째 턴 요청 본문 앞부분 · 앞 선생님 차례의
// 붙인 카드 질문) · AC-15b(1~3단계 두 번 실패 → 칭찬 대사 + 카드 질문) · 참여 완료(마무리 물음에 답한 턴 · 세션마다 한 번).
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ClientListen } from "@/core/conversation/client-listen";
import { readTalkMove, talkMoveOf } from "@/core/conversation/move";
import { MORE_PROMPT } from "@/core/conversation/spoken";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { LEVEL_MAX } from "@/core/seed/structure";
import { lessons } from "@/db/schema/content";
import { profileTracks, sessions, talkTurns } from "@/db/schema/learning";
import { settings } from "@/db/schema/operations";
import type { TalkLessonLine } from "@/server/conversation/lesson-turn";
import { runTalkTurnRequest } from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import { loadSeed } from "@/server/seed/load";
import { seedHomophones } from "@/server/seed-lists";
import { type FakeRule, messageBody } from "../fixtures/ai/fake-anthropic";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  harnessOf,
  LOADED_AT,
  LOW_MODEL,
  lessonAnswer,
  NOW,
  resetHousehold,
  type TalkHarness,
  TURN_MARK,
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

beforeEach(() => {
  h = harnessOf(db);
});

const turnRule = (over: Record<string, unknown>, times = 1): FakeRule => ({
  when: { bodyIncludes: TURN_MARK },
  reply: {
    kind: "stream",
    body: messageBody({ model: LOW_MODEL, json: lessonAnswer(over) }),
    chunks: 4,
  },
  times,
});

/** 새 꼴 카드 세션을 대화 첫 질문(필수 1)까지 넣는다(인사 질문마다 선생님 행 · 아이 말, 인사 끝 반응, 대화 첫 질문). */
async function sessionAtFirstQuestion(): Promise<{
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
      talkSegment: "greeting",
      status: "in_progress",
      startedAt: NOW,
      seedRevision: lessonRevision,
      seedCorrection: 0,
    })
    .returning({ id: sessions.id });
  if (!session) throw new Error("세션을 넣지 못했다");
  const sessionId = session.id;
  const greeting = "questions" in card.greeting ? card.greeting.questions : [];
  let turnNo = 1;
  for (const [i, q] of greeting.slice(0, card.greetingTurns).entries()) {
    await db.insert(talkTurns).values([
      {
        sessionId,
        turnNo,
        segment: "greeting",
        speaker: "tori",
        text: q.question.en,
        move: talkMoveOf({ kind: i === 0 ? "first_question" : "card_slot" }),
        recordedAt: NOW,
      },
      {
        sessionId,
        turnNo,
        segment: "greeting",
        speaker: "child",
        text: q.answerExample,
        inputMode: "speech",
        clientAttemptId: `greet-${sessionId}-${i}`,
        recordedAt: NOW,
      },
    ]);
    turnNo += 1;
  }
  const first = card.required[0];
  if (!first) throw new Error("필수 질문이 없다");
  await db.insert(talkTurns).values([
    {
      sessionId,
      turnNo,
      segment: "greeting",
      speaker: "tori",
      text: "Great!",
      move: talkMoveOf({ kind: "ai" }),
      recordedAt: NOW,
    },
    {
      sessionId,
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
  await db
    .update(sessions)
    .set({ talkSegment: "talk" })
    .where(eq(sessions.id, sessionId));
  return { profileId, sessionId };
}

let seq = 0;
async function sayLesson(
  sessionId: string,
  text = "I like it.",
): Promise<TalkLessonLine[]> {
  const lines: TalkLessonLine[] = [];
  seq += 1;
  await runTalkTurnRequest(
    {
      sessionId,
      clientAttemptId: `lesson-${seq}`,
      input: { mode: "speech", text },
      hint: { opened: 0, heard: [] },
    },
    {
      ...h.deps(),
      write: (line) => lines.push(line as TalkLessonLine),
      requestReceivedAt: h.clock.now,
    },
  );
  return lines;
}

async function teacherRows(sessionId: string) {
  return (
    await db.select().from(talkTurns).where(eq(talkTurns.sessionId, sessionId))
  )
    .filter((r) => r.speaker === "tori")
    .sort((a, b) => a.turnNo - b.turnNo);
}

describe("새 꼴 회화 수업 턴 길(묶음 8)", () => {
  it("AC-15v 새 꼴 카드 세션은 새 갈래로 돌고 선생님 행마다 move 가 있으며 text 는 화면 글 줄만이다(끝 줄은 lesson 꼴)", async () => {
    const { sessionId } = await sessionAtFirstQuestion();
    h.fake.push(turnRule({ tori_en: "Oh, nice!", support: "none" }));
    const lines = await sayLesson(sessionId);
    expect(lines.at(-1)).toMatchObject({
      t: "end",
      lesson: { segment: "talk" },
    });
    expect(lines).toContainEqual({ t: "s", en: "Oh, nice!" });
    const rows = await teacherRows(sessionId);
    const last = rows.at(-1);
    expect(readTalkMove(last?.move)).not.toBeNull();
    for (const row of rows) expect(readTalkMove(row.move)).not.toBeNull();
    expect(last?.text?.split("\n")[0]).toBe("Oh, nice!");
    expect(last?.toriRewrite).toContain("Oh, nice!");
  });

  it("AC-15i 어휘 범위 밖 낱말이 든 1단계 AI 질문은 화면 · 읽어 주기 · 응답 본문에 없고 그 턴은 카드 자리가 되어 카드 질문이 붙는다", async () => {
    const { sessionId } = await sessionAtFirstQuestion();
    h.fake.push(
      turnRule({
        tori_en: "Oh, nice! Do you like zebrafish aquariums?",
        next_move: "follow_up",
      }),
    );
    const lines = await sayLesson(sessionId);
    const shown = JSON.stringify(lines);
    expect(shown).not.toContain("zebrafish");
    const last = (await teacherRows(sessionId)).at(-1);
    const move = readTalkMove(last?.move);
    expect(move).toMatchObject({
      kind: "card_slot",
      why: "question_check",
      next: "none",
    });
    expect(last?.text).not.toContain("zebrafish");
    expect(last?.toriRewrite).not.toContain("zebrafish");
    const cardQuestions = [...card.required, ...card.more].map((x) => x.en);
    const added = lines.filter(
      (l): l is Extract<TalkLessonLine, { t: "add" }> => l.t === "add",
    );
    expect(cardQuestions).toContain(added.at(-1)?.en);
  });

  it("13절 C203 (3) 질문 검사에 걸린 1단계 AI 질문은 한 번 다시 쓰게 하고(같은 목적 · error_code 표지), 다시 쓴 질문이 지나면 카드 자리 없이 그 질문을 내며 둘째 응답이 없으면 지금처럼 카드 자리다", async () => {
    // 둘째 응답 있음: 걸린 질문 → 다시 쓰기 → 범위 안 질문
    {
      const { sessionId } = await sessionAtFirstQuestion();
      const before = h.fake.requests.length;
      h.fake.push(
        turnRule({
          tori_en: "Oh, nice! Do you like zebrafish aquariums?",
          next_move: "follow_up",
        }),
      );
      h.fake.push(
        turnRule({
          tori_en: "Oh, nice! Do you like it?",
          next_move: "follow_up",
        }),
      );
      const lines = await sayLesson(sessionId);
      const sent = h.fake.requests.slice(before);
      expect(sent).toHaveLength(2);
      // 다시 쓰기 요청은 앞 응답(assistant)과 앱의 다시 쓰기 메시지를 끝에 잇는다(question-retry questionRetryNoteOf)
      expect(sent[1]?.bodyText).toContain("App check: your question");
      expect(sent[1]?.bodyText).toContain("zebrafish");
      const shown = JSON.stringify(lines);
      expect(shown).not.toContain("zebrafish");
      expect(lines).toContainEqual({ t: "s", en: "Do you like it?" });
      expect(lines.at(-1)?.t).toBe("end");
      const last = (await teacherRows(sessionId)).at(-1);
      expect(readTalkMove(last?.move)).toMatchObject({ kind: "ai" });
      expect(last?.text).toContain("Do you like it?");
      expect(last?.text).not.toContain("zebrafish");
    }
    // 둘째 응답 없음: 다시 쓰기 요청은 가짜 서버에 맞는 규칙이 없어 실패하고 카드 자리(why question_check)로 닫힌다 — 턴은 오류가 아니다
    {
      const { sessionId } = await sessionAtFirstQuestion();
      const before = h.fake.requests.length;
      h.fake.push(
        turnRule({
          tori_en: "Oh, nice! Do you like zebrafish aquariums?",
          next_move: "follow_up",
        }),
      );
      const lines = await sayLesson(sessionId);
      expect(h.fake.requests.length - before).toBe(2);
      expect(lines.at(-1)?.t).toBe("end");
      expect(JSON.stringify(lines)).not.toContain("zebrafish");
      const last = (await teacherRows(sessionId)).at(-1);
      expect(readTalkMove(last?.move)).toMatchObject({
        kind: "card_slot",
        why: "question_check",
      });
    }
  });

  it("AC-15k 둘째 턴 요청 본문은 앞 턴 사용자 메시지와 다시 쓸 선생님 차례(붙인 카드 질문 포함)를 글자 그대로 앞에 둔다", async () => {
    const { sessionId } = await sessionAtFirstQuestion();
    h.fake.push(
      turnRule({ tori_en: "Oh, nice! Do you like zebrafish aquariums?" }),
    );
    await sayLesson(sessionId);
    h.fake.push(turnRule({ tori_en: "Great!" }));
    await sayLesson(sessionId, "Yes.");
    // 첫 턴 질문(zebrafish aquariums — 범위 밖 두 낱말)은 질문 검사에 걸려 C203 (3) 다시 쓰기가 한 번 불린다(가짜 서버에 둘째 규칙이 없어 501 →
    // 카드 자리). 그래서 TURN_MARK 본문은 본 턴 둘 + 다시 쓰기 하나다 — 이 시험은 본 턴 둘째 본문을 본다
    const all = h.fake.requests
      .filter((r) => r.bodyText.includes(TURN_MARK))
      .map((r) => r.bodyText);
    expect(all).toHaveLength(3);
    const retries = all.filter((b) => b.includes("App check: your question"));
    expect(retries).toHaveLength(1);
    const bodies = all.filter((b) => !b.includes("App check: your question"));
    expect(bodies).toHaveLength(2);
    // 행은 턴 번호 차례로 본다(ORDER BY 없는 읽기는 앞 시험이 지운 자리에 새 행이 들어가면 차례가 바뀐다)
    const [child] = (
      await db
        .select()
        .from(talkTurns)
        .where(eq(talkTurns.sessionId, sessionId))
        .orderBy(talkTurns.turnNo)
    ).filter((r) => r.speaker === "child" && r.sentUserMessage !== null);
    const firstTeacher = (await teacherRows(sessionId)).at(-2);
    const quoted = (text: string) => JSON.stringify(text).slice(1, -1);
    expect(bodies[1]).toContain(quoted(child?.sentUserMessage ?? "?"));
    expect(bodies[1]).toContain(quoted(firstTeacher?.toriRewrite ?? "?"));
  });

  it("AC-15zi 같은 소리로 들린 한 낱말 답 턴은 아이 행의 사용자 메시지(talk_turns.sent_user_message)와 요청 본문에 'Heard hint' 줄이 들고, 동음이의어 묶음이 없으면 줄이 없다(서버 (6) 배선)", async () => {
    const first = card.required[0];
    const target = first?.targets[0];
    if (!target) throw new Error("필수 1 의 노리는 단어가 없다");
    // 실제 동음이의어 목록(seedHomophones)을 넣는다. 시험용 카드의 단원 단어는 실제 묶음에 없을 수 있어, 그 단어와 같은 소리인 낱말 하나를 묶음으로
    // 앞에 더한다(앞 묶음이 이긴다 — 실제 묶음에 그 단어가 있어도 이 묶음으로 읽힌다)
    const heard = `${target}zz`;
    const groups = [[target, heard], ...seedHomophones()];
    const say = async (
      sessionId: string,
      id: string,
      homophones: () => string[][],
    ) => {
      await runTalkTurnRequest(
        {
          sessionId,
          clientAttemptId: id,
          input: { mode: "speech", text: `${heard}.` },
          hint: { opened: 0, heard: [] },
        },
        {
          ...h.deps(),
          homophones,
          write: () => {},
          requestReceivedAt: h.clock.now,
        },
      );
      const [row] = (
        await db
          .select()
          .from(talkTurns)
          .where(eq(talkTurns.sessionId, sessionId))
      ).filter((r) => r.clientAttemptId === id);
      if (!row) throw new Error("아이 행이 없다");
      return row;
    };
    const line = `Heard hint (speech recognition may have misheard): '${heard}' may be the answer word '${target}' (same sound)`;
    {
      const { sessionId } = await sessionAtFirstQuestion();
      const before = h.fake.requests.length;
      h.fake.push(
        turnRule({
          tori_en: "Oh, nice! Do you like it?",
          next_move: "follow_up",
        }),
      );
      const child = await say(sessionId, "heard-hint-on", () => groups);
      // 아이가 답하던 질문 자리(필수 1)의 노리는 단어와 같은 소리 → 아이 말 줄 바로 뒤 귀띔 한 줄
      expect(child.sentUserMessage ?? "").toContain(
        `Child: ${heard}.\n${line}\nInput: speech`,
      );
      const body = h.fake.requests.slice(before)[0]?.bodyText ?? "";
      expect(body).toContain(JSON.stringify(line).slice(1, -1));
    }
    {
      // 묶음이 비면(시험 기본 의존) 같은 말에 귀띔 줄이 없다 — 배선이 묶음을 읽는다
      const { sessionId } = await sessionAtFirstQuestion();
      h.fake.push(
        turnRule({
          tori_en: "Oh, nice! Do you like it?",
          next_move: "follow_up",
        }),
      );
      const child = await say(sessionId, "heard-hint-off", () => []);
      expect(child.sentUserMessage).not.toBeNull();
      expect(child.sentUserMessage ?? "").not.toContain("Heard hint");
    }
  });

  it("AC-15b 1~3단계 회화 턴이 두 번 실패한 턴은 끊기지 않고 카드 안전한 대사(뜻 있음 — 대본 회차 r1 판정 I-3 (나))와 카드 자리의 카드 질문이 보인다('말했다' 없음)", async () => {
    const { sessionId } = await sessionAtFirstQuestion();
    const fail: FakeRule = {
      when: { bodyIncludes: TURN_MARK },
      reply: { kind: "error", status: 500, body: { type: "error" } },
      times: 2,
    };
    h.fake.push(fail);
    const lines = await sayLesson(sessionId);
    expect(lines.at(-1)?.t).toBe("end");
    const last = (await teacherRows(sessionId)).at(-1);
    expect(readTalkMove(last?.move)).toMatchObject({
      kind: "card_slot",
      why: "fail",
    });
    expect(card.safeLines.map((l) => l.en)).toContain(
      last?.text?.split("\n")[0],
    );
    // 그 턴은 '말했다'를 세지 않는다(8절 회화 턴 실패)
    // 이번 턴의 아이 행은 턴 번호가 가장 큰 아이 행이다 — ORDER BY 없이 읽으면 앞 시험(C203 (3) 통합 사례 등)이 resetHousehold 로 지운 자리에
    // 새 행이 들어가 차례가 바뀌어, 인사 쪽 아이 행(saidWords null)을 고를 수 있다(CI 일곱째 AC-15b)
    const child = (
      await db
        .select()
        .from(talkTurns)
        .where(eq(talkTurns.sessionId, sessionId))
        .orderBy(talkTurns.turnNo)
    ).findLast((r) => r.speaker === "child");
    expect(child?.saidWords).toEqual([]);
  });

  it("참여 완료: 마무리 물음에 말로 답한 턴에 세션이 완료되고 친한 정도가 한 번 오르며, 그 뒤 턴은 다시 올리지 않는다", async () => {
    const { profileId, sessionId } = await sessionAtFirstQuestion();
    const rows = await teacherRows(sessionId);
    const turnNo = (rows.at(-1)?.turnNo ?? 0) + 1;
    await db.insert(talkTurns).values([
      {
        sessionId,
        turnNo: turnNo - 1,
        segment: "talk",
        speaker: "child",
        text: "I play.",
        inputMode: "speech",
        clientAttemptId: `close-${sessionId}`,
        recordedAt: NOW,
      },
      {
        sessionId,
        turnNo,
        segment: "talk",
        speaker: "tori",
        text: `Great!\n${MORE_PROMPT.en}`,
        move: talkMoveOf({ kind: "closing_slot" }),
        recordedAt: NOW,
      },
    ]);
    const friendshipOf = async () =>
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
      )[0]?.friendship ?? 0;
    const before = await friendshipOf();
    h.fake.push(turnRule({ tori_en: "Yay!" }, 2));
    await sayLesson(sessionId, "Yes!");
    const [done] = await db
      .select({ status: sessions.status })
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    expect(done?.status).toBe("completed");
    const per = TEST_SETTINGS["talk.friendship_per_talk"].value;
    expect(await friendshipOf()).toBe(before + per);
    await sayLesson(sessionId, "I like soccer.");
    expect(await friendshipOf()).toBe(before + per);
  });
});

describe("아이 행 듣기 사건 요약(C149 — 옛 conversation-session 의 0c664c3 고침을 새 갈래로 옮김, 회화 plan 묶음 12)", () => {
  it("C149 아이 행에는 듣기 사건 요약과 '모름'의 출처(말소리 없음 · 단추)가 저장되고 글은 들지 않는다", async () => {
    const { sessionId } = await sessionAtFirstQuestion();
    const clientListen: ClientListen = {
      br: "iPad Safari 27.0",
      r3d: true,
      listens: [
        { o: "error:no-speech", by: "button", d: 2010, snd: false, tc: "cut" },
        { o: "error:no-speech", by: "button", d: 1800, snd: false, tc: 900 },
      ],
      mf: 0,
    };
    const send = async (
      id: string,
      input: {
        mode: "speech" | "dont_know";
        text?: string;
        nospeech?: boolean;
      },
      listen?: ClientListen,
    ) => {
      h.fake.push(turnRule({ tori_en: "That's okay!" }));
      await runTalkTurnRequest(
        {
          sessionId,
          clientAttemptId: id,
          input,
          hint: { opened: 0, heard: [] },
          ...(listen ? { clientListen: listen } : {}),
        },
        { ...h.deps(), write: () => {}, requestReceivedAt: h.clock.now },
      );
      const [row] = (
        await db
          .select()
          .from(talkTurns)
          .where(eq(talkTurns.sessionId, sessionId))
      ).filter((r) => r.clientAttemptId === id);
      if (!row) throw new Error("아이 행이 없다");
      return row;
    };
    const silent = await send(
      "c149-silent",
      { mode: "dont_know", nospeech: true },
      clientListen,
    );
    expect(silent.text).toBeNull();
    expect(silent.inputMode).toBe("dont_know");
    expect(silent.clientListen).toEqual({ ...clientListen, src: "nospeech" });
    const spoke = await send(
      "c149-spoke",
      { mode: "speech", text: "I play soccer." },
      clientListen,
    );
    expect(spoke.clientListen).toEqual(clientListen);
    expect(JSON.stringify(spoke.clientListen)).not.toContain("soccer");
  });
});

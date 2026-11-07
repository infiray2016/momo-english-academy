// '회화 AI 몫 넓힘' 묶음 2 통합 시험(서버 턴 끝 처리 · 실시간 검사 — CI 에서만 돈다, 이 Mac 에서는 돌리지 않음). 시험용 시드의 회화 1단계
// 단원 1 수업 1 카드(새 꼴 · 장면 여는 질문 칸 있음)로 세션을 넣고 runTalkTurnRequest 를 가짜 Anthropic 으로 부른다. 목록 넷은 저장소의
// seed/lists 를 서버가 그대로 읽으므로 기대 글은 같은 읽기 함수로 꺼낸다(목록 내용은 묶음 3 몫이라 바뀔 수 있다).
// 증명: AC-1 (가) 들리지 않음 판단 칸 무시 · (나)(라) 받침 첫째 상황 줄 · 붙일 줄 그대로 · (마) 인사 끝 실패 대신 상황 줄 · AC-2 (가) 인사 끝 물음표
// 지움 · (나) 인사 턴 2 카드 둘째 인사 질문 · AC-3 (가) 'Child said more' · (라) 지어낸 경험 지움 · AC-5 (나) 장면 여는 질문의 Follow up 줄 ·
// 쉬운 질문 · 힌트 · AC-6 (가) 신호 말(흘림 줄 · talk_turns 원문 · 다시 쓸 차례 밖 · 같은 시도 id 다시 흘림) · AC-8 (마) 요청은 글 블록뿐.
import { and, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cueLinesOfMoves } from "@/core/conversation/cue-line";
import { madeUpHit } from "@/core/conversation/made-up";
import { readTalkMove, talkMoveOf } from "@/core/conversation/move";
import { TalkLessonSchema } from "@/core/seed/schema/lesson";
import { LEVEL_MAX } from "@/core/seed/structure";
import { lessons } from "@/db/schema/content";
import { sessions, talkTurns } from "@/db/schema/learning";
import { settings } from "@/db/schema/operations";
import {
  insertClosingRecord,
  runTalkClosing,
  talkClosingStatus,
} from "@/server/conversation/closing";
import type { TalkLessonLine } from "@/server/conversation/lesson-turn";
import { runTalkTurnRequest } from "@/server/conversation/turn";
import type { Db } from "@/server/db";
import { loadSeed } from "@/server/seed/load";
import {
  seedTalkCueLines,
  seedTalkMadeUpPhrases,
  seedTalkSituationLines,
} from "@/server/seed-lists";
import type { FakeRule } from "../fixtures/ai/fake-anthropic";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import {
  harnessOf,
  LOADED_AT,
  lessonClosingRule,
  lessonTurnRule,
  NOW,
  nonTextBlocksOf,
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
let lessonContent: unknown;
let card: ReturnType<typeof TalkLessonSchema.parse>["card"];

/** 사용자 메시지의 들리지 않음 설명 줄(묶음 1 고정 글 — talk-lesson.ts NOT_HEARD_LINE 앞부분). */
const NOT_HEARD = "Not heard: the microphone did not get the child's voice.";

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
  lessonContent = row.content;
  card = TalkLessonSchema.parse(row.content).card;
});

afterAll(async () => {
  await testDb?.drop();
});

beforeEach(() => {
  h = harnessOf(db);
});

const failRule = (): FakeRule => ({
  when: { bodyIncludes: TURN_MARK },
  reply: { kind: "error", status: 500, body: { type: "error" } },
  times: 2,
});

/** 인사 질문 글들(1~3단계 카드). */
function greetingQuestions() {
  return "questions" in card.greeting ? card.greeting.questions : [];
}

/** 새 꼴 카드 세션(인사 토막) — 첫 인사 질문 행까지 넣는다. */
async function sessionAtGreeting(): Promise<{
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
  const first = greetingQuestions()[0];
  if (!first) throw new Error("인사 질문이 없다");
  await db.insert(talkTurns).values({
    sessionId: session.id,
    turnNo: 1,
    segment: "greeting",
    speaker: "tori",
    text: first.question.en,
    move: talkMoveOf({ kind: "first_question" }),
    recordedAt: NOW,
  });
  return { profileId, sessionId: session.id };
}

/** 인사 · 인사 끝 반응까지 넣고, 대화 첫 질문 행(필수 1 또는 장면 여는 질문)을 둔다. */
async function sessionAtFirstQuestion(
  first: "required" | "scene" = "required",
): Promise<{ profileId: string; sessionId: string }> {
  const { profileId, sessionId } = await sessionAtGreeting();
  const greeting = greetingQuestions();
  await db.insert(talkTurns).values({
    sessionId,
    turnNo: 1,
    segment: "greeting",
    speaker: "child",
    text: greeting[0]?.answerExample ?? "I'm good.",
    inputMode: "speech",
    clientAttemptId: `greet-${sessionId}-0`,
    recordedAt: NOW,
  });
  const required = card.required[0];
  if (!required) throw new Error("필수 질문이 없다");
  const scene = card.sceneOpener;
  if (first === "scene" && !scene)
    throw new Error("견본 카드에 장면 여는 질문이 없다");
  await db.insert(talkTurns).values([
    {
      sessionId,
      turnNo: 2,
      segment: "greeting",
      speaker: "tori",
      text: "Great!",
      move: talkMoveOf({ kind: "ai" }),
      recordedAt: NOW,
    },
    first === "scene" && scene
      ? {
          sessionId,
          turnNo: 3,
          segment: "talk",
          speaker: "tori",
          text: scene.question.en,
          move: talkMoveOf({ kind: "first_question" }),
          recordedAt: NOW,
        }
      : {
          sessionId,
          turnNo: 3,
          segment: "talk",
          speaker: "tori",
          text: required.en,
          move: talkMoveOf({
            kind: "first_question",
            item: { kind: "required", no: required.no },
            words: [...required.targets],
            goals: [...required.goals],
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
async function say(
  sessionId: string,
  input: { mode: "speech" | "dont_know"; text?: string; nospeech?: boolean },
  clientAttemptId = `scope-${++seq}`,
): Promise<TalkLessonLine[]> {
  const lines: TalkLessonLine[] = [];
  await runTalkTurnRequest(
    {
      sessionId,
      clientAttemptId,
      input,
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

async function rowsOf(sessionId: string) {
  return db
    .select()
    .from(talkTurns)
    .where(eq(talkTurns.sessionId, sessionId))
    .orderBy(talkTurns.turnNo);
}

const sentences = (lines: TalkLessonLine[]) =>
  lines.flatMap((l) => (l.t === "s" ? [l.en] : []));
const addsOf = (lines: TalkLessonLine[]) =>
  lines.filter(
    (l): l is Extract<TalkLessonLine, { t: "add" }> => l.t === "add",
  );
const lastBody = () => h.fake.requests.at(-1)?.bodyText ?? "";

describe("'AI 몫 넓힘' 묶음 2 — 상황 차례 · 신호 말(서버)", () => {
  it("AC-1 (가) 들리지 않음 차례는 가짜 응답의 막힘 · 갈래 · 알맞은 응답 · 보인 능력 · 스스로 쓴 단어 · 되풀이를 읽지 않고, 반응은 AI 글 그대로다 · 사용자 메시지에 기술 문제 설명 줄이 든다", async () => {
    const { sessionId } = await sessionAtFirstQuestion();
    const target = card.required[0]?.targets[0] ?? "";
    h.fake.push(
      lessonTurnRule({
        stuck: true,
        child_kind: "not_understood",
        tori_en: "We can do this too!",
        self_used_words: [target],
        goal_suggest: [{ goal: card.goals[0] ?? "", why_ko: "말했어요" }],
        response_fit: true,
        child_topic: true,
        child_asked: true,
        recast: "I can do it.",
      }),
    );
    const lines = await say(sessionId, { mode: "dont_know", nospeech: true });
    expect(lastBody()).toContain(NOT_HEARD);
    expect(sentences(lines)[0]).toBe("We can do this too!");
    const end = lines.at(-1);
    expect(end).toMatchObject({ t: "end", lesson: { flashDontKnow: true } });
    const rows = await rowsOf(sessionId);
    const child = rows.findLast((r) => r.speaker === "child");
    const teacherRow = rows.findLast((r) => r.speaker === "tori");
    expect(child?.selfUsedWords).toEqual([]);
    expect(child?.saidWords).toEqual([]);
    expect(child?.stuckPhrase).toBeNull();
    expect(teacherRow?.recast).toBeNull();
    expect(readTalkMove(teacherRow?.move)).toMatchObject({
      cause: "nospeech",
      streak: 0,
      suggest: { fit: false, topic: false, asked: false, goals: [] },
    });
  });

  it("AC-1 (나)(라) · AC-6 (가) 받침 첫째: 범위 밖 반응은 상황 줄로, AI 신호 말은 지우고 앱 신호 말(긴 꼴)을 뜻 뒤 · 답 소리 앞에 붙이며, 신호 말은 원문 · 다시 쓸 차례에 없고 같은 시도 id 다시 흘림이 같은 줄을 낸다", async () => {
    const { sessionId } = await sessionAtFirstQuestion();
    h.fake.push(
      lessonTurnRule({
        stuck: true,
        tori_en: "Zebrafish! Listen and say it with me!",
      }),
    );
    const lines = await say(
      sessionId,
      { mode: "speech", text: "Huh?" },
      "scope-together",
    );
    const shown = JSON.stringify(lines);
    expect(shown).not.toContain("Zebrafish");
    const situation = seedTalkSituationLines().lines.together.map((l) => l.en);
    expect(situation).toContain(sentences(lines)[0]);
    expect(sentences(lines)).toHaveLength(1);
    // 기대 신호 말은 서버와 같은 셈(cueLinesOfMoves — 이 대화 선생님 행 move 차례, 긴 꼴은 선생님 행 순번으로 돈다)으로 꺼낸다(rev-2 I-1)
    const teacherMoves = (await rowsOf(sessionId))
      .filter((r) => r.speaker === "tori")
      .map((r) => readTalkMove(r.move));
    const cueFile = seedTalkCueLines();
    const cue = cueLinesOfMoves({
      moves: teacherMoves,
      band: "1",
      file: cueFile,
    }).at(-1)?.en;
    // 그 자리의 첫 신호 말이라 긴 꼴 가운데 하나다
    expect(cueFile.together["1"].long.map((l) => l.en)).toContain(cue);
    const cueAt = lines.findIndex((l) => l.t === "add" && l.kind === "cue");
    const soundAt = lines.findIndex((l) => l.t === "sound");
    expect(cueAt).toBeGreaterThanOrEqual(0);
    expect(lines[cueAt]).toMatchObject({ t: "add", kind: "cue", en: cue });
    expect(soundAt).toBeGreaterThan(cueAt);
    // 붙일 줄(카드 답 예시 소리)은 지금과 같다
    expect(lines[soundAt]).toEqual({
      t: "sound",
      kind: "answer",
      say: card.required[0]?.answerExample,
    });
    const teacherRow = (await rowsOf(sessionId)).findLast(
      (r) => r.speaker === "tori",
    );
    expect(teacherRow?.text).not.toContain(cue ?? "?");
    expect(teacherRow?.toriRewrite).not.toContain(cue ?? "?");
    expect(teacherRow?.text).not.toContain("Zebrafish");
    // 같은 시도 id 다시 흘림(AI 없음)
    const before = h.fake.requests.length;
    const replay = await say(
      sessionId,
      { mode: "speech", text: "Huh?" },
      "scope-together",
    );
    expect(h.fake.requests.length).toBe(before);
    expect(replay.filter((l) => l.t === "add" && l.kind === "cue")).toEqual([
      lines[cueAt],
    ]);
  });

  it("AC-1 (마) 인사 끝 턴이 두 번 실패하면 칭찬 대사 대신 인사 끝 상황 줄이고 카드 질문이 붙지 않는다", async () => {
    const { sessionId } = await sessionAtGreeting();
    h.fake.push(failRule());
    const lines = await say(sessionId, { mode: "speech", text: "I am good." });
    expect(lines.at(-1)?.t).toBe("end");
    const teacherRow = (await rowsOf(sessionId)).findLast(
      (r) => r.speaker === "tori",
    );
    const greetingEnd = seedTalkSituationLines().lines.greeting_end.map(
      (l) => l.en,
    );
    expect(greetingEnd).toContain(teacherRow?.text);
    expect(card.praiseLines).not.toContain(teacherRow?.text);
    expect(addsOf(lines)).toEqual([]);
    expect(readTalkMove(teacherRow?.move)).toMatchObject({ kind: "ai" });
  });

  it("AC-2 (가) 인사 끝 차례의 물음표 문장은 지워진다(반응은 남음)", async () => {
    const { sessionId } = await sessionAtGreeting();
    h.fake.push(
      lessonTurnRule({ tori_en: "We can do this too! What do you like?" }),
    );
    const lines = await say(sessionId, { mode: "speech", text: "I am good." });
    expect(sentences(lines)).toEqual(["We can do this too!"]);
    expect(JSON.stringify(lines)).not.toContain("What do you like?");
  });

  it("AC-2 (나) 인사 턴 2 카드의 둘째 인사 AI 질문이 검사에 걸리면(재질문 뒤) 카드 둘째 인사 질문이 붙는다", async () => {
    const first = greetingQuestions()[0];
    if (!first) throw new Error("인사 질문이 없다");
    const second = {
      ...first,
      question: { ...first.question, en: "Do you like this?" },
      answerExample: "Yes, I do.",
    };
    const content = lessonContent as { card: Record<string, unknown> };
    const twoTurns = {
      ...content,
      card: {
        ...content.card,
        greetingTurns: 2,
        greeting: { questions: [first, second] },
      },
    };
    TalkLessonSchema.parse(twoTurns);
    await db
      .update(lessons)
      .set({ content: twoTurns })
      .where(eq(lessons.id, lessonId));
    try {
      const { sessionId } = await sessionAtGreeting();
      // 한 응답만 둔다 — 재질문(C203 (3))은 맞는 규칙이 없어 실패하고 끝 처리가 카드 둘째 인사 질문을 붙인다
      h.fake.push(lessonTurnRule({ tori_en: "I see! Do you like zebrafish?" }));
      const before = h.fake.requests.length;
      const lines = await say(sessionId, {
        mode: "speech",
        text: "I am good.",
      });
      expect(h.fake.requests.length - before).toBe(2);
      expect(JSON.stringify(lines)).not.toContain("zebrafish");
      expect(addsOf(lines).at(-1)).toMatchObject({
        kind: "question",
        en: "Do you like this?",
      });
      const teacherRow = (await rowsOf(sessionId)).findLast(
        (r) => r.speaker === "tori",
      );
      expect(readTalkMove(teacherRow?.move)).toMatchObject({
        kind: "card_slot",
        why: "question_check",
      });
    } finally {
      await db
        .update(lessons)
        .set({ content: lessonContent })
        .where(eq(lessons.id, lessonId));
    }
  });

  it("AC-3 (가) 1~3단계 AI 차례 사용자 메시지에 'Child said more' 가 든다(낱말 셋 이상 · 느낌 낱말 yes, 짧은 답 no)", async () => {
    const { sessionId } = await sessionAtFirstQuestion();
    h.fake.push(lessonTurnRule({ tori_en: "We can do this too!" }));
    await say(sessionId, { mode: "speech", text: "I like it a lot." });
    expect(lastBody()).toContain("Child said more: yes");
    h.fake.push(lessonTurnRule({ tori_en: "We can do this too!" }));
    await say(sessionId, { mode: "speech", text: "Yes." });
    expect(lastBody()).toContain("Child said more: no");
  });

  it("AC-3 (라) 1~3단계 선생님의 지어낸 경험 꼴 문장은 화면 · 읽어 주기 · 원문에 없고 질문은 남는다", async () => {
    const { sessionId } = await sessionAtFirstQuestion();
    h.fake.push(
      lessonTurnRule({
        tori_en: "Yesterday I can do it. Do you like it?",
        next_move: "follow_up",
      }),
    );
    const lines = await say(sessionId, { mode: "speech", text: "I like it." });
    expect(JSON.stringify(lines)).not.toContain("Yesterday");
    expect(sentences(lines)).toContain("Do you like it?");
    const teacherRow = (await rowsOf(sessionId)).findLast(
      (r) => r.speaker === "tori",
    );
    expect(teacherRow?.text).not.toContain("Yesterday");
    expect(teacherRow?.toriRewrite).not.toContain("Yesterday");
  });

  it("AC-5 (나) 장면 여는 질문에 말로 답한 뒤 첫 AI 차례 사용자 메시지에 그 질문과 'Follow up' 줄이 들고, 막히면 둘째에 그 칸의 쉬운 질문이 붙으며 힌트는 그 칸의 것이다", async () => {
    const scene = card.sceneOpener;
    if (!scene) throw new Error("견본 카드에 장면 여는 질문이 없다");
    {
      const { sessionId } = await sessionAtFirstQuestion("scene");
      h.fake.push(
        lessonTurnRule({
          tori_en: "We can do this too!",
          next_move: "follow_up",
        }),
      );
      await say(sessionId, { mode: "speech", text: "Yes, I do." });
      // 사용자 메시지의 줄 꼴(고정부 규칙에도 같은 글이 들어 낱말만 보면 늘 지난다 — rev-5 5절, 본문 JSON 의 줄바꿈은 '\n' 두 글자)
      expect(lastBody()).toContain("\\nFollow up on the child's answer: yes");
      expect(lastBody()).toContain(
        `App question just before (not in the turns above): ${scene.question.en}`,
      );
    }
    {
      const { sessionId } = await sessionAtFirstQuestion("scene");
      h.fake.push(
        lessonTurnRule({ stuck: true, tori_en: "We can do this too!" }),
      );
      const firstStuck = await say(sessionId, { mode: "speech", text: "Huh?" });
      const end = firstStuck.at(-1);
      expect(JSON.stringify(end)).toContain(scene.hintKo);
      h.fake.push(
        lessonTurnRule({ stuck: true, tori_en: "We can do this too!" }),
      );
      const secondStuck = await say(sessionId, {
        mode: "speech",
        text: "Huh?",
      });
      expect(addsOf(secondStuck)).toContainEqual(
        expect.objectContaining({
          kind: "question",
          en: scene.easyQuestion.en,
        }),
      );
    }
  });

  it("AC-3 (라) 1~3단계 끝맺음의 끝인사가 지어낸 경험 꼴이면 끝맺음 상태의 끝인사는 카드 끝인사이고, 걸리지 않은 끝인사는 그대로다(검토 rev-2 M-4)", async () => {
    const farewellOf = async (farewell: string) => {
      const { sessionId } = await sessionAtFirstQuestion();
      h.fake.push(lessonTurnRule({ tori_en: "We can do this too!" }));
      await say(sessionId, { mode: "speech", text: "I like it." });
      expect(
        await insertClosingRecord(db, { sessionId, at: NOW, reason: "stop" }),
      ).toBe(true);
      h.fake.push(lessonClosingRule({ farewell, farewell_ko: "안녕!" }));
      expect(await runTalkClosing(sessionId, h.deps())).toBe(true);
      const status = await talkClosingStatus({ sessionId }, h.deps());
      if (status.state !== "ready")
        throw new Error(`끝맺음 상태 ${status.state}`);
      return status.farewell.en;
    };
    // 대조군: 걸리지 않은 끝인사는 끝맺음 글 그대로다(이 길이 카드 끝인사로 가는 것이 꼴 검사 때문임을 가른다)
    expect(await farewellOf("Bye bye!")).toBe("Bye bye!");
    // 걸림 예는 시드 지어낸 경험 꼴이 실제로 잡는 글이어야 한다(목록 내용은 묶음 3 몫 — 바뀌면 이 단언이 먼저 드러낸다, rev-2 fix 1 N-1)
    const madeUp = "I remember my fish! Bye bye!";
    expect(madeUpHit(madeUp, seedTalkMadeUpPhrases())).not.toBeNull();
    expect(madeUpHit("Bye bye!", seedTalkMadeUpPhrases())).toBeNull();
    expect(await farewellOf(madeUp)).toBe(card.farewell.en);
  });

  it("AC-8 (마) 회화 턴 요청의 시스템 · 메시지는 모두 글 블록이다(소리 · 그림 · 파일 블록 0)", async () => {
    const { sessionId } = await sessionAtFirstQuestion();
    h.fake.push(lessonTurnRule({ tori_en: "We can do this too!" }));
    await say(sessionId, { mode: "speech", text: "I like it." });
    h.fake.push(lessonTurnRule({ tori_en: "We can do this too!" }));
    await say(sessionId, { mode: "dont_know", nospeech: true });
    expect(h.fake.requests.length).toBeGreaterThan(0);
    expect(nonTextBlocksOf(h)).toEqual([]);
  });
});

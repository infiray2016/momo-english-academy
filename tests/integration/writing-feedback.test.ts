// 쓰기 6~12 첫 세션 서버(3.3 쓰기 6~12 · 생각 꺼내기 · 6.2 생각 꺼내기 · 쓰기 첨삭 · 8절 '첨삭 대기' · '안전 분류기 거절' · 3.7 쓰기 6~12 행,
// plan-p11b 파일별 값 3 · 5 · 위험 2 · 4 · 증명 표 AC-4c · AC-8k · AC-8n · 첨삭 흐름 행). 시험 DB 에 시험용 시드(작은 틀, 규격 12단계)를
// 넣고 견본 빌더 쓰기 6단계 수업(자유 작문)을 lessons 행으로 더한 뒤 쓰기 6단계에서 시작한 집으로 본다. AI 는 P9a 가짜 Anthropic
// (fetch 자리), 응답 뒤 할 일(after)은 모아 두었다가 시험이 돌린다. 설계 숫자는 시험용 설정(TEST_SETTINGS)에서 읽는다.
import { randomUUID } from "node:crypto";
import { and, eq, isNull, max } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { THINKOUT_LAST_TURN_NOTE } from "@/core/ai/calls/thinkout";
import { AVATARS, TOPIC_BUNDLES } from "@/core/profile/start";
import { LEVEL_MAX, PLACEHOLDER_NAME } from "@/core/seed/structure";
import { rubricScore } from "@/core/writing/feedback";
import { lessons } from "@/db/schema/content";
import { attempts, profiles, sessions } from "@/db/schema/learning";
import {
  aiCalls,
  parentAlerts,
  parentAuth,
  settings,
} from "@/db/schema/operations";
import { SEED_REVISION_TABLES } from "@/db/schema/seed-revision";
import { createAnthropicClient } from "@/server/ai/client";
import type { Db } from "@/server/db";
import { readHouseholdProfile, saveFirstRun } from "@/server/profile";
import { loadSeed } from "@/server/seed/load";
import { SeedListError } from "@/server/seed-lists";
import {
  loadSessionView,
  type SessionView,
  saveSessionAttempts,
  startLessonSession,
} from "@/server/session";
import {
  type CompositionDeps,
  feedbackStatus,
  PENDING_FEEDBACK_PER_ENTRY,
  retryPendingFeedback,
  runFeedback,
  startLessonAfterFeedback,
  submitDraft,
  submitRewrite,
  thinkoutStep,
} from "@/server/writing";
import {
  createFakeAnthropic,
  type FakeAnthropic,
  type FakeReply,
  type FakeRule,
  messageBody,
} from "../fixtures/ai/fake-anthropic";
import { SAMPLE_FORBIDDEN } from "../fixtures/ai/sample-inputs";
import {
  defaultSettings,
  referenceSet,
  writingLesson,
} from "../fixtures/seed/builders";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import { TEST_SETTINGS } from "../fixtures/settings";
import { createTestDatabase, seedSettings, type TestDatabase } from "./test-db";

const LOADED_AT = new Date("2026-10-17T10:00:00+09:00");
const SAVED_AT = new Date("2026-10-17T11:00:00+09:00");
const NOW = new Date("2026-10-17T20:00:00+09:00");
const THROUGH_KEY = "seed.complete_through_level";
/** 이 시험 집의 영어 이름(첫 실행 저장 값). */
const ENGLISH_NAME = "Momo";
const MAX_TURNS = TEST_SETTINGS["writing.thinkout_max_turns"].value;
const MAX_FAILURES = TEST_SETTINGS["ai.feedback_max_attempts"].value;
const THINKOUT_MODEL = TEST_SETTINGS["ai.model.thinkout"].value;
const FEEDBACK_MODEL = TEST_SETTINGS["ai.model.writing_feedback"].value;
/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;
/** 같은 초고를 함께 부를 때 첫 응답을 늦추는 시간(기술 값). */
const SLOW_FEEDBACK_MS = 300;

const sample = writingLesson(referenceSet(defaultSettings()), 6);
if (sample.lesson.content.shape !== "composition") throw new Error("견본 꼴");
const DRAFT = "I have a dog. It is very small. We play every day. I love it.";
const RUBRIC = { task: 4, grammar: 3, vocabulary: 3 };

let testDb: TestDatabase;
let db: Db;
const sessionDeps = () => ({ db, now: () => NOW, homophones: () => [] });

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
    .where(and(eq(settings.key, THROUGH_KEY), isNull(settings.profileId)));
  let revision = 0;
  for (const table of SEED_REVISION_TABLES) {
    const [row] = await db.select({ r: max(table.revision) }).from(table);
    revision = Math.max(revision, Number(row?.r ?? 0));
  }
  // 같은 단원 배정 수업 셋(중단 · 되살림 · 밀린 첨삭이 다른 칸을 쓴다)
  for (const lessonNo of [1, 2, 3])
    await db.insert(lessons).values({
      area: "writing",
      level: sample.level,
      unit: sample.unit,
      kind: "assigned",
      lessonNo,
      topicVariant: 1,
      listTitle: sample.lesson.title,
      content: {
        ...sample.lesson,
        kind: "assigned",
        lessonNo,
        variant: 1,
        revision,
        correction: 0,
      },
      newWords: [...sample.lesson.newWords],
      unitWords: [...sample.lesson.unitWords],
      generation: sample.lesson.generation,
      revision,
      correction: 0,
    });
});
afterAll(async () => {
  await testDb.drop();
});
beforeEach(async () => {
  await db.delete(profiles);
  await db.delete(parentAuth);
  await db.delete(parentAlerts);
  const saved = await saveFirstRun(
    {
      pin: "246813",
      displayName: "모모",
      englishName: ENGLISH_NAME,
      avatar: AVATARS[0].id,
      topicBundle: TOPIC_BUNDLES[0].id,
      alphabetUnknown: false,
      startLevels: { writing: sample.level },
      mic: { result: "not_checked" },
    },
    { db, now: () => SAVED_AT },
  );
  if (!saved.ok) throw new Error("첫 실행 저장 실패");
});
afterEach(async () => {
  await db.delete(aiCalls);
});

// ── 가짜 응답 ──

/** 질문 · 보기 · 요약에 이름 자리 표시가 든 생각 꺼내기 응답(코드 검토 review-p11-6-code M-1). */
function namedThinkoutReply(done: boolean): FakeReply {
  return {
    kind: "message",
    body: messageBody({
      model: THINKOUT_MODEL,
      json: done
        ? {
            question: "",
            options: [],
            done: true,
            summary: `${PLACEHOLDER_NAME}는 강아지와 노는 하루를 쓰고 싶어요.`,
            words: ["dog", "play", "day", "small"],
            starters: [`${PLACEHOLDER_NAME} has`, "Every day"],
          }
        : {
            question: `${PLACEHOLDER_NAME}, 무엇을 쓰고 싶어요?`,
            options: [`${PLACEHOLDER_NAME}의 강아지`, "공원", "학교"],
            done: false,
            summary: "",
            words: [],
            starters: [],
          },
    }),
  };
}

function thinkoutReply(done: boolean): FakeReply {
  return {
    kind: "message",
    body: messageBody({
      model: THINKOUT_MODEL,
      json: done
        ? {
            question: "",
            options: [],
            done: true,
            summary: "강아지와 노는 하루를 쓰고 싶어요.",
            words: ["dog", "play", "day", "small"],
            starters: ["I have", "Every day"],
          }
        : {
            question: "무엇을 쓰고 싶어요?",
            options: ["강아지", "공원", "학교"],
            done: false,
            summary: "",
            words: [],
            starters: [],
          },
    }),
  };
}

function feedbackReply(delayMs?: number): FakeReply {
  return {
    kind: "message",
    body: messageBody({
      model: FEEDBACK_MODEL,
      json: {
        praise: "강아지와 노는 모습을 잘 썼어요.",
        corrections: [
          {
            original: "I love it.",
            corrected: "I love my dog.",
            reason: "무엇을 좋아하는지 분명히 써요.",
          },
        ],
        modelAnswer: "I have a small dog. We play every day.",
        rubric: RUBRIC,
      },
    }),
    ...(delayMs === undefined ? {} : { delayMs }),
  };
}

const refusal: FakeReply = {
  kind: "message",
  body: messageBody({
    model: FEEDBACK_MODEL,
    json: {},
    stopReason: "refusal",
    stopDetails: { category: null },
  }),
};
const serverError: FakeReply = {
  kind: "error",
  status: 500,
  body: { type: "error", error: { type: "api_error", message: "x" } },
};

function harness(rules: FakeRule[]): {
  fake: FakeAnthropic;
  deps: CompositionDeps;
  later: () => Promise<void>;
} {
  const fake = createFakeAnthropic(rules);
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "test-key" },
    fetch: fake.fetch,
  });
  const tasks: (() => Promise<void>)[] = [];
  return {
    fake,
    deps: {
      db,
      now: () => NOW,
      clock: () => NOW,
      client: () => client,
      lists: () => ({ forbidden: SAMPLE_FORBIDDEN }),
      schedule: (task) => tasks.push(task),
    },
    // 응답 뒤 할 일을 차례로 돌린다(after 자리)
    later: async () => {
      while (tasks.length > 0) await tasks.shift()?.();
    },
  };
}

const purposeOf = (body: unknown) =>
  (body as { output_config?: { format?: { schema?: { title?: string } } } })
    ?.output_config?.format?.schema?.title;
const requestsOf = (fake: FakeAnthropic, purpose: string) =>
  fake.requests.filter((r) => purposeOf(r.body) === purpose);

const final = (kind: string, content: Record<string, unknown> = {}) => ({
  v: 1,
  kind,
  step: "final",
  ...content,
});

async function lessonRow(lessonNo = 1) {
  const [row] = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "writing"),
        eq(lessons.level, sample.level),
        eq(lessons.lessonNo, lessonNo),
      ),
    );
  if (!row) throw new Error("견본 수업 없음");
  return row;
}

/** 쓰기 6단계 첫 세션을 열고 미리보기 · 과제 끝 시도를 넣는다. 화면 자료 · 활동 번호를 돌려준다. */
async function openComposition(lessonNo = 1) {
  const started = await startLessonSession(
    { lessonId: (await lessonRow(lessonNo)).id, confirmAbort: true },
    sessionDeps(),
  );
  if (!started.ok) throw new Error(`세션이 열려야 한다: ${started.reason}`);
  const view = await loadSessionView(
    { sessionId: started.sessionId },
    sessionDeps(),
  );
  if (view?.area !== "writing" || !view.composition)
    throw new Error("쓰기 6~12 화면 자료 없음");
  const no = (kind: string) =>
    view.activities.findIndex((a) => a.kind === kind) + 1;
  const saved = await saveSessionAttempts(
    [
      { no: no("preview"), input: final("preview", { shownWords: [] }) },
      { no: no("writing-task"), input: final("writing-task") },
    ].map(({ no: activityNo, input }) => ({
      clientAttemptId: randomUUID(),
      sessionId: started.sessionId,
      activityNo,
      input,
    })),
    sessionDeps(),
  );
  if (!saved.ok || saved.rejected.length > 0) throw new Error("시도 저장 실패");
  return {
    view: view as SessionView & { area: "writing" },
    sessionId: started.sessionId,
    thinkoutNo: no("thinkout"),
    draftNo: no("draft"),
  };
}

/** 생각 꺼내기를 한 턴에 끝내고(가짜가 끝 응답) 초고를 낸다. 초고 시도 id 를 돌려준다. */
async function submitted(deps: CompositionDeps, lessonNo = 1) {
  const opened = await openComposition(lessonNo);
  const done = await thinkoutStep(
    {
      sessionId: opened.sessionId,
      clientAttemptId: randomUUID(),
      activityNo: opened.thinkoutNo,
      answer: null,
    },
    deps,
  );
  expect(done).toMatchObject({ ok: true, done: true });
  const out = await submitDraft(
    {
      sessionId: opened.sessionId,
      clientAttemptId: randomUUID(),
      activityNo: opened.draftNo,
      text: DRAFT,
    },
    deps,
  );
  expect(out).toEqual({
    ok: true,
    resultPath: `/result/${opened.sessionId}`,
  });
  // 초고 끝 시도(첨삭 대기) — 같은 활동에 되살린 초고 진행 시도가 함께 있을 수 있다(AC-2e 되살림, CI 16차)
  const [draft] = await db
    .select()
    .from(attempts)
    .where(
      and(
        eq(attempts.sessionId, opened.sessionId),
        eq(attempts.activityNo, opened.draftNo),
        eq(attempts.status, "awaiting_feedback"),
      ),
    );
  if (!draft) throw new Error("초고 시도 없음");
  return { ...opened, attemptId: draft.id };
}

async function attemptRow(id: string) {
  const [row] = await db.select().from(attempts).where(eq(attempts.id, id));
  return row;
}
async function sessionRow(id: string) {
  const [row] = await db.select().from(sessions).where(eq(sessions.id, id));
  return row;
}
/** 그 수업의 중단된 첫 세션 하나(쓰던 초고 진행 시도가 있음)를 바로 넣는다. */
async function abortedDraft(lessonNo: number, text: string) {
  const profile = await readHouseholdProfile({ db });
  const row = await lessonRow(lessonNo);
  if (!profile) throw new Error("프로필 없음");
  const [s] = await db
    .insert(sessions)
    .values({
      profileId: profile.id,
      area: "writing",
      level: row.level,
      unit: row.unit,
      lessonId: row.id,
      kind: "regular",
      status: "aborted",
      // 다른 첫 세션보다 앞서 시작한 중단 세션
      startedAt: new Date(NOW.getTime() - MS_PER_SECOND),
      seedRevision: row.revision,
      seedCorrection: row.correction,
      writingPart: "draft",
    })
    .returning({ id: sessions.id });
  if (!s) throw new Error("세션을 넣지 못했다");
  await db.insert(attempts).values({
    sessionId: s.id,
    clientAttemptId: randomUUID(),
    activityNo: 4,
    input: { v: 1, kind: "draft", step: "progress", text },
    attemptedAt: NOW,
    status: "done",
  });
}

async function feedbackAlerts() {
  return db
    .select()
    .from(parentAlerts)
    .where(eq(parentAlerts.kind, "feedback_failed"));
}

describe("쓰기 6~12 첫 세션", () => {
  it("AC-4c 초고 제출 서버 액션은 첨삭을 기다리지 않고 돌아오고 첨삭은 응답 뒤에 불려 첫 세션 점수를 채점표 평균 ÷ 4 로 채운다", async () => {
    const { fake, deps, later } = harness([
      { when: { purpose: "thinkout" }, reply: thinkoutReply(true) },
      { when: { purpose: "writing_feedback" }, reply: feedbackReply() },
    ]);
    const { sessionId, attemptId } = await submitted(deps);
    // 돌아온 때: 첨삭은 아직 부르지 않았고 첫 세션은 끝났으며 점수는 비고 초고는 첨삭 대기
    expect(requestsOf(fake, "writing_feedback")).toHaveLength(0);
    expect(await sessionRow(sessionId)).toMatchObject({
      status: "completed",
      writingPart: "draft",
      score: null,
      learningDay: "2026-10-17",
    });
    expect(await attemptRow(attemptId)).toMatchObject({
      status: "awaiting_feedback",
      score: null,
      aiFeedback: { state: "pending", failures: 0, refusals: 0 },
      input: { kind: "draft", step: "final", text: DRAFT },
    });
    expect(await feedbackStatus({ sessionId }, { db })).toMatchObject({
      ok: true,
      state: "pending",
    });
    // 응답 뒤: 첨삭 한 번 → 시도 done · 점수 = 채점표 평균 ÷ 4, 첫 세션 점수도 같다
    await later();
    expect(requestsOf(fake, "writing_feedback")).toHaveLength(1);
    const score = rubricScore(RUBRIC);
    expect(await attemptRow(attemptId)).toMatchObject({
      status: "done",
      score,
      aiFeedback: { state: "ready" },
    });
    expect((await sessionRow(sessionId))?.score).toBe(score);
    expect(await feedbackStatus({ sessionId }, { db })).toMatchObject({
      ok: true,
      state: "ready",
    });
  });

  it("AC-4c 생각 꺼내기는 writing.thinkout_max_turns 턴째에 끝내라는 요청을 보내고 그 뒤로는 부르지 않는다", async () => {
    const { fake, deps } = harness([
      {
        when: { purpose: "thinkout" },
        reply: thinkoutReply(false),
        times: MAX_TURNS - 1,
      },
      { when: { purpose: "thinkout" }, reply: thinkoutReply(true) },
    ]);
    const { sessionId, thinkoutNo } = await openComposition();
    const step = (answer: string | null) =>
      thinkoutStep(
        {
          sessionId,
          clientAttemptId: randomUUID(),
          activityNo: thinkoutNo,
          answer,
        },
        deps,
      );
    // 첫 턴은 답 없이, 그 뒤는 답과 함께 — 마지막 턴 전에는 질문 · 보기 셋
    for (let turn = 1; turn < MAX_TURNS; turn += 1) {
      expect(await step(turn === 1 ? null : "강아지")).toMatchObject({
        ok: true,
        done: false,
        turn,
        question: "무엇을 쓰고 싶어요?",
      });
    }
    expect(await step("공원")).toMatchObject({ ok: true, done: true });
    const sent = requestsOf(fake, "thinkout");
    expect(sent).toHaveLength(MAX_TURNS);
    // 마지막 턴에만 끝내라는 말
    for (const [i, r] of sent.entries()) {
      if (i === MAX_TURNS - 1)
        expect(r.bodyText).toContain(THINKOUT_LAST_TURN_NOTE);
      else expect(r.bodyText).not.toContain(THINKOUT_LAST_TURN_NOTE);
    }
    // 끝난 뒤로는 부르지 않고 끝 결과를 그대로
    expect(await step("학교")).toMatchObject({ ok: true, done: true });
    expect(requestsOf(fake, "thinkout")).toHaveLength(MAX_TURNS);
    // 화면 자료: 끝난 생각 꺼내기(요약 · 낱말 · 틀)
    const view = await loadSessionView({ sessionId }, sessionDeps());
    expect(
      view?.area === "writing" && view.composition?.thinkout,
    ).toMatchObject({
      state: "done",
      summary: "강아지와 노는 하루를 쓰고 싶어요.",
    });
  });

  it("생각 꺼내기: AI 글의 {NAME} 은 턴 결과 · 다시 연 화면 자료에서 영어 이름으로 채우고 저장은 가린 글 그대로다", async () => {
    const { deps } = harness([
      {
        when: { purpose: "thinkout" },
        reply: namedThinkoutReply(false),
        times: 1,
      },
      { when: { purpose: "thinkout" }, reply: namedThinkoutReply(true) },
    ]);
    const { sessionId, thinkoutNo } = await openComposition();
    const step = (answer: string | null) =>
      thinkoutStep(
        {
          sessionId,
          clientAttemptId: randomUUID(),
          activityNo: thinkoutNo,
          answer,
        },
        deps,
      );
    const first = await step(null);
    expect(first).toMatchObject({
      ok: true,
      done: false,
      question: `${ENGLISH_NAME}, 무엇을 쓰고 싶어요?`,
      options: [`${ENGLISH_NAME}의 강아지`, "공원", "학교"],
    });
    const reopened = async () => {
      const view = await loadSessionView({ sessionId }, sessionDeps());
      if (view?.area !== "writing" || !view.composition)
        throw new Error("화면 자료 없음");
      return view.composition;
    };
    expect((await reopened()).thinkoutTurn).toMatchObject({
      question: `${ENGLISH_NAME}, 무엇을 쓰고 싶어요?`,
      options: [`${ENGLISH_NAME}의 강아지`, "공원", "학교"],
    });
    const done = await step("강아지");
    expect(done).toMatchObject({
      ok: true,
      done: true,
      summary: `${ENGLISH_NAME}는 강아지와 노는 하루를 쓰고 싶어요.`,
      starters: [`${ENGLISH_NAME} has`, "Every day"],
    });
    const view = await reopened();
    expect(view.thinkout).toMatchObject({
      state: "done",
      summary: `${ENGLISH_NAME}는 강아지와 노는 하루를 쓰고 싶어요.`,
    });
    for (const shown of [first, done, view])
      expect(JSON.stringify(shown)).not.toContain(PLACEHOLDER_NAME);
    // 저장은 가린 글 그대로(6.1)
    const stored = await db
      .select({ input: attempts.input })
      .from(attempts)
      .where(
        and(
          eq(attempts.sessionId, sessionId),
          eq(attempts.activityNo, thinkoutNo),
        ),
      );
    expect(stored).toHaveLength(2);
    for (const row of stored) {
      expect(JSON.stringify(row.input)).toContain(PLACEHOLDER_NAME);
      expect(JSON.stringify(row.input)).not.toContain(ENGLISH_NAME);
    }
  });

  it("AC-8k 같은 초고의 첨삭이 거절로 두 번 끝나면 더 부르지 않고 attempts 가 '첨삭 못 함'이 되며 부모 알림이 생기고 그 수업을 다시 고르면 빈 새 초고 화면이 열린다", async () => {
    const { fake, deps } = harness([
      { when: { purpose: "thinkout" }, reply: thinkoutReply(true) },
      { when: { purpose: "writing_feedback" }, reply: refusal },
    ]);
    // 앞서 중단된 첫 세션(쓰던 초고가 있음) — 되살림이 있어도 '첨삭 못 함' 뒤에는 되살리지 않는다(단언이 참인 까닭이 되살림 규칙이게)
    await abortedDraft(1, "An old draft I stopped.");
    const { attemptId, sessionId } = await submitted(deps);
    expect(await runFeedback({ attemptId }, deps)).toBe(true);
    expect(await attemptRow(attemptId)).toMatchObject({
      status: "awaiting_feedback",
      aiFeedback: { state: "pending", failures: 0, refusals: 1 },
    });
    expect(await runFeedback({ attemptId }, deps)).toBe(true);
    expect(await attemptRow(attemptId)).toMatchObject({
      status: "feedback_failed",
      aiFeedback: { state: "failed", reason: "refusal", refusals: 2 },
    });
    expect(await feedbackAlerts()).toHaveLength(1);
    // 더 부르지 않는다
    expect(await runFeedback({ attemptId }, deps)).toBe(false);
    expect(requestsOf(fake, "writing_feedback")).toHaveLength(2);
    expect(await feedbackStatus({ sessionId }, { db })).toMatchObject({
      ok: true,
      state: "failed",
    });
    // 그 수업을 다시 고르면 새 첫 세션 — 초고 글 · 생각 꺼내기가 비어 있다
    const again = await startLessonSession(
      { lessonId: (await lessonRow()).id, confirmAbort: false },
      sessionDeps(),
    );
    if (!again.ok) throw new Error(`다시 열려야 한다: ${again.reason}`);
    expect(again.sessionId).not.toBe(sessionId);
    const view = await loadSessionView(
      { sessionId: again.sessionId },
      sessionDeps(),
    );
    expect(view?.area === "writing" && view.composition).toMatchObject({
      draftText: null,
      thinkout: null,
    });
  });

  it("AC-2e 중단된 첫 세션의 마지막 초고 글이 같은 수업의 새 첫 세션 화면 자료에 채워지고 중단 뒤 늦게 온 초고 시도도 받는다", async () => {
    const { fake, deps } = harness([
      { when: { purpose: "thinkout" }, reply: thinkoutReply(true) },
    ]);
    // 수업 1: 생각 꺼내기를 끝내고 초고를 쓰다가(자동 저장) 수업 2 를 골라 중단
    const one = await openComposition(1);
    await thinkoutStep(
      {
        sessionId: one.sessionId,
        clientAttemptId: randomUUID(),
        activityNo: one.thinkoutNo,
        answer: null,
      },
      deps,
    );
    const progress = (text: string) => ({
      clientAttemptId: randomUUID(),
      sessionId: one.sessionId,
      activityNo: one.draftNo,
      input: { v: 1, kind: "draft", step: "progress", text },
    });
    await saveSessionAttempts([progress("I have a dog.")], sessionDeps());
    await openComposition(2);
    expect((await sessionRow(one.sessionId))?.status).toBe("aborted");
    // 중단 뒤 늦게 온 초고 진행 시도도 받는다(그 밖 종류는 받은 것으로 치고 버림)
    const late = progress("I have a dog. We play.");
    const ignored = {
      clientAttemptId: randomUUID(),
      sessionId: one.sessionId,
      activityNo: 1,
      input: final("preview", { shownWords: [] }),
    };
    expect(
      await saveSessionAttempts([late, ignored], sessionDeps()),
    ).toMatchObject({ ok: true, rejected: [] });
    const kept = await db
      .select({ id: attempts.clientAttemptId })
      .from(attempts)
      .where(eq(attempts.sessionId, one.sessionId));
    expect(kept.map((k) => k.id)).toContain(late.clientAttemptId);
    expect(kept.map((k) => k.id)).not.toContain(ignored.clientAttemptId);
    // 수업 1 을 다시 열면 마지막 초고 글 · 생각 꺼내기(되살림 — AI 다시 안 부름)
    const before = requestsOf(fake, "thinkout").length;
    const again = await openComposition(1);
    expect(again.sessionId).not.toBe(one.sessionId);
    expect(again.view.composition).toMatchObject({
      draftText: "I have a dog. We play.",
      thinkout: { state: "done", summary: "강아지와 노는 하루를 쓰고 싶어요." },
    });
    const step = await thinkoutStep(
      {
        sessionId: again.sessionId,
        clientAttemptId: randomUUID(),
        activityNo: again.thinkoutNo,
        answer: null,
      },
      deps,
    );
    expect(step).toMatchObject({ ok: true, done: true });
    expect(requestsOf(fake, "thinkout")).toHaveLength(before);
  });

  it("둘째 세션: 첨삭이 대기면 시작할 때 한 번 더 부르고 그래도 없으면 대기를 돌려준다", async () => {
    const failing = harness([
      { when: { purpose: "thinkout" }, reply: thinkoutReply(true) },
      { when: { purpose: "writing_feedback" }, reply: serverError },
    ]);
    const { sessionId } = await submitted(failing.deps);
    const lessonId = (await lessonRow(1)).id;
    // 대기: 한 번 더 부르고(실패) 그래도 없으면 feedback_pending
    expect(
      await startLessonAfterFeedback(
        { lessonId, confirmAbort: false },
        { ...failing.deps, now: () => NOW },
      ),
    ).toMatchObject({ ok: false, reason: "feedback_pending" });
    expect(requestsOf(failing.fake, "writing_feedback")).toHaveLength(1);
    // 첨삭이 오면(한 번 더 부름이 성공) 둘째 세션 — 첫 세션의 수업 행 · 판 그대로, 미리보기 없이 칭찬 → 교정 → 고쳐 쓰기 → 모범 답안 → 말하기
    const ok = harness([
      { when: { purpose: "writing_feedback" }, reply: feedbackReply() },
    ]);
    const started = await startLessonAfterFeedback(
      { lessonId, confirmAbort: false },
      { ...ok.deps, now: () => NOW },
    );
    if (!started.ok)
      throw new Error(`둘째 세션이 열려야 한다: ${started.reason}`);
    const second = await sessionRow(started.sessionId);
    const first = await sessionRow(sessionId);
    expect(second).toMatchObject({
      writingPart: "rewrite",
      lessonId: first?.lessonId,
      seedRevision: first?.seedRevision,
      status: "in_progress",
    });
    const view = await loadSessionView(
      { sessionId: started.sessionId },
      sessionDeps(),
    );
    if (view?.area !== "writing" || !view.rewrite)
      throw new Error("둘째 세션 자료 없음");
    expect(view.activities.map((a) => a.kind)).toEqual([
      "feedback-praise",
      "feedback-correction",
      "rewrite",
      "model-answer",
      "own-speak",
    ]);
    // 모범 답안은 고쳐 쓰기를 내기 전에는 화면 자료에 없다(AC-4c · 위험 9)
    expect(view.rewrite).toMatchObject({
      praise: "강아지와 노는 모습을 잘 썼어요.",
      draftText: DRAFT,
      rewriteText: null,
      modelAnswer: null,
    });
    const rewriteNo =
      view.activities.findIndex((a) => a.kind === "rewrite") + 1;
    const out = await submitRewrite(
      {
        sessionId: started.sessionId,
        clientAttemptId: randomUUID(),
        activityNo: rewriteNo,
        text: "I have a dog. It is very small. I love my dog.",
      },
      ok.deps,
    );
    expect(out).toEqual({
      ok: true,
      modelAnswer: "I have a small dog. We play every day.",
    });
    const after = await loadSessionView(
      { sessionId: started.sessionId },
      sessionDeps(),
    );
    expect(after?.area === "writing" && after.rewrite?.modelAnswer).toBe(
      "I have a small dog. We play every day.",
    );
  });

  it("둘째 세션: 첨삭 글의 {NAME} 은 화면 자료 · 고쳐 쓰기 응답에서 영어 이름으로 채우고 저장은 가린 글 그대로다", async () => {
    // 코드 검토 review-p11-7-code M-3 — 칭찬 · 교정 원문 · 수정 · 이유 · 모범 답안 다섯 칸
    const named: FakeReply = {
      kind: "message",
      body: messageBody({
        model: FEEDBACK_MODEL,
        json: {
          praise: `${PLACEHOLDER_NAME}, 하루 일을 잘 썼어요.`,
          corrections: [
            {
              original: `I play with ${PLACEHOLDER_NAME}s dog.`,
              corrected: `I play with ${PLACEHOLDER_NAME}'s dog.`,
              reason: `${PLACEHOLDER_NAME}의 것이면 's 를 붙여요.`,
            },
          ],
          modelAnswer: `${PLACEHOLDER_NAME} has a small dog.`,
          rubric: RUBRIC,
        },
      }),
    };
    const { deps, later } = harness([
      { when: { purpose: "thinkout" }, reply: thinkoutReply(true) },
      { when: { purpose: "writing_feedback" }, reply: named },
    ]);
    const { attemptId } = await submitted(deps);
    await later();
    const started = await startLessonAfterFeedback(
      { lessonId: (await lessonRow(1)).id, confirmAbort: false },
      { ...deps, now: () => NOW },
    );
    if (!started.ok)
      throw new Error(`둘째 세션이 열려야 한다: ${started.reason}`);
    const view = await loadSessionView(
      { sessionId: started.sessionId },
      sessionDeps(),
    );
    if (view?.area !== "writing" || !view.rewrite)
      throw new Error("둘째 세션 자료 없음");
    expect(view.rewrite).toMatchObject({
      praise: `${ENGLISH_NAME}, 하루 일을 잘 썼어요.`,
      corrections: [
        {
          original: `I play with ${ENGLISH_NAME}s dog.`,
          corrected: `I play with ${ENGLISH_NAME}'s dog.`,
          reason: `${ENGLISH_NAME}의 것이면 's 를 붙여요.`,
        },
      ],
    });
    expect(JSON.stringify(view.rewrite)).not.toContain(PLACEHOLDER_NAME);
    const out = await submitRewrite(
      {
        sessionId: started.sessionId,
        clientAttemptId: randomUUID(),
        activityNo: view.activities.findIndex((a) => a.kind === "rewrite") + 1,
        text: "I play with my dog.",
      },
      deps,
    );
    expect(out).toEqual({
      ok: true,
      modelAnswer: `${ENGLISH_NAME} has a small dog.`,
    });
    // 저장은 가린 글 그대로(6.1)
    const stored = JSON.stringify((await attemptRow(attemptId))?.aiFeedback);
    expect(stored).toContain(PLACEHOLDER_NAME);
    expect(stored).not.toContain(ENGLISH_NAME);
  });

  it("첨삭: 앱 진입마다 밀린 첨삭을 오래된 것부터 많아야 둘 부른다", async () => {
    const waiting = harness([
      { when: { purpose: "thinkout" }, reply: thinkoutReply(true) },
    ]);
    // 낸 시각을 1초씩 늦춰(오래된 차례가 갈리게) 수업 셋에 초고를 낸다
    const drafts: string[] = [];
    for (const lessonNo of [1, 2, 3]) {
      const at = () => new Date(NOW.getTime() + lessonNo * MS_PER_SECOND);
      drafts.push(
        (await submitted({ ...waiting.deps, now: at, clock: at }, lessonNo))
          .attemptId,
      );
    }
    const { fake, deps } = harness([
      { when: { purpose: "writing_feedback" }, reply: feedbackReply() },
    ]);
    const profile = await readHouseholdProfile({ db });
    if (!profile) throw new Error("프로필 없음");
    expect(await retryPendingFeedback({ profileId: profile.id }, deps)).toBe(
      PENDING_FEEDBACK_PER_ENTRY,
    );
    expect(requestsOf(fake, "writing_feedback")).toHaveLength(
      PENDING_FEEDBACK_PER_ENTRY,
    );
    const statuses = await Promise.all(
      drafts.map(async (id) => (await attemptRow(id))?.status),
    );
    expect(statuses).toEqual([
      ...Array.from({ length: PENDING_FEEDBACK_PER_ENTRY }, () => "done"),
      "awaiting_feedback",
    ]);
  });

  it("AC-8n 거절이 아닌 까닭으로 같은 초고의 첨삭이 ai.feedback_max_attempts 번 실패하면 '첨삭 못 함'이 되고 부모 알림이 생기며 안전 상한 · 설정 문제는 실패 수에 들지 않는다", async () => {
    const { fake, deps } = harness([
      { when: { purpose: "thinkout" }, reply: thinkoutReply(true) },
      { when: { purpose: "writing_feedback" }, reply: serverError },
    ]);
    const { attemptId } = await submitted(deps);
    const profile = await readHouseholdProfile({ db });
    if (!profile) throw new Error("프로필 없음");
    const counts = async () =>
      (await attemptRow(attemptId))?.aiFeedback as {
        state: string;
        failures?: number;
      };
    expect(await runFeedback({ attemptId }, deps)).toBe(true);
    expect(await counts()).toMatchObject({ state: "pending", failures: 1 });
    // 안전 상한: 그 학습일 호출 수(지금 1)에 닿게 프로필 상한을 1 로 — 부르지 않고 셈 그대로
    await seedSettings(db, [
      {
        key: "ai.safety_daily_calls",
        scope: "profile",
        value: 1,
        profileId: profile.id,
      },
    ]);
    expect(await runFeedback({ attemptId }, deps)).toBe(true);
    expect(await counts()).toMatchObject({ state: "pending", failures: 1 });
    await db
      .delete(settings)
      .where(
        and(
          eq(settings.key, "ai.safety_daily_calls"),
          eq(settings.profileId, profile.id),
        ),
      );
    // 설정 문제(금지어 목록 없음): 부르지 않고 셈 그대로
    expect(
      await runFeedback(
        { attemptId },
        {
          ...deps,
          lists: () => {
            throw new SeedListError("forbidden", "missing");
          },
        },
      ),
    ).toBe(true);
    expect(await counts()).toMatchObject({ state: "pending", failures: 1 });
    expect(requestsOf(fake, "writing_feedback")).toHaveLength(1);
    // 나머지 실패로 상한에 닿으면 못 함 · 알림 하나
    for (let i = 2; i <= MAX_FAILURES; i += 1)
      expect(await runFeedback({ attemptId }, deps)).toBe(true);
    expect(await attemptRow(attemptId)).toMatchObject({
      status: "feedback_failed",
      aiFeedback: {
        state: "failed",
        reason: "failures",
        failures: MAX_FAILURES,
      },
    });
    expect(requestsOf(fake, "writing_feedback")).toHaveLength(MAX_FAILURES);
    expect(await feedbackAlerts()).toHaveLength(1);
    expect(await runFeedback({ attemptId }, deps)).toBe(false);
  });

  it("첨삭: 같은 초고를 두 요청이 함께 부르면 호출은 하나다", async () => {
    const { fake, deps } = harness([
      { when: { purpose: "thinkout" }, reply: thinkoutReply(true) },
      {
        when: { purpose: "writing_feedback" },
        reply: feedbackReply(SLOW_FEEDBACK_MS),
      },
    ]);
    const { attemptId } = await submitted(deps);
    const both = await Promise.all([
      runFeedback({ attemptId }, deps),
      runFeedback({ attemptId }, deps),
    ]);
    expect(both.filter(Boolean)).toHaveLength(1);
    expect(requestsOf(fake, "writing_feedback")).toHaveLength(1);
    expect(await attemptRow(attemptId)).toMatchObject({ status: "done" });
  });
});

// 쓰기 4~5 확인 서버(3.3 · 6.2 쓰기 확인 · 3.7 쓰기 4~5 행 · 8절 'AI 호출 하나의 실패', plan-p11b 파일별 값 1 · 3 · 증명 표 쓰기 4~5 행).
// 시험 DB 에 시험용 시드(작은 틀, 규격은 12단계 전부)를 넣고, 견본 빌더 쓰기 4단계 수업(문장 틀 셋)을 lessons 행으로 더한 뒤
// 쓰기 4단계에서 시작한 집으로 본다. AI 는 P9a 가짜 Anthropic(fetch 자리)이고 응답은 이 수업의 문장 수로 시험 안에서 만든다.
// 설계 숫자는 시험용 설정(TEST_SETTINGS)에서 읽는다.
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
import { AVATARS, TOPIC_BUNDLES } from "@/core/profile/start";
import {
  LEVEL_MAX,
  PLACEHOLDER_NAME,
  UNITS_PER_LEVEL,
} from "@/core/seed/structure";
import { lessons, unitSpecs } from "@/db/schema/content";
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
import { saveFirstRun } from "@/server/profile";
import { loadSeed } from "@/server/seed/load";
import {
  finishLessonSession,
  loadSessionView,
  saveSessionAttempts,
  startLessonSession,
} from "@/server/session";
import { levelContextOf } from "@/server/session/ai-context";
import { checkGuided, type WritingDeps } from "@/server/writing";
import {
  createFakeAnthropic,
  type FakeAnthropic,
  type FakeReply,
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
import { createTestDatabase, type TestDatabase } from "./test-db";

const LOADED_AT = new Date("2026-10-17T10:00:00+09:00");
const SAVED_AT = new Date("2026-10-17T11:00:00+09:00");
const NOW = new Date("2026-10-17T20:00:00+09:00");
const THROUGH_KEY = "seed.complete_through_level";
const MODEL = TEST_SETTINGS["ai.model.writing_check"].value;
/** 시험 칭찬 · 이유(금지어에 걸리지 않는 해요체). */
const PRAISE = "문장 틀에 알맞은 낱말을 골라 넣었어요.";
const REASON = "이 자리에는 다른 낱말이 알맞아요.";
/** 이 시험 집의 영어 이름(첫 실행 저장 값 — 견본 문장 틀의 등장인물 이름과 같다). */
const ENGLISH_NAME = "Momo";

const sample = writingLesson(referenceSet(defaultSettings()), 4);
if (sample.lesson.content.shape !== "guided") throw new Error("견본 꼴");
const guided = sample.lesson.content;
const models = guided.sentences.map((s) => s.model);

let testDb: TestDatabase;
let db: Db;
const sessionDeps = () => ({ db, now: () => NOW, homophones: () => [] });

async function latestRevision(): Promise<number> {
  let latest = 0;
  for (const table of SEED_REVISION_TABLES) {
    const [row] = await db.select({ r: max(table.revision) }).from(table);
    latest = Math.max(latest, Number(row?.r ?? 0));
  }
  return latest;
}

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
  // 시험용 시드는 1단계 수업뿐 — 쓰기 4단계에서 시작할 수 있게 범위 끝을 마지막 단계로, 견본 수업을 더한다
  await db
    .update(settings)
    .set({ value: LEVEL_MAX })
    .where(and(eq(settings.key, THROUGH_KEY), isNull(settings.profileId)));
  const revision = await latestRevision();
  await db.insert(lessons).values({
    area: "writing",
    level: sample.level,
    unit: sample.unit,
    kind: "assigned",
    lessonNo: 1,
    topicVariant: 1,
    listTitle: sample.lesson.title,
    content: {
      ...sample.lesson,
      kind: "assigned",
      lessonNo: 1,
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
/** 집을 비우고 쓰기 4단계에서 시작한 집을 새로 넣는다. */
async function freshHousehold() {
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
}
beforeEach(freshHousehold);
afterEach(async () => {
  await db.delete(aiCalls);
});

function checkReply(
  correct: readonly boolean[],
  fix?: {
    sentenceIndex: number;
    original: string;
    corrected: string;
    distractors: string[];
    reason?: string;
  },
  praise: string = PRAISE,
): FakeReply {
  return {
    kind: "message",
    body: messageBody({
      model: MODEL,
      json: {
        praise,
        sentences: correct.map((ok, index) => ({ index, correct: ok })),
        fixes: fix ? [{ reason: REASON, ...fix }] : [],
      },
    }),
  };
}

function harness(rules: { reply: FakeReply }[]): {
  fake: FakeAnthropic;
  deps: WritingDeps;
} {
  const fake = createFakeAnthropic(rules);
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "test-key" },
    fetch: fake.fetch,
  });
  return {
    fake,
    deps: {
      db,
      now: () => NOW,
      clock: () => NOW,
      client: () => client,
      lists: () => ({ forbidden: SAMPLE_FORBIDDEN }),
    },
  };
}

/** 쓰기 4단계 수업을 연다. 화면 자료(활동 차례)를 돌려준다. */
async function openGuided() {
  const [row] = await db
    .select()
    .from(lessons)
    .where(and(eq(lessons.area, "writing"), eq(lessons.level, sample.level)));
  if (!row) throw new Error("견본 수업 없음");
  const started = await startLessonSession(
    { lessonId: row.id, confirmAbort: false },
    sessionDeps(),
  );
  if (!started.ok) throw new Error(`세션이 열려야 한다: ${started.reason}`);
  const view = await loadSessionView(
    { sessionId: started.sessionId },
    sessionDeps(),
  );
  if (view?.area !== "writing") throw new Error("세션 화면 자료 없음");
  return view;
}

const final = (kind: string, content: Record<string, unknown> = {}) => ({
  v: 1,
  kind,
  step: "final",
  ...content,
});

/** 쓰기 문장 활동 앞뒤의 끝 시도(미리보기 · 과제 · 내 문장 듣기)를 대기열 길로 넣고 끝낸다. */
async function finishAround(sessionId: string, guidedNo: number) {
  const out = await saveSessionAttempts(
    [
      { no: 1, input: final("preview", { shownWords: [] }) },
      { no: guidedNo - 1, input: final("writing-task") },
      {
        no: guidedNo + 1,
        input: final("writing-own-repeat", { skipped: "chose_skip" }),
      },
    ].map(({ no, input }) => ({
      clientAttemptId: randomUUID(),
      sessionId,
      activityNo: no,
      input,
    })),
    sessionDeps(),
  );
  if (!out.ok || out.rejected.length > 0) throw new Error("시도 저장 실패");
  return finishLessonSession({ sessionId }, sessionDeps());
}

async function sessionScore(sessionId: string) {
  const [row] = await db
    .select({ status: sessions.status, score: sessions.score })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  return row;
}

describe("쓰기 4~5 확인", () => {
  it("쓰기 4~5: 세션 점수는 첫 제출에서 맞다고 본 문장 수 ÷ 문장 수이고 확인이 실패하면 점수가 빈다", async () => {
    // 확인 성공 — 셋 가운데 둘째 문장이 틀림, 고칠 곳 하나
    const view = await openGuided();
    const guidedNo =
      view.activities.findIndex((a) => a.kind === "writing-guided") + 1;
    expect(view.activities.map((a) => a.kind)).toEqual([
      "preview",
      "writing-task",
      "writing-guided",
      "writing-own-repeat",
    ]);
    // 4단계는 단어 상자(단계 규격 amount.input)
    expect(view.guided).toEqual({ input: "word-box", sentences: null });
    const wrong = guided.sentences[1]?.wordBox?.at(-1) ?? "";
    const right = guided.sentences[1]?.wordBox?.[0] ?? "";
    const sentences = models.map((m, i) =>
      i === 1 ? m.replace(right, wrong) : m,
    );
    const correct = sentences.map((_, i) => i !== 1);
    const { fake, deps } = harness([
      {
        reply: checkReply(correct, {
          sentenceIndex: 1,
          original: wrong,
          corrected: right,
          distractors: [wrong],
        }),
      },
    ]);
    const clientAttemptId = randomUUID();
    const out = await checkGuided(
      {
        sessionId: view.sessionId,
        clientAttemptId,
        activityNo: guidedNo,
        sentences,
      },
      deps,
    );
    expect(out).toMatchObject({
      ok: true,
      praise: PRAISE,
      fix: { sentenceIndex: 1, original: wrong, correct: right },
    });
    if (!out.ok || !out.fix) throw new Error("고칠 곳이 있어야 한다");
    expect([...out.fix.options].sort()).toEqual([right, wrong].sort());
    expect(fake.requests).toHaveLength(1);
    const [saved] = await db
      .select()
      .from(attempts)
      .where(eq(attempts.clientAttemptId, clientAttemptId));
    const expected = correct.filter(Boolean).length / correct.length;
    expect(saved).toMatchObject({
      activityNo: guidedNo,
      status: "done",
      score: expected,
      input: { v: 1, kind: "writing-guided", step: "final", sentences },
      aiFeedback: { state: "ok" },
    });
    // 고친 뒤에도 점수는 첫 제출 그대로(고친 문장은 진행 시도로만)
    const fixed = await saveSessionAttempts(
      [
        {
          clientAttemptId: randomUUID(),
          sessionId: view.sessionId,
          activityNo: guidedNo,
          input: {
            v: 1,
            kind: "writing-guided-fix",
            step: "progress",
            fixed: models,
          },
        },
      ],
      sessionDeps(),
    );
    expect(fixed).toMatchObject({ ok: true, rejected: [] });
    const reopened = await loadSessionView(
      { sessionId: view.sessionId },
      sessionDeps(),
    );
    expect(reopened?.area === "writing" && reopened.guided).toEqual({
      input: "word-box",
      sentences: models,
    });
    expect(await finishAround(view.sessionId, guidedNo)).toEqual({
      ok: true,
      already: false,
    });
    expect(await sessionScore(view.sessionId)).toEqual({
      status: "completed",
      score: expected,
    });

    // 확인 실패(서버 오류 응답) — 시도는 남고 점수가 비며 세션 점수도 빈다
    await freshHousehold();
    const second = await openGuided();
    const failing = harness([
      {
        reply: {
          kind: "error",
          status: 500,
          body: { type: "error", error: { type: "api_error", message: "x" } },
        },
      },
    ]);
    const failedId = randomUUID();
    expect(
      await checkGuided(
        {
          sessionId: second.sessionId,
          clientAttemptId: failedId,
          activityNo: guidedNo,
          sentences: models,
        },
        failing.deps,
      ),
    ).toEqual({ ok: false, reason: "skipped" });
    const [failedRow] = await db
      .select()
      .from(attempts)
      .where(eq(attempts.clientAttemptId, failedId));
    expect(failedRow).toMatchObject({
      status: "done",
      score: null,
      aiFeedback: { state: "failed", reason: "server" },
    });
    expect(await finishAround(second.sessionId, guidedNo)).toEqual({
      ok: true,
      already: false,
    });
    expect(await sessionScore(second.sessionId)).toEqual({
      status: "completed",
      score: null,
    });
  });

  it("쓰기 4~5: 같은 시도 id 로 다시 내면 AI 를 다시 부르지 않고 저장한 결과를 돌려준다", async () => {
    const view = await openGuided();
    const guidedNo =
      view.activities.findIndex((a) => a.kind === "writing-guided") + 1;
    const wrong = guided.sentences[2]?.wordBox?.at(-1) ?? "";
    const right = guided.sentences[2]?.wordBox?.[0] ?? "";
    const sentences = models.map((m, i) =>
      i === 2 ? m.replace(right, wrong) : m,
    );
    const { fake, deps } = harness([
      {
        reply: checkReply([true, true, false], {
          sentenceIndex: 2,
          original: wrong,
          corrected: right,
          distractors: [wrong],
        }),
      },
    ]);
    const input = {
      sessionId: view.sessionId,
      clientAttemptId: randomUUID(),
      activityNo: guidedNo,
      sentences,
    };
    const first = await checkGuided(input, deps);
    const second = await checkGuided(input, deps);
    expect(first.ok).toBe(true);
    // 보기 차례까지 같다(시도 id 로 정한 차례)
    expect(second).toEqual(first);
    expect(fake.requests).toHaveLength(1);
    // 같은 활동에 다른 시도 id 로 다시 내도(다른 기기) 먼저 저장한 결과
    const third = await checkGuided(
      { ...input, clientAttemptId: randomUUID() },
      deps,
    );
    expect(third).toMatchObject({ ok: true, praise: PRAISE });
    expect(fake.requests).toHaveLength(1);
    expect(
      await db
        .select({ id: attempts.id })
        .from(attempts)
        .where(eq(attempts.sessionId, view.sessionId)),
    ).toHaveLength(1);
    // 대기열 길은 쓰기 확인 끝 시도를 받지 않는다(서버 액션만)
    const queued = await saveSessionAttempts(
      [
        {
          clientAttemptId: randomUUID(),
          sessionId: view.sessionId,
          activityNo: guidedNo,
          input: final("writing-guided", { sentences }),
        },
      ],
      sessionDeps(),
    );
    expect(queued).toMatchObject({ ok: true, accepted: [] });
  });

  it("쓰기 4~5: AI 칭찬 · 고칠 곳 · 이유의 {NAME} 은 프로필 영어 이름으로 채워 돌려주고 고칠 곳 자리는 채운 글로 찾으며 저장은 가린 글 그대로다", async () => {
    // 코드 검토 review-p11-5-code I-1 · 13절 C86(이유 한 줄) — 견본 둘째 문장 틀 'We can ___ with Momo.' 의 Momo 가 이 집 영어 이름이다
    const view = await openGuided();
    const guidedNo =
      view.activities.findIndex((a) => a.kind === "writing-guided") + 1;
    const wrong = guided.sentences[1]?.wordBox?.at(-1) ?? "";
    const right = guided.sentences[1]?.wordBox?.[0] ?? "";
    const sentences = models.map((m, i) =>
      i === 1 ? m.replace(right, wrong) : m,
    );
    expect(sentences[1]).toContain(`${wrong} with ${ENGLISH_NAME}`);
    const { deps } = harness([
      {
        reply: checkReply(
          sentences.map((_, i) => i !== 1),
          {
            sentenceIndex: 1,
            original: `${wrong} with ${PLACEHOLDER_NAME}`,
            corrected: `${right} with ${PLACEHOLDER_NAME}`,
            distractors: [`${wrong} with ${PLACEHOLDER_NAME}`],
            reason: `${PLACEHOLDER_NAME} 와 할 수 있는 일에 맞는 낱말을 써요.`,
          },
          `${PLACEHOLDER_NAME}, 문장을 또박또박 썼어요.`,
        ),
      },
    ]);
    const input = {
      sessionId: view.sessionId,
      clientAttemptId: randomUUID(),
      activityNo: guidedNo,
      sentences,
    };
    const expected = {
      ok: true,
      praise: `${ENGLISH_NAME}, 문장을 또박또박 썼어요.`,
      fix: {
        sentenceIndex: 1,
        original: `${wrong} with ${ENGLISH_NAME}`,
        correct: `${right} with ${ENGLISH_NAME}`,
        reason: `${ENGLISH_NAME} 와 할 수 있는 일에 맞는 낱말을 써요.`,
      },
    };
    const out = await checkGuided(input, deps);
    expect(out).toMatchObject(expected);
    if (!out.ok || !out.fix) throw new Error("고칠 곳이 살아남아야 한다");
    expect([...out.fix.options].sort()).toEqual(
      [`${right} with ${ENGLISH_NAME}`, `${wrong} with ${ENGLISH_NAME}`].sort(),
    );
    expect(JSON.stringify(out)).not.toContain(PLACEHOLDER_NAME);
    // 저장 결과로 다시 만들어도 채운다
    expect(await checkGuided(input, deps)).toEqual(out);
    // 저장은 가린 글 그대로(6.1)
    const [saved] = await db
      .select({ aiFeedback: attempts.aiFeedback })
      .from(attempts)
      .where(eq(attempts.clientAttemptId, input.clientAttemptId));
    expect(JSON.stringify(saved?.aiFeedback)).toContain(PLACEHOLDER_NAME);
    expect(JSON.stringify(saved?.aiFeedback)).not.toContain(ENGLISH_NAME);
  });

  it("쓰기 AI: 가변부의 앞 단원 학습 요소는 앞 단계 전부와 같은 단계 앞 단원이다", async () => {
    const revision = await latestRevision();
    const element = (level: number, unit: number) =>
      `${level}단계 단원 ${unit} 학습 요소`;
    const earlierElements = (level: number, unit: number) => {
      const out: string[] = [];
      for (let l = 1; l <= level; l += 1)
        for (let u = 1; u <= (l < level ? UNITS_PER_LEVEL : unit - 1); u += 1)
          out.push(element(l, u));
      return out;
    };
    // 단계 4 단원 1: 앞 단계(1~3) 단원 1~5 전부, 알파벳 단원 0 은 빠짐
    const unitOne = await levelContextOf(
      { area: "writing", level: 4, unit: 1, revision },
      { db },
    );
    expect(unitOne.prevLearningElements).toEqual(earlierElements(4, 1));
    expect(unitOne.learningElement).toBe(element(4, 1));
    expect(unitOne.prevLearningElements).not.toContain(
      "알파벳 이름과 기본 소리",
    );
    // 단계 4 단원 3: 같은 단계 앞 단원(1 · 2)까지, 이 단원 · 뒤 단원은 빠짐
    const unitThree = await levelContextOf(
      { area: "writing", level: 4, unit: 3, revision },
      { db },
    );
    expect(unitThree.prevLearningElements).toEqual(earlierElements(4, 3));
    // 칸마다 그 판 이하 가장 높은 판(정정은 쓰고, 뒤 개정은 쓰지 않음)
    await db.insert(unitSpecs).values([
      {
        area: "writing",
        level: 2,
        unit: 3,
        learningPoints: "고친 학습 요소",
        topic: "고친 주제",
        targetVocab: ["word"],
        revision,
        correction: 1,
      },
      {
        area: "writing",
        level: 3,
        unit: 1,
        learningPoints: "뒤 개정 학습 요소",
        topic: "뒤 주제",
        targetVocab: ["word"],
        revision: revision + 1,
        correction: 0,
      },
    ]);
    try {
      const picked = await levelContextOf(
        { area: "writing", level: 4, unit: 1, revision },
        { db },
      );
      expect(picked.prevLearningElements).toEqual(
        earlierElements(4, 1).map((e) =>
          e === element(2, 3) ? "고친 학습 요소" : e,
        ),
      );
    } finally {
      await db.delete(unitSpecs).where(eq(unitSpecs.topic, "고친 주제"));
      await db.delete(unitSpecs).where(eq(unitSpecs.topic, "뒤 주제"));
    }
    // 없는 칸은 던진다(조용한 기본값 금지)
    await expect(
      levelContextOf(
        { area: "writing", level: 4, unit: 1, revision: 0 },
        { db },
      ),
    ).rejects.toThrow();

    // 실제 요청의 가변부에 앞 단원 학습 요소가 그 차례로 실린다
    const view = await openGuided();
    const guidedNo =
      view.activities.findIndex((a) => a.kind === "writing-guided") + 1;
    const { fake, deps } = harness([
      { reply: checkReply(models.map(() => true)) },
    ]);
    expect(
      await checkGuided(
        {
          sessionId: view.sessionId,
          clientAttemptId: randomUUID(),
          activityNo: guidedNo,
          sentences: models,
        },
        deps,
      ),
    ).toEqual({ ok: true, praise: PRAISE });
    const [request] = fake.requests;
    if (!request) throw new Error("요청이 없다");
    const system = JSON.stringify(
      (request.body as { system?: unknown }).system,
    );
    expect(system).toContain(
      `Learning elements of earlier units: ${earlierElements(4, 1).join("; ")}`,
    );
    expect(system).toContain(`Learning element of this unit: ${element(4, 1)}`);
  });
});

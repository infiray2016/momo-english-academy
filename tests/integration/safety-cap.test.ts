// AC-8b(서버 몫) 하루 안전 상한 · 알림 기준은 막지 않음(plan-p09c 증명 표). P11b 가 1-가 시작 막음 · 쓰기 확인 도중 몫을 아래에 더했다.
// 숫자는 TEST_SETTINGS 에서 읽고, 안전 상한 호출 수는 프로필 설정 행을 작은 값으로 넣어 '설정값을 읽는 것'을 본다.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, eq, isNull, max } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { learningDayOf } from "@/core/learning-day";
import { AVATARS, TOPIC_BUNDLES } from "@/core/profile/start";
import { LEVEL_MAX } from "@/core/seed/structure";
import { aiNeededLesson } from "@/core/session/attempt";
import { lessons } from "@/db/schema/content";
import { attempts, profiles, sessions } from "@/db/schema/learning";
import {
  aiCalls,
  parentAlerts,
  parentAuth,
  settings,
} from "@/db/schema/operations";
import { SEED_REVISION_TABLES } from "@/db/schema/seed-revision";
import { type AiDeps, checkWriting } from "@/server/ai";
import { createAnthropicClient } from "@/server/ai/client";
import { type AiCallRow, insertAiCall } from "@/server/ai/store";
import type { Db } from "@/server/db";
import { saveFirstRun } from "@/server/profile";
import { loadSeed } from "@/server/seed/load";
import { loadSessionView, startLessonSession } from "@/server/session";
import { checkGuided } from "@/server/writing";
import {
  createFakeAnthropic,
  type FakeReply,
} from "../fixtures/ai/fake-anthropic";
import { seedModelPrices } from "../fixtures/ai/model-prices";
import {
  SAMPLE_FORBIDDEN,
  WRITING_CHECK_SAMPLE,
} from "../fixtures/ai/sample-inputs";
import {
  defaultSettings,
  referenceSet,
  speakingLesson,
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

const SAMPLES_DIR = join(process.cwd(), "tests/fixtures/ai/samples");
/** 하루의 밀리초(단위 값). */
const MS_PER_DAY = 24 * 60 * 60 * 1000;
/** 프로필 설정 행에 넣는 작은 안전 상한(시험 값 — 기본값보다 작기만 하면 된다). */
const SMALL_SAFETY_CALLS = 3;
const TZ = TEST_SETTINGS["app.timezone"].value;
const DAY_START = TEST_SETTINGS["app.day_start_hour"].value;
const MODEL = TEST_SETTINGS["ai.model.writing_check"].value;

function okReply(): FakeReply {
  const { response } = JSON.parse(
    readFileSync(join(SAMPLES_DIR, "writing_check.ok.json"), "utf8"),
  );
  return { kind: "message", body: response.body };
}

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
  await seedSettings(
    testDb.db,
    Object.entries(TEST_SETTINGS).map(([key, { scope, value }]) => ({
      key,
      scope,
      value,
    })),
  );
  await seedModelPrices(testDb.db);
});

afterAll(async () => {
  await testDb?.drop();
});

afterEach(async () => {
  await testDb.db.delete(aiCalls);
  await testDb.db.delete(parentAlerts);
});

async function insertProfile(safetyCalls?: number): Promise<string> {
  const [row] = await testDb.db
    .insert(profiles)
    .values({
      displayName: "시험",
      englishName: "Tester",
      avatar: "fox",
      topicBundle: "animals",
      alphabetStart: false,
    })
    .returning({ id: profiles.id });
  if (!row) throw new Error("프로필을 넣지 못했다");
  if (safetyCalls !== undefined) {
    await seedSettings(testDb.db, [
      {
        key: "ai.safety_daily_calls",
        scope: "profile",
        value: safetyCalls,
        profileId: row.id,
      },
    ]);
  }
  return row.id;
}

function harness(clock: () => Date = () => new Date()) {
  const fake = createFakeAnthropic([{ reply: okReply() }]);
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: "test-key" },
    fetch: fake.fetch,
  });
  const deps: AiDeps = {
    db: testDb.db,
    clock,
    client: () => client,
    lists: () => ({ forbidden: SAMPLE_FORBIDDEN }),
  };
  return { fake, deps };
}

const today = () => learningDayOf(new Date(), TZ, DAY_START);

function pastRow(overrides: Partial<AiCallRow>): AiCallRow {
  return {
    profileId: null,
    sessionId: null,
    calledAt: new Date(),
    learningDay: today(),
    purpose: "writing_check",
    requestedModel: MODEL,
    answeredModel: MODEL,
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    costUsd: "0.000000",
    priceMissing: false,
    latencyMs: null,
    status: "success",
    errorCode: null,
    ...overrides,
  };
}

async function insertRows(count: number, overrides: Partial<AiCallRow>) {
  await testDb.db
    .insert(aiCalls)
    .values(Array.from({ length: count }, () => pastRow(overrides)));
}

const ctxOf = (profileId: string) => ({ profileId, sessionId: null, level: 4 });

async function rowsOf(profileId: string) {
  const all = await testDb.db.select().from(aiCalls);
  return all.filter((r) => r.profileId === profileId);
}

describe("AC-8b 하루 안전 상한", () => {
  it("AC-8b 알림 기준(하루 호출 · 하루 비용 · 월 비용)을 넘긴 날에도 실시간 호출이 나간다", async () => {
    const profileId = await insertProfile();
    // 하루 호출 알림 기준만큼 · 하루 · 월 비용 알림 기준을 넘는 비용(안전 상한보다 작게)
    await insertRows(TEST_SETTINGS["ai.daily_call_alert"].value, { profileId });
    const overMonthly = TEST_SETTINGS["ai.monthly_cost_alert_usd"].value + 0.5;
    expect(overMonthly).toBeLessThan(
      TEST_SETTINGS["ai.safety_daily_cost_usd"].value,
    );
    await insertAiCall(testDb.db, pastRow({ costUsd: overMonthly.toFixed(6) }));
    const { fake, deps } = harness();
    const result = await checkWriting(
      WRITING_CHECK_SAMPLE,
      ctxOf(profileId),
      deps,
    );
    expect(result.ok).toBe(true);
    expect(fake.requests).toHaveLength(1);
  });

  it("AC-8b 프로필 하루 호출이 ai.safety_daily_calls 에 닿으면 그 학습일 호출이 0회이고 ai_calls 에 safety_cap 행이 남는다", async () => {
    const profileId = await insertProfile(SMALL_SAFETY_CALLS);
    await insertRows(SMALL_SAFETY_CALLS, { profileId });
    const { fake, deps } = harness();
    for (let i = 0; i < 2; i++) {
      const result = await checkWriting(
        WRITING_CHECK_SAMPLE,
        ctxOf(profileId),
        deps,
      );
      expect(result).toEqual({ ok: false, reason: "safety_cap", refusals: 0 });
    }
    expect(fake.requests).toHaveLength(0);
    const capped = (await rowsOf(profileId)).filter(
      (r) => r.status === "safety_cap",
    );
    expect(capped).toHaveLength(2);
    expect(capped[0]).toMatchObject({
      requestedModel: MODEL,
      answeredModel: null,
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 0,
      cacheReadTokens: 0,
      costUsd: "0.000000",
      latencyMs: null,
      errorCode: null,
      learningDay: today(),
    });
  });

  it("AC-8b 집 하루 비용이 ai.safety_daily_cost_usd 에 닿아도 같다", async () => {
    const profileId = await insertProfile();
    // 다른 프로필 · 집 전체 비용으로 닿는다
    await insertAiCall(
      testDb.db,
      pastRow({
        costUsd: TEST_SETTINGS["ai.safety_daily_cost_usd"].value.toFixed(6),
      }),
    );
    const { fake, deps } = harness();
    const result = await checkWriting(
      WRITING_CHECK_SAMPLE,
      ctxOf(profileId),
      deps,
    );
    expect(result).toEqual({ ok: false, reason: "safety_cap", refusals: 0 });
    expect(fake.requests).toHaveLength(0);
    expect((await rowsOf(profileId)).map((r) => r.status)).toEqual([
      "safety_cap",
    ]);
  });

  it("AC-8b 다음 학습일(시계를 넘김)에는 다시 나간다", async () => {
    const profileId = await insertProfile(SMALL_SAFETY_CALLS);
    await insertRows(SMALL_SAFETY_CALLS, { profileId });
    const blocked = harness();
    expect(
      (await checkWriting(WRITING_CHECK_SAMPLE, ctxOf(profileId), blocked.deps))
        .ok,
    ).toBe(false);
    const tomorrow = harness(() => new Date(Date.now() + MS_PER_DAY));
    const result = await checkWriting(
      WRITING_CHECK_SAMPLE,
      ctxOf(profileId),
      tomorrow.deps,
    );
    expect(result.ok).toBe(true);
    expect(tomorrow.fake.requests).toHaveLength(1);
    const next = (await rowsOf(profileId)).find(
      (r) => r.status === "success" && r.learningDay !== today(),
    );
    expect(next?.learningDay).toBe(
      learningDayOf(new Date(Date.now() + MS_PER_DAY), TZ, DAY_START),
    );
  });

  it("AC-8b 확인 호출 행과 막힌 행은 호출 수에 들지 않는다", async () => {
    const profileId = await insertProfile(SMALL_SAFETY_CALLS);
    // 상한보다 많은 확인 호출 행(프로필 비움, 집 하루 비용 안전 상한만큼의 비용) · 막힌 행
    await insertRows(SMALL_SAFETY_CALLS * 2, { purpose: "probe" });
    await insertAiCall(
      testDb.db,
      pastRow({
        purpose: "probe",
        costUsd: TEST_SETTINGS["ai.safety_daily_cost_usd"].value.toFixed(6),
      }),
    );
    await insertRows(SMALL_SAFETY_CALLS * 2, {
      profileId,
      status: "safety_cap",
    });
    const { fake, deps } = harness();
    for (let i = 0; i < SMALL_SAFETY_CALLS; i++) {
      expect(
        (await checkWriting(WRITING_CHECK_SAMPLE, ctxOf(profileId), deps)).ok,
      ).toBe(true);
    }
    expect(fake.requests).toHaveLength(SMALL_SAFETY_CALLS);
    // 실제로 부른 수가 상한에 닿은 뒤에야 막힌다
    expect(
      await checkWriting(WRITING_CHECK_SAMPLE, ctxOf(profileId), deps),
    ).toEqual({ ok: false, reason: "safety_cap", refusals: 0 });
    expect(fake.requests).toHaveLength(SMALL_SAFETY_CALLS);
  });
});

// ── 1-가 시작 막음(11절 (7) · 13절 C50 (2) · C80, plan-p11b 값 2 · 9 · 증명 표 '1-가 안전 상한' 행) ──
// 수업 시작 · 쓰기 확인 도중은 시험용 시드(작은 틀, 규격 12단계 전부)를 넣은 따로 된 시험 DB 에서 본다(위 AC-8b 는 설정만 든 DB).
describe("1-가 안전 상한", () => {
  const LOADED_AT = new Date("2026-10-17T10:00:00+09:00");
  const SAVED_AT = new Date("2026-10-17T11:00:00+09:00");
  const NOW = new Date("2026-10-17T20:00:00+09:00");
  const THROUGH_KEY = "seed.complete_through_level";
  const ref = referenceSet(defaultSettings());
  const samples = {
    writing4: writingLesson(ref, 4),
    writing6: writingLesson(ref, 6),
    speaking10: speakingLesson(ref, 10),
  };
  let seeded: TestDatabase;
  let db: Db;
  const sessionDeps = () => ({ db, now: () => NOW, homophones: () => [] });

  beforeAll(async () => {
    seeded = await createTestDatabase();
    db = seeded.db;
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
    for (const sample of Object.values(samples)) {
      await db.insert(lessons).values({
        area: sample.area,
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
    }
  });
  afterAll(async () => {
    await seeded?.drop();
  });

  /** 집을 비우고 그 시작 단계로 새로 넣는다. 프로필 id 를 돌려준다. */
  async function household(
    startLevels: Partial<Record<"reading" | "writing" | "speaking", number>>,
  ): Promise<string> {
    await db.delete(profiles);
    await db.delete(parentAuth);
    await db.delete(parentAlerts);
    await db.delete(aiCalls);
    const saved = await saveFirstRun(
      {
        pin: "246813",
        displayName: "모모",
        englishName: "Momo",
        avatar: AVATARS[0].id,
        topicBundle: TOPIC_BUNDLES[0].id,
        alphabetUnknown: false,
        startLevels,
        mic: { result: "not_checked" },
      },
      { db, now: () => SAVED_AT },
    );
    if (!saved.ok) throw new Error("첫 실행 저장 실패");
    const [profile] = await db.select({ id: profiles.id }).from(profiles);
    if (!profile) throw new Error("프로필 없음");
    // 이 프로필의 안전 상한을 작은 값으로(설정값을 읽는 것을 본다)
    await seedSettings(db, [
      {
        key: "ai.safety_daily_calls",
        scope: "profile",
        value: SMALL_SAFETY_CALLS,
        profileId: profile.id,
      },
    ]);
    return profile.id;
  }

  /** 그 학습일 호출 수를 상한까지 채운다. */
  async function reachCap(profileId: string) {
    await db.insert(aiCalls).values(
      Array.from({ length: SMALL_SAFETY_CALLS }, () =>
        pastRow({
          profileId,
          calledAt: NOW,
          learningDay: learningDayOf(NOW, TZ, DAY_START),
        }),
      ),
    );
  }

  async function lessonId(
    area: "reading" | "writing" | "speaking",
    level: number,
  ): Promise<string> {
    const [row] = await db
      .select({ id: lessons.id })
      .from(lessons)
      .where(
        and(
          eq(lessons.area, area),
          eq(lessons.level, level),
          eq(lessons.unit, 1),
          eq(lessons.kind, "assigned"),
          eq(lessons.lessonNo, 1),
          eq(lessons.topicVariant, 1),
        ),
      );
    if (!row) throw new Error(`${area} ${level}단계 수업 없음`);
    return row.id;
  }

  const start = async (id: string) =>
    startLessonSession({ lessonId: id, confirmAbort: false }, sessionDeps());

  it("1-가 안전 상한: 그 학습일 호출이 ai.safety_daily_calls 에 닿으면 쓰기 4단계 이상 첫 세션 · 말하기 9단계 이상은 시작되지 않고 둘째 세션 · 읽기 · 쓰기 1~3 은 시작된다", async () => {
    // AI 가 필요한 수업(쓰기 4 · 6 첫 세션 · 말하기 10)은 막히고, 상한 행을 지우면 같은 수업이 열린다(막힌 까닭이 상한임)
    for (const [area, level] of [
      ["writing", samples.writing4.level],
      ["writing", samples.writing6.level],
      ["speaking", samples.speaking10.level],
    ] as const) {
      const profileId = await household({ [area]: level });
      await reachCap(profileId);
      const id = await lessonId(area, level);
      expect(await start(id), `${area} ${level}`).toEqual({
        ok: false,
        reason: "ai_resting",
      });
      expect(await db.select().from(sessions)).toHaveLength(0);
      await db.delete(aiCalls);
      expect((await start(id)).ok, `${area} ${level} 상한 전`).toBe(true);
    }
    // AI 없이 되는 수업(읽기 · 쓰기 1~3)은 상한 날에도 열린다
    const profileId = await household({ reading: 1, writing: 1 });
    await reachCap(profileId);
    expect((await start(await lessonId("reading", 1))).ok).toBe(true);
    expect((await start(await lessonId("writing", 1))).ok).toBe(true);
    // 둘째 세션(고쳐 쓰기)은 AI 가 필요한 수업이 아니다 — 시작 판정 길(첨삭 보기)은 차례 7 이 이 시험에 더한다
    expect(
      aiNeededLesson({
        area: "writing",
        content: samples.writing6.lesson.content,
        part: "rewrite",
      }),
    ).toBe(false);
  });

  it("1-가 안전 상한: 쓰기 확인 도중 닿으면 시도를 남기지 않고 '쉬는 중'이며 세션은 진행으로 남고 다시 열면 화면 자료가 안내를 고른다", async () => {
    const profileId = await household({ writing: samples.writing4.level });
    const started = await start(
      await lessonId("writing", samples.writing4.level),
    );
    if (!started.ok) throw new Error("세션이 열려야 한다");
    const view = await loadSessionView(
      { sessionId: started.sessionId },
      sessionDeps(),
    );
    if (view?.area !== "writing") throw new Error("화면 자료 없음");
    expect(view.aiResting).toBe(false);
    await reachCap(profileId);
    const { fake, deps } = harness(() => NOW);
    const content = samples.writing4.lesson.content;
    if (content.shape !== "guided") throw new Error("견본 꼴");
    const out = await checkGuided(
      {
        sessionId: started.sessionId,
        clientAttemptId: randomUUID(),
        activityNo:
          view.activities.findIndex((a) => a.kind === "writing-guided") + 1,
        sentences: content.sentences.map((s) => s.model),
      },
      { ...deps, db, now: () => NOW },
    );
    expect(out).toEqual({ ok: false, reason: "ai_resting" });
    expect(fake.requests).toHaveLength(0);
    expect(
      await db
        .select()
        .from(attempts)
        .where(eq(attempts.sessionId, started.sessionId)),
    ).toHaveLength(0);
    const [row] = await db
      .select({ status: sessions.status })
      .from(sessions)
      .where(eq(sessions.id, started.sessionId));
    expect(row?.status).toBe("in_progress");
    const reopened = await loadSessionView(
      { sessionId: started.sessionId },
      sessionDeps(),
    );
    expect(reopened?.aiResting).toBe(true);
  });
});

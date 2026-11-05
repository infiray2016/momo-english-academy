// 말하기 평가 서버 — 질문 답 몫(plan-p11c 값 1 · 3 · 증명 표 '말하기 AI 흐름', 가르치고 배우는 수업 plan 다 · 정한 것 5 · 6 · 증명 절
// '말하기 질문 판정의 증명' 통합 몫, 정본 15절 AC-22k · AC-N19). 시험 시드에 3단계 단원 1 정규 시드 말하기 가르치는 수업을 더해 말하기
// 3단계(질문 답을 AI 로 판정)에서 연다. AI 는 P9a 가짜 Anthropic 이고 판정은 시험이 고른다. 이 Mac 에서는 돌리지 않고 CI 에서 돈다.
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { INPUT_VERSION } from "@/core/session/attempt";
import { skipAfterAiRest } from "@/core/speaking/judge";
import { attempts, sessions, unitProgress } from "@/db/schema/learning";
import { aiCalls } from "@/db/schema/operations";
import type { Db } from "@/server/db";
import { readHouseholdProfile } from "@/server/profile";
import { loadSeed } from "@/server/seed/load";
import {
  finishLessonSession,
  loadSessionView,
  saveSessionAttempts,
} from "@/server/session";
import { evaluateAnswer } from "@/server/speaking";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import {
  answerReply,
  appFinals,
  freshSpeakingHousehold,
  insertTeachSpeakingLesson,
  openTeachSpeaking,
  questionNo,
  SPEAKING_MODEL,
  SPEAKING_TEACH,
  type SpeakingView,
  speakingHarness,
} from "./speaking-fixture";
import { createTestDatabase, seedSettings, type TestDatabase } from "./test-db";

const LOADED_AT = new Date("2026-10-17T10:00:00+09:00");
const SAVED_AT = new Date("2026-10-17T11:00:00+09:00");
const NOW = new Date("2026-10-17T20:00:00+09:00");

const questions = SPEAKING_TEACH.content.questions;
const Q = (i: number) => {
  const q = questions[i];
  if (!q) throw new Error(`질문 ${i} 없음`);
  return q;
};

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
  await insertTeachSpeakingLesson(db);
});
afterAll(async () => {
  await testDb.drop();
});
beforeEach(() => freshSpeakingHousehold(db, SAVED_AT));
afterEach(async () => {
  await db.delete(aiCalls);
});

async function attemptOf(clientAttemptId: string) {
  const [row] = await db
    .select()
    .from(attempts)
    .where(eq(attempts.clientAttemptId, clientAttemptId));
  return row;
}

/** 혼자 질문 index 에 답한다(시도 id 를 돌려준다). */
async function answer(
  view: SpeakingView,
  index: number,
  transcript: string,
  deps: Parameters<typeof evaluateAnswer>[1],
  clientAttemptId: string = randomUUID(),
) {
  const out = await evaluateAnswer(
    {
      sessionId: view.sessionId,
      clientAttemptId,
      activityNo: questionNo(view, index),
      transcript,
      failures: 0,
    },
    deps,
  );
  return { out, clientAttemptId };
}

/** 혼자 질문 밖 끝 시도를 대기열 길로 넣고 세션을 끝낸다. */
async function finishWithAppFinals(view: SpeakingView) {
  const saved = await saveSessionAttempts(appFinals(view), sessionDeps());
  expect(saved).toMatchObject({ ok: true, rejected: [] });
  return finishLessonSession({ sessionId: view.sessionId }, sessionDeps());
}

describe("말하기 질문 답 평가(AI 판정 단계)", () => {
  it("AC-22k 말하기 3단계 혼자 질문: 가짜 AI '부분'에 'Yes, they do.'를 내면 저장된 끝 시도가 맞음 · acceptedMeaning · 의사소통 정답 · 표현 수행 거짓이고 점수 1 이며, 요청에 질문 직전 이야기가 든다", async () => {
    const view = await openTeachSpeaking(db, NOW);
    const { fake, deps } = speakingHarness(
      db,
      [{ reply: answerReply("partial") }],
      NOW,
    );
    const clientAttemptId = randomUUID();
    const out = await evaluateAnswer(
      {
        sessionId: view.sessionId,
        clientAttemptId,
        activityNo: questionNo(view, 3),
        transcript: "Yes, they do.",
        failures: 1,
        story: { replayed: true },
      },
      deps,
    );
    // 합친 판정은 맞음 — AI '부분' 피드백은 반응과 어긋나 내지 않는다
    expect(out).toEqual({
      ok: true,
      judgement: "correct",
      feedback: null,
      correctSentence: "Yes, they wash the cups.",
      grammarNotes: [],
    });
    expect(await attemptOf(clientAttemptId)).toMatchObject({
      activityNo: questionNo(view, 3),
      status: "done",
      score: 1,
      input: {
        v: INPUT_VERSION,
        kind: "question",
        step: "final",
        heard: ["Yes, they do."],
        failures: 1,
        story: { replayed: true },
        judge: {
          meaning: "ok",
          bundle: "meaning",
          ai: "partial",
          final: "correct",
          by: "app",
          communicative: true,
          expressionDone: false,
        },
      },
      aiFeedback: { state: "ok", value: { judgement: "partial" } },
    });
    expect(fake.requests).toHaveLength(1);
    const body = fake.requests[0]?.bodyText ?? "";
    expect(body).toContain(`Story the child heard: ${Q(3).storyEn}`);
    expect(body).toContain(`Question: ${Q(3).en}`);
    expect(fake.requests[0]?.body).toMatchObject({ model: SPEAKING_MODEL });
  });

  it("AC-22k AI '맞음'이라도 의미 검사에 걸린 답('Yes, they drink milk.')은 '다시'(점수 0)이고 AI 원 판정이 judge.ai 에 남으며 시드 바른 답을 들려준다", async () => {
    const view = await openTeachSpeaking(db, NOW);
    const { deps } = speakingHarness(
      db,
      [{ reply: answerReply("correct", "Yes, they drink milk.") }],
      NOW,
    );
    const { out, clientAttemptId } = await answer(
      view,
      1,
      "Yes, they drink milk.",
      deps,
    );
    expect(out).toEqual({
      ok: true,
      judgement: "retry",
      feedback: null,
      correctSentence: Q(1).modelAnswer,
      grammarNotes: [],
    });
    expect(await attemptOf(clientAttemptId)).toMatchObject({
      score: 0,
      input: {
        judge: {
          meaning: "direction",
          ai: "correct",
          final: "retry",
          by: "app",
          expressionDone: false,
        },
      },
    });
  });

  it("말하기 평가: 같은 시도 id 로 다시 부르면 AI 를 다시 부르지 않는다(같은 활동의 다른 시도 id 도 저장된 결과)", async () => {
    const view = await openTeachSpeaking(db, NOW);
    const { fake, deps } = speakingHarness(
      db,
      [{ reply: answerReply("correct") }],
      NOW,
    );
    const first = await answer(view, 0, "No, they eat pizza.", deps);
    expect(first.out).toMatchObject({ ok: true, judgement: "correct" });
    const again = await answer(
      view,
      0,
      "No, they eat pizza.",
      deps,
      first.clientAttemptId,
    );
    expect(again.out).toEqual(first.out);
    const other = await answer(view, 0, "They eat rice.", deps);
    expect(other.out).toEqual(first.out);
    expect(fake.requests).toHaveLength(1);
    const rows = await db
      .select()
      .from(attempts)
      .where(eq(attempts.sessionId, view.sessionId));
    expect(rows).toHaveLength(1);
  });

  it("AC-22k '같이 말해 볼까요' 뒤 말: 같은 시도 id 와 echo 로 다시 부르면 AI 를 다시 부르지 않고 저장된 그 끝 시도 행에 echo 가 한 번 들고 단어 수가 늘며, 다시 보내도 한 번이다(echo 만 먼저 오면 invalid)", async () => {
    const view = await openTeachSpeaking(db, NOW);
    const { fake, deps } = speakingHarness(
      db,
      [{ reply: answerReply("correct") }],
      NOW,
    );
    const q0 = Q(0);
    const model = q0.modelAnswer ?? "";
    // 판정 전 echo 는 받지 않는다(저장된 끝 시도에만 합침)
    const early = await evaluateAnswer(
      {
        sessionId: view.sessionId,
        clientAttemptId: randomUUID(),
        activityNo: questionNo(view, 0),
        transcript: "Yes, they eat rice.",
        echo: model,
      },
      deps,
    );
    expect(early).toEqual({ ok: false, reason: "invalid" });
    const first = await answer(view, 0, "Yes, they eat rice.", deps);
    expect(first.out).toMatchObject({ ok: true, judgement: "retry" });
    const before = await attemptOf(first.clientAttemptId);
    const withEcho = (echo: string) =>
      evaluateAnswer(
        {
          sessionId: view.sessionId,
          clientAttemptId: first.clientAttemptId,
          activityNo: questionNo(view, 0),
          transcript: "Yes, they eat rice.",
          failures: 0,
          echo,
        },
        deps,
      );
    expect(await withEcho(model)).toEqual(first.out);
    // 끊김 뒤 다시 보냄 · 다른 말이 와도 처음 합친 echo 그대로
    expect(await withEcho("They eat pizza.")).toEqual(first.out);
    expect(fake.requests).toHaveLength(1);
    const after = await attemptOf(first.clientAttemptId);
    expect(after?.input).toMatchObject({
      kind: "question",
      step: "final",
      echo: model,
      judge: { final: "retry" },
    });
    expect(after?.score).toBe(before?.score);
    expect(after?.wordCount).toBe(
      (before?.wordCount ?? 0) + model.split(/\s+/).length,
    );
    const rows = await db
      .select()
      .from(attempts)
      .where(eq(attempts.sessionId, view.sessionId));
    expect(rows).toHaveLength(1);
  });

  it("말하기 3~8: 평가가 실패한 문항은 판정 없는 끝 시도(점수 없음)로 남고, 소리를 못 들려준 채 낸 답은 AI 를 부르지 않는 U 끝 시도다", async () => {
    const view = await openTeachSpeaking(db, NOW);
    const { fake, deps } = speakingHarness(
      db,
      [
        {
          reply: {
            kind: "error",
            status: 500,
            body: { type: "error", error: { type: "api_error", message: "x" } },
          },
        },
      ],
      NOW,
    );
    const failed = await answer(view, 0, "No, they eat pizza.", deps);
    expect(failed.out).toEqual({ ok: false, reason: "skipped" });
    const failedRow = await attemptOf(failed.clientAttemptId);
    expect(failedRow).toMatchObject({
      score: null,
      aiFeedback: { state: "failed", reason: "server" },
    });
    expect(failedRow?.input).not.toHaveProperty("judge");
    const requests = fake.requests.length;

    const silentId = randomUUID();
    expect(
      await evaluateAnswer(
        {
          sessionId: view.sessionId,
          clientAttemptId: silentId,
          activityNo: questionNo(view, 1),
          transcript: "No, they drink milk.",
          techError: "speak_fail",
        },
        deps,
      ),
    ).toEqual({ ok: false, reason: "skipped" });
    expect(fake.requests).toHaveLength(requests);
    expect(await attemptOf(silentId)).toMatchObject({
      score: null,
      input: { kind: "question", techError: "speak_fail" },
    });
    // 판정 없는 질문 둘은 U 라 그 짝을 내지 않는다
    const reopened = await loadSessionView(
      { sessionId: view.sessionId },
      sessionDeps(),
    );
    const spareNos = (reopened?.activities ?? []).flatMap((a, i) =>
      a.kind === "spare" && a.base === "question" && a.index <= 1
        ? [i + 1]
        : [],
    );
    expect(spareNos.length).toBe(2);
    for (const no of spareNos) expect(reopened?.spares?.show).not.toContain(no);
  });

  it("말하기 3~8: 안전 상한이면 시도를 남기지 않고 ai_resting 이며, 남은 혼자 질문을 건너뜀 끝 시도(ai_rest)로 대기열에 넣으면 세션을 끝낼 수 있다", async () => {
    const view = await openTeachSpeaking(db, NOW);
    const { fake, deps } = speakingHarness(
      db,
      [{ reply: answerReply("correct") }],
      NOW,
    );
    expect(
      (await answer(view, 0, "No, they eat pizza.", deps)).out,
    ).toMatchObject({ ok: true });
    const profile = await readHouseholdProfile({ db });
    if (!profile) throw new Error("프로필 없음");
    // 그 학습일 호출 수(지금 1)에 닿게 프로필 상한을 1 로
    await seedSettings(db, [
      {
        key: "ai.safety_daily_calls",
        scope: "profile",
        value: 1,
        profileId: profile.id,
      },
    ]);
    const resting = await answer(view, 1, "No, they drink milk.", deps);
    expect(resting.out).toEqual({ ok: false, reason: "ai_resting" });
    expect(await attemptOf(resting.clientAttemptId)).toBeUndefined();
    expect(fake.requests).toHaveLength(1);

    const skipNos = skipAfterAiRest(view.activities, questionNo(view, 1));
    expect(skipNos).toEqual([1, 2, 3].map((i) => questionNo(view, i)));
    const skipped = await saveSessionAttempts(
      skipNos.map((no) => ({
        clientAttemptId: randomUUID(),
        sessionId: view.sessionId,
        activityNo: no,
        input: {
          v: INPUT_VERSION,
          kind: "question",
          step: "final",
          heard: [],
          failures: 0,
          skipped: "ai_rest",
        },
      })),
      sessionDeps(),
    );
    expect(skipped).toMatchObject({ ok: true, rejected: [] });
    expect(await finishWithAppFinals(view)).toEqual({
      ok: true,
      already: false,
    });
  });

  it("AC-22k 질문 짝 시도의 judge 칸은 기기가 보낸 값 대신 서버의 앱 판정으로 저장된다(혼자 질문을 틀려 낸 짝)", async () => {
    const view = await openTeachSpeaking(db, NOW);
    const { deps } = speakingHarness(
      db,
      [{ reply: answerReply("correct", "Yes, they eat pizza.") }],
      NOW,
    );
    // 혼자 질문 1 을 방향이 틀린 답으로 — AI 는 맞음이라 해도 '다시'(혼자 첫 시도 틀림)
    await answer(view, 0, "Yes, they eat pizza.", deps);
    const reopened = await loadSessionView(
      { sessionId: view.sessionId },
      sessionDeps(),
    );
    const spareNo =
      (reopened?.activities ?? []).findIndex(
        (a) => a.kind === "spare" && a.base === "question" && a.index === 0,
      ) + 1;
    expect(reopened?.spares?.show).toEqual([spareNo]);
    const clientAttemptId = randomUUID();
    const saved = await saveSessionAttempts(
      [
        {
          clientAttemptId,
          sessionId: view.sessionId,
          activityNo: spareNo,
          input: {
            v: INPUT_VERSION,
            kind: "question",
            step: "final",
            heard: ["Max and Ted eat rice."],
            failures: 0,
            slot: "spare",
            judge: {
              meaning: "ok",
              bundle: "accepted",
              final: "correct",
              by: "app",
              expressionDone: true,
            },
          },
        },
      ],
      sessionDeps(),
    );
    expect(saved).toMatchObject({ ok: true, rejected: [] });
    expect(await attemptOf(clientAttemptId)).toMatchObject({
      score: null,
      input: {
        judge: {
          meaning: "ok",
          bundle: "meaning",
          final: "correct",
          by: "app",
          communicative: true,
          expressionDone: false,
        },
      },
    });
  });

  it("AC-22k A9 확정 전: 의사소통 정답('Yes, they do.', AI 부분)으로 끝낸 세션과 accepted 로 끝낸 세션의 세션 점수가 같고 단원 판정 입력에 의사소통 정답의 수준 값이 없다 · AC-N19 말하기 3단계 가르치는 수업 몫: AI 호출은 혼자 질문 답 판정 넷뿐이다", async () => {
    async function run(
      lastAnswer: string,
      lastJudgement: "correct" | "partial",
    ) {
      await freshSpeakingHousehold(db, SAVED_AT);
      const view = await openTeachSpeaking(db, NOW);
      const { fake, deps } = speakingHarness(
        db,
        questions.map((q, i) => ({
          reply: answerReply(i === 3 ? lastJudgement : "correct"),
          when: { bodyIncludes: q.en },
        })),
        NOW,
      );
      for (const [i, q] of questions.entries()) {
        const transcript = i === 3 ? lastAnswer : (q.accepted?.[0] ?? "");
        expect((await answer(view, i, transcript, deps)).out).toMatchObject({
          ok: true,
          judgement: "correct",
        });
      }
      expect(await finishWithAppFinals(view)).toEqual({
        ok: true,
        already: false,
      });
      const [session] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, view.sessionId));
      const profile = await readHouseholdProfile({ db });
      if (!profile) throw new Error("프로필 없음");
      const progress = await db
        .select()
        .from(unitProgress)
        .where(
          and(
            eq(unitProgress.profileId, profile.id),
            eq(unitProgress.area, "speaking"),
          ),
        );
      const calls = await db
        .select()
        .from(aiCalls)
        .where(eq(aiCalls.sessionId, view.sessionId));
      return { session, progress, calls, requests: fake.requests.length };
    }
    const accepted = await run(Q(3).accepted?.[0] ?? "", "correct");
    const communicative = await run("Yes, they do.", "partial");
    expect(accepted.session?.status).toBe("completed");
    expect(communicative.session?.status).toBe("completed");
    expect(communicative.session?.score).toBe(accepted.session?.score);
    expect(communicative.session?.score).not.toBeNull();
    // 단원 판정 입력(단원 진행 행)에 의사소통 정답 표시 · '부분' 낮춤이 새지 않는다(C182 (3))
    for (const row of communicative.progress) {
      const text = JSON.stringify(row);
      expect(text).not.toContain("communicative");
      expect(text).not.toContain("partial");
    }
    // 새 자리(같이 해 보기 · 본보기 · 짝)는 AI 를 부르지 않는다
    for (const r of [accepted, communicative]) {
      expect(r.requests).toBe(questions.length);
      expect(r.calls).toHaveLength(questions.length);
      expect(r.calls.every((c) => c.purpose === "speaking_eval")).toBe(true);
    }
  });
});

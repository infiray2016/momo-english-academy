// 세션 바탕 서버(plan-p11a 파일별 값 5 · 8 · 위험 2 · 4, 5절 sessions · attempts · 전이 표 · 8절 네트워크 끊김, 13절 C76).
// 시험 DB 에 시험용 시드(1단계, 작은 틀)를 넣고 첫 실행(읽기 · 말하기 1단계) 뒤 본다. 시도 입력은 화면이 보내는 꼴(값 2) 그대로이고,
// 기대 점수 · 단어별 정오는 수업 내용에서 시험 안에서 따로 세운다. 설계 숫자는 시험용 설정(TEST_SETTINGS)에서 읽는다.
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
  vi,
} from "vitest";
import { learningDayOf } from "@/core/learning-day";
import { AVATARS, TOPIC_BUNDLES } from "@/core/profile/start";
import type { Activity } from "@/core/session/preview";
import { lessons } from "@/db/schema/content";
import { attempts, profiles, sessions } from "@/db/schema/learning";
import { parentAlerts, parentAuth } from "@/db/schema/operations";
import type { Db } from "@/server/db";
import { saveFirstRun } from "@/server/profile";
import { loadSeed } from "@/server/seed/load";
import {
  finishLessonSession,
  loadSessionView,
  type SessionView,
  saveSessionAttempts,
  startLessonSession,
} from "@/server/session";
import { loadResultView } from "@/server/session/result";
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
const LATER = new Date("2026-10-17T20:30:00+09:00");
const WEIGHTS = {
  a: TEST_SETTINGS["speaking.match_weight"].value,
  L: TEST_SETTINGS["speaking.listening_weight"].value,
};

let testDb: TestDatabase;
let db: Db;
const deps = (at = NOW) => ({ db, now: () => at, homophones: () => [] });

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
      englishName: "Momo",
      avatar: AVATARS[0].id,
      topicBundle: TOPIC_BUNDLES[0].id,
      alphabetUnknown: false,
      startLevels: { reading: 1, speaking: 1 },
      mic: { result: "not_checked" },
    },
    { db, now: () => SAVED_AT },
  );
  if (!saved.ok) throw new Error("첫 실행 저장 실패");
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function lessonOf(area: "reading" | "speaking", lessonNo = 1) {
  const [row] = await db
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, area),
        eq(lessons.level, 1),
        eq(lessons.unit, 1),
        eq(lessons.kind, "assigned"),
        eq(lessons.lessonNo, lessonNo),
        eq(lessons.topicVariant, 1),
      ),
    );
  if (!row) throw new Error("수업 행 없음");
  return row;
}

async function open(
  area: "reading" | "speaking",
): Promise<SessionView & { area: typeof area }> {
  const started = await startLessonSession(
    { lessonId: (await lessonOf(area)).id, confirmAbort: false },
    deps(),
  );
  if (!started.ok) throw new Error(`세션이 열려야 한다: ${started.reason}`);
  const view = await loadSessionView({ sessionId: started.sessionId }, deps());
  if (view?.area !== area) throw new Error("세션 화면 자료 없음");
  return view as SessionView & { area: typeof area };
}

const attempt = (
  sessionId: string,
  activityNo: number,
  input: unknown,
  clientAttemptId: string = randomUUID(),
) => ({ clientAttemptId, sessionId, activityNo, input });
const final = (kind: string, content: Record<string, unknown>) => ({
  v: 1,
  kind,
  step: "final",
  ...content,
});

/** 읽기 수업의 끝 시도 전부(문항은 firstTry(문항 번호) 가 첫 고름, 둘째는 정답). */
function readingFinals(
  view: SessionView,
  firstTry: (index: number, answerNo: number) => number = (_, n) => n,
) {
  if (view.area !== "reading") throw new Error("읽기가 아니다");
  return view.activities.map((activity, i) => {
    const no = i + 1;
    if (activity.kind === "preview")
      return attempt(view.sessionId, no, {
        shownWords: view.preview.map((w) => w.word),
      });
    if (activity.kind === "reading-passage")
      return attempt(
        view.sessionId,
        no,
        final("reading-passage", { tappedWords: [] }),
      );
    if (activity.kind !== "reading-question") throw new Error("모르는 활동");
    const q = view.lesson.content.questions[activity.index];
    if (!q) throw new Error("문항 없음");
    const first = firstTry(activity.index, q.answerNo);
    return attempt(
      view.sessionId,
      no,
      final("reading-question", {
        tries: first === q.answerNo ? [first] : [first, q.answerNo],
      }),
    );
  });
}
const wrongOf = (answerNo: number) => (answerNo === 1 ? 2 : 1);

async function rowsOf(sessionId: string) {
  return db
    .select()
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId))
    .orderBy(attempts.activityNo);
}

describe("세션 바탕", () => {
  it("세션 바탕: 서버가 저장 때 다시 채점해 attempts 의 score · word_results · word_count 를 쓰고 화면이 보낸 점수는 받지 않는다", async () => {
    const view = await open("reading");
    if (view.area !== "reading") throw new Error();
    // 첫 문항은 처음에 틀리고 둘째에 맞힘, 나머지는 처음에 맞힘
    const batch = readingFinals(view, (index, n) =>
      index === 0 ? wrongOf(n) : n,
    );
    const out = await saveSessionAttempts(batch, deps());
    expect(out).toEqual({
      ok: true,
      accepted: batch.map((a) => a.clientAttemptId),
      rejected: [],
    });
    const rows = await rowsOf(view.sessionId);
    expect(rows).toHaveLength(view.activities.length);
    view.activities.forEach((activity, i) => {
      const row = rows[i];
      if (activity.kind !== "reading-question") {
        expect(row?.score).toBeNull();
        expect(row?.wordResults).toBeNull();
        return;
      }
      const q = view.lesson.content.questions[activity.index];
      if (!q) throw new Error();
      const correct = activity.index !== 0;
      expect(row?.score).toBe(correct ? 1 : 0);
      expect(row?.wordCount).toBeNull();
      // 그림 문항의 정답 보기 낱말이 단원 단어면 그 낱말 하나, 첫 시도 정오(C76)
      const word = q.kind === "picture" ? q.options[q.answerNo - 1] : undefined;
      const expected =
        word && view.lesson.unitWords.includes(word)
          ? [{ word, correct }]
          : null;
      expect(row?.wordResults).toEqual(expected);
    });
    // 화면이 점수 칸을 붙여 보내면 그 시도는 꼴이 틀린 것으로 거부된다
    const q0 = view.activities.findIndex((a) => a.kind === "reading-question");
    const forged = attempt(view.sessionId, q0 + 1, {
      ...final("reading-question", { tries: [1] }),
      score: 1,
    });
    expect(await saveSessionAttempts([forged], deps())).toEqual({
      ok: true,
      accepted: [],
      rejected: [forged.clientAttemptId],
    });
    expect(await rowsOf(view.sessionId)).toHaveLength(view.activities.length);
  });

  it("세션 바탕: 꼴이 틀린 시도는 그 시도만 거부되고 나머지는 받는다", async () => {
    const view = await open("reading");
    const questionNo =
      view.activities.findIndex((a) => a.kind === "reading-question") + 1;
    const good = attempt(view.sessionId, 1, { shownWords: [] });
    const badShape = attempt(
      view.sessionId,
      questionNo,
      final("reading-question", { tries: [] }),
    );
    const wrongKind = attempt(
      view.sessionId,
      1,
      final("reading-question", { tries: [1] }),
    );
    const beyond = attempt(
      view.sessionId,
      view.activities.length + 1,
      final("reading-passage", { tappedWords: [] }),
    );
    const notUuid = attempt(
      view.sessionId,
      1,
      { shownWords: [] },
      "not-a-uuid",
    );
    const out = await saveSessionAttempts(
      [good, badShape, wrongKind, beyond, notUuid],
      deps(),
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.accepted).toEqual([good.clientAttemptId]);
    expect([...out.rejected].sort()).toEqual(
      [
        badShape.clientAttemptId,
        wrongKind.clientAttemptId,
        beyond.clientAttemptId,
        notUuid.clientAttemptId,
      ].sort(),
    );
    expect(
      (await rowsOf(view.sessionId)).map((r) => r.clientAttemptId),
    ).toEqual([good.clientAttemptId]);
    // 시도 id 조차 없는 묶음 · 빈 묶음은 통째로 꼴이 틀림(P10 과 같음)
    expect(await saveSessionAttempts([{ nope: 1 }], deps())).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await saveSessionAttempts([], deps())).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("세션 바탕: 끝내기는 모든 활동의 끝 시도가 있어야 되고 학습일 · 점수 · 완료 시각 · 영어로 말한 문장 수를 채우며 두 번 불러도 같다", async () => {
    const view = await open("reading");
    if (view.area !== "reading") throw new Error();
    const batch = readingFinals(view, (index, n) =>
      index === 0 ? wrongOf(n) : n,
    );
    // 마지막 활동이 없으면 incomplete(빠진 활동 번호)
    await saveSessionAttempts(batch.slice(0, -1), deps());
    expect(
      await finishLessonSession({ sessionId: view.sessionId }, deps()),
    ).toEqual({
      ok: false,
      reason: "incomplete",
      missing: [view.activities.length],
    });
    const [still] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, view.sessionId));
    expect(still?.status).toBe("in_progress");

    await saveSessionAttempts(batch.slice(-1), deps());
    expect(
      await finishLessonSession({ sessionId: view.sessionId }, deps()),
    ).toEqual({ ok: true, already: false });
    const questions = view.lesson.content.questions.length;
    const [done] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, view.sessionId));
    expect(done).toMatchObject({
      status: "completed",
      completedAt: NOW,
      learningDay: learningDayOf(
        NOW,
        TEST_SETTINGS["app.timezone"].value,
        TEST_SETTINGS["app.day_start_hour"].value,
      ),
      englishSentences: 0,
    });
    // 첫 시도 정답 수 ÷ 문항 수(3.7)
    expect(done?.score).toBe((questions - 1) / questions);

    // 두 번 불러도 같다(나중 시각으로 불러도 바뀌지 않음)
    expect(
      await finishLessonSession({ sessionId: view.sessionId }, deps(LATER)),
    ).toEqual({ ok: true, already: true });
    const [again] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, view.sessionId));
    expect(again).toEqual(done);
    // 끝난 세션의 늦은 시도는 받은 것으로 치고 버린다
    const late = attempt(view.sessionId, 1, { shownWords: [] });
    expect(await saveSessionAttempts([late], deps(LATER))).toEqual({
      ok: true,
      accepted: [late.clientAttemptId],
      rejected: [],
    });
    expect(await rowsOf(view.sessionId)).toHaveLength(view.activities.length);
    // 화면 자료는 끝난 세션이면 없다(쪽이 결과로)
    expect(
      await loadSessionView({ sessionId: view.sessionId }, deps()),
    ).toBeUndefined();
    // 남의(없는) 세션은 거부
    expect(
      await finishLessonSession({ sessionId: randomUUID() }, deps()),
    ).toEqual({ ok: false, reason: "not_found" });
    expect(
      await finishLessonSession({ sessionId: "not-a-uuid" }, deps()),
    ).toEqual({ ok: false, reason: "invalid" });
  });

  it("세션 바탕: 말하기 1단계 세션은 서버가 따라 말하기 · 듣기 · 질문 답을 채점해 3.7 식으로 끝내고 인식 글이 있는 발화 수를 남긴다", async () => {
    const view = await open("speaking");
    if (view.area !== "speaking") throw new Error();
    const c = view.lesson.content;
    let utterances = 0;
    let firstSentenceRate = 1;
    const batch = view.activities.map((activity: Activity, i) => {
      const no = i + 1;
      switch (activity.kind) {
        case "preview":
          return attempt(view.sessionId, no, { shownWords: [] });
        case "repeat-word": {
          utterances += 1;
          return attempt(
            view.sessionId,
            no,
            final("repeat-word", {
              heard: [c.repeat.words[activity.index]],
              failures: 0,
            }),
          );
        }
        case "repeat-sentence": {
          const sentence = c.repeat.sentences[activity.index] ?? "";
          const words = sentence.replace(/[.!?]/g, "").split(" ");
          // 첫 문장은 앞 두 낱말만 말함
          const heard =
            activity.index === 0 ? words.slice(0, 2).join(" ") : sentence;
          if (activity.index === 0) firstSentenceRate = 2 / words.length;
          utterances += 1;
          return attempt(
            view.sessionId,
            no,
            final("repeat-sentence", { heard: [heard], failures: 0 }),
          );
        }
        case "listening": {
          const l = c.listening[activity.index];
          return attempt(
            view.sessionId,
            no,
            final("listening", { tries: [l?.answerNo ?? 1] }),
          );
        }
        case "question": {
          const q = c.questions[activity.index];
          utterances += 1;
          return attempt(
            view.sessionId,
            no,
            final("question", { heard: [q?.accepted?.[0] ?? ""], failures: 0 }),
          );
        }
        default:
          throw new Error(`1단계에 없는 활동 ${activity.kind}`);
      }
    });
    const saved = await saveSessionAttempts(batch, deps());
    expect(saved).toMatchObject({ ok: true, rejected: [] });
    expect(
      await finishLessonSession({ sessionId: view.sessionId }, deps()),
    ).toEqual({ ok: true, already: false });
    const [done] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, view.sessionId));
    const repeats = c.repeat.words.length + c.repeat.sentences.length;
    const R = (repeats - 1 + firstSentenceRate) / repeats;
    const expected =
      (1 - WEIGHTS.L) * (WEIGHTS.a * R + (1 - WEIGHTS.a) * 1) + WEIGHTS.L * 1;
    expect(done?.score).toBeCloseTo(expected, 12);
    expect(done?.englishSentences).toBe(utterances);
    // 따라 말하기 시도에 말한 낱말 수가 남는다
    const rows = await rowsOf(view.sessionId);
    const firstSentence = view.activities.findIndex(
      (a) => a.kind === "repeat-sentence",
    );
    expect(rows[firstSentence]?.wordCount).toBe(2);
    expect(rows[firstSentence]?.score).toBeCloseTo(firstSentenceRate, 12);
  });

  it("세션 바탕: 화면 자료는 끝 시도가 없는 가장 앞 활동에서 열고 음성 · 결과 말 · 말하기 설정과 앱 판정 여부를 넘긴다", async () => {
    const view = await open("speaking");
    expect(view.current).toBe(1);
    expect(view.finals).toEqual([]);
    expect(view.config.ui.matchPhraseLevels).toEqual(
      TEST_SETTINGS["ui.match_phrase_levels"].value,
    );
    expect(view.config.ui.autoNextSeconds).toBe(
      TEST_SETTINGS["ui.auto_next_seconds"].value,
    );
    expect(view.config.speaking.answerMatchPass).toBe(
      TEST_SETTINGS["speaking.answer_match_pass"].value,
    );
    expect(view.config.maxRetries).toBe(
      TEST_SETTINGS["speech.max_retries"].value,
    );
    expect(view.config.speech.lang).toBe(TEST_SETTINGS["speech.lang"].value);
    // 시험용 시드 1단계 말하기는 허용 답 앱 판정(level_specs questions.acceptedMin > 0)
    expect(view.appJudged).toBe(true);
    // 뒤 활동(서버 액션이 먼저 저장한 꼴)만 있으면 앞의 빈 활동에서
    await saveSessionAttempts(
      [
        attempt(
          view.sessionId,
          3,
          final(view.activities[2]?.kind ?? "", {
            heard: ["x"],
            failures: 0,
          }),
        ),
      ],
      deps(),
    );
    const reopened = await loadSessionView(
      { sessionId: view.sessionId },
      deps(),
    );
    expect(reopened?.current).toBe(1);
    expect(reopened?.finals).toEqual([3]);
    // 진행 시도는 자리를 옮기지 않는다
    await saveSessionAttempts(
      [
        attempt(view.sessionId, 1, {
          ...final("preview", { shownWords: [] }),
          step: "progress",
        }),
      ],
      deps(),
    );
    expect(
      (await loadSessionView({ sessionId: view.sessionId }, deps()))?.current,
    ).toBe(1);
  });

  it("세션 바탕: DB 오류 로그에 시도 입력 글이 없다", async () => {
    const view = await open("reading");
    const secret = "모모가 고른 비밀 답 글";
    const error = Object.assign(
      new Error(`Failed query: insert into "attempts" params: ${secret}`),
      { cause: Object.assign(new Error(secret), { code: "XX000" }) },
    );
    // 쓰기(insert · transaction)만 실패하는 연결
    const failing = new Proxy(db, {
      get(target, prop) {
        if (prop === "insert" || prop === "transaction" || prop === "update")
          return () => {
            throw error;
          };
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as Db;
    const logged: string[] = [];
    for (const method of ["error", "warn", "log", "info"] as const)
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(" "));
      });
    const out = await saveSessionAttempts(
      [
        attempt(
          view.sessionId,
          2,
          final("reading-passage", { tappedWords: [secret] }),
        ),
      ],
      { db: failing, now: () => NOW, homophones: () => [] },
    );
    expect(out).toEqual({ ok: false, reason: "unavailable" });
    const finished = await finishLessonSession(
      { sessionId: view.sessionId },
      { db: failing, now: () => NOW, homophones: () => [] },
    );
    expect(finished).toEqual({ ok: false, reason: "unavailable" });
    expect(logged.length).toBeGreaterThan(0);
    for (const line of logged) {
      expect(line).not.toContain(secret);
      expect(line).not.toContain("Failed query");
    }
  });
});

describe("결과 틀", () => {
  it("결과 틀: 끝난 세션의 결과 자료는 영역 · 제목과 다음 수업(목록의 '여기부터 해요')을 주고 진행 세션 · 남의 세션은 없다", async () => {
    const view = await open("reading");
    expect(
      await loadResultView({ sessionId: view.sessionId }, deps()),
    ).toBeUndefined();
    await saveSessionAttempts(readingFinals(view), deps());
    expect(
      await finishLessonSession({ sessionId: view.sessionId }, deps()),
    ).toMatchObject({ ok: true });
    const result = await loadResultView({ sessionId: view.sessionId }, deps());
    expect(result).toMatchObject({
      area: "reading",
      level: 1,
      unit: 1,
      title: view.title,
    });
    // 다음 배정 수업이 '다음 수업'이다
    const next = await lessonOf("reading", 2);
    expect(result?.next).toEqual({ kind: "lesson", lessonId: next.id });
    expect(
      await loadResultView({ sessionId: randomUUID() }, deps()),
    ).toBeUndefined();
    expect(
      await loadResultView({ sessionId: "not-a-uuid" }, deps()),
    ).toBeUndefined();
  });
});

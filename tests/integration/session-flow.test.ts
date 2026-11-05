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
import {
  type AttemptInput,
  lemmaLookup,
  parseAttemptInput,
} from "@/core/session/attempt";
import type { Activity } from "@/core/session/preview";
import { outcomeContextOf, sparesFromFinals } from "@/core/session/spares";
import { spareChoiceOnDevice } from "@/core/session/teach-frame";
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
import { teachSeedLessons } from "../fixtures/seed/builders";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import { TEST_SETTINGS } from "../fixtures/settings";
import { createTestDatabase, type TestDatabase } from "./test-db";

/** 초 → ms(음성 설정의 초 값을 ms 로 견줌). */
const MS_PER_SECOND = 1000;

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
  it("결과 틀 · U4-1: 끝난 세션의 결과 자료는 영역 · 제목 · 다음 수업(목록의 '여기부터 해요') · 오늘 만난 단어를 주고 진행 세션 · 남의 세션은 없다", async () => {
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
      // 결과의 별 수는 서버가 실은 설정값(C167 (5) · 검토 B N-3)
      starsPerLesson: TEST_SETTINGS["reward.star_complete"].value,
    });
    // 다음 배정 수업이 '다음 수업'이다
    const next = await lessonOf("reading", 2);
    expect(result?.next).toEqual({ kind: "lesson", lessonId: next.id });
    // U4-1 오늘 만난 단어 = 이 세션 미리보기에 보인 단어(차례 그대로)와 뜻(C166 R3)
    expect(view.preview.length).toBeGreaterThan(0);
    expect(result?.metWords).toEqual(
      view.preview.map((w) => ({ word: w.word, meaningKo: w.meaningKo })),
    );
    expect(
      await loadResultView({ sessionId: randomUUID() }, deps()),
    ).toBeUndefined();
    expect(
      await loadResultView({ sessionId: "not-a-uuid" }, deps()),
    ).toBeUndefined();
  });
});

// 가르치는 수업 짝(가르치고 배우는 수업 plan 나 · 정한 것 3 · 4). 시험 시드(1단계)의 읽기 세션을 연 뒤, 3단계 단원 1 정규 시드 읽기
// 수업(teach 칸이 든 수업)을 복제한 수업 행으로 세션을 옮겨 본다. 짝 상한은 시험용 설정 고정값(seed/settings.json 과 같은 값)이다.
// 시험 이름은 정본 15절 번호(AC-3e, 델타 AC-2c)다.
describe("가르치는 수업 짝", () => {
  const teach = teachSeedLessons().reading;
  /** 짝 상한(lesson.spares_per_session.reading — 시험용 설정 고정값, 적재 설정에 함께 든다). */
  const cap = TEST_SETTINGS["lesson.spares_per_session.reading"].value;
  let teachLessonId = "";

  beforeAll(async () => {
    const { id: _id, ...base } = await lessonOf("reading");
    const [row] = await db
      .insert(lessons)
      .values({
        ...base,
        // 시험 시드에 없는 수업 번호(같은 칸 유일 색인을 피함)
        lessonNo: base.lessonNo + 90,
        content: teach,
        newWords: teach.newWords,
        unitWords: teach.unitWords,
      })
      .returning({ id: lessons.id });
    if (!row) throw new Error("가르치는 수업 행 없음");
    teachLessonId = row.id;
  });

  /** 1단계 읽기 세션을 열고 그 세션의 수업 행을 가르치는 수업으로 바꾼 뒤 화면 자료를 다시 읽는다. */
  async function openTeach(): Promise<SessionView & { area: "reading" }> {
    const started = await open("reading");
    await db
      .update(sessions)
      .set({ lessonId: teachLessonId })
      .where(eq(sessions.id, started.sessionId));
    const view = await loadSessionView(
      { sessionId: started.sessionId },
      deps(),
    );
    if (view?.area !== "reading") throw new Error("세션 화면 자료 없음");
    return view;
  }

  const v2 = (kind: string, content: Record<string, unknown> = {}) => ({
    v: 2,
    kind,
    step: "final",
    ...content,
  });

  /** 혼자 해 보기까지의 끝 시도(짝 활동 빼고). wrong 에 든 문항은 첫 시도에 틀리고 둘째에 맞힌다. */
  function soloFinals(view: SessionView, wrong: readonly number[]) {
    if (view.area !== "reading") throw new Error("읽기가 아니다");
    return view.activities.flatMap((activity, i) => {
      const no = i + 1;
      switch (activity.kind) {
        case "today":
          return [attempt(view.sessionId, no, v2("today"))];
        case "preview":
          return [
            attempt(
              view.sessionId,
              no,
              v2("preview", { shownWords: view.preview.map((w) => w.word) }),
            ),
          ];
        case "model":
          return [
            attempt(view.sessionId, no, v2("model", { index: activity.index })),
          ];
        case "together": {
          const item = teach.teach?.together[activity.index];
          if (!item) throw new Error("같이 해 보기 없음");
          return [
            attempt(
              view.sessionId,
              no,
              v2("together", {
                index: activity.index,
                tries: [{ choice: item.answerNo }],
              }),
            ),
          ];
        }
        case "reading-passage":
          return [
            attempt(
              view.sessionId,
              no,
              v2("reading-passage", { tappedWords: [] }),
            ),
          ];
        case "reading-question": {
          const q = view.lesson.content.questions[activity.index];
          if (!q) throw new Error("문항 없음");
          const tries = wrong.includes(activity.index)
            ? [wrongOf(q.answerNo), q.answerNo]
            : [q.answerNo];
          return [
            attempt(view.sessionId, no, v2("reading-question", { tries })),
          ];
        }
        default:
          return [];
      }
    });
  }

  /** 짝 활동의 끝 시도(짝 보기의 정답). */
  function spareFinal(view: SessionView, no: number) {
    const activity = view.activities[no - 1];
    if (view.area !== "reading" || activity?.kind !== "spare")
      throw new Error("짝 활동이 아니다");
    const spare = view.lesson.content.questions[activity.index]?.spare;
    if (!spare) throw new Error("짝 없음");
    return attempt(
      view.sessionId,
      no,
      v2("reading-question", { tries: [spare.answerNo], slot: "spare" }),
    );
  }

  /** 기기가 같은 함수로 고른 짝(대기열의 첫 시도 · 화면 자료의 설정 — 위험 2). */
  function deviceChoice(
    view: SessionView,
    batch: readonly { activityNo: number; input: unknown }[],
  ) {
    const finals = new Map<number, AttemptInput>();
    for (const a of batch) {
      const input = parseAttemptInput(a.input);
      if (input?.step === "final" && !finals.has(a.activityNo))
        finals.set(a.activityNo, input);
    }
    if (!view.spares) throw new Error("짝 자료 없음");
    return sparesFromFinals({
      activities: view.activities,
      lesson: view.lesson,
      finals,
      ctx: {
        answerMatchPass: view.config.speaking.answerMatchPass,
        homophones: view.homophones,
        unitWords: view.lesson.unitWords,
        lemmaOf: lemmaLookup(view.lemmaEntries),
        appJudgedQuestions: view.appJudged,
        repeatGoodRate: view.config.ui.matchPhraseLevels[0],
        meaningWords: view.meaningWords,
      },
      cap: view.spares.cap,
    });
  }

  it("AC-3e 가르치는 수업 짝: 서버가 저장된 첫 시도로 고른 낼 짝이 기기와 같고 짝 활동 도중 닫았다 열면 같은 짝에서 이어지며 끝내기는 내지 않은 짝을 끝난 것으로 센다", async () => {
    const view = await openTeach();
    expect(view.activities[0]).toEqual({ kind: "today" });
    const spareNos = view.activities.flatMap((a, i) =>
      a.kind === "spare" ? [i + 1] : [],
    );
    expect(spareNos.length).toBe(teach.content.questions.length);
    // 아직 혼자 첫 시도가 없으면 낼 짝이 없다(서버가 센 혼자 첫 시도 결과도 없음 — 라-2 화면 자료 칸 outcomes)
    expect(view.spares).toEqual({
      show: [],
      skip: spareNos,
      cap,
      outcomes: [],
    });

    const solo = soloFinals(view, [0, 2]);
    const device = deviceChoice(view, solo);
    expect(device.show.length).toBe(Math.min(2, Number(cap)));
    expect(await saveSessionAttempts(solo, deps())).toMatchObject({
      ok: true,
      rejected: [],
    });
    const reopened = await loadSessionView(
      { sessionId: view.sessionId },
      deps(),
    );
    expect(reopened?.spares).toMatchObject({ ...device, cap });
    // 다른 기기에서 이어 하면(대기열 없음) 서버가 센 결과(outcomes)만으로 같은 짝을 고른다(장부 L-34 서버 값 합치기)
    if (!reopened?.spares) throw new Error("짝 자료 없음");
    expect(
      spareChoiceOnDevice({
        activities: reopened.activities,
        lesson: reopened.lesson,
        server: reopened.spares,
        attempts: [],
        ctx: outcomeContextOf(reopened),
      }),
    ).toEqual(device);
    const [first, second] = device.show;
    if (first === undefined || second === undefined)
      throw new Error("낼 짝이 둘이어야 한다");
    expect(reopened?.current).toBe(first);

    // 내지 않은 짝의 시도는 받지 않는다(서버가 다시 고른 짝만)
    const notShown = device.skip[0];
    if (notShown === undefined) throw new Error("내지 않은 짝 없음");
    const firstSpare = spareFinal(view, first);
    const stray = spareFinal(view, notShown);
    expect(await saveSessionAttempts([firstSpare, stray], deps())).toEqual({
      ok: true,
      accepted: [firstSpare.clientAttemptId],
      rejected: [stray.clientAttemptId],
    });
    // 짝 시도는 점수가 없다
    const rows = await rowsOf(view.sessionId);
    expect(rows.find((r) => r.activityNo === first)?.score).toBeNull();

    // 둘째 짝 도중 닫았다 열면 같은 짝에서
    expect(
      (await loadSessionView({ sessionId: view.sessionId }, deps()))?.current,
    ).toBe(second);
    expect(
      await finishLessonSession({ sessionId: view.sessionId }, deps()),
    ).toEqual({ ok: false, reason: "incomplete", missing: [second] });
    await saveSessionAttempts([spareFinal(view, second)], deps());
    expect(
      await finishLessonSession({ sessionId: view.sessionId }, deps()),
    ).toEqual({ ok: true, already: false });
    // 세션 점수는 혼자 첫 시도만(3.7)
    const questions = teach.content.questions.length;
    const [done] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, view.sessionId));
    expect(done?.score).toBe((questions - 2) / questions);
    // 오늘 만난 단어는 활동 2 의 판 2 미리보기 시도에서 읽는다(정한 것 4)
    const result = await loadResultView({ sessionId: view.sessionId }, deps());
    expect(result?.metWords.map((w) => w.word)).toEqual(
      view.preview.map((w) => w.word),
    );
    // AC-6g 되짚기: 틀린 두 문항은 짝 첫 시도에 맞혀 해냄이고 도움이 없으니 모두 독립 해냄이다(유효 문항 수 · 비율이 시험 설정 문턱 이상)
    expect(questions).toBeGreaterThanOrEqual(
      TEST_SETTINGS["lesson.recap_min_evidence"].value,
    );
    expect(result?.recap).toEqual({
      line: "closeKo",
      evidence: { valid: questions, done: questions, ratio: 1 },
    });
    // AC-6f 되짚기 화면 몫(라-4 fix 1 M2): 고른 줄(closeKo)의 시드 글 · 문장 틀 · 칩(글 · role), 선생님은 고르기 전 null, 음성 설정은 결과마다
    const seedRecap = teach.teach?.recap;
    if (!seedRecap) throw new Error("견본 수업에 teach.recap 없음");
    expect(result?.recapView).toEqual({
      lineKo: seedRecap.closeKo,
      frame: {
        frameEn: seedRecap.frameEn,
        chips: seedRecap.chips.map((c) => ({ text: c.text, role: c.role })),
      },
      teacher: null,
    });
    expect(result?.speech).toMatchObject({
      skipNoticeMs:
        TEST_SETTINGS["speech.skip_notice_seconds"].value * MS_PER_SECOND,
      readKo: TEST_SETTINGS["speech.read_ko"].value,
    });
    // 다시 하기 결과도 첫머리(마무리 한 줄 · 선생님)는 있고 문장 틀은 없다(정본 03:26 — 오늘 만난 말을 두지 않음, fix 1 I1)
    await db
      .update(sessions)
      .set({ kind: "retry" })
      .where(eq(sessions.id, view.sessionId));
    const retried = await loadResultView({ sessionId: view.sessionId }, deps());
    expect(retried?.recapView).toEqual({
      lineKo: seedRecap.closeKo,
      frame: null,
      teacher: null,
    });
  });

  it("AC-3e 가르치는 수업 짝: 혼자 첫 시도와 짝 시도가 한 묶음에 와도 서버가 묶음 앞의 첫 시도로 짝을 고르고 다 맞히면 짝 없이 끝난다", async () => {
    const view = await openTeach();
    const solo = soloFinals(view, [1]);
    const [only] = deviceChoice(view, solo).show;
    if (only === undefined) throw new Error("낼 짝 없음");
    const spare = spareFinal(view, only);
    expect(await saveSessionAttempts([...solo, spare], deps())).toMatchObject({
      ok: true,
      rejected: [],
    });
    expect(
      await finishLessonSession({ sessionId: view.sessionId }, deps()),
    ).toEqual({ ok: true, already: false });

    const clean = await openTeach();
    await saveSessionAttempts(soloFinals(clean, []), deps());
    expect(
      await finishLessonSession({ sessionId: clean.sessionId }, deps()),
    ).toEqual({ ok: true, already: false });
  });
});

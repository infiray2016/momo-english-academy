// 말하기 1~2 세션 e2e(3.3 말하기 · 4절 말하기 세션 행 · 7절 인식 규칙 · AC-5b · 5c · 5e · 5f · N3, plan-p11a 값 12 · 증명 표).
// 가짜 Web Speech(P2b)의 대본을 시험 안에서 수업 문장으로 만든다(start() 마다 차례로 하나). 진행 세션을 DB 에 넣고 주소로 연다.
// 시험 숫자(결과 말 경계 · 저절로 넘김 초 · 끝 조용함 · 재시도 수 · 말소리 없음 수 · 규격 분량)는 시험용 설정 · DB 단계 규격에서 읽는다.
// 녹음하지 않는다(브라우저 인식만). 화면 검토 사진은 E2E_PHOTOS 때만.
import type { BrowserContext, Page } from "@playwright/test";
import { and, eq, gte } from "drizzle-orm";
import { matchRate } from "../../src/core/speech/match-rate";
import type {
  RecognitionRun,
  SpeechScript,
} from "../../src/core/speech/script";
import { lessons } from "../../src/db/schema/content";
import { attempts, sessions } from "../../src/db/schema/learning";
import {
  aiCalls,
  aiStatus,
  parentAlerts,
} from "../../src/db/schema/operations";
import type { FakeSpeechRecord } from "../../src/lib/speech/fake-web-speech";
import {
  defaultSettings,
  referenceSet,
  speakingLesson,
} from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";
import { CHILD_VIEWPORTS } from "./child-size";
import {
  cloneLessons,
  closeE2eDb,
  countRows,
  e2eDb,
  insertSessions,
  resetHousehold,
} from "./db";
import { expect, loadSpeechScript, speechPage, test } from "./fixtures";
import { insertHousehold } from "./household";
import { atLevel, insertSampleLesson, levelSpecOf } from "./lessons";
import { photo } from "./photos";

const T = {
  next: "다음",
  speak: "말하기",
  oneMore: "한 번 더 말하기",
  retry: "다시 한 번 말해 볼까요",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  together: "같이 말해 볼까요",
  good: "잘 말했어요",
  close: "거의 다 맞았어요",
  again: "한 번 더 들어 볼까요",
  right: "맞았어요!",
  answerIs: "정답은 이거예요",
  listenAgain: "한 번 더 듣기",
  micOk: "알겠어요",
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  stalled: "마이크가 잘 안 돼요. 부모님께 말해 주세요",
  silent: "말소리가 잘 안 들려요. 부모님께 말해 주세요",
  home: "홈",
  finished: "수업을 끝냈어요!",
} as const;
const LONG = 180_000;
/** 감시 타이머 둘을 기다리는 동안(15 + 3초 × 2 와 여유). */
const STALL_WAIT_MS = 60_000;
const MS = 1000;
const MAX_RETRIES = TEST_SETTINGS["speech.max_retries"].value;
const SILENT_ITEMS = TEST_SETTINGS["speech.silent_items_max"].value;
const AUTO_NEXT_MS = TEST_SETTINGS["ui.auto_next_seconds"].value * MS;
/** 결과가 오는 때(대본 안 ms). */
const RESULT_AT = 400;

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

const DEFAULT_OK = loadSpeechScript("default-ok");
/** 한 문장을 말하고 조용해지는 듣기(앱이 stop 하면 끝). */
const said = (text: string): RecognitionRun => ({
  events: [
    { at: 50, type: "start" },
    { at: 100, type: "audiostart" },
    { at: 200, type: "speechstart" },
    {
      at: RESULT_AT,
      type: "result",
      results: [{ transcript: text, isFinal: true }],
    },
  ],
  onStop: [{ at: 50, type: "end" }],
});
const failing = (error: string, at = 100): RecognitionRun => ({
  events: [
    { at: 50, type: "start" },
    { at, type: "error", error },
    { at: at + 10, type: "end" },
  ],
});
function script(runs: RecognitionRun[]): SpeechScript {
  return {
    name: "speaking-e2e",
    source: "손으로 씀 — 말하기 세션 e2e(시험 안에서 수업 문장으로 만듦)",
    recognitions: runs,
    ...(DEFAULT_OK.synthesis ? { synthesis: DEFAULT_OK.synthesis } : {}),
  };
}

type SpeakingContent = {
  repeat: { words: string[]; sentences: string[] };
  listening: { answerNo: number }[];
  questions: { en: string; modelAnswer?: string; accepted?: string[] }[];
};

async function devLesson(level = 1) {
  const [row] = await e2eDb()
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "speaking"),
        eq(lessons.level, level),
        eq(lessons.unit, 1),
        eq(lessons.kind, "assigned"),
        eq(lessons.lessonNo, 1),
        eq(lessons.topicVariant, 1),
      ),
    );
  if (!row) throw new Error("말하기 수업 없음");
  return row;
}
const contentOf = (row: typeof lessons.$inferSelect) =>
  (row.content as { content: SpeakingContent }).content;

async function openSession(
  context: BrowserContext,
  runs: RecognitionRun[],
  profileId: string,
  lesson: typeof lessons.$inferSelect,
): Promise<{ page: Page; sessionId: string }> {
  const [sessionId] = await insertSessions([
    {
      profileId,
      area: "speaking",
      level: lesson.level,
      unit: 1,
      lessonId: lesson.id,
      kind: "regular",
      status: "in_progress",
      startedAt: new Date(),
      seedRevision: lesson.revision,
      seedCorrection: lesson.correction,
    },
  ]);
  if (!sessionId) throw new Error("세션 없음");
  const page = await speechPage(context, script(runs));
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  return { page, sessionId };
}

const activity = (page: Page) => page.locator("[data-activity]");
const speakButton = (page: Page) => page.locator("[data-speak]");
/** 들어올 때의 읽기(effect)가 먼저 돌 틈. 읽기가 듣기 뒤에 시작하면 듣기를 끊는다(P2b speak → cancel 'speak'). */
const SETTLE_MS = 250;

/**
 * '말하기'를 누른다 — 앞 듣기가 끝난 뒤에만(듣는 중의 누름은 듣기를 끝내는 누름이라 실패 하나가 사라진다, 7절 말하기 버튼 행),
 * 들어올 때의 읽기가 시작된 뒤에.
 */
async function speak(page: Page) {
  await expect(page.locator("[data-activity] [data-listening]")).toHaveCount(0);
  await page.waitForTimeout(SETTLE_MS);
  await speakButton(page).click();
  // 이 듣기가 끝날 때까지 기다린다
  await expect(page.locator("[data-activity] [data-listening]")).toHaveCount(0);
}
/** 두 방향 모두 쪽이 보는 창보다 길지 않다(화면 검토 review-p11-4-design M-2). 끝나면 세로로 돌려 둔다. */
async function fitsBothWays(page: Page) {
  for (const size of Object.values(CHILD_VIEWPORTS)) {
    await page.setViewportSize(size);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight),
    ).toBeLessThanOrEqual(size.height);
  }
  await page.setViewportSize(CHILD_VIEWPORTS.portrait);
}

/** 그 활동의 실패 수(다시 듣기 갈래)가 n 이다. */
const failures = (page: Page, n: number) =>
  expect(page.locator("[data-activity] [data-failures]")).toHaveAttribute(
    "data-failures",
    String(n),
  );

/** 미리보기 '다음' → 처음 마이크 안내 '알겠어요'(기기마다 한 번 — 같은 문맥에서 이미 봤으면 notice: false). */
async function pastPreview(page: Page, { notice = true } = {}) {
  await expect(activity(page)).toHaveAttribute("data-activity", "preview");
  await page.getByRole("button", { name: T.next }).click();
  if (notice) {
    await expect(page.locator("[data-mic-notice]")).toBeVisible();
    await page.getByRole("button", { name: T.micOk }).click();
  }
  await expect(page.locator("[data-mic-notice]")).toHaveCount(0);
}

const fakeRecord = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __fakeSpeech: FakeSpeechRecord }).__fakeSpeech,
  );

async function sessionStatus(sessionId: string) {
  const [row] = await e2eDb()
    .select({ status: sessions.status, score: sessions.score })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  return row;
}

async function alertKinds(profileId: string) {
  return (
    await e2eDb()
      .select({ kind: parentAlerts.kind, value: parentAlerts.value })
      .from(parentAlerts)
      .where(eq(parentAlerts.profileId, profileId))
  ).map((r) => r.kind);
}

/** 수업 하나를 바꿔 넣는다(견본 빌더 말하기 1단계 — 따라 말하기 · 듣기 · 질문을 시험이 고름). */
async function customLesson(
  content: Partial<SpeakingContent>,
  lessonNo: number,
) {
  const sample = speakingLesson(referenceSet(defaultSettings()), 1);
  const lesson = {
    ...sample,
    lesson: {
      ...sample.lesson,
      content: { ...sample.lesson.content, ...content },
    },
  } as typeof sample;
  return insertSampleLesson({ sample: lesson, lessonNo });
}

test("AC-5b 말하기 1단계 세션은 따라 말하기 단어 5 · 문장 5, 듣기 이해 3문항, 질문 답 4개이고 듣기 이해 문항은 AI 호출 없이 채점된다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const spec = (await levelSpecOf("speaking", 1)) as {
    repeat: { words: number; sentences: number };
    listening: { items: number };
    questions: { count: number };
  };
  const { profileId } = await insertHousehold({ startLevels: { speaking: 1 } });
  const lesson = await devLesson();
  const c = contentOf(lesson);
  // 분량은 규격 그대로(3.3 말하기 1단계 행)
  expect(c.repeat.words).toHaveLength(spec.repeat.words);
  expect(c.repeat.sentences).toHaveLength(spec.repeat.sentences);
  expect(c.listening).toHaveLength(spec.listening.items);
  expect(c.questions).toHaveLength(spec.questions.count);
  const runs = [
    ...c.repeat.words.map(said),
    ...c.repeat.sentences.map(said),
    ...c.questions.map((q) => said(q.accepted?.[0] ?? "")),
  ];
  const aiBefore = await countRows(aiCalls);
  const { page, sessionId } = await openSession(
    context,
    runs,
    profileId,
    lesson,
  );
  const total =
    1 +
    c.repeat.words.length +
    c.repeat.sentences.length +
    c.listening.length +
    c.questions.length;
  await expect(page.locator("[data-activity-dots] li")).toHaveCount(total);
  // 미리보기 → 처음 마이크 안내(사진) → '알겠어요'
  await page.getByRole("button", { name: T.next }).click();
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await photo(page, "p11-speaking-mic-notice");
  await page.getByRole("button", { name: T.micOk }).click();
  await photo(page, "p11-speaking-repeat");
  // 듣는 동안 단추 꼴이 바뀐다(분홍 테 · 남은 시간 고리 · data-listening — 7절 말하기 버튼 행, 화면 검토 I-1)
  await page.waitForTimeout(SETTLE_MS);
  await speakButton(page).click();
  await expect(page.locator("[data-speak][data-listening]")).toBeVisible();
  await expect(page.locator("[data-speak-ring]")).toHaveAttribute(
    "style",
    /conic-gradient/,
  );
  await photo(page, "p11-speaking-listening-on");
  await expect(page.getByText(T.good)).toBeVisible();
  await expect(page.locator("[data-speak][data-listening]")).toHaveCount(0);
  await expect(activity(page)).toHaveAttribute("data-activity-no", "3");
  let no = 3;
  for (const _ of [...c.repeat.words, ...c.repeat.sentences].slice(1)) {
    await expect(activity(page)).toHaveAttribute(
      "data-activity-no",
      String(no),
    );
    await speak(page);
    await expect(page.getByText(T.good)).toBeVisible();
    if (no === 3) await photo(page, "p11-speaking-repeat-good");
    no += 1;
    // 잘 말했어요 → 저절로 다음
    await expect(activity(page)).toHaveAttribute(
      "data-activity-no",
      String(no),
    );
  }
  // 듣기 이해: 첫 문항은 처음 틀림 → '한 번 더 듣기' → 다시 틀림 → 정답 보기, 둘째부터 바로 맞힘. 단계마다 두 방향 높이 · 사진
  for (const [i, item] of c.listening.entries()) {
    await expect(activity(page)).toHaveAttribute("data-activity", "listening");
    const choice = (n: number) => page.locator(`[data-answer-choice="${n}"]`);
    if (i === 0) {
      await photo(page, "p11-speaking-listening");
      const wrong = item.answerNo === 1 ? 2 : 1;
      await choice(wrong).click();
      await expect(
        page.getByRole("button", { name: T.listenAgain }),
      ).toBeVisible();
      await photo(page, "p11-speaking-listening-wrong");
      await fitsBothWays(page);
      await page.getByRole("button", { name: T.listenAgain }).click();
      // 처음 오답은 ✕ 로 남고 다시 고를 수 없다(컨트롤러 결정)
      await expect(choice(wrong)).toHaveAttribute("data-choice-state", "wrong");
      await expect(choice(wrong)).toBeDisabled();
      const second = [1, 2, 3, 4].find(
        (n) => n !== wrong && n !== item.answerNo,
      );
      if (second === undefined) throw new Error("보기 없음");
      await choice(second).click();
      await expect(page.getByText(T.answerIs)).toBeVisible();
      await expect(choice(item.answerNo)).toHaveAttribute(
        "data-choice-state",
        "answer",
      );
      await photo(page, "p11-speaking-listening-reveal");
      await fitsBothWays(page);
    } else {
      await choice(item.answerNo).click();
      await expect(page.getByText(T.right)).toBeVisible();
      if (i === 1) {
        await photo(page, "p11-speaking-listening-right");
        await fitsBothWays(page);
      }
    }
    await page.getByRole("button", { name: T.next }).click();
    no += 1;
  }
  for (const [i] of c.questions.entries()) {
    await expect(activity(page)).toHaveAttribute("data-activity", "question");
    if (i === 0) await photo(page, "p11-speaking-question");
    await speak(page);
    await expect(page.getByText(T.good)).toBeVisible();
    await page.getByRole("button", { name: T.next }).click();
  }
  await expect(page).toHaveURL(new RegExp(`/result/${sessionId}$`));
  await expect(page.getByRole("heading", { name: T.finished })).toBeVisible();
  await photo(page, "p11-speaking-result");
  expect((await sessionStatus(sessionId))?.status).toBe("completed");
  // 듣기 이해 문항은 앱이 채점(점수 1) · AI 호출 0회
  const rows = await e2eDb()
    .select({ input: attempts.input, score: attempts.score })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId));
  const listening = rows.filter(
    (r) => (r.input as { kind?: string }).kind === "listening",
  );
  expect(listening).toHaveLength(c.listening.length);
  // 첫 듣기 문항만 처음에 틀림(점수는 첫 시도)
  expect(listening.map((r) => r.score).sort()).toEqual(
    c.listening.map((_, i) => (i === 0 ? 0 : 1)).sort(),
  );
  expect(await countRows(aiCalls)).toBe(aiBefore);
  await page.close();
});

test("AC-5c 말하기 세션 도중 마이크 권한을 거두면 세션이 진행으로 남고 '마이크가 필요해요. 부모님께 말해 주세요'와 '홈'이 보이며 audio-capture 한 번으로는 닫히지 않는다", async ({
  context,
}) => {
  const { profileId } = await insertHousehold({ startLevels: { speaking: 1 } });
  const lesson = await devLesson();
  const { page, sessionId } = await openSession(
    context,
    [failing("audio-capture", 50), failing("not-allowed", 50)],
    profileId,
    lesson,
  );
  await pastPreview(page);
  // audio-capture 한 번은 다시 듣기
  await speak(page);
  await expect(page.getByText(T.retry)).toBeVisible();
  await expect(page.locator("[data-blocked]")).toHaveCount(0);
  // 권한을 거두면(not-allowed) 막힌 안내와 '홈'
  await speak(page);
  await expect(page.getByText(T.needsMic)).toBeVisible();
  // '홈' 버튼 하나(7절) — 종이 띠의 '홈'은 숨김
  await expect(
    page.locator("[data-blocked]").getByRole("button", { name: T.home }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: T.home })).toHaveCount(1);
  await photo(page, "p11-speaking-needs-mic");
  expect((await sessionStatus(sessionId))?.status).toBe("in_progress");
  await expect.poll(() => alertKinds(profileId)).toContain("mic_unavailable");
  // 이 기기는 '마이크를 쓸 수 없음'으로 남아 다시 열어도 같은 안내(세션은 진행)
  await page.reload();
  await expect(page.getByText(T.needsMic)).toBeVisible();
  expect((await sessionStatus(sessionId))?.status).toBe("in_progress");
  // '홈'을 눌러도 세션은 진행으로 남는다(세션 행을 지우지 않음)
  await page.getByRole("button", { name: T.home }).click();
  await expect(page).toHaveURL(/\/$/);
  expect((await sessionStatus(sessionId))?.status).toBe("in_progress");
  await page.close();
});

test("AC-5e 말하기 1단계 따라 말하기는 마지막 중간 결과 뒤 3초 조용하면, 4단계는 1.5초 조용하면 듣기가 끝난다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const cases = [
    {
      level: 1,
      silenceMs: TEST_SETTINGS["speech.end_silence_seconds.1-3"].value * MS,
    },
    {
      level: 4,
      silenceMs: TEST_SETTINGS["speech.end_silence_seconds.4-6"].value * MS,
    },
  ];
  for (const [i, { level, silenceMs }] of cases.entries()) {
    await resetHousehold();
    await atLevel({ area: "speaking", level }, async (profileId) => {
      if (level !== 1)
        await cloneLessons({
          area: "speaking",
          fromLevel: 1,
          toLevel: level,
          unit: 1,
        });
      const lesson = await devLesson(level);
      const first = contentOf(lesson).repeat.words[0] ?? "";
      const { page } = await openSession(
        context,
        [said(first)],
        profileId,
        lesson,
      );
      // 처음 마이크 안내는 이 문맥(기기)에서 한 번만
      await pastPreview(page, { notice: i === 0 });
      await speak(page);
      await expect(page.locator("[data-heard]")).toHaveText(first);
      const record = await fakeRecord(page);
      const start = record.calls.find((c) => c.method === "start");
      const stop = record.calls.find((c) => c.method === "stop");
      if (!start || !stop) throw new Error("듣기 시작 · 끝이 없다");
      // 앱이 stop 을 부른 때 = 결과 뒤 끝 조용함(그 단계 구간 설정)
      const took = stop.at - start.at;
      expect(took).toBeGreaterThanOrEqual(RESULT_AT + silenceMs - 100);
      expect(took).toBeLessThan(RESULT_AT + silenceMs + MS);
      await page.close();
    });
  }
});

test("AC-5f 말하기 1단계 질문 답은 AI 호출 0회로 판정되고 다시면 바른 답 문장이 들리며 '같이 말해 볼까요' 뒤 한 번 말하면 결과 말 없이 다음 질문으로 간다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const { profileId } = await insertHousehold({ startLevels: { speaking: 1 } });
  const source = contentOf(await devLesson());
  const questions = source.questions.slice(0, 2);
  const [q1, q2] = questions;
  if (!q1?.modelAnswer || !q2?.accepted?.[0]) throw new Error("견본 질문 꼴");
  const lesson = await customLesson(
    { repeat: { words: [], sentences: [] }, listening: [], questions },
    91,
  );
  const aiBefore = await countRows(aiCalls);
  const { page, sessionId } = await openSession(
    context,
    [said("zzz qqq"), said(q1.modelAnswer), said(q2.accepted[0])],
    profileId,
    lesson,
  );
  await pastPreview(page);
  await expect(activity(page)).toHaveAttribute("data-activity", "question");
  await speak(page);
  // 다시: 바른 답 문장을 영어 줄로 보이며 들려주고 '같이 말해 볼까요'(판정 글자 없음)
  await expect(page.getByText(T.together)).toBeVisible();
  await expect(page.locator("[data-model-answer]")).toContainText(
    q1.modelAnswer,
  );
  await expect
    .poll(async () => (await fakeRecord(page)).spoken)
    .toContain(q1.modelAnswer);
  await expect(page.getByText(T.good)).toHaveCount(0);
  await photo(page, "p11-speaking-together");
  await speak(page);
  // 한 번 말하면 결과 말 없이 다음 질문
  await expect(activity(page)).toHaveAttribute("data-activity-no", "3");
  await speak(page);
  await expect(page.getByText(T.good)).toBeVisible();
  await page.getByRole("button", { name: T.next }).click();
  await expect(page).toHaveURL(new RegExp(`/result/${sessionId}$`));
  expect(await countRows(aiCalls)).toBe(aiBefore);
  // 첫 질문은 다시(0) · 둘째는 맞음(1), '같이 말해 볼까요' 뒤 말이 echo 로 남는다
  const rows = await e2eDb()
    .select({
      no: attempts.activityNo,
      input: attempts.input,
      score: attempts.score,
    })
    .from(attempts)
    .where(and(eq(attempts.sessionId, sessionId), gte(attempts.activityNo, 2)));
  const byNo = Object.fromEntries(rows.map((r) => [r.no, r]));
  expect(byNo[2]?.score).toBe(0);
  expect((byNo[2]?.input as { echo?: string } | undefined)?.echo).toBe(
    q1.modelAnswer,
  );
  expect(byNo[3]?.score).toBe(1);
  await page.close();
});

test("AC-5f 따라 말하기 일치율 0.95 는 '잘 말했어요'와 ui.auto_next_seconds 뒤 다음 문장, 0.7 은 '거의 다 맞았어요'와 '한 번 더 말하기'(큰) · '다음'(작은), 0.5 는 '한 번 더 들어 볼까요'가 보인다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const { profileId } = await insertHousehold({ startLevels: { speaking: 1 } });
  const target = Array.from({ length: 20 }, (_, i) => `word${i + 1}`).join(" ");
  const words = target.split(" ");
  const part = (n: number) => words.slice(0, n).join(" ");
  const match = { homophones: [], nameSlot: "any-word" as const };
  const [high, mid] = TEST_SETTINGS["ui.match_phrase_levels"].value;
  const cut = { good: 19, close: 14, again: 10 };
  expect(matchRate(target, part(cut.good), match)).toBeGreaterThanOrEqual(high);
  expect(matchRate(target, part(cut.close), match)).toBeLessThan(high);
  expect(matchRate(target, part(cut.close), match)).toBeGreaterThanOrEqual(mid);
  expect(matchRate(target, part(cut.again), match)).toBeLessThan(mid);
  const lesson = await customLesson(
    {
      repeat: { words: [], sentences: [target, target, target] },
      listening: [],
      questions: [],
    },
    92,
  );
  const { page } = await openSession(
    context,
    [said(part(cut.good)), said(part(cut.close)), said(part(cut.again))],
    profileId,
    lesson,
  );
  await pastPreview(page);
  // 0.95 → '잘 말했어요', ui.auto_next_seconds 뒤 저절로 다음 문장
  await speak(page);
  await expect(page.getByText(T.good)).toBeVisible();
  // ui.auto_next_seconds 동안은 머무르고(얼마쯤 지나도 같은 활동) 그 뒤 저절로 다음 문장
  await page.waitForTimeout(AUTO_NEXT_MS / 4);
  await expect(activity(page)).toHaveAttribute("data-activity-no", "2");
  await expect(activity(page)).toHaveAttribute("data-activity-no", "3", {
    timeout: AUTO_NEXT_MS * 3,
  });
  // 0.7 → '거의 다 맞았어요' · '한 번 더 말하기'(큰) · '다음'(작은)
  await speak(page);
  await expect(page.getByText(T.close)).toBeVisible();
  const big = page.getByRole("button", { name: T.oneMore });
  const small = page.getByRole("button", { name: T.next });
  await expect(big).toBeVisible();
  await expect(small).toBeVisible();
  const size = (l: typeof big) =>
    l.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(await size(big)).toBeGreaterThan(await size(small));
  await photo(page, "p11-speaking-repeat-close");
  // 저절로 넘어가지 않는다
  await page.waitForTimeout(AUTO_NEXT_MS + 500);
  await expect(activity(page)).toHaveAttribute("data-activity-no", "3");
  await small.click();
  // 0.5 → '한 번 더 들어 볼까요'
  await expect(activity(page)).toHaveAttribute("data-activity-no", "4");
  await speak(page);
  await expect(page.getByText(T.again)).toBeVisible();
  await page.close();
});

test("AC-5f 하루 안전 상한에 닿은 날에도 말하기 1~2단계 질문 답은 그대로 된다", async ({
  context,
}) => {
  const { profileId } = await insertHousehold({ startLevels: { speaking: 1 } });
  const source = contentOf(await devLesson());
  const q = source.questions[0];
  if (!q?.accepted?.[0]) throw new Error("견본 질문 꼴");
  const lesson = await customLesson(
    { repeat: { words: [], sentences: [] }, listening: [], questions: [q] },
    93,
  );
  const now = new Date();
  await e2eDb()
    .insert(aiStatus)
    .values({
      id: 1,
      resting: true,
      reason: "daily_cap",
      startedAt: now,
      resumesAt: new Date(now.getTime() + 24 * 3600 * MS),
    })
    .onConflictDoUpdate({
      target: aiStatus.id,
      set: { resting: true, reason: "daily_cap", startedAt: now },
    });
  try {
    const aiBefore = await countRows(aiCalls);
    const { page } = await openSession(
      context,
      [said(q.accepted[0])],
      profileId,
      lesson,
    );
    await pastPreview(page);
    await speak(page);
    await expect(page.getByText(T.good)).toBeVisible();
    expect(await countRows(aiCalls)).toBe(aiBefore);
    await page.close();
  } finally {
    await e2eDb()
      .update(aiStatus)
      .set({ resting: false, reason: null, startedAt: null, resumesAt: null })
      .where(eq(aiStatus.id, 1));
  }
});

test("AC-N3 인식 이벤트가 오지 않는 가짜 API 에서 감시 타이머가 한 번 다시 시작한 뒤 또 멈추면 세션이 진행으로 남고 '마이크가 잘 안 돼요'와 '마이크가 멈춤' 알림이 생긴다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const { profileId } = await insertHousehold({ startLevels: { speaking: 1 } });
  const lesson = await devLesson();
  const hang: RecognitionRun = { events: [], hang: true };
  const { page, sessionId } = await openSession(
    context,
    [hang, hang],
    profileId,
    lesson,
  );
  await pastPreview(page);
  // 듣기가 감시 타이머 둘(약 36초) 동안 이어지므로 끝을 기다리지 않고 누른다
  await page.waitForTimeout(SETTLE_MS);
  await speakButton(page).click();
  await expect(page.getByText(T.stalled)).toBeVisible({
    timeout: STALL_WAIT_MS,
  });
  expect((await fakeRecord(page)).created).toBe(2);
  await photo(page, "p11-speaking-stalled");
  expect((await sessionStatus(sessionId))?.status).toBe("in_progress");
  await expect.poll(() => alertKinds(profileId)).toContain("mic_stalled");
  await page.close();
});

test("AC-N3 aborted 가 이어지는 가짜 API 에서 인식 실패가 여섯 번 이어지면 같은 안내와 알림이 나온다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const { profileId } = await insertHousehold({ startLevels: { speaking: 1 } });
  const lesson = await devLesson();
  const { page, sessionId } = await openSession(
    context,
    [failing("aborted")],
    profileId,
    lesson,
  );
  await pastPreview(page);
  const sixth = MAX_RETRIES * 2;
  for (let n = 1; n <= sixth; n += 1) {
    await speak(page);
    if (n < sixth && n % MAX_RETRIES !== 0) {
      await expect(page.getByText(T.retry)).toBeVisible();
      await failures(page, n % MAX_RETRIES);
    }
    // speech.max_retries 번이면 그 활동을 건너뛰고 다음 활동으로(활동 몫 셈은 새로, 세션 몫 '여섯 번'은 이어짐)
    if (n === MAX_RETRIES)
      await expect(activity(page)).toHaveAttribute("data-activity-no", "3");
  }
  await expect(page.getByText(T.stalled)).toBeVisible();
  expect((await sessionStatus(sessionId))?.status).toBe("in_progress");
  await expect.poll(() => alertKinds(profileId)).toContain("mic_stalled");
  // 건너뛴 활동은 점수가 없다(7절 '점수에서 뺀다')
  await expect
    .poll(async () => {
      const [skipped] = await e2eDb()
        .select({ input: attempts.input, score: attempts.score })
        .from(attempts)
        .where(
          and(eq(attempts.sessionId, sessionId), eq(attempts.activityNo, 2)),
        );
      return skipped
        ? {
            score: skipped.score,
            skipped: (skipped.input as { skipped?: string }).skipped,
          }
        : undefined;
    })
    .toEqual({ score: null, skipped: "recognition" });
  await page.close();
});

test("AC-N3 no-speech 로만 끝난 말하기 문항이 speech.silent_items_max 개 이어지면 '말소리가 잘 안 들려요' 안내와 '말소리가 들어오지 않음' 알림이 나온다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const { profileId } = await insertHousehold({ startLevels: { speaking: 1 } });
  const lesson = await devLesson();
  const { page, sessionId } = await openSession(
    context,
    [failing("no-speech", 300)],
    profileId,
    lesson,
  );
  await pastPreview(page);
  for (let item = 1; item <= SILENT_ITEMS; item += 1) {
    if (item < SILENT_ITEMS)
      await expect(activity(page)).toHaveAttribute(
        "data-activity-no",
        String(1 + item),
      );
    for (let n = 1; n <= MAX_RETRIES; n += 1) {
      await speak(page);
      if (n < MAX_RETRIES) {
        await expect(page.getByText(T.retry)).toBeVisible();
        await failures(page, n);
      }
    }
  }
  await expect(page.getByText(T.silent)).toBeVisible();
  await photo(page, "p11-speaking-silent");
  expect((await sessionStatus(sessionId))?.status).toBe("in_progress");
  await expect.poll(() => alertKinds(profileId)).toContain("speech_silent");
  // no-speech 는 '여섯 번'에 들지 않는다 — 마이크 멈춤 알림은 없다
  expect(await alertKinds(profileId)).not.toContain("mic_stalled");
  await page.close();
});

test("AC-N3 network 오류는 '인터넷이 끊겼어요. 연결되면 다시 해요'를 보이고 다시 시도 횟수에 들지 않는다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const { profileId } = await insertHousehold({ startLevels: { speaking: 1 } });
  const lesson = await devLesson();
  const first = contentOf(lesson).repeat.words[0] ?? "";
  const networks = Array.from({ length: MAX_RETRIES }, () =>
    failing("network"),
  );
  const { page } = await openSession(
    context,
    [...networks, said(first)],
    profileId,
    lesson,
  );
  await pastPreview(page);
  // speech.max_retries 번 끊겨도 건너뛰지 않고 같은 활동에 남는다
  for (let n = 1; n <= MAX_RETRIES; n += 1) {
    await speak(page);
    await expect(page.getByText(T.offline)).toBeVisible();
    await expect(activity(page)).toHaveAttribute("data-activity-no", "2");
    // 다시 시도 횟수에 들지 않는다
    await failures(page, 0);
  }
  await photo(page, "p11-speaking-offline");
  await speak(page);
  await expect(page.getByText(T.good)).toBeVisible();
  await page.close();
});

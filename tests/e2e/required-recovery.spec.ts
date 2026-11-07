// 필수 경로 나(정본 9절 · 15절 AC-23g, UI · UX plan 묶음 0-마 · spec 설계 4 N-1~N-20 · 4.1 복구 예외 둘, C179): 오류 · 막힘 · 쉼을 보이는 아이
// 화면마다 같은 자리로 돌아가는 길이 있고, 그 사이 홈('/') 요청이 0회다(route-watch — 문서 이동과 미리 읽기 아닌 RSC 만 셈, 정한 것 7).
// - 막힘 셋(N-1 말하기 세션 · N-2 회화 · N-3 말하기 배치): 마이크 막힘 → 막힘 판의 큰 '다시 해 볼래요'(작은 '홈') → 같은 활동 · 턴 · 문항.
// - 쉼 셋(N-5 세션 · N-6 회화 · N-7 결과 '다음 수업' · 마무리 '다음 이야기'): 하루 안전 상한을 채워 쉼 → 큰 '홈' · 작은 '다시 해 볼래요' →
//   아직 쉬면 '아직 쉬고 있어요 …' → 상한을 풀고 '다시 해 볼래요' → 같은 자리(결과 · 마무리는 그 수업 시작).
// - 목록 쉼(N-8)은 화면을 떠나지 않고 누른 카드 아래 한 줄 칸, 다시 누르면 다시 판정. 홈 '첨삭이 왔어요'(N-9)는 둘째 세션(고쳐 쓰기)이라
//   상한 날에도 막지 않고 바로 열린다(C80). N-10 홈 닫힌 카드 다시 확인 줄.
// - N-15 앱 오류: 시험 DB 의 설정 행 하나(speech.skip_notice_seconds)를 지워 서버 그리기가 던지게 → '잠깐 문제가 생겼어요' → 행 되돌림 →
//   큰 '다시 해 볼래요' → data-trouble-retrying 이 붙어 판이 바뀔 때까지 남고 같은 화면(plan 정한 것 6 · 0-나 fix 1 재검토 보탬).
// - N-16 없는 주소: 모르는 세션 id · 틀린 꼴 id → '찾는 화면이 없어요' + 큰 '홈'(홈으로 보내지 않음, 남의 세션은 단위 · 통합 몫).
// - 복구 예외 둘(4.1): N-12 회화 4단계 가짜 AI 연결 오류 두 번 → '여기까지 이야기한 것은 저장했어요 …' → '수업 목록' → '하던 수업 이어 하기' →
//   같은 대화 기록 · 같은 말 주고받기 수 · 다음 선생님 말 / N-13 첨삭 대기 → '수업 목록' → '아직 글을 살펴보고 있어요' → 가짜 첨삭 도착 →
//   '첨삭 보기' → 같은 초고의 둘째 세션.
// - N-19 · N-20(소리를 들려주지 못함 — '다시 듣기' 뒤 같은 문항)은 묶음 5-나(말하기 · 배치) · 6(회화)이 이 파일에 더한다(아래 끝 자리).
//   5-나: 말하기 세션 따라 말하기 · 말하기 배치 문항(본 문항 → 같은 번호 예비 문항, 예비는 '다음' 없이 기다림).
// 같은 시도 id 의 다시 보냄은 서버 진행 창(TURN_IN_FLIGHT_MS) 안이면 stale 로 잡혀 틀을 새로 그린다(0-가 검토 M4) — 시험은 그 아이 행의 기록
// 시각을 창 너머로 물려(pastTurnInFlight) 기다린 뒤의 다시 보냄과 같게 한다. 앱 코드에는 시험용 갈래가 없다.
// 상태: '작성됨'(tsc · lint) — 이 Mac 에서는 돌릴 수 없고(내장 Postgres), '실행 통과'는 11-01 뒤 CI e2e 에서 확인한다(plan '필수 둘').
import { randomUUID } from "node:crypto";
import type { BrowserContext, Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
import type { TalkCard } from "../../src/core/seed/schema/talk";
import { LEVEL_MAX } from "../../src/core/seed/structure";
import type {
  RecognitionRun,
  SpeechScript,
} from "../../src/core/speech/script";
import { lessons } from "../../src/db/schema/content";
import { attempts, sessions, talkTurns } from "../../src/db/schema/learning";
import { MIC_STATE_KEY } from "../../src/lib/mic-state";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  closeE2eDb,
  e2eDb,
  insertSessions,
  removeHouseholdSetting,
  resetHousehold,
  shiftTimes,
  withHouseholdSetting,
} from "./db";
import { pushFakeAi, resetFakeAi } from "./fake-ai";
import { expect, loadSpeechScript, speechPage, test } from "./fixtures";
import { insertHousehold } from "./household";
import {
  atLevel,
  compositionSample,
  deliverFeedback,
  guidedSample,
  insertReadyDraft,
  insertSampleLesson,
  openLessonSession,
  READY_FEEDBACK,
} from "./lessons";
import { type HomeWatch, watchHomeRequests } from "./route-watch";
import {
  failingRun,
  greetingTalkLesson,
  insertTalkLesson,
  liftSafetyCap,
  openTalkSession,
  pastTurnInFlight,
  reachSafetyCap,
  saidRun,
  skipStartPrep,
  TURN_MARK,
  talkHousehold,
  talkLessonReply,
  talkScript,
  withoutSceneOpener,
} from "./talk";

/** 아이 화면 글(정본 · spec 설계 6 문구 표 그대로, 회화 시험 집의 선생님은 미나 · 쓰기 집은 고르기 전 '선생님'). */
const T = {
  retry: "다시 해 볼래요",
  home: "홈",
  restStill: "아직 쉬고 있어요. 조금 뒤에 다시 눌러 봐요",
  writingRest: "선생님이 잠깐 쉬어요. 다른 공부를 해 볼까요",
  talkRest: "미나가 잠깐 쉬어요. 다른 공부를 해 볼까요",
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  appError: "잠깐 문제가 생겼어요",
  missing: "찾는 화면이 없어요",
  saved: "여기까지 이야기한 것은 저장했어요. 다음에 이어서 해요",
  lessons: "수업 목록",
  stillReading: "아직 글을 살펴보고 있어요",
  feedbackReady: "첨삭이 왔어요",
  nextLesson: "다음 수업",
  nextStory: "다음 이야기",
  start: "시작!",
  micOk: "알겠어요",
  next: "다음",
  send: "보내기",
  stopYes: "그만할래요",
  placementStart: "시작",
  micCheck: "마이크 확인",
  speak: "말하기",
  /** 소리를 들려주지 못함(설계 6 문구 표 — R-57). */
  soundNotice: "소리가 안 나왔어요. 다시 들어 봐요",
  /** 무음 모드 줄(C111 — 아이패드 사파리, e2e 기기). */
  silentMode: "아이패드 제어 센터에서 무음 모드를 꺼 주세요",
} as const;
/** 한 시험 시간(시험 값 — 흘려 받기 · 읽기 · 세션 열기를 여럿 기다림). */
const LONG = 120_000;
/** 흘려 받기 · 읽기 · 서버 판정이 끝나는 여유(시험 값). */
const WAIT_MS = 30_000;
/** 읽기가 끝난 뒤 다음 누름 앞 틈(conversation.spec 과 같은 까닭 — 시험 값). */
const SETTLE_MS = 250;
/** 다시 연 회화의 첫 문장을 늦추는 시간(시험 값 — 그 사이 말 주고받기 수가 그대로인지 볼 틈). */
const FIRST_DELAY_MS = 2000;
/** 4단계 회화 턴 모델(TEST_SETTINGS — 가짜 응답의 답한 모델). */
const TALK_MODEL_MID = TEST_SETTINGS["ai.model.talk_turn.4-6"].value;
/** 앱 오류를 일으킬 설정 키(세션 화면이 그릴 때 읽는 음성 설정 — plan 정한 것 6 의 예). */
const BREAKING_SETTING = "speech.skip_notice_seconds";

test.beforeEach(async () => {
  await resetHousehold();
  await resetFakeAi();
});
test.afterEach(resetFakeAi);
test.afterAll(closeE2eDb);

/** 경로 내내 홈 요청 0회(정한 것 7). */
function expectNoHome(watch: HomeWatch) {
  expect(watch.stop(), "그 사이 홈('/') 요청").toEqual([]);
}

/** 막힘 판 · 쉬는 화면의 큰 · 작은 단추 글(0-가 data-button-size). */
async function expectButtons(
  scope: ReturnType<Page["locator"]>,
  big: string,
  small: string,
) {
  await expect(scope.locator('[data-button-size="big"]')).toHaveText(big);
  await expect(scope.locator('[data-button-size="small"]')).toHaveText(small);
}

/** 마이크 확인이 되는 인식 객체(소리 들어옴 — 막힘 판 '다시 해 볼래요'의 확인). */
const SOUND_RUN: RecognitionRun = {
  events: [
    { at: 50, type: "start" },
    { at: 100, type: "audiostart" },
    { at: 200, type: "soundstart" },
  ],
};
const DEFAULT_OK = loadSpeechScript("default-ok");
/** 한 낱말 · 문장을 말하고 조용해지는 듣기(앱이 stop 하면 끝). */
const said = (text: string): RecognitionRun => ({
  events: [
    { at: 50, type: "start" },
    { at: 100, type: "audiostart" },
    { at: 200, type: "speechstart" },
    { at: 400, type: "result", results: [{ transcript: text, isFinal: true }] },
  ],
  onStop: [{ at: 50, type: "end" }],
});
const runsScript = (runs: RecognitionRun[]): SpeechScript => ({
  name: "required-recovery",
  source: "손으로 씀 — 필수 경로 나(시험 안에서 만듦)",
  recognitions: runs,
  ...(DEFAULT_OK.synthesis ? { synthesis: DEFAULT_OK.synthesis } : {}),
});

const activity = (page: Page) => page.locator("[data-activity]");

/** 그 세션 그 활동의 끝 시도 수(같은 시도 — 막힘 · 쉼 동안 끝 시도가 생기지 않음). */
async function finalAttempts(
  sessionId: string,
  activityNo: number,
): Promise<number> {
  const rows = await e2eDb()
    .select({ input: attempts.input })
    .from(attempts)
    .where(
      and(
        eq(attempts.sessionId, sessionId),
        eq(attempts.activityNo, activityNo),
      ),
    );
  return rows.filter((r) => (r.input as { step?: string }).step === "final")
    .length;
}

async function sessionStatus(sessionId: string) {
  const [row] = await e2eDb()
    .select({ status: sessions.status })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  return row?.status;
}

/** 그 영역 1단계 단원 1 의 첫 배정 수업(시험용 시드). */
async function seedLesson(area: "reading" | "speaking") {
  const [row] = await e2eDb()
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, area),
        eq(lessons.level, 1),
        eq(lessons.unit, 1),
        eq(lessons.kind, "assigned"),
        eq(lessons.lessonNo, 1),
        eq(lessons.topicVariant, 1),
      ),
    );
  if (!row) throw new Error(`${area} 수업 없음`);
  return row;
}

/** 그 수업의 진행 세션을 바로 넣는다(1단계 시드 수업). */
async function openSeedSession(
  profileId: string,
  lesson: typeof lessons.$inferSelect,
): Promise<string> {
  const [sessionId] = await insertSessions([
    {
      profileId,
      area: lesson.area,
      level: lesson.level,
      unit: lesson.unit ?? 1,
      lessonId: lesson.id,
      kind: "regular",
      status: "in_progress",
      startedAt: new Date(),
      seedRevision: lesson.revision,
      seedCorrection: lesson.correction,
    },
  ]);
  if (!sessionId) throw new Error("세션 없음");
  return sessionId;
}

// ── 회화 도우미(conversation.spec 꼴) ──

/** 회화 쪽에서 '시작!'(열 때마다 한 번) → 처음 마이크 안내(기기마다 한 번). */
async function pastStart(page: Page, { micNotice = true } = {}) {
  await expect(page.locator("[data-talk-start]")).toBeVisible({
    timeout: WAIT_MS,
  });
  await page.getByRole("button", { name: T.start }).click();
  if (!micNotice) return;
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
}

/** 아이 차례가 열리고 읽기가 끝날 때까지. */
async function untilChildTurn(page: Page) {
  await expect(page.locator("[data-child-turn]")).toBeVisible({
    timeout: WAIT_MS,
  });
  await expect(
    page.locator("[data-talk-panel][data-talk-reading]"),
  ).toHaveCount(0, { timeout: WAIT_MS });
  await page.waitForTimeout(SETTLE_MS);
}

/**
 * 그 단계 회화 견본(새 꼴 인사 → 대화 — 회화 plan 묶음 12)과 진행 세션을 넣고 회화 쪽을 연다(안내까지). 짧은 준비는 프로필 방식 when_needed
 * (skipStartPrep)로 건너뛴다 — 1~3단계 always 면 노리는 단어로 준비 쪽지가 붙는다(C33, e2e 첫 실행 묶음 B).
 */
async function openTalkAt(
  context: BrowserContext,
  level: number,
  runs: (card: TalkCard) => RecognitionRun[],
) {
  const profileId = await talkHousehold(level);
  await skipStartPrep(profileId, level);
  const row = await insertTalkLesson({
    level,
    lesson: withoutSceneOpener(greetingTalkLesson(level)),
  });
  const sessionId = await openTalkSession(profileId, row);
  const card = (row.content as TalkLesson).card;
  const page = await speechPage(context, talkScript(runs(card)));
  await page.goto(`/session/${sessionId}`);
  await pastStart(page);
  return { page, profileId, sessionId, card, row };
}

/** 인사 첫 질문(카드 — 막힘 · 쉼 뒤 같은 턴인지 본다). */
function greetingQuestion(card: TalkCard): string {
  if (!("questions" in card.greeting)) throw new Error("견본 꼴 — 인사 질문");
  const turn = card.greeting.questions[0];
  if (!turn) throw new Error("견본 꼴 — 인사 질문");
  return turn.question.en;
}

/** 말하기를 눌러 보낸다: 인식 확인이 뜨면 '보내기'. */
async function sendTurn(page: Page) {
  await page.locator("[data-child-turn] [data-speak]").click();
  const confirm = page.locator("[data-child-confirm]");
  const sent = page.locator("[data-child-said]");
  await expect(sent.or(confirm).first()).toBeVisible({ timeout: WAIT_MS });
  if (await confirm.isVisible())
    await confirm.getByRole("button", { name: T.send }).click();
}

/**
 * 그 세션의 대화 기록(차례 · 말한 쪽 · 글 · 시도 id). 같은 차례 번호의 선생님 행 · 아이 행은 말한 쪽 enum 차례(tori → child, content.ts
 * speakerEnum)로 — 앱 sortTurns(server/conversation/state.ts)와 같은 차례다. 기록 시각은 pastTurnInFlight 가 아이 행을 물리고 id 는 무작위
 * uuid 라 둘째 정렬로 쓰지 않는다(e2e 첫 실행 flaky — N-12 행 차례 바뀜).
 */
async function turnRows(sessionId: string) {
  return e2eDb()
    .select({
      turnNo: talkTurns.turnNo,
      speaker: talkTurns.speaker,
      text: talkTurns.text,
      clientAttemptId: talkTurns.clientAttemptId,
    })
    .from(talkTurns)
    .where(eq(talkTurns.sessionId, sessionId))
    .orderBy(talkTurns.turnNo, talkTurns.speaker);
}

// ── 막힘 셋(N-1 · N-2 · N-3) ──

test.describe("필수 경로 나 — 막힘 셋(AC-23g · R-47 · [승인 UX3])", () => {
  test.setTimeout(LONG);

  test("AC-23g N-1 말하기 세션 막힘: 마이크 막힘 판의 큰 '다시 해 볼래요'로 같은 활동 · 같은 시도로 돌아오고 그 사이 홈 요청이 0회다", async ({
    context,
  }) => {
    const { profileId } = await insertHousehold({
      startLevels: { speaking: 1 },
    });
    const lesson = await seedLesson("speaking");
    const word = (
      lesson.content as { content: { repeat: { words: string[] } } }
    ).content.repeat.words[0];
    if (!word) throw new Error("견본 꼴 — 따라 말할 낱말");
    const sessionId = await openSeedSession(profileId, lesson);
    const page = await speechPage(
      context,
      runsScript([failingRun("not-allowed"), SOUND_RUN, said(word)]),
    );
    await page.goto(`/session/${sessionId}`);
    await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
    await page.getByRole("button", { name: T.next }).click();
    await expect(page.locator("[data-mic-notice]")).toBeVisible();
    await page.getByRole("button", { name: T.micOk }).click();
    const watch = watchHomeRequests(page);
    const speak = page.locator(
      "[data-repeat-activity] [data-speak]:not([data-speak-waiting])",
    );
    await expect(speak).toBeVisible({ timeout: WAIT_MS });
    const no = (await activity(page).getAttribute("data-activity-no")) ?? "";
    await speak.click();
    const blocked = page.locator("[data-blocked]");
    await expect(blocked).toContainText(T.needsMic);
    await expectButtons(blocked, T.retry, T.home);
    await blocked.locator('[data-button-size="big"]').click();
    // 같은 활동 · 끝 시도 없음(같은 시도) · 세션 진행
    await expect(blocked).toHaveCount(0, { timeout: WAIT_MS });
    await expect(activity(page)).toHaveAttribute("data-activity-no", no);
    expect(await finalAttempts(sessionId, Number(no))).toBe(0);
    expect(await sessionStatus(sessionId)).toBe("in_progress");
    // 그 낱말을 이어서 말할 수 있다
    await expect(speak).toBeVisible({ timeout: WAIT_MS });
    await speak.click();
    await expect(page.locator("[data-heard]")).toHaveText(word);
    expectNoHome(watch);
  });

  test("AC-23g N-2 회화 막힘: 대화 턴에서 마이크 막힘 → 큰 '다시 해 볼래요'로 같은 턴(같은 질문 · '시작!' 없이)으로 돌아오고 말하면 그 턴이 이어지며 그 사이 홈 요청이 0회다", async ({
    context,
  }) => {
    const { page, card, sessionId } = await openTalkAt(context, 1, () => [
      failingRun("not-allowed"),
      SOUND_RUN,
      saidRun("I'm good."),
    ]);
    const watch = watchHomeRequests(page);
    const question = greetingQuestion(card);
    await untilChildTurn(page);
    await expect(page.locator("[data-tori-bubble]")).toContainText(question);
    await page.locator("[data-child-turn] [data-speak]").click();
    const blocked = page.locator("[data-blocked]");
    await expect(blocked).toContainText(T.needsMic);
    await expectButtons(blocked, T.retry, T.home);
    await blocked.locator('[data-button-size="big"]').click();
    await expect(blocked).toHaveCount(0, { timeout: WAIT_MS });
    await expect(page.locator("[data-talk-start]")).toHaveCount(0);
    await expect(page.locator("[data-tori-bubble]")).toContainText(question);
    expect(
      (await turnRows(sessionId)).filter((r) => r.speaker === "child"),
    ).toHaveLength(0);
    await pushFakeAi([talkLessonReply({ tori_en: "Great! Let's talk." })]);
    await untilChildTurn(page);
    await sendTurn(page);
    await expect(page.locator("[data-tori-bubble]")).toContainText("Great!", {
      timeout: WAIT_MS,
    });
    expect(await sessionStatus(sessionId)).toBe("in_progress");
    expectNoHome(watch);
  });

  test("AC-23g N-3 말하기 배치 막힘: 따라 말하기 문항에서 마이크 막힘 → 큰 '다시 해 볼래요'로 같은 문항(문제 번호 · 문항 id)으로 돌아오고 그 사이 홈 요청이 0회다", async ({
    context,
  }) => {
    await insertHousehold();
    const micOk = DEFAULT_OK.recognitions[0];
    if (!micOk) throw new Error("기본 대본 꼴 — 마이크 확인");
    const page = await speechPage(
      context,
      runsScript([micOk, failingRun("not-allowed"), micOk]),
    );
    await page.goto("/speaking/placement");
    await expect(
      page.locator("[data-placement-screen][data-hydrated]"),
    ).toHaveCount(1);
    await page.getByRole("button", { name: T.placementStart }).click();
    await page.getByRole("button", { name: T.micCheck }).click();
    const item = page.locator("[data-placement-item]");
    await expect(item).toHaveCount(1, { timeout: WAIT_MS });
    const itemId = (await item.getAttribute("data-placement-item")) ?? "";
    const watch = watchHomeRequests(page);
    await page.getByRole("button", { name: T.speak }).click();
    const screen = page.locator("[data-placement-screen]");
    await expect(page.getByText(T.needsMic)).toBeVisible({ timeout: WAIT_MS });
    await expectButtons(screen, T.retry, T.home);
    await screen.locator('[data-button-size="big"]').click();
    await expect(page.locator(`[data-placement-item="${itemId}"]`)).toBeVisible(
      { timeout: WAIT_MS },
    );
    await expect(page.locator("[data-paper-band]")).toContainText("문제 1");
    await expect(page.getByText(T.needsMic)).toHaveCount(0);
    expectNoHome(watch);
  });
});

// ── 쉼 셋(N-5 · N-6 · N-7) ──

test.describe("필수 경로 나 — 쉼(AC-23g · R-49 · R-50 · [승인 UX4])", () => {
  test.setTimeout(LONG);

  test("AC-23g N-5 세션 도중 쉼: 큰 '홈' · 작은 '다시 해 볼래요', 아직 쉬면 '아직 쉬고 있어요 …', 상한이 풀리면 같은 세션의 같은 활동으로 돌아오고 그 사이 홈 요청이 0회다", async ({
    page,
  }) => {
    const sample = guidedSample(5);
    await atLevel(
      { area: "writing", level: sample.level },
      async (profileId) => {
        const lesson = await insertSampleLesson({ sample });
        const sessionId = await openLessonSession(profileId, lesson);
        await reachSafetyCap(profileId);
        await page.goto(`/session/${sessionId}`);
        await expect(
          page.locator("[data-activity][data-hydrated]"),
        ).toHaveCount(1);
        const watch = watchHomeRequests(page);
        const rest = page.locator("[data-ai-rest]");
        await expect(rest).toContainText(T.writingRest);
        await expectButtons(rest, T.home, T.retry);
        const no =
          (await activity(page).getAttribute("data-activity-no")) ?? "";
        await rest.locator('[data-button-size="small"]').click();
        await expect(rest.locator("[data-ai-rest-still]")).toHaveText(
          T.restStill,
        );
        await liftSafetyCap(profileId);
        await rest.locator('[data-button-size="small"]').click();
        await expect(rest).toHaveCount(0, { timeout: WAIT_MS });
        await expect(page).toHaveURL(new RegExp(`/session/${sessionId}$`));
        await expect(activity(page)).toHaveAttribute("data-activity-no", no);
        expect(await sessionStatus(sessionId)).toBe("in_progress");
        expectNoHome(watch);
      },
    );
  });

  test("AC-23g N-6 회화 도중 쉼: 아이 말 뒤 쉼 → 큰 '홈' · 작은 '다시 해 볼래요', 상한이 풀리면 같은 시도 id 로 그 턴이 이어져('시작!' 없이) 다음 선생님 말이 오고 그 사이 홈 요청이 0회다", async ({
    context,
  }) => {
    const greeting = "I'm good.";
    const { page, profileId, sessionId } = await openTalkAt(context, 1, () => [
      saidRun(greeting),
    ]);
    const watch = watchHomeRequests(page);
    await untilChildTurn(page);
    await reachSafetyCap(profileId);
    await sendTurn(page);
    const rest = page.locator("[data-ai-rest]");
    await expect(rest).toContainText(T.talkRest, { timeout: WAIT_MS });
    await expectButtons(rest, T.home, T.retry);
    await rest.locator('[data-button-size="small"]').click();
    await expect(rest.locator("[data-ai-rest-still]")).toHaveText(T.restStill);
    // 쉼 길에 남은 아이 행(토리 말 없음) — 같은 시도 id 로 다시 받는다
    const child = (await turnRows(sessionId)).filter(
      (r) => r.speaker === "child",
    );
    expect(child).toHaveLength(1);
    const attemptId = child[0]?.clientAttemptId;
    // 상한을 풀고, 그 아이 행을 서버 진행 창 너머로 물린다(0-가 검토 M4 — 실제로는 그만큼 기다린 뒤의 다시 보냄)
    await liftSafetyCap(profileId);
    await pastTurnInFlight(sessionId);
    await pushFakeAi([talkLessonReply({ tori_en: "Great! Let's talk." })]);
    await rest.locator('[data-button-size="small"]').click();
    await expect(rest).toHaveCount(0, { timeout: WAIT_MS });
    await expect(page.locator("[data-tori-bubble]")).toContainText("Great!", {
      timeout: WAIT_MS,
    });
    await expect(page.locator("[data-talk-start]")).toHaveCount(0);
    const rows = await turnRows(sessionId);
    expect(rows.filter((r) => r.clientAttemptId === attemptId)).toHaveLength(1);
    expect(rows.filter((r) => r.speaker === "child")).toHaveLength(1);
    expect(await sessionStatus(sessionId)).toBe("in_progress");
    expectNoHome(watch);
  });

  test("AC-23g N-7 결과 '다음 수업' 쉼: 큰 단추 자리에 안내 · 큰 '홈' · 작은 '다시 해 볼래요', 상한이 풀리면 그 수업이 시작되고 그 사이 홈 요청이 0회다", async ({
    page,
  }) => {
    const sample = guidedSample(5);
    await atLevel(
      { area: "writing", level: sample.level },
      async (profileId) => {
        const first = await insertSampleLesson({ sample, lessonNo: 1 });
        const second = await insertSampleLesson({ sample, lessonNo: 2 });
        const at = new Date();
        const [doneId] = await insertSessions([
          {
            profileId,
            area: "writing",
            level: first.level,
            unit: first.unit ?? 1,
            lessonId: first.id,
            kind: "regular",
            status: "completed",
            startedAt: at,
            completedAt: at,
            learningDay: at.toISOString().slice(0, 10),
            seedRevision: first.revision,
            seedCorrection: first.correction,
            score: 1,
          },
        ]);
        if (!doneId) throw new Error("끝낸 세션 없음");
        await reachSafetyCap(profileId);
        await page.goto(`/result/${doneId}`);
        await expect(page.locator("[data-result][data-hydrated]")).toHaveCount(
          1,
        );
        const watch = watchHomeRequests(page);
        await page.getByRole("button", { name: T.nextLesson }).click();
        const rest = page.locator("[data-result] [data-ai-rest]");
        await expect(rest).toContainText(T.writingRest, { timeout: WAIT_MS });
        await expectButtons(rest, T.home, T.retry);
        await rest.locator('[data-button-size="small"]').click();
        await expect(rest.locator("[data-ai-rest-still]")).toHaveText(
          T.restStill,
          { timeout: WAIT_MS },
        );
        await liftSafetyCap(profileId);
        await rest.locator('[data-button-size="small"]').click();
        await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/, {
          timeout: WAIT_MS,
        });
        const opened = page.url().split("/").at(-1) ?? "";
        const [row] = await e2eDb()
          .select({ lessonId: sessions.lessonId })
          .from(sessions)
          .where(eq(sessions.id, opened));
        expect(row?.lessonId).toBe(second.id);
        expectNoHome(watch);
      },
    );
  });

  test("AC-23g N-7 회화 마무리 '다음 이야기' 쉼: 셋째 장은 그대로 큰 단추 자리에 안내 · 큰 '홈' · 작은 '다시 해 볼래요', 상한이 풀리면 그 수업이 시작되고 그 사이 홈 요청이 0회다", async ({
    context,
  }) => {
    const { page, profileId, card } = await openTalkAt(context, 1, (c) => [
      saidRun("I'm good."),
      saidRun(c.closingLines[0]?.en ?? ""),
    ]);
    const watch = watchHomeRequests(page);
    await pushFakeAi([talkLessonReply({ tori_en: "Great! Let's talk." })]);
    await untilChildTurn(page);
    await sendTurn(page);
    // 대화 첫 질문(카드 첫 필수 질문)이 붙은 뒤 '그만하기' → 정리(되짚을 말 따라 말하기) → 마무리 첫 장 → 셋째 장
    const firstTurn = card.required[0]?.en;
    if (!firstTurn) throw new Error("견본 꼴 — 대화 첫 질문");
    await expect(page.locator("[data-tori-bubble]")).toContainText(firstTurn, {
      timeout: WAIT_MS,
    });
    await untilChildTurn(page);
    await page.locator("[data-paper-band] [data-talk-stop]").click();
    await page.getByRole("button", { name: T.stopYes }).click();
    await expect(page.locator("[data-talk-wrap]")).toBeVisible({
      timeout: WAIT_MS,
    });
    await page
      .locator("[data-talk-wrap] [data-speak]:not([data-speak-waiting])")
      .click();
    await expect(page.locator('[data-closing-card="1"]')).toBeVisible({
      timeout: WAIT_MS,
    });
    await page.getByRole("button", { name: T.next, exact: true }).click();
    const third = page.locator('[data-closing-card="3"]');
    await expect(third).toBeVisible();
    await reachSafetyCap(profileId);
    await third.getByRole("button", { name: T.nextStory }).click();
    const rest = third.locator("[data-ai-rest]");
    await expect(rest).toContainText(T.talkRest, { timeout: WAIT_MS });
    await expectButtons(rest, T.home, T.retry);
    await rest.locator('[data-button-size="small"]').click();
    await expect(rest.locator("[data-ai-rest-still]")).toHaveText(T.restStill, {
      timeout: WAIT_MS,
    });
    await liftSafetyCap(profileId);
    await rest.locator('[data-button-size="small"]').click();
    await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/, {
      timeout: WAIT_MS,
    });
    expectNoHome(watch);
  });
});

// ── 목록 · 홈 쉼과 홈 다시 확인(N-8 · N-9 · N-10) ──

test.describe("필수 경로 나 — 목록 · 홈은 화면을 떠나지 않는다(AC-23g · R-10 · R-11 · R-15)", () => {
  test.setTimeout(LONG);

  test("AC-23g N-8 수업 목록 쉼: 목록 그대로 누른 카드 아래 한 줄 칸에 쉼 글, 다시 누르면 다시 판정하고 풀리면 그 수업이 열리며 그 사이 홈 요청이 0회다", async ({
    page,
  }) => {
    const sample = guidedSample(5);
    await atLevel(
      { area: "writing", level: sample.level },
      async (profileId) => {
        await insertSampleLesson({ sample });
        await reachSafetyCap(profileId);
        await page.goto("/writing/lessons");
        await expect(
          page.locator("[data-lesson-board][data-hydrated]"),
        ).toHaveCount(1);
        const watch = watchHomeRequests(page);
        const card = page.locator('[data-lesson="assigned-1"]');
        await card.click();
        const line = page.locator("[data-lesson-wait] [data-ai-rest-line]");
        await expect(line).toContainText(T.writingRest, { timeout: WAIT_MS });
        await expect(page).toHaveURL(/\/writing\/lessons$/);
        await card.click();
        await expect(line.locator("[data-ai-rest-still]")).toHaveText(
          T.restStill,
          { timeout: WAIT_MS },
        );
        await liftSafetyCap(profileId);
        await card.click();
        await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/, {
          timeout: WAIT_MS,
        });
        expectNoHome(watch);
      },
    );
  });

  // N-9 의 '첨삭이 왔어요' 경우: 첨삭이 온 쪽지가 여는 것은 둘째 세션(고쳐 쓰기)이고 둘째 세션은 AI 를 부르지 않아 상한 날에도 막지 않는다
  // (13절 C80 · server/session/index.ts 수업 시작의 rewrite 갈래, e2e 첫 실행 묶음 N — 컨트롤러 결정 (가) C80 유지). 쉼 한 줄 칸은 목록 쉼(N-8)이 본다
  test("AC-23g N-9 홈 '첨삭이 왔어요'(C80): 하루 안전 상한에 닿은 날에도 쪽지를 누르면 같은 초고의 둘째 세션(고쳐 쓰기)이 바로 열리고 홈을 다시 읽지 않는다", async ({
    page,
  }) => {
    const sample = compositionSample();
    await atLevel(
      { area: "writing", level: sample.level },
      async (profileId) => {
        const lesson = await insertSampleLesson({ sample });
        await insertReadyDraft(profileId, lesson);
        await reachSafetyCap(profileId);
        await page.goto("/");
        await expect(
          page.locator("[data-home-cards][data-hydrated]"),
        ).toHaveCount(1);
        // 홈에 들어온 뒤부터 센다 — 둘째 세션으로 가는 동안 홈을 다시 읽지 않는다
        const watch = watchHomeRequests(page);
        await page.getByText(T.feedbackReady, { exact: true }).click();
        await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/, {
          timeout: WAIT_MS,
        });
        await expect(activity(page)).toHaveAttribute(
          "data-activity",
          "feedback-praise",
        );
        await expect(page.getByText(READY_FEEDBACK.praise)).toBeVisible();
        const opened = page.url().split("/").at(-1) ?? "";
        const [second] = await e2eDb()
          .select({
            lessonId: sessions.lessonId,
            writingPart: sessions.writingPart,
          })
          .from(sessions)
          .where(eq(sessions.id, opened));
        expect(second).toEqual({ lessonId: lesson.id, writingPart: "rewrite" });
        expectNoHome(watch);
      },
    );
  });

  test("AC-23g N-10 홈 닫힌 말하기 카드: 다시 확인 줄은 막힘 판과 같은 마이크 확인이라 안 되면 닫힌 채, 되면 저장된 '쓸 수 없음'을 지우고 카드가 열리며 홈을 다시 읽지 않는다", async ({
    context,
  }) => {
    await insertHousehold({
      startLevels: { reading: 1, writing: 1, speaking: 1, talk: 1 },
    });
    const page = await speechPage(
      context,
      runsScript([failingRun("not-allowed"), SOUND_RUN]),
    );
    await page.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          state: "unavailable",
          code: "not-allowed",
          at: "2026-10-29T00:00:00Z",
        }),
      );
    }, MIC_STATE_KEY);
    await page.goto("/");
    const speaking = page
      .locator("a, button")
      .filter({ has: page.locator('[data-home-card="speaking"]') });
    await expect(speaking).toContainText(T.needsMic);
    const watch = watchHomeRequests(page);
    const recheck = page.locator("[data-mic-recheck]");
    await expect(recheck).toBeEnabled({ timeout: WAIT_MS });
    // 첫 확인은 안 됨 → 닫힌 채
    await recheck.click();
    await expect(recheck).toBeEnabled({ timeout: WAIT_MS });
    await expect(speaking).toContainText(T.needsMic);
    // 둘째 확인은 소리가 들어옴 → 카드가 열린다
    await recheck.click();
    await expect(speaking).toHaveAttribute("href", "/speaking/lessons", {
      timeout: WAIT_MS,
    });
    expect(
      await page.evaluate((key) => localStorage.getItem(key), MIC_STATE_KEY),
    ).toBeNull();
    await expect(page).toHaveURL(/\/$/);
    expectNoHome(watch);
  });
});

// ── 앱 오류 · 없는 주소(N-15 · N-16) ──

test.describe("필수 경로 나 — 앱 오류 · 없는 주소(AC-23g · R-52)", () => {
  test.setTimeout(LONG);

  test("AC-23g N-15 앱 오류: 서버 그리기가 던지면 '잠깐 문제가 생겼어요' · 큰 '다시 해 볼래요' · 작은 '홈', 고친 뒤 '다시 해 볼래요'는 판이 바뀔 때까지 흐린 채(data-trouble-retrying) 같은 세션의 같은 활동을 다시 그리고 그 사이 홈 요청이 0회다", async ({
    page,
  }) => {
    const { profileId } = await insertHousehold({
      startLevels: { reading: 1 },
    });
    const sessionId = await openSeedSession(
      profileId,
      await seedLesson("reading"),
    );
    await page.goto(`/session/${sessionId}`);
    await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
    const no = (await activity(page).getAttribute("data-activity-no")) ?? "";
    const watch = watchHomeRequests(page);
    const restore = await removeHouseholdSetting(BREAKING_SETTING);
    try {
      await page.reload();
      const board = page.locator("[data-app-error]");
      await expect(
        board.getByRole("heading", { name: T.appError }),
      ).toBeVisible({ timeout: WAIT_MS });
      await expectButtons(board, T.retry, T.home);
      // 판이 바뀔 때까지 '다시 해 볼래요'의 흐림이 남는지 기록한다(바뀐 때마다 — 표본이 아닌 변화 기록)
      await page.evaluate(() => {
        type Row = { retrying: boolean; board: boolean };
        const w = window as unknown as { __troubleLog?: Row[] };
        const log: Row[] = [];
        w.__troubleLog = log;
        const take = () =>
          log.push({
            retrying:
              document.querySelector(
                "[data-app-retry][data-trouble-retrying]",
              ) !== null,
            board: document.querySelector("[data-app-error]") !== null,
          });
        take();
        new MutationObserver(take).observe(document.body, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: ["data-trouble-retrying"],
        });
      });
      await restore();
      await board.locator('[data-button-size="big"]').click();
      await expect(board).toHaveCount(0, { timeout: WAIT_MS });
      await expect(page).toHaveURL(new RegExp(`/session/${sessionId}$`));
      await expect(activity(page)).toHaveAttribute("data-activity-no", no);
      const log = await page.evaluate(
        () =>
          (
            window as unknown as {
              __troubleLog?: { retrying: boolean; board: boolean }[];
            }
          ).__troubleLog ?? [],
      );
      const firstRetrying = log.findIndex((r) => r.retrying);
      const gone = log.findIndex((r) => !r.board);
      expect(firstRetrying, JSON.stringify(log)).toBeGreaterThanOrEqual(0);
      expect(gone, JSON.stringify(log)).toBeGreaterThan(firstRetrying);
      // 붙은 뒤로 판이 바뀌기 전까지 흐림이 풀린 적이 없다
      expect(
        log.slice(firstRetrying, gone).every((r) => r.retrying),
        JSON.stringify(log),
      ).toBe(true);
      expect(await sessionStatus(sessionId)).toBe("in_progress");
      expectNoHome(watch);
    } finally {
      await restore();
    }
  });

  test("AC-23g N-16 없는 주소: 모르는 세션 id · 틀린 꼴 id 의 세션 · 결과 주소는 '찾는 화면이 없어요'와 큰 '홈' 하나이고 홈으로 보내지 않는다", async ({
    page,
  }) => {
    // 남의 세션 갈래는 넣지 않는다(0-마 검토 M1): 1-가 집은 프로필이 하나이고 앱은 그 집의 첫 프로필을 순서 없이 읽으므로(limit 1), 시험이
    // 프로필을 하나 더 넣으면 어느 쪽이 '집 프로필'인지 흔들린다. 그 갈래는 '그 프로필에서 찾지 못한 세션'과 같은 길이라 단위
    // (session-destination.test 'N-16 …')와 통합(session-flow.test '결과 틀 · U4-1 … 남의 세션은 없다')이 지킨다.
    await insertHousehold({ startLevels: { reading: 1 } });
    await page.goto("/reading/lessons");
    const watch = watchHomeRequests(page);
    for (const id of [randomUUID(), "not-a-session"]) {
      for (const path of [`/session/${id}`, `/result/${id}`]) {
        await page.goto(path);
        await expect(page).toHaveURL(new RegExp(`${path}$`));
        const board = page.locator("[data-not-found]");
        await expect(
          board.getByRole("heading", { name: T.missing }),
        ).toBeVisible();
        const buttons = board.locator("[data-button-size]");
        await expect(buttons).toHaveCount(1);
        await expect(buttons).toHaveAttribute("data-button-size", "big");
        await expect(buttons).toHaveText(T.home);
        await expect(page.getByText(T.retry)).toHaveCount(0);
      }
    }
    expectNoHome(watch);
  });
});

// ── 복구 예외 둘(4.1 · R-58) ──

test.describe("필수 경로 나 — 복구 예외(AC-23g · 설계 4.1)", () => {
  test.setTimeout(LONG);

  test("AC-23g N-12 회화 4단계 턴 두 번 실패: '여기까지 이야기한 것은 저장했어요 …' → '수업 목록' → '하던 수업 이어 하기'로 같은 대화 기록 · 같은 말 주고받기 수와 다음 선생님 말이 오고 그 사이 홈 요청이 0회다", async ({
    context,
  }) => {
    await withHouseholdSetting(
      "seed.complete_through_level",
      LEVEL_MAX,
      async () => {
        const { page, sessionId, card } = await openTalkAt(context, 4, () => [
          saidRun("I'm fine, thank you."),
        ]);
        const watch = watchHomeRequests(page);
        await untilChildTurn(page);
        const countLine = page.locator("[data-talk-count]");
        const countBefore = (await countLine.count())
          ? await countLine.innerText()
          : undefined;
        // 첫 문장 전 연결 오류 두 번(서버가 한 번 다시 부름) → 'Oops' 쉼
        await pushFakeAi([
          {
            when: { bodyIncludes: TURN_MARK },
            reply: { kind: "network-error" },
            times: 2,
          },
        ]);
        await sendTurn(page);
        const broke = page.locator("[data-talk-break]");
        await expect(broke).toContainText(T.saved, { timeout: WAIT_MS });
        const before = await turnRows(sessionId);
        const orphan = before.at(-1);
        expect(orphan?.speaker).toBe("child");
        await broke.getByRole("button", { name: T.lessons }).click();
        await expect(page).toHaveURL(/\/talk\/lessons$/);
        const resume = page.locator('[data-top-item="resume"]');
        await expect(resume).toBeVisible({ timeout: WAIT_MS });
        expect(await sessionStatus(sessionId)).toBe("in_progress");
        // 기다린 뒤의 다시 받음(진행 창 너머 — 0-가 검토 M4 와 같은 까닭)
        await pastTurnInFlight(sessionId);
        await pushFakeAi([
          talkLessonReply(
            { tori_en: "Great to hear!" },
            { model: TALK_MODEL_MID, firstDelayMs: FIRST_DELAY_MS },
          ),
        ]);
        await resume.click();
        await expect(page).toHaveURL(new RegExp(`/session/${sessionId}$`));
        // 열 때마다 '시작!' 한 번(설계) — 마이크 안내는 이 기기에서 이미 봄
        await pastStart(page, { micNotice: false });
        if (countBefore !== undefined)
          await expect(countLine).toHaveText(countBefore);
        // 끊긴 턴은 인사 끝 턴이라 반응 뒤 화면 자료를 다시 읽어 대화 첫 질문 행(앱, AI 없음)이 이어 선다(talk-frame lessonAfterEndOf
        // 'reload' — 읽어 주기 끝을 기다리지 않음, C166 R1). 반응은 0.4초 안팎에 기록 칸으로 올라가므로 말풍선 · 기록 칸 어느 쪽이든 보고,
        // 대화 첫 질문이 말풍선에 선 뒤에 행을 읽는다(그 앞에 읽으면 둘째 행이 시점에 따라 있다 없다 한다 — CI 42347764557 트레이스로 확인)
        await expect(
          page
            .locator("[data-tori-bubble], [data-talk-log-teacher]")
            .filter({ hasText: "Great to hear!" })
            .first(),
        ).toBeVisible({ timeout: WAIT_MS });
        const firstQuestion = card.required[0]?.en;
        if (!firstQuestion) throw new Error("견본 꼴 — 첫 필수 질문");
        await expect(page.locator("[data-tori-bubble]")).toContainText(
          firstQuestion,
          { timeout: WAIT_MS },
        );
        const after = await turnRows(sessionId);
        // 같은 대화 기록(앞 행 그대로) · 같은 시도 id 의 아이 행 하나 · 다음 선생님 말 하나(끊긴 턴의 반응) + 대화 첫 질문 행
        expect(after.slice(0, before.length)).toEqual(before);
        expect(
          after.filter((r) => r.clientAttemptId === orphan?.clientAttemptId),
        ).toHaveLength(1);
        const added = after.slice(before.length);
        expect(added.map((r) => r.speaker)).toEqual(["tori", "tori"]);
        expect(added[0]?.text).toContain("Great to hear!");
        expect(added[1]?.text).toContain(firstQuestion);
        expectNoHome(watch);
      },
    );
  });

  test("AC-23g N-13 첨삭 대기: 결과 '수업 목록' → '아직 글을 살펴보고 있어요' → 가짜 첨삭 도착 → '첨삭 보기'로 같은 초고의 둘째 세션이 열리고 그 사이 홈 요청이 0회다", async ({
    page,
  }) => {
    const sample = compositionSample();
    await atLevel(
      { area: "writing", level: sample.level },
      async (profileId) => {
        const lesson = await insertSampleLesson({ sample });
        // 다른 부름이 첨삭을 잡고 있는 대기(서버가 더 부르지 않음) · 낸 지 오래(결과의 기다림이 끝나 '수업 목록')
        const firstId = await insertReadyDraft(profileId, lesson, {
          pending: true,
          claimed: true,
        });
        await shiftTimes("sessions", firstId, 1);
        await page.goto(`/result/${firstId}`);
        await expect(page.locator("[data-result][data-hydrated]")).toHaveCount(
          1,
        );
        const watch = watchHomeRequests(page);
        const list = page.locator('[data-result-next="list"]');
        await expect(list).toHaveText(T.lessons, { timeout: WAIT_MS });
        await list.click();
        await expect(page).toHaveURL(/\/writing\/lessons$/);
        await expect(
          page.locator("[data-lesson-board][data-hydrated]"),
        ).toHaveCount(1);
        await page.locator('[data-lesson="assigned-1"]').click();
        await expect(
          page.locator("[data-lesson-wait]").getByText(T.stillReading, {
            exact: true,
          }),
        ).toBeVisible({ timeout: WAIT_MS });
        await expect(page).toHaveURL(/\/writing\/lessons$/);
        // 가짜 첨삭 도착 → 목록을 다시 읽으면 맨 위 '첨삭 보기'
        await deliverFeedback(firstId);
        await page.reload();
        const feedback = page.locator('[data-top-item="feedback"]');
        await expect(feedback).toBeVisible({ timeout: WAIT_MS });
        await feedback.click();
        await expect(page).toHaveURL(/\/session\/[0-9a-f-]+$/, {
          timeout: WAIT_MS,
        });
        await expect(activity(page)).toHaveAttribute(
          "data-activity",
          "feedback-praise",
        );
        await expect(page.getByText(READY_FEEDBACK.praise)).toBeVisible();
        const opened = page.url().split("/").at(-1) ?? "";
        const [second] = await e2eDb()
          .select({
            lessonId: sessions.lessonId,
            writingPart: sessions.writingPart,
          })
          .from(sessions)
          .where(eq(sessions.id, opened));
        expect(second).toEqual({ lessonId: lesson.id, writingPart: "rewrite" });
        expectNoHome(watch);
      },
    );
  });
});

// ── 소리를 들려주지 못함(N-19 · N-20) — 자리 ──
// N-19(소리가 과제 자극인 자리: '소리가 안 나왔어요. 다시 들어 봐요' · 큰 '다시 듣기' → 같은 문항, 다시도 못 들려주면 작은 '다음')는 묶음 5-나
// (말하기 세션 · 배치)와 6(회화 답 두 개 · 짧은 준비)이, N-20(글이 함께 보이는 설명: '소리가 안 나와서 글로 봐요')은 6 이 이 파일에 더한다.
// 가짜 음성 대본의 시작 알림 없음(utterances neverStart)으로 '들려주지 못함'을 만들고, 같은 꼴로 홈 요청 0회를 잰다.

/** 읽어 주기 시작 알림 상한(시험용 설정 — 감시가 '들려주지 못함'으로 넘기는 때). */
const SPEAK_START_MS =
  TEST_SETTINGS["speech.speak_start_timeout_seconds"].value * 1000;

/** 모든 읽어 주기가 시작 알림 없이 사라지는 기기(감시가 '들려주지 못함'으로 넘김)의 대본. */
const neverPlaysScript = (runs: RecognitionRun[]): SpeechScript => ({
  ...runsScript(runs),
  synthesis: {
    voices: DEFAULT_OK.synthesis?.voices ?? [],
    utterances: [{ neverStart: true }],
  },
});

test.describe("필수 경로 나 — 소리를 들려주지 못함(AC-23g N-19 · R-56 · R-57)", () => {
  test.setTimeout(LONG);

  test("AC-23g N-19 말하기 세션 따라 말하기: 본보기를 들려주지 못하면 안내와 큰 '다시 듣기'가 그 자리에 있고, '다시 듣기' 뒤에도 같은 활동(끝 시도 없음 · 세션 진행)이며 그 사이 홈 요청이 0회다", async ({
    context,
  }) => {
    const { profileId } = await insertHousehold({
      startLevels: { speaking: 1 },
    });
    const lesson = await seedLesson("speaking");
    const sessionId = await openSeedSession(profileId, lesson);
    const page = await speechPage(context, neverPlaysScript([]));
    await page.goto(`/session/${sessionId}`);
    await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
    await page.getByRole("button", { name: T.next }).click();
    await expect(page.locator("[data-mic-notice]")).toBeVisible();
    await page.getByRole("button", { name: T.micOk }).click();
    const watch = watchHomeRequests(page);
    const retry = page.locator("[data-repeat-activity] [data-sound-retry]");
    await expect(retry).toHaveAttribute("data-sound-retry", "retry", {
      timeout: SPEAK_START_MS + WAIT_MS,
    });
    await expect(retry).toContainText(T.soundNotice);
    const no = (await activity(page).getAttribute("data-activity-no")) ?? "";
    await retry.locator("[data-sound-retry-replay]").click();
    // 다시 듣기도 못 들려줌 — 같은 활동에 무음 모드 줄과 작은 '다음'
    await expect(retry).toHaveAttribute("data-sound-retry", "next", {
      timeout: SPEAK_START_MS + WAIT_MS,
    });
    await expect(retry.locator("[data-sound-retry-silent]")).toHaveText(
      T.silentMode,
    );
    await expect(activity(page)).toHaveAttribute("data-activity-no", no);
    expect(await finalAttempts(sessionId, Number(no))).toBe(0);
    expect(await sessionStatus(sessionId)).toBe("in_progress");
    expectNoHome(watch);
  });

  test("AC-23g N-19 R-56 말하기 배치: 본 문항 소리를 들려주지 못하면 '다시 듣기' 뒤 같은 문항, 작은 '다음'으로 같은 문제 번호의 예비 문항이 나오고, 예비 문항도 못 들려주면 '다음' 없이 '다시 듣기'를 기다리며 그 사이 홈 요청이 0회다", async ({
    context,
  }) => {
    await insertHousehold();
    const micOk = DEFAULT_OK.recognitions[0];
    if (!micOk) throw new Error("기본 대본 꼴 — 마이크 확인");
    const page = await speechPage(context, neverPlaysScript([micOk]));
    await page.goto("/speaking/placement");
    await expect(
      page.locator("[data-placement-screen][data-hydrated]"),
    ).toHaveCount(1);
    await page.getByRole("button", { name: T.placementStart }).click();
    await page.getByRole("button", { name: T.micCheck }).click();
    const item = page.locator("[data-placement-item]");
    await expect(item).toHaveCount(1, { timeout: WAIT_MS });
    const mainId = (await item.getAttribute("data-placement-item")) ?? "";
    const watch = watchHomeRequests(page);
    const retry = page.locator("[data-placement-screen] [data-sound-retry]");
    await expect(retry).toHaveAttribute("data-sound-retry", "retry", {
      timeout: SPEAK_START_MS + WAIT_MS,
    });
    await expect(retry).toContainText(T.soundNotice);
    await retry.locator("[data-sound-retry-replay]").click();
    await expect(retry).toHaveAttribute("data-sound-retry", "next", {
      timeout: SPEAK_START_MS + WAIT_MS,
    });
    // '다시 듣기' 뒤에도 같은 문항
    await expect(
      page.locator(`[data-placement-item="${mainId}"]`),
    ).toBeVisible();
    await expect(page.locator("[data-paper-band]")).toContainText("문제 1");
    await retry.locator("[data-sound-retry-next]").click();
    // 같은 문제 번호의 예비 문항(판정에 넣지 않음 — 문제 번호가 그대로)
    await expect(page.locator(`[data-placement-item="${mainId}"]`)).toHaveCount(
      0,
      { timeout: WAIT_MS },
    );
    await expect(item).toHaveCount(1);
    const spareId = (await item.getAttribute("data-placement-item")) ?? "";
    expect(spareId).not.toBe(mainId);
    await expect(page.locator("[data-paper-band]")).toContainText("문제 1");
    await expect(retry).toHaveAttribute("data-sound-retry", "retry", {
      timeout: SPEAK_START_MS + WAIT_MS,
    });
    await retry.locator("[data-sound-retry-replay]").click();
    // 예비 문항도 못 들려줌 — '다음' 없이 기다림(무음 모드 줄), 답 · '몰라요'는 소리를 들려줄 때까지 막힘
    await expect(retry).toHaveAttribute("data-sound-retry", "wait", {
      timeout: SPEAK_START_MS + WAIT_MS,
    });
    await expect(retry.locator("[data-sound-retry-next]")).toHaveCount(0);
    await expect(retry.locator("[data-sound-retry-silent]")).toHaveText(
      T.silentMode,
    );
    await expect(page.locator("[data-dont-know]")).toBeDisabled();
    await expect(
      page.locator(`[data-placement-item="${spareId}"]`),
    ).toBeVisible();
    expectNoHome(watch);
  });
});

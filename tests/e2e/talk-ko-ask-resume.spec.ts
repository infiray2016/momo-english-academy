// 수업 안 한국어로 묻기 — 이어 하기와 대화 기록의 화면 시험(화면 고침 3 '나' — b5-fix3, 재검토 rev-b5b-2 3절 · N-1). 재현 틀 장면
// chat-ko-resume 만 덮던 것(이어 하기의 '들었음' · 시작 전 끊김 · 지난 문답)과 지금 차례의 답이 빈 행을 CI 의 화면 시험으로 옮긴다. 수업 준비 ·
// 가짜 음성 · 가짜 AI · 요청 본문 모으기는 talk-ko-ask.spec.ts 와 같은 꼴이다(그 파일의 도우미는 내보내지 않아 필요한 만큼 옮겨 적었다 — 공용으로
// 빼는 정리는 다음에). 다시 열기는 쪽을 닫고 같은 문맥에 새 쪽을 연다(대본의 듣기 차례가 처음부터 다시 돌므로 다시 연 쪽의 대본을 따로 준다 —
// speechPage 꼴). 읽기 실패는 재현 틀 장면(tests/browser-check/pages/talk-chat 의 speakFails)과 같은 꼴로 가짜 음성 위에 speak 를 감싸 시작 알림
// 전에 오류를 낸다(recordInterruptedSpeech 와 같은 init script 꼴). 답이 빈 행은 서버가 질문을 받고 답을 채우기 전의 행(beginKoHelp 가 넣은 꼴)을
// 시험 DB 에 바로 만든다. 이 Mac 은 e2e DB 가 뜨지 않아 CI 에서 돈다.
import type { BrowserContext, Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { talkKoHelps } from "../../src/db/schema/learning";
import { closeE2eDb, e2eDb, resetHousehold } from "./db";
import {
  FAKE_KO_HELP,
  pushFakeAi,
  resetFakeAi,
  ruleFor,
  talkKoHelpReply,
} from "./fake-ai";
import { expect, speechPage, test } from "./fixtures";
import {
  collectTurnBodies,
  insertTalkLesson,
  koHelpRequests,
  koSaidRun,
  openTalkSession,
  saidRun,
  skipStartPrep,
  speechRecord,
  TALK_KO_HELP_URL,
  talkHousehold,
  talkLessonCard,
  talkLessonReply,
  talkScript,
  talkTurnRequests,
} from "./talk";

const T = {
  start: "시작!",
  micOk: "알겠어요",
  // 설계 6 문구 표(src/components/session/sound-retry.tsx SOUND_RETRY_TEXT.notice — 다른 e2e 처럼 글자 그대로 적는다)
  soundNotice: "소리가 안 나왔어요. 다시 들어 봐요",
} as const;
const LONG = 150_000;
const STREAM_END_MS = 30_000;
const LOW_LEVEL = 3;
/** 지난 문답 말풍선을 눌러 표현을 다시 듣는 가장 낮은 단계(정본 03 대화 기록 — 4단계부터). */
const READ_LEVEL = 4;
const QUESTION = "조개는 영어로 뭐야?";
/** 답이 빈 지난 행의 물은 말(시험 글 — 재현 틀 장면 chat-ko-resume 과 같은 글). */
const ASKED_ONLY = "수영은 영어로 뭐라고 해요";
const SAYS = "I like it.";
const TAUGHT = FAKE_KO_HELP.expression.teachEn;
const SAY_KO = FAKE_KO_HELP.expression.sayKo;
/**
 * 1~3단계 인사 차례의 가짜 응답(두 문장 모두 인사 끝 상황 검사를 지난다 — talk-ko-ask.spec 과 같은 값). 'Wow! Clams are cool.' 은 인사 차례에서
 * 걸려 시드 상황 줄(seed/lists/talk-situation-lines.json greeting_end)로 바뀐다(CI 실행 44252958636 의 이 파일 340줄 시험 trace).
 */
const GREETING_REPLY = "Great! Now let's start!";
/** 인사 차례 응답이 말풍선에 그대로 남았음을 보는 글(greeting_end 상황 줄 셋에 없음). */
const GREETING_SHOWN = "Now let's start";

test.beforeEach(async () => {
  await resetHousehold();
  await resetFakeAi();
});
test.afterEach(resetFakeAi);
test.afterAll(closeE2eDb);

const turn = (page: Page) => page.locator("[data-child-turn]");
const speakButton = (page: Page) =>
  page.locator("[data-child-turn] [data-speak]");
const koButton = (page: Page) =>
  page.locator("[data-child-turn] [data-ko-ask]");

/** 시작 알림 전에 실패시킬 읽기(재현 틀 장면의 speakFails 와 같은 꼴 — 그 글을 읽으려 하면 times 번까지 오류만 낸다). */
type SpeakFail = { text: string; error: string; times: number };

/**
 * 쪽 시작 스크립트(가짜 음성 다음 차례): speechSynthesis.speak 를 감싸 window.__speakFails 에 든 글이면 가짜 읽어 주기 줄에 넣지 않고 30ms 뒤
 * onerror 만 부른다(시작 알림 없음 — 앱 src/lib/speech/browser.ts 는 utterance.onerror 로 받는다). 실패시킨 읽기는 window.__failedReads
 * 에 '오류:글'로 남는다. 밖 이름을 쓰지 않는다(Playwright 가 함수 글을 옮긴다).
 */
function speakFailsInit(): void {
  type Utter = {
    text: string;
    onerror: ((this: Utter, event: Event) => void) | null;
  };
  type Fail = { text: string; error: string; times: number };
  const w = window as unknown as {
    speechSynthesis?: { speak(utterance: Utter): void };
    __speakFails?: Fail[];
    __failedReads?: string[];
  };
  const synth = w.speechSynthesis;
  if (!synth) return;
  w.__speakFails = [];
  const failed: string[] = [];
  w.__failedReads = failed;
  const speak = synth.speak.bind(synth);
  synth.speak = (utterance) => {
    const fail = (w.__speakFails ?? []).find(
      (f) => f.text === utterance.text && f.times > 0,
    );
    if (!fail) {
      speak(utterance);
      return;
    }
    fail.times -= 1;
    failed.push(`${fail.error}:${utterance.text}`);
    window.setTimeout(() => {
      const event = new Event("error");
      Object.defineProperty(event, "error", { value: fail.error });
      utterance.onerror?.call(utterance, event);
    }, 30);
  };
}

async function setSpeakFails(page: Page, fails: SpeakFail[]): Promise<void> {
  await page.evaluate((list) => {
    (window as unknown as { __speakFails?: SpeakFail[] }).__speakFails = list;
  }, fails);
}

async function failedReads(page: Page): Promise<string[]> {
  return page.evaluate(() => [
    ...((window as unknown as { __failedReads?: string[] }).__failedReads ??
      []),
  ]);
}

/** 가짜 음성(그 대본) · 읽기 실패 감싸기 · 회화 턴 요청 본문 모으기 · 한국어 질문 요청 수 세기를 건 새 쪽. 쪽을 열기 전에 건다. */
async function koPage(
  context: BrowserContext,
  runs: Parameters<typeof talkScript>[0],
) {
  const page = await speechPage(context, talkScript(runs));
  await page.addInitScript(speakFailsInit);
  const turnBodies = collectTurnBodies(page);
  const koAsks: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === TALK_KO_HELP_URL
    )
      koAsks.push(request.url());
  });
  return { page, turnBodies, koAsks };
}

async function untilChildTurn(page: Page) {
  await expect(turn(page)).toBeVisible({ timeout: STREAM_END_MS });
  await expect(
    page.locator("[data-talk-panel][data-talk-reading]"),
  ).toHaveCount(0, { timeout: STREAM_END_MS });
}

/** 수업을 열고 첫 아이 차례(인사 질문)까지 간다(talk-ko-ask.spec 의 openKoLesson 과 같은 꼴 — 읽기 실패 감싸기를 더함). */
async function openKoLesson(
  context: BrowserContext,
  level: number,
  runs: Parameters<typeof talkScript>[0],
) {
  const profileId = await talkHousehold(level);
  await skipStartPrep(profileId, level);
  const row = await insertTalkLesson({ level, lesson: talkLessonCard(level) });
  const sessionId = await openTalkSession(profileId, row);
  const opened = await koPage(context, runs);
  await opened.page.goto(`/session/${sessionId}`);
  await expect(opened.page.locator("[data-talk-start]")).toBeVisible();
  await opened.page.getByRole("button", { name: T.start }).click();
  await expect(opened.page.locator("[data-mic-notice]")).toBeVisible();
  await opened.page.getByRole("button", { name: T.micOk }).click();
  await untilChildTurn(opened.page);
  return { ...opened, sessionId };
}

/**
 * 이어 하기: 쪽을 닫고 같은 문맥(접근 쿠키 · 마이크 안내 본 표시가 그대로)에 새 쪽으로 그 세션을 다시 열어 아이 차례까지 간다. 새 쪽의 대본은 처음부터
 * 다시 돌므로 다시 연 뒤의 듣기만 준다.
 */
async function reopenIn(
  context: BrowserContext,
  page: Page,
  sessionId: string,
  runs: Parameters<typeof talkScript>[0],
) {
  await page.close();
  const opened = await koPage(context, runs);
  await opened.page.goto(`/session/${sessionId}`);
  await opened.page.getByRole("button", { name: T.start }).click();
  await untilChildTurn(opened.page);
  return opened;
}

/**
 * 영어 한 차례(말하기 → 가짜 회화 턴 응답 → 다음 아이 차례 — talk-ko-ask.spec 과 같은 꼴). shown 은 말풍선에서 기다릴 글(기본은 응답의 첫 '!' 앞).
 * 1~3단계 인사 차례의 응답은 인사 끝 상황 검사를 받아 걸린 문장이 시드 상황 줄로 바뀐다 — 인사 차례에는 GREETING_REPLY · GREETING_SHOWN 을
 * 쓴다(화면 고침 4).
 */
async function speakEnglish(
  page: Page,
  reply = "Great! Tell me more.",
  shown = reply.split("!")[0] ?? reply,
) {
  const before = await talkTurnRequests();
  await pushFakeAi([talkLessonReply({ tori_en: reply })]);
  await speakButton(page).click();
  await expect
    .poll(talkTurnRequests, { timeout: STREAM_END_MS })
    .toBe(before + 1);
  await expect(page.locator("[data-tori-bubble]")).toContainText(shown, {
    timeout: STREAM_END_MS,
  });
  await untilChildTurn(page);
}

/** '한국어로 물어보기' → 한국어 듣기 → 인식 확인의 '보내기' → 곁 말풍선(talk-ko-ask.spec 과 같은 꼴). 응답의 help(턴 번호 · 순번). */
async function askKorean(page: Page) {
  const reply = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === TALK_KO_HELP_URL &&
      r.request().method() === "POST",
    { timeout: STREAM_END_MS },
  );
  await koButton(page).click();
  await expect(page.locator("[data-ko-confirm]")).toBeVisible({
    timeout: STREAM_END_MS,
  });
  await expect(page.locator("[data-ko-confirm]")).toContainText(QUESTION);
  await page.locator("[data-ko-send]").click();
  const body = (await (await reply).json()) as {
    t: string;
    help?: { turnNo: number; seq: number };
  };
  expect(body.t).toBe("ok");
  await expect(page.locator("[data-ko-exchange]").last()).toBeVisible({
    timeout: STREAM_END_MS,
  });
  if (!body.help) throw new Error("한국어 질문 응답에 help 가 없음");
  return body.help;
}

async function spokenCount(page: Page, text: string): Promise<number> {
  return (await speechRecord(page)).spoken.filter((s) => s === text).length;
}

/**
 * 그 도움 행을 '답이 오기 전'의 꼴로 되돌린다(호출 중에 끊긴 행 — 서버 beginKoHelp 가 넣은 행처럼 질문 · 시도 id · 받은 때만 남는다, 스키마
 * talk_ko_helps 머리 주석 '답이 오기 전에는 갈래 · 답 칸이 비어 있다').
 */
async function unanswer(
  sessionId: string,
  help: { turnNo: number; seq: number },
) {
  await e2eDb()
    .update(talkKoHelps)
    .set({
      kind: null,
      sayKo: null,
      teachEn: null,
      shownEn: null,
      textShown: null,
      outOfRange: null,
      fallback: null,
      answeredAt: null,
    })
    .where(
      and(
        eq(talkKoHelps.sessionId, sessionId),
        eq(talkKoHelps.turnNo, help.turnNo),
        eq(talkKoHelps.seq, help.seq),
      ),
    );
}

/** 답이 빈 도움 행 하나를 바로 넣는다(물은 말만 — 지난 턴의 끊긴 질문). */
async function insertAskedOnly(
  sessionId: string,
  turnNo: number,
  seq: number,
  question: string,
) {
  await e2eDb()
    .insert(talkKoHelps)
    .values({
      sessionId,
      turnNo,
      seq,
      clientAttemptId: `e2e-ko-asked-${sessionId}-${turnNo}-${seq}`,
      question,
      askedAt: new Date(),
    });
}

test.describe("수업 안 한국어로 묻기 — 이어 하기의 답이 빈 행과 지난 문답(3단계)", () => {
  test("AC-25i · AC-N26 지금 차례의 답이 빈 행은 다시 열면 곁 말풍선에 물은 말만 있고 '한국어 도움' 딱지가 없으며, 한국어 질문을 다시 보내지 않고 다음 회화 턴 요청의 koHelp 에 들지 않는다. 3단계 지난 문답은 누를 것 · 표현 글이 없고 지난 턴의 답이 빈 행은 물은 말만 보인다(rev-b5b-2 N-1 · rev-b5b I-1)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page, sessionId } = await openKoLesson(context, LOW_LEVEL, [
      koSaidRun(QUESTION),
      saidRun(SAYS),
      koSaidRun(QUESTION),
    ]);
    await pushFakeAi([ruleFor("talk_ko_help", talkKoHelpReply())]);
    // 지난 턴(인사 질문 차례): 답이 있는 표현 도움 하나 → 영어로 답해 차례를 넘긴다
    const past = await askKorean(page);
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    await speakEnglish(page);
    // 지금 차례: 한국어로 물은 뒤 그 행을 답이 오기 전 꼴로 되돌린다(호출 중에 끊긴 질문)
    const now = await askKorean(page);
    expect(now.turnNo).not.toBe(past.turnNo);
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    expect(await koHelpRequests()).toBe(2);
    await unanswer(sessionId, now);
    // 지난 턴에도 답이 빈 행 하나(그 턴의 둘째 물음)
    await insertAskedOnly(sessionId, past.turnNo, past.seq + 1, ASKED_ONLY);

    const back = await reopenIn(context, page, sessionId, [saidRun(SAYS)]);
    // 곁 말풍선: 지금 차례의 답이 빈 행은 물은 말만(딱지 · 한국어 답 · 듣기 단추 없음)
    const live = back.page.locator("[data-ko-exchange]");
    await expect(live).toHaveCount(1);
    await expect(live.locator("[data-ko-question]")).toHaveText(QUESTION);
    await expect(live.locator("[data-ko-badge]")).toHaveCount(0);
    await expect(live.locator("[data-ko-say]")).toHaveCount(0);
    await expect(live.locator("[data-ko-replay]")).toHaveCount(0);
    // 대화 기록: 지난 턴의 답이 있는 문답(1~3단계 — 누를 것 · 표현 글 없음)과 답이 빈 행(물은 말만)
    const log = back.page.locator("[data-talk-log] [data-ko-log]");
    await expect(log).toHaveCount(2);
    const answered = log.filter({ has: back.page.locator("[data-ko-say]") });
    await expect(answered).toHaveCount(1);
    await expect(answered.locator("[data-ko-say]")).toHaveText(SAY_KO);
    await expect(answered.locator("[data-ko-badge]")).toHaveText("한국어 도움");
    const askedOnly = log.filter({ hasText: ASKED_ONLY });
    await expect(askedOnly).toHaveCount(1);
    await expect(
      askedOnly.locator("[data-ko-say], [data-ko-badge]"),
    ).toHaveCount(0);
    await expect(back.page.locator("[data-ko-log-replay]")).toHaveCount(0);
    await expect(back.page.locator("body")).not.toContainText(TAUGHT);
    // 다시 부르지 않는다(이 쪽의 한국어 질문 요청 0 · 가짜 AI 가 받은 한국어 도움 요청 그대로)
    expect(back.koAsks).toHaveLength(0);
    expect(await koHelpRequests()).toBe(2);
    // 다음 회화 턴 요청: 답이 빈 행은 koHelp 에 들지 않는다(이 차례에 받은 도움이 없으니 칸 자체가 없다 — AC-N26)
    await expect(speakButton(back.page)).toBeEnabled();
    await speakEnglish(back.page, "Wow! Clams are cool.");
    expect(back.turnBodies).toHaveLength(1);
    expect(back.turnBodies[0]).not.toHaveProperty("koHelp");
    expect(back.koAsks).toHaveLength(0);
  });
});

test.describe("수업 안 한국어로 묻기 — 소리가 끊기거나 못 난 때(3단계)", () => {
  test("AC-25b · AC-25i · C221 가르친 표현의 소리가 시작 알림 전에 끊겨도 아이 차례가 열리고 '말하기'가 켜지며, 이어 하기로 되살린 도움은 다시 듣기가 소리를 못 내 '소리가 안 나왔어요'가 떠도 다음 회화 턴 요청의 koHelp 에서 들었음이 참이다(rev-b5a-2 N-1 · rev-b5b I-2)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page, sessionId } = await openKoLesson(context, LOW_LEVEL, [
      koSaidRun(QUESTION),
    ]);
    await pushFakeAi([ruleFor("talk_ko_help", talkKoHelpReply())]);
    // 가르친 표현의 첫 읽기가 시작 알림 전에 '끊김'(canceled)으로 끝난다
    await setSpeakFails(page, [{ text: TAUGHT, error: "canceled", times: 1 }]);
    const help = await askKorean(page);
    await expect
      .poll(() => failedReads(page), { timeout: STREAM_END_MS })
      .toEqual([`canceled:${TAUGHT}`]);
    // 그래도 아이 차례가 열리고 '말하기' · '한국어로 물어보기'가 켜진다(쉼 · 처리 중 그대로 남지 않음)
    await expect(speakButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    await expect(koButton(page)).toBeEnabled();
    expect(await spokenCount(page, TAUGHT)).toBe(0);

    // 이어 하기: 되살린 도움의 '알려 준 말 듣기'가 소리를 못 낸다(시작 전 오류)
    const back = await reopenIn(context, page, sessionId, [saidRun(SAYS)]);
    const exchange = back.page.locator("[data-ko-exchange]");
    await expect(exchange).toHaveCount(1);
    await setSpeakFails(back.page, [
      { text: TAUGHT, error: "synthesis-failed", times: 1 },
    ]);
    await exchange.locator("[data-ko-replay]").click();
    await expect
      .poll(() => failedReads(back.page), { timeout: STREAM_END_MS })
      .toEqual([`synthesis-failed:${TAUGHT}`]);
    // 셈은 그대로라 '소리가 안 나왔어요'와 큰 '알려 준 말 듣기'가 뜬다
    const retry = exchange.locator("[data-ko-retry='retry']");
    await expect(retry).toBeVisible({ timeout: STREAM_END_MS });
    await expect(retry).toContainText(T.soundNotice);
    await expect(
      retry.locator("[data-ko-replay][data-retry-size='big']"),
    ).toHaveCount(1);
    // 다음 영어 턴 요청의 koHelp: 들었음은 참(다시 열기 전에 들은 것으로 본다), 다시 들은 수 1
    await expect(speakButton(back.page)).toBeEnabled();
    await speakEnglish(back.page, GREETING_REPLY, GREETING_SHOWN);
    expect(back.turnBodies).toHaveLength(1);
    expect(back.turnBodies[0]?.koHelp).toEqual([
      { turnNo: help.turnNo, seq: help.seq, heard: true, replays: 1 },
    ]);
  });
});

test.describe("수업 안 한국어로 묻기 — 다시 연 대화 기록의 지난 문답(4단계)", () => {
  test("AC-25i · AC-25b 4단계: 다시 연 대화 기록의 지난 한국어 도움 말풍선을 누르면 가르친 표현 하나만 다시 읽고 한국어 답은 읽지 않으며, 지난 턴의 답이 빈 행은 물은 말만 보이고 다시 부르지 않는다(정본 03 대화 기록 · rev-b5b I-1)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page, sessionId } = await openKoLesson(context, READ_LEVEL, [
      koSaidRun(QUESTION),
      saidRun(SAYS),
    ]);
    await pushFakeAi([
      ruleFor("talk_ko_help", talkKoHelpReply({ band: "4-6" })),
    ]);
    const past = await askKorean(page);
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(1);
    await expect(speakButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    await speakEnglish(page);
    await insertAskedOnly(sessionId, past.turnNo, past.seq + 1, ASKED_ONLY);

    const back = await reopenIn(context, page, sessionId, [saidRun(SAYS)]);
    await expect(back.page.locator("[data-ko-exchange]")).toHaveCount(0);
    const log = back.page.locator("[data-talk-log] [data-ko-log]");
    await expect(log).toHaveCount(2);
    const askedOnly = log.filter({ hasText: ASKED_ONLY });
    await expect(askedOnly).toHaveCount(1);
    await expect(
      askedOnly.locator("[data-ko-say], [data-ko-badge], [data-ko-log-replay]"),
    ).toHaveCount(0);
    // 누를 말풍선은 답이 있는 문답 하나(표현 글이 보인다)
    const replay = back.page.locator("[data-ko-log] [data-ko-log-replay]");
    await expect(replay).toHaveCount(1);
    await expect(replay.locator("[data-ko-log-taught]")).toHaveText(TAUGHT);
    await expect(replay.locator("[data-ko-say]")).toHaveText(SAY_KO);
    const heard = await spokenCount(back.page, TAUGHT);
    await replay.click();
    await expect
      .poll(() => spokenCount(back.page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(heard + 1);
    const spoken = (await speechRecord(back.page)).spoken;
    expect(spoken).not.toContain(SAY_KO);
    expect(spoken.some((s) => s.includes(ASKED_ONLY))).toBe(false);
    // 다시 부르지 않는다
    expect(back.koAsks).toHaveLength(0);
    expect(await koHelpRequests()).toBe(1);
  });
});

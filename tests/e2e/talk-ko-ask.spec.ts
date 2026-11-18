// 수업 안 한국어로 묻기 화면 시험(묶음 5-나 — spec 판 3 설계 1 · 2 · 3, 13절 C226 A2 · B1 과 (1) ~ (4) · C221 · plan '증명' 표 AC-25a ~ f ·
// AC-25i · AC-25k · AC-25o · AC-N26 · AC-N28). 가짜 음성(인식기는 언어를 가리지 않고 글을 낸다 — 듣기의 언어는 인식 객체의 언어 기록으로 본다)과
// 가짜 AI(규격 제목 talk_ko_help)로 기존 방식 수업을 진행한다. 회화 턴 요청의 koHelp 칸은 서버 묶음 4-다 가 받으므로, 한국어로 물은 차례 뒤 영어
// 턴을 보내는 시험(AC-25i 기록 · AC-N26 · AC-25o)은 4-다 · 4-라 와 함께 CI 에서 처음 돈다. 이 Mac 은 e2e DB 가 뜨지 않아 CI 에서 돈다.
import type { BrowserContext, Page } from "@playwright/test";
import { eq, max } from "drizzle-orm";
import { KO_ASK_TIP } from "../../src/core/conversation/ko-ask";
import { talkMoveOf } from "../../src/core/conversation/move";
import { profiles, talkTurns } from "../../src/db/schema/learning";
import { TEST_SETTINGS } from "../fixtures/settings";
import { CHILD_VIEWPORTS } from "./child-size";
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
  recognitionLangs,
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
import { expectInView } from "./talk-in-view";

const T = { start: "시작!", micOk: "알겠어요" } as const;
const LONG = 150_000;
const STREAM_END_MS = 30_000;
const LOW_LEVEL = 3;
/** 글이 보이는 단계의 표본(10단계 — 힌트 단추가 없는 구간, AC-25a 의 10단계 단추). */
const HIGH_LEVEL = 10;
const QUESTION = "조개는 영어로 뭐야?";
const SAYS = "I like it.";
const TAUGHT = FAKE_KO_HELP.expression.teachEn;
/** 1~3단계 표현 답의 소리 앞 쉼(ms, 시험 설정값 talk.ko_ask_sound_pause_ms). */
const SOUND_PAUSE_MS = TEST_SETTINGS["talk.ko_ask_sound_pause_ms"].value;
/** 쉼을 잰 값의 여유(ms, 시험 값 — 곁 말풍선이 보인 것을 시험이 알아챈 늦음). */
const PAUSE_SLACK_MS = 300;
/** 누르는 곳의 최소 크기(px, 13절 C226 (1) · 정본 4절 큰 단추 — 시험 값). */
const TARGET_MIN_PX = 56;
const KO_LANG = TEST_SETTINGS["speech.lang_ko"].value;
const EN_LANG = TEST_SETTINGS["speech.lang"].value;
/** 기록 칸을 넘치게 넣을 앞선 대화 차례 쌍(talk-log-follow.spec 과 같은 값). */
const PAIRS = 6;

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
const hintButton = (page: Page) =>
  page.locator("[data-child-turn] [data-hint-button]");
const dontKnowButton = (page: Page) =>
  page.locator("[data-child-turn] [data-dont-know]");
const koLine = (page: Page) => page.locator("[data-child-turn] [data-ko-line]");

async function untilChildTurn(page: Page) {
  await expect(turn(page)).toBeVisible({ timeout: STREAM_END_MS });
  await expect(
    page.locator("[data-talk-panel][data-talk-reading]"),
  ).toHaveCount(0, { timeout: STREAM_END_MS });
}

/** 수업을 열고 첫 아이 차례(인사 질문)까지 간다. 회화 턴 요청 본문은 쪽을 열기 전부터 모은다. */
async function openKoLesson(
  context: BrowserContext,
  level: number,
  runs: Parameters<typeof talkScript>[0],
) {
  const profileId = await talkHousehold(level);
  await skipStartPrep(profileId, level);
  const row = await insertTalkLesson({ level, lesson: talkLessonCard(level) });
  const sessionId = await openTalkSession(profileId, row);
  const page = await speechPage(context, talkScript(runs));
  const turnBodies = collectTurnBodies(page);
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-talk-start]")).toBeVisible();
  await page.getByRole("button", { name: T.start }).click();
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
  await untilChildTurn(page);
  return { page, profileId, sessionId, turnBodies };
}

/** 쪽을 다시 열고(이어 하기) 아이 차례까지. */
async function reopen(page: Page) {
  await page.reload();
  await page.getByRole("button", { name: T.start }).click();
  await untilChildTurn(page);
}

/** 영어 한 차례(말하기 → 가짜 회화 턴 응답 → 다음 아이 차례). */
async function speakEnglish(page: Page, reply = "Great! Tell me more.") {
  const before = await talkTurnRequests();
  await pushFakeAi([talkLessonReply({ tori_en: reply })]);
  await speakButton(page).click();
  await expect
    .poll(talkTurnRequests, { timeout: STREAM_END_MS })
    .toBe(before + 1);
  await expect(page.locator("[data-tori-bubble]")).toContainText(
    reply.split("!")[0] ?? reply,
    { timeout: STREAM_END_MS },
  );
  await untilChildTurn(page);
}

/** '한국어로 물어보기' → 한국어 듣기 → 인식 확인의 '보내기' → 곁 말풍선. 한국어 질문 응답의 help(턴 번호 · 순번)를 돌려준다. */
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

/** 그 글을 읽어 준 수(가짜 음성 기록). */
async function spokenCount(page: Page, text: string): Promise<number> {
  return (await speechRecord(page)).spoken.filter((s) => s === text).length;
}

/** 앞선 대화 차례를 바로 넣는다(talk-log-follow.spec 의 insertExchanges 와 같은 꼴 — 기록 칸을 넘치게). */
async function insertExchanges(sessionId: string, count: number) {
  const db = e2eDb();
  const [top] = await db
    .select({ n: max(talkTurns.turnNo) })
    .from(talkTurns)
    .where(eq(talkTurns.sessionId, sessionId));
  let turnNo = Number(top?.n ?? 0);
  const at = new Date();
  for (let i = 0; i < count; i++) {
    await db.insert(talkTurns).values([
      {
        sessionId,
        turnNo,
        segment: "talk",
        speaker: "child",
        text: SAYS,
        inputMode: "speech",
        clientAttemptId: `e2e-ko-${sessionId}-${turnNo}`,
        recordedAt: at,
      },
      {
        sessionId,
        turnNo: turnNo + 1,
        segment: "talk",
        speaker: "tori",
        text: "Nice! I like it too.",
        move: talkMoveOf({ kind: "ai" }),
        recordedAt: at,
      },
    ]);
    turnNo += 1;
  }
}

test.describe("수업 안 한국어로 묻기 — 단추와 누름(3단계)", () => {
  test("AC-25a · AC-N28 · C226 (1) '말하기' 아래 같은 너비의 '한국어로 물어보기'(누르는 곳 56px 이상 · 두 단추가 겹치지 않음), 영어 듣기 동안 한국어 단추가 꺼지고 한국어 듣기 · 인식 확인 동안 '말하기' · '힌트' · '잘 모르겠어요'가 꺼진다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page } = await openKoLesson(context, LOW_LEVEL, [
      saidRun("I'm good."),
      koSaidRun(QUESTION),
    ]);
    await pushFakeAi([ruleFor("talk_ko_help", talkKoHelpReply())]);
    // 자리와 크기: '말하기' 아래, 누르는 곳이 겹치지 않는다
    await expect(koButton(page)).toBeVisible();
    await expect(koButton(page)).toContainText("한국어로 물어보기");
    const speakBox = await speakButton(page).boundingBox();
    const koBox = await koButton(page).boundingBox();
    if (!speakBox || !koBox) throw new Error("단추 상자 없음");
    expect(koBox.height).toBeGreaterThanOrEqual(TARGET_MIN_PX);
    expect(koBox.width).toBeGreaterThanOrEqual(TARGET_MIN_PX);
    expect(koBox.y).toBeGreaterThanOrEqual(speakBox.y + speakBox.height);

    // 영어 듣기 동안 한국어 단추는 눌리지 않는다(AC-N28). 묻지 않은 차례라 다음 턴은 지금 그대로 간다
    const before = await talkTurnRequests();
    await pushFakeAi([talkLessonReply({ tori_en: "Great! Tell me more." })]);
    await speakButton(page).click();
    await expect(koButton(page)).toBeDisabled();
    await expect
      .poll(talkTurnRequests, { timeout: STREAM_END_MS })
      .toBe(before + 1);
    await untilChildTurn(page);

    // 한국어 듣기 동안: 안내 줄 '한국어로 물어보세요', '힌트' · '잘 모르겠어요'는 꺼진다
    await koButton(page).click();
    await expect(koLine(page)).toHaveText("한국어로 물어보세요");
    await expect(dontKnowButton(page)).toBeDisabled();
    await expect(hintButton(page)).toBeDisabled();
    // 인식 확인 동안에도 '말하기' · '잘 모르겠어요'는 꺼져 있다
    await expect(page.locator("[data-ko-confirm]")).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await expect(speakButton(page)).toBeDisabled();
    await expect(dontKnowButton(page)).toBeDisabled();
    // 한국어 듣기의 언어는 speech.lang_ko, 앞의 영어 듣기는 speech.lang(AC-25d)
    const langs = await recognitionLangs(page);
    expect(langs.at(-1)).toBe(KO_LANG);
    expect(langs.filter((l) => l === KO_LANG)).toHaveLength(1);
    expect(langs).toContain(EN_LANG);
  });
});

test.describe("수업 안 한국어로 묻기 — 답과 소리 · 이어 하기(3단계)", () => {
  test("AC-25b · AC-25i 1~3단계: 한국어 답은 '한국어 도움' 딱지의 글만, 가르친 표현은 글 없이 쉼 뒤 소리로만 · 소리가 시작한 뒤 아이 차례가 열리고 '알려 준 말 듣기'로 다시 들으며, 쪽을 다시 열면 곁 말풍선이 그 차례에 되살아난다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page } = await openKoLesson(context, LOW_LEVEL, [
      koSaidRun(QUESTION),
    ]);
    await pushFakeAi([ruleFor("talk_ko_help", talkKoHelpReply())]);
    await askKorean(page);
    const shownAt = await page.evaluate(() => performance.now());
    const exchange = page.locator("[data-ko-exchange]");
    await expect(exchange.locator("[data-ko-question]")).toHaveText(QUESTION);
    await expect(exchange.locator("[data-ko-badge]")).toHaveText("한국어 도움");
    await expect(exchange.locator("[data-ko-say]")).toHaveText(
      FAKE_KO_HELP.expression.sayKo,
    );
    // 쉬는 동안은 아이 차례가 열리지 않는다(누르면 답을 못 듣고 지나간다 — spec 설계 2 '답 뒤 아이 차례')
    await expect(koButton(page)).toBeDisabled();
    // 가르친 표현은 글로 그리지 않는다(T2) — 소리로만, 쉼 뒤에
    await expect(exchange.locator("[data-ko-taught]")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(TAUGHT);
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(1);
    const record = await speechRecord(page);
    const spokenAt = record.spokenAt[record.spoken.indexOf(TAUGHT)] ?? 0;
    expect(spokenAt - shownAt).toBeGreaterThanOrEqual(
      SOUND_PAUSE_MS - PAUSE_SLACK_MS,
    );
    // 소리가 시작한 뒤 아이 차례가 열린다
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    await expect(speakButton(page)).toBeEnabled();
    // '알려 준 말 듣기'(한글 글이 보이는 단추)로 다시 듣는다
    const replay = exchange.locator("[data-ko-replay]");
    await expect(replay).toHaveText(/알려 준 말 듣기/);
    await replay.click();
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(2);
    expect(await koHelpRequests()).toBe(1);

    // 이어 하기: 같은 아이 차례의 곁 말풍선이 되살아나고(글 없음) '알려 준 말 듣기'로 들을 수 있다. 저절로 다시 읽지 않는다
    await reopen(page);
    const back = page.locator("[data-ko-exchange]");
    await expect(back).toHaveCount(1);
    await expect(back.locator("[data-ko-say]")).toHaveText(
      FAKE_KO_HELP.expression.sayKo,
    );
    await expect(page.locator("body")).not.toContainText(TAUGHT);
    expect(await spokenCount(page, TAUGHT)).toBe(0);
    await back.locator("[data-ko-replay]").click();
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(1);
    // 다시 연 것만으로 한국어 도움 호출이 늘지 않는다
    expect(await koHelpRequests()).toBe(1);
  });

  test("AC-25i · AC-N26 · AC-25d 보낸 뒤 대화 기록이 한국어 문답을 그 턴의 자리(선생님 말 뒤 · 아이 말 앞)에 잇고 1~3단계는 가르친 표현 글이 없으며, 다음 영어 턴 요청에만 koHelp 칸이 실린다 — 서버 묶음 4-다 와 함께 CI", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page, turnBodies } = await openKoLesson(context, LOW_LEVEL, [
      saidRun("I'm good."),
      koSaidRun(QUESTION),
      saidRun(SAYS),
    ]);
    // 묻지 않은 차례의 요청에는 칸이 없다(AC-N26)
    await speakEnglish(page);
    expect(turnBodies).toHaveLength(1);
    expect(turnBodies[0]).not.toHaveProperty("koHelp");

    await pushFakeAi([ruleFor("talk_ko_help", talkKoHelpReply())]);
    const help = await askKorean(page);
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    await speakEnglish(page, "Wow! Clams are cool.");
    expect(turnBodies).toHaveLength(2);
    expect(turnBodies[1]?.koHelp).toEqual([
      { turnNo: help.turnNo, seq: help.seq, heard: true, replays: 0 },
    ]);
    // 곁 말풍선은 사라지고 기록이 잇는다(질문 · 한국어 답, 가르친 표현 글 없음 — T2)
    await expect(page.locator("[data-ko-exchange]")).toHaveCount(0);
    const past = page.locator("[data-talk-log] [data-ko-log]");
    await expect(past).toHaveCount(1);
    await expect(past.locator("[data-ko-question]")).toHaveText(QUESTION);
    await expect(past.locator("[data-ko-say]")).toHaveText(
      FAKE_KO_HELP.expression.sayKo,
    );
    await expect(page.locator("body")).not.toContainText(TAUGHT);
    // 차례: 한국어 문답은 그 턴의 아이 말(SAYS) 앞
    const order = await page
      .locator("[data-talk-log] [role='log']")
      .evaluate((el, says) => {
        const text = el.textContent ?? "";
        return {
          ko: text.indexOf("한국어 도움"),
          child: text.lastIndexOf(says),
        };
      }, SAYS);
    expect(order.ko).toBeGreaterThanOrEqual(0);
    expect(order.ko).toBeLessThan(order.child);
    // 영어 듣기는 다시 speech.lang 이다
    expect((await recognitionLangs(page)).at(-1)).toBe(EN_LANG);

    // 이어 하기: 두 표를 합친 기록이 다시 그려진다
    await reopen(page);
    await expect(page.locator("[data-talk-log] [data-ko-log]")).toHaveCount(1);
    await expect(page.locator("[data-ko-exchange]")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(TAUGHT);
  });

  test("AC-25o 되묻는 차례 뒤 이어받은 차례(끝 줄 lesson.koCarry)에서 1~3단계 화면이 '알려 준 말 듣기'를 다시 두고, 칸이 없는 끝 줄에는 두지 않는다 — 서버 묶음 4-다 · 4-라 와 함께 CI", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page } = await openKoLesson(context, LOW_LEVEL, [
      koSaidRun(QUESTION),
      saidRun("I like."),
      saidRun(SAYS),
    ]);
    await pushFakeAi([ruleFor("talk_ko_help", talkKoHelpReply())]);
    const help = await askKorean(page);
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    // 되묻는 차례의 끝 줄에 이어받은 도움을 싣는다(서버가 이 칸을 보내는 길은 묶음 4-라 — 여기서는 받은 끝 줄에 칸을 끼워 화면만 본다)
    let carry = true;
    await page.route("**/api/talk/turn", async (route) => {
      const response = await route.fetch();
      const text = await response.text();
      const body = carry
        ? text.replace(
            '{"t":"end","lesson":{',
            `{"t":"end","lesson":{"koCarry":[{"turnNo":${help.turnNo},"seq":${help.seq}}],`,
          )
        : text;
      await route.fulfill({ response, body });
    });
    await speakEnglish(page, "Hmm! Say it one more time.");
    const carried = page.locator("[data-ko-carry] [data-ko-replay]");
    await expect(carried).toHaveCount(1);
    await expect(carried).toHaveText(/알려 준 말 듣기/);
    await expect(page.locator("body")).not.toContainText(TAUGHT);
    const heard = await spokenCount(page, TAUGHT);
    await carried.click();
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(heard + 1);
    // 칸이 없는 끝 줄(이어받음 없음)이면 지금과 같다
    carry = false;
    await speakEnglish(page, "Great! Tell me more.");
    await expect(page.locator("[data-ko-carry]")).toHaveCount(0);
  });
});

test.describe("수업 안 한국어로 묻기 — 글이 보이는 단계(10단계)", () => {
  test("AC-25a · AC-25b 10단계: '힌트' 없는 차례에도 단추가 있고, 가르친 표현은 글(누르면 다시 읽음)로 보이며 쉼 없이 읽고 곧 아이 차례가 열린다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page } = await openKoLesson(context, HIGH_LEVEL, [
      koSaidRun(QUESTION),
    ]);
    await expect(koButton(page)).toBeVisible();
    const koBox = await koButton(page).boundingBox();
    expect(koBox?.height ?? 0).toBeGreaterThanOrEqual(TARGET_MIN_PX);
    await pushFakeAi([
      ruleFor("talk_ko_help", talkKoHelpReply({ band: "10-12" })),
    ]);
    await askKorean(page);
    const taught = page.locator("[data-ko-exchange] [data-ko-taught]");
    await expect(taught).toHaveText(TAUGHT);
    await expect(
      page.locator("[data-ko-exchange] [data-ko-replay]"),
    ).toHaveCount(0);
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(1);
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    await taught.click();
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(2);
  });
});

test.describe("수업 안 한국어로 묻기 — 첫 안내(3단계)", () => {
  test("AC-25k 첫 안내 '모르는 말은 한국어로 물어봐요'는 '막히면 눌러요'가 보이는 차례에는 없고, 다음 차례에 한 번 보인 뒤 프로필에 남아 다시 열어도 보이지 않는다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page, profileId } = await openKoLesson(context, LOW_LEVEL, [
      saidRun("I'm good."),
      saidRun(SAYS),
    ]);
    // 첫 차례: '막히면 눌러요'만(겹치지 않는다)
    await expect(page.locator("[data-hint-nudge]")).toBeVisible();
    await expect(page.locator("[data-ko-tip]")).toHaveCount(0);
    await speakEnglish(page);
    // 다음 차례: 첫 안내가 안내 줄에 보이고 '막히면 눌러요'는 없다
    await expect(page.locator("[data-ko-tip]")).toHaveText(KO_ASK_TIP);
    await expect(page.locator("[data-hint-nudge]")).toHaveCount(0);
    await expectInView(page.locator("[data-ko-tip]"));
    // 프로필에 남는다(talk_ko_ask_tip)
    await expect
      .poll(
        async () => {
          const [row] = await e2eDb()
            .select({ seen: profiles.noticesSeen })
            .from(profiles)
            .where(eq(profiles.id, profileId));
          return "talk_ko_ask_tip" in ((row?.seen ?? {}) as object);
        },
        { timeout: STREAM_END_MS },
      )
      .toBe(true);
    // 아이가 누르면 지운다
    await pushFakeAi([talkLessonReply({ tori_en: "Great! Tell me more." })]);
    await speakButton(page).click();
    await expect(page.locator("[data-ko-tip]")).toHaveCount(0);
    await untilChildTurn(page);
    // 다시 열어도 보이지 않는다(프로필마다 한 번)
    await reopen(page);
    await expect(page.locator("[data-ko-tip]")).toHaveCount(0);
  });
});

test.describe("수업 안 한국어로 묻기 — iPad 세로 · 가로에서 화면 안(3단계)", () => {
  test("C226 (4) 기록 칸이 가득 찬 뒤 세로 · 가로 모두 '말하기' · '한국어로 물어보기' · '힌트' · '잘 모르겠어요'와 한국어 안내 줄이 화면 안이고, 한국어로 물은 뒤에도 그렇다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page, sessionId } = await openKoLesson(context, LOW_LEVEL, [
      saidRun("I'm good."),
      koSaidRun(QUESTION),
      koSaidRun(QUESTION),
    ]);
    await speakEnglish(page, "Great! Now let's start!");
    await insertExchanges(sessionId, PAIRS);
    await reopen(page);
    const overflow = await page
      .locator("[data-talk-log]")
      .evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(overflow).toBeGreaterThan(0);
    const mainButtons = async () => {
      await expectInView(speakButton(page));
      await expectInView(koButton(page));
      await expectInView(hintButton(page));
      await expectInView(dontKnowButton(page));
    };
    await pushFakeAi([ruleFor("talk_ko_help", talkKoHelpReply())]);

    // 세로: 기록 칸이 찬 상태 → 누른 뒤 안내 줄 → 답을 받은 뒤
    await page.setViewportSize(CHILD_VIEWPORTS.portrait);
    await mainButtons();
    await koButton(page).click();
    await expectInView(koLine(page));
    await expect(page.locator("[data-ko-confirm]")).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await page.locator("[data-ko-send]").click();
    await expect(page.locator("[data-ko-exchange]")).toHaveCount(1, {
      timeout: STREAM_END_MS,
    });
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    await mainButtons();

    // 가로: 같은 차례에서 다시 물음
    await page.setViewportSize(CHILD_VIEWPORTS.landscape);
    await mainButtons();
    await koButton(page).click();
    await expectInView(koLine(page));
    await expect(page.locator("[data-ko-confirm]")).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await page.locator("[data-ko-send]").click();
    await expect(page.locator("[data-ko-exchange]")).toHaveCount(2, {
      timeout: STREAM_END_MS,
    });
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    await mainButtons();
  });
});

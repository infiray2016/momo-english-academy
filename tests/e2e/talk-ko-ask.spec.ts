// 수업 안 한국어로 묻기 화면 시험(묶음 5-나 — spec 판 3 설계 1 · 2 · 3, 13절 C226 A2 · B1 과 (1) ~ (4) · C221 · plan '증명' 표 AC-25a ~ f ·
// AC-25i · AC-25k · AC-25o · AC-N26 · AC-N28). 가짜 음성(인식기는 언어를 가리지 않고 글을 낸다 — 듣기의 언어는 인식 객체의 언어 기록으로 본다)과
// 가짜 AI(규격 제목 talk_ko_help)로 기존 방식 수업을 진행한다. 회화 턴 요청의 koHelp 칸은 서버 묶음 4-다 가 받으므로, 한국어로 물은 차례 뒤 영어
// 턴을 보내는 시험(AC-25i 기록 · AC-N26 · AC-25o)은 4-다 · 4-라 와 함께 CI 에서 처음 돈다. 이 Mac 은 e2e DB 가 뜨지 않아 CI 에서 돈다.
import type { BrowserContext, Page, Route } from "@playwright/test";
import { eq, max } from "drizzle-orm";
import { KO_ASK_NOTICE, KO_ASK_TIP } from "../../src/core/conversation/ko-ask";
import { talkMoveOf } from "../../src/core/conversation/move";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
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
  withoutSceneOpener,
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
/**
 * 1~3단계 인사 차례의 가짜 응답(두 문장 모두 인사 끝 상황 검사를 지난다 — CI 실행 44252958636 의 C226 (4) 시험 trace 에서 회화 턴 응답이 두
 * 문장을 그대로 흘림). 'Wow! Clams are cool.' 은 인사 차례에서 걸려 시드 상황 줄(seed/lists/talk-situation-lines.json greeting_end)로 바뀐다.
 */
const GREETING_REPLY = "Great! Now let's start!";
/** 인사 차례 응답이 말풍선에 그대로 남았음을 보는 글(greeting_end 상황 줄 'Let's start!' · 'Nice! Here we go!' · 'Great! Let's start now.' 에 없음). */
const GREETING_SHOWN = "Now let's start";
/** 기록 칸을 채운 뒤 지금 차례를 여는 선생님 AI 질문(힌트 재료를 행 ai_question 에 둔다 — 회화 턴이 저장하는 꼴, lesson-turn aiQuestion). */
const LAST_ASK = {
  text: "Nice! Do you like it?",
  aiQuestion: {
    en: "Do you like it?",
    ko: "",
    answerExample: SAYS,
    hintKo: "좋아하는 것을 말해 봐.",
    hints: ["I like ___.", SAYS],
  },
} as const;
/** 아이 버튼 글자의 최소 크기(px, AC-25a · 정본 03 '한국어로 물어보기' 행 — 시험 값). */
const TEXT_MIN_PX = 22;
/** 3단계 카드 질문의 힌트 단 수(한국어 뜻 → 영어 틀 → 영어 문장과 듣기 — talk-lesson.spec AC-15p 와 같다, 시험 값). */
const LOW_HINT_TIERS = 3;
/** '저절로 넘어가지 않음'을 볼 때 기다리는 시간(ms, 시험 값 — talk.ko_ask_sound_pause_ms 와 감시 상한보다 넉넉히). */
const NO_ADVANCE_MS = 4_000;
/** 그만하기 시험에서 한국어 질문 응답을 붙잡아 두는 시간(ms, 시험 값 — 그만하기 · 확인을 누를 틈). */
const KO_HOLD_MS = 5_000;
/** 화면 글(정본 · 정본 밖 문구 표 — src 의 TALK_TEXT · SOUND_RETRY_TEXT 와 같은 글, 화면 묶음을 가져오지 않으려 다시 적는다). */
const KO_T = {
  soundNotice: "소리가 안 나왔어요. 다시 들어 봐요",
  silentNote: "소리가 안 나면 무음 모드를 꺼 주세요",
  next: "다음",
  offline: "인터넷이 끊겼어요. 연결되면 다시 해요",
  stop: "그만하기",
  stopYes: "그만할래요",
} as const;
/** 합친 안내 두 글 가운데 하나(정한 것 12 — 어느 쪽을 고르는지는 rev-b5a M-1, 컨트롤러 몫). */
const KO_NOTICE_ANY = new RegExp(
  `^(${[KO_ASK_NOTICE.hint, KO_ASK_NOTICE.talk]
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})$`,
);

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

/**
 * 수업을 열고 첫 아이 차례(인사 질문)까지 간다. 회화 턴 요청 본문은 쪽을 열기 전부터 모은다. lesson 으로 견본을 바꾸고, prep 이 참이면 짧은 준비를
 * 건너뛰지 않으며(1~3단계 talk.prep_mode always), prepare 는 쪽을 열기 전에 init script 를 건다(화면 고침 3 '가').
 */
async function openKoLesson(
  context: BrowserContext,
  level: number,
  runs: Parameters<typeof talkScript>[0],
  {
    lesson = talkLessonCard(level),
    prep = false,
    prepare,
  }: {
    lesson?: TalkLesson;
    prep?: boolean;
    prepare?: (page: Page) => Promise<void>;
  } = {},
) {
  const profileId = await talkHousehold(level);
  if (!prep) await skipStartPrep(profileId, level);
  const row = await insertTalkLesson({ level, lesson });
  const sessionId = await openTalkSession(profileId, row);
  const page = await speechPage(context, talkScript(runs));
  if (prepare) await prepare(page);
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

/**
 * 영어 한 차례(말하기 → 가짜 회화 턴 응답 → 다음 아이 차례). shown 은 말풍선에서 기다릴 글(기본은 응답의 첫 '!' 앞). 1~3단계 인사 차례의 응답은
 * 인사 끝 상황 검사를 받아 걸린 문장이 시드 상황 줄로 바뀐다(lesson-turn createLessonSentenceFlow liveDrop) — 인사 차례에는 검사를 지나는
 * GREETING_REPLY 와 상황 줄에 없는 GREETING_SHOWN 을 쓴다(화면 고침 4).
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

/** 글자 크기(px, 계산된 값). */
function fontPx(page: Page, selector: string): Promise<number> {
  return page
    .locator(selector)
    .first()
    .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
}

/**
 * 그 글의 읽어 주기만 가짜 음성에 넘기지 않는다(시작 알림이 오지 않아 감시 상한 speech.speak_start_timeout_seconds 뒤 '들려주지 못함' —
 * talk.ts recordInterruptedSpeech 와 같은 init script 감싸기). 넘기지 않은 글은 __mutedSpeech 에 쌓는다. speechPage 뒤 page.goto 앞에 부른다.
 */
async function muteSpeechOf(page: Page, text: string): Promise<void> {
  await page.addInitScript((muted) => {
    type Utter = EventTarget & { text: string };
    const w = window as unknown as {
      speechSynthesis?: { speak(utterance: Utter): void };
      __mutedSpeech?: string[];
    };
    const synth = w.speechSynthesis;
    if (!synth) return;
    const list: string[] = [];
    w.__mutedSpeech = list;
    const speak = synth.speak.bind(synth);
    synth.speak = (utterance) => {
      if (utterance.text === muted) {
        list.push(utterance.text);
        return;
      }
      speak(utterance);
    };
  }, text);
}

/** 넘기지 않은 읽어 주기 수(muteSpeechOf 를 건 쪽). */
function mutedCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      ((window as unknown as { __mutedSpeech?: string[] }).__mutedSpeech ?? [])
        .length,
  );
}

/** '한국어로 물어보기' → 인식 확인의 '보내기'까지(응답은 기다리지 않는다 — 응답 갈래 시험). */
async function sendKorean(page: Page) {
  await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
  await koButton(page).click();
  await expect(page.locator("[data-ko-confirm]")).toBeVisible({
    timeout: STREAM_END_MS,
  });
  await page.locator("[data-ko-send]").click();
}

/** 한국어 질문 요청 가로채기의 한 번 몫: 그대로 보냄 · HTTP 500 · 연결 끊음 · 고른 JSON. */
type KoRouteStep = "pass" | "error" | "abort" | { json: { t: string } };

/**
 * 한국어 질문 끝점을 가로채(talk-ko-ask AC-25o 의 page.route 꼴) 요청마다 plan 의 앞 것을 쓰고(비면 그대로 보냄), 받은 본문의 시도 id 를 차례로
 * 모은다. 돌려준 ids 는 시험이 들여다본다.
 */
async function routeKoHelp(page: Page, plan: KoRouteStep[]) {
  const ids: string[] = [];
  await page.route(`**${TALK_KO_HELP_URL}`, async (route: Route) => {
    const body = route.request().postDataJSON() as { clientAttemptId: string };
    ids.push(body.clientAttemptId);
    const step = plan.shift() ?? "pass";
    if (step === "pass") await route.continue();
    else if (step === "error") await route.fulfill({ status: 500, body: "{}" });
    else if (step === "abort") await route.abort("failed");
    else
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(step.json),
      });
  });
  return ids;
}

/** 3단계 카드 질문의 힌트를 끝 단(영어 문장과 듣기)까지 연다(talk-lesson.spec AC-15p 와 같은 누름). */
async function openAllHints(page: Page) {
  const tiers = page.locator("[data-child-turn] [data-hint-tier]");
  await expect(hintButton(page)).toBeVisible();
  for (let i = 0; i < LOW_HINT_TIERS; i++) {
    await hintButton(page).click();
    await expect(tiers).toHaveCount(i + 1);
  }
  await expect(
    page.locator('[data-child-turn] [data-hint-tier="sentence"]'),
  ).toBeVisible();
  await expect(
    page.locator("[data-child-turn] [data-hint-listen]"),
  ).toHaveCount(1);
}

/**
 * 카드 기회를 대화 첫 질문 하나로 다 다루는 견본(talk-lesson.spec allChancesLesson 과 같은 꼴 — 마무리 제안 갈래 '마무리'를 서버가 받게): 장면 여는
 * 질문을 빼고 필수 질문을 첫째 하나로, 새 단어를 비운다. 짧은 준비 낱말은 카드 그대로다.
 */
function allChancesLesson(level: number): TalkLesson {
  const lesson = withoutSceneOpener(talkLessonCard(level));
  const first = lesson.card.required[0];
  if (!first) throw new Error("견본 꼴 — 필수 질문이 있는 배정 수업");
  return {
    ...lesson,
    newWords: [],
    card: { ...lesson.card, required: [first] },
  };
}

/**
 * 앞선 대화 차례를 바로 넣는다(talk-log-follow.spec 의 insertExchanges 와 같은 꼴 — 기록 칸을 넘치게). 마지막 선생님 행은 힌트 재료가 있는 AI
 * 질문(LAST_ASK)이라 다시 연 지금 차례에 '힌트'가 있다 — 물음 없는 'Nice! I like it too.' 로 끝나면 힌트 재료가 없어 힌트 단추가 없다
 * (lesson-turn lessonHintsAt · child-turn showHint, 화면 고침 4).
 */
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
        ...(i === count - 1
          ? { text: LAST_ASK.text, aiQuestion: LAST_ASK.aiQuestion }
          : { text: "Nice! I like it too." }),
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
    // 글자 22px 이상(AC-25a)
    expect(
      await fontPx(page, "[data-child-turn] [data-ko-ask]"),
    ).toBeGreaterThanOrEqual(TEXT_MIN_PX);

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
    // 10단계 표본에는 '힌트'가 없고(AC-25a), '말하기' · '잘 모르겠어요' · '한국어로 물어보기'가 있으며 글자는 22px 이상이다
    await expect(hintButton(page)).toHaveCount(0);
    await expect(speakButton(page)).toBeVisible();
    await expect(dontKnowButton(page)).toBeVisible();
    expect(
      await fontPx(page, "[data-child-turn] [data-ko-ask]"),
    ).toBeGreaterThanOrEqual(TEXT_MIN_PX);
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

  test("AC-25i · AC-25b 10단계: 차례가 지나 대화 기록에 남은 지난 한국어 도움 말풍선을 누르면 가르친 표현 하나만 다시 읽고 한국어 답은 읽지 않는다(정본 03 대화 기록 · b5-fix2)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page } = await openKoLesson(context, HIGH_LEVEL, [
      koSaidRun(QUESTION),
      saidRun(SAYS),
    ]);
    await pushFakeAi([
      ruleFor("talk_ko_help", talkKoHelpReply({ band: "10-12" })),
    ]);
    await askKorean(page);
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(1);
    await expect(speakButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    await speakEnglish(page);
    const past = page.locator("[data-ko-log] [data-ko-log-replay]");
    await expect(past).toHaveCount(1);
    await expect(past).toContainText(TAUGHT);
    await past.click();
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(2);
    const spoken = (await speechRecord(page)).spoken;
    expect(spoken).not.toContain(FAKE_KO_HELP.expression.sayKo);
  });
});

test.describe("수업 안 한국어로 묻기 — 뜻 답과 한국어 답(3단계)", () => {
  test("AC-25b 뜻 갈래에는 '알려 준 말 듣기'가 없고 한국어 답은 읽지 않으며, 선생님의 지금 말을 쉼 없이 한 번 다시 읽고 곁 말풍선에 영어 글이 없고, 대화 기록으로 넘어간 뒤에도 누를 것 · 영어 글이 없다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page } = await openKoLesson(context, LOW_LEVEL, [
      koSaidRun(QUESTION),
      saidRun(SAYS),
    ]);
    await pushFakeAi([
      ruleFor(
        "talk_ko_help",
        talkKoHelpReply({ band: "1-3", kind: "meaning" }),
      ),
    ]);
    const spokenBefore = (await speechRecord(page)).spoken.length;
    await askKorean(page);
    const shownAt = await page.evaluate(() => performance.now());
    await expect(page.locator("[data-ko-exchange] [data-ko-say]")).toHaveText(
      FAKE_KO_HELP.meaning.sayKo,
    );
    await expect(page.locator("[data-ko-replay]")).toHaveCount(0);
    // 곁 말풍선(질문 · 딱지 · 한국어 답)에 영어 글이 없다
    await expect(page.locator("[data-ko-exchange]")).not.toHaveText(/[A-Za-z]/);
    // 지금 말(인사 질문)을 쉼 없이 한 번 다시 읽는다(talk-frame askKo 뜻 갈래 — lessonSpokenItemsOf(bubble))
    const greeting = "How are you today?";
    const newly = async () =>
      (await speechRecord(page)).spoken
        .slice(spokenBefore)
        .filter((s) => s.includes(greeting)).length;
    await expect.poll(newly, { timeout: STREAM_END_MS }).toBe(1);
    const record = await speechRecord(page);
    const againAt =
      record.spokenAt[
        record.spoken.findIndex(
          (s, i) => i >= spokenBefore && s.includes(greeting),
        )
      ] ?? Number.POSITIVE_INFINITY;
    expect(againAt - shownAt).toBeLessThan(SOUND_PAUSE_MS);
    await expect(speakButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    expect(await newly()).toBe(1);
    await speakEnglish(page);
    await expect(page.locator("[data-ko-log]")).toHaveCount(1);
    await expect(page.locator("[data-ko-log-replay]")).toHaveCount(0);
    const spoken = (await speechRecord(page)).spoken;
    expect(spoken).not.toContain(FAKE_KO_HELP.meaning.sayKo);
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
    await speakEnglish(page, GREETING_REPLY, GREETING_SHOWN);
    await insertExchanges(sessionId, PAIRS);
    await reopen(page);
    // 다시 연 지금 차례는 넣은 마지막 AI 질문(힌트 재료가 있는 차례)이다
    await expect(page.locator("[data-tori-bubble]")).toContainText(
      LAST_ASK.aiQuestion.en,
    );
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

// ── 화면 고침 3 '가'(재검토 rev-b5b-2 3절 아직 빠진 것 1 · 2 · 3 · 6 과 재현 틀 장면 chat-ko-ask 만 덮던 것) ──

test.describe("수업 안 한국어로 묻기 — 단추가 없는 자리(3단계)", () => {
  test("AC-25a 인사 · 대화 차례에는 '한국어로 물어보기'가 있고, 짧은 준비 쪽지 · 마무리 물음 차례 · 정리에는 없다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const lesson = allChancesLesson(LOW_LEVEL);
    const prepWords = lesson.card.prep ?? [];
    const { page } = await openKoLesson(
      context,
      LOW_LEVEL,
      [
        saidRun("I'm good."),
        ...prepWords.map((w) => saidRun(w)),
        saidRun(lesson.card.required[0]?.answerExample ?? SAYS),
      ],
      { lesson, prep: true },
    );
    const anyKo = page.locator("[data-ko-ask]");
    // 인사 차례: 있다
    await expect(koButton(page)).toBeVisible();
    // 짧은 준비: 쪽지마다 없다
    await pushFakeAi([
      talkLessonReply({ tori_en: "Great! Let's learn some new words!" }),
    ]);
    await speakButton(page).click();
    expect(prepWords.length).toBeGreaterThan(0);
    for (let i = 0; i < prepWords.length; i++) {
      const note = page.locator("[data-prep-note]");
      await expect(note).toBeVisible({ timeout: STREAM_END_MS });
      await expect(anyKo).toHaveCount(0);
      await expect(note.locator("[data-speak]")).not.toHaveAttribute(
        "data-speak-waiting",
        "",
        { timeout: STREAM_END_MS },
      );
      await note.locator("[data-speak]").click();
      await expect(note.locator("[data-follow-result]")).toBeVisible();
    }
    // 대화 첫 질문: 있다
    await untilChildTurn(page);
    await expect(koButton(page)).toBeVisible();
    // 마무리 물음(갈래 '마무리' 뒤 두 단추 — 말하기는 남는다): 없다
    await pushFakeAi([
      talkLessonReply({
        tori_en: "That was a great talk! We can stop here.",
        next_move: "closing",
      }),
    ]);
    await speakButton(page).click();
    const choice = page.locator("[data-talk-choice]");
    await expect(choice).toBeVisible({ timeout: STREAM_END_MS });
    await expect(turn(page)).toBeVisible();
    await expect(anyKo).toHaveCount(0);
    // 정리: 없다(참여가 적으면 확인 쪽지 '그만할래요'를 거친다)
    await choice.getByRole("button", { name: KO_T.stop }).click();
    const wrapAll = page.locator("[data-wrap-all]");
    const stopYes = page.getByRole("button", { name: KO_T.stopYes });
    await expect(wrapAll.or(stopYes)).toBeVisible({ timeout: STREAM_END_MS });
    if (await stopYes.isVisible()) await stopYes.click();
    await expect(wrapAll).toBeVisible({ timeout: STREAM_END_MS });
    await expect(anyKo).toHaveCount(0);
  });
});

test.describe("수업 안 한국어로 묻기 — 답을 들려주지 못함 · 쉼 동안의 누름(3단계)", () => {
  test("AC-25b 1~3단계 표현 답을 들려주지 못하면 '소리가 안 나왔어요. 다시 들어 봐요'와 큰 '알려 준 말 듣기'가 뜨고 저절로 넘어가지 않으며, 다시도 못 들려주면 무음 모드 줄과 작은 '다음'이 붙는다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page } = await openKoLesson(
      context,
      LOW_LEVEL,
      [koSaidRun(QUESTION)],
      { prepare: (p) => muteSpeechOf(p, TAUGHT) },
    );
    await pushFakeAi([ruleFor("talk_ko_help", talkKoHelpReply())]);
    await askKorean(page);
    const turnsBefore = await talkTurnRequests();
    // 첫 실패: 안내와 큰 '알려 준 말 듣기'(무음 모드 줄 · '다음'은 아직 없음), 아이 차례는 열린다
    const retry = page.locator("[data-ko-exchange] [data-ko-retry]");
    await expect(retry).toHaveAttribute("data-ko-retry", "retry", {
      timeout: STREAM_END_MS,
    });
    await expect(retry).toContainText(KO_T.soundNotice);
    const big = retry.locator('[data-ko-replay][data-retry-size="big"]');
    await expect(big).toHaveText(/알려 준 말 듣기/);
    await expect(retry.locator("[data-ko-next]")).toHaveCount(0);
    await expect(retry.locator("[data-talk-silent-note]")).toHaveCount(0);
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    await expect(speakButton(page)).toBeEnabled();
    expect(await mutedCount(page)).toBe(1);
    // 저절로 넘어가지 않는다(회화 턴 요청이 없고 안내가 남는다)
    await page.waitForTimeout(NO_ADVANCE_MS);
    expect(await talkTurnRequests()).toBe(turnsBefore);
    await expect(retry).toHaveAttribute("data-ko-retry", "retry");
    // 둘째 실패: 무음 모드 줄(e2e 기기는 iPad Safari)과 작은 '다음'
    await expect(big).toBeEnabled();
    await big.click();
    await expect(retry).toHaveAttribute("data-ko-retry", "next", {
      timeout: STREAM_END_MS,
    });
    expect(await mutedCount(page)).toBe(2);
    await expect(retry.locator("[data-talk-silent-note]")).toHaveText(
      KO_T.silentNote,
    );
    const next = retry.locator("[data-ko-next]");
    await expect(next).toHaveText(KO_T.next);
    await page.waitForTimeout(NO_ADVANCE_MS);
    expect(await talkTurnRequests()).toBe(turnsBefore);
    await expect(next).toBeVisible();
    // '다음'은 안내를 거두고 작은 '알려 준 말 듣기'로 돌린다(턴은 보내지 않는다)
    await next.click();
    await expect(page.locator("[data-ko-retry]")).toHaveCount(0);
    await expect(
      page.locator("[data-ko-exchange] [data-ko-replay]"),
    ).toHaveCount(1);
    expect(await talkTurnRequests()).toBe(turnsBefore);
    // 가르친 표현 글은 어디에도 없다
    await expect(page.locator("body")).not.toContainText(TAUGHT);
  });

  test("AC-25c · AC-25b 도움 뒤에도 지금 질문의 연 힌트 단과 힌트 문장 듣기 단추가 그대로이고, 소리 앞 쉼 동안에는 힌트 문장 듣기 · 지금 말풍선 · 기록 칸의 지난 말 다시 읽기를 받지 않는다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page } = await openKoLesson(context, LOW_LEVEL, [
      saidRun("I'm good."),
      koSaidRun(QUESTION),
    ]);
    await speakEnglish(page, GREETING_REPLY, GREETING_SHOWN);
    await openAllHints(page);
    const tiers = page.locator("[data-child-turn] [data-hint-tier]");
    const listen = page.locator("[data-child-turn] [data-hint-listen]");
    const bubbleNow = page.locator("[data-tori-bubble]");
    const pastTeacher = page.locator("[data-talk-log-teacher]").first();
    await expect(pastTeacher).toBeVisible();
    await pushFakeAi([ruleFor("talk_ko_help", talkKoHelpReply())]);
    const spokenBefore = (await speechRecord(page)).spoken.length;
    await askKorean(page);
    // 쉼 동안: 셋 다 눌리지 않는다(아이 차례가 아직 열리지 않음)
    await expect(listen).toBeDisabled();
    await expect(bubbleNow).toBeDisabled();
    await expect(pastTeacher).toBeDisabled();
    await expect(koButton(page)).toBeDisabled();
    // 쉼 뒤 표현 한 번 → 아이 차례가 열리고 셋이 다시 켜진다
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(1);
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    await expect(listen).toBeEnabled();
    await expect(bubbleNow).toBeEnabled();
    await expect(pastTeacher).toBeEnabled();
    // 그 사이 다른 읽기는 없었다(걸어 둔 표현을 지우지 않음)
    const newly = (await speechRecord(page)).spoken.slice(spokenBefore);
    expect(newly.filter((s) => s !== TAUGHT)).toEqual([]);
    // AC-25c: 연 힌트 단과 듣기 단추가 그대로다
    await expect(tiers).toHaveCount(LOW_HINT_TIERS);
    await expect(
      page.locator('[data-child-turn] [data-hint-tier="sentence"]'),
    ).toBeVisible();
    await expect(listen).toHaveCount(1);
    await expect(page.locator("[data-ko-exchange]")).toHaveCount(1);
  });
});

test.describe("수업 안 한국어로 묻기 — 응답 갈래 · 다시 보냄 · 두 번 물음 · 그만하기(3단계)", () => {
  test("AC-25b · AC-25f 응답 갈래: 한 번 실패 뒤 다시 보낸 요청은 같은 시도 id 이고 답이 그려지며, 끊김(offline) · 오류(error)가 이어지면 안내만 나오고 단추가 남고, 낡음(stale) 뒤 갇히지 않으며, 꺼짐(off)은 단추를 숨기고 합친 안내를 남긴다. 새 질문은 새 시도 id 다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page } = await openKoLesson(context, LOW_LEVEL, [
      koSaidRun(QUESTION),
    ]);
    await pushFakeAi([ruleFor("talk_ko_help", talkKoHelpReply())]);
    const plan: KoRouteStep[] = [];
    const ids = await routeKoHelp(page, plan);

    // 1. 오류 한 번 → 같은 시도 id 로 다시 보내 답이 온다
    plan.push("error");
    await sendKorean(page);
    await expect(page.locator("[data-ko-exchange]")).toHaveCount(1, {
      timeout: STREAM_END_MS,
    });
    expect(ids).toHaveLength(2);
    expect(ids[1]).toBe(ids[0]);
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });

    // 2. 연결 끊음이 이어짐 → 처음 + 다시 보냄 상한까지 같은 id, 안내 '인터넷이 끊겼어요 …', 단추는 남는다
    plan.push("abort", "abort", "abort", "abort");
    await sendKorean(page);
    await expect(koLine(page)).toHaveText(KO_T.offline, {
      timeout: STREAM_END_MS,
    });
    const offlineIds = ids.slice(2);
    expect(offlineIds).toHaveLength(4);
    expect(new Set(offlineIds).size).toBe(1);
    expect(offlineIds[0]).not.toBe(ids[0]);
    await expect(koButton(page)).toBeEnabled();
    await expect(speakButton(page)).toBeEnabled();
    await expect(page.locator("[data-ko-exchange]")).toHaveCount(1);

    // 3. 오류가 이어짐 → 합친 안내 글, 단추는 남는다
    plan.push("error", "error", "error", "error");
    await sendKorean(page);
    await expect(koLine(page)).toHaveText(KO_NOTICE_ANY, {
      timeout: STREAM_END_MS,
    });
    const errorIds = ids.slice(6);
    expect(errorIds).toHaveLength(4);
    expect(new Set(errorIds).size).toBe(1);
    expect(errorIds[0]).not.toBe(offlineIds[0]);
    await expect(koButton(page)).toBeEnabled();

    // 4. 낡음 → 다시 보내지 않고 아이 차례로 돌아온다(단추가 꺼진 채 남지 않음)
    plan.push({ json: { t: "stale" } });
    await sendKorean(page);
    await expect.poll(() => ids.length, { timeout: STREAM_END_MS }).toBe(11);
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    await expect(speakButton(page)).toBeEnabled();
    expect(ids).toHaveLength(11);

    // 5. 꺼짐 → 그 수업 동안 단추를 숨기고 합친 안내를 안내 줄에 남긴다
    plan.push({ json: { t: "off" } });
    await sendKorean(page);
    await expect(koButton(page)).toHaveCount(0, { timeout: STREAM_END_MS });
    await expect(koLine(page)).toHaveText(KO_NOTICE_ANY);
    await expect(speakButton(page)).toBeEnabled();
    expect(ids).toHaveLength(12);
    // 가짜 AI 는 처음 질문 하나만 받았다(나머지는 가로챔)
    expect(await koHelpRequests()).toBe(1);
  });

  test("AC-25b · AC-N26 한 차례에 두 번 물으면 두 곁 말풍선의 '알려 준 말 듣기'가 저마다 듣고 다음 턴 koHelp 에 두 항목(heard · replays)이 실리며, 다음 차례의 'AI 쉬는 중' 응답은 쉬는 안내를 띄우고 질문을 다시 보내지 않는다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page, turnBodies } = await openKoLesson(context, LOW_LEVEL, [
      koSaidRun(QUESTION),
      koSaidRun(QUESTION),
      saidRun(SAYS),
      koSaidRun(QUESTION),
    ]);
    await pushFakeAi([ruleFor("talk_ko_help", talkKoHelpReply())]);
    const first = await askKorean(page);
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    const second = await askKorean(page);
    await expect(koButton(page)).toBeEnabled({ timeout: STREAM_END_MS });
    expect(second.seq).not.toBe(first.seq);
    const exchanges = page.locator("[data-ko-exchange]");
    await expect(exchanges).toHaveCount(2);
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(2);
    // 앞 도움 한 번 · 뒤 도움 두 번 다시 듣기
    await exchanges.nth(0).locator("[data-ko-replay]").click();
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(3);
    await exchanges.nth(1).locator("[data-ko-replay]").click();
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(4);
    await exchanges.nth(1).locator("[data-ko-replay]").click();
    await expect
      .poll(() => spokenCount(page, TAUGHT), { timeout: STREAM_END_MS })
      .toBe(5);
    await speakEnglish(page, GREETING_REPLY, GREETING_SHOWN);
    expect(turnBodies.at(-1)?.koHelp).toEqual([
      { turnNo: first.turnNo, seq: first.seq, heard: true, replays: 1 },
      { turnNo: second.turnNo, seq: second.seq, heard: true, replays: 2 },
    ]);
    expect(await koHelpRequests()).toBe(2);

    // 다음 차례: 'AI 쉬는 중' → 쉬는 안내, 질문은 다시 보내지 않는다
    const ids = await routeKoHelp(page, [{ json: { t: "resting" } }]);
    await sendKorean(page);
    await expect(page.locator("[data-talk-rest]")).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await expect(turn(page)).toHaveCount(0);
    await page.waitForTimeout(NO_ADVANCE_MS);
    expect(ids).toHaveLength(1);
  });

  test("AC-25b 한국어 질문의 답을 기다리는 동안 '그만하기'로 정리에 가면 늦게 온 답은 그리지도 읽지도 않는다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const { page } = await openKoLesson(context, LOW_LEVEL, [
      saidRun("I'm good."),
      koSaidRun(QUESTION),
    ]);
    await speakEnglish(page, GREETING_REPLY, GREETING_SHOWN);
    await pushFakeAi([ruleFor("talk_ko_help", talkKoHelpReply())]);
    // 응답을 붙잡아 둔다(그동안 질문 말풍선과 점 셋)
    await page.route(`**${TALK_KO_HELP_URL}`, async (route) => {
      await new Promise((r) => setTimeout(r, KO_HOLD_MS));
      await route.continue().catch(() => {});
    });
    await sendKorean(page);
    await expect(page.locator("[data-ko-pending]")).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await page.locator("[data-talk-stop]").click();
    const wrapAll = page.locator("[data-wrap-all]");
    const stopYes = page.getByRole("button", { name: KO_T.stopYes });
    await expect(wrapAll.or(stopYes)).toBeVisible({ timeout: STREAM_END_MS });
    if (await stopYes.isVisible()) await stopYes.click();
    await expect(wrapAll).toBeVisible({ timeout: STREAM_END_MS });
    // 붙잡은 응답이 풀린 뒤에도 곁 말풍선 · 한국어 답 · 표현 소리가 없다
    await page.waitForTimeout(KO_HOLD_MS + NO_ADVANCE_MS);
    await expect(page.locator("[data-ko-exchange]")).toHaveCount(0);
    await expect(page.locator("[data-ko-pending]")).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText(
      FAKE_KO_HELP.expression.sayKo,
    );
    expect(await spokenCount(page, TAUGHT)).toBe(0);
  });
});

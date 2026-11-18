// 수업 안 한국어로 묻기 — 버리는 듣기 기기와 한국어 듣기 실패의 화면 시험(화면 고침 3 '다' — plan '증명' 표 AC-25d · AC-25f (나) ~ (라) ·
// AC-N28 의 켠 기기 몫, 재검토 rev-b5b-2 3절 '아직 빠진 것' 4 · 5). 가짜 기기 · 대본 · 요청 가로채기는 talk-discard.spec 의 꼴 그대로다
// (test.use({ discardMode: "ios" }) — e2e 기기가 iPad 꼴이라 기기 판정까지 탄다, 견본은 3단계 인사 → 대화 · 짧은 준비 건너뜀). 한국어 질문은
// 가짜 AI(규격 제목 talk_ko_help)가 받는다. 숫자는 시험용 설정에서 읽는다. 녹음하지 않는다. 이 Mac 에서는 e2e DB 가 뜨지 않아 CI 에서 처음 돈다.
import { readFileSync } from "node:fs";
import type { BrowserContext, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import { KO_ASK_NOTICE } from "../../src/core/conversation/ko-ask";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
import { TalkShortLinesFileSchema } from "../../src/core/seed/schema/reference";
import type { TalkCard } from "../../src/core/seed/schema/talk";
import { bandOf } from "../../src/core/seed/structure";
import { parentAlerts } from "../../src/db/schema/operations";
import { TEST_SETTINGS } from "../fixtures/settings";
import { closeE2eDb, e2eDb, resetHousehold } from "./db";
import {
  captureSent,
  childRowsOf,
  DISCARD_TIMES,
  type DiscardScript,
  dead,
  discardScript,
  discardTraceOf,
  installDiscardWatch,
  listensOf,
  real,
  type Sent,
  SLOW_END_MS,
  startsOf,
} from "./discard";
import {
  FAKE_KO_HELP,
  pushFakeAi,
  resetFakeAi,
  ruleFor,
  talkKoHelpReply,
} from "./fake-ai";
import { expect, speechPage, test } from "./fixtures";
import {
  deafRun,
  failingRun,
  greetingTalkLesson,
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
  talkLessonReply,
  talkTurnRequests,
  withoutSceneOpener,
} from "./talk";

test.use({ discardMode: "ios" });

/** 화면 글(정본 밖 문구 표 — 화면 CHILD_TURN_TEXT · SPEAK_BUTTON_TEXT 와 같은 글, talk-discard.spec 의 T 와 같은 값). */
const T = {
  start: "시작!",
  micOk: "알겠어요",
  send: "보내기",
  notHeard: "못 들었어요",
  preparing: "준비 중이에요",
  micRecover: "잠깐만요, 마이크를 다시 켤게요",
  micDeaf: "마이크가 안 잡혔어요. 한 번 더 눌러 주세요",
  micDeafStuck: "마이크가 계속 안 잡혀요. '잘 모르겠어요'를 눌러 넘어가 주세요",
  koListening: "한국어로 물어보세요",
} as const;
const LONG = 180_000;
const STREAM_END_MS = 30_000;
const LEVEL = 3;
const QUESTION = "조개는 영어로 뭐야?";
const TAUGHT = FAKE_KO_HELP.expression.teachEn;
const KO_LANG = TEST_SETTINGS["speech.lang_ko"].value;
const EN_LANG = TEST_SETTINGS["speech.lang"].value;
/** 한국어 듣기 실패가 이어지면 단추를 숨기는 수(talk.ko_ask_fail_hide_after). */
const FAIL_HIDE_AFTER = TEST_SETTINGS["talk.ko_ask_fail_hide_after"].value;
const DEAF_SKIP_AFTER = TEST_SETTINGS["speech.deaf_skip_after"].value;
const DEAF_SILENCE_MS = TEST_SETTINGS["speech.deaf_silence_ms"].value;
const DEAF_RETRY_MAX = TEST_SETTINGS["speech.deaf_retry_max"].value;
/** 인사 끝 반응(talk-discard.spec GREETING_REPLY 와 같은 글 — 그 뒤 대화 첫 질문). */
const GREETING_REPLY = "Great! Let's talk.";
/** 대화 반응(talk-discard.spec REPLIES[0] 과 같은 글 — 1~3단계 질문 검사를 지남은 tests/unit/talk-discard-replies.test.ts 가 고정). */
const REPLY = "Wow! Who do you like?";
/** 선생님이 읽는 동안 누를 만큼 긴 읽기(ms, 시험 값 — talk-discard.spec TEACHER_UTTER_MS 와 같은 값). */
const TEACHER_UTTER_MS = 2500;
/** 확인 칸 '보내기'를 누르는 상한(ms). */
const CLICK_MS = 1000;
const POLL_MS = 100;
/** 힌트 단을 다 열 때 누르는 상한(시험 값 — 단은 많아야 셋). */
const HINT_PRESS_MAX = 5;
/** 버림이 새로 열리지 않음 · 안내가 남음을 볼 때 기다리는 시간(ms — talk-discard.spec NO_NEW_MS 와 같은 셈). */
const NO_NEW_MS =
  DISCARD_TIMES.liveAsMs +
  DISCARD_TIMES.minMs +
  DISCARD_TIMES.endWaitMs +
  DISCARD_TIMES.gapMs;

const SHORT_LINES = TalkShortLinesFileSchema.parse(
  JSON.parse(readFileSync("seed/lists/talk-short-lines.json", "utf8")),
);
/** 그 자리 · 그 단계 구간의 짧은 말 글(talk-discard.spec shortEns 와 같은 꼴). */
const shortEns = (place: "again" | "mic", level = LEVEL): string[] =>
  (SHORT_LINES[place]?.[bandOf(level)] ?? []).map((l) => l.en);

/** 이 시험이 연 쪽과 대본(실패 때 대본 기록을 붙이는 데만 쓴다). */
let current: { page: Page; s: DiscardScript } | undefined;

test.beforeEach(async () => {
  current = undefined;
  await resetHousehold();
  await resetFakeAi();
});
test.afterEach(async ({ context: _context }, testInfo) => {
  if (!current || testInfo.status === testInfo.expectedStatus) return;
  await testInfo.attach("talk-ko-ask-discard-trace.json", {
    body: JSON.stringify(
      await discardTraceOf(current.page, current.s),
      null,
      2,
    ),
    contentType: "application/json",
  });
});
test.afterEach(resetFakeAi);
test.afterAll(closeE2eDb);

type Opened = {
  page: Page;
  profileId: string;
  sessionId: string;
  lesson: TalkLesson;
  card: TalkCard;
  sent: Sent;
  s: DiscardScript;
};

/** 견본을 넣고 회화 쪽을 연다(처음 마이크 안내 '알겠어요'까지 — talk-discard.spec openTalk 의 짧은 준비 없는 꼴). */
async function openTalk(
  context: BrowserContext,
  s: DiscardScript,
): Promise<Opened> {
  const profileId = await talkHousehold(LEVEL);
  await skipStartPrep(profileId, LEVEL);
  const lesson = withoutSceneOpener(greetingTalkLesson(LEVEL));
  const row = await insertTalkLesson({ level: LEVEL, lesson });
  const sessionId = await openTalkSession(profileId, row);
  const page = await speechPage(context, s.script);
  current = { page, s };
  await page.addInitScript(installDiscardWatch);
  const sent = captureSent(page);
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-talk-start]")).toBeVisible();
  await page.getByRole("button", { name: T.start }).click();
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
  return { page, profileId, sessionId, lesson, card: lesson.card, sent, s };
}

const turn = (page: Page) => page.locator("[data-child-turn]");
const bubble = (page: Page) => page.locator("[data-tori-bubble]");
const speakButton = (page: Page) =>
  page.locator("[data-child-turn] [data-speak]");
const koButton = (page: Page) =>
  page.locator("[data-child-turn] [data-ko-ask]");
const hintButton = (page: Page) =>
  page.locator("[data-child-turn] [data-hint-button]");
const koLine = (page: Page) => page.locator("[data-child-turn] [data-ko-line]");
const discardLine = (page: Page) =>
  page.locator("[data-child-turn] [data-discard-line]");
const firstQuestionOf = (card: TalkCard) => card.required[0]?.en ?? "";

async function untilChildTurn(page: Page) {
  await expect(turn(page)).toBeVisible({ timeout: STREAM_END_MS });
  await expect(
    page.locator("[data-talk-panel][data-talk-reading]"),
  ).toHaveCount(0, { timeout: STREAM_END_MS });
}

/** 이 턴의 회화 턴 요청이 나갈 때까지: 인식 확인 칸이 뜨면 '보내기'(talk-discard.spec sendWhenAsked 와 같은 꼴). */
async function sendWhenAsked(o: Opened, before: number) {
  const confirm = o.page.locator("[data-child-turn] [data-child-confirm]");
  const sent = () => o.sent.turns.length > before;
  await expect
    .poll(async () => sent() || (await confirm.isVisible()), {
      message: "이 턴을 보냈거나 인식 확인이 떴다",
      intervals: [POLL_MS],
      timeout: STREAM_END_MS,
    })
    .toBe(true);
  if (!sent())
    await confirm
      .getByRole("button", { name: T.send })
      .click({ timeout: CLICK_MS })
      .catch(() => undefined);
  await expect
    .poll(sent, { message: "이 턴의 회화 턴 요청", timeout: STREAM_END_MS })
    .toBe(true);
}

/** 말하기 한 번 → 진짜가 열릴 때까지 → 보냄(talk-discard.spec sayTurn 의 멈추지 않는 꼴). */
async function sayTurn(o: Opened) {
  const before = o.sent.turns.length;
  const button = speakButton(o.page);
  await button.click();
  await expect(button).toHaveAttribute("data-listening", "", {
    timeout: STREAM_END_MS,
  });
  await sendWhenAsked(o, before);
}

/** 읽어 준 짧은 말(mic 자리) 수. */
async function micShortsSpoken(page: Page): Promise<number> {
  const mic = shortEns("mic");
  return (await speechRecord(page)).spoken.filter((t) => mic.includes(t))
    .length;
}

/** 그 프로필의 부모 알림 종류. */
async function alertKindsOf(profileId: string): Promise<string[]> {
  return (
    await e2eDb()
      .select({ kind: parentAlerts.kind })
      .from(parentAlerts)
      .where(eq(parentAlerts.profileId, profileId))
  ).map((r) => r.kind);
}

/**
 * 합친 안내가 그 턴에 고를 글(AC-25f (라) · koAskNoticeOf): '힌트' 단추가 있고 켜져 있으면(열 단이 남음 — 한국어 듣기가 끝난 뒤 힌트 단추를 끄는
 * 것은 다 연 단 · 듣는 중 · 확인 칸 · 넘김뿐) '힌트'를 짚는 글, 아니면 '아는 말로 말해 봐요'.
 */
async function expectedNoticeOf(page: Page): Promise<string> {
  const hint = hintButton(page);
  if ((await hint.count()) === 0) return KO_ASK_NOTICE.talk;
  return (await hint.isEnabled()) ? KO_ASK_NOTICE.hint : KO_ASK_NOTICE.talk;
}

/** 막힘 화면 · 카드 닫힘 · '마이크 안 잡힘' 안내 · 들리지 않음 차례가 없다(AC-25f (나) · (다)). */
async function expectNoBlockNoDeafNote(page: Page) {
  await expect(page.locator("[data-blocked]")).toHaveCount(0);
  await expect(turn(page)).toBeVisible();
  await expect(turn(page).getByText(T.micDeafStuck)).toHaveCount(0);
  await expect(turn(page).getByText(T.micDeaf)).toHaveCount(0);
  await expect(turn(page).getByText(T.notHeard)).toHaveCount(0);
}

test.describe("수업 안 한국어로 묻기 — 버리는 듣기 기기(3단계)", () => {
  test("AC-N28 · AC-25d 버리는 듣기 기기: 영어 '말하기'가 '준비 중이에요'인 동안과 마이크 다시 켬(회복) 동안 '한국어로 물어보기'가 꺼지고, 한국어 듣기의 마이크 안 잡힘 회복은 누름 없이 한국어로 다시 들어 인식 확인까지 끝나며, 한국어 듣기 뒤의 버림과 다음 '말하기' 듣기는 speech.lang 이다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    if (DEAF_RETRY_MAX !== 0)
      throw new Error(
        "시험 차례는 speech.deaf_retry_max 0 을 전제한다(진짜 안에서 새 객체가 열리면 대본이 한 칸씩 밀림)",
      );
    if (DEAF_SKIP_AFTER < 2 || FAIL_HIDE_AFTER < 2)
      throw new Error(
        "시험 차례는 마이크 안 잡힘 한 번이 회복으로 가는 값(speech.deaf_skip_after · talk.ko_ask_fail_hide_after 2 이상)을 전제한다",
      );
    const s = discardScript(
      [
        real(saidRun("I'm good.")),
        dead({ endAfterStopMs: SLOW_END_MS }),
        real(deafRun()),
        dead(),
        real(saidRun("I like it.")),
        dead(),
        real(deafRun()),
        dead(),
        real(koSaidRun(QUESTION)),
        dead(),
        real(saidRun("I like clams.")),
        dead(),
      ],
      { utterMs: TEACHER_UTTER_MS },
    );
    const o = await openTalk(context, s);
    const { page } = o;
    await untilChildTurn(page);
    await expect(koButton(page)).toBeVisible();
    await pushFakeAi([talkLessonReply({ tori_en: GREETING_REPLY })]);
    await sayTurn(o);

    // (1) 대화 첫 질문을 읽는 동안 '말하기'를 누르면 '준비 중이에요' — 그동안 한국어 단추는 꺼져 있다
    const question = firstQuestionOf(o.card);
    await expect
      .poll(async () => (await speechRecord(page)).spoken.includes(question), {
        intervals: [POLL_MS],
        timeout: STREAM_END_MS,
      })
      .toBe(true);
    const button = speakButton(page);
    await expect(button).toBeVisible();
    await expect(koButton(page)).toBeVisible();
    const beforeTurn = o.sent.turns.length;
    await button.click();
    await expect(button).toHaveAttribute("data-speak-preparing", "");
    await expect(button).not.toHaveAttribute("data-listening", "");
    await expect(koButton(page)).toBeDisabled();

    // (2) 그 진짜가 마이크 안 잡힘 → 회복('잠깐만요, …' · 짧은 말 mic) 동안에도 한국어 단추는 꺼져 있다
    await expect(discardLine(page)).toHaveText(T.micRecover, {
      timeout: DEAF_SILENCE_MS + STREAM_END_MS,
    });
    await expect(button).not.toHaveAttribute("data-listening", "");
    await expect(koButton(page)).toBeDisabled();
    await expect
      .poll(() => micShortsSpoken(page), { timeout: STREAM_END_MS })
      .toBe(1);
    await expect(koButton(page)).toBeDisabled();
    // 회복 뒤 진짜가 열려 말을 받는다 — 이 턴을 보낸다
    await expect(button).toHaveAttribute("data-listening", "", {
      timeout: STREAM_END_MS,
    });
    await pushFakeAi([
      talkLessonReply({ tori_en: REPLY, next_move: "follow_up" }),
    ]);
    await sendWhenAsked(o, beforeTurn);
    await expect(bubble(page)).toContainText("Wow!", {
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(page);

    // (3) 한국어 듣기의 마이크 안 잡힘: 회복 안내 · 짧은 말 뒤 누름 없이 한국어로 다시 듣고, 글이 오면 한국어 인식 확인으로 회복이 끝난다
    await pushFakeAi([ruleFor("talk_ko_help", talkKoHelpReply())]);
    await expect(koButton(page)).toBeEnabled();
    const turnsBeforeKo = await talkTurnRequests();
    const koReply = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === TALK_KO_HELP_URL &&
        r.request().method() === "POST",
      { timeout: LONG },
    );
    await koButton(page).click();
    await expect(discardLine(page)).toHaveText(T.micRecover, {
      timeout: DEAF_SILENCE_MS + STREAM_END_MS,
    });
    await expect(koButton(page)).toBeDisabled();
    await expect
      .poll(() => micShortsSpoken(page), { timeout: STREAM_END_MS })
      .toBe(2);
    const confirm = page.locator("[data-ko-confirm]");
    await expect(confirm).toBeVisible({ timeout: STREAM_END_MS });
    await expect(confirm).toContainText(QUESTION);
    await expect(
      discardLine(page).filter({ hasText: T.micRecover }),
    ).toHaveCount(0);
    await expectNoBlockNoDeafNote(page);
    await page.locator("[data-ko-send]").click();
    expect(((await (await koReply).json()) as { t: string }).t).toBe("ok");
    await expect(page.locator("[data-ko-exchange]").last()).toBeVisible({
      timeout: STREAM_END_MS,
    });
    expect(await koHelpRequests()).toBe(1);
    // 한국어 듣기 · 그 회복은 회화 턴 요청을 보내지 않는다
    expect(await talkTurnRequests()).toBe(turnsBeforeKo);
    await expect
      .poll(
        async () =>
          (await speechRecord(page)).spoken.filter((t) => t === TAUGHT).length,
        { timeout: STREAM_END_MS },
      )
      .toBe(1);

    // (4) 다음 '말하기' 듣기 — 그 앞 버림과 함께 speech.lang 이다(AC-25d)
    await expect(button).toBeEnabled({ timeout: STREAM_END_MS });
    await pushFakeAi([talkLessonReply({ tori_en: "Nice! Do you like it?" })]);
    await sayTurn(o);
    const langs = await recognitionLangs(page);
    const koAt = langs.flatMap((l, i) => (l === KO_LANG ? [i] : []));
    // 한국어로 연 인식 객체는 누른 한국어 듣기와 그 회복 둘뿐이다
    expect(koAt).toHaveLength(2);
    const lastKo = koAt.at(-1) ?? -1;
    const afterKo = langs.slice(lastKo + 1);
    // 그 뒤 버림 하나 이상과 '말하기'의 진짜가 열렸고 모두 speech.lang
    expect(afterKo.length).toBeGreaterThanOrEqual(2);
    expect(afterKo.every((l) => l === EN_LANG)).toBe(true);
    // 두 한국어 듣기 사이(회복의 버림)도 speech.lang
    expect(
      langs.slice((koAt[0] ?? 0) + 1, lastKo).every((l) => l === EN_LANG),
    ).toBe(true);
    expect(await alertKindsOf(o.profileId)).toEqual([]);
  });

  test("AC-25f (나) · (라) 버리는 듣기 기기에서 한국어 듣기가 service-not-allowed 로 끝나면 합친 안내 한 줄과 함께 단추가 숨고(막힘 화면 · 카드 닫힘 · 부모 알림 없음) 안내는 다음 누름까지 남으며, 다음 '말하기' 듣기가 열리고 그 앞 버림의 다시 연 까닭이 '마이크를 쓸 수 없음'(no_mic)이 아닌 no_lang 이다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const s = discardScript([
      real(failingRun("service-not-allowed")),
      dead(),
      real(saidRun("I'm good.")),
      dead(),
    ]);
    const o = await openTalk(context, s);
    const { page } = o;
    await untilChildTurn(page);
    await expect(koButton(page)).toBeEnabled();
    const ai = await talkTurnRequests();
    await koButton(page).click();
    // 단추가 숨고 합친 안내 한 줄(그 턴의 '힌트' 단추 · 남은 단으로 고른 글)
    await expect(koButton(page)).toHaveCount(0, { timeout: STREAM_END_MS });
    const notice = await expectedNoticeOf(page);
    await expect(koLine(page)).toHaveText(notice);
    await expectNoBlockNoDeafNote(page);
    await expect(speakButton(page)).toBeEnabled();
    // 다음 누름까지 남는다(그동안 버림을 새로 열지 않는다 — 다음 읽기 · 누름 앞에 '버림부터')
    await page.waitForTimeout(NO_NEW_MS);
    await expect(koLine(page)).toHaveText(notice);
    expect(await startsOf(page)).toBe(1);
    expect(await recognitionLangs(page)).toEqual([KO_LANG]);
    expect(await talkTurnRequests()).toBe(ai);

    // 다음 '말하기': 누름에 안내가 지워지고, 버림부터 다시 연 뒤 진짜가 열려 말을 받는다
    await pushFakeAi([talkLessonReply({ tori_en: GREETING_REPLY })]);
    await speakButton(page).click();
    await expect(koLine(page)).toHaveCount(0);
    await expect(speakButton(page)).toHaveAttribute("data-listening", "", {
      timeout: STREAM_END_MS,
    });
    await sendWhenAsked(o, 0);
    await expect(bubble(page)).toContainText(firstQuestionOf(o.card), {
      timeout: STREAM_END_MS,
    });
    // 숨김은 그 수업 화면에 있는 동안이다 — 다음 차례에도 단추가 없다
    await untilChildTurn(page);
    await expect(koButton(page)).toHaveCount(0);
    await expect(page.locator("[data-blocked]")).toHaveCount(0);
    const langs = await recognitionLangs(page);
    expect(langs[0]).toBe(KO_LANG);
    expect(langs.slice(1).every((l) => l === EN_LANG)).toBe(true);
    // 그 진짜의 dc: 버림부터(reopen) · 다시 연 까닭 no_lang(마이크를 쓸 수 없음의 no_mic 과 다름 — plan 정한 것 2)
    const [row] = await childRowsOf(o.sessionId);
    if (!row) throw new Error("인사 아이 행이 없다");
    const dc = listensOf(row).at(-1)?.dc;
    expect(dc?.g).toBe("reopen");
    expect(dc?.rw).toBe("no_lang");
    expect(dc?.rw).not.toBe("no_mic");
    expect(await alertKindsOf(o.profileId)).toEqual([]);
  });

  test("AC-25f (다) · (라) 버리는 듣기 기기에서 한국어 듣기의 마이크 안 잡힘이 talk.ko_ask_fail_hide_after 번 이어지면 회복 짧은 말은 그보다 하나 적게만 나오고, 그 번째에 단추가 숨으며 '아는 말로 말해 봐요' 안내가 다음 누름까지 남는다. 그동안 '잘 모르겠어요' 넘김 안내 · 들리지 않음 차례 · 막힘 화면 · 회화 턴 요청이 없고, 그 뒤 영어 마이크 안 잡힘은 처음부터 센다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    if (DEAF_RETRY_MAX !== 0)
      throw new Error(
        "시험 차례는 speech.deaf_retry_max 0 을 전제한다(진짜 안에서 새 객체가 열리면 대본이 한 칸씩 밀림)",
      );
    if (DEAF_SKIP_AFTER > FAIL_HIDE_AFTER || DEAF_SKIP_AFTER < 2)
      throw new Error(
        "시험 차례는 speech.deaf_skip_after 가 2 이상이고 talk.ko_ask_fail_hide_after 보다 크지 않음을 전제한다(한국어 셈이 영어 셈에 들면 첫 영어 마이크 안 잡힘이 바로 넘김 안내가 됨)",
      );
    const s = discardScript([
      ...Array.from({ length: FAIL_HIDE_AFTER }, () => [
        real(deafRun()),
        dead(),
      ]).flat(),
      real(deafRun()),
      dead(),
      real(saidRun("I'm good.")),
      dead(),
    ]);
    const o = await openTalk(context, s);
    const { page } = o;
    await untilChildTurn(page);
    // 그 턴의 힌트 단을 다 열어 둔다(남은 단이 없는 턴의 합친 안내 — (라))
    const hint = hintButton(page);
    for (let i = 0; i < HINT_PRESS_MAX; i++) {
      if ((await hint.count()) === 0 || !(await hint.isEnabled())) break;
      await hint.click();
      await page.waitForTimeout(POLL_MS * 3);
    }
    if ((await hint.count()) > 0) await expect(hint).toBeDisabled();
    await expect(koButton(page)).toBeEnabled();
    const ai = await talkTurnRequests();
    await koButton(page).click();
    // 문턱 앞까지는 회복(안내 · 짧은 말 mic · 누름 없이 한국어로 다시 들음)
    for (let i = 1; i < FAIL_HIDE_AFTER; i++) {
      await expect(discardLine(page)).toHaveText(T.micRecover, {
        timeout: DEAF_SILENCE_MS + STREAM_END_MS,
      });
      await expect(koButton(page)).toBeDisabled();
      await expect
        .poll(() => micShortsSpoken(page), { timeout: STREAM_END_MS })
        .toBe(i);
      await expectNoBlockNoDeafNote(page);
    }
    // 문턱 번째: 회복 없이 단추가 숨고 합친 안내
    await expect(koButton(page)).toHaveCount(0, {
      timeout: DEAF_SILENCE_MS + STREAM_END_MS,
    });
    await expect(koLine(page)).toHaveText(KO_ASK_NOTICE.talk);
    await page.waitForTimeout(NO_NEW_MS);
    expect(await micShortsSpoken(page)).toBe(FAIL_HIDE_AFTER - 1);
    await expect(koLine(page)).toHaveText(KO_ASK_NOTICE.talk);
    await expect(
      discardLine(page).filter({ hasText: T.micRecover }),
    ).toHaveCount(0);
    await expectNoBlockNoDeafNote(page);
    expect(await talkTurnRequests()).toBe(ai);
    const langs = await recognitionLangs(page);
    // 한국어 진짜 셋(누름 · 회복 둘)은 ko, 그 사이 · 뒤의 버림은 speech.lang
    expect(langs.filter((l) => l === KO_LANG)).toHaveLength(FAIL_HIDE_AFTER);
    langs.forEach((l, i) => {
      expect(l, `start ${i}`).toBe(i % 2 === 0 ? KO_LANG : EN_LANG);
    });

    // 그 뒤 영어 '말하기'의 마이크 안 잡힘은 처음부터 센다 — 넘김 안내가 아니라 회복이다
    await speakButton(page).click();
    await expect(koLine(page)).toHaveCount(0);
    await expect(discardLine(page)).toHaveText(T.micRecover, {
      timeout: DEAF_SILENCE_MS + STREAM_END_MS,
    });
    await expect(turn(page).getByText(T.micDeafStuck)).toHaveCount(0);
    await pushFakeAi([talkLessonReply({ tori_en: GREETING_REPLY })]);
    await expect(speakButton(page)).toHaveAttribute("data-listening", "", {
      timeout: STREAM_END_MS,
    });
    await sendWhenAsked(o, 0);
    await expect(bubble(page)).toContainText(firstQuestionOf(o.card), {
      timeout: STREAM_END_MS,
    });
    expect(await alertKindsOf(o.profileId)).toEqual([]);
  });
});

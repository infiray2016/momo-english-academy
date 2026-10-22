// 회화 1단계 인사 → 대화 e2e(plan-p13b 차례 5 — 증명 표 AC-15a · 15b · 15g · 15l · N8 · 8b 의 화면 몫, 4절 회화 세션 표 · 3.3 · 7절 · T2).
// 견본 수업(인사 → 대화 — 오늘 쓸 말 없음)을 시험이 넣고 진행 세션을 바로 연다. 회화 턴은 가짜 Anthropic SSE(talkReply), 듣기는 가짜 Web Speech
// 대본(턴마다 하나). 숫자(인식 확인 초 · 기다림 표시 초 · 천천히 빠르기)는 시험용 설정에서 읽는다. 홈부터 · 오늘 쓸 말 · 정리 · 마무리는 차례 6.
// 녹음하지 않는다(브라우저 인식만). 화면 검토 사진은 E2E_PHOTOS 때만(p13-talk-…).
import type { BrowserContext, Page } from "@playwright/test";
import { max } from "drizzle-orm";
import { twoAnswersLine } from "../../src/core/ai/calls/talk";
import { safeLineOf } from "../../src/core/conversation/stream";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
import type { TalkCard } from "../../src/core/seed/schema/talk";
import { LEVEL_MAX } from "../../src/core/seed/structure";
import type { RecognitionRun } from "../../src/core/speech/script";
import { settings } from "../../src/db/schema/operations";
import { TEST_SETTINGS } from "../fixtures/settings";
import { CHILD_VIEWPORTS } from "./child-size";
import { closeE2eDb, e2eDb, resetHousehold, withHouseholdSetting } from "./db";
import { fakeAiRequests, pushFakeAi, resetFakeAi } from "./fake-ai";
import { expect, speechPage, test } from "./fixtures";
import { photo } from "./photos";
import {
  insertTalkLesson,
  openTalkSession,
  saidRun,
  speechRecord,
  TURN_MARK,
  talkHousehold,
  talkReply,
  talkScript,
} from "./talk";

const T = {
  micOk: "알겠어요",
  hint: "힌트",
  dontKnow: "잘 모르겠어요",
  again: "다시 말하기",
  send: "보내기",
  thinking: "토리가 생각하고 있어요",
  rest: "토리가 잠깐 쉬어요",
} as const;
const MS = 1000;
const CONFIRM_MS = TEST_SETTINGS["talk.confirm_seconds"].value * MS;
const WAIT_LINE_MS = TEST_SETTINGS["ui.wait_hint_seconds"].value[1] * MS;
const SLOW_RATE = TEST_SETTINGS["speech.slow_rate"].value;
/** 한 시험 시간(듣기 끝 조용함 · 인식 확인 · 흘려 받기 지연을 여럿 기다림). */
const LONG = 120_000;
/** 느린 흘려 받기가 끝 줄까지 오는 여유(시험 값 — 24 조각 × 300ms 와 읽기). */
const STREAM_END_MS = 30_000;
/** 화면을 떠난 뒤 읽기가 더 일어나지 않는지 지켜보는 동안(시험 값 — 남은 조각이 흐를 시간보다 길게). */
const AFTER_LEAVE_MS = 4000;
/** 들어올 때의 읽기가 듣기보다 먼저 돌 틈(SETTLE — 말하기 e2e 와 같은 까닭). */
const SETTLE_MS = 250;

test.beforeEach(async () => {
  await resetHousehold();
  await resetFakeAi();
});
test.afterEach(resetFakeAi);
test.afterAll(closeE2eDb);

type Opened = {
  page: Page;
  sessionId: string;
  card: TalkCard;
  profileId: string;
};

/** 1단계 인사 → 대화 견본을 넣고 회화 쪽을 연다(처음 마이크 안내 '알겠어요'까지). */
async function openTalk(
  context: BrowserContext,
  runs: RecognitionRun[] | ((card: TalkCard) => RecognitionRun[]),
): Promise<Opened> {
  const profileId = await talkHousehold(1);
  const row = await insertTalkLesson({ level: 1 });
  const sessionId = await openTalkSession(profileId, row);
  const card = (row.content as TalkLesson).card;
  const page = await speechPage(
    context,
    talkScript(typeof runs === "function" ? runs(card) : runs),
  );
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
  return { page, sessionId, profileId, card };
}

const bubble = (page: Page) => page.locator("[data-tori-bubble]");
const childTurn = (page: Page) => page.locator("[data-child-turn]");

/** 아이 차례가 열릴 때까지(토리가 다 읽고 끝 줄까지 받음). */
async function untilChildTurn(page: Page) {
  await expect(childTurn(page)).toBeVisible();
  await page.waitForTimeout(SETTLE_MS);
}

/** '말하기'를 누르고 그 듣기가 끝날 때까지. */
async function speak(page: Page) {
  await untilChildTurn(page);
  await page.locator("[data-child-turn] [data-speak]").click();
  await expect(page.locator("[data-child-turn] [data-listening]")).toHaveCount(
    0,
  );
}

async function turnRequests(): Promise<number> {
  return (await fakeAiRequests()).filter((r) => r.bodyText.includes(TURN_MARK))
    .length;
}

/** 인사 턴 질문(1단계 카드 인사 질문 하나 — 답 두 개). */
function greetingOf(card: TalkCard) {
  if (!("questions" in card.greeting)) throw new Error("견본 꼴");
  const turn = card.greeting.questions[0];
  if (!turn?.twoAnswers) throw new Error("견본 꼴");
  return { ...turn, twoAnswers: turn.twoAnswers };
}

/** 인사 턴에 답하고 대화 첫 질문이 붙을 때까지(인사 답은 답 두 개의 첫째 — 바로 보냄). */
async function pastGreeting(page: Page, card: TalkCard) {
  await pushFakeAi([talkReply({ tori_en: "Great! Let's talk." })]);
  await speak(page);
  const first = card.turns?.[0];
  if (!first) throw new Error("견본 꼴");
  await expect(bubble(page)).toContainText(first.question.en);
  return first;
}

test.describe("회화 1단계 인사 → 대화(차례 5)", () => {
  test.setTimeout(LONG);

  test("AC-15a 회화 1단계 인사 턴과 처음 묻는 턴에서는 질문 뒤 답 두 개가 'Or' 를 사이에 두고 들리고 화면에는 답 글 없이 듣기 버튼 ①② 만 있다", async ({
    context,
  }) => {
    const greeting = { en: "I'm good." };
    const { page, card } = await openTalk(context, [saidRun(greeting.en)]);
    const g = greetingOf(card);
    await expect(bubble(page)).toContainText(g.question.en);
    await expect(page.locator("[data-answer-listen]")).toHaveCount(2);
    await untilChildTurn(page);
    // 들렸다: 질문 → 'Or' 를 사이에 둔 답 두 개. 글로는 없다
    const spoken = (await speechRecord(page)).spoken;
    expect(spoken).toEqual(
      expect.arrayContaining([g.question.en, twoAnswersLine(g.twoAnswers)]),
    );
    const text = await page.locator("main").innerText();
    for (const answer of g.twoAnswers) expect(text).not.toContain(answer);
    await photo(page, "p13-talk-greeting");

    // 처음 묻는 대화 턴도 같다(대화 첫 질문은 앱이 붙임 — AI 없음)
    const first = await pastGreeting(page, card);
    if (!first.twoAnswers) throw new Error("견본 꼴 — 1단계 처음 묻는 턴");
    await untilChildTurn(page);
    expect((await speechRecord(page)).spoken).toContain(
      twoAnswersLine(first.twoAnswers),
    );
    const talkText = await page.locator("main").innerText();
    for (const answer of first.twoAnswers)
      expect(talkText).not.toContain(answer);
    expect(talkText).not.toContain(first.hintEn);
    await expect(page.locator("[data-answer-listen]")).toHaveCount(2);
    await photo(page, "p13-talk-dialogue");
    await photo(page, "p13-talk-answers");
  });

  test("AC-15a 회화 1단계 '힌트'를 한 번 누르면 한국어 뜻, 두 번 누르면 영어 문장과 듣기 버튼이 보인다", async ({
    context,
  }) => {
    const { page, card } = await openTalk(context, [saidRun("I'm good.")]);
    const first = await pastGreeting(page, card);
    await untilChildTurn(page);
    await expect(page.locator("[data-hint-tier]")).toHaveCount(0);
    await page.getByRole("button", { name: T.hint }).click();
    await expect(page.locator('[data-hint-tier="ko"]')).toHaveText(
      first.hintKo,
    );
    expect(await page.locator("main").innerText()).not.toContain(first.hintEn);
    await page.getByRole("button", { name: T.hint }).click();
    await expect(page.locator('[data-hint-tier="sentence"]')).toContainText(
      first.hintEn,
    );
    await page.locator("[data-hint-listen]").click();
    await expect
      .poll(async () => (await speechRecord(page)).spoken.at(-1))
      .toBe(first.hintEn);
    expect((await speechRecord(page)).rates.at(-1)).toBeCloseTo(SLOW_RATE);
    await photo(page, "p13-talk-hint");
  });

  test("AC-15a 인식 글이 들려준 답이나 연 영어 문장과 talk.hint_read_match 이상 맞으면 바로 보내지고 아니면 talk.confirm_seconds 보인 뒤 보내지며 힌트를 열지 않고 말한 턴에는 '다시 말하기'가 크게 보이지 않는다", async ({
    context,
  }) => {
    const { page, card } = await openTalk(context, (c) => [
      saidRun("I'm good."),
      saidRun("blue banana sky"),
      // 둘째 대화 턴(처음 묻는 턴)의 들려준 답 첫째
      saidRun(c.turns?.[1]?.twoAnswers?.[0] ?? "?"),
      saidRun("zebra moon"),
    ]);
    // 인사: 들려준 답과 맞아 바로 보냄(인식 확인이 보이지 않는다)
    await pastGreeting(page, card);
    expect(await turnRequests()).toBe(1);
    // 대화 첫 턴: 들려준 답과 맞지 않음 → 인식 확인(다시 말하기 크게) → 아무것도 안 누르면 보냄
    await pushFakeAi([talkReply({ tori_en: "Okay!" })]);
    await speak(page);
    await expect(page.locator("[data-child-confirm]")).toBeVisible();
    await expect(page.locator('[data-retry-size="big"]')).toBeVisible();
    // 인식 확인 중에는 '힌트' · '잘 모르겠어요'를 누를 수 없다(한 화면 한 행동 — 화면 검토 M-4)
    await expect(page.getByRole("button", { name: T.hint })).toBeDisabled();
    await expect(page.getByRole("button", { name: T.dontKnow })).toBeDisabled();
    await photo(page, "p13-talk-confirm");
    await expect.poll(turnRequests, { timeout: CONFIRM_MS * 3 }).toBe(2);
    // 둘째 턴: 들려준 답과 맞아 바로
    await pushFakeAi([talkReply({ tori_en: "Good!" })]);
    await expect(bubble(page)).toContainText(
      card.turns?.[1]?.question.en ?? "?",
    );
    await speak(page);
    await expect.poll(turnRequests).toBe(3);
    // 셋째 턴(다시 묻는 턴 — 답을 들려주지 않음 · 힌트 안 엶): 인식 확인의 두 단추가 같은 크기
    await pushFakeAi([talkReply({ tori_en: "Nice!" })]);
    await speak(page);
    await expect(page.locator("[data-child-confirm]")).toBeVisible();
    await expect(page.locator('[data-retry-size="small"]')).toBeVisible();
    await expect(page.locator('[data-retry-size="big"]')).toHaveCount(0);
    await expect.poll(turnRequests, { timeout: CONFIRM_MS * 3 }).toBe(4);
  });

  test("AC-N8 인식 확인 중 '보내기'를 누르면 바로 보낸다", async ({
    context,
  }) => {
    const { page, card } = await openTalk(context, [
      saidRun("I'm good."),
      saidRun("blue banana sky"),
    ]);
    await pastGreeting(page, card);
    await pushFakeAi([talkReply({ tori_en: "Okay!" })]);
    await speak(page);
    await expect(page.locator("[data-child-confirm]")).toBeVisible();
    const before = Date.now();
    await page.getByRole("button", { name: T.send }).click();
    await expect.poll(turnRequests).toBe(2);
    expect(Date.now() - before).toBeLessThan(CONFIRM_MS);
  });

  test("AC-15g '잘 모르겠어요'를 누르면 1단계는 한국어 설명이 토리 말풍선 아래에 글로 보이고 읽어 주지 않으며 토리가 답 예시를 말한 뒤 같은 질문을 다시 묻고 위 띠 숫자가 오르지 않는다", async ({
    context,
  }) => {
    const { page, card } = await openTalk(context, [saidRun("I'm good.")]);
    const first = await pastGreeting(page, card);
    await untilChildTurn(page);
    const count = await page.locator("[data-talk-count]").innerText();
    const explanation = "괜찮아, 같이 말해 보자.";
    await pushFakeAi([talkReply({ tori_en: "That's okay.", explanation })]);
    await page.getByRole("button", { name: T.dontKnow }).click();
    await expect(page.locator("[data-tori-explanation]")).toHaveText(
      explanation,
    );
    await untilChildTurn(page);
    await expect(bubble(page)).toContainText(first.question.en);
    const spoken = (await speechRecord(page)).spoken;
    const at = spoken.lastIndexOf(first.answerExample);
    expect(at).toBeGreaterThan(-1);
    expect(spoken.slice(at)).toContain(first.question.en);
    expect(spoken).not.toContain(explanation);
    // 답 예시는 들려주기만 하고 글로 보이지 않는다(1~3단계 T2)
    expect(await page.locator("main").innerText()).not.toContain(
      first.answerExample,
    );
    await expect(page.locator("[data-talk-count]")).toHaveText(count);
    await photo(page, "p13-talk-dontknow");
  });

  test("AC-15l 토리 말풍선을 누르면 그 말을 다시 읽어 주고 1~2단계는 천천히 읽으며 1단계 처음 묻는 턴에서는 질문과 답 두 개를 다시 들려준다", async ({
    context,
  }) => {
    const { page, card } = await openTalk(context, []);
    const g = greetingOf(card);
    await untilChildTurn(page);
    const before = (await speechRecord(page)).spoken.length;
    await bubble(page).click();
    await expect
      .poll(async () => (await speechRecord(page)).spoken.slice(before))
      .toEqual([g.question.en, twoAnswersLine(g.twoAnswers)]);
    // 토리가 읽은 글은 모두 천천히(첫 누름의 읽어 주기 잠금 풀기 발화 — 빈 글 — 는 뺀다)
    const record = await speechRecord(page);
    const read = record.rates.filter(
      (_, i) => (record.spoken[i] ?? "").trim() !== "",
    );
    expect(read.length).toBeGreaterThan(0);
    for (const rate of read) expect(rate).toBeCloseTo(SLOW_RATE);
  });

  test("AC-15l 1단계 처음 묻는 턴의 듣기 버튼 ①을 누르면 첫째 답만 다시 읽고 아이 차례 화면에 따로 '다시 듣기' 버튼이 없다", async ({
    context,
  }) => {
    const { page, card } = await openTalk(context, []);
    const g = greetingOf(card);
    await untilChildTurn(page);
    await page.locator('[data-answer-listen="1"]').click();
    await expect
      .poll(async () => (await speechRecord(page)).spoken.at(-1))
      .toBe(g.twoAnswers[0]);
    // 말풍선 자체가 다시 읽기다(4절) — 아이 차례 화면 안에 따로 '다시 듣기' 단추가 없다(검토 I-3)
    await expect(
      page.locator("[data-child-turn]").getByRole("button", {
        name: /다시 듣기/,
      }),
    ).toHaveCount(0);
  });

  test("AC-N8 회화 턴 고정 표본을 흘려 보내는 가짜 클라이언트에서 첫 문장이 끝나면 전체 응답을 기다리지 않고 화면 표시와 읽어 주기가 시작된다", async ({
    context,
  }) => {
    const { page } = await openTalk(context, [saidRun("I'm good.")]);
    // 첫 조각을 기다림 표시 둘째 값보다 늦게, 그 뒤 조각을 천천히(전체 응답은 한참 뒤)
    await pushFakeAi([
      talkReply(
        { tori_en: "Great! I am happy too. Let's talk." },
        { chunks: 24, delayMs: 300, firstDelayMs: WAIT_LINE_MS + MS },
      ),
    ]);
    await speak(page);
    await expect(page.locator("[data-wait-hint]")).toBeVisible();
    await expect(page.locator("[data-wait-line]")).toHaveText(T.thinking, {
      timeout: WAIT_LINE_MS * 2,
    });
    await photo(page, "p13-talk-waiting");
    await expect
      .poll(async () => (await speechRecord(page)).spoken, {
        timeout: WAIT_LINE_MS * 3,
      })
      .toContain("Great!");
    // 첫 문장은 보이고 읽혔지만 끝 줄(뜻 · 아이 차례)은 아직이다
    await expect(page.locator("[data-tori-line]").first()).toContainText(
      "Great!",
    );
    await expect(page.locator("[data-tori-ko]")).toHaveCount(0);
    await expect(childTurn(page)).toHaveCount(0);
    // 남은 조각을 끝 줄까지 받고 끝낸다(다음 시험의 집 비우기 뒤까지 흐르지 않게 — 검토 M-10)
    await expect(childTurn(page)).toBeVisible({ timeout: STREAM_END_MS });
  });

  test("AC-15b 검사에 걸린 문장은 회화 화면과 읽어 주기에 나오지 않고 카드의 안전한 대사가 보인다", async ({
    context,
  }) => {
    const { page, card } = await openTalk(context, [saidRun("I'm good.")]);
    await pushFakeAi([talkReply({ tori_en: "Great! Where do you live?" })]);
    await speak(page);
    // 인사 턴(앞 턴 짝 0)의 안전한 대사 차례 — 서버 문장 검사와 같은 함수
    const safe = safeLineOf(card.safeLines, 1);
    await expect(bubble(page)).toContainText(safe);
    expect(await page.locator("main").innerText()).not.toContain(
      "Where do you live",
    );
    expect((await speechRecord(page)).spoken).not.toContain(
      "Where do you live?",
    );
  });

  test("AC-8b 알림 기준을 넘긴 날 회화 세션 화면에 제한 문구가 없다", async ({
    context,
  }) => {
    const { page, card, profileId } = await openTalk(context, [
      saidRun("I'm good."),
    ]);
    // 하루 호출 알림 기준을 이 프로필만 1 로(이미 넘긴 날 — 알림 기준은 막지 않는다, AC-8b)
    const [version] = await e2eDb()
      .select({ v: max(settings.version) })
      .from(settings);
    await e2eDb()
      .insert(settings)
      .values({
        key: "ai.daily_call_alert",
        scope: "profile",
        profileId,
        value: 1,
        version: Number(version?.v ?? 0) + 1,
      });
    await pastGreeting(page, card);
    await untilChildTurn(page);
    expect(await page.locator("main").innerText()).not.toContain(T.rest);
    await expect(page.locator("[data-ai-rest]")).toHaveCount(0);
  });
});

test.describe("회화 화면 — 끊음 · 다시 보내기 · 힌트 빠르기(차례 5 fix 1)", () => {
  test.setTimeout(LONG);

  test("회화 화면: 토리 말을 흘려 받는 중 '홈'을 누르면 홈에서 토리 말을 더 읽지 않는다", async ({
    context,
  }) => {
    const { page } = await openTalk(context, [saidRun("I'm good.")]);
    await pushFakeAi([
      talkReply(
        { tori_en: "Great! I am happy too. Let's talk about it." },
        { chunks: 24, delayMs: 300 },
      ),
    ]);
    await speak(page);
    await expect
      .poll(async () => (await speechRecord(page)).spoken, {
        timeout: STREAM_END_MS,
      })
      .toContain("Great!");
    await page.getByRole("button", { name: "홈", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    const read = (await speechRecord(page)).spoken.length;
    await page.waitForTimeout(AFTER_LEAVE_MS);
    expect((await speechRecord(page)).spoken.length).toBe(read);
  });

  test("회화 화면: 같은 시도 id 가 아직 진행 중이라 stale 을 받으면 기다렸다 다시 읽어 토리 말이 그려지고 읽힌다", async ({
    context,
  }) => {
    const reply = "Welcome back, friend.";
    const { page, sessionId } = await openTalk(context, [saidRun("I'm good.")]);
    // 첫 요청: 첫 조각을 늦게(그동안 둘째 쪽이 같은 시도 id 로 다시 보내 stale 을 받는다)
    await pushFakeAi([
      // 첫 조각 6초 뒤(첫 글 기다림 10초 안) — 둘째 쪽이 자료를 한 번 다시 읽고 다시 보낼 때까지 첫 요청이 진행 중이게
      talkReply({ tori_en: reply }, { chunks: 4, firstDelayMs: 6000 }),
    ]);
    await speak(page);
    // 첫 쪽 아이 행이 저장되고 AI 가 불린 뒤에 둘째 쪽을 연다(그 쪽 자료에 토리의 말이 없는 아이 행이 있게)
    await expect.poll(turnRequests).toBe(1);
    const firstDone = expect(childTurn(page)).toBeVisible({
      timeout: STREAM_END_MS,
    });
    // 둘째 쪽의 턴 요청: 첫 요청만 통과(진행 중이라 stale), 나머지는 첫 쪽이 끝난 뒤에 보낸다 — 시간에 기대지 않는다(재검토 N-3)
    const second = await speechPage(context, talkScript([]));
    let secondTurns = 0;
    await second.route("**/api/talk/turn", async (route) => {
      secondTurns += 1;
      if (secondTurns > 1) await firstDone;
      // 그사이 틀이 새 판으로 다시 그려져 요청이 끊겼으면 넘길 것이 없다
      await route.continue().catch(() => {});
    });
    await second.goto(`/session/${sessionId}`);
    await expect(second.locator("[data-tori-bubble]")).toContainText(reply, {
      timeout: STREAM_END_MS,
    });
    await firstDone;
    // 다시 흘린(또는 다시 읽은) 토리 말이 둘째 쪽에서 소리로도 읽혔다(재검토 N-1 — 자료 다시 읽기 뒤 음성 접점이 그대로)
    await expect
      .poll(async () => (await speechRecord(second)).spoken, {
        timeout: STREAM_END_MS,
      })
      .toContain(reply);
    expect(secondTurns).toBeGreaterThanOrEqual(2);
    // AI 는 한 번만 불렸다(둘째 쪽은 stale · 다시 흘림)
    expect(await turnRequests()).toBe(1);
  });

  test("회화 화면: 3단계 힌트 영어 문장 듣기는 천천히 읽고 토리 말은 보통 빠르기로 읽는다", async ({
    context,
  }) => {
    await withHouseholdSetting(
      "seed.complete_through_level",
      LEVEL_MAX,
      async () => {
        const profileId = await talkHousehold(3);
        const row = await insertTalkLesson({ level: 3 });
        const sessionId = await openTalkSession(profileId, row);
        const page = await speechPage(context, talkScript([]));
        await page.goto(`/session/${sessionId}`);
        await page.getByRole("button", { name: T.micOk }).click();
        await untilChildTurn(page);
        const card = (row.content as TalkLesson).card;
        if (!("questions" in card.greeting)) throw new Error("견본 꼴");
        const greeting = card.greeting.questions[0];
        if (!greeting?.frameEn) throw new Error("견본 꼴 — 3단계 영어 틀");
        // 뜻 → 영어 틀 → 영어 문장(3단계 세 단)
        for (let i = 0; i < 3; i++)
          await page.getByRole("button", { name: T.hint }).click();
        await expect(page.locator('[data-hint-tier="frame"]')).toContainText(
          greeting.frameEn,
        );
        await expect(page.locator('[data-hint-tier="sentence"]')).toContainText(
          greeting.hintEn,
        );
        const tori = await speechRecord(page);
        const at = tori.spoken.indexOf(greeting.question.en);
        expect(at).toBeGreaterThan(-1);
        expect(tori.rates[at]).toBe(1);
        await page.locator("[data-hint-listen]").click();
        await expect
          .poll(async () => (await speechRecord(page)).spoken.at(-1))
          .toBe(greeting.hintEn);
        expect((await speechRecord(page)).rates.at(-1)).toBeCloseTo(SLOW_RATE);
      },
    );
  });
});

test.describe("회화 화면 — 보는 창 · 그림 깨짐(차례 5 fix 2)", () => {
  test.setTimeout(LONG);

  test("회화 화면: 가로 1180×820 에서 토리 세 줄 · 힌트 끝 단 · 설명이 있는 턴에도 말하기 · 잘 모르겠어요 · 토리의 약속이 보는 창 안이고 그만하기는 위 띠 안이다", async ({
    context,
  }) => {
    const { page, card } = await openTalk(context, [saidRun("I'm good.")]);
    await page.setViewportSize(CHILD_VIEWPORTS.landscape);
    await pastGreeting(page, card);
    await untilChildTurn(page);
    await pushFakeAi([
      talkReply({
        tori_en: "That's okay. Let me help you.",
        explanation: "괜찮아, 같이 말해 보자.",
      }),
    ]);
    await page.getByRole("button", { name: T.dontKnow }).click();
    await expect(page.locator("[data-tori-explanation]")).toBeVisible();
    await untilChildTurn(page);
    // 힌트 끝 단까지 연다
    const hint = page.getByRole("button", { name: T.hint });
    while (await hint.isEnabled()) await hint.click();
    await expect(page.locator('[data-hint-tier="sentence"]')).toBeVisible();
    const height = CHILD_VIEWPORTS.landscape.height;
    for (const selector of [
      "[data-child-turn] [data-speak]",
      "[data-dont-know]",
      "[data-tori-promise]",
    ]) {
      const box = await page.locator(selector).boundingBox();
      expect(box, selector).not.toBeNull();
      expect((box?.y ?? 0) + (box?.height ?? 0), selector).toBeLessThanOrEqual(
        height,
      );
    }
    await expect(
      page.locator("[data-paper-band] [data-talk-stop]"),
    ).toBeVisible();
    await photo(page, "p13-talk-hint");
  });

  test("회화 화면: 그림 턴 그림이 깨지면 그리지 않고 그림 낱말(영어)이 글로 보이지 않는다", async ({
    context,
  }) => {
    const { page, card } = await openTalk(context, [saidRun("I'm good.")]);
    const first = await pastGreeting(page, card);
    await untilChildTurn(page);
    // 그림이 보이면 제대로 열린 그림이어야 하고(깨진 그림은 곧 접힌다), 대체 글이 있는 그림 · 그림 낱말 글은 없다
    await expect
      .poll(() =>
        page
          .locator("[data-turn-picture]")
          .evaluateAll(
            (els) =>
              els.filter((el) => (el as HTMLImageElement).naturalWidth === 0)
                .length,
          ),
      )
      .toBe(0);
    await expect(page.locator('main img:not([alt=""])')).toHaveCount(0);
    const text = await page.locator("main").innerText();
    for (const word of first.targets) expect(text).not.toContain(word);
    await photo(page, "p13-talk-picture");
  });
});

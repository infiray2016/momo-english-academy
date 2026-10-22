// 회화 1단계 인사 → 대화 e2e(plan-p13b 차례 5 — 증명 표 AC-15a · 15b · 15g · 15l · N8 · 8b 의 화면 몫, 4절 회화 세션 표 · 3.3 · 7절 · T2).
// 견본 수업(인사 → 대화 — 오늘 쓸 말 없음)을 시험이 넣고 진행 세션을 바로 연다. 회화 턴은 가짜 Anthropic SSE(talkReply), 듣기는 가짜 Web Speech
// 대본(턴마다 하나). 숫자(인식 확인 초 · 기다림 표시 초 · 천천히 빠르기)는 시험용 설정에서 읽는다. 차례 6 은 홈부터 · 처음 안내 · 오늘 쓸 말 ·
// 말해 보기 · 정리 · 마무리 세 장 · 그만하기 · 이어 하기 · 3단계 · 그림 · 마이크 · 안전 상한 둘(아래 describe 셋).
// 녹음하지 않는다(브라우저 인식만). 화면 검토 사진은 E2E_PHOTOS 때만(p13-talk-…).
import type { BrowserContext, Page } from "@playwright/test";
import { and, eq, max } from "drizzle-orm";
import { twoAnswersLine } from "../../src/core/ai/calls/talk";
import { MORE_PROMPT, practiceOrderOf } from "../../src/core/conversation/flow";
import { safeLineOf } from "../../src/core/conversation/stream";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
import type { TalkCard } from "../../src/core/seed/schema/talk";
import { LEVEL_MAX, PLACEHOLDER_NAME } from "../../src/core/seed/structure";
import { RESULT_PHRASES } from "../../src/core/speaking/judge";
import type { RecognitionRun } from "../../src/core/speech/script";
import {
  attempts,
  profiles,
  sessions,
  talkTurns as talkTurnRows,
} from "../../src/db/schema/learning";
import { parentAlerts, settings } from "../../src/db/schema/operations";
import { TEST_SETTINGS } from "../fixtures/settings";
import { addAccessCookie } from "./access-cookie";
import { CHILD_VIEWPORTS } from "./child-size";
import {
  closeE2eDb,
  countRows,
  e2eDb,
  resetHousehold,
  withHouseholdSetting,
} from "./db";
import { fakeAiRequests, pushFakeAi, resetFakeAi } from "./fake-ai";
import { expect, speechPage, test } from "./fixtures";
import { photo } from "./photos";
import {
  failingRun,
  fullTalkLesson,
  greetingToTalkLesson,
  insertTalkLesson,
  interruptedSpeech,
  meetSayWords,
  openTalkSession,
  reachSafetyCap,
  recordInterruptedSpeech,
  reinforceTalkLesson,
  saidRun,
  speechRecord,
  TURN_MARK,
  talkAnswer,
  talkHousehold,
  talkReply,
  talkScript,
} from "./talk";

const T = {
  start: "시작!",
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
  await pastStart(page);
  return { page, sessionId, profileId, card };
}

/** 열 때마다 '시작!' 한 번(첫 읽어 주기를 여는 누름 — 컨트롤러 결정) → 처음 마이크 안내(기기마다 한 번)면 '알겠어요'. */
async function pastStart(page: Page, { micNotice = true } = {}) {
  await expect(page.locator("[data-talk-start]")).toBeVisible();
  await page.getByRole("button", { name: T.start }).click();
  if (!micNotice) return;
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
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

/** 끝맺음 턴 요청의 사용자 메시지 줄(대화 기록에 앞 턴의 'Closing: no' 줄이 함께 들어 있어 회화 턴과 가른다). */
const CLOSING_MARK = "\\nClosing: yes";

/** 회화 턴 요청 수(끝맺음 턴 요청은 뺀다 — 그 본문의 대화 기록에도 TURN_MARK 가 있다, CI 10차). */
async function turnRequests(): Promise<number> {
  return (await fakeAiRequests()).filter(
    (r) => r.bodyText.includes(TURN_MARK) && !r.bodyText.includes(CLOSING_MARK),
  ).length;
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
    await page.getByRole("button", { name: T.hint, exact: true }).click();
    await expect(page.locator('[data-hint-tier="ko"]')).toHaveText(
      first.hintKo,
    );
    expect(await page.locator("main").innerText()).not.toContain(first.hintEn);
    await page.getByRole("button", { name: T.hint, exact: true }).click();
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
    await expect(
      page.getByRole("button", { name: T.hint, exact: true }),
    ).toBeDisabled();
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
    // 같은 문맥이라 처음 마이크 안내는 이미 봄 — 열 때마다 '시작!' 한 번
    await pastStart(second, { micNotice: false });
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
        await pastStart(page);
        await untilChildTurn(page);
        const card = (row.content as TalkLesson).card;
        if (!("questions" in card.greeting)) throw new Error("견본 꼴");
        const greeting = card.greeting.questions[0];
        if (!greeting?.frameEn) throw new Error("견본 꼴 — 3단계 영어 틀");
        // 뜻 → 영어 틀 → 영어 문장(3단계 세 단)
        for (let i = 0; i < 3; i++)
          await page.getByRole("button", { name: T.hint, exact: true }).click();
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
    const hint = page.getByRole("button", { name: T.hint, exact: true });
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

// ── 차례 6: 처음 안내 · 오늘 쓸 말 · 말해 보기 · 정리 · 마무리 세 장 · 그만하기 · 이어 하기 · 3단계 · 그림 · 마이크 · 안전 상한 ──

const F = {
  introMemory: "토리는 지난 이야기를 조금 기억해요",
  introParents: "토리와 나눈 이야기는 부모님도 볼 수 있어요",
  promise: "토리의 약속",
  followGuide: "토리를 따라 말해 봐요",
  practiceSee: "보고 말해 봐요",
  practiceMeaning: "뜻을 보고 영어로 말해 봐요",
  stopConfirm:
    "토리와 그만 이야기할까요? 지금 그만두면 이 이야기는 다음에 처음부터 해요",
  stopYes: "그만할래요",
  stop: "그만하기",
  next: "다음",
  nextStory: "다음 이야기",
  lessons: "수업 목록",
  home: "홈",
  aborted: "다음에 끝까지 이야기하면 별을 받아요",
  retried: "다시 했어요",
  resume: "하던 수업 이어 하기",
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  rest: "토리가 잠깐 쉬어요. 다른 공부를 해 볼까요",
  tomorrow: "내일",
} as const;
const AUTO_NEXT_MS = TEST_SETTINGS["ui.auto_next_seconds"].value * MS;
const MAX_RETRIES = TEST_SETTINGS["speech.max_retries"].value;
const ROUNDS = TEST_SETTINGS["talk.practice_rounds"].value;
const FRIENDSHIP_MAX = TEST_SETTINGS["talk.friendship_max"].value;
/** 긴 흐름 시험의 회화 듣기 끝 조용함(초, 시험 값 — 1~3단계 3초를 줄여 열네 턴을 빨리). */
const FAST_SILENCE_SECONDS = 0.3;
/** 1~3단계 회화 듣기 끝 조용함 키(그 시험 동안만 바꾼다). */
const TALK_SILENCE_KEY = "speech.end_silence_seconds.talk.1-3";
/** 홈부터 끝까지 한 시험 시간(시험 값 — 열다섯 턴 · 따라 말하기 열 번 · 마무리). */
const FULL = 300_000;

type Full = {
  profileId: string;
  sessionId: string;
  row: Awaited<ReturnType<typeof insertTalkLesson>>;
  card: TalkCard;
};

/** 다섯 토막 견본 수업과 진행 세션(쪽은 열지 않음). */
async function fullSession(
  level = 1,
  { kind }: { kind?: "regular" | "retry" } = {},
): Promise<Full> {
  const profileId = await talkHousehold(level);
  const row = await insertTalkLesson({ level, lesson: fullTalkLesson(level) });
  const sessionId = await openTalkSession(profileId, row, kind ? { kind } : {});
  return { profileId, sessionId, row, card: (row.content as TalkLesson).card };
}

/** 말해 보기 예문(C97 — 예문 뜻이 있는 것)과 바퀴마다 차례(서버와 같은 함수 — 세션 id 로 섞음). */
function practiceOf(card: TalkCard, sessionId: string) {
  const items = card.todayWords.filter((w) => w.exampleKo !== undefined);
  return { items, order: practiceOrderOf(sessionId, items.length, ROUNDS) };
}

/** 예문 모두를 한 번에 말한 글(덧붙인 말은 감점하지 않음 — 차례를 몰라도 어느 예문이든 맞음). */
function allExamples(card: TalkCard): string {
  return card.todayWords.map((w) => w.example).join(" ");
}

/** 정리 되짚을 말(대화에 되풀이 문장이 없음 — 카드 정리 대사, 1~3단계 뜻 함께). */
function wrapLineOf(card: TalkCard) {
  const line = card.closingLines[0];
  if (!line) throw new Error("견본 꼴 — 정리 대사");
  return line;
}

const followStep = (page: Page, step: string) =>
  page.locator(`[data-follow-step="${step}"]`);

/** 따라 말하기 한 차례: 그 차례 카드가 보이면 '말하기'를 누르고 결과 말을 기다린다. */
async function followOnce(page: Page, step: string) {
  await expect(followStep(page, step)).toBeVisible();
  await page.locator("[data-follow] [data-speak]").click();
  await expect(page.locator("[data-follow-result]")).toBeVisible();
}

/** 오늘 쓸 말(단어마다) → 말해 보기(바퀴마다) — 차례 이름은 화면의 data-follow-step. */
async function pastFollow(
  page: Page,
  card: TalkCard,
  order: number[][],
  onStep?: (step: string) => Promise<void>,
) {
  for (let i = 0; i < card.todayWords.length; i++) {
    const step = `today_words:0:${i}`;
    await expect(followStep(page, step)).toBeVisible();
    await onStep?.(step);
    await followOnce(page, step);
  }
  for (let r = 0; r < order.length; r++)
    for (const i of order[r] ?? []) {
      const step = `practice:${r}:${i}`;
      await expect(followStep(page, step)).toBeVisible();
      await onStep?.(step);
      await followOnce(page, step);
    }
}

/**
 * 대화 턴 n 번: 말하고 인식 확인에서 '보내기'(들은 답과 다른 말 — 확인이 보인다). waitConfirm 이면 누르지 않고 talk.confirm_seconds
 * 뒤 저절로 보내지기를 기다린다(그 시험이 확인 시간을 줄였을 때 — 누름과 저절로 보냄이 겨루지 않게).
 */
async function talkTurns(
  page: Page,
  n: number,
  { waitConfirm = false }: { waitConfirm?: boolean } = {},
) {
  for (let i = 0; i < n; i++) {
    const before = await turnRequests();
    await untilChildTurn(page);
    await page.locator("[data-child-turn] [data-speak]").click();
    if (!waitConfirm)
      await page
        .locator("[data-child-confirm]")
        .getByRole("button", { name: T.send })
        .click();
    await expect.poll(turnRequests).toBe(before + 1);
  }
}

/** 긴 흐름 시험의 인식 확인 시간(초, 시험 값 — talk.confirm_seconds 2초를 줄여 턴마다 아낌). */
const FAST_CONFIRM_SECONDS = 0.2;
const CONFIRM_KEY = "talk.confirm_seconds";

/** 그 시험 동안만 듣기 끝 조용함 · 인식 확인 시간을 줄인다(긴 흐름 — 턴마다 약 4.5초 아낌). 턴은 talkTurns(…, AUTO_SEND). */
async function withFastTurns(fn: () => Promise<void>): Promise<void> {
  await withHouseholdSetting(TALK_SILENCE_KEY, FAST_SILENCE_SECONDS, () =>
    withHouseholdSetting(CONFIRM_KEY, FAST_CONFIRM_SECONDS, fn),
  );
}
const AUTO_SEND = { waitConfirm: true } as const;

/** 정리: 되짚을 말을 따라 말하고(1~3단계) 끝인사 뒤 마무리 첫 장. */
async function pastWrap(page: Page, card: TalkCard) {
  const line = wrapLineOf(card);
  await expect(page.locator("[data-talk-wrap]")).toBeVisible();
  await expect(bubble(page)).toContainText(line.en);
  if (line.ko) await expect(page.locator("[data-tori-ko]")).toHaveText(line.ko);
  await page.locator("[data-talk-wrap] [data-speak]").click();
  await expect(page.locator("[data-follow-result]")).toBeVisible();
  await expect(bubble(page)).toContainText(card.farewell.en);
  await expect(page.locator('[data-closing-card="1"]')).toBeVisible({
    timeout: STREAM_END_MS,
  });
}

test.describe("회화 1단계 홈부터 끝까지(차례 6)", () => {
  test.setTimeout(FULL);

  test("AC-15a 회화 1단계 수업은 인사 → 오늘 쓸 말 → 말해 보기 → 대화 → 정리 순서로 이어지고 대화 토막의 아이 차례에 영어 문장이 보이지 않는다", async ({
    context,
  }) => {
    await withHouseholdSetting(
      TALK_SILENCE_KEY,
      FAST_SILENCE_SECONDS,
      async () => {
        const profileId = await talkHousehold(1);
        const row = await insertTalkLesson({
          level: 1,
          lesson: fullTalkLesson(1),
        });
        const second = await insertTalkLesson({
          level: 1,
          lesson: fullTalkLesson(1, { lessonNo: 2 }),
        });
        const card = (row.content as TalkLesson).card;
        const items = card.todayWords.filter((w) => w.exampleKo !== undefined);
        const dialogue = (card.turns?.length ?? 0) as number;
        expect(dialogue).toBeGreaterThan(0);
        const line = wrapLineOf(card);
        const page = await speechPage(
          context,
          talkScript([
            saidRun("I'm good."),
            ...card.todayWords.map((w) => saidRun(w.word)),
            ...Array.from({ length: items.length * ROUNDS }, () =>
              saidRun(allExamples(card)),
            ),
            ...Array.from({ length: dialogue }, () => saidRun("I like it.")),
            saidRun(line.en),
          ]),
        );
        // 홈 카드 → 회화 수업 목록 → '여기부터 해요' 수업
        await page.goto("/");
        const talkCard = page
          .locator("a")
          .filter({ has: page.locator('[data-home-card="talk"]') });
        // 회화 카드도 수업 목록으로(값 12 — '/talk' 는 지움)
        await expect(talkCard).toHaveAttribute("href", "/talk/lessons");
        await talkCard.click();
        await expect(page).toHaveURL(/\/talk\/lessons$/);
        await expect(
          page.locator("[data-lesson-board][data-hydrated]"),
        ).toHaveCount(1);
        await page.locator('[data-lesson="assigned-1"]').click();
        await expect(page).toHaveURL(/\/session\//);
        // 처음 회화 안내 → '시작!' → 처음 마이크 안내
        await expect(page.locator("[data-talk-intro]")).toContainText(
          F.introMemory,
        );
        await pastStart(page);
        // 인사(답 두 개의 첫째 — 바로 보냄)
        await pushFakeAi([
          talkReply({ tori_en: "Great! Let's learn today's words." }),
          ...Array.from({ length: dialogue }, () =>
            talkReply({ tori_en: "Nice!" }),
          ),
        ]);
        await speak(page);
        // 오늘 쓸 말 → 말해 보기(차례는 화면이 정함 — 세션 id 를 모르므로 예문 모두를 한 번에 말함)
        await expect(page.locator('[data-follow="today_words"]')).toBeVisible();
        for (const word of card.todayWords) {
          await expect(page.locator("[data-follow-word]")).toHaveText(
            word.word,
          );
          await page.locator("[data-follow] [data-speak]").click();
          await expect(page.locator("[data-follow-result]")).toBeVisible();
        }
        for (let n = 0; n < items.length * ROUNDS; n++) {
          await expect(page.locator('[data-follow="practice"]')).toBeVisible();
          const step = await page
            .locator("[data-follow-step]")
            .getAttribute("data-follow-step");
          await page.locator("[data-follow] [data-speak]").click();
          await expect(page.locator("[data-follow-result]")).toBeVisible();
          // 다음 차례로 넘어갈 때까지
          if (n < items.length * ROUNDS - 1)
            await expect(
              page.locator(`[data-follow-step="${step}"]`),
            ).toHaveCount(0, { timeout: AUTO_NEXT_MS + STREAM_END_MS });
        }
        // 대화: 첫 질문은 앱이 붙임 — 아이 차례에 힌트 · 답 영어 글이 없다(T2)
        const first = card.turns?.[0];
        if (!first?.twoAnswers) throw new Error("견본 꼴");
        await expect(bubble(page)).toContainText(first.question.en, {
          timeout: STREAM_END_MS,
        });
        await untilChildTurn(page);
        const talkText = await page.locator("main").innerText();
        expect(talkText).not.toContain(first.hintEn);
        for (const answer of first.twoAnswers)
          expect(talkText).not.toContain(answer);
        await talkTurns(page, dialogue);
        // 목표 턴: '더 이야기하기' · '그만하기' → 그만하기 → 정리 → 마무리
        await expect(page.locator("[data-talk-choice]")).toBeVisible({
          timeout: STREAM_END_MS,
        });
        await page
          .locator("[data-talk-choice]")
          .getByRole("button", { name: F.stop })
          .click();
        await pastWrap(page, card);
        const closingFirst = await page
          .locator('[data-closing-card="1"]')
          .innerText();
        expect(closingFirst).not.toContain(F.aborted);
        expect(closingFirst).not.toContain(card.farewell.en);
        for (const word of card.todayWords)
          await expect(
            page.locator(`[data-closing-word="${word.word}"]`),
          ).toBeVisible();
        await photo(page, "p13-talk-closing-1");
        await page.getByRole("button", { name: F.next, exact: true }).click();
        // 1~3단계는 둘째 장 없이 셋째 장(친한 정도 막대 · 다음 이야기)
        const third = page.locator('[data-closing-card="3"]');
        await expect(third).toBeVisible();
        await expect(page.locator('[data-closing-card="2"]')).toHaveCount(0);
        await expect(third.locator("[data-friendship-cell]")).toHaveCount(
          FRIENDSHIP_MAX,
        );
        await expect(
          third.locator("[data-friendship-cell][data-on]"),
        ).toHaveCount(TEST_SETTINGS["talk.friendship_per_talk"].value);
        await expect(page.locator("[data-next-story]")).toContainText(
          second.listTitle,
        );
        await expect(
          page.getByRole("button", { name: F.next, exact: true }),
        ).toHaveCount(0);
        const thirdText = await third.innerText();
        expect(thirdText).not.toContain(F.tomorrow);
        expect(thirdText).not.toContain("%");
        // 숫자는 다음 이야기 제목(시드 글)에만 — 친한 정도에 수를 쓰지 않는다
        expect(thirdText.replace(second.listTitle, "")).not.toMatch(/\d/);
        await photo(page, "p13-talk-closing-3");
        // '다음 이야기' → 그 수업 세션('시작!' 한 번 — 안내 글은 처음에만)
        const url = page.url();
        await page.getByRole("button", { name: F.nextStory }).click();
        await expect.poll(() => page.url()).not.toBe(url);
        await expect(page).toHaveURL(/\/session\//);
        await expect(page.locator("[data-talk-start]")).toBeVisible();
        await expect(page.locator("[data-talk-intro]")).toHaveCount(0);
        expect(
          await countRows(sessions, eq(sessions.profileId, profileId)),
        ).toBe(2);
      },
    );
  });
});

test.describe("회화 1단계 처음 안내 · 오늘 쓸 말 · 말해 보기 · 정리 · 마무리(차례 6)", () => {
  test.setTimeout(LONG);

  test("AC-16c 처음 회화를 열면 '토리는 지난 이야기를 조금 기억해요'와 '토리와 나눈 이야기는 부모님도 볼 수 있어요'가 든 안내가 보이고 회화 화면 아래에 '토리의 약속' 한 줄이 늘 보인다", async ({
    context,
  }) => {
    const { sessionId, profileId } = await fullSession();
    const page = await speechPage(context, talkScript([]));
    await page.goto(`/session/${sessionId}`);
    const intro = page.locator("[data-talk-intro]");
    await expect(intro).toContainText(F.introMemory);
    await expect(intro).toContainText(F.introParents);
    await expect(page.locator("[data-tori-promise]")).toContainText(F.promise);
    await photo(page, "p13-talk-intro");
    await pastStart(page);
    await expect(page.locator("[data-tori-promise]")).toContainText(F.promise);
    // 안내는 프로필마다 한 번(다른 기기에서도) — 다시 열면 '시작!'만(열 때마다 한 번, 컨트롤러 결정)
    await expect
      .poll(async () => {
        const [row] = await e2eDb()
          .select({ seen: profiles.noticesSeen })
          .from(profiles)
          .where(eq(profiles.id, profileId));
        return Object.keys((row?.seen ?? {}) as object);
      })
      .toContain("talk_intro");
    await page.reload();
    await expect(page.locator("[data-talk-start]")).toBeVisible();
    await expect(page.locator("[data-talk-intro]")).toHaveCount(0);
    await expect(page.locator("[data-tori-promise]")).toContainText(F.promise);
  });

  test("AC-15g 회화 오늘 쓸 말은 새 단어마다 단어 · 한국어 뜻 · 예문을 보이고 1~3단계는 단어를 따라 말하며 결과 말을 ui.auto_next_seconds 보인 뒤 다음 단어로 넘어가고 인식이 speech.max_retries 번 실패한 단어는 건너뛴다", async ({
    context,
  }) => {
    const { sessionId, card } = await fullSession();
    const [w0, w1] = card.todayWords;
    if (!w0 || !w1) throw new Error("견본 꼴 — 오늘 쓸 말 둘");
    const page = await speechPage(
      context,
      talkScript([
        saidRun("I'm good."),
        saidRun(w0.word),
        ...Array.from({ length: MAX_RETRIES }, () => failingRun("no-speech")),
      ]),
    );
    await page.goto(`/session/${sessionId}`);
    await pastStart(page);
    await pushFakeAi([talkReply({ tori_en: "Great! Let's learn words." })]);
    await speak(page);
    const today = page.locator('[data-follow="today_words"]');
    await expect(today).toBeVisible();
    await expect(today).toContainText(F.followGuide);
    await expect(page.locator("[data-follow-word]")).toHaveText(w0.word);
    await expect(page.locator("[data-follow-meaning]")).toHaveText(
      w0.meaningKo,
    );
    await expect(page.locator("[data-follow-example]")).toHaveText(w0.example);
    // 들어올 때 토리가 단어 → 예문을 읽는다
    await expect
      .poll(async () => (await speechRecord(page)).spoken)
      .toEqual(expect.arrayContaining([w0.word, w0.example]));
    await photo(page, "p13-talk-today-words");
    await page.locator("[data-follow] [data-speak]").click();
    await expect(page.locator("[data-follow-result]")).toHaveText(
      RESULT_PHRASES.good,
    );
    // 결과 말을 ui.auto_next_seconds 보인 뒤 저절로 다음 단어
    await expect(page.locator("[data-follow-word]")).toHaveText(w1.word, {
      timeout: AUTO_NEXT_MS + STREAM_END_MS,
    });
    // 인식 실패 speech.max_retries 번이면 건너뜀(다음 토막 — 말해 보기)
    const second = followStep(page, "today_words:0:1");
    for (let i = 0; i < MAX_RETRIES; i++) {
      await page.locator("[data-follow] [data-speak]").click();
      if (i < MAX_RETRIES - 1)
        await expect(second).toHaveAttribute(
          "data-follow-failures",
          String(i + 1),
        );
    }
    await expect(page.locator('[data-follow="practice"]')).toBeVisible({
      timeout: AUTO_NEXT_MS + STREAM_END_MS,
    });
    // 저장: 두 단어 차례가 attempts 에(건너뜀은 skipped)
    await expect
      .poll(async () =>
        (
          await e2eDb()
            .select({ input: attempts.input })
            .from(attempts)
            .where(eq(attempts.sessionId, sessionId))
        )
          .map((r) => r.input as { kind?: string; skipped?: string })
          .filter((i) => i.kind === "talk-today")
          .map((i) => i.skipped ?? "said")
          .sort(),
      )
      .toEqual(["recognition", "said"]);
  });

  test("AC-15a 회화 1단계 말해 보기는 첫 바퀴를 예문 모두에 한 뒤 둘째 바퀴를 다른 순서로 하고 둘째 바퀴 일치율이 talk.hint_read_match 아래이면 영어 문장이 보이고 들린다", async ({
    context,
  }) => {
    const { sessionId, card } = await fullSession();
    const { items, order } = practiceOf(card, sessionId);
    expect(order).toHaveLength(ROUNDS);
    const wrongAt = order[1]?.[0];
    if (wrongAt === undefined) throw new Error("견본 꼴 — 둘째 바퀴");
    const runs: RecognitionRun[] = [
      saidRun("I'm good."),
      ...card.todayWords.map((w) => saidRun(w.word)),
    ];
    for (const [r, round] of order.entries())
      for (const [k, i] of round.entries())
        runs.push(
          saidRun(
            r === 1 && k === 0 ? "zebra moon" : (items[i]?.example ?? ""),
          ),
        );
    const page = await speechPage(context, talkScript(runs));
    await page.goto(`/session/${sessionId}`);
    await pastStart(page);
    await pushFakeAi([talkReply({ tori_en: "Great! Let's learn words." })]);
    await speak(page);
    for (let i = 0; i < card.todayWords.length; i++)
      await followOnce(page, `today_words:0:${i}`);
    // 첫 바퀴: 영어와 뜻 · '보고 말해 봐요'(카드 차례)
    for (const i of order[0] ?? []) {
      const step = `practice:0:${i}`;
      await expect(followStep(page, step)).toBeVisible({
        timeout: AUTO_NEXT_MS + STREAM_END_MS,
      });
      const item = items[i];
      if (!item) throw new Error("견본 꼴");
      await expect(followStep(page, step)).toContainText(F.practiceSee);
      await expect(page.locator("[data-follow-example]")).toHaveText(
        item.example,
      );
      await expect(page.locator("[data-follow-meaning]")).toHaveText(
        item.exampleKo ?? "",
      );
      if (i === order[0]?.[0]) await photo(page, "p13-talk-say-it");
      await followOnce(page, step);
    }
    // 둘째 바퀴: 다른 차례 · 뜻만 · '뜻을 보고 영어로 말해 봐요'
    expect(order[1]).not.toEqual(order[0]);
    const firstStep = `practice:1:${wrongAt}`;
    await expect(followStep(page, firstStep)).toBeVisible({
      timeout: AUTO_NEXT_MS + STREAM_END_MS,
    });
    await expect(followStep(page, firstStep)).toContainText(F.practiceMeaning);
    await expect(page.locator("[data-follow-example]")).toHaveCount(0);
    const wrong = items[wrongAt];
    if (!wrong) throw new Error("견본 꼴");
    expect(await page.locator("main").innerText()).not.toContain(wrong.example);
    // 맞지 않으면(일치율 < talk.hint_read_match) 영어 문장을 보이고 들려준다
    await page.locator("[data-follow] [data-speak]").click();
    await expect(page.locator("[data-follow-reveal]")).toHaveText(
      wrong.example,
    );
    await expect
      .poll(async () => (await speechRecord(page)).spoken.at(-1))
      .toBe(wrong.example);
    await photo(page, "p13-talk-say-it-reveal");
    for (const i of (order[1] ?? []).slice(1))
      await followOnce(page, `practice:1:${i}`);
    // 말해 보기 뒤 대화 첫 질문(앱이 붙임 — AI 없음)
    await expect(bubble(page)).toContainText(
      card.turns?.[0]?.question.en ?? "?",
      {
        timeout: STREAM_END_MS,
      },
    );
    expect(await turnRequests()).toBe(1);
  });

  test("AC-15f 목표 턴 전에 '그만하기'를 누르면 '토리와 그만 이야기할까요? 지금 그만두면 이 이야기는 다음에 처음부터 해요'를 묻고 그만두면 마무리 첫 장에 '다음에 끝까지 이야기하면 별을 받아요'가 보인다", async ({
    context,
  }) => {
    const { sessionId, card } = await fullSession();
    const { order } = practiceOf(card, sessionId);
    const page = await speechPage(
      context,
      talkScript([
        saidRun("I'm good."),
        ...card.todayWords.map((w) => saidRun(w.word)),
        ...order.flat().map(() => saidRun(allExamples(card))),
        saidRun(wrapLineOf(card).en),
      ]),
    );
    await page.goto(`/session/${sessionId}`);
    await pastStart(page);
    await pushFakeAi([talkReply({ tori_en: "Great! Let's learn words." })]);
    await speak(page);
    await pastFollow(page, card, order);
    await untilChildTurn(page);
    const requests = await turnRequests();
    await page.locator("[data-paper-band] [data-talk-stop]").click();
    await expect(page.getByText(F.stopConfirm)).toBeVisible();
    await photo(page, "p13-talk-stop-confirm");
    await page.getByRole("button", { name: F.stopYes }).click();
    // AI 응답을 기다리지 않고 정리(되짚을 말 · 뜻 · 따라 말하기) → 끝인사 → 마무리 첫 장
    await pastWrap(page, card);
    expect(await turnRequests()).toBe(requests);
    const first = page.locator('[data-closing-card="1"]');
    await expect(first).toContainText(F.aborted);
    expect(await first.innerText()).not.toContain(card.farewell.en);
    expect((await sessionOf(sessionId))?.status).toBe("aborted");
  });

  test("AC-15a '그만하기'를 누르면 AI 응답을 기다리지 않고 토리가 오늘 쓴 말을 되짚고 아이가 따라 말한 뒤 마무리 화면으로 간다", async ({
    context,
  }) => {
    const { sessionId, card } = await fullSession();
    const { order } = practiceOf(card, sessionId);
    const line = wrapLineOf(card);
    const page = await speechPage(
      context,
      talkScript([
        saidRun("I'm good."),
        ...card.todayWords.map((w) => saidRun(w.word)),
        ...order.flat().map(() => saidRun(allExamples(card))),
        saidRun(line.en),
      ]),
    );
    await page.goto(`/session/${sessionId}`);
    await pastStart(page);
    await pushFakeAi([talkReply({ tori_en: "Great! Let's learn words." })]);
    await speak(page);
    await pastFollow(page, card, order);
    await untilChildTurn(page);
    await page.locator("[data-paper-band] [data-talk-stop]").click();
    await page.getByRole("button", { name: F.stopYes }).click();
    await expect(page.locator("[data-talk-wrap]")).toBeVisible();
    await expect(bubble(page)).toContainText(line.en);
    await expect
      .poll(async () => (await speechRecord(page)).spoken)
      .toContain(line.en);
    await photo(page, "p13-talk-wrapup");
    await page.locator("[data-talk-wrap] [data-speak]").click();
    await expect(page.locator("[data-follow-result]")).toBeVisible();
    await expect(page.locator('[data-closing-card="1"]')).toBeVisible({
      timeout: STREAM_END_MS,
    });
    // 정리 따라 말하기는 attempts 에 남는다(점수 · '말했다' 없음)
    await expect
      .poll(
        async () =>
          (
            await e2eDb()
              .select({ input: attempts.input })
              .from(attempts)
              .where(eq(attempts.sessionId, sessionId))
          ).filter((r) => (r.input as { kind?: string }).kind === "talk-wrapup")
            .length,
      )
      .toBe(1);
  });

  test("AC-15g 대화에서 나오지 않은 새 단어는 마무리 첫 장에 듣기 버튼과 함께 보인다", async ({
    context,
  }) => {
    const { sessionId, card } = await fullSession();
    const { order } = practiceOf(card, sessionId);
    const page = await speechPage(
      context,
      talkScript([
        saidRun("I'm good."),
        ...card.todayWords.map((w) => saidRun(w.word)),
        ...order.flat().map(() => saidRun(allExamples(card))),
        saidRun(wrapLineOf(card).en),
      ]),
    );
    await page.goto(`/session/${sessionId}`);
    await pastStart(page);
    await pushFakeAi([talkReply({ tori_en: "Great! Let's learn words." })]);
    await speak(page);
    await pastFollow(page, card, order);
    await untilChildTurn(page);
    await page.locator("[data-paper-band] [data-talk-stop]").click();
    await page.getByRole("button", { name: F.stopYes }).click();
    await pastWrap(page, card);
    // 대화 첫 질문의 답 두 개에 나온 단어(첫 묻는 턴 목표)는 듣기 단추가 없고, 대화에 안 나온 단어는 있다
    const first = card.turns?.[0];
    if (!first) throw new Error("견본 꼴");
    const inTalk = new Set(first.targets);
    for (const word of card.todayWords) {
      const listen = page.locator(
        `[data-closing-word="${word.word}"] [data-word-listen]`,
      );
      await expect(listen).toHaveCount(inTalk.has(word.word) ? 0 : 1);
    }
    const quiet = card.todayWords.find((w) => !inTalk.has(w.word));
    if (!quiet) throw new Error("견본 꼴 — 대화에 안 나온 단어");
    await page
      .locator(`[data-closing-word="${quiet.word}"] [data-word-listen]`)
      .click();
    await expect
      .poll(async () => (await speechRecord(page)).spoken.at(-1))
      .toBe(quiet.word);
  });

  test("AC-15e 회화 마무리는 장마다 '다음' 버튼으로 넘어가고 1~3단계는 둘째 장 없이 셋째 장으로 가며 셋째 장에는 '다음' 버튼이 없고 '다음 이야기'(큰) · '홈'(작은)이 있다", async ({
    context,
  }) => {
    const { sessionId, card } = await fullSession();
    const { order } = practiceOf(card, sessionId);
    const page = await speechPage(
      context,
      talkScript([
        saidRun("I'm good."),
        ...card.todayWords.map((w) => saidRun(w.word)),
        ...order.flat().map(() => saidRun(allExamples(card))),
        saidRun(wrapLineOf(card).en),
      ]),
    );
    await page.goto(`/session/${sessionId}`);
    await pastStart(page);
    await pushFakeAi([talkReply({ tori_en: "Great! Let's learn words." })]);
    await speak(page);
    await pastFollow(page, card, order);
    await untilChildTurn(page);
    await page.locator("[data-paper-band] [data-talk-stop]").click();
    await page.getByRole("button", { name: F.stopYes }).click();
    await pastWrap(page, card);
    await page.getByRole("button", { name: F.next, exact: true }).click();
    const third = page.locator('[data-closing-card="3"]');
    await expect(third).toBeVisible();
    await expect(
      page.getByRole("button", { name: F.next, exact: true }),
    ).toHaveCount(0);
    const big = third.getByRole("button", { name: F.nextStory });
    const small = third.getByRole("button", { name: F.home, exact: true });
    await expect(big).toBeVisible();
    await expect(small).toBeVisible();
    const [bigBox, smallBox] = [
      await big.boundingBox(),
      await small.boundingBox(),
    ];
    expect((bigBox?.height ?? 0) * (bigBox?.width ?? 0)).toBeGreaterThan(
      (smallBox?.height ?? 0) * (smallBox?.width ?? 0),
    );
    await small.click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("AC-15e 끝인사는 정리 토막에서 한 번만 나오고 마무리 첫 장에는 없으며 끝인사와 다음 이야기에 '내일'이 없고 다음 이야기는 수업 목록의 '여기부터 해요' 회화 수업 주제와 같다", async ({
    context,
  }) => {
    const { sessionId, card, row } = await fullSession();
    const { order } = practiceOf(card, sessionId);
    const page = await speechPage(
      context,
      talkScript([
        saidRun("I'm good."),
        ...card.todayWords.map((w) => saidRun(w.word)),
        ...order.flat().map(() => saidRun(allExamples(card))),
        saidRun(wrapLineOf(card).en),
      ]),
    );
    await page.goto(`/session/${sessionId}`);
    await pastStart(page);
    await pushFakeAi([talkReply({ tori_en: "Great! Let's learn words." })]);
    await speak(page);
    await pastFollow(page, card, order);
    await untilChildTurn(page);
    await page.locator("[data-paper-band] [data-talk-stop]").click();
    await page.getByRole("button", { name: F.stopYes }).click();
    await pastWrap(page, card);
    const spoken = (await speechRecord(page)).spoken;
    expect(spoken.filter((t) => t === card.farewell.en)).toHaveLength(1);
    expect(card.farewell.en).not.toContain(F.tomorrow);
    expect(
      await page.locator('[data-closing-card="1"]').innerText(),
    ).not.toContain(card.farewell.en);
    await page.getByRole("button", { name: F.next, exact: true }).click();
    const story = page.locator("[data-next-story]");
    await expect(story).toBeVisible();
    expect(await story.innerText()).not.toContain(F.tomorrow);
    // 목표 턴 전 그만둔 수업은 끝내지 않은 수업 — 목록의 '여기부터 해요'는 그 수업 그대로
    await expect(story).toContainText(row.listTitle);
    await page.goto("/talk/lessons");
    await expect(
      page.locator("[data-lesson-board][data-hydrated]"),
    ).toHaveCount(1);
    await expect(page.locator('[data-lesson="assigned-1"]')).toContainText(
      row.listTitle,
    );
  });

  test("AC-15e 다시 하기로 한 대화의 첫 장에는 '다시 했어요'가 보이고 친한 정도 막대가 없다", async ({
    context,
  }) => {
    const { sessionId, card } = await fullSession(1, { kind: "retry" });
    const { order } = practiceOf(card, sessionId);
    const page = await speechPage(
      context,
      talkScript([
        saidRun("I'm good."),
        ...card.todayWords.map((w) => saidRun(w.word)),
        ...order.flat().map(() => saidRun(allExamples(card))),
        saidRun(wrapLineOf(card).en),
      ]),
    );
    await page.goto(`/session/${sessionId}`);
    await pastStart(page);
    await pushFakeAi([talkReply({ tori_en: "Great! Let's learn words." })]);
    await speak(page);
    await pastFollow(page, card, order);
    await untilChildTurn(page);
    await page.locator("[data-paper-band] [data-talk-stop]").click();
    await page.getByRole("button", { name: F.stopYes }).click();
    await pastWrap(page, card);
    const first = page.locator('[data-closing-card="1"]');
    await expect(first).toContainText(F.retried);
    await expect(first).not.toContainText(F.aborted);
    await page.getByRole("button", { name: F.next, exact: true }).click();
    await expect(page.locator('[data-closing-card="3"]')).toBeVisible();
    await expect(page.locator("[data-friendship]")).toHaveCount(0);
  });
});

test.describe("회화 이어 하기 · 3단계 · 그림 · 마이크 · 안전 상한(차례 6)", () => {
  test.setTimeout(LONG);

  test("AC-15f 목표 턴 전에 회화 화면에서 '홈'을 누르면 확인 없이 홈으로 가고 다시 열면 '하던 수업 이어 하기'로 토리의 마지막 질문부터 이어진다", async ({
    context,
  }) => {
    const { page, card, sessionId } = await openTalk(context, [
      saidRun("I'm good."),
    ]);
    const first = await pastGreeting(page, card);
    await untilChildTurn(page);
    const requests = await turnRequests();
    await page.getByRole("button", { name: F.home, exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    expect((await sessionOf(sessionId))?.status).toBe("in_progress");
    await page.goto("/talk/lessons");
    await expect(
      page.locator("[data-lesson-board][data-hydrated]"),
    ).toHaveCount(1);
    const resume = page.locator('[data-top-item="resume"]');
    await expect(resume).toContainText(F.resume);
    await resume.click();
    await expect(page).toHaveURL(new RegExp(`/session/${sessionId}$`));
    // 같은 기기 — 처음 마이크 안내는 이미 봄, '시작!' 한 번
    await pastStart(page, { micNotice: false });
    await expect(bubble(page)).toContainText(first.question.en);
    // 1~3단계 토리 반응 뜻(C103 — 저장한 tori_ko)
    await expect(page.locator("[data-tori-ko]")).toContainText(
      talkAnswer().tori_ko,
    );
    await untilChildTurn(page);
    await photo(page, "p13-talk-resume");
    expect(await turnRequests()).toBe(requests);
  });

  test("AC-15p 회화 3단계 대화 턴에서 '힌트'를 누르면 한국어 뜻 → 영어 틀 → 영어 문장 순으로 열린다", async ({
    context,
  }) => {
    await withHouseholdSetting(
      "seed.complete_through_level",
      LEVEL_MAX,
      async () => {
        const profileId = await talkHousehold(3);
        const row = await insertTalkLesson({ level: 3 });
        const sessionId = await openTalkSession(profileId, row);
        const card = (row.content as TalkLesson).card;
        const page = await speechPage(
          context,
          talkScript([saidRun("I'm good.")]),
        );
        await page.goto(`/session/${sessionId}`);
        await pastStart(page);
        const turn = await pastGreeting(page, card);
        if (!turn.frameEn) throw new Error("견본 꼴 — 3단계 영어 틀");
        await untilChildTurn(page);
        const hint = page.getByRole("button", { name: T.hint, exact: true });
        await hint.click();
        await expect(page.locator("[data-hint-tier]")).toHaveCount(1);
        await expect(page.locator('[data-hint-tier="ko"]')).toHaveText(
          turn.hintKo,
        );
        expect(await page.locator("main").innerText()).not.toContain(
          turn.hintEn,
        );
        await hint.click();
        await expect(page.locator('[data-hint-tier="frame"]')).toContainText(
          turn.frameEn,
        );
        expect(await page.locator("main").innerText()).not.toContain(
          turn.hintEn,
        );
        await hint.click();
        await expect(page.locator('[data-hint-tier="sentence"]')).toContainText(
          turn.hintEn,
        );
        await expect(page.locator("[data-hint-tier]")).toHaveCount(3);
        await expect(hint).toBeDisabled();
      },
    );
  });

  test("AC-15p 1단계 카드 턴에 그림 키가 있으면 토리 말풍선 옆에 그림이 크게 보이고 글은 보이지 않는다", async ({
    context,
  }) => {
    const profileId = await talkHousehold(1);
    const row = await insertTalkLesson({ level: 1 });
    const sessionId = await openTalkSession(profileId, row);
    const card = (row.content as TalkLesson).card;
    const first = card.turns?.[0];
    if (!first?.imageKey) throw new Error("견본 꼴 — 그림 턴");
    const page = await speechPage(context, talkScript([saidRun("I'm good.")]));
    // 시험용 시드의 그림 파일은 없다 — 그 그림 주소에 작은 PNG 를 준다(그림이 열리는 길)
    await page.route("**/images/**", (route) =>
      route.fulfill({ contentType: "image/png", body: TINY_PNG }),
    );
    await page.goto(`/session/${sessionId}`);
    await pastStart(page);
    await pastGreeting(page, card);
    await untilChildTurn(page);
    const picture = page.locator("[data-turn-picture]");
    await expect(picture).toBeVisible();
    await expect
      .poll(() =>
        picture.evaluate((el) => (el as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    const box = await picture.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(PICTURE_MIN_PX);
    await expect(picture).toHaveAttribute("alt", "");
    const text = await page.locator("main").innerText();
    for (const word of first.targets) expect(text).not.toContain(word);
  });

  test("AC-5c 회화 세션 도중 마이크 권한을 거두면 세션이 진행으로 남고 '마이크가 필요해요. 부모님께 말해 주세요'와 '홈'이 보인다", async ({
    context,
  }) => {
    const { page, sessionId, profileId } = await openTalk(context, [
      failingRun("not-allowed", 50),
    ]);
    await untilChildTurn(page);
    await page.locator("[data-child-turn] [data-speak]").click();
    await expect(page.getByText(F.needsMic)).toBeVisible();
    await expect(
      page
        .locator("[data-blocked]")
        .getByRole("button", { name: F.home, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: F.home, exact: true }),
    ).toHaveCount(1);
    await photo(page, "p13-talk-needs-mic");
    expect((await sessionOf(sessionId))?.status).toBe("in_progress");
    await expect
      .poll(async () =>
        (
          await e2eDb()
            .select({ kind: parentAlerts.kind })
            .from(parentAlerts)
            .where(eq(parentAlerts.profileId, profileId))
        ).map((r) => r.kind),
      )
      .toContain("mic_unavailable");
    await page.getByRole("button", { name: F.home, exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    expect((await sessionOf(sessionId))?.status).toBe("in_progress");
  });

  test("1-가 안전 상한(회화): 상한 날 회화 수업을 고르면 '토리가 잠깐 쉬어요. 다른 공부를 해 볼까요'와 '홈'이 보인다", async ({
    page,
  }) => {
    const profileId = await talkHousehold(1);
    await insertTalkLesson({ level: 1 });
    await reachSafetyCap(profileId);
    await page.goto("/talk/lessons");
    await expect(
      page.locator("[data-lesson-board][data-hydrated]"),
    ).toHaveCount(1);
    await page.locator('[data-lesson="assigned-1"]').click();
    await expect(page.getByText(F.rest)).toBeVisible();
    await expect(
      page
        .locator("[data-ai-rest]")
        .getByRole("link", { name: F.home, exact: true }),
    ).toBeVisible();
    expect(await countRows(sessions, eq(sessions.profileId, profileId))).toBe(
      0,
    );
    expect(await turnRequests()).toBe(0);
  });

  test("AC-15j 대화 안전 상한에 닿으면 끝인사 뒤 수업 목록으로 간다", async ({
    context,
  }) => {
    // 상한을 둘째 아이 턴으로(인사 1 + 대화 1)
    await withHouseholdSetting("talk.safety_max_turns", 2, async () => {
      const { page, card } = await openTalk(context, [
        saidRun("I'm good."),
        saidRun("I like it."),
      ]);
      await pastGreeting(page, card);
      await talkTurnsWithoutReply(page);
      await expect(bubble(page)).toContainText(card.safetyFarewell.en, {
        timeout: STREAM_END_MS,
      });
      await expect(page.locator("[data-talk-closed]")).toBeVisible();
      await page
        .locator("[data-talk-closed]")
        .getByRole("button", { name: F.lessons })
        .click();
      await expect(page).toHaveURL(/\/talk\/lessons$/);
    });
  });
});

/** 안전 상한 턴: 말하고 보내기만(응답은 서버가 카드 끝인사로 닫음 — AI 없음). */
async function talkTurnsWithoutReply(page: Page) {
  const before = await turnRequests();
  await untilChildTurn(page);
  await page.locator("[data-child-turn] [data-speak]").click();
  await page
    .locator("[data-child-confirm]")
    .getByRole("button", { name: T.send })
    .click();
  // 상한 턴은 AI 를 부르지 않는다
  await page.waitForTimeout(SETTLE_MS);
  expect(await turnRequests()).toBe(before);
}

/** 1×1 투명 PNG(시험 값 — 그림이 열리는 길). */
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
/** 그림이 '크게' 보이는 아래 한계(px, 시험 값 — 말풍선 폭의 반쯤). */
const PICTURE_MIN_PX = 160;

async function sessionOf(sessionId: string) {
  const [row] = await e2eDb()
    .select({ status: sessions.status, talkSegment: sessions.talkSegment })
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  return row;
}

// ── 차례 6 fix 1: 증명 표의 남은 e2e 열 개(검토 b3 I-2) · 정리 다시 읽기(I-1) ──

const G = {
  notHeard: "토리에게 잘 안 들렸어요. 조금 더 크게 말해 볼까요",
  silent: "말소리가 잘 안 들려요. 부모님께 말해 주세요",
  nudge: "막히면 눌러요",
  more: "더 이야기하기",
} as const;
const MORE_ROUND = TEST_SETTINGS["talk.more_talk_round_turns"].value;
const DONTKNOW_MAX = TEST_SETTINGS["talk.dontknow_max"].value;
const NOSPEECH_DONTKNOW = TEST_SETTINGS["talk.nospeech_dontknow_count"].value;
const SILENT_ITEMS_MAX = TEST_SETTINGS["speech.silent_items_max"].value;
/** 정리 다시 읽기 시험의 읽어 주기 한 번 길이(ms, 시험 값 — 끝인사를 읽는 동안 말풍선을 누를 틈). */
const SLOW_UTTER_MS = 1500;

const count = (page: Page) => page.locator("[data-talk-count]");
/** 위 띠 글(4절 회화 세션 '위 띠' 행 · C30 — 화면 TALK_TEXT 와 같은 글). */
const TALK_TEXT = {
  count: (n: number, target: number) => `말 주고받기 ${n} / ${target}`,
  moreCount: (n: number, round: number) =>
    `다 했어요! 더 이야기하기 ${n} / ${round}`,
} as const;

/** 목표 턴 수(인사 턴 + 카드 대화 턴 — 견본은 단계 규격 목표 턴만큼 카드 턴을 둔다). */
function targetOf(card: TalkCard): number {
  return card.greetingTurns + (card.turns?.length ?? 0);
}

/** '잘 모르겠어요' 한 턴(가짜 응답이 와서 다음 아이 차례가 열릴 때까지는 부르는 쪽이 기다림). */
async function dontKnowTurn(page: Page) {
  const before = await turnRequests();
  await untilChildTurn(page);
  await page.locator("[data-dont-know]").click();
  await expect.poll(turnRequests).toBe(before + 1);
}

/** no-speech 듣기 talk.nospeech_dontknow_count 번 → '모름' 한 턴(앞 듣기는 '잘 안 들렸어요' · 턴으로 세지 않음). */
async function silentTurn(page: Page) {
  const before = await turnRequests();
  await untilChildTurn(page);
  for (let i = 0; i < NOSPEECH_DONTKNOW; i++) {
    await page.locator("[data-child-turn] [data-speak]").click();
    if (i < NOSPEECH_DONTKNOW - 1) {
      await expect(page.getByText(G.notHeard)).toBeVisible();
      expect(await turnRequests()).toBe(before);
    }
  }
  await expect.poll(turnRequests).toBe(before + 1);
}

/** 토리가 마지막으로 읽은 말 n 개(응답이 다 읽힐 때까지 기다림). */
async function spokenTail(page: Page, tail: readonly string[]) {
  await expect
    .poll(async () => (await speechRecord(page)).spoken.slice(-tail.length), {
      timeout: STREAM_END_MS,
    })
    .toEqual([...tail]);
}

async function childRows(sessionId: string) {
  return (
    await e2eDb()
      .select({
        turnNo: talkTurnRows.turnNo,
        inputMode: talkTurnRows.inputMode,
        hintKind: talkTurnRows.hintKind,
        heardHelp: talkTurnRows.heardHelp,
        saidWords: talkTurnRows.saidWords,
        stuckPhrase: talkTurnRows.stuckPhrase,
      })
      .from(talkTurnRows)
      .where(
        and(
          eq(talkTurnRows.sessionId, sessionId),
          eq(talkTurnRows.speaker, "child"),
        ),
      )
  ).sort((a, b) => a.turnNo - b.turnNo);
}

async function alertKindsOf(profileId: string) {
  return (
    await e2eDb()
      .select({ kind: parentAlerts.kind })
      .from(parentAlerts)
      .where(eq(parentAlerts.profileId, profileId))
  ).map((r) => r.kind);
}

test.describe("회화 증명 표 남은 시험(차례 6 fix 1)", () => {
  test.setTimeout(FULL);

  test("AC-15a 위 띠는 '말 주고받기 n / 목표 턴'이고 목표 턴에 닿으면 토리가 더 이야기할지 묻고 '더 이야기하기'를 고르면 '다 했어요! 더 이야기하기 n / talk.more_talk_round_turns'와 '더 이야기할 거리'의 질문이 나오며 그만큼 뒤 다시 묻는다", async ({
    context,
  }) => {
    await withFastTurns(async () => {
      const probe = (await insertTalkLesson({ level: 1 }))
        .content as TalkLesson;
      const target = targetOf(probe.card);
      const dialogue = target - probe.card.greetingTurns;
      const { page, card } = await openTalk(context, [
        saidRun("I'm good."),
        ...Array.from({ length: dialogue + MORE_ROUND }, () =>
          saidRun("I like it."),
        ),
      ]);
      await expect(count(page)).toHaveText(TALK_TEXT.count(0, target));
      await pushFakeAi(
        Array.from({ length: 1 + dialogue + MORE_ROUND }, () =>
          talkReply({ tori_en: "Nice!" }),
        ),
      );
      await speak(page);
      await expect(count(page)).toHaveText(TALK_TEXT.count(1, target));
      await talkTurns(page, dialogue - 1, AUTO_SEND);
      await expect(count(page)).toHaveText(TALK_TEXT.count(target - 1, target));
      await talkTurns(page, 1, AUTO_SEND);
      // 목표 턴: 토리가 더 이야기할지 묻고 위 띠가 '다 했어요! …'
      await expect(page.locator("[data-talk-choice]")).toBeVisible({
        timeout: STREAM_END_MS,
      });
      await expect(bubble(page)).toContainText(MORE_PROMPT.en);
      await expect(count(page)).toHaveText(TALK_TEXT.moreCount(0, MORE_ROUND));
      await page
        .locator("[data-talk-choice]")
        .getByRole("button", { name: G.more })
        .click();
      const more = card.moreTalk?.[0];
      if (!more) throw new Error("견본 꼴 — 더 이야기할 거리");
      await expect(bubble(page)).toContainText(more.question.en);
      await expect(count(page)).toHaveText(TALK_TEXT.moreCount(0, MORE_ROUND));
      for (let n = 1; n <= MORE_ROUND; n++) {
        await talkTurns(page, 1, AUTO_SEND);
        if (n < MORE_ROUND)
          await expect(count(page)).toHaveText(
            TALK_TEXT.moreCount(n, MORE_ROUND),
          );
      }
      // talk.more_talk_round_turns 턴 뒤 다시 묻는다
      await expect(page.locator("[data-talk-choice]")).toBeVisible({
        timeout: STREAM_END_MS,
      });
      await expect(count(page)).toHaveText(
        TALK_TEXT.moreCount(MORE_ROUND, MORE_ROUND),
      );
      await spokenTail(page, [MORE_PROMPT.en]);
    });
  });
  test("AC-15g 같은 질문에서 no-speech 로 끝난 듣기가 talk.nospeech_dontknow_count 번 이어지면 '모름'과 같이 처리되고 talk.dontknow_max 번째 '모름'이면 다음 질문으로 간다", async ({
    context,
  }) => {
    const { page, card, sessionId } = await openTalk(context, [
      saidRun("I'm good."),
      ...Array.from({ length: NOSPEECH_DONTKNOW * DONTKNOW_MAX }, () =>
        failingRun("no-speech"),
      ),
    ]);
    const first = await pastGreeting(page, card);
    const second = card.turns?.[1];
    if (!second) throw new Error("견본 꼴");
    await pushFakeAi(
      Array.from({ length: DONTKNOW_MAX }, () =>
        talkReply({ tori_en: "That's okay." }),
      ),
    );
    for (let k = 1; k <= DONTKNOW_MAX; k++) {
      await silentTurn(page);
      if (k < DONTKNOW_MAX) {
        // '모름'과 같이: 토리가 답 예시를 말하고 같은 질문을 다시 묻는다(위 띠 숫자 그대로)
        await expect
          .poll(async () => (await speechRecord(page)).spoken)
          .toContain(first.answerExample);
        await expect(bubble(page)).toContainText(first.question.en);
        await expect(count(page)).toHaveText(
          TALK_TEXT.count(1, targetOf(card)),
        );
      }
    }
    // talk.dontknow_max 번째 '모름' 뒤 다음 질문
    await expect(bubble(page)).toContainText(second.question.en, {
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(page);
    const rows = (await childRows(sessionId)).slice(1);
    expect(rows.map((r) => r.inputMode)).toEqual(
      Array.from({ length: DONTKNOW_MAX }, () => "dont_know"),
    );
  });

  test("AC-15g 1단계에서 'I don't know' 라고 말한 턴 뒤에는 답 예시와 같은 질문이 나오고 위 띠 숫자가 오르지 않는다", async ({
    context,
  }) => {
    const said = "I don't know.";
    const { page, card, sessionId } = await openTalk(context, [
      saidRun("I'm good."),
      saidRun(said),
    ]);
    const first = await pastGreeting(page, card);
    await expect(count(page)).toHaveText(TALK_TEXT.count(1, targetOf(card)));
    // 회화 턴이 막힘으로 볼 말(stuck)로 돌려준다(6.2) — 앱이 답 예시 + 같은 질문을 붙인다
    await pushFakeAi([talkReply({ tori_en: "That's okay.", stuck: true })]);
    await talkTurns(page, 1);
    await spokenTail(page, [
      first.answerExample,
      first.question.en,
      ...(first.twoAnswers ? [twoAnswersLine(first.twoAnswers)] : []),
    ]);
    await expect(bubble(page)).toContainText(first.question.en);
    await untilChildTurn(page);
    await expect(count(page)).toHaveText(TALK_TEXT.count(1, targetOf(card)));
    const rows = await childRows(sessionId);
    expect(rows.at(-1)).toMatchObject({
      inputMode: "speech",
      stuckPhrase: said,
    });
  });

  test("AC-15g 질문 하나를 talk.dontknow_max 번 '모름'으로 넘긴 1단계 대화는 그 질문을 답 예시와 함께 한 번 더 묻고 모자라면 '더 이야기할 거리'로 목표 턴에 닿는다", async ({
    context,
  }) => {
    await withFastTurns(async () => {
      const probe = (await insertTalkLesson({ level: 1 }))
        .content as TalkLesson;
      const turns = probe.card.turns ?? [];
      // 앞 두 질문을 넘기고(각 talk.dontknow_max 번 '모름') 나머지 카드 턴에 답한다
      const answered = turns.length - 2;
      const { page, card } = await openTalk(context, [
        saidRun("I'm good."),
        ...Array.from({ length: answered + 2 }, () => saidRun("I like it.")),
      ]);
      const target = targetOf(card);
      const [q1, q2] = turns;
      const more = card.moreTalk?.[0];
      if (!q1 || !q2 || !more) throw new Error("견본 꼴");
      await pushFakeAi(
        Array.from({ length: 1 + DONTKNOW_MAX * 3 + answered + 2 }, () =>
          talkReply({ tori_en: "Nice!" }),
        ),
      );
      await speak(page);
      for (let k = 0; k < DONTKNOW_MAX * 2; k++) await dontKnowTurn(page);
      await talkTurns(page, answered, AUTO_SEND);
      // 카드 턴을 다 쓴 뒤 넘긴 질문을 답 예시와 함께 한 번 더(다시 묻는 턴 — 답 두 개 없음)
      await spokenTail(page, [q1.answerExample, q1.question.en]);
      await expect(count(page)).toHaveText(
        TALK_TEXT.count(1 + answered, target),
      );
      await talkTurns(page, 1, AUTO_SEND);
      await spokenTail(page, [q2.answerExample, q2.question.en]);
      // 둘째 넘긴 질문도 '모름'이면(talk.dontknow_max 번) 모자란 턴은 '더 이야기할 거리'로
      for (let k = 0; k < DONTKNOW_MAX; k++) await dontKnowTurn(page);
      await spokenTail(page, [more.question.en]);
      await expect(count(page)).toHaveText(TALK_TEXT.count(target - 1, target));
      await talkTurns(page, 1, AUTO_SEND);
      await expect(page.locator("[data-talk-choice]")).toBeVisible({
        timeout: STREAM_END_MS,
      });
      await expect(count(page)).toHaveText(TALK_TEXT.moreCount(0, MORE_ROUND));
    });
  });
  test("AC-15h 1단계 다지기 수업에서 앞 세션에 만난 단어를 묻는 턴은 답 두 개를 들려주지 않고 힌트를 열지 않거나 한국어 뜻만 열고 그 단어를 말한 턴은 '말했다'로 기록되며 영어 문장 단을 연 턴과 답 예시를 들은 턴은 기록되지 않는다", async ({
    context,
  }) => {
    const profileId = await talkHousehold(1);
    const lesson = reinforceTalkLesson(1);
    const turns = lesson.card.turns ?? [];
    const [a, b, c, d] = turns;
    if (!a || !b || !c || !d) throw new Error("견본 꼴 — 다지기 카드 턴 넷");
    // 앞 회화 세션에서 단원 단어를 모두 만났고 '안다'(오늘 쓸 말 · 말해 보기 토막이 비어 건너뜀)
    await meetSayWords(profileId, lesson.unitWords, { known: true });
    const row = await insertTalkLesson({ level: 1, lesson });
    const sessionId = await openTalkSession(profileId, row);
    const page = await speechPage(
      context,
      talkScript([
        saidRun("I'm good."),
        saidRun(a.answerExample),
        saidRun(b.answerExample),
        saidRun(c.answerExample),
        saidRun(d.answerExample),
      ]),
    );
    await page.goto(`/session/${sessionId}`);
    await pastStart(page);
    const word = (t: { targets: string[] }) => t.targets[0] ?? "";
    await pushFakeAi([
      talkReply({ tori_en: "Great! Let's talk." }),
      talkReply({ tori_en: "Nice!", self_used_words: [word(a)] }),
      talkReply({ tori_en: "Nice!", self_used_words: [word(b)] }),
      talkReply({ tori_en: "Nice!", self_used_words: [word(c)] }),
      talkReply({ tori_en: "That's okay." }),
      talkReply({ tori_en: "Nice!", self_used_words: [word(d)] }),
    ]);
    await speak(page);
    const noPair = async (t: { twoAnswers?: [string, string] }) => {
      await untilChildTurn(page);
      await expect(page.locator("[data-answer-listen]")).toHaveCount(0);
      if (t.twoAnswers)
        expect((await speechRecord(page)).spoken).not.toContain(
          twoAnswersLine(t.twoAnswers),
        );
    };
    /** 말하고 보낸다 — 연 영어 문장 · 들은 답 예시와 맞는 턴은 인식 확인 없이 바로 보내진다(4절 인식 확인 행). */
    const send = async ({ confirm }: { confirm: boolean }) => {
      const before = await turnRequests();
      await page.locator("[data-child-turn] [data-speak]").click();
      if (confirm)
        await page
          .locator("[data-child-confirm]")
          .getByRole("button", { name: T.send })
          .click();
      await expect.poll(turnRequests).toBe(before + 1);
    };
    // (가) 힌트 없이 말함 → '말했다'
    await noPair(a);
    await send({ confirm: true });
    // (나) 한국어 뜻만 열고 말함 → '말했다'
    await noPair(b);
    await page.getByRole("button", { name: T.hint, exact: true }).click();
    await expect(page.locator('[data-hint-tier="ko"]')).toBeVisible();
    await send({ confirm: true });
    // (다) 영어 문장 단을 열고 말함 → 기록 안 됨
    await noPair(c);
    const hint = page.getByRole("button", { name: T.hint, exact: true });
    await hint.click();
    await hint.click();
    await expect(page.locator('[data-hint-tier="sentence"]')).toContainText(
      c.hintEn,
    );
    await send({ confirm: false });
    // (라) '잘 모르겠어요' → 답 예시를 듣고 말함 → 기록 안 됨
    await noPair(d);
    await dontKnowTurn(page);
    await spokenTail(page, [d.answerExample, d.question.en]);
    await untilChildTurn(page);
    await send({ confirm: false });
    await expect.poll(async () => (await childRows(sessionId)).length).toBe(6);
    const rows = (await childRows(sessionId)).slice(1);
    // 말했다: 힌트 없음 · 뜻만 연 턴만. 영어 문장 단 · 답 예시를 들은 턴과 '모름' 턴은 없음
    expect(rows.map((r) => r.saidWords ?? [])).toEqual([
      [word(a)],
      [word(b)],
      [],
      [],
      [],
    ]);
    expect(rows.map((r) => r.inputMode)).toEqual([
      "speech",
      "speech",
      "speech",
      "dont_know",
      "speech",
    ]);
    expect(
      [rows[0], rows[1], rows[2], rows[4]].map((r) => r?.hintKind),
    ).toEqual(["none", "meaning_only", "english", "english"]);
    expect(rows.at(-1)?.heardHelp).toBe("answer_example");
  });

  test("AC-15l 프로필의 첫 회화 수업에서 '힌트' 버튼에 '막히면 눌러요'가 한 번 보이고 둘째 수업부터는 같은 프로필의 다른 기기에서도 보이지 않는다", async ({
    context,
    browser,
    baseURL,
  }) => {
    const { page, card, sessionId, profileId } = await openTalk(context, [
      saidRun("I'm good."),
    ]);
    await untilChildTurn(page);
    await expect(page.locator("[data-hint-nudge]")).toHaveText(G.nudge);
    await pastGreeting(page, card);
    await untilChildTurn(page);
    // 같은 수업의 다음 턴에는 다시 보이지 않는다(한 번)
    await expect(page.locator("[data-hint-nudge]")).toHaveCount(0);
    await expect
      .poll(async () => {
        const [row] = await e2eDb()
          .select({ seen: profiles.noticesSeen })
          .from(profiles)
          .where(eq(profiles.id, profileId));
        return Object.keys((row?.seen ?? {}) as object);
      })
      .toContain("talk_hint_nudge");
    // 둘째 수업 · 다른 기기(새 브라우저 문맥 — 이 기기의 저장소 없음)
    await e2eDb()
      .update(sessions)
      .set({ status: "aborted" })
      .where(eq(sessions.id, sessionId));
    const second = await insertTalkLesson({
      level: 1,
      lesson: greetingToTalkLesson(1, { lessonNo: 2 }),
    });
    const secondId = await openTalkSession(profileId, second);
    const other = await browser.newContext({ baseURL });
    await addAccessCookie(other, baseURL);
    const device = await speechPage(other, talkScript([]));
    await device.goto(`/session/${secondId}`);
    await pastStart(device);
    await untilChildTurn(device);
    await expect(
      device.getByRole("button", { name: T.hint, exact: true }),
    ).toBeVisible();
    await expect(device.locator("[data-hint-nudge]")).toHaveCount(0);
    await other.close();
  });

  test("AC-15m 회화 1단계에서 카드가 다시 묻는 턴으로 적은 턴이라도 아이가 그 단어를 만나지 않았으면 답 두 개를 들려준다", async ({
    context,
  }) => {
    const profileId = await talkHousehold(1);
    // 다지기 견본(카드 턴이 모두 '다시 묻는 턴') — 이 프로필은 그 단어를 만난 적이 없다
    const lesson = greetingToTalkLesson(1, { kind: "reinforce" });
    const first = lesson.card.turns?.[0];
    if (!first?.twoAnswers) throw new Error("견본 꼴");
    expect(first.ask).toBe("re_ask");
    const row = await insertTalkLesson({ level: 1, lesson });
    const sessionId = await openTalkSession(profileId, row);
    const page = await speechPage(context, talkScript([saidRun("I'm good.")]));
    await page.goto(`/session/${sessionId}`);
    await pastStart(page);
    await pushFakeAi([talkReply({ tori_en: "Great! Let's talk." })]);
    await speak(page);
    await expect(bubble(page)).toContainText(first.question.en);
    await untilChildTurn(page);
    await expect(page.locator("[data-answer-listen]")).toHaveCount(2);
    expect((await speechRecord(page)).spoken).toContain(
      twoAnswersLine(first.twoAnswers),
    );
  });

  test("AC-16b 회화 말풍선에는 영어 이름이 보이고 홈에는 한글 이름이 보인다", async ({
    context,
  }) => {
    const { page } = await openTalk(context, [saidRun("I'm good.")]);
    await pushFakeAi([
      talkReply({ tori_en: `Great, ${PLACEHOLDER_NAME}! Let's talk.` }),
    ]);
    await speak(page);
    // 앱 안 영어 이름(Momo — 시험 집의 지어낸 이름)으로 채운다. 틀 글({NAME})과 한글 이름은 보이지 않는다
    await expect(bubble(page)).toContainText("Great, Momo!");
    const text = await page.locator("main").innerText();
    expect(text).not.toContain(PLACEHOLDER_NAME);
    expect(text).not.toContain("모모");
    // 읽어 주기도 채운 이름(문장마다 읽음)
    expect((await speechRecord(page)).spoken).toContain("Great, Momo!");
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "모모의 공부 보드",
    );
  });

  test("AC-N3 no-speech 만 이어지는 가짜 API 에서 회화 질문 셋이 '모름'으로 넘어가면 '말소리가 잘 안 들려요' 안내와 '말소리가 들어오지 않음' 알림이 나온다", async ({
    context,
  }) => {
    const { page, card, profileId, sessionId } = await openTalk(context, [
      saidRun("I'm good."),
      ...Array.from(
        { length: NOSPEECH_DONTKNOW * DONTKNOW_MAX * SILENT_ITEMS_MAX },
        () => failingRun("no-speech"),
      ),
    ]);
    await pastGreeting(page, card);
    await pushFakeAi(
      Array.from({ length: DONTKNOW_MAX * SILENT_ITEMS_MAX }, () =>
        talkReply({ tori_en: "That's okay." }),
      ),
    );
    for (let q = 1; q <= SILENT_ITEMS_MAX; q++) {
      for (let k = 0; k < DONTKNOW_MAX; k++) await silentTurn(page);
      if (q < SILENT_ITEMS_MAX)
        await expect(page.locator("[data-blocked]")).toHaveCount(0);
    }
    // speech.silent_items_max 번째로 말소리 없이 넘어간 질문 뒤 막힌 안내 · 알림(C22) — 세션은 진행
    await expect(page.getByText(G.silent)).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await expect(
      page
        .locator("[data-blocked]")
        .getByRole("button", { name: F.home, exact: true }),
    ).toBeVisible();
    await expect.poll(() => alertKindsOf(profileId)).toContain("speech_silent");
    expect((await sessionOf(sessionId))?.status).toBe("in_progress");
  });

  test("AC-N3 한 질문에서 no-speech 가 여섯 번이어도 회화 세션은 멈추지 않고 다음 질문으로 간다", async ({
    context,
  }) => {
    const { page, card, profileId } = await openTalk(context, [
      saidRun("I'm good."),
      ...Array.from({ length: NOSPEECH_DONTKNOW * DONTKNOW_MAX }, () =>
        failingRun("no-speech"),
      ),
    ]);
    // 시험 값 확인: 한 질문의 no-speech 여섯 번 = '모름' talk.dontknow_max 번
    expect(NOSPEECH_DONTKNOW * DONTKNOW_MAX).toBe(6);
    await pastGreeting(page, card);
    const second = card.turns?.[1];
    if (!second) throw new Error("견본 꼴");
    await pushFakeAi(
      Array.from({ length: DONTKNOW_MAX }, () =>
        talkReply({ tori_en: "That's okay." }),
      ),
    );
    for (let k = 0; k < DONTKNOW_MAX; k++) await silentTurn(page);
    await expect(bubble(page)).toContainText(second.question.en, {
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(page);
    await expect(page.locator("[data-blocked]")).toHaveCount(0);
    // no-speech 는 마이크 멈춤(여섯 번) 셈에 들지 않는다 — 알림 없음
    const kinds = await alertKindsOf(profileId);
    expect(kinds).not.toContain("mic_stalled");
    expect(kinds).not.toContain("speech_silent");
  });
});

test.describe("회화 정리 다시 읽기(차례 6 fix 1 — 검토 b3 I-1)", () => {
  test.setTimeout(LONG);

  test("회화 정리: 끝인사를 읽는 중 말풍선을 눌러 다시 들어도 다시 읽기가 끝나면 마무리 첫 장으로 간다", async ({
    context,
  }) => {
    const profileId = await talkHousehold(1);
    const row = await insertTalkLesson({ level: 1 });
    const sessionId = await openTalkSession(profileId, row);
    const card = (row.content as TalkLesson).card;
    const line = wrapLineOf(card);
    const page = await speechPage(
      context,
      talkScript([saidRun("I'm good."), saidRun(line.en)], {
        utterMs: SLOW_UTTER_MS,
      }),
    );
    await recordInterruptedSpeech(page);
    await page.goto(`/session/${sessionId}`);
    await pastStart(page);
    // 읽기가 길어 아이 차례까지 넉넉히 기다린다(인사 질문 · 답 두 개를 다 읽은 뒤)
    await expect(childTurn(page)).toBeVisible({ timeout: STREAM_END_MS });
    await pushFakeAi([talkReply({ tori_en: "Great! Let's talk." })]);
    await page.locator("[data-child-turn] [data-speak]").click();
    const first = card.turns?.[0];
    if (!first) throw new Error("견본 꼴");
    await expect(bubble(page)).toContainText(first.question.en, {
      timeout: STREAM_END_MS,
    });
    await expect(childTurn(page)).toBeVisible({ timeout: STREAM_END_MS });
    await page.locator("[data-paper-band] [data-talk-stop]").click();
    await page.getByRole("button", { name: F.stopYes }).click();
    await expect(bubble(page)).toContainText(line.en);
    await page.locator("[data-talk-wrap] [data-speak]").click();
    await expect(page.locator("[data-follow-result]")).toBeVisible();
    // 끝인사가 보이자마자(처음 읽기 중) 말풍선을 눌러 다시 읽는다
    await expect(bubble(page)).toContainText(card.farewell.en, {
      timeout: STREAM_END_MS,
    });
    await bubble(page).click();
    await expect(page.locator('[data-closing-card="1"]')).toBeVisible({
      timeout: STREAM_END_MS,
    });
    expect(
      (await speechRecord(page)).spoken.filter((t) => t === card.farewell.en),
    ).toHaveLength(2);
    // 누름이 끝인사의 첫 읽기 중이었다(끊김 — 시간이 어긋나 다 읽은 뒤 눌렀으면 이 단언이 빨강, 고치기 전 코드의 거짓 초록을 막음)
    expect(await interruptedSpeech(page)).toContain(card.farewell.en);
  });
});

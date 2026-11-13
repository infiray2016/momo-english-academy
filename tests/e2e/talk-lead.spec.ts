// 회화 새 엔진(talk.lead_mode claude — 'Claude 주도' spec 설계 3 · 8 · 13절 C240 · C241, 묶음 S3) 수업 한 번의 화면 e2e. 3단계 단원 1(안내문
// 글이 있는 단원 — 13절 C241 보완)의 견본 수업을 넣고, 처음 열 때 설정을 claude 로 두어 처음 스냅숏이 새 방식이 되게 한다. 흐름: 인사(지금 길)
// → 대화 토막의 첫 차례(토막 넘김의 leadTurn start → 아이 말 없는 턴 요청, 뜻 줄) → 아이 답 → 1~3단계 따라 할 문장의 소리 줄(글 없이 듣기
// 단추, 글 뒤) → '잘 모르겠어요' → 되묻는 차례(막힌 뒤 고르기 물음이 소리 줄) → 또 '잘 모르겠어요' → 막힌 뒤 한국어 뜻(hint_ko) → (앞선 대화
// 차례는 DB 에 바로 넣고 쪽을 다시 엶 — 이어 하기) → 마무리 차례의 두 단추 → '더 이야기하기'(leadTurn more → 턴 요청) → '그만하기' → 정리.
// 가짜 Anthropic 은 사실 알림 머리 줄(TALK_LEAD_STATUS_HEAD)로 새 엔진 요청을 가른다. 화면 검토 사진은 E2E_PHOTOS 가 있을 때
// test-results/photos/talk-lead-*.png(photos.ts, 아이패드 두 방향) — 정본 15절 AC-26m 이 켜기 전에 캡처로 보라는 여섯(마무리 차례의 두 단추 ·
// 듣기 단추의 자리 · 뜻 줄 · 되묻는 차례의 듣기 단추 · 힌트 단추가 없는 차례 · 막힌 뒤 hint_ko)을 이 한 번에 남기고, 이름에 보이는 것을 적는다.
// 가짜 응답 대본은 talk-lead-script.ts 에 두고 단위 시험(tests/unit/talk-lead-script.test.ts)이 같은 대본을 서버 턴 길의 core 함수로 먼저
// 지나게 한다 — 물음 문장은 e2e 재료(시험용 시드 3단계 어휘)의 아는 낱말로만 쓴다(시드에 없는 낱말의 고르기는 좁은 정의에 걸려 다시
// 말하기로 바뀐다, CI 고침 2). 이 Mac 은 e2e DB(embedded-postgres)가 뜨지 않아 CI 에서 돈다.
// 묶음 S5(화면 검토 task-des-s3-report 1.4): 장면마다 지금 턴의 아래 끝이 기록 칸의 보이는 상자 안에 있는지와 으뜸 단추가 보는 창 안에 있는지를
// 잰다(toBeVisible 은 넘침에 잘린 요소도 통과한다 — C-1 · I-2). 되묻는 차례(앞 차례의 듣기 단추를 그대로 둠, 저절로 읽지 않음 — I-1) · 'Say, "…"'
// 꼴(M-2) · 뜻 줄과 막힌 뒤 뜻이 함께인 차례(M-3) · 마무리 제안 차례(M-4)를 더했고, 같은 수업을 가로로 연 상태로도 한 번 돌려 사진을 한 벌 남긴다.
import type { Page } from "@playwright/test";
import { and, eq, max } from "drizzle-orm";
import { TALK_LEAD_STATUS_HEAD } from "../../src/core/ai/calls/talk-lead";
import { talkMoveOf } from "../../src/core/conversation/move";
import { MORE_PROMPT } from "../../src/core/conversation/spoken";
import { levelSpecs } from "../../src/db/schema/content";
import { talkTurns } from "../../src/db/schema/learning";
import { type FakeRule, messageBody } from "../fixtures/ai/fake-anthropic";
import { closeE2eDb, e2eDb, resetHousehold, withHouseholdSetting } from "./db";
import { fakeAiRequests, pushFakeAi, resetFakeAi } from "./fake-ai";
import { expect, speechPage, test } from "./fixtures";
import { photo } from "./photos";
import {
  insertTalkLesson,
  openTalkSession,
  saidRun,
  skipStartPrep,
  speechRecord,
  TALK_MODEL_LOW,
  talkHousehold,
  talkLessonCard,
  talkLessonReply,
  talkScript,
  talkTurnRequests,
} from "./talk";
import {
  expectInView,
  expectNowInLog,
  openedLandscapePhoto,
  openLandscape,
} from "./talk-in-view";
import {
  LEAD_SCRIPT,
  LEAD_SCRIPT_CHILD_SAYS,
  LEAD_SCRIPT_CHOICES,
  LEAD_SCRIPT_COUNTED_BEFORE_INSERT,
  LEAD_SCRIPT_GREETING_END,
  LEAD_SCRIPT_HINT_KO,
  LEAD_SCRIPT_HINT_SAY_KO,
  LEAD_SCRIPT_MODEL,
  LEAD_SCRIPT_RETRY,
  LEAD_SCRIPT_SAY_COMMA_SHOWN,
  type LeadScriptReply,
} from "./talk-lead-script";

const T = {
  start: "시작!",
  micOk: "알겠어요",
  more: "더 이야기하기",
} as const;
/** AC-26m 화면 캡처 이름(보이는 것을 이름에 — 검토 rev-s3 M-3 · 고침 1 브리프 4). */
const PHOTO = {
  first: "talk-lead-first-ko-line-no-hint-button",
  model: "talk-lead-model-repeat-listen-button-after-text",
  askAgain: "talk-lead-ask-again-kept-listen-button",
  sayComma: "talk-lead-say-comma-model-colon",
  choices: "talk-lead-stuck-choices-listen-button",
  hintKo: "talk-lead-stuck-ko-line-and-hint-ko",
  closing: "talk-lead-closing-two-buttons",
  more: "talk-lead-more-talk",
  wrapUp: "talk-lead-wrap-up-speak-and-two-buttons",
  wrap: "talk-lead-wrap",
} as const;
/** 수업을 연 방향(세로는 돌려 찍기로 두 방향 사진, 가로는 가로로 연 상태의 사진 — 화면 검토 1.3). */
const WAYS = ["portrait", "landscape"] as const;
/** 쪽 넘김 · 자리 단언을 기다리는 시간(ms, 시험 값 — talk-in-view · talk-lesson 과 같은 값). */
const IN_VIEW_SETTLE_MS = 10_000;

/**
 * 수업 화면 전체가 보는 창 안이다(13절 C241 보완 4 · 화면 재검토 des-s5 D-1 — S5 fix 7, talk-lesson.spec 과 같은 단언): 쪽 넘김이 0 이고
 * (시험 창 기준) 위 띠가 보는 창 위로 나가지 않는다. 대화 중이면(stop) 위 띠의 '그만하기'도 보는 창 안에 온전히 있다. 세로로 연 수업에서만 쓴다
 * (가로의 마무리 제안 · 정리는 결정 범위 밖).
 */
async function expectLessonInView(page: Page, { stop }: { stop: boolean }) {
  await expect
    .poll(() => page.evaluate(() => Math.round(window.scrollY)), {
      timeout: IN_VIEW_SETTLE_MS,
    })
    .toBeLessThanOrEqual(0);
  const bandTop = await page
    .locator("[data-paper-band]")
    .evaluate((el) => el.getBoundingClientRect().top);
  expect(bandTop).toBeGreaterThanOrEqual(0);
  if (stop)
    await expect(
      page.locator("[data-paper-band] [data-talk-stop]"),
    ).toBeInViewport({ ratio: 1 });
}
/** 되묻는 차례의 듣기 단추 접근 이름 · 고르기 물음 듣기 단추 접근 이름(화면 문구 표 BUBBLE_TEXT.model · ask 와 같은 글). */
const LISTEN_LABEL = {
  model: "따라 할 말 듣기",
  ask: "물어본 말 듣기",
} as const;
const LONG = 240_000;
const STREAM_END_MS = 30_000;
/** 안내문 글이 있는 단계(지금 회화 3단계 단원 1 — 13절 C241 보완, insertTalkLesson 은 단원 1 에 넣는다). */
const LEVEL = 3;
const LEAD_MODE_KEY = "talk.lead_mode";
/** 좁은 정의 다시 말하기 요청 글(lead-level leadNarrowRetryPrompt — 그 요청 본문에도 사실 알림 머리 줄이 든다). */
const LEAD_RETRY_MARK = "Say the same question again in easier words";
/** 아이 말 없는 '더 이야기하기' 입구의 입력 줄(talk-lead talkLeadChildLine — spec 설계 3). */
const MORE_LINE = "(The child chose to talk more.)";

test.beforeEach(async () => {
  await resetHousehold();
  await resetFakeAi();
});
test.afterEach(resetFakeAi);
test.afterAll(closeE2eDb);

/** 새 엔진 응답(아홉 칸 — 빈 값 + 덮어쓴 칸, 칸 차례는 reading · move · say 먼저, 통합 시험 talk-fixture leadAnswer 와 같은 꼴). */
function leadReply(over: LeadScriptReply): FakeRule {
  return {
    when: { bodyIncludes: TALK_LEAD_STATUS_HEAD },
    reply: {
      kind: "stream",
      body: messageBody({
        model: TALK_MODEL_LOW,
        json: {
          reading: over.reading ?? "clear_answer",
          move: over.move,
          say: over.say,
          say_ko: over.say_ko ?? "",
          model_sentence: over.model_sentence ?? "",
          hint_ko: over.hint_ko ?? "",
          hint_en: over.hint_en ?? "",
          goal_words_i_said: [],
          child_used_on_own: [],
        },
      }),
      chunks: 6,
    },
    times: 1,
  };
}

/** 좁은 정의에 걸리면 같은 물음으로 답한다(시험 물음은 쉬운 낱말이라 대개 쓰이지 않음 — 걸려도 다음 새 엔진 규칙을 먹지 않게). */
function retryReply(question: string): FakeRule {
  return {
    when: { bodyIncludes: LEAD_RETRY_MARK },
    reply: {
      kind: "message",
      body: messageBody({ model: TALK_MODEL_LOW, json: { question } }),
    },
    times: 5,
  };
}

/** 가짜에 들어온 새 엔진 차례 요청(다시 말하기 요청 밖). */
async function leadRequests() {
  return (await fakeAiRequests()).filter(
    (r) =>
      r.bodyText.includes(TALK_LEAD_STATUS_HEAD) &&
      !r.bodyText.includes(LEAD_RETRY_MARK),
  );
}

/** 회화 3단계 규격의 참고 턴(DB level_specs — 마무리 차례를 꺼내는 때). */
async function targetTurnsOf(level: number): Promise<number> {
  const rows = await e2eDb()
    .select()
    .from(levelSpecs)
    .where(and(eq(levelSpecs.area, "talk"), eq(levelSpecs.level, level)));
  const row = rows.sort(
    (a, b) => b.revision - a.revision || b.correction - a.correction,
  )[0];
  const turns = (row?.spec as { targetTurns?: unknown } | undefined)
    ?.targetTurns;
  if (typeof turns !== "number") throw new Error("회화 3단계 참고 턴 없음");
  return turns;
}

/** 앞선 대화 차례를 바로 넣는다(아이 행 · 선생님 행 한 쌍씩 — 턴 길을 거치지 않음, 통합 시험 exchange 꼴). */
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
        text: "I like it.",
        inputMode: "speech",
        clientAttemptId: `e2e-lead-${sessionId}-${turnNo}`,
        recordedAt: at,
      },
      {
        sessionId,
        turnNo: turnNo + 1,
        segment: "talk",
        speaker: "tori",
        text: "Nice!",
        move: talkMoveOf({ kind: "ai" }),
        recordedAt: at,
      },
    ]);
    turnNo += 1;
  }
}

const bubble = (page: Page) => page.locator("[data-tori-bubble]");
const speakButton = (page: Page) =>
  page.locator("[data-child-turn] [data-speak]");
/** 가짜 음성이 그 글을 읽은 번수(저절로 다시 읽지 않음 · 누르면 들림을 본다). */
async function spokenCount(page: Page, text: string): Promise<number> {
  return (await speechRecord(page)).spoken.filter((t) => t === text).length;
}
const childTurn = (page: Page) => page.locator("[data-child-turn]");
const koLine = (page: Page) => page.locator("[data-tori-ko]");
const hintButton = (page: Page) =>
  page.locator("[data-child-turn] [data-hint-button]");

async function untilChildTurn(page: Page) {
  await expect(childTurn(page)).toBeVisible({ timeout: STREAM_END_MS });
  await expect(
    page.locator("[data-talk-panel][data-talk-reading]"),
  ).toHaveCount(0, { timeout: STREAM_END_MS });
}

async function speak(page: Page) {
  await page.locator("[data-child-turn] [data-speak]").click();
}

async function dontKnow(page: Page) {
  await page.locator("[data-child-turn] [data-dont-know]").click();
}

test.describe("회화 새 엔진 수업(3단계 단원 1)", () => {
  for (const way of WAYS) {
    test(`AC-26c · AC-26i · AC-26m (${way === "portrait" ? "세로" : "가로"}로 연 수업) 대화 첫 차례(뜻 줄) → 아이 답 → 따라 할 문장 소리 줄 → 되묻는 차례(앞 차례의 듣기 단추를 그대로, 저절로 읽지 않음) → 'Say, "…"' 꼴 → 막힌 뒤 고르기 소리 줄 → 뜻 줄과 막힌 뒤 한국어 뜻 → 마무리 차례 두 단추 → 더 이야기하기 → 마무리 제안(말하기와 두 단추) → 그만하기, 장면마다 지금 턴이 기록 칸 안 · 으뜸 단추가 보는 창 안(아이 말 없는 차례는 턴 요청 하나씩)`, async ({
      context,
    }) => {
      test.setTimeout(LONG);
      const profileId = await talkHousehold(LEVEL);
      await skipStartPrep(profileId, LEVEL);
      const row = await insertTalkLesson({
        level: LEVEL,
        lesson: talkLessonCard(LEVEL),
      });
      const sessionId = await openTalkSession(profileId, row);
      // 듣기는 모두 같은 말(쪽을 다시 열면 가짜 음성 대본이 처음부터 다시 돈다)
      const page = await speechPage(
        context,
        talkScript(
          Array.from({ length: 10 }, () => saidRun(LEAD_SCRIPT_CHILD_SAYS)),
        ),
      );
      if (way === "landscape") await openLandscape(page);
      /** 장면 사진: 세로로 연 수업은 두 방향(돌려 찍기), 가로로 연 수업은 그 상태 그대로. */
      const shot = (name: string) =>
        way === "portrait"
          ? photo(page, name)
          : openedLandscapePhoto(page, name);
      await withHouseholdSetting(LEAD_MODE_KEY, "claude", async () => {
        // 처음 열 때 처음 스냅숏에 새 방식이 적힌다(그 뒤 설정을 되돌려도 이 수업은 새 방식 — AC-26a)
        await page.goto(`/session/${sessionId}`);
        await expect(page.locator("[data-talk-start]")).toBeVisible();
      });
      await page.getByRole("button", { name: T.start }).click();
      await expect(page.locator("[data-mic-notice]")).toBeVisible();
      await page.getByRole("button", { name: T.micOk }).click();

      // 인사(지금 길) → 대화 토막의 첫 차례(새 엔진 — 카드 첫 질문 없이 Claude 의 말)
      await untilChildTurn(page);
      const openingKo = LEAD_SCRIPT.opening.reply.say_ko;
      await pushFakeAi([
        talkLessonReply({ tori_en: LEAD_SCRIPT_GREETING_END }),
        retryReply(LEAD_SCRIPT_RETRY),
        leadReply(LEAD_SCRIPT.opening.reply),
      ]);
      await speak(page);
      await expect(bubble(page)).toContainText("Hello again!", {
        timeout: STREAM_END_MS,
      });
      await expect(page.locator("[data-talk-log]")).toContainText(
        "Now let's start!",
      );
      await expect(bubble(page)).not.toContainText(
        talkLessonCard(LEVEL).card.required[0]?.en ?? "(카드 첫 질문)",
      );
      expect(await leadRequests()).toHaveLength(1);
      await untilChildTurn(page);
      // 1~3단계 뜻 줄(say_ko)은 말풍선 아래 글이고, 힌트 재료(hint_ko · hint_en)가 없는 차례라 힌트 단추가 없다
      await expect(koLine(page)).toHaveText(openingKo);
      await expect(hintButton(page)).toHaveCount(0);
      await expectNowInLog(page);
      await expectInView(speakButton(page));
      await shot(PHOTO.first);

      // 아이 답 → 1~3단계 따라 할 문장: 말풍선 글에 없고 글 뒤 듣기 단추(소리 줄)로만 있다
      const model = LEAD_SCRIPT_MODEL;
      await pushFakeAi([leadReply(LEAD_SCRIPT.model.reply)]);
      await speak(page);
      const listen = page.locator('[data-sound-listen="model"]');
      await expect(listen).toBeVisible({ timeout: STREAM_END_MS });
      await expect(listen).toHaveAttribute("aria-label", LISTEN_LABEL.model);
      await expect(bubble(page)).toContainText("Great!");
      await expect(bubble(page)).not.toContainText(model);
      expect(await leadRequests()).toHaveLength(2);
      await untilChildTurn(page);
      await expectNowInLog(page);
      await expectInView(listen);
      await expectInView(speakButton(page));
      if (way === "portrait") await expectLessonInView(page, { stop: true });
      await shot(PHOTO.model);

      // 아이 말 → 되묻는 차례(ask_again): 선생님 말만 글이고, 앞 차례의 따라 할 문장 듣기 단추를 그대로 둔다 — 저절로 다시 읽지 않고 누르면 들린다
      const modelSpoken = await spokenCount(page, model);
      await pushFakeAi([leadReply(LEAD_SCRIPT.askAgain.reply)]);
      await speak(page);
      await expect(bubble(page)).toContainText("Sorry?", {
        timeout: STREAM_END_MS,
      });
      const kept = page.locator('[data-sound-listen="model"][data-sound-kept]');
      await expect(kept).toBeVisible({ timeout: STREAM_END_MS });
      await expect(kept).toHaveAttribute("aria-label", LISTEN_LABEL.model);
      await expect(bubble(page)).not.toContainText(model);
      expect(await leadRequests()).toHaveLength(3);
      await untilChildTurn(page);
      expect(await spokenCount(page, model)).toBe(modelSpoken);
      await expectNowInLog(page);
      await expectInView(kept);
      await expectInView(speakButton(page));
      await shot(PHOTO.askAgain);
      await kept.click();
      await expect
        .poll(() => spokenCount(page, model), { timeout: STREAM_END_MS })
        .toBe(modelSpoken + 1);

      // 아이 말 → 'Say, "…"' 꼴의 따라 할 문장: 따라 할 문장은 소리 줄이고 안내 말 뒤 끝 쉼표는 쌍점이다('Good! Say:')
      await pushFakeAi([leadReply(LEAD_SCRIPT.sayComma.reply)]);
      await speak(page);
      const ownListen = page.locator(
        '[data-sound-listen="model"]:not([data-sound-kept])',
      );
      await expect(ownListen).toBeVisible({ timeout: STREAM_END_MS });
      for (const line of LEAD_SCRIPT_SAY_COMMA_SHOWN)
        await expect(bubble(page)).toContainText(line);
      await expect(bubble(page)).not.toContainText(model);
      expect(await leadRequests()).toHaveLength(4);
      await untilChildTurn(page);
      await expectNowInLog(page);
      await expectInView(speakButton(page));
      await shot(PHOTO.sayComma);

      // '잘 모르겠어요' → 막힌 뒤 고르기 물음은 글에 없고 소리 줄 하나(듣기 단추 — 접근 이름 '물어본 말 듣기')로만 있다(hint_ko 가 비어 한국어 뜻은 없음)
      const choices = LEAD_SCRIPT_CHOICES;
      await pushFakeAi([leadReply(LEAD_SCRIPT.choices.reply)]);
      await dontKnow(page);
      const choiceListen = page.locator('[data-sound-listen="answer"]');
      await expect(choiceListen).toBeVisible({ timeout: STREAM_END_MS });
      await expect(choiceListen).toHaveAttribute(
        "aria-label",
        LISTEN_LABEL.ask,
      );
      await expect(bubble(page)).toContainText("That's okay!");
      await expect(bubble(page)).not.toContainText(choices);
      await expect(page.locator("[data-tori-explanation]")).toHaveCount(0);
      expect(await leadRequests()).toHaveLength(5);
      await untilChildTurn(page);
      await expectNowInLog(page);
      await expectInView(choiceListen);
      await expectInView(speakButton(page));
      await shot(PHOTO.choices);

      // 또 '잘 모르겠어요' → 뜻 줄(say_ko)과 막힌 뒤 한국어 뜻(hint_ko — 1~3단계는 첫 막힘부터, 말풍선 아래 글이고 읽지 않음)이 함께
      await pushFakeAi([leadReply(LEAD_SCRIPT.hintKo.reply)]);
      await dontKnow(page);
      const explanation = page.locator("[data-tori-explanation]");
      await expect(explanation).toHaveText(LEAD_SCRIPT_HINT_KO, {
        timeout: STREAM_END_MS,
      });
      await expect(bubble(page)).toContainText("I like this.");
      expect(await leadRequests()).toHaveLength(6);
      await untilChildTurn(page);
      await expect(koLine(page)).toHaveText(LEAD_SCRIPT_HINT_SAY_KO);
      await expectNowInLog(page);
      await expectInView(explanation);
      await expectInView(speakButton(page));
      if (way === "portrait") await expectLessonInView(page, { stop: true });
      await shot(PHOTO.hintKo);

      // 앞선 대화 차례를 채우고 쪽을 다시 연다(이어 하기 — AI 없이 마지막 선생님 말부터). 다음 말 차례에서 셈이 참고 턴에 닿는다
      const target = await targetTurnsOf(LEVEL);
      await insertExchanges(
        sessionId,
        target - 1 - LEAD_SCRIPT_COUNTED_BEFORE_INSERT,
      );
      const calls = (await fakeAiRequests()).length;
      await page.reload();
      await page.getByRole("button", { name: T.start }).click();
      await untilChildTurn(page);
      expect((await fakeAiRequests()).length).toBe(calls);
      await expectNowInLog(page);
      await expectInView(speakButton(page));

      // 마무리 차례: 말 칸에 물음이 없으니 앱이 지금 상수 물음을 붙이고 두 단추가 나온다
      await pushFakeAi([leadReply(LEAD_SCRIPT.closing.reply)]);
      await speak(page);
      const choice = page.locator("[data-talk-choice]");
      await expect(choice).toBeVisible({ timeout: STREAM_END_MS });
      await expect(bubble(page)).toContainText(MORE_PROMPT.en);
      const closingBody = (await leadRequests()).at(-1)?.bodyText ?? "";
      expect(closingBody).toContain("This is the closing turn.");
      await expectNowInLog(page);
      await expectInView(choice);
      await shot(PHOTO.closing);

      // '더 이야기하기' → 아이 말 없는 턴 요청(more) 하나 → 선생님 말이 새 말풍선으로, 두 단추는 사라진다
      const before = (await leadRequests()).length;
      const moreSay = LEAD_SCRIPT.more.reply.say;
      await pushFakeAi([leadReply(LEAD_SCRIPT.more.reply)]);
      await choice.getByRole("button", { name: T.more }).click();
      // 말풍선은 문장마다 흐르는 글(aria-hidden)과 전체 글(sr-only)을 나란히 두므로(tori.tsx) 문장 하나씩 본다 — 두 문장을 이은 글은 textContent 에 없다
      const moreSentences = sentencesOf(moreSay);
      for (const sentence of moreSentences)
        await expect(bubble(page)).toContainText(sentence, {
          timeout: STREAM_END_MS,
        });
      await expect(choice).toHaveCount(0);
      const afterMore = await leadRequests();
      expect(afterMore).toHaveLength(before + 1);
      expect(afterMore.at(-1)?.bodyText ?? "").toContain(MORE_LINE);
      // 지금 회화 턴 요청('Closing: no')은 인사 차례 하나뿐이다(새 엔진 차례 · 아이 말 없는 차례는 지금 요청을 보내지 않음)
      expect(await talkTurnRequests()).toBe(1);
      await untilChildTurn(page);
      await expectNowInLog(page);
      await expectInView(speakButton(page));
      await shot(PHOTO.more);

      // 아이 말 → 마무리 제안(move wrap_up): 마무리 제안 길이라 말하기와 두 단추가 함께 나온다(화면 검토 M-4 — 먹색 큰 단추 둘)
      await pushFakeAi([leadReply(LEAD_SCRIPT.wrapUp.reply)]);
      await speak(page);
      await expect(choice).toBeVisible({ timeout: STREAM_END_MS });
      for (const sentence of sentencesOf(LEAD_SCRIPT.wrapUp.reply.say))
        await expect(bubble(page)).toContainText(sentence);
      await expect(speakButton(page)).toBeVisible();
      await expectNowInLog(page);
      await expectInView(choice);
      await expectInView(speakButton(page));
      if (way === "portrait") await expectLessonInView(page, { stop: true });
      await shot(PHOTO.wrapUp);

      // '그만하기' → 정리(참여 완료 뒤라 확인 쪽지 없음)
      await page.locator("[data-talk-stop]").click();
      const wrapAll = page.locator("[data-wrap-all]");
      await expect(wrapAll).toBeVisible({ timeout: STREAM_END_MS });
      for (const sentence of moreSentences)
        await expect(page.locator("[data-wrap-log]")).toContainText(sentence);
      await expectInView(wrapAll.locator("[data-speak]"));
      if (way === "portrait") await expectLessonInView(page, { stop: false });
      await shot(PHOTO.wrap);
    });
  }
});

/** 말 칸 → 문장(서버가 흘려 보내는 단위 — 마침표 · 느낌표 · 물음표 뒤). */
function sentencesOf(say: string): string[] {
  return (say.match(/[^.!?]+[.!?]+/g) ?? [say]).map((s) => s.trim());
}

// 회화 새 엔진(talk.lead_mode claude — 'Claude 주도' spec 설계 3 · 8 · 13절 C240 · C241, 묶음 S3) 수업 한 번의 화면 e2e. 3단계 단원 1(안내문
// 글이 있는 단원 — 13절 C241 보완)의 견본 수업을 넣고, 처음 열 때 설정을 claude 로 두어 처음 스냅숏이 새 방식이 되게 한다. 흐름: 인사(지금 길)
// → 대화 토막의 첫 차례(토막 넘김의 leadTurn start → 아이 말 없는 턴 요청, 뜻 줄) → 아이 답 → 1~3단계 따라 할 문장의 소리 줄(글 없이 듣기
// 단추, 글 뒤) → '잘 모르겠어요' → 되묻는 차례(막힌 뒤 고르기 물음이 소리 줄) → 또 '잘 모르겠어요' → 막힌 뒤 한국어 뜻(hint_ko) → (앞선 대화
// 차례는 DB 에 바로 넣고 쪽을 다시 엶 — 이어 하기) → 마무리 차례의 두 단추 → '더 이야기하기'(leadTurn more → 턴 요청) → '그만하기' → 정리.
// 가짜 Anthropic 은 사실 알림 머리 줄(TALK_LEAD_STATUS_HEAD)로 새 엔진 요청을 가른다. 화면 검토 사진은 E2E_PHOTOS 가 있을 때
// test-results/photos/talk-lead-*.png(photos.ts, 아이패드 두 방향) — 정본 15절 AC-26m 이 켜기 전에 캡처로 보라는 여섯(마무리 차례의 두 단추 ·
// 듣기 단추의 자리 · 뜻 줄 · 되묻는 차례의 듣기 단추 · 힌트 단추가 없는 차례 · 막힌 뒤 hint_ko)을 이 한 번에 남기고, 이름에 보이는 것을 적는다.
// 가짜 응답은 좁은 정의에 걸리지 않는 1단계 낱말로 쓴다. 이 Mac 은 e2e DB(embedded-postgres)가 뜨지 않아 CI 에서 돈다.
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
  TALK_MODEL_LOW,
  talkHousehold,
  talkLessonCard,
  talkLessonReply,
  talkScript,
  talkTurnRequests,
} from "./talk";

const T = {
  start: "시작!",
  micOk: "알겠어요",
  more: "더 이야기하기",
} as const;
/** AC-26m 화면 캡처 이름(보이는 것을 이름에 — 검토 rev-s3 M-3 · 고침 1 브리프 4). */
const PHOTO = {
  first: "talk-lead-first-ko-line-no-hint-button",
  model: "talk-lead-model-repeat-listen-button-after-text",
  choices: "talk-lead-stuck-choices-listen-button",
  hintKo: "talk-lead-stuck-hint-ko",
  closing: "talk-lead-closing-two-buttons",
  more: "talk-lead-more-talk",
  wrap: "talk-lead-wrap",
} as const;
const LONG = 180_000;
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
function leadReply(over: Record<string, unknown>): FakeRule {
  return {
    when: { bodyIncludes: TALK_LEAD_STATUS_HEAD },
    reply: {
      kind: "stream",
      body: messageBody({
        model: TALK_MODEL_LOW,
        json: {
          reading: "clear_answer",
          move: "react_and_follow_up",
          say: "Nice!",
          say_ko: "",
          model_sentence: "",
          hint_ko: "",
          hint_en: "",
          goal_words_i_said: [],
          child_used_on_own: [],
          ...over,
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
  test("AC-26c · AC-26m 대화 첫 차례(뜻 줄) → 아이 답 → 따라 할 문장 소리 줄 → 막힌 뒤 되묻는 고르기 소리 줄 → 막힌 뒤 한국어 뜻 → 마무리 차례 두 단추 → 더 이야기하기 → 그만하기(아이 말 없는 차례는 턴 요청 하나씩)", async ({
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
      talkScript(Array.from({ length: 8 }, () => saidRun("I like it."))),
    );
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
    const opening = "Hello again! Do you like it?";
    const openingKo = "또 만나서 반가워! 너는 그거 좋아하니?";
    await pushFakeAi([
      talkLessonReply({ tori_en: "Great! Now let's start!" }),
      retryReply("Do you like it?"),
      leadReply({
        say: opening,
        say_ko: openingKo,
        move: "react_and_follow_up",
      }),
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
    await photo(page, PHOTO.first);

    // 아이 답 → 1~3단계 따라 할 문장: 말풍선 글에 없고 글 뒤 듣기 단추(소리 줄)로만 있다
    const model = "I like it.";
    await pushFakeAi([
      leadReply({
        say: `Great! Say it with me. ${model}`,
        say_ko: "좋아! 나랑 같이 말해 봐.",
        move: "model_repeat",
        model_sentence: model,
      }),
    ]);
    await speak(page);
    const listen = page.locator('[data-sound-listen="model"]');
    await expect(listen).toBeVisible({ timeout: STREAM_END_MS });
    await expect(bubble(page)).toContainText("Great!");
    await expect(bubble(page)).not.toContainText(model);
    expect(await leadRequests()).toHaveLength(2);
    await untilChildTurn(page);
    await photo(page, PHOTO.model);

    // '잘 모르겠어요' → 되묻는 차례: 막힌 뒤 고르기 물음은 글에 없고 소리 줄 하나(듣기 단추)로만 있다(뜻 hint_ko 가 비어 한국어 뜻은 없음)
    const choices = "Cats or dogs?";
    await pushFakeAi([
      leadReply({
        reading: "does_not_know",
        move: "easier_or_choices",
        say: `That's okay! ${choices}`,
      }),
    ]);
    await dontKnow(page);
    const choiceListen = page.locator('[data-sound-listen="answer"]');
    await expect(choiceListen).toBeVisible({ timeout: STREAM_END_MS });
    await expect(bubble(page)).toContainText("That's okay!");
    await expect(bubble(page)).not.toContainText(choices);
    await expect(page.locator("[data-tori-explanation]")).toHaveCount(0);
    expect(await leadRequests()).toHaveLength(3);
    await untilChildTurn(page);
    await photo(page, PHOTO.choices);

    // 또 '잘 모르겠어요' → 막힌 뒤 한국어 뜻(hint_ko — 1~3단계는 첫 막힘부터, 말풍선 아래 글이고 읽지 않음)
    const hintKo = "고양이가 좋으면 고양이라고 말해 봐요.";
    await pushFakeAi([
      leadReply({
        reading: "does_not_know",
        move: "share_about_me",
        say: "That's okay. I like cats. And you?",
        hint_ko: hintKo,
      }),
    ]);
    await dontKnow(page);
    await expect(page.locator("[data-tori-explanation]")).toHaveText(hintKo, {
      timeout: STREAM_END_MS,
    });
    await expect(bubble(page)).toContainText("I like cats.");
    expect(await leadRequests()).toHaveLength(4);
    await untilChildTurn(page);
    await photo(page, PHOTO.hintKo);

    // 앞선 대화 차례를 채우고 쪽을 다시 연다(이어 하기 — AI 없이 마지막 선생님 말부터)
    const target = await targetTurnsOf(LEVEL);
    await insertExchanges(sessionId, target - 2);
    const calls = (await fakeAiRequests()).length;
    await page.reload();
    await page.getByRole("button", { name: T.start }).click();
    await untilChildTurn(page);
    expect((await fakeAiRequests()).length).toBe(calls);

    // 마무리 차례: 말 칸에 물음이 없으니 앱이 지금 상수 물음을 붙이고 두 단추가 나온다
    await pushFakeAi([
      leadReply({ say: "You did great today!", move: "react_only" }),
    ]);
    await speak(page);
    const choice = page.locator("[data-talk-choice]");
    await expect(choice).toBeVisible({ timeout: STREAM_END_MS });
    await expect(bubble(page)).toContainText(MORE_PROMPT.en);
    const closingBody = (await leadRequests()).at(-1)?.bodyText ?? "";
    expect(closingBody).toContain("This is the closing turn.");
    await photo(page, PHOTO.closing);

    // '더 이야기하기' → 아이 말 없는 턴 요청(more) 하나 → 선생님 말이 새 말풍선으로, 두 단추는 사라진다
    const before = (await leadRequests()).length;
    const moreSay = "Yay! Let's talk more.";
    await pushFakeAi([leadReply({ say: moreSay, move: "react_only" })]);
    await choice.getByRole("button", { name: T.more }).click();
    await expect(bubble(page)).toContainText(moreSay, {
      timeout: STREAM_END_MS,
    });
    await expect(choice).toHaveCount(0);
    const afterMore = await leadRequests();
    expect(afterMore).toHaveLength(before + 1);
    expect(afterMore.at(-1)?.bodyText ?? "").toContain(MORE_LINE);
    // 지금 회화 턴 요청('Closing: no')은 인사 차례 하나뿐이다(새 엔진 차례 · 아이 말 없는 차례는 지금 요청을 보내지 않음)
    expect(await talkTurnRequests()).toBe(1);
    await untilChildTurn(page);
    await photo(page, PHOTO.more);

    // '그만하기' → 정리(참여 완료 뒤라 확인 쪽지 없음)
    await page.locator("[data-talk-stop]").click();
    await expect(page.locator("[data-wrap-all]")).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await expect(page.locator("[data-wrap-log]")).toContainText(moreSay);
    await photo(page, PHOTO.wrap);
  });
});

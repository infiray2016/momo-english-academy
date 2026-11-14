// 회화 이야기 방식(talk.lead_mode chat — 회화 대화 구조 R spec 설계 6 · 7 · 11, plan 묶음 W) 수업 한 번의 화면 e2e. 3단계 단원 1 의 견본 수업을
// 넣고 처음 열 때 설정을 chat 으로 두어 처음 스냅숏이 이야기 방식이 되게 한다(talk-lead.spec 이 claude 를 넣는 길과 같음). 흐름: 수업 첫 말(입구
// start) → 아이가 아무것도 누르지 않음 → 기다림 시간(talk.chat_quiet_seconds) 뒤 조용함 요청(입구 quiet) → 아이 말풍선 없이 선생님 말풍선이
// 잇달아 쌓임 → 힌트 단추(점 셋 → 응답의 단 목록으로 단, 첫 단의 글) → '잘 모르겠어요'(앱이 아는 막힘) → 다음 선생님 차례의 끝 줄에 설명 기다림 →
// 막힌 뒤 한국어 설명이 말풍선 아래 늦은 글로 붙음. 가짜 Anthropic 은 요청 본문의 글로 대화 호출(안내문 마지막 문단) · 힌트 호출(힌트 안내문 첫
// 문단)을 가른다(통합 시험 talk-fixture CHAT_SYSTEM_MARK 와 같은 글). 화면 검토 사진은 E2E_PHOTOS 가 있을 때 test-results/photos/talk-chat-*.png
// (photos.ts, 아이패드 두 방향). 이 Mac 은 e2e DB 가 뜨지 않아 CI 에서 돈다(로컬에서 돌려 보지 않은 시험 — 묶음 W 보고).
import type { Page } from "@playwright/test";
import { type FakeRule, messageBody } from "../fixtures/ai/fake-anthropic";
import { closeE2eDb, resetHousehold, withHouseholdSetting } from "./db";
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
  talkScript,
} from "./talk";

const T = {
  start: "시작!",
  micOk: "알겠어요",
} as const;
/** 화면 검토 사진 이름(보이는 것을 이름에). */
const PHOTO = {
  quiet:
    "talk-chat-quiet-teacher-bubbles-stacked-no-child-bubble-and-hint-loading-dots",
  hint: "talk-chat-hint-tier-from-reply",
  explain: "talk-chat-explain-after-stuck-under-bubble",
} as const;
const LONG = 240_000;
const STREAM_END_MS = 30_000;
const LEVEL = 3;
const LEAD_MODE_KEY = "talk.lead_mode";
/** 화면의 턴 요청 길(talk-stream TALK_TURN_PATH). */
const TURN_PATH = "/api/talk/turn";
/** 이야기 방식 대화 호출을 가르는 글(talk-chat CHAT_SYSTEM_TEMPLATE 마지막 문단 — 통합 시험 talk-fixture CHAT_SYSTEM_MARK 와 같은 글). */
const CHAT_MARK = "Output JSON only, with the fields in this order.";
/** 힌트 호출을 가르는 글(talk-chat-hint 안내문 첫 문단). */
const HINT_MARK = "The child pressed the hint button";
/** 힌트 · 설명 호출의 늦음(ms, 시험 값 — 받는 동안의 점 셋이 사진에 찍히게). */
const HINT_DELAY_MS = 3000;
/** 기다림 시간(talk.chat_quiet_seconds 시드 잠정 8초)보다 넉넉히 — 조용함 요청이 나갈 때까지 기다리는 상한(ms, 시험 값). */
const QUIET_WAIT_MS = 30_000;

const SAY = {
  opening: "Hi Momo! I went to the lake today.",
  quiet: "The ducks were so cute.",
  afterStuck: "That is okay. Do you like ducks?",
} as const;
const HINT_JSON = {
  hint_ko: "나도 오리가 좋아요.",
  hint_en: "I like ducks too.",
  explain_ko: "선생님이 오리를 좋아하는지 물었어요.",
};

test.beforeEach(async () => {
  await resetHousehold();
  await resetFakeAi();
});
test.afterEach(resetFakeAi);
test.afterAll(closeE2eDb);

/** 이야기 방식 대화 호출 응답(네 칸 — listen_sentence · say · say_ko · wrap_up, 흘려 받기). */
function chatReply(say: string, sayKo = ""): FakeRule {
  return {
    when: { bodyIncludes: CHAT_MARK },
    reply: {
      kind: "stream",
      body: messageBody({
        model: TALK_MODEL_LOW,
        json: { listen_sentence: "", say, say_ko: sayKo, wrap_up: false },
      }),
      chunks: 4,
    },
    times: 1,
  };
}

/** 힌트 호출 응답(hint_ko · hint_en · explain_ko — 막힌 뒤 설명도 같은 호출). */
function hintReply(times = 2): FakeRule {
  return {
    when: { bodyIncludes: HINT_MARK },
    reply: {
      kind: "message",
      body: messageBody({ model: TALK_MODEL_LOW, json: HINT_JSON }),
      delayMs: HINT_DELAY_MS,
    },
    times,
  };
}

async function chatRequests() {
  return (await fakeAiRequests()).filter((r) => r.bodyText.includes(CHAT_MARK));
}

/**
 * 화면이 보낸 턴 요청 본문을 모은다(조용함 요청은 lead quiet 로 센다 — 대화 호출의 본문으로 세면 안내문에 든 같은 괄호 글 때문에 모든 대화 호출이
 * 걸린다, 코드 검토 rev-chat-w I-3).
 */
function turnRequestsOf(page: Page): Record<string, unknown>[] {
  const bodies: Record<string, unknown>[] = [];
  page.on("request", (request) => {
    if (request.method() !== "POST" || !request.url().endsWith(TURN_PATH))
      return;
    try {
      bodies.push(JSON.parse(request.postData() ?? "{}"));
    } catch {
      // 본문이 JSON 이 아니면 세지 않는다
    }
  });
  return bodies;
}
const quietCount = (bodies: Record<string, unknown>[]) =>
  bodies.filter((b) => b.lead === "quiet").length;

const bubble = (page: Page) => page.locator("[data-tori-bubble]");
const childTurn = (page: Page) => page.locator("[data-child-turn]");
const hintButton = (page: Page) =>
  page.locator("[data-child-turn] [data-hint-button]");

async function untilChildTurn(page: Page) {
  await expect(childTurn(page)).toBeVisible({ timeout: STREAM_END_MS });
  await expect(
    page.locator("[data-talk-panel][data-talk-reading]"),
  ).toHaveCount(0, { timeout: STREAM_END_MS });
}

test.describe("회화 이야기 방식 수업(3단계 단원 1)", () => {
  test("AC-27f · AC-27g · AC-27l(화면) 조용함 차례(아이 말풍선 없이 선생님 말풍선이 쌓임) → 힌트 단(점 셋 → 응답의 단 목록) → '잘 모르겠어요' → 막힌 뒤 설명(말풍선 아래 늦은 글)", async ({
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
    const page = await speechPage(
      context,
      talkScript(Array.from({ length: 6 }, () => saidRun("I like ducks"))),
    );
    const turnBodies = turnRequestsOf(page);
    // 수업 첫 말 · 조용함 차례 · 막힌 뒤 차례의 대화 호출과 힌트 · 설명 호출(차례대로 하나씩 쓴다)
    await pushFakeAi([
      chatReply(SAY.opening, "안녕 모모! 나는 오늘 호수에 갔어."),
      chatReply(SAY.quiet, "오리가 정말 귀여웠어."),
      chatReply(SAY.afterStuck, "괜찮아. 너는 오리 좋아해?"),
      hintReply(),
    ]);
    await withHouseholdSetting(LEAD_MODE_KEY, "chat", async () => {
      // 처음 열 때 처음 스냅숏에 이야기 방식이 적힌다
      await page.goto(`/session/${sessionId}`);
      await expect(page.locator("[data-talk-start]")).toBeVisible();
    });
    await page.getByRole("button", { name: T.start }).click();
    await expect(page.locator("[data-mic-notice]")).toBeVisible();
    await page.getByRole("button", { name: T.micOk }).click();

    // 수업 첫 말(입구 start) → 아이 차례. 끝 줄에 힌트 표지가 있어 질문 없는 말 뒤에도 힌트 단추가 있다
    await expect(bubble(page)).toContainText(SAY.opening, {
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(page);
    await expect(hintButton(page)).toBeVisible();

    // 아무것도 누르지 않으면 기다림 시간 뒤 조용함 요청 하나 → 아이 말풍선 없이 선생님 말풍선이 이어 쌓인다
    await expect(bubble(page)).toContainText(SAY.quiet, {
      timeout: QUIET_WAIT_MS,
    });
    expect(quietCount(turnBodies)).toBe(1);
    // 대화 호출은 수업 첫 말과 조용함 차례 둘
    expect(await chatRequests()).toHaveLength(2);
    await expect(page.locator("[data-talk-log]")).toContainText(SAY.opening);
    await expect(page.locator("[data-talk-log] [data-child-said]")).toHaveCount(
      0,
    );
    await untilChildTurn(page);

    // 힌트: 누르면 그 단 자리에 점 셋 → 응답의 첫 단(뜻) 글. 단 수는 응답이 정한다. 누름은 입력이라 이 차례의 조용함 타이머를 거둔다 — 사진을
    // 찍는 동안 둘째 조용함이 나가지 않게 사진보다 먼저 누른다
    await hintButton(page).click();
    const firstTier = page.locator("[data-hint-tier]").first();
    await expect(firstTier).toBeVisible();
    await expect(firstTier.locator("[data-hint-loading]")).toBeVisible();
    await photo(page, PHOTO.quiet);
    await expect(firstTier).toContainText(HINT_JSON.hint_ko, {
      timeout: STREAM_END_MS,
    });
    await photo(page, PHOTO.hint);

    // '잘 모르겠어요'(앱이 아는 막힘) → 다음 선생님 차례의 끝 줄에 설명 기다림 → 말풍선 아래 늦은 설명(읽지 않음)
    await page.locator("[data-child-turn] [data-dont-know]").click();
    await expect(bubble(page)).toContainText(SAY.afterStuck, {
      timeout: STREAM_END_MS,
    });
    await expect(page.locator("[data-tori-explanation]")).toContainText(
      HINT_JSON.explain_ko,
      { timeout: STREAM_END_MS },
    );
    await untilChildTurn(page);
    // 조용함 요청은 여전히 하나이고 아이 말 요청은 '잘 모르겠어요' 하나(사진 전에 센다 — 설명 뒤 기다림 시간이 지나면 이 차례의 조용함이 나갈 수 있음)
    expect(quietCount(turnBodies)).toBe(1);
    expect(turnBodies.filter((b) => b.input !== undefined)).toHaveLength(1);
    await photo(page, PHOTO.explain);
  });
});

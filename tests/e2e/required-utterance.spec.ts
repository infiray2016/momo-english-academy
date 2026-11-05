// 필수 경로 가(정본 9절 · 15절 AC-23f · AC-23a (4), UI · UX plan 묶음 0-마 · spec 설계 3, C179): 아이가 말로 낸 말은 그 말에 대한 다음 반응이
// 화면에 올 때까지 남고, 보낸 뒤 빈 화면이 없다. 회화 1단계 · 4단계에서 말로 보낸 턴마다(1~3단계의 바로 보낸 턴 포함) 아이 말풍선
// (data-child-said)이 보낸 때(앱이 회화 턴 요청 fetch 를 부른 때 — 쪽 시계)부터 다음 선생님 말(첫 문장 · 쉬는 안내 · 끝인사)이 보일 때까지 200ms 표본마다
// 끊김 없이 있고 글이 인식 글과 같으며, 보낸 뒤 ui.wait_hint_seconds 첫 값(시험 DB 의 설정값) 안에 기다림 표시(data-tori-waiting ·
// data-wait-hint) 또는 다음 반응이 보이고, 빈 구간(표본 시각 차)은 5초를 넘지 않는다. 말하기 세션 따라 말하기 · 질문 답의 인식 글
// (data-heard)은 다음 활동으로 넘어갈 때까지 남는다.
// 재는 법: 회화 턴은 가짜 Anthropic SSE(talkLessonReply — 첫 문장을 늦춰 기다림을 볼 틈), 듣기는 가짜 Web Speech 대본. 표본은 screen-sampler.
// 회화 견본은 새 꼴 인사 → 대화 카드(greetingTalkLesson + 프로필 짧은 준비 방식 when_needed(skipStartPrep) — 짧은 준비 없음, 회화 plan
// 묶음 12 가 옛 꼴 견본에서 옮김 · e2e 첫 실행 묶음 B). 새 흐름의 인사 턴은 소리
// 줄이 없어 1~3단계도 인식 확인을 거친다(옛 흐름의 '바로 보낸 인사 턴'은 1단계 답 두 개가 있을 때였다). 1~3단계 바로 보낸 턴은 AI 차례가
// 선택지(소리 줄 choices)를 들려준 뒤 아이가 그 하나를 말한 턴이다(child-turn confirmPlanOf autoSend — 묶음 12 fix 1 I-1).
// 상태: '작성됨'(tsc · lint) — 이 Mac 에서는 돌릴 수 없고(내장 Postgres), '실행 통과'는 11-01 뒤 CI e2e 에서 확인한다(plan '필수 둘'). 대화
// 기록 칸(회화 spec C119)의 단언은 회화 구현(묶음 6)이 화면을 바꿀 때 더한다.
import type { BrowserContext, Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
import type { TalkCard } from "../../src/core/seed/schema/talk";
import type {
  RecognitionRun,
  SpeechScript,
} from "../../src/core/speech/script";
import { lessons } from "../../src/db/schema/content";
import {
  defaultSettings,
  referenceSet,
  speakingLesson,
} from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  closeE2eDb,
  e2eDb,
  insertSessions,
  resetHousehold,
  settingValueOf,
  withHouseholdSetting,
} from "./db";
import { pushFakeAi, resetFakeAi } from "./fake-ai";
import { expect, loadSpeechScript, speechPage, test } from "./fixtures";
import { insertHousehold } from "./household";
import { E2E_LESSON_NO, insertSampleLesson } from "./lessons";
import {
  firstIndexOf,
  heldUntil,
  longestBlankMs,
  MAX_BLANK_MS,
  SAMPLE_MS,
  type Sample,
  startSampler,
  stopSampler,
  type Watch,
} from "./screen-sampler";
import {
  greetingTalkLesson,
  insertTalkLesson,
  openTalkSession,
  reachSafetyCap,
  saidRun,
  skipStartPrep,
  talkHousehold,
  talkLessonReply,
  talkScript,
} from "./talk";

/** 아이 화면 글(회화 시험 집의 선생님은 미나). */
const T = {
  start: "시작!",
  micOk: "알겠어요",
  send: "보내기",
  next: "다음",
  good: "잘 말했어요",
} as const;
const MS = 1000;
/** 한 시험 시간(턴마다 첫 문장 늦춤 · 읽기 · 인식 확인을 여럿 기다림 — 시험 값). */
const LONG = 120_000;
/** 첫 문장을 늦추는 시간(시험 값 — 기다림 표시가 보일 틈, ui.wait_hint_seconds 첫 값보다 길게). */
const FIRST_DELAY_MS = 2500;
/** 흘려 받기 · 읽기가 끝 줄까지 오는 여유(시험 값). */
const STREAM_END_MS = 30_000;
/** 읽기가 끝난 뒤 다음 누름 앞 틈(conversation.spec 과 같은 까닭 — 시험 값). */
const SETTLE_MS = 250;
/** 반응이 보인 뒤 그 표본이 남을 때까지(표본 둘 — 시험 값). */
const AFTER_REPLY_MS = 400;
/** 회화 턴 요청 경로(앱이 그 경로로 fetch 를 부른 때가 '보낸 때' — 1~3단계는 듣기가 끝나면 저절로 보내므로 누른 때가 아니다). */
const TURN_PATH = "/api/talk/turn";
/** 보낸 처리와 그리기 사이 틈(시험 값 — 아이 말풍선은 요청 앞에 세워지므로 한 프레임이면 되지만 넉넉히). */
const RENDER_SLACK_MS = 100;
/** AI 없이 바로 답하는 갈래의 요청 붙잡기(시험 값 — 표본 여럿이 반응 앞에 들게, ui.wait_hint_seconds 첫 값보다 길게). */
const FAST_REPLY_HOLD_MS = 1500;
/** 대화 안전 상한을 둘째 아이 턴으로(인사 1 + 대화 1 — talk-lesson.spec AC-15j 와 같은 값, 시험 값). */
const SAFETY_MAX_TURNS = 2;
/** 4단계 회화 턴 모델(그 단계 구간, TEST_SETTINGS — 가짜 응답의 답한 모델). */
const TALK_MODEL_MID = TEST_SETTINGS["ai.model.talk_turn.4-6"].value;

/** 회화 표본에서 읽는 것: 아이 말풍선 · 인식 확인 말풍선 · 선생님 말풍선 · 기다림 · 쉬는 안내. */
const TALK_WATCH: Watch = {
  said: { selector: "[data-child-said]" },
  confirm: { selector: "[data-child-confirm] [data-child-bubble]" },
  tori: { selector: "[data-tori-bubble]" },
  waiting: { selector: "[data-tori-waiting], [data-wait-hint]" },
  rest: { selector: "[data-ai-rest]" },
};

test.beforeEach(async () => {
  await resetHousehold();
  await resetFakeAi();
});
test.afterEach(resetFakeAi);
test.afterAll(closeE2eDb);

/** ui.wait_hint_seconds 첫 값(ms, 시험 DB 의 설정값 — '보낸 뒤 1초 안'). */
async function waitHintWithinMs(): Promise<number> {
  const [first] = (await settingValueOf("ui.wait_hint_seconds")) as [
    number,
    number,
  ];
  return first * MS;
}

/** 첫 문장(말풍선에 처음 보이는 줄 — 반응이 왔다고 보는 글). */
const firstSentence = (en: string) => en.split(/(?<=[.!?])\s+/)[0] ?? en;

/**
 * 회화 턴 요청을 보낸 때(쪽 시계 performance.now — 표본 at 과 같은 시계)를 쪽 안에 남긴다: window.fetch 를 감싸 그 경로를 부른 시각을 적는다
 * (앱은 src/lib/talk-stream.ts 에서 전역 fetch 로 보낸다). WebKit 자원 시간 기록은 page.route 로 붙잡은 요청의 시작을 붙잡은 만큼 늦게
 * 재므로(e2e 첫 실행 묶음 F) 쓰지 않는다. page.goto 앞에 부른다(init script 차례).
 */
async function recordTurnSends(page: Page): Promise<void> {
  await page.addInitScript((part: string) => {
    const w = window as unknown as {
      __turnSends?: number[];
      fetch: typeof fetch;
    };
    const sends: number[] = [];
    w.__turnSends = sends;
    const original = w.fetch.bind(window);
    w.fetch = (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      if (url.includes(part)) sends.push(performance.now());
      return original(input, init);
    };
  }, TURN_PATH);
}

/** 쪽 안에 남긴 회화 턴 요청을 보낸 시각들(recordTurnSends). */
async function turnSendsOf(page: Page): Promise<number[]> {
  return page.evaluate(
    () => (window as unknown as { __turnSends?: number[] }).__turnSends ?? [],
  );
}

/** 그 단계 회화 견본(인사 → 대화 — 짧은 준비 건너뜀)과 진행 세션을 넣고 '시작!' → 처음 마이크 안내까지 연다. */
async function openTalkAt(
  context: BrowserContext,
  level: number,
  runs: (card: TalkCard) => RecognitionRun[],
) {
  const profileId = await talkHousehold(level);
  await skipStartPrep(profileId, level);
  const row = await insertTalkLesson({
    level,
    lesson: greetingTalkLesson(level),
  });
  const sessionId = await openTalkSession(profileId, row);
  const card = (row.content as TalkLesson).card;
  const page = await speechPage(context, talkScript(runs(card)));
  await recordTurnSends(page);
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-talk-start]")).toBeVisible();
  await page.getByRole("button", { name: T.start }).click();
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
  return { page, profileId, sessionId, card };
}

/** 아이 차례가 열리고 선생님이 다 읽을 때까지(읽는 중에도 차례는 열린다 — C166 R1, 읽기 끝을 따로 기다림). */
async function untilChildTurn(page: Page) {
  await expect(page.locator("[data-child-turn]")).toBeVisible({
    timeout: STREAM_END_MS,
  });
  await expect(
    page.locator("[data-talk-panel][data-talk-reading]"),
  ).toHaveCount(0, { timeout: STREAM_END_MS });
  await page.waitForTimeout(SETTLE_MS);
}

/** 말하기를 눌러 보낸다: 바로 보내지면 그대로, 인식 확인이 뜨면 '보내기'. */
async function sendTurn(page: Page) {
  await page.locator("[data-child-turn] [data-speak]").click();
  const said = page.locator("[data-child-said]");
  const confirm = page.locator("[data-child-confirm]");
  await expect(said.or(confirm).first()).toBeVisible();
  if (await confirm.isVisible())
    await confirm.getByRole("button", { name: T.send }).click();
  await expect(said).toBeVisible();
}

/** 표본 줄 요약(실패 글 — 표본마다 아이 말풍선 · 선생님 말풍선 · 기다림 · 쉼). */
const brief = (samples: readonly Sample[]) =>
  samples
    .map(
      (s) =>
        `${Math.round(s.at)} said=${s.values.said ?? "-"} tori=${(s.values.tori ?? "-").slice(0, 24)} wait=${s.values.waiting === null ? 0 : 1} rest=${s.values.rest === null ? 0 : 1} shown=${s.shown ? 1 : 0}`,
    )
    .join("\n");

/** 이 표본 동안 회화 턴 요청을 보낸 첫 시각(쪽 시계 — recordTurnSends 가 남긴 fetch 시각). 없으면 시험 실패. */
async function sentAtOf(
  page: Page,
  samples: readonly Sample[],
): Promise<number> {
  const since = samples[0]?.at ?? 0;
  const sendsSince = async () =>
    (await turnSendsOf(page)).filter((t) => t >= since).sort((a, b) => a - b);
  await expect
    .poll(async () => (await sendsSince()).length, {
      message: "이 턴의 회화 턴 요청을 보낸 기록",
      timeout: STREAM_END_MS,
    })
    .toBeGreaterThan(0);
  return (await sendsSince())[0] ?? since;
}

/**
 * 회화 턴 요청을 서버로 보내기 전에 ms 만큼 붙잡는다(시험에서만 — 앱 코드 변경 없음, 0-마 재검토 Important). 쉬는 안내 · 끝인사처럼 서버가
 * AI 없이 바로 답하는 갈래에서 보낸 뒤 반응 앞의 표본을 잡을 창을 만든다. 돌려준 함수로 푼다.
 */
async function delayTurnRequests(
  page: Page,
  ms: number,
): Promise<() => Promise<void>> {
  const pattern = `**${TURN_PATH}`;
  await page.route(pattern, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  });
  return () => page.unroute(pattern);
}

/**
 * 필수 경로 가 한 턴의 단언: 아이 말풍선이 보낸 시각(sentAt) 뒤 첫 표본부터 next(다음 반응이 보인 표본)까지 인식 글 그대로 끊김 없이 있고,
 * 보낸 뒤 waitWithinMs(+ 표본 간격 — 표본으로 보므로 그만큼 늦게 볼 수 있음) 안에 기다림 표시나 다음 반응이 보이며, 빈 구간이
 * MAX_BLANK_MS 이하다. direct 면 그 턴에 인식 확인 말풍선이 한 번도 없다(1~3단계 바로 보낸 턴).
 */
function expectHeldTurn(
  samples: readonly Sample[],
  {
    heard,
    sentAt,
    next,
    waitWithinMs,
    direct = false,
  }: {
    heard: string;
    sentAt: number;
    next: (s: Sample) => boolean;
    waitWithinMs: number;
    direct?: boolean;
  },
) {
  const held = heldUntil(samples, "said", heard, next, {
    fromAt: sentAt + RENDER_SLACK_MS,
  });
  expect(
    held.ok,
    `아이 말풍선이 보낸 때(${Math.round(sentAt)})부터 다음 반응까지 남음\n${brief(samples)}`,
  ).toBe(true);
  const firstSign = firstIndexOf(
    samples,
    (s) => s.at > sentAt && (s.values.waiting !== null || next(s)),
  );
  expect(
    firstSign,
    `보낸 뒤 기다림 표시\n${brief(samples)}`,
  ).toBeGreaterThanOrEqual(0);
  expect((samples[firstSign]?.at ?? 0) - sentAt).toBeLessThanOrEqual(
    waitWithinMs + SAMPLE_MS,
  );
  expect(longestBlankMs(samples)).toBeLessThanOrEqual(MAX_BLANK_MS);
  if (direct)
    expect(samples.every((s) => s.values.confirm === null)).toBe(true);
}

/** 한 턴: 아이 차례 → 표본 시작 → 보냄 → 반응 첫 문장(또는 끝인사)이 말풍선에 보일 때까지 → 표본 멈춤 → 단언. */
async function measuredTurn(
  page: Page,
  {
    heard,
    reply,
    waitWithinMs,
    direct = false,
  }: { heard: string; reply: string; waitWithinMs: number; direct?: boolean },
) {
  await untilChildTurn(page);
  await startSampler(page, TALK_WATCH);
  await sendTurn(page);
  const first = firstSentence(reply);
  await expect(page.locator("[data-tori-bubble]")).toContainText(first, {
    timeout: STREAM_END_MS,
  });
  await page.waitForTimeout(AFTER_REPLY_MS);
  const samples = await stopSampler(page);
  expectHeldTurn(samples, {
    heard,
    sentAt: await sentAtOf(page, samples),
    next: (s) => (s.values.tori ?? "").includes(first),
    waitWithinMs,
    direct,
  });
}

/** 그 카드 대화 첫 질문(첫 필수 질문)의 아이 답 예시(인식 글로 쓴다). */
function firstTurnAnswer(card: TalkCard): string {
  const answer = card.required[0]?.answerExample;
  if (!answer) throw new Error("견본 꼴 — 첫 필수 질문 답 예시");
  return answer;
}

/**
 * 1~3단계 선택지 둘(소리 줄): 단원 단어 없는 이어 묻기의 고르기 답(같은 꼴, 낱말 하나만 다름 — question-check checkChoices). 받침 0 에서 이미 물은 ·
 * 짧은 준비 낱말을 노린 선택지는 서버가 버리고(13절 C202 (1), talk-lesson.ts keptChoicesOf) 2~3단계는 카드 질문에 선택지가 없으므로, 노리는 단어
 * 없이(card_item none · next_targets 빈 목록) 시험 어휘(I · like · it · you) 안에서 고른다. 노림이 비면 두 답의 낱말을 노리는 자리로 본다.
 */
function choicesOf(_card: TalkCard): readonly [string, string] {
  return ["I like it.", "I like you."];
}

test.describe("필수 경로 가 — 회화 아이 말풍선(AC-23f)", () => {
  test.setTimeout(LONG);

  test("AC-23f 회화 1단계: 인사 턴 · 대화 턴 · 선택지를 말해 바로 보낸 턴 모두 아이 말풍선이 보낸 때부터 다음 선생님 말 첫 문장까지 인식 글 그대로 끊김 없이 있고, 보낸 뒤 ui.wait_hint_seconds 첫 값 안에 기다림 표시가 보인다", async ({
    context,
  }) => {
    const greeting = "I'm good.";
    const { page, card } = await openTalkAt(context, 1, (c) => [
      saidRun(greeting),
      saidRun(firstTurnAnswer(c)),
      saidRun(choicesOf(c)[0]),
    ]);
    const waitWithinMs = await waitHintWithinMs();
    const choices = choicesOf(card);
    const replies = [
      "Great! Let's talk.",
      "Wow, that is nice!",
      "Good job!",
    ] as const;
    await pushFakeAi([
      talkLessonReply(
        { tori_en: replies[0] },
        { firstDelayMs: FIRST_DELAY_MS },
      ),
      // 대화 첫 질문 답의 응답: AI 이어 묻기 + 선택지 둘(소리 줄 — 단원 단어 없는 고르기 답, 같은 꼴에서 낱말 하나만 다름. 이미 물은 카드 필수 1
      // 의 낱말을 노린 선택지는 받침 0 에서 서버가 버린다 — 13절 C202 (1))
      talkLessonReply(
        {
          tori_en: `${replies[1]} Do you like it? Listen and say!`,
          choices: [...choices],
          support: "choices",
          next_move: "follow_up",
        },
        { firstDelayMs: FIRST_DELAY_MS },
      ),
      talkLessonReply(
        { tori_en: replies[2] },
        { firstDelayMs: FIRST_DELAY_MS },
      ),
    ]);
    // 인사 턴(새 흐름 — 소리 줄이 없어 인식 확인 뒤 '보내기'든 바로 보내지든 보낸 때부터)
    await measuredTurn(page, {
      heard: greeting,
      reply: replies[0],
      waitWithinMs,
    });
    // 대화 첫 턴(바로 보내지든 인식 확인 뒤 '보내기'든 보낸 때부터)
    await measuredTurn(page, {
      heard: firstTurnAnswer(card),
      reply: replies[1],
      waitWithinMs,
    });
    // 들려준 선택지 하나를 말한 턴은 인식 확인 없이 바로 보내진다(AC-23f '바로 보낸 1~3단계 턴 포함')
    await expect(page.locator("[data-answer-listen]")).toHaveCount(2, {
      timeout: STREAM_END_MS,
    });
    await measuredTurn(page, {
      heard: choices[0],
      reply: replies[2],
      waitWithinMs,
      direct: true,
    });
  });

  test("AC-23f 회화 4단계: 인식 확인 뒤 보낸 턴마다 아이 말풍선이 다음 선생님 말 첫 문장까지 인식 글 그대로 끊김 없이 있고, 보낸 뒤 ui.wait_hint_seconds 첫 값 안에 기다림 표시가 보인다", async ({
    context,
  }) => {
    const greeting = "I'm fine, thank you.";
    const { page, card } = await openTalkAt(context, 4, (c) => [
      saidRun(greeting),
      saidRun(firstTurnAnswer(c)),
    ]);
    const waitWithinMs = await waitHintWithinMs();
    const replies = ["Great to hear!", "That sounds fun!"] as const;
    await pushFakeAi(
      replies.map((tori_en) =>
        talkLessonReply(
          { tori_en },
          { firstDelayMs: FIRST_DELAY_MS, model: TALK_MODEL_MID },
        ),
      ),
    );
    await measuredTurn(page, {
      heard: greeting,
      reply: replies[0],
      waitWithinMs,
    });
    await measuredTurn(page, {
      heard: firstTurnAnswer(card),
      reply: replies[1],
      waitWithinMs,
    });
  });

  test("AC-23f 회화 1단계: 다음 선생님 말이 쉬는 안내일 때도 아이 말풍선이 그 안내가 보일 때까지 끊김 없이 있다", async ({
    context,
  }) => {
    const greeting = "I'm good.";
    const { page, profileId } = await openTalkAt(context, 1, () => [
      saidRun(greeting),
    ]);
    // 이 턴에서 하루 안전 상한에 닿는다 — 서버가 쉬는 안내를 돌려준다
    await reachSafetyCap(profileId);
    await untilChildTurn(page);
    // 쉬는 안내는 AI 없이 바로 온다 — 요청을 붙잡아 반응 앞의 표본을 잡는다
    const release = await delayTurnRequests(page, FAST_REPLY_HOLD_MS);
    await startSampler(page, TALK_WATCH);
    await sendTurn(page);
    await expect(page.locator("[data-ai-rest]")).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await page.waitForTimeout(AFTER_REPLY_MS);
    const samples = await stopSampler(page);
    await release();
    expectHeldTurn(samples, {
      heard: greeting,
      sentAt: await sentAtOf(page, samples),
      next: (s) => s.values.rest !== null,
      waitWithinMs: await waitHintWithinMs(),
    });
  });

  test("AC-23f 회화 1단계: 다음 선생님 말이 끝인사(대화 안전 상한)일 때도 아이 말풍선이 그 끝인사가 보일 때까지 끊김 없이 있다", async ({
    context,
  }) => {
    // 대화 안전 상한을 둘째 아이 턴으로 낮춘다(집 전체 설정 행 — 끝나면 되돌림). 그 턴은 AI 없이 카드 끝인사로 닫힌다(lesson-turn.ts 'safety')
    await withHouseholdSetting(
      "talk.safety_max_turns",
      SAFETY_MAX_TURNS,
      async () => {
        const greeting = "I'm good.";
        const { page, card } = await openTalkAt(context, 1, (c) => [
          saidRun(greeting),
          saidRun(firstTurnAnswer(c)),
        ]);
        const waitWithinMs = await waitHintWithinMs();
        await pushFakeAi([
          talkLessonReply(
            { tori_en: "Great! Let's talk." },
            { firstDelayMs: FIRST_DELAY_MS },
          ),
        ]);
        await measuredTurn(page, {
          heard: greeting,
          reply: "Great! Let's talk.",
          waitWithinMs,
        });
        // 상한 턴(인사 1 + 대화 첫 질문 답 1): 다음 선생님 말은 카드 끝인사(AI 없이 바로 온다 — 요청을 붙잡아 반응 앞의 표본을 잡는다)
        const release = await delayTurnRequests(page, FAST_REPLY_HOLD_MS);
        await measuredTurn(page, {
          heard: firstTurnAnswer(card),
          reply: card.safetyFarewell.en,
          waitWithinMs,
        });
        await release();
        await expect(page.locator("[data-talk-closed]")).toBeVisible();
      },
    );
  });
});

// ── 말하기 세션 인식 글(4절 '인식 결과 표시' — 다음 문항까지) ──

const DEFAULT_OK = loadSpeechScript("default-ok");
/** 한 낱말을 말하고 조용해지는 듣기(앱이 stop 하면 끝). */
const said = (text: string): RecognitionRun => ({
  events: [
    { at: 50, type: "start" },
    { at: 100, type: "audiostart" },
    { at: 200, type: "speechstart" },
    { at: 400, type: "result", results: [{ transcript: text, isFinal: true }] },
  ],
  onStop: [{ at: 50, type: "end" }],
});
const speakingScript = (runs: RecognitionRun[]): SpeechScript => ({
  name: "required-utterance-speaking",
  source: "손으로 씀 — 필수 경로 가 말하기 세션(시험 안에서 수업 낱말로 만듦)",
  recognitions: runs,
  ...(DEFAULT_OK.synthesis ? { synthesis: DEFAULT_OK.synthesis } : {}),
});

test("AC-23f 말하기 세션 따라 말하기: 인식 글이 다음 활동으로 넘어갈 때까지 끊김 없이 남는다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const { profileId } = await insertHousehold({ startLevels: { speaking: 1 } });
  const [lesson] = await e2eDb()
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "speaking"),
        eq(lessons.level, 1),
        eq(lessons.unit, 1),
        eq(lessons.kind, "assigned"),
        eq(lessons.lessonNo, 1),
        eq(lessons.topicVariant, 1),
      ),
    );
  if (!lesson) throw new Error("말하기 수업 없음");
  const word = (lesson.content as { content: { repeat: { words: string[] } } })
    .content.repeat.words[0];
  if (!word) throw new Error("견본 꼴 — 따라 말할 낱말");
  const [sessionId] = await insertSessions([
    {
      profileId,
      area: "speaking",
      level: 1,
      unit: 1,
      lessonId: lesson.id,
      kind: "regular",
      status: "in_progress",
      startedAt: new Date(),
      seedRevision: lesson.revision,
      seedCorrection: lesson.correction,
    },
  ]);
  if (!sessionId) throw new Error("세션 없음");
  const page = await speechPage(context, speakingScript([said(word)]));
  await page.goto(`/session/${sessionId}`);
  const activity = page.locator("[data-activity]");
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await expect(activity).toHaveAttribute("data-activity", "preview");
  await page.getByRole("button", { name: T.next }).click();
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
  await expect(page.locator("[data-repeat-activity]")).toBeVisible();
  const no = await activity.getAttribute("data-activity-no");
  await expect(
    page.locator("[data-repeat-activity] [data-speak][data-speak-waiting]"),
  ).toHaveCount(0, { timeout: STREAM_END_MS });
  await startSampler(page, {
    heard: { selector: "[data-heard]" },
    no: { selector: "[data-activity]", attr: "data-activity-no" },
  });
  await page.locator("[data-repeat-activity] [data-speak]").click();
  // 잘 말했어요 → ui.auto_next_seconds 뒤 저절로 다음 활동
  await expect(activity).not.toHaveAttribute("data-activity-no", no ?? "", {
    timeout: STREAM_END_MS,
  });
  await page.waitForTimeout(AFTER_REPLY_MS);
  const samples = await stopSampler(page);
  const held = heldUntil(samples, "heard", word, (s) => s.values.no !== no);
  expect(
    held.ok,
    samples
      .map((s) => `${Math.round(s.at)} ${s.values.heard} ${s.values.no}`)
      .join("\n"),
  ).toBe(true);
  expect(longestBlankMs(samples)).toBeLessThanOrEqual(MAX_BLANK_MS);
});

test("AC-23f 말하기 세션 질문 답: 인식 글이 '잘 말했어요' 뒤 '다음'으로 다음 활동에 넘어갈 때까지 끊김 없이 남는다", async ({
  context,
}) => {
  test.setTimeout(LONG);
  const { profileId } = await insertHousehold({ startLevels: { speaking: 1 } });
  // 질문 답만 있는 1단계 수업(앱 판정 — AI 없음, speaking.spec AC-5f 의 customLesson 꼴): 시드 수업의 질문 둘
  const [seed] = await e2eDb()
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "speaking"),
        eq(lessons.level, 1),
        eq(lessons.unit, 1),
        eq(lessons.kind, "assigned"),
        eq(lessons.lessonNo, 1),
        eq(lessons.topicVariant, 1),
      ),
    );
  if (!seed) throw new Error("말하기 수업 없음");
  type Question = { en: string; accepted?: string[] };
  const questions = (
    seed.content as { content: { questions: Question[] } }
  ).content.questions.slice(0, 2);
  const answer = questions[0]?.accepted?.[0];
  if (!answer || questions.length < 2) throw new Error("견본 꼴 — 질문 답");
  const sample = speakingLesson(referenceSet(defaultSettings()), 1);
  const lesson = await insertSampleLesson({
    sample: {
      ...sample,
      lesson: {
        ...sample.lesson,
        content: {
          ...sample.lesson.content,
          repeat: { words: [], sentences: [] },
          listening: [],
          questions,
        },
      },
    } as typeof sample,
    // 이 파일 몫의 번호(말하기 1단계 단원 1 배정 — lessons.ts 번호표, 다른 파일과 겹치지 않게, e2e 첫 실행 묶음 G)
    lessonNo: E2E_LESSON_NO.requiredUtteranceQuestions,
  });
  const [sessionId] = await insertSessions([
    {
      profileId,
      area: "speaking",
      level: 1,
      unit: 1,
      lessonId: lesson.id,
      kind: "regular",
      status: "in_progress",
      startedAt: new Date(),
      seedRevision: lesson.revision,
      seedCorrection: lesson.correction,
    },
  ]);
  if (!sessionId) throw new Error("세션 없음");
  const page = await speechPage(context, speakingScript([said(answer)]));
  await page.goto(`/session/${sessionId}`);
  const activity = page.locator("[data-activity]");
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await expect(activity).toHaveAttribute("data-activity", "preview");
  await page.getByRole("button", { name: T.next }).click();
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
  await expect(activity).toHaveAttribute("data-activity", "question");
  const no = await activity.getAttribute("data-activity-no");
  await page.waitForTimeout(SETTLE_MS);
  await startSampler(page, {
    heard: { selector: "[data-activity] [data-heard]" },
    no: { selector: "[data-activity]", attr: "data-activity-no" },
  });
  await page.locator("[data-activity] [data-speak]").click();
  // 맞음 → '잘 말했어요'와 '다음'(질문 답은 저절로 넘기지 않음) — 그 사이에도 인식 글이 남는다
  await expect(page.getByText(T.good)).toBeVisible({ timeout: STREAM_END_MS });
  await page.waitForTimeout(AFTER_REPLY_MS);
  await page.getByRole("button", { name: T.next }).click();
  await expect(activity).not.toHaveAttribute("data-activity-no", no ?? "", {
    timeout: STREAM_END_MS,
  });
  await page.waitForTimeout(AFTER_REPLY_MS);
  const samples = await stopSampler(page);
  const held = heldUntil(samples, "heard", answer, (s) => s.values.no !== no);
  expect(
    held.ok,
    samples
      .map((s) => `${Math.round(s.at)} ${s.values.heard} ${s.values.no}`)
      .join("\n"),
  ).toBe(true);
  expect(longestBlankMs(samples)).toBeLessThanOrEqual(MAX_BLANK_MS);
});

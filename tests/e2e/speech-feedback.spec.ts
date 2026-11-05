// 음성 · 듣기 피드백 e2e(UX 검토 3판 U4-2 · U4-4 · U5-1 · U5-3 · U5-4 · U5-9 · U6-1, 13절 C166 R1 · R2 · R6 — 브리프 A).
// UI · UX 묶음 5-나(spec 2판 R-55 · R-57 · N-19 · AC-23a (5) 말하기 몫): 시작 알림을 내지 않는 가짜 음성(utterances neverStart)으로 듣기 이해 문항 ·
// 따라 말하기 본보기를 들려주지 못하면 '소리가 안 나왔어요. 다시 들어 봐요' · 큰 '다시 듣기', 다시도 못 들려주면 무음 모드 줄(e2e 기기는 iPad Safari)과
// 작은 '다음'이고, 들려주지 못한 채 받은 답 · '다음'은 기술 오류 끝 시도(점수 없음)다. 상태: '작성됨'(정적 — 이 Mac 에서는 돌리지 않음).
// 회화는 1단계 새 꼴 견본 수업(talk.ts — 인사 → 대화 greetingTalkLesson, 짧은 준비 쪽지가 있는 talkLessonCard, 회화 plan 묶음 12 가 옛 꼴
// 견본에서 옮김)을, 말하기는 개발 시드 1단계 수업을 넣고 진행 세션을 연다. 듣기 · 읽어 주기는 가짜 Web Speech 대본,
// 회화 턴은 가짜 Anthropic SSE. 시험 숫자(감시 상한 · 건너뜀 안내 초 · 재시도 수)는 시험용 설정에서 읽는다. 녹음하지 않는다.
import type { BrowserContext, Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
import type {
  RecognitionRun,
  SpeechScript,
  UtteranceRun,
} from "../../src/core/speech/script";
import { lessons } from "../../src/db/schema/content";
import { attempts } from "../../src/db/schema/learning";
import { MIC_STATE_KEY } from "../../src/lib/mic-state";
import {
  defaultSettings,
  referenceSet,
  speakingLesson,
} from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";
import { closeE2eDb, e2eDb, insertSessions, resetHousehold } from "./db";
import { fakeAiRequests, pushFakeAi, resetFakeAi } from "./fake-ai";
import { expect, loadSpeechScript, speechPage, test } from "./fixtures";
import { insertHousehold } from "./household";
import { insertSampleLesson } from "./lessons";
import {
  failingRun,
  greetingTalkLesson,
  insertTalkLesson,
  openTalkSession,
  saidRun,
  TURN_MARK,
  talkHousehold,
  talkLessonCard,
  talkLessonReply,
  talkScript,
} from "./talk";

/** 아이 화면 글(브리프 A · 정본 문구 그대로). */
const T = {
  start: "시작!",
  micOk: "알겠어요",
  next: "다음",
  listening: "듣고 있어요",
  waitReading: "다 읽은 뒤 눌러요",
  skipped: "이건 다음에 다시 해요",
  /** 회화 시험 집의 선생님은 미나(받침 없음 — '가', 검토 A I-2 문구). */
  nospeechMove: "말소리가 안 들려서 미나가 도와줄게요",
  retry: "다시 해 볼래요",
  home: "홈",
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  /** 소리를 들려주지 못함(설계 6 문구 표 — R-57). */
  soundNotice: "소리가 안 나왔어요. 다시 들어 봐요",
  replay: "다시 듣기",
  /** 무음 모드 줄(C111 — 아이패드 사파리, e2e 기기). */
  silentMode: "아이패드 제어 센터에서 무음 모드를 꺼 주세요",
} as const;
const MS = 1000;
const LONG = 120_000;
const MAX_RETRIES = TEST_SETTINGS["speech.max_retries"].value;
const NOSPEECH_DONTKNOW = TEST_SETTINGS["talk.nospeech_dontknow_count"].value;
const SKIP_NOTICE_MS = TEST_SETTINGS["speech.skip_notice_seconds"].value * MS;
const START_TIMEOUT_MS =
  TEST_SETTINGS["speech.speak_start_timeout_seconds"].value * MS;
/** 느린 읽어 주기(시험 값 — 읽는 중의 화면을 볼 틈). */
const SLOW_UTTER_MS = 2500;
/** 흘려 받기 · 감시 상한 여럿을 기다리는 여유(시험 값). */
const WAIT_MS = 30_000;

test.beforeEach(async () => {
  await resetHousehold();
  await resetFakeAi();
});
test.afterEach(resetFakeAi);
test.afterAll(closeE2eDb);

/** 회화 턴 요청 수(끝맺음 턴은 대본 꼴상 없다). */
async function turnRequests(): Promise<number> {
  return (await fakeAiRequests()).filter((r) => r.bodyText.includes(TURN_MARK))
    .length;
}

/** 읽어 주기 꼴을 바꾼 회화 대본(첫 발화는 잠금 풀기). */
function talkScriptWith(
  runs: RecognitionRun[],
  utterances: UtteranceRun[],
): SpeechScript {
  const base = talkScript(runs);
  return {
    ...base,
    synthesis: {
      voices: base.synthesis?.voices ?? [],
      utterances,
    },
  };
}

/** 1단계 회화 세션(짧은 준비 쪽지가 있는 견본이면 full, 아니면 인사 → 대화)을 연다. */
async function openTalk(
  context: BrowserContext,
  script: SpeechScript,
  {
    full = false,
    beforeGoto,
  }: { full?: boolean; beforeGoto?: (page: Page) => Promise<void> } = {},
) {
  const profileId = await talkHousehold(1);
  const row = await insertTalkLesson({
    level: 1,
    lesson: full ? talkLessonCard(1) : greetingTalkLesson(1),
  });
  const sessionId = await openTalkSession(profileId, row);
  const card = (row.content as TalkLesson).card;
  const page = await speechPage(context, script);
  if (beforeGoto) await beforeGoto(page);
  await page.goto(`/session/${sessionId}`);
  return { page, sessionId, card };
}

async function pastStart(page: Page) {
  await expect(page.locator("[data-talk-start]")).toBeVisible();
  await page.getByRole("button", { name: T.start }).click();
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
}

const childSpeak = (page: Page) =>
  page.locator("[data-child-turn] [data-speak]");
const reading = (page: Page) =>
  page.locator("[data-talk-panel][data-talk-reading]");

/** 말소리가 들어오는 데 오래 걸리는 듣기(소리 들어옴 표시를 볼 틈 — 시험 값). */
function lateSoundRun(text: string): RecognitionRun {
  return {
    events: [
      { at: 50, type: "start" },
      { at: 100, type: "audiostart" },
      { at: 1500, type: "soundstart" },
      { at: 1600, type: "speechstart" },
      {
        at: 2500,
        type: "result",
        results: [{ transcript: text, isFinal: true }],
      },
    ],
    onStop: [{ at: 20, type: "end" }],
  };
}

/** 마이크 확인이 되는 인식 객체(소리 들어옴). */
const soundRun: RecognitionRun = {
  events: [
    { at: 50, type: "start" },
    { at: 100, type: "audiostart" },
    { at: 200, type: "soundstart" },
  ],
};

test.describe("회화 — 읽어 주기 감시 · 읽는 중 단추(U5-1 · R1 · R2)", () => {
  test.setTimeout(LONG);

  test("U5-1 R1 대화 턴: 선생님이 읽는 중에도 말하기 단추가 보이고 누르면 읽기를 멈추고 듣는다", async ({
    context,
  }) => {
    const { page } = await openTalk(
      context,
      talkScriptWith(
        [saidRun("I'm good.")],
        [{ startAfter: 0, endAfter: SLOW_UTTER_MS }],
      ),
    );
    await pastStart(page);
    // 글이 다 흐르면 읽기가 끝나기 전에 아이 차례가 열린다
    await expect(childSpeak(page)).toBeVisible();
    await expect(reading(page)).toHaveCount(1);
    await pushFakeAi([talkLessonReply({ tori_en: "Great! Let's talk." })]);
    await childSpeak(page).click();
    // 누르면 읽기를 멈추고(읽는 중 표시 없음) 듣는다
    await expect(reading(page)).toHaveCount(0);
    await expect.poll(turnRequests).toBe(1);
  });

  test("U5-1 R2 읽어 주기 시작 알림이 오지 않는 기기에서도 감시 상한 뒤 짧은 준비 쪽지가 열리고, 읽는 동안 흐린 단추를 누르면 '다 읽은 뒤 눌러요'가 보이며 읽기가 끝나면 켜진다", async ({
    context,
  }) => {
    const { page } = await openTalk(
      context,
      // 잠금 풀기만 읽히고 그 뒤 발화는 시작 알림이 없다(WebKit 사건 없이 사라짐 흉내)
      talkScriptWith(
        [saidRun("I'm good.")],
        [{ startAfter: 0, endAfter: 0 }, { neverStart: true }],
      ),
      { full: true },
    );
    await pastStart(page);
    await pushFakeAi([
      talkLessonReply({ tori_en: "Great! Let's learn words." }),
    ]);
    await childSpeak(page).click();
    // 인사 끝 말을 감시 상한으로 넘기고 짧은 준비 쪽지가 열린다(예전엔 읽기 줄이 비지 않아 멈춤)
    const note = page.locator("[data-prep-note]");
    await expect(note).toBeVisible({ timeout: WAIT_MS });
    // 쪽지가 들려줄 말을 읽는 동안(시작 알림 없음 — 감시 상한까지) 단추는 흐리고 꺼지지 않았다
    const waiting = page.locator(
      "[data-prep-note] [data-speak][data-speak-waiting]",
    );
    await expect(waiting).toBeVisible();
    await expect(waiting).toBeEnabled();
    await waiting.click();
    await expect(page.locator("[data-speak-wait-note]")).toHaveText(
      T.waitReading,
    );
    await expect(page.locator("[data-prep-note] [data-listening]")).toHaveCount(
      0,
    );
    // 감시 상한 뒤 읽기가 끝나 단추가 켜지고 안내는 사라진다
    await expect(
      page.locator("[data-prep-note] [data-speak]:not([data-speak-waiting])"),
    ).toBeVisible({ timeout: START_TIMEOUT_MS * 3 + WAIT_MS });
    await expect(page.locator("[data-speak-wait-note]")).toHaveCount(0);
  });
});

test.describe("회화 — 듣는 중 표시 · 한 줄 안내(U4-2 · U4-4 · U5-4)", () => {
  test.setTimeout(LONG);

  test("U4-2 회화 듣는 동안 말하기 단추 글이 '듣고 있어요'로 바뀌고 소리가 들어오면 소리 들어옴 표시가 붙는다", async ({
    context,
  }) => {
    const { page } = await openTalk(
      context,
      talkScript([lateSoundRun("I'm good.")]),
    );
    await pastStart(page);
    await expect(childSpeak(page)).toBeVisible();
    await expect(reading(page)).toHaveCount(0, { timeout: WAIT_MS });
    await pushFakeAi([talkLessonReply({ tori_en: "Great! Let's talk." })]);
    await childSpeak(page).click();
    const listeningButton = page.locator(
      "[data-child-turn] [data-speak][data-listening]",
    );
    await expect(listeningButton).toContainText(T.listening);
    await expect(
      page.locator("[data-child-turn] [data-speak][data-sound-in]"),
    ).toHaveCount(0);
    await expect(
      page.locator("[data-child-turn] [data-speak][data-sound-in]"),
    ).toBeVisible();
    await expect.poll(turnRequests).toBe(1);
  });

  test("U4-4 회화 짧은 준비 쪽지에서 인식이 speech.max_retries 번 안 되면 '이건 다음에 다시 해요'를 보인 뒤 다음 낱말 쪽지로 간다", async ({
    context,
  }) => {
    const { page, card } = await openTalk(
      context,
      talkScript([
        saidRun("I'm good."),
        ...Array.from({ length: MAX_RETRIES }, () => failingRun("no-speech")),
      ]),
      { full: true },
    );
    if ((card.prep?.length ?? 0) < 2)
      throw new Error("견본 꼴 — 짧은 준비 낱말 둘");
    await pastStart(page);
    await expect(reading(page)).toHaveCount(0, { timeout: WAIT_MS });
    await pushFakeAi([
      talkLessonReply({ tori_en: "Great! Let's learn words." }),
    ]);
    await childSpeak(page).click();
    const note = page.locator("[data-prep-note]");
    await expect(note).toHaveAttribute("data-prep-step", "greeting:0", {
      timeout: WAIT_MS,
    });
    const speak = page.locator(
      "[data-prep-note] [data-speak]:not([data-speak-waiting])",
    );
    for (let i = 0; i < MAX_RETRIES; i++) {
      await speak.click();
      await expect(
        page.locator("[data-prep-note] [data-listening]"),
      ).toHaveCount(0);
    }
    await expect(page.locator("[data-follow-skipped]")).toHaveText(T.skipped);
    // 안내를 speech.skip_notice_seconds 보인 뒤 다음 낱말 쪽지
    await expect(note).toHaveAttribute("data-prep-step", "greeting:1", {
      timeout: SKIP_NOTICE_MS + WAIT_MS,
    });
  });

  test("U5-4 회화 같은 질문에서 말소리 없음이 이어져 '모름'으로 넘어갈 때 '말소리가 안 들려서 미나가 도와줄게요'를 보인 뒤 보낸다", async ({
    context,
  }) => {
    const { page } = await openTalk(
      context,
      talkScript([
        saidRun("I'm good."),
        ...Array.from({ length: NOSPEECH_DONTKNOW }, () =>
          failingRun("no-speech"),
        ),
      ]),
    );
    await pastStart(page);
    await expect(reading(page)).toHaveCount(0, { timeout: WAIT_MS });
    await pushFakeAi([
      talkLessonReply({ tori_en: "Great! Let's talk." }),
      talkLessonReply({ tori_en: "That's okay." }),
    ]);
    await childSpeak(page).click();
    await expect.poll(turnRequests).toBe(1);
    await expect(reading(page)).toHaveCount(0, { timeout: WAIT_MS });
    for (let i = 0; i < NOSPEECH_DONTKNOW; i++) {
      await childSpeak(page).click();
      await expect(
        page.locator("[data-child-turn] [data-listening]"),
      ).toHaveCount(0);
    }
    await expect(page.locator("[data-nospeech-move]")).toHaveText(
      T.nospeechMove,
    );
    // 안내 동안은 아직 보내지 않는다 → speech.skip_notice_seconds 뒤 '모름'으로 보냄
    expect(await turnRequests()).toBe(1);
    await expect
      .poll(turnRequests, { timeout: SKIP_NOTICE_MS + WAIT_MS })
      .toBe(2);
  });
});

test.describe("막힘 화면 '다시 해 볼래요'(U6-1 · U4-5 · R6)", () => {
  test.setTimeout(LONG);

  test("U6-1 회화 막힘 화면의 '다시 해 볼래요'는 마이크가 안 되면 같은 막힘 화면, 되면 같은 자리('시작!')로 돌아간다", async ({
    context,
  }) => {
    const { page } = await openTalk(
      context,
      talkScript([failingRun("not-allowed", 100), soundRun]),
      {
        beforeGoto: async (p) => {
          await p.addInitScript((key) => {
            localStorage.setItem(
              key,
              JSON.stringify({
                state: "unavailable",
                code: "not-allowed",
                at: "2026-10-29T00:00:00Z",
              }),
            );
          }, MIC_STATE_KEY);
        },
      },
    );
    await expect(page.getByText(T.needsMic)).toBeVisible();
    const retry = page.getByRole("button", { name: T.retry });
    // 막힘 판 단추 차례(UI · UX 0-가 [승인 UX3]): 큰 '다시 해 볼래요' · 작은 '홈'
    await expect(
      page.locator('[data-blocked] [data-button-size="big"]'),
    ).toHaveText(T.retry);
    await expect(
      page.locator('[data-blocked] [data-button-size="small"]'),
    ).toHaveText(T.home);
    // 첫 확인은 안 됨 → 같은 막힘 화면
    await retry.click();
    await expect(retry).toBeEnabled({ timeout: WAIT_MS });
    await expect(page.getByText(T.needsMic)).toBeVisible();
    await expect(page.locator("[data-talk-start]")).toHaveCount(0);
    // 둘째 확인은 소리가 들어옴 → 막힘이 풀려 '시작!'
    await retry.click();
    await expect(page.locator("[data-talk-start]")).toBeVisible({
      timeout: WAIT_MS,
    });
    expect(
      await page.evaluate((key) => localStorage.getItem(key), MIC_STATE_KEY),
    ).toBeNull();
  });

  test("U4-5 M-3 회화 짧은 준비 쪽지 둘째 낱말에서 막혔다가 '다시 해 볼래요'로 풀리면 첫 낱말이 아니라 둘째 낱말부터 이어진다", async ({
    context,
  }) => {
    // 견본은 늘 같은 카드다(talk.ts talkLessonCard) — 대본을 만들 낱말을 먼저 읽는다
    const [w0, w1] = talkLessonCard(1).card.prep ?? [];
    if (!w0 || !w1) throw new Error("견본 꼴 — 짧은 준비 낱말 둘");
    const { page } = await openTalk(
      context,
      talkScript([
        saidRun("I'm good."),
        // 첫 낱말은 잘 말함 → 둘째 낱말에서 마이크를 쓸 수 없음 → 다시 확인은 소리가 들어옴
        saidRun(w0),
        failingRun("not-allowed", 100),
        soundRun,
      ]),
      { full: true },
    );
    await pastStart(page);
    await expect(reading(page)).toHaveCount(0, { timeout: WAIT_MS });
    await pushFakeAi([
      talkLessonReply({ tori_en: "Great! Let's learn words." }),
    ]);
    await childSpeak(page).click();
    const speak = page.locator(
      "[data-prep-note] [data-speak]:not([data-speak-waiting])",
    );
    const note = page.locator("[data-prep-note]");
    await expect(note).toHaveAttribute("data-prep-step", "greeting:0", {
      timeout: WAIT_MS,
    });
    await speak.click();
    await expect(note).toHaveAttribute("data-prep-step", "greeting:1", {
      timeout: WAIT_MS,
    });
    await speak.click();
    await expect(page.getByText(T.needsMic)).toBeVisible();
    await page.getByRole("button", { name: T.retry }).click();
    // 풀리면 저장된 차례(첫 낱말은 저장됨)부터 — 둘째 낱말
    await expect(note).toHaveAttribute("data-prep-step", "greeting:1", {
      timeout: WAIT_MS,
    });
    await expect(page.getByText(T.needsMic)).toHaveCount(0);
  });
});

// ── 말하기 세션 따라 말하기(R2 · U4-4) ──

const DEFAULT_OK = loadSpeechScript("default-ok");

function speakingScript(
  runs: RecognitionRun[],
  utterances: UtteranceRun[],
): SpeechScript {
  return {
    name: "speech-feedback-e2e",
    source: "손으로 씀 — 음성 · 듣기 피드백 e2e(브리프 A)",
    recognitions: runs,
    synthesis: {
      voices: DEFAULT_OK.synthesis?.voices ?? [],
      utterances,
    },
  };
}

async function openSpeaking(context: BrowserContext, script: SpeechScript) {
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
  const page = await speechPage(context, script);
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await expect(page.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "preview",
  );
  await page.getByRole("button", { name: T.next }).click();
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
  return page;
}

test.describe("말하기 따라 말하기 — 읽는 중 흐림 · 건너뜀 안내(R2 · U4-4)", () => {
  test.setTimeout(LONG);

  test("R2 U4-4 말하기 따라 말하기: 들어올 때 읽는 동안 단추가 흐리고 누르면 '다 읽은 뒤 눌러요', 인식이 speech.max_retries 번 안 되면 '이건 다음에 다시 해요' 뒤 다음 활동", async ({
    context,
  }) => {
    const page = await openSpeaking(
      context,
      speakingScript(
        Array.from({ length: MAX_RETRIES }, () => failingRun("no-speech")),
        [{ startAfter: 0, endAfter: SLOW_UTTER_MS }],
      ),
    );
    const repeat = page.locator("[data-repeat-activity]");
    await expect(repeat).toBeVisible();
    const activityNo = await page
      .locator("[data-activity]")
      .getAttribute("data-activity-no");
    const waiting = repeat.locator("[data-speak][data-speak-waiting]");
    await expect(waiting).toBeVisible();
    await waiting.click();
    await expect(page.locator("[data-speak-wait-note]")).toHaveText(
      T.waitReading,
    );
    await expect(repeat.locator("[data-listening]")).toHaveCount(0);
    const speak = repeat.locator("[data-speak]:not([data-speak-waiting])");
    for (let i = 0; i < MAX_RETRIES; i++) {
      await speak.click();
      await expect(
        page.locator("[data-activity] [data-listening]"),
      ).toHaveCount(0);
    }
    await expect(repeat).toHaveAttribute("data-skipping", "");
    await expect(repeat).toContainText(T.skipped);
    await expect(page.locator("[data-activity]")).not.toHaveAttribute(
      "data-activity-no",
      activityNo ?? "",
      { timeout: SKIP_NOTICE_MS + WAIT_MS },
    );
  });
});

// ── 말하기 소리를 들려주지 못함(N-19 · AC-23a (5) · R-55 · R-57) ──

/** 모든 읽어 주기가 시작 알림 없이 사라지는 기기(감시가 speech.speak_start_timeout_seconds 뒤 '들려주지 못함'으로 넘김). */
const NEVER_PLAYS: UtteranceRun[] = [{ neverStart: true }];

/** 그 세션 그 활동의 끝 시도(대기열이 보낸 뒤 — 서버가 채점한 점수와 함께). */
async function finalAttempt(sessionId: string, activityNo: number) {
  const rows = await e2eDb()
    .select({ input: attempts.input, score: attempts.score })
    .from(attempts)
    .where(
      and(
        eq(attempts.sessionId, sessionId),
        eq(attempts.activityNo, activityNo),
      ),
    );
  return rows.find((r) => (r.input as { step?: string }).step === "final");
}

/** 듣기 이해 문항만 있는 1단계 말하기 수업(견본 빌더 — 따라 말하기 · 질문 없음)의 진행 세션을 열고 미리보기 '다음'까지. */
async function openListeningOnly(
  context: BrowserContext,
  script: SpeechScript,
) {
  const { profileId } = await insertHousehold({ startLevels: { speaking: 1 } });
  const sample = speakingLesson(referenceSet(defaultSettings()), 1);
  const lesson = await insertSampleLesson({
    sample: {
      ...sample,
      lesson: {
        ...sample.lesson,
        content: {
          ...sample.lesson.content,
          repeat: { words: [], sentences: [] },
          questions: [],
        },
      },
    } as typeof sample,
    lessonNo: 93,
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
  const listening = sample.lesson.content.listening;
  const page = await speechPage(context, script);
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-activity][data-hydrated]")).toHaveCount(1);
  await page.getByRole("button", { name: T.next }).click();
  await expect(page.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "listening",
  );
  return { page, sessionId, listening };
}

test.describe("말하기 — 소리를 들려주지 못함(N-19 · AC-23a (5))", () => {
  test.setTimeout(LONG);

  test("AC-23a (5) N-19 말하기 따라 말하기: 본보기를 들려주지 못하면 안내와 큰 '다시 듣기', 다시도 못 들려주면 무음 모드 줄과 작은 '다음'이 생기고 저절로 넘기지 않으며, '다음'으로 낸 끝 시도는 기술 오류(점수 없음)다", async ({
    context,
  }) => {
    const page = await openSpeaking(context, speakingScript([], NEVER_PLAYS));
    const sessionId = new URL(page.url()).pathname.split("/").at(-1) ?? "";
    const repeat = page.locator("[data-repeat-activity]");
    await expect(repeat).toBeVisible();
    const activityNo =
      (await page
        .locator("[data-activity]")
        .getAttribute("data-activity-no")) ?? "";
    const retry = repeat.locator("[data-sound-retry]");
    await expect(retry).toHaveAttribute("data-sound-retry", "retry", {
      timeout: START_TIMEOUT_MS + WAIT_MS,
    });
    await expect(retry).toContainText(T.soundNotice);
    await expect(retry.locator("[data-sound-retry-replay]")).toHaveText(
      T.replay,
    );
    await expect(retry.locator("[data-sound-retry-next]")).toHaveCount(0);
    await expect(retry.locator("[data-sound-retry-silent]")).toHaveCount(0);
    await expect(repeat).toHaveAttribute("data-sound-heard", "not_played");
    // 다시 듣기도 들려주지 못함 → 무음 모드 줄 · 작은 '다음'
    await retry.locator("[data-sound-retry-replay]").click();
    await expect(retry).toHaveAttribute("data-sound-retry", "next", {
      timeout: START_TIMEOUT_MS + WAIT_MS,
    });
    await expect(retry.locator("[data-sound-retry-silent]")).toHaveText(
      T.silentMode,
    );
    await expect(retry.locator("[data-sound-retry-next]")).toHaveText(T.next);
    // 저절로 건너뛰지 않는다(건너뜀 안내 시간보다 오래 기다려도 같은 활동)
    await page.waitForTimeout(SKIP_NOTICE_MS + START_TIMEOUT_MS);
    await expect(page.locator("[data-activity]")).toHaveAttribute(
      "data-activity-no",
      activityNo,
    );
    await retry.locator("[data-sound-retry-next]").click();
    await expect(page.locator("[data-activity]")).not.toHaveAttribute(
      "data-activity-no",
      activityNo,
      { timeout: WAIT_MS },
    );
    // 기술 오류 끝 시도: 판 2 · speak_fail · 점수 없음(0 이 아님)
    await expect
      .poll(async () => finalAttempt(sessionId, Number(activityNo)), {
        timeout: WAIT_MS,
      })
      .toMatchObject({
        input: { v: 2, techError: "speak_fail" },
        score: null,
      });
  });

  test("AC-23a (5) R-55 말하기 듣기 이해: 대본을 들려주지 못한 채 고른 답은 맞아도 기술 오류로 적혀 점수가 없다(오답 · 0 도 아님)", async ({
    context,
  }) => {
    const { page, sessionId, listening } = await openListeningOnly(
      context,
      speakingScript([], NEVER_PLAYS),
    );
    const first = listening[0];
    if (!first) throw new Error("견본 꼴 — 듣기");
    const activityNo =
      (await page
        .locator("[data-activity]")
        .getAttribute("data-activity-no")) ?? "";
    const retry = page.locator("[data-activity] [data-sound-retry]");
    await expect(retry).toHaveAttribute("data-sound-retry", "retry", {
      timeout: START_TIMEOUT_MS + WAIT_MS,
    });
    await expect(retry).toContainText(T.soundNotice);
    // 들려주지 못한 채 정답을 고른다 → 화면 흐름은 그대로('맞았어요' · '다음')
    await page.locator(`[data-answer-choice="${first.answerNo}"]`).click();
    await expect(page.locator("[data-listening-stage]")).toHaveAttribute(
      "data-listening-stage",
      "right",
    );
    await expect(retry).toHaveCount(0);
    await page.getByRole("button", { name: T.next, exact: true }).click();
    await expect
      .poll(async () => finalAttempt(sessionId, Number(activityNo)), {
        timeout: WAIT_MS,
      })
      .toMatchObject({
        input: {
          v: 2,
          kind: "listening",
          tries: [first.answerNo],
          techError: "speak_fail",
        },
        score: null,
      });
  });
});

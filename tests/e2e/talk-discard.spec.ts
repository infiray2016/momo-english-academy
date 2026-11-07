// iPad 버리는 듣기 e2e(plan 'iPad 버리는 듣기' 묶음 5 · 증명 표 AC-2 · 3 · 4 · 6 · 7 · 9 · 10 · 11 · 12 · N1 의 화면 몫 = 15절 AC-24b · 24c · 24d ·
// 24f · 24g · 24i · 24j · 24k · 24l · AC-N25, 13절 C213 · C214 · C215). 이 파일은 test.use({ discardMode: "ios" })로 돈다 — e2e 기기가 iPad 꼴
// (playwright.config tablet-10-9-webkit)이라 기기 판정까지 타며 spec 설계 8 의 all 과 같은 길이다(plan 정한 것 7, 본 구성은 'off').
// 견본은 3단계 고정 표본(인사 → 대화, 짧은 준비 건너뜀 — talk.ts greetingTalkLesson + skipStartPrep, 쪽지 장면만 짧은 준비 있음)이고, 듣기는
// 진짜 · 버림 차례를 적은 가짜 음성 대본(discard.ts), 회화 턴은 가짜 Anthropic SSE 다. 화면 검토 장면 일곱(묶음 3 구현 보고 7절)은 photos.ts
// 로 talk-discard-<장면 번호>-… 사진을 남긴다(E2E_PHOTOS 때만). 숫자는 시험용 설정에서 읽는다. 녹음하지 않는다. 이 Mac 에서 돌리지 않는다(CI 몫).
import { readFileSync } from "node:fs";
import type { BrowserContext, Page } from "@playwright/test";
import { AVATARS, TOPIC_BUNDLES } from "../../src/core/profile/start";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
import { TalkShortLinesFileSchema } from "../../src/core/seed/schema/reference";
import type { TalkCard } from "../../src/core/seed/schema/talk";
import { bandOf } from "../../src/core/seed/structure";
import { DISCARD_MODE_KEY } from "../../src/core/speech/discard-settings";
import type { RecognitionRun } from "../../src/core/speech/script";
import { TEST_SETTINGS } from "../fixtures/settings";
import { closeE2eDb, resetHousehold, withHouseholdSetting } from "./db";
import {
  attemptsOf,
  captureSent,
  childRowsOf,
  DISCARD_MARKERS,
  DISCARD_TIMES,
  type DiscardScript,
  dead,
  discardScript,
  heldRun,
  installDiscardWatch,
  lateSpeechRun,
  listeningInDiscard,
  listensOf,
  live,
  markPlaces,
  NO_RESULT_RUN,
  pageNow,
  real,
  realsThenDead,
  recognizersOf,
  type Sent,
  SLOW_END_MS,
  speaksDuringReal,
  spokenAtOf,
  startsOf,
  turnBodyCore,
  watchOf,
} from "./discard";
import { pushFakeAi, resetFakeAi } from "./fake-ai";
import { expect, speechPage, test } from "./fixtures";
import { randomPin } from "./household";
import { photo } from "./photos";
import {
  deafRun,
  greetingTalkLesson,
  insertTalkLesson,
  liftSafetyCap,
  openTalkSession,
  pastTurnInFlight,
  reachSafetyCap,
  saidRun,
  skipStartPrep,
  speechRecord,
  talkHousehold,
  talkLessonCard,
  talkLessonReply,
  talkTurnRequests,
  withoutSceneOpener,
} from "./talk";

test.use({ discardMode: "ios" });

/** 화면 글(정본 밖 문구 표 — 화면 CHILD_TURN_TEXT · SPEAK_BUTTON_TEXT · TALK_TEXT · FIRST_RUN_TEXT 와 같은 글, spec 설계 3 · C213 · C215). */
const T = {
  start: "시작!",
  micOk: "알겠어요",
  send: "보내기",
  again: "다시 말하기",
  dontKnow: "잘 모르겠어요",
  lessons: "수업 목록",
  notHeard: "못 들었어요",
  listening: "듣고 있어요",
  preparing: "준비 중이에요",
  sayNow: "말해 보세요",
  micRecover: "잠깐만요, 마이크를 다시 켤게요",
  micDeaf: "마이크가 안 잡혔어요. 한 번 더 눌러 주세요",
  micDeafStuck: "마이크가 계속 안 잡혀요. '잘 모르겠어요'를 눌러 넘어가 주세요",
  waitReading: "다 읽은 뒤 눌러요",
  micDiscard:
    "아이패드에서는 선생님이 말하는 동안에도 마이크가 켜져 있어서 화면 위에 주황색 표시가 보여요. 그동안 들린 소리도 아이패드의 음성 인식이 처리하지만, 앱은 소리를 녹음하지 않고 그 말을 글로도 남기지 않아요.",
  pinAgain: "한 번 더 넣어 주세요",
  displayName: "홈에 보일 이름(한글)",
  alphabetKnown: "알아요",
  next: "다음",
} as const;
const LONG = 180_000;
const STREAM_END_MS = 30_000;
const LEVEL = 3;
const DEAF_SKIP_AFTER = TEST_SETTINGS["speech.deaf_skip_after"].value;
const DEAF_SILENCE_MS = TEST_SETTINGS["speech.deaf_silence_ms"].value;
/** 인사 끝 반응(가짜 AI — 짧은 준비 없는 견본은 그 뒤 대화 첫 질문, required-recovery N-6 과 같은 글). */
const GREETING_REPLY = "Great! Let's talk.";
/** 짧은 준비가 있는 견본의 인사 끝 반응(talk-lesson.spec throughGreetingAndPrep 과 같은 글). */
const PREP_REPLY = "Great! Let's learn some new words!";
/** 대화 반응(시험 어휘 안 — talk-lesson.spec 묶음 10 에서 말풍선에 그대로 나온 글). */
const REPLIES = [
  "Wow! What do you do on Sunday?",
  "Cool! Do you like games?",
  "Nice! Do you like it?",
] as const;
/** 단추를 다시 눌러 멈추기 전에 소리가 들어온 뒤 두는 틈(ms, 시험 값 — discard.ts heldRun 의 결과가 그 안에 온다). */
const HOLD_AFTER_SOUND_MS = 600;
/** 시각 견줌의 여유(ms, 시험 값 — CI 의 WebKit 타이머 · 렌더 지연). */
const TIME_SLACK_MS = 1500;
/** 가짜 음성 타이머 한 번의 여유(ms, 시험 값). */
const TICK_SLACK_MS = 30;
/** 확인 칸 '보내기'를 누르는 상한(ms — 그 사이 talk.confirm_seconds 로 저절로 보내졌으면 누르지 않음). */
const CLICK_MS = 1000;
const POLL_MS = 100;
/** '말해 보세요'를 사진으로 남길 만큼 진짜 안 소리를 늦춤(ms, 시험 값 — 그동안 말소리 없음). */
const LATE_SPEECH_MS = 3000;
/** 선생님이 읽는 동안 누를 만큼 긴 읽기(ms, 시험 값). */
const TEACHER_UTTER_MS = 2500;
/** 짧은 말 · 선생님 줄의 시작 알림을 늦춤(ms, 시험 값 — 시작 알림 전에 누르는 장면, speech.speak_start_timeout_seconds 3초 안). */
const START_DELAY_MS = 2000;
/** 시작 알림 뒤 끝까지(ms, 시험 값). */
const DELAYED_UTTER_MS = 300;
/** 버림이 새로 열리지 않음을 볼 때 기다리는 시간(ms — 판정 · 하한 · end 상한 · 간격을 넉넉히 넘김). */
const NO_NEW_MS =
  DISCARD_TIMES.liveAsMs +
  DISCARD_TIMES.minMs +
  DISCARD_TIMES.endWaitMs +
  DISCARD_TIMES.gapMs;

const SHORT_LINES = TalkShortLinesFileSchema.parse(
  JSON.parse(readFileSync("seed/lists/talk-short-lines.json", "utf8")),
);
/** 그 자리 · 그 단계 구간의 짧은 말 글(seed/lists/talk-short-lines.json — 화면이 돌려 쓰므로 어느 줄인지는 고정하지 않는다). */
const shortEns = (place: "again" | "mic", level = LEVEL): string[] =>
  (SHORT_LINES[place]?.[bandOf(level)] ?? []).map((l) => l.en);

test.beforeEach(async () => {
  await resetHousehold();
  await resetFakeAi();
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

/**
 * 견본을 넣고 회화 쪽을 연다(처음 마이크 안내 '알겠어요'까지). 기본은 짧은 준비 없는 인사 → 대화 견본이고, prep 이면 짧은 준비 낱말이 있는
 * 배정 수업이다. 둘 다 장면 여는 질문 칸을 뺀다(대화 첫 질문 = 카드 첫 필수 질문, 'AI 몫 넓힘' plan 정한 것 3).
 */
async function openTalk(
  context: BrowserContext,
  s: DiscardScript,
  { level = LEVEL, prep = false }: { level?: number; prep?: boolean } = {},
): Promise<Opened> {
  const profileId = await talkHousehold(level);
  if (!prep) await skipStartPrep(profileId, level);
  const lesson = withoutSceneOpener(
    prep ? talkLessonCard(level) : greetingTalkLesson(level),
  );
  const row = await insertTalkLesson({ level, lesson });
  const sessionId = await openTalkSession(profileId, row);
  const page = await speechPage(context, s.script);
  await page.addInitScript(installDiscardWatch);
  const sent = captureSent(page);
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-talk-start]")).toBeVisible();
  await page.getByRole("button", { name: T.start }).click();
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
  return { page, profileId, sessionId, lesson, card: lesson.card, sent, s };
}

const bubble = (page: Page) => page.locator("[data-tori-bubble]");
const speakButton = (page: Page) =>
  page.locator("[data-child-turn] [data-speak]");
const discardLine = (page: Page) =>
  page.locator("[data-child-turn] [data-discard-line]");
const teacherWindow = (page: Page) => page.locator("[data-teacher-window]");
const firstQuestionOf = (card: TalkCard) => card.required[0]?.en ?? "";

/** 아이 차례가 열리고 선생님이 다 읽을 때까지. */
async function untilChildTurn(page: Page) {
  await expect(page.locator("[data-child-turn]")).toBeVisible({
    timeout: STREAM_END_MS,
  });
  await expect(
    page.locator("[data-talk-panel][data-talk-reading]"),
  ).toHaveCount(0, { timeout: STREAM_END_MS });
}

/** 이 턴의 회화 턴 요청이 나갈 때까지: 인식 확인 칸이 뜨면 '보내기'(그 사이 talk.confirm_seconds 로 저절로 보내졌으면 그대로). */
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

/**
 * 말하기 한 번 → (stop 이면 소리가 들어온 뒤 한 번 더 눌러 멈춤) → 보냄. 진짜가 열릴 때까지(버림이 닫히고 간격이 찰 때까지 '준비 중이에요')
 * 기다린다.
 */
async function sayTurn(o: Opened, { stop = false }: { stop?: boolean } = {}) {
  const before = o.sent.turns.length;
  const button = speakButton(o.page);
  await button.click();
  await expect(button).toHaveAttribute("data-listening", "", {
    timeout: STREAM_END_MS,
  });
  if (stop) {
    await expect(button).toHaveAttribute("data-sound-in", "", {
      timeout: STREAM_END_MS,
    });
    await o.page.waitForTimeout(HOLD_AFTER_SOUND_MS);
    await button.click();
  }
  await sendWhenAsked(o, before);
}

/** 인사 한 턴(가짜 AI 반응) → 대화 첫 질문까지(짧은 준비 없는 견본). */
async function throughGreeting(o: Opened) {
  await untilChildTurn(o.page);
  await pushFakeAi([talkLessonReply({ tori_en: GREETING_REPLY })]);
  await sayTurn(o);
  await expect(bubble(o.page)).toContainText(firstQuestionOf(o.card), {
    timeout: STREAM_END_MS,
  });
}

/** 모든 버림이 stop 으로만 닫혔고(abort 0 — F3 · AC-24f), 진짜가 열린 동안 읽기가 없으며(AC-24g), 버림 동안 선생님 창이 '듣기'가 아니다(AC-24b). */
async function expectDiscardRules(o: Opened) {
  const uses = await recognizersOf(o.page, o.s);
  expect(
    uses.filter((u) => u.role === "discard" && u.close === "abort"),
    "버림 객체 abort 0",
  ).toEqual([]);
  expect(await speaksDuringReal(o.page, o.s), "진짜가 열린 동안 읽기").toEqual(
    [],
  );
  expect(
    await listeningInDiscard(o.page, o.s),
    "버림 동안 선생님 창 '듣기'",
  ).toEqual([]);
}

/** 표지 글 · 녹음 API(AC-24l): 버림이 낸 글이 어디에도 없고 getUserMedia · MediaRecorder 호출이 0이다. */
async function expectNoMarkNoRecording(o: Opened) {
  expect(await markPlaces(o.page, o.sessionId, o.sent)).toEqual([]);
  expect((await watchOf(o.page)).media).toEqual({
    getUserMedia: 0,
    recorder: 0,
  });
}

test.describe("iPad 버리는 듣기 — 대화 차례(3단계)", () => {
  test("AC-24b · AC-24g 선생님 말 도중 누르면 읽기가 멈추고 단추가 '준비 중이에요' · 점 셋이 되며(듣는 중 표시 · 선생님 창 듣기 없음), 조건 뒤 진짜 start 하나와 '말해 보세요'가 보이고 소리가 들어오면 지워진다 — 기다리는 동안 다시 눌러도 진짜는 하나다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const s = discardScript(
      [
        real(saidRun("I'm good.")),
        dead({ endAfterStopMs: SLOW_END_MS }),
        real(lateSpeechRun("I like it.", LATE_SPEECH_MS)),
        dead(),
      ],
      { utterMs: TEACHER_UTTER_MS },
    );
    const o = await openTalk(context, s);
    await untilChildTurn(o.page);
    await pushFakeAi([talkLessonReply({ tori_en: GREETING_REPLY })]);
    await sayTurn(o);
    // 대화 첫 질문을 읽는 동안(아이 차례는 읽는 중에도 열린다 — C166 R1) 누른다
    const question = firstQuestionOf(o.card);
    await expect
      .poll(
        async () => (await speechRecord(o.page)).spoken.includes(question),
        {
          intervals: [POLL_MS],
          timeout: STREAM_END_MS,
        },
      )
      .toBe(true);
    const button = speakButton(o.page);
    await expect(button).toBeVisible();
    await expect(
      o.page.locator("[data-talk-panel][data-talk-reading]"),
    ).toHaveCount(1);
    await button.click();
    await expect(button).toHaveAttribute("data-speak-preparing", "");
    await expect(button).toContainText(T.preparing);
    await expect(button.locator("[data-speak-dots]")).toBeVisible();
    await expect(button).not.toHaveAttribute("data-listening", "");
    await expect(button).not.toHaveAttribute("data-sound-in", "");
    await expect(button).not.toContainText(T.listening);
    await expect(teacherWindow(o.page)).not.toHaveAttribute(
      "data-teacher-state",
      "listening",
    );
    // 읽기는 멈춘다(누름 때 읽기 줄을 비움 — spec 설계 2 '듣기가 읽기를 끊음')
    await expect(
      o.page.locator("[data-talk-panel][data-talk-reading]"),
    ).toHaveCount(0);
    expect(await startsOf(o.page)).toBe(2);
    // 기다리는 동안 다시 누름 — 하나로 센다
    await button.click();
    await expect(button).toHaveAttribute("data-speak-preparing", "");
    await photo(o.page, "talk-discard-1-preparing");
    await o.page.emulateMedia({ reducedMotion: "reduce" });
    await photo(o.page, "talk-discard-1-preparing-reduced-motion", [
      "portrait",
    ]);
    await o.page.emulateMedia({ reducedMotion: null });
    // 조건 뒤 진짜 하나 · '말해 보세요'(소리가 들어오면 지움)
    await expect(button).toHaveAttribute("data-listening", "", {
      timeout: STREAM_END_MS,
    });
    await expect(discardLine(o.page)).toHaveText(T.sayNow);
    await expect(button).not.toHaveAttribute("data-speak-preparing", "");
    await expect(teacherWindow(o.page)).toHaveAttribute(
      "data-teacher-state",
      "listening",
    );
    await photo(o.page, "talk-discard-2-say-now");
    expect(await startsOf(o.page)).toBe(3);
    await expect(button).toHaveAttribute("data-sound-in", "", {
      timeout: STREAM_END_MS,
    });
    await expect(discardLine(o.page)).toHaveCount(0);
    await pushFakeAi([
      talkLessonReply({ tori_en: REPLIES[0], next_move: "follow_up" }),
    ]);
    await sendWhenAsked(o, o.sent.turns.length);
    await expect(bubble(o.page)).toContainText("Wow!", {
      timeout: STREAM_END_MS,
    });
    // 진짜는 하나(다시 누름이 둘째 진짜를 열지 않음), 그 앞 버림은 stop 으로 닫힘
    const uses = await recognizersOf(o.page, s);
    expect(uses.map((u) => u.role).slice(0, 3)).toEqual([
      "real",
      "discard",
      "real",
    ]);
    expect(uses[1]?.close).toBe("stop");
    await expectDiscardRules(o);
    // 기록 칸(AC-24j): 그 진짜의 dc — 갈래 discard · 끊긴 읽기(cut) · 누름 → 진짜 기다림
    const [, row] = await childRowsOf(o.sessionId);
    if (!row) throw new Error("대화 첫 아이 행이 없다");
    const dc = listensOf(row).at(-1)?.dc;
    expect(dc?.g).toBe("discard");
    expect(dc?.sk).toBe("cut");
    expect(dc?.w).toBeGreaterThan(0);
    await expectNoMarkNoRecording(o);
  });

  test("AC-24g · AC-24j · AC-24l '말하기 → 한 번 더 눌러 멈춤 → 선생님 말 → 다시 말하기'를 여섯 번 이어도 매번 진짜가 열려 아이 말을 보내고, 진짜 사이마다 버림 하나가 열렸다가 소리 끝 뒤 stop 으로 닫히며, 진짜가 열린 동안 읽기가 없고 버림 글은 어디에도 없다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const said = [
      "I like soccer.",
      "I play games.",
      "I like the beach.",
      "I like it.",
      "I play soccer.",
      "I like games.",
    ];
    const s = discardScript(
      realsThenDead([saidRun("I'm good."), ...said.map((t) => heldRun(t))]),
    );
    const o = await openTalk(context, s);
    await throughGreeting(o);
    for (const [i, text] of said.entries()) {
      await untilChildTurn(o.page);
      const starts = await startsOf(o.page);
      const ai = await talkTurnRequests();
      await pushFakeAi([
        talkLessonReply({
          tori_en: REPLIES[i % REPLIES.length],
          next_move: "follow_up",
        }),
      ]);
      await sayTurn(o, { stop: true });
      // 이 턴의 진짜 하나 + 그 끝에 열린 버림 하나
      await expect
        .poll(() => startsOf(o.page), { message: `${i + 1}번째: ${text}` })
        .toBe(starts + 2);
      await expect
        .poll(talkTurnRequests, { timeout: STREAM_END_MS })
        .toBe(ai + 1);
    }
    await untilChildTurn(o.page);
    const uses = await recognizersOf(o.page, s);
    expect(uses).toHaveLength(2 + said.length * 2);
    // 닫힌 버림은 모두 소리 끝 뒤 stop(하한을 채움 · 안전 상한 전) — 소리 끝 알림이 빠지면 상한에서야 닫힌다
    const closed = uses.filter(
      (u) => u.role === "discard" && u.closeAt !== undefined,
    );
    expect(closed.length).toBeGreaterThanOrEqual(said.length);
    for (const d of closed) {
      expect(d.close).toBe("stop");
      const open = (d.closeAt ?? 0) - d.startAt;
      expect(open).toBeGreaterThanOrEqual(DISCARD_TIMES.minMs - TICK_SLACK_MS);
      expect(open).toBeLessThan(DISCARD_TIMES.capMs);
    }
    await expectDiscardRules(o);
    // 기록 칸: 대화 아이 행마다 그 앞 버림(dc 갈래 discard · 결과 수만)이 있고, pe 는 버림 end 에서 잰다(spec 설계 5)
    const rows = (await childRowsOf(o.sessionId)).slice(1);
    expect(rows).toHaveLength(said.length);
    for (const [i, row] of rows.entries()) {
      const entry = listensOf(row).at(-1);
      expect(entry?.dc?.g, `${i + 1}번째 dc`).toBe("discard");
      expect(entry?.dc?.n ?? 0).toBeGreaterThanOrEqual(1);
      const realUse = uses[2 + i * 2];
      const before = uses[1 + i * 2];
      if (!realUse || !before?.endAt) throw new Error("대본 차례가 어긋났다");
      // 버림 end 사건은 stop + 대본 end 시각 뒤에 오므로 pe 는 그 차이 이하이고, 진짜는 버림 end + 간격 뒤에 열린다. 앞 진짜의 end 에서
      // 쟀다면 버림 길이(하한 이상)만큼 더 컸을 것이다
      const fromDiscardEnd = realUse.startAt - before.endAt;
      expect(entry?.pe ?? -1).toBeGreaterThanOrEqual(
        DISCARD_TIMES.gapMs - TICK_SLACK_MS,
      );
      expect(entry?.pe ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
        fromDiscardEnd + TICK_SLACK_MS,
      );
    }
    await expectNoMarkNoRecording(o);
  });

  test("AC-24c 마이크 안 잡힘 뒤에는 '잠깐만요, 마이크를 다시 켤게요'와 짧은 말(mic)이 나온 뒤 누름 없이 진짜가 열려 '말해 보세요'가 보이고, speech.deaf_skip_after 번째에는 지금 안내가 보이며 턴을 보내지 않는다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    if (DEAF_SKIP_AFTER !== 3)
      throw new Error("시험 차례는 speech.deaf_skip_after 3 을 전제한다");
    const s = discardScript([
      real(saidRun("I'm good.")),
      dead(),
      real(deafRun()),
      dead({ endAfterStopMs: SLOW_END_MS }),
      real(deafRun()),
      dead(),
      real(deafRun()),
      dead(),
    ]);
    const o = await openTalk(context, s);
    await throughGreeting(o);
    await untilChildTurn(o.page);
    const ai = await talkTurnRequests();
    const button = speakButton(o.page);
    const short = o.page.locator("[data-talk-short-line]");
    await button.click();
    await expect(button).toHaveAttribute("data-listening", "", {
      timeout: STREAM_END_MS,
    });
    for (let i = 1; i < DEAF_SKIP_AFTER; i++) {
      // 회복: 선생님 짧은 말(mic) · 안내 한 줄 · 기다림 표시, 그 뒤 누름 없이 진짜
      await expect(discardLine(o.page)).toHaveText(T.micRecover, {
        timeout: DEAF_SILENCE_MS + STREAM_END_MS,
      });
      await expect(short).toBeVisible({ timeout: STREAM_END_MS });
      // 이번 회복의 짧은 말(mic 자리 줄을 i 번째로 읽음 — 앞 회복의 말풍선 글로 견주지 않게)
      const micSpoken = async () =>
        (await speechRecord(o.page)).spoken.filter((t) =>
          shortEns("mic").includes(t),
        );
      await expect
        .poll(async () => (await micSpoken()).length, {
          timeout: STREAM_END_MS,
        })
        .toBe(i);
      const line = (await micSpoken()).at(-1) ?? "";
      await expect(short.locator("p[lang='en']")).toHaveText(line);
      await expect(button).toHaveAttribute("data-speak-preparing", "");
      if (i === 1) await photo(o.page, "talk-discard-4-mic-recover");
      await expect(button).toHaveAttribute("data-listening", "", {
        timeout: STREAM_END_MS,
      });
      await expect(discardLine(o.page)).toHaveText(T.sayNow);
      // 짧은 말이 진짜보다 먼저 읽혔다
      const uses = await recognizersOf(o.page, s);
      const realUse = uses[2 + i * 2];
      const lineAt = (await spokenAtOf(o.page, line)).at(-1);
      expect(lineAt).toBeDefined();
      expect(realUse?.startAt ?? 0).toBeGreaterThan(lineAt ?? 0);
      expect(uses[1 + i * 2]?.closeAt ?? 0).toBeGreaterThan(lineAt ?? 0);
    }
    // speech.deaf_skip_after 번째: 회복 없이 지금 안내
    await expect(
      o.page.locator("[data-child-turn]").getByText(T.micDeafStuck),
    ).toBeVisible({ timeout: DEAF_SILENCE_MS + STREAM_END_MS });
    await o.page.waitForTimeout(NO_NEW_MS);
    await expect(button).not.toHaveAttribute("data-listening", "");
    expect(await startsOf(o.page)).toBe(2 + DEAF_SKIP_AFTER * 2);
    await expect(
      o.page.locator("[data-child-turn]").getByText(T.micDeaf),
    ).toHaveCount(0);
    expect(await talkTurnRequests()).toBe(ai);
    await expectDiscardRules(o);
  });

  test("AC-24c 결과 없음 뒤 회색 '못 들었어요'와 함께 누름 없이 짧은 말(again) 한 줄이 나오고 누르면 진짜가 열리며, 확인 칸의 '다시 말하기'도 짧은 말 한 줄이 끝난 뒤(소리 끝 전 stop 없음) 짧은 말 + 여유 + end + 간격 안에 진짜가 열린다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const utterMs = 30;
    const s = discardScript(
      [
        real(saidRun("I'm good.")),
        dead(),
        real(NO_RESULT_RUN),
        dead(),
        real(saidRun("I like it.")),
        dead(),
        real(saidRun("I like soccer.")),
        dead(),
      ],
      { utterMs },
    );
    const o = await openTalk(context, s);
    await throughGreeting(o);
    await untilChildTurn(o.page);
    const button = speakButton(o.page);
    const short = o.page.locator("[data-talk-short-line]");
    await button.click();
    await expect(
      o.page.locator('[data-child-attempt] [data-child-said="not_heard"]'),
    ).toHaveText(T.notHeard, { timeout: STREAM_END_MS });
    await expect(short).toBeVisible({ timeout: STREAM_END_MS });
    const first = (await short.locator("p[lang='en']").textContent()) ?? "";
    expect(shortEns("again")).toContain(first);
    await expect(short.locator("[data-talk-short-ko]")).toBeVisible();
    await expect
      .poll(async () => (await speechRecord(o.page)).spoken.includes(first))
      .toBe(true);
    await photo(o.page, "talk-discard-3-not-heard-short");
    expect(await startsOf(o.page)).toBe(4);
    await expect(button).not.toHaveAttribute("data-listening", "");
    const firstAt = (await spokenAtOf(o.page, first)).at(-1) ?? 0;
    await expect
      .poll(async () => (await recognizersOf(o.page, s))[3]?.closeAt)
      .toBeGreaterThanOrEqual(firstAt + utterMs);
    // 누르면 진짜 → 확인 칸 → '다시 말하기'
    await button.click();
    await expect(button).toHaveAttribute("data-listening", "", {
      timeout: STREAM_END_MS,
    });
    const confirm = o.page.locator("[data-child-turn] [data-child-confirm]");
    await expect(confirm).toBeVisible({ timeout: STREAM_END_MS });
    const spokenBefore = (await speechRecord(o.page)).spoken.length;
    await confirm.getByRole("button", { name: T.again }).click();
    await expect(button).toHaveAttribute("data-listening", "", {
      timeout: STREAM_END_MS,
    });
    const added = (await speechRecord(o.page)).spoken.slice(spokenBefore);
    const second = added.find((t) => shortEns("again").includes(t));
    expect(second, `'다시 말하기' 뒤 읽기: ${added.join(" | ")}`).toBeDefined();
    const secondAt = (await spokenAtOf(o.page, second ?? "")).at(-1) ?? 0;
    const uses = await recognizersOf(o.page, s);
    const discard = uses[5];
    const realUse = uses[6];
    if (!discard || !realUse) throw new Error("대본 차례가 어긋났다");
    expect(discard.closeAt ?? 0).toBeGreaterThanOrEqual(secondAt + utterMs);
    expect(realUse.startAt).toBeGreaterThan(secondAt);
    const bound =
      Math.max(
        secondAt + utterMs + DISCARD_TIMES.afterSoundMs,
        discard.startAt + DISCARD_TIMES.minMs,
      ) +
      (s.runs[5]?.onStop?.[0]?.at ?? 0) +
      DISCARD_TIMES.gapMs +
      TIME_SLACK_MS;
    expect(realUse.startAt).toBeLessThanOrEqual(bound);
    await pushFakeAi([
      talkLessonReply({ tori_en: REPLIES[1], next_move: "follow_up" }),
    ]);
    await sendWhenAsked(o, o.sent.turns.length);
    await expect(bubble(o.page)).toContainText("Cool!", {
      timeout: STREAM_END_MS,
    });
    await expectDiscardRules(o);
    await expectNoMarkNoRecording(o);
  });

  test("AC-24c 선생님 줄의 시작 알림 전에 누르면 그 버림 안에서 짧은 말 한 줄이 끝까지 읽힌 뒤에야 진짜가 열린다(층 검토 I-1 회귀)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const s = discardScript(
      realsThenDead([saidRun("I'm good."), saidRun("I like it.")]),
      { utterMs: DELAYED_UTTER_MS, startAfterMs: START_DELAY_MS },
    );
    const o = await openTalk(context, s);
    await untilChildTurn(o.page);
    await pushFakeAi([talkLessonReply({ tori_en: GREETING_REPLY })]);
    await sayTurn(o);
    const question = firstQuestionOf(o.card);
    const button = speakButton(o.page);
    await expect
      .poll(
        async () => (await speechRecord(o.page)).spoken.includes(question),
        {
          intervals: [POLL_MS / 2],
          timeout: STREAM_END_MS,
        },
      )
      .toBe(true);
    const spokenBefore = (await speechRecord(o.page)).spoken.length;
    await button.click();
    const clickedBy = await pageNow(o.page);
    const questionAt = (await spokenAtOf(o.page, question)).at(-1) ?? 0;
    expect(
      clickedBy,
      "시험 차례: 질문의 시작 알림 전에 눌렀다(아이 차례가 늦게 열리면 이 시험은 그 길을 보지 못한다)",
    ).toBeLessThan(questionAt + START_DELAY_MS);
    await expect(button).toHaveAttribute("data-speak-preparing", "");
    await expect(button).toHaveAttribute("data-listening", "", {
      timeout: STREAM_END_MS,
    });
    await expect(discardLine(o.page)).toHaveText(T.sayNow);
    const added = (await speechRecord(o.page)).spoken.slice(spokenBefore);
    const line = added.find((t) => shortEns("again").includes(t));
    expect(line, `누른 뒤 읽기: ${added.join(" | ")}`).toBeDefined();
    const lineAt = (await spokenAtOf(o.page, line ?? "")).at(-1) ?? 0;
    const uses = await recognizersOf(o.page, s);
    expect(uses[2]?.role).toBe("real");
    expect(uses[2]?.startAt ?? 0).toBeGreaterThanOrEqual(
      lineAt + START_DELAY_MS + DELAYED_UTTER_MS,
    );
    expect(uses[1]?.closeAt ?? 0).toBeGreaterThanOrEqual(
      lineAt + START_DELAY_MS + DELAYED_UTTER_MS,
    );
    await expectDiscardRules(o);
  });

  test("AC-24b '준비 중이에요' 동안 '잘 모르겠어요'를 누르면 걸린 누름을 거두고 그 턴을 보내며 진짜 start 가 없다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const s = discardScript([
      real(saidRun("I'm good.")),
      dead({ endAfterStopMs: SLOW_END_MS }),
      real(saidRun("I like it.")),
      dead(),
    ]);
    const o = await openTalk(context, s);
    await throughGreeting(o);
    await untilChildTurn(o.page);
    const button = speakButton(o.page);
    await button.click();
    await expect(button).toHaveAttribute("data-speak-preparing", "");
    const starts = await startsOf(o.page);
    const before = o.sent.turns.length;
    await pushFakeAi([
      talkLessonReply({
        stuck: true,
        tori_en: "That's okay! Let's say it together. Listen and say!",
        support: "together",
      }),
    ]);
    await o.page.locator("[data-child-turn] [data-dont-know]").click();
    await expect.poll(() => o.sent.turns.length).toBe(before + 1);
    const body = JSON.parse(o.sent.turns.at(-1) ?? "{}") as {
      input?: unknown;
    };
    expect(body.input).toEqual({ mode: "dont_know" });
    await o.page.waitForTimeout(NO_NEW_MS);
    expect(await startsOf(o.page)).toBe(starts);
    await expect(
      o.page.locator("[data-child-turn] [data-speak][data-listening]"),
    ).toHaveCount(0);
    await expectDiscardRules(o);
  });

  test("AC-24f 살아 있는 버림(as 가 speech.discard_live_as_ms 밖)은 판정 때 stop 으로 닫히고(abort 0) 그 뒤 읽기는 세션 없이 하며, 다음 진짜까지 버림을 다시 열지 않고 그 진짜의 dc 는 갈래 live 다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const s = discardScript([
      real(saidRun("I'm good.")),
      live(),
      real(saidRun("I like it.")),
      dead(),
    ]);
    const o = await openTalk(context, s);
    await throughGreeting(o);
    await untilChildTurn(o.page);
    const [, liveUse] = await recognizersOf(o.page, s);
    if (!liveUse) throw new Error("버림이 열리지 않았다");
    expect(liveUse.close).toBe("stop");
    expect((liveUse.closeAt ?? 0) - liveUse.startAt).toBeGreaterThanOrEqual(
      DISCARD_TIMES.liveAsMs - TICK_SLACK_MS,
    );
    const questionAt =
      (await spokenAtOf(o.page, firstQuestionOf(o.card))).at(-1) ?? 0;
    expect(questionAt).toBeGreaterThan(liveUse.endAt ?? 0);
    expect(await startsOf(o.page)).toBe(2);
    await pushFakeAi([
      talkLessonReply({ tori_en: REPLIES[2], next_move: "follow_up" }),
    ]);
    await sayTurn(o);
    await expect(bubble(o.page)).toContainText("Nice!", {
      timeout: STREAM_END_MS,
    });
    const [, row] = await childRowsOf(o.sessionId);
    if (!row) throw new Error("대화 첫 아이 행이 없다");
    const dc = listensOf(row).at(-1)?.dc;
    expect(dc?.g).toBe("live");
    expect(dc?.why).toBe("live");
    await expectDiscardRules(o);
  });

  test("AC-24i 끝인사(대화 안전 상한)로 떠나면 열린 버림이 stop 으로 닫히고, 끝인사 · 그 다시 듣기에서 버림 객체가 새로 생기지 않는다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    // 상한을 둘째 아이 턴으로(인사 1 + 대화 1 — talk-lesson.spec AC-15j 와 같은 꼴)
    await withHouseholdSetting("talk.safety_max_turns", 2, async () => {
      const s = discardScript(
        realsThenDead([saidRun("I'm good."), saidRun("I like it.")]),
      );
      const o = await openTalk(context, s);
      await throughGreeting(o);
      await untilChildTurn(o.page);
      await sayTurn(o);
      await expect(bubble(o.page)).toContainText(o.card.safetyFarewell.en, {
        timeout: STREAM_END_MS,
      });
      await expect(o.page.locator("[data-talk-closed]")).toBeVisible();
      const uses = await recognizersOf(o.page, s);
      expect(uses).toHaveLength(4);
      expect(uses[3]?.close).toBe("stop");
      const before = (await speechRecord(o.page)).spoken.length;
      await bubble(o.page).click();
      await expect
        .poll(async () => (await speechRecord(o.page)).spoken.length, {
          timeout: STREAM_END_MS,
        })
        .toBeGreaterThan(before);
      await o.page.waitForTimeout(NO_NEW_MS);
      expect(await startsOf(o.page)).toBe(4);
      await expectDiscardRules(o);
      await expect(
        o.page.locator("[data-talk-closed]").getByRole("button", {
          name: T.lessons,
        }),
      ).toBeVisible();
    });
  });

  test("AC-24i AI 쉬는 중으로 떠나면 열린 버림이 stop 으로 닫히고, 돌아와 첫 읽기가 버림을 다시 열어(진짜 없이) 그 뒤 진짜의 dc 는 갈래 reopen · 까닭 leave 다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const s = discardScript([
      real(saidRun("I'm good.")),
      dead(),
      dead(),
      real(saidRun("I like it.")),
      dead(),
    ]);
    const o = await openTalk(context, s);
    await untilChildTurn(o.page);
    await reachSafetyCap(o.profileId);
    await sayTurn(o);
    const rest = o.page.locator("[data-ai-rest]");
    await expect(rest).toBeVisible({ timeout: STREAM_END_MS });
    await expect
      .poll(async () => (await recognizersOf(o.page, s))[1]?.close)
      .toBe("stop");
    expect(await startsOf(o.page)).toBe(2);
    await liftSafetyCap(o.profileId);
    await pastTurnInFlight(o.sessionId);
    await pushFakeAi([talkLessonReply({ tori_en: GREETING_REPLY })]);
    await rest.locator('[data-button-size="small"]').click();
    await expect(rest).toHaveCount(0, { timeout: STREAM_END_MS });
    await expect(bubble(o.page)).toContainText(firstQuestionOf(o.card), {
      timeout: STREAM_END_MS,
    });
    await expect.poll(() => startsOf(o.page)).toBe(3);
    await untilChildTurn(o.page);
    await expect(speakButton(o.page)).not.toHaveAttribute("data-listening", "");
    await pushFakeAi([
      talkLessonReply({ tori_en: REPLIES[0], next_move: "follow_up" }),
    ]);
    await sayTurn(o);
    await expect(bubble(o.page)).toContainText("Wow!", {
      timeout: STREAM_END_MS,
    });
    const rows = await childRowsOf(o.sessionId);
    const dc = listensOf(rows.at(-1) ?? { clientListen: null }).at(-1)?.dc;
    expect(dc?.g).toBe("reopen");
    expect(dc?.rw).toBe("leave");
    await expectDiscardRules(o);
  });

  test("AC-24e 아이 차례에서 선생님 말풍선을 눌러 다시 들으면 그 읽기가 끝난 뒤의 소리 끝 알림으로 버림이 닫힌다(안전 상한까지 열려 있지 않음 — 묶음 3 검토 M-2 의 배선)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const utterMs = 1500;
    const s = discardScript(
      realsThenDead([saidRun("I'm good."), saidRun("I like it.")]),
      { utterMs },
    );
    const o = await openTalk(context, s);
    await untilChildTurn(o.page);
    await pushFakeAi([talkLessonReply({ tori_en: GREETING_REPLY })]);
    await sayTurn(o);
    const question = firstQuestionOf(o.card);
    await expect
      .poll(
        async () => (await speechRecord(o.page)).spoken.includes(question),
        {
          intervals: [POLL_MS],
          timeout: STREAM_END_MS,
        },
      )
      .toBe(true);
    await expect(o.page.locator("[data-child-turn]")).toBeVisible();
    await bubble(o.page).click();
    await expect
      .poll(async () => (await spokenAtOf(o.page, question)).length, {
        timeout: STREAM_END_MS,
      })
      .toBeGreaterThan(1);
    await untilChildTurn(o.page);
    await expect
      .poll(async () => (await recognizersOf(o.page, s))[1]?.close, {
        timeout: STREAM_END_MS,
      })
      .toBe("stop");
    const [, discard] = await recognizersOf(o.page, s);
    const lastAt = (await spokenAtOf(o.page, question)).at(-1) ?? 0;
    expect((discard?.closeAt ?? 0) - lastAt).toBeLessThanOrEqual(
      utterMs + DISCARD_TIMES.afterSoundMs + TIME_SLACK_MS,
    );
    expect((discard?.closeAt ?? 0) - (discard?.startAt ?? 0)).toBeLessThan(
      DISCARD_TIMES.capMs,
    );
    await expectDiscardRules(o);
  });
});

test.describe("iPad 버리는 듣기 — 짧은 준비 쪽지(3단계)", () => {
  test("AC-24b · AC-24c · AC-24j 쪽지 단추는 진짜를 열 수 있을 때까지 흐리고 누르면 '다 읽은 뒤 눌러요'만 보이며(진짜 start 없음), 결과 없음 뒤에는 들려줄 말이 버림 안에서 한 번 더 읽힌 뒤 켜지고, 따라 말하기 시도에 dc 가 글 없이 남는다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const prepWords = talkLessonCard(LEVEL).card.prep ?? [];
    if (prepWords.length < 1) throw new Error("견본 꼴 — 짧은 준비 낱말");
    const s = discardScript([
      real(saidRun("I'm good.")),
      dead({ endAfterStopMs: SLOW_END_MS }),
      real(NO_RESULT_RUN),
      dead({ endAfterStopMs: SLOW_END_MS }),
      ...realsThenDead(prepWords.map((w) => saidRun(w))),
    ]);
    const o = await openTalk(context, s, { prep: true });
    await untilChildTurn(o.page);
    await pushFakeAi([talkLessonReply({ tori_en: PREP_REPLY })]);
    await sayTurn(o);
    const note = o.page.locator("[data-prep-note]");
    await expect(note).toBeVisible({ timeout: STREAM_END_MS });
    const button = note.locator("[data-speak]");
    await expect(button).toHaveAttribute("data-speak-waiting", "", {
      timeout: STREAM_END_MS,
    });
    const starts = await startsOf(o.page);
    await button.click();
    await expect(note.locator("[data-speak-wait-note]")).toHaveText(
      T.waitReading,
    );
    await photo(o.page, "talk-discard-6-note-dim");
    expect(await startsOf(o.page)).toBe(starts);
    await expect(button).not.toHaveAttribute("data-speak-waiting", "", {
      timeout: STREAM_END_MS,
    });
    expect(await startsOf(o.page)).toBe(starts);
    // 결과 없음 → 들려줄 말 다시(버림 안) → 흐림 → 켜짐
    const spokenBefore = (await speechRecord(o.page)).spoken;
    await button.click();
    await expect(note).toHaveAttribute("data-follow-failures", "1", {
      timeout: STREAM_END_MS,
    });
    await expect
      .poll(
        async () =>
          (await speechRecord(o.page)).spoken
            .slice(spokenBefore.length)
            .some((t) => t !== "" && spokenBefore.includes(t)),
        { message: "들려줄 말을 한 번 더 읽음", timeout: STREAM_END_MS },
      )
      .toBe(true);
    await expect(button).toHaveAttribute("data-speak-waiting", "");
    await photo(o.page, "talk-discard-6-note-reread");
    await expect(button).not.toHaveAttribute("data-speak-waiting", "", {
      timeout: STREAM_END_MS,
    });
    // 남은 낱말을 말한다
    let step = (await note.getAttribute("data-prep-step")) ?? "";
    for (let i = 0; i < prepWords.length; i++) {
      if (i > 0) {
        await expect(note).not.toHaveAttribute("data-prep-step", step, {
          timeout: STREAM_END_MS,
        });
        step = (await note.getAttribute("data-prep-step")) ?? step;
      }
      await expect(button).not.toHaveAttribute("data-speak-waiting", "", {
        timeout: STREAM_END_MS,
      });
      await button.click();
      await expect(note.locator("[data-follow-result]")).toBeVisible({
        timeout: STREAM_END_MS,
      });
    }
    await expect(bubble(o.page)).toContainText(firstQuestionOf(o.card), {
      timeout: STREAM_END_MS,
    });
    const saved = JSON.stringify(await attemptsOf(o.sessionId));
    expect(saved).toContain('"dc":');
    await expectDiscardRules(o);
    await expectNoMarkNoRecording(o);
  });
});

test.describe("iPad 버리는 듣기 — 켬 · 끔 같은 표본(AC-N25 · AC-24k)", () => {
  const sampleSaid = ["I like soccer.", "I play games."] as const;
  const sampleReplies = [REPLIES[0], REPLIES[1]] as const;
  const shown = ["Wow!", "Cool!"] as const;

  /** 3단계 고정 표본 한 수업(인사 + 대화 둘)을 그 모드의 대본으로 돈다. */
  async function runSample(context: BrowserContext, mode: "ios" | "off") {
    await resetHousehold();
    await resetFakeAi();
    const reals: RecognitionRun[] = [
      saidRun("I'm good."),
      ...sampleSaid.map((t) => saidRun(t)),
    ];
    const s = discardScript(
      mode === "ios" ? realsThenDead(reals) : reals.map((r) => real(r)),
    );
    const o = await openTalk(context, s);
    await throughGreeting(o);
    for (const [i, reply] of sampleReplies.entries()) {
      await untilChildTurn(o.page);
      await pushFakeAi([
        talkLessonReply({ tori_en: reply, next_move: "follow_up" }),
      ]);
      await sayTurn(o);
      await expect(bubble(o.page)).toContainText(shown[i] ?? "", {
        timeout: STREAM_END_MS,
      });
    }
    await untilChildTurn(o.page);
    const result = {
      bodies: o.sent.turns.map(turnBodyCore),
      ai: await talkTurnRequests(),
      starts: await startsOf(o.page),
      created: (await speechRecord(o.page)).created,
      seen: (await watchOf(o.page)).seen,
      dcs: (await childRowsOf(o.sessionId)).map((r) =>
        listensOf(r).some((l) => l.dc !== undefined),
      ),
    };
    await o.page.close();
    return result;
  }

  test("AC-N25 · AC-24k 같은 3단계 고정 표본에서 회화 턴 요청 수와 요청 본문(client_listen 밖)이 켬 · 끔에서 같고, 끔은 누름 수 = 인식 start 수 · 버림 객체 0 · 새 표지 넷 0 · dc 칸 없음이다", async ({
    context,
  }) => {
    test.setTimeout(LONG * 2);
    const presses = 1 + sampleSaid.length;
    const on = await runSample(context, "ios");
    const off = await withHouseholdSetting(DISCARD_MODE_KEY, "off", () =>
      runSample(context, "off"),
    );
    expect(on.bodies).toHaveLength(presses);
    expect(off.bodies).toEqual(on.bodies);
    expect(off.ai).toBe(on.ai);
    expect(on.starts).toBe(presses * 2);
    expect(on.dcs.every(Boolean)).toBe(true);
    // 끔: 지금 그대로(spec 설계 7 · plan 정한 것 8 (다))
    expect(off.starts).toBe(presses);
    expect(off.created).toBe(presses);
    for (const marker of DISCARD_MARKERS)
      expect(off.seen[marker] ?? false, marker).toBe(false);
    expect(off.dcs.some(Boolean)).toBe(false);
  });
});

test.describe("화면 검토 사진 — 4단계 인사 끝 다시 읽기(장부 T-274 · 묶음 3 보고 7절 장면 5)", () => {
  test("4단계 인사 끝 반응이 말풍선에 나온 때 · 0.4초 뒤 · 대화 첫 질문 때를 사진으로 남긴다(판정은 화면 검토)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const level = 4;
    const s = discardScript(
      realsThenDead([saidRun("I'm good."), saidRun("I like it.")]),
      { utterMs: 1200 },
    );
    const o = await openTalk(context, s, { level });
    await untilChildTurn(o.page);
    await pushFakeAi([talkLessonReply({ tori_en: GREETING_REPLY })]);
    await sayTurn(o);
    await expect(bubble(o.page)).toContainText("Great!", {
      timeout: STREAM_END_MS,
    });
    await photo(o.page, "talk-discard-5-greeting-reaction", ["portrait"]);
    await o.page.waitForTimeout(400);
    await photo(o.page, "talk-discard-5-greeting-after-0.4s", ["portrait"]);
    await expect(bubble(o.page)).toContainText(firstQuestionOf(o.card), {
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(o.page);
    await photo(o.page, "talk-discard-5-greeting-first-question");
    await expectDiscardRules(o);
  });
});

// ── 첫 실행 음성 인식 안내의 부모 줄(AC-24d — 부모 화면 마이크 행은 부모 화면이 생기는 묶음에서 같은 시험을 더한다, plan 위험 14) ──

/** 첫 실행을 음성 인식 안내 화면까지 기본 선택으로 지난다(first-run.spec fillPin · finishToMic 과 같은 차례). */
async function firstRunToMic(page: Page) {
  const step = page.locator("[data-first-run-step]");
  const next = page.getByRole("button", { name: T.next });
  await page.goto("/first-run");
  await expect(
    page.locator("[data-first-run-step][data-hydrated]"),
  ).toHaveCount(1);
  const pin = randomPin();
  await expect(page.getByLabel("PIN", { exact: true })).toBeFocused();
  await page.getByLabel("PIN", { exact: true }).fill(pin);
  await page.getByLabel(T.pinAgain).fill(pin);
  await next.click();
  await expect(step).toHaveAttribute("data-first-run-step", "name");
  await page.getByLabel(T.displayName).fill("모모");
  await next.click();
  await expect(step).toHaveAttribute("data-first-run-step", "avatar");
  await page.getByRole("button", { name: AVATARS[0].label }).click();
  await next.click();
  await page.getByRole("button", { name: T.alphabetKnown }).click();
  await next.click();
  await page.getByRole("button", { name: TOPIC_BUNDLES[0].label }).click();
  await next.click();
  await expect(step).toHaveAttribute("data-first-run-step", "level");
  await next.click();
  await expect(step).toHaveAttribute("data-first-run-step", "mic");
}

test.describe("iPad 버리는 듣기 — 첫 실행 부모 줄(켬 · iPad)", () => {
  test("AC-24d iPad 기기 판정의 첫 실행 음성 인식 안내에 부모 줄(선생님 말 동안의 마이크 · 기기 음성 인식 · 녹음 안 함)이 안내 글 바로 뒤에 있다", async ({
    page,
  }) => {
    await firstRunToMic(page);
    const line = page.locator("[data-mic-discard]");
    await expect(line).toHaveText(T.micDiscard);
    await expect(page.locator("[data-ipad-guide]")).toBeVisible();
    await photo(page, "talk-discard-7-first-run-mic");
  });
});

test.describe("iPad 버리는 듣기 — 첫 실행 부모 줄(끔)", () => {
  test.use({ discardMode: "off" });
  test("AC-24d discard_mode off 에서는 iPad 에도 첫 실행 부모 줄이 없다", async ({
    page,
  }) => {
    await firstRunToMic(page);
    await expect(page.locator("[data-ipad-guide]")).toBeVisible();
    await expect(page.locator("[data-mic-discard]")).toHaveCount(0);
  });
});

test.describe("iPad 버리는 듣기 — 첫 실행 부모 줄(데스크톱)", () => {
  /** 데스크톱 판정(Windows Chrome — iPad 의 터치 판정과 상관없이 iOS 가 아님, core/speech/device platformOf). */
  test.use({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  });
  test("AC-24d 데스크톱 기기 판정에서는 discard_mode ios 여도 첫 실행 부모 줄이 없다", async ({
    page,
  }) => {
    await firstRunToMic(page);
    await expect(page.locator("[data-ipad-guide]")).toHaveCount(0);
    await expect(page.locator("[data-mic-discard]")).toHaveCount(0);
  });
});

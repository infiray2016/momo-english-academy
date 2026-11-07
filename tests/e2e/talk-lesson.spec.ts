// 새 꼴 회화 수업 e2e(회화 plan 묶음 11 — 증명 표 AC-15a · 15e · 15f · 15g · 15l · 15m · 15p · 15q · 15s · 15t · N8 · N10 의 화면 몫, 정본 3.3
// 회화 블록 · 4절 회화 세션 표 · 7절). 견본 카드(talkLessonCard — 3단계 배정 수업, 인사 한 턴 · 짧은 준비 낱말 · 필수 질문)를 시험이 넣고
// 진행 세션을 바로 연다. 회화 턴은 가짜 Anthropic SSE(talkLessonReply — 새 꼴 응답 칸), 듣기는 가짜 Web Speech 대본(듣기마다 하나).
// 숫자는 시험용 설정에서 읽는다. 이 파일은 정적이다(이 Mac 에서 돌리지 않음 — 첫 실행은 묶음 14 · CI, 회화 e2e 를 새 꼴 견본으로 옮기는 일은
// 묶음 12). 녹음하지 않는다.
import { readFileSync } from "node:fs";
import type { BrowserContext, Locator, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import type { TalkLessonOutput } from "../../src/core/ai/calls/talk-lesson";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
import {
  TalkCueLinesFileSchema,
  TalkSituationLinesFileSchema,
} from "../../src/core/seed/schema/reference";
import type { TalkCard } from "../../src/core/seed/schema/talk";
import type { RecognitionRun } from "../../src/core/speech/script";
import { sessions } from "../../src/db/schema/learning";
import { parentAlerts } from "../../src/db/schema/operations";
import { TEST_SETTINGS } from "../fixtures/settings";
import { closeE2eDb, e2eDb, resetHousehold, withHouseholdSetting } from "./db";
import { fakeAiRequests, pushFakeAi, resetFakeAi } from "./fake-ai";
import { expect, speechPage, test } from "./fixtures";
import {
  CLOSING_MARK,
  deafRun,
  insertTalkLesson,
  openTalkSession,
  saidRun,
  speechRecord,
  TURN_MARK,
  talkHousehold,
  talkLessonCard,
  talkLessonReply,
  talkScript,
  talkTurnRequests,
  webkitSilentRun,
  withoutSceneOpener,
} from "./talk";

/** 이름 자리 글(회화 시험 집 선생님 미나 — 받침 없음). 화면 문구 표 TEACHER_TEXT · TALK_TEXT 와 같은 글이다. */
const T = {
  start: "시작!",
  micOk: "알겠어요",
  hint: "힌트",
  dontKnow: "잘 모르겠어요",
  stop: "그만하기",
  more: "더 이야기하기",
  stopYes: "그만할래요",
  stopNo: "더 이야기할래요",
  aborted: "다음에 조금 더 이야기하면 별을 받아요",
  next: "다음",
  send: "보내기",
  /** 마이크 안 잡힘 안내(정본 밖 문구 — 화면 CHILD_TURN_TEXT.micDeaf · micDeafSkip · micDeafStuck 과 같은 글, 13절 C210 · 보완 잠정). */
  micDeaf: "마이크가 안 잡혔어요. 한 번 더 눌러 주세요",
  micDeafSkip: "마이크가 계속 안 잡혀서 다음으로 넘어가요",
  micDeafStuck: "마이크가 계속 안 잡혀요. '잘 모르겠어요'를 눌러 넘어가 주세요",
} as const;
const MS = 1000;
const LONG = 120_000;
const STREAM_END_MS = 30_000;
const LEVEL = 3;
const WAIT_LINE_MS = TEST_SETTINGS["talk.wait_line_seconds"].value * MS;
const NOSPEECH_COUNT = TEST_SETTINGS["talk.nospeech_dontknow_count"].value;
const MORE_ROUND = TEST_SETTINGS["talk.more_talk_round_turns"].value;
const SILENT_ITEMS_MAX = TEST_SETTINGS["speech.silent_items_max"].value;
const DEAF_SKIP_AFTER = TEST_SETTINGS["speech.deaf_skip_after"].value;
const DEAF_SILENCE_MS = TEST_SETTINGS["speech.deaf_silence_ms"].value;
/**
 * 말소리 없는 듣기를 아이가 멈추기 전에 두는 틈(ms, 시험 값): webkitSilentRun 의 audiostart(400ms) 뒤에 누르게 — 실제 iPad 꼴(소리 받기는
 * 시작했고 말소리만 없음). 기다리지 않으면 듣기는 speech.max_listen_seconds 상한에서야 끝난다(e2e 분류 T4).
 */
const SILENT_HOLD_MS = 700;
/** 막힘 화면 글(7절 — 화면 TALK_TEXT.blocked.silent 와 같은 글). */
const SILENT_BLOCKED = "말소리가 잘 안 들려요. 부모님께 말해 주세요";

test.beforeEach(async () => {
  await resetHousehold();
  await resetFakeAi();
});
test.afterEach(resetFakeAi);
test.afterAll(closeE2eDb);

type Opened = { page: Page; sessionId: string; card: TalkCard };

/** 짧은 준비 낱말 수(견본 카드 prep — 3단계 배정 수업은 talk.prep_words.1-3 개까지). */
const prepCountOf = (lesson: TalkLesson) => lesson.card.prep?.length ?? 0;

/**
 * 카드 기회를 대화 첫 질문 하나로 다 다루는 견본(마무리 제안 시험 — 재검토 N-1): 서버는 '카드 기회 다 다룸'이 참인 턴의 갈래 '마무리'만 받는다
 * (talk-lesson.ts 정규화 1255줄 · plan 정한 것 11). 다 다룸은 남은 필수 질문이 없고 새 단어마다 다시 쓰기가 찼을 때다(chances.ts allDealt).
 * 그래서 필수 질문을 첫째 하나로 줄이고(대화 첫 질문 행이 그 항목을 다룸) 새 단어를 비운다(다시 쓰기 조건이 빈 목록에서 참). 짧은 준비 낱말은
 * 카드 칸(prep) 그대로다. 미션은 3단계에 없다.
 */
function allChancesLesson(): TalkLesson {
  const lesson = withoutSceneOpener(talkLessonCard(LEVEL));
  const first = lesson.card.required[0];
  if (!first) throw new Error("견본 꼴 — 필수 질문이 있는 배정 수업");
  return {
    ...lesson,
    newWords: [],
    card: { ...lesson.card, required: [first] },
  };
}

/**
 * 2~3단계 받침 둘째의 선택지 둘(소리 줄, 'AI 몫 넓힘' 설계 4 · C205): 같은 꼴 · 낱말 하나만 다르고 하나는 노리는 단어다(question-check
 * checkChoices — 받침 둘째도 노리는 단어가 있어야 남는다). 시험 어휘(like · 단원 단어) 안에서 카드 필수 질문 둘의 노리는 단어로 만들고, 앞 것이
 * 노리는 단어다(untilEasyChoices 의 next_targets).
 */
function choicesOf(card: TalkCard): readonly [string, string] {
  const a = card.required[0]?.targets[0];
  const b = card.required[1]?.targets[0];
  if (!a || !b) throw new Error("견본 꼴 — 노리는 단어가 있는 필수 질문 둘");
  return [`I like ${a}.`, `I like ${b}.`];
}

/**
 * 3단계 새 꼴 견본을 넣고 회화 쪽을 연다(처음 마이크 안내 '알겠어요'까지). 견본은 기본 배정 수업 카드에서 장면 여는 질문 칸을 뺀 것(대화 첫 질문 =
 * 카드 첫 필수 질문 — 'AI 몫 넓힘' plan 정한 것 3 의 개정 4 꼴 길)이고, lesson 으로 바꿀 수 있다(장면 여는 질문은 talkLessonCard 그대로).
 */
async function openLesson(
  context: BrowserContext,
  runs: (card: TalkCard, lesson: TalkLesson) => RecognitionRun[],
  {
    lesson = withoutSceneOpener(talkLessonCard(LEVEL)),
  }: { lesson?: TalkLesson } = {},
): Promise<Opened & { lesson: TalkLesson; profileId: string }> {
  const profileId = await talkHousehold(LEVEL);
  const row = await insertTalkLesson({ level: LEVEL, lesson });
  const sessionId = await openTalkSession(profileId, row);
  const page = await speechPage(context, talkScript(runs(lesson.card, lesson)));
  await page.goto(`/session/${sessionId}`);
  await expect(page.locator("[data-talk-start]")).toBeVisible();
  await page.getByRole("button", { name: T.start }).click();
  await expect(page.locator("[data-mic-notice]")).toBeVisible();
  await page.getByRole("button", { name: T.micOk }).click();
  return { page, sessionId, card: lesson.card, lesson, profileId };
}

const bubble = (page: Page) => page.locator("[data-tori-bubble]");
/**
 * 흘러 받은 말풍선의 문장 줄(tori.tsx 문장마다 블록 span data-tori-line). 줄 안에 흘러나온 글과 화면 읽기용 전문이 이어 있어, 두 문장
 * 이상 응답은 말풍선 전체 글로 견주지 않고 문장마다 견준다(Playwright 는 자식 글을 띄어쓰기 없이 잇는다 — 묶음 12 fix 2 재검토 F-1).
 */
const toriLines = (page: Page) => bubble(page).locator("[data-tori-line]");
/** 응답 글 → 문장(서버가 흘려 보내는 단위 — 마침표 · 느낌표 · 물음표 뒤 띄어쓰기). */
const sentencesOf = (text: string) => text.split(/(?<=[.!?])\s+/);
const childTurn = (page: Page) => page.locator("[data-child-turn]");
const band = (page: Page) => page.locator("[data-talk-count]");
const segmentTag = (page: Page) => page.locator("[data-talk-segment]");

/** 아이 차례가 열리고 선생님이 다 읽을 때까지. */
async function untilChildTurn(page: Page) {
  await expect(childTurn(page)).toBeVisible({ timeout: STREAM_END_MS });
  await expect(
    page.locator("[data-talk-panel][data-talk-reading]"),
  ).toHaveCount(0, { timeout: STREAM_END_MS });
}

/** 말하기 단추 한 번(대본의 다음 듣기가 말한다). */
async function speak(page: Page) {
  await page.locator("[data-child-turn] [data-speak]").click();
}

/**
 * 말하고 보낸다(1~3단계에서 연 힌트 · 들은 답이 없는 턴): 끝 침묵(speech.end_silence_seconds.talk.1-3) 뒤 인식 확인 칸이 뜨면 '보내기'.
 * 확인 칸을 talk.confirm_seconds 동안 기다리면 보냄이 늦어 짧은 단언 창을 넘긴다(e2e 분류 T3 — required-utterance sendTurn 꼴).
 */
async function speakAndSend(page: Page) {
  await speak(page);
  const confirm = page.locator("[data-child-turn] [data-child-confirm]");
  await expect(confirm).toBeVisible({ timeout: STREAM_END_MS });
  await confirm.getByRole("button", { name: T.send }).click();
  await expect(confirm).toHaveCount(0);
}

/**
 * 말 없이 멈춘 시도 하나(webkitSilentRun — iPad WebKit 은 스스로 no-speech 를 내지 않음, C148): 누름 → 듣는 중 → audiostart 뒤 다시 눌러
 * 멈춤 → 듣기 끝. 멈추면 가짜가 aborted 'No speech detected' 를 내고 앱은 말소리 없음으로 읽는다. 기다림 없이 두 번 누르면 둘째 누름이 그
 * 시도를 멈출 뿐이라 시도가 하나만 생긴다(e2e 분류 T4).
 */
async function silentAttempt(page: Page) {
  const button = page.locator("[data-child-turn] [data-speak]");
  await expect(button).not.toHaveAttribute("data-speak-waiting", "", {
    timeout: STREAM_END_MS,
  });
  await button.click();
  await expect(button).toHaveAttribute("data-listening", "");
  await page.waitForTimeout(SILENT_HOLD_MS);
  await button.click();
  await expect(button).not.toHaveAttribute("data-listening", "");
}

/** 말소리 없음 셈이 차 '모름'으로 보낸 차례가 끝나고 다음 아이 차례가 열릴 때까지(옛 차례의 안내 줄이 없어진 뒤 — 옛 차례로 바로 지나지 않게). */
async function untilNextChildTurnAfterNospeech(page: Page) {
  const moving = page.locator("[data-nospeech-move]");
  await expect(moving).toBeVisible();
  await expect(moving).toHaveCount(0, { timeout: STREAM_END_MS });
  await untilChildTurn(page);
}

/**
 * 마이크 안 잡힘 시도 하나(deafRun — 13절 C210): 누름 → 듣는 중 → speech.deaf_silence_ms 뒤 앱이 스스로 듣기를 끝냄. scope 는 말하기 단추가 든
 * 자리(대화 차례 · 짧은 준비 쪽지).
 */
async function deafAttempt(scope: Locator) {
  const button = scope.locator("[data-speak]");
  await expect(button).not.toHaveAttribute("data-speak-waiting", "", {
    timeout: STREAM_END_MS,
  });
  await button.click();
  await expect(button).toHaveAttribute("data-listening", "");
  await expect(button).not.toHaveAttribute("data-listening", "", {
    timeout: DEAF_SILENCE_MS + STREAM_END_MS,
  });
}

/** 대화 첫 질문 글: 1~3단계 장면 여는 질문 칸이 있으면 그 질문, 없으면 카드 첫 필수 질문(C206 · plan 정한 것 3). */
const firstQuestionOf = (card: TalkCard) =>
  card.sceneOpener?.question.en ?? card.required[0]?.en ?? "";

/** 인사 한 턴 → 짧은 준비 쪽지를 다 따라 말함 → 대화 첫 질문까지. */
async function throughGreetingAndPrep(o: Opened & { lesson: TalkLesson }) {
  await untilChildTurn(o.page);
  await pushFakeAi([
    talkLessonReply({ tori_en: "Great! Let's learn some new words!" }),
  ]);
  await speak(o.page);
  for (let i = 0; i < prepCountOf(o.lesson); i++) {
    const note = o.page.locator("[data-prep-note]");
    await expect(note).toBeVisible({ timeout: STREAM_END_MS });
    await expect(note.locator("[data-speak]")).not.toHaveAttribute(
      "data-speak-waiting",
      "",
      { timeout: STREAM_END_MS },
    );
    await note.locator("[data-speak]").click();
    await expect(note.locator("[data-follow-result]")).toBeVisible();
  }
  await expect(bubble(o.page)).toContainText(firstQuestionOf(o.card), {
    timeout: STREAM_END_MS,
  });
}

test.describe("새 꼴 회화 수업 — 네 토막(3단계)", () => {
  test("AC-15a · AC-15m · AC-15e 3단계: 인사 → 짧은 준비 쪽지(낱말 글 · 뜻, 예문 글 없음) → 대화 첫 질문(처음 묻는 턴, AI 없음) → 확인 쪽지 뒤 정리 한 번 → 마무리 첫 장 · 셋째 장", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(context, (card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      saidRun(card.closingLines[0]?.en ?? "Bye."),
    ]);
    // 인사: 카드 인사 질문, 위 띠 '인사' · '말 주고받기 0'(분모 없음)
    await expect(bubble(o.page)).toContainText("How are you today?");
    await expect(segmentTag(o.page)).toHaveText("인사");
    await expect(band(o.page)).toHaveText("말 주고받기 0");
    await untilChildTurn(o.page);
    // 인사 끝은 1~3단계 상황 차례라 반응 문장이 상황 차례 검사(시험 어휘 + 시드 허용 낱말)를 받는다 — 범위 안 글로 둔다('AI 몫 넓힘' 설계 1 말 검사 (가))
    await pushFakeAi([talkLessonReply({ tori_en: "Great! Now let's start!" })]);
    await speak(o.page);
    // 짧은 준비: 쪽지 한 장에 낱말 하나(2~3단계 낱말 글 · 뜻, 예문 글 없음), 셈은 숨김 · 대화 기록 칸 없음
    const note = o.page.locator("[data-prep-note]");
    await expect(note).toBeVisible({ timeout: STREAM_END_MS });
    await expect(segmentTag(o.page)).toHaveText("짧은 준비");
    await expect(o.page.locator("[data-talk-count]")).toHaveCount(0);
    await expect(o.page.locator("[data-talk-log]")).toHaveCount(0);
    await expect(note.locator("[data-prep-word]")).toBeVisible();
    await expect(note.locator("[data-prep-meaning]")).toBeVisible();
    await expect(note.locator("[data-prep-example]")).toHaveCount(0);
    for (let i = 0; i < prepCountOf(o.lesson); i++) {
      await expect(note.locator("[data-speak]")).not.toHaveAttribute(
        "data-speak-waiting",
        "",
        { timeout: STREAM_END_MS },
      );
      await note.locator("[data-speak]").click();
      // 아이 말풍선에 인식 글, 그 아래 결과 말
      await expect(note.locator("[data-child-said]")).toBeVisible();
      await expect(note.locator("[data-follow-result]")).toBeVisible();
    }
    // 대화 첫 질문: 카드 첫 필수 질문을 앱이 보이고 읽는다(AI 호출 없음 — C19), 앞 말은 대화 기록 칸 위로
    const before = await talkTurnRequests();
    await expect(bubble(o.page)).toContainText(o.card.required[0]?.en ?? "", {
      timeout: STREAM_END_MS,
    });
    await expect(segmentTag(o.page)).toHaveText("대화");
    await expect(band(o.page)).not.toContainText("/");
    await expect(o.page.locator("[data-talk-log]")).toContainText(
      "Now let's start!",
    );
    expect(await talkTurnRequests()).toBe(before);
    // '그만하기': 대화 토막에 말한 아이 턴이 없으니(참여가 거의 없음) 확인 쪽지(C34) → 그만두기면 정리 뒤 중단
    await untilChildTurn(o.page);
    await o.page.locator("[data-talk-stop]").click();
    await o.page.getByRole("button", { name: T.stopYes }).click();
    // 정리 한 번: 되짚을 말 전체를 한 말풍선에, 1~3단계 말하기 단추 하나로 한 번 따라 말함
    const wrapAll = o.page.locator("[data-wrap-all]");
    await expect(wrapAll).toBeVisible({ timeout: STREAM_END_MS });
    await expect(segmentTag(o.page)).toHaveText("정리");
    await expect(wrapAll.locator("[data-speak]")).toHaveCount(1);
    await expect(wrapAll.locator("[data-speak]")).not.toHaveAttribute(
      "data-speak-waiting",
      "",
      { timeout: STREAM_END_MS },
    );
    await wrapAll.locator("[data-speak]").click();
    // 끝인사는 정리에서 한 번(C167 (1)) → 마무리 첫 장(그만둔 대화 — 별 없음) → 셋째 장(1~3단계 둘째 장 없음, AC-15e)
    await expect(o.page.locator("[data-wrap-farewell]")).toBeVisible({
      timeout: STREAM_END_MS,
    });
    const first = o.page.locator('[data-closing-card="1"]');
    await expect(first).toBeVisible({ timeout: STREAM_END_MS });
    await expect(first).toContainText(T.aborted);
    await first.getByRole("button", { name: T.next }).click();
    await expect(o.page.locator('[data-closing-card="2"]')).toHaveCount(0);
    await expect(o.page.locator('[data-closing-card="3"]')).toBeVisible();
    const [row] = await e2eDb()
      .select({ status: sessions.status })
      .from(sessions)
      .where(eq(sessions.id, o.sessionId));
    expect(row?.status).toBe("aborted");
  });

  test("AC-15t 참여가 있으면 '그만하기'는 확인 쪽지 없이 정리로 가고 마무리 첫 장에 별이 있다(참여 완료)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(context, (card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      saidRun(card.required[0]?.answerExample ?? "I like it."),
      saidRun(card.closingLines[0]?.en ?? "Bye."),
    ]);
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    await pushFakeAi([
      talkLessonReply({
        tori_en: "Wow, me too! What do you do on Sunday?",
        next_move: "follow_up",
      }),
    ]);
    await speak(o.page);
    // 대화 답의 응답이 온 뒤에 그만한다 — 인사 턴도 말 주고받기에 들어(02-2 162 · 227줄) 대화 첫 질문 화면이 이미 '말 주고받기 1'이라 셈만
    // 보면 대화 답을 보내기 전에 지나간다(e2e 분류 T2). 인사 1 + 대화 1 = 2
    await expect(bubble(o.page)).toContainText("Wow, me too!", {
      timeout: STREAM_END_MS,
    });
    await expect(band(o.page)).toHaveText("말 주고받기 2");
    await untilChildTurn(o.page);
    await o.page.locator("[data-talk-stop]").click();
    await expect(o.page.getByRole("button", { name: T.stopYes })).toHaveCount(
      0,
    );
    await expect(o.page.locator("[data-wrap-all]")).toBeVisible({
      timeout: STREAM_END_MS,
    });
    // 정리에도 대화 기록 칸이 있다(03절 92줄 — 오늘 쓸 말이 든 아이 말 줄은 data-wrap-shine 으로 한 번 반짝)
    await expect(
      o.page.locator("[data-wrap-log] [data-talk-log]"),
    ).toBeVisible();
    // '그만하기' 때 지금 말풍선(마지막 선생님 말)도 정리 기록 칸에 오른다(N-4 (라) talk-frame pushBubbleToLog). 첫 문장으로 본다 — 'Sunday'
    // 는 시험 어휘 범위 밖이라 뒤 질문은 1~3단계 질문 검사가 카드 질문으로 바꾼다(AC-15i)
    await expect(o.page.locator("[data-wrap-log]")).toContainText(
      "Wow, me too!",
    );
    // 오늘 쓸 말이 든 아이 말 줄은 멈춘 강조(ring-4)가 남는다(N-4 (가) — 반짝임 한 바퀴만 꺼짐)
    await expect(
      o.page.locator("[data-wrap-log] [data-wrap-shine]").first(),
    ).toHaveClass(/(^|\s)ring-4(\s|$)/);
    // 정리 단추는 글이 흐르는 동안 · 읽는 동안 · 읽기 뒤 쉼(C201) 동안 흐리다 — 켜진 뒤 누른다(검토 M-5)
    await expect(
      o.page.locator("[data-wrap-all] [data-speak]"),
    ).not.toHaveAttribute("data-speak-waiting", "", { timeout: STREAM_END_MS });
    await o.page.locator("[data-wrap-all] [data-speak]").click();
    const first = o.page.locator('[data-closing-card="1"]');
    await expect(first).toBeVisible({ timeout: STREAM_END_MS });
    await expect(first.locator("[data-closing-stars] *")).not.toHaveCount(0);
    await expect(first).not.toContainText(T.aborted);
  });

  test("AC-15t 마무리 제안(갈래 '마무리') 뒤 두 버튼이 나오고 '더 이야기하기'는 AI 없이 더 이야기할 거리 하나를 붙인다(정한 것 11)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(
      context,
      (card, lesson) => [
        saidRun("I'm good."),
        ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
        saidRun(card.required[0]?.answerExample ?? "I like it."),
      ],
      { lesson: allChancesLesson() },
    );
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    // 1~3단계 물음표 문장은 질문 검사를 받으므로(정한 것 19) 마무리 제안은 물음표 없는 반응 말로 둔다 — 걸리면 카드 자리로 바뀌어 갈래가 없어진다
    await pushFakeAi([
      talkLessonReply({
        tori_en: "That was a great talk! We can stop here.",
        next_move: "closing",
      }),
    ]);
    await speak(o.page);
    const choice = o.page.locator("[data-talk-choice]");
    await expect(choice).toBeVisible({ timeout: STREAM_END_MS });
    // 앱 고정 대사(마무리 물음)는 말풍선에 붙지 않는다
    await expect(bubble(o.page)).not.toContainText("Do you want to talk more?");
    // 마무리 제안 뒤에는 말로도 답할 수 있다(02-2 295줄 — 두 버튼과 함께 말하기 단추)
    await expect(childTurn(o.page)).toBeVisible();
    const before = (await fakeAiRequests()).length;
    await choice.getByRole("button", { name: T.more }).click();
    await expect(choice).toHaveCount(0);
    await expect(bubble(o.page)).toContainText(o.card.more[0]?.en ?? "", {
      timeout: STREAM_END_MS,
    });
    expect((await fakeAiRequests()).length).toBe(before);
  });

  test("AC-15t 마무리 제안 뒤 말로 답하면 보통 턴이다(두 버튼이 사라지고 선생님이 반응 — 정한 것 11)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(
      context,
      (card, lesson) => [
        saidRun("I'm good."),
        ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
        saidRun(card.required[0]?.answerExample ?? "I like it."),
        saidRun("I want to talk more."),
      ],
      { lesson: allChancesLesson() },
    );
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    await pushFakeAi([
      talkLessonReply({
        tori_en: "That was a great talk! We can stop here.",
        next_move: "closing",
      }),
    ]);
    await speak(o.page);
    await expect(o.page.locator("[data-talk-choice]")).toBeVisible({
      timeout: STREAM_END_MS,
    });
    // 물음표 없는 반응(질문 검사 밖) — 말풍선 글이 이 반응 그대로인지 본다
    const reply = "Okay! Let's talk more.";
    await pushFakeAi([talkLessonReply({ tori_en: reply })]);
    await speak(o.page);
    await expect(toriLines(o.page)).toContainText(sentencesOf(reply), {
      timeout: STREAM_END_MS,
    });
    await expect(o.page.locator("[data-talk-choice]")).toHaveCount(0);
    await expect(o.page.locator("[data-talk-log]")).toContainText(
      "I want to talk more.",
    );
  });
});

test.describe("새 꼴 회화 수업 — 대화 토막 화면(3단계)", () => {
  test("AC-15q · AC-15p · AC-15l 1~3단계 소리 줄은 글 없이 듣기 단추로만 있고, '힌트'는 한 단씩(뜻 → 틀 → 문장과 듣기) 열리며 '막히면 눌러요'는 한 번", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(context, (_card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      saidRun("I don't know."),
    ]);
    // '막히면 눌러요'는 힌트 단추가 있는 첫 아이 차례(인사 질문 — 견본 인사에 힌트가 있음)에서 한 번 보이고 듣기를 시작하면 꺼진다(03절 99줄 ·
    // C10, child-turn 385줄 · talk-frame 1672줄). 대화 차례에는 없다(e2e 분류 T5)
    await untilChildTurn(o.page);
    await expect(o.page.locator("[data-hint-nudge]")).toBeVisible();
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    await expect(o.page.locator("[data-hint-nudge]")).toHaveCount(0);
    // 카드 첫 필수 질문 자리의 힌트(카드 힌트 — 3단계는 한국어 뜻 → 영어 틀 → 영어 문장)
    const hint = o.page.locator("[data-hint-button]");
    await hint.click();
    await expect(o.page.locator('[data-hint-tier="ko"]')).toBeVisible();
    await hint.click();
    await expect(o.page.locator('[data-hint-tier="frame"]')).toBeVisible();
    await hint.click();
    await expect(o.page.locator('[data-hint-tier="sentence"]')).toBeVisible();
    await expect(o.page.locator("[data-hint-listen]")).toBeVisible();
    // 같이 말하기: 1~3단계 첫 막힘은 카드 자리라 앱이 카드 답 예시를 소리 줄(answer — 글 없는 듣기 단추)로 붙이고 AI 의 model_line 은
    // 쓰지 않는다(lesson-flow stuckPlan · talk-lesson-flow.test 294줄). 그 답은 말풍선 글 · 기록 글에는 없고 읽은 글에는 있다(T2)
    const answer = o.card.required[0]?.answerExample;
    if (!answer) throw new Error("견본 꼴 — 첫 필수 질문 답 예시");
    await pushFakeAi([
      talkLessonReply({
        stuck: true,
        tori_en: "That's okay! Let's say it together. Listen and say!",
        support: "together",
      }),
    ]);
    await speak(o.page);
    await expect(o.page.locator('[data-sound-listen="answer"]')).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await expect(bubble(o.page)).not.toContainText(answer);
    await expect(o.page.locator("[data-talk-log]")).not.toContainText(answer);
    await untilChildTurn(o.page);
    const spoken = await speechRecord(o.page);
    expect(spoken.spoken).toContain(answer);
    await expect(o.page.locator("[data-hint-nudge]")).toHaveCount(0);
  });

  test("AC-15g 받침 첫 막힘의 한국어 설명은 말풍선 아래 글로만 있고 읽지 않는다(1~4단계 첫 막힘부터)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(context, (_card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
    ]);
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    const explanation = "좋아하는 것을 말하면 돼.";
    await pushFakeAi([
      talkLessonReply({
        tori_en: "That's okay! Let's say it together. Listen and say!",
        model_line: "I like the sea.",
        explanation,
        support: "together",
      }),
    ]);
    await o.page.getByRole("button", { name: T.dontKnow }).click();
    await expect(o.page.locator("[data-tori-explanation]")).toHaveText(
      explanation,
      { timeout: STREAM_END_MS },
    );
    await untilChildTurn(o.page);
    const spoken = await speechRecord(o.page);
    expect(spoken.spoken).not.toContain(explanation);
  });

  test("AC-15s 말소리 없는 듣기가 talk.nospeech_dontknow_count 번이면 들리지 않음으로 보내고, 다음 아이 차례에 '잘 모르겠어요'가 한 번 반짝이며 기록에는 '못 들었어요'", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(context, (_card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      ...Array.from({ length: NOSPEECH_COUNT }, () => webkitSilentRun()),
    ]);
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    await pushFakeAi([
      talkLessonReply({ tori_en: "I couldn't hear you. It's okay!" }),
    ]);
    for (let i = 0; i < NOSPEECH_COUNT; i++) {
      await silentAttempt(o.page);
      if (i < NOSPEECH_COUNT - 1)
        await expect(
          o.page.locator('[data-child-said="not_heard"]'),
        ).toBeVisible();
    }
    await untilNextChildTurnAfterNospeech(o.page);
    await expect(o.page.locator("[data-dont-know][data-flash]")).toBeVisible();
    await expect(o.page.locator("[data-talk-log]")).toContainText(
      "못 들었어요",
    );
  });

  test("AC-15f 이어 하기: 대화 중 쪽을 다시 열면 AI 호출 없이 마지막 선생님 말부터 다시 보이고 지난 말은 대화 기록 칸에 다시 그린다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(context, (card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      saidRun(card.required[0]?.answerExample ?? "I like it."),
    ]);
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    // 1~3단계 AI 질문은 시험 어휘 · 아이가 말한 낱말 안에서 쓴다(범위 밖이면 질문 검사가 카드 질문으로 바꿔 화면에 없다 — AC-15i)
    const reply = "Wow, me too! What do you like?";
    await pushFakeAi([talkLessonReply({ tori_en: reply })]);
    await speak(o.page);
    await expect(toriLines(o.page)).toContainText(sentencesOf(reply), {
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(o.page);
    const calls = (await fakeAiRequests()).length;
    await o.page.reload();
    await o.page.getByRole("button", { name: T.start }).click();
    // 다시 열면 저장한 AI 글이 한 줄로 그려진다(talk-frame lessonBubbleOf — 행 글 하나가 줄 하나) — 줄 수에 기대지 않게 문장마다 본다
    for (const sentence of sentencesOf(reply))
      await expect(bubble(o.page)).toContainText(sentence);
    await expect(o.page.locator("[data-talk-log]")).toContainText(
      o.card.required[0]?.en ?? "",
    );
    // 인사 턴도 말 주고받기에 든다(02-2 162 · 227줄 · lesson-flow 셈) — 인사 1 + 대화 1(e2e 분류 T2)
    await expect(band(o.page)).toHaveText("말 주고받기 2");
    expect((await fakeAiRequests()).length).toBe(calls);
  });

  test("AC-N8 · AC-N10 보낸 뒤 첫 문장이 talk.wait_line_seconds 안에 없으면 맞장구 한 줄을 선생님 목소리로 먼저 읽고, 맞장구는 기록에 없으며 첫 문장은 그 뒤 흘러 보인다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(context, (card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      saidRun(card.required[0]?.answerExample ?? "I like it."),
    ]);
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    // 질문은 시험 어휘 안(AC-15i — 범위 밖이면 카드 질문으로 바뀌어 아래 문장 줄 단언이 걸린다)
    const reply = "Oh, nice! Do you like it?";
    await pushFakeAi([
      talkLessonReply({ tori_en: reply }, { firstDelayMs: WAIT_LINE_MS * 2 }),
    ]);
    // 끝 침묵 뒤 확인 칸이 뜨면 바로 보낸다 — 확인 칸 시간까지 기다리면 기다림 표시가 기본 단언 창을 넘긴다(e2e 분류 T3)
    await speakAndSend(o.page);
    await expect(o.page.locator("[data-tori-waiting]")).toBeVisible();
    await expect(toriLines(o.page)).toContainText(sentencesOf(reply), {
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(o.page);
    const texts = (await speechRecord(o.page)).spoken;
    const replyAt = texts.findIndex((t) => reply.startsWith(t));
    const waitAt = texts.findIndex((t) =>
      [
        "Hmm, let me see.",
        "Let me think.",
        "Oh, I see.",
        "Okay!",
        "Hmm.",
      ].includes(t),
    );
    expect(waitAt).toBeGreaterThanOrEqual(0);
    expect(waitAt).toBeLessThan(replyAt);
    for (const line of ["Hmm, let me see.", "Let me think.", "Hmm."])
      await expect(o.page.locator("[data-talk-log]")).not.toContainText(line);
  });

  test("AC-15p 같은 질문 자리의 둘째 막힘부터는 힌트 마지막 단까지 열려 있다(막힘 수는 서버 끝 줄 stuckInSlot — 단추 · 막힘 말 모두)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(context, (_card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      saidRun("I don't know."),
    ]);
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    // 첫 막힘: 단추
    await pushFakeAi([
      talkLessonReply({
        stuck: true,
        tori_en: "That's okay! Let's say it together. Listen and say!",
        model_line: "I play soccer.",
        support: "together",
      }),
    ]);
    await o.page.getByRole("button", { name: T.dontKnow }).click();
    // 첫 막힘은 카드 자리의 같이 말하기 — 답 소리 줄이 붙은 새 차례를 기다린다(옛 차례로 바로 지나지 않게, e2e 분류 T3)
    await expect(o.page.locator('[data-sound-listen="answer"]')).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(o.page);
    await expect(o.page.locator("[data-hint-tier]")).toHaveCount(0);
    // 둘째 막힘: 막힘 말('I don't know.' — AI 가 stuck 으로 알림)
    await pushFakeAi([
      talkLessonReply({
        stuck: true,
        tori_en: "It's okay!",
        support: "easy_question",
      }),
    ]);
    // 보낸 뒤 새 아이 차례의 힌트 단을 기다린다 — 보내기 전의 옛 차례로 untilChildTurn 이 바로 지나므로 단언에 응답까지의 창을 준다(e2e 분류 T3)
    await speakAndSend(o.page);
    await expect(o.page.locator('[data-hint-tier="sentence"]')).toBeVisible({
      timeout: STREAM_END_MS,
    });
  });

  test("AC-15a 위 띠: 대화 중 셈은 '말 주고받기 n' 이고 분모(참고 턴)가 없다(마무리 물음 뒤 띠는 단위 시험이 본다)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(context, (card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      saidRun(card.required[0]?.answerExample ?? "I like it."),
    ]);
    await throughGreetingAndPrep(o);
    await expect(band(o.page)).toHaveText(/^말 주고받기 \d+$/);
    await expect(band(o.page)).not.toContainText(`/ ${MORE_ROUND}`);
  });
});

/** AI 질문 자리(카드 답 뒤 이어 묻기 — 답 예시는 AI 의 next_answer_example)를 연 응답. 그 자리에서 막히면 받침이 그 답을 쓴다. */
const AI_QUESTION = "Do you like it?";

/**
 * 받침 둘째(쉬운 질문)의 AI 선택지까지(spec 'AI 몫 넓힘' 설계 4 · C205 — 2~3단계 선택지는 받침 둘째에만 남고, 이어 묻는 고르기 질문의 선택지는
 * 질문만 남긴다): 카드 첫 필수 질문에 답 → AI 이어 묻기(AI 질문 자리) → '잘 모르겠어요'(받침 첫째 — 같이 말하기, 답 소리) → '잘 모르겠어요'
 * (받침 둘째 — AI 가 쉬운 질문과 선택지 둘을 씀). 쉬운 질문은 막힌 질문과 다른 글이어야 같은 질문 막기에 걸리지 않는다. hints 는 둘째 응답의
 * AI 힌트 칸(그 자리 힌트 단)이다.
 */
async function untilEasyChoices(
  page: Page,
  card: TalkCard,
  hints: Partial<
    Pick<
      TalkLessonOutput,
      "next_hint_ko" | "next_hints" | "next_answer_example"
    >
  > = {},
) {
  const choices = choicesOf(card);
  const target = card.required[0]?.targets[0] ?? "";
  await pushFakeAi([
    talkLessonReply({
      tori_en: `Nice! ${AI_QUESTION}`,
      next_move: "follow_up",
      next_answer_example: "I like it.",
    }),
  ]);
  await speak(page);
  await expect(bubble(page)).toContainText(AI_QUESTION, {
    timeout: STREAM_END_MS,
  });
  await untilChildTurn(page);
  await pushFakeAi([
    talkLessonReply({
      stuck: true,
      tori_en: "It's okay!",
      support: "together",
    }),
  ]);
  await page.getByRole("button", { name: T.dontKnow }).click();
  await expect(page.locator('[data-sound-listen="answer"]')).toBeVisible({
    timeout: STREAM_END_MS,
  });
  await untilChildTurn(page);
  await pushFakeAi([
    talkLessonReply({
      stuck: true,
      tori_en: "Let's try! Do you like this?",
      choices: [...choices],
      support: "choices",
      next_move: "follow_up",
      next_targets: [target],
      ...hints,
    }),
  ]);
  await page.getByRole("button", { name: T.dontKnow }).click();
}

// ── 회화 묶음 10 몫(대화 기록 칸 · 아이 말풍선 · 소리 줄 단추, AC-15q — 정본 03 4절 '대화 기록' · '선생님 차례' · '인식 확인 · 아이 말풍선' 행).
// 소리 줄 글 없음 · 들리지 않음 반짝임 · 이어 하기 다시 그림 · 맞장구(AC-N10)는 위 묶음 11 덩이가 본다. 이 파일은 Edit 로만 고친다.
test.describe("회화 묶음 10 — 대화 기록 · 말풍선 · 소리 줄 단추(3단계)", () => {
  const log = (page: Page) => page.locator("[data-talk-log]");
  /** 결과 없이 끝나는 듣기(인식 실패 시도 — 말소리 없음 셈에 들지 않음, C148). */
  const noResultRun: RecognitionRun = {
    events: [
      { at: 50, type: "start" },
      { at: 120, type: "end" },
    ],
  };

  test("AC-15q 보낸 아이 말풍선은 다음 선생님 첫 문장 뒤에도 기록 칸에 남고, 위로 넘겨 지난 선생님 말을 누르면 그 말만 다시 읽는다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const first = "I like soccer.";
    const second = "I play games.";
    const o = await openLesson(context, (_card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      saidRun(first),
      saidRun(second),
    ]);
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    const replyA = "Wow! What do you do on Sunday?";
    await pushFakeAi([
      talkLessonReply({ tori_en: replyA, next_move: "follow_up" }),
    ]);
    await speak(o.page);
    await expect(bubble(o.page)).toContainText("Wow!", {
      timeout: STREAM_END_MS,
    });
    // 첫 문장이 나온 뒤에도 보낸 말은 지워지지 않는다
    await expect(
      log(o.page).locator('[data-child-said="speech"]', { hasText: first }),
    ).toHaveCount(1);
    await untilChildTurn(o.page);
    const replyB = "Cool! Do you like games?";
    await pushFakeAi([
      talkLessonReply({ tori_en: replyB, next_move: "follow_up" }),
    ]);
    await speak(o.page);
    await expect(bubble(o.page)).toContainText("Cool!", {
      timeout: STREAM_END_MS,
    });
    await expect(
      log(o.page).locator('[data-child-said="speech"]', { hasText: second }),
    ).toHaveCount(1);
    await untilChildTurn(o.page);
    // 위로 넘겨 지난 턴을 본다
    await log(o.page).evaluate((el) => {
      el.scrollTop = 0;
    });
    const past = log(o.page).locator("[data-talk-log-teacher]", {
      hasText: "Wow!",
    });
    await expect(past).toBeInViewport();
    const before = (await speechRecord(o.page)).spoken.length;
    await past.click();
    await expect
      .poll(async () => (await speechRecord(o.page)).spoken.length, {
        timeout: STREAM_END_MS,
      })
      .toBeGreaterThan(before);
    const added = (await speechRecord(o.page)).spoken.slice(before).join(" ");
    expect(added).toContain("Wow!");
    expect(added).not.toContain("Cool!");
  });

  test("AC-15q 2~3단계 선택지는 글 없는 ①② 단추이고 둘을 'Or' 없이 차례로 읽으며, ①을 누르면 그 답만 다시 읽는다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    // 2~3단계 선택지는 받침 둘째(쉬운 질문)의 AI 차례에만 남는다('AI 몫 넓힘' 설계 4 · C205 — 이어 묻는 고르기 질문은 질문만, 1~3단계 첫 막힘은
    // 카드 자리라 AI choices 를 쓰지 않음). 둘은 시험 어휘 안 · 같은 꼴 · 낱말 하나만 다른 답이다(untilEasyChoices)
    const o = await openLesson(context, (card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      saidRun(card.required[0]?.answerExample ?? "I like it."),
    ]);
    const [a, b] = choicesOf(o.card);
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    await untilEasyChoices(o.page, o.card);
    const marks = o.page.locator("[data-answer-listen]");
    await expect(marks).toHaveCount(2, { timeout: STREAM_END_MS });
    await untilChildTurn(o.page);
    // T2(검토 I-1): 표본의 소리 줄 글(선택지 둘)은 선생님 쪽 화면 글(지금 말풍선 · 지난 선생님 말 · 뜻 줄)에 없다. 아이 말풍선은 견주지
    // 않는다(아이가 따라 말한 글은 기록에 정당하게 남는다)
    const teacherSide = o.page.locator(
      "[data-tori-bubble], [data-tori-under], [data-talk-log-teacher], [data-talk-log-ko]",
    );
    for (const said of [a, b])
      await expect(teacherSide.filter({ hasText: said })).toHaveCount(0);
    const spoken = (await speechRecord(o.page)).spoken;
    expect(spoken).toContain(a);
    expect(spoken).toContain(b);
    expect(spoken.some((t) => t.includes(" Or "))).toBe(false);
    const before = spoken.length;
    await marks.first().click();
    await expect
      .poll(async () => (await speechRecord(o.page)).spoken.slice(before))
      .toEqual([a]);
  });

  test("AC-15q 인식이 실패한 시도는 그 자리에 회색 '못 들었어요'를 보이고 다음 시도가 덮으며, '잘 모르겠어요'로 보낸 턴은 기록에 '잘 모르겠어요'로 남는다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(context, (_card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      noResultRun,
      saidRun("I like the beach."),
    ]);
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    await speak(o.page);
    const attempt = o.page.locator(
      '[data-child-attempt] [data-child-said="not_heard"]',
    );
    await expect(attempt).toBeVisible({ timeout: STREAM_END_MS });
    await expect(attempt).toHaveText("못 들었어요");
    // AI 질문은 시험 어휘 안(AC-15i). 카드 답 바로 뒤 차례라 카드 항목(필수)은 앱이 비우므로(13절 C204 (6) · talk-lesson.ts cardChainGuardOf,
    // 69b1a4d) 그 자리의 답 예시는 AI 의 next_answer_example 이다(lesson-flow slotOf → row.answerExample, 여덟째 실행 새 실패)
    await pushFakeAi([
      talkLessonReply({
        tori_en: "Nice! Do you like it?",
        next_move: "follow_up",
        next_hint_ko: "좋아하는 것을 말해 봐.",
        next_hints: ["I like ___.", "I like it."],
        next_answer_example: "I like it.",
      }),
    ]);
    await speak(o.page);
    await expect(attempt).toHaveCount(0, { timeout: STREAM_END_MS });
    await expect(bubble(o.page)).toContainText("Nice!", {
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(o.page);
    // 그 자리의 첫 막힘('잘 모르겠어요')은 같이 말하기 — 1~3단계는 앱이 그 자리 답 예시를 소리 줄(answer)로 붙인다(lesson-flow stuckPlan)
    await pushFakeAi([
      talkLessonReply({
        stuck: true,
        tori_en: "That's okay! Let's say it together. Listen and say!",
        support: "together",
      }),
    ]);
    await o.page.getByRole("button", { name: T.dontKnow }).click();
    await expect(o.page.locator('[data-sound-listen="answer"]')).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await expect(
      log(o.page).locator('[data-child-said="dont_know"]'),
    ).toHaveText(T.dontKnow);
  });
});

// ── 0c664c3 고침(C148 · 7절 N3)의 화면 몫 — 옛 conversation.spec 에서 새 꼴로 옮김(회화 plan 묶음 12 · 위험 12) ──

async function alertKindsOf(profileId: string) {
  return (
    await e2eDb()
      .select({ kind: parentAlerts.kind })
      .from(parentAlerts)
      .where(eq(parentAlerts.profileId, profileId))
  ).map((r) => r.kind);
}

test.describe("새 꼴 회화 — iPad 결과 없음 고침(C148 · N3)", () => {
  test("C148 AC-N24 iPad WebKit 꼴의 말소리 없는 듣기로 질문 자리가 speech.silent_items_max 번 이어 들리지 않음으로 닫히면 '마이크가 멈춤'이 아니라 '말소리가 잘 안 들려요' 안내와 '말소리가 들어오지 않음' 알림이 나오고 세션은 진행이다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(context, (_card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      ...Array.from({ length: NOSPEECH_COUNT * SILENT_ITEMS_MAX }, () =>
        webkitSilentRun(),
      ),
    ]);
    await throughGreetingAndPrep(o);
    await pushFakeAi(
      Array.from({ length: SILENT_ITEMS_MAX }, (_v, i) =>
        talkLessonReply({
          tori_en: `I couldn't hear you. It's okay! Question ${i + 1}?`,
          next_move: "follow_up",
        }),
      ),
    );
    await untilChildTurn(o.page);
    for (let q = 1; q <= SILENT_ITEMS_MAX; q++) {
      // 시도마다 듣기를 멈춰 질문 자리마다 talk.nospeech_dontknow_count 번(e2e 분류 T4)
      for (let i = 0; i < NOSPEECH_COUNT; i++) await silentAttempt(o.page);
      if (q < SILENT_ITEMS_MAX) {
        await untilNextChildTurnAfterNospeech(o.page);
        await expect(o.page.locator("[data-blocked]")).toHaveCount(0);
      }
    }
    await expect(o.page.getByText(SILENT_BLOCKED)).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await expect
      .poll(() => alertKindsOf(o.profileId))
      .toContain("speech_silent");
    expect(await alertKindsOf(o.profileId)).not.toContain("mic_stalled");
    const [row] = await e2eDb()
      .select({ status: sessions.status })
      .from(sessions)
      .where(eq(sessions.id, o.sessionId));
    expect(row?.status).toBe("in_progress");
  });

  test("7절 말하기 버튼 행(분석 A2 · N3) 듣는 동안 선생님 말 다시 듣기 · 답 듣기 ①② · 힌트 문장 듣기 단추가 꺼져 있고 듣기가 끝나면 다시 켜진다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(context, (_card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      saidRun("I play soccer."),
      webkitSilentRun(),
    ]);
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    // 선택지는 받침 둘째의 AI 차례에만 남는다('AI 몫 넓힘' 설계 4 · C205 — untilEasyChoices). 카드 항목이 없으니 힌트는 그 AI 질문의 힌트
    // 묶음에서 온다(마지막 단 영어 문장 · 듣기까지 열려면 그 묶음이 있어야 한다). 같은 자리 둘째 막힘이라 힌트 단은 이미 다 열려 있을 수 있다
    await untilEasyChoices(o.page, o.card, {
      next_hint_ko: "좋아하는 것을 말해 봐.",
      next_hints: ["I like ___.", "I like it."],
      next_answer_example: "I like it.",
    });
    await expect(o.page.locator('[data-answer-listen="2"]')).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(o.page);
    // 힌트를 마지막 단(영어 문장과 듣기)까지 연다
    // 단이 하나 열린 것을 본 뒤 다음을 누르고, 문장 단이 열리면 서버에서 글을 받아 듣기 단추가 그려질 때까지 기다린다 — 받기 전에 더 누르면 다 열려
    // 꺼진 단추를 기다린다(e2e 분류 흔들림, child-turn 367 · 594 · 641줄)
    const hint = o.page.getByRole("button", { name: T.hint, exact: true });
    const tiers = o.page.locator("[data-hint-tier]");
    const sentenceTier = o.page.locator('[data-hint-tier="sentence"]');
    while ((await sentenceTier.count()) === 0) {
      const opened = await tiers.count();
      await hint.click();
      await expect(tiers).toHaveCount(opened + 1);
    }
    await expect(o.page.locator("[data-hint-listen]")).toBeVisible({
      timeout: STREAM_END_MS,
    });
    const readers = [
      bubble(o.page),
      o.page.locator('[data-answer-listen="1"]'),
      o.page.locator('[data-answer-listen="2"]'),
      o.page.locator("[data-hint-listen]"),
    ];
    for (const reader of readers) await expect(reader).toBeEnabled();
    const speakButton = o.page.locator("[data-child-turn] [data-speak]");
    await speakButton.click();
    await expect(
      o.page.locator("[data-child-turn] [data-listening]"),
    ).toHaveCount(1);
    for (const reader of readers) await expect(reader).toBeDisabled();
    await speakButton.click();
    await expect(
      o.page.locator("[data-child-turn] [data-listening]"),
    ).toHaveCount(0);
    for (const reader of readers) await expect(reader).toBeEnabled();
  });
});

// ── 마이크 안 잡힘(13절 C210 · 보완 잠정 — 72851d7 의 화면 몫, 단위 시험 talk-mic-deaf 가 판정을 잠근다) ──

test.describe("새 꼴 회화 — 마이크 안 잡힘(C210)", () => {
  test("C210 iPad 꼴 마이크 안 잡힘(audiostart 가 speech.deaf_audiostart_ms 안 · speech.deaf_silence_ms 동안 소리 없음)은 말소리 없음으로 세지 않는다: 짧은 준비 쪽지는 speech.deaf_skip_after 번 이어지면 기술 사유로 다음 낱말로 넘어가고, 대화 차례는 '못 들었어요' · 턴 보냄 없이 안내 한 줄이며 그 수에 닿으면 '잘 모르겠어요' 안내로 바뀐다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    // 대화 차례에서 talk.nospeech_dontknow_count 를 넘게 이어 마이크 안 잡힘 — 말소리 없음 셈에 들면 '모름'으로 보냈을 수다
    const dialogDeaf = Math.max(DEAF_SKIP_AFTER, NOSPEECH_COUNT + 1);
    const o = await openLesson(context, (_card, lesson) => [
      saidRun("I'm good."),
      ...Array.from({ length: DEAF_SKIP_AFTER }, () => deafRun()),
      ...(lesson.card.prep ?? []).slice(1).map((w) => saidRun(w)),
      ...Array.from({ length: dialogDeaf }, () => deafRun()),
    ]);
    if (prepCountOf(o.lesson) < 1) throw new Error("견본 꼴 — 짧은 준비 낱말");
    await untilChildTurn(o.page);
    await pushFakeAi([
      talkLessonReply({ tori_en: "Great! Let's learn some new words!" }),
    ]);
    await speak(o.page);
    // 짧은 준비 첫 낱말: 안 잡힘은 실패 수 · 결과 말 없이 안내 한 줄, speech.deaf_skip_after 번째에 기술 사유 건너뜀 안내 뒤 다음 낱말
    const note = o.page.locator("[data-prep-note]");
    await expect(note).toBeVisible({ timeout: STREAM_END_MS });
    const firstStep = await note.getAttribute("data-prep-step");
    if (firstStep === null) throw new Error("쪽지 차례 표지 없음");
    for (let i = 1; i <= DEAF_SKIP_AFTER; i++) {
      await deafAttempt(note);
      // 건너뜀 안내는 speech.skip_notice_seconds 뒤 다음 낱말로 바뀌므로 먼저 본다
      if (i === DEAF_SKIP_AFTER)
        await expect(note.locator("[data-follow-skipped]")).toHaveText(
          T.micDeafSkip,
        );
      else {
        await expect(note.getByText(T.micDeaf)).toBeVisible();
        await expect(note.locator("[data-follow-skipped]")).toHaveCount(0);
      }
      await expect(note.locator("[data-follow-result]")).toHaveCount(0);
      await expect(note).toHaveAttribute("data-follow-failures", "0");
    }
    // 남은 낱말은 말한다(쪽지가 다음 낱말로 바뀐 뒤)
    let step = firstStep;
    for (let i = 1; i < prepCountOf(o.lesson); i++) {
      await expect(note).not.toHaveAttribute("data-prep-step", step, {
        timeout: STREAM_END_MS,
      });
      step = (await note.getAttribute("data-prep-step")) ?? step;
      await expect(note.locator("[data-speak]")).not.toHaveAttribute(
        "data-speak-waiting",
        "",
        { timeout: STREAM_END_MS },
      );
      await note.locator("[data-speak]").click();
      await expect(note.locator("[data-follow-result]")).toBeVisible();
    }
    // 대화 첫 질문: 안 잡힘은 '못 들었어요' · 말소리 없음 셈 · 회화 턴 요청 없이 안내 한 줄
    await expect(bubble(o.page)).toContainText(o.card.required[0]?.en ?? "", {
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(o.page);
    const before = await talkTurnRequests();
    const turn = childTurn(o.page);
    for (let i = 1; i <= dialogDeaf; i++) {
      await deafAttempt(turn);
      await expect(
        turn.getByText(i < DEAF_SKIP_AFTER ? T.micDeaf : T.micDeafStuck),
      ).toBeVisible();
      await expect(turn.locator('[data-child-said="not_heard"]')).toHaveCount(
        0,
      );
      await expect(o.page.locator("[data-nospeech-move]")).toHaveCount(0);
    }
    expect(await talkTurnRequests()).toBe(before);
    await expect(o.page.locator("[data-blocked]")).toHaveCount(0);
  });
});

// ── 대화 안전 상한(AC-15j — 옛 conversation.spec 의 회귀를 새 꼴로 옮김, 회화 plan 증명 표 묶음 12) ──

test.describe("새 꼴 회화 — 대화 안전 상한(AC-15j)", () => {
  test("AC-15j 대화 안전 상한에 닿은 아이 턴은 AI 를 부르지 않고 카드의 '새 이야기로 이어 가자' 끝인사로 닫히며 '수업 목록'으로 간다", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    // 상한을 둘째 아이 턴으로(인사 1 + 대화 1)
    await withHouseholdSetting("talk.safety_max_turns", 2, async () => {
      const o = await openLesson(context, (_card, lesson) => [
        saidRun("I'm good."),
        ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
        saidRun("I like it."),
      ]);
      await throughGreetingAndPrep(o);
      await untilChildTurn(o.page);
      // 셈은 회화 턴 요청만 — 상한 뒤 끝맺음 호출('Closing: yes')은 앞 턴 메시지를 다시 보내 TURN_MARK 도 들므로 뺀다(e2e 분류 T6)
      const before = await talkTurnRequests();
      await speak(o.page);
      await expect(bubble(o.page)).toContainText(o.card.safetyFarewell.en, {
        timeout: STREAM_END_MS,
      });
      expect(await talkTurnRequests()).toBe(before);
      await expect(o.page.locator("[data-talk-closed]")).toBeVisible();
      await o.page
        .locator("[data-talk-closed]")
        .getByRole("button", { name: "수업 목록" })
        .click();
      await expect(o.page).toHaveURL(/\/talk\/lessons$/);
    });
  });
});

// ── 'AI 몫 넓힘' 묶음 5: 장면 여는 질문 · 신호 말 · 상황 줄 · 요청 수(AC-15ze (나) · AC-15zf (가) · AC-15za (나)(다) · AC-N22, C206 · C207 · C209 · C210) ──
// 견본 talkLessonCard 는 1~3단계 카드에 장면 여는 질문 칸을 둔다(빌더 06:186 꼴). 신호 말 · 상황 줄은 서버가 시드 목록(seed/lists)에서 고르므로
// 기대 글도 같은 파일에서 읽는다. 시험 어휘(기능어 · like · 지어낸 낱말)에는 okay 가 없어 'That's okay!' 꼴 반응은 상황 차례 검사에 걸려 그 자리
// 상황 줄로 바뀐다(설계 1 말 검사 (가) — 실제 시드 어휘에서는 남는다, 단위 talk-allowed-coverage).

const seedList = (name: string): unknown =>
  JSON.parse(readFileSync(`seed/lists/${name}`, "utf8"));
const CUE_LINES = TalkCueLinesFileSchema.parse(seedList("talk-cue-lines.json"));
const SITUATION_LINES = TalkSituationLinesFileSchema.parse(
  seedList("talk-situation-lines.json"),
);
/**
 * 3단계(구간 '2-3') 같이 말하기 자리의 긴 꼴(그 대화의 그 자리 첫 신호 말은 긴 꼴 — spec 설계 6, 어느 긴 꼴인지는 그 행이 대화의 몇 번째 선생님
 * 행인가로 돌리므로 고정하지 않는다, 묶음 2 fix 1 des-3 M-2).
 */
const TOGETHER_LONG = CUE_LINES.together["2-3"].long.map((l) => l.en);
const situationEns = (place: keyof typeof SITUATION_LINES.lines) =>
  (SITUATION_LINES.lines[place] ?? []).map((l) => l.en);

/** 말풍선 글에 그 자리 상황 줄 하나가 들 때까지(어느 줄인지는 턴 번호 돌림이라 고정하지 않는다). */
async function expectSituationLine(
  page: Page,
  place: keyof typeof SITUATION_LINES.lines,
) {
  const lines = situationEns(place);
  await expect
    .poll(
      async () => {
        const text = (await bubble(page).textContent()) ?? "";
        return lines.some((l) => text.includes(l));
      },
      { timeout: STREAM_END_MS, message: `${place} 상황 줄 하나가 말풍선에` },
    )
    .toBe(true);
}

/** 회화 턴 요청 본문(가짜 AI 가 받은 차례대로 — 끝맺음 호출 뺌). */
async function turnBodies(): Promise<string[]> {
  return (await fakeAiRequests())
    .map((r) => r.bodyText)
    .filter((b) => b.includes(TURN_MARK) && !b.includes(CLOSING_MARK));
}

test.describe("'AI 몫 넓힘' — 장면 여는 질문 · 신호 말 · 상황 줄(3단계)", () => {
  test("AC-15ze (나) · AC-N22 · AC-15za (다) 짧은 준비 뒤 장면 여는 질문은 AI 없이 보이고 읽히며, 마이크 안 잡힘은 요청 없이 안내 한 줄이고, 아이 답 뒤 첫 AI 차례 사용자 메시지에 그 질문과 'Follow up on the child's answer: yes' 가 든다(요청은 아이 차례마다 하나)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(
      context,
      (card, lesson) => [
        saidRun("I'm good."),
        ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
        deafRun(),
        saidRun(card.sceneOpener?.answerExample ?? "Yes, I do."),
      ],
      { lesson: talkLessonCard(LEVEL) },
    );
    const scene = o.card.sceneOpener?.question.en;
    if (!scene) throw new Error("견본 꼴 — 1~3단계 카드의 장면 여는 질문");
    const start = await talkTurnRequests();
    await throughGreetingAndPrep(o);
    // 인사 끝 한 번만 불렀다(짧은 준비 · 장면 여는 질문은 앱 — AC-N22)
    expect(await talkTurnRequests()).toBe(start + 1);
    await expect(segmentTag(o.page)).toHaveText("대화");
    await untilChildTurn(o.page);
    // 장면 여는 질문을 선생님 목소리로 읽었다(그 질문 문장)
    const sceneQuestion = sentencesOf(scene).at(-1) ?? scene;
    expect(
      (await speechRecord(o.page)).spoken.some((t) =>
        t.includes(sceneQuestion),
      ),
    ).toBe(true);
    // 마이크 안 잡힘: 턴이 아니다 — 요청 · '못 들었어요' · 말소리 없음 셈 없이 안내 한 줄(C210 · AC-15za (다))
    await deafAttempt(childTurn(o.page));
    await expect(childTurn(o.page).getByText(T.micDeaf)).toBeVisible();
    await expect(
      childTurn(o.page).locator('[data-child-said="not_heard"]'),
    ).toHaveCount(0);
    expect(await talkTurnRequests()).toBe(start + 1);
    // 아이 답 → 첫 AI 차례(이어 묻기). 안내 뒤 말하기 단추가 다시 켜진 뒤 누른다
    await expect(childTurn(o.page).locator("[data-speak]")).not.toHaveAttribute(
      "data-speak-waiting",
      "",
      { timeout: STREAM_END_MS },
    );
    const reply = "Nice! What do you like?";
    await pushFakeAi([
      talkLessonReply({ tori_en: reply, next_move: "follow_up" }),
    ]);
    await speakAndSend(o.page);
    await expect(toriLines(o.page)).toContainText(sentencesOf(reply), {
      timeout: STREAM_END_MS,
    });
    expect(await talkTurnRequests()).toBe(start + 2);
    // 사용자 메시지의 줄 꼴로 본다 — 두 글은 1~3단계 고정부 규칙(system)에도 글자 그대로 들어 낱말만 보면 늘 지난다(rev-5 I-1). 본문은
    // JSON 이라 줄바꿈은 '\n' 두 글자다(TURN_MARK 와 같은 꼴)
    const last = (await turnBodies()).at(-1) ?? "";
    expect(last).toContain(
      `App question just before (not in the turns above): ${scene}`,
    );
    expect(last).toContain("\\nFollow up on the child's answer: yes");
  });

  test("AC-15ze (나) · AC-15zf (가) · AC-15za (나) 장면 여는 질문에서 막히면 첫째는 상황 줄 반응 · 앱 신호 말(긴 꼴) · 답 소리(AI 가 쓴 신호 말은 없음), 둘째는 그 칸의 쉬운 질문과 뜻이다(차례마다 요청 하나)", async ({
    context,
  }) => {
    test.setTimeout(LONG);
    const o = await openLesson(
      context,
      (_card, lesson) => [
        saidRun("I'm good."),
        ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      ],
      { lesson: talkLessonCard(LEVEL) },
    );
    const opener = o.card.sceneOpener;
    if (!opener) throw new Error("견본 꼴 — 1~3단계 카드의 장면 여는 질문");
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    const before = await talkTurnRequests();
    // 받침 첫째(같이 말하기): AI 의 신호 말 문장은 지우고 앱이 시드 신호 말 한 줄을 소리 줄 앞에 붙인다(C207)
    const aiCue = "Let's say it together.";
    await pushFakeAi([
      talkLessonReply({
        tori_en: `That's okay! ${aiCue}`,
        support: "together",
      }),
    ]);
    await o.page.getByRole("button", { name: T.dontKnow }).click();
    await expect(o.page.locator('[data-sound-listen="answer"]')).toBeVisible({
      timeout: STREAM_END_MS,
    });
    let cue = "";
    await expect
      .poll(
        async () => {
          const text = (await bubble(o.page).textContent()) ?? "";
          cue = TOGETHER_LONG.find((l) => text.includes(l)) ?? "";
          return cue;
        },
        { timeout: STREAM_END_MS, message: "같이 말하기 긴 꼴 신호 말 하나" },
      )
      .not.toBe("");
    await expect(bubble(o.page)).not.toContainText(aiCue);
    await expectSituationLine(o.page, "together");
    await untilChildTurn(o.page);
    const spoken = (await speechRecord(o.page)).spoken;
    const cueAt = spoken.findIndex((t) => t.includes(cue));
    const answerAt = spoken.findIndex((t) => t.includes(opener.answerExample));
    expect(cueAt).toBeGreaterThanOrEqual(0);
    expect(answerAt).toBeGreaterThan(cueAt);
    expect(await talkTurnRequests()).toBe(before + 1);
    // 받침 둘째: 그 칸의 쉬운 질문(뜻 함께, 1~3단계 뜻 줄)
    await pushFakeAi([
      talkLessonReply({ tori_en: "That's okay!", support: "easy_question" }),
    ]);
    await o.page.getByRole("button", { name: T.dontKnow }).click();
    await expect(bubble(o.page)).toContainText(opener.easyQuestion.en, {
      timeout: STREAM_END_MS,
    });
    if (opener.easyQuestion.ko)
      await expect(o.page.locator("[data-tori-ko]")).toContainText(
        opener.easyQuestion.ko,
        { timeout: STREAM_END_MS },
      );
    // 신호 말은 지금 턴 말풍선에만 — 지난 차례가 오른 대화 기록 칸에는 없다(spec 설계 6 기록 행 [M-1] · AC-15zf (가))
    await expect(o.page.locator("[data-talk-log]")).not.toContainText(cue);
    expect(await talkTurnRequests()).toBe(before + 2);
  });
});

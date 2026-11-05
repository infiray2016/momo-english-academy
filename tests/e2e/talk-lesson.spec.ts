// 새 꼴 회화 수업 e2e(회화 plan 묶음 11 — 증명 표 AC-15a · 15e · 15f · 15g · 15l · 15m · 15p · 15q · 15s · 15t · N8 · N10 의 화면 몫, 정본 3.3
// 회화 블록 · 4절 회화 세션 표 · 7절). 견본 카드(talkLessonCard — 3단계 배정 수업, 인사 한 턴 · 짧은 준비 낱말 · 필수 질문)를 시험이 넣고
// 진행 세션을 바로 연다. 회화 턴은 가짜 Anthropic SSE(talkLessonReply — 새 꼴 응답 칸), 듣기는 가짜 Web Speech 대본(듣기마다 하나).
// 숫자는 시험용 설정에서 읽는다. 이 파일은 정적이다(이 Mac 에서 돌리지 않음 — 첫 실행은 묶음 14 · CI, 회화 e2e 를 새 꼴 견본으로 옮기는 일은
// 묶음 12). 녹음하지 않는다.
import type { BrowserContext, Page } from "@playwright/test";
import { eq } from "drizzle-orm";
import type { TalkLesson } from "../../src/core/seed/schema/lesson";
import type { TalkCard } from "../../src/core/seed/schema/talk";
import type { RecognitionRun } from "../../src/core/speech/script";
import { sessions } from "../../src/db/schema/learning";
import { parentAlerts } from "../../src/db/schema/operations";
import { TEST_SETTINGS } from "../fixtures/settings";
import { closeE2eDb, e2eDb, resetHousehold, withHouseholdSetting } from "./db";
import { fakeAiRequests, pushFakeAi, resetFakeAi } from "./fake-ai";
import { expect, speechPage, test } from "./fixtures";
import {
  insertTalkLesson,
  openTalkSession,
  saidRun,
  speechRecord,
  TURN_MARK,
  talkHousehold,
  talkLessonCard,
  talkLessonReply,
  talkScript,
  webkitSilentRun,
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
} as const;
const MS = 1000;
const LONG = 120_000;
const STREAM_END_MS = 30_000;
const LEVEL = 3;
const WAIT_LINE_MS = TEST_SETTINGS["talk.wait_line_seconds"].value * MS;
const NOSPEECH_COUNT = TEST_SETTINGS["talk.nospeech_dontknow_count"].value;
const MORE_ROUND = TEST_SETTINGS["talk.more_talk_round_turns"].value;
const SILENT_ITEMS_MAX = TEST_SETTINGS["speech.silent_items_max"].value;
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
  const lesson = talkLessonCard(LEVEL);
  const first = lesson.card.required[0];
  if (!first) throw new Error("견본 꼴 — 필수 질문이 있는 배정 수업");
  return {
    ...lesson,
    newWords: [],
    card: { ...lesson.card, required: [first] },
  };
}

/**
 * 1~3단계 선택지 둘(소리 줄): 카드 필수 1 의 노리는 단어를 담은 답과 같은 꼴의 'it' 답(낱말 하나만 다름 — question-check checkChoices).
 * 낱말은 시험 어휘(I · like · it)와 단원 단어 안이다. 가짜 응답에 card_item 필수 1 을 함께 둔다(노리는 단어의 출처).
 */
function choicesOf(card: TalkCard): readonly [string, string] {
  const target = card.required[0]?.targets[0];
  if (!target) throw new Error("견본 꼴 — 첫 필수 질문 노리는 단어");
  return [`I like ${target}.`, "I like it."];
}

/** 3단계 새 꼴 견본을 넣고 회화 쪽을 연다(처음 마이크 안내 '알겠어요'까지). 견본은 기본 배정 수업 카드, lesson 으로 바꿀 수 있다. */
async function openLesson(
  context: BrowserContext,
  runs: (card: TalkCard, lesson: TalkLesson) => RecognitionRun[],
  { lesson = talkLessonCard(LEVEL) }: { lesson?: TalkLesson } = {},
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
  await expect(bubble(o.page)).toContainText(o.card.required[0]?.en ?? "", {
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
    await pushFakeAi([
      talkLessonReply({ tori_en: "Great! Let's learn some new words!" }),
    ]);
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
    const before = (await fakeAiRequests()).filter((r) =>
      r.bodyText.includes(TURN_MARK),
    ).length;
    await expect(bubble(o.page)).toContainText(o.card.required[0]?.en ?? "", {
      timeout: STREAM_END_MS,
    });
    await expect(segmentTag(o.page)).toHaveText("대화");
    await expect(band(o.page)).not.toContainText("/");
    await expect(o.page.locator("[data-talk-log]")).toContainText(
      "Let's learn some new words!",
    );
    expect(
      (await fakeAiRequests()).filter((r) => r.bodyText.includes(TURN_MARK))
        .length,
    ).toBe(before);
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
    await expect(band(o.page)).toHaveText("말 주고받기 1", {
      timeout: STREAM_END_MS,
    });
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
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    // 카드 첫 필수 질문 자리의 힌트(카드 힌트 — 3단계는 한국어 뜻 → 영어 틀 → 영어 문장)
    const hint = o.page.locator("[data-hint-button]");
    await expect(o.page.locator("[data-hint-nudge]")).toBeVisible();
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
      await speak(o.page);
      if (i < NOSPEECH_COUNT - 1)
        await expect(
          o.page.locator('[data-child-said="not_heard"]'),
        ).toBeVisible();
    }
    await expect(o.page.locator("[data-nospeech-move]")).toBeVisible();
    await untilChildTurn(o.page);
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
    await expect(band(o.page)).toHaveText("말 주고받기 1");
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
    await speak(o.page);
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
    await speak(o.page);
    await untilChildTurn(o.page);
    await expect(o.page.locator('[data-hint-tier="sentence"]')).toBeVisible();
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
    // 선택지는 말로 답한 AI 질문 차례에서만 쓰인다(1~3단계 첫 막힘은 카드 자리라 AI choices 를 쓰지 않음). 둘은 시험 어휘 안 · 같은 꼴 ·
    // 낱말 하나만 다르고, 노리는 단어는 card_item(필수 1)에서 온다(checkChoices no_target — required-utterance AC-23f 와 같은 차림)
    const o = await openLesson(context, (card, lesson) => [
      saidRun("I'm good."),
      ...(lesson.card.prep ?? []).map((w) => saidRun(w)),
      saidRun(card.required[0]?.answerExample ?? "I like it."),
    ]);
    const [a, b] = choicesOf(o.card);
    await throughGreetingAndPrep(o);
    await untilChildTurn(o.page);
    await pushFakeAi([
      talkLessonReply({
        tori_en: "Nice! Do you like it? Listen and say!",
        choices: [a, b],
        support: "choices",
        next_move: "follow_up",
        card_item: { kind: "required", no: 1 },
      }),
    ]);
    await speak(o.page);
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
    // AI 질문은 시험 어휘 안(AC-15i). 카드 항목(필수 1)을 둬 그 자리의 답 예시가 카드 답 예시다(lesson-flow slotOf)
    await pushFakeAi([
      talkLessonReply({
        tori_en: "Nice! Do you like it?",
        next_move: "follow_up",
        card_item: { kind: "required", no: 1 },
      }),
    ]);
    await speak(o.page);
    await expect(attempt).toHaveCount(0, { timeout: STREAM_END_MS });
    await expect(bubble(o.page)).toContainText("Nice!", {
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(o.page);
    // 그 자리의 첫 막힘('잘 모르겠어요')은 같이 말하기 카드 자리 — 앱이 카드 답 예시를 소리 줄(answer)로 붙인다(lesson-flow stuckPlan)
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
  test("C148 AC-N3 iPad WebKit 꼴의 말소리 없는 듣기로 질문 자리가 speech.silent_items_max 번 이어 들리지 않음으로 닫히면 '마이크가 멈춤'이 아니라 '말소리가 잘 안 들려요' 안내와 '말소리가 들어오지 않음' 알림이 나오고 세션은 진행이다", async ({
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
    for (let q = 1; q <= SILENT_ITEMS_MAX; q++) {
      await untilChildTurn(o.page);
      for (let i = 0; i < NOSPEECH_COUNT; i++) await speak(o.page);
      if (q < SILENT_ITEMS_MAX)
        await expect(o.page.locator("[data-blocked]")).toHaveCount(0);
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
    // 선택지는 시험 어휘 안 · 노리는 단어는 card_item(필수 1)에서(checkChoices offband · no_target — AC-23f 와 같은 차림)
    await pushFakeAi([
      talkLessonReply({
        tori_en: "Nice! Do you like it? Listen and say!",
        choices: [...choicesOf(o.card)],
        support: "choices",
        next_move: "follow_up",
        card_item: { kind: "required", no: 1 },
      }),
    ]);
    await speak(o.page);
    await expect(o.page.locator('[data-answer-listen="2"]')).toBeVisible({
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(o.page);
    // 힌트를 마지막 단(영어 문장과 듣기)까지 연다
    const hint = o.page.getByRole("button", { name: T.hint, exact: true });
    while ((await o.page.locator("[data-hint-listen]").count()) === 0)
      await hint.click();
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
      const before = (await fakeAiRequests()).filter((r) =>
        r.bodyText.includes(TURN_MARK),
      ).length;
      await speak(o.page);
      await expect(bubble(o.page)).toContainText(o.card.safetyFarewell.en, {
        timeout: STREAM_END_MS,
      });
      expect(
        (await fakeAiRequests()).filter((r) => r.bodyText.includes(TURN_MARK))
          .length,
      ).toBe(before);
      await expect(o.page.locator("[data-talk-closed]")).toBeVisible();
      await o.page
        .locator("[data-talk-closed]")
        .getByRole("button", { name: "수업 목록" })
        .click();
      await expect(o.page).toHaveURL(/\/talk\/lessons$/);
    });
  });
});

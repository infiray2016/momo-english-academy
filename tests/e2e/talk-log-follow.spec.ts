// 기존 방식(talk.lead_mode app) 회화의 긴 대화 한 장면(묶음 S5 — 화면 검토 task-des-s3-report 1.1 (나) · 1.4 의 3, 정본 03 4절 94 · 97줄 ·
// 15절 AC-26m). 대화 기록 칸 · 아이 차례 조각은 두 방식이 함께 쓴다. 기존 방식 사진은 주고받기가 둘 이하라 기록 칸이 넘치지 않아 '지금
// 말풍선이 기록 칸 아래로 가려짐(C-1)' · '으뜸 단추가 보는 창 밖(I-2)'이 찍히지 않았다. 앞선 대화 차례를 DB 에 바로 넣어 기록 칸을 넘치게 한 뒤
// 한 차례를 진행하고, 지금 턴의 아래 끝이 기록 칸 안에 있는지와 말하기 단추가 보는 창 안에 있는지를 재고 두 방향 사진을 남긴다(가로 사진은
// 돌려 찍기 — 칸 높이가 바뀐 뒤 다시 맞추는지(M-6)는 보는 창을 직접 돌려 잰다). 이 Mac 은 e2e DB 가 뜨지 않아 CI 에서 돈다.
import type { Page } from "@playwright/test";
import { eq, max } from "drizzle-orm";
import { talkMoveOf } from "../../src/core/conversation/move";
import { talkTurns } from "../../src/db/schema/learning";
import { CHILD_VIEWPORTS } from "./child-size";
import { closeE2eDb, e2eDb, resetHousehold } from "./db";
import { pushFakeAi, resetFakeAi } from "./fake-ai";
import { expect, speechPage, test } from "./fixtures";
import { photo } from "./photos";
import {
  insertTalkLesson,
  openTalkSession,
  saidRun,
  skipStartPrep,
  talkHousehold,
  talkLessonCard,
  talkLessonReply,
  talkScript,
  talkTurnRequests,
} from "./talk";
import { expectInView, expectNowInLog } from "./talk-in-view";

const T = { start: "시작!", micOk: "알겠어요" } as const;
const LONG = 120_000;
const STREAM_END_MS = 30_000;
const LEVEL = 3;
/** 넣을 앞선 대화 차례 쌍(기록 칸이 세로 · 가로 모두 넘치고, 셈이 참고 턴에 닿지 않는 수 — 시험 값). */
const PAIRS = 6;
const SAYS = "I like it.";
/**
 * 넣은 뒤 진행할 선생님 차례(문장 둘 · 뜻 — 지금 턴이 칸 아래로 자라는 꼴). 물음을 넣지 않는다 — 지금 길의 1~3단계 질문 검사가 질문을 바꾸면
 * 글 단언이 흔들린다(앱이 카드 질문 · 신호 말을 붙이면 지금 턴은 더 자랄 뿐이다).
 */
const REPLY = {
  tori_en: "Great! I like it too.",
  tori_ko: ["좋아!", "나도 그거 좋아."],
};
/** 진행한 차례의 말풍선에만 있는 글(넣은 행 'Nice! I like it too.' 에 없음 — 검토 rev-s5 I-1). */
const NEW_ONLY = "Great!";
/** 진행한 차례의 뜻 줄 끝(지금 턴의 맨 아래 요소 — C-1 이 가리던 것). */
const NEW_KO_LAST = REPLY.tori_ko[1] ?? "";
const PHOTO = "talk-app-long-log-now-turn";

test.beforeEach(async () => {
  await resetHousehold();
  await resetFakeAi();
});
test.afterEach(resetFakeAi);
test.afterAll(closeE2eDb);

/** 앞선 대화 차례를 바로 넣는다(아이 행 · 선생님 행 한 쌍씩 — talk-lead.spec 의 insertExchanges 와 같은 꼴). */
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
        text: SAYS,
        inputMode: "speech",
        clientAttemptId: `e2e-follow-${sessionId}-${turnNo}`,
        recordedAt: at,
      },
      {
        sessionId,
        turnNo: turnNo + 1,
        segment: "talk",
        speaker: "tori",
        text: "Nice! I like it too.",
        move: talkMoveOf({ kind: "ai" }),
        recordedAt: at,
      },
    ]);
    turnNo += 1;
  }
}

const childTurn = (page: Page) => page.locator("[data-child-turn]");

async function untilChildTurn(page: Page) {
  await expect(childTurn(page)).toBeVisible({ timeout: STREAM_END_MS });
  await expect(
    page.locator("[data-talk-panel][data-talk-reading]"),
  ).toHaveCount(0, { timeout: STREAM_END_MS });
}

test.describe("기존 방식 회화의 긴 대화(3단계)", () => {
  test("AC-26m 기존 방식: 기록 칸이 넘친 뒤 진행한 선생님 차례의 지금 턴 아래 끝이 기록 칸 안에 있고, 말하기 단추가 보는 창 안에 있다", async ({
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
      talkScript(Array.from({ length: 6 }, () => saidRun(SAYS))),
    );
    await page.goto(`/session/${sessionId}`);
    await expect(page.locator("[data-talk-start]")).toBeVisible();
    await page.getByRole("button", { name: T.start }).click();
    await expect(page.locator("[data-mic-notice]")).toBeVisible();
    await page.getByRole("button", { name: T.micOk }).click();

    // 인사 → 대화 첫 질문(앱이 보이고 읽음, AI 없음)
    await untilChildTurn(page);
    await pushFakeAi([talkLessonReply({ tori_en: "Great! Now let's start!" })]);
    await page.locator("[data-child-turn] [data-speak]").click();
    await expect(page.locator("[data-talk-log]")).toContainText(
      "Now let's start!",
      { timeout: STREAM_END_MS },
    );
    await untilChildTurn(page);

    // 앞선 대화 차례를 넣고 쪽을 다시 연다(이어 하기 — 지난 말이 기록 칸에 다시 그려져 칸이 넘친다)
    await insertExchanges(sessionId, PAIRS);
    await page.reload();
    await page.getByRole("button", { name: T.start }).click();
    await untilChildTurn(page);
    const overflow = await page
      .locator("[data-talk-log]")
      .evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(overflow).toBeGreaterThan(0);
    await expectNowInLog(page);

    // 한 차례 진행: 선생님 말(문장 둘 · 뜻)이 흐른 뒤에도 지금 턴이 기록 칸 안에 온전히 있고 말하기 단추가 보는 창 안이다. 새 차례에만 있는 것
    // (가짜 AI 회화 턴 요청이 하나 늚 · 말풍선의 'Great!' — 넣은 행 'Nice! I like it too.' 에 없고 기록의 'Great! Now let's start!' 는 말풍선 밖 ·
    // 지금 턴의 맨 아래 요소인 뜻 줄)을 기다린 뒤 잰다(검토 rev-s5 I-1 — 진행 전 말풍선으로 곧바로 통과하지 않게)
    const turnsBefore = await talkTurnRequests();
    await pushFakeAi([talkLessonReply(REPLY)]);
    await page.locator("[data-child-turn] [data-speak]").click();
    await expect
      .poll(talkTurnRequests, { timeout: STREAM_END_MS })
      .toBe(turnsBefore + 1);
    await expect(page.locator("[data-tori-bubble]")).toContainText(NEW_ONLY, {
      timeout: STREAM_END_MS,
    });
    await expect(page.locator("[data-tori-ko]")).toContainText(NEW_KO_LAST, {
      timeout: STREAM_END_MS,
    });
    await untilChildTurn(page);
    await expectNowInLog(page);
    await expectInView(page.locator("[data-child-turn] [data-speak]"));
    await photo(page, PHOTO);
    // 기기를 돌린 뒤에도 지금 턴은 기록 칸 안이다(칸 높이가 바뀌면 다시 맞춤 — 화면 검토 M-6). 사진 도우미에 기대지 않고 보는 창을 직접 가로로
    // 바꿔 잰 뒤 세로로 되돌린다(검토 rev-s5 M-6 — photo() 는 E2E_PHOTOS 가 없으면 아무것도 하지 않는다)
    await page.setViewportSize(CHILD_VIEWPORTS.landscape);
    await expectNowInLog(page);
    await page.setViewportSize(CHILD_VIEWPORTS.portrait);
    await expectNowInLog(page);
  });
});

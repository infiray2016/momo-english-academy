// 홈 e2e(4절 홈 표 · AC-2a · AC-5c, plan-p10b 증명 표 — 차례 3 몫). 실제 e2e DB(시험용 시드, 완전성 1단계)를 쓴다.
// '내 단계 찾기'는 배치 평가 화면(차례 5)으로, 카드는 수업 목록(차례 4)으로 간다(여기서는 가는 곳과 첫 화면만 본다).
// 설계 숫자(별 수)는 시험 설정값(TEST_SETTINGS)에서 읽는다.
// 첫 사용 꼴(13절 C166 R7 · UX 검토 3판 U2-1 · U2-2 · U2-3): 수업을 하나도 안 한 영역은 '첫 수업을 해 봐요'와 큰 단추, 오늘 할 것이 남은
// 앞 영역 하나에 '여기부터 해요'. 보통 꼴(이번 주 · 오늘)을 보는 시험은 지난 끝낸 수업을 하나 넣고 연다(insertPastLessons).
// UI · UX 묶음 3([승인 UX2] · R-4 · R-8 · R-12 · AC-23c · AC-23h): 카드는 영역 이름 · 영역 그림 · 단계 · 오늘 · 큰 단추이고 단원 5칸 · 막대는
// 수업 목록 위 띠로 옮겼다. 회화 카드는 작은 초상과 오늘 이야기 제목(수업 목록 '여기부터 해요' 회화 수업). 위 띠 연속 · 별 칸은 값 1 이상일 때만.

import type { Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { learningDayOf } from "../../src/core/learning-day";
import { sessions, unitProgress } from "../../src/db/schema/learning";
import { settings } from "../../src/db/schema/operations";
import { TEST_SETTINGS } from "../fixtures/settings";
import { addAccessCookie } from "./access-cookie";
import {
  CHILD_VIEWPORTS,
  type LayoutBox,
  layoutBoxesOf,
  spreadOf,
} from "./child-size";
import { closeE2eDb, e2eDb, insertSessions, resetHousehold } from "./db";
import { expect, loadSpeechScript, speechPage, test } from "./fixtures";
import { insertHousehold } from "./household";
import {
  atLevel,
  compositionSample,
  insertReadyDraft,
  insertSampleLesson,
} from "./lessons";
import { photo } from "./photos";

const T = {
  findLevel: "내 단계 찾기",
  findSpeakingLevel: "말하기 단계 찾기",
  firstLesson: "첫 수업을 해 봐요",
  startHere: "여기부터 해요",
  needsSpeaking: "말하기에서 단계를 찾으면 회화 선생님을 만날 수 있어요",
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  todayDone: "오늘 다 했어요",
  todayNotYet: "오늘 아직이에요",
  start: "시작!",
  chooseStory: "이야기 고르기",
  findLevelHint: "단계를 몰라도 돼요. 짧은 문제로 찾아요",
  micRecheck: "마이크를 켰으면 여기를 눌러 다시 확인해요",
  placementStart: /^처음이라 내게 맞는 단계를 찾아요/,
} as const;
const AREAS = ["reading", "writing", "speaking", "talk"] as const;
const MIC_STATE_KEY = "momo.mic.v1";

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

/** 그 영역 카드(포스트잇 — 링크이거나 누를 수 없는 단추). */
/** 같은 크기로 보는 어긋남(px, 시험 값 — 반올림 한 칸). */
const SAME_PX = 1;
/** 같은 줄로 보는 위 끝 차이(px, 시험 값 — 카드 높이보다 작게). */
const SAME_ROW_PX = 100;

/** 위 끝이 가까운 것끼리 줄로 묶는다. */
function rowsOf(boxes: readonly LayoutBox[]): LayoutBox[][] {
  const rows: LayoutBox[][] = [];
  for (const box of boxes) {
    const row = rows.find(
      (r) => Math.abs((r[0]?.top ?? 0) - box.top) < SAME_ROW_PX,
    );
    if (row) row.push(box);
    else rows.push([box]);
  }
  return rows;
}

const card = (page: Page, area: string) =>
  page
    .locator(`a, button`)
    .filter({ has: page.locator(`[data-home-card="${area}"]`) });

/** 오래전에 끝낸 정규 수업(첫 사용 꼴이 아니게 — 이번 주 · 최근 성적 · 끝낸 대화에는 들지 않는다, C166 R7). */
const PAST_DAY = "2020-01-06";
async function insertPastLessons(
  profileId: string,
  areas: readonly (typeof AREAS)[number][],
): Promise<void> {
  const at = new Date(`${PAST_DAY}T03:00:00Z`);
  await insertSessions(
    areas.map((area) => ({
      profileId,
      area,
      level: 1,
      unit: 1,
      kind: "regular" as const,
      status: "completed" as const,
      startedAt: at,
      completedAt: at,
      learningDay: PAST_DAY,
    })),
  );
}

async function todayLearningDay(): Promise<string> {
  const rows = await e2eDb().select().from(settings);
  const value = (key: string) =>
    rows.find((r) => r.key === key && r.profileId === null)?.value;
  return learningDayOf(
    new Date(),
    String(value("app.timezone")),
    Number(value("app.day_start_hour")),
  );
}

test("AC-2a 홈의 영역 카드 4개에 영역 이름 · 영역 그림 · 단계 · 오늘 · 이번 주 n일이 보이고 단원 5칸 · 막대는 없으며, 회화 카드는 작은 초상 · 오늘 이야기 제목이고 카드 · '시작!' · '이야기 고르기'는 수업 목록(배치 전은 배치 평가)으로 간다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({
    startLevels: { reading: 1, writing: 1, speaking: 1, talk: 1 },
  });
  // 보통 꼴을 본다(첫 사용 꼴은 아래 U2-1 시험)
  await insertPastLessons(profileId, AREAS);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "모모의 공부 보드",
  );
  // 별 합(3.5 R12 — P12 전 잠정 셈, C166 R3 fix 1): 지난 수업 넷(정규 · 끝냄)은 하나에 reward.star_complete 개
  await expect(page.locator("[data-star-total]")).toHaveText(
    `별 ${AREAS.length * TEST_SETTINGS["reward.star_complete"].value}개`,
  );
  // 단원 5칸 · 막대는 홈에 없다(수업 목록 위 띠로 — [승인 UX2])
  await expect(page.locator("[data-unit-cells]")).toHaveCount(0);
  await expect(page.locator("[data-recent-cells]")).toHaveCount(0);
  for (const area of AREAS) {
    const c = card(page, area);
    await expect(c).toHaveCount(1);
    await expect(c.locator(`[data-area-art="${area}"]`)).toHaveCount(1);
    await expect(c).toContainText("1단계");
    await expect(c).not.toContainText("단원 1");
    await expect(c).not.toContainText("아는 단어");
    await expect(c).toContainText("이번 주 0일");
    if (area === "talk") {
      // 오늘 자리는 오늘 이야기 제목('오늘 아직이에요' 자리, R-8), 영역 이름 옆 작은 초상(고르기 전 '선')
      await expect(c).not.toContainText(T.todayNotYet);
      await expect(c.locator("[data-story-title]")).toHaveCount(1);
      await expect(
        c.locator('[data-home-portrait] [data-teacher-portrait="initial"]'),
      ).toHaveCount(1);
      await expect(c).toContainText(T.chooseStory);
      // 회화 카드도 그 영역 수업 목록으로(plan-p13b 값 12 — '토리가 준비 중이에요' 자리 /talk 는 지움)
      await expect(c).toHaveAttribute("href", "/talk/lessons");
    } else {
      await expect(c).toContainText(T.todayNotYet);
      await expect(c.locator("[data-home-portrait]")).toHaveCount(0);
      await expect(c).toContainText(T.start);
      // 카드 전체가 그 영역 수업 목록으로 가는 링크(카드 안 '시작!'도 같은 링크 안, R14)
      await expect(c).toHaveAttribute("href", `/${area}/lessons`);
    }
  }
  // 오늘 이야기 제목 = 회화 수업 목록의 '여기부터 해요' 수업 제목(4절 회화 카드 행)
  const storyTitle =
    (await card(page, "talk").locator("[data-story-title]").textContent()) ??
    "";
  expect(storyTitle.trim().length).toBeGreaterThan(0);
  await card(page, "talk").click();
  await expect(page).toHaveURL(/\/talk\/lessons$/);
  await expect(
    page
      .locator("[data-lesson]")
      .filter({ has: page.locator("[data-lesson-badge]") }),
  ).toContainText(storyTitle.trim());
  await page.getByRole("link", { name: "홈" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "모모의 공부 보드",
  );

  // 배치 평가 전: 단계 자리에 '내 단계 찾기'이고 카드는 그 영역 배치 평가로, 회화는 말하기 배치 평가로 간다(4절 홈 표)
  await resetHousehold();
  await insertHousehold();
  await page.goto("/");
  for (const area of ["reading", "writing", "speaking"]) {
    await expect(card(page, area)).toContainText(T.findLevel);
    // 잠긴 것으로 보이지 않게 한 줄 안내(요청자 프리뷰 2026-10-18, C72)
    await expect(card(page, area)).toContainText(T.findLevelHint);
    await expect(card(page, area)).toHaveAttribute(
      "href",
      `/${area}/placement`,
    );
  }
  await expect(card(page, "talk")).toContainText(T.needsSpeaking);
  // U2-3 배치 전 회화 카드 단추는 가는 곳대로 '말하기 단계 찾기'
  await expect(card(page, "talk")).toContainText(T.findSpeakingLevel);
  await expect(card(page, "talk")).toHaveAttribute(
    "href",
    "/speaking/placement",
  );
  // 눌러 들어가면 배치 평가 시작 화면(4절 시작 문구)이다
  await card(page, "reading").click();
  await expect(page).toHaveURL(/\/reading\/placement$/);
  await expect(page.getByText(T.placementStart)).toBeVisible();
  await expect(page.getByRole("button", { name: "시작" })).toBeVisible();
});

test("AC-2a 부모 확인 대기 영역은 다시 하기 하나로, 단계 평가 세션 하나만 끝낸 영역도 오늘 완료가 켜진다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({
    startLevels: { reading: 1, writing: 1 },
  });
  await e2eDb()
    .update(unitProgress)
    .set({ parentCheck: "pending" })
    .where(
      and(
        eq(unitProgress.profileId, profileId),
        eq(unitProgress.area, "reading"),
      ),
    );
  const day = await todayLearningDay();
  const at = new Date();
  await insertSessions([
    {
      profileId,
      area: "reading",
      level: 1,
      unit: 1,
      kind: "retry",
      status: "completed",
      startedAt: at,
      completedAt: at,
      learningDay: day,
    },
    {
      profileId,
      area: "writing",
      level: 1,
      kind: "level_test",
      status: "completed",
      startedAt: at,
      completedAt: at,
      learningDay: day,
    },
  ]);
  await page.goto("/");
  for (const area of ["reading", "writing"]) {
    await expect(card(page, area).locator('[data-today="done"]')).toHaveText(
      T.todayDone,
    );
    await expect(card(page, area)).toContainText("이번 주 1일");
  }
  // 새 수업도 다시 하기도 없는 영역은 그대로 '오늘 아직이에요'(수업을 해 본 적 있는 영역 — 첫 사용 꼴이 아님)
  await resetHousehold();
  const again = await insertHousehold({ startLevels: { reading: 1 } });
  await insertPastLessons(again.profileId, ["reading"]);
  await page.goto("/");
  await expect(card(page, "reading")).toContainText(T.todayNotYet);
});

test("U2-1 · U2-2 수업을 하나도 안 한 영역 카드는 '첫 수업을 해 봐요'와 큰 단추이고 0 · 빈 막대 · 0일이 없으며 오늘 할 것이 남은 앞 영역 하나에 '여기부터 해요'가 붙는다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({
    startLevels: { reading: 1, writing: 1, speaking: 1, talk: 1 },
  });
  // 쓰기는 해 본 영역(보통 꼴)
  await insertPastLessons(profileId, ["writing"]);
  await page.goto("/");
  await expect(page.locator("[data-home-cards][data-hydrated]")).toHaveCount(1);
  // 끝낸 새 수업 하나 → 별 합(R12 잠정 셈)
  await expect(page.locator("[data-star-total]")).toHaveText(
    `별 ${TEST_SETTINGS["reward.star_complete"].value}개`,
  );
  for (const area of ["reading", "speaking", "talk"] as const) {
    const c = card(page, area);
    await expect(c.locator("[data-first-lesson]")).toHaveText(T.firstLesson);
    await expect(c).toContainText("1단계");
    await expect(c).toContainText(area === "talk" ? T.chooseStory : T.start);
    await expect(c).not.toContainText("아는 단어");
    await expect(c).not.toContainText("끝낸 대화");
    await expect(c).not.toContainText("이번 주");
    await expect(c).not.toContainText(T.todayNotYet);
    await expect(c.locator("[data-recent-cells]")).toHaveCount(0);
    await expect(c.locator("[data-story-title]")).toHaveCount(0);
  }
  await expect(
    card(page, "writing").locator("[data-first-lesson]"),
  ).toHaveCount(0);
  await expect(card(page, "writing")).toContainText("이번 주 0일");
  await expect(card(page, "writing")).toContainText(T.todayNotYet);
  // '여기부터 해요'는 한 장 — 판 차례의 앞 영역(읽기), 카드 링크의 읽히는 이름에 든다
  await expect(page.locator("[data-start-here]")).toHaveCount(1);
  await expect(card(page, "reading").locator("[data-start-here]")).toHaveText(
    T.startHere,
  );
  await expect(card(page, "reading")).toHaveAttribute(
    "href",
    "/reading/lessons",
  );
  await page.setViewportSize(CHILD_VIEWPORTS.portrait);
  await photo(page, "home-first-use");
});

test("AC-23c 끝낸 세션이 없는 프로필의 첫 사용 홈은 위 띠에 연속 · 별 칸이 없어 0 이 보이지 않고 카드에도 0 · '오늘 아직이에요'가 없으며, 첫 별을 받은 뒤에는 별 칸 하나가 보인다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({
    startLevels: { reading: 1, writing: 1, speaking: 1, talk: 1 },
  });
  await page.goto("/");
  await expect(page.locator("[data-home-cards][data-hydrated]")).toHaveCount(1);
  // 위 띠(R-12 · C179 (1)): 별 0 → 별 칸 0개, 연속 칸 없음, 띠 글에 0 없음
  await expect(page.locator("[data-star-total]")).toHaveCount(0);
  await expect(page.locator("[data-streak]")).toHaveCount(0);
  const band = (await page.locator("[data-paper-band]").innerText()) ?? "";
  expect(band).not.toMatch(/(^|\D)0(\D|$)/);
  // 카드 넷: '첫 수업을 해 봐요' 한 줄 · 숫자 0 · 막대 · '오늘 아직이에요' 없음
  await expect(page.locator("[data-first-lesson]")).toHaveCount(AREAS.length);
  await expect(page.getByText(T.todayNotYet)).toHaveCount(0);
  for (const area of AREAS) {
    const text = await card(page, area).innerText();
    expect(text, area).not.toMatch(/(^|\D)0(\D|$)/);
  }
  await photo(page, "ux3-home-first-use");
  // 첫 별(끝낸 새 수업 하나) 뒤에는 별 칸이 하나
  await insertPastLessons(profileId, ["reading"]);
  await page.reload();
  await expect(page.locator("[data-star-total]")).toHaveCount(1);
  await expect(page.locator("[data-star-total]")).toHaveText(
    `별 ${TEST_SETTINGS["reward.star_complete"].value}개`,
  );
});

test("AC-23h 홈 사진(가로 · 세로)은 시안 ② 홈 구성이다: 책상 바탕 · 같은 크기 카드 넷 · 카드마다 영역 이름과 그림 · 단계 · 오늘 · 단추 · 회화 카드의 작은 초상과 오늘 이야기 · '여기부터 해요' 표지 하나, 단원 5칸 · 막대는 없다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({
    startLevels: { reading: 1, writing: 1, speaking: 1, talk: 1 },
    teacherKey: "mina",
  });
  await insertPastLessons(profileId, AREAS);
  // 읽기는 오늘 새 수업을 끝내 '오늘 다 했어요' 표지(쓰기는 '오늘 아직이에요' — 두 꼴이 한 사진에)
  const day = await todayLearningDay();
  const at = new Date();
  await insertSessions([
    {
      profileId,
      area: "reading",
      level: 1,
      unit: 1,
      kind: "regular",
      status: "completed",
      startedAt: at,
      completedAt: at,
      learningDay: day,
    },
  ]);
  await page.goto("/");
  await expect(page.locator("[data-home-cards][data-hydrated]")).toHaveCount(1);
  await expect(page.locator("[data-desk]")).toHaveCount(1);
  await expect(page.locator("[data-home-cards] > *")).toHaveCount(4);
  await expect(page.locator("[data-area-art]")).toHaveCount(4);
  await expect(page.locator("[data-unit-cells]")).toHaveCount(0);
  await expect(page.locator("[data-recent-cells]")).toHaveCount(0);
  await expect(card(page, "reading").locator('[data-today="done"]')).toHaveText(
    T.todayDone,
  );
  await expect(
    card(page, "talk").locator(
      '[data-home-portrait] [data-teacher-portrait="mina"][data-portrait-shape="window"]',
    ),
  ).toHaveCount(1);
  await expect(card(page, "talk").locator("[data-story-title]")).toHaveCount(1);
  await expect(page.locator("[data-start-here]")).toHaveCount(1);
  for (const way of ["portrait", "landscape"] as const) {
    await page.setViewportSize(CHILD_VIEWPORTS[way]);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
    );
    const cards = await layoutBoxesOf(page.locator("[data-home-cards] > *"));
    expect(spreadOf(cards.map((c) => c.height)), way).toBeLessThanOrEqual(
      SAME_PX,
    );
    expect(spreadOf(cards.map((c) => c.width)), way).toBeLessThanOrEqual(
      SAME_PX,
    );
  }
  await photo(page, "ux3-home");
});

test.describe("인식 API 없음", () => {
  test.use({ speechScript: loadSpeechScript("no-recognition-api") });

  test("AC-5c 음성 인식 API 가 없는 브라우저와 마이크 권한을 거부한 기기에서 홈을 열면 말하기 · 회화 카드에 '마이크가 필요해요. 부모님께 말해 주세요'가 보이고 눌리지 않으며 읽기 · 쓰기 카드는 열린다", async ({
    page,
    context,
  }) => {
    await insertHousehold({
      startLevels: { reading: 1, writing: 1, speaking: 1, talk: 1 },
    });
    await page.goto("/");
    for (const area of ["speaking", "talk"]) {
      await expect(card(page, area)).toContainText(T.needsMic);
      await expect(card(page, area)).toHaveAttribute("aria-disabled", "true");
      await expect(card(page, area)).not.toHaveAttribute("href", /.*/);
    }
    for (const area of ["reading", "writing"]) {
      await expect(card(page, area)).toHaveAttribute(
        "href",
        `/${area}/lessons`,
      );
    }
    // 마이크 권한을 거부한 기기: 인식 API 는 있으나 이 브라우저에 '쓸 수 없음'이 저장됨
    // 새 쪽에도 인식 API 가 있는 가짜를 넣어 닫힘 까닭을 저장된 '쓸 수 없음' 하나로 고정한다(검토 review-p10-3-code I-1)
    const denied = await speechPage(context, "default-ok");
    await denied.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          state: "unavailable",
          code: "not-allowed",
          at: "2026-10-17T00:00:00Z",
        }),
      );
    }, MIC_STATE_KEY);
    await denied.goto("/");
    await expect(card(denied, "speaking")).toContainText(T.needsMic);
    // 1-가 임시 되돌리기: 닫힌 말하기 카드 아래 '다시 확인'을 누르면 저장된 '쓸 수 없음'을 지우고 다시 판정해 카드가 열린다
    // (인식 API 가 있는 기기 — 요청자 프리뷰 2026-10-18, 1-나 부모 화면 '마이크 다시 확인'이 대신할 때까지)
    await denied.getByRole("button", { name: T.micRecheck }).click();
    await expect(card(denied, "speaking")).toHaveAttribute(
      "href",
      "/speaking/lessons",
    );
    await expect(card(denied, "talk")).not.toContainText(T.needsMic);
    expect(
      await denied.evaluate((key) => localStorage.getItem(key), MIC_STATE_KEY),
    ).toBeNull();
    await expect(
      denied.getByRole("button", { name: T.micRecheck }),
    ).toHaveCount(0);
  });
});

test.describe("audio-capture 한 번", () => {
  test.use({ speechScript: loadSpeechScript("audio-capture") });

  test("AC-5c 말하기 배치 전이어도 회화 카드에 같은 문구가 보이고 audio-capture 한 번으로는 닫히지 않으며 인식 API 가 없던 기기는 홈 진입마다 다시 확인한다", async ({
    page,
    context,
    browser,
    baseURL,
  }) => {
    // (1) audio-capture 한 번: 말하기를 고른 첫 실행의 '마이크 확인'이 audio-capture 로 실패해도 기기 상태로 남지 않아
    //     홈의 말하기 · 회화 카드가 열린다(검토 I-1 — 대본 audio-capture.json)
    await page.goto("/first-run");
    // 하이드레이션 뒤 채운다(그 전 입력은 상태에 들지 않는다 — CI 7차)
    await expect(
      page.locator("[data-first-run-step][data-hydrated]"),
    ).toHaveCount(1);
    const pin = "135790";
    await page.getByLabel("PIN", { exact: true }).fill(pin);
    await page.getByLabel("한 번 더 넣어 주세요").fill(pin);
    await page.getByRole("button", { name: "다음" }).click();
    await page.getByLabel("홈에 보일 이름(한글)").fill("모모");
    await page.getByRole("button", { name: "다음" }).click();
    await page.locator('[data-first-run-step="avatar"]').waitFor();
    await page.getByRole("button", { name: "노랑" }).click();
    await page.getByRole("button", { name: "다음" }).click();
    await page.getByRole("button", { name: "알아요" }).click();
    await page.getByRole("button", { name: "다음" }).click();
    await page
      .getByRole("button", { name: "동물 · 자연 · 음식 · 가족" })
      .click();
    await page.getByRole("button", { name: "다음" }).click();
    await page.getByRole("tab", { name: /^말하기/ }).click();
    await page
      .locator('[data-level-area="speaking"]')
      .getByRole("button", { name: "1단계", exact: true })
      .click();
    await page.getByRole("button", { name: "다음" }).click();
    await page.getByRole("button", { name: "마이크 확인" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "마이크를 쓸 수 없었어요" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "다음" }).click();
    await page.getByRole("button", { name: "아이에게 넘기기" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    expect(
      await page.evaluate((key) => localStorage.getItem(key), MIC_STATE_KEY),
    ).toBeNull();
    await expect(card(page, "speaking")).toHaveAttribute(
      "href",
      "/speaking/lessons",
    );
    await expect(card(page, "talk")).toHaveAttribute("href", "/talk/lessons");

    // (2) 권한 거부가 저장된 기기: 배치 전이어도 말하기 · 회화 카드는 마이크 문구가 먼저(4절 '이 행이 배치 평가 전 행보다 먼저')
    await resetHousehold();
    await insertHousehold();
    const denied = await speechPage(context, "default-ok");
    await denied.addInitScript((key) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          state: "unavailable",
          code: "not-allowed",
          at: "2026-10-17T00:00:00Z",
        }),
      );
    }, MIC_STATE_KEY);
    await denied.goto("/");
    await expect(card(denied, "talk")).toContainText(T.needsMic);
    await expect(card(denied, "talk")).not.toContainText(T.needsSpeaking);
    await expect(card(denied, "speaking")).toContainText(T.needsMic);
    await expect(card(denied, "reading")).toContainText(T.findLevel);

    // (3) 인식 API 가 없던 기기는 저장하지 않고 홈 진입마다 다시 판정한다: 없을 때 닫히고, 생긴 뒤 들어오면 열린다
    const noApi = await browser.newContext({ baseURL });
    await addAccessCookie(noApi, baseURL);
    const first = await speechPage(noApi, "no-recognition-api");
    await first.goto("/");
    await expect(card(first, "speaking")).toContainText(T.needsMic);
    expect(
      await first.evaluate((key) => localStorage.getItem(key), MIC_STATE_KEY),
    ).toBeNull();
    const second = await speechPage(noApi, "default-ok");
    await second.goto("/");
    await expect(card(second, "speaking")).toContainText(T.findLevel);
    await expect(card(second, "speaking")).not.toContainText(T.needsMic);
    await noApi.close();
  });
});

test("AC-2a 첨삭이 오면 홈에 '첨삭이 왔어요'가 보이고 누르면 그 수업의 둘째 세션이 열린다", async ({
  page,
}) => {
  const sample = compositionSample();
  await atLevel({ area: "writing", level: sample.level }, async (profileId) => {
    const lesson = await insertSampleLesson({ sample });
    await insertReadyDraft(profileId, lesson);
    await page.goto("/");
    const note = page.getByText("첨삭이 왔어요", { exact: true });
    await expect(note).toBeVisible();
    // 영역 카드보다 앞(4절 홈 '그 밖' 행)
    const noteTop = (await note.boundingBox())?.y ?? Number.POSITIVE_INFINITY;
    const cardsTop =
      (await page.locator("[data-home-cards]").boundingBox())?.y ?? 0;
    expect(noteTop).toBeLessThan(cardsTop);
    await photo(page, "p11-home-feedback");
    await note.click();
    await expect(page).toHaveURL(/\/session\//);
    const sessionId = new URL(page.url()).pathname.split("/").at(-1) ?? "";
    await expect(page.locator("[data-activity]")).toHaveAttribute(
      "data-activity",
      "feedback-praise",
    );
    const [row] = await e2eDb()
      .select({
        writingPart: sessions.writingPart,
        lessonId: sessions.lessonId,
      })
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    expect(row).toEqual({ writingPart: "rewrite", lessonId: lesson.id });
  });
});

test("홈 화면 꼴: 한 판의 영역 카드 넷은 두 방향 모두 같은 높이이고 시작 단추는 카드 아래 끝이며 누르는 곳은 빠르게 두 번 눌러도 커지지 않는다", async ({
  page,
}, testInfo) => {
  // C114 · design-taste §4.2(같은 줄 아래 끝 · 늘인 카드의 빈 띠) · ui-ux-pro-max §2 tap-delay — 전체 디자인 리뷰 묶음 #12 · #15 · #16
  const { profileId } = await insertHousehold({
    startLevels: { reading: 1, writing: 1, speaking: 1, talk: 1 },
  });
  // 첫 사용 꼴(읽기 · 말하기)과 보통 꼴(쓰기 · 회화)이 세로 두 줄 · 가로 한 줄 모두에서 한 줄에 섞이게(검토 B I-2 — 섞인 판의 높이 ·
  // 아래 끝 단추를 함께 잠근다)
  await insertPastLessons(profileId, ["writing", "talk"]);
  await page.goto("/");
  await expect(page.locator("[data-home-cards][data-hydrated]")).toHaveCount(1);
  await expect(page.locator("[data-first-lesson]")).toHaveCount(2);
  await expect(card(page, "writing").locator("[data-week]")).toHaveCount(1);
  for (const way of ["portrait", "landscape"] as const) {
    await page.setViewportSize(CHILD_VIEWPORTS[way]);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
    );
    // 카드(링크 칸)의 기울기 없는 높이 · 줄마다 아래 끝(디자인 fix 1b — 포스트잇 기울기는 그대로)
    const cards = await layoutBoxesOf(page.locator("[data-home-cards] > *"));
    expect(cards).toHaveLength(4);
    expect(spreadOf(cards.map((c) => c.height)), way).toBeLessThanOrEqual(
      SAME_PX,
    );
    for (const row of rowsOf(cards))
      expect(spreadOf(row.map((c) => c.bottom)), way).toBeLessThanOrEqual(
        SAME_PX,
      );
    // 시작 단추 위 빈 띠(단추 묶음 위 끝 − 그 앞 내용 아래 끝, 카드 안 간격 포함 — 보고에 남김)
    const measured = await page
      .locator("[data-home-cards] > *")
      .evaluateAll((els) =>
        els.map((el) => {
          const group = el.querySelector("[aria-hidden].min-h-14")
            ?.parentElement as HTMLElement | null | undefined;
          const prev = group?.previousElementSibling as HTMLElement | null;
          return group && prev
            ? group.offsetTop - (prev.offsetTop + prev.offsetHeight)
            : -1;
        }),
      );
    testInfo.annotations.push({
      type: `home-card-blank-${way}`,
      description: measured.join(","),
    });
  }
  await page.setViewportSize(CHILD_VIEWPORTS.portrait);
  // 사진 한 장에 두 꼴(첫 사용 · 보통)
  await photo(page, "home-default");
  // 누르는 곳은 touch-action manipulation(손가락 두 개 확대는 그대로)
  const actions = await page
    .locator("[data-child-screen] a, [data-child-screen] button")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).touchAction));
  expect(actions.length).toBeGreaterThan(0);
  for (const value of actions) expect(value).toBe("manipulation");
});

test("홈 화면 꼴: 배치 전 홈의 영역 카드 넷은 두 방향 모두 같은 높이이고 '내 단계 찾기'가 카드 아래 끝 단추 꼴로 같은 줄에 있다", async ({
  page,
}) => {
  // C114 · design-taste §4.2 '늘인 카드의 발에는 단추만'(디자인 fix 1a (b)) — 첫 실행 뒤 배치 평가 전
  await insertHousehold();
  await page.goto("/");
  await expect(page.locator("[data-home-cards][data-hydrated]")).toHaveCount(1);
  for (const area of AREAS) {
    // 단추 글은 카드 링크의 읽히는 이름에 든다(aria-hidden 아님). 회화는 '말하기 단계 찾기'(U2-3)
    await expect(card(page, area).locator("[data-find-level]")).toHaveText(
      area === "talk" ? T.findSpeakingLevel : T.findLevel,
    );
    await expect(
      card(page, area).locator("[data-find-level]"),
    ).not.toHaveAttribute("aria-hidden", "true");
  }
  for (const way of ["portrait", "landscape"] as const) {
    await page.setViewportSize(CHILD_VIEWPORTS[way]);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
    );
    const cards = await layoutBoxesOf(page.locator("[data-home-cards] > *"));
    expect(spreadOf(cards.map((c) => c.height)), way).toBeLessThanOrEqual(
      SAME_PX,
    );
    // 같은 줄 카드의 단추 아래 끝이 같다(세로 두 줄 · 가로 한 줄 — 줄마다, 기울기 없는 자리)
    const pills = await layoutBoxesOf(page.locator("[data-find-level]"));
    expect(pills).toHaveLength(4);
    for (const row of rowsOf(pills))
      expect(spreadOf(row.map((p) => p.bottom)), way).toBeLessThanOrEqual(
        SAME_PX,
      );
  }
  await page.setViewportSize(CHILD_VIEWPORTS.portrait);
  await photo(page, "home-find-level");
});

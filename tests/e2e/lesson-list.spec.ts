// 수업 목록 e2e(4절 수업 목록 표 · 3.2 · AC-2b · 2d · 2e · 2f, plan-p10b 증명 표 — 차례 4 · 6 몫).
// 실제 e2e DB(시험용 시드 — 1단계, 단원마다 배정 · 다지기 · 보강)를 쓴다. 수업을 고르면 세션이 열린다(차례 6).
// 설계 숫자(최소 수업 수)는 e2e DB 의 단원 복사본 · 수업 칸에서 읽는다.

import type { Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { lessons } from "../../src/db/schema/content";
import {
  profileTracks,
  sessions,
  unitProgress,
} from "../../src/db/schema/learning";
import { CHILD_VIEWPORTS, layoutBoxesOf } from "./child-size";
import { closeE2eDb, e2eDb, insertSessions, resetHousehold } from "./db";
import { expect, test } from "./fixtures";
import { insertHousehold } from "./household";
import { photo } from "./photos";

const T = {
  hereStart: "여기부터 해요",
  past: "지난 수업 다시 하기",
  untried: "안 해 본 수업",
  resume: "하던 수업 이어 하기",
  confirm: "하던 수업은 처음부터 다시 해야 해요. 새 수업을 할까요?",
  newLesson: "새 수업 할래요",
  keepGoing: "하던 수업 할래요",
  parentCheck: "부모님이 다음 길을 고르고 있어요. 그동안 지난 수업을 해 봐요",
  /** 수업 시작이 서버에 닿지 않을 때(온라인 — use-lesson-start LESSON_START_TEXT.failed). */
  failed: "지금은 저장할 수 없어요. 잠시 뒤에 다시 해 주세요",
} as const;

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

const lessonCards = (page: Page) => page.locator("[data-lesson]");

/** 수업 목록이 하이드레이션될 때까지(그 전 누름은 처리기가 없어 사라진다). */
async function boardReady(page: Page) {
  await expect(page.locator("[data-lesson-board][data-hydrated]")).toHaveCount(
    1,
  );
}

/** 세션 쪽으로 가서 그 세션 행을 돌려준다. */
/** 같은 크기로 보는 어긋남(px, 시험 값 — 반올림 한 칸). */
const SAME_PX = 1;
/** 카드 위 끝 표지와 번호 줄 사이 최소 틈(px, 시험 값 — 디자인 fix 1c 여유). */
const BADGE_GAP_PX = 4;

/** 그 수업 카드(포스트잇 — 단추)의 너비 · 높이를 두 방향에서 잰다. 끝나면 세로로 돌려 둔다. */
async function cardSizesBothWays(page: Page, lesson: string) {
  const sizes = {} as Record<
    keyof typeof CHILD_VIEWPORTS,
    { width: number; height: number }
  >;
  for (const way of ["portrait", "landscape"] as const) {
    await page.setViewportSize(CHILD_VIEWPORTS[way]);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
    );
    // 기울기 없는 레이아웃 크기(디자인 fix 1b)
    const [box] = await layoutBoxesOf(
      page
        .locator("button")
        .filter({ has: page.locator(`[data-lesson="${lesson}"]`) }),
    );
    if (!box) throw new Error(`수업 카드 없음: ${lesson}`);
    sizes[way] = { width: box.width, height: box.height };
  }
  await page.setViewportSize(CHILD_VIEWPORTS.portrait);
  return sizes;
}

/**
 * 카드 위 끝 표지('여기부터 해요' · '안 해 본 수업')가 22px 그대로(C82) 두 줄 이하로 카드 안 표지 칸에 넘치지 않고, 번호 줄과 BADGE_GAP_PX 이상 떨어진다
 * (세로 한 줄 · 가로 두 줄 — 디자인 fix 1b · 1c), 두 방향.
 */
async function badgesFitBothWays(page: Page) {
  for (const way of ["portrait", "landscape"] as const) {
    await page.setViewportSize(CHILD_VIEWPORTS[way]);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
    );
    // 브라우저 안 함수에는 바깥 상수가 넘어가지 않아 둘째 인자로 넘긴다(CI 16차)
    const badges = await page.locator("[data-lesson-badge]").evaluateAll(
      (els, gap) =>
        els.map((el) => {
          const node = el as HTMLElement;
          const style = getComputedStyle(node);
          const lineHeight = Number.parseFloat(style.lineHeight);
          const inner =
            node.clientHeight -
            Number.parseFloat(style.paddingTop) -
            Number.parseFloat(style.paddingBottom);
          const card = node.closest("button");
          const no = card?.querySelector(
            "[data-lesson-no]",
          ) as HTMLElement | null;
          return {
            text: node.textContent ?? "",
            font: Number.parseFloat(style.fontSize),
            lines: Math.round(inner / lineHeight),
            scroll: node.scrollWidth,
            client: node.clientWidth,
            // 기울기 없는 너비 · 자리로 견줌(디자인 fix 1b)
            inCard: node.offsetWidth <= (card?.clientWidth ?? 0),
            clearOfNumber:
              no === null ||
              node.offsetTop + node.offsetHeight + gap <= no.offsetTop,
          };
        }),
      BADGE_GAP_PX,
    );
    expect(badges.length, way).toBeGreaterThan(0);
    for (const b of badges) {
      const label = `${way} ${b.text}`;
      expect(b.font, label).toBeGreaterThanOrEqual(22);
      expect(b.lines, label).toBeLessThanOrEqual(way === "portrait" ? 1 : 2);
      expect(b.scroll, label).toBeLessThanOrEqual(b.client);
      expect(b.inCard, label).toBe(true);
      expect(b.clearOfNumber, label).toBe(true);
    }
  }
  await page.setViewportSize(CHILD_VIEWPORTS.portrait);
}

async function openedSession(page: Page) {
  await page.waitForURL((url) => url.pathname.startsWith("/session/"));
  const id = new URL(page.url()).pathname.split("/").at(-1) ?? "";
  const [row] = await e2eDb()
    .select()
    .from(sessions)
    .where(eq(sessions.id, id));
  if (!row) throw new Error("세션 행 없음");
  return row;
}

async function readingCells(unit: number) {
  return e2eDb()
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "reading"),
        eq(lessons.level, 1),
        eq(lessons.unit, unit),
      ),
    );
}

async function readingRound(profileId: string) {
  const [round] = await e2eDb()
    .select()
    .from(unitProgress)
    .where(
      and(
        eq(unitProgress.profileId, profileId),
        eq(unitProgress.area, "reading"),
      ),
    );
  if (!round) throw new Error("단원 회차 없음");
  return round;
}

test("AC-2b 홈의 읽기 포스트잇을 누르면 세션이 아니라 읽기 수업 목록이 열리고 셋째 수업을 먼저 고를 수 있으며 다음 단원 묶음은 눌러도 열리지 않는다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({ startLevels: { reading: 1 } });
  await page.goto("/");
  await page
    .locator("a")
    .filter({ has: page.locator('[data-home-card="reading"]') })
    .click();
  await page.waitForURL((url) => url.pathname === "/reading/lessons");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("읽기");
  await expect(page.getByText("1단계 · 단원 1")).toBeVisible();
  await boardReady(page);
  // 잠긴 다음 단원 한 장: 남은 조건 한 줄(최소 수업 수 = max(배정 수, 복사본 unit.min_lessons))
  const cells = (await readingCells(1)).filter((c) => c.topicVariant === 1);
  const assigned = cells.filter((c) => c.kind === "assigned").length;
  const round = await readingRound(profileId);
  const minLessons = Math.max(
    assigned,
    (round.settingsSnapshot as Record<string, number>)["unit.min_lessons"] ?? 0,
  );
  const locked = page.locator("[data-locked-next]");
  await expect(locked).toContainText("단원 2");
  await expect(locked).toContainText(`수업 ${minLessons}개를 더 하면 열려요`);
  await locked.click();
  expect(new URL(page.url()).pathname).toBe("/reading/lessons");
  await expect(locked).not.toHaveAttribute("aria-pressed", "true");
  // 셋째 수업을 먼저 고를 수 있고, 고르면 그 수업의 세션이 실제로 열린다(장부 — 차례 6)
  const third = page
    .locator("button")
    .filter({ has: page.locator("[data-lesson]") })
    .nth(2);
  const thirdKey = await third
    .locator("[data-lesson]")
    .getAttribute("data-lesson");
  await third.click();
  const opened = await openedSession(page);
  const [kind, no] = (thirdKey ?? "").split("-");
  const [lesson] = await e2eDb()
    .select()
    .from(lessons)
    .where(eq(lessons.id, opened.lessonId ?? ""));
  expect(lesson).toMatchObject({ kind, lessonNo: Number(no), unit: 1 });
  expect(opened).toMatchObject({ status: "in_progress", area: "reading" });
});

test("AC-2d 수업 포스트잇마다 번호와 한국어 제목이 있고 '여기부터 해요'는 하나다", async ({
  page,
}) => {
  await insertHousehold({ startLevels: { reading: 1 } });
  await page.goto("/reading/lessons");
  const cells = (await readingCells(1)).filter(
    (c) => c.topicVariant === 1 && c.kind !== "remedial",
  );
  await expect(lessonCards(page)).toHaveCount(cells.length);
  for (const c of cells) {
    const card = page.locator(`[data-lesson="${c.kind}-${c.lessonNo}"]`);
    await expect(card).toContainText(String(c.lessonNo));
    await expect(card).toContainText(c.listTitle);
  }
  await expect(page.getByText(T.hereStart, { exact: true })).toHaveCount(1);
  // '여기부터 해요' 카드도 다른 카드와 같은 크기 — 표지 · 테두리로만 구별(C114 · 4절 '여기부터 해요' 행), 두 방향
  await boardReady(page);
  for (const way of ["portrait", "landscape"] as const) {
    await page.setViewportSize(CHILD_VIEWPORTS[way]);
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
    );
    // 기울기 없는 레이아웃 크기(포스트잇 기울기는 그대로 — 디자인 fix 1b)
    const boxes = await layoutBoxesOf(
      page.locator("button").filter({ has: page.locator("[data-lesson]") }),
    );
    const widths = boxes.map((b) => b.width);
    const heights = boxes.map((b) => b.height);
    expect(Math.max(...widths) - Math.min(...widths), way).toBeLessThanOrEqual(
      SAME_PX,
    );
    expect(
      Math.max(...heights) - Math.min(...heights),
      way,
    ).toBeLessThanOrEqual(SAME_PX);
  }
  await page.setViewportSize(CHILD_VIEWPORTS.portrait);
  await badgesFitBothWays(page);
  // 첫 화면: 지금 단원 묶음 · 잠긴 다음 단원 한 장 · 지난 단원이 없으면 '지난 수업 다시 하기'도 없다
  await expect(page.locator("[data-locked-next]")).toHaveCount(1);
  await expect(page.getByText(T.past)).toHaveCount(0);
});

test("수업 목록: 지난 수업 다시 하기는 단원을 고른 뒤 수업을 고르고 통과한 단원의 안 한 수업에는 '안 해 본 수업' 표시가 붙는다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({ startLevels: { reading: 1 } });
  const round = await readingRound(profileId);
  await e2eDb()
    .update(unitProgress)
    .set({ passedAt: new Date() })
    .where(eq(unitProgress.id, round.id));
  await e2eDb()
    .insert(unitProgress)
    .values({ ...round, id: undefined, unit: 2, passedAt: null });
  await e2eDb()
    .update(profileTracks)
    .set({ unit: 2 })
    .where(
      and(
        eq(profileTracks.profileId, profileId),
        eq(profileTracks.area, "reading"),
      ),
    );
  const first = (await readingCells(1)).find(
    (c) => c.kind === "assigned" && c.lessonNo === 1 && c.topicVariant === 1,
  );
  if (!first) throw new Error("수업 칸 없음");
  const at = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  await insertSessions([
    {
      profileId,
      area: "reading",
      level: 1,
      unit: 1,
      lessonId: first.id,
      kind: "regular",
      status: "completed",
      startedAt: at,
      completedAt: at,
      learningDay: at.toISOString().slice(0, 10),
    },
  ]);
  await page.goto("/reading/lessons");
  await expect(page.getByText("1단계 · 단원 2")).toBeVisible();
  await boardReady(page);
  // 수업 카드는 목록 · 지난 수업에서 같은 크기(같은 종류 종이 — C114 · 전체 디자인 리뷰 #14), 두 방향 모두
  const listSizes = await cardSizesBothWays(page, "assigned-2");
  await photo(page, "lesson-list-default");
  await page.getByRole("link", { name: T.past }).click();
  await page.waitForURL((url) => url.pathname === "/reading/lessons/past");
  await page.getByRole("link", { name: "단원 1" }).click();
  await page.waitForURL((url) => url.searchParams.get("unit") === "1");
  const firstCard = page.locator('[data-lesson="assigned-1"]');
  await expect(firstCard).toBeVisible();
  await expect(firstCard).not.toContainText(T.untried);
  await expect(page.locator('[data-lesson="assigned-2"]')).toContainText(
    T.untried,
  );
  const pastSizes = await cardSizesBothWays(page, "assigned-2");
  await badgesFitBothWays(page);
  for (const way of ["portrait", "landscape"] as const) {
    expect(
      Math.abs(pastSizes[way].width - listSizes[way].width),
      way,
    ).toBeLessThanOrEqual(SAME_PX);
    expect(
      Math.abs(pastSizes[way].height - listSizes[way].height),
      way,
    ).toBeLessThanOrEqual(SAME_PX);
  }
  await photo(page, "lesson-list-past");
  // 지난 수업도 고르면 세션이 열린다 — 안 해 본 수업은 untried 세션(3.2)
  await expect(page.locator("[data-past-lessons][data-hydrated]")).toHaveCount(
    1,
  );
  await page.locator('[data-lesson="assigned-2"]').click();
  expect(await openedSession(page)).toMatchObject({
    kind: "untried",
    unit: 1,
  });
});

test("수업 목록: 배치 전 영역은 배치 평가로, 단계가 없는 회화는 말하기 배치 평가로 보내고 영역이 아닌 주소와 지운 회화 준비 쪽은 없는 쪽이다", async ({
  page,
}) => {
  await insertHousehold({ startLevels: { reading: 1 } });
  await page.goto("/writing/lessons");
  expect(new URL(page.url()).pathname).toBe("/writing/placement");
  // 회화는 배치 평가가 없다 — 말하기 배치 평가로(4절 홈 표 회화 카드 행과 같은 길, plan-p13b 값 12)
  await page.goto("/talk/lessons");
  expect(new URL(page.url()).pathname).toBe("/speaking/placement");
  const missing = await page.goto("/music/lessons");
  expect(missing?.status()).toBe(404);
  // '토리가 준비 중이에요' 쪽(/talk)은 지웠다(값 12)
  const talk = await page.goto("/talk");
  expect(talk?.status()).toBe(404);
});

test("수업 목록: 부모 확인 대기면 지금 단원 묶음 자리에 4절 안내가 보이고, 하던 수업이 있으면 맨 위에 '하던 수업 이어 하기'가 있고 다른 수업을 고르면 새 수업을 할지 묻는다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({ startLevels: { reading: 1 } });
  const second = (await readingCells(1)).find(
    (c) => c.kind === "assigned" && c.lessonNo === 2 && c.topicVariant === 1,
  );
  if (!second) throw new Error("수업 칸 없음");
  await insertSessions([
    {
      profileId,
      area: "reading",
      level: 1,
      unit: 1,
      lessonId: second.id,
      kind: "regular",
      status: "in_progress",
      startedAt: new Date(),
    },
  ]);
  await page.goto("/reading/lessons");
  await boardReady(page);
  const resume = page.locator("[data-top-item]").first();
  await expect(resume).toContainText(T.resume);
  await expect(resume).toContainText(T.hereStart);
  // 맨 위 포스트잇의 읽히는 이름에 '여기부터 해요' · 수업 제목이 든다(고정 이름 없음 — 검토 review-p10-fix3-code N-2)
  await expect(
    page
      .locator("button")
      .filter({ has: page.locator('[data-top-item="resume"]') }),
  ).toHaveAccessibleName(
    new RegExp(`${T.hereStart}.*${T.resume}.*${second.listTitle}`),
  );
  await page.locator('[data-lesson="assigned-1"]').click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText(T.confirm);
  await expect(sheet.getByRole("button", { name: T.newLesson })).toBeVisible();
  await sheet.getByRole("button", { name: T.keepGoing }).click();
  await expect(sheet).toHaveCount(0);

  const round = await readingRound(profileId);
  await e2eDb()
    .update(unitProgress)
    .set({ parentCheck: "pending" })
    .where(eq(unitProgress.id, round.id));
  await page.goto("/reading/lessons");
  await expect(page.getByText(T.parentCheck)).toBeVisible();
  await expect(lessonCards(page)).toHaveCount(0);
  // 조건 줄을 숨긴 잠긴 단원은 읽기 도구에 '잠긴 단원'이 들린다(화면 검토 review-p10-fix3-design N-6)
  await expect(page.locator("[data-locked-next]")).toContainText("잠긴 단원");
});

test("수업 목록: 확인 쪽지가 열리면 초점이 쪽지 첫 단추로 가고 Esc 로 닫히면 고른 수업 포스트잇으로 돌아오며, 끝낸 수업은 이름에 '끝낸 수업'이 읽힌다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({ startLevels: { reading: 1 } });
  const cells = (await readingCells(1)).filter((c) => c.topicVariant === 1);
  const first = cells.find((c) => c.kind === "assigned" && c.lessonNo === 1);
  const second = cells.find((c) => c.kind === "assigned" && c.lessonNo === 2);
  if (!first || !second) throw new Error("수업 칸 없음");
  // 이 회차(집을 넣은 때 시작)에서 끝낸 수업 — 끝낸 시각이 회차 시작 뒤
  const at = new Date();
  await insertSessions([
    {
      profileId,
      area: "reading",
      level: 1,
      unit: 1,
      lessonId: first.id,
      kind: "regular",
      status: "completed",
      startedAt: at,
      completedAt: at,
      learningDay: at.toISOString().slice(0, 10),
    },
    {
      profileId,
      area: "reading",
      level: 1,
      unit: 1,
      lessonId: second.id,
      kind: "regular",
      status: "in_progress",
      startedAt: new Date(),
    },
  ]);
  await page.goto("/reading/lessons");
  await boardReady(page);
  // 끝낸 수업 ✓ 는 그림이지만 보조 기술에는 '끝낸 수업'이 읽힌다(C72)
  await expect(page.getByRole("button", { name: /끝낸 수업/ })).toHaveCount(1);
  const opener = page
    .locator("button")
    .filter({ has: page.locator('[data-lesson^="reinforce"]') })
    .first();
  await opener.focus();
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText(T.confirm);
  await expect(sheet.getByRole("button", { name: T.keepGoing })).toBeFocused();
  // Tab · Shift+Tab 은 쪽지 안에서 맴돈다 — 뒤 화면으로 나가지 않는다(화면 검토 review-p10-fix3-design N-5)
  await page.keyboard.press("Tab");
  await expect(sheet.getByRole("button", { name: T.newLesson })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(sheet.getByRole("button", { name: T.keepGoing })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(sheet.getByRole("button", { name: T.newLesson })).toBeFocused();
  // 덮개를 눌러도 초점이 쪽지 밖으로 빠지지 않고, 그 뒤 Tab 은 쪽지 안 첫 단추로 간다(검토 review-p10-5-6-code M-4)
  await sheet.click({ position: { x: 5, y: 5 } });
  await expect(sheet).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(sheet.getByRole("button", { name: T.keepGoing })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("AC-2e 하던 수업이 있을 때 다른 수업을 고르면 '하던 수업은 처음부터 다시 해야 해요. 새 수업을 할까요?'를 묻는다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({ startLevels: { reading: 1 } });
  const cells = (await readingCells(1)).filter((c) => c.topicVariant === 1);
  const second = cells.find((c) => c.kind === "assigned" && c.lessonNo === 2);
  if (!second) throw new Error("수업 칸 없음");
  const [going] = await insertSessions([
    {
      profileId,
      area: "reading",
      level: 1,
      unit: 1,
      lessonId: second.id,
      kind: "regular",
      status: "in_progress",
      startedAt: new Date(),
    },
  ]);
  await page.goto("/reading/lessons");
  await boardReady(page);
  await page.locator('[data-lesson="assigned-1"]').click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText(T.confirm);
  // 묻는 동안은 아무것도 바뀌지 않는다
  const [still] = await e2eDb()
    .select({ status: sessions.status })
    .from(sessions)
    .where(eq(sessions.id, going ?? ""));
  expect(still?.status).toBe("in_progress");
  await sheet.getByRole("button", { name: T.newLesson }).click();
  const opened = await openedSession(page);
  expect(opened.id).not.toBe(going);
  const [closed] = await e2eDb()
    .select({ status: sessions.status })
    .from(sessions)
    .where(eq(sessions.id, going ?? ""));
  expect(closed?.status).toBe("aborted");
  // 하던 수업 이어 하기를 누르면 그 세션으로 간다
  await page.goto("/reading/lessons");
  await boardReady(page);
  await page.locator("[data-top-item]").first().click();
  expect((await openedSession(page)).id).toBe(opened.id);
});

test("AC-2f 앞 배정 수업을 하지 않고 뒤 수업을 고르면 새 단어 미리보기에 앞 수업의 새 단어가 더해 보인다", async ({
  page,
}) => {
  await insertHousehold({ startLevels: { reading: 1 } });
  // 시험용 시드(작은 틀): 배정 2 의 단원 단어에는 배정 1 의 새 단어가 없다. 배정 1 · 2 를 하지 않고 다지기를 고르면
  // 다지기의 단원 단어 가운데 못 만난 앞 수업 새 단어가 첫 활동에 보인다(바탕은 앞에서 k 개, 그 밖은 더함)
  const cells = (await readingCells(1)).filter((c) => c.topicVariant === 1);
  const reinforce = cells.find((c) => c.kind === "reinforce");
  const assigned = cells.filter((c) => c.kind === "assigned");
  if (!reinforce) throw new Error("다지기 칸 없음");
  const skipped = assigned.flatMap((c) =>
    c.newWords.filter((w) => reinforce.unitWords.includes(w)),
  );
  expect(skipped.length).toBeGreaterThan(0);
  await page.goto("/reading/lessons");
  await boardReady(page);
  await page.locator(`[data-lesson="reinforce-${reinforce.lessonNo}"]`).click();
  await openedSession(page);
  await expect(page.locator("[data-activity]")).toHaveAttribute(
    "data-activity",
    "preview",
  );
  for (const word of skipped) {
    await expect(
      page.locator("[data-activity]").getByText(word, { exact: true }),
    ).toBeVisible();
  }
});

test("수업 목록: 고르기가 실패하면 오류 줄이 누른 카드 줄 바로 뒤 한 줄 칸에 보는 창 안에 보이고 고른 표시가 되돌아가며 같은 줄 카드는 늘지 않는다", async ({
  page,
}) => {
  // fix 8b N-1 · N-2 · 전체 디자인 리뷰 M-8 — 수업 시작 서버 액션이 닿지 않는 꼴(요청을 끊음)
  await insertHousehold({ startLevels: { reading: 1 } });
  await page.goto("/reading/lessons");
  await boardReady(page);
  const cards = page
    .locator("button")
    .filter({ has: page.locator("[data-lesson]") });
  const before = await cards.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().height),
  );
  await page.route("**/reading/lessons", async (route) => {
    if (route.request().method() === "POST") await route.abort("failed");
    else await route.continue();
  });
  const target = cards.filter({
    has: page.locator('[data-lesson="assigned-2"]'),
  });
  await target.click();
  const row = page.locator("[data-lesson-wait]");
  await expect(row).toContainText(T.failed);
  // 한 줄 칸은 보는 창 안이고, 판 아래 오류 줄은 비어 있다(같은 글을 두 번 보이지 않음)
  const box = await row.boundingBox();
  const view = page.viewportSize();
  expect(box && view && box.y + box.height <= view.height).toBe(true);
  await expect(page.getByText(T.failed, { exact: true })).toHaveCount(1);
  // 고른 표시가 되돌아가고, 카드 높이는 그대로(칸이 카드를 늘이지 않음)
  await expect(target).toHaveAttribute("aria-pressed", "false");
  const after = await cards.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().height),
  );
  expect(after).toEqual(before);
});

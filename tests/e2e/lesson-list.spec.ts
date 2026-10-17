// 수업 목록 e2e(4절 수업 목록 표 · 3.2 · AC-2b · AC-2d, plan-p10b 증명 표 — 차례 4 몫). AC-2e · 2f(세션)는 차례 6 에 더한다.
// 실제 e2e DB(시험용 시드 — 1단계, 단원마다 배정 · 다지기 · 보강)를 쓴다. 세션 시작은 차례 6 이라 고르기 · 확인까지만 본다.
// 설계 숫자(최소 수업 수)는 e2e DB 의 단원 복사본 · 수업 칸에서 읽는다.

import type { Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { lessons } from "../../src/db/schema/content";
import { profileTracks, unitProgress } from "../../src/db/schema/learning";
import { closeE2eDb, e2eDb, insertSessions, resetHousehold } from "./db";
import { expect, test } from "./fixtures";
import { insertHousehold } from "./household";

const T = {
  hereStart: "여기부터 해요",
  past: "지난 수업 다시 하기",
  untried: "안 해 본 수업",
  resume: "하던 수업 이어 하기",
  confirm: "하던 수업은 처음부터 다시 해야 해요. 새 수업을 할까요?",
  newLesson: "새 수업 할래요",
  keepGoing: "하던 수업 할래요",
  parentCheck: "부모님이 다음 길을 고르고 있어요. 그동안 지난 수업을 해 봐요",
  talkSoon: "토리가 준비 중이에요. 곧 만나요",
} as const;

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

const lessonCards = (page: Page) => page.locator("[data-lesson]");

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
  // 셋째 수업을 먼저 고를 수 있다(세션은 차례 6 — 고른 표시까지)
  // 고른 표시(aria-pressed)는 포스트잇 단추에 있다
  const third = page
    .locator("button")
    .filter({ has: page.locator("[data-lesson]") })
    .nth(2);
  await third.click();
  await expect(third).toHaveAttribute("aria-pressed", "true");
  expect(new URL(page.url()).pathname).toBe("/reading/lessons");
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
});

test("수업 목록: 배치 전 영역은 배치 평가로, 회화는 토리 준비 화면으로 보내고 영역이 아닌 주소는 없는 쪽이다", async ({
  page,
}) => {
  await insertHousehold({ startLevels: { reading: 1 } });
  await page.goto("/writing/lessons");
  expect(new URL(page.url()).pathname).toBe("/writing/placement");
  await page.goto("/talk/lessons");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(T.talkSoon);
  const missing = await page.goto("/music/lessons");
  expect(missing?.status()).toBe(404);
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
  const resume = page.locator("[data-top-item]").first();
  await expect(resume).toContainText(T.resume);
  await expect(resume).toContainText(T.hereStart);
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
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(opener).toBeFocused();
});

// 없는 주소 판 e2e(UI · UX plan 묶음 0-나 · spec 설계 4 N-16 · 8절 '앱 오류' 행 R-52 · 설계 6 문구 표). 앱이 모르는 주소 · 그 프로필에서
// 찾지 못한 세션 · 결과 주소는 '찾는 화면이 없어요'와 큰 '홈' 하나만 보이고(홈으로 보내지 않는다), 찾았지만 열 수 없는 세션의 결과 주소는
// 그 영역 수업 목록으로 간다. 앱 오류 화면(N-15 — 시험 DB 설정 행 하나를 지워 던지게 한 뒤 되돌리고 '다시 해 볼래요', plan 이 정한 것 6)은
// 필수 경로 나(묶음 0-마 required-recovery.spec.ts)의 몫이다. 정적으로 썼고 아직 돌리지 않았다(plan 위험 7).
import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { and, eq } from "drizzle-orm";
import { lessons } from "../../src/db/schema/content";
import { closeE2eDb, e2eDb, insertSessions, resetHousehold } from "./db";
import { expect, test } from "./fixtures";
import { insertHousehold } from "./household";

const T = {
  missing: "찾는 화면이 없어요",
  home: "홈",
  retry: "다시 해 볼래요",
} as const;

test.beforeEach(resetHousehold);
test.afterAll(closeE2eDb);

/** 없는 주소 판: 안내 한 줄 · 큰 '홈' 하나 · '다시 해 볼래요' 없음. */
async function expectNotFoundBoard(page: Page): Promise<void> {
  const board = page.locator("[data-not-found]");
  await expect(board.getByRole("heading", { name: T.missing })).toBeVisible();
  const buttons = board.locator("[data-button-size]");
  await expect(buttons).toHaveCount(1);
  await expect(buttons).toHaveAttribute("data-button-size", "big");
  await expect(buttons).toHaveText(T.home);
  await expect(page.getByText(T.retry)).toHaveCount(0);
}

/** 1단계 읽기 진행 세션 하나(첫 수업). */
async function openReadingSession(profileId: string): Promise<string> {
  const [lesson] = await e2eDb()
    .select()
    .from(lessons)
    .where(
      and(
        eq(lessons.area, "reading"),
        eq(lessons.level, 1),
        eq(lessons.unit, 1),
        eq(lessons.kind, "assigned"),
        eq(lessons.lessonNo, 1),
      ),
    );
  if (!lesson) throw new Error("수업 행 없음");
  const [sessionId] = await insertSessions([
    {
      profileId,
      area: "reading",
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
  return sessionId;
}

test("없는 주소 판: 앱이 모르는 주소와 모르는 영역은 '찾는 화면이 없어요'와 큰 '홈' 하나만 보이고 '홈'을 누르면 홈으로 간다", async ({
  page,
}) => {
  await insertHousehold({ startLevels: { reading: 1 } });
  for (const path of ["/no-such-page", "/cooking/lessons"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expectNotFoundBoard(page);
  }
  await page
    .locator("[data-not-found]")
    .getByRole("link", { name: T.home })
    .click();
  await page.waitForURL((url) => url.pathname === "/");
});

test("없는 주소 판: 그 프로필에서 찾지 못한 세션 · 결과 주소(없는 id · 꼴이 틀린 id)는 홈으로 보내지 않고 없는 주소 판을 보인다", async ({
  page,
}) => {
  await insertHousehold({ startLevels: { reading: 1 } });
  for (const id of [randomUUID(), "not-a-session"]) {
    for (const path of [`/session/${id}`, `/result/${id}`]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expectNotFoundBoard(page);
    }
  }
});

test("결과 주소: 그 프로필의 진행 중 세션의 결과 주소는 홈이 아닌 그 영역 수업 목록으로 간다", async ({
  page,
}) => {
  const { profileId } = await insertHousehold({
    startLevels: { reading: 1 },
  });
  const sessionId = await openReadingSession(profileId);
  await page.goto(`/result/${sessionId}`);
  await expect(page).toHaveURL(/\/reading\/lessons$/);
  await expect(page.locator("[data-not-found]")).toHaveCount(0);
});

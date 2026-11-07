import { expect, test } from "@playwright/test";
import { TABLET_10_9_VIEWPORT } from "../../playwright.config";

test("뼈대: 첫 화면이 10.9형 태블릿 화면(820 × 1180)에서 열리고 문서 언어가 ko 다", async ({
  page,
}) => {
  const response = await page.goto("/");
  expect(response?.ok()).toBe(true);
  expect(page.viewportSize()).toEqual(TABLET_10_9_VIEWPORT);
  expect(
    await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    })),
  ).toEqual(TABLET_10_9_VIEWPORT);
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(page.locator("main")).toHaveCount(1);
});

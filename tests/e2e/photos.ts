// 화면 검토 사진(컨트롤러 공용 변경 — 이 Mac 은 로컬 e2e 를 못 돌려 사진을 CI 아티팩트로 받는다). 환경 변수 E2E_PHOTOS 가 있으면
// test-results/photos/<이름>-<portrait|landscape>.png 로 저장하고, 없으면 아무것도 하지 않는다(P10 smoke.spec 의 SCREENSHOT_ENV 꼴).
// 방향은 4절 기준 기기 두 방향(CHILD_VIEWPORTS). 찍은 뒤 세로로 돌려 둔다.
import type { Page } from "@playwright/test";
import { CHILD_VIEWPORTS } from "./child-size";

export const PHOTOS_ENV = "E2E_PHOTOS";
export const PHOTOS_DIR = "test-results/photos";

type Way = keyof typeof CHILD_VIEWPORTS;

/** 지금 화면을 고른 방향(없으면 두 방향)으로 찍는다. */
export async function photo(
  page: Page,
  name: string,
  ways: readonly Way[] = ["portrait", "landscape"],
): Promise<void> {
  if (!process.env[PHOTOS_ENV]) return;
  for (const way of ways) {
    await page.setViewportSize(CHILD_VIEWPORTS[way]);
    // 방향 미디어 질의가 다시 맞춰지도록 한 그림 기다린다
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(0))),
    );
    await page.screenshot({
      path: `${PHOTOS_DIR}/${name}-${way}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize(CHILD_VIEWPORTS.portrait);
}

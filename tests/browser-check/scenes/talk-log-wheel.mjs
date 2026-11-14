// 휠 둘(rev-s5-4 의 재현 틀 wheel.mjs 를 그대로 옮김): 실제 마우스 휠 한 번(작은 값 -100 · -40)으로 위로 넘긴 뒤
// 지금 턴이 자라면 끌려 내려가는가. 휠로 넘겨지지 않은 때는 판정 불가로 찍고 실패로 센다(fix 1 컨트롤러 결정 — 원본은 통과로 셌음).
import { measure, openPage, toBottom } from "../pages/talk-log/measure.mjs";

export const page = "talk-log";

export async function run({ browserType, url, check, log }) {
  const browser = await browserType.launch();
  try {
    for (const delta of [-100, -40]) {
      const page = await openPage(browser, url("keep=1&tall=1"), log);
      await page.waitForTimeout(1500);
      await toBottom(page);
      await page.waitForTimeout(300);
      const box = await page.locator("[data-talk-log]").boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, delta);
      await page.waitForTimeout(600);
      const before = await measure(page);
      await page.evaluate(() => {
        document.querySelector(
          "[data-talk-log-now] [data-tori-bubble]",
        ).style.height = "260px";
      });
      await page.waitForTimeout(500);
      const after = await measure(page);
      const moved = before.top < before.max - 5;
      const ok = moved && Math.abs(after.top - before.top) <= 2; // 넘겨지지 않으면 판정 불가 — 실패로 센다(빈 통과를 막음)
      check(
        `휠 ${delta}${moved ? "" : "(휠로 넘겨지지 않음 — 판정 불가)"}`,
        ok,
        `넘긴 뒤 ${JSON.stringify(before)} · 자란 뒤 ${JSON.stringify(after)}`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

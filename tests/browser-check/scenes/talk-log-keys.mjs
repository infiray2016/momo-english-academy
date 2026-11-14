// 키보드 둘(rev-s5-4 의 재현 틀 keys.mjs 를 그대로 옮김): 칸 안의 단추에 초점을 두고 실제 키(ArrowUp · PageUp)로 위로 넘긴 뒤
// 지금 턴이 자라면 끌려 내려가는가. 키로 넘겨지지 않은 때는 판정 불가로 찍고 실패로 센다(fix 1 컨트롤러 결정 — 원본은 통과로 셌음).
// '키보드로 위로 넘김'을 지키는 시험은 지금 이 장면뿐이다(코드 재검토 rev-s5-5) — 빼지 않는다.
import { measure, openPage, toBottom } from "../pages/talk-log/measure.mjs";

export const page = "talk-log";

export async function run({ browserType, url, check, log }) {
  const browser = await browserType.launch();
  try {
    for (const key of ["ArrowUp", "PageUp"]) {
      const page = await openPage(browser, url("keep=1&tall=1"), log);
      await page.waitForTimeout(1500);
      await toBottom(page);
      await page.waitForTimeout(300);
      await page.focus("[data-talk-log-now] [data-tori-bubble]");
      await page.waitForTimeout(300);
      await page.keyboard.press(key);
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
        `${key}${moved ? "" : "(키로 넘겨지지 않음 — 판정 불가)"}`,
        ok,
        `넘긴 뒤 ${JSON.stringify(before)} · 자란 뒤 ${JSON.stringify(after)}`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

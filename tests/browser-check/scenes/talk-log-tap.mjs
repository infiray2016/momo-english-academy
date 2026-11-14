// 자라는 동안 누름 63회(rev-s5-3 의 재현 틀 tap.mjs 를 그대로 옮김): 새 차례의 말풍선이 자라는 동안 아이가 기록 칸 안(지금 말풍선)을
// 마우스로 한 번 누른다(넘기지 않음). 끝난 뒤 지금 턴이 칸 안에 있는가. 붙잡음 3 × 누르는 때 7 × 3회.
import { measure, openPage } from "../pages/talk-log/measure.mjs";

export const page = "talk-log";

export async function run({ browserType, url, check, log }) {
  let fail = 0;
  let total = 0;
  const browser = await browserType.launch();
  try {
    for (const busy of [0, 45, 120]) {
      for (const tapAt of [250, 290, 320, 580, 620, 740, 1040]) {
        for (let rep = 0; rep < 3; rep++) {
          const page = await openPage(
            browser,
            url(`keep=1&tall=1&busy=${busy}`),
            log,
          );
          await page.waitForTimeout(1500);
          const t0 = Date.now();
          await page.evaluate(() => window.__next(150));
          const wait = tapAt - (Date.now() - t0);
          if (wait > 0) await page.waitForTimeout(wait);
          const pt = await page.evaluate(() => {
            const log = document
              .querySelector("[data-talk-log]")
              .getBoundingClientRect();
            const now = document
              .querySelector("[data-talk-log-now]")
              .getBoundingClientRect();
            const y = Math.min(
              Math.max(now.top + 10, log.top + 10),
              log.bottom - 10,
            );
            return { x: now.left + 30, y };
          });
          await page.mouse.click(pt.x, pt.y);
          await page.waitForTimeout(150 * 9 + 1500);
          const r = await measure(page);
          total++;
          if (r.hidden > 1) {
            fail++;
            log(
              `실패한 회 · busy ${busy} · 누름 ${tapAt}ms · ${rep} · ${JSON.stringify(r)}`,
            );
          }
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
  check(
    "자라는 동안 칸 안을 한 번 누름",
    fail === 0,
    `${total}회 가운데 실패 ${fail}회`,
  );
}

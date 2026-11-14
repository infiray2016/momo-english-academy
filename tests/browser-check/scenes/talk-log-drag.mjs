// 느린 끌기 셋(rev-s5-4 의 재현 틀 drag.mjs 를 그대로 옮김): 맨 아래에서 손가락을 아래로 끌어 위로 넘긴 뒤(내용이 손가락을 따라 움직임)
// 지금 턴이 자라면 끌려 내려가는가. 끄는 꼴: 보통 빠르기(그림마다 4px) · 느리게 정수 자리(1 · 0 번갈아) · 느리게 떨림(1 · 1 · -0.4 되풀이).
import { measure, openPage, toBottom } from "../pages/talk-log/measure.mjs";

export const page = "talk-log";

const ways = {
  "보통 빠르기(4px × 10)": Array(10).fill(4),
  "느리게 정수 자리(1 · 0 번갈아 × 60)": Array.from({ length: 60 }, (_, i) =>
    i % 2 === 0 ? 1 : 0,
  ),
  "느리게 떨림(1 · 1 · -0.4 × 20)": Array.from({ length: 60 }, (_, i) =>
    i % 3 === 2 ? -0.4 : 1,
  ),
};

export async function run({ browserType, url, check, log }) {
  const browser = await browserType.launch();
  try {
    for (const [label, steps] of Object.entries(ways)) {
      const page = await openPage(browser, url("keep=1&tall=1"), log);
      await page.waitForTimeout(1500);
      await toBottom(page);
      await page.waitForTimeout(300);
      await page.evaluate(async (steps) => {
        const log = document.querySelector("[data-talk-log]");
        const touch = (type, y) => {
          const ev = new Event(type, { bubbles: true });
          Object.defineProperty(ev, "touches", {
            value: type === "touchend" ? [] : [{ clientY: y }],
          });
          log.dispatchEvent(ev);
        };
        const frame = () =>
          new Promise((r) => requestAnimationFrame(() => r(0)));
        const top0 = log.scrollTop;
        let y = 600;
        touch("touchstart", y);
        for (const dy of steps) {
          y += dy;
          touch("touchmove", y);
          log.scrollTop = top0 - (y - 600); // 내용이 손가락을 따라 내려옴(위로 넘김)
          await frame();
        }
        await frame();
        touch("touchend", 0);
      }, steps);
      await page.waitForTimeout(500);
      const before = await measure(page);
      await page.evaluate(() => {
        document.querySelector(
          "[data-talk-log-now] [data-tori-bubble]",
        ).style.height = "260px";
      });
      await page.waitForTimeout(500);
      const after = await measure(page);
      const ok =
        before.top < before.max - 5 && Math.abs(after.top - before.top) <= 2;
      check(
        label,
        ok,
        `넘긴 뒤 ${JSON.stringify(before)} · 자란 뒤 ${JSON.stringify(after)}`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

// 기기 돌림 48회(CI 43372686213 의 남은 실패를 찾던 재현 틀 rotate.mjs 를 그대로 옮김): 새 차례가 끝난 뒤
// 세로 → 가로 → 세로 → 가로 → 세로로 돌리며 매번 지금 턴이 칸 안에 있는가. 새 차례 뒤 첫 돌림까지의 쉼 4 × 돌리는 사이의 쉼 4 × 3회.
import {
  frame,
  LANDSCAPE as L,
  measure,
  openPage,
  PORTRAIT as P,
} from "../pages/talk-log/measure.mjs";

export const page = "talk-log";

export async function run({ browserType, url, check, log }) {
  let fail = 0;
  let total = 0;
  const browser = await browserType.launch();
  try {
    for (const first of [0, 150, 400, 1200]) {
      for (const gap of [0, 60, 200, 500]) {
        for (let rep = 0; rep < 3; rep++) {
          const page = await openPage(
            browser,
            url("keep=1&tall=1&busy=0"),
            log,
            P,
          );
          await page.waitForTimeout(1500);
          await page.evaluate(() => {
            const log = document.querySelector("[data-talk-log]");
            window.__ev = [];
            log.addEventListener(
              "scroll",
              () =>
                window.__ev.push([
                  "scroll",
                  Math.round(performance.now()),
                  Math.round(log.scrollTop),
                  log.scrollHeight - log.clientHeight,
                ]),
              { passive: true },
            );
          });
          await page.evaluate(() => window.__next(150));
          await page.waitForTimeout(150 * 9 + 600 + first);
          const steps = [];
          for (const [label, size] of [
            ["가로1", L],
            ["세로1", P],
            ["가로2", L],
            ["세로2", P],
          ]) {
            await page.setViewportSize(size);
            await frame(page);
            if (gap) await page.waitForTimeout(gap);
            // 맞춤이 끝나길 잠깐 기다린 뒤 잰다
            await page.waitForTimeout(250);
            const r = await measure(page, { height: true });
            steps.push([label, r]);
          }
          total++;
          const bad = steps.filter(([, r]) => r.hidden > 1);
          if (bad.length) {
            fail++;
            log(
              `실패한 회 · 첫 쉼 ${first} · 사이 쉼 ${gap} · ${rep} · ${steps.map(([l, r]) => `${l} 가림 ${r.hidden} top ${r.top}/${r.max}`).join(" | ")}`,
            );
            log(
              `  넘김 사건: ${JSON.stringify(await page.evaluate(() => window.__ev.slice(-14)))}`,
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
    "새 차례 뒤 세로 · 가로를 번갈아 돌림",
    fail === 0,
    `${total}회 가운데 실패 ${fail}회`,
  );
}

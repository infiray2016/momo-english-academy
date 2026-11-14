// 고친 화면 시험의 순서 20회(재현 틀 flip2.mjs 를 그대로 옮김). tests/e2e/talk-log-follow.spec.ts 의 끝부분(S5 fix 5)과 같은 순서:
// 사진 도우미(세로 → 그림 → 캡처 → 가로 → 그림 → 캡처 → 세로) → 그림 한 장 → 가로 → 잼 → 그림 한 장 → 세로 → 잼.
// 잼은 expectNowInLog 와 같은 꼴로 되풀이해 잰다(여기서는 2초까지).
import {
  frame,
  LANDSCAPE as L,
  openPage,
  PORTRAIT as P,
} from "../pages/talk-log/measure.mjs";

export const page = "talk-log";

const hidden = (page) =>
  page.evaluate(() => {
    const log = document.querySelector("[data-talk-log]");
    const now = log.querySelector("[data-talk-log-now]");
    return Math.round(
      now.getBoundingClientRect().bottom - log.getBoundingClientRect().bottom,
    );
  });

async function settled(page) {
  const until = Date.now() + 2000;
  let h = await hidden(page);
  while (h > 1 && Date.now() < until) {
    await page.waitForTimeout(100);
    h = await hidden(page);
  }
  return h;
}

export async function run({ browserType, url, check, log }) {
  let fail = 0;
  let total = 0;
  let ex = "";
  const browser = await browserType.launch();
  try {
    for (let rep = 0; rep < 20; rep++) {
      const page = await openPage(browser, url("keep=1&tall=1&busy=0"), log, P);
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.__next(150));
      await page.waitForTimeout(150 * 9 + 1200);
      for (const size of [P, L]) {
        await page.setViewportSize(size);
        await frame(page);
        await page.screenshot({ fullPage: true });
      }
      await page.setViewportSize(P);
      await frame(page);
      await page.setViewportSize(L);
      const a = await settled(page);
      await frame(page);
      await page.setViewportSize(P);
      const b = await settled(page);
      total++;
      if (a > 1 || b > 1) {
        fail++;
        if (!ex) ex = `가로 ${a} · 세로 ${b}`;
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  check(
    "고친 e2e 의 순서(사진 도우미 뒤 돌림)",
    fail === 0,
    `${total}회 가운데 실패 ${fail}회 ${ex}`,
  );
}

// 대화 기록 칸(실제 talk-log.tsx)이 지금 턴을 따라가는지 보는 아홉 장면(S5 fix 4 의 재현 틀 check.mjs 를 그대로 옮김).
// (1) 처음 열 때 말풍선이 흐르며 자람 (2) · (3) 새 차례 — 빠른 · 느린 화면 갱신(프레임마다 0 · 45 · 120ms 붙잡음)
// (4) 높이가 줄었다가 다시 커진 뒤에 넘김 사건이 처리됨(CI 에서 난 꼴) (5) 아이가 위로 넘겨 둔 때는 자라도 끌어내리지 않고,
// 새 차례에는 맨 아래로 (6) 기기를 돌림.
import {
  LANDSCAPE,
  measure,
  openPage,
  PORTRAIT,
} from "../pages/talk-log/measure.mjs";

export const page = "talk-log";

export async function run({ browserType, url, check, log }) {
  const m = (p) => measure(p, { roundTop: false });
  async function open(query) {
    const browser = await browserType.launch();
    const p = await openPage(browser, url(query), log);
    return { browser, page: p };
  }
  // (1) 처음 열 때
  {
    const { browser, page } = await open("keep=1&tall=1");
    await page.waitForTimeout(1500);
    const r = await m(page);
    check("처음 열 때 흐르며 자란 말풍선", r.hidden <= 1, JSON.stringify(r));
    await browser.close();
  }
  // (2) · (3) 새 차례
  for (const busy of [0, 45, 120]) {
    const { browser, page } = await open(`keep=1&tall=1&busy=${busy}`);
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__next(150));
    await page.waitForTimeout(150 * 9 + 1500);
    const r = await m(page);
    check(
      `새 차례(프레임마다 ${busy}ms 붙잡음)`,
      r.hidden <= 1,
      JSON.stringify(r),
    );
    await browser.close();
  }
  // (4) 줄었다가 다시 커진 뒤에 넘김 사건이 처리됨
  {
    const { browser, page } = await open("keep=1&tall=1");
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__next(150));
    await page.waitForTimeout(150 * 9 + 1500);
    await page.evaluate(() => {
      const log = document.querySelector("[data-talk-log]");
      log.scrollTop = log.scrollHeight; // 점검의 앞 조건: 맨 아래에서 시작(앱의 따라가기와 무관하게)
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const log = document.querySelector("[data-talk-log]");
      const bubble = log.querySelector(
        "[data-talk-log-now] [data-tori-bubble]",
      );
      bubble.style.minHeight = "0";
      bubble.style.height = "40px"; // 줄어듦
      void log.scrollHeight; // 배치 → 브라우저가 넘김 자리를 줄임(넘김 사건은 나중에 온다)
      bubble.style.height = "220px"; // 넘김 사건이 처리되기 전에 다시 커짐
    });
    await page.waitForTimeout(500);
    const r = await m(page);
    check(
      "줄었다가 다시 커진 뒤에 넘김 사건이 처리됨",
      r.hidden <= 1,
      JSON.stringify(r),
    );
    await browser.close();
  }
  // (5) 아이가 위로 넘겨 둔 때
  {
    const { browser, page } = await open("keep=1&tall=1");
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const log = document.querySelector("[data-talk-log]");
      log.scrollTop = log.scrollHeight;
    });
    await page.waitForTimeout(300);
    const box = await page.locator("[data-talk-log]").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -400);
    await page.waitForTimeout(600);
    const before = await m(page);
    await page.evaluate(() => {
      const bubble = document.querySelector(
        "[data-talk-log-now] [data-tori-bubble]",
      );
      bubble.style.height = "260px"; // 지금 턴이 자람
    });
    await page.waitForTimeout(500);
    const after = await m(page);
    check(
      "위로 넘겨 둔 때는 자라도 끌어내리지 않음",
      before.top < before.max - 100 && Math.abs(after.top - before.top) <= 2,
      `넘긴 뒤 ${JSON.stringify(before)} · 자란 뒤 ${JSON.stringify(after)}`,
    );
    await page.evaluate(() => window.__next(150));
    await page.waitForTimeout(150 * 9 + 1500);
    const next = await m(page);
    check(
      "위로 넘겨 둔 뒤 새 차례에는 맨 아래로",
      next.hidden <= 1,
      JSON.stringify(next),
    );
    await browser.close();
  }
  // (6) 기기를 돌림
  {
    const { browser, page } = await open("keep=1&tall=1");
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.__next(150));
    await page.waitForTimeout(150 * 9 + 1500);
    await page.setViewportSize(LANDSCAPE);
    await page.waitForTimeout(500);
    const land = await m(page);
    check("가로로 돌린 뒤", land.hidden <= 1, JSON.stringify(land));
    await page.setViewportSize(PORTRAIT);
    await page.waitForTimeout(500);
    const port = await m(page);
    check("세로로 되돌린 뒤", port.hidden <= 1, JSON.stringify(port));
    await browser.close();
  }
}

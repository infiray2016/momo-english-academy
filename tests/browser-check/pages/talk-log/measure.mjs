// talk-log 쪽의 장면들이 함께 쓰는 잼 · 열기 도우미.

export const PORTRAIT = { width: 820, height: 1180 };
export const LANDSCAPE = { width: 1180, height: 820 };

/**
 * 지금 턴(data-talk-log-now)의 아래 끝이 기록 칸 아래로 몇 px 가려졌는지(hidden) · 칸의 넘김 자리(top) · 넘김 끝(max).
 * hidden <= 1 이면 지금 턴이 칸 안에 있다.
 * @param {{ roundTop?: boolean, height?: boolean }} [options] roundTop: top 을 반올림(첫 장면 묶음 follow 만 끔) · height: 칸 높이 h 도 잼
 */
export function measure(page, { roundTop = true, height = false } = {}) {
  return page.evaluate(
    ({ roundTop, height }) => {
      const log = document.querySelector("[data-talk-log]");
      const now = log.querySelector("[data-talk-log-now]");
      const b = log.getBoundingClientRect();
      const t = now.getBoundingClientRect();
      const m = {
        hidden: Math.round(t.bottom - b.bottom),
        top: roundTop ? Math.round(log.scrollTop) : log.scrollTop,
        max: log.scrollHeight - log.clientHeight,
      };
      if (height) m.h = log.clientHeight;
      return m;
    },
    { roundTop, height },
  );
}

/** 새 쪽을 열고 기록 칸이 그려질 때까지 기다린다. 쪽 오류는 log 로 적는다. */
export async function openPage(browser, url, log, viewport = PORTRAIT) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => log(`pageerror ${e.message}`));
  await page.goto(url);
  await page.waitForSelector("[data-talk-log]");
  return page;
}

/** 그림 한 장(requestAnimationFrame 한 번)을 기다린다. */
export function frame(page) {
  return page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => r(0))),
  );
}

/** 맨 아래로 넘겨 둔다(점검의 앞 조건 — 앱의 따라가기와 무관하게). */
export function toBottom(page) {
  return page.evaluate(() => {
    const log = document.querySelector("[data-talk-log]");
    log.scrollTop = log.scrollHeight;
  });
}

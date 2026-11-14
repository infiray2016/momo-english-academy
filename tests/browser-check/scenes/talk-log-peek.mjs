// 엿본 뒤 같은 손으로 돌아옴(S5 fix 7 · 코드 재검토 rev-s5-5 M-1 의 재현 장면 peek.mjs 를 옮김). 한 번 닿은 손으로 120px 아래로 끌어 지난 말을
// 엿본 뒤 같은 손으로 120px 되돌아와 맨 아래에 닿고 손을 뗀다. 그 뒤 D ms 에 지금 턴이 '줄었다가 다시 커짐'(넘김 사건이 다시 커진 뒤에 처리됨)이
// 와도 지금 턴이 기록 칸 안에 있어야 한다. 갈래: 손가락과 내용이 같이 움직임(문턱 0px) · 손가락이 10px 움직인 뒤에야 내용이 따라옴(터치 기기의
// 넘김 시작 문턱 흉내, 10px). 고치기 전(e72c403)에는 WebKit 에서 D = 0 · 150 의 네 판정이 실패했다(지금 턴이 172px 가려짐).
import { measure, openPage, toBottom } from "../pages/talk-log/measure.mjs";

export const page = "talk-log";

export async function run({ browserType, url, check, log }) {
  const browser = await browserType.launch();
  try {
    for (const slop of [0, 10]) {
      for (const after of [0, 150, 450]) {
        const page = await openPage(browser, url("keep=1&tall=1"), log);
        await page.waitForTimeout(1500);
        await toBottom(page);
        await page.waitForTimeout(300);
        const back = await page.evaluate(async (slop) => {
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
          const path = [...Array(12).fill(10), ...Array(12).fill(-10)];
          for (const dy of path) {
            y += dy;
            touch("touchmove", y);
            log.scrollTop = top0 - Math.max(0, y - 600 - slop);
            await frame();
          }
          await frame();
          const atBack = Math.round(
            log.scrollHeight - log.clientHeight - log.scrollTop,
          );
          touch("touchend", 0);
          return atBack;
        }, slop);
        if (after > 0) await page.waitForTimeout(after);
        await page.evaluate(() => {
          const log = document.querySelector("[data-talk-log]");
          const bubble = log.querySelector(
            "[data-talk-log-now] [data-tori-bubble]",
          );
          bubble.style.minHeight = "0";
          bubble.style.height = "40px";
          void log.scrollHeight;
          bubble.style.height = "220px";
        });
        await page.waitForTimeout(500);
        const m = await measure(page);
        check(
          `문턱 ${slop}px · 손 뗀 뒤 ${after}ms`,
          m.hidden <= 1,
          `되돌아온 남은 거리 ${back} · ${JSON.stringify(m)}`,
        );
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

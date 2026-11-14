// 손 입력 네 장면(S5 fix 5 · 6 의 재현 틀 touch.mjs 를 그대로 옮김). 합성 touch · wheel 사건으로 확인한다.
// 합성 사건은 Event 에 touches 배열을 붙인 것이다(구현은 event.touches[0].clientY 만 읽는다).
// (가) 손가락을 아래로 끌어 위로 넘긴 뒤에는 지금 턴이 자라도 끌어내리지 않고, 맨 아래로 돌아오면 다시 따라간다(rev-s5-3 M-2)
// (나) 자라는 동안 칸 안을 손으로 누르기만 하면(움직임 2px) 끝까지 따라간다(rev-s5-3 I-1 의 손 입력 꼴, 21회)
// (다) 손이 닿은 요소가 사라져 touchend 가 칸에 오지 않아도(떨어진 요소에만 감) 그 뒤의 '줄었다가 다시 커짐'에 붙어 있음을 잃지 않는다(rev-s5-3 M-1 · rev-s5-4 N-2)
// (라) e2e 가 쓰는 위로 넘김 흉내(합성 wheel deltaY<0 → scrollTop = 0) 뒤에는 자라도 끌어내리지 않고, 새 차례에는 맨 아래로
import { measure, openPage, toBottom } from "../pages/talk-log/measure.mjs";

export const page = "talk-log";

export async function run({ browserType, url, check, log }) {
  const browser = await browserType.launch();
  try {
    async function open(query = "keep=1&tall=1") {
      const page = await openPage(browser, url(query), log);
      await page.waitForTimeout(1500);
      await page.evaluate(() => {
        window.__touch = (type, y, target) => {
          const log = document.querySelector("[data-talk-log]");
          const ev = new Event(type, { bubbles: true });
          Object.defineProperty(ev, "touches", {
            value:
              type === "touchend" || type === "touchcancel"
                ? []
                : [{ clientY: y }],
          });
          (target ?? log).dispatchEvent(ev);
        };
        window.__grow = (px) => {
          const bubble = document.querySelector(
            "[data-talk-log-now] [data-tori-bubble]",
          );
          bubble.style.height = `${px}px`;
        };
        window.__shrinkGrow = () => {
          const log = document.querySelector("[data-talk-log]");
          const bubble = log.querySelector(
            "[data-talk-log-now] [data-tori-bubble]",
          );
          bubble.style.minHeight = "0";
          bubble.style.height = "40px";
          void log.scrollHeight;
          bubble.style.height = "220px";
        };
      });
      return page;
    }
    // (가)
    {
      const page = await open();
      await toBottom(page);
      await page.waitForTimeout(300);
      await page.evaluate(() => {
        const log = document.querySelector("[data-talk-log]");
        window.__touch("touchstart", 600);
        window.__touch("touchmove", 630);
        window.__touch("touchmove", 680);
        log.scrollTop = log.scrollTop - 300; // 손가락을 따라 내용이 내려옴(위로 넘김)
      });
      await page.waitForTimeout(200);
      await page.evaluate(() => window.__touch("touchend", 0));
      await page.waitForTimeout(500);
      const before = await measure(page);
      await page.evaluate(() => window.__grow(260));
      await page.waitForTimeout(500);
      const after = await measure(page);
      check(
        "(가) 손으로 위로 넘겨 둔 때는 자라도 끌어내리지 않음",
        before.top < before.max - 100 && Math.abs(after.top - before.top) <= 2,
        `넘긴 뒤 ${JSON.stringify(before)} · 자란 뒤 ${JSON.stringify(after)}`,
      );
      // 입력 없이 맨 아래로 돌아옴(예: 앱이나 브라우저가 맨 아래로 당김) → 다시 붙는다
      await toBottom(page);
      await page.waitForTimeout(300);
      await page.evaluate(() => window.__grow(420));
      await page.waitForTimeout(500);
      const back = await measure(page);
      check(
        "(가) 맨 아래로 돌아온 뒤에는 다시 따라감",
        back.hidden <= 1,
        JSON.stringify(back),
      );
      await page.close();
    }
    // (나)
    {
      let fail = 0;
      let total = 0;
      let ex = "";
      for (const busy of [0, 45, 120]) {
        for (const tapAt of [250, 290, 320, 580, 620, 740, 1040]) {
          const page = await open(`keep=1&tall=1&busy=${busy}`);
          const t0 = Date.now();
          await page.evaluate(() => window.__next(150));
          const wait = tapAt - (Date.now() - t0);
          if (wait > 0) await page.waitForTimeout(wait);
          await page.evaluate(() => {
            const now = document.querySelector("[data-talk-log-now]");
            window.__touch("touchstart", 500, now);
            window.__touch("touchmove", 502, now);
            window.__touch("touchend", 0, now);
            now.dispatchEvent(
              new PointerEvent("pointerdown", { bubbles: true }),
            );
            now.dispatchEvent(new MouseEvent("click", { bubbles: true }));
          });
          await page.waitForTimeout(150 * 9 + 1500);
          const r = await measure(page);
          total++;
          if (r.hidden > 1) {
            fail++;
            if (!ex)
              ex = `busy ${busy} · 누름 ${tapAt}ms · ${JSON.stringify(r)}`;
          }
          await page.close();
        }
      }
      check(
        "(나) 자라는 동안 칸 안을 손으로 누르기만 함",
        fail === 0,
        `${total}회 가운데 실패 ${fail}회 ${ex}`,
      );
    }
    // (다)
    {
      const page = await open();
      await page.evaluate(() => window.__next(150));
      await page.waitForTimeout(150 * 9 + 1500);
      await toBottom(page);
      await page.waitForTimeout(300);
      await page.evaluate(() => {
        const log = document.querySelector("[data-talk-log]");
        const probe = document.createElement("span");
        log.querySelector("[data-talk-log-now]").appendChild(probe);
        window.__touch("touchstart", 500, probe);
        window.__touch("touchmove", 530, probe);
        probe.remove(); // 손이 닿은 요소가 사라짐 → touchend 는 떨어진 요소에만 가고 칸 · 창에는 오지 않는다(rev-s5-4 N-2)
        window.__touch("touchend", 0, probe);
      });
      await page.waitForTimeout(600);
      await page.evaluate(() => window.__shrinkGrow());
      await page.waitForTimeout(500);
      const r = await measure(page);
      check(
        "(다) 손이 닿은 요소가 사라진 뒤의 '줄었다가 다시 커짐'",
        r.hidden <= 1,
        JSON.stringify(r),
      );
      await page.close();
    }
    // (라)
    {
      const page = await open();
      await toBottom(page);
      await page.waitForTimeout(300);
      await page.evaluate(async () => {
        const el = document.querySelector("[data-talk-log]");
        el.dispatchEvent(
          new WheelEvent("wheel", { deltaY: -400, bubbles: true }),
        );
        if (el.scrollTop > 0) {
          const scrolled = new Promise((resolve) =>
            el.addEventListener("scroll", () => resolve(), { once: true }),
          );
          el.scrollTop = 0;
          await scrolled;
        }
      });
      await page.waitForTimeout(500);
      const before = await measure(page);
      await page.evaluate(() => window.__grow(260));
      await page.waitForTimeout(500);
      const after = await measure(page);
      check(
        "(라) e2e 의 위로 넘김 흉내 뒤에는 자라도 끌어내리지 않음",
        before.top === 0 && after.top === 0,
        `넘긴 뒤 ${JSON.stringify(before)} · 자란 뒤 ${JSON.stringify(after)}`,
      );
      await page.evaluate(() => window.__next(150));
      await page.waitForTimeout(150 * 9 + 1500);
      const next = await measure(page);
      check(
        "(라) 그 뒤 새 차례에는 맨 아래로",
        next.hidden <= 1,
        JSON.stringify(next),
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

// talk-lesson 쪽의 장면들이 함께 쓰는 잼 · 열기 도우미. 길이는 모두 보는 창 위에서 잰 화면 px 이다(쪽 위에서의 자리는 + scrollY).

export const PORTRAIT = { width: 820, height: 1180 };
/** 낮은 세로(사파리 도구 막대를 뺀 높이를 흉내 낸 값 — 브리프 S5 fix 7). */
export const PORTRAIT_LOW = { width: 820, height: 1060 };
/** 한 화면에 다 들 수 없는 세로(가장 작은 높이 · 쪽 넘김이 받치는지 봄 — 높이가 너비보다 커야 세로다). */
export const PORTRAIT_TINY = { width: 700, height: 720 };
export const LANDSCAPE = { width: 1180, height: 820 };
/** 낮은 가로(사파리 도구 막대가 보이는 가로를 흉내 낸 값 — 코드 재검토 rev-s5-6 N-3). */
export const LANDSCAPE_LOW = { width: 1180, height: 740 };
/** 기록 칸 높이를 맞출 때 보는 창 아래에 남기는 여유(px — talk-log.tsx KEEP_IN_VIEW_MARGIN_PX 와 같은 값). */
export const KEEP_MARGIN = 16;
/** 정한 비율(기록 칸의 max-h-[60dvh]). */
export const LOG_RATIO = 0.6;

/** 새 쪽을 열고 판이 그려질 때까지 기다린다(글꼴 · 그림 두 장 포함). 쪽 오류는 log 로 적는다. */
export async function openLesson(browser, url, log, viewport) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => log(`pageerror ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") log(`console ${m.text().slice(0, 160)}`);
  });
  await page.goto(url);
  await page.waitForSelector("[data-talk-panel]");
  await settle(page);
  return page;
}

/** 글꼴을 기다리고 그림 몇 장(효과 · 크기 알림 · 넘김이 끝남)을 기다린다. */
export async function settle(page, ms = 400) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (let i = 0; i < 4; i++)
      await new Promise((r) => requestAnimationFrame(() => r(0)));
  });
  await page.waitForTimeout(ms);
}

/** 화면의 자리들: 위 띠 · '그만하기' · 선생님 창 · 기록 칸 · 지금 턴 · 판의 점선 조각 · 으뜸 단추 · 판의 아래 끝 · 쪽 넘김. */
export function measure(page) {
  return page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return {
        top: Math.round(b.top * 2) / 2,
        bottom: Math.round(b.bottom * 2) / 2,
      };
    };
    const q = (s) => document.querySelector(s);
    const log = q("[data-talk-log]");
    const now = log?.querySelector("[data-talk-log-now]");
    const panel = q("[data-talk-panel]");
    const wrap = q("[data-talk-wrap]");
    const speak = wrap
      ? wrap.querySelector("[data-speak]")
      : q("[data-child-turn] [data-speak]");
    const logBox = log?.getBoundingClientRect();
    return {
      vh: window.visualViewport?.height ?? window.innerHeight,
      scrollY: Math.round(window.scrollY),
      band: r(q("[data-paper-band]")),
      stop: r(q("[data-paper-band] [data-talk-stop]")),
      teacher: r(q("[data-teacher-window]")),
      log: r(log),
      logH: log ? log.clientHeight : null,
      logFit: log ? log.style.getPropertyValue("--talk-log-fit") : null,
      logFitLand: log
        ? log.style.getPropertyValue("--talk-log-fit-landscape")
        : null,
      hidden:
        now && logBox
          ? Math.round(now.getBoundingClientRect().bottom - logBox.bottom)
          : null,
      nowH: now ? Math.round(now.getBoundingClientRect().height) : null,
      foot: r(panel?.lastElementChild),
      speak: r(speak),
      choice: r(q("[data-talk-choice]")),
      panel: r(panel),
      short: r(q("[data-talk-short-line]")),
      discardLine: r(q("[data-child-turn] [data-discard-line]")),
      turnLast: r(q("[data-child-turn]")?.lastElementChild),
      logBoxH: logBox ? Math.round(logBox.height * 2) / 2 : null,
      // 남는 높이로 셈한 기대값(talkLogFitOf 와 같은 식을 쪽에서 따로 셈 — 칸이 지나치게 줄거나 덜 줄면 어긋남, N-4)
      fitExpect: (() => {
        if (!log || !logBox || !panel?.lastElementChild) return null;
        const block =
          log.querySelector(":scope > [data-talk-log-now]") ??
          log.querySelector(':scope > [role="log"]')?.lastElementChild;
        const style = getComputedStyle(log);
        const minH =
          (block?.getBoundingClientRect().height ?? 0) +
          Number.parseFloat(style.paddingTop) +
          Number.parseFloat(style.paddingBottom);
        const vh = window.visualViewport?.height ?? window.innerHeight;
        const below =
          panel.lastElementChild.getBoundingClientRect().bottom - logBox.bottom;
        const room = Math.floor(
          vh - 16 - (logBox.top + window.scrollY) - below,
        );
        return {
          room,
          minH: Math.ceil(minH),
          cap: window.innerHeight * 0.6,
          value: Math.min(
            window.innerHeight * 0.6,
            Math.max(Math.ceil(minH), room),
          ),
        };
      })(),
      scale: window.visualViewport?.scale ?? 1,
    };
  });
}

/** 상자가 보는 창 안에 온전히 있는가(반올림 여유 1px). */
export function inView(box, vh) {
  return box !== null && box.top >= -1 && box.bottom <= vh + 1;
}

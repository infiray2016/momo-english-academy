// talk-chat 쪽을 여는 · 움직이는 · 읽는 도우미(장면들이 같이 쓴다). 시계는 Playwright 가짜 시계(page.clock)이고, 쪽의 가짜 서버 · 음성 대본은
// window.__chatConfig 로 열기 전에 정한다(entry.tsx 의 ChatConfig).

/** 세로 iPad(820 × 1180) · 가로(1180 × 820). */
export const PORTRAIT = { width: 820, height: 1180 };
export const LANDSCAPE = { width: 1180, height: 820 };

/**
 * 쪽을 열고 '시작!'을 눌러 첫 아이 차례까지 간다(가짜 시계로 첫 말풍선 흐름 · 읽기를 지남). 돌려준 page 는 시계가 설치된 채다.
 * config 는 ChatConfig 의 일부, query 는 쪽 주소 쿼리(mode=old 등), before 는 '시작!'을 누르기 전에 할 일(쪽 가림 등), flow 는 시계를 멈추지
 * 않고 실제 시간대로 흐르게 할지(넘김 장면).
 */
export async function openChat(
  browser,
  url,
  { config = {}, query = "", viewport = PORTRAIT, before, flow = false } = {},
) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.clock.install({ time: 0 });
  await page.addInitScript((c) => {
    window.__chatConfig = c;
  }, config);
  await page.goto(url(query));
  // 시계를 멈춰 두고 장면이 runFor 로만 움직인다(실제 시간이 끼어들지 않게 — 시각 판정이 흔들리지 않음). flow 면 실제 시간대로 흐른다
  // (넘김 장면 — 크기 알림 · 그림 걸음이 실제 브라우저의 차례대로 돌게)
  if (!flow) {
    const t = await page.evaluate(() => Date.now());
    await page.clock.pauseAt(t + 1000);
  }
  if (before) await before(page);
  await page.getByRole("button", { name: "시작!" }).click();
  return page;
}

/** 가짜 시계를 ms 만큼 움직인다(타이머 · 그림 걸음 · 흘림 줄 사이 기다림이 차례로 돈다). 잘게 나눠 약속 사슬이 사이사이 풀리게 한다. */
export async function run(page, ms, step = 50) {
  let left = ms;
  while (left > 0) {
    const by = Math.min(step, left);
    await page.clock.runFor(by);
    left -= by;
  }
}

/** 아이 차례가 열릴 때까지 시계를 움직인다(상한 ms). 열렸으면 참. */
export async function untilChild(page, limit = 15_000) {
  for (let t = 0; t < limit; t += 100) {
    if ((await phaseOf(page)) === "child") return true;
    await run(page, 100);
  }
  return (await phaseOf(page)) === "child";
}

export function phaseOf(page) {
  return page.evaluate(
    () =>
      document
        .querySelector("[data-talk-panel]")
        ?.getAttribute("data-talk-phase") ?? null,
  );
}

/** 쪽의 기록(턴 요청 · 조용함 요청 수 · 힌트 · 설명 호출 · maxAlternatives · 세션 없이 읽은 것 · 쪽 오류). */
export function recordOf(page) {
  return page.evaluate(() => {
    const c = window.__chat;
    return {
      requests: c.requests.map((r) => r.body),
      quiet: c.requests.filter((r) => r.body.lead === "quiet").length,
      quietAt: c.requests
        .filter((r) => r.body.lead === "quiet")
        .map((r) => r.at),
      childTurns: c.requests.filter((r) => r.body.input !== undefined).length,
      hintCalls: c.hintCalls.map((r) => r.body),
      explainCalls: c.explainCalls.length,
      maxAlts: [...c.maxAlts],
      bareReads: c.bareReads.map((r) => r.text),
      reads: c.reads.map((r) => ({ text: r.text, live: r.live, at: r.at })),
      router: { ...c.router },
      pageErrors: [...c.pageErrors],
    };
  });
}

/** 지금 시계(ms). */
export function nowOf(page) {
  return page.evaluate(() => performance.now());
}

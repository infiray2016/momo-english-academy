// 버리는 듣기를 켠 기기(iPad) 세로에서 남는 쪽 넘김(S5 fix 8 · 13절 C241 보완 5 · 화면 재검토 des-s5-2 D-5). 아이 차례 조각은 짧은 말 말풍선 ·
// 안내 줄이 뜰 때와 기기를 돌릴 때 동작 줄과 맨 아래 줄을 스스로 화면 안에 넣는다(child-turn.tsx 의 scrollIntoView). 그 넘김이 칸 높이 맞춤보다
// 먼저 돌면 맞추기 전 배치로 쪽이 내려가고, 맞춘 뒤에는 위로 넘기지 않아 쪽 넘김이 남는다.
// (1) 세로(820 × 1180 · 낮은 세로 820 × 1060)의 아이 차례에서 돌리지 않고 짧은 말 말풍선이 뜬 뒤 쪽 넘김이 0 이고 위 띠 '그만하기' · 말하기 ·
//     맨 아래 줄이 보는 창 안이다.
// (2) 같은 창에서 회복 안내 줄('잠깐만요, 마이크를 다시 켤게요')이 뜬 뒤에도 쪽 넘김이 0 이다.
// (3) 짧은 말 말풍선이 뜬 채 세로 → 가로 → 세로로 돌리면(e2e 의 expectInViewBothWays 꼴) 다시 세로에서 쪽 넘김이 0 이다. 가로에서는 말하기 ·
//     맨 아래 줄이 보는 창 안이다(가로의 쪽 넘김은 지금 그대로 — 잰 값을 찍음).
// (4) 가로(1180 × 820)로 연 아이 차례에서 짧은 말 말풍선 · 회복 안내 줄이 떠도 말하기 · 맨 아래 줄이 보는 창 안이다(가로의 대화 장면은 칸 높이를
//     맞추지 않으므로 쪽 넘김은 지금 그대로 — 잰 값을 찍음).
import {
  inView,
  LANDSCAPE,
  measure,
  openLesson,
  PORTRAIT,
  PORTRAIT_LOW,
  settle,
} from "../pages/talk-lesson/measure.mjs";

export const page = "talk-lesson";

const short = (m) =>
  `넘김 ${m.scrollY} · 띠 ${m.band?.top}~${m.band?.bottom} · 그만하기 ${m.stop?.top}~${m.stop?.bottom} · 기록 칸 ${m.log?.top}~${m.log?.bottom}(높이 ${m.logH}, 맞춤 ${m.logFit || "없음"}) · 짧은 말 ${m.short ? `${m.short.top}~${m.short.bottom}` : "-"} · 안내 줄 ${m.discardLine ? `${m.discardLine.top}~${m.discardLine.bottom}` : "-"} · 말하기 ${m.speak?.top}~${m.speak?.bottom} · 맨 아래 줄 ${m.turnLast?.top}~${m.turnLast?.bottom} · 보는 창 ${m.vh}`;

function portraitOk(m) {
  const parts = [
    ["쪽 넘김 0", m.scrollY <= 1],
    ["그만하기", inView(m.stop, m.vh)],
    ["말하기", inView(m.speak, m.vh)],
    ["맨 아래 줄", inView(m.turnLast, m.vh)],
    ["지금 턴이 칸 안", m.hidden <= 1],
  ];
  return parts.filter(([, ok]) => !ok).map(([n]) => n);
}

export async function run({ browserType, url, check, log }) {
  const browser = await browserType.launch();
  try {
    // (1) · (2)
    for (const [viewName, viewport] of [
      ["세로", PORTRAIT],
      ["낮은 세로", PORTRAIT_LOW],
    ]) {
      const page = await openLesson(
        browser,
        url("scene=child&discard=1"),
        log,
        viewport,
      );
      const before = await measure(page);
      await page.evaluate(() => window.__short(true));
      await settle(page);
      const a = await measure(page);
      const badA = portraitOk(a);
      check(
        `${viewName} ${viewport.width}×${viewport.height} · 짧은 말 말풍선이 뜬 뒤`,
        a.short !== null && badA.length === 0,
        `${badA.length ? `어긋남: ${badA.join(", ")} · ` : ""}뜨기 전 ${short(before)} || 뜬 뒤 ${short(a)}`,
      );
      await page.evaluate(() => window.__short(false));
      await settle(page);
      await page.evaluate(() => window.__recover(true));
      await settle(page);
      const b = await measure(page);
      const badB = portraitOk(b);
      check(
        `${viewName} ${viewport.width}×${viewport.height} · 회복 안내 줄이 뜬 뒤`,
        b.discardLine !== null && badB.length === 0,
        `${badB.length ? `어긋남: ${badB.join(", ")} · ` : ""}${short(b)}`,
      );
      await page.close();
    }
    // (3)
    {
      const page = await openLesson(
        browser,
        url("scene=child&discard=1"),
        log,
        PORTRAIT,
      );
      await page.evaluate(() => window.__short(true));
      await settle(page);
      const a = await measure(page);
      await page.setViewportSize(LANDSCAPE);
      await settle(page);
      const b = await measure(page);
      await page.setViewportSize(PORTRAIT);
      await settle(page);
      const c = await measure(page);
      const badC = portraitOk(c);
      const landOk = inView(b.speak, b.vh) && inView(b.turnLast, b.vh);
      check(
        "짧은 말 말풍선이 뜬 채 세로 → 가로 → 세로로 돌려도 다시 세로에서 쪽 넘김 0",
        badC.length === 0 && landOk,
        `${badC.length ? `어긋남: ${badC.join(", ")} · ` : ""}${landOk ? "" : "가로에서 말하기 · 맨 아래 줄이 창 밖 · "}세로 ${short(a)} || 가로 ${short(b)} || 다시 세로 ${short(c)}`,
      );
      await page.close();
    }
    // (4)
    {
      const page = await openLesson(
        browser,
        url("scene=child&discard=1"),
        log,
        LANDSCAPE,
      );
      await page.evaluate(() => window.__short(true));
      await settle(page);
      const a = await measure(page);
      await page.evaluate(() => window.__short(false));
      await settle(page);
      await page.evaluate(() => window.__recover(true));
      await settle(page);
      const b = await measure(page);
      check(
        "가로로 연 아이 차례에서 짧은 말 · 회복 안내 줄이 떠도 말하기 · 맨 아래 줄이 보는 창 안",
        [a, b].every(
          (m) => inView(m.speak, m.vh) && inView(m.turnLast, m.vh),
        ) &&
          !a.logFitLand &&
          !b.logFitLand,
        `짧은 말 ${short(a)} || 회복 안내 ${short(b)}`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

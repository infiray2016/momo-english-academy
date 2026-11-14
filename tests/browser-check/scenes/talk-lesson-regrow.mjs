// 낮아진 기록 칸의 되돌림과 두 손가락 확대(S5 fix 8 · 13절 C241 보완 5 · 화면 재검토 des-s5-2 D-6 · 코드 재검토 rev-s5-6 N-1 · 화면 묶음에 넘길 것 4).
// (1) 세로(820 × 1180)에서 아래 조각이 큰 차례(마무리 제안 · 짧은 말 말풍선이 뜬 아이 차례) 뒤 선생님 차례로 넘어가면, 기록 칸이 낮게 맞춘 채
//     남지 않고 보통 아이 차례의 높이(잠깐 생긴 조각을 뺀 남는 높이)로 돌아온다. 쪽 넘김은 내내 0 이다.
// (2) 보통의 차례 바꿈(선생님 → 아이 → 선생님 → 아이)에서 기록 칸 높이는 첫 아이 차례 뒤로 흔들리지 않는다(fix 7 의 꼴 그대로).
// (3) 쪽을 확대한 동안(보는 창의 배율 2 — Chromium 만, WebKit 은 배율을 바꿀 길이 없음)에는 기록 칸이 줄지 않고, 확대를 풀면 맞춘 높이 그대로다.
import {
  measure,
  openLesson,
  PORTRAIT,
  settle,
} from "../pages/talk-lesson/measure.mjs";

export const page = "talk-lesson";

const short = (m) =>
  `넘김 ${m.scrollY} · 기록 칸 ${m.log?.top}~${m.log?.bottom}(높이 ${m.logH}, 맞춤 ${m.logFit || "없음"}) · 마지막 조각 ${m.foot?.top}~${m.foot?.bottom} · 보는 창 ${m.vh}(배율 ${m.scale})`;

async function step(page, scene) {
  await page.evaluate((s) => window.__scene(s), scene);
  await settle(page);
  return measure(page);
}

export async function run({ browserType, browserName, url, check, log }) {
  const browser = await browserType.launch();
  try {
    // (1) 마무리 제안 뒤
    {
      const page = await openLesson(
        browser,
        url("scene=teacher"),
        log,
        PORTRAIT,
      );
      const first = await measure(page);
      const child = await step(page, "child");
      const suggest = await step(page, "suggest");
      const teacher = await step(page, "teacher");
      const worst = Math.max(
        first.scrollY,
        child.scrollY,
        suggest.scrollY,
        teacher.scrollY,
      );
      check(
        "마무리 제안 뒤 선생님 차례에서 기록 칸이 보통 아이 차례의 높이로 돌아옴",
        suggest.logH < child.logH - 1 &&
          Math.abs(teacher.logH - child.logH) <= 1 &&
          worst <= 1,
        `선생님 ${short(first)} → 아이 ${short(child)} → 마무리 제안 ${short(suggest)} → 선생님 ${short(teacher)}`,
      );
      await page.close();
    }
    // (1) 짧은 말 말풍선이 뜬 아이 차례 뒤(버리는 듣기를 켠 기기)
    {
      const page = await openLesson(
        browser,
        url("scene=teacher&discard=1"),
        log,
        PORTRAIT,
      );
      const child = await step(page, "child");
      await page.evaluate(() => window.__short(true));
      await settle(page);
      const shortShown = await measure(page);
      const teacher = await step(page, "teacher");
      check(
        "짧은 말 말풍선이 뜬 아이 차례 뒤 선생님 차례에서 기록 칸이 보통 아이 차례의 높이로 돌아옴",
        shortShown.logH < child.logH - 1 &&
          Math.abs(teacher.logH - child.logH) <= 1 &&
          Math.max(child.scrollY, teacher.scrollY) <= 1,
        `아이 ${short(child)} → 짧은 말 ${short(shortShown)} → 선생님 ${short(teacher)}`,
      );
      await page.close();
    }
    // (2)
    {
      const page = await openLesson(
        browser,
        url("scene=teacher"),
        log,
        PORTRAIT,
      );
      const seen = [];
      const heights = [];
      for (const scene of ["child", "teacher", "child", "teacher", "child"]) {
        const m = await step(page, scene);
        heights.push(m.logH);
        seen.push(`${scene} 칸 ${m.logH} · 넘김 ${m.scrollY}`);
      }
      const spread = Math.max(...heights) - Math.min(...heights);
      check(
        "보통의 차례 바꿈에서 첫 아이 차례 뒤 기록 칸 높이가 흔들리지 않음",
        spread <= 1,
        seen.join(" → "),
      );
      await page.close();
    }
    // (3)
    if (browserName === "chromium") {
      const page = await openLesson(browser, url("scene=child"), log, PORTRAIT);
      const a = await measure(page);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
      await settle(page);
      const b = await measure(page);
      await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
      await settle(page);
      const c = await measure(page);
      check(
        "쪽을 확대한 동안 기록 칸이 줄지 않고 확대를 풀면 맞춘 높이 그대로(N-1)",
        b.scale > 1.5 &&
          Math.abs(b.logH - a.logH) <= 1 &&
          Math.abs(c.logH - a.logH) <= 1,
        `확대 전 ${short(a)} || 확대 중 ${short(b)} || 푼 뒤 ${short(c)}`,
      );
      await page.close();
    } else
      log(
        "(3) 확대: WebKit 은 쪽 배율을 바꿀 길이 없어 재지 않음(Chromium 에서만 잼)",
      );
  } finally {
    await browser.close();
  }
}

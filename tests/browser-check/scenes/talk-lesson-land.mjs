// 가로로 연 수업의 마무리 제안 · 정리(S5 fix 8 · 13절 C241 보완 5 · 화면 재검토 des-s5-2 D-7 · 코드 재검토 rev-s5-6 N-2 · N-3).
// (1) 가로(1180 × 820)로 연 마무리 제안 · 정리에서 쪽 넘김이 0 이고 위 띠(마무리 제안은 '그만하기'까지) · 선생님 창 · 기록 칸 · 으뜸 단추 줄이
//     보는 창 안이다. 기록 칸은 남는 높이로 셈한 값이다(정한 비율보다 작으면 그 값).
// (2) 가로의 대화 장면(아이 차례 · 가장 큰 지금 턴 · 선생님 차례)은 지금 그대로다: 기록 칸이 정한 비율(보는 창의 60%)이고 쪽 넘김이 0 이다.
// (3) 세로로 연 마무리 제안 · 정리를 가로로 돌렸다가 세로로 되돌려도 쪽 넘김이 남지 않는다(N-2 — 고치기 전 Chromium 46 · 102px).
// (4) 낮은 가로(1180 × 740)의 잰 값을 찍는다(N-3 — 아이 차례 넘김은 fix 7 에서 22 → 0). 마무리 제안 · 정리는 쪽 넘김 0, 모든 차례에서 말하기가
//     보는 창 안이다.
import {
  inView,
  LANDSCAPE,
  LANDSCAPE_LOW,
  LOG_RATIO,
  measure,
  openLesson,
  PORTRAIT,
  settle,
} from "../pages/talk-lesson/measure.mjs";

export const page = "talk-lesson";

/** 정리 말풍선의 글이 다 흐를 때까지(ms, 점검 값 — talk-lesson-fit 과 같은 값). */
const WRAP_TYPED_MS = 2500;

const short = (m) =>
  `넘김 ${m.scrollY} · 띠 ${m.band?.top}~${m.band?.bottom} · 그만하기 ${m.stop?.top}~${m.stop?.bottom} · 선생님 창 ${m.teacher?.top}~${m.teacher?.bottom} · 기록 칸 ${m.log?.top}~${m.log?.bottom}(높이 ${m.logH}, 맞춤 세로 ${m.logFit || "없음"} · 가로 ${m.logFitLand || "없음"}, 기대 ${m.fitExpect?.value ?? "-"}) · 말하기 ${m.speak?.top}~${m.speak?.bottom}${m.choice ? ` · 두 단추 ${m.choice.top}~${m.choice.bottom}` : ""} · 마지막 조각 ${m.foot?.top}~${m.foot?.bottom} · 보는 창 ${m.vh}`;

async function open(browser, url, log, viewport, scene) {
  const page = await openLesson(browser, url(`scene=${scene}`), log, viewport);
  if (scene === "wrap") await settle(page, WRAP_TYPED_MS);
  return page;
}

export async function run({ browserType, url, check, log }) {
  const browser = await browserType.launch();
  try {
    // (1)
    for (const scene of ["suggest", "wrap"]) {
      const page = await open(browser, url, log, LANDSCAPE, scene);
      const m = await measure(page);
      const parts = [
        ["쪽 넘김 0", m.scrollY <= 1],
        ["위 띠", inView(m.band, m.vh)],
        ["선생님 창", inView(m.teacher, m.vh)],
        ["기록 칸", inView(m.log, m.vh)],
        ["말하기", inView(m.speak, m.vh)],
        [
          "칸 높이가 남는 높이로 셈한 값",
          m.fitExpect !== null && Math.abs(m.logBoxH - m.fitExpect.value) <= 1,
        ],
      ];
      if (scene === "suggest") {
        parts.push(["그만하기", inView(m.stop, m.vh)]);
        parts.push(["두 단추", inView(m.choice, m.vh)]);
      }
      const bad = parts.filter(([, ok]) => !ok).map(([n]) => n);
      check(
        `가로로 연 수업 ${LANDSCAPE.width}×${LANDSCAPE.height} · ${scene}`,
        bad.length === 0,
        `${bad.length ? `어긋남: ${bad.join(", ")} · ` : ""}${short(m)}`,
      );
      await page.close();
    }
    // (2)
    for (const scene of ["child", "hint", "teacher"]) {
      const page = await open(browser, url, log, LANDSCAPE, scene);
      const m = await measure(page);
      const ratio = Math.abs(m.logH - LANDSCAPE.height * LOG_RATIO) <= 1;
      check(
        `가로로 연 수업 · ${scene}(기록 칸 높이는 정한 비율 그대로 · 쪽 넘김 0)`,
        ratio && m.scrollY <= 1 && !m.logFit && !m.logFitLand,
        short(m),
      );
      await page.close();
    }
    // (2) 이어서: 가로의 마무리 제안에서 선생님 차례로 넘어가면 정한 비율로 돌아온다
    {
      const page = await open(browser, url, log, LANDSCAPE, "suggest");
      const a = await measure(page);
      await page.evaluate(() => window.__scene("teacher"));
      await settle(page);
      const b = await measure(page);
      check(
        "가로의 마무리 제안 → 선생님 차례에서 기록 칸이 정한 비율로 돌아옴",
        Math.abs(b.logH - LANDSCAPE.height * LOG_RATIO) <= 1 &&
          b.scrollY <= 1 &&
          !b.logFit &&
          !b.logFitLand,
        `마무리 제안 ${short(a)} || 선생님 차례 ${short(b)}`,
      );
      await page.close();
    }
    // (3)
    for (const scene of ["suggest", "wrap"]) {
      const page = await open(browser, url, log, PORTRAIT, scene);
      const a = await measure(page);
      await page.setViewportSize(LANDSCAPE);
      await settle(page);
      const b = await measure(page);
      await page.setViewportSize(PORTRAIT);
      await settle(page);
      const c = await measure(page);
      check(
        `세로로 연 ${scene} → 가로 → 세로에서 쪽 넘김이 남지 않음(N-2)`,
        a.scrollY <= 1 &&
          b.scrollY <= 1 &&
          c.scrollY <= 1 &&
          inView(c.band, c.vh) &&
          inView(b.speak, b.vh),
        `세로 ${short(a)} || 가로 ${short(b)} || 다시 세로 ${short(c)}`,
      );
      await page.close();
    }
    // (4)
    for (const scene of ["child", "hint", "suggest", "wrap"]) {
      const page = await open(browser, url, log, LANDSCAPE_LOW, scene);
      const m = await measure(page);
      const ok =
        inView(m.speak, m.vh) &&
        (scene === "child" || scene === "hint" || m.scrollY <= 1);
      check(
        `낮은 가로 ${LANDSCAPE_LOW.width}×${LANDSCAPE_LOW.height} · ${scene}`,
        ok,
        short(m),
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

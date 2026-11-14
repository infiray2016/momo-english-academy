// 수업 화면 전체가 보는 창 안에(S5 fix 7 · 13절 C241 보완 4 · 화면 재검토 des-s5 D-1 · D-2). 앱의 실제 스타일로 그린 수업 판에서 잰다.
// (0) 쪽이 옮긴 판 짜임 · 효과의 글이 talk-frame.tsx 에 그대로 있다(옮긴 짜임이 실제와 다르면 재지 않는다).
// (1) 세로(820 × 1180) · 낮은 세로(820 × 1060)의 아이 차례 · 가장 큰 지금 턴 · 마무리 제안 · 정리에서 쪽 넘김이 0 이고 위 띠의 '그만하기' · 선생님
//     창 · 기록 칸 · 으뜸 단추가 보는 창 안이며, 지금 턴이 기록 칸 안이다.
// (2) 세로에서 차례가 바뀌어도(선생님 → 아이 → 선생님 → 아이 → 마무리 제안 → 정리) 쪽이 움직이지 않는다.
// (3) 세로에서 가로로 돌리면 쪽 넘김이 남지 않고(D-2), 다시 세로로 와도 0 이다.
// (4) 가로로 연 수업은 기록 칸 높이가 정한 비율(보는 창의 60%) 그대로다(아이 차례는 쪽 넘김 0).
// (5) 한 화면에 다 들 수 없는 세로(700 × 720)에서는 기록 칸이 지금 턴보다 낮아지지 않고, 으뜸 단추가 보는 창 안이며, 쪽 넘김은 단추 묶음의 아래
//     끝까지만이다(빈 알림 줄 자리는 보는 창 밖에 남을 수 있음).
// BROWSER_CHECK_LEGACY=1 이면 쪽을 고치기 전 틀의 효과로 연다(--swap 으로 옛 talk-log.tsx 와 함께 — 고치기 전에 실패하는지 볼 때).
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT } from "../build.mjs";
import {
  FRAME_CLASSES,
  FRAME_EFFECT_TEXTS,
} from "../pages/talk-lesson/frame-classes.mjs";
import {
  inView,
  LANDSCAPE,
  measure,
  openLesson,
  PORTRAIT,
  PORTRAIT_LOW,
  PORTRAIT_TINY,
  settle,
} from "../pages/talk-lesson/measure.mjs";

export const page = "talk-lesson";

const LEGACY = process.env.BROWSER_CHECK_LEGACY === "1";
/** 정리 말풍선의 글이 다 흐를 때까지(ms, 점검 값). */
const WRAP_TYPED_MS = 2500;

const short = (m) =>
  `넘김 ${m.scrollY} · 띠 ${m.band?.top}~${m.band?.bottom} · 그만하기 ${m.stop?.top}~${m.stop?.bottom} · 선생님 창 ${m.teacher?.top}~${m.teacher?.bottom} · 기록 칸 ${m.log?.top}~${m.log?.bottom}(높이 ${m.logH}, 맞춤 ${m.logFit || "없음"}) · 지금 턴 ${m.nowH ?? "-"}(가려짐 ${m.hidden ?? "-"}) · 말하기 ${m.speak?.top}~${m.speak?.bottom}${m.choice ? ` · 두 단추 ${m.choice.top}~${m.choice.bottom}` : ""} · 마지막 조각 ${m.foot?.top}~${m.foot?.bottom} · 보는 창 ${m.vh}`;

export async function run({ browserType, url, check, log }) {
  const q = (scene) => `scene=${scene}${LEGACY ? "&legacy=1" : ""}`;
  if (LEGACY) log("고치기 전 틀의 효과로 연다(legacy=1)");
  // (0)
  const frame = await readFile(
    join(ROOT, "src", "components", "conversation", "talk-frame.tsx"),
    "utf8",
  );
  const missing = Object.entries(FRAME_CLASSES)
    .filter(([, cls]) => !frame.includes(`"${cls}"`))
    .map(([k]) => k);
  if (!LEGACY)
    missing.push(...FRAME_EFFECT_TEXTS.filter((t) => !frame.includes(t)));
  check(
    "옮긴 판 짜임 · 효과가 talk-frame.tsx 와 같음",
    missing.length === 0,
    missing.length === 0 ? "" : `없는 글: ${missing.join(" | ")}`,
  );

  const browser = await browserType.launch();
  try {
    // (1)
    for (const [viewName, viewport] of [
      ["세로", PORTRAIT],
      ["낮은 세로", PORTRAIT_LOW],
    ]) {
      for (const scene of ["child", "hint", "suggest", "wrap"]) {
        const page = await openLesson(browser, url(q(scene)), log, viewport);
        if (scene === "wrap") await settle(page, WRAP_TYPED_MS);
        const m = await measure(page);
        const parts = [
          ["쪽 넘김 0", m.scrollY <= 1],
          ["그만하기", inView(m.stop, m.vh)],
          ["선생님 창", inView(m.teacher, m.vh)],
          ["기록 칸", inView(m.log, m.vh)],
          ["말하기", inView(m.speak, m.vh)],
        ];
        if (scene === "suggest")
          parts.push(["두 단추", inView(m.choice, m.vh)]);
        if (scene !== "wrap") parts.push(["지금 턴이 칸 안", m.hidden <= 1]);
        const bad = parts.filter(([, ok]) => !ok).map(([n]) => n);
        check(
          `${viewName} ${viewport.width}×${viewport.height} · ${scene}`,
          bad.length === 0,
          `${bad.length ? `어긋남: ${bad.join(", ")} · ` : ""}${short(m)}`,
        );
        await page.close();
      }
    }
    // (2)
    {
      const page = await openLesson(browser, url(q("teacher")), log, PORTRAIT);
      const seen = [];
      let worst = 0;
      for (const scene of [
        "teacher",
        "child",
        "teacher",
        "child",
        "suggest",
        "wrap",
      ]) {
        await page.evaluate((s) => window.__scene(s), scene);
        await settle(page, scene === "wrap" ? WRAP_TYPED_MS : 400);
        const m = await measure(page);
        worst = Math.max(worst, m.scrollY);
        seen.push(`${scene} ${m.scrollY}(칸 ${m.logH}, 띠 위 ${m.band?.top})`);
      }
      check(
        "세로에서 차례가 바뀌어도 쪽이 움직이지 않음",
        worst <= 1,
        seen.join(" → "),
      );
      await page.close();
    }
    // (3)
    {
      const page = await openLesson(browser, url(q("child")), log, PORTRAIT);
      const a = await measure(page);
      await page.setViewportSize(LANDSCAPE);
      await settle(page);
      const b = await measure(page);
      await page.setViewportSize(PORTRAIT);
      await settle(page);
      const c = await measure(page);
      check(
        "세로 → 가로 → 세로로 돌려도 쪽 넘김이 남지 않음(D-2)",
        a.scrollY <= 1 &&
          b.scrollY <= 1 &&
          c.scrollY <= 1 &&
          b.hidden <= 1 &&
          c.hidden <= 1,
        `세로 ${short(a)} || 가로 ${short(b)} || 다시 세로 ${short(c)}`,
      );
      await page.close();
    }
    // (4)
    for (const scene of ["child", "hint", "suggest", "wrap"]) {
      const page = await openLesson(browser, url(q(scene)), log, LANDSCAPE);
      if (scene === "wrap") await settle(page, WRAP_TYPED_MS);
      const m = await measure(page);
      const ratio = Math.abs(m.logH - LANDSCAPE.height * 0.6) <= 1;
      const ok =
        ratio &&
        (scene === "suggest" || scene === "wrap" || m.scrollY <= 1) &&
        inView(m.speak, m.vh);
      check(
        `가로로 연 수업 · ${scene}(기록 칸 높이는 정한 비율 그대로)`,
        ok,
        short(m),
      );
      await page.close();
    }
    // (5)
    for (const scene of ["child", "hint"]) {
      const page = await openLesson(browser, url(q(scene)), log, PORTRAIT_TINY);
      const m = await measure(page);
      const ok =
        inView(m.speak, m.vh) &&
        m.hidden <= 1 &&
        m.logH >= m.nowH &&
        (LEGACY || m.speak.bottom + 16 <= m.vh + 1);
      check(
        `한 화면에 다 들 수 없는 세로 ${PORTRAIT_TINY.width}×${PORTRAIT_TINY.height} · ${scene}`,
        ok,
        short(m),
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

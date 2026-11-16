// S5 fix 9 장면(13절 C241 보완 8 · 화면 재검토 des-s5-3 D-8 · 정본 03 4절 92줄 '반짝인다'): 말 주고받기가 참고 턴만큼 길고 오늘 쓸 말을 쓴 아이
// 말(반짝이는 줄)이 대화 앞쪽에 있는 정리를 세로 820 × 1180 · 가로 1180 × 820 · 낮은 가로 1180 × 740 에서 연다. 실제 수업 틀(talk-frame 의
// WrapLog)을 그리는 talk-chat 쪽이고, 이야기 방식(mode chat)과 기존 두 방식의 화면(mode old) 둘 다 본다. 에이전트 호출은 없다.
// (가) 정리가 열린 직후(그림 셋 뒤)와 정리 말풍선 글이 다 흐른 뒤 모두, 마지막 반짝이는 줄이 정리 칸 안에 온전히(강조 테까지) 들고 쪽 넘김이 0 이다.
//     쪽 넘김은 정리를 열기 전(아이 차례)에 남아 있던 만큼을 넘지 않는 것으로 본다 — 이야기 방식의 낮은 가로 아이 차례는 쪽 넘김 18px 가 남은 채
//     정리로 오고(고치기 전 판도 같음, 정리는 아래로만 넘김), 정리 칸 넘김이 쪽을 넘기지 않는지가 이 고침의 몫이다. 값은 판정 줄에 찍는다.
// (나) 반짝이는 줄이 없거나(낮은 가로) 마지막 아이 말이라 이미 칸 안에 있으면(세로 — 낮은 칸에서는 그 아래 지금 말풍선 몫 때문에 칸 밖이라 (가)와
//     같은 갈래) 지금처럼 맨 아래에 붙어 있다. 정리 말풍선 · 말하기의 자리는 같은 창의 (가)와 같다(바꾸지 않음).
//     열린 직후의 값은 찍기만 한다 — Chromium 은 고치기 전 판에서도 열린 직후 그림 셋 동안 칸이 맨 아래에서 21px 위에 있다가 붙는다(기록 칸의
//     맞춤이 칸 높이 맞춤보다 한 걸음 늦음, 이 고침과 무관).
// (다) 그 뒤 아이가 손(휠)으로 칸을 조금 내린 자리는, 보는 창이 바뀌어 칸이 다시 맞춰져도 끌려가지 않는다(반짝이는 줄로도 맨 아래로도).
// 고치기 전 판(정리 칸은 늘 맨 아래)에서는 (가)가 실패한다.
import { openChat, untilChild } from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const PORTRAIT = { width: 820, height: 1180 };
const LANDSCAPE = { width: 1180, height: 820 };
const LANDSCAPE_LOW = { width: 1180, height: 740 };
const SIZES = [
  ["세로", PORTRAIT],
  ["가로", LANDSCAPE],
  ["낮은 가로", LANDSCAPE_LOW],
];
/** 1~3단계 회화의 참고 턴(level_specs — 점검 값, 기록 칸의 지난 차례 쌍 수). */
const REFERENCE_TURNS = 15;
/** 오늘 쓸 말(정리 자료의 metWords)과 그 말이 든 아이 말(끝 s 꼴로 맞춤). */
const WORD = "duck";
const SHINE_SAID = "I like ducks.";
/** 반짝이는 줄의 멈춘 강조 테(ring-4) 두께(px) — '온전히'는 테까지 칸 안이다. */
const RING = 4;
/** 정리 말풍선의 글이 다 흐를 때까지(ms, 점검 값 — talk-lesson-land 와 같은 값). */
const WRAP_TYPED_MS = 2500;
/** 휠로 조금 내리는 거리(px — 맨 아래에 닿지 않을 만큼). */
const NUDGE_PX = 40;

const frames = (p, n) =>
  p.evaluate(async (k) => {
    for (let i = 0; i < k; i++)
      await new Promise((r) => requestAnimationFrame(() => r(0)));
  }, n);

/** 정리 칸 · 마지막 반짝이는 줄(칸 안쪽 위 기준) · 정리 말풍선 · 말하기 · 쪽 넘김. */
function wrapOf(p) {
  return p.evaluate(() => {
    const log = document.querySelector("[data-wrap-log] [data-talk-log]");
    if (!log) return null;
    const box = log.getBoundingClientRect();
    const innerTop = box.top + log.clientTop;
    const shines = log.querySelectorAll("[data-wrap-shine]");
    const last = shines[shines.length - 1];
    const r = last?.getBoundingClientRect();
    const at = (el) => {
      const b = el?.getBoundingClientRect();
      return b ? Math.round(b.top * 2) / 2 : null;
    };
    return {
      top: Math.round(log.scrollTop),
      max: log.scrollHeight - log.clientHeight,
      h: log.clientHeight,
      shines: shines.length,
      line: r
        ? {
            top: Math.round((r.top - innerTop) * 2) / 2,
            bottom: Math.round((r.bottom - innerTop) * 2) / 2,
          }
        : null,
      wrapTop: at(document.querySelector("[data-wrap-all]")),
      speakTop: at(document.querySelector("[data-wrap-all] [data-speak]")),
      scrollY: Math.round(window.scrollY),
    };
  });
}

const lineIn = (m) =>
  m !== null &&
  m.line !== null &&
  m.line.top - RING >= -1 &&
  m.line.bottom + RING <= m.h + 1;
const atBottom = (m) => m !== null && m.top >= m.max - 2;
const text = (m) =>
  m === null
    ? "칸 없음"
    : `칸 넘김 ${m.top}/${m.max} · 칸 높이 ${m.h} · 반짝이는 줄 ${m.shines}개 · 마지막 ${m.line ? `${m.line.top}~${m.line.bottom}` : "없음"} · 정리 말풍선 ${m.wrapTop} · 말하기 ${m.speakTop} · 쪽 넘김 ${m.scrollY}`;

/** 정리를 연다: 첫 아이 차례에서 '그만하기' → 확인 쪽지 없이 정리. 열린 직후(그림 셋 뒤)와 글이 다 흐른 뒤를 잰다. */
async function openWrap(browser, url, { viewport, mode, words, childTexts }) {
  const p = await openChat(browser, url, {
    viewport,
    flow: true,
    query: mode === "old" ? "mode=old" : "",
    config: { pairs: REFERENCE_TURNS, childTexts, wrap: { words } },
  });
  const opened = await untilChild(p);
  const before = await p.evaluate(() => Math.round(window.scrollY));
  await p.locator("[data-talk-stop]").click();
  await p.waitForSelector("[data-wrap-log] [data-talk-log]");
  await frames(p, 3);
  const first = await wrapOf(p);
  await p.waitForTimeout(WRAP_TYPED_MS);
  await frames(p, 4);
  const settled = await wrapOf(p);
  return { p, opened, before, first, settled };
}

export async function run({ browserType, url, check, log }) {
  const browser = await browserType.launch();
  try {
    for (const mode of ["chat", "old"]) {
      const tag = mode === "chat" ? "이야기 방식" : "기존 방식";
      // (가)
      const early = {};
      for (const [name, viewport] of SIZES) {
        const o = await openWrap(browser, url, {
          viewport,
          mode,
          words: [WORD],
          childTexts: [SHINE_SAID],
        });
        early[name] = o.settled;
        check(
          `${tag} · ${name} ${viewport.width}×${viewport.height} · 앞쪽 반짝이는 줄이 열린 직후 · 글이 흐른 뒤 정리 칸 안 · 쪽 넘김 0`,
          o.opened &&
            lineIn(o.first) &&
            lineIn(o.settled) &&
            o.first.scrollY <= Math.max(1, o.before) &&
            o.settled.scrollY <= Math.max(1, o.before),
          `열기 전 쪽 넘김 ${o.before} || 직후 ${text(o.first)} || 흐른 뒤 ${text(o.settled)}`,
        );
        await o.p.context().close();
      }
      // (나)
      for (const [what, name, words, childTexts] of [
        ["반짝이는 줄 없음", "낮은 가로", ["zebra"], [SHINE_SAID]],
        [
          "마지막 아이 말이 반짝이는 줄",
          "세로",
          [WORD],
          [...Array(REFERENCE_TURNS - 1).fill("I like it."), SHINE_SAID],
        ],
      ]) {
        const viewport = name === "세로" ? PORTRAIT : LANDSCAPE_LOW;
        const o = await openWrap(browser, url, {
          viewport,
          mode,
          words,
          childTexts,
        });
        const same = early[name];
        check(
          `${tag} · ${name} · ${what} · 맨 아래 그대로 · 정리 말풍선 · 말하기 자리 같음`,
          o.opened &&
            atBottom(o.settled) &&
            o.settled.scrollY <= Math.max(1, o.before) &&
            (what === "반짝이는 줄 없음"
              ? o.settled.shines === 0
              : lineIn(o.settled)) &&
            same !== undefined &&
            Math.abs(o.settled.wrapTop - same.wrapTop) <= 1 &&
            Math.abs(o.settled.speakTop - same.speakTop) <= 1,
          `직후 ${text(o.first)} || 흐른 뒤 ${text(o.settled)} || (가) ${text(same ?? null)}`,
        );
        await o.p.context().close();
      }
    }
    // (다) 이야기 방식 · 세로 → 가로, 가로 → 낮은 가로
    for (const [from, to] of [
      [PORTRAIT, LANDSCAPE],
      [LANDSCAPE, LANDSCAPE_LOW],
    ]) {
      const o = await openWrap(browser, url, {
        viewport: from,
        mode: "chat",
        words: [WORD],
        childTexts: [SHINE_SAID],
      });
      const box = await o.p
        .locator("[data-wrap-log] [data-talk-log]")
        .boundingBox();
      await o.p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await o.p.mouse.wheel(0, NUDGE_PX);
      await o.p.waitForTimeout(600);
      const moved = await wrapOf(o.p);
      await o.p.setViewportSize(to);
      await o.p.waitForTimeout(600);
      await frames(o.p, 4);
      const after = await wrapOf(o.p);
      const kept =
        moved !== null &&
        after !== null &&
        moved.top !== o.settled.top &&
        !atBottom(moved) &&
        Math.abs(after.top - Math.min(moved.top, after.max)) <= 2;
      check(
        `이야기 방식 · ${from.width}×${from.height} → ${to.width}×${to.height} · 손으로 내린 자리를 끌어오지 않음`,
        kept,
        `연 뒤 ${text(o.settled)} || 내린 뒤 ${text(moved)} || 바뀐 창 ${text(after)}`,
      );
      await o.p.context().close();
    }
    log("반짝이는 줄은 대화 앞쪽(첫 아이 말) — 말 주고받기 15쌍");
  } finally {
    await browser.close();
  }
}

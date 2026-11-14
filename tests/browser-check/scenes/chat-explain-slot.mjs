// W fix 2 장면 (나)(13절 C243 보완 7 (4), 화면 검토 M-1): 끝 줄에 설명 기다림 칸이 있는 차례는 뜻 줄 아래에 글 없는 한 줄 자리를 잡아 두므로,
// 늦게 붙는 막힌 뒤 설명이 아이 차례 단추 묶음('말하기' · '힌트' · '잘 모르겠어요')을 밀지 않는다(붙기 전과 뒤의 자리 차이 2px 안). 기록 칸이 아직
// 상한에 닿지 않은 때(지난 차례 쌍 0 · 1 · 2)를 세로 · 가로에서 본다. 설명이 오지 않는 차례(실패)는 자리가 그 차례 끝까지 남는다. 기존 방식(mode old)
// 에는 자리가 없다. 고치기 전 판에서는 설명이 붙을 때 묶음이 내려가 실패한다.
import {
  LANDSCAPE,
  openChat,
  PORTRAIT,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

/** 실제 시간대로 흐른다(배치 · 크기 알림이 실제 브라우저의 차례로 돌게 — chat-log-follow 와 같음). */
const advance = (p, ms) => p.waitForTimeout(ms);

export const page = "talk-chat";

const PAIRS = [0, 1, 2];
const EXPLAIN_MS = 3000;
const SLACK_PX = 2;

function measure(p) {
  return p.evaluate(() => {
    const byText = (t) =>
      [...document.querySelectorAll("button")].find(
        (b) => b.textContent?.trim() === t,
      );
    const top = (el) =>
      el ? Math.round(el.getBoundingClientRect().top) : null;
    const log = document.querySelector("[data-talk-log]");
    return {
      speak: top(byText("말하기")),
      hint: top(document.querySelector("[data-hint-button]")),
      dontKnow: top(document.querySelector("[data-dont-know]")),
      slot: document.querySelectorAll("[data-tori-explanation-slot]").length,
      explain: document.querySelectorAll("[data-tori-explanation]").length,
      logHeight: log ? Math.round(log.getBoundingClientRect().height) : null,
      logMax: log ? log.scrollHeight - log.clientHeight : null,
    };
  });
}

const same = (a, b) =>
  a !== null &&
  b !== null &&
  ["speak", "hint", "dontKnow"].every(
    (k) => a[k] !== null && b[k] !== null && Math.abs(a[k] - b[k]) <= SLACK_PX,
  );

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (const viewport of [PORTRAIT, LANDSCAPE]) {
    const tag = viewport === PORTRAIT ? "세로" : "가로";
    for (const pairs of PAIRS) {
      // (1) 설명이 3초 뒤 붙음
      {
        const p = await openChat(browser, url, {
          viewport,
          flow: true,
          config: {
            pairs,
            signal: { hint: true, explainWait: 6 },
            explain: { delayMs: EXPLAIN_MS, ok: true },
          },
        });
        const opened = await untilChild(p);
        await advance(p, 800);
        const before = await measure(p);
        await advance(p, EXPLAIN_MS + 500);
        const after = await measure(p);
        const r = await recordOf(p);
        check(
          `${tag} · 지난 쌍 ${pairs} · 설명이 붙기 전과 뒤의 단추 묶음 자리가 같음(±${SLACK_PX}px)`,
          opened &&
            before.slot === 1 &&
            before.explain === 0 &&
            after.slot === 0 &&
            after.explain === 1 &&
            same(before, after) &&
            r.pageErrors.length === 0,
          `앞 ${JSON.stringify(before)} · 뒤 ${JSON.stringify(after)} · 설명 호출 ${r.explainCalls}`,
        );
        await p.context().close();
      }
      // (2) 설명이 오지 않음(실패): 자리는 그 차례 끝까지 남고 묶음은 움직이지 않음
      {
        const p = await openChat(browser, url, {
          viewport,
          flow: true,
          config: {
            pairs,
            signal: { hint: true, explainWait: 6 },
            explain: { delayMs: 1000, ok: false },
          },
        });
        await untilChild(p);
        await advance(p, 800);
        const before = await measure(p);
        await advance(p, 3000);
        const after = await measure(p);
        check(
          `${tag} · 지난 쌍 ${pairs} · 설명 실패 · 자리가 남고 묶음이 그대로`,
          before.slot === 1 && after.slot === 1 && same(before, after),
          `앞 ${JSON.stringify(before)} · 뒤 ${JSON.stringify(after)}`,
        );
        await p.context().close();
      }
    }
  }
  // (3) 설명 기다림 칸이 없는 차례 · 기존 방식: 자리 없음
  for (const query of ["", "mode=old"]) {
    const p = await openChat(browser, url, {
      query,
      flow: true,
      config: { pairs: 1, signal: { hint: true } },
    });
    await untilChild(p);
    await advance(p, 800);
    const m = await measure(p);
    check(
      `${query === "" ? "설명 기다림 없는 차례" : "기존 방식"} · 자리 없음`,
      m.slot === 0,
      JSON.stringify(m),
    );
    await p.context().close();
  }
}

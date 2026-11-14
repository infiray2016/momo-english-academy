// W fix 2 장면 (다)(13절 C243 보완 7 (5), 화면 검토 M-2): 이야기 방식 힌트 받기의 점 셋 단은 글 단과 같은 높이다(뜻 단 · 빈칸 영어 단 · 듣기 단추가
// 있는 영어 단 셋 모두, 차이 1px 안). 그래서 글이 와도 아이 차례 단추 묶음이 뛰지 않는다. 받는 동안 ui.wait_hint_seconds 둘째 값(5초)이 넘으면 그 단에
// '확인하고 있어요' 한 줄이 보이고 단 높이는 그대로다. 세로 · 가로. 고치기 전 판에서는 점 셋 단이 56px 이라 뜻 단(48px)과 다르다.
import {
  LANDSCAPE,
  openChat,
  PORTRAIT,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

/** 실제 시간대로 흐른다(크기 알림 · 그림 걸음이 실제 브라우저의 차례로 돌게 — 가짜 시계를 멈추면 칸 높이 맞춤이 늦게 잡힘, chat-log-follow 와 같음). */
const advance = (p, ms) => p.waitForTimeout(ms);

export const page = "talk-chat";

const ROUNDS = 2;
const SLACK_PX = 1;
const HINT_MS = 1200;
const LATE_MS = 6500;
const CHECKING = "확인하고 있어요";

function tierOf(p, index) {
  return p.evaluate((i) => {
    const li = document.querySelectorAll("[data-hint-tier]")[i];
    const speak = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "말하기",
    );
    if (!li) return null;
    return {
      state: li.getAttribute("data-hint-state"),
      height: Math.round(li.getBoundingClientRect().height * 2) / 2,
      line: li.querySelector("[data-wait-line]")?.textContent ?? null,
      speak: speak ? Math.round(speak.getBoundingClientRect().top) : null,
      pageScroll: Math.round(window.scrollY),
      log: Math.round(
        document.querySelector("[data-talk-log]")?.getBoundingClientRect()
          .height ?? 0,
      ),
      list: Math.round(
        document.querySelector("[data-hint-tiers]")?.getBoundingClientRect()
          .height ?? 0,
      ),
    };
  }, index);
}

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let r = 0; r < ROUNDS; r++) {
    for (const viewport of [PORTRAIT, LANDSCAPE]) {
      const tag = viewport === PORTRAIT ? "세로" : "가로";
      // (1) 단 셋: 받는 중과 글의 높이 · 단추 묶음 자리
      {
        const p = await openChat(browser, url, {
          viewport,
          flow: true,
          config: { hintTiers: 3, hintDelayMs: HINT_MS },
        });
        await untilChild(p);
        const rows = [];
        for (let i = 0; i < 3; i++) {
          await p.locator("[data-hint-button]").click();
          await advance(p, 300);
          const loading = await tierOf(p, i);
          await advance(p, HINT_MS + 300);
          const text = await tierOf(p, i);
          rows.push({ loading, text });
        }
        rows.forEach((row, i) => {
          const kind = ["뜻", "빈칸 영어", "영어 · 듣기 단추"][i];
          check(
            `되풀이 ${r + 1} · ${tag} · 단 ${i + 1}(${kind}) · 점 셋 단과 글 단의 높이가 같음`,
            row.loading?.state === "loading" &&
              row.text?.state === "text" &&
              Math.abs(row.loading.height - row.text.height) <= SLACK_PX &&
              row.loading.speak !== null &&
              Math.abs(row.loading.speak - row.text.speak) <= SLACK_PX,
            `받는 중 ${JSON.stringify(row.loading)} · 글 ${JSON.stringify(row.text)}`,
          );
        });
        await p.context().close();
      }
      // (2) 늦은 힌트(6.5초): 5초 앞 줄 없음 · 5초 뒤 줄 있음, 높이는 그대로
      {
        const p = await openChat(browser, url, {
          viewport,
          flow: true,
          config: { hintTiers: 3, hintDelayMs: LATE_MS },
        });
        await untilChild(p);
        await p.locator("[data-hint-button]").click();
        await advance(p, 300);
        const first = await tierOf(p, 0);
        await advance(p, 4300);
        const before5 = await tierOf(p, 0);
        await advance(p, 800);
        const after5 = await tierOf(p, 0);
        await advance(p, LATE_MS);
        const text = await tierOf(p, 0);
        check(
          `되풀이 ${r + 1} · ${tag} · 받는 동안 5초 줄 · 단 높이 그대로`,
          first?.state === "loading" &&
            first.line === null &&
            before5?.line === null &&
            after5?.state === "loading" &&
            after5.line === CHECKING &&
            text?.state === "text" &&
            text.line === null &&
            Math.abs(after5.height - first.height) <= SLACK_PX &&
            Math.abs(after5.height - text.height) <= SLACK_PX,
          `처음 ${JSON.stringify(first)} · 4.6초 ${JSON.stringify(before5)} · 5.4초 ${JSON.stringify(after5)} · 글 ${JSON.stringify(text)}`,
        );
        await p.context().close();
      }
    }
  }
}

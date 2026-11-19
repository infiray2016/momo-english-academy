// S5 fix 9 장면(코드 검토 rev-chat-w-3 m-2 · 13절 C243 보완 7 (7)): 대화 기록 칸이 다시 그려질 때 '맨 아래에 붙어 있음'을 한 번 알리는 줄(talk-log 의
// 마운트 알림)을 증명한다. 선생님이 읽는 동안 아이가 칸을 위로 넘겨 둔 채(떠남) 짧은 준비 쪽지가 떠 칸이 넘김 사건 없이 사라지고, 쪽지 뒤 돌아옴
// (leadTurn back) 차례에서 칸이 새로 그려진다. 새 칸은 맨 아래에 붙은 채 시작하므로 돌아온 차례의 조용함 요청이 기다림 시간 뒤 한 번 나가야 한다.
// 그 알림 줄을 지운 판(--swap)에서는 틀이 앞 칸의 떠남을 들고 있어 조용함이 오지 않아 실패한다. 실제 시간대로 흐른다(chat-log-away 와 같음).
import { openChat, recordOf, untilChild } from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const PORTRAIT = { width: 820, height: 1180 };
const LANDSCAPE = { width: 1180, height: 820 };
const ROUNDS = 2;
const QUIET_SECONDS = 4;
/** 선생님 읽기 한 번(ms — 읽는 동안 칸을 올릴 틈). */
const READ_MS = 3000;
/** 돌아온 차례의 조용함을 기다리는 상한(ms — 흘림 · 읽기 · 글 흐름 · 기다림 시간 + 여유). */
const BACK_QUIET_LIMIT_MS = READ_MS + QUIET_SECONDS * 1000 + 6000;

const wait = (p, ms) => p.waitForTimeout(ms);

function scrollOf(p) {
  return p.evaluate(() => {
    const log = document.querySelector("[data-talk-log]");
    if (!log) return null;
    return {
      top: Math.round(log.scrollTop),
      max: log.scrollHeight - log.clientHeight,
    };
  });
}

async function until(p, ok, limit, step = 100) {
  for (let t = 0; t < limit; t += step) {
    if (await ok()) return true;
    await wait(p, step);
  }
  return ok();
}

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  try {
    for (let r = 0; r < ROUNDS; r++) {
      for (const viewport of [PORTRAIT, LANDSCAPE]) {
        const tag = viewport === PORTRAIT ? "세로" : "가로";
        const p = await openChat(browser, url, {
          viewport,
          flow: true,
          config: {
            pairs: 8,
            readMs: READ_MS,
            signal: { quietSeconds: QUIET_SECONDS, hint: true },
            replies: [{ kind: "turn", prep: true }, { kind: "turn" }],
          },
        });
        await untilChild(p);
        // 기록 칸이 문서에서 한 번이라도 사라졌는가(짧은 준비 쪽지 — 잠깐이라 변화 관찰로 잡는다)
        await p.evaluate(() => {
          window.__logGone = false;
          new MutationObserver(() => {
            if (!document.querySelector("[data-talk-log]"))
              window.__logGone = true;
          }).observe(document.body, { childList: true, subtree: true });
        });
        // 첫 아이 차례의 조용함 요청 → 짧은 준비를 연 선생님 차례가 흐르고 읽는 동안 칸을 위로 올린다
        const firstQuiet = await until(
          p,
          async () => (await recordOf(p)).quiet >= 1,
          QUIET_SECONDS * 1000 + 4000,
        );
        await until(
          p,
          () =>
            p.evaluate(() =>
              document
                .querySelector("[data-talk-lesson]")
                ?.hasAttribute("data-talk-reading"),
            ),
          4000,
          50,
        );
        const box = await p.locator("[data-talk-log]").boundingBox();
        await p.mouse.move(box.x + box.width / 2, box.y + 40);
        // 읽기가 시작되는 순간에는 새 말풍선이 자라며 칸이 맨 아래를 따라가, 올린 것이 가끔 되돌려진다(2026-11-19: 화면 고침 5 앞 판에서도
        // 24번 가운데 1번, 뒤 판에서 48번 가운데 9번). 올리는 동작 자체는 talk-log-wheel · chat-log-away 가 증명하고, 이 장면은 '올린 뒤'를
        // 보므로 올려질 때까지 읽는 동안 몇 번 더 올린다. 몇 번째에 올려졌는지는 판정 줄에 적는다(늘면 보이게)
        let raised = null;
        let tries = 0;
        while (tries < 4) {
          tries += 1;
          await p.mouse.wheel(0, -400);
          await wait(p, 400);
          raised = await scrollOf(p);
          if (raised !== null && raised.top < raised.max - 2) break;
        }
        const away = raised !== null && raised.top < raised.max - 2;
        // 쪽지 → 돌아옴 차례 → 돌아온 차례의 조용함
        const backSent = await until(
          p,
          async () =>
            (await recordOf(p)).requests.some((b) => b.lead === "back"),
          READ_MS + 6000,
        );
        const quietBack = await until(
          p,
          async () => (await recordOf(p)).quiet >= 2,
          BACK_QUIET_LIMIT_MS,
        );
        const rec = await recordOf(p);
        const gone = await p.evaluate(() => window.__logGone === true);
        check(
          `되풀이 ${r + 1} · ${tag} · 올린 칸이 쪽지로 사라진 뒤 돌아온 차례의 조용함 1`,
          firstQuiet &&
            away &&
            gone &&
            backSent &&
            quietBack &&
            rec.pageErrors.length === 0,
          `첫 조용함 ${firstQuiet} · 올림 ${away}(${tries}번째 · ${JSON.stringify(raised)}) · 칸 사라짐 ${gone} · 돌아옴 요청 ${backSent} · 조용함 ${rec.quiet}(돌아온 차례 ${quietBack}) · 요청 ${rec.requests.map((b) => b.lead ?? "아이").join(",")}`,
        );
        await p.context().close();
      }
    }
  } finally {
    await browser.close();
  }
}

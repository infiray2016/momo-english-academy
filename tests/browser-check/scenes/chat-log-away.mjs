// W fix 2 장면 (라)(13절 C243 보완 7 (7), 화면 검토 M-4): 대화 기록 칸을 위로 넘겨 둔 동안은 기다림 시간이 지나도 조용함 요청이 나가지 않고(칸도
// 끌려 내려오지 않음), 맨 아래로 돌아온 뒤 기다림 시간이 지나면 한 번 나간다(돌아온 때부터 처음부터 잼). 넘김은 휠 · 키(PageUp 으로 올리고 End 로
// 내림) 두 갈래, 세로 · 가로. 실제 시간대로 흐른다(chat-log-follow 와 같음). 고치기 전 판에서는 넘겨 둔 동안 조용함 요청이 나가 실패한다.
import {
  LANDSCAPE,
  nowOf,
  openChat,
  PORTRAIT,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

const advance = (p, ms) => p.waitForTimeout(ms);

export const page = "talk-chat";

const ROUNDS = 2;
const QUIET_SECONDS = 4;
/** 돌아온 때부터 조용함 요청까지 받아들이는 늦음(ms — 읽기 끝 · 시계 걸음 · 기기 부하). 이르게 나가는 쪽은 돌아옴을 재는 걸음(100ms)과
 * 부드러운 넘김이 맨 아래에 닿은 뒤 잰 때의 차이만 받아들인다. */
const LATE_SLACK_MS = 1500;
const EARLY_SLACK_MS = 300;

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

const atBottom = (s) => s !== null && s.top >= s.max - 2;

async function until(p, ok, limit = 3000) {
  for (let t = 0; t < limit; t += 100) {
    if (ok(await scrollOf(p))) return true;
    await advance(p, 100);
  }
  return ok(await scrollOf(p));
}

const ways = {
  async wheelUp(p) {
    const box = await p.locator("[data-talk-log]").boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + 40);
    await p.mouse.wheel(0, -400);
  },
  async wheelDown(p) {
    const box = await p.locator("[data-talk-log]").boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + 40);
    await p.mouse.wheel(0, 4000);
  },
  async keyUp(p) {
    await p.focus("[data-talk-log-now] [data-tori-bubble]");
    await p.keyboard.press("PageUp");
  },
  async keyDown(p) {
    await p.keyboard.press("End");
  },
};

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let r = 0; r < ROUNDS; r++) {
    for (const viewport of [PORTRAIT, LANDSCAPE]) {
      const tag = viewport === PORTRAIT ? "세로" : "가로";
      for (const how of ["휠", "키"]) {
        const p = await openChat(browser, url, {
          viewport,
          flow: true,
          config: {
            pairs: 8,
            signal: { quietSeconds: QUIET_SECONDS, hint: true },
            replies: [{ kind: "turn", chat: { hint: true } }],
          },
        });
        await untilChild(p);
        await advance(p, 300);
        if (how === "휠") await ways.wheelUp(p);
        else await ways.keyUp(p);
        const raised = await until(p, (s) => s !== null && !atBottom(s));
        // 부드러운 넘김이 멈출 틈(그 뒤의 자리를 '넘겨 둔 자리'로 잰다)
        await advance(p, 800);
        const up = await scrollOf(p);
        // 넘겨 둔 채 기다림 시간의 두 배 넘게
        await advance(p, QUIET_SECONDS * 2000 + 1000);
        const held = await recordOf(p);
        const stillUp = await scrollOf(p);
        if (how === "휠") await ways.wheelDown(p);
        else await ways.keyDown(p);
        const backed = await until(p, atBottom);
        const backAt = await nowOf(p);
        let sentAt = null;
        for (let t = 0; t < QUIET_SECONDS * 1000 + 4000; t += 100) {
          const rec = await recordOf(p);
          if (rec.quiet >= 1) {
            sentAt = rec.quietAt[0];
            break;
          }
          await advance(p, 100);
        }
        const after = sentAt === null ? null : sentAt - backAt;
        check(
          `되풀이 ${r + 1} · ${tag} · ${how} · 넘겨 둔 동안 조용함 0 · 끌려 내려오지 않음`,
          raised &&
            held.quiet === 0 &&
            stillUp !== null &&
            up !== null &&
            Math.abs(stillUp.top - up.top) <= 1 &&
            held.pageErrors.length === 0,
          `올림 ${raised} · 조용함 ${held.quiet} · 칸 ${JSON.stringify(up)} → ${JSON.stringify(stillUp)}`,
        );
        check(
          `되풀이 ${r + 1} · ${tag} · ${how} · 맨 아래로 돌아온 뒤 기다림 시간이 지나 조용함 1`,
          backed &&
            after !== null &&
            after >= QUIET_SECONDS * 1000 - EARLY_SLACK_MS &&
            after <= QUIET_SECONDS * 1000 + LATE_SLACK_MS,
          `돌아옴 ${backed} · 돌아온 뒤 ${after}ms(기다림 ${QUIET_SECONDS}초)`,
        );
        await p.context().close();
      }
    }
  }
}

// W fix 2 장면 (가)(13절 C243 보완 7 (3), 화면 검토 I-1): 조용함 요청을 보낸 뒤 선생님 첫 줄이 올 때까지 지금 말풍선은 그대로 두고, 그 아래에
// 보통 선생님 차례와 같은 기다림 칸(점 셋 — ui.wait_hint_seconds 첫 값 안, 둘째 값이 넘으면 '[이름](이/가) 생각하고 있어요')이 보인다. 첫 줄이 오면
// 칸이 사라지고 앞 말풍선이 기록으로 올라간다. 요청이 거절(stale) · 오류로 끝나 차례를 다시 열 때도 그 칸만 지운다. 맞장구는 읽지 않는다. 응답 늦춤은
// 6초(둘째 값 5초를 넘김)와 2초. 기존 방식(mode old)에는 칸이 없다. 고치기 전 판에서는 칸이 없어 기다림 판정이 실패한다.
import {
  run as advance,
  nowOf,
  openChat,
  phaseOf,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const ROUNDS = 3;
/** 시드의 ui.wait_hint_seconds(점검 쪽은 시드 설정을 그대로 쓴다 — 장면이 쪽에서 읽어 판정한다). */
const WAIT_LINE = "미나가 생각하고 있어요";
const FIRST_BUBBLE = "What did you do today?";
const WAIT_TEXT = "Hmm, let me think.";

function cellOf(p) {
  return p.evaluate(() => {
    const cell = document.querySelector("[data-tori-waiting-quiet]");
    const bubbles = [
      ...document.querySelectorAll("[data-talk-log-now] [data-tori-bubble]"),
    ].map((b) => b.textContent ?? "");
    if (!cell) return { shown: false, line: null, bubbles };
    const r = cell.getBoundingClientRect();
    return {
      shown: r.height > 0 && cell.querySelector("[data-wait-hint]") !== null,
      line: cell.querySelector("[data-wait-line]")?.textContent ?? null,
      bubbles,
    };
  });
}

/** 조용함 요청이 나갈 때까지 시계를 움직이고 그 때(쪽 시계)를 돌려준다. */
async function untilQuiet(p, limit = 20_000) {
  for (let t = 0; t < limit; t += 50) {
    const r = await recordOf(p);
    if (r.quiet >= 1) return r.quietAt[0];
    await advance(p, 50);
  }
  return null;
}

/** 칸이 처음 보인 때(조용함 요청 뒤, 50ms 걸음). */
async function firstShown(p, from, limit = 1500) {
  for (let t = 0; t <= limit; t += 50) {
    if ((await cellOf(p)).shown) return (await nowOf(p)) - from;
    await advance(p, 50);
  }
  return null;
}

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    // (1) 늦은 첫 줄(6초): 1초 안에 칸 · 5초 뒤 한 줄 · 첫 줄에서 칸이 사라지고 새 말풍선
    {
      const p = await openChat(browser, url, {
        config: {
          signal: { quietSeconds: 5, hint: true },
          replies: [{ kind: "turn", delayMs: 6000, chat: { hint: true } }],
        },
      });
      const opened = await untilChild(p);
      const quietAt = await untilQuiet(p);
      const shownIn = quietAt === null ? null : await firstShown(p, quietAt);
      const early = await cellOf(p);
      // 둘째 값(5초) 바로 앞: 줄 없음 · 지난 뒤: 줄 있음
      await advance(p, Math.max(0, quietAt + 4600 - (await nowOf(p))));
      const before5 = await cellOf(p);
      await advance(p, 800);
      const after5 = await cellOf(p);
      // 첫 줄(6초 + 흘림 틈) 뒤
      await advance(p, 1500);
      const afterLine = await cellOf(p);
      await untilChild(p);
      const r = await recordOf(p);
      const logged = await p.evaluate(
        () =>
          document.querySelector("[data-talk-log] [role=log]")?.textContent ??
          "",
      );
      check(
        `되풀이 ${i + 1} · 늦은 첫 줄 · 1초 안에 칸 · 말풍선 그대로`,
        opened &&
          quietAt !== null &&
          shownIn !== null &&
          shownIn <= 1000 &&
          early.bubbles.length === 1 &&
          early.bubbles[0].includes(FIRST_BUBBLE),
        `열림 ${opened} · 조용함 ${quietAt} · 칸이 보인 때 +${shownIn}ms · 말풍선 ${JSON.stringify(early.bubbles)}`,
      );
      check(
        `되풀이 ${i + 1} · 늦은 첫 줄 · 5초 줄`,
        before5.shown &&
          before5.line === null &&
          after5.shown &&
          after5.line === WAIT_LINE,
        `4.6초 ${JSON.stringify(before5)} · 5.4초 ${JSON.stringify(after5)}`,
      );
      check(
        `되풀이 ${i + 1} · 늦은 첫 줄 · 첫 줄에서 칸이 사라지고 앞 말풍선이 기록으로`,
        !afterLine.shown &&
          afterLine.bubbles.length === 1 &&
          !afterLine.bubbles[0].includes(FIRST_BUBBLE) &&
          logged.includes(FIRST_BUBBLE) &&
          !r.reads.some((x) => x.text === WAIT_TEXT) &&
          r.pageErrors.length === 0,
        `뒤 ${JSON.stringify(afterLine)} · 기록에 앞 말 ${logged.includes(FIRST_BUBBLE)} · 맞장구 읽음 ${r.reads.filter((x) => x.text === WAIT_TEXT).length} · 쪽 오류 ${r.pageErrors.length}`,
      );
      await p.context().close();
    }
    // (2) 거절(stale) · 오류로 끝남: 칸만 지우고 차례를 다시 연다
    for (const kind of ["stale", "error"]) {
      const p = await openChat(browser, url, {
        config: {
          signal: { quietSeconds: 5, hint: true },
          replies: [{ kind, delayMs: 2000 }],
        },
      });
      await untilChild(p);
      const quietAt = await untilQuiet(p);
      const shownIn = quietAt === null ? null : await firstShown(p, quietAt);
      await advance(p, 2500);
      const after = await cellOf(p);
      const phase = await phaseOf(p);
      check(
        `되풀이 ${i + 1} · ${kind} · 칸이 보였다가 지워지고 차례가 다시 열림`,
        shownIn !== null &&
          shownIn <= 1000 &&
          !after.shown &&
          phase === "child" &&
          after.bubbles.length === 1 &&
          after.bubbles[0].includes(FIRST_BUBBLE),
        `칸 +${shownIn}ms · 뒤 ${JSON.stringify(after)} · 차례 ${phase}`,
      );
      await p.context().close();
    }
  }
  // (3) 기존 방식: 조용함 요청 · 칸 없음
  {
    const p = await openChat(browser, url, { query: "mode=old" });
    await untilChild(p);
    await advance(p, 20_000);
    const r = await recordOf(p);
    const cells = await p.locator("[data-tori-waiting-quiet]").count();
    check(
      "기존 방식 · 조용함 요청 0 · 칸 0",
      r.quiet === 0 && cells === 0,
      `조용함 ${r.quiet} · 칸 ${cells}`,
    );
    await p.context().close();
  }
}

// W 장면 (10): 넘김 세 장면(대화 기록 칸 talk-log 는 고치지 않고 확인만). (가) 누른 뒤 몇 초 만에 차는 힌트 단 (나) 끝 줄 뒤에 늦게 붙는 막힌 뒤
// 설명 (다) 아이 말풍선 없이 잇달아 쌓이는 선생님 말풍선(조용함 차례). 기준: 맨 아래 맞춤(지금 턴이 칸 안 · 세로에서 쪽이 넘겨지지 않음 · 말하기
// 단추가 보는 창 안). (가) · (나)는 아이가 위로 넘겨 둔 때(위로 가는 휠)는 끌어내리지 않는다(같은 차례 안에서 자람). (다)는 위로 넘겨 둔 때도
// 새 선생님 말풍선이 칸 안에 온다(컨트롤러 결정 '새 차례는 맨 아래로' — talk-log 의 지금 규칙, 코드 검토 rev-chat-w M-4).
import {
  LANDSCAPE,
  openChat,
  PORTRAIT,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

/** 이 장면은 실제 시간대로 흐른다(크기 알림 · 그림 걸음 · 휠 넘김이 실제 브라우저의 차례로 돌게 — 가짜 시계를 멈추면 넘김이 늦게 잡힘). */
const advance = (p, ms) => p.waitForTimeout(ms);

export const page = "talk-chat";

const ROUNDS = 3;

function measure(p) {
  return p.evaluate(() => {
    const log = document.querySelector("[data-talk-log]");
    const now = log?.querySelector("[data-talk-log-now]");
    const speak = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "말하기",
    );
    if (!log || !now) return null;
    const b = log.getBoundingClientRect();
    const t = now.getBoundingClientRect();
    return {
      hidden: Math.round(t.bottom - b.bottom),
      top: Math.round(log.scrollTop),
      max: log.scrollHeight - log.clientHeight,
      pageScroll: Math.round(window.scrollY),
      speakBottom: speak
        ? Math.round(speak.getBoundingClientRect().bottom)
        : null,
      viewport: window.innerHeight,
    };
  });
}

async function wheelUp(p) {
  const box = await p.locator("[data-talk-log]").boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + 40);
  await p.mouse.wheel(0, -400);
  // 휠 넘김이 칸에 닿을 때까지(부드러운 넘김 — 기기가 바쁘면 늦게 닿는다): 칸이 맨 아래를 떠날 때까지 최대 3초, 그 뒤 부드러운 넘김이 멈출 틈
  for (let t = 0; t < 3000; t += 100) {
    const off = await p.evaluate(() => {
      const log = document.querySelector("[data-talk-log]");
      return log
        ? log.scrollTop < log.scrollHeight - log.clientHeight - 2
        : false;
    });
    if (off) break;
    await advance(p, 100);
  }
  await advance(p, 600);
}

const inView = (m) =>
  m !== null &&
  m.hidden <= 1 &&
  (m.speakBottom === null || m.speakBottom <= m.viewport);

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    for (const viewport of [PORTRAIT, LANDSCAPE]) {
      const tag = viewport === PORTRAIT ? "세로" : "가로";
      for (const up of [false, true]) {
        const how = up ? "위로 넘겨 둠" : "맨 아래";
        // (가) 힌트 단이 몇 초 뒤에 참
        {
          const p = await openChat(browser, url, {
            viewport,
            flow: true,
            config: {
              pairs: 8,
              hintDelayMs: 1500 + i * 500,
              signal: { hint: true },
            },
          });
          await untilChild(p);
          await advance(p, 500);
          if (up) await wheelUp(p);
          const before = await measure(p);
          await p.locator("[data-hint-button]").click();
          await advance(p, 2500 + i * 500);
          const after = await measure(p);
          const tiers = await p.locator("[data-hint-state=text]").count();
          const ok = up
            ? before !== null &&
              after !== null &&
              Math.abs(after.top - before.top) <= 1 &&
              before.top < before.max - 2
            : inView(after) &&
              (viewport !== PORTRAIT || after.pageScroll === 0);
          check(
            `되풀이 ${i + 1} · ${tag} · 힌트 단 · ${how}`,
            ok && tiers === 1,
            `앞 ${JSON.stringify(before)} · 뒤 ${JSON.stringify(after)} · 글 단 ${tiers}`,
          );
          await p.context().close();
        }
        // (나) 막힌 뒤 설명이 끝 줄 뒤에 붙음
        {
          const p = await openChat(browser, url, {
            viewport,
            flow: true,
            config: {
              pairs: 8,
              signal: { hint: true, explainWait: 6 },
              explain: { delayMs: 3000 + i * 500, ok: true },
            },
          });
          await untilChild(p);
          await advance(p, 500);
          if (up) await wheelUp(p);
          const before = await measure(p);
          await advance(p, 3500 + i * 500);
          const after = await measure(p);
          const shown = await p.locator("[data-tori-explanation]").count();
          const ok = up
            ? before !== null &&
              after !== null &&
              Math.abs(after.top - before.top) <= 1 &&
              before.top < before.max - 2
            : inView(after) &&
              (viewport !== PORTRAIT || after.pageScroll === 0);
          check(
            `되풀이 ${i + 1} · ${tag} · 막힌 뒤 설명 · ${how}`,
            ok && shown === 1,
            `앞 ${JSON.stringify(before)} · 뒤 ${JSON.stringify(after)} · 설명 ${shown}`,
          );
          await p.context().close();
        }
        // (다) 조용함 차례마다 선생님 말풍선이 잇달아 쌓임
        {
          const p = await openChat(browser, url, {
            viewport,
            flow: true,
            config: {
              pairs: 8,
              // 기다림 시간은 위로 넘김(부드러운 넘김 · 바쁜 기기의 늦음 포함)이 조용함 차례보다 먼저 닿을 만큼 길게
              signal: { quietSeconds: 7, hint: true },
              replies: [
                { kind: "turn" },
                { kind: "turn", chat: { hint: true } },
              ],
            },
          });
          await untilChild(p);
          const seen = [];
          for (let k = 0; k < 2; k++) {
            if (up) await wheelUp(p);
            const before = await measure(p);
            await advance(p, 9000);
            await untilChild(p, 5000);
            seen.push({ before, after: await measure(p) });
          }
          const r = await recordOf(p);
          {
            // 위로 넘겨 둔 때는 넘김이 실제로 칸을 올렸는지(맨 아래가 아님)를 앞 조건으로 본다
            const raised =
              !up ||
              seen.every(
                (s) => s.before !== null && s.before.top < s.before.max - 2,
              );
            const ok =
              raised &&
              r.quiet === 2 &&
              seen.every(
                (s) =>
                  inView(s.after) &&
                  (viewport !== PORTRAIT || s.after.pageScroll === 0),
              );
            check(
              `되풀이 ${i + 1} · ${tag} · 쌓이는 선생님 말풍선 · ${how}`,
              ok,
              `칸을 올려 둠 ${raised} · 조용함 ${r.quiet} · ${JSON.stringify(seen.map((s) => s.after))}`,
            );
          }
          await p.context().close();
        }
      }
    }
  }
}

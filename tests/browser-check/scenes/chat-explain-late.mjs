// W 장면(코드 검토 rev-chat-w I-1): 막힌 뒤 설명이 오기 전에 아이가 다시 누르면(말 · '잘 모르겠어요') 그 설명은 버린다 — 다음 선생님 말풍선
// 아래에 앞 차례의 설명이 붙지 않는다. 새 차례가 흐르는 동안(끝 줄 전) 표본마다 설명 글이 없어야 한다.
import {
  run as advance,
  openChat,
  phaseOf,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const ROUNDS = 3;

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    const p = await openChat(browser, url, {
      config: {
        signal: { hint: true, explainWait: 6 },
        explain: { delayMs: 3000, ok: true },
        // 새 차례의 줄이 천천히 온다(끝 줄까지 2.4초 남짓) — 그동안 앞 차례의 설명이 도착한다
        gapMs: 800,
        replies: [{ kind: "turn", chat: { hint: true } }],
      },
    });
    const opened = await untilChild(p);
    await advance(p, 200 + i * 300);
    await p.locator("[data-dont-know]").click();
    let shown = 0;
    let samples = 0;
    for (let t = 0; t < 8000; t += 100) {
      await advance(p, 100);
      if ((await phaseOf(p)) === "child") break;
      samples += 1;
      shown += await p.locator("[data-tori-explanation]").count();
    }
    const r = await recordOf(p);
    const after = await p.locator("[data-tori-explanation]").count();
    check(
      `되풀이 ${i + 1}`,
      opened &&
        r.explainCalls === 1 &&
        samples > 0 &&
        shown === 0 &&
        after === 0,
      `열림 ${opened} · 설명 호출 ${r.explainCalls} · 새 차례가 흐르는 동안 표본 ${samples} 가운데 설명 보임 ${shown} · 새 아이 차례에 설명 ${after}`,
    );
    await p.context().close();
  }
}

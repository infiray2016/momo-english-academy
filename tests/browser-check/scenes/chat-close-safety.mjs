// W 장면(서버 턴 길 검토 rev-chat-s1 6절 W 1): 안전 상한 차례는 문장 줄 없이 닫는 줄(close, safety) 하나로 오고, 그 끝인사의 이름 자리 {NAME} 도
// 흘린 글 · 소리 줄과 같은 채우기로 채운다 — 말풍선 글 · 뜻 · 읽어 주는 글에 '{NAME}'이 남지 않고 아이 이름(쪽의 Momo)이 든다. 끝인사 뒤에는 '수업
// 목록' 단추만 있고 아이 차례 · 조용함 요청이 없다.
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const ROUNDS = 3;
const SAID = "Thank you for talking with me, Momo. Bye!";

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    const p = await openChat(browser, url, {
      config: { replies: [{ kind: "close-safety" }], gapMs: 100 + i * 200 },
    });
    const opened = await untilChild(p);
    await p.locator("[data-dont-know]").click();
    await advance(p, 5000);
    const shown = await p.locator("[data-talk-panel]").innerText();
    const r = await recordOf(p);
    const closed = await p.locator("[data-talk-closed]").count();
    await advance(p, 30_000);
    const r2 = await recordOf(p);
    check(
      `되풀이 ${i + 1}`,
      opened &&
        shown.includes(SAID) &&
        shown.includes("오늘 고마워, Momo!") &&
        !shown.includes("{NAME}") &&
        r.reads.some((x) => x.text === SAID) &&
        !r.reads.some((x) => x.text.includes("{NAME}")) &&
        closed === 1 &&
        (await p.locator("[data-child-turn]").count()) === 0 &&
        r2.quiet === 0,
      `열림 ${opened} · 글에 이름 ${shown.includes(SAID)} · 자리 남음 ${shown.includes("{NAME}")} · 읽은 글 ${r.reads.map((x) => x.text).slice(-1)} · 닫힘 ${closed} · 조용함 ${r2.quiet}`,
    );
    await p.context().close();
  }
}

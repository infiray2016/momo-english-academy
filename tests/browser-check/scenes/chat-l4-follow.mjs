// 이야기 방식 4단계 장면 (가) 글 속 따라 할 문장(13절 C254 · 분석 task-ana-talk4-ready-report.md 2.3 S7): 따라 할 문장을 글에서 빼 소리 줄로
// 내는 것은 1~3단계뿐이고(정본 02-2 따라 할 문장, core chat-reply chatListenLiteralOf), 4단계는 그 문장이 말풍선 글에 남는다. 쪽의 가짜 서버가
// 그 판단을 core 함수로 내린다(entry.tsx follow). 4단계: 말풍선 글에 따라 할 문장이 그대로 있고 듣기 단추(data-sound-listen)가 없으며, 읽기
// 기록에 그 글이 한 번 읽힌다. 3단계(견줌): 말풍선 글에서 빠지고 듣기 단추가 하나 뜬다.
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const ROUNDS = 2;
const LISTEN = "My friend is a singer.";
const SAY = `Wow, a singer! Say it with me. ${LISTEN}`;

async function talkOnce(p) {
  await p.getByRole("button", { name: "말하기", exact: true }).click();
  await advance(p, 4500);
  const send = p.getByRole("button", { name: "보내기" });
  if ((await send.count()) > 0) await send.first().click();
}

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    for (const level of [4, 3]) {
      const p = await openChat(browser, url, {
        config: {
          level,
          readMs: 600,
          follow: { say: SAY, listen: LISTEN },
          signal: { quietSeconds: 60, hint: true, alternatives: 2 },
        },
      });
      const opened = await untilChild(p);
      await talkOnce(p);
      await advance(p, 8000);
      const back = await untilChild(p, 20_000);
      const r = await recordOf(p);
      const shape = await p.evaluate(() => {
        const bubble = document.querySelector("[data-tori-bubble]");
        return {
          text: (bubble?.textContent ?? "").replace(/\s+/g, " ").trim(),
          buttons: document.querySelectorAll("[data-sound-listen]").length,
        };
      });
      const readSay = r.reads.filter((x) => x.text === SAY).length;
      const readListen = r.reads.filter((x) => x.text === LISTEN).length;
      const ok =
        level === 4
          ? shape.text.includes(SAY) && shape.buttons === 0 && readSay >= 1
          : !shape.text.includes(LISTEN) &&
            shape.buttons === 1 &&
            readListen >= 1;
      check(
        `되풀이 ${i + 1} · ${level}단계`,
        opened && back && ok && r.pageErrors.length === 0,
        `열림 ${opened} · 다시 아이 차례 ${back} · 말풍선 글 "${shape.text.slice(0, 80)}" · 듣기 단추 ${shape.buttons} · 글 읽기 ${readSay} · 소리 줄 읽기 ${readListen} · 쪽 오류 ${r.pageErrors.length}`,
      );
      await p.context().close();
    }
  }
}

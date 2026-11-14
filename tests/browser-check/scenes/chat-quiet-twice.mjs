// W 장면 (11, 검토가 더한 것): 입력 없는 차례 둘이 잇달아 오면 조용함 요청이 두 번 나간다(차례 열쇠가 차례마다 다름 — 앞 열쇠를 다시 쓰면
// 둘째를 말없이 잃는다). 셋째 차례의 끝 줄에는 서버가 기다림 시간을 싣지 않으므로(잇달아 말한 수 상한) 세 번째는 없다. 조용함 차례마다
// 선생님 말풍선이 아이 말풍선 없이 기록에 쌓인다.
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const ROUNDS = 5;

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    const p = await openChat(browser, url, {
      config: {
        readMs: 400 + i * 300,
        // 첫 조용함의 응답은 기다림 시간을 싣고, 둘째의 응답은 싣지 않는다(상한 2)
        replies: [{ kind: "turn" }, { kind: "turn", chat: { hint: true } }],
      },
    });
    const opened = await untilChild(p);
    for (let t = 0; t < 4; t++) {
      await advance(p, 10_000);
      await untilChild(p, 5000);
    }
    await advance(p, 30_000);
    const r = await recordOf(p);
    const dom = await p.evaluate(() => ({
      teacher: document.querySelectorAll("[data-talk-log-teacher]").length,
      child: document.querySelectorAll("[data-talk-log] [data-child-said]")
        .length,
    }));
    check(
      `되풀이 ${i + 1} · 읽기 ${400 + i * 300}ms`,
      opened &&
        r.quiet === 2 &&
        r.childTurns === 0 &&
        dom.teacher === 5 &&
        dom.child === 3 &&
        r.pageErrors.length === 0,
      `열림 ${opened} · 조용함 요청 ${r.quiet} · 아이 요청 ${r.childTurns} · 기록 칸 선생님 ${dom.teacher} · 아이 ${dom.child}`,
    );
    await p.context().close();
  }
}

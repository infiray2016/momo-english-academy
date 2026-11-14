// W 장면 (1): 아이 차례가 열리고 선생님 읽기가 끝난 뒤 입력 없이 기다림 시간(끝 줄의 초 값)이 지나면 조용함 요청이 한 번 나가고, 그 차례에는
// 다시 나가지 않는다. 조용함 차례 뒤 선생님 말풍선은 아이 말풍선 없이 기록에 이어 쌓인다. 기다림 시간을 잠정 8 이 아닌 값(5 · 11)으로도 돌려
// 화면이 값을 지어내지 않는지 본다. 고치기 전 틀(--swap e72c403)에서는 조용함 요청이 0 이어야 한다(그 판정은 같은 장면이 실패로 보인다).
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const ROUNDS = 6;

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    const quietSeconds = [8, 5, 11][i % 3];
    const p = await openChat(browser, url, {
      config: {
        signal: { quietSeconds, hint: true, alternatives: 2 },
        // 둘째 차례부터는 기다림 시간이 없는 끝 줄(한 차례에 한 번만 보는지 — 다음 차례가 다시 보내지 않게)
        replies: [{ kind: "turn", chat: { hint: true } }],
        // 조용함 요청 뒤 첫 줄까지 0.8초(그동안 아이 차례가 닫혀 있는지 본다)
        gapMs: 800,
      },
    });
    const opened = await untilChild(p);
    // 읽기(600ms)가 끝난 뒤부터 잰다: 열린 뒤 기다림 시간 - 1초까지는 없음
    await advance(p, quietSeconds * 1000 - 1000);
    const before = await recordOf(p);
    // 기다림 시간이 지나 조용함 요청이 나간 뒤, 선생님 첫 줄이 오기 전: 아이 차례(말하기 · 힌트 · '잘 모르겠어요')가 닫혀 있다
    let closedWhileWaiting = null;
    for (let t = 0; t < 3000 && closedWhileWaiting === null; t += 50) {
      await advance(p, 50);
      if ((await recordOf(p)).quiet === 1) {
        await advance(p, 300);
        closedWhileWaiting =
          (await p.locator("[data-child-turn]").count()) === 0;
      }
    }
    await advance(p, 1000);
    const after = await recordOf(p);
    await untilChild(p);
    await advance(p, 30_000);
    const end = await recordOf(p);
    const dom = await p.evaluate(() => ({
      teacher: document.querySelectorAll("[data-talk-log-teacher]").length,
      child: document.querySelectorAll("[data-talk-log] [data-child-said]")
        .length,
    }));
    check(
      `되풀이 ${i + 1} · 기다림 ${quietSeconds}초`,
      opened &&
        before.quiet === 0 &&
        after.quiet === 1 &&
        end.quiet === 1 &&
        end.childTurns === 0 &&
        closedWhileWaiting === true &&
        end.pageErrors.length === 0,
      `열림 ${opened} · 앞 ${before.quiet} · 뒤 ${after.quiet} · 끝 ${end.quiet} · 기다리는 동안 아이 차례 닫힘 ${closedWhileWaiting} · 아이 요청 ${end.childTurns} · 쪽 오류 ${end.pageErrors.length}`,
    );
    check(
      `되풀이 ${i + 1} · 아이 말풍선 없이 선생님 말풍선이 쌓임`,
      dom.child === 3 && dom.teacher === 4,
      `기록 칸 선생님 ${dom.teacher} · 아이 ${dom.child}(처음 3 쌍)`,
    );
    await p.context().close();
  }
}

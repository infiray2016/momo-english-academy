// W 장면 (3): 이어진 둘째 막힘(끝 줄의 자리 막힘 수 2)으로 힌트 단이 저절로 열린 차례는 그 열림이 아이의 입력이 아니어서 조용함 타이머가 돈다
// (spec 설계 6 의 예외 · m-4 (라)). 단은 누르지 않아도 응답의 단 목록만큼(셋) 열리고, 기다림 시간 뒤 조용함 요청이 한 번 나간다.
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
        stuck: 2,
        hintDelayMs: 300 + i * 400,
        replies: [{ kind: "turn", chat: { hint: true } }],
      },
    });
    const opened = await untilChild(p);
    await advance(p, 5000);
    const tiers = await p.locator("[data-hint-state=text]").count();
    const hintsBefore = (await recordOf(p)).hintCalls.length;
    await advance(p, 10_000);
    const r = await recordOf(p);
    check(
      `되풀이 ${i + 1} · 힌트 늦음 ${300 + i * 400}ms`,
      opened &&
        tiers === 3 &&
        hintsBefore === 3 &&
        r.quiet === 1 &&
        r.pageErrors.length === 0,
      `열림 ${opened} · 글이 보인 단 ${tiers} · 힌트 호출 ${hintsBefore} · 조용함 요청 ${r.quiet}`,
    );
    await p.context().close();
  }
}

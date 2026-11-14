// W 장면 (5): 쪽이 가려지면 그 차례의 조용함 타이머를 거두고 돌아와도 다시 재지 않는다. 두 꼴: 아이 차례 중에 가려졌다 돌아옴 · 가려진 채로
// 차례가 열림(열림 때 곧바로 가림). 문서의 visibilityState 를 바꾸고 visibilitychange 를 보낸다(두 브라우저 모두 머리 없는 실행이라 실제 탭
// 전환을 흉내 냄).
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

function setHidden(p, hidden) {
  return p.evaluate((h) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => (h ? "hidden" : "visible"),
    });
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => h,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, hidden);
}

const ROUNDS = 4;

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    for (const form of ["차례 중 가림", "가려진 채 열림"]) {
      const p = await openChat(browser, url, {
        config: { replies: [{ kind: "turn", chat: { hint: true } }] },
        ...(form === "가려진 채 열림"
          ? { before: (pg) => setHidden(pg, true) }
          : {}),
      });
      const opened = await untilChild(p);
      if (form === "차례 중 가림") {
        await advance(p, 1500 + i * 1500);
        await setHidden(p, true);
        await advance(p, 3000);
      }
      await setHidden(p, false);
      await advance(p, 60_000);
      const r = await recordOf(p);
      check(
        `되풀이 ${i + 1} · ${form}`,
        opened && r.quiet === 0 && r.pageErrors.length === 0,
        `열림 ${opened} · 조용함 요청 ${r.quiet}`,
      );
      await p.context().close();
    }
  }
}

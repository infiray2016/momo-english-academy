// W 장면 (7): 힌트 단. (가) 누르면 그 단 자리에 점 셋 → 글, 끝까지 누르면 그린 단 수 = 응답의 단 수(셋 · 둘), 다음 턴 요청의 연 단 수 = 글이 보인
// 단 수. (나) 받지 못하면 '힌트를 못 가져왔어요' 한 줄과(다시 받기가 남았을 때만) '다시 받기' 단추(56 × 56px 이상)가 그 단 안에 있고, 누르면
// 다시 받는다. (다) 다시 받기 상한 뒤에는 단추 없이 한 줄만. (라) 'AI 쉬는 중'(서버가 다시 받기 없음으로 답함)이면 단추 없이 한 줄만, 실패한
// 단은 연 단으로 세지 않는다.
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const ROUNDS = 3;
const NEXT = [{ kind: "turn", chat: { hint: true } }];

async function pressHint(p) {
  await p.locator("[data-hint-button]").click();
}

async function dontKnowOpened(p) {
  await p.locator("[data-dont-know]").click();
  await advance(p, 300);
  const r = await recordOf(p);
  const sent = r.requests.find((b) => b.input !== undefined);
  return sent?.hint?.opened;
}

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    for (const tiers of [3, 2]) {
      const p = await openChat(browser, url, {
        config: { hintTiers: tiers, hintDelayMs: 1200, replies: NEXT },
      });
      const opened = await untilChild(p);
      await pressHint(p);
      await advance(p, 300);
      const dots = await p
        .locator("[data-hint-state=loading] [data-hint-loading]")
        .count();
      await advance(p, 1500);
      let drawn = await p.locator("[data-hint-state=text]").count();
      for (let n = 0; n < 5; n++) {
        const button = p.locator("[data-hint-button]");
        if (!(await button.isEnabled())) break;
        await button.click();
        await advance(p, 1500);
      }
      drawn = await p.locator("[data-hint-state=text]").count();
      const slots = await p.locator("[data-hint-tier]").count();
      const named = await p.getByText("I like ducks, Momo.").count();
      const sentOpened = await dontKnowOpened(p);
      check(
        `되풀이 ${i + 1} · 단 ${tiers}`,
        opened &&
          dots === 1 &&
          drawn === tiers &&
          slots === tiers &&
          named === 1 &&
          sentOpened === tiers,
        `열림 ${opened} · 점 셋 ${dots} · 글 단 ${drawn} · 단 자리 ${slots} · 이름 채움 ${named} · 보낸 연 단 수 ${sentOpened}`,
      );
      await p.context().close();
    }
    // (나) 실패 → 다시 받기 → 글
    {
      const p = await openChat(browser, url, {
        config: {
          hintDelayMs: 800,
          hints: [{ delayMs: 800, reply: { ok: false, retry: true } }],
          replies: NEXT,
        },
      });
      const opened = await untilChild(p);
      await pressHint(p);
      await advance(p, 1200);
      const failLine = await p.getByText("힌트를 못 가져왔어요").count();
      const retry = p.locator("[data-hint-retry]");
      const size = (await retry.count()) > 0 ? await retry.boundingBox() : null;
      const hintDisabled = !(await p.locator("[data-hint-button]").isEnabled());
      if (size) await retry.click();
      await advance(p, 300);
      const loading = await p.locator("[data-hint-state=loading]").count();
      await advance(p, 1200);
      const text = await p.locator("[data-hint-state=text]").count();
      const r = await recordOf(p);
      check(
        `되풀이 ${i + 1} · 실패 뒤 다시 받기`,
        opened &&
          failLine === 1 &&
          size !== null &&
          size.width >= 56 &&
          size.height >= 56 &&
          hintDisabled &&
          loading === 1 &&
          text === 1 &&
          r.hintCalls.length === 2 &&
          r.hintCalls[1].retry === 1,
        `열림 ${opened} · 실패 줄 ${failLine} · 다시 받기 ${size ? `${Math.round(size.width)}×${Math.round(size.height)}` : "없음"} · 힌트 단추 막힘 ${hintDisabled} · 받는 중 ${loading} · 글 ${text} · 호출 ${r.hintCalls.map((h) => h.retry ?? 0).join("/")}`,
      );
      await p.context().close();
    }
    // (다) 다시 받기 상한 · (라) 'AI 쉬는 중'(첫 응답부터 다시 받기 없음)
    for (const form of ["상한 뒤", "AI 쉬는 중"]) {
      const hints =
        form === "상한 뒤"
          ? [
              { delayMs: 500, reply: { ok: false, retry: true } },
              { delayMs: 500, reply: { ok: false, retry: false } },
            ]
          : [{ delayMs: 500, reply: { ok: false, retry: false } }];
      const p = await openChat(browser, url, {
        config: { hints, replies: NEXT },
      });
      const opened = await untilChild(p);
      await pressHint(p);
      await advance(p, 800);
      if (form === "상한 뒤") {
        await p.locator("[data-hint-retry]").click();
        await advance(p, 800);
      }
      const failLine = await p.getByText("힌트를 못 가져왔어요").count();
      const retry = await p.locator("[data-hint-retry]").count();
      const sentOpened = await dontKnowOpened(p);
      check(
        `되풀이 ${i + 1} · ${form}`,
        opened && failLine === 1 && retry === 0 && sentOpened === 0,
        `열림 ${opened} · 실패 줄 ${failLine} · 다시 받기 단추 ${retry} · 보낸 연 단 수 ${sentOpened}`,
      );
      await p.context().close();
    }
  }
}

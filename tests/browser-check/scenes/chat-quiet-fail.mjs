// W 장면(검토가 찾은 자리 — 조용함 요청이 실패한 뒤). (가) 선생님 줄을 하나도 받기 전에 거절(stale — 상한 등) · 오류로 끝나면 아이 차례가 다시
// 열리고('인터넷이 끊겼어요' 줄 없음), 열림을 다시 넣지 않아 조용함 요청이 다시 나가지 않으며, 다시 열린 차례에서 말하면 보통 턴 요청이 나간다.
// (나) 연결 끊김은 조용함 요청을 다시 보내지 않고 이어 하기로 받는다(조용함 요청은 시도 id 가 없어 서버가 새 차례로 받음 — 서버 턴 길 검토
// rev-chat-s1 6절 W 2): 화면 자료를 다시 읽어 서버가 받지 않았으면 차례를 다시 열고, 서버가 그 차례를 끝냈거나(선생님 행 저장 · 줄을 받다 끊김)
// 끊긴 조용함 행이 남았으면 판을 다시 읽는다(router.refresh — 실제 쪽에서는 틀이 새로 그려져 이어 하기 길로 연다). (다) 'AI 쉬는 중'(쉼 줄)이면 쉬는
// 안내로 가고 조용함 요청을 다시 보내지 않는다.
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

/** 들음(audiostart 가 판정 문턱 안 — 버림이면 죽은 버림(결과는 버림이 버림), 진짜면 결과). 스스로 끝나지 않고 끝 조용함 · 층이 멈춘다. */
const HEARD = {
  events: [
    { at: 50, type: "start" },
    { at: 80, type: "audiostart" },
    { at: 300, type: "soundstart" },
    { at: 400, type: "speechstart" },
    {
      at: 900,
      type: "result",
      results: [{ transcript: "I like it", isFinal: true }],
    },
    { at: 950, type: "speechend" },
  ],
};

const KINDS = [
  { name: "거절(stale)", reply: { kind: "stale" }, expect: "reopen" },
  { name: "오류 줄", reply: { kind: "error" }, expect: "reopen" },
  {
    name: "끊김 · 서버가 받지 않음",
    reply: { kind: "offline" },
    expect: "reopen",
    loads: true,
  },
  {
    name: "끊김 · 서버가 차례를 저장",
    reply: { kind: "offline", saved: true },
    expect: "refresh",
  },
  {
    name: "끊김 · 끊긴 조용함 행",
    reply: { kind: "offline", orphan: true },
    expect: "refresh",
  },
  { name: "줄을 받다 끊김", reply: { kind: "cut" }, expect: "refresh" },
  { name: "AI 쉬는 중", reply: { kind: "resting" }, expect: "rest" },
];
const ROUNDS = 3;

/** 다시 열린 차례에서 조용함이 연 버림 세션이 층의 안전 상한(듣기 상한 + 감시 여유)에 닫힐 때까지의 여유(ms, 점검 값 — 실측 18초). */
const CAP_SLACK_MS = 40_000;

/**
 * 버리는 듣기를 켠 기기(rev-chat-w M-2 · 재검토 N-1): 아이가 한 번 말한 뒤의 차례에서 조용함 → 거절(stale) → 다시 열린 차례에서 누르지 않고 기다린다.
 * 조용함이 연 버림 세션은 서버 기다림이 내려가야 층의 안전 상한에 닫힌다(서버 기다림 중에는 상한을 세지 않음 — discard.ts !serverWaiting).
 * 내리지 않으면 마이크가 열린 채 남는다. 다시 열린 차례에서 말하면 아이 말 요청이 나간다.
 */
async function discardBranch(browser, url, check, round) {
  const p = await openChat(browser, url, {
    config: {
      discard: "all",
      readMs: 800,
      recognitions: [HEARD],
      signal: { hint: true },
      replies: [
        { kind: "turn", chat: { quietSeconds: 4, hint: true } },
        { kind: "stale" },
        { kind: "turn", chat: { hint: true } },
      ],
      gapMs: 100 + round * 300,
    },
  });
  const opened = await untilChild(p);
  await p.getByRole("button", { name: "말하기", exact: true }).click();
  await advance(p, 6500);
  const send = p.getByRole("button", { name: "보내기" });
  if ((await send.count()) > 0) await send.first().click();
  const samples = [];
  for (let t = 0; t < 90_000; t += 1000) {
    await advance(p, 1000);
    samples.push(
      await p.evaluate(() => ({
        at: performance.now(),
        live: window.__chat.liveSessions,
        quiet: window.__chat.requests.filter((r) => r.body.lead === "quiet")
          .length,
      })),
    );
  }
  const quietAt = (await recordOf(p)).quietAt[0] ?? null;
  const after = quietAt === null ? [] : samples.filter((s) => s.at > quietAt);
  const heldOpen = after.some((s) => s.live >= 1);
  const closedBy = after.find(
    (s, i) => i > 0 && s.live === 0 && after[i - 1].live >= 1,
  );
  const closedAt = closedBy ? Math.round(closedBy.at - quietAt) : null;
  const stayClosed =
    closedBy !== undefined &&
    after.filter((s) => s.at >= closedBy.at).every((s) => s.live === 0);
  const reopened = await p.locator("[data-child-turn]").count();
  const speak = p.getByRole("button", { name: "말하기", exact: true });
  const canSpeak = (await speak.count()) > 0 && (await speak.isEnabled());
  if (canSpeak) {
    await speak.click();
    await advance(p, 9000);
    const again = p.getByRole("button", { name: "보내기" });
    if ((await again.count()) > 0) await again.first().click();
    await advance(p, 1000);
  }
  const r = await recordOf(p);
  check(
    `되풀이 ${round + 1} · 거절(stale) · 버리는 듣기 켬(아이가 한 번 말한 뒤)`,
    opened &&
      r.quiet === 1 &&
      heldOpen &&
      closedAt !== null &&
      closedAt <= CAP_SLACK_MS &&
      stayClosed &&
      reopened === 1 &&
      canSpeak &&
      r.childTurns === 2,
    `열림 ${opened} · 조용함 ${r.quiet} · 조용함 뒤 열린 세션 ${heldOpen} · 닫힘 ${closedAt === null ? "없음(열린 채)" : `${closedAt}ms`} · 다시 열림 ${reopened} · 말하기 ${canSpeak} · 아이 요청 ${r.childTurns}`,
  );
  await p.context().close();
}

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) await discardBranch(browser, url, check, i);
  for (let i = 0; i < ROUNDS; i++) {
    for (const kind of KINDS) {
      const p = await openChat(browser, url, {
        config: {
          replies: [kind.reply],
          gapMs: 100 + i * 300,
        },
      });
      const opened = await untilChild(p);
      await advance(p, 12_000);
      const r1 = await recordOf(p);
      const loads = await p.evaluate(
        () =>
          window.__chat.actions.filter((a) => a.name === "loadTalkLessonView")
            .length,
      );
      const trouble = await p.getByText("인터넷이 끊겼어요").count();
      if (kind.expect === "rest") {
        const rest = await p.locator("[data-talk-rest]").count();
        await advance(p, 60_000);
        const r2 = await recordOf(p);
        check(
          `되풀이 ${i + 1} · ${kind.name}`,
          opened && r1.quiet === 1 && rest === 1 && r2.quiet === 1,
          `열림 ${opened} · 조용함 ${r1.quiet} → ${r2.quiet} · 쉬는 안내 ${rest}`,
        );
        await p.context().close();
        continue;
      }
      if (kind.expect === "refresh") {
        await advance(p, 60_000);
        const r2 = await recordOf(p);
        check(
          `되풀이 ${i + 1} · ${kind.name}`,
          opened &&
            r1.quiet === 1 &&
            loads === 1 &&
            r1.router.refresh === 1 &&
            trouble === 0 &&
            r2.quiet === 1 &&
            r2.requests.length === 1,
          `열림 ${opened} · 조용함 ${r1.quiet} → ${r2.quiet} · 자료 다시 읽음 ${loads} · 판 다시 읽음 ${r1.router.refresh} · 끊김 줄 ${trouble} · 턴 요청 ${r2.requests.length}`,
        );
        await p.context().close();
        continue;
      }
      const reopened = await p.locator("[data-child-turn]").count();
      await advance(p, 60_000);
      const r2 = await recordOf(p);
      const speak = p.getByRole("button", { name: "말하기", exact: true });
      const canSpeak = (await speak.count()) > 0 && (await speak.isEnabled());
      const startsBefore = await p.evaluate(
        () =>
          window.__fakeSpeech.calls.filter((c) => c.method === "start").length,
      );
      if (canSpeak) {
        await speak.click();
        // 버리는 듣기는 간격을 지킨 뒤 진짜를 연다
        await advance(p, 4500);
        const send = p.getByRole("button", { name: "보내기" });
        if ((await send.count()) > 0) await send.first().click();
        await advance(p, 1000);
      }
      const r3 = await recordOf(p);
      const startsAfter = await p.evaluate(
        () =>
          window.__fakeSpeech.calls.filter((c) => c.method === "start").length,
      );
      check(
        `되풀이 ${i + 1} · ${kind.name}`,
        opened &&
          r1.quiet === 1 &&
          reopened === 1 &&
          trouble === 0 &&
          r1.router.refresh === 0 &&
          (kind.loads ? loads === 1 : loads === 0) &&
          r2.quiet === 1 &&
          canSpeak &&
          startsAfter > startsBefore &&
          r3.childTurns === 1,
        `열림 ${opened} · 조용함 ${r1.quiet} → ${r2.quiet} · 다시 열림 ${reopened} · 자료 다시 읽음 ${loads} · 판 다시 읽음 ${r1.router.refresh} · 끊김 줄 ${trouble} · 말하기 ${canSpeak} · 인식 start ${startsBefore} → ${startsAfter} · 아이 요청 ${r3.childTurns}`,
      );
      await p.context().close();
    }
  }
}

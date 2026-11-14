// W 장면 (4): 설명 기다림 칸이 있는 차례(끝 줄 explainWait — 값은 상한의 초)는 읽기 끝과 '설명이 보인 때 · 설명 호출이 실패로 끝난 때 · 상한'
// 가운데 이른 때 가운데 늦은 때부터 잰다. 세 갈래(설명 보임 3초 · 실패 2.5초 · 20초 뒤에야 옴 → 상한 6초)마다 조용함 요청의 시각이 설명 요청
// 시각(아이 차례가 열린 때와 같은 걸음) + 기대 시작 + 기다림 시간과 맞는지 본다. 설명이 보인 갈래는 말풍선 아래 늦은 글이 붙는다.
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const QUIET = 8;
const CAP = 6;
const CASES = [
  {
    name: "설명 보임",
    explain: { delayMs: 3000, ok: true },
    start: 3000,
    shown: true,
  },
  {
    name: "설명 실패",
    explain: { delayMs: 2500, ok: false },
    start: 2500,
    shown: false,
  },
  {
    name: "상한",
    explain: { delayMs: 20_000, ok: true },
    start: CAP * 1000,
    shown: false,
  },
];
const ROUNDS = 3;
/** 시각 판정의 여유(ms): 시계 걸음(50ms) · 흘림 줄 사이와 효과의 차례. */
const SLACK = 400;

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    for (const c of CASES) {
      const p = await openChat(browser, url, {
        config: {
          signal: {
            quietSeconds: QUIET,
            hint: true,
            explainWait: CAP,
            alternatives: 2,
          },
          explain: c.explain,
          readMs: 600,
          replies: [{ kind: "turn", chat: { hint: true } }],
        },
      });
      const opened = await untilChild(p);
      await advance(p, 4000);
      const shown = await p.locator("[data-tori-explanation]").count();
      await advance(p, 16_000);
      const r = await recordOf(p);
      const openAt = await p.evaluate(
        () => window.__chat.explainCalls[0]?.at ?? null,
      );
      const expected = openAt === null ? null : openAt + c.start + QUIET * 1000;
      const quietAt = r.quietAt[0] ?? null;
      const onTime =
        expected !== null &&
        quietAt !== null &&
        Math.abs(quietAt - expected) <= SLACK;
      check(
        `되풀이 ${i + 1} · ${c.name}`,
        opened &&
          r.explainCalls === 1 &&
          r.quiet === 1 &&
          onTime &&
          shown > 0 === c.shown &&
          r.pageErrors.length === 0,
        `열림 ${opened} · 설명 호출 ${r.explainCalls} · 설명 보임 ${shown > 0} · 조용함 ${r.quiet} · 기대 ${expected === null ? "-" : Math.round(expected)} · 실제 ${quietAt === null ? "-" : Math.round(quietAt)}`,
      );
      await p.context().close();
    }
  }
}

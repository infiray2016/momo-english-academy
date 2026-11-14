// W 장면 (9): 끝 줄에 후보 수가 있는 차례에만 인식 객체의 maxAlternatives 가 그 값(2)이고 턴 요청에 인식기 칸이 실린다. 후보 수가 없는 차례 ·
// 기존 두 방식(mode old)은 1 이고 인식기 칸이 없다. '다시 말하기' 뒤 듣기도 같은 값이다. 기존 방식은 그 밖에도 아무것도 켜지지 않는다(조용함 요청 ·
// 힌트 호출 · 설명 호출 0, 힌트 단추 없음).
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const ROUNDS = 3;
const HEARD = {
  events: [
    { at: 50, type: "start" },
    { at: 80, type: "audiostart" },
    { at: 300, type: "soundstart" },
    { at: 400, type: "speechstart" },
    {
      at: 900,
      type: "result",
      results: [{ transcript: "blue whale", isFinal: true }],
    },
    { at: 950, type: "speechend" },
  ],
};

async function talkOnce(p) {
  await p.getByRole("button", { name: "말하기", exact: true }).click();
  // 끝 조용함(대화 1~3단계 3초)이 지나 듣기가 끝나고, 인식 확인(2초)이 떠 있는 때
  await advance(p, 4500);
  // 인식 확인이 뜨면 '다시 말하기'로 한 번 더 듣고 그다음 보낸다
  let again = false;
  const retry = p.getByRole("button", { name: "다시 말하기" });
  if ((await retry.count()) > 0) {
    again = true;
    await retry.first().click();
    await advance(p, 4500);
  }
  const send = p.getByRole("button", { name: "보내기" });
  if ((await send.count()) > 0) await send.first().click();
  await advance(p, 6000);
  return again;
}

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    const p = await openChat(browser, url, {
      config: {
        recognitions: [HEARD],
        signal: { quietSeconds: 8, hint: true, alternatives: 2 },
        // 다음 차례는 후보 수가 없는 끝 줄
        replies: [
          { kind: "turn", chat: { hint: true } },
          { kind: "turn", chat: { hint: true } },
        ],
      },
    });
    const opened = await untilChild(p);
    const again = await talkOnce(p);
    const first = await recordOf(p);
    await untilChild(p);
    await talkOnce(p);
    const r = await recordOf(p);
    const sent = r.requests.filter((b) => b.input !== undefined);
    const firstAlts = first.maxAlts;
    const laterAlts = r.maxAlts.slice(firstAlts.length);
    const shown = await p.locator("body").innerText();
    check(
      `되풀이 ${i + 1} · 이야기 방식`,
      opened &&
        firstAlts.length >= 1 &&
        firstAlts.every((n) => n === 2) &&
        laterAlts.length >= 1 &&
        laterAlts.every((n) => n === 1) &&
        sent.length === 2 &&
        sent[0].recognizer !== undefined &&
        sent[1].recognizer === undefined &&
        !shown.includes("blue wail"),
      `열림 ${opened} · 다시 말하기 ${again} · 첫 차례 ${firstAlts.join("/")} · 다음 차례 ${laterAlts.join("/")} · 인식기 칸 ${sent.map((b) => (b.recognizer ? JSON.stringify(b.recognizer) : "없음")).join(" | ")}`,
    );
    await p.context().close();

    const o = await openChat(browser, url, {
      query: "mode=old",
      config: { recognitions: [HEARD] },
    });
    const openedOld = await untilChild(o);
    const hintButton = await o.locator("[data-hint-button]").count();
    await talkOnce(o);
    await untilChild(o);
    await advance(o, 60_000);
    const ro = await recordOf(o);
    const sentOld = ro.requests.filter((b) => b.input !== undefined);
    check(
      `되풀이 ${i + 1} · 기존 방식(신호 칸 없음)`,
      openedOld &&
        hintButton === 0 &&
        ro.maxAlts.length >= 1 &&
        ro.maxAlts.every((n) => n === 1) &&
        sentOld.every((b) => b.recognizer === undefined) &&
        ro.quiet === 0 &&
        ro.hintCalls.length === 0 &&
        ro.explainCalls === 0 &&
        ro.pageErrors.length === 0,
      `열림 ${openedOld} · 힌트 단추 ${hintButton} · maxAlternatives ${ro.maxAlts.join("/")} · 조용함 ${ro.quiet} · 힌트 호출 ${ro.hintCalls.length} · 설명 호출 ${ro.explainCalls}`,
    );
    await o.context().close();
  }
}

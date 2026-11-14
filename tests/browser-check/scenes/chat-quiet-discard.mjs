// W 장면 (6): 버리는 듣기를 켠 기기(speech.discard_mode all — 시험용)에서 조용함 입구. 아이가 한 번 말한 뒤(진짜 → 선생님 말은 죽은 버림 안에서
// 읽힘) 다음 아이 차례의 조용함 타이머가 기계의 여러 자리(열린 죽은 버림 · 닫는 중 · 간격 · 대기)에 걸리도록 기다림 시간을 0.1 · 0.6 · 1.5 · 4초로
// 바꿔 가며, 조용함 요청 뒤 층이 버림을 다시 열어(인식 start) 선생님 말을 인식 세션이 열린 동안 읽는지 — 세션 없이 읽는 일이 없는지 — 본다.
// 기계의 자리는 층 밖에서 보이지 않아 기다림 시간으로만 가른다(자리마다 걸렸는지는 이 장면이 확인하지 않음 — 보고에 적음). 열린 죽은 버림에서
// 받은 조용함은 새 버림을 열지 않고 그 버림 안에서 읽으므로(spec 설계 6), '버림 다시 엶'은 판정에 넣지 않고 값만 적는다.
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

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
/** 버림: audiostart 가 판정 문턱(250ms) 안에 옴 — 죽은 버림. 스스로 끝나지 않고 층이 멈춘다. */
const DISCARD = {
  events: [
    { at: 10, type: "start" },
    { at: 40, type: "audiostart" },
  ],
};
const QUIETS = [0.1, 0.6, 1.5, 4];
const ROUNDS = 2;

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    for (const quietSeconds of QUIETS) {
      const p = await openChat(browser, url, {
        config: {
          discard: "all",
          readMs: 800,
          recognitions: [HEARD, DISCARD],
          // 첫 차례(아이가 말함)는 기다림 시간 없이, 아이가 말한 뒤의 차례에 기다림 시간, 조용함 뒤 차례는 없음
          signal: { hint: true },
          replies: [
            { kind: "turn", chat: { quietSeconds, hint: true } },
            { kind: "turn", chat: { hint: true } },
          ],
        },
      });
      const opened = await untilChild(p);
      await p.getByRole("button", { name: "말하기", exact: true }).click();
      await advance(p, 6500);
      const send = p.getByRole("button", { name: "보내기" });
      if ((await send.count()) > 0) await send.first().click();
      // 선생님 차례(버림 안 읽기) → 아이 차례 → 조용함 → 다음 선생님 차례
      await advance(p, 30_000);
      const r = await recordOf(p);
      const quietAt = r.quietAt[0] ?? null;
      const after =
        quietAt === null ? [] : r.reads.filter((x) => x.at >= quietAt);
      const starts = await p.evaluate(() =>
        window.__fakeSpeech.calls
          .filter((c) => c.method === "start")
          .map((c) => c.at),
      );
      const firstRead = after[0]?.at ?? null;
      const reopened =
        quietAt !== null &&
        firstRead !== null &&
        starts.some((t) => t >= quietAt && t <= firstRead);
      check(
        `되풀이 ${i + 1} · 기다림 ${quietSeconds}초`,
        opened &&
          r.quiet === 1 &&
          after.length >= 1 &&
          after.every((x) => x.live >= 1) &&
          r.pageErrors.length === 0,
        `열림 ${opened} · 조용함 ${r.quiet} · 조용함 뒤 읽기 ${after.map((x) => `${x.text}(세션 ${x.live})`).join(" / ") || "없음"} · 버림 다시 엶 ${reopened}`,
      );
      await p.context().close();
    }
  }
}

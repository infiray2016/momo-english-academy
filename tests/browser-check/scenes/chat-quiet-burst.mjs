// W 장면(코드 검토 rev-chat-w I-2): 선생님 줄과 끝 줄이 한 덩이로 오면(서버의 다시 흘림 replayChat · 잡아 둔 줄과 끝 줄이 망에서 붙은 꼴) 처리기가
// 한 번에 돌아, 끝 줄을 받은 때에는 읽기 줄에 막 넣은 문장이 아직 그려지지 않았다. 그때도 조용함 타이머는 선생님 말의 마지막 읽기 끝부터 재야
// 한다 — 읽는 동안에는 조용함 요청이 나가지 않고, 요청 시각은 마지막 읽기 끝 + 기다림 시간 뒤다. 두 꼴: (가) 막힌 뒤 차례('잘 모르겠어요' 뒤
// 응답이 한 덩이) (나) 조용함 뒤 차례(조용함 요청의 응답이 한 덩이 — 둘째 조용함이 읽기 끝 뒤에만).
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

/** 읽기 한 번(ms). 읽어 주기 감시의 끝 상한(글 길이 / (speak_chars_per_second × 빠르기) + 여유 — 이 문장들은 8초 남짓)보다 짧게 두어 읽기 끝이 실제 끝이다. */
const READ_MS = 7500;
const QUIET = 5;
const ROUNDS = 3;
const SLACK = 400;

/** 조용함 요청 시각마다: 그 앞의 읽기가 모두 끝났는가 · 마지막 읽기 끝 + 기다림 시간 뒤인가. */
function judge(r) {
  return r.quietAt.map((at) => {
    const before = r.reads.filter((x) => x.at < at);
    const lastEnd = Math.max(...before.map((x) => x.at + READ_MS));
    return {
      at: Math.round(at),
      lastEnd: Math.round(lastEnd),
      ok: at >= lastEnd + QUIET * 1000 - SLACK,
    };
  });
}

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    for (const form of ["막힌 뒤 차례", "조용함 뒤 차례"]) {
      const quietSignal = { quietSeconds: QUIET, hint: true };
      const p = await openChat(browser, url, {
        config: {
          readMs: READ_MS,
          signal: form === "막힌 뒤 차례" ? { hint: true } : quietSignal,
          replies: [
            { kind: "turn", burst: true, chat: quietSignal },
            { kind: "turn", chat: { hint: true } },
          ],
          gapMs: 100 + i * 200,
        },
      });
      const opened = await untilChild(p);
      if (form === "막힌 뒤 차례") {
        // 첫 말풍선의 읽기가 끝난 뒤에 누른다(읽는 중에 누르면 누른 그림의 읽기 표지가 참으로 남아, 처리기가 그 값을 읽는 판의 결함이 가려짐 —
        // 재검토 rev-chat-w-2). 첫 차례의 끝 줄에는 기다림 시간이 없어 그동안 조용함 요청은 나가지 않는다
        await advance(p, READ_MS + 1000);
        await p.locator("[data-dont-know]").click();
      }
      await advance(p, 60_000);
      const r = await recordOf(p);
      const seen = judge(r);
      const want = form === "막힌 뒤 차례" ? 1 : 2;
      check(
        `되풀이 ${i + 1} · ${form}`,
        opened && r.quiet === want && seen.every((s) => s.ok),
        `열림 ${opened} · 조용함 ${r.quiet}(기대 ${want}) · ${JSON.stringify(seen)} · 읽기 ${JSON.stringify(r.reads.map((x) => [x.text.slice(0, 12), Math.round(x.at)]))}`,
      );
      await p.context().close();
    }
  }
}

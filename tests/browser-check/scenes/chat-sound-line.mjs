// W 장면 (8): 소리 줄(1~3단계 따라 할 문장) 듣기 단추. (가) 누르지 않으면 소리 줄까지 다 읽은 뒤부터 잰다 — 조용함 요청은 마지막 읽기(소리 줄)의
// 끝 + 기다림 시간에 나간다(그보다 이르지 않음). (나) 소리 줄 듣기 단추(56 × 56px 이상)를 누르면 그 줄을 다시 읽고 그 차례에는 조용함 요청이
// 없다(입력 sound_line).
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const ROUNDS = 4;
const READ_MS = 900;
const QUIET = 8;
const SLACK = 400;

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    for (const form of ["누르지 않음", "누름"]) {
      const p = await openChat(browser, url, {
        config: {
          sound: "I like ducks.",
          readMs: READ_MS,
          signal: { quietSeconds: QUIET, hint: true, alternatives: 2 },
          replies: [{ kind: "turn", chat: { hint: true } }],
        },
      });
      const opened = await untilChild(p);
      const button = p.locator("[data-sound-listen]").first();
      const box =
        (await button.count()) > 0 ? await button.boundingBox() : null;
      if (form === "누름") {
        await advance(p, 2500 + i * 500);
        await button.click();
      }
      await advance(p, 30_000);
      const r = await recordOf(p);
      const soundReads = r.reads.filter((x) => x.text === "I like ducks.");
      if (form === "누르지 않음") {
        // 첫 차례(조용함 요청 전)의 마지막 읽기 끝
        const quietAt = r.quietAt[0] ?? null;
        const before = r.reads.filter(
          (x) => quietAt === null || x.at < quietAt,
        );
        const lastEnd =
          before.length > 0 ? (before.at(-1)?.at ?? 0) + READ_MS : null;
        const onTime =
          quietAt !== null &&
          lastEnd !== null &&
          quietAt >= lastEnd + QUIET * 1000 - SLACK &&
          quietAt <= lastEnd + QUIET * 1000 + SLACK;
        check(
          `되풀이 ${i + 1} · ${form}`,
          opened &&
            box !== null &&
            box.width >= 56 &&
            box.height >= 56 &&
            soundReads.length >= 1 &&
            before.at(-1)?.text === "I like ducks." &&
            r.quiet === 1 &&
            onTime,
          `열림 ${opened} · 단추 ${box ? `${Math.round(box.width)}×${Math.round(box.height)}` : "없음"} · 마지막 읽기 ${before.at(-1)?.text ?? "-"} · 읽기 끝 ${lastEnd === null ? "-" : Math.round(lastEnd)} · 조용함 ${quietAt === null ? "-" : Math.round(quietAt)}`,
        );
      } else {
        check(
          `되풀이 ${i + 1} · ${form}`,
          opened && soundReads.length >= 2 && r.quiet === 0,
          `열림 ${opened} · 소리 줄 읽기 ${soundReads.length} · 조용함 요청 ${r.quiet}`,
        );
      }
      await p.context().close();
    }
  }
}

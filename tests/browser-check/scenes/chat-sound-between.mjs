// L2 장면(13절 C241 보완 7): 두 새 방식의 1~3단계 소리 줄(따라 할 문장)은 서버가 선생님 말 칸의 제자리에서 내보낸다 — 뺀 자리 앞 글 줄 → 소리 줄 →
// 뒤 글 줄. 화면 조각은 그대로라 (가) 듣기 단추는 말풍선 아래 줄(data-tori-under)에 하나로 뜨고 말풍선 글은 글 줄만이며, (나) 읽기 기록이 받은
// 차례 그대로 s → sound → s 이고, (다) 말풍선을 누르면 같은 차례로 다시 읽는지 본다. 쪽의 가짜 서버는 소리 줄을 글 뒤에 두므로, 아이 차례의
// 응답만 이 장면이 줄 차례를 바꿔 흘린다(끝 줄 · 뜻 줄은 쪽의 것 그대로). 이야기 방식(mode chat)과 기존 방식 쪽 틀(mode old) 둘 다 본다.
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const ROUNDS = 3;
const SOUND = "I play soccer.";
const TEXT = ["Soccer is fun!", "Say:", "What else do you do?"];
const ORDER = [TEXT[0], TEXT[1], SOUND, TEXT[2]];

/** 아이 차례 응답의 줄 차례를 s → s → sound → s 로 바꿔 흘리는 fetch 덮개(쪽을 연 뒤 · '시작!' 전에 건다). */
async function placeSoundBetween(p) {
  await p.evaluate(
    ({ text, sound }) => {
      const orig = window.fetch;
      window.fetch = async (u, init) => {
        const res = await orig(u, init);
        const body = JSON.parse(init?.body ?? "{}");
        if (body.input === undefined) return res;
        const lines = (await res.text())
          .split("\n")
          .filter((l) => l.trim() !== "")
          .map((l) => JSON.parse(l));
        const ko = lines.find((l) => l.t === "ko");
        const end = lines.find((l) => l.t === "end");
        const out = [
          { t: "s", en: text[0] },
          { t: "s", en: text[1] },
          { t: "sound", kind: "model", say: sound },
          { t: "s", en: text[2] },
          ...(ko ? [ko] : []),
          ...(end ? [end] : []),
        ];
        const encoder = new TextEncoder();
        let i = 0;
        const stream = new ReadableStream({
          async pull(controller) {
            await new Promise((r) => setTimeout(r, 100));
            if (i >= out.length) {
              controller.close();
              return;
            }
            controller.enqueue(encoder.encode(`${JSON.stringify(out[i])}\n`));
            i += 1;
          },
        });
        return new Response(stream);
      };
    },
    { text: TEXT, sound: SOUND },
  );
}

async function talkOnce(p) {
  await p.getByRole("button", { name: "말하기", exact: true }).click();
  await advance(p, 4500);
  const send = p.getByRole("button", { name: "보내기" });
  if ((await send.count()) > 0) await send.first().click();
}

/** 읽기 기록에서 이 장면의 네 줄만 차례대로. */
const orderOf = (reads) =>
  reads.map((r) => r.text).filter((t) => ORDER.includes(t));

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    for (const mode of ["chat", "old"]) {
      const p = await openChat(browser, url, {
        query: `mode=${mode}`,
        config: {
          readMs: 600,
          signal: { quietSeconds: 60, hint: true, alternatives: 2 },
        },
        before: placeSoundBetween,
      });
      const opened = await untilChild(p);
      await talkOnce(p);
      // 응답 줄을 다 받고 읽기를 마칠 때까지(줄 사이 100ms · 읽기 600ms씩) 움직인 뒤 다음 아이 차례를 기다린다
      await advance(p, 8000);
      const back = await untilChild(p, 20_000);
      const first = await recordOf(p);
      const live = orderOf(first.reads);
      const shape = await p.evaluate(() => {
        const bubble = document.querySelector("[data-tori-bubble]");
        const buttons = [...document.querySelectorAll("[data-sound-listen]")];
        const under = buttons.map(
          (b) => b.closest("[data-tori-under]") !== null,
        );
        const bubbleBox = bubble?.getBoundingClientRect() ?? null;
        const buttonBox = buttons[0]?.getBoundingClientRect() ?? null;
        return {
          lines: [...document.querySelectorAll("[data-tori-line]")].map((l) =>
            (l.textContent ?? "").trim(),
          ),
          buttons: buttons.length,
          under: under.every(Boolean),
          below:
            bubbleBox !== null &&
            buttonBox !== null &&
            buttonBox.top >= bubbleBox.bottom - 1,
          bubbleHasButton:
            bubble !== null &&
            bubble.querySelector("[data-sound-listen]") !== null,
        };
      });
      // (다) 말풍선을 누르면 같은 차례로 다시 읽는다
      const before = first.reads.length;
      await p.locator("[data-tori-bubble]").first().click();
      await advance(p, 6000);
      const again = orderOf((await recordOf(p)).reads.slice(before));
      const same = (a) =>
        a.length === ORDER.length && a.every((t, k) => t === ORDER[k]);
      check(
        `되풀이 ${i + 1} · ${mode}`,
        opened &&
          back &&
          same(live) &&
          shape.buttons === 1 &&
          shape.under &&
          shape.below &&
          !shape.bubbleHasButton &&
          shape.lines.length === TEXT.length &&
          // 흐르는 글 조각은 자리 잡기용 사본을 함께 그려 textContent 가 같은 글을 두 번 담을 수 있다
          shape.lines.every(
            (t, k) => t === TEXT[k] || t === `${TEXT[k]}${TEXT[k]}`,
          ) &&
          same(again) &&
          first.pageErrors.length === 0,
        `읽기 ${live.join(" → ") || "-"} · 다시 ${again.join(" → ") || "-"} · 말풍선 줄 ${shape.lines.join(" / ")} · 단추 ${shape.buttons}(아래 ${shape.under} · 말풍선 밑 ${shape.below}) · 쪽 오류 ${first.pageErrors.length}`,
      );
      await p.context().close();
    }
  }
}

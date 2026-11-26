// 이야기 방식 4단계 장면 (다) 뜻 줄(13절 C254 · 분석 2.3 S7): 뜻 줄은 단계 규격 koMeaning 이 참인 단계(회화 1~4단계)에서 보인다. 쪽의 가짜
// 서버는 시드 단계 규격의 koMeaning 대로 뜻 줄 · 기록 뜻을 보낸다(entry.tsx). 4단계: 선생님 말풍선 아래 뜻 줄(data-tori-ko)이 화면 안에 보이고,
// 다음 차례가 오면 그 말풍선이 대화 기록으로 올라가며 뜻(data-talk-log-ko)을 함께 남긴다. 5단계(견줌): 뜻 줄과 기록 뜻이 없다.
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const ROUNDS = 2;
const KO = "재미있겠다!";

async function talkOnce(p) {
  await p.getByRole("button", { name: "말하기", exact: true }).click();
  await advance(p, 4500);
  const send = p.getByRole("button", { name: "보내기" });
  if ((await send.count()) > 0) await send.first().click();
}

const meaningOf = (p, ko) =>
  p.evaluate((text) => {
    const line = [...document.querySelectorAll("[data-tori-ko]")].find(
      (el) => (el.textContent ?? "").trim() === text,
    );
    const box = line?.getBoundingClientRect() ?? null;
    return {
      shown:
        box !== null &&
        box.height > 0 &&
        box.top >= 0 &&
        box.bottom <= window.innerHeight,
      lines: document.querySelectorAll("[data-tori-ko]").length,
      logKo: [...document.querySelectorAll("[data-talk-log-ko]")].filter(
        (el) => (el.textContent ?? "").trim() === text,
      ).length,
    };
  }, ko);

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    for (const level of [4, 5]) {
      const p = await openChat(browser, url, {
        config: {
          level,
          readMs: 600,
          signal: { quietSeconds: 60, hint: true, alternatives: 2 },
        },
      });
      const opened = await untilChild(p);
      await talkOnce(p);
      await advance(p, 8000);
      const first = await untilChild(p, 20_000);
      const live = await meaningOf(p, KO);
      await talkOnce(p);
      await advance(p, 8000);
      const second = await untilChild(p, 20_000);
      const after = await meaningOf(p, KO);
      const r = await recordOf(p);
      const ok =
        level === 4
          ? live.shown && after.shown && after.logKo >= 1
          : !live.shown && live.lines === 0 && after.logKo === 0;
      check(
        `되풀이 ${i + 1} · ${level}단계`,
        opened && first && second && ok && r.pageErrors.length === 0,
        `열림 ${opened} · 차례 ${first}/${second} · 뜻 줄 보임 ${live.shown}(줄 ${live.lines}) · 다음 차례 뜻 줄 ${after.shown} · 기록 뜻 ${after.logKo} · 쪽 오류 ${r.pageErrors.length}`,
      );
      await p.context().close();
    }
  }
}

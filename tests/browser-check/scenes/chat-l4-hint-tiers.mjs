// 이야기 방식 4단계 장면 (나) 힌트 세 단(13절 C254 · 분석 2.3 S7): 쪽의 가짜 서버가 힌트 호출 출력(검사를 지난 세 칸)을 core 의 단 만들기
// (chat-hints chatHintRecordOf · chatHintReplyOf)에 넣고, 단 차례는 시드 단계 규격(회화 4단계 hintTiers 뜻 → 영어 틀 → 영어 문장)이다. 4단계:
// 세 번 누르면 단 셋이 차례대로 글로 보이고(뜻 단은 한국어 글, 틀 · 문장 단은 영어 글 lang="en"), 뜻 단의 영어 문장을 거르지 않으며 문장 단에
// 듣기 단추(data-hint-listen)가 없다. 3단계(견줌): 뜻 단의 영어 문장이 걸러지고 문장 단에 듣기 단추가 하나 있다.
import {
  run as advance,
  openChat,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const ROUNDS = 2;
const KO = "내 친구는 가수야.";
const EN = "My friend is a singer.";
/** 틀 단: 영어 문장에서 처음 나온 단원 단어 자리를 비운 글(core lead-hints leadHintFrameOf). */
const FRAME = "My friend is a ___.";
const OUTPUT = { hint_ko: `${KO} ${EN}`, hint_en: EN, explain_ko: "" };

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    for (const level of [4, 3]) {
      const p = await openChat(browser, url, {
        config: {
          level,
          hintOutput: OUTPUT,
          unitWords: ["singer"],
          hintDelayMs: 600,
          replies: [{ kind: "turn", chat: { hint: true } }],
        },
      });
      const opened = await untilChild(p);
      for (let n = 0; n < 3; n++) {
        const button = p.locator("[data-hint-button]");
        if ((await button.count()) === 0 || !(await button.isEnabled())) break;
        await button.click();
        await advance(p, 1000);
      }
      const tiers = await p.evaluate(() =>
        [...document.querySelectorAll("[data-hint-tier]")].map((li) => ({
          kind: li.getAttribute("data-hint-tier"),
          state: li.getAttribute("data-hint-state"),
          text: (li.textContent ?? "").trim(),
          en: li.querySelector('[lang="en"]') !== null,
        })),
      );
      const listen = await p.locator("[data-hint-listen]").count();
      const kinds = tiers.map((t) => t.kind).join(" → ");
      const allText = tiers.every((t) => t.state === "text");
      const ko = tiers[0];
      const ok =
        level === 4
          ? kinds === "ko → frame → sentence" &&
            allText &&
            ko?.text === `${KO} ${EN}` &&
            ko.en === false &&
            tiers[1]?.en === true &&
            tiers[1]?.text === FRAME &&
            tiers[2]?.text === EN &&
            tiers[2]?.en === true &&
            listen === 0
          : kinds === "ko → frame → sentence" &&
            allText &&
            ko?.text === KO &&
            tiers[1]?.text === FRAME &&
            listen === 1;
      check(
        `되풀이 ${i + 1} · ${level}단계`,
        opened && ok,
        `열림 ${opened} · 단 ${kinds || "-"} · 글 ${tiers.map((t) => `"${t.text}"`).join(" / ")} · 듣기 단추 ${listen}`,
      );
      await p.context().close();
    }
  }
}

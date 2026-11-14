// W 장면 (2): 아이 차례에 입력이 하나라도 있으면 그 뒤 얼마가 지나도 조용함 요청이 없다. 입력 갈래마다(말하기 · 말소리 없음 한 번 · '마이크 안
// 잡힘' 안내 뒤 · 힌트 · '잘 모르겠어요' · 말풍선 다시 듣기 · 기록 줄 다시 듣기 · 소리 줄 듣기 · 힌트 문장 듣기 · 구석 '그만하기') 두 때(선생님이
// 읽는 중 · 읽기가 끝난 뒤)에 누르고 60초를 지난다. 한국어 도움 단추는 아직 화면에 없어 이 장면에 없다(보고의 '확인 못 함').
// 다음 선생님 차례의 끝 줄에는 기다림 시간을 싣지 않는다(그 차례의 조용함이 이 차례의 결과로 잘못 세지지 않게).
import {
  run as advance,
  openChat,
  recordOf,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const NO_SPEECH = [
  {
    events: [
      { at: 50, type: "start" },
      { at: 80, type: "audiostart" },
      { at: 4000, type: "error", error: "no-speech" },
      { at: 4010, type: "end" },
    ],
  },
];
/** audiostart 가 곧바로 오고 소리가 없음(speech.deaf_detect all 에서 '마이크 안 잡힘'). */
const DEAF = [
  {
    events: [
      { at: 10, type: "start" },
      { at: 20, type: "audiostart" },
    ],
  },
];

/** 입력 갈래: 이름 · 쪽 설정 · 누름. press 는 그 누름이 실제로 일어났는지(보인 단추를 눌렀는지)를 돌려준다. */
const INPUTS = [
  {
    name: "말하기",
    press: (p) =>
      clickIf(p.getByRole("button", { name: "말하기", exact: true })),
  },
  {
    name: "말소리 없음 한 번",
    config: { recognitions: NO_SPEECH },
    press: async (p) => {
      const ok = await clickIf(
        p.getByRole("button", { name: "말하기", exact: true }),
      );
      await advance(p, 5000);
      return ok && (await p.getByText("못 들었어요").count()) > 0;
    },
  },
  {
    name: "'마이크 안 잡힘' 안내 뒤",
    config: {
      recognitions: DEAF,
      settings: { "speech.deaf_detect": "all", "speech.deaf_retry_max": 0 },
    },
    press: async (p) => {
      const ok = await clickIf(
        p.getByRole("button", { name: "말하기", exact: true }),
      );
      await advance(p, 6000);
      return ok && (await p.getByText("마이크가 안 잡혔어요").count()) > 0;
    },
  },
  { name: "힌트", press: (p) => clickIf(p.locator("[data-hint-button]")) },
  {
    name: "'잘 모르겠어요'",
    press: (p) => clickIf(p.locator("[data-dont-know]")),
  },
  {
    name: "말풍선 다시 듣기",
    press: (p) => clickIf(p.locator("[data-tori-bubble]")),
  },
  {
    name: "기록 줄 다시 듣기",
    press: (p) => clickIf(p.locator("button[data-talk-log-teacher]").last()),
  },
  {
    name: "소리 줄 듣기",
    config: { sound: "I like ducks." },
    press: (p) => clickIf(p.locator("[data-sound-listen]").first()),
  },
  {
    name: "힌트 문장 듣기(저절로 열린 단)",
    config: { stuck: 2, hintDelayMs: 200 },
    press: async (p) => {
      // 단 0 을 받은 뒤 남은 단을 받는다(0.2초씩) — 듣기 단추가 있는 문장 단이 찰 때까지
      await advance(p, 600);
      return clickIf(p.locator("[data-hint-listen]").first());
    },
  },
  {
    // 막혀 있는 누름도 입력이다(계약 '막혀 있거나 무시되는 누름도 넣음' — 코드 검토 rev-chat-w M-1). 둘째 막힘으로 단이 저절로 열려 받는 중이면 힌트
    // 단추가 막혀 있다 — 사람이 그 자리를 누르는 것처럼 좌표로 누른다(막힌 단추라 처리기는 돌지 않음)
    name: "막힌 힌트 단추(저절로 열린 단을 받는 중)",
    config: { stuck: 2, hintDelayMs: 20_000 },
    press: async (p) => {
      const button = p.locator("[data-hint-button]");
      if ((await button.count()) === 0 || (await button.isEnabled()))
        return false;
      const box = await button.boundingBox();
      await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      return true;
    },
  },
  {
    name: "구석 '그만하기'(확인 쪽지 뒤 대화는 그대로)",
    press: async (p) => {
      const ok = await clickIf(p.locator("[data-talk-stop]"));
      await advance(p, 300);
      const stay = p.getByRole("button", { name: "더 이야기할래요" });
      return ok && (await clickIf(stay));
    },
  },
];

async function clickIf(locator) {
  if ((await locator.count()) === 0) return false;
  if (!(await locator.first().isEnabled())) return false;
  await locator.first().click();
  return true;
}

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (const input of INPUTS) {
    for (const at of ["읽는 중", "읽은 뒤"]) {
      const p = await openChat(browser, url, {
        config: {
          signal: { quietSeconds: 8, hint: true, alternatives: 2 },
          readMs: 3000,
          replies: [{ kind: "turn", chat: { hint: true } }],
          ...input.config,
        },
      });
      const opened = await untilChild(p);
      // 읽는 중: 아이 차례가 열린 바로 뒤(읽기 3초) · 읽은 뒤: 읽기 끝 + 4초(기다림 8초 전)
      await advance(p, at === "읽는 중" ? 200 : 7000);
      const pressed = await input.press(p);
      await advance(p, 60_000);
      const r = await recordOf(p);
      check(
        `${input.name} · ${at}`,
        opened && pressed && r.quiet === 0 && r.pageErrors.length === 0,
        `열림 ${opened} · 누름 ${pressed} · 조용함 요청 ${r.quiet} · 쪽 오류 ${r.pageErrors.length}`,
      );
      await p.context().close();
    }
  }
}

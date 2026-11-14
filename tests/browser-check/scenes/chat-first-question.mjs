// W 장면(서버 턴 길 검토 rev-chat-s1 6절 W 3): 이야기 방식 끝 줄(신호 칸 있음)은 '대화 첫 질문 차례' 값(lesson.firstQuestionDue)이 참이어도 아이 차례를
// 연다 — 화면 자료를 다시 읽으러 가지 않는다(짧은 준비가 없는 수업에서 그 값이 계속 참으로 남음). 기존 두 방식(mode old — 신호 칸 없음)은 지금처럼
// 그 값이면 화면 자료를 다시 읽는다.
import {
  run as advance,
  openChat,
  untilChild,
} from "../pages/talk-chat/drive.mjs";

export const page = "talk-chat";

const ROUNDS = 3;

async function loadsOf(p) {
  return p.evaluate(
    () =>
      window.__chat.actions.filter((a) => a.name === "loadTalkLessonView")
        .length,
  );
}

export async function run({ browserType, url, check }) {
  const browser = await browserType.launch();
  for (let i = 0; i < ROUNDS; i++) {
    for (const mode of ["chat", "old"]) {
      const p = await openChat(browser, url, {
        query: mode === "old" ? "mode=old" : "",
        config: {
          signal: { hint: true },
          replies: [
            { kind: "turn", chat: { hint: true }, firstQuestionDue: true },
          ],
        },
      });
      const opened = await untilChild(p);
      await p.locator("[data-dont-know]").click();
      await advance(p, 4000);
      const child = await untilChild(p, 4000);
      const loads = await loadsOf(p);
      const ok =
        mode === "chat" ? opened && child && loads === 0 : opened && loads >= 1;
      check(
        `되풀이 ${i + 1} · ${mode === "chat" ? "이야기 방식" : "기존 방식"}`,
        ok,
        `열림 ${opened} · 다음 아이 차례 ${child} · 자료 다시 읽음 ${loads}`,
      );
      await p.context().close();
    }
  }
}

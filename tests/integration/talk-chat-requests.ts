// 이야기 방식 턴 길 통합 시험(talk-chat-turn.test.ts)이 보내는 턴 요청 본문(plan 묶음 S1 fix 1 — 검토 rev-chat-s1 I-3). DB 없는 재료 함수만 두어
// 단위 시험(talk-chat-turn-plan)이 같은 본문을 턴 요청 규격(parseTalkTurnRequest)에 넣어 볼 수 있게 한다. 말소리 없음은 input.nospeech 로 보낸다 —
// 요청의 듣기 사건 요약(client_listen)은 화면이 채우는 닫힌 꼴이라 시험이 손으로 쓰지 않는다(서버가 nospeech 로 출처를 적는다).

let seq = 0;

/** 아이 말 요청(extra 는 인식기 칸 등). */
export function chatSayBody(
  sessionId: string,
  text: string,
  extra: Record<string, unknown> = {},
) {
  return {
    sessionId,
    clientAttemptId: `chat-${++seq}`,
    input: { mode: "speech", text },
    hint: { opened: 0, heard: [] },
    ...extra,
  };
}

/** '잘 모르겠어요' 단추 요청. nospeech 면 눌렀으나 듣지 못한 차례(화면의 말소리 없음 셈). */
export function chatDontKnowBody(sessionId: string, nospeech = false) {
  return {
    sessionId,
    clientAttemptId: `chat-${++seq}`,
    input: { mode: "dont_know", ...(nospeech ? { nospeech: true } : {}) },
    hint: { opened: 0, heard: [] },
  };
}

/** 아이 말 없이 부르는 입구 요청. */
export function chatOpenBody(
  sessionId: string,
  lead: "start" | "more" | "quiet" | "back",
) {
  return { sessionId, lead };
}

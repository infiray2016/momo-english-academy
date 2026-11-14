// 점검 틀용 대역(talk-chat 쪽): 회화 · 세션 · 선생님 서버 액션. 실제 서버는 부르지 않고 쪽 안의 가짜 서버(window.__chat — pages/talk-chat/entry.tsx)가
// 정한 응답을 돌려주고 부른 값을 남긴다. 장면은 window.__chat 의 칸으로 응답을 정하고 기록을 읽는다.
type ChatPage = {
  action(name: string, input: unknown): Promise<unknown>;
};

function page(): ChatPage {
  return (window as unknown as { __chat: ChatPage }).__chat;
}

const call =
  (name: string) =>
  (input?: unknown): Promise<never> =>
    page().action(name, input) as Promise<never>;

export const revealTalkLessonHint = call("revealTalkLessonHint");
export const advanceTalkLesson = call("advanceTalkLesson");
export const chooseLessonMoreTalk = call("chooseLessonMoreTalk");
export const leaveTalkLesson = call("leaveTalkLesson");
export const loadTalkLessonView = call("loadTalkLessonView");
export const markTalkNotice = call("markTalkNotice");
export const readTalkLessonWrap = call("readTalkLessonWrap");
export const stopTalkLesson = call("stopTalkLesson");
export const talkClosingStatus = call("talkClosingStatus");
export const saveLessonFollowAlong = call("saveLessonFollowAlong");
export const recheckAiRest = call("recheckAiRest");
export const reportSessionMic = call("reportSessionMic");
export const chooseTeacher = call("chooseTeacher");
export const saveAttempts = call("saveAttempts");
export const startLesson = call("startLesson");

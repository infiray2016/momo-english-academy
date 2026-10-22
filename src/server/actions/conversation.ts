"use server";
// 회화 서버 액션(plan-p13b 파일별 값 4, 10절 접근 제어 · 5절 · 8절). 모든 함수의 첫 문장은 requireAccess() 다(P3b 훑기 시험).
// 입력은 화면에서 온 그대로 받아 서버(src/server/conversation)의 Zod 로 다시 본다. 아이 글을 로그에 내지 않는다.
// 아이 말 하나(회화 턴)는 서버 액션이 아니라 Route Handler POST /api/talk/turn 이다(C92 — 흘려 보내기). 끝맺음 턴은 응답 뒤(after()).
// 마이크 알림은 P11a reportSessionMic(actions/session)을 그대로 쓴다.
import { after } from "next/server";
import { requireAccess } from "@/server/access/guard";
import { now } from "@/server/clock";
import {
  advanceTalk as advance,
  type ClosingStatus,
  chooseMoreTalk as chooseMore,
  talkClosingStatus as closingStatus,
  type FollowOutcome,
  type LeaveOutcome,
  leaveTalk as leave,
  type MoveOutcome,
  markTalkNotice as markNotice,
  revealTalkHint as revealHint,
  type StopOutcome,
  saveFollowAlong,
  stopTalk as stop,
} from "@/server/conversation";

const schedule = (task: () => Promise<void>) => after(task);

/** 오늘 쓸 말 · 말해 보기 · 정리 · 한 번 더 말해 보기의 따라 말하기 한 차례(AI 없음). */
export async function saveTalkFollowAlong(
  input: unknown,
): Promise<FollowOutcome> {
  await requireAccess();
  return saveFollowAlong(input, { now });
}

/** 다음 토막으로(차례대로만 — 대화에 들어갈 때 대화 첫 질문을 붙인다, AI 없음). */
export async function advanceTalk(input: unknown): Promise<MoveOutcome> {
  await requireAccess();
  return advance(input, { now });
}

/** 목표 턴 뒤 '더 이야기하기'(talk.more_talk_round_turns 턴 — C30). */
export async function chooseMoreTalk(input: unknown): Promise<MoveOutcome> {
  await requireAccess();
  return chooseMore(input, { now });
}

/** '그만하기' — 정리 자료를 바로 돌려주고 끝맺음 턴은 응답 뒤(AC-8c · C33). */
export async function stopTalk(input: unknown): Promise<StopOutcome> {
  await requireAccess();
  return stop(input, { now, schedule });
}

/** '홈' — 목표 턴 전이면 그대로 두고, 목표 턴 뒤면 닫고 끝맺음은 응답 뒤(C34 · 회11 (10)). */
export async function leaveTalk(input: unknown): Promise<LeaveOutcome> {
  await requireAccess();
  return leave(input, { now, schedule });
}

/** 끝맺음 상태(정리 끝인사 · 마무리 둘째 장). */
export async function talkClosingStatus(
  input: unknown,
): Promise<ClosingStatus> {
  await requireAccess();
  return closingStatus(input, { now });
}

/** 한 번 안내를 보았다(처음 회화 안내 · '막히면 눌러요' — 프로필마다 한 번, 회17). */
export async function markTalkNotice(input: unknown): Promise<{ ok: boolean }> {
  await requireAccess();
  return markNotice(input, { now });
}

/** 1~3단계 힌트 단 하나의 글(아이가 연 단만 — 영어 문장을 미리 내려 주지 않는다). */
export async function revealTalkHint(
  input: unknown,
): Promise<{ ok: true; text: string } | { ok: false }> {
  await requireAccess();
  return revealHint(input, { now });
}

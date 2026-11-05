"use server";
// 회화 서버 액션(plan-p13b 파일별 값 4, 10절 접근 제어 · 5절 · 8절). 모든 함수의 첫 문장은 requireAccess() 다(P3b 훑기 시험).
// 입력은 화면에서 온 그대로 받아 서버(src/server/conversation)의 Zod 로 다시 본다. 아이 글을 로그에 내지 않는다.
// 아이 말 하나(회화 턴)는 서버 액션이 아니라 Route Handler POST /api/talk/turn 이다(C92 — 흘려 보내기). 끝맺음 턴은 응답 뒤(after()).
// 마이크 알림은 P11a reportSessionMic(actions/session)을 그대로 쓴다.
// 회화는 새 꼴 카드 세션만 연다(회화 plan 묶음 9 · 11 · 12, 정한 것 1 — 옛 꼴 감싸기 일곱은 묶음 12 가 지움). 아래 '새 흐름' 여덟과
// talkClosingStatus · markTalkNotice 를 감싼다.
import { after } from "next/server";
import { requireAccess } from "@/server/access/guard";
import { now } from "@/server/clock";
import {
  type ClosingStatus,
  talkClosingStatus as closingStatus,
  type FollowOutcome,
  type LeaveOutcome,
  type LessonMoveOutcome,
  advanceTalkLesson as lessonAdvance,
  saveLessonFollowAlong as lessonFollow,
  revealTalkLessonHint as lessonHint,
  leaveTalkLesson as lessonLeave,
  chooseLessonMoreTalk as lessonMore,
  stopTalkLesson as lessonStop,
  loadTalkLessonView as lessonView,
  readTalkLessonWrap as lessonWrap,
  markTalkNotice as markNotice,
  type StopOutcome,
  type TalkLessonView,
  type WrapOutcome,
} from "@/server/conversation";

const schedule = (task: () => Promise<void>) => after(task);

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

// ── 새 흐름(새 꼴 카드 세션 — 네 토막: 인사 → 짧은 준비 → 대화 → 정리, 3.3 · C189) ─────────

/** 새 꼴 회화 화면 자료(쪽이 다시 읽지 않고 틀이 부를 때 — 이어 하기 자료와 같은 꼴, AI 없음). 열려 있지 않으면 undefined. */
export async function loadTalkLessonView(input: {
  sessionId: string;
}): Promise<TalkLessonView | undefined> {
  await requireAccess();
  return lessonView(input, { now });
}

/** 토막 넘김(인사 끝 → 짧은 준비 · 대화, 짧은 준비 끝 → 대화 첫 질문, 대화 중 연 준비 끝 → 'Now let's talk.' + 다음 필수 질문 — AI 없음). */
export async function advanceTalkLesson(
  input: unknown,
): Promise<LessonMoveOutcome> {
  await requireAccess();
  return lessonAdvance(input, { now });
}

/** 짧은 준비 · 정리 · 한 번 더 말해 보기의 따라 말하기 한 차례(활동 번호는 서버가 정함, AI 없음). */
export async function saveLessonFollowAlong(
  input: unknown,
): Promise<FollowOutcome> {
  await requireAccess();
  return lessonFollow(input, { now });
}

/** 마무리 물음 · 마무리 제안 뒤 '더 이야기하기'(앱이 더 이야기할 거리 하나를 붙임 — AI 호출 · 턴 셈 없음, 정한 것 11). */
export async function chooseLessonMoreTalk(
  input: unknown,
): Promise<LessonMoveOutcome> {
  await requireAccess();
  return lessonMore(input, { now });
}

/** '그만하기' — 참여가 거의 없을 때만 확인 쪽지(needs_confirm, 정한 것 12). 정리 자료를 바로 돌려주고 끝맺음 턴은 응답 뒤. */
export async function stopTalkLesson(input: unknown): Promise<StopOutcome> {
  await requireAccess();
  return lessonStop(input, { now, schedule });
}

/** '홈' — 참여 완료 전이면 그대로(진행), 뒤면 닫고 마무리 첫 장 자료(끝맺음은 응답 뒤). */
export async function leaveTalkLesson(input: unknown): Promise<LeaveOutcome> {
  await requireAccess();
  return lessonLeave(input, { now, schedule });
}

/** 닫힌 새 꼴 회화의 마무리 자료(턴 응답이 대화를 닫은 뒤, AI 없음). */
export async function readTalkLessonWrap(input: unknown): Promise<WrapOutcome> {
  await requireAccess();
  return lessonWrap(input, { now });
}

/** 지금 질문 자리 힌트 단 하나의 글(아이가 연 단만 — 1~3단계 영어 문장을 미리 내려 주지 않는다). */
export async function revealTalkLessonHint(
  input: unknown,
): Promise<{ ok: true; text: string } | { ok: false }> {
  await requireAccess();
  return lessonHint(input, { now });
}

// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 1 '스냅숏 조건', plan 묶음 S2)의 처음 스냅숏 방식 판단.
// 서버 index.ts 에 있던 DB 없는 순수 함수를 그대로 옮겼다(13절 C243 보완 10 (1) — 서버 수업 열기와 대본 도구 talk-observe 가 같은 함수를 부른다,
// 옮기기 전 판으로 만든 기준 파일 tests/fixtures/chat-core-move-baseline 과 글자까지 같음). 서버 index.ts 는 이 함수를 같은 이름으로 다시 내보낸다.
import { talkUnitTextOf } from "@/core/ai/calls/talk-lead";
import {
  chatStartAllowed,
  isChatSession,
  type TalkLeadMode,
} from "@/core/conversation/lead-mode";
import {
  type LeadTextOf,
  leadStartModeOf,
} from "@/core/conversation/lead-turn-core";
import type { Teacher } from "@/core/seed/schema/teachers";
import { chatMaterialOf } from "@/core/teacher/roster";

/**
 * 이야기 방식 단원 재료를 찾는 함수(기본 talkUnitTextOf — 두 방식의 글이 다 있는 단원과 이야기 방식 재료만 있는 단원을 함께 읽는다, 13절 C254 (3)).
 * 지금 새 방식의 안내문 글 출처(LeadTextOf)도 이 꼴에 맞는다.
 */
export type ChatTextOf = (
  level: number,
  unit: number,
) => { readonly chatTopicEn?: string | undefined } | null;

/**
 * 이야기 방식 단원 재료가 있는가(단원 표의 chatTopicEn 이 빈 글이 아님 — talk-chat.ts talkChatTopicOf 와 같은 판단). 표 출처는 기본 talkUnitTextOf 이고,
 * 시험이 바꾸면(1단계 시드로 열게) 그 표로 판단한다.
 */
export function chatUnitMaterialOf(
  chatText: ChatTextOf,
  level: number,
  unit: number,
): boolean {
  return (chatText(level, unit)?.chatTopicEn?.trim() ?? "") !== "";
}

/**
 * 처음 스냅숏에 적을 회화 방식(이야기 방식 spec 설계 1 '스냅숏 조건', 묶음 S2). 설정이 chat 이면 넷(설정 · 이야기 방식 구간(1-3 · 4-6, C254) · 단원
 * 재료 · 고른 선생님의 이야기 방식 재료)이 모두 설 때만 chat 이고, 하나라도 빠지면 기존 방식(app — 재료 없는 선생님 · 다른 단원 · 7단계 이상)이다.
 * 설정이 app · claude 면 지금 판단(leadStartModeOf) 그대로다. leadText 를 넘기면(시험) 두 판단이 그 표를 함께 쓰고, 넘기지 않으면 새 방식은
 * talkLeadTextOf(leadStartModeOf 의 기본) · 이야기 방식은 talkUnitTextOf 를 읽는다 — 이야기 방식 재료만 있는 단원은 새 방식 단원이 되지 않는다.
 */
export function lessonStartModeOf({
  mode,
  level,
  unit,
  teacher,
  leadText,
}: {
  mode: TalkLeadMode;
  level: number;
  unit: number;
  teacher: Pick<Teacher, "chatPersonaEn" | "chatFavoritesEn"> | null;
  leadText?: LeadTextOf | undefined;
}): TalkLeadMode {
  if (mode !== "chat") return leadStartModeOf({ mode, level, unit, leadText });
  return chatStartAllowed({
    setting: true,
    chatBand: isChatSession({ start: { leadMode: "chat" }, level }),
    unitMaterial: chatUnitMaterialOf(leadText ?? talkUnitTextOf, level, unit),
    teacherMaterial: teacher !== null && chatMaterialOf(teacher) !== null,
  })
    ? "chat"
    : "app";
}

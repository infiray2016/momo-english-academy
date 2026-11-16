// 회화 이야기 방식(talk.lead_mode 'chat', intent 2026-11-13-회화-대화-구조-R spec 설계 1 '스냅숏 조건', plan 묶음 S2)의 처음 스냅숏 방식 판단.
// 서버 index.ts 에 있던 DB 없는 순수 함수를 그대로 옮겼다(13절 C243 보완 10 (1) — 서버 수업 열기와 대본 도구 talk-observe 가 같은 함수를 부른다,
// 옮기기 전 판으로 만든 기준 파일 tests/fixtures/chat-core-move-baseline 과 글자까지 같음). 서버 index.ts 는 이 함수를 같은 이름으로 다시 내보낸다.
import { talkLeadTextOf } from "@/core/ai/calls/talk-lead";
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
 * 이야기 방식 단원 재료가 있는가(단원 표의 chatTopicEn 이 빈 글이 아님 — talk-chat.ts talkChatTopicOf 와 같은 판단). 표 출처는 처음 스냅숏의 안내문 글
 * 출처와 같은 함수다(기본 talkLeadTextOf — 시험이 1단계 시드로 열게 바꾼다).
 */
export function chatUnitMaterialOf(
  leadText: LeadTextOf,
  level: number,
  unit: number,
): boolean {
  return (leadText(level, unit)?.chatTopicEn?.trim() ?? "") !== "";
}

/**
 * 처음 스냅숏에 적을 회화 방식(이야기 방식 spec 설계 1 '스냅숏 조건', 묶음 S2). 설정이 chat 이면 넷(설정 · 1~3단계 구간 · 단원 재료 · 고른 선생님의
 * 이야기 방식 재료)이 모두 설 때만 chat 이고, 하나라도 빠지면 기존 방식(app — 리오 · 다른 단원 · 4단계 이상)이다. 설정이 app · claude 면 지금
 * 판단(leadStartModeOf) 그대로다.
 */
export function lessonStartModeOf({
  mode,
  level,
  unit,
  teacher,
  leadText = talkLeadTextOf,
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
    lowBand: isChatSession({ start: { leadMode: "chat" }, level }),
    unitMaterial: chatUnitMaterialOf(leadText, level, unit),
    teacherMaterial: teacher !== null && chatMaterialOf(teacher) !== null,
  })
    ? "chat"
    : "app";
}

// 새 회화 엔진의 ai_calls 표지(spec '회화 Claude 주도' 데이터 절 ai_calls 행, plan 묶음 S1). 모든 AI 호출 길이 거치는 낮은 층 파일(server/ai/store.ts 의
// '같은 오류' 셈)이 새 엔진의 판단 모듈(lead-turn-core) 전체를 불러오지 않게 상수만 따로 둔다(검토 rev-s1-2 N-5 (b)). lead-turn-core 가 같은 이름으로
// 다시 내보낸다. 순수 모듈이다.

/** 새 엔진 회화 턴 호출의 ai_calls 표지(error_code — 방식별로 셀 수 있게. 오류가 있는 행은 '<표지>:<갈래>'). */
export const LEAD_RECORD_TAG = "lead";
/** 좁은 정의 다시 말하기 호출의 ai_calls 표지. */
export const LEAD_NARROW_RECORD_TAG = "lead.narrow";
/**
 * 이야기 방식(talk.lead_mode chat) 대화 호출의 ai_calls 표지(spec '회화 대화 구조 R' 설계 2 — 목적은 talk_turn 그대로, 방식별로 셈. 오류가 있는
 * 행은 '<표지>:<갈래>'). talk-chat 이 같은 이름으로 다시 내보낸다(plan 묶음 S0 · 검토 rev-chat-p1 H7).
 */
export const TALK_CHAT_RECORD_TAG = "chat";

// 회화 방식 고르기(회화 Claude 주도 plan 묶음 M · spec 설계 1 · 13절 C233 · C238). 설정 talk.lead_mode(12절, 고급 설정에서만 바꿈, 시드 "app")는
// 수업을 처음 열 때 한 번 읽어 처음 스냅숏(attempts 의 talk-start 입력 leadMode 칸)에 적고, 그 세션은 끝까지 그 값을 쓴다(세션 도중 설정이
// 바뀌어도 처음 값 — 한 세션에서 두 길이 섞이지 않게). 칸은 claude 일 때만 적어서, app 세션의 스냅숏은 이 묶음 전과 글자까지 같다(코드를 되돌려도
// 진행 중인 app 수업이 옛 꼴 검사에 걸리지 않게). 칸이 없는 옛 스냅숏과 모르는 값은 지금 방식(app)으로 읽는다(마이그레이션 없음).
// 설정 값 자체의 검증(app · claude 밖이면 던짐)은 설정 읽기(lesson-turns.ts talkLessonSettingsFrom)가 하고, 여기 읽기는 스냅숏 호환 몫이라 관대하다.
// 갈림 자체(N 턴 길)는 묶음 S1 몫이다. 순수 모듈이다.

/** 회화 방식: app 은 지금 방식(앱이 차례를 계획), claude 는 Claude 가 대화를 이끄는 방식(N). */
export const TALK_LEAD_MODES = ["app", "claude"] as const;
export type TalkLeadMode = (typeof TALK_LEAD_MODES)[number];

/** 설정 키(12절). */
export const TALK_LEAD_MODE_KEY = "talk.lead_mode";

/** 스냅숏에서 읽은 값을 방식으로 바꾼다. "claude" 만 claude 이고, 그 밖의 값(빠짐 · 모르는 글 · 꼴 밖)은 지금 방식 app 이다. */
export function talkLeadModeOf(value: unknown): TalkLeadMode {
  return value === "claude" ? "claude" : "app";
}

/** 세션의 회화 방식: 처음 스냅숏의 leadMode 칸. 스냅숏이 없거나 칸이 없거나 모르는 값이면 app 이다. */
export function leadModeOf(
  start: { readonly leadMode?: unknown } | null | undefined,
): TalkLeadMode {
  return talkLeadModeOf(start?.leadMode);
}

/** 처음 스냅숏에 펼쳐 넣을 칸: claude 일 때만 { leadMode: "claude" }, app 이면 빈 객체(칸 없음 = app, 이 묶음 전 스냅숏과 같음). */
export function leadModeStartField(mode: TalkLeadMode): {
  leadMode?: "claude";
} {
  return mode === "claude" ? { leadMode: "claude" } : {};
}

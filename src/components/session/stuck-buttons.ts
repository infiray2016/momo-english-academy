// 막힌 화면의 단추 차례 · 막힘 문구(UI · UX plan 묶음 2-가 보탬 · 0-나 검토 M1). 아무것도 들이지 않는 작은 모듈이다. 앱 오류 화면 · 없는 주소
// 판(app-trouble — 루트 오류 경계라 모든 쪽에 걸림)이 여기서 가져와 음성 층(mic-state → lib/speech/browser)을 첫 JS 에 싣지 않는다.
// 막힘 판(mic-blocked)은 같은 값을 그대로 내보낸다(쓰는 쪽 · 시험은 그대로). 값의 근거는 막힘 판 머리 주석(7절 · C166 R6 · [승인 UX3])이다.

export const MIC_BLOCKED_TEXT = {
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  stalled: "마이크가 잘 안 돼요. 부모님께 말해 주세요",
  silent: "말소리가 잘 안 들려요. 부모님께 말해 주세요",
  /** plan-p11a 정본 밖 문구 표(C111) — 아이패드 사파리만. */
  ipadSilentMode: "아이패드 제어 센터에서 무음 모드를 꺼 주세요",
  /** 막힘 화면의 다시 해 보기(C166 R6 — 브리프 A 문구). */
  retry: "다시 해 볼래요",
  /** 다시 확인하는 동안(확인은 소리가 들어와야 성공 — 첫 실행 C72 안내 '… 아무 말이나 한마디 해 주세요'의 뒷부분). */
  retrySpeak: "아무 말이나 한마디 해 주세요",
  /** 막힘 판의 작은 단추(7절 '막힘 화면' 행). */
  home: "홈",
} as const;

export type MicBlockedKind = "needsMic" | "stalled" | "silent";

/** 막힌 화면의 갈래: 마이크 막힘(blocked) · 'AI 쉬는 중'(resting). */
export type StuckKind = "blocked" | "resting";
export type StuckButton = "retry" | "home";

/**
 * 막힌 화면의 단추 차례(순수, [승인 UX3]): 그 화면 글이 권하는 행동이 큰 단추다. 마이크 막힘 글은 '부모님께 말해 주세요'이고 고친 뒤 할
 * 일은 다시 해 보기라 '다시 해 볼래요'가 크고, 쉬는 안내 글은 '다른 공부를 해 볼까요'라 '홈'이 크다(확인 쪽지에서 이어 가는 쪽이 큰 단추인
 * 것과 같은 결 — U5-6).
 */
export function stuckButtonsOf(kind: StuckKind): {
  big: StuckButton;
  small: StuckButton;
} {
  return kind === "blocked"
    ? { big: "retry", small: "home" }
    : { big: "home", small: "retry" };
}

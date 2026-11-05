// 문서 단위 읽어 주기 잠금 풀기(가르치고 배우는 수업 plan 정한 것 11 · 위험 4, 묶음 마-2). 음성 접점(createBrowserSpeech)이 아직 없는 쪽
// (수업 목록 · 홈 · 결과의 수업 카드)에서, 누름 처리 중에 소리 없는 글 하나를 읽어 이 문서의 읽어 주기 제약을 푼다(WebKit 은 누름 처리 중의
// speak() 가 제약을 푼다 — plan-p02 위험 2, browser.ts unlockFromGesture 와 같은 글 · 같은 크기). 클라이언트 이동으로 연 세션의 첫 줄(오늘
// 배울 것 한국어 줄)이 iPad 사파리에서도 읽히게 하려는 것이다. 같은 문서에서 풀림이 다음 쪽의 새 음성 접점까지 이어진다는 것은 추측이라
// 음성 점검(장부 L-2)에서 실측한다. 안 되면 감시 길(설계 10 — 시작 상한 뒤 단추 밝음 · '소리가 안 나와서 글로 봐요')이 그대로 받는다.
// 발화 결과 · 감시 · 음성 접점 상태는 건드리지 않는다(접점의 unlocked 셈과 따로 — 세션 틀의 첫 누름은 그대로 접점을 푼다).

/** 소리 없는 글(browser.ts UNLOCK_TEXT 와 같은 값 — 기록 대본 listen-log 가 읽기로 보지 않는 글). */
const UNLOCK_TEXT = " ";
/** 소리 크기(browser.ts UNLOCK_VOLUME 과 같은 값). */
const UNLOCK_VOLUME = 0;

/** 잠금 풀기에 쓰는 브라우저 몫(시험이 가짜를 넘긴다). */
export type UnlockTarget = {
  speechSynthesis?: { speak(utterance: SpeechSynthesisUtterance): void } | null;
  SpeechSynthesisUtterance?: new (text: string) => SpeechSynthesisUtterance;
};

/**
 * 누름 처리 안에서 부른다(await 앞 — 제스처 안이어야 한다). 읽어 주기 API 가 없으면 아무것도 하지 않고 false, 읽었으면 true.
 * 실패(던짐)는 삼킨다 — 수업 시작을 막지 않는다.
 */
export function unlockSpeechInDocument(
  target: UnlockTarget | undefined = typeof window === "undefined"
    ? undefined
    : window,
): boolean {
  const synthesis = target?.speechSynthesis;
  const Utterance = target?.SpeechSynthesisUtterance;
  if (
    typeof synthesis !== "object" ||
    synthesis === null ||
    typeof Utterance !== "function"
  )
    return false;
  try {
    const utterance = new Utterance(UNLOCK_TEXT);
    utterance.volume = UNLOCK_VOLUME;
    synthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

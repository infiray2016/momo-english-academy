"use client";

// 1-가 하루 안전 상한 안내(11절 (7) · 13절 C50 (2) · C80 · 8절 'AI 쉬는 중' 동안 행의 문구 — 모든 영역 같은 문구, C16).
// AI 가 필요한 수업을 고르면 · 하던 세션을 다시 열면 · 도중에 닿으면 이 안내와 '홈' 하나(세션은 진행으로 남음). 아이 화면에
// '오늘은 끝'으로 보이지 않는다(13절 2026-10-15 실시간 호출 결정). 1-나 'AI 쉬는 중'도 같은 조각을 쓴다.
import { BigButton, BigLink } from "@/components/board/board";

export const AI_REST_TEXT = {
  line: "토리가 잠깐 쉬어요. 다른 공부를 해 볼까요",
  home: "홈",
} as const;

/** 안내와 '홈'. onHome 이 있으면 단추(세션 틀 — 대기열을 비운 뒤 홈), 없으면 홈으로 가는 링크. */
export function AiRest({
  onHome,
  busy = false,
}: {
  onHome?: () => void;
  busy?: boolean;
}) {
  return (
    <div data-ai-rest="" className="flex flex-col items-center gap-8 py-6">
      <p className="text-center font-heading text-[28px] leading-snug">
        {AI_REST_TEXT.line}
      </p>
      {onHome ? (
        <BigButton disabled={busy} onClick={onHome}>
          {AI_REST_TEXT.home}
        </BigButton>
      ) : (
        <BigLink href="/">{AI_REST_TEXT.home}</BigLink>
      )}
    </div>
  );
}

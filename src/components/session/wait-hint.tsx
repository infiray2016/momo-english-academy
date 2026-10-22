"use client";

// 기다림 표시(4절 첫 문단 'AI 응답을 기다리는 모든 화면은 ui.wait_hint_seconds 의 첫 값(1초) 안에 기다림 표시를 보인다. 둘째 값(5초)이
// 넘으면 해요체 한 줄' · AC-N10, plan-p11b 파일별 값 6 · 정할 것 ㄷ). 첫 값 안 — 그리는 즉시 점 셋이 움직인다(data-wait-hint).
// 둘째 값이 지나면 그 아래 '확인하고 있어요'(data-wait-line, 4절 예 그대로 — 모든 AI 기다림에 같은 줄). 수는 설정에서 받는다.
// 쓰기 확인 서버 액션 기다림 · 결과 화면 첨삭 기다림 · '첨삭 보기' 다시 부름 · 말하기 AI 평가가 같이 쓴다.
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const WAIT_TEXT = { checking: "확인하고 있어요" } as const;

/** 초 → ms(단위 바꿈 상수). */
const MS_PER_SECOND = 1000;
/** 움직이는 점 수(화면 꼴 값). */
const DOTS = [0, 1, 2] as const;
/** 점마다 움직임을 늦추는 간격(화면 꼴 값). */
const DOT_DELAY_MS = 150;

export function WaitHint({
  startedAt,
  seconds,
  className,
}: {
  /** 기다림을 시작한 때(performance.now()). */
  startedAt: number;
  /** ui.wait_hint_seconds — [표시를 보이는 상한, 한 줄을 더하는 때]. 표시는 그리는 즉시라 첫 값 안이다. */
  seconds: readonly [number, number];
  className?: string;
}) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    const left = seconds[1] * MS_PER_SECOND - (performance.now() - startedAt);
    if (left <= 0) {
      setLate(true);
      return;
    }
    setLate(false);
    const timer = window.setTimeout(() => setLate(true), left);
    return () => window.clearTimeout(timer);
  }, [startedAt, seconds]);
  return (
    <div
      data-wait-hint=""
      role="status"
      className={cn("flex flex-col items-center gap-3 py-3", className)}
    >
      <span aria-hidden className="flex gap-3">
        {DOTS.map((i) => (
          <span
            key={i}
            className="size-4 animate-bounce rounded-full bg-ink motion-reduce:animate-none"
            style={{ animationDelay: `${i * DOT_DELAY_MS}ms` }}
          />
        ))}
      </span>
      {late ? (
        <p data-wait-line="" className="text-xl">
          {WAIT_TEXT.checking}
        </p>
      ) : null}
    </div>
  );
}

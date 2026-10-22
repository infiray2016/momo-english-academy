"use client";

// '말하기' 단추 한 조각(7절 '말하기 버튼' 행 · 4절 큰 버튼, 화면 검토 review-p11-4-design I-1). 한 번 눌러 듣기를 시작하고,
// 듣는 동안 단추 꼴이 바뀐다 — 안쪽 분홍 테(말하기 영역 색) + 둘레에 남은 시간이 줄어드는 고리(P2b 듣기 손잡이의 상한 시각 capAt —
// speech.max_listen_seconds · 활동 시간 상한에서 온 수, 이 조각은 수를 박지 않는다) + 보이는 상태 data-listening. 듣는 중에 다시 누르면
// 듣기가 바로 끝난다(부르는 쪽이 손잡이 press). 두 문장 이상 답은 듣는 동안 단추 글이 '다 말했어요'로 바뀐다(C37 — listeningLabel,
// plan-p11c 가 넘김). P10 배치 따라 말하기 · P11 말하기 세션이 같이 쓴다.
import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BigButton } from "@/components/board/board";
import { cn } from "@/lib/utils";

/** 고리 한 바퀴(도). */
const FULL_TURN_DEG = 360;

export function SpeakButton({
  label,
  listeningLabel,
  listening,
  capAt,
  disabled = false,
  className,
  onPress,
}: {
  label: string;
  /** 듣는 동안의 단추 글(없으면 label 그대로). */
  listeningLabel?: string;
  listening: boolean;
  /** 듣기 전체 상한의 시각(performance.now() 기준 ms). 읽을 때마다 지금 값(P2b ListenHandle.capAt). 없으면 고리를 꽉 채운다. */
  capAt?: () => number | undefined;
  disabled?: boolean;
  className?: string;
  onPress: () => void;
}) {
  const [left, setLeft] = useState(1);
  const startedAt = useRef<number | undefined>(undefined);
  const capOf = useRef(capAt);
  capOf.current = capAt;

  // 듣는 동안 남은 시간 비율을 그림마다 다시 잰다
  useEffect(() => {
    if (!listening) {
      startedAt.current = undefined;
      setLeft(1);
      return;
    }
    startedAt.current = performance.now();
    let frame = 0;
    const tick = () => {
      const cap = capOf.current?.();
      const start = startedAt.current ?? performance.now();
      if (cap !== undefined && cap > start)
        setLeft(
          Math.min(1, Math.max(0, (cap - performance.now()) / (cap - start))),
        );
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [listening]);

  return (
    <span
      data-speak-ring=""
      className={cn("inline-flex self-center rounded-2xl p-1.5", className)}
      style={
        listening
          ? {
              background: `conic-gradient(var(--color-ink) ${left * FULL_TURN_DEG}deg, var(--color-paper) 0)`,
            }
          : undefined
      }
    >
      <BigButton
        data-speak=""
        data-listening={listening ? "" : undefined}
        aria-pressed={listening}
        disabled={disabled}
        onClick={onPress}
        className={cn(listening && "border-4 border-postit-speaking")}
      >
        <Mic aria-hidden className="size-7" />
        {listening && listeningLabel ? listeningLabel : label}
      </BigButton>
    </span>
  );
}

"use client";

// '말하기' 단추 한 조각(7절 '말하기 버튼' 행 · 4절 큰 버튼, 화면 검토 review-p11-4-design I-1). 한 번 눌러 듣기를 시작하고,
// 듣는 동안 단추 꼴이 바뀐다 — 단추와 카드색 틈을 두고 그 바깥에 남은 시간이 줄어드는 먹색 고리(P2b 듣기 손잡이의 상한 시각 capAt —
// speech.max_listen_seconds · 활동 시간 상한에서 온 수, 이 조각은 수를 박지 않는다) + 보이는 상태 data-listening. 듣는 중에 다시 누르면
// 듣기가 바로 끝난다(부르는 쪽이 손잡이 press). 고리가 먹색 단추에 붙으면 단추가 커진 것으로만 보여(요청자 iPad 2026-10-22 '고리 안 보임')
// 틈(gapClassName — 카드색, 기본 말하기 분홍)으로 띄우고 마이크 표시를 깜빡인다(motion-safe). 두 문장 이상 답은 듣는 동안 단추 글이 '다 말했어요'로 바뀐다(C37 — listeningLabel,
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
  gapClassName = "bg-postit-speaking",
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
  /** 고리와 단추 사이 틈의 색(바탕 카드색). 기본은 말하기 분홍. */
  gapClassName?: string;
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
      className={cn("inline-flex self-center rounded-[1.25rem] p-2", className)}
      style={
        listening
          ? {
              background: `conic-gradient(var(--color-ink) ${left * FULL_TURN_DEG}deg, var(--color-paper) 0)`,
            }
          : undefined
      }
    >
      <span
        className={cn(
          "inline-flex rounded-2xl p-1",
          listening ? gapClassName : "bg-transparent",
        )}
      >
        <BigButton
          data-speak=""
          data-listening={listening ? "" : undefined}
          aria-pressed={listening}
          disabled={disabled}
          onClick={onPress}
        >
          <Mic
            aria-hidden
            className={cn("size-7", listening && "motion-safe:animate-pulse")}
          />
          {listening && listeningLabel ? listeningLabel : label}
        </BigButton>
      </span>
    </span>
  );
}

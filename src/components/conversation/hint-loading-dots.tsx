// 힌트 글을 받는 동안의 점 셋(UX 검토 3판 U5-10 · 13절 C166). 1~3단계 힌트 단은 글을 서버에서 그때 받는데, 그동안 빈 점선 상자만
// 보여 아이가 눌린 줄 몰랐다. 아이 차례 힌트 단이 글이 아직 없을 때(text === undefined) 그 자리에 그린다. 높이는 힌트 단 글 한 줄과
// 같게(min-h-9 — 안내 글 20px 줄 높이 · 위아래 틈), 움직임 줄이기면 멈춘 점. 속성이 없으면(기존 방식) 훅이 아무것도 하지 않는다.
// 이야기 방식(chat — 13절 C243 보완 7 (5) · 정본 03 4절 7 · 99줄)은 그 단의 글 단과 같은 높이(chatHintLoadingMinHOf)로 두고, 받는 동안
// ui.wait_hint_seconds 의 둘째 값이 지나면 점 옆에 5초 줄('확인하고 있어요' — 모든 AI 기다림에 같은 줄)을 한 줄로 더한다(단 높이는 그대로).
import { useEffect, useState } from "react";
import { CHILD_SIZE } from "@/components/activities/common";
import { WAIT_TEXT } from "@/components/session/wait-hint";
import type { ChatHintTierView } from "@/core/conversation/chat-hints";
import { cn } from "@/lib/utils";

/** 점 수 · 점마다 늦춤(화면 꼴 값 — 말풍선 기다림 점과 같은 값). */
const DOTS = [0, 1, 2] as const;
const DOT_DELAY_MS = 150;
/** 초 → ms(단위 바꿈). */
const MS_PER_SECOND = 1000;

/**
 * 이야기 방식 힌트 받기 줄의 최소 높이(순수 — 클래스): 그 단에 글이 왔을 때 단 안에서 가장 큰 것의 높이와 같게. 듣기 단추가 있는 단은 누르는 곳
 * (CHILD_SIZE.target 56px), 영어 단(frame · sentence)은 영어 글 한 줄(CHILD_SIZE.english 24px 글 · 32px 줄), 뜻 단과 아직 종류를 모르는 단(첫
 * 누름 — 첫 단은 뜻 단)은 안내 글 한 줄(CHILD_SIZE.guide 20px 글 · 28px 줄)이다. 화면 꼴 값.
 */
export function chatHintLoadingMinHOf(
  tier: ChatHintTierView | undefined,
): string {
  if (tier?.listen === true) return "min-h-14";
  if (tier === undefined || tier.kind === "ko") return "min-h-7";
  return "min-h-8";
}

export function HintLoadingDots({
  chat,
}: {
  /** 이야기 방식: 줄의 최소 높이(chatHintLoadingMinHOf)와 ui.wait_hint_seconds(둘째 값이 지나면 5초 줄). 없으면 기존 꼴 그대로. */
  chat?: { minH: string; waitSeconds?: readonly [number, number] };
}) {
  const [late, setLate] = useState(false);
  const lateAfter = chat?.waitSeconds?.[1];
  useEffect(() => {
    if (lateAfter === undefined) return;
    setLate(false);
    const timer = window.setTimeout(
      () => setLate(true),
      Math.max(0, lateAfter * MS_PER_SECOND),
    );
    return () => window.clearTimeout(timer);
  }, [lateAfter]);
  const dots = DOTS.map((i) => (
    <span
      key={i}
      aria-hidden
      className="size-3 rounded-full bg-ink motion-safe:animate-bounce"
      style={{ animationDelay: `${i * DOT_DELAY_MS}ms` }}
    />
  ));
  if (!chat)
    return (
      <span
        data-hint-loading=""
        role="status"
        className="flex min-h-9 items-center gap-2"
      >
        {dots}
      </span>
    );
  return (
    <span
      data-hint-loading=""
      role="status"
      className={cn("flex flex-wrap items-center gap-x-3", chat.minH)}
    >
      <span className="flex items-center gap-2">{dots}</span>
      {late ? (
        <span data-wait-line="" className={CHILD_SIZE.guide}>
          {WAIT_TEXT.checking}
        </span>
      ) : null}
    </span>
  );
}

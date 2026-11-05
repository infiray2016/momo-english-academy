"use client";

// 1-가 하루 안전 상한 안내(11절 (7) · 13절 C50 (2) · C80 · 8절 'AI 쉬는 중' 동안 행의 문구 — 모든 영역 같은 문구, C16 · C123).
// 아이 화면에 '오늘은 끝'으로 보이지 않는다(13절 2026-10-15 실시간 호출 결정). 1-나 'AI 쉬는 중'도 같은 조각을 쓴다.
// 글은 '[이름](이/가) 잠깐 쉬어요 …'(문구 표 aiRest — 고르기 전 '선생님이'). 회화 틀은 세션 선생님을 넘기고, 그 밖은 집 선생님 공유 값.
// UI · UX 묶음 0-가(spec 설계 4 · [승인 UX3] · [승인 UX4] · 8절 R-49 · R-50 · 3절 R-11 · R-15):
// - 쉬는 안내 화면(세션 · 회화 도중, 결과 · 마무리의 큰 단추 자리 — AiRest): 큰 '홈' · 작은 '다시 해 볼래요'. 다시 해 보기는 같은 판정
//   함수를 다시 읽고(쓰는 쪽이 넘김 — 세션 · 회화는 recheckAiRest, 결과 · 마무리는 그 수업 시작의 재판정), 풀리면 같은 자리, 아니면
//   '아직 쉬고 있어요. 조금 뒤에 다시 눌러 봐요' 한 줄을 더한다. 확인 호출(1-나)은 같은 판정 함수가 더한다(plan 위험 10).
// - 홈 · 수업 목록(AiRestLine): 화면을 떠나지 않고 누른 카드 아래 한 줄 칸에 쉼 글. 다시 누르면 다시 판정한다(카드가 다시 해 보기).
// 묶음 5-가(spec 설계 5.4 막힘 · 쉼 · 오류 행 · D-1): 쓰는 쪽이 fill 을 넘기면 쉬는 안내가 큰 판(세션의 활동 판) 안을 채우고 가운데에 놓인다.
// 넘기지 않으면 지금 꼴 그대로다(결과 단추 자리 · 회화 틀 — 회화는 묶음 6 이 맞춘다). 단추 차례 · 문구는 그대로다.
import { useState } from "react";
import {
  BigButton,
  BigLink,
  SmallButton,
  SmallLink,
  StatusLine,
} from "@/components/board/board";
import { LESSON_START_TEXT } from "@/components/session/lesson-start-text";
import { stuckButtonsOf } from "@/components/session/stuck-buttons";
import { useTeacherName } from "@/components/teacher/teacher-provider";
import { TEACHER_TEXT } from "@/core/teacher/name";
import { cn } from "@/lib/utils";

export const AI_REST_TEXT = {
  home: "홈",
  /** 쉬는 화면의 다시 확인(막힘 판과 같은 말 — spec 설계 6). */
  retry: "다시 해 볼래요",
  /** 다시 확인 뒤에도 쉼([승인 UX4] · spec 설계 6 새 문구). */
  still: "아직 쉬고 있어요. 조금 뒤에 다시 눌러 봐요",
} as const;

/** 쉼 다시 확인(서버 — 접근 확인 뒤 같은 판정 함수). */
export type AiRestRecheck = () => Promise<{ resting: boolean }>;

/** 쉼 다시 확인 결과: 풀림 · 아직 쉼 · 확인이 닿지 않음. */
export type AiRestRetryResult = "released" | "still" | "failed";

/** 확인이 닿지 않은 때의 한 줄(7절 네트워크 행 · spec N-14 — 있는 글: 끊겼으면 '인터넷이 끊겼어요 …', 아니면 '지금은 저장할 수 없어요 …'). */
export function troubleTextOf(online: boolean): string {
  return online ? LESSON_START_TEXT.failed : LESSON_START_TEXT.offline;
}

/** 쉬는 화면에 더할 끊김 · 실패 한 줄(순수): 확인이 닿지 않았을 때만. */
export function aiRestTroubleOf(
  result: AiRestRetryResult | undefined,
  online: boolean,
): string | undefined {
  return result === "failed" ? troubleTextOf(online) : undefined;
}

/**
 * 쉼 다시 확인 한 번(순수 · 비동기 — 단추와 떼어 시험한다): 다시 읽어 풀렸으면 onReleased(같은 자리로) 뒤 "released", 아직 쉬면 "still"
 * (같은 쉬는 화면 + '아직 쉬고 있어요 …'), 확인이 닿지 않으면 "failed"(같은 쉬는 화면 + 끊김 · 실패 한 줄 — 검토 0-가 M2).
 */
export async function runAiRestRetry({
  recheck,
  onReleased,
}: {
  recheck: AiRestRecheck;
  onReleased: () => void;
}): Promise<AiRestRetryResult> {
  let out: { resting: boolean };
  try {
    out = await recheck();
  } catch {
    return "failed";
  }
  if (out.resting) return "still";
  onReleased();
  return "released";
}

/** 쉬는 화면 다시 해 보기 상태(세션 · 회화 틀): 확인하는 동안 · 다시 확인 뒤에도 쉼. */
export function useAiRestRetry({
  recheck,
  onReleased,
}: {
  recheck: AiRestRecheck;
  onReleased: () => void;
}): AiRestRetry {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<AiRestRetryResult | undefined>();
  const [online, setOnline] = useState(true);
  return {
    checking,
    still: result === "still",
    trouble: aiRestTroubleOf(result, online),
    onRetry: () => {
      if (checking) return;
      setChecking(true);
      void runAiRestRetry({ recheck, onReleased })
        .then((r) => {
          setOnline(navigator.onLine);
          setResult(r);
        })
        .finally(() => setChecking(false));
    },
  };
}

/** 쉬는 화면의 다시 해 보기(쓰는 쪽이 넘김). */
export type AiRestRetry = {
  onRetry: () => void;
  /** 확인하는 동안(단추를 흐림). */
  checking?: boolean;
  /** 다시 확인했는데 아직 쉼('아직 쉬고 있어요 …' 한 줄). */
  still?: boolean;
  /** 다시 확인이 닿지 않음(있는 끊김 · 실패 글 한 줄 — 검토 0-가 M2). */
  trouble?: string | undefined;
};

/**
 * 쉬는 안내 화면: 안내 → 큰 '홈' → 작은 '다시 해 볼래요'(넘기면) → 아직 쉬면 한 줄. onHome 이 있으면 '홈'은 단추(세션 틀 — 대기열을
 * 비운 뒤 홈), 없으면 홈으로 가는 링크.
 */
export function AiRest({
  onHome,
  busy = false,
  teacherName,
  retry,
  fill = false,
}: {
  onHome?: () => void;
  busy?: boolean;
  /** 큰 판 안을 채우고 가운데에 놓는다(세션 — 설계 5.4). */
  fill?: boolean;
  /** 이름 자리(회화 틀 — 세션 선생님). 없으면 집 선생님 공유 값. */
  teacherName?: string | undefined;
  retry?: AiRestRetry | undefined;
}) {
  const shared = useTeacherName();
  const order = stuckButtonsOf("resting");
  const homeButton = (size: "big" | "small") => {
    if (onHome) {
      const Button = size === "big" ? BigButton : SmallButton;
      return (
        <Button
          key="home"
          data-button-size={size}
          disabled={busy}
          onClick={onHome}
        >
          {AI_REST_TEXT.home}
        </Button>
      );
    }
    const Link = size === "big" ? BigLink : SmallLink;
    return (
      <Link key="home" data-button-size={size} href="/">
        {AI_REST_TEXT.home}
      </Link>
    );
  };
  const retryButton = (size: "big" | "small") => {
    if (!retry) return null;
    const Button = size === "big" ? BigButton : SmallButton;
    return (
      <Button
        key="retry"
        data-ai-rest-retry=""
        data-button-size={size}
        disabled={busy || retry.checking === true}
        onClick={retry.onRetry}
      >
        {AI_REST_TEXT.retry}
      </Button>
    );
  };
  const button = (which: "retry" | "home", size: "big" | "small") =>
    which === "home" ? homeButton(size) : retryButton(size);
  return (
    <div
      data-ai-rest=""
      className={cn(
        "flex flex-col items-center gap-6 py-6",
        fill && "flex-1 justify-center gap-8",
      )}
    >
      <p className="text-center font-heading text-[28px] leading-snug">
        {TEACHER_TEXT.aiRest(teacherName ?? shared)}
      </p>
      {button(order.big, "big")}
      {button(order.small, "small")}
      {retry?.still ? (
        <StatusLine className="justify-center text-center">
          <span data-ai-rest-still="">{AI_REST_TEXT.still}</span>
        </StatusLine>
      ) : null}
      {retry?.trouble ? (
        <StatusLine tone="error" className="justify-center text-center">
          <span data-ai-rest-trouble="">{retry.trouble}</span>
        </StatusLine>
      ) : null}
    </div>
  );
}

/**
 * 홈 · 수업 목록의 쉼 한 줄 칸(R-11 · R-15 — 누른 카드 아래, 기다림 줄 자리). 단추를 두지 않는다(카드를 다시 누르면 다시 판정). 같은 수업을
 * 다시 눌러도 쉬면(again) '아직 쉬고 있어요 …'를 더한다.
 */
export function AiRestLine({
  teacherName,
  again = false,
}: {
  teacherName?: string | undefined;
  again?: boolean;
}) {
  const shared = useTeacherName();
  return (
    <div
      data-ai-rest-line=""
      className="flex flex-col items-center gap-1 text-center"
    >
      <StatusLine className="justify-center text-center">
        {TEACHER_TEXT.aiRest(teacherName ?? shared)}
      </StatusLine>
      {again ? (
        <StatusLine className="justify-center text-center">
          <span data-ai-rest-still="">{AI_REST_TEXT.still}</span>
        </StatusLine>
      ) : null}
    </div>
  );
}

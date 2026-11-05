"use client";

// 마이크 막힘 안내 글(7절 '마이크를 쓸 수 없을 때' · 오류 행, 세션 · 회화 · 배치가 같이 씀). 첫 줄은 막힘 종류의 안내, 아이패드 사파리면
// 둘째 줄 '아이패드 제어 센터에서 무음 모드를 꺼 주세요'(13절 C111 · C106 (1) · C108 — 요청자 실측에서 사파리 읽어 주기 · 인식이 모두
// 막힌 원인, 전체 디자인 리뷰 I-1). '홈' 단추 · 틀은 쓰는 쪽이 둔다. '다시 한 번 말해 볼까요' 줄에는 넣지 않는다(한 화면 한 안내).
// 13절 C166 R6(UX 검토 U6-1 · U4-5): 쓰는 쪽이 retry 를 넘기면 '다시 해 볼래요' 단추 — 누르면 그 기기 마이크를 다시 확인하고(음성 접점
// checkMicrophone, 누름 처리 안에서 부름), 되면 저장된 '쓸 수 없음'을 지우고 같은 자리로(onRecovered), 안 되면 같은 막힘 화면 그대로.
// UI · UX 묶음 0-가([승인 UX3] · spec 설계 4 · 7절 '막힘 화면' 행 R-47): 세 막힘은 세션 · 회화 · 배치에서 같은 꼴의 막힘 판(MicBlockedPanel) —
// 안내 줄, 큰 '다시 해 볼래요', 작은 '홈'. 그 화면 글이 권하는 행동이 큰 단추다(막힘은 다시 해 보기, 쉼은 홈 — stuckButtonsOf).
// 묶음 5-가(spec 설계 5.4 막힘 · 쉼 · 오류 행 · D-1): 쓰는 쪽이 fill 을 넘기면 막힘 판이 큰 판(세션 · 배치의 FamilyBoard) 안을 채우고 가운데에
// 놓인다(표지 data-stuck-fill). 넘기지 않으면 지금 꼴 그대로다(회화 틀은 묶음 6 이 맞춘다). 안내 줄은 판의 큰 글이다.
import { useEffect, useState } from "react";
import { CHILD_SIZE } from "@/components/activities/common";
import {
  BigButton,
  BigLink,
  SmallButton,
  SmallLink,
} from "@/components/board/board";
import {
  MIC_BLOCKED_TEXT,
  type MicBlockedKind,
  type StuckButton,
  type StuckKind,
  stuckButtonsOf,
} from "@/components/session/stuck-buttons";
import { isIpadSafari } from "@/core/speech/device";
import { clearMicState, readDeviceVerdict } from "@/lib/mic-state";
import type { MicrophoneCheck, SpeechPort } from "@/lib/speech/types";
import { cn } from "@/lib/utils";

export type { MicBlockedKind, StuckButton, StuckKind };
// 막힘 문구 · 단추 차례는 의존 없는 모듈(stuck-buttons)에 있고 여기서 그대로 내보낸다(묶음 2-가 보탬 — 앱 오류 판이 음성 층을 들이지 않게).
export { MIC_BLOCKED_TEXT, stuckButtonsOf };

/** 다시 확인 뒤 막힘(순수): 마이크가 되면 막힘 없음(같은 자리로), 안 되면 같은 막힘 그대로. */
export function micRetryNextOf(
  kind: MicBlockedKind,
  check: MicrophoneCheck,
): MicBlockedKind | undefined {
  return check.ok ? undefined : kind;
}

/**
 * 다시 해 보기 한 번(검토 A M-5 — 단추와 떼어 시험한다): 누름 처리 안에서 잠금을 풀고 마이크를 다시 확인한다. 되면 저장된 '쓸 수 없음'을
 * 지우고(clear) 같은 자리로(onRecovered), 안 되면 아무것도 하지 않는다(같은 막힘 화면).
 */
export async function runMicRetry({
  kind,
  speech,
  clear = clearMicState,
  onRecovered,
}: {
  kind: MicBlockedKind;
  speech: SpeechPort;
  clear?: () => void;
  onRecovered: () => void;
}): Promise<void> {
  speech.unlockFromGesture();
  const check = await speech.checkMicrophone();
  if (micRetryNextOf(kind, check) !== undefined) return;
  clear();
  onRecovered();
}

/** 막힘 화면의 다시 해 보기(쓰는 쪽이 넘김 — 음성 접점과 되면 할 일). */
export type MicRetry = {
  speech: SpeechPort | undefined;
  /** 마이크가 다시 되면(쓰는 쪽이 막힘을 풀고 셈을 비운다). */
  onRecovered: () => void;
  disabled?: boolean;
};

/** 막힘 안내 줄(순수 함수): 첫 줄 + 아이패드 사파리면 무음 모드 줄. */
export function micBlockedLinesOf(
  kind: MicBlockedKind,
  ipadSafari: boolean,
): string[] {
  return [
    MIC_BLOCKED_TEXT[kind],
    ...(ipadSafari ? [MIC_BLOCKED_TEXT.ipadSilentMode] : []),
  ];
}

/** 이 기기가 아이패드 사파리인가(렌더 뒤에 읽는다 — 서버 그림과 첫 그림은 거짓). */
export function useIpadSafari(): boolean {
  const [ipadSafari, setIpadSafari] = useState(false);
  useEffect(() => {
    setIpadSafari(isIpadSafari(readDeviceVerdict()));
  }, []);
  return ipadSafari;
}

/** 막힘 안내 글(첫 줄 큰 글 · 둘째 줄 안내 20px — 아이패드 사파리면 무음 모드 줄). 단추는 막힘 판(MicBlockedPanel)이 둔다. */
export function MicBlockedText({
  kind,
  ipadSafari,
}: {
  kind: MicBlockedKind;
  ipadSafari: boolean;
}) {
  const [first, hint] = micBlockedLinesOf(kind, ipadSafari);
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <p data-blocked-line="" className="font-heading text-[28px] leading-snug">
        {first}
      </p>
      {hint ? (
        <p data-blocked-hint="" className={CHILD_SIZE.guide}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** 막힘 판의 '홈': 단추(세션 · 회화 틀 — 대기열을 비운 뒤 홈) 또는 링크(배치). */
export type StuckHome = { onClick: () => void } | { href: string };

/**
 * 막힘 판(7절 '막힘 화면' 행 · [승인 UX3]): 안내 줄 → 큰 '다시 해 볼래요' → 작은 '홈'. '다시 해 볼래요'는 확인하는 동안 흐리고 '아무 말이나
 * 한마디 해 주세요'를 보이며, 되면 onRecovered(쓰는 쪽이 막힘을 풀고 실패 셈을 비워 같은 자리로), 안 되면 같은 막힘 판 그대로다.
 */
export function MicBlockedPanel({
  kind,
  ipadSafari,
  retry,
  home,
  busy = false,
  fill = false,
}: {
  kind: MicBlockedKind;
  ipadSafari: boolean;
  retry: MicRetry;
  home: StuckHome;
  busy?: boolean;
  /** 큰 판 안을 채우고 가운데에 놓는다(세션 · 배치 — 설계 5.4). */
  fill?: boolean;
}) {
  const [checking, setChecking] = useState(false);
  const { speech } = retry;
  const order = stuckButtonsOf("blocked");
  const retryButton = (size: "big" | "small") => {
    const Button = size === "big" ? BigButton : SmallButton;
    return (
      <Button
        key="retry"
        data-mic-retry=""
        data-button-size={size}
        disabled={!speech || checking || busy || retry.disabled === true}
        onClick={() => {
          if (!speech) return;
          setChecking(true);
          // 누름 처리 안에서 인식 객체를 시작한다(iPad Safari — runMicRetry 는 await 전에 start 까지 부른다)
          void runMicRetry({ kind, speech, onRecovered: retry.onRecovered })
            .catch(() => undefined)
            .finally(() => setChecking(false));
        }}
      >
        {MIC_BLOCKED_TEXT.retry}
      </Button>
    );
  };
  const homeButton = (size: "big" | "small") => {
    if ("href" in home) {
      const Link = size === "big" ? BigLink : SmallLink;
      return (
        <Link key="home" data-button-size={size} href={home.href}>
          {MIC_BLOCKED_TEXT.home}
        </Link>
      );
    }
    const Button = size === "big" ? BigButton : SmallButton;
    return (
      <Button
        key="home"
        data-button-size={size}
        disabled={busy}
        onClick={home.onClick}
      >
        {MIC_BLOCKED_TEXT.home}
      </Button>
    );
  };
  const button = (which: StuckButton, size: "big" | "small") =>
    which === "retry" ? retryButton(size) : homeButton(size);
  return (
    <div
      data-stuck-fill={fill ? "" : undefined}
      className={cn(
        "flex flex-col items-center gap-6",
        fill && "flex-1 justify-center gap-8",
      )}
    >
      <MicBlockedText kind={kind} ipadSafari={ipadSafari} />
      {button(order.big, "big")}
      {checking ? (
        <p data-mic-retry-speak="" role="status" className={CHILD_SIZE.guide}>
          {MIC_BLOCKED_TEXT.retrySpeak}
        </p>
      ) : null}
      {button(order.small, "small")}
    </div>
  );
}

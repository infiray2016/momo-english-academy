"use client";

// 마이크 막힘 안내 글(7절 '마이크를 쓸 수 없을 때' · 오류 행, 세션 · 회화 · 배치가 같이 씀). 첫 줄은 막힘 종류의 안내, 아이패드 사파리면
// 둘째 줄 '아이패드 제어 센터에서 무음 모드를 꺼 주세요'(13절 C111 · C106 (1) · C108 — 요청자 실측에서 사파리 읽어 주기 · 인식이 모두
// 막힌 원인, 전체 디자인 리뷰 I-1). 글만 그리고 단추 · 틀은 쓰는 쪽이 둔다. '다시 한 번 말해 볼까요' 줄에는 넣지 않는다(한 화면 한 안내).
import { useEffect, useState } from "react";
import { CHILD_SIZE } from "@/components/activities/common";
import { isIpadSafari } from "@/core/speech/device";
import { readDeviceVerdict } from "@/lib/mic-state";

export const MIC_BLOCKED_TEXT = {
  needsMic: "마이크가 필요해요. 부모님께 말해 주세요",
  stalled: "마이크가 잘 안 돼요. 부모님께 말해 주세요",
  silent: "말소리가 잘 안 들려요. 부모님께 말해 주세요",
  /** plan-p11a 정본 밖 문구 표(C111) — 아이패드 사파리만. */
  ipadSilentMode: "아이패드 제어 센터에서 무음 모드를 꺼 주세요",
} as const;

export type MicBlockedKind = "needsMic" | "stalled" | "silent";

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

/** 막힘 안내 글(첫 줄 큰 글 · 둘째 줄 안내 20px). */
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

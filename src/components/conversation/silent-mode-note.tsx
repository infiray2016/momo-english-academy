"use client";

// '시작!' 화면 무음 모드 한 줄(UX 검토 3판 U5-8 · 13절 C166 — 정본 밖 문구). 아이패드 사파리는 무음 모드면 글만 흐르고 소리가 없는데
// 안내가 막힘 화면에야 나와서, 회화 '시작!' 아래에 한 줄을 먼저 둔다. 아이패드 사파리일 때만 그리고 그 밖 기기는 그리지 않는다.
// 기기 판정은 막힘 안내와 같은 훅(mic-blocked useIpadSafari — 판별 길 하나, 검토 B M-9)이고, 그리기 뒤에 읽는다(서버 그림과 같게
// 처음엔 없음). 속성 없음.
import { CHILD_SIZE } from "@/components/activities/common";
import { useIpadSafari } from "@/components/session/mic-blocked";
import { cn } from "@/lib/utils";

/** 무음 모드 한 줄(해요체). */
export const SILENT_MODE_TEXT = "소리가 안 나면 무음 모드를 꺼 주세요";

/** 한 줄 그림(판정과 떼어 시험한다). shown 이 거짓이면 그리지 않는다. */
export function SilentModeLine({ shown }: { shown: boolean }) {
  if (!shown) return null;
  return (
    <p data-talk-silent-note="" className={cn(CHILD_SIZE.guide, "text-center")}>
      {SILENT_MODE_TEXT}
    </p>
  );
}

/** 아이패드 사파리면 무음 모드 한 줄, 아니면 없음. */
export function SilentModeNote() {
  return <SilentModeLine shown={useIpadSafari()} />;
}

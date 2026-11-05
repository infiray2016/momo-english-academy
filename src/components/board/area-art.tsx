// 영역 그림 넷(UI · UX plan 묶음 3 · spec 설계 5.3 '영역 그림과 연필 낙서는 시안 ② 파일 안의 선 그림을 옮겨 쓴다' · R-4 · 위험 14).
// 시안 ② 파일(.superpowers/sdd/2026-10-29-UI-UX-개선 디자인 시안)의 il-book-hand(읽기) · il-pencil-hand(쓰기) · il-speak-hand(말하기) ·
// il-chat-hand(회화) 좌표를 그대로 옮겼다. 토리 · 모모 그림(tori-hand · momo-hand)은 쓰지 않는다(마스코트는 캐릭터 표본 뒤, L-18).
// 바꾼 것: 색은 디자인 토큰 클래스(채움 · 획)로 바꿨고, 손그림 흔들림 필터(f-sketch)와 책 귀퉁이 빗금(p-hatch)은 뺐다(쪽마다 필터 id 를 새로
// 만들지 않게). 말하기 말풍선 채움은 분홍 카드 위에서 보이게 종이 색이다. 글자가 없는 꾸밈 그림이라 보조 기술에서 숨긴다(카드 이름은 글이 말함).
// 훅이 없어 서버 · 클라이언트 둘 다에서 그린다.
import type { ReactNode } from "react";
import type { Area } from "@/core/seed/structure";
import { cn } from "@/lib/utils";

/** 선 굵기(시안 ② 그대로 — 그림 좌표 단위). */
const ART_STROKE = "3.2";
/** 속줄 굵기(책 줄 · 공책 줄). */
const ART_FINE = "2.4";
/** 연필 몸통 결 줄 굵기. */
const ART_GRAIN = "2";
/** 말풍선 속줄 굵기. */
const ART_LINE = "3";
/** 말하기 소리 물결 굵기. */
const ART_WAVE = "3.6";
/** 속줄 흐림(책 · 말풍선 속 글줄). */
const ART_FAINT = "0.55";
const ART_FAINTER = "0.4";
const ART_GRAIN_OPACITY = "0.45";

/** 그림 이름(시안 ② 기호 id) · viewBox(그림 좌표). */
export const AREA_ART = {
  reading: { name: "il-book-hand", viewBox: "0 0 180 150" },
  writing: { name: "il-pencil-hand", viewBox: "0 0 180 150" },
  speaking: { name: "il-speak-hand", viewBox: "0 0 180 150" },
  talk: { name: "il-chat-hand", viewBox: "0 0 180 150" },
} as const satisfies Record<Area, { name: string; viewBox: string }>;

/** 그림 공통 선(먹색 획 · 둥근 끝). */
const LINE = "stroke-ink";

function Book() {
  return (
    <>
      <path
        d="M8 46 Q50 34 90 48 Q130 34 172 46 L172 126 Q130 114 90 130 Q50 114 8 126 Z"
        className="fill-tape-1"
      />
      <path
        d="M16 38 Q52 28 88 42 L88 120 Q52 106 16 116 Z"
        className="fill-paper"
      />
      <path
        d="M164 38 Q128 28 92 42 L92 120 Q128 106 164 116 Z"
        className="fill-paper"
      />
      <path
        d="M28 56 Q52 50 76 59 M28 72 Q52 66 76 75 M28 88 Q48 83 68 89"
        fill="none"
        strokeWidth={ART_FINE}
        opacity={ART_FAINT}
      />
      <path
        d="M104 59 Q128 50 152 56 M104 75 Q128 66 152 72 M112 89 Q132 82 152 88"
        fill="none"
        strokeWidth={ART_FINE}
        opacity={ART_FAINT}
      />
      <path
        d="M120 33 L131 33 L131 142 L125.5 134 L120 142 Z"
        className="fill-postit-speaking"
      />
    </>
  );
}

function Pencil() {
  return (
    <>
      <g transform="rotate(-6 80 80)">
        <rect
          x="20"
          y="20"
          width="114"
          height="114"
          rx="9"
          className="fill-paper"
        />
        <path
          d="M36 54 H120 M36 72 H120 M36 90 H120 M36 108 H100"
          className="stroke-postit-writing"
          strokeWidth={ART_FINE}
        />
        <path d="M36 54 Q50 43 62 54 T92 54" fill="none" />
      </g>
      <g transform="translate(100 26) rotate(40)">
        <rect
          x="0"
          y="0"
          width="26"
          height="92"
          rx="3"
          className="fill-postit-reading"
        />
        <path
          d="M17 6 V86"
          strokeWidth={ART_GRAIN}
          opacity={ART_GRAIN_OPACITY}
        />
        <rect
          x="-1"
          y="-14"
          width="28"
          height="16"
          rx="3"
          className="fill-paper"
        />
        <rect
          x="0"
          y="-31"
          width="26"
          height="19"
          rx="8"
          className="fill-postit-speaking"
        />
        <path d="M0 92 L26 92 L13 122 Z" className="fill-kraft" />
        <path d="M8.7 112 L17.3 112 L13 122 Z" className="fill-ink" />
      </g>
    </>
  );
}

function Speak() {
  return (
    <>
      <path
        d="M18 24 h96 a20 20 0 0 1 20 20 v40 a20 20 0 0 1 -20 20 h-58 l-22 18 v-18 h-16 a20 20 0 0 1 -20 -20 v-40 a20 20 0 0 1 20 -20 z"
        className="fill-paper"
      />
      <path
        d="M40 64 q8 -14 16 0 t16 0 t16 0 t16 0"
        fill="none"
        strokeWidth={ART_WAVE}
      />
      <path d="M148 50 c8 10 8 24 0 34" fill="none" />
      <path d="M162 40 c14 16 14 38 0 54" fill="none" />
    </>
  );
}

function Chat() {
  return (
    <>
      <path
        d="M22 22 h86 a18 18 0 0 1 18 18 v38 a18 18 0 0 1 -18 18 h-52 l-20 16 v-16 h-14 a18 18 0 0 1 -18 -18 v-38 a18 18 0 0 1 18 -18 z"
        className="fill-paper"
      />
      <path
        d="M36 48 h56 M36 64 h38"
        strokeWidth={ART_LINE}
        opacity={ART_FAINTER}
      />
      <path
        d="M84 62 h68 a16 16 0 0 1 16 16 v30 a16 16 0 0 1 -16 16 h-8 v16 l-20 -16 h-40 a16 16 0 0 1 -16 -16 v-30 a16 16 0 0 1 16 -16 z"
        className="fill-postit-talk"
      />
      <circle cx="104" cy="93" r="5" className="fill-ink" stroke="none" />
      <circle cx="124" cy="93" r="5" className="fill-ink" stroke="none" />
      <circle cx="144" cy="93" r="5" className="fill-ink" stroke="none" />
    </>
  );
}

const DRAW: Record<Area, () => ReactNode> = {
  reading: Book,
  writing: Pencil,
  speaking: Speak,
  talk: Chat,
};

/** 영역 그림 한 장(꾸밈, aria-hidden). 크기는 className 으로(가로세로 비는 viewBox 그대로). */
export function AreaArt({
  area,
  className,
}: {
  area: Area;
  className?: string;
}) {
  const Draw = DRAW[area];
  return (
    <svg
      aria-hidden
      data-area-art={area}
      viewBox={AREA_ART[area].viewBox}
      className={cn(LINE, "pointer-events-none", className)}
      strokeWidth={ART_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Draw />
    </svg>
  );
}

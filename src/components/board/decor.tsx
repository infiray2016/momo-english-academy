// 책상 바탕 · 꾸밈 층(UI · UX plan 묶음 2-가 · spec 설계 5.2 바탕 무늬 · 5.3 바탕 · 꾸밈 규칙, C168 디자인 ② 밝은 책상).
// 바탕 층은 화면 전체에 붙은 한 장(모눈 28px · 여백 선 왼쪽 58px · 종이 결 한 겹 · 책상 색 — globals.css desk-surface)이고, 연필 낙서는 시안 ②
// 파일(.superpowers/sdd/2026-10-29-UI-UX-개선 디자인 시안)의 선 그림을 옮겨(세로 띠에 맞게 가로 · 세로만 바꿈) 화면 왼쪽 · 오른쪽 가장자리 띠에만
// 둔다. 가장자리 띠는 아이 화면 한 장(ChildScreen)의 옆 여백(px-6 = 24px)이라 낙서는 글 · 단추 · 종이와 겹치지 않는다(AC-23e (3)).
// 꾸밈이라 보조 기술에서 숨기고(aria-hidden) 누름을 받지 않으며 움직이지 않는다. 낙서마다 data-decor(겹침 훑기가 찾는 표지)를 단다.
// 훅이 없어 서버 · 클라이언트 둘 다에서 그린다.
import type { CSSProperties } from "react";

/** 낙서 너비(px) — 옆 여백 24px 안. */
const DOODLE_WIDTH = 18;
/** 화면 끝에서 낙서까지(px). */
const DOODLE_INSET = 3;
/** 낙서 획(px, 시안 ② .doodle). 크기를 줄여도 굵기는 그대로(non-scaling-stroke). */
const DOODLE_STROKE = 2.6;

type Doodle = {
  name: string;
  side: "left" | "right";
  /** 화면 높이에 대한 위치. */
  top: string;
  viewBox: string;
  /** 높이 ÷ 너비(viewBox 비). */
  ratio: number;
  path: string;
};

/** 시안 ② 의 연필 낙서 넷(홈 물결 · 결과 반짝 · 결과 소용돌이 · 회화 하트). 물결은 세로 띠에 맞게 x · y 를 바꿨다. */
const DOODLES: readonly Doodle[] = [
  {
    name: "wave",
    side: "left",
    top: "24%",
    viewBox: "0 0 30 120",
    ratio: 4,
    path: "M18 4 C6 20 28 30 16 46 S6 74 18 90 S24 110 12 116",
  },
  {
    name: "spark",
    side: "left",
    top: "68%",
    viewBox: "0 0 60 60",
    ratio: 1,
    path: "M30 6 L30 54 M6 30 L54 30 M13 13 L47 47 M47 13 L13 47",
  },
  {
    name: "swirl",
    side: "right",
    top: "40%",
    viewBox: "0 0 70 70",
    ratio: 1,
    path: "M35 8 C50 8 60 20 60 34 C60 48 48 58 36 58 C24 58 16 50 16 40 C16 30 24 24 32 24 C40 24 46 30 46 36",
  },
  {
    name: "heart",
    side: "right",
    top: "84%",
    viewBox: "0 0 70 56",
    ratio: 0.8,
    path: "M35 50 C10 34 4 22 12 12 C20 4 30 8 35 16 C40 8 50 4 58 12 C66 22 60 34 35 50Z",
  },
];

/** 책상 바탕 한 장과 가장자리 낙서. 아이 화면 한 장(ChildScreen) 맨 뒤 층에 둔다. */
export function DeskDecor() {
  return (
    <div
      aria-hidden
      data-desk=""
      className="desk-surface pointer-events-none fixed inset-0 -z-10"
    >
      {DOODLES.map((d) => {
        const style: CSSProperties = {
          [d.side]: DOODLE_INSET,
          top: d.top,
          width: DOODLE_WIDTH,
          height: DOODLE_WIDTH * d.ratio,
        };
        return (
          <svg
            key={d.name}
            aria-hidden
            data-decor={d.name}
            viewBox={d.viewBox}
            fill="none"
            stroke="currentColor"
            strokeWidth={DOODLE_STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute text-doodle opacity-(--doodle-opacity)"
            style={style}
          >
            <path d={d.path} vectorEffect="non-scaling-stroke" />
          </svg>
        );
      })}
    </div>
  );
}

// 수업 카드 꼴(수업 목록 · 지난 수업이 같이 씀 — 같은 종류 종이는 화면이 달라도 같은 크기 · 한 판 한 간격, 13절 C114 ·
// design-taste §4.1 · 전체 디자인 리뷰 묶음 #12 · #14). 화면 꼴 상수다(설계 숫자 아님).

/**
 * 카드 칸 격자: 칸 너비를 세로 168px · 가로 130px 로 고정(간격 16px · 12px)하고 가운데 두어 판 양쪽 여백이 같다(#18 격자 셈).
 * 세로 칸은 위 끝 표지('여기부터 해요' · '안 해 본 수업' — 이름표 22px, C82)가 한 줄로 드는 값, 가로 칸은 목록 판(844px)에 한 줄 6장이
 * 들어 실시드 12~15장이 가로 한 화면에 드는 값이다(plan-p10b) — 가로에서는 표지가 22px 그대로 두 줄로 접힌다(디자인 fix 1c). dense — 기다림 · 안내 · 오류 한 줄 칸(LESSON_ROW)이 누른 카드 줄 바로 뒤에 들어가고 뒤 카드가 앞 빈칸을
 * 채운다(#8 — 칸이 카드를 늘이지 않음).
 */
export const LESSON_GRID =
  "grid grid-flow-row-dense grid-cols-[repeat(auto-fill,10.5rem)] justify-center gap-4 landscape:grid-cols-[repeat(auto-fill,8.125rem)] landscape:gap-3";

/**
 * 카드 크기(높이 고정 — 두 방향 160px). 안 내용은 번호 줄 · 제목 두 줄까지, 표지('여기부터 해요' · '안 해 본 수업')는 위 끝에 붙임.
 * 가로는 표지가 두 줄로 접히므로 모든 카드가 위 여백 56px 로 두 줄 표지 자리를 잡아 둔다(같은 높이 — C114): 표지는 카드 위 −16px 에서
 * 22px × leading-tight 1.25 × 두 줄 + 위아래 여백 8 = 63px 이라 47px 에서 끝나고, 번호 줄은 56px 에서 시작해 9px 떨어진다.
 */
export const LESSON_CARD =
  "h-40 gap-2 p-4 pt-8 landscape:h-40 landscape:gap-1 landscape:p-3 landscape:pt-14";

/** 카드 안 제목(두 줄까지 — 넘치면 줄임표, 읽기 도구에는 온 제목). */
export const LESSON_TITLE = "line-clamp-2";

/** 수업 번호. */
export const LESSON_NO =
  "font-heading text-4xl leading-none landscape:text-3xl";

/**
 * 카드 위 끝에 붙는 표지(이름표 22px — C82, 카드 너비 안 가운데). 세로는 한 줄, 가로(좁은 칸)는 낱말 사이에서만 두 줄로 접는다(글자
 * 바탕의 keep-all — 낱말 안에서는 끊지 않음, 디자인 fix 1c).
 */
export const LESSON_BADGE =
  "absolute inset-x-1 -top-4 z-10 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-center font-heading text-[22px] leading-tight text-paper landscape:whitespace-normal";

/** 기다림 · 안내 · 오류 한 줄 칸(격자 한 줄 전체 — 누른 카드 줄 바로 뒤). */
export const LESSON_ROW = "col-span-full flex flex-col items-center gap-1";

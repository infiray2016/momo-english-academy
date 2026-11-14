// 수업 틀(src/components/conversation/talk-frame.tsx)에서 옮긴 클래스 글과 효과의 글. 쪽(entry.tsx)이 이 클래스로 판을 짜고, 장면이 talk-frame.tsx 에
// 같은 글이 그대로 있는지 먼저 본다(어긋나면 이 파일과 쪽을 틀에 맞춘다 — 옮긴 짜임이 실제와 다른 채로 재지 않게).

export const FRAME_CLASSES = {
  layout: "flex flex-col gap-6 lg:flex-row",
  column:
    "flex shrink-0 flex-row items-stretch gap-6 lg:w-[260px] lg:flex-col lg:justify-start",
  topics:
    "flex min-w-0 flex-1 flex-col gap-3 bg-postit-talk px-6 py-6 shadow-postit lg:flex-none lg:rotate-[1.5deg]",
  topicsTitle: "font-heading text-[24px] leading-tight",
  topicsList: "flex list-disc flex-col gap-2 pl-6",
  body: "flex min-w-0 flex-1 flex-col",
  panel:
    "relative flex min-w-0 flex-1 flex-col gap-5 bg-paper px-6 py-6 shadow-postit landscape:gap-3 landscape:py-4",
  tape: "absolute -top-3 left-1/2 h-7 w-28 -translate-x-1/2 -rotate-2 bg-postit-talk/90",
  foot: "mt-auto border-t-2 border-dashed border-ink/30 pt-4",
  choice: "flex flex-wrap items-center justify-center gap-4",
  detail: "flex flex-wrap items-center gap-x-4",
  segment: "rounded-lg bg-postit-talk px-3 font-heading",
  promise: "mt-auto rounded bg-paper/80 px-4 py-2",
  // 아이 차례 칸 위 짧은 말(ShortLineBubble — S5 fix 8)
  short: "mb-3 flex flex-col gap-1",
  shortEn: "font-en font-bold leading-snug",
  shortKo: "px-2",
};

/** 틀의 '보는 창 지키기' 효과에서 쪽이 옮긴 글(장면이 talk-frame.tsx 에 있는지 본다). */
export const FRAME_EFFECT_TEXTS = [
  "if (keepActive && panel) keepLessonInView(panel, { fitLandscape });",
  "if (!(keepActive || fitOnly) || !panel) return;",
  "const out = keepLessonInView(panel, {",
  "belowFloor: fitOnly ? childBelow.current : undefined,",
  "turned: rotated,",
  'if (phase === "child" && out.below !== undefined) {',
  "frame = window.requestAnimationFrame(run);",
  'panel.querySelector("[data-talk-log]"),',
  'panel.querySelector("[data-talk-log-now]"),',
  'panel.closest("[data-child-screen]"),',
  'turned.addEventListener("change", turn);',
  'viewport.addEventListener("resize", keep);',
  "}, [keepActive, fitOnly, fitLandscape, phase, stage, turnKey]);",
  "const fitOnly =\n    panelOpen && !keepActive && lessonFitOnlyOf({ inPrep, phase });",
  "const fitLandscape = lessonFitLandscapeOf({ wrapShown, phase });",
];

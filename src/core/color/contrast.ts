// 색 대비 셈(WCAG 2 상대 휘도 · 대비, UI · UX plan 묶음 2-다 · spec 설계 5 · NFR-U1 · AC-23e (2) · AC-N9).
// 시드 검사(명단 이름표 대비, check-teacher) · 디자인 토큰 시험(ux-tokens) · e2e 대비 훑기(child-size)가 같이 쓴다(2-가 검토 M2 — 시드 검사
// 모듈에서 떼어 옴, 동작 같음). 겹친 층(조상 요소의 바탕색 · 흐림)을 실제 화소 색으로 푸는 셈도 여기 둔다: 브라우저는 층 값만 모으고
// 셈은 이 순수 함수가 한다. DB · 파일 · 브라우저를 읽지 않는다.
import { WCAG } from "@/core/seed/structure";

/** 채널 0~255 · 투명도 0~1 의 색. */
export type Rgba = readonly [r: number, g: number, b: number, a: number];
/** 조상 요소 한 겹: 바탕색과 그 요소의 흐림(opacity, 자기 글 · 바탕 · 자손을 함께 흐리게 한다). */
export type Layer = { background: Rgba; opacity: number };

/** 불투명으로 보는 투명도 하한(브라우저가 1 을 0.999… 로 돌려줄 때). */
const OPAQUE_MIN = 0.999;
/** 아무 바탕도 없을 때 화면이 그리는 캔버스(흰색). */
const CANVAS: Rgba = [
  WCAG.channelMax,
  WCAG.channelMax,
  WCAG.channelMax,
  1,
] as const;
const HEX_BASE = 16;
const HEX_PAIR = 2;

/** `#rrggbb` → [r, g, b](0~255). */
export function parseHex(hex: string): [number, number, number] {
  const [r = 0, g = 0, b = 0] = (hex.match(/[0-9a-fA-F]{2}/g) ?? []).map((h) =>
    Number.parseInt(h, HEX_BASE),
  );
  return [r, g, b];
}

/** [r, g, b](0~255, 반올림) → `#rrggbb`(소문자). */
export function hexOf(rgb: readonly [number, number, number]): string {
  return `#${rgb
    .map((c) =>
      Math.min(WCAG.channelMax, Math.max(0, Math.round(c)))
        .toString(HEX_BASE)
        .padStart(HEX_PAIR, "0"),
    )
    .join("")}`;
}

/** sRGB 한 채널(0~255)의 선형 값(WCAG 2 상대 휘도 식). */
function linear(value: number): number {
  const c = value / WCAG.channelMax;
  return c <= WCAG.linearKnee
    ? c / WCAG.linearSlope
    : ((c + WCAG.gammaOffset) / (1 + WCAG.gammaOffset)) ** WCAG.gamma;
}

/** WCAG 상대 휘도(`#rrggbb`). */
function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(linear) as [number, number, number];
  return WCAG.weights.r * r + WCAG.weights.g * g + WCAG.weights.b * b;
}

/** 두 색의 WCAG 대비(1~21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + WCAG.flare) / (lo + WCAG.flare);
}

/** 미리 곱한(premultiplied) 색. */
type Premul = [number, number, number, number];

const premul = ([r, g, b, a]: Rgba): Premul => [r * a, g * a, b * a, a];
/** top 을 bottom 위에 얹는다(source-over). */
const over = (top: Premul, bottom: Premul): Premul => {
  const rest = 1 - top[3];
  return [
    top[0] + bottom[0] * rest,
    top[1] + bottom[1] * rest,
    top[2] + bottom[2] * rest,
    top[3] + bottom[3] * rest,
  ];
};
const scale = (c: Premul, k: number): Premul => [
  c[0] * k,
  c[1] * k,
  c[2] * k,
  c[3] * k,
];

function flatten(layers: readonly Layer[], glyph: Rgba | undefined): string {
  // 글 요소(맨 안쪽)부터 바깥으로: 자기 그림을 자기 바탕 위에 얹고 자기 흐림을 건다(흐림은 묶음 전체에 한 번)
  let acc: Premul = glyph ? premul(glyph) : [0, 0, 0, 0];
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i] as Layer;
    acc = scale(over(acc, premul(layer.background)), layer.opacity);
  }
  const [r, g, b] = over(acc, premul(CANVAS));
  return hexOf([r, g, b]);
}

/**
 * 글 한 줄의 실제 화소 색 쌍. layers 는 바깥(뿌리)부터 글 요소까지의 조상 층(글 요소 자신이 마지막), glyph 는 글자색이다.
 * 글자 화소(글자를 얹은 색)와 바탕 화소(글자 없는 같은 자리)를 `#rrggbb` 로 낸다. 형제 · 위치 지정 층과 바탕 그림(그라데이션)은 보지 않는다.
 */
export function textPixels(
  layers: readonly Layer[],
  glyph: Rgba,
): { text: string; background: string } {
  return {
    text: flatten(layers, glyph),
    background: flatten(layers, undefined),
  };
}

/** 글에서 가장 가까운 불투명 층의 차례(layers 안, 없으면 -1). */
export function nearestOpaqueLayer(layers: readonly Layer[]): number {
  for (let i = layers.length - 1; i >= 0; i--) {
    if ((layers[i]?.background[3] ?? 0) >= OPAQUE_MIN) return i;
  }
  return -1;
}

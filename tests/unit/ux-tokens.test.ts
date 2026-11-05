// 디자인 ② 밝은 책상 토큰(UI · UX plan 묶음 2-가 · spec 설계 5.1 색 토큰 · 5.2 모양 토큰 · NFR-U1 · 15절 AC-23e (1)).
// 토큰 값은 src/app/globals.css 한 곳에 있고, 먹색 글자는 종이 · 포스트잇 넷 · 책상 · 부모 꼬리표 위에서 7:1 이상이다. 카드 꼴(테이프 길이 ·
// 각도 · 기울기 · 테이프 색)은 카드 열쇠로 고르는 값 목록이라 같은 열쇠면 늘 같은 꼴이다(D-9). 코르크 토큰 둘(화면 테 · 바탕)은 사용처를
// 모두 옮긴 뒤 지웠다(plan 정한 것 4 · 묶음 2-나). 묶음 2-나: 화면 소스에 날값 색 · 기본 팔레트 색 클래스가 없고(2-다 design-color 규칙을
// 미리 단언), 그 묶음 파일의 아이콘 획은 ICON_STROKE 이며, 말하기 단추의 남은 시간 고리 · 소리 물결은 talk-deep 이다(설계 5.1 · 5.2).
// 묶음 2-다: 대비 셈은 공용 색 모듈(core/color/contrast) 하나이고 시드 검사(check-teacher)도 같은 함수를 쓴다(2-가 검토 M2). 겹친 층(바탕색 ·
// 흐림)을 실제 화소 색으로 푸는 셈도 그 모듈에 있어 e2e 대비 훑기(child-size.ts)가 같이 쓴다(AC-23e (2) · AC-N9).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SpeakButton } from "@/components/answer/speak-button";
import { ICON_STROKE } from "@/components/board/board";
import {
  NOTE_TILT,
  PAPER_TILTS,
  paperLookOf,
  TAPE_ANGLE_BASE,
  TAPE_ANGLE_STEPS,
  TAPE_BASE,
  TAPE_CORNER_ANGLE,
  TAPE_LENGTH_STEPS,
  TAPE_TONES,
} from "@/components/board/paper-key";
import {
  contrastRatio,
  type Layer,
  nearestOpaqueLayer,
  parseHex,
  type Rgba,
  textPixels,
} from "@/core/color/contrast";
import { contrastRatio as seedContrastRatio } from "@/core/seed/check-teacher";

const ROOT = process.cwd();
const css = readFileSync(join(ROOT, "src", "app", "globals.css"), "utf8");

/** globals.css 의 사용자 속성 값(첫 정의, 줄바꿈 · 괄호 안 여백은 한 칸 꼴로 — 포맷터가 긴 값을 접는다). */
const tokenOf = (name: string) =>
  new RegExp(`--${name}:\\s*([^;]+);`)
    .exec(css)?.[1]
    ?.replace(/\s+/g, " ")
    .replace(/\(\s/g, "(")
    .replace(/\s\)/g, ")")
    .trim();

/** 설계 5.1 색 토큰(② 값). */
const COLOR_TOKENS = {
  "color-postit-reading": "#ffdf37",
  "color-postit-writing": "#88cfff",
  "color-postit-speaking": "#ff9eb9",
  "color-postit-talk": "#adf480",
  "color-ink": "#262626",
  "color-ink-soft": "#5a4c3c",
  "color-paper": "#fffffb",
  "color-desk": "#fbf5e9",
  "color-kraft": "#f0e2c4",
  "color-talk-deep": "#3f9a2a",
  "color-tape-1": "#f5b3a4",
  "color-tape-2": "#a9d9cb",
  "color-tape-3": "#c8b9f2",
  "color-tape-4": "#f7d486",
  "color-tape-5": "#a8cbf2",
  "color-grid": "rgb(140 165 200 / 0.17)",
  "color-margin-line": "rgb(240 130 130 / 0.55)",
  "color-doodle": "#7c8592",
  // 그대로 두는 것(5.1 마지막 행)
  "color-avatar-orange": "#ffc98b",
  "color-avatar-purple": "#d9c6f5",
} as const;

/** 설계 5.2 모양 토큰(② 값). */
const SHAPE_TOKENS = {
  "radius-card": "16px 10px 18px 12px / 12px 18px 10px 16px",
  "radius-board": "14px 9px 16px 10px / 10px 16px 9px 14px",
  "radius-button": "20px 14px 22px 16px / 16px 22px 14px 20px",
  "shadow-postit": "6px 7px 0 rgb(38 38 38 / 0.12)",
  "shadow-band": "6px 7px 0 rgb(38 38 38 / 0.1)",
  "shadow-button": "4px 5px 0 rgb(38 38 38 / 0.22)",
  "paper-edge": "2.6px",
  "desk-grid": "28px",
  "desk-margin-x": "58px",
  "desk-margin-width": "2px",
  "doodle-opacity": "0.8",
} as const;

/** 흐린 단추(5.2): 글 먹색 42% · 테 먹색 36%(종이와 섞음). */
const OFF_TOKENS = {
  "color-ink-off":
    "color-mix(in oklab, var(--color-ink) 42%, var(--color-paper))",
  "color-ink-off-edge":
    "color-mix(in oklab, var(--color-ink) 36%, var(--color-paper))",
} as const;

const NFR_U1_MIN = 7;
const NON_TEXT_MIN = 3;
/** 아이콘 획(설계 5.2 '획 2.75'). */
const ICON_STROKE_SPEC = 2.75;

/** 묶음 2-나 가 옮긴 화면 소스(plan 2-나 표). 아이콘 획은 모두 ICON_STROKE 다. */
const BUNDLE_2NA_FILES = [
  "src/components/activities/common.tsx",
  "src/components/activities/reading.tsx",
  "src/components/activities/speaking.tsx",
  "src/components/activities/writing.tsx",
  "src/components/answer/tiles.tsx",
  "src/components/answer/typing.tsx",
  "src/components/answer/choice.tsx",
  "src/components/answer/speak-button.tsx",
  "src/components/session/reading.tsx",
  "src/components/session/writing-composition.tsx",
  "src/components/session/writing-guided.tsx",
  "src/components/session/writing-rewrite.tsx",
  "src/app/(setup)/access/access-code-form.tsx",
  "src/app/(setup)/first-run/first-run-flow.tsx",
] as const;

/** 아이 화면이 아닌 개발 도구 쪽(시드 보기 · 음성 · 선생님 시험 화면) — 화면 소스 검사에서 뺀다. */
const DEV_TOOLS_DIR = join("src", "app", "dev");
/** 날값 색(#rgb · #rrggbb · #rrggbbaa). */
const RAW_HEX = /#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\b/i;
/** Tailwind 기본 팔레트 색 클래스(토큰 밖 색). */
const PALETTE_CLASS =
  /\b(?:bg|text|border|ring|fill|stroke|from|to|via|outline|decoration|divide|placeholder|accent|caret|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b/;
/** 주석 줄(// · /* · * · {/* 로 시작) — 설명 글의 색 값은 화면 값이 아니다. */
const COMMENT_LINE = /^\s*(?:\/\/|\/\*|\*|\{\/\*)/;

describe("디자인 ② 토큰(AC-23e (1) · 설계 5.1 · 5.2)", () => {
  it("AC-23e (1) 색 토큰이 설계 5.1 표의 ② 값이고 globals.css 한 곳에 있다", () => {
    for (const [name, value] of Object.entries(COLOR_TOKENS)) {
      expect(tokenOf(name)?.toLowerCase(), name).toBe(value);
    }
    for (const [name, value] of Object.entries(OFF_TOKENS)) {
      expect(tokenOf(name), name).toBe(value);
    }
  });

  it("AC-23e (1) 모양 토큰(모서리 셋 · 그림자 셋 · 종이 테 2.6px · 모눈 28px · 여백 선 58px)이 설계 5.2 표 값이다", () => {
    for (const [name, value] of Object.entries(SHAPE_TOKENS)) {
      expect(tokenOf(name), name).toBe(value);
    }
  });

  it("AC-23e (1) 먹색 글자는 종이 · 포스트잇 넷 · 책상 · 부모 꼬리표 위에서 7:1 이상이고, 큰 단추의 종이색 글자도 같다(NFR-U1)", () => {
    const ink = COLOR_TOKENS["color-ink"];
    for (const bg of [
      "color-paper",
      "color-postit-reading",
      "color-postit-writing",
      "color-postit-speaking",
      "color-postit-talk",
      "color-desk",
      "color-kraft",
    ] as const) {
      expect(contrastRatio(ink, COLOR_TOKENS[bg]), bg).toBeGreaterThanOrEqual(
        NFR_U1_MIN,
      );
    }
  });

  it("AC-23e (1) 보조 줄(ink-soft)은 종이 · 책상 위에서만 7:1 이상이라 색 종이 위 뜻 줄은 먹색으로 쓴다, talk-deep 은 글자가 아니고 종이 위 3:1 이상이다", () => {
    const soft = COLOR_TOKENS["color-ink-soft"];
    expect(
      contrastRatio(soft, COLOR_TOKENS["color-paper"]),
    ).toBeGreaterThanOrEqual(NFR_U1_MIN);
    expect(
      contrastRatio(soft, COLOR_TOKENS["color-desk"]),
    ).toBeGreaterThanOrEqual(NFR_U1_MIN);
    for (const bg of [
      "color-postit-reading",
      "color-postit-writing",
      "color-postit-speaking",
      "color-postit-talk",
    ] as const) {
      expect(contrastRatio(soft, COLOR_TOKENS[bg]), bg).toBeLessThan(
        NFR_U1_MIN,
      );
    }
    expect(
      contrastRatio(
        COLOR_TOKENS["color-talk-deep"],
        COLOR_TOKENS["color-paper"],
      ),
    ).toBeGreaterThanOrEqual(NON_TEXT_MIN);
  });

  it("AC-23e (1) 코르크 토큰 둘(cork · cork-frame)이 없고, 코르크를 쓰는 화면 소스도 없다", () => {
    expect(tokenOf("color-cork-frame")).toBeUndefined();
    expect(tokenOf("color-cork")).toBeUndefined();
    const left = sourceFiles(join(ROOT, "src"))
      .filter((file) =>
        /\bcork\b|--color-cork/.test(readFileSync(file, "utf8")),
      )
      .map((file) => relative(ROOT, file));
    expect(left).toEqual([]);
  });

  it("AC-23e (1) 화면 소스(src/components · src/app, 개발 도구 쪽 뺌)에 날값 색과 기본 팔레트 색 클래스가 없다", () => {
    const found: string[] = [];
    for (const dir of [
      join(ROOT, "src", "components"),
      join(ROOT, "src", "app"),
    ]) {
      for (const file of sourceFiles(dir)) {
        const rel = relative(ROOT, file);
        if (file.endsWith(".css") || rel.startsWith(DEV_TOOLS_DIR)) continue;
        readFileSync(file, "utf8")
          .split("\n")
          .forEach((line, i) => {
            if (COMMENT_LINE.test(line)) return;
            if (RAW_HEX.test(line) || PALETTE_CLASS.test(line))
              found.push(`${rel}:${i + 1}`);
          });
      }
    }
    expect(found).toEqual([]);
  });
});

describe("대비 셈 공용 모듈(AC-23e (2) · NFR-U1 · 2-가 검토 M2)", () => {
  const rgba = (hex: string, alpha = 1): Rgba => {
    const [r, g, b] = parseHex(hex);
    return [r, g, b, alpha];
  };
  const layer = (hex: string, alpha = 1, opacity = 1): Layer => ({
    background: rgba(hex, alpha),
    opacity,
  });
  const paper = COLOR_TOKENS["color-paper"];
  const ink = COLOR_TOKENS["color-ink"];

  it("AC-23e (2) 대비 셈은 공용 색 모듈 하나이고 시드 검사(check-teacher)도 같은 함수를 쓴다(WCAG 2: 흰 ↔ 검정 21, 같은 색 1)", () => {
    expect(seedContrastRatio).toBe(contrastRatio);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(parseHex("#262626")).toEqual([38, 38, 38]);
  });

  it("AC-23e (2) 겹친 층을 실제 화소 색으로 푼다: 불투명 종이 위 먹색은 그대로, 반투명 바탕은 아래와 섞이고, 바탕이 없으면 흰 캔버스다", () => {
    expect(textPixels([layer(paper)], rgba(ink))).toEqual({
      text: ink,
      background: paper,
    });
    // 반투명 검정 바탕 50% 가 흰 캔버스 위에 — 회색 #808080 근처
    const half = textPixels([layer("#000000", 0.5)], rgba(ink));
    expect(half.background).toMatch(/^#(7f|80)(7f|80)(7f|80)$/);
    expect(textPixels([], rgba(ink)).background).toBe("#ffffff");
  });

  it("AC-23e (2) 흐림(opacity)은 글자와 그 요소의 바탕을 같이 아래와 섞는다 — 종이 보기 70% 가 책상 위면 먹색 대비가 7:1 아래로 떨어진다(2-나 검토 M1 '틀린 보기 70%')", () => {
    const desk = COLOR_TOKENS["color-desk"];
    const dimmed = textPixels([layer(desk), layer(paper, 1, 0.7)], rgba(ink));
    expect(contrastRatio(dimmed.text, dimmed.background)).toBeLessThan(
      NFR_U1_MIN,
    );
    const plain = textPixels([layer(desk), layer(paper)], rgba(ink));
    expect(contrastRatio(plain.text, plain.background)).toBeGreaterThanOrEqual(
      NFR_U1_MIN,
    );
    // 글자색 자체의 투명도(text-ink/50 꼴)도 같다
    const faint = textPixels([layer(paper)], rgba(ink, 0.5));
    expect(contrastRatio(faint.text, faint.background)).toBeLessThan(
      NFR_U1_MIN,
    );
  });

  it("AC-23e (2) 글 바로 아래 바탕은 글에서 가장 가까운 불투명 층이다(반투명 · 투명 층은 건너뛴다, 없으면 -1)", () => {
    expect(
      nearestOpaqueLayer([
        layer(COLOR_TOKENS["color-desk"]),
        layer(paper),
        layer("#000000", 0),
        layer("#000000", 0.2),
      ]),
    ).toBe(1);
    expect(nearestOpaqueLayer([layer("#000000", 0)])).toBe(-1);
  });
});

describe("아이콘 획 · 말하기 단추 고리(AC-23e (1) · 설계 5.1 · 5.2)", () => {
  it("AC-23e (1) 아이콘 획 상수가 설계 5.2 값이고, 묶음 2-나 파일의 strokeWidth 는 모두 ICON_STROKE 다", () => {
    expect(ICON_STROKE).toBe(ICON_STROKE_SPEC);
    const other: string[] = [];
    for (const rel of BUNDLE_2NA_FILES) {
      readFileSync(join(ROOT, rel), "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (/strokeWidth=\{(?!ICON_STROKE\})/.test(line))
            other.push(`${rel}:${i + 1}`);
        });
    }
    expect(other).toEqual([]);
  });

  it("AC-23e (1) 말하기 단추: 듣는 동안 남은 시간 고리는 talk-deep 이고, 소리가 들어오면 소리 물결 표지가 talk-deep 이다(글자 아님 · 3:1 이상)", () => {
    const render = (listening: boolean, soundIn: boolean) =>
      renderToStaticMarkup(
        createElement(SpeakButton, {
          label: "말하기",
          listening,
          soundIn,
          onPress: () => {},
        }),
      );
    expect(render(true, false)).toContain(
      "conic-gradient(var(--color-talk-deep)",
    );
    expect(render(false, false)).not.toContain("conic-gradient");
    const heard = render(true, true);
    expect(heard).toMatch(/lucide-audio-lines[^"]*text-talk-deep/);
    expect(heard).toContain(`stroke-width="${ICON_STROKE}"`);
    expect(render(true, false)).not.toContain("text-talk-deep");
    // 소리 물결은 먹색 큰 단추 위(흐린 단추면 종이 위)에 있다 — 글자가 아니라 3:1 이상이면 된다
    for (const bg of ["color-ink", "color-paper"] as const) {
      expect(
        contrastRatio(COLOR_TOKENS["color-talk-deep"], COLOR_TOKENS[bg]),
        bg,
      ).toBeGreaterThanOrEqual(NON_TEXT_MIN);
    }
  });
});

describe("카드 열쇠 → 꼴(AC-23e (1) · 설계 5.2 · D-9)", () => {
  it("AC-23e (1) 테이프 · 기울기 값 목록이 설계 5.2 값이다(104 × 30 기준 ±12% · −3° 기준 ±3° · 모서리 −34° · 32° · 카드 −1.4 · 1 · −0.6 · 1.2° · 쪽지 1.4°)", () => {
    expect(TAPE_BASE).toEqual({ width: 104, height: 30 });
    expect(Math.min(...TAPE_LENGTH_STEPS)).toBeCloseTo(-0.12, 10);
    expect(Math.max(...TAPE_LENGTH_STEPS)).toBeCloseTo(0.12, 10);
    expect(TAPE_ANGLE_BASE).toBe(-3);
    expect(Math.min(...TAPE_ANGLE_STEPS)).toBe(-3);
    expect(Math.max(...TAPE_ANGLE_STEPS)).toBe(3);
    expect(TAPE_CORNER_ANGLE).toEqual({ left: -34, right: 32 });
    expect([...PAPER_TILTS]).toEqual([-1.4, 1, -0.6, 1.2]);
    expect(NOTE_TILT).toBe(1.4);
    expect([...TAPE_TONES]).toEqual([
      "tape-1",
      "tape-2",
      "tape-3",
      "tape-4",
      "tape-5",
    ]);
  });

  it("AC-23e (1) 같은 열쇠면 같은 꼴이고, 값은 늘 목록 안이며, 열쇠가 여럿이면 목록 값이 고루 나온다", () => {
    const keys = [
      "reading",
      "writing",
      "speaking",
      "talk",
      "paper",
      ...Array.from({ length: 60 }, (_, i) => `reading-${i + 1}`),
    ];
    const widths = new Set<number>();
    const angles = new Set<number>();
    const tilts = new Set<number>();
    const tones = new Set<string>();
    for (const key of keys) {
      const look = paperLookOf(key);
      expect(paperLookOf(key), key).toEqual(look);
      expect(look.tapeHeight).toBe(TAPE_BASE.height);
      expect(TAPE_LENGTH_STEPS.map((s) => TAPE_BASE.width * (1 + s))).toContain(
        look.tapeWidth,
      );
      expect(TAPE_ANGLE_STEPS.map((s) => TAPE_ANGLE_BASE + s)).toContain(
        look.tapeAngle,
      );
      expect(PAPER_TILTS).toContain(look.tilt);
      expect(TAPE_TONES).toContain(look.tapeTone);
      widths.add(look.tapeWidth);
      angles.add(look.tapeAngle);
      tilts.add(look.tilt);
      tones.add(look.tapeTone);
    }
    expect(widths.size).toBe(TAPE_LENGTH_STEPS.length);
    expect(angles.size).toBe(TAPE_ANGLE_STEPS.length);
    expect(tilts.size).toBe(PAPER_TILTS.length);
    expect(tones.size).toBe(TAPE_TONES.length);
  });
});

/** src 아래 화면 소스(tsx · ts · css). */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(tsx?|css)$/.test(name)) out.push(path);
  }
  return out;
}

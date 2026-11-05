// 회화 세션 선생님 창(초상 · 상태 표시 · 이름표)과 회화 틀의 창 칸 · 칭찬 때 판정(선생님 화면 plan 값 13, 4절 회화 세션 '선생님 창' 행 ·
// 증명 표 AC-19c 창 접근 이름 · AC-19g 칭찬 때 · AC-19h 초상 몫). 그림 층 공유 값에 따른 3D 칸 · 대신 표시 까닭(data-teacher-fallback)은
// d8 몫(plan 값 14 · AC-19i 창 몫)이다. UI · UX plan 묶음 4-가(spec 설계 5.5 · R-25 · R-27 · 15절 AC-23i): 위가 둥근 창 · 연두 테 · 방 벽과
// 바닥 띠 · 창 밖 테이프 · 오른쪽 아래 상태 표지 하나 · 흰 종이 이름표(먹색 글자) · 둥근 창 꼴 작은 초상.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  targetReachedNow,
  teacherWindowShown,
} from "@/components/conversation/talk-frame";
import {
  TeacherLayerContext,
  type TeacherLayerValue,
} from "@/components/teacher/teacher-layer";
import {
  PORTRAIT_WINDOW,
  TeacherPortrait,
  windowCornersOf,
} from "@/components/teacher/teacher-portrait";
import {
  NAME_TAG_TONE,
  RING_SHAPE_CLASS,
  roomBackgroundOf,
  STATUS_BADGE_CLASS,
  TEACHER_WINDOW_PX,
  TeacherWindow,
  WINDOW_FRAME,
  WINDOW_SHAPE_CLASS,
  WINDOW_SIZE_CLASS,
  WINDOW_TAPE,
  WINDOW_TAPE_CLASS,
  windowStatusOf,
} from "@/components/teacher/teacher-window";
import { contrastRatio } from "@/core/seed/check-teacher";
import { LAYER_FALLBACKS } from "@/core/teacher/layer";
import { TEACHER_STATES, type TeacherState } from "@/core/teacher/state";

// 브라우저 전용 표시 모듈 · 쪽 길잡이 · 서버 액션은 시험(node)에서 빈 모듈로
vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/teacher", () => ({}));

const MINA = {
  key: "mina",
  nameKo: "미나",
  introKo: "안녕",
  traitsKo: ["밝음", "다정함", "꼼꼼함"],
  greetingEn: "Hi!",
  color: { room: "#f6e7d8", accent: "#b23a6b" },
  modelPath: "/teachers/mina.1a2b3c4d.vrm",
  portraitPath: "/teachers/mina.fdc5f7f2.webp",
  voice: { pitch: 1.08, prefer: [] },
};

function windowOf(state: TeacherState, reducedMotion = false): string {
  return renderToStaticMarkup(
    createElement(TeacherWindow, {
      teacher: MINA,
      state,
      reducedMotion,
      started: true,
    }),
  );
}

/** 그림 층 보관 조각 안의 창(공유 값을 바꿔 넣음). */
function layeredWindowOf(
  layer: Pick<TeacherLayerValue, "render" | "fallback">,
  {
    state = "idle",
    started = true,
  }: { state?: TeacherState; started?: boolean } = {},
): string {
  const value: TeacherLayerValue = {
    ...layer,
    want: () => {},
    attach: () => {},
    setPose: () => {},
    close: () => {},
  };
  return renderToStaticMarkup(
    createElement(
      TeacherLayerContext.Provider,
      { value },
      createElement(TeacherWindow, {
        teacher: MINA,
        state,
        reducedMotion: false,
        started,
      }),
    ),
  );
}

/** 3D 칸 · 초상 그림 태그(속성 차례와 관계없이). */
const slotTag = (html: string) =>
  html.match(/<div[^>]*data-teacher-slot[^>]*>/)?.[0];
/** class 속성 안의 낱개 클래스 hidden(aria-hidden · overflow-hidden 은 아님 — 클래스 경계는 공백). */
const HIDDEN_CLASS = /class="(?:[^"]*\s)?hidden(?:\s[^"]*)?"/;
const portraitTag = (html: string) =>
  html.match(/<img[^>]*data-teacher-portrait-image[^>]*>/)?.[0];

describe("선생님 창(초상)", () => {
  it("AC-19c 선생님 창은 접근 이름 · 이름표가 '[이름] 선생님'이고 선생님 키 · 상태 · 초상 표시 속성을 달며 3D 를 시작하기 전이라 까닭 속성이 없다", () => {
    const html = windowOf("idle");
    expect(html).toContain("data-teacher-window");
    expect(html).toContain('data-teacher-key="mina"');
    expect(html).toContain('data-teacher-state="idle"');
    expect(html).toContain('data-teacher-render="portrait"');
    expect(html).not.toContain("data-teacher-fallback");
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="미나 선생님"');
    expect(html).toMatch(/<figcaption[^>]*>미나 선생님<\/figcaption>/);
    // 초상은 꾸밈(이름이 이름표에 있다) — 같은 출처 정적 자산
    expect(html).toContain('src="/teachers/mina.fdc5f7f2.webp"');
    expect(html).toContain('alt=""');
    // 시제품의 영어 자막 · 상태 이름 띠는 없다(C115) — 창 안에 영어 글 · 상태 이름 글이 없다
    expect(html).not.toMatch(/>(idle|speaking|listening|praise|thinking)</);
    expect(html).not.toContain("토리");
  });

  it("AC-23i 이름표는 흰 종이 바탕 · 먹색 글자(Jua 24px · −2°)이고 accent 바탕을 쓰지 않으며, 창 안 바탕은 선생님 방 색(벽 + 바닥 띠)이다", () => {
    const html = windowOf("idle");
    const caption = html.match(/<figcaption[^>]*>/)?.[0] ?? "";
    expect(caption).toContain(`bg-${NAME_TAG_TONE.bg}`);
    expect(caption).toContain(`text-${NAME_TAG_TONE.text}`);
    expect(caption).toContain("font-heading");
    expect(caption).toContain("text-[24px]");
    expect(caption).toContain("-rotate-2");
    expect(caption).not.toContain("style=");
    expect(caption).not.toContain("text-paper");
    expect(html).not.toContain("#b23a6b");
    // 방 바탕: 창 안 칸의 background 가 방 색 벽 + 바닥 띠
    expect(html).toContain(
      roomBackgroundOf("#f6e7d8").replaceAll('"', "&quot;"),
    );
  });

  it("AC-23i 이름표 색(먹색 글자 · 종이 바탕)의 대비는 globals.css 토큰 값으로 7:1 이상이다(NFR-U1 — accent 바탕은 6.1~6.8:1 이라 바꿈)", () => {
    const css = readFileSync(
      join(process.cwd(), "src", "app", "globals.css"),
      "utf8",
    );
    const tokenOf = (name: string) =>
      new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6});`, "i").exec(css)?.[1];
    const text = tokenOf(NAME_TAG_TONE.text);
    const bg = tokenOf(NAME_TAG_TONE.bg);
    expect(text).toBeDefined();
    expect(bg).toBeDefined();
    expect(contrastRatio(text ?? "", bg ?? "")).toBeGreaterThanOrEqual(7);
  });

  it("AC-23i 방 바탕은 방 색 벽과 아래 바닥 띠(방 색에 먹색을 조금 섞음)이고 같은 방 색이면 같은 값이다", () => {
    const bg = roomBackgroundOf("#f6e7d8");
    expect(bg).toBe(roomBackgroundOf("#f6e7d8"));
    expect(bg.startsWith("linear-gradient(")).toBe(true);
    expect(bg).toContain(`#f6e7d8 0 ${WINDOW_FRAME.floorTop}%`);
    expect(bg).toContain(
      `color-mix(in oklab, #f6e7d8 ${WINDOW_FRAME.floorRoom}%, var(--color-ink)) ${WINDOW_FRAME.floorTop}% 100%`,
    );
  });

  it("AC-19i 상태 표지 순수 함수: 초상에서 쉬기 말고는 표지 하나(듣기 · 말하기 · 생각 · 칭찬)이고 말하기 · 듣기만 창 둘레 테가 있으며 3D 면 둘 다 없다", () => {
    expect(
      Object.fromEntries(
        TEACHER_STATES.map((s) => [s, windowStatusOf(s, false)]),
      ),
    ).toEqual({
      idle: { badge: undefined, ring: undefined },
      speaking: { badge: "speaking", ring: "speaking" },
      listening: { badge: "listening", ring: "listening" },
      praise: { badge: "praise", ring: undefined },
      thinking: { badge: "thinking", ring: undefined },
    });
    for (const s of TEACHER_STATES)
      expect(windowStatusOf(s, true)).toEqual({
        badge: undefined,
        ring: undefined,
      });
  });

  it("AC-19g · AC-19i 초상 상태 표지는 창 오른쪽 아래 둥근 표지 하나다: 말하기는 accent 물결 · 생각은 점 셋 · 칭찬은 별 · 듣기는 마이크이고 쉬기는 표시가 없다", () => {
    const shown = Object.fromEntries(
      TEACHER_STATES.map((s) => [
        s,
        [...windowOf(s).matchAll(/data-teacher-indicator="([a-z]+)"/g)].map(
          (m) => m[1],
        ),
      ]),
    );
    expect(shown).toEqual({
      idle: [],
      speaking: ["speaking"],
      listening: ["listening"],
      praise: ["praise"],
      thinking: ["thinking"],
    });
    const badgeOf = (state: TeacherState) =>
      windowOf(state).match(
        /<span[^>]*data-teacher-indicator="[a-z]+"[^>]*>/,
      )?.[0] ?? "";
    for (const state of [
      "speaking",
      "thinking",
      "praise",
      "listening",
    ] as const)
      expect(badgeOf(state), state).toContain(STATUS_BADGE_CLASS);
    // 말하기 표지는 accent 물결(소리 줄 그림이 선생님 accent 색)
    const speaking = windowOf("speaking");
    expect(speaking).toContain("lucide-audio-lines");
    expect(speaking).toContain("color:#b23a6b");
    expect(windowOf("thinking")).toContain("motion-safe:animate-bounce");
    expect(windowOf("praise")).toContain("lucide-star");
    expect(windowOf("listening")).toContain("lucide-mic");
  });

  it("AC-19i 말하기 · 듣기는 창 둘레 테(R-27)가 창과 같은 둥근 꼴로 있다: 말하기는 accent 색 제자리 깜빡임, 듣기는 연두 테(움직임 없음)이고 다른 상태에는 테가 없다", () => {
    const ringOf = (state: TeacherState) =>
      windowOf(state).match(/<span[^>]*data-teacher-ring="[a-z]+"[^>]*>/)?.[0];
    const speaking = ringOf("speaking") ?? "";
    expect(speaking).toContain(RING_SHAPE_CLASS);
    expect(speaking).toContain("motion-safe:animate-pulse");
    expect(speaking).toContain("border-color:#b23a6b");
    expect(windowOf("speaking")).not.toContain("animate-ping");
    const listening = ringOf("listening") ?? "";
    expect(listening).toContain(RING_SHAPE_CLASS);
    expect(listening).toContain("border-postit-talk");
    expect(listening).not.toContain("animate-");
    for (const state of ["idle", "thinking", "praise"] as const)
      expect(ringOf(state), state).toBeUndefined();
  });

  it("AC-19h 움직임 줄이기면 상태 표시가 멈춘 꼴(움직임 클래스 없음)이고 표시는 그대로 보이며, 창에는 넘김 효과(transition)가 없다", () => {
    for (const state of [
      "speaking",
      "thinking",
      "praise",
      "listening",
    ] as const) {
      const html = windowOf(state, true);
      expect(html).toContain(`data-teacher-indicator="${state}"`);
      expect(html).not.toMatch(/animate-/);
      if (state === "speaking" || state === "listening")
        expect(html).toContain(`data-teacher-ring="${state}"`);
    }
    for (const state of TEACHER_STATES)
      for (const reduced of [false, true])
        expect(windowOf(state, reduced)).not.toMatch(/transition/);
  });

  it("AC-23i 선생님 창은 위가 둥근 창이고 크기 · 모양은 화면 꼴 상수(가로 262 × 288 — 시안 ② · 세로는 옛 창 높이 안)와 같은 글자 클래스다", () => {
    expect(TEACHER_WINDOW_PX).toEqual({
      landscape: { width: 262, height: 288 },
      portrait: { width: 176, height: 152 },
    });
    const { landscape, portrait } = TEACHER_WINDOW_PX;
    const { edge, bottomRadius, ringGap } = WINDOW_FRAME;
    expect(edge).toBe(10);
    expect(WINDOW_SIZE_CLASS).toBe(
      `h-[${portrait.height}px] w-[${portrait.width}px] lg:h-[${landscape.height}px] lg:w-[${landscape.width}px]`,
    );
    // 위 모서리 반지름 = 너비의 절반(반원 아치), 아래는 작게
    expect(WINDOW_SHAPE_CLASS).toBe(
      `rounded-t-[${portrait.width / 2}px] rounded-b-[${bottomRadius}px] lg:rounded-t-[${landscape.width / 2}px]`,
    );
    expect(RING_SHAPE_CLASS).toBe(
      `rounded-t-[${portrait.width / 2 + ringGap}px] rounded-b-[${bottomRadius + ringGap}px] lg:rounded-t-[${landscape.width / 2 + ringGap}px]`,
    );
    const html = windowOf("idle");
    const frame = html.match(/<div[^>]*data-teacher-frame[^>]*>/)?.[0] ?? "";
    expect(frame).toContain(WINDOW_SIZE_CLASS);
    const glass = html.match(/<div[^>]*data-teacher-glass[^>]*>/)?.[0] ?? "";
    expect(glass).toContain(WINDOW_SHAPE_CLASS);
    expect(glass).toContain(`border-[${edge}px]`);
    expect(glass).toContain("border-postit-talk");
    expect(glass).toContain("overflow-hidden");
    // 이름표는 창 상자 밖(바로 아래)
    expect(frame).not.toContain("figcaption");
    expect(html.indexOf("<figcaption")).toBeGreaterThan(
      html.indexOf("data-teacher-glass"),
    );
  });

  it("AC-23i 테이프는 창 밖(유리 칸 밖 · 오른쪽 위 모서리)이고 테이프 색은 선생님 키로 고른 tape-1~5 토큰이다", () => {
    const html = windowOf("idle");
    const tape = html.match(/<span[^>]*data-tape="window"[^>]*>/)?.[0] ?? "";
    expect(tape).toContain("paper-tape");
    expect(tape).toContain(WINDOW_TAPE_CLASS);
    const { width, height, fromCorner } = WINDOW_TAPE;
    expect(WINDOW_TAPE_CLASS).toBe(
      `top-[${fromCorner.portrait - height / 2}px] right-[${fromCorner.portrait - width / 2}px] lg:top-[${fromCorner.landscape - height / 2}px] lg:right-[${fromCorner.landscape - width / 2}px]`,
    );
    // 45° 선 위 테이프 가운데에서 유리 칸 쪽 가장자리가 연두 테 안(유리 칸 밖)에 든다: 아치 중심에서 거리 = 모서리 거리 − 가운데 거리 − 두께/2
    for (const side of ["portrait", "landscape"] as const) {
      const r = TEACHER_WINDOW_PX[side].width / 2;
      const inner = r * Math.SQRT2 - fromCorner[side] * Math.SQRT2 - height / 2;
      expect(inner, side).toBeLessThanOrEqual(r);
      expect(inner, side).toBeGreaterThanOrEqual(r - WINDOW_FRAME.edge);
    }
    expect(tape).toMatch(/--tape-tone:var\(--color-tape-[1-5]\)/);
    // 유리 칸(overflow-hidden) 안에 테이프가 없다 — 머리 · 얼굴을 가리지 않는다(테이프는 유리 칸 앞 형제)
    const glassAt = html.indexOf("data-teacher-glass");
    const tapeAt = html.indexOf('data-tape="window"');
    expect(tapeAt).toBeGreaterThan(-1);
    expect(tapeAt).toBeLessThan(glassAt);
  });
});

describe("선생님 창의 3D 칸 · 대신 표시(그림 층 공유 값)", () => {
  it("AC-19i 그림 층이 3D 이고 '시작!'을 누른 뒤면 창은 data-teacher-render=3d 로 3D 칸을 보이고 초상 · 상태 표시를 숨기며 까닭 속성이 없다", () => {
    // 숨김 판정은 낱개 클래스 hidden 만(overflow-hidden · aria-hidden 은 아님 — 검토 4 M-6)
    expect('<img class="size-full overflow-hidden">').not.toMatch(HIDDEN_CLASS);
    expect('<div aria-hidden="true" class="absolute">').not.toMatch(
      HIDDEN_CLASS,
    );
    expect('<img class="hidden">').toMatch(HIDDEN_CLASS);
    const html = layeredWindowOf({ render: "3d" }, { state: "speaking" });
    expect(html).toContain('data-teacher-render="3d"');
    expect(html).not.toContain("data-teacher-fallback");
    expect(slotTag(html)).toBeDefined();
    expect(slotTag(html)).not.toMatch(HIDDEN_CLASS);
    expect(portraitTag(html)).toMatch(HIDDEN_CLASS);
    expect(html).not.toContain("data-teacher-indicator");
  });

  it("AC-19i '시작!' 화면에서는 3D 가 먼저 되어도 초상이고(3D 칸은 숨긴 채 둠) 상태 표시가 그대로다", () => {
    const html = layeredWindowOf(
      { render: "3d" },
      { state: "speaking", started: false },
    );
    expect(html).toContain('data-teacher-render="portrait"');
    expect(html).not.toContain("data-teacher-fallback");
    expect(slotTag(html)).toMatch(HIDDEN_CLASS);
    expect(portraitTag(html)).not.toMatch(HIDDEN_CLASS);
    expect(html).toContain('data-teacher-indicator="speaking"');
  });

  it("AC-19i 대신 표시 까닭 다섯마다 창은 초상 · 그 까닭 속성이고 초상에서도 상태 표시가 보이며 오류 글 · 단추가 없다", () => {
    for (const fallback of LAYER_FALLBACKS) {
      for (const state of ["speaking", "thinking", "praise"] as const) {
        const html = layeredWindowOf(
          { render: "portrait", fallback },
          { state },
        );
        expect(html, fallback).toContain('data-teacher-render="portrait"');
        expect(html, fallback).toContain(`data-teacher-fallback="${fallback}"`);
        expect(html, fallback).toContain(`data-teacher-indicator="${state}"`);
        expect(html, fallback).not.toContain("<button");
        expect(html, fallback).not.toMatch(/오류|불러오|다시/);
      }
    }
  });

  it("AC-19c 그림 층 보관 조각 밖의 창(그 밖 화면)은 3D 칸 없이 늘 초상이다", () => {
    const html = windowOf("idle");
    expect(html).not.toContain("data-teacher-slot");
    expect(html).toContain('data-teacher-render="portrait"');
  });
});

describe("회화 틀의 선생님 칸 · 칭찬 때", () => {
  it("AC-19c 선생님 창은 고른 선생님이 있을 때 '시작!' 화면부터 대화 · 정리까지 보이고 고르는 화면 · 막힘 · 쉼 · 마무리 세 장에는 없다", () => {
    const base = {
      hasTeacher: true,
      blocked: false,
      resting: false,
      stage: "talk" as const,
    };
    expect(teacherWindowShown(base)).toBe(true);
    expect(teacherWindowShown({ ...base, stage: "wrap" })).toBe(true);
    expect(teacherWindowShown({ ...base, stage: "closing" })).toBe(false);
    expect(teacherWindowShown({ ...base, hasTeacher: false })).toBe(false);
    expect(teacherWindowShown({ ...base, blocked: true })).toBe(false);
    expect(teacherWindowShown({ ...base, resting: true })).toBe(false);
  });

  it("AC-19g 목표 턴 칭찬은 목표 턴이 이번 턴에 처음 참이 된 때만이다(이미 닿은 뒤 더 이야기하기 턴 · 닿기 전 턴은 아님 — R2)", () => {
    expect(targetReachedNow(false, true)).toBe(true);
    expect(targetReachedNow(true, true)).toBe(false);
    expect(targetReachedNow(false, false)).toBe(false);
    expect(targetReachedNow(true, false)).toBe(false);
  });
});

describe("작은 초상 · '선생님을 골라요' 초상(둥근 창 꼴 갈래)", () => {
  const portraitOf = (
    props: Partial<Parameters<typeof TeacherPortrait>[0]> = {},
  ) =>
    renderToStaticMarkup(
      createElement(TeacherPortrait, { teacher: MINA, size: 56, ...props }),
    );

  it("AC-23i 둥근 창 꼴 모서리는 위가 지름의 절반(반원) · 아래가 작은 둥근 모서리다(순수 함수)", () => {
    expect(windowCornersOf(56)).toBe(
      `28px 28px ${PORTRAIT_WINDOW.bottomRatio * 56}px ${PORTRAIT_WINDOW.bottomRatio * 56}px`,
    );
    expect(windowCornersOf(160)).toBe(
      `80px 80px ${PORTRAIT_WINDOW.bottomRatio * 160}px ${PORTRAIT_WINDOW.bottomRatio * 160}px`,
    );
  });

  it("AC-23i 둥근 창 꼴 초상은 같은 초상 파일을 방 색 바탕 · 위 둥근 모서리로 그리고 크기가 지름 그대로다", () => {
    const html = portraitOf({ shape: "window" });
    expect(html).toContain('data-teacher-portrait="mina"');
    expect(html).toContain('data-portrait-shape="window"');
    expect(html).toContain('src="/teachers/mina.fdc5f7f2.webp"');
    expect(html).toContain('alt=""');
    expect(html).toContain("background-color:#f6e7d8");
    expect(html).toContain(`border-radius:${windowCornersOf(56)}`);
    expect(html).toContain("width:56px");
    expect(html).toContain("height:56px");
    expect(html).not.toContain("rounded-full");
  });

  it("AC-19c 모양을 주지 않으면 지금 꼴(동그라미)이라 다른 화면의 입력 꼴이 그대로이고, 고르기 전은 글자 동그라미 '선'이다", () => {
    const circle = portraitOf();
    expect(circle).toContain("rounded-full");
    expect(circle).toContain('data-portrait-shape="circle"');
    const initial = portraitOf({ teacher: null, shape: "window" });
    expect(initial).toContain('data-teacher-portrait="initial"');
    expect(initial).toContain(">선<");
  });
});

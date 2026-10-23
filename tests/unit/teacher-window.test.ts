// 회화 세션 선생님 창(초상 · 상태 표시 · 이름표)과 회화 틀의 창 칸 · 칭찬 때 판정(선생님 화면 plan 값 13, 4절 회화 세션 '선생님 창' 행 ·
// 증명 표 AC-19c 창 접근 이름 · AC-19g 칭찬 때 · AC-19h 초상 몫). 3D · 대신 표시 까닭(data-teacher-fallback)은 d8 이다.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  targetReachedNow,
  teacherWindowShown,
} from "@/components/conversation/talk-frame";
import {
  TEACHER_WINDOW_PX,
  TeacherWindow,
  WINDOW_SIZE_CLASS,
} from "@/components/teacher/teacher-window";
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
    createElement(TeacherWindow, { teacher: MINA, state, reducedMotion }),
  );
}

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

  it("AC-19c 이름표는 선생님 accent 바탕 · 종이색 글자(C141)이고 창 안 바탕은 선생님 방 색이다", () => {
    const html = windowOf("idle");
    expect(html).toMatch(
      /<figcaption[^>]*class="[^"]*text-paper[^"]*"[^>]*style="background-color:#b23a6b"/,
    );
    expect(html).toContain("background-color:#f6e7d8");
  });

  it("AC-19g 초상 상태 표시: 말하기는 창 둘레 물결 · 생각은 점 셋 · 칭찬은 작은 별 표지이고 쉬기 · 듣기는 표시가 없다(하나만)", () => {
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
      listening: [],
      praise: ["praise"],
      thinking: ["thinking"],
    });
    expect(windowOf("speaking")).toContain("motion-safe:animate-ping");
    expect(windowOf("thinking")).toContain("motion-safe:animate-bounce");
    expect(windowOf("praise")).toContain("lucide-star");
  });

  it("AC-19h 움직임 줄이기면 상태 표시가 멈춘 꼴(움직임 클래스 없음)이고 표시는 그대로 보이며, 창에는 넘김 효과(transition)가 없다", () => {
    for (const state of ["speaking", "thinking", "praise"] as const) {
      const html = windowOf(state, true);
      expect(html).toContain(`data-teacher-indicator="${state}"`);
      expect(html).not.toMatch(/animate-/);
    }
    for (const state of TEACHER_STATES)
      for (const reduced of [false, true])
        expect(windowOf(state, reduced)).not.toMatch(/transition/);
  });

  it("선생님 창 크기는 화면 꼴 상수(가로 260 × 300 · 세로 200 × 240 — 제안 값)와 같은 글자 클래스다", () => {
    expect(TEACHER_WINDOW_PX).toEqual({
      landscape: { width: 260, height: 300 },
      portrait: { width: 200, height: 240 },
    });
    const { landscape, portrait } = TEACHER_WINDOW_PX;
    expect(WINDOW_SIZE_CLASS).toBe(
      `h-[${portrait.height}px] w-[${portrait.width}px] lg:h-[${landscape.height}px] lg:w-[${landscape.width}px]`,
    );
    expect(windowOf("idle")).toContain(WINDOW_SIZE_CLASS);
  });
});

describe("회화 틀의 선생님 칸 · 칭찬 때", () => {
  it("선생님 창은 고른 선생님이 있을 때 '시작!' 화면부터 대화 · 정리까지 보이고 고르는 화면 · 막힘 · 쉼 · 마무리 세 장에는 없다", () => {
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

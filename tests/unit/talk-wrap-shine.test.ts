// 정리 칸의 첫 넘김 자리(S5 fix 9 · 13절 C241 보완 8 · 화면 재검토 des-s5-3 D-8 · 정본 03 4절 92줄 '반짝인다'). 순수 판단만 본다: 마지막
// 반짝이는 줄이 맨 아래에 붙은 칸 안에 이미 들면 맨 아래 그대로(null), 아니면 그 줄이 온전히 드는 가장 가까운 자리. 넘김 · 크기 알림 · 아이가
// 넘긴 자리를 끌어오지 않음은 브라우저 점검 chat-wrap-shine 과 e2e(talk-lesson 정리 칸 시험)의 몫이다.
import { describe, expect, it, vi } from "vitest";
import {
  WRAP_SHINE_RING_PX,
  wrapShineScrollOf,
} from "@/components/conversation/talk-frame";

// 수업 틀 조각이 기대는 브라우저 · 서버 조각(talk-screen-s5 와 같은 대역)
vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));

describe("wrapShineScrollOf — 정리가 열릴 때 정리 칸의 넘김 자리(C241 보완 8)", () => {
  it("줄이 맨 아래에 붙은 칸 안에 이미 들면 null(지금처럼 맨 아래)", () => {
    // 맨 아래 자리 = 2900 - 175 = 2725, 줄 2750~2812 는 2725~2900 안
    expect(
      wrapShineScrollOf({
        lineTop: 2750,
        lineBottom: 2812,
        clientHeight: 175,
        scrollHeight: 2900,
      }),
    ).toBeNull();
    // 줄의 위 끝이 맨 아래 자리와 같아도 든다
    expect(
      wrapShineScrollOf({
        lineTop: 2725,
        lineBottom: 2800,
        clientHeight: 175,
        scrollHeight: 2900,
      }),
    ).toBeNull();
  });

  it("넘김이 없는 칸(내용이 칸보다 짧음)이면 null", () => {
    expect(
      wrapShineScrollOf({
        lineTop: 10,
        lineBottom: 70,
        clientHeight: 400,
        scrollHeight: 300,
      }),
    ).toBeNull();
  });

  it("줄이 칸 위에 있으면 그 줄의 위 끝이 칸 위 끝에 닿는 자리(맨 아래에서 가장 가까움 — 줄이 드는 자리 [아래 끝 - 칸, 위 끝] 의 가장 아래)", () => {
    // 대화 앞쪽 줄 120~190, 칸 175 → 드는 자리 15~120 가운데 맨 아래(2725)에 가장 가까운 120
    expect(
      wrapShineScrollOf({
        lineTop: 120,
        lineBottom: 190,
        clientHeight: 175,
        scrollHeight: 2900,
      }),
    ).toBe(120);
    // 맨 아래 바로 위에 걸친 줄(위 끝만 칸 밖)은 조금만 올림
    expect(
      wrapShineScrollOf({
        lineTop: 2700,
        lineBottom: 2770,
        clientHeight: 175,
        scrollHeight: 2900,
      }),
    ).toBe(2700);
  });

  it("줄이 맨 위 끝에 붙어 있어도(테가 내용 위로 넘침) 0 보다 위로 가지 않는다", () => {
    expect(
      wrapShineScrollOf({
        lineTop: -4,
        lineBottom: 66,
        clientHeight: 175,
        scrollHeight: 2900,
      }),
    ).toBe(0);
  });

  it("줄이 칸보다 높아도 줄의 위 끝이 칸 위 끝에 닿는 자리(첫머리가 보임)", () => {
    expect(
      wrapShineScrollOf({
        lineTop: 300,
        lineBottom: 520,
        clientHeight: 175,
        scrollHeight: 2900,
      }),
    ).toBe(300);
  });

  it("맨 아래 줄의 테가 내용 아래 끝을 넘으면 맨 아래 자리를 넘지 않는다", () => {
    expect(
      wrapShineScrollOf({
        lineTop: 2730,
        lineBottom: 2904,
        clientHeight: 175,
        scrollHeight: 2900,
      }),
    ).toBe(2725);
  });

  it("강조 테 두께는 ring-4 와 같은 4px", () => {
    expect(WRAP_SHINE_RING_PX).toBe(4);
  });
});

// 돌아갈 길(UI · UX plan 묶음 0-가 · spec 설계 4 '필수 (나) 막다른 화면이 없다' · [승인 UX3] · [승인 UX4] · 설계 6 문구 표).
// 막힘 판은 큰 '다시 해 볼래요' · 작은 '홈', 쉬는 화면은 큰 '홈' · 작은 '다시 해 볼래요'(그 화면 글이 권하는 행동이 큰 단추).
// 쉬는 화면 '다시 해 볼래요'는 같은 판정 함수(aiRestingToday)를 다시 읽고, 풀리면 같은 자리로, 아니면 '아직 쉬고 있어요 …' 한 줄.
// 홈 · 목록은 화면을 떠나지 않고 누른 카드 아래 한 줄 칸에 쉼 글(R-11 · R-15). 회화 끊김 · 실패 줄은 큰 '다시 해 볼래요'(N-11).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/placement", () => ({}));

import { selectionKeptOf } from "@/app/(child)/[area]/lessons/lesson-board";
import {
  LESSON_START_TEXT,
  restAfterStartOf,
} from "@/app/(child)/[area]/lessons/use-lesson-start";
import { micRecheckPressOf } from "@/app/(child)/home-cards";
import {
  perceivedWaitOf,
  TALK_TEXT,
  TroubleLine,
  takeRestResend,
} from "@/components/conversation/talk-frame";
import {
  AI_REST_TEXT,
  AiRest,
  AiRestLine,
  aiRestTroubleOf,
  runAiRestRetry,
  troubleTextOf,
} from "@/components/session/ai-rest";
import {
  MIC_BLOCKED_TEXT,
  MicBlockedPanel,
  stuckButtonsOf,
} from "@/components/session/mic-blocked";
import type { SpeechPort } from "@/lib/speech/types";

/** 그림에서 큰 · 작은 단추 표지가 나오는 차례(그 표지 뒤 글을 함께). */
const sizedButtons = (html: string) =>
  [...html.matchAll(/data-button-size="(big|small)"[^>]*>([^<]*)</g)].map(
    (m) => [m[1], m[2]],
  );

describe("막힘 · 쉼 단추 차례([승인 UX3])", () => {
  it("UX3 단추 차례: 막힘은 '다시 해 볼래요'가 크고 '홈'이 작으며, 쉼은 '홈'이 크고 '다시 해 볼래요'가 작다", () => {
    expect(stuckButtonsOf("blocked")).toEqual({ big: "retry", small: "home" });
    expect(stuckButtonsOf("resting")).toEqual({ big: "home", small: "retry" });
  });

  it("UX3 막힘 판: 안내 줄 뒤 큰 '다시 해 볼래요' · 작은 '홈' 차례로 그리고, 홈은 단추 · 링크 둘 다 된다", () => {
    const port = {} as SpeechPort;
    for (const kind of ["needsMic", "stalled", "silent"] as const) {
      const html = renderToStaticMarkup(
        createElement(MicBlockedPanel, {
          kind,
          ipadSafari: false,
          retry: { speech: port, onRecovered: () => {} },
          home: { onClick: () => {} },
        }),
      );
      expect(html).toContain(MIC_BLOCKED_TEXT[kind]);
      expect(html).toContain("data-mic-retry");
      expect(sizedButtons(html)).toEqual([
        ["big", MIC_BLOCKED_TEXT.retry],
        ["small", "홈"],
      ]);
      // 안내 줄이 단추보다 앞
      expect(html.indexOf(MIC_BLOCKED_TEXT[kind])).toBeLessThan(
        html.indexOf("data-mic-retry"),
      );
    }
    const linked = renderToStaticMarkup(
      createElement(MicBlockedPanel, {
        kind: "needsMic",
        ipadSafari: true,
        retry: { speech: port, onRecovered: () => {} },
        home: { href: "/" },
      }),
    );
    expect(linked).toContain('href="/"');
    expect(linked).toContain(MIC_BLOCKED_TEXT.ipadSilentMode);
    expect(sizedButtons(linked)).toEqual([
      ["big", MIC_BLOCKED_TEXT.retry],
      ["small", "홈"],
    ]);
  });

  it("UX3 막힘 판: 음성 접점이 아직 없으면 '다시 해 볼래요'는 흐리고 '홈'은 누를 수 있다", () => {
    const html = renderToStaticMarkup(
      createElement(MicBlockedPanel, {
        kind: "stalled",
        ipadSafari: false,
        retry: { speech: undefined, onRecovered: () => {} },
        home: { onClick: () => {} },
      }),
    );
    expect(html).toMatch(/data-mic-retry=""[^>]*disabled=""/);
    expect(html).not.toMatch(/data-button-size="small"[^>]*disabled=""/);
  });
});

describe("쉬는 화면 '다시 해 볼래요'([승인 UX4] · R-50)", () => {
  it("UX4 문구: 다시 확인 뒤에도 쉬면 '아직 쉬고 있어요. 조금 뒤에 다시 눌러 봐요'(설계 6 그대로)", () => {
    expect(AI_REST_TEXT.still).toBe(
      "아직 쉬고 있어요. 조금 뒤에 다시 눌러 봐요",
    );
    expect(AI_REST_TEXT.retry).toBe("다시 해 볼래요");
  });

  it("UX4 쉬는 화면: 다시 해 보기를 넘기면 큰 '홈' · 작은 '다시 해 볼래요' 차례이고, 넘기지 않으면 '홈' 하나다", () => {
    const html = renderToStaticMarkup(
      createElement(AiRest, {
        teacherName: "미나",
        onHome: () => {},
        retry: { onRetry: () => {} },
      }),
    );
    expect(html).toContain("미나가 잠깐 쉬어요. 다른 공부를 해 볼까요");
    expect(sizedButtons(html)).toEqual([
      ["big", "홈"],
      ["small", AI_REST_TEXT.retry],
    ]);
    expect(html).toContain("data-ai-rest-retry");
    expect(html).not.toContain(AI_REST_TEXT.still);
    const plain = renderToStaticMarkup(createElement(AiRest, {}));
    expect(plain).toContain('href="/"');
    expect(plain).not.toContain("data-ai-rest-retry");
  });

  it("UX4 쉬는 화면: 다시 확인했는데 쉬면 '아직 쉬고 있어요 …' 한 줄을 더하고, 확인하는 동안은 '다시 해 볼래요'를 흐린다", () => {
    const still = renderToStaticMarkup(
      createElement(AiRest, {
        onHome: () => {},
        retry: { onRetry: () => {}, still: true },
      }),
    );
    expect(still).toContain("data-ai-rest-still");
    expect(still).toContain(AI_REST_TEXT.still);
    const checking = renderToStaticMarkup(
      createElement(AiRest, {
        onHome: () => {},
        retry: { onRetry: () => {}, checking: true },
      }),
    );
    expect(checking).toMatch(/data-ai-rest-retry=""[^>]*disabled=""/);
    expect(checking).not.toMatch(/data-button-size="big"[^>]*disabled=""/);
  });

  it("UX4 다시 확인 한 번: 풀리면 같은 자리로(onReleased), 아직 쉬면 'still', 확인이 닿지 않으면 'failed' 이고 둘 다 그대로 둔다", async () => {
    const released = vi.fn();
    expect(
      await runAiRestRetry({
        recheck: async () => ({ resting: false }),
        onReleased: released,
      }),
    ).toBe("released");
    expect(released).toHaveBeenCalledTimes(1);
    released.mockClear();
    expect(
      await runAiRestRetry({
        recheck: async () => ({ resting: true }),
        onReleased: released,
      }),
    ).toBe("still");
    expect(
      await runAiRestRetry({
        recheck: async () => {
          throw new Error("offline");
        },
        onReleased: released,
      }),
    ).toBe("failed");
    expect(released).not.toHaveBeenCalled();
  });
});

describe("홈 · 목록 쉼 한 줄 칸(R-11 · R-15)", () => {
  it("R-15 쉼 한 줄: 카드 아래 칸에 '[이름](이/가) 잠깐 쉬어요 …'만 두고 '홈' 단추는 없으며, 다시 눌러도 쉬면 '아직 쉬고 있어요 …'를 더한다", () => {
    const line = renderToStaticMarkup(
      createElement(AiRestLine, { teacherName: "리오" }),
    );
    expect(line).toContain("data-ai-rest-line");
    expect(line).toContain("리오가 잠깐 쉬어요. 다른 공부를 해 볼까요");
    expect(line).not.toContain("<button");
    expect(line).not.toContain("<a ");
    expect(line).not.toContain(AI_REST_TEXT.still);
    const again = renderToStaticMarkup(
      createElement(AiRestLine, { again: true }),
    );
    expect(again).toContain("선생님이 잠깐 쉬어요");
    expect(again).toContain(AI_REST_TEXT.still);
  });

  it("R-15 다시 누름: 같은 수업을 또 눌러 또 쉬면 again, 다른 수업이거나 처음이면 again 이 아니고, 쉬지 않으면 쉼을 지운다", () => {
    expect(restAfterStartOf(undefined, "a", true)).toEqual({
      resting: true,
      again: false,
      restedLesson: "a",
    });
    expect(restAfterStartOf("a", "a", true)).toEqual({
      resting: true,
      again: true,
      restedLesson: "a",
    });
    expect(restAfterStartOf("a", "b", true)).toEqual({
      resting: true,
      again: false,
      restedLesson: "b",
    });
    expect(restAfterStartOf("a", "a", false)).toEqual({
      resting: false,
      again: false,
      restedLesson: undefined,
    });
  });
});

describe("회화 끊김 · 실패 줄(N-11 · 설계 6)", () => {
  it("N-11 회화 끊김 · 실패 줄: 다시 부를 일이 있으면 큰 '다시 해 볼래요'(막힘 판과 같은 말), 없으면 단추가 없다", () => {
    expect(TALK_TEXT.retry).toBe("다시 해 볼래요");
    expect(TALK_TEXT.retry).toBe(MIC_BLOCKED_TEXT.retry);
    for (const phase of ["offline", "failed"] as const) {
      const html = renderToStaticMarkup(
        createElement(TroubleLine, { phase, retry: () => {} }),
      );
      expect(html).toContain("data-talk-retry");
      expect(sizedButtons(html)).toEqual([["big", TALK_TEXT.retry]]);
      const none = renderToStaticMarkup(
        createElement(TroubleLine, { phase, retry: null }),
      );
      expect(none).not.toContain("data-talk-retry");
    }
  });
});

// ── 쉼 다시 확인 서버 액션(접근 쿠키 확인 뒤 같은 판정 함수) ──

const access = vi.fn(async () => {});
const resting = vi.fn(async () => false);
const profile = vi.fn(
  async (): Promise<{ id: string } | undefined> => ({
    id: "p1",
  }),
);

describe("쉼 다시 확인 액션 recheckAiRest", () => {
  beforeEach(() => {
    vi.resetModules();
    access.mockClear();
    resting.mockClear();
    vi.doUnmock("@/server/actions/session");
    vi.doMock("@/server/access/guard", () => ({ requireAccess: access }));
    vi.doMock("@/server/profile", () => ({
      readHouseholdProfile: () => profile(),
    }));
    vi.doMock("@/server/session/ai-gate", () => ({
      aiRestingToday: (...args: unknown[]) =>
        (resting as unknown as (...a: unknown[]) => Promise<boolean>)(...args),
    }));
    vi.doMock("@/server/clock", () => ({
      now: () => new Date("2026-10-29T12:00:00Z"),
    }));
    vi.doMock("@/server/session", () => ({}));
    vi.doMock("@/server/writing", () => ({}));
    vi.doMock("@/server/alerts/device", () => ({}));
    vi.doMock("@/server/db", () => ({ getDb: () => ({}) }));
    vi.doMock("@/server/settings", () => ({ getSettings: async () => ({}) }));
  });

  it("UX4 recheckAiRest: 접근 확인을 먼저 하고 그 프로필 · 지금 시각으로 aiRestingToday 를 다시 읽어 돌려준다", async () => {
    const { recheckAiRest } = await import("@/server/actions/session");
    resting.mockResolvedValueOnce(true);
    expect(await recheckAiRest()).toEqual({ resting: true });
    expect(access).toHaveBeenCalledTimes(1);
    expect(resting).toHaveBeenCalledWith(
      { profileId: "p1", at: new Date("2026-10-29T12:00:00Z") },
      expect.anything(),
    );
    resting.mockResolvedValueOnce(false);
    expect(await recheckAiRest()).toEqual({ resting: false });
  });

  it("UX4 recheckAiRest: 프로필이 없으면 쉬지 않음(판정 함수를 부르지 않음)", async () => {
    const { recheckAiRest } = await import("@/server/actions/session");
    profile.mockResolvedValueOnce(undefined);
    expect(await recheckAiRest()).toEqual({ resting: false });
    expect(resting).not.toHaveBeenCalled();
  });

  it("R-10 micCheckSpeech: 접근 확인 뒤 음성 설정을 돌려준다(홈 닫힌 카드의 다시 확인이 막힘 판과 같은 확인을 하게)", async () => {
    const { testSettingValues } = await import("../fixtures/settings");
    const values = testSettingValues();
    vi.doMock("@/server/settings", () => ({
      getSettings: async (schemas: Record<string, unknown>) =>
        Object.fromEntries(Object.keys(schemas).map((k) => [k, values[k]])),
    }));
    const { micCheckSpeech } = await import("@/server/actions/session");
    const speech = await micCheckSpeech();
    expect(access).toHaveBeenCalledTimes(1);
    expect(speech.lang).toBe(values["speech.lang"]);
  });
});

// ── fix 1(코드 검토 0-가 M1 · M2 · M3 · M5) ──

describe("fix 1 돌아갈 길 보정", () => {
  it("M1 목록 고른 표시: 오류 줄이 있거나 쉼 글이 보이면 고른 표시를 되돌리고, 기다리는 동안은 둔다", () => {
    expect(selectionKeptOf({ status: "", restShown: false })).toBe(true);
    expect(selectionKeptOf({ status: "", restShown: true })).toBe(false);
    expect(
      selectionKeptOf({ status: LESSON_START_TEXT.failed, restShown: false }),
    ).toBe(false);
  });

  it("M2 쉼 다시 확인이 닿지 않으면 '아직 쉬고 있어요'가 아니라 있는 끊김 · 실패 글 한 줄이다(새 문구 없음)", () => {
    expect(troubleTextOf(false)).toBe(LESSON_START_TEXT.offline);
    expect(troubleTextOf(true)).toBe(LESSON_START_TEXT.failed);
    expect(aiRestTroubleOf("failed", false)).toBe(LESSON_START_TEXT.offline);
    expect(aiRestTroubleOf("failed", true)).toBe(LESSON_START_TEXT.failed);
    expect(aiRestTroubleOf("still", true)).toBeUndefined();
    expect(aiRestTroubleOf("released", true)).toBeUndefined();
    const html = renderToStaticMarkup(
      createElement(AiRest, {
        onHome: () => {},
        retry: { onRetry: () => {}, trouble: LESSON_START_TEXT.offline },
      }),
    );
    expect(html).toContain("data-ai-rest-trouble");
    expect(html).toContain(LESSON_START_TEXT.offline);
    expect(html).not.toContain(AI_REST_TEXT.still);
  });

  it("M3 홈 다시 확인 줄: 음성 설정을 읽었으면 마이크 확인, 읽기에 실패했으면 누를 때 다시 읽고, 읽는 중이면 기다린다", () => {
    expect(micRecheckPressOf("ready")).toBe("check");
    expect(micRecheckPressOf("failed")).toBe("reload");
    expect(micRecheckPressOf("loading")).toBe("wait");
  });

  it("M5 회화 쉼 풀림: 멈춘 턴을 꺼내고 말을 멈춘 때를 비워, 다시 보낸 턴의 체감 대기에 쉼 시간이 들어가지 않는다", () => {
    const body = { sessionId: "s1" } as never;
    const resend = { current: body };
    const listenEndedAt = { current: 1234 as number | undefined };
    expect(takeRestResend({ resend, listenEndedAt })).toBe(body);
    expect(resend.current).toBeNull();
    expect(listenEndedAt.current).toBeUndefined();
    expect(perceivedWaitOf(listenEndedAt.current, 999_999)).toBeUndefined();
    expect(takeRestResend({ resend, listenEndedAt })).toBeNull();
  });
});

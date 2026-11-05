// 수업 고르기의 첫 화면 읽어 주기 잠금 풀기(가르치고 배우는 수업 plan 정한 것 11 · 위험 4 · 묶음 마-2, 정본 15절 AC-3i 의 첫 화면 몫 ·
// AC-N20). 문서 단위 잠금 풀기(src/lib/speech/unlock.ts)를 가짜 읽어 주기 접점으로 보고, 수업 고르기(useLessonStart().start)가 누름 처리
// 안 — 첫 await 앞 — 에서 그것을 부르는지 본다. 고르기 훅은 정적 그림으로 한 번 그려 start 를 꺼낸다(효과 · 상태 갱신은 돌지 않음).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  unlock: vi.fn(() => true),
  startLesson: vi.fn(
    async (_: unknown): Promise<unknown> => ({ ok: true, sessionId: "s-1" }),
  ),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: calls.push, refresh: calls.refresh }),
}));
vi.mock("@/server/actions/session", () => ({
  startLesson: calls.startLesson,
  saveAttempts: async () => ({ ok: true, accepted: [], rejected: [] }),
}));
vi.mock("@/lib/attempt-queue", () => ({
  createAttemptQueue: () => ({ flush: async () => {}, dispose: () => {} }),
}));
vi.mock("@/lib/speech/unlock", () => ({
  unlockSpeechInDocument: calls.unlock,
}));

import { useLessonStart } from "@/app/(child)/[area]/lessons/use-lesson-start";
import type * as UnlockModule from "@/lib/speech/unlock";

/** 고르기 훅을 한 번 그려 start 를 꺼낸다. */
function startOf(): ReturnType<typeof useLessonStart>["start"] {
  let start: ReturnType<typeof useLessonStart>["start"] | undefined;
  function Probe() {
    start = useLessonStart([1, 2]).start;
    return null;
  }
  renderToStaticMarkup(createElement(Probe));
  if (!start) throw new Error("훅을 그리지 못했다");
  return start;
}

describe("수업 고르기의 잠금 풀기(정한 것 11 · AC-3i)", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      localStorage: undefined,
    });
    for (const fn of Object.values(calls)) fn.mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("AC-3i 수업 카드를 누르면 첫 await 앞(누름 처리 안)에서 문서 단위 잠금 풀기를 한 번 부르고, 그 뒤에 세션을 열어 /session/<id> 로 간다", async () => {
    const start = startOf();
    const pending = start("lesson-1");
    // 누름 처리 안: start 가 처음 멈추기 전에 이미 불렸다(서버 요청보다 먼저)
    expect(calls.unlock).toHaveBeenCalledTimes(1);
    expect(calls.startLesson).not.toHaveBeenCalled();
    await pending;
    expect(calls.startLesson).toHaveBeenCalledTimes(1);
    expect(calls.unlock.mock.invocationCallOrder[0]).toBeLessThan(
      calls.startLesson.mock.invocationCallOrder[0] ?? 0,
    );
    expect(calls.push).toHaveBeenCalledWith("/session/s-1");
  });

  it("AC-3i 확인 쪽지에서 다른 수업을 고른 때(confirmAbort)도 누름이라 잠금 풀기를 부르고, 열지 못해도(거부) 고르기는 그대로 끝난다", async () => {
    calls.startLesson.mockResolvedValueOnce({ ok: false, reason: "locked" });
    const start = startOf();
    await start("lesson-2", true);
    expect(calls.unlock).toHaveBeenCalledTimes(1);
    expect(calls.startLesson).toHaveBeenCalledWith({
      lessonId: "lesson-2",
      confirmAbort: true,
    });
    expect(calls.refresh).toHaveBeenCalledTimes(1);
  });
});

describe("문서 단위 잠금 풀기(src/lib/speech/unlock.ts — 가짜 접점)", () => {
  async function real() {
    return vi.importActual<typeof UnlockModule>("@/lib/speech/unlock");
  }

  it("AC-N20 읽어 주기 API 가 있으면 소리 없는 글 하나(크기 0)를 읽고 true", async () => {
    const { unlockSpeechInDocument } = await real();
    const spoken: { text: string; volume: number }[] = [];
    class FakeUtterance {
      volume = 1;
      constructor(readonly text: string) {}
    }
    const ok = unlockSpeechInDocument({
      speechSynthesis: {
        speak: (u) => {
          const { text, volume } = u as unknown as FakeUtterance;
          spoken.push({ text, volume });
        },
      },
      SpeechSynthesisUtterance:
        FakeUtterance as unknown as typeof SpeechSynthesisUtterance,
    });
    expect(ok).toBe(true);
    expect(spoken).toEqual([{ text: " ", volume: 0 }]);
  });

  it("AC-N20 읽어 주기 API 가 없거나(서버 · 미지원 기기) 던지면 아무것도 막지 않고 false", async () => {
    const { unlockSpeechInDocument } = await real();
    expect(unlockSpeechInDocument(undefined)).toBe(false);
    expect(unlockSpeechInDocument({})).toBe(false);
    expect(
      unlockSpeechInDocument({
        speechSynthesis: null,
        SpeechSynthesisUtterance: class {} as never,
      }),
    ).toBe(false);
    expect(
      unlockSpeechInDocument({
        speechSynthesis: {
          speak: () => {
            throw new Error("not-allowed");
          },
        },
        SpeechSynthesisUtterance: class {
          volume = 1;
        } as never,
      }),
    ).toBe(false);
  });
});

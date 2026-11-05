// 소리를 들려주지 못함(UI · UX spec R-57 · 설계 4 N-19 · 설계 6 문구 표 · AC-23a (5), src/components/session/sound-retry.tsx).
// 들려준 결과는 음성 층의 speakHeardOutcomeOf 로만 읽고(0-라), '한 번도 들려주지 못함'은 not_played 만이다. 한 번 못 들려주면 안내 한 줄과
// 큰 '다시 듣기', 다시도 못 들려주면 무음 모드 줄(아이패드 사파리)과 작은 '다음'(배치 예비 문항은 '다음' 없이 기다림). 저절로 넘기지 않는다.
// 질문 답 인식 글(L-33 · AC-23f)은 따라 말하기와 같은 조각 · 같은 표지(data-heard)다.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  heardTrackedSpeech,
  SOUND_RETRY_TEXT,
  SOUND_TRACK_START,
  SoundRetry,
  type SoundTrack,
  soundRetryStepOf,
  soundTechErrorOf,
  soundTrackOf,
} from "@/components/session/sound-retry";
import { HeardLine } from "@/components/session/speaking";
import { MIC_BLOCKED_TEXT } from "@/components/session/stuck-buttons";
import type { SpeakOutcome, SpeechPort } from "@/lib/speech/types";

vi.mock("client-only", () => ({}));

const played: SpeakOutcome = { kind: "ended", heard: "played" };
const noEnd: SpeakOutcome = { kind: "ended", heard: "no_end" };
const notPlayed: SpeakOutcome = { kind: "ended", heard: "not_played" };
const errorBefore: SpeakOutcome = {
  kind: "error",
  code: "synthesis-failed",
  started: false,
};
const skipped: SpeakOutcome = { kind: "skipped", reason: "read_ko_off" };

const run = (...outcomes: SpeakOutcome[]): SoundTrack =>
  outcomes.reduce(soundTrackOf, SOUND_TRACK_START);

describe("들려준 결과 모으기(R-57)", () => {
  it("R-57 not_played 만 '들려주지 못함'으로 세고, 들려줌 · 끝 알림 없음 · 끊김은 들려준 것으로 본다", () => {
    expect(run(notPlayed)).toEqual({
      everHeard: false,
      failed: 1,
      last: "not_played",
    });
    expect(run(errorBefore)).toMatchObject({ everHeard: false, failed: 1 });
    expect(run({ kind: "unsupported" })).toMatchObject({ failed: 1 });
    for (const heard of [played, noEnd, { kind: "cancelled" } as const])
      expect(run(heard).everHeard).toBe(true);
    // 끝 알림 없음은 들려준 것으로 보되 표시만 남긴다(안내 없음)
    expect(run(noEnd).last).toBe("no_end");
  });

  it("R-57 읽지 않은 한국어 줄(skipped)은 들려주지 못함이 아니라 셈에 넣지 않는다", () => {
    expect(run(skipped)).toEqual(SOUND_TRACK_START);
    expect(run(notPlayed, skipped)).toEqual(run(notPlayed));
  });

  it("R-57 한 번이라도 들려줬으면 그 뒤에 못 들려줘도 '한 번도 들려주지 못함'이 아니다", () => {
    const after = run(played, notPlayed);
    expect(after.everHeard).toBe(true);
    expect(soundTechErrorOf(after)).toBeUndefined();
    expect(soundRetryStepOf(after, { canSkip: true })).toBe("none");
  });
});

describe("보일 것(N-19 · 설계 6)", () => {
  it("N-19 아직 결과가 없으면 아무것도 없고, 한 번 못 들려주면 다시 듣기, 다시도 못 들려주면 작은 '다음'(배치 예비는 기다림)", () => {
    expect(soundRetryStepOf(SOUND_TRACK_START, { canSkip: true })).toBe("none");
    expect(soundRetryStepOf(run(notPlayed), { canSkip: true })).toBe("retry");
    expect(soundRetryStepOf(run(notPlayed, notPlayed), { canSkip: true })).toBe(
      "next",
    );
    expect(
      soundRetryStepOf(run(notPlayed, notPlayed, notPlayed), {
        canSkip: true,
      }),
    ).toBe("next");
    // 배치 예비 문항: '다음' 없이 같은 자리에서 다시 듣기를 기다린다(R-56)
    expect(
      soundRetryStepOf(run(notPlayed, notPlayed), { canSkip: false }),
    ).toBe("wait");
    // 다시 듣기로 들려주면 안내가 사라지고 그 뒤 답은 보통대로
    expect(soundRetryStepOf(run(notPlayed, played), { canSkip: true })).toBe(
      "none",
    );
  });

  it("AC-23a (5) 들려주지 못한 채 받은 답만 기술 오류(speak_fail)이고, 결과가 아직 없으면 보통 답이다", () => {
    expect(soundTechErrorOf(SOUND_TRACK_START)).toBeUndefined();
    expect(soundTechErrorOf(run(notPlayed))).toBe("speak_fail");
    expect(soundTechErrorOf(run(notPlayed, notPlayed))).toBe("speak_fail");
    expect(soundTechErrorOf(run(notPlayed, noEnd))).toBeUndefined();
  });

  it("설계 6 문구 표: 안내 · 큰 '다시 듣기' · 작은 '다음'과 무음 모드 줄(C111)은 글자 그대로다", () => {
    expect(SOUND_RETRY_TEXT).toEqual({
      notice: "소리가 안 나왔어요. 다시 들어 봐요",
      replay: "다시 듣기",
      next: "다음",
      silentMode: MIC_BLOCKED_TEXT.ipadSilentMode,
    });
  });

  it("N-19 그림: 다시 듣기는 안내 줄과 큰 단추만, 다음 차례는 아이패드 사파리면 무음 모드 줄과 작은 '다음', 기다림은 '다음' 없음", () => {
    const draw = (
      step: "none" | "retry" | "next" | "wait",
      ipadSafari: boolean,
    ) =>
      renderToStaticMarkup(
        createElement(SoundRetry, {
          step,
          ipadSafari,
          onReplay: () => {},
          onNext: () => {},
        }),
      );
    expect(draw("none", true)).toBe("");
    const retry = draw("retry", true);
    expect(retry).toContain('data-sound-retry="retry"');
    expect(retry).toContain(SOUND_RETRY_TEXT.notice);
    expect(retry).toContain("data-sound-retry-replay");
    expect(retry).not.toContain("data-sound-retry-next");
    // 무음 모드 줄은 다시 듣기도 못 들려준 뒤에만
    expect(retry).not.toContain(SOUND_RETRY_TEXT.silentMode);
    const next = draw("next", true);
    expect(next).toContain(SOUND_RETRY_TEXT.silentMode);
    expect(next).toContain("data-sound-retry-next");
    expect(draw("next", false)).not.toContain(SOUND_RETRY_TEXT.silentMode);
    const wait = draw("wait", true);
    expect(wait).toContain(SOUND_RETRY_TEXT.silentMode);
    expect(wait).toContain("data-sound-retry-replay");
    expect(wait).not.toContain("data-sound-retry-next");
    // 판 안 아래 줄(설계 5.4 — 큰 단추는 판 아래 끝)
    expect(retry).toContain("mt-auto");
  });
});

describe("들려준 결과를 듣는 접점", () => {
  function deferredPort() {
    const pending: ((outcome: SpeakOutcome) => void)[] = [];
    const port = {
      device: () => ({ kind: "ok" }) as never,
      unlockFromGesture: () => {},
      speak: () =>
        new Promise<SpeakOutcome>((resolve) => {
          pending.push(resolve);
        }),
      cancelSpeaking: () => {},
      listen: () => {
        throw new Error("듣지 않는다");
      },
      checkMicrophone: async () => ({ ok: true }) as const,
      dispose: () => {},
    } satisfies SpeechPort;
    return { port, pending };
  }

  it("R-57 마지막으로 부른 읽기의 결과만 알리고, 뒤 읽기가 앞 읽기를 끊은 결과(끊김)는 넘기지 않는다", async () => {
    const fake = deferredPort();
    const seen: SpeakOutcome[] = [];
    const port = heardTrackedSpeech(fake.port, (outcome) => seen.push(outcome));
    const first = port.speak("Hello.");
    const second = port.speak("Hello.");
    fake.pending[0]?.({ kind: "cancelled" });
    fake.pending[1]?.(notPlayed);
    // 부르는 쪽에는 결과를 그대로 돌려준다
    expect(await first).toEqual({ kind: "cancelled" });
    expect(await second).toEqual(notPlayed);
    expect(seen).toEqual([notPlayed]);
  });
});

describe("질문 답 인식 글(L-33 · AC-23f)", () => {
  it("AC-23f 인식 글 줄은 따라 말하기와 같은 표지(data-heard) · 영어 글이고, 글이 없으면 그리지 않는다", () => {
    const html = renderToStaticMarkup(
      createElement(HeardLine, { text: "I like apples." }),
    );
    expect(html).toContain("data-heard");
    expect(html).toContain('lang="en"');
    expect(html).toContain("I like apples.");
    expect(
      renderToStaticMarkup(createElement(HeardLine, { text: undefined })),
    ).toBe("");
  });
});

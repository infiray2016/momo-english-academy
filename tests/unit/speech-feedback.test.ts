// 음성 · 듣기 피드백(UX 검토 3판 U4-2 · U4-4 · U5-1 · U5-3 · U5-4 · U5-9 · U6-1 · U4-5, 13절 C166 R1 · R2 · R6). 단추 글 · 흐림 ·
// 소리 들어옴 · 막힘 화면 '다시 해 볼래요' · 아이 말풍선은 정적 그림과 순수 함수로, 소리 들어옴 알림은 가짜 인식 객체로 본다.
// 아이 화면 문구는 브리프 A 의 글자 그대로다.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/placement", () => ({}));

import { micGateAfterRecovery } from "@/app/(child)/[area]/placement/placement-flow";
import {
  SPEAK_BUTTON_TEXT,
  SpeakButton,
  speakButtonLabelOf,
  speakPressOf,
  trackedSpeech,
} from "@/components/answer/speak-button";
import {
  CHILD_TURN_TEXT,
  hintTierStateOf,
  listenHint,
} from "@/components/conversation/child-turn";
import { FOLLOW_TEXT } from "@/components/conversation/follow-along";
import {
  lessonAfterEndOf,
  lessonTurnReadyOf,
} from "@/components/conversation/talk-frame";
import {
  MIC_BLOCKED_TEXT,
  MicBlockedPanel,
  MicBlockedText,
  micRetryNextOf,
  runMicRetry,
} from "@/components/session/mic-blocked";
import { SPEAKING_TEXT } from "@/components/session/speaking";
import { speechSettingsFrom } from "@/core/speech/listen";
import { createSleeper, speakInTurn } from "@/core/speech/pace";
import { createBrowserSpeech } from "@/lib/speech/browser";
import type {
  MicrophoneCheck,
  RecognitionLike,
  SpeakOutcome,
  SpeechPort,
} from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const settings = speechSettingsFrom((key) => values[key]);

const button = (props: Partial<Parameters<typeof SpeakButton>[0]>) =>
  renderToStaticMarkup(
    createElement(SpeakButton, {
      label: "말하기",
      listening: false,
      onPress: () => {},
      ...props,
    }),
  );

describe("말하기 단추 — 듣는 중 표시(U4-2)", () => {
  it("U4-2 말하기 단추: 듣는 동안 글이 '듣고 있어요'로 바뀌고, 두 문장 이상 답의 듣는 중 글('다 말했어요')은 그대로 이긴다", () => {
    expect(SPEAK_BUTTON_TEXT.listening).toBe("듣고 있어요");
    expect(speakButtonLabelOf({ label: "말하기", listening: false })).toBe(
      "말하기",
    );
    expect(speakButtonLabelOf({ label: "말하기", listening: true })).toBe(
      "듣고 있어요",
    );
    expect(
      speakButtonLabelOf({
        label: "말하기",
        listeningLabel: "다 말했어요",
        listening: true,
      }),
    ).toBe("다 말했어요");
    expect(button({ listening: true })).toContain("듣고 있어요");
    expect(button({ listening: false })).not.toContain("듣고 있어요");
  });

  it("U4-2 말하기 단추: 듣는 동안 소리가 들어오면 소리 들어옴 표시(data-sound-in)가 붙고, 듣지 않을 때는 붙지 않는다", () => {
    expect(button({ listening: true, soundIn: true })).toContain(
      "data-sound-in",
    );
    expect(button({ listening: true, soundIn: false })).not.toContain(
      "data-sound-in",
    );
    expect(button({ listening: false, soundIn: true })).not.toContain(
      "data-sound-in",
    );
  });

  it("U4-2 음성 접점: 듣는 동안 소리 들어옴(soundstart · speechstart)을 듣기마다 한 번 알린다", async () => {
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("document", {
      hidden: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    try {
      const ctor = class Fake {
        lang = "";
        continuous = false;
        interimResults = false;
        maxAlternatives = 1;
        onstart: ((e: Event) => void) | null = null;
        onaudiostart: ((e: Event) => void) | null = null;
        onsoundstart: ((e: Event) => void) | null = null;
        onspeechstart: ((e: Event) => void) | null = null;
        onspeechend: ((e: Event) => void) | null = null;
        onsoundend: ((e: Event) => void) | null = null;
        onaudioend: ((e: Event) => void) | null = null;
        onnomatch: ((e: Event) => void) | null = null;
        onresult: ((e: never) => void) | null = null;
        onerror: ((e: never) => void) | null = null;
        onend: ((e: Event) => void) | null = null;
        start() {
          setTimeout(() => {
            this.onstart?.(new Event("start"));
            this.onaudiostart?.(new Event("audiostart"));
            this.onsoundstart?.(new Event("soundstart"));
            this.onspeechstart?.(new Event("speechstart"));
          }, 0);
        }
        stop() {}
        abort() {}
      } as unknown as new () => RecognitionLike;
      const port = createBrowserSpeech({ settings, recognitionCtor: ctor });
      let sounds = 0;
      const handle = port.listen(
        { chunkMs: settings.maxListenMs },
        {
          sound: () => {
            sounds += 1;
          },
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(sounds).toBe(1);
      handle.cancel();
      port.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("따라 말하기 — 읽는 중 흐림(C166 R2)", () => {
  it("R2 말하기 단추: 읽는 중이면 흐리게(data-speak-waiting) 두되 끄지 않는다(disabled 아님)", () => {
    const waiting = button({ waiting: true });
    expect(waiting).toContain("data-speak-waiting");
    expect(waiting).not.toContain('disabled=""');
    expect(button({ waiting: false })).not.toContain("data-speak-waiting");
  });

  it("R2 말하기 단추: 읽는 중 누르면 듣지 않고 '다 읽은 뒤 눌러요' 한 줄, 듣는 중 누름 · 읽기가 끝난 뒤 누름은 그대로 누름이다", () => {
    expect(SPEAK_BUTTON_TEXT.waitReading).toBe("다 읽은 뒤 눌러요");
    expect(speakPressOf({ waiting: true, listening: false })).toBe("wait-note");
    expect(speakPressOf({ waiting: true, listening: true })).toBe("press");
    expect(speakPressOf({ waiting: false, listening: false })).toBe("press");
  });

  it("R2 읽는 중 알림: 감싼 음성 접점이 읽기 시작에 켜고 마지막 읽기의 결과에 끈다(겹쳐도 한 번씩)", async () => {
    const pending: ((o: SpeakOutcome) => void)[] = [];
    const port = {
      speak: () =>
        new Promise<SpeakOutcome>((resolve) => {
          pending.push(resolve);
        }),
      cancelSpeaking: () => {},
    } as unknown as SpeechPort;
    const seen: boolean[] = [];
    const tracked = trackedSpeech(port, (speaking) => seen.push(speaking));
    const first = tracked.speak("One.");
    const second = tracked.speak("Two.");
    expect(seen).toEqual([true]);
    pending[0]?.({ kind: "cancelled" });
    await first;
    expect(seen).toEqual([true]);
    pending[1]?.({ kind: "ended", heard: "played" });
    await second;
    expect(seen).toEqual([true, false]);
  });
});

describe("건너뜀 · '모름' 전환 한 줄 안내(U4-4 · U5-4)", () => {
  it("U4-4 건너뜀 안내: 인식이 세 번 안 돼 다음으로 갈 때 말하기 · 회화 따라 말하기 모두 '이건 다음에 다시 해요' 한 줄이다", () => {
    expect(SPEAK_BUTTON_TEXT.skipped).toBe("이건 다음에 다시 해요");
    expect(SPEAKING_TEXT.skipped).toBe(SPEAK_BUTTON_TEXT.skipped);
    expect(FOLLOW_TEXT.skipped).toBe(SPEAK_BUTTON_TEXT.skipped);
  });

  it("U5-4 '모름' 전환 안내: 말소리 없음이 이어져 '모름'으로 넘어갈 때 '말소리가 안 들려서 [이름](이/가) 도와줄게요' 한 줄이다", () => {
    // 검토 A I-2: '모름' 뒤에는 같은 질문을 다시 듣으므로 '다음으로 가요'가 아니라 선생님이 도와준다는 말(3.3 막힘 문단)
    expect(CHILD_TURN_TEXT.nospeechMove(undefined)).toBe(
      "말소리가 안 들려서 선생님이 도와줄게요",
    );
    expect(CHILD_TURN_TEXT.nospeechMove("하늘")).toBe(
      "말소리가 안 들려서 하늘이 도와줄게요",
    );
    expect(CHILD_TURN_TEXT.nospeechMove("나비")).toBe(
      "말소리가 안 들려서 나비가 도와줄게요",
    );
  });
});

describe("막힘 화면 '다시 해 볼래요'(U6-1 · U4-5 · C166 R6)", () => {
  it("U6-1 막힘 화면: 막힘 판에는 '다시 해 볼래요' 단추가 크게 보이고(UX3), 안내 글 조각만으로는 단추가 없다", () => {
    expect(MIC_BLOCKED_TEXT.retry).toBe("다시 해 볼래요");
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
      expect(html).toContain("data-mic-retry");
      expect(html).toMatch(
        /data-mic-retry="" data-button-size="big"[^>]*>다시 해 볼래요</,
      );
    }
    const plain = renderToStaticMarkup(
      createElement(MicBlockedText, { kind: "stalled", ipadSafari: false }),
    );
    expect(plain).not.toContain("data-mic-retry");
  });

  it("U4-5 막힘 화면: 마이크 다시 확인이 되면 같은 자리로(막힘 없음), 안 되면 같은 막힘 화면이다", () => {
    for (const kind of ["needsMic", "stalled", "silent"] as const) {
      expect(micRetryNextOf(kind, { ok: true })).toBeUndefined();
      expect(
        micRetryNextOf(kind, {
          ok: false,
          code: "not-allowed",
          group: "mic-unavailable",
        }),
      ).toBe(kind);
    }
  });
});

describe("대화 턴 아이 차례 — 읽는 중에도 연다(U5-1 · C166 R1)", () => {
  const ready = {
    opening: false,
    phase: "tori",
    bubbleDone: true,
    typedDone: true,
    typedLines: 1,
    shownLines: 1,
  };

  it("U5-1 대화 턴: 끝 줄을 받고 글이 다 흐르면 읽어 주기가 끝나기를 기다리지 않고 아이 차례(말하기 단추)를 연다", () => {
    expect(lessonTurnReadyOf(ready)).toBe(true);
    expect(lessonTurnReadyOf({ ...ready, opening: true })).toBe(false);
    expect(lessonTurnReadyOf({ ...ready, bubbleDone: false })).toBe(false);
    expect(lessonTurnReadyOf({ ...ready, typedDone: false })).toBe(false);
    expect(lessonTurnReadyOf({ ...ready, phase: "child" })).toBe(false);
    // 열 것은 끝 줄이 정한다: 마무리 물음 · 마무리 제안이면 두 버튼, 아니면 아이 차례
    const end: Parameters<typeof lessonAfterEndOf>[0] = {
      choice: null,
      prep: null,
      firstQuestionDue: false,
      segment: "talk",
      greetingDone: true,
    };
    expect(lessonAfterEndOf(end)).toEqual({ kind: "child" });
    expect(lessonAfterEndOf({ ...end, choice: "closing" })).toEqual({
      kind: "choice",
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("검토 A fix 1", () => {
  it("I-1 힌트 문장 듣기: 선생님 읽기 줄이 도는 중 누르면 줄을 먼저 멈추고 힌트가 마지막 발화다", async () => {
    vi.useFakeTimers();
    try {
      const PAUSE = settings.sentencePauseMs;
      const spoken: string[] = [];
      let settle: ((o: SpeakOutcome) => void) | undefined;
      const cut = () => {
        const s = settle;
        settle = undefined;
        s?.({ kind: "cancelled" });
      };
      // 음성 접점 흉내: 새 speak 는 앞 발화를 끊고, 발화는 PAUSE 뒤 끝난다
      const port = {
        unlockFromGesture: () => {},
        cancelSpeaking: cut,
        speak: (text: string) => {
          cut();
          spoken.push(text);
          return new Promise<SpeakOutcome>((resolve) => {
            settle = resolve;
            setTimeout(() => {
              if (settle !== resolve) return;
              settle = undefined;
              resolve({ kind: "ended", heard: "played" });
            }, PAUSE);
          });
        },
      } as unknown as SpeechPort;
      // 틀의 읽기 줄 흉내(useSpeakQueue — 세대가 바뀌면 멈춤)
      let generation = 0;
      const sleeper = createSleeper();
      const mine = generation;
      void speakInTurn(["One.", "Two.", "Three."], {
        speak: (t) => port.speak(t),
        pauseMs: PAUSE,
        sleeper,
        alive: () => mine === generation,
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(spoken).toEqual(["One."]);
      listenHint({
        speech: port,
        text: "I'm nine.",
        rate: settings.rate["1-3"],
        stopReading: () => {
          generation += 1;
          sleeper.cancel();
          port.cancelSpeaking();
        },
      });
      await vi.runAllTimersAsync();
      expect(spoken).toEqual(["One.", "I'm nine."]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("M-1 대화 턴: 같은 말풍선에 질문을 이어 붙여 흐른 줄 수가 보일 줄 수보다 적으면 아이 차례를 열지 않는다", () => {
    const ready = {
      opening: false,
      phase: "tori",
      bubbleDone: true,
      typedDone: true,
      typedLines: 2,
      shownLines: 2,
    };
    expect(lessonTurnReadyOf(ready)).toBe(true);
    expect(lessonTurnReadyOf({ ...ready, shownLines: 3 })).toBe(false);
  });

  it("M-6 힌트 단: 글을 받는 동안은 점 셋, 받기에 실패하면 점을 거두고 빈 단, 글이 있으면 글이다", () => {
    expect(hintTierStateOf(undefined, false)).toBe("loading");
    expect(hintTierStateOf(undefined, true)).toBe("empty");
    expect(hintTierStateOf("I'm nine.", false)).toBe("text");
  });

  it("M-5 U4-5 막힘 화면 다시 해 보기: 마이크가 되면 저장된 '쓸 수 없음'을 지우고 같은 자리로, 안 되면 아무것도 하지 않는다", async () => {
    const run = async (check: MicrophoneCheck) => {
      const calls: string[] = [];
      const speech = {
        unlockFromGesture: () => calls.push("unlock"),
        checkMicrophone: async () => {
          calls.push("check");
          return check;
        },
      } as unknown as SpeechPort;
      await runMicRetry({
        kind: "stalled",
        speech,
        clear: () => calls.push("clear"),
        onRecovered: () => calls.push("recovered"),
      });
      return calls;
    };
    expect(await run({ ok: true })).toEqual([
      "unlock",
      "check",
      "clear",
      "recovered",
    ]);
    expect(
      await run({ ok: false, code: "not-allowed", group: "mic-unavailable" }),
    ).toEqual(["unlock", "check"]);
  });

  it("M-8 배치 막힘 화면 다시 해 보기: 마이크 안내 전(판정 전)에 막혔다 풀리면 첫 안내를 봤는지에 따라 안내 · 준비로, 이미 지났으면 그대로다", () => {
    expect(micGateAfterRecovery("pending", false)).toBe("notice");
    expect(micGateAfterRecovery("pending", true)).toBe("ready");
    expect(micGateAfterRecovery("ready", false)).toBe("ready");
    expect(micGateAfterRecovery("notice", true)).toBe("notice");
  });
});

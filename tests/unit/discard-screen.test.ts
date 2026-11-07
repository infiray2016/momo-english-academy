// 버리는 듣기 화면 잇기(iPad 버리는 듣기 plan 묶음 3 · 13절 C213 · C214 · C215, spec 설계 2 · 3 · FR-2 · FR-3 · FR-4). 화면 순수 함수를
// 고정한다: 단추 글 · 기다림 표시(점 셋) · '말해 보세요' · 회복 문구 고르기(층이 없으면 지금 값), 소리 끝을 부를 때(아이 차례 × 줄 빔 — 다시 듣기 ·
// 힌트 · 말풍선 · 대화 기록 · 정리 길 빠짐없음), 따라 말하기 흐림과 같은 쉼의 다시 읽기 한 번, 떠남 차례(새 화면 줄보다 먼저 · 끝나는 화면은 층을
// 닫음), 짧은 말 고르기(돌려 쓰기 · 아직 말하지 않은 자리), 첫 실행 부모 줄(모드 × 기기). 시험 이름은 'AC-' 로 시작하지 않는다.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
vi.mock("@/server/actions/conversation", () => ({}));
vi.mock("@/server/actions/session", () => ({}));
vi.mock("@/server/actions/first-run", () => ({}));

import {
  FIRST_RUN_TEXT,
  firstRunDiscardLineOf,
} from "@/app/(setup)/first-run/first-run-flow";
import {
  SPEAK_BUTTON_TEXT,
  SpeakButton,
  speakButtonLabelOf,
} from "@/components/answer/speak-button";
import {
  CHILD_TURN_TEXT,
  ChildTurn,
  type ChildTurnProps,
  discardLineOf,
  listenHint,
  type TurnListenEnd,
  turnDiscardAfterOf,
} from "@/components/conversation/child-turn";
import {
  FOLLOW_REREAD_START,
  type FollowReread,
  followDiscardAfterOf,
  followDiscardDimOf,
  followRereadStep,
} from "@/components/conversation/follow-along";
import {
  discardFallbackOf,
  followWordStep,
  leaveDiscard,
  type TalkShortLine,
  type TalkSoundEndAt,
  talkDiscardMissOf,
  talkFollowWordOf,
  talkShortLineOf,
  talkSoundEndDue,
  talkSoundEndSceneOf,
} from "@/components/conversation/talk-frame";
import { talkSpeechSettingsFrom } from "@/core/conversation/listen";
import type { DiscardView } from "@/core/speech/discard";
import {
  type DiscardMode,
  discardSettingsFrom,
} from "@/core/speech/discard-settings";
import {
  type EndRule,
  type ListenOutcome,
  speechSettingsFrom,
} from "@/core/speech/listen";
import { discardLayerFor } from "@/lib/speech/discard-layer";
import type {
  DiscardCallbacks,
  ListenCallbacks,
  SpeakOptions,
  SpeakOutcome,
  SpeechPort,
} from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const read = (key: string) => values[key];
const speech = speechSettingsFrom(read);
const talkSpeech = talkSpeechSettingsFrom(read);
const discard = discardSettingsFrom(read);

const VIEW_IDLE: DiscardView = {
  waiting: false,
  sayNow: false,
  recovering: false,
  canListen: true,
  reopenIdle: false,
};
const viewOf = (v: Partial<DiscardView>): DiscardView => ({
  ...VIEW_IDLE,
  ...v,
});

// ── 말하기 단추: '준비 중이에요'와 점 셋(C215) ──

describe("버림 화면 말하기 단추의 기다림 표시(C215 점 셋)", () => {
  const render = (props: {
    listening: boolean;
    preparing?: boolean;
    soundIn?: boolean;
  }) =>
    renderToStaticMarkup(
      createElement(SpeakButton, {
        label: "말하기",
        onPress: () => {},
        ...props,
      }),
    );

  it("버림 화면 단추 글은 기다리는 동안 '준비 중이에요', 듣는 동안은 지금처럼 '듣고 있어요', 넘기지 않으면 지금 글이다", () => {
    expect(
      speakButtonLabelOf({
        label: "말하기",
        listening: false,
        preparing: true,
      }),
    ).toBe(SPEAK_BUTTON_TEXT.preparing);
    expect(SPEAK_BUTTON_TEXT.preparing).toBe("준비 중이에요");
    expect(
      speakButtonLabelOf({ label: "말하기", listening: true, preparing: true }),
    ).toBe(SPEAK_BUTTON_TEXT.listening);
    expect(speakButtonLabelOf({ label: "말하기", listening: false })).toBe(
      "말하기",
    );
  });

  it("버림 화면 기다리는 단추는 점 셋을 글 뒤에 두고, 고리 · 깜빡임 · 소리 물결 · 흐림이 없으며 움직임 줄이기면 멈춘 점이다", () => {
    const html = render({ listening: false, preparing: true });
    expect(html).toContain("data-speak-preparing");
    expect(html).toContain("준비 중이에요");
    const dots = html.match(/<span class="[^"]*animate-bounce[^"]*"/g) ?? [];
    expect(dots).toHaveLength(3);
    // 움직임은 motion-safe 에서만(움직임 줄이기면 멈춘 점)
    for (const dot of dots) expect(dot).toContain("motion-safe:animate-bounce");
    expect(html.indexOf("준비 중이에요")).toBeLessThan(
      html.indexOf("data-speak-dots"),
    );
    expect(html).not.toContain("conic-gradient");
    expect(html).not.toContain("data-listening");
    expect(html).not.toContain("animate-pulse");
    expect(html).not.toContain("opacity-50");
  });

  it("버림 화면 듣는 동안이나 넘기지 않은 단추에는 점 셋이 없다(다른 영역 · 끔은 지금 그대로)", () => {
    const listening = render({ listening: true, preparing: true });
    expect(listening).not.toContain("data-speak-dots");
    expect(listening).toContain("듣고 있어요");
    const plain = render({ listening: false });
    expect(plain).not.toContain("data-speak-preparing");
    expect(plain).not.toContain("data-speak-dots");
    expect(plain).toBe(render({ listening: false, preparing: false }));
  });
});

// ── 안내 한 줄 · 듣기 끝 뒤 할 일 ──

describe("버림 화면 안내 한 줄(spec 설계 3)", () => {
  it("버림 화면 안내는 층이 없으면 늘 없음이다", () => {
    expect(
      discardLineOf(undefined, { listening: true, soundIn: false }),
    ).toBeUndefined();
  });

  it("버림 화면 회복 중이면 '잠깐만요, 마이크를 다시 켤게요', 기다린 진짜를 듣는 중이고 소리가 없으면 '말해 보세요'", () => {
    expect(
      discardLineOf(viewOf({ recovering: true, waiting: true }), {
        listening: false,
        soundIn: false,
      }),
    ).toBe("잠깐만요, 마이크를 다시 켤게요");
    expect(
      discardLineOf(viewOf({ sayNow: true, canListen: false }), {
        listening: true,
        soundIn: false,
      }),
    ).toBe("말해 보세요");
  });

  it("버림 화면 '말해 보세요'는 소리가 들어오면 지우고, 듣기 전이거나 기다림 없이 연 진짜에는 보이지 않는다", () => {
    const sayNow = viewOf({ sayNow: true, canListen: false });
    expect(
      discardLineOf(sayNow, { listening: true, soundIn: true }),
    ).toBeUndefined();
    expect(
      discardLineOf(sayNow, { listening: false, soundIn: false }),
    ).toBeUndefined();
    expect(
      discardLineOf(viewOf({ canListen: false }), {
        listening: true,
        soundIn: false,
      }),
    ).toBeUndefined();
  });

  it.each<[TurnListenEnd, "recover" | "again" | "none"]>([
    ["deaf", "recover"],
    ["not-heard", "again"],
    ["deaf-over", "none"],
    ["heard", "none"],
    ["nospeech-move", "none"],
    ["offline", "none"],
    ["blocked", "none"],
    ["none", "none"],
  ])(
    "버림 화면 대화 차례 듣기 끝 %s 뒤에 층에 알릴 것은 %s 다(넘김 · 건너뜀 · 다시 말하기 누름에는 again 없음)",
    (end, next) => {
      expect(turnDiscardAfterOf(end)).toBe(next);
    },
  );

  it.each([
    ["retry", "again"],
    ["offline", "again"],
    ["recover", "recover"],
    ["heard", "none"],
    ["skip", "none"],
    ["deaf-skip", "none"],
    ["none", "none"],
  ] as const)(
    "버림 화면 따라 말하기 한 번의 끝 %s 뒤에 층에 알릴 것은 %s 다",
    (kind, next) => {
      expect(followDiscardAfterOf(kind)).toBe(next);
    },
  );
});

// ── 아이 차례 렌더(층 view 가 화면에 닿는 꼴) ──

describe("버림 화면 아이 차례 렌더", () => {
  const props = (view?: DiscardView): ChildTurnProps => ({
    sessionId: "s",
    speech: {} as SpeechPort,
    level: 3,
    lowLevel: true,
    englishName: "Momo",
    hints: [],
    dontKnowCount: 0,
    heard: {},
    settings: {
      speech,
      talkSpeech,
      confirmSeconds: values["talk.confirm_seconds"] as number,
      hintReadMatch: values["talk.hint_read_match"] as number,
      nospeechDontknowCount: values["talk.nospeech_dontknow_count"] as number,
    },
    rate: speech.rate["1-3"],
    homophones: [],
    nudge: false,
    onNudgeShown: () => {},
    onSpeech: () => "heard",
    onListenStart: () => {},
    onHintListen: () => {},
    onListening: () => {},
    reveal: async () => undefined,
    onSend: () => {},
    ...(view
      ? {
          discard: {
            view,
            again: () => {},
            dontKnow: () => {},
            listenAuto: () => {
              throw new Error("렌더에서 부르지 않음");
            },
            soundEnd: () => {},
          },
        }
      : {}),
  });
  const html = (view?: DiscardView) =>
    renderToStaticMarkup(createElement(ChildTurn, props(view)));

  it("버림 화면 층이 없거나 기다림이 없으면 아이 차례 그림이 지금과 글자까지 같다", () => {
    expect(html(VIEW_IDLE)).toBe(html());
    expect(html()).not.toContain("준비 중이에요");
  });

  it("버림 화면 회복 중 아이 차례는 단추 하나에 '준비 중이에요' · 점 셋, 안내 자리에 '잠깐만요, 마이크를 다시 켤게요'다", () => {
    const out = html(
      viewOf({ waiting: true, recovering: true, canListen: false }),
    );
    expect(out.match(/data-speak=""/g)).toHaveLength(1);
    expect(out).toContain("준비 중이에요");
    expect(out).toContain("data-speak-dots");
    expect(out).toContain(`data-discard-line="">${CHILD_TURN_TEXT.micRecover}`);
  });
});

// ── 소리 끝을 부를 때(접점 표 '소리 끝') ──

describe("버림 화면 틀의 소리 끝(아이 차례 × 줄 빔)", () => {
  type Frame = Parameters<typeof talkSoundEndSceneOf>[0] & {
    speaking: boolean;
  };
  /** 그림 차례를 돌려 소리 끝을 부른 그림 번호를 모은다(틀의 effect 와 같은 꼴). */
  const dues = (frames: readonly Frame[]) => {
    let prev: TalkSoundEndAt | undefined;
    const out: number[] = [];
    frames.forEach((f, i) => {
      const next = { scene: talkSoundEndSceneOf(f), speaking: f.speaking };
      if (talkSoundEndDue(prev, next)) out.push(i);
      prev = next;
    });
    return out;
  };
  const talk = (
    phase: Frame["phase"],
    speaking: boolean,
    away = false,
  ): Frame => ({ stage: "talk", phase, speaking, away });
  const wrap = (speaking: boolean): Frame => ({
    stage: "wrap",
    phase: "tori",
    speaking,
    away: false,
  });

  it("버림 화면 선생님 차례의 문장 사이 · 흘러 오는 문장 틈에서는 소리 끝이 없고, 아이 차례로 넘긴 뒤 줄이 비면 한 번 부른다", () => {
    expect(
      dues([
        talk("tori", true),
        talk("tori", false), // 흘러 오는 문장 틈
        talk("tori", true),
        talk("child", true), // 글이 다 흘러 아이 차례(C166 R1 — 읽기 끝은 기다리지 않음)
        talk("child", false),
        talk("child", false),
      ]),
    ).toEqual([4]);
  });

  it("버림 화면 줄이 이미 빈 채 아이 차례 · 마무리 물음 선택으로 넘기면 그 그림에서 부른다", () => {
    expect(dues([talk("tori", false), talk("child", false)])).toEqual([1]);
    expect(dues([talk("tori", false), talk("choice", false)])).toEqual([1]);
  });

  // 네 길이 실제로 틀의 읽기 줄(queue.replay · queue.cancel)을 타는지는 묶음 5 e2e 몫이다(검토 3 '5 에 넘길 것' 3). 여기는 길마다 생기는 그림 차례를 고정한다.
  it.each<[string, readonly Frame[], number[]]>([
    [
      "말풍선 다시 듣기(아이 차례에서 한 번 다시 읽음)",
      [talk("child", false), talk("child", true), talk("child", false)],
      [0, 2],
    ],
    [
      "말풍선 소리 줄(마무리 물음 선택에서 소리 줄을 다시 읽음)",
      [talk("choice", false), talk("choice", true), talk("choice", false)],
      [0, 2],
    ],
    [
      "대화 기록 줄(기록 줄 둘을 이어 누름 — 줄이 비지 않은 채 이어 읽음)",
      [
        talk("child", false),
        talk("child", true),
        talk("child", true),
        talk("child", false),
      ],
      [0, 3],
    ],
    [
      "힌트 듣기 앞 줄 멈춤(선생님 줄을 읽는 채 아이 차례로 넘어와 힌트가 그 줄을 멈춤)",
      [talk("tori", true), talk("child", true), talk("child", false)],
      [2],
    ],
  ])(
    "버림 화면 아이 차례의 %s 그림 차례에서는 줄이 빈 그림에서 소리 끝을 부른다",
    (_, frames, expected) => {
      expect(dues(frames)).toEqual(expected);
    },
  );

  it("버림 화면 정리는 들어온 때 부르지 않고(따라 말하기 조각이 읽기 끝에 스스로 알림) 대화 기록 다시 듣기가 끝난 때 부른다", () => {
    expect(
      dues([
        talk("child", true),
        wrap(false), // 그만하기 → 정리(읽기 줄을 비움)
        wrap(true),
        wrap(false),
      ]),
    ).toEqual([3]);
  });

  it("버림 화면 짧은 준비 · 막힘 · 쉼 · 실패 줄에서는 틀이 소리 끝을 부르지 않는다", () => {
    expect(
      dues([
        talk("prep", true),
        talk("prep", false),
        talk("child", true, true),
        talk("child", false, true),
        talk("failed", false),
        { stage: "closing", phase: "tori", speaking: false, away: false },
      ]),
    ).toEqual([]);
  });

  it("버림 화면 막힘이 풀려 아이 차례로 돌아오면 줄이 빈 채라 한 번 부른다", () => {
    expect(dues([talk("child", false, true), talk("child", false)])).toEqual([
      1,
    ]);
  });

  it("버림 화면 힌트 문장 듣기는 그 읽기가 끝난 뒤(끝 · 끊김 모두) 소리 끝을 부르고, 읽기 전에는 부르지 않는다", async () => {
    let finish: (o: SpeakOutcome) => void = () => {};
    const calls: string[] = [];
    const port = {
      unlockFromGesture: () => calls.push("unlock"),
      speak: (text: string) => {
        calls.push(`speak:${text}`);
        return new Promise<SpeakOutcome>((r) => {
          finish = r;
        });
      },
    } as unknown as SpeechPort;
    listenHint({
      speech: port,
      text: "I'm nine.",
      rate: speech.rate["1-3"],
      stopReading: () => calls.push("stop"),
      onSpoken: () => calls.push("soundEnd"),
    });
    await Promise.resolve();
    expect(calls).toEqual(["stop", "unlock", "speak:I'm nine."]);
    finish({ kind: "cancelled" });
    await Promise.resolve();
    expect(calls.at(-1)).toBe("soundEnd");
  });
});

// ── 따라 말하기 흐림 · 같은 쉼의 다시 읽기 한 번 ──

describe("버림 화면 따라 말하기 흐림과 다시 읽기", () => {
  it("버림 화면 따라 말하기는 층이 없으면 더 흐리지 않고, 진짜를 열 수 있을 때까지 흐리다", () => {
    expect(followDiscardDimOf(undefined, false)).toBe(false);
    expect(followDiscardDimOf(viewOf({ canListen: false }), false)).toBe(true);
    expect(followDiscardDimOf(VIEW_IDLE, false)).toBe(false);
    // 버림부터 쉼: 다시 읽기 전에는 흐림, 그 쉼의 다시 읽기를 냈는데 쉼이 이어지면 켬(누르면 층이 들려줄 말 뒤 듣는다)
    const idle = viewOf({ canListen: false, reopenIdle: true });
    expect(followDiscardDimOf(idle, false)).toBe(true);
    expect(followDiscardDimOf(idle, true)).toBe(false);
  });

  /** reopenIdle 차례를 돌려 다시 읽은 걸음 번호를 모은다(쪽지 · 정리 장의 effect 와 같은 꼴). */
  const rereads = (steps: readonly { idle: boolean; busy?: boolean }[]) => {
    let state: FollowReread = FOLLOW_REREAD_START;
    const out: number[] = [];
    steps.forEach((s, i) => {
      const next = followRereadStep(state, {
        reopenIdle: s.idle,
        busy: s.busy === true,
      });
      state = next.state;
      if (next.reread) out.push(i);
    });
    return out;
  };

  it("버림 화면 따라 말하기는 같은 '버림부터' 쉼에서 들려줄 말을 한 번만 다시 읽고, 읽지 못해 쉼이 이어져도 다시 읽지 않는다", () => {
    expect(
      rereads([
        { idle: false },
        { idle: true }, // 쉼이 섬 → 한 번 읽음
        { idle: true }, // 다시 읽은 말이 들려주지 못함으로 끝나 쉼이 이어짐(재검토 범위 밖 관찰)
        { idle: true },
      ]),
    ).toEqual([1]);
  });

  it("버림 화면 쉼이 끝났다가(버림이 열림) 새로 서면 그 쉼에서 다시 한 번 읽는다", () => {
    expect(rereads([{ idle: true }, { idle: false }, { idle: true }])).toEqual([
      0, 2,
    ]);
  });

  it("버림 화면 쉼이 설 때 이미 읽는 중(들어올 때 읽기)이면 그 읽기를 그 쉼의 읽기로 친다", () => {
    expect(rereads([{ idle: true, busy: true }, { idle: true }])).toEqual([]);
  });
});

// ── 짧은 말 고르기 ──

describe("버림 화면 짧은 말 고르기(돌려 쓰기 · 아직 말하지 않은 자리)", () => {
  const seed = JSON.parse(
    readFileSync("seed/lists/talk-short-lines.json", "utf8"),
  ) as Record<"again" | "mic", Record<string, TalkShortLine[]>>;
  const REPEAT = /\b(again|more)\b/i;

  it("버림 화면 짧은 말은 자리 목록을 차례대로 돌려 쓴다", () => {
    const lines = seed.again["1-3"] ?? [];
    expect(lines.length).toBeGreaterThan(1);
    const picked = lines.map(
      (_, count) => talkShortLineOf(lines, { fresh: false, count })?.en,
    );
    expect(picked).toEqual(lines.map((l) => l.en));
    expect(
      talkShortLineOf(lines, { fresh: false, count: lines.length })?.en,
    ).toBe(lines[0]?.en);
  });

  it.each(["1-3", "4-6", "7-9", "10-12"])(
    "버림 화면 %s 구간에서 아이가 아직 말하지 않은 자리면 again · more 가 든 줄을 고르지 않는다(판정 M-5)",
    (band) => {
      const lines = seed.again[band] ?? [];
      for (let count = 0; count < lines.length * 2; count++) {
        const line = talkShortLineOf(lines, { fresh: true, count });
        expect(line).toBeDefined();
        expect(line?.en).not.toMatch(REPEAT);
      }
    },
  );

  it("버림 화면 걸러 남는 줄이 없으면 모든 줄에서 고르고, 목록이 비면 없음이다", () => {
    const only = [{ en: "Okay, one more time.", ko: "좋아, 한 번 더 해 봐." }];
    expect(talkShortLineOf(only, { fresh: true, count: 0 })?.en).toBe(
      "Okay, one more time.",
    );
    expect(talkShortLineOf([], { fresh: false, count: 0 })).toBeUndefined();
  });

  it("버림 화면 대비 줄은 자리마다 그 구간의 첫 줄이고, 한 자리라도 비면 없음(층을 만들지 않음)이다", () => {
    const at = { again: seed.again["1-3"] ?? [], mic: seed.mic["1-3"] ?? [] };
    expect(discardFallbackOf(at)).toEqual({
      again: at.again[0],
      mic: at.mic[0],
    });
    expect(discardFallbackOf({ again: at.again, mic: [] })).toBeUndefined();
  });

  it("버림 화면 켤 기기에서 짧은 말 목록이 비어 층을 만들지 않으면 빈 자리 셈을 남기고, 켜지 않는 기기 · 목록이 다 있으면 남기지 않는다", () => {
    const full = { again: seed.again["1-3"] ?? [], mic: seed.mic["1-3"] ?? [] };
    const empty = { again: full.again, mic: [] };
    const at = (mode: DiscardMode, name: string, lines: typeof full) =>
      talkDiscardMissOf({ mode, verdict: { name }, canOpen: true, lines });
    expect(at("ios", "iPad Safari 27", empty)).toEqual({
      again: full.again.length,
      mic: 0,
    });
    expect(at("all", "Windows Chrome 140", empty)).toEqual({
      again: full.again.length,
      mic: 0,
    });
    expect(at("ios", "iPad Safari 27", full)).toBeUndefined();
    expect(at("off", "iPad Safari 27", empty)).toBeUndefined();
    expect(at("ios", "Windows Chrome 140", empty)).toBeUndefined();
    expect(
      talkDiscardMissOf({
        mode: "ios",
        verdict: { name: "iPad Safari 27" },
        canOpen: false,
        lines: empty,
      }),
    ).toBeUndefined();
  });
});

// ── 따라 말하기 자리의 들려줄 말(묶음 3 fix 1 M-1) ──

describe("버림 화면 따라 말하기 자리의 들려줄 말", () => {
  it("버림 화면 따라 말하기는 앞 장에서 다시 말할 차례를 낸 뒤 장이 바뀌면 앞 장의 말이 남지 않고 지금 장의 말을 읽는다", () => {
    let word: string | undefined;
    word = followWordStep(word, { kind: "card", word: "cat" });
    word = followWordStep(word, { kind: "again", word: "cat" });
    word = followWordStep(word, { kind: "leave", word: "cat" });
    expect(
      talkFollowWordOf("again", { followScene: true, word }),
    ).toBeUndefined();
    word = followWordStep(word, { kind: "card", word: "dog" });
    // 새 장에서 again 을 아직 부르지 않았어도 지금 장의 말
    expect(talkFollowWordOf("again", { followScene: true, word })).toBe("dog");
  });

  it("버림 화면 따라 말하기 앞 장의 떠남이 새 장이 들어온 뒤에 와도 새 장의 말을 지우지 않는다", () => {
    let word: string | undefined;
    word = followWordStep(word, { kind: "card", word: "cat" });
    word = followWordStep(word, { kind: "card", word: "dog" });
    word = followWordStep(word, { kind: "leave", word: "cat" });
    expect(word).toBe("dog");
  });

  it("버림 화면 들려줄 말은 따라 말하기 자리의 다시 말할 차례에만 쓰고, 회복 한마디 · 대화 차례는 짧은 말로 간다", () => {
    expect(talkFollowWordOf("mic", { followScene: true, word: "dog" })).toBe(
      undefined,
    );
    expect(
      talkFollowWordOf("again", { followScene: false, word: "dog" }),
    ).toBeUndefined();
  });
});

// ── 떠남 차례 ──

const IPAD = { name: "iPad Safari 27" };
const RULE: EndRule = { endSilenceMs: 1000, chunkMs: 60000 };

/** 손으로 쓴 가짜 음성 접점(층 시험 꼴을 줄임 — 부른 차례만 적는다). */
class FakePort implements SpeechPort {
  readonly calls: string[] = [];
  private finishListen: (o: ListenOutcome) => void = () => {};
  device() {
    return { verdict: "ok" as const, listed: true, synthesis: true, ...IPAD };
  }
  unlockFromGesture() {
    this.calls.push("unlock");
  }
  speak(text: string, _options?: SpeakOptions): Promise<SpeakOutcome> {
    this.calls.push(`speak:${text}`);
    return new Promise(() => {});
  }
  cancelSpeaking() {
    this.calls.push("cancelSpeaking");
  }
  listen(_rule: EndRule, _on?: ListenCallbacks) {
    this.calls.push("listen");
    const outcome = new Promise<ListenOutcome>((r) => {
      this.finishListen = r;
    });
    return { press: () => {}, cancel: () => {}, outcome, capAt: undefined };
  }
  finish(o: ListenOutcome) {
    this.finishListen(o);
  }
  checkMicrophone() {
    return Promise.resolve({ ok: true as const });
  }
  dispose() {
    this.calls.push("dispose");
  }
  openDiscard(on: DiscardCallbacks) {
    const n = this.calls.filter((c) => c.startsWith("openDiscard")).length + 1;
    this.calls.push(`openDiscard:${n}`);
    // 죽은 버림(audiostart 가 곧 옴), stop 하면 곧 end(기록 8 꼴)
    setTimeout(() => on.audio?.(), 0);
    return {
      stop: () => {
        this.calls.push(`stop:${n}`);
        setTimeout(() => on.end?.(), 0);
      },
      abort: () => this.calls.push(`abort:${n}`),
    };
  }
  synthState() {
    return { speaking: false, pending: false };
  }
}

describe("버림 화면 떠남 차례(기계 검토 6절 7 · 8)", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "performance"],
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("버림 화면 떠남은 서버 기다림을 내리고 떠남을 보낸 뒤, 끝나는 화면이면 층을 닫는다", () => {
    const calls: string[] = [];
    const layer = {
      serverWait: (on: boolean) => calls.push(`serverWait:${on}`),
      leave: () => calls.push("leave"),
      dispose: () => calls.push("dispose"),
    };
    leaveDiscard(layer, { close: true });
    expect(calls).toEqual(["serverWait:false", "leave", "dispose"]);
    calls.length = 0;
    leaveDiscard(layer, { close: false });
    expect(calls).toEqual(["serverWait:false", "leave"]);
    expect(() => leaveDiscard(null, { close: true })).not.toThrow();
  });

  /** 첫 누름으로 진짜를 열고 결과로 끝내 버림이 열린 데까지(F2). */
  async function afterFirstTurn() {
    const port = new FakePort();
    const layer = discardLayerFor(port, {
      discard,
      speech,
      verdict: IPAD,
      fallbackLines: {
        again: { text: "Okay, it's your turn.", sound: "short" },
        mic: { text: "Oops! Let me turn it on.", sound: "short" },
      },
      visibility: { hidden: () => false, subscribe: () => () => {} },
    });
    if (layer === null) throw new Error("층이 없다");
    layer.port.unlockFromGesture();
    const handle = layer.port.listen(RULE);
    port.finish({
      kind: "result",
      text: "apple",
      pieces: [],
      endedBy: "silence",
      restarts: 0,
      watchdogRestarts: 0,
    });
    await vi.advanceTimersByTimeAsync(0);
    await handle.outcome;
    expect(port.calls.filter((c) => c.startsWith("openDiscard"))).toEqual([
      "openDiscard:1",
    ]);
    return { port, layer };
  }

  it("버림 화면 끝나는 화면(쉬는 안내 · 마무리 · 홈)은 떠남 뒤 층을 닫아, 그 화면 줄이 버림을 다시 열지 않고 음성 접점으로 바로 읽힌다", async () => {
    const { port, layer } = await afterFirstTurn();
    leaveDiscard(layer, { close: true });
    expect(port.calls).toContain("stop:1");
    void layer.port.speak("See you next time!");
    await vi.advanceTimersByTimeAsync(discard.gapMs + discard.minMs);
    expect(port.calls.at(-1)).toBe("speak:See you next time!");
    expect(port.calls.filter((c) => c.startsWith("openDiscard"))).toHaveLength(
      1,
    );
  });

  it("버림 화면 닫지 않는 떠남(막힘 · 쉼) 뒤 읽기는 버림을 다시 연다 — 그래서 끝나는 화면은 층을 닫는다", async () => {
    const { port, layer } = await afterFirstTurn();
    leaveDiscard(layer, { close: false });
    void layer.port.speak("See you next time!");
    await vi.advanceTimersByTimeAsync(discard.gapMs + discard.minMs);
    expect(
      port.calls.filter((c) => c.startsWith("openDiscard")).length,
    ).toBeGreaterThan(1);
  });
});

// ── 첫 실행 부모 줄(모드 × 기기) ──

describe("버림 화면 첫 실행 음성 인식 안내의 부모 줄(FR-4)", () => {
  const DEVICES = {
    iPad: { name: "iPad Safari 27" },
    iPhone: { name: "iPhone Safari 27" },
    macSafari: { name: "Mac Safari 27" },
    chrome: { name: "Windows Chrome 140" },
  } as const;

  it.each<[DiscardMode, keyof typeof DEVICES, boolean]>([
    ["ios", "iPad", true],
    ["ios", "iPhone", true],
    ["ios", "macSafari", false],
    ["ios", "chrome", false],
    ["all", "iPad", true],
    ["all", "chrome", false],
    ["off", "iPad", false],
    ["off", "chrome", false],
  ])(
    "버림 화면 첫 실행 모드 %s · 기기 %s 에서 부모 줄 보임은 %s 다",
    (mode, device, shown) => {
      const line = firstRunDiscardLineOf(mode, DEVICES[device]);
      expect(line !== undefined).toBe(shown);
    },
  );

  it("버림 화면 첫 실행 부모 줄은 spec 설계 3 초안 그대로이고, 기기 판정 전에는 없다", () => {
    expect(firstRunDiscardLineOf("ios", DEVICES.iPad)).toBe(
      FIRST_RUN_TEXT.micDiscard,
    );
    expect(FIRST_RUN_TEXT.micDiscard).toBe(
      "아이패드에서는 선생님이 말하는 동안에도 마이크가 켜져 있어서 화면 위에 주황색 표시가 보여요. 그동안 들린 소리도 아이패드의 음성 인식이 처리하지만, 앱은 소리를 녹음하지 않고 그 말을 글로도 남기지 않아요.",
    );
    expect(firstRunDiscardLineOf("ios", undefined)).toBeUndefined();
  });
});

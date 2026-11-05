// 읽어 주기 뒤 듣기 쉼(장부 T-125 — iPad 사파리 짧은 준비 쪽지 no-speech · 13절 C109 · C166 R2 · 7절 말하기 버튼 행). 차례는 읽기 멈춤 →
// 쉼(설정값) → 누름 → 듣기이고, 쉼 동안 누르면 듣지 않고 '다 읽은 뒤 눌러요'다. 듣는 동안 '듣고 있어요' · 소리 들어옴 표시는 쪽지가 넘기는
// 그대로 말하기 단추가 그린다.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SPEAK_BUTTON_TEXT,
  SpeakButton,
  speakPressOf,
} from "@/components/answer/speak-button";
import { speechSettingsFrom } from "@/core/speech/listen";
import { listenGapMsOf, listenReadyOf } from "@/core/speech/listen-gap";
import { createSpeakSettle } from "@/lib/speech/speak-settle";
import { testSettingValues } from "../fixtures/settings";

const SETTING_VALUES = testSettingValues();
const SPEECH = speechSettingsFrom((key) => SETTING_VALUES[key]);
const GAP_MS = listenGapMsOf(SPEECH);

afterEach(() => {
  vi.useRealTimers();
});

describe("듣기 쉼 순수 함수(listen-gap)", () => {
  it("T-125 듣기 쉼 길이는 설정값(잠정 speech.sentence_pause_ms)이고 0 보다 크다", () => {
    expect(GAP_MS).toBe(SETTING_VALUES["speech.sentence_pause_ms"]);
    expect(GAP_MS).toBeGreaterThan(0);
  });

  it("T-125 읽는 중이면 켜지 않고, 읽은 적이 없으면 바로 켜며, 읽기가 멈춘 뒤 쉼이 다 지나야 켠다", () => {
    expect(
      listenReadyOf({ speaking: true, quietSince: 0, now: 0, gapMs: GAP_MS }),
    ).toEqual({ ready: false, leftMs: GAP_MS });
    expect(
      listenReadyOf({
        speaking: false,
        quietSince: undefined,
        now: 5,
        gapMs: GAP_MS,
      }),
    ).toEqual({ ready: true, leftMs: 0 });
    const stop = 1000;
    expect(
      listenReadyOf({
        speaking: false,
        quietSince: stop,
        now: stop + GAP_MS - 1,
        gapMs: GAP_MS,
      }),
    ).toEqual({ ready: false, leftMs: 1 });
    expect(
      listenReadyOf({
        speaking: false,
        quietSince: stop,
        now: stop + GAP_MS,
        gapMs: GAP_MS,
      }),
    ).toEqual({ ready: true, leftMs: 0 });
  });
});

describe("듣기 쉼 지킴이(speak-settle) — 읽기 멈춤 → 쉼 → 누름 → 듣기", () => {
  /** 지킴이 + 누름 뜻(쪽지의 말하기 단추: waiting = 읽는 중 또는 쉼 중). */
  function harness() {
    vi.useFakeTimers();
    const told: boolean[] = [];
    let ready = true;
    const settle = createSpeakSettle({
      gapMs: () => GAP_MS,
      onReady: (r) => {
        ready = r;
        told.push(r);
      },
      now: () => Date.now(),
    });
    const press = () => speakPressOf({ waiting: !ready, listening: false });
    return { settle, told, press, ready: () => ready };
  }

  it("T-125 읽기 시작에 흐리고, 멈춘 뒤 쉼 동안 누르면 듣지 않고(안내 한 줄), 쉼이 지나면 누름이 듣기를 연다", () => {
    const h = harness();
    expect(h.press()).toBe("press");
    h.settle.began();
    expect(h.ready()).toBe(false);
    expect(h.press()).toBe("wait-note");
    vi.advanceTimersByTime(GAP_MS * 3);
    // 읽는 동안에는 시간이 지나도 켜지지 않는다
    expect(h.ready()).toBe(false);
    h.settle.stopped();
    // 멈춘 바로 그때(iPad 에서 소리를 못 받던 자리)는 아직 흐림
    expect(h.press()).toBe("wait-note");
    vi.advanceTimersByTime(GAP_MS - 1);
    expect(h.press()).toBe("wait-note");
    expect(h.settle.ready()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(h.press()).toBe("press");
    expect(h.settle.ready()).toBe(true);
    expect(h.told).toEqual([false, true]);
  });

  it("T-125 쉼 동안 다시 듣기(들려줄 말 다시 읽기)를 하면 쉼은 새 읽기가 멈춘 때부터 다시 센다", () => {
    const h = harness();
    h.settle.began();
    h.settle.stopped();
    vi.advanceTimersByTime(GAP_MS - 1);
    h.settle.began();
    vi.advanceTimersByTime(1);
    expect(h.ready()).toBe(false);
    h.settle.stopped();
    vi.advanceTimersByTime(GAP_MS - 1);
    expect(h.ready()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(h.ready()).toBe(true);
    expect(h.told).toEqual([false, true]);
  });

  it("T-125 읽지 않을 때의 멈춤은 쉼을 만들지 않고(누름 직전 끊음이 빈 경우), 거둔 뒤에는 늦은 알림이 없다", () => {
    const h = harness();
    h.settle.stopped();
    expect(h.ready()).toBe(true);
    expect(h.told).toEqual([]);
    h.settle.began();
    h.settle.stopped();
    h.settle.dispose();
    vi.advanceTimersByTime(GAP_MS * 2);
    expect(h.told).toEqual([false]);
  });
});

describe("쪽지 말하기 단추 표시(7절 말하기 버튼 행 · C166 U4-2)", () => {
  const render = (props: {
    listening: boolean;
    soundIn?: boolean;
    waiting?: boolean;
  }) =>
    renderToStaticMarkup(
      createElement(SpeakButton, {
        label: "말하기",
        gapClassName: "bg-paper",
        onPress: () => {},
        ...props,
      }),
    );

  it("T-125 듣는 동안 단추 글은 '듣고 있어요'이고 소리가 들어오면 소리 들어옴 표지가 붙으며, 쉼 · 읽기 중에는 흐린 표지만 있다", () => {
    const listening = render({ listening: true });
    expect(listening).toContain(SPEAK_BUTTON_TEXT.listening);
    expect(listening).toContain("data-listening");
    expect(listening).not.toContain("data-sound-in");
    const heard = render({ listening: true, soundIn: true });
    expect(heard).toContain("data-sound-in");
    const waiting = render({ listening: false, waiting: true });
    expect(waiting).toContain("data-speak-waiting");
    expect(waiting).not.toContain("data-listening");
    expect(waiting).not.toContain(SPEAK_BUTTON_TEXT.listening);
  });
});

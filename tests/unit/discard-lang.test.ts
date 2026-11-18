// 한국어로 묻기 묶음 3 — 버리는 듣기를 켠 기기의 한국어 듣기(수업 안 한국어로 묻기 spec 판 3 설계 3 '버리는 듣기를 켠 기기의 차례' · FR-5).
// 같은 대본을 듣기 언어만 바꿔 돌리면 기계의 입력 · 효과 차례(음성 접점 호출 · 버림 칸 · 화면 상태)가 같고, 기다린 누름 뒤 연 진짜와
// 마이크 안 잡힘 회복으로 다시 연 진짜가 걸어 둔 규칙(언어)을 그대로 쓴다. '그 언어만 안 됨'은 '마이크를 쓸 수 없음'과 같은 끝으로 가되
// 다시 연 까닭이 no_lang 이다. 기존 버리는 듣기 시험(discard-flow · discard-layer)은 고치지 않고, 이 파일은 더하기만이다.
// 시험의 시각(ms)은 장면을 적은 자료다. 설계 숫자는 시험용 설정(TEST_SETTINGS)에서 읽는다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type DiscardFlowInput,
  type DiscardView,
  discardTimesOf,
  startDiscardFlow,
  stepDiscardFlow,
} from "@/core/speech/discard";
import { discardSettingsFrom } from "@/core/speech/discard-settings";
import {
  type EndRule,
  type ListenOutcome,
  speechSettingsFrom,
} from "@/core/speech/listen";
import { type DiscardLayer, discardLayerFor } from "@/lib/speech/discard-layer";
import type {
  DiscardCallbacks,
  ListenCallbacks,
  SpeakOptions,
  SpeakOutcome,
  SpeechPort,
  SpeechTraceEntry,
} from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const speech = speechSettingsFrom((key) => values[key]);
const discard = discardSettingsFrom((key) => values[key]);
const IPAD = { name: "iPad Safari 27" };
const EN_RULE: EndRule = { endSilenceMs: 1000, chunkMs: 60000 };
const KO_RULE: EndRule = { ...EN_RULE, lang: "ko-KR" };
/** 버림 start 에서 audiostart 까지(죽은 버림 띠). */
const DEAD_AS = 12;
const FALLBACK = {
  again: { text: "Okay, it's your turn.", sound: "short" as const },
  mic: { text: "Oops! Let me turn it on.", sound: "short" as const },
};

// ── 손으로 쓴 가짜 음성 접점(진짜 듣기의 규칙을 남긴다) ──

type FakeUtterance = { done: boolean; start(): void; end(): void };
type FakeListen = { rule: EndRule; finish(outcome: ListenOutcome): void };
type FakeDiscard = { audio(): void; end(): void };

class FakePort implements SpeechPort {
  readonly calls: string[] = [];
  readonly utterances: FakeUtterance[] = [];
  readonly listens: FakeListen[] = [];
  readonly discards: FakeDiscard[] = [];
  readonly trace: SpeechTraceEntry[] = [];
  speaking = false;

  device() {
    return { verdict: "ok" as const, listed: true, synthesis: true, ...IPAD };
  }
  unlockFromGesture() {
    this.calls.push("unlock");
  }
  speak(text: string, options?: SpeakOptions): Promise<SpeakOutcome> {
    this.calls.push(`speak:${text}`);
    for (const u of this.utterances) if (!u.done) u.end();
    return new Promise((resolve) => {
      const u: FakeUtterance = {
        done: false,
        start: () => {
          this.speaking = true;
          options?.onStart?.();
        },
        end: () => {
          if (u.done) return;
          u.done = true;
          this.speaking = false;
          resolve({ kind: "ended", heard: "played" });
        },
      };
      this.utterances.push(u);
    });
  }
  cancelSpeaking() {
    this.calls.push("cancelSpeaking");
    this.speaking = false;
    for (const u of this.utterances) if (!u.done) u.end();
  }
  listen(rule: EndRule, _on?: ListenCallbacks) {
    this.calls.push("listen");
    this.trace.push({
      at: performance.now(),
      kind: "listen-begin",
      listen: this.listens.length + 1,
      rule,
    });
    let resolve: (o: ListenOutcome) => void = () => {};
    const outcome = new Promise<ListenOutcome>((r) => {
      resolve = r;
    });
    this.listens.push({ rule, finish: (o) => resolve(o) });
    return {
      press: () => {},
      cancel: () =>
        resolve({ kind: "interrupted", reason: "leave", partialText: "" }),
      outcome,
      capAt: 1234,
    };
  }
  checkMicrophone() {
    return Promise.resolve({ ok: true as const });
  }
  dispose() {}
  openDiscard(on: DiscardCallbacks) {
    const id = this.discards.length + 1;
    this.calls.push(`openDiscard:${id}`);
    let ended = false;
    this.discards.push({
      audio: () => on.audio?.(),
      end: () => {
        if (ended) return;
        ended = true;
        on.end?.();
      },
    });
    return {
      stop: () => this.calls.push(`stop:${id}`),
      abort: () => this.calls.push(`abort:${id}`),
    };
  }
  synthState() {
    return { speaking: this.speaking, pending: false };
  }
  lastListen() {
    const l = this.listens.at(-1);
    if (l === undefined) throw new Error("진짜 듣기 없음");
    return l;
  }
  lastDiscard() {
    const d = this.discards.at(-1);
    if (d === undefined) throw new Error("버림 없음");
    return d;
  }
  lastUtterance() {
    const u = this.utterances.at(-1);
    if (u === undefined) throw new Error("읽기 없음");
    return u;
  }
}

function makeLayer() {
  const port = new FakePort();
  const layer = discardLayerFor(port, {
    discard,
    speech,
    verdict: IPAD,
    fallbackLines: FALLBACK,
    onTrace: (entry) => port.trace.push(entry),
    visibility: { hidden: () => false, subscribe: () => () => {} },
  });
  if (layer === null) throw new Error("층이 없다");
  const views: DiscardView[] = [];
  layer.subscribe((v) => views.push(v));
  return { port, layer, views };
}

const flush = () => vi.advanceTimersByTimeAsync(0);
const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);
const notesOf = (trace: SpeechTraceEntry[]) =>
  trace.flatMap((e) => (e.kind === "discard-note" ? [e.dc] : []));

const RESULT: ListenOutcome = {
  kind: "result",
  text: "x",
  pieces: [],
  endedBy: "silence",
  restarts: 0,
  watchdogRestarts: 0,
};

/** 죽은 버림이 열린 뒤 그 안에서 소리 하나를 읽고(소리 끝) 닫힌다. pressEarly 면 읽기 끝 바로 뒤(버림이 닫히기 전)에 누른다. */
async function deadDiscardWithSound(
  layer: DiscardLayer,
  port: FakePort,
  rule: EndRule,
  pressEarly: boolean,
) {
  const d = port.lastDiscard();
  await advance(DEAD_AS);
  d.audio();
  await advance(discard.liveAsMs);
  void layer.port.speak("Nice!");
  port.lastUtterance().start();
  await advance(500);
  port.lastUtterance().end();
  await flush();
  layer.soundEnd();
  let pressed: ReturnType<SpeechPort["listen"]> | undefined;
  if (pressEarly) pressed = layer.port.listen(rule);
  await advance(discard.minMs);
  d.end();
  await advance(discard.gapMs);
  return pressed;
}

/**
 * 한 대본: 첫 누름 → 진짜(결과) → 기다림 · 버림 · 맞장구 → 버림이 닫히기 전 누름(기다린 누름) → 진짜(마이크 안 잡힘) → 회복(누름 없이
 * 다시 연 진짜, 결과) → 버림 → 영어 누름(진짜, 결과). 언어는 앞 셋 듣기의 규칙에만 다르다.
 */
async function script(rule: EndRule) {
  const { port, layer, views } = makeLayer();
  layer.port.unlockFromGesture();
  const first = layer.port.listen(rule);
  port.lastListen().finish(RESULT);
  await first.outcome;
  await advance(discard.openAfterMs);
  const waited = await deadDiscardWithSound(layer, port, rule, true);
  expect(port.listens).toHaveLength(2);
  port.lastListen().finish({ kind: "deaf", audiostartMs: 30, retries: 0 });
  await waited?.outcome;
  // 회복: 화면이 끝난 듣기의 규칙을 다시 넘긴다(plan 정한 것 1 · AC-5)
  const recovered = layer.listenAuto(rule);
  port.lastDiscard().audio();
  await advance(discard.liveAsMs);
  port.lastUtterance().start();
  await advance(1000);
  port.lastUtterance().end();
  await flush();
  await advance(discard.minMs);
  port.lastDiscard().end();
  await advance(discard.gapMs);
  expect(port.listens).toHaveLength(3);
  port.lastListen().finish(RESULT);
  await recovered.outcome;
  await advance(discard.openAfterMs);
  await deadDiscardWithSound(layer, port, rule, false);
  const english = layer.port.listen(EN_RULE);
  port.lastListen().finish(RESULT);
  await english.outcome;
  // 이 대본의 끝까지 찍어 둔다(층의 남은 기한이 다음 대본의 시계에서 더 돌지 않게)
  return {
    calls: [...port.calls],
    notes: notesOf(port.trace),
    views: [...views],
    rules: port.listens.map((l) => l.rule),
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("버리는 듣기를 켠 기기의 한국어 듣기(FR-5 · spec 설계 3 차례 표)", () => {
  it("AC-25e 같은 대본을 듣기 언어만 바꿔 돌리면 음성 접점 호출 · 버림 칸 · 화면 상태의 차례가 같고, 기다린 누름 · 회복으로 연 진짜가 걸어 둔 규칙의 언어를 쓴다", async () => {
    const en = await script(EN_RULE);
    const ko = await script(KO_RULE);
    expect(ko.calls).toEqual(en.calls);
    expect(ko.notes).toEqual(en.notes);
    expect(ko.views).toEqual(en.views);
    // 첫 누름 · 기다린 누름 · 회복 · 다음 영어 누름
    expect(en.rules).toEqual([EN_RULE, EN_RULE, EN_RULE, EN_RULE]);
    expect(ko.rules).toEqual([KO_RULE, KO_RULE, KO_RULE, EN_RULE]);
    // 맞장구는 버림 안에서 읽혔다(버림 열기 뒤 · 그 닫기 앞)
    const speakAt = ko.calls.indexOf("speak:Nice!");
    expect(ko.calls.slice(0, speakAt)).toContain("openDiscard:1");
    expect(ko.calls.slice(0, speakAt)).not.toContain("stop:1");
    expect(ko.calls.slice(0, speakAt)).not.toContain("abort:1");
    expect(
      ko.calls.slice(speakAt).some((c) => c === "stop:1" || c === "abort:1"),
    ).toBe(true);
  });

  it("AC-25e '그 언어만 안 됨'으로 끝난 진짜는 '마이크를 쓸 수 없음'과 같은 끝(버림을 열지 않고 다음 누름 앞에 버림부터)이고 다시 연 까닭만 no_lang 이다", async () => {
    const run = async (group: "mic-unavailable" | "lang-unavailable") => {
      const { port, layer, views } = makeLayer();
      layer.port.unlockFromGesture();
      const rule = group === "lang-unavailable" ? KO_RULE : EN_RULE;
      const first = layer.port.listen(rule);
      port.lastListen().finish({
        kind: "error",
        code: "service-not-allowed",
        group,
        partialText: "",
      });
      await first.outcome;
      await advance(discard.openAfterMs);
      const opensAfterEnd = port.discards.length;
      const next = layer.port.listen(EN_RULE);
      const d = port.lastDiscard();
      await advance(DEAD_AS);
      d.audio();
      await advance(discard.liveAsMs);
      // 버림부터 연 버림 안에서 다시 말할 차례의 짧은 말을 읽는다(층이 소리 끝을 알린다)
      port.lastUtterance().start();
      await advance(500);
      port.lastUtterance().end();
      await flush();
      await advance(discard.minMs);
      d.end();
      await advance(discard.gapMs);
      expect(port.listens).toHaveLength(2);
      port.lastListen().finish(RESULT);
      await next.outcome;
      return {
        opensAfterEnd,
        calls: [...port.calls],
        notes: notesOf(port.trace),
        views: [...views],
      };
    };
    const mic = await run("mic-unavailable");
    const lang = await run("lang-unavailable");
    expect(mic.opensAfterEnd).toBe(0);
    expect(lang.opensAfterEnd).toBe(0);
    expect(lang.calls).toEqual(mic.calls);
    expect(lang.views).toEqual(mic.views);
    expect(mic.notes.at(-1)).toMatchObject({ g: "reopen", rw: "no_mic" });
    expect(lang.notes.at(-1)).toMatchObject({ g: "reopen", rw: "no_lang" });
    const strip = (n: { rw?: string }) => ({ ...n, rw: undefined });
    expect(lang.notes.map(strip)).toEqual(mic.notes.map(strip));
  });

  it("AC-25e 기계는 '마이크를 쓸 수 없음' 끝에서 넘겨받은 까닭을 적고, 까닭이 없으면 지금처럼 no_mic 이다", () => {
    const end = (why?: "no_lang") => {
      let step = startDiscardFlow(discardTimesOf(discard, speech));
      const send = (input: DiscardFlowInput, at: number) => {
        step = stepDiscardFlow(step.state, input, at);
      };
      send({ type: "unlock" }, 0);
      send({ type: "press" }, 0);
      send(
        why === undefined
          ? { type: "real-end", kind: "unavailable" }
          : { type: "real-end", kind: "unavailable", why },
        100,
      );
      return step.state;
    };
    expect(end().reopenWhy).toBe("no_mic");
    expect(end("no_lang").reopenWhy).toBe("no_lang");
    expect(end("no_lang").phase).toBe(end().phase);
  });
});

// 이야기 방식의 인식기 정보(회화 대화 구조 R spec 설계 11 · FR-12 · AC-12, plan 묶음 V). 끝 줄이 후보 수를 실은 차례에만 화면이 듣기 매개
// (ListenCallbacks.alternatives)를 넘기고, 음성 접점은 그 듣기의 인식 객체 maxAlternatives 를 그 값으로 열어 결과마다 확신 정도 · 둘째 후보를
// 읽는다. 듣기 사건 요약(client_listen)에는 수와 참거짓(cf · na · int)만 남고 둘째 후보 글은 턴 요청으로만 간다(recognizer 알림). 넘기지 않은
// 듣기는 maxAlternatives 1 · 기록 · 요약이 지금 그대로다(NFR-5). 시험의 시각(ms) · 확신 정도는 장면을 적은 자료다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));

import {
  type ClientListenEntry,
  ClientListenEntrySchema,
} from "@/core/conversation/client-listen";
import { discardSettingsFrom } from "@/core/speech/discard-settings";
import { type EndRule, speechSettingsFrom } from "@/core/speech/listen";
import {
  createBrowserSpeech,
  type ResultReadout,
  recognizerInfoOf,
} from "@/lib/speech/browser";
import { discardLayerFor } from "@/lib/speech/discard-layer";
import { createListenLog } from "@/lib/speech/listen-log";
import type {
  ListenCallbacks,
  RecognitionLike,
  RecognizerInfo,
  SpeechTraceEntry,
} from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const speech = speechSettingsFrom((key) => values[key]);
const RULE: EndRule = { endSilenceMs: 1000, chunkMs: 60000 };
/** 둘째 후보 글(기록 · 요약 어디에도 남으면 안 된다). */
const SECOND = "I can sea";
const SAID = "I can see";
const DESKTOP = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  maxTouchPoints: 0,
};
const IPAD = {
  userAgent:
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
  maxTouchPoints: 5,
};

// ── 가짜 인식기(결과마다 후보 목록 · 확신 정도를 낸다) ──

type Alt = { transcript: string; confidence?: number };
type FakeResult = { isFinal: boolean; alts: Alt[] };
/** 인식 객체 하나가 낼 일: 결과 목록(연속 인식처럼 매번 목록 전체)을 차례로 낸다. audioAfter 는 start → audiostart. */
type Plan = {
  audioAfter: number;
  results: { at: number; list: FakeResult[] }[];
};

const made: FakeRecognition[] = [];
let plans: Plan[] = [];

function resultEvent(list: FakeResult[]) {
  const results = list.map((r) =>
    Object.assign(
      r.alts.map((a) =>
        a.confidence === undefined
          ? { transcript: a.transcript }
          : { transcript: a.transcript, confidence: a.confidence },
      ),
      { isFinal: r.isFinal },
    ),
  );
  return { resultIndex: 0, results } as unknown as Event;
}

class FakeRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  onstart: ((e: Event) => void) | null = null;
  onaudiostart: ((e: Event) => void) | null = null;
  onsoundstart: ((e: Event) => void) | null = null;
  onspeechstart: ((e: Event) => void) | null = null;
  onspeechend: ((e: Event) => void) | null = null;
  onsoundend: ((e: Event) => void) | null = null;
  onaudioend: ((e: Event) => void) | null = null;
  onnomatch: ((e: Event) => void) | null = null;
  onresult: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  onend: ((e: Event) => void) | null = null;
  ended = false;
  constructor() {
    made.push(this);
  }
  start() {
    const plan = plans.shift() ?? { audioAfter: 40, results: [] };
    setTimeout(() => this.onstart?.(new Event("start")), 5);
    setTimeout(
      () => this.onaudiostart?.(new Event("audiostart")),
      plan.audioAfter,
    );
    if (plan.results.length > 0) {
      setTimeout(() => this.onspeechstart?.(new Event("speechstart")), 300);
    }
    for (const r of plan.results) {
      setTimeout(() => {
        if (!this.ended) this.onresult?.(resultEvent(r.list));
      }, r.at);
    }
  }
  stop() {
    setTimeout(() => this.end(), 20);
  }
  abort() {
    setTimeout(() => this.end(), 0);
  }
  end() {
    if (this.ended) return;
    this.ended = true;
    this.onend?.(new Event("end"));
  }
}

const Ctor = FakeRecognition as unknown as new () => RecognitionLike;

function setup(device = DESKTOP) {
  vi.stubGlobal("navigator", device);
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("document", {
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  const trace: SpeechTraceEntry[] = [];
  const port = createBrowserSpeech({
    settings: speech,
    onTrace: (e) => trace.push(e),
    recognitionCtor: Ctor,
  });
  return { port, trace };
}

async function settle<T>(promise: Promise<T>, ms = 20000): Promise<T> {
  let done = false;
  let value: T | undefined;
  void promise.then((v) => {
    done = true;
    value = v;
  });
  for (let waited = 0; !done && waited < ms; waited += 50) {
    await vi.advanceTimersByTimeAsync(50);
  }
  if (!done) throw new Error("듣기가 끝나지 않았다");
  return value as T;
}

/** 확정 결과 하나(후보 둘)로 끝나는 듣기. */
const finalWithSecond = (confidence?: number): Plan => ({
  audioAfter: 40,
  results: [
    {
      at: 600,
      list: [{ isFinal: false, alts: [{ transcript: "I can" }] }],
    },
    {
      at: 900,
      list: [
        {
          isFinal: true,
          alts: [{ transcript: SAID, confidence }, { transcript: SECOND }],
        },
      ],
    },
  ],
});

/** 중간 결과만 내고 확정 없이 끝나는 듣기. */
const interimOnly: Plan = {
  audioAfter: 40,
  results: [
    {
      at: 600,
      list: [
        {
          isFinal: false,
          alts: [{ transcript: SAID, confidence: 0.3 }, { transcript: SECOND }],
        },
      ],
    },
  ],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
  made.length = 0;
  plans = [];
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("인식기 정보 — 듣기 매개가 없을 때(지금 그대로, AC-27l · AC-27s)", () => {
  it("AC-27l 후보 수를 넘기지 않은 듣기는 maxAlternatives 1 이고 인식기 정보 기록 · 알림 · 요약 칸이 없다", async () => {
    const { port, trace } = setup();
    plans = [finalWithSecond(0.42)];
    const seen: RecognizerInfo[] = [];
    const on = { recognizer: (i: RecognizerInfo) => seen.push(i) };
    const outcome = await settle(port.listen(RULE, on).outcome);
    expect(outcome.kind).toBe("result");
    expect(made.map((r) => r.maxAlternatives)).toEqual([1]);
    expect(
      trace.some((e) => e.kind === "listen-done" && e.rec !== undefined),
    ).toBe(false);
    expect(seen).toEqual([]);
    const log = createListenLog();
    for (const e of trace) log.record(e);
    const [entry] = log.take();
    expect(entry).toBeDefined();
    for (const key of ["cf", "na", "int"])
      expect(entry).not.toHaveProperty(key);
  });

  it("AC-27l 0 · 소수 · 수가 아닌 후보 수는 넘기지 않은 것으로 본다(maxAlternatives 1)", async () => {
    const { port } = setup();
    for (const alternatives of [0, 1.5, Number.NaN]) {
      plans = [finalWithSecond(0.42)];
      await settle(port.listen(RULE, { alternatives }).outcome);
    }
    expect(made.map((r) => r.maxAlternatives)).toEqual([1, 1, 1]);
  });
});

describe("인식기 정보 — 후보 수를 넘긴 듣기(AC-27l)", () => {
  it("AC-27l 후보 수 2 의 듣기는 maxAlternatives 2 로 열고, 확신 정도 · 후보 수 · 중간 결과 표지가 요약에 수 · 참거짓으로 남으며 둘째 후보 글은 알림으로만 간다", async () => {
    const { port, trace } = setup();
    plans = [finalWithSecond(0.4249)];
    const seen: RecognizerInfo[] = [];
    const outcome = await settle(
      port.listen(RULE, {
        alternatives: 2,
        recognizer: (i) => seen.push(i),
      }).outcome,
    );
    expect(outcome.kind).toBe("result");
    expect(made.map((r) => r.maxAlternatives)).toEqual([2]);
    expect(seen).toEqual([
      {
        confidence: 0.42,
        alternative: SECOND,
        alternatives: 2,
        interim: false,
      },
    ]);
    // 인식기 정보는 듣기 끝 기록(listen-done)의 rec 칸에 수 · 참거짓으로만 남는다
    const done = trace.find((e) => e.kind === "listen-done");
    expect(done?.kind === "listen-done" && done.rec).toEqual({
      cf: 0.42,
      na: 2,
      int: false,
    });
    expect(JSON.stringify(trace)).not.toContain(SECOND);
    const log = createListenLog();
    for (const e of trace) log.record(e);
    const [entry] = log.take();
    expect(entry).toMatchObject({ o: "result", cf: 0.42, na: 2, int: false });
    expect(JSON.stringify(entry)).not.toContain(SECOND);
    expect(ClientListenEntrySchema.parse(entry)).toEqual(entry);
  });

  it("AC-27l 중간 결과만으로 끝난 듣기는 int 참 · 확신 정도 없음이고 둘째 후보도 넘기지 않는다", async () => {
    const { port, trace } = setup();
    plans = [interimOnly];
    const seen: RecognizerInfo[] = [];
    await settle(
      port.listen(RULE, { alternatives: 2, recognizer: (i) => seen.push(i) })
        .outcome,
    );
    expect(seen).toEqual([{ alternatives: 2, interim: true }]);
    const log = createListenLog();
    for (const e of trace) log.record(e);
    const [entry] = log.take();
    expect(entry).toMatchObject({ na: 2, int: true });
    expect(entry).not.toHaveProperty("cf");
  });

  it("AC-27l 확신 정도가 0 이거나 오지 않으면 비운다(0 은 '모름')", async () => {
    const { port } = setup();
    const seen: RecognizerInfo[] = [];
    for (const confidence of [0, undefined]) {
      plans = [finalWithSecond(confidence)];
      await settle(
        port.listen(RULE, { alternatives: 2, recognizer: (i) => seen.push(i) })
          .outcome,
      );
    }
    expect(seen.map((i) => i.confidence)).toEqual([undefined, undefined]);
    expect(seen.map((i) => i.alternative)).toEqual([SECOND, SECOND]);
  });

  it("AC-27l '다시 말하기'로 버린 듣기도 다음 듣기와 함께 요약에 확신 정도 · 중간 결과 표지가 남는다", async () => {
    const { port, trace } = setup();
    plans = [finalWithSecond(0.31), finalWithSecond(0.88)];
    const on: ListenCallbacks = { alternatives: 2 };
    // 첫 듣기: 인식 확인에서 아이가 '다시 말하기'를 누름(화면이 버림) → 둘째 듣기
    await settle(port.listen(RULE, on).outcome);
    await settle(port.listen(RULE, on).outcome);
    const log = createListenLog();
    for (const e of trace) log.record(e);
    const entries: ClientListenEntry[] = log.take();
    expect(entries.map((e) => [e.cf, e.na, e.int])).toEqual([
      [0.31, 2, false],
      [0.88, 2, false],
    ]);
  });

  it("AC-27l 버리는 듣기 층을 지나도 후보 수가 진짜 인식 객체에 닿고 버림 객체는 1 이다", async () => {
    const { port: inner, trace } = setup(IPAD);
    const discard = discardSettingsFrom((key) => values[key]);
    const layer = discardLayerFor(inner, {
      discard,
      speech,
      verdict: inner.device(),
      fallbackLines: {
        again: { text: "Okay.", sound: "short" },
        mic: { text: "Oops.", sound: "short" },
      },
      onTrace: (e) => trace.push(e),
    });
    if (layer === null) throw new Error("iPad 꼴인데 층이 없다");
    plans = [finalWithSecond(0.5)];
    layer.port.unlockFromGesture();
    const seen: RecognizerInfo[] = [];
    await settle(
      layer.port.listen(RULE, {
        alternatives: 2,
        recognizer: (i) => seen.push(i),
      }).outcome,
    );
    expect(made[0]?.maxAlternatives).toBe(2);
    expect(seen).toHaveLength(1);
    // 진짜 뒤 기다림을 지나 버림이 열린다 — 버림 객체는 지금 그대로 1
    await vi.advanceTimersByTimeAsync(discard.openAfterMs + 100);
    expect(made.length).toBeGreaterThan(1);
    expect(made.slice(1).every((r) => r.maxAlternatives === 1)).toBe(true);
    layer.dispose();
  });
});

describe("인식기 정보 — 값의 뜻(순수, AC-27l)", () => {
  const r = (
    isFinal: boolean,
    confidence: number | undefined,
    count = 1,
    second?: string,
  ): ResultReadout => ({ isFinal, confidence, count, second });

  it("AC-27l 확신 정도는 확정 결과들 가운데 가장 낮은 값이고, 확정 결과가 둘 이상이면 둘째 후보를 쓰지 않는다", () => {
    expect(
      recognizerInfoOf([[r(true, 0.9, 2, "a"), r(true, 0.456, 2, "b")]]),
    ).toEqual({ confidence: 0.46, alternatives: 2, interim: false });
  });

  it("AC-27l 인식 객체가 여럿이면(끊어 듣기) 목록을 이어 보고, 확정 결과 하나에 값이 없으면 확신 정도를 비운다", () => {
    expect(
      recognizerInfoOf([[r(true, 0.7, 1)], [r(true, undefined, 1)]]),
    ).toEqual({ alternatives: 1, interim: false });
  });

  it("AC-27l 확정 결과 하나 뒤에 중간 결과가 붙은 글은 둘째 후보를 넘기지 않고 섞인 표지(mixed)를 단다", () => {
    expect(
      recognizerInfoOf([[r(true, 0.3, 2, "I can sea"), r(false, 0, 1)]]),
    ).toEqual({
      confidence: 0.3,
      alternatives: 2,
      interim: false,
      mixed: true,
    });
  });

  it("AC-27l 인식 객체가 둘이고 뒤 객체가 중간 결과로 끝난 글도 둘째 후보를 넘기지 않고 섞인 표지를 단다", () => {
    expect(
      recognizerInfoOf([[r(true, 0.3, 2, "I can sea")], [r(false, 0, 1)]]),
    ).toEqual({
      confidence: 0.3,
      alternatives: 2,
      interim: false,
      mixed: true,
    });
  });

  it("AC-27l 중간 결과만이거나 확정 결과만인 글에는 섞인 표지가 없다", () => {
    expect(recognizerInfoOf([[r(false, 0.3, 2, "x")]])).not.toHaveProperty(
      "mixed",
    );
    expect(
      recognizerInfoOf([[r(true, 0.8, 1)], [r(true, 0.7, 1)]]),
    ).not.toHaveProperty("mixed");
  });

  it("AC-27l 결과가 없으면 정보가 없다", () => {
    expect(recognizerInfoOf([])).toBeUndefined();
    expect(recognizerInfoOf([[], []])).toBeUndefined();
  });

  it("AC-27l 빈 둘째 후보는 넘기지 않는다", () => {
    expect(recognizerInfoOf([[r(true, 0.8, 2, "  ")]])).toEqual({
      confidence: 0.8,
      alternatives: 2,
      interim: false,
    });
  });
});

describe("인식기 정보 — 섞인 글(AC-27l)", () => {
  it("AC-27l 확정 결과 뒤 중간 결과로 끝난 듣기는 요약에 mx 참이 남고 int 는 거짓 · 둘째 후보 글은 어디에도 없다", async () => {
    const { port, trace } = setup();
    plans = [
      {
        audioAfter: 40,
        results: [
          {
            at: 600,
            list: [
              {
                isFinal: true,
                alts: [
                  { transcript: SAID, confidence: 0.3 },
                  { transcript: SECOND },
                ],
              },
              { isFinal: false, alts: [{ transcript: "dogs" }] },
            ],
          },
        ],
      },
    ];
    const seen: RecognizerInfo[] = [];
    await settle(
      port.listen(RULE, { alternatives: 2, recognizer: (i) => seen.push(i) })
        .outcome,
    );
    expect(seen).toEqual([
      { confidence: 0.3, alternatives: 2, interim: false, mixed: true },
    ]);
    const log = createListenLog();
    for (const e of trace) log.record(e);
    const [entry] = log.take();
    expect(entry).toMatchObject({ cf: 0.3, na: 2, int: false, mx: true });
    expect(JSON.stringify(trace)).not.toContain(SECOND);
    expect(ClientListenEntrySchema.parse(entry)).toEqual(entry);
  });

  it("AC-27l 섞이지 않은 듣기의 요약에는 mx 칸이 없다", async () => {
    const { port, trace } = setup();
    plans = [finalWithSecond(0.6)];
    await settle(port.listen(RULE, { alternatives: 2 }).outcome);
    const log = createListenLog();
    for (const e of trace) log.record(e);
    const [entry] = log.take();
    expect(entry).toMatchObject({ cf: 0.6, int: false });
    expect(entry).not.toHaveProperty("mx");
  });
});

describe("인식기 정보 — 요약 꼴(AC-27l)", () => {
  it("AC-27l 요약 꼴은 cf 0~1 · na 정수 · int 참거짓만 받는다", () => {
    const base = { o: "result", d: 4000, snd: true };
    expect(
      ClientListenEntrySchema.safeParse({ ...base, cf: 0.5, na: 2, int: false })
        .success,
    ).toBe(true);
    for (const bad of [
      { cf: 1.2 },
      { cf: -0.1 },
      { na: 1.5 },
      { na: -1 },
      { int: "yes" },
      { alt: SECOND },
    ]) {
      expect(
        ClientListenEntrySchema.safeParse({ ...base, ...bad }).success,
      ).toBe(false);
    }
  });
});

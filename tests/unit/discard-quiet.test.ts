// 버리는 듣기 기계의 조용함 입구(회화 대화 구조 R spec 설계 6 '버리는 듣기와 겹칠 때' · '기록 칸' · '흐름별 기대값', plan 묶음 V).
// 첫째 절은 '변경 앞 기준'(AC-19 · 27s)이다: 고치기 전 기계에 고정 표본을 돌려 뜬 음성 기록 차례(tests/fixtures/discard-baseline.json)와
// quiet 입력이 없는 표본 · discard_mode off 의 기록이 같아야 한다. 기준은 반드시 고치기 전 기계(커밋 e72c403)에서 뜬다(고친 뒤에 뜨면
// 기준이 아니다). 뜨는 방법(묶음 V fix 1, 검토자 rev-chat-v 의 방법 그대로): 'git archive e72c403' 으로 뜬 사본에 워크트리의 node_modules
// 를 잇고, 이 시험 파일만 그 사본의 tests/unit 에 넣은 뒤 그 사본에서 DISCARD_BASELINE_WRITE=1 pnpm exec vitest run
// tests/unit/discard-quiet.test.ts 를 돌려 생긴 tests/fixtures/discard-baseline.json 을 워크트리로 옮긴다. 쓰는 코드는 2칸으로 쓴 뒤 biome
// format 을 거쳐, 다시 떠도 공백만 바뀐 차이가 생기지 않는다.
// 시험의 시각(ms)은 장면을 적은 자료다. 설계 숫자는 시험용 설정(TEST_SETTINGS)에서 읽는다.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));

import {
  type DiscardFlowEffect,
  type DiscardFlowInput,
  type DiscardFlowNote,
  type DiscardReadKind,
  type DiscardReopenWhy,
  type DiscardStep,
  discardTimesOf,
  type RealEndKind,
  startDiscardFlow,
  stepDiscardFlow,
} from "@/core/speech/discard";
import { discardSettingsFrom } from "@/core/speech/discard-settings";
import { type EndRule, speechSettingsFrom } from "@/core/speech/listen";
import {
  parseSpeechScript,
  type RecognitionRun,
  type UtteranceRun,
} from "@/core/speech/script";
import { createBrowserSpeech } from "@/lib/speech/browser";
import {
  type DiscardSoundLine,
  type DiscardSoundNeed,
  discardLayerFor,
} from "@/lib/speech/discard-layer";
import { installFakeWebSpeech } from "@/lib/speech/fake-web-speech";
import type { SpeechTraceEntry } from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const speech = speechSettingsFrom((key) => values[key]);
const discard = discardSettingsFrom((key) => values[key]);
const T = discardTimesOf(discard, speech);
const BASELINE_PATH = new URL(
  "../fixtures/discard-baseline.json",
  import.meta.url,
);
const WRITE_BASELINE = process.env.DISCARD_BASELINE_WRITE === "1";

// ── 기계 흉내(층 · 음성 접점 · 틀의 몫을 정해진 꼴로 답한다) ──

/** 표본의 행동(틀 · 아이가 보내는 것). quiet 는 조용함 입구다(기준 표본에는 없다). */
type Action =
  | { at: number; do: "press"; auto?: boolean }
  | { at: number; do: "speak"; sound?: DiscardReadKind; notPlayed?: boolean }
  | {
      at: number;
      do:
        | "unlock"
        | "again"
        | "dont-know"
        | "hidden"
        | "visible"
        | "leave"
        | "check"
        | "quiet";
    }
  | { at: number; do: "server-wait"; on: boolean }
  /** 틀이 읽기를 끊음(started 는 층이 본 시작 알림). 흉내는 끊긴 읽기의 남은 알림을 거둔다. */
  | { at: number; do: "cut"; started: boolean }
  /** speechSynthesis.speaking 을 읽은 값(참이면 굳은 읽기). */
  | { at: number; do: "synth"; speaking: boolean };

/** 버림 하나의 꼴: as 는 start → audiostart(없으면 오지 않음), selfEnd 는 start → 저절로 끝(없으면 stop 뒤 END_AFTER_STOP). */
type Probe = { as?: number; selfEnd?: number };
type RealPlan = { after: number; kind: RealEndKind; why?: DiscardReopenWhy };
type MachineSample = {
  name: string;
  actions: Action[];
  probes: Probe[];
  reals: RealPlan[];
  until: number;
};

/** 기록 한 줄: 걸음의 시각 · 입력 · 효과 · 깨울 시각 · 걸음 뒤 상태 이름. */
type StepLog = {
  t: number;
  in: DiscardFlowInput;
  fx: DiscardFlowEffect[];
  wake: number | null;
  ph: string;
};

/** 표본 자료의 기술 값: 읽기 시작 알림 · 길이 · stop 뒤 end · 들려주지 못함 알림(ms). */
const SPEAK_START_AFTER = 2;
const LINE_MS = 1500;
const END_AFTER_STOP = 20;
const NOT_PLAYED_AFTER = 5;
const DEFAULT_PROBE: Probe = { as: 40 };
const DEFAULT_REAL: RealPlan = { after: 3000, kind: "result" };

type Queued = { at: number; seq: number; input: DiscardFlowInput };

/** 표본 하나를 기계에 돌린다. 행동 · 흉내의 답 · 깨울 시각의 tick 을 시각 차례(같은 시각은 넣은 차례)로 보낸다. */
function runMachine(sample: MachineSample): StepLog[] {
  const log: StepLog[] = [];
  let step: DiscardStep = startDiscardFlow(T);
  let seq = 0;
  const queue: Queued[] = [];
  const push = (at: number, input: DiscardFlowInput) =>
    queue.push({ at, seq: seq++, input });
  let probeIndex = 0;
  let realIndex = 0;
  let readingId = 0;
  const notPlayed = new Set<number>();
  /** 흘린 읽기의 예약(끊기면 지운다). */
  const live = new Map<number, Queued[]>();

  for (const action of sample.actions) {
    switch (action.do) {
      case "press":
        push(action.at, { type: "press", auto: action.auto });
        break;
      case "speak": {
        readingId += 1;
        if (action.notPlayed) notPlayed.add(readingId);
        push(action.at, {
          type: "speak-request",
          id: readingId,
          sound: action.sound,
        });
        break;
      }
      case "server-wait":
        push(action.at, { type: "server-wait", on: action.on });
        break;
      case "again":
        push(action.at, { type: "again" });
        break;
      case "dont-know":
        push(action.at, { type: "dont-know" });
        break;
      case "quiet":
        push(action.at, { type: "quiet" });
        break;
      case "cut":
        push(action.at, { type: "cut", started: action.started });
        break;
      case "synth":
        push(action.at, { type: "synth", speaking: action.speaking });
        break;
      default:
        push(action.at, { type: action.do });
    }
  }

  const react = (now: number, fx: DiscardFlowEffect[]) => {
    for (const effect of fx) {
      switch (effect.type) {
        case "discard-start": {
          const probe = sample.probes[probeIndex] ?? DEFAULT_PROBE;
          probeIndex += 1;
          if (probe.as !== undefined)
            push(now + probe.as, {
              type: "discard-audio",
              discard: effect.discard,
            });
          if (probe.selfEnd !== undefined)
            push(now + probe.selfEnd, {
              type: "discard-end",
              discard: effect.discard,
            });
          break;
        }
        case "discard-stop":
          push(now + END_AFTER_STOP, {
            type: "discard-end",
            discard: effect.discard,
          });
          break;
        case "speak-release": {
          const id = effect.id;
          const planned: Queued[] = [];
          const at = (ms: number, input: DiscardFlowInput) => {
            const q = { at: now + ms, seq: seq++, input };
            queue.push(q);
            planned.push(q);
          };
          if (notPlayed.has(id)) {
            at(NOT_PLAYED_AFTER, { type: "speak-end", id, heard: false });
            at(NOT_PLAYED_AFTER, { type: "sound-end" });
          } else {
            at(SPEAK_START_AFTER, { type: "speak-start", id });
            at(SPEAK_START_AFTER + LINE_MS, {
              type: "speak-end",
              id,
              heard: true,
            });
            at(SPEAK_START_AFTER + LINE_MS, { type: "sound-end" });
          }
          live.set(id, planned);
          break;
        }
        case "cancel-speaking":
          // 기계는 이미 읽는 중 목록을 비웠다(층 run 의 cancel-speaking 과 같음) — 남은 알림을 거둔다.
          dropLive();
          break;
        case "need-sound":
          readingId += 1;
          push(now, { type: "speak-request", id: readingId, sound: "short" });
          break;
        case "real-start": {
          const plan = sample.reals[realIndex] ?? DEFAULT_REAL;
          realIndex += 1;
          push(now + plan.after, {
            type: "real-end",
            kind: plan.kind,
            why: plan.why,
          });
          break;
        }
        default:
          break;
      }
    }
  };

  /** 흘린 읽기의 남은 알림을 거둔다(기계가 읽는 중 목록을 비운 때 — 누름 · 굳은 읽기의 cancel, 틀의 cut). */
  const dropLive = () => {
    for (const planned of live.values()) {
      for (const q of planned) {
        const index = queue.indexOf(q);
        if (index >= 0) queue.splice(index, 1);
      }
    }
    live.clear();
  };

  const apply = (at: number, input: DiscardFlowInput) => {
    if (input.type === "cut") dropLive();
    step = stepDiscardFlow(step.state, input, at);
    log.push({
      t: at,
      in: input,
      fx: step.effects,
      wake: step.wakeAt ?? null,
      ph: step.state.phase,
    });
    react(at, step.effects);
  };

  for (let guard = 0; guard < 10_000; guard += 1) {
    queue.sort((a, b) => a.at - b.at || a.seq - b.seq);
    const next = queue[0];
    const wake = step.wakeAt;
    if (
      wake !== undefined &&
      wake <= sample.until &&
      (!next || wake < next.at)
    ) {
      apply(wake, { type: "tick" });
      continue;
    }
    if (!next || next.at > sample.until) return log;
    queue.shift();
    apply(next.at, next.input);
  }
  throw new Error(`${sample.name}: 걸음이 끝나지 않는다`);
}

const notesOf = (log: StepLog[]): DiscardFlowNote[] =>
  log.flatMap((s) => s.fx.flatMap((e) => (e.type === "note" ? [e.dc] : [])));
const starts = (log: StepLog[]) =>
  log.flatMap((s) =>
    s.fx.flatMap((e) => (e.type === "discard-start" ? [s.t] : [])),
  );

// ── 고정 표본(기준 · 기계) ──

/** 첫 차례: 쪽 첫 누름 → 진짜(결과) → 진짜 뒤 기다림 → 버림(죽은 버림) 안 선생님 말 → 간격 → 누름 → 진짜. */
const FIRST_TURN: Action[] = [
  { at: 0, do: "unlock" },
  { at: 0, do: "press" },
  { at: 3000, do: "server-wait", on: true },
  { at: 6000, do: "server-wait", on: false },
  { at: 6000, do: "speak" },
];

const MACHINE_SAMPLES: MachineSample[] = [
  {
    name: "보통 차례 둘(진짜 → 기다림 → 죽은 버림 안 선생님 말 → 진짜)",
    actions: [
      ...FIRST_TURN,
      { at: 12000, do: "press" },
      { at: 15000, do: "server-wait", on: true },
      { at: 17000, do: "server-wait", on: false },
      { at: 17000, do: "speak" },
      { at: 24000, do: "press" },
    ],
    probes: [],
    reals: [],
    until: 40000,
  },
  {
    name: "살아 있는 버림 뒤 다시 연 버림이 죽은 버림(C216)",
    actions: [...FIRST_TURN, { at: 14000, do: "press" }],
    probes: [{ as: 400 }, { as: 40 }],
    reals: [],
    until: 30000,
  },
  {
    name: "다시 연 버림도 살아 있음(대기 live, 세션 없이 읽음)",
    actions: [...FIRST_TURN, { at: 14000, do: "press" }],
    probes: [{ as: 400 }, { as: 400 }],
    reals: [],
    until: 30000,
  },
  {
    name: "마이크 안 잡힘(deaf) 뒤 곧바로 버림 · 다시 말할 차례 · 회복",
    actions: [
      { at: 0, do: "unlock" },
      { at: 0, do: "press" },
      { at: 2500, do: "again" },
      { at: 2500, do: "press", auto: true },
    ],
    probes: [{ as: 30 }],
    reals: [{ after: 2000, kind: "deaf" }],
    until: 20000,
  },
  {
    name: "'잘 모르겠어요' 차례(대기 discard 에서 세션 없이 읽음)",
    actions: [
      ...FIRST_TURN,
      { at: 12000, do: "dont-know" },
      { at: 12000, do: "server-wait", on: true },
      { at: 14000, do: "server-wait", on: false },
      { at: 14000, do: "speak" },
      { at: 20000, do: "press" },
    ],
    probes: [],
    reals: [],
    until: 30000,
  },
  {
    name: "숨김 · 돌아옴 뒤 버림부터(까닭 hidden)",
    actions: [
      ...FIRST_TURN,
      { at: 9000, do: "hidden" },
      { at: 11000, do: "visible" },
      { at: 12000, do: "speak" },
      { at: 16000, do: "press" },
    ],
    probes: [],
    reals: [],
    until: 30000,
  },
  {
    name: "버림 안 들려주지 못함 두 번(살아 있는 버림으로 닫음)",
    actions: [
      { at: 0, do: "unlock" },
      { at: 0, do: "press" },
      { at: 6000, do: "speak", notPlayed: true },
      { at: 7000, do: "speak", notPlayed: true },
      { at: 12000, do: "press" },
    ],
    probes: [],
    reals: [],
    until: 30000,
  },
  {
    name: "소리 없는 죽은 버림의 안전 상한 → 버림부터(cap)",
    actions: [
      { at: 0, do: "unlock" },
      { at: 0, do: "press" },
      { at: 30000, do: "speak" },
      { at: 36000, do: "press" },
    ],
    probes: [],
    reals: [],
    until: 50000,
  },
  {
    name: "읽는 중 누름(시작 전 끊김 — F9 짧은 말)",
    actions: [
      { at: 0, do: "unlock" },
      { at: 0, do: "press" },
      { at: 6000, do: "speak" },
      { at: 6001, do: "press" },
    ],
    probes: [],
    reals: [],
    until: 20000,
  },
  {
    name: "쉰 뒤(rest 넘음) 세션 없이 읽고 누르면 간격 뒤 진짜",
    actions: [
      ...FIRST_TURN,
      { at: 60000, do: "speak" },
      { at: 62000, do: "press" },
    ],
    probes: [],
    reals: [],
    until: 80000,
  },
  {
    name: "저절로 끝난 버림 · 떠남 · 마이크 확인",
    actions: [
      ...FIRST_TURN,
      { at: 12000, do: "press" },
      { at: 20000, do: "check" },
      { at: 22000, do: "speak" },
      { at: 26000, do: "leave" },
    ],
    probes: [{ as: 40 }, { as: 40, selfEnd: 600 }],
    reals: [],
    until: 40000,
  },
  // ── fix 1 에 더한 표본(검토 rev-chat-v M-3) ──
  {
    name: "틀이 시작 알림 전 읽기를 끊음(cut) 뒤 누름 — F9 짧은 말",
    actions: [
      { at: 0, do: "unlock" },
      { at: 0, do: "press" },
      { at: 6000, do: "speak" },
      { at: 6001, do: "cut", started: false },
      { at: 6001, do: "press" },
    ],
    probes: [],
    reals: [],
    until: 20000,
  },
  {
    name: "굳은 speaking: 간격 끝에서 cancel 뒤 after 기다림 · 걸린 누름",
    actions: [
      ...FIRST_TURN,
      { at: 7600, do: "synth", speaking: true },
      { at: 8000, do: "press" },
      { at: 12000, do: "synth", speaking: false },
    ],
    probes: [],
    reals: [],
    until: 20000,
  },
  {
    name: "마이크를 쓸 수 없음(unavailable)으로 끝난 진짜 뒤 버림부터(no_mic)",
    actions: [
      { at: 0, do: "unlock" },
      { at: 0, do: "press" },
      { at: 4000, do: "speak" },
      { at: 9000, do: "press" },
    ],
    probes: [],
    reals: [{ after: 2000, kind: "unavailable" }],
    until: 20000,
  },
];

// ── 고정 표본(기준 · 층 위 음성 기록, 가짜 Web Speech) ──

const RULE: EndRule = { endSilenceMs: 1000, chunkMs: 60000 };
const FALLBACK = {
  again: { text: "Okay, it's your turn.", sound: "short" },
  mic: { text: "Oops! Let me turn it on.", sound: "short" },
} satisfies Record<DiscardSoundNeed, DiscardSoundLine>;
const IPAD = {
  userAgent:
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
  maxTouchPoints: 5,
};
const VOICE = {
  name: "Samantha",
  lang: "en-US",
  localService: true,
  default: true,
};
const lessonDiscard = (as: number): RecognitionRun => ({
  events: [
    { at: 5, type: "start" },
    { at: as, type: "audiostart" },
  ],
  onStop: [{ at: 20, type: "end" }],
});
const realRun = (text: string): RecognitionRun => ({
  events: [
    { at: 10, type: "start" },
    { at: 300, type: "audiostart" },
    { at: 400, type: "speechstart" },
    {
      at: 600,
      type: "result",
      results: [{ transcript: text, isFinal: false }],
    },
    { at: 800, type: "result", results: [{ transcript: text, isFinal: true }] },
  ],
  onStop: [{ at: 20, type: "end" }],
});
const line: UtteranceRun = { startAfter: 2, endAfter: 1500 };
const UNLOCK: UtteranceRun = { startAfter: 0, endAfter: 0 };

const doc = { hidden: false, handlers: new Set<() => void>() };

function installSpeech(runs: RecognitionRun[], utterances: UtteranceRun[]) {
  doc.hidden = false;
  doc.handlers.clear();
  vi.stubGlobal("navigator", IPAD);
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("document", {
    get hidden() {
      return doc.hidden;
    },
    addEventListener: (_type: string, fn: () => void) => doc.handlers.add(fn),
    removeEventListener: (_type: string, fn: () => void) =>
      doc.handlers.delete(fn),
  });
  installFakeWebSpeech(
    parseSpeechScript({
      name: "discard-quiet",
      source: "손으로 씀 — 조용함 입구 변경 앞 기준(묶음 V)",
      expose: { recognition: "webkit", synthesis: true },
      recognitions: runs,
      synthesis: { voices: [VOICE], utterances },
    }),
  );
}

const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);

async function settleWithin<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  let done = false;
  let value: T | undefined;
  void promise.then((v) => {
    done = true;
    value = v;
  });
  for (let waited = 0; !done && waited < ms; waited += 50) await advance(50);
  if (!done) throw new Error("손잡이가 풀리지 않았다");
  return value as T;
}

/** discard_mode 켬(iPad): 층 위에서 '진짜 → 기다림 → 버림 안 선생님 말 → 진짜'를 두 번. */
async function layerOnSample(): Promise<SpeechTraceEntry[]> {
  installSpeech(
    [
      realRun("apple"),
      lessonDiscard(40),
      realRun("banana"),
      lessonDiscard(40),
      realRun("cherry"),
    ],
    [UNLOCK, line, line],
  );
  const t0 = performance.now();
  const trace: SpeechTraceEntry[] = [];
  const record = (e: SpeechTraceEntry) => trace.push({ ...e, at: e.at - t0 });
  const inner = createBrowserSpeech({ settings: speech, onTrace: record });
  const layer = discardLayerFor(inner, {
    discard,
    speech,
    verdict: inner.device(),
    fallbackLines: FALLBACK,
    onTrace: record,
  });
  if (layer === null) throw new Error("iPad 꼴인데 층이 없다");
  layer.port.unlockFromGesture();
  for (const word of ["Nice.", "Great."]) {
    await settleWithin(layer.port.listen(RULE).outcome);
    layer.serverWait(true);
    await advance(discard.openAfterMs + 500);
    layer.serverWait(false);
    await settleWithin(layer.port.speak(word));
    layer.soundEnd();
    await advance(4000);
  }
  await settleWithin(layer.port.listen(RULE).outcome);
  layer.dispose();
  return trace;
}

/** discard_mode off: 층이 없고(null) 음성 접점의 듣기 · 읽기 기록만 있다. */
async function layerOffSample(): Promise<{
  layer: null | "layer";
  trace: SpeechTraceEntry[];
}> {
  installSpeech([realRun("apple"), realRun("banana")], [UNLOCK, line]);
  const t0 = performance.now();
  const trace: SpeechTraceEntry[] = [];
  const record = (e: SpeechTraceEntry) => trace.push({ ...e, at: e.at - t0 });
  const inner = createBrowserSpeech({ settings: speech, onTrace: record });
  const off = discardSettingsFrom((key) =>
    key === "speech.discard_mode" ? "off" : values[key],
  );
  const layer = discardLayerFor(inner, {
    discard: off,
    speech,
    verdict: inner.device(),
    fallbackLines: FALLBACK,
    onTrace: record,
  });
  inner.unlockFromGesture();
  await settleWithin(inner.listen(RULE).outcome);
  await settleWithin(inner.speak("Nice."));
  await advance(1000);
  await settleWithin(inner.listen(RULE).outcome);
  inner.dispose();
  return { layer: layer === null ? null : "layer", trace };
}

type Baseline = {
  note: string;
  machine: { name: string; log: StepLog[] }[];
  layerOn: SpeechTraceEntry[];
  layerOff: { layer: null | "layer"; trace: SpeechTraceEntry[] };
};

/** JSON 으로 옮긴 꼴(undefined 칸이 빠진다)로 견준다. */
const plain = <V>(value: V): V => JSON.parse(JSON.stringify(value)) as V;

function readBaseline(): Baseline {
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as Baseline;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  for (const name of [
    "SpeechRecognition",
    "webkitSpeechRecognition",
    "speechSynthesis",
    "SpeechSynthesisUtterance",
    "__fakeSpeech",
  ])
    delete (globalThis as Record<string, unknown>)[name];
});

describe("변경 앞 기준(AC-27s)", () => {
  it.runIf(WRITE_BASELINE)(
    "기준 파일을 뜬다(기계를 고치기 전에만)",
    async () => {
      const baseline: Baseline = {
        note: "묶음 V 변경 앞 기계 · 층에 고정 표본을 돌려 뜬 음성 기록 차례(AC-19). 다시 뜨지 않는다 — tests/unit/discard-quiet.test.ts",
        machine: MACHINE_SAMPLES.map((s) => ({
          name: s.name,
          log: runMachine(s),
        })),
        layerOn: await layerOnSample(),
        layerOff: await layerOffSample(),
      };
      writeFileSync(
        BASELINE_PATH,
        `${JSON.stringify(plain(baseline), null, 2)}\n`,
      );
      // 형식기를 거쳐 저장소의 꼴과 같게 둔다(다시 떠도 공백만 바뀐 차이가 없게, 검토 M-3).
      execFileSync(
        fileURLToPath(
          new URL("../../node_modules/.bin/biome", import.meta.url),
        ),
        ["format", "--write", fileURLToPath(BASELINE_PATH)],
      );
    },
  );

  it.skipIf(WRITE_BASELINE)(
    "AC-27s quiet 입력이 없는 기계 표본의 음성 기록 차례가 변경 앞 기준과 같다",
    () => {
      const baseline = readBaseline();
      expect(baseline.machine.map((s) => s.name)).toEqual(
        MACHINE_SAMPLES.map((s) => s.name),
      );
      for (const [index, sample] of MACHINE_SAMPLES.entries()) {
        expect(plain(runMachine(sample)), sample.name).toEqual(
          baseline.machine[index]?.log,
        );
      }
    },
  );

  it.skipIf(WRITE_BASELINE)(
    "AC-27s discard_mode 켬의 층 위 음성 기록(진짜 · 버림 · 읽기 · dc)이 변경 앞 기준과 같다",
    async () => {
      expect(plain(await layerOnSample())).toEqual(readBaseline().layerOn);
    },
  );

  it.skipIf(WRITE_BASELINE)(
    "AC-27s discard_mode off 는 층이 없고 음성 접점의 기록이 변경 앞 기준과 같다",
    async () => {
      const off = await layerOffSample();
      expect(off.layer).toBeNull();
      expect(plain(off)).toEqual(readBaseline().layerOff);
    },
  );
});

// ── 조용함 입구(AC-27f · 기계) ──

/** 첫 차례 뒤 기계는 대기(discard 갈래)에 있다: 선생님 말 끝 7502 → stop 7802 → end 7822 → 간격 끝 8822. */
const QUIET_AT = 15600;
/** 조용함 차례: 입구 → 서버 기다림 → 선생님 말 → 아이 누름(다음 진짜). */
function quietTurn(probes: Probe[], pressAt = 30000): MachineSample {
  return {
    name: "조용함 차례",
    actions: [
      ...FIRST_TURN,
      { at: QUIET_AT, do: "quiet" },
      { at: QUIET_AT, do: "server-wait", on: true },
      { at: 17000, do: "server-wait", on: false },
      { at: 17000, do: "speak" },
      { at: pressAt, do: "press" },
    ],
    probes,
    reals: [],
    until: pressAt + 5000,
  };
}
const lastNote = (log: StepLog[]) => notesOf(log).at(-1);
const quietStep = (log: StepLog[]) => {
  const found = log.find((s) => s.in.type === "quiet");
  if (found === undefined) throw new Error("quiet 걸음이 없다");
  return found;
};

describe("조용함 입구 — 흐름별 기대값(spec 설계 6 표, AC-27f)", () => {
  it("AC-27f (ㄱ) 처음 연 버림이 죽은 버림: g reopen · rw quiet · sr 거짓 · ql 거짓 · qa = as(250ms 안)", () => {
    const log = runMachine(quietTurn([{ as: 40 }, { as: 40 }]));
    // 읽기 요청이나 누름을 기다리지 않고 그 걸음에 버림 확인을 연다
    expect(quietStep(log).fx).toContainEqual({
      type: "discard-start",
      discard: 2,
    });
    expect(lastNote(log)).toMatchObject({
      g: "reopen",
      rw: "quiet",
      sr: false,
      ql: false,
      qa: 40,
      as: 40,
      sk: "teacher",
    });
  });

  it("AC-27f (ㄴ) 처음 연 버림이 살아 있고 다시 연 버림이 죽은 버림: rw quiet 가 다시 연 버림에 이어지고 ql 참 · qa 없음 · as 는 다시 연 버림의 값", () => {
    const log = runMachine(quietTurn([{ as: 40 }, { as: 400 }, { as: 30 }]));
    const note = lastNote(log);
    expect(note).toMatchObject({
      g: "reopen",
      rw: "quiet",
      sr: false,
      ql: true,
      as: 30,
      sk: "teacher",
    });
    expect(note?.qa).toBeUndefined();
    // 살아 있는 버림 end + openAfterMs 뒤 한 번 다시 연다(C216 길)
    const opened = starts(log);
    expect(opened[1]).toBe(QUIET_AT);
    expect(opened[2]).toBe(
      QUIET_AT + T.liveAsMs + END_AFTER_STOP + T.openAfterMs,
    );
  });

  it("AC-27f (ㄴ) 판정 뒤 end 전에 온 audiostart 는 qa 에 남는다(250ms 이상)", () => {
    const note = lastNote(
      runMachine(quietTurn([{ as: 40 }, { as: 260 }, { as: 30 }])),
    );
    expect(note).toMatchObject({ g: "reopen", rw: "quiet", ql: true, qa: 260 });
  });

  it("AC-27f (ㄴ') 다시 연 버림도 살아 있음: g live · rw quiet · sr 참 · ql 참", () => {
    const note = lastNote(
      runMachine(quietTurn([{ as: 40 }, { as: 400 }, { as: 400 }])),
    );
    expect(note).toMatchObject({ g: "live", rw: "quiet", sr: true, ql: true });
  });

  it("AC-27f qa · ql 은 다음 진짜 한 번에만 남고 그 뒤 진짜에는 없다", () => {
    const sample = quietTurn([{ as: 40 }, { as: 40 }], 24000);
    sample.actions.push(
      { at: 27000, do: "server-wait", on: true },
      { at: 29000, do: "server-wait", on: false },
      { at: 29000, do: "speak" },
      { at: 36000, do: "press" },
    );
    sample.until = 45000;
    const notes = notesOf(runMachine(sample));
    expect(notes).toHaveLength(3);
    expect(notes[1]).toMatchObject({ rw: "quiet", ql: false, qa: 40 });
    expect(notes[2]?.ql).toBeUndefined();
    expect(notes[2]?.qa).toBeUndefined();
    expect(notes[2]?.rw).toBeUndefined();
  });
});

describe("조용함 입구 — 상태마다(AC-27f · 기계)", () => {
  it("AC-27f 대기 rest 갈래(쪽 첫)에서는 그대로다: 버림을 열지 않고 선생님 말은 세션 없이 읽는다", () => {
    const base: MachineSample = {
      name: "쪽 첫",
      actions: [
        { at: 0, do: "unlock" },
        { at: 1000, do: "speak" },
        { at: 5000, do: "press" },
      ],
      probes: [],
      reals: [],
      until: 12000,
    };
    const quiet: MachineSample = {
      ...base,
      actions: [...base.actions, { at: 500, do: "quiet" }],
    };
    const log = runMachine(quiet);
    expect(quietStep(log).fx).toEqual([]);
    expect(quietStep(log).ph).toBe("rest");
    expect(log.filter((s) => s.in.type !== "quiet")).toEqual(runMachine(base));
  });

  it("AC-27f 대기 rest 갈래(쉼 넘음)에서도 그대로다", () => {
    const base: MachineSample = {
      name: "쉰 뒤",
      actions: [
        ...FIRST_TURN,
        { at: 60000, do: "speak" },
        { at: 66000, do: "press" },
      ],
      probes: [],
      reals: [],
      until: 80000,
    };
    const log = runMachine({
      ...base,
      actions: [...base.actions, { at: 59000, do: "quiet" }],
    });
    expect(quietStep(log).fx).toEqual([]);
    expect(log.filter((s) => s.in.type !== "quiet")).toEqual(runMachine(base));
  });

  it("AC-27f 대기 live 갈래(다시 연 버림도 살아 있었음)에서도 그대로다", () => {
    const base: MachineSample = {
      name: "live",
      actions: [
        ...FIRST_TURN,
        { at: 14000, do: "speak" },
        { at: 20000, do: "press" },
      ],
      probes: [{ as: 400 }, { as: 400 }],
      reals: [],
      until: 30000,
    };
    const log = runMachine({
      ...base,
      actions: [...base.actions, { at: 13000, do: "quiet" }],
    });
    expect(quietStep(log).ph).toBe("rest");
    expect(quietStep(log).fx).toEqual([]);
    expect(log.filter((s) => s.in.type !== "quiet")).toEqual(runMachine(base));
  });

  it("AC-27f 열린 죽은 버림에서는 닫지 않고 소리 끝 알림을 다시 기다린다(새 버림 없음 · qa · ql 없음)", () => {
    const log = runMachine({
      name: "열린 죽은 버림",
      actions: [
        ...FIRST_TURN,
        // 선생님 말 끝(7502) 뒤 stop(7802) 앞
        { at: 7600, do: "quiet" },
        { at: 9000, do: "speak" },
        { at: 16000, do: "press" },
      ],
      probes: [],
      reals: [],
      until: 25000,
    });
    const stops = log.flatMap((s) =>
      s.fx.flatMap((e) => (e.type === "discard-stop" ? [s.t] : [])),
    );
    // 첫 stop 은 새 선생님 말(9000 → 끝 10502) 뒤다
    expect(stops[0]).toBeGreaterThan(10502);
    expect(starts(log)).toHaveLength(2);
    const note = lastNote(log);
    expect(note).toMatchObject({ g: "discard", sr: false, sk: "teacher" });
    expect(note?.ql).toBeUndefined();
    expect(note?.qa).toBeUndefined();
    expect(note?.rw).toBeUndefined();
  });

  it("AC-27f 닫는 중이면 간격 끝에 대기 대신 버림부터(rw quiet)로 가 곧바로 버림을 연다", () => {
    const log = runMachine({
      name: "닫는 중",
      actions: [
        ...FIRST_TURN,
        // stop 7802 → end 7822 사이
        { at: 7810, do: "quiet" },
        { at: 9500, do: "speak" },
        { at: 16000, do: "press" },
      ],
      probes: [],
      reals: [],
      until: 25000,
    });
    expect(quietStep(log).ph).toBe("closing");
    // 간격 끝 = end 7822 + gap, 소리 끝 7502 + gap 가운데 늦은 것
    expect(starts(log)[1]).toBe(7822 + T.gapMs);
    expect(lastNote(log)).toMatchObject({
      g: "reopen",
      rw: "quiet",
      sr: false,
      ql: false,
      qa: 40,
    });
  });

  it("AC-27f 간격이면 간격 끝에 버림부터(rw quiet)로 간다", () => {
    const log = runMachine({
      name: "간격",
      actions: [
        ...FIRST_TURN,
        { at: 8000, do: "quiet" },
        { at: 9500, do: "speak" },
        { at: 16000, do: "press" },
      ],
      probes: [],
      reals: [],
      until: 25000,
    });
    expect(quietStep(log).ph).toBe("gap");
    expect(starts(log)[1]).toBe(7822 + T.gapMs);
    expect(lastNote(log)).toMatchObject({
      g: "reopen",
      rw: "quiet",
      ql: false,
    });
  });

  it("AC-27f 조용함 입구가 아닌 살아 있는 버림 뒤 다시 연 버림에는 까닭이 없다(지금 그대로)", () => {
    const log = runMachine({
      name: "C216",
      actions: [...FIRST_TURN, { at: 14000, do: "press" }],
      probes: [{ as: 400 }, { as: 40 }],
      reals: [],
      until: 30000,
    });
    const note = lastNote(log);
    expect(note?.g).toBe("reopen");
    expect(note?.rw).toBeUndefined();
    expect(note?.ql).toBeUndefined();
  });
});

describe("조용함 입구 — 판정 전에 끊긴 조용함 버림(AC-27f · 검토 M-1)", () => {
  it("AC-27f 조용함 버림이 판정 전에 숨김으로 끊기면 다음 진짜의 dc 에 ql · qa 가 없다(장면 3d)", () => {
    const log = runMachine({
      name: "판정 전 숨김",
      actions: [
        ...FIRST_TURN,
        { at: QUIET_AT, do: "quiet" },
        { at: QUIET_AT, do: "server-wait", on: true },
        { at: QUIET_AT + 10, do: "hidden" },
        { at: QUIET_AT + 3000, do: "visible" },
        { at: 19000, do: "server-wait", on: false },
        { at: 19000, do: "speak" },
        { at: 30000, do: "press" },
      ],
      probes: [{ as: 40 }, { as: 120 }, { as: 30 }],
      reals: [],
      until: 35000,
    });
    const note = lastNote(log);
    expect(note).toMatchObject({ g: "reopen", rw: "hidden", sk: "teacher" });
    expect(note).not.toHaveProperty("ql");
    expect(note).not.toHaveProperty("qa");
  });
});

describe("조용함 입구 — 사람이 할 법한 일과 겹칠 때(AC-27f · 검토 M-2, 기대값은 지금 기계의 행동)", () => {
  /** 첫 차례 뒤에 행동을 잇는 표본. */
  const afterFirst = (
    extra: Action[],
    probes: Probe[] = [],
    until = 40000,
  ): MachineSample => ({
    name: "겹침",
    actions: [...FIRST_TURN, ...extra],
    probes,
    reals: [],
    until,
  });
  const realStarts = (log: StepLog[]) =>
    log.flatMap((s) =>
      s.fx.some((e) => e.type === "real-start") ? [s.t] : [],
    );
  const needs = (log: StepLog[]) =>
    log.flatMap((s) =>
      s.fx.flatMap((e) => (e.type === "need-sound" ? [[s.t, e.kind]] : [])),
    );

  it("AC-27f quiet 뒤 같은 틱의 누름은 진짜를 닫지 않고, 조용함 버림 안 짧은 말 뒤에 진짜를 연다(장면 1a)", () => {
    const base = runMachine(afterFirst([{ at: QUIET_AT, do: "press" }]));
    const log = runMachine(
      afterFirst([
        { at: QUIET_AT, do: "quiet" },
        { at: QUIET_AT, do: "press" },
      ]),
    );
    expect(realStarts(base)).toEqual([0, QUIET_AT]);
    // 버림 판정(as 40) 때 짧은 말을 부르고 그 소리 끝 + after + 간격 뒤 진짜
    expect(needs(log)).toEqual([[QUIET_AT + 40, "again"]]);
    expect(realStarts(log)).toEqual([0, 18462]);
    expect(lastNote(log)).toMatchObject({
      g: "reopen",
      rw: "quiet",
      sk: "short",
      ql: false,
      qa: 40,
      w: 18462 - QUIET_AT,
    });
  });

  it("AC-27f 서버 응답이 오지 않아 기다림을 끄고 아이가 다시 누르면 조용함 버림 안 짧은 말 뒤에 진짜를 연다(장면 4b)", () => {
    const log = runMachine(
      afterFirst(
        [
          { at: QUIET_AT, do: "quiet" },
          { at: QUIET_AT, do: "server-wait", on: true },
          { at: 25000, do: "server-wait", on: false },
          { at: 30000, do: "press" },
        ],
        [],
        80000,
      ),
    );
    expect(needs(log)).toEqual([[30000, "again"]]);
    expect(realStarts(log)).toEqual([0, 32822]);
    expect(notesOf(log)[1]).toMatchObject({
      g: "reopen",
      rw: "quiet",
      sk: "short",
      ql: false,
      qa: 40,
    });
  });

  it("AC-27f 조용함 버림이 소리 전에 저절로 끝나면 대기 live 로 가 선생님 말을 세션 없이 읽는다 — 지금 규칙 그대로(장면 6a, 범위 밖 관찰 O-1)", () => {
    const log = runMachine(
      afterFirst(
        [
          { at: QUIET_AT, do: "quiet" },
          { at: QUIET_AT, do: "server-wait", on: true },
          { at: 18000, do: "server-wait", on: false },
          { at: 18000, do: "speak" },
          { at: 30000, do: "press" },
        ],
        [{ as: 40 }, { as: 40, selfEnd: 1000 }],
      ),
    );
    // 저절로 끝난 걸음에 대기(live)로 가고, 서버 말(18000)은 세션 없이 흘린다
    const ended = log.find(
      (s) => s.in.type === "discard-end" && s.t === QUIET_AT + 1000,
    );
    expect(ended?.ph).toBe("rest");
    const spoken = log.find(
      (s) => s.t === 18000 && s.in.type === "speak-request",
    );
    expect(spoken?.ph).toBe("rest");
    expect(spoken?.fx.some((e) => e.type === "speak-release")).toBe(true);
    expect(starts(log).filter((t) => t > QUIET_AT && t < 30000)).toEqual([]);
    expect(lastNote(log)).toMatchObject({
      g: "live",
      sr: true,
      why: "self_end",
      rw: "quiet",
      ql: false,
      qa: 40,
    });
  });

  it("AC-27f 조용함 두 번 잇달아면 다음 진짜의 dc 에는 뒤 조용함 버림의 값만 남는다(장면 7a)", () => {
    const log = runMachine(
      afterFirst(
        [
          { at: QUIET_AT, do: "quiet" },
          { at: QUIET_AT, do: "server-wait", on: true },
          { at: 17000, do: "server-wait", on: false },
          { at: 17000, do: "speak" },
          { at: 27000, do: "quiet" },
          { at: 27000, do: "server-wait", on: true },
          { at: 29000, do: "server-wait", on: false },
          { at: 29000, do: "speak" },
          { at: 40000, do: "press" },
        ],
        [{ as: 40 }, { as: 400 }, { as: 30 }, { as: 40 }],
        50000,
      ),
    );
    // 앞 조용함은 (ㄴ)(다시 연 버림 포함 두 번), 뒤 조용함은 (ㄱ)
    expect(starts(log).filter((t) => t >= QUIET_AT && t < 40000)).toEqual([
      QUIET_AT,
      QUIET_AT + T.liveAsMs + END_AFTER_STOP + T.openAfterMs,
      27000,
    ]);
    expect(notesOf(log)).toHaveLength(2);
    expect(lastNote(log)).toMatchObject({
      g: "reopen",
      rw: "quiet",
      ql: false,
      qa: 40,
    });
  });
});

describe("조용함 입구 — 층(AC-27f)", () => {
  it("AC-27f 층의 quiet() 는 대기(discard 갈래)에서 곧바로 버림을 열고, 선생님 말은 그 안에서 읽힌다", async () => {
    installSpeech(
      [realRun("apple"), lessonDiscard(40), lessonDiscard(40), realRun("pie")],
      [UNLOCK, line, line],
    );
    const t0 = performance.now();
    const trace: SpeechTraceEntry[] = [];
    const record = (e: SpeechTraceEntry) => trace.push({ ...e, at: e.at - t0 });
    const inner = createBrowserSpeech({ settings: speech, onTrace: record });
    const layer = discardLayerFor(inner, {
      discard,
      speech,
      verdict: inner.device(),
      fallbackLines: FALLBACK,
      onTrace: record,
    });
    if (layer === null) throw new Error("iPad 꼴인데 층이 없다");
    layer.port.unlockFromGesture();
    await settleWithin(layer.port.listen(RULE).outcome);
    layer.serverWait(true);
    await advance(discard.openAfterMs + 500);
    layer.serverWait(false);
    await settleWithin(layer.port.speak("Nice."));
    layer.soundEnd();
    await advance(8000);
    const before = trace.filter(
      (e) => e.kind === "discard-call" && e.call === "start",
    ).length;
    layer.quiet();
    const after = trace.filter(
      (e) => e.kind === "discard-call" && e.call === "start",
    ).length;
    expect(after).toBe(before + 1);
    layer.serverWait(true);
    await advance(1000);
    layer.serverWait(false);
    await settleWithin(layer.port.speak("What did you do?"));
    layer.soundEnd();
    await advance(3000);
    await settleWithin(layer.port.listen(RULE).outcome);
    const notes = trace.flatMap((e) =>
      e.kind === "discard-note" ? [e.dc] : [],
    );
    expect(notes.at(-1)).toMatchObject({
      g: "reopen",
      rw: "quiet",
      sr: false,
      ql: false,
      qa: 40,
    });
    layer.dispose();
  });
});

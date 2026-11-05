// 못 듣는 마이크 감지(iPad WebKit 326069 · 321436 꼴 — 분석 task-ipad-listen-analysis 5절 (c) 의 감지 절반 · 6.2 칸, 브리프 task-mic-1, 잠정 11-06).
// start 뒤 audiostart 가 speech.deaf_audiostart_ms 보다 빨리 오고 그 뒤 speech.deaf_silence_ms 안에 소리 · 결과가 없으면 '마이크 안 잡힘'(deaf)으로
// 끝낸다. deaf 는 아이의 말소리 없음이 아니라 셈의 일이 없다. 듣기 사건 요약은 o deaf 와 11-06 칸(pe · ss · rs · ts · te · hid)을 남긴다.
// 상태 기계는 순수 시험, 음성 접점은 가짜 Web Speech(fake-web-speech)와 가짜 시계로 돌린다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({}) }));
const saveFollowAlong = vi.hoisted(() =>
  vi.fn((_input: unknown) => Promise.resolve({})),
);
vi.mock("@/server/actions/conversation", () => ({
  saveLessonFollowAlong: saveFollowAlong,
}));
vi.mock("@/server/actions/session", () => ({}));

import {
  CHILD_TURN_TEXT,
  deafListenOf,
  deafStreakOf,
  silentListenOf,
} from "@/components/conversation/child-turn";
import {
  FOLLOW_TEXT,
  lessonFollowSaver,
  prepStepsOf,
  prepWithDone,
} from "@/components/conversation/follow-along";
import { parseTalkAttemptInput } from "@/core/conversation/attempt";
import {
  CLIENT_LISTEN_MS_MAX,
  type ClientListen,
  ClientListenEntrySchema,
  ClientListenSchema,
} from "@/core/conversation/client-listen";
import {
  talkEndRuleFor,
  talkSpeechSettingsFrom,
} from "@/core/conversation/listen";
import {
  speakingCounters,
  speakingCountersStart,
  speechEventOf,
} from "@/core/speaking/judge";
import {
  deafDetectsOn,
  deafRuleForDevice,
  type EndRule,
  isIosWebkit,
  type ListenInput,
  type ListenOutcome,
  type ListenStep,
  SPEECH_SETTING_KEYS,
  type SpeechSettings,
  speechSettingsFrom,
  startListen,
  stepListen,
} from "@/core/speech/listen";
import { parseSpeechScript, type RecognitionRun } from "@/core/speech/script";
import { createBrowserSpeech } from "@/lib/speech/browser";
import { installFakeWebSpeech } from "@/lib/speech/fake-web-speech";
import { clampListenMs, createListenLog } from "@/lib/speech/listen-log";
import type { SpeechTraceEntry } from "@/lib/speech/types";
import type { PrepWordView, TalkLessonPrep } from "@/server/conversation";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const read = (key: string) => values[key];
const speech = speechSettingsFrom(read);
const talkSpeech = talkSpeechSettingsFrom(read);
/** 1단계 대화 듣기 규칙(회화 — 못 듣는 마이크 감지가 켜짐). */
const RULE = talkEndRuleFor({ level: 1, mode: "dialogue" }, speech, talkSpeech);
const DEAF_AUDIOSTART_MS = values["speech.deaf_audiostart_ms"] as number;
const DEAF_SILENCE_MS = values["speech.deaf_silence_ms"] as number;
/** 분석 표 A 의 실패 듣기 · 성공 듣기 audiostart(ms). */
const FAST_AS = 41;
const SLOW_AS = 297;

// ── 상태 기계(순수) ──

function run(rule: EndRule, inputs: ListenInput[]): ListenStep {
  let step = startListen(rule, speech, 0);
  for (const input of inputs) {
    // 기한이 지난 timer 를 넣는 것은 부르는 쪽(browser.ts scheduleWake) 몫 — 여기서는 넣는 일 앞에 기한을 깨운다
    while (step.wakeAt !== undefined && step.wakeAt <= input.now) {
      step = stepListen(step.state, { type: "timer", now: step.wakeAt });
      if (step.state.phase === "done") return step;
    }
    step = stepListen(step.state, input);
    if (step.state.phase === "done") return step;
  }
  while (step.wakeAt !== undefined && step.state.phase !== "done")
    step = stepListen(step.state, { type: "timer", now: step.wakeAt });
  return step;
}

function outcomeOf(step: ListenStep): ListenOutcome | undefined {
  for (const e of step.effects) if (e.type === "done") return e.outcome;
  return undefined;
}

describe("못 듣는 마이크 감지 — 상태 기계(잠정 11-06)", () => {
  it("회화 듣기 규칙은 speech.deaf_* 를 싣는다(설정 키 셋은 서버가 읽는 음성 키 목록에 든다)", () => {
    expect(RULE.deaf).toEqual({
      audiostartMs: DEAF_AUDIOSTART_MS,
      silenceMs: DEAF_SILENCE_MS,
      retryMax: values["speech.deaf_retry_max"],
    });
    for (const key of [
      "speech.deaf_audiostart_ms",
      "speech.deaf_silence_ms",
      "speech.deaf_retry_max",
      "speech.deaf_detect",
    ])
      expect(SPEECH_SETTING_KEYS).toContain(key);
    expect(() =>
      speechSettingsFrom((key) =>
        key === "speech.deaf_silence_ms" ? undefined : read(key),
      ),
    ).toThrow("speech.deaf_silence_ms");
  });

  it(`audiostart ${FAST_AS}ms · 소리 없음이면 speech.deaf_silence_ms 뒤 객체를 abort 하고 deaf 로 끝난다`, () => {
    const step = run(RULE, [{ type: "audio", now: FAST_AS, recognizer: 1 }]);
    expect(outcomeOf(step)).toEqual({
      kind: "deaf",
      audiostartMs: FAST_AS,
      retries: 0,
    });
    expect(step.effects).toContainEqual({
      type: "abort-recognizer",
      recognizer: 1,
    });
  });

  it(`audiostart ${SLOW_AS}ms 이고 소리 · 결과가 있으면 들음(result)이다`, () => {
    const step = run(RULE, [
      { type: "audio", now: SLOW_AS, recognizer: 1 },
      { type: "sound", now: 400, recognizer: 1 },
      { type: "result", now: 600, recognizer: 1, text: "I'm good" },
    ]);
    // 끝 조용함 뒤 stop → end
    const ended = stepListen(step.state, {
      type: "end",
      now: (step.wakeAt ?? 0) + 10,
      recognizer: 1,
    });
    expect(outcomeOf(step) ?? outcomeOf(ended)).toMatchObject({
      kind: "result",
      text: "I'm good",
    });
  });

  it(`audiostart ${FAST_AS}ms 뒤라도 기한 안에 결과가 오면 들음(result)이다`, () => {
    const step = run(RULE, [
      { type: "audio", now: FAST_AS, recognizer: 1 },
      { type: "result", now: 300, recognizer: 1, text: "Yes" },
    ]);
    const ended = stepListen(step.state, {
      type: "end",
      now: (step.wakeAt ?? 0) + 10,
      recognizer: 1,
    });
    expect(outcomeOf(step) ?? outcomeOf(ended)).toMatchObject({
      kind: "result",
      text: "Yes",
    });
  });

  it("의심 중에 말하기를 눌러 iPad 의 aborted('No speech detected' → no-speech)로 끝나도 deaf 다", () => {
    let step = startListen(RULE, speech, 0);
    step = stepListen(step.state, {
      type: "audio",
      now: FAST_AS,
      recognizer: 1,
    });
    step = stepListen(step.state, { type: "button", now: 800 });
    step = stepListen(step.state, {
      type: "error",
      now: 810,
      recognizer: 1,
      code: "no-speech",
    });
    expect(outcomeOf(step)).toEqual({
      kind: "deaf",
      audiostartMs: FAST_AS,
      retries: 0,
    });
  });

  it("deaf 규칙이 없는 듣기(말하기 · 배치)는 빠른 audiostart 도 그대로 말소리 없음이다", () => {
    const plain: EndRule = {
      endSilenceMs: RULE.endSilenceMs ?? 0,
      capMs: speech.maxListenMs,
      chunkMs: speech.maxListenMs,
    };
    let step = startListen(plain, speech, 0);
    step = stepListen(step.state, {
      type: "audio",
      now: FAST_AS,
      recognizer: 1,
    });
    expect(step.state.deafAt).toBeUndefined();
    step = stepListen(step.state, { type: "button", now: 800 });
    step = stepListen(step.state, {
      type: "error",
      now: 810,
      recognizer: 1,
      code: "no-speech",
    });
    expect(outcomeOf(step)).toMatchObject({ kind: "error", code: "no-speech" });
  });

  it("speech.deaf_retry_max 가 1 이면 첫 기한에 옛 객체를 abort 하고 조용히 새 객체를 열고, 새 객체도 못 들으면 deaf(retries 1)", () => {
    const rule: EndRule = {
      ...RULE,
      deaf: {
        audiostartMs: DEAF_AUDIOSTART_MS,
        silenceMs: DEAF_SILENCE_MS,
        retryMax: 1,
      },
    };
    let step = startListen(rule, speech, 0);
    step = stepListen(step.state, {
      type: "audio",
      now: FAST_AS,
      recognizer: 1,
    });
    step = stepListen(step.state, {
      type: "timer",
      now: FAST_AS + DEAF_SILENCE_MS,
    });
    expect(step.effects).toEqual([
      { type: "abort-recognizer", recognizer: 1 },
      { type: "start-recognizer", recognizer: 2 },
    ]);
    const reopenedAt = FAST_AS + DEAF_SILENCE_MS;
    // 옛 객체의 늦은 일은 버린다
    step = stepListen(step.state, {
      type: "audio",
      now: reopenedAt + 5,
      recognizer: 1,
    });
    expect(step.state.deafAt).toBeUndefined();
    step = stepListen(step.state, {
      type: "audio",
      now: reopenedAt + 30,
      recognizer: 2,
    });
    step = stepListen(step.state, {
      type: "timer",
      now: reopenedAt + 30 + DEAF_SILENCE_MS,
    });
    expect(outcomeOf(step)).toEqual({
      kind: "deaf",
      audiostartMs: 30,
      retries: 1,
    });
  });
});

describe("마이크 안 잡힘은 아이의 말소리 없음으로 세지 않는다", () => {
  const deaf: ListenOutcome = {
    kind: "deaf",
    audiostartMs: FAST_AS,
    retries: 0,
  };

  it("셈의 일이 없다(speechEventOf 없음) — 같은 질문 말소리 없음 셈 · 틀의 실패 셈 · 쪽지 건너뜀 셈이 오르지 않는다", () => {
    expect(deafListenOf(deaf)).toBe(true);
    expect(speechEventOf(deaf)).toBeUndefined();
    // 같은 질문 셈은 no-speech 오류의 일만 센다 — deaf 는 일이 없으니 오르지 않는다
    const noSpeech = speechEventOf({
      kind: "error",
      code: "no-speech",
      group: "retry",
      partialText: "",
    });
    expect(noSpeech && silentListenOf(noSpeech)).toBe(true);
    expect(deafListenOf({ kind: "no-result" })).toBe(false);
    // 틀 셈은 일을 받을 때만 바뀐다(no-speech 는 활동 실패를 올림 — deaf 는 넣지 않음)
    const limits = {
      maxRetries: values["speech.max_retries"] as number,
      silentItemsMax: values["speech.silent_items_max"] as number,
    };
    const start = speakingCountersStart();
    if (!noSpeech) throw new Error("no-speech 일");
    expect(
      speakingCounters(start, noSpeech, limits).state.activityFailures,
    ).toBe(1);
  });

  it("문구는 해요체 한 줄이고 대화 차례 · 쪽지 · 정리가 같은 줄을 쓴다('못 들었어요'가 아님)", () => {
    expect(CHILD_TURN_TEXT.micDeaf).toBe(
      "마이크가 안 잡혔어요. 한 번 더 눌러 주세요",
    );
    expect(FOLLOW_TEXT.micDeaf).toBe(CHILD_TURN_TEXT.micDeaf);
    expect(CHILD_TURN_TEXT.micDeaf).not.toContain(CHILD_TURN_TEXT.notHeard);
  });
});

// ── 음성 접점 + 가짜 Web Speech + 듣기 사건 요약 ──

const speechWith = (patch: Partial<SpeechSettings>): SpeechSettings => ({
  ...speech,
  ...patch,
});

/** 기기 꼴(UA · 터치 점). describeDevice 가 이름을 만든다(client_listen 의 br 과 같은 판별). */
type DeviceLike = { userAgent: string; maxTouchPoints: number };
/** iPad Safari(Playwright iPad 꼴 UA). */
const IPAD: DeviceLike = {
  userAgent:
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
  maxTouchPoints: 5,
};
/** iPadOS 13+ 의 데스크톱 꼴 UA(Macintosh) — 터치 점으로 iPad 가 된다. */
const IPAD_DESKTOP_UA: DeviceLike = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15",
  maxTouchPoints: 5,
};
/** 데스크톱 크롬(macOS — audiostart 가 늘 빠르다). */
const DESKTOP_CHROME: DeviceLike = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  maxTouchPoints: 0,
};
/** 데스크톱 크롬에서 흔한 빠른 audiostart(ms). */
const DESKTOP_AS = 50;

function install(runs: RecognitionRun[], device: DeviceLike = IPAD) {
  vi.stubGlobal("navigator", device);
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("document", {
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  installFakeWebSpeech(
    parseSpeechScript({
      name: "mic-deaf",
      source: "손으로 씀 — 못 듣는 마이크 시험(분석 표 A 꼴)",
      expose: { recognition: "webkit", synthesis: false },
      recognitions: runs,
    }),
  );
}

/** 끝 조용함으로 끝나는 들음. */
function heardRun(audioAt: number, text: string): RecognitionRun {
  return {
    events: [
      { at: 10, type: "start" },
      { at: audioAt, type: "audiostart" },
      { at: 400, type: "speechstart" },
      {
        at: 600,
        type: "result",
        results: [{ transcript: text, isFinal: true }],
      },
    ],
    onStop: [{ at: 20, type: "end" }],
  };
}

/** iPad 못 듣는 꼴: audiostart 만 빨리 오고 소리 · 결과가 없다. */
function deafRun(audioAt: number): RecognitionRun {
  return {
    events: [
      { at: 10, type: "start" },
      { at: audioAt, type: "audiostart" },
    ],
    onStop: [
      {
        at: 10,
        type: "error",
        error: "aborted",
        message: "No speech detected",
      },
      { at: 20, type: "end" },
    ],
  };
}

async function listenOnce(
  runs: RecognitionRun[],
  settings: SpeechSettings = speech,
  device: DeviceLike = IPAD,
) {
  install(runs, device);
  const log = createListenLog();
  const port = createBrowserSpeech({
    settings,
    onTrace: (entry) => log.record(entry),
  });
  const rule = talkEndRuleFor(
    { level: 1, mode: "dialogue" },
    settings,
    talkSpeech,
  );
  const handle = port.listen(rule);
  await vi.advanceTimersByTimeAsync(speech.maxListenMs * 2);
  const outcome = await handle.outcome;
  port.dispose();
  return { outcome, listens: log.take() };
}

describe("못 듣는 마이크 — 음성 접점 · 가짜 Web Speech · 듣기 사건 요약", () => {
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

  it(`audiostart ${FAST_AS}ms · 소리 없음 → deaf, 요약 o deaf · as ${FAST_AS} · snd 거짓 · ss 없음`, async () => {
    const { outcome, listens } = await listenOnce([deafRun(FAST_AS)]);
    expect(outcome).toEqual({
      kind: "deaf",
      audiostartMs: FAST_AS,
      retries: 0,
    });
    expect(listens).toHaveLength(1);
    const [s] = listens;
    // 듣기 길이는 audiostart + speech.deaf_silence_ms(일 넣기 setTimeout 0 의 틈만큼 늦을 수 있다)
    expect(s?.d).toBeGreaterThanOrEqual(FAST_AS + DEAF_SILENCE_MS);
    expect(s?.d).toBeLessThan(FAST_AS + DEAF_SILENCE_MS + 10);
    expect(s).toMatchObject({
      o: "deaf",
      as: FAST_AS,
      snd: false,
      rs: 0,
      hid: false,
    });
    expect(s).not.toHaveProperty("ss");
    expect(s).not.toHaveProperty("by");
    expect(ClientListenEntrySchema.safeParse(s).success).toBe(true);
  });

  it(`audiostart ${SLOW_AS}ms · 소리 있음 → result, 요약 o result · ss 400`, async () => {
    const { outcome, listens } = await listenOnce([
      heardRun(SLOW_AS, "I'm good"),
    ]);
    expect(outcome).toMatchObject({ kind: "result", text: "I'm good" });
    expect(listens[0]).toMatchObject({
      o: "result",
      as: SLOW_AS,
      snd: true,
      ss: 400,
      rs: 0,
    });
  });

  it(`audiostart ${FAST_AS}ms 뒤 결과가 오면 result 다`, async () => {
    const { outcome, listens } = await listenOnce([heardRun(FAST_AS, "Yes")]);
    expect(outcome).toMatchObject({ kind: "result", text: "Yes" });
    expect(listens[0]).toMatchObject({ o: "result", as: FAST_AS, snd: true });
  });

  it("speech.deaf_retry_max 1: 첫 객체가 못 들으면 조용히 새 객체를 열고, 그 객체가 들으면 result(rs 1 · 앞 객체 end 뒤 pe)", async () => {
    const { outcome, listens } = await listenOnce(
      [deafRun(FAST_AS), heardRun(SLOW_AS, "I'm good")],
      speechWith({ deafRetryMax: 1 }),
    );
    expect(outcome).toMatchObject({ kind: "result", text: "I'm good" });
    expect(listens[0]).toMatchObject({ o: "result", rs: 1, snd: true });
    expect(ClientListenEntrySchema.safeParse(listens[0]).success).toBe(true);
  });

  // ── 감지를 켤 기기(speech.deaf_detect — fix 1) ──

  it(`speech.deaf_detect ios: 데스크톱 크롬은 audiostart ${DESKTOP_AS}ms + 침묵이어도 deaf 가 아니라 지금 흐름(상한 뒤 말소리 없음 — 같은 질문 셈에 듦)이다`, async () => {
    expect(speech.deafDetect).toBe("ios");
    const { outcome, listens } = await listenOnce(
      [deafRun(DESKTOP_AS)],
      speech,
      DESKTOP_CHROME,
    );
    expect(outcome).toMatchObject({ kind: "error", code: "no-speech" });
    const event = speechEventOf(outcome);
    expect(event && silentListenOf(event)).toBe(true);
    expect(listens[0]).toMatchObject({
      o: "error:no-speech",
      as: DESKTOP_AS,
      snd: false,
    });
    // 의심 기한(audiostart + speech.deaf_silence_ms)보다 훨씬 뒤 상한에서 끝난다
    expect(listens[0]?.d).toBeGreaterThanOrEqual(speech.maxListenMs);
  });

  it(`speech.deaf_detect ios: iPadOS 의 데스크톱 꼴 UA(터치 점)도 iPad 라 audiostart ${FAST_AS}ms + 침묵이면 deaf`, async () => {
    const { outcome } = await listenOnce(
      [deafRun(FAST_AS)],
      speech,
      IPAD_DESKTOP_UA,
    );
    expect(outcome).toMatchObject({ kind: "deaf", audiostartMs: FAST_AS });
  });

  it(`speech.deaf_detect all: 데스크톱 크롬도 audiostart ${DESKTOP_AS}ms + 침묵이면 deaf`, async () => {
    const { outcome } = await listenOnce(
      [deafRun(DESKTOP_AS)],
      speechWith({ deafDetect: "all" }),
      DESKTOP_CHROME,
    );
    expect(outcome).toMatchObject({ kind: "deaf", audiostartMs: DESKTOP_AS });
  });

  it(`speech.deaf_detect off: iPad 도 audiostart ${FAST_AS}ms + 침묵이 지금 흐름(말소리 없음)이다`, async () => {
    const { outcome } = await listenOnce(
      [deafRun(FAST_AS)],
      speechWith({ deafDetect: "off" }),
      IPAD,
    );
    expect(outcome).toMatchObject({ kind: "error", code: "no-speech" });
  });
});

describe("감지를 켤 기기(speech.deaf_detect, 순수 — fix 1)", () => {
  it("iOS · iPadOS WebKit 은 기기 판정 이름 iPad · iPhone 으로 가르고(브라우저가 크롬이어도 WebKit), 그 밖은 아니다", () => {
    for (const name of [
      "iPad Safari 27.0",
      "iPad Chrome 143",
      "iPhone Safari 27.0",
    ])
      expect(isIosWebkit({ name })).toBe(true);
    for (const name of [
      "macOS Chrome 143",
      "Windows Edge 143",
      "Android Chrome 143",
      "iPadless",
    ])
      expect(isIosWebkit({ name })).toBe(false);
  });

  it("ios 면 iOS 기기에서만 규칙의 deaf 를 남기고, all 은 늘 · off 는 늘 뺀다(다른 칸은 그대로)", () => {
    const ipad = { name: "iPad Safari 27.0" };
    const desktop = { name: "macOS Chrome 143" };
    const { deaf: _deaf, ...plain } = RULE;
    expect(deafRuleForDevice(RULE, "ios", ipad)).toBe(RULE);
    expect(deafRuleForDevice(RULE, "ios", desktop)).toEqual(plain);
    expect(deafRuleForDevice(RULE, "all", desktop)).toBe(RULE);
    expect(deafRuleForDevice(RULE, "off", ipad)).toEqual(plain);
    expect(deafDetectsOn("off", ipad)).toBe(false);
    // 감지가 없는 규칙(말하기 · 배치)은 그대로
    expect(deafRuleForDevice(plain, "all", ipad)).toBe(plain);
  });

  it("speech.deaf_detect 는 ios · all · off 밖의 값을 받지 않는다", () => {
    expect(() =>
      speechSettingsFrom((key) =>
        key === "speech.deaf_detect" ? "android" : read(key),
      ),
    ).toThrow("speech.deaf_detect");
  });
});

describe("짧은 준비 쪽지 — 막힘 뒤 막힌 그 낱말부터(7절 32줄 · e2e 분류 N1)", () => {
  const word = (w: string): PrepWordView => ({
    word: w,
    meaningKo: "뜻",
    example: "",
    modelLine: `A ${w}.`,
    source: "word",
  });
  const prep: TalkLessonPrep = {
    place: "greeting",
    words: ["cat", "dog", "fish"].map(word),
    done: [],
  };

  it("끝낸 낱말을 done 에 더하면 다시 그린 쪽지의 남은 차례가 그 뒤 낱말부터다(같은 낱말은 한 번만)", () => {
    expect(prepStepsOf(prep)).toEqual([0, 1, 2]);
    const once = prepWithDone(prep, 0);
    expect(prepStepsOf(once)).toEqual([1, 2]);
    expect(prepWithDone(once, 0)).toBe(once);
    expect(prepStepsOf(prepWithDone(once, 1))).toEqual([2]);
    // 원래 상태는 바꾸지 않는다
    expect(prep.done).toEqual([]);
  });
});

// ── fix 2: 상한 자르기(검토 rev-mic-1 I-1) · 이어진 마이크 안 잡힘 건너뜀(I-2 · 13절 C210 보완) · 칸 단언(M-3) ──

const RECOGNIZER_END = (at: number, listen: number): SpeechTraceEntry => ({
  at,
  kind: "recognizer-event",
  listen,
  recognizer: 1,
  event: { type: "end" },
});
/** 듣기 하나(시작 · start 호출 · 끝)의 기록 사건. */
function oneListen(
  listen: number,
  at: number,
  doneAt: number,
  synth?: "speaking" | "pending" | "idle",
): SpeechTraceEntry[] {
  return [
    { at, kind: "listen-begin", listen, rule: RULE },
    {
      at,
      kind: "recognizer-call",
      listen,
      recognizer: 1,
      call: "start",
      ...(synth ? { synth } : {}),
    },
    {
      at: doneAt,
      kind: "listen-done",
      listen,
      outcome: { kind: "no-result" },
    },
  ];
}
const ELEVEN_MINUTES = 11 * 60 * 1000;

describe("fix 2 — 기록 칸 상한(I-1)", () => {
  it("11분 쉰 뒤 듣기의 pe · tc 는 서버 꼴 상한(CLIENT_LISTEN_MS_MAX)으로 잘려 그 값 그대로 남고 Zod 를 지난다", () => {
    const log = createListenLog();
    const entries: SpeechTraceEntry[] = [
      ...oneListen(1, 0, 1000),
      RECOGNIZER_END(1010, 1),
      { at: 2000, kind: "speak", text: "How are you?", voice: undefined },
      { at: 2010, kind: "speak-event", type: "start" },
      { at: 3000, kind: "speak-event", type: "end" },
      ...oneListen(2, 3000 + ELEVEN_MINUTES, 3000 + ELEVEN_MINUTES + 500),
    ];
    for (const e of entries) log.record(e);
    const [, late] = log.take();
    expect(late).toMatchObject({
      pe: CLIENT_LISTEN_MS_MAX,
      tc: CLIENT_LISTEN_MS_MAX,
      te: "end",
    });
    expect(ClientListenEntrySchema.safeParse(late).success).toBe(true);
    const body: ClientListen = {
      br: "iPad Safari 27.0",
      r3d: false,
      listens: late ? [late] : [],
      mf: 0,
    };
    expect(ClientListenSchema.safeParse(body).success).toBe(true);
    // 자르기 함수: 반올림 · 0 아래 · 상한 위
    expect(clampListenMs(12.6)).toBe(13);
    expect(clampListenMs(-5)).toBe(0);
    expect(clampListenMs(ELEVEN_MINUTES)).toBe(CLIENT_LISTEN_MS_MAX);
  });

  it("M-3 start 호출 때 읽어 주기 상태는 ts, 앞 듣기 뒤 쪽이 숨었으면 hid 참(그 뒤 듣기는 다시 거짓)", () => {
    const log = createListenLog();
    const entries: SpeechTraceEntry[] = [
      ...oneListen(1, 0, 500, "speaking"),
      { at: 800, kind: "page-hidden" },
      ...oneListen(2, 1000, 1500, "idle"),
      ...oneListen(3, 2000, 2500),
    ];
    for (const e of entries) log.record(e);
    const [a, b, c] = log.take();
    expect(a).toMatchObject({ ts: "speaking", hid: false });
    expect(b).toMatchObject({ ts: "idle", hid: true });
    expect(c).toMatchObject({ hid: false });
    expect(c).not.toHaveProperty("ts");
  });
});

describe("fix 2 — 이어진 마이크 안 잡힘은 기술 사유로 건너뛴다(I-2 · C210 보완)", () => {
  const SKIP_AFTER = values["speech.deaf_skip_after"] as number;

  it("speech.deaf_skip_after 는 서버가 읽는 음성 키에 들고 1 이상만 받는다", () => {
    expect(SPEECH_SETTING_KEYS).toContain("speech.deaf_skip_after");
    expect(speech.deafSkipAfter).toBe(SKIP_AFTER);
    expect(() =>
      speechSettingsFrom((key) =>
        key === "speech.deaf_skip_after" ? 0 : read(key),
      ),
    ).toThrow("speech.deaf_skip_after");
  });

  it("같은 자리에서 마이크 안 잡힘이 이어진 수가 문턱에 닿으면 over 이고, 다른 결과가 끼면 0 부터 다시 센다", () => {
    let streak = 0;
    const overs: boolean[] = [];
    for (let i = 0; i < SKIP_AFTER; i++) {
      const step = deafStreakOf(streak, true, SKIP_AFTER);
      streak = step.streak;
      overs.push(step.over);
    }
    expect(overs).toEqual([
      ...Array.from({ length: SKIP_AFTER - 1 }, () => false),
      true,
    ]);
    expect(deafStreakOf(SKIP_AFTER - 1, false, SKIP_AFTER)).toEqual({
      streak: 0,
      over: false,
    });
    expect(deafStreakOf(0, true, SKIP_AFTER).over).toBe(SKIP_AFTER === 1);
  });

  it("쪽지에서 마이크 안 잡힘 셋 뒤: 셈의 일은 하나도 없고(틀 셈 불변) 실패 수 0 그대로, 저장에는 기술 사유 mic_deaf 가 남는다", () => {
    saveFollowAlong.mockClear();
    const deaf: ListenOutcome = {
      kind: "deaf",
      audiostartMs: FAST_AS,
      retries: 0,
    };
    // 쪽지 카드(PrepCard)가 하는 일을 순수 조각으로 되밟는다: 듣기마다 셈의 일 · 이어진 수
    const counters = speakingCountersStart();
    const tried = { heard: [] as string[], failures: 0 };
    let streak = 0;
    let over = false;
    for (let i = 0; i < SKIP_AFTER; i++) {
      expect(speechEventOf(deaf)).toBeUndefined();
      ({ streak, over } = deafStreakOf(streak, deafListenOf(deaf), SKIP_AFTER));
    }
    expect(over).toBe(true);
    expect(speakingCountersStart()).toEqual(counters);
    const save = lessonFollowSaver({
      sessionId: "00000000-0000-4000-8000-000000000001",
      clientListen: () => ({
        br: "iPad Safari 27.0",
        r3d: false,
        listens: [],
        mf: 0,
      }),
    });
    save(
      {
        segment: "prep",
        round: 0,
        index: 1,
        target: "A dog.",
        place: "greeting",
      },
      tried,
      "mic_deaf",
    );
    expect(saveFollowAlong).toHaveBeenCalledTimes(1);
    expect(saveFollowAlong.mock.calls[0]?.[0]).toMatchObject({
      segment: "prep",
      index: 1,
      failures: 0,
      heard: [],
      skipped: "mic_deaf",
    });
    // 시도 기록 꼴이 사유를 받는다(옛 사유도 그대로)
    const attempt = {
      v: 1,
      kind: "talk-prep",
      step: "final",
      target: "A dog.",
      heard: [],
      failures: 0,
      skipped: "mic_deaf",
      index: 1,
      word: "dog",
      place: "greeting",
    };
    expect(parseTalkAttemptInput(attempt)).toMatchObject({
      skipped: "mic_deaf",
    });
    expect(
      parseTalkAttemptInput({ ...attempt, skipped: "recognition" }),
    ).toBeDefined();
  });

  it("안내는 해요체 한 줄이고 쪽지 · 정리는 넘어감을, 넘어가지 않는 대화 차례는 '잘 모르겠어요'를 안내한다(fix 3)", () => {
    expect(CHILD_TURN_TEXT.micDeafSkip).toBe(
      "마이크가 계속 안 잡혀서 다음으로 넘어가요",
    );
    expect(FOLLOW_TEXT.micDeafSkip).toBe(CHILD_TURN_TEXT.micDeafSkip);
    expect(CHILD_TURN_TEXT.micDeafStuck).toBe(
      "마이크가 계속 안 잡혀요. '잘 모르겠어요'를 눌러 넘어가 주세요",
    );
    expect(CHILD_TURN_TEXT.micDeafStuck).toContain(CHILD_TURN_TEXT.dontKnow);
  });
});

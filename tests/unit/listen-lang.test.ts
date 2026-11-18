// 한국어로 묻기 묶음 3 — 음성 층의 듣기 언어(수업 안 한국어로 묻기 spec 판 3 설계 3 · plan 정한 것 1 · 2 · 접점 나).
// 끝 규칙의 선택 칸 lang 이 진짜 듣기의 인식 객체에만 들어가고(버림 · 마이크 확인은 speech.lang), 오류 갈래 함수가 '다른 언어로 여는
// 듣기'의 service-not-allowed · language-not-supported 만 '그 언어만 안 됨'으로 가른다. lang 이 없는 듣기는 글자까지 지금 그대로다.
// 듣기 요약의 언어 칸 lg 는 lang 이 있는 듣기에만 있고 글은 없다(AC-N27).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));

import {
  ClientListenEntrySchema,
  LISTEN_LANG_PATTERN,
} from "@/core/conversation/client-listen";
import { koAskEndRuleOf, talkEndRuleFor } from "@/core/conversation/listen";
import { DISCARD_REOPEN_WHYS } from "@/core/speech/discard";
import {
  classifyRecognitionError,
  DICTATION_DISABLED_CODE,
  type EndRule,
  type ListenOutcome,
  NO_SPEECH_CODE,
  START_FAILED_CODE,
  speechSettingsFrom,
  startListen,
  stepListen,
} from "@/core/speech/listen";
import {
  endRuleSchema,
  listenOutcomeSchema,
  parseSpeechScript,
  type RecognitionRun,
} from "@/core/speech/script";
import { createBrowserSpeech } from "@/lib/speech/browser";
import { realEndOf } from "@/lib/speech/discard-layer";
import {
  type FakeSpeechRecord,
  installFakeWebSpeech,
} from "@/lib/speech/fake-web-speech";
import { createListenLog } from "@/lib/speech/listen-log";
import type { SpeechTraceEntry } from "@/lib/speech/types";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const speech = speechSettingsFrom((key) => values[key]);
/** 한국어 질문 듣기의 언어(speech.lang_ko 의 시드 값 — 키는 묶음 4-가 몫이라 여기서는 값만 쓴다). */
const KO = "ko-KR";
const EN_RULE: EndRule = { endSilenceMs: 1000, capMs: 15_000, chunkMs: 15_000 };
const KO_RULE: EndRule = { ...EN_RULE, lang: KO };
/** 한국어 인식 글(어디에도 남으면 안 된다). */
const KO_TEXT = "사과는 영어로 뭐야";

const LANG_ONLY_CODES = ["service-not-allowed", "language-not-supported"];

describe("오류 갈래 — 두 언어(spec 설계 3 표 · plan 정한 것 2)", () => {
  it("AC-25f (가) 다른 언어 듣기의 service-not-allowed · language-not-supported 는 '그 언어만 안 됨', 영어 듣기의 같은 코드는 '마이크를 쓸 수 없음'이다", () => {
    for (const code of LANG_ONLY_CODES) {
      expect(classifyRecognitionError(code, true), code).toBe(
        "lang-unavailable",
      );
      expect(classifyRecognitionError(code, false), code).toBe(
        "mic-unavailable",
      );
      expect(classifyRecognitionError(code), code).toBe("mic-unavailable");
    }
  });

  it("AC-25f (가) not-allowed · 받아쓰기 꺼짐은 두 언어 모두 '마이크를 쓸 수 없음', network 와 다시 듣는 오류는 두 언어가 같다", () => {
    for (const other of [true, false]) {
      expect(classifyRecognitionError("not-allowed", other)).toBe(
        "mic-unavailable",
      );
      expect(classifyRecognitionError(DICTATION_DISABLED_CODE, other)).toBe(
        "mic-unavailable",
      );
      expect(classifyRecognitionError("network", other)).toBe("network");
      for (const code of [NO_SPEECH_CODE, "aborted", START_FAILED_CODE, "x"])
        expect(classifyRecognitionError(code, other), code).toBe("retry");
    }
  });

  it("AC-25f (가) 듣기 기계는 규칙에 lang 이 있는 듣기의 오류만 '그 언어만 안 됨'으로 끝내고, 효과 차례는 두 언어가 같다", () => {
    const run = (rule: EndRule, code: string) => {
      const begin = startListen(rule, speech, 0);
      const step = stepListen(begin.state, {
        type: "error",
        now: 200,
        recognizer: 1,
        code,
      });
      return { begin: begin.effects, effects: step.effects };
    };
    for (const code of LANG_ONLY_CODES) {
      const en = run(EN_RULE, code);
      const ko = run(KO_RULE, code);
      expect(en.begin).toEqual(ko.begin);
      expect(en.effects).toEqual([
        {
          type: "done",
          outcome: {
            kind: "error",
            code,
            group: "mic-unavailable",
            partialText: "",
          },
        },
      ]);
      expect(ko.effects).toEqual([
        {
          type: "done",
          outcome: {
            kind: "error",
            code,
            group: "lang-unavailable",
            partialText: "",
          },
        },
      ]);
    }
    expect(run(KO_RULE, "not-allowed").effects).toEqual(
      run(EN_RULE, "not-allowed").effects,
    );
  });

  it("AC-25f (가) 버리는 듣기 층은 '그 언어만 안 됨'을 기계의 '마이크를 쓸 수 없음' 끝으로 옮기고 다시 연 까닭에 no_lang 을 싣는다", () => {
    const err = (group: "mic-unavailable" | "lang-unavailable") =>
      realEndOf(
        { kind: "error", code: "service-not-allowed", group, partialText: "" },
        undefined,
      );
    expect(err("lang-unavailable")).toEqual({
      type: "real-end",
      kind: "unavailable",
      why: "no_lang",
    });
    // 영어 듣기의 '마이크를 쓸 수 없음'은 지금 꼴 그대로(까닭 칸 없음 — 기계가 no_mic 을 적는다)
    expect(err("mic-unavailable")).toEqual({
      type: "real-end",
      kind: "unavailable",
    });
    expect(DISCARD_REOPEN_WHYS).toContain("no_lang");
    expect(DISCARD_REOPEN_WHYS.indexOf("no_lang")).toBe(
      DISCARD_REOPEN_WHYS.length - 1,
    );
  });

  it("AC-25f (가) 대본 규격은 끝 규칙의 lang 과 결과 갈래 lang-unavailable 을 받는다", () => {
    expect(endRuleSchema.parse(KO_RULE)).toEqual(KO_RULE);
    expect(endRuleSchema.parse(EN_RULE)).toEqual(EN_RULE);
    const outcome: ListenOutcome = {
      kind: "error",
      code: "language-not-supported",
      group: "lang-unavailable",
      partialText: "",
    };
    expect(listenOutcomeSchema.parse(outcome)).toEqual(outcome);
  });
});

describe("한국어 질문 끝 규칙(spec 설계 3 '끝 규칙' · 접점 나)", () => {
  it("AC-25d 한국어 질문 끝 규칙은 한 문장 답 꼴이고 상한은 speech.max_listen_seconds, 마이크 안 잡힘 감지와 듣기 언어를 싣는다", () => {
    const rule = koAskEndRuleOf(speech, { endSilenceMs: 2500, lang: KO });
    expect(rule).toEqual({
      endSilenceMs: 2500,
      capMs: speech.maxListenMs,
      chunkMs: speech.maxListenMs,
      deaf: {
        audiostartMs: speech.deafAudiostartMs,
        silenceMs: speech.deafSilenceMs,
        retryMax: speech.deafRetryMax,
      },
      lang: KO,
    });
    expect(endRuleSchema.parse(rule)).toEqual(rule);
    expect(() =>
      koAskEndRuleOf(speech, { endSilenceMs: 0, lang: KO }),
    ).toThrow();
    expect(() =>
      koAskEndRuleOf(speech, { endSilenceMs: 2500, lang: "" }),
    ).toThrow();
  });

  it("AC-25d 회화 영어 듣기 끝 규칙에는 lang 칸이 없다(지금 꼴 그대로)", () => {
    const talk = {
      endSilenceMs: {
        "1-3": 3000,
        "4-6": 3000,
        "7-9": 3000,
        "10-12": 3000,
      },
      longSilenceMs: 4000,
      maxAnswerMs: 40_000,
    };
    for (const level of [1, 3, 8, 12])
      for (const mode of ["dialogue", "follow", "test"] as const)
        expect(
          Object.keys(talkEndRuleFor({ level, mode }, speech, talk)),
        ).not.toContain("lang");
  });
});

// ── 음성 접점(browser.ts) — 가짜 Web Speech ──

const IPAD = {
  userAgent:
    "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
  maxTouchPoints: 5,
};

function install(runs: RecognitionRun[]) {
  vi.stubGlobal("navigator", IPAD);
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("document", {
    hidden: false,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  installFakeWebSpeech(
    parseSpeechScript({
      name: "listen-lang",
      source: "손으로 씀 — 한국어로 묻기 묶음 3 듣기 언어 시험",
      recognitions: runs,
      synthesis: {
        voices: [
          {
            name: "Samantha",
            lang: "en-US",
            localService: true,
            default: true,
          },
        ],
      },
    }),
  );
}

const fake = () =>
  (globalThis as unknown as { __fakeSpeech: FakeSpeechRecord }).__fakeSpeech;

/** 말소리 · 결과 뒤 끝 조용함으로 끝나는 진짜. */
function realRun(text: string): RecognitionRun {
  return {
    events: [
      { at: 10, type: "start" },
      { at: 300, type: "audiostart" },
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

/** audiostart 가 빨리 오고 소리가 없는 객체(마이크 안 잡힘 의심 — 조용히 다시 연다). */
const deafRun: RecognitionRun = {
  events: [
    { at: 5, type: "start" },
    { at: 10, type: "audiostart" },
  ],
};

function openPort() {
  const trace: SpeechTraceEntry[] = [];
  const port = createBrowserSpeech({
    settings: speech,
    onTrace: (entry) => trace.push(entry),
  });
  return { port, trace };
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

describe("음성 접점의 듣기 언어(FR-4 · plan 바뀌는 파일 browser.ts)", () => {
  it("AC-25d 규칙의 언어는 진짜 듣기의 인식 객체에만 들어가고, 바로 다음 영어 듣기 · 버림 · 마이크 확인은 speech.lang 이다", async () => {
    install([
      realRun(KO_TEXT),
      { events: [{ at: 5, type: "start" }] },
      realRun("apple"),
      {
        events: [
          { at: 5, type: "start" },
          { at: 100, type: "soundstart" },
        ],
      },
    ]);
    const { port } = openPort();
    const ko = port.listen(KO_RULE);
    await vi.advanceTimersByTimeAsync(2000);
    expect((await ko.outcome).kind).toBe("result");
    const open = port.openDiscard;
    if (open === undefined) throw new Error("openDiscard 없음");
    const discard = open({});
    await vi.advanceTimersByTimeAsync(100);
    const en = port.listen(EN_RULE);
    await vi.advanceTimersByTimeAsync(2000);
    expect((await en.outcome).kind).toBe("result");
    discard.abort();
    const check = port.checkMicrophone();
    await vi.advanceTimersByTimeAsync(200);
    expect(await check).toEqual({ ok: true });
    expect(fake().langs).toEqual([KO, speech.lang, speech.lang, speech.lang]);
    port.dispose();
  });

  it("AC-25d 다른 언어 듣기 안에서 조용히 다시 연 객체(마이크 안 잡힘 의심)도 같은 언어다", async () => {
    install([deafRun, realRun(KO_TEXT)]);
    const { port } = openPort();
    const base = koAskEndRuleOf(speech, { endSilenceMs: 1000, lang: KO });
    // 조용히 다시 여는 수(시험용 설정은 0)를 하나로 둔 규칙
    const deaf = base.deaf;
    if (deaf === undefined) throw new Error("deaf 없음");
    const rule: EndRule = { ...base, deaf: { ...deaf, retryMax: 1 } };
    const handle = port.listen(rule);
    await vi.advanceTimersByTimeAsync(speech.deafSilenceMs + 2000);
    expect((await handle.outcome).kind).toBe("result");
    expect(fake().created).toBe(2);
    expect(fake().langs).toEqual([KO, KO]);
    port.dispose();
  });

  it("AC-25d lang 이 없는 영어 듣기는 인식 객체 언어와 기록 사건이 지금 그대로다(listen-begin 의 규칙에 lang 칸이 없다)", async () => {
    install([realRun("apple")]);
    const { port, trace } = openPort();
    const handle = port.listen(EN_RULE);
    await vi.advanceTimersByTimeAsync(2000);
    await handle.outcome;
    expect(fake().langs).toEqual([speech.lang]);
    const begin = trace.find((e) => e.kind === "listen-begin");
    expect(begin).toMatchObject({ kind: "listen-begin", rule: EN_RULE });
    expect(
      Object.keys(begin?.kind === "listen-begin" ? begin.rule : {}),
    ).not.toContain("lang");
    port.dispose();
  });

  it("AC-25f (가) 다른 언어 듣기의 service-not-allowed 는 음성 접점 결과에서 '그 언어만 안 됨'이다", async () => {
    const denied: RecognitionRun = {
      events: [
        { at: 5, type: "start" },
        { at: 20, type: "error", error: "service-not-allowed" },
        { at: 25, type: "end" },
      ],
    };
    install([denied, denied]);
    const { port } = openPort();
    const koHandle = port.listen(KO_RULE);
    await vi.advanceTimersByTimeAsync(100);
    expect(await koHandle.outcome).toMatchObject({
      kind: "error",
      group: "lang-unavailable",
    });
    const enHandle = port.listen(EN_RULE);
    await vi.advanceTimersByTimeAsync(100);
    expect(await enHandle.outcome).toMatchObject({
      kind: "error",
      group: "mic-unavailable",
    });
    port.dispose();
  });
});

// ── 듣기 요약의 언어 칸(접점 나 · AC-N27) ──

function listenTrace(
  listen: number,
  begin: number,
  rule: EndRule,
  outcome: ListenOutcome,
  text?: string,
): SpeechTraceEntry[] {
  return [
    { at: begin, kind: "listen-begin", listen, rule },
    {
      at: begin,
      kind: "recognizer-call",
      listen,
      recognizer: 1,
      call: "start",
    },
    {
      at: begin + 100,
      kind: "recognizer-event",
      listen,
      recognizer: 1,
      event: { type: "speechstart" },
    },
    ...(text === undefined
      ? []
      : [
          {
            at: begin + 200,
            kind: "recognizer-event" as const,
            listen,
            recognizer: 1,
            event: {
              type: "result" as const,
              results: [{ transcript: text, isFinal: true }],
            },
          },
        ]),
    { at: begin + 1500, kind: "listen-done", listen, outcome },
  ];
}

describe("듣기 요약의 언어 칸 lg(AC-N27 · NFR-2)", () => {
  it("AC-N27 한국어 듣기의 요약에는 lg 와 결과 갈래만 있고 인식 글이 없으며, 영어 듣기의 요약에는 lg 칸이 없다", () => {
    const log = createListenLog();
    const entries = [
      ...listenTrace(
        1,
        0,
        KO_RULE,
        {
          kind: "result",
          text: KO_TEXT,
          pieces: [KO_TEXT],
          endedBy: "silence",
          restarts: 0,
          watchdogRestarts: 0,
        },
        KO_TEXT,
      ),
      ...listenTrace(
        2,
        5000,
        EN_RULE,
        {
          kind: "result",
          text: "apple",
          pieces: ["apple"],
          endedBy: "silence",
          restarts: 0,
          watchdogRestarts: 0,
        },
        "apple",
      ),
      ...listenTrace(3, 9000, KO_RULE, {
        kind: "error",
        code: "service-not-allowed",
        group: "lang-unavailable",
        partialText: "",
      }),
    ];
    for (const e of entries) log.record(e);
    const [ko, en, denied] = log.take();
    expect(ko).toMatchObject({ o: "result", by: "silence", lg: KO });
    expect(en?.o).toBe("result");
    expect(en && "lg" in en).toBe(false);
    expect(denied).toMatchObject({ o: "error:service-not-allowed", lg: KO });
    expect(JSON.stringify([ko, en, denied])).not.toContain(KO_TEXT);
    expect(JSON.stringify([ko, en, denied])).not.toContain("사과");
    for (const s of [ko, en, denied])
      expect(ClientListenEntrySchema.parse(s)).toEqual(s);
  });

  it("AC-N27 요약 꼴은 lg 에 언어 표지만 받고 글은 거절한다", () => {
    const base = { o: "result", d: 1500, snd: true };
    expect(ClientListenEntrySchema.safeParse({ ...base, lg: KO }).success).toBe(
      true,
    );
    expect(
      ClientListenEntrySchema.safeParse({ ...base, lg: "en-US" }).success,
    ).toBe(true);
    for (const bad of [KO_TEXT, "", "ko KR", "apple pie is good", "ko-"])
      expect(
        ClientListenEntrySchema.safeParse({ ...base, lg: bad }).success,
        bad,
      ).toBe(false);
  });
});

describe("한국어 질문 끝 규칙의 언어 꼴 — 요약의 lg 와 함께 간다(코드 검토 묶음 3 M-1)", () => {
  it("AC-N27 요약의 lg 꼴(LISTEN_LANG_PATTERN) 밖의 언어는 끝 규칙이 받지 않아, lang 이 있는 듣기는 늘 lg 가 있는 요약이 된다", () => {
    for (const bad of ["ko_KR", " ko-KR", "ko-KR ", "KO-KR", "한국어"]) {
      expect(LISTEN_LANG_PATTERN.test(bad), bad).toBe(false);
      expect(
        () => koAskEndRuleOf(speech, { endSilenceMs: 2500, lang: bad }),
        bad,
      ).toThrow(RangeError);
    }
    expect(LISTEN_LANG_PATTERN.test(KO)).toBe(true);
    expect(koAskEndRuleOf(speech, { endSilenceMs: 2500, lang: KO }).lang).toBe(
      KO,
    );
  });
});

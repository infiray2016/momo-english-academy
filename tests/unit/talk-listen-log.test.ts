// 회화 듣기 사건 요약(iPad '결과 없음' 고침 N2, 13절 C149 · 5절 talk_turns client_listen · 분석 보고 4.1).
// 음성 접점의 기록 사건(browser.ts onTrace)을 듣기마다 o · by · d · as · snd · fr · tc 로 줄인다. 글 · 소리는 넣지 않는다.
import { describe, expect, it } from "vitest";
import { parseTalkAttemptInput } from "@/core/conversation/attempt";
import {
  CLIENT_LISTEN_MS_MAX,
  CLIENT_LISTENS_MAX,
  CLIENT_SPEAKS_MAX,
  type ClientListen,
  type ClientListenEntry,
  ClientListenSchema,
  clientListenRowOf,
} from "@/core/conversation/client-listen";
import type { EndRule, ListenOutcome } from "@/core/speech/listen";
import { createListenLog } from "@/lib/speech/listen-log";
import type { SpeechTraceEntry } from "@/lib/speech/types";

const RULE: EndRule = { endSilenceMs: 3000, capMs: 15_000, chunkMs: 15_000 };
const SPOKEN = "How are you?";
const SAID = "I'm good";
const WEBKIT_MESSAGE = "No speech detected";

const noSpeech: ListenOutcome = {
  kind: "error",
  code: "no-speech",
  group: "retry",
  partialText: "",
};

/** 듣기 하나의 기록(시작 · 객체 start · 사건들 · 끝). */
function listenTrace(
  listen: number,
  begin: number,
  events: (
    | { at: number; type: string; error?: string; message?: string }
    | { at: number; type: "result"; text: string }
    | { at: number; type: "button" }
  )[],
  done: { at: number; outcome: ListenOutcome },
  rule: EndRule = RULE,
): SpeechTraceEntry[] {
  const out: SpeechTraceEntry[] = [
    { at: begin, kind: "listen-begin", listen, rule },
    {
      at: begin,
      kind: "recognizer-call",
      listen,
      recognizer: 1,
      call: "start",
    },
  ];
  for (const e of events) {
    if (e.type === "button") {
      out.push({ at: e.at, kind: "button", listen });
      out.push({
        at: e.at,
        kind: "recognizer-call",
        listen,
        recognizer: 1,
        call: "stop",
      });
    } else if (e.type === "result" && "text" in e) {
      out.push({
        at: e.at,
        kind: "recognizer-event",
        listen,
        recognizer: 1,
        event: {
          type: "result",
          results: [{ transcript: e.text, isFinal: true }],
        },
      });
    } else if (e.type === "error" && "error" in e && e.error) {
      out.push({
        at: e.at,
        kind: "recognizer-event",
        listen,
        recognizer: 1,
        event: {
          type: "error",
          error: e.error,
          ...(e.message ? { message: e.message } : {}),
        },
      });
    } else {
      out.push({
        at: e.at,
        kind: "recognizer-event",
        listen,
        recognizer: 1,
        event: { type: e.type as "start" },
      });
    }
  }
  out.push({ at: done.at, kind: "listen-done", listen, outcome: done.outcome });
  return out;
}

function logOf(entries: SpeechTraceEntry[]) {
  const log = createListenLog();
  for (const entry of [...entries].sort((a, b) => a.at - b.at))
    log.record(entry);
  return log;
}

describe("듣기 사건 요약(C149)", () => {
  it("C149 읽는 중 끊고 들은 iPad 말소리 없음 듣기는 o error:no-speech · by button · snd 거짓 · tc cut 이고 다음 듣기는 읽기 끝 뒤 ms 다", () => {
    const log = logOf([
      { at: 0, kind: "speak", text: SPOKEN, voice: undefined },
      { at: 10, kind: "speak-event", type: "start" },
      ...listenTrace(
        1,
        1000,
        [
          { at: 1040, type: "start" },
          { at: 1060, type: "audiostart" },
          { at: 3000, type: "button" },
          {
            at: 3010,
            type: "error",
            error: "aborted",
            message: WEBKIT_MESSAGE,
          },
        ],
        { at: 3010, outcome: noSpeech },
      ),
      // 끊긴 읽기의 늦은 알림은 듣기 시작 뒤에 온다
      { at: 1001, kind: "speak-event", type: "error", code: "interrupted" },
      {
        at: 3020,
        kind: "recognizer-event",
        listen: 1,
        recognizer: 1,
        event: { type: "end" },
      },
      { at: 4000, kind: "speak", text: "Say, I'm good.", voice: undefined },
      { at: 4010, kind: "speak-event", type: "start" },
      { at: 5000, kind: "speak-event", type: "end" },
      ...listenTrace(
        2,
        5700,
        [
          { at: 5720, type: "start" },
          { at: 5730, type: "audiostart" },
          { at: 5900, type: "speechstart" },
          { at: 6200, type: "result", text: SAID },
        ],
        {
          at: 9200,
          outcome: {
            kind: "result",
            text: SAID,
            pieces: [SAID],
            endedBy: "silence",
            restarts: 0,
            watchdogRestarts: 0,
          },
        },
      ),
    ]);
    const listens = log.take();
    expect(listens).toEqual([
      {
        o: "error:no-speech",
        by: "button",
        d: 2010,
        as: 60,
        snd: false,
        tc: "cut",
        // 11-06 칸: 다시 연 객체 없음 · 쪽 숨음 없음 · 끊긴 읽기의 늦은 알림(interrupted)은 끊김(cancel)
        rs: 0,
        te: "cancel",
        hid: false,
        // 11-13 칸(묶음 V): 첫 읽기 요청(0) → 듣기 시작(1000), 요청 → 시작 알림(10), 읽는 중 끊어 길이(kd)는 없다
        k0: 1000,
        ks: 10,
        kn: 1,
      },
      {
        o: "result",
        by: "silence",
        d: 3500,
        as: 30,
        snd: true,
        fr: 500,
        tc: 700,
        // 앞 듣기 객체 end(3020) → 이 start 호출(5700), start 호출 → speechstart(5900), 읽기는 끝 알림으로 끝남
        pe: 2680,
        ss: 200,
        rs: 0,
        te: "end",
        hid: false,
        // 앞 듣기 끝(3010) 뒤 첫 읽기 요청(4000) → 이 듣기 시작(5700), 시작 알림 4010 → 끝 알림 5000
        k0: 1700,
        ks: 10,
        kd: 990,
        kn: 1,
      },
    ]);
    // 글 · 인식 글 · 오류 메시지는 들지 않는다(녹음 금지 · 이름 가림)
    const json = JSON.stringify(listens);
    for (const text of [SPOKEN, SAID, WEBKIT_MESSAGE, "Say"])
      expect(json).not.toContain(text);
    // 꺼낸 것은 다시 나오지 않는다(다음 기록은 그 뒤 듣기만)
    expect(log.take()).toEqual([]);
  });

  it("C149 상한으로 끝난 결과 없음은 by cap, 끊김은 o interrupted:<까닭>, 읽기 전이면 tc 가 없고 소리 없는 풀기 읽기는 보지 않는다", () => {
    const log = logOf([
      // 읽어 주기 제약을 푸는 소리 없는 글(unlockFromGesture)은 읽기로 보지 않는다
      { at: 0, kind: "speak", text: " ", voice: undefined },
      ...listenTrace(1, 100, [{ at: 150, type: "start" }], {
        at: 100 + (RULE.capMs ?? 0) + 10,
        outcome: { kind: "no-result" },
      }),
      ...listenTrace(2, 20_000, [{ at: 20_050, type: "start" }], {
        at: 20_400,
        outcome: { kind: "interrupted", reason: "speak", partialText: "" },
      }),
    ]);
    const [cap, cut] = log.take();
    expect(cap).toEqual({
      o: "no-result",
      by: "cap",
      d: (RULE.capMs ?? 0) + 10,
      snd: false,
      rs: 0,
      hid: false,
    });
    expect(cut).toEqual({
      o: "interrupted:speak",
      d: 400,
      snd: false,
      rs: 0,
      hid: false,
    });
  });

  it("C149 모르는 오류 코드는 error:other 로, 듣기 요약은 최근 CLIENT_LISTENS_MAX 개만 남긴다", () => {
    const entries: SpeechTraceEntry[] = [];
    const n = CLIENT_LISTENS_MAX + 5;
    for (let i = 1; i <= n; i++)
      entries.push(
        ...listenTrace(i, i * 1000, [], {
          at: i * 1000 + 100,
          outcome: {
            kind: "error",
            code: i === n ? "Weird Code!" : "audio-capture",
            group: "retry",
            partialText: "",
          },
        }),
      );
    const listens = logOf(entries).take();
    expect(listens).toHaveLength(CLIENT_LISTENS_MAX);
    expect(listens.at(-1)?.o).toBe("error:other");
    expect(listens.at(0)?.o).toBe("error:audio-capture");
  });
});

describe("듣기 사건 칸 꼴(C149 · 5절 talk_turns client_listen · attempts 따라 말하기)", () => {
  const listen: ClientListenEntry = {
    o: "error:no-speech",
    by: "button",
    d: 2010,
    snd: false,
    tc: "cut",
  };
  const valid: ClientListen = {
    br: "iPad Safari 27.0",
    r3d: true,
    listens: [listen],
    mf: 2,
  };

  it("C149 요청 꼴은 기기 이름 · 3D · 듣기 요약 · 실패 셈만 받고 글이 든 칸은 거른다", () => {
    expect(ClientListenSchema.safeParse(valid).success).toBe(true);
    expect(
      ClientListenSchema.safeParse({
        ...valid,
        listens: [{ ...listen, text: SAID }],
      }).success,
    ).toBe(false);
    expect(
      ClientListenSchema.safeParse({ ...valid, transcript: SAID }).success,
    ).toBe(false);
    expect(
      ClientListenSchema.safeParse({
        ...valid,
        listens: [{ ...listen, o: `error:${SAID}` }],
      }).success,
    ).toBe(false);
    // 출처(src)는 서버가 입력에서 정한다 — 화면이 보내지 않는다
    expect(
      ClientListenSchema.safeParse({ ...valid, src: "button" }).success,
    ).toBe(false);
  });

  it("C149 아이 행 칸의 '모름' 출처는 화면이 보낸 nospeech 표시로 정한다(단추 · 말소리 없음)", () => {
    expect(
      clientListenRowOf({ mode: "dont_know", nospeech: true }, valid),
    ).toEqual({ ...valid, src: "nospeech" });
    expect(clientListenRowOf({ mode: "dont_know" }, valid)).toEqual({
      ...valid,
      src: "button",
    });
    expect(clientListenRowOf({ mode: "dont_know" }, undefined)).toEqual({
      src: "button",
    });
    expect(clientListenRowOf({ mode: "speech" }, valid)).toEqual(valid);
    expect(clientListenRowOf({ mode: "speech" }, undefined)).toBeNull();
  });

  it("C149 따라 말하기 시도 꼴에 듣기 요약 칸(clientListen)을 둘 수 있고 없어도 읽힌다", () => {
    const base = {
      v: 1,
      kind: "talk-wrapup",
      step: "final",
      target: "fan",
      heard: [],
      failures: 3,
      skipped: "recognition",
      index: 0,
    };
    expect(parseTalkAttemptInput(base)).toBeDefined();
    expect(parseTalkAttemptInput({ ...base, clientListen: valid })).toEqual({
      ...base,
      clientListen: valid,
    });
    expect(
      parseTalkAttemptInput({
        ...base,
        clientListen: { ...valid, listens: [{ ...listen, text: "fan" }] },
      }),
    ).toBeUndefined();
  });
});

describe("읽어 주기 감시가 끝낸 발화(C166 R1 · 검토 A M-2)", () => {
  it("M-2 시작 알림 없이 감시 상한이 끝낸 발화(timeout no-start) 뒤의 듣기는 읽는 중 끊음(cut)이 아니라 감시 끝 뒤 ms 다", () => {
    const log = logOf([
      { at: 0, kind: "speak", text: SPOKEN, voice: undefined },
      // 시작 알림이 오지 않아 감시가 끝냄(browser.ts giveUp)
      { at: 3000, kind: "speak-event", type: "timeout", code: "no-start" },
      ...listenTrace(
        1,
        3500,
        [
          { at: 3540, type: "start" },
          { at: 3600, type: "result", text: SAID },
        ],
        {
          at: 6600,
          outcome: {
            kind: "result",
            text: SAID,
            pieces: [],
            endedBy: "silence",
            restarts: 0,
            watchdogRestarts: 0,
          },
        },
      ),
    ]);
    const [entry] = log.take();
    expect(entry?.tc).toBe(500);
  });
});

describe("읽어 주기 시작 · 끝 기록(AC-26p, C238 (6) · 회화 Claude 주도 plan 묶음 V)", () => {
  const heard: ListenOutcome = {
    kind: "result",
    text: SAID,
    pieces: [SAID],
    endedBy: "silence",
    restarts: 0,
    watchdogRestarts: 0,
  };
  /** 결과로 끝난 듣기 하나(시작 begin, 끝 begin + 3000). */
  const heardListen = (listen: number, begin: number) =>
    listenTrace(
      listen,
      begin,
      [{ at: begin + 100, type: "result", text: SAID }],
      {
        at: begin + 3000,
        outcome: heard,
      },
    );
  /** 칸 넷과 tc 만 뽑는다(다른 칸은 앞 시험이 본다). */
  const timing = (e: ClientListenEntry | undefined) =>
    e === undefined
      ? undefined
      : {
          tc: e.tc,
          k0: e.k0,
          ks: e.ks,
          kd: e.kd,
          kn: e.kn,
        };

  it("AC-26p 묶음 V 읽기 하나 뒤 듣기는 k0 · ks · kd · kn 을 듣기 시작에서 거꾸로 잰 ms 로 남기고 시작 · 끝 시각이 tc 와 맞는다", () => {
    const log = logOf([
      { at: 1000, kind: "speak", text: SPOKEN, voice: undefined },
      { at: 1300, kind: "speak-event", type: "start" },
      { at: 3300, kind: "speak-event", type: "end" },
      ...heardListen(1, 3800),
    ]);
    const [entry] = log.take();
    expect(timing(entry)).toEqual({
      tc: 500,
      k0: 2800,
      ks: 300,
      kd: 2000,
      kn: 1,
    });
    // 시작 시각 = 듣기 시작 − k0 + ks, 끝 시각 = 듣기 시작 − tc, 길이 = 끝 − 시작(plan 묶음 V)
    const begin = 3800;
    const startAt = begin - (entry?.k0 ?? 0) + (entry?.ks ?? 0);
    const endAt = begin - (typeof entry?.tc === "number" ? entry.tc : 0);
    expect(startAt).toBe(1300);
    expect(endAt).toBe(3300);
    expect(endAt - startAt).toBe(entry?.kd);
    // 글은 들지 않는다
    expect(JSON.stringify(entry)).not.toContain(SPOKEN);
  });

  it("AC-26p 묶음 V 여러 문장은 앞 듣기 끝 뒤 첫 요청부터 세고, kd 는 첫 시작 알림 → 마지막 끝 알림, kn 은 요청 수(소리 없는 풀기 글은 셈 밖)다", () => {
    const log = logOf([
      // 앞 듣기 앞의 읽기는 다음 듣기의 칸에 들지 않는다
      { at: 0, kind: "speak", text: SPOKEN, voice: undefined },
      { at: 100, kind: "speak-event", type: "start" },
      { at: 900, kind: "speak-event", type: "end" },
      ...heardListen(1, 1000),
      // 앞 듣기 끝 4000 뒤
      { at: 4500, kind: "speak", text: " ", voice: undefined },
      { at: 4510, kind: "speak-event", type: "start" },
      { at: 4520, kind: "speak-event", type: "end" },
      { at: 6000, kind: "speak", text: "Nice.", voice: undefined },
      { at: 6200, kind: "speak-event", type: "start" },
      { at: 7000, kind: "speak-event", type: "end" },
      { at: 7100, kind: "speak", text: "Me too.", voice: undefined },
      { at: 7250, kind: "speak-event", type: "start" },
      { at: 8000, kind: "speak-event", type: "end" },
      { at: 8100, kind: "speak", text: SPOKEN, voice: undefined },
      { at: 8300, kind: "speak-event", type: "start" },
      { at: 9500, kind: "speak-event", type: "end" },
      ...heardListen(2, 10_000),
    ]);
    const [first, second] = log.take();
    expect(timing(first)).toEqual({
      tc: 100,
      k0: 1000,
      ks: 100,
      kd: 800,
      kn: 1,
    });
    expect(timing(second)).toEqual({
      tc: 500,
      k0: 4000,
      ks: 200,
      kd: 3300,
      kn: 3,
    });
  });

  it("AC-26p 묶음 V 읽는 중 끊고 들으면 tc cut 이고 끝 알림이 듣기 앞에 없어 kd 는 없고 k0 · ks · kn 만 남는다", () => {
    const log = logOf([
      { at: 0, kind: "speak", text: SPOKEN, voice: undefined },
      { at: 200, kind: "speak-event", type: "start" },
      ...heardListen(1, 1500),
      // 끊긴 읽기의 늦은 알림은 듣기 시작 뒤에 온다
      { at: 1501, kind: "speak-event", type: "error", code: "interrupted" },
    ]);
    const [entry] = log.take();
    expect(timing(entry)).toEqual({
      tc: "cut",
      k0: 1500,
      ks: 200,
      kd: undefined,
      kn: 1,
    });
    expect(entry?.te).toBe("cancel");
    expect(entry).not.toHaveProperty("kd");
  });

  it("AC-26p 묶음 V 감시 상한이 끝낸 읽기는 그 감시 알림을 끝으로 보고(no-end), 시작 알림이 없으면(no-start) ks · kd 가 없다", () => {
    const log = logOf([
      // 시작 알림은 왔고 끝 알림이 없어 감시가 끝냄
      { at: 0, kind: "speak", text: SPOKEN, voice: undefined },
      { at: 100, kind: "speak-event", type: "start" },
      { at: 8100, kind: "speak-event", type: "timeout", code: "no-end" },
      ...heardListen(1, 8600),
      // 시작 알림이 오지 않아 감시가 끝냄
      { at: 12_000, kind: "speak", text: SPOKEN, voice: undefined },
      { at: 15_000, kind: "speak-event", type: "timeout", code: "no-start" },
      ...heardListen(2, 15_500),
    ]);
    const [noEnd, noStart] = log.take();
    expect(timing(noEnd)).toEqual({
      tc: 500,
      k0: 8600,
      ks: 100,
      kd: 8000,
      kn: 1,
    });
    expect(noEnd?.te).toBe("timeout");
    expect(timing(noStart)).toEqual({
      tc: 500,
      k0: 3500,
      ks: undefined,
      kd: undefined,
      kn: 1,
    });
    expect(noStart).not.toHaveProperty("ks");
    expect(noStart).not.toHaveProperty("kd");
  });

  it("AC-26p 묶음 V 앞 듣기 끝 뒤 읽기가 없으면 네 칸이 없고, 10분 넘는 틈은 상한 값으로 자른다", () => {
    const log = logOf([
      { at: 0, kind: "speak", text: SPOKEN, voice: undefined },
      { at: 100, kind: "speak-event", type: "start" },
      { at: 900, kind: "speak-event", type: "end" },
      ...heardListen(1, 1000),
      // 읽기 없이 다시 듣기
      ...heardListen(2, 5000),
      // 오래 쉰 뒤의 읽기
      { at: 10_000, kind: "speak", text: SPOKEN, voice: undefined },
      { at: 10_100, kind: "speak-event", type: "start" },
      { at: 10_900, kind: "speak-event", type: "end" },
      ...heardListen(3, 10_000 + CLIENT_LISTEN_MS_MAX + 5000),
    ]);
    const [, again, late] = log.take();
    for (const key of ["k0", "ks", "kd", "kn"])
      expect(again).not.toHaveProperty(key);
    expect(late?.k0).toBe(CLIENT_LISTEN_MS_MAX);
    expect(late?.ks).toBe(100);
    expect(late?.kd).toBe(800);
    expect(
      ClientListenSchema.safeParse({
        br: "iPad Safari 27.0",
        r3d: false,
        listens: [late],
        mf: 0,
      }).success,
    ).toBe(true);
  });

  it("AC-26p 묶음 V 칸 꼴은 네 칸이 없던 옛 기록을 그대로 읽고, 정수 ms · 셈만 받으며 글이나 범위 밖 값은 거른다", () => {
    const old: ClientListenEntry = {
      o: "result",
      by: "silence",
      d: 3500,
      snd: true,
      tc: 700,
      te: "end",
    };
    const wrap = (listens: unknown[]): unknown => ({
      br: "iPad Safari 27.0",
      r3d: true,
      listens,
      mf: 0,
    });
    // 옛 기록(칸 없음)은 그대로
    expect(ClientListenSchema.parse(wrap([old]))).toEqual(wrap([old]));
    const withTiming = { ...old, k0: 1700, ks: 10, kd: 990, kn: 1 };
    expect(ClientListenSchema.safeParse(wrap([withTiming])).success).toBe(true);
    for (const bad of [
      { k0: -1 },
      { ks: 1.5 },
      { kd: CLIENT_LISTEN_MS_MAX + 1 },
      { kn: -1 },
      { kn: CLIENT_SPEAKS_MAX + 1 },
      { k0: "1700" },
      { kt: SPOKEN },
    ])
      expect(
        ClientListenSchema.safeParse(wrap([{ ...old, ...bad }])).success,
      ).toBe(false);
    // 따라 말하기 시도 꼴도 같은 칸을 읽는다
    const attempt = {
      v: 1,
      kind: "talk-wrapup",
      step: "final",
      target: "fan",
      heard: [],
      failures: 3,
      skipped: "recognition",
      index: 0,
      clientListen: wrap([withTiming]),
    };
    expect(parseTalkAttemptInput(attempt)).toEqual(attempt);
    expect(
      parseTalkAttemptInput({
        ...attempt,
        clientListen: wrap([{ ...withTiming, kn: -1 }]),
      }),
    ).toBeUndefined();
  });
});

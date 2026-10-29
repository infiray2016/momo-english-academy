// 회화 듣기 사건 요약(iPad '결과 없음' 고침 N2, 13절 C149 · 5절 talk_turns client_listen · 분석 보고 4.1).
// 음성 접점의 기록 사건(browser.ts onTrace)을 듣기마다 o · by · d · as · snd · fr · tc 로 줄인다. 글 · 소리는 넣지 않는다.
import { describe, expect, it } from "vitest";
import { parseTalkAttemptInput } from "@/core/conversation/attempt";
import {
  CLIENT_LISTENS_MAX,
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
      },
      {
        o: "result",
        by: "silence",
        d: 3500,
        as: 30,
        snd: true,
        fr: 500,
        tc: 700,
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
    });
    expect(cut).toEqual({ o: "interrupted:speak", d: 400, snd: false });
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
      kind: "talk-today",
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

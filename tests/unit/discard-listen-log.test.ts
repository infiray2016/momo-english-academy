// 버리는 듣기 기록 칸(iPad 버리는 듣기 spec 설계 5 · plan 접점 표 'client_listen dc' · '사건 기록', 13절 C149 · C213).
// 진짜 듣기 요약 한 줄에 '그 앞 버림' 칸 묶음 dc 를 붙이고, pe 는 버림 객체의 end 도 앞 객체로 센다. 글 · 인식 글 · 소리는 넣지 않는다.
import { describe, expect, expectTypeOf, it } from "vitest";
import { parseTalkAttemptInput } from "@/core/conversation/attempt";
import {
  CLIENT_LISTEN_MS_MAX,
  type ClientListen,
  type ClientListenEntry,
  ClientListenEntrySchema,
  ClientListenSchema,
  clientListenRowOf,
  DISCARD_COUNT_MAX,
  type DiscardNote,
  DiscardNoteSchema,
  TALK_SPEAK_WHATS,
} from "@/core/conversation/client-listen";
import {
  DISCARD_BRANCHES,
  DISCARD_END_WHYS,
  DISCARD_REOPEN_WHYS,
  DISCARD_SOUND_KINDS,
  type DiscardFlowNote,
} from "@/core/speech/discard";
import type { EndRule, ListenOutcome } from "@/core/speech/listen";
import { createListenLog } from "@/lib/speech/listen-log";
import type { SpeechTraceEntry } from "@/lib/speech/types";
import * as speechTypes from "@/lib/speech/types";

const RULE: EndRule = { endSilenceMs: 3000, capMs: 15_000, chunkMs: 15_000 };
/** 버림에서 들렸을 글(어디에도 남으면 안 된다 — AC-12 표지). */
const MARK = "ZEBRA";

const said: ListenOutcome = {
  kind: "result",
  text: "I like apples",
  pieces: ["I like apples"],
  endedBy: "silence",
  restarts: 0,
  watchdogRestarts: 0,
};

/** 버림 하나의 기록(start → 사건들 → end). 결과는 수만 싣는다(음성 접점 꼴 그대로). */
function discardTrace(
  discard: number,
  startAt: number,
  endAt: number,
  extra: SpeechTraceEntry[] = [],
): SpeechTraceEntry[] {
  return [
    {
      at: startAt,
      kind: "discard-call",
      discard,
      call: "start",
      synth: "speaking",
    },
    ...extra,
    { at: endAt - 10, kind: "discard-call", discard, call: "stop" },
    { at: endAt, kind: "discard-event", discard, event: { type: "end" } },
  ];
}

/** 진짜 듣기 하나의 기록(시작 · 객체 start · 객체 end · 끝). */
function realTrace(
  listen: number,
  begin: number,
  doneAt: number,
  outcome: ListenOutcome = said,
): SpeechTraceEntry[] {
  return [
    { at: begin, kind: "listen-begin", listen, rule: RULE },
    {
      at: begin,
      kind: "recognizer-call",
      listen,
      recognizer: 1,
      call: "start",
      synth: "idle",
    },
    {
      at: doneAt - 5,
      kind: "recognizer-event",
      listen,
      recognizer: 1,
      event: { type: "end" },
    },
    { at: doneAt, kind: "listen-done", listen, outcome },
  ];
}

function summariesOf(trace: readonly SpeechTraceEntry[]): ClientListenEntry[] {
  const log = createListenLog();
  for (const e of trace) log.record(e);
  return log.take();
}

const FULL: DiscardNote = {
  g: "discard",
  sr: false,
  why: "sound",
  as: 420,
  d: 3100,
  s0: 600,
  s1: 2900,
  w: 150,
  sk: "teacher",
  np: 0,
  n: 2,
};
const REOPEN: DiscardNote = {
  g: "reopen",
  sr: true,
  why: "self_end",
  rw: "hidden",
  sk: "cut",
  np: 1,
  n: 0,
};

describe("dc 칸 꼴(설계 5 · 접점 표 'client_listen dc')", () => {
  it("진짜 요약 한 줄이 접점 표의 열네 칸 dc 를 받고 값 목록은 버림 기계(core/speech/discard)의 목록이다(AC-10)", () => {
    const entry: ClientListenEntry = { o: "result", d: 4000, snd: true };
    for (const dc of [FULL, REOPEN, { g: "rest" } as DiscardNote])
      expect(ClientListenEntrySchema.parse({ ...entry, dc })).toEqual({
        ...entry,
        dc,
      });
    const shape = DiscardNoteSchema.shape;
    expect(Object.keys(shape).sort()).toEqual(
      [
        "g",
        "sr",
        "why",
        "rw",
        "as",
        "d",
        "s0",
        "s1",
        "w",
        "sk",
        "np",
        "n",
        // 회화 대화 구조 R spec 설계 6 '기록 칸' (ㄴ) — 조용함 입구 버림의 audiostart · 판정(묶음 V, 2026-11-13)
        "qa",
        "ql",
      ].sort(),
    );
    expect(shape.g.unwrap().options).toEqual([...DISCARD_BRANCHES]);
    expect(shape.why.unwrap().options).toEqual([...DISCARD_END_WHYS]);
    expect(shape.rw.unwrap().options).toEqual([...DISCARD_REOPEN_WHYS]);
    expect(shape.sk.unwrap().options).toEqual([...DISCARD_SOUND_KINDS]);
  });

  it("dc 의 값은 목록 밖 이름 · 음수 · 소수 · 상한 넘는 ms · 셈을 거른다(AC-10)", () => {
    const entry = { o: "result", d: 4000, snd: true };
    for (const bad of [
      { g: "other" },
      { why: "button" },
      { rw: "sound" },
      { sk: "child" },
      { sr: "yes" },
      { as: -1 },
      { d: 1.5 },
      { w: CLIENT_LISTEN_MS_MAX + 1 },
      { n: DISCARD_COUNT_MAX + 1 },
      { np: -1 },
    ])
      expect(
        ClientListenEntrySchema.safeParse({ ...entry, dc: bad }).success,
        JSON.stringify(bad),
      ).toBe(false);
  });

  it("글 칸이 든 dc 는 요청 꼴 · 따라 말하기 시도 꼴 모두 거른다(C149 · AC-12)", () => {
    const listen = { o: "result", d: 4000, snd: true };
    for (const leak of [
      { ...FULL, text: MARK },
      { ...FULL, transcript: MARK },
      { ...FULL, results: [{ transcript: MARK, isFinal: true }] },
    ]) {
      expect(
        ClientListenEntrySchema.safeParse({ ...listen, dc: leak }).success,
      ).toBe(false);
      const body = {
        br: "iPad Safari 27.0",
        r3d: false,
        listens: [{ ...listen, dc: leak }],
        mf: 0,
      };
      expect(ClientListenSchema.safeParse(body).success).toBe(false);
      expect(
        parseTalkAttemptInput({
          v: 1,
          kind: "talk-wrapup",
          step: "final",
          target: "fan",
          heard: [],
          failures: 0,
          index: 0,
          clientListen: body,
        }),
      ).toBeUndefined();
    }
  });

  it("dc 가 없는 옛 기록 · 끔 기기의 요청은 그대로 통과한다(AC-10 · AC-11)", () => {
    const old: ClientListen = {
      br: "iPad Safari 27.0",
      r3d: true,
      listens: [
        { o: "no-result", by: "browser", d: 8000, snd: false, tc: "cut" },
        { o: "result", by: "silence", d: 5000, as: 120, snd: true, fr: 900 },
      ],
      mf: 1,
    };
    expect(ClientListenSchema.parse(old)).toEqual(old);
    const base = {
      v: 1,
      kind: "talk-wrapup",
      step: "final",
      target: "fan",
      heard: [],
      failures: 0,
      index: 0,
    };
    expect(parseTalkAttemptInput({ ...base, clientListen: old })).toEqual({
      ...base,
      clientListen: old,
    });
  });

  it("서버가 받는 자리(회화 턴 · 따라 말하기 저장 · 아이 행 칸)가 dc 를 글 없이 그대로 둔다(AC-10)", () => {
    const body: ClientListen = {
      br: "iPad Safari 27.0",
      r3d: false,
      listens: [{ o: "result", by: "silence", d: 4000, snd: true, dc: FULL }],
      mf: 0,
    };
    expect(ClientListenSchema.parse(body)).toEqual(body);
    expect(clientListenRowOf({ mode: "speech" }, body)).toEqual(body);
    expect(clientListenRowOf({ mode: "dont_know" }, body)).toEqual({
      ...body,
      src: "button",
    });
    const wrap = parseTalkAttemptInput({
      v: 1,
      kind: "talk-wrapup",
      step: "final",
      target: "fan",
      heard: [],
      failures: 0,
      index: 0,
      clientListen: body,
    });
    expect(wrap).toMatchObject({ clientListen: body });
    // 글 칸이 든 dc(버림에서 들린 글이 새는 꼴)는 받지 않는다 — 저장 자리 셋 모두(묶음 4 검토 M1: 표지 글을 실제로 넣어 본다)
    const leaky = {
      ...body,
      listens: [{ ...body.listens[0], dc: { ...FULL, text: MARK } }],
    };
    expect(ClientListenSchema.safeParse(leaky).success).toBe(false);
    const leakyWrap = parseTalkAttemptInput({
      v: 1,
      kind: "talk-wrapup",
      step: "final",
      target: "fan",
      heard: [],
      failures: 0,
      index: 0,
      clientListen: leaky,
    });
    expect(JSON.stringify(leakyWrap ?? null)).not.toContain(MARK);
  });

  it("늦게 남은 note 는 다음 진짜 요약에 붙지 않는다 — 앞 듣기의 끝에서 멈춘다(묶음 4 검토 M3)", () => {
    const [begin1, start1, end1, done1] = realTrace(1, 1000, 5000);
    if (!begin1 || !start1 || !end1 || !done1) throw new Error("기록 꼴");
    const late: SpeechTraceEntry = { at: 2000, kind: "discard-note", dc: FULL };
    const summaries = summariesOf([
      begin1,
      start1,
      late,
      end1,
      done1,
      ...realTrace(2, 8000, 12000),
    ]);
    expect(summaries).toHaveLength(2);
    expect(summaries[0]?.dc).toBeUndefined();
    expect(summaries[1]?.dc).toBeUndefined();
  });

  it("버림 기계의 기록 꼴(DiscardFlowNote)과 기록 칸 꼴(DiscardNote)은 같은 칸이다 — 한쪽에만 칸이 늘면 tsc 가 잡는다(묶음 4 검토 M5)", () => {
    expectTypeOf<DiscardFlowNote>().toEqualTypeOf<DiscardNote>();
  });

  it("음성 접점 형(lib/speech/types)의 값 목록 넷은 버림 기계의 것을 다시 내보낸 같은 값이다(검토 2-가 M3)", () => {
    expect(speechTypes.DISCARD_BRANCHES).toBe(DISCARD_BRANCHES);
    expect(speechTypes.DISCARD_END_WHYS).toBe(DISCARD_END_WHYS);
    expect(speechTypes.DISCARD_REOPEN_WHYS).toBe(DISCARD_REOPEN_WHYS);
    expect(speechTypes.DISCARD_SOUND_KINDS).toBe(DISCARD_SOUND_KINDS);
    const note: speechTypes.DiscardNote = FULL;
    expect(DiscardNoteSchema.parse(note)).toEqual(FULL);
  });
});

describe("TALK_SPEAK_WHATS 의 short(접점 표 'client_listen dc')", () => {
  it("선생님 쪽 발화 감시 기록이 짧은 말(short)을 받는다", () => {
    expect(TALK_SPEAK_WHATS).toContain("short");
    const body = {
      br: "iPad Safari 27.0",
      r3d: false,
      listens: [],
      mf: 0,
      sp: [{ w: "short", h: "no_end" }],
    };
    expect(ClientListenSchema.parse(body)).toEqual(body);
  });
});

describe("듣기 사건 요약의 버림(listen-log keptOf · 설계 5)", () => {
  it("pe 는 버림 객체의 end 도 앞 객체로 센다(AC-10)", () => {
    const [first, second] = summariesOf([
      ...realTrace(1, 0, 4000),
      ...discardTrace(1, 6000, 9000),
      ...realTrace(2, 9300, 13_000),
    ]);
    expect(first?.pe).toBeUndefined();
    // 앞 진짜의 객체 end(3995)가 아니라 버림 end(9000) 뒤 300ms
    expect(second?.pe).toBe(300);
  });

  it("버림 note 는 다음 진짜 요약의 dc 로 붙고 그 뒤 진짜에는 붙지 않는다(AC-10)", () => {
    const out = summariesOf([
      ...discardTrace(1, 0, 3000),
      { at: 3200, kind: "discard-note", dc: FULL },
      ...realTrace(1, 3200, 7000),
      ...realTrace(2, 8000, 11_000),
      { at: 12_000, kind: "discard-note", dc: REOPEN },
      ...realTrace(3, 12_000, 15_000),
    ]);
    expect(out.map((e) => e.dc)).toEqual([FULL, undefined, REOPEN]);
    expect("dc" in (out[1] as object)).toBe(false);
    for (const e of out)
      expect(ClientListenEntrySchema.safeParse(e).success).toBe(true);
  });

  it("버림 note 가 둘이면 진짜 바로 앞의 것만 붙는다", () => {
    const [only] = summariesOf([
      { at: 100, kind: "discard-note", dc: REOPEN },
      { at: 3200, kind: "discard-note", dc: FULL },
      ...realTrace(1, 3200, 7000),
    ]);
    expect(only?.dc).toEqual(FULL);
  });

  it("붙인 dc 는 접점 표 칸만 남기고 ms · 셈을 서버 꼴 상한으로 자른다(글 칸이 섞여 와도 버림 — C149)", () => {
    const leaky = {
      ...FULL,
      d: CLIENT_LISTEN_MS_MAX + 5000,
      w: 12.4,
      n: DISCARD_COUNT_MAX + 3,
      text: MARK,
    } as DiscardNote;
    const [only] = summariesOf([
      { at: 0, kind: "discard-note", dc: leaky },
      ...realTrace(1, 0, 4000),
    ]);
    expect(only?.dc).toEqual({
      ...FULL,
      d: CLIENT_LISTEN_MS_MAX,
      w: 12,
      n: DISCARD_COUNT_MAX,
    });
    expect(JSON.stringify(only)).not.toContain(MARK);
    expect(ClientListenEntrySchema.safeParse(only).success).toBe(true);
  });

  it("버림의 audiostart · 소리 · 결과는 진짜 칸(as · snd · fr · ss · rs)에 들지 않는다(AC-10)", () => {
    const noisy = discardTrace(1, 0, 3000, [
      {
        at: 100,
        kind: "discard-event",
        discard: 1,
        event: { type: "audiostart" },
      },
      {
        at: 200,
        kind: "discard-event",
        discard: 1,
        event: { type: "soundstart" },
      },
      {
        at: 300,
        kind: "discard-event",
        discard: 1,
        event: { type: "speechstart" },
      },
      {
        at: 900,
        kind: "discard-event",
        discard: 1,
        event: { type: "result", count: 3 },
      },
      {
        at: 950,
        kind: "discard-event",
        discard: 1,
        event: { type: "error", error: "no-speech" },
      },
    ]);
    const [real] = summariesOf([
      ...noisy,
      ...realTrace(1, 3100, 6000, {
        kind: "error",
        code: "no-speech",
        group: "retry",
        partialText: "",
      }),
    ]);
    expect(real).toMatchObject({ o: "error:no-speech", snd: false, rs: 0 });
    expect(real?.as).toBeUndefined();
    expect(real?.fr).toBeUndefined();
    expect(real?.ss).toBeUndefined();
    expect(real?.dc).toBeUndefined();
  });

  it("end · note 가 없으면 버림 사건이 섞여도 요약은 버림 없는 기록과 글자까지 같다(AC-11)", () => {
    const plain = [...realTrace(1, 0, 4000), ...realTrace(2, 5000, 9000)];
    const withCalls: SpeechTraceEntry[] = [
      ...realTrace(1, 0, 4000),
      { at: 4500, kind: "discard-call", discard: 1, call: "start" },
      {
        at: 4600,
        kind: "discard-event",
        discard: 1,
        event: { type: "result", count: 1 },
      },
      { at: 4700, kind: "discard-call", discard: 1, call: "abort" },
      ...realTrace(2, 5000, 9000),
    ];
    expect(JSON.stringify(summariesOf(withCalls))).toBe(
      JSON.stringify(summariesOf(plain)),
    );
  });
});

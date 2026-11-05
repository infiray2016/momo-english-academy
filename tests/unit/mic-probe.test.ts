// 마이크 점검 쪽(/dev/mic-probe)의 기록 요약 · ms 계산 · 복사 글(브리프 task-mic-probe 2026-11-06, fix 1 의 F · G — 검토 I-3 · M-4 · M-5).
// 순수 모듈만 덮는다.
import { describe, expect, it } from "vitest";
import {
  copyTextOf,
  FAST_AUDIOSTART_MS,
  fastRestartDue,
  keepResultEvent,
  MAX_FAST_RESTARTS,
  MAX_INTERIM_EVENTS,
  type ProbeEnv,
  type ProbeEvent,
  type ProbeRecord,
  parseStored,
  rowOf,
  type Strategy,
  summaryOf,
} from "../../src/app/dev/mic-probe/probe-log";

function record(
  id: number,
  strategy: Strategy,
  events: ProbeEvent[],
  attempts: ProbeRecord["attempts"] = [
    { startCallAt: 1_000, nth: id, lastText: "" },
  ],
): ProbeRecord {
  return {
    id,
    load: 1,
    strategy,
    lang: strategy === "E" ? "ko-KR" : "en-US",
    pressedAt: "2026-11-06T05:00:00.000Z",
    tapAt: 990,
    sincePrevEndMs: id === 1 ? null : 2_345.6,
    visibilityAtStart: "visible",
    attempts,
    events,
    stopReason: "silence",
    droppedInterims: 0,
  };
}

const ok = (id: number, strategy: Strategy, text = "apple") =>
  record(
    id,
    strategy,
    [
      { type: "start-call", at: 1_000, attempt: 0 },
      { type: "audiostart", at: 1_380, attempt: 0 },
      {
        type: "result",
        at: 2_000,
        attempt: 0,
        final: true,
        length: text.length,
        finalText: text,
      },
      { type: "end", at: 4_100, attempt: 0 },
    ],
    [{ startCallAt: 1_000, nth: id, lastText: text }],
  );

const silent = (id: number, strategy: Strategy) =>
  record(id, strategy, [
    { type: "start-call", at: 1_000, attempt: 0 },
    { type: "audiostart", at: 1_035, attempt: 0 },
    {
      type: "error",
      at: 7_100,
      attempt: 0,
      code: "aborted",
      message: "No speech detected",
    },
    { type: "end", at: 7_120, attempt: 0 },
  ]);

const ENV: ProbeEnv = {
  userAgent: "Mozilla/5.0 (iPad; CPU OS 27_0 like Mac OS X)",
  visibility: "visible",
  audioSessionType: "auto",
  recognition: "webkitSpeechRecognition",
  load: 2,
};

describe("마이크 점검 쪽 기록", () => {
  it("전략별 성공률은 final 결과가 있는 듣기 수 ÷ 누른 수이고, 누른 적 없는 전략은 null 이다", () => {
    const records = [
      ok(1, "A"),
      silent(2, "A"),
      ok(3, "A"),
      silent(4, "E"),
      // 중간 결과만 있으면 실패다
      record(5, "C", [
        { type: "start-call", at: 1_000, attempt: 0 },
        { type: "result", at: 1_900, attempt: 0, final: false, length: 3 },
        { type: "end", at: 3_000, attempt: 0 },
      ]),
      ok(6, "F"),
      silent(7, "G"),
    ];
    expect(summaryOf(records)).toEqual([
      { strategy: "A", tries: 3, successes: 2, rate: 67 },
      { strategy: "B", tries: 0, successes: 0, rate: null },
      { strategy: "C", tries: 1, successes: 0, rate: 0 },
      { strategy: "D", tries: 0, successes: 0, rate: null },
      { strategy: "E", tries: 1, successes: 0, rate: 0 },
      { strategy: "F", tries: 1, successes: 1, rate: 100 },
      { strategy: "G", tries: 1, successes: 0, rate: 0 },
    ]);
  });

  it("ms 는 시도마다 그 start 호출 기준이고, B 는 빠른 시작 알림 · 소리 없음 · 횟수가 남았을 때만 다시 시작하며, 읽기 끝 · 취소 → start 는 듣기 앞의 사건만 센다", () => {
    // B: 첫 시도 as 35ms 로 다시 시작, 둘째 시도 as 380ms 에 final
    const b = record(
      2,
      "B",
      [
        { type: "start-call", at: 1_000, attempt: 0 },
        { type: "audiostart", at: 1_035, attempt: 0 },
        { type: "abort-call", at: 2_500, attempt: 0, code: "fast-restart" },
        { type: "error", at: 2_510, attempt: 0, code: "aborted", message: "" },
        { type: "end", at: 2_520, attempt: 0 },
        { type: "start-call", at: 2_600, attempt: 1 },
        { type: "audiostart", at: 2_980, attempt: 1 },
        { type: "speechstart", at: 3_200.4, attempt: 1 },
        { type: "result", at: 3_300, attempt: 1, final: false, length: 2 },
        {
          type: "result",
          at: 3_500,
          attempt: 1,
          final: true,
          length: 5,
          finalText: "apple",
        },
        { type: "end", at: 5_600, attempt: 1 },
      ],
      [
        { startCallAt: 1_000, nth: 4, lastText: "" },
        { startCallAt: 2_600, nth: 5, lastText: "apple" },
      ],
    );
    expect(rowOf(b)).toMatchObject({
      nth: 4,
      sincePrevEndMs: 2_346,
      restarts: 1,
      audiostarts: [35, 380],
      audiostart: 380,
      soundstart: null,
      speechstart: 600,
      firstInterim: { ms: 700, length: 2 },
      final: { ms: 900, length: 5 },
      error: null,
      end: 3_000,
      speakEndToStart: null,
      cancelToStart: null,
      cancelWhileSpeaking: null,
      finalText: "apple",
      success: true,
    });

    // D(누름 밖 자동 시작): 읽기 끝 → 첫 start 호출
    const d = record(3, "D", [
      { type: "speak-start", at: 100, attempt: 0 },
      { type: "speak-end", at: 940, attempt: 0 },
      ...ok(3, "D").events,
    ]);
    expect(rowOf(d).speakEndToStart).toBe(60);
    // F(읽기 끝 뒤 누름): 아이가 누르기까지 기다린 시간이 들어간다
    const f = record(4, "F", [
      { type: "speak-start", at: 0, attempt: 0 },
      { type: "speak-end", at: 600, attempt: 0 },
      { type: "press", at: 999.6, attempt: 0 },
      ...ok(4, "F").events,
    ]);
    expect(rowOf(f)).toMatchObject({
      speakEndToStart: 400,
      cancelToStart: null,
    });
    // G(읽는 중 누름): cancel → start, cancel 뒤에 늦게 온 읽기 끝 · 오류는 '읽기 끝 뒤'에 세지 않는다
    const g = record(5, "G", [
      { type: "speak-start", at: 0, attempt: 0 },
      { type: "press", at: 996, attempt: 0 },
      { type: "speak-cancel", at: 997, attempt: 0, code: "speaking" },
      ...ok(5, "G").events,
      { type: "speak-error", at: 1_010, attempt: 0, code: "interrupted" },
      { type: "speak-end", at: 1_020, attempt: 0 },
    ]);
    expect(rowOf(g)).toMatchObject({
      speakEndToStart: null,
      cancelToStart: 3,
      cancelWhileSpeaking: true,
    });
    expect(rowOf(silent(6, "A")).error).toEqual({
      ms: 6_100,
      code: "aborted",
      message: "No speech detected",
    });

    const fast = FAST_AUDIOSTART_MS - 1;
    expect(
      fastRestartDue({ audiostartMs: fast, heard: false, restarts: 0 }),
    ).toBe(true);
    expect(
      fastRestartDue({
        audiostartMs: FAST_AUDIOSTART_MS,
        heard: false,
        restarts: 0,
      }),
    ).toBe(false);
    expect(
      fastRestartDue({ audiostartMs: fast, heard: true, restarts: 0 }),
    ).toBe(false);
    expect(
      fastRestartDue({ audiostartMs: null, heard: false, restarts: 0 }),
    ).toBe(false);
    expect(
      fastRestartDue({
        audiostartMs: fast,
        heard: false,
        restarts: MAX_FAST_RESTARTS,
      }),
    ).toBe(false);
  });

  it("복사 글은 환경 줄 · 요약 표 · 기록 표 · 원 기록 JSON 이고, JSON 은 저장 꼴로 다시 읽히며, 중간 결과는 시도마다 상한까지만 남긴다", () => {
    const interimOnly = record(
      4,
      "G",
      [
        { type: "speak-cancel", at: 990, attempt: 0, code: "ended" },
        { type: "start-call", at: 1_000, attempt: 0 },
        { type: "result", at: 1_500, attempt: 0, final: false, length: 3 },
        { type: "end", at: 3_000, attempt: 0 },
      ],
      [{ startCallAt: 1_000, nth: 4, lastText: "app" }],
    );
    interimOnly.droppedInterims = 2;
    const records = [
      ok(1, "A"),
      silent(2, "A"),
      ok(3, "E", "사과 | 배"),
      interimOnly,
    ];
    const text = copyTextOf(records, ENV);
    expect(text).toContain(`- UA: ${ENV.userAgent}`);
    expect(text).toContain("audioSession.type: auto");
    expect(text).toContain("| A | 2 | 1 | 50% |");
    expect(text).toContain("| B | 0 | 0 | - |");
    expect(text).toContain("| G | 1 | 0 | 0% |");
    // 기록 표: 둘째 줄은 as 35 · 오류 aborted · 들은 글 없음
    expect(text).toContain(
      '| 2 | 1 | A | en-US | 2 | 2346 | 0 | 35 | - | - | - | - | aborted "No speech detected" @6100 | 6120 | - | - | - | silence | - | - |',
    );
    // G: 취소 뒤 10ms(읽기가 이미 끝남) · 버린 중간 2 · 중간 글만
    expect(text).toContain("| 10(아니요) | - | silence | 2 | (중간) app |");
    // 칸 안의 '|' 는 막는다
    expect(text).toContain("사과 \\| 배");

    const json = text.split("```json\n")[1]?.split("\n```")[0] ?? "";
    const parsed = JSON.parse(json) as { env: ProbeEnv; records: unknown };
    expect(parsed.env).toEqual(ENV);
    expect(parseStored(JSON.stringify(parsed.records))).toEqual(records);
    // fix 1 앞의 저장 꼴(lastText · droppedInterims 없음)도 읽힌다
    const { droppedInterims: _dropped, ...oldRecord } = silent(2, "A");
    const oldShape = {
      ...oldRecord,
      attempts: oldRecord.attempts.map(({ lastText: _text, ...a }) => a),
    };
    expect(parseStored(JSON.stringify([oldShape]))).toEqual([silent(2, "A")]);
    expect(parseStored("{깨진")).toEqual([]);
    expect(parseStored(JSON.stringify([{ id: "x" }]))).toEqual([]);
    expect(parseStored(null)).toEqual([]);

    // 중간 결과 상한: 그 시도의 중간 결과가 MAX_INTERIM_EVENTS 개면 더 남기지 않고, final 과 다른 시도는 남긴다
    const full = record(
      8,
      "A",
      Array.from({ length: MAX_INTERIM_EVENTS }, (_, i) => ({
        type: "result" as const,
        at: 1_100 + i,
        attempt: 0,
        final: false,
        length: i,
      })),
    );
    expect(keepResultEvent(full, { attempt: 0, final: false })).toBe(false);
    expect(keepResultEvent(full, { attempt: 0, final: true })).toBe(true);
    expect(keepResultEvent(full, { attempt: 1, final: false })).toBe(true);
    full.events.pop();
    expect(keepResultEvent(full, { attempt: 0, final: false })).toBe(true);
  });
});

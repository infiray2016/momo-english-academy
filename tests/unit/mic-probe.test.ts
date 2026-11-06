// 마이크 점검 쪽(/dev/mic-probe)의 기록 요약 · ms 계산 · 복사 글 · 저장 · 기기 · 탭 표지(브리프 task-mic-probe 2026-11-06, fix 1 F · G —
// 검토 I-3 · M-4 · M-5, fix 2 H · I · K · L · M — 분석 task-mic-probe-analysis-report P1~P6). 순수 모듈만 덮는다.
import { describe, expect, it } from "vitest";
import {
  AUTO_GAP_MS,
  AUTO_PAUSE_45_MS,
  AUTO_PAUSE_90_MS,
  appendRecord,
  autoPlanOf,
  copyTextOf,
  deviceKindOf,
  FAST_AUDIOSTART_MS,
  fastRestartDue,
  keepResultEvent,
  LOG_BODY_MAX_CHARS,
  MAX_FAST_RESTARTS,
  MAX_INTERIM_EVENTS,
  type ProbeEnv,
  type ProbeEvent,
  type ProbeRecord,
  parseStored,
  recordLogOf,
  rowCells,
  rowOf,
  STRATEGIES,
  type Strategy,
  sentencesOf,
  sessionTypeOf,
  summaryLogOf,
  summaryOf,
  tabMarkOf,
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
    tabId: "t1",
    tabFirstLoad: true,
    navigationType: "navigate",
    resetStep: "as-is",
    strategy,
    lang: strategy === "E" ? "ko-KR" : "en-US",
    pressedAt: "2026-11-06T05:00:00.000Z",
    tapAt: 990,
    sincePrevEndMs: id === 1 ? null : 2_345.6,
    prevStopReason: id === 1 ? null : "no-result",
    prevStopMethod: id === 1 ? null : "stop",
    ttsBetween: id === 1 ? null : false,
    webAudioState: null,
    audioSessionType: "auto",
    visibilityAtStart: "visible",
    attempts,
    events,
    stopReason: "silence",
    stopMethod: "stop",
    droppedInterims: 0,
    autoRun: null,
    autoStep: null,
    decoy: null,
    unlockBefore: null,
    round: null,
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

const interimOnly = (id: number, strategy: Strategy) =>
  record(
    id,
    strategy,
    [
      { type: "start-call", at: 1_000, attempt: 0 },
      { type: "result", at: 1_900, attempt: 0, final: false, length: 3 },
      { type: "end", at: 3_000, attempt: 0 },
    ],
    [{ startCallAt: 1_000, nth: id, lastText: "app" }],
  );

const ENV: ProbeEnv = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
  platform: "MacIntel",
  maxTouchPoints: 5,
  device: "iPad",
  micPermission: "granted",
  visibility: "visible",
  audioSessionType: "auto",
  recognition: "webkitSpeechRecognition",
  tabId: "t1",
  tabFirstLoad: true,
  newTab: false,
  navigationType: "navigate",
  openedAt: "2026-11-06T12:00:00.000Z",
  load: 2,
  webAudioState: "running",
};

describe("마이크 점검 쪽 기록", () => {
  it("전략별 성공률은 final 결과가 있는 듣기 수 ÷ 누른 수이고, 중간 결과만 있는 듣기는 '중간만'으로 따로 세며, 누른 적 없는 전략은 null 이다", () => {
    const records = [
      ok(1, "A"),
      silent(2, "A"),
      ok(3, "A"),
      silent(4, "E"),
      interimOnly(5, "C"),
      ok(6, "F"),
      silent(7, "G"),
      interimOnly(8, "K"),
      ok(9, "L-ambient"),
      silent(10, "M"),
    ];
    const summary = summaryOf(records);
    expect(summary.map((s) => s.strategy)).toEqual([...STRATEGIES]);
    const by = Object.fromEntries(summary.map((s) => [s.strategy, s]));
    expect(by.A).toEqual({
      strategy: "A",
      tries: 3,
      successes: 2,
      interimOnly: 0,
      rate: 67,
    });
    expect(by.B).toMatchObject({ tries: 0, rate: null });
    expect(by.C).toMatchObject({
      tries: 1,
      successes: 0,
      interimOnly: 1,
      rate: 0,
    });
    expect(by.F).toMatchObject({ tries: 1, successes: 1, rate: 100 });
    expect(by.K).toMatchObject({ tries: 1, interimOnly: 1, rate: 0 });
    expect(by["L-ambient"]).toMatchObject({ tries: 1, rate: 100 });
    expect(by["L-playback"]).toMatchObject({ tries: 0, rate: null });
    expect(by.M).toMatchObject({ tries: 1, successes: 0, interimOnly: 0 });
  });

  it("ms 는 시도마다 그 start 호출 기준이고, B 는 빠른 시작 알림 · 소리 없음 · 횟수가 남았을 때만 다시 시작하며, 읽기 끝 · 취소 → start 는 듣기 앞의 마지막 사건을 센다", () => {
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
      prevStopReason: "no-result",
      ttsBetween: false,
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
      interimOnly: false,
    });

    // D(누름 밖 자동 시작): 읽기 끝 → 첫 start 호출
    const d = record(3, "D", [
      { type: "speak-start", at: 100, attempt: 0, utterance: "line" },
      { type: "speak-end", at: 940, attempt: 0, utterance: "line" },
      ...ok(3, "D").events,
    ]);
    expect(rowOf(d).speakEndToStart).toBe(60);
    // I(앱 첫 차례 재현): 무음 읽기 끝이 아니라 선생님 말 끝 → 쉼 · 누름 → start
    const i = record(4, "I", [
      { type: "speak-end", at: 50, attempt: 0, utterance: "unlock" },
      { type: "speak-end", at: 300, attempt: 0, utterance: "line" },
      { type: "press", at: 999.6, attempt: 0 },
      ...ok(4, "I").events,
    ]);
    expect(rowOf(i)).toMatchObject({
      speakEndToStart: 700,
      cancelToStart: null,
    });
    // G(읽는 중 누름): cancel → start, cancel 뒤에 늦게 온 읽기 끝 · 오류는 '읽기 끝 뒤'에 세지 않는다
    const g = record(5, "G", [
      { type: "speak-start", at: 0, attempt: 0, utterance: "line" },
      { type: "press", at: 996, attempt: 0 },
      { type: "speak-cancel", at: 997, attempt: 0, code: "speaking" },
      ...ok(5, "G").events,
      { type: "speak-error", at: 1_010, attempt: 0, code: "interrupted" },
      { type: "speak-end", at: 1_020, attempt: 0, utterance: "line" },
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

  it("복사 글은 환경 줄 · 요약 표 · 기록 표 · 원 기록 JSON 이고, 저장 꼴로 다시 읽히며(앞 판 꼴 포함), 붙일 때 번호를 매기고 상한을 지키며, 중간 결과는 시도마다 상한까지만 남긴다", () => {
    const g = record(
      4,
      "G",
      [
        { type: "speak-cancel", at: 990, attempt: 0, code: "ended" },
        ...interimOnly(4, "G").events,
      ],
      [{ startCallAt: 1_000, nth: 4, lastText: "app" }],
    );
    g.droppedInterims = 2;
    g.resetStep = "new-tab";
    g.webAudioState = "running";
    const records = [ok(1, "A"), silent(2, "A"), ok(3, "E", "사과 | 배"), g];
    const text = copyTextOf(records, ENV);
    expect(text).toContain(`- UA: ${ENV.userAgent}`);
    expect(text).toContain(
      "- 기기: iPad(platform MacIntel · 터치 점 5) · 마이크 권한: granted",
    );
    expect(text).toContain("탭: t1(이 쪽에서 첫 듣기: 예)");
    expect(text).toContain("무음 WebAudio: running");
    // 요약은 누른 전략만
    expect(text).toContain("| A | 2 | 1 | 0 | 50% |");
    expect(text).toContain("| G | 1 | 0 | 1 | 0% |");
    expect(text).not.toContain("| B | 0 |");
    // 기록 표: 둘째 줄은 앞 멈춤 no-result · 사이 읽기 아니요 · as 35 · 오류 aborted · 들은 글 없음
    expect(text).toContain(
      '| 2 | 1 | t1 | as-is | A | en-US | 2 | 2346 | no-result·stop | 아니요 | - | auto | 0 | 35 | - | - | - | - | - | - | - | - | aborted "No speech detected" @6100 | 6120 | - | - | - | silence·stop | - | - |',
    );
    // G: 새 탭 뒤 · WebAudio running · 취소 뒤 10ms(읽기가 이미 끝남) · 버린 중간 2 · 중간 글만
    expect(text).toContain("| 4 | 1 | t1 | new-tab | G |");
    expect(text).toContain(
      "| 10(아니요) | - | silence·stop | 2 | (중간) app |",
    );
    expect(text).toContain("사과 \\| 배");

    const json = text.split("```json\n")[1]?.split("\n```")[0] ?? "";
    const parsed = JSON.parse(json) as { env: ProbeEnv; records: unknown };
    expect(parsed.env).toEqual(ENV);
    expect(parseStored(JSON.stringify(parsed.records))).toEqual(records);
    // 앞 판 꼴(fix 2 의 탭 · 앞 세션 칸, fix 1 의 lastText · droppedInterims 가 없음)도 기본값으로 읽힌다
    const {
      droppedInterims: _dropped,
      tabId: _tab,
      tabFirstLoad: _first,
      navigationType: _nav,
      resetStep: _reset,
      prevStopReason: _prev,
      prevStopMethod: _prevMethod,
      stopMethod: _method,
      ttsBetween: _tts,
      webAudioState: _audio,
      audioSessionType: _session,
      autoRun: _run,
      autoStep: _step,
      decoy: _decoy,
      unlockBefore: _unlock,
      round: _round,
      ...oldRecord
    } = silent(2, "A");
    const oldShape = {
      ...oldRecord,
      attempts: oldRecord.attempts.map(({ lastText: _text, ...a }) => a),
    };
    expect(parseStored(JSON.stringify([oldShape]))).toEqual([
      {
        ...silent(2, "A"),
        tabId: "-",
        tabFirstLoad: null,
        navigationType: "-",
        resetStep: "as-is",
        prevStopReason: null,
        prevStopMethod: null,
        stopMethod: null,
        ttsBetween: null,
        webAudioState: null,
        audioSessionType: null,
        autoRun: null,
        autoStep: null,
        decoy: null,
        unlockBefore: null,
        round: null,
      },
    ]);
    expect(parseStored("{깨진")).toEqual([]);
    expect(parseStored(JSON.stringify([{ id: "x" }]))).toEqual([]);
    expect(parseStored(null)).toEqual([]);

    // 붙이기: 번호는 저장 목록의 가장 큰 번호 + 1, 상한을 넘으면 오래된 것부터 버린다
    const fresh = { ...ok(1, "K"), id: 0 };
    expect(
      appendRecord([ok(3, "A"), ok(7, "B")], fresh).map((r) => r.id),
    ).toEqual([3, 7, 8]);
    expect(appendRecord([], fresh)[0]?.id).toBe(1);
    expect(
      appendRecord([ok(1, "A"), ok(2, "A")], fresh, 2).map((r) => r.id),
    ).toEqual([2, 3]);

    // 중간 결과 상한: 그 시도의 중간 결과가 MAX_INTERIM_EVENTS 개면 더 남기지 않고, final 과 다른 시도는 남긴다
    const full = record(
      8,
      "A",
      Array.from({ length: MAX_INTERIM_EVENTS }, (_, n) => ({
        type: "result" as const,
        at: 1_100 + n,
        attempt: 0,
        final: false,
        length: n,
      })),
    );
    expect(keepResultEvent(full, { attempt: 0, final: false })).toBe(false);
    expect(keepResultEvent(full, { attempt: 0, final: true })).toBe(true);
    expect(keepResultEvent(full, { attempt: 1, final: false })).toBe(true);
    full.events.pop();
    expect(keepResultEvent(full, { attempt: 0, final: false })).toBe(true);
  });

  it("기기 종류는 데스크톱 꼴 UA 의 iPad 를 터치 점으로 가르고, 탭 표지는 없을 때 · 새 탭일 때만 새로 만들며, L 전략은 audioSession.type 넷에 맞는다", () => {
    const mac =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
    expect(
      deviceKindOf({ userAgent: mac, platform: "MacIntel", maxTouchPoints: 5 }),
    ).toBe("iPad");
    expect(
      deviceKindOf({ userAgent: mac, platform: "MacIntel", maxTouchPoints: 0 }),
    ).toBe("Mac");
    expect(
      deviceKindOf({
        userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)",
        platform: "iPad",
        maxTouchPoints: 5,
      }),
    ).toBe("iPad");
    expect(
      deviceKindOf({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X)",
        platform: "iPhone",
        maxTouchPoints: 5,
      }),
    ).toBe("iPhone");
    expect(
      deviceKindOf({
        userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
        platform: "Linux x86_64",
        maxTouchPoints: 0,
      }),
    ).toBe("기타");

    const make = () => "new1";
    expect(tabMarkOf(null, false, make)).toEqual({
      tabId: "new1",
      firstLoad: true,
    });
    expect(tabMarkOf("", false, make)).toEqual({
      tabId: "new1",
      firstLoad: true,
    });
    expect(tabMarkOf("old1", false, make)).toEqual({
      tabId: "old1",
      firstLoad: false,
    });
    // window.open 이 sessionStorage 를 복사해도 '#newtab' 이면 새 표지
    expect(tabMarkOf("old1", true, make)).toEqual({
      tabId: "new1",
      firstLoad: true,
    });

    expect(sessionTypeOf("L-transient")).toBe("transient");
    expect(sessionTypeOf("L-transient-solo")).toBe("transient-solo");
    expect(sessionTypeOf("L-ambient")).toBe("ambient");
    expect(sessionTypeOf("L-playback")).toBe("playback");
    expect(sessionTypeOf("A")).toBeUndefined();
    expect(sessionTypeOf("K")).toBeUndefined();
  });
  it("S · S2 는 한 세션의 final ms 를 모두 남기고, 세션 중 읽기는 부른 수 · 시작 알림 수 · 앞 뒤 결과 수 · 뒤 final 수와 읽은 문장 낱말이 들렸는지를 남기며, T 는 abort 로 끝낸 것이 다음 기록의 앞 멈춤에 붙는다", () => {
    const final = (at: number, text: string): ProbeEvent => ({
      type: "result",
      at,
      attempt: 0,
      final: true,
      length: text.length,
      finalText: text,
    });
    // S: 10초 간격 세 번 → final 셋, 상한 전에 '멈추기'
    const s1 = record(
      2,
      "S",
      [
        { type: "start-call", at: 1_000, attempt: 0 },
        { type: "audiostart", at: 1_300, attempt: 0 },
        final(4_000, "apple"),
        final(14_000, "apple banana"),
        final(24_500, "apple banana cat"),
        { type: "stop-call", at: 30_000, attempt: 0, code: "user" },
        { type: "end", at: 30_100, attempt: 0 },
      ],
      [{ startCallAt: 1_000, nth: 2, lastText: "apple banana cat" }],
    );
    s1.stopReason = "user";
    expect(rowOf(s1)).toMatchObject({
      finalMs: [3_000, 13_000, 23_500],
      sessionSpeak: null,
      end: 29_100,
    });
    // S2: 첫 final 뒤 읽기, 읽은 문장의 낱말(say · word)이 결과에 들었다
    const s2 = record(
      3,
      "S2",
      [
        { type: "start-call", at: 1_000, attempt: 0 },
        final(3_000, "apple"),
        { type: "speak-start", at: 3_050, attempt: 0, utterance: "line" },
        {
          type: "result",
          at: 4_000,
          attempt: 0,
          final: false,
          length: 20,
        },
        { type: "speak-end", at: 4_600, attempt: 0, utterance: "line" },
        final(9_000, "apple please say one word"),
        { type: "error", at: 9_500, attempt: 0, code: "aborted", message: "" },
        { type: "end", at: 9_600, attempt: 0 },
      ],
      [{ startCallAt: 1_000, nth: 3, lastText: "apple please say one word" }],
    );
    s2.stopReason = "natural";
    s2.stopMethod = null;
    const r2 = rowOf(s2);
    expect(r2).toMatchObject({
      finalMs: [2_000, 8_000],
      // fix 5 앞 꼴(speak-call 없음)은 시작 알림으로 센다
      sessionSpeak: {
        calls: 0,
        started: 1,
        before: 1,
        after: 2,
        finalsAfter: 1,
        echoed: true,
      },
      // 세션 중 읽기는 듣기 앞 읽기가 아니다
      speakEndToStart: null,
      stopReason: "natural",
      stopMethod: null,
    });
    // S2 에서 읽기 뒤 결과가 없으면 들림은 아니요
    const quiet = record(4, "S2", [
      { type: "start-call", at: 1_000, attempt: 0 },
      final(3_000, "apple"),
      { type: "speak-start", at: 3_050, attempt: 0, utterance: "line" },
      { type: "end", at: 6_000, attempt: 0 },
    ]);
    expect(rowOf(quiet).sessionSpeak).toEqual({
      calls: 0,
      started: 1,
      before: 1,
      after: 0,
      finalsAfter: 0,
      echoed: false,
    });
    // S + '세션 중 읽기' 두 번(fix 5): 누름 안 무음 읽기 부름은 세지 않고, 두 번 불렀는데 시작 알림이 하나면 하나는 버려졌다
    const sCall = (at: number, speaking: boolean): ProbeEvent => ({
      type: "speak-call",
      at,
      attempt: 0,
      utterance: "line",
      speaking,
      pending: false,
      code: `speaking=${speaking} pending=false`,
    });
    const sMid = record(5, "S", [
      {
        type: "speak-call",
        at: 999,
        attempt: 0,
        utterance: "unlock",
        speaking: false,
        pending: false,
      },
      { type: "start-call", at: 1_000, attempt: 0 },
      final(3_000, "apple"),
      { type: "press", at: 4_000, attempt: 0 },
      sCall(4_001, false),
      { type: "speak-start", at: 4_050, attempt: 0, utterance: "line" },
      { type: "speak-end", at: 5_000, attempt: 0, utterance: "line" },
      final(7_000, "apple banana"),
      final(9_000, "apple banana cat"),
      { type: "press", at: 10_000, attempt: 0 },
      sCall(10_001, false),
      final(11_000, "apple banana cat dog"),
      { type: "stop-call", at: 14_000, attempt: 0, code: "user" },
      { type: "end", at: 14_100, attempt: 0 },
    ]);
    const rowMid = rowOf(sMid);
    expect(rowMid.sessionSpeak).toEqual({
      calls: 2,
      started: 1,
      before: 1,
      after: 3,
      finalsAfter: 3,
      echoed: false,
    });
    expect(rowCells(rowMid)).toContain("2·1 / 1·3 · 3 · 아니요");
    // T 뒤 기록: 앞 멈춤에 abort 가 붙는다
    const t = ok(5, "T");
    t.stopMethod = "abort";
    const next = ok(6, "T-next");
    next.prevStopReason = "silence";
    next.prevStopMethod = "abort";
    const text = copyTextOf([t, next], ENV);
    expect(text).toContain(
      "| 6 | 1 | t1 | as-is | T-next | en-US | 6 | 2346 | silence·abort |",
    );
    expect(text).toContain("| silence·abort | - | apple |");
    expect(text).toContain("| T | 1 | 1 | 0 | 100% |");
    expect(text).toContain("| T-next | 1 | 1 | 0 | 100% |");
  });
  it("자동 측정 순서는 A · 45초 쉼 A · 90초 쉼 A · H · I · L 넷 · T · T 뒤 A · K 셋 · WebAudio 끄기 · A 이고, 첫 차례만 기다림 0 · 나머지는 2초 간격이다", () => {
    const plan = autoPlanOf();
    expect(
      plan.map((s) => (s.kind === "listen" ? s.strategy : "webaudio-off")),
    ).toEqual([
      "A",
      "A",
      "A",
      "H",
      "I",
      "L-transient",
      "L-transient-solo",
      "L-ambient",
      "L-playback",
      "T",
      "T-next",
      "K",
      "K",
      "K",
      "webaudio-off",
      "A",
    ]);
    expect(plan.map((s) => s.waitMs)).toEqual([
      0,
      AUTO_PAUSE_45_MS,
      AUTO_PAUSE_90_MS,
      ...Array.from({ length: 11 }, () => AUTO_GAP_MS),
      0,
      AUTO_GAP_MS,
    ]);
    const resets = plan.flatMap((s) =>
      s.kind === "listen" ? [s.resetStep] : [],
    );
    expect(resets.slice(0, 3)).toEqual(["as-is", "pause-45", "pause-90"]);
    expect(new Set(resets.slice(3))).toEqual(new Set(["as-is"]));
    // I 는 앱 읽기 대기열처럼 문장마다 읽는다(검토 M-a)
    expect(
      sentencesOf(
        "Hello! I'm Mina. It's nice to meet you. Let's learn English together!",
      ),
    ).toEqual([
      "Hello!",
      "I'm Mina.",
      "It's nice to meet you.",
      "Let's learn English together!",
    ]);
    expect(sentencesOf("  ")).toEqual([]);
  });

  it("서버 로그 몸은 들은 글 대신 길이만 넣고 상한을 넘으면 사건 목록을 빼며, 자동 끝 요약은 그 회차의 기록만 센다", () => {
    const rec = ok(3, "A", "apple");
    rec.autoRun = "run1";
    rec.autoStep = 0;
    const body = recordLogOf(rec, ENV);
    expect(body).not.toContain("apple");
    const parsed = JSON.parse(body) as {
      kind: string;
      autoRun: string;
      row: { finalLength: number; heardLength: number };
      events: unknown[];
    };
    expect(parsed.kind).toBe("record");
    expect(parsed.autoRun).toBe("run1");
    expect(parsed.row).toMatchObject({ finalLength: 5, heardLength: 5 });
    expect(parsed.events[0]).toEqual(["start-call", 10, 0, null, null, null]);

    const big = ok(4, "B");
    big.events = Array.from({ length: 400 }, (_, n) => ({
      type: "error" as const,
      at: 1_000 + n,
      attempt: 0,
      code: "aborted-long-code-to-fill",
    }));
    const lean = recordLogOf(big, ENV);
    expect(lean.length).toBeLessThanOrEqual(LOG_BODY_MAX_CHARS);
    expect(JSON.parse(lean)).toMatchObject({
      truncated: true,
      eventCount: 400,
    });

    const other = silent(5, "A");
    other.autoRun = "run2";
    const summary = JSON.parse(summaryLogOf([rec, other], ENV, "run1", 1)) as {
      kind: string;
      hiddenCount: number;
      summary: { strategy: string; tries: number }[];
      steps: unknown[][];
    };
    expect(summary).toMatchObject({ kind: "summary", hiddenCount: 1 });
    expect(summary.summary).toEqual([
      { strategy: "A", tries: 1, successes: 1, interimOnly: 0, rate: 100 },
    ]);
    expect(summary.steps).toEqual([
      [0, "A", "as-is", 2346, [380], true, "silence", false],
    ]);
  });
  it("W 는 버림 세션(시도 1)의 길이 · as · 살아 있음 · 버림 중 읽기 부름/시작과 진짜 세션(시도 2)의 as · 결과를 남기고, 앞 '읽기 제약 풀기'는 누른 뒤 ms · 시작 · 끝 알림으로 남는다", () => {
    const fin = (at: number, attempt: number): ProbeEvent => ({
      type: "result",
      at,
      attempt,
      final: true,
      length: 5,
      finalText: "apple",
    });
    // W10 읽기 켬: 버림 as 35(못 듣는 꼴) · 2초 때 읽기 부름(시작 알림 없음 — 버려짐) → 10초 뒤 stop → 1초 뒤 진짜 as 380 · 성공
    const w = record(
      2,
      "W10",
      [
        { type: "start-call", at: 1_000, attempt: 0 },
        { type: "audiostart", at: 1_035, attempt: 0 },
        {
          type: "speak-call",
          at: 3_000,
          attempt: 0,
          utterance: "line",
          speaking: false,
          pending: false,
        },
        { type: "stop-call", at: 11_000, attempt: 0, code: "decoy" },
        { type: "end", at: 11_100, attempt: 0 },
        { type: "start-call", at: 12_100, attempt: 1 },
        { type: "audiostart", at: 12_480, attempt: 1 },
        fin(14_000, 1),
        { type: "end", at: 16_500, attempt: 1 },
      ],
      [
        { startCallAt: 1_000, nth: 2, lastText: "" },
        { startCallAt: 12_100, nth: 3, lastText: "apple" },
      ],
    );
    w.decoy = { lengthMs: 10_000, speak: true };
    w.unlockBefore = {
      ageMs: 4_321.4,
      started: true,
      ended: false,
      error: null,
    };
    const row = rowOf(w);
    expect(row.decoy).toEqual({
      lengthMs: 10_000,
      speak: true,
      as: 35,
      alive: false,
      speakCalls: 1,
      speakStarts: 0,
      realAs: 380,
      realSuccess: true,
    });
    // W 는 세션 중 읽기 칸에 넣지 않는다(S · S2 만)
    expect(row.sessionSpeak).toBeNull();
    const cells = rowCells(row);
    expect(cells).toContain("10s·35·아니요·1/0 → 380·성공");
    expect(cells).toContain("4321·예·아니요");

    // W3 읽기 끔: 버림이 살아 있으면(as 300 > 250) 표시하고 abort → 곧바로 진짜. 진짜는 실패
    const alive = record(
      3,
      "W3",
      [
        { type: "start-call", at: 1_000, attempt: 0 },
        { type: "audiostart", at: 1_300, attempt: 0 },
        { type: "decoy-alive", at: 1_301, attempt: 0, code: "300" },
        { type: "abort-call", at: 1_302, attempt: 0, code: "decoy" },
        { type: "end", at: 1_400, attempt: 0 },
        { type: "start-call", at: 1_401, attempt: 1 },
        { type: "audiostart", at: 1_440, attempt: 1 },
        { type: "end", at: 9_000, attempt: 1 },
      ],
      [
        { startCallAt: 1_000, nth: 4, lastText: "" },
        { startCallAt: 1_401, nth: 5, lastText: "" },
      ],
    );
    alive.decoy = { lengthMs: 3_000, speak: false };
    expect(rowCells(rowOf(alive))).toContain("3s·300·예·끔 → 39·실패");

    // 버림 뒤 진짜가 열리지 않았으면(멈추기) 진짜 칸은 '-'
    const cut = record(4, "W25", [
      { type: "start-call", at: 1_000, attempt: 0 },
      { type: "audiostart", at: 1_030, attempt: 0 },
      { type: "end", at: 5_000, attempt: 0 },
    ]);
    cut.decoy = { lengthMs: 25_000, speak: true };
    expect(rowCells(rowOf(cut))).toContain("25s·30·아니요·0/0 → -·-");
    // W 가 아니면 두 칸 모두 '-'
    expect(rowOf(ok(5, "A")).decoy).toBeNull();
  });
});

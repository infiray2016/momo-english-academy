// 음성 관찰 페이지 2판(task-speech-probe-2)의 순수 꼴: 입력 소리 세기(RMS) 요약 · 새 기록 줄의 글 · 복사 글.
// 소리는 다루지 않고 수치만 다룬다(7절 '녹음하지 않는다').
import { describe, expect, it } from "vitest";
import {
  AUTO_LISTEN_WAIT_SECONDS,
  BEEP_DURATION_MS,
  BEEP_END_GRACE_MS,
  byteSamplesToUnit,
  DEVICE_NAMES_NOTE,
  describeDeviceCounts,
  deviceLabelGroup,
  envFactLines,
  formatLevel,
  formatProbeLog,
  isMicBlockingSession,
  listenLatencyLines,
  listenSessionTexts,
  MIC_LEVEL_DURATION_MS,
  MIC_LEVEL_FRAMES,
  MIC_LEVEL_HEARD_RMS,
  MIC_LEVEL_SAMPLE_INTERVAL_MS,
  micLevelSummary,
  probeEntryDetail,
  RESUME_TIMEOUT_CODE,
  RESUME_WAIT_MS,
  restoreAfterSpeak,
  rmsOf,
  STOPPED_EARLY_CODE,
  speakEndGaps,
  speakEndGapText,
  summarizeLevels,
} from "@/app/dev/speech-probe/probe-audio";
import type {
  MicLevelResult,
  ProbeEnvFacts,
  SpeechTraceEntry,
} from "@/lib/speech/types";

const ENV: ProbeEnvFacts = {
  userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)",
  standalone: false,
  displayModeStandalone: false,
  visibility: "visible",
  audioSessionType: "auto",
  audioSessionState: "inactive",
  audioContext: {
    ok: true,
    sampleRate: 48_000,
    state: "suspended",
    outputLatency: undefined,
    baseLatency: 0.005,
  },
  voices: 40,
  englishVoices: 12,
};

describe("입력 소리 세기 요약", () => {
  it("rmsOf: 제곱 평균의 제곱근이고 빈 틀은 0 이다", () => {
    expect(rmsOf([0.5, -0.5, 0.5, -0.5])).toBeCloseTo(0.5);
    expect(rmsOf([0, 0, 0])).toBe(0);
    expect(rmsOf([])).toBe(0);
    expect(rmsOf(new Float32Array([0.3, -0.4]))).toBeCloseTo(
      Math.sqrt((0.09 + 0.16) / 2),
    );
  });

  it("byteSamplesToUnit: 0~255 바이트 틀을 -1~1 로 옮긴다(128 이 0)", () => {
    expect(byteSamplesToUnit([128, 0, 255])).toEqual([0, -1, 127 / 128]);
  });

  it("summarizeLevels: 최대 · 평균 · 문턱 이상인 틀의 비율을 내고 모두 0 인지 가린다", () => {
    const quiet = MIC_LEVEL_HEARD_RMS / 10;
    const loud = MIC_LEVEL_HEARD_RMS * 10;
    const summary = summarizeLevels([quiet, quiet, loud, loud]);
    expect(summary.frames).toBe(4);
    expect(summary.max).toBeCloseTo(loud);
    expect(summary.mean).toBeCloseTo((quiet + loud) / 2);
    expect(summary.heardRatio).toBe(0.5);
    expect(summary.allZero).toBe(false);

    expect(summarizeLevels([0, 0, 0])).toEqual({
      frames: 3,
      max: 0,
      mean: 0,
      heardRatio: 0,
      allZero: true,
    });
    expect(summarizeLevels([])).toEqual({
      frames: 0,
      max: 0,
      mean: 0,
      heardRatio: 0,
      allZero: true,
    });
  });

  it("summarizeLevels: 문턱과 같은 세기는 들린 것으로 센다", () => {
    expect(
      summarizeLevels([MIC_LEVEL_HEARD_RMS, 0], MIC_LEVEL_HEARD_RMS).heardRatio,
    ).toBe(0.5);
  });

  it("formatLevel: 0 은 0, 나머지는 유효 숫자 세 자리라 아주 작은 소리도 0 으로 뭉개지지 않는다", () => {
    expect(formatLevel(0)).toBe("0");
    expect(formatLevel(0.1)).toBe("0.100");
    expect(formatLevel(0.000_04)).toBe("0.0000400");
  });
});

const MEASURED: MicLevelResult = {
  ok: true,
  durationMs: 3_010,
  frames: 60,
  max: 0.1,
  mean: 0.05,
  heardRatio: 0.5,
  allZero: false,
  sampleRate: 48_000,
  contextState: "running",
  track: {
    group: "내장",
    muted: false,
    mutedAtEnd: false,
    readyState: "live",
    settings: { sampleRate: 48_000, echoCancellation: true },
  },
  stopped: true,
  audioSession: "play-and-record",
};

describe("화면 요약", () => {
  it("MIC_LEVEL_FRAMES: 재는 길이를 틀 간격으로 나눈 수다", () => {
    expect(MIC_LEVEL_FRAMES).toBe(
      Math.round(MIC_LEVEL_DURATION_MS / MIC_LEVEL_SAMPLE_INTERVAL_MS),
    );
  });

  it("micLevelSummary: 화면 요약에는 마이크 설정을 넣지 않고 '트랙' 낱말을 쓰지 않는다", () => {
    const text = micLevelSummary(MEASURED);
    expect(text).toContain("최대 0.100");
    expect(text).toContain("들린 비율 50%");
    expect(text).toContain("마이크 끔 예");
    expect(text).toContain("마이크 갈래 내장 live");
    expect(text).not.toContain("echoCancellation");
    expect(text).not.toContain("트랙");
  });

  it("describeDeviceCounts: 종류별 수를 적고 이름은 적지 않는다", () => {
    expect(
      describeDeviceCounts({
        ok: true,
        devices: [
          { kind: "audioinput", group: "내장" },
          { kind: "audioinput", group: "블루투스 · 외부" },
          { kind: "videoinput", group: "권한 전" },
        ],
      }),
    ).toBe("audioinput 2 · videoinput 1");
    expect(describeDeviceCounts({ ok: true, devices: [] })).toBe("0개");
    expect(describeDeviceCounts({ ok: false, code: "no-api" })).toBe(
      "실패 no-api",
    );
  });
});

describe("새 기록 줄의 글", () => {
  it("probeEntryDetail: mic-level 성공 줄에 최대 · 평균 · 들린 비율 · 마이크 끔 · 세션 꼴이 보인다", () => {
    const entry: SpeechTraceEntry = {
      at: 0,
      kind: "mic-level",
      result: MEASURED,
    };
    const text = probeEntryDetail(entry);
    expect(text).toContain("최대 0.100");
    expect(text).toContain("평균 0.0500");
    expect(text).toContain("들린 비율 50%");
    expect(text).toContain("마이크 끔 예");
    expect(text).toContain("처리기 running");
    expect(text).toContain("세션 play-and-record");
    expect(text).toContain("마이크 갈래 내장 live");
    expect(text).toContain("echoCancellation=true");
    expect(text).not.toContain("트랙");
  });

  it("probeEntryDetail: mic-level 실패 줄은 코드와 단계를 적는다", () => {
    expect(
      probeEntryDetail({
        at: 0,
        kind: "mic-level",
        result: {
          ok: false,
          code: "NotAllowedError",
          stage: "permission",
          audioSession: undefined,
        },
      }),
    ).toBe("실패 NotAllowedError · 단계 permission · 세션 없음");
  });

  it("probeEntryDetail: 모두 0 인 재기는 '모두 0' 을 덧붙인다", () => {
    const text = probeEntryDetail({
      at: 0,
      kind: "mic-level",
      result: {
        ok: true,
        durationMs: 3_000,
        frames: 60,
        max: 0,
        mean: 0,
        heardRatio: 0,
        allZero: true,
        sampleRate: 48_000,
        contextState: "suspended",
        track: {
          group: "권한 전",
          muted: true,
          mutedAtEnd: true,
          readyState: "live",
          settings: {},
        },
        stopped: true,
        audioSession: undefined,
      },
    });
    expect(text).toContain("모두 0");
    expect(text).toContain("마이크 소리 끊김(muted) 예 → 예");
  });

  it("probeEntryDetail: devices 줄은 단계 · 수 · kind 별 수와 이름 갈래만 적는다", () => {
    expect(
      probeEntryDetail({
        at: 0,
        kind: "devices",
        phase: "after-permission",
        result: {
          ok: true,
          devices: [
            { kind: "audioinput", group: "내장" },
            { kind: "audioinput", group: "블루투스 · 외부" },
            { kind: "audioinput", group: "블루투스 · 외부" },
            { kind: "videoinput", group: "권한 전" },
          ],
        },
      }),
    ).toBe(
      "after-permission · 4개 · audioinput 3[내장 1, 블루투스 · 외부 2] · videoinput 1[권한 전 1]",
    );
    expect(
      probeEntryDetail({
        at: 0,
        kind: "devices",
        phase: "after-permission",
        result: { ok: false, code: "no-api" },
      }),
    ).toBe("after-permission · 실패 no-api");
  });

  it("probeEntryDetail: beep · heard · audio-session 줄", () => {
    expect(
      probeEntryDetail({
        at: 0,
        kind: "beep",
        phase: "start",
        contextState: "running",
        audioSession: "playback",
        userActive: true,
      }),
    ).toBe("start · 처리기 running · 세션 playback · 누름 안 예");
    expect(probeEntryDetail({ at: 0, kind: "beep", phase: "end" })).toBe("end");
    expect(
      probeEntryDetail({
        at: 0,
        kind: "beep",
        phase: "error",
        code: "no-audio-context",
      }),
    ).toBe("error no-audio-context");
    expect(
      probeEntryDetail({
        at: 0,
        kind: "heard",
        test: "speak",
        heard: false,
        audioSession: undefined,
      }),
    ).toBe("speak · 안 들렸어요 · 세션 없음");
    expect(
      probeEntryDetail({
        at: 0,
        kind: "audio-session",
        action: "set",
        requested: "playback",
        before: "auto",
        after: "playback",
        userActive: undefined,
      }),
    ).toBe("auto → playback 요청 · 읽은 값 playback · 누름 안 없음");
    expect(
      probeEntryDetail({
        at: 0,
        kind: "audio-session",
        action: "set",
        requested: "ambient",
        before: "auto",
        after: "auto",
        threw: "TypeError",
        userActive: true,
      }),
    ).toBe("auto → ambient 요청 · 읽은 값 auto · 던짐 TypeError · 누름 안 예");
    expect(
      probeEntryDetail({
        at: 0,
        kind: "audio-session",
        action: "state",
        type: "play-and-record",
        state: "interrupted",
      }),
    ).toBe("상태 바뀜 interrupted · 꼴 play-and-record");
  });

  it("probeEntryDetail: env 줄은 실행 꼴 · 세션 · 처리기 · 음성 수를 한 줄로", () => {
    const text = probeEntryDetail({
      at: 0,
      kind: "env",
      reason: "load",
      facts: ENV,
    });
    expect(text).toBe(
      "load · standalone false · display-mode standalone 아니오 · 보이는 상태 visible · 세션 auto(inactive) · 처리기 48000Hz suspended 출력 지연 없음 기본 지연 0.005 · 음성 40 · 영어 12",
    );
  });
});

describe("기록 표 복사 글", () => {
  it("envFactLines: 사실을 한 줄씩(이름, 값)으로, 없는 API 는 '없음'", () => {
    const lines = envFactLines({
      ...ENV,
      standalone: undefined,
      audioSessionType: undefined,
      audioSessionState: undefined,
      audioContext: { ok: false, code: "no-audio-context" },
    });
    expect(lines).toEqual([
      ["UA", ENV.userAgent],
      ["navigator.standalone", "없음"],
      ["display-mode standalone", "아니오"],
      ["보이는 상태", "visible"],
      ["audioSession.type", "없음"],
      ["audioSession.state", "없음"],
      ["AudioContext", "실패 no-audio-context"],
      ["음성 수", "40"],
      ["영어 음성 수", "12"],
    ]);
  });

  it("formatProbeLog: 요약 줄이 있으면 사실 줄 · 빈 줄 뒤에 제목과 함께 두고 빈 줄 뒤에 표를 잇는다", () => {
    const text = formatProbeLog(
      [["UA", "가"]],
      [{ ms: 0, ids: "", kind: "env", detail: "load" }],
      ["듣기 1 · 객체 1 · start 이벤트 +50"],
    );
    expect(text.split("\n")).toEqual([
      DEVICE_NAMES_NOTE,
      "UA: 가",
      "",
      "듣기 지연(start 호출 기준 ms):",
      "듣기 1 · 객체 1 · start 이벤트 +50",
      "",
      "ms\t듣기 · 객체\t종류\t내용",
      "0\t\tenv\tload",
    ]);
  });

  it("formatProbeLog: 사실 줄을 머리에 한 줄씩 두고 빈 줄 뒤에 표 머리 · 줄을 탭으로 잇는다", () => {
    const text = formatProbeLog(
      [
        ["UA", "가\t나"],
        ["음성 수", "40"],
      ],
      [
        { ms: 0, ids: "", kind: "env", detail: "load\n둘째" },
        { ms: 12, ids: "1 · 1", kind: "recognizer-call", detail: "start" },
      ],
    );
    expect(text.split("\n")).toEqual([
      DEVICE_NAMES_NOTE,
      "UA: 가 나",
      "음성 수: 40",
      "",
      "ms\t듣기 · 객체\t종류\t내용",
      "0\t\tenv\tload 둘째",
      "12\t1 · 1\trecognizer-call\tstart",
    ]);
  });
});

describe("듣기 지연 요약", () => {
  const rule = { endSilenceMs: 3_000, capMs: 15_000, chunkMs: 15_000 };
  const call = (
    at: number,
    listen: number,
    recognizer: number,
    threw?: boolean,
  ): SpeechTraceEntry => ({
    at,
    kind: "recognizer-call",
    listen,
    recognizer,
    call: "start",
    ...(threw ? { threw } : {}),
  });
  const event = (
    at: number,
    listen: number,
    recognizer: number,
    type: "start" | "audiostart" | "soundstart" | "speechstart" | "end",
  ): SpeechTraceEntry => ({
    at,
    kind: "recognizer-event",
    listen,
    recognizer,
    event: { type },
  });

  it("listenLatencyLines: 되는 듣기는 start 호출 기준으로 start 이벤트 · audiostart(start 뒤 틈) · 첫 소리 · 첫 결과 · 끝을 한 줄로", () => {
    const trace: SpeechTraceEntry[] = [
      { at: 1_000, kind: "listen-begin", listen: 1, rule },
      call(1_002, 1, 1),
      event(1_010.4, 1, 1, "start"),
      event(1_267, 1, 1, "audiostart"),
      event(1_800, 1, 1, "speechstart"),
      event(1_810, 1, 1, "soundstart"),
      {
        at: 2_500,
        kind: "recognizer-event",
        listen: 1,
        recognizer: 1,
        event: {
          type: "result",
          results: [{ transcript: "Hello", isFinal: true }],
        },
      },
      event(4_000, 1, 1, "end"),
    ];
    expect(listenLatencyLines(trace)).toEqual([
      "듣기 1 · 객체 1 · 규칙 endSilenceMs=3000 capMs=15000 chunkMs=15000 · 읽어 주기 끝 → start 호출 없음 · start 이벤트 +8 · audiostart +265(start 뒤 +257) · speechstart +798 · 첫 결과 +1498 · end +2998",
    ]);
  });

  it("listenLatencyLines: start 이벤트와 audiostart 가 같은 ms 면 '같은 ms' 를 붙이고, 소리 · 결과가 없으면 없음 · 오류 코드로 끝을 적는다", () => {
    const trace: SpeechTraceEntry[] = [
      { at: 0, kind: "listen-begin", listen: 2, rule },
      call(1, 2, 1),
      event(5, 2, 1, "start"),
      event(5, 2, 1, "audiostart"),
      {
        at: 8_000,
        kind: "recognizer-event",
        listen: 2,
        recognizer: 1,
        event: {
          type: "error",
          error: "no-speech",
          message: "No speech detected",
        },
      },
      event(8_010, 2, 1, "end"),
    ];
    expect(listenLatencyLines(trace)).toEqual([
      "듣기 2 · 객체 1 · 규칙 endSilenceMs=3000 capMs=15000 chunkMs=15000 · 읽어 주기 끝 → start 호출 없음 · start 이벤트 +4 · audiostart +4(start 뒤 +0, 같은 ms) · 소리 없음 · 첫 결과 없음 · error no-speech +7999",
    ]);
  });

  it("listenLatencyLines: 한 듣기의 다시 시작 객체는 규칙 없이 줄을 잇고, start 가 던진 객체 · 이벤트가 없는 객체도 적는다", () => {
    const trace: SpeechTraceEntry[] = [
      { at: 0, kind: "listen-begin", listen: 3, rule },
      call(0, 3, 1, true),
      call(100, 3, 2),
    ];
    expect(listenLatencyLines(trace)).toEqual([
      "듣기 3 · 객체 1 · 규칙 endSilenceMs=3000 capMs=15000 chunkMs=15000 · 읽어 주기 끝 → start 호출 없음 · start 던짐",
      "듣기 3 · 객체 2 · start 이벤트 없음 · audiostart 없음 · 소리 없음 · 첫 결과 없음 · 끝 없음",
    ]);
  });
});

describe("오디오 세션 자동으로 두기(팀 리드 2026-10-22 — 원인 iPad 무음 모드)", () => {
  it("probeEntryDetail: 스위치가 바꾼 줄은 '자동', playback 단추가 바꾼 줄은 '단추'를 붙인다", () => {
    expect(
      probeEntryDetail({
        at: 0,
        kind: "audio-session",
        action: "set",
        requested: "play-and-record",
        before: "playback",
        after: "play-and-record",
        by: "auto",
        userActive: false,
      }),
    ).toBe(
      "playback → play-and-record 요청 · 읽은 값 play-and-record · 자동 · 누름 안 아니오",
    );
    expect(
      probeEntryDetail({
        at: 0,
        kind: "audio-session",
        action: "set",
        requested: "playback",
        before: "auto",
        after: "playback",
        by: "button",
        userActive: true,
      }),
    ).toBe("auto → playback 요청 · 읽은 값 playback · 단추 · 누름 안 예");
  });

  it("listenLatencyLines: 듣기 첫 객체 줄에 그 듣기 앞의 세션 꼴(쪽이 열릴 때 값 · 바꾼 값 · 상태 바뀜)을 적는다", () => {
    const rule = { endSilenceMs: 3_000, chunkMs: 15_000 };
    const trace: SpeechTraceEntry[] = [
      { at: 0, kind: "env", reason: "load", facts: ENV },
      { at: 10, kind: "listen-begin", listen: 1, rule },
      {
        at: 11,
        kind: "recognizer-call",
        listen: 1,
        recognizer: 1,
        call: "start",
      },
      {
        at: 20,
        kind: "audio-session",
        action: "set",
        requested: "play-and-record",
        before: "auto",
        after: "play-and-record",
        by: "auto",
        userActive: true,
      },
      { at: 30, kind: "listen-begin", listen: 2, rule },
      {
        at: 31,
        kind: "recognizer-call",
        listen: 2,
        recognizer: 1,
        call: "start",
      },
    ];
    const [first, second] = listenLatencyLines(trace);
    expect(first).toContain(
      "규칙 endSilenceMs=3000 chunkMs=15000 · 세션 auto · ",
    );
    expect(second).toContain(
      "규칙 endSilenceMs=3000 chunkMs=15000 · 세션 play-and-record · ",
    );
  });
});

describe("fix 1 — 장치 이름 갈래 · 처리기 깨우기 상한 · 비프 end 없음 · 누름 안 여부(검토 review-speech-probe-2)", () => {
  it.each([
    ["홍길동의 AirPods", "블루투스 · 외부"],
    ["Hong's AirPods Pro", "블루투스 · 외부"],
    ["Beats Flex", "블루투스 · 외부"],
    ["BT Speaker", "블루투스 · 외부"],
    ["Bluetooth Mic", "블루투스 · 외부"],
    ["무선 헤드셋", "블루투스 · 외부"],
    ["USB Headset", "블루투스 · 외부"],
    ["유선 이어폰", "블루투스 · 외부"],
    ["Galaxy Earbuds", "블루투스 · 외부"],
    ["iPad 마이크", "내장"],
    ["Built-in Microphone", "내장"],
    ["MacBook Pro 마이크", "내장"],
    ["내장 마이크", "내장"],
    ["", "권한 전"],
    ["USB Audio Device", "그 밖"],
  ] as const)(
    "deviceLabelGroup: %j → %s, 원문 이름은 결과에 없다",
    (label, group) => {
      const result = deviceLabelGroup(label);
      expect(result).toBe(group);
      if (label !== "") expect(result).not.toContain(label);
    },
  );

  it("deviceLabelGroup: 'BT' 는 낱말일 때만(다른 낱말 속 bt 는 그 밖)", () => {
    expect(deviceLabelGroup("Subtitle Mic")).toBe("그 밖");
  });

  it("formatProbeLog: 첫 줄은 '기기 이름은 기록에 넣지 않아요'", () => {
    expect(DEVICE_NAMES_NOTE).toBe("기기 이름은 기록에 넣지 않아요");
    expect(formatProbeLog([], []).split("\n")[0]).toBe(DEVICE_NAMES_NOTE);
  });

  it("probeEntryDetail: 처리기 깨우기 상한을 넘은 재기는 수치 없이 '처리기 깨우기 없음(상한)' · 처리기 상태 · 마이크 끔을 적는다", () => {
    expect(
      probeEntryDetail({
        at: 0,
        kind: "mic-level",
        result: {
          ok: false,
          code: RESUME_TIMEOUT_CODE,
          stage: "audio",
          audioSession: "play-and-record",
          contextState: "suspended",
          stopped: true,
        },
      }),
    ).toBe(
      `처리기 깨우기 없음(상한 ${RESUME_WAIT_MS}ms) · 처리기 suspended · 마이크 끔 예 · 세션 play-and-record`,
    );
    expect(
      probeEntryDetail({
        at: 0,
        kind: "mic-level",
        result: {
          ok: false,
          code: STOPPED_EARLY_CODE,
          stage: "audio",
          audioSession: undefined,
          contextState: "suspended",
          stopped: true,
        },
      }),
    ).toBe(
      "처리기 깨우기 전에 멈춤 · 처리기 suspended · 마이크 끔 예 · 세션 없음",
    );
  });

  it("probeEntryDetail: 비프 end 없음 줄은 기다린 ms 와 처리기를 닫았음을 적는다", () => {
    expect(
      probeEntryDetail({
        at: 0,
        kind: "beep",
        phase: "no-end",
        waitedMs: BEEP_DURATION_MS + BEEP_END_GRACE_MS,
      }),
    ).toBe(
      `end 없음(${BEEP_DURATION_MS + BEEP_END_GRACE_MS}ms 기다림) · 처리기 닫음`,
    );
  });

  it("probeEntryDetail: 읽어 주기 요청 줄은 어디서 · 몇째 문장 · 세션 · 누름 안 여부를 적는다", () => {
    expect(
      probeEntryDetail({
        at: 0,
        kind: "speak-request",
        source: "alternation",
        turn: 2,
        audioSession: "playback",
        userActive: false,
      }),
    ).toBe("alternation 2째 문장 · 세션 playback · 누름 안 아니오");
    expect(
      probeEntryDetail({
        at: 0,
        kind: "speak-request",
        source: "speak-playback",
        audioSession: undefined,
        userActive: undefined,
      }),
    ).toBe("speak-playback · 세션 없음 · 누름 안 없음");
  });
});

describe("3판 — 읽어 주기 끝 → 인식 start 호출 간격 · 자동 듣기(실측 6)", () => {
  const rule = { endSilenceMs: 3_000, chunkMs: 15_000 };
  const trace: SpeechTraceEntry[] = [
    // 제약 풀기(빈칸) 읽기의 끝은 세지 않는다.
    { at: 0, kind: "speak", text: " ", voice: undefined },
    { at: 1, kind: "speak-event", type: "start" },
    { at: 2, kind: "speak-event", type: "end" },
    { at: 10, kind: "listen-begin", listen: 1, rule },
    {
      at: 11,
      kind: "recognizer-call",
      listen: 1,
      recognizer: 1,
      call: "start",
    },
    { at: 100, kind: "speak", text: "I like apples.", voice: "Samantha" },
    { at: 150, kind: "speak-event", type: "start" },
    { at: 1_600, kind: "speak-event", type: "end" },
    { at: 3_599, kind: "listen-begin", listen: 2, rule },
    {
      at: 3_600.4,
      kind: "recognizer-call",
      listen: 2,
      recognizer: 1,
      call: "start",
    },
    {
      at: 4_000,
      kind: "recognizer-call",
      listen: 2,
      recognizer: 2,
      call: "start",
    },
  ];

  it("speakEndGaps: 듣기마다 첫 start 호출 앞의 마지막 읽어 주기 끝까지의 간격, 읽어 주기가 없었으면 none(빈칸 제약 풀기는 빼고)", () => {
    expect(speakEndGaps(trace)).toEqual({
      1: { kind: "none" },
      2: { kind: "ended", gapMs: 2_000 },
    });
  });

  it("listenLatencyLines: 듣기 첫 객체 줄에 '읽어 주기 끝 → start 호출' 간격을, 다시 시작 객체 줄에는 적지 않는다", () => {
    const lines = listenLatencyLines(trace);
    expect(lines[0]).toContain("· 읽어 주기 끝 → start 호출 없음 ·");
    expect(lines[1]).toContain("· 읽어 주기 끝 → start 호출 +2000 ·");
    expect(lines[2]).not.toContain("읽어 주기 끝");
  });

  it("AUTO_LISTEN_WAIT_SECONDS: 대기 초는 0 · 2 · 5 · 10", () => {
    expect(AUTO_LISTEN_WAIT_SECONDS).toEqual([0, 2, 5, 10]);
  });

  it("probeEntryDetail: auto-listen 줄은 몇째 문장 · 읽어 주기 결과 · 기다린 ms · 누름 없이 · 누름 안 여부를 적는다", () => {
    expect(
      probeEntryDetail({
        at: 0,
        kind: "auto-listen",
        turn: 1,
        speakOutcome: "ended",
        waitMs: 2_000,
        userActive: false,
      }),
    ).toBe(
      "교대 1째 문장 · 읽어 주기 ended 뒤 2000ms 기다려 누름 없이 듣기 시작 · 누름 안 아니오",
    );
  });
});

describe("3판 바뀐 요청 — playback 되돌림 · 재생 전용 꼴 경고 · listen-begin 줄의 꼴(요청자 지적)", () => {
  it("probeEntryDetail: playback 단추가 발화 뒤 앞 꼴로 되돌린 줄은 '되돌림'", () => {
    expect(
      probeEntryDetail({
        at: 0,
        kind: "audio-session",
        action: "set",
        requested: "auto",
        before: "playback",
        after: "auto",
        by: "restore",
        userActive: false,
      }),
    ).toBe("playback → auto 요청 · 읽은 값 auto · 되돌림 · 누름 안 아니오");
  });

  it.each([
    [
      "listen",
      "재생 전용 꼴(playback)에서 듣기 시작 — 마이크가 안 열릴 수 있음",
    ],
    [
      "mic-check",
      "재생 전용 꼴(playback)에서 마이크 확인 시작 — 마이크가 안 열릴 수 있음",
    ],
    [
      "mic-level",
      "재생 전용 꼴(playback)에서 마이크 소리 재기 시작 — 마이크가 안 열릴 수 있음",
    ],
  ] as const)("probeEntryDetail: session-warning %s 줄", (action, text) => {
    expect(
      probeEntryDetail({
        at: 0,
        kind: "session-warning",
        action,
        type: "playback",
      }),
    ).toBe(text);
  });

  it("listenSessionTexts: 듣기마다 시작 때의 꼴(env · 바꾼 값 · 되돌린 값 가운데 마지막), 알 수 없으면 빠진다", () => {
    const rule = { endSilenceMs: 3_000, chunkMs: 15_000 };
    const trace: SpeechTraceEntry[] = [
      { at: 0, kind: "listen-begin", listen: 1, rule },
      { at: 1, kind: "env", reason: "load", facts: ENV },
      { at: 2, kind: "listen-begin", listen: 2, rule },
      {
        at: 3,
        kind: "audio-session",
        action: "set",
        requested: "playback",
        before: "auto",
        after: "playback",
        by: "button",
        userActive: true,
      },
      { at: 4, kind: "listen-begin", listen: 3, rule },
    ];
    expect(listenSessionTexts(trace)).toEqual({
      2: "세션 auto",
      3: "세션 playback",
    });
  });
});

describe("3판 fix 1 — 간격은 마지막 문장 요청 기준(검토 review-speech-probe-3 I-1) · ambient 경고(M-1) · 되돌림 규칙(M-2)", () => {
  const rule = { endSilenceMs: 3_000, chunkMs: 15_000 };
  const speak = (at: number, text: string): SpeechTraceEntry => ({
    at,
    kind: "speak",
    text,
    voice: undefined,
  });
  const ended = (at: number): SpeechTraceEntry => ({
    at,
    kind: "speak-event",
    type: "end",
  });
  const cut = (at: number, code = "interrupted"): SpeechTraceEntry => ({
    at,
    kind: "speak-event",
    type: "error",
    code,
  });
  const listenAt = (at: number, listen = 1): SpeechTraceEntry[] => [
    { at, kind: "listen-begin", listen, rule },
    { at, kind: "recognizer-call", listen, recognizer: 1, call: "start" },
  ];

  it("(가) 문장 둘: 둘째 문장 요청 뒤에는 첫 문장의 끝을 쓰지 않는다 — 둘째 문장을 읽는 중이면 '읽는 중', 끝난 뒤면 둘째 끝 기준", () => {
    const reading = [
      speak(0, "First."),
      ended(1_000),
      speak(5_000, "Second."),
      ...listenAt(5_500),
    ];
    expect(speakEndGaps(reading)).toEqual({
      1: { kind: "speaking", sinceMs: 500 },
    });
    const afterSecond = [
      speak(0, "First."),
      ended(1_000),
      speak(5_000, "Second."),
      ended(6_000),
      ...listenAt(6_700),
    ];
    expect(speakEndGaps(afterSecond)).toEqual({
      1: { kind: "ended", gapMs: 700 },
    });
  });

  it("(나) 문장을 읽는 중(끝 사건 전)에 시작한 듣기는 간격 대신 '읽는 중(끝 전 +N ms)'", () => {
    const trace = [speak(0, "Hello."), ...listenAt(800)];
    expect(speakEndGaps(trace)).toEqual({
      1: { kind: "speaking", sinceMs: 800 },
    });
    expect(listenLatencyLines(trace)[0]).toContain(
      "· 읽어 주기 읽는 중(끝 전 +800 ms) ·",
    );
    expect(speakEndGapText({ kind: "speaking", sinceMs: 800 })).toBe(
      "읽어 주기 읽는 중(끝 전 +800 ms)",
    );
  });

  it("(다) 빈칸 제약 풀기 발화의 끝이 문장 요청 뒤에 와도 셈에 들지 않는다(순서 무관)", () => {
    const lateBlank = [
      speak(0, " "),
      speak(1, "Hello."),
      ended(5),
      ...listenAt(10),
    ];
    expect(speakEndGaps(lateBlank)).toEqual({
      1: { kind: "speaking", sinceMs: 9 },
    });
    const thenSentenceEnds = [
      speak(0, " "),
      speak(1, "Hello."),
      ended(5),
      ended(1_500),
      ...listenAt(3_500),
    ];
    expect(speakEndGaps(thenSentenceEnds)).toEqual({
      1: { kind: "ended", gapMs: 2_000 },
    });
  });

  it("(라) 끊김(오류)으로 끝난 문장은 그 오류 시각을 끝으로 두고 '끊김'을 적는다", () => {
    const trace = [speak(0, "Hello."), cut(700), ...listenAt(700)];
    expect(speakEndGaps(trace)).toEqual({
      1: { kind: "ended", gapMs: 0, error: "interrupted" },
    });
    expect(
      speakEndGapText({ kind: "ended", gapMs: 0, error: "interrupted" }),
    ).toBe("읽어 주기 끝(끊김 interrupted) → start 호출 +0");
  });

  it("가짜 cancel 비동기 순서: 듣기가 읽기를 끊고 그 오류 사건이 start 호출 뒤에 오면 그 듣기는 '읽는 중'에 시작한 것이다", () => {
    const trace = [speak(0, "Hello."), ...listenAt(700), cut(701)];
    expect(speakEndGaps(trace)).toEqual({
      1: { kind: "speaking", sinceMs: 700 },
    });
  });

  it.each([
    ["playback", true],
    ["ambient", true],
    ["auto", false],
    ["play-and-record", false],
    [undefined, false],
  ] as const)("isMicBlockingSession: %s → %s", (type, blocking) => {
    expect(isMicBlockingSession(type)).toBe(blocking);
  });

  it("restoreAfterSpeak: 발화가 끊겨(cancelled) 끝나도 앞 꼴로 되돌린다", () => {
    expect(restoreAfterSpeak("auto", "playback", "cancelled")).toBe("auto");
    expect(restoreAfterSpeak("auto", "playback", "ended")).toBe("auto");
    expect(restoreAfterSpeak("auto", "playback", "error")).toBe("auto");
  });

  it("restoreAfterSpeak: 그사이 다른 길이 꼴을 바꿨거나(playback 아님) 앞 꼴이 없거나 playback 이면 두다", () => {
    expect(
      restoreAfterSpeak("auto", "play-and-record", "cancelled"),
    ).toBeUndefined();
    expect(restoreAfterSpeak(undefined, "playback", "ended")).toBeUndefined();
    expect(restoreAfterSpeak("playback", "playback", "ended")).toBeUndefined();
  });
});

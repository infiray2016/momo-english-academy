// 음성 관찰 페이지 2판의 순수 꼴(task-speech-probe-2): 입력 소리 세기(RMS) 요약 · 새 기록 줄의 글 · 기록 표 복사 글.
// 브라우저를 읽지 않는다(브라우저 쪽은 probe-browser.ts). 소리는 다루지 않고 수치만 다룬다(7절 '녹음하지 않는다').
// 여기 숫자는 관찰 페이지 상수다(설정값 아님, 아이 화면은 쓰지 않는다).
import type {
  AudioContextFacts,
  DeviceLabelGroup,
  MicLevelResult,
  ProbeDevice,
  ProbeEnvFacts,
  SpeechTraceEntry,
} from "@/lib/speech/types";

/** '마이크 소리 재기' 한 번의 길이. */
export const MIC_LEVEL_DURATION_MS = 3_000;
/** 소리 세기를 읽는 간격(틀 하나). */
export const MIC_LEVEL_SAMPLE_INTERVAL_MS = 50;
/** 한 번 재기의 틀 수. */
export const MIC_LEVEL_FRAMES = Math.round(
  MIC_LEVEL_DURATION_MS / MIC_LEVEL_SAMPLE_INTERVAL_MS,
);
/** 이 RMS(-1~1 신호) 이상인 틀을 '소리가 들린 틀'로 센다. 약 -40 dBFS — 조용한 방 바닥 소리 위 · 말소리 아래쪽 어림. */
export const MIC_LEVEL_HEARD_RMS = 0.01;
/** AnalyserNode 의 fftSize(시간 영역 틀의 표본 수). */
export const ANALYSER_FFT_SIZE = 2_048;
/** 비프 소리의 높이 · 길이 · 크기. */
export const BEEP_FREQUENCY_HZ = 440;
export const BEEP_DURATION_MS = 500;
export const BEEP_GAIN = 0.2;
/** 비프 길이 뒤 end 를 더 기다리는 여유. 넘으면 처리기를 닫고 'end 없음' 줄을 남긴다(검토 M-1). */
export const BEEP_END_GRACE_MS = 1_000;
/** 처리기 깨우기(resume)를 기다리는 상한. 넘으면 마이크를 끄고 처리기를 닫는다(검토 I-1). */
export const RESUME_WAIT_MS = 2_000;
/** 처리기 깨우기가 상한 안에 안 풀린 재기의 코드. */
export const RESUME_TIMEOUT_CODE = "resume-timeout";
/** 처리기 깨우기 전에(또는 스트림을 받기 전에) 멈춤 요청이 온 재기의 코드. */
export const STOPPED_EARLY_CODE = "stopped-before-resume";
/** 복사 글 첫 줄(검토 I-2 — 장치 이름에 사람 이름이 들 수 있다). */
export const DEVICE_NAMES_NOTE = "기기 이름은 기록에 넣지 않아요";
/** 오디오 세션 꼴 실험에서 고를 수 있는 값(Safari 17+ navigator.audioSession.type). */
export const AUDIO_SESSION_TYPES = [
  "auto",
  "playback",
  "play-and-record",
  "ambient",
] as const;
export type AudioSessionTypeChoice = (typeof AUDIO_SESSION_TYPES)[number];

/** getByteTimeDomainData 의 0 자리. */
const BYTE_CENTER = 128;
const PERCENT = 100;
/** 세기 숫자의 유효 숫자 자리 수. */
const LEVEL_SIGNIFICANT_DIGITS = 3;
const NONE = "없음";

/** 시간 영역 틀(-1~1)의 RMS. 빈 틀은 0. */
export function rmsOf(samples: ArrayLike<number>): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const value = samples[i] ?? 0;
    sum += value * value;
  }
  return Math.sqrt(sum / samples.length);
}

/** getByteTimeDomainData 틀(0~255)을 -1~1 로(getFloatTimeDomainData 가 없는 브라우저용). */
export function byteSamplesToUnit(bytes: ArrayLike<number>): number[] {
  return Array.from(bytes, (b) => (b - BYTE_CENTER) / BYTE_CENTER);
}

export type LevelSummary = {
  frames: number;
  max: number;
  mean: number;
  heardRatio: number;
  allZero: boolean;
};

/** 틀마다의 RMS 를 최대 · 평균 · 문턱 이상인 틀의 비율로 요약한다. */
export function summarizeLevels(
  levels: readonly number[],
  heardAt: number = MIC_LEVEL_HEARD_RMS,
): LevelSummary {
  const frames = levels.length;
  if (frames === 0) {
    return { frames, max: 0, mean: 0, heardRatio: 0, allZero: true };
  }
  let max = 0;
  let sum = 0;
  let heard = 0;
  for (const level of levels) {
    if (level > max) max = level;
    sum += level;
    if (level >= heardAt) heard += 1;
  }
  return {
    frames,
    max,
    mean: sum / frames,
    heardRatio: heard / frames,
    allZero: max === 0,
  };
}

/** 세기 숫자 글. 0 은 0, 나머지는 유효 숫자 세 자리(아주 작은 소리도 0 으로 뭉개지지 않게). */
export function formatLevel(value: number): string {
  return value === 0 ? "0" : value.toPrecision(LEVEL_SIGNIFICANT_DIGITS);
}

const yesNo = (value: boolean) => (value ? "예" : "아니오");
const orNone = (value: string | number | boolean | undefined) =>
  value === undefined ? NONE : String(value);
const percent = (ratio: number) => `${Math.round(ratio * PERCENT)}%`;

function describeAudioContext(facts: AudioContextFacts): string {
  if (!facts.ok) return `실패 ${facts.code}`;
  return `${facts.sampleRate}Hz ${facts.state} 출력 지연 ${orNone(facts.outputLatency)} 기본 지연 ${orNone(facts.baseLatency)}`;
}

function describeSession(type: string | undefined, state: string | undefined) {
  if (type === undefined) return NONE;
  return state === undefined ? type : `${type}(${state})`;
}

// 장치 이름 갈래(검토 I-2). 원문 이름은 이 함수 밖으로 나가지 않는다.
const BLUETOOTH_LIKE =
  /airpods|beats|bluetooth|\bbt\b|헤드셋|headset|이어폰|earbuds/i;
const BUILT_IN_LIKE = /built-in|ipad|macbook|내장/i;

/** 장치 · 마이크 이름(label)을 갈래로. 비어 있으면(권한 전) '권한 전'. 블루투스 꼴이 내장 꼴보다 먼저다. */
export function deviceLabelGroup(label: string): DeviceLabelGroup {
  if (label.trim() === "") return "권한 전";
  if (BLUETOOTH_LIKE.test(label)) return "블루투스 · 외부";
  if (BUILT_IN_LIKE.test(label)) return "내장";
  return "그 밖";
}

const userActiveText = (value: boolean | undefined) =>
  `누름 안 ${value === undefined ? NONE : yesNo(value)}`;

function describeMicFailure(
  result: Extract<MicLevelResult, { ok: false }>,
): string {
  const head =
    result.code === RESUME_TIMEOUT_CODE
      ? [`처리기 깨우기 없음(상한 ${RESUME_WAIT_MS}ms)`]
      : result.code === STOPPED_EARLY_CODE
        ? ["처리기 깨우기 전에 멈춤"]
        : [`실패 ${result.code}`, `단계 ${result.stage}`];
  return [
    ...head,
    ...(result.contextState === undefined
      ? []
      : [`처리기 ${result.contextState}`]),
    ...(result.stopped === undefined
      ? []
      : [`마이크 끔 ${yesNo(result.stopped)}`]),
    `세션 ${orNone(result.audioSession)}`,
  ].join(" · ");
}

/** withSettings 이면 마이크 설정(echoCancellation 등)까지(기록 표), 아니면 빼고(화면 요약). 이름은 갈래만. */
function describeMicLevel(
  result: MicLevelResult,
  withSettings: boolean,
): string {
  if (!result.ok) return describeMicFailure(result);
  const settings = Object.entries(result.track.settings)
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  return [
    `최대 ${formatLevel(result.max)}`,
    `평균 ${formatLevel(result.mean)}`,
    `들린 비율 ${percent(result.heardRatio)}`,
    ...(result.allZero ? ["모두 0"] : []),
    `틀 ${result.frames} · ${Math.round(result.durationMs)}ms`,
    `처리기 ${result.contextState} ${result.sampleRate}Hz`,
    `마이크 갈래 ${result.track.group} ${result.track.readyState}`,
    `마이크 소리 끊김(muted) ${yesNo(result.track.muted)} → ${yesNo(result.track.mutedAtEnd)}`,
    ...(withSettings && settings !== "" ? [settings] : []),
    `마이크 끔 ${yesNo(result.stopped)}`,
    `세션 ${orNone(result.audioSession)}`,
  ].join(" · ");
}

/** '마이크 소리 재기' 화면 요약(마이크 설정 없이). */
export function micLevelSummary(result: MicLevelResult): string {
  return describeMicLevel(result, false);
}

/** 장치 목록 화면 요약: 종류별 수만. */
export function describeDeviceCounts(
  result: { ok: true; devices: ProbeDevice[] } | { ok: false; code: string },
): string {
  if (!result.ok) return `실패 ${result.code}`;
  if (result.devices.length === 0) return "0개";
  const counts = new Map<string, number>();
  for (const device of result.devices) {
    counts.set(device.kind, (counts.get(device.kind) ?? 0) + 1);
  }
  return [...counts].map(([kind, n]) => `${kind} ${n}`).join(" · ");
}

const SET_BY_TEXT = { auto: "자동", button: "단추" } as const;

/**
 * at 시각까지의 기록으로 본 오디오 세션 꼴(env 의 값 · 바꾼 뒤 읽은 값 · 상태 바뀜의 꼴 가운데 마지막).
 * 그런 줄이 없으면 known 이 false.
 */
function sessionAt(
  trace: readonly SpeechTraceEntry[],
  at: number,
): { known: boolean; type: string | undefined } {
  let known = false;
  let type: string | undefined;
  for (const entry of trace) {
    if (entry.at > at) continue;
    if (entry.kind === "env") type = entry.facts.audioSessionType;
    else if (entry.kind === "audio-session") {
      type = entry.action === "set" ? entry.after : entry.type;
    } else continue;
    known = true;
  }
  return { known, type };
}

/** 관찰 페이지 2판이 남기는 줄. */
export type ProbeTraceEntry = Extract<
  SpeechTraceEntry,
  {
    kind:
      | "env"
      | "devices"
      | "mic-level"
      | "beep"
      | "heard"
      | "audio-session"
      | "speak-request";
  }
>;

/** kind 별 수와 이름 갈래별 수: 'audioinput 3[내장 1, 블루투스 · 외부 2]'. */
function describeDeviceGroups(devices: readonly ProbeDevice[]): string {
  const byKind = new Map<string, Map<DeviceLabelGroup, number>>();
  for (const device of devices) {
    const groups = byKind.get(device.kind) ?? new Map();
    groups.set(device.group, (groups.get(device.group) ?? 0) + 1);
    byKind.set(device.kind, groups);
  }
  return [...byKind]
    .map(([kind, groups]) => {
      const total = [...groups.values()].reduce((a, b) => a + b, 0);
      const parts = [...groups].map(([group, n]) => `${group} ${n}`);
      return `${kind} ${total}[${parts.join(", ")}]`;
    })
    .join(" · ");
}

/** 새 기록 줄(env · devices · mic-level · beep · heard · audio-session)의 '내용' 칸 글. */
export function probeEntryDetail(entry: ProbeTraceEntry): string {
  switch (entry.kind) {
    case "env": {
      const { facts } = entry;
      return [
        entry.reason,
        `standalone ${orNone(facts.standalone)}`,
        `display-mode standalone ${yesNo(facts.displayModeStandalone)}`,
        `보이는 상태 ${facts.visibility}`,
        `세션 ${describeSession(facts.audioSessionType, facts.audioSessionState)}`,
        `처리기 ${describeAudioContext(facts.audioContext)}`,
        `음성 ${facts.voices}`,
        `영어 ${facts.englishVoices}`,
      ].join(" · ");
    }
    case "devices": {
      const { result } = entry;
      if (!result.ok) return `${entry.phase} · 실패 ${result.code}`;
      const list = describeDeviceGroups(result.devices);
      return `${entry.phase} · ${result.devices.length}개${list === "" ? "" : ` · ${list}`}`;
    }
    case "mic-level":
      return describeMicLevel(entry.result, true);
    case "beep":
      if (entry.phase === "start") {
        return `start · 처리기 ${entry.contextState} · 세션 ${orNone(entry.audioSession)} · ${userActiveText(entry.userActive)}`;
      }
      if (entry.phase === "no-end") {
        return `end 없음(${entry.waitedMs}ms 기다림) · 처리기 닫음`;
      }
      return entry.phase === "end" ? "end" : `error ${entry.code}`;
    case "speak-request":
      return [
        entry.turn === undefined
          ? entry.source
          : `${entry.source} ${entry.turn}째 문장`,
        `세션 ${orNone(entry.audioSession)}`,
        userActiveText(entry.userActive),
      ].join(" · ");
    case "heard":
      return `${entry.test} · ${entry.heard ? "들렸어요" : "안 들렸어요"} · 세션 ${orNone(entry.audioSession)}`;
    case "audio-session":
      if (entry.action === "state") {
        return `상태 바뀜 ${orNone(entry.state)} · 꼴 ${orNone(entry.type)}`;
      }
      return [
        `${orNone(entry.before)} → ${entry.requested} 요청`,
        `읽은 값 ${orNone(entry.after)}`,
        ...(entry.threw === undefined ? [] : [`던짐 ${entry.threw}`]),
        ...(entry.by === undefined ? [] : [SET_BY_TEXT[entry.by]]),
        userActiveText(entry.userActive),
      ].join(" · ");
  }
}

/** 환경 사실을 복사 글 머리의 (이름, 값) 줄로. */
export function envFactLines(facts: ProbeEnvFacts): [string, string][] {
  return [
    ["UA", facts.userAgent],
    ["navigator.standalone", orNone(facts.standalone)],
    ["display-mode standalone", yesNo(facts.displayModeStandalone)],
    ["보이는 상태", facts.visibility],
    ["audioSession.type", orNone(facts.audioSessionType)],
    ["audioSession.state", orNone(facts.audioSessionState)],
    ["AudioContext", describeAudioContext(facts.audioContext)],
    ["음성 수", String(facts.voices)],
    ["영어 음성 수", String(facts.englishVoices)],
  ];
}

export type ProbeLogRow = {
  ms: number;
  ids: string;
  kind: string;
  detail: string;
};

// ── 듣기 지연 요약(팀 리드 2026-10-22 사파리 단독 실측: 안 되는 듣기는 start 이벤트와 audiostart 가 같은 ms) ──

/** 듣기 지연 요약의 제목 줄(복사 글). */
export const LATENCY_TITLE = "듣기 지연(start 호출 기준 ms):";

type RecognizerEvent = Extract<SpeechTraceEntry, { kind: "recognizer-event" }>;

const plus = (ms: number) => `+${Math.round(ms)}`;

/**
 * 듣기마다 · 인식 객체마다 한 줄: start 호출 기준으로 start 이벤트 · audiostart(start 이벤트 뒤 틈) · 첫 소리
 * (soundstart · speechstart 가운데 먼저) · 첫 결과 · 끝(오류가 있으면 오류 코드). 듣기의 첫 객체 줄에만 규칙을 적는다.
 */
export function listenLatencyLines(
  trace: readonly SpeechTraceEntry[],
): string[] {
  const lines: string[] = [];
  const seen = new Set<number>();
  for (const call of trace) {
    if (call.kind !== "recognizer-call" || call.call !== "start") continue;
    const head = [`듣기 ${call.listen}`, `객체 ${call.recognizer}`];
    if (!seen.has(call.listen)) {
      seen.add(call.listen);
      const begin = trace.find(
        (e) => e.kind === "listen-begin" && e.listen === call.listen,
      );
      if (begin?.kind === "listen-begin") {
        head.push(
          `규칙 ${Object.entries(begin.rule)
            .map(([key, value]) => `${key}=${value}`)
            .join(" ")}`,
        );
      }
      const session = sessionAt(trace, call.at);
      if (session.known) head.push(`세션 ${orNone(session.type)}`);
    }
    if (call.threw) {
      lines.push([...head, "start 던짐"].join(" · "));
      continue;
    }
    const events = trace.filter(
      (e): e is RecognizerEvent =>
        e.kind === "recognizer-event" &&
        e.listen === call.listen &&
        e.recognizer === call.recognizer,
    );
    const first = (...types: string[]) =>
      events.find((e) => types.includes(e.event.type));
    const started = first("start");
    const audio = first("audiostart");
    const sound = first("soundstart", "speechstart");
    const result = first("result");
    const error = first("error");
    const end = first("end");
    const since = (e: RecognizerEvent) => plus(e.at - call.at);
    let audioText = "audiostart 없음";
    if (audio !== undefined) {
      audioText = `audiostart ${since(audio)}`;
      if (started !== undefined) {
        const gap = Math.round(audio.at - started.at);
        audioText += `(start 뒤 +${gap}${gap === 0 ? ", 같은 ms" : ""})`;
      }
    }
    lines.push(
      [
        ...head,
        started === undefined
          ? "start 이벤트 없음"
          : `start 이벤트 ${since(started)}`,
        audioText,
        sound === undefined
          ? "소리 없음"
          : `${sound.event.type} ${since(sound)}`,
        result === undefined ? "첫 결과 없음" : `첫 결과 ${since(result)}`,
        error?.event.type === "error"
          ? `error ${error.event.error} ${since(error)}`
          : end === undefined
            ? "끝 없음"
            : `end ${since(end)}`,
      ].join(" · "),
    );
  }
  return lines;
}

const LOG_HEADER = ["ms", "듣기 · 객체", "종류", "내용"];
/** 칸 안의 탭 · 줄바꿈은 붙여 넣은 표가 갈라지지 않게 빈칸으로. */
const flat = (text: string) => text.replace(/[\t\r\n]+/g, " ");

/**
 * 기록 표 복사 글: 사실 줄(이름: 값)을 한 줄씩, 빈 줄, (있으면) 듣기 지연 제목 · 요약 줄과 빈 줄, 표 머리,
 * 기록 줄(탭으로 가름).
 */
export function formatProbeLog(
  facts: readonly (readonly [string, string])[],
  rows: readonly ProbeLogRow[],
  latency: readonly string[] = [],
): string {
  return [
    DEVICE_NAMES_NOTE,
    ...facts.map(([label, value]) => `${flat(label)}: ${flat(value)}`),
    "",
    ...(latency.length === 0 ? [] : [LATENCY_TITLE, ...latency.map(flat), ""]),
    LOG_HEADER.join("\t"),
    ...rows.map((row) =>
      [String(row.ms), row.ids, row.kind, row.detail].map(flat).join("\t"),
    ),
  ].join("\n");
}

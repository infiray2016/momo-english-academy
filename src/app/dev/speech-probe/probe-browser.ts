// 음성 관찰 페이지 2판의 브라우저 쪽(task-speech-probe-2): 환경 사실 · 장치 목록 · 입력 소리 세기 · 비프 · 오디오 세션 꼴.
// 관찰 페이지만 가져온다(아이 화면 · 음성 접점 browser.ts 는 쓰지 않는다).
// 녹음하지 않는다: getUserMedia 스트림은 AnalyserNode 로 RMS 수치만 읽고 재기가 끝나면 마이크를 끈다.
// MediaRecorder · 소리 버퍼 저장 · 전송이 없다(7절). 장치 deviceId · groupId 는 읽지 않는다.
import "client-only";
import type {
  AudioContextFacts,
  MicLevelResult,
  ProbeDevice,
  ProbeEnvFacts,
} from "@/lib/speech/types";
import {
  ANALYSER_FFT_SIZE,
  BEEP_DURATION_MS,
  BEEP_END_GRACE_MS,
  BEEP_FREQUENCY_HZ,
  BEEP_GAIN,
  byteSamplesToUnit,
  deviceLabelGroup,
  MIC_LEVEL_FRAMES,
  MIC_LEVEL_SAMPLE_INTERVAL_MS,
  RESUME_TIMEOUT_CODE,
  RESUME_WAIT_MS,
  rmsOf,
  STOPPED_EARLY_CODE,
  summarizeLevels,
} from "./probe-audio";

/** mediaDevices(getUserMedia · enumerateDevices)가 없을 때의 코드. */
export const NO_MEDIA_DEVICES_CODE = "no-media-devices";
/** AudioContext 가 없을 때의 코드. */
export const NO_AUDIO_CONTEXT_CODE = "no-audio-context";
const DISPLAY_MODE_STANDALONE = "(display-mode: standalone)";
const MS_PER_SECOND = 1_000;
/** 기록에 남기는 마이크 설정(값이 글 · 수 · 참거짓인 것만). deviceId · groupId 는 넣지 않는다. */
const TRACK_SETTING_KEYS = [
  "sampleRate",
  "sampleSize",
  "channelCount",
  "echoCancellation",
  "autoGainControl",
  "noiseSuppression",
  "latency",
] as const;

/** Safari 17+ Audio Session API(lib.dom 에 없다). 쓰는 만큼만. */
type AudioSessionLike = {
  type: string;
  state?: string;
  addEventListener?(type: "statechange", listener: () => void): void;
  removeEventListener?(type: "statechange", listener: () => void): void;
};

type ProbeNavigator = Navigator & {
  standalone?: unknown;
  audioSession?: AudioSessionLike;
  userActivation?: { isActive?: unknown };
};

/** lib.dom 은 AudioContext 를 전역 이름으로만 둔다. 없는 브라우저를 가리려고 창의 속성으로 읽는다. */
type ProbeWindow = {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

const probeNavigator = () => navigator as ProbeNavigator;

function errorName(error: unknown): string {
  if (error instanceof Error || error instanceof DOMException) {
    return error.name;
  }
  return String(error);
}

const numberOrUndefined = (value: unknown) =>
  typeof value === "number" ? value : undefined;

function audioContextCtor(): typeof AudioContext | undefined {
  const w = window as unknown as ProbeWindow;
  if (typeof w.AudioContext === "function") return w.AudioContext;
  return typeof w.webkitAudioContext === "function"
    ? w.webkitAudioContext
    : undefined;
}

async function closeQuietly(context: AudioContext): Promise<void> {
  try {
    await context.close();
  } catch {
    // 이미 닫힌 처리기
  }
}

function audioSessionOf(): AudioSessionLike | undefined {
  const session = probeNavigator().audioSession;
  return typeof session === "object" && session !== null ? session : undefined;
}

/** navigator.userActivation?.isActive — 지금 누름 처리 안(사용자 동작이 살아 있음)인가. 없는 브라우저는 undefined(검토 M-4). */
export function readUserActive(): boolean | undefined {
  const active = probeNavigator().userActivation?.isActive;
  return typeof active === "boolean" ? active : undefined;
}

/** 지금 오디오 세션 꼴 · 상태. API 가 없으면 둘 다 undefined. */
export function readAudioSession(): {
  type: string | undefined;
  state: string | undefined;
} {
  const session = audioSessionOf();
  return { type: session?.type, state: session?.state };
}

/**
 * 오디오 세션 꼴을 바꾸고 앞 · 뒤 값을 돌려준다. API 가 없으면 undefined(단추는 꺼져 있다).
 * 관찰 페이지에서만 바꾼다(아이 화면에는 적용하지 않는다).
 */
export function setAudioSessionType(
  type: string,
):
  | { before: string | undefined; after: string | undefined; threw?: string }
  | undefined {
  const session = audioSessionOf();
  if (session === undefined) return undefined;
  const before = session.type;
  try {
    session.type = type;
  } catch (error) {
    return { before, after: session.type, threw: errorName(error) };
  }
  return { before, after: session.type };
}

/** 오디오 세션 상태 바뀜(statechange)을 듣는다. 돌려준 함수로 그만 듣는다. */
export function watchAudioSession(
  onChange: (session: {
    type: string | undefined;
    state: string | undefined;
  }) => void,
): () => void {
  const session = audioSessionOf();
  if (session?.addEventListener === undefined) return () => {};
  const listener = () => onChange(readAudioSession());
  session.addEventListener("statechange", listener);
  return () => session.removeEventListener?.("statechange", listener);
}

/** AudioContext 를 만들어 sampleRate · state · 지연을 읽고 바로 닫는다. */
export async function readAudioContextFacts(): Promise<AudioContextFacts> {
  const Ctor = audioContextCtor();
  if (Ctor === undefined) return { ok: false, code: NO_AUDIO_CONTEXT_CODE };
  let context: AudioContext;
  try {
    context = new Ctor();
  } catch (error) {
    return { ok: false, code: errorName(error) };
  }
  const facts: AudioContextFacts = {
    ok: true,
    sampleRate: context.sampleRate,
    state: context.state,
    outputLatency: numberOrUndefined(context.outputLatency),
    baseLatency: numberOrUndefined(context.baseLatency),
  };
  await closeQuietly(context);
  return facts;
}

/** 환경 사실(실행 꼴 · 보이는 상태 · 오디오 세션 · 음성 수). 처리기 사실은 따로 읽어 넘긴다. */
export function readEnvFacts(audioContext: AudioContextFacts): ProbeEnvFacts {
  const nav = probeNavigator();
  const synth =
    typeof window.speechSynthesis === "object" && window.speechSynthesis
      ? window.speechSynthesis
      : undefined;
  const voices = synth?.getVoices() ?? [];
  const session = readAudioSession();
  return {
    userAgent: navigator.userAgent,
    standalone:
      typeof nav.standalone === "boolean" ? nav.standalone : undefined,
    displayModeStandalone:
      typeof window.matchMedia === "function" &&
      window.matchMedia(DISPLAY_MODE_STANDALONE).matches,
    visibility: document.visibilityState,
    audioSessionType: session.type,
    audioSessionState: session.state,
    audioContext,
    voices: voices.length,
    englishVoices: voices.filter((v) => v.lang.toLowerCase().startsWith("en"))
      .length,
  };
}

/**
 * enumerateDevices 의 kind 와 이름 갈래(권한 뒤에만 이름이 보인다). 원문 label 은 여기서 갈래로 바꾸고 내보내지 않는다
 * (검토 I-2 — AirPods 기본 이름처럼 사람 이름이 들 수 있다).
 */
export async function listDevices(): Promise<
  { ok: true; devices: ProbeDevice[] } | { ok: false; code: string }
> {
  const media = navigator.mediaDevices;
  if (typeof media?.enumerateDevices !== "function") {
    return { ok: false, code: NO_MEDIA_DEVICES_CODE };
  }
  try {
    const list = await media.enumerateDevices();
    return {
      ok: true,
      devices: list.map((d) => ({
        kind: d.kind,
        group: deviceLabelGroup(d.label),
      })),
    };
  } catch (error) {
    return { ok: false, code: errorName(error) };
  }
}

function trackSettings(
  track: MediaStreamTrack | undefined,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (typeof track?.getSettings !== "function") return out;
  const settings = track.getSettings() as Record<string, unknown>;
  for (const key of TRACK_SETTING_KEYS) {
    const value = settings[key];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      out[key] = value;
    }
  }
  return out;
}

function levelReader(analyser: AnalyserNode): () => number {
  if (typeof analyser.getFloatTimeDomainData === "function") {
    const buffer = new Float32Array(analyser.fftSize);
    return () => {
      analyser.getFloatTimeDomainData(buffer);
      return rmsOf(buffer);
    };
  }
  const bytes = new Uint8Array(analyser.fftSize);
  return () => {
    analyser.getByteTimeDomainData(bytes);
    return rmsOf(byteSamplesToUnit(bytes));
  };
}

/** 스트림을 처리기에 이어 틀마다 RMS 를 읽는다. 소리는 내보내지 않는다(이득 0 노드로 그래프만 돌린다). */
async function sampleLevels(
  context: AudioContext,
  stream: MediaStream,
  done: (frames: number) => boolean,
) {
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = ANALYSER_FFT_SIZE;
  // WebKit 은 destination 에 닿지 않은 분석 노드를 돌리지 않을 수 있어 소리 없는 이득 노드로 잇는다.
  const silent = context.createGain();
  silent.gain.value = 0;
  source.connect(analyser);
  analyser.connect(silent);
  silent.connect(context.destination);
  const track = stream.getAudioTracks()[0];
  const muted = track?.muted ?? false;
  const read = levelReader(analyser);
  const levels: number[] = [];
  /** 마지막으로 틀을 읽은 때의 처리기 상태(멈춤 뒤 닫힌 상태가 아니라 재는 동안의 값). */
  let stateWhileReading: string | undefined;
  const startedAt = performance.now();
  await new Promise<void>((resolve) => {
    const tick = () => {
      // 멈춤 요청 뒤(마이크 · 처리기는 이미 닫힘)에는 틀을 더 읽지 않는다.
      if (!done(levels.length)) {
        levels.push(read());
        stateWhileReading = context.state;
      }
      if (done(levels.length)) resolve();
      else window.setTimeout(tick, MIC_LEVEL_SAMPLE_INTERVAL_MS);
    };
    window.setTimeout(tick, MIC_LEVEL_SAMPLE_INTERVAL_MS);
  });
  const durationMs = performance.now() - startedAt;
  const contextState = stateWhileReading ?? context.state;
  for (const node of [source, analyser, silent]) {
    try {
      node.disconnect();
    } catch {
      // 이미 닫힌 처리기의 노드
    }
  }
  return {
    durationMs,
    contextState,
    summary: summarizeLevels(levels),
    track: {
      group: deviceLabelGroup(track?.label ?? ""),
      muted,
      mutedAtEnd: track?.muted ?? false,
      readyState: track?.readyState ?? "없음",
      settings: trackSettings(track),
    },
  };
}

/**
 * 멈출 수 있는 소리 세기 재기. stop() 은 깃발만 세우지 않고 받은 스트림의 마이크를 그 자리에서 끄고 처리기를 닫는다
 * (검토 I-1). result 는 재기가 끝나면(정해진 틀 · stop · 깨우기 상한 · 오류) 풀린다.
 */
export type LevelMeter = { stop(): void; result: Promise<MicLevelResult> };

/**
 * 소리 세기 재기를 연다. 누름 처리 안에서 동기로 부른다 — 처리기를 만들고 깨우는 것까지가 사용자 동작 안에서 일어나야
 * iOS 가 막지 않는다. maxFrames 가 있으면 그만큼 재고 저절로 멈춘다('마이크 소리 재기'). 없으면 stop() 까지 잰다
 * ('듣기 중 함께 재기' — 인식 객체와 같은 때 getUserMedia 스트림을 연다. 그것이 인식을 깨는지도 관찰 대상이다).
 * 처리기 깨우기(resume)는 RESUME_WAIT_MS 까지만 기다린다 — 넘으면 마이크를 끄고 처리기를 닫는다.
 */
export function openLevelMeter(maxFrames?: number): LevelMeter {
  let stopRequested = false;
  let wakeOnStop: () => void = () => {};
  const stopSignal = new Promise<void>((resolve) => {
    wakeOnStop = resolve;
  });
  const done = (frames: number) =>
    stopRequested || (maxFrames !== undefined && frames >= maxFrames);
  const audioSession = readAudioSession().type;
  const fail = (
    code: string,
    stage: "api" | "permission" | "audio",
    extra: { contextState?: string; stopped?: boolean } = {},
  ): MicLevelResult => ({ ok: false, code, stage, audioSession, ...extra });
  const settled = (result: MicLevelResult): LevelMeter => ({
    stop() {},
    result: Promise.resolve(result),
  });

  const media = navigator.mediaDevices;
  if (typeof media?.getUserMedia !== "function") {
    return settled(fail(NO_MEDIA_DEVICES_CODE, "api"));
  }
  const Ctor = audioContextCtor();
  if (Ctor === undefined) return settled(fail(NO_AUDIO_CONTEXT_CODE, "api"));
  let context: AudioContext;
  try {
    context = new Ctor();
  } catch (error) {
    return settled(fail(errorName(error), "audio"));
  }
  const opened = context;
  const resumed = opened.resume().then(
    () => "resumed" as const,
    () => "resumed" as const,
  );

  let stream: MediaStream | undefined;
  let closing: Promise<void> | undefined;
  /** stop() 이 처리기를 닫기 전에 담아 둔 상태(닫힌 뒤 'closed' 대신 이 값을 남긴다, 재검토 N-1). */
  let stateAtStop: string | undefined;
  /** 마이크를 끄고(몇 번 불러도 됨) 처리기를 한 번 닫는다. 모든 마이크가 ended 인지 돌려준다. */
  const release = async (): Promise<boolean> => {
    const tracks = stream?.getTracks() ?? [];
    for (const track of tracks) track.stop();
    const stopped = tracks.every((track) => track.readyState === "ended");
    closing ??= closeQuietly(opened);
    await closing;
    return stopped;
  };

  const run = async (): Promise<MicLevelResult> => {
    try {
      stream = await media.getUserMedia({ audio: true });
    } catch (error) {
      await release();
      return fail(errorName(error), "permission");
    }
    if (stopRequested) {
      const contextState = stateAtStop ?? opened.state;
      return fail(STOPPED_EARLY_CODE, "audio", {
        contextState,
        stopped: await release(),
      });
    }
    let timer: number | undefined;
    const woke = await Promise.race([
      resumed,
      stopSignal.then(() => "stopped" as const),
      new Promise<"timeout">((resolve) => {
        timer = window.setTimeout(() => resolve("timeout"), RESUME_WAIT_MS);
      }),
    ]);
    if (timer !== undefined) window.clearTimeout(timer);
    if (woke !== "resumed") {
      const contextState = stateAtStop ?? opened.state;
      return fail(
        woke === "timeout" ? RESUME_TIMEOUT_CODE : STOPPED_EARLY_CODE,
        "audio",
        { contextState, stopped: await release() },
      );
    }
    let measured: Awaited<ReturnType<typeof sampleLevels>> | undefined;
    let failure: string | undefined;
    try {
      measured = await sampleLevels(opened, stream, done);
    } catch (error) {
      failure = errorName(error);
    }
    // 재기가 끝나면 바로 마이크를 끈다(상태 막대 마이크 표시가 꺼진다).
    const stopped = await release();
    if (measured === undefined) {
      return fail(failure ?? "unknown", "audio", { stopped });
    }
    return {
      ok: true,
      durationMs: measured.durationMs,
      ...measured.summary,
      sampleRate: opened.sampleRate,
      contextState: measured.contextState,
      track: measured.track,
      stopped,
      audioSession,
    };
  };

  return {
    stop() {
      if (stopRequested) return;
      stateAtStop = opened.state;
      stopRequested = true;
      wakeOnStop();
      // 스트림을 이미 받았으면 다음 틀 · 깨우기를 기다리지 않고 바로 끈다.
      if (stream !== undefined) void release();
    },
    result: run(),
  };
}

/** '마이크 소리 재기'(정해진 틀 수만큼). 누름 처리 안에서 동기로 부른다. 인식 서비스와 상관없이 마이크 신호만 본다. */
export function measureMicLevel(): Promise<MicLevelResult> {
  return openLevelMeter(MIC_LEVEL_FRAMES).result;
}

export type BeepEvent =
  | { phase: "start"; contextState: string }
  | { phase: "end" }
  | { phase: "no-end"; waitedMs: number }
  | { phase: "error"; code: string };

/**
 * '비프 소리'(사인파). 누름 처리 안에서 동기로 부른다 — 처리기를 만들고 깨우는 것이 사용자 동작 안에 있어야 한다.
 * 깨운 뒤 상태를 start 로, 소리가 끝나면 end 를 알린다. 깨우기가 거부되면 error 뒤 처리기를 닫고, 비프 길이 + 여유
 * 뒤에도 end 가 없으면(깨우기가 머묾) 'no-end' 를 알리고 처리기를 닫는다(검토 M-1).
 */
export function playBeep(on: (event: BeepEvent) => void): void {
  const Ctor = audioContextCtor();
  if (Ctor === undefined) {
    on({ phase: "error", code: NO_AUDIO_CONTEXT_CODE });
    return;
  }
  let context: AudioContext;
  try {
    context = new Ctor();
  } catch (error) {
    on({ phase: "error", code: errorName(error) });
    return;
  }
  const opened = context;
  let finished = false;
  let guard: number | undefined;
  const finish = (event: BeepEvent) => {
    if (finished) return;
    finished = true;
    if (guard !== undefined) window.clearTimeout(guard);
    on(event);
    void closeQuietly(opened);
  };
  try {
    const oscillator = opened.createOscillator();
    const gain = opened.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = BEEP_FREQUENCY_HZ;
    gain.gain.value = BEEP_GAIN;
    oscillator.connect(gain);
    gain.connect(opened.destination);
    oscillator.onended = () => finish({ phase: "end" });
    const startAt = opened.currentTime;
    oscillator.start(startAt);
    oscillator.stop(startAt + BEEP_DURATION_MS / MS_PER_SECOND);
  } catch (error) {
    finish({ phase: "error", code: errorName(error) });
    return;
  }
  const waitedMs = BEEP_DURATION_MS + BEEP_END_GRACE_MS;
  guard = window.setTimeout(
    () => finish({ phase: "no-end", waitedMs }),
    waitedMs,
  );
  opened.resume().then(
    () => {
      if (!finished) on({ phase: "start", contextState: opened.state });
    },
    (error: unknown) => finish({ phase: "error", code: errorName(error) }),
  );
}

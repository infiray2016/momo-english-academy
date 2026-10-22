// 음성 관찰 페이지 2판 fix 1(검토 review-speech-probe-2 I-1 · M-1 · I-2): 브라우저 쪽 재기 · 비프가 처리기 깨우기가
// 머무르거나 거부되거나 멈춤 요청이 올 때 마이크를 바로 끄고 처리기를 닫는지. 가짜 AudioContext · getUserMedia 로 본다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// 브라우저 전용 표시 모듈은 시험(node)에서 빈 모듈로
vi.mock("client-only", () => ({}));

import {
  BEEP_DURATION_MS,
  BEEP_END_GRACE_MS,
  MIC_LEVEL_FRAMES,
  MIC_LEVEL_SAMPLE_INTERVAL_MS,
  RESUME_TIMEOUT_CODE,
  RESUME_WAIT_MS,
  STOPPED_EARLY_CODE,
} from "@/app/dev/speech-probe/probe-audio";
import {
  type BeepEvent,
  openLevelMeter,
  playBeep,
} from "@/app/dev/speech-probe/probe-browser";

/** 사람 이름 꼴의 가짜 마이크 이름(원문이 결과에 남지 않는지 본다). */
const PERSON_LIKE_LABEL = "홍길동의 AirPods";

type ResumeMode = "ok" | "hang" | "reject";

type FakeTrack = {
  label: string;
  muted: boolean;
  readyState: string;
  stop(): void;
  getSettings(): Record<string, unknown>;
};

type Record_ = {
  contexts: number;
  closed: number;
  stoppedTracks: number;
  tracks: FakeTrack[];
  oscillators: { onended: null | (() => void) }[];
};

function installFakes(resume: ResumeMode): Record_ {
  const record: Record_ = {
    contexts: 0,
    closed: 0,
    stoppedTracks: 0,
    tracks: [],
    oscillators: [],
  };
  const node = () => ({ connect() {}, disconnect() {} });
  class FakeContext {
    state = "suspended";
    sampleRate = 48_000;
    currentTime = 0;
    destination = node();
    constructor() {
      record.contexts += 1;
    }
    resume() {
      if (resume === "hang") return new Promise<void>(() => {});
      if (resume === "reject") {
        return Promise.reject(new Error("깨우기 거부"));
      }
      this.state = "running";
      return Promise.resolve();
    }
    close() {
      this.state = "closed";
      record.closed += 1;
      return Promise.resolve();
    }
    createMediaStreamSource() {
      return node();
    }
    createGain() {
      return { gain: { value: 1 }, connect() {}, disconnect() {} };
    }
    createAnalyser() {
      return {
        fftSize: 32,
        connect() {},
        disconnect() {},
        getFloatTimeDomainData(buffer: Float32Array) {
          buffer.fill(0.1);
        },
      };
    }
    createOscillator() {
      const oscillator = {
        type: "sine",
        frequency: { value: 0 },
        onended: null as null | (() => void),
        connect() {},
        disconnect() {},
        start() {},
        stop() {},
      };
      record.oscillators.push(oscillator);
      return oscillator;
    }
  }
  // 부를 때마다 새 마이크(실제 API 와 같은 꼴, 검토 M-5).
  const getUserMedia = () => {
    const track: FakeTrack = {
      label: PERSON_LIKE_LABEL,
      muted: false,
      readyState: "live",
      stop() {
        if (track.readyState !== "ended") record.stoppedTracks += 1;
        track.readyState = "ended";
      },
      getSettings: () => ({}),
    };
    record.tracks.push(track);
    return Promise.resolve({
      getTracks: () => [track],
      getAudioTracks: () => [track],
    });
  };
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("AudioContext", FakeContext);
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  return record;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("소리 세기 재기 — 마이크 끄기 보장(I-1)", () => {
  it("openLevelMeter: 처리기 깨우기가 머무르면 상한 뒤 마이크를 끄고 처리기를 닫고 '처리기 깨우기 없음'으로 끝난다", async () => {
    const record = installFakes("hang");
    const meter = openLevelMeter(MIC_LEVEL_FRAMES);

    await vi.advanceTimersByTimeAsync(RESUME_WAIT_MS - 1);
    expect(record.stoppedTracks).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    const result = await meter.result;

    expect(result).toMatchObject({
      ok: false,
      code: RESUME_TIMEOUT_CODE,
      stage: "audio",
      contextState: "suspended",
      stopped: true,
    });
    expect(record.stoppedTracks).toBe(1);
    expect(record.closed).toBe(record.contexts);
  });

  it("openLevelMeter: 처리기 깨우기를 기다리는 중 stop() 이 오면 그 자리에서 마이크를 끄고 '깨우기 전에 멈춤'으로 끝난다", async () => {
    const record = installFakes("hang");
    const meter = openLevelMeter();
    await vi.advanceTimersByTimeAsync(0);
    expect(record.tracks).toHaveLength(1);

    meter.stop();
    // 다음 틀 · 상한을 기다리지 않고 바로 끈다.
    expect(record.stoppedTracks).toBe(1);
    const result = await meter.result;
    expect(result).toMatchObject({
      ok: false,
      code: STOPPED_EARLY_CODE,
      stopped: true,
    });
    expect(record.closed).toBe(record.contexts);
  });

  it("openLevelMeter: 깨우기를 기다리는 중 stop() 의 줄에는 닫기 전 처리기 상태(suspended)가 남는다(closed 아님, 재검토 N-1)", async () => {
    installFakes("hang");
    const meter = openLevelMeter();
    await vi.advanceTimersByTimeAsync(0);

    meter.stop();
    const result = await meter.result;
    expect(result).toMatchObject({
      ok: false,
      code: STOPPED_EARLY_CODE,
      contextState: "suspended",
    });
  });

  it("openLevelMeter: 스트림을 받기 전에 stop() 이 오면 스트림이 오자마자 마이크를 끈다", async () => {
    const record = installFakes("ok");
    const meter = openLevelMeter();
    meter.stop();
    const result = await meter.result;
    expect(result).toMatchObject({ ok: false, code: STOPPED_EARLY_CODE });
    expect(record.stoppedTracks).toBe(1);
    expect(record.closed).toBe(record.contexts);
  });

  it("openLevelMeter: 재는 중 stop() 은 다음 틀을 기다리지 않고 마이크를 끄고, 그 뒤 틀은 더 읽지 않는다", async () => {
    const record = installFakes("ok");
    const meter = openLevelMeter();
    await vi.advanceTimersByTimeAsync(MIC_LEVEL_SAMPLE_INTERVAL_MS * 3);

    meter.stop();
    expect(record.stoppedTracks).toBe(1);
    await vi.advanceTimersByTimeAsync(MIC_LEVEL_SAMPLE_INTERVAL_MS * 3);
    const result = await meter.result;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.frames).toBe(3);
    expect(result.stopped).toBe(true);
    expect(record.closed).toBe(record.contexts);
  });

  it("openLevelMeter: 정해진 틀을 다 재면 마이크를 끄고, 결과에는 마이크 이름 원문 대신 갈래만 남는다(I-2)", async () => {
    const record = installFakes("ok");
    const meter = openLevelMeter(MIC_LEVEL_FRAMES);
    await vi.advanceTimersByTimeAsync(
      MIC_LEVEL_FRAMES * MIC_LEVEL_SAMPLE_INTERVAL_MS,
    );
    const result = await meter.result;

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.frames).toBe(MIC_LEVEL_FRAMES);
    expect(result.track.group).toBe("블루투스 · 외부");
    expect(JSON.stringify(result)).not.toContain("홍길동");
    expect(record.stoppedTracks).toBe(1);
    expect(record.closed).toBe(record.contexts);
  });
});

describe("비프 — 처리기 닫기(M-1)", () => {
  it("playBeep: 처리기 깨우기가 거부되면 오류를 알리고 처리기를 닫는다", async () => {
    const record = installFakes("reject");
    const events: BeepEvent[] = [];
    playBeep((event) => events.push(event));
    await vi.advanceTimersByTimeAsync(0);

    expect(events).toEqual([{ phase: "error", code: "Error" }]);
    expect(record.closed).toBe(record.contexts);
  });

  it("playBeep: 깨우기가 머물러 end 가 안 오면 비프 길이 + 여유 뒤 'end 없음'을 알리고 처리기를 닫는다", async () => {
    const record = installFakes("hang");
    const events: BeepEvent[] = [];
    playBeep((event) => events.push(event));

    await vi.advanceTimersByTimeAsync(BEEP_DURATION_MS + BEEP_END_GRACE_MS - 1);
    expect(record.closed).toBe(0);
    await vi.advanceTimersByTimeAsync(1);

    expect(events).toEqual([
      { phase: "no-end", waitedMs: BEEP_DURATION_MS + BEEP_END_GRACE_MS },
    ]);
    expect(record.closed).toBe(record.contexts);
  });

  it("playBeep: end 가 오면 처리기를 닫고 여유가 지나도 'end 없음'을 더하지 않는다", async () => {
    const record = installFakes("ok");
    const events: BeepEvent[] = [];
    playBeep((event) => events.push(event));
    await vi.advanceTimersByTimeAsync(0);
    record.oscillators[0]?.onended?.();
    await vi.advanceTimersByTimeAsync(BEEP_DURATION_MS + BEEP_END_GRACE_MS);

    expect(events.map((e) => e.phase)).toEqual(["start", "end"]);
    expect(record.closed).toBe(1);
  });
});

import type { Page } from "@playwright/test";
import {
  BEEP_DURATION_MS,
  BEEP_END_GRACE_MS,
  BEEP_FREQUENCY_HZ,
  DEVICE_NAMES_NOTE,
  LATENCY_TITLE,
  MIC_LEVEL_DURATION_MS,
  MIC_LEVEL_FRAMES,
  MIC_LEVEL_HEARD_RMS,
  MIC_LEVEL_SAMPLE_INTERVAL_MS,
  RESUME_WAIT_MS,
} from "../../src/app/dev/speech-probe/probe-audio";
import {
  parseSpeechScript,
  type RecognitionRun,
  type SpeechScript,
} from "../../src/core/speech/script";
import type { FakeSpeechRecord } from "../../src/lib/speech/fake-web-speech";
import probeText from "../fixtures/speech/probe-text.json";
import { expect, loadSpeechScript, loadSpeechSettings, test } from "./fixtures";

// 시계는 goto 앞에 설치하고, 쪽이 뜬 뒤 멈춘다. 미는 값은 대본과 시험용 설정에서 읽는다(plan-p02 작업 순서 P2b 4).
const SETTINGS = loadSpeechSettings();
const WATCHDOG_MS = SETTINGS.maxListenMs + SETTINGS.watchdogExtraMs;
const CLOCK_START = new Date("2026-10-16T09:00:00+09:00").getTime();
/** 쪽이 뜨는 동안 시계가 흐르게 두었다가 이 만큼 뒤에 멈춘다. */
const PAUSE_AFTER_LOAD_MS = 60_000;
/** 타이머 묶음 처리(setTimeout 0)와 React 갱신이 끝나도록 더 미는 시간. 장면 시각이 아니라 기술 여유. */
const SETTLE_MS = 50;
/** 장면: 결과를 다 받은 뒤 아이가 '다 말했어요'를 누르기까지. */
const PRESS_AFTER_MS = 1_000;
/** 관찰 페이지 화면 사진을 남길 경로(구현 보고용, 값이 있을 때만). */
const SCREENSHOT_PATH = process.env.SPEECH_PROBE_SCREENSHOT;

async function openProbe(page: Page) {
  await page.clock.install({ time: CLOCK_START });
  await page.goto("/dev/speech-probe");
  await expect(page.getByTestId("speech-probe")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.clock.pauseAt(CLOCK_START + PAUSE_AFTER_LOAD_MS);
}

const advance = (page: Page, ms: number) => page.clock.runFor(ms + SETTLE_MS);

const fakeRecord = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __fakeSpeech: FakeSpeechRecord }).__fakeSpeech,
  );

const lastAt = (events: readonly { at: number }[] | undefined) =>
  Math.max(0, ...(events ?? []).map((e) => e.at));

function resultTimes(run: RecognitionRun | undefined): number[] {
  return (run?.events ?? [])
    .filter((e) => e.type === "result")
    .map((e) => e.at);
}

function utteranceMs(script: SpeechScript, index: number): number {
  const runs = script.synthesis?.utterances ?? [];
  const run = runs[Math.min(index, runs.length - 1)];
  return (run?.startAfter ?? 0) + (run?.endAfter ?? 0);
}

test.describe("관찰 페이지 · 긴 말", () => {
  test.use({ speechScript: loadSpeechScript("first-pause-end") });

  test("AC-5e 관찰 페이지: 첫 쉼에서 끝나는 가짜 인식에서 새 인식 객체로 다시 시작해 두 조각을 이어 붙인다", async ({
    page,
    speechScript,
  }) => {
    const [first, second] = speechScript.recognitions;
    const firstEnd = first?.events.find((e) => e.type === "end");
    if (firstEnd === undefined) throw new Error("대본에 첫 객체의 끝이 없다");
    await openProbe(page);

    await page.getByTestId("long-start").click();
    await advance(page, firstEnd.at);
    await advance(page, lastAt(second?.events) + PRESS_AFTER_MS);
    await page.getByTestId("long-done").click();
    await advance(page, lastAt(second?.onStop));

    await expect(page.getByTestId("long-pieces").locator("li")).toHaveText([
      "I see a big park",
      "there is a dog",
    ]);
    await expect(page.getByTestId("long-text")).toHaveText(
      "I see a big park there is a dog",
    );
    await expect(page.getByTestId("long-objects")).toHaveText("2");
    await expect(page.getByTestId("long-outcome")).toContainText("다시 시작 1");
    expect((await fakeRecord(page)).created).toBe(2);
  });
});

test.describe("관찰 페이지 · 교대", () => {
  test.use({ speechScript: loadSpeechScript("alternation-ok") });

  test("관찰 페이지: 읽어 주기 → 인식 교대 세 턴이 턴마다 새 인식 객체를 쓰고 둘째 턴부터 누름 없이 읽어 준다", async ({
    page,
    speechScript,
  }) => {
    const turns = speechScript.recognitions.length;
    const sentences = probeText.sentences.slice(0, turns);
    await openProbe(page);

    await page.getByTestId("alt-start").click();
    // 첫 발화 차례는 제약 풀기(빈칸 한 글자)가 쓰고, 문장 읽기는 그다음 차례다.
    for (let turn = 0; turn < turns; turn += 1) {
      await advance(page, utteranceMs(speechScript, turn + 1));
      await expect(page.getByTestId("alt-status")).toHaveText("ready");
      await page.getByTestId("alt-speak").click();
      const run = speechScript.recognitions[turn];
      await advance(
        page,
        Math.max(...resultTimes(run)) +
          SETTINGS.endSilenceMs["1-3"] +
          lastAt(run?.onStop),
      );
      await expect(page.getByTestId("alt-turn")).toHaveCount(turn + 1);
      const record = await fakeRecord(page);
      expect(record.created).toBe(turn + 1);
      if (turn + 1 < turns) {
        // 다음 문장은 누름 없이 읽어 주기 시작했다.
        expect(record.spoken.at(-1)).toBe(sentences[turn + 1]);
      }
    }

    const record = await fakeRecord(page);
    // 셋째 턴 뒤에도 넷째 문장을 누름 없이 읽기 시작한다(시험 문장은 열 개).
    expect(record.spoken.slice(0, turns + 1)).toEqual([" ", ...sentences]);
    expect(record.calls.filter((c) => c.method === "start")).toHaveLength(
      turns,
    );
    expect(new Set(record.calls.map((c) => c.id)).size).toBe(turns);
    await expect(page.getByTestId("alt-turn").first()).toContainText(
      "들은 글: I like apples",
    );
  });
});

test.describe("관찰 페이지 · 교대 끊김", () => {
  test.use({ speechScript: loadSpeechScript("alternation-ok") });

  test("관찰 페이지: 교대 시험의 듣기가 쪽 숨김으로 끊기면 턴으로 세지 않고 다음 문장을 읽지 않으며 말하기 버튼을 다시 보인다", async ({
    page,
    speechScript,
  }) => {
    await openProbe(page);
    await page.getByTestId("alt-start").click();
    await advance(page, utteranceMs(speechScript, 1));
    await page.getByTestId("alt-speak").click();
    await expect(page.getByTestId("alt-status")).toHaveText("listening");

    // 쪽이 숨는다(나-4). 가짜 문서 상태로 visibilitychange 를 일으킨다.
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        value: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await advance(page, 0);

    await expect(page.getByTestId("alt-interrupted")).toContainText(
      "끊김(hidden)",
    );
    await expect(page.getByTestId("alt-status")).toHaveText("ready");
    await expect(page.getByTestId("alt-turn")).toHaveCount(0);
    await expect(page.getByTestId("alt-speak")).toBeEnabled();
    const afterCut = await fakeRecord(page);
    expect(afterCut.spoken).toEqual([" ", probeText.sentences[0]]);
    expect(afterCut.calls.map((c) => [c.id, c.method])).toEqual([
      [1, "start"],
      [1, "abort"],
    ]);

    // 돌아와 같은 문장으로 다시 듣는다.
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        value: false,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.getByTestId("alt-speak").click();
    const run = speechScript.recognitions[1];
    await advance(
      page,
      Math.max(...resultTimes(run)) +
        SETTINGS.endSilenceMs["1-3"] +
        lastAt(run?.onStop),
    );
    await expect(page.getByTestId("alt-turn")).toHaveCount(1);
    await expect(page.getByTestId("alt-turn").first()).toContainText(
      `문장: ${probeText.sentences[0]}`,
    );
    expect((await fakeRecord(page)).created).toBe(2);
  });
});

test.describe("관찰 페이지 · 마이크 확인 끊김", () => {
  test.use({ speechScript: loadSpeechScript("hang-twice") });

  test("관찰 페이지: 마이크 확인 중 듣기를 시작하면 확인이 끊김으로 끝나고 인식 객체가 함께 돌지 않는다", async ({
    page,
  }) => {
    await openProbe(page);
    await page.getByTestId("mic-check").click();
    await advance(page, 0);
    await expect(page.getByTestId("mic-result")).toHaveText("아직 안 함");

    await page.getByTestId("watchdog-listen").click();
    await advance(page, 0);

    await expect(page.getByTestId("mic-result")).toHaveText(
      "실패 · 코드 interrupted-leave · 갈래 retry",
    );
    const record = await fakeRecord(page);
    expect(record.created).toBe(2);
    // 확인 객체(1)를 abort 한 뒤에 듣기 객체(2)를 시작한다.
    expect(record.calls.map((c) => [c.id, c.method])).toEqual([
      [1, "start"],
      [1, "abort"],
      [2, "start"],
    ]);
  });
});

test.describe("관찰 페이지 · 감시 타이머", () => {
  test.use({ speechScript: loadSpeechScript("hang-twice") });

  test("관찰 페이지: 이벤트가 오지 않는 가짜에서 감시 타이머가 한 번 다시 시작하고 또 멈추면 '멈춤'이다", async ({
    page,
  }) => {
    await openProbe(page);
    await page.getByTestId("watchdog-listen").click();
    await advance(page, WATCHDOG_MS);
    await expect(page.getByTestId("watchdog-outcome")).toHaveText("듣는 중");
    await advance(page, WATCHDOG_MS);

    await expect(page.getByTestId("watchdog-outcome")).toHaveText("멈춤");
    await expect(page.getByTestId("watchdog-objects")).toHaveText("2");
    expect((await fakeRecord(page)).created).toBe(2);
  });
});

test.describe("관찰 페이지 · 인식 API 없음", () => {
  test.use({ speechScript: loadSpeechScript("no-recognition-api") });

  test("관찰 페이지: 인식 API 가 없으면 기기 판정이 no-api 이고 마이크 확인이 실패한다", async ({
    page,
  }) => {
    await openProbe(page);
    await expect(page.getByTestId("device-verdict")).toHaveText("no-api");
    await page.getByTestId("mic-check").click();
    await advance(page, 0);
    await expect(page.getByTestId("mic-result")).toHaveText(
      "실패 · 코드 no-api · 갈래 mic-unavailable",
    );
  });
});

test.describe("관찰 페이지 · 권한 거부", () => {
  test.use({ speechScript: loadSpeechScript("not-allowed") });

  test("관찰 페이지: not-allowed 는 mic-unavailable 갈래로 보인다", async ({
    page,
    speechScript,
  }) => {
    const run = speechScript.recognitions[0];
    await openProbe(page);

    await page.getByTestId("mic-check").click();
    await advance(page, lastAt(run?.events));
    await expect(page.getByTestId("mic-result")).toHaveText(
      "실패 · 코드 not-allowed · 갈래 mic-unavailable",
    );

    await page.getByTestId("watchdog-listen").click();
    await advance(page, lastAt(run?.events));
    await expect(page.getByTestId("watchdog-outcome")).toHaveText(
      "오류 not-allowed · 갈래 mic-unavailable",
    );
  });
});

test.describe("관찰 페이지 · 내보내기", () => {
  test("관찰 페이지: 내보낸 대본이 대본 규격을 통과한다", async ({
    page,
    speechScript,
  }) => {
    const run = speechScript.recognitions[0];
    await openProbe(page);

    await page.getByTestId("watchdog-listen").click();
    await advance(
      page,
      Math.max(...resultTimes(run)) +
        SETTINGS.endSilenceMs["1-3"] +
        lastAt(run?.onStop),
    );
    await expect(page.getByTestId("watchdog-outcome")).toContainText("결과");

    await page.getByTestId("export").click();
    await expect(page.getByTestId("export-check")).toHaveText("대본 규격 통과");
    const exported = parseSpeechScript(
      JSON.parse(await page.getByTestId("export-text").inputValue()),
    );
    expect(exported.recognitions).toHaveLength(1);
    expect(exported.observed).toHaveLength(1);
    expect(exported.observed?.[0]?.outcome).toMatchObject({
      kind: "result",
      text: "I like apples",
      endedBy: "silence",
    });
    expect(exported.observed?.[0]?.settings).toEqual(SETTINGS);
    if (SCREENSHOT_PATH) {
      await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
    }
  });
});

// ── 관찰 페이지 2판(task-speech-probe-2): 환경 사실 · 장치 목록 · 마이크 소리 재기 · 비프 · 들렸어요 · 오디오 세션 꼴 ──

type FakeAudioOptions = {
  /** 틀마다 돌려줄 RMS(마지막 값이 이어진다). */
  levels: number[];
  /** navigator.audioSession 의 처음 꼴. null 이면 API 가 없다. */
  audioSession: string | null;
  /** getUserMedia 가 이 이름의 DOMException 으로 거부한다. */
  micError: string | null;
  /** 처리기 깨우기(resume): 바로 풀림 · 안 풀림(검토 I-1). */
  resume: "ok" | "hang";
  /** 가짜 마이크 · 입력 장치 이름. */
  label: string;
};

/** 가짜 마이크 · 입력 장치의 이름(사람 이름 꼴 — 기록 · 화면에 원문이 없어야 한다, 검토 I-2). */
const PERSON_LIKE_LABEL = "홍길동의 AirPods";
const PERSON_NAME = "홍길동";

type FakeAudioRecord = {
  getUserMedia: number;
  stoppedTracks: number;
  contexts: number;
  closed: number;
  oscillators: number[];
};

/**
 * 가짜 getUserMedia · enumerateDevices · AudioContext · audioSession. addInitScript 가 함수 글을 옮기므로 밖 이름 ·
 * 클래스 필드 · 객체 펼침을 쓰지 않는다(fake-web-speech.ts 와 같은 까닭). 소리는 만들지 않는다.
 */
function installFakeAudio(options: FakeAudioOptions): void {
  const w = window as unknown as Record<string, unknown>;
  const record: FakeAudioRecord = {
    getUserMedia: 0,
    stoppedTracks: 0,
    contexts: 0,
    closed: 0,
    oscillators: [],
  };
  w.__fakeAudio = record;
  let granted = false;
  let frame = 0;

  // 실제 API 처럼 부를 때마다 새 마이크 · 스트림을 준다(검토 M-5). 멈춤은 마이크마다 한 번 센다.
  const newStream = () => {
    const track = {
      kind: "audio",
      label: options.label,
      muted: false,
      enabled: true,
      readyState: "live",
      stop() {
        if (track.readyState !== "ended") record.stoppedTracks += 1;
        track.readyState = "ended";
      },
      getSettings() {
        return { sampleRate: 48_000, channelCount: 1, echoCancellation: true };
      },
    };
    return { getTracks: () => [track], getAudioTracks: () => [track] };
  };
  const mediaDevices = {
    getUserMedia() {
      record.getUserMedia += 1;
      if (options.micError !== null) {
        return Promise.reject(new DOMException("가짜 거부", options.micError));
      }
      granted = true;
      return Promise.resolve(newStream());
    },
    enumerateDevices() {
      return Promise.resolve([
        {
          kind: "audioinput",
          label: granted ? options.label : "",
          deviceId: "",
          groupId: "",
        },
        { kind: "videoinput", label: "", deviceId: "", groupId: "" },
      ]);
    },
  };
  Object.defineProperty(navigator, "mediaDevices", {
    value: mediaDevices,
    configurable: true,
  });
  // 홈 화면 아이콘 실행이 아님(브라우저마다 달라 시험에서 정한다).
  Object.defineProperty(navigator, "standalone", {
    value: false,
    configurable: true,
  });

  const node = () => ({ connect() {}, disconnect() {} });
  function FakeAudioContext() {
    record.contexts += 1;
    const context = {
      sampleRate: 48_000,
      state: "suspended",
      currentTime: 0,
      baseLatency: 0.01,
      destination: node(),
      resume() {
        if (options.resume === "hang") return new Promise<void>(() => {});
        context.state = "running";
        return Promise.resolve();
      },
      close() {
        context.state = "closed";
        record.closed += 1;
        return Promise.resolve();
      },
      createMediaStreamSource: () => node(),
      createGain: () => ({
        gain: { value: 1 },
        connect() {},
        disconnect() {},
      }),
      createAnalyser() {
        return {
          fftSize: 2_048,
          connect() {},
          disconnect() {},
          getFloatTimeDomainData(buffer: Float32Array) {
            const level =
              options.levels[Math.min(frame, options.levels.length - 1)] ?? 0;
            frame += 1;
            buffer.fill(level);
          },
        };
      },
      createOscillator() {
        const oscillator = {
          type: "sine",
          frequency: { value: 0 },
          onended: null as null | (() => void),
          connect() {},
          disconnect() {},
          start() {},
          stop(when: number) {
            record.oscillators.push(oscillator.frequency.value);
            // 처리기가 깨어 있을 때만 소리가 끝난다(깨우기가 머물면 currentTime 이 안 가 end 가 없다).
            window.setTimeout(
              () => {
                if (context.state === "running") oscillator.onended?.();
              },
              (when - context.currentTime) * 1_000,
            );
          },
        };
        return oscillator;
      },
    };
    return context;
  }
  Object.defineProperty(window, "AudioContext", {
    value: FakeAudioContext,
    configurable: true,
  });

  const session =
    options.audioSession === null
      ? undefined
      : {
          type: options.audioSession,
          state: "inactive",
          addEventListener() {},
          removeEventListener() {},
        };
  Object.defineProperty(navigator, "audioSession", {
    value: session,
    configurable: true,
  });
}

const fakeAudio = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __fakeAudio: FakeAudioRecord }).__fakeAudio,
  );

const traceRow = (page: Page, kind: string, text?: string) =>
  page
    .getByTestId("trace-rows")
    .locator("tr")
    .filter({ has: page.locator("td:nth-child(3)", { hasText: kind }) })
    .filter(text === undefined ? {} : { hasText: text });

const QUIET = MIC_LEVEL_HEARD_RMS / 10;
const LOUD = MIC_LEVEL_HEARD_RMS * 10;
/** 틀의 앞 절반은 조용하고 뒤 절반은 크다(들린 비율 50%). */
const HALF_LOUD: FakeAudioOptions = {
  levels: [...Array<number>(MIC_LEVEL_FRAMES / 2).fill(QUIET), LOUD],
  audioSession: null,
  micError: null,
  resume: "ok",
  label: PERSON_LIKE_LABEL,
};

test.describe("관찰 페이지 2판 · 환경 사실", () => {
  test("관찰 페이지 2판: 쪽이 열리면 환경 사실 칸과 기록 표에 env · devices 줄이 보이고 오디오 세션 API 가 없으면 꼴 바꾸기가 꺼진다", async ({
    page,
  }) => {
    await page.addInitScript(installFakeAudio, HALF_LOUD);
    await openProbe(page);

    const env = page.getByTestId("probe-env");
    await expect(env.getByTestId("env-audio-session")).toHaveText("없음");
    await expect(env.getByTestId("env-audio-context")).toContainText("48000Hz");
    await expect(env.getByTestId("env-standalone")).toHaveText("false");
    await expect(env.getByTestId("env-display-mode")).toHaveText("아니오");
    await expect(traceRow(page, "env", "load")).toHaveCount(1);
    await expect(
      traceRow(page, "devices", "before-permission · 2개"),
    ).toHaveCount(1);
    await expect(page.getByTestId("devices-summary")).toContainText(
      "audioinput 1",
    );
    await expect(page.getByTestId("audio-session-type")).toBeDisabled();
    await expect(page.getByTestId("speak-playback")).toBeDisabled();
    await expect(page.getByTestId("audio-session-auto")).toBeDisabled();
    await expect(page.getByTestId("silent-mode-hint")).toHaveText(
      "iPad 사파리에서 소리가 안 나거나 말이 안 잡히면 제어 센터의 무음 모드(벨)를 먼저 확인해요",
    );
    // 쪽을 열 때 만든 처리기는 바로 닫는다.
    const audio = await fakeAudio(page);
    expect(audio.contexts).toBe(1);
    expect(audio.closed).toBe(1);
    expect(audio.getUserMedia).toBe(0);
  });
});

test.describe("관찰 페이지 2판 · 마이크 소리 재기", () => {
  test("관찰 페이지 2판: '마이크 소리 재기'가 인식 없이 3초 동안 재어 mic-level 줄을 남기고 스트림 트랙을 멈추며 권한 뒤 장치 목록을 다시 적는다", async ({
    page,
  }) => {
    await page.addInitScript(installFakeAudio, HALF_LOUD);
    await openProbe(page);

    await page.getByTestId("mic-level").click();
    await advance(page, MIC_LEVEL_DURATION_MS);

    const result = page.getByTestId("mic-level-result");
    await expect(result).toContainText(`최대 ${LOUD.toPrecision(3)}`);
    await expect(result).toContainText("들린 비율 50%");
    await expect(result).toContainText("마이크 끔 예");
    await expect(traceRow(page, "mic-level", "들린 비율 50%")).toHaveCount(1);
    await expect(
      traceRow(
        page,
        "devices",
        "after-permission · 2개 · audioinput 1[블루투스 · 외부 1] · videoinput 1[권한 전 1]",
      ),
    ).toHaveCount(1);
    const audio = await fakeAudio(page);
    expect(audio.getUserMedia).toBe(1);
    expect(audio.stoppedTracks).toBe(1);
    // 쪽을 열 때 하나 · 재기 하나, 둘 다 닫았다.
    expect(audio.closed).toBe(audio.contexts);
    // 인식 서비스와 상관없이 잰다(마이크 확인 · 인식 객체를 만들지 않는다).
    expect((await fakeRecord(page)).created).toBe(0);
    await expect(page.getByTestId("mic-result")).toHaveText("아직 안 함");
  });

  test("관찰 페이지 2판: 마이크 권한 거부는 '마이크 소리 재기'에 코드로 남는다", async ({
    page,
  }) => {
    await page.addInitScript(installFakeAudio, {
      ...HALF_LOUD,
      micError: "NotAllowedError",
    });
    await openProbe(page);

    await page.getByTestId("mic-level").click();
    await advance(page, 0);

    await expect(page.getByTestId("mic-level-result")).toHaveText(
      "실패 NotAllowedError · 단계 permission · 세션 없음",
    );
    await expect(traceRow(page, "mic-level", "NotAllowedError")).toHaveCount(1);
    expect((await fakeAudio(page)).closed).toBe(2);
  });
});

test.describe("관찰 페이지 2판 · 소리 나가기와 오디오 세션 꼴", () => {
  test("관찰 페이지 2판: 오디오 세션 꼴을 바꾸면 audio-session 줄이 남고 비프 · 읽어 주기 뒤 들렸어요 · 안 들렸어요가 heard 줄로 남는다", async ({
    page,
  }) => {
    await page.addInitScript(installFakeAudio, {
      ...HALF_LOUD,
      audioSession: "auto",
    });
    await openProbe(page);
    await expect(page.getByTestId("env-audio-session")).toHaveText(
      "auto(inactive)",
    );

    await page.getByTestId("audio-session-type").selectOption("playback");
    await expect(
      traceRow(
        page,
        "audio-session",
        "auto → playback 요청 · 읽은 값 playback",
      ),
    ).toHaveCount(1);
    await expect(page.getByTestId("audio-session-current")).toHaveText(
      "playback",
    );

    await page.getByTestId("beep").click();
    await advance(page, BEEP_DURATION_MS);
    await expect(
      traceRow(page, "beep", "start · 처리기 running · 세션 playback"),
    ).toHaveCount(1);
    await expect(traceRow(page, "beep", "end")).toHaveCount(1);
    await page.getByTestId("beep-not-heard").click();
    await expect(
      traceRow(page, "heard", "beep · 안 들렸어요 · 세션 playback"),
    ).toHaveCount(1);
    expect((await fakeAudio(page)).oscillators).toEqual([BEEP_FREQUENCY_HZ]);

    await page.getByTestId("speak-test").click();
    await advance(page, 0);
    await page.getByTestId("speak-heard").click();
    await expect(
      traceRow(page, "heard", "speak · 들렸어요 · 세션 playback"),
    ).toHaveCount(1);
    // 읽어 주기는 지금 문장 그대로(제약 풀기 빈칸 다음).
    expect((await fakeRecord(page)).spoken).toEqual([
      " ",
      probeText.sentences[0],
    ]);
  });

  test("관찰 페이지 2판: 기록 표 복사 글은 사실 줄을 머리에 한 줄씩 두고 표 머리 뒤에 기록 줄을 잇는다", async ({
    page,
  }) => {
    await page.addInitScript(installFakeAudio, HALF_LOUD);
    await openProbe(page);

    await page.getByTestId("copy-log").click();
    const text = await page.getByTestId("log-text").inputValue();
    const lines = text.split("\n");
    expect(lines[0]).toBe(DEVICE_NAMES_NOTE);
    expect(lines[1]).toMatch(/^판정: /);
    expect(lines).toContain("audioSession.type: 없음");
    const header = lines.indexOf("ms\t듣기 · 객체\t종류\t내용");
    expect(header).toBeGreaterThan(0);
    expect(lines[header - 1]).toBe("");
    expect(lines.slice(header + 1).some((l) => l.includes("\tenv\tload"))).toBe(
      true,
    );
  });
});

test.describe("관찰 페이지 2판 · 듣기 지연과 듣기 중 함께 재기", () => {
  test("관찰 페이지 2판: 듣기 지연 요약이 듣기 · 객체마다 start 호출 기준 start 이벤트 · audiostart(start 뒤 틈) · 첫 소리 · 첫 결과를 한 줄로 보이고 복사 글에 들어간다", async ({
    page,
    speechScript,
  }) => {
    const run = speechScript.recognitions[0];
    await page.addInitScript(installFakeAudio, HALF_LOUD);
    await openProbe(page);

    await page.getByTestId("watchdog-listen").click();
    await advance(
      page,
      Math.max(...resultTimes(run)) +
        SETTINGS.endSilenceMs["1-3"] +
        lastAt(run?.onStop),
    );
    await expect(page.getByTestId("watchdog-outcome")).toContainText("결과");

    const expected =
      "start 이벤트 +50 · audiostart +100(start 뒤 +50) · speechstart +400 · 첫 결과 +900";
    await expect(page.getByTestId("latency-lines")).toContainText(
      "듣기 1 · 객체 1 · 규칙 ",
    );
    await expect(page.getByTestId("latency-lines")).toContainText(expected);

    await page.getByTestId("copy-log").click();
    const lines = (await page.getByTestId("log-text").inputValue()).split("\n");
    const title = lines.indexOf(LATENCY_TITLE);
    expect(title).toBeGreaterThan(0);
    expect(lines[title + 1]).toContain(expected);
    // 듣기 중 함께 재기를 켜지 않았으면 마이크 스트림을 열지 않는다.
    expect((await fakeAudio(page)).getUserMedia).toBe(0);
  });

  test("관찰 페이지 2판: '듣기 중 함께 재기'를 켜면 인식이 도는 동안 소리 세기를 재어 listen-done 줄에 붙이고 듣기가 끝나면 트랙을 멈춘다", async ({
    page,
    speechScript,
  }) => {
    const run = speechScript.recognitions[0];
    await page.addInitScript(installFakeAudio, HALF_LOUD);
    await openProbe(page);

    await page.getByTestId("listen-level").check();
    await page.getByTestId("watchdog-listen").click();
    await advance(
      page,
      Math.max(...resultTimes(run)) +
        SETTINGS.endSilenceMs["1-3"] +
        lastAt(run?.onStop),
    );
    await expect(page.getByTestId("watchdog-outcome")).toContainText("결과");
    // 듣기가 끝난 뒤 재기는 다음 틀에서 멈춘다.
    await advance(page, MIC_LEVEL_SAMPLE_INTERVAL_MS);

    const done = traceRow(page, "listen-done");
    await expect(done).toContainText(
      `함께 잰 소리 최대 ${LOUD.toPrecision(3)}`,
    );
    await expect(done).toContainText("마이크 끔 예");
    const audio = await fakeAudio(page);
    expect(audio.getUserMedia).toBe(1);
    expect(audio.stoppedTracks).toBe(1);
    expect(audio.closed).toBe(audio.contexts);
  });
});

test.describe("관찰 페이지 2판 · playback 으로 두고 읽어 주기", () => {
  test("관찰 페이지 2판: 'playback 으로 두고 읽어 주기'는 세션 꼴을 playback 으로 바꾼 뒤 지금 문장을 읽고 답이 speak-playback heard 줄로 남는다", async ({
    page,
  }) => {
    await page.addInitScript(installFakeAudio, {
      ...HALF_LOUD,
      audioSession: "auto",
    });
    await openProbe(page);

    await page.getByTestId("speak-playback").click();
    await advance(page, 0);
    await expect(
      traceRow(
        page,
        "audio-session",
        "auto → playback 요청 · 읽은 값 playback",
      ),
    ).toHaveCount(1);
    expect((await fakeRecord(page)).spoken).toEqual([
      " ",
      probeText.sentences[0],
    ]);
    await page.getByTestId("speak-playback-heard").click();
    await expect(
      traceRow(page, "heard", "speak-playback · 들렸어요 · 세션 playback"),
    ).toHaveCount(1);
  });
});

test.describe("관찰 페이지 2판 · 오디오 세션 자동으로 두기", () => {
  test("관찰 페이지 2판: '자동으로 두기'를 켜면 읽어 주기 앞에 playback, 듣기 · 마이크 확인 앞에 play-and-record 로 두고 바꿀 때만 audio-session 줄을 남기며 지연 줄에 세션 꼴이 보인다", async ({
    page,
    speechScript,
  }) => {
    const run = speechScript.recognitions[0];
    await page.addInitScript(installFakeAudio, {
      ...HALF_LOUD,
      audioSession: "auto",
    });
    await openProbe(page);

    await page.getByTestId("audio-session-auto").check();
    await page.getByTestId("speak-test").click();
    await advance(page, 0);
    // 꼴 바꾸기 → 제약 풀기(첫 speak 줄) → 읽어 주기 요청 → 읽기 순서(검토 M-3 · M-4).
    const kinds = await page
      .getByTestId("trace-rows")
      .locator("td:nth-child(3)")
      .allTextContents();
    const sessionAt = kinds.indexOf("audio-session");
    expect(sessionAt).toBeGreaterThanOrEqual(0);
    expect(sessionAt).toBeLessThan(kinds.indexOf("speak"));
    expect(kinds.indexOf("speak")).toBeLessThan(kinds.indexOf("speak-request"));
    await expect(
      traceRow(page, "speak-request", "speak · 세션 playback · 누름 안"),
    ).toHaveCount(1);
    await expect(
      traceRow(
        page,
        "audio-session",
        "auto → playback 요청 · 읽은 값 playback · 자동",
      ),
    ).toHaveCount(1);
    await expect(page.getByTestId("env-audio-session")).toHaveText(
      "playback(inactive)",
    );

    await page.getByTestId("watchdog-listen").click();
    await advance(
      page,
      Math.max(...resultTimes(run)) +
        SETTINGS.endSilenceMs["1-3"] +
        lastAt(run?.onStop),
    );
    await expect(page.getByTestId("watchdog-outcome")).toContainText("결과");
    await expect(
      traceRow(
        page,
        "audio-session",
        "playback → play-and-record 요청 · 읽은 값 play-and-record · 자동",
      ),
    ).toHaveCount(1);
    await expect(page.getByTestId("latency-lines")).toContainText(
      "세션 play-and-record",
    );

    // 이미 play-and-record 면 마이크 확인 앞에서 다시 바꾸지 않는다.
    await page.getByTestId("mic-check").click();
    await advance(page, 0);
    await expect(traceRow(page, "audio-session")).toHaveCount(2);
    await expect(page.getByTestId("audio-session-current")).toHaveText(
      "play-and-record",
    );
  });

  test("관찰 페이지 2판: '자동으로 두기'를 끈 채면 읽어 주기 · 듣기가 세션 꼴을 바꾸지 않는다", async ({
    page,
  }) => {
    await page.addInitScript(installFakeAudio, {
      ...HALF_LOUD,
      audioSession: "auto",
    });
    await openProbe(page);

    await page.getByTestId("speak-test").click();
    await page.getByTestId("watchdog-listen").click();
    await advance(page, 0);
    await expect(traceRow(page, "audio-session")).toHaveCount(0);
    // 교대 시험의 읽어 주기 요청 줄은 몇째 문장인지 적는다(검토 M-4).
    await page.getByTestId("alt-start").click();
    await expect(
      traceRow(page, "speak-request", "alternation 1째 문장 · 세션 auto"),
    ).toHaveCount(1);
    await expect(page.getByTestId("audio-session-current")).toHaveText("auto");
  });
});

test.describe("관찰 페이지 2판 fix 1 · 마이크 끄기 보장 · 이름 없음 · 두 번 재기", () => {
  test("관찰 페이지 2판 fix 1: 처리기 깨우기가 안 풀리면 소리 재기는 상한 뒤 마이크를 끄고 '처리기 깨우기 없음' 줄을, 비프는 end 없음 뒤 처리기를 닫고 줄을 남긴다", async ({
    page,
  }) => {
    await page.addInitScript(installFakeAudio, {
      ...HALF_LOUD,
      resume: "hang" as const,
    });
    await openProbe(page);

    await page.getByTestId("mic-level").click();
    await advance(page, RESUME_WAIT_MS);
    const result = page.getByTestId("mic-level-result");
    await expect(result).toContainText(
      `처리기 깨우기 없음(상한 ${RESUME_WAIT_MS}ms)`,
    );
    await expect(result).toContainText("마이크 끔 예");
    await expect(traceRow(page, "mic-level", "처리기 깨우기 없음")).toHaveCount(
      1,
    );
    // 재기 단추가 '재는 중'으로 꺼진 채 남지 않는다.
    await expect(page.getByTestId("mic-level")).toBeEnabled();

    await page.getByTestId("beep").click();
    await advance(page, BEEP_DURATION_MS + BEEP_END_GRACE_MS);
    await expect(traceRow(page, "beep", "end 없음")).toHaveCount(1);

    const audio = await fakeAudio(page);
    expect(audio.getUserMedia).toBe(1);
    expect(audio.stoppedTracks).toBe(1);
    expect(audio.closed).toBe(audio.contexts);
  });

  test("관찰 페이지 2판 fix 1: '마이크 소리 재기' 뒤 '듣기 중 함께 재기'로 두 번 재면 마이크를 둘 다 끄고, 장치 이름 원문은 화면 · 복사 글 어디에도 없다", async ({
    page,
    speechScript,
  }) => {
    const run = speechScript.recognitions[0];
    await page.addInitScript(installFakeAudio, HALF_LOUD);
    await openProbe(page);

    await page.getByTestId("mic-level").click();
    await advance(page, MIC_LEVEL_DURATION_MS);
    await expect(page.getByTestId("mic-level-result")).toContainText(
      "마이크 끔 예",
    );

    await page.getByTestId("listen-level").check();
    await page.getByTestId("watchdog-listen").click();
    await advance(
      page,
      Math.max(...resultTimes(run)) +
        SETTINGS.endSilenceMs["1-3"] +
        lastAt(run?.onStop),
    );
    await advance(page, MIC_LEVEL_SAMPLE_INTERVAL_MS);
    await expect(traceRow(page, "listen-done")).toContainText("마이크 끔 예");

    const audio = await fakeAudio(page);
    expect(audio.getUserMedia).toBe(2);
    expect(audio.stoppedTracks).toBe(2);
    expect(audio.closed).toBe(audio.contexts);

    await page.getByTestId("copy-log").click();
    const text = await page.getByTestId("log-text").inputValue();
    expect(text).toContain("블루투스 · 외부");
    expect(text).not.toContain(PERSON_NAME);
    await expect(page.locator("body")).not.toContainText(PERSON_NAME);
  });
});

test.describe("관찰 페이지 3판 · 읽어 주기 끝난 뒤 자동 듣기", () => {
  test.use({ speechScript: loadSpeechScript("alternation-ok") });

  test("관찰 페이지 3판: 자동 듣기를 켜고 대기 2초를 고르면 읽어 주기 끝 2초 뒤 누름 없이 듣기를 시작해 한 문장 뒤 멈추고, 간격이 listen-begin 줄 · 지연 요약에 남는다", async ({
    page,
    speechScript,
  }) => {
    const waitSeconds = 2;
    const waitMs = waitSeconds * 1_000;
    const run = speechScript.recognitions[0];
    await openProbe(page);

    await page.getByTestId("alt-auto-listen").check();
    await page.getByTestId("alt-auto-wait").selectOption(String(waitSeconds));
    await page.getByTestId("alt-start").click();
    // 문장 읽기가 끝난 뒤(+ 기술 여유) 대기 직전까지는 듣기를 시작하지 않는다.
    await advance(page, utteranceMs(speechScript, 1));
    await advance(page, waitMs - SETTLE_MS * 3);
    expect((await fakeRecord(page)).created).toBe(0);
    await advance(page, SETTLE_MS);
    expect((await fakeRecord(page)).created).toBe(1);

    await advance(
      page,
      Math.max(...resultTimes(run)) +
        SETTINGS.endSilenceMs["1-3"] +
        lastAt(run?.onStop),
    );
    await expect(page.getByTestId("alt-turn")).toHaveCount(1);
    await expect(page.getByTestId("alt-status")).toHaveText("done");
    // 한 문장만 하고 다음 문장은 읽지 않는다.
    expect((await fakeRecord(page)).spoken).toEqual([
      " ",
      probeText.sentences[0],
    ]);
    await expect(
      traceRow(
        page,
        "auto-listen",
        `교대 1째 문장 · 읽어 주기 ended 뒤 ${waitMs}ms 기다려 누름 없이 듣기 시작`,
      ),
    ).toHaveCount(1);
    await expect(traceRow(page, "button")).toHaveCount(0);
    await expect(traceRow(page, "listen-begin")).toContainText(
      `읽어 주기 끝 → start 호출 +${waitMs}`,
    );
    await expect(page.getByTestId("latency-lines")).toContainText(
      `읽어 주기 끝 → start 호출 +${waitMs}`,
    );
  });

  test("관찰 페이지 3판: 자동 듣기를 끈 채면 읽어 주기가 끝나고 오래 지나도 듣기를 시작하지 않고 말하기 단추를 기다린다", async ({
    page,
    speechScript,
  }) => {
    await openProbe(page);
    await page.getByTestId("alt-start").click();
    await advance(page, utteranceMs(speechScript, 1) + 10_000);
    expect((await fakeRecord(page)).created).toBe(0);
    await expect(page.getByTestId("alt-status")).toHaveText("ready");
  });
});

test.describe("관찰 페이지 3판 · 긴 말 시험 간격", () => {
  test("관찰 페이지 3판: 읽어 주기 없이 시작한 듣기의 listen-begin 줄 · 지연 요약에는 '읽어 주기 끝 → start 호출 없음'", async ({
    page,
  }) => {
    await openProbe(page);
    await page.getByTestId("long-start").click();
    await advance(page, 0);
    await expect(traceRow(page, "listen-begin")).toContainText(
      "읽어 주기 끝 → start 호출 없음",
    );
    await expect(page.getByTestId("latency-lines")).toContainText(
      "읽어 주기 끝 → start 호출 없음",
    );
  });
});

test.describe("관찰 페이지 3판 · playback 되돌림과 재생 전용 꼴 경고", () => {
  test("관찰 페이지 3판: 'playback 으로 두고 읽어 주기'는 발화가 끝나면 앞 꼴(auto)로 되돌리고 '되돌림' 줄을 남긴다", async ({
    page,
    speechScript,
  }) => {
    await page.addInitScript(installFakeAudio, {
      ...HALF_LOUD,
      audioSession: "auto",
    });
    await openProbe(page);

    await page.getByTestId("speak-playback").click();
    await advance(page, 0);
    await expect(page.getByTestId("audio-session-current")).toHaveText(
      "playback",
    );
    await advance(page, utteranceMs(speechScript, 1));
    await expect(
      traceRow(
        page,
        "audio-session",
        "playback → auto 요청 · 읽은 값 auto · 되돌림",
      ),
    ).toHaveCount(1);
    await expect(page.getByTestId("audio-session-current")).toHaveText("auto");
  });

  test("관찰 페이지 3판: 꼴이 playback 인 채 듣기 · 마이크 확인 · 소리 재기를 시작하면 경고 줄만 남기고 꼴은 그대로, '자동으로 두기'를 켜면 play-and-record 로 바꿔 경고가 없다", async ({
    page,
  }) => {
    await page.addInitScript(installFakeAudio, {
      ...HALF_LOUD,
      audioSession: "auto",
    });
    await openProbe(page);
    await page.getByTestId("audio-session-type").selectOption("playback");

    await page.getByTestId("watchdog-listen").click();
    await advance(page, 0);
    await expect(
      traceRow(page, "session-warning", "재생 전용 꼴(playback)에서 듣기 시작"),
    ).toHaveCount(1);
    await expect(traceRow(page, "listen-begin")).toContainText("세션 playback");
    await page.getByTestId("mic-check").click();
    await advance(page, 0);
    await expect(
      traceRow(page, "session-warning", "마이크 확인 시작"),
    ).toHaveCount(1);
    await page.getByTestId("mic-level").click();
    await advance(page, 0);
    await expect(
      traceRow(page, "session-warning", "마이크 소리 재기 시작"),
    ).toHaveCount(1);
    await expect(page.getByTestId("audio-session-current")).toHaveText(
      "playback",
    );

    await advance(page, MIC_LEVEL_DURATION_MS);
    await page.getByTestId("audio-session-auto").check();
    await page.getByTestId("watchdog-listen").click();
    await advance(page, 0);
    await expect(traceRow(page, "session-warning")).toHaveCount(3);
    await expect(page.getByTestId("audio-session-current")).toHaveText(
      "play-and-record",
    );
  });
});

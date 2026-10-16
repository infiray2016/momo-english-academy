import type { Page } from "@playwright/test";
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

// 버리는 듣기 설정(iPad 버리는 듣기 plan 묶음 0 · spec 설계 4 · 7 · 13절 C213): 키 여섯이 시드 · 시험 설정에 있고, 하나라도 빠지면 던지며,
// 켤 기기 · 부모 줄을 보일 기기를 모드 × 기기 표로 본다. 시험 이름은 'AC-' 로 시작하지 않는다(plan 정한 것 11).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { describeDevice } from "@/core/speech/device";
import {
  DISCARD_MODE_VALUES,
  DISCARD_SETTING_KEYS,
  discardModeFrom,
  discardNoticeShown,
  discardOnDevice,
  discardSettingsFrom,
} from "@/core/speech/discard-settings";
import { TEST_SETTINGS, testSettingValues } from "../fixtures/settings";

type SeedRow = {
  key: string;
  scope: string;
  value: unknown;
  changeVia: string;
};
const seedRows = (
  JSON.parse(
    readFileSync(join(process.cwd(), "seed", "settings.json"), "utf8"),
  ) as { settings: SeedRow[] }
).settings;

const values = testSettingValues();
const read = (key: string) => values[key];

/** 기기 판정(7절 표) — UA 와 터치 점만 바꾸고 나머지 사실은 인식 · 읽기 · 보안 문맥이 다 있는 꼴. */
const device = (userAgent: string, maxTouchPoints = 0) =>
  describeDevice({
    userAgent,
    maxTouchPoints,
    hasStandardRecognition: false,
    hasWebkitRecognition: true,
    hasSynthesis: true,
    isSecureContext: true,
  });
const DEVICES = {
  // iPadOS 13+ 는 데스크톱 꼴 UA 이고 터치 점으로 iPad 가 된다
  ipad: device(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15",
    5,
  ),
  iphone: device(
    "Mozilla/5.0 (iPhone; CPU iPhone OS 27_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/15E148 Safari/604.1",
    5,
  ),
  macSafari: device(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15",
  ),
  chrome: device(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
  ),
} as const;

describe("버리는 듣기 설정 키 여섯(spec 설계 4)", () => {
  it("키 여섯이 seed/settings.json 에 집 전체 · 바꾸는 곳 시드로 있고, discard_mode 의 시드 값은 ios 다(C213)", () => {
    expect(DISCARD_SETTING_KEYS).toHaveLength(6);
    for (const key of DISCARD_SETTING_KEYS) {
      const row = seedRows.find((r) => r.key === key);
      expect(row, key).toMatchObject({ scope: "household", changeVia: "seed" });
    }
    expect(seedRows.find((r) => r.key === "speech.discard_mode")?.value).toBe(
      "ios",
    );
  });

  it("키 여섯이 TEST_SETTINGS 에 시드와 같은 범위 · 값으로 있다", () => {
    for (const key of DISCARD_SETTING_KEYS) {
      const fixture = (
        TEST_SETTINGS as Record<string, { scope: string; value: unknown }>
      )[key];
      const row = seedRows.find((r) => r.key === key);
      expect(fixture, key).toEqual({ scope: row?.scope, value: row?.value });
    }
  });

  it("시험 설정에서 읽으면 모드와 밀리초 다섯이 시드 값 그대로다", () => {
    const seedValue = (key: string) =>
      seedRows.find((r) => r.key === key)?.value;
    expect(discardSettingsFrom(read)).toEqual({
      mode: seedValue("speech.discard_mode"),
      restMs: seedValue("speech.discard_rest_ms"),
      liveAsMs: seedValue("speech.discard_live_as_ms"),
      minMs: seedValue("speech.discard_min_ms"),
      afterSoundMs: seedValue("speech.discard_after_sound_ms"),
      gapMs: seedValue("speech.discard_gap_ms"),
    });
    expect(discardModeFrom(read)).toBe(seedValue("speech.discard_mode"));
  });

  it("키가 하나라도 없으면 그 키 이름으로 던진다(조용한 기본값 없음)", () => {
    for (const missing of DISCARD_SETTING_KEYS) {
      expect(() =>
        discardSettingsFrom((key) => (key === missing ? undefined : read(key))),
      ).toThrow(missing);
    }
  });

  it("꼴이 틀리면 던진다: 모드는 ios · all · off 밖을 받지 않고, 밀리초는 음수 · 소수를 받지 않는다", () => {
    const withValue = (target: string, value: unknown) => (key: string) =>
      key === target ? value : read(key);
    expect(() =>
      discardSettingsFrom(withValue("speech.discard_mode", "android")),
    ).toThrow("speech.discard_mode");
    expect(() =>
      discardModeFrom(withValue("speech.discard_mode", "on")),
    ).toThrow("speech.discard_mode");
    expect(() =>
      discardSettingsFrom(withValue("speech.discard_gap_ms", -1)),
    ).toThrow("speech.discard_gap_ms");
    expect(() =>
      discardSettingsFrom(withValue("speech.discard_min_ms", 0.5)),
    ).toThrow("speech.discard_min_ms");
    expect(() =>
      discardSettingsFrom(withValue("speech.discard_rest_ms", "45000")),
    ).toThrow("speech.discard_rest_ms");
  });
});

describe("버리는 듣기를 켤 기기 · 부모 줄을 보일 기기(모드 × 기기 표, spec 설계 3 · 7)", () => {
  it("기기 판정 이름이 iPad · iPhone · macOS Safari · Windows Chrome 으로 갈린다(표의 전제)", () => {
    expect(DEVICES.ipad.name).toMatch(/^iPad /);
    expect(DEVICES.iphone.name).toMatch(/^iPhone /);
    expect(DEVICES.macSafari.name).toMatch(/^macOS Safari/);
    expect(DEVICES.chrome.name).toMatch(/^Windows Chrome/);
  });

  // [모드, 기기, 켬, 부모 줄]
  const TABLE: [
    (typeof DISCARD_MODE_VALUES)[number],
    keyof typeof DEVICES,
    boolean,
    boolean,
  ][] = [
    ["ios", "ipad", true, true],
    ["ios", "iphone", true, true],
    ["ios", "macSafari", false, false],
    ["ios", "chrome", false, false],
    ["all", "ipad", true, true],
    ["all", "iphone", true, true],
    ["all", "macSafari", true, false],
    ["all", "chrome", true, false],
    ["off", "ipad", false, false],
    ["off", "iphone", false, false],
    ["off", "macSafari", false, false],
    ["off", "chrome", false, false],
  ];

  it("표의 행이 모드 셋 × 기기 넷을 빠짐없이 덮는다", () => {
    expect(new Set(TABLE.map(([m, d]) => `${m}:${d}`)).size).toBe(
      DISCARD_MODE_VALUES.length * Object.keys(DEVICES).length,
    );
  });

  it.each(TABLE)(
    "모드 %s · 기기 %s: 켬 %s · 부모 줄 %s",
    (mode, name, on, notice) => {
      expect(discardOnDevice(mode, DEVICES[name])).toBe(on);
      expect(discardNoticeShown(mode, DEVICES[name])).toBe(notice);
    },
  );
});

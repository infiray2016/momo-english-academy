// 버리는 듣기 설정(iPad 버리는 듣기 spec 설계 4 · 7, plan 정한 것 3 · 13절 C213). 회화 화면 자료(lessonViewSettingsOf)와 첫 실행 자료
// (readFirstRunView)만 읽는다. 모든 영역의 세션 · 배치 · 결과가 읽는 SPEECH_SETTING_KEYS 에는 넣지 않는다: listen.ts 를 고치지 않고, 회화 밖
// 화면이 새 키 때문에 던질 일을 만들지 않으려는 것이다. 키가 하나라도 없거나 꼴이 틀리면 던진다(조용한 기본값 없음).
// 남은 시점 값(stop 뒤 end 상한 · 안전 상한)은 새 키가 아니라 speech.watchdog_extra_seconds · speech.max_listen_seconds 다(설계 4).
import { z } from "zod";
import type { DeviceVerdict } from "./device";
import { isIosWebkit } from "./listen";

/** speech.discard_mode 의 값: ios(iOS · iPadOS WebKit 만) · all(모든 기기, 시험용) · off(끔 — 되돌림 스위치, C213). */
export const DISCARD_MODE_VALUES = ["ios", "all", "off"] as const;
export type DiscardMode = (typeof DISCARD_MODE_VALUES)[number];

export type DiscardSettings = {
  /** speech.discard_mode — 버리는 듣기를 켤 기기. */
  mode: DiscardMode;
  /** speech.discard_rest_ms — 마지막 인식 세션 끝에서 이만큼 지났으면 버림 없이 읽고 누를 때 진짜를 연다(F1). */
  restMs: number;
  /** speech.discard_live_as_ms — 버림 start 뒤 이 안에 audiostart 가 오면 죽은 버림, 늦거나 없으면 살아 있는 버림(F3). */
  liveAsMs: number;
  /** speech.discard_min_ms — 버림을 닫는 하한(버림 start 기준, F5). */
  minMs: number;
  /** speech.discard_after_sound_ms — 소리 끝에서 버림 stop 까지의 여유 · speaking 거짓을 기다리는 상한(F5 · F9). */
  afterSoundMs: number;
  /** speech.discard_gap_ms — 버림 end 와 마지막 소리 끝에서 진짜 start 까지의 최소 간격(F6). */
  gapMs: number;
};

/** speech.discard_mode(첫 실행 자료는 이 키 하나만 읽는다). */
export const DISCARD_MODE_KEY = "speech.discard_mode";
const REST_KEY = "speech.discard_rest_ms";
const LIVE_AS_KEY = "speech.discard_live_as_ms";
const MIN_KEY = "speech.discard_min_ms";
const AFTER_SOUND_KEY = "speech.discard_after_sound_ms";
const GAP_KEY = "speech.discard_gap_ms";

/** discardSettingsFrom 이 읽는 12절 키 여섯(회화 화면 자료가 읽는 목록에 더한다. 첫 실행 자료는 DISCARD_MODE_KEY 하나만 읽는다). */
export const DISCARD_SETTING_KEYS: readonly string[] = [
  DISCARD_MODE_KEY,
  REST_KEY,
  LIVE_AS_KEY,
  MIN_KEY,
  AFTER_SOUND_KEY,
  GAP_KEY,
];

const modeSchema = z.enum(DISCARD_MODE_VALUES);
const msSchema = z.int().nonnegative();

function readSetting<T>(
  read: (key: string) => unknown,
  key: string,
  schema: z.ZodType<T>,
): T {
  const parsed = schema.safeParse(read(key));
  if (!parsed.success) {
    const reason = parsed.error.issues[0]?.message ?? "";
    throw new Error(`음성 설정 '${key}' 가 없거나 꼴이 틀렸다: ${reason}`);
  }
  return parsed.data;
}

/** speech.discard_mode 하나만 읽는다(첫 실행 부모 줄). 없거나 꼴이 틀리면 던진다. */
export function discardModeFrom(read: (key: string) => unknown): DiscardMode {
  return readSetting(read, DISCARD_MODE_KEY, modeSchema);
}

/** 설정 읽기 함수로 버리는 듣기 설정을 만든다. 키가 하나라도 없거나 꼴이 틀리면 던진다(조용한 기본값 없음). */
export function discardSettingsFrom(
  read: (key: string) => unknown,
): DiscardSettings {
  return {
    mode: discardModeFrom(read),
    restMs: readSetting(read, REST_KEY, msSchema),
    liveAsMs: readSetting(read, LIVE_AS_KEY, msSchema),
    minMs: readSetting(read, MIN_KEY, msSchema),
    afterSoundMs: readSetting(read, AFTER_SOUND_KEY, msSchema),
    gapMs: readSetting(read, GAP_KEY, msSchema),
  };
}

/** 이 기기에서 버리는 듣기를 켜는가(순수, deafDetectsOn 꼴 — 기기 판정은 isIosWebkit). 켜지 않으면 회화 듣기는 지금 그대로다(spec 설계 7). */
export function discardOnDevice(
  mode: DiscardMode,
  verdict: Pick<DeviceVerdict, "name">,
): boolean {
  if (mode === "all") return true;
  if (mode === "off") return false;
  return isIosWebkit(verdict);
}

/**
 * 첫 실행 음성 인식 안내 · 부모 화면 마이크 행에 부모 줄을 보이는가(순수, spec 설계 3): iOS WebKit 기기이고 그 기기에서 켜질 때만이다.
 * all 이어도 iOS 밖 기기에는 보이지 않는다(문구가 아이패드를 말하므로).
 */
export function discardNoticeShown(
  mode: DiscardMode,
  verdict: Pick<DeviceVerdict, "name">,
): boolean {
  return isIosWebkit(verdict) && discardOnDevice(mode, verdict);
}

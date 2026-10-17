"use client";

// 기기 마이크 상태(7절 '기기 상태는 그 브라우저에만' · '마이크를 쓸 수 없음' 행, plan-p10a 파일별 값 4).
// 마이크 확인이 mic-unavailable 갈래로 실패하면 이 브라우저의 localStorage 에 '쓸 수 없음'을 남긴다.
// 첫 실행 · 홈 · 배치가 같이 읽고, 1-나 부모 화면의 '마이크 다시 확인'이 clearMicState 로 지운다.
// 기기 판정은 P2a describeDevice 로 한다. 음성 인식 API 가 없는 기기는 부를 때마다 다시 판정한다(7절 '홈 진입마다 다시 확인').
// localStorage 를 못 쓰면(사생활 보호 모드 등) 상태 없음으로 본다.
import { type DeviceVerdict, describeDevice } from "@/core/speech/device";
import { deviceFacts } from "@/lib/speech/browser";

/** 저장 키(제안, 판 1). */
export const MIC_STATE_KEY = "momo.mic.v1";

export type MicState = { state: "unavailable"; code: string; at: string };

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** 저장된 상태(없거나 꼴이 다르면 undefined). */
export function readMicState(): MicState | undefined {
  try {
    const raw = storage()?.getItem(MIC_STATE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<MicState>;
    if (
      parsed.state === "unavailable" &&
      typeof parsed.code === "string" &&
      typeof parsed.at === "string"
    ) {
      return { state: parsed.state, code: parsed.code, at: parsed.at };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/** '쓸 수 없음'을 남긴다. 시각은 기기 시각(이 브라우저의 기록일 뿐, 서버 판정에 쓰지 않는다). */
export function markMicUnavailable(code: string): void {
  const value: MicState = {
    state: "unavailable",
    code,
    at: new Date().toISOString(),
  };
  try {
    storage()?.setItem(MIC_STATE_KEY, JSON.stringify(value));
  } catch {
    // 저장할 수 없으면 상태 없음으로 남는다
  }
}

/** 1-나 '마이크 다시 확인'. */
export function clearMicState(): void {
  try {
    storage()?.removeItem(MIC_STATE_KEY);
  } catch {
    // 지울 수 없으면 그대로
  }
}

/** 이 브라우저의 기기 판정(렌더 뒤 · 누름 처리 안에서만 부른다 — window 를 읽는다). 사실 모으기는 음성 접점과 한 벌. */
export function readDeviceVerdict(): DeviceVerdict {
  return describeDevice(deviceFacts());
}

/** 마이크를 쓸 수 있는가: 판정이 ok 이고 저장 상태가 '쓸 수 없음'이 아님. */
export function micUsable(
  verdict: DeviceVerdict = readDeviceVerdict(),
): boolean {
  return verdict.verdict === "ok" && readMicState() === undefined;
}

/** iPad 인가(판정 이름의 기기 부분 — Siri · 받아쓰기 안내를 먼저 보인다, 4절). */
export function isIpad(verdict: DeviceVerdict): boolean {
  return verdict.name.startsWith("iPad");
}

/** 처음 마이크를 쓸 때의 안내를 본 표시(4절 '처음 마이크를 쓸 때의 안내만 기기마다 한 번', 제안 판 1). */
export const MIC_NOTICE_KEY = "momo.mic-notice.v1";

/** 이 브라우저에서 첫 마이크 안내를 보았는가(저장소를 못 쓰면 보지 않은 것으로). */
export function micNoticeSeen(): boolean {
  try {
    const store = storage();
    return store !== undefined && store.getItem(MIC_NOTICE_KEY) !== null;
  } catch {
    return false;
  }
}

/** 첫 마이크 안내를 본 것으로 남긴다(말하기 배치 · P11 말하기 세션이 같이 쓴다). */
export function markMicNoticeSeen(): void {
  try {
    storage()?.setItem(MIC_NOTICE_KEY, new Date().toISOString());
  } catch {
    // 저장할 수 없으면 다음에 다시 안내한다
  }
}

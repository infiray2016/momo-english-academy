// 배치 평가 결과 행(plan-p10a 파일별 값 12 '끝이면'): 트랙 단계 · 단원(알파벳이면 0) · placement_level, 단원 들기(첫 실행과 같은
// unitEntryOf — 단원 회차 · 사건 · 범위 끝 알림), 말하기면 배치 대기인 회화를 min(시작, talk.placement_cap) 단원 1로,
// 알파벳 알림(alphabet_sound) · 예비 문항 알림(speaking_placement_listening). DB · 시계 없는 순수 함수.
import { learningDayOf } from "@/core/learning-day";
import type { PlacementResult } from "@/core/placement/adaptive";
import {
  type AlertRow,
  type SettingRead,
  type UnitEntry,
  unitEntryOf,
} from "@/core/profile/start";
import type { PlacementArea } from "@/core/seed/structure";

const PLACEMENT_CAP_KEY = "talk.placement_cap";
const TIMEZONE_KEY = "app.timezone";
const DAY_START_KEY = "app.day_start_hour";
/** 단계 시작 단원(3.1 — 알파벳 · 소리 단원은 0). */
const FIRST_UNIT = 1;
const ALPHABET_UNIT_NO = 0;
/** 알파벳 · 소리 단원이 있는 영역(3.1). */
const ALPHABET_AREAS: readonly PlacementArea[] = ["reading", "writing"];

export type PlacementFinish = {
  track: { level: number; unit: number; placementLevel: number };
  /** 단원 들기 — 그 영역, 그리고 말하기면 회화. */
  entries: UnitEntry[];
  talkTrack?: { level: number; unit: number };
  /** 범위 끝 알림 밖의 알림(범위 끝은 entries 의 rangeAlert). */
  alerts: AlertRow[];
};

function settingNumber(read: SettingRead, key: string): number {
  const value = read(key);
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error(`설정 ${key} 가 없거나 수가 아니다`);
  return value;
}

export function placementFinishOf(input: {
  profileId: string;
  area: PlacementArea;
  result: PlacementResult;
  /** 회화 트랙이 아직 배치 대기인가(부모가 회화를 골랐으면 거짓). */
  talkPending: boolean;
  read: SettingRead;
  seedRevision: number;
  settingsVersion: number;
  now: Date;
}): PlacementFinish {
  const { profileId, area, result, read, now } = input;
  const alphabet = result.alphabet && ALPHABET_AREAS.includes(area);
  const unit = alphabet ? ALPHABET_UNIT_NO : FIRST_UNIT;
  const common = {
    profileId,
    read,
    seedRevision: input.seedRevision,
    settingsVersion: input.settingsVersion,
    now,
  };
  const entries: UnitEntry[] = [
    unitEntryOf({
      ...common,
      area,
      level: result.start,
      unit,
      source: "placement",
    }),
  ];
  let talkTrack: PlacementFinish["talkTrack"];
  if (area === "speaking" && input.talkPending) {
    talkTrack = {
      level: Math.min(result.start, settingNumber(read, PLACEMENT_CAP_KEY)),
      unit: FIRST_UNIT,
    };
    entries.push(
      unitEntryOf({
        ...common,
        area: "talk",
        ...talkTrack,
        source: "speaking_start",
      }),
    );
  }
  const timezone = read(TIMEZONE_KEY);
  if (typeof timezone !== "string")
    throw new Error(`설정 ${TIMEZONE_KEY} 가 없다`);
  const learningDay = learningDayOf(
    now,
    timezone,
    settingNumber(read, DAY_START_KEY),
  );
  const alerts: AlertRow[] = [];
  if (alphabet) {
    alerts.push({
      profileId,
      kind: "alphabet_sound",
      thresholdKey: area,
      value: { area },
      learningDay,
      createdAt: now,
    });
  }
  if (area === "speaking" && result.usedSpares) {
    alerts.push({
      profileId,
      kind: "speaking_placement_listening",
      thresholdKey: area,
      value: { area },
      learningDay,
      createdAt: now,
    });
  }
  return {
    track: { level: result.start, unit, placementLevel: result.start },
    entries,
    ...(talkTrack ? { talkTrack } : {}),
    alerts,
  };
}

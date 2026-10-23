// 첫 실행 규칙(4절 첫 실행 행 · 3.1 알파벳 · 3.2 회화 시작 단계 · 6.3 주제 묶음 · 12절 머리 · C61 (2) · C72, plan-p10a 파일별 값 7).
// DB · 시계를 가져오지 않는다. 시각 · 설정 값 · 시드 개정 · 설정 판은 부르는 쪽이 넘긴다.
// 서버(src/server/profile)와 e2e 도우미(tests/e2e/household.ts)가 같은 행 만들기 함수를 쓴다.
import { z } from "zod";
import { learningDayOf } from "@/core/learning-day";
import { BANDS, bandOf } from "@/core/level-band";
import { AREAS, type Area, LEVEL_MAX, LEVEL_MIN } from "@/core/seed/structure";

// ── 구조 상수(정본 고정 규칙, 12절 키 아님 — C72) ──

/** 부모 PIN 자리 수(4절 'PIN 6자리', C72 — C57 · C147 의 접근 코드 길이 규칙과 같은 결). */
export const PIN_LENGTH = 6;
/** 이름 칸 입력 상한(기술 값, C72). */
export const NAME_MAX_LENGTH = 20;
/** 마이크 확인 실패 알림의 코드 · 브라우저 글 상한(기술 값 — 진단 칸이라 넘으면 잘라 받는다, 검토 M-2). */
export const MIC_CODE_MAX = 64;
export const MIC_BROWSER_MAX = 120;

/**
 * 관심 주제 묶음(6.3 — 묶음마다 주제 그림 4~5개). id 는 lessons.topic_variant 와 같은 수의 글이다(C54 (3)).
 * 대표 낱말은 P6a vocab 1~2단계에 있고 P6b 그림 카탈로그에 그림이 있는 것만 둔다(화면 검토 I-2) — 그림은 그 낱말로 찾는다.
 * 묶음 2 의 '게임'은 카탈로그에 맞는 그림이 없어 그림 넷이다.
 */
export const TOPIC_BUNDLES = [
  {
    id: "1",
    label: "동물 · 자연 · 음식 · 가족",
    pictures: [
      { word: "dog", label: "동물" },
      { word: "tree", label: "자연" },
      { word: "apple", label: "음식" },
      { word: "family", label: "가족" },
    ],
  },
  {
    id: "2",
    label: "놀이 · 운동 · 게임 · 우주 · 탈것",
    pictures: [
      { word: "kite", label: "놀이" },
      { word: "ball", label: "운동" },
      { word: "star", label: "우주" },
      { word: "bus", label: "탈것" },
    ],
  },
] as const;
export type TopicBundleId = (typeof TOPIC_BUNDLES)[number]["id"];

/** 아바타(목업 B_Profile 꼴 — 이름 첫 글자 동그라미, 고르는 것은 색 여섯, C72). 색 값은 보드 토큰(board.tsx)에 있다. */
export const AVATARS = [
  { id: "yellow", label: "노랑" },
  { id: "sky", label: "하늘" },
  { id: "pink", label: "분홍" },
  { id: "green", label: "연두" },
  { id: "orange", label: "주황" },
  { id: "purple", label: "보라" },
] as const;
export type AvatarId = (typeof AVATARS)[number]["id"];

// ── 설정 키 ──

const THROUGH_KEY = "seed.complete_through_level";
const PLACEMENT_CAP_KEY = "talk.placement_cap";
const RANGE_MARGIN_KEY = "seed.range_end_alert_margin";
const TIMEZONE_KEY = "app.timezone";
const DAY_START_KEY = "app.day_start_hour";
/** 단원 시작 때 그 단계 구간 값으로 풀어 복사하는 키(12절 머리, `<구간>` 없는 이름으로 담는다). */
const UNIT_BAND_KEYS = [
  "unit.regular_lessons",
  "unit.new_words_per_lesson",
  "unit.min_lessons",
  "unit.min_days",
  "unit.vocab_count",
  "unit.max_remedial",
] as const;
/** 단원 시작 때 그대로 복사하는 키(12절 머리 '단원을 시작할 때 판정에 쓰는 키'). */
const UNIT_PLAIN_KEYS = [
  "unit.vocab_mastery",
  "unit.recent_score",
  "unit.recent_window",
  "unit.remedial_batch",
  "unit.parent_decision_days",
  "level.test_items",
  "level.test_items_per_session",
  "level.pass_score",
  "level.remedial_before_retest",
  "level.test_forms",
  "level.retest_gap_days",
  "level.near_pass_gap",
  "talk.said_ratio",
  "talk.known_days",
] as const;
/** 배치 평가 시작 때 level_tests 에 복사하는 키(12절 머리 placement.*). 배치 서버가 이 키를 읽는다. */
export const PLACEMENT_KEYS = [
  "placement.start_level",
  "placement.items_per_level",
  "placement.items_per_area",
  "placement.retest_months",
  "placement.recommend_up",
  "placement.recommend_down",
  "placement.repeat_pass",
  "placement.repeat_tries",
  "placement.target_minutes",
] as const;

/** 프로필 설정 행의 키(C61 (2)). */
export function startLevelKey(area: Area): string {
  return `profile.start_level.${area}`;
}

/** 범위 끝 알림의 기준 키(영역마다 한 번, P9a createAlertOnce 의 key 꼴). */
export function rangeEndThresholdKey(area: Area): string {
  return `${RANGE_MARGIN_KEY}:${area}`;
}

/** 첫 실행 저장이 읽는 집 전체 설정 키 모두(서버가 한 번에 읽는다). */
export function firstRunSettingKeys(): string[] {
  return [
    THROUGH_KEY,
    PLACEMENT_CAP_KEY,
    RANGE_MARGIN_KEY,
    TIMEZONE_KEY,
    DAY_START_KEY,
    ...UNIT_BAND_KEYS.flatMap((key) => BANDS.map((band) => `${key}.${band}`)),
    ...UNIT_PLAIN_KEYS,
  ];
}

export type SettingRead = (key: string) => unknown;

/** 수 설정 하나. 없거나 수가 아니면 던진다(조용한 기본값 금지). */
function numberOf(read: SettingRead, key: string): number {
  const value = read(key);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`설정 ${key} 가 없거나 수가 아니다`);
  }
  return value;
}

function stringOf(read: SettingRead, key: string): string {
  const value = read(key);
  if (typeof value !== "string" || value === "") {
    throw new Error(`설정 ${key} 가 없거나 글이 아니다`);
  }
  return value;
}

/** 단원 시작 복사본(unit_progress.settings_snapshot). 꼴은 P12 가 읽는다. */
export function unitSnapshotOf(
  read: SettingRead,
  _area: Area,
  level: number,
): Record<string, number> {
  const band = bandOf(level);
  const out: Record<string, number> = {};
  for (const key of UNIT_BAND_KEYS) out[key] = numberOf(read, `${key}.${band}`);
  for (const key of UNIT_PLAIN_KEYS) out[key] = numberOf(read, key);
  return out;
}

/** 배치 평가 복사본(level_tests.settings_snapshot). */
export function placementSnapshotOf(read: SettingRead): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of PLACEMENT_KEYS) out[key] = numberOf(read, key);
  return out;
}

/** 범위 끝 알림 때(6.3 '그 상태로 시작한 경우도 알린다'). */
export function rangeEndAlertDue(
  level: number,
  through: number,
  margin: number,
): boolean {
  return level >= through - margin;
}

// ── 트랙 시작값 ──

/** progress_events target.source(정할 것 퍼). 배치 평가 결과는 placement(값 12). */
export type TrackSource =
  | "first_run"
  | "first_run_alphabet"
  | "speaking_start"
  | "placement";
export type TrackStart =
  | { level: number; unit: number; source: TrackSource }
  | { pending: true };
const PENDING: TrackStart = { pending: true };
/** 시작 단원(단계 단원 1, 알파벳 · 소리 단원 0 — 3.1). */
const FIRST_UNIT = 1;
const ALPHABET_UNIT_NO = 0;
/** 알파벳을 모르면 배치 없이 시작하는 영역(3.1). */
const ALPHABET_AREAS: readonly Area[] = ["reading", "writing"];

/**
 * 영역마다 시작값. 고른 영역은 그 단계 단원 1. 알파벳을 모르면 읽기 · 쓰기는 1단계 단원 0(고른 값보다 앞선다).
 * 회화를 고르지 않았으면 말하기가 정해졌을 때 min(말하기 단계, talk.placement_cap), 아니면 배치 대기.
 * 회화를 골랐으면 상한 없이 그 단계(4절). 고른 값이 1~through 정수가 아니면 던진다.
 */
export function trackStartsOf(input: {
  chosen: Partial<Record<Area, number>>;
  alphabetUnknown: boolean;
  through: number;
  placementCap: number;
}): Record<Area, TrackStart> {
  const out = {} as Record<Area, TrackStart>;
  for (const area of AREAS) {
    const level = input.chosen[area];
    if (level !== undefined) {
      if (
        !Number.isInteger(level) ||
        level < LEVEL_MIN ||
        level > input.through
      )
        throw new RangeError(
          `시작 단계는 ${LEVEL_MIN}~${input.through} 정수다: ${area} ${level}`,
        );
    }
    if (input.alphabetUnknown && ALPHABET_AREAS.includes(area)) {
      out[area] = {
        level: LEVEL_MIN,
        unit: ALPHABET_UNIT_NO,
        source: "first_run_alphabet",
      };
    } else if (level !== undefined) {
      out[area] = { level, unit: FIRST_UNIT, source: "first_run" };
    } else {
      out[area] = PENDING;
    }
  }
  const speaking = out.speaking;
  if (input.chosen.talk === undefined && !("pending" in speaking)) {
    out.talk = {
      level: Math.min(speaking.level, input.placementCap),
      unit: FIRST_UNIT,
      source: "speaking_start",
    };
  }
  return out;
}

// ── 입력 ──

const ENGLISH_NAME = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;

/** 영어 이름 칸 꼴(로마자 낱말, 사이에 빈칸 · 붙임표 · 작은따옴표, NAME_MAX_LENGTH 까지). 화면 '다음'이 쓴다. */
export function isEnglishName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length <= NAME_MAX_LENGTH && ENGLISH_NAME.test(trimmed);
}

/** PIN 꼴(PIN_LENGTH 자리 숫자). */
export function isPin(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}
const englishName = z
  .string()
  .trim()
  .min(1)
  .max(NAME_MAX_LENGTH)
  .regex(ENGLISH_NAME);
const levelValue = z.number().int().min(LEVEL_MIN).max(LEVEL_MAX);

/** 마이크 확인 결과(plan-p10a 정할 것 터 — 끊김은 화면이 not_checked 로 넘긴다). */
export const MicResultSchema = z.discriminatedUnion("result", [
  z.strictObject({ result: z.literal("ok") }),
  z.strictObject({ result: z.literal("not_checked") }),
  z.strictObject({
    result: z.literal("failed"),
    code: z
      .string()
      .min(1)
      .transform((v) => v.slice(0, MIC_CODE_MAX)),
    browser: z
      .string()
      .min(1)
      .transform((v) => v.slice(0, MIC_BROWSER_MAX)),
  }),
]);
export type MicResult = z.infer<typeof MicResultSchema>;

export const FirstRunInputSchema = z.strictObject({
  pin: z.string().regex(new RegExp(`^\\d{${PIN_LENGTH}}$`)),
  displayName: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  englishName,
  toriNickname: englishName.optional(),
  avatar: z.enum(AVATARS.map((a) => a.id) as [AvatarId, ...AvatarId[]]),
  topicBundle: z.enum(
    TOPIC_BUNDLES.map((b) => b.id) as [TopicBundleId, ...TopicBundleId[]],
  ),
  alphabetUnknown: z.boolean(),
  startLevels: z.strictObject({
    reading: levelValue.optional(),
    writing: levelValue.optional(),
    speaking: levelValue.optional(),
    talk: levelValue.optional(),
  }),
  mic: MicResultSchema,
});
export type FirstRunInput = z.input<typeof FirstRunInputSchema>;
export type FirstRunValue = z.output<typeof FirstRunInputSchema>;

/** 첫 실행 입력 확인(시작 단계는 1~through, 알파벳 모름이면 읽기 · 쓰기 칸 없음). 까닭은 화면에 내지 않는다. */
export function checkFirstRunInput(
  raw: unknown,
  { through }: { through: number },
): { ok: true; value: FirstRunValue } | { ok: false } {
  const parsed = FirstRunInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  const value = parsed.data;
  for (const area of AREAS) {
    const level = value.startLevels[area];
    if (level === undefined) continue;
    if (level > through) return { ok: false };
    if (value.alphabetUnknown && ALPHABET_AREAS.includes(area))
      return { ok: false };
  }
  return { ok: true, value };
}

/** 영어 이름의 vocab 확인 조각: 이름 전체와 띄어쓰기 · 붙임표 조각(소문자, 겹침 없이). */
export function englishNamePieces(name: string): string[] {
  const whole = name.trim().toLowerCase();
  const pieces = whole.split(/[\s-]+/).filter((p) => p !== "");
  return [...new Set([whole, ...pieces])].filter((p) => p !== "");
}

/** 시작 단계 예시 줄: level_specs can-do 끝 '… 수 있다'를 '… 수 있어요'로(C72, 새 시드 칸 없음). */
export function canDoExample(canDo: string): string {
  return canDo
    .trim()
    .replace(/[.。]$/, "")
    .replace(/수 있다$/, "수 있어요");
}

// ── 행 만들기 ──

export type HouseholdContext = {
  /** 새 프로필 id(부르는 쪽이 randomUUID). */
  profileId: string;
  /** 집 전체 설정 값(firstRunSettingKeys 의 키). */
  values: Readonly<Record<string, unknown>>;
  /** 시작 개정(currentSeedRevision()). */
  seedRevision: number;
  /** 지금 settings 의 가장 큰 판. */
  settingsVersion: number;
  now: Date;
};

export type HouseholdRows = {
  profile: {
    id: string;
    displayName: string;
    englishName: string;
    toriNickname?: string;
    avatar: string;
    topicBundle: string;
    alphabetStart: boolean;
    noticesSeen: Record<string, never>;
  };
  tracks: {
    profileId: string;
    area: Area;
    level: number | null;
    unit: number | null;
    chosenStartLevel: number | null;
  }[];
  profileSettings: {
    key: string;
    scope: "profile";
    profileId: string;
    value: number;
    version: number;
  }[];
  unitProgress: {
    profileId: string;
    area: Area;
    level: number;
    unit: number;
    round: number;
    startedAt: Date;
    startRevision: number;
    settingsVersion: number;
    settingsSnapshot: Record<string, number>;
  }[];
  events: {
    profileId: string;
    kind: "parent_adjustment" | "auto_judgement";
    actor: "parent" | "app";
    target: { area: Area; source: TrackSource };
    newValue: { level: number; unit: number };
    occurredAt: Date;
  }[];
  alerts: AlertRow[];
};

/** 단원의 첫 회차. */
const FIRST_ROUND = 1;

/** parent_alerts 한 행(정할 것 퍼 — 종류 값은 1-나 부모 화면이 읽는다). */
export type AlertRow = {
  profileId: string;
  kind:
    | "mic_unavailable"
    | "seed_range_end_near"
    | "alphabet_sound"
    | "speaking_placement_listening";
  thresholdKey: string | null;
  value: Record<string, unknown>;
  learningDay: string;
  createdAt: Date;
};

/** 단원 들기 한 번의 행(트랙 · 단원 회차 · 사건 · 범위 끝 알림). 첫 실행과 배치 결과가 같이 쓴다(값 8 · 12). */
export type UnitEntry = {
  unitProgress: HouseholdRows["unitProgress"][number];
  event: HouseholdRows["events"][number];
  rangeAlert?: AlertRow;
};

/**
 * 영역 하나가 단계 · 단원에 드는 행. 단원 시작 복사본은 그 단계 구간 값, 범위 끝 알림은 seed.complete_through_level −
 * seed.range_end_alert_margin 이상일 때(6.3). 부모가 고른 시작(첫 실행)은 parent_adjustment, 앱이 정한 것은 auto_judgement.
 */
export function unitEntryOf(input: {
  profileId: string;
  area: Area;
  level: number;
  unit: number;
  source: TrackSource;
  read: SettingRead;
  seedRevision: number;
  settingsVersion: number;
  now: Date;
}): UnitEntry {
  const { profileId, area, level, unit, source, read, now } = input;
  const through = numberOf(read, THROUGH_KEY);
  const margin = numberOf(read, RANGE_MARGIN_KEY);
  const byParent = source === "first_run" || source === "first_run_alphabet";
  const entry: UnitEntry = {
    unitProgress: {
      profileId,
      area,
      level,
      unit,
      round: FIRST_ROUND,
      startedAt: now,
      startRevision: input.seedRevision,
      settingsVersion: input.settingsVersion,
      settingsSnapshot: unitSnapshotOf(read, area, level),
    },
    event: {
      profileId,
      kind: byParent ? "parent_adjustment" : "auto_judgement",
      actor: byParent ? "parent" : "app",
      target: { area, source },
      newValue: { level, unit },
      occurredAt: now,
    },
  };
  if (rangeEndAlertDue(level, through, margin)) {
    entry.rangeAlert = {
      profileId,
      kind: "seed_range_end_near",
      thresholdKey: rangeEndThresholdKey(area),
      value: { level, through },
      learningDay: learningDayOf(
        now,
        stringOf(read, TIMEZONE_KEY),
        numberOf(read, DAY_START_KEY),
      ),
      createdAt: now,
    };
  }
  return entry;
}

/** 첫 실행 한 번에 넣을 행 묶음(PIN 해시는 받지 않는다 — 서버가 따로). 입력은 checkFirstRunInput 을 지난 값이다. */
export function householdRowsOf(
  input: FirstRunValue | FirstRunInput,
  ctx: HouseholdContext,
): HouseholdRows {
  const read: SettingRead = (key) => ctx.values[key];
  const through = numberOf(read, THROUGH_KEY);
  const starts = trackStartsOf({
    chosen: input.startLevels,
    alphabetUnknown: input.alphabetUnknown,
    through,
    placementCap: numberOf(read, PLACEMENT_CAP_KEY),
  });
  const learningDay = learningDayOf(
    ctx.now,
    stringOf(read, TIMEZONE_KEY),
    numberOf(read, DAY_START_KEY),
  );
  const { profileId, now } = ctx;

  const chosenAreas = AREAS.filter(
    (area) => input.startLevels[area] !== undefined,
  );
  const profileSettings = chosenAreas.map((area, i) => ({
    key: startLevelKey(area),
    scope: "profile" as const,
    profileId,
    value: input.startLevels[area] as number,
    version: ctx.settingsVersion + i + 1,
  }));
  const settingsVersion = ctx.settingsVersion + profileSettings.length;

  const tracks: HouseholdRows["tracks"] = [];
  const unitProgress: HouseholdRows["unitProgress"] = [];
  const events: HouseholdRows["events"] = [];
  const alerts: HouseholdRows["alerts"] = [];
  if (input.mic.result === "failed") {
    alerts.push({
      profileId,
      kind: "mic_unavailable",
      thresholdKey: null,
      value: { browser: input.mic.browser, code: input.mic.code },
      learningDay,
      createdAt: now,
    });
  }
  for (const area of AREAS) {
    const start = starts[area];
    const chosenStartLevel = input.startLevels[area] ?? null;
    if ("pending" in start) {
      tracks.push({
        profileId,
        area,
        level: null,
        unit: null,
        chosenStartLevel,
      });
      continue;
    }
    tracks.push({
      profileId,
      area,
      level: start.level,
      unit: start.unit,
      chosenStartLevel,
    });
    const entry = unitEntryOf({
      profileId,
      area,
      level: start.level,
      unit: start.unit,
      source: start.source,
      read,
      seedRevision: ctx.seedRevision,
      settingsVersion,
      now,
    });
    unitProgress.push(entry.unitProgress);
    events.push(entry.event);
    if (entry.rangeAlert) alerts.push(entry.rangeAlert);
  }

  return {
    profile: {
      id: profileId,
      displayName: input.displayName.trim(),
      englishName: input.englishName.trim(),
      ...(input.toriNickname
        ? { toriNickname: input.toriNickname.trim() }
        : {}),
      avatar: input.avatar,
      topicBundle: input.topicBundle,
      alphabetStart: input.alphabetUnknown,
      noticesSeen: {},
    },
    tracks,
    profileSettings,
    unitProgress,
    events,
    alerts,
  };
}

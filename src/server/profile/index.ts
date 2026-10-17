import "server-only";
// 가정 프로필 읽기 · 첫 실행 저장 · 첫 실행 화면 값(4절 첫 실행 행 · 10절 PIN · C61 (2) · C72, plan-p10a 파일별 값 8).
// 1-가는 프로필 하나다(프로필 2~3개는 3차). 첫 실행은 마지막 한 번 저장이고(정할 것 커), 한 트랜잭션 안에서
// '프로필 있음'을 확인한 뒤 넣는다. 두 기기가 함께 끝내면 PIN 부분 유일 색인이 둘째를 막아 already_done 이다.
// PIN 은 argon2id 해시(@node-rs/argon2 기본값 — P3b 접근 코드와 같은 방식)로만 남기고 로그에 내지 않는다.
// 시각은 한 시계(now)에서 읽어 순수 함수에 넘긴다. 질의 SQL 안에 now() 를 쓰지 않는다.
import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { inArray, max, sql } from "drizzle-orm";
import { z } from "zod";
import {
  canDoExample,
  checkFirstRunInput,
  englishNamePieces,
  firstRunSettingKeys,
  householdRowsOf,
  TOPIC_BUNDLES,
  type TopicBundleId,
} from "@/core/profile/start";
import { AREAS, type Area } from "@/core/seed/structure";
import {
  SPEECH_SETTING_KEYS,
  type SpeechSettings,
  speechSettingsFrom,
} from "@/core/speech/listen";
import { images, vocab } from "@/db/schema/content";
import { profiles, profileTracks, unitProgress } from "@/db/schema/learning";
import {
  parentAlerts,
  parentAuth,
  progressEvents,
  settings,
} from "@/db/schema/operations";
import { now as clockNow } from "@/server/clock";
import { type Db, getDb } from "@/server/db";
import { dbErrorTag } from "@/server/db/safe-error";
import { currentSeedRevision, readLevelSpec } from "@/server/seed/read";
import { getSettings, SettingMissingError } from "@/server/settings";

const THROUGH_KEY = "seed.complete_through_level";
const TARGET_MINUTES_KEY = "placement.target_minutes";
/** Postgres 유일 제약 위반(두 기기가 함께 첫 실행을 끝낸 때). */
const UNIQUE_VIOLATION = "23505";

export type HouseholdProfile = typeof profiles.$inferSelect;
export type ProfileReadOptions = { db?: Db };

/** 가정의 프로필(1-가는 하나). 없으면 undefined — 화면은 첫 실행으로 보낸다. */
export async function readHouseholdProfile({
  db = getDb(),
}: ProfileReadOptions = {}): Promise<HouseholdProfile | undefined> {
  const [row] = await db.select().from(profiles).limit(1);
  return row;
}

/** 영어 이름이 vocab 낱말인가(전체 또는 띄어쓰기 · 붙임표 조각 하나, 대소문자 없이). */
export async function isVocabName(
  name: string,
  { db = getDb() }: ProfileReadOptions = {},
): Promise<boolean> {
  const pieces = englishNamePieces(name);
  if (pieces.length === 0) return false;
  const rows = await db
    .select({ word: vocab.word })
    .from(vocab)
    .where(inArray(sql`lower(${vocab.word})`, pieces))
    .limit(1);
  return rows.length > 0;
}

export type FirstRunOutcome =
  | { ok: true }
  | {
      ok: false;
      reason: "invalid" | "nickname_required" | "already_done" | "unavailable";
    };

/** 이름 확인 결과. DB 오류는 unavailable(오류 글은 이름 · 코드만 로그에). */
export type VocabNameCheck =
  | { ok: true; vocabWord: boolean }
  | { ok: false; reason: "unavailable" };

/** 영어 이름 확인(서버 액션 몫) — DB 오류 글에 실린 이름을 밖으로 내지 않는다(검토 I-1). */
export async function checkVocabName(
  name: string,
  { db = getDb() }: ProfileReadOptions = {},
): Promise<VocabNameCheck> {
  try {
    return { ok: true, vocabWord: await isVocabName(name, { db }) };
  } catch (error) {
    console.error(`이름 확인 실패(${dbErrorTag(error)})`);
    return { ok: false, reason: "unavailable" };
  }
}

export type SaveFirstRunDeps = {
  db?: Db;
  now?: () => Date;
  /** PIN 해시(기본 argon2id 기본값). 시험이 바꾸지 않는다 — 실제 해시를 본다. */
  hashPin?: (pin: string) => Promise<string>;
};

/** 설정 키들을 값 사전으로(값 검증은 순수 함수가 한다). */
async function settingValues(
  db: Db,
  keys: readonly string[],
): Promise<Record<string, unknown>> {
  return getSettings(Object.fromEntries(keys.map((k) => [k, z.unknown()])), {
    db,
  });
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 3; depth += 1) {
    if ((current as { code?: unknown }).code === UNIQUE_VIOLATION) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * 첫 실행 저장. 입력 확인(Zod · 시작 단계 1~through · 알파벳 규칙) → 영어 이름이 vocab 낱말이면 vocab 이 아닌 별명이 있어야 함
 * → PIN 해시(트랜잭션 밖) → 한 트랜잭션: 프로필이 있으면 already_done, 없으면 행을 모두 넣는다.
 */
export async function saveFirstRun(
  raw: unknown,
  { db = getDb(), now = clockNow, hashPin = hash }: SaveFirstRunDeps = {},
): Promise<FirstRunOutcome> {
  try {
    return await saveFirstRunUnsafe(raw, { db, now, hashPin });
  } catch (error) {
    // 동시에 끝낸 둘째 기기(PIN 부분 유일 색인)는 이미 끝남
    if (isUniqueViolation(error)) return { ok: false, reason: "already_done" };
    // 그 밖 DB 오류: 글에 SQL 매개변수(이름 · PIN 해시)가 실리므로 이름 · 코드만 남긴다(검토 I-1)
    // 설정 키는 비밀값이 아니라 어느 키인지 남긴다(P3b 접근 코드 제출 꼴, 검토 review-p10-fix1 N-1)
    if (error instanceof SettingMissingError) {
      console.error(`첫 실행 저장 실패(설정 ${error.key} 가 없습니다)`);
      return { ok: false, reason: "unavailable" };
    }
    console.error(`첫 실행 저장 실패(${dbErrorTag(error)})`);
    return { ok: false, reason: "unavailable" };
  }
}

async function saveFirstRunUnsafe(
  raw: unknown,
  {
    db,
    now,
    hashPin,
  }: { db: Db; now: () => Date; hashPin: (pin: string) => Promise<string> },
): Promise<FirstRunOutcome> {
  const values = await settingValues(db, firstRunSettingKeys());
  const through = values[THROUGH_KEY];
  if (typeof through !== "number") return { ok: false, reason: "invalid" };
  const checked = checkFirstRunInput(raw, { through });
  if (!checked.ok) return { ok: false, reason: "invalid" };
  const input = checked.value;

  // 별명은 영어 이름이 vocab 낱말일 때만 받는다(4절). 아니면 보낸 별명을 버린다
  let toriNickname: string | undefined;
  if (await isVocabName(input.englishName, { db })) {
    if (!input.toriNickname || (await isVocabName(input.toriNickname, { db })))
      return { ok: false, reason: "nickname_required" };
    toriNickname = input.toriNickname;
  }

  const pinHash = await hashPin(input.pin);
  const seedRevision = await currentSeedRevision({ db });
  const at = now();
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: profiles.id })
      .from(profiles)
      .limit(1);
    if (existing) return { ok: false, reason: "already_done" } as const;
    const [version] = await tx
      .select({ v: max(settings.version) })
      .from(settings);
    const rows = householdRowsOf(
      { ...input, toriNickname },
      {
        profileId: randomUUID(),
        values,
        seedRevision,
        settingsVersion: Number(version?.v ?? 0),
        now: at,
      },
    );
    await tx.insert(profiles).values(rows.profile);
    await tx.insert(parentAuth).values({
      kind: "pin",
      pinHash,
      failedCount: 0,
      updatedAt: at,
    });
    await tx.insert(profileTracks).values(rows.tracks);
    if (rows.profileSettings.length > 0)
      await tx.insert(settings).values(rows.profileSettings);
    if (rows.unitProgress.length > 0)
      await tx.insert(unitProgress).values(rows.unitProgress);
    if (rows.events.length > 0)
      await tx.insert(progressEvents).values(rows.events);
    // 새 프로필이라 범위 끝 알림(기준 키마다 한 번)은 앞선 행이 없다 — createAlertOnce 의 key 꼴로 바로 넣는다
    if (rows.alerts.length > 0)
      await tx.insert(parentAlerts).values(rows.alerts);
    return { ok: true } as const;
  });
}

// ── 첫 실행 화면 값 ──

export type LevelExample = { level: number; example: string };
export type BundleView = {
  id: TopicBundleId;
  label: string;
  /** 대표 낱말 그림(카탈로그 행을 믿고 경로를 준다, 읽지 못하면 화면이 이름표 글로 바꾼다 — 정할 것 파). */
  pictures: { label: string; src?: string }[];
};
export type FirstRunView = {
  /** seed.complete_through_level — 시작 단계 화면의 마지막 단계. */
  through: number;
  /** placement.target_minutes — 넘겨주기 화면의 분. */
  targetMinutes: number;
  levels: Record<Area, LevelExample[]>;
  bundles: BundleView[];
  speech: SpeechSettings;
};

/** 첫 실행 화면이 쓸 값(설정 · 단계 예시 줄 · 묶음 그림 · 음성 설정). */
export async function readFirstRunView({
  db = getDb(),
}: ProfileReadOptions = {}): Promise<FirstRunView> {
  const values = await settingValues(db, [
    THROUGH_KEY,
    TARGET_MINUTES_KEY,
    ...SPEECH_SETTING_KEYS,
  ]);
  const through = z.number().int().min(1).parse(values[THROUGH_KEY]);
  const targetMinutes = z.number().positive().parse(values[TARGET_MINUTES_KEY]);
  const speech = speechSettingsFrom((key) => values[key]);

  const startRevision = await currentSeedRevision({ db });
  const levels = {} as Record<Area, LevelExample[]>;
  for (const area of AREAS) {
    levels[area] = [];
    for (let level = 1; level <= through; level += 1) {
      const spec = await readLevelSpec({ area, level, startRevision }, { db });
      levels[area].push({
        level,
        example: spec ? canDoExample(spec.canDo) : "",
      });
    }
  }

  // 대표 낱말 그림은 그림 카탈로그의 낱말 칸(images.word)으로 찾는다 — P6a vocab 은 그림 키를 두지 않고
  // 카탈로그가 낱말을 가리킨다(화면 검토 I-2). 한 낱말에 그림이 여럿이면 키 차례 첫째.
  const words = TOPIC_BUNDLES.flatMap((b) => b.pictures.map((p) => p.word));
  const found = await db
    .select({ word: images.word, path: images.path })
    .from(images)
    .where(inArray(images.word, words))
    .orderBy(images.key);
  const byWord = new Map<string, string>();
  for (const row of found) {
    if (row.word && !byWord.has(row.word)) byWord.set(row.word, row.path);
  }
  const bundles = TOPIC_BUNDLES.map((b) => ({
    id: b.id,
    label: b.label,
    pictures: b.pictures.map((p) => {
      const path = byWord.get(p.word);
      return path ? { label: p.label, src: `/${path}` } : { label: p.label };
    }),
  }));
  return { through, targetMinutes, levels, bundles, speech };
}

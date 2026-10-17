// e2e 도우미: 첫 실행을 화면으로 거치지 않고 집(프로필 하나 · PIN · 트랙 넷 …)을 넣는다(plan-p10a 파일별 값 3 insertHousehold).
// 서버(src/server/profile saveFirstRun)와 같은 순수 함수 householdRowsOf 로 행을 만들어 서버와 어긋나지 않게 한다.
// tests/e2e/db.ts(차례 1, 검토 중)는 고치지 않고 그 연결을 가져다 쓴다. PIN 은 실행 때 만들고 돌려준다(출력하지 않는다).
import { randomInt, randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { and, inArray, isNull, max } from "drizzle-orm";
import {
  AVATARS,
  type FirstRunInput,
  firstRunSettingKeys,
  householdRowsOf,
  PIN_LENGTH,
  TOPIC_BUNDLES,
} from "../../src/core/profile/start";
import * as learning from "../../src/db/schema/learning";
import * as operations from "../../src/db/schema/operations";
import { SEED_REVISION_TABLES } from "../../src/db/schema/seed-revision";
import { e2eDb } from "./db";

/** 시험용 PIN(실행 때 만든다). */
export function randomPin(): string {
  return Array.from({ length: PIN_LENGTH }, () => randomInt(10)).join("");
}

/** 기본 선택(앱 안 이름 모모 · 첫 아바타 · 첫 묶음 · 알파벳 앎 · 시작 단계 고르지 않음 · 마이크 확인 안 함). */
export function householdChoices(
  overrides: Partial<FirstRunInput> = {},
): FirstRunInput {
  return {
    pin: randomPin(),
    displayName: "모모",
    englishName: "Momo",
    avatar: AVATARS[0].id,
    topicBundle: TOPIC_BUNDLES[0].id,
    alphabetUnknown: false,
    startLevels: {},
    mic: { result: "not_checked" },
    ...overrides,
  };
}

/** 시드 테이블 다섯(SEED_REVISION_TABLES — 서버 currentSeedRevision 과 같은 목록)의 가장 큰 개정(빈 DB 0). */
async function seedRevision(): Promise<number> {
  const db = e2eDb();
  let latest = 0;
  for (const table of SEED_REVISION_TABLES) {
    const [row] = await db.select({ r: max(table.revision) }).from(table);
    latest = Math.max(latest, Number(row?.r ?? 0));
  }
  return latest;
}

/** 집을 넣고 프로필 id 와 PIN 을 돌려준다. 시각은 부르는 쪽이 넘기거나 시험을 돌린 때. */
export async function insertHousehold(
  choices: Partial<FirstRunInput> = {},
  at: Date = new Date(),
): Promise<{ profileId: string; pin: string }> {
  const db = e2eDb();
  const input = householdChoices(choices);
  const { settings } = operations;
  const rows = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(
      and(
        inArray(settings.key, firstRunSettingKeys()),
        isNull(settings.profileId),
      ),
    );
  const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const [version] = await db
    .select({ v: max(settings.version) })
    .from(settings);
  const profileId = randomUUID();
  const made = householdRowsOf(input, {
    profileId,
    values,
    seedRevision: await seedRevision(),
    settingsVersion: Number(version?.v ?? 0),
    now: at,
  });
  const pinHash = await hash(input.pin);
  await db.transaction(async (tx) => {
    await tx.insert(learning.profiles).values(made.profile);
    await tx.insert(operations.parentAuth).values({
      kind: "pin",
      pinHash,
      failedCount: 0,
      updatedAt: at,
    });
    await tx.insert(learning.profileTracks).values(made.tracks);
    if (made.profileSettings.length > 0)
      await tx.insert(settings).values(made.profileSettings);
    if (made.unitProgress.length > 0)
      await tx.insert(learning.unitProgress).values(made.unitProgress);
    if (made.events.length > 0)
      await tx.insert(operations.progressEvents).values(made.events);
    if (made.alerts.length > 0)
      await tx.insert(operations.parentAlerts).values(made.alerts);
  });
  return { profileId, pin: input.pin };
}

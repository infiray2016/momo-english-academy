// 기기 알림(7절 '마이크를 쓸 수 없음' · '마이크가 멈춤' · '말소리가 들어오지 않음', plan-p11a 값 12 · 정할 것 자 · C22 · C56 (4)).
// 배치 · 말하기 세션이 같이 쓰는 recordDeviceAlert: 그 학습일에 종류마다 한 번, 값은 코드 · 브라우저 이름만(인식 글 없음).
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AVATARS, TOPIC_BUNDLES } from "@/core/profile/start";
import { profiles } from "@/db/schema/learning";
import { parentAlerts, parentAuth } from "@/db/schema/operations";
import { DEVICE_ALERT_KINDS, recordDeviceAlert } from "@/server/alerts/device";
import type { Db } from "@/server/db";
import { readHouseholdProfile, saveFirstRun } from "@/server/profile";
import { loadSeed } from "@/server/seed/load";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import { createTestDatabase, type TestDatabase } from "./test-db";

const LOADED_AT = new Date("2026-10-17T10:00:00+09:00");
const NOW = new Date("2026-10-17T20:00:00+09:00");
/** 다음 학습일(app.day_start_hour 를 넘김). */
const NEXT_DAY = new Date("2026-10-18T20:00:00+09:00");

let testDb: TestDatabase;
let db: Db;
const deps = (at = NOW) => ({ db, now: () => at });

beforeAll(async () => {
  testDb = await createTestDatabase();
  db = testDb.db;
  const report = await loadSeed(db, {
    files: filesOf(devSeedTree()),
    completeThrough: DEV_SEED_THROUGH,
    areas: [...DEV_SEED_AREAS],
    now: LOADED_AT,
  });
  if (report.outcome !== "loaded") throw new Error("시험 시드 적재 실패");
});
afterAll(async () => {
  await testDb.drop();
});
beforeEach(async () => {
  await db.delete(profiles);
  await db.delete(parentAuth);
  await db.delete(parentAlerts);
  const saved = await saveFirstRun(
    {
      pin: "246813",
      displayName: "모모",
      englishName: "Momo",
      avatar: AVATARS[0].id,
      topicBundle: TOPIC_BUNDLES[0].id,
      alphabetUnknown: false,
      startLevels: { speaking: 1 },
      mic: { result: "not_checked" },
    },
    { db, now: () => NOW },
  );
  if (!saved.ok) throw new Error("첫 실행 저장 실패");
});

describe("기기 알림", () => {
  it("기기 알림: 말소리 없음 · 마이크 멈춤 · 마이크를 쓸 수 없음은 그 학습일에 종류마다 한 번 남고 코드 · 브라우저 이름만 담는다", async () => {
    const profile = await readHouseholdProfile({ db });
    if (!profile) throw new Error("프로필 없음");
    for (const kind of ["speech_silent", "mic_stalled", "mic_unavailable"]) {
      const raw = { kind, code: "no-speech", browser: "iPad Safari" };
      expect(await recordDeviceAlert(raw, deps())).toEqual({ ok: true });
      expect(await recordDeviceAlert(raw, deps())).toEqual({ ok: true });
    }
    // 첫 실행이 남긴 다른 알림(시험용 시드는 1단계까지라 '시드 범위 끝 가까움')은 빼고 기기 알림만 본다
    const rows = (
      await db
        .select()
        .from(parentAlerts)
        .where(eq(parentAlerts.profileId, profile.id))
    ).filter((r) => (DEVICE_ALERT_KINDS as readonly string[]).includes(r.kind));
    expect(rows.map((r) => r.kind).sort()).toEqual([
      "mic_stalled",
      "mic_unavailable",
      "speech_silent",
    ]);
    for (const row of rows)
      expect(row.value).toEqual({ code: "no-speech", browser: "iPad Safari" });
    // 다음 학습일에는 다시 남는다
    await recordDeviceAlert(
      { kind: "speech_silent", code: "no-speech", browser: "iPad Safari" },
      deps(NEXT_DAY),
    );
    expect(
      (
        await db
          .select()
          .from(parentAlerts)
          .where(eq(parentAlerts.kind, "speech_silent"))
      ).length,
    ).toBe(2);
    // 모르는 종류 · 다른 칸(인식 글 등)은 받지 않는다
    for (const bad of [
      { kind: "nope", code: "x", browser: "" },
      { kind: "speech_silent", code: "", browser: "" },
      { kind: "speech_silent", code: "x", browser: "", heard: "I like it" },
    ])
      expect(await recordDeviceAlert(bad, deps())).toEqual({
        ok: false,
        reason: "invalid",
      });
  });
});

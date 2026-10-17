// 첫 실행 저장 · 읽기(plan-p10a 파일별 값 8, 4절 첫 실행 행 · 10절 PIN · C61 (2) · C72) — 시험 DB 에 시험용 시드 나무를 넣고 본다.
// 설계 숫자는 시험 DB 의 설정(loadableSettings) · TEST_SETTINGS 에서 읽는다. PIN 은 실행 때 만든다.
import { randomInt } from "node:crypto";
import { verify } from "@node-rs/argon2";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  AVATARS,
  type FirstRunInput,
  PIN_LENGTH,
  TOPIC_BUNDLES,
  unitSnapshotOf,
} from "@/core/profile/start";
import { AREAS } from "@/core/seed/structure";
import { images } from "@/db/schema/content";
import { profiles, profileTracks, unitProgress } from "@/db/schema/learning";
import {
  parentAlerts,
  parentAuth,
  progressEvents,
  settings,
} from "@/db/schema/operations";
import type { Db } from "@/server/db";
import {
  checkVocabName,
  readFirstRunView,
  readHouseholdProfile,
  saveFirstRun,
} from "@/server/profile";
import { loadSeed } from "@/server/seed/load";
import { currentSeedRevision } from "@/server/seed/read";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf, loadableSettings } from "../fixtures/seed/loadable";
import { createTestDatabase, type TestDatabase } from "./test-db";

const NOW = new Date("2026-10-17T10:00:00+09:00");
const THROUGH_KEY = "seed.complete_through_level";
const loadable = Object.fromEntries(
  loadableSettings().settings.map((r) => [r.key, r.value]),
) as Record<string, unknown>;
const CAP = loadable["talk.placement_cap"] as number;
/** 회화 5단계를 고를 수 있게 올리는 완전성 끝 단계(12절 기본값 6, 4절 '1~6단계만'). */
const WIDE_THROUGH = 6;

let testDb: TestDatabase;
let db: Db;

function randomPin(): string {
  return Array.from({ length: PIN_LENGTH }, () => randomInt(10)).join("");
}

function input(overrides: Partial<FirstRunInput> = {}): FirstRunInput {
  return {
    pin: randomPin(),
    displayName: "모모",
    englishName: "Momo",
    avatar: AVATARS[1].id,
    topicBundle: TOPIC_BUNDLES[1].id,
    alphabetUnknown: false,
    startLevels: {},
    mic: { result: "ok" },
    ...overrides,
  };
}

const save = (raw: unknown) => saveFirstRun(raw, { db, now: () => NOW });

async function setThrough(value: number): Promise<void> {
  await db
    .update(settings)
    .set({ value })
    .where(and(eq(settings.key, THROUGH_KEY), isNull(settings.profileId)));
}

async function vocabWord(): Promise<string> {
  const row = await db.query.vocab.findFirst();
  if (!row) throw new Error("시험 시드에 낱말이 없다");
  return row.word;
}

beforeAll(async () => {
  testDb = await createTestDatabase();
  db = testDb.db;
  const report = await loadSeed(db, {
    files: filesOf(devSeedTree()),
    completeThrough: DEV_SEED_THROUGH,
    areas: [...DEV_SEED_AREAS],
    now: NOW,
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
  await setThrough(DEV_SEED_THROUGH);
});

describe("첫 실행 저장", () => {
  it("AC-1a 첫 실행 저장은 PIN 이 6자리 숫자가 아니면 거부되고 PIN 은 argon2id 해시로 parent_auth 한 행에 남는다", async () => {
    for (const pin of [
      randomPin().slice(1),
      `${randomPin()}1`,
      `${randomPin().slice(1)}x`,
      "",
    ]) {
      expect(await save(input({ pin }))).toEqual({
        ok: false,
        reason: "invalid",
      });
    }
    expect(await db.$count(parentAuth)).toBe(0);
    expect(await db.$count(profiles)).toBe(0);

    const pin = randomPin();
    expect(await save(input({ pin }))).toEqual({ ok: true });
    const rows = await db.select().from(parentAuth);
    expect(rows).toHaveLength(1);
    const [row] = rows;
    expect(row?.kind).toBe("pin");
    expect(row?.failedCount).toBe(0);
    expect(row?.updatedAt).toEqual(NOW);
    expect(row?.pinHash?.startsWith("$argon2id$")).toBe(true);
    expect(row?.pinHash).not.toContain(pin);
    expect(await verify(row?.pinHash ?? "", pin)).toBe(true);
  });

  it("AC-1c 회화를 5단계로 고르면 회화 트랙은 5단계 단원 1이고 talk.placement_cap 을 쓰지 않는다", async () => {
    await setThrough(WIDE_THROUGH);
    const talkLevel = CAP + 1;
    expect(await save(input({ startLevels: { talk: talkLevel } }))).toEqual({
      ok: true,
    });
    const [talk] = await db
      .select()
      .from(profileTracks)
      .where(eq(profileTracks.area, "talk"));
    expect(talk).toMatchObject({
      level: talkLevel,
      unit: 1,
      chosenStartLevel: talkLevel,
    });
    const [progress] = await db
      .select()
      .from(unitProgress)
      .where(eq(unitProgress.area, "talk"));
    expect(progress).toMatchObject({ level: talkLevel, unit: 1, round: 1 });
  });

  it("AC-11b 부모가 말하기만 시작 단계를 고르면 회화는 고른 단계와 talk.placement_cap 가운데 낮은 값에서 시작한다", async () => {
    await setThrough(WIDE_THROUGH);
    expect(
      await save(input({ startLevels: { speaking: WIDE_THROUGH } })),
    ).toEqual({ ok: true });
    const tracks = await db.select().from(profileTracks);
    const byArea = Object.fromEntries(tracks.map((t) => [t.area, t]));
    expect(byArea.speaking).toMatchObject({ level: WIDE_THROUGH, unit: 1 });
    expect(byArea.talk).toMatchObject({
      level: Math.min(WIDE_THROUGH, CAP),
      unit: 1,
      chosenStartLevel: null,
    });
    expect(byArea.reading).toMatchObject({ level: null, unit: null });
    const events = await db.select().from(progressEvents);
    expect(
      events.find((e) => (e.target as { area: string }).area === "talk"),
    ).toMatchObject({
      kind: "auto_judgement",
      actor: "app",
      target: { area: "talk", source: "speaking_start" },
    });
  });

  it("첫 실행 저장은 시작 단계가 seed.complete_through_level 을 넘으면 거부한다", async () => {
    expect(
      await save(input({ startLevels: { reading: DEV_SEED_THROUGH + 1 } })),
    ).toEqual({ ok: false, reason: "invalid" });
  });

  it("첫 실행 저장은 두 번째 저장을 already_done 으로 거부하고 두 기기가 함께 끝내도 프로필 · PIN 은 하나다", async () => {
    const results = await Promise.all([save(input()), save(input())]);
    expect(results).toContainEqual({ ok: true });
    expect(results).toContainEqual({ ok: false, reason: "already_done" });
    expect(await save(input())).toEqual({
      ok: false,
      reason: "already_done",
    });
    expect(await db.$count(profiles)).toBe(1);
    expect(await db.$count(parentAuth)).toBe(1);
    expect(await db.$count(profileTracks)).toBe(AREAS.length);
  });

  it("첫 실행 저장은 영어 이름이 vocab 낱말이면 별명 없이 거부하고 별명은 vocab 낱말이 아닐 때만 받는다", async () => {
    const word = await vocabWord();
    const name = word.charAt(0).toUpperCase() + word.slice(1);
    expect(await save(input({ englishName: name }))).toEqual({
      ok: false,
      reason: "nickname_required",
    });
    expect(
      await save(input({ englishName: name, toriNickname: name })),
    ).toEqual({ ok: false, reason: "nickname_required" });
    expect(
      await save(input({ englishName: name, toriNickname: "Tori" })),
    ).toEqual({ ok: true });
    const profile = await readHouseholdProfile({ db });
    expect(profile).toMatchObject({
      englishName: name,
      toriNickname: "Tori",
    });
  });

  it("첫 실행 저장의 행: 트랙 넷 · 고른 영역 설정 행 · unit_progress(시작 개정 · 설정 판 · 복사본) · 사건 · 마이크와 범위 끝 알림", async () => {
    const revision = await currentSeedRevision({ db });
    const versions = await db.select({ v: settings.version }).from(settings);
    const maxVersion = Math.max(...versions.map((r) => r.v));
    expect(
      await save(
        input({
          displayName: "남궁모모",
          englishName: "Momo",
          startLevels: { reading: 1 },
          mic: {
            result: "failed",
            code: "not-allowed",
            browser: "macOS Chrome 143",
          },
        }),
      ),
    ).toEqual({ ok: true });
    const profile = await readHouseholdProfile({ db });
    expect(profile).toMatchObject({
      displayName: "남궁모모",
      englishName: "Momo",
      toriNickname: null,
      avatar: AVATARS[1].id,
      topicBundle: TOPIC_BUNDLES[1].id,
      alphabetStart: false,
    });
    const startRow = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "profile.start_level.reading"));
    expect(startRow).toEqual([
      expect.objectContaining({
        scope: "profile",
        profileId: profile?.id,
        value: 1,
        version: maxVersion + 1,
      }),
    ]);
    const progress = await db.select().from(unitProgress);
    expect(progress).toHaveLength(1);
    expect(progress[0]).toMatchObject({
      area: "reading",
      level: 1,
      unit: 1,
      round: 1,
      startedAt: NOW,
      startRevision: revision,
      settingsVersion: maxVersion + 1,
    });
    expect(progress[0]?.settingsSnapshot).toEqual(
      unitSnapshotOf((k) => loadable[k], "reading", 1),
    );
    const alerts = await db.select().from(parentAlerts);
    expect(alerts.map((a) => [a.kind, a.thresholdKey, a.value]).sort()).toEqual(
      [
        [
          "mic_unavailable",
          null,
          { browser: "macOS Chrome 143", code: "not-allowed" },
        ],
        [
          "seed_range_end_near",
          "seed.range_end_alert_margin:reading",
          { level: 1, through: DEV_SEED_THROUGH },
        ],
      ].sort(),
    );
    for (const a of alerts) expect(a.profileId).toBe(profile?.id);
  });

  it("마이크 확인을 하지 않았거나 잘 됐으면 마이크 알림이 없다", async () => {
    expect(await save(input({ mic: { result: "not_checked" } }))).toEqual({
      ok: true,
    });
    expect(
      await db
        .select()
        .from(parentAlerts)
        .where(eq(parentAlerts.kind, "mic_unavailable")),
    ).toEqual([]);
  });
});

describe("첫 실행 화면 읽기", () => {
  it("첫 실행 화면 값: 단계 1~seed.complete_through_level 의 예시 줄 · 묶음 둘 · 넘겨주기 분 · 음성 설정", async () => {
    await setThrough(WIDE_THROUGH);
    const view = await readFirstRunView({ db });
    expect(view.through).toBe(WIDE_THROUGH);
    expect(view.targetMinutes).toBe(loadable["placement.target_minutes"]);
    for (const area of AREAS) {
      expect(view.levels[area].map((l) => l.level)).toEqual(
        Array.from({ length: WIDE_THROUGH }, (_, i) => i + 1),
      );
      for (const l of view.levels[area]) {
        expect(typeof l.example).toBe("string");
      }
    }
    expect(view.bundles.map((b) => b.id)).toEqual(
      TOPIC_BUNDLES.map((b) => b.id),
    );
    expect(view.bundles[0]?.pictures.map((p) => p.label)).toEqual(
      TOPIC_BUNDLES[0].pictures.map((p) => p.label),
    );
    expect(view.speech.lang).toBe(loadable["speech.lang"]);
    expect(await readHouseholdProfile({ db })).toBeUndefined();
  });

  it("첫 실행 화면 값: 묶음 대표 낱말 그림은 그림 카탈로그(images.word)에서 찾고 없는 낱말은 경로 없이 이름표만 둔다", async () => {
    const [first, second] = TOPIC_BUNDLES;
    const withPicture = [first.pictures[0].word, second.pictures[0].word];
    await db.insert(images).values(
      withPicture.map((word) => ({
        key: `p10-${word}`,
        path: `images/vocab/${word}.svg`,
        source: "test",
        license: "cc0" as const,
        word,
      })),
    );
    try {
      const view = await readFirstRunView({ db });
      expect(view.bundles[0]?.pictures[0]).toEqual({
        label: first.pictures[0].label,
        src: `/images/vocab/${first.pictures[0].word}.svg`,
      });
      expect(view.bundles[1]?.pictures[0]?.src).toBe(
        `/images/vocab/${second.pictures[0].word}.svg`,
      );
      expect(view.bundles[0]?.pictures[1]).toEqual({
        label: first.pictures[1].label,
      });
    } finally {
      await db.delete(images).where(inArray(images.word, withPicture));
    }
  });
});

describe("DB 오류 때 이름 · PIN 해시를 내지 않음", () => {
  /** 오류 글 · console.error 글에 아이 이름 · 영어 이름 · argon2 해시가 없는지(검토 review-p10-2-code I-1). */
  const leaks = (text: string, names: readonly string[]) =>
    [...names, "$argon2id$"].filter((n) => text.includes(n));

  async function failInsertsOn(table: "profiles" | "parent_auth") {
    await db.execute(
      sql.raw(`create or replace function p10_fail() returns trigger language plpgsql as $$
        begin raise exception 'p10 test failure'; end $$`),
    );
    await db.execute(
      sql.raw(
        `create trigger p10_fail before insert on ${table} for each row execute function p10_fail()`,
      ),
    );
    return async () => {
      await db.execute(sql.raw(`drop trigger if exists p10_fail on ${table}`));
      await db.execute(sql.raw("drop function if exists p10_fail()"));
    };
  }

  for (const table of ["profiles", "parent_auth"] as const) {
    it(`첫 실행 저장 중 ${table} 넣기가 DB 오류로 실패하면 unavailable 이고 오류 · 로그 글에 이름 · PIN 해시가 없다`, async () => {
      const cleanup = await failInsertsOn(table);
      const logged = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        let outcome: unknown;
        let thrown = "";
        try {
          outcome = await save(
            input({ displayName: "토리", englishName: "Tori" }),
          );
        } catch (error) {
          thrown = String(error instanceof Error ? error.message : error);
        }
        expect(outcome).toEqual({ ok: false, reason: "unavailable" });
        const lines = logged.mock.calls.flat().map(String).join("\n");
        expect(lines).not.toBe("");
        expect(leaks(`${thrown}\n${lines}`, ["토리", "Tori"])).toEqual([]);
        expect(await db.$count(profiles)).toBe(0);
      } finally {
        logged.mockRestore();
        await cleanup();
      }
    });
  }

  it("첫 실행 저장에 쓰는 설정이 없으면 unavailable 이고 로그 글에 그 설정 키 이름은 남고 이름 · PIN 해시는 없다", async () => {
    const key = "talk.placement_cap";
    const [row] = await db
      .select()
      .from(settings)
      .where(and(eq(settings.key, key), isNull(settings.profileId)));
    if (!row) throw new Error("설정 행 없음");
    await db.delete(settings).where(eq(settings.id, row.id));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(
        await save(input({ displayName: "토리", englishName: "Tori" })),
      ).toEqual({ ok: false, reason: "unavailable" });
      const lines = logged.mock.calls.flat().map(String).join("\n");
      expect(lines).toContain(key);
      expect(leaks(lines, ["토리", "Tori"])).toEqual([]);
    } finally {
      logged.mockRestore();
      await db.insert(settings).values(row);
    }
  });

  it("이름 확인 중 DB 오류가 나면 unavailable 이고 로그 글에 영어 이름이 없다", async () => {
    await db.execute(sql.raw("alter table vocab rename to vocab_p10_hidden"));
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await checkVocabName("Tori", { db })).toEqual({
        ok: false,
        reason: "unavailable",
      });
      const lines = logged.mock.calls.flat().map(String).join("\n");
      expect(lines).not.toBe("");
      expect(leaks(lines, ["Tori", "tori"])).toEqual([]);
    } finally {
      logged.mockRestore();
      await db.execute(sql.raw("alter table vocab_p10_hidden rename to vocab"));
    }
    expect(await checkVocabName("Tori", { db })).toEqual({
      ok: true,
      vocabWord: false,
    });
  });
});

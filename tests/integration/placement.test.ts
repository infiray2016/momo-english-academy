// 배치 평가 서버(3.2 배치 평가 표 · 4절 배치 평가 행 · 5절 level_tests · sessions · attempts · 8절, plan-p10a 파일별 값 12).
// 시험 DB 에 시험용 시드(완전성 1단계, 작은 틀 — 단계마다 배치 문항 1, 말하기 본 문항은 따라 말하기)를 넣고 첫 실행 저장 뒤 본다.
// 설계 숫자는 설정 · 복사본에서 읽는다.
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { AVATARS, TOPIC_BUNDLES } from "@/core/profile/start";
import { LEVEL_MAX } from "@/core/seed/structure";
import { placementItems } from "@/db/schema/content";
import {
  attempts,
  levelTests,
  profiles,
  profileTracks,
  sessions,
  unitProgress,
} from "@/db/schema/learning";
import {
  parentAlerts,
  parentAuth,
  progressEvents,
  settings,
} from "@/db/schema/operations";
import { createDb, type Db } from "@/server/db";
import { closeStaleSessions } from "@/server/lesson-list";
import {
  beginPlacement,
  type PlacementScreen,
  readPlacementPage,
  recordPlacementMicAlert,
  submitPlacementAnswer,
} from "@/server/placement";
import { readHouseholdProfile, saveFirstRun } from "@/server/profile";
import { loadSeed } from "@/server/seed/load";
import {
  DEV_SEED_AREAS,
  DEV_SEED_THROUGH,
  devSeedTree,
} from "../fixtures/seed/dev-tree";
import { filesOf } from "../fixtures/seed/loadable";
import { TEST_SETTINGS } from "../fixtures/settings";
import { createTestDatabase, type TestDatabase } from "./test-db";

const LOADED_AT = new Date("2026-10-17T10:00:00+09:00");
const SAVED_AT = new Date("2026-10-17T11:00:00+09:00");
const NOW = new Date("2026-10-17T20:00:00+09:00");
const HOUR_MS = 60 * 60 * 1000;
const RESUME_HOURS = TEST_SETTINGS["session.resume_hours"].value;
const PLACEMENT_KEYS = Object.keys(TEST_SETTINGS).filter((k) =>
  k.startsWith("placement."),
);
const deps = () => ({ db, now: () => NOW, homophones: () => [] });
/** 연결 하나짜리 풀로 답할 문항 수 · 멈췄다고 볼 시간(기술 값). */
const SINGLE_POOL_ANSWERS = 3;
const SINGLE_POOL_DEADLINE_MS = 10_000;

let testDb: TestDatabase;
let db: Db;

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
});

async function household(startLevels: Record<string, number> = {}) {
  const saved = await saveFirstRun(
    {
      pin: "246813",
      displayName: "모모",
      englishName: "Momo",
      avatar: AVATARS[0].id,
      topicBundle: TOPIC_BUNDLES[0].id,
      alphabetUnknown: false,
      startLevels,
      mic: { result: "not_checked" },
    },
    { db, now: () => SAVED_AT },
  );
  if (!saved.ok) throw new Error("첫 실행 저장 실패");
  const profile = await readHouseholdProfile({ db });
  if (!profile) throw new Error("프로필 없음");
  return profile.id;
}

type Item = Extract<PlacementScreen, { kind: "item" }>;

async function itemRow(id: string) {
  const [row] = await db
    .select()
    .from(placementItems)
    .where(eq(placementItems.id, id));
  if (!row) throw new Error("문항 행 없음");
  return row;
}

/** 지금 문항의 정답(시드 행에서) 또는 틀린 답. */
async function answerFor(screen: Item, right: boolean) {
  const row = await itemRow(screen.itemId);
  const item = row.item as Record<string, unknown>;
  switch (row.itemType) {
    case "repeat":
      return right
        ? { kind: "repeat", heard: [item.sentence as string] }
        : { kind: "repeat", heard: ["zzz"] };
    case "copy-tiles":
      return {
        kind: "tiles",
        pieces: right ? [...((item.accepted as string[])[0] ?? "")] : ["z"],
      };
    default:
      return {
        kind: "choice",
        no: right
          ? (item.answerNo as number)
          : (item.answerNo as number) === 1
            ? 2
            : 1,
      };
  }
}

async function answer(screen: PlacementScreen, body: unknown) {
  if (screen.kind !== "item")
    throw new Error(`문항이어야 한다: ${screen.kind}`);
  const out = await submitPlacementAnswer(
    {
      sessionId: screen.sessionId,
      clientAttemptId: randomUUID(),
      itemId: screen.itemId,
      answer: body,
    },
    deps(),
  );
  if (!out.ok) throw new Error(`답 거부: ${out.reason}`);
  return out.screen;
}

/** 끝까지 답한다(reply 가 참이면 정답). */
async function runToEnd(
  first: PlacementScreen,
  reply: (s: Item) => boolean | "dk" | "failed",
) {
  let screen = first;
  for (let i = 0; i < 40 && screen.kind === "item"; i += 1) {
    const r = reply(screen);
    const body =
      r === "dk"
        ? { kind: "dont-know" }
        : r === "failed"
          ? { kind: "repeat-failed" }
          : await answerFor(screen, r);
    screen = await answer(screen, body);
  }
  return screen;
}

async function withThrough<T>(value: number, fn: () => Promise<T>) {
  const where = eq(settings.key, "seed.complete_through_level");
  const [before] = await db.select().from(settings).where(where);
  if (!before) throw new Error("설정 없음");
  await db.update(settings).set({ value }).where(where);
  try {
    return await fn();
  } finally {
    await db.update(settings).set({ value: before.value }).where(where);
  }
}

async function start(area: "reading" | "writing" | "speaking") {
  const out = await beginPlacement({ area }, deps());
  if (!out.ok) throw new Error(`시작 거부: ${out.reason}`);
  return out.screen;
}

describe("배치 평가 서버", () => {
  it("배치 평가: 시작은 level_tests 에 placement.* 복사본 · 시작 개정을 남기고 진행 세션 하나를 열며 다시 시작하면 같은 배치를 돌려준다", async () => {
    const profileId = await household();
    const page = await readPlacementPage({ area: "reading" }, { db });
    expect(page).toMatchObject({
      kind: "screen",
      screen: {
        kind: "ready",
        maxItems: TEST_SETTINGS["placement.items_per_area"].value,
      },
    });
    const first = await start("reading");
    expect(first).toMatchObject({ kind: "item", itemNo: 1 });
    const [lt] = await db
      .select()
      .from(levelTests)
      .where(eq(levelTests.profileId, profileId));
    expect(lt).toMatchObject({
      kind: "placement",
      area: "reading",
      level: null,
      round: 1,
      form: 1,
      itemIds: [],
      answers: [],
      startedAt: NOW,
    });
    const snapshot = lt?.settingsSnapshot as Record<string, number>;
    expect(Object.keys(snapshot).sort()).toEqual([...PLACEMENT_KEYS].sort());
    expect(lt?.startRevision).toBeGreaterThan(0);
    // 첫 문항은 placement.start_level 단계
    if (first.kind !== "item") throw new Error();
    expect(first.level).toBe(snapshot["placement.start_level"]);
    const open = await db
      .select()
      .from(sessions)
      .where(eq(sessions.profileId, profileId));
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({
      kind: "placement",
      status: "in_progress",
      levelTestId: lt?.id,
    });
    const again = await start("reading");
    expect(again).toEqual(first);
    // 화면 자료에 정답 칸이 실리지 않는다
    expect(JSON.stringify(first)).not.toContain("answerNo");
  });

  it("배치 평가: 읽기 배치를 다 맞히고 끝내면 트랙 단계 · 단원 · placement_level, 단원 회차 · 사건(source placement)이 생기고 세션 · 평가 기록이 끝난다", async () => {
    const profileId = await household();
    const done = await runToEnd(await start("reading"), () => true);
    expect(done).toEqual({
      kind: "done",
      area: "reading",
      start: DEV_SEED_THROUGH,
      alphabet: false,
      usedSpares: false,
    });
    const [track] = await db
      .select()
      .from(profileTracks)
      .where(
        and(
          eq(profileTracks.profileId, profileId),
          eq(profileTracks.area, "reading"),
        ),
      );
    expect(track).toMatchObject({
      level: DEV_SEED_THROUGH,
      unit: 1,
      placementLevel: DEV_SEED_THROUGH,
    });
    const rounds = await db
      .select()
      .from(unitProgress)
      .where(eq(unitProgress.profileId, profileId));
    expect(rounds.map((r) => [r.area, r.level, r.unit])).toEqual([
      ["reading", DEV_SEED_THROUGH, 1],
    ]);
    const events = await db
      .select()
      .from(progressEvents)
      .where(eq(progressEvents.profileId, profileId));
    expect(events.map((e) => e.target)).toContainEqual({
      area: "reading",
      source: "placement",
    });
    const [lt] = await db
      .select()
      .from(levelTests)
      .where(eq(levelTests.profileId, profileId));
    if (!lt) throw new Error("평가 기록 없음");
    expect(lt.completedAt).toEqual(NOW);
    expect(lt.placementStartLevel).toBe(DEV_SEED_THROUGH);
    expect(lt.passed).toBeNull();
    const recorded = lt.answers as unknown[];
    expect(lt.totalScore).toBe(recorded.length);
    expect((lt.itemIds as unknown[]).length).toBe(recorded.length);
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.profileId, profileId));
    expect(session).toMatchObject({ status: "completed", completedAt: NOW });
    expect(session?.learningDay).not.toBeNull();
    // 범위 끝 알림: 시험용 시드는 완전성 1단계라 그 단계에서 시작하면 알린다(6.3)
    const alerts = await db
      .select()
      .from(parentAlerts)
      .where(eq(parentAlerts.profileId, profileId));
    expect(alerts.map((a) => a.kind)).toContain("seed_range_end_near");
    // 끝난 영역은 다시 시작할 수 없다
    expect(await beginPlacement({ area: "reading" }, deps())).toEqual({
      ok: false,
      reason: "not_pending",
    });
    expect(await readPlacementPage({ area: "reading" }, { db })).toEqual({
      kind: "placed",
    });
  });

  it("배치 평가: 1단계도 못 넘은 쓰기는 알파벳 · 소리 단원 0 과 alphabet_sound 알림이고 몰라요는 틀림으로 센다", async () => {
    const profileId = await household();
    const done = await runToEnd(await start("writing"), () => "dk");
    expect(done).toMatchObject({ kind: "done", start: 1, alphabet: true });
    const [track] = await db
      .select()
      .from(profileTracks)
      .where(
        and(
          eq(profileTracks.profileId, profileId),
          eq(profileTracks.area, "writing"),
        ),
      );
    expect(track).toMatchObject({ level: 1, unit: 0 });
    const kinds = (
      await db
        .select()
        .from(parentAlerts)
        .where(eq(parentAlerts.profileId, profileId))
    ).map((a) => a.kind);
    expect(kinds).toContain("alphabet_sound");
    const [lt] = await db
      .select()
      .from(levelTests)
      .where(eq(levelTests.profileId, profileId));
    expect(lt?.totalScore).toBe(0);
  });

  it("AC-11b 말하기 배치 결과가 회화 트랙을 n 과 상한 가운데 낮은 단계 단원 1로 넣는다", async () => {
    const profileId = await household();
    const cap = TEST_SETTINGS["talk.placement_cap"].value;
    const done = await withThrough(LEVEL_MAX, async () =>
      runToEnd(await start("speaking"), () => true),
    );
    if (done.kind !== "done") throw new Error("끝나야 한다");
    expect(done.start).toBeGreaterThan(cap);
    const tracks = await db
      .select()
      .from(profileTracks)
      .where(eq(profileTracks.profileId, profileId));
    const byArea = Object.fromEntries(tracks.map((t) => [t.area, t]));
    expect(byArea.speaking).toMatchObject({ level: done.start, unit: 1 });
    expect(byArea.talk).toMatchObject({
      level: Math.min(done.start, cap),
      unit: 1,
    });
    const rounds = await db
      .select()
      .from(unitProgress)
      .where(eq(unitProgress.profileId, profileId));
    expect(rounds.map((r) => [r.area, r.level]).sort()).toEqual(
      [
        ["speaking", done.start],
        ["talk", Math.min(done.start, cap)],
      ].sort(),
    );
  });

  it("배치 평가: 예비 문항을 쓴 말하기 배치는 speaking_placement_listening 알림이고 결과에 예비 사용이 실린다", async () => {
    const profileId = await household();
    let failedOnce = false;
    const done = await runToEnd(await start("speaking"), () => {
      if (!failedOnce) {
        failedOnce = true;
        return "failed";
      }
      return true;
    });
    expect(done).toMatchObject({ kind: "done", usedSpares: true });
    const kinds = (
      await db
        .select()
        .from(parentAlerts)
        .where(eq(parentAlerts.profileId, profileId))
    ).map((a) => a.kind);
    expect(kinds).toContain("speaking_placement_listening");
    const [lt] = await db
      .select()
      .from(levelTests)
      .where(eq(levelTests.profileId, profileId));
    const answers = lt?.answers as { slot: string; repeatFailed: boolean }[];
    expect(answers[0]).toMatchObject({ slot: "main", repeatFailed: true });
    expect(answers[1]).toMatchObject({ slot: "spare", repeatFailed: false });
  });

  it("AC-11d 진행 중 배치 평가는 session.resume_hours 가 지나도 닫히지 않고 같은 시도 id 는 한 번만 저장된다", async () => {
    const profileId = await household();
    const first = await start("reading");
    if (first.kind !== "item") throw new Error();
    const body = {
      sessionId: first.sessionId,
      clientAttemptId: randomUUID(),
      itemId: first.itemId,
      answer: await answerFor(first, true),
    };
    const one = await submitPlacementAnswer(body, deps());
    const two = await submitPlacementAnswer(body, deps());
    expect(one.ok && two.ok).toBe(true);
    if (!one.ok || !two.ok) throw new Error();
    expect(two.screen).toEqual(one.screen);
    expect(
      await db
        .select()
        .from(attempts)
        .where(eq(attempts.sessionId, first.sessionId)),
    ).toHaveLength(1);
    const later = new Date(NOW.getTime() + (RESUME_HOURS + 1) * HOUR_MS);
    await closeStaleSessions({ db, profileId, now: later });
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, first.sessionId));
    expect(session?.status).toBe("in_progress");
    // 다음에 열면 멈춘 문항부터
    const page = await readPlacementPage({ area: "reading" }, { db });
    expect(page).toMatchObject({ kind: "screen", screen: one.screen });
  });

  it("배치 평가: 단계가 정해진 영역은 시작이 거부되고, 지금 차례가 아닌 문항 · 문항과 맞지 않는 답 꼴 · 따라 말하기 시도 수 초과는 거부된다", async () => {
    await household({ reading: 1 });
    expect(await beginPlacement({ area: "reading" }, deps())).toEqual({
      ok: false,
      reason: "not_pending",
    });
    const first = await start("speaking");
    if (first.kind !== "item") throw new Error();
    const send = (over: Record<string, unknown>) =>
      submitPlacementAnswer(
        {
          sessionId: first.sessionId,
          clientAttemptId: randomUUID(),
          itemId: first.itemId,
          answer: { kind: "dont-know" },
          ...over,
        },
        deps(),
      );
    expect(await send({ itemId: randomUUID() })).toEqual({
      ok: false,
      reason: "stale",
    });
    expect(await send({ answer: { kind: "choice", no: 1 } })).toEqual({
      ok: false,
      reason: "invalid",
    });
    const tries = TEST_SETTINGS["placement.repeat_tries"].value;
    expect(
      await send({
        answer: { kind: "repeat", heard: Array(tries + 1).fill("hi") },
      }),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(await send({ sessionId: "not-a-uuid" })).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("배치 평가: 마이크 알림(mic_unavailable · mic_stalled)은 그 학습일에 종류마다 한 번 남고 브라우저 이름 · 코드만 담는다", async () => {
    const profileId = await household();
    const raw = { kind: "mic_stalled", code: "stalled", browser: "Chrome" };
    expect(await recordPlacementMicAlert(raw, deps())).toEqual({ ok: true });
    expect(await recordPlacementMicAlert(raw, deps())).toEqual({ ok: true });
    expect(
      await recordPlacementMicAlert({ ...raw, kind: "nope" }, deps()),
    ).toEqual({ ok: false, reason: "invalid" });
    const rows = await db
      .select()
      .from(parentAlerts)
      .where(eq(parentAlerts.profileId, profileId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: "mic_stalled",
      value: { code: "stalled", browser: "Chrome" },
    });
  });

  it("배치 평가: 답 저장 트랜잭션 안의 다음 문항 화면은 그 트랜잭션 연결로 읽어 연결 하나짜리 풀에서도 끝난다", async () => {
    // Codex 지적 3(review-codex-2026-10-19 판정 3) — 트랜잭션을 쥔 채 바깥 연결을 또 잡으면 풀이 찰 때 서로 기다린다
    await household();
    const single = createDb(testDb.url, { max: 1 });
    const one = { db: single, now: () => NOW, homophones: () => [] };
    const deadline = <T>(work: Promise<T>) =>
      Promise.race([
        work,
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("연결 하나짜리 풀에서 멈췄다")),
            SINGLE_POOL_DEADLINE_MS,
          ),
        ),
      ]);
    try {
      const begun = await deadline(beginPlacement({ area: "reading" }, one));
      if (!begun.ok) throw new Error(`시작 거부: ${begun.reason}`);
      let screen = begun.screen;
      for (
        let i = 0;
        i < SINGLE_POOL_ANSWERS && screen.kind === "item";
        i += 1
      ) {
        const out = await deadline(
          submitPlacementAnswer(
            {
              sessionId: screen.sessionId,
              clientAttemptId: randomUUID(),
              itemId: screen.itemId,
              answer: await answerFor(screen, true),
            },
            one,
          ),
        );
        if (!out.ok) throw new Error(`답 거부: ${out.reason}`);
        screen = out.screen;
      }
      expect(screen.kind).toBe("item");
    } finally {
      await single.$client.end();
    }
  });
});

// 회화 선생님 고르기 · 집 선생님(선생님 화면 plan 값 5 · 6 — AC-19b 의 통합 몫: 액션 쿠키 없이 401 · 명단 밖 · 보이지 않음 · 이미 고름 거부 ·
// 두 요청 겹쳐도 한 번). 관찰 쪽(값 6 · 16 — d6): 선생님 지우기 · 단원 바로 가기(컨트롤러 덧 2026-10-23)는 운영 배포(VERCEL_ENV=production)
// 에서 거부하고, 단원 바로 가기는 첫 실행 · 배치와 같은 단원 들기(unitEntryOf)로 지금 단원을 바꿔 홈 카드가 그 단원을 읽는다. 아이 이름은 지어낸 값이다.
import { and, eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Area } from "@/core/seed/structure";
import { profiles, profileTracks, unitProgress } from "@/db/schema/learning";
import { progressEvents } from "@/db/schema/operations";
import type { Db } from "@/server/db";
import { readHome } from "@/server/home";
import {
  clearTeacherForPreviewFor,
  jumpUnitForPreviewFor,
  PREVIEW_JUMP_LEVEL,
  PREVIEW_JUMP_SOURCE,
  readPreviewProbe,
} from "@/server/preview";
import { chooseTeacherFor, readHouseholdTeacher } from "@/server/teacher";
import { NOW, resetHousehold, setupTalkDb, type TalkDb } from "./talk-fixture";

// next/headers 의 cookies() 와 next/navigation 의 unauthorized() 를 시험에서 바꾼다(요청 문맥이 없다 — access.test.ts 와 같은 꼴)
vi.mock("next/headers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/headers")>()),
  cookies: async () => ({ get: () => undefined }),
}));
class UnauthorizedSignal extends Error {}
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  unauthorized: () => {
    throw new UnauthorizedSignal("unauthorized");
  },
}));

let talkDb: TalkDb;
let db: Db;
let profileId: string;

beforeAll(async () => {
  talkDb = await setupTalkDb();
  db = talkDb.db;
});
afterAll(async () => {
  await talkDb.testDb.drop();
});
beforeEach(async () => {
  profileId = await resetHousehold(db, 1, null);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

async function teacherKey(): Promise<string | null | undefined> {
  const [row] = await db
    .select({ key: profiles.teacherKey })
    .from(profiles)
    .where(eq(profiles.id, profileId));
  return row?.key;
}

const choose = (input: unknown) => chooseTeacherFor(input, { db });

describe("선생님 고르기 액션(값 6 chooseTeacher)", () => {
  it("AC-19b 선생님 고르기: 접근 쿠키가 없으면 401 이고 teacher_key 는 비어 있다", async () => {
    vi.stubEnv("ACCESS_CODE_HASH", "x".repeat(64));
    const { chooseTeacher } = await import("@/server/actions/teacher");
    await expect(chooseTeacher({ key: "mina" })).rejects.toBeInstanceOf(
      UnauthorizedSignal,
    );
    expect(await teacherKey()).toBeNull();
  });

  it("AC-19b 선생님 고르기: 명단에 있고 보이는 선생님이면 teacher_key 에 남고 집 선생님이 그 선생님이다", async () => {
    expect(await readHouseholdTeacher({ db })).toBeNull();
    expect(await choose({ key: "mina" })).toEqual({ ok: true });
    expect(await teacherKey()).toBe("mina");
    const view = await readHouseholdTeacher({ db });
    expect(view).toMatchObject({ key: "mina", nameKo: "미나" });
    expect(view).not.toHaveProperty("personaEn");
  });

  it("AC-19b 선생님 고르기: 명단 밖 키 · 꼴이 틀린 입력은 unknown 이고 쓰지 않는다", async () => {
    for (const input of [
      { key: "tori" },
      { key: "Mina" },
      { key: "" },
      { key: "mina; drop" },
      { key: "mina", extra: 1 },
      { key: 1 },
      "mina",
      null,
      undefined,
    ]) {
      expect(await choose(input)).toEqual({ ok: false, reason: "unknown" });
    }
    expect(await teacherKey()).toBeNull();
  });

  it("AC-19b 선생님 고르기: 영어 이름이 Mina 인 아이가 미나를 고르면 hidden 이고 리오는 고를 수 있다", async () => {
    await db
      .update(profiles)
      .set({ englishName: "Mina" })
      .where(eq(profiles.id, profileId));
    expect(await choose({ key: "mina" })).toEqual({
      ok: false,
      reason: "hidden",
    });
    expect(await teacherKey()).toBeNull();
    expect(await choose({ key: "leo" })).toEqual({ ok: true });
    expect(await teacherKey()).toBe("leo");
  });

  it("AC-19b 선생님 고르기: 이미 고른 프로필의 다시 쓰기는 already 이고, 명단에 없는 키가 남은 프로필은 다시 고를 수 있다", async () => {
    expect(await choose({ key: "mina" })).toEqual({ ok: true });
    expect(await choose({ key: "leo" })).toEqual({
      ok: false,
      reason: "already",
    });
    expect(await choose({ key: "mina" })).toEqual({
      ok: false,
      reason: "already",
    });
    expect(await teacherKey()).toBe("mina");

    // 명단에서 빠진 키(명단을 줄이는 변경 뒤)는 고르지 않은 것과 같다(3.3 '명단에 없는 키일 때')
    await db
      .update(profiles)
      .set({ teacherKey: "tori" })
      .where(eq(profiles.id, profileId));
    expect(await readHouseholdTeacher({ db })).toBeNull();
    expect(await choose({ key: "leo" })).toEqual({ ok: true });
    expect(await teacherKey()).toBe("leo");
  });

  it("AC-19b 선생님 고르기: 두 기기가 겹쳐 고르면 한 번만 쓰고 늦은 쪽은 already 다", async () => {
    const results = await Promise.all([
      choose({ key: "mina" }),
      choose({ key: "leo" }),
    ]);
    const won = results.flatMap((r, i) => (r.ok ? [i] : []));
    expect(won).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([
      { ok: false, reason: "already" },
    ]);
    expect(await teacherKey()).toBe(won[0] === 0 ? "mina" : "leo");
  });
});

// ── 관찰 쪽(값 6 · 16 — d6) ──────────────────────────────────────

const PRODUCTION = { VERCEL_ENV: "production" };
const PREVIEW = { VERCEL_ENV: "preview" };

async function trackOf(area: Area) {
  const [row] = await db
    .select({ level: profileTracks.level, unit: profileTracks.unit })
    .from(profileTracks)
    .where(
      and(eq(profileTracks.profileId, profileId), eq(profileTracks.area, area)),
    );
  return row;
}

async function roundsOf(area: Area, unit: number) {
  return db
    .select()
    .from(unitProgress)
    .where(
      and(
        eq(unitProgress.profileId, profileId),
        eq(unitProgress.area, area),
        eq(unitProgress.level, PREVIEW_JUMP_LEVEL),
        eq(unitProgress.unit, unit),
      ),
    );
}

async function homeCard(area: Area) {
  const home = await readHome({ db, now: NOW });
  return home?.cards.find((c) => c.area === area);
}

const jump = (input: unknown, env: Record<string, string> = PREVIEW) =>
  jumpUnitForPreviewFor(input, { db, now: () => NOW, env });

describe("관찰 쪽 선생님 지우기(값 6 clearTeacherForPreview)", () => {
  it("AC-19b 관찰 쪽 지우기: 접근 쿠키가 없으면 401 이고 고른 선생님은 그대로다", async () => {
    vi.stubEnv("ACCESS_CODE_HASH", "x".repeat(64));
    expect(await choose({ key: "mina" })).toEqual({ ok: true });
    const { clearTeacherForPreview } = await import(
      "@/server/actions/teacher-preview"
    );
    await expect(clearTeacherForPreview()).rejects.toBeInstanceOf(
      UnauthorizedSignal,
    );
    expect(await teacherKey()).toBe("mina");
  });

  it("AC-19b 관찰 쪽 지우기: 운영 배포(VERCEL_ENV=production)에서는 거부하고 teacher_key 를 그대로 둔다", async () => {
    expect(await choose({ key: "mina" })).toEqual({ ok: true });
    expect(await clearTeacherForPreviewFor({ db, env: PRODUCTION })).toEqual({
      ok: false,
    });
    expect(await teacherKey()).toBe("mina");
  });

  it("AC-19b 관찰 쪽 지우기: 프리뷰 배포에서는 teacher_key 를 비워 집 선생님이 없고 다시 고를 수 있다", async () => {
    expect(await choose({ key: "mina" })).toEqual({ ok: true });
    expect(await clearTeacherForPreviewFor({ db, env: PREVIEW })).toEqual({
      ok: true,
    });
    expect(await teacherKey()).toBeNull();
    expect(await readHouseholdTeacher({ db })).toBeNull();
    expect(await choose({ key: "leo" })).toEqual({ ok: true });
    expect(await teacherKey()).toBe("leo");
  });
});

describe("관찰 쪽 단원 바로 가기(컨트롤러 덧 2026-10-23 — 프리뷰 전용)", () => {
  it("AC-19b 단원 바로 가기: 접근 쿠키가 없으면 401 이고 지금 단원은 그대로다", async () => {
    vi.stubEnv("ACCESS_CODE_HASH", "x".repeat(64));
    const { jumpUnitForPreview } = await import(
      "@/server/actions/teacher-preview"
    );
    await expect(
      jumpUnitForPreview({ area: "talk", unit: 3 }),
    ).rejects.toBeInstanceOf(UnauthorizedSignal);
    expect(await trackOf("talk")).toEqual({ level: 1, unit: 1 });
  });

  it("AC-19b 단원 바로 가기: 운영 배포(VERCEL_ENV=production)에서는 거부하고 트랙 · 단원 회차 · 사건을 쓰지 않는다", async () => {
    const eventsBefore = await db
      .select()
      .from(progressEvents)
      .where(eq(progressEvents.profileId, profileId));
    expect(await jump({ area: "talk", unit: 3 }, PRODUCTION)).toEqual({
      ok: false,
      reason: "refused",
    });
    expect(await trackOf("talk")).toEqual({ level: 1, unit: 1 });
    expect(await roundsOf("talk", 3)).toHaveLength(0);
    expect(
      await db
        .select()
        .from(progressEvents)
        .where(eq(progressEvents.profileId, profileId)),
    ).toHaveLength(eventsBefore.length);
  });

  it("AC-19b 단원 바로 가기: 회화 단원 3 으로 바꾸면 트랙 · 첫 단원 회차(단원 시작 복사본) · 사건이 들고 홈 회화 카드가 단원 3 을 지금 단원으로 보인다", async () => {
    expect((await homeCard("talk"))?.unit).toBe(1);
    expect(await jump({ area: "talk", unit: 3 })).toEqual({
      ok: true,
      area: "talk",
      level: PREVIEW_JUMP_LEVEL,
      unit: 3,
      started: true,
    });
    expect(await trackOf("talk")).toEqual({
      level: PREVIEW_JUMP_LEVEL,
      unit: 3,
    });
    const [round, ...more] = await roundsOf("talk", 3);
    expect(more).toHaveLength(0);
    expect(round).toMatchObject({ round: 1, startedAt: NOW, passedAt: null });
    // 단원 시작 복사본은 첫 실행 · 배치와 같은 키(unitSnapshotOf — 홈 · 수업 목록이 읽는 칸)
    expect(round?.settingsSnapshot).toEqual(
      expect.objectContaining({
        "unit.min_lessons": expect.any(Number),
        "unit.recent_window": expect.any(Number),
      }),
    );
    const events = await db
      .select()
      .from(progressEvents)
      .where(eq(progressEvents.profileId, profileId));
    // 첫 실행 사건과 가르는 것은 까닭 글(select 차례는 정해져 있지 않다)
    const jumped = events.filter(
      (e) => (e.target as { source?: unknown }).source === PREVIEW_JUMP_SOURCE,
    );
    expect(jumped).toHaveLength(1);
    expect(jumped[0]).toMatchObject({
      kind: "parent_adjustment",
      actor: "parent",
      target: { area: "talk", source: PREVIEW_JUMP_SOURCE },
      oldValue: { level: 1, unit: 1 },
      newValue: { level: PREVIEW_JUMP_LEVEL, unit: 3 },
    });
    const card = await homeCard("talk");
    expect(card).toMatchObject({ gate: null, level: 1, unit: 3 });
    expect(card?.unitCells).toEqual([
      "upcoming",
      "upcoming",
      "current",
      "upcoming",
      "upcoming",
    ]);
    expect((await readPreviewProbe({ db }))?.tracks).toContainEqual({
      area: "talk",
      level: 1,
      unit: 3,
    });
  });

  it("AC-19b 단원 바로 가기: 이미 회차가 있는 단원으로 돌아가면 그 회차를 그대로 쓰고 새 회차를 넣지 않는다", async () => {
    expect(await jump({ area: "talk", unit: 2 })).toMatchObject({
      ok: true,
      started: true,
    });
    expect(await jump({ area: "talk", unit: 1 })).toMatchObject({
      ok: true,
      unit: 1,
      started: false,
    });
    expect(await roundsOf("talk", 1)).toHaveLength(1);
    expect(await trackOf("talk")).toEqual({ level: 1, unit: 1 });
    expect((await homeCard("talk"))?.unit).toBe(1);
  });

  it("AC-19b 단원 바로 가기: 배치 전 읽기도 1단계 알파벳 단원 0 으로 바꿀 수 있고 홈 읽기 카드가 배치 문 없이 그 단원을 읽는다", async () => {
    expect((await homeCard("reading"))?.gate).toBe("placement");
    expect(await jump({ area: "reading", unit: 0 })).toMatchObject({
      ok: true,
      area: "reading",
      unit: 0,
    });
    expect(await trackOf("reading")).toEqual({ level: 1, unit: 0 });
    expect(await roundsOf("reading", 0)).toHaveLength(1);
    expect(await homeCard("reading")).toMatchObject({
      gate: null,
      level: 1,
      unit: 0,
    });
  });

  it("AC-19b 단원 바로 가기: 1단계에 없는 단원(말하기 · 회화 0, 6) · 모르는 영역 · 꼴이 틀린 입력은 invalid 이고 아무것도 바꾸지 않는다", async () => {
    for (const input of [
      { area: "speaking", unit: 0 },
      { area: "talk", unit: 0 },
      { area: "talk", unit: 6 },
      { area: "reading", unit: -1 },
      { area: "talk", unit: 1.5 },
      { area: "math", unit: 1 },
      { area: "talk", unit: "2" },
      { area: "talk", unit: 2, level: 4 },
      null,
      "talk",
    ]) {
      expect(await jump(input)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(await trackOf("talk")).toEqual({ level: 1, unit: 1 });
    expect(await trackOf("speaking")).toEqual({ level: null, unit: null });
  });

  it("AC-19b 단원 바로 가기: 프로필이 없으면 no_profile 이다", async () => {
    await db.delete(profiles);
    expect(await jump({ area: "talk", unit: 2 })).toEqual({
      ok: false,
      reason: "no_profile",
    });
    expect(await readPreviewProbe({ db })).toBeUndefined();
  });
});

// 회화 선생님 고르기 · 집 선생님(선생님 화면 plan 값 5 · 6 — AC-19b 의 통합 몫: 액션 쿠키 없이 401 · 명단 밖 · 보이지 않음 · 이미 고름 거부 ·
// 두 요청 겹쳐도 한 번). 관찰 쪽 지우기(운영 거부)는 d6 이 이 파일에 더한다. 아이 이름은 지어낸 값이다.
import { eq } from "drizzle-orm";
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
import { profiles } from "@/db/schema/learning";
import type { Db } from "@/server/db";
import { chooseTeacherFor, readHouseholdTeacher } from "@/server/teacher";
import { resetHousehold, setupTalkDb, type TalkDb } from "./talk-fixture";

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

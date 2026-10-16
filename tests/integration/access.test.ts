// AC-1a 의 P3b 몫: 접근 코드 제출 · 실패 세기 · IP 잠금 · 쿠키 있는 기기 · 제출 끝점(plan-p03b 증명 표).
// 숫자는 TEST_SETTINGS 에서 읽는다. 접근 코드 · 해시는 실행 때 만든다. 시각은 인자로 넘긴다.
import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import postgres from "postgres";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  ACCESS_CODE_MAX_LENGTH,
  ACCESS_COOKIE_NAME,
  hashIp,
  issueAccessToken,
  verifyAccessToken,
} from "@/core/access-token";
import { parentAuth } from "@/db/schema/operations";
import {
  ACCESS_IP_RETENTION_MS,
  submitAccessCode,
} from "@/server/access/attempts";
import { ACCESS_CODE_MIN_LENGTH, hashAccessCode } from "@/server/access/code";
import { now as clockNow } from "@/server/clock";
import { SettingMissingError } from "@/server/settings";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  createTestDatabase,
  type SettingEntry,
  seedSettings,
  type TestDatabase,
} from "./test-db";

// next/headers 의 cookies() 와 next/navigation 의 unauthorized() 를 시험에서 바꾼다(요청 문맥이 없다)
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));
class UnauthorizedSignal extends Error {}
vi.mock("next/navigation", () => ({
  unauthorized: () => {
    throw new UnauthorizedSignal("unauthorized");
  },
}));

const ALPHANUMERIC =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const NONCE_BYTES = 16;
/** 잠금을 기다리는 연결을 찾는 시간 상한 · 간격(기술 값). */
const LOCK_WAIT_TIMEOUT_MS = 5_000;
const LOCK_POLL_MS = 20;
const COOKIE_DAYS = TEST_SETTINGS["access.cookie_days"].value;
const MAX_ATTEMPTS = TEST_SETTINGS["parent.pin_max_attempts"].value;
const LOCK_MINUTES = TEST_SETTINGS["parent.lock_minutes"].value;
/** 시험의 기준 시각(시계를 읽지 않는다). */
const BASE = new Date("2026-10-16T03:00:00Z");
const at = (minutes: number) =>
  new Date(BASE.getTime() + minutes * MS_PER_MINUTE);

function randomCode(length = ACCESS_CODE_MIN_LENGTH + 4): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHANUMERIC[randomInt(ALPHANUMERIC.length)];
  }
  return out;
}

let ipCounter = 0;
/** 시험마다 다른 IP(문서용 주소 대역). */
const nextIp = () => {
  ipCounter += 1;
  return `203.0.113.${ipCounter}`;
};

let testDb: TestDatabase;
let code = "";
let keyMaterial = "";
let env: Record<string, string>;

beforeAll(async () => {
  testDb = await createTestDatabase();
  const entries: SettingEntry[] = (
    [
      "access.cookie_days",
      "parent.pin_max_attempts",
      "parent.lock_minutes",
    ] as const
  ).map((key) => ({ key, ...TEST_SETTINGS[key] }));
  await seedSettings(testDb.db, entries);
  code = randomCode();
  keyMaterial = await hashAccessCode(code);
  env = { ACCESS_CODE_HASH: keyMaterial };
});

afterAll(async () => {
  await testDb?.drop();
});

afterEach(() => {
  cookieJar.clear();
  vi.unstubAllEnvs();
});

const submit = (input: { code: string; ip: string; now: Date }) =>
  submitAccessCode({ ...input, db: testDb.db, env });

async function lockIp(ip: string, now: Date) {
  for (let i = 1; i < MAX_ATTEMPTS; i += 1) {
    expect(await submit({ code: randomCode(), ip, now })).toEqual({
      kind: "wrong",
    });
  }
  return submit({ code: randomCode(), ip, now });
}

/** 다른 연결이 행 잠금을 기다리기 시작할 때까지 기다린다. */
async function waitForLockWaiter(): Promise<void> {
  const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const [row] = await testDb.db.$client<{ waiting: number }[]>`
      SELECT count(*)::int AS waiting FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock'`;
    if (row.waiting > 0) return;
    await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
  }
  throw new Error("행 잠금을 기다리는 제출이 보이지 않는다");
}

async function ipRowCount(): Promise<number> {
  const rows = await testDb.db
    .select({ id: parentAuth.id })
    .from(parentAuth)
    .where(eq(parentAuth.kind, "access_ip"));
  return rows.length;
}

describe("접근 코드 제출", () => {
  it("AC-1a 맞는 코드를 넣으면 access.cookie_days 일짜리 쿠키 토큰을 받는다", async () => {
    const result = await submit({ code, ip: nextIp(), now: BASE });
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    const ttl = COOKIE_DAYS * SECONDS_PER_DAY;
    expect(result.maxAgeSeconds).toBe(ttl);
    expect(
      await verifyAccessToken(result.token, { keyMaterial, now: BASE }),
    ).toBe(true);
    const lastSecond = new Date(BASE.getTime() + (ttl - 1) * MS_PER_SECOND);
    const expired = new Date(BASE.getTime() + ttl * MS_PER_SECOND);
    expect(
      await verifyAccessToken(result.token, { keyMaterial, now: lastSecond }),
    ).toBe(true);
    expect(
      await verifyAccessToken(result.token, { keyMaterial, now: expired }),
    ).toBe(false);
  });

  it("AC-1a 한 IP 에서 틀린 코드를 parent.pin_max_attempts 회 넣으면 그 IP 만 parent.lock_minutes 분 잠긴다(다른 IP 는 그대로)", async () => {
    const ip = nextIp();
    expect(await lockIp(ip, BASE)).toEqual({
      kind: "locked",
      retryAfterSeconds: LOCK_MINUTES * SECONDS_PER_MINUTE,
    });
    // 잠긴 동안 틀린 코드도 세지 않고 잠김이다
    expect(await submit({ code: randomCode(), ip, now: at(1) })).toEqual({
      kind: "locked",
      retryAfterSeconds: (LOCK_MINUTES - 1) * SECONDS_PER_MINUTE,
    });
    // 다른 IP 는 그대로
    const other = nextIp();
    expect(await submit({ code: randomCode(), ip: other, now: at(1) })).toEqual(
      { kind: "wrong" },
    );
    expect((await submit({ code, ip: other, now: at(1) })).kind).toBe("ok");
  });

  it("AC-1a 잠긴 동안에는 맞는 코드도 받지 않고 잠금이 지나면 다시 받는다", async () => {
    const ip = nextIp();
    expect((await lockIp(ip, BASE)).kind).toBe("locked");
    expect((await submit({ code, ip, now: at(LOCK_MINUTES - 1) })).kind).toBe(
      "locked",
    );
    expect((await submit({ code, ip, now: at(LOCK_MINUTES) })).kind).toBe("ok");
  });

  it("AC-1a 맞는 코드를 넣으면 그 IP 의 실패 수가 지워진다", async () => {
    const ip = nextIp();
    for (let i = 1; i < MAX_ATTEMPTS; i += 1) {
      expect((await submit({ code: randomCode(), ip, now: BASE })).kind).toBe(
        "wrong",
      );
    }
    expect((await submit({ code, ip, now: BASE })).kind).toBe("ok");
    // 다시 처음부터 센다: max - 1 번 틀려도 잠기지 않는다
    for (let i = 1; i < MAX_ATTEMPTS; i += 1) {
      expect((await submit({ code: randomCode(), ip, now: at(1) })).kind).toBe(
        "wrong",
      );
    }
  });

  it("AC-1a 이미 쿠키가 있는 기기는 그 IP 가 잠겨도 requireAccess 를 통과한다", async () => {
    const { requireAccess } = await import("@/server/access/guard");
    const ip = nextIp();
    const realNow = clockNow();
    expect((await lockIp(ip, realNow)).kind).toBe("locked");
    vi.stubEnv("ACCESS_CODE_HASH", keyMaterial);
    const token = await issueAccessToken({
      keyMaterial,
      now: realNow,
      ttlSeconds: COOKIE_DAYS * SECONDS_PER_DAY,
      nonce: crypto.getRandomValues(new Uint8Array(NONCE_BYTES)),
    });
    cookieJar.set(ACCESS_COOKIE_NAME, token);
    await expect(requireAccess()).resolves.toBeUndefined();
    cookieJar.clear();
    await expect(requireAccess()).rejects.toBeInstanceOf(UnauthorizedSignal);
  });

  it("접근 코드 제출: 같은 IP 의 두 제출이 겹쳐 앞쪽이 행을 지워도 뒤쪽은 wrong · ok 로 처리된다", async () => {
    // 앞쪽 제출(맞는 코드로 행을 지우는 트랜잭션)을 손으로 흉내 낸다: 행을 잠근 채 뒤쪽 제출이 FOR UPDATE 에서
    // 기다리게 한 뒤 행을 지우고 끝낸다. 뒤쪽은 0행을 받으므로 행을 다시 넣고 센다(검토 M-3)
    // 손으로 잠그는 트랜잭션은 시험 DB 풀 밖의 따로 된 연결 하나로 연다(풀 크기 POOL_MAX 에 기대지 않게, 재검토 N-2)
    const client = postgres(testDb.url, { max: 1, onnotice: () => {} });
    try {
      for (const [submitted, expected] of [
        [randomCode(), "wrong"],
        [code, "ok"],
      ] as const) {
        const ip = nextIp();
        expect((await submit({ code: randomCode(), ip, now: BASE })).kind).toBe(
          "wrong",
        );
        const ipHash = await hashIp(ip, keyMaterial);
        let release = () => {};
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        let locked = () => {};
        const holding = new Promise<void>((resolve) => {
          locked = resolve;
        });
        const front = client.begin(async (tx) => {
          await tx`SELECT id FROM parent_auth WHERE ip_hash = ${ipHash} FOR UPDATE`;
          locked();
          await gate;
          await tx`DELETE FROM parent_auth WHERE ip_hash = ${ipHash}`;
        });
        await holding;
        const back = submit({ code: submitted, ip, now: at(1) });
        await waitForLockWaiter();
        release();
        await front;
        expect((await back).kind).toBe(expected);
      }
    } finally {
      await client.end();
    }
  });

  it("접근 코드 제출: 하루 지난 IP 행은 제출 때 지운다", async () => {
    const stale = nextIp();
    expect(
      (await submit({ code: randomCode(), ip: stale, now: BASE })).kind,
    ).toBe("wrong");
    const before = await ipRowCount();
    // 앞 시험들이 남긴 행(실제 시계로 만든 행 포함)보다 하루 넘게 뒤
    const dayLater = new Date(
      Math.max(BASE.getTime(), clockNow().getTime()) +
        ACCESS_IP_RETENTION_MS +
        MS_PER_MINUTE,
    );
    expect(
      (await submit({ code: randomCode(), ip: nextIp(), now: dayLater })).kind,
    ).toBe("wrong");
    // 하루 지난 행(앞 시험들의 행 포함)은 모두 지워지고 이번 행 하나만 남는다
    expect(before).toBeGreaterThan(0);
    expect(await ipRowCount()).toBe(1);
  });

  it("접근 코드 제출: ACCESS_CODE_HASH 가 없거나 풀리지 않으면 DB 를 건드리지 않고 not_configured 다", async () => {
    const untouched = { db: undefined as never };
    for (const badEnv of [{}, { ACCESS_CODE_HASH: "not-a-hash" }]) {
      expect(
        await submitAccessCode({
          code,
          ip: nextIp(),
          now: BASE,
          env: badEnv,
          ...untouched,
        }),
      ).toEqual({ kind: "not_configured" });
    }
  });

  it("접근 코드 제출: 설정 행이 없으면 SettingMissingError 가 그대로 나간다(제출 끝점이 503 으로 바꾼다)", async () => {
    const empty = await createTestDatabase();
    try {
      await expect(
        submitAccessCode({
          code,
          ip: nextIp(),
          now: BASE,
          db: empty.db,
          env,
        }),
      ).rejects.toBeInstanceOf(SettingMissingError);
    } finally {
      await empty.drop();
    }
  });
});

// ── 제출 끝점(Route Handler) ──

const HOST = "localhost:3100";
let lastDbUrl = "";

/** 제출 끝점이 쓰는 환경(DATABASE_URL · ACCESS_CODE_HASH)을 시험 DB 와 시험 해시로 맞춘다. */
function routeEnv(dbUrl: string, hash: string = keyMaterial) {
  vi.stubEnv("DATABASE_URL", dbUrl);
  vi.stubEnv("ACCESS_CODE_HASH", hash);
  lastDbUrl = dbUrl;
}

function submitRequest(
  body: unknown,
  {
    ip,
    origin = `http://${HOST}`,
    scheme = "http",
    raw,
  }: { ip: string; origin?: string | null; scheme?: string; raw?: string },
) {
  const headers: Record<string, string> = {
    host: HOST,
    "content-type": "application/json",
    "x-real-ip": ip,
  };
  if (origin !== null) headers.origin = origin;
  return new NextRequest(`${scheme}://${HOST}/access/submit`, {
    method: "POST",
    headers,
    body: raw ?? JSON.stringify(body),
  });
}

describe("제출 끝점", () => {
  afterAll(async () => {
    // getDb() 가 globalThis 에 둔 마지막 연결을 닫는다
    if (!lastDbUrl) return;
    vi.stubEnv("DATABASE_URL", lastDbUrl);
    const { getDb } = await import("@/server/db");
    await getDb().$client.end();
    vi.unstubAllEnvs();
  });

  it("AC-1a 제출 끝점: 맞으면 204 와 HttpOnly · SameSite=Lax · Path=/ · Max-Age 쿠키, https 일 때만 Secure", async () => {
    const { POST } = await import("@/app/(setup)/access/submit/route");
    routeEnv(testDb.url);
    const maxAge = COOKIE_DAYS * SECONDS_PER_DAY;
    for (const scheme of ["http", "https"]) {
      const response = await POST(
        submitRequest(
          { code: `  ${code} ` },
          { ip: nextIp(), scheme, origin: `${scheme}://${HOST}` },
        ),
      );
      expect(response.status, scheme).toBe(204);
      const setCookie = response.headers.get("set-cookie") ?? "";
      expect(setCookie).toMatch(new RegExp(`^${ACCESS_COOKIE_NAME}=v1\\.`));
      expect(setCookie).toMatch(/;\s*HttpOnly/i);
      expect(setCookie).toMatch(/;\s*SameSite=Lax/i);
      expect(setCookie).toMatch(/;\s*Path=\/(;|$)/i);
      expect(setCookie).toMatch(new RegExp(`;\\s*Max-Age=${maxAge}(;|$)`, "i"));
      expect(/;\s*Secure/i.test(setCookie), scheme).toBe(scheme === "https");
      const token = response.cookies.get(ACCESS_COOKIE_NAME)?.value;
      expect(
        await verifyAccessToken(token, { keyMaterial, now: clockNow() }),
      ).toBe(true);
    }
  });

  it("AC-1a 제출 끝점: 틀림 401 · 잠김 429(Retry-After) · 다른 출처 403 · 꼴 깨짐 400 · 설정 안 됨 503", async () => {
    const { POST } = await import("@/app/(setup)/access/submit/route");
    routeEnv(testDb.url);
    const ip = nextIp();
    // 틀림 401
    for (let i = 1; i < MAX_ATTEMPTS; i += 1) {
      const response = await POST(
        submitRequest({ code: randomCode() }, { ip }),
      );
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ result: "wrong" });
      expect(response.headers.get("set-cookie")).toBeNull();
    }
    // 잠김 429 + Retry-After
    const locked = await POST(submitRequest({ code: randomCode() }, { ip }));
    expect(locked.status).toBe(429);
    expect(await locked.json()).toEqual({ result: "locked" });
    const retryAfter = Number(locked.headers.get("retry-after"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(LOCK_MINUTES * SECONDS_PER_MINUTE);
    expect((await POST(submitRequest({ code }, { ip }))).status).toBe(429);

    // 다른 출처 · 출처 없음 403(실패로 세지 않는다)
    const other = nextIp();
    for (const origin of ["http://evil.example", null]) {
      const response = await POST(
        submitRequest({ code }, { ip: other, origin }),
      );
      expect(response.status, String(origin)).toBe(403);
    }
    // 꼴 깨짐 400(실패로 세지 않는다)
    for (const [body, raw] of [
      [{ code: 12 }, undefined],
      [{}, undefined],
      [{ code: "a".repeat(ACCESS_CODE_MAX_LENGTH + 1) }, undefined],
      [null, "{not json"],
    ] as const) {
      const response = await POST(submitRequest(body, { ip: other, raw }));
      expect(response.status, raw ?? JSON.stringify(body)).toBe(400);
    }
    // 403 · 400 은 세지 않았으므로 같은 IP 에서 맞는 코드가 통과한다
    expect((await POST(submitRequest({ code }, { ip: other }))).status).toBe(
      204,
    );

    // 설정 안 됨 503: ACCESS_CODE_HASH 없음
    routeEnv(testDb.url, "");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const noHash = await POST(submitRequest({ code }, { ip: nextIp() }));
      expect(noHash.status).toBe(503);
      expect(await noHash.json()).toEqual({ result: "not_configured" });
      // 설정 행 없음도 503
      const empty = await createTestDatabase();
      try {
        routeEnv(empty.url);
        const noSettings = await POST(
          submitRequest({ code }, { ip: nextIp() }),
        );
        expect(noSettings.status).toBe(503);
        expect(await noSettings.json()).toEqual({ result: "not_configured" });
        const { getDb } = await import("@/server/db");
        await getDb().$client.end();
        lastDbUrl = "";
      } finally {
        await empty.drop();
      }
      // 서버 기록에 코드 · 해시를 남기지 않는다
      for (const call of log.mock.calls) {
        expect(call.join(" ")).not.toContain(code);
        expect(call.join(" ")).not.toContain(keyMaterial);
      }
    } finally {
      log.mockRestore();
    }
  });
});

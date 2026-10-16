// AC-N5 의 Data API 몫: publishable 키(있으면 레거시 anon 키도)로 모든 테이블이 닫힘 · 권한 오류 · 0행인지(plan-p03b 증명 표).
// 키 · 주소는 실행 때 만든 가짜이고 fetch 는 시험 안에서 흉내 낸다.
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  type FetchLike,
  runDataApiCheck,
  schemaTableNames,
} from "../../scripts/check-data-api";

const SUPABASE_URL = "https://example-project.supabase.co";
const fakeKey = (prefix: string) =>
  `${prefix}${randomBytes(18).toString("base64url")}`;
const TABLES = ["profiles", "sessions", "settings"];

type Call = { url: string; headers: Record<string, string> };

function fakeFetch(
  respond: (table: string, call: Call) => Response | "throw",
): { fetch: FetchLike; calls: Call[] } {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    const call = {
      url: String(url),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    };
    calls.push(call);
    const table = new URL(call.url).pathname.split("/").pop() ?? "";
    const result = respond(table, call);
    if (result === "throw") throw new TypeError("fetch failed");
    return result;
  };
  return { fetch, calls };
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("Data API 확인", () => {
  it("AC-N5 Data API 확인: 모든 테이블이 닫힘 · 권한 오류 · 0행이면 0", async () => {
    const { fetch } = fakeFetch((table) => {
      if (table === "profiles") {
        return json(401, { code: "42501", message: "permission denied" });
      }
      if (table === "sessions") return json(404, { code: "PGRST106" });
      return json(200, []);
    });
    const result = await runDataApiCheck({
      env: {
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY: fakeKey("sb_publishable_"),
      },
      tables: TABLES,
      fetch,
    });
    expect(result.code).toBe(0);
    expect(result.lines[0]).toBe(
      "check-data-api: 테이블 3 · 키 1 · 닫힘 2 · 0행 1 · 행 있음 0 · 모름 0 · 닿지 않음 0",
    );
    expect(result.lines).toContain("닫힘 응답: 401 42501 ×1 · 404 PGRST106 ×1");
  });

  it("AC-N5 Data API 확인: 행이 돌아온 테이블이 있으면 1 과 그 테이블 이름", async () => {
    const { fetch } = fakeFetch((table) => {
      if (table === "settings") return json(200, [{ key: "x", value: 1 }]);
      if (table === "sessions") return json(200, { not: "array" });
      return json(401, { code: "42501" });
    });
    const result = await runDataApiCheck({
      env: {
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY: fakeKey("sb_publishable_"),
      },
      tables: TABLES,
      fetch,
    });
    expect(result.code).toBe(1);
    expect(result.lines).toContain("settings publishable 행 있음");
    expect(result.lines).toContain("sessions publishable 모름");
    expect(result.lines.some((line) => line.startsWith("profiles"))).toBe(
      false,
    );
  });

  it("AC-N5 Data API 확인: 레거시 anon 키가 있으면 그 키로도 모든 테이블을 본다", async () => {
    const publishable = fakeKey("sb_publishable_");
    const legacy = fakeKey("eyJ");
    const { fetch, calls } = fakeFetch((table, call) =>
      call.headers.apikey === legacy && table === "profiles"
        ? json(200, [{ id: 1 }])
        : json(401, { code: "42501" }),
    );
    const result = await runDataApiCheck({
      env: {
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY: publishable,
        SUPABASE_LEGACY_ANON_KEY: legacy,
      },
      tables: TABLES,
      fetch,
    });
    expect(calls).toHaveLength(TABLES.length * 2);
    const legacyCalls = calls.filter((c) => c.headers.apikey === legacy);
    expect(legacyCalls).toHaveLength(TABLES.length);
    for (const call of legacyCalls) {
      expect(call.headers.authorization).toBe(`Bearer ${legacy}`);
    }
    for (const call of calls.filter((c) => c.headers.apikey === publishable)) {
      expect(call.headers.authorization).toBeUndefined();
      expect(call.url).toMatch(/\/rest\/v1\/[a-z_]+\?select=\*&limit=1$/);
    }
    expect(result.code).toBe(1);
    expect(result.lines[0]).toContain("키 2");
    expect(result.lines).toContain("profiles legacy_anon 행 있음");
  });

  it("AC-N5 Data API 확인: 주소 · 키가 없거나 닿지 않으면 2", async () => {
    const { fetch } = fakeFetch(() => json(200, []));
    for (const env of [
      {},
      { SUPABASE_URL },
      { SUPABASE_PUBLISHABLE_KEY: fakeKey("sb_publishable_") },
      {
        SUPABASE_URL: "not a url",
        SUPABASE_PUBLISHABLE_KEY: fakeKey("sb_publishable_"),
      },
    ]) {
      const result = await runDataApiCheck({ env, tables: TABLES, fetch });
      expect(result.code, JSON.stringify(Object.keys(env))).toBe(2);
    }
    const env = {
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY: fakeKey("sb_publishable_"),
    };
    expect((await runDataApiCheck({ env, tables: [], fetch })).code).toBe(2);
    const down = fakeFetch((table) =>
      table === "sessions" ? "throw" : json(401, {}),
    );
    const result = await runDataApiCheck({
      env,
      tables: TABLES,
      fetch: down.fetch,
    });
    expect(result.code).toBe(2);
    expect(result.lines).toContain("sessions publishable 닿지 않음");
  });

  it("AC-N5 Data API 확인: 출력에 키 값 · 응답 본문이 없다", async () => {
    const publishable = fakeKey("sb_publishable_");
    const legacy = fakeKey("eyJ");
    const secretBody = `body-${randomBytes(12).toString("hex")}`;
    const { fetch } = fakeFetch((table) =>
      table === "settings"
        ? json(200, [{ value: secretBody }])
        : json(403, { code: "42501", message: secretBody }),
    );
    const result = await runDataApiCheck({
      env: {
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY: publishable,
        SUPABASE_LEGACY_ANON_KEY: legacy,
      },
      tables: TABLES,
      fetch,
    });
    const output = result.lines.join("\n");
    for (const hidden of [publishable, legacy, secretBody]) {
      expect(output).not.toContain(hidden);
      for (const piece of [hidden.slice(0, 8), hidden.slice(-8)]) {
        expect(output).not.toContain(piece);
      }
    }
  });

  it("Data API 확인: 테이블 목록은 스키마의 테이블 29개다", () => {
    const tables = schemaTableNames();
    expect(tables).toHaveLength(29);
    expect(new Set(tables).size).toBe(tables.length);
    expect(tables).toContain("parent_auth");
  });
});

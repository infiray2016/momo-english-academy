// 마이크 점검 로그 끝점 POST /api/dev/mic-probe-log(브리프 task-mic-probe fix 4): 접근을 지난 운영 배포는 404, 접근 쿠키가 없으면 requireAccess 의
// unauthorized()(401 — 다른 API 와 같은 길, 접근 확인 자체는 access-gate.test.ts 가 본다), 본문 상한은 413, 받은 JSON 은 글 칸을 길이로
// 바꿔 console.log 한 줄로만 남긴다. 접근 확인 · 배포 판정은 가짜로 바꾼다.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOG_BODY_MAX_CHARS,
  LOG_TAG,
} from "../../src/app/dev/mic-probe/probe-log";

class UnauthorizedSignal extends Error {}

const allowed = vi.fn(() => true);
const hasAccess = vi.fn(() => true);
const sameOrigin = vi.fn(() => true);
vi.mock("@/server/access/guard", () => ({
  requireAccess: async () => {
    if (!hasAccess()) throw new UnauthorizedSignal("unauthorized");
  },
  isSameOrigin: () => sameOrigin(),
}));
vi.mock("@/server/preview", () => ({
  previewToolsAllowed: () => allowed(),
}));

const { POST } = await import("@/app/api/dev/mic-probe-log/route");

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/dev/mic-probe-log", {
    method: "POST",
    headers: { origin: "http://localhost", host: "localhost", ...headers },
    body,
  });
}

let log: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  allowed.mockReturnValue(true);
  hasAccess.mockReturnValue(true);
  sameOrigin.mockReturnValue(true);
  log = vi.spyOn(console, "log").mockImplementation(() => undefined);
});
afterEach(() => {
  log.mockRestore();
});

describe("마이크 점검 로그 끝점", () => {
  it("마이크 점검 로그 끝점: 접근 쿠키가 없으면 requireAccess 의 unauthorized()(401)로 끝나고, 접근을 지난 운영 배포는 404 이며, 둘 다 로그를 남기지 않는다", async () => {
    hasAccess.mockReturnValue(false);
    await expect(POST(request("{}"))).rejects.toBeInstanceOf(
      UnauthorizedSignal,
    );
    expect(log).not.toHaveBeenCalled();

    hasAccess.mockReturnValue(true);
    allowed.mockReturnValue(false);
    const response = await POST(request("{}"));
    expect(response.status).toBe(404);
    expect(log).not.toHaveBeenCalled();
  });

  it("마이크 점검 로그 끝점: 본문이 상한을 넘으면 413(머리글이면 읽기 전에), 다른 출처는 403, JSON 객체가 아니면 400 이고 로그를 남기지 않는다", async () => {
    const declared = request("{}", {
      "content-length": String(LOG_BODY_MAX_CHARS + 1),
    });
    const read = vi.spyOn(declared, "text");
    expect((await POST(declared)).status).toBe(413);
    expect(read).not.toHaveBeenCalled();

    const long = JSON.stringify({ pad: "x".repeat(LOG_BODY_MAX_CHARS) });
    expect((await POST(request(long))).status).toBe(413);
    expect((await POST(request("not json"))).status).toBe(400);
    expect((await POST(request("[1,2]"))).status).toBe(400);
    sameOrigin.mockReturnValue(false);
    expect((await POST(request("{}"))).status).toBe(403);
    expect(log).not.toHaveBeenCalled();
  });

  it("마이크 점검 로그 끝점: 받은 JSON 을 '[mic-probe]' 머리와 한 줄로 console.log 하고, 들은 글 칸은 길이로 바꿔 원문을 남기지 않으며 204 다", async () => {
    const body = {
      kind: "record",
      row: { strategy: "A", finalText: "apple", heardText: "app" },
      attempts: [{ lastText: "secret words" }],
    };
    const response = await POST(request(JSON.stringify(body)));
    expect(response.status).toBe(204);
    expect(log).toHaveBeenCalledTimes(1);
    const [tag, line] = log.mock.calls[0] ?? [];
    expect(tag).toBe(LOG_TAG);
    expect(typeof line).toBe("string");
    expect(JSON.parse(String(line))).toEqual({
      kind: "record",
      row: { strategy: "A", finalTextLength: 5, heardTextLength: 3 },
      attempts: [{ lastTextLength: 12 }],
    });
    expect(String(line)).not.toContain("apple");
    expect(String(line)).not.toContain("secret");
  });
});

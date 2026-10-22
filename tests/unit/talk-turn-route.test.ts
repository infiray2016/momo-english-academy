// 회화 턴 끝점 POST /api/talk/turn 의 앞머리(plan-p13b 파일별 값 5 · 검토 M-3): 같은 출처가 아니면 403, 본문 크기 머리글이 상한을 넘으면
// 본문을 읽기 전에 413. 접근 확인 · 턴 길은 가짜로 바꾼다(접근 확인 자체는 access-gate.test.ts 가 본다).
import { beforeEach, describe, expect, it, vi } from "vitest";

const sameOrigin = vi.fn(() => true);
const turn = vi.fn(async () => {});
vi.mock("@/server/access/guard", () => ({
  requireAccess: async () => {},
  isSameOrigin: () => sameOrigin(),
}));
vi.mock("@/server/conversation/turn", () => ({
  runTalkTurnRequest: () => turn(),
}));

const { POST } = await import("@/app/api/talk/turn/route");

/** 본문 크기 상한보다 큰 머리글 값(시험 값 — 처리기 상한 4000자보다 크게). */
const TOO_LARGE = 1_000_000;

function request(headers: Record<string, string>, body = "{}") {
  return new Request("http://localhost/api/talk/turn", {
    method: "POST",
    headers: { origin: "http://localhost", host: "localhost", ...headers },
    body,
  }) as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  sameOrigin.mockReturnValue(true);
  turn.mockClear();
});

describe("회화 턴 끝점 앞머리", () => {
  it("회화 턴 끝점: 같은 출처가 아니면 403 이고 턴 길을 부르지 않는다", async () => {
    sameOrigin.mockReturnValue(false);
    const response = await POST(request({}));
    expect(response.status).toBe(403);
    expect(turn).not.toHaveBeenCalled();
  });

  it("회화 턴 끝점: content-length 가 상한을 넘으면 본문을 읽기 전에 413 이다", async () => {
    const req = request({ "content-length": String(TOO_LARGE) });
    const read = vi.spyOn(req, "text");
    const response = await POST(req);
    expect(response.status).toBe(413);
    expect(read).not.toHaveBeenCalled();
    expect(turn).not.toHaveBeenCalled();
  });

  it("회화 턴 끝점: 본문이 JSON 이 아니면 400 이다", async () => {
    const response = await POST(request({}, "not json"));
    expect(response.status).toBe(400);
    expect(turn).not.toHaveBeenCalled();
  });
});

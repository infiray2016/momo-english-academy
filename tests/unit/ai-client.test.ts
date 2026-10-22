// 6.1 클라이언트 · 시도(plan-p09a 증명 표). 가짜 fetch 만 쓰고 네트워크 · 실제 API 를 부르지 않는다. 키는 가짜 글이다.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type AiRequestConfig,
  capabilitiesOf,
  requestConfigOf,
  SERVER_SIDE_FALLBACK_BETA,
} from "@/core/ai/combo";
import { classifyFailure } from "@/core/ai/failure";
import {
  AiConfigError,
  ANTHROPIC_API_BASE_URL,
  type AttemptBody,
  type AttemptRequest,
  clientOptionsOf,
  createAnthropicClient,
  getAnthropicClient,
  sendAttempt,
  toAttemptFailure,
} from "@/server/ai/client";
import {
  createFakeAnthropic,
  errorBody,
  type FakeReply,
  type FakeRequest,
  messageBody,
} from "../fixtures/ai/fake-anthropic";
import { MODEL_PRICES_FIXTURE } from "../fixtures/ai/model-prices";
import { testSettingValues } from "../fixtures/settings";

const TEST_KEY = "test-key";
const FAKE_BASE = "http://127.0.0.1:9";
/** 시험의 짧은 타임아웃 · 늦춤(기술 값 — 설정값이 아니다). */
const SHORT_TIMEOUT_MS = 50;
const LONG_DELAY_MS = 5_000;

const book = new Map(
  MODEL_PRICES_FIXTURE.models.map((m) => [
    m.model,
    { caps: capabilitiesOf(m) },
  ]),
);

/** 요청 구성 → 요청 본문(P9b 가 프롬프트 · 형식을 더한다). */
function attemptOf(
  config: AiRequestConfig,
  timeoutMs = config.timeoutMs,
): AttemptRequest {
  return {
    body: {
      model: config.model,
      max_tokens: config.maxTokens,
      thinking: config.thinking,
      output_config: { effort: config.effort },
      ...(config.fallbacks === null ? {} : { fallbacks: config.fallbacks }),
      system: "fixed part",
      messages: [{ role: "user", content: "hello" }],
    },
    betas: config.betas,
    timeoutMs,
  };
}

const writingCheck = () =>
  requestConfigOf({
    purpose: "writing_check",
    values: testSettingValues(),
    book,
  });
/** 1~3 구간을 Haiku 로 고른 회화 턴 구성(C112 뒤 기본은 Sonnet — 이 시험은 대체 모델이 없는 Haiku 쪽을 본다). */
const talkTurn13 = () =>
  requestConfigOf({
    purpose: "talk_turn",
    level: 1,
    values: {
      ...testSettingValues(),
      "ai.model.talk_turn.1-3": "claude-haiku-5-5",
    },
    book,
  });

function clientWith(...replies: FakeReply[]) {
  const fake = createFakeAnthropic(
    replies.map((reply) => ({ reply, times: 1 })),
  );
  const client = createAnthropicClient({
    env: { ANTHROPIC_API_KEY: TEST_KEY },
    fetch: fake.fetch,
  });
  return { fake, client };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("6.1 클라이언트", () => {
  it("6.1 클라이언트: 키가 없으면 만들지 않는다(프로필 자격 증명으로 넘어가지 않음)", () => {
    vi.stubEnv("ANTHROPIC_PROFILE", "someone");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "token-from-env");
    for (const env of [
      {},
      { ANTHROPIC_API_KEY: "" },
      { ANTHROPIC_API_KEY: "  " },
    ]) {
      expect(() => clientOptionsOf(env)).toThrow(AiConfigError);
      expect(() => createAnthropicClient({ env })).toThrow(AiConfigError);
    }
    const options = clientOptionsOf({ ANTHROPIC_API_KEY: ` ${TEST_KEY}\n` });
    expect(options.apiKey).toBe(TEST_KEY);
    expect(options.authToken).toBeNull();
    expect(options).not.toHaveProperty("profile");
    expect(options).not.toHaveProperty("credentials");
    expect(options).not.toHaveProperty("config");
  });

  it("6.1 클라이언트: Vercel 배포(VERCEL_ENV 있음)는 ANTHROPIC_BASE_URL 을 읽지 않는다", () => {
    vi.stubEnv("ANTHROPIC_BASE_URL", FAKE_BASE);
    for (const vercelEnv of ["production", "preview", "development"]) {
      const env = { ANTHROPIC_API_KEY: TEST_KEY, VERCEL_ENV: vercelEnv };
      expect(clientOptionsOf(env).baseURL).toBe(ANTHROPIC_API_BASE_URL);
      expect(createAnthropicClient({ env }).baseURL).toBe(
        ANTHROPIC_API_BASE_URL,
      );
    }
    // 로컬 · e2e(VERCEL_ENV 없음)는 SDK 가 ANTHROPIC_BASE_URL 을 읽는다
    const local = { ANTHROPIC_API_KEY: TEST_KEY };
    expect(clientOptionsOf(local).baseURL).toBeUndefined();
    expect(createAnthropicClient({ env: local }).baseURL).toBe(FAKE_BASE);
  });

  it("6.1 클라이언트: maxRetries 0 · logLevel warn · OpenTelemetry 끔 · authToken null", () => {
    // 환경 변수가 있어도 굳힌 값이 이긴다
    vi.stubEnv("ANTHROPIC_LOG", "debug");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "token-from-env");
    vi.stubEnv("ANTHROPIC_OPEN_TELEMETRY", "true");
    const options = clientOptionsOf({ ANTHROPIC_API_KEY: TEST_KEY });
    expect(options).toMatchObject({
      maxRetries: 0,
      logLevel: "warn",
      authToken: null,
      openTelemetry: { traces: false, propagation: false },
    });
    const client = createAnthropicClient({
      env: { ANTHROPIC_API_KEY: TEST_KEY },
    });
    expect(client.maxRetries).toBe(0);
    expect(client.logLevel).toBe("warn");
    expect(client.authToken).toBeNull();
    expect(client.apiKey).toBe(TEST_KEY);
    expect(client.openTelemetry.propagation).toBe(false);
    expect(client.openTelemetry.traces.enabled).toBe(false);
  });
});

describe("6.1 클라이언트 하나", () => {
  it("6.1 클라이언트: getAnthropicClient 는 같은 환경이면 같은 인스턴스, 키 · VERCEL_ENV · ANTHROPIC_BASE_URL 이 바뀌면 새로 만든다", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", TEST_KEY);
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("ANTHROPIC_BASE_URL", FAKE_BASE);
    const first = getAnthropicClient();
    expect(getAnthropicClient()).toBe(first);
    expect(first.baseURL).toBe(FAKE_BASE);

    vi.stubEnv("ANTHROPIC_BASE_URL", `${FAKE_BASE}0`);
    const moved = getAnthropicClient();
    expect(moved).not.toBe(first);
    expect(moved.baseURL).toBe(`${FAKE_BASE}0`);
    expect(getAnthropicClient()).toBe(moved);

    vi.stubEnv("ANTHROPIC_API_KEY", `${TEST_KEY}-2`);
    const rekeyed = getAnthropicClient();
    expect(rekeyed).not.toBe(moved);
    expect(rekeyed.apiKey).toBe(`${TEST_KEY}-2`);

    vi.stubEnv("VERCEL_ENV", "preview");
    const deployed = getAnthropicClient();
    expect(deployed).not.toBe(rekeyed);
    expect(deployed.baseURL).toBe(ANTHROPIC_API_BASE_URL);

    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(() => getAnthropicClient()).toThrow(AiConfigError);
  });
});

describe("6.1 시도", () => {
  it("6.1 시도: 500 을 받으면 요청은 한 번뿐이다(SDK 기본 재시도 없음)", async () => {
    const { fake, client } = clientWith(
      {
        kind: "error",
        status: 500,
        body: errorBody(500, "api_error", "boom"),
      },
      { kind: "message", body: messageBody({ model: "x", json: {} }) },
    );
    const result = await sendAttempt(client, attemptOf(writingCheck()));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure).toMatchObject({ kind: "http", status: 500 });
    expect(result.requestId).toMatch(/^req_fake_/);
    expect(fake.requests).toHaveLength(1);
  });

  it("6.1 시도: 요청 본문에 temperature · top_p · top_k · metadata 가 없고 betas 는 anthropic-beta 머리글로 간다", async () => {
    const { fake, client } = clientWith(
      {
        kind: "message",
        body: messageBody({ model: "claude-sonnet-5-5", json: { ok: true } }),
      },
      {
        kind: "message",
        body: messageBody({ model: "claude-haiku-5-5", json: { ok: true } }),
      },
    );
    // 금지 칸은 형(AttemptBody)이 막는다. 형이 풀리면 이 줄이 형 오류가 아니게 되어 pnpm build 가 깨진다(검토 M-1)
    const forbidden: AttemptBody = {
      ...attemptOf(writingCheck()).body,
      // @ts-expect-error temperature 는 AttemptBody 에 없다(6.1)
      temperature: 0.5,
    };
    expect(forbidden).toHaveProperty("temperature");
    const sonnet = await sendAttempt(client, attemptOf(writingCheck()));
    expect(sonnet.ok).toBe(true);
    if (sonnet.ok) {
      expect(sonnet.message.model).toBe("claude-sonnet-5-5");
      expect(sonnet.requestId).toMatch(/^req_fake_/);
      expect(sonnet.latencyMs).toBeGreaterThanOrEqual(0);
    }
    const haiku = await sendAttempt(client, attemptOf(talkTurn13()));
    expect(haiku.ok).toBe(true);

    expect(fake.requests).toHaveLength(2);
    const [first, second] = fake.requests as [FakeRequest, FakeRequest];
    const bodyOf = (request: FakeRequest) =>
      request.body as Record<string, unknown>;
    for (const request of [first, second]) {
      const body = bodyOf(request);
      for (const key of [
        "temperature",
        "top_p",
        "top_k",
        "metadata",
        "betas",
      ]) {
        expect(body).not.toHaveProperty(key);
      }
      expect(body.stream).toBe(false);
      expect(request.url).toContain("/v1/messages?beta=true");
      expect(request.headers["x-api-key"]).toBe(TEST_KEY);
      expect(request.headers).not.toHaveProperty("authorization");
      // 기본 재시도가 없으니 재시도 횟수 머리글도 0
      expect(request.headers["x-stainless-retry-count"]).toBe("0");
    }
    expect(first.headers["anthropic-beta"]).toBe(SERVER_SIDE_FALLBACK_BETA);
    expect(bodyOf(first).fallbacks).toBe("default");
    expect(second.headers).not.toHaveProperty("anthropic-beta");
    expect(second.body).not.toHaveProperty("fallbacks");
    expect(bodyOf(second).thinking).toEqual({
      type: "disabled",
    });
  });

  it("6.1 시도: 가짜가 답을 늦추면 timeoutMs 뒤 타임아웃 실패다", async () => {
    const { client } = clientWith(
      {
        kind: "message",
        body: messageBody({ model: "claude-sonnet-5-5", json: {} }),
        delayMs: LONG_DELAY_MS,
      },
      { kind: "hang" },
    );
    for (let i = 0; i < 2; i++) {
      const result = await sendAttempt(
        client,
        attemptOf(writingCheck(), SHORT_TIMEOUT_MS),
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.failure).toEqual({ kind: "timeout" });
      expect(result.latencyMs).toBeGreaterThanOrEqual(SHORT_TIMEOUT_MS - 1);
      expect(result.latencyMs).toBeLessThan(LONG_DELAY_MS);
    }
  });

  it("6.1 시도: SDK 오류 갈래 넷(타임아웃 · 연결 · 500 · 400)이 8절 분류대로 나온다", async () => {
    const { client } = clientWith(
      { kind: "hang" },
      { kind: "network-error" },
      { kind: "error", status: 500, body: errorBody(500, "api_error", "x") },
      {
        kind: "error",
        status: 400,
        body: errorBody(400, "invalid_request_error", "bad"),
      },
    );
    const codes: string[] = [];
    for (let i = 0; i < 4; i++) {
      const result = await sendAttempt(
        client,
        attemptOf(writingCheck(), SHORT_TIMEOUT_MS),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) codes.push(classifyFailure(result.failure).errorCode);
    }
    expect(codes).toEqual([
      "timeout",
      "connection",
      "server:500",
      "same_error:400",
    ]);
    // 상태 없는 프로그램 오류는 실패로 바꾸지 않고 그대로 던진다
    const bug = new TypeError("bug");
    expect(() => toAttemptFailure(bug)).toThrow(bug);
  });
});

describe("가짜", () => {
  it("가짜: 규칙 차례 · times · bodyIncludes · 요청 기록", async () => {
    const fake = createFakeAnthropic([
      {
        when: { bodyIncludes: "marker-b" },
        reply: { kind: "error", status: 404, body: errorBody(404, "x", "b") },
      },
      {
        when: { model: "claude-haiku-5-5" },
        reply: { kind: "message", body: { n: 1 } },
        times: 1,
      },
      {
        when: { purpose: "writing_check" },
        reply: { kind: "message", body: { n: 2 } },
      },
    ]);
    const post = (body: unknown) =>
      fake.fetch("http://fake/v1/messages", {
        method: "POST",
        headers: { "x-test": "yes" },
        body: JSON.stringify(body),
      });
    // 앞 규칙이 먼저 맞는다
    const b = await post({ model: "claude-haiku-5-5", note: "marker-b" });
    expect(b.status).toBe(404);
    // times 1 을 쓰면 그 규칙을 버린다
    expect(await (await post({ model: "claude-haiku-5-5" })).json()).toEqual({
      n: 1,
    });
    expect((await post({ model: "claude-haiku-5-5" })).status).toBe(501);
    // purpose 는 output_config.format.schema.title
    const purpose = await post({
      model: "m",
      output_config: { format: { schema: { title: "writing_check" } } },
    });
    expect(await purpose.json()).toEqual({ n: 2 });
    // 맞는 규칙이 없으면 501 과 '가짜에 규칙 없음'
    const none = await post({ model: "m" });
    expect(none.status).toBe(501);
    expect(JSON.stringify(await none.json())).toContain("가짜에 규칙 없음");
    // 요청 기록
    expect(fake.requests).toHaveLength(5);
    expect(fake.requests[0]).toMatchObject({
      method: "POST",
      url: "http://fake/v1/messages",
      headers: { "x-test": "yes" },
      body: { model: "claude-haiku-5-5", note: "marker-b" },
    });
    // push · reset
    fake.push({ reply: { kind: "message", body: { n: 3 } } });
    expect(await (await post({})).json()).toEqual({ n: 3 });
    fake.reset();
    expect(fake.requests).toHaveLength(0);
    expect((await post({})).status).toBe(501);
    // network-error 는 fetch 가 TypeError 로 거절한다
    fake.push({ reply: { kind: "network-error" } });
    await expect(post({})).rejects.toBeInstanceOf(TypeError);
  });
});

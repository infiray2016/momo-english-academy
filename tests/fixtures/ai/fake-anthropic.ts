// 가짜 Anthropic(plan-p09a 파일별 값 9). 앱 코드(src/)는 이 파일을 가져오지 않는다.
// 같은 처리기를 두 길로 쓴다: SDK 의 `fetch` 자리에 끼우는 가짜(Vitest)와 node:http 로컬 서버(e2e, ANTHROPIC_BASE_URL).
// 응답 꼴은 문서의 Messages 응답 · 오류 본문을 그대로 따른다(확인한 사실 2 · 4, 위험 11).
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/** 로컬 서버가 듣는 주소(기술 값). */
const LOOPBACK_HOST = "127.0.0.1";
/** 맞는 규칙이 없을 때의 상태(Not Implemented). */
const NO_RULE_STATUS = 501;
const MESSAGES_PATH = "/v1/messages";

export type FakeReply =
  | { kind: "message"; body: unknown; delayMs?: number }
  | {
      kind: "error";
      status: number;
      body: unknown;
      headers?: Record<string, string>;
    }
  | { kind: "network-error" }
  | { kind: "hang" };

export type FakeRule = {
  when?: { purpose?: string; model?: string; bodyIncludes?: string };
  reply: FakeReply;
  /** 이만큼 쓰면 규칙을 버린다. 없으면 계속 쓴다. */
  times?: number;
};

export type FakeRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  bodyText: string;
  body: unknown;
};

type FakeOutcome =
  | {
      kind: "response";
      status: number;
      headers: Record<string, string>;
      body: unknown;
    }
  | { kind: "network-error" };

type RequestInput = {
  method: string;
  url: string;
  headers: Headers;
  bodyText: string;
};

// ── 응답 만들기 ──────────────────────────────────────────────────

export type FakeUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export type FakeIteration = {
  type: "message" | "fallback_message";
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};

export type RefusalCategory =
  | "cyber"
  | "bio"
  | "frontier_llm"
  | "reasoning_extraction"
  | "general_harms"
  | null;

export type FakeFallback = {
  from: string;
  to: string;
  category: RefusalCategory;
};

/** 늘 쓰는 작은 사용량(시험이 값을 보지 않을 때). */
const DEFAULT_USAGE: FakeUsage = { input_tokens: 10, output_tokens: 5 };

let messageSeq = 0;

/** 올바른 Messages 응답 JSON. 내용은 text 블록 하나(`JSON.stringify(json)`), fallback 이 있으면 그 앞에 fallback 블록. */
export function messageBody({
  model,
  json,
  stopReason = "end_turn",
  usage = DEFAULT_USAGE,
  iterations,
  fallback,
  stopDetails,
}: {
  model: string;
  json: unknown;
  stopReason?: string;
  usage?: FakeUsage;
  iterations?: FakeIteration[];
  fallback?: FakeFallback | FakeFallback[];
  stopDetails?: { category: RefusalCategory; explanation?: string | null };
}): Record<string, unknown> {
  messageSeq += 1;
  const fallbacks =
    fallback === undefined
      ? []
      : Array.isArray(fallback)
        ? fallback
        : [fallback];
  return {
    id: `msg_fake_${messageSeq}`,
    type: "message",
    role: "assistant",
    model,
    content: [
      ...fallbacks.map((f) => ({
        type: "fallback",
        from: { model: f.from },
        to: { model: f.to },
        trigger: { type: "refusal", category: f.category },
      })),
      { type: "text", text: JSON.stringify(json), citations: null },
    ],
    stop_reason: stopReason,
    stop_sequence: null,
    stop_details:
      stopDetails === undefined
        ? null
        : {
            type: "refusal",
            category: stopDetails.category,
            explanation: stopDetails.explanation ?? null,
          },
    container: null,
    context_management: null,
    diagnostics: null,
    usage: {
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
      cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
      cache_creation: null,
      server_tool_use: null,
      service_tier: "standard",
      iterations:
        iterations?.map((it) => ({
          cache_creation: null,
          cache_creation_input_tokens: it.cache_creation_input_tokens ?? 0,
          cache_read_input_tokens: it.cache_read_input_tokens ?? 0,
          ...it,
        })) ?? null,
    },
  };
}

/** 문서의 오류 본문 꼴 `{ type: "error", error: { type, message, details? }, request_id }`. */
export function errorBody(
  _status: number,
  type: string,
  message: string,
  details?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    type: "error",
    error: { type, message, ...(details === undefined ? {} : { details }) },
    request_id: "req_fake_error",
  };
}

/** 확인한 사실 4 의 콘솔 한도 오류 본문. workspace = 직접 건 워크스페이스 한도(400), tier = 등급 월 상한(429). */
export function consoleLimitBody(which: "workspace" | "tier"): {
  status: number;
  body: Record<string, unknown>;
} {
  if (which === "workspace") {
    return {
      status: 400,
      body: errorBody(
        400,
        "invalid_request_error",
        "You have reached your specified workspace API usage limits. You will regain access on 2026-11-01 at 00:00 UTC.",
      ),
    };
  }
  return {
    status: 429,
    body: errorBody(
      429,
      "rate_limit_error",
      "You will regain access on 2026-11-01 at 00:00 UTC.",
      { error_code: "enforced_spend_limit_reached" },
    ),
  };
}

// ── 처리기 ───────────────────────────────────────────────────────

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function purposeOf(body: unknown): string | undefined {
  const title = (
    body as {
      output_config?: { format?: { schema?: { title?: unknown } } };
    } | null
  )?.output_config?.format?.schema?.title;
  return typeof title === "string" ? title : undefined;
}

function modelOf(body: unknown): string | undefined {
  const model = (body as { model?: unknown } | null)?.model;
  return typeof model === "string" ? model : undefined;
}

function matches(rule: FakeRule, request: FakeRequest): boolean {
  const when = rule.when;
  if (!when) return true;
  if (when.purpose !== undefined && purposeOf(request.body) !== when.purpose)
    return false;
  if (when.model !== undefined && modelOf(request.body) !== when.model)
    return false;
  if (
    when.bodyIncludes !== undefined &&
    !request.bodyText.includes(when.bodyIncludes)
  )
    return false;
  return true;
}

function abortError(): Error {
  return new DOMException("The operation was aborted.", "AbortError");
}

function wait(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function waitForAbort(signal: AbortSignal | undefined): Promise<never> {
  return new Promise((_resolve, reject) => {
    if (!signal) return; // 끊을 길이 없으면 영영 기다린다(시험이 타임아웃을 건다)
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    signal.addEventListener("abort", () => reject(abortError()), {
      once: true,
    });
  });
}

type FakeCore = {
  requests: FakeRequest[];
  rules: FakeRule[];
  handle(input: RequestInput, signal?: AbortSignal): Promise<FakeOutcome>;
  push(rule: FakeRule): void;
  reset(): void;
};

let requestSeq = 0;

function createCore(initialRules: readonly FakeRule[]): FakeCore {
  const rules: FakeRule[] = initialRules.map((r) => ({ ...r }));
  const requests: FakeRequest[] = [];
  return {
    requests,
    rules,
    push(rule) {
      rules.push({ ...rule });
    },
    reset() {
      rules.length = 0;
      requests.length = 0;
    },
    async handle(input, signal) {
      const headers: Record<string, string> = {};
      input.headers.forEach((value, key) => {
        headers[key] = value;
      });
      const request: FakeRequest = {
        method: input.method,
        url: input.url,
        headers,
        bodyText: input.bodyText,
        body: parseJson(input.bodyText),
      };
      requests.push(request);

      const index = rules.findIndex((rule) => matches(rule, request));
      requestSeq += 1;
      const requestId = `req_fake_${requestSeq}`;
      if (index < 0) {
        return {
          kind: "response",
          status: NO_RULE_STATUS,
          headers: { "request-id": requestId },
          body: errorBody(NO_RULE_STATUS, "api_error", "가짜에 규칙 없음"),
        };
      }
      const rule = rules[index] as FakeRule;
      if (rule.times !== undefined) {
        rule.times -= 1;
        if (rule.times <= 0) rules.splice(index, 1);
      }
      const reply = rule.reply;
      switch (reply.kind) {
        case "message":
          if (reply.delayMs !== undefined) await wait(reply.delayMs, signal);
          return {
            kind: "response",
            status: 200,
            headers: { "request-id": requestId },
            body: reply.body,
          };
        case "error":
          return {
            kind: "response",
            status: reply.status,
            headers: { "request-id": requestId, ...reply.headers },
            body: reply.body,
          };
        case "network-error":
          return { kind: "network-error" };
        case "hang":
          return waitForAbort(signal);
      }
    },
  };
}

// ── fetch 자리 ───────────────────────────────────────────────────

export type FakeAnthropic = {
  fetch: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
  requests: FakeRequest[];
  push(rule: FakeRule): void;
  reset(): void;
};

/** SDK 의 `fetch` 자리에 끼우는 가짜. 네트워크를 쓰지 않는다. */
export function createFakeAnthropic(
  rules: readonly FakeRule[] = [],
): FakeAnthropic {
  const core = createCore(rules);
  return {
    requests: core.requests,
    push: (rule) => core.push(rule),
    reset: () => core.reset(),
    async fetch(input, init) {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const bodyText =
        typeof init?.body === "string"
          ? init.body
          : init?.body == null
            ? ""
            : await new Response(init.body).text();
      const outcome = await core.handle(
        {
          method: init?.method ?? "GET",
          url,
          headers: new Headers(init?.headers),
          bodyText,
        },
        init?.signal ?? undefined,
      );
      if (outcome.kind === "network-error") {
        // undici 가 연결 실패 때 던지는 꼴. SDK 는 이것을 APIConnectionError 로 바꾼다
        throw new TypeError("fetch failed");
      }
      return new Response(JSON.stringify(outcome.body), {
        status: outcome.status,
        headers: { "content-type": "application/json", ...outcome.headers },
      });
    },
  };
}

// ── 로컬 HTTP 서버(e2e) ──────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function headersOf(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  return headers;
}

/** 다른 프로세스(e2e)가 보내는 선언 규칙. JSON 으로만 오므로 함수가 없다. */
function rulesOfControlBody(body: unknown): FakeRule[] {
  const list = Array.isArray(body)
    ? body
    : (body as { rules?: unknown } | null)?.rules;
  if (!Array.isArray(list)) throw new Error("규칙 목록이 아니다");
  return list as FakeRule[];
}

export type FakeAnthropicServer = {
  url: string;
  requests: FakeRequest[];
  close(): Promise<void>;
};

/**
 * 같은 처리기를 node:http 로 띄운다. `POST /v1/messages` 는 처리기,
 * `POST /__fake/rules` · `POST /__fake/reset` · `GET /__fake/requests` · `GET /health` 는 조종용.
 */
export async function startFakeAnthropicServer({
  port = 0,
  rules = [],
}: {
  port?: number;
  rules?: readonly FakeRule[];
} = {}): Promise<FakeAnthropicServer> {
  const core = createCore(rules);
  const sendJson = (
    res: import("node:http").ServerResponse,
    status: number,
    body: unknown,
    headers: Record<string, string> = {},
  ) => {
    res.writeHead(status, { "content-type": "application/json", ...headers });
    res.end(JSON.stringify(body));
  };

  const server: Server = createServer(async (req, res) => {
    const path = new URL(req.url ?? "/", `http://${LOOPBACK_HOST}`).pathname;
    try {
      if (req.method === "GET" && path === "/health") {
        sendJson(res, 200, { ok: true });
        return;
      }
      if (req.method === "GET" && path === "/__fake/requests") {
        sendJson(res, 200, core.requests);
        return;
      }
      if (req.method === "POST" && path === "/__fake/reset") {
        await readBody(req);
        core.reset();
        sendJson(res, 200, { ok: true });
        return;
      }
      if (req.method === "POST" && path === "/__fake/rules") {
        for (const rule of rulesOfControlBody(parseJson(await readBody(req))))
          core.push(rule);
        sendJson(res, 200, { ok: true });
        return;
      }
      if (req.method === "POST" && path === MESSAGES_PATH) {
        const bodyText = await readBody(req);
        // 상대가 연결을 닫으면(SDK 타임아웃) 기다리던 응답을 버린다
        const controller = new AbortController();
        res.on("close", () => controller.abort());
        const outcome = await core
          .handle(
            {
              method: req.method,
              url: `http://${LOOPBACK_HOST}${req.url ?? MESSAGES_PATH}`,
              headers: headersOf(req),
              bodyText,
            },
            controller.signal,
          )
          .catch(() => undefined);
        if (outcome === undefined || res.destroyed) return;
        if (outcome.kind === "network-error") {
          req.socket.destroy();
          return;
        }
        sendJson(res, outcome.status, outcome.body, outcome.headers);
        return;
      }
      sendJson(res, 404, errorBody(404, "not_found_error", "가짜에 없는 길"));
    } catch (error) {
      sendJson(
        res,
        400,
        errorBody(400, "invalid_request_error", String(error)),
      );
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, LOOPBACK_HOST, () => resolve());
  });
  const address = server.address() as AddressInfo;
  return {
    url: `http://${LOOPBACK_HOST}:${address.port}`,
    requests: core.requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

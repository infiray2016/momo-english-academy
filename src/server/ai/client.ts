import "server-only";
// 서버 AI 클라이언트(6.1 · C1 · C63 (5) · NFR-4, plan-p09a 파일별 값 7).
// SDK 클라이언트를 굳힌 선택으로 만들고, 시도 하나를 보내고, SDK 오류를 8절 실패 꼴로 바꾼다.
// 키는 ANTHROPIC_API_KEY 만 쓴다. 다른 자격 증명 · 디버그 기록 · 추적으로 아이 글이 새지 않게 막는다.
// 스트리밍(회화 턴)은 sendStreamingAttempt(plan-p13a 파일별 값 3 — P9a 값 7 이 정해 둔 자리).
import Anthropic, {
  AnthropicError,
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  type ClientOptions,
} from "@anthropic-ai/sdk";
import type {
  BetaMessage,
  MessageCreateParamsNonStreaming,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { type AttemptFailure, httpFailureOf } from "@/core/ai/failure";
import { appClock, type Clock } from "@/server/clock";

/** SDK 기본 주소. Vercel 배포에서는 이 주소로 고정한다(ANTHROPIC_BASE_URL 을 읽지 않음). */
export const ANTHROPIC_API_BASE_URL = "https://api.anthropic.com";
/** SDK 기본 재시도(2회)를 끈다(6.1 · C1). */
const MAX_RETRIES = 0;
/** debug 면 SDK 가 요청 본문(아이 글)을 남긴다(확인한 사실 5). */
const LOG_LEVEL = "warn";

export class AiConfigError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY 가 없습니다");
    this.name = "AiConfigError";
  }
}

export type AiEnv = Readonly<Record<string, string | undefined>>;
type Fetch = NonNullable<ClientOptions["fetch"]>;

/**
 * 굳힌 클라이언트 선택. 키가 비면 AiConfigError(SDK 의 프로필 · 워크로드 연동 자격 증명으로 넘어가지 않게).
 * baseURL 은 Vercel 배포(VERCEL_ENV 있음)에서 기본 주소로 고정하고, 없으면 undefined(SDK 가 ANTHROPIC_BASE_URL 을 읽는다 — 로컬 · e2e 의 가짜 서버).
 * env 에서는 키와 VERCEL_ENV 만 읽는다. VERCEL_ENV 가 없을 때의 주소는 env 인자가 아니라 SDK 가 process.env 에서 읽는다(검토 M-7).
 */
export function clientOptionsOf(
  env: AiEnv,
  { fetch }: { fetch?: Fetch } = {},
): ClientOptions {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) throw new AiConfigError();
  return {
    apiKey,
    authToken: null,
    baseURL: env.VERCEL_ENV ? ANTHROPIC_API_BASE_URL : undefined,
    maxRetries: MAX_RETRIES,
    logLevel: LOG_LEVEL,
    openTelemetry: { traces: false, propagation: false },
    ...(fetch === undefined ? {} : { fetch }),
  };
}

/** 매번 새 클라이언트. fetch 는 시험만 넘긴다. */
export function createAnthropicClient({
  env = process.env,
  fetch,
}: {
  env?: AiEnv;
  fetch?: Fetch;
} = {}): Anthropic {
  return new Anthropic(clientOptionsOf(env, { fetch }));
}

type ClientCache = { signature: string; client: Anthropic };
let cached: ClientCache | undefined;

/** 모듈 안에 하나. 키 · 주소가 바뀌면 새로 만든다(P3a getDb 와 같은 꼴). */
export function getAnthropicClient(): Anthropic {
  const env = process.env;
  const signature = JSON.stringify([
    env.ANTHROPIC_API_KEY ?? "",
    env.VERCEL_ENV ?? "",
    env.ANTHROPIC_BASE_URL ?? "",
  ]);
  if (cached && cached.signature === signature) return cached.client;
  const client = createAnthropicClient({ env });
  cached = { signature, client };
  return client;
}

/** 요청 본문. temperature · top_p · top_k · metadata 는 보내지 않는다(6.1 — 형에서 빼고 시험이 본다). */
export type AttemptBody = Omit<
  MessageCreateParamsNonStreaming,
  "betas" | "stream" | "temperature" | "top_p" | "top_k" | "metadata"
>;

export type AttemptRequest = {
  body: AttemptBody;
  betas: readonly string[];
  timeoutMs: number;
};

export type AttemptResult =
  | {
      ok: true;
      message: BetaMessage;
      requestId: string | null;
      latencyMs: number;
    }
  | {
      ok: false;
      failure: AttemptFailure;
      requestId: string | null;
      latencyMs: number;
    };

/**
 * SDK 오류 → 시도 실패. 타임아웃 · 끊음은 timeout, 그 밖의 연결 오류는 connection,
 * 상태가 있는 API 오류는 httpFailureOf. 그 밖(프로그램 오류)은 그대로 던진다.
 */
export function toAttemptFailure(error: unknown): AttemptFailure {
  if (
    error instanceof APIConnectionTimeoutError ||
    error instanceof APIUserAbortError
  ) {
    return { kind: "timeout" };
  }
  if (error instanceof APIConnectionError) return { kind: "connection" };
  if (error instanceof APIError && typeof error.status === "number") {
    return httpFailureOf(
      error.status,
      error.error,
      error.headers?.has("retry-after") ?? false,
    );
  }
  throw error;
}

/** 시도 하나(베타 create, 비스트리밍). 지연은 넘긴 시계의 차이다. */
export async function sendAttempt(
  client: Anthropic,
  { body, betas, timeoutMs }: AttemptRequest,
  clock: Pick<Clock, "now"> = appClock,
): Promise<AttemptResult> {
  const startedMs = clock.now().getTime();
  const elapsed = () => clock.now().getTime() - startedMs;
  try {
    const message = await client.beta.messages.create(
      {
        ...body,
        ...(betas.length > 0 ? { betas: [...betas] } : {}),
        stream: false,
      },
      { timeout: timeoutMs },
    );
    return {
      ok: true,
      message,
      requestId: message._request_id ?? null,
      latencyMs: elapsed(),
    };
  } catch (error) {
    const failure = toAttemptFailure(error);
    return {
      ok: false,
      failure,
      requestId: error instanceof APIError ? (error.requestID ?? null) : null,
      latencyMs: elapsed(),
    };
  }
}

// ── 스트리밍 시도(회화 턴 · 끝맺음 턴, plan-p13a 파일별 값 3 · 위험 1 · 4) ──

export type StreamingAttemptRequest = AttemptRequest & {
  /** 첫 text 조각을 기다리는 상한(ms). 넘으면 끊는다(SDK timeout 의미에 기대지 않음, 위험 1). */
  firstTextTimeoutMs: number;
};

export type StreamingAttemptResult =
  | {
      ok: true;
      message: BetaMessage;
      requestId: string | null;
      latencyMs: number;
      /** 첫 text 조각까지(ms). text 가 없었으면 null. */
      firstTextMs: number | null;
    }
  | {
      ok: false;
      failure: AttemptFailure;
      requestId: string | null;
      latencyMs: number;
      firstTextMs: number | null;
      /** 끊기기 전까지 받은 text 조각을 이은 글(부르는 쪽이 보낸 문장을 알 때 쓴다). */
      receivedText: string;
      /** 끊긴 때의 메시지 스냅숏(message_start 의 입력 토큰 · 모델이 남아 있다 — 비용 셈, 검토 M2). 시작 전 끊겼으면 null. */
      snapshot: BetaMessage | null;
      /** onText 가 던진 오류(부르는 쪽 결함 · 연결 닫힘). 있으면 실패 갈래는 connection 이고 부르는 쪽이 기록 뒤 다시 던진다(검토 M1). */
      listenerError?: unknown;
    };

/**
 * 스트림 안 SSE `error` 이벤트의 오류 종류 → 그 종류의 HTTP 상태(문서 'Error events' · Errors 표). SDK 는 이 오류를 상태 없는
 * APIError 로 던진다(core/streaming.js — 검토 I1). 표에 없는 종류는 api_error 처럼 서버 오류로 본다.
 */
const STREAM_ERROR_STATUS: Readonly<Record<string, number>> = {
  overloaded_error: 529,
  api_error: 500,
  rate_limit_error: 429,
};
const STREAM_ERROR_STATUS_DEFAULT = 500;

/** 스트림 오류 → 시도 실패. SDK 가 연결이 끊긴 스트림을 AnthropicError 로 감싸므로 그 갈래는 connection 이다. */
function toStreamingFailure(error: unknown): AttemptFailure {
  // 연결 · 끊음 오류도 상태 없는 APIError 의 하위 꼴이므로 먼저 가른다
  if (
    error instanceof APIError &&
    typeof error.status !== "number" &&
    !(error instanceof APIConnectionError) &&
    !(error instanceof APIUserAbortError)
  ) {
    const type = error.type ?? "";
    return httpFailureOf(
      STREAM_ERROR_STATUS[type] ?? STREAM_ERROR_STATUS_DEFAULT,
      error.error,
      false,
    );
  }
  if (
    error instanceof APIConnectionTimeoutError ||
    error instanceof APIUserAbortError ||
    error instanceof APIConnectionError ||
    error instanceof APIError
  )
    return toAttemptFailure(error);
  if (error instanceof AnthropicError || error instanceof TypeError)
    return { kind: "connection" };
  throw error;
}

/**
 * 스트리밍 시도 하나(베타 stream). text 이벤트의 조각만 onText 로 넘긴다 — fallback 블록 뒤 새 text 블록이 시작되어도 조각을 차례로
 * 이으면 JSON 글 하나다(8절 끝 문장, 확인한 사실 1). 첫 text 가 firstTextTimeoutMs 안에 안 오거나 전체가 timeoutMs 를 넘으면
 * stream.abort()(→ timeout). 끝은 finalMessage()(usage · iterations · stop_reason 은 비스트리밍과 같은 꼴).
 */
export async function sendStreamingAttempt(
  client: Anthropic,
  { body, betas, timeoutMs, firstTextTimeoutMs }: StreamingAttemptRequest,
  clock: Pick<Clock, "now"> = appClock,
  { onText }: { onText: (delta: string) => void } = { onText: () => {} },
): Promise<StreamingAttemptResult> {
  const startedMs = clock.now().getTime();
  const elapsed = () => clock.now().getTime() - startedMs;
  const stream = client.beta.messages.stream(
    {
      ...body,
      ...(betas.length > 0 ? { betas: [...betas] } : {}),
    },
    { timeout: timeoutMs },
  );
  let firstTextMs: number | null = null;
  let receivedText = "";
  let callbackError: unknown;
  const firstTimer = setTimeout(() => stream.abort(), firstTextTimeoutMs);
  const totalTimer = setTimeout(() => stream.abort(), timeoutMs);
  stream.on("text", (delta) => {
    if (firstTextMs === null) {
      firstTextMs = elapsed();
      clearTimeout(firstTimer);
    }
    receivedText += delta;
    try {
      onText(delta);
    } catch (error) {
      // 부르는 쪽이 던지면 스트림을 끊고 결과에 실어 돌려준다(그 시도를 기록한 뒤 부르는 쪽이 다시 던진다)
      callbackError = error;
      stream.abort();
    }
  });
  try {
    const message = await stream.finalMessage();
    return {
      ok: true,
      message,
      requestId: stream.request_id ?? null,
      latencyMs: elapsed(),
      firstTextMs,
    };
  } catch (error) {
    const snapshot = stream.currentMessage ?? null;
    if (callbackError !== undefined)
      return {
        ok: false,
        failure: { kind: "connection" },
        requestId: stream.request_id ?? null,
        latencyMs: elapsed(),
        firstTextMs,
        receivedText,
        snapshot,
        listenerError: callbackError,
      };
    return {
      ok: false,
      failure: toStreamingFailure(error),
      requestId:
        error instanceof APIError
          ? (error.requestID ?? null)
          : (stream.request_id ?? null),
      latencyMs: elapsed(),
      firstTextMs,
      receivedText,
      snapshot,
    };
  } finally {
    clearTimeout(firstTimer);
    clearTimeout(totalTimer);
  }
}

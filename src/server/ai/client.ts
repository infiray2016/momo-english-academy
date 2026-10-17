import "server-only";
// 서버 AI 클라이언트(6.1 · C1 · C63 (5) · NFR-4, plan-p09a 파일별 값 7).
// SDK 클라이언트를 굳힌 선택으로 만들고, 시도 하나를 보내고, SDK 오류를 8절 실패 꼴로 바꾼다.
// 키는 ANTHROPIC_API_KEY 만 쓴다. 다른 자격 증명 · 디버그 기록 · 추적으로 아이 글이 새지 않게 막는다.
// 스트리밍(회화 턴)은 1-나가 이 파일에 sendStreamingAttempt 로 더한다.
import Anthropic, {
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

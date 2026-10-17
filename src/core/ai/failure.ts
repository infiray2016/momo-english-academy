// 시도 실패를 8절 갈래로 나누기(8절 상황 표 · 6.1 · C17 · C63 (3), plan-p09a 파일별 값 6).
// SDK · DB · 시계를 가져오지 않는 순수 모듈이다. 1-가는 나눠 기록만 하고, 'AI 쉬는 중' 상태는 1-나가
// countsTowardDown · rest 칸을 읽어 바꾼다(묶음 위험 8).

/** 직접 건 지출 한도 400 의 메시지 머리(조직 · 워크스페이스 한도 둘 다, 확인한 사실 4). */
export const CONSOLE_LIMIT_MESSAGE_PREFIX = "You have reached your specified";
/** 등급 월 상한 429 의 `error.details.error_code`(확인한 사실 4). */
export const ENFORCED_SPEND_LIMIT_CODE = "enforced_spend_limit_reached";

// HTTP 상태(기술 값)
const HTTP_BAD_REQUEST = 400;
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR_MIN = 500;
const ACCOUNT_STATUSES: readonly number[] = [401, 402, 403];

export type AttemptFailure =
  | { kind: "timeout" }
  | { kind: "connection" }
  | {
      kind: "http";
      status: number;
      errorType: string | null;
      message: string;
      errorCode: string | null;
      hasRetryAfter: boolean;
    };

export type HttpFailure = Extract<AttemptFailure, { kind: "http" }>;

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * API 오류 본문 `{ type: "error", error: { type, message, details? }, request_id }` 에서 실패 꼴을 만든다.
 * 본문이 없거나 꼴이 달라도 상태로 나눌 수 있게 빈 칸으로 둔다. 시험 표본(P9c 계약 시험)도 이것으로 읽는다.
 */
export function httpFailureOf(
  status: number,
  body: unknown,
  hasRetryAfter: boolean,
): HttpFailure {
  const error =
    body !== null && typeof body === "object"
      ? (body as { error?: unknown }).error
      : undefined;
  const fields =
    error !== null && typeof error === "object"
      ? (error as { type?: unknown; message?: unknown; details?: unknown })
      : {};
  const details =
    fields.details !== null && typeof fields.details === "object"
      ? (fields.details as { error_code?: unknown })
      : {};
  return {
    kind: "http",
    status,
    errorType: stringOrNull(fields.type),
    message: stringOrNull(fields.message) ?? "",
    errorCode: stringOrNull(details.error_code),
    hasRetryAfter,
  };
}

export type FailureReason =
  | "timeout"
  | "connection"
  | "console_limit"
  | "account"
  | "rate_limit"
  | "server"
  | "same_error";

/** ai_calls.status 가운데 실패 값(5절 열거형 ai_call_status). */
export type FailureCallStatus = "timeout" | "error" | "limit";

/** 1-나가 바로 쉬는 까닭(5절 열거형 ai_rest_reason 의 값). */
export type FailureRest = "console_limit" | "account";

export type FailureClass = {
  reason: FailureReason;
  status: FailureCallStatus;
  /** ai_calls.error_code(`<갈래>` 또는 `<갈래>:<HTTP 상태>`). */
  errorCode: string;
  /** 대화형 호출의 첫 바이트 전 연결 오류만 1회 다시 보낸다(6.1). */
  retryConnection: boolean;
  /** 이어진 실패 수에 더한다(1-나, 8절). */
  countsTowardDown: boolean;
  /** 바로 'AI 쉬는 중'에 드는 까닭(1-나). */
  rest: FailureRest | null;
};

function httpClass(
  reason: Exclude<FailureReason, "timeout" | "connection">,
  status: number,
): FailureClass {
  const limit = reason === "console_limit";
  return {
    reason,
    status: limit ? "limit" : "error",
    errorCode: `${reason}:${status}`,
    retryConnection: false,
    countsTowardDown: reason === "rate_limit" || reason === "server",
    rest: limit ? "console_limit" : reason === "account" ? "account" : null,
  };
}

/** 8절 상황 표대로 나눈다. 정본에 없는 4xx 는 '다시 보내도 같은 오류'(정할 것 바, C63 (5)). */
export function classifyFailure(failure: AttemptFailure): FailureClass {
  if (failure.kind === "timeout") {
    return {
      reason: "timeout",
      status: "timeout",
      errorCode: "timeout",
      retryConnection: false,
      countsTowardDown: true,
      rest: null,
    };
  }
  if (failure.kind === "connection") {
    return {
      reason: "connection",
      status: "error",
      errorCode: "connection",
      retryConnection: true,
      countsTowardDown: true,
      rest: null,
    };
  }
  const { status } = failure;
  if (
    status === HTTP_BAD_REQUEST &&
    failure.message.startsWith(CONSOLE_LIMIT_MESSAGE_PREFIX)
  ) {
    return httpClass("console_limit", status);
  }
  if (
    status === HTTP_TOO_MANY_REQUESTS &&
    failure.errorCode === ENFORCED_SPEND_LIMIT_CODE
  ) {
    return httpClass("console_limit", status);
  }
  if (ACCOUNT_STATUSES.includes(status)) return httpClass("account", status);
  if (status === HTTP_TOO_MANY_REQUESTS) return httpClass("rate_limit", status);
  if (status >= HTTP_SERVER_ERROR_MIN) return httpClass("server", status);
  return httpClass("same_error", status);
}

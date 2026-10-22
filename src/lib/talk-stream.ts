// 회화 턴 요청 · NDJSON 읽기(plan-p13b 파일별 값 10 · 13절 C92 · 7절 네트워크 행 · 재검토 N-1). 화면(회화 틀)이 부른다.
// POST /api/talk/turn(같은 출처 — 접근 쿠키가 함께 감) 본문을 줄 단위로 나눠 갈래마다 넘긴다. 줄을 하나도 받기 전에 끊기거나 끝 줄 없이
// 끊기면 'offline'(화면이 '인터넷이 끊겼어요 …'와 online 때 같은 시도 id 로 다시 — 서버가 저장한 결과를 다시 흘리거나 AI 만 다시).
// stale 은 '자리가 어긋남 · 같은 시도 id 가 아직 진행 중일 수 있음'(M-1)이라 화면은 STALE_RETRY_MS 기다린 뒤 자료를 다시 읽는다.
// 아이 글을 로그에 내지 않는다.
import type { AddLine, TalkLine, TurnNext } from "@/server/conversation";

export const TALK_TURN_PATH = "/api/talk/turn";
/** stale 뒤 자료를 다시 읽기까지 · 다시 읽은 뒤 다시 보내기까지 기다림(ms, 기술 값 — 같은 시도 id 의 첫 요청이 끝날 틈). */
export const STALE_RETRY_MS = 1500;
/**
 * 판이 같은 채(틀이 그대로) stale 뒤 같은 시도 id 로 다시 보내는 수의 상한(기술 값 — 한 번에 기다림 둘(3초)이라 서버 TURN_IN_FLIGHT_MS ·
 * 라우트 maxDuration 60초 안에 들어간다). 그 뒤는 끊김과 같이 '다시 해 보기'.
 */
export const STALE_RESENDS_MAX = 20;
/** 브라우저가 온라인인데 응답이 끊긴 때(서버 · 중간 장치 끊음) 같은 시도 id 로 다시 보내기까지 기다림 · 상한(ms · 수, 기술 값). */
export const OFFLINE_RETRY_MS = STALE_RETRY_MS;
export const OFFLINE_RETRIES_MAX = 3;

export type TalkTurnBody = {
  sessionId: string;
  clientAttemptId: string;
  input: { mode: "speech" | "dont_know"; text?: string; nospeech?: boolean };
  hint: { opened: number; heard: ("two_answers" | "answer_example")[] };
  listenEndSeconds?: number;
  confirmSkipped?: boolean;
  prevPerceivedWaitMs?: number;
};

export type TalkStreamHandlers = {
  onSentence(en: string): void;
  onKo(ko: string): void;
  onAdd(line: Extract<AddLine, { t: "add" }>): void;
  onEnd(next: TurnNext): void;
  onResting(): void;
  onBreak(line: { en: string; ko?: string }): void;
  onClose(line: Extract<TalkLine, { t: "close" }>): void;
  onError(): void;
};

/**
 * 'done' = 끝 줄을 받음 · 'offline' = 끝 줄 없이 끊김(같은 시도 id 로 다시 보낼 차례) · 'stale' = 자리가 어긋남 · 같은 시도 id 가 아직
 * 진행 중일 수 있음(처리기로 넘기지 않음 — 되풀이가 다룸) · 'aborted' = 화면이 끊음(떠남 · 다음 요청).
 */
export type TalkTurnResult = "done" | "offline" | "stale" | "aborted";

function dispatch(
  line: TalkLine,
  h: TalkStreamHandlers,
): "line" | "done" | "stale" {
  switch (line.t) {
    case "s":
      h.onSentence(line.en);
      return "line";
    case "ko":
      h.onKo(line.ko);
      return "line";
    case "add":
      h.onAdd(line);
      return "line";
    case "end":
      h.onEnd(line.next);
      return "done";
    case "resting":
      h.onResting();
      return "done";
    case "break":
      h.onBreak({
        en: line.en,
        ...(line.ko === undefined ? {} : { ko: line.ko }),
      });
      return "done";
    case "close":
      h.onClose(line);
      return "done";
    case "stale":
      return "stale";
    case "error":
      h.onError();
      return "done";
  }
}

function parseLine(text: string): TalkLine | undefined {
  try {
    const value = JSON.parse(text) as { t?: unknown };
    return typeof value?.t === "string" ? (value as TalkLine) : undefined;
  } catch {
    return undefined;
  }
}

/** 아이 말 하나를 보내고 줄을 읽는다. 처리기는 줄이 오는 차례대로 불린다. */
export async function sendTalkTurn(
  body: TalkTurnBody,
  handlers: TalkStreamHandlers,
  {
    signal,
    fetchImpl = fetch,
  }: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<TalkTurnResult> {
  let response: Response;
  try {
    response = await fetchImpl(TALK_TURN_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      ...(signal ? { signal } : {}),
    });
  } catch {
    return signal?.aborted ? "aborted" : "offline";
  }
  if (signal?.aborted) return "aborted";
  if (!response.ok || !response.body) {
    handlers.onError();
    return "done";
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (value) buffer += decoder.decode(value, { stream: true });
      let at = buffer.indexOf("\n");
      while (at >= 0) {
        const text = buffer.slice(0, at).trim();
        buffer = buffer.slice(at + 1);
        if (signal?.aborted) return "aborted";
        const line = text === "" ? undefined : parseLine(text);
        const kind = line ? dispatch(line, handlers) : "line";
        if (kind !== "line") return kind;
        at = buffer.indexOf("\n");
      }
      if (done) break;
    }
  } catch {
    return signal?.aborted ? "aborted" : "offline";
  }
  if (signal?.aborted) return "aborted";
  const rest = buffer.trim();
  const last = rest === "" ? undefined : parseLine(rest);
  const kind = last ? dispatch(last, handlers) : "line";
  return kind === "line" ? "offline" : kind;
}

export type RetryDeps = {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  /** 브라우저가 온라인인가(navigator.onLine). */
  isOnline?: () => boolean;
  /** 기다림(끊음 신호면 바로 끝나도 된다). */
  wait?: (ms: number, signal?: AbortSignal) => Promise<void>;
  /** 쪽 자료를 다시 읽는다(router.refresh — 판이 바뀌면 틀이 새로 그려지며 이 요청을 끊는다). */
  refresh: () => void;
  /** 보내기마다(0 부터) — 화면이 말풍선을 비운다(다시 흘림이 같은 줄을 다시 보냄). */
  onAttempt?: (attempt: number) => void;
};

function waitFor(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * 아이 말 하나를 보내고 끊김 · stale 을 되풀이로 다룬다(7절 네트워크 행 · 재검토 N-1 · 코드 검토 I-1). 같은 시도 id 그대로다.
 * 끊김: 브라우저가 온라인이면 OFFLINE_RETRY_MS 기다렸다 다시(OFFLINE_RETRIES_MAX 번까지), 오프라인이면 'offline'(화면이 online 을 기다림).
 * stale: 바로 되풀이하지 않고 STALE_RETRY_MS 기다렸다 자료를 다시 읽고(판이 바뀌면 틀이 새로 그려지며 끊음), 또 기다렸다 같은 시도 id 로
 * 다시 보낸다(STALE_RESENDS_MAX 번까지 — 서버는 첫 요청이 끝났으면 다시 흘리고, 아직이면 stale, TURN_IN_FLIGHT_MS 뒤면 AI 를 부름).
 */
export async function sendTalkTurnRetrying(
  body: TalkTurnBody,
  handlers: TalkStreamHandlers,
  deps: RetryDeps,
): Promise<"done" | "offline" | "aborted"> {
  const { signal, isOnline = () => navigator.onLine, wait = waitFor } = deps;
  let offline = 0;
  let stale = 0;
  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) return "aborted";
    deps.onAttempt?.(attempt);
    const result = await sendTalkTurn(body, handlers, {
      ...(signal ? { signal } : {}),
      ...(deps.fetchImpl ? { fetchImpl: deps.fetchImpl } : {}),
    });
    if (result === "done" || result === "aborted") return result;
    if (result === "offline") {
      if (!isOnline() || offline >= OFFLINE_RETRIES_MAX) return "offline";
      offline += 1;
      await wait(OFFLINE_RETRY_MS, signal);
      continue;
    }
    if (stale >= STALE_RESENDS_MAX) return "offline";
    stale += 1;
    await wait(STALE_RETRY_MS, signal);
    if (signal?.aborted) return "aborted";
    deps.refresh();
    if (signal?.aborted) return "aborted";
    await wait(STALE_RETRY_MS, signal);
  }
}

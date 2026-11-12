// 회화 턴 요청 · NDJSON 읽기(plan-p13b 파일별 값 10 · 13절 C92 · 7절 네트워크 행 · 재검토 N-1). 화면(회화 틀)이 부른다.
// POST /api/talk/turn(같은 출처 — 접근 쿠키가 함께 감) 본문을 줄 단위로 나눠 갈래마다 넘긴다. 줄을 하나도 받기 전에 끊기거나 끝 줄 없이
// 끊기면 'offline'(화면이 '인터넷이 끊겼어요 …'와 online 때 같은 시도 id 로 다시 — 서버가 저장한 결과를 다시 흘리거나 AI 만 다시).
// stale 은 '자리가 어긋남 · 같은 시도 id 가 아직 진행 중일 수 있음'(M-1)이라 화면은 STALE_RETRY_MS 기다린 뒤 자료를 다시 읽는다.
// 아이 글을 로그에 내지 않는다.
// 줄은 새 꼴 카드 세션의 줄(TalkLessonLine — 1~3단계 소리 줄 sound · 끝 줄 lesson 칸, 회화 plan 묶음 8 · 11)이다(옛 꼴 이름은 묶음 12 가 지움).
import type { ClientListen } from "@/core/conversation/client-listen";
import type {
  TalkLessonLine,
  TalkLessonNext,
} from "@/server/conversation/lesson-turn";

export const TALK_TURN_PATH = "/api/talk/turn";
/** stale 뒤 자료를 다시 읽기까지 · 다시 읽은 뒤 다시 보내기까지 기다림(ms, 기술 값 — 같은 시도 id 의 첫 요청이 끝날 틈). */
export const STALE_RETRY_MS = 1500;
/**
 * 판이 같은 채(틀이 그대로) stale 뒤 같은 시도 id 로 다시 보내는 수의 상한(기술 값 — 한 번에 기다림 둘(3초)이라 서버 TURN_IN_FLIGHT_MS ·
 * 라우트 maxDuration 60초 안에 들어간다). 그 뒤는 끊김과 같이 '다시 해 볼래요'.
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
  /** 그 턴의 듣기 사건 요약(C149 — 글 · 소리 없음). */
  clientListen?: ClientListen;
};

/**
 * 아이 말 없는 턴 요청(회화 Claude 주도 묶음 S3 — 서버 turn.ts parseTalkTurnRequest 의 둘째 꼴): 대화 토막의 첫 차례(start) · '더 이야기하기'
 * 뒤 차례(more). 보내기 · 읽기 · 되풀이는 아이 말 요청과 같다.
 */
export type TalkLeadOpenBody = { sessionId: string; lead: "start" | "more" };

/**
 * 'done' = 끝 줄을 받음 · 'offline' = 끝 줄 없이 끊김(같은 시도 id 로 다시 보낼 차례) · 'stale' = 자리가 어긋남 · 같은 시도 id 가 아직
 * 진행 중일 수 있음(처리기로 넘기지 않음 — 되풀이가 다룸) · 'aborted' = 화면이 끊음(떠남 · 다음 요청).
 */
export type TalkTurnResult = "done" | "offline" | "stale" | "aborted";

function parseLine<L extends { t: string }>(text: string): L | undefined {
  try {
    const value = JSON.parse(text) as { t?: unknown };
    return typeof value?.t === "string" ? (value as L) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 줄 읽기 몸통: POST 하고 NDJSON 줄마다 갈래(lineOf)를 부른다. 갈래가 'done' · 'stale' 이면 거기서 끝난다. HTTP 오류는
 * onHttpError 뒤 'done', 끝 줄 없이 끊기면 'offline', 화면이 끊으면 'aborted'.
 */
async function readTurnLines<L extends { t: string }>(
  body: TalkTurnBody | TalkLeadOpenBody,
  lineOf: (line: L) => "line" | "done" | "stale",
  onHttpError: () => void,
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
    onHttpError();
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
        const line = text === "" ? undefined : parseLine<L>(text);
        const kind = line ? lineOf(line) : "line";
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
  const last = rest === "" ? undefined : parseLine<L>(rest);
  const kind = last ? lineOf(last) : "line";
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

/** 되풀이 몸통(sendTalkLessonTurnRetrying 의 규칙, 보내기 한 번은 send). */
async function retryTurnLines(
  send: (opts: {
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  }) => Promise<TalkTurnResult>,
  deps: RetryDeps,
): Promise<"done" | "offline" | "aborted"> {
  const { signal, isOnline = () => navigator.onLine, wait = waitFor } = deps;
  let offline = 0;
  let stale = 0;
  for (let attempt = 0; ; attempt++) {
    if (signal?.aborted) return "aborted";
    deps.onAttempt?.(attempt);
    const result = await send({
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

export type TalkLessonStreamHandlers = {
  onSentence(en: string): void;
  onKo(ko: string): void;
  /** 앱이 붙인 화면 글(카드 질문 · 마무리 물음 · 4단계부터 답 글). */
  onAdd(line: Extract<TalkLessonLine, { t: "add" }>): void;
  /** 1~3단계 소리 줄(따라 할 말 · 선택지 · 받침의 답 — 읽어 주기 재료이고 글로 보이지 않는다, T2). */
  onSound(line: Extract<TalkLessonLine, { t: "sound" }>): void;
  onEnd(next: TalkLessonNext): void;
  onResting(): void;
  onBreak(line: { en: string; ko?: string }): void;
  onClose(line: Extract<TalkLessonLine, { t: "close" }>): void;
  onError(): void;
};

function dispatchLesson(
  line: TalkLessonLine,
  h: TalkLessonStreamHandlers,
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
    case "sound":
      h.onSound(line);
      return "line";
    case "end":
      h.onEnd(line.lesson);
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
    default:
      // 모르는 줄은 건너뛴다(뒤 판이 더한 줄 — 끝 줄이 오면 끝난다)
      return "line";
  }
}

/** 아이 말 하나를 보내고 줄을 읽는다. 처리기는 줄이 오는 차례대로 불린다. */
export async function sendTalkLessonTurn(
  body: TalkTurnBody | TalkLeadOpenBody,
  handlers: TalkLessonStreamHandlers,
  opts: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<TalkTurnResult> {
  return readTurnLines(
    body,
    (line: TalkLessonLine) => dispatchLesson(line, handlers),
    () => handlers.onError(),
    opts,
  );
}

/**
 * 아이 말 하나를 보내고 끊김 · stale 을 되풀이로 다룬다(7절 네트워크 행 · 재검토 N-1 · 코드 검토 I-1). 같은 시도 id 그대로다.
 * 끊김: 브라우저가 온라인이면 OFFLINE_RETRY_MS 기다렸다 다시(OFFLINE_RETRIES_MAX 번까지), 오프라인이면 'offline'(화면이 online 을 기다림).
 * stale: 바로 되풀이하지 않고 STALE_RETRY_MS 기다렸다 자료를 다시 읽고(판이 바뀌면 틀이 새로 그려지며 끊음), 또 기다렸다 같은 시도 id 로
 * 다시 보낸다(STALE_RESENDS_MAX 번까지 — 서버는 첫 요청이 끝났으면 다시 흘리고, 아직이면 stale, TURN_IN_FLIGHT_MS 뒤면 AI 를 부름).
 */
export async function sendTalkLessonTurnRetrying(
  body: TalkTurnBody | TalkLeadOpenBody,
  handlers: TalkLessonStreamHandlers,
  deps: RetryDeps,
): Promise<"done" | "offline" | "aborted"> {
  return retryTurnLines(
    (opts) => sendTalkLessonTurn(body, handlers, opts),
    deps,
  );
}

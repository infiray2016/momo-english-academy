// 회화 턴 요청 · NDJSON 읽기(plan-p13b 파일별 값 10 · 13절 C92 · 7절 네트워크 행 · 재검토 N-1). 화면(회화 틀)이 부른다.
// POST /api/talk/turn(같은 출처 — 접근 쿠키가 함께 감) 본문을 줄 단위로 나눠 갈래마다 넘긴다. 줄을 하나도 받기 전에 끊기거나 끝 줄 없이
// 끊기면 'offline'(화면이 '인터넷이 끊겼어요 …'와 online 때 같은 시도 id 로 다시 — 서버가 저장한 결과를 다시 흘리거나 AI 만 다시).
// stale 은 '자리가 어긋남 · 같은 시도 id 가 아직 진행 중일 수 있음'(M-1)이라 화면은 STALE_RETRY_MS 기다린 뒤 자료를 다시 읽는다.
// 아이 글을 로그에 내지 않는다.
// 줄은 새 꼴 카드 세션의 줄(TalkLessonLine — 1~3단계 소리 줄 sound · 끝 줄 lesson 칸, 회화 plan 묶음 8 · 11)이다(옛 꼴 이름은 묶음 12 가 지움).
import type {
  ChatHintReply,
  ChatHintTierView,
} from "@/core/conversation/chat-hints";
import type { ChatEndSignal } from "@/core/conversation/chat-turn-core";
import type { ChatOpen } from "@/core/conversation/chat-turn-plan";
import type { ClientListen } from "@/core/conversation/client-listen";
import type { RecognizerInfo } from "@/lib/speech/types";
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
  /**
   * 인식기 정보(이야기 방식 spec 설계 11 — 끝 줄이 후보 수를 실은 차례의 말 입력에만). 서버 turn.ts 의 recognizer 칸(묶음 P1 chatRecognizerSchemaOf 꼴).
   * 다른 후보 글은 이 본문에만 싣고 화면 · 듣기 요약에는 남기지 않는다.
   */
  recognizer?: TalkRecognizerBody;
};

/** 턴 요청의 인식기 칸(서버 turn.ts recognizer — 확신 정도 · 다른 후보 · 중간 결과만). */
export type TalkRecognizerBody = {
  confidence?: number | null;
  alternative?: string;
  interimOnly?: boolean;
};

/**
 * 아이 말 없는 턴 요청(회화 Claude 주도 묶음 S3 — 서버 turn.ts parseTalkTurnRequest 의 둘째 꼴): 대화 토막의 첫 차례(start) · '더 이야기하기'
 * 뒤 차례(more), 이야기 방식의 조용함(quiet) · 짧은 준비 뒤 돌아옴(back — 보완 4 (5)). 값 목록은 서버와 같은 chat-turn-plan CHAT_OPENS 다.
 * 보내기 · 읽기 · 되풀이는 아이 말 요청과 같다.
 */
export type TalkLeadOpenBody = { sessionId: string; lead: ChatOpen };

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
  /**
   * 끝 줄. chat 은 이야기 방식 선생님 차례의 끝 줄 신호(chatEndSignalOfLine — 칸이 없으면 undefined, 화면은 방식을 읽지 않고 이 값만 따른다).
   */
  onEnd(next: TalkLessonNext, chat?: ChatEndSignal): void;
  onResting(): void;
  onBreak(line: { en: string; ko?: string }): void;
  onClose(line: Extract<TalkLessonLine, { t: "close" }>): void;
  onError(): void;
};

// ── 이야기 방식(회화 대화 구조 R plan 묶음 W): 서버가 주는 꼴을 읽는 자리를 여기에 모은다 ──

/** 0 이상 유한한 수인가(초 값). */
function seconds(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * 끝 줄의 chat 칸 → 신호(순수, 묶음 P3 ChatEndSignal 규격 — 싣지 않는 칸은 칸 자체가 없다). 칸이 없으면(기존 두 방식) undefined, 있으면 아는 네 칸만
 * 꼴을 보아 옮기고(기다림 시간 · 설명 기다림은 0 이상 초, 힌트 표지는 참, 후보 수는 1 이상 정수) 꼴이 다른 칸은 없는 것으로 둔다. 화면은 칸이 없는
 * 기능을 그 차례에 두지 않는다(기본값을 지어내지 않음). 설명 기다림은 값이 0 이어도 칸이 있다.
 */
export function chatEndSignalOfLine(chat: unknown): ChatEndSignal | undefined {
  if (typeof chat !== "object" || chat === null) return undefined;
  const c = chat as Record<string, unknown>;
  const out: ChatEndSignal = {};
  if (seconds(c.quietSeconds)) out.quietSeconds = c.quietSeconds;
  if (c.hint === true) out.hint = true;
  if (seconds(c.explainWait)) out.explainWait = c.explainWait;
  if (
    typeof c.alternatives === "number" &&
    Number.isInteger(c.alternatives) &&
    c.alternatives >= 1
  )
    out.alternatives = c.alternatives;
  return out;
}

const HINT_KINDS: readonly string[] = ["ko", "frame", "sentence"];

function hintTierOf(raw: unknown): ChatHintTierView | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const t = raw as Record<string, unknown>;
  if (typeof t.kind !== "string" || !HINT_KINDS.includes(t.kind))
    return undefined;
  return {
    kind: t.kind as ChatHintTierView["kind"],
    ...(t.listen === true ? { listen: true as const } : {}),
  };
}

/**
 * 힌트 받는 서버 액션(revealTalkLessonHint)의 이야기 방식 응답 읽기(순수, 묶음 P5 ChatHintReply). 성공은 단 목록(하나 이상) · 청한 단 · 그 글이
 * 모두 꼴에 맞을 때만이고, 실패는 서버가 준 다시 받기 여부 그대로다. 옛 꼴({ ok: false } · { ok: true, text })이나 꼴이 다른 응답은 다시 받기 없는
 * 실패, 액션이 던져 응답이 없으면(undefined) 다시 받기가 있는 실패다(다시 받기 횟수는 서버의 표지 행이 지킨다).
 */
export function chatHintReplyOfRaw(raw: unknown): ChatHintReply {
  if (raw === undefined) return { ok: false, retry: true };
  if (typeof raw !== "object" || raw === null)
    return { ok: false, retry: false };
  const r = raw as Record<string, unknown>;
  if (r.ok === false) return { ok: false, retry: r.retry === true };
  if (
    r.ok !== true ||
    !Array.isArray(r.tiers) ||
    typeof r.tier !== "number" ||
    !Number.isInteger(r.tier) ||
    typeof r.text !== "string" ||
    r.text.trim() === ""
  )
    return { ok: false, retry: false };
  const tiers = r.tiers.map(hintTierOf);
  if (tiers.length === 0 || tiers.some((t) => t === undefined))
    return { ok: false, retry: false };
  if (r.tier < 0 || r.tier >= tiers.length) return { ok: false, retry: false };
  return {
    ok: true,
    tiers: tiers as ChatHintTierView[],
    tier: r.tier,
    text: r.text,
  };
}

/** 막힌 뒤 설명 응답 읽기(순수, 묶음 P5 chatExplainReplyOf): 글이 있을 때만 그 글, 그 밖은 undefined(화면은 문구 없이 차례를 잇는다). */
export function chatExplainOfRaw(raw: unknown): string | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const r = raw as Record<string, unknown>;
  return r.ok === true && typeof r.text === "string" && r.text.trim() !== ""
    ? r.text
    : undefined;
}

/**
 * 듣기의 인식기 정보 → 턴 요청의 인식기 칸(순수, spec 설계 11 '싣는 곳'): 확신 정도(있을 때만) · 다른 후보 글(빈 글이 아닐 때만) · 중간 결과만인가.
 * 후보 수와 섞임 표지는 듣기 요약(client_listen)의 몫이라 싣지 않는다. 인식기 정보가 없는 듣기(후보 수를 넘기지 않은 차례)는 칸이 없다.
 */
export function chatRecognizerBodyOf(
  info: RecognizerInfo | undefined,
): TalkRecognizerBody | undefined {
  if (info === undefined) return undefined;
  return {
    ...(info.confidence === undefined ? {} : { confidence: info.confidence }),
    ...(info.alternative !== undefined && info.alternative.trim() !== ""
      ? { alternative: info.alternative }
      : {}),
    interimOnly: info.interim,
  };
}

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
      h.onEnd(line.lesson, chatEndSignalOfLine(line.chat));
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

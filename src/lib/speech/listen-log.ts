// 회화 듣기 사건 기록(13절 C149 · 분석 보고 task-talk-speech-analysis 4.1). 음성 접점(browser.ts)의 기록 사건(onTrace)을 받아
// 듣기마다 요약(o · by · d · as · snd · fr · tc, 11-06 에 pe · ss · rs · ts · te · hid — 분석 task-ipad-listen-analysis 6.2)으로 줄인다. 받을 때 글 · 인식 글 · 오류 메시지를 버리고 시각 · 종류만 남긴다(녹음 금지 ·
// 이름 가림). window 를 읽지 않는다(단위 시험이 돈다).
import {
  CLIENT_LISTEN_MS_MAX,
  CLIENT_LISTENS_MAX,
  type ClientListenEntry,
  LISTEN_RESULT_PATTERN,
} from "@/core/conversation/client-listen";
import type { EndedBy, ListenOutcome } from "@/core/speech/listen";
import type { SpeechTraceEntry } from "./types";

/** 남겨 두는 사건 수 상한(기술 값 — 오래된 것부터 버림. 한 기록 사이의 듣기 CLIENT_LISTENS_MAX 개를 넉넉히 덮는다). */
const KEPT_MAX = 2000;

type SynthState = NonNullable<ClientListenEntry["ts"]>;

/**
 * ms 값을 서버 꼴(0 ~ CLIENT_LISTEN_MS_MAX)에 맞춘다(순수). 10분 넘게 쉰 뒤의 틈(pe · tc)이 턴 요청 · 따라 말하기 저장을 통째로 거절시키지
 * 않게 자르고, 걸린 값은 상한 그대로 남겨 '상한 이상'임을 안다(검토 rev-mic-1 I-1).
 */
export function clampListenMs(ms: number): number {
  return Math.min(CLIENT_LISTEN_MS_MAX, Math.max(0, Math.round(ms)));
}

/** 글을 버린 사건. */
type Kept =
  | { at: number; k: "begin"; listen: number; capMs: number | undefined }
  | { at: number; k: "start-call"; listen: number; synth?: SynthState }
  | { at: number; k: "audio"; listen: number }
  | { at: number; k: "sound"; listen: number }
  | { at: number; k: "result"; listen: number }
  /** 인식 객체 end(pe — 앞 객체 end 뒤 경과). */
  | { at: number; k: "rec-end"; listen: number }
  | { at: number; k: "button"; listen: number }
  | { at: number; k: "done"; listen: number; o: string; by?: EndedBy }
  | { at: number; k: "speak" }
  | { at: number; k: "speak-start" }
  /** 읽기 끝 · 오류 알림. why 는 끝 알림 · 끊김(interrupted · canceled) · 그 밖 오류(te). */
  | { at: number; k: "speak-end"; why: "end" | "cancel" | "error" }
  /** 음성 접점의 감시 상한이 끝낸 발화(C166 R1 — 시작 알림이 없었어도 그때 읽기가 끝난 것으로 본다). */
  | { at: number; k: "speak-timeout" }
  /** 쪽이 숨음(hid). */
  | { at: number; k: "hidden" };

/** 읽기를 끊은 오류 코드(Web Speech — 앱 · 다른 읽기 · 듣기가 끊음). */
const SPEAK_CANCEL_CODES: ReadonlySet<string> = new Set([
  "interrupted",
  "canceled",
]);

function resultKindOf(outcome: ListenOutcome): string {
  switch (outcome.kind) {
    case "result":
    case "no-result":
    case "stalled":
    case "deaf":
      return outcome.kind;
    case "interrupted":
      return `interrupted:${outcome.reason}`;
    case "error": {
      const o = `error:${outcome.code}`;
      return LISTEN_RESULT_PATTERN.test(o) ? o : "error:other";
    }
  }
}

/** 기록 사건 하나를 글 없는 사건으로(요약에 쓰지 않는 것은 버림). */
function keptOf(entry: SpeechTraceEntry): Kept | undefined {
  const { at } = entry;
  switch (entry.kind) {
    case "listen-begin":
      return { at, k: "begin", listen: entry.listen, capMs: entry.rule.capMs };
    case "recognizer-call":
      return entry.call === "start"
        ? {
            at,
            k: "start-call",
            listen: entry.listen,
            ...(entry.synth ? { synth: entry.synth } : {}),
          }
        : undefined;
    case "recognizer-event": {
      const type = entry.event.type;
      if (type === "audiostart")
        return { at, k: "audio", listen: entry.listen };
      if (type === "soundstart" || type === "speechstart")
        return { at, k: "sound", listen: entry.listen };
      if (type === "result") return { at, k: "result", listen: entry.listen };
      if (type === "end") return { at, k: "rec-end", listen: entry.listen };
      return undefined;
    }
    case "button":
      return { at, k: "button", listen: entry.listen };
    case "listen-done":
      return {
        at,
        k: "done",
        listen: entry.listen,
        o: resultKindOf(entry.outcome),
        ...(entry.outcome.kind === "result"
          ? { by: entry.outcome.endedBy }
          : {}),
      };
    case "speak":
      // 읽어 주기 제약을 푸는 소리 없는 글(unlockFromGesture)은 읽기로 보지 않는다
      return entry.text.trim() === "" ? undefined : { at, k: "speak" };
    case "speak-event":
      if (entry.type === "start") return { at, k: "speak-start" };
      if (entry.type === "timeout") return { at, k: "speak-timeout" };
      if (entry.type === "end") return { at, k: "speak-end", why: "end" };
      return {
        at,
        k: "speak-end",
        why:
          entry.code !== undefined && SPEAK_CANCEL_CODES.has(entry.code)
            ? "cancel"
            : "error",
      };
    case "page-hidden":
      return { at, k: "hidden" };
    default:
      return undefined;
  }
}

/**
 * 듣기 직전 읽어 주기와의 관계(순수): 시작 앞 마지막 읽기가 시작한 뒤 끝 · 오류 알림이 시작 앞에 왔으면 그 뒤 ms, 아니면 읽는 중 끊음('cut').
 * 감시 상한이 끝낸 발화(speak-timeout)는 시작 알림이 없었어도 그때 끝난 것으로 본다 — 감시가 살린 턴을 '읽는 중 끊음'으로 세지 않게(검토 A
 * M-2). 앞에 읽기가 없으면 없음.
 */
function speakRelationOf(
  kept: readonly Kept[],
  beginAt: number,
): ClientListenEntry["tc"] {
  const speakAt = lastSpeakAt(kept, beginAt);
  if (speakAt === undefined) return undefined;
  let startedAt: number | undefined;
  let endedAt: number | undefined;
  for (const e of kept) {
    if (e.at < speakAt || e.at > beginAt) continue;
    if (e.k === "speak-start" && startedAt === undefined) startedAt = e.at;
    if (e.k === "speak-end" && startedAt !== undefined && e.at >= startedAt)
      endedAt = e.at;
    if (e.k === "speak-timeout") endedAt = e.at;
  }
  return endedAt === undefined ? "cut" : clampListenMs(beginAt - endedAt);
}

/** 시작 앞 마지막 읽기(at), 없으면 없음. */
function lastSpeakAt(kept: readonly Kept[], beginAt: number) {
  let speakAt: number | undefined;
  for (const e of kept) if (e.k === "speak" && e.at <= beginAt) speakAt = e.at;
  return speakAt;
}

/**
 * 듣기 앞 마지막 읽기의 끝 까닭(te, 순수): 그 읽기 뒤 듣기 끝까지 처음 온 끝 · 오류 · 감시 알림. 끊긴 읽기의 늦은 알림은 듣기 시작 뒤에 오므로
 * 듣기 끝까지 본다. 앞에 읽기가 없거나 알림이 없으면 없음.
 */
function speakEndOf(
  kept: readonly Kept[],
  beginAt: number,
  doneAt: number,
): ClientListenEntry["te"] {
  const speakAt = lastSpeakAt(kept, beginAt);
  if (speakAt === undefined) return undefined;
  for (const e of kept) {
    if (e.at < speakAt || e.at > doneAt) continue;
    if (e.k === "speak-timeout") return "timeout";
    if (e.k === "speak-end") return e.why;
  }
  return undefined;
}

/** 앞 듣기(없으면 기록 처음) 끝 뒤 이 듣기 시작 앞에 쪽이 숨었는가(hid, 순수). */
function hiddenBefore(
  kept: readonly Kept[],
  begin: Extract<Kept, { k: "begin" }>,
): boolean {
  let prevDoneAt = Number.NEGATIVE_INFINITY;
  for (const e of kept)
    if (e.k === "done" && e.listen < begin.listen && e.at <= begin.at)
      prevDoneAt = Math.max(prevDoneAt, e.at);
  return kept.some(
    (e) => e.k === "hidden" && e.at >= prevDoneAt && e.at <= begin.at,
  );
}

/** 이 시각 앞 마지막 인식 객체 end(어느 듣기든 — pe, 순수). */
function recognizerEndBefore(
  kept: readonly Kept[],
  at: number,
): number | undefined {
  let last: number | undefined;
  for (const e of kept) if (e.k === "rec-end" && e.at <= at) last = e.at;
  return last;
}

/** 끝난 듣기 하나의 요약(순수). */
function summaryOf(
  kept: readonly Kept[],
  begin: Extract<Kept, { k: "begin" }>,
  done: Extract<Kept, { k: "done" }>,
): ClientListenEntry {
  const mine = kept.filter((e) => "listen" in e && e.listen === begin.listen);
  const first = (k: Kept["k"]) => mine.find((e) => e.k === k)?.at;
  const d = clampListenMs(done.at - begin.at);
  const startCalls = mine.filter(
    (e): e is Extract<Kept, { k: "start-call" }> => e.k === "start-call",
  );
  const startAt = startCalls[0]?.at;
  const audioAt = first("audio");
  const soundAt = first("sound");
  const resultAt = first("result");
  const pressed = first("button") !== undefined;
  let by: ClientListenEntry["by"];
  if (done.by !== undefined) by = done.by;
  else if (done.o === "no-result" || done.o.startsWith("error:"))
    by = pressed
      ? "button"
      : begin.capMs !== undefined && d >= begin.capMs
        ? "cap"
        : "browser";
  const tc = speakRelationOf(kept, begin.at);
  const te = speakEndOf(kept, begin.at, done.at);
  const prevEndAt =
    startAt === undefined ? undefined : recognizerEndBefore(kept, startAt);
  const synth = startCalls[0]?.synth;
  return {
    o: done.o,
    ...(by ? { by } : {}),
    d,
    ...(startAt !== undefined && audioAt !== undefined && audioAt >= startAt
      ? { as: clampListenMs(audioAt - startAt) }
      : {}),
    snd: first("sound") !== undefined,
    ...(resultAt !== undefined
      ? { fr: clampListenMs(resultAt - begin.at) }
      : {}),
    ...(tc === undefined ? {} : { tc }),
    ...(startAt !== undefined && prevEndAt !== undefined
      ? { pe: clampListenMs(startAt - prevEndAt) }
      : {}),
    ...(startAt !== undefined && soundAt !== undefined && soundAt >= startAt
      ? { ss: clampListenMs(soundAt - startAt) }
      : {}),
    ...(startCalls.length > 0 ? { rs: startCalls.length - 1 } : {}),
    ...(synth ? { ts: synth } : {}),
    ...(te === undefined ? {} : { te }),
    hid: hiddenBefore(kept, begin),
  };
}

export type ListenLog = {
  /** 음성 접점의 기록 사건 하나(createBrowserSpeech 의 onTrace). */
  record(entry: SpeechTraceEntry): void;
  /** 지난번 꺼낸 뒤 끝난 듣기의 요약을 차례대로 꺼낸다(최근 CLIENT_LISTENS_MAX 개). */
  take(): ClientListenEntry[];
};

/** 듣기 사건 기록 하나(회화 틀이 세션 동안 하나). */
export function createListenLog(): ListenLog {
  let kept: Kept[] = [];
  /** 이 번호까지의 듣기는 꺼냈다. */
  let takenThrough = 0;
  return {
    record(entry) {
      const k = keptOf(entry);
      if (k === undefined) return;
      kept.push(k);
      if (kept.length > KEPT_MAX) kept = kept.slice(kept.length - KEPT_MAX);
    },
    take() {
      const out: ClientListenEntry[] = [];
      for (const e of kept) {
        if (e.k !== "done" || e.listen <= takenThrough) continue;
        const begin = kept.find(
          (b): b is Extract<Kept, { k: "begin" }> =>
            b.k === "begin" && b.listen === e.listen,
        );
        if (begin) out.push(summaryOf(kept, begin, e));
        takenThrough = Math.max(takenThrough, e.listen);
      }
      return out.slice(-CLIENT_LISTENS_MAX);
    },
  };
}

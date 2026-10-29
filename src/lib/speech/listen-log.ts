// 회화 듣기 사건 기록(13절 C149 · 분석 보고 task-talk-speech-analysis 4.1). 음성 접점(browser.ts)의 기록 사건(onTrace)을 받아
// 듣기마다 요약(o · by · d · as · snd · fr · tc)으로 줄인다. 받을 때 글 · 인식 글 · 오류 메시지를 버리고 시각 · 종류만 남긴다(녹음 금지 ·
// 이름 가림). window 를 읽지 않는다(단위 시험이 돈다).
import {
  CLIENT_LISTENS_MAX,
  type ClientListenEntry,
  LISTEN_RESULT_PATTERN,
} from "@/core/conversation/client-listen";
import type { EndedBy, ListenOutcome } from "@/core/speech/listen";
import type { SpeechTraceEntry } from "./types";

/** 남겨 두는 사건 수 상한(기술 값 — 오래된 것부터 버림. 한 기록 사이의 듣기 CLIENT_LISTENS_MAX 개를 넉넉히 덮는다). */
const KEPT_MAX = 2000;

/** 글을 버린 사건. */
type Kept =
  | { at: number; k: "begin"; listen: number; capMs: number | undefined }
  | { at: number; k: "start-call"; listen: number }
  | { at: number; k: "audio"; listen: number }
  | { at: number; k: "sound"; listen: number }
  | { at: number; k: "result"; listen: number }
  | { at: number; k: "button"; listen: number }
  | { at: number; k: "done"; listen: number; o: string; by?: EndedBy }
  | { at: number; k: "speak" }
  | { at: number; k: "speak-start" }
  | { at: number; k: "speak-end" };

function resultKindOf(outcome: ListenOutcome): string {
  switch (outcome.kind) {
    case "result":
    case "no-result":
    case "stalled":
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
        ? { at, k: "start-call", listen: entry.listen }
        : undefined;
    case "recognizer-event": {
      const type = entry.event.type;
      if (type === "audiostart")
        return { at, k: "audio", listen: entry.listen };
      if (type === "soundstart" || type === "speechstart")
        return { at, k: "sound", listen: entry.listen };
      if (type === "result") return { at, k: "result", listen: entry.listen };
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
      return { at, k: "speak-end" };
    default:
      return undefined;
  }
}

/**
 * 듣기 직전 읽어 주기와의 관계(순수): 시작 앞 마지막 읽기가 시작한 뒤 끝 · 오류 알림이 시작 앞에 왔으면 그 뒤 ms, 아니면 읽는 중 끊음('cut').
 * 앞에 읽기가 없으면 없음.
 */
function speakRelationOf(
  kept: readonly Kept[],
  beginAt: number,
): ClientListenEntry["tc"] {
  let speakAt: number | undefined;
  for (const e of kept) if (e.k === "speak" && e.at <= beginAt) speakAt = e.at;
  if (speakAt === undefined) return undefined;
  let startedAt: number | undefined;
  let endedAt: number | undefined;
  for (const e of kept) {
    if (e.at < speakAt || e.at > beginAt) continue;
    if (e.k === "speak-start" && startedAt === undefined) startedAt = e.at;
    if (e.k === "speak-end" && startedAt !== undefined && e.at >= startedAt)
      endedAt = e.at;
  }
  return endedAt === undefined ? "cut" : Math.round(beginAt - endedAt);
}

/** 끝난 듣기 하나의 요약(순수). */
function summaryOf(
  kept: readonly Kept[],
  begin: Extract<Kept, { k: "begin" }>,
  done: Extract<Kept, { k: "done" }>,
): ClientListenEntry {
  const mine = kept.filter((e) => "listen" in e && e.listen === begin.listen);
  const first = (k: Kept["k"]) => mine.find((e) => e.k === k)?.at;
  const d = Math.max(0, Math.round(done.at - begin.at));
  const startAt = first("start-call");
  const audioAt = first("audio");
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
  return {
    o: done.o,
    ...(by ? { by } : {}),
    d,
    ...(startAt !== undefined && audioAt !== undefined && audioAt >= startAt
      ? { as: Math.round(audioAt - startAt) }
      : {}),
    snd: first("sound") !== undefined,
    ...(resultAt !== undefined
      ? { fr: Math.max(0, Math.round(resultAt - begin.at)) }
      : {}),
    ...(tc === undefined ? {} : { tc }),
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

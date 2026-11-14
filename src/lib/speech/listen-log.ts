// 회화 듣기 사건 기록(13절 C149 · 분석 보고 task-talk-speech-analysis 4.1). 음성 접점(browser.ts)의 기록 사건(onTrace)을 받아
// 듣기마다 요약(o · by · d · as · snd · fr · tc, 11-06 에 pe · ss · rs · ts · te · hid — 분석 task-ipad-listen-analysis 6.2, 11-13 에 읽어 주기
// 시각 k0 · ks · kd · kn — 회화 Claude 주도 plan 묶음 V, 이야기 방식의 인식기 칸 cf · na · int — 회화 대화 구조 R spec 설계 11)으로 줄인다. 받을 때 글 · 인식 글 · 오류 메시지를 버리고 시각 · 종류만 남긴다(녹음 금지 ·
// 이름 가림). window 를 읽지 않는다(단위 시험이 돈다). 버리는 듣기(iPad 버리는 듣기 spec 설계 5)는 버림 객체의 end 만 pe 의 앞 객체로 보고,
// 층이 남긴 discard-note 를 다음 진짜 요약의 dc 로 붙인다. 버림의 소리 · 결과 사건은 진짜 칸에 넣지 않는다.
import {
  CLIENT_ALTERNATIVES_MAX,
  CLIENT_LISTEN_MS_MAX,
  CLIENT_LISTENS_MAX,
  CLIENT_SPEAKS_MAX,
  type ClientListenEntry,
  DISCARD_COUNT_MAX,
  type DiscardNote,
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

/** 셈(np · n)을 서버 꼴(0 ~ DISCARD_COUNT_MAX 정수)에 맞춘다. */
function clampCount(n: number): number {
  return Math.min(DISCARD_COUNT_MAX, Math.max(0, Math.round(n)));
}

/**
 * 층이 남긴 dc 에서 접점 표 칸만 옮긴다(순수). 섞여 온 다른 칸(글 등)은 버리고, ms · 셈은 서버 꼴 상한으로 잘라 턴 요청 · 따라 말하기 저장이
 * 통째로 거절되지 않게 한다(clampListenMs 와 같은 뜻).
 */
function noteOf(dc: DiscardNote): DiscardNote {
  const out: DiscardNote = {};
  if (dc.g !== undefined) out.g = dc.g;
  if (dc.sr !== undefined) out.sr = dc.sr;
  if (dc.why !== undefined) out.why = dc.why;
  if (dc.rw !== undefined) out.rw = dc.rw;
  if (dc.as !== undefined) out.as = clampListenMs(dc.as);
  if (dc.d !== undefined) out.d = clampListenMs(dc.d);
  if (dc.s0 !== undefined) out.s0 = clampListenMs(dc.s0);
  if (dc.s1 !== undefined) out.s1 = clampListenMs(dc.s1);
  if (dc.w !== undefined) out.w = clampListenMs(dc.w);
  if (dc.sk !== undefined) out.sk = dc.sk;
  if (dc.np !== undefined) out.np = clampCount(dc.np);
  if (dc.n !== undefined) out.n = clampCount(dc.n);
  if (dc.qa !== undefined) out.qa = clampListenMs(dc.qa);
  if (dc.ql !== undefined) out.ql = dc.ql;
  return out;
}

/** 확신 정도의 자릿수(소수 둘째 자리, 회화 대화 구조 R spec 설계 11 '싣는 곳'). */
const CONFIDENCE_PLACES = 100;

/**
 * 듣기 끝 기록의 인식기 칸을 서버 꼴에 맞춘다(순수): 확신 정도는 0 ~ 1 · 소수 둘째 자리(수가 아니면 뺌), 후보 수는 0 ~ CLIENT_ALTERNATIVES_MAX
 * 정수, 섞인 글 표지 mx 는 참일 때만 싣는다. 섞여 온 다른 칸(글 등)은 버린다.
 */
function recOf(rec: { cf?: number; na: number; int: boolean; mx?: boolean }): {
  cf?: number;
  na: number;
  int: boolean;
  mx?: boolean;
} {
  const cf =
    rec.cf !== undefined && Number.isFinite(rec.cf)
      ? Math.min(
          1,
          Math.max(
            0,
            Math.round(rec.cf * CONFIDENCE_PLACES) / CONFIDENCE_PLACES,
          ),
        )
      : undefined;
  return {
    ...(cf === undefined ? {} : { cf }),
    na: Math.min(CLIENT_ALTERNATIVES_MAX, Math.max(0, Math.round(rec.na))),
    int: rec.int === true,
    ...(rec.mx === true ? { mx: true } : {}),
  };
}

/** 글을 버린 사건. */
type Kept =
  | { at: number; k: "begin"; listen: number; capMs: number | undefined }
  | { at: number; k: "start-call"; listen: number; synth?: SynthState }
  | { at: number; k: "audio"; listen: number }
  | { at: number; k: "sound"; listen: number }
  | { at: number; k: "result"; listen: number }
  /** 인식 객체 end(pe — 앞 객체 end 뒤 경과). 버림 객체의 end 는 듣기 번호가 없다(그 듣기의 사건으로 세지 않게). */
  | { at: number; k: "rec-end"; listen?: number }
  /** 버리는 듣기 층이 진짜 앞에 남긴 '그 앞 버림' 칸(다음 진짜 요약의 dc). */
  | { at: number; k: "note"; dc: DiscardNote }
  | { at: number; k: "button"; listen: number }
  | {
      at: number;
      k: "done";
      listen: number;
      o: string;
      by?: EndedBy;
      /** 인식기 정보(후보 수를 넘겨 연 듣기만 — 수 · 참거짓, 글 없음). */
      rec?: { cf?: number; na: number; int: boolean; mx?: boolean };
    }
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
        ...(entry.rec === undefined ? {} : { rec: recOf(entry.rec) }),
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
    case "discard-event":
      // 버림의 audiostart · 소리 · 결과 · 오류는 진짜 칸에 들지 않는다. end 만 pe 의 앞 객체로 센다(설계 5)
      return entry.event.type === "end" ? { at, k: "rec-end" } : undefined;
    case "discard-note":
      return { at, k: "note", dc: noteOf(entry.dc) };
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
  const endedAt = speakEndedAt(kept, speakAt, beginAt);
  return endedAt === undefined ? "cut" : clampListenMs(beginAt - endedAt);
}

/**
 * 이 읽기(speakAt)가 듣기 시작 앞에 끝난 시각(순수): 그 읽기의 시작 알림 뒤 마지막 끝 · 오류 알림, 또는 감시 알림. 없으면 읽는 중 끊음이라
 * 없음. tc 와 kd 가 같은 끝을 쓴다.
 */
function speakEndedAt(
  kept: readonly Kept[],
  speakAt: number,
  beginAt: number,
): number | undefined {
  let startedAt: number | undefined;
  let endedAt: number | undefined;
  for (const e of kept) {
    if (e.at < speakAt || e.at > beginAt) continue;
    if (e.k === "speak-start" && startedAt === undefined) startedAt = e.at;
    if (e.k === "speak-end" && startedAt !== undefined && e.at >= startedAt)
      endedAt = e.at;
    if (e.k === "speak-timeout") endedAt = e.at;
  }
  return endedAt;
}

/**
 * 앞 듣기 끝 뒤 이 듣기 앞의 읽어 주기 시각(k0 · ks · kd · kn, 순수 — 회화 Claude 주도 plan 묶음 V). 이 듣기 시작에서 거꾸로 잰 ms 다(화면
 * 시각은 서버 시각과 맞출 수 없음). kd 의 끝은 tc 와 같은 끝(마지막 읽기의 끝 · 감시 알림)이라 읽는 중 끊었으면 없다. 그 사이 읽기가
 * 없으면 넷 다 없다. 소리 없는 풀기 글은 keptOf 가 이미 버려 셈 밖이다.
 */
function speakTimingOf(
  kept: readonly Kept[],
  begin: Extract<Kept, { k: "begin" }>,
): Pick<ClientListenEntry, "k0" | "ks" | "kd" | "kn"> {
  const from = previousDoneAt(kept, begin);
  const speaks = kept.filter(
    (e) => e.k === "speak" && e.at >= from && e.at <= begin.at,
  );
  const firstSpeakAt = speaks[0]?.at;
  const lastSpeak = speaks.at(-1)?.at;
  if (firstSpeakAt === undefined || lastSpeak === undefined) return {};
  const startedAt = kept.find(
    (e) => e.k === "speak-start" && e.at >= firstSpeakAt && e.at <= begin.at,
  )?.at;
  const endedAt = speakEndedAt(kept, lastSpeak, begin.at);
  return {
    k0: clampListenMs(begin.at - firstSpeakAt),
    ...(startedAt === undefined
      ? {}
      : { ks: clampListenMs(startedAt - firstSpeakAt) }),
    ...(startedAt !== undefined && endedAt !== undefined && endedAt >= startedAt
      ? { kd: clampListenMs(endedAt - startedAt) }
      : {}),
    kn: Math.min(CLIENT_SPEAKS_MAX, speaks.length),
  };
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

/** 앞 듣기 끝 시각(순수). 앞 듣기가 없으면 기록 처음(-Infinity). hid 와 k0 · kn 이 같은 경계를 쓴다. */
function previousDoneAt(
  kept: readonly Kept[],
  begin: Extract<Kept, { k: "begin" }>,
): number {
  let prevDoneAt = Number.NEGATIVE_INFINITY;
  for (const e of kept)
    if (e.k === "done" && e.listen < begin.listen && e.at <= begin.at)
      prevDoneAt = Math.max(prevDoneAt, e.at);
  return prevDoneAt;
}

/** 앞 듣기(없으면 기록 처음) 끝 뒤 이 듣기 시작 앞에 쪽이 숨었는가(hid, 순수). */
function hiddenBefore(
  kept: readonly Kept[],
  begin: Extract<Kept, { k: "begin" }>,
): boolean {
  const prevDoneAt = previousDoneAt(kept, begin);
  return kept.some(
    (e) => e.k === "hidden" && e.at >= prevDoneAt && e.at <= begin.at,
  );
}

/** 이 시각 앞 마지막 인식 객체 end(어느 인식 객체든, 버림 포함 — pe, 순수). */
function recognizerEndBefore(
  kept: readonly Kept[],
  at: number,
): number | undefined {
  let last: number | undefined;
  for (const e of kept) if (e.k === "rec-end" && e.at <= at) last = e.at;
  return last;
}

/**
 * 이 듣기 시작 바로 앞(앞 듣기 끝 뒤)에 남은 마지막 버림 칸(dc, 순수). 없으면 없음. 앞 듣기의 시작 · 끝에서 멈춘다 —
 * 층이 note 를 늦게(앞 진짜 도중에) 남기는 순서 실수가 있어도 그 note 가 다음 진짜 요약에 조용히 붙지 않게(묶음 4 검토 M3).
 */
function noteBefore(
  kept: readonly Kept[],
  begin: Extract<Kept, { k: "begin" }>,
): DiscardNote | undefined {
  const i = kept.indexOf(begin);
  for (let j = i - 1; j >= 0; j--) {
    const e = kept[j];
    if (e?.k === "begin" || e?.k === "done") return undefined;
    if (e?.k === "note") return Object.keys(e.dc).length > 0 ? e.dc : undefined;
  }
  return undefined;
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
  const dc = noteBefore(kept, begin);
  const info = done.rec;
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
    ...(dc ? { dc } : {}),
    ...speakTimingOf(kept, begin),
    ...(info === undefined
      ? {}
      : {
          ...(info.cf === undefined ? {} : { cf: info.cf }),
          na: info.na,
          int: info.int,
          ...(info.mx === true ? { mx: true } : {}),
        }),
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

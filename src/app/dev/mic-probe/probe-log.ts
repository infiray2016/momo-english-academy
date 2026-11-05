// 마이크 점검 쪽(/dev/mic-probe)의 기록 꼴 · 요약 · 복사 글(브리프 task-mic-probe 2026-11-06, iPad Safari 27 듣기 실패 회복 전략 실측).
// 관찰 도구라 아이 화면 원칙 밖이다(선생님 관찰 쪽과 같음). DB · React 없는 순수 모듈이고 단위 시험 tests/unit/mic-probe.test.ts 가 덮는다.
// 시각(at)은 그 쪽을 연 동안의 performance.now() 이고, 표의 ms 는 모두 그 시도의 start 호출 기준이다. 기록은 쪽 안(sessionStorage)에만
// 두고 복사할 때만 기기 밖(클립보드)으로 나간다. 소리는 저장하지 않는다(7절 — getUserMedia · MediaRecorder 를 쓰지 않음).
import { z } from "zod";

/**
 * 전략 일곱(브리프 '만들 것' 다섯 + fix 1 의 F · G — 검토 I-3, C210 'TTS 재생 종료 직후 마이크 시작'과 '누름 밖 시작'을 가른다).
 * 단추 한 번 = 듣기 한 번 = 표 한 줄. F · G 는 '지금 눌러 말하기'를 한 번 더 눌러야 듣는다.
 */
export const STRATEGIES = ["A", "B", "C", "D", "E", "F", "G"] as const;
export type Strategy = (typeof STRATEGIES)[number];

// 관찰 도구의 시험 값(브리프 · 조사 5절 순위 1). 앱 설정(settings)이 아니라 이 쪽의 측정 조건이다.
/** B: 시작 알림(audiostart)이 이보다 빨리 오면 못 듣는 징후로 본다(조사 1절 — 실패 31~158ms, 성공 278ms 이상). */
export const FAST_AUDIOSTART_MS = 200;
/** B: start 호출 뒤 이 때까지 소리 · 말 · 결과가 없으면 다시 시작한다. */
export const FAST_CHECK_MS = 1_500;
/** B: 다시 시작 최대 횟수. */
export const MAX_FAST_RESTARTS = 3;
/** B: abort 뒤 end 를 기다리는 상한(조사 5절 'end(상한 300ms)'). 넘으면 end 없이 새 객체를 연다. */
export const RESTART_END_WAIT_MS = 300;
/** 마지막 결과 뒤 이만큼 조용하면 stop(한 낱말 말하기라 짧게). */
export const END_SILENCE_MS = 2_000;
/** start 호출 뒤 결과가 하나도 없이 이만큼 지나면 stop. */
export const NO_RESULT_STOP_MS = 6_000;
/** 듣기 한 번의 상한. */
export const MAX_LISTEN_MS = 10_000;
/** stop 뒤 end 를 기다리는 상한. 넘으면 abort 하고 'end 없음'으로 끝낸다. */
export const END_WAIT_MS = 3_000;
/** D: 읽어 주기 끝 알림을 기다리는 상한. 넘으면 끝 알림 없이 듣는다. */
export const SPEAK_END_WAIT_MS = 6_000;
/** D · F 가 읽어 주는 짧은 영어 한 문장. */
export const SPEAK_SENTENCE = "Please say one word.";
/** G 가 읽어 주는 긴 영어 문장(읽는 동안 누를 틈을 준다 — 보통 빠르기로 8초 안팎). */
export const LONG_SENTENCE =
  "Today we are going to talk about fruit. I like apples and bananas very much. What fruit do you like? Tell me one word when you are ready.";
/** 시도 하나에 남기는 중간 결과 사건 수 상한(검토 M-4 — 쪽 안 저장소 크기). 넘는 중간 결과는 세기만 한다. final 은 늘 남긴다. */
export const MAX_INTERIM_EVENTS = 20;
/** 전략별 인식 언어(E 만 한국어). */
export const LANG_OF: Record<Strategy, string> = {
  A: "en-US",
  B: "en-US",
  C: "en-US",
  D: "en-US",
  E: "ko-KR",
  F: "en-US",
  G: "en-US",
};
/** 읽어 준 뒤 듣는 전략(D 누름 밖 자동 시작 · F 읽기 끝 뒤 누름 · G 읽는 중 누름). */
export const SPEAK_FIRST: readonly Strategy[] = ["D", "F", "G"];

export const EVENT_TYPES = [
  "start-call",
  "start-threw",
  "no-recognition",
  "audiostart",
  "soundstart",
  "speechstart",
  "speechend",
  "soundend",
  "audioend",
  "result",
  "error",
  "end",
  "stop-call",
  "abort-call",
  "end-missing",
  "speak-start",
  "speak-end",
  "speak-error",
  "speak-end-missing",
  "speak-cancel",
  "press",
  "hidden",
  "visible",
] as const;
export type ProbeEventType = (typeof EVENT_TYPES)[number];

export const STOP_REASONS = [
  "silence",
  "no-result",
  "cap",
  "user",
  "natural",
  "end-missing",
  "start-failed",
  "no-recognition",
] as const;
export type StopReason = (typeof STOP_REASONS)[number];

const eventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  at: z.number(),
  attempt: z.number().int().nonnegative(),
  /** result: 이 알림에 새 final 결과가 있는가. */
  final: z.boolean().optional(),
  /** result: 그 시도에서 지금까지 들은 글 전체(final + 중간)의 길이. 중간 글 원문은 사건에 남기지 않는다(검토 M-4 · M-5). */
  length: z.number().int().nonnegative().optional(),
  /** result(final 만): final 결과만 이은 글. */
  finalText: z.string().optional(),
  /** error · start-threw · speak-error: 오류 이름 · 글, stop-call · abort-call: 까닭, speak-cancel: 그때 읽는 중이었는가(speaking · ended). */
  code: z.string().optional(),
  message: z.string().optional(),
});
export type ProbeEvent = z.infer<typeof eventSchema>;

const attemptSchema = z.object({
  startCallAt: z.number(),
  /** 이 쪽을 연 뒤 몇 번째 인식 객체인가(조사 5절 측정 칸 '이 탭에서 몇 번째 인식'). */
  nth: z.number().int().positive(),
  /** 그 시도에서 마지막으로 들은 글 전체(중간 포함, 덮어씀). final 이 없을 때 '(중간)' 으로 보인다. */
  lastText: z.string().default(""),
});
export type ProbeAttempt = z.infer<typeof attemptSchema>;

const recordSchema = z.object({
  id: z.number().int().positive(),
  /** 몇 번째로 연 쪽인가(새로 고침마다 1 씩 — 새로 고침으로 회복되는지 가른다). */
  load: z.number().int().positive(),
  strategy: z.enum(STRATEGIES),
  lang: z.string(),
  /** 누른 때(벽시계, ISO). */
  pressedAt: z.string(),
  tapAt: z.number(),
  /** 같은 쪽에서 앞 듣기 end 뒤 첫 start 호출까지 ms(그 쪽 첫 듣기는 null). */
  sincePrevEndMs: z.number().nullable(),
  visibilityAtStart: z.string(),
  attempts: z.array(attemptSchema),
  events: z.array(eventSchema),
  stopReason: z.enum(STOP_REASONS).nullable(),
  /** 상한(MAX_INTERIM_EVENTS)을 넘어 남기지 않은 중간 결과 수. */
  droppedInterims: z.number().int().nonnegative().default(0),
});
export type ProbeRecord = z.infer<typeof recordSchema>;

/** 쪽 머리의 환경 줄(복사 글 머리에도 넣는다). */
export type ProbeEnv = {
  userAgent: string;
  visibility: string;
  audioSessionType: string | null;
  recognition: "webkitSpeechRecognition" | "SpeechRecognition" | "없음";
  load: number;
};

/** 기록 한 줄의 표 값. ms 는 그 시도의 start 호출 기준(반올림), 없으면 null. */
export type ProbeRow = {
  id: number;
  load: number;
  strategy: Strategy;
  lang: string;
  nth: number | null;
  sincePrevEndMs: number | null;
  restarts: number;
  /** 시도마다 audiostart ms(없으면 null). */
  audiostarts: (number | null)[];
  audiostart: number | null;
  soundstart: number | null;
  speechstart: number | null;
  firstInterim: { ms: number; length: number } | null;
  final: { ms: number; length: number } | null;
  error: { ms: number; code: string; message: string } | null;
  end: number | null;
  /** D · F: 읽어 주기 끝 알림 → 첫 start 호출 ms(F 는 아이가 누르기까지 기다린 시간을 포함한다). */
  speakEndToStart: number | null;
  /** G: speechSynthesis.cancel() 호출 → 첫 start 호출 ms. */
  cancelToStart: number | null;
  /** G: 누른 때 아직 읽는 중이었는가(cancel 앞의 speechSynthesis.speaking). G 가 아니면 null. */
  cancelWhileSpeaking: boolean | null;
  droppedInterims: number;
  hiddenDuring: boolean;
  stopReason: StopReason | null;
  finalText: string;
  heardText: string;
  success: boolean;
};

const round = (ms: number) => Math.round(ms);

function firstOf(
  record: ProbeRecord,
  attempt: number,
  pick: (e: ProbeEvent) => boolean,
): ProbeEvent | undefined {
  return record.events.find((e) => e.attempt === attempt && pick(e));
}

function relMs(
  record: ProbeRecord,
  attempt: number,
  event: ProbeEvent | undefined,
): number | null {
  const base = record.attempts[attempt]?.startCallAt;
  if (event === undefined || base === undefined) return null;
  return round(event.at - base);
}

/** 성공 = 어느 시도든 final 결과가 있다(브리프). */
export function isSuccess(record: ProbeRecord): boolean {
  return record.events.some((e) => e.type === "result" && e.final === true);
}

/** 기록 하나를 표 한 줄로. 시도별 audiostart 를 빼면 마지막 시도의 값이다. */
export function rowOf(record: ProbeRecord): ProbeRow {
  const last = Math.max(0, record.attempts.length - 1);
  const ms = (type: ProbeEventType) =>
    relMs(
      record,
      last,
      firstOf(record, last, (e) => e.type === type),
    );
  const interim = firstOf(
    record,
    last,
    (e) => e.type === "result" && e.final !== true,
  );
  const final = firstOf(
    record,
    last,
    (e) => e.type === "result" && e.final === true,
  );
  const error = firstOf(record, last, (e) => e.type === "error");
  const results = record.events.filter(
    (e) => e.attempt === last && e.type === "result",
  );
  const firstStart = record.attempts[0]?.startCallAt;
  // 듣기 앞의 읽기 사건만 센다(G 는 cancel 뒤에 끝 알림이 늦게 올 수 있다)
  const beforeStart = (type: ProbeEventType) =>
    firstStart === undefined
      ? undefined
      : record.events.find((e) => e.type === type && e.at <= firstStart);
  const speakEnd = beforeStart("speak-end");
  const cancel = beforeStart("speak-cancel");
  return {
    id: record.id,
    load: record.load,
    strategy: record.strategy,
    lang: record.lang,
    nth: record.attempts[0]?.nth ?? null,
    sincePrevEndMs:
      record.sincePrevEndMs === null ? null : round(record.sincePrevEndMs),
    restarts: Math.max(0, record.attempts.length - 1),
    audiostarts: record.attempts.map((_, i) =>
      relMs(
        record,
        i,
        firstOf(record, i, (e) => e.type === "audiostart"),
      ),
    ),
    audiostart: ms("audiostart"),
    soundstart: ms("soundstart"),
    speechstart: ms("speechstart"),
    firstInterim:
      interim === undefined
        ? null
        : {
            ms: relMs(record, last, interim) ?? 0,
            length: interim.length ?? 0,
          },
    final:
      final === undefined
        ? null
        : {
            ms: relMs(record, last, final) ?? 0,
            length: final.length ?? 0,
          },
    error:
      error === undefined
        ? null
        : {
            ms: relMs(record, last, error) ?? 0,
            code: error.code ?? "",
            message: error.message ?? "",
          },
    end: ms("end"),
    speakEndToStart:
      speakEnd === undefined || firstStart === undefined
        ? null
        : round(firstStart - speakEnd.at),
    cancelToStart:
      cancel === undefined || firstStart === undefined
        ? null
        : round(firstStart - cancel.at),
    cancelWhileSpeaking:
      cancel === undefined ? null : cancel.code === "speaking",
    droppedInterims: record.droppedInterims,
    hiddenDuring: record.events.some((e) => e.type === "hidden"),
    stopReason: record.stopReason,
    finalText: [...results].reverse().find((e) => e.finalText)?.finalText ?? "",
    heardText: record.attempts[last]?.lastText ?? "",
    success: isSuccess(record),
  };
}

/**
 * 결과 사건을 남길지(검토 M-4). final 은 늘 남기고, 중간 결과는 그 시도에서 MAX_INTERIM_EVENTS 개까지만 남긴다.
 * 첫 중간 결과의 ms 는 늘 남는다.
 */
export function keepResultEvent(
  record: ProbeRecord,
  event: { attempt: number; final: boolean },
): boolean {
  if (event.final) return true;
  const interims = record.events.filter(
    (e) =>
      e.type === "result" && e.final !== true && e.attempt === event.attempt,
  ).length;
  return interims < MAX_INTERIM_EVENTS;
}

/** B 의 다시 시작 판정: 시작 알림이 빠르고(200ms 안) 1.5초 안에 소리 · 말 · 결과가 없으며 횟수가 남았다. */
export function fastRestartDue(input: {
  audiostartMs: number | null;
  heard: boolean;
  restarts: number;
}): boolean {
  return (
    input.audiostartMs !== null &&
    input.audiostartMs < FAST_AUDIOSTART_MS &&
    !input.heard &&
    input.restarts < MAX_FAST_RESTARTS
  );
}

export type StrategySummary = {
  strategy: Strategy;
  tries: number;
  successes: number;
  /** 성공률(%, 반올림). 누른 적이 없으면 null. */
  rate: number | null;
};

/** 전략별 성공률(성공 = final 결과 있음). 전략 차례는 A~G 그대로. */
export function summaryOf(records: readonly ProbeRecord[]): StrategySummary[] {
  return STRATEGIES.map((strategy) => {
    const mine = records.filter((r) => r.strategy === strategy);
    const successes = mine.filter(isSuccess).length;
    return {
      strategy,
      tries: mine.length,
      successes,
      rate:
        mine.length === 0 ? null : Math.round((successes / mine.length) * 100),
    };
  });
}

/** 표 칸 글. 없음은 '-'. */
export const cell = (value: number | null) =>
  value === null ? "-" : String(value);

/** 마크다운 표 칸 안의 '|' · 줄바꿈을 막는다. */
const escapeCell = (text: string) =>
  text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");

export const ROW_COLUMNS = [
  "#",
  "쪽",
  "전략",
  "언어",
  "n번째",
  "앞 끝 뒤",
  "재시작",
  "시도별 as",
  "ss",
  "sp",
  "첫 중간(길이)",
  "final(길이)",
  "오류",
  "end",
  "읽기 끝 뒤",
  "취소 뒤(읽는 중)",
  "숨김",
  "멈춤",
  "버린 중간",
  "들은 글",
] as const;

/** 표 한 줄의 칸 글(화면 표 · 복사 글이 같이 쓴다). */
export function rowCells(row: ProbeRow): string[] {
  return [
    String(row.id),
    String(row.load),
    row.strategy,
    row.lang,
    cell(row.nth),
    cell(row.sincePrevEndMs),
    String(row.restarts),
    row.audiostarts.map(cell).join(" → ") || "-",
    cell(row.soundstart),
    cell(row.speechstart),
    row.firstInterim === null
      ? "-"
      : `${row.firstInterim.ms}(${row.firstInterim.length})`,
    row.final === null ? "-" : `${row.final.ms}(${row.final.length})`,
    row.error === null
      ? "-"
      : `${row.error.code}${row.error.message ? ` "${row.error.message}"` : ""} @${row.error.ms}`,
    cell(row.end),
    cell(row.speakEndToStart),
    row.cancelToStart === null
      ? "-"
      : `${row.cancelToStart}(${row.cancelWhileSpeaking ? "예" : "아니요"})`,
    row.hiddenDuring ? "예" : "-",
    row.stopReason ?? "-",
    row.droppedInterims === 0 ? "-" : String(row.droppedInterims),
    row.finalText || (row.heardText ? `(중간) ${row.heardText}` : "-"),
  ];
}

const tableLine = (cells: readonly string[]) =>
  `| ${cells.map(escapeCell).join(" | ")} |`;

/** 복사 글: 환경 줄 + 전략별 요약 표 + 기록 표(마크다운) + 원 기록 JSON. 요청자가 대화창에 붙여 넣는다. */
export function copyTextOf(
  records: readonly ProbeRecord[],
  env: ProbeEnv,
): string {
  const summary = summaryOf(records);
  const lines = [
    "## 마이크 점검 기록",
    "",
    `- UA: ${env.userAgent}`,
    `- 화면: ${env.visibility} · audioSession.type: ${env.audioSessionType ?? "없음"} · 인식: ${env.recognition} · 쪽 연 횟수: ${env.load}`,
    "- ms 는 그 시도의 start 호출 기준. as audiostart · ss soundstart · sp speechstart",
    "- 읽기 끝 뒤: 읽기 끝 알림 → 첫 start 호출(D 누름 밖 자동 · F 누름). 취소 뒤: G 의 speechSynthesis.cancel() → 첫 start 호출(괄호는 그때 읽는 중이었는지)",
    "",
    tableLine(["전략", "누름", "성공", "성공률"]),
    tableLine(["---", "---", "---", "---"]),
    ...summary.map((s) =>
      tableLine([
        s.strategy,
        String(s.tries),
        String(s.successes),
        s.rate === null ? "-" : `${s.rate}%`,
      ]),
    ),
    "",
    tableLine(ROW_COLUMNS),
    tableLine(ROW_COLUMNS.map(() => "---")),
    ...records.map((r) => tableLine(rowCells(rowOf(r)))),
    "",
    "```json",
    JSON.stringify({ env, records }),
    "```",
  ];
  return lines.join("\n");
}

/** sessionStorage 에 둔 기록을 읽는다. 꼴이 어긋나면 빈 목록(새로 고침 뒤에도 기록을 잇기 위함). */
export function parseStored(raw: string | null): ProbeRecord[] {
  if (raw === null) return [];
  try {
    const parsed = z.array(recordSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

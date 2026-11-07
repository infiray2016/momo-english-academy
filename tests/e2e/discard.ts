// iPad 버리는 듣기 e2e 도우미(plan 'iPad 버리는 듣기' 묶음 5 · 바뀌는 파일 표 5 행 · spec 설계 8 '증명 묶음'). 가짜 음성은 인식 객체가 start() 한
// 차례대로 대본 한 줄을 준다(fake-web-speech runIndex — 마지막 줄은 되풀이). 버리는 듣기에서는 버림 객체도 start 하므로 대본은 진짜 · 버림의
// 차례를 시험이 적는다(ScriptStep). 차례는 spec 설계 1 표 그대로다: 쪽 첫 누름은 버림 없이 진짜(F1 rest), 진짜가 끝난 그 걸음에 버림(F2),
// 살아 있는 버림 뒤에는 다음 진짜까지 버림 없음(F3), '버림부터'(떠남 · 저절로 끝남 · 상한)는 읽기 요청이나 누름 때 버림을 다시 엶.
// 죽은 버림은 선생님 목소리를 받은 꼴로 표지 글(MARK)을 결과로 낸다 — 그 글이 화면 · 기록 · 요청 어디에도 없어야 한다(AC-24l).
// 쪽 시작 스크립트 installDiscardWatch 는 선생님 창 상태 바뀜 · 새 표지 넷의 등장 · getUserMedia · MediaRecorder 호출을 센다(밖 이름을 쓰지
// 않는다 — Playwright 가 함수 글을 옮김). 시점 숫자는 시험용 설정(TEST_SETTINGS)에서 읽고, 대본 시각은 이름 붙인 시험 값이다. 녹음하지 않는다.
import type { Page } from "@playwright/test";
import { and, asc, eq } from "drizzle-orm";
import type {
  RecognitionRun,
  ScriptEvent,
  SpeechScript,
} from "../../src/core/speech/script";
import { attempts, talkTurns } from "../../src/db/schema/learning";
import { settings } from "../../src/db/schema/operations";
import { TALK_TURN_PATH } from "../../src/lib/talk-stream";
import { TEST_SETTINGS } from "../fixtures/settings";
import { e2eDb } from "./db";
import { fakeAiRequests } from "./fake-ai";
import { CLOSING_MARK, speechRecord, TURN_MARK, talkScript } from "./talk";

const MS = 1000;

/** 버림 결과로 내는 표지 글(AC-24l — 결과 수만 남고 글은 어디에도 없어야 한다). */
export const MARK = "ZEBRA";

/** 버리는 듣기 시점 값(TEST_SETTINGS — 12절 기본값과 같음). */
export const DISCARD_TIMES = {
  liveAsMs: TEST_SETTINGS["speech.discard_live_as_ms"].value,
  minMs: TEST_SETTINGS["speech.discard_min_ms"].value,
  afterSoundMs: TEST_SETTINGS["speech.discard_after_sound_ms"].value,
  gapMs: TEST_SETTINGS["speech.discard_gap_ms"].value,
  /** 버림 안전 상한(speech.max_listen_seconds + speech.watchdog_extra_seconds, spec 설계 4). */
  capMs:
    (TEST_SETTINGS["speech.max_listen_seconds"].value +
      TEST_SETTINGS["speech.watchdog_extra_seconds"].value) *
    MS,
  /** 닫는 중 end 상한(speech.watchdog_extra_seconds). */
  endWaitMs: TEST_SETTINGS["speech.watchdog_extra_seconds"].value * MS,
} as const;

/** 죽은 버림의 audiostart(ms, start() 뒤 — speech.discard_live_as_ms 안, 기록 8 의 죽은 버림 띠 10~81). */
const DEAD_AS_MS = 30;
/** 살아 있는 버림의 audiostart(ms — speech.discard_live_as_ms 밖, 기록 8 의 살아 있는 버림 띠 260~1160). */
const LIVE_AS_MS = 400;
/** 죽은 버림이 선생님 목소리를 받기 시작하는 때(ms, 시험 값). */
const DISCARD_SOUND_AT_MS = 300;
/** 죽은 버림이 표지 글을 결과로 내는 때(ms, 시험 값 — 중간 결과 하나 · 끝 결과 하나). */
const MARK_INTERIM_AT_MS = 500;
const MARK_FINAL_AT_MS = 900;
/** stop 뒤 end 까지(ms, 시험 값 — 보통 꼴). */
const END_AFTER_STOP_MS = 20;
/** abort 뒤 end 까지(ms, 시험 값). */
const END_AFTER_ABORT_MS = 10;
/**
 * end 가 늦는 버림(ms, stop 뒤 — 시험 값): 닫는 중이 speech.watchdog_extra_seconds 안에서 길어져 기다림 화면이 사진을 찍을 만큼 남는다. 실제
 * iPad 에서도 stop 뒤 end 가 늦는 꼴이 있다(기록 7 · 8 의 end 상한 갈래).
 */
export const SLOW_END_MS = 2500;
/** 진짜 듣기의 audiostart(ms — speech.deaf_audiostart_ms 200 밖이라 '마이크 안 잡힘'으로 읽히지 않음, 분석 표 A 의 성공 듣기 278ms 이상). */
const REAL_AS_MS = 300;
/** 진짜 듣기에서 소리가 들어오는 때 · 결과가 오는 때(ms, 시험 값 — 단추를 다시 눌러 멈추는 꼴). */
const HELD_SOUND_AT_MS = 500;
const HELD_RESULT_AT_MS = 800;

/** 죽은 버림(as 30): 선생님 목소리를 받아 표지 글을 결과로 낸다. 앱이 stop 하면 endAfterStopMs 뒤 end. */
export function deadDiscardRun({
  endAfterStopMs = END_AFTER_STOP_MS,
}: {
  endAfterStopMs?: number;
} = {}): RecognitionRun {
  return {
    events: [
      { at: 10, type: "start" },
      { at: DEAD_AS_MS, type: "audiostart" },
      { at: DISCARD_SOUND_AT_MS, type: "soundstart" },
      { at: DISCARD_SOUND_AT_MS, type: "speechstart" },
      {
        at: MARK_INTERIM_AT_MS,
        type: "result",
        results: [{ transcript: MARK, isFinal: false }],
      },
      {
        at: MARK_FINAL_AT_MS,
        type: "result",
        results: [{ transcript: `${MARK} ${MARK}`, isFinal: true }],
      },
    ],
    onStop: [{ at: endAfterStopMs, type: "end" }],
    onAbort: [
      { at: 0, type: "error", error: "aborted" },
      { at: END_AFTER_ABORT_MS, type: "end" },
    ],
  };
}

/** 살아 있는 버림(as 400 — 문턱 밖): 앱이 speech.discard_live_as_ms 에 stop 하므로 audiostart 는 오지 않는다. */
export function liveDiscardRun(): RecognitionRun {
  return {
    events: [
      { at: 10, type: "start" },
      { at: LIVE_AS_MS, type: "audiostart" },
    ],
    onStop: [{ at: END_AFTER_STOP_MS, type: "end" }],
    onAbort: [
      { at: 0, type: "error", error: "aborted" },
      { at: END_AFTER_ABORT_MS, type: "end" },
    ],
  };
}

/**
 * 진짜 듣기 — 아이가 말하고 단추를 다시 눌러 멈추는 꼴(요청자 강조 장면): 소리가 들어오고 결과가 온 뒤 앱이 stop 하면 end. 누르지 않으면 끝
 * 조용함(speech.end_silence_seconds.talk.<구간>) 뒤 앱이 스스로 멈춘다.
 */
export function heldRun(text: string): RecognitionRun {
  return {
    events: [
      { at: 50, type: "start" },
      { at: REAL_AS_MS, type: "audiostart" },
      { at: HELD_SOUND_AT_MS, type: "soundstart" },
      { at: HELD_SOUND_AT_MS, type: "speechstart" },
      {
        at: HELD_RESULT_AT_MS,
        type: "result",
        results: [{ transcript: text, isFinal: true }],
      },
    ],
    onStop: [{ at: END_AFTER_STOP_MS, type: "end" }],
  };
}

/** 진짜 듣기 — 소리가 speechAt 에 늦게 들어오는 꼴('말해 보세요'가 그동안 보이고 소리가 들어오면 지워짐). */
export function lateSpeechRun(text: string, speechAt: number): RecognitionRun {
  return {
    events: [
      { at: 50, type: "start" },
      { at: REAL_AS_MS, type: "audiostart" },
      { at: speechAt, type: "soundstart" },
      { at: speechAt, type: "speechstart" },
      {
        at: speechAt + HELD_RESULT_AT_MS - HELD_SOUND_AT_MS,
        type: "result",
        results: [{ transcript: text, isFinal: true }],
      },
    ],
    onStop: [{ at: END_AFTER_STOP_MS, type: "end" }],
  };
}

/** 결과 없이 저절로 끝나는 진짜(인식 실패 시도 — 말소리 없음 셈에 들지 않음, C148). */
export const NO_RESULT_RUN: RecognitionRun = {
  events: [
    { at: 50, type: "start" },
    { at: REAL_AS_MS, type: "audiostart" },
    { at: 420, type: "end" },
  ],
};

export type Role = "real" | "discard";
/** 대본 한 줄과 그 줄을 받을 인식 객체의 몫(진짜 · 버림). */
export type ScriptStep = { role: Role; run: RecognitionRun };

export const real = (run: RecognitionRun): ScriptStep => ({
  role: "real",
  run,
});
export const dead = (
  opts: Parameters<typeof deadDiscardRun>[0] = {},
): ScriptStep => ({ role: "discard", run: deadDiscardRun(opts) });
export const live = (): ScriptStep => ({
  role: "discard",
  run: liveDiscardRun(),
});

/** 진짜마다 그 뒤에 죽은 버림 하나(F2 — 진짜가 끝난 그 걸음에 버림이 열린다). 끝은 버림이라 대본을 넘어선 start 도 버림 꼴을 받는다. */
export function realsThenDead(
  runs: readonly RecognitionRun[],
  opts: Parameters<typeof deadDiscardRun>[0] = {},
): ScriptStep[] {
  return runs.flatMap((run) => [real(run), dead(opts)]);
}

export type DiscardScript = {
  script: SpeechScript;
  roles: readonly Role[];
  runs: readonly RecognitionRun[];
};

/**
 * 진짜 · 버림 차례의 대본. 읽어 주기는 모두 같은 꼴이다(startAfterMs 뒤 시작 알림, 그 뒤 utterMs 에 끝 — 시험 시간). 끝 줄은 되풀이되므로
 * 버림으로 끝내는 편이 안전하다(진짜가 버림 꼴을 받으면 '마이크 안 잡힘'으로 드러남).
 */
export function discardScript(
  steps: readonly ScriptStep[],
  {
    utterMs = 30,
    startAfterMs = 0,
  }: { utterMs?: number; startAfterMs?: number } = {},
): DiscardScript {
  const runs = steps.map((s) => s.run);
  const base = talkScript([...runs], { utterMs });
  const script: SpeechScript = {
    ...base,
    name: "talk-discard-e2e",
    source: "손으로 씀 — 버리는 듣기 e2e(진짜 · 버림 차례를 시험이 적음)",
    ...(base.synthesis
      ? {
          synthesis: {
            ...base.synthesis,
            utterances: [{ startAfter: startAfterMs, endAfter: utterMs }],
          },
        }
      : {}),
  };
  return { script, roles: steps.map((s) => s.role), runs };
}

// ── 가짜 음성 기록 읽기 ──

/**
 * 인식 객체 하나의 쓰임(가짜 음성 start · stop · abort 기록에서). close 는 첫 닫힘 호출, aborted 는 그 객체에 abort 가 한 번이라도 왔는지(stop 뒤
 * abort 도 센다 — 검토 M-4). endAt 은 대본으로 셈한 end(스스로 끝남과 닫힘 + 지연 가운데 이른 쪽, 아직 열려 있으면 없음).
 */
export type RecognizerUse = {
  id: number;
  role: Role;
  startAt: number;
  close: "stop" | "abort" | undefined;
  closeAt: number | undefined;
  aborted: boolean;
  endAt: number | undefined;
};

const endOffsetOf = (events: readonly ScriptEvent[] | undefined) =>
  events?.find((e) => e.type === "end")?.at;

/** start 차례대로 인식 객체의 몫 · 열림 · 닫힘(대본 차례 = start 차례). */
export async function recognizersOf(
  page: Page,
  s: DiscardScript,
): Promise<RecognizerUse[]> {
  const { calls } = await speechRecord(page);
  const starts = calls.filter((c) => c.method === "start");
  const last = s.roles.length - 1;
  return starts.map((start, i) => {
    const at = Math.min(i, last);
    const run = s.runs[at];
    const closing = calls.find(
      (c) => c.id === start.id && c.method !== "start" && c.at >= start.at,
    );
    const close =
      closing?.method === "stop" || closing?.method === "abort"
        ? closing.method
        : undefined;
    const closeOffset =
      close === "stop"
        ? (endOffsetOf(run?.onStop) ?? 0)
        : close === "abort"
          ? (endOffsetOf(run?.onAbort) ?? 0)
          : undefined;
    const ownEnd = endOffsetOf(run?.events);
    const ends = [
      ...(closing !== undefined && closeOffset !== undefined
        ? [closing.at + closeOffset]
        : []),
      ...(ownEnd !== undefined ? [start.at + ownEnd] : []),
    ];
    return {
      id: start.id,
      role: s.roles[at] ?? "discard",
      startAt: start.at,
      close,
      closeAt: closing?.at,
      aborted: calls.some(
        (c) => c.id === start.id && c.method === "abort" && c.at >= start.at,
      ),
      endAt: ends.length > 0 ? Math.min(...ends) : undefined,
    };
  });
}

/** 인식 start 호출 수(진짜 + 버림). */
export async function startsOf(page: Page): Promise<number> {
  return (await speechRecord(page)).calls.filter((c) => c.method === "start")
    .length;
}

/** 진짜가 열린 동안(start 뒤 · end 전) speechSynthesis.speak 를 받은 글(AC-24g — 늘 빈 목록이어야 한다). */
export async function speaksDuringReal(
  page: Page,
  s: DiscardScript,
): Promise<string[]> {
  const record = await speechRecord(page);
  const now = await pageNow(page);
  const reals = (await recognizersOf(page, s)).filter((r) => r.role === "real");
  return record.spoken.filter((_, i) => {
    const at = record.spokenAt[i] ?? -1;
    return reals.some((r) => at > r.startAt && at < (r.endAt ?? now));
  });
}

/** 그 글을 읽어 달라고 받은 시각들(가짜 음성 spokenAt). */
export async function spokenAtOf(page: Page, text: string): Promise<number[]> {
  const record = await speechRecord(page);
  return record.spokenAt.filter((_, i) => record.spoken[i] === text);
}

export async function pageNow(page: Page): Promise<number> {
  return page.evaluate(() => performance.now());
}

// ── 쪽 안 관찰(선생님 창 상태 · 새 표지 · 마이크 녹음 API) ──

/** 버리는 듣기를 켠 기기에만 생기는 화면 표지 넷(AC-24k 의 off 대조 — 끔에서는 하나도 보이지 않아야 한다). */
export const DISCARD_MARKERS = [
  "[data-speak-preparing]",
  "[data-discard-line]",
  "[data-talk-short-line]",
  "[data-mic-discard]",
] as const;

export type DiscardWatch = {
  states: { at: number; value: string }[];
  seen: Record<string, boolean>;
  /** 화면 글에 표지 글이 한 번이라도 들었는지(잠깐 떴다 사라진 글도 — 검토 M-5). */
  markSeen: boolean;
  media: { getUserMedia: number; recorder: number };
};

/**
 * 쪽 시작 스크립트(speechPage 뒤 page.goto 앞에 page.addInitScript 로 넣는다). 선생님 창 data-teacher-state 가 바뀔 때마다 한 줄, 새 표지 넷이
 * 한 번이라도 보였는지, 화면 글에 표지 글(MARK 와 같은 글)이 든 적이 있는지, getUserMedia · MediaRecorder 호출 수(통과시키며 센다 — AC-24l 녹음
 * 없음). 밖 이름을 쓰지 않는다.
 */
export function installDiscardWatch(): void {
  const markers = [
    "[data-speak-preparing]",
    "[data-discard-line]",
    "[data-talk-short-line]",
    "[data-mic-discard]",
  ];
  const mark = "ZEBRA";
  const watch = {
    states: [] as { at: number; value: string }[],
    seen: {} as Record<string, boolean>,
    markSeen: false,
    media: { getUserMedia: 0, recorder: 0 },
  };
  (window as unknown as { __discardWatch: typeof watch }).__discardWatch =
    watch;
  let last: string | null = null;
  const look = () => {
    const el = document.querySelector("[data-teacher-window]");
    const value = el ? el.getAttribute("data-teacher-state") : null;
    if (value !== last) {
      last = value;
      watch.states.push({ at: performance.now(), value: value ?? "none" });
    }
    for (const marker of markers) {
      if (!watch.seen[marker] && document.querySelector(marker))
        watch.seen[marker] = true;
    }
    if (!watch.markSeen && document.body?.textContent?.includes(mark))
      watch.markSeen = true;
  };
  new MutationObserver(look).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
  });
  const devices = navigator.mediaDevices as
    | { getUserMedia?: (c?: unknown) => Promise<unknown> }
    | undefined;
  if (devices && typeof devices.getUserMedia === "function") {
    const original = devices.getUserMedia.bind(devices);
    devices.getUserMedia = (c?: unknown) => {
      watch.media.getUserMedia += 1;
      return original(c);
    };
  }
  const w = window as unknown as Record<string, unknown>;
  const Recorder = w.MediaRecorder;
  if (typeof Recorder === "function") {
    const counted = new Proxy(Recorder, {
      construct(target, args, newTarget) {
        watch.media.recorder += 1;
        return Reflect.construct(target, args, newTarget) as object;
      },
    });
    try {
      Object.defineProperty(window, "MediaRecorder", {
        value: counted,
        configurable: true,
        writable: true,
      });
    } catch {
      w.MediaRecorder = counted;
    }
  }
}

export async function watchOf(page: Page): Promise<DiscardWatch> {
  return page.evaluate(
    () =>
      (window as unknown as { __discardWatch: DiscardWatch }).__discardWatch,
  );
}

/** 버림이 열린 동안 선생님 창이 '듣기'로 바뀐 때(AC-24b — 늘 빈 목록이어야 한다, spec 설계 3 '버림 동안의 화면'). */
export async function listeningInDiscard(
  page: Page,
  s: DiscardScript,
): Promise<number[]> {
  const { states } = await watchOf(page);
  const now = await pageNow(page);
  const discards = (await recognizersOf(page, s)).filter(
    (r) => r.role === "discard",
  );
  return states
    .filter((e) => e.value === "listening")
    .map((e) => e.at)
    .filter((at) =>
      discards.some((d) => at > d.startAt && at < (d.endAt ?? now)),
    );
}

// ── 요청 본문 · DB 기록 ──

export type Sent = { turns: string[]; posts: string[] };

/** 쪽이 보낸 POST 본문(회화 턴 요청은 따로). page.goto 앞에 건다. */
export function captureSent(page: Page): Sent {
  const sent: Sent = { turns: [], posts: [] };
  page.on("request", (request) => {
    if (request.method() !== "POST") return;
    const body = request.postData() ?? "";
    sent.posts.push(body);
    if (new URL(request.url()).pathname === TALK_TURN_PATH)
      sent.turns.push(body);
  });
  return sent;
}

/**
 * 회화 턴 요청 본문에서 듣기 사건 요약 · 세션 · 시도 id · 앞 턴 체감 대기(재는 값)를 뺀 글(AC-N25 — 켬 · 끔의 같은 표본에서 같아야 하는 몫).
 */
export function turnBodyCore(body: string): string {
  const {
    clientListen: _listen,
    sessionId: _session,
    clientAttemptId: _attempt,
    prevPerceivedWaitMs: _wait,
    ...rest
  } = JSON.parse(body) as Record<string, unknown>;
  return JSON.stringify(rest);
}

export async function childRowsOf(sessionId: string) {
  return e2eDb()
    .select()
    .from(talkTurns)
    .where(
      and(eq(talkTurns.sessionId, sessionId), eq(talkTurns.speaker, "child")),
    )
    .orderBy(asc(talkTurns.turnNo));
}

/** 아이 행의 듣기 요약 줄(client_listen.listens — 없으면 빈 목록). */
export function listensOf(row: { clientListen: unknown }): ListenEntry[] {
  const listen = row.clientListen as { listens?: ListenEntry[] } | null;
  return listen?.listens ?? [];
}

/** e2e 가 읽는 듣기 요약 칸(src/core/conversation/client-listen 의 꼴 가운데 시험이 보는 것). */
export type ListenEntry = {
  o: string;
  pe?: number;
  dc?: {
    g?: string;
    why?: string;
    rw?: string;
    as?: number;
    d?: number;
    w?: number;
    sk?: string;
    np?: number;
    n?: number;
  };
};

/**
 * 앱이 같은 턴 안에서 다시 부르는 회화 턴 호출의 사용자 메시지 머리(question-retry questionRetryNoteOf · stuckRewriteNoteOf — 13절 C203 (3) 질문
 * 다시 쓰기 · C204 (3) 막힘 무름). 그 호출 본문에도 TURN_MARK 가 든다.
 */
const REWRITE_MARK = "App check:";

/**
 * 아이 말이 연 회화 턴 호출 수(가짜 AI 가 받은 요청 — 끝맺음과 같은 턴 안의 다시 쓰기 호출은 뺀다). 다시 쓰기는 질문 검사에 걸린 AI 질문을 서버가
 * 한 번 더 부르는 앱 몫이라(CI 42361488670 첫 실패 — 'Sunday' 는 4단계 낱말), 아이 말 한 번 = 이 수 하나를 볼 때 섞지 않는다.
 */
export async function childTurnCalls(): Promise<number> {
  return (await fakeAiRequests()).filter(
    (r) =>
      r.bodyText.includes(TURN_MARK) &&
      !r.bodyText.includes(CLOSING_MARK) &&
      !r.bodyText.includes(REWRITE_MARK),
  ).length;
}

/**
 * 하루 안전 상한에 닿게 둔 그 프로필의 상한 행(talk.ts reachSafetyCap 의 ai.safety_daily_calls = 1)을 지운다 — 집 기본 행(시험용 설정)으로
 * 돌아간다. liftSafetyCap 은 호출 기록만 지워 그 뒤 호출 하나가 쌓이면 다시 쉬므로, 풀린 뒤 두 턴 이상을 보는 시험이 함께 부른다.
 */
export async function dropSafetyCap(profileId: string): Promise<void> {
  await e2eDb()
    .delete(settings)
    .where(
      and(
        eq(settings.key, "ai.safety_daily_calls"),
        eq(settings.profileId, profileId),
      ),
    );
}

export async function attemptsOf(sessionId: string) {
  return e2eDb()
    .select({ input: attempts.input })
    .from(attempts)
    .where(eq(attempts.sessionId, sessionId));
}

/** 표지 글이 든 자리(AC-24l — 화면(지금 · 지나간 글) · 대화 기록 · talk_turns · attempts · 쪽이 보낸 POST · 가짜 AI 가 받은 요청). 늘 빈 목록이어야 한다. */
export async function markPlaces(
  page: Page,
  sessionId: string,
  sent: Sent,
): Promise<string[]> {
  const places: string[] = [];
  if ((await page.content()).includes(MARK)) places.push("화면");
  if ((await watchOf(page)).markSeen) places.push("화면(지나간 글)");
  const all = await e2eDb()
    .select()
    .from(talkTurns)
    .where(eq(talkTurns.sessionId, sessionId));
  if (JSON.stringify(all).includes(MARK)) places.push("talk_turns");
  if (JSON.stringify(await attemptsOf(sessionId)).includes(MARK))
    places.push("attempts");
  if (sent.posts.some((b) => b.includes(MARK))) places.push("쪽이 보낸 POST");
  if ((await fakeAiRequests()).some((r) => r.bodyText.includes(MARK)))
    places.push("AI 요청");
  return places;
}

/** 실패 때 붙일 대본 기록(검토 M-9 — 첫 CI 실패를 차례 밀림과 앱 결함으로 가르는 첫 단서). 쪽이 닫혔으면 읽은 만큼만. */
export async function discardTraceOf(
  page: Page,
  s: DiscardScript,
): Promise<Record<string, unknown>> {
  const trace: Record<string, unknown> = { roles: s.roles };
  try {
    const record = await speechRecord(page);
    trace.calls = record.calls;
    trace.spoken = record.spoken;
    trace.spokenAt = record.spokenAt;
    trace.recognizers = await recognizersOf(page, s);
    trace.watch = await watchOf(page);
  } catch (error) {
    trace.readError = String(error);
  }
  return trace;
}

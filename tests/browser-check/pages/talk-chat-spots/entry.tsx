// 점검 틀: 자리 재현 화면(회화 대화 구조 R plan 'G 의 차례' (나)). talk-chat 쪽과 같은 실제 수업 틀(TalkLessonFrame)과 실제 스타일을 그리되, 가짜
// 서버가 자리 재현 도구(scripts/exp/chat-spots.ts)의 화면 자료(screens.json 의 한 자리 — window.__chatConfig.spot)를 되돌려 튼다: 처음 화면의
// 선생님 차례(앞 차례 또는 그 자리 차례) · 턴 요청마다 흘린 줄과 끝 줄(신호 · 고르기 · 닫는 줄) · 힌트 누름마다의 응답 · 막힌 뒤 설명 · 그만하기
// 뒤 정리. 서버 · DB · 실제 AI 는 부르지 않는다. 시계는 장면이 Playwright 가짜 시계로 움직인다(talk-chat 쪽의 drive.mjs 를 같이 쓴다).
import { createRoot } from "react-dom/client";
import { TalkLessonFrame } from "@/components/conversation/talk-frame";
import type { ChatEndSignal } from "@/core/conversation/chat-turn-core";
import type { ChatReplayLine } from "@/core/conversation/chat-turn-plan";
import { talkSpeechSettingsFrom } from "@/core/conversation/listen";
import { TALK_LOW_BAND } from "@/core/seed/structure";
import { discardSettingsFrom } from "@/core/speech/discard-settings";
import { speechSettingsFrom } from "@/core/speech/listen";
import type { SpeechScript } from "@/core/speech/script";
import { MIC_NOTICE_KEY } from "@/lib/mic-state";
import { installFakeWebSpeech } from "@/lib/speech/fake-web-speech";
import type { TalkLessonView } from "@/server/conversation";
import settingsSeed from "../../../../seed/settings.json";

/** 화면 자료 한 자리(chat-spots.ts SpotScreen 꼴). */
type SpotReply = {
  lines: ChatReplayLine[];
  signal: ChatEndSignal | null;
  turnEnd: string | null;
  close: { en: string; ko?: string } | null;
};
type SpotScreen = {
  id: string;
  label: string;
  trigger: string;
  heard?: string;
  before: { lines: ChatReplayLine[]; signal: ChatEndSignal | null };
  replies: SpotReply[];
  hints: unknown[];
  explain: { ok: true; text: string } | { ok: false } | null;
  wrap: { en: string; ko?: string }[] | null;
  expect: string[];
};

type SpotsConfig = {
  spot: SpotScreen;
  readMs: number;
  gapMs: number;
  hintDelayMs: number;
  explainDelayMs: number;
  recognitions: SpeechScript["recognitions"];
};

const given =
  (window as unknown as { __chatConfig?: Partial<SpotsConfig> }).__chatConfig ??
  {};
const EMPTY: SpotScreen = {
  id: "-",
  label: "-",
  trigger: "none",
  before: { lines: [{ t: "s", en: "Hi!" }], signal: { hint: true } },
  replies: [],
  hints: [],
  explain: null,
  wrap: null,
  expect: [],
};
const cfg: SpotsConfig = {
  spot: EMPTY,
  readMs: 300,
  gapMs: 80,
  hintDelayMs: 800,
  explainDelayMs: 800,
  recognitions: [],
  ...given,
};
const spot = cfg.spot;

// ── 설정(시드 값 그대로) ──
const values = new Map<string, unknown>(
  (
    settingsSeed as { settings: { key: string; value: unknown }[] }
  ).settings.map((s) => [s.key, s.value]),
);
const read = (key: string) => values.get(key);

type Rec = { at: number; body: Record<string, unknown> };
const SESSION = "00000000-0000-4000-8000-0000000000ab";
const TEACHER = {
  key: "mina",
  nameKo: "미나",
  introKo: "",
  traitsKo: [],
  greetingEn: "Hi!",
  color: { room: "#e8fbd8", accent: "#7cc35b" },
  modelPath: "",
  portraitPath:
    "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
  voice: { pitch: 1, prefer: [] },
};
/** 쪽의 아이 이름(화면이 {NAME} 을 채우는 글 — 시험용). */
const PAGE_NAME = "Momo";

let turnNo = 2;
let replyAt = 0;
let hintAt = 0;
const clock = () => performance.now();
const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function lessonNext(no: number, choice: "closing" | "suggestion" | null) {
  return {
    segment: "talk",
    greetingDone: true,
    talkCount: no,
    choice,
    closingAsked: choice === "closing",
    moreRound: 0,
    moreInRound: 0,
    targets: [],
    hints: [],
    flashDontKnow: false,
    silentBlocked: false,
    prep: null,
    firstQuestionDue: false,
    completed: false,
    stuckInSlot: 0,
    turnNo: no,
  };
}

/** 흘린 줄 → 처음 화면의 선생님 차례 꼴(글 한 줄 · 뜻 · 소리 줄). */
function currentOf(lines: readonly ChatReplayLine[]) {
  const en = lines
    .filter((l): l is Extract<ChatReplayLine, { t: "s" }> => l.t === "s")
    .map((l) => l.en)
    .join(" ");
  const ko = lines.find(
    (l): l is Extract<ChatReplayLine, { t: "ko" }> => l.t === "ko",
  )?.ko;
  const sound: { model?: string; answer?: string } = {};
  for (const l of lines) if (l.t === "sound") sound[l.kind] = l.say;
  return {
    lines: [{ en: en === "" ? "…" : en, ...(ko ? { ko } : {}) }],
    sound: Object.keys(sound).length > 0 ? sound : null,
  };
}

const chat = {
  cfg,
  requests: [] as Rec[],
  hintCalls: [] as Rec[],
  explainCalls: [] as Rec[],
  maxAlts: [] as number[],
  liveSessions: 0,
  bareReads: [] as { at: number; text: string }[],
  reads: [] as { at: number; text: string; live: number }[],
  router: { refresh: 0, push: [] as string[] },
  actions: [] as { at: number; name: string; input: unknown }[],
  pageErrors: [] as string[],
  async action(name: string, input: unknown): Promise<unknown> {
    chat.actions.push({ at: clock(), name, input });
    if (name === "revealTalkLessonHint") {
      const body = (input ?? {}) as Record<string, unknown>;
      if (body.explain === true) {
        chat.explainCalls.push({ at: clock(), body });
        await wait(cfg.explainDelayMs);
        return spot.explain ?? { ok: false };
      }
      chat.hintCalls.push({ at: clock(), body });
      const reply = spot.hints[hintAt];
      hintAt += 1;
      await wait(cfg.hintDelayMs);
      return reply ?? { ok: false, retry: false };
    }
    if (name === "loadTalkLessonView") return viewOf();
    if (name === "markTalkNotice") return { ok: true };
    if (name === "stopTalkLesson")
      return spot.wrap
        ? { ok: true, wrap: wrapOf(spot.wrap) }
        : { ok: false, reason: "needs_confirm" };
    if (name === "leaveTalkLesson") return { ok: true, closed: false };
    if (name === "talkClosingStatus") return { ok: true, closing: "none" };
    if (name === "reportSessionMic" || name === "recheckAiRest")
      return { ok: true };
    return { ok: false, reason: "unavailable" };
  },
};
(window as unknown as { __chat: typeof chat }).__chat = chat;
window.addEventListener("error", (e) =>
  chat.pageErrors.push(String(e.message)),
);

function streamOf(lines: object[]) {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      await wait(cfg.gapMs);
      if (i >= lines.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(`${JSON.stringify(lines[i])}\n`));
      i += 1;
    },
  });
}

function replyLines(reply: SpotReply): object[] {
  if (reply.close)
    return [
      ...reply.lines,
      { t: "close", reason: "safety", farewell: reply.close },
    ];
  turnNo += 1;
  const choice =
    reply.turnEnd === "closing" || reply.turnEnd === "suggestion"
      ? reply.turnEnd
      : null;
  return [
    ...reply.lines,
    {
      t: "end",
      lesson: lessonNext(turnNo, choice),
      chat: reply.signal ?? {},
    },
  ];
}

window.fetch = (async (
  _url: unknown,
  init?: { body?: string; signal?: AbortSignal },
) => {
  const body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
  chat.requests.push({ at: clock(), body });
  const reply = spot.replies[replyAt];
  replyAt += 1;
  return new Response(streamOf(reply ? replyLines(reply) : [{ t: "error" }]));
}) as typeof fetch;

installFakeWebSpeech({
  name: "talk-chat-spots-check",
  source: "손으로 씀 — 브라우저 점검 talk-chat-spots 쪽",
  expose: { recognition: "webkit", synthesis: true },
  recognitions: cfg.recognitions,
  synthesis: {
    voices: [
      { name: "Samantha", lang: "en-US", localService: true, default: true },
    ],
    utterances: [{ startAfter: 0, endAfter: cfg.readMs }],
  },
});
{
  const synth = window.speechSynthesis;
  const speak = synth.speak.bind(synth);
  synth.speak = (u: SpeechSynthesisUtterance) => {
    const entry = { at: clock(), text: u.text, live: chat.liveSessions };
    chat.reads.push(entry);
    if (entry.live === 0) chat.bareReads.push({ at: entry.at, text: u.text });
    speak(u);
  };
}
try {
  window.localStorage.setItem(MIC_NOTICE_KEY, "2026-11-13T00:00:00.000Z");
} catch {
  // 저장소를 못 쓰면 마이크 안내가 한 번 뜬다
}

function viewOf(): TalkLessonView {
  const current = currentOf(spot.before.lines);
  return {
    sessionId: SESSION,
    version: `${turnNo}`,
    level: 3,
    unit: 1,
    lessonNo: 1,
    kind: "regular",
    retry: false,
    title: "자리 재현",
    englishName: PAGE_NAME,
    card: { topic: "nature", todayTopicsKo: ["바다", "하루"] },
    spec: { band: TALK_LOW_BAND, koMeaning: true },
    segment: "talk",
    step: { kind: "child" },
    position: {
      phase: "talk",
      greetingDone: true,
      talkCount: turnNo,
      moreCount: 0,
      moreRound: 0,
      moreInRound: 0,
      choice: null,
      closingAsked: false,
      closingAnswered: false,
      prepPending: false,
      flashDontKnow: false,
      silentBlocked: false,
      lastCause: null,
      childTurns: 1,
      stuckInSlot: 0,
    },
    log: [],
    current: {
      turnNo,
      kind: null,
      lines: current.lines,
      sound: current.sound,
      app: [],
      item: null,
      hints: [],
      chat: spot.before.signal ?? {},
    },
    retryTurn: null,
    retryLead: null,
    prep: null,
    waitLines: ["Hmm, let me think."],
    talkShortLines: {
      again: [{ en: "Can you say that again?", ko: "다시 말해 줄래?" }],
      mic: [{ en: "One moment.", ko: "잠깐만." }],
    },
    settings: {
      speech: speechSettingsFrom(read),
      talkSpeech: talkSpeechSettingsFrom(read),
      discard: discardSettingsFrom(read),
      maxRetries: read("speech.max_retries") as number,
      silentItemsMax: read("speech.silent_items_max") as number,
      ui: {
        waitHintSeconds: read("ui.wait_hint_seconds") as [number, number],
        matchPhraseLevels: read("ui.match_phrase_levels") as [number, number],
        autoNextSeconds: read("ui.auto_next_seconds") as number,
      },
      talk: {
        confirmSeconds: read("talk.confirm_seconds") as number,
        hintReadMatch: read("talk.hint_read_match") as number,
        dontknowMax: read("talk.dontknow_max") as number,
        moreRoundTurns: read("talk.more_talk_round_turns") as number,
        nospeechDontknowCount: read("talk.nospeech_dontknow_count") as number,
        waitLineSeconds: read("talk.wait_line_seconds") as number,
      },
      feedbackTimeoutSeconds: read("ai.timeout_seconds.feedback") as number,
    },
    pictures: {},
    homophones: [],
    lemmaEntries: [],
    friendship: { value: 1, max: 10 },
    noticesSeen: {
      talk_intro: true,
      talk_hint_nudge: true,
      talk_answer_tip: true,
    },
    resting: false,
    teacher: TEACHER,
    teacherChoices: [],
    teacherSettings: {
      render: "portrait",
      loadTimeoutSeconds: 5,
      praiseSeconds: 2,
    },
  } as unknown as TalkLessonView;
}

/** 정리 자료(WrapView 꼴 — 되짚을 말은 자리 재현 도구가 낸 정리 줄). */
function wrapOf(lines: { en: string; ko?: string }[]) {
  return {
    lines: lines.map((l) => ({ ...l, source: "recast" })),
    farewell: { en: "Bye, {NAME}!", ko: "안녕!" },
    aborted: false,
    retry: false,
    kind: "regular",
    starsPerLesson: 1,
    metWords: [],
    friendship: null,
    nextLesson: null,
  };
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <TalkLessonFrame view={viewOf()} />,
);

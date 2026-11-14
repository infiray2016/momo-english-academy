// 점검 틀: 이야기 방식 화면(회화 대화 구조 R plan 묶음 W — spec 설계 6 · 7 · 11). 실제 수업 틀(TalkLessonFrame — talk-frame · child-turn · tori ·
// talk-log)을 앱의 실제 스타일로 그리고, 서버 액션 · 턴 요청(fetch) · 음성(가짜 Web Speech)만 쪽 안의 가짜로 바꾼다. 장면은 열기 전에
// window.__chatConfig 로 서버 응답 · 끝 줄 신호 · 음성 대본을 정하고(addInitScript), 연 뒤 window.__chat 의 기록(턴 요청 · 힌트 · 설명 호출 ·
// 인식 객체의 maxAlternatives · 인식 세션이 열린 동안의 읽기)을 읽는다. 시계는 장면이 Playwright 가짜 시계로 움직인다.
// mode old 는 기존 두 방식의 화면(끝 줄 · 이어 하기 자료에 chat 칸이 없음)이다 — 고친 틀에서도 아무 기능이 켜지지 않는지 본다.
import { createRoot } from "react-dom/client";
import { TalkLessonFrame } from "@/components/conversation/talk-frame";
import type { ChatEndSignal } from "@/core/conversation/chat-turn-core";
import { talkSpeechSettingsFrom } from "@/core/conversation/listen";
import { TALK_LOW_BAND } from "@/core/seed/structure";
import { discardSettingsFrom } from "@/core/speech/discard-settings";
import { speechSettingsFrom } from "@/core/speech/listen";
import type { SpeechScript } from "@/core/speech/script";
import { MIC_NOTICE_KEY } from "@/lib/mic-state";
import { installFakeWebSpeech } from "@/lib/speech/fake-web-speech";
import type { TalkLessonView } from "@/server/conversation";
import settingsSeed from "../../../../seed/settings.json";

type Reply =
  /** 보통 응답: 선생님 문장 하나 · 뜻 · 끝 줄(신호는 chat 이 있으면 그것, 없으면 설정의 신호). */
  | {
      kind: "turn";
      chat?: ChatEndSignal | null;
      stuck?: number;
      choice?: "closing" | "suggestion" | null;
      /** 끝 줄의 대화 첫 질문 차례 값(짧은 준비 없는 이야기 방식 수업에서 참으로 남는 꼴). */
      firstQuestionDue?: boolean;
      /** 모든 줄(문장 · 뜻 · 끝 줄)을 한 덩이로 보냄(서버 다시 흘림 replayChat · 잡아 둔 줄과 끝 줄이 망에서 붙은 꼴 — 처리기가 한 번에 돎). */
      burst?: boolean;
    }
  /** 서버가 받지 않음(stale — 상한 등). */
  | { kind: "stale" }
  /**
   * 줄 없이 끊김(망 오류). saved 면 서버는 그 차례를 끝내 선생님 행을 저장했고(화면 자료가 새 행), orphan 이면 조용함 아이 행만 남겼다(화면 자료의
   * retryLead quiet).
   */
  | { kind: "offline"; saved?: boolean; orphan?: boolean }
  /** 선생님 줄 둘(문장 · 뜻)을 흘린 뒤 끝 줄 없이 끊김(서버는 그 차례를 저장함). */
  | { kind: "cut" }
  /** 안전 상한 차례: 문장 줄 없이 닫는 줄 하나(끝인사의 이름 자리 {NAME}). */
  | { kind: "close-safety" }
  /** 오류 줄. */
  | { kind: "error" }
  /** 'AI 쉬는 중'(쉼 줄). */
  | { kind: "resting" }
  /** 끝 줄 없이 오래 기다림(응답이 오지 않음). */
  | { kind: "hang" };

type HintStep = { delayMs?: number; reply: unknown };

type ChatConfig = {
  mode: "chat" | "old";
  /** 처음 자료 · 보통 응답의 끝 줄 신호(mode old 면 쓰지 않음). */
  signal: ChatEndSignal;
  /** 처음 자료의 이어진 막힘 수(stuckInSlot — 둘째 막힘 저절로 열림). */
  stuck: number;
  /** 선생님 읽기 한 번의 길이(ms, 가짜 읽어 주기). */
  readMs: number;
  /** 흘림 줄 사이(ms). */
  gapMs: number;
  /** speech.discard_mode(off · all). */
  discard: "off" | "all";
  /** 턴 요청마다 차례로 쓸 응답(모자라면 보통 응답). */
  replies: Reply[];
  /** 힌트 호출마다 차례로 쓸 응답(모자라면 보통 성공). */
  hints: HintStep[];
  /** 보통 힌트의 단 수(2 · 3) · 늦음(ms). */
  hintTiers: 2 | 3;
  hintDelayMs: number;
  /** 막힌 뒤 설명 응답: 늦음(ms) · 성공(글) 또는 실패. */
  explain: { delayMs: number; ok: boolean };
  /** 가짜 인식 대본(누름마다 차례로). */
  recognitions: SpeechScript["recognitions"];
  /** 처음 기록 칸의 지난 차례 쌍 수(넘김 장면). */
  pairs: number;
  /** 선생님 차례마다 붙일 따라 할 문장(1~3단계 소리 줄 — 없으면 null). */
  sound: string | null;
  /** 시드 설정값 가운데 장면이 바꿀 것(speech.deaf_detect 등). */
  settings: Record<string, unknown>;
};

const params = new URLSearchParams(location.search);
const given =
  (window as unknown as { __chatConfig?: Partial<ChatConfig> }).__chatConfig ??
  {};
const cfg: ChatConfig = {
  mode: (params.get("mode") as ChatConfig["mode"] | null) ?? "chat",
  signal: { quietSeconds: 8, hint: true, alternatives: 2 },
  stuck: 0,
  readMs: 600,
  gapMs: 100,
  discard: "off",
  replies: [],
  hints: [],
  hintTiers: 3,
  hintDelayMs: 1500,
  explain: { delayMs: 2000, ok: true },
  recognitions: [
    {
      events: [
        { at: 50, type: "start" },
        { at: 80, type: "audiostart" },
        { at: 300, type: "soundstart" },
        { at: 400, type: "speechstart" },
        {
          at: 900,
          type: "result",
          results: [{ transcript: "I like it", isFinal: true }],
        },
        { at: 950, type: "speechend" },
      ],
    },
  ],
  pairs: 3,
  sound: null,
  settings: {},
  ...given,
};
const chatMode = cfg.mode === "chat";

// ── 설정(시드 값 그대로 — speech.discard_mode 만 장면이 정함) ──
const values = new Map<string, unknown>(
  (
    settingsSeed as { settings: { key: string; value: unknown }[] }
  ).settings.map((s) => [s.key, s.value]),
);
values.set("speech.discard_mode", cfg.discard);
for (const [key, value] of Object.entries(cfg.settings)) values.set(key, value);
const read = (key: string) => values.get(key);

// ── 기록 ──
type Rec = {
  at: number;
  body: Record<string, unknown>;
};
const SESSION = "00000000-0000-4000-8000-0000000000aa";
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
const SENTENCES = [
  "That sounds fun!",
  "I went to the lake once.",
  "It was so sunny that day.",
  "Do you like the water?",
  "I like ducks a lot.",
];
const HINT_TEXT = [
  "나는 오리가 좋아요.",
  "I like ___.",
  "I like ducks, {NAME}.",
];

/** 지금 선생님 행 번호(처음 기록 칸의 지난 차례 뒤). */
let turnNo = cfg.pairs + 1;
/** 서버에 끊긴 조용함 아이 행이 남았는가(화면 자료의 retryLead quiet). */
let orphan = false;
/** 안전 상한 차례의 카드 끝인사(이름 자리). */
const FAREWELL = "Thank you for talking with me, {NAME}. Bye!";
let replyAt = 0;
let hintAt = 0;
const clock = () => performance.now();
const wait = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function lessonNext(
  no: number,
  stuck: number,
  choice: "closing" | "suggestion" | null,
) {
  return {
    segment: "talk",
    greetingDone: true,
    talkCount: no,
    choice,
    closingAsked: false,
    moreRound: 0,
    moreInRound: 0,
    targets: [],
    hints: [],
    flashDontKnow: false,
    silentBlocked: false,
    prep: null,
    firstQuestionDue: false,
    completed: false,
    stuckInSlot: stuck,
    turnNo: no,
  };
}

const chat = {
  cfg,
  requests: [] as Rec[],
  hintCalls: [] as Rec[],
  explainCalls: [] as Rec[],
  /** 인식 객체를 start 할 때의 maxAlternatives(차례대로). */
  maxAlts: [] as number[],
  /** 인식 세션이 열려 있는 수(start ~ end) · 읽기를 시작한 때 열린 세션이 없던 읽기의 글(세션 없이 읽음). */
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
        await wait(cfg.explain.delayMs);
        return cfg.explain.ok
          ? { ok: true, text: "선생님이 호수에 간 이야기를 했어요." }
          : { ok: false };
      }
      chat.hintCalls.push({ at: clock(), body });
      if (!chatMode) return { ok: false };
      const step = cfg.hints[hintAt];
      hintAt += 1;
      const tier = typeof body.tier === "number" ? body.tier : 0;
      await wait(step?.delayMs ?? cfg.hintDelayMs);
      if (step) return step.reply;
      const kinds =
        cfg.hintTiers === 3
          ? [
              { kind: "ko" },
              { kind: "frame" },
              { kind: "sentence", listen: true },
            ]
          : [{ kind: "ko" }, { kind: "sentence", listen: true }];
      const text =
        cfg.hintTiers === 3
          ? HINT_TEXT[tier]
          : [HINT_TEXT[0], HINT_TEXT[2]][tier];
      return text === undefined
        ? { ok: false, retry: false }
        : { ok: true, tiers: kinds, tier, text };
    }
    if (name === "loadTalkLessonView") return viewOf();
    if (name === "markTalkNotice") return { ok: true };
    if (name === "stopTalkLesson")
      return { ok: false, reason: "needs_confirm" };
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

// ── 가짜 턴 요청(흘림 줄을 되돌려 틀기) ──
function streamOf(
  lines: object[],
  { cut, burst = false }: { cut: boolean; burst?: boolean },
) {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      await wait(cfg.gapMs);
      if (burst && i < lines.length) {
        controller.enqueue(
          encoder.encode(lines.map((l) => `${JSON.stringify(l)}\n`).join("")),
        );
        i = lines.length;
        return;
      }
      if (i >= lines.length) {
        if (cut) controller.error(new TypeError("network"));
        else controller.close();
        return;
      }
      controller.enqueue(encoder.encode(`${JSON.stringify(lines[i])}\n`));
      i += 1;
    },
  });
}

function turnLines(reply: Extract<Reply, { kind: "turn" }>): object[] {
  turnNo += 1;
  const sentence = SENTENCES[(turnNo - 2) % SENTENCES.length] as string;
  const signal = reply.chat === undefined ? cfg.signal : reply.chat;
  return [
    { t: "s", en: sentence },
    { t: "ko", ko: "재미있겠다!" },
    ...(cfg.sound ? [{ t: "sound", kind: "model", say: cfg.sound }] : []),
    {
      t: "end",
      lesson: {
        ...lessonNext(turnNo, reply.stuck ?? 0, reply.choice ?? null),
        firstQuestionDue: reply.firstQuestionDue === true,
      },
      ...(chatMode && signal ? { chat: signal } : {}),
    },
  ];
}

window.fetch = (async (
  _url: unknown,
  init?: { body?: string; signal?: AbortSignal },
) => {
  const body = JSON.parse(init?.body ?? "{}") as Record<string, unknown>;
  chat.requests.push({ at: clock(), body });
  const reply: Reply = cfg.replies[replyAt] ?? { kind: "turn" };
  replyAt += 1;
  if (reply.kind === "offline") {
    if (reply.saved) turnNo += 1;
    if (reply.orphan) orphan = true;
    await wait(cfg.gapMs);
    throw new TypeError("network");
  }
  if (reply.kind === "cut")
    return new Response(
      streamOf(turnLines({ kind: "turn" }).slice(0, 2), { cut: true }),
    );
  if (reply.kind === "close-safety")
    return new Response(
      streamOf(
        [
          {
            t: "close",
            reason: "safety",
            farewell: { en: FAREWELL, ko: "오늘 고마워, {NAME}!" },
          },
        ],
        { cut: false },
      ),
    );
  if (reply.kind === "hang")
    return new Response(
      new ReadableStream({ pull: () => new Promise(() => {}) }),
    );
  const lines =
    reply.kind === "stale"
      ? [{ t: "stale" }]
      : reply.kind === "error"
        ? [{ t: "error" }]
        : reply.kind === "resting"
          ? [{ t: "resting" }]
          : turnLines(reply);
  return new Response(
    streamOf(lines, {
      cut: false,
      burst: reply.kind === "turn" && reply.burst === true,
    }),
  );
}) as typeof fetch;

// ── 가짜 음성(인식 · 읽어 주기) — 인식 객체의 maxAlternatives 와 열린 세션 동안의 읽기를 남긴다 ──
installFakeWebSpeech({
  name: "talk-chat-check",
  source: "손으로 씀 — 브라우저 점검 talk-chat 쪽",
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
  const w = window as unknown as Record<string, unknown>;
  const Base = w.webkitSpeechRecognition as {
    new (): EventTarget & { maxAlternatives: number; start(): void };
  };
  class Watched extends Base {
    start() {
      chat.maxAlts.push(this.maxAlternatives);
      let open = false;
      const onStart = () => {
        if (!open) {
          open = true;
          chat.liveSessions += 1;
        }
      };
      const onEnd = () => {
        if (open) {
          open = false;
          chat.liveSessions -= 1;
        }
        this.removeEventListener("end", onEnd);
      };
      // start() 를 부른 때부터 end 까지를 열린 세션으로 본다(audiostart 전에도 세션은 열려 있음)
      onStart();
      this.addEventListener("end", onEnd);
      super.start();
    }
  }
  Object.defineProperty(window, "webkitSpeechRecognition", {
    value: Watched,
    configurable: true,
    writable: true,
  });
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
  // 저장소를 못 쓰면 마이크 안내가 한 번 뜬다(장면이 누른다)
}

// ── 화면 자료 ──
function logOf(pairs: number) {
  return Array.from({ length: pairs }, (_, i) => [
    {
      speaker: "teacher",
      turnNo: i + 1,
      segment: "talk",
      kind: null,
      lines: [{ en: "Nice! I like it too.", ko: "좋아! 나도 그거 좋아." }],
    },
    {
      speaker: "child",
      turnNo: i + 1,
      segment: "talk",
      text: "I like it.",
      input: "speech",
    },
  ]).flat();
}

function viewOf(): TalkLessonView {
  const no = turnNo;
  return {
    sessionId: SESSION,
    version: `${no}`,
    level: 3,
    unit: 1,
    lessonNo: 1,
    kind: "regular",
    retry: false,
    title: "가족과 호수 나들이",
    englishName: "Momo",
    card: { topic: "lake", todayTopicsKo: ["호수에 가기", "오리 보기"] },
    spec: { band: TALK_LOW_BAND, koMeaning: true },
    segment: "talk",
    step: orphan ? { kind: "retry" } : { kind: "child" },
    position: {
      phase: "talk",
      greetingDone: true,
      talkCount: no,
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
      childTurns: cfg.pairs,
      stuckInSlot: cfg.stuck,
    },
    log: logOf(cfg.pairs),
    current: {
      turnNo: no,
      kind: null,
      lines: [
        { en: "Hi Momo! What did you do today?", ko: "안녕! 오늘 뭐 했어?" },
      ],
      sound: cfg.sound ? { model: cfg.sound } : null,
      app: [],
      item: null,
      hints: [],
      ...(chatMode ? { chat: cfg.signal } : {}),
    },
    retryTurn: null,
    retryLead: orphan ? "quiet" : null,
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

createRoot(document.getElementById("root") as HTMLElement).render(
  <TalkLessonFrame view={viewOf()} />,
);

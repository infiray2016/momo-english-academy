// 회화 이야기 방식(intent 2026-11-13-회화-대화-구조-R)의 켜기 전 관문 (나) 자리 재현 도구(plan 'G 의 차례' (나) · spec 설계 13 '자리 재현 실호출').
// 대본 도구(scripts/talk-observe.ts)의 이야기 방식 길(createTalkSim · runChatScenario — 서버 턴 길과 같은 core 함수)로 짧은 대본 일곱 벌을 돌려
// 열여섯 자리에 닿게 하고, 자리마다 그 차례의 사용자 메시지(보낸 글 전문) · 응답 원문 · 나간 글(말풍선 · 뜻 · 소리 줄 · 앱이 붙인 물음 · 두 단추 ·
// 닫는 줄 · 힌트 단 · 설명) · 앱 판단(토막 · 사실 줄 · 끝 줄 신호 · 알림 · 힌트 단)을 JSON(spots.json)과 읽는 글(spots.md)로 남긴다. 화면 재현
// 장면(tests/browser-check/scenes/chat-spots.mjs)이 읽는 작은 화면 자료(screens.json)도 함께 쓴다. 한국어 도움 뒤 자리는 K 로 미뤘다(열여섯 자리).
// 실행: node --import tsx scripts/exp/chat-spots.ts [--live] [--max-calls N] [--out <폴더>] [--level 3] [--unit 1] [--lesson 1]
// 단계 · 단원 · 수업 인자(13절 C254 · 분석 S6)가 없으면 회화 3단계 단원 1 수업 1 이다. 대본 일곱과 자리 조건은 3단계 수업 1 에 맞춰 쓴 것이라
// 다른 자리에서는 닿지 못하는 자리(짧은 준비 · 1~3단계 소리 줄 · 3단계 힌트 틀)가 까닭과 함께 남는다.
// 기본은 가짜 응답(tests/fixtures/ai/fake-anthropic 의 흘려 받기 꼴)이다. --live 를 줄 때만 실호출하고, 부르기 전에 부를 호출 수와 어림 비용을 찍으며
// 최악 수(힌트 다시 받기 포함)가 --max-calls(기본 30)를 넘으면 부르지 않고 끝낸다. 실호출은 자리에 닿는 호출(자리 표지가 붙은 호출)만이고, 자리까지
// 가는 앞 차례(수업 첫 말 · 인사 · 돌아옴 · 채움 차례)는 실호출에서도 대본의 가짜 응답을 깐다(talk-observe --anchored 와 같은 뜻 — 자리를 정해진
// 자리에서 보려는 것). 자리 표지가 붙은 차례는 응답이 그 자리의 조건을 세우지 않아도 늘 결과에 남고 '닿지 못함'과 까닭이 붙으며, 실호출 표지가
// 가짜 실행과 다른 차례에 붙으면 '자리 밀림' 조건이 서지 않는다. spots.json 에는 대본별 호출 기록 전부(scripts)도 쓴다.
// 키는 .env.local 의 ANTHROPIC_API_KEY(값을 출력하지 않는다). DB 를 쓰지 않는다. 아이 이름은 쓰지 않는다(아이 말의 이름은 시험용 가짜 이름 목록
// SAMPLE_NAMES 이고 보낸 글에서는 {NAME} 으로 가려진다). 결과는 --out(기본: 운영체제 임시 폴더)에 쓴다.
import { mkdirSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic, { APIError } from "@anthropic-ai/sdk";
import { answerTextOf } from "../../src/core/ai/calls/common";
import type { TalkChatOutput } from "../../src/core/ai/calls/talk-chat";
import type { TalkChatHintOutput } from "../../src/core/ai/calls/talk-chat-hint";
import type { ChatHintReply } from "../../src/core/conversation/chat-hints";
import { CHAT_UNSURE_ON_PARTIAL_KEY } from "../../src/core/conversation/chat-message";
import { TALK_CHAT_READER_KEYS } from "../../src/core/conversation/chat-stream-check";
import type { ChatEndSignal } from "../../src/core/conversation/chat-turn-core";
import type { ChatReplayLine } from "../../src/core/conversation/chat-turn-plan";
import { TALK_LEAD_MODE_KEY } from "../../src/core/conversation/lead-mode";
import { createToriEnReader } from "../../src/core/conversation/stream";
import {
  createFakeAnthropic,
  type FakeAnthropic,
  messageBody,
} from "../../tests/fixtures/ai/fake-anthropic";
import { SAMPLE_NAMES } from "../../tests/fixtures/ai/sample-inputs";
import {
  createScriptClient,
  loadScriptConfig,
  readApiKey,
  type ScriptConfig,
} from "../ai-contract";
import {
  type CallResult,
  type ChatCallKind,
  type ChatScenarioRun,
  type ChatScenarioTurn,
  createTalkSim,
  type Materials,
  materialsOf,
  type ObserveStep,
  type PreparedTurn,
  readSeedFiles,
  runChatScenario,
  type SettingValue,
} from "../talk-observe";

/** 기본 자리(회화 3단계 단원 1 수업 1 — 지난 자리 재현 그대로). --level · --unit · --lesson 으로 바꾼다. */
export const DEFAULT_SPOT_WHERE = { level: 3, unit: 1, lesson: 1 } as const;
export type SpotWhere = { level: number; unit: number; lesson: number };
const TEACHER = "mina";
/** 수업 시작 시각(서울 토요일 아침 — 수업 시작 줄의 요일 · 때를 실행마다 같게). */
const CHAT_AT = new Date("2026-11-14T01:00:00.000Z");
/** 실호출 상한의 기본값(부를 호출 수가 이보다 많으면 부르지 않는다 — plan 어림 G (나) 0.1달러 안팎의 위). */
export const DEFAULT_MAX_CALLS = 30;
/**
 * 호출 하나의 어림 비용(달러 — 실행 전 안내에만 쓴다, 앱 설정값이 아님). 출처: spec '회화 대화 구조 R' 설계 14 의 어림(대화 호출 차례당 0.002 ·
 * 힌트 호출 0.003 안팎 — scripts/exp/chat-call-samples.ts 와 같은 값).
 */
const EST_USD_PER_DIALOG = 0.002;
const EST_USD_PER_HELP = 0.003;
/** 시험용 가짜 이름(아이 이름 자리 — 실제 아이 이름이 아님). */
export const SPOT_CHILD_NAME = SAMPLE_NAMES.englishName ?? "Ganada";
/** 가린 이름 자리(서버 가림과 같은 글). */
export const NAME_SLOT = "{NAME}";

// ── 열여섯 자리 ─────────────────────────────────────────────────

export const SPOT_IDS = [
  "first_words",
  "greeting_end",
  "back",
  "quiet_twice",
  "wait_after_cap",
  "not_heard",
  "closing",
  "wrap_after_suggestion",
  "safety_last",
  "recognizer",
  "listen_sentence",
  "stuck_choice",
  "stuck_explain",
  "hint_no_question",
  "hint_no_frame",
  "name_mask",
] as const;
export type SpotId = (typeof SPOT_IDS)[number];

/** 자리 이름(spec 설계 13 '자리 재현 실호출' 줄의 차례 · 글 그대로). */
export const SPOT_LABELS: Readonly<Record<SpotId, string>> = {
  first_words: "수업 첫 말",
  greeting_end: "인사 끝 차례(짧은 준비가 열림)",
  back: "짧은 준비 뒤 돌아옴",
  quiet_twice: "조용함 입구 둘이 잇달아",
  wait_after_cap: "상한 뒤 기다림",
  not_heard: "눌렀으나 들리지 않음",
  closing: "앱의 마무리 차례",
  wrap_after_suggestion: "wrap_up 뒤 정리",
  safety_last: "안전 상한 차례",
  recognizer: "인식기 알림(다른 후보 있음 · 없음 · 중간 결과만)",
  listen_sentence: "1~3단계 따라 할 문장(say 에 듦 · 어긋남)",
  stuck_choice: "막힌 뒤 고르기 물음",
  stuck_explain: "막힌 뒤 설명",
  hint_no_question: "질문 없는 차례의 힌트",
  hint_no_frame: "3단계 틀 재료가 없는 차례의 힌트",
  name_mask: "아이가 제 이름을 말한 차례({NAME} 가림)",
};

// ── 사용자 메시지의 글(core chat-message 의 글 그대로 — 조건 대조용) ─────────────

export const MESSAGE_TEXT = {
  start: "(The chat starts now.",
  back: "(The child is back from a short word practice in the app.)",
  quiet: "(The child did not press the talk button.)",
  notHeard:
    "(The child pressed the talk button, but the app could not hear any words.)",
  dontKnow: `(The child pressed the "I don't know" button.)`,
  prepNext:
    "After your turn the app does a short word practice with the child, and then your chat goes on.",
  closing: "This is the closing turn.",
  lastTurn: "This is the last turn of today's chat.",
  unsure: "(The recognizer was unsure about this.)",
  unsureAlt: "It may also have been:",
} as const;

// ── 대본 ────────────────────────────────────────────────────────

/** 대화 호출 하나의 응답(자리 표지가 있으면 실호출 때 그 호출만 실제로 부른다). */
type DialogReply = { spot: SpotId | null; answer: TalkChatOutput };
/** 힌트 · 설명 호출 하나의 응답. */
type HelpReply = { spot: SpotId | null; answer: TalkChatHintOutput };

export type SpotScript = {
  name: string;
  title: string;
  /** 이 대본만 덮는 설정값(메모리에서만 — 설정 파일은 그대로). */
  settings: Readonly<Record<string, SettingValue>>;
  steps: readonly ObserveStep[];
  /** 대화 호출 차례대로의 응답(모자라면 fill). */
  dialog: readonly DialogReply[];
  /** 사용자 메시지에 이 글이 들면 차례보다 먼저 이 응답(앱 셈으로 차례가 정해지는 마무리 · 안전 상한 자리). 한 번만 쓴다. */
  byMessage?: readonly (DialogReply & { includes: string })[];
  /** 남은 대화 호출의 채움 응답(차례마다 돌려 씀). */
  fill: readonly TalkChatOutput[];
  /** 힌트 · 설명 호출 차례대로의 응답. */
  help: readonly HelpReply[];
  /** 대본이 고르기 차례 · 닫힘에 닿아 멈추면 그 자리에서 자르고 이 차례를 붙인다(가짜 실행 한 번으로 자리를 정함). */
  afterStop?: ObserveStep;
};

const say = (
  text: string,
  over: Partial<TalkChatOutput> = {},
): TalkChatOutput => ({
  listen_sentence: "",
  say: text,
  say_ko: "",
  wrap_up: false,
  ...over,
});

/**
 * 채움 차례: 아이 말(CHILD_LINES)과 짝을 이루는 서로 다른 선생님 말(검토 rev-g-spots M-2 — 되풀이 세 줄이면 실호출 자리가 그 이력의 되풀이에 끌릴
 * 수 있다). 채움 응답은 아이 말 차례와 같은 차례로 쓰이므로(두 목록 길이가 같아 돌려 써도 짝이 맞음) 아이 말 i 에 선생님 말 i 가 이어진다.
 */
const FILL_PAIRS: readonly [child: string, teacher: TalkChatOutput][] = [
  [
    "I like the beach.",
    say("The beach is fun! Who do you go with?", {
      say_ko: "바닷가 재밌지! 누구랑 가?",
    }),
  ],
  [
    "I go with my mom.",
    say("With your mom, nice. What do you eat there?", {
      say_ko: "엄마랑, 좋다. 거기서 뭐 먹어?",
    }),
  ],
  [
    "I eat ice cream.",
    say("Ice cream at the beach is the best!", {
      say_ko: "바닷가 아이스크림이 최고지!",
    }),
  ],
  [
    "The sea is blue.",
    say("Yes, so blue. Do you go in the water?", {
      say_ko: "응, 정말 파래. 물에 들어가?",
    }),
  ],
  [
    "I see fish.",
    say("Wow, fish! Are they big?", { say_ko: "와, 물고기! 커?" }),
  ],
  [
    "They are small.",
    say("Small fish are cute. What color are they?", {
      say_ko: "작은 물고기 귀엽지. 무슨 색이야?",
    }),
  ],
  [
    "They are yellow.",
    say("Yellow fish! I want to see them too.", {
      say_ko: "노란 물고기! 나도 보고 싶다.",
    }),
  ],
  [
    "I play in the sand.",
    say("Sand is fun. Do you make a castle?", {
      say_ko: "모래 재밌지. 성 만들어?",
    }),
  ],
  [
    "I make a big castle.",
    say("A big castle! That sounds great.", {
      say_ko: "큰 성! 멋지다.",
    }),
  ],
  [
    "My dad helps me.",
    say("Your dad helps. That is nice. Is it hot?", {
      say_ko: "아빠가 도와주는구나. 좋다. 더워?",
    }),
  ],
  [
    "It is very hot.",
    say("Hot days are good for the sea.", {
      say_ko: "더운 날은 바다 가기 좋지.",
    }),
  ],
  [
    "I wear a hat.",
    say("Good idea. What color is your hat?", {
      say_ko: "좋은 생각이야. 모자 무슨 색이야?",
    }),
  ],
  [
    "My hat is red.",
    say("A red hat! I have a green one.", {
      say_ko: "빨간 모자! 나는 초록 모자 있어.",
    }),
  ],
  [
    "I like green.",
    say("Me too. Green is like the trees.", {
      say_ko: "나도. 초록은 나무 같아.",
    }),
  ],
  [
    "I am happy.",
    say("I am happy too. You tell good stories.", {
      say_ko: "나도 기뻐. 이야기 잘한다.",
    }),
  ],
];
const FILL: readonly TalkChatOutput[] = FILL_PAIRS.map(([, t]) => t);
const LEAD_START = say("Hi! I'm Mina. How are you today?", {
  say_ko: "안녕! 나는 미나야. 오늘 기분 어때?",
});
const LEAD_GREET = say("Good to hear! I'm happy too.", {
  say_ko: "다행이다! 나도 기뻐.",
});
const LEAD_BACK = say("You did great! What do you eat in the morning?", {
  say_ko: "잘했어! 아침에 뭐 먹어?",
});
const CHILD_LINES = FILL_PAIRS.map(([c]) => c);

const lead = (answer: TalkChatOutput): DialogReply => ({ spot: null, answer });
const leadIn: readonly DialogReply[] = [
  lead(LEAD_START),
  lead(LEAD_GREET),
  lead(LEAD_BACK),
];
const talkSteps = (n: number): ObserveStep[] =>
  Array.from({ length: n }, (_, i) => ({
    say: CHILD_LINES[i % CHILD_LINES.length] as string,
  }));

/** 자리 대본 일곱 벌(중간 결과만은 talk.chat_unsure_on_partial 끔 · 켬 두 벌 — spec N-2). */
export const SPOT_SCRIPTS: readonly SpotScript[] = [
  {
    name: "opening",
    title:
      "수업 첫 말 · 인사 끝 · 돌아옴 · 이름 · 들리지 않음 · 조용함 둘 · 상한 뒤 기다림",
    settings: {},
    steps: [
      { say: "I am good." },
      { say: `My name is ${SPOT_CHILD_NAME}.` },
      { input: "nospeech" },
      { input: "quiet" },
      { input: "quiet" },
      { input: "quiet" },
    ],
    dialog: [
      { spot: "first_words", answer: LEAD_START },
      { spot: "greeting_end", answer: LEAD_GREET },
      {
        spot: "back",
        answer: say("You did great! What is your name?", {
          say_ko: "잘했어! 이름이 뭐야?",
        }),
      },
      {
        spot: "name_mask",
        answer: say(`Nice to meet you, ${NAME_SLOT}! Do you like the sea?`, {
          say_ko: `만나서 반가워, ${NAME_SLOT}! 바다 좋아해?`,
        }),
      },
      {
        spot: "not_heard",
        answer: say("Oh, I could not hear you. Do you like the sea?", {
          say_ko: "앗, 잘 안 들렸어. 바다 좋아해?",
        }),
      },
      {
        spot: "quiet_twice",
        answer: say("It's okay. Take your time.", {
          say_ko: "괜찮아. 천천히 해.",
        }),
      },
      {
        spot: "quiet_twice",
        answer: say("I like the sea. It is so blue.", {
          say_ko: "나는 바다가 좋아. 정말 파래.",
        }),
      },
    ],
    fill: FILL,
    help: [],
  },
  {
    name: "help",
    title:
      "막힌 뒤 고르기 물음 · 막힌 뒤 설명 · 질문 없는 차례의 힌트 · 틀 재료 없는 힌트 · 따라 할 문장",
    settings: {},
    steps: [
      { say: "I am fine." },
      { input: "dont_know" },
      { say: "Rice." },
      { say: "I eat rice egg.", hintTier: 1 },
      { say: "Me drink milk.", hintTier: 2 },
    ],
    dialog: [
      ...leadIn,
      {
        spot: "stuck_choice",
        answer: say("That's okay. Do you eat rice or bread?", {
          say_ko: "괜찮아. 밥 먹어, 빵 먹어?",
        }),
      },
      lead(
        say("Rice is yummy. I eat rice with egg.", {
          say_ko: "밥 맛있지. 나는 밥에 달걀을 먹어.",
        }),
      ),
      {
        spot: "listen_sentence",
        answer: say("Yummy! I eat rice with egg. What do you drink?", {
          listen_sentence: "I eat rice with egg.",
          say_ko: "오, 나도! 뭐 마셔?",
        }),
      },
      {
        spot: "listen_sentence",
        answer: say("Milk is good. Is it cold?", {
          listen_sentence: "I drink milk.",
          say_ko: "우유 좋지. 차가워?",
        }),
      },
    ],
    fill: FILL,
    help: [
      {
        spot: "stuck_explain",
        answer: {
          hint_ko: "나는 밥을 먹어요.",
          hint_en: "I eat rice.",
          explain_ko: "선생님이 밥을 먹는지 빵을 먹는지 물었어요.",
        },
      },
      {
        spot: "hint_no_question",
        answer: {
          hint_ko: "나도 밥에 달걀을 먹어요.",
          hint_en: "I eat rice with egg too.",
          explain_ko: "선생님이 밥에 달걀을 먹는다고 했어요.",
        },
      },
      {
        spot: "hint_no_frame",
        answer: {
          hint_ko: "나는 우유를 좋아해요.",
          hint_en: "I like milk.",
          explain_ko: "선생님이 무엇을 마시는지 물었어요.",
        },
      },
    ],
  },
  {
    name: "closing",
    title: "앱의 마무리 차례(참고 턴까지 채움 차례 — 시드 단계 규격 그대로)",
    settings: {},
    steps: [{ say: "I am fine." }, ...talkSteps(24)],
    dialog: leadIn,
    byMessage: [
      {
        includes: MESSAGE_TEXT.closing,
        spot: "closing",
        answer: say("That was so fun. I liked your beach story.", {
          say_ko: "정말 재미있었어. 바닷가 이야기 좋았어.",
        }),
      },
    ],
    fill: FILL,
    help: [],
    afterStop: { choose: "stop" },
  },
  {
    name: "wrap",
    title: "wrap_up 뒤 정리(선생님이 스스로 맺은 차례 → 그만하기 → 정리)",
    settings: {},
    steps: [
      { say: "I am fine." },
      { say: "I like the beach." },
      { say: "I have to go now. Bye!" },
      { choose: "stop" },
    ],
    dialog: [
      ...leadIn,
      lead(
        say("The beach is fun! Do you swim?", {
          say_ko: "바닷가 재밌지! 수영해?",
        }),
      ),
      {
        spot: "wrap_after_suggestion",
        answer: say("Okay! It was fun to talk with you.", {
          say_ko: "알았어! 이야기해서 즐거웠어.",
          wrap_up: true,
        }),
      },
    ],
    fill: FILL,
    help: [],
  },
  {
    name: "safety",
    title: "안전 상한 차례(talk.safety_max_turns 를 이 대본만 메모리에서 5 로)",
    settings: { "talk.safety_max_turns": 5 },
    steps: [{ say: "I am fine." }, ...talkSteps(8)],
    dialog: leadIn,
    byMessage: [
      {
        includes: MESSAGE_TEXT.lastTurn,
        spot: "safety_last",
        answer: say(`Thank you for talking with me, ${NAME_SLOT}. Bye!`, {
          say_ko: `이야기해 줘서 고마워, ${NAME_SLOT}. 안녕!`,
        }),
      },
    ],
    fill: FILL,
    help: [],
  },
  {
    name: "recognizer",
    title: "인식기 알림 — 다른 후보 있음 · 없음",
    settings: {},
    steps: [
      { say: "I am fine." },
      {
        say: "I see the see.",
        chat: {
          recognizer: { confidence: 0.3, alternative: "I see the sea." },
        },
      },
      { say: "I like fish.", chat: { recognizer: { confidence: 0.3 } } },
    ],
    dialog: [
      ...leadIn,
      {
        spot: "recognizer",
        answer: say("Oh, the sea! Do you like to swim?", {
          say_ko: "오, 바다! 수영 좋아해?",
        }),
      },
      {
        spot: "recognizer",
        answer: say("Fish are cute. What fish do you like?", {
          say_ko: "물고기 귀엽지. 어떤 물고기 좋아해?",
        }),
      },
    ],
    fill: FILL,
    help: [],
  },
  ...[false, true].map(
    (on): SpotScript => ({
      name: on ? "partial-on" : "partial-off",
      title: `인식기 알림 — 중간 결과만(talk.chat_unsure_on_partial ${on ? "켬" : "끔"})`,
      settings: { [CHAT_UNSURE_ON_PARTIAL_KEY]: on },
      steps: [
        { say: "I am fine." },
        {
          say: "I go to the beach.",
          chat: { recognizer: { interimOnly: true } },
        },
      ],
      dialog: [
        ...leadIn,
        {
          spot: "recognizer",
          answer: say("The beach! What do you do there?", {
            say_ko: "바닷가! 거기서 뭐 해?",
          }),
        },
      ],
      fill: FILL,
      help: [],
    }),
  ),
];

// ── 호출(가짜 · 실호출 같은 흘려 받기 길) ──────────────────────────────

/** 호출 하나의 기록(실행 순서대로 — 차례에 다시 붙인다). raw 는 응답 원문(텍스트 블록 글), 실패면 그 까닭. */
export type SpotCall = {
  kind: ChatCallKind;
  spot: SpotId | null;
  live: boolean;
  userMessage: string;
  raw: string;
  ok: boolean;
  latencyMs: number;
};

/** 요청 본문의 마지막 사용자 메시지 글(보낸 글 전문). */
export function lastUserTextOf(body: Record<string, unknown>): string {
  const messages = Array.isArray(body.messages)
    ? (body.messages as { role?: unknown; content?: unknown }[])
    : [];
  const last = [...messages].reverse().find((m) => m.role === "user");
  const content = last?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .map((b) =>
        typeof (b as { text?: unknown }).text === "string"
          ? (b as { text: string }).text
          : "",
      )
      .join("");
  return "";
}

/** 흘려 받기 시도 하나(talk-observe streamTurn 과 같은 꼴 — 베타 stream · maxRetries 0, 대화 호출은 첫 문장 시간을 잰다). */
async function streamCall(
  client: Anthropic,
  kind: ChatCallKind,
  request: PreparedTurn["request"],
): Promise<CallResult> {
  const started = Date.now();
  const reader =
    kind === "dialog" ? createToriEnReader(TALK_CHAT_READER_KEYS) : null;
  let firstSentenceMs: number | null = null;
  const stream = client.beta.messages.stream(
    {
      ...request.body,
      ...(request.betas.length > 0 ? { betas: request.betas } : {}),
    } as never,
    { timeout: request.timeoutMs },
  );
  stream.on("text", (delta) => {
    if (
      reader !== null &&
      reader.push(delta).length > 0 &&
      firstSentenceMs === null
    )
      firstSentenceMs = Date.now() - started;
  });
  try {
    const message = await stream.finalMessage();
    return {
      ok: true,
      message: message as unknown as Extract<
        CallResult,
        { ok: true }
      >["message"],
      latencyMs: Date.now() - started,
      firstSentenceMs,
      requestId: stream.request_id ?? "",
    };
  } catch (error) {
    const status =
      error instanceof APIError && typeof error.status === "number"
        ? error.status
        : 0;
    const detail =
      error instanceof APIError
        ? error.constructor.name
        : error instanceof Error
          ? error.name
          : "Error";
    return { ok: false, status, detail, latencyMs: Date.now() - started };
  }
}

function fakeClientOf(): { client: Anthropic; fake: FakeAnthropic } {
  const fake = createFakeAnthropic([]);
  const client = new Anthropic({
    apiKey: "fake-key",
    authToken: null,
    maxRetries: 0,
    fetch: fake.fetch as unknown as typeof fetch,
  });
  return { client, fake };
}

/** 평가 호출의 가짜 응답(이 도구는 평가를 끄지만 꼴은 둔다). */
const EVAL_FAKE = {
  reading: "clear_answer",
  teacher_move: "react_and_follow_up",
  model_sentence: "",
  child_used_on_own: [],
};

/** 표지 없는 힌트 · 설명 호출의 가짜 응답(대본의 help 가 모자랄 때). */
const DEFAULT_HELP: TalkChatHintOutput = {
  hint_ko: "좋아요.",
  hint_en: "Okay.",
  explain_ko: "선생님이 이야기했어요.",
};

type SpotRunIo = {
  /** 실호출 클라이언트(--live 일 때만). 없으면 모든 호출이 가짜 응답이다. */
  live: Anthropic | null;
};

/** 대본 하나의 호출 함수: 대화는 사용자 메시지 표지 → 차례 → 채움 차례로 응답을 고르고, 자리 표지가 있고 실호출 클라이언트가 있으면 실제로 부른다. */
function callerOf(script: SpotScript, io: SpotRunIo, calls: SpotCall[]) {
  const { client: fakeClient, fake } = fakeClientOf();
  let dialogAt = 0;
  let fillAt = 0;
  let helpAt = 0;
  let lastKind: ChatCallKind | null = null;
  let lastHelp: HelpReply | undefined;
  const usedByMessage = new Set<number>();
  return async (
    kind: ChatCallKind,
    request: PreparedTurn["request"],
  ): Promise<CallResult> => {
    const userMessage = lastUserTextOf(request.body);
    let spot: SpotId | null = null;
    let json: unknown;
    // 힌트 '다시 받기': 한 차례의 힌트 호출은 첫 단 하나뿐이고(다음 단은 저장된 단) 다른 호출 없이 힌트 호출이 잇달아 오면 다시 받기다 — 같은
    // 표지 응답을 다시 쓰고 다음 자리의 표지를 먹지 않는다(검토 rev-g-spots M-1, talk-observe runChatScenario 의 누름 차례)
    const retryHint = kind === "hint" && lastKind === "hint";
    lastKind = kind;
    if (retryHint) {
      spot = lastHelp?.spot ?? null;
      json = lastHelp?.answer ?? DEFAULT_HELP;
    } else if (kind === "dialog") {
      const hit = (script.byMessage ?? []).findIndex(
        (r, i) => !usedByMessage.has(i) && userMessage.includes(r.includes),
      );
      const byMessage = hit >= 0 ? script.byMessage?.[hit] : undefined;
      if (byMessage !== undefined) {
        usedByMessage.add(hit);
        spot = byMessage.spot;
        json = byMessage.answer;
      } else {
        const planned = script.dialog[dialogAt];
        dialogAt += 1;
        if (planned !== undefined) {
          spot = planned.spot;
          json = planned.answer;
        } else {
          json = script.fill[fillAt % script.fill.length];
          fillAt += 1;
        }
      }
    } else if (kind === "hint" || kind === "explain") {
      const planned = script.help[helpAt];
      helpAt += 1;
      lastHelp = planned;
      spot = planned?.spot ?? null;
      json = planned?.answer ?? DEFAULT_HELP;
    } else json = EVAL_FAKE;
    const goLive = io.live !== null && spot !== null;
    if (!goLive)
      fake.push({
        reply: {
          kind: "stream",
          body: messageBody({ model: request.model, json }),
          chunks: 4,
        },
        times: 1,
      });
    const result = await streamCall(
      goLive ? (io.live as Anthropic) : fakeClient,
      kind,
      request,
    );
    let raw: string;
    if (result.ok) {
      try {
        raw = answerTextOf(result.message as never);
      } catch {
        raw = "";
      }
    } else raw = `(실패 · ${result.status} · ${result.detail})`;
    calls.push({
      kind,
      spot,
      live: goLive,
      userMessage,
      raw,
      ok: result.ok,
      latencyMs: result.latencyMs,
    });
    return result;
  };
}

/** 대본 하나를 돌린 결과(차례 · 호출 기록 · 차례에 붙인 호출). */
export type SpotScriptRun = {
  script: SpotScript;
  /** 이 실행의 회화 단계(재료의 단계 — 단계에 매인 자리 조건이 읽는다). */
  level: number;
  steps: readonly ObserveStep[];
  run: ChatScenarioRun;
  calls: SpotCall[];
  /** 차례마다 그 차례에 든 호출(호출 기록의 자리 — 힌트 → 대화 → 설명 차례). */
  turnCalls: SpotCall[][];
  /** 실호출 실행만: 같은 대본을 가짜로 돈 실행의 표지 자리(자리 밀림 대조 — 검토 rev-g-spots M-1). 가짜 실행은 null. */
  reference: SpotTag[] | null;
};

/** 자리 표지 호출 하나가 붙은 자리(대본 · 차례 · 입구 · 갈래 · 자리). */
export type SpotTag = {
  script: string;
  no: number;
  entry: ChatScenarioTurn["entry"];
  kind: ChatCallKind;
  spot: SpotId;
};

/** 대본 실행의 표지 자리(다시 받기로 같은 자리가 되풀이되면 한 번만). */
export function spotTagsOf(sr: Omit<SpotScriptRun, "reference">): SpotTag[] {
  const seen = new Set<string>();
  const out: SpotTag[] = [];
  sr.run.turns.forEach((t, i) => {
    for (const c of sr.turnCalls[i] ?? []) {
      if (c.spot === null) continue;
      const key = `${t.no}|${t.entry}|${c.kind}|${c.spot}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        script: sr.script.name,
        no: t.no,
        entry: t.entry,
        kind: c.kind,
        spot: c.spot,
      });
    }
  });
  return out;
}

export type SpotEnv = {
  config: ScriptConfig;
  materials: Materials;
};

/** 시드 · 설정을 읽는다(기본 3단계 단원 1 수업 1 · 미나, 짧은 준비가 열린 실제 카드 — spec 설계 13 I-1). */
export function spotEnvOf(
  root = process.cwd(),
  where: SpotWhere = DEFAULT_SPOT_WHERE,
): SpotEnv {
  const config = loadScriptConfig({ root });
  const m = materialsOf(readSeedFiles(root, where.level, where.unit), {
    level: where.level,
    unit: where.unit,
    lesson: where.lesson,
    teacher: TEACHER,
  });
  if (!m.ok) throw new Error(`재료가 없다: ${m.missing}`);
  return { config, materials: m.materials };
}

function valuesOf(env: SpotEnv, script: SpotScript): Record<string, unknown> {
  return {
    ...env.config.values,
    [TALK_LEAD_MODE_KEY]: "chat",
    ...script.settings,
  };
}

/** 차례마다 호출 기록을 다시 붙인다(runChatScenario 의 차례 안 순서: 힌트 누름 → 대화 → 막힌 뒤 설명 · 평가). */
function attachCalls(
  turns: readonly ChatScenarioTurn[],
  calls: readonly SpotCall[],
): SpotCall[][] {
  let at = 0;
  return turns.map((t) => {
    const n = t.calls.dialog + t.calls.hint + t.calls.explain + t.calls.eval;
    const mine = calls.slice(at, at + n);
    at += n;
    const want = [
      ...Array(t.calls.hint).fill("hint"),
      ...Array(t.calls.dialog).fill("dialog"),
      ...Array(t.calls.explain + t.calls.eval).fill("after"),
    ];
    mine.forEach((c, i) => {
      const w = want[i];
      if (
        w === "after" ? c.kind !== "explain" && c.kind !== "eval" : c.kind !== w
      )
        throw new Error(`호출 기록의 차례가 어긋났다(차례 ${t.no} ${t.entry})`);
    });
    return mine;
  });
}

async function runOnce(
  env: SpotEnv,
  script: SpotScript,
  steps: readonly ObserveStep[],
  io: SpotRunIo,
): Promise<SpotScriptRun> {
  const sim = createTalkSim(
    env.materials,
    valuesOf(env, script),
    env.config.book,
    {
      chatAt: CHAT_AT,
      rotationKey: `spots-${script.name}`,
    },
  );
  if (!sim.chat.on)
    throw new Error(`${script.name}: 이야기 방식 세션이 아니다`);
  const calls: SpotCall[] = [];
  const run = await runChatScenario(sim, steps, {
    call: callerOf(script, io, calls),
    evalOn: false,
  });
  return {
    script,
    level: env.materials.level,
    steps,
    run,
    calls,
    turnCalls: attachCalls(run.turns, calls),
    reference: null,
  };
}

/**
 * 대본 하나를 돈다. afterStop 이 있거나 멈춤이 고르기 · 닫힘이면 가짜 실행 한 번으로 마지막 선생님 차례까지 자르고(afterStop 을 붙여) 다시 돈다 —
 * 마무리 차례처럼 앱 셈(참고 턴)이 정하는 자리를 시드 값 그대로 찾는다. 실호출에서도 자르는 자리는 가짜 실행이 정한다.
 */
export async function runSpotScript(
  env: SpotEnv,
  script: SpotScript,
  io: SpotRunIo = { live: null },
): Promise<SpotScriptRun> {
  let steps = script.steps;
  const dry = await runOnce(env, script, steps, { live: null });
  if (dry.run.stopped !== null) {
    const last = dry.run.turns.findLast((t) => t.record !== null && t.no > 0);
    const upTo = last?.no ?? steps.length;
    steps = [
      ...steps.slice(0, upTo),
      ...(script.afterStop === undefined ? [] : [script.afterStop]),
    ];
  }
  if (io.live === null) return runOnce(env, script, steps, io);
  // 실호출: 자른 대본의 가짜 실행 표지 자리를 함께 둔다(실호출 표지가 같은 차례에 붙었는지 spotsOf 가 대조한다)
  const reference = spotTagsOf(
    dry.run.stopped === null
      ? dry
      : await runOnce(env, script, steps, { live: null }),
  );
  return { ...(await runOnce(env, script, steps, io)), reference };
}

// ── 자리 판정(가짜 실행의 조건 · 실호출의 닿음) ──────────────────────────

export type SpotCondition = { name: string; ok: boolean; detail?: string };

/** 자리 하나의 한 차례(보는 것). */
export type SpotTurnView = {
  script: string;
  no: number;
  entry: ChatScenarioTurn["entry"];
  /** 보낸 사용자 메시지(가린 뒤 전문). 호출이 없는 차례는 빈 글. */
  userMessage: string;
  /** 응답 원문(대화 호출). */
  raw: string;
  /** 이 차례의 호출(갈래 · 실호출 여부). */
  calls: { kind: ChatCallKind; live: boolean; ok: boolean }[];
  /** 아이에게 나간 글(사람이 읽는 줄). */
  shown: string[];
  /** 흘린 줄(서버 write 차례 그대로 — 화면 재현이 되돌려 튼다). */
  lines: ChatReplayLine[];
  /** 돌아옴 차례의 선생님 말(m-3 — 짧은 준비를 남의 일처럼 묻는지 사람이 읽는다). */
  teacherSay?: string;
  app: {
    segment: string | null;
    facts: string[];
    signal: ChatEndSignal | null;
    turnEnd: string | null;
    stage: number | null;
    run: number | null;
    recognizerNote: "alternative" | "unsure" | null;
    hintTiers: string[];
    listen: { sentence: string; inSay: boolean } | null;
    choices: boolean;
    note: string | null;
  };
};

export type SpotResult = {
  id: SpotId;
  label: string;
  /** 이 자리의 호출 갈래(호출이 없는 자리는 none — 앱 행동만). */
  call: "dialog" | "hint" | "explain" | "none";
  /** 실호출에서 이 자리에서 부르는 호출 수(가짜 실행의 자리 표지 수). */
  liveCalls: number;
  turns: SpotTurnView[];
  conditions: SpotCondition[];
  /** 조건이 모두 섰다(가짜 실행은 늘 참이어야 한다 — 실호출은 응답에 달린 조건이 서지 않을 수 있다). */
  reached: boolean;
  /** 닿지 못한 까닭(서지 않은 조건 이름, 차례가 없으면 '차례 없음'). 닿으면 빈 목록. */
  why: string[];
};

/** 실호출 실행에서 자리 표지가 가짜 실행과 같은 차례에 붙었는지 보는 조건 이름(검토 rev-g-spots M-1 — 어긋나면 '자리 밀림'). */
export const SPOT_DRIFT_CONDITION =
  "자리 표지 호출이 가짜 실행과 같은 차례에 붙었다(자리 밀림 없음)";
/** 차례가 하나도 없는 자리의 까닭. */
export const NO_TURN_REASON = "차례 없음";

const moveChatOf = (t: ChatScenarioTurn) =>
  ((t.record?.teacher?.move as { chat?: Record<string, unknown> } | undefined)
    ?.chat ?? {}) as {
    listen?: { sentence: string; inSay: boolean };
    choices?: true;
  };

function shownOf(t: ChatScenarioTurn): string[] {
  const out: string[] = [];
  const r = t.record;
  for (const h of t.hints)
    out.push(
      h.reply.ok
        ? `힌트 단 ${h.tier + 1}(${h.reply.tiers[h.tier]?.kind ?? "?"}): ${h.reply.text}`
        : `힌트 단 ${h.tier + 1}: 받지 못함${h.reply.retry ? "(다시 받기 단추)" : ""}`,
    );
  if (r !== null) {
    let text: string[] = [];
    const flush = () => {
      if (text.length > 0) out.push(`말풍선: ${text.join(" ")}`);
      text = [];
    };
    for (const line of r.lines) {
      if (line.t === "s") text.push(line.en);
      else {
        flush();
        if (line.t === "ko") out.push(`뜻: ${line.ko}`);
        else if (line.t === "sound")
          out.push(
            `소리 줄(${line.kind === "model" ? "따라 할 문장" : "고르기 물음"}): ${line.say}`,
          );
        else
          out.push(
            `앱이 붙인 물음: ${line.en}${line.ko ? ` / ${line.ko}` : ""}`,
          );
      }
    }
    flush();
    if (r.close !== null)
      out.push(
        `닫는 줄: ${r.close.farewell.en}${r.close.farewell.ko ? ` / ${r.close.farewell.ko}` : ""}`,
      );
    if (r.turnEnd === "closing" || r.turnEnd === "suggestion")
      out.push(
        `두 단추: 더 이야기하기 · 그만하기(${r.turnEnd === "closing" ? "앱의 마무리 차례" : "선생님이 맺음"})`,
      );
  }
  if (t.explain !== undefined)
    out.push(
      t.explain.reply.ok
        ? `설명: ${t.explain.reply.text}`
        : "설명: 없음(차례를 그대로 잇는다)",
    );
  if (t.entry === "wait") out.push(`나간 글 없음 — ${t.note ?? "기다림"}`);
  return out;
}

function viewOf(
  sr: SpotScriptRun,
  index: number,
  withTeacherSay = false,
  spotId?: SpotId,
): SpotTurnView {
  const t = sr.run.turns[index] as ChatScenarioTurn;
  const calls = sr.turnCalls[index] ?? [];
  const dialog = calls.find((c) => c.kind === "dialog");
  const help = calls.find((c) => c.kind === "hint" || c.kind === "explain");
  // 그 자리 표지가 붙은 호출을 먼저 보인다 — 힌트 · 설명 자리는 힌트 · 설명 호출의 요청 글 · 원문(검토 rev-g-spots-2 N-1)
  const tagged =
    spotId === undefined ? undefined : calls.find((c) => c.spot === spotId);
  const r = t.record;
  const user = dialog?.userMessage ?? help?.userMessage ?? "";
  const chat = moveChatOf(t);
  return {
    script: sr.script.name,
    no: t.no,
    entry: t.entry,
    userMessage: (tagged ?? dialog)?.userMessage ?? "",
    raw: (tagged ?? dialog ?? help)?.raw ?? "",
    calls: calls.map((c) => ({ kind: c.kind, live: c.live, ok: c.ok })),
    shown: shownOf(t),
    lines: r?.lines ?? [],
    ...(withTeacherSay ? { teacherSay: r?.heard ?? "" } : {}),
    app: {
      segment: r?.teacher?.segment ?? null,
      facts: r?.facts ?? [],
      signal: r?.signal ?? null,
      turnEnd: r?.turnEnd ?? null,
      stage: r?.stage ?? null,
      run: r?.run ?? null,
      recognizerNote: user.includes(MESSAGE_TEXT.unsureAlt)
        ? "alternative"
        : user.includes(MESSAGE_TEXT.unsure)
          ? "unsure"
          : null,
      hintTiers: t.hints.flatMap((h) =>
        h.reply.ok && h.tier === 0 ? h.reply.tiers.map((x) => x.kind) : [],
      ),
      listen: chat.listen
        ? { sentence: chat.listen.sentence, inSay: chat.listen.inSay }
        : null,
      choices: chat.choices === true,
      note: t.note,
    },
  };
}

const cond = (name: string, ok: boolean, detail?: string): SpotCondition =>
  detail === undefined ? { name, ok } : { name, ok, detail };

type Finder = (runs: ReadonlyMap<string, SpotScriptRun>) => {
  call: SpotResult["call"];
  picks: { run: SpotScriptRun; index: number }[];
  conditions: SpotCondition[];
  teacherSay?: boolean;
};

const turnsOf = (sr: SpotScriptRun | undefined) =>
  sr === undefined ? [] : sr.run.turns.map((t, index) => ({ t, index }));
const userOf = (sr: SpotScriptRun, index: number) =>
  sr.turnCalls[index]?.find((c) => c.kind === "dialog")?.userMessage ?? "";
const hasLine = (t: ChatScenarioTurn, pred: (l: ChatReplayLine) => boolean) =>
  (t.record?.lines ?? []).some(pred);

/** 자리마다 찾는 차례와 조건(brief 의 예: 마무리 사실 줄 · 조용함 둘 · 알림 세 갈래 · 따라 할 문장 듦 · 어긋남 · {NAME} 가림). */
const FINDERS: Readonly<Record<SpotId, Finder>> = {
  first_words(runs) {
    const sr = runs.get("opening") as SpotScriptRun;
    const hit = turnsOf(sr).find(({ t }) => t.entry === "start");
    const user = hit ? userOf(sr, hit.index) : "";
    return {
      call: "dialog",
      picks: hit ? [{ run: sr, index: hit.index }] : [],
      conditions: [
        cond("수업 첫 말 입구 차례가 있다", hit !== undefined),
        cond(
          "사용자 메시지가 수업 시작 줄이다",
          user.startsWith(MESSAGE_TEXT.start),
        ),
        cond("선생님 말이 나갔다", (hit?.t.record?.heard ?? "") !== ""),
      ],
    };
  },
  greeting_end(runs) {
    const sr = runs.get("opening") as SpotScriptRun;
    const hit = turnsOf(sr).find(({ t }) =>
      t.record?.facts.includes("prep_next"),
    );
    const user = hit ? userOf(sr, hit.index) : "";
    return {
      call: "dialog",
      picks: hit ? [{ run: sr, index: hit.index }] : [],
      conditions: [
        cond(
          "인사 끝 사실 줄(prep_next)을 붙인 아이 차례가 있다",
          hit?.t.entry === "child",
        ),
        cond(
          "사실 줄이 사용자 메시지에 든다",
          user.includes(MESSAGE_TEXT.prepNext),
        ),
        cond(
          "다음이 짧은 준비라 끝 줄 신호가 비었다",
          hit?.t.record?.signal !== null &&
            Object.keys(hit?.t.record?.signal ?? { x: 1 }).length === 0,
        ),
      ],
    };
  },
  back(runs) {
    const sr = runs.get("opening") as SpotScriptRun;
    const hit = turnsOf(sr).find(({ t }) => t.entry === "back");
    const user = hit ? userOf(sr, hit.index) : "";
    return {
      call: "dialog",
      picks: hit ? [{ run: sr, index: hit.index }] : [],
      teacherSay: true,
      conditions: [
        cond("돌아옴 입구 차례가 있다", hit !== undefined),
        cond("사용자 메시지가 돌아옴 줄이다", user === MESSAGE_TEXT.back, user),
        cond(
          "선생님 말이 나갔다(m-3 은 사람이 읽음)",
          (hit?.t.record?.heard ?? "") !== "",
        ),
      ],
    };
  },
  quiet_twice(runs) {
    const sr = runs.get("opening") as SpotScriptRun;
    const list = turnsOf(sr);
    const at = list.findIndex(
      ({ t }, i) => t.entry === "quiet" && list[i + 1]?.t.entry === "quiet",
    );
    const pair =
      at < 0 ? [] : [list[at], list[at + 1]].filter((x) => x !== undefined);
    return {
      call: "dialog",
      picks: pair.map((p) => ({ run: sr, index: p.index })),
      conditions: [
        cond("조용함 입구 차례가 둘 잇달아 간다", pair.length === 2),
        cond(
          "두 차례 모두 사용자 메시지가 누르지 않음 줄이다",
          pair.length === 2 &&
            pair.every((p) => userOf(sr, p.index) === MESSAGE_TEXT.quiet),
        ),
      ],
    };
  },
  wait_after_cap(runs) {
    const sr = runs.get("opening") as SpotScriptRun;
    const list = turnsOf(sr);
    const at = list.findIndex(
      ({ t }, i) =>
        t.entry === "wait" &&
        list[i - 1]?.t.entry === "quiet" &&
        list[i - 2]?.t.entry === "quiet",
    );
    const hit = list[at];
    const prev = list[at - 1];
    const calls = hit ? (sr.turnCalls[hit.index] ?? []).length : -1;
    return {
      call: "none",
      picks: hit ? [{ run: sr, index: hit.index }] : [],
      conditions: [
        cond("조용함 둘 뒤에 기다림 차례가 있다", hit !== undefined),
        cond("그 차례에는 호출이 없다(앱 행동만)", calls === 0),
        cond(
          "앞 조용함 차례의 끝 줄에 조용함 기다림이 없다(잇달아 말한 수 상한)",
          prev !== undefined &&
            prev.t.record?.signal?.quietSeconds === undefined,
        ),
      ],
    };
  },
  not_heard(runs) {
    const sr = runs.get("opening") as SpotScriptRun;
    const hit = turnsOf(sr).find(
      ({ index }) => userOf(sr, index) === MESSAGE_TEXT.notHeard,
    );
    return {
      call: "dialog",
      picks: hit ? [{ run: sr, index: hit.index }] : [],
      conditions: [
        cond("눌렀으나 듣지 못한 아이 차례가 있다", hit?.t.entry === "child"),
        cond("사용자 메시지가 듣지 못함 줄이다", hit !== undefined),
      ],
    };
  },
  closing(runs) {
    const sr = runs.get("closing") as SpotScriptRun;
    const hit = turnsOf(sr).find(({ t }) =>
      t.record?.facts.includes("closing"),
    );
    const user = hit ? userOf(sr, hit.index) : "";
    const t = hit?.t;
    const asked =
      t !== undefined &&
      (hasLine(t, (l) => l.t === "add") || /\?/.test(t.record?.heard ?? ""));
    return {
      call: "dialog",
      picks: hit ? [{ run: sr, index: hit.index }] : [],
      conditions: [
        cond(
          "마무리 사실 줄이 사용자 메시지에 든다",
          user.includes(MESSAGE_TEXT.closing),
        ),
        cond("차례 끝이 마무리(두 단추)다", t?.record?.turnEnd === "closing"),
        cond(
          "나간 글에 물음이 있다(선생님 물음 또는 앱이 붙인 물음)",
          asked,
          t !== undefined && hasLine(t, (l) => l.t === "add")
            ? "앱이 붙임"
            : "선생님 말",
        ),
      ],
    };
  },
  wrap_after_suggestion(runs) {
    const sr = runs.get("wrap") as SpotScriptRun;
    const list = turnsOf(sr);
    // 자리 표지가 붙은 차례를 늘 잡는다(실호출에서 wrap_up 이 서지 않아도 그 차례의 사용자 메시지 · 응답이 결과에 남게 — 검토 rev-g-spots I-1)
    const hit = list.find(({ index }) =>
      (sr.turnCalls[index] ?? []).some(
        (c) => c.kind === "dialog" && c.spot === "wrap_after_suggestion",
      ),
    );
    const after = hit ? list[list.indexOf(hit) + 1] : undefined;
    const next = after?.t.entry === "choose" ? after : undefined;
    const wrap = sr.run.wrap ?? [];
    return {
      call: "dialog",
      picks: [
        ...(hit ? [{ run: sr, index: hit.index }] : []),
        ...(next ? [{ run: sr, index: next.index }] : []),
      ],
      conditions: [
        cond(
          "선생님이 맺은 차례(wrap_up → 마무리 제안)가 있다",
          hit?.t.record?.turnEnd === "suggestion",
          hit?.t.record?.turnEnd ?? undefined,
        ),
        cond(
          "그 뒤 그만하기를 골랐다",
          next?.t.entry === "choose" && next.t.note === "stop",
        ),
        cond(
          "정리의 되짚을 말이 나왔다",
          wrap.length > 0,
          wrap.map((w) => w.en).join(" / "),
        ),
      ],
    };
  },
  safety_last(runs) {
    const sr = runs.get("safety") as SpotScriptRun;
    const hit = turnsOf(sr).find(({ t }) =>
      t.record?.facts.includes("last_turn"),
    );
    const user = hit ? userOf(sr, hit.index) : "";
    return {
      call: "dialog",
      picks: hit ? [{ run: sr, index: hit.index }] : [],
      conditions: [
        cond(
          "안전 상한 사실 줄이 사용자 메시지에 든다",
          user.includes(MESSAGE_TEXT.lastTurn),
        ),
        cond(
          "마무리 사실 줄은 붙지 않는다",
          !user.includes(MESSAGE_TEXT.closing),
        ),
        cond(
          "닫는 줄(안전 상한)로 끝난다",
          hit?.t.record?.close?.reason === "safety",
        ),
      ],
    };
  },
  recognizer(runs) {
    const rec = runs.get("recognizer") as SpotScriptRun;
    const off = runs.get("partial-off") as SpotScriptRun;
    const on = runs.get("partial-on") as SpotScriptRun;
    const find = (sr: SpotScriptRun, needle: string) =>
      turnsOf(sr).find(
        ({ t, index }) =>
          t.entry === "child" && userOf(sr, index).includes(needle),
      );
    const alt = turnsOf(rec).find(({ index }) =>
      userOf(rec, index).includes(`${MESSAGE_TEXT.unsureAlt} "I see the sea."`),
    );
    const low = turnsOf(rec).find(
      ({ index }) =>
        userOf(rec, index).endsWith(MESSAGE_TEXT.unsure) &&
        !userOf(rec, index).includes(MESSAGE_TEXT.unsureAlt),
    );
    const offTurn = find(off, "I go to the beach.");
    const onTurn = find(on, "I go to the beach.");
    return {
      call: "dialog",
      picks: [
        ...(alt ? [{ run: rec, index: alt.index }] : []),
        ...(low ? [{ run: rec, index: low.index }] : []),
        ...(offTurn ? [{ run: off, index: offTurn.index }] : []),
        ...(onTurn ? [{ run: on, index: onTurn.index }] : []),
      ],
      conditions: [
        cond(
          "다른 후보 있음: 알림 줄이 둘째 꼴(다른 후보 글)이다",
          alt !== undefined,
        ),
        cond("다른 후보 없음: 알림 줄이 첫 꼴이다", low !== undefined),
        cond(
          "중간 결과만 · 끔: 알림 줄이 없다",
          offTurn !== undefined &&
            !userOf(off, offTurn.index).includes(MESSAGE_TEXT.unsure),
        ),
        cond(
          "중간 결과만 · 켬: 첫 꼴 알림 줄이 붙는다",
          onTurn !== undefined &&
            userOf(on, onTurn.index).endsWith(MESSAGE_TEXT.unsure),
        ),
      ],
    };
  },
  listen_sentence(runs) {
    const sr = runs.get("help") as SpotScriptRun;
    const tagged = turnsOf(sr).filter(({ index }) =>
      (sr.turnCalls[index] ?? []).some(
        (c) => c.kind === "dialog" && c.spot === "listen_sentence",
      ),
    );
    const inSay = tagged.find(
      ({ t }) =>
        moveChatOf(t).listen?.inSay === true &&
        hasLine(t, (l) => l.t === "sound" && l.kind === "model"),
    );
    const miss = tagged.find(
      ({ t }) =>
        moveChatOf(t).listen !== undefined &&
        moveChatOf(t).listen?.inSay === false &&
        !hasLine(t, (l) => l.t === "sound" && l.kind === "model"),
    );
    return {
      call: "dialog",
      picks: tagged.map((x) => ({ run: sr, index: x.index })),
      conditions: [
        cond(
          "say 에 듦: 따라 할 문장이 글에서 빠져 소리 줄로 나간다",
          inSay !== undefined,
        ),
        cond(
          "어긋남: 따라 할 문장이 say 에 없어 글을 바꾸지 않고 기록만 한다",
          miss !== undefined,
        ),
      ],
    };
  },
  stuck_choice(runs) {
    const sr = runs.get("help") as SpotScriptRun;
    const hit = turnsOf(sr).find(
      ({ index }) => userOf(sr, index) === MESSAGE_TEXT.dontKnow,
    );
    const t = hit?.t;
    return {
      call: "dialog",
      picks: hit ? [{ run: sr, index: hit.index }] : [],
      conditions: [
        cond("모름 단추 차례(앱이 아는 막힘)가 있다", hit !== undefined),
        cond(
          "or 물음이 글에서 빠져 소리 줄(고르기 물음)로 나간다",
          t !== undefined &&
            hasLine(t, (l) => l.t === "sound" && l.kind === "answer"),
        ),
        cond(
          "move 에 고르기 물음 표지가 있다",
          t !== undefined && moveChatOf(t).choices === true,
        ),
      ],
    };
  },
  stuck_explain(runs) {
    const sr = runs.get("help") as SpotScriptRun;
    const hit = turnsOf(sr).find(({ t }) => t.explain !== undefined);
    return {
      call: "explain",
      picks: hit ? [{ run: sr, index: hit.index }] : [],
      conditions: [
        cond(
          "막힌 뒤 끝 줄에 설명 기다림 신호가 있다",
          hit?.t.record?.signal?.explainWait !== undefined,
        ),
        cond("설명 요청을 불렀다", hit?.t.explain?.called === true),
        cond("설명 글이 나왔다", hit?.t.explain?.reply.ok === true),
      ],
    };
  },
  hint_no_question(runs) {
    const sr = runs.get("help") as SpotScriptRun;
    const list = turnsOf(sr);
    const hit = list.find(({ index }) =>
      (sr.turnCalls[index] ?? []).some(
        (c) => c.kind === "hint" && c.spot === "hint_no_question",
      ),
    );
    const before = hit
      ? list.slice(0, list.indexOf(hit)).findLast(({ t }) => t.record?.teacher)
      : undefined;
    const teacherText = before?.t.record?.teacher?.text ?? "";
    return {
      call: "hint",
      picks: hit ? [{ run: sr, index: hit.index }] : [],
      conditions: [
        cond(
          "앞 선생님 말에 물음이 없다",
          before !== undefined && !teacherText.includes("?"),
          teacherText,
        ),
        cond(
          "힌트 호출을 불러 첫 단이 나왔다",
          hit?.t.hints[0]?.called === true && hit.t.hints[0].reply.ok,
        ),
      ],
    };
  },
  hint_no_frame(runs) {
    const sr = runs.get("help") as SpotScriptRun;
    const hit = turnsOf(sr).find(({ index }) =>
      (sr.turnCalls[index] ?? []).some(
        (c) => c.kind === "hint" && c.spot === "hint_no_frame",
      ),
    );
    const first = hit?.t.hints[0];
    const kinds = first?.reply.ok ? first.reply.tiers.map((x) => x.kind) : [];
    return {
      call: "hint",
      picks: hit ? [{ run: sr, index: hit.index }] : [],
      conditions: [
        cond("3단계 수업이다", sr.level === 3),
        cond(
          "틀 단 없이 두 단(뜻 · 문장)이다",
          kinds.join(",") === "ko,sentence",
          kinds.join(","),
        ),
        cond(
          "둘째 단(문장)은 저장된 단으로 열린다(호출 더 없음)",
          hit?.t.hints[1]?.reply.ok === true && hit.t.hints[1].called === false,
        ),
      ],
    };
  },
  name_mask(runs) {
    const sr = runs.get("opening") as SpotScriptRun;
    const hit = turnsOf(sr).find(
      ({ t, index }) =>
        t.entry === "child" && userOf(sr, index).includes(NAME_SLOT),
    );
    const user = hit ? userOf(sr, hit.index) : "";
    return {
      call: "dialog",
      picks: hit ? [{ run: sr, index: hit.index }] : [],
      conditions: [
        cond(
          "아이 말의 이름 자리가 {NAME} 으로 가려졌다",
          user.includes(`is ${NAME_SLOT}`),
          user,
        ),
        cond(
          "보낸 글에 시험용 가짜 이름이 없다",
          user !== "" && !user.includes(SPOT_CHILD_NAME),
        ),
      ],
    };
  },
};

/** 실행 결과 → 열여섯 자리. */
export function spotsOf(
  runs: ReadonlyMap<string, SpotScriptRun>,
): SpotResult[] {
  return SPOT_IDS.map((id) => {
    const found = FINDERS[id](runs);
    const liveCalls = [...runs.values()]
      .flatMap((sr) => sr.calls)
      .filter((c) => c.spot === id).length;
    // 자리 표지가 붙은 차례는 조건이 서지 않아도 늘 넣는다(찾는 법이 놓친 차례를 뒤에 붙임 — 검토 rev-g-spots I-1)
    const picks = [...found.picks];
    for (const sr of runs.values())
      sr.run.turns.forEach((_, index) => {
        const tagged = (sr.turnCalls[index] ?? []).some((c) => c.spot === id);
        if (tagged && !picks.some((p) => p.run === sr && p.index === index))
          picks.push({ run: sr, index });
      });
    const conditions = [...found.conditions];
    const refs = [...runs.values()].filter((sr) => sr.reference !== null);
    if (refs.length > 0) {
      const keyOf = (t: SpotTag) => `${t.script}#${t.no}${t.entry}:${t.kind}`;
      const want = refs
        .flatMap((sr) => sr.reference ?? [])
        .filter((t) => t.spot === id)
        .map(keyOf);
      const got = refs
        .flatMap((sr) => spotTagsOf(sr))
        .filter((t) => t.spot === id)
        .map(keyOf);
      const same = want.join(" ") === got.join(" ");
      conditions.push(
        cond(
          SPOT_DRIFT_CONDITION,
          same,
          same
            ? undefined
            : `가짜 ${want.join(" ") || "-"} · 실호출 ${got.join(" ") || "-"}`,
        ),
      );
    }
    const why = [
      ...(picks.length === 0 ? [NO_TURN_REASON] : []),
      ...conditions.filter((c) => !c.ok).map((c) => c.name),
    ];
    return {
      id,
      label: SPOT_LABELS[id],
      call: found.call,
      liveCalls,
      turns: picks.map((p) =>
        viewOf(p.run, p.index, found.teacherSay === true, id),
      ),
      conditions,
      reached: why.length === 0,
      why,
    };
  });
}

/** 대본별 호출 기록 전부(차례마다 호출 갈래 · 자리 · 실호출 여부 · 사용자 메시지 · 응답 원문, 그리고 나간 글 — 검토 rev-g-spots I-1 (다)). */
export type SpotScriptLog = {
  script: string;
  turns: {
    no: number;
    entry: ChatScenarioTurn["entry"];
    calls: Omit<SpotCall, "latencyMs">[];
    shown: string[];
  }[];
};

export function scriptLogsOf(
  runs: ReadonlyMap<string, SpotScriptRun>,
): SpotScriptLog[] {
  return [...runs.values()].map((sr) => ({
    script: sr.script.name,
    turns: sr.run.turns.map((t, i) => ({
      no: t.no,
      entry: t.entry,
      calls: (sr.turnCalls[i] ?? []).map(
        ({ kind, spot, live, ok, userMessage, raw }) => ({
          kind,
          spot,
          live,
          ok,
          userMessage,
          raw,
        }),
      ),
      shown: shownOf(t),
    })),
  }));
}

/** 모든 대본을 돈다(대본 이름 → 결과). */
export async function runAllSpots(
  env: SpotEnv,
  io: SpotRunIo = { live: null },
): Promise<Map<string, SpotScriptRun>> {
  const out = new Map<string, SpotScriptRun>();
  for (const script of SPOT_SCRIPTS)
    out.set(script.name, await runSpotScript(env, script, io));
  return out;
}

/** 힌트 다시 받기 상한의 설정 키(대본 도구 · 화면과 같은 값 — 실호출 최악 수의 셈에만 쓴다). */
export const HINT_RETRY_MAX_KEY = "talk.chat_hint_retry_max";

export type LivePlan = {
  dialog: number;
  help: number;
  /** 다시 받기 밖의 호출 수(가짜 실행의 자리 표지가 붙은 호출). */
  total: number;
  /** 실호출 힌트가 실패해 다시 받기를 할 때 더 갈 수 있는 호출 수(표지 힌트 호출 × 다시 받기 상한 — 다시 받기는 같은 표지를 다시 쓴다). */
  retryExtra: number;
  /** 최악 수(total + retryExtra) — 상한 문이 이 수로 막는다. */
  worst: number;
  usd: number;
};

/** 실호출 때 부를 호출 수와 어림 비용. hintRetryMax 는 설정 talk.chat_hint_retry_max(최악 수의 셈). */
export function livePlanOf(
  runs: ReadonlyMap<string, SpotScriptRun>,
  hintRetryMax = 0,
): LivePlan {
  const tagged = [...runs.values()]
    .flatMap((sr) => sr.calls)
    .filter((c) => c.spot !== null);
  const dialog = tagged.filter((c) => c.kind === "dialog").length;
  const help = tagged.filter(
    (c) => c.kind === "hint" || c.kind === "explain",
  ).length;
  const retryExtra =
    tagged.filter((c) => c.kind === "hint").length * Math.max(0, hintRetryMax);
  return {
    dialog,
    help,
    total: dialog + help,
    retryExtra,
    worst: dialog + help + retryExtra,
    usd:
      Math.round(
        (dialog * EST_USD_PER_DIALOG + help * EST_USD_PER_HELP) * 1000,
      ) / 1000,
  };
}

/** 상한 문: 최악 수가 --max-calls 를 넘으면 부르지 않는다(키를 읽기 전에 판정 — 검토 rev-g-spots M-4). */
export function planGate(
  plan: LivePlan,
  maxCalls: number,
): { ok: boolean; message: string } {
  return plan.worst > maxCalls
    ? {
        ok: false,
        message: `부를 호출이 최악 ${plan.worst}번(다시 받기 ${plan.retryExtra}번 포함)으로 상한 ${maxCalls}번을 넘어 부르지 않습니다`,
      }
    : {
        ok: true,
        message: `대화 ${plan.dialog} · 힌트 · 설명 ${plan.help} · 합 ${plan.total}번(다시 받기로 최대 ${plan.retryExtra}번 더 — 최악 ${plan.worst}번, 자리 표지 호출만), 어림 ${plan.usd.toFixed(3)}달러 · 상한 --max-calls ${maxCalls}`,
      };
}

// ── 화면 자료(브라우저 점검 장면 chat-spots 가 읽음) ────────────────────────

/** 화면 재현 한 장면의 자료(talk-chat-spots 쪽의 가짜 서버가 되돌려 튼다). */
export type SpotScreen = {
  id: SpotId;
  label: string;
  /**
   * 차례를 여는 방법: speech 아이 말 · nospeech 말하기를 눌렀으나 말소리 없음(talk.nospeech_dontknow_count 번 — 앱의 실제 '들리지 않음' 길) ·
   * dont_know 모름 단추 · quiet 조용함 타이머 · initial 처음 화면이 그 차례 · none 아무것도 하지 않고 기다림 · hint 앞 선생님 차례에서 힌트 단만
   * 연다(아이 말 없음) · missing 자리의 차례가 없음(화면을 띄우지 않고 '닿지 못함'으로 센다 — 검토 rev-g-spots I-1). 힌트 응답이 있으면 장면은
   * 차례를 열기 전에 힌트를 누른다(앱과 같은 차례).
   */
  trigger:
    | "speech"
    | "nospeech"
    | "dont_know"
    | "quiet"
    | "initial"
    | "none"
    | "hint"
    | "missing";
  /** 그 자리에 닿았는가(spots.json 의 reached). 닿지 못한 자리는 장면이 통과 · 실패로 세지 않고 '닿지 못함'으로 따로 센다. */
  reached: boolean;
  /** 닿지 못한 까닭(spots.json 의 why). */
  why: string[];
  /** 아이 말(가린 글 — 화면 재현은 {NAME} 을 쪽의 이름으로 채워 인식 대본에 넣는다). */
  heard?: string;
  /** 처음 화면의 선생님 차례(앞 차례 — initial 이면 그 자리 차례). */
  before: { lines: ChatReplayLine[]; signal: ChatEndSignal | null };
  /** 턴 요청마다 되돌려 틀 차례(흘린 줄 · 끝 줄 신호 · 차례 끝 · 닫는 줄). */
  replies: {
    lines: ChatReplayLine[];
    signal: ChatEndSignal | null;
    turnEnd: string | null;
    close: { en: string; ko?: string } | null;
  }[];
  /** 힌트 누름마다의 응답(차례대로). */
  hints: ChatHintReply[];
  explain: { ok: true; text: string } | { ok: false } | null;
  /** 그만하기 뒤 정리(되짚을 말). */
  wrap: { en: string; ko?: string }[] | null;
  /** 화면에 보여야 할 글 조각(사진 장면의 판정 — 선생님 말 첫 글 등). */
  expect: string[];
};

const replyOf = (t: ChatScenarioTurn): SpotScreen["replies"][number] => ({
  lines: t.record?.lines ?? [],
  signal: t.record?.signal ?? null,
  turnEnd: t.record?.turnEnd ?? null,
  close: t.record?.close?.farewell ?? null,
});

function screenOf(
  spot: SpotResult,
  runs: ReadonlyMap<string, SpotScriptRun>,
): SpotScreen {
  const first = spot.turns[0];
  const sr = first ? runs.get(first.script) : undefined;
  const list = sr?.run.turns ?? [];
  const at = first
    ? list.findIndex((t) => t.no === first.no && t.entry === first.entry)
    : -1;
  const turn = list[at];
  const prev = list
    .slice(0, Math.max(0, at))
    .findLast((t) => t.record?.teacher);
  const base: SpotScreen = {
    id: spot.id,
    label: spot.label,
    trigger: "none",
    reached: spot.reached,
    why: spot.why,
    before: {
      lines: prev?.record?.lines ?? [],
      signal: prev?.record?.signal ?? null,
    },
    replies: [],
    hints: [],
    explain: null,
    wrap: null,
    expect: [],
  };
  if (turn === undefined) return { ...base, trigger: "missing" };
  const firstText = (t: ChatScenarioTurn | undefined) =>
    t?.record?.close?.farewell.en ??
    t?.record?.lines.find(
      (l): l is Extract<ChatReplayLine, { t: "s" }> => l.t === "s",
    )?.en ??
    "";
  const step = sr?.steps[turn.no - 1];
  const childTrigger = (): Pick<SpotScreen, "trigger" | "heard"> =>
    step?.say !== undefined
      ? {
          trigger: "speech",
          heard: (turn.record?.child?.text ?? "").replaceAll(
            SPOT_CHILD_NAME,
            NAME_SLOT,
          ),
        }
      : step?.input === "nospeech"
        ? { trigger: "nospeech" }
        : { trigger: "dont_know" };
  if (turn.entry === "start" || turn.entry === "back")
    return {
      ...base,
      trigger: "initial",
      before: {
        lines: turn.record?.lines ?? [],
        signal: turn.record?.signal ?? null,
      },
      expect: [firstText(turn)].filter((s) => s !== ""),
    };
  if (spot.id === "quiet_twice") {
    const second = list[at + 1];
    return {
      ...base,
      trigger: "quiet",
      replies: [turn, second].filter((t) => t !== undefined).map(replyOf),
      expect: [firstText(turn), firstText(second)].filter((s) => s !== ""),
    };
  }
  if (turn.entry === "wait") {
    const quiet = list.slice(0, at).findLast((t) => t.record?.teacher);
    return {
      ...base,
      trigger: "none",
      before: {
        lines: quiet?.record?.lines ?? [],
        signal: quiet?.record?.signal ?? null,
      },
      expect: [firstText(quiet)].filter((s) => s !== ""),
    };
  }
  if (turn.entry === "quiet")
    return {
      ...base,
      trigger: "quiet",
      replies: [replyOf(turn)],
      expect: [firstText(turn)],
    };
  const hints = turn.hints.map((h) => h.reply);
  // 힌트 자리: 힌트는 아이가 말하기 전에 앞 선생님 차례에서 누른다 — 앞 차례 화면에서 단을 차례로 열고 그 글을 본다(아이 말 · 새 차례 없음)
  if (spot.id === "hint_no_question" || spot.id === "hint_no_frame")
    return {
      ...base,
      trigger: "hint",
      hints,
      expect: hints.flatMap((h) => (h.ok ? [h.text] : [])),
    };
  const next = list[at + 1];
  return {
    ...base,
    ...childTrigger(),
    replies: [replyOf(turn)],
    hints,
    explain: turn.explain?.reply ?? null,
    wrap:
      spot.id === "wrap_after_suggestion" && next?.entry === "choose"
        ? (sr?.run.wrap ?? null)
        : null,
    expect: [firstText(turn)].filter((s) => s !== ""),
  };
}

/** 열여섯 자리의 화면 자료(아이 이름 없음 — 가린 글만). */
export function screensOf(
  spots: readonly SpotResult[],
  runs: ReadonlyMap<string, SpotScriptRun>,
): SpotScreen[] {
  return spots.map((s) => screenOf(s, runs));
}

// ── 읽는 글 ─────────────────────────────────────────────────────

const quote = (text: string) =>
  text === "" ? "(없음)" : `\n\n\`\`\`\n${text}\n\`\`\`\n`;

export function spotsMarkdown(
  spots: readonly SpotResult[],
  live: boolean,
  logs?: readonly SpotScriptLog[],
): string {
  const out = [
    `# 이야기 방식 자리 재현(${live ? "실호출 — 자리 표지 호출만" : "가짜 응답"})`,
    "",
    live
      ? "- 자리 표지가 없는 앞 차례의 선생님 말은 대본 글(가짜 응답)이다 — 수업 첫 말 · 인사 · 돌아옴 · 채움 차례. 실호출은 자리 표지 차례만이고, 차례마다의 가짜 · 실호출 구분은 맨 끝 '대본별 차례'에 있다."
      : "- 모든 선생님 말이 대본 글(가짜 응답)이다 — 조건이 서는지만 본다. 실호출은 --live.",
    "- 닿지 못한 자리는 까닭(서지 않은 조건)과 함께 남고, 그 차례의 사용자 메시지 · 응답 원문도 그대로 남는다. 호출 전문은 spots.json 의 scripts.",
    "",
    "| 자리 | 호출 | 실호출 수 | 닿음 |",
    "|---|---|---|---|",
    ...spots.map(
      (s) =>
        `| ${s.label} | ${s.call} | ${s.liveCalls} | ${s.reached ? "닿음" : `닿지 못함 — ${s.why.join(" · ")}`} |`,
    ),
    "",
  ];
  for (const s of spots) {
    out.push(`## ${s.label}`, "");
    for (const c of s.conditions)
      out.push(
        `- ${c.ok ? "섬" : "서지 않음"} · ${c.name}${c.detail ? ` — ${c.detail}` : ""}`,
      );
    if (s.call === "none")
      out.push("- 호출이 없는 자리(앱 행동만) — 가짜 실행의 앱 판단만 남긴다");
    out.push("");
    for (const t of s.turns) {
      out.push(
        `### ${t.script} · 차례 ${t.no} · ${t.entry}${t.calls.length > 0 ? ` · 호출 ${t.calls.map((c) => `${c.kind}${c.live ? "(실호출)" : "(가짜)"}`).join(" · ")}` : ""}`,
        "",
        `사용자 메시지:${quote(t.userMessage)}`,
        "",
        `응답 원문:${quote(t.raw)}`,
        "",
        "나간 글:",
        ...t.shown.map((l) => `- ${l}`),
        ...(t.teacherSay !== undefined
          ? ["", `돌아옴 차례의 선생님 말(m-3): ${t.teacherSay}`]
          : []),
        "",
        `앱 판단: 토막 ${t.app.segment ?? "-"} · 사실 줄 ${t.app.facts.join(" · ") || "-"} · 끝 ${t.app.turnEnd ?? "-"} · 신호 ${t.app.signal ? JSON.stringify(t.app.signal) : "-"} · 받침 ${t.app.stage ?? "-"} · 잇달아 ${t.app.run ?? "-"} · 알림 ${t.app.recognizerNote ?? "-"} · 힌트 단 ${t.app.hintTiers.join(",") || "-"} · 따라 할 문장 ${t.app.listen ? `${t.app.listen.sentence}(${t.app.listen.inSay ? "say 에 듦" : "어긋남"})` : "-"} · 고르기 ${t.app.choices ? "예" : "-"}${t.app.note ? ` · ${t.app.note}` : ""}`,
        "",
      );
    }
  }
  if (logs !== undefined) {
    out.push("## 대본별 차례(가짜 · 실호출 구분)", "");
    for (const l of logs) {
      out.push(`### ${l.script}`, "");
      for (const t of l.turns) {
        const calls = t.calls
          .map(
            (c) =>
              `${c.kind}${c.live ? "(실호출)" : "(가짜)"}${c.spot ? `[${c.spot}]` : ""}${c.ok ? "" : " 실패"}`,
          )
          .join(" · ");
        const said = t.shown
          .filter((x) => x.startsWith("말풍선: ") || x.startsWith("닫는 줄: "))
          .join(" / ");
        out.push(
          `- 차례 ${t.no} · ${t.entry} · ${calls || "호출 없음"}${said ? ` — ${said}` : ""}`,
        );
      }
      out.push("");
    }
  }
  return `${out.join("\n")}\n`;
}

// ── 실행 ─────────────────────────────────────────────────────────

type Args = { live: boolean; maxCalls: number; out: string; where: SpotWhere };

export function parseSpotArgs(argv: readonly string[]): Args {
  const args: Args = {
    live: false,
    maxCalls: DEFAULT_MAX_CALLS,
    out: join(tmpdir(), `chat-spots-${Date.now()}`),
    where: { ...DEFAULT_SPOT_WHERE },
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--live") args.live = true;
    else if (a === "--max-calls") {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 0)
        throw new Error("--max-calls 는 0 이상 정수");
      args.maxCalls = n;
    } else if (a === "--out") {
      const v = argv[++i];
      if (!v) throw new Error("--out 뒤에 폴더가 없다");
      args.out = v;
    } else if (a === "--level" || a === "--unit" || a === "--lesson") {
      const n = Number(argv[++i]);
      if (!Number.isInteger(n) || n < 1) throw new Error(`${a} 는 1 이상 정수`);
      args.where[
        a === "--level" ? "level" : a === "--unit" ? "unit" : "lesson"
      ] = n;
    } else throw new Error(`모르는 인자: ${a}`);
  }
  return args;
}

async function main(): Promise<number> {
  const args = parseSpotArgs(process.argv.slice(2));
  const env = spotEnvOf(process.cwd(), args.where);
  const fakeRuns = await runAllSpots(env);
  const retryMax = env.config.values[HINT_RETRY_MAX_KEY];
  const plan = livePlanOf(
    fakeRuns,
    typeof retryMax === "number" ? retryMax : 0,
  );
  let runs = fakeRuns;
  if (!args.live)
    console.log("chat-spots: 가짜 응답으로 돕니다(실호출은 --live)");
  else {
    const gate = planGate(plan, args.maxCalls);
    if (!gate.ok) {
      console.error(`chat-spots: ${gate.message}`);
      return 3;
    }
    console.log(`chat-spots: 실호출 — ${gate.message}`);
    const key = readApiKey();
    if (key === null) {
      console.error("chat-spots: ANTHROPIC_API_KEY 가 없습니다(.env.local)");
      return 2;
    }
    runs = await runAllSpots(env, {
      live: createScriptClient(key) as unknown as Anthropic,
    });
  }
  const spots = spotsOf(runs);
  const scripts = scriptLogsOf(runs);
  mkdirSync(args.out, { recursive: true });
  writeFileSync(
    join(args.out, "spots.json"),
    `${JSON.stringify({ live: args.live, level: env.materials.level, unit: env.materials.unit, lesson: env.materials.lessonNo, teacher: TEACHER, settingsSource: env.config.settingsSource, plan, spots, scripts }, null, 2)}\n`,
  );
  writeFileSync(
    join(args.out, "screens.json"),
    `${JSON.stringify({ live: args.live, screens: screensOf(spots, runs) }, null, 2)}\n`,
  );
  writeFileSync(
    join(args.out, "spots.md"),
    spotsMarkdown(spots, args.live, scripts),
  );
  const reached = spots.filter((s) => s.reached).length;
  console.log(
    `chat-spots: 자리 ${spots.length} 가운데 닿음 ${reached}${
      reached < spots.length
        ? ` · 닿지 못함 ${spots
            .filter((s) => !s.reached)
            .map((s) => `${s.id}(${s.why.join(" · ")})`)
            .join(", ")}`
        : ""
    }`,
  );
  console.log(`결과: ${args.out}(spots.json · spots.md · screens.json)`);
  return args.live || reached === spots.length ? 0 : 1;
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

if (isDirectRun())
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      console.error(
        `chat-spots: ${error instanceof Error ? error.message : "실패"}`,
      );
      process.exitCode = 1;
    },
  );

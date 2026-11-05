// 회화 수업 턴 새 꼴 견본 입력(회화 plan 묶음 6 — 단위 · 계약 시험이 같이 쓴다). 실제 API 를 부르지 않는다.
// 묶음 3 의 시험 builders(tests/fixtures/seed/builders.ts)와 따로 둔다(나란히 도는 동안 겹치지 않게). 카드 · 단계 규격은 손으로 만든 작은 견본이고,
// 단계 규격 칸 값은 seed/level-specs.json 회화 행(3 · 4 · 5 · 10단계)과 같다. 설정은 시험용 설정(testSettingValues)에서 읽는다.
import {
  type TalkCallStuckPlan,
  type TalkCallTurn,
  type TalkCardLine,
  type TalkLessonCardView,
  type TalkLessonInput,
  type TalkLessonSpecView,
  type TalkTeacher,
  talkLessonRulesOf,
} from "@/core/ai/calls/talk-lesson";
import { testSettingValues } from "../settings";

export const values = testSettingValues();

/** 견본 선생님 둘(명단 키 mina · leo 의 영어 이름 · 성격 글 꼴). */
export const LESSON_TEACHER: TalkTeacher = {
  nameEn: "Mina",
  personaEn:
    "Warm and patient. You go step by step and laugh together with the child.",
};
export const LESSON_TEACHER_LEO: TalkTeacher = {
  nameEn: "Leo",
  personaEn: "Bright and playful. You like jokes and quick games.",
};

/** 단계 규격 보기(seed/level-specs.json 회화 행과 같은 값). */
const SPECS: Record<number, TalkLessonSpecView & { sentenceMaxWords: number }> =
  {
    3: {
      mode: "짧은 준비 뒤 대화. 한 문장으로 답하게 묻는다",
      targetTurns: 15,
      missions: 0,
      hintTiers: ["ko", "frame", "sentence"],
      usablePhrases: 0,
      koMeaning: true,
      koExplainFromStuck: 1,
      choices: false,
      sentenceMaxWords: 7,
    },
    4: {
      mode: "준비 없이 대화하고 필요할 때만 짧은 준비를 한다",
      targetTurns: 20,
      missions: 0,
      hintTiers: ["ko", "frame", "sentence"],
      usablePhrases: 0,
      koMeaning: true,
      koExplainFromStuck: 1,
      choices: false,
      sentenceMaxWords: 8,
    },
    5: {
      mode: "상황극(가게 · 학교). 선생님이 상대역이고 미션 3개를 해낸다",
      targetTurns: 20,
      missions: 3,
      hintTiers: ["ko", "frame", "sentence"],
      usablePhrases: 3,
      koMeaning: false,
      koExplainFromStuck: 2,
      choices: false,
      sentenceMaxWords: 9,
    },
    10: {
      mode: "의견과 이유 주고받기",
      targetTurns: 25,
      missions: 0,
      hintTiers: [],
      usablePhrases: 0,
      koMeaning: false,
      koExplainFromStuck: 2,
      choices: false,
      sentenceMaxWords: 18,
    },
  };

export const GOAL_1 = "talk-3-1-1";
export const GOAL_2 = "talk-3-1-2";
/** 이월 목표(같은 단원 앞 세션에서 넘어옴). */
export const CARRY_GOAL = "talk-3-1-3";
/** 카드 목표 · 이월 목표 밖(다른 단원). */
export const OTHER_GOAL = "talk-3-2-1";

const item = (
  no: number,
  en: string,
  targets: string[],
  goals: string[],
  answerExample: string,
  ask: "first" | "re_ask",
) => ({
  no,
  en,
  ko: `질문 ${no}`,
  targets,
  goals,
  ask,
  hintKo: `힌트 ${no}`,
  hints: ["I play ___.", answerExample],
  answerExample,
  easyQuestion: { en: "Do you like it?", ko: "좋아해?" },
});

/** 3단계 배정 수업 카드(새 꼴): 목표 둘 · 오늘 쓸 말 넷 · 짧은 준비 셋 · 필수 질문 셋 · 더 이야기할 거리 둘. */
export const CARD3: TalkLessonCardView = {
  topic: "Weekend fun",
  targetExpressions: ["I play ___.", "I like ___."],
  goals: [GOAL_1, GOAL_2],
  todayWords: [
    {
      word: "play",
      meaningKo: "놀다",
      example: "I play.",
      modelLine: "I play.",
    },
    {
      word: "soccer",
      meaningKo: "축구",
      example: "I play soccer.",
      modelLine: "Soccer.",
    },
    {
      word: "sunday",
      meaningKo: "일요일",
      example: "I like Sunday.",
      modelLine: "Sunday.",
    },
    {
      word: "weekend",
      meaningKo: "주말",
      example: "I like the weekend.",
      modelLine: "The weekend.",
    },
  ],
  prep: ["play", "soccer", "sunday"],
  required: [
    item(
      1,
      "What do you do on the weekend?",
      ["play"],
      [GOAL_1],
      "I play.",
      "first",
    ),
    item(
      2,
      "What sport is fun?",
      ["soccer"],
      [GOAL_1],
      "Soccer is fun.",
      "first",
    ),
    item(
      3,
      "When is your free day?",
      ["sunday"],
      [GOAL_2],
      "Sunday is my free day.",
      "first",
    ),
  ],
  more: [
    item(
      1,
      "What do you do after school?",
      ["play"],
      [GOAL_1],
      "I play with my friend.",
      "re_ask",
    ),
    item(
      2,
      "What day is it today?",
      ["sunday"],
      [GOAL_2],
      "It is Sunday.",
      "re_ask",
    ),
  ],
  flow: [
    "The teacher asks what the child does on the weekend.",
    "The teacher brings up the word weekend.",
  ],
};

/** 4단계 카드(같은 단원 꼴, 짧은 준비 낱말 없음). */
export const CARD4: TalkLessonCardView = {
  ...CARD3,
  prep: undefined,
  required: CARD3.required.slice(0, 2),
  more: CARD3.more.slice(0, 1),
};

/** 5단계 카드(미션 셋 · 역할 바꾸기). */
export const CARD5: TalkLessonCardView = {
  ...CARD4,
  missions: [
    { ko: "사과 두 개 사기", en: "Buy two apples.", goals: [GOAL_1] },
    { ko: "값 묻기", en: "Ask the price.", goals: [GOAL_2] },
    { ko: "고맙다고 하기", en: "Say thank you.", goals: [GOAL_1] },
  ],
  roleSwap: {
    firstLine: "Now you sell, and I buy.",
    hint: "Here you are.",
    purpose: "shop",
  },
};

/** 시험 단원 단어(원형)와 활용형. */
const VOCAB: Record<string, string> = {
  play: "play",
  plays: "play",
  played: "play",
  soccer: "soccer",
  sunday: "sunday",
  sundays: "sunday",
  weekend: "weekend",
  weekends: "weekend",
  tag: "tag",
  apple: "apple",
  apples: "apple",
};
export const UNIT_WORDS = [
  "play",
  "soccer",
  "sunday",
  "weekend",
  "tag",
  "apple",
];
export const lemmaOf = (surface: string): string | undefined =>
  VOCAB[surface.toLowerCase()];

/** 3단계 어휘 범위 견본(소문자 원형). */
export const ALLOWED_WORDS: ReadonlySet<string> = new Set([
  "i",
  "you",
  "do",
  "what",
  "is",
  "it",
  "a",
  "the",
  "yes",
  "no",
  "my",
  "me",
  "too",
  "like",
  "fun",
  "and",
  "with",
  "friend",
  "today",
  "day",
  "good",
  "great",
  "wow",
  "oh",
  "nice",
  "say",
  "listen",
  "let's",
  "together",
  "that's",
  "okay",
  "on",
  "free",
  "your",
  "sport",
  "when",
  "can",
]);

/** 대화 토막 AI 차례 기본(말로 답함 · 힌트 없음 · 받침 없음 · 남은 기회 셋). */
export const BASE_CALL_TURN: TalkCallTurn = {
  child: "I play soccer.",
  input: "speech",
  segment: "talk",
  hintKind: "none",
  hintTier: 0,
  heardHelp: "none",
  reason: null,
  kind: "ai",
  aiAsks: true,
  cardLine: null,
  supportStage: 0,
  stuckQuestion: "",
  stuckAnswer: "",
  ifStuck: null,
  chances: {
    carry: { goals: [CARRY_GOAL], words: [] },
    required: [
      { no: 2, targets: ["soccer"] },
      { no: 3, targets: ["sunday"] },
    ],
    reuse: ["play"],
    introduce: ["weekend"],
  },
  returnNudge: false,
  allChancesUsed: false,
  followChildTurns: 0,
  turnsLeft: 9,
  floor: false,
  closing: false,
  levelTest: false,
};

const CARDS: Record<number, TalkLessonCardView> = {
  3: CARD3,
  4: CARD4,
  5: CARD5,
  10: CARD4,
};

/** 회화 수업 턴 견본 입력. */
export function lessonInput(
  level: number,
  over: Omit<Partial<TalkLessonInput>, "turn"> & {
    turn?: Partial<TalkCallTurn>;
  } = {},
): TalkLessonInput {
  const { sentenceMaxWords, ...spec } = SPECS[level] ?? SPECS[3];
  const { turn, ...rest } = over;
  return {
    level,
    canDo: "선생님의 질문에 한 문장으로 답한다",
    learningElement: "좋아하는 것 말하기",
    prevLearningElements: [],
    unitWords: UNIT_WORDS,
    sentenceMaxWords,
    spec,
    teacher: LESSON_TEACHER,
    card: CARDS[level] ?? CARD3,
    goalTexts: [
      { id: GOAL_1, ko: "주말에 하는 일을 말한다" },
      { id: GOAL_2, ko: "좋아하는 요일을 말한다" },
      { id: CARRY_GOAL, ko: "친구와 하는 일을 말한다" },
    ],
    carryGoals: [CARRY_GOAL],
    summaries: ["축구를 좋아한다고 했다."],
    history: [],
    lineRange: {
      allowedWords: ALLOWED_WORDS,
      forms: [],
      allowedForms: new Set(),
      childWords: ["soccer"],
      reaskWords: [],
    },
    imageWords: new Set(["soccer", "dinosaur"]),
    lemmaOf,
    ...rest,
    turn: { ...BASE_CALL_TURN, ...turn },
  };
}

export const lessonRules = (level: number) =>
  talkLessonRulesOf(values, { level });

/** 받침 첫째(같이 말하기)를 줄 턴: 막힌 질문은 필수 1, 답 예시는 카드 것. */
const STUCK_ON_REQUIRED_1: Partial<TalkCallTurn> = {
  child: "",
  input: "dont_know",
  reason: "button",
  supportStage: 1,
  stuckQuestion: "What do you do on the weekend?",
  stuckAnswer: "I play.",
};
const CARD_LINE_2: TalkCardLine = {
  role: "card",
  kind: "required",
  no: 2,
  en: "What sport is fun?",
};
/** 1~3단계 카드 자리(받침 · 닫기 · 들리지 않음은 앱이 카드 답 소리 · 질문을 붙인다, 02-2 259~261줄 · C194 (1)). */
const LOW_SLOT: Partial<TalkCallTurn> = { kind: "card_slot", aiAsks: false };
/** 말 입력 턴의 막힘 계획(묶음 5 teacherTurnPlansOf ifStuck 꼴): 1~3단계는 카드 답 소리의 카드 자리, 4단계부터는 묻지 않는 AI 차례. */
const STUCK_PLAN_LOW: TalkCallStuckPlan = {
  kind: "card_slot",
  aiAsks: false,
  cardLine: null,
  supportStage: 1,
  stuckQuestion: "What do you do on the weekend?",
  stuckAnswer: "I play.",
};
const STUCK_PLAN_UPPER: TalkCallStuckPlan = {
  ...STUCK_PLAN_LOW,
  kind: "ai",
};

/** 계약 표본 이름(talk_turn.v2-<이름>)마다의 견본 입력 — 단계는 이름의 l 숫자. */
const SAMPLE_TURNS: Record<string, Partial<TalkCallTurn>> = {
  "l3-ai": {},
  /** 흘려 받기 시험의 대체 모델 표본(fallback 블록 — 응답은 l3-ai 와 같다, 회화 plan 묶음 12). */
  "l3-fallback": {},
  "l3-card-slot": { ...LOW_SLOT, cardLine: CARD_LINE_2 },
  "l3-support-together": { ...STUCK_ON_REQUIRED_1, ...LOW_SLOT },
  "l3-support-easy": {
    ...STUCK_ON_REQUIRED_1,
    ...LOW_SLOT,
    supportStage: 2,
    cardLine: {
      role: "easy",
      kind: "required",
      no: 1,
      en: "Do you like it?",
    },
  },
  "l3-support-close": {
    ...STUCK_ON_REQUIRED_1,
    ...LOW_SLOT,
    supportStage: 3,
    cardLine: CARD_LINE_2,
  },
  "l3-nospeech": {
    ...STUCK_ON_REQUIRED_1,
    ...LOW_SLOT,
    reason: "nospeech",
    supportStage: 0,
    cardLine: CARD_LINE_2,
  },
  "l3-speech-stuck": { child: "What?", ifStuck: STUCK_PLAN_LOW },
  "l3-speech-answered": { child: "Soccer.", ifStuck: STUCK_PLAN_LOW },
  "l3-closing-suggest": {
    allChancesUsed: true,
    chances: {
      carry: { goals: [], words: [] },
      required: [],
      reuse: [],
      introduce: [],
    },
  },
  "l3-closing-early": {},
  "l3-model-offband": {},
  "l4-ai": {},
  "l4-support-together": { ...STUCK_ON_REQUIRED_1, aiAsks: false },
  "l4-nospeech": {
    ...STUCK_ON_REQUIRED_1,
    reason: "nospeech",
    supportStage: 0,
  },
  "l4-speech-stuck": { child: "What?", ifStuck: STUCK_PLAN_UPPER },
  "l4-speech-answered": { child: "Soccer.", ifStuck: STUCK_PLAN_UPPER },
  "l5-mission": { child: "Two apples, please." },
  "l5-closing": { child: "", closing: true },
};

export function talkLessonSampleFor(caseId: string): TalkLessonInput {
  const name = caseId.replace(/^talk_turn\.v2-/, "");
  const level = Number(/^l(\d+)-/.exec(name)?.[1] ?? 3);
  const turn = SAMPLE_TURNS[name];
  if (turn === undefined) throw new Error(`모르는 새 꼴 표본 ${caseId}`);
  return lessonInput(level, { turn });
}

// 호출마다 견본 입력 · 단계 맥락 · 지어낸 이름(plan-p09b 파일별 값 9). P9c 의 계약 · 관찰 명령도 쓴다.
// 아이 글은 손으로 쓴 견본이다(일부러 틀린 꼴 · 인식 오류로 바뀐 말 · 한국어 섞인 말 · 이름 · 전화번호 꼴 포함).
// 아이 이름은 지어낸 이름(가나다 · Ganada)만, 전화번호는 견본 꼴(010-1234-5678)만 쓴다.
// can-do · 문장 길이 상한은 P4a level_specs 견본에서 읽는다(설계 숫자를 다시 적지 않는다).
import type { LevelContext } from "@/core/ai/calls/common";
import {
  type SpeakingAnswerInput,
  type SpeakingConfirmInput,
  type SpeakingPresentationInput,
  speakingRulesOf,
} from "@/core/ai/calls/speaking";
import type {
  TalkTeacher,
  TalkTurn,
  TalkTurnInput,
} from "@/core/ai/calls/talk";
import type { ThinkoutInput } from "@/core/ai/calls/thinkout";
import type {
  WritingCheckInput,
  WritingFeedbackInput,
} from "@/core/ai/calls/writing";
import type { NameSource } from "@/core/ai/mask";
import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import type { Area } from "@/core/seed/structure";
import { lemmaLookup } from "@/core/session/attempt";
import {
  defaultSettings,
  referenceSet,
  talkCard,
  teacherRoster,
} from "../seed/builders";

/** 지어낸 아이 이름. */
export const SAMPLE_NAMES: NameSource = {
  displayName: "가나다",
  englishName: "Ganada",
  nickname: null,
};
/** 견본 전화번호 · 전자 우편 꼴. */
export const SAMPLE_PHONE = "010-1234-5678";
export const SAMPLE_EMAIL = "ganada@example.com";

/** 견본이 있는 단계. */
export const SAMPLE_LEVELS = [3, 4, 5, 6, 9, 10] as const;
export type SampleLevel = (typeof SAMPLE_LEVELS)[number];

const reference = referenceSet(defaultSettings());

/** 단계 규격 견본(P4a). */
export function sampleLevelSpec(area: Area, level: number) {
  const spec = reference.levelSpecs.levelSpecs.find(
    (s) => s.area === area && s.level === level,
  );
  if (!spec) throw new Error(`견본에 없는 단계 규격: ${area} ${level}`);
  return spec;
}

/** 견본 forbidden 목록(P4a). */
export const SAMPLE_FORBIDDEN = reference.forbidden;
/** 견본 집 주소 꼴(시드 contact 범주가 맡는 주소, C67 (4) 를 흉내 냄). */
export const SAMPLE_ADDRESS = "101동 202호";
/** 시드 contact 정규식 + 견본 주소 꼴(C67 (4)). */
export const SAMPLE_CONTACT_PATTERNS = [
  ...reference.forbidden.patterns
    .filter((p) => p.category === "contact")
    .map((p) => p.regex),
  "\\d{1,4}동 ?\\d{1,4}호",
];

/** 단계마다 손으로 쓴 학습 요소 · 단원 단어(3.6 차례를 흉내 냄). */
const LEVEL_MATERIAL: Record<
  SampleLevel,
  { element: string; prev: string[]; words: string[] }
> = {
  3: {
    element: "be 동사 문장(I am · It is)",
    prev: ["명사와 a · an"],
    words: ["cat", "dog", "big", "small", "happy"],
  },
  4: {
    element: "일반동사 현재(I like · He likes)",
    prev: ["be 동사 문장", "명사 복수"],
    words: ["apple", "banana", "like", "eat", "every"],
  },
  5: {
    element: "현재진행(I am playing)",
    prev: ["일반동사 현재", "빈도 부사"],
    words: ["play", "park", "run", "now", "friend"],
  },
  6: {
    element: "과거형(I went · I played)",
    prev: ["현재진행", "일반동사 현재"],
    words: ["yesterday", "went", "beach", "swim", "sand", "fun"],
  },
  9: {
    element: "비교급과 최상급",
    prev: ["미래 will", "과거진행"],
    words: ["taller", "fastest", "than", "favorite", "season", "because"],
  },
  10: {
    element: "현재완료(I have been)",
    prev: ["비교급과 최상급", "to 부정사"],
    words: ["ever", "never", "visited", "already", "experience", "travel"],
  },
};

/** 단계 맥락(영역의 can-do · 문장 길이 상한은 level_specs 견본). */
export function sampleContext(area: Area, level: SampleLevel): LevelContext {
  const spec = sampleLevelSpec(area, level);
  const material = LEVEL_MATERIAL[level];
  return {
    level,
    canDo: spec.canDo,
    learningElement: material.element,
    prevLearningElements: [...material.prev],
    unitWords: [...material.words],
    sentenceMaxWords: spec.sentenceMaxWords,
  };
}

// ── 쓰기 확인(4 · 5단계) ─────────────────────────────────────────

function writingCheck(level: 4 | 5, sentences: string[]): WritingCheckInput {
  return {
    ...sampleContext("writing", level),
    task:
      level === 4
        ? "문장 틀로 좋아하는 과일 문장 3개를 써요: I like ___. / He likes ___."
        : "지금 하고 있는 일을 문장 틀로 써요: I am ___ing in the ___.",
    example:
      level === 4
        ? "I like apples. He likes bananas."
        : "I am playing in the park.",
    sentences,
  };
}

/** 쓰기 확인 견본(4단계, 둘째 문장이 틀림). */
export const WRITING_CHECK_SAMPLE: WritingCheckInput = writingCheck(4, [
  "I like peaches.",
  "He like bananas.",
  "My friend Ganada likes grapes.",
]);

// ── 쓰기 첨삭(6 · 9 · 10단계) ────────────────────────────────────

const FEEDBACK_DRAFTS: Record<6 | 9 | 10, string> = {
  6: "Yesterday I go to the beach with my family. I swim in the sea. The sand was hot. It was very fun. My phone is 010-1234-5678.",
  9: "Summer is my favorite season. It is more hotter than spring. I can swim and eat ice cream. My friend Ganada is the fastest swimmer in my class.",
  10: "I have visit Jeju island two times. I have never see a bigger mountain than Hallasan. Next time I want to travel to 부산 with my family. You can mail me at ganada@example.com.",
};

/** 쓰기 첨삭 견본(단계마다). */
export function writingFeedbackSample(
  level: 6 | 9 | 10,
  overrides: Partial<WritingFeedbackInput> = {},
): WritingFeedbackInput {
  return {
    ...sampleContext("writing", level),
    task: "지난 주말이나 좋아하는 계절에 대해 글을 써요.",
    example: "Last weekend I visited my grandmother. We made dumplings.",
    draft: FEEDBACK_DRAFTS[level],
    thinkoutSummary: "바다에 간 일, 모래가 뜨거웠던 것, 가족과 수영한 것",
    forLevelTest: false,
    ...overrides,
  };
}

// ── 말하기 평가(3 · 4 · 6 · 9 · 10단계) ─────────────────────────

function speakingSpec(level: number) {
  const spec = sampleLevelSpec("speaking", level);
  if (spec.area !== "speaking") throw new Error("말하기 규격이 아니다");
  return spec;
}

/** 말하기 질문 답 견본. grammarNoteMax 는 level_specs 의 questions.modelAnswer 로 정한다(정할 것 다). */
export function speakingAnswerSample(
  level: 3 | 4 | 6,
  overrides: Partial<SpeakingAnswerInput> = {},
): SpeakingAnswerInput {
  return {
    ...sampleContext("speaking", level),
    question: "What do you like to eat?",
    scene: null,
    transcript: "i like a apple and banana",
    grammarNoteMax: speakingRulesOf(speakingSpec(level)).grammarNoteMax,
    seedCorrectAnswer: level === 3 ? "I like apples." : null,
    ...overrides,
  };
}

/** 말하기 발표 견본(9 · 10단계). 확인 질문 수는 level_specs 의 presentation.confirmQuestions. */
export function speakingPresentationSample(
  level: 9 | 10,
  overrides: Partial<SpeakingPresentationInput> = {},
): SpeakingPresentationInput {
  const count = speakingRulesOf(speakingSpec(level)).confirmQuestionCount;
  return {
    ...sampleContext("speaking", level),
    topic: "My favorite season",
    prepWords: ["summer", "swim", "because"],
    transcript:
      "my favorite season is summer because i can swim in the see and eat ice cream with my friend ganada",
    confirmQuestionCount: count,
    spareConfirmQuestions: Array.from(
      { length: count },
      (_, i) =>
        [
          "Why do you like summer?",
          "What do you do in summer?",
          "Who do you swim with?",
        ][i] ?? `What else do you like? (${i + 1})`,
    ),
    withConfirmQuestions: true,
    ...overrides,
  };
}

/** 말하기 확인 질문 답 견본(9단계). */
export const SPEAKING_CONFIRM_SAMPLE: SpeakingConfirmInput = {
  ...sampleContext("speaking", 9),
  presentationTranscript: speakingPresentationSample(9).transcript,
  question: "Why do you like summer?",
  transcript: "because it is hot and i can swim",
};

// ── 생각 꺼내기(6단계) ───────────────────────────────────────────

/** 생각 꺼내기 견본의 단계 어휘 범위(소문자). P9c 가 vocab 에서 채우는 자리. */
export const THINKOUT_ALLOWED_WORDS: ReadonlySet<string> = new Set([
  ...LEVEL_MATERIAL[6].words,
  "sea",
  "hot",
  "family",
  "sun",
  "play",
  "friend",
]);

/** 생각 꺼내기 견본 대화(앞 턴의 토리 글은 정규화한 값의 JSON, 답은 아이 글). */
export const THINKOUT_HISTORY: ThinkoutInput["history"] = [
  {
    assistant: JSON.stringify({
      question: "지난 주말에 어디에 갔어요?",
      options: ["바다", "공원", "할머니 댁"],
      done: false,
      summary: "",
      words: [],
      starters: [],
    }),
    answer: `바다요! 가나다랑 갔어요. 엄마 번호는 ${SAMPLE_PHONE} 이고 우리 집은 ${SAMPLE_ADDRESS} 예요`,
  },
  {
    assistant: JSON.stringify({
      question: "바다에서 무엇을 했어요?",
      options: ["수영", "모래 놀이", "조개 줍기"],
      done: false,
      summary: "",
      words: [],
      starters: [],
    }),
    answer: "수영하고 모래성 만들었어요",
  },
];

/** 생각 꺼내기 견본(turn 번째 턴, 앞 턴 기록은 THINKOUT_HISTORY 에서). */
export function thinkoutSample(
  turn: number,
  overrides: Partial<ThinkoutInput> = {},
): ThinkoutInput {
  return {
    ...sampleContext("writing", 6),
    task: "지난 주말에 한 일을 4~5문장으로 써요.",
    example: "Last weekend I visited my grandmother. We made dumplings.",
    hints: ["어디에 갔는지", "누구와 갔는지", "무엇을 했는지"],
    newWords: ["yesterday", "went", "beach"],
    allowedWords: THINKOUT_ALLOWED_WORDS,
    history: THINKOUT_HISTORY.slice(0, Math.max(0, turn - 1)),
    turn,
    ...overrides,
  };
}

// ── 관찰용 변형(호출마다 다섯) ───────────────────────────────────

export const WRITING_CHECK_VARIANTS: readonly WritingCheckInput[] = [
  WRITING_CHECK_SAMPLE,
  writingCheck(4, ["I likes apple.", "She like banana", "i like 사과."]),
  writingCheck(4, ["I like apples.", "He likes bananas.", "We like grapes."]),
  writingCheck(5, [
    "I am play in the park.",
    "My dog is runing now.",
    "가나다 is reading a book.",
  ]),
  writingCheck(5, [
    "I am playing soccer in the park.",
    `Call me ${SAMPLE_PHONE}.`,
    "My friend is eating now.",
  ]),
];

export const WRITING_FEEDBACK_VARIANTS: readonly WritingFeedbackInput[] = [
  writingFeedbackSample(6),
  writingFeedbackSample(6, {
    draft: "yesterday i went beach. i swim. 너무 재밌었다. sand hot.",
    thinkoutSummary: null,
  }),
  writingFeedbackSample(9),
  writingFeedbackSample(10),
  writingFeedbackSample(10, { forLevelTest: true }),
];

export const SPEAKING_ANSWER_VARIANTS: readonly SpeakingAnswerInput[] = [
  speakingAnswerSample(3),
  speakingAnswerSample(4),
  speakingAnswerSample(4, { transcript: "I like a pull" }),
  speakingAnswerSample(6, {
    question: "Look at the picture. What is the boy doing?",
    scene: "A boy is flying a kite in a park.",
    transcript: "the boy is fly a kite in the park",
  }),
  speakingAnswerSample(6, { transcript: `my number is ${SAMPLE_PHONE}` }),
];

export const SPEAKING_PRESENTATION_VARIANTS: readonly SpeakingPresentationInput[] =
  [
    speakingPresentationSample(9),
    speakingPresentationSample(9, { transcript: "summer good. i like. 수영" }),
    speakingPresentationSample(10),
    speakingPresentationSample(10, { withConfirmQuestions: false }),
    speakingPresentationSample(10, {
      transcript: `I like winter because I can ski. Call me at ${SAMPLE_PHONE}.`,
    }),
  ];

export const SPEAKING_CONFIRM_VARIANTS: readonly SpeakingConfirmInput[] = [
  SPEAKING_CONFIRM_SAMPLE,
  { ...SPEAKING_CONFIRM_SAMPLE, transcript: "i dont know" },
  { ...SPEAKING_CONFIRM_SAMPLE, transcript: "becuase is hot" },
  {
    ...SPEAKING_CONFIRM_SAMPLE,
    question: "Who do you swim with?",
    transcript: "with my friend Ganada",
  },
  {
    ...SPEAKING_CONFIRM_SAMPLE,
    question: "What do you do in summer?",
    transcript: "I swim and eat ice cream and play games with my family",
  },
];

export const THINKOUT_VARIANTS: readonly ThinkoutInput[] = [
  thinkoutSample(1),
  thinkoutSample(2),
  thinkoutSample(3),
  thinkoutSample(2, {
    history: [
      {
        ...THINKOUT_HISTORY[0],
        answer: "몰라요",
      } as ThinkoutInput["history"][number],
    ],
  }),
  thinkoutSample(1, {
    newWords: ["yesterday", "went", "beach", "swim", "sand", "fun"],
  }),
];

// ── 회화 턴 · 끝맺음 턴(plan-p13a 작업 2 — 계약 · 통합 시험이 같이 쓴다) ─────

/** 회화 턴의 늘 넣는 값 기본(말로 답함 · 힌트 없음 · 대화 토막). */
export const TALK_BASE_TURN: TalkTurn = {
  child: "I like apples.",
  input: "speech",
  segment: "talk",
  hintKind: "none",
  hintTier: 0,
  heardHelp: "none",
  dontKnowCount: 0,
  targetReached: false,
  closing: false,
  levelTest: false,
  moreTalkUsedUp: false,
  aiQuestionSlot: false,
};

const talkLemmaOf = lemmaLookup(reference.vocab.vocab);

/** 견본 명단(미나 · 리오)의 AI 고정부 재료(영어 이름 · 성격 글, 6.1 선생님 블록 — 선생님 화면 plan 값 8). */
function samplePromptOf(key: string): TalkTeacher {
  const t = teacherRoster().teachers.find((x) => x.key === key);
  if (!t) throw new Error(`견본 명단에 ${key} 가 없다`);
  return { nameEn: t.nameEn, personaEn: t.personaEn };
}
/** 회화 견본의 기본 선생님(미나 — 시험 집 기본값과 같음). */
export const SAMPLE_TEACHER: TalkTeacher = samplePromptOf("mina");
/** 블록 밖 글을 견주는 둘째 선생님(리오). */
export const SAMPLE_TEACHER_LEO: TalkTeacher = samplePromptOf("leo");

/** 회화 턴 견본 입력(카드 · 단계 규격은 견본 빌더, 단원 단어는 그 카드의 단원 단어). */
export function talkSample(
  level: number,
  over: Omit<Partial<TalkTurnInput>, "turn"> & {
    turn?: Partial<TalkTurn>;
  } = {},
): TalkTurnInput {
  const spec = sampleLevelSpec("talk", level) as TalkLevelSpec;
  const lesson = talkCard(reference, {
    level,
    unit: 1,
    kind: "assigned",
    lessonNo: 1,
    variant: 1,
  });
  const { turn, ...rest } = over;
  return {
    level,
    canDo: spec.canDo,
    learningElement: "좋아하는 것 말하기",
    prevLearningElements: [],
    unitWords: [...lesson.unitWords],
    sentenceMaxWords: spec.sentenceMaxWords,
    spec,
    card: lesson.card,
    summaries: ["사과를 좋아한다고 했다."],
    history: [],
    teacher: SAMPLE_TEACHER,
    lemmaOf: talkLemmaOf,
    ...rest,
    turn: { ...TALK_BASE_TURN, ...turn },
  };
}

/** 견본 이름(talk_turn.<이름>)에 맞는 회화 입력 — 끝맺음 · '더 이야기하기' AI 자리 견본은 그 턴 꼴로. */
export function talkSampleFor(caseId: string, level: number): TalkTurnInput {
  const closing = caseId.includes("closing");
  const aiSlot = caseId.includes("more-talk-ai");
  return talkSample(level, {
    turn: {
      closing,
      child: closing ? "" : TALK_BASE_TURN.child,
      ...(aiSlot
        ? { segment: "more_talk", moreTalkUsedUp: true, aiQuestionSlot: true }
        : {}),
    },
  });
}

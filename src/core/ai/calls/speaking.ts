// 말하기 평가 셋(질문 답 · 발표 · 확인 질문 답) 규격과 단계 규칙 읽기(6.2 · 3.3 · 6.1 · 6.4 끝 문단 · C63 (4),
// plan-p09b 파일별 값 6). 셋 모두 목적 speaking_eval 이고 공개 함수(P9c)가 입력의 mode 로 고른다.
import { z } from "zod";
import {
  type ApplyChecksResult,
  buildSystem,
  type CallSpec,
  type ChatMessage,
  COMMON_FIXED_RULES,
  clampScore,
  firstLine,
  firstSentence,
  hitUnder,
  type LevelContext,
  levelVariable,
  SAFE_LINE_KO,
} from "@/core/ai/calls/common";
import type { CheckField } from "@/core/ai/output-check";
import type { SpeakingLevelSpec } from "@/core/seed/schema/reference";
import {
  AI_SCORE,
  SPEAKING_GRAMMAR_NOTE_MAX,
  SPEAKING_JUDGEMENTS,
} from "@/core/seed/structure";

const ScoreSchema = z.int().min(AI_SCORE.min).max(AI_SCORE.max);
/** 점수 범위 · 판정 값 글(규격 설명 · 프롬프트에 끼워 넣는다, 검토 M-1). */
const SCORE_RANGE = `${AI_SCORE.min}-${AI_SCORE.max}`;
const JUDGEMENT_LIST = SPEAKING_JUDGEMENTS.join(", ");
const NonEmpty = z.string().min(1);

export type SpeakingRules = {
  grammarNoteMax: number;
  confirmQuestionCount: number;
};

/**
 * 단계 규칙 읽기. 1~3단계는 '바른 답 들려주기만'이고 level_specs 의 questions.modelAnswer 가 그 표시다(정할 것 다).
 * 확인 질문 수는 presentation.confirmQuestions(3.3).
 */
export function speakingRulesOf(levelSpec: SpeakingLevelSpec): SpeakingRules {
  return {
    grammarNoteMax: levelSpec.questions.modelAnswer
      ? 0
      : SPEAKING_GRAMMAR_NOTE_MAX,
    confirmQuestionCount: levelSpec.presentation?.confirmQuestions ?? 0,
  };
}

/** 고정부: 말로 한 답이고 브라우저 인식 글이다(6.1). */
const SPOKEN_RULES: readonly string[] = [
  "The child's answer was spoken and transcribed by the browser's speech recognition.",
  "Do not use parts that look like recognition errors (a similar-sounding different word, a missing function word, a one-sound difference at the end of a word) as grounds for a judgement, a score, feedback or a grammar note.",
];

// ── 질문 답 ──────────────────────────────────────────────────────

export type SpeakingAnswerInput = LevelContext & {
  question: string;
  /** 그림 과제의 시드 영어 장면 설명. */
  scene: string | null;
  transcript: string;
  grammarNoteMax: number;
  /** 시드의 바른 답(1~3단계에 있음). 걸린 바른 답을 바꿀 때 쓴다. */
  seedCorrectAnswer: string | null;
};

function speakingAnswerWire(grammarNoteMax: number) {
  return z
    .object({
      judgement: z
        .enum(SPEAKING_JUDGEMENTS)
        .describe(`One of: ${JUDGEMENT_LIST}`),
      feedback: NonEmpty.describe(
        "Korean, one sentence, 해요체: praise or feedback on the content",
      ),
      correctSentence: NonEmpty.describe(
        "One correct English sentence that answers the question, within the level's length and vocabulary",
      ),
      grammarNotes: z
        .array(NonEmpty)
        .max(grammarNoteMax)
        .describe(
          grammarNoteMax === 0
            ? "Must be empty"
            : `At most ${grammarNoteMax}, Korean one line each, 해요체`,
        ),
    })
    .meta({ title: "speaking_eval.answer" });
}

export type SpeakingAnswerOutput = z.infer<
  ReturnType<typeof speakingAnswerWire>
>;

const speakingAnswerLoose = z.object({
  judgement: z.string(),
  feedback: z.string(),
  correctSentence: z.string(),
  grammarNotes: z.array(z.string()),
});

const SPEAKING_ANSWER_RULES: readonly string[] = [
  `Judge the answer as one of ${JUDGEMENT_LIST} by whether its content fits the question (or picture) and whether its form is right.`,
  "Give one Korean sentence of praise or feedback on the content.",
  "Give one correct English sentence that answers the question, within the level's sentence length and vocabulary.",
  "Give grammar notes only as allowed in the user message.",
];

function isJudgement(
  value: string,
): value is (typeof SPEAKING_JUDGEMENTS)[number] {
  return (SPEAKING_JUDGEMENTS as readonly string[]).includes(value);
}

export const speakingAnswerSpec: CallSpec<
  SpeakingAnswerInput,
  SpeakingAnswerOutput,
  Record<string, never>
> = {
  purpose: "speaking_eval",
  title: "speaking_eval.answer",
  wireSchema: (input) => speakingAnswerWire(input.grammarNoteMax),
  looseSchema: speakingAnswerLoose,
  multiTurn: false,
  enumPaths: ["judgement"],
  settingSchemas: {},
  rulesOf: () => ({}),
  mask: (input, masker) => ({
    ...input,
    transcript: masker(input.transcript).text,
  }),
  system: (input) =>
    buildSystem({
      fixed: [...COMMON_FIXED_RULES, ...SPOKEN_RULES, ...SPEAKING_ANSWER_RULES],
      variable: [
        ...levelVariable(input),
        ["Question", input.question],
        ["Picture scene", input.scene ?? "(none)"],
      ],
    }),
  messages: (input): ChatMessage[] => [
    {
      role: "user",
      content: [
        `Child's answer (speech recognition): ${input.transcript}`,
        input.grammarNoteMax === 0
          ? "Grammar notes: none."
          : `Grammar notes: at most ${input.grammarNoteMax}, one Korean line each.`,
      ].join("\n\n"),
    },
  ],
  validate: (value, input) => {
    const issues: string[] = [];
    if (value.grammarNotes.length > input.grammarNoteMax) {
      issues.push("문법 지적이 상한보다 많다");
    }
    if (value.feedback.trim() === "") issues.push("피드백이 비었다");
    return issues;
  },
  normalize: (loose, input) => {
    const parsed = speakingAnswerLoose.safeParse(loose);
    if (!parsed.success) return null;
    const answer = parsed.data;
    if (!isJudgement(answer.judgement)) return null;
    // 빈 피드백은 필수 칸 없음(칭찬과 같게, 검토 M-3)
    const feedback = firstSentence(answer.feedback);
    if (feedback === "") return null;
    return {
      judgement: answer.judgement,
      feedback,
      // 바른 답은 그대로 남긴다(AC-5d). 비면 걸린 바른 답과 같게 시드 바른 답(검토 M-3)
      correctSentence:
        answer.correctSentence === ""
          ? (input.seedCorrectAnswer ?? "")
          : answer.correctSentence,
      // 빈 글을 거른 뒤 자른다. 0 이면 모두 지운다(AC-5d, 3단계 '문법 지적은 내지 않는다')
      grammarNotes: answer.grammarNotes
        .map(firstLine)
        .filter((note) => note !== "")
        .slice(0, input.grammarNoteMax),
    };
  },
  checkFields: (value): CheckField[] => [
    { path: "feedback", lang: "ko", text: value.feedback },
    { path: "correctSentence", lang: "en", text: value.correctSentence },
    ...value.grammarNotes.map(
      (note, i): CheckField => ({
        path: `grammarNotes.${i}`,
        lang: "ko",
        text: note,
      }),
    ),
  ],
  applyChecks: (
    value,
    hits,
    input,
  ): ApplyChecksResult<SpeakingAnswerOutput> => {
    if (hits.size === 0) return { value, changed: false, fatal: false };
    return {
      value: {
        judgement: value.judgement,
        feedback: hitUnder(hits, "feedback") ? SAFE_LINE_KO : value.feedback,
        correctSentence: hitUnder(hits, "correctSentence")
          ? (input.seedCorrectAnswer ?? "")
          : value.correctSentence,
        grammarNotes: value.grammarNotes.filter(
          (_, i) => !hitUnder(hits, `grammarNotes.${i}`),
        ),
      },
      changed: true,
      fatal: false,
    };
  },
};

// ── 발표 ─────────────────────────────────────────────────────────

export type SpeakingPresentationInput = LevelContext & {
  topic: string;
  prepWords: string[];
  transcript: string;
  /** level_specs presentation.confirmQuestions(3.3). */
  confirmQuestionCount: number;
  /** 시드의 예비 확인 질문(차례대로). */
  spareConfirmQuestions: string[];
  /** 단계 평가의 발표 문항은 false(6.2 '확인 질문을 내지 않는다'). */
  withConfirmQuestions: boolean;
};

function presentationWire(questionCount: number) {
  return z
    .object({
      contentScore: ScoreSchema.describe(`Content ${SCORE_RANGE}`),
      grammarScore: ScoreSchema.describe(`Grammar ${SCORE_RANGE}`),
      feedback: NonEmpty.describe("Korean, one sentence, 해요체"),
      confirmQuestions: z
        .array(NonEmpty)
        .max(questionCount)
        .describe(
          questionCount === 0
            ? "Must be empty"
            : `Exactly ${questionCount} English questions about the presentation`,
        ),
    })
    .meta({ title: "speaking_eval.presentation" });
}

export type SpeakingPresentationOutput = z.infer<
  ReturnType<typeof presentationWire>
>;

const scoresLoose = {
  contentScore: z.number(),
  grammarScore: z.number(),
  feedback: z.string(),
};
const presentationLoose = z.object({
  ...scoresLoose,
  confirmQuestions: z.array(z.string()),
});

const SCORE_RULES: readonly string[] = [
  `Score the content and the grammar of what the child said, each ${SCORE_RANGE}.`,
  "Give one Korean sentence of feedback.",
];

const PRESENTATION_RULES: readonly string[] = [
  "The child gave a short spoken presentation on the topic.",
  ...SCORE_RULES,
  "When the user message asks for confirm questions, write that many English questions that check the content of the presentation, within the level's sentence length and vocabulary. Never ask for personal information.",
];

function questionCountOf(input: SpeakingPresentationInput): number {
  return input.withConfirmQuestions ? input.confirmQuestionCount : 0;
}

export const speakingPresentationSpec: CallSpec<
  SpeakingPresentationInput,
  SpeakingPresentationOutput,
  Record<string, never>
> = {
  purpose: "speaking_eval",
  title: "speaking_eval.presentation",
  wireSchema: (input) => presentationWire(questionCountOf(input)),
  looseSchema: presentationLoose,
  multiTurn: false,
  enumPaths: [],
  settingSchemas: {},
  rulesOf: () => ({}),
  mask: (input, masker) => ({
    ...input,
    transcript: masker(input.transcript).text,
  }),
  system: (input) =>
    buildSystem({
      fixed: [...COMMON_FIXED_RULES, ...SPOKEN_RULES, ...PRESENTATION_RULES],
      variable: [
        ...levelVariable(input),
        ["Presentation topic", input.topic],
        ["Preparation words", input.prepWords.join(", ")],
      ],
    }),
  messages: (input): ChatMessage[] => {
    const count = questionCountOf(input);
    return [
      {
        role: "user",
        content: [
          `Child's presentation (speech recognition): ${input.transcript}`,
          count === 0
            ? "This is a level test presentation: give no confirm questions (empty list)."
            : `Confirm questions: exactly ${count}.`,
        ].join("\n\n"),
      },
    ];
  },
  validate: (value, input) => {
    const issues: string[] = [];
    if (value.confirmQuestions.length !== questionCountOf(input)) {
      issues.push("확인 질문 수가 규격과 다르다");
    }
    if (value.feedback.trim() === "") issues.push("피드백이 비었다");
    return issues;
  },
  normalize: (loose, input) => {
    const parsed = presentationLoose.safeParse(loose);
    if (!parsed.success) return null;
    const answer = parsed.data;
    const count = questionCountOf(input);
    const given = answer.confirmQuestions.filter((q) => q !== "");
    // 모자라면 같은 차례의 예비 확인 질문으로 채운다(6.2)
    const confirmQuestions = Array.from(
      { length: count },
      (_, i) => given[i] ?? input.spareConfirmQuestions[i],
    ).filter((q): q is string => q !== undefined);
    const feedback = firstSentence(answer.feedback);
    if (feedback === "") return null;
    return {
      contentScore: clampScore(answer.contentScore, AI_SCORE),
      grammarScore: clampScore(answer.grammarScore, AI_SCORE),
      feedback,
      confirmQuestions,
    };
  },
  checkFields: (value): CheckField[] => [
    { path: "feedback", lang: "ko", text: value.feedback },
    ...value.confirmQuestions.map(
      (q, i): CheckField => ({
        path: `confirmQuestions.${i}`,
        lang: "en",
        text: q,
      }),
    ),
  ],
  applyChecks: (
    value,
    hits,
    input,
  ): ApplyChecksResult<SpeakingPresentationOutput> => {
    if (hits.size === 0) return { value, changed: false, fatal: false };
    const confirmQuestions = value.confirmQuestions
      .map((q, i) =>
        hitUnder(hits, `confirmQuestions.${i}`)
          ? input.spareConfirmQuestions[i]
          : q,
      )
      .filter((q): q is string => q !== undefined);
    return {
      value: {
        ...value,
        feedback: hitUnder(hits, "feedback") ? SAFE_LINE_KO : value.feedback,
        confirmQuestions,
      },
      changed: true,
      fatal: false,
    };
  },
};

// ── 확인 질문 답 ─────────────────────────────────────────────────

export type SpeakingConfirmInput = LevelContext & {
  presentationTranscript: string;
  question: string;
  transcript: string;
};

const confirmWire = z
  .object({
    contentScore: ScoreSchema.describe(`Content ${SCORE_RANGE}`),
    grammarScore: ScoreSchema.describe(`Grammar ${SCORE_RANGE}`),
    feedback: NonEmpty.describe("Korean, one sentence, 해요체"),
  })
  .meta({ title: "speaking_eval.confirm" });

export type SpeakingConfirmOutput = z.infer<typeof confirmWire>;

const confirmLoose = z.object(scoresLoose);

const CONFIRM_RULES: readonly string[] = [
  "The child answered one confirm question about their own presentation.",
  ...SCORE_RULES,
];

export const speakingConfirmSpec: CallSpec<
  SpeakingConfirmInput,
  SpeakingConfirmOutput,
  Record<string, never>
> = {
  purpose: "speaking_eval",
  title: "speaking_eval.confirm",
  wireSchema: () => confirmWire,
  looseSchema: confirmLoose,
  multiTurn: false,
  enumPaths: [],
  settingSchemas: {},
  rulesOf: () => ({}),
  mask: (input, masker) => ({
    ...input,
    presentationTranscript: masker(input.presentationTranscript).text,
    transcript: masker(input.transcript).text,
  }),
  system: (input) =>
    buildSystem({
      fixed: [...COMMON_FIXED_RULES, ...SPOKEN_RULES, ...CONFIRM_RULES],
      variable: [...levelVariable(input), ["Confirm question", input.question]],
    }),
  messages: (input): ChatMessage[] => [
    {
      role: "user",
      content: [
        `Child's presentation (speech recognition): ${input.presentationTranscript}`,
        `Child's answer (speech recognition): ${input.transcript}`,
      ].join("\n\n"),
    },
  ],
  validate: (value) =>
    value.feedback.trim() === "" ? ["피드백이 비었다"] : [],
  normalize: (loose) => {
    const parsed = confirmLoose.safeParse(loose);
    if (!parsed.success) return null;
    const feedback = firstSentence(parsed.data.feedback);
    if (feedback === "") return null;
    return {
      contentScore: clampScore(parsed.data.contentScore, AI_SCORE),
      grammarScore: clampScore(parsed.data.grammarScore, AI_SCORE),
      feedback,
    };
  },
  checkFields: (value): CheckField[] => [
    { path: "feedback", lang: "ko", text: value.feedback },
  ],
  applyChecks: (value, hits): ApplyChecksResult<SpeakingConfirmOutput> => {
    if (hits.size === 0) return { value, changed: false, fatal: false };
    return {
      value: {
        ...value,
        feedback: hitUnder(hits, "feedback") ? SAFE_LINE_KO : value.feedback,
      },
      changed: true,
      fatal: false,
    };
  },
};

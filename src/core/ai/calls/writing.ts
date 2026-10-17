// 쓰기 확인(4~5단계) · 쓰기 첨삭(6단계부터, 단계 평가 쓰기 과제도) 규격(6.2 · 3.3 · 6.4 끝 문단 · C63 (4), plan-p09b 파일별 값 5).
import { z } from "zod";
import {
  type ApplyChecksResult,
  buildSystem,
  CallSettingError,
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
  type SettingValues,
} from "@/core/ai/calls/common";
import type { CheckField } from "@/core/ai/output-check";
import {
  AI_SCORE,
  WRITING_CHECK_DISTRACTORS,
  WRITING_CHECK_FIX_MAX,
} from "@/core/seed/structure";

const ScoreSchema = z.int().min(AI_SCORE.min).max(AI_SCORE.max);
/** 점수 범위 글(규격 설명 · 프롬프트에 끼워 넣는다, 검토 M-1). */
const SCORE_RANGE = `${AI_SCORE.min}-${AI_SCORE.max}`;
const NonEmpty = z.string().min(1);

// ── 쓰기 확인 ────────────────────────────────────────────────────

export type WritingCheckInput = LevelContext & {
  task: string;
  example: string;
  /** 아이가 낸 문장들(문장 틀 · 바꿀 칸을 채운 온 문장). */
  sentences: string[];
};

const WritingFixSchema = z.object({
  sentenceIndex: z.int().min(0),
  original: NonEmpty.describe(
    "The wrong part of the child's sentence, as written",
  ),
  corrected: NonEmpty.describe("The correct English expression for that part"),
  distractors: z
    .array(NonEmpty)
    .min(WRITING_CHECK_DISTRACTORS.min)
    .max(WRITING_CHECK_DISTRACTORS.max)
    .describe(
      `${WRITING_CHECK_DISTRACTORS.min} to ${WRITING_CHECK_DISTRACTORS.max} plausible wrong forms that fit the same place`,
    ),
  reason: NonEmpty.describe("Korean, one sentence, 해요체"),
});

const writingCheckWire = z
  .object({
    praise: NonEmpty.describe(
      "Korean, one line, 해요체, about a concrete part of the child's sentences",
    ),
    sentences: z
      .array(z.object({ index: z.int().min(0), correct: z.boolean() }))
      .describe("One judgement per child sentence, index from 0 in order"),
    fixes: z
      .array(WritingFixSchema)
      .max(WRITING_CHECK_FIX_MAX)
      .describe(`At most ${WRITING_CHECK_FIX_MAX} fix`),
  })
  .meta({ title: "writing_check" });

export type WritingCheckOutput = z.infer<typeof writingCheckWire>;

const writingCheckLoose = z.object({
  praise: z.string(),
  sentences: z.array(z.object({ index: z.number(), correct: z.boolean() })),
  fixes: z.array(
    z.object({
      sentenceIndex: z.number(),
      original: z.string(),
      corrected: z.string(),
      distractors: z.array(z.string()),
      reason: z.string(),
    }),
  ),
});

const WRITING_CHECK_RULES: readonly string[] = [
  "This is a quick check of sentences a child wrote with a sentence frame (writing levels 4-5).",
  "Judge every child sentence as correct or not (used for the score; the child sees at most one fix).",
  `Give at most ${WRITING_CHECK_FIX_MAX} fix. Pick it first from the learning element of this unit, then from earlier units.`,
  `A fix has the wrong part as written, the correct expression, ${WRITING_CHECK_DISTRACTORS.min}-${WRITING_CHECK_DISTRACTORS.max} plausible wrong forms for the same place, and a one-sentence Korean reason.`,
  "Praise is one Korean line that points to something concrete in the child's sentences.",
  "Do not write a model answer.",
];

export const writingCheckSpec: CallSpec<
  WritingCheckInput,
  WritingCheckOutput,
  Record<string, never>
> = {
  purpose: "writing_check",
  title: "writing_check",
  wireSchema: () => writingCheckWire,
  looseSchema: writingCheckLoose,
  multiTurn: false,
  enumPaths: [],
  settingSchemas: {},
  rulesOf: () => ({}),
  mask: (input, masker) => ({
    ...input,
    sentences: input.sentences.map((s) => masker(s).text),
  }),
  system: (input) =>
    buildSystem({
      fixed: [...COMMON_FIXED_RULES, ...WRITING_CHECK_RULES],
      variable: [
        ...levelVariable(input),
        ["Lesson task", input.task],
        ["Lesson example", input.example],
      ],
    }),
  messages: (input): ChatMessage[] => [
    {
      role: "user",
      content: `Child's sentences:\n${input.sentences
        .map((s, i) => `${i}. ${s}`)
        .join("\n")}`,
    },
  ],
  validate: (value, input) => {
    const issues: string[] = [];
    if (value.praise.trim() === "") issues.push("칭찬이 비었다");
    const indexes = value.sentences.map((s) => s.index);
    const expected = input.sentences.map((_, i) => i);
    if (JSON.stringify(indexes) !== JSON.stringify(expected)) {
      issues.push("문장 판정이 아이 문장 수 · 차례와 다르다");
    }
    for (const f of value.fixes) {
      if (f.sentenceIndex >= input.sentences.length) {
        issues.push("고칠 곳의 문장 번호가 범위 밖이다");
      }
    }
    return issues;
  },
  normalize: (loose, input) => {
    const parsed = writingCheckLoose.safeParse(loose);
    if (!parsed.success) return null;
    const answer = parsed.data;
    const praise = firstLine(answer.praise);
    if (praise === "") return null;
    // 문장 판정: 번호 차례로 · 같은 번호는 첫 것만 · 범위 밖은 버림 · 빠진 번호가 있으면 null(정할 것 바)
    const byIndex = new Map<number, boolean>();
    for (const s of answer.sentences) {
      if (!Number.isInteger(s.index)) continue;
      if (s.index < 0 || s.index >= input.sentences.length) continue;
      if (!byIndex.has(s.index)) byIndex.set(s.index, s.correct);
    }
    if (byIndex.size !== input.sentences.length) return null;
    const sentences = input.sentences.map((_, index) => ({
      index,
      correct: byIndex.get(index) as boolean,
    }));
    const fixes = answer.fixes
      .filter(
        (f) =>
          Number.isInteger(f.sentenceIndex) &&
          f.sentenceIndex >= 0 &&
          f.sentenceIndex < input.sentences.length,
      )
      .map((f) => ({
        sentenceIndex: f.sentenceIndex,
        original: f.original,
        corrected: f.corrected,
        distractors: f.distractors
          .filter((d) => d !== "")
          .slice(0, WRITING_CHECK_DISTRACTORS.max),
        reason: firstSentence(f.reason),
      }))
      // 보기가 없으면 3.3 '보기 2~3개'를 만들 수 없어 버린다. 빈 칸이 있는 고칠 곳도 버린다(검토 M-3)
      .filter(
        (f) =>
          f.distractors.length >= WRITING_CHECK_DISTRACTORS.min &&
          f.original !== "" &&
          f.corrected !== "" &&
          f.reason !== "",
      )
      .slice(0, WRITING_CHECK_FIX_MAX);
    return { praise, sentences, fixes };
  },
  checkFields: (value): CheckField[] => [
    { path: "praise", lang: "ko", text: value.praise },
    ...value.fixes.flatMap((f, i): CheckField[] => [
      // 원문은 아이 글 인용이라 길이를 보지 않는다(검토 M-5)
      {
        path: `fixes.${i}.original`,
        lang: "en",
        text: f.original,
        checkLength: false,
      },
      { path: `fixes.${i}.corrected`, lang: "en", text: f.corrected },
      ...f.distractors.map(
        (d, j): CheckField => ({
          path: `fixes.${i}.distractors.${j}`,
          lang: "en",
          text: d,
        }),
      ),
      { path: `fixes.${i}.reason`, lang: "ko", text: f.reason },
    ]),
  ],
  applyChecks: (value, hits): ApplyChecksResult<WritingCheckOutput> => {
    if (hits.size === 0) return { value, changed: false, fatal: false };
    return {
      value: {
        praise: hitUnder(hits, "praise") ? SAFE_LINE_KO : value.praise,
        // 문장 판정은 그대로, 걸린 고칠 곳은 버린다
        sentences: value.sentences,
        fixes: value.fixes.filter((_, i) => !hitUnder(hits, `fixes.${i}`)),
      },
      changed: true,
      fatal: false,
    };
  },
};

// ── 쓰기 첨삭 ────────────────────────────────────────────────────

export type WritingFeedbackInput = LevelContext & {
  task: string;
  example: string;
  draft: string;
  thinkoutSummary: string | null;
  /** 단계 평가의 쓰기 과제 문항(교정은 아이에게 보이지 않는다, P12). 프롬프트에만 쓴다. */
  forLevelTest: boolean;
};

export type WritingFeedbackRules = { maxCorrections: number };

const MAX_CORRECTIONS_KEY = "writing.max_corrections";
/** 단계 → 교정 상한 사전(plan-p06a 정할 것 마). */
const MaxCorrectionsSchema = z.record(z.string(), z.int().min(0));

const CorrectionSchema = z.object({
  original: NonEmpty.describe("The wrong part of the draft, as written"),
  corrected: NonEmpty.describe("The corrected English"),
  reason: NonEmpty.describe("Korean reason, 해요체"),
});

const RubricSchema = z.object({
  task: ScoreSchema.describe(`Task completion ${SCORE_RANGE}`),
  grammar: ScoreSchema.describe(`Grammar ${SCORE_RANGE}`),
  vocabulary: ScoreSchema.describe(`Vocabulary ${SCORE_RANGE}`),
});

function writingFeedbackWire(maxCorrections: number) {
  return z
    .object({
      praise: NonEmpty.describe(
        "One Korean praise, 해요체, about a concrete part of the draft",
      ),
      corrections: z
        .array(CorrectionSchema)
        .max(maxCorrections)
        .describe(`At most ${maxCorrections} corrections`),
      modelAnswer: NonEmpty.describe(
        "English model text that keeps the child's ideas, within the level's sentence length and vocabulary",
      ),
      rubric: RubricSchema,
    })
    .meta({ title: "writing_feedback" });
}

export type WritingFeedbackOutput = z.infer<
  ReturnType<typeof writingFeedbackWire>
>;

const writingFeedbackLoose = z.object({
  praise: z.string(),
  corrections: z.array(
    z.object({
      original: z.string(),
      corrected: z.string(),
      reason: z.string(),
    }),
  ),
  modelAnswer: z.string(),
  rubric: z.object({
    task: z.number(),
    grammar: z.number(),
    vocabulary: z.number(),
  }),
});

const WRITING_FEEDBACK_RULES: readonly string[] = [
  "This is feedback on a child's English draft (writing level 6 and above).",
  "Give one praise in Korean that points to something concrete in the draft. Keep it short.",
  "Give at most the number of corrections stated in the user message. Pick first from the learning element of this unit and from errors that hide the meaning.",
  "A correction has the wrong part as written, the corrected English and a Korean reason.",
  "Write a model answer in English that keeps the child's ideas, within the level's sentence length and vocabulary.",
  `Score the submitted draft with the rubric: task completion, grammar, vocabulary, each ${SCORE_RANGE}.`,
  "Use the idea summary only as context.",
];

export const writingFeedbackSpec: CallSpec<
  WritingFeedbackInput,
  WritingFeedbackOutput,
  WritingFeedbackRules
> = {
  purpose: "writing_feedback",
  title: "writing_feedback",
  wireSchema: (_input, rules) => writingFeedbackWire(rules.maxCorrections),
  looseSchema: writingFeedbackLoose,
  multiTurn: false,
  enumPaths: [],
  settingSchemas: { [MAX_CORRECTIONS_KEY]: MaxCorrectionsSchema },
  rulesOf: (values: SettingValues, input) => {
    const parsed = MaxCorrectionsSchema.safeParse(values[MAX_CORRECTIONS_KEY]);
    if (!parsed.success) {
      throw new CallSettingError(
        MAX_CORRECTIONS_KEY,
        "단계 → 수 사전이 아니다",
      );
    }
    const max = parsed.data[String(input.level)];
    if (max === undefined) {
      throw new CallSettingError(
        MAX_CORRECTIONS_KEY,
        `${input.level}단계 값이 없다`,
      );
    }
    return { maxCorrections: max };
  },
  mask: (input, masker) => ({
    ...input,
    draft: masker(input.draft).text,
    thinkoutSummary:
      input.thinkoutSummary === null
        ? null
        : masker(input.thinkoutSummary).text,
  }),
  system: (input) =>
    buildSystem({
      fixed: [...COMMON_FIXED_RULES, ...WRITING_FEEDBACK_RULES],
      variable: [
        ...levelVariable(input),
        ["Lesson task", input.task],
        ["Lesson example", input.example],
      ],
    }),
  messages: (input, rules): ChatMessage[] => {
    const parts = [
      input.forLevelTest ? "This draft is a level test answer." : null,
      input.thinkoutSummary === null
        ? null
        : `Idea summary (context only): ${input.thinkoutSummary}`,
      `Draft:\n${input.draft}`,
      `Corrections: at most ${rules.maxCorrections}.`,
    ];
    return [
      {
        role: "user",
        content: parts.filter((p): p is string => p !== null).join("\n\n"),
      },
    ];
  },
  validate: (value, _input, rules) => {
    const issues: string[] = [];
    if (value.corrections.length > rules.maxCorrections) {
      issues.push("교정이 상한보다 많다");
    }
    if (value.praise.trim() === "") issues.push("칭찬이 비었다");
    if (value.modelAnswer.trim() === "") issues.push("모범 답안이 비었다");
    return issues;
  },
  normalize: (loose, _input, rules) => {
    const parsed = writingFeedbackLoose.safeParse(loose);
    if (!parsed.success) return null;
    const answer = parsed.data;
    if (answer.praise === "") return null;
    return {
      // 칭찬은 자르지 않는다(목업 B_Writing3 의 칭찬이 두 문장, 위험 8)
      praise: answer.praise,
      // 빈 칸이 있는 교정은 버린 뒤 앞에서 자른다(검토 M-3)
      corrections: answer.corrections
        .filter(
          (c) => c.original !== "" && c.corrected !== "" && c.reason !== "",
        )
        .slice(0, rules.maxCorrections),
      modelAnswer: answer.modelAnswer,
      rubric: {
        task: clampScore(answer.rubric.task, AI_SCORE),
        grammar: clampScore(answer.rubric.grammar, AI_SCORE),
        vocabulary: clampScore(answer.rubric.vocabulary, AI_SCORE),
      },
    };
  },
  checkFields: (value): CheckField[] => [
    { path: "praise", lang: "ko", text: value.praise },
    ...value.corrections.flatMap((c, i): CheckField[] => [
      {
        path: `corrections.${i}.original`,
        lang: "en",
        text: c.original,
        checkLength: false,
      },
      { path: `corrections.${i}.corrected`, lang: "en", text: c.corrected },
      { path: `corrections.${i}.reason`, lang: "ko", text: c.reason },
    ]),
    { path: "modelAnswer", lang: "en", text: value.modelAnswer },
  ],
  applyChecks: (value, hits): ApplyChecksResult<WritingFeedbackOutput> => {
    if (hits.size === 0) return { value, changed: false, fatal: false };
    return {
      value: {
        praise: hitUnder(hits, "praise") ? SAFE_LINE_KO : value.praise,
        corrections: value.corrections.filter(
          (_, i) => !hitUnder(hits, `corrections.${i}`),
        ),
        // 모범 답안은 비운다(P11 은 보이지 않는다). 채점표는 그대로
        modelAnswer: hitUnder(hits, "modelAnswer") ? "" : value.modelAnswer,
        rubric: value.rubric,
      },
      changed: true,
      fatal: false,
    };
  },
};

// 가르치는 수업 칸(teach · 문항 칸)의 규격과 칸 검사(델타 spec 2026-10-29 가르치고 배우는 수업 설계 6 · 7).
// 가짜 시드 나무(builders)의 1단계 읽기 · 말하기, 3단계 쓰기 수업에 teach 와 문항 칸을 붙여 보고, 한 칸씩 어겨 규칙을 확인한다.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { checkLessonCell, type SeedIssue } from "@/core/seed/check-lesson";
import {
  grammarTermHits,
  lineChars,
  speakSeconds,
} from "@/core/seed/check-teach";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import {
  type ReadingLesson,
  ReadingLessonSchema,
  type SpeakingLesson,
  SpeakingLessonSchema,
  textsOfLesson,
  type WritingLesson,
  WritingLessonSchema,
} from "@/core/seed/schema/lesson";
import {
  type GrammarTermsFile,
  GrammarTermsFileSchema,
  type SettingRow,
  type SettingsFile,
  type UnitGoal,
  UnitSpecSchema,
} from "@/core/seed/schema/reference";
import { buildSolveRequest, seedAnswerOf } from "@/core/seed/solve-check";
import {
  BAND_NAMES,
  cellKey,
  GRAMMAR_TERMS_FILE,
  lessonFilePath,
} from "@/core/seed/structure";
import { splitSentences } from "@/core/seed/text";
import {
  collectCells,
  itemsOf,
  type SeedCell,
  solveTargets,
  validateSeed,
} from "@/core/seed/validate";
import {
  type CliArgs,
  parseArgs,
  runValidate,
} from "../../scripts/seed-validate";
import {
  defaultSettings,
  readingLesson,
  referenceSet,
  sampleSeedTree,
  seedTreeFiles,
  speakingLesson,
  writingLesson,
} from "../fixtures/seed/builders";

const REPO_ROOT = resolve(__dirname, "../..");
const UNIT = 1;

/** 델타 spec 설계 12 의 잠정 기본값(시험이 쓰는 값, settings.json 과 같은 꼴). */
function teachRows(): SettingRow[] {
  const band = (
    key: string,
    values: number[],
    changeVia: SettingRow["changeVia"],
  ) =>
    BAND_NAMES.map((b, i) => ({
      key: `${key}.${b}`,
      scope: "household" as const,
      value: values[i] ?? 0,
      changeVia,
    }));
  return [
    {
      key: "lesson.teacher_line_max_chars",
      scope: "household",
      value: 40,
      changeVia: "seed",
    },
    {
      key: "lesson.line_max_sentences",
      scope: "household",
      value: 2,
      changeVia: "seed",
    },
    {
      key: "lesson.models_per_lesson",
      scope: "household",
      value: [2, 3],
      changeVia: "seed",
    },
    ...band("lesson.together_items", [2, 1, 1, 1], "seed"),
    ...band("lesson.spare_text_max_words", [20, 40, 60, 80], "seed"),
    ...band("lesson.teach_seconds_max", [70, 80, 90, 100], "seed"),
    {
      key: "speech.speak_chars_per_second_ko",
      scope: "household",
      value: 6,
      changeVia: "advanced",
    },
    {
      key: "speech.speak_chars_per_second",
      scope: "household",
      value: 8,
      changeVia: "advanced",
    },
    {
      key: "lesson.recap_min_evidence",
      scope: "household",
      value: 2,
      changeVia: "advanced",
    },
    {
      key: "seed.goals_required_levels",
      scope: "household",
      value: [1, 3, 4, 5],
      changeVia: "seed",
    },
    {
      key: "seed.unit_goals_max",
      scope: "household",
      value: 4,
      changeVia: "seed",
    },
    ...(
      [
        ["today", 15],
        ["show", 90],
        ["together", 60],
        ["spare", 90],
        ["recap", 30],
      ] as const
    ).map(([slot, value]) => ({
      key: `lesson.slot_seconds_max.${slot}`,
      scope: "household" as const,
      value,
      changeVia: "advanced" as const,
    })),
    ...(
      [
        ["reading", 3],
        ["writing", 3],
        ["speaking", 4],
      ] as const
    ).map(([area, value]) => ({
      key: `lesson.spares_per_session.${area}`,
      scope: "household" as const,
      value,
      changeVia: "advanced" as const,
    })),
  ];
}
function settingsWith(rows: SettingRow[]): SettingsFile {
  const base = defaultSettings();
  const keys = new Set(rows.map((r) => r.key));
  return {
    settings: [...base.settings.filter((r) => !keys.has(r.key)), ...rows],
  };
}

const GRAMMAR: GrammarTermsFile = {
  terms: ["주어", "동사", "목적어", "복수"].map((term) => ({ term })),
};
/** 평가 spec 2절 꼴의 단원 목표 하나. */
function goalOf(
  id: string,
  tasks: string[],
  needs: UnitGoal["needs"],
  core = "가짜 핵심 능력",
): UnitGoal {
  return {
    id,
    ko: "할 수 있다",
    core,
    tasks,
    home: ["이야기"],
    needs,
    accept: "correct",
  };
}
/** 가짜 단원 규격에 가르치는 수업 시험용 목표를 단다(읽기 1 · 쓰기 3 · 말하기 1 단계 단원 1). */
const UNIT_GOALS: Record<string, UnitGoal[]> = {
  "reading:1:1": [goalOf("read-1-1-1", ["picture"], ["comprehension"])],
  "writing:3:1": [
    goalOf("write-3-1-1", ["assemble-sentence"], ["form"]),
    goalOf("write-3-1-2", ["assemble-sentence"], ["form"]),
  ],
  "speaking:1:1": [
    goalOf("speak-1-1-1", ["repeat"], ["repeat"]),
    goalOf("speak-1-1-2", ["listening"], ["comprehension"]),
    goalOf("speak-1-1-3", ["question"], ["response", "expression"]),
  ],
  "speaking:3:1": [
    goalOf("speak-3-1-1", ["repeat"], ["repeat"]),
    goalOf("speak-3-1-2", ["listening"], ["comprehension"]),
    goalOf("speak-3-1-3", ["question"], ["response", "expression"]),
  ],
};
function withGoals(base: ReturnType<typeof referenceSet>) {
  for (const spec of base.unitSpecs.unitSpecs) {
    const goals = UNIT_GOALS[`${spec.area}:${spec.level}:${spec.unit}`];
    if (goals) spec.goals = structuredClone(goals);
  }
  return base;
}
const ref = withGoals(referenceSet(settingsWith(teachRows())));
const { index } = buildReferenceIndex({ ...ref, grammarTerms: GRAMMAR });

type AnyLesson = ReadingLesson | WritingLesson | SpeakingLesson;
function check(
  area: "reading" | "writing" | "speaking",
  level: number,
  lesson: AnyLesson,
  at = index,
): SeedIssue[] {
  return checkLessonCell(lesson as never, {
    area,
    level,
    unit: UNIT,
    file: lessonFilePath(area, level, UNIT),
    index: at,
  });
}
const errorsOf = (issues: SeedIssue[], rule: string) =>
  issues.filter((i) => i.severity === "error" && i.rule === rule);
const errors = (issues: SeedIssue[]) =>
  issues.filter((i) => i.severity === "error");

// ── 가짜 가르치는 수업 ───────────────────────────────────────────

const recapOf = (frameEn: string) => ({
  frameEn,
  chips: [
    { text: "This", role: "who" as const },
    { text: "is", role: "do" as const },
  ],
  closeKo: "이제 그림을 보고 낱말을 찾을 수 있어요.",
  closeKoPracticed: "오늘은 그림 보고 낱말 찾기를 배우고 연습했어요.",
});

function readingTeach(): ReadingLesson {
  const lesson = structuredClone(readingLesson(ref, 1).lesson);
  // 가짜 시드의 마지막 문항 정답(debaba)이 지문에 없어, 다시 볼 자리를 둘 수 있게 지문에 있고 그림이 있는 낱말(bobaba)을 묻는 문항으로 바꾼다.
  const last = lesson.content.questions[4];
  if (last?.kind === "picture") {
    last.prompt = "Where is the bobaba?";
    last.options = ["bobaba", "dibaba", "dubaba", "fababa"];
    last.answerNo = 1;
  }
  const sentences = splitSentences(lesson.content.passage);
  lesson.content.questions = lesson.content.questions.map((q, i) => {
    const answer = q.options[q.answerNo - 1] ?? "";
    const { explanationKo: _old, ...rest } = q;
    return {
      ...rest,
      goal: "read-1-1-1",
      whyKo: `${answer} 를 찾아요. 그 그림이에요.`,
      retryHighlight: sentences.find((s) => s.includes(answer)) ?? "",
      spare: {
        kind: "picture" as const,
        type: "picture" as const,
        textEn: i === 4 ? `This is the ${answer}.` : `It is a ${answer}.`,
        prompt: i === 4 ? `Where is a ${answer}?` : `Find a ${answer}.`,
        options: q.options,
        answerNo: q.answerNo,
        whyKo: `${answer} 그림을 골라요.`,
      },
    } as ReadingLesson["content"]["questions"][number];
  });
  lesson.teach = {
    goals: ["read-1-1-1"],
    shiftKo: {
      before: "그림 낱말을 못 찾는다",
      after: "그림 낱말을 스스로 찾는다",
    },
    todayKo: "오늘은 글에서 그림 낱말을 찾아요.",
    todayEn: "This is a bababa.",
    models: [
      {
        en: "This is a bababa.",
        ko: "이건 바바바야.",
        chips: [
          { text: "This", role: "who" },
          { text: "bababa", role: "what" },
        ],
        lineKo: "낱말을 찾고 그림을 봐요.",
      },
      {
        en: "I can bebaba.",
        ko: "나는 베바바를 할 수 있어.",
        chips: [
          { text: "I", role: "who" },
          { text: "can bebaba", role: "do" },
        ],
        lineKo: "앞은 누가, 뒤는 무엇이에요.",
      },
    ],
    together: [
      {
        kind: "picture",
        type: "picture",
        textEn: "This is a bubaba.",
        prompt: "This is a ___.",
        choices: ["bubaba", "bobaba"],
        answerNo: 1,
        highlight: ["bubaba"],
        lineKo: "낱말을 골라 봐요.",
        rightKo: "맞아요!",
        wrongKo: "다시 봐요.",
      },
      {
        kind: "picture",
        type: "picture",
        textEn: "We can bebaba.",
        prompt: "We can ___.",
        choices: ["bebaba", "bababa"],
        answerNo: 1,
        rightKo: "맞아요!",
        wrongKo: "can 뒤를 봐요.",
      },
    ],
    recap: recapOf("This is a bababa."),
  };
  return lesson;
}

const WRITING_SPARES = [
  "We like the kabuba.",
  "They can kebuba.",
  "This is kibuba.",
  "It is a kobuba.",
  "We kububa with Momo.",
];
const cardsOf = (sentence: string) =>
  (sentence.toLowerCase().match(/[a-z]+|[.]/g) ?? []).reverse();

function writingTeach(): WritingLesson {
  const lesson = structuredClone(writingLesson(ref, 3).lesson);
  if (lesson.content.shape !== "items")
    throw new Error("쓰기 3단계 items 아님");
  lesson.content.items = lesson.content.items.map((item, i) => {
    const spare = WRITING_SPARES[i] ?? "";
    return {
      ...item,
      goal: "write-3-1-1",
      whyKo: "차례대로 놓아요.",
      spare: {
        type: "assemble-sentence",
        cards: cardsOf(spare),
        meaningKo: "짝 문장",
        accepted: [spare],
        whyKo: "차례대로 놓아요.",
      },
    } as typeof item;
  });
  lesson.teach = {
    goals: ["write-3-1-1"],
    shiftKo: { before: "문장을 못 놓는다", after: "문장을 스스로 놓는다" },
    todayKo: "오늘은 문장을 차례대로 놓아요.",
    models: [
      {
        en: "It is kabuba.",
        ko: "그건 카부바야.",
        fromEn: "the kabuba",
        chips: [
          { text: "It", role: "thing" },
          { text: "is", role: "is" },
          { text: "kabuba", role: "how" },
          { text: ".", role: "end" },
        ],
        lineKo: "무엇, is, 어때요 차례예요.",
      },
      {
        en: "It is kububa.",
        ko: "그건 쿠부바야.",
        chips: [
          { text: "It", role: "thing" },
          { text: "is", role: "is" },
          { text: "kububa", role: "how" },
          { text: ".", role: "end" },
        ],
        lineKo: "끝에는 마침표를 놓아요.",
      },
    ],
    together: [
      {
        type: "assemble-sentence",
        cards: ["it", "is", "kobuba", "."],
        meaningKo: "그건 코부바야.",
        accepted: ["It is kobuba."],
        filled: { cards: ["it", "is", null, "."], capital: true },
        slot: [3],
        choices: ["kobuba"],
        rightKo: "맞아요!",
        wrongKo: "is 뒤에 놓아요.",
      },
      {
        type: "assemble-sentence",
        cards: ["we", "can", "kibuba", "."],
        meaningKo: "우리는 할 수 있어.",
        accepted: ["We can kibuba."],
        filled: { cards: ["we", "can", "kibuba", "."], capital: false },
        slot: "capital",
        rightKo: "좋아요!",
        wrongKo: "대문자 단추를 눌러 봐요.",
      },
    ],
    recap: recapOf("It is kabuba."),
  };
  return lesson;
}

const SPEAK_WORDS = ["bababa", "bebaba", "bibaba", "bobaba"];
function speakingTeach(): SpeakingLesson {
  const lesson = structuredClone(speakingLesson(ref, 1).lesson);
  const c = lesson.content;
  c.repeat = {
    ...c.repeat,
    goal: "speak-1-1-1",
    chunks: c.repeat.sentences.map((s) => {
      const words = s.split(" ");
      return `${words.slice(0, 2).join(" ")} / ${words.slice(2).join(" ")}`;
    }),
    spares: {
      words: c.repeat.words.map((w) => `a ${w}`),
      sentences: c.repeat.words.map((w) => `I see a ${w}.`),
    },
  };
  c.listening = c.listening.map((item) => {
    const answer = item.options[item.answerNo - 1] ?? "";
    return {
      ...item,
      goal: "speak-1-1-2",
      whyKo: `${answer} 가 들렸어요.`,
      retryHighlight: item.script,
      spare: {
        ...item,
        script: `It is my ${answer}.`,
        whyKo: `${answer} 예요.`,
      },
    } as (typeof c.listening)[number];
  });
  c.questions = c.questions.map((q, i) => {
    const w = SPEAK_WORDS[i] ?? "";
    const m = q.modelAnswer ?? "";
    const lower = m.charAt(0).toLowerCase() + m.slice(1);
    return {
      ...q,
      // 3판 꼴: 질문 앞 이야기와 서로 다른 허용 답 셋(낱말 하나뿐인 답 없음).
      storyEn: `Oh, well. ${m}`,
      accepted: [m, `Oh, ${lower}`, `Well, ${lower}`],
      goal: "speak-1-1-3",
      whyKo: "한 문장으로 말해요.",
      spare: {
        storyEn: `We have a ${w}.`,
        en: `Is it a ${w}?`,
        ko: "그거야?",
        modelAnswer: `It is a ${w}.`,
        accepted: [`It is a ${w}.`, `It's a ${w}.`, `It is ${w}.`],
        whyKo: "한 문장으로 말해요.",
      },
    };
  });
  lesson.teach = {
    goals: ["speak-1-1-1", "speak-1-1-2", "speak-1-1-3"],
    shiftKo: { before: "낱말 하나로 답한다", after: "한 문장으로 답한다" },
    todayKo: "오늘은 한 문장으로 답해요.",
    todayEn: "It is a bubaba.",
    models: [
      {
        storyEn: "I have a bubaba.",
        questionEn: "What do I have?",
        wordAnswerEn: "Bubaba.",
        en: "It is a bubaba.",
        ko: "그건 부바바야.",
        chips: [
          { text: "It", role: "who" },
          { text: "is", role: "do" },
          { text: "a bubaba", role: "what", from: "bubaba" },
        ],
        lineKo: "낱말 하나 말고 한 문장으로 답해요.",
      },
      {
        storyEn: "We have a bubaba.",
        questionEn: "What do we have?",
        en: "We have a bubaba.",
        ko: "우리는 부바바가 있어.",
        chips: [
          { text: "We", role: "who" },
          { text: "have", role: "do" },
        ],
        lineKo: "We 로 시작해요.",
      },
    ],
    together: [
      {
        type: "question",
        storyEn: "You have a bebaba.",
        en: "What do you have?",
        filled: "I have a ___.",
        slot: "what",
        choices: ["bebaba", "bobaba"],
        answerNo: 1,
        modelAnswer: "I have a bebaba.",
        accepted: ["I have a bebaba.", "a bebaba", "You have a bebaba."],
        rightKo: "맞아요!",
        wrongKo: "다시 들어 봐요.",
      },
      {
        type: "question",
        storyEn: "They have a bobaba.",
        en: "What do they have?",
        filled: "They have ___.",
        slot: "rest",
        modelAnswer: "They have a bobaba.",
        accepted: ["They have a bobaba.", "a bobaba", "The bobaba."],
        rightKo: "잘 말했어요!",
        wrongKo: "같이 말해 볼까요?",
      },
    ],
    recap: recapOf("It is a bubaba."),
  };
  return lesson;
}

/** 말하기 3단계 단원 1~4 꼴(이야기 · 예 하나 · 이름표 빈칸)로 바꾼 가르치는 수업(가짜 1단계 내용, 목표 id 는 speak-3-1-n). */
const L3_WORDS = ["debaba", "dibaba", "dubaba", "fababa"];
const L3_SPARE_SCRIPTS = ["It is my", "I like my", "I see my"];
function speakingTeach3(): SpeakingLesson {
  const lesson = speakingTeach();
  const c = lesson.content;
  const rename = (goal: string) => goal.replace("speak-1-1-", "speak-3-1-");
  if (lesson.teach) lesson.teach.goals = lesson.teach.goals.map(rename);
  c.repeat.goal = "speak-3-1-1";
  c.listening = c.listening.map((item, i) => {
    const answer = item.options[item.answerNo - 1] ?? "";
    const spareHead = L3_SPARE_SCRIPTS[i] ?? "";
    return {
      kind: "text" as const,
      script: item.script,
      prompt: "This is a ___.",
      askRole: "what" as const,
      options: item.options,
      answerNo: item.answerNo,
      goal: "speak-3-1-2",
      whyKo: `${answer} 가 들렸어요.`,
      retryHighlight: item.script,
      spare: {
        kind: "text" as const,
        script: `${spareHead} ${answer}.`,
        prompt: `${spareHead} ___.`,
        askRole: "what" as const,
        options: item.options,
        answerNo: item.answerNo,
        whyKo: `${answer} 예요.`,
      },
    };
  });
  c.questions = c.questions.map((q, i) => {
    const w = L3_WORDS[i] ?? "";
    const yes = i === 3;
    const answer = `${yes ? "Yes" : "No"}, they have a ${w}.`;
    return {
      ...q,
      storyEn: `They have a ${w}.`,
      en: `Do they have a ${yes ? w : "bubaba"}?`,
      modelAnswer: answer,
      accepted: [answer, `They have a ${w}.`, `They do have a ${w}.`],
      goal: "speak-3-1-3",
    };
  });
  return lesson;
}
/** 말하기 3단계 단원 1 칸으로 본 검사 결과. */
const check3 = (lesson: SpeakingLesson, at = index) =>
  check("speaking", 3, lesson, at);

const SAMPLES = {
  reading: { level: 1, make: readingTeach },
  writing: { level: 3, make: writingTeach },
  speaking: { level: 1, make: speakingTeach },
} as const;

// ── 시험 ─────────────────────────────────────────────────────────

describe("규격: 가르치는 수업 칸(설계 6)", () => {
  it("teach · 문항 칸(goal · whyKo · askRole · retryHighlight · spare · chunks · spares · storyEn · acceptedMeaning)이 든 세 영역 수업을 받는다", () => {
    expect(ReadingLessonSchema.safeParse(readingTeach()).error).toBeUndefined();
    expect(WritingLessonSchema.safeParse(writingTeach()).error).toBeUndefined();
    const speaking = speakingTeach();
    const q = speaking.content.questions[0];
    if (!q) throw new Error("질문 없음");
    q.storyEn = "I have a bababa.";
    q.acceptedMeaning = ["bababa it is."];
    if (q.spare) q.spare.acceptedMeaning = ["a bababa."];
    const t = speaking.teach?.together[0];
    if (t) t.acceptedMeaning = ["a bebaba."];
    expect(SpeakingLessonSchema.safeParse(speaking).error).toBeUndefined();
    const fragments = textsOfLesson("speaking", speaking).map((f) => f.path);
    expect(fragments).toEqual(
      expect.arrayContaining([
        "content.questions.0.acceptedMeaning.0",
        "content.questions.0.spare.acceptedMeaning.0",
        "teach.together.0.acceptedMeaning.0",
      ]),
    );
  });

  it("teach 없는 기존 수업은 그대로 받고, teach 안의 모르는 칸 · 칩 이름 밖 role · 마무리 줄 하나는 거부한다", () => {
    expect(
      ReadingLessonSchema.safeParse(readingLesson(ref, 1).lesson).success,
    ).toBe(true);
    const unknown = readingTeach() as unknown as {
      teach: Record<string, unknown>;
    };
    unknown.teach.practice = true;
    expect(ReadingLessonSchema.safeParse(unknown).success).toBe(false);
    const role = readingTeach() as unknown as {
      teach: { models: { chips: { role: string }[] }[] };
    };
    const chip = role.teach.models[0]?.chips[0];
    if (chip) chip.role = "subject";
    expect(ReadingLessonSchema.safeParse(role).success).toBe(false);
    const oneClose = readingTeach() as unknown as {
      teach: { recap: Record<string, unknown> };
    };
    delete oneClose.teach.recap.closeKoPracticed;
    expect(ReadingLessonSchema.safeParse(oneClose).success).toBe(false);
  });

  it("미리보기 parts 를 받고, teach 가 있는 수업은 예문을 비울 수 있다(teach 가 없으면 vocab-allocation 오류)", () => {
    const lesson = readingTeach();
    const first = lesson.preview[0];
    if (!first) throw new Error("미리보기 없음");
    first.parts = ["ba", "baba"];
    first.example = "";
    expect(ReadingLessonSchema.safeParse(lesson).success).toBe(true);
    expect(errorsOf(check("reading", 1, lesson), "vocab-allocation")).toEqual(
      [],
    );
    const plain = structuredClone(readingLesson(ref, 1).lesson);
    const p = plain.preview[0];
    if (p) p.example = "";
    expect(
      errorsOf(check("reading", 1, plain), "vocab-allocation").map(
        (i) => i.path,
      ),
    ).toEqual(["preview.0"]);
  });

  it("읽기 문항은 whyKo 가 있으면 explanationKo 가 없어도 되고, 둘 다 없으면 why 오류다", () => {
    expect(errorsOf(check("reading", 1, readingTeach()), "why")).toEqual([]);
    const plain = structuredClone(readingLesson(ref, 1).lesson);
    const q = plain.content.questions[0] as { explanationKo?: string };
    delete q.explanationKo;
    expect(
      errorsOf(check("reading", 1, plain), "why").map((i) => i.path),
    ).toEqual(["content.questions.0.explanationKo"]);
  });

  it("문법 용어 목록 꼴: 낱말과 열리는 단계(선택), 같은 낱말 둘을 거부한다 — 저장소 목록도 이 꼴이다", () => {
    expect(GrammarTermsFileSchema.safeParse(GRAMMAR).success).toBe(true);
    expect(
      GrammarTermsFileSchema.safeParse({
        terms: [{ term: "주어" }, { term: "주어", fromLevel: 7 }],
      }).success,
    ).toBe(false);
    const real = JSON.parse(
      readFileSync(join(REPO_ROOT, "seed", GRAMMAR_TERMS_FILE), "utf8"),
    );
    const parsed = GrammarTermsFileSchema.safeParse(real);
    expect(parsed.error).toBeUndefined();
    expect(parsed.data?.terms.map((t) => t.term)).toEqual(
      expect.arrayContaining(["주어", "동사", "be동사", "품사"]),
    );
    expect(parsed.data?.terms.every((t) => t.fromLevel === undefined)).toBe(
      true,
    );
  });
});

describe("칸 검사: 가르치는 수업(설계 7)", () => {
  for (const [area, { level, make }] of Object.entries(SAMPLES)) {
    it(`${area} ${level}단계: 규칙을 지킨 가르치는 수업은 오류가 없다`, () => {
      expect(errors(check(area as never, level, make()))).toEqual([]);
    });
  }

  it("글 조각: teach · 짝 · 이야기의 영어 칸은 영어 role, 선생님 줄은 ko 로 나온다", () => {
    const fragments = textsOfLesson("speaking", speakingTeach());
    const role = (path: string) => fragments.find((f) => f.path === path)?.role;
    expect(role("teach.models.0.en")).toBe("example");
    expect(role("teach.models.0.storyEn")).toBe("script");
    expect(role("teach.together.0.en")).toBe("prompt");
    expect(role("teach.recap.frameEn")).toBe("example");
    expect(role("content.questions.0.spare.storyEn")).toBe("script");
    expect(role("content.questions.0.spare.accepted.2")).toBe("answer");
    expect(role("content.questions.0.storyEn")).toBe("script");
    expect(role("content.repeat.spares.sentences.0")).toBe("answer");
    expect(role("teach.todayKo")).toBe("ko");
    expect(role("content.listening.0.whyKo")).toBe("ko");
  });

  it("자리 꼴: 본보기 수가 lesson.models_per_lesson 밖이거나 같이 해 보기 수가 lesson.together_items.<구간> 과 다르면 teach-layout 오류다", () => {
    const one = readingTeach();
    one.teach?.models.splice(1);
    expect(
      errorsOf(check("reading", 1, one), "teach-layout").map((i) => i.path),
    ).toEqual(["teach.models"]);
    const four = readingTeach();
    const m = four.teach?.models[0];
    if (m) four.teach?.models.push(m, m);
    expect(errorsOf(check("reading", 1, four), "teach-layout")).toHaveLength(1);
    const together = readingTeach();
    together.teach?.together.splice(1);
    expect(
      errorsOf(check("reading", 1, together), "teach-layout")[0]?.message,
    ).toContain("lesson.together_items.1-3");
  });

  it("자리 꼴: 같은 채점 문항이 같이 해 보기와 짝에 함께 있으면 teach-layout 오류다", () => {
    const lesson = writingTeach();
    const t = lesson.teach?.together[0];
    const item =
      lesson.content.shape === "items" ? lesson.content.items[0] : undefined;
    if (
      t?.type !== "assemble-sentence" ||
      item?.spare?.type !== "assemble-sentence"
    )
      throw new Error("문장 조립 문항 없음");
    item.spare.accepted = [...t.accepted];
    item.spare.cards = [...t.cards];
    const issues = errorsOf(check("writing", 3, lesson), "teach-layout");
    expect(issues.map((i) => i.path)).toEqual(["content.items.0.spare"]);
  });

  it("선생님 줄 길이: 빈칸을 뺀 글자 수가 lesson.teacher_line_max_chars 를 넘거나 문장이 lesson.line_max_sentences 를 넘으면 teacher-line 오류다", () => {
    expect(lineChars("가 나 다")).toBe(3);
    const long = readingTeach();
    if (long.teach) long.teach.todayKo = `${"가".repeat(41)}요.`;
    expect(
      errorsOf(check("reading", 1, long), "teacher-line").map((i) => i.path),
    ).toEqual(["teach.todayKo"]);
    // 빈칸은 세지 않는다(41자 + 빈칸 아홉은 40자 넘음, 40자 + 빈칸은 통과).
    const spaced = readingTeach();
    if (spaced.teach) spaced.teach.todayKo = `${"가나다라 ".repeat(9)}마바사요`;
    expect(lineChars(spaced.teach?.todayKo ?? "")).toBe(40);
    expect(errorsOf(check("reading", 1, spaced), "teacher-line")).toEqual([]);
    const three = readingTeach();
    const q = three.content.questions[0];
    if (q) q.whyKo = "찾아요. 봐요. 골라요.";
    expect(
      errorsOf(check("reading", 1, three), "teacher-line").map((i) => i.path),
    ).toEqual(["content.questions.0.whyKo"]);
    const spare = speakingTeach();
    const s = spare.teach?.together[1];
    if (s) s.wrongKo = "같이. 말해. 볼까요?";
    expect(
      errorsOf(check("speaking", 1, spare), "teacher-line").map((i) => i.path),
    ).toEqual(["teach.together.1.wrongKo"]);
  });

  it("설명 시간 합: 한국어 ÷ speech.speak_chars_per_second_ko + 영어 ÷ speech.speak_chars_per_second 의 합이 lesson.teach_seconds_max.<구간> 을 넘으면 teach-seconds 오류다", () => {
    expect(speakSeconds("가나다 abcd", { ko: 6, en: 8 })).toBeCloseTo(
      0.5 + 0.5,
    );
    expect(
      errorsOf(check("reading", 1, readingTeach()), "teach-seconds"),
    ).toEqual([]);
    const tight = buildReferenceIndex({
      ...referenceSet(
        settingsWith([
          ...teachRows().filter(
            (r) => r.key !== "lesson.teach_seconds_max.1-3",
          ),
          {
            key: "lesson.teach_seconds_max.1-3",
            scope: "household",
            value: 5,
            changeVia: "seed",
          },
        ]),
      ),
      grammarTerms: GRAMMAR,
    }).index;
    const issues = errorsOf(
      check("reading", 1, readingTeach(), tight),
      "teach-seconds",
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain("lesson.teach_seconds_max.1-3");
  });

  it("설정값: 가르치는 수업 키가 없으면 그 키로 settings 오류를 한 번 낸다(teach 없는 수업은 내지 않는다)", () => {
    const bare = buildReferenceIndex({
      ...referenceSet(defaultSettings()),
      grammarTerms: GRAMMAR,
    }).index;
    const issues = errorsOf(
      check("reading", 1, readingTeach(), bare),
      "settings",
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.map((i) => i.message).join(" ")).toContain(
      "lesson.teacher_line_max_chars",
    );
    expect(new Set(issues.map((i) => i.message)).size).toBe(issues.length);
    expect(
      errorsOf(
        check("reading", 1, readingLesson(ref, 1).lesson, bare),
        "settings",
      ),
    ).toEqual([]);
  });

  it("설정값: seed.goals_required_levels 가 없으면 기본값을 쓰지 않고 settings 오류다(M2)", () => {
    const noKey = buildReferenceIndex({
      ...withGoals(
        referenceSet(
          settingsWith(
            teachRows().filter((r) => r.key !== "seed.goals_required_levels"),
          ),
        ),
      ),
      grammarTerms: GRAMMAR,
    }).index;
    expect(
      errorsOf(check("reading", 1, readingTeach(), noKey), "settings").map(
        (i) => i.message,
      ),
    ).toEqual([expect.stringContaining("seed.goals_required_levels")]);
  });

  it("문법 용어: 선생님 말 칸과 칩 글에 목록 낱말이 있으면 grammar-term 오류다(낱말 머리만, fromLevel 이상 단계는 받는다)", () => {
    expect(grammarTermHits("주어는 맨 앞이에요.", GRAMMAR.terms, 3)).toEqual([
      "주어",
    ]);
    expect(grammarTermHits("이것을 동사라고 해요.", GRAMMAR.terms, 3)).toEqual([
      "동사",
    ]);
    expect(grammarTermHits("운동사진을 봐요.", GRAMMAR.terms, 3)).toEqual([]);
    // 용어로 시작하는 보통 낱말(예외 낱말)은 받는다(M1).
    const withExceptions = [{ term: "주어", exceptions: ["주어진", "주어요"] }];
    expect(grammarTermHits("주어진 카드를 놓아요.", withExceptions, 3)).toEqual(
      [],
    );
    expect(grammarTermHits("카드를 주어요.", withExceptions, 3)).toEqual([]);
    expect(grammarTermHits("주어는 앞이에요.", withExceptions, 3)).toEqual([
      "주어",
    ]);
    expect(
      grammarTermHits("주어는 앞이에요.", [{ term: "주어", fromLevel: 7 }], 7),
    ).toEqual([]);
    const lesson = readingTeach();
    const model = lesson.teach?.models[0];
    if (model) {
      model.lineKo = "주어 뒤에 낱말이 와요.";
      const chip = model.chips[0];
      if (chip) chip.text = "복수";
    }
    expect(
      errorsOf(check("reading", 1, lesson), "grammar-term").map((i) => i.path),
    ).toEqual(["teach.models.0.lineKo", "teach.models.0.chips.0.text"]);
    const none = buildReferenceIndex(ref).index;
    expect(
      errorsOf(check("reading", 1, readingTeach(), none), "grammar-term")[0]
        ?.message,
    ).toContain(GRAMMAR_TERMS_FILE);
  });

  it("선생님 이름: 선생님 말에 명단 이름 · {TEACHER} · {NAME} 이 있으면 teacher-name 오류이고, '토리'는 수업 글에 등장인물로 나올 때만 받는다", () => {
    const named = readingTeach();
    const together = named.teach?.together[0];
    if (together) together.rightKo = "미나도 맞았대요!";
    const q = named.content.questions[1];
    if (q) q.whyKo = "{NAME}, 그림을 봐요.";
    expect(
      errorsOf(check("reading", 1, named), "teacher-name").map((i) => i.path),
    ).toEqual(["teach.together.0.rightKo", "content.questions.1.whyKo"]);
    const tori = readingTeach();
    if (tori.teach) tori.teach.todayKo = "오늘은 토리랑 글을 읽어요.";
    expect(errorsOf(check("reading", 1, tori), "teacher-name")).toHaveLength(1);
    tori.content.passage = `${tori.content.passage} Tori is a bababa.`;
    expect(errorsOf(check("reading", 1, tori), "teacher-name")).toEqual([]);
  });

  it("짝: 채점되는 혼자 문항마다 spare 가 있어야 하고, 따라 말하기 짝은 같은 차례 수다", () => {
    const lesson = readingTeach();
    const q = lesson.content.questions[2];
    if (q) delete q.spare;
    expect(
      errorsOf(check("reading", 1, lesson), "spare").map((i) => i.path),
    ).toEqual(["content.questions.2"]);
    const speaking = speakingTeach();
    speaking.content.repeat.spares?.sentences.pop();
    expect(
      errorsOf(check("speaking", 1, speaking), "spare").map((i) => i.path),
    ).toEqual(["content.repeat.spares.sentences"]);
    const noSpares = speakingTeach();
    delete noSpares.content.repeat.spares;
    expect(
      errorsOf(check("speaking", 1, noSpares), "spare").map((i) => i.path),
    ).toEqual(["content.repeat.spares"]);
  });

  it("짝: 짝의 자극이 혼자 문항 · 다른 짝과 같으면 spare 오류다(본보기 · 같이 해 보기와 같은 것은 teach-differ 가 한 번 낸다)", () => {
    const model = readingTeach();
    const sp = model.content.questions[0]?.spare;
    if (sp) sp.textEn = "This is a bababa.";
    expect(errorsOf(check("reading", 1, model), "spare")).toEqual([]);
    expect(
      errorsOf(check("reading", 1, model), "teach-differ").map((i) => i.path),
    ).toEqual(["content.questions.0.spare.textEn"]);
    const solo = speakingTeach();
    const lsp = solo.content.listening[0]?.spare;
    const script = solo.content.listening[1]?.script;
    if (lsp && script) lsp.script = script;
    expect(
      errorsOf(check("speaking", 1, solo), "spare").map((i) => i.path),
    ).toEqual(["content.listening.0.spare.script"]);
    const twin = speakingTeach();
    const a = twin.content.questions[0]?.spare;
    const b = twin.content.questions[1]?.spare;
    if (a && b) b.en = a.en;
    expect(
      errorsOf(check("speaking", 1, twin), "spare").map((i) => i.path),
    ).toEqual(["content.questions.1.spare.en"]);
  });

  it("짝: 읽기 짝 글은 lesson.spare_text_max_words.<구간> 이하, 말하기 질문 짝은 허용 답 셋 이상이다", () => {
    const long = readingTeach();
    const sp = long.content.questions[0]?.spare;
    if (sp) sp.textEn = `${"This is a bababa. ".repeat(5)}It is a bebaba.`;
    const issues = errorsOf(check("reading", 1, long), "spare");
    expect(issues.map((i) => i.path)).toEqual([
      "content.questions.0.spare.textEn",
    ]);
    expect(issues[0]?.message).toContain("lesson.spare_text_max_words.1-3");
    const few = speakingTeach();
    few.content.questions[0]?.spare?.accepted.splice(2);
    expect(
      errorsOf(check("speaking", 1, few), "spare").map((i) => i.path),
    ).toEqual(["content.questions.0.spare.accepted"]);
  });

  it("'왜': 5단계까지 채점 문항 · 짝에 whyKo 가 있어야 하고(따라 말하기 빼고), 6단계부터는 없어도 된다", () => {
    const lesson = writingTeach();
    const item =
      lesson.content.shape === "items" ? lesson.content.items[1] : undefined;
    if (item) {
      delete item.whyKo;
      if (item.spare) delete item.spare.whyKo;
    }
    expect(
      errorsOf(check("writing", 3, lesson), "why").map((i) => i.path),
    ).toEqual(["content.items.1.whyKo", "content.items.1.spare.whyKo"]);
    const speaking = speakingTeach();
    delete speaking.content.listening[0]?.whyKo;
    expect(
      errorsOf(check("speaking", 1, speaking), "why").map((i) => i.path),
    ).toEqual(["content.listening.0.whyKo"]);
  });

  it("'왜': retryHighlight 는 지문 · 대본 안의 글이고 정답 낱말을 품는다. 따라 말하기 chunks 는 이으면 원문이다", () => {
    const outside = readingTeach();
    const q0 = outside.content.questions[0];
    if (q0) q0.retryHighlight = "Here is a bababa.";
    const noAnswer = readingTeach();
    const q1 = noAnswer.content.questions[0];
    const other = splitSentences(noAnswer.content.passage).find(
      (s) => !s.includes(q1?.options[(q1?.answerNo ?? 1) - 1] ?? ""),
    );
    if (q1 && other) q1.retryHighlight = other;
    const missing = speakingTeach();
    const l0 = missing.content.listening[0];
    if (l0) delete l0.retryHighlight;
    expect(
      errorsOf(check("reading", 1, outside), "why").map((i) => i.message),
    ).toEqual([expect.stringContaining("지문 · 대본 안의 글이 아니다")]);
    expect(
      errorsOf(check("reading", 1, noAnswer), "why").map((i) => i.message),
    ).toEqual([expect.stringContaining("정답")]);
    expect(
      errorsOf(check("speaking", 1, missing), "why").map((i) => i.path),
    ).toEqual(["content.listening.0.retryHighlight"]);
    const chunks = speakingTeach();
    const first = chunks.content.repeat.chunks;
    if (first) first[0] = "This is / a bebaba.";
    expect(
      errorsOf(check("speaking", 1, chunks), "why").map((i) => i.path),
    ).toEqual(["content.repeat.chunks.0"]);
    const noChunks = speakingTeach();
    delete noChunks.content.repeat.chunks;
    expect(
      errorsOf(check("speaking", 1, noChunks), "why").map((i) => i.path),
    ).toEqual(["content.repeat.chunks"]);
  });

  it("목표: teach.goals 는 <영역>-<단계>-<단원>-<n> 꼴이고, 혼자 문항 goal 은 있어야 하며 teach.goals 안이다", () => {
    const bad = readingTeach();
    if (bad.teach) bad.teach.goals = ["read-1-1-1", "reading-1-1-2"];
    expect(
      errorsOf(check("reading", 1, bad), "goal").map((i) => i.path),
    ).toEqual(["teach.goals.1"]);
    const outside = speakingTeach();
    const q = outside.content.questions[0];
    if (q) q.goal = ["speak-1-1-3", "speak-1-1-9"];
    delete outside.content.repeat.goal;
    expect(
      errorsOf(check("speaking", 1, outside), "goal").map((i) => i.path),
    ).toEqual([
      "content.questions.0.goal",
      "content.repeat.goal",
      // 핵심 목표 speak-1-1-1 에 이어진 혼자 문항이 없어진다(I4).
      "teach.goals.0",
    ]);
  });

  it("범위(넓힘): 본보기 · 같이 해 보기 · 짝 · 이야기 · 되짚기의 영어 칸도 문장 길이 · 금지어 · 어휘 범위 검사를 받는다", () => {
    const long = speakingTeach();
    const m = long.teach?.models[0];
    if (m)
      m.storyEn =
        "I have a bababa and a bebaba and a bibaba and a bobaba and a bubaba.";
    expect(
      errorsOf(check("speaking", 1, long), "learning-elements").map(
        (i) => i.path,
      ),
    ).toEqual(["teach.models.0.storyEn"]);
    const bad = writingTeach();
    if (bad.teach) bad.teach.recap.frameEn = "It is stupid.";
    expect(
      errorsOf(check("writing", 3, bad), "forbidden").map((i) => i.path),
    ).toEqual(["teach.recap.frameEn"]);
    const off = readingTeach();
    const sp = off.content.questions[0]?.spare;
    if (sp) sp.textEn = "It is a zzqx zzqy.";
    expect(
      errorsOf(check("reading", 1, off), "offband").map((i) => i.path),
    ).toEqual(["content.questions.0.spare.textEn"]);
    // 읽기 짝 글은 지문과 같은 검사다: 글로서리 proper 만 이름으로 보고(대문자 낱말을 모두 빼지 않음), 글로서리 대조도 받는다.
    const named = readingTeach();
    const sp2 = named.content.questions[0]?.spare;
    if (sp2) sp2.textEn = "Dan is a bababa.";
    const issues = check("reading", 1, named);
    expect(errorsOf(issues, "offband").map((i) => i.path)).toEqual([
      "content.questions.0.spare.textEn",
    ]);
    expect(errorsOf(issues, "glossary").map((i) => i.path)).toEqual([
      "content.questions.0.spare.textEn",
    ]);
    named.content.glossary.push({
      surface: "Dan",
      lemma: "Dan",
      meaningKo: "댄(사람 이름)",
      proper: true,
    });
    const fixed = check("reading", 1, named);
    expect(errorsOf(fixed, "offband")).toEqual([]);
    expect(errorsOf(fixed, "glossary")).toEqual([]);
  });

  it("말하기 답 한 문장: 같이 해 보기 · 짝의 바른 답이 단계 규격 문장 수 밖이면 speaking 오류이고, 'No, it is …' 꼴은 한 문장이다", () => {
    // 가짜 단계 규격 말하기 1단계에 답 문장 수 1(실제 3단계 규격과 같은 값)을 둔 묶음.
    const specs = structuredClone(ref.levelSpecs);
    for (const spec of specs.levelSpecs)
      if (spec.area === "speaking" && spec.level === 1)
        spec.questions.answerSentences = { min: 1, max: 1 };
    const one = buildReferenceIndex({
      ...ref,
      levelSpecs: specs,
      grammarTerms: GRAMMAR,
    }).index;
    expect(
      errorsOf(check("speaking", 1, speakingTeach(), one), "speaking"),
    ).toEqual([]);
    const two = speakingTeach();
    const sp = two.content.questions[0]?.spare;
    if (sp) sp.modelAnswer = "No. It is a bababa.";
    const t = two.teach?.together[0];
    if (t) t.modelAnswer = "Yes. I have a bebaba.";
    expect(
      errorsOf(check("speaking", 1, two, one), "speaking").map((i) => i.path),
    ).toEqual([
      "teach.together.0.modelAnswer",
      "content.questions.0.spare.modelAnswer",
    ]);
    const comma = speakingTeach();
    const sp2 = comma.content.questions[0]?.spare;
    if (sp2) sp2.modelAnswer = "No, it is a bababa.";
    expect(errorsOf(check("speaking", 1, comma, one), "speaking")).toEqual([]);
  });
});

describe("칸 검사: 단원 목표 대조 · 말하기 질문 · 되짚기(델타 spec 3판 · 요청자 C177 (5))", () => {
  it("목표: teach.goals 와 혼자 문항 goal 은 그 단원 unit-specs goals 의 id 안이어야 한다(오류)", () => {
    const lesson = writingTeach();
    if (lesson.teach) lesson.teach.goals = ["write-3-1-1", "write-3-1-3"];
    const item =
      lesson.content.shape === "items" ? lesson.content.items[0] : undefined;
    if (item) item.goal = ["write-3-1-1", "write-3-1-3"];
    const issues = errorsOf(check("writing", 3, lesson), "goal");
    expect(issues.map((i) => i.path)).toEqual(["teach.goals.1"]);
    expect(issues[0]?.message).toContain("unit-specs");
    expect(issues.every((i) => i.severity === "error")).toBe(true);
  });

  it("목표: seed.goals_required_levels 단계의 가르치는 수업은 단원 목표가 비면 오류이고, 그 밖 단계는 받는다", () => {
    const bare = referenceSet(settingsWith(teachRows()));
    const noGoals = buildReferenceIndex({
      ...bare,
      grammarTerms: GRAMMAR,
    }).index;
    const required = errorsOf(
      check("reading", 1, readingTeach(), noGoals),
      "goal",
    );
    expect(required.map((i) => i.path)).toEqual(["teach.goals"]);
    const optional = buildReferenceIndex({
      ...referenceSet(
        settingsWith([
          ...teachRows().filter((r) => r.key !== "seed.goals_required_levels"),
          {
            key: "seed.goals_required_levels",
            scope: "household",
            value: [3, 4, 5],
            changeVia: "seed",
          },
        ]),
      ),
      grammarTerms: GRAMMAR,
    }).index;
    expect(
      errorsOf(check("reading", 1, readingTeach(), optional), "goal"),
    ).toEqual([]);
  });

  it("목표: 혼자 문항의 과제 유형이 이어진 목표의 tasks 밖이면 오류다", () => {
    const lesson = speakingTeach();
    const item = lesson.content.listening[0];
    if (item) item.goal = "speak-1-1-3";
    expect(
      errorsOf(check("speaking", 1, lesson), "goal").map((i) => i.path),
    ).toEqual(["content.listening.0.goal"]);
  });

  it("말하기 3단계 단원 1~4: 혼자 질문 · 짝에 storyEn 이 있고, 바른 답에서 질문에 없는 낱말(no · yes · they 빼고)은 이야기 안에 있다(AC-4d)", () => {
    const issuesOf = (lesson: SpeakingLesson) =>
      errorsOf(check3(lesson), "speaking-question");
    expect(issuesOf(speakingTeach3())).toEqual([]);
    const noStory = speakingTeach3();
    const q0 = noStory.content.questions[0];
    if (q0) delete q0.storyEn;
    expect(issuesOf(noStory).map((i) => i.path)).toEqual([
      "content.questions.0.storyEn",
    ]);
    const outside = speakingTeach3();
    const q1 = outside.content.questions[1];
    if (q1) q1.storyEn = "They have a bubaba.";
    const sp = outside.content.questions[2]?.spare;
    if (sp) sp.modelAnswer = "It is a dibaba here.";
    const issues = issuesOf(outside);
    expect(issues.map((i) => i.path)).toEqual([
      "content.questions.1.modelAnswer",
      "content.questions.2.spare.modelAnswer",
    ]);
    expect(issues[1]?.message).toContain("here");
    // 1단계는 이 꼴을 보지 않는다.
    expect(
      errorsOf(check("speaking", 1, speakingTeach()), "speaking-question"),
    ).toEqual([]);
  });

  it("말하기 3단계 단원 1~4: 질문 넷 가운데 '예'로 답하는 질문이 하나이고 나머지는 '아니요'다(AC-4c)", () => {
    const two = speakingTeach3();
    const q = two.content.questions[0];
    if (q) {
      q.modelAnswer = "Yes, they have a debaba.";
      q.en = "Do they have a debaba?";
      q.accepted = [
        q.modelAnswer,
        "They have a debaba.",
        "They have a debaba here.",
      ];
    }
    expect(
      errorsOf(check3(two), "speaking-question").map((i) => i.path),
    ).toEqual(["content.questions"]);
    const none = speakingTeach3();
    const q3 = none.content.questions[3];
    if (q3) {
      q3.modelAnswer = "No, they have a fababa.";
      q3.en = "Do they have a bubaba?";
      q3.accepted = [
        q3.modelAnswer,
        "They have a fababa.",
        "They have a fababa here.",
      ];
    }
    expect(
      errorsOf(check3(none), "speaking-question").map((i) => i.path),
    ).toEqual(["content.questions"]);
  });

  it("말하기 질문: 허용 답은 서로 다른 꼴 셋 이상(짝은 1~3단계, 혼자 질문은 3단계 단원 1~4)이고 낱말 하나뿐인 답은 없다. 4단계 이상 짝은 셋을 요구하지 않는다", () => {
    const same = speakingTeach3();
    const q = same.content.questions[0];
    const m = q?.modelAnswer ?? "";
    if (q) q.accepted = [m, m.toLowerCase(), m.replace(".", "!")];
    expect(
      errorsOf(check3(same), "speaking-question").map((i) => i.path),
    ).toEqual(["content.questions.0.accepted"]);
    const single = speakingTeach3();
    const sq = single.content.questions[2];
    if (sq) {
      sq.accepted = [...(sq.accepted ?? []), "dubaba"];
      sq.acceptedMeaning = ["Fine."];
    }
    expect(
      errorsOf(check3(single), "speaking-question").map((i) => i.path),
    ).toEqual([
      "content.questions.2.accepted.3",
      "content.questions.2.acceptedMeaning.0",
    ]);
    const few = speakingTeach();
    few.content.questions[0]?.spare?.accepted.splice(2);
    expect(
      errorsOf(check("speaking", 1, few), "spare").map((i) => i.path),
    ).toEqual(["content.questions.0.spare.accepted"]);
    expect(
      errorsOf(check("speaking", 6, few), "spare").filter((i) =>
        i.path.endsWith("spare.accepted"),
      ),
    ).toEqual([]);
  });

  it("말하기 같이 해 보기(3단계 단원 1~4): 낱말 하나뿐인 답은 accepted · acceptedMeaning 어디에도 없다(설계 6 accepted 행, fix 3 N1)", () => {
    const lesson = speakingTeach3();
    const t = lesson.teach?.together[0];
    if (t) {
      t.accepted = [...t.accepted, "bebaba"];
      t.acceptedMeaning = ["Cookies."];
    }
    expect(
      errorsOf(check3(lesson), "speaking-question").map((i) => i.path),
    ).toEqual([
      "teach.together.0.accepted.3",
      "teach.together.0.acceptedMeaning.0",
    ]);
  });

  it("말하기 질문: accepted 와 acceptedMeaning 에 같은 글(대소문자 · 문장 부호만 다른 것 포함)이 있으면 오류다(C177 (4) · C182 (2))", () => {
    const lesson = speakingTeach();
    const q = lesson.content.questions[0];
    if (q) q.acceptedMeaning = [(q.accepted?.[0] ?? "").toUpperCase()];
    const t = lesson.teach?.together[1];
    if (t) t.acceptedMeaning = ["the bobaba"];
    expect(
      errorsOf(check("speaking", 1, lesson), "speaking-question").map(
        (i) => i.path,
      ),
    ).toEqual([
      "teach.together.1.acceptedMeaning.0",
      "content.questions.0.acceptedMeaning.0",
    ]);
  });

  it("말하기 질문: needs 에 expression 이 있는 목표에 이어진 질문 문항은 허용 답(accepted)이 있어야 한다", () => {
    const lesson = speakingTeach();
    const q = lesson.content.questions[3];
    if (q) delete q.accepted;
    expect(
      errorsOf(check("speaking", 1, lesson), "goal").map((i) => i.path),
    ).toEqual(["content.questions.3.accepted"]);
  });

  it("혼자 문항과 본보기의 다름: 혼자 문항 · 짝의 영어 문장과 정답이 본보기 · 같이 해 보기 글과 같으면 teach-differ 오류다(AC-1a)", () => {
    const writing = writingTeach();
    const item =
      writing.content.shape === "items" ? writing.content.items[0] : undefined;
    if (item) item.accepted = ["It is kabuba."];
    expect(
      errorsOf(check("writing", 3, writing), "teach-differ").map((i) => i.path),
    ).toEqual(["content.items.0.accepted.0"]);
    const speaking = speakingTeach();
    const sp = speaking.content.questions[1]?.spare;
    if (sp) {
      sp.modelAnswer = "I have a bebaba.";
      sp.accepted = ["They have one.", "I have a bebaba.", "It is a bebaba."];
    }
    expect(
      errorsOf(check("speaking", 1, speaking), "teach-differ").map(
        (i) => i.path,
      ),
    ).toEqual([
      "content.questions.1.spare.modelAnswer",
      "content.questions.1.spare.accepted.1",
    ]);
    const reading = readingTeach();
    const rsp = reading.content.questions[0]?.spare;
    if (rsp) rsp.textEn = "This is a bubaba.";
    expect(
      errorsOf(check("reading", 1, reading), "teach-differ").map((i) => i.path),
    ).toEqual(["content.questions.0.spare.textEn"]);
  });

  it("혼자 문항과 본보기의 다름(문장 단위, fix 3): 지문 · 대본 · 짝 글 · 이야기를 문장으로 나눠 맞대고, 정답 문장(retryHighlight)도 보며, 끝 부호만 다른 문장도 같다고 본다", () => {
    const paths = (issues: SeedIssue[]) =>
      errorsOf(issues, "teach-differ").map((i) => i.path);
    // 본보기 en 이 지문의 한 문장(정답 문장)과 같다.
    const reading = readingTeach();
    const m = reading.teach?.models[0];
    if (m) m.en = "This is a bobaba.";
    expect(paths(check("reading", 1, reading))).toEqual([
      "content.passage",
      "content.questions.2.retryHighlight",
      "content.questions.4.retryHighlight",
    ]);
    // 본보기 storyEn 이 듣기 대본의 문장과 같다.
    const speaking = speakingTeach();
    const sm = speaking.teach?.models[0];
    if (sm) sm.storyEn = "Look. This is a bebaba.";
    expect(paths(check("speaking", 1, speaking))).toEqual([
      "content.listening.1.script",
      "content.listening.1.retryHighlight",
    ]);
    // 끝 문장 부호만 다른 짝 바른 답.
    const bang = speakingTeach();
    const sp = bang.content.questions[1]?.spare;
    if (sp) sp.modelAnswer = "It is a bubaba!";
    expect(paths(check("speaking", 1, bang))).toEqual([
      "content.questions.1.spare.modelAnswer",
    ]);
  });

  it("짝 꼴: 짝의 과제 유형(듣기는 kind)이 문항과 다르면 spare 오류이고, 짝 · 같이 해 보기에도 보기 번호 · 그림 키 · 정답 검사가 걸린다", () => {
    const reading = readingTeach();
    const q = reading.content.questions[0];
    if (q?.spare)
      q.spare = {
        kind: "text",
        type: "fact",
        textEn: "It is a bababa.",
        prompt: "It is a ___.",
        options: ["bababa", "bebaba", "bobaba", "bubaba"],
        answerNo: 1,
        whyKo: "찾아요.",
      };
    expect(
      errorsOf(check("reading", 1, reading), "spare").map((i) => i.path),
    ).toEqual(["content.questions.0.spare.type"]);
    const answer = readingTeach();
    const a = answer.content.questions[1]?.spare;
    if (a) a.answerNo = 7;
    const t = answer.teach?.together[0];
    if (t) t.answerNo = 3;
    const pic = answer.content.questions[2]?.spare;
    if (pic?.kind === "picture")
      pic.options = ["bobaba", "bibaba", "dubaba", "fababa"];
    const issues = check("reading", 1, answer);
    expect(errorsOf(issues, "answer").map((i) => i.path)).toEqual([
      "teach.together.0.answerNo",
      "content.questions.1.spare.answerNo",
    ]);
    expect(errorsOf(issues, "image").map((i) => i.path)).toEqual([
      "content.questions.2.spare.options.1",
    ]);
    const listening = speakingTeach3();
    const l = listening.content.listening[0];
    if (l?.spare)
      l.spare = { ...l.spare, kind: "picture", options: l.options } as never;
    expect(errorsOf(check3(listening), "spare").map((i) => i.path)).toEqual([
      "content.listening.0.spare.kind",
    ]);
    const writing = writingTeach();
    const w =
      writing.content.shape === "items" ? writing.content.items[0] : undefined;
    if (w?.spare?.type === "assemble-sentence")
      w.spare.cards = ["we", "like", "."];
    expect(
      errorsOf(check("writing", 3, writing), "answer").map((i) => i.path),
    ).toEqual(["content.items.0.spare.cards"]);
  });

  it("이름표 꼴: 3단계 단원 1~4 읽기 사실 확인 · 듣기 이해 문항(짝 포함)은 빈칸이 하나이고 askRole 이 있다(AC-4b)", () => {
    expect(errorsOf(check3(speakingTeach3()), "ask-role")).toEqual([]);
    const lesson = speakingTeach3();
    const l0 = lesson.content.listening[0];
    if (l0) delete l0.askRole;
    const l1 = lesson.content.listening[1];
    if (l1?.kind === "text") l1.prompt = "___ is a ___.";
    const sp = lesson.content.listening[2]?.spare;
    if (sp?.kind === "text") sp.prompt = "I see my bobaba.";
    expect(errorsOf(check3(lesson), "ask-role").map((i) => i.path)).toEqual([
      "content.listening.0.askRole",
      "content.listening.1.prompt",
      "content.listening.2.spare.prompt",
    ]);
    expect(errorsOf(check("speaking", 1, lesson), "ask-role")).toEqual([]);
  });

  it("되짚기 줄: closeKoPracticed 에 '할 수 있' 단정 꼴이 있으면 recap-line 오류다(AC-7c)", () => {
    const lesson = readingTeach();
    if (lesson.teach)
      lesson.teach.recap.closeKoPracticed = "이제 그림 낱말을 찾을 수 있어요.";
    expect(
      errorsOf(check("reading", 1, lesson), "recap-line").map((i) => i.path),
    ).toEqual(["teach.recap.closeKoPracticed"]);
  });

  it("유형 경계: 같이 해 보기 유형이 그 단계 문항 유형(읽기 mix · 쓰기 itemTypes) 밖이면 teach-type 오류다(AC-5a)", () => {
    const writing = writingTeach();
    const t = writing.teach?.together[0];
    if (writing.teach && t)
      writing.teach.together[0] = {
        type: "pick-word",
        picture: "kabuba",
        options: ["kabuba", "kebuba"],
        answerNo: 1,
        accepted: ["kabuba"],
        slot: "word",
        rightKo: "맞아요!",
        wrongKo: "다시 봐요.",
      };
    expect(
      errorsOf(check("writing", 3, writing), "teach-type").map((i) => i.path),
    ).toEqual(["teach.together.0.type"]);
    const reading = readingTeach();
    const r = reading.teach?.together[1];
    if (r) r.type = "sequence";
    expect(
      errorsOf(check("reading", 1, reading), "teach-type").map((i) => i.path),
    ).toEqual(["teach.together.1.type"]);
  });

  it("같이 해 보기 조립: 빈칸 수와 남은 카드 수가 같고, 빈칸 자리의 정답 카드가 남은 카드다(AC-2e)", () => {
    const fewer = writingTeach();
    const t = fewer.teach?.together[0];
    if (t?.filled) t.filled.cards = ["it", null, null, "."];
    expect(
      errorsOf(check("writing", 3, fewer), "teach-layout").map(
        (i) => i.message,
      ),
    ).toEqual([expect.stringContaining("빈칸 2")]);
    const wrong = writingTeach();
    const w = wrong.teach?.together[0];
    if (w) w.choices = ["kabuba"];
    expect(
      errorsOf(check("writing", 3, wrong), "teach-layout").map((i) => i.path),
    ).toEqual(["teach.together.0.choices"]);
  });

  it("자리별 시간: 오늘 배울 것 · 보여 주기 · 같이 해 보기 · 짝 · 되짚기의 추정이 lesson.slot_seconds_max.<자리> 를 넘으면 slot-seconds 경고다", () => {
    const warnings = (at = index) =>
      check("speaking", 1, speakingTeach(), at).filter(
        (i) => i.severity === "warning" && i.rule === "slot-seconds",
      );
    expect(warnings()).toEqual([]);
    const tight = buildReferenceIndex({
      ...withGoals(
        referenceSet(
          settingsWith([
            ...teachRows().filter(
              (r) => r.key !== "lesson.slot_seconds_max.show",
            ),
            {
              key: "lesson.slot_seconds_max.show",
              scope: "household",
              value: 1,
              changeVia: "advanced",
            },
          ]),
        ),
      ),
      grammarTerms: GRAMMAR,
    }).index;
    const w = warnings(tight);
    expect(w.map((i) => i.path)).toEqual(["teach.models"]);
    expect(w[0]?.message).toContain("lesson.slot_seconds_max.show");
  });

  it("되짚기: 핵심 목표(teach.goals 첫 값)에 이어진 혼자 문항이 lesson.recap_min_evidence 보다 적으면 경고이고, 마무리 줄 closeKoPracticed 도 줄 길이 검사를 받는다", () => {
    const lesson = writingTeach();
    if (lesson.content.shape === "items") {
      lesson.content.items.forEach((item, i) => {
        item.goal = i === 0 ? "write-3-1-1" : "write-3-1-2";
      });
    }
    if (lesson.teach) lesson.teach.goals = ["write-3-1-1", "write-3-1-2"];
    const issues = check("writing", 3, lesson);
    expect(errors(issues)).toEqual([]);
    const warn = issues.filter(
      (i) => i.severity === "warning" && i.rule === "recap-evidence",
    );
    expect(warn.map((i) => i.path)).toEqual(["teach.goals.0"]);
    expect(warn[0]?.message).toContain("lesson.recap_min_evidence");
    // 핵심 목표에 이어진 혼자 문항이 0 이면 goal 오류다(I4).
    const zero = writingTeach();
    if (zero.teach) zero.teach.goals = ["write-3-1-2", "write-3-1-1"];
    expect(
      errorsOf(check("writing", 3, zero), "goal").map((i) => i.path),
    ).toEqual(["teach.goals.0"]);
    const long = readingTeach();
    if (long.teach) long.teach.recap.closeKoPracticed = `${"가".repeat(41)}요.`;
    expect(
      errorsOf(check("reading", 1, long), "teacher-line").map((i) => i.path),
    ).toEqual(["teach.recap.closeKoPracticed"]);
  });
});

describe("규격: 단원 규격 목표(goals)", () => {
  it("단원 규격 행은 목표 목록 goals 를 선택 칸으로 받고(id 필수, 나머지 칸 꼴은 평가 체계 몫), id 없는 목표는 거부한다", () => {
    const spec = structuredClone(ref.unitSpecs.unitSpecs[0]);
    if (!spec) throw new Error("단원 규격 없음");
    expect(UnitSpecSchema.safeParse(spec).success).toBe(true);
    const withGoals = {
      ...spec,
      goals: [
        {
          id: "read-1-1-1",
          ko: "그림 낱말을 찾을 수 있다",
          core: "사실 정보 찾기",
          tasks: ["picture"],
          home: ["이야기"],
          needs: ["comprehension"],
          accept: "correct",
        },
      ],
    };
    expect(UnitSpecSchema.safeParse(withGoals).error).toBeUndefined();
    expect(
      UnitSpecSchema.safeParse({
        ...spec,
        goals: [{ ...withGoals.goals[0], demands: ["사실 정보 찾기"] }],
      }).success,
    ).toBe(true);
    expect(
      UnitSpecSchema.safeParse({ ...spec, goals: [{ ko: "목표" }] }).success,
    ).toBe(false);
    for (const bad of [
      { needs: ["feeling"] },
      { accept: "partial" },
      { tasks: [] },
      { extra: 1 },
    ])
      expect(
        UnitSpecSchema.safeParse({
          ...spec,
          goals: [{ ...withGoals.goals[0], ...bad }],
        }).success,
        JSON.stringify(bad),
      ).toBe(false);
  });

  it("규격 파일 정합: 목표 id 가 그 행의 영역 · 단계 · 단원 꼴이 아니거나, 시드 전체에서 겹치거나, needs 가 그 영역 몫이 아니면 unit-goals 오류다", () => {
    const rules = (r: ReturnType<typeof referenceSet>) =>
      buildReferenceIndex(r)
        .issues.filter((i) => i.rule === "unit-goals")
        .map((i) => i.message);
    expect(rules(ref)).toEqual([]);
    const bad = structuredClone(ref);
    const reading = bad.unitSpecs.unitSpecs.find(
      (u) => u.area === "reading" && u.level === 1 && u.unit === 1,
    );
    const writing = bad.unitSpecs.unitSpecs.find(
      (u) => u.area === "writing" && u.level === 3 && u.unit === 1,
    );
    if (!reading?.goals || !writing?.goals) throw new Error("목표 없음");
    reading.goals.push(goalOf("read-1-2-1", ["picture"], ["comprehension"]));
    reading.goals.push(goalOf("read-1-1-2", ["picture"], ["repeat"]));
    writing.goals.push(goalOf("read-1-1-1", ["assemble-sentence"], ["form"]));
    const messages = rules(bad);
    expect(messages).toHaveLength(4);
    expect(messages.join(" ")).toContain("read-1-2-1");
    expect(messages.join(" ")).toContain("repeat");
  });
});

describe("단원 목표: 수 · 과제 유형 · 필수 단계 보고(M5)", () => {
  it("목표 수가 seed.unit_goals_max 를 넘거나 tasks 가 그 영역 · 단계 과제 유형 밖이면 unit-goals 오류다", () => {
    const messages = (r: ReturnType<typeof referenceSet>) =>
      buildReferenceIndex(r)
        .issues.filter((i) => i.rule === "unit-goals")
        .map((i) => i.message);
    const many = structuredClone(ref);
    const speaking = many.unitSpecs.unitSpecs.find(
      (u) => u.area === "speaking" && u.level === 1 && u.unit === 1,
    );
    if (!speaking?.goals) throw new Error("목표 없음");
    speaking.goals.push(
      goalOf("speak-1-1-4", ["question"], ["response"]),
      goalOf("speak-1-1-5", ["question"], ["response"]),
    );
    expect(messages(many)).toEqual([
      expect.stringContaining("seed.unit_goals_max"),
    ]);
    const tasks = structuredClone(ref);
    const writing = tasks.unitSpecs.unitSpecs.find(
      (u) => u.area === "writing" && u.level === 3 && u.unit === 1,
    );
    const first = writing?.goals?.[0];
    if (!first) throw new Error("목표 없음");
    first.tasks = ["assemble-sentence", "composition"];
    expect(messages(tasks)).toEqual([expect.stringContaining("composition")]);
  });

  it("필수 단계 단원에 목표가 없으면 모든 모드에서 경고(영역 · 단계마다 하나)이고, goalsBlocking 일 때만 오류다", () => {
    const files = seedTreeFiles(sampleSeedTree(ref));
    files.set(GRAMMAR_TERMS_FILE, JSON.stringify(GRAMMAR));
    const pr = validateSeed(files, { mode: "pr" });
    const warned = pr.warnings.filter((w) => w.rule === "unit-goals");
    expect(warned.length).toBeGreaterThan(0);
    expect(new Set(warned.map((w) => w.id)).size).toBe(warned.length);
    expect(pr.errors.filter((e) => e.rule === "unit-goals")).toEqual([]);
    const blocking = validateSeed(files, {
      mode: "complete",
      through: 1,
      goalsBlocking: true,
    });
    expect(
      blocking.errors.filter((e) => e.rule === "unit-goals").length,
    ).toBeGreaterThan(0);
    const dev = validateSeed(files, { mode: "complete", through: 1 });
    expect(dev.errors.filter((e) => e.rule === "unit-goals")).toEqual([]);
  });

  it("명령: --require-unit-goals(기본 끔)가 있을 때만 단원 목표 없음이 오류이고, --complete-through settings 만으로는 막지 않는다(fix 2, C186)", () => {
    const parsed = parseArgs([]);
    const on = parseArgs(["--require-unit-goals"]);
    if (!parsed.ok || !on.ok) throw new Error("인자 풀이 실패");
    expect(parsed.args.requireUnitGoals).toBe(false);
    expect(on.args.requireUnitGoals).toBe(true);
    const files = seedTreeFiles(sampleSeedTree(ref));
    files.set(GRAMMAR_TERMS_FILE, JSON.stringify(GRAMMAR));
    const goalLines = (args: CliArgs) =>
      runValidate(args, files).lines.filter((l) => l.includes("unit-goals"));
    const off = goalLines({ ...parsed.args, completeThrough: "settings" });
    expect(off.length).toBeGreaterThan(0);
    expect(off.every((l) => l.startsWith("경고"))).toBe(true);
    const blocked = goalLines({
      ...parsed.args,
      completeThrough: "settings",
      requireUnitGoals: true,
    });
    expect(blocked.some((l) => !l.startsWith("경고"))).toBe(true);
    const prBlocked = goalLines({ ...parsed.args, requireUnitGoals: true });
    expect(prBlocked.some((l) => !l.startsWith("경고"))).toBe(true);
  });

  it("goalsBlocking 을 켰는데 seed.goals_required_levels 가 없으면 건너뛰지 않고 오류다(fix 3 N2)", () => {
    const bare = referenceSet(defaultSettings());
    const files = seedTreeFiles(sampleSeedTree(bare));
    const on = validateSeed(files, { mode: "pr", goalsBlocking: true });
    expect(
      on.errors.filter((e) => e.rule === "unit-goals").map((e) => e.message),
    ).toEqual([expect.stringContaining("seed.goals_required_levels")]);
    const off = validateSeed(files, { mode: "pr" });
    expect(off.errors.filter((e) => e.rule === "unit-goals")).toEqual([]);
  });

  it("미리보기 예문은 빈 글이나 영어 글만 받고, 공백뿐인 글은 거부한다(M6)", () => {
    const lesson = readingTeach();
    const first = lesson.preview[0];
    if (!first) throw new Error("미리보기 없음");
    first.example = "   ";
    expect(ReadingLessonSchema.safeParse(lesson).success).toBe(false);
  });
});

describe("검증기: 문법 용어 목록 파일", () => {
  it(`${GRAMMAR_TERMS_FILE} 을 배치 밖 경로로 막지 않고 읽어 칸 검사에 넘기며, 깨진 글은 규격 파일 오류다`, () => {
    const files = seedTreeFiles(sampleSeedTree(ref));
    files.set(GRAMMAR_TERMS_FILE, JSON.stringify(GRAMMAR));
    const seed = collectCells(files);
    expect(seed.errors.filter((e) => e.file === GRAMMAR_TERMS_FILE)).toEqual(
      [],
    );
    expect(seed.index.grammarTerms).toEqual(GRAMMAR);
    files.set(GRAMMAR_TERMS_FILE, "{");
    const broken = collectCells(files);
    expect(
      broken.errors
        .filter((e) => e.file === GRAMMAR_TERMS_FILE)
        .map((e) => e.rule),
    ).toEqual(["json"]);
    files.set(
      GRAMMAR_TERMS_FILE,
      JSON.stringify({ terms: [{ word: "주어" }] }),
    );
    expect(
      collectCells(files).errors.filter((e) => e.file === GRAMMAR_TERMS_FILE)[0]
        ?.rule,
    ).toBe("schema");
    files.delete(GRAMMAR_TERMS_FILE);
    const without = collectCells(files);
    expect(without.errors.filter((e) => e.file === GRAMMAR_TERMS_FILE)).toEqual(
      [],
    );
    expect(without.index.grammarTerms).toBeUndefined();
  });
});

describe("묶음 타: 짝 · 같이 해 보기 정답 검사 · 말하기 질문 의미 검사 · 풀이 대상", () => {
  it("AC-22l 짝 · 같이 해 보기의 빈칸 문항은 정답을 넣은 글이 그 글(지문 · 대본)에 있고, 말하기 같이 해 보기는 고른 말을 넣으면 바른 답이다", () => {
    const answerPaths = (issues: SeedIssue[]) =>
      errorsOf(issues, "answer").map((i) => i.path);
    expect(answerPaths(check("reading", 1, readingTeach()))).toEqual([]);
    const reading = readingTeach();
    const t = reading.teach?.together[0];
    if (t) t.answerNo = 2;
    expect(answerPaths(check("reading", 1, reading))).toEqual([
      "teach.together.0.prompt",
    ]);
    expect(answerPaths(check3(speakingTeach3()))).toEqual([]);
    const listening = speakingTeach3();
    const sp = listening.content.listening[0]?.spare;
    if (sp) sp.answerNo = sp.answerNo === 1 ? 2 : 1;
    expect(answerPaths(check3(listening))).toEqual([
      "content.listening.0.spare.prompt",
    ]);
    const together = speakingTeach();
    const st = together.teach?.together[0];
    if (st) st.answerNo = 2;
    expect(answerPaths(check("speaking", 1, together))).toEqual([
      "teach.together.0.filled",
    ]);
  });

  it("AC-22k 말하기 3단계 단원 1~4 Do 질문의 바른 답 · 허용 답은 그 문항 의미 검사를 통과하고, 아니요 질문의 질문 글에는 틀린 정보 낱말이 있다", () => {
    const meaning = (lesson: SpeakingLesson) =>
      errorsOf(check3(lesson), "speaking-meaning");
    expect(meaning(speakingTeach3())).toEqual([]);
    const wrong = speakingTeach3();
    const q = wrong.content.questions[0];
    if (q)
      q.accepted = [
        ...(q.accepted ?? []),
        "No, they have a debaba and a bubaba.",
      ];
    const issues = meaning(wrong);
    expect(issues.map((i) => i.path)).toEqual([
      "content.questions.0.accepted.3",
    ]);
    expect(issues[0]?.message).toContain("wrong_info");
    const noWrong = speakingTeach3();
    const q1 = noWrong.content.questions[1];
    if (q1) q1.en = "Do they have a dibaba?";
    expect(meaning(noWrong).map((i) => i.path)).toEqual([
      "content.questions.1.en",
    ]);
  });

  it("AC-22l 풀이 대상: 정답이 있는 같이 해 보기 · 짝이 지금 문항 번호 뒤에 붙고, 한 수업의 짝은 한 요청(한 호출)에 든다", () => {
    const cellOf = (
      area: "reading" | "writing" | "speaking",
      level: number,
      lesson: AnyLesson,
    ): SeedCell => ({
      key: cellKey({
        type: "lesson",
        area,
        level,
        unit: UNIT,
        kind: lesson.kind,
        lessonNo: lesson.lessonNo,
        variant: lesson.variant,
      }),
      kind: "lesson",
      area,
      value: lesson,
    });
    const reading = cellOf("reading", 1, readingTeach());
    const paths = itemsOf(reading).map((i) => i.path);
    expect(paths.slice(0, 5)).toEqual(
      [0, 1, 2, 3, 4].map((i) => `content.questions.${i}`),
    );
    expect(paths.slice(5)).toEqual([
      "teach.together.0",
      "teach.together.1",
      ...[0, 1, 2, 3, 4].map((i) => `content.questions.${i}.spare`),
    ]);
    expect(solveTargets(reading)).toHaveLength(paths.length);
    const request = buildSolveRequest(reading, index);
    if (!request) throw new Error("풀이 요청 없음");
    expect(request.items).toHaveLength(paths.length);
    const spareView = request.items[7];
    expect(spareView).toMatchObject({
      answer: "choice",
      passage: "It is a bababa.",
    });
    const togetherView = request.items[5];
    expect(togetherView).toMatchObject({
      answer: "choice",
      passage: "This is a bubaba.",
    });
    // 그림 같이 해 보기의 보기(choices)는 그림 뜻으로 간다.
    expect(
      togetherView?.answer === "choice" ? togetherView.options : [],
    ).toHaveLength(2);
    expect(JSON.stringify(request)).not.toContain('"answerNo"');
    expect(seedAnswerOf(reading, 6)).toEqual({ answerNo: 1 });
    const writing = cellOf("writing", 3, writingTeach());
    expect(solveTargets(writing)).toHaveLength(5 + 2 + 5);
    const speaking = cellOf("speaking", 3, speakingTeach3());
    const targetPaths = solveTargets(speaking).map(
      (no) => itemsOf(speaking).find((i) => i.no === no)?.path,
    );
    expect(targetPaths).toEqual([
      "content.listening.0",
      "content.listening.1",
      "content.listening.2",
      // 고르기 꼴(choices · answerNo)인 말하기 같이 해 보기는 choice 꼴로 든다(06:199, 타 fix 1 M1).
      "teach.together.0",
      "content.listening.0.spare",
      "content.listening.1.spare",
      "content.listening.2.spare",
    ]);
  });
});

describe("묶음 타 fix 1: 말하기 같이 해 보기 풀이 보기 · 조립 카드 대문자(C84)", () => {
  it("AC-22l 말하기 같이 해 보기(고르기 꼴)의 풀이 보기는 이야기 · 질문을 듣고 틀의 빈칸에 들 말을 고르는 choice 꼴이고 정답 번호가 새지 않는다", () => {
    const lesson = speakingTeach3();
    const cell: SeedCell = {
      key: cellKey({
        type: "lesson",
        area: "speaking",
        level: 3,
        unit: UNIT,
        kind: lesson.kind,
        lessonNo: lesson.lessonNo,
        variant: lesson.variant,
      }),
      kind: "lesson",
      area: "speaking",
      value: lesson,
    };
    const request = buildSolveRequest(cell, index);
    const no = itemsOf(cell).find((i) => i.path === "teach.together.0")?.no;
    const view = request?.items.find((i) => i.no === no);
    expect(view).toEqual({
      no,
      answer: "choice",
      listen: "You have a bebaba. What do you have?",
      prompt: "I have a ___.",
      options: ["bebaba", "bobaba"],
    });
    expect(seedAnswerOf(cell, no ?? 0)).toMatchObject({ answerNo: 1 });
  });

  it("C84 문장 조립 카드: I 와 수업 인물 이름(어휘 목록에 없는 대문자 낱말, 정답 꼴 그대로)은 대문자 카드를 받는다", () => {
    const lesson = writingTeach();
    if (lesson.content.shape !== "items") throw new Error("items 아님");
    const first = lesson.content.items[0];
    const last = lesson.content.items[4];
    if (
      first?.type !== "assemble-sentence" ||
      last?.type !== "assemble-sentence"
    )
      throw new Error("조립 아님");
    first.cards = ["the", "kabuba", "like", "I", "."];
    last.cards = ["Momo", "with", "kububa", "they", "."];
    expect(errorsOf(check("writing", 3, lesson), "writing-cards")).toEqual([]);
  });

  it("C84 문장 조립 카드: 그 밖의 대문자 카드(어휘 목록 낱말 · 정답에 그 꼴로 없는 낱말)는 지금처럼 막는다", () => {
    const lesson = writingTeach();
    if (lesson.content.shape !== "items") throw new Error("items 아님");
    const item = lesson.content.items[3];
    const last = lesson.content.items[4];
    if (
      item?.type !== "assemble-sentence" ||
      last?.type !== "assemble-sentence"
    )
      throw new Error("조립 아님");
    item.cards = ["a", "is", "kobuba", "This", "."];
    last.cards = ["MOMO", "with", "kububa", "they", "."];
    expect(
      errorsOf(check("writing", 3, lesson), "writing-cards").map((i) => i.path),
    ).toEqual(["content.items.3.cards.3", "content.items.4.cards.0"]);
  });
});

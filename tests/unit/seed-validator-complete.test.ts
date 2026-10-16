import { describe, expect, it } from "vitest";
import {
  checkLevelTestFile,
  checkPlacementFile,
  checkStoryFile,
  lessonCorpus,
} from "@/core/seed/check-assessment";
import type { SeedIssue } from "@/core/seed/check-lesson";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import type {
  LevelTestFile,
  PlacementFile,
} from "@/core/seed/schema/assessment";
import type { LessonFile, TalkLesson } from "@/core/seed/schema/lesson";
import {
  AREAS,
  cellKey,
  levelTestFilePath,
  placementFilePath,
  storyFilePath,
  TALK_TEST_SAME_QUESTIONS_MAX,
  TEST_AI_ITEMS_MAX,
  UNITS_PER_LEVEL,
} from "@/core/seed/structure";
import { splitSentences } from "@/core/seed/text";
import {
  exitCodeOf,
  type SeedReport,
  validateSeed,
} from "@/core/seed/validate";
import {
  defaultSettings,
  miniSeed,
  readingLesson,
  readingLevelTest,
  referenceSet,
  type SeedTree,
  seedTreeFiles,
  settingNumber,
  speakingPlacement,
  storyFile,
  talkLevelTest,
  talkUnitCards,
  unitWordsOf,
} from "../fixtures/seed/builders";

const ref = referenceSet(defaultSettings());
const { index } = buildReferenceIndex(ref);
const num = (key: string) => settingNumber(ref.settings, key);
const THROUGH = 1;

function mini(): SeedTree {
  return miniSeed({ areas: AREAS, through: THROUGH, frame: "small" });
}
function run(tree: SeedTree, mode: "pr" | "complete" = "complete"): SeedReport {
  return validateSeed(seedTreeFiles(tree), {
    mode,
    ...(mode === "complete" ? { through: THROUGH } : {}),
    areas: AREAS,
  });
}
const rules = (report: SeedReport) =>
  [...new Set(report.errors.map((e) => e.rule))].sort();
const issueRules = (issues: SeedIssue[]) =>
  [
    ...new Set(issues.filter((i) => i.severity === "error").map((i) => i.rule)),
  ].sort();

function lessonFile(
  tree: SeedTree,
  area: string,
  level: number,
  unit: number,
): LessonFile {
  const file = tree.lessons.find(
    (f) => f.area === area && f.level === level && f.unit === unit,
  );
  if (!file) throw new Error(`수업 파일 없음: ${area} ${level} ${unit}`);
  return file;
}
function levelTest(tree: SeedTree, area: string): LevelTestFile {
  const file = tree.levelTests.find(
    (f) => f.area === area && f.level === THROUGH,
  );
  if (!file) throw new Error(`단계 평가 없음: ${area}`);
  return file;
}

describe("완전성 · 단계 평가 · 배치 · 이야기", () => {
  it("AC-7a 완전성: 시험용 시드가 1단계까지 차 있고 풀이 검사를 통과하면 통과한다", () => {
    const report = run(mini());
    expect(report.errors).toEqual([]);
    expect(report.empty).toEqual([]);
    expect(report.unchecked).toEqual([]);
    expect(report.pendingHuman).toEqual([]);
    expect(report.summary.cells).toBeGreaterThan(0);
    expect(report.summary.passed).toBe(report.summary.cells);
    expect(report.mode).toBe("complete");
    expect(report.completeThrough).toBe(THROUGH);
    expect(exitCodeOf(report)).toBe(0);
  });

  it("AC-7a 완전성: 칸 하나를 지우면 실패한다", () => {
    const tree = mini();
    const file = lessonFile(tree, "speaking", 1, 2);
    const removed = file.lessons.pop();
    if (!removed) throw new Error("수업 없음");
    const key = cellKey({
      type: "lesson",
      area: "speaking",
      level: 1,
      unit: 2,
      kind: removed.kind,
      lessonNo: removed.lessonNo,
      variant: removed.variant,
    });
    const report = run(tree);
    expect(report.empty).toEqual([key]);
    expect(exitCodeOf(report)).toBe(1);
    // PR 모드는 빈 칸을 보고만 한다.
    expect(exitCodeOf(run(tree, "pr"))).toBe(0);
  });

  it("AC-7a 완전성: 사람 확인 목록에 칸이 남으면 실패한다", () => {
    const tree = mini();
    const record = tree.checks[0]?.file.records[0];
    const item = record?.solve.items[0];
    if (!record || !item) throw new Error("풀이 검사 기록 없음");
    item.verdict = "different";
    const report = run(tree);
    expect(report.pendingHuman).toEqual([record.cell]);
    expect(exitCodeOf(report)).toBe(1);
    expect(exitCodeOf(run(tree, "pr"))).toBe(1);
  });

  it("AC-7a 단계 평가: 지문에 그 단계 수업 지문과 같은 문장이 있으면 거부한다", () => {
    const tree = mini();
    const lesson = lessonFile(tree, "reading", THROUGH, 1).lessons[0];
    if (!lesson || !("content" in lesson) || !("passage" in lesson.content)) {
      throw new Error("읽기 수업 없음");
    }
    const [sentence] = splitSentences(lesson.content.passage);
    const test = levelTest(tree, "reading");
    const item =
      test.forms[0] && "items" in test.forms[0]
        ? test.forms[0].items[0]
        : undefined;
    if (!item || !("passage" in item) || !sentence)
      throw new Error("평가 문항 없음");
    item.passage = `${sentence.toUpperCase()}  `;
    const report = run(tree);
    expect(rules(report)).toEqual(["level-test-passage-overlap"]);
    expect(report.errors[0]?.cell).toBe(
      cellKey({
        type: "level-test",
        area: "reading",
        level: THROUGH,
        form: 1,
        no: 1,
      }),
    );
  });

  it("AC-7a 단계 평가: 단원마다 문항 수가 level.test_items ÷ 단원 수가 아닌 벌을 거부한다", () => {
    const tree = mini();
    const test = levelTest(tree, "writing");
    const form = test.forms[0];
    if (!form || !("items" in form)) throw new Error("평가 벌 없음");
    const first = form.items[0];
    if (!first) throw new Error("평가 문항 없음");
    first.unit = first.unit === UNITS_PER_LEVEL ? 1 : first.unit + 1;
    expect(rules(run(tree))).toEqual(["level-test-unit-count"]);
  });

  it("AC-7a 회화 평가 카드: 장마다 단원별 턴이 level.test_items_per_session ÷ 단원 수가 아니면 거부한다", () => {
    const tree = mini();
    const test = levelTest(tree, "talk");
    const form = test.forms[0];
    if (!form || !("sheets" in form)) throw new Error("회화 평가 없음");
    const turn = form.sheets[0]?.turns[0];
    if (!turn) throw new Error("평가 턴 없음");
    turn.unit = turn.unit === UNITS_PER_LEVEL ? 1 : turn.unit + 1;
    expect(rules(run(tree))).toEqual(["talk-test-unit-count"]);
  });

  it("AC-7a 회화 평가 카드: 수업 카드와 글자가 같은 질문이 4개인 장을 거부한다", () => {
    const cards = talkUnitCards(ref, 1);
    const corpus = lessonCorpus("talk", cards);
    const cardQuestions = [
      ...new Set(
        (cards[0] as TalkLesson).card.turns?.map((t) => t.question.en) ?? [],
      ),
    ];
    const pick = cardQuestions
      .slice(0, TALK_TEST_SAME_QUESTIONS_MAX + 1)
      .reverse();
    expect(pick).toHaveLength(TALK_TEST_SAME_QUESTIONS_MAX + 1);
    const file = talkLevelTest(ref);
    const ctx = { file: levelTestFilePath("talk", 1), index, corpus };
    expect(checkLevelTestFile(file, ctx)).toEqual([]);
    const withQuestions = (positions: number[]) => {
      const copy = structuredClone(file);
      const sheet =
        copy.forms[0] && "sheets" in copy.forms[0]
          ? copy.forms[0].sheets[0]
          : undefined;
      if (!sheet) throw new Error("장 없음");
      positions.forEach((at, i) => {
        const turn = sheet.turns[at];
        if (turn) turn.question = { ...turn.question, en: pick[i] ?? "" };
      });
      return checkLevelTestFile(copy, ctx).filter(
        (i) => i.rule === "talk-test-lesson-overlap",
      );
    };
    // 띄엄띄엄 셋은 통과, 넷이면 거부
    expect(withQuestions([0, 2, 4])).toEqual([]);
    const four = withQuestions([0, 2, 4, 6]);
    expect(four).toHaveLength(1);
    expect(four[0]?.cell).toBe(
      cellKey({ type: "level-test", area: "talk", level: 1, form: 1, no: 1 }),
    );
  });

  it("6.4 단계 평가: 벌 사이에 같은 문항과 수업 문항과 같은 질문 · 보기 묶음을 거부한다", () => {
    const lesson = readingLesson(ref, 4).lesson;
    const corpus = lessonCorpus("reading", [lesson]);
    const ctx = { file: levelTestFilePath("reading", 4), index, corpus };
    const file = readingLevelTest(ref);
    expect(checkLevelTestFile(file, ctx)).toEqual([]);
    // 둘째 벌이 첫 벌과 같은 문항
    const twice = structuredClone(file);
    const first = twice.forms[0];
    if (!first) throw new Error("벌 없음");
    (twice.forms as unknown[]).push({ ...structuredClone(first), form: 2 });
    expect(issueRules(checkLevelTestFile(twice, ctx))).toEqual([
      "level-test-forms-overlap",
    ]);
    // 수업 문항과 같은 질문 · 보기 묶음
    const same = structuredClone(file);
    const item =
      same.forms[0] && "items" in same.forms[0]
        ? same.forms[0].items[0]
        : undefined;
    const question = lesson.content.questions[0];
    if (!item || !("prompt" in item) || !("options" in item) || !question) {
      throw new Error("문항 없음");
    }
    item.prompt = question.prompt;
    item.options = [...question.options];
    expect(issueRules(checkLevelTestFile(same, ctx))).toEqual([
      "level-test-item-overlap",
    ]);
  });

  it("6.4 단계 평가: AI 과제 문항이 셋이거나 둘째 세션 끝이 아니면 거부한다", () => {
    const level = num("writing.split_from_level");
    const total = num("level.test_items");
    const perUnit = total / UNITS_PER_LEVEL;
    const words = unitWordsOf(ref, "writing", level, 1);
    const build = (aiAt: number[]): LevelTestFile => ({
      area: "writing",
      level,
      forms: [
        {
          form: 1,
          items: Array.from({ length: total }, (_, i) => {
            const head = {
              no: i + 1,
              unit: Math.floor(i / perUnit) + 1,
              revision: 1,
              correction: 0,
            };
            return aiAt.includes(i + 1)
              ? {
                  ...head,
                  type: "composition" as const,
                  task: `Write about your ${words[i] ?? ""}.`,
                  rubric: ["과제 충족"],
                }
              : {
                  ...head,
                  type: "fill-blank" as const,
                  prompt: `I like the ___ ${i + 1}.`,
                  accepted: [`I like the ${words[i] ?? ""} ${i + 1}.`],
                };
          }),
        },
      ],
    });
    const ctx = {
      file: levelTestFilePath("writing", level),
      index,
      corpus: lessonCorpus("writing", []),
    };
    const tail = Array.from({ length: TEST_AI_ITEMS_MAX }, (_, i) => total - i);
    expect(checkLevelTestFile(build(tail), ctx)).toEqual([]);
    const tooMany = [...tail, total - TEST_AI_ITEMS_MAX];
    expect(issueRules(checkLevelTestFile(build(tooMany), ctx))).toEqual([
      "level-test-ai",
    ]);
    expect(issueRules(checkLevelTestFile(build([1]), ctx))).toEqual([
      "level-test-ai",
    ]);
    // 작문 단계가 아닌 쓰기(4단계)에는 AI 과제 문항을 두지 않는다.
    const early = {
      ...build(tail),
      level: num("writing.light_check_until_level"),
    };
    expect(
      issueRules(
        checkLevelTestFile(early, {
          ...ctx,
          file: levelTestFilePath("writing", early.level),
        }),
      ),
    ).toContain("level-test-ai");
    // 말하기 9단계 이상은 허용 답 없는 질문 답(AI 과제)을 벌 끝에 둘까지 둔다(6.3, P4c 검토 M-3).
    const speakLevel = 10;
    const speaking = (aiAt: number[]): LevelTestFile => ({
      area: "speaking",
      level: speakLevel,
      forms: [
        {
          form: 1,
          items: Array.from({ length: total }, (_, i) => {
            const head = {
              no: i + 1,
              unit: Math.floor(i / perUnit) + 1,
              revision: 1,
              correction: 0,
            };
            return aiAt.includes(i + 1)
              ? {
                  ...head,
                  type: "question" as const,
                  en: `Why do you like topic ${i + 1}?`,
                }
              : {
                  ...head,
                  type: "listening" as const,
                  kind: "text" as const,
                  script: `Some people visit place ${i + 1} on weekends.`,
                  prompt: `When do people visit place ${i + 1}?`,
                  options: ["on weekends", "at night"],
                  answerNo: 1,
                };
          }),
        },
      ],
    });
    const speakCtx = {
      file: levelTestFilePath("speaking", speakLevel),
      index,
      corpus: lessonCorpus("speaking", []),
    };
    expect(checkLevelTestFile(speaking(tail), speakCtx)).toEqual([]);
    expect(issueRules(checkLevelTestFile(speaking(tooMany), speakCtx))).toEqual(
      ["level-test-ai"],
    );
    expect(issueRules(checkLevelTestFile(speaking([1]), speakCtx))).toEqual([
      "level-test-ai",
    ]);
  });

  it("6.4 회화 평가 카드: 허용 답 둘 · 예 쪽만 있는 예 · 아니오 질문 · 장의 턴 수 어긋남을 거부한다", () => {
    const corpus = lessonCorpus("talk", talkUnitCards(ref, 1));
    const ctx = { file: levelTestFilePath("talk", 1), index, corpus };
    const base = talkLevelTest(ref);
    expect(checkLevelTestFile(base, ctx)).toEqual([]);
    const edit = (
      fn: (
        turns: { allowed: { text: string }[]; question: { en: string } }[],
      ) => void,
    ) => {
      const copy = structuredClone(base);
      const sheet =
        copy.forms[0] && "sheets" in copy.forms[0]
          ? copy.forms[0].sheets[0]
          : undefined;
      if (!sheet) throw new Error("장 없음");
      fn(sheet.turns);
      return issueRules(checkLevelTestFile(copy, ctx));
    };
    expect(
      edit((turns) => {
        const t = turns[0];
        if (t) t.allowed = t.allowed.slice(0, 2);
      }),
    ).toEqual(["talk-test-allowed"]);
    expect(
      edit((turns) => {
        const t = turns[0];
        if (t) {
          t.question = { ...t.question, en: "Do you like it?" };
          t.allowed = [
            { text: "Yes, I do." },
            { text: "Yes." },
            { text: "Yes, I like it." },
          ];
        }
      }),
    ).toEqual(["talk-test-allowed"]);
    expect(
      edit((turns) => {
        const t = turns[0];
        if (t) {
          t.question = { ...t.question, en: "Do you like it?" };
          t.allowed = [
            { text: "Yes, I do." },
            { text: "No, I don't." },
            { text: "Yes." },
          ];
        }
      }),
    ).toEqual([]);
    expect(
      edit((turns) => {
        turns.pop();
      }),
    ).toContain("talk-test-count");
  });

  it("6.4 배치 평가: 범위 밖 문항 번호와 읽기 · 쓰기 예비 문항 · 듣기가 아닌 예비 문항을 거부하고 빠진 문항은 완전성에서 실패한다", () => {
    const ctx = { file: placementFilePath("speaking"), index };
    const base = speakingPlacement(ref);
    expect(checkPlacementFile(base, ctx)).toEqual([]);
    const outOfRange = structuredClone(base);
    const item = outOfRange.levels[0]?.items[0];
    if (!item) throw new Error("배치 문항 없음");
    item.no = num("placement.items_per_level") + 1;
    expect(issueRules(checkPlacementFile(outOfRange, ctx))).toContain(
      "placement-count",
    );
    const repeatSpare = structuredClone(base);
    const level = repeatSpare.levels[0];
    if (!level) throw new Error("배치 단계 없음");
    level.spares = [
      {
        no: 1,
        revision: 1,
        correction: 0,
        type: "repeat",
        sentence: "This is a cat.",
      },
    ];
    expect(issueRules(checkPlacementFile(repeatSpare, ctx))).toEqual([
      "placement-count",
    ]);
    // 읽기 배치의 예비 문항
    const reading: PlacementFile = {
      area: "reading",
      form: 1,
      levels: [
        {
          level: 1,
          items: [],
          spares: [
            {
              no: 1,
              revision: 1,
              correction: 0,
              type: "fact",
              passage: "Momo has a cat.",
              prompt: "What does Momo have?",
              options: ["a cat", "a dog", "a hat", "a box"],
              answerNo: 1,
            },
          ],
        },
      ],
    };
    expect(
      issueRules(
        checkPlacementFile(reading, {
          file: placementFilePath("reading"),
          index,
        }),
      ),
    ).toEqual(["placement-count"]);
    // 빠진 문항은 완전성의 빈 칸
    const tree = mini();
    const speaking = tree.placements.find((p) => p.area === "speaking");
    const removed = speaking?.levels[5]?.items.pop();
    if (!speaking || !removed) throw new Error("배치 없음");
    const report = run(tree);
    expect(report.empty).toEqual([
      cellKey({
        type: "placement",
        area: "speaking",
        level: speaking.levels[5]?.level ?? 0,
        form: speaking.form,
        no: removed.no,
        spare: false,
      }),
    ]);
    expect(exitCodeOf(report)).toBe(1);
  });

  it("6.3 토리 이야기: 구간마다 번호가 겹치거나 1~6단계 구간에 한국어 뜻이 없으면 거부한다", () => {
    const ctx = { file: storyFilePath("1-3"), index };
    const base = storyFile(ref, "1-3");
    expect(checkStoryFile(base, ctx)).toEqual([]);
    const dup = structuredClone(base);
    const [first, second] = dup.stories;
    if (!first || !second) throw new Error("이야기 없음");
    second.no = first.no;
    expect(issueRules(checkStoryFile(dup, ctx))).toEqual(["story-count"]);
    const noKo = structuredClone(base);
    if (noKo.stories[0]) delete noKo.stories[0].textKo;
    expect(issueRules(checkStoryFile(noKo, ctx))).toEqual(["story-ko"]);
    // 7~9 구간은 한국어 뜻을 두지 않아도 된다.
    expect(
      checkStoryFile(storyFile(ref, "7-9"), {
        file: storyFilePath("7-9"),
        index,
      }),
    ).toEqual([]);
  });

  it("6.3 규격 파일 완전성: level_specs 48행 · unit_specs 240행과 알파벳 2행이 아니면 오류", () => {
    const tree = mini();
    tree.reference.levelSpecs.levelSpecs =
      tree.reference.levelSpecs.levelSpecs.filter(
        (s) => !(s.area === "talk" && s.level === 12),
      );
    const report = run(tree, "pr");
    expect(rules(report)).toEqual(["reference-complete"]);
    expect(report.summary.referenceErrors).toBe(1);
    expect(exitCodeOf(report)).toBe(1);
    const units = mini();
    units.reference.unitSpecs.unitSpecs =
      units.reference.unitSpecs.unitSpecs.filter(
        (u) => u.unit !== 0 || u.area !== "writing",
      );
    expect(rules(run(units, "pr"))).toContain("reference-complete");
  });
});

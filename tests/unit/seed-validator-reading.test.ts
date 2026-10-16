import { describe, expect, it } from "vitest";
import { checkLessonCell, type SeedIssue } from "@/core/seed/check-lesson";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import type { ReadingLesson } from "@/core/seed/schema/lesson";
import { lessonFilePath, READING_OPTIONS } from "@/core/seed/structure";
import { sentenceWords, splitSentences } from "@/core/seed/text";
import {
  defaultSettings,
  readingLesson,
  referenceSet,
  settingNumber,
  unitWordsOf,
} from "../fixtures/seed/builders";

const ref = referenceSet(defaultSettings());
const { index } = buildReferenceIndex(ref);
const num = (key: string) => settingNumber(ref.settings, key);
const UNIT = 1;

function check(lesson: ReadingLesson, level: number): SeedIssue[] {
  return checkLessonCell(lesson, {
    area: "reading",
    level,
    unit: UNIT,
    file: lessonFilePath("reading", level, UNIT),
    index,
  });
}
const errors = (issues: SeedIssue[]) =>
  issues.filter((i) => i.severity === "error");
const errorRules = (issues: SeedIssue[]) =>
  [...new Set(errors(issues).map((i) => i.rule))].sort();
const warningRules = (issues: SeedIssue[]) => [
  ...new Set(issues.filter((i) => i.severity === "warning").map((i) => i.rule)),
];

function lesson4(): ReadingLesson {
  return structuredClone(readingLesson(ref, 4).lesson);
}

/** 기능어만으로 된 채움 글(낱말 n 개). 'It is.'(2) · 'It is there.'(3)을 잇는다. */
function filler(n: number): string {
  const parts: string[] = [];
  let left = n;
  if (left % 2 === 1) {
    parts.push("It is there.");
    left -= 3;
  }
  for (; left > 0; left -= 2) parts.push("It is.");
  return parts.join(" ");
}

function spec4() {
  const spec = index.levelSpec("reading", 4);
  if (spec?.area !== "reading" || !spec.passage.words) {
    throw new Error("읽기 4단계 규격이 없다");
  }
  return { spec, words: spec.passage.words };
}

describe("칸 검사: 읽기 · 수업 공통", () => {
  it("AC-3a 읽기 4단계: 55~80단어 지문 · 사실 확인 4문제 수업은 통과한다", () => {
    const { spec, words } = spec4();
    const lesson = lesson4();
    const count = sentenceWords(lesson.content.passage);
    expect(count).toBeGreaterThanOrEqual(words.min);
    expect(count).toBeLessThanOrEqual(words.max);
    expect(lesson.content.questions).toHaveLength(spec.questions.total);
    expect(check(lesson, 4)).toEqual([]);
    expect(check(readingLesson(ref, 1).lesson, 1)).toEqual([]);
  });

  it("AC-3a 읽기 4단계: 54단어 · 81단어 지문을 거부한다", () => {
    const { words } = spec4();
    const base = lesson4();
    // 새 단어가 모두 든 앞 세 문장에 기능어 채움 글을 이어 낱말 수를 맞춘다.
    const core = splitSentences(base.content.passage).slice(0, 3).join(" ");
    const coreWords = sentenceWords(core);
    const withLength = (n: number) => {
      const lesson = structuredClone(base);
      lesson.content.passage = `${core} ${filler(n - coreWords)}`;
      expect(sentenceWords(lesson.content.passage)).toBe(n);
      // 줄인 지문에서 빠진 단원 단어는 단원 단어 목록에서도 뺀다.
      const text = [
        lesson.content.passage,
        ...lesson.content.questions.flatMap((q) => [q.prompt, ...q.options]),
      ].join(" ");
      lesson.unitWords = lesson.unitWords.filter((w) =>
        new RegExp(`\\b${w}\\b`).test(text),
      );
      return lesson;
    };
    for (const n of [words.min - 1, words.max + 1]) {
      const issues = check(withLength(n), 4);
      expect(errorRules(issues), `${n}단어`).toEqual(["amount"]);
      expect(errors(issues)[0]?.path).toBe("content.passage");
    }
    for (const n of [words.min, words.max]) {
      expect(errors(check(withLength(n), 4)), `${n}단어`).toEqual([]);
    }
  });

  it("AC-3a 어휘 범위 밖: 5% 는 통과하고 5% 를 넘으면 거부한다(새 단어 · 고유 명사는 빼고 센다)", () => {
    const ratio = num("seed.max_offband_ratio");
    const total = Math.round(1 / ratio);
    // 4단계에서 범위 밖인 단어 둘(12단계 단원 단어)
    const [off1, off2] = unitWordsOf(ref, "reading", 12, 1);
    if (!off1 || !off2) throw new Error("12단계 단원 단어가 없다");
    const withPassage = (
      head: string,
      headWords: number,
      edit?: (l: ReadingLesson) => void,
    ) => {
      const lesson = lesson4();
      lesson.content.passage = `${head} ${filler(total - headWords)}`;
      edit?.(lesson);
      return check(lesson, 4).filter((i) => i.rule === "offband");
    };
    // 1 / total = 상한 그대로 → 통과
    expect(withPassage(`Tori has a ${off1}.`, 4)).toEqual([]);
    // 2 / total → 거부
    expect(withPassage(`Tori has a ${off1} ${off2}.`, 5)).toHaveLength(1);
    // 고유 명사 표시를 지우면 Tori 도 범위 밖이 된다 → 거부
    expect(
      withPassage(`Tori has a ${off1}.`, 4, (l) => {
        l.content.glossary = l.content.glossary.map(
          ({ proper: _p, ...g }) => g,
        );
      }),
    ).toHaveLength(1);
    // 새 단어는 빼고 센다 → 통과
    expect(
      withPassage(`Tori has a ${off1} ${off2}.`, 5, (l) => {
        l.newWords = [...l.newWords, off2];
      }),
    ).toEqual([]);
  });

  it("AC-3a 글로서리: 기능어 밖 낱말이 글로서리에 없으면 거부한다", () => {
    const lesson = lesson4();
    const [removed] = lesson.content.glossary.filter((g) => !g.proper);
    if (!removed) throw new Error("글로서리 견본이 비었다");
    lesson.content.glossary = lesson.content.glossary.filter(
      (g) => g !== removed,
    );
    const issues = check(lesson, 4);
    expect(errorRules(issues)).toEqual(["glossary"]);
    expect(errors(issues)[0]?.message).toContain(removed.surface);
    // 기능어(the · is · has …)는 글로서리에 없어도 된다.
    expect(check(lesson4(), 4)).toEqual([]);
  });

  it("6.4 분량: 문항 수 · 유형별 수가 단계 규격과 다르면 거부한다", () => {
    const fewer = lesson4();
    fewer.content.questions.pop();
    expect(errorRules(check(fewer, 4))).toEqual(["amount"]);
    const otherType = lesson4();
    const first = otherType.content.questions[0];
    if (first?.kind !== "text") throw new Error("사실 확인 문항이 아니다");
    first.type = "inference";
    expect(errorRules(check(otherType, 4))).toEqual(["amount"]);
  });

  it("6.4 정답: 정답 번호가 보기 밖이면 거부한다", () => {
    const lesson = lesson4();
    const first = lesson.content.questions[0];
    if (!first) throw new Error("문항이 없다");
    first.answerNo = READING_OPTIONS + 1;
    const issues = check(lesson, 4);
    expect(errorRules(issues)).toEqual(["answer"]);
    expect(errors(issues)[0]?.path).toBe("content.questions.0.answerNo");
  });

  it("6.4 어휘 배정: 배정표의 새 단어가 수업 글에 없거나 새 단어 목록이 배정표와 다르면 거부한다", () => {
    const base = lesson4();
    const [first] = base.newWords;
    if (!first) throw new Error("새 단어가 없다");
    // 목록이 배정표와 다르다(새 단어 미리보기도 함께 바꿈)
    const other = unitWordsOf(ref, "reading", 4, UNIT).find(
      (w) => !base.newWords.includes(w),
    );
    if (!other) throw new Error("다른 단원 단어가 없다");
    const listed = structuredClone(base);
    listed.newWords = [other, ...listed.newWords.slice(1)];
    expect(errorRules(check(listed, 4))).toContain("vocab-allocation");
    // 새 단어가 수업 글(미리보기 밖)에 없다
    const absent = structuredClone(base);
    const pattern = new RegExp(`\\b${first}\\b`, "g");
    absent.content.passage = absent.content.passage.replace(pattern, other);
    absent.content.questions = absent.content.questions.map((q) => ({
      ...q,
      prompt: q.prompt.replace(pattern, other),
      options: q.options.map((o) => o.replace(pattern, other)),
    })) as ReadingLesson["content"]["questions"];
    const absentIssues = check(absent, 4).filter(
      (i) => i.rule === "vocab-allocation",
    );
    expect(absentIssues).toHaveLength(1);
    expect(absentIssues[0]?.message).toContain(first);
    // 다지기 수업은 새 단어가 비어야 한다
    const assigned = index.allocation("reading", 4, UNIT);
    if (!assigned?.ok) throw new Error("배정표가 없다");
    const reinforce = structuredClone(base);
    reinforce.kind = "reinforce";
    reinforce.lessonNo = assigned.assignedCount + 1;
    expect(errorRules(check(reinforce, 4))).toEqual(["vocab-allocation"]);
    reinforce.newWords = [];
    reinforce.preview = [];
    expect(check(reinforce, 4)).toEqual([]);
  });

  it("6.4 학습 요소 범위: 문장 길이 상한 + 1 과 범위 밖 형태(5단계 지문의 과거형)를 거부한다", () => {
    const spec = index.levelSpec("reading", 4);
    if (!spec) throw new Error("규격 없음");
    const long = lesson4();
    const extra =
      `Tori and Momo ${"are there ".repeat(spec.sentenceMaxWords).trim()}`
        .split(" ")
        .slice(0, spec.sentenceMaxWords + 1)
        .join(" ");
    long.content.passage = `${extra}. ${long.content.passage}`;
    const longIssues = check(long, 4).filter(
      (i) => i.rule === "learning-elements",
    );
    expect(longIssues).toHaveLength(1);
    // 상한 그대로는 통과
    const exact = lesson4();
    exact.content.passage = `${extra.split(" ").slice(0, -1).join(" ")}. ${exact.content.passage}`;
    expect(
      check(exact, 4).filter((i) => i.rule === "learning-elements"),
    ).toEqual([]);
    // 5단계 지문의 과거형(-ed, 6단계에 처음 나오는 형태)
    const at5 = lesson4();
    const rules5 = check(at5, 5).filter((i) => i.rule === "learning-elements");
    expect(rules5).toEqual([]);
    at5.content.passage = `Tori jumped there. ${at5.content.passage}`;
    const past = check(at5, 5).filter((i) => i.rule === "learning-elements");
    expect(past).toHaveLength(1);
    expect(past[0]?.message).toContain("past-ed");
    // 1단계의 red(색 + 명사)는 과거형이 아니다(견본 형태 표는 낱말 목록, P4b 검토 M-2).
    const red = structuredClone(readingLesson(ref, 1).lesson);
    red.content.passage = `${red.content.passage} I have a red hat.`;
    expect(
      checkLessonCell(red, {
        area: "reading",
        level: 1,
        unit: UNIT,
        file: lessonFilePath("reading", 1, UNIT),
        index,
      }).filter((i) => i.rule === "learning-elements"),
    ).toEqual([]);
  });

  it("6.4 금지 내용: 금지어 · 정규식 · 연락처 꼴에 걸린 글을 거부한다", () => {
    const [enWord] = ref.forbidden.words.en;
    const [koWord] = ref.forbidden.words.ko;
    if (!enWord || !koWord) throw new Error("금지어 견본이 비었다");
    const cases: ((l: ReadingLesson) => void)[] = [
      (l) => {
        l.content.passage += ` Do not ${enWord} it.`;
      },
      (l) => {
        l.content.passage += " Where do you live?";
      },
      (l) => {
        // 연락처 꼴은 실행 때 조각을 잇는다.
        l.content.passage += ` Call ${["010", "1234", "5678"].join("-")}.`;
      },
      (l) => {
        const q = l.content.questions[0];
        if (q) q.explanationKo = `${koWord}라고 하지 마요.`;
      },
    ];
    for (const edit of cases) {
      const lesson = lesson4();
      edit(lesson);
      expect(errorRules(check(lesson, 4))).toContain("forbidden");
    }
  });

  it("6.3 단원 단어 목록: 글에 없는 단원 단어를 적으면 오류, 글에 있는데 빠지면 경고", () => {
    const base = lesson4();
    const unused = unitWordsOf(ref, "reading", 4, UNIT).find(
      (w) => !base.unitWords.includes(w),
    );
    if (!unused) throw new Error("쓰지 않은 단원 단어가 없다");
    const extra = structuredClone(base);
    extra.unitWords = [...extra.unitWords, unused];
    expect(errorRules(check(extra, 4))).toEqual(["unit-words"]);
    // 단원 밖 단어를 적어도 오류
    const outside = structuredClone(base);
    outside.unitWords = [...outside.unitWords, "the"];
    expect(errorRules(check(outside, 4))).toEqual(["unit-words"]);
    // 글에 나오는데 빠진 단원 단어는 경고
    const missing = structuredClone(base);
    const dropped = missing.unitWords.find(
      (w) => !missing.newWords.includes(w),
    );
    missing.unitWords = missing.unitWords.filter((w) => w !== dropped);
    const issues = check(missing, 4);
    expect(errors(issues)).toEqual([]);
    expect(warningRules(issues)).toEqual(["unit-words-unlisted"]);
  });

  it("6.3 수업 번호: 종류와 수업 번호 · 변형이 단원 틀과 어긋나면 거부한다", () => {
    const frame = index.frame("reading", 4, UNIT);
    const allocation = index.allocation("reading", 4, UNIT);
    if (!frame || !allocation?.ok) throw new Error("단원 틀이 없다");
    const layoutOf = (edit: (l: ReadingLesson) => void) => {
      const lesson = lesson4();
      edit(lesson);
      return check(lesson, 4).filter((i) => i.rule === "layout");
    };
    expect(layoutOf(() => {})).toEqual([]);
    expect(
      layoutOf((l) => {
        l.lessonNo = allocation.assignedCount + 1;
      }),
    ).toHaveLength(1);
    expect(
      layoutOf((l) => {
        l.variant = frame.topicVariants + 1;
      }),
    ).toHaveLength(1);
    expect(
      layoutOf((l) => {
        l.kind = "alphabet";
      }),
    ).toHaveLength(1);
    expect(
      layoutOf((l) => {
        l.kind = "remedial";
        l.lessonNo = frame.remedialLessons + 1;
      }),
    ).toHaveLength(1);
    expect(
      layoutOf((l) => {
        l.kind = "reinforce";
        l.lessonNo = frame.regularLessons + 1;
      }),
    ).toHaveLength(1);
    // 규격 파일이 일부 깨지면 칸 검사는 예외 없이 한 건만 낸다(P4b 검토 M-1).
    const noRatio = structuredClone(ref);
    noRatio.settings.settings = noRatio.settings.settings.filter(
      (r) => r.key !== "seed.max_offband_ratio",
    );
    const brokenIndex = buildReferenceIndex(noRatio).index;
    expect(brokenIndex.ready).toBe(false);
    const notReady = checkLessonCell(lesson4(), {
      area: "reading",
      level: 4,
      unit: UNIT,
      file: lessonFilePath("reading", 4, UNIT),
      index: brokenIndex,
    });
    expect(notReady.map((i) => i.rule)).toEqual(["reference-not-ready"]);
    // 배정할 수 없는 틀이면 layout 오류만(배정표 [] 와의 비교 오류는 없다).
    const tooFew = structuredClone(ref);
    const row = tooFew.settings.settings.find(
      (r) => r.key === "unit.regular_lessons.4-6",
    );
    if (!row) throw new Error("설정값 없음");
    row.value = allocation.assignedCount - 1;
    const tooFewIndex = buildReferenceIndex(tooFew).index;
    expect(tooFewIndex.ready).toBe(true);
    const unallocated = checkLessonCell(lesson4(), {
      area: "reading",
      level: 4,
      unit: UNIT,
      file: lessonFilePath("reading", 4, UNIT),
      index: tooFewIndex,
    });
    expect(errorRules(unallocated)).toEqual(["layout"]);
    expect(errors(unallocated)).toHaveLength(1);
  });
});

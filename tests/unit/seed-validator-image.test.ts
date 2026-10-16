import { describe, expect, it } from "vitest";
import { checkLessonCell, type SeedIssue } from "@/core/seed/check-lesson";
import {
  buildReferenceIndex,
  type ReferenceIndex,
} from "@/core/seed/reference-index";
import type {
  ReadingLesson,
  SpeakingLesson,
  WritingLesson,
} from "@/core/seed/schema/lesson";
import { lessonFilePath } from "@/core/seed/structure";
import {
  defaultSettings,
  type ReferenceSet,
  readingLesson,
  referenceSet,
  speakingLesson,
  unitWordsOf,
  writingLesson,
} from "../fixtures/seed/builders";

const ref = referenceSet(defaultSettings());
const { index } = buildReferenceIndex(ref);
const UNIT = 1;

const errorRules = (issues: SeedIssue[]) =>
  [
    ...new Set(issues.filter((i) => i.severity === "error").map((i) => i.rule)),
  ].sort();

function checkReading(lesson: ReadingLesson, idx: ReferenceIndex = index) {
  return checkLessonCell(lesson, {
    area: "reading",
    level: 1,
    unit: UNIT,
    file: lessonFilePath("reading", 1, UNIT),
    index: idx,
  });
}

/** 그림이 없는 1단계 단원 단어(형용사). */
function wordWithoutImage(): string {
  const word = unitWordsOf(ref, "reading", 1, UNIT).find(
    (w) => ref.vocab.vocab.find((v) => v.word === w)?.imageKey === undefined,
  );
  if (!word) throw new Error("그림 없는 단어가 없다");
  return word;
}

function rulesOfReference(r: ReferenceSet): string[] {
  return [...new Set(buildReferenceIndex(r).issues.map((i) => i.rule))].sort();
}

describe("칸 검사: 그림", () => {
  it("AC-3b 읽기 1단계: 그림 보기 단어의 그림 키가 모두 카탈로그에 있으면 통과한다", () => {
    const lesson = readingLesson(ref, 1).lesson;
    const pictures = lesson.content.questions.filter(
      (q) => q.kind === "picture",
    );
    expect(pictures.length).toBe(lesson.content.questions.length);
    for (const q of pictures) {
      for (const word of q.options) {
        const key = index.vocab.get(word)?.imageKey;
        expect(key, word).toBeDefined();
        expect(index.images.has(key ?? ""), word).toBe(true);
      }
    }
    expect(checkReading(lesson)).toEqual([]);
  });

  it("AC-3b 읽기 1단계: 카탈로그에 없는 그림 키 · 그림 키가 없는 단어를 보기에 넣으면 거부한다", () => {
    // 그림 키가 없는 단어
    const noKey = structuredClone(readingLesson(ref, 1).lesson);
    const q0 = noKey.content.questions[0];
    if (!q0) throw new Error("문항 없음");
    const wrongIndex = q0.answerNo === 1 ? 1 : 0;
    q0.options[wrongIndex] = wordWithoutImage();
    const issues = checkReading(noKey).filter((i) => i.rule === "image");
    expect(issues).toHaveLength(1);
    expect(issues[0]?.path).toBe(`content.questions.0.options.${wrongIndex}`);
    // 카탈로그에 없는 그림 키(카탈로그에서 그 그림을 뺀 규격 파일)
    const lesson = readingLesson(ref, 1).lesson;
    const word = lesson.content.questions[0]?.options[0];
    const key = word ? index.vocab.get(word)?.imageKey : undefined;
    if (!key) throw new Error("그림 키 없음");
    const broken = structuredClone(ref);
    broken.images.images = broken.images.images.filter((i) => i.key !== key);
    const brokenIndex = buildReferenceIndex(broken).index;
    expect(
      checkReading(lesson, brokenIndex).filter((i) => i.rule === "image")
        .length,
    ).toBeGreaterThan(0);
    expect(errorRules(checkReading(lesson, brokenIndex))).toEqual(["image"]);
  });

  it("AC-3b 규격 파일: vocab 의 그림 키가 카탈로그에 없거나 카탈로그 단어가 vocab 에 없으면 오류", () => {
    expect(rulesOfReference(ref)).toEqual([]);
    const missing = structuredClone(ref);
    missing.images.images = missing.images.images.slice(1);
    expect(rulesOfReference(missing)).toEqual(["reference-image"]);
    const stray = structuredClone(ref);
    const first = stray.images.images[0];
    if (!first) throw new Error("그림 없음");
    stray.images.images.push({
      ...first,
      key: "not-a-word",
      file: "images/vocab/not-a-word.png",
      word: "notaword",
    });
    expect(rulesOfReference(stray)).toEqual(["reference-image"]);
    // 그림의 단어가 vocab 의 그 키 단어와 다르다
    const other = structuredClone(ref);
    const [a, b] = other.images.images;
    if (!a || !b) throw new Error("그림 없음");
    a.word = b.word;
    expect(rulesOfReference(other)).toEqual(["reference-image"]);
    // 그림 키가 겹친다
    const dup = structuredClone(ref);
    const head = dup.images.images[0];
    if (!head) throw new Error("그림 없음");
    dup.images.images.push({ ...head });
    expect(rulesOfReference(dup)).toEqual(["reference-image"]);
  });

  it("6.4 그림: 쓰기 그림 보고 고르기와 말하기 듣고 그림 고르기의 그림 키도 본다", () => {
    const writing = structuredClone(
      writingLesson(ref, 1).lesson,
    ) as WritingLesson;
    expect(
      checkLessonCell(writing, {
        area: "writing",
        level: 1,
        unit: UNIT,
        file: lessonFilePath("writing", 1, UNIT),
        index,
      }),
    ).toEqual([]);
    if (writing.content.shape !== "items")
      throw new Error("쓰기 1단계 모양이 아니다");
    const pick = writing.content.items.find((i) => i.type === "pick-word");
    if (pick?.type !== "pick-word") throw new Error("그림 고르기 문항이 없다");
    pick.picture = wordWithoutImage();
    const writingIssues = checkLessonCell(writing, {
      area: "writing",
      level: 1,
      unit: UNIT,
      file: lessonFilePath("writing", 1, UNIT),
      index,
    }).filter((i) => i.rule === "image");
    expect(writingIssues).toHaveLength(1);
    expect(writingIssues[0]?.path).toMatch(/^content\.items\.\d+\.picture$/);

    const speaking = structuredClone(
      speakingLesson(ref, 1).lesson,
    ) as SpeakingLesson;
    const ctx = {
      area: "speaking" as const,
      level: 1,
      unit: UNIT,
      file: lessonFilePath("speaking", 1, UNIT),
      index,
    };
    expect(checkLessonCell(speaking, ctx)).toEqual([]);
    const listening = speaking.content.listening[0];
    if (listening?.kind !== "picture")
      throw new Error("듣고 그림 고르기가 없다");
    const wrongIndex = listening.answerNo === 1 ? 1 : 0;
    listening.options[wrongIndex] = wordWithoutImage();
    const speakingIssues = checkLessonCell(speaking, ctx).filter(
      (i) => i.rule === "image",
    );
    expect(speakingIssues).toHaveLength(1);
    expect(speakingIssues[0]?.path).toBe(
      `content.listening.0.options.${wrongIndex}`,
    );
  });
});

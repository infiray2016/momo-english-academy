import { describe, expect, it } from "vitest";
import { checkLessonCell, type SeedIssue } from "@/core/seed/check-lesson";
import { buildReferenceIndex } from "@/core/seed/reference-index";
import {
  LessonFileSchema,
  type SpeakingLesson,
  SpeakingLessonSchema,
} from "@/core/seed/schema/lesson";
import type { SpeakingLevelSpec } from "@/core/seed/schema/reference";
import { lessonFilePath } from "@/core/seed/structure";
import {
  defaultSettings,
  referenceSet,
  speakingLesson,
} from "../fixtures/seed/builders";

const ref = referenceSet(defaultSettings());
const { index } = buildReferenceIndex(ref);
const UNIT = 1;

function check(lesson: SpeakingLesson, level: number): SeedIssue[] {
  return checkLessonCell(lesson, {
    area: "speaking",
    level,
    unit: UNIT,
    file: lessonFilePath("speaking", level, UNIT),
    index,
  });
}
const errorsOf = (issues: SeedIssue[], rule: string) =>
  issues.filter((i) => i.severity === "error" && i.rule === rule);

function specOf(level: number): SpeakingLevelSpec {
  const spec = index.levelSpec("speaking", level);
  if (spec?.area !== "speaking")
    throw new Error(`말하기 ${level}단계 규격 없음`);
  return spec;
}

function sample(level: 1 | 6 | 10): SpeakingLesson {
  return structuredClone(speakingLesson(ref, level).lesson);
}

describe("칸 검사: 말하기", () => {
  it("AC-5b 말하기 1단계: 따라 말하기 단어 5 · 문장 5, 듣기 3, 질문 답 4 수업은 통과한다", () => {
    const spec = specOf(1);
    const lesson = sample(1);
    expect(lesson.content.repeat.words).toHaveLength(spec.repeat.words);
    expect(lesson.content.repeat.sentences).toHaveLength(spec.repeat.sentences);
    expect(lesson.content.listening).toHaveLength(spec.listening.items);
    expect(lesson.content.questions).toHaveLength(spec.questions.count);
    expect(check(lesson, 1)).toEqual([]);
  });

  it("AC-5b 말하기 6단계: 문장 3, 듣기 3, 그림 보고 말하기 1 · 질문 답 4 수업은 통과한다", () => {
    const spec = specOf(6);
    const lesson = sample(6);
    expect(lesson.content.repeat.words).toHaveLength(spec.repeat.words);
    expect(lesson.content.repeat.sentences).toHaveLength(spec.repeat.sentences);
    expect(lesson.content.listening).toHaveLength(spec.listening.items);
    expect(lesson.content.pictureTask).toBeDefined();
    expect(lesson.content.questions).toHaveLength(spec.questions.count);
    expect(check(lesson, 6)).toEqual([]);
  });

  it("AC-5b 말하기 10단계: 따라 말하기 없음, 듣기 3, 발표와 예비 확인 질문 3 수업은 통과한다", () => {
    const spec = specOf(10);
    const lesson = sample(10);
    expect(lesson.content.repeat.sentences).toHaveLength(spec.repeat.sentences);
    expect(lesson.content.presentation?.fallbackQuestions).toHaveLength(
      spec.presentation?.confirmQuestions ?? -1,
    );
    expect(check(lesson, 10)).toEqual([]);
  });

  it("AC-5b 말하기 5~8단계: 대화 활동 칸이 든 수업을 거부한다", () => {
    const withDialogue = sample(6) as SpeakingLesson & {
      content: Record<string, unknown>;
    };
    withDialogue.content.dialogue = {
      turns: [{ tori: "How much is it?", child: "It is two dollars." }],
    };
    expect(SpeakingLessonSchema.safeParse(withDialogue).success).toBe(false);
    for (const level of [5, 6, 7, 8]) {
      const parsed = LessonFileSchema.safeParse({
        area: "speaking",
        level,
        unit: UNIT,
        lessons: [withDialogue],
      });
      expect(parsed.success, `${level}단계`).toBe(false);
    }
    // 규격 안의 칸만으로는 대화를 주고받을 자리가 없다.
    expect(Object.keys(sample(6).content).sort()).toEqual(
      ["listening", "pictureTask", "questions", "repeat"].sort(),
    );
  });

  it("AC-5g 그림 보고 말하기: 그림 2~3장과 장면 설명이 있으면 통과하고, 카탈로그 밖 그림 키와 장면 설명 없음을 거부한다", () => {
    const spec = specOf(6);
    const range = spec.pictureTask?.images;
    if (!range) throw new Error("그림 보고 말하기 규격 없음");
    expect(check(sample(6), 6)).toEqual([]);
    // 카탈로그 밖 그림 키
    const outside = sample(6);
    const task = outside.content.pictureTask;
    if (!task) throw new Error("그림 보고 말하기 없음");
    task.images[0] = "no-such-image";
    const imageIssues = errorsOf(check(outside, 6), "image");
    expect(imageIssues).toHaveLength(1);
    expect(imageIssues[0]?.path).toBe("content.pictureTask.images.0");
    // 장면 설명이 없거나 공백뿐이면 규격에서 걸린다.
    const noScene = sample(6) as unknown as {
      content: { pictureTask: Record<string, unknown> };
    };
    delete noScene.content.pictureTask.scene;
    expect(SpeakingLessonSchema.safeParse(noScene).success).toBe(false);
    const blankScene = sample(6);
    if (blankScene.content.pictureTask)
      blankScene.content.pictureTask.scene = "  ";
    expect(SpeakingLessonSchema.safeParse(blankScene).success).toBe(false);
    // 그림 수가 범위 밖
    const tooFew = sample(6);
    if (tooFew.content.pictureTask) {
      tooFew.content.pictureTask.images =
        tooFew.content.pictureTask.images.slice(0, range.min - 1);
    }
    expect(errorsOf(check(tooFew, 6), "speaking")).toHaveLength(1);
    // 그림 보고 말하기가 없는 단계(7단계)에 두면 거부
    const at7 = sample(6);
    expect(
      errorsOf(check(at7, 7), "speaking").some(
        (i) => i.path === "content.pictureTask",
      ),
    ).toBe(true);
  });

  it("AC-5h 말하기: 1단계 따라 말하기 문장 4 · 5단계 질문 답 4 수업을 거부한다", () => {
    const one = sample(1);
    one.content.repeat.sentences = one.content.repeat.sentences.slice(
      0,
      specOf(1).repeat.sentences - 1,
    );
    const oneIssues = errorsOf(check(one, 1), "speaking");
    expect(oneIssues).toHaveLength(1);
    expect(oneIssues[0]?.path).toBe("content.repeat.sentences");
    // 6단계 견본을 5단계 규격에 맞춘 뒤 질문만 하나 모자라게 둔다.
    const spec5 = specOf(5);
    const five = sample(6);
    const filler = five.content.repeat.sentences[0] ?? "";
    five.content.repeat.sentences = Array.from(
      { length: spec5.repeat.sentences },
      (_, i) => five.content.repeat.sentences[i] ?? filler,
    );
    delete five.content.pictureTask;
    const question = five.content.questions[0];
    if (!question) throw new Error("질문 없음");
    five.content.questions = Array.from(
      { length: spec5.questions.count - 1 },
      (_, i) => five.content.questions[i] ?? question,
    );
    const fiveIssues = errorsOf(check(five, 5), "speaking");
    expect(fiveIssues.map((i) => i.path)).toEqual(["content.questions"]);
    // 질문 수를 맞추면 통과
    five.content.questions.push(question);
    expect(errorsOf(check(five, 5), "speaking")).toEqual([]);
  });

  it("AC-5h 말하기: 허용 답이 둘인 1~2단계 질문과 한국어 뜻이 없는 1~4단계 질문을 거부한다", () => {
    const spec = specOf(1);
    const fewAccepted = sample(1);
    const q = fewAccepted.content.questions[0];
    if (!q?.accepted) throw new Error("허용 답 없음");
    q.accepted = q.accepted.slice(0, spec.questions.acceptedMin - 1);
    const acceptedIssues = errorsOf(check(fewAccepted, 1), "speaking");
    expect(acceptedIssues.map((i) => i.path)).toEqual([
      "content.questions.0.accepted",
    ]);
    const noKo = sample(1);
    const q2 = noKo.content.questions[1];
    if (!q2) throw new Error("질문 없음");
    delete q2.ko;
    const koIssues = errorsOf(check(noKo, 1), "speaking");
    expect(koIssues.map((i) => i.path)).toEqual(["content.questions.1.ko"]);
    // 바른 답이 없는 1~3단계 질문도 거부한다.
    const noModel = sample(1);
    const q3 = noModel.content.questions[2];
    if (!q3) throw new Error("질문 없음");
    delete q3.modelAnswer;
    expect(errorsOf(check(noModel, 1), "speaking").map((i) => i.path)).toEqual([
      "content.questions.2.modelAnswer",
    ]);
  });

  it("AC-5h 말하기: 예비 확인 질문이 둘인 9~12단계 수업을 거부한다", () => {
    const spec = specOf(10);
    const confirm = spec.presentation?.confirmQuestions;
    if (confirm === undefined) throw new Error("발표 규격 없음");
    const lesson = sample(10);
    if (!lesson.content.presentation) throw new Error("발표 없음");
    lesson.content.presentation.fallbackQuestions =
      lesson.content.presentation.fallbackQuestions.slice(0, confirm - 1);
    const issues = errorsOf(check(lesson, 10), "speaking");
    expect(issues.map((i) => i.path)).toEqual([
      "content.presentation.fallbackQuestions",
    ]);
    // 발표가 없는 10단계 수업도 거부한다.
    const none = sample(10);
    delete none.content.presentation;
    expect(errorsOf(check(none, 10), "speaking").map((i) => i.path)).toEqual([
      "content.presentation",
    ]);
  });
});

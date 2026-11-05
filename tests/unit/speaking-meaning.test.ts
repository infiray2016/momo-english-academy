// 말하기 질문 답의 의미 검사(델타 spec 설계 8, plan '말하기 질문 판정의 증명' 의미 검증 몫, C182 (1)).
// 낱말 품사 표는 저장소 seed/vocab.json, 동음이의어는 seed/lists/homophones.json(검증기와 같은 자료)이다.
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SpeakingLessonSchema } from "@/core/seed/schema/lesson";
import { judgeSpeakingQuestion, questionTextsOf } from "@/core/speaking/judge";
import {
  checkMeaning,
  type MeaningWord,
  meaningFrame,
  meaningWordsFor,
} from "@/core/speaking/meaning";
import { bestMatchRate } from "@/core/speech/match-rate";
import { TEST_SETTINGS } from "../fixtures/settings";

const SEED = resolve(__dirname, "../../seed");
const words: MeaningWord[] = JSON.parse(
  readFileSync(join(SEED, "vocab.json"), "utf8"),
).vocab;
const homophones: string[][] = JSON.parse(
  readFileSync(join(SEED, "lists/homophones.json"), "utf8"),
).groups;
const judge = (question: string, modelAnswer: string, answer: string) =>
  checkMeaning({ question, modelAnswer, answer, words, homophones });

const MILK_Q = "Do Dan and Tess drink juice?";
const MILK_A = "No, they drink milk.";

describe("말하기 질문 의미 검사(설계 8)", () => {
  it("AC-22k 질문 · 바른 답에서 바로잡은 정보와 틀린 정보를 뽑는다(누가 자리는 빠진다)", () => {
    expect(
      meaningFrame({
        question: MILK_Q,
        modelAnswer: MILK_A,
        words,
        homophones,
      }),
    ).toEqual({
      direction: "no",
      answerCore: ["drink", "milk"],
      corrected: ["milk"],
      wrong: ["juice"],
    });
    expect(
      meaningFrame({
        question: "Do Dan and Tess wash the cups?",
        modelAnswer: "Yes, they wash the cups.",
        words,
        homophones,
      }).wrong,
    ).toEqual([]);
  });

  it("AC-22k 부정 예문은 일치율과 상관없이 맞음이 아니다(방향 · 핵심 정보 · 부정 · 틀린 정보)", () => {
    expect(judge(MILK_Q, MILK_A, "Yes, they drink milk.")).toBe("direction");
    expect(judge(MILK_Q, MILK_A, "They drink juice.")).toBe("key");
    expect(judge(MILK_Q, MILK_A, "No, they drink juice.")).toBe("key");
    expect(judge(MILK_Q, MILK_A, "They do not drink milk.")).toBe("negated");
    expect(judge(MILK_Q, MILK_A, "They drink milk and juice.")).toBe(
      "wrong_info",
    );
    // 일치율만이면 문턱(0.8)을 넘는 글(증명 절, 2026-10-30 잰 값).
    const opts = { homophones, nameSlot: "any-word" as const };
    const q1 = "Do Dan and Tess eat rice?";
    expect(
      bestMatchRate(["They eat pizza."], "Yes, they eat pizza.", opts),
    ).toBe(1);
    expect(judge(q1, "No, they eat pizza.", "Yes, they eat pizza.")).toBe(
      "direction",
    );
    const q3 = "Do Dan and Tess go home?";
    const a3 = "No, they go to the lake.";
    expect(judge(q3, a3, "Yes, they go to the lake.")).toBe("direction");
    expect(
      bestMatchRate(
        ["No, they go to the lake."],
        "No, they go to the park.",
        opts,
      ),
    ).toBeGreaterThanOrEqual(0.8);
    expect(judge(q3, a3, "No, they go to the park.")).toBe("key");
    const q4 = "Do Dan and Tess wash the cups?";
    const a4 = "Yes, they wash the cups.";
    expect(judge(q4, a4, "No, they wash the cups.")).toBe("direction");
    expect(judge(q4, a4, "Yes, they wash the bike.")).toBe("key");
    expect(judge(q4, a4, "Yes, they do not wash it.")).toBe("negated");
  });

  it("AC-22k 긍정 예문: not 으로 틀린 정보를 지우는 답 · do · it 으로 받는 예 답 · 방향 낱말 없는 답 · 축약은 맞음이다", () => {
    expect(judge(MILK_Q, MILK_A, "They drink milk, not juice.")).toBe("ok");
    expect(
      judge(MILK_Q, MILK_A, "They don't drink juice, they drink milk."),
    ).toBe("ok");
    expect(judge(MILK_Q, MILK_A, "Dan and Tess drink milk.")).toBe("ok");
    const q4 = "Do Dan and Tess wash the cups?";
    const a4 = "Yes, they wash the cups.";
    expect(judge(q4, a4, "Yes, they do.")).toBe("ok");
    expect(judge(q4, a4, "Yes, they wash it.")).toBe("ok");
    expect(judge(q4, a4, "Yes, they wash them.")).toBe("ok");
    // 기본형과 forms 는 같은 낱말이다.
    expect(judge(MILK_Q, MILK_A, "No, she drinks milk.")).toBe("ok");
  });

  it("AC-22k 다섯째 갈래: 답의 핵심 낱말 가운데 질문 · 바른 답 어디에도 없는 낱말이 not 범위 밖에 있으면 wrong_info 다(이름은 질문에 있어 통과, C187)", () => {
    const q = "Do Ted and Max wash the cups?";
    const a = "Yes, they wash the cups.";
    expect(judge(q, a, "Yes, they do wash the dog.")).toBe("wrong_info");
    expect(judge(q, a, "Yes, they do. They wash the dog.")).toBe("wrong_info");
    expect(judge(MILK_Q, MILK_A, "No, they drink milk and cake.")).toBe(
      "wrong_info",
    );
    expect(judge(q, a, "Ted and Max wash the cups.")).toBe("ok");
    expect(judge(MILK_Q, MILK_A, "They drink milk, not cake.")).toBe("ok");
  });

  it("AC-22k 품사 표 계약: meaningWordsFor 는 수업 글 낱말 행에 function · pronoun 행 전부를 더하고, 좁힌 표의 판정은 전체 어휘와 같다", () => {
    const lessonTexts = [
      MILK_Q,
      MILK_A,
      "They drink milk.",
      "Dan and Tess drink milk.",
    ];
    const narrow = meaningWordsFor(lessonTexts, words);
    expect(narrow.length).toBeLessThan(words.length);
    expect(narrow.map((w) => w.word)).toEqual(
      expect.arrayContaining(["drink", "milk", "juice", "she", "we", "not"]),
    );
    const answers = [
      "They don't drink juice, she drinks milk.",
      "Not juice. We drink milk.",
      "They drink milk, not juice.",
      "Yes, they drink milk.",
      "They do not drink milk.",
      "They drink milk and juice.",
      "No, they drink milk and cake.",
      "Dan and Tess drink milk.",
    ];
    for (const answer of answers) {
      const full = judge(MILK_Q, MILK_A, answer);
      const small = checkMeaning({
        question: MILK_Q,
        modelAnswer: MILK_A,
        answer,
        words: narrow,
        homophones,
      });
      expect(small, answer).toBe(full);
    }
    expect(
      judge(MILK_Q, MILK_A, "They don't drink juice, she drinks milk."),
    ).toBe("ok");
    expect(judge(MILK_Q, MILK_A, "Not juice. We drink milk.")).toBe("ok");
  });

  it("AC-22k 정규 시드 셋 말하기 수업(가르치는 수업)의 바른 답 · 허용 답 전부가 그 문항의 의미 검사를 통과한다(시드 파일을 읽어 생성 수업도 함께 돈다)", () => {
    const dir = join(SEED, "lessons/speaking");
    let checked = 0;
    const files = new Set<string>();
    for (const level of readdirSync(dir)) {
      for (const file of readdirSync(join(dir, level))) {
        const data = JSON.parse(readFileSync(join(dir, level, file), "utf8"));
        for (const raw of data.lessons) {
          if (raw.teach === undefined) continue;
          const lesson = SpeakingLessonSchema.parse(raw);
          const items = [
            ...(lesson.teach?.together ?? []).map((t, i) => ({
              at: `${level}/${file} together.${i}`,
              ...t,
            })),
            ...lesson.content.questions.flatMap((q, i) => [
              { at: `${level}/${file} questions.${i}`, ...q },
              ...(q.spare
                ? [{ at: `${level}/${file} questions.${i}.spare`, ...q.spare }]
                : []),
            ]),
          ];
          for (const item of items) {
            if (item.modelAnswer === undefined) continue;
            for (const answer of [
              item.modelAnswer,
              ...(item.accepted ?? []),
              ...(item.acceptedMeaning ?? []),
            ]) {
              expect(
                judge(item.en, item.modelAnswer, answer),
                `${item.at}: ${answer}`,
              ).toBe("ok");
              checked++;
              files.add(`${level}/${file}`);
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
    // 3단계 단원 1 말하기 파일이 셈에 들었다(M2).
    expect([...files]).toContain("3/1.json");
  });

  it("AC-22k 정규 시드 셋 말하기 수업의 accepted 는 판정 함수에서 accepted 쪽 맞음(표현 수행)이고 acceptedMeaning 은 acceptedMeaning 쪽 맞음(의사소통 정답)이다(수업 글로 좁힌 품사 표, 묶음 다)", () => {
    const pass = TEST_SETTINGS["speaking.answer_match_pass"].value;
    const dir = join(SEED, "lessons/speaking");
    let checked = 0;
    for (const level of readdirSync(dir)) {
      for (const file of readdirSync(join(dir, level))) {
        const data = JSON.parse(readFileSync(join(dir, level, file), "utf8"));
        for (const raw of data.lessons) {
          if (raw.teach === undefined) continue;
          const lesson = SpeakingLessonSchema.parse(raw);
          const ctx = {
            pass,
            homophones,
            words: meaningWordsFor(questionTextsOf(lesson), words, homophones),
          };
          const items = [
            ...(lesson.teach?.together ?? []),
            ...lesson.content.questions.flatMap((q) =>
              q.spare ? [q, q.spare] : [q],
            ),
          ];
          for (const item of items) {
            if ((item.accepted ?? []).length === 0) continue;
            for (const answer of item.accepted ?? []) {
              expect(
                judgeSpeakingQuestion(item, answer, ctx),
                `${level}/${file} ${item.en}: ${answer}`,
              ).toEqual({
                meaning: "ok",
                bundle: "accepted",
                final: "correct",
                by: "app",
                expressionDone: true,
              });
              checked++;
            }
            for (const answer of item.acceptedMeaning ?? []) {
              expect(
                judgeSpeakingQuestion(item, answer, ctx),
                `${level}/${file} ${item.en}: ${answer}`,
              ).toEqual({
                meaning: "ok",
                bundle: "meaning",
                final: "correct",
                by: "app",
                communicative: true,
                expressionDone: false,
              });
              checked++;
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

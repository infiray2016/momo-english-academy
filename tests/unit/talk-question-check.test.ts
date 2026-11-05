// 회화 수업 질문 검사(3.3 '1~3단계 AI 질문 검사' · '같은 질문 되풀이 막기' · '1~3단계 소리 줄', 6.4, 회화 plan 정한 것 19 · 이름 절 3 · 4번 칸).
// 숫자(같은 질문 상한)는 시험용 설정에서 읽는다.
import { describe, expect, it } from "vitest";
import {
  checkChoices,
  checkLowLevelQuestion,
  checkSoundLine,
  type LowLevelLineOptions,
  questionKeyOf,
  questionsOfText,
  sameQuestionHit,
  turnQuestionOf,
} from "@/core/conversation/question-check";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
const SAME_MAX = values["talk.same_question_max"] as number;
const MAX_WORDS = 6;

const lemmas: Record<string, string> = {
  plays: "play",
  played: "play",
  likes: "like",
  dogs: "dog",
};
const options: LowLevelLineOptions = {
  sentenceMaxWords: MAX_WORDS,
  allowedWords: new Set([
    "what",
    "do",
    "you",
    "on",
    "i",
    "like",
    "is",
    "it",
    "a",
    "the",
    "and",
    "or",
    "can",
    "yes",
    "no",
    "with",
    "me",
    "your",
  ]),
  unitWords: ["play", "soccer", "weekend", "sunday"],
  childWords: ["dinosaur"],
  teacherName: "Mina",
  lemmaOf: (w) => lemmas[w.toLowerCase()],
  forms: [{ id: "past", patterns: ["\\bplayed\\b"], words: [] }],
  allowedForms: new Set(),
};

describe("질문 글 꼴", () => {
  it("AC-15r 같은 질문은 대소문자 · 문장 부호 · 줄임꼴을 지운 글로 견준다", () => {
    expect(questionKeyOf("What is it?")).toBe(questionKeyOf("what's it ?"));
    expect(questionKeyOf("What do you do on Sunday?")).toBe(
      questionKeyOf("WHAT do you do, on sunday"),
    );
  });

  it("AC-15r 화면 글에서 물음표 문장만 뽑고 마무리 물음은 뺀다", () => {
    expect(
      questionsOfText(
        "Great! You play soccer. Do you like it? Do you want to talk more?",
      ),
    ).toEqual(["Do you like it?"]);
    expect(questionsOfText("Nice!")).toEqual([]);
  });
});

describe("그 차례의 질문(I-4)", () => {
  it("AC-15r AI 차례 · 대화 첫 질문은 마지막 물음표 문장만이고 반응의 물음은 뺀다", () => {
    expect(turnQuestionOf("Really? Wow! What sport is fun?", "ai")).toBe(
      "What sport is fun?",
    );
    expect(turnQuestionOf("Great! What is it? I like it.", "ai")).toBe(
      "What is it?",
    );
    expect(turnQuestionOf("Nice!", "first_question")).toBeNull();
  });

  it("AC-15r 카드 자리 · 마무리 자리는 끝 줄(붙인 질문)이 질문일 때만이다", () => {
    expect(
      turnQuestionOf("Really? Okay! What sport is fun?", "card_slot"),
    ).toBe("What sport is fun?");
    expect(
      turnQuestionOf(
        "Really? That's okay! Let's say it together.",
        "card_slot",
      ),
    ).toBeNull();
    expect(
      turnQuestionOf("Really? Do you want to talk more?", "closing_slot"),
    ).toBeNull();
    expect(turnQuestionOf("Really? Great!", null)).toBe("Really?");
  });
});

describe("같은 질문 되풀이 막기", () => {
  const asked = new Map([[questionKeyOf("What is it?"), SAME_MAX]]);

  it("AC-15r 막힌 바로 뒤에는 막힌 질문과 같은 질문을 쓰지 않는다", () => {
    expect(
      sameQuestionHit({
        question: "What do you do on Sunday?",
        blocked: [questionKeyOf("what do you do on sunday")],
        asked: new Map(),
        max: SAME_MAX,
      }),
    ).toBe("after_stuck");
  });

  it("AC-15r 한 대화에서 글이 같은 질문은 상한까지만이다(세 번째는 걸림)", () => {
    expect(
      sameQuestionHit({
        question: "What is it?",
        blocked: [],
        asked,
        max: SAME_MAX,
      }),
    ).toBe("max");
    expect(
      sameQuestionHit({
        question: "What is it?",
        blocked: [],
        asked: new Map([[questionKeyOf("What is it?"), SAME_MAX - 1]]),
        max: SAME_MAX,
      }),
    ).toBeNull();
  });

  it("AC-15r 앱 고정 대사 'Do you want to talk more?' 는 세지 않는다", () => {
    const key = questionKeyOf("Do you want to talk more?");
    expect(
      sameQuestionHit({
        question: "Do you want to talk more?",
        blocked: [key],
        asked: new Map([[key, SAME_MAX]]),
        max: SAME_MAX,
      }),
    ).toBeNull();
  });
});

describe("1~3단계 AI 질문 검사", () => {
  it("AC-15b 범위 안 질문은 지난다(단원 단어 · 아이가 말한 낱말 · {NAME} · 선생님 이름 · 원형)", () => {
    expect(
      checkLowLevelQuestion("What do you do on Sunday?", {
        ...options,
        targets: ["play"],
      }),
    ).toEqual({ ok: true });
    expect(
      checkLowLevelQuestion("Do you like a dinosaur, {NAME}?", {
        ...options,
        targets: [],
      }),
    ).toEqual({ ok: true });
    expect(
      checkLowLevelQuestion("Is it Mina's dog?", {
        ...options,
        allowedWords: new Set([...options.allowedWords, "dog"]),
        targets: [],
      }),
    ).toEqual({ ok: true });
  });

  it("AC-15i 어휘 범위 밖 낱말이 든 질문은 걸린다", () => {
    expect(
      checkLowLevelQuestion("Do you like basketball?", {
        ...options,
        targets: [],
      }),
    ).toEqual({ ok: false, reason: "offband" });
  });

  it("AC-15b 문장 길이 상한을 넘으면 걸린다", () => {
    expect(
      checkLowLevelQuestion("What do you do on Sunday with me?", {
        ...options,
        targets: [],
      }),
    ).toEqual({ ok: false, reason: "too_long" });
  });

  it("AC-15b 노리는 단원 단어(원형 포함)를 질문에 넣으면 걸린다(A4-03)", () => {
    expect(
      checkLowLevelQuestion("Do you play soccer?", {
        ...options,
        targets: ["soccer"],
      }),
    ).toEqual({ ok: false, reason: "target_word" });
    expect(
      checkLowLevelQuestion("Is it a plays?", {
        ...options,
        targets: ["play"],
      }),
    ).toEqual({ ok: false, reason: "target_word" });
  });

  it("AC-15b 범위 밖 형태는 걸린다", () => {
    expect(
      checkLowLevelQuestion("Do you played?", { ...options, targets: [] }),
    ).toEqual({ ok: false, reason: "form" });
  });
});

describe("1~3단계 소리 줄 검사", () => {
  it("AC-15b 따라 할 말은 비지 않고 길이 · 어휘 · 형태 범위 안이어야 한다", () => {
    expect(checkSoundLine("I play soccer.", options)).toEqual({ ok: true });
    expect(checkSoundLine("  ", options)).toEqual({
      ok: false,
      reason: "empty",
    });
    expect(checkSoundLine("I play basketball.", options)).toEqual({
      ok: false,
      reason: "offband",
    });
    expect(checkSoundLine("I played soccer.", options)).toEqual({
      ok: false,
      reason: "form",
    });
  });

  it("AC-15b 선택지 둘은 같은 꼴에 낱말 하나만 다르고 하나는 노리는 단어다", () => {
    expect(
      checkChoices(["I play soccer.", "I like soccer."], {
        ...options,
        targets: ["play"],
      }),
    ).toEqual({ ok: true });
    expect(
      checkChoices(["I play soccer.", "I like it a soccer."], {
        ...options,
        targets: ["play"],
      }),
    ).toEqual({ ok: false, reason: "shape" });
    expect(
      checkChoices(["I like it.", "I like me."], {
        ...options,
        targets: ["play"],
      }),
    ).toEqual({ ok: false, reason: "no_target" });
    expect(
      checkChoices(["I play soccer.", "I play basketball."], {
        ...options,
        targets: ["play"],
      }),
    ).toEqual({ ok: false, reason: "offband" });
  });
});

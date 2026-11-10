// 회화 수업 질문 검사(3.3 '1~3단계 AI 질문 검사' · '같은 질문 되풀이 막기' · '1~3단계 소리 줄', 6.4, 회화 plan 정한 것 19 · 이름 절 3 · 4번 칸).
// 숫자(같은 질문 상한)는 시험용 설정에서 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkChoices,
  checkLowLevelQuestion,
  checkSoundLine,
  childSameSoundWordsOf,
  type LowLevelLineOptions,
  questionKeyOf,
  questionsOfText,
  sameQuestionHit,
  turnQuestionOf,
} from "@/core/conversation/question-check";
import { HomophonesFileSchema } from "@/core/seed/schema/reference";
import { testSettingValues } from "../fixtures/settings";

const values = testSettingValues();
/** 동음이의어 묶음은 시드 목록 그대로(서버 seedHomophones 와 같은 파일). */
const HOMOPHONES = HomophonesFileSchema.parse(
  JSON.parse(
    readFileSync(join(process.cwd(), "seed/lists/homophones.json"), "utf8"),
  ),
).groups;
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
    ).toEqual({ ok: false, reason: "offband", words: ["basketball"] });
  });

  it("13절 C203 (2) 범위 밖이 닫힌 품사 한 낱말(too · also · now …)뿐이면 통과하고, 다른 범위 밖 낱말과 함께면 둘 다 걸린 낱말로 낸다", () => {
    expect(
      checkLowLevelQuestion("Do you like soccer too?", {
        ...options,
        targets: [],
      }),
    ).toEqual({ ok: true });
    expect(
      checkLowLevelQuestion("Do you like basketball too?", {
        ...options,
        targets: [],
      }),
    ).toEqual({ ok: false, reason: "offband", words: ["basketball", "too"] });
    // 닫힌 품사 낱말이라도 둘이면 걸린다
    expect(
      checkLowLevelQuestion("Do you play there too?", {
        ...options,
        targets: [],
      }),
    ).toEqual({ ok: false, reason: "offband", words: ["there", "too"] });
  });

  it("13절 C203 (1) 아이가 이 대화에서 말한 낱말은 노리는 단어라도 되묻기 질문에 쓸 수 있다(원형으로도)", () => {
    expect(
      checkLowLevelQuestion("Do you play soccer?", {
        ...options,
        childWords: ["soccer"],
        targets: ["soccer"],
      }),
    ).toEqual({ ok: true });
    expect(
      checkLowLevelQuestion("Do you play soccer?", {
        ...options,
        childWords: ["played"],
        targets: ["play"],
      }),
    ).toEqual({ ok: true });
    // 말하지 않은 노리는 단어는 그대로 걸린다
    expect(
      checkLowLevelQuestion("Do you play soccer?", {
        ...options,
        childWords: ["soccer"],
        targets: ["soccer", "play"],
      }),
    ).toEqual({ ok: false, reason: "target_word", words: ["play"] });
  });

  it("13절 'C203 (1) · C217 보완 3' (2) 아이가 한두 낱말 말로 한 낱말의 같은 소리 낱말도 되묻기에 쓸 수 있다: 'See' 한 낱말 뒤의 sea 질문은 노리는 단어 걸림이 아니다", () => {
    const sea: LowLevelLineOptions = {
      ...options,
      allowedWords: new Set([...options.allowedWords, "have", "two", "fish"]),
      unitWords: ["sea", "see", "two", "high", "know"],
      homophones: HOMOPHONES,
    };
    const saidAs = (childLines: string[]) => ({
      ...sea,
      childLines,
      childWords: childLines.flatMap(
        (line) => line.toLowerCase().match(/[a-z]+/g) ?? [],
      ),
    });
    // 아이가 sea 라고 했는데 인식 글이 See 로 온 뒤: 'Do you like the sea?' 는 아이가 먼저 말한 낱말을 되묻는 질문이다
    expect(
      checkLowLevelQuestion("Do you like the sea?", {
        ...saidAs(["Fish.", "See"]),
        targets: ["sea"],
      }),
    ).toEqual({ ok: true });
    expect(
      checkLowLevelQuestion("Do you like the sea?", {
        ...saidAs(["See See"]),
        targets: ["sea"],
      }),
    ).toEqual({ ok: true });
    // 거꾸로도 같다(Sea 로 적힌 한 낱말 말 뒤의 see 질문)
    expect(
      checkLowLevelQuestion("What do you see?", {
        ...saidAs(["Sea."]),
        targets: ["see"],
      }),
    ).toEqual({ ok: true });
    // 문장으로 한 말의 낱말은 넓히지 않는다: 'I can see' 는 sea 를 말한 근거가 아니다(고치기 전처럼 걸린다)
    expect(
      checkLowLevelQuestion("Do you like the sea?", {
        ...saidAs(["I can see"]),
        targets: ["sea"],
      }),
    ).toEqual({ ok: false, reason: "target_word", words: ["sea"] });
    expect(
      checkLowLevelQuestion("Do you like the sea?", {
        ...saidAs(["I see a fish."]),
        targets: ["sea"],
      }),
    ).toEqual({ ok: false, reason: "target_word", words: ["sea"] });
    // 묶음이나 아이 말 줄을 주지 않으면 고치기 전 그대로 걸린다(4단계부터 · 옛 시험 · 소리 줄 검사)
    expect(
      checkLowLevelQuestion("Do you like the sea?", {
        ...saidAs(["See"]),
        homophones: [],
        targets: ["sea"],
      }),
    ).toEqual({ ok: false, reason: "target_word", words: ["sea"] });
    expect(
      checkLowLevelQuestion("Do you like the sea?", {
        ...sea,
        childWords: ["see"],
        targets: ["sea"],
      }),
    ).toEqual({ ok: false, reason: "target_word", words: ["sea"] });
    // 선생님이 먼저 말하는 단원 단어는 계속 막는다(아이가 그 낱말도, 같은 소리 낱말도 말한 적이 없다)
    expect(
      checkLowLevelQuestion("Do you like the sea?", {
        ...saidAs(["Yes.", "I like fish."]),
        targets: ["sea"],
      }),
    ).toEqual({ ok: false, reason: "target_word", words: ["sea"] });
    // 'I go to school.' 은 two 를 말한 것이 아니다(문장 말)
    expect(
      checkLowLevelQuestion("Do you have two fish?", {
        ...saidAs(["I go to school."]),
        targets: ["two"],
      }),
    ).toEqual({ ok: false, reason: "target_word", words: ["two"] });
    // 한두 낱말 말이어도 기능어 · 인사 · 맞장구 말은 넓히지 않는다('Me too.' 는 two 를, 'Hi!' 는 high 를, 'No.' 는 know 를 말한 것이 아니다)
    expect(
      checkLowLevelQuestion("Do you have two fish?", {
        ...saidAs(["Me too.", "To"]),
        targets: ["two"],
      }),
    ).toEqual({ ok: false, reason: "target_word", words: ["two"] });
    expect(
      checkLowLevelQuestion("Is it high?", {
        ...saidAs(["Hi!"]),
        allowedWords: new Set([...sea.allowedWords, "is", "it"]),
        targets: ["high"],
      }),
    ).toEqual({ ok: false, reason: "target_word", words: ["high"] });
    expect(
      checkLowLevelQuestion("Do you know it?", {
        ...saidAs(["No."]),
        targets: ["know"],
      }),
    ).toEqual({ ok: false, reason: "target_word", words: ["know"] });
  });

  it("13절 'C203 (1) · C217 보완 3' (2) 같은 소리 낱말은 한두 낱말 말에서만 내고, 노리는 단어 걸림만 풀며 어휘 범위는 넓히지 않는다(범위 밖 낱말은 그대로 걸린다)", () => {
    expect(
      childSameSoundWordsOf(["See", "Meet you", "To", "I can see"], HOMOPHONES),
    ).toEqual(["sea", "meat"]);
    // 세 낱말부터는 내지 않는다(들은 글 귀띔이 같은 소리 귀띔을 한두 낱말 말에만 내는 것과 같은 기준)
    expect(childSameSoundWordsOf(["I can see"], HOMOPHONES)).toEqual([]);
    expect(childSameSoundWordsOf(["See"], [])).toEqual([]);
    // meat 은 단원 단어도 단계 범위 낱말도 아니다 — 아이가 Meet 이라고 했어도 범위 밖이다
    expect(
      checkLowLevelQuestion("Do you like meat?", {
        ...options,
        homophones: HOMOPHONES,
        childWords: ["meet"],
        childLines: ["Meet"],
        targets: [],
      }),
    ).toEqual({ ok: false, reason: "offband", words: ["meat"] });
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
    ).toEqual({ ok: false, reason: "target_word", words: ["soccer"] });
    expect(
      checkLowLevelQuestion("Is it a plays?", {
        ...options,
        targets: ["play"],
      }),
    ).toEqual({ ok: false, reason: "target_word", words: ["play"] });
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

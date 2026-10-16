// AC-4b · AC-5d · 6.2 정규화 · 6.4 출력 검사 · 걸린 칸 바꾸기(plan-p09b 증명 표).
// 숫자는 TEST_SETTINGS · structure.ts 상수 · P4a level_specs 견본에서 읽는다.
import { describe, expect, it } from "vitest";
import {
  firstSentence,
  prepareAnswer,
  SAFE_LINE_KO,
} from "@/core/ai/calls/common";
import {
  speakingAnswerSpec,
  speakingConfirmSpec,
  speakingPresentationSpec,
} from "@/core/ai/calls/speaking";
import { thinkoutSpec } from "@/core/ai/calls/thinkout";
import { writingCheckSpec, writingFeedbackSpec } from "@/core/ai/calls/writing";
import { checkOutputFields } from "@/core/ai/output-check";
import {
  AI_SCORE,
  SPEAKING_GRAMMAR_NOTE_MAX,
  THINKOUT_OPTIONS,
  THINKOUT_STARTERS,
  THINKOUT_WORDS,
  WRITING_CHECK_DISTRACTORS,
  WRITING_CHECK_FIX_MAX,
} from "@/core/seed/structure";
import {
  SPEAKING_CONFIRM_SAMPLE,
  speakingAnswerSample,
  speakingPresentationSample,
  thinkoutSample,
  WRITING_CHECK_SAMPLE,
  writingFeedbackSample,
} from "../fixtures/ai/sample-inputs";
import { defaultSettings, referenceSet } from "../fixtures/seed/builders";
import { TEST_SETTINGS, testSettingValues } from "../fixtures/settings";

const ref = referenceSet(defaultSettings());
const forbidden = ref.forbidden;

function levelSpec(area: string, level: number) {
  const spec = ref.levelSpecs.levelSpecs.find(
    (s) => s.area === area && s.level === level,
  );
  if (!spec) throw new Error(`견본에 없는 단계 규격 ${area} ${level}`);
  return spec;
}

describe("6.4 출력 검사", () => {
  it("6.4 출력 검사: 금지어 · 개인 정보 질문 패턴(영어 · 한국어) · 연락처 꼴에 걸린 칸을 찾는다", () => {
    const max = levelSpec("writing", 6).sentenceMaxWords;
    const hits = checkOutputFields(
      [
        { path: "praise", lang: "ko", text: "잘했어요. 바보 같지 않아요." },
        { path: "modelAnswer", lang: "en", text: "You are stupid." },
        { path: "question.en", lang: "en", text: "Where do you live?" },
        { path: "question.ko", lang: "ko", text: "어디 살아요? 알려 줘요." },
        { path: "contact", lang: "ko", text: "010-1234-5678 로 연락해요." },
        { path: "email", lang: "en", text: "Write to a@b.com now." },
        { path: "clean", lang: "en", text: "I like apples." },
        { path: "cleanKo", lang: "ko", text: "사과를 좋아해요." },
      ],
      { forbidden, sentenceMaxWords: max },
    );
    expect([...hits.keys()].sort()).toEqual(
      [
        "contact",
        "email",
        "modelAnswer",
        "praise",
        "question.en",
        "question.ko",
      ].sort(),
    );
    expect(hits.get("praise")).toEqual([{ kind: "forbidden", match: "바보" }]);
    expect(hits.get("question.en")?.[0]).toMatchObject({
      kind: "forbidden",
      category: "personal-info",
    });
    expect(hits.get("contact")?.[0]).toMatchObject({
      kind: "forbidden",
      category: "contact",
    });
  });

  it("6.4 출력 검사: 영어 칸의 문장이 단계의 문장 길이 상한을 넘으면 걸린다", () => {
    const max = levelSpec("writing", 6).sentenceMaxWords;
    const words = (n: number) =>
      `${Array.from({ length: n }, () => "cat").join(" ")}.`;
    const hits = checkOutputFields(
      [
        { path: "ok", lang: "en", text: `${words(max)} ${words(2)}` },
        { path: "long", lang: "en", text: `${words(2)} ${words(max + 1)}` },
        // 한국어 칸은 길이를 보지 않는다
        { path: "ko", lang: "ko", text: "가 ".repeat(max * 3) },
      ],
      { forbidden, sentenceMaxWords: max },
    );
    expect([...hits.keys()]).toEqual(["long"]);
    expect(hits.get("long")).toEqual([
      { kind: "too-long", words: max + 1, max },
    ]);
  });
});

// ── 쓰기 ─────────────────────────────────────────────────────────

const settings = testSettingValues();

function fix(sentenceIndex: number, n: number) {
  return {
    sentenceIndex,
    original: `wrong ${n}`,
    corrected: `right ${n}`,
    distractors: [`bad ${n}a`, `bad ${n}b`, `bad ${n}c`],
    reason: `이유 ${n} 예요. 둘째 문장이에요.`,
  };
}

function checkAnswer(overrides: Record<string, unknown> = {}) {
  return {
    praise: "주어와 동사를 잘 썼어요.\n둘째 줄이에요.",
    sentences: WRITING_CHECK_SAMPLE.sentences.map((_, index) => ({
      index,
      correct: index !== 1,
    })),
    fixes: [fix(1, 1)],
    ...overrides,
  };
}

function correction(n: number) {
  return {
    original: `wrong ${n}`,
    corrected: `right ${n}`,
    reason: `이유 ${n}`,
  };
}

function feedbackAnswer(overrides: Record<string, unknown> = {}) {
  return {
    praise: "생각을 차례대로 썼어요. 마지막 문장이 재미있어요.",
    corrections: [correction(1)],
    modelAnswer: "I like summer. I swim with my friends.",
    rubric: { task: 3, grammar: 2, vocabulary: 3 },
    ...overrides,
  };
}

function maxCorrectionsOf(level: number): number {
  const table = TEST_SETTINGS["writing.max_corrections"].value as Record<
    string,
    number
  >;
  const value = table[String(level)];
  if (value === undefined) throw new Error(`단계 ${level} 교정 상한 없음`);
  return value;
}

describe("쓰기 정규화", () => {
  it("AC-4b 쓰기 확인 정규화는 고칠 곳 2개인 응답에서 1개만 남긴다", () => {
    const input = WRITING_CHECK_SAMPLE;
    const rules = writingCheckSpec.rulesOf(settings, input);
    const answer = checkAnswer({ fixes: [fix(1, 1), fix(2, 2)] });
    // 엄격 규격은 2개를 받지 않는다
    expect(
      writingCheckSpec.wireSchema(input, rules).safeParse(answer).success,
    ).toBe(false);
    const value = writingCheckSpec.normalize(answer, input, rules);
    expect(value?.fixes).toHaveLength(WRITING_CHECK_FIX_MAX);
    expect(value?.fixes[0]?.original).toBe("wrong 1");
    // 보기는 앞에서 최대 2개, 이유는 첫 문장, 칭찬은 첫 줄
    expect(value?.fixes[0]?.distractors).toHaveLength(
      WRITING_CHECK_DISTRACTORS.max,
    );
    expect(value?.fixes[0]?.reason).toBe("이유 1 예요.");
    expect(value?.praise).toBe("주어와 동사를 잘 썼어요.");
    // 문장 판정은 그대로
    expect(value?.sentences.map((s) => s.correct)).toEqual(
      input.sentences.map((_, i) => i !== 1),
    );
    // 보기가 없는 고칠 곳은 버리고, 범위 밖 번호의 고칠 곳도 버린다
    const noDistractor = writingCheckSpec.normalize(
      checkAnswer({
        fixes: [
          { ...fix(0, 3), distractors: [] },
          fix(input.sentences.length, 4),
          fix(2, 5),
        ],
      }),
      input,
      rules,
    );
    expect(noDistractor?.fixes.map((f) => f.original)).toEqual(["wrong 5"]);
  });

  it("AC-4b 첨삭 정규화는 6단계에서 교정 3개를 2개로, 10단계에서 4개를 3개로 줄인다(writing.max_corrections 단계 사전에서 읽음)", () => {
    for (const [level, given] of [
      [6, 3],
      [10, 4],
    ] as const) {
      const input = writingFeedbackSample(level);
      const rules = writingFeedbackSpec.rulesOf(settings, input);
      const max = maxCorrectionsOf(level);
      expect(rules.maxCorrections).toBe(max);
      const answer = feedbackAnswer({
        corrections: Array.from({ length: given }, (_, i) => correction(i)),
      });
      expect(
        writingFeedbackSpec.wireSchema(input, rules).safeParse(answer).success,
      ).toBe(false);
      const value = writingFeedbackSpec.normalize(answer, input, rules);
      expect(value?.corrections.map((c) => c.original)).toEqual(
        Array.from({ length: max }, (_, i) => `wrong ${i}`),
      );
      // 칭찬은 자르지 않는다(목업 B_Writing3 의 칭찬이 두 문장)
      expect(value?.praise).toBe(feedbackAnswer().praise);
    }
    // 그 단계 값이 없으면 설정 문제
    expect(() =>
      writingFeedbackSpec.rulesOf(
        { ...settings, "writing.max_corrections": { "6": 2 } },
        writingFeedbackSample(10),
      ),
    ).toThrow();
  });

  it("AC-4b 첨삭 정규화는 범위 밖 채점표 점수(0 · 5 · 2.6)를 1~4 로 자른다", () => {
    const input = writingFeedbackSample(6);
    const rules = writingFeedbackSpec.rulesOf(settings, input);
    const answer = feedbackAnswer({
      rubric: { task: 0, grammar: 5, vocabulary: 2.6 },
    });
    expect(
      writingFeedbackSpec.wireSchema(input, rules).safeParse(answer).success,
    ).toBe(false);
    const value = writingFeedbackSpec.normalize(answer, input, rules);
    expect(value?.rubric).toEqual({
      task: AI_SCORE.min,
      grammar: AI_SCORE.max,
      vocabulary: 3,
    });
  });

  it("6.2 쓰기 확인: 문장 판정이 모자라면 규격 실패(null)", () => {
    const input = WRITING_CHECK_SAMPLE;
    const rules = writingCheckSpec.rulesOf(settings, input);
    const short = checkAnswer({
      sentences: [{ index: 0, correct: true }],
    });
    expect(writingCheckSpec.validate(short as never, input, rules)).not.toEqual(
      [],
    );
    expect(writingCheckSpec.normalize(short, input, rules)).toBeNull();
    // 넘치는 판정 · 같은 번호는 버리고 차례대로
    const extra = checkAnswer({
      sentences: [
        ...input.sentences
          .map((_, index) => ({ index, correct: true }))
          .reverse(),
        { index: 0, correct: false },
        { index: input.sentences.length, correct: false },
      ],
    });
    expect(writingCheckSpec.normalize(extra, input, rules)?.sentences).toEqual(
      input.sentences.map((_, index) => ({ index, correct: true })),
    );
    // 맞는 응답은 검증을 통과한다
    const good = writingCheckSpec.normalize(checkAnswer(), input, rules);
    expect(good && writingCheckSpec.validate(good, input, rules)).toEqual([]);
  });
});

// ── 말하기 ───────────────────────────────────────────────────────

function speakingAnswer(overrides: Record<string, unknown> = {}) {
  return {
    judgement: "partial",
    feedback: "사과와 바나나를 말했어요. 잘했어요.",
    correctSentence: "I like apples and bananas.",
    grammarNotes: [
      "a 다음에 모음으로 시작하는 낱말이 오면 an 을 써요.\n둘째 줄",
      "복수는 s 를 붙여요.",
    ],
    ...overrides,
  };
}

function presentationAnswer(overrides: Record<string, unknown> = {}) {
  return {
    contentScore: 3,
    grammarScore: 2,
    feedback: "좋아하는 까닭을 말했어요. 더 말해 봐요.",
    confirmQuestions: ["What do you eat in summer?"],
    ...overrides,
  };
}

describe("말하기 정규화", () => {
  it("AC-5d 말하기 평가 정규화는 3단계 응답에서 문법 지적을 지우고 바른 답 문장을 남긴다", () => {
    const input = speakingAnswerSample(3);
    expect(input.grammarNoteMax).toBe(0);
    const rules = speakingAnswerSpec.rulesOf(settings, input);
    const answer = speakingAnswer();
    expect(
      speakingAnswerSpec.wireSchema(input, rules).safeParse(answer).success,
    ).toBe(false);
    const value = speakingAnswerSpec.normalize(answer, input, rules);
    expect(value).toEqual({
      judgement: "partial",
      feedback: "사과와 바나나를 말했어요.",
      correctSentence: "I like apples and bananas.",
      grammarNotes: [],
    });
  });

  it("AC-5d 4단계는 문법 지적을 1개까지 남긴다", () => {
    const input = speakingAnswerSample(4);
    expect(input.grammarNoteMax).toBe(SPEAKING_GRAMMAR_NOTE_MAX);
    const rules = speakingAnswerSpec.rulesOf(settings, input);
    const value = speakingAnswerSpec.normalize(speakingAnswer(), input, rules);
    expect(value?.grammarNotes).toEqual([
      "a 다음에 모음으로 시작하는 낱말이 오면 an 을 써요.",
    ]);
    expect(value?.correctSentence).toBe("I like apples and bananas.");
  });

  it("6.2 말하기 발표: 확인 질문은 단계 규격 수만큼, 모자라거나 걸리면 같은 차례 예비 질문", () => {
    const input = speakingPresentationSample(9);
    const count = input.confirmQuestionCount;
    const rules = speakingPresentationSpec.rulesOf(settings, input);
    // 모자라면 같은 차례의 예비 질문
    const short = speakingPresentationSpec.normalize(
      presentationAnswer(),
      input,
      rules,
    );
    expect(short?.confirmQuestions).toEqual([
      "What do you eat in summer?",
      ...input.spareConfirmQuestions.slice(1, count),
    ]);
    // 넘치면 앞에서 N 개
    const many = Array.from({ length: count + 2 }, (_, i) => `Question ${i}?`);
    expect(
      speakingPresentationSpec.normalize(
        presentationAnswer({ confirmQuestions: many }),
        input,
        rules,
      )?.confirmQuestions,
    ).toEqual(many.slice(0, count));
    // 걸린 질문은 같은 차례 예비 질문으로
    const value = speakingPresentationSpec.normalize(
      presentationAnswer({ confirmQuestions: many }),
      input,
      rules,
    );
    if (!value) throw new Error("정규화 실패");
    const hits = checkOutputFields(
      speakingPresentationSpec.checkFields({
        ...value,
        confirmQuestions: [
          "Where do you live?",
          ...value.confirmQuestions.slice(1),
        ],
      }),
      { forbidden, sentenceMaxWords: input.sentenceMaxWords },
    );
    const checked = speakingPresentationSpec.applyChecks(
      {
        ...value,
        confirmQuestions: [
          "Where do you live?",
          ...value.confirmQuestions.slice(1),
        ],
      },
      hits,
      input,
    );
    expect(checked.changed).toBe(true);
    expect(checked.value.confirmQuestions[0]).toBe(
      input.spareConfirmQuestions[0],
    );
    expect(checked.value.confirmQuestions).toHaveLength(count);
  });

  it("6.2 단계 평가 발표에는 확인 질문이 없다", () => {
    const input = speakingPresentationSample(10, {
      withConfirmQuestions: false,
    });
    const rules = speakingPresentationSpec.rulesOf(settings, input);
    const value = speakingPresentationSpec.normalize(
      presentationAnswer({ confirmQuestions: ["Why?", "What?", "Who?"] }),
      input,
      rules,
    );
    expect(value?.confirmQuestions).toEqual([]);
    expect(
      speakingPresentationSpec
        .messages(input, rules)
        .map((m) => m.content)
        .join("\n"),
    ).toContain("no confirm questions");
  });

  it("6.2 다듬기: 열거값 대소문자 · 앞뒤 공백을 고친다", () => {
    const input = speakingAnswerSample(4);
    const rules = speakingAnswerSpec.rulesOf(settings, input);
    const raw = speakingAnswer({
      judgement: "  Correct ",
      feedback: "  잘했어요.  ",
      grammarNotes: [],
    });
    expect(
      speakingAnswerSpec.wireSchema(input, rules).safeParse(raw).success,
    ).toBe(false);
    const prepared = prepareAnswer(raw, speakingAnswerSpec.enumPaths);
    expect(prepared).toMatchObject({
      judgement: "correct",
      feedback: "잘했어요.",
    });
    expect(
      speakingAnswerSpec.wireSchema(input, rules).safeParse(prepared).success,
    ).toBe(true);
    // 열거값 밖은 정규화도 받지 않는다
    expect(
      speakingAnswerSpec.normalize(
        prepareAnswer(
          speakingAnswer({ judgement: "great" }),
          speakingAnswerSpec.enumPaths,
        ),
        input,
        rules,
      ),
    ).toBeNull();
  });

  it("6.1 필수 칸이 없으면 정규화가 null 을 낸다", () => {
    const drop = (obj: Record<string, unknown>, key: string) => {
      const { [key]: _gone, ...rest } = obj;
      return rest;
    };
    const check = WRITING_CHECK_SAMPLE;
    expect(
      writingCheckSpec.normalize(drop(checkAnswer(), "praise"), check, {}),
    ).toBeNull();
    const feedback = writingFeedbackSample(6);
    const feedbackRules = writingFeedbackSpec.rulesOf(settings, feedback);
    expect(
      writingFeedbackSpec.normalize(
        feedbackAnswer({ rubric: { task: 3, grammar: 3 } }),
        feedback,
        feedbackRules,
      ),
    ).toBeNull();
    const answerInput = speakingAnswerSample(4);
    expect(
      speakingAnswerSpec.normalize(
        drop(speakingAnswer(), "judgement"),
        answerInput,
        speakingAnswerSpec.rulesOf(settings, answerInput),
      ),
    ).toBeNull();
    const confirm = SPEAKING_CONFIRM_SAMPLE;
    expect(
      speakingConfirmSpec.normalize(
        drop(presentationAnswer(), "grammarScore"),
        confirm,
        speakingConfirmSpec.rulesOf(settings, confirm),
      ),
    ).toBeNull();
    expect(
      speakingConfirmSpec.normalize("not json object", confirm, {}),
    ).toBeNull();
  });

  it("6.4 걸린 칸 바꾸기: 칭찬 · 피드백은 안전한 대사, 고칠 곳 · 교정 · 문법 지적은 버림, 모범 답안은 빈 글, 바른 답은 시드 바른 답", () => {
    const options = (sentenceMaxWords: number) => ({
      forbidden,
      sentenceMaxWords,
    });
    // 쓰기 확인: 칭찬 → 안전한 대사, 걸린 고칠 곳은 버림, 문장 판정은 그대로
    const check = WRITING_CHECK_SAMPLE;
    const checkValue = writingCheckSpec.normalize(
      checkAnswer({
        praise: "바보 같은 실수가 없어요.",
        fixes: [{ ...fix(1, 1), corrected: "He likes stupid bananas." }],
      }),
      check,
      {},
    );
    if (!checkValue) throw new Error("정규화 실패");
    const checkResult = writingCheckSpec.applyChecks(
      checkValue,
      checkOutputFields(
        writingCheckSpec.checkFields(checkValue),
        options(check.sentenceMaxWords),
      ),
      check,
    );
    expect(checkResult).toMatchObject({ changed: true, fatal: false });
    expect(checkResult.value.praise).toBe(SAFE_LINE_KO);
    expect(checkResult.value.fixes).toEqual([]);
    expect(checkResult.value.sentences).toEqual(checkValue.sentences);

    // 첨삭: 칭찬 → 안전한 대사, 걸린 교정은 버림, 모범 답안 → 빈 글, 채점표 그대로
    const feedback = writingFeedbackSample(6);
    const feedbackRules = writingFeedbackSpec.rulesOf(settings, feedback);
    const longSentence = `${Array.from(
      { length: feedback.sentenceMaxWords + 1 },
      () => "very",
    ).join(" ")} fun.`;
    const feedbackValue = writingFeedbackSpec.normalize(
      feedbackAnswer({
        praise: "어디 살아요? 알려 줘요.",
        corrections: [
          correction(1),
          { ...correction(2), corrected: "kill it" },
        ],
        modelAnswer: longSentence,
      }),
      feedback,
      feedbackRules,
    );
    if (!feedbackValue) throw new Error("정규화 실패");
    const feedbackResult = writingFeedbackSpec.applyChecks(
      feedbackValue,
      checkOutputFields(
        writingFeedbackSpec.checkFields(feedbackValue),
        options(feedback.sentenceMaxWords),
      ),
      feedback,
    );
    expect(feedbackResult.value).toEqual({
      praise: SAFE_LINE_KO,
      corrections: [correction(1)],
      modelAnswer: "",
      rubric: feedbackValue.rubric,
    });

    // 말하기: 피드백 → 안전한 대사, 바른 답 → 시드 바른 답(없으면 빈 글), 걸린 문법 지적은 버림
    for (const level of [3, 4] as const) {
      const input = speakingAnswerSample(level);
      const rules = speakingAnswerSpec.rulesOf(settings, input);
      const value = speakingAnswerSpec.normalize(
        speakingAnswer({
          feedback: "바보예요.",
          correctSentence: "Where do you live?",
          grammarNotes: ["죽어 라는 말은 쓰지 않아요."],
        }),
        input,
        rules,
      );
      if (!value) throw new Error("정규화 실패");
      const result = speakingAnswerSpec.applyChecks(
        value,
        checkOutputFields(
          speakingAnswerSpec.checkFields(value),
          options(input.sentenceMaxWords),
        ),
        input,
      );
      expect(result.value).toEqual({
        judgement: value.judgement,
        feedback: SAFE_LINE_KO,
        correctSentence: input.seedCorrectAnswer ?? "",
        grammarNotes: [],
      });
    }
    // 걸린 칸이 없으면 그대로
    const clean = speakingAnswerSpec.normalize(
      speakingAnswer(),
      speakingAnswerSample(4),
      {},
    );
    if (!clean) throw new Error("정규화 실패");
    expect(
      speakingAnswerSpec.applyChecks(clean, new Map(), speakingAnswerSample(4)),
    ).toEqual({ value: clean, changed: false, fatal: false });
  });
});

// ── 생각 꺼내기 ──────────────────────────────────────────────────

const MAX_TURNS = TEST_SETTINGS["writing.thinkout_max_turns"].value;

function thinkoutAnswer(overrides: Record<string, unknown> = {}) {
  return {
    question: "누구와 함께 갔어요?",
    options: ["가족", "친구", "혼자", "강아지"],
    done: false,
    summary: "",
    words: [],
    starters: [],
    ...overrides,
  };
}

function doneAnswer(overrides: Record<string, unknown> = {}) {
  return thinkoutAnswer({
    question: "",
    options: [],
    done: true,
    summary: "지난 주말에 가족과 바다에 가서 수영했어요.",
    words: ["Beach", "swim", "spaceship", "sand", "fun", "hot", "went"],
    starters: ["Last weekend I ___.", "It was ___.", "I felt ___."],
    ...overrides,
  });
}

describe("생각 꺼내기 정규화", () => {
  it("6.2 생각 꺼내기: 보기 3개 · 단어는 새 단어 먼저 · 범위 밖 낱말 뺌 · 최대 6개 · 틀 2개 · 마지막 턴은 끝냄", () => {
    const first = thinkoutSample(1);
    const firstRules = thinkoutSpec.rulesOf(settings, first);
    expect(firstRules.maxTurns).toBe(MAX_TURNS);
    expect(firstRules.lastTurn).toBe(false);
    const asking = thinkoutSpec.normalize(thinkoutAnswer(), first, firstRules);
    expect(asking?.options).toHaveLength(THINKOUT_OPTIONS);
    expect(asking?.done).toBe(false);
    expect(asking && thinkoutSpec.validate(asking, first, firstRules)).toEqual(
      [],
    );

    const done = thinkoutSpec.normalize(doneAnswer(), first, firstRules);
    // 새 단어 전부(시드 차례) → 응답 단어 가운데 범위 안 · 겹치지 않는 것, 최대 6개
    expect(done?.words).toEqual([
      "yesterday",
      "went",
      "beach",
      "swim",
      "sand",
      "fun",
    ]);
    expect(done?.words).toHaveLength(THINKOUT_WORDS.max);
    expect(done?.words).not.toContain("spaceship");
    expect(done?.starters).toHaveLength(THINKOUT_STARTERS);
    expect(done && thinkoutSpec.validate(done, first, firstRules)).toEqual([]);

    // 마지막 턴은 모델이 done 을 거짓으로 내도 끝낸다
    const last = thinkoutSample(MAX_TURNS);
    const lastRules = thinkoutSpec.rulesOf(settings, last);
    expect(lastRules.lastTurn).toBe(true);
    const forced = thinkoutSpec.normalize(
      doneAnswer({ done: false }),
      last,
      lastRules,
    );
    expect(forced?.done).toBe(true);
    // 끝낸 턴인데 요약이 비면 null
    expect(
      thinkoutSpec.normalize(doneAnswer({ summary: "" }), last, lastRules),
    ).toBeNull();
    // 묻는 턴인데 질문이 비면 null
    expect(
      thinkoutSpec.normalize(
        thinkoutAnswer({ question: "" }),
        first,
        firstRules,
      ),
    ).toBeNull();
    // 기록 글은 칸 차례가 고정된 JSON
    expect(asking && thinkoutSpec.historyEntry?.(asking)).toBe(
      JSON.stringify({
        question: asking?.question,
        options: asking?.options,
        done: false,
        summary: "",
        words: [],
        starters: [],
      }),
    );
  });

  it("6.4 걸린 칸 바꾸기: 생각 꺼내기 질문이 걸리면 그 턴 실패", () => {
    const input = thinkoutSample(1);
    const rules = thinkoutSpec.rulesOf(settings, input);
    const value = thinkoutSpec.normalize(
      thinkoutAnswer({
        question: "어디 살아요? 주소 알려 줘요.",
        options: ["바보", "공원", "바다"],
      }),
      input,
      rules,
    );
    if (!value) throw new Error("정규화 실패");
    const hits = checkOutputFields(thinkoutSpec.checkFields(value), {
      forbidden,
      sentenceMaxWords: input.sentenceMaxWords,
    });
    const result = thinkoutSpec.applyChecks(value, hits, input);
    expect(result).toMatchObject({ changed: true, fatal: true });

    // 질문이 아닌 칸이 걸리면 실패가 아니고 그 항목만 뺀다(보기 · 단어 · 틀은 버림, 요약은 빈 글)
    const optionOnly = thinkoutSpec.normalize(
      thinkoutAnswer({ options: ["바보", "공원", "바다"] }),
      input,
      rules,
    );
    if (!optionOnly) throw new Error("정규화 실패");
    const optionResult = thinkoutSpec.applyChecks(
      optionOnly,
      checkOutputFields(thinkoutSpec.checkFields(optionOnly), {
        forbidden,
        sentenceMaxWords: input.sentenceMaxWords,
      }),
      input,
    );
    expect(optionResult).toMatchObject({ changed: true, fatal: false });
    expect(optionResult.value.options).toEqual(["공원", "바다"]);

    const doneValue = thinkoutSpec.normalize(
      doneAnswer({
        summary: "바보 같은 날이었어요.",
        starters: ["I want to kill time.", "It was ___."],
      }),
      input,
      rules,
    );
    if (!doneValue) throw new Error("정규화 실패");
    const doneResult = thinkoutSpec.applyChecks(
      doneValue,
      checkOutputFields(thinkoutSpec.checkFields(doneValue), {
        forbidden,
        sentenceMaxWords: input.sentenceMaxWords,
      }),
      input,
    );
    expect(doneResult).toMatchObject({ changed: true, fatal: false });
    expect(doneResult.value.summary).toBe("");
    expect(doneResult.value.starters).toEqual(["It was ___."]);
  });
});

// ── fix 1(검토 rev-p09b) ─────────────────────────────────────────

describe("검토 고침", () => {
  it("6.4 한 문장: 따옴표 속 영어 인용이 있어도 한국어 문장까지 남긴다", () => {
    expect(firstSentence("'I like apples.' 라고 또박또박 잘 말했어요.")).toBe(
      "'I like apples.' 라고 또박또박 잘 말했어요.",
    );
    expect(
      firstSentence(
        '"I go to school." 처럼 완전한 문장으로 말했어요. 둘째예요.',
      ),
    ).toBe('"I go to school." 처럼 완전한 문장으로 말했어요.');
    expect(firstSentence("I like dogs. 라고 말했어요.")).toBe(
      "I like dogs. 라고 말했어요.",
    );
    // 한글이 없으면 첫 조각
    expect(firstSentence("Good job. Keep going.")).toBe("Good job.");
    // 말하기 피드백 · 쓰기 이유
    const answerInput = speakingAnswerSample(4);
    const spoken = speakingAnswerSpec.normalize(
      speakingAnswer({
        feedback: "'I like apples.' 라고 또박또박 잘 말했어요.",
      }),
      answerInput,
      {},
    );
    expect(spoken?.feedback).toBe(
      "'I like apples.' 라고 또박또박 잘 말했어요.",
    );
    const written = writingCheckSpec.normalize(
      checkAnswer({
        fixes: [
          {
            ...fix(1, 1),
            reason:
              '"I go to school." 처럼 완전한 문장으로 말했어요. 둘째예요.',
          },
        ],
      }),
      WRITING_CHECK_SAMPLE,
      {},
    );
    expect(written?.fixes[0]?.reason).toBe(
      '"I go to school." 처럼 완전한 문장으로 말했어요.',
    );
  });

  it("6.2 생각 꺼내기: 마지막 턴에 done 거짓 · 요약 빈 응답은 검증에 걸린다", () => {
    const last = thinkoutSample(MAX_TURNS);
    const rules = thinkoutSpec.rulesOf(settings, last);
    // 모델이 마지막 턴 말을 무시하고 질문을 낸 응답(엄격 규격은 지난다)
    const answer = thinkoutAnswer({ options: ["가족", "친구", "혼자"] });
    const wire = thinkoutSpec.wireSchema(last, rules).safeParse(answer);
    expect(wire.success).toBe(true);
    if (!wire.success) return;
    expect(thinkoutSpec.validate(wire.data, last, rules)).not.toEqual([]);
    // 마지막 턴이 아니면 묻는 응답은 검증을 지난다
    const first = thinkoutSample(1);
    expect(
      thinkoutSpec.validate(
        wire.data,
        first,
        thinkoutSpec.rulesOf(settings, first),
      ),
    ).toEqual([]);
  });

  it("6.2 빈 글: 빈 바른 답은 시드 바른 답, 문법 지적은 빈 글을 거른 뒤 자르고, 빈 고칠 곳 · 교정은 버리고, 빈 피드백은 null", () => {
    const three = speakingAnswerSample(3);
    expect(
      speakingAnswerSpec.normalize(
        speakingAnswer({ correctSentence: "" }),
        three,
        {},
      )?.correctSentence,
    ).toBe(three.seedCorrectAnswer);
    const four = speakingAnswerSample(4);
    expect(
      speakingAnswerSpec.normalize(
        speakingAnswer({ correctSentence: "" }),
        four,
        {},
      )?.correctSentence,
    ).toBe("");
    expect(
      speakingAnswerSpec.normalize(
        speakingAnswer({ grammarNotes: ["", "s 를 붙여요."] }),
        four,
        {},
      )?.grammarNotes,
    ).toEqual(["s 를 붙여요."]);
    // 빈 피드백은 필수 칸 없음
    expect(
      speakingAnswerSpec.normalize(speakingAnswer({ feedback: "" }), four, {}),
    ).toBeNull();
    const presentation = speakingPresentationSample(9);
    expect(
      speakingPresentationSpec.normalize(
        presentationAnswer({ feedback: " " }),
        presentation,
        {},
      ),
    ).toBeNull();
    expect(
      speakingConfirmSpec.normalize(
        presentationAnswer({ feedback: "" }),
        SPEAKING_CONFIRM_SAMPLE,
        {},
      ),
    ).toBeNull();
    // 빈 고칠 곳 · 교정은 버린다
    expect(
      writingCheckSpec
        .normalize(
          checkAnswer({ fixes: [{ ...fix(1, 1), corrected: "" }, fix(2, 2)] }),
          WRITING_CHECK_SAMPLE,
          {},
        )
        ?.fixes.map((f) => f.original),
    ).toEqual(["wrong 2"]);
    const feedback = writingFeedbackSample(6);
    expect(
      writingFeedbackSpec.normalize(
        feedbackAnswer({
          corrections: [{ ...correction(1), reason: "" }, correction(2)],
        }),
        feedback,
        writingFeedbackSpec.rulesOf(settings, feedback),
      )?.corrections,
    ).toEqual([correction(2)]);
  });

  it("6.1 정규화는 멱등이다: 여섯 규격 모두 normalize 두 번이 한 번과 같다", () => {
    const feedback = writingFeedbackSample(10);
    const four = speakingAnswerSample(4);
    const presentation = speakingPresentationSample(9);
    const last = thinkoutSample(MAX_TURNS);
    const first = thinkoutSample(1);
    const cases: [
      { normalize: (x: unknown, i: never, r: never) => unknown },
      unknown,
      unknown,
      unknown,
    ][] = [
      [
        writingCheckSpec,
        checkAnswer({ fixes: [fix(1, 1), fix(2, 2)] }),
        WRITING_CHECK_SAMPLE,
        {},
      ],
      [
        writingFeedbackSpec,
        feedbackAnswer({
          corrections: [1, 2, 3, 4, 5].map(correction),
          rubric: { task: 0, grammar: 5, vocabulary: 2.6 },
        }),
        feedback,
        writingFeedbackSpec.rulesOf(settings, feedback),
      ],
      [speakingAnswerSpec, speakingAnswer(), four, {}],
      [
        speakingPresentationSpec,
        presentationAnswer({ contentScore: 7 }),
        presentation,
        {},
      ],
      [
        speakingConfirmSpec,
        presentationAnswer({ grammarScore: 0.2 }),
        SPEAKING_CONFIRM_SAMPLE,
        {},
      ],
      [
        thinkoutSpec,
        doneAnswer({ done: false }),
        last,
        thinkoutSpec.rulesOf(settings, last),
      ],
      [
        thinkoutSpec,
        thinkoutAnswer(),
        first,
        thinkoutSpec.rulesOf(settings, first),
      ],
    ];
    for (const [spec, raw, input, rules] of cases) {
      const once = spec.normalize(raw, input as never, rules as never);
      expect(once).not.toBeNull();
      expect(spec.normalize(once, input as never, rules as never)).toEqual(
        once,
      );
    }
  });

  it("6.4 출력 검사: 아이 글을 인용한 원문 칸은 길이 검사를 하지 않는다", () => {
    const input = writingFeedbackSample(6);
    const rules = writingFeedbackSpec.rulesOf(settings, input);
    const longOriginal = `${Array.from(
      { length: input.sentenceMaxWords + 3 },
      () => "very",
    ).join(" ")} fun.`;
    const value = writingFeedbackSpec.normalize(
      feedbackAnswer({
        corrections: [{ ...correction(1), original: longOriginal }],
      }),
      input,
      rules,
    );
    if (!value) throw new Error("정규화 실패");
    const options = { forbidden, sentenceMaxWords: input.sentenceMaxWords };
    const hits = checkOutputFields(
      writingFeedbackSpec.checkFields(value),
      options,
    );
    expect(hits.size).toBe(0);
    expect(
      writingFeedbackSpec.applyChecks(value, hits, input).value.corrections,
    ).toHaveLength(1);
    // 쓰기 확인 원문도 같다
    const check = writingCheckSpec.normalize(
      checkAnswer({ fixes: [{ ...fix(1, 1), original: longOriginal }] }),
      WRITING_CHECK_SAMPLE,
      {},
    );
    if (!check) throw new Error("정규화 실패");
    expect(
      checkOutputFields(writingCheckSpec.checkFields(check), {
        forbidden,
        sentenceMaxWords: WRITING_CHECK_SAMPLE.sentenceMaxWords,
      }).size,
    ).toBe(0);
    // 금지어는 원문에서도 본다
    const bad = writingCheckSpec.normalize(
      checkAnswer({ fixes: [{ ...fix(1, 1), original: "you stupid" }] }),
      WRITING_CHECK_SAMPLE,
      {},
    );
    if (!bad) throw new Error("정규화 실패");
    expect([
      ...checkOutputFields(writingCheckSpec.checkFields(bad), {
        forbidden,
        sentenceMaxWords: WRITING_CHECK_SAMPLE.sentenceMaxWords,
      }).keys(),
    ]).toEqual(["fixes.0.original"]);
  });
});

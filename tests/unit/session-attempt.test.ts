// 시도 꼴 · 앱 채점 · 단어별 정오 · 단어 수 · 이어 할 자리(plan-p11a 파일별 값 2 · 정할 것 다 · 라 · 위험 2 · 3, 13절 C76).
// 수업은 견본 빌더(기본 틀) 1 · 3단계, 기준(speaking.answer_match_pass)은 시험용 설정에서 읽는다.
import { describe, expect, it } from "vitest";
import type { LessonOf } from "@/core/seed/schema/lesson";
import {
  type AppScoringContext,
  type AttemptInput,
  aiNeededLesson,
  appActivityResult,
  finalActivityNos,
  INPUT_JSON_MAX,
  inputFitsActivity,
  lemmaLookup,
  parseAttemptInput,
  resumePointOf,
  serverActionOnly,
} from "@/core/session/attempt";
import { type Activity, activitiesOf } from "@/core/session/preview";
import {
  defaultSettings,
  readingLesson,
  referenceSet,
  speakingLesson,
  writingLesson,
} from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";

const ref = referenceSet(defaultSettings());
const PASS = TEST_SETTINGS["speaking.answer_match_pass"].value;
const MAX_RETRIES = TEST_SETTINGS["speech.max_retries"].value;
const reading = readingLesson(ref, 1).lesson;
const writing1 = writingLesson(ref, 1).lesson;
const writing3 = writingLesson(ref, 3).lesson;
const speaking = speakingLesson(ref, 1).lesson;
const writing4 = writingLesson(ref, 4).lesson;
const writing6 = writingLesson(ref, 6).lesson;
const speaking6 = speakingLesson(ref, 6).lesson;
const speaking10 = speakingLesson(ref, 10).lesson;

const ctxOf = (
  lesson: { unitWords: readonly string[] },
  appJudgedQuestions = true,
): AppScoringContext => ({
  answerMatchPass: PASS,
  homophones: [],
  unitWords: lesson.unitWords,
  lemmaOf: lemmaLookup(ref.vocab.vocab),
  appJudgedQuestions,
});

const final = <K extends AttemptInput["kind"]>(
  kind: K,
  content: Omit<Extract<AttemptInput, { kind: K }>, "v" | "kind" | "step">,
) => ({ v: 1, kind, step: "final", ...content }) as unknown as AttemptInput;

describe("시도 꼴", () => {
  it("세션 바탕: 이어 할 자리는 끝 시도가 없는 가장 앞 활동이고 P10 의 꼬리표 없는 미리보기 시도는 끝으로 본다", () => {
    const activities = activitiesOf({
      area: "speaking",
      level: 1,
      content: speaking.content,
    });
    expect(resumePointOf(activities, [])).toEqual({ next: 1 });
    // 뒤 활동(서버 액션이 먼저 저장한 것)이 있어도 앞의 빈 활동에서 이어 한다
    expect(resumePointOf(activities, [1, 2, 4, 5])).toEqual({ next: 3 });
    expect(
      resumePointOf(
        activities,
        activities.map((_, i) => i + 1),
      ),
    ).toEqual({ done: true });
    expect(resumePointOf([], [])).toEqual({ done: true });

    // P10 미리보기 시도 { shownWords } 는 미리보기 끝 시도다
    const legacy = parseAttemptInput({ shownWords: ["bababa"] });
    expect(legacy).toEqual({
      v: 1,
      kind: "preview",
      step: "final",
      shownWords: ["bababa"],
    });
    // 진행 시도는 자리를 옮기지 않는다
    const rows = [
      { activityNo: 1, input: { shownWords: ["bababa"] } },
      {
        activityNo: 2,
        input: {
          v: 1,
          kind: "repeat-word",
          step: "progress",
          heard: ["ba"],
          failures: 0,
        },
      },
      {
        activityNo: 3,
        input: {
          v: 1,
          kind: "repeat-word",
          step: "final",
          heard: ["bebaba"],
          failures: 0,
        },
      },
      { activityNo: 4, input: { broken: true } },
    ];
    expect(finalActivityNos(rows)).toEqual([1, 3]);
    expect(resumePointOf(activities, finalActivityNos(rows))).toEqual({
      next: 2,
    });
  });

  it("시도 꼴: 종류마다 내용 칸을 보고 꼴이 틀리거나 글자 수 상한을 넘으면 받지 않는다", () => {
    expect(
      parseAttemptInput({
        v: 1,
        kind: "reading-question",
        step: "final",
        tries: [2, 1],
      }),
    ).toBeDefined();
    expect(
      parseAttemptInput({
        v: 1,
        kind: "writing-item",
        step: "final",
        tries: [
          { kind: "tiles", pieces: ["b", "a"] },
          { kind: "choice", no: 1 },
        ],
      }),
    ).toBeDefined();
    expect(
      parseAttemptInput({
        v: 1,
        kind: "question",
        step: "final",
        heard: [],
        failures: MAX_RETRIES,
        skipped: "recognition",
      }),
    ).toBeDefined();
    // 판 · 종류 · 끝 표시 · 칸이 틀림
    for (const bad of [
      { v: 2, kind: "preview", step: "final", shownWords: [] },
      { v: 1, kind: "nothing", step: "final" },
      { v: 1, kind: "preview", step: "done", shownWords: [] },
      { v: 1, kind: "reading-question", step: "final", tries: [] },
      { v: 1, kind: "reading-question", step: "final", tries: [1], extra: 1 },
      { v: 1, kind: "repeat-word", step: "final", heard: ["a"] },
      {
        v: 1,
        kind: "question",
        step: "final",
        heard: [],
        failures: 0,
        skipped: "bored",
      },
      {
        v: 1,
        kind: "writing-item",
        step: "final",
        tries: [{ kind: "dont-know" }],
      },
      null,
      "text",
    ])
      expect(parseAttemptInput(bad)).toBeUndefined();
    // 글자 수 상한(기술 값)
    const long = {
      v: 1,
      kind: "reading-passage",
      step: "final",
      tappedWords: ["x".repeat(INPUT_JSON_MAX)],
    };
    expect(parseAttemptInput(long)).toBeUndefined();
    // NUL 글자는 jsonb 가 받지 않아 그 시도만 거부한다(묶음 저장을 막지 않게)
    expect(
      parseAttemptInput({
        v: 1,
        kind: "repeat-word",
        step: "final",
        heard: ["a\u0000b"],
        failures: 0,
      }),
    ).toBeUndefined();
  });

  it("시도 꼴: 시도 종류가 활동 종류와 다르면 그 활동의 시도가 아니다", () => {
    const question: Activity = { kind: "question", index: 0 };
    const input = final("question", { heard: ["bababa"], failures: 0 });
    expect(inputFitsActivity(question, input)).toBe(true);
    expect(inputFitsActivity({ kind: "listening", index: 0 }, input)).toBe(
      false,
    );
    expect(() =>
      appActivityResult(
        { kind: "listening", index: 0 },
        speaking,
        input,
        ctxOf(speaking),
      ),
    ).toThrow();
  });
});

describe("앱 채점", () => {
  it("앱 채점: 읽기 · 듣기 · 쓰기 1~3 문항은 첫 시도가 맞으면 1 아니면 0 이고 미리보기 · 지문은 점수가 없다", () => {
    const q0 = reading.content.questions[0];
    if (!q0) throw new Error("견본 문항 없음");
    const wrong = q0.answerNo === 1 ? 2 : 1;
    const result = (tries: number[]) =>
      appActivityResult(
        { kind: "reading-question", index: 0 },
        reading,
        final("reading-question", { tries }),
        ctxOf(reading),
      ).score;
    expect(result([q0.answerNo])).toBe(1);
    // 둘째에 맞혀도 점수는 첫 시도(C77 (1))
    expect(result([wrong, q0.answerNo])).toBe(0);

    const l0 = speaking.content.listening[0];
    if (!l0) throw new Error("견본 듣기 없음");
    expect(
      appActivityResult(
        { kind: "listening", index: 0 },
        speaking,
        final("listening", { tries: [l0.answerNo] }),
        ctxOf(speaking),
      ).score,
    ).toBe(1);

    // 쓰기 1단계 copy-tiles(문항 3) · 3단계 조립(첫 문항)
    const copyIndex =
      writing1.content.shape === "items"
        ? writing1.content.items.findIndex((i) => i.type === "copy-tiles")
        : -1;
    const copy =
      writing1.content.shape === "items"
        ? writing1.content.items[copyIndex]
        : undefined;
    if (copy?.type !== "copy-tiles") throw new Error("견본 없음");
    const letters = [...(copy.accepted[0] ?? "")];
    const writingScore = (
      lesson: LessonOf["writing"],
      index: number,
      tries: Extract<AttemptInput, { kind: "writing-item" }>["tries"],
    ) =>
      appActivityResult(
        { kind: "writing-item", index },
        lesson,
        final("writing-item", { tries }),
        ctxOf(lesson),
      ).score;
    expect(
      writingScore(writing1, copyIndex, [{ kind: "tiles", pieces: letters }]),
    ).toBe(1);
    expect(
      writingScore(writing1, copyIndex, [
        { kind: "tiles", pieces: [...letters].reverse() },
        { kind: "tiles", pieces: letters },
      ]),
    ).toBe(0);
    expect(
      writingScore(writing3, 0, [
        { kind: "tiles", pieces: ["I", "like", "the", "kabuba", "."] },
      ]),
    ).toBe(1);
    // 첫 글자 대문자 · 마침표 카드를 판정한다(C73)
    expect(
      writingScore(writing3, 0, [
        { kind: "tiles", pieces: ["i", "like", "the", "kabuba", "."] },
      ]),
    ).toBe(0);

    for (const [activity, input, lesson] of [
      [{ kind: "preview" }, final("preview", { shownWords: [] }), reading],
      [
        { kind: "reading-passage" },
        final("reading-passage", { tappedWords: ["bababa"] }),
        reading,
      ],
    ] as const) {
      expect(appActivityResult(activity, lesson, input, ctxOf(lesson))).toEqual(
        { score: null, wordResults: [], wordCount: null },
      );
    }
  });

  it("앱 채점: 따라 말하기는 시도 가운데 가장 높은 일치율이고 건너뛰었으면 인식 글이 있어도 점수 · 단어별 정오가 없다", () => {
    const sentence = speaking.content.repeat.sentences[0] ?? "";
    const words = sentence.replace(/[.]/g, "").split(" ");
    const half = words.slice(0, 2).join(" ");
    const result = appActivityResult(
      { kind: "repeat-sentence", index: 0 },
      speaking,
      final("repeat-sentence", { heard: [half, sentence], failures: 1 }),
      ctxOf(speaking),
    );
    expect(result.score).toBe(1);
    const partial = appActivityResult(
      { kind: "repeat-sentence", index: 0 },
      speaking,
      final("repeat-sentence", { heard: [half], failures: 0 }),
      ctxOf(speaking),
    );
    expect(partial.score).toBe(2 / words.length);
    const skipped = appActivityResult(
      { kind: "repeat-sentence", index: 0 },
      speaking,
      final("repeat-sentence", {
        heard: [],
        failures: MAX_RETRIES,
        skipped: "recognition",
      }),
      ctxOf(speaking),
    );
    expect(skipped.score).toBeNull();
    expect(skipped.wordResults).toEqual([]);
    // 반쯤 맞은 인식 글 뒤 실패가 쌓여 건너뛰어도 점수에서 뺀다(7절 · 결정 1). 단어 수는 인식 글 낱말 수
    const skippedAfterHeard = appActivityResult(
      { kind: "repeat-sentence", index: 0 },
      speaking,
      final("repeat-sentence", {
        heard: [half],
        failures: MAX_RETRIES,
        skipped: "recognition",
      }),
      ctxOf(speaking),
    );
    expect(skippedAfterHeard).toEqual({
      score: null,
      wordResults: [],
      wordCount: 2,
    });
  });

  it("앱 채점: 질문 답은 그 단계가 앱 판정일 때만 첫 인식 글이 허용 답 기준 이상이면 1 이고 건너뛰었으면 인식 글이 있어도 점수 · 단어별 정오가 없다", () => {
    const question = speaking.content.questions[0];
    const accepted = question?.accepted?.[0];
    if (!accepted) throw new Error("견본 허용 답 없음");
    const judge = (
      heard: string[],
      extra: { echo?: string; skipped?: "recognition" } = {},
      appJudged = true,
    ) =>
      appActivityResult(
        { kind: "question", index: 0 },
        speaking,
        final("question", { heard, failures: 0, ...extra }),
        ctxOf(speaking, appJudged),
      ).score;
    expect(judge([accepted])).toBe(1);
    // 첫 인식 글로 판정하고 '같이 말해 볼까요' 뒤 말은 점수에 넣지 않는다
    expect(judge(["nothing here"], { echo: accepted })).toBe(0);
    expect(judge([], { skipped: "recognition" })).toBeNull();
    // 첫 답이 틀린 뒤 '같이 말해 볼까요'에서 실패가 쌓여 건너뛰면 점수 · 단어별 정오 없음, 단어 수는 그대로
    expect(
      appActivityResult(
        { kind: "question", index: 0 },
        speaking,
        final("question", {
          heard: ["It is"],
          failures: MAX_RETRIES,
          skipped: "recognition",
        }),
        ctxOf(speaking),
      ),
    ).toEqual({ score: null, wordResults: [], wordCount: 2 });
    // 앱 판정이 아닌 단계(3단계부터 AI)는 이 길로 점수를 내지 않는다
    expect(judge([accepted], {}, false)).toBeNull();
  });

  it("단어별 정오: 앱이 정답을 아는 낱말 문항의 단원 단어만 내고 따라 말하기는 정렬로 맞은 낱말만 맞음이다", () => {
    // 읽기 그림 문항: 정답 보기 낱말
    const q0 = reading.content.questions[0];
    if (q0?.kind !== "picture") throw new Error("견본 그림 문항 없음");
    const answerWord = q0.options[q0.answerNo - 1];
    expect(
      appActivityResult(
        { kind: "reading-question", index: 0 },
        reading,
        final("reading-question", {
          tries: [q0.answerNo === 1 ? 2 : 1, q0.answerNo],
        }),
        ctxOf(reading),
      ).wordResults,
    ).toEqual([{ word: answerWord, correct: false }]);
    // 글 보기 이해 문항은 내지 않는다
    const textLesson = {
      ...reading,
      content: {
        ...reading.content,
        questions: [
          {
            kind: "text" as const,
            type: "fact" as const,
            prompt: "Who?",
            options: ["bababa", "b", "c", "d"],
            answerNo: 1,
            explanationKo: "해설",
          },
        ],
      },
    };
    expect(
      appActivityResult(
        { kind: "reading-question", index: 0 },
        textLesson,
        final("reading-question", { tries: [1] }),
        ctxOf(textLesson),
      ).wordResults,
    ).toEqual([]);

    // 쓰기 1단계: pick-word 는 그림 낱말, copy-tiles · fill-letters 는 word
    if (writing1.content.shape !== "items") throw new Error("견본 꼴");
    writing1.content.items.forEach((item, index) => {
      const want =
        item.type === "pick-word"
          ? item.picture
          : "word" in item
            ? item.word
            : undefined;
      const tries =
        item.type === "pick-word"
          ? [{ kind: "choice" as const, no: item.answerNo }]
          : [{ kind: "tiles" as const, pieces: ["z"] }];
      const { wordResults } = appActivityResult(
        { kind: "writing-item", index },
        writing1,
        final("writing-item", { tries }),
        ctxOf(writing1),
      );
      expect(wordResults).toEqual(
        want && writing1.unitWords.includes(want)
          ? [{ word: want, correct: item.type === "pick-word" }]
          : [],
      );
    });
    // 단원 단어가 아니면 내지 않는다
    expect(
      appActivityResult(
        { kind: "writing-item", index: 0 },
        writing1,
        final("writing-item", { tries: [{ kind: "choice", no: 1 }] }),
        { ...ctxOf(writing1), unitWords: [] },
      ).wordResults,
    ).toEqual([]);
    // 쓰기 3단계 조립: 첫 허용 정답에 든 단원 단어
    expect(
      appActivityResult(
        { kind: "writing-item", index: 0 },
        writing3,
        final("writing-item", {
          tries: [
            { kind: "tiles", pieces: ["I", "like", "the", "kabuba", "."] },
          ],
        }),
        ctxOf(writing3),
      ).wordResults,
    ).toEqual([{ word: "kabuba", correct: true }]);

    // 따라 말하기: 목표에 든 단원 단어마다 가장 높은 시도에서 정렬로 맞았는지
    const sentence = speaking.content.repeat.sentences[0] ?? "";
    const unitWord = speaking.unitWords.find((w) =>
      sentence.toLowerCase().includes(w),
    );
    if (!unitWord) throw new Error("견본 문장에 단원 단어 없음");
    const other = speaking.unitWords.find((w) => w !== unitWord) ?? "zzz";
    const repeat = (heard: string[]) =>
      appActivityResult(
        { kind: "repeat-sentence", index: 0 },
        speaking,
        final("repeat-sentence", { heard, failures: 0 }),
        ctxOf(speaking),
      ).wordResults;
    expect(repeat([sentence])).toEqual([{ word: unitWord, correct: true }]);
    // 다른 낱말로 말하면 그 단원 단어는 틀림(목표 밖 낱말은 내지 않는다)
    expect(repeat([sentence.replace(unitWord, other)])).toEqual([
      { word: unitWord, correct: false },
    ]);
    // 가장 높은 시도로 본다
    expect(repeat([sentence.replace(unitWord, other), sentence])).toEqual([
      { word: unitWord, correct: true },
    ]);

    // 듣기 그림 문항: 정답 보기 낱말
    const l0 = speaking.content.listening[0];
    if (l0?.kind !== "picture") throw new Error("견본 듣기 꼴");
    expect(
      appActivityResult(
        { kind: "listening", index: 0 },
        speaking,
        final("listening", { tries: [l0.answerNo] }),
        ctxOf(speaking),
      ).wordResults,
    ).toEqual([{ word: l0.options[l0.answerNo - 1], correct: true }]);

    // 1~2단계 질문 답: 가장 가까운 허용 답에 든 단원 단어 — 판정 정오. AI 판정 단계는 내지 않는다
    const q = speaking.content.questions[0];
    const qWord = speaking.unitWords.find((w) =>
      (q?.accepted ?? []).some((a) => a.toLowerCase().includes(w)),
    );
    if (!q?.accepted || !qWord) throw new Error("견본 질문 꼴");
    const answer = (heard: string, appJudged = true) =>
      appActivityResult(
        { kind: "question", index: 0 },
        speaking,
        final("question", { heard: [heard], failures: 0 }),
        ctxOf(speaking, appJudged),
      ).wordResults;
    expect(answer(q.accepted[0] ?? "")).toEqual([
      { word: qWord, correct: true },
    ]);
    expect(answer(other)).toEqual([{ word: qWord, correct: false }]);
    expect(answer(q.accepted[0] ?? "", false)).toEqual([]);
  });

  it("단어별 정오: 하이픈 · 따옴표가 든 단원 단어도 인식 글과 같은 정규화로 찾는다", () => {
    const lesson = {
      ...speaking,
      unitWords: ["yo-yo", "o'clock"],
      content: {
        ...speaking.content,
        repeat: {
          words: [],
          sentences: ["I have a yo-yo.", "I see two yo-yos at six o'clock."],
        },
      },
    };
    const ctx = {
      ...ctxOf(lesson),
      lemmaOf: lemmaLookup([
        { word: "yo-yo", forms: ["yo-yos"] },
        { word: "o'clock", forms: [] },
      ]),
    };
    const words = (index: number, heard: string) =>
      appActivityResult(
        { kind: "repeat-sentence", index },
        lesson,
        final("repeat-sentence", { heard: [heard], failures: 0 }),
        ctx,
      ).wordResults;
    expect(words(0, "I have a yo-yo")).toEqual([
      { word: "yo-yo", correct: true },
    ]);
    expect(words(0, "I have a yo yo")).toEqual([
      { word: "yo-yo", correct: true },
    ]);
    expect(words(0, "I have a yo")).toEqual([
      { word: "yo-yo", correct: false },
    ]);
    // 활용형(yo-yos)도 원형으로, 따옴표 든 낱말도
    expect(words(1, "I see two yo-yos at six o'clock")).toEqual([
      { word: "yo-yo", correct: true },
      { word: "o'clock", correct: true },
    ]);
    expect(words(1, "I see two yo-yos at six")).toEqual([
      { word: "yo-yo", correct: true },
      { word: "o'clock", correct: false },
    ]);
    // 낱말 문항 쪽(받아쓰기 word)도 같은 견줌
    expect(ctx.lemmaOf("Yo-Yos")).toBe("yo-yo");
    expect(ctx.lemmaOf("yo yos")).toBe("yo-yo");
  });

  it("단어 수: 말하기 활동은 인식 글 낱말 수의 합이고 그 밖은 없다", () => {
    expect(
      appActivityResult(
        { kind: "repeat-sentence", index: 0 },
        speaking,
        final("repeat-sentence", {
          heard: ["I see", " a  bababa "],
          failures: 0,
        }),
        ctxOf(speaking),
      ).wordCount,
    ).toBe(4);
    expect(
      appActivityResult(
        { kind: "question", index: 0 },
        speaking,
        final("question", {
          heard: ["no idea"],
          echo: "It is a bababa.",
          failures: 0,
        }),
        ctxOf(speaking),
      ).wordCount,
    ).toBe(6);
    expect(
      appActivityResult(
        { kind: "repeat-word", index: 0 },
        speaking,
        final("repeat-word", {
          heard: [],
          failures: MAX_RETRIES,
          skipped: "silent",
        }),
        ctxOf(speaking),
      ).wordCount,
    ).toBe(0);
    expect(
      appActivityResult(
        { kind: "listening", index: 0 },
        speaking,
        final("listening", { tries: [1] }),
        ctxOf(speaking),
      ).wordCount,
    ).toBeNull();
  });

  it("낱말 원형: 활용형 · 대소문자를 원형으로 돌리고 모르는 낱말은 없다", () => {
    const lemmaOf = lemmaLookup([
      { word: "be", forms: ["am", "is", "are"] },
      { word: "ice cream", forms: ["ice creams"] },
    ]);
    expect(lemmaOf("Is")).toBe("be");
    expect(lemmaOf("be")).toBe("be");
    expect(lemmaOf("ice creams")).toBe("ice cream");
    expect(lemmaOf("dog")).toBeUndefined();
  });
});

describe("쓰기 AI 시도(plan-p11b 값 4)", () => {
  const b = (kind: string, step: "final" | "progress", content = {}) => ({
    v: 1,
    kind,
    step,
    ...content,
  });

  it("b 시도 꼴: 쓰기 4~12 종류의 진행 · 끝 시도를 읽고 칸이 틀리면 받지 않는다", () => {
    for (const good of [
      b("writing-task", "final"),
      b("writing-guided", "progress", { sentences: ["I like the ", ""] }),
      b("writing-guided", "final", { sentences: ["I like the cat."] }),
      b("writing-guided-fix", "progress", { fixed: ["He likes cats."] }),
      b("writing-own-repeat", "final", { heard: ["i like the cat"] }),
      b("writing-own-repeat", "final", { skipped: "chose_skip" }),
      b("own-speak", "final", { skipped: "no_mic" }),
      b("thinkout", "progress", {
        turn: 1,
        answer: null,
        question: "어떤 동물을 좋아해?",
        options: ["강아지", "고양이", "토끼"],
        historyEntry: "어떤 동물을 좋아해?",
      }),
      b("thinkout", "final", {
        summary: "강아지를 좋아해요",
        words: ["dog"],
        starters: ["I like"],
      }),
      b("thinkout", "final", { failed: true }),
      b("thinkout", "final", { restored: true }),
      b("draft", "progress", { text: "I have a dog." }),
      b("draft", "final", { text: "I have a dog." }),
      b("feedback-praise", "final"),
      b("feedback-correction", "final"),
      b("model-answer", "final"),
      b("rewrite", "final", { text: "I have a dog." }),
    ])
      expect(parseAttemptInput(good), JSON.stringify(good)).toBeDefined();
    for (const bad of [
      b("writing-task", "final", { extra: 1 }),
      b("writing-guided", "final", { sentences: [] }),
      b("writing-guided", "final", { sentences: [1] }),
      b("writing-guided-fix", "progress", { fixed: "x" }),
      b("writing-own-repeat", "final", { skipped: "bored" }),
      b("thinkout", "progress", { turn: 0, answer: null }),
      b("thinkout", "final", { failed: false }),
      b("draft", "final", {}),
      b("rewrite", "final", { text: 3 }),
      b("feedback-praise", "final", { text: "x" }),
    ])
      expect(parseAttemptInput(bad), JSON.stringify(bad)).toBeUndefined();
  });

  it("b 시도 꼴: 대기열 길은 쓰기 확인 끝 · 생각 꺼내기 · 초고 끝 · 고쳐 쓰기 끝을 받지 않는다(서버 액션만 저장)", () => {
    const only = (input: object) =>
      serverActionOnly(parseAttemptInput(input) as AttemptInput);
    expect(only(b("writing-guided", "final", { sentences: ["a."] }))).toBe(
      true,
    );
    expect(only(b("thinkout", "final", { failed: true }))).toBe(true);
    expect(
      only(
        b("thinkout", "progress", {
          turn: 1,
          answer: "강아지",
          question: "q",
          options: ["a", "b", "c"],
          historyEntry: "q",
        }),
      ),
    ).toBe(true);
    expect(only(b("draft", "final", { text: "a" }))).toBe(true);
    expect(only(b("rewrite", "final", { text: "a" }))).toBe(true);
    // 대기열이 받는 것: 쓰던 글 · 고친 문장 · 자동 저장 초고 · AI 없는 끝 시도 · a 몫
    for (const queued of [
      b("writing-guided", "progress", { sentences: ["a"] }),
      b("writing-guided-fix", "progress", { fixed: ["a."] }),
      b("draft", "progress", { text: "a" }),
      b("writing-task", "final"),
      b("writing-own-repeat", "final", { skipped: "chose_skip" }),
      b("feedback-praise", "final"),
      b("model-answer", "final"),
      b("own-speak", "final", { heard: ["a"] }),
      b("preview", "final", { shownWords: [] }),
    ])
      expect(only(queued), JSON.stringify(queued)).toBe(false);
  });

  it("b 시도 꼴: 고친 문장 진행 시도는 쓰기 문장 활동의 것이고 AI 없는 b 끝 시도는 점수 · 단어별 정오가 없다", () => {
    const fix = parseAttemptInput(
      b("writing-guided-fix", "progress", { fixed: ["a."] }),
    ) as AttemptInput;
    expect(inputFitsActivity({ kind: "writing-guided" }, fix)).toBe(true);
    expect(inputFitsActivity({ kind: "writing-task" }, fix)).toBe(false);
    const activities = activitiesOf({
      area: "writing",
      level: 4,
      content: writing4.content,
    });
    for (const [activity, input] of [
      [activities[1], b("writing-task", "final")],
      [activities[2], b("writing-guided-fix", "progress", { fixed: ["a."] })],
      [
        activities[3],
        b("writing-own-repeat", "final", { heard: ["i like it"] }),
      ],
    ] as const) {
      if (!activity) throw new Error("활동 없음");
      expect(
        appActivityResult(
          activity,
          writing4,
          parseAttemptInput(input) as AttemptInput,
          ctxOf(writing4),
        ),
      ).toEqual({ score: null, wordResults: [], wordCount: null });
    }
  });

  it("AI 가 필요한 수업: 쓰기 4~5 · 6~12 첫 세션 · 발표가 있는 말하기는 참이고 둘째 세션 · 쓰기 1~3 · 읽기 · 말하기 1~8 은 거짓이다", () => {
    expect(aiNeededLesson({ area: "writing", content: writing4.content })).toBe(
      true,
    );
    expect(aiNeededLesson({ area: "writing", content: writing6.content })).toBe(
      true,
    );
    expect(
      aiNeededLesson({
        area: "writing",
        content: writing6.content,
        part: "draft",
      }),
    ).toBe(true);
    // 둘째 세션(고쳐 쓰기)은 AI 를 부르지 않는다(C80)
    expect(
      aiNeededLesson({
        area: "writing",
        content: writing6.content,
        part: "rewrite",
      }),
    ).toBe(false);
    expect(aiNeededLesson({ area: "writing", content: writing1.content })).toBe(
      false,
    );
    expect(aiNeededLesson({ area: "writing", content: writing3.content })).toBe(
      false,
    );
    expect(aiNeededLesson({ area: "reading", content: reading.content })).toBe(
      false,
    );
    // 말하기 3~8 은 막지 않고 질문 답만 건너뛴다(8절 '동안' 예외), 9~12(발표)는 막는다
    expect(
      aiNeededLesson({ area: "speaking", content: speaking.content }),
    ).toBe(false);
    expect(
      aiNeededLesson({ area: "speaking", content: speaking6.content }),
    ).toBe(false);
    expect(
      aiNeededLesson({ area: "speaking", content: speaking10.content }),
    ).toBe(true);
  });
});

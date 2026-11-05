// 말하기 판정(plan-p11a 파일별 값 4 · 3.3 말하기 · 4절 결과 말 · 6.2 허용 답 · 7절 오류 · 감시 타이머 · 마이크를 쓸 수 없음 행).
// 경계 · 기준 · 재시도 수 · 말소리 없음 수는 시험용 설정(ui.match_phrase_levels · speaking.answer_match_pass · speech.*)에서 읽는다.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AI_ANSWER_SCORES,
  aiAnswerScore,
  answerMaxSecondsKey,
  answerShapeOf,
  englishSentencesOf,
  judgeAppAnswer,
  judgeSpeakingQuestion,
  MIC_CAPTURE_STREAK,
  type QuestionJudgeContext,
  questionTextsOf,
  RESULT_PHRASES,
  resultPhraseOf,
  type SpeakingCounters,
  type SpeakingJudgement,
  type SpeechEvent,
  type SpeechVerdict,
  skipAfterAiRest,
  speakingCounters,
  speakingCountersStart,
  speechEventOf,
} from "@/core/speaking/judge";
import { type MeaningWord, meaningWordsFor } from "@/core/speaking/meaning";
import {
  endRuleFor,
  type ListenOutcome,
  recognitionErrorCodeOf,
  speechSettingsFrom,
  startListen,
  stepListen,
} from "@/core/speech/listen";
import { bestMatchRate } from "@/core/speech/match-rate";
import {
  defaultSettings,
  referenceSet,
  speakingLesson,
  teachSeedLessons,
} from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";

const ref = referenceSet(defaultSettings());
const PASS = TEST_SETTINGS["speaking.answer_match_pass"].value;
const LEVELS = TEST_SETTINGS["ui.match_phrase_levels"].value;
const limits = {
  maxRetries: TEST_SETTINGS["speech.max_retries"].value,
  silentItemsMax: TEST_SETTINGS["speech.silent_items_max"].value,
};

/** 일들을 차례로 넣고 판정을 모은다. */
function run(
  events: SpeechEvent[],
  start: SpeakingCounters = speakingCountersStart(),
): { state: SpeakingCounters; verdicts: SpeechVerdict[] } {
  let state = start;
  const verdicts: SpeechVerdict[] = [];
  for (const event of events) {
    const step = speakingCounters(state, event, limits);
    state = step.state;
    verdicts.push(step.verdict);
  }
  return { state, verdicts };
}
const times = <T>(n: number, value: T): T[] =>
  Array.from({ length: n }, () => value);

describe("말하기 판정", () => {
  it("AC-5f 말하기 1단계 질문 답은 허용 답과의 일치율이 speaking.answer_match_pass 이상이면 맞음이고 아니면 다시다", () => {
    const question = speakingLesson(ref, 1).lesson.content.questions[0];
    const accepted = question?.accepted ?? [];
    expect(accepted.length).toBeGreaterThan(0);
    const homophones: string[][] = [];
    for (const heard of [
      accepted[accepted.length - 1] ?? "",
      `um ${accepted[0]}`,
      "I do not know",
      "",
    ]) {
      const rate =
        heard === ""
          ? 0
          : bestMatchRate(accepted, heard, {
              homophones,
              nameSlot: "any-word",
            });
      const judged = judgeAppAnswer(heard, accepted, {
        pass: PASS,
        homophones,
      });
      expect(judged.rate).toBe(rate);
      expect(judged.correct).toBe(rate >= PASS);
      expect(accepted).toContain(judged.closest);
    }
    expect(
      judgeAppAnswer(accepted[0] ?? "", accepted, { pass: PASS, homophones })
        .correct,
    ).toBe(true);
    expect(
      judgeAppAnswer("nothing", accepted, { pass: PASS, homophones }).correct,
    ).toBe(false);
    // 경계: 낱말 n 개 허용 답에서 앞 k 개만 말해 k / n = speaking.answer_match_pass 이면 맞음, k − 1 이면 다시
    const n = Array.from({ length: 20 }, (_, i) => i + 1).find(
      (size) => Math.abs(Math.round(PASS * size) - PASS * size) < 1e-9,
    );
    if (n === undefined) throw new Error("기준을 낱말 수로 세울 수 없다");
    const k = Math.round(PASS * n);
    const target = Array.from({ length: n }, (_, i) => `word${i + 1}`);
    const said = (count: number) => target.slice(0, count).join(" ");
    const atPass = judgeAppAnswer(said(k), [target.join(" ")], {
      pass: PASS,
      homophones,
    });
    expect(atPass.rate).toBe(k / n);
    expect(atPass.correct).toBe(true);
    expect(
      judgeAppAnswer(said(k - 1), [target.join(" ")], {
        pass: PASS,
        homophones,
      }).correct,
    ).toBe(false);
    // 허용 답이 여럿이면 가장 높은 일치율의 답이 가장 가까운 답이다(6.2)
    const judged = judgeAppAnswer(
      "It is a big apple",
      ["apple", "It is a big apple"],
      {
        pass: PASS,
        homophones,
      },
    );
    expect(judged).toEqual({ correct: true, rate: 1, closest: "apple" });
  });

  it("AC-5f 일치율 0.95 는 '잘 말했어요', 0.7 은 '거의 다 맞았어요', 0.5 는 '한 번 더 들어 볼까요'다", () => {
    const phrase = (rate: number) =>
      RESULT_PHRASES[resultPhraseOf(rate, LEVELS)];
    expect(phrase(0.95)).toBe("잘 말했어요");
    expect(phrase(0.7)).toBe("거의 다 맞았어요");
    expect(phrase(0.5)).toBe("한 번 더 들어 볼까요");
    // 경계값은 위 말이다
    const [high, mid] = LEVELS;
    expect(resultPhraseOf(high, LEVELS)).toBe("good");
    expect(resultPhraseOf(mid, LEVELS)).toBe("close");
    expect(resultPhraseOf(0, LEVELS)).toBe("again");
  });

  it("말하기 답 꼴: 따라 말하기와 1~4단계 질문 답은 한 문장, 5단계부터 질문 답 · 그림 보고 말하기 · 발표 · 확인 질문은 두 문장 이상이다", () => {
    const specOf = (level: number) => {
      const spec = ref.levelSpecs.levelSpecs.find(
        (s) => s.area === "speaking" && s.level === level,
      );
      if (spec?.area !== "speaking") throw new Error(`규격 없음 ${level}`);
      return spec;
    };
    for (const level of [1, 2, 3, 4]) {
      expect(answerShapeOf({ kind: "question" }, specOf(level))).toBe(
        "one-sentence",
      );
    }
    for (const level of [5, 6, 7, 8]) {
      expect(answerShapeOf({ kind: "question" }, specOf(level))).toBe(
        "multi-sentence",
      );
    }
    for (const kind of ["repeat-word", "repeat-sentence"] as const)
      expect(answerShapeOf({ kind }, specOf(1))).toBe("one-sentence");
    for (const kind of [
      "picture-task",
      "presentation",
      "confirm-question",
    ] as const)
      expect(answerShapeOf({ kind }, specOf(10))).toBe("multi-sentence");
    // 두 문장 이상 답의 상한 키(구간)
    expect(answerMaxSecondsKey(6)).toBe("speaking.answer_max_seconds.4-6");
    expect(answerMaxSecondsKey(12) in TEST_SETTINGS).toBe(true);
  });
});

describe("말하기 인식 셈(7절 오류 행)", () => {
  it("말하기 인식 셈: 다시 듣기 갈래 실패가 speech.max_retries 번이면 그 활동을 건너뛰고 network 는 세지 않는다", () => {
    const failures: SpeechEvent[] = [
      { type: "error", code: "aborted" },
      { type: "no-result" },
      { type: "heard", text: "  " },
    ].slice(0, limits.maxRetries) as SpeechEvent[];
    const { verdicts } = run([{ type: "error", code: "network" }, ...failures]);
    expect(verdicts[0]).toBe("offline");
    expect(verdicts.slice(1, -1).every((v) => v === "retry")).toBe(true);
    expect(verdicts.at(-1)).toBe("skip");
    // 결과가 오면 들음, 마이크를 쓸 수 없는 코드는 바로 안내
    expect(run([{ type: "heard", text: "I see" }]).verdicts).toEqual(["heard"]);
    for (const code of [
      "not-allowed",
      "service-not-allowed",
      "language-not-supported",
    ])
      expect(run([{ type: "error", code }]).verdicts).toEqual([
        "mic-unavailable",
      ]);
  });

  it("말하기 인식 셈: 같은 활동에서 audio-capture 가 MIC_CAPTURE_STREAK 번 이어지면 '마이크를 쓸 수 없음'이고 다음 활동에서는 다시 센다", () => {
    const capture: SpeechEvent = { type: "error", code: "audio-capture" };
    const streak = run(times(MIC_CAPTURE_STREAK, capture));
    expect(streak.verdicts.at(-1)).toBe("mic-unavailable");
    // 활동이 바뀌면 이어진 수는 처음부터
    const split = run([
      ...times(MIC_CAPTURE_STREAK - 1, capture),
      { type: "next-activity" },
      ...times(MIC_CAPTURE_STREAK - 1, capture),
    ]);
    expect(split.verdicts).not.toContain("mic-unavailable");
    // 다른 실패가 끼면 이어짐이 끊긴다
    const broken = run([capture, { type: "error", code: "aborted" }, capture]);
    expect(broken.verdicts).not.toContain("mic-unavailable");
  });

  it("말하기 인식 셈: audio-capture · aborted · 결과 없음이 성공 없이 speech.max_retries 의 두 배 이어지면 '마이크가 멈춤'이고 no-speech 는 세지 않는다", () => {
    const sixth = limits.maxRetries * 2;
    const perActivity: SpeechEvent[] = [
      { type: "error", code: "aborted" },
      { type: "no-result" },
      { type: "error", code: "aborted" },
    ].slice(0, limits.maxRetries) as SpeechEvent[];
    const events: SpeechEvent[] = [];
    while (events.filter((e) => e.type !== "next-activity").length < sixth) {
      events.push(...perActivity, { type: "next-activity" });
    }
    const { verdicts } = run(events);
    expect(verdicts.filter((v) => v !== "none").at(sixth - 1)).toBe(
      "mic-stalled",
    );
    expect(verdicts.filter((v) => v === "mic-stalled")).toHaveLength(1);
    // 중간에 성공이 있으면 처음부터 센다
    const reset = run([
      ...times(sixth - 1, { type: "error", code: "aborted" } as SpeechEvent),
      { type: "heard", text: "hello" },
      { type: "error", code: "aborted" },
    ]);
    expect(reset.verdicts).not.toContain("mic-stalled");
    // no-speech 는 여섯 번에 넣지 않는다
    const quiet = run(
      times(sixth, { type: "error", code: "no-speech" } as SpeechEvent).flatMap(
        (e, i) =>
          i % limits.maxRetries === limits.maxRetries - 1
            ? [e, { type: "next-activity" } as SpeechEvent]
            : [e],
      ),
      { ...speakingCountersStart() },
    );
    expect(quiet.verdicts).not.toContain("mic-stalled");
    // 감시 타이머가 두 번 멈춤(P2b stalled)은 바로 '마이크가 멈춤'
    expect(run([{ type: "stalled" }]).verdicts).toEqual(["mic-stalled"]);
  });

  it("C148 iPad WebKit 의 말소리 없는 듣기(단추 stop 뒤 'aborted · No speech detected')는 no-speech 로 세어 '마이크가 멈춤'이 아니라 '말소리 없음'으로 간다", () => {
    const speech = speechSettingsFrom(
      (key) =>
        (TEST_SETTINGS as Record<string, { value: unknown }>)[key]?.value,
    );
    const rule = endRuleFor(
      { area: "speaking", level: 1, answer: "one-sentence" },
      speech,
    );
    // 듣기 하나: 시작 → 단추 → aborted 'No speech detected' → 끝(10-22 실측 꼴)
    let step = startListen(rule, speech, 0);
    step = stepListen(step.state, { type: "button", now: 2000 });
    step = stepListen(step.state, {
      type: "error",
      now: 2010,
      recognizer: 1,
      code: recognitionErrorCodeOf("aborted", "No speech detected"),
    });
    const done = step.effects.find((e) => e.type === "done");
    const outcome = (done as { outcome: ListenOutcome } | undefined)?.outcome;
    expect(outcome).toMatchObject({ kind: "error", code: "no-speech" });
    const event = outcome ? speechEventOf(outcome) : undefined;
    if (!event) throw new Error("셈의 일이 있어야 한다");
    const items = limits.silentItemsMax;
    const events: SpeechEvent[] = [];
    for (let i = 0; i < items; i++)
      events.push(...times(limits.maxRetries, event), {
        type: "next-activity",
      });
    const { verdicts } = run(events);
    expect(verdicts).not.toContain("mic-stalled");
    expect(verdicts.filter((v) => v !== "none").at(-1)).toBe("speech-silent");
  });

  it("말하기 인식 셈: no-speech 로만 끝난 활동이 speech.silent_items_max 개 이어지면 '말소리 없음'이고 사이에 들은 활동이 있으면 다시 센다", () => {
    const silentActivity: SpeechEvent[] = [
      ...times(limits.maxRetries, {
        type: "error",
        code: "no-speech",
      } as SpeechEvent),
      { type: "next-activity" },
    ];
    const { verdicts } = run(
      Array.from(
        { length: limits.silentItemsMax },
        () => silentActivity,
      ).flat(),
    );
    const ends = verdicts.filter((v) => v === "skip" || v === "speech-silent");
    expect(ends).toEqual([
      ...times(limits.silentItemsMax - 1, "skip"),
      "speech-silent",
    ]);
    // 들은 활동이 끼면 끊긴다
    const broken = run([
      ...Array.from(
        { length: limits.silentItemsMax - 1 },
        () => silentActivity,
      ).flat(),
      { type: "heard", text: "bababa" },
      { type: "next-activity" },
      ...silentActivity,
    ]);
    expect(broken.verdicts).not.toContain("speech-silent");
    // aborted 가 섞여 건너뛴 활동은 no-speech 로만 끝난 활동이 아니다
    const mixed = run([
      ...Array.from(
        { length: limits.silentItemsMax - 1 },
        () => silentActivity,
      ).flat(),
      { type: "error", code: "aborted" },
      ...times(limits.maxRetries - 1, {
        type: "error",
        code: "no-speech",
      } as SpeechEvent),
    ]);
    expect(mixed.verdicts).not.toContain("speech-silent");
  });

  it("말하기 인식 셈: 들은 뒤의 실패도 그 활동의 실패 수에 이어 쌓여 speech.max_retries 번이면 건너뛴다", () => {
    const aborted: SpeechEvent = { type: "error", code: "aborted" };
    const after = run([
      { type: "heard", text: "I see" },
      ...times(limits.maxRetries, aborted),
    ]);
    expect(after.verdicts.at(-1)).toBe("skip");
    // 성공이 이 활동의 실패 수를 지우지 않는다(실패 · 성공 · 실패 = 실패 수 max_retries)
    const around = run([
      ...times(limits.maxRetries - 1, aborted),
      { type: "heard", text: "I see" },
      aborted,
    ]);
    expect(around.verdicts.at(-1)).toBe("skip");
  });

  it("말하기 인식 셈: start-failed · 모르는 코드 · phrases-not-supported · bad-grammar 는 다시 듣기이고 이어지면 '마이크가 멈춤'에 든다", () => {
    const codes = [
      "start-failed",
      "made-up-code",
      "phrases-not-supported",
      "bad-grammar",
    ];
    expect(run([{ type: "error", code: "made-up-code" }]).verdicts).toEqual([
      "retry",
    ]);
    const events: SpeechEvent[] = [];
    for (let i = 0; i < limits.maxRetries * 2; i += 1) {
      events.push({ type: "error", code: codes[i % codes.length] ?? "" });
      if (i % limits.maxRetries === limits.maxRetries - 1)
        events.push({ type: "next-activity" });
    }
    const { verdicts } = run(events);
    expect(verdicts.filter((v) => v !== "none").at(-1)).toBe("mic-stalled");
  });

  it("말하기 인식 셈: 듣기 결과(P2b)를 셈의 일로 바꾸고 중단은 세지 않는다", () => {
    expect(
      speechEventOf({
        kind: "result",
        text: "hi",
        pieces: ["hi"],
        endedBy: "silence",
        restarts: 0,
        watchdogRestarts: 0,
      }),
    ).toEqual({ type: "heard", text: "hi" });
    expect(speechEventOf({ kind: "no-result" })).toEqual({ type: "no-result" });
    expect(
      speechEventOf({
        kind: "error",
        code: "aborted",
        group: "retry",
        partialText: "",
      }),
    ).toEqual({ type: "error", code: "aborted" });
    expect(speechEventOf({ kind: "stalled", partialText: "" })).toEqual({
      type: "stalled",
    });
    expect(
      speechEventOf({ kind: "interrupted", reason: "leave", partialText: "" }),
    ).toBeUndefined();
  });
});

describe("영어로 말한 문장 수", () => {
  it("영어로 말한 문장 수: 인식 글이 있는 발화마다 하나다", () => {
    expect(
      englishSentencesOf([
        { kind: "preview", step: "final" },
        { kind: "repeat-word", step: "final", heard: ["bababa", "", "bababa"] },
        { kind: "repeat-sentence", step: "final", heard: [] },
        { kind: "listening", step: "final" },
        {
          kind: "question",
          step: "final",
          heard: ["no"],
          echo: "It is a bababa.",
        },
        { kind: "question", step: "final", heard: ["  "], echo: "" },
        // 인식 글이 있는 건너뜀도 발화는 센다(점수에서만 뺀다)
        {
          kind: "repeat-sentence",
          step: "final",
          heard: ["I see"],
          skipped: "recognition",
        },
        // 진행 시도는 끝 시도와 겹치므로 세지 않는다
        { kind: "repeat-word", step: "progress", heard: ["bababa"] },
        // 쓰기 세션의 내 문장 말하기는 세지 않는다(5절)
        { kind: "own-speak", step: "final", heard: ["I like it."] },
      ]),
    ).toBe(5);
    expect(englishSentencesOf([])).toBe(0);
  });
});

// ── 말하기 질문 판정(델타 spec 2026-10-29 가르치고 배우는 수업 설계 8 · plan 다 · 정한 것 6 · 7, 정본 15절 AC-22k) ──
// 수업은 3단계 단원 1 정규 시드 말하기 수업(가르치는 수업), 낱말 품사 표는 seed/vocab.json 을 그 수업 글로 좁힌 표(정한 것 7),
// 동음이의어는 seed/lists/homophones.json, 문턱은 시험용 설정(speaking.answer_match_pass)이다.
const SEED = resolve(__dirname, "../../seed");
const vocabWords: MeaningWord[] = JSON.parse(
  readFileSync(join(SEED, "vocab.json"), "utf8"),
).vocab;
const seedHomophones: string[][] = JSON.parse(
  readFileSync(join(SEED, "lists/homophones.json"), "utf8"),
).groups;
const teachSpeaking = teachSeedLessons().speaking;
const judgeCtx: QuestionJudgeContext = {
  pass: PASS,
  homophones: seedHomophones,
  words: meaningWordsFor(
    questionTextsOf(teachSpeaking),
    vocabWords,
    seedHomophones,
  ),
};
const questionAt = (i: number) => {
  const q = teachSpeaking.content.questions[i];
  if (!q) throw new Error(`질문 ${i} 없음`);
  return q;
};
const Q1 = questionAt(0); // Do Dan and Tess eat rice? → No, they eat pizza.
const Q2 = questionAt(1); // Do Dan and Tess drink juice? → No, they drink milk.
const Q3 = questionAt(2); // Do Dan and Tess go home? → No, they go to the lake.
const Q4 = questionAt(3); // Do Dan and Tess wash the cups? → Yes, they wash the cups.
const AI_VALUES: readonly SpeakingJudgement[] = ["correct", "partial", "retry"];
const opts = { homophones: seedHomophones, nameSlot: "any-word" as const };

describe("말하기 질문 판정(설계 8)", () => {
  it("AC-22k 의미 검사가 실패한 답은 일치율이 문턱을 넘어도 맞음이 아니고 '다시'다(정한 것 6)", () => {
    expect(Q2.modelAnswer).toBe("No, they drink milk.");
    const cases: [typeof Q1, string, string][] = [
      [Q2, "Yes, they drink milk.", "direction"],
      [Q2, "They drink juice.", "key"],
      [Q2, "No, they drink juice.", "key"],
      [Q2, "They do not drink milk.", "negated"],
      [Q2, "They drink milk and juice.", "wrong_info"],
      [Q1, "Yes, they eat pizza.", "direction"],
      [Q3, "Yes, they go to the lake.", "direction"],
      [Q3, "No, they go to the park.", "key"],
      [Q4, "No, they wash the cups.", "direction"],
      [Q4, "Yes, they wash the bike.", "key"],
    ];
    for (const [q, heard, meaning] of cases) {
      expect(judgeSpeakingQuestion(q, heard, judgeCtx), heard).toEqual({
        meaning,
        final: "retry",
        by: "app",
        expressionDone: false,
      });
    }
    // 일치율만이면 문턱을 넘는 글이다(증명 절, 2026-10-30 잰 값)
    const all = (q: typeof Q1) => [
      ...(q.accepted ?? []),
      ...(q.acceptedMeaning ?? []),
    ];
    for (const [q, heard] of [
      [Q1, "Yes, they eat pizza."],
      [Q3, "Yes, they go to the lake."],
      [Q3, "No, they go to the park."],
      [Q4, "No, they wash the cups."],
      [Q4, "Yes, they wash the bike."],
    ] as const)
      expect(bestMatchRate(all(q), heard, opts), heard).toBeGreaterThanOrEqual(
        PASS,
      );
  });

  it("AC-22k 의미 검사 긍정 예문: not 으로 틀린 정보를 지우는 답은 맞음이다", () => {
    for (const heard of [
      "They drink milk, not juice.",
      "They don't drink juice, they drink milk.",
    ])
      expect(judgeSpeakingQuestion(Q2, heard, judgeCtx).final, heard).toBe(
        "correct",
      );
  });

  it("AC-22k 두 묶음 가르기: 가장 높은 일치율이 높은 쪽 묶음(같으면 accepted)이고 accepted 쪽만 표현 수행이며 acceptedMeaning 쪽은 의사소통 정답이다", () => {
    expect(
      judgeSpeakingQuestion(Q3, "No, they go to the lake.", judgeCtx),
    ).toEqual({
      meaning: "ok",
      bundle: "accepted",
      final: "correct",
      by: "app",
      expressionDone: true,
    });
    // accepted 와도 문턱 위(0.83)지만 acceptedMeaning 과 더 높다 — accepted 를 먼저 보면 안 된다
    expect(
      bestMatchRate(
        Q3.accepted ?? [],
        "No, Dan and Tess go to the lake.",
        opts,
      ),
    ).toBeGreaterThanOrEqual(PASS);
    expect(
      judgeSpeakingQuestion(Q3, "No, Dan and Tess go to the lake.", judgeCtx),
    ).toEqual({
      meaning: "ok",
      bundle: "meaning",
      final: "correct",
      by: "app",
      communicative: true,
      expressionDone: false,
    });
    expect(judgeSpeakingQuestion(Q4, "Yes, they do.", judgeCtx)).toEqual({
      meaning: "ok",
      bundle: "meaning",
      final: "correct",
      by: "app",
      communicative: true,
      expressionDone: false,
    });
    // 두 묶음 모두와 문턱 아래인 바꿔 말하기는 앱 판정에서 맞음이 아니다(짝 · 같이 해 보기)
    expect(judgeSpeakingQuestion(Q1, "Pizza, they eat.", judgeCtx)).toEqual({
      meaning: "ok",
      final: "retry",
      by: "app",
      expressionDone: false,
    });
  });

  it("AC-22k 일관성: 같은 인식 글 묶음을 혼자 질문(AI 맞음 · 부분 · 다시)과 짝(앱 판정)에 넣으면 맞음 여부 · 묶음 · 표현 수행 · 의사소통 정답이 같고 바꿔 말하기만 알려진 차이다", () => {
    const negatives: Record<number, string[]> = {
      0: ["Yes, they eat pizza.", "They eat rice."],
      1: [
        "Yes, they drink milk.",
        "They drink juice.",
        "No, they drink juice.",
        "They do not drink milk.",
        "They drink milk and juice.",
      ],
      2: ["Yes, they go to the lake.", "No, they go to the park."],
      3: ["No, they wash the cups.", "Yes, they wash the bike."],
    };
    let compared = 0;
    teachSpeaking.content.questions.forEach((q, i) => {
      const texts = [
        ...(q.accepted ?? []),
        ...(q.acceptedMeaning ?? []),
        ...(negatives[i] ?? []),
      ];
      for (const heard of texts) {
        const app = judgeSpeakingQuestion(q, heard, judgeCtx);
        for (const ai of AI_VALUES) {
          const solo = judgeSpeakingQuestion(q, heard, judgeCtx, ai);
          const label = `${q.en} · ${heard} · AI ${ai}`;
          expect(solo.final === "correct", label).toBe(app.final === "correct");
          expect(solo.bundle, label).toBe(app.bundle);
          expect(solo.expressionDone, label).toBe(app.expressionDone);
          expect(solo.communicative, label).toBe(app.communicative);
          expect(solo.ai, label).toBe(ai);
          compared++;
        }
      }
    });
    expect(compared).toBeGreaterThan(0);

    // AI '부분' + 'Yes, they do.' → 맞음 · acceptedMeaning · 의사소통 정답 · 표현 수행 거짓
    expect(
      judgeSpeakingQuestion(Q4, "Yes, they do.", judgeCtx, "partial"),
    ).toEqual({
      meaning: "ok",
      bundle: "meaning",
      ai: "partial",
      final: "correct",
      by: "app",
      communicative: true,
      expressionDone: false,
    });
    // AI '맞음' + 'Yes, they drink milk.' → '다시'(오답), AI 원 판정은 judge.ai 에 남는다(정한 것 6)
    expect(
      judgeSpeakingQuestion(Q2, "Yes, they drink milk.", judgeCtx, "correct"),
    ).toEqual({
      meaning: "direction",
      ai: "correct",
      final: "retry",
      by: "app",
      expressionDone: false,
    });

    // 알려진 차이(우려 19): 의미가 맞고 두 묶음 모두와 문턱 아래인 바꿔 말하기는 혼자(AI 판정을 따름)와 짝(맞음 아님)이 다르다.
    // 증명 절의 'They have pizza.' 꼴은 핵심 낱말 eat 이 빠져 의미 검사에서 걸리므로(key), 의미가 맞는 꼴로 잰다.
    expect(
      judgeSpeakingQuestion(Q1, "They have pizza.", judgeCtx).meaning,
    ).toBe("key");
    for (const [q, heard] of [
      [Q1, "Pizza, they eat."],
      [Q4, "Yes, they wash them."],
    ] as const) {
      expect(bestMatchRate(q.accepted ?? [], heard, opts)).toBeLessThan(PASS);
      expect(bestMatchRate(q.acceptedMeaning ?? [], heard, opts)).toBeLessThan(
        PASS,
      );
      const app = judgeSpeakingQuestion(q, heard, judgeCtx);
      expect(app.final, heard).toBe("retry");
      expect(
        judgeSpeakingQuestion(q, heard, judgeCtx, "correct"),
      ).toMatchObject({
        meaning: "ok",
        ai: "correct",
        final: "correct",
        by: "ai",
      });
      expect(
        judgeSpeakingQuestion(q, heard, judgeCtx, "partial"),
      ).toMatchObject({ final: "partial", by: "ai", expressionDone: false });
      expect(
        judgeSpeakingQuestion(q, heard, judgeCtx, "partial").bundle,
      ).toBeUndefined();
    }
    // AI 맞음인 바꿔 말하기는 높은 쪽 묶음으로 가르되(accepted 0.67 > acceptedMeaning 0.2), accepted 꼴과 문턱 이상으로 맞지 않았으니
    // 표현 수행은 거짓이다(spec 설계 9 '목표 표현을 다 갖춰 말했는가' — 컨트롤러 판단, 검토 M2)
    expect(
      judgeSpeakingQuestion(Q1, "Pizza, they eat.", judgeCtx, "correct"),
    ).toEqual({
      meaning: "ok",
      bundle: "accepted",
      ai: "correct",
      final: "correct",
      by: "ai",
      expressionDone: false,
    });
  });

  it("AC-22k 바른 답이 없는 문항은 첫 accepted 를 바른 답으로 보고, 허용 답이 없는 문항은 판정하지 않는다", () => {
    const { modelAnswer: _m, ...noModel } = Q2;
    expect(
      judgeSpeakingQuestion(noModel, "Yes, they drink milk.", judgeCtx),
    ).toMatchObject({ meaning: "direction", final: "retry" });
    expect(() =>
      judgeSpeakingQuestion({ en: Q2.en }, "No, they drink milk.", judgeCtx),
    ).toThrow();
  });

  it("말하기 판정: AI 판정 점수는 맞음 1 · 부분 0.5 · 다시 0 이다(3.7 · plan-p11c 값 2 질문 답 몫)", () => {
    expect(AI_ANSWER_SCORES).toEqual({ correct: 1, partial: 0.5, retry: 0 });
    expect(aiAnswerScore("correct")).toBe(1);
    expect(aiAnswerScore("partial")).toBe(0.5);
    expect(aiAnswerScore("retry")).toBe(0);
  });

  it("말하기 판정: 안전 상한 뒤 건너뛸 활동은 그 차례부터 남은 혼자 질문 답이고 질문 짝 · 같이 해 보기는 앱 판정이라 남는다", () => {
    const activities = [
      { kind: "together", index: 0 },
      { kind: "repeat-word", index: 0 },
      { kind: "question", index: 0 },
      { kind: "question", index: 1 },
      { kind: "spare", base: "question", index: 0 },
      { kind: "question", index: 2 },
    ];
    expect(skipAfterAiRest(activities, 1)).toEqual([3, 4, 6]);
    expect(skipAfterAiRest(activities, 4)).toEqual([4, 6]);
    expect(skipAfterAiRest(activities, 7)).toEqual([]);
  });

  it("AC-22k 낱말 품사 표 재료: 수업의 질문 · 질문 짝 · 같이 해 보기 글(질문 · 바른 답 · 허용 답 · 이야기)을 모으고 다른 영역 수업은 빈 목록이다", () => {
    const texts = questionTextsOf(teachSpeaking);
    expect(texts).toContain(Q1.en);
    expect(texts).toContain("No, they eat pizza.");
    expect(texts).toContain(Q1.spare?.en);
    expect(texts).toContain(teachSpeaking.teach?.together[0]?.en);
    expect(texts).toContain("Momo and Ted eat cookies.");
    expect(questionTextsOf(teachSeedLessons().reading)).toEqual([]);
  });
});

// 말하기 판정(plan-p11a 파일별 값 4 · 3.3 말하기 · 4절 결과 말 · 6.2 허용 답 · 7절 오류 · 감시 타이머 · 마이크를 쓸 수 없음 행).
// 경계 · 기준 · 재시도 수 · 말소리 없음 수는 시험용 설정(ui.match_phrase_levels · speaking.answer_match_pass · speech.*)에서 읽는다.
import { describe, expect, it } from "vitest";
import {
  answerMaxSecondsKey,
  answerShapeOf,
  englishSentencesOf,
  judgeAppAnswer,
  MIC_CAPTURE_STREAK,
  RESULT_PHRASES,
  resultPhraseOf,
  type SpeakingCounters,
  type SpeechEvent,
  type SpeechVerdict,
  speakingCounters,
  speakingCountersStart,
  speechEventOf,
} from "@/core/speaking/judge";
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

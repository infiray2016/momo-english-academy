// 가르치는 수업 말하기 연결(가르치고 배우는 수업 plan 묶음 라-3 · 델타 spec 설계 1 '틀린 뒤 차례' 말하기 행 · 5 화면 표 · 8 · 10, 정본 15절
// AC-22c · AC-4d · AC-5d · AC-N19 · AC-N20). 입력은 정규 시드 셋의 승인 말하기 수업(seed/lessons/speaking/3/1.json) 그대로다. 순수 함수는 값으로,
// 조각은 renderToStaticMarkup 으로 그려(효과 · 누름은 돌지 않음 — 누름 흐름은 e2e teach.spec.ts) 단계(initial 로 되살림)마다 보이는 것을 본다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("client-only", () => ({}));
vi.mock("@/server/actions/speaking", () => ({}));

import type { PictureLookup } from "@/components/activities/common";
import {
  JudgedQuestionActivity,
  type JudgedQuestionInput,
  ListeningActivity,
  type ListeningInput,
  type QuestionJudgeBy,
  questionFinalOf,
  RepeatActivity,
  type RepeatInput,
  SPEAKING_TEXT,
  type SpeakingEnv,
  type SpeakingTeach,
  TeachStory,
  teacherEnglishSpeech,
} from "@/components/session/speaking";
import { TEACH_TEXT } from "@/components/session/teach/teacher-line";
import {
  type TeachEvidenceContext,
  teachEvidenceOf,
} from "@/core/evidence/teach";
import { LessonFileSchema, type LessonOf } from "@/core/seed/schema/lesson";
import {
  type AttemptInput,
  INPUT_VERSION,
  lemmaLookup,
  parseAttemptInput,
} from "@/core/session/attempt";
import { activitiesOf } from "@/core/session/preview";
import {
  aiRestSkipsOf,
  chunksOf,
  judgedQuestionStageOf,
  repeatTeachStageOf,
  slowRateOf,
} from "@/core/session/teach-frame";
import {
  englishSentencesOf,
  judgeSpeakingQuestion,
  questionTextsOf,
} from "@/core/speaking/judge";
import { type MeaningWord, meaningWordsFor } from "@/core/speaking/meaning";
import { speechSettingsFrom } from "@/core/speech/listen";
import { speakRateOf } from "@/core/speech/pace";
import { teacherViewOf } from "@/core/teacher/roster";
import { piecesSpeech } from "@/lib/speech/pieces";
import type {
  SpeakOptions,
  SpeakOutcome,
  SpeechPort,
} from "@/lib/speech/types";
import { echoMergedInput } from "@/server/speaking";
import {
  defaultSettings,
  referenceSet,
  teacherRoster,
} from "../fixtures/seed/builders";
import { testSettingValues } from "../fixtures/settings";

const ROOT = process.cwd();
const lesson = (() => {
  const file = LessonFileSchema.parse(
    JSON.parse(
      readFileSync(
        join(ROOT, "seed", "lessons", "speaking", "3", "1.json"),
        "utf8",
      ),
    ),
  );
  return file.lessons[0] as LessonOf["speaking"];
})();
const c = lesson.content;
const settings = testSettingValues();
const speechSettings = speechSettingsFrom((key) => settings[key]);
const PASS = settings["speaking.answer_match_pass"] as number;
const LEVELS = settings["ui.match_phrase_levels"] as [number, number];
const vocab: MeaningWord[] = JSON.parse(
  readFileSync(join(ROOT, "seed", "vocab.json"), "utf8"),
).vocab;
const words = meaningWordsFor(questionTextsOf(lesson), vocab);

/** 그리기만 하는 음성 접점(효과가 돌지 않아 부르지 않는다 — 감싼 접점의 같음만 본다). */
const stubSpeech: SpeechPort = {
  device: () => ({ name: "test", recognition: true, synthesis: true }) as never,
  unlockFromGesture: () => {},
  speak: async () => ({ kind: "ended", heard: "played" }),
  cancelSpeaking: () => {},
  listen: () => {
    throw new Error("그리기 시험에서는 듣지 않는다");
  },
  checkMicrophone: async () => ({ ok: true }),
  dispose: () => {},
};
const env = (speech: SpeechPort | undefined = stubSpeech): SpeakingEnv => ({
  speech,
  speechSettings,
  level: 3,
  homophones: [],
  onSpeech: () => "heard",
});
const teachOf = (mode: "solo" | "spare"): SpeakingTeach => ({
  mode,
  teacher: null,
  speechSettings,
});
const pictures: PictureLookup = {
  ofWord: (word) => ({ meaningKo: word, catalogued: false }),
  ofKey: (key) => ({ meaningKo: key, catalogued: false }),
};
/** 판정 글자(AC-5d — 맞음 · 틀림 · 일치율)가 없는가. */
const noVerdictLetters = (out: string) => {
  expect(out).not.toMatch(/맞음|틀림|부분|\d+\s*%/);
};

// ── 순수 함수 ──

describe("말하기 가르치는 수업 순수 함수(AC-4d · AC-N19)", () => {
  it("AC-4d 끊어 들려줄 조각은 시드 chunks 의 '/' 자리이고, 이은 글이 문장과 다르거나 끊는 자리가 없으면 문장 하나다", () => {
    const chunks = c.repeat.chunks ?? [];
    expect(chunks).toHaveLength(c.repeat.sentences.length);
    c.repeat.sentences.forEach((sentence, i) => {
      const pieces = chunksOf(sentence, chunks[i]);
      expect(pieces.length).toBeGreaterThan(1);
      expect(pieces.join(" ")).toBe(sentence);
    });
    expect(
      chunksOf("Dan and Tess come here.", "Dan and Tess / come here."),
    ).toEqual(["Dan and Tess", "come here."]);
    // 시드가 어긋나면 · 끊는 자리가 없으면 · 낱말이면 문장 하나
    expect(chunksOf("Dan and Tess come here.", "Ben / goes home.")).toEqual([
      "Dan and Tess come here.",
    ]);
    expect(chunksOf("eat", undefined)).toEqual(["eat"]);
    expect(chunksOf("eat lunch", "eat lunch")).toEqual(["eat lunch"]);
  });

  it("AC-4d 따라 말하기는 첫 시도가 '잘 말했어요'가 아니면 '왜', '한 번 더 말하기' 뒤는 지금 규칙(상한 없음), 짝은 첫 시도로 맞음 · 틀림이 갈린다", () => {
    const stage = (
      mode: "solo" | "spare",
      heardCount: number,
      firstGood: boolean,
      retrying = false,
    ) => repeatTeachStageOf({ mode, heardCount, firstGood, retrying });
    expect(stage("solo", 0, false)).toBe("ask");
    expect(stage("solo", 1, false)).toBe("why");
    expect(stage("solo", 1, false, true)).toBe("again");
    expect(stage("solo", 3, false, true)).toBe("again");
    // 처음 '잘 말했어요'면 '왜' 없이 지금 규칙(저절로 다음)
    expect(stage("solo", 1, true)).toBe("again");
    expect(stage("spare", 0, false)).toBe("ask");
    expect(stage("spare", 1, true)).toBe("spare-right");
    expect(stage("spare", 1, false)).toBe("spare-wrong");
  });

  it("AC-4d · AC-5d 질문 답 단계: 이야기 → 묻기 → (AI) 기다림 → 맞음이거나 '왜' → 같이 말해 볼까요, 짝은 맞음 · 틀림으로 끝, 소리를 못 들은 답은 판정 없음", () => {
    const of = (over: Partial<Parameters<typeof judgedQuestionStageOf>[0]>) =>
      judgedQuestionStageOf({
        mode: "solo",
        storyPending: false,
        verdict: "none",
        why: true,
        retrying: false,
        ...over,
      });
    expect(of({ storyPending: true })).toBe("story");
    expect(of({})).toBe("ask");
    expect(of({ verdict: "pending" })).toBe("waiting");
    expect(of({ verdict: "failed" })).toBe("failed");
    expect(of({ verdict: "correct" })).toBe("right");
    expect(of({ verdict: "wrong" })).toBe("why");
    expect(of({ verdict: "wrong", retrying: true })).toBe("echo");
    // '왜' 한 줄이 없는 문항 · 가르치는 수업 밖(지금 화면)은 바로 같이 말해 볼까요
    expect(of({ verdict: "wrong", why: false })).toBe("echo");
    expect(of({ verdict: "wrong", mode: undefined })).toBe("echo");
    expect(of({ verdict: "correct", mode: "spare" })).toBe("spare-right");
    expect(of({ verdict: "wrong", mode: "spare" })).toBe("spare-wrong");
    expect(of({ verdict: "unscored" })).toBe("unscored");
  });

  it("AC-N19 'AI 쉬는 중'이면 지금부터 남은 혼자 질문만 건너뛰고(끝 시도가 있는 것 · 지난 것 빼고) 질문 짝 · 같이 해 보기는 남는다", () => {
    const activities = activitiesOf({
      area: "speaking",
      level: 3,
      content: c,
      ...(lesson.teach ? { teach: lesson.teach } : {}),
    } as Parameters<typeof activitiesOf>[0]);
    const questionNos = activities.flatMap((a, i) =>
      a.kind === "question" ? [i + 1] : [],
    );
    expect(questionNos).toHaveLength(c.questions.length);
    const [q1, q2, ...rest] = questionNos;
    if (q1 === undefined || q2 === undefined) throw new Error("질문 둘 이상");
    // 첫 질문은 이미 답함 → 둘째부터
    expect(aiRestSkipsOf(activities, new Set([q1]), q2)).toEqual([q2, ...rest]);
    expect(aiRestSkipsOf(activities, new Set(), q1)).toEqual(questionNos);
    // 짝 · 같이 해 보기는 들지 않는다
    for (const no of aiRestSkipsOf(activities, new Set(), 1))
      expect(activities[no - 1]?.kind).toBe("question");
  });

  it("AC-4d 듣기 이해 같은 문제 다시의 답 덩어리 빠르기는 단계 구간 빠르기에 speech.slow_rate_factor 를 곱한 더 느린 값이다", () => {
    const factor = settings["speech.slow_rate_factor"] as number;
    expect(factor).toBeGreaterThan(0);
    expect(factor).toBeLessThan(1);
    const rate = speakRateOf(3, speechSettings);
    expect(slowRateOf(rate, factor)).toBeCloseTo(rate * factor);
    expect(slowRateOf(rate, factor)).toBeLessThan(rate);
  });

  it("AC-N20 질문 끝 시도: 이야기를 소리로 못 들었으면 기술 오류(판 2 speak_fail), 다시 듣기는 story.replayed 로만 남는다", () => {
    expect(
      questionFinalOf({
        heard: ["No, they eat pizza."],
        failures: 0,
        story: { heard: false, replayed: false },
      }),
    ).toEqual({
      heard: ["No, they eat pizza."],
      failures: 0,
      story: { replayed: false },
      v: 2,
      techError: "speak_fail",
    });
    expect(
      questionFinalOf(
        {
          heard: ["x"],
          failures: 1,
          story: { heard: true, replayed: true },
        },
        { echo: "No, they eat pizza." },
      ),
    ).toEqual({
      heard: ["x"],
      failures: 1,
      story: { replayed: true },
      echo: "No, they eat pizza.",
    });
    // 이야기 화면이 없는 질문(지금 화면)은 story 칸이 없다
    expect(questionFinalOf({ heard: [], failures: 0 })).toEqual({
      heard: [],
      failures: 0,
    });
  });
});

// ── 조각 읽기 감싸기 ──

/** 부른 글 · 빠르기를 적는 가짜 접점(결과는 차례대로 outcomes, 다 쓰면 들려줌). */
function recordingSpeech(outcomes: SpeakOutcome[] = []) {
  const calls: { text: string; options?: SpeakOptions }[] = [];
  const port: SpeechPort = {
    ...stubSpeech,
    speak: async (text, options) => {
      calls.push({ text, ...(options ? { options } : {}) });
      return outcomes.shift() ?? { kind: "ended", heard: "played" };
    },
  };
  return { port, calls };
}

describe("조각 읽기(AC-4d · AC-N20)", () => {
  it("AC-4d 따라 말하기 같은 문제 다시는 시드 chunks 조각을 차례로 읽는다", async () => {
    const { port, calls } = recordingSpeech();
    const sentence = c.repeat.sentences[0] ?? "";
    const pieces = chunksOf(sentence, c.repeat.chunks?.[0]);
    const chunked = piecesSpeech(
      port,
      () => pieces.map((text) => ({ text })),
      0,
    );
    const out = await chunked.speak(sentence, { rate: 0.8 });
    expect(calls.map((call) => call.text)).toEqual(pieces);
    expect(calls.every((call) => call.options?.rate === 0.8)).toBe(true);
    expect(out).toEqual({ kind: "ended", heard: "played" });
  });

  it("AC-4d 듣기 이해 같은 문제 다시는 대본을 그대로 읽은 뒤 답 덩어리를 느린 빠르기로 읽는다", async () => {
    const { port, calls } = recordingSpeech();
    const item = c.listening[0];
    if (!item?.retryHighlight) throw new Error("승인 수업 듣기 꼴");
    const answer = item.retryHighlight;
    const slow = piecesSpeech(
      port,
      (script) => [{ text: script }, { text: answer, rate: 0.5 }],
      0,
    );
    await slow.speak(item.script, { rate: 0.8 });
    expect(calls).toEqual([
      { text: item.script, options: { rate: 0.8 } },
      { text: answer, options: { rate: 0.5 } },
    ]);
  });

  it("AC-N20 조각 모두를 들려주지 못하면 들려주지 못함, 하나라도 소리가 났으면 들려준 것으로 모은다", async () => {
    const notPlayed: SpeakOutcome = { kind: "ended", heard: "not_played" };
    const none = recordingSpeech([notPlayed, notPlayed]);
    const pieces = () => [{ text: "Dan and Tess" }, { text: "come here." }];
    expect(await piecesSpeech(none.port, pieces, 0).speak("x")).toEqual({
      kind: "ended",
      heard: "not_played",
    });
    const mixed = recordingSpeech([notPlayed]);
    expect(await piecesSpeech(mixed.port, pieces, 0).speak("x")).toEqual({
      kind: "ended",
      heard: "no_end",
    });
  });
});

// ── 따라 말하기 ──

const repeatHtml = (
  text: string,
  initial: RepeatInput | undefined,
  teach: (SpeakingTeach & { chunks: readonly string[] }) | undefined,
) =>
  renderToStaticMarkup(
    createElement(RepeatActivity, {
      text,
      env: env(),
      phraseLevels: LEVELS,
      autoNextSeconds: 2,
      ...(initial ? { initial } : {}),
      ...(teach ? { teach } : {}),
      onChange: () => {},
      onDone: () => {},
    }),
  );

describe("따라 말하기 화면(AC-4d)", () => {
  const sentence = c.repeat.sentences[0] ?? "";
  const chunks = chunksOf(sentence, c.repeat.chunks?.[0]);
  const solo = { ...teachOf("solo"), chunks };

  it("AC-4d 첫 시도 결과 말이 '잘 말했어요'가 아니면 같은 문항에 '왜'(앱 문구 '끊어서 다시 들어 봐요.')와 '한 번 더 말하기'가 나온다", () => {
    const out = repeatHtml(sentence, { heard: ["zzz qqq"], failures: 0 }, solo);
    expect(out).toContain('data-teach-stage="why"');
    expect(out).toContain(TEACH_TEXT.whyRepeat);
    expect(out).toContain('data-teach-retry="speak"');
    expect(out).toContain(TEACH_TEXT.retry.speak);
    // '왜' 동안에는 작은 '다음' · 말하기 단추를 두지 않는다
    expect(out).not.toContain("data-speak=");
    expect(out).toContain("data-teacher-line");
  });

  it("AC-4d '한 번 더 말하기' 뒤 같은 문제 다시는 끊어 들려주는 접점으로 바뀌고 지금 규칙('한 번 더 말하기' · '다음')이 이어진다", () => {
    const out = repeatHtml(
      sentence,
      { heard: ["zzz qqq"], failures: 0, retrying: true },
      solo,
    );
    expect(out).toContain('data-teach-stage="again"');
    expect(out).toContain('data-chunked=""');
    expect(out).not.toContain("data-teach-why");
    expect(out).toContain(SPEAKING_TEXT.oneMore);
    expect(out).toContain(SPEAKING_TEXT.next);
  });

  it("AC-4d 처음 '잘 말했어요'면 '왜' 없이 지금 규칙이고, 가르치는 수업 밖은 지금 화면 그대로다", () => {
    const good = repeatHtml(sentence, { heard: [sentence], failures: 0 }, solo);
    expect(good).toContain('data-phrase="good"');
    expect(good).not.toContain("data-teach-why");
    const plain = repeatHtml(
      sentence,
      { heard: ["zzz qqq"], failures: 0 },
      undefined,
    );
    expect(plain).not.toContain("data-teach-stage");
    expect(plain).not.toContain("data-teach-why");
    expect(plain).toContain(SPEAKING_TEXT.oneMore);
  });

  it("AC-22c 따라 말하기 짝은 처음 '잘 말했어요'면 '혼자 해냈어요!', 아니면 '다음'만(같은 문제 다시 없음)", () => {
    const spareText = c.repeat.spares?.sentences[0] ?? "";
    const spare = { ...teachOf("spare"), chunks: [spareText] };
    const right = repeatHtml(
      spareText,
      { heard: [spareText], failures: 0 },
      spare,
    );
    expect(right).toContain('data-teach-stage="spare-right"');
    expect(right).toContain(TEACH_TEXT.spareRight);
    const wrong = repeatHtml(
      spareText,
      { heard: ["zzz qqq"], failures: 0 },
      spare,
    );
    expect(wrong).toContain('data-teach-stage="spare-wrong"');
    expect(wrong).toContain(SPEAKING_TEXT.next);
    expect(wrong).not.toContain(SPEAKING_TEXT.oneMore);
    expect(wrong).not.toContain("data-teach-why");
  });
});

// ── 듣기 이해 ──

const listeningHtml = (
  item: Parameters<typeof ListeningActivity>[0]["item"],
  initial: ListeningInput | undefined,
  mode: "solo" | "spare" | undefined,
) =>
  renderToStaticMarkup(
    createElement(ListeningActivity, {
      item,
      level: 3,
      pictures,
      speech: stubSpeech,
      ...(initial ? { initial } : {}),
      ...(mode
        ? {
            teach: {
              ...teachOf(mode),
              slowRate: 0.6,
              pauseMs: 0,
            },
          }
        : {}),
      onChange: () => {},
      onDone: () => {},
    }),
  );

describe("듣기 이해 화면(AC-4d)", () => {
  const item = c.listening[0];
  if (!item?.whyKo || !item.spare?.whyKo) throw new Error("승인 수업 듣기 꼴");
  const whyKo = item.whyKo;
  const spare = item.spare;
  const spareWhy = item.spare.whyKo;
  const right = item.answerNo;
  const wrong = (right % item.options.length) + 1;
  const wrong2 =
    (wrong % item.options.length) + 1 === right
      ? ((wrong + 1) % item.options.length) + 1
      : (wrong % item.options.length) + 1;

  it("AC-4d 처음 틀리면 '왜'(시드 whyKo)와 '한 번 더 풀기'가 나오고 정답은 아직 없다", () => {
    const out = listeningHtml(item, { tries: [wrong] }, "solo");
    expect(out).toContain('data-teach-stage="why"');
    expect(out).toContain(whyKo);
    expect(out).toContain(TEACH_TEXT.retry.solve);
    expect(out).not.toContain(SPEAKING_TEXT.answerIs);
    expect(out).not.toContain(SPEAKING_TEXT.listenAgain);
  });

  it("AC-4d 같은 문제 다시는 대본 뒤 답 덩어리를 천천히 읽는 접점으로 다시 묻고, 둘째도 틀리면 정답이다", () => {
    const again = listeningHtml(
      item,
      { tries: [wrong], retrying: true },
      "solo",
    );
    expect(again).toContain('data-listening-stage="ask"');
    expect(again).toContain('data-slow-answer=""');
    const reveal = listeningHtml(item, { tries: [wrong, wrong2] }, "solo");
    expect(reveal).toContain(SPEAKING_TEXT.answerIs);
    expect(reveal).toContain('data-choice-state="answer"');
    // 가르치는 수업 밖은 지금 '한 번 더 듣기'
    expect(listeningHtml(item, { tries: [wrong] }, undefined)).toContain(
      SPEAKING_TEXT.listenAgain,
    );
  });

  it("AC-22c 듣기 짝은 처음 맞으면 '혼자 해냈어요!', 틀리면 정답과 짝의 '왜' 한 줄이고 '다음'은 줄을 읽은 뒤 밝다", () => {
    const spareWrong = (spare.answerNo % spare.options.length) + 1;
    const ok = listeningHtml(spare, { tries: [spare.answerNo] }, "spare");
    expect(ok).toContain(TEACH_TEXT.spareRight);
    const out = listeningHtml(spare, { tries: [spareWrong] }, "spare");
    expect(out).toContain('data-teach-stage="spare-wrong"');
    expect(out).toContain(spareWhy);
    expect(out).toContain('data-choice-state="answer"');
    expect(out).toMatch(/data-teach-next=""[^>]*disabled=""/);
    expect(out).not.toContain(TEACH_TEXT.retry.solve);
  });
});

// ── 질문 답 · 이야기 ──

const question = c.questions[0];
if (!question?.storyEn || !question.whyKo || !question.modelAnswer)
  throw new Error("승인 수업 질문 꼴");
const story = question.storyEn;
const questionHtml = (
  q: Parameters<typeof JudgedQuestionActivity>[0]["question"],
  judge: QuestionJudgeBy,
  initial: JudgedQuestionInput | undefined,
  mode: "solo" | "spare" | undefined,
) =>
  renderToStaticMarkup(
    createElement(JudgedQuestionActivity, {
      question: q,
      showKo: true,
      env: env(),
      answerShape: "one-sentence",
      capSeconds: 10,
      judge,
      ...(mode ? { teach: teachOf(mode) } : {}),
      ...(initial ? { initial } : {}),
      onChange: () => {},
      onDone: () => {},
    }),
  );
const AI: QuestionJudgeBy = {
  by: "ai",
  evaluate: async () => ({ ok: false, reason: "unavailable" }),
  waitHintSeconds: settings["ui.wait_hint_seconds"] as [number, number],
};
const APP: QuestionJudgeBy = { by: "app", pass: PASS };
const MEANING: QuestionJudgeBy = { by: "meaning", pass: PASS, words };
const HEARD_STORY = { heard: true, replayed: false };

describe("질문 답 화면 · 이야기 화면(AC-22c · AC-4d · AC-5d · AC-N20)", () => {
  it("AC-22c 혼자 질문은 이야기 화면(글자 없이 소리만 — 듣기 표시 · '다시 듣기' · '다음')이 먼저이고 질문 글은 아직 없다", () => {
    const out = questionHtml(question, AI, undefined, "solo");
    expect(out).toContain('data-question-answer-stage="story"');
    expect(out).toContain("data-teach-story");
    expect(out).toContain("data-listening-mark");
    expect(out).toContain('data-teach-action="listen-again"');
    expect(out).not.toContain(story);
    expect(out).not.toContain(question.en);
  });

  it("AC-22c 이야기 뒤 다음 화면은 영어 질문과 말하기 단추이고 이야기 글은 없다", () => {
    const out = questionHtml(
      question,
      AI,
      { heard: [], failures: 0, story: HEARD_STORY },
      "solo",
    );
    expect(out).toContain('data-question-answer-stage="ask"');
    expect(out).toContain(question.en);
    expect(out).not.toContain(story);
    expect(out).toContain("data-speak=");
  });

  it("AC-5d AI 판정을 기다리는 동안 인식 글과 기다림 표시만 있고 판정 글자는 없다", () => {
    const out = questionHtml(
      question,
      AI,
      {
        heard: ["They eat pizza."],
        failures: 0,
        story: HEARD_STORY,
        attemptId: "00000000-0000-4000-8000-000000000009",
      },
      "solo",
    );
    expect(out).toContain('data-question-answer-stage="waiting"');
    expect(out).toContain("data-wait-hint");
    expect(out).toMatch(/data-heard=""[^>]*>They eat pizza\.</);
    expect(out).not.toContain(SPEAKING_TEXT.speak);
    noVerdictLetters(out);
  });

  it("AC-4d 부분 · 다시면 '왜'(시드)와 '한 번 더 말하기' → 바른 답(시드)을 보이며 '같이 말해 볼까요'이고 판정 글자 · 결과 말은 없다", () => {
    const why = questionHtml(
      question,
      APP,
      { heard: ["zzz qqq"], failures: 0, story: HEARD_STORY },
      "solo",
    );
    expect(why).toContain('data-question-answer-stage="why"');
    expect(why).toContain(question.whyKo);
    expect(why).toContain('data-teach-retry="speak"');
    expect(why).not.toContain("data-model-answer");
    noVerdictLetters(why);
    const echo = questionHtml(
      question,
      APP,
      { heard: ["zzz qqq"], failures: 0, story: HEARD_STORY, retrying: true },
      "solo",
    );
    expect(echo).toContain('data-question-answer-stage="echo"');
    expect(echo).toMatch(
      new RegExp(`data-model-answer[\\s\\S]*${question.modelAnswer}`),
    );
    expect(echo).toContain(SPEAKING_TEXT.together);
    expect(echo).not.toContain(SPEAKING_TEXT.oneMore);
    expect(echo).not.toContain("잘 말했어요");
    noVerdictLetters(echo);
  });

  it("AC-22c 질문 짝은 이야기 뒤 앱 판정(의미 검사 · 허용 답 두 묶음): 처음 맞으면 '혼자 해냈어요!', 틀리면 '왜'와 바른 답을 보이고 '다음'은 들려준 뒤 밝다", () => {
    const spare = question.spare;
    if (!spare?.whyKo || !spare.modelAnswer) throw new Error("질문 짝 꼴");
    expect(questionHtml(spare, MEANING, undefined, "spare")).toContain(
      'data-question-answer-stage="story"',
    );
    const right = questionHtml(
      spare,
      MEANING,
      { heard: [spare.accepted[0] ?? ""], failures: 0, story: HEARD_STORY },
      "spare",
    );
    expect(right).toContain('data-question-answer-stage="spare-right"');
    expect(right).toContain(TEACH_TEXT.spareRight);
    // 일치율이 높아도 방향이 틀리면 맞음이 아니다(의미 검사 — 설계 8)
    const flipped = (spare.modelAnswer ?? "").replace(/^No,/, "Yes,");
    const wrong = questionHtml(
      spare,
      MEANING,
      { heard: [flipped], failures: 0, story: HEARD_STORY },
      "spare",
    );
    expect(wrong).toContain('data-question-answer-stage="spare-wrong"');
    expect(wrong).toContain(spare.whyKo);
    expect(wrong).toContain(spare.modelAnswer);
    expect(wrong).not.toContain(SPEAKING_TEXT.together);
    expect(wrong).toMatch(/<button[^>]*disabled=""[^>]*>다음</);
    noVerdictLetters(wrong);
  });

  it("AC-N20 이야기를 소리로 못 들은 채 낸 답은 판정 없이(결과 말 · 바른 답 없음) 기술 오류로 끝낸다", () => {
    const out = questionHtml(
      question,
      APP,
      {
        heard: ["No, they eat pizza."],
        failures: 0,
        story: { heard: false, replayed: false },
      },
      "solo",
    );
    expect(out).toContain('data-question-answer-stage="unscored"');
    expect(out).not.toContain("잘 말했어요");
    expect(out).not.toContain("data-model-answer");
    expect(out).not.toContain("data-teach-why");
  });

  it("AC-N20 이야기 화면은 처음에 다시 해 보기 안내가 없고, '다시 듣기' · '다음'은 저절로 들려주기가 끝나기 전에는 흐리다", () => {
    const out = renderToStaticMarkup(
      createElement(TeachStory, {
        storyEn: story,
        speech: stubSpeech,
        onNext: () => {},
      }),
    );
    expect(out).not.toContain(story);
    expect(out).not.toContain("data-sound-retry");
    expect(out).toMatch(/data-teach-action="listen-again"[^>]*disabled=""/);
    expect(out).toMatch(
      /disabled=""[^>]*data-teach-action="next"|data-teach-action="next"[^>]*disabled=""/,
    );
  });
});

// ── fix 1: 선생님 영어 목소리(M1) · '같이 말해 볼까요' 뒤 말을 같은 끝 시도 행에(I1) ──

describe("선생님이 보이는 영어의 목소리(AC-3h · fix 1 M1)", () => {
  it("AC-3h 가르치는 수업의 질문 · 바른 답 · 따라 말하기 본보기는 고른 선생님의 영어 목소리(높이 · 목소리 순서)로 읽고, 가르치는 수업 밖과 고르기 전은 세션 접점 그대로다", async () => {
    const mina = teacherViewOf(
      teacherRoster().teachers.find((t) => t.key === "mina") ??
        teacherRoster().teachers[0] ??
        (() => {
          throw new Error("명단");
        })(),
    );
    const { port, calls } = recordingSpeech();
    const voiced = teacherEnglishSpeech(port, { teacher: mina });
    await voiced?.speak(question.en, { rate: 0.8 });
    expect(calls[0]?.options).toMatchObject({
      rate: 0.8,
      pitch: mina.voice.pitch,
      voicePrefer: mina.voice.prefer,
    });
    // 가르치는 수업 밖(teach 없음) · 고르기 전(선생님 null — 기본 목소리, C130)은 그대로
    expect(teacherEnglishSpeech(port, undefined)).toBe(port);
    expect(teacherEnglishSpeech(port, { teacher: null })).toBe(port);
    expect(teacherEnglishSpeech(undefined, { teacher: mina })).toBeUndefined();
  });
});

describe("AI 질문 '같이 말해 볼까요' 뒤 말(AC-22k · fix 1 I1)", () => {
  const ref = referenceSet(defaultSettings());
  const judgeCtx = { pass: PASS, homophones: [], words };
  const evidenceCtx: TeachEvidenceContext = {
    answerMatchPass: PASS,
    homophones: [],
    unitWords: lesson.unitWords,
    lemmaOf: lemmaLookup(ref.vocab.vocab),
    appJudgedQuestions: false,
    repeatGoodRate: LEVELS[0],
    meaningWords: words,
    // 평가 spec 8절 evidence.match_cut 기본값(teach-evidence 시험과 같은 시험 값)
    matchCut: [0.6, 0.8],
  };
  const activities = activitiesOf({
    area: "speaking",
    level: 3,
    content: c,
    ...(lesson.teach ? { teach: lesson.teach } : {}),
  } as Parameters<typeof activitiesOf>[0]);
  const qActivity = activities.find(
    (a) => a.kind === "question" && a.index === 0,
  );
  if (!qActivity) throw new Error("질문 활동");
  const modelAnswer = question.modelAnswer ?? "";
  /** 서버 액션이 저장한 AI 질문 끝 시도(방향이 틀린 답 — AI 맞음이지만 합친 판정 '다시'). */
  const saved = {
    v: INPUT_VERSION,
    kind: "question",
    step: "final",
    heard: ["Yes, they eat rice."],
    failures: 0,
    story: { replayed: false },
    judge: judgeSpeakingQuestion(
      question,
      "Yes, they eat rice.",
      judgeCtx,
      "correct",
    ),
  } as AttemptInput;

  it("AC-22k echo 를 합친 끝 시도는 한 행에서 영어로 말한 문장 둘(답 · echo)로 세고, 근거는 그 행의 retry(echo)로 읽는다", () => {
    const merged = echoMergedInput(saved, ` ${modelAnswer} `);
    expect(parseAttemptInput(merged)).toEqual(merged);
    expect(merged).toMatchObject({
      echo: modelAnswer,
      judge: (saved as { judge?: unknown }).judge,
    });
    expect(englishSentencesOf([saved])).toBe(1);
    expect(englishSentencesOf([merged])).toBe(2);
    const evidence = teachEvidenceOf({
      lessonKey: "lesson-row-1",
      lesson,
      activity: qActivity,
      input: merged,
      ctx: evidenceCtx,
    });
    expect(evidence?.accuracy).toBe("wrong");
    expect(evidence?.retry).toEqual({ assist: ["echo"], accuracy: "correct" });
    // 합치기 전 행에는 retry 가 없다
    expect(
      teachEvidenceOf({
        lessonKey: "lesson-row-1",
        lesson,
        activity: qActivity,
        input: saved,
        ctx: evidenceCtx,
      })?.retry,
    ).toBeUndefined();
  });

  it("AC-22k echo 는 한 번만 합친다(다시 보냄 · 끊김 뒤 같은 시도 id — 이미 있으면 그대로), 빈 글 · 질문 끝 시도가 아니면 그대로다", () => {
    const merged = echoMergedInput(saved, modelAnswer);
    expect(echoMergedInput(merged, "They eat pizza.")).toBe(merged);
    expect(echoMergedInput(saved, "  ")).toBe(saved);
    const listening = {
      v: INPUT_VERSION,
      kind: "listening",
      step: "final",
      tries: [1],
    } as AttemptInput;
    expect(echoMergedInput(listening, modelAnswer)).toBe(listening);
  });
});

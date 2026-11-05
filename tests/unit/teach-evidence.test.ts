// 가르치는 수업 시도의 수행 근거 값(plan 2026-10-29 가르치고 배우는 수업 바 · 정한 것 9 · '이름' 절 근거 칸 표, 델타 spec 설계 8 · 9,
// 평가 spec 5판 3절 · 정본 04 '수행 근거 칸'). 수업은 3단계 단원 1 정규 시드 셋(teachSeedLessons)을 그대로 읽는다. 시험 이름은 정본 15절
// 번호다. 수준 셈(AC-22g 의 기회 1 · 2 · 0, AC-22h 의 독립 2, AC-22j 의 '1 을 넘지 않음')은 평가 plan 의 근거 상태 함수 몫이라, 여기서는
// 그 함수가 읽을 근거 칸 값만 보고 수준 값이 근거 칸에 없음을 본다. 수준 셈 시험은 평가 plan 의 근거 함수와 같이 돈다.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type TeachEvidenceContext,
  teachEvidenceOf,
} from "@/core/evidence/teach";
import { type AttemptInput, lemmaLookup } from "@/core/session/attempt";
import { type Activity, activitiesOf } from "@/core/session/preview";
import { judgeSpeakingQuestion, questionTextsOf } from "@/core/speaking/judge";
import { type MeaningWord, meaningWordsFor } from "@/core/speaking/meaning";
import {
  defaultSettings,
  referenceSet,
  teachSeedLessons,
} from "../fixtures/seed/builders";
import { TEST_SETTINGS } from "../fixtures/settings";

const SEED = resolve(__dirname, "../../seed");
const ref = referenceSet(defaultSettings());
const teach = teachSeedLessons();
const vocab: MeaningWord[] = JSON.parse(
  readFileSync(join(SEED, "vocab.json"), "utf8"),
).vocab;
/**
 * 따라 말하기 정확도 경계(평가 spec 8절 evidence.match_cut 기본값 0.6 · 0.8 — 아직 seed/settings.json 에 없는 키라 시험 값으로 둔다. 첫째 값 이상 부분,
 * 둘째 값 이상 정답).
 */
const MATCH_CUT = [0.6, 0.8] as const;
const LESSON_KEY = "lesson-row-1";

const ctxOf = (
  lesson: { unitWords: readonly string[] },
  extraWords: readonly string[] = [],
): TeachEvidenceContext => ({
  answerMatchPass: TEST_SETTINGS["speaking.answer_match_pass"].value,
  homophones: [],
  unitWords: [...lesson.unitWords, ...extraWords],
  lemmaOf: lemmaLookup(ref.vocab.vocab),
  // 3단계 혼자 질문은 AI 판정(시도 꼴 judge 칸 — 서버 액션이 채움)
  appJudgedQuestions: false,
  repeatGoodRate: TEST_SETTINGS["ui.match_phrase_levels"].value[0],
  meaningWords: meaningWordsFor(questionTextsOf(teach.speaking), vocab),
  matchCut: MATCH_CUT,
});

const final = (kind: string, content: Record<string, unknown>) =>
  ({ v: 2, kind, step: "final", ...content }) as unknown as AttemptInput;
const must = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error("값 없음");
  return value;
};

function activitiesFor(area: "reading" | "writing" | "speaking"): Activity[] {
  const lesson = teach[area];
  return activitiesOf({
    area,
    level: 3,
    content: lesson.content,
    teach: lesson.teach,
  } as Parameters<typeof activitiesOf>[0]);
}
const find = (acts: readonly Activity[], match: (a: Activity) => boolean) =>
  must(acts.find(match));
const solo = (acts: readonly Activity[], kind: string, index: number) =>
  find(acts, (a) => a.kind === kind && "index" in a && a.index === index);
const spare = (acts: readonly Activity[], base: string, index: number) =>
  find(acts, (a) => a.kind === "spare" && a.base === base && a.index === index);

const reading = teach.reading;
const readingActs = activitiesFor("reading");
const writing = teach.writing;
const writingActs = activitiesFor("writing");
const speaking = teach.speaking;
const speakingActs = activitiesFor("speaking");
const wrongNo = (answerNo: number) => (answerNo === 1 ? 2 : 1);
/** 조립 문항 정답 글 → 카드(마침표 카드 따로). */
const cardsOf = (answer: string) => answer.replace(/\.$/, " .").split(" ");

const evidenceOf = (
  area: "reading" | "writing" | "speaking",
  activity: Activity,
  input: AttemptInput,
  ctx: TeachEvidenceContext = ctxOf(teach[area]),
) =>
  must(
    teachEvidenceOf({
      lessonKey: LESSON_KEY,
      lesson: teach[area],
      activity,
      input,
      ctx,
    }),
  );

/** 근거 칸 어디에도 수준 값(level · 수준 숫자 칸)이 없다(AC-22k — A9 확정 전 운영 판정에 새지 않게). */
const hasNoLevel = (value: unknown) =>
  expect(JSON.stringify(value)).not.toMatch(/"level"|"score"/);

const readQ0 = must(reading.content.questions[0]);
const writeI0 = must(
  writing.content.shape === "items" ? writing.content.items[0] : undefined,
);
const speakQ = (i: number) => must(speaking.content.questions[i]);
const ctxSpeak = ctxOf(speaking);
const judgeCtx = {
  pass: ctxSpeak.answerMatchPass,
  homophones: ctxSpeak.homophones,
  words: ctxSpeak.meaningWords,
};

describe("AC-22e 같이 해 보기 · '왜' 뒤 다시 · 짝의 근거 칸", () => {
  it("같이 해 보기 시도는 validity practice · assist together 이고 task 는 그 문항 것이다", () => {
    const item = must(reading.teach?.together[0]);
    const ev = evidenceOf(
      "reading",
      find(readingActs, (a) => a.kind === "together" && a.index === 0),
      final("together", { index: 0, tries: [{ choice: item.answerNo }] }),
    );
    expect(ev.validity).toBe("practice");
    expect(ev.assist).toEqual(["together"]);
    expect(ev.task).toBe(item.type);
    expect(ev.ctx.item).toBe(`${LESSON_KEY}:together.0`);
    hasNoLevel(ev);
  });

  it("말하기 같이 해 보기(질문)도 practice 이고 판정 칸의 묶음을 그대로 남긴다", () => {
    const item = must(speaking.teach?.together[0]);
    const heard = must(item.accepted[0]);
    const judge = judgeSpeakingQuestion(item, heard, judgeCtx);
    const ev = evidenceOf(
      "speaking",
      find(speakingActs, (a) => a.kind === "together" && a.index === 0),
      final("together", { index: 0, tries: [{ heard }], judge }),
    );
    expect(ev.validity).toBe("practice");
    expect(ev.task).toBe("question");
    expect(ev.result.bundle).toBe("accepted");
    expect(ev.accuracy).toBe("correct");
  });

  it("읽기 혼자 문항의 '왜' 뒤 같은 문제 다시는 같은 근거 칸에 retry_after_answer 도움 시도로 남는다", () => {
    const ev = evidenceOf(
      "reading",
      solo(readingActs, "reading-question", 0),
      final("reading-question", {
        tries: [wrongNo(readQ0.answerNo), readQ0.answerNo],
      }),
    );
    expect(ev.accuracy).toBe("wrong");
    expect(ev.assist).toEqual(["none"]);
    expect(ev.retry).toEqual({
      assist: ["retry_after_answer"],
      accuracy: "correct",
    });
    expect(ev.validity).toBe("valid");
  });

  it("쓰기 · 듣기는 retry_after_answer, 말하기 질문은 echo, 따라 말하기는 model_heard 로 다시 시도를 남긴다", () => {
    const wrongTiles = [...must(writeI0.accepted[0]).split(" ")].reverse();
    const writingEv = evidenceOf(
      "writing",
      solo(writingActs, "writing-item", 0),
      final("writing-item", {
        tries: [
          { kind: "tiles", pieces: wrongTiles },
          { kind: "tiles", pieces: cardsOf(must(writeI0.accepted[0])) },
        ],
      }),
    );
    expect(writingEv.retry?.assist).toEqual(["retry_after_answer"]);

    const l0 = must(speaking.content.listening[0]);
    const listenEv = evidenceOf(
      "speaking",
      solo(speakingActs, "listening", 0),
      final("listening", { tries: [wrongNo(l0.answerNo), l0.answerNo] }),
    );
    expect(listenEv.retry).toEqual({
      assist: ["retry_after_answer"],
      accuracy: "correct",
    });

    const q1 = speakQ(1);
    const wrongJudge = judgeSpeakingQuestion(
      q1,
      "Yes, they drink milk.",
      judgeCtx,
      "correct",
    );
    const questionEv = evidenceOf(
      "speaking",
      solo(speakingActs, "question", 1),
      final("question", {
        heard: ["Yes, they drink milk."],
        failures: 0,
        echo: must(q1.accepted?.[0]),
        judge: wrongJudge,
      }),
    );
    expect(questionEv.accuracy).toBe("wrong");
    expect(questionEv.retry).toEqual({ assist: ["echo"], accuracy: "correct" });

    const target = must(speaking.content.repeat.sentences[0]);
    const repeatEv = evidenceOf(
      "speaking",
      solo(speakingActs, "repeat-sentence", 0),
      final("repeat-sentence", { heard: ["pizza", target], failures: 0 }),
    );
    expect(repeatEv.accuracy).toBe("wrong");
    expect(repeatEv.retry).toEqual({
      assist: ["model_heard"],
      accuracy: "correct",
    });
  });

  it("짝 첫 시도는 짝을 둔 혼자 문항과 같은 task · goals, 다른 ctx.item · ctx.example 의 새 근거 칸이고 purpose 는 비운다", () => {
    const soloEv = evidenceOf(
      "reading",
      solo(readingActs, "reading-question", 0),
      final("reading-question", { tries: [readQ0.answerNo] }),
    );
    const spareEv = evidenceOf(
      "reading",
      spare(readingActs, "reading-question", 0),
      final("reading-question", {
        slot: "spare",
        tries: [must(readQ0.spare).answerNo],
      }),
    );
    expect(spareEv.task).toBe(soloEv.task);
    expect(spareEv.goals).toEqual(soloEv.goals);
    expect(spareEv.goals).toEqual(["read-3-1-1"]);
    expect(spareEv.ctx.item).not.toBe(soloEv.ctx.item);
    expect(spareEv.ctx.example).not.toBe(soloEv.ctx.example);
    expect(spareEv.ctx.item).toBe(`${LESSON_KEY}:reading-question.0.spare`);
    expect(spareEv.accuracy).toBe("correct");
    expect(spareEv).not.toHaveProperty("purpose");
  });
});

describe("AC-22e 짝 행의 다시 시도", () => {
  it("짝 행에 다시 시도가 들어와도 retry 를 적지 않는다(짝 틀림은 기회 0)", () => {
    const sp = must(readQ0.spare);
    const readingEv = evidenceOf(
      "reading",
      spare(readingActs, "reading-question", 0),
      final("reading-question", {
        slot: "spare",
        tries: [wrongNo(sp.answerNo), sp.answerNo],
      }),
    );
    expect(readingEv.accuracy).toBe("wrong");
    expect(readingEv).not.toHaveProperty("retry");
    const q0 = speakQ(0);
    const questionEv = evidenceOf(
      "speaking",
      spare(speakingActs, "question", 0),
      final("question", {
        slot: "spare",
        heard: ["Yes, they eat cake."],
        failures: 0,
        echo: must(q0.spare?.accepted[0]),
      }),
    );
    expect(questionEv).not.toHaveProperty("retry");
  });
});

describe("AC-22g 합성 기록의 근거 칸(수준 셈은 평가 plan 의 근거 함수와 같이 돈다)", () => {
  it("'혼자 첫 시도 오답 → 같은 문제 다시 정답 → 짝 첫 시도 정답'은 근거 칸 둘(혼자 행의 도움 시도 · 짝 행의 독립 시도)이다", () => {
    const soloEv = evidenceOf(
      "writing",
      solo(writingActs, "writing-item", 0),
      final("writing-item", {
        tries: [
          { kind: "tiles", pieces: ["is", "pink."] },
          { kind: "tiles", pieces: cardsOf(must(writeI0.accepted[0])) },
        ],
      }),
    );
    const sp = must(writeI0.spare);
    const spareRight = evidenceOf(
      "writing",
      spare(writingActs, "writing-item", 0),
      final("writing-item", {
        slot: "spare",
        tries: [{ kind: "tiles", pieces: cardsOf(must(sp.accepted[0])) }],
      }),
    );
    const spareWrong = evidenceOf(
      "writing",
      spare(writingActs, "writing-item", 0),
      final("writing-item", {
        slot: "spare",
        tries: [{ kind: "tiles", pieces: ["x"] }],
      }),
    );
    expect(soloEv.accuracy).toBe("wrong");
    expect(soloEv.retry?.accuracy).toBe("correct");
    expect(spareRight.assist).toEqual(["none"]);
    expect(spareRight.accuracy).toBe("correct");
    expect(spareRight.retry).toBeUndefined();
    expect(spareWrong.accuracy).toBe("wrong");
    expect([spareRight.task, spareRight.goals]).toEqual([
      soloEv.task,
      soloEv.goals,
    ]);
    hasNoLevel([soloEv, spareRight, spareWrong]);
  });

  it("두 목표에 이어진 문항은 목표 목록 하나로 남기고 목표마다 나누지 않는다", () => {
    const lesson = {
      ...reading,
      content: {
        ...reading.content,
        questions: reading.content.questions.map((q, i) =>
          i === 0 ? { ...q, goal: ["read-3-1-1", "read-3-1-2"] } : q,
        ),
      },
    };
    const ev = must(
      teachEvidenceOf({
        lessonKey: LESSON_KEY,
        lesson,
        activity: solo(readingActs, "reading-question", 0),
        input: final("reading-question", { tries: [readQ0.answerNo] }),
        ctx: ctxOf(reading),
      }),
    );
    expect(ev.goals).toEqual(["read-3-1-1", "read-3-1-2"]);
  });

  it("말하기 질문 · 듣기 · 따라 말하기는 각자의 목표(speak-3-1-3 · speak-3-1-2 · speak-3-1-1)에 잇는다", () => {
    const q0 = speakQ(0);
    const heard = must(q0.accepted?.[0]);
    const questionEv = evidenceOf(
      "speaking",
      solo(speakingActs, "question", 0),
      final("question", {
        heard: [heard],
        failures: 0,
        judge: judgeSpeakingQuestion(q0, heard, judgeCtx, "correct"),
      }),
    );
    const listenEv = evidenceOf(
      "speaking",
      solo(speakingActs, "listening", 0),
      final("listening", {
        tries: [must(speaking.content.listening[0]).answerNo],
      }),
    );
    const repeatEv = evidenceOf(
      "speaking",
      solo(speakingActs, "repeat-word", 0),
      final("repeat-word", {
        heard: [must(speaking.content.repeat.words[0])],
        failures: 0,
      }),
    );
    expect([questionEv.goals, listenEv.goals, repeatEv.goals]).toEqual([
      ["speak-3-1-3"],
      ["speak-3-1-2"],
      ["speak-3-1-1"],
    ]);
    expect([questionEv.task, listenEv.task, repeatEv.task]).toEqual([
      "question",
      "listening",
      "repeat",
    ]);
  });
});

describe("AC-22h 질문 속 낱말 노출", () => {
  it("답 낱말이 질문에 있는 '예' 질문에 알맞게 응답한 첫 시도는 도움 없음 · 맞음이고 그 낱말만 question_word 다", () => {
    const q3 = speakQ(3);
    const heard = "Yes, they wash the cups.";
    const ev = evidenceOf(
      "speaking",
      solo(speakingActs, "question", 3),
      final("question", {
        heard: [heard],
        failures: 0,
        story: { replayed: true },
        judge: judgeSpeakingQuestion(q3, heard, judgeCtx, "correct"),
      }),
    );
    expect(ev.assist).toEqual(["none"]);
    expect(ev.accuracy).toBe("correct");
    expect(ev.validity).toBe("valid");
    expect(ev.exposure).toEqual({ wash: "question_word" });
    expect(ev.result.expressionDone).toBe(true);
    hasNoLevel(ev);
  });

  it("이야기에만 있고 질문 글에 없는 낱말은 none 이고 이야기 다시 듣기는 도움이 아니다", () => {
    const q1 = speakQ(1);
    const heard = "No, they drink milk.";
    const ev = evidenceOf(
      "speaking",
      solo(speakingActs, "question", 1),
      final("question", {
        heard: [heard],
        failures: 0,
        story: { replayed: true },
        judge: judgeSpeakingQuestion(q1, heard, judgeCtx, "correct"),
      }),
      ctxOf(speaking, ["milk"]),
    );
    expect(ev.exposure).toEqual({ drink: "question_word", milk: "none" });
    expect(ev.assist).toEqual(["none"]);
    expect(ev.ctx.example).toBe(`${LESSON_KEY}:question.1.storyEn`);
  });
});

describe("AC-22j 읽기 도움 기록", () => {
  const act = solo(readingActs, "reading-question", 0);
  it("읽어 주기 · 뜻 보기를 쓴 첫 답은 assist read_aloud · gloss(출처 기기)다", () => {
    const ev = evidenceOf(
      "reading",
      act,
      final("reading-question", {
        tries: [readQ0.answerNo],
        aid: { readAloud: true, gloss: ["wash"] },
      }),
    );
    expect(ev.assist).toEqual(["read_aloud", "gloss"]);
    expect(ev.source.assist).toBe("device");
    expect(ev.accuracy).toBe("correct");
    expect(JSON.stringify(ev)).not.toContain('"wash"');
  });

  it("하나만 쓰면 그 값 하나, 짝 글에서 쓴 도움도 짝 첫 답에 남는다", () => {
    const readOnly = evidenceOf(
      "reading",
      act,
      final("reading-question", {
        tries: [readQ0.answerNo],
        aid: { readAloud: true },
      }),
    );
    const glossSpare = evidenceOf(
      "reading",
      spare(readingActs, "reading-question", 0),
      final("reading-question", {
        slot: "spare",
        tries: [must(readQ0.spare).answerNo],
        aid: { gloss: ["home"] },
      }),
    );
    expect(readOnly.assist).toEqual(["read_aloud"]);
    expect(glossSpare.assist).toEqual(["gloss"]);
    expect(glossSpare.source.assist).toBe("device");
  });

  it("쓰지 않은 첫 답에는 그 값이 없고 none(출처 기기)이다", () => {
    const ev = evidenceOf(
      "reading",
      act,
      final("reading-question", { tries: [readQ0.answerNo] }),
    );
    expect(ev.assist).toEqual(["none"]);
    expect(ev.source.assist).toBe("device");
  });
});

describe("AC-22k 의사소통 정답의 근거 몫", () => {
  it("AI '부분'이어도 acceptedMeaning 으로 갈린 혼자 질문 답은 부분 + communicative(판정은 맞음), 표현 수행 거짓이고 수준 값이 없다", () => {
    const q3 = speakQ(3);
    const heard = "Yes, they do.";
    const judge = judgeSpeakingQuestion(q3, heard, judgeCtx, "partial");
    expect(judge.bundle).toBe("meaning");
    const ev = evidenceOf(
      "speaking",
      solo(speakingActs, "question", 3),
      final("question", { heard: [heard], failures: 0, judge }),
    );
    expect(ev.accuracy).toBe("partial");
    expect(ev.result).toEqual({
      judge: "correct",
      ai: "partial",
      bundle: "meaning",
      communicative: true,
      expressionDone: false,
    });
    expect(ev.assist).toEqual(["none"]);
    hasNoLevel(ev);
  });

  it("질문 짝은 판정 칸이 없어도 같은 판정 함수로 묶음 · communicative 를 채운다", () => {
    const sp = must(speakQ(3).spare);
    const heard = must(sp.acceptedMeaning?.[0] ?? sp.accepted[0]);
    const ev = evidenceOf(
      "speaking",
      spare(speakingActs, "question", 3),
      final("question", { slot: "spare", heard: [heard], failures: 0 }),
    );
    const judge = judgeSpeakingQuestion(sp, heard, judgeCtx);
    expect(ev.result.bundle).toBe(judge.bundle);
    expect(ev.result.expressionDone).toBe(judge.expressionDone);
    expect(ev.result.judge).toBe("correct");
    expect(ev.accuracy).toBe(judge.communicative ? "partial" : "correct");
    expect(ev.goals).toEqual(["speak-3-1-3"]);
  });

  it("근거 칸에 인식 글 원문이 없다", () => {
    const heard = "Yes, they do.";
    const ev = evidenceOf(
      "speaking",
      solo(speakingActs, "question", 3),
      final("question", {
        heard: [heard],
        failures: 0,
        judge: judgeSpeakingQuestion(speakQ(3), heard, judgeCtx, "correct"),
      }),
    );
    expect(JSON.stringify(ev)).not.toContain(heard);
  });
});

describe("소리 없이 낸 답 · 건너뜀은 기술 오류(technical)", () => {
  it("대본을 들려주지 못한 듣기 답은 technical speak_fail(출처 기기)이다", () => {
    const ev = evidenceOf(
      "speaking",
      solo(speakingActs, "listening", 0),
      final("listening", { tries: [], techError: "speak_fail" }),
    );
    expect(ev.validity).toEqual({ technical: "speak_fail" });
    expect(ev.source.validity).toBe("device");
    expect(ev.accuracy).toBe("no_answer");
  });

  it("건너뛴 까닭은 정본 04 의 기술 오류 이름으로 바꾼다", () => {
    const cases = [
      ["recognition", "recognition"],
      ["stalled", "recognition"],
      ["no_mic", "no_mic"],
      ["silent", "nospeech"],
      ["ai_rest", "ai_rest"],
    ] as const;
    for (const [skipped, technical] of cases) {
      const ev = evidenceOf(
        "speaking",
        solo(speakingActs, "question", 0),
        final("question", { heard: [], failures: 0, skipped }),
      );
      expect(ev.validity).toEqual({ technical });
    }
  });

  it("판정 칸 없는 AI 질문 끝 시도는 technical ai_fail 이다", () => {
    const ev = evidenceOf(
      "speaking",
      solo(speakingActs, "question", 0),
      final("question", { heard: ["No, they eat pizza."], failures: 0 }),
    );
    expect(ev.validity).toEqual({ technical: "ai_fail" });
  });
});

describe("정확도 · 근거 칸이 없는 자리", () => {
  it("쓰기 조립에서 대문자만 틀린 답은 부분이다", () => {
    const cards = cardsOf(must(writeI0.accepted[0]));
    const lower = [cards[0]?.toLowerCase() ?? "", ...cards.slice(1)];
    const ev = evidenceOf(
      "writing",
      solo(writingActs, "writing-item", 0),
      final("writing-item", { tries: [{ kind: "tiles", pieces: lower }] }),
    );
    expect(ev.accuracy).toBe("partial");
    expect(ev.task).toBe(writeI0.type);
    expect(ev.goals).toEqual(["write-3-1-1"]);
  });

  it("따라 말하기 정확도는 경계 둘(평가 spec evidence.match_cut)로 정답 · 부분 · 오답을 가른다", () => {
    const target = must(speaking.content.repeat.sentences[0]);
    const words = target.split(" ");
    const act = solo(speakingActs, "repeat-sentence", 0);
    const of = (heard: string) =>
      evidenceOf(
        "speaking",
        act,
        final("repeat-sentence", { heard: [heard], failures: 0 }),
      );
    expect(of(target).accuracy).toBe("correct");
    expect(of(words.slice(0, -1).join(" ")).accuracy).toBe("correct");
    expect(of(words.slice(0, -2).join(" ")).accuracy).toBe("partial");
    expect(of("pizza").accuracy).toBe("wrong");
    expect(of(target).result.rate).toBe(1);
  });

  it("오늘 배울 것 · 본보기 · 미리보기 · 지문 · 진행 시도에는 근거 칸이 없다", () => {
    const none = (activity: Activity, input: AttemptInput) =>
      teachEvidenceOf({
        lessonKey: LESSON_KEY,
        lesson: reading,
        activity,
        input,
        ctx: ctxOf(reading),
      });
    expect(none({ kind: "today" }, final("today", {}))).toBeUndefined();
    expect(
      none({ kind: "model", index: 0 }, final("model", { index: 0 })),
    ).toBeUndefined();
    expect(
      none({ kind: "preview" }, final("preview", { shownWords: [] })),
    ).toBeUndefined();
    expect(
      none(
        { kind: "reading-passage" },
        final("reading-passage", { tappedWords: [] }),
      ),
    ).toBeUndefined();
    expect(
      none(solo(readingActs, "reading-question", 0), {
        ...final("reading-question", { tries: [1] }),
        step: "progress",
      } as AttemptInput),
    ).toBeUndefined();
  });

  it("노린 단원 단어는 문항 정답에 든 단원 단어 원형이다", () => {
    const ev = evidenceOf(
      "writing",
      solo(writingActs, "writing-item", 0),
      final("writing-item", {
        tries: [{ kind: "tiles", pieces: cardsOf(must(writeI0.accepted[0])) }],
      }),
    );
    expect(ev.words).toEqual(["bedroom"]);
  });
});

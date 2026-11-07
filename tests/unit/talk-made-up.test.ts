// 회화 1~3단계 '지어낸 경험 꼴' 실시간 검사('AI 몫 넓힘' 묶음 2 — spec 판 4 설계 3 자기 이야기 행 · 13절 C211 (1) · 02-2 198줄 · AC-15zc (라)).
// 선생님 문장 · 끝인사가 시드 꼴(정규화한 구, 낱말 경계)에 걸리면 지우거나(질문은 남음) 카드 끝인사로 바꾼다. 표는 plan 2 행(69줄) 그대로다.
import { describe, expect, it } from "vitest";
import type { TalkLessonOutput } from "@/core/ai/calls/talk-lesson";
import {
  type LessonArgs,
  talkLessonPositionOf,
  teacherTurnPlansOf,
} from "@/core/conversation/lesson-flow";
import { madeUpHit } from "@/core/conversation/made-up";
import { farewellMadeUp } from "@/server/conversation/closing";
import {
  createLessonSentenceFlow,
  settleLessonTurn,
} from "@/server/conversation/lesson-turn";
import { seedTalkMadeUpPhrases } from "@/server/seed-lists";
import {
  CARD3,
  LOW,
  MID,
  NEW3,
  opening3,
  SPEC3,
  said,
} from "../fixtures/talk-lesson";

const PHRASES = ["yesterday i", "when i was", "i remember"];
const HITS = [
  "Yesterday I went to the lake.",
  "When I was little, I swam.",
  "I remember my first fish.",
];
const MISSES = ["I like the lake!", "Let's pretend we are ducks!", "Me too!"];

function out(over: Partial<TalkLessonOutput> = {}): TalkLessonOutput {
  return {
    child_kind: "answer",
    stuck: false,
    tori_en: "",
    model_line: "",
    choices: [],
    tori_ko: [],
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    response_fit: false,
    child_topic: false,
    child_asked: false,
    goal_suggest: [],
    next_move: "none",
    card_item: { kind: "none", no: 0 },
    next_goal: [],
    support: "none",
    next_targets: [],
    next_hint_ko: "",
    next_hints: [],
    next_usable_phrases: [],
    next_answer_example: "",
    image_word: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
}

describe("madeUpHit — 지어낸 경험 꼴(정규화 · 낱말 경계)", () => {
  it("AC-15zc (라) 과거 경험 · 개인 기억 꼴은 걸리고, 좋아하는 것 · 상상 놀이 · 맞장구는 걸리지 않는다", () => {
    for (const sentence of HITS)
      expect(madeUpHit(sentence, PHRASES), sentence).not.toBeNull();
    for (const sentence of MISSES)
      expect(madeUpHit(sentence, PHRASES), sentence).toBeNull();
    expect(madeUpHit("When I was little, I swam.", PHRASES)).toBe("when i was");
  });

  it("줄임꼴을 펼치고 낱말 경계로 본다 · 목록이 비면 검사하지 않는다", () => {
    expect(madeUpHit("Hmm, I remember!", PHRASES)).toBe("i remember");
    expect(madeUpHit("Do you remember it?", PHRASES)).toBeNull();
    expect(madeUpHit("Kiwis remember a lot.", PHRASES)).toBeNull();
    expect(madeUpHit("When I'm happy, I sing!", PHRASES)).toBeNull();
    expect(madeUpHit("Yesterday I went to the lake.", [])).toBeNull();
  });

  it("AC-15zc (라) 시드 지어낸 경험 꼴 목록도 plan 표의 걸림 · 안 걸림을 그대로 가른다", () => {
    const seed = seedTalkMadeUpPhrases();
    for (const sentence of HITS)
      expect(madeUpHit(sentence, seed), sentence).not.toBeNull();
    for (const sentence of MISSES)
      expect(madeUpHit(sentence, seed), sentence).toBeNull();
  });
});

describe("문장 문 · 끝 처리의 지어낸 경험 지움(AC-15zc (라) 서버 몫)", () => {
  function args3(): LessonArgs {
    return {
      spec: SPEC3,
      card: CARD3,
      newWords: NEW3,
      turns: opening3(),
      segment: "talk",
      settings: LOW,
      prepWords: ["play", "soccer", "sunday"],
    };
  }
  const range = new Set(
    "do you like the lake i go to went yesterday it oh nice me too".split(" "),
  );

  it("AC-15zc (라) 1~3단계 AI 차례의 지어낸 경험 꼴 문장은 화면 · 읽어 주기 · 원문에 없고 질문은 남는다", () => {
    const args = args3();
    const { ifAnswered } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    const flow = createLessonSentenceFlow({
      low: true,
      ifAnswered,
      ifStuck: null,
      asked: talkLessonPositionOf(args).askedQuestions,
      max: LOW.sameQuestionMax,
      live: { cuePhrases: [], madeUp: PHRASES, situation: null },
    });
    flow.stuck(false);
    const states = [
      "Oh, nice!",
      "Yesterday I went to the lake.",
      "Do you like the lake?",
    ].map((s) => flow.accept(s));
    expect(states).toEqual(["send", "drop", "hold"]);
    expect(flow.entries()[1]).toMatchObject({
      state: "dropped",
      reason: "made_up",
    });
    const result = settleLessonTurn({
      flow,
      outcome: {
        kind: "ok",
        value: out({
          next_targets: ["sunday"],
          tori_ko: ["좋아!", "어제 호수에 갔어.", "호수 좋아해?"],
        }),
        hintsBlocked: false,
        overLength: 0,
      },
      ctx: {
        card: CARD3,
        turns: [...args.turns, said()],
        asked: talkLessonPositionOf(args).askedQuestions,
        max: LOW.sameQuestionMax,
        low: true,
        koMeaning: true,
        dropped: [],
        spec: SPEC3,
        lineOptions: {
          sentenceMaxWords: 8,
          allowedWords: range,
          unitWords: NEW3,
          childWords: [],
          teacherName: "Mina",
          lemmaOf: () => undefined,
          forms: [],
          allowedForms: new Set(),
        },
      },
    });
    expect(result.kept).toEqual(["Oh, nice!", "Do you like the lake?"]);
    expect(result.text).not.toContain("Yesterday");
    expect(result.rewrite).not.toContain("Yesterday");
    // 지운 문장의 뜻도 빠진다(문장마다 뜻)
    expect(result.ko).toBe("좋아! 호수 좋아해?");
  });

  it("4단계부터는 지어낸 경험 꼴을 실시간으로 지우지 않는다(고침 전 그대로)", () => {
    const args = args3();
    const { ifAnswered } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    const flow = createLessonSentenceFlow({
      low: false,
      ifAnswered,
      ifStuck: null,
      asked: new Map(),
      max: MID.sameQuestionMax,
      live: { cuePhrases: [], madeUp: PHRASES, situation: null },
    });
    expect(flow.accept("Yesterday I went to the lake.")).toBe("send");
  });
});

describe("1~3단계 끝인사(closing.ts farewellMadeUp — 지금 끝인사 걸림 길로 카드 끝인사)", () => {
  it("AC-15zc (라) 1~3단계 끝인사가 지어낸 경험 꼴에 걸리면 카드 끝인사로 바뀌고, 4단계 · 걸리지 않은 끝인사는 그대로다", () => {
    expect(farewellMadeUp(3, "I remember my first fish! Bye!", PHRASES)).toBe(
      true,
    );
    expect(farewellMadeUp(1, "Yesterday I ate rice. See you!", PHRASES)).toBe(
      true,
    );
    expect(farewellMadeUp(3, "You talked about fish! Bye!", PHRASES)).toBe(
      false,
    );
    expect(farewellMadeUp(4, "I remember my first fish! Bye!", PHRASES)).toBe(
      false,
    );
  });
});

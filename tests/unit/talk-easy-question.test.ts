// 쉬운 질문 자리의 노리는 단어 검사(13절 C250 (2), AC-15zj (아)). 받침 둘째의 AI 쉬운 질문 자리에서 그 응답의 영어 힌트가 그 질문 자리의 힌트
// 단으로 남으면 노리는 단원 단어 검사(target_word)를 걸지 않는다. 그 까닭은 그 뒤 아이 차례의 힌트 종류가 '영어'라 '말했다'로 세지 않기
// 때문이므로, 조건이 참이면 실제 함수들(talkLessonPositionOf → lessonChildRowOf)로 만든 그 뒤 아이 행의 힌트 종류가 '영어'임을 단언한다.
// 실제 API 를 부르지 않는다. 설계 숫자는 시험용 설정에서 읽는다.
import { describe, expect, it } from "vitest";
import type { TalkLessonOutput } from "@/core/ai/calls/talk-lesson";
import type { Masker } from "@/core/ai/mask";
import {
  type LessonArgs,
  nextTeacherTurnOf,
  talkLessonPositionOf,
} from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import {
  TALK_SUPPORT_STAGE_EASY,
  TALK_SUPPORT_STAGE_TOGETHER,
} from "@/core/conversation/move";
import { checkLowLevelQuestion } from "@/core/conversation/question-check";
import { saidWordsOf } from "@/core/conversation/said";
import {
  createLessonSentenceFlow,
  type LessonEasyHintContext,
  type LessonOutcomeView,
  lessonAiQuestionHintsOf,
  lessonChildRowOf,
  lessonEasyEnglishHintOf,
  lessonEasySlotOf,
  type QuestionRetryAnswer,
  settleLessonTurn,
  withQuestionRetry,
} from "@/server/conversation/lesson-turn";
import {
  aiTurn,
  button,
  CARD3,
  LOW,
  NEW3,
  opening3,
  SPEC3,
  said,
  teacher,
} from "../fixtures/talk-lesson";

/** 빈 응답 위에 고칠 칸만 얹는다(AI 차례 — 이어 묻기). */
function answer(over: Partial<TalkLessonOutput> = {}): TalkLessonOutput {
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
    response_fit: true,
    child_topic: false,
    child_asked: false,
    goal_suggest: [],
    next_move: "follow_up",
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

const OPTIONS = {
  sentenceMaxWords: 8,
  allowedWords: new Set(
    "do you like it oh nice i what is fun okay sport when your free day where play here a new one".split(
      " ",
    ),
  ),
  unitWords: NEW3,
  childWords: ["play"],
  teacherName: "Mina",
  lemmaOf: () => undefined,
  forms: [],
  allowedForms: new Set<string>(),
};

/** 3단계 힌트 단 규격(뜻 · 영어 틀 · 영어 문장 — 단계 규격 hintTiers 꼴)과 카드 힌트 칸(AI 질문 자리라 카드 항목 힌트는 읽지 않는다). */
const HINT_SPEC: LessonEasyHintContext["spec"] & { koMeaning: boolean } = {
  band: "1-3",
  hintTiers: ["ko", "frame", "sentence"],
  usablePhrases: 0,
  koMeaning: true,
};
const HINT_CARD = { greeting: CARD3.greeting, required: [], more: [] };

const argsOf = (turns: TalkLessonTurn[]): LessonArgs => ({
  spec: SPEC3,
  card: CARD3,
  newWords: NEW3,
  turns,
  segment: "talk",
  settings: LOW,
  prepWords: CARD3.prep ?? [],
});

/** 받침 둘째의 AI 질문 자리: 필수 1 에 답한 뒤 선생님의 AI 질문에 '잘 모르겠어요'를 두 번 누른 행(이번 아이 행까지). */
function easySlotTurns(): TalkLessonTurn[] {
  return [
    ...opening3(),
    said(),
    aiTurn("Oh, nice! What is fun?", { next: "follow_up" }, "Soccer is fun."),
    button(),
    teacher("That's okay!", {
      kind: "card_slot",
      why: "support",
      stage: TALK_SUPPORT_STAGE_TOGETHER,
      cause: "button",
    }),
    button(),
  ];
}

/** 서버 lessonTurnAfterChild 가 만드는 그대로의 C250 힌트 재료(이번 아이 행까지의 위치). */
function easyHintOf(turns: TalkLessonTurn[]): LessonEasyHintContext {
  return {
    spec: HINT_SPEC,
    card: HINT_CARD,
    liveRows: [],
    turns,
    position: talkLessonPositionOf(argsOf(turns)),
  };
}

function flowFor(turns: TalkLessonTurn[], sentences: string[]) {
  const a = argsOf(turns);
  const plan = nextTeacherTurnOf(a);
  const asked = talkLessonPositionOf(a).askedQuestions;
  const flow = createLessonSentenceFlow({
    low: true,
    ifAnswered: plan,
    ifStuck: null,
    asked,
    max: LOW.sameQuestionMax,
  });
  flow.stuck(false);
  for (const en of sentences) flow.accept(en);
  const easyHint = easyHintOf(turns);
  const settle = (
    f: Parameters<typeof settleLessonTurn>[0]["flow"],
    view: LessonOutcomeView,
  ) =>
    settleLessonTurn({
      flow: f,
      outcome: view,
      ctx: {
        card: CARD3,
        turns,
        asked,
        max: LOW.sameQuestionMax,
        low: true,
        koMeaning: true,
        dropped: [],
        spec: SPEC3,
        lineOptions: OPTIONS,
        easyHint,
      },
    });
  return { plan, flow, settle, easyHint };
}

const okView = (
  value: TalkLessonOutput,
  hintsBlocked = false,
): LessonOutcomeView => ({ kind: "ok", value, hintsBlocked, overLength: 0 });

const identity: Masker = (text) => ({ text, names: 0, contacts: 0 });
type ChildState = Parameters<typeof lessonChildRowOf>[1]["state"];

/** 쉬운 질문이 나간 뒤의 아이 행(서버 lessonTurnOf 꼴의 선생님 행을 더한 위치 · 저장 행으로 lessonChildRowOf). 힌트를 누르지 않고 들은 도움 없음. */
function nextChildRow(
  turns: TalkLessonTurn[],
  result: ReturnType<typeof settleLessonTurn>,
  say: string,
) {
  const answerExample = result.aiQuestion?.answerExample ?? "";
  const after: TalkLessonTurn[] = [
    ...turns,
    {
      speaker: "teacher",
      text: result.text,
      move: result.move,
      answerExample: answerExample === "" ? null : answerExample,
    },
  ];
  const position = talkLessonPositionOf(argsOf(after));
  const row = lessonChildRowOf(
    {
      sessionId: "00000000-0000-4000-8000-000000000000",
      clientAttemptId: "c250",
      input: { mode: "speech", text: say },
      hint: { opened: 0, heard: [] },
    },
    {
      state: {
        spec: HINT_SPEC,
        card: HINT_CARD,
        position,
        turns: after,
        liveRows: [{ speaker: "tori", aiQuestion: result.aiQuestion }],
        segment: "talk",
      } as unknown as ChildState,
      masker: identity,
    },
  );
  return { row, position };
}

const EASY_HINTS = {
  next_hint_ko: "축구를 좋아하는지 물어요.",
  next_hints: ["Yes, I ___.", "Yes, I like soccer."],
};

describe("C250 (2) 질문 검사(순수): 쉬운 자리 + 영어 힌트 단이면 노리는 단어 검사만 걸지 않는다", () => {
  const check = (
    sentence: string,
    easySlot?: { choices: number; englishHint?: boolean },
  ) =>
    checkLowLevelQuestion(sentence, {
      ...OPTIONS,
      targets: ["soccer"],
      ...(easySlot === undefined ? {} : { easySlot }),
    });

  it("AC-15zj (아): 조건 참이면 노린 단원 단어가 든 질문이 지나고, 조건 거짓이면 target_word 로 걸린다", () => {
    expect(
      check("Do you like soccer?", { choices: 0, englishHint: true }),
    ).toEqual({ ok: true });
    expect(
      check("Do you like soccer?", { choices: 0, englishHint: false }),
    ).toEqual({ ok: false, reason: "target_word", words: ["soccer"] });
    expect(check("Do you like soccer?", { choices: 0 })).toEqual({
      ok: false,
      reason: "target_word",
      words: ["soccer"],
    });
  });

  it("AC-15zj (아): 조건이 참이어도 긴 질문은 too_long, 예 · 아니요도 선택지 둘도 아닌 질문은 not_easy, 범위 밖 낱말은 offband 로 걸린다", () => {
    const easy = { choices: 0, englishHint: true };
    expect(
      check("Do you like to play soccer here on a free day?", easy),
    ).toEqual({ ok: false, reason: "too_long" });
    expect(check("Where do you play soccer?", easy)).toEqual({
      ok: false,
      reason: "not_easy",
    });
    expect(check("Do you like pizza and soccer?", easy)).toMatchObject({
      ok: false,
      reason: "offband",
    });
    // 선택지 둘이 딸린 질문은 wh 질문이어도 쉬운 질문이다(꼴 검사 그대로)
    expect(
      check("What sport is fun?", { choices: 2, englishHint: true }),
    ).toEqual({ ok: true });
  });

  it("AC-15zj (아): 쉬운 자리가 아니면 조건 값과 관계없이 지금처럼 걸린다(easySlot 이 없으면 englishHint 를 볼 자리가 없다)", () => {
    expect(check("Do you like soccer?")).toEqual({
      ok: false,
      reason: "target_word",
      words: ["soccer"],
    });
  });
});

describe("C250 (2) 조건(lessonEasyEnglishHintOf): 저장 식 · 힌트 단 조립과 같은 함수", () => {
  const turns = easySlotTurns();
  const ctx = easyHintOf(turns);
  const of = (value: TalkLessonOutput, hintsBlocked = false) =>
    lessonEasyEnglishHintOf(ctx, {
      question: "Do you like soccer?",
      hints: lessonAiQuestionHintsOf(value, hintsBlocked),
    });

  it("이번 아이 행까지의 위치는 같은 질문 자리의 둘째 막힘이다(받침 둘째 · 마지막 단까지 열림)", () => {
    expect(ctx.position.slot?.question).toBe("What is fun?");
    expect(ctx.position.stuckInSlot).toBe(TALK_SUPPORT_STAGE_EASY);
  });

  it("영어 힌트가 남으면 참, 힌트 검사에 걸렸거나 영어 힌트가 비었으면(뜻만 있어도) 거짓이다", () => {
    expect(of(answer(EASY_HINTS))).toBe(true);
    expect(of(answer(EASY_HINTS), true)).toBe(false);
    expect(of(answer({ ...EASY_HINTS, next_hints: [] }))).toBe(false);
    expect(of(answer({ next_hints: [], next_hint_ko: "" }))).toBe(false);
  });

  it("질문 자리가 없거나(닫힘) 그 자리의 힌트가 카드 칸에서 오면 거짓이다", () => {
    expect(
      lessonEasyEnglishHintOf(
        { ...ctx, position: { ...ctx.position, slot: null } },
        {
          question: "Do you like soccer?",
          hints: lessonAiQuestionHintsOf(answer(EASY_HINTS), false),
        },
      ),
    ).toBe(false);
    // 쉬운 질문 글이 카드 인사 질문과 같은 질문 열쇠면 그 칸의 힌트가 힌트 단이다(AI 힌트가 아니다)
    expect(
      lessonEasyEnglishHintOf(ctx, {
        question: "Do you like Sunday?",
        hints: lessonAiQuestionHintsOf(answer(EASY_HINTS), false),
      }),
    ).toBe(false);
  });

  it("lessonEasySlotOf 는 쉬운 자리에서만 englishHint 를 싣는다(거짓이면 칸이 없다)", () => {
    const { plan } = flowFor(turns, []);
    const hint = {
      ctx,
      question: "Do you like soccer?",
      hintsBlocked: false,
    };
    expect(lessonEasySlotOf(plan, answer(EASY_HINTS), true, hint)).toEqual({
      choices: 0,
      englishHint: true,
    });
    expect(
      lessonEasySlotOf(plan, answer(EASY_HINTS), true, {
        ...hint,
        hintsBlocked: true,
      }),
    ).toEqual({ choices: 0 });
    expect(lessonEasySlotOf(plan, answer(EASY_HINTS), true)).toEqual({
      choices: 0,
    });
    expect(
      lessonEasySlotOf(plan, answer(EASY_HINTS), false, hint),
    ).toBeUndefined();
    expect(
      lessonEasySlotOf({ ...plan, stage: 0 }, answer(EASY_HINTS), true, hint),
    ).toBeUndefined();
  });
});

describe("C250 (2) 끝 처리(서버): 조건이 참이면 질문이 나가고 그 뒤 아이 차례의 힌트 종류는 '영어'다", () => {
  it("AC-15zj (아): 노린 단원 단어가 든 쉬운 질문 + 영어 힌트 → 다시 쓰기 없이 나가고 선생님 행에 영어 힌트가 저장되며, 그 뒤 아이 행은 누르지 않고 들은 도움이 없어도 힌트 종류 '영어'이고 '말했다'가 없다", async () => {
    const turns = easySlotTurns();
    const { plan, flow, settle, easyHint } = flowFor(turns, [
      "Okay!",
      "Do you like soccer?",
    ]);
    expect(plan).toMatchObject({
      kind: "ai",
      aiAsks: true,
      stage: TALK_SUPPORT_STAGE_EASY,
    });
    const value = answer({
      tori_en: "Okay! Do you like soccer?",
      next_targets: ["soccer"],
      next_answer_example: "Yes, I like soccer.",
      ...EASY_HINTS,
    });
    let calls = 0;
    const out = await withQuestionRetry({
      flow,
      view: okView(value),
      lineOptions: OPTIONS,
      sentenceMaxWords: 8,
      easyHint,
      retry: async () => {
        calls += 1;
        return null;
      },
    });
    expect(calls).toBe(0);
    expect(out.retried).toBe(false);
    const result = settle(out.flow, out.view);
    expect(result.replaced).toBeNull();
    expect(result.questionDropped).toBe(false);
    expect(result.kept.at(-1)).toBe("Do you like soccer?");
    expect(result.aiQuestion).toMatchObject({
      en: "Do you like soccer?",
      hintKo: EASY_HINTS.next_hint_ko,
      hints: EASY_HINTS.next_hints,
    });
    const { row, position } = nextChildRow(turns, result, "I like soccer.");
    // 받침 행은 새 자리를 열지 않는다: 같은 자리 · 같은 막힘 수 · 마지막 질문 글은 쉬운 질문
    expect(position.slot?.question).toBe("Do you like soccer?");
    expect(position.stuckInSlot).toBe(TALK_SUPPORT_STAGE_EASY);
    expect(row.hintKind).toBe("english");
    expect(row.hintLevel).toBeGreaterThan(0);
    expect(
      saidWordsOf({
        aiWords: ["soccer"],
        heard: "I like soccer.",
        hintKind: row.hintKind,
        unitWords: NEW3,
        lemmaOf: () => undefined,
        homophones: [],
      }),
    ).toEqual([]);
  });

  it("AC-15zj (아): 힌트 검사에 걸린(hintsBlocked) 응답 · 영어 힌트가 빈 응답은 지금처럼 target_word 로 걸려 다시 쓰기 길로 가고, 다시 쓰지 못하면 카드 자리다", async () => {
    for (const [value, blocked] of [
      [
        answer({
          tori_en: "Okay! Do you like soccer?",
          next_targets: ["soccer"],
          ...EASY_HINTS,
        }),
        true,
      ],
      [
        answer({
          tori_en: "Okay! Do you like soccer?",
          next_targets: ["soccer"],
          next_hint_ko: EASY_HINTS.next_hint_ko,
        }),
        false,
      ],
    ] as const) {
      const turns = easySlotTurns();
      const { flow, settle, easyHint } = flowFor(turns, [
        "Okay!",
        "Do you like soccer?",
      ]);
      const reasons: string[] = [];
      const out = await withQuestionRetry({
        flow,
        view: okView(value, blocked),
        lineOptions: OPTIONS,
        sentenceMaxWords: 8,
        easyHint,
        retry: async ({ reason }) => {
          reasons.push(reason);
          return null;
        },
      });
      expect(reasons).toEqual(["target_word"]);
      const result = settle(out.flow, out.view);
      expect(result.replaced).toBe("question_check");
      expect(result.kept).not.toContain("Do you like soccer?");
    }
  });

  it("다시 쓴 응답에도 같은 조건을 건다: 다른 까닭으로 다시 쓴 쉬운 질문에 노린 단어 + 영어 힌트가 있으면 나가고, 노림 안전망이 힌트를 비우면 걸린다", async () => {
    const turns = easySlotTurns();
    // (가) 첫 시도는 길이로 걸림(노린 단어 없음) → 다시 쓴 질문에 노린 단어 + 영어 힌트 → 나간다
    const a = flowFor(turns, [
      "Okay!",
      "Do you like to play here on a free day?",
    ]);
    const retryA = flowFor(turns, ["Okay!", "Do you like soccer?"]).flow;
    const outA = await withQuestionRetry({
      flow: a.flow,
      view: okView(
        answer({ tori_en: "Okay! Do you like to play here on a free day?" }),
      ),
      lineOptions: OPTIONS,
      sentenceMaxWords: 8,
      easyHint: a.easyHint,
      retry: async () =>
        ({
          value: answer({
            tori_en: "Okay! Do you like soccer?",
            next_targets: ["soccer"],
            ...EASY_HINTS,
          }),
          entries: retryA.entries(),
          hintsBlocked: false,
          overLength: 0,
          blocked: 0,
        }) satisfies QuestionRetryAnswer,
    });
    expect(outA.retried).toBe(true);
    const resultA = a.settle(outA.flow, outA.view);
    expect(resultA.replaced).toBeNull();
    expect(resultA.kept.at(-1)).toBe("Do you like soccer?");
    expect(resultA.aiQuestion?.hints).toEqual(EASY_HINTS.next_hints);
    expect(nextChildRow(turns, resultA, "Yes.").row.hintKind).toBe("english");

    // (나) 첫 시도가 노린 단어(soccer)를 담고 길이로 걸림 → 다시 쓴 질문은 다른 노린 단어(sunday)를 담고 영어 힌트에 걸린 낱말 soccer 가 남음 →
    // 노림 안전망이 그 질문의 힌트를 비우므로 조건이 거짓이 되어 sunday 로 걸린다(비운 뒤의 값으로 판정)
    const b = flowFor(turns, [
      "Okay!",
      "Do you like to play soccer here on a free day?",
    ]);
    const retryB = flowFor(turns, ["Okay!", "Do you like Sunday?"]).flow;
    const outB = await withQuestionRetry({
      flow: b.flow,
      view: okView(
        answer({
          tori_en: "Okay! Do you like to play soccer here on a free day?",
          next_targets: ["soccer"],
          ...EASY_HINTS,
        }),
      ),
      lineOptions: OPTIONS,
      sentenceMaxWords: 8,
      easyHint: b.easyHint,
      retry: async () =>
        ({
          value: answer({
            tori_en: "Okay! Do you like Sunday?",
            next_targets: ["sunday"],
            next_hint_ko: "일요일을 좋아하는지 물어요.",
            next_hints: ["Yes, I ___.", "Yes, I like soccer on Sunday."],
          }),
          entries: retryB.entries(),
          hintsBlocked: false,
          overLength: 0,
          blocked: 0,
        }) satisfies QuestionRetryAnswer,
    });
    expect(outB.retried).toBe(true);
    expect(outB.view.kind === "ok" && outB.view.value.next_hints).toEqual([]);
    const resultB = b.settle(outB.flow, outB.view);
    expect(resultB.replaced).toBe("question_check");
    expect(resultB.kept).not.toContain("Do you like Sunday?");
  });

  it("받침 둘째 밖의 AI 질문 자리(받침 없는 이어 묻기)는 영어 힌트가 있어도 지금처럼 target_word 로 걸린다", () => {
    const turns: TalkLessonTurn[] = [...opening3(), said()];
    const { plan, flow, settle } = flowFor(turns, [
      "Nice!",
      "Do you like soccer?",
    ]);
    expect(plan.stage).toBe(0);
    const result = settle(
      flow,
      okView(
        answer({
          tori_en: "Nice! Do you like soccer?",
          next_targets: ["soccer"],
          ...EASY_HINTS,
        }),
      ),
    );
    expect(result.replaced).toBe("question_check");
  });
});

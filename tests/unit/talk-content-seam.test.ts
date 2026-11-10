// 회화 내용 고침 1 — 이음새 · 말씨(13절 C217 (2) · (3), AC-15zj · AC-15zk). 요청자 iPad 수업(11-08)에서 카드 질문이 아이 말과 상관없이
// 차례대로 붙었고(카드 글의 장면 문장까지 그대로), 받침 둘째에서 필수 질문을 wh 질문으로 묻고 뒤에 같은 질문을 다시 물었으며, 카드 답 바로 뒤에 다음
// 카드 질문 글이 그대로 나갔고, 반응이 'Yes, you ~!' 꼴로 되풀이됐다. 실제 API 를 부르지 않는다. 설계 숫자는 시험용 설정에서 읽는다.
import { describe, expect, it } from "vitest";
import {
  normalizeTalkLesson,
  type TalkLessonOutput,
  talkCardChainKeysOf,
  talkEasyAiSlotOf,
  talkLessonSystem,
} from "@/core/ai/calls/talk-lesson";
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
import {
  cardQuestionKeyOf,
  checkLowLevelQuestion,
  isYesNoQuestion,
} from "@/core/conversation/question-check";
import {
  heldQuestionFailOf,
  questionRetryNoteOf,
} from "@/core/conversation/question-retry";
import { TALK_SITUATION_EXAMPLES } from "@/core/conversation/situation";
import {
  createLessonSentenceFlow,
  type LessonOutcomeView,
  lessonEasySlotOf,
  type QuestionRetryAnswer,
  settleLessonTurn,
  withQuestionRetry,
} from "@/server/conversation/lesson-turn";
import {
  GOAL_1,
  lessonInput,
  lessonRules,
  CARD3 as VIEW_CARD3,
} from "../fixtures/ai/talk-lesson-inputs";
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
    tori_en: "Oh, nice! Do you like it?",
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

const argsOf = (turns: TalkLessonTurn[]): LessonArgs => ({
  spec: SPEC3,
  card: CARD3,
  newWords: NEW3,
  turns,
  segment: "talk",
  settings: LOW,
  prepWords: CARD3.prep ?? [],
});

/**
 * 받침 둘째의 AI 질문 자리: 필수 1 에 답한 뒤 선생님의 AI 질문에 '잘 모르겠어요'를 두 번 누른 행(첫째는 같이 말하기 — 카드 줄이 없는 AI 질문
 * 자리라 둘째에 선생님이 쉬운 질문을 쓴다).
 */
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
      },
    });
  return { plan, flow, settle };
}

const okView = (value: TalkLessonOutput): LessonOutcomeView => ({
  kind: "ok",
  value,
  hintsBlocked: false,
  overLength: 0,
});

describe("(ㄴ) 받침 둘째의 AI 질문 자리 — 필수 질문 갈래를 받지 않고 예 · 아니요 질문만(C217 (2) · 분석 A3)", () => {
  it("AC-15zj: 자리 판정: 1~3단계 · AI 차례 · 질문을 쓰는 차례 · 받침 단계 둘째일 때만이다", () => {
    const { plan } = flowFor(easySlotTurns(), []);
    expect(plan).toMatchObject({
      kind: "ai",
      aiAsks: true,
      stage: TALK_SUPPORT_STAGE_EASY,
    });
    expect(talkEasyAiSlotOf(plan, true)).toBe(true);
    expect(talkEasyAiSlotOf(plan, false)).toBe(false);
    expect(talkEasyAiSlotOf({ ...plan, stage: 0 }, true)).toBe(false);
    expect(talkEasyAiSlotOf({ ...plan, kind: "card_slot" }, true)).toBe(false);
    expect(talkEasyAiSlotOf({ ...plan, aiAsks: false }, true)).toBe(false);
    // 호출 입력 꼴(supportStage)도 같은 판정
    expect(
      talkEasyAiSlotOf(
        { kind: "ai", aiAsks: true, supportStage: TALK_SUPPORT_STAGE_EASY },
        true,
      ),
    ).toBe(true);
  });

  it("AC-15zj: 정규화: 이 자리에서 AI 가 적은 필수 질문 갈래는 이어 묻기로, 필수 카드 항목은 없음으로 받는다(더 이야기할 거리 항목 · 다른 차례는 그대로)", () => {
    const turnOf = (stage: number) => ({
      child: "",
      input: "dont_know" as const,
      reason: "button" as const,
      kind: "ai" as const,
      aiAsks: true,
      supportStage: stage,
      stuckQuestion: "What is fun?",
    });
    const raw = answer({
      tori_en: "Okay! Here is a new one. What sport is fun?",
      next_move: "required",
      card_item: { kind: "required", no: 2 },
      next_targets: ["soccer"],
      next_goal: [GOAL_1],
    });
    const at = (level: number, stage: number, over = raw) =>
      normalizeTalkLesson(
        over,
        lessonInput(level, { turn: turnOf(stage) }),
        lessonRules(level),
      );
    const easy = at(3, TALK_SUPPORT_STAGE_EASY);
    expect(easy?.next_move).toBe("follow_up");
    expect(easy?.card_item).toEqual({ kind: "none", no: 0 });
    // 더 이야기할 거리 항목은 그대로 둔다(필수 질문만 받지 않는다)
    const more = at(
      3,
      TALK_SUPPORT_STAGE_EASY,
      answer({
        tori_en: "Okay! Do you play after school?",
        next_move: "more",
        card_item: { kind: "more", no: 1 },
      }),
    );
    expect(more?.card_item).toEqual({ kind: "more", no: 1 });
    // 받침이 없는 AI 차례는 필수 질문 갈래 그대로
    const plain = normalizeTalkLesson(
      raw,
      lessonInput(3, { turn: { child: "I play.", supportStage: 0 } }),
      lessonRules(3),
    );
    expect(plain?.next_move).toBe("required");
    expect(plain?.card_item).toEqual({ kind: "required", no: 2 });
    // 4단계부터는 고치기 전 그대로(받침 둘째는 쉬운 영어로 바꿔 묻기 — 갈래를 고치지 않는다)
    const four = at(4, TALK_SUPPORT_STAGE_EASY);
    expect(four?.next_move).toBe("required");
    expect(four?.card_item).toEqual({ kind: "required", no: 2 });
  });

  it("AC-15zj: 질문 검사: 이 자리의 wh 질문은 not_easy 로 걸리고, 예 · 아니요 질문과 고르기 답 둘이 딸린 질문은 지난다", () => {
    const check = (sentence: string, choices?: number) =>
      checkLowLevelQuestion(sentence, {
        ...OPTIONS,
        targets: [],
        ...(choices === undefined ? {} : { easySlot: { choices } }),
      });
    expect(check("What sport is fun?", 0)).toEqual({
      ok: false,
      reason: "not_easy",
    });
    expect(check("Where do you play?", 0).ok).toBe(false);
    expect(check("Do you like it?", 0)).toEqual({ ok: true });
    expect(check("Is it fun?", 0)).toEqual({ ok: true });
    // 고르기 답 둘이 딸린 질문은 쉬운 질문이다(02-2 받침 표 둘째 '예 · 아니요 또는 둘 중 고르기')
    expect(check("What sport is fun?", 2)).toEqual({ ok: true });
    // 이 자리가 아니면 보지 않는다
    expect(check("What sport is fun?")).toEqual({ ok: true });
    expect(isYesNoQuestion("Do you like whales?")).toBe(true);
    expect(isYesNoQuestion("Where do whales swim?")).toBe(false);
  });

  it("AC-15zj: 다시 쓰기: wh 질문이면 까닭 · 쉬운 예 · 아니요 질문을 알려 한 번 다시 쓰게 하고, 다시 쓴 예 · 아니요 질문이 나간다", async () => {
    const turns = easySlotTurns();
    const { plan, flow, settle } = flowFor(turns, [
      "Okay!",
      "What sport is fun?",
    ]);
    const first = answer({ tori_en: "Okay! What sport is fun?" });
    expect(lessonEasySlotOf(plan, first, true)).toEqual({ choices: 0 });
    const notes: string[] = [];
    const retryFlow = flowFor(turns, ["Okay!", "Do you like it?"]).flow;
    const again: QuestionRetryAnswer = {
      value: answer({ tori_en: "Okay! Do you like it?" }),
      entries: retryFlow.entries(),
      hintsBlocked: false,
      overLength: 0,
      blocked: 0,
    };
    const out = await withQuestionRetry({
      flow,
      view: okView(first),
      lineOptions: OPTIONS,
      sentenceMaxWords: 8,
      retry: async ({ note }) => {
        notes.push(note);
        return again;
      },
    });
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain(
      "at Support stage 2 the question must be an easier yes-or-no question",
    );
    expect(notes[0]).toContain("write only one easy yes-or-no question");
    // 쉬운 질문 자리에는 'wh 질문을 먼저' 줄을 넣지 않는다(서로 어긋나는 지시)
    expect(notes[0]).not.toContain("Prefer a what, who or where question");
    const result = settle(out.flow, out.view);
    expect(result.plan.kind).toBe("ai");
    expect(result.replaced).toBeNull();
    expect(result.kept.at(-1)).toBe("Do you like it?");
  });

  it("AC-15zj: 끝 처리: 다시 쓰지 못한 wh 질문은 내보내지 않고(질문 검사 걸림), 예 · 아니요 질문은 다시 부르지 않고 그대로 나간다", async () => {
    const turns = easySlotTurns();
    const wh = flowFor(turns, ["Okay!", "What sport is fun?"]);
    const whResult = wh.settle(
      wh.flow,
      okView(answer({ tori_en: "Okay! What sport is fun?" })),
    );
    expect(whResult.questionDropped).toBe(true);
    expect(whResult.kept).not.toContain("What sport is fun?");
    const yn = flowFor(turns, ["Okay!", "Do you like it?"]);
    let calls = 0;
    const out = await withQuestionRetry({
      flow: yn.flow,
      view: okView(answer({ tori_en: "Okay! Do you like it?" })),
      lineOptions: OPTIONS,
      sentenceMaxWords: 8,
      retry: async () => {
        calls += 1;
        return null;
      },
    });
    expect(calls).toBe(0);
    const ynResult = yn.settle(out.flow, out.view);
    expect(ynResult.replaced).toBeNull();
    expect(ynResult.kept.at(-1)).toBe("Do you like it?");
    // 받침이 없는 AI 차례의 wh 질문은 지금처럼 그대로 나간다
    const plain = flowFor([...opening3(), said()], ["Nice!", "What is fun?"]);
    const plainResult = plain.settle(
      plain.flow,
      okView(answer({ tori_en: "Nice! What is fun?" })),
    );
    expect(plainResult.replaced).toBeNull();
    expect(plainResult.kept.at(-1)).toBe("What is fun?");
  });
});

describe("(ㄷ) 카드 답 바로 뒤 차례에 필수 질문 글이 오면 다시 쓰게 한다(C217 (2) · C204 (6) · 분석 A4)", () => {
  const turns = [...opening3(), said()];
  const chainKeys = talkCardChainKeysOf({ afterCardChance: true }, VIEW_CARD3);

  it("AC-15zj: 열쇠: 카드 답 뒤 · 장면 여는 질문 답 뒤 차례에만 카드 필수 질문 글의 질문 열쇠를 낸다", () => {
    expect(chainKeys).toEqual(
      VIEW_CARD3.required.map((item) => cardQuestionKeyOf(item.en)),
    );
    expect(talkCardChainKeysOf({ followUpAnswer: true }, VIEW_CARD3)).toEqual(
      chainKeys,
    );
    expect(talkCardChainKeysOf({ afterCardChance: false }, VIEW_CARD3)).toEqual(
      [],
    );
    expect(talkCardChainKeysOf({}, VIEW_CARD3)).toEqual([]);
    // 장면 문장이 앞에 붙은 카드 글도 마지막 물음표 문장으로 견준다
    expect(
      talkCardChainKeysOf(
        { afterCardChance: true },
        {
          required: [
            {
              ...VIEW_CARD3.required[0],
              en: "Sand and shells! Where do you play?",
            } as (typeof VIEW_CARD3.required)[number],
          ],
        },
      ),
    ).toEqual([cardQuestionKeyOf("Where do you play?")]);
  });

  it("AC-15zj: 걸린 질문 찾기: 질문 검사를 지난 질문이라도 카드 필수 질문 글과 같으면 chain 이고, 제 말로 바꿔 물은 질문 · 그 차례가 아닌 턴은 아니다", () => {
    const { flow } = flowFor(turns, ["Nice!", "What sport is fun?"]);
    const of = (keys: readonly string[], f = flow) =>
      heldQuestionFailOf({
        entries: f.entries(),
        targets: [],
        options: OPTIONS,
        chainKeys: keys,
      });
    expect(of(chainKeys)).toEqual({
      question: "What sport is fun?",
      reason: "chain",
      words: [],
    });
    expect(of([])).toBeNull();
    const own = flowFor(turns, ["Nice!", "Do you like it?"]).flow;
    expect(of(chainKeys, own)).toBeNull();
    // 질문 검사에 걸린 질문은 그 까닭이 먼저다
    const off = flowFor(turns, ["Nice!", "Do you like basketball?"]).flow;
    expect(of(chainKeys, off)?.reason).toBe("offband");
  });

  it("AC-15zj: 다시 쓰게 할 메시지: 카드 답 바로 뒤라는 까닭과 '아이 답에 이어 묻기 · 카드 기회는 뒤 차례에'를 알린다", () => {
    const note = questionRetryNoteOf(
      { question: "What sport is fun?", reason: "chain", words: [] },
      { sentenceMaxWords: 8, targets: ["soccer"], childWords: ["play"] },
    );
    expect(note).toContain('"What sport is fun?"');
    expect(note).toContain(
      "it asked the next card question right after the child answered a card question",
    );
    expect(note).toContain(
      "follows up on the child's last answer, in your own words (next_move follow_up, card_item kind none and no 0)",
    );
    expect(note).toContain("Bring up the next card chance in a later turn.");
    expect(note).toContain("at most 8 words");
  });

  it("AC-15zj: 서버 다시 쓰기: 카드 글 그대로면 한 번 다시 부르고 다시 쓴 이어 묻기가 나간다 — 갈래 표지만 고치지 않는다", async () => {
    const { flow, settle } = flowFor(turns, ["Nice!", "What sport is fun?"]);
    const first = answer({
      tori_en: "Nice! What sport is fun?",
      card_item: { kind: "required", no: 2 },
    });
    const retryFlow = flowFor(turns, ["Oh!", "Do you like it?"]).flow;
    let calls = 0;
    const out = await withQuestionRetry({
      flow,
      view: okView(first),
      lineOptions: OPTIONS,
      sentenceMaxWords: 8,
      chainKeys,
      retry: async () => {
        calls += 1;
        return {
          value: answer({ tori_en: "Oh! Do you like it?" }),
          entries: retryFlow.entries(),
          hintsBlocked: false,
          overLength: 0,
          blocked: 0,
        };
      },
    });
    expect(calls).toBe(1);
    expect(out.retried).toBe(true);
    const result = settle(out.flow, out.view);
    expect(result.replaced).toBeNull();
    expect(result.kept).toEqual(["Nice!", "Do you like it?"]);
    expect(result.kept).not.toContain("What sport is fun?");
  });

  it("AC-15zj: 그 차례가 아니면 다시 부르지 않고, 다시 쓰지 못하면 카드 자리로 바꾸지 않고 앞 응답 그대로 낸다(같은 카드 글이 또 붙지 않게)", async () => {
    const first = answer({ tori_en: "Nice! What sport is fun?" });
    const plain = flowFor(turns, ["Nice!", "What sport is fun?"]);
    let calls = 0;
    await withQuestionRetry({
      flow: plain.flow,
      view: okView(first),
      lineOptions: OPTIONS,
      sentenceMaxWords: 8,
      retry: async () => {
        calls += 1;
        return null;
      },
    });
    expect(calls).toBe(0);
    const failed = flowFor(turns, ["Nice!", "What sport is fun?"]);
    const out = await withQuestionRetry({
      flow: failed.flow,
      view: okView(first),
      lineOptions: OPTIONS,
      sentenceMaxWords: 8,
      chainKeys,
      retry: async () => {
        calls += 1;
        return null;
      },
    });
    expect(calls).toBe(1);
    const result = failed.settle(out.flow, out.view);
    expect(result.plan.kind).toBe("ai");
    expect(result.replaced).toBeNull();
    expect(result.kept).toEqual(["Nice!", "What sport is fun?"]);
  });
});

describe("(ㄱ) 프롬프트 이음새 줄 · 가변부 카드 줄(C217 (2) · 분석 A5)", () => {
  const three = talkLessonSystem(lessonInput(3), lessonRules(3));
  const four = talkLessonSystem(lessonInput(4), lessonRules(4));
  const lineOf = (system: string, label: string) =>
    system.split("\n").find((l) => l.startsWith(`${label}: `)) ?? "";

  it("AC-15zj: 1~3단계 고정부: 카드 기회는 아이의 바로 앞 말에서 이어 제 짧은 말로 묻고, 카드의 장면 문장을 그대로 붙이지 않으며, 이을 말이 없으면 따라가기를 계속한다", () => {
    expect(three).toContain(
      "When you use a card chance, link it to what the child just said and ask it in your own short words",
    );
    expect(three).toContain(
      "Never paste a card question or its scene sentence from an earlier turn as it is.",
    );
    expect(three).toContain(
      "If nothing in the child's last words leads to a chance, keep following the child's talk and leave the chance for a later turn.",
    );
    for (const line of [
      "When you use a card chance, link it to what the child just said",
      "Never paste a card question",
    ])
      expect(four).not.toContain(line);
  });

  it("AC-15zj: 1~3단계 가변부 카드 줄은 노리는 낱말 · 답 예시 · 묻는 한 가지 길(카드 글의 질문 문장만 — 장면 문장은 싣지 않는다)이고, 4단계부터는 고치기 전 꼴이다", () => {
    const required3 = lineOf(three, "Required questions");
    expect(required3).toContain(
      `2. aims at: soccer; answer example: Soccer is fun.; one way to ask: What sport is fun? (goals: ${GOAL_1})`,
    );
    for (const item of VIEW_CARD3.required) {
      const at = required3.indexOf(`${item.no}. aims at: `);
      expect(at).toBeGreaterThanOrEqual(0);
      expect(required3.indexOf(item.answerExample, at)).toBeLessThan(
        required3.indexOf("one way to ask: ", at),
      );
    }
    expect(lineOf(three, "More talk")).toContain(
      "1. aims at: play; answer example: I play with my friend.; one way to ask: What do you do after school?",
    );
    expect(three).toContain(
      "each chance shows the word it aims at, an answer example and one way to ask. The way to ask is only an idea",
    );
    expect(three).not.toContain("card wording");
    // 장면 문장이 앞에 붙은 카드 글은 질문 문장만 싣는다(실호출에서 장면 문장까지 그대로 붙이던 것 — 13절 C217 보완)
    const scened = talkLessonSystem(
      lessonInput(3, {
        card: {
          ...VIEW_CARD3,
          required: VIEW_CARD3.required.map((item, i) =>
            i === 0
              ? { ...item, en: "Sand and shells! Where do you play?" }
              : item,
          ),
        },
      }),
      lessonRules(3),
    );
    expect(lineOf(scened, "Required questions")).toContain(
      "one way to ask: Where do you play? (goals:",
    );
    expect(scened).not.toContain("Sand and shells!");
    expect(lineOf(four, "Required questions")).toContain(
      `2. What sport is fun? (aims at: soccer; goals: ${GOAL_1})`,
    );
    expect(four).not.toContain("one way to ask");
  });
});

describe("말씨(C217 (3) · 분석 4절 4 · A7 · A9)", () => {
  const three = talkLessonSystem(lessonInput(3), lessonRules(3));
  const four = talkLessonSystem(lessonInput(4), lessonRules(4));

  it("AC-15zk: 1~3단계 고정부: 두 차례 연달아 같은 낱말로 시작하지 않고, 'Yes' 는 아이 답이 맞거나 예일 때만 쓴다", () => {
    const lines = [
      "Levels 1-3: never start two turns in a row with the same word.",
      "Start with 'Yes' only when the child's answer is right or the child said yes.",
    ];
    for (const line of lines) {
      expect(three).toContain(line);
      expect(four).not.toContain(line);
    }
  });

  it("AC-15zk: 끝인사는 아이가 한 말 하나를 짚고 낱말을 세지 않는다", () => {
    expect(three).toContain(
      "Never list or count the words the child said (not 'You said eat and drink today.'); say one natural line about that one thing.",
    );
    expect(four).not.toContain("Never list or count the words");
  });

  it("AC-15zk: 인사 반응 예는 답 꼴별이다(기분 좋음 · 피곤하거나 슬픔 · 덧붙인 말) — 한 예로 몰리지 않게", () => {
    expect(three).toContain("to a good feeling e.g. 'Yay!' or 'Me too!'");
    expect(three).toContain(
      "to a tired or sad feeling e.g. 'Oh no!' or 'It is okay.'",
    );
    expect(three).toContain(
      "when the child added something, react to that thing",
    );
    expect(three).not.toContain("Good to hear!");
  });

  it("AC-15zk: 들리지 않음: 예와 고정부 줄에 'my ears' · 'your ears' 꼴이 없고 못 들은 것은 소리 쪽 일로 말한다", () => {
    expect(TALK_SITUATION_EXAMPLES.nospeech).toHaveLength(3);
    for (const line of TALK_SITUATION_EXAMPLES.nospeech)
      expect(line).not.toMatch(/\bears?\b/i);
    expect(three).not.toMatch(/\bears\b/i);
    expect(three).toContain(
      "Say in your own words that you could not hear it because of the sound, then move on",
    );
  });
});

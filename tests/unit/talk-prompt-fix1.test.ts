// 회화 턴 프롬프트 · 흐름 규칙 고침 1(첫 프리뷰 대조 task-talk-design-gap.md 5.1 · 5.2, 13절 C202 컨트롤러 잠정).
// 소리 줄 거름(다시 묻는 턴 · 받침 0 · 따라 할 말 = 선택지 · 단계 규격 choices) · 사용자 메시지 두 줄 · 문장별 뜻 · 고정부 규칙 문장 ·
// 맞장구 시간 · 건너뛴 준비 낱말 · 선생님 문장 수 초과. 실제 API 를 부르지 않는다. 설계 숫자는 시험용 설정 · 견본에서 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyTalkLessonChecks,
  normalizeTalkLesson,
  type TalkLessonOutput,
  talkCallTurnOf,
  talkLessonCheckFields,
  talkLessonMessages,
  talkLessonSystem,
  talkLessonTurnSpec,
  talkLessonUserMessage,
  teacherSentencesMaxOf,
} from "@/core/ai/calls/talk-lesson";
import type { FieldHit } from "@/core/ai/output-check";
import {
  type LessonArgs,
  nextTeacherTurnOf,
  reaskWordsOf,
  talkLessonPositionOf,
} from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import {
  heldQuestionFailOf,
  mergeQuestionRetry,
  questionRetryNoteOf,
} from "@/core/conversation/question-retry";
import { toriKoShownOf } from "@/core/conversation/spoken";
import { soundPairsOf, taggedErrorCode } from "@/server/ai/talk";
import {
  lessonContextAt,
  skippedPrepWordsOf,
} from "@/server/conversation/lesson-input";
import {
  createLessonSentenceFlow,
  type LessonOutcomeView,
  lessonOverLengthOf,
  type QuestionRetryAnswer,
  questionRetryFits,
  settleLessonTurn,
  TURN_IN_FLIGHT_MS,
  TURN_SAVE_GRACE_MS,
  withQuestionRetry,
} from "@/server/conversation/lesson-turn";
import {
  BASE_CALL_TURN,
  GOAL_1,
  lessonInput,
  lessonRules,
  values,
} from "../fixtures/ai/talk-lesson-inputs";
import { TEST_SETTINGS } from "../fixtures/settings";
import {
  aiTurn,
  CARD3,
  LOW,
  NEW3,
  opening3,
  SPEC3,
  said,
  teacher,
} from "../fixtures/talk-lesson";

/** 빈 응답 위에 고칠 칸만 얹는다(3단계 AI 차례, 다음 질문은 카드 필수 2 soccer). */
function answer(over: Partial<TalkLessonOutput> = {}): TalkLessonOutput {
  return {
    child_kind: over.stuck === true ? "not_understood" : "answer",
    stuck: false,
    tori_en: "Wow, soccer! What sport is fun?",
    model_line: "",
    choices: [],
    tori_ko: ["와, 축구!", "어떤 운동이 재밌어?"],
    recast: "",
    explanation: "",
    new_words: [],
    self_used_words: [],
    mission_done: [],
    response_fit: true,
    child_topic: false,
    child_asked: false,
    goal_suggest: [],
    next_move: "required",
    card_item: { kind: "required", no: 2 },
    next_goal: [GOAL_1],
    support: "none",
    next_targets: ["soccer"],
    next_hint_ko: "축구가 재밌어.",
    next_hints: ["___ is fun.", "Soccer is fun."],
    next_usable_phrases: [],
    next_answer_example: "Soccer is fun.",
    image_word: "",
    farewell: "",
    farewell_ko: "",
    good_lines: [],
    next_time_lines: [],
    summary: "",
    ...over,
  };
}

type InputOver = Parameters<typeof lessonInput>[1];

/** 3단계 입력에 다시 묻는 턴 낱말 · 단계 규격 choices 를 얹는다. */
function input3(
  { reask = [], choices = false }: { reask?: string[]; choices?: boolean } = {},
  over: InputOver = {},
) {
  const base = lessonInput(3, over);
  return {
    ...base,
    spec: { ...base.spec, choices },
    lineRange: { ...base.lineRange, reaskWords: reask },
  };
}

function norm(
  value: Partial<TalkLessonOutput>,
  opts: { reask?: string[]; choices?: boolean } = {},
  over: InputOver = {},
): TalkLessonOutput {
  const result = normalizeTalkLesson(
    answer(value),
    input3(opts, over),
    lessonRules(3),
  );
  if (result === null) throw new Error("정규화가 null 이다");
  return result;
}

describe("5.2 1 소리 줄 거름(02-2 180 · 204 · 241 · 271 · 328, C202 (1))", () => {
  it("다시 묻는 턴(노린 낱말을 이미 물었거나 짧은 준비에서 보였거나 앞 세션에서 만남)에는 받침 0 의 따라 할 말 · 선택지를 버린다", () => {
    const v = norm(
      {
        tori_en: "Yum! What sport is fun? Listen and say!",
        model_line: "Soccer is fun.",
        choices: ["I like soccer.", "I like tag."],
        support: "choices",
      },
      { reask: ["soccer"], choices: true },
    );
    expect(v.model_line).toBe("");
    expect(v.choices).toEqual([]);
    expect(v.support).toBe("none");
  });

  it("1단계(규격 choices 참) 처음 묻는 턴은 선택지를 남기고, 같은 선택지라도 다시 묻는 턴이면 버린다", () => {
    const pair = ["I like soccer.", "I like tag."];
    // 아이 말은 바뀌는 자리(soccer · tag)와 겹치지 않게(되묻는 고르기는 버림 — 대본 4회차 N-1)
    expect(
      norm({ choices: pair }, { choices: true }, { turn: { child: "Yes." } })
        .choices,
    ).toEqual(pair);
    expect(
      norm({ choices: pair }, { choices: true, reask: ["soccer"] }).choices,
    ).toEqual([]);
  });

  it("선택지 안의 단원 단어가 다시 묻는 턴 낱말이면 노리는 단어를 적지 않았어도 버린다", () => {
    expect(
      norm(
        {
          next_targets: [],
          card_item: { kind: "none", no: 0 },
          next_move: "follow_up",
          choices: ["I like soccer.", "I like tag."],
        },
        { choices: true, reask: ["soccer"] },
      ).choices,
    ).toEqual([]);
  });

  it("2~3단계(규격 choices 거짓)는 카드 질문 · 단원 단어를 노린 질문의 선택지와 단원 단어 없는 이어 묻기의 고르기 답도 버린다('AI 몫 넓힘' C205 — D1 (나) 잠정을 바꿈)", () => {
    expect(
      norm({ choices: ["I like soccer.", "I like tag."] }).choices,
    ).toEqual([]);
    const follow = ["I like my friend.", "I like my day."];
    expect(
      norm({
        next_targets: [],
        card_item: { kind: "none", no: 0 },
        next_move: "follow_up",
        choices: follow,
      }).choices,
    ).toEqual([]);
  });

  it("받침 둘째(쉬운 질문)의 고르기 답은 다시 묻는 낱말이어도 남는다(막힘 표의 도움)", () => {
    const v = norm(
      {
        tori_en: "That's okay! Do you like soccer?",
        choices: ["I like soccer.", "I like tag."],
        support: "choices",
      },
      { reask: ["soccer"] },
      {
        turn: {
          input: "dont_know",
          reason: "button",
          supportStage: 2,
          stuckQuestion: "What sport is fun?",
          stuckAnswer: "Soccer is fun.",
        },
      },
    );
    expect(v.choices).toEqual(["I like soccer.", "I like tag."]);
  });

  it("받침 0 의 따라 할 말은 '꺼낼 새 단어'를 꺼낼 때만 남고, 그 밖은 버린다", () => {
    const intro = norm({
      tori_en: "Oh, the weekend! Listen and say!",
      model_line: "The weekend.",
      new_words: ["weekend"],
      support: "model_line",
      // 꺼내기 갈래일 때만(13절 C205 · 판정 r1 I-5)
      next_move: "introduce",
    });
    expect(intro.model_line).toBe("The weekend.");
    expect(intro.new_words).toEqual(["weekend"]);
    expect(
      norm({ model_line: "I play soccer.", support: "model_line" }).model_line,
    ).toBe("");
    // 꺼낼 새 단어라도 앞 세션에서 만났으면(다시 묻는 턴 낱말) 들려주지 않는다
    expect(
      norm(
        {
          tori_en: "Oh, the weekend! Listen and say!",
          model_line: "The weekend.",
          new_words: ["weekend"],
        },
        { reask: ["weekend"] },
      ).model_line,
    ).toBe("");
  });

  it("받침 0 에서 다음 질문의 노림이 다시 묻는 턴 낱말이면 꺼내는 줄이라도 따라 할 말을 버린다(rev-night-2 M-4)", () => {
    expect(
      norm(
        {
          tori_en: "Oh, the weekend! What sport is fun? Listen and say!",
          model_line: "The weekend.",
          new_words: ["weekend"],
        },
        { reask: ["soccer"] },
      ).model_line,
    ).toBe("");
  });

  it("받침 1(같이 말하기) · 3(닫기) · 들리지 않음의 따라 할 말은 다시 묻는 낱말이어도 남는다", () => {
    const stuck = {
      input: "dont_know" as const,
      reason: "button" as const,
      stuckQuestion: "What do you do on the weekend?",
      stuckAnswer: "I play.",
    };
    for (const turn of [
      { ...stuck, supportStage: 1, aiAsks: false },
      { ...stuck, supportStage: 3 },
      { ...stuck, reason: "nospeech" as const, supportStage: 0 },
    ])
      expect(
        norm(
          { tori_en: "That's okay! Listen and say!", model_line: "I play." },
          { reask: ["play"] },
          { turn },
        ).model_line,
      ).toBe("I play.");
  });

  it("따라 할 말이 선택지 하나와 같으면 따라 할 말을 버린다(C125 넓힘 — 같은 답을 두 번 읽지 않음)", () => {
    const v = norm(
      {
        tori_en: "Oh, the weekend! Do you like it? Listen and say!",
        model_line: "I like the weekend.",
        choices: ["I like the weekend.", "I like the day."],
        new_words: ["weekend"],
        next_targets: ["weekend"],
        card_item: { kind: "none", no: 0 },
        next_move: "introduce",
      },
      { choices: true },
    );
    expect(v.choices).toEqual(["I like the weekend.", "I like the day."]);
    expect(v.model_line).toBe("");
  });

  it("꺼낸 새 단어는 '꺼낼 새 단어'(Chances, new words to introduce) 안만 받는다(A8)", () => {
    expect(
      norm({
        tori_en: "I play soccer too! Weekends are fun!",
        new_words: ["play", "weekend"],
      }).new_words,
    ).toEqual(["weekend"]);
  });

  it("소리 줄의 답 짝은 선택지와 같은 따라 할 말을 다시 넣지 않는다(서버 겹침 없애기)", () => {
    expect(
      soundPairsOf({
        model_line: "We eat rice.",
        choices: ["We eat rice.", "We sleep rice."],
      }),
    ).toEqual([["We eat rice.", "We sleep rice."]]);
    expect(soundPairsOf({ model_line: "We eat rice.", choices: [] })).toEqual([
      ["We eat rice.", "We eat rice."],
    ]);
  });
});

describe("5.2 2 사용자 메시지 두 줄 · 인사 끝 다음 토막(5.1 4)", () => {
  it("앞 차례가 카드 기회였는가 · 마지막 이어 묻기 뒤 AI 차례 수를 넣고, 값이 없으면 줄이 없다", () => {
    const lines = talkLessonUserMessage({
      ...BASE_CALL_TURN,
      afterCardChance: true,
      teacherTurnsSinceFollowUp: 2,
    }).split("\n");
    expect(lines).toContain("Previous turn was a card chance: yes");
    expect(lines).toContain("Teacher turns since last follow-up: 2");
    const plain = talkLessonUserMessage(BASE_CALL_TURN);
    expect(plain).not.toContain("card chance:");
    expect(plain).not.toContain("since last follow-up");
  });

  it("인사 끝 턴은 다음 토막 한 줄을 넣는다(짧은 준비 · 대화)", () => {
    const end = { ...BASE_CALL_TURN, segment: "greeting_end" as const };
    expect(talkLessonUserMessage({ ...end, nextPart: "prep" })).toContain(
      "Next part: short preparation",
    );
    expect(talkLessonUserMessage({ ...end, nextPart: "talk" })).toContain(
      "Next part: talk",
    );
    expect(talkLessonUserMessage(BASE_CALL_TURN)).not.toContain("Next part:");
  });

  function args(turns: TalkLessonTurn[]): LessonArgs {
    return {
      spec: SPEC3,
      card: CARD3,
      newWords: NEW3,
      turns,
      segment: "talk",
      settings: LOW,
      prepWords: CARD3.prep ?? [],
    };
  }

  it("흐름이 센다: 카드 질문에 답한 차례는 '카드 기회였음'이고, 이어 묻기 뒤 선생님 차례(AI 차례 · 카드 자리 · 대화 첫 질문)를 센다 — 인사 끝 반응 · 받침 차례는 안 셈(rev-night-2 M-5)", () => {
    const first = [...opening3(), said()];
    const p1 = nextTeacherTurnOf(args(first));
    expect(p1.afterChance).toBe(true);
    // 인사 끝 반응(AI)은 세지 않고 대화 첫 질문(앱 카드)은 센다
    expect(p1.sinceFollowUp).toBe(1);
    const followed = [
      ...first,
      aiTurn("Nice! Do you play with a friend?", { next: "follow_up" }),
      said(),
    ];
    const p2 = nextTeacherTurnOf(args(followed));
    expect(p2.afterChance).toBe(false);
    expect(p2.sinceFollowUp).toBe(0);
    const chance = [
      ...followed,
      aiTurn("Cool! What sport is fun?", {
        next: "required",
        item: { kind: "required", no: 2 },
        words: ["soccer"],
      }),
      said(),
    ];
    const p3 = nextTeacherTurnOf(args(chance));
    expect(p3.afterChance).toBe(true);
    expect(p3.sinceFollowUp).toBe(1);
    // 카드 자리 차례도 센다(AI 카드 질문 → 카드 자리 → … 연쇄가 1 로 보이지 않게)
    const slotted = [
      ...chance,
      teacher("Great! When is your free day?", {
        kind: "card_slot",
        item: { kind: "required", no: 3 },
        words: ["sunday"],
      }),
      said(),
    ];
    expect(nextTeacherTurnOf(args(slotted)).sinceFollowUp).toBe(2);
    // 받침 차례(같이 말하기)는 세지 않는다
    const supported = [
      ...slotted,
      teacher("That's okay! Let's say it together.", {
        kind: "card_slot",
        stage: 1,
        item: { kind: "required", no: 3 },
        words: ["sunday"],
      }),
      said(),
    ];
    expect(nextTeacherTurnOf(args(supported)).sinceFollowUp).toBe(2);
    const turn = talkCallTurnOf({
      plan: p3,
      child: "Soccer is fun.",
      input: "speech",
      hintKind: "none",
      hintTier: 0,
      heardHelp: "none",
    });
    expect(turn.afterCardChance).toBe(true);
    expect(turn.teacherTurnsSinceFollowUp).toBe(1);
    expect(talkLessonPositionOf(args(chance)).teacherTurnsSinceFollowUp).toBe(
      1,
    );
  });

  it("앱이 붙인 대화 첫 질문(앞 턴 전문에 없음)에 답한 턴은 그 질문 글과 카드 기회 표시를 사용자 메시지에 넣고, AI 질문에 답한 턴은 넣지 않는다(task-talk-13-report 9절 2)", () => {
    const first = [...opening3(), said()];
    const plan = nextTeacherTurnOf(args(first));
    expect(plan.appAsked).toEqual({
      en: "What do you do on the weekend?",
      card: true,
    });
    const turn = talkCallTurnOf({
      plan,
      child: "I play.",
      input: "speech",
      hintKind: "none",
      hintTier: 0,
      heardHelp: "none",
    });
    const lines = talkLessonUserMessage(turn).split("\n");
    expect(lines).toContain(
      "App question just before (not in the turns above): What do you do on the weekend? (card chance: yes)",
    );
    expect(lines.indexOf("Child: I play.")).toBe(
      lines.findIndex((l) => l.startsWith("App question just before")) + 1,
    );
    const later = [
      ...first,
      aiTurn("Nice! Do you play with a friend?", { next: "follow_up" }),
      said(),
    ];
    const p2 = nextTeacherTurnOf(args(later));
    expect(p2.appAsked).toBeNull();
    expect(
      talkLessonUserMessage(
        talkCallTurnOf({
          plan: p2,
          child: "Yes.",
          input: "speech",
          hintKind: "none",
          hintTier: 0,
          heardHelp: "none",
        }),
      ),
    ).not.toContain("App question just before");
    expect(talkLessonSystem(input3(), lessonRules(3))).toContain(
      "'App question just before' is the question the app asked right before the child's words (it is not in the turns above). The child's words answer that question.",
    );
  });

  it("다시 묻는 턴 낱말: 앞 세션에서 만남 · 짧은 준비에서 보임 · 이 대화 선생님 차례가 노렸거나 꺼낸 단원 단어", () => {
    const turns = [
      ...opening3(),
      said(),
      aiTurn("Oh! Listen and say!", { intro: ["weekend"] }),
      teacher("Prep!", { kind: "card_slot", prep: { words: ["tag"] } }),
    ];
    expect(
      new Set(
        reaskWordsOf({ turns, prepWords: ["soccer"], metBefore: ["apple"] }),
      ),
    ).toEqual(new Set(["apple", "soccer", "tag", "play", "weekend"]));
  });
});

describe("5.1 1~6 고정부 규칙 문장(스냅숏이 아니라 규칙 문장 포함 여부)", () => {
  const system3 = talkLessonSystem(input3(), lessonRules(3));
  const system1 = talkLessonSystem(input3({ choices: true }), lessonRules(3));

  it("1~3단계 따라 할 말은 받침 1 · 3 · 들리지 않음 · 꺼낼 새 단어에서만, 둘을 한 턴에 함께 쓰지 않는다", () => {
    expect(system3).toContain(
      // 꺼내기 갈래일 때만 · 필수 질문 · 이어 묻기 갈래는 따라 할 말 없음(13절 C205 · 대본 회차 r1 판정 I-5)
      "Levels 1-3: fill model_line only at Support stage 1 or 3, after nospeech, or when your next question brings up a word from 'Chances, new words to introduce' for the first time (next_move introduce).",
    );
    expect(system3).toContain(
      "When next_move is required or a follow-up, never fill model_line, even if the question aims at a new word: let the child answer first.",
    );
    expect(system3).toContain(
      "Never fill model_line and choices in the same turn.",
    );
    expect(system3).toContain(
      "When you ask about a word again (you asked it before, or it was a short preparation word), give no model_line and no choices: let the child try first.",
    );
  });

  it("2~3단계(choices 거짓)는 답을 들려주지 않고 힌트 단추에 맡기며 '고르기 꼴 자주'가 없고, 1단계만 그 줄과 장난 오답을 둔다", () => {
    expect(system3).toContain(
      "At this level, ask so that the child answers with one sentence by themselves; when the child is stuck, the hint button helps. A this-or-that question has only the question: never fill choices for it.",
    );
    expect(system3).toContain("Fill choices only at Support stage 2.");
    expect(system3).not.toContain("ask yes-or-no or choice questions often");
    expect(system1).toContain(
      "At this level, ask yes-or-no or choice questions often, and keep the choice answers inside the question sentence",
    );
    expect(system1).toContain("'A banana? Or a horse?'");
    expect(system3).toContain(
      "Both choices must make sense as answers (e.g. 'It is red.' / 'It is blue.', not 'It is sleepy.').",
    );
  });

  it("카드 질문에 답한 다음 차례는 이어 묻고 다음 카드 기회는 아이 말이 닿을 때(5.1 2), 장면 단정 금지(5.1 3)", () => {
    expect(system3).toContain(
      // 고침 2(13절 C204 (6))에서 더 세게 고친 문장
      "When 'Previous turn was a card chance: yes' and the child answered, your next question must follow up on the child's answer (next_move follow_up). In this turn next_move can never be required, and card_item can never be a required question either. Bring up the next card chance only in a later turn, when the child's words reach it.",
    );
    expect(system3).toContain(
      "'Teacher turns since last follow-up' counts your turns, including the app's card turns, since your last follow-up question.",
    );
    expect(system3).toContain(
      "Never state the child's feeling, state or action as a fact unless the child said it (not 'You are thirsty.'). Before a card question, set the scene with a thing, not with another question (e.g. 'Oh, cold juice!').",
    );
  });

  it("인사 답은 되받기 대신 사람처럼 반응하고, 인사 끝은 다음 토막으로 넘어가는 말(예 되살림), 되풀이는 대화 토막에서만(5.1 4)", () => {
    expect(system3).toContain(
      "In the greeting, do not say the child's answer back (not 'You are fine!'). React like a person (e.g. 'Good to hear!', 'Me too!').",
    );
    expect(system3).toContain(
      // 고침 2(M-1)에서 예를 늘린 문장 — 1~3단계는 'AI 몫 넓힘'(C209)에서 아이 답에 먼저 반응하는 상황 차례 줄로 바꿈 · 예는 사용자 메시지
      // 'Example line' 한 줄(대본 회차 r1 판정 I-1 (가))
      "When Segment is greeting_end, react first to the child's greeting answer (the feeling or what the child added) like a person, then end with a short line in your own words moving on to the part in 'Next part' (the 'Example line' shows only the kind of line).",
    );
    expect(system3).toContain(
      "In the talk (Segment talk or more_talk), if the child's English is wrong, say the correct sentence back naturally (recast)",
    );
  });

  it("한국어 뜻을 쓰는 단계임을 가변부에 알리고, 뜻은 tori_en 문장마다 쓴다(5.1 5 — 가변부 절만 잘라 본다, rev-night-2 I-3)", () => {
    // 고정부 규칙 문장에도 'Korean meaning: yes' · 'no' 글이 들어 있어, 가변부(Context) 절의 줄만 견준다(buildSystem 꼴)
    const contextLines = (system: string) =>
      system.split("\nContext:\n")[1]?.split("\n") ?? [];
    const three = contextLines(system3);
    const five = contextLines(talkLessonSystem(lessonInput(5), lessonRules(5)));
    expect(three).toContain("Korean meaning: yes");
    expect(three).not.toContain("Korean meaning: no");
    expect(five).toContain("Korean meaning: no");
    expect(five).not.toContain("Korean meaning: yes");
    expect(system3).toContain(
      "When 'Korean meaning: yes', write in tori_ko the Korean meaning of every sentence of tori_en in the same order, one item per sentence (the reaction and the cue too).",
    );
  });
});

describe("5.2 3 뜻을 문장마다(plan 정한 것 9 를 바꿈, C202 (5))", () => {
  it("정규화: 문장 수와 맞는 뜻 목록은 그대로, 맞지 않으면 한 덩이로, 옛 한 글 꼴도 읽고, 뜻을 보이지 않는 단계는 빈 목록", () => {
    expect(norm({}).tori_ko).toEqual(["와, 축구!", "어떤 운동이 재밌어?"]);
    expect(norm({ tori_ko: ["와, 축구!"] }).tori_ko).toEqual(["와, 축구!"]);
    // 수가 맞지 않으면 이어 한국어 문장 끝으로 다시 나눠 맞으면 문장마다(대본 4회차 N-6), 그래도 다르면 한 덩이
    expect(
      norm({ tori_ko: ["와,", "축구!", "어떤 운동이 재밌어?"] }).tori_ko,
    ).toEqual(["와, 축구!", "어떤 운동이 재밌어?"]);
    expect(
      norm({ tori_ko: ["와 축구", "어떤", "운동이 재밌어"] }).tori_ko,
    ).toEqual(["와 축구 어떤 운동이 재밌어"]);
    const legacy = normalizeTalkLesson(
      { ...answer(), tori_ko: "와, 축구! 어떤 운동이 재밌어?" },
      input3(),
      lessonRules(3),
    );
    // 옛 한 글 꼴도 한국어 문장 끝으로 나눠 문장 수가 맞으면 문장마다(대본 4회차 N-6)
    expect(legacy?.tori_ko).toEqual(["와, 축구!", "어떤 운동이 재밌어?"]);
    const five = normalizeTalkLesson(answer(), lessonInput(5), lessonRules(5));
    expect(five?.tori_ko).toEqual([]);
  });

  it("출력 검사는 뜻을 문장마다 보고, 걸린 문장의 뜻만 비운다(자리는 남김)", () => {
    const value = norm({});
    expect(
      talkLessonCheckFields(value).filter((f) => f.path.startsWith("tori_ko")),
    ).toHaveLength(2);
    const hit: FieldHit = { kind: "forbidden", match: "x" };
    const checked = applyTalkLessonChecks(
      value,
      new Map([["tori_ko.1", [hit]]]),
      input3(),
    );
    expect(checked.value.tori_ko).toEqual(["와, 축구!", ""]);
  });

  it("빠진 선생님 문장의 뜻만 빼고 남은 문장의 뜻은 보인다(1~3단계) · 문장 수가 다르면 옛 규칙", () => {
    const sent = ["Oh, nice!", "I like Sunday!", "Listen and say!"];
    const shown = ["Oh, nice!", "Listen and say!"];
    expect(
      toriKoShownOf({
        ko: ["좋아!", "나는 일요일이 좋아!", "듣고 따라 해!"],
        sent,
        shown,
        lowBand: true,
      }),
    ).toBe("좋아! 듣고 따라 해!");
    expect(
      toriKoShownOf({ ko: ["좋아!"], sent, shown, lowBand: true }),
    ).toBeNull();
    expect(
      toriKoShownOf({ ko: "좋아!", sent, shown: sent, lowBand: true }),
    ).toBe("좋아!");
    expect(
      toriKoShownOf({
        ko: ["좋아!", "", "듣고 따라 해!"],
        sent,
        shown: sent,
        lowBand: false,
      }),
    ).toBe("좋아! 듣고 따라 해!");
    expect(
      toriKoShownOf({ ko: [], sent, shown: sent, lowBand: true }),
    ).toBeNull();
  });

  it("끝 처리: 선택지의 답을 담아 빠진 선생님 문장의 뜻만 빠지고, 문장 문이 걸린 응답은 뜻을 보이지 않는다", () => {
    const turns = [...opening3(), said()];
    const a: LessonArgs = {
      spec: SPEC3,
      card: CARD3,
      newWords: NEW3,
      turns,
      segment: "talk",
      settings: LOW,
      prepWords: CARD3.prep ?? [],
    };
    const plan = nextTeacherTurnOf(a);
    const run = (outcome: LessonOutcomeView) => {
      const flow = createLessonSentenceFlow({
        low: true,
        ifAnswered: plan,
        ifStuck: null,
        asked: talkLessonPositionOf(a).askedQuestions,
        max: LOW.sameQuestionMax,
      });
      flow.stuck(false);
      for (const s of [
        "Oh, nice!",
        "Do you like it?",
        "I like Sunday!",
        "Listen and say!",
      ])
        flow.accept(s);
      return settleLessonTurn({
        flow,
        outcome,
        ctx: {
          card: CARD3,
          turns,
          asked: talkLessonPositionOf(a).askedQuestions,
          max: LOW.sameQuestionMax,
          low: true,
          koMeaning: true,
          dropped: [],
          spec: SPEC3,
          lineOptions: {
            sentenceMaxWords: 8,
            allowedWords: new Set(
              "do you like it oh nice i sunday listen and say".split(" "),
            ),
            unitWords: NEW3,
            childWords: [],
            teacherName: "Mina",
            lemmaOf: () => undefined,
            forms: [],
            allowedForms: new Set(),
          },
        },
      });
    };
    const value = answer({
      tori_en: "Oh, nice! Do you like it? I like Sunday! Listen and say!",
      next_targets: ["sunday"],
      next_move: "follow_up",
      card_item: { kind: "none", no: 0 },
      choices: ["I like it.", "I like Sunday."],
      tori_ko: ["좋아!", "좋아해?", "나는 일요일이 좋아!", "듣고 따라 해!"],
    });
    const ok = run({ kind: "ok", value, hintsBlocked: false, overLength: 0 });
    // 1~3단계 AI 가 쓴 신호 말은 지운다('AI 몫 넓힘' C207) — 그 문장의 뜻도 빠진다
    expect(ok.kept).toEqual(["Oh, nice!", "Do you like it?"]);
    expect(ok.ko).toBe("좋아! 좋아해?");
    const blocked = run({
      kind: "ok",
      value,
      hintsBlocked: false,
      overLength: 0,
      blocked: 1,
    });
    expect(blocked.ko).toBeNull();
  });
});

describe("5.1 7 · 5.2 4 설정값 · Minor 셋", () => {
  it("talk.wait_line_seconds 기본값은 3 이다(seed · 시험용 설정, 13절 C202 (6))", () => {
    const seed = JSON.parse(
      readFileSync(join(process.cwd(), "seed/settings.json"), "utf8"),
    ) as { settings: { key: string; value: unknown }[] };
    expect(
      seed.settings.find((s) => s.key === "talk.wait_line_seconds")?.value,
    ).toBe(3);
    expect(TEST_SETTINGS["talk.wait_line_seconds"].value).toBe(3);
  });

  it("A7 선생님 문장 수가 구간 상한을 넘으면 길이 초과로 적는다(낱말 수 초과와 함께)", () => {
    const max = teacherSentencesMaxOf(values, 3);
    expect(max).toBe(TEST_SETTINGS["talk.teacher_sentences_max.1-3"].value);
    expect(lessonOverLengthOf({ words: 0, sentences: max + 1, max })).toBe(
      true,
    );
    expect(lessonOverLengthOf({ words: 0, sentences: max, max })).toBe(false);
    expect(lessonOverLengthOf({ words: 1, sentences: 1, max })).toBe(true);
  });

  it("A9 인식 실패 · 말소리 없음으로 건너뛴 인사 뒤 준비 낱말은 '이미 만난 낱말'에 넣지 않는다(02-2 177)", () => {
    const prep = (word: string, index: number, skipped?: string) => ({
      v: 1,
      kind: "talk-prep",
      step: "final",
      word,
      heard: [],
      index,
      place: "greeting",
      target: `I ${word}.`,
      failures: skipped ? 3 : 0,
      ...(skipped ? { skipped } : {}),
    });
    const inputs = [
      prep("eat", 0, "recognition"),
      prep("drink", 1, "recognition"),
      prep("go", 2),
    ];
    expect(skippedPrepWordsOf(inputs)).toEqual(["eat", "drink"]);
    const ctx = lessonContextAt(
      {
        start: { metBefore: [], prepPlan: [], carry: { goals: [], words: [] } },
        lesson: { newWords: ["eat", "drink", "go"] } as never,
        lemmaOf: () => undefined,
        prepWords: ["eat", "drink", "go"],
      },
      {
        rows: [],
        knownSay: new Set(),
        friendship: 0,
        unitWords: ["eat", "drink", "go"],
        skippedPrep: skippedPrepWordsOf(inputs),
      },
    );
    expect(ctx.metUnknownWords).toEqual(["go"]);
  });
});

describe("13절 C203 (3) 걸린 1~3단계 AI 질문은 한 번 다시 쓰게 한다(컨트롤러 잠정)", () => {
  const OPTIONS = {
    sentenceMaxWords: 8,
    allowedWords: new Set("do you like it oh nice i what is fun".split(" ")),
    unitWords: NEW3,
    childWords: ["play"],
    teacherName: "Mina",
    lemmaOf: () => undefined,
    forms: [],
    allowedForms: new Set<string>(),
  };
  const turns = [...opening3(), said()];
  const a: LessonArgs = {
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns,
    segment: "talk",
    settings: LOW,
    prepWords: CARD3.prep ?? [],
  };
  const plan = nextTeacherTurnOf(a);
  const asked = talkLessonPositionOf(a).askedQuestions;
  const flowOf = (sentences: string[]) => {
    const flow = createLessonSentenceFlow({
      low: true,
      ifAnswered: plan,
      ifStuck: null,
      asked,
      max: LOW.sameQuestionMax,
    });
    flow.stuck(false);
    for (const en of sentences) flow.accept(en);
    return flow;
  };
  const outValue = (over: Partial<TalkLessonOutput>) =>
    answer({
      next_move: "follow_up",
      card_item: { kind: "none", no: 0 },
      next_targets: [],
      tori_ko: [],
      ...over,
    });
  const okView = (value: TalkLessonOutput): LessonOutcomeView => ({
    kind: "ok",
    value,
    hintsBlocked: false,
    overLength: 0,
  });
  const retryAnswer = (sentences: string[]): QuestionRetryAnswer => ({
    value: outValue({
      tori_en: sentences.join(" "),
      recast: "AI 다시 쓴 되풀이",
    }),
    entries: flowOf(sentences).entries(),
    hintsBlocked: false,
    overLength: 0,
    blocked: 0,
  });
  const settle = (
    flow: Parameters<typeof settleLessonTurn>[0]["flow"],
    view: LessonOutcomeView,
  ) =>
    settleLessonTurn({
      flow,
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

  it("걸린 질문 찾기 · 다시 쓰게 할 메시지: 까닭 · 걸린 낱말 · 낱말 수 상한 · 아이가 말한 낱말 · 노리는 단어 금지를 알린다", () => {
    const flow = flowOf(["Nice!", "Do you like basketball?"]);
    const fail = heldQuestionFailOf({
      entries: flow.entries(),
      targets: ["soccer"],
      options: OPTIONS,
    });
    expect(fail).toEqual({
      question: "Do you like basketball?",
      reason: "offband",
      words: ["basketball"],
    });
    if (fail === null) throw new Error("걸린 질문이 없다");
    const note = questionRetryNoteOf(fail, {
      sentenceMaxWords: 8,
      targets: ["soccer"],
      childWords: ["play"],
    });
    expect(note).toContain('"Do you like basketball?"');
    expect(note).toContain("(words: basketball)");
    expect(note).toContain("at most 8 words");
    expect(note).toContain("words the child said (play)");
    expect(note).toContain("(aims at: soccer)");
    expect(
      heldQuestionFailOf({
        entries: flowOf(["Nice!", "Do you like it?"]).entries(),
        targets: [],
        options: OPTIONS,
      }),
    ).toBeNull();
  });

  it("다시 쓴 질문이 검사를 지나면 카드 자리로 바꾸지 않고 앞 응답의 반응 뒤에 그 질문을 낸다(재호출 1회, 아이 말에 대한 칸은 앞 응답 값)", async () => {
    const flow = flowOf(["Nice!", "Do you like basketball?"]);
    const first = outValue({
      tori_en: "Nice! Do you like basketball?",
      recast: "I play.",
    });
    let calls = 0;
    const out = await withQuestionRetry({
      flow,
      view: okView(first),
      lineOptions: OPTIONS,
      sentenceMaxWords: 8,
      retry: async () => {
        calls += 1;
        return retryAnswer(["Oh!", "Do you like it?"]);
      },
    });
    expect(calls).toBe(1);
    expect(out.retried).toBe(true);
    const result = settle(out.flow, out.view);
    expect(result.plan.kind).toBe("ai");
    expect(result.replaced).toBeNull();
    expect(result.release).toEqual(["Do you like it?"]);
    expect(result.kept).toEqual(["Nice!", "Do you like it?"]);
    if (out.view.kind !== "ok") throw new Error("ok 가 아니다");
    expect(out.view.value.recast).toBe("I play.");
  });

  it("다시 쓴 응답이 없거나 다시 쓴 질문도 걸리면 지금처럼 카드 자리로 바꾸고, 더 다시 부르지 않는다", async () => {
    for (const again of [null, retryAnswer(["Do you like basketball now?"])]) {
      const flow = flowOf(["Nice!", "Do you like basketball?"]);
      let calls = 0;
      const out = await withQuestionRetry({
        flow,
        view: okView(outValue({ tori_en: "Nice! Do you like basketball?" })),
        lineOptions: OPTIONS,
        sentenceMaxWords: 8,
        retry: async () => {
          calls += 1;
          return again;
        },
      });
      expect(calls).toBe(1);
      const result = settle(out.flow, out.view);
      expect(result.plan.kind).toBe("card_slot");
      expect(result.replaced).toBe("question_check");
    }
  });

  it("질문이 검사를 지나거나 질문을 쓰지 않는 차례 · 범위를 읽지 못한 턴은 다시 부르지 않는다", async () => {
    let calls = 0;
    const retry = async () => {
      calls += 1;
      return null;
    };
    await withQuestionRetry({
      flow: flowOf(["Nice!", "Do you like it?"]),
      view: okView(outValue({})),
      lineOptions: OPTIONS,
      sentenceMaxWords: 8,
      retry,
    });
    await withQuestionRetry({
      flow: flowOf(["Nice!", "Do you like basketball?"]),
      view: okView(outValue({})),
      lineOptions: null,
      sentenceMaxWords: 8,
      retry,
    });
    expect(calls).toBe(0);
  });

  it("잇기: 뜻은 두 응답이 문장마다 맞을 때 문장마다 잇고, 다시 쓴 응답에 질문이 없으면 null", () => {
    const firstEntries = flowOf(["Nice!", "Do you like basketball?"]).entries();
    const merged = mergeQuestionRetry({
      first: outValue({ tori_ko: ["좋아!", "농구 좋아해?"] }),
      firstEntries,
      retry: outValue({ tori_ko: ["오!", "그거 좋아해?"] }),
      retryEntries: flowOf(["Oh!", "Do you like it?"]).entries(),
    });
    expect(merged?.value.tori_ko).toEqual(["좋아!", "그거 좋아해?"]);
    expect(merged?.value.tori_en).toBe("Nice! Do you like it?");
    expect(
      mergeQuestionRetry({
        first: outValue({}),
        firstEntries,
        retry: outValue({}),
        retryEntries: flowOf(["Oh, nice!"]).entries(),
      }),
    ).toBeNull();
  });

  it("다시 쓰기 호출의 ai_calls 표지는 error_code 칸에 단다(목적은 talk_turn 그대로)", () => {
    expect(taggedErrorCode(null, "question_retry")).toBe("question_retry");
    expect(taggedErrorCode("timeout", "question_retry")).toBe(
      "question_retry:timeout",
    );
    expect(taggedErrorCode("timeout", undefined)).toBe("timeout");
  });
});

describe("fix 2(검토 rev-night-2 fix1 N-1 · N-3 · N-4 · N-5)", () => {
  const a: LessonArgs = {
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns: [...opening3(), said()],
    segment: "talk",
    settings: LOW,
    prepWords: CARD3.prep ?? [],
  };
  const plan = nextTeacherTurnOf(a);
  const entriesOf = (sentences: string[]) => {
    const flow = createLessonSentenceFlow({
      low: true,
      ifAnswered: plan,
      ifStuck: null,
      asked: talkLessonPositionOf(a).askedQuestions,
      max: LOW.sameQuestionMax,
    });
    flow.stuck(false);
    for (const en of sentences) flow.accept(en);
    return flow;
  };
  const v = (over: Partial<TalkLessonOutput>) =>
    answer({
      next_move: "follow_up",
      card_item: { kind: "none", no: 0 },
      next_targets: [],
      ...over,
    });

  it("N-1 앞 응답 뜻이 문장 수와 맞지 않으면 그 자리는 빈 뜻이라, 걸린 질문 · 버린 반응의 뜻이 붙지 않고 다시 쓴 질문의 뜻만 보인다", () => {
    const firstEntries = entriesOf([
      "Yum, rice!",
      "Do you eat it with your family?",
    ]).entries();
    const retryEntries = entriesOf(["Good!", "Do you like rice?"]).entries();
    const merged = mergeQuestionRetry({
      first: v({ tori_ko: ["냠, 밥! 가족이랑 같이 먹어?"] }),
      firstEntries,
      retry: v({ tori_ko: ["좋아!", "밥 좋아해?"] }),
      retryEntries,
    });
    expect(merged?.value.tori_ko).toEqual(["", "밥 좋아해?"]);
    const sent = merged?.entries.map((e) => e.en) ?? [];
    expect(sent).toEqual(["Yum, rice!", "Do you like rice?"]);
    expect(
      toriKoShownOf({
        ko: merged?.value.tori_ko ?? [],
        sent,
        shown: sent,
        lowBand: true,
      }),
    ).toBe("밥 좋아해?");
    // 두 쪽 모두 맞지 않으면 뜻 없음
    const none = mergeQuestionRetry({
      first: v({ tori_ko: ["냠, 밥! 가족이랑 같이 먹어?"] }),
      firstEntries,
      retry: v({ tori_ko: ["좋아! 밥 좋아해?"] }),
      retryEntries,
    });
    expect(none?.value.tori_ko).toEqual([]);
    expect(
      toriKoShownOf({ ko: [], sent, shown: sent, lowBand: true }),
    ).toBeNull();
  });

  it("N-3 다시 부르기는 받은 때부터 지난 시간 + 기다림 상한 + 저장 여유가 끝점 상한 안일 때만이고, 끝점 maxDuration 은 TURN_IN_FLIGHT_MS 와 같다", async () => {
    const timeoutMs = (values["ai.timeout_seconds.realtime"] as number) * 1000;
    const room = TURN_IN_FLIGHT_MS - TURN_SAVE_GRACE_MS - 2 * timeoutMs;
    expect(questionRetryFits({ elapsedMs: room, timeoutMs })).toBe(true);
    expect(questionRetryFits({ elapsedMs: room + 1, timeoutMs })).toBe(false);
    const route = readFileSync(
      join(process.cwd(), "src/app/api/talk/turn/route.ts"),
      "utf8",
    );
    expect(route).toContain(
      `export const maxDuration = ${TURN_IN_FLIGHT_MS / 1000};`,
    );
    let calls = 0;
    await withQuestionRetry({
      flow: entriesOf(["Nice!", "Do you like basketball?"]),
      view: { kind: "ok", value: v({}), hintsBlocked: false, overLength: 0 },
      lineOptions: {
        sentenceMaxWords: 8,
        allowedWords: new Set(["do", "you", "like", "nice"]),
        unitWords: NEW3,
        childWords: [],
        teacherName: "Mina",
        lemmaOf: () => undefined,
        forms: [],
        allowedForms: new Set(),
      },
      sentenceMaxWords: 8,
      canRetry: false,
      retry: async () => {
        calls += 1;
        return null;
      },
    });
    expect(calls).toBe(0);
  });

  it("N-4 다시 쓴 응답의 소리 줄 바뀜(soundFixed)을 끝 처리로 넘기고, N-5 ok 가 아닌 결과 · 질문을 쓰지 않는 차례는 다시 부르지 않는다", async () => {
    const lineOptions = {
      sentenceMaxWords: 8,
      allowedWords: new Set(["do", "you", "like", "it", "nice", "oh"]),
      unitWords: NEW3,
      childWords: [],
      teacherName: "Mina",
      lemmaOf: () => undefined,
      forms: [],
      allowedForms: new Set<string>(),
    };
    const out = await withQuestionRetry({
      flow: entriesOf(["Nice!", "Do you like basketball?"]),
      view: { kind: "ok", value: v({}), hintsBlocked: false, overLength: 0 },
      lineOptions,
      sentenceMaxWords: 8,
      retry: async () => ({
        value: v({ tori_en: "Oh! Do you like it?" }),
        entries: entriesOf(["Oh!", "Do you like it?"]).entries(),
        hintsBlocked: false,
        overLength: 0,
        blocked: 0,
        soundFixed: { model: true, choices: false },
      }),
    });
    expect(out.view.kind === "ok" ? out.view.soundFixed : null).toEqual({
      model: true,
      choices: false,
    });
    let calls = 0;
    const retry = async () => {
      calls += 1;
      return null;
    };
    await withQuestionRetry({
      flow: entriesOf(["Nice!", "Do you like basketball?"]),
      view: { kind: "cut", overLength: 0 },
      lineOptions,
      sentenceMaxWords: 8,
      retry,
    });
    // 질문을 쓰지 않는 차례(카드 자리 계획)
    const slot = { ...plan, kind: "card_slot" as const, aiAsks: false };
    const slotFlow = createLessonSentenceFlow({
      low: true,
      ifAnswered: slot,
      ifStuck: null,
      asked: new Map(),
      max: LOW.sameQuestionMax,
    });
    slotFlow.stuck(false);
    slotFlow.accept("Nice!");
    await withQuestionRetry({
      flow: slotFlow,
      view: { kind: "ok", value: v({}), hintsBlocked: false, overLength: 0 },
      lineOptions,
      sentenceMaxWords: 8,
      retry,
    });
    expect(calls).toBe(0);
  });

  it("N-5 다시 쓰기 메시지는 이번 사용자 메시지 뒤에 assistant(앞 응답) · user(다시 쓰기) 차례로 붙고, 다시 쓰기 메시지는 아이 말처럼 가린다", () => {
    const base = input3();
    const input = {
      ...base,
      retry: {
        previous: "Nice! Do you like basketball?",
        note: "NOTE 010-1234",
      },
    };
    const messages = talkLessonMessages(input);
    expect(messages.at(-3)?.role).toBe("user");
    expect(messages.at(-2)).toEqual({
      role: "assistant",
      content: "Nice! Do you like basketball?",
    });
    expect(messages.at(-1)).toEqual({ role: "user", content: "NOTE 010-1234" });
    expect(talkLessonMessages(base).at(-1)?.role).toBe("user");
    const masked = talkLessonTurnSpec.mask?.(input, (text) => ({
      text: text.replace("010-1234", "[번호]"),
      names: 0,
      contacts: text.includes("010-1234") ? 1 : 0,
    }));
    expect(masked?.retry).toEqual({
      previous: "Nice! Do you like basketball?",
      note: "NOTE [번호]",
    });
  });
});

// 회화 수업 턴 새 꼴 규격(회화 plan 묶음 6 — 증명 AC-15c · 15b · 15k · 15d 단위 몫 · 정한 것 4 · 11 · 19, 6.1 · 6.2 · 6.4 · C189).
// 실제 API 를 부르지 않는다. 설계 숫자는 시험용 설정(testSettingValues)과 견본 입력(talk-lesson-inputs)에서 읽는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CallSettingError } from "@/core/ai/calls/common";
import {
  applyTalkLessonChecks,
  chosenCallTurnOf,
  holdsQuestionSentence,
  normalizeTalkLesson,
  type TalkLessonOutput,
  talkCallTurnOf,
  talkLessonCheckFields,
  talkLessonClosingSpec,
  talkLessonContextDelta,
  talkLessonRewriteOf,
  talkLessonRulesOf,
  talkLessonSystem,
  talkLessonTurnSpec,
  talkLessonUserMessage,
  teacherBlockOf,
} from "@/core/ai/calls/talk-lesson";
import type { FieldHit } from "@/core/ai/output-check";
import {
  type LessonArgs,
  nextTeacherTurnOf,
  teacherTurnPlansOf,
} from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import {
  LevelSpecsFileSchema,
  type TalkLevelSpec,
  TalkLevelSpecSchema,
} from "@/core/seed/schema/reference";
import {
  BASE_CALL_TURN,
  CARRY_GOAL,
  GOAL_1,
  GOAL_2,
  LESSON_TEACHER,
  LESSON_TEACHER_LEO,
  lessonInput,
  lessonRules,
  OTHER_GOAL,
  values,
} from "../fixtures/ai/talk-lesson-inputs";
import {
  aiTurn,
  button,
  CARD3 as FLOW_CARD3,
  CARD4 as FLOW_CARD4,
  LOW,
  MID,
  NEW3,
  NEW4,
  noSpeech,
  opening3,
  SPEC3,
  SPEC4,
  said,
  teacher,
} from "../fixtures/talk-lesson";

/** 빈 응답(모든 칸이 빈 값) 위에 고칠 칸만 얹는다. */
function answer(over: Partial<TalkLessonOutput> = {}): TalkLessonOutput {
  return {
    stuck: false,
    tori_en: "Wow, soccer! What sport is fun?",
    model_line: "",
    choices: [],
    tori_ko: "와, 축구! 어떤 운동이 재밌어?",
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

function norm(
  level: number,
  value: Partial<TalkLessonOutput>,
  over: Parameters<typeof lessonInput>[1] = {},
): TalkLessonOutput {
  const input = lessonInput(level, over);
  const result = normalizeTalkLesson(answer(value), input, lessonRules(level));
  if (result === null) throw new Error("정규화가 null 이다");
  return result;
}

const schemaOf = (level: number, teacher = LESSON_TEACHER) => {
  const input = lessonInput(level, { teacher });
  return z.toJSONSchema(
    talkLessonTurnSpec.wireSchema(input, lessonRules(level)),
  ) as { properties: Record<string, unknown>; title?: string };
};

describe("회화 수업 턴 응답 규격(6.2 회화 턴 출력 칸)", () => {
  it("AC-15c 새 칸(따라 할 말 · 선택지 · 알맞은 응답 · 아이가 꺼낸 이야기 · 아이가 물음 · 아이가 보인 능력 · 갈래 · 카드 항목 · 노린 목표 · 준 도움 · 그림 낱말)이 있고 판정 · 점수 칸 · 없앤 칸이 없으며 칸 차례가 stuck → tori_en → model_line → choices 다", () => {
    const schema = schemaOf(3);
    const keys = Object.keys(schema.properties);
    expect(keys.slice(0, 4)).toEqual([
      "stuck",
      "tori_en",
      "model_line",
      "choices",
    ]);
    for (const key of [
      "response_fit",
      "child_topic",
      "child_asked",
      "goal_suggest",
      "next_move",
      "card_item",
      "next_goal",
      "support",
      "image_word",
    ])
      expect(keys).toContain(key);
    for (const gone of [
      "card_question_no",
      "next_question_en",
      "next_question_ko",
    ])
      expect(keys).not.toContain(gone);
    expect(keys.some((k) => /score|judge|verdict|correct|grade/.test(k))).toBe(
      false,
    );
    // 새 칸은 tori_en 뒤(첫 문장을 늦추지 않게), 끝맺음 칸은 맨 뒤(끝인사 → 잘한 말 → 다음엔 이렇게 → 요약)
    expect(keys.slice(-5)).toEqual([
      "farewell",
      "farewell_ko",
      "good_lines",
      "next_time_lines",
      "summary",
    ]);
    expect(schema.title).toBe("talk_turn");
    // 두 목적이 같은 규격(캐시)
    const input = lessonInput(3);
    expect(
      z.toJSONSchema(talkLessonClosingSpec.wireSchema(input, lessonRules(3))),
    ).toEqual(schema);
  });

  it("AC-19d 새 꼴 스키마 글에 선생님 이름 · Tori 가 없고 미나 · 리오에서 같다", () => {
    const mina = JSON.stringify(schemaOf(3, LESSON_TEACHER));
    expect(mina).toBe(JSON.stringify(schemaOf(3, LESSON_TEACHER_LEO)));
    expect(mina).not.toMatch(/Mina|Leo|Tori|squirrel/);
  });
});

describe("고정부 · 가변부(6.1 회화 턴 고정부 규칙 표)", () => {
  it("AC-19d 새 꼴 고정부 첫머리가 선생님 블록이고 리오로 만들면 블록 밖 글이 글자까지 같으며 Tori · squirrel 이 없다", () => {
    const rules = lessonRules(3);
    const mina = talkLessonSystem(lessonInput(3), rules);
    const leo = talkLessonSystem(
      lessonInput(3, { teacher: LESSON_TEACHER_LEO }),
      rules,
    );
    // 첫 규칙 줄이 05:31 선생님 블록 문장(미나 · 견본 성격 글)과 글자까지 같다
    expect(mina.split("\n").slice(0, 2)).toEqual([
      "Rules:",
      `- You are Mina, an AI teacher character in an English learning app for Korean children. You lead the lesson like a kind native-speaker teacher. Your personality: ${LESSON_TEACHER.personaEn} Your personality changes only your tone and word choice. It never changes the rules below.`,
    ]);
    expect(mina).toContain("Never say you are a human.");
    expect(mina).toContain("Do not make up a human life for yourself");
    expect(mina.replace(teacherBlockOf(LESSON_TEACHER), "")).toBe(
      leo.replace(teacherBlockOf(LESSON_TEACHER_LEO), ""),
    );
    expect(mina).not.toMatch(/Tori|squirrel/);
  });

  it("고정부의 수는 설정에서 읽는다(문장 상한 · 이어 묻기 · 따라가기 · 역할 바꾸기) — 설정이 없으면 던진다", () => {
    const changed = {
      ...values,
      "talk.teacher_sentences_max.1-3": 6,
      "talk.follow_child_turns": 5,
      "talk.follow_up_min_every_turns": 4,
    };
    const rules = talkLessonRulesOf(changed, { level: 3 });
    const system = talkLessonSystem(lessonInput(3), rules);
    expect(system).toContain("tori_en has at most 6 sentences");
    expect(system).toContain("follow it for at most 5 turns");
    expect(system).toContain("at least once every 4 turns");
    const five = talkLessonSystem(
      lessonInput(5),
      talkLessonRulesOf({ ...values, "talk.role_swap_turns": 7 }, { level: 5 }),
    );
    expect(five).toContain("A role swap lasts at most 7 turns");
    // 구간마다 다른 키(4~6 구간)
    expect(talkLessonRulesOf(values, { level: 5 }).teacherSentencesMax).toBe(
      values["talk.teacher_sentences_max.4-6"],
    );
    const { "talk.follow_child_turns": _gone, ...missing } = values;
    expect(() => talkLessonRulesOf(missing, { level: 3 })).toThrow(
      CallSettingError,
    );
  });

  it("으뜸 원칙 · 카드 자리 · 받침 · 들리지 않음 · 마무리 제안 규칙은 모든 단계에, 소리 줄 규칙은 1~3단계에만, 미션 규칙은 미션이 있는 단계에만 있다", () => {
    const three = talkLessonSystem(lessonInput(3), lessonRules(3));
    const four = talkLessonSystem(lessonInput(4), lessonRules(4));
    const five = talkLessonSystem(lessonInput(5), lessonRules(5));
    for (const system of [three, four, five]) {
      expect(system).toContain("they are not a quota to finish the lesson");
      expect(system).toContain("When Turn is card_slot or closing_slot");
      expect(system).toContain("never ask the stuck question again");
      expect(system).toContain("When Reason is nospeech");
      expect(system).toContain("'All card chances used: yes'");
      expect(system).toContain("Never use next_move closing otherwise");
    }
    expect(three).toContain("Write the line to repeat in model_line");
    expect(four).not.toContain("Write the line to repeat in model_line");
    expect(four).toContain("Leave model_line, choices and image_word empty");
    expect(five).toContain("Missions:");
    expect(four).not.toContain("Missions:");
  });

  it("가변부에 새 꼴 카드의 목표(글) · 이월 목표 · 필수 질문 · 더 이야기할 거리 · 미션 · 역할 바꾸기가 들고 시스템 프롬프트는 턴마다 바뀌지 않는다(캐시)", () => {
    const five = talkLessonSystem(lessonInput(5), lessonRules(5));
    expect(five).toContain(`Lesson goals: ${GOAL_1}: 주말에 하는 일을 말한다`);
    expect(five).toContain(
      `Carry-over goals from earlier lessons: ${CARRY_GOAL}: 친구와 하는 일을 말한다`,
    );
    expect(five).toContain(
      "Required questions: 1. What do you do on the weekend? (aims at: play; goals: talk-3-1-1)",
    );
    expect(five).toContain("More talk: 1. What do you do after school?");
    expect(five).toContain("Missions: 1. Buy two apples. (goals: talk-3-1-1)");
    expect(five).toContain("Role swap: Now you sell, and I buy.");
    const a = talkLessonSystem(lessonInput(3), lessonRules(3));
    const b = talkLessonSystem(
      lessonInput(3, {
        turn: {
          kind: "card_slot",
          supportStage: 2,
          allChancesUsed: true,
          turnsLeft: 1,
          context: { friendship: 4 },
        },
      }),
      lessonRules(3),
    );
    expect(b).toBe(a);
  });
});

describe("사용자 메시지 · 다시 쓸 선생님 차례(6.1 · AC-15k)", () => {
  it("AC-15k 사용자 메시지 줄: 늘 넣는 줄이 차례대로 들고 옛 줄(모름 수 · 목표 턴 · 더 이야기할 거리 다 씀 · AI 자리)은 없다", () => {
    const message = talkLessonUserMessage({
      ...BASE_CALL_TURN,
      kind: "card_slot",
      aiAsks: false,
      cardLine: {
        role: "card",
        kind: "required",
        no: 2,
        en: "What sport is fun?",
      },
      followChildTurns: 1,
      returnNudge: true,
    });
    expect(message.split("\n")).toEqual([
      "Child: I play soccer.",
      "Input: speech",
      "Segment: talk",
      "Hint: none (0)",
      "Heard help: -",
      "Reason: -",
      "Turn: card_slot",
      "Question: no",
      "Card line: required 2: What sport is fun?",
      "Support stage: 0",
      "Stuck question: -",
      `Chances, carry-over goals: ${CARRY_GOAL}`,
      "Chances, carry-over words: (none)",
      "Chances, required questions: 2 (aims at: soccer); 3 (aims at: sunday)",
      "Chances, words to use again: play",
      "Chances, new words to introduce: weekend",
      "Return to today's topic: yes",
      "All card chances used: no",
      "Following child's topic: 1",
      "Turns left before closing question: 9",
      "Floor: no",
      "Closing: no",
      "Level test: no",
    ]);
    for (const old of [
      "Don't-know count",
      "Target reached",
      "More-talk material used up",
      "AI question slot",
    ])
      expect(message).not.toContain(old);
  });

  it("AC-15c 회화 턴 사용자 메시지에 이 턴의 힌트 종류와 아직 '안다'가 아닌 단원 단어 · 까닭 · 받침 단계 · 막힌 질문이 든다", () => {
    const message = talkLessonUserMessage({
      ...BASE_CALL_TURN,
      child: "",
      input: "dont_know",
      hintKind: "english",
      hintTier: 2,
      heardHelp: "answer_example",
      reason: "nospeech",
      supportStage: 1,
      stuckQuestion: "What sport is fun?",
      context: { unknownWords: ["soccer", "weekend"] },
    });
    expect(message).toContain("Child: (don't know)");
    expect(message).toContain("Hint: english (2)");
    expect(message).toContain("Heard help: answer_example");
    expect(message).toContain("Reason: nospeech");
    expect(message).toContain("Support stage: 1");
    expect(message).toContain("Stuck question: What sport is fun?");
    expect(message).toContain("Unit words not known yet: soccer, weekend");
  });

  it("AC-15k 첫 턴은 앱의 첫 말을 'Mina (app):' 이름표로 앞에 두고, 둘째 턴부터는 앞 턴 짝을 글자 그대로 앞에 두며 바뀐 값은 그 턴 사용자 메시지에만 든다", () => {
    const rules = lessonRules(3);
    const first = lessonInput(3, {
      openingLine: "Hi! How are you today?",
      turn: { context: { friendship: 2, newWords: ["play"] } },
    });
    const firstMessages = talkLessonTurnSpec.messages(first, rules);
    expect(firstMessages).toHaveLength(1);
    expect(firstMessages[0]?.content.split("\n")[0]).toBe(
      "Mina (app): Hi! How are you today?",
    );
    const firstUser = firstMessages[0]?.content ?? "";
    const rewrite = talkLessonRewriteOf({
      sentSentences: ["Wow!", "What sport is fun?"],
      appended: [],
    });
    const second = lessonInput(3, {
      openingLine: "Hi! How are you today?",
      history: [{ user: firstUser, assistant: rewrite }],
      turn: { child: "Soccer.", context: { friendship: 3 } },
    });
    const messages = talkLessonTurnSpec.messages(second, rules);
    expect(messages.slice(0, 2)).toEqual([
      { role: "user", content: firstUser },
      { role: "assistant", content: rewrite },
    ]);
    const last = messages[2]?.content ?? "";
    expect(last).not.toContain("(app):");
    expect(last).toContain("Friendship: 3");
    expect(last).not.toContain("New words of this lesson");
  });

  it("AC-15k 바뀐 값만 넣는다(첫 턴이면 모두)", () => {
    const ctx = {
      unknownWords: ["soccer"],
      metUnknownWords: [],
      newWords: ["play"],
      friendship: 2,
      missionsDone: [],
    };
    expect(talkLessonContextDelta(null, ctx)).toEqual(ctx);
    expect(talkLessonContextDelta(ctx, { ...ctx, friendship: 3 })).toEqual({
      friendship: 3,
    });
    expect(talkLessonContextDelta(ctx, { ...ctx })).toEqual({});
  });

  it("AC-15k 다시 쓸 선생님 차례: 검사를 지난 tori_en 뒤에 소리 줄(따라 할 말 · 선택지)과 앱이 붙인 받침 줄 · 카드 질문이 화면 차례대로 들고 tori_ko 는 없다", () => {
    const rewrite = talkLessonRewriteOf({
      sentSentences: [
        "That's okay!",
        "Let's say it together.",
        "Listen and say!",
      ],
      sound: {
        modelLine: "I play soccer.",
        choices: ["I like red.", "I like blue."],
      },
      appended: ["What sport is fun?"],
    });
    expect(rewrite.split("\n")).toEqual([
      "That's okay! Let's say it together. Listen and say!",
      "I play soccer.",
      "I like red. Or I like blue.",
      "What sport is fun?",
    ]);
    expect(rewrite).not.toMatch(/[가-힣]/);
    // 빈 소리 줄은 줄을 만들지 않는다
    expect(
      talkLessonRewriteOf({ sentSentences: ["Nice!"], appended: [] }),
    ).toBe("Nice!");
  });
});

describe("정규화 · 앱 확인(6.1 '회화 턴의 새 칸은 앱이 확인한다')", () => {
  it("AC-15c 카드 목표 · 이월 목표 밖의 목표 ID(아이가 보인 능력 · 노린 목표)를 걸러 낸다", () => {
    const v = norm(3, {
      goal_suggest: [
        { goal: GOAL_2, why_ko: "일요일을 좋아한다고 스스로 말했다" },
        { goal: OTHER_GOAL, why_ko: "다른 단원" },
        { goal: CARRY_GOAL, why_ko: "친구와 논다고 했다" },
        { goal: GOAL_2, why_ko: "겹침" },
      ],
      next_goal: [GOAL_1, OTHER_GOAL, CARRY_GOAL],
    });
    expect(v.goal_suggest.map((g) => g.goal)).toEqual([GOAL_2, CARRY_GOAL]);
    expect(v.next_goal).toEqual([GOAL_1, CARRY_GOAL]);
  });

  it("AC-15c 카드에 없는 카드 항목은 none · 0 으로 바꾼다", () => {
    expect(
      norm(3, { card_item: { kind: "required", no: 9 } }).card_item,
    ).toEqual({
      kind: "none",
      no: 0,
    });
    expect(norm(3, { card_item: { kind: "more", no: 2 } }).card_item).toEqual({
      kind: "more",
      no: 2,
    });
    expect(norm(3, { card_item: { kind: "more", no: 3 } }).card_item).toEqual({
      kind: "none",
      no: 0,
    });
  });

  it("AC-15c 꺼낸 새 단어는 이번 수업 새 단어이고 tori_en 이나 따라 할 말에 있을 때만 받는다(원형으로)", () => {
    const v = norm(3, {
      tori_en: "Weekends are fun! Listen and say!",
      model_line: "I play.",
      new_words: ["weekends", "play", "sunday", "apple"],
    });
    expect(v.new_words).toEqual(["weekend", "play"]);
  });

  it("AC-15c 범위 밖 따라 할 말은 카드 들려줄 말로 바꾸고, 꺼낸 낱말이 없으면 막힌 질문의 답 예시로 바꾼다", () => {
    const introduced = norm(3, {
      tori_en: "The weekend is fun! Listen and say!",
      model_line: "I adore the glorious weekend.",
      new_words: ["weekend"],
      support: "model_line",
    });
    expect(introduced.model_line).toBe("The weekend.");
    expect(introduced.new_words).toEqual(["weekend"]);
    const together = norm(
      3,
      {
        tori_en: "That's okay! Let's say it together. Listen and say!",
        model_line: "I usually enjoy playing outside.",
        support: "together",
      },
      {
        turn: {
          input: "dont_know",
          reason: "button",
          supportStage: 1,
          stuckAnswer: "I play.",
        },
      },
    );
    expect(together.model_line).toBe("I play.");
    // 범위 안이면 그대로
    expect(
      norm(3, { model_line: "I play soccer.", support: "model_line" })
        .model_line,
    ).toBe("I play soccer.");
  });

  it("AC-15c 같은 꼴이 아닌 선택지 · 노리는 단어가 없는 선택지 · 둘이 아닌 선택지는 빈 값이고 같은 꼴이면 그대로다", () => {
    expect(
      norm(3, { choices: ["I like soccer.", "I like tag."] }).choices,
    ).toEqual(["I like soccer.", "I like tag."]);
    expect(
      norm(3, { choices: ["Yes, I do.", "No, I don't."] }).choices,
    ).toEqual([]);
    expect(
      norm(3, { choices: ["I like tag.", "I like apple."] }).choices,
    ).toEqual([]);
    expect(norm(3, { choices: ["I like soccer."] }).choices).toEqual([]);
  });

  it("AC-15c '모름' 입력 턴의 미션 완료 제안 · 아이가 보인 능력 · 알맞은 응답 · 되풀이를 버리고, 말 입력 턴의 미션 완료는 미션 범위 안만 받는다", () => {
    const dontKnow = norm(
      5,
      {
        tori_en: "That's okay! Two apples, please.",
        mission_done: [1],
        goal_suggest: [{ goal: GOAL_1, why_ko: "샀다" }],
        recast: "Two apples, please.",
        response_fit: true,
        child_asked: true,
      },
      { turn: { input: "dont_know", reason: "button", child: "" } },
    );
    expect(dontKnow.mission_done).toEqual([]);
    expect(dontKnow.goal_suggest).toEqual([]);
    expect(dontKnow.response_fit).toBe(false);
    expect(dontKnow.child_asked).toBe(false);
    expect(dontKnow.recast).toBe("");
    const spoke = norm(5, { mission_done: [1, 1, 4, 0] });
    expect(spoke.mission_done).toEqual([1]);
    // 미션이 없는 단계는 미션 완료도 갈래 미션도 없다
    const three = norm(3, { mission_done: [1], next_move: "mission" });
    expect(three.mission_done).toEqual([]);
    expect(three.next_move).toBe("none");
  });

  it("카드 자리 · 마무리 자리 · 평가 대화 턴은 다음 질문 칸(갈래 · 카드 항목 · 노린 목표 · 힌트 · 소리 줄)을 비운다", () => {
    for (const turn of [
      { kind: "card_slot" as const },
      { kind: "closing_slot" as const },
      { levelTest: true },
    ]) {
      const v = norm(
        3,
        {
          model_line: "I play soccer.",
          choices: ["I like soccer.", "I like tag."],
        },
        { turn },
      );
      expect(v.next_move).toBe("none");
      expect(v.card_item).toEqual({ kind: "none", no: 0 });
      expect(v.next_goal).toEqual([]);
      expect(v.next_hints).toEqual([]);
      expect(v.next_targets).toEqual([]);
      expect(v.model_line).toBe("");
      expect(v.choices).toEqual([]);
      // 반응 쪽 기록은 남는다
      expect(v.response_fit).toBe(true);
    }
  });

  it("4단계부터는 소리 줄 · 그림 낱말을 비우고, 힌트가 없는 단계(10단계)는 노리는 단어 · 답 예시만 남긴다", () => {
    const four = norm(4, {
      model_line: "I play soccer.",
      choices: ["I like soccer.", "I like tag."],
      image_word: "soccer",
    });
    expect(four.model_line).toBe("");
    expect(four.choices).toEqual([]);
    expect(four.image_word).toBe("");
    expect(four.next_hints).toEqual(["___ is fun.", "Soccer is fun."]);
    const ten = norm(10, {});
    expect(ten.next_hints).toEqual([]);
    expect(ten.next_hint_ko).toBe("");
    expect(ten.next_targets).toEqual(["soccer"]);
    expect(ten.next_answer_example).toBe("Soccer is fun.");
    expect(ten.tori_ko).toBe("");
  });

  it("그림 낱말은 1~3단계에서 카탈로그에 있을 때만 받는다(둘째 묶음 — 첫 프리뷰는 기록만)", () => {
    expect(norm(3, { image_word: "Soccer" }).image_word).toBe("soccer");
    expect(norm(3, { image_word: "castle" }).image_word).toBe("");
    expect(
      norm(3, { image_word: "soccer" }, { imageWords: undefined }).image_word,
    ).toBe("");
  });

  it("회화 plan 정한 것 11: 갈래 '마무리'는 '카드 기회 다 다룸: 예'를 보낸 턴에서만 받고 다른 턴은 '없음'이다", () => {
    expect(norm(3, { next_move: "closing" }).next_move).toBe("none");
    expect(
      norm(3, { next_move: "closing" }, { turn: { allChancesUsed: true } })
        .next_move,
    ).toBe("closing");
    // 역할 바꾸기는 카드에 그 줄이 있을 때만
    expect(norm(5, { next_move: "role_swap" }).next_move).toBe("role_swap");
    expect(norm(4, { next_move: "role_swap" }).next_move).toBe("none");
    // 엄격 검사도 같은 조건으로 본다
    const input = lessonInput(3);
    expect(
      talkLessonTurnSpec.validate(
        answer({ next_move: "closing" }),
        input,
        lessonRules(3),
      ),
    ).toContain("카드 기회를 다 다루지 않은 턴의 갈래가 마무리다");
  });

  it("열거값 칸은 소문자로 다듬고 모르는 값은 none 이다 · 필수 칸이 없으면 null", () => {
    const input = lessonInput(3);
    const rules = lessonRules(3);
    const v = normalizeTalkLesson(
      {
        ...answer(),
        next_move: "Follow_Up",
        // 남은 줄과 맞추는 값(together · model_line · choices)이 아닌 것으로 다듬기만 본다(fix 2 N-2)
        support: "Easy_Question",
        card_item: { kind: "Required", no: 1 },
      },
      input,
      rules,
    );
    expect(v?.next_move).toBe("follow_up");
    expect(v?.support).toBe("easy_question");
    expect(v?.card_item).toEqual({ kind: "required", no: 1 });
    expect(
      normalizeTalkLesson(
        { ...answer(), next_move: "jump", support: "?" },
        input,
        rules,
      )?.next_move,
    ).toBe("none");
    expect(normalizeTalkLesson({ stuck: false }, input, rules)).toBeNull();
    expect(
      normalizeTalkLesson(
        { ...answer(), tori_en: "" },
        lessonInput(3, { turn: { closing: true } }),
        rules,
      ),
    ).toBeNull();
  });

  it("AC-15d 끝맺음 정규화: 5단계 다음엔 이렇게 3개 응답에서 1개만, 10단계는 2개를 남기고 4단계는 잘한 말과 다음엔 이렇게를 비우며 새 칸은 빈 값이다", () => {
    const closing = answer({
      tori_en: "",
      farewell: "It was fun to talk with you, {NAME}!",
      farewell_ko: "너랑 이야기해서 재밌었어!",
      good_lines: ["I play soccer.", "I like Sunday.", "Two apples."],
      next_time_lines: [
        "I play soccer on Sunday.",
        "I like tag.",
        "Thank you.",
      ],
      summary: "주말 이야기를 했다.",
      goal_suggest: [{ goal: GOAL_1, why_ko: "x" }],
      choices: ["a", "b"],
    });
    const at = (level: number) =>
      normalizeTalkLesson(
        closing,
        lessonInput(level, { turn: { closing: true, child: "" } }),
        lessonRules(level),
      );
    expect(at(5)?.next_time_lines).toHaveLength(1);
    expect(at(5)?.good_lines).toHaveLength(2);
    expect(at(10)?.next_time_lines).toHaveLength(2);
    expect(at(4)?.next_time_lines).toEqual([]);
    expect(at(4)?.good_lines).toEqual([]);
    expect(at(4)?.farewell_ko).toBe("너랑 이야기해서 재밌었어!");
    expect(at(5)?.farewell_ko).toBe("");
    expect(at(5)?.goal_suggest).toEqual([]);
    expect(at(5)?.choices).toEqual([]);
    expect(at(5)?.tori_en).toBe("");
  });
});

describe("출력 검사 칸 · 걸린 칸 바꾸기(6.4)", () => {
  const hit: FieldHit[] = [{ kind: "forbidden", match: "x" }];

  it("AC-15b 검사 칸에 따라 할 말 · 선택지 · 근거 한 줄이 들고, 걸리면 따라 할 말은 바꿀 글로 · 선택지는 비움 · 그 제안은 빠짐 · 힌트 묶음은 비우고 알린다", () => {
    const value = answer({
      model_line: "I play soccer.",
      choices: ["I like soccer.", "I like tag."],
      new_words: ["weekend"],
      goal_suggest: [
        { goal: GOAL_1, why_ko: "좋음" },
        { goal: GOAL_2, why_ko: "걸림" },
      ],
    });
    const paths = talkLessonCheckFields(value).map((f) => f.path);
    for (const path of [
      "model_line",
      "choices.0",
      "choices.1",
      "goal_suggest.1.why_ko",
      "next_hints.1",
      "next_answer_example",
    ])
      expect(paths).toContain(path);
    const input = lessonInput(3);
    const result = applyTalkLessonChecks(
      value,
      new Map([
        ["model_line", hit],
        ["choices.1", hit],
        ["goal_suggest.1.why_ko", hit],
        ["next_hints.0", hit],
      ]),
      input,
    );
    expect(result.changed).toBe(true);
    expect(result.modelLineReplaced).toBe(true);
    expect(result.value.model_line).toBe("The weekend.");
    expect(result.choicesBlocked).toBe(true);
    expect(result.value.choices).toEqual([]);
    expect(result.value.goal_suggest.map((g) => g.goal)).toEqual([GOAL_1]);
    expect(result.hintsBlocked).toBe(true);
    expect(result.value.next_hints).toEqual([]);
    expect(result.value.next_answer_example).toBe("");
    // 노리는 단어 · 갈래 · 카드 항목은 남는다(카드 항목의 힌트로 바꾸는 근거)
    expect(result.value.card_item).toEqual({ kind: "required", no: 2 });
    const clean = applyTalkLessonChecks(value, new Map(), input);
    expect(clean.changed).toBe(false);
    expect(clean.value).toBe(value);
  });

  it("'5-다' fix 2 재검토 F-1 출력 검사가 선택지를 비우거나 따라 할 말을 빈 대체 줄로 바꾸면 support 도 남은 줄과 다시 맞춘다(들은 도움을 세지 않게)", () => {
    const input = lessonInput(3);
    // 선택지가 걸려 비면 support choices → none
    const choices = applyTalkLessonChecks(
      answer({
        choices: ["I like soccer.", "I like tag."],
        support: "choices",
      }),
      new Map([["choices.0", hit]]),
      input,
    );
    expect(choices.value.choices).toEqual([]);
    expect(choices.value.support).toBe("none");
    // 따라 할 말이 걸리고 대체 줄도 없으면(새 단어 없음) support model_line · 1~3단계 together → none
    for (const support of ["model_line", "together"] as const) {
      const model = applyTalkLessonChecks(
        answer({ model_line: "I play soccer.", new_words: [], support }),
        new Map([["model_line", hit]]),
        input,
      );
      expect(model.value.model_line, support).toBe("");
      expect(model.value.support, support).toBe("none");
    }
    // 대체 줄이 있으면 그대로 둔다
    const replaced = applyTalkLessonChecks(
      answer({
        model_line: "I play soccer.",
        new_words: ["weekend"],
        support: "model_line",
      }),
      new Map([["model_line", hit]]),
      input,
    );
    expect(replaced.value.model_line).toBe("The weekend.");
    expect(replaced.value.support).toBe("model_line");
    // 4단계부터 같이 말하기는 선생님 말 안의 답이라 그대로다
    const four = applyTalkLessonChecks(
      answer({ model_line: "", support: "together" }),
      new Map([["tori_ko", hit]]),
      lessonInput(4),
    );
    expect(four.value.support).toBe("together");
  });

  it("회화 plan 정한 것 19: 1~3단계 tori_en 의 물음표 문장은 응답 끝까지 잡아 두고 반응 문장과 4단계부터의 질문은 잡지 않는다", () => {
    expect(holdsQuestionSentence(3, "What sport is fun?")).toBe(true);
    expect(holdsQuestionSentence(1, "Red? Or blue?")).toBe(true);
    expect(holdsQuestionSentence(3, "Wow, soccer!")).toBe(false);
    expect(holdsQuestionSentence(4, "What sport is fun?")).toBe(false);
  });
});

// ── fix 1(검토 I-1 · I-2 · I-3 · M-1~M-3): 묶음 5 차례 계획 → 호출 입력 ──────────

/** 묶음 5 흐름 견본(3단계 · 4단계)의 계획 입력. */
function flow3(turns: TalkLessonTurn[]): LessonArgs {
  return {
    spec: SPEC3,
    card: FLOW_CARD3,
    newWords: NEW3,
    turns,
    segment: "talk",
    settings: LOW,
    prepWords: FLOW_CARD3.prep ?? [],
  };
}
function opening4(): TalkLessonTurn[] {
  return [
    teacher("Hi! How was your day?", { kind: "first_question" }),
    said({ segment: "greeting_end" }),
    teacher("Nice! Let's talk.", { kind: "ai" }),
    teacher("What is your favorite subject?", {
      kind: "first_question",
      item: { kind: "required", no: 1 },
      words: ["math"],
    }),
  ];
}
function flow4(turns: TalkLessonTurn[]): LessonArgs {
  return {
    spec: SPEC4,
    card: FLOW_CARD4,
    newWords: NEW4,
    turns,
    segment: "talk",
    settings: MID,
    prepWords: [],
  };
}
const R1 = "What do you do on the weekend?";
const callOf = (
  plan: ReturnType<typeof nextTeacherTurnOf>,
  over: Partial<Parameters<typeof talkCallTurnOf>[0]> = {},
) =>
  talkCallTurnOf({
    plan,
    child: "",
    input: "dont_know",
    hintKind: "none",
    hintTier: 0,
    heardHelp: "none",
    ...over,
  });

describe("묶음 5 차례 계획 → 호출 입력(talkCallTurnOf, 검토 I-1 · I-2)", () => {
  it("계획 칸(종류 · 질문 여부 · 까닭 · 받침 단계 · 막힌 질문 · 답 · 붙일 카드 줄 · 기회 · 따라가기 · 남은 수)을 호출 입력으로 옮긴다", () => {
    // 3단계 단추 막힘 첫째: 카드 자리(카드 답 소리), 카드 줄 없음
    const first = callOf(nextTeacherTurnOf(flow3([...opening3(), button()])));
    expect(first).toMatchObject({
      kind: "card_slot",
      aiAsks: false,
      reason: "button",
      supportStage: 1,
      stuckQuestion: R1,
      stuckAnswer: "Answer first 1.",
      cardLine: null,
      segment: "talk",
      ifStuck: null,
      floor: false,
      closing: false,
      levelTest: false,
    });
    // 둘째: 카드 쉬운 질문을 붙이는 카드 자리
    const second = callOf(
      nextTeacherTurnOf(
        flow3([
          ...opening3(),
          button(),
          teacher("That's okay!", {
            kind: "card_slot",
            why: "support",
            stage: 1,
            cause: "button",
            item: { kind: "required", no: 1 },
            words: ["play"],
          }),
          button(),
        ]),
      ),
    );
    expect(second.supportStage).toBe(2);
    expect(second.cardLine).toEqual({
      role: "easy",
      kind: "required",
      no: 1,
      en: "Easy first 1?",
    });
    // 말로 답한 AI 차례: 기회 · 남은 수 · 따라가기
    const plan = nextTeacherTurnOf(flow3([...opening3(), said()]));
    const ai = callOf(plan, { child: "I play.", input: "speech" });
    expect(ai).toMatchObject({
      kind: "ai",
      aiAsks: true,
      reason: null,
      supportStage: 0,
      stuckQuestion: "",
      followChildTurns: plan.followRun,
      turnsLeft: plan.turnsLeft,
      allChancesUsed: plan.chances.allDealt,
      returnNudge: plan.chances.returnNudge,
    });
    expect(ai.chances).toEqual({
      carry: plan.chances.carry,
      required: plan.chances.required,
      reuse: plan.chances.reuse,
      introduce: plan.chances.introduce,
    });
  });

  it("들리지 않음 닫기(1~3단계)는 붙일 카드 질문이 있는 카드 자리이고 답 소리가 질문보다 먼저다(13절 C194 (1))", () => {
    const call = callOf(nextTeacherTurnOf(flow3([...opening3(), noSpeech()])));
    expect(call.kind).toBe("card_slot");
    expect(call.reason).toBe("nospeech");
    expect(call.cardLine?.role).toBe("card");
    expect(call.stuckAnswer).toBe("Answer first 1.");
  });

  it("AI 를 부르지 않는 계획(대화 첫 질문)은 호출 입력으로 옮기지 않는다", () => {
    const first = nextTeacherTurnOf(flow3(opening3().slice(0, 5)));
    expect(first.callsAi).toBe(false);
    expect(() => callOf(first)).toThrow();
  });

  it("AC-15k 말 입력 턴은 답함 계획과 막힘 계획(If stuck 줄)을 함께 사용자 메시지에 담고 '모름' 턴에는 If stuck 줄이 없다", () => {
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(flow3(opening3()), {
      segment: "talk",
      targets: ["play"],
    });
    const turn = callOf(ifAnswered, {
      ifStuck,
      child: "What?",
      input: "speech",
    });
    expect(turn.ifStuck).toMatchObject({
      kind: "card_slot",
      aiAsks: false,
      supportStage: 1,
      stuckQuestion: R1,
      stuckAnswer: "Answer first 1.",
    });
    const lines = talkLessonUserMessage(turn).split("\n");
    const at = (line: string) => lines.indexOf(line);
    expect(at("Turn: ai")).toBeGreaterThan(-1);
    expect(at("Question: yes")).toBe(at("Turn: ai") + 1);
    expect(lines).toEqual(
      expect.arrayContaining([
        "If stuck, Turn: card_slot",
        "If stuck, Question: no",
        "If stuck, Card line: -",
        "If stuck, Support stage: 1",
        `If stuck, Stuck question: ${R1}`,
      ]),
    );
    expect(at("If stuck, Turn: card_slot")).toBeGreaterThan(
      at("Stuck question: -"),
    );
    const dontKnow = talkLessonUserMessage(
      callOf(nextTeacherTurnOf(flow3([...opening3(), button()]))),
    );
    expect(dontKnow).not.toContain("If stuck");
  });

  it("말 입력이 아닌 턴의 막힘 계획은 받지 않는다", () => {
    const { ifStuck } = teacherTurnPlansOf(flow3(opening3()), {
      segment: "talk",
      targets: [],
    });
    const turn = callOf(nextTeacherTurnOf(flow3([...opening3(), button()])), {
      ifStuck,
    });
    expect(turn.ifStuck).toBeNull();
  });

  it("고정부: stuck 을 먼저 정하고 참이면 If stuck 줄을 따르며, 'Question: no' 턴은 질문을 쓰지 않는다", () => {
    const system = talkLessonSystem(lessonInput(3), lessonRules(3));
    expect(system).toContain("Decide stuck first.");
    expect(system).toContain("follow the 'If stuck' lines");
    expect(system).toContain("When 'Question: no', do not ask any question");
    expect(system).not.toContain("give the help of the next stage");
  });

  it("응답 첫 칸 stuck 이 참이면 고른 계획은 막힘 계획이고, 정규화도 그 계획으로 칸을 고른다(1~3단계: AI 따라 할 말 · 다음 질문 칸이 카드 답 소리와 겹치지 않음)", () => {
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(flow3(opening3()), {
      segment: "talk",
      targets: ["play"],
    });
    const turn = callOf(ifAnswered, {
      ifStuck,
      child: "What?",
      input: "speech",
    });
    expect(chosenCallTurnOf(turn, true)).toMatchObject({
      kind: "card_slot",
      reason: "stuck",
      supportStage: 1,
      ifStuck: null,
    });
    expect(chosenCallTurnOf(turn, false)).toBe(turn);
    const value = {
      model_line: "I play.",
      goal_suggest: [{ goal: GOAL_1, why_ko: "x" }],
      mission_done: [],
    };
    const stuck = norm(3, { ...value, stuck: true }, { turn });
    expect(stuck.model_line).toBe("");
    expect(stuck.next_move).toBe("none");
    expect(stuck.card_item).toEqual({ kind: "none", no: 0 });
    expect(stuck.next_hints).toEqual([]);
    expect(stuck.goal_suggest).toEqual([]);
    const answered = norm(3, { ...value, stuck: false }, { turn });
    expect(answered.model_line).toBe("I play.");
    expect(answered.next_move).toBe("required");
    expect(answered.goal_suggest).toHaveLength(1);
  });

  it("AI 를 묻지 않는 차례(4단계 같이 말하기)는 계획대로 aiAsks 거짓이고 정규화가 다음 질문 칸을 비운다 — 묻지 않은 필수 질문이 '다룸'이 되지 않는다", () => {
    const together = callOf(
      nextTeacherTurnOf(flow4([...opening4(), button()])),
    );
    expect(together).toMatchObject({
      kind: "ai",
      aiAsks: false,
      supportStage: 1,
    });
    const v = norm(4, {}, { turn: together });
    expect(v.next_move).toBe("none");
    expect(v.card_item).toEqual({ kind: "none", no: 0 });
    expect(v.next_goal).toEqual([]);
    expect(v.next_targets).toEqual([]);
    expect(v.next_hints).toEqual([]);
    expect(talkLessonUserMessage(together)).toContain("Question: no");
  });

  it("인사 끝 · 바닥선 턴도 다음 질문 칸을 비운다", () => {
    for (const turn of [
      { segment: "greeting_end" as const, aiAsks: false },
      { floor: true },
      { segment: "greeting_end" as const },
    ]) {
      const v = norm(3, {}, { turn });
      expect(v.next_move, JSON.stringify(turn)).toBe("none");
      expect(v.card_item).toEqual({ kind: "none", no: 0 });
      expect(v.next_hints).toEqual([]);
    }
  });

  it("1~3단계 받침 · 들리지 않음 카드 자리 규칙: 앱이 답 소리와 쉬운 · 다음 질문을 붙이고 선생님은 짧은 반응 · 신호 말만 쓴다(02-2 259~261줄 · C194 (1))", () => {
    const three = talkLessonSystem(lessonInput(3), lessonRules(3));
    const four = talkLessonSystem(lessonInput(4), lessonRules(4));
    const low =
      "Levels 1-3: when Turn is card_slot in support turns or after nospeech, the app plays the answer and adds the easier or next question.";
    expect(three).toContain(low);
    expect(four).not.toContain(low);
    expect(four).toContain("Level 4 and above: at Support stage 1");
  });
});

describe("fix 1 Minor(검토 M-1 · M-2 · M-3)", () => {
  it("AC-15c 꺼낸 새 단어는 tori_en 과 AI 의 원래 따라 할 말로 먼저 거르고, 대체 글은 거른 낱말에서만 고른다(M-1)", () => {
    const v = norm(3, {
      tori_en: "The weekend is fun! Listen and say!",
      model_line: "I adore the glorious weekend.",
      new_words: ["sunday"],
    });
    expect(v.new_words).toEqual([]);
    expect(v.model_line).toBe("");
    const ok = norm(3, {
      tori_en: "The weekend is fun! Listen and say!",
      model_line: "I adore the glorious weekend.",
      new_words: ["weekend", "sunday"],
    });
    expect(ok.new_words).toEqual(["weekend"]);
    expect(ok.model_line).toBe("The weekend.");
  });

  it("tori_en 설명은 AI 차례에만 다음 질문을 요구하고, 1~3단계 질문은 마지막 물음표 문장이며 신호 말은 그 뒤에 와도 된다(M-2)", () => {
    const schema = schemaOf(3) as {
      properties: Record<string, { description?: string }>;
    };
    expect(schema.properties.tori_en?.description).toContain("On AI turns");
    const three = talkLessonSystem(lessonInput(3), lessonRules(3));
    expect(three).toContain("last question sentence of tori_en");
    expect(three).toContain("may come after it");
    expect(three).not.toContain("Put your question at the end of tori_en.");
  });

  it("AC-15c 선택지의 노리는 단어는 next_targets 가 비어도 정규화한 카드 항목의 노리는 단어로 본다(M-3)", () => {
    const v = norm(3, {
      choices: ["I like soccer.", "I like tag."],
      next_targets: [],
      card_item: { kind: "required", no: 2 },
    });
    expect(v.choices).toEqual(["I like soccer.", "I like tag."]);
    expect(
      norm(3, {
        choices: ["I like soccer.", "I like tag."],
        next_targets: [],
        card_item: { kind: "none", no: 0 },
      }).choices,
    ).toEqual([]);
  });
});

// ── fix 2(재검토 N-1 · N-2): 1~3단계 AI 차례 받침 문장을 단계마다 ─────────────

describe("fix 2 받침 단계별 1~3단계 AI 차례 규칙(재검토 N-1 · N-2)", () => {
  it("1~3단계 고정부는 받침 단계마다 AI 차례 문장을 나눈다: 같이 말하기는 답을 model_line 에, 둘째는 답 없이 쉬운 질문 · 고르기 답, 셋째 · 들리지 않음은 답을 model_line 에 — '답을 model_line 에'가 둘째에 걸리지 않는다(02-2 259~261줄)", () => {
    const three = talkLessonSystem(lessonInput(3), lessonRules(3));
    expect(three).toContain(
      "Levels 1-3: when Turn is card_slot in support turns or after nospeech, the app plays the answer and adds the easier or next question.",
    );
    expect(three).toContain(
      "Levels 1-3, Turn ai with 'Question: no' after a stuck turn (saying it together): put the answer to say in model_line, not in tori_en.",
    );
    expect(three).toContain(
      "Levels 1-3, Turn ai at Support stage 2: do not give the answer. Ask an easier yes-or-no question, or put two answer choices in choices.",
    );
    expect(three).toContain(
      "Levels 1-3, Turn ai at Support stage 3 or after nospeech: put the answer in model_line, not in tori_en, then (when Question: yes) ask about the next topic.",
    );
    expect(three).not.toContain(
      "When Turn is ai after a stuck or nospeech turn, put the answer to say in model_line",
    );
    // 4단계부터는 이 문장들이 없다
    const four = talkLessonSystem(lessonInput(4), lessonRules(4));
    expect(four).not.toContain("Levels 1-3, Turn ai at Support stage 2");
    // 인사 끝 닫기(Question: no)와 함께 걸려도 질문을 쓰게 하지 않는다(묶음 6 재검토 N-3)
    expect(four).toContain(
      "at Support stage 3 and after nospeech say the answer once, then (when Question: yes) ask about the next topic.",
    );
    for (const system of [three, four])
      expect(system).not.toMatch(/, then ask about the next topic/);
  });

  it("3단계 AI 이어 묻기에서 두 번 막힌 계획은 AI 차례 · 질문함 · 받침 둘째이고, 그 응답의 선택지 둘(같은 꼴 · next_targets 의 노리는 단어)은 정규화를 지나며 따라 할 말 칸의 답은 남지 않는다", () => {
    const plan = nextTeacherTurnOf(
      flow3([
        ...opening3(),
        said(),
        aiTurn(
          "Cool! Who do you play with?",
          { next: "follow_up" },
          "I play with my friend.",
        ),
        button(),
        teacher("That's okay! Let's say it together.", {
          kind: "card_slot",
          why: "support",
          stage: 1,
          cause: "button",
          app: ["together", "answer_example"],
        }),
        button(),
      ]),
    );
    const call = callOf(plan);
    expect(call).toMatchObject({
      kind: "ai",
      aiAsks: true,
      supportStage: 2,
      cardLine: null,
      reason: "button",
    });
    const lines = talkLessonUserMessage(call).split("\n");
    expect(lines).toEqual(
      expect.arrayContaining([
        "Turn: ai",
        "Question: yes",
        "Card line: -",
        "Support stage: 2",
      ]),
    );
    const v = norm(
      3,
      {
        tori_en: "That's okay! Who do you like? Listen and say!",
        choices: ["I like soccer.", "I like tag."],
        model_line: "I play with my friend.",
        support: "choices",
        next_move: "follow_up",
        card_item: { kind: "none", no: 0 },
        next_targets: ["soccer"],
      },
      { turn: call },
    );
    expect(v.choices).toEqual(["I like soccer.", "I like tag."]);
    expect(v.model_line).toBe("");
    expect(v.next_move).toBe("follow_up");
  });

  it("'Question: no' 규칙의 답 예시 괄호는 4단계부터만이다(1~3단계 카드 자리 'Do not write the answer'와 부딪치지 않음, N-2)", () => {
    const three = talkLessonSystem(lessonInput(3), lessonRules(3));
    expect(three).toContain(
      "When 'Question: no', do not ask any question. Write only a reaction (from level 4, with the answer example to say together; or a short line moving on).",
    );
    expect(three).not.toContain("(with the answer to say together");
  });
});

describe("한국어 설명 막힘 차례는 회화 단계 규격 칸에서 읽는다(C195 · '5-나' 재검토 I-1 고정부 몫)", () => {
  /** 실시드 회화 단계 규격(seed/level-specs.json). */
  const REAL = LevelSpecsFileSchema.parse(
    JSON.parse(
      readFileSync(join(process.cwd(), "seed/level-specs.json"), "utf8"),
    ),
  ).levelSpecs.filter((s): s is TalkLevelSpec => s.area === "talk");
  const realAt = (level: number) => {
    const spec = REAL.find((s) => s.level === level);
    if (!spec) throw new Error(`회화 ${level}단계 규격이 없다`);
    return spec;
  };
  const systemOf = (level: number, spec: TalkLevelSpec) =>
    talkLessonSystem(lessonInput(level, { spec }), lessonRules(level));
  // AI 가 사용자 메시지로 받는 값(Support stage)으로 적는다 — 막힘 수는 받지 않는다('5-다' 검토 M-3)
  // 말 입력 막힘 턴은 Reason 이 '-' 이고 If stuck 줄에 Reason 이 없으므로 AI 자신의 막힘 판단도 조건에 든다('5-다' fix 1 재검토 N-1)
  const sentence = (from: number) =>
    `After a stuck turn (Reason: button or stuck, or you set stuck to true), write a short Korean explanation in explanation when Support stage is ${from} or above (when you set stuck, use the If stuck Support stage).`;

  it("실시드 3 · 4단계는 받침 첫째부터, 5단계는 받침 둘째부터라고 고정부에 쓴다", () => {
    expect(systemOf(3, realAt(3))).toContain(sentence(1));
    expect(systemOf(4, realAt(4))).toContain(sentence(1));
    expect(systemOf(5, realAt(5))).toContain(sentence(2));
    for (const level of [3, 4, 5]) {
      const system = systemOf(level, realAt(level));
      expect(system).not.toContain("at levels 1-4");
      expect(system).not.toContain("stuck on the same question");
      // 아이가 'I don't know' 를 말로 한 턴(막힘 말, 02-2 255줄)도 설명을 받는다
      expect(system).toContain("or you set stuck to true");
    }
  });

  it("문장은 단계 번호가 아니라 칸 값을 따른다(칸을 바꾸면 문장이 바뀐다)", () => {
    expect(systemOf(3, { ...realAt(3), koExplainFromStuck: 2 })).toContain(
      sentence(2),
    );
    expect(systemOf(5, { ...realAt(5), koExplainFromStuck: 1 })).toContain(
      sentence(1),
    );
  });

  it("칸이 없는 행(옛 판 단계 규격)은 단계 규격 스키마가 거부한다(필수 칸 — 묶음 12, 조용한 기본값 없음)", () => {
    const { koExplainFromStuck: _k, ...old } = realAt(4);
    expect(TalkLevelSpecSchema.safeParse(old).success).toBe(false);
    expect(TalkLevelSpecSchema.safeParse(realAt(4)).success).toBe(true);
  });
});

describe("'5-다' fix 1 M-1(비운 따라 할 말의 새 단어)", () => {
  it("AC-15c 1~3단계 받침 둘째에서 비운 따라 할 말에만 든 새 단어는 꺼낸 새 단어가 아니다(아이가 듣지 못함)", () => {
    const plan = nextTeacherTurnOf(
      flow3([
        ...opening3(),
        said(),
        aiTurn(
          "Cool! Who do you play with?",
          { next: "follow_up" },
          "I play with my friend.",
        ),
        button(),
        teacher("That's okay! Let's say it together.", {
          kind: "card_slot",
          why: "support",
          stage: 1,
          cause: "button",
          app: ["together", "answer_example"],
        }),
        button(),
      ]),
    );
    const call = callOf(plan);
    expect(call.supportStage).toBe(2);
    const v = norm(
      3,
      {
        tori_en: "That's okay! Who do you like? Listen and say!",
        choices: ["I like soccer.", "I like tag."],
        model_line: "I play on the weekend.",
        new_words: ["weekend"],
        support: "choices",
        next_move: "follow_up",
        card_item: { kind: "none", no: 0 },
        next_targets: ["soccer"],
      },
      { turn: call },
    );
    expect(v.model_line).toBe("");
    expect(v.new_words).toEqual([]);
    // tori_en 에 들면 그대로 꺼낸 단어다
    const said2 = norm(
      3,
      {
        tori_en:
          "That's okay! The weekend is fun. Who do you like? Listen and say!",
        choices: ["I like soccer.", "I like tag."],
        model_line: "I play on the weekend.",
        new_words: ["weekend"],
        support: "choices",
        next_move: "follow_up",
        card_item: { kind: "none", no: 0 },
        next_targets: ["soccer"],
      },
      { turn: call },
    );
    expect(said2.new_words).toEqual(["weekend"]);
  });
});

describe("'5-다' fix 2 N-2(support 를 남은 줄과 맞춤)", () => {
  const stage2 = () =>
    callOf(
      nextTeacherTurnOf(
        flow3([
          ...opening3(),
          said(),
          aiTurn(
            "Cool! Who do you play with?",
            { next: "follow_up" },
            "I play with my friend.",
          ),
          button(),
          teacher("That's okay! Let's say it together.", {
            kind: "card_slot",
            why: "support",
            stage: 1,
            cause: "button",
            app: ["together", "answer_example"],
          }),
          button(),
        ]),
      ),
    );
  const base: Partial<TalkLessonOutput> = {
    tori_en: "That's okay! Who do you like? Listen and say!",
    model_line: "I play with my friend.",
    next_move: "follow_up",
    card_item: { kind: "none", no: 0 },
    next_targets: ["soccer"],
  };

  it("1~3단계 받침 둘째에서 비운 따라 할 말 · 같이 말하기를 support 로 적어도 none 이다(아이가 듣지 못함)", () => {
    const call = stage2();
    for (const support of ["model_line", "together"] as const) {
      const v = norm(3, { ...base, support }, { turn: call });
      expect(v.model_line).toBe("");
      expect(v.support).toBe("none");
    }
  });

  it("선택지가 검사에 걸려 비면 support choices 도 none 이고, 남은 선택지면 그대로다", () => {
    const call = stage2();
    const dropped = norm(
      3,
      { ...base, support: "choices", choices: ["I like soccer."] },
      { turn: call },
    );
    expect(dropped.choices).toEqual([]);
    expect(dropped.support).toBe("none");
    const kept = norm(
      3,
      {
        ...base,
        support: "choices",
        choices: ["I like soccer.", "I like tag."],
      },
      { turn: call },
    );
    expect(kept.choices).toEqual(["I like soccer.", "I like tag."]);
    expect(kept.support).toBe("choices");
  });

  it("남은 따라 할 말이 있으면 1~3단계 support model_line 은 그대로다", () => {
    const v = norm(3, {
      tori_en: "Weekends are fun! Listen and say!",
      model_line: "I play.",
      support: "model_line",
    });
    expect(v.model_line).toBe("I play.");
    expect(v.support).toBe("model_line");
  });

  it("4단계부터 따라 할 말은 늘 비우므로 support model_line 은 none, 선생님 말 안의 같이 말하기는 그대로다", () => {
    expect(
      norm(4, { model_line: "I like math.", support: "model_line" }).support,
    ).toBe("none");
    expect(norm(4, { support: "together" }).support).toBe("together");
  });
});

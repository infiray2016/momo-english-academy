// 회화 수업 새 흐름의 위치 되짚기와 다음 선생님 차례 계획(3.3 토막 · 대화 토막 차례 표 · 막힘 문단 · 기기 쪽 · 수업 끝,
// 회화 plan 묶음 5 · 정한 것 5 · 11 · 12 · 17 · 18). 숫자는 시험용 설정 · 견본 단계 규격에서 읽는다.
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type LessonArgs,
  lessonTurnSegmentOf,
  NOW_LETS_TALK,
  nextTeacherTurnOf,
  talkLessonPositionOf,
  teacherMoveOf,
  teacherTurnPlansOf,
} from "@/core/conversation/lesson-flow";
import type {
  TalkLessonCard,
  TalkLessonSpec,
  TalkLessonTurn,
} from "@/core/conversation/lesson-turns";
import { questionKeyOf } from "@/core/conversation/question-check";
import { MORE_PROMPT } from "@/core/conversation/spoken";
import type { TalkLevelSpec } from "@/core/seed/schema/reference";
import type { TalkCard } from "@/core/seed/schema/talk";
import {
  aiTurn,
  button,
  CARD3,
  CARD4,
  LOW,
  MID,
  NEW3,
  NEW4,
  noSpeech,
  opening3,
  SPEC3,
  SPEC4,
  said,
  stuckSaid,
  teacher,
  values,
} from "../fixtures/talk-lesson";

const SILENT_MAX = values["speech.silent_items_max"] as number;

function args3(
  turns: TalkLessonTurn[],
  over: Partial<LessonArgs> = {},
): LessonArgs {
  return {
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns,
    segment: "talk",
    settings: LOW,
    prepWords: CARD3.prep ?? [],
    ...over,
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
function args4(
  turns: TalkLessonTurn[],
  over: Partial<LessonArgs> = {},
): LessonArgs {
  return {
    spec: SPEC4,
    card: CARD4,
    newWords: NEW4,
    turns,
    segment: "talk",
    settings: MID,
    prepWords: [],
    ...over,
  };
}

const R1 = "What do you do on the weekend?";

describe("흐름 입력 prepWords 는 필수 칸(N-2)", () => {
  it("인사 뒤 짧은 준비에서 보인 낱말을 빠뜨리면 형 검사가 잡는다", () => {
    const { prepWords: _omit, ...rest } = args3([]);
    // 부르지 않는 함수 — tsc 만 본다
    const check = () =>
      // @ts-expect-error prepWords(인사 뒤 준비에서 보인 낱말)는 필수 칸이다
      nextTeacherTurnOf(rest);
    expect(typeof check).toBe("function");
  });
});

describe("묶음 3 새 꼴 형과의 이음", () => {
  it("새 꼴 카드 · 회화 단계 규격이 흐름 입력 형에 그대로 들어간다", () => {
    expectTypeOf<TalkCard>().toExtend<TalkLessonCard>();
    expectTypeOf<TalkLevelSpec>().toExtend<TalkLessonSpec>();
  });
});

describe("토막 · 대화 첫 질문", () => {
  it("수업을 열면 앱이 첫 인사 질문을 보인다(AI 호출 없음)", () => {
    const plan = nextTeacherTurnOf(args3([], { segment: "greeting" }));
    expect(plan.kind).toBe("first_question");
    expect(plan.callsAi).toBe(false);
    expect(plan.attach).toEqual([
      {
        kind: "question",
        role: "greeting",
        en: "How are you today?",
        ko: "오늘 기분 어때?",
        item: { kind: "none", no: 0 },
      },
    ]);
  });

  it("1~3단계 인사 둘째 질문(말로 답한 뒤)은 AI 차례이고, 걸리면 붙일 카드 인사 질문을 greetingFallback 에 둔다('AI 몫 넓힘' spec 설계 2 [M-2])", () => {
    const turns = [
      teacher("Hi! How are you today?", { kind: "first_question" }),
      said({ segment: "greeting" }),
    ];
    const plan = nextTeacherTurnOf(args3(turns, { segment: "greeting" }));
    expect(plan).toMatchObject({
      kind: "ai",
      segment: "greeting",
      callsAi: true,
      aiAsks: true,
      attach: [],
    });
    expect(plan.greetingFallback).toEqual({
      kind: "question",
      role: "greeting",
      en: "Do you like Sunday?",
      ko: "일요일 좋아해?",
      item: { kind: "none", no: 0 },
    });
  });

  it("마지막 인사 질문에 말로 답하면 '인사 끝'이고, 그 응답에는 질문 · 붙일 줄이 없다", () => {
    const turns = [
      teacher("Hi! How are you today?", { kind: "first_question" }),
      said({ segment: "greeting" }),
      teacher("Great! Do you like Sunday?", { kind: "card_slot" }),
    ];
    const pos = talkLessonPositionOf(args3(turns, { segment: "greeting" }));
    expect(pos.lastGreetingQuestion).toBe(true);
    expect(lessonTurnSegmentOf(pos, "speech", LOW)).toBe("greeting_end");
    expect(lessonTurnSegmentOf(pos, "button", LOW)).toBe("greeting");
    expect(lessonTurnSegmentOf(pos, "nospeech", LOW)).toBe("greeting_end");
    const plan = nextTeacherTurnOf(
      args3([...turns, said({ segment: "greeting_end" })], {
        segment: "greeting",
      }),
    );
    expect(plan).toMatchObject({
      kind: "ai",
      segment: "greeting_end",
      callsAi: true,
      aiAsks: false,
      attach: [],
    });
  });

  it("AC-15n 인사 끝 반응 뒤 대화 첫 질문은 카드의 첫 필수 질문을 앱이 보이고 읽는다(AI 호출 0회)", () => {
    const turns = opening3().slice(0, -1);
    const pos = talkLessonPositionOf(args3(turns));
    expect(pos.firstQuestionDue).toBe(true);
    const plan = nextTeacherTurnOf(args3(turns));
    expect(plan).toMatchObject({
      kind: "first_question",
      callsAi: false,
      item: { kind: "required", no: 1 },
      words: ["play"],
    });
    expect(plan.attach).toEqual([
      {
        kind: "question",
        role: "card",
        en: R1,
        ko: "뜻 1",
        item: { kind: "required", no: 1 },
      },
    ]);
  });

  it("AC-15t 대화 첫 질문 뒤 위치: 인사 턴은 말 주고받기에 들고 지금 질문 자리는 필수 1", () => {
    const pos = talkLessonPositionOf(args3(opening3()));
    expect(pos.phase).toBe("talk");
    expect(pos.talkCount).toBe(2);
    expect(pos.slot).toMatchObject({
      question: R1,
      item: { kind: "required", no: 1 },
      words: ["play"],
    });
    expect(pos.firstQuestionDue).toBe(false);
  });
});

describe("AI 차례와 카드 자리", () => {
  it("AC-15r 말로 답한 뒤 보통 차례는 AI 가 반응과 질문을 쓴다", () => {
    const plan = nextTeacherTurnOf(args3([...opening3(), said()]));
    expect(plan).toMatchObject({
      kind: "ai",
      segment: "talk",
      callsAi: true,
      aiAsks: true,
      why: null,
      attach: [],
    });
  });

  it("AC-15i 따라가기 갈래가 상한만큼 이어진 다음 턴은 1~3단계에서 AI 차례 + returnNow 이고, 그 차례도 따라가기면 그다음 턴이 카드 자리가 되어 가장 앞의 남은 기회를 붙인다('AI 몫 넓힘' AC-3 (가))", () => {
    const turns: TalkLessonTurn[] = [...opening3()];
    for (let i = 0; i < LOW.followChildTurns; i++) {
      turns.push(said());
      expect(nextTeacherTurnOf(args3(turns)).kind).toBe("ai");
      turns.push(
        aiTurn(`Dinosaurs ${i}! Do you like a big one?`, {
          next: "follow_child",
        }),
      );
    }
    turns.push(said());
    expect(nextTeacherTurnOf(args3(turns))).toMatchObject({
      kind: "ai",
      returnNow: true,
    });
    turns.push(
      aiTurn("Wow! Can you draw a big one?", { next: "follow_child" }),
      said(),
    );
    const plan = nextTeacherTurnOf(args3(turns));
    expect(plan).toMatchObject({
      kind: "card_slot",
      why: "follow_cap",
      aiAsks: false,
      item: { kind: "required", no: 2 },
      words: ["soccer"],
    });
    expect(plan.attach).toEqual([
      {
        kind: "question",
        role: "card",
        en: "What sport is fun?",
        ko: "뜻 2",
        item: { kind: "required", no: 2 },
      },
    ]);
    expect(plan.followRun).toBe(LOW.followChildTurns + 1);
  });

  it("AC-15i 4단계부터는 따라가기 갈래가 상한만큼 이어진 다음 턴이 그대로 카드 자리다(returnNow 없음, 'AI 몫 넓힘' 정한 것 1)", () => {
    const turns: TalkLessonTurn[] = [...opening4()];
    for (let i = 0; i < MID.followChildTurns; i++)
      turns.push(
        said(),
        aiTurn(`Dinosaurs ${i}! Do you like a big one?`, {
          next: "follow_child",
        }),
      );
    turns.push(said());
    const plan = nextTeacherTurnOf(args4(turns));
    expect(plan).toMatchObject({ kind: "card_slot", why: "follow_cap" });
    expect(plan.returnNow).toBeUndefined();
  });

  it("AC-15i 따라가기 상한인데 붙일 기회가 없으면 AI 차례로 둔다", () => {
    const card = { ...CARD3, required: CARD3.required.slice(0, 1), more: [] };
    const turns: TalkLessonTurn[] = [...opening3()];
    for (let i = 0; i < LOW.followChildTurns; i++)
      turns.push(said(), aiTurn(`Dinosaurs ${i}?`, { next: "follow_child" }));
    turns.push(said());
    const plan = nextTeacherTurnOf(args3(turns, { card, newWords: ["play"] }));
    expect(plan.kind).toBe("ai");
  });

  it("AC-15r 기회를 다루지 않은 AI 차례가 이어지고 남은 기회가 남은 턴보다 많아도 카드 자리는 생기지 않는다", () => {
    const turns: TalkLessonTurn[] = [...opening3()];
    for (let i = 0; i < SPEC3.targetTurns - 4; i++)
      turns.push(said(), aiTurn(`Cool ${i}! Really?`, { next: "follow_up" }));
    turns.push(said());
    const plan = nextTeacherTurnOf(args3(turns));
    expect(plan.kind).toBe("ai");
    expect(plan.chances.returnNudge).toBe(true);
    expect(plan.chances.required.length).toBeGreaterThan(plan.turnsLeft);
  });
});

describe("받침 셋(같은 질문 자리, AC-15g 단위)", () => {
  const stage1 = teacher("That's okay! Let's say it together.", {
    kind: "card_slot",
    why: "support",
    stage: 1,
    cause: "button",
    item: { kind: "required", no: 1 },
    words: ["play"],
    app: ["together", "answer_example"],
  });
  const stage2 = teacher("Good try! Easy first 1?", {
    kind: "card_slot",
    why: "support",
    stage: 2,
    cause: "button",
    item: { kind: "required", no: 1 },
    words: ["play"],
    app: ["easy_question"],
  });

  it("AC-15g 3단계 첫째 막힘은 같이 말하기: 카드 답 예시를 소리로(글 없음), 같은 질문은 막힌다", () => {
    const plan = nextTeacherTurnOf(args3([...opening3(), button()]));
    expect(plan).toMatchObject({
      kind: "card_slot",
      why: "support",
      stage: 1,
      cause: "button",
      streak: 1,
      aiAsks: false,
    });
    expect(plan.attach).toEqual([
      { kind: "sound", role: "answer", en: "Answer first 1." },
    ]);
    expect(plan.app).toEqual(["together", "answer_example"]);
    expect(plan.blocked).toEqual([questionKeyOf(R1)]);
    expect(plan.stuckQuestion).toBe(R1);
  });

  it("AC-15g 'I don't know' 라고 말한 턴(막힘 참)도 막힌 차례로 같이 말하기를 받고 말 주고받기가 오르지 않는다", () => {
    const turns = [...opening3(), stuckSaid()];
    expect(nextTeacherTurnOf(args3(turns))).toMatchObject({
      stage: 1,
      cause: "stuck",
    });
    expect(talkLessonPositionOf(args3(turns)).talkCount).toBe(2);
  });

  it("AC-15g 둘째 막힘은 카드 쉬운 질문이고 막힌 질문 글은 다시 나오지 않는다", () => {
    const plan = nextTeacherTurnOf(
      args3([...opening3(), button(), stage1, button()]),
    );
    expect(plan).toMatchObject({ kind: "card_slot", stage: 2, streak: 2 });
    expect(plan.attach).toEqual([
      {
        kind: "question",
        role: "easy",
        en: "Easy first 1?",
        ko: "쉬운 1",
        item: { kind: "required", no: 1 },
      },
    ]);
    expect(plan.attach.some((l) => l.kind === "question" && l.en === R1)).toBe(
      false,
    );
    expect(plan.app).toEqual(["easy_question"]);
  });

  it("AC-15g 셋째 막힘은 답을 들려주고 그 자리를 닫으며 다음 카드 자리(남은 필수 질문)로 간다", () => {
    const turns = [...opening3(), button(), stage1, button(), stage2, button()];
    const plan = nextTeacherTurnOf(args3(turns));
    expect(plan).toMatchObject({
      kind: "card_slot",
      why: "support",
      stage: 3,
      streak: 3,
      item: { kind: "required", no: 2 },
    });
    expect(plan.attach).toEqual([
      { kind: "sound", role: "answer", en: "Answer first 1." },
      {
        kind: "question",
        role: "card",
        en: "What sport is fun?",
        ko: "뜻 2",
        item: { kind: "required", no: 2 },
      },
    ]);
    expect(plan.blocked.sort()).toEqual(
      [questionKeyOf(R1), questionKeyOf("Easy first 1?")].sort(),
    );
    const pos = talkLessonPositionOf(args3(turns));
    expect(pos.talkCount).toBe(2);
    // 첫 프리뷰는 이어진 막힘을 세기만 하고 바닥선으로 가지 않는다(정한 것 17)
    expect(pos.streak).toBe(LOW.floorAfterStuck);
    expect(pos.floorDue).toBe(true);
  });

  it("AC-15g 말로 답하면 이어진 막힘 셈이 0 으로 돌아간다", () => {
    const pos = talkLessonPositionOf(
      args3([...opening3(), button(), stage1, said()]),
    );
    expect(pos.streak).toBe(0);
    expect(pos.talkCount).toBe(3);
  });

  it("AC-15g 1~3단계 AI 질문 자리의 같이 말하기는 그 차례 답 예시를, 답 예시가 없으면 AI 차례로 둔다", () => {
    const withAnswer = [
      ...opening3(),
      said(),
      aiTurn("Cool! Do you like it?", { next: "follow_up" }, "Yes, I do."),
      button(),
    ];
    expect(nextTeacherTurnOf(args3(withAnswer)).attach).toEqual([
      { kind: "sound", role: "answer", en: "Yes, I do." },
    ]);
    const noAnswer: TalkLessonTurn[] = [
      ...opening3(),
      said(),
      {
        speaker: "teacher",
        text: "Cool! Do you like it?",
        move: aiTurn("x").move,
      },
      button(),
    ];
    expect(nextTeacherTurnOf(args3(noAnswer))).toMatchObject({
      kind: "ai",
      stage: 1,
      aiAsks: false,
    });
  });

  it("AC-15g 4단계부터 받침은 AI 가 쓰고, 둘째는 같은 질문이면 붙일 카드 쉬운 질문을 함께 준다", () => {
    const s1 = nextTeacherTurnOf(
      args4([...opening4(), button()], {
        settings: { ...MID, prepOfferStuck: 9 },
      }),
    );
    expect(s1).toMatchObject({
      kind: "ai",
      stage: 1,
      aiAsks: false,
      attach: [],
    });
    const turns = [
      ...opening4(),
      button(),
      aiTurn("That's okay! Say it with me: I like math.", {
        stage: 1,
        cause: "button",
        item: { kind: "required", no: 1 },
      }),
      button(),
    ];
    const s2 = nextTeacherTurnOf(
      args4(turns, { settings: { ...MID, prepOfferStuck: 9 } }),
    );
    expect(s2).toMatchObject({ kind: "ai", stage: 2, aiAsks: true });
    expect(s2.easyFallback).toEqual({ en: "Easy first 1?", ko: "쉬운 1" });
  });
});

describe("짧은 준비 (나)(4단계부터, 정한 것 17)", () => {
  const s1 = aiTurn("That's okay! Say it with me: I like math.", {
    stage: 1,
    cause: "button",
    item: { kind: "required", no: 1 },
    words: ["math"],
  });

  it("AC-15n 막힌 차례가 talk.prep_offer_stuck 번 이어지면 받침 둘째 대신 답을 들려주고 짧은 준비를 연다", () => {
    const turns = [...opening4(), button(), s1, button()];
    expect(MID.prepOfferStuck).toBe(2);
    const plan = nextTeacherTurnOf(args4(turns));
    expect(plan).toMatchObject({
      kind: "card_slot",
      why: "support",
      stage: 3,
      aiAsks: false,
    });
    expect(plan.attach).toEqual([
      { kind: "answer_example", en: "Answer first 1." },
    ]);
    expect(plan.openPrep).toEqual(["math", "difficult"]);
    expect(plan.app).toEqual(["answer_example", "prep"]);
  });

  it("AC-15n 준비가 끝나면 'Now let's talk.' 뒤 다음 필수 질문이고(AI 호출 0회) 이어진 막힘 셈은 0, 다시 열지 않는다", () => {
    const turns: TalkLessonTurn[] = [
      ...opening4(),
      button(),
      s1,
      button(),
      teacher("Okay! The answer is: I like math.", {
        kind: "card_slot",
        why: "support",
        stage: 3,
        app: ["answer_example", "prep"],
        prep: { words: ["math", "difficult"] },
      }),
    ];
    const plan = nextTeacherTurnOf(args4(turns));
    expect(plan.kind).toBe("first_question");
    expect(plan.callsAi).toBe(false);
    expect(plan.streak).toBe(0);
    expect(teacherMoveOf(plan).streak).toBe(0);
    expect(plan.attach).toEqual([
      { kind: "app_line", en: NOW_LETS_TALK },
      {
        kind: "question",
        role: "card",
        en: "Which class is hard?",
        ko: "뜻 2",
        item: { kind: "required", no: 2 },
      },
    ]);
    const resumed = [
      ...turns,
      teacher(`${NOW_LETS_TALK} Which class is hard?`, {
        kind: "first_question",
        item: { kind: "required", no: 2 },
      }),
    ];
    const pos = talkLessonPositionOf(args4(resumed));
    expect(pos.streak).toBe(0);
    expect(pos.prepOpened).toBe(true);
    const again = nextTeacherTurnOf(
      args4([...resumed, button(), s1, button()]),
    );
    expect(again.openPrep).toBeNull();
  });

  it("AC-15n 1~3단계(talk.prep_mode always) · 이미 준비한 수업은 열지 않는다", () => {
    expect(
      nextTeacherTurnOf(
        args4([...opening4(), button(), s1, button()], {
          prepWords: ["math"],
        }),
      ).openPrep,
    ).toBeNull();
    expect(LOW.prepMode).toBe("always");
    const stage1 = teacher("That's okay! Let's say it together.", {
      kind: "card_slot",
      why: "support",
      stage: 1,
      item: { kind: "required", no: 1 },
    });
    const low = nextTeacherTurnOf(
      args3([...opening3(), button(), stage1, button()]),
    );
    expect(low.openPrep).toBeNull();
    expect(low.stage).toBe(2);
  });
});

describe("짧은 준비 (나) — 1~3단계 when_needed(첫 프리뷰가 견줄 값)", () => {
  const low = { ...LOW, prepMode: "when_needed" as const };
  const stage1 = teacher("That's okay! Let's say it together.", {
    kind: "card_slot",
    why: "support",
    stage: 1,
    cause: "button",
    item: { kind: "required", no: 1 },
    words: ["play"],
  });

  it("정한 것 17 인사 뒤 준비를 하지 않았으면 막힌 질문이 노린 카드 준비 낱말을 앞세워 열고, 답은 소리로만 붙는다(T2)", () => {
    const plan = nextTeacherTurnOf(
      args3([...opening3(), button(), stage1, button()], {
        settings: low,
        prepWords: [],
      }),
    );
    expect(plan.openPrep).toEqual(["play", "soccer", "sunday"]);
    expect(plan.attach).toEqual([
      { kind: "sound", role: "answer", en: "Answer first 1." },
    ]);
    expect(plan.attach.some((l) => l.kind === "answer_example")).toBe(false);
    expect(plan.app).toEqual(["answer_example", "prep"]);
    const move = teacherMoveOf(plan);
    expect(move.sound).toEqual({ answer: "Answer first 1." });
    expect(move.prep).toEqual({ words: ["play", "soccer", "sunday"] });
  });

  it("정한 것 17 인사 뒤 준비를 했으면 대화 중에 다시 열지 않는다", () => {
    const plan = nextTeacherTurnOf(
      args3([...opening3(), button(), stage1, button()], { settings: low }),
    );
    expect(plan.openPrep).toBeNull();
    expect(plan.stage).toBe(2);
  });

  it("대화 중 연 준비 낱말은 '꺼낼 새 단어'에서 빠진다", () => {
    const opened = teacher("Okay! Listen.", {
      kind: "card_slot",
      why: "support",
      stage: 3,
      app: ["answer_example", "prep"],
      prep: { words: ["weekend"] },
    });
    const plan = nextTeacherTurnOf(
      args3([...opening3(), button(), stage1, button(), opened], {
        settings: low,
        prepWords: [],
      }),
    );
    expect(plan.chances.introduce).not.toContain("weekend");
    expect(plan.chances.notIntroduced).not.toContain("weekend");
  });
});

describe("같은 질문 셈은 그 차례의 질문만(I-4)", () => {
  it("AC-15r 반응 부분의 물음('Really?')은 셈에 들지 않고 그 차례 마지막 질문만 센다", () => {
    const turns = [
      ...opening3(),
      said(),
      aiTurn("Really? Wow! What sport is fun?", { next: "required" }),
    ];
    const pos = talkLessonPositionOf(args3(turns));
    expect(pos.askedQuestions.has(questionKeyOf("Really?"))).toBe(false);
    expect(pos.askedQuestions.get(questionKeyOf("What sport is fun?"))).toBe(1);
    const plan = nextTeacherTurnOf(args3([...turns, button()]));
    expect(plan.blocked).toEqual([questionKeyOf("What sport is fun?")]);
    expect(plan.stuckQuestion).toBe("What sport is fun?");
  });

  it("AC-15r 카드 자리 · 마무리 자리 행은 붙인 줄이 질문일 때만 센다(반응의 물음은 뺌)", () => {
    const stage1 = teacher("Really? That's okay! Let's say it together.", {
      kind: "card_slot",
      why: "support",
      stage: 1,
      item: { kind: "required", no: 1 },
    });
    const turns = [...opening3(), button(), stage1];
    const pos = talkLessonPositionOf(args3(turns));
    expect(pos.askedQuestions.has(questionKeyOf("Really?"))).toBe(false);
    expect(pos.slot?.questions).toEqual([R1]);
    const closing = talkLessonPositionOf(
      args3([
        ...opening3(),
        said(),
        teacher(`Really? ${MORE_PROMPT.en}`, { kind: "closing_slot" }),
      ]),
    );
    expect(closing.askedQuestions.has(questionKeyOf("Really?"))).toBe(false);
  });
});

describe("인사 토막의 받침 · 닫기(M-1 · M-6)", () => {
  const g0 = teacher("Hi! How are you today?", { kind: "first_question" });
  const g1 = teacher("Great! Do you like Sunday?", { kind: "card_slot" });

  it("1~3단계 인사 질문의 첫째 막힘은 인사 답 예시 소리, 둘째는 AI 가 쉬운 질문을 쓴다", () => {
    const s1 = nextTeacherTurnOf(
      args3([g0, button({ segment: "greeting" })], { segment: "greeting" }),
    );
    expect(s1).toMatchObject({ kind: "card_slot", stage: 1, cause: "button" });
    expect(s1.attach).toEqual([
      { kind: "sound", role: "answer", en: "I'm good." },
    ]);
    const s2 = nextTeacherTurnOf(
      args3(
        [
          g0,
          button({ segment: "greeting" }),
          teacher("That's okay!", {
            kind: "card_slot",
            why: "support",
            stage: 1,
          }),
          button({ segment: "greeting" }),
        ],
        { segment: "greeting" },
      ),
    );
    expect(s2).toMatchObject({ kind: "ai", stage: 2, aiAsks: true });
  });

  it("인사 질문의 들리지 않음은 답 소리 뒤 다음 인사 질문이다", () => {
    const plan = nextTeacherTurnOf(
      args3([g0, noSpeech({ segment: "greeting" })], { segment: "greeting" }),
    );
    expect(plan).toMatchObject({
      kind: "card_slot",
      why: "support",
      cause: "nospeech",
    });
    expect(plan.attach).toEqual([
      { kind: "sound", role: "answer", en: "I'm good." },
      {
        kind: "question",
        role: "greeting",
        en: "Do you like Sunday?",
        ko: "일요일 좋아해?",
        item: { kind: "none", no: 0 },
      },
    ]);
  });

  it("마지막 인사 질문을 들리지 않음 · 셋째 막힘으로 닫는 '인사 끝'도 답을 한 번 소리로 들려준다", () => {
    const silent = nextTeacherTurnOf(
      args3(
        [
          g0,
          said({ segment: "greeting" }),
          g1,
          noSpeech({ segment: "greeting_end" }),
        ],
        {
          segment: "greeting",
        },
      ),
    );
    expect(silent).toMatchObject({
      segment: "greeting_end",
      cause: "nospeech",
      stage: 0,
      answerFallback: "Yes, I do.",
    });
    expect(silent.attach).toEqual([
      { kind: "sound", role: "answer", en: "Yes, I do." },
    ]);
    const stuck = nextTeacherTurnOf(
      args3(
        [
          g0,
          said({ segment: "greeting" }),
          g1,
          button({ segment: "greeting" }),
          teacher("That's okay!", {
            kind: "card_slot",
            why: "support",
            stage: 1,
          }),
          button({ segment: "greeting" }),
          aiTurn("Do you like it?", { stage: 2 }),
          button({ segment: "greeting_end" }),
        ],
        { segment: "greeting" },
      ),
    );
    expect(stuck).toMatchObject({
      segment: "greeting_end",
      stage: 3,
      cause: "button",
    });
    expect(stuck.attach).toEqual([
      { kind: "sound", role: "answer", en: "Yes, I do." },
    ]);
  });
});

describe("마지막 인사 질문에 막힘 말로 답한 턴(N-1)", () => {
  it("말 입력은 막힘 판단 전에 '인사 끝'으로 보내므로, 막힘 말이면 첫 막힘이어도 답을 한 번 소리로 들려주고 닫는다(stage 3)", () => {
    const turns = [
      teacher("Hi! How are you today?", { kind: "first_question" }),
      said({ segment: "greeting" }),
      teacher("Great! Do you like Sunday?", { kind: "card_slot" }),
    ];
    const pos = talkLessonPositionOf(args3(turns, { segment: "greeting" }));
    expect(lessonTurnSegmentOf(pos, "speech", LOW)).toBe("greeting_end");
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(
      args3(turns, { segment: "greeting" }),
      { segment: "greeting_end", targets: [] },
    );
    expect(ifAnswered).toMatchObject({
      kind: "ai",
      segment: "greeting_end",
      stage: 0,
      attach: [],
    });
    expect(ifStuck).toMatchObject({
      kind: "card_slot",
      segment: "greeting_end",
      stage: 3,
      cause: "stuck",
    });
    expect(ifStuck.attach).toEqual([
      { kind: "sound", role: "answer", en: "Yes, I do." },
    ]);
  });
});

describe("저장된 행으로 되짚는 인사 끝(talk_segment 에 greeting_end 가 없음, fix 1 I-A)", () => {
  const g0 = teacher("Hi! How are you today?", { kind: "first_question" });
  const g1 = teacher("Great! Do you like Sunday?", { kind: "card_slot" });
  const head = [g0, said({ segment: "greeting" }), g1];

  it("마지막 인사 질문에 막힘 말로 답한 행이 토막 greeting 으로 저장돼도 계획은 인사 끝(닫기)이다", () => {
    const stored = nextTeacherTurnOf(
      args3([...head, stuckSaid({ segment: "greeting" })], {
        segment: "greeting",
      }),
    );
    const planned = nextTeacherTurnOf(
      args3([...head, stuckSaid({ segment: "greeting_end" })], {
        segment: "greeting",
      }),
    );
    expect(stored).toEqual(planned);
    expect(stored).toMatchObject({
      kind: "card_slot",
      segment: "greeting_end",
      stage: 3,
      cause: "stuck",
    });
  });

  it("막힘 말 행 · 인사 끝 반응을 되짚으면 대화 토막으로 넘어가고 greetingIndex · firstQuestionDue 가 계획 때와 같다", () => {
    const end = teacher("That's okay! Let's talk.", {
      kind: "card_slot",
      why: "support",
      stage: 3,
    });
    const stored = talkLessonPositionOf(
      args3([...head, stuckSaid({ segment: "greeting" }), end]),
    );
    const planned = talkLessonPositionOf(
      args3([...head, stuckSaid({ segment: "greeting_end" }), end]),
    );
    expect(stored).toMatchObject({
      phase: "talk",
      greetingIndex: CARD3.greetingTurns,
      greetingDone: true,
      lastGreetingQuestion: false,
      slot: null,
      firstQuestionDue: true,
    });
    expect({
      phase: stored.phase,
      greetingIndex: stored.greetingIndex,
      firstQuestionDue: stored.firstQuestionDue,
      slot: stored.slot,
      streak: stored.streak,
    }).toEqual({
      phase: planned.phase,
      greetingIndex: planned.greetingIndex,
      firstQuestionDue: planned.firstQuestionDue,
      slot: planned.slot,
      streak: planned.streak,
    });
    expect(
      nextTeacherTurnOf(
        args3([...head, stuckSaid({ segment: "greeting" }), end]),
      ).kind,
    ).toBe("first_question");
  });

  it("말로 답함 · 들리지 않음으로 끝난 인사도 저장된 꼴에서 인사 끝 반응의 물음이 질문 자리를 열지 않는다", () => {
    const end = aiTurn("Me too! Are you ready?");
    for (const last of [
      said({ segment: "greeting" }),
      noSpeech({ segment: "greeting" }),
    ]) {
      const pos = talkLessonPositionOf(args3([...head, last, end]));
      expect(pos).toMatchObject({
        phase: "talk",
        greetingIndex: CARD3.greetingTurns,
        slot: null,
        firstQuestionDue: true,
      });
    }
  });

  it("마지막이 아닌 인사 질문의 막힘 말은 인사 토막에 남는다(같은 자리 받침)", () => {
    const pos = talkLessonPositionOf(
      args3([g0, stuckSaid({ segment: "greeting" })], { segment: "greeting" }),
    );
    expect(pos).toMatchObject({
      phase: "greeting",
      greetingIndex: 0,
      stuckInSlot: 1,
    });
    expect(pos.slot).not.toBeNull();
  });
});

describe("들리지 않음(기기 쪽, AC-15s · AC-15g 단위)", () => {
  it("AC-15s 들리지 않음은 그 자리를 닫고 답을 한 번 들려준 뒤 다음 이야기로 가며 까닭이 들리지 않음이다", () => {
    const plan = nextTeacherTurnOf(args3([...opening3(), noSpeech()]));
    expect(plan).toMatchObject({
      kind: "card_slot",
      why: "support",
      cause: "nospeech",
      stage: 0,
      streak: 0,
    });
    expect(plan.attach).toEqual([
      { kind: "sound", role: "answer", en: "Answer first 1." },
      {
        kind: "question",
        role: "card",
        en: "What sport is fun?",
        ko: "뜻 2",
        item: { kind: "required", no: 2 },
      },
    ]);
    expect(plan.blocked).toEqual([questionKeyOf(R1)]);
  });

  it("AC-15s 다음 아이 차례에 '잘 모르겠어요' 단추를 한 번 반짝이고, 말 주고받기에 들지 않는다", () => {
    const pos = talkLessonPositionOf(args3([...opening3(), noSpeech()]));
    expect(pos.flashDontKnow).toBe(true);
    expect(pos.talkCount).toBe(2);
    const next = talkLessonPositionOf(
      args3([
        ...opening3(),
        noSpeech(),
        aiTurn("I couldn't hear you. What sport is fun?"),
      ]),
    );
    expect(next.flashDontKnow).toBe(true);
    const after = talkLessonPositionOf(
      args3([
        ...opening3(),
        noSpeech(),
        aiTurn("I couldn't hear you. What sport is fun?"),
        said(),
      ]),
    );
    expect(after.flashDontKnow).toBe(false);
  });

  it("AC-15g 들리지 않음 차례는 이어진 막힘 셈을 늘리지도 끊지도 않는다", () => {
    const stage1 = teacher("That's okay! Let's say it together.", {
      kind: "card_slot",
      why: "support",
      stage: 1,
      item: { kind: "required", no: 1 },
    });
    const turns = [...opening3(), button(), stage1, noSpeech()];
    expect(talkLessonPositionOf(args3(turns)).streak).toBe(1);
    expect(nextTeacherTurnOf(args3(turns)).streak).toBe(1);
  });

  it("AC-15g 들리지 않음으로 닫힌 자리가 speech.silent_items_max 개 이어지면 막힘 화면 자리다(바닥선 아님)", () => {
    const turns: TalkLessonTurn[] = [...opening3()];
    for (let i = 0; i < SILENT_MAX; i++) {
      expect(talkLessonPositionOf(args3(turns)).silentBlocked).toBe(false);
      turns.push(noSpeech(), aiTurn(`I couldn't hear you. Question ${i}?`));
    }
    const pos = talkLessonPositionOf(args3(turns));
    expect(pos.silentBlocked).toBe(true);
    expect(pos.streak).toBe(0);
    expect(pos.floorDue).toBe(false);
  });

  it("AC-15g 들리지 않음 이어짐은 그 사이 아이가 단추 · 말로 응한 차례가 있으면 끊긴다", () => {
    const turns: TalkLessonTurn[] = [
      ...opening3(),
      noSpeech(),
      aiTurn("I couldn't hear you. Question 0?"),
      noSpeech(),
      aiTurn("I couldn't hear you. Question 1?"),
      button(),
      aiTurn("That's okay! Say it with me.", { stage: 1 }),
      noSpeech(),
    ];
    expect(talkLessonPositionOf(args3(turns)).silentRun).toBe(1);
  });

  it("AC-15s 4단계부터 들리지 않음은 AI 차례로(못 들었다 · 답 · 다음 질문)", () => {
    expect(nextTeacherTurnOf(args4([...opening4(), noSpeech()]))).toMatchObject(
      {
        kind: "ai",
        cause: "nospeech",
        aiAsks: true,
        stage: 0,
      },
    );
  });
});

describe("마무리 물음 · 마무리 제안(AC-15t 단위)", () => {
  function toTarget(): TalkLessonTurn[] {
    const turns: TalkLessonTurn[] = [...opening3()];
    // 인사 턴 둘이 이미 말 주고받기에 들었다
    for (let i = 2; i < SPEC3.targetTurns - 1; i++)
      turns.push(said(), aiTurn(`Cool ${i}! Really?`, { next: "follow_up" }));
    return turns;
  }

  it("AC-15t (라) 말 주고받기가 참고 턴에 닿은 턴은 남은 기회와 관계없이 마무리 자리이고 AI 는 질문을 쓰지 않는다", () => {
    const before = toTarget();
    expect(talkLessonPositionOf(args3(before)).talkCount).toBe(
      SPEC3.targetTurns - 1,
    );
    const plan = nextTeacherTurnOf(args3([...before, said()]));
    expect(plan).toMatchObject({
      kind: "closing_slot",
      callsAi: true,
      aiAsks: false,
    });
    expect(plan.attach).toEqual([
      { kind: "closing", en: MORE_PROMPT.en, ko: MORE_PROMPT.ko },
    ]);
    expect(plan.chances.required.length).toBeGreaterThan(0);
  });

  it("AC-15t (마) 막힌 차례 · 들리지 않음 · 한국어 질문 턴은 말 주고받기에 들지 않아 마무리 물음을 앞당기지 않는다", () => {
    const before = toTarget();
    for (const row of [button(), noSpeech(), said({ koQuestion: true })]) {
      const plan = nextTeacherTurnOf(args3([...before, row]));
      expect(plan.kind).not.toBe("closing_slot");
    }
  });

  it("AC-15t (다) 카드 기회를 참고 턴 전에 다 다뤄도 앱은 마무리 물음을 붙이지 않고 '다 다룸'만 알린다", () => {
    const card = { ...CARD3, required: CARD3.required.slice(0, 1), more: [] };
    const turns = [
      ...opening3(),
      said(),
      aiTurn("Fun! Do you play a lot?", { next: "follow_up", words: ["play"] }),
      said(),
    ];
    const plan = nextTeacherTurnOf(args3(turns, { card, newWords: ["play"] }));
    expect(plan.chances.allDealt).toBe(true);
    expect(plan.kind).toBe("ai");
  });

  it("AC-15t 마무리 물음 뒤에는 고르기 차례이고, '더 이야기하기'(앱이 붙인 선생님 행)로 참여 완료가 된다", () => {
    const closing = teacher(`Great! ${MORE_PROMPT.en}`, {
      kind: "closing_slot",
    });
    const asked = [...toTarget(), said(), closing];
    const pos = talkLessonPositionOf(args3(asked));
    expect(pos.choice).toBe("closing");
    expect(pos.closingAnswered).toBe(false);
    const chosen = talkLessonPositionOf(
      args3(
        [
          ...asked,
          teacher("What do you do after school?", {
            kind: "card_slot",
            item: { kind: "more", no: 1 },
          }),
        ],
        {
          segment: "more_talk",
        },
      ),
    );
    expect(chosen.choice).toBeNull();
    expect(chosen.closingAnswered).toBe(true);
  });

  it("AC-15t '더 이야기하기' 한 번(talk.more_talk_round_turns)이 끝난 턴에 다시 마무리 물음이다", () => {
    const turns: TalkLessonTurn[] = [
      ...toTarget(),
      said(),
      teacher(`Great! ${MORE_PROMPT.en}`, { kind: "closing_slot" }),
      teacher("What do you do after school?", {
        kind: "card_slot",
        item: { kind: "more", no: 1 },
      }),
    ];
    for (let i = 0; i < LOW.moreRoundTurns - 1; i++)
      turns.push(
        said({ segment: "more_talk" }),
        aiTurn(`More ${i}?`, { next: "follow_up" }),
      );
    const pos = talkLessonPositionOf(args3(turns, { segment: "more_talk" }));
    expect(pos.moreInRound).toBe(LOW.moreRoundTurns - 1);
    expect(pos.turnsLeft).toBe(1);
    expect(
      nextTeacherTurnOf(
        args3([...turns, said({ segment: "more_talk" })], {
          segment: "more_talk",
        }),
      ).kind,
    ).toBe("closing_slot");
  });

  it("AC-15t (마) 참고 턴에 닿은 차례가 마무리 자리로 저장되지 않았으면(실패 길) 다음 말 턴에 마무리 물음을 늦추지 않는다", () => {
    const turns = [
      ...toTarget(),
      said(),
      aiTurn("Oops! Let's go on.", { next: "none" }),
      said(),
    ];
    expect(nextTeacherTurnOf(args3(turns)).kind).toBe("closing_slot");
  });

  it("끝 행이 한국어 질문 턴이면 선생님 차례 계획이 없고(변경 단위 ⑤ 몫), 고르기 차례도 끝나지 않는다", () => {
    const stage1 = teacher("That's okay! Let's say it together.", {
      kind: "card_slot",
      why: "support",
      stage: 1,
      item: { kind: "required", no: 1 },
    });
    expect(
      nextTeacherTurnOf(
        args3([...opening3(), button(), stage1, said({ koQuestion: true })]),
      ).kind,
    ).toBe("none");
    const pos = talkLessonPositionOf(
      args3([
        ...toTarget(),
        said(),
        teacher(`Great! ${MORE_PROMPT.en}`, { kind: "closing_slot" }),
        said({ koQuestion: true }),
      ]),
    );
    expect(pos.choice).toBe("closing");
    expect(pos.closingAnswered).toBe(false);
  });

  it("AC-15t 선생님이 갈래 '마무리'로 제안한 턴 뒤에는 두 버튼(마무리 제안) 차례이고, 말로 답하면 대화를 잇는다", () => {
    const turns = [
      ...opening3(),
      said(),
      aiTurn("We talked a lot! Shall we finish?", { next: "closing" }),
    ];
    expect(talkLessonPositionOf(args3(turns)).choice).toBe("suggestion");
    const answered = talkLessonPositionOf(args3([...turns, said()]));
    expect(answered.choice).toBeNull();
    expect(answered.closingAnswered).toBe(false);
  });
});

describe("말로 보낸 턴의 두 계획 · move 만들기", () => {
  it("말 입력은 응답의 막힘 판단 전이라 답한 경우와 막힌 경우의 계획을 함께 낸다", () => {
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(args3(opening3()), {
      segment: "talk",
      targets: ["play"],
    });
    expect(ifAnswered.kind).toBe("ai");
    expect(ifStuck).toMatchObject({
      kind: "card_slot",
      stage: 1,
      cause: "stuck",
    });
  });

  it("AC-15v 계획과 AI 응답 값으로 선생님 행 move 를 만든다(소리 줄 글은 sound 에)", () => {
    const plan = nextTeacherTurnOf(args3([...opening3(), button()]));
    const move = teacherMoveOf(plan, { next: "none", ai: "together" });
    expect(move).toMatchObject({
      v: 1,
      kind: "card_slot",
      why: "support",
      stage: 1,
      cause: "button",
      streak: 1,
      item: { kind: "required", no: 1 },
      words: ["play"],
      app: ["together", "answer_example"],
      ai: "together",
      sound: { answer: "Answer first 1." },
    });
    const ai = teacherMoveOf(
      nextTeacherTurnOf(args3([...opening3(), said()])),
      {
        next: "required",
        item: { kind: "required", no: 2 },
        words: ["soccer"],
        goals: ["talk-3-1-1"],
        intro: [],
      },
    );
    expect(ai).toMatchObject({
      kind: "ai",
      next: "required",
      item: { kind: "required", no: 2 },
      words: ["soccer"],
    });
    expect("sound" in ai).toBe(false);
  });
});

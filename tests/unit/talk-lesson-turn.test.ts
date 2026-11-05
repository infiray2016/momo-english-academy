// 새 꼴 회화 수업 턴 길의 DB 없는 몫(회화 plan 묶음 8 — 문장 문 · 질문이 지워진 턴의 카드 자리 · 끝 처리 · 흘려 보낼 줄 · 다시 흘림).
// 통합 시험(tests/integration/talk-lesson-turn.test.ts)은 CI 가 돈다 — 이 파일은 같은 길의 순수 몫을 로컬에서 본다. 계획은 묶음 5 의
// 흐름 함수(teacherTurnPlansOf · nextTeacherTurnOf)로 만들고, 설정값은 시험용 설정(tests/fixtures/settings)에서 읽는다.
import { describe, expect, it } from "vitest";
import type { TalkLessonOutput } from "@/core/ai/calls/talk-lesson";
import type { Masker } from "@/core/ai/mask";
import type { ClientListen } from "@/core/conversation/client-listen";
import {
  type LessonArgs,
  nextTeacherTurnOf,
  type TeacherTurnPlan,
  talkLessonPositionOf,
  teacherTurnPlansOf,
} from "@/core/conversation/lesson-flow";
import type {
  TalkLessonTeacherTurn,
  TalkLessonTurn,
} from "@/core/conversation/lesson-turns";
import type { LowLevelLineOptions } from "@/core/conversation/question-check";
import { lessonSoundFixedOf } from "@/server/ai/talk";
import { goalTextsOf } from "@/server/conversation/lesson-input";
import {
  createLessonSentenceFlow,
  isSoundCue,
  type LessonOutcomeView,
  type LessonSettleContext,
  lessonAfterLinesOf,
  lessonAskKindOf,
  lessonCardSlotOf,
  lessonChildRowOf,
  lessonExplanationOf,
  lessonHintsAt,
  lessonOutcomeViewOf,
  lessonReplayLinesOf,
  lessonTextOf,
  settleLessonTurn,
  shownAttachOf,
  TALK_BREAK_LINE,
} from "@/server/conversation/lesson-turn";
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
} from "../fixtures/talk-lesson";

/** 회화 턴 출력(빈 값 + 덮어쓴 칸 — 정규화 · 출력 검사를 지난 꼴). */
function out(over: Partial<TalkLessonOutput> = {}): TalkLessonOutput {
  return {
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

/** 3단계 어휘 범위 견본(이 시험의 질문 · 소리 줄 글이 쓰는 낱말). 'basketball' · 'stop' 은 범위 밖이다. */
const ALLOWED3 = new Set(
  "do you like it what is your oh great nice that okay me too i a the fun sport when free day how are today want to talk more here can say play soccer sunday weekend listen and on".split(
    " ",
  ),
);
const OPTIONS3: LowLevelLineOptions = {
  sentenceMaxWords: 8,
  allowedWords: ALLOWED3,
  unitWords: NEW3,
  childWords: [],
  teacherName: "Mina",
  lemmaOf: () => undefined,
  forms: [],
  allowedForms: new Set(),
};

function args3(turns: TalkLessonTurn[]): LessonArgs {
  return {
    spec: SPEC3,
    card: CARD3,
    newWords: NEW3,
    turns,
    segment: "talk",
    settings: LOW,
    prepWords: ["play", "soccer", "sunday"],
  };
}
function args4(turns: TalkLessonTurn[]): LessonArgs {
  return {
    spec: SPEC4,
    card: CARD4,
    newWords: NEW4,
    turns,
    segment: "talk",
    settings: MID,
    prepWords: [],
  };
}

function ctxOf(
  args: LessonArgs,
  turnsWithChild: readonly TalkLessonTurn[],
  over: Partial<LessonSettleContext> = {},
): LessonSettleContext {
  const low = args.spec.band === "1-3";
  return {
    card: args.card,
    turns: turnsWithChild,
    asked: talkLessonPositionOf(args).askedQuestions,
    max: args.settings.sameQuestionMax,
    low,
    koMeaning: args.spec.koMeaning,
    dropped: [],
    spec: args.spec,
    lineOptions: low ? OPTIONS3 : null,
    ...over,
  };
}

/** 문장 문에 문장을 차례로 넣고 끝 처리까지(부르는 쪽 서버 길과 같은 차례). */
function play({
  args,
  ifAnswered,
  ifStuck = null,
  stuck = false,
  sentences,
  outcome,
  child = said(),
  over = {},
}: {
  args: LessonArgs;
  ifAnswered: TeacherTurnPlan;
  ifStuck?: TeacherTurnPlan | null;
  stuck?: boolean;
  sentences: string[];
  outcome: LessonOutcomeView;
  child?: TalkLessonTurn;
  over?: Partial<LessonSettleContext>;
}) {
  const low = args.spec.band === "1-3";
  const flow = createLessonSentenceFlow({
    low,
    ifAnswered,
    ifStuck,
    asked: talkLessonPositionOf(args).askedQuestions,
    max: args.settings.sameQuestionMax,
  });
  flow.stuck(stuck);
  const states = sentences.map((s) => flow.accept(s));
  const sent = sentences.filter((_, i) => states[i] === "send");
  const result = settleLessonTurn({
    flow,
    outcome,
    ctx: ctxOf(args, [...args.turns, child], over),
  });
  return { states, sent, result };
}

const ok = (value: TalkLessonOutput): LessonOutcomeView => ({
  kind: "ok",
  value,
  hintsBlocked: false,
  overLength: 0,
});

/** 3단계 대화 첫 질문(필수 1) 뒤 아이가 말로 답한 차례의 두 계획. */
function plans3() {
  const args = args3(opening3());
  return {
    args,
    ...teacherTurnPlansOf(args, { segment: "talk", targets: ["play"] }),
  };
}

/** 4단계: 인사 → 대화 첫 질문(필수 1). */
function opening4(): TalkLessonTurn[] {
  return [
    teacher("Hi! How was your day?", { kind: "first_question" }),
    said({ segment: "greeting_end" }),
    aiTurn("Nice! Let's talk.", {}),
    teacher("What is your favorite subject?", {
      kind: "first_question",
      item: { kind: "required", no: 1 },
      words: ["math"],
    }),
  ];
}

describe("새 꼴 문장 문(회화 plan 정한 것 19)", () => {
  it("회화 plan 정한 것 19 1~3단계 AI 차례의 물음표 문장은 응답 끝까지 잡아 두고 그 뒤 문장도 잡는다 · 4단계부터는 바로 보낸다", () => {
    const { args, ifAnswered } = plans3();
    const low = play({
      args,
      ifAnswered,
      sentences: ["Oh, nice!", "Do you like it?", "Great!"],
      outcome: ok(out({ next_targets: ["sunday"] })),
    });
    expect(low.states).toEqual(["send", "hold", "hold"]);
    const a4 = args4([...opening4(), said()]);
    const plan4 = nextTeacherTurnOf(a4);
    const flow = createLessonSentenceFlow({
      low: false,
      ifAnswered: plan4,
      ifStuck: null,
      asked: new Map(),
      max: MID.sameQuestionMax,
    });
    expect(
      ["Cool!", "Do you like math class?"].map((s) => flow.accept(s)),
    ).toEqual(["send", "send"]);
  });

  it("소리 줄 신호 말을 알아본다('Listen and say!' · 'Let's say it together.' — 3.3 소리 줄 · 6.1 고정부 예)", () => {
    expect(isSoundCue("Listen and say!")).toBe(true);
    expect(isSoundCue("That's okay! Let's say it together.")).toBe(true);
    expect(isSoundCue("I like to listen to music.")).toBe(false);
  });
});

describe("AC-15b · AC-15i · AC-15r · AC-15s 질문이 지워진 턴(카드 자리)", () => {
  it("AC-15b 1~3단계 카드 자리 턴의 물음표 문장은 지워지고 받침 소리 줄은 move.sound 에만 있다", () => {
    const { args, ifAnswered, ifStuck } = plans3();
    expect(ifStuck.kind).toBe("card_slot");
    const { states, result } = play({
      args,
      ifAnswered,
      ifStuck,
      stuck: true,
      sentences: ["That's okay!", "What do you do on the weekend?"],
      outcome: ok(out({ stuck: true })),
      child: stuckSaid(),
    });
    expect(states).toEqual(["send", "drop"]);
    expect(result.kept).toEqual(["That's okay!"]);
    expect(result.text).not.toContain("weekend?");
    expect(result.move).toMatchObject({
      kind: "card_slot",
      why: "support",
      stage: 1,
      cause: "stuck",
      sound: { answer: "Answer first 1." },
    });
    expect(result.move.app).toEqual(
      expect.arrayContaining(["together", "answer_example"]),
    );
    // 답 소리는 화면 글이 아니다(T2 · 정한 것 5)
    expect(result.text).not.toContain("Answer first 1.");
    expect(lessonAfterLinesOf(result)).toContainEqual({
      t: "sound",
      kind: "answer",
      say: "Answer first 1.",
    });
  });

  it("AC-15i 3단계 AI 차례 응답의 질문은 검사를 지나면 그대로 보이고 읽힌다(그 차례 답 예시 · 힌트는 aiQuestion 에)", () => {
    const { args, ifAnswered } = plans3();
    const { result } = play({
      args,
      ifAnswered,
      sentences: ["Oh, nice!", "Do you like it?"],
      outcome: ok(
        out({
          next_targets: ["sunday"],
          next_move: "follow_up",
          next_answer_example: "Yes, I do.",
          next_hint_ko: "좋아해?",
        }),
      ),
    });
    expect(result.replaced).toBeNull();
    expect(result.release).toEqual(["Do you like it?"]);
    expect(result.kept).toEqual(["Oh, nice!", "Do you like it?"]);
    expect(result.move).toMatchObject({ kind: "ai", next: "follow_up" });
    expect(result.aiQuestion).toMatchObject({
      en: "Do you like it?",
      answerExample: "Yes, I do.",
      hintKo: "좋아해?",
    });
  });

  it("AC-15i 어휘 범위 밖 낱말이 든 질문의 턴은 카드 자리가 되어 AI 질문 문장이 화면 · 읽어 주기 · 응답 본문에 없고 가장 앞의 남은 기회가 붙는다", () => {
    const { args, ifAnswered } = plans3();
    const { result } = play({
      args,
      ifAnswered,
      sentences: ["Oh, nice!", "Do you like basketball?"],
      outcome: ok(out({ next_targets: ["sunday"], next_move: "follow_up" })),
    });
    expect(result.replaced).toBe("question_check");
    expect(result.release).toEqual([]);
    expect(result.kept).toEqual(["Oh, nice!"]);
    expect(result.text).toBe("Oh, nice!\nWhat sport is fun?");
    expect(result.rewrite).not.toContain("basketball");
    expect(result.move).toMatchObject({
      kind: "card_slot",
      why: "question_check",
      next: "none",
      item: { kind: "required", no: 2 },
      words: ["soccer"],
    });
    expect(result.aiQuestion).toBeNull();
  });

  it("AC-15i 카드 자리로 바꾼 턴은 AI 의 소리 줄을 버리고, 꺼낸 새 단어는 화면 글에 남은 것만 move 에 둔다", () => {
    const { args, ifAnswered } = plans3();
    const { result } = play({
      args,
      ifAnswered,
      sentences: [
        "The weekend is fun!",
        "Do you like basketball?",
        "Listen and say!",
      ],
      outcome: ok(
        out({
          model_line: "Sunday.",
          choices: ["I like it.", "I like Sunday."],
          new_words: ["weekend", "sunday"],
          support: "model_line",
        }),
      ),
    });
    expect(result.replaced).toBe("question_check");
    expect(result.sound).toEqual({});
    expect(result.move.sound).toBeUndefined();
    expect(result.move.intro).toEqual(["weekend"]);
    expect(result.move.ai).toBe("none");
    expect(result.kept).toEqual(["The weekend is fun!"]);
  });

  it("AC-15i 걸린 질문 뒤에도 같은 질문이 이어서 나오지 않는다(노리는 단어가 든 질문 A4-03 — 같은 글의 카드 항목은 건너뛴다)", () => {
    const { args, ifAnswered } = plans3();
    const { result } = play({
      args,
      ifAnswered,
      sentences: ["Cool!", "What sport is fun?"],
      outcome: ok(out({ next_targets: ["sport"] })),
    });
    expect(result.replaced).toBe("question_check");
    expect(result.move.item).toEqual({ kind: "required", no: 3 });
    expect(result.text).toBe("Cool!\nWhen is your free day?");
  });

  it("AC-15r 막힌 바로 뒤 선생님 차례에 AI 가 막힌 질문을 쓰면 지워지고 받침 줄(카드 쉬운 질문)이 붙는다(4단계 받침 둘째)", () => {
    const args = args4([
      ...opening4(),
      button(),
      aiTurn("That's okay! Let's say it together. I like math.", {
        stage: 1,
        cause: "button",
        item: { kind: "required", no: 1 },
        words: ["math"],
      }),
      button(),
    ]);
    // 짧은 준비를 이미 했다(대화 중 짧은 준비 (나)가 둘째 막힘에서 열리지 않게 — 02-2 176줄)
    args.prepWords = ["math"];
    const plan = nextTeacherTurnOf(args);
    expect(plan).toMatchObject({ kind: "ai", stage: 2, aiAsks: true });
    const { states, result } = play({
      args,
      ifAnswered: plan,
      sentences: ["It's okay.", "What is your favorite subject?"],
      outcome: ok(out()),
      child: button(),
    });
    expect(states).toEqual(["send", "drop"]);
    expect(result.replaced).toBe("same_question");
    expect(result.text).toBe("It's okay.\nEasy first 1?");
    expect(result.move).toMatchObject({
      kind: "card_slot",
      why: "same_question",
      stage: 2,
      app: ["easy_question"],
      item: { kind: "required", no: 1 },
    });
  });

  it("AC-15r 한 대화에서 글이 같은 질문은 talk.same_question_max 번 뒤 다시 나오지 않는다(지운 뒤 남은 기회)", () => {
    const rows: TalkLessonTurn[] = [...opening4(), said()];
    for (let i = 0; i < MID.sameQuestionMax; i++)
      rows.push(aiTurn(`Cool ${i}! Do you like math?`, {}), said());
    const args = args4(rows);
    const plan = nextTeacherTurnOf(args);
    expect(plan.kind).toBe("ai");
    const { states, result } = play({
      args,
      ifAnswered: plan,
      sentences: ["Wow!", "Do you like math?"],
      outcome: ok(out()),
    });
    expect(states).toEqual(["send", "drop"]);
    expect(result.replaced).toBe("same_question");
    expect(result.text).toBe("Wow!\nWhich class is hard?");
  });

  it("AC-15s 들리지 않음 뒤 선생님 응답은 같은 질문을 다시 묻지 않는다(4단계: 지우고 답을 한 번 · 다음 카드 질문)", () => {
    const args = args4([...opening4(), noSpeech()]);
    const plan = nextTeacherTurnOf(args);
    expect(plan).toMatchObject({ kind: "ai", cause: "nospeech" });
    const { result } = play({
      args,
      ifAnswered: plan,
      sentences: ["I couldn't hear you.", "What is your favorite subject?"],
      outcome: ok(out()),
      child: noSpeech(),
    });
    expect(result.replaced).toBe("same_question");
    expect(result.text).toBe(
      "I couldn't hear you.\nAnswer first 1.\nWhich class is hard?",
    );
    expect(result.move).toMatchObject({
      kind: "card_slot",
      cause: "nospeech",
      app: ["answer_example"],
    });
  });

  it("회화 plan 정한 것 18 붙일 남은 기회가 없으면 대신 질문(가장 오래전에 쓴 더 이야기할 거리)을 붙인다", () => {
    const { args, ifAnswered } = plans3();
    const none: TeacherTurnPlan = {
      ...ifAnswered,
      chances: { ...ifAnswered.chances, required: [], reuse: [] },
    };
    const slot = lessonCardSlotOf(
      none,
      "question_check",
      ctxOf(args, args.turns),
    );
    expect(slot?.item).toEqual({ kind: "more", no: 1 });
    expect(slot?.attach).toEqual([
      expect.objectContaining({
        kind: "question",
        en: "What do you do after school?",
      }),
    ]);
  });
});

describe("묶음 6 검토 8절 범위 밖 관찰 넷", () => {
  it("(가) 1~3단계 마무리 제안 문장이 AI 질문 검사로 지워진 턴은 갈래 closing 이 none 이 되어 두 버튼을 보이지 않는다", () => {
    const { args, ifAnswered } = plans3();
    const dropped = play({
      args,
      ifAnswered,
      sentences: ["That was fun!", "Do you want to stop here?"],
      outcome: ok(out({ next_move: "closing" })),
    }).result;
    expect(dropped.move.next).toBe("none");
    const row = (r: typeof dropped): TalkLessonTeacherTurn => ({
      speaker: "teacher",
      text: r.text,
      move: r.move,
    });
    const afterDrop = talkLessonPositionOf({
      ...args,
      turns: [...args.turns, said(), row(dropped)],
    });
    expect(afterDrop.choice).toBeNull();
    // 검사를 지난 제안이면 갈래가 남아 마무리 제안(두 버튼)이다
    const kept = play({
      args,
      ifAnswered,
      sentences: ["That was fun!", "Do you want to talk more?"],
      outcome: ok(out({ next_move: "closing" })),
    }).result;
    expect(kept.move.next).toBe("closing");
    expect(
      talkLessonPositionOf({
        ...args,
        turns: [...args.turns, said(), row(kept)],
      }).choice,
    ).toBe("suggestion");
  });

  it("(나) 소리 줄이 빈 AI 차례의 'Listen and say!' 신호 말은 지우고, 따라 할 말이 있으면 남긴다(따라 할 말은 move.sound 에만)", () => {
    const { args, ifAnswered } = plans3();
    const empty = play({
      args,
      ifAnswered,
      sentences: ["The weekend is fun!", "Listen and say!"],
      outcome: ok(out()),
    });
    expect(empty.states).toEqual(["send", "hold"]);
    expect(empty.result.release).toEqual([]);
    expect(empty.result.kept).toEqual(["The weekend is fun!"]);
    const withLine = play({
      args,
      ifAnswered,
      sentences: ["The weekend is fun!", "Listen and say!"],
      outcome: ok(out({ model_line: "The weekend.", new_words: ["weekend"] })),
    }).result;
    expect(withLine.release).toEqual(["Listen and say!"]);
    expect(withLine.move.sound).toEqual({ model: "The weekend." });
    expect(withLine.text).toBe("The weekend is fun! Listen and say!");
    // 카드 자리는 계획에 소리 줄이 없으면 신호 말을 바로 지운다
    const { ifStuck } = plans3();
    const noSound: TeacherTurnPlan = { ...ifStuck, attach: [] };
    const flow = createLessonSentenceFlow({
      low: true,
      ifAnswered: noSound,
      ifStuck: null,
      asked: new Map(),
      max: LOW.sameQuestionMax,
    });
    expect(flow.accept("Listen and say!")).toBe("drop");
  });

  it("(다) 설명 칸은 koExplanationShownOf 를 따른다(1~4단계 첫 막힘 · 5단계부터 둘째 막힘)", () => {
    const spec3 = { level: 3, koExplainFromStuck: 1 };
    const spec5 = { level: 5, koExplainFromStuck: 2 };
    const text = "괜찮아, 같이 해 보자.";
    expect(
      lessonExplanationOf({
        spec: spec3,
        stuckInSlot: 1,
        cause: "stuck",
        explanation: text,
      }),
    ).toBe(text);
    expect(
      lessonExplanationOf({
        spec: spec5,
        stuckInSlot: 1,
        cause: "button",
        explanation: text,
      }),
    ).toBeNull();
    expect(
      lessonExplanationOf({
        spec: spec5,
        stuckInSlot: 2,
        cause: "button",
        explanation: text,
      }),
    ).toBe(text);
    expect(
      lessonExplanationOf({
        spec: spec3,
        stuckInSlot: 1,
        cause: "nospeech",
        explanation: text,
      }),
    ).toBeNull();
    // 칸 없는 옛 판 행은 단계 규격 스키마가 막는다(koExplainFromStuck 필수 칸 — 묶음 12, 던짐은 지움)
  });

  it("(라) 앱 확인이 따라 할 말 · 선택지를 바꾼 턴을 표시한다(소리 줄 바뀜 · move.app model_line)", () => {
    expect(
      lessonSoundFixedOf(
        { model_line: "I adore the glorious weekend.", choices: ["A.", "B."] },
        { model_line: "The weekend.", choices: [] },
      ),
    ).toEqual({ model: true, choices: true });
    expect(
      lessonSoundFixedOf(
        { model_line: "The weekend.", choices: [] },
        { model_line: "The weekend.", choices: [] },
      ),
    ).toEqual({ model: false, choices: false });
    const { args, ifAnswered } = plans3();
    const { result } = play({
      args,
      ifAnswered,
      sentences: ["The weekend is fun!", "Listen and say!"],
      outcome: {
        kind: "ok",
        value: out({ model_line: "The weekend." }),
        hintsBlocked: false,
        soundFixed: { model: true, choices: false },
        overLength: 0,
      },
    });
    expect(result.move.app).toContain("model_line");
  });
});

describe("8절 회화 턴 실패 · 거절(새 꼴)", () => {
  it("AC-15b 첫 문장 뒤 질문 없이 끊긴 3단계 턴에는 가장 앞의 남은 기회의 카드 질문이 붙는다(잡아 둔 질문은 검사할 수 없어 지움)", () => {
    const { args, ifAnswered } = plans3();
    const { result } = play({
      args,
      ifAnswered,
      sentences: ["Oh, nice!", "Do you like it?"],
      outcome: { kind: "cut", overLength: 0 },
    });
    expect(result.replaced).toBe("cut");
    expect(result.kept).toEqual(["Oh, nice!"]);
    expect(result.move).toMatchObject({ kind: "card_slot", why: "cut" });
    expect(result.text).toBe("Oh, nice!\nWhat sport is fun?");
  });

  it("AC-15b 4단계 끊긴 턴에 보낸 질문이 있으면 카드 자리가 아니고 그 차례 힌트(aiQuestion)가 없다", () => {
    const args = args4([...opening4(), said()]);
    const plan = nextTeacherTurnOf(args);
    const { result } = play({
      args,
      ifAnswered: plan,
      sentences: ["Cool!", "Do you like art class?"],
      outcome: { kind: "cut", overLength: 0 },
    });
    expect(result.replaced).toBeNull();
    expect(result.move.kind).toBe("ai");
    expect(result.aiQuestion).toBeNull();
  });

  it("AC-15b 1~3단계 회화 턴이 두 번 실패하면 카드 칭찬 대사와 카드 자리의 카드 질문이 보인다 · 4단계부터는 'Oops' 쉼", () => {
    const { args, ifAnswered } = plans3();
    const praise = "Good job!";
    const { result } = play({
      args,
      ifAnswered,
      sentences: [],
      outcome: { kind: "line", line: { en: praise } },
    });
    expect(result.release).toEqual([praise]);
    expect(result.move).toMatchObject({ kind: "card_slot", why: "fail" });
    expect(result.text).toBe(`${praise}\nWhat sport is fun?`);
    expect(TALK_BREAK_LINE.en).toBe("Oops, I need a little break!");
  });
});

describe("AC-15k · AC-15v 선생님 행 text · 다시 쓸 차례 · move", () => {
  it("AC-15k 다시 쓸 선생님 차례에는 선생님 문장 → 소리 줄 → 앱이 붙인 받침 줄 · 카드 질문이 화면 차례대로 들고 뜻이 없다", () => {
    const { args, ifAnswered, ifStuck } = plans3();
    const { result } = play({
      args,
      ifAnswered,
      ifStuck,
      stuck: true,
      sentences: ["That's okay!", "Let's say it together."],
      outcome: ok(out({ stuck: true, tori_ko: ["괜찮아!"] })),
      child: stuckSaid(),
    });
    expect(result.rewrite).toBe(
      "That's okay! Let's say it together.\nAnswer first 1.",
    );
    expect(result.rewrite).not.toContain("괜찮아");
    expect(result.ko).toBe("괜찮아!");
  });

  it("AC-15v 선생님 행 move 에 차례 종류 · 갈래 · 받침 단계 · 붙인 도움이 있고 text 는 화면 글 줄만 둔다", () => {
    const { args, ifAnswered } = plans3();
    const { result } = play({
      args,
      ifAnswered,
      sentences: ["Oh, nice!", "Do you like it?", "Listen and say!"],
      outcome: ok(
        out({
          next_targets: ["sunday"],
          next_move: "follow_up",
          choices: ["I like it.", "I like Sunday."],
          support: "choices",
        }),
      ),
    });
    expect(result.move).toMatchObject({
      v: 1,
      kind: "ai",
      next: "follow_up",
      stage: 0,
      ai: "choices",
      sound: { choices: ["I like it.", "I like Sunday."] },
    });
    expect(result.text).toBe("Oh, nice! Do you like it? Listen and say!");
    expect(result.rewrite).toContain("I like it. Or I like Sunday.");
  });

  it("겹침 없애기(C125): 선생님 문장에 이미 든 카드 질문 줄은 화면 · 읽어 주기에서 빠진다", () => {
    const { ifStuck } = plans3();
    const line = {
      kind: "question" as const,
      role: "card" as const,
      en: "What sport is fun?",
      item: { kind: "required" as const, no: 2 },
    };
    expect(shownAttachOf(["What sport is fun?"], [line])).toEqual([]);
    expect(shownAttachOf(["Nice!"], [line])).toEqual([line]);
    expect(lessonTextOf(["Nice!"], ifStuck.attach)).toBe("Nice!");
  });

  it("같은 시도 id 다시 흘림은 저장된 선생님 행에서 같은 줄을 되살린다(소리 줄은 move.sound 에서)", () => {
    const { args, ifAnswered } = plans3();
    const { sent, result } = play({
      args,
      ifAnswered,
      sentences: ["Oh, nice!", "Do you like basketball?"],
      outcome: ok(out({ next_targets: ["sunday"], tori_ko: ["좋아!"] })),
    });
    const lines = lessonReplayLinesOf(
      { text: result.text, toriKo: result.ko, move: result.move },
      { card: CARD3, koMeaning: true },
    );
    expect(lines).toEqual([
      ...[...sent, ...result.release].map((en) => ({ t: "s", en })),
      ...lessonAfterLinesOf(result),
    ]);
  });

  it("처음 묻는 턴 · 다시 묻는 턴: 지금 자리의 노린 단어가 앞 질문 자리에서 노려졌으면 다시 묻는 턴이다", () => {
    const turns = opening3();
    const pos = talkLessonPositionOf(args3(turns));
    expect(lessonAskKindOf(turns, pos.slot)).toBe("first");
    const again = [
      ...turns,
      said(),
      aiTurn("Nice! What do you do after school?", {
        item: { kind: "more", no: 1 },
        words: ["play"],
      }),
    ];
    expect(
      lessonAskKindOf(again, talkLessonPositionOf(args3(again)).slot),
    ).toBe("re_ask");
  });
});

describe("묶음 8 fix 1(검토 I-1 · I-2 · M-1~M-4 · 단원 목표 글)", () => {
  it("I-1 1~3단계 AI 소리 줄(선택지 · 따라 할 말)의 답을 담은 잡아 둔 선생님 문장은 화면 · 읽어 주기 · 다시 쓸 차례에서 빠진다(02-2 204줄 · C125)", () => {
    const { args, ifAnswered } = plans3();
    const { result } = play({
      args,
      ifAnswered,
      sentences: [
        "Oh, nice!",
        "Do you like it?",
        "I like Sunday!",
        "Listen and say!",
      ],
      outcome: ok(
        out({
          next_targets: ["sunday"],
          choices: ["I like it.", "I like Sunday."],
          // 문장과 맞출 수 없는 뜻(한 덩이)은 옛 규칙이다 — 문장마다의 뜻은 talk-prompt-fix1 시험(13절 C202 (5))
          tori_ko: ["좋아! 좋아해? 나는 일요일이 좋아! 듣고 따라 해!"],
        }),
      ),
    });
    expect(result.release).toEqual(["Do you like it?", "Listen and say!"]);
    expect(result.text).toBe("Oh, nice! Do you like it? Listen and say!");
    expect(result.rewrite.split("\n")[0]).not.toContain("Sunday");
    expect(result.move.sound?.choices).toEqual([
      "I like it.",
      "I like Sunday.",
    ]);
    // 문장과 맞출 수 없는 뜻이면 선생님 문장이 빠진 턴의 뜻은 흘리지도 저장하지도 않는다(T2)
    expect(result.ko).toBeNull();
    const model = play({
      args,
      ifAnswered,
      sentences: ["Fun!", "Do you like it?", "The weekend is fun."],
      outcome: ok(
        out({ next_targets: ["sunday"], model_line: "The weekend is fun." }),
      ),
    }).result;
    expect(model.release).toEqual(["Do you like it?"]);
  });

  it("I-1 이미 보낸 선생님 문장이 소리 줄의 답을 담았으면 지울 수 없어 소리 줄 바뀜(겹침)으로 알린다(ai_calls '검증 실패')", () => {
    expect(
      lessonSoundFixedOf(
        { model_line: "", choices: ["I like it.", "I like Sunday."] },
        { model_line: "", choices: ["I like it.", "I like Sunday."] },
        ["I like Sunday!", "Do you like it?"],
      ),
    ).toEqual({ model: false, choices: false, overlap: true });
    expect(
      lessonSoundFixedOf(
        { model_line: "The weekend.", choices: [] },
        { model_line: "The weekend.", choices: [] },
        ["Fun!"],
      ),
    ).toEqual({ model: false, choices: false, overlap: false });
  });

  it("I-2 1~3단계 인사 질문 자리에도 '힌트' 단이 있다(카드 인사 질문의 뜻 · 영어 틀 · 영어 문장, 단계 규격 hintTiers 차례)", () => {
    const greeting = {
      questions: [
        {
          question: { en: "How are you today?", ko: "오늘 기분 어때?" },
          hintKo: "기분",
          hintEn: "I'm good.",
          frameEn: "I'm ___.",
          answerExample: "I'm good.",
        },
      ],
    };
    const turns: TalkLessonTurn[] = [
      teacher("Hi! How are you today?", { kind: "first_question" }),
    ];
    const slot = talkLessonPositionOf({
      ...args3(turns),
      segment: "greeting",
    }).slot;
    const card = { required: [], more: [], greeting };
    const level3 = lessonHintsAt(
      {
        spec: {
          band: "1-3",
          hintTiers: ["ko", "frame", "sentence"],
          usablePhrases: 0,
        },
        card,
        turns,
        liveRows: [],
      },
      slot,
    );
    expect(level3).toEqual([
      { kind: "ko", text: "기분" },
      { kind: "frame", text: "I'm ___." },
      { kind: "sentence", text: "I'm good.", listen: true },
    ]);
    const level1 = lessonHintsAt(
      {
        spec: { band: "1-3", hintTiers: ["ko", "sentence"], usablePhrases: 0 },
        card,
        turns,
        liveRows: [],
      },
      slot,
    );
    expect(level1.map((t) => t.kind)).toEqual(["ko", "sentence"]);
  });

  it("M-1 4단계부터 같은 질문으로 지운 뒤의 물음표 문장도 지워 한 턴에 질문이 하나다 · 앞서 보낸 물음표 문장이 남아도 카드 자리다(앞 물음은 반응)", () => {
    const rows: TalkLessonTurn[] = [...opening4(), said()];
    for (let i = 0; i < MID.sameQuestionMax; i++)
      rows.push(aiTurn(`Cool ${i}! Do you like math?`, {}), said());
    const args = args4(rows);
    const plan = nextTeacherTurnOf(args);
    const after = play({
      args,
      ifAnswered: plan,
      sentences: ["Wow!", "Do you like math?", "What color do you like?"],
      outcome: ok(out({ next_move: "follow_up" })),
    });
    expect(after.states).toEqual(["send", "drop", "drop"]);
    expect(after.result.text).toBe("Wow!\nWhich class is hard?");
    const before = play({
      args,
      ifAnswered: plan,
      sentences: ["What color do you like?", "Do you like math?"],
      outcome: ok(out({ next_move: "follow_up" })),
    });
    expect(before.states).toEqual(["send", "drop"]);
    // 그 차례 질문은 마지막 물음표 문장이라(02-2 200줄 · 고정부) 앞서 보낸 물음은 반응이고 지운 질문 자리에 카드 질문이 붙는다(검토 fix 1 N-1)
    expect(before.result.replaced).toBe("same_question");
    expect(before.result.text).toBe(
      "What color do you like?\nWhich class is hard?",
    );
    expect(before.result.move).toMatchObject({
      kind: "card_slot",
      why: "same_question",
      next: "none",
    });
  });

  it("AC-15r 4단계부터 반응 물음('Oh, is it hard?') 뒤에 막힌 질문을 되풀이해도 지우고 받침 줄(카드 쉬운 질문)이 붙는다(검토 fix 1 N-1)", () => {
    const args = args4([
      ...opening4(),
      button(),
      aiTurn("That's okay! Let's say it together. I like math.", {
        stage: 1,
        cause: "button",
        item: { kind: "required", no: 1 },
        words: ["math"],
      }),
      button(),
    ]);
    args.prepWords = ["math"];
    const plan = nextTeacherTurnOf(args);
    const { states, result } = play({
      args,
      ifAnswered: plan,
      sentences: ["Oh, is it hard?", "What is your favorite subject?"],
      outcome: ok(out()),
      child: button(),
    });
    expect(states).toEqual(["send", "drop"]);
    expect(result.replaced).toBe("same_question");
    expect(result.text).toBe("Oh, is it hard?\nEasy first 1?");
    expect(result.move).toMatchObject({
      kind: "card_slot",
      why: "same_question",
      stage: 2,
      app: ["easy_question"],
      item: { kind: "required", no: 1 },
    });
  });

  it("M-2 다시 부른 시도의 막힘 판단으로 계획을 고친다(시도마다 덮어씀 — 최종 응답과 같은 계획)", () => {
    const { ifAnswered, ifStuck } = plans3();
    const flow = createLessonSentenceFlow({
      low: true,
      ifAnswered,
      ifStuck,
      asked: new Map(),
      max: LOW.sameQuestionMax,
    });
    flow.stuck(true);
    flow.stuck(false);
    expect(flow.chosen()).toBe(ifAnswered);
    expect(flow.stuckValue()).toBe(false);
  });

  it("M-3 4단계부터 끊긴 턴에 보낸 질문이 남으면 그 차례 카드 항목이 없어 다음 차례 '힌트'가 카드 힌트로 채워지지 않는다(07 60줄)", () => {
    const args = args4([
      ...opening4(),
      button(),
      aiTurn("That's okay! Let's say it together. I like math.", {
        stage: 1,
        cause: "button",
        item: { kind: "required", no: 1 },
        words: ["math"],
      }),
      button(),
    ]);
    args.prepWords = ["math"];
    const plan = nextTeacherTurnOf(args);
    const { result } = play({
      args,
      ifAnswered: plan,
      sentences: ["It's okay.", "Is math easy for you?"],
      outcome: { kind: "cut", overLength: 0 },
      child: button(),
    });
    expect(result.move.kind).toBe("ai");
    expect(result.move.item).toEqual({ kind: "none", no: 0 });
    expect(result.move.words).toEqual([]);
  });

  it("M-4 4단계부터 회화 턴이 두 번 실패하면 'Oops' 쉼 줄(4단계는 뜻 함께)이고 선생님 행을 만들지 않는다 · 1~3단계는 칭찬 대사 · 거절은 안전한 대사", () => {
    const base = {
      safeLines: [
        { en: "Let's talk about fun things!", ko: "재밌는 이야기 하자!" },
      ],
      praiseLines: ["Good job!"],
      safeLine: "Let's talk about fun things!",
      turnNo: 3,
    };
    const fail = { ok: false as const, reason: "server" as const, refusals: 0 };
    expect(
      lessonOutcomeViewOf(fail, { ...base, low: false, koMeaning: true }),
    ).toEqual({
      kind: "break",
      line: { en: TALK_BREAK_LINE.en, ko: TALK_BREAK_LINE.ko },
    });
    expect(
      lessonOutcomeViewOf(fail, { ...base, low: false, koMeaning: false }),
    ).toEqual({
      kind: "break",
      line: { en: TALK_BREAK_LINE.en },
    });
    expect(
      lessonOutcomeViewOf(fail, { ...base, low: true, koMeaning: true }),
    ).toEqual({
      kind: "line",
      line: { en: "Good job!" },
    });
    expect(
      lessonOutcomeViewOf(
        { ok: false, reason: "refusal", refusals: 2 },
        { ...base, low: false, koMeaning: true },
      ),
    ).toEqual({
      kind: "line",
      line: { en: "Let's talk about fun things!", ko: "재밌는 이야기 하자!" },
    });
  });

  it("단원 목표 글: 적재된 단원 규격 행의 목표 칸에서 목표 ID · 글을 꺼낸다(칸이 없거나 꼴이 틀리면 빈 목록)", () => {
    const goal = {
      id: "talk-3-1-1",
      ko: "주말에 하는 일을 말한다",
      core: "speaking",
      tasks: ["card-answer"],
      home: ["home"],
      needs: ["word"],
      accept: "meaning",
    };
    expect(goalTextsOf([goal])).toEqual([
      { id: "talk-3-1-1", ko: "주말에 하는 일을 말한다" },
    ]);
    expect(goalTextsOf(null)).toEqual([]);
    expect(goalTextsOf([{ id: 3 }])).toEqual([]);
  });
});

// ── 아이 행(옛 흐름 시험 conversation-server 의 C149 · AC-16b 를 새 꼴 lessonChildRowOf 로 옮김 — 묶음 12, 위험 12 의 0c664c3 고침) ──

describe("아이 행(lessonChildRowOf) — 듣기 사건 요약 · 이름 묻기 자리", () => {
  type ChildState = Parameters<typeof lessonChildRowOf>[1]["state"];
  const identity: Masker = (text) => ({ text, names: 0, contacts: 0 });
  const named = {
    questions: [
      {
        question: { en: "What's your name?", ko: "이름이 뭐야?" },
        hintKo: "내 이름은 {NAME}야.",
        hintEn: "My name is {NAME}.",
        answerExample: "My name is {NAME}.",
      },
    ],
  };
  const turns: TalkLessonTurn[] = [
    teacher("Hi! What's your name?", { kind: "first_question" }),
  ];
  /** 1~2단계 인사 질문(이름 묻기) 자리의 상태 — 아이 행이 읽는 칸만. */
  const state = {
    spec: { band: "1-3", hintTiers: ["ko", "sentence"], usablePhrases: 0 },
    card: { greeting: named, required: [], more: [] },
    position: talkLessonPositionOf({
      ...args3(turns),
      card: { ...CARD3, greeting: named },
      segment: "greeting",
    }),
    turns,
    liveRows: [],
    segment: "greeting",
  } as unknown as ChildState;
  const base = {
    sessionId: "00000000-0000-4000-8000-000000000000",
    clientAttemptId: "c",
    hint: { opened: 0, heard: [] },
  };

  it("C149 아이 행에 듣기 사건 요약(client_listen)을 두고 '모름'의 출처는 화면의 nospeech 표시로 정하며 글은 들지 않는다", () => {
    const clientListen: ClientListen = {
      br: "iPad Safari 27.0",
      r3d: true,
      listens: [
        { o: "error:no-speech", by: "button", d: 2010, snd: false, tc: "cut" },
        { o: "error:no-speech", by: "button", d: 1800, snd: false, tc: 900 },
      ],
      mf: 0,
    };
    const silent = lessonChildRowOf(
      { ...base, input: { mode: "dont_know", nospeech: true }, clientListen },
      { state, masker: identity },
    );
    expect(silent.clientListen).toEqual({ ...clientListen, src: "nospeech" });
    const pressed = lessonChildRowOf(
      { ...base, input: { mode: "dont_know" } },
      { state, masker: identity },
    );
    expect(pressed.clientListen).toEqual({ src: "button" });
    const spoke = lessonChildRowOf(
      { ...base, input: { mode: "speech", text: "I'm good." }, clientListen },
      { state, masker: identity },
    );
    expect(spoke.clientListen).toEqual(clientListen);
    expect(JSON.stringify(spoke.clientListen)).not.toContain("good");
    expect(
      lessonChildRowOf(
        { ...base, input: { mode: "speech", text: "I'm good." } },
        { state, masker: identity },
      ).clientListen,
    ).toBeNull();
  });

  it("AC-16b 이름 묻기 자리의 아이 말은 {NAME} 자리를 바꾸고 가림을 거쳐 저장 글이 된다(순수 몫)", () => {
    const masker: Masker = (text) => ({
      text: text.replace(/\d{3}-\d{4}-\d{4}/g, "[연락처]"),
      names: 0,
      contacts: 0,
    });
    const fields = lessonChildRowOf(
      {
        ...base,
        clientAttemptId: "a",
        input: { mode: "speech", text: "My name is Momo 010-1234-5678" },
        hint: { opened: 2, heard: [] },
      },
      { state, masker },
    );
    expect(fields.text).not.toContain("Momo");
    expect(fields.text).toContain("{NAME}");
    expect(fields.text).not.toContain("010-1234-5678");
    expect(fields.hintKind).toBe("english");
    expect(fields.hintLevel).toBe(2);
    expect(fields.withinTarget).toBe(true);
    const dontKnow = lessonChildRowOf(
      {
        ...base,
        clientAttemptId: "b",
        input: { mode: "dont_know" },
        hint: { opened: 1, heard: ["two_answers", "answer_example"] },
      },
      { state, masker: identity },
    );
    expect(dontKnow).toMatchObject({
      text: null,
      inputMode: "dont_know",
      heardHelp: "answer_example",
      hintKind: "english",
      wordCount: 0,
    });
  });
});

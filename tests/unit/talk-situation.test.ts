// 회화 1~3단계 상황 차례('AI 몫 넓힘' 묶음 2 — spec 판 4 설계 1 · AC-15za (가)(나)(라)(마) · AC-15zb (나) 서버 몫 · AC-15ze (나) 서버 몫).
// 순수 몫(core/conversation/situation)과 서버 턴 길의 순수 함수(문장 문 · 끝 처리 · 실패 대신 줄 · 힌트 · 다시 흘림)를 본다. 목록은 시험 안
// 견본이다(시드 목록 내용은 묶음 3 이 고친다). DB · AI 를 부르는 길은 통합 시험(tests/integration/talk-ai-scope.test.ts, CI)이 본다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TalkLessonOutput } from "@/core/ai/calls/talk-lesson";
import {
  type LessonArgs,
  nextTeacherTurnOf,
  type TeacherTurnPlan,
  talkLessonPositionOf,
  teacherTurnPlansOf,
} from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import type { LowLevelLineOptions } from "@/core/conversation/question-check";
import {
  allowedLemmaOfVocab,
  checkSituationSentence,
  heardFieldsBlankOf,
  type SituationCheckContext,
  situationLineOf,
  situationPlaceOf,
} from "@/core/conversation/situation";
import type { TalkSituationLinesFile } from "@/core/seed/schema/reference";
import { lemmaLookup } from "@/core/session/attempt";
import {
  createLessonSentenceFlow,
  type LessonLiveChecks,
  type LessonOutcomeView,
  type LessonSettleContext,
  lessonHintsAt,
  lessonOutcomeViewOf,
  lessonReplayLinesOf,
  settleLessonTurn,
  slotQuestionTextOf,
} from "@/server/conversation/lesson-turn";
import { seedTalkAllowedWords } from "@/server/seed-lists";
import {
  aiTurn,
  button,
  CARD3,
  CARD3_GREET2,
  CARD3_SCENE,
  LOW,
  MID,
  NEW3,
  noSpeech,
  opening3,
  SCENE3,
  SPEC3,
  SPEC4,
  said,
  stuckSaid,
  teacher,
} from "../fixtures/talk-lesson";

function out(over: Partial<TalkLessonOutput> = {}): TalkLessonOutput {
  return {
    child_kind: over.stuck === true ? "not_understood" : "answer",
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

const ok = (value: TalkLessonOutput): LessonOutcomeView => ({
  kind: "ok",
  value,
  hintsBlocked: false,
  overLength: 0,
});

/** 3단계 범위 견본(이 시험 글의 낱말). basketball · zebra · wrong 은 범위 밖이다. */
const RANGE = new Set(
  "that is okay it you are a do what on the weekend we can good great nice like i am fine me too go oh and eat rice fish for lunch at table how today sunday".split(
    " ",
  ),
);
const OPTIONS: LowLevelLineOptions = {
  sentenceMaxWords: 8,
  allowedWords: RANGE,
  unitWords: NEW3,
  childWords: [],
  teacherName: "Mina",
  lemmaOf: (w) => (w.toLowerCase() === "eats" ? "eat" : undefined),
  forms: [],
  allowedForms: new Set(),
};
// 범위 견본 밖의 허용 낱말(감탄 · 수업 말). 들리지 않음 줄은 시드와 같이 소리 쪽 말이다('my ears' 꼴은 13절 C217 (3) 로 뺐다)
const ALLOWED = new Set(["let", "oops", "yay", "sound", "no", "here"]);
const FORBIDDEN = {
  all: ["that's wrong", "you don't know"],
  nospeech: ["good answer", "you said"],
};
const FUNCTION_WORDS = new Set(
  "we you i a an the and or to at for do is are it my".split(" "),
);
const LINES: TalkSituationLinesFile["lines"] = {
  greeting_end: [
    { en: "Okay! Let's talk!", ko: "좋아! 이야기하자!" },
    { en: "Great! Here we go!", ko: "좋아! 가 보자!" },
    { en: "Nice! Let's go!", ko: "좋아! 가자!" },
  ],
  together: [
    { en: "Let's say it together!", ko: "같이 말해 보자!" },
    { en: "We can do it together!", ko: "우리 같이 할 수 있어!" },
    { en: "Let's try it together!", ko: "같이 해 보자!" },
  ],
  easy: [
    { en: "That's okay! Try this one.", ko: "괜찮아! 이거 해 봐." },
    { en: "It's okay! Here is an easy one.", ko: "괜찮아! 쉬운 거야." },
    { en: "No problem! Let's try this.", ko: "괜찮아! 이거 해 보자." },
  ],
  close: [
    { en: "Good try! Let's go on.", ko: "잘했어! 계속하자." },
    { en: "Nice try! Let's keep going.", ko: "잘했어! 계속 가 보자." },
    { en: "That's okay! Let's go on.", ko: "괜찮아! 계속하자." },
  ],
  nospeech: [
    { en: "Oops, no sound! Let's go on.", ko: "앗, 소리가 안 들려! 계속하자." },
    {
      en: "Oh no, no sound! Let's go on.",
      ko: "이런, 소리가 안 들려! 계속하자.",
    },
    { en: "Oops! Let's keep going.", ko: "앗! 계속 가 보자." },
  ],
};
/** 이 시험의 선생님 차례 턴 번호(상황 줄 돌림 — 7 % 3 = 1, 각 자리의 둘째 줄). */
const TURN_NO = 7;

function ctxOf(
  place: SituationCheckContext["place"],
  over: Partial<SituationCheckContext> = {},
): SituationCheckContext {
  return {
    place,
    options: OPTIONS,
    allowed: ALLOWED,
    forbidden: FORBIDDEN,
    answer: null,
    ...over,
  };
}

function liveOf(
  turns: readonly TalkLessonTurn[],
  over: Partial<NonNullable<LessonLiveChecks["situation"]>> = {},
): LessonLiveChecks {
  return {
    cuePhrases: [],
    madeUp: ["yesterday i", "when i was", "i remember"],
    situation: {
      options: OPTIONS,
      allowed: ALLOWED,
      forbidden: FORBIDDEN,
      lines: LINES,
      turnNo: TURN_NO,
      question: slotQuestionTextOf(turns),
      functionWords: FUNCTION_WORDS,
      ...over,
    },
  };
}

function args3(
  turns: TalkLessonTurn[],
  card: LessonArgs["card"] = CARD3,
): LessonArgs {
  return {
    spec: SPEC3,
    card,
    newWords: NEW3,
    turns,
    segment: "talk",
    settings: LOW,
    prepWords: ["play", "soccer", "sunday"],
  };
}

function settleCtx(
  args: LessonArgs,
  turnsWithChild: readonly TalkLessonTurn[],
  over: Partial<LessonSettleContext> = {},
): LessonSettleContext {
  return {
    card: args.card,
    turns: turnsWithChild,
    asked: talkLessonPositionOf(args).askedQuestions,
    max: args.settings.sameQuestionMax,
    low: true,
    koMeaning: true,
    dropped: [],
    spec: args.spec,
    lineOptions: OPTIONS,
    live: { situationLines: LINES, turnNo: TURN_NO, cue: null },
    ...over,
  };
}

/** 문장 문 → 끝 처리(서버 길과 같은 차례). */
function play({
  args,
  ifAnswered,
  ifStuck = null,
  stuck = false,
  sentences,
  outcome,
  child,
  live = liveOf(args.turns),
  over = {},
}: {
  args: LessonArgs;
  ifAnswered: TeacherTurnPlan;
  ifStuck?: TeacherTurnPlan | null;
  stuck?: boolean;
  sentences: string[];
  outcome: LessonOutcomeView;
  child: TalkLessonTurn;
  live?: LessonLiveChecks | null;
  over?: Partial<LessonSettleContext>;
}) {
  const flow = createLessonSentenceFlow({
    low: true,
    ifAnswered,
    ifStuck,
    asked: talkLessonPositionOf(args).askedQuestions,
    max: args.settings.sameQuestionMax,
    live,
  });
  flow.stuck(stuck);
  const states: string[] = [];
  const shown: string[] = [];
  for (const s of sentences) {
    const state = flow.accept(s);
    states.push(state);
    if (state === "send") shown.push(flow.lastText());
  }
  const result = settleLessonTurn({
    flow,
    outcome,
    ctx: settleCtx(args, [...args.turns, child], over),
  });
  return { states, shown, result, entries: flow.entries() };
}

/** 인사 둘 뒤 인사 끝 턴(말로 답함). */
function greetingEndTurns(): TalkLessonTurn[] {
  return [
    teacher("Hi! How are you today?", { kind: "first_question" }),
    said({ segment: "greeting" }),
    teacher("Great! Do you like Sunday?", { kind: "card_slot" }),
  ];
}

describe("situationPlaceOf — 상황 차례 자리(spec 설계 1)", () => {
  const plan = (over: Partial<TeacherTurnPlan>) =>
    ({
      lowBand: true,
      segment: "talk",
      cause: null,
      stage: 0,
      ...over,
    }) as TeacherTurnPlan;

  it("AC-15za 인사 끝 · 받침 첫째 · 둘째 · 셋째 · 들리지 않음을 가르고, 말로 답한 대화 차례 · 4단계부터는 상황 차례가 아니다", () => {
    expect(situationPlaceOf(plan({ segment: "greeting_end" }))).toBe(
      "greeting_end",
    );
    expect(situationPlaceOf(plan({ cause: "button", stage: 1 }))).toBe(
      "together",
    );
    expect(situationPlaceOf(plan({ cause: "stuck", stage: 2 }))).toBe("easy");
    expect(situationPlaceOf(plan({ cause: "button", stage: 3 }))).toBe("close");
    expect(situationPlaceOf(plan({ cause: "nospeech", stage: 0 }))).toBe(
      "nospeech",
    );
    // 인사 끝 자리를 들리지 않음 · 막힘으로 닫아도 그 차례의 자리다
    expect(
      situationPlaceOf(plan({ segment: "greeting_end", cause: "nospeech" })),
    ).toBe("nospeech");
    expect(
      situationPlaceOf(
        plan({ segment: "greeting_end", cause: "stuck", stage: 3 }),
      ),
    ).toBe("close");
    expect(situationPlaceOf(plan({}))).toBeNull();
    const { lowBand: _low, ...upper } = plan({ cause: "button", stage: 1 });
    expect(situationPlaceOf(upper)).toBeNull();
  });

  it("흐름 계획에서도 같은 자리가 나온다(받침 첫째 카드 자리 · 들리지 않음 · 인사 끝)", () => {
    const stuckPlans = teacherTurnPlansOf(args3(opening3()), {
      segment: "talk",
      targets: ["play"],
    });
    expect(situationPlaceOf(stuckPlans.ifStuck)).toBe("together");
    expect(situationPlaceOf(stuckPlans.ifAnswered)).toBeNull();
    expect(
      situationPlaceOf(nextTeacherTurnOf(args3([...opening3(), noSpeech()]))),
    ).toBe("nospeech");
    const greet = nextTeacherTurnOf({
      ...args3([...greetingEndTurns(), said({ segment: "greeting_end" })]),
      segment: "greeting",
    });
    expect(situationPlaceOf(greet)).toBe("greeting_end");
  });
});

describe("checkSituationSentence — 말 검사(spec 설계 1 · AC-15za (나))", () => {
  it("AC-15za (나) 'That's okay!' 는 축약형을 펼쳐 범위 안이고, 허용 목록 · 닫힌 품사 한 낱말은 통과한다", () => {
    expect(checkSituationSentence("That's okay!", ctxOf("together")).ok).toBe(
      true,
    );
    expect(
      checkSituationSentence("Oops, no sound! Let's go on.", ctxOf("nospeech"))
        .ok,
    ).toBe(true);
    expect(
      checkSituationSentence("Great! You can do it now!", ctxOf("together")).ok,
    ).toBe(true);
  });

  it("컨트롤러 결정 (나) 허용 낱말 대조는 모든 단계 어휘로 원형을 찾는다 — 'words' · 'going' 이 1단계 · 3단계 범위 검사에서 허용으로 지나고 범위 판정은 그대로다", () => {
    const seed = (
      JSON.parse(
        readFileSync(join(process.cwd(), "seed/vocab.json"), "utf8"),
      ) as {
        vocab: { word: string; level: number; forms: string[] }[];
      }
    ).vocab;
    const allowedList = seedTalkAllowedWords().allowed;
    const allowed = new Set(allowedList);
    // 서버 readAllowedLemmaOf 와 같은 사전: 허용 낱말인 vocab 행의 활용형(단계 무관)
    const allowedLemmaOf = allowedLemmaOfVocab(seed, allowedList);
    expect(allowedLemmaOf("words")).toBe("word");
    expect(allowedLemmaOf("going")).toBe("go");
    // 허용 낱말이 아닌 어휘 행은 사전에 들지 않는다
    expect(allowedLemmaOf("swords")).toBeUndefined();
    const rangeAt = (level: number): LowLevelLineOptions => ({
      ...OPTIONS,
      allowedWords: new Set(
        seed.filter((v) => v.level <= level).map((v) => v.word.toLowerCase()),
      ),
      lemmaOf: lemmaLookup(seed.filter((v) => v.level <= level)),
    });
    for (const level of [1, 3]) {
      const ctx = {
        ...ctxOf("greeting_end", { options: rangeAt(level) }),
        allowed,
        allowedLemmaOf,
      };
      for (const sentence of [
        "Let's learn some new words!",
        "Let's keep going.",
      ])
        expect(
          checkSituationSentence(sentence, ctx),
          `${level} ${sentence}`,
        ).toEqual({
          ok: true,
        });
      // 사전이 있으면 사전만 본다 — 허용 원형이 아닌 낱말의 활용형은 그대로 범위 밖이다
      expect(
        checkSituationSentence("Let's learn some new swords!", ctx),
      ).toMatchObject({ ok: false, reason: "offband" });
      expect(
        checkSituationSentence("Let's learn some new words!", {
          ...ctx,
          allowedLemmaOf: () => undefined,
        }),
      ).toMatchObject({ ok: false, words: ["words"] });
    }
  });

  it("원형 사전을 넘기지 않는 길(대본 도구 · 순수 시험)은 허용 목록에 규칙 활용 꼬리를 떼어 본다(words · going · tries)", () => {
    const allowed = new Set([
      ...ALLOWED,
      "word",
      "go",
      "try",
      "new",
      "learn",
      "some",
      "keep",
    ]);
    for (const sentence of [
      "Let's learn some new words!",
      "Let's keep going!",
      "It tries!",
    ])
      expect(
        checkSituationSentence(sentence, { ...ctxOf("greeting_end"), allowed })
          .ok,
        sentence,
      ).toBe(true);
    expect(
      checkSituationSentence("Let's learn some new swords!", {
        ...ctxOf("greeting_end"),
        allowed,
      }).ok,
    ).toBe(false);
  });

  it("AC-15za (나) 범위 밖 내용어가 든 문장은 걸린다(걸린 낱말을 함께 낸다) · 범위 재료가 없으면 모두 걸린다", () => {
    expect(
      checkSituationSentence("You are a basketball star!", ctxOf("together")),
    ).toEqual({ ok: false, reason: "offband", words: ["basketball", "star"] });
    expect(
      checkSituationSentence(
        "That's okay!",
        ctxOf("together", { options: null }),
      ),
    ).toEqual({ ok: false, reason: "range" });
  });

  it("AC-15za (나) 상황 금지 구: 탓 · 학습 실패 꼴은 모든 상황 차례, 들은 척하는 칭찬 · 되받기는 들리지 않음에서만", () => {
    expect(
      checkSituationSentence("Oh no, that's wrong.", ctxOf("close")),
    ).toMatchObject({ ok: false, reason: "forbidden" });
    expect(
      checkSituationSentence("You don't know? Okay!", ctxOf("greeting_end")),
    ).toMatchObject({ ok: false, reason: "forbidden" });
    expect(checkSituationSentence("Good answer!", ctxOf("nospeech"))).toEqual({
      ok: false,
      reason: "forbidden",
      words: ["good answer"],
    });
    expect(checkSituationSentence("Good answer!", ctxOf("together")).ok).toBe(
      false,
    );
    expect(
      checkSituationSentence("Good answer!", {
        ...ctxOf("together"),
        allowed: new Set([...ALLOWED, "answer"]),
      }).ok,
    ).toBe(true);
  });

  it("AC-15za (나) 답 글: 질문 글(장면 문장 포함)에 없는 답 예시 내용어를 담은 문장은 걸리고, 질문 글의 낱말만 쓴 장면 반응은 남는다(N-2)", () => {
    const answer = {
      example: "We eat rice and fish.",
      question: "Rice and fish for lunch! What do you do at the table?",
      functionWords: FUNCTION_WORDS,
    };
    expect(
      checkSituationSentence("You eat it!", ctxOf("together", { answer })),
    ).toEqual({ ok: false, reason: "answer", words: ["eat"] });
    expect(
      checkSituationSentence("He eats it!", ctxOf("nospeech", { answer })),
    ).toMatchObject({ ok: false, reason: "answer" });
    expect(
      checkSituationSentence(
        "Rice and fish, yum!",
        ctxOf("together", {
          answer,
          allowed: new Set([...ALLOWED, "yum"]),
        }),
      ).ok,
    ).toBe(true);
    // 인사 끝에는 답 글 검사를 걸지 않는다(붙일 답 소리가 보통 없다)
    expect(
      checkSituationSentence("You eat it!", ctxOf("greeting_end", { answer }))
        .ok,
    ).toBe(true);
  });
});

describe("situationLineOf · heardFieldsBlankOf", () => {
  it("상황 줄은 턴 번호로 돌리고, 목록이 비면 null 이다", () => {
    expect(situationLineOf(LINES, "close", 0)?.en).toBe(
      "Good try! Let's go on.",
    );
    expect(situationLineOf(LINES, "close", 4)?.en).toBe(
      "Nice try! Let's keep going.",
    );
    expect(situationLineOf(LINES, "close", 5)?.en).toBe(
      "That's okay! Let's go on.",
    );
    expect(situationLineOf({ ...LINES, close: [] }, "close", 1)).toBeNull();
    expect(situationLineOf({}, "nospeech", 1)).toBeNull();
  });

  it("상황 줄은 이 턴에 보낸 문장과 한 문장이 같은 줄 · 이 대화에 이미 나온 줄을 건너뛰고, 모두 걸리면 돌림 차례 줄이다(검토 rev-2 M-1)", () => {
    expect(
      situationLineOf(LINES, "easy", 0, { sentences: ["That's okay!"] })?.en,
    ).toBe("It's okay! Here is an easy one.");
    expect(
      situationLineOf(LINES, "close", 0, {
        texts: ["Good try! Let's go on.\nWhat sport is fun?"],
      })?.en,
    ).toBe("Nice try! Let's keep going.");
    expect(
      situationLineOf({ close: [LINES.close[0] as never] }, "close", 0, {
        texts: ["Good try! Let's go on."],
      })?.en,
    ).toBe("Good try! Let's go on.");
  });

  it("문장 문: 'That's okay!' 를 보낸 뒤 걸린 문장은 'That's okay!' 로 시작하는 상황 줄을 건너뛴 줄로 바뀐다(검토 rev-2 M-1)", () => {
    const args = args3(opening3());
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    const together = [
      { en: "Let's say it together!", ko: "같이 말해 보자!" },
      {
        en: "That's okay! Let's try it together!",
        ko: "괜찮아! 같이 해 보자!",
      },
      { en: "We can do it together!", ko: "우리 같이 할 수 있어!" },
    ];
    const { shown } = play({
      args,
      ifAnswered,
      ifStuck,
      stuck: true,
      sentences: ["That's okay!", "You are a basketball star!"],
      outcome: ok(out({ stuck: true })),
      child: stuckSaid(),
      live: liveOf(opening3(), { lines: { ...LINES, together } }),
    });
    expect(shown).toEqual(["That's okay!", "We can do it together!"]);
  });

  it("AC-15za (가) 들리지 않음 차례의 판단 칸(막힘 · 갈래 · 알맞은 응답 · 꺼낸 이야기 · 물음 · 보인 능력 · 스스로 쓴 단어 · 미션 · 되풀이)을 비우고 말 · 차례 칸은 그대로 둔다", () => {
    const value = out({
      child_kind: "not_understood",
      stuck: true,
      tori_en: "Oops, no sound!",
      response_fit: true,
      child_topic: true,
      child_asked: true,
      goal_suggest: [{ goal: "talk-3-1-1", why_ko: "말했어요" }],
      self_used_words: ["play"],
      mission_done: [1],
      recast: "I play soccer.",
      model_line: "I play.",
      next_targets: ["soccer"],
    });
    const blank = heardFieldsBlankOf(value);
    expect(blank).toMatchObject({
      child_kind: "answer",
      stuck: false,
      response_fit: false,
      child_topic: false,
      child_asked: false,
      goal_suggest: [],
      self_used_words: [],
      mission_done: [],
      recast: "",
    });
    expect(blank.tori_en).toBe("Oops, no sound!");
    expect(blank.model_line).toBe("I play.");
    expect(blank.next_targets).toEqual(["soccer"]);
  });

  it("AC-15za (가) 비운 응답으로 끝 처리하면 들리지 않음 차례 move 의 받침 단계 · 까닭 · 이어진 막힘은 계획대로이고 AI 제안은 빈 값이다", () => {
    const args = args3([...opening3(), noSpeech()]);
    const plan = nextTeacherTurnOf(args);
    const { result } = play({
      args: { ...args, turns: opening3() },
      ifAnswered: plan,
      sentences: ["Oops, no sound! Let's go on."],
      outcome: ok(
        heardFieldsBlankOf(
          out({
            stuck: true,
            response_fit: true,
            child_topic: true,
            goal_suggest: [{ goal: "talk-3-1-1", why_ko: "x" }],
          }),
        ),
      ),
      child: noSpeech(),
    });
    expect(result.move).toMatchObject({
      stage: plan.stage,
      cause: "nospeech",
      streak: plan.streak,
      suggest: { fit: false, topic: false, asked: false, goals: [] },
    });
  });
});

describe("문장 문 · 끝 처리의 상황 차례(AC-15za (나)(라)(마))", () => {
  it("AC-15za (나) 받침 첫째의 걸린 첫 문장은 상황 줄로 바뀌어 그 글로 보내고, 뒤 걸림은 지운다 · 걸리지 않은 'That's okay!' 는 남는다", () => {
    const args = args3(opening3());
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    const { states, shown, result, entries } = play({
      args,
      ifAnswered,
      ifStuck,
      stuck: true,
      sentences: [
        "That's okay!",
        "You are a basketball star!",
        "Zebras are fun!",
      ],
      outcome: ok(out({ stuck: true })),
      child: stuckSaid(),
    });
    const line = LINES.together[1];
    expect(states).toEqual(["send", "send", "drop"]);
    expect(shown).toEqual(["That's okay!", line?.en]);
    expect(entries[1]).toMatchObject({
      en: line?.en,
      ai: "You are a basketball star!",
    });
    expect(entries[2]).toMatchObject({ state: "dropped", reason: "situation" });
    expect(result.kept).toEqual(["That's okay!", line?.en]);
    expect(result.text.split("\n")[0]).toBe(`That's okay! ${line?.en}`);
    expect(JSON.stringify(result)).not.toContain("basketball");
  });

  it("AC-15za (나) 받침 · 들리지 않음 차례에서 질문 글에 없는 답 예시 낱말을 담은 문장은 상황 줄로 바뀐다(카드 답 소리와 겹치지 않게)", () => {
    const args = args3(opening3());
    const { ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    const plan = { ...ifStuck, answerFallback: "I eat fish." };
    const { result } = play({
      args,
      ifAnswered: plan,
      sentences: ["Okay!", "You eat fish!"],
      outcome: ok(out()),
      child: stuckSaid(),
    });
    expect(result.kept).toEqual(["Okay!", LINES.together[1]?.en]);
  });

  it("AC-15za (나) 범위를 읽지 못한 턴은 상황 차례 문장이 모두 걸려 첫 문장이 상황 줄, 나머지는 지워진다", () => {
    const args = args3(opening3());
    const plan = nextTeacherTurnOf(args3([...opening3(), noSpeech()]));
    const { result } = play({
      args,
      ifAnswered: plan,
      sentences: ["Oh no!", "Let's go on."],
      outcome: ok(out()),
      child: noSpeech(),
      live: liveOf(opening3(), { options: null }),
      over: { lineOptions: null },
    });
    expect(result.kept).toEqual([LINES.nospeech[1]?.en]);
  });

  it("반응이 다 지워진 상황 차례(AI 신호 말뿐)는 상황 줄 하나를 반응 자리에 두고 그 뜻을 쓴다", () => {
    const args = args3(opening3());
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    const { states, result } = play({
      args,
      ifAnswered,
      ifStuck,
      stuck: true,
      sentences: ["Let's say it together."],
      outcome: ok(out({ stuck: true, tori_ko: ["같이 말해 보자."] })),
      child: stuckSaid(),
    });
    const line = LINES.together[1];
    expect(states).toEqual(["drop"]);
    expect(result.release).toEqual([line?.en]);
    expect(result.kept).toEqual([line?.en]);
    expect(result.ko).toBe(line?.ko);
    // 계획의 붙일 줄(답 소리)은 그대로다
    expect(result.attach).toEqual(ifStuck.attach);
  });

  it("상황 줄로 바뀐 문장의 뜻은 상황 줄 뜻이다(문장마다 뜻 — 다른 문장 뜻은 그대로)", () => {
    const args = args3(opening3());
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    const { result } = play({
      args,
      ifAnswered,
      ifStuck,
      stuck: true,
      sentences: ["That's okay!", "You are a basketball star!"],
      outcome: ok(
        out({ stuck: true, tori_ko: ["괜찮아!", "너는 농구 스타야!"] }),
      ),
      child: stuckSaid(),
    });
    expect(result.ko).toBe(`괜찮아! ${LINES.together[1]?.ko}`);
  });

  it("AC-15za (라) 받침 첫째 · 둘째 · 셋째의 붙일 줄은 상황 검사가 있어도 없어도 같고, 반응은 AI 글이다", () => {
    const base = args3(opening3());
    const first = teacherTurnPlansOf(base, {
      segment: "talk",
      targets: ["play"],
    }).ifStuck;
    const afterFirst: TalkLessonTurn[] = [
      ...opening3(),
      button(),
      teacher("That's okay!", {
        kind: "card_slot",
        why: "support",
        stage: 1,
        cause: "button",
        item: { kind: "required", no: 1 },
        words: ["play"],
        app: ["together", "answer_example"],
        sound: { answer: "Answer first 1." },
      }),
    ];
    const second = nextTeacherTurnOf(args3([...afterFirst, button()]));
    const afterSecond: TalkLessonTurn[] = [
      ...afterFirst,
      button(),
      teacher("Okay! Easy first 1?", {
        kind: "card_slot",
        why: "support",
        stage: 2,
        cause: "button",
        item: { kind: "required", no: 1 },
        words: ["play"],
        app: ["easy_question"],
      }),
    ];
    const third = nextTeacherTurnOf(args3([...afterSecond, button()]));
    const plans: [TeacherTurnPlan, TalkLessonTurn[]][] = [
      [first, opening3()],
      [second, afterFirst],
      [third, afterSecond],
    ];
    expect(plans.map(([p]) => situationPlaceOf(p))).toEqual([
      "together",
      "easy",
      "close",
    ]);
    for (const [plan, turns] of plans) {
      const args = args3(turns);
      const withLive = play({
        args,
        ifAnswered: plan,
        sentences: ["That's okay!"],
        outcome: ok(out()),
        child: button(),
      }).result;
      const without = play({
        args,
        ifAnswered: plan,
        sentences: ["That's okay!"],
        outcome: ok(out()),
        child: button(),
        live: null,
        over: { live: null },
      }).result;
      expect(withLive.attach).toEqual(without.attach);
      expect(withLive.attach).toEqual(plan.attach);
      expect(withLive.kept).toEqual(["That's okay!"]);
    }
  });

  it("AC-15za (마) 상황 차례에서 두 번 실패 · 거절이면 칭찬 대사 · 안전한 대사 대신 상황 줄이고, 인사 끝 뒤에는 카드 질문이 붙지 않는다", () => {
    const base = {
      low: true,
      koMeaning: true,
      safeLines: [
        { en: "Let's talk about something else.", ko: "다른 얘기 하자." },
      ],
      safeLine: "Let's talk about something else.",
      turnNo: 6,
    };
    const line = LINES.greeting_end[1];
    if (!line) throw new Error("상황 줄 견본");
    const failed = lessonOutcomeViewOf(
      { ok: false, reason: "server", refusals: 0 },
      { ...base, situation: line },
    );
    expect(failed).toEqual({
      kind: "line",
      line: { en: line.en, ko: line.ko },
    });
    const refused = lessonOutcomeViewOf(
      { ok: false, reason: "refusal", refusals: 2 },
      { ...base, situation: line },
    );
    expect(refused).toEqual(failed);
    // 상황 차례가 아니면 뜻 있는 안전한 대사(대본 회차 r1 판정 I-3 (나) — 칭찬 대사는 뜻 칸이 없다)
    expect(
      lessonOutcomeViewOf({ ok: false, reason: "server", refusals: 0 }, base),
    ).toEqual({
      kind: "line",
      line: { en: "Let's talk about something else.", ko: "다른 얘기 하자." },
    });
    // 4단계는 상황 줄이 있어도 'Oops' 쉼
    expect(
      lessonOutcomeViewOf(
        { ok: false, reason: "server", refusals: 0 },
        { ...base, low: false, situation: line },
      ).kind,
    ).toBe("break");

    const turns = greetingEndTurns();
    const args = { ...args3(turns), segment: "greeting" as const };
    const plan = nextTeacherTurnOf({
      ...args,
      turns: [...turns, said({ segment: "greeting_end" })],
    });
    expect(situationPlaceOf(plan)).toBe("greeting_end");
    const { result } = play({
      args,
      ifAnswered: plan,
      sentences: [],
      outcome: failed as LessonOutcomeView,
      child: said({ segment: "greeting_end" }),
    });
    expect(result.release).toEqual([line.en]);
    expect(result.attach.filter((l) => l.kind === "question")).toEqual([]);
    expect(result.text).toBe(line.en);
    expect(result.move.kind).toBe("ai");
  });

  it("AC-15zb (가) 인사 끝 차례의 물음표 문장은 지워지고 반응이 남지 않으면 인사 끝 상황 줄이 반응 자리에 온다", () => {
    const turns = greetingEndTurns();
    const args = { ...args3(turns), segment: "greeting" as const };
    const plan = nextTeacherTurnOf({
      ...args,
      turns: [...turns, said({ segment: "greeting_end" })],
    });
    const kept = play({
      args,
      ifAnswered: plan,
      sentences: ["Good!", "What do you like?"],
      outcome: ok(out()),
      child: said({ segment: "greeting_end" }),
    });
    expect(kept.states).toEqual(["send", "drop"]);
    expect(kept.result.kept).toEqual(["Good!"]);
    const onlyQuestion = play({
      args,
      ifAnswered: plan,
      sentences: ["What do you like?"],
      outcome: ok(out()),
      child: said({ segment: "greeting_end" }),
    });
    // 돌림 줄 'Great! Here we go!' 는 앞 선생님 행의 'Great!' 와 한 문장이 같아 건너뛴다(대본 회차 r2 판정 N-2 — 앞 차례 문장 되풀이 피하기)
    expect(onlyQuestion.result.kept).toEqual([LINES.greeting_end[2]?.en]);
  });

  it("말로 답한 AI 차례 · 4단계 계획은 상황 검사를 받지 않는다(범위 밖 반응도 그대로 — 질문 검사만)", () => {
    const args = args3(opening3());
    const { ifAnswered } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    const { states } = play({
      args,
      ifAnswered,
      sentences: ["Wow, a basketball star!"],
      outcome: ok(out()),
      child: said(),
    });
    expect(states).toEqual(["send"]);
    const plan4 = {
      ...ifAnswered,
      lowBand: undefined,
      cause: "button" as const,
      stage: 1,
    };
    const flow = createLessonSentenceFlow({
      low: false,
      ifAnswered: plan4,
      ifStuck: null,
      asked: new Map(),
      max: MID.sameQuestionMax,
      live: liveOf(opening3()),
    });
    expect(flow.accept("Wow, a basketball star!")).toBe("send");
  });
});

describe("AC-15zb (나) 1~3단계 둘째 인사 AI 질문이 걸리면 카드 둘째 인사 질문(서버 몫)", () => {
  it("AC-15zb (나) 둘째 인사 AI 질문이 검사에 걸린 턴은 카드 자리가 되어 카드 둘째 인사 질문이 붙는다(카드 기회 질문이 아님)", () => {
    const turns: TalkLessonTurn[] = [
      teacher("Hi! How are you today?", { kind: "first_question" }),
    ];
    const args = {
      ...args3(turns, CARD3_GREET2),
      segment: "greeting" as const,
    };
    const plan = nextTeacherTurnOf({
      ...args,
      turns: [...turns, said({ segment: "greeting" })],
    });
    expect(plan.greetingFallback?.en).toBe("Do you like Sunday?");
    const { result } = play({
      args,
      ifAnswered: plan,
      sentences: ["Good!", "Do you like zebrafish?"],
      outcome: ok(out()),
      child: said({ segment: "greeting" }),
    });
    expect(result.replaced).toBe("question_check");
    expect(result.move).toMatchObject({
      kind: "card_slot",
      why: "question_check",
    });
    expect(result.attach).toEqual([plan.greetingFallback]);
    expect(result.text).toBe("Good!\nDo you like Sunday?");
    expect(result.text).not.toContain("zebrafish");
  });

  it("AC-15zb (나) 걸리지 않은 둘째 인사 AI 질문은 그대로 나가고 카드 인사 질문은 붙지 않는다", () => {
    const turns: TalkLessonTurn[] = [
      teacher("Hi! How are you today?", { kind: "first_question" }),
    ];
    const args = {
      ...args3(turns, CARD3_GREET2),
      segment: "greeting" as const,
    };
    const plan = nextTeacherTurnOf({
      ...args,
      turns: [...turns, said({ segment: "greeting" })],
    });
    const { result } = play({
      args,
      ifAnswered: plan,
      sentences: ["Good!", "Do you like Sunday today?"],
      outcome: ok(out()),
      child: said({ segment: "greeting" }),
    });
    expect(result.replaced).toBeNull();
    expect(result.attach).toEqual([]);
    expect(result.kept).toEqual(["Good!", "Do you like Sunday today?"]);
  });
});

describe("AC-15ze (나) 장면 여는 질문의 힌트 · 뜻(서버 몫)", () => {
  function sceneTurns(): TalkLessonTurn[] {
    return [
      teacher("Hi! How are you today?", { kind: "first_question" }),
      said({ segment: "greeting" }),
      teacher("Great! Do you like Sunday?", { kind: "card_slot" }),
      said({ segment: "greeting_end" }),
      aiTurn("Me too! Let's talk!", {}),
      teacher(SCENE3.question.en, { kind: "first_question" }),
    ];
  }

  it("AC-15ze (나) 장면 여는 질문 자리의 '힌트' 단은 그 칸의 뜻 · 영어 틀 · 영어 문장이다", () => {
    const turns = sceneTurns();
    const slot = talkLessonPositionOf(args3(turns, CARD3_SCENE)).slot;
    expect(slot?.scene).toBe(true);
    const tiers = lessonHintsAt(
      {
        spec: {
          band: "1-3",
          hintTiers: ["ko", "frame", "sentence"],
          usablePhrases: 0,
        },
        card: {
          required: [],
          more: [],
          greeting: CARD3.greeting,
          sceneOpener: SCENE3,
        },
        turns,
        liveRows: [],
      },
      slot,
    );
    expect(tiers).toEqual([
      { kind: "ko", text: SCENE3.hintKo },
      { kind: "frame", text: SCENE3.frameEn },
      { kind: "sentence", text: SCENE3.hintEn, listen: true },
    ]);
  });

  it("AC-15ze (나) 같은 시도 id 다시 흘림에서 장면 여는 질문 · 그 쉬운 질문 줄의 뜻이 빠지지 않는다", () => {
    const row = (text: string) => ({ text, toriKo: null, move: null });
    expect(
      lessonReplayLinesOf(row(`Okay!\n${SCENE3.question.en}`), {
        card: CARD3_SCENE,
        koMeaning: true,
      }).at(-1),
    ).toEqual({
      t: "add",
      kind: "question",
      en: SCENE3.question.en,
      ko: SCENE3.question.ko,
    });
    expect(
      lessonReplayLinesOf(row(`Okay!\n${SCENE3.easyQuestion.en}`), {
        card: CARD3_SCENE,
        koMeaning: true,
      }).at(-1),
    ).toEqual({
      t: "add",
      kind: "question",
      en: SCENE3.easyQuestion.en,
      ko: SCENE3.easyQuestion.ko,
    });
  });

  it("답 글 검사의 질문 글은 그 질문 자리를 연 선생님 행부터 지금까지의 화면 글이다(받침 줄 포함)", () => {
    const turns: TalkLessonTurn[] = [
      ...opening3(),
      button(),
      teacher("That's okay!", {
        kind: "card_slot",
        why: "support",
        stage: 1,
        cause: "button",
        item: { kind: "required", no: 1 },
      }),
      button(),
      teacher("Okay!\nEasy first 1?", {
        kind: "card_slot",
        why: "support",
        stage: 2,
        cause: "button",
        item: { kind: "required", no: 1 },
      }),
    ];
    expect(slotQuestionTextOf(turns)).toBe(
      "What do you do on the weekend? That's okay! Okay!\nEasy first 1?",
    );
    expect(slotQuestionTextOf([])).toBe("");
  });
});

describe("인사 자리의 힌트와 답이 같은 질문을 가리킨다(검토 rev-1 5절 (5) · fix 2 N-1 짝)", () => {
  const SEED_GREETING = {
    questions: [
      {
        question: { en: "Hello, {NAME}! How are you?", ko: "안녕! 잘 지내?" },
        hintKo: "잘 지내.",
        hintEn: "I am fine.",
        frameEn: "I am ___.",
        answerExample: "I am fine.",
      },
    ],
  };
  const SPEC_HINTS = {
    band: "1-3" as const,
    hintTiers: ["ko" as const, "frame" as const, "sentence" as const],
    usablePhrases: 0,
  };
  const card = { ...CARD3, greetingTurns: 1, greeting: SEED_GREETING };

  it("시드 꼴 인사 질문(앞 문장 + 물음표 문장)에서 흐름의 답 소리와 서버 힌트가 같은 카드 인사 질문의 칸이다", () => {
    const turns: TalkLessonTurn[] = [
      teacher("Hello, Momo! How are you?", { kind: "first_question" }),
    ];
    const args = { ...args3(turns, card), segment: "greeting" as const };
    const slot = talkLessonPositionOf(args).slot;
    expect(slot?.question).toBe("How are you?");
    expect(slot?.answerExample).toBe("I am fine.");
    const tiers = lessonHintsAt(
      {
        spec: SPEC_HINTS,
        card: { required: [], more: [], greeting: SEED_GREETING },
        turns,
        liveRows: [],
      },
      slot,
    );
    expect(tiers).toEqual([
      { kind: "ko", text: "잘 지내." },
      { kind: "frame", text: "I am ___." },
      { kind: "sentence", text: "I am fine.", listen: true },
    ]);
    // 받침 첫째의 답 소리도 같은 답이다
    const plan = nextTeacherTurnOf({
      ...args,
      turns: [...turns, button({ segment: "greeting" })],
    });
    expect(plan.attach).toContainEqual({
      kind: "sound",
      role: "answer",
      en: "I am fine.",
    });
    expect(tiers.find((t) => t.kind === "sentence")?.text).toBe(
      slot?.answerExample,
    );
  });

  it("AI 가 카드와 다른 인사 질문을 물은 자리는 카드 인사 힌트를 쓰지 않고(빈 힌트) 답도 카드 답이 아니다", () => {
    const turns: TalkLessonTurn[] = [
      aiTurn("Hi! Do you like rice?", {}, "Yes, I do."),
    ];
    const args = { ...args3(turns, card), segment: "greeting" as const };
    const slot = talkLessonPositionOf(args).slot;
    // 답은 그 행의 AI 답 예시다(카드 인사 답이 아님 — 검토 1 I-1 을 가른다)
    expect(slot?.answerExample).toBe("Yes, I do.");
    const tiers = lessonHintsAt(
      {
        spec: SPEC_HINTS,
        card: { required: [], more: [], greeting: SEED_GREETING },
        turns,
        liveRows: [],
      },
      slot,
    );
    expect(tiers.map((t) => t.text)).not.toContain("잘 지내.");
  });
});

describe("4단계 불변", () => {
  it("4단계 계획에는 상황 자리가 없어 상황 검사 · 반응 자리 상황 줄이 생기지 않는다(재료를 넘겨도)", () => {
    const plan = {
      ...nextTeacherTurnOf(args3([...opening3(), noSpeech()])),
      lowBand: undefined,
    };
    expect(situationPlaceOf(plan)).toBeNull();
    const args = { ...args3(opening3()), spec: SPEC4, settings: MID };
    const lines = Object.values(LINES).flatMap((l) => l.map((x) => x.en));
    for (const sentences of [["Zebrafish!"], ["Let's say it together."]]) {
      const flow = createLessonSentenceFlow({
        low: false,
        ifAnswered: plan,
        ifStuck: null,
        asked: new Map(),
        max: MID.sameQuestionMax,
        live: liveOf(opening3()),
      });
      flow.stuck(false);
      const states = sentences.map((x) => flow.accept(x));
      expect(states).toEqual(["send"]);
      const result = settleLessonTurn({
        flow,
        outcome: ok(out()),
        ctx: settleCtx(args, [...opening3(), noSpeech()], {
          low: false,
          lineOptions: null,
        }),
      });
      expect(result.kept).toEqual(sentences);
      expect(
        [...result.kept, ...result.release].some((x) => lines.includes(x)),
      ).toBe(false);
    }
  });
});

// 회화 1~3단계 상황 차례('AI 몫 넓힘' 묶음 2 — spec 판 4 설계 1 · AC-15za (가)(나)(라)(마) · AC-15zb (나) 서버 몫 · AC-15ze (나) 서버 몫).
// 순수 몫(core/conversation/situation)과 서버 턴 길의 순수 함수(문장 문 · 끝 처리 · 실패 대신 줄 · 힌트 · 다시 흘림)를 본다. 목록은 시험 안
// 견본이다(시드 목록 내용은 묶음 3 이 고친다). DB · AI 를 부르는 길은 통합 시험(tests/integration/talk-ai-scope.test.ts, CI)이 본다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TalkLessonOutput } from "@/core/ai/calls/talk-lesson";
import {
  explanationEnglishWordsOf,
  explanationFitsTurnOf,
} from "@/core/conversation/explanation-fit";
import {
  type LessonArgs,
  nextTeacherTurnOf,
  type TeacherTurnPlan,
  talkLessonPositionOf,
  teacherTurnPlansOf,
} from "@/core/conversation/lesson-flow";
import type { TalkLessonTurn } from "@/core/conversation/lesson-turns";
import { TALK_SUPPORT_STAGE_TOGETHER } from "@/core/conversation/move";
import type { LowLevelLineOptions } from "@/core/conversation/question-check";
import {
  mergeQuestionRetry,
  type RetrySentence,
} from "@/core/conversation/question-retry";
import {
  allowedLemmaOfVocab,
  checkSituationSentence,
  heardFieldsBlankOf,
  isShortReaction,
  type SituationCheckContext,
  situationLineOf,
  situationPlaceOf,
  situationSplitOf,
  TALK_SITUATION_EXAMPLES,
} from "@/core/conversation/situation";
import type { TalkSituationLinesFile } from "@/core/seed/schema/reference";
import { lemmaLookup } from "@/core/session/attempt";
import {
  createLessonSentenceFlow,
  type LessonLiveChecks,
  type LessonOutcomeView,
  type LessonSettleContext,
  lessonAfterLinesOf,
  lessonExplanationFitOf,
  lessonHintsAt,
  lessonOffersNewQuestionOf,
  lessonOutcomeViewOf,
  lessonReplayLinesOf,
  settleLessonTurn,
  slotQuestionTextOf,
  withQuestionRetry,
} from "@/server/conversation/lesson-turn";
import {
  seedTalkAllowedWords,
  seedTalkCueLines,
  seedTalkSituationLines,
} from "@/server/seed-lists";
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
  // 되묻기 자리(C218 — 시드와 같은 다섯 줄. 이 자리의 상황 차례 검사 시험은 내용 고침 2 묶음 2-가 가 더한다)
  ask_again: [
    { en: "Sorry! Say it again, please.", ko: "미안! 한 번만 더 말해 줘." },
    { en: "Let me hear it again!", ko: "다시 한번 들려줘!" },
    { en: "Hmm, again, please!", ko: "음, 한 번 더 말해 줄래!" },
    { en: "Sorry! I will listen again.", ko: "미안! 다시 잘 들어 볼게." },
    {
      en: "Again, please! I am listening.",
      ko: "한 번 더 말해 줘! 듣고 있어.",
    },
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
    const { shown, result } = play({
      args,
      ifAnswered,
      ifStuck,
      stuck: true,
      sentences: ["That's okay!", "You are a basketball star!"],
      outcome: ok(out({ stuck: true })),
      child: stuckSaid(),
      live: liveOf(opening3(), { lines: { ...LINES, together } }),
    });
    // 받침 차례의 맞장구 아닌 상황 줄은 응답 끝에 나간다(13절 C249 (1) — AC-15zj (사))
    expect(shown).toEqual(["That's okay!"]);
    expect(result.release).toEqual(["We can do it together!"]);
    expect(result.kept).toEqual(["That's okay!", "We can do it together!"]);
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
    // 상황 줄 'We can do it together!' 는 맞장구가 아니라 잡아 두고 응답 끝에 보낸다(13절 C249 (1) — AC-15zj (사))
    expect(states).toEqual(["send", "hold", "drop"]);
    expect(shown).toEqual(["That's okay!"]);
    expect(result.release).toEqual([line?.en]);
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
      expect(without.kept).toEqual(["That's okay!"]);
      if (situationPlaceOf(plan) === "close") {
        // 받침 셋째는 답 소리로 닫혀 맞장구 뒤에 앱이 닫기 꼬리를 둔다(13절 C252 (2), 코드 검토 O-1 — 상황 줄 재료가 없으면 두지 않는다)
        const closeTails = (LINES.close ?? []).map(
          (l) => situationSplitOf(l).tail.en,
        );
        expect(withLive.kept).toHaveLength(2);
        expect(withLive.kept[0]).toBe("That's okay!");
        expect(closeTails).toContain(withLive.kept[1]);
      } else expect(withLive.kept).toEqual(["That's okay!"]);
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

// ── 13절 C249: 받침 차례의 넘김 말과 한국어 설명(AC-15zj (사)) ─────────────────
describe("AC-15zj (사) 받침 차례의 넘김 말(13절 C249 (1) · (2) · (3))", () => {
  /** 받침 둘째의 AI 쉬운 질문 자리 앞까지의 행(막힌 질문이 AI 질문 — 이 차례 아이 행은 button()). */
  const easyTurns = (): TalkLessonTurn[] => [
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
  ];
  const easyPlan = () => nextTeacherTurnOf(args3([...easyTurns(), button()]));
  const EASY = LINES.easy[1];
  const CLOSE = LINES.close[1];
  const KO = ["걱정 마!", "김밥을 먹어 아니면 마셔?"];
  // 시드 꼴 닫기 줄(맞장구 + 넘김 — 나눌 수 있다). 견본 LINES.close 의 'Nice try!' 는 넘김 낱말 try 가 들어 나눌 수 없다(줄 그대로 붙는다)
  const SPLIT_CLOSE = [
    { en: "That's okay! Let's go on.", ko: "괜찮아! 계속하자." },
    { en: "No problem! Here is the answer.", ko: "괜찮아! 답은 이거야." },
    { en: "It's okay! Now we go on.", ko: "괜찮아! 이제 계속하자." },
  ];
  const splitLive = {
    live: {
      situationLines: { ...LINES, close: SPLIT_CLOSE },
      turnNo: TURN_NO,
      cue: null,
    },
  };

  it("AC-15zj (사) 사례 1: 쉬운 질문 자리에서 'No worries!' 가 상황 줄로 바뀌면 맞장구 몫만 보내고 넘김 몫은 잡아 둔다", () => {
    const plan = easyPlan();
    expect(situationPlaceOf(plan)).toBe("easy");
    expect(plan).toMatchObject({ kind: "ai", aiAsks: true });
    const { states, shown, entries } = play({
      args: args3(easyTurns()),
      ifAnswered: plan,
      sentences: ["No worries!", "Do you like it?"],
      outcome: ok(out({ tori_ko: KO })),
      child: button(),
    });
    expect(EASY?.en).toBe("It's okay! Here is an easy one.");
    expect(states).toEqual(["send", "hold"]);
    expect(shown).toEqual(["It's okay!"]);
    expect(entries.map((e) => [e.en, e.state])).toEqual([
      ["It's okay!", "sent"],
      ["Here is an easy one.", "held"],
      ["Do you like it?", "held"],
    ]);
    expect(entries[0]).toMatchObject({ ai: "No worries!", ko: "괜찮아!" });
    expect(entries[1]).toMatchObject({
      app: true,
      moveOn: true,
      ko: "쉬운 거야.",
    });
  });

  it("AC-15zj (사) 사례 2: 질문이 끝 처리에서 빠지면 쉬운 것을 약속한 말이 글 · 뜻 · 읽기에 없고, 닫기 넘김이 답 소리 앞에 온다", () => {
    const plan = easyPlan();
    const { result } = play({
      args: args3(easyTurns()),
      ifAnswered: plan,
      sentences: ["No worries!", "Do you eat gimbap or drink gimbap?"],
      outcome: ok(out({ tori_ko: KO })),
      child: button(),
      over: splitLive,
    });
    expect(result.replaced).toBe("question_check");
    // 이 턴에 남은 'It's okay!' 와 같은 문장이 든 줄은 건너뛰어 둘째 줄의 넘김 꼬리다
    const tail = "Here is the answer.";
    expect(result.release).toEqual([tail]);
    expect(result.kept).toEqual(["It's okay!", tail]);
    expect(result.text).not.toContain("easy");
    expect(result.ko).toBe("괜찮아! 답은 이거야.");
    expect(result.ko).not.toContain("쉬운");
    // 나눌 수 없는 닫기 줄(견본 'Nice try! Let's keep going.')은 줄 그대로 붙는다
    const whole = play({
      args: args3(easyTurns()),
      ifAnswered: plan,
      sentences: ["No worries!", "Do you eat gimbap or drink gimbap?"],
      outcome: ok(out({ tori_ko: KO })),
      child: button(),
    }).result;
    expect(whole.release).toEqual([CLOSE?.en]);
    // 붙일 줄: 답 소리 → 다음 카드 질문(정본 02-2 223줄 — 닫는 길은 그대로)
    expect(
      result.attach.map((l) => [l.kind, "role" in l ? l.role : ""]),
    ).toEqual([
      ["sound", "answer"],
      ["question", "card"],
    ]);
    const lines = lessonAfterLinesOf(result);
    expect(lines[0]).toMatchObject({ t: "ko" });
    expect(lines[1]).toMatchObject({ t: "sound", kind: "answer" });
  });

  it("AC-15zj (사) 사례 2-2: 반응이 하나도 남지 않으면 반응 자리 상황 줄을 닫기 자리의 것으로 고른다", () => {
    const plan = easyPlan();
    const { result } = play({
      args: args3(easyTurns()),
      ifAnswered: plan,
      sentences: ["Do you eat gimbap or drink gimbap?"],
      outcome: ok(out({ tori_ko: ["김밥을 먹어 아니면 마셔?"] })),
      child: button(),
    });
    expect(result.replaced).toBe("question_check");
    expect(result.release).toEqual([CLOSE?.en]);
    expect(result.ko).toBe(CLOSE?.ko);
  });

  it("AC-15zj (사) 사례 3: 질문이 지나면 잡아 둔 넘김 말이 그 질문 바로 앞에 나간다", () => {
    const plan = easyPlan();
    const { result } = play({
      args: args3(easyTurns()),
      ifAnswered: plan,
      sentences: ["No worries!", "Do you like it?"],
      outcome: ok(out({ tori_ko: ["걱정 마!", "그거 좋아해?"] })),
      child: button(),
    });
    expect(result.replaced).toBeNull();
    expect(result.release).toEqual(["Here is an easy one.", "Do you like it?"]);
    expect(result.kept).toEqual([
      "It's okay!",
      "Here is an easy one.",
      "Do you like it?",
    ]);
    expect(result.ko).toBe("괜찮아! 쉬운 거야. 그거 좋아해?");
  });

  it("AC-15zj (사) 사례 3-2: 다시 쓴 질문이 지나면 첫 응답의 넘김 말이 다시 쓴 질문 바로 앞에 오고, 다시 쓴 질문도 걸리면 닫기 넘김이다", async () => {
    const args = args3(easyTurns());
    const plan = easyPlan();
    const flowOf = (sentences: string[]) => {
      const flow = createLessonSentenceFlow({
        low: true,
        ifAnswered: plan,
        ifStuck: null,
        asked: talkLessonPositionOf(args).askedQuestions,
        max: args.settings.sameQuestionMax,
        live: liveOf(args.turns),
      });
      flow.stuck(false);
      for (const s of sentences) flow.accept(s);
      return flow;
    };
    const run = async (again: string) => {
      const first = out({
        tori_en: "No worries! Do you eat gimbap or drink gimbap?",
        tori_ko: KO,
      });
      const retried = await withQuestionRetry({
        flow: flowOf(["No worries!", "Do you eat gimbap or drink gimbap?"]),
        view: ok(first),
        lineOptions: OPTIONS,
        sentenceMaxWords: 8,
        retry: async () => ({
          value: out({ tori_en: again, tori_ko: ["질문"] }),
          entries: flowOf([again]).entries(),
          hintsBlocked: false,
          overLength: 0,
          blocked: 0,
        }),
      });
      expect(retried.retried).toBe(true);
      return settleLessonTurn({
        flow: retried.flow,
        outcome: retried.view,
        ctx: settleCtx(args, [...args.turns, button()], splitLive),
      });
    };
    const passed = await run("Do you like it?");
    expect(passed.replaced).toBeNull();
    expect(passed.release).toEqual(["Here is an easy one.", "Do you like it?"]);
    expect(passed.ko).toBe("괜찮아! 쉬운 거야. 질문");
    const failed = await run("Do you drink gimbap?");
    expect(failed.replaced).toBe("question_check");
    expect(failed.release).toEqual(["Here is the answer."]);
    expect(failed.text).not.toContain("easy");
  });

  it("AC-15zj (사) 사례 4: 같이 말하기 차례에 넘김 말과 질문을 쓰면 둘 다 빠지고 신호 말 · 답 소리는 그대로다", () => {
    const args = args3(opening3());
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    expect(situationPlaceOf(ifStuck)).toBe("together");
    const cue = { file: seedTalkCueLines(), band: "2-3" as const };
    const at = (sentences: string[], live: LessonLiveChecks | null) =>
      play({
        args,
        ifAnswered,
        ifStuck,
        stuck: true,
        sentences,
        outcome: ok(out({ stuck: true })),
        child: stuckSaid(),
        live,
        over: { live: { situationLines: LINES, turnNo: TURN_NO, cue } },
      }).result;
    const base = at(["That's okay!"], null);
    for (const live of [null, liveOf(args.turns)]) {
      const result = at(
        [
          "That's okay!",
          "Let's try an easy one.",
          "Do you drink juice with gimbap?",
        ],
        live,
      );
      expect(result.kept).toEqual(["That's okay!"]);
      expect(result.release).toEqual([]);
      expect(result.text.split("\n")[0]).toBe("That's okay!");
      expect(result.cue).toEqual(base.cue);
      expect(result.cue).not.toBeNull();
      expect(result.attach).toEqual(ifStuck.attach);
      expect(result.attach.some((l) => l.kind === "sound")).toBe(true);
    }
  });

  it("AC-15zj (사) 사례 5: 같이 말하기 차례에 질문 없는 'We can try it together.' 는 잡아 두었다가 응답 끝에 그대로 나간다", () => {
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
      sentences: ["That's okay!", "We can try it together."],
      outcome: ok(out({ stuck: true })),
      child: stuckSaid(),
      live: null,
      over: { live: null },
    });
    expect(states).toEqual(["send", "hold"]);
    expect(result.release).toEqual(["We can try it together."]);
    expect(result.kept).toEqual(["That's okay!", "We can try it together."]);
  });

  it("AC-15zj (사) 사례 6: 쉬운 질문 자리에서 회화 턴이 두 번 실패한 차례(대신 줄)가 답 소리로 닫히면 그 줄 대신 닫기 자리 상황 줄 통째와 그 뜻이고 닫기 꼬리는 없다", () => {
    const plan = easyPlan();
    const failLine = {
      en: "No problem! Here is an easy one.",
      ko: "괜찮아! 쉬운 거야.",
    };
    const { result } = play({
      args: args3(easyTurns()),
      ifAnswered: plan,
      sentences: [],
      outcome: { kind: "line", line: failLine },
      child: button(),
      over: splitLive,
    });
    expect(result.replaced).toBe("fail");
    expect(result.attach[0]).toMatchObject({ kind: "sound", role: "answer" });
    // 돌림 차례(턴 번호 7 → 둘째 줄)의 닫기 줄 통째다
    const whole = SPLIT_CLOSE[1];
    expect(result.release).toEqual([whole?.en]);
    expect(result.kept).toEqual([whole?.en]);
    expect(result.ko).toBe(whole?.ko);
    expect(result.text).not.toContain("easy");
    expect(result.ko).not.toContain("쉬운");
    const lines = lessonAfterLinesOf(result);
    expect(lines[0]).toMatchObject({ t: "ko", ko: whole?.ko });
    // 답 소리로 닫히지 않는 대신 줄 길(같이 말하기 자리)은 그 줄 그대로다(부모 커밋과 같음)
    const args = args3(opening3());
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    const together = { en: "Let's say it together!", ko: "같이 말해 보자!" };
    const kept = play({
      args,
      ifAnswered,
      ifStuck,
      stuck: true,
      sentences: [],
      outcome: { kind: "line", line: together },
      child: stuckSaid(),
      over: splitLive,
    }).result;
    expect(kept.release).toEqual([together.en]);
    expect(kept.ko).toBe(together.ko);
  });

  it("AC-15zj (사) 사례 7: 넘김 말을 잡아 둔 뒤의 맞장구도 잡아 두어 화면 차례 · 저장 글 · 뜻의 차례가 같다", () => {
    const args = args3(opening3());
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    const sentences = [
      "That's okay!",
      "We can try it together.",
      "You can do it!",
    ];
    const { states, shown, result } = play({
      args,
      ifAnswered,
      ifStuck,
      stuck: true,
      sentences,
      outcome: ok(
        out({
          stuck: true,
          tori_ko: ["괜찮아!", "같이 해 볼 수 있어.", "넌 할 수 있어!"],
        }),
      ),
      child: stuckSaid(),
      live: null,
      over: { live: null },
    });
    // 첫 맞장구는 바로 나가고, 넘김 말 뒤의 맞장구는 넘김 말과 함께 응답 끝에 나간다
    expect(states).toEqual(["send", "hold", "hold"]);
    const screen = [...shown, ...result.release];
    expect(screen).toEqual(sentences);
    expect(result.kept).toEqual(sentences);
    expect(result.ko).toBe("괜찮아! 같이 해 볼 수 있어. 넌 할 수 있어!");
  });

  it("AC-15zj (사) 사례 8: 쉬운 질문 자리에서 넘김 말 둘 뒤의 질문이 걸리면 넘김 말 둘이 모두 빠지고 닫기 넘김 → 답 소리다(재검토 N-1 (가))", () => {
    const plan = easyPlan();
    const { states, entries, result } = play({
      args: args3(easyTurns()),
      ifAnswered: plan,
      sentences: [
        "No worries!",
        "Let's try an easy one.",
        "Here is a new question.",
        "Do you eat gimbap or drink gimbap?",
      ],
      outcome: ok(
        out({
          tori_ko: [
            "걱정 마!",
            "쉬운 거 해 보자.",
            "새 질문이야.",
            "김밥을 먹어 아니면 마셔?",
          ],
        }),
      ),
      child: button(),
      live: null,
      over: splitLive,
    });
    expect(states).toEqual(["send", "hold", "hold", "hold"]);
    // 둘째 넘김 말도 표지를 받는다(첫째를 잡아 둔 뒤라도)
    expect(entries.slice(1, 3)).toMatchObject([
      { state: "held", moveOn: true },
      { state: "held", moveOn: true },
    ]);
    expect(result.replaced).toBe("question_check");
    expect(result.kept).toEqual(["No worries!", "Here is the answer."]);
    expect(result.release).toEqual(["Here is the answer."]);
    expect(result.text).not.toMatch(/easy|new question/i);
    expect(result.ko).not.toMatch(/쉬운|새 질문/);
    expect(result.attach[0]).toMatchObject({ kind: "sound", role: "answer" });
  });

  it("AC-15zj (사) 사례 9: 같이 말하기 차례에서 넘김 말 둘 뒤의 질문이 지워지면 넘김 말 둘이 모두 빠진다(재검토 N-1 (나))", () => {
    const args = args3(opening3());
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    const { states, entries, result } = play({
      args,
      ifAnswered,
      ifStuck,
      stuck: true,
      sentences: [
        "That's okay!",
        "Let's try an easy one.",
        "Here is a new question.",
        "Do you drink juice?",
      ],
      outcome: ok(out({ stuck: true })),
      child: stuckSaid(),
      live: null,
      over: { live: null },
    });
    expect(states[0]).toBe("send");
    expect(entries.slice(1, 3)).toMatchObject([
      { state: "held", moveOn: true },
      { state: "held", moveOn: true },
    ]);
    expect(result.kept).toEqual(["That's okay!"]);
    expect(result.release).toEqual([]);
    expect(result.attach).toEqual(ifStuck.attach);
  });

  it("AC-15zj (사) 사례 10: 넘김 말을 잡아 둔 뒤 실시간 상황 검사가 문장을 상황 줄의 넘김 몫으로 바꾸어도 표지를 받아, 질문이 걸리면 함께 빠진다(재검토 N-1 '왜')", () => {
    const plan = easyPlan();
    const { entries, result } = play({
      args: args3(easyTurns()),
      ifAnswered: plan,
      sentences: [
        "That's okay!",
        "Let's go on.",
        "Here is a spaceship riddle.",
        "Do you eat gimbap or drink gimbap?",
      ],
      outcome: ok(
        out({
          tori_ko: [
            "괜찮아!",
            "계속하자.",
            "우주선 수수께끼야.",
            "김밥을 먹어 아니면 마셔?",
          ],
        }),
      ),
      child: button(),
      over: splitLive,
    });
    // 셋째 문장은 상황 검사에 걸려 상황 줄의 넘김 몫으로 바뀌었다(이 턴에 맞장구가 남아 넘김 몫만)
    expect(entries[2]).toMatchObject({
      ai: "Here is a spaceship riddle.",
      en: "Here is an easy one.",
      state: "held",
      moveOn: true,
    });
    expect(result.replaced).toBe("question_check");
    expect(result.text).not.toMatch(/easy/i);
    expect(result.ko).not.toContain("쉬운");
    expect(result.kept[0]).toBe("That's okay!");
    expect(result.attach[0]).toMatchObject({ kind: "sound", role: "answer" });
  });

  it("AC-15zj (사) 사례 11: 같이 말하기 차례에서 첫 문장이 나누지 않는 상황 줄(맞장구 + 맞장구 꼴 꼬리)로 바뀌면 통째로 바로 나가고, 질문이 지워져도 남는다(재검토 3 의 관찰)", () => {
    const args = args3(opening3());
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    // 시드 꼴 같이 말하기 줄: 꼬리도 맞장구 꼴이라 나누지 않는다
    const SEED_TOGETHER = [
      { en: "It's okay! I am with you.", ko: "괜찮아! 같이 있어." },
      { en: "No problem! I can help.", ko: "괜찮아! 도와줄게." },
      { en: "Okay! We can do this.", ko: "좋아! 할 수 있어." },
    ];
    const lines = { ...LINES, together: SEED_TOGETHER };
    const { states, shown, entries, result } = play({
      args,
      ifAnswered,
      ifStuck,
      stuck: true,
      sentences: ["You are a spaceship star!", "Do you drink juice?"],
      outcome: ok(out({ stuck: true })),
      child: stuckSaid(),
      live: liveOf(args.turns, { lines }),
      over: { live: { situationLines: lines, turnNo: TURN_NO, cue: null } },
    });
    expect(situationPlaceOf(ifStuck)).toBe("together");
    const line = entries[0];
    expect(SEED_TOGETHER.map((l) => l.en)).toContain(line?.en);
    // 줄 전체가 맞장구 몫이다: 넘김 표지 없이 바로 나간다(응답 끝까지 잡아 두지 않는다)
    expect(line).toMatchObject({
      ai: "You are a spaceship star!",
      state: "sent",
    });
    expect(line?.moveOn).toBeUndefined();
    expect(states[0]).toBe("send");
    expect(shown).toEqual([line?.en]);
    // 같이 말하기 차례의 질문은 지워지고, 바로 나간 줄은 남는다(반응 자리 줄을 다시 붙이지 않는다)
    expect(result.kept).toEqual([line?.en]);
    expect(result.release).toEqual([]);
    expect(result.attach).toEqual(ifStuck.attach);
  });

  it("AC-15zj (사) 인사 토막의 쉬운 질문 자리도 같다: 질문이 빠지면 약속한 말 없이 닫기 넘김 → 인사 답 소리다", () => {
    const turns: TalkLessonTurn[] = [
      teacher(
        "Hi! How are you today?",
        { kind: "first_question" },
        "I am fine.",
      ),
      button({ segment: "greeting" }),
      teacher("That's okay!", {
        kind: "card_slot",
        why: "support",
        stage: TALK_SUPPORT_STAGE_TOGETHER,
        cause: "button",
      }),
    ];
    const args = { ...args3(turns), segment: "greeting" as const };
    const plan = nextTeacherTurnOf({
      ...args,
      turns: [...turns, button({ segment: "greeting" })],
    });
    expect(plan).toMatchObject({ kind: "ai", aiAsks: true, stage: 2 });
    expect(situationPlaceOf(plan)).toBe("easy");
    const { states, result } = play({
      args,
      ifAnswered: plan,
      sentences: ["No worries!", "Do you eat gimbap or drink gimbap?"],
      outcome: ok(out({ tori_ko: KO })),
      child: button({ segment: "greeting" }),
      over: splitLive,
    });
    expect(states).toEqual(["send", "hold"]);
    expect(result.replaced).toBe("question_check");
    expect(result.release).toEqual(["Here is the answer."]);
    expect(result.kept).toEqual(["It's okay!", "Here is the answer."]);
    expect(result.text).not.toContain("easy");
    expect(result.attach[0]).toMatchObject({
      kind: "sound",
      role: "answer",
      en: plan.answerFallback,
    });
  });

  it("AC-15zj (사) 4단계부터의 받침 차례는 넘김 말을 잡아 두지 않는다(1~3단계 조건)", () => {
    const plan = easyPlan();
    for (const stage of [1, 2, 3]) {
      const flow = createLessonSentenceFlow({
        low: false,
        ifAnswered: { ...plan, lowBand: undefined, stage },
        ifStuck: null,
        asked: new Map(),
        max: MID.sameQuestionMax,
        live: null,
      });
      expect(flow.accept("That's okay!")).toBe("send");
      expect(flow.accept("Here is an easy one.")).toBe("send");
      expect(flow.entries().some((e) => e.moveOn)).toBe(false);
    }
  });
});

describe("AC-15zj (사) 합치기가 질문 앞의 잡아 둔 문장을 지킨다(13절 C249)", () => {
  const v = (over: Partial<TalkLessonOutput>) => out(over);
  it("AC-15zj (사) 첫 응답 [보낸 맞장구, 잡아 둔 넘김 말, 잡아 둔 질문] + 다시 쓴 [질문] → [맞장구, 넘김 말, 다시 쓴 질문], 뜻 자리도 맞는다", () => {
    const firstEntries = [
      { en: "It's okay!", question: false, cue: false, state: "sent" as const },
      {
        en: "Here is an easy one.",
        question: false,
        cue: false,
        state: "held" as const,
        app: true,
      },
      {
        en: "Do you eat gimbap?",
        question: true,
        cue: false,
        state: "held" as const,
      },
      {
        en: "Yum!",
        question: false,
        cue: false,
        state: "dropped" as const,
        reason: "cue",
      },
    ];
    const merged = mergeQuestionRetry<TalkLessonOutput, RetrySentence>({
      first: v({ tori_ko: ["괜찮아!", "김밥 먹어?", "냠!"] }),
      firstEntries,
      retry: v({ tori_ko: ["오!", "그거 좋아해?"] }),
      retryEntries: [
        { en: "Oh!", question: false, cue: false, state: "sent" },
        { en: "Do you like it?", question: true, cue: false, state: "held" },
      ],
    });
    expect(merged?.entries.map((e) => [e.en, e.state])).toEqual([
      ["It's okay!", "sent"],
      ["Here is an easy one.", "held"],
      ["Do you like it?", "held"],
    ]);
    // 뜻은 AI 문장 자리마다(앱 문장은 자리가 없다)
    expect(merged?.value.tori_ko).toEqual(["괜찮아!", "그거 좋아해?"]);
  });

  it("AC-15zj (사) 막힘을 무른 턴의 통째 다시 쓰기(whole)는 그대로다 — 앞 응답의 지운 문장만 남고 다시 쓴 응답의 반응부터 잇는다", () => {
    const merged = mergeQuestionRetry<TalkLessonOutput, RetrySentence>({
      first: v({ tori_ko: ["같이 말해 보자.", "신호"] }),
      firstEntries: [
        {
          en: "Let's say it together.",
          question: false,
          cue: false,
          state: "held",
        },
        {
          en: "Listen and say it!",
          question: false,
          cue: true,
          state: "dropped",
          reason: "cue",
        },
      ],
      retry: v({ tori_ko: ["멋지다!", "또 뭐 해?"] }),
      retryEntries: [
        { en: "Cool!", question: false, cue: false, state: "sent" },
        { en: "What else?", question: true, cue: false, state: "held" },
      ],
      whole: true,
    });
    expect(merged?.entries.map((e) => [e.en, e.state])).toEqual([
      ["Listen and say it!", "dropped"],
      ["Cool!", "held"],
      ["What else?", "held"],
    ]);
    expect(merged?.value.tori_ko).toEqual(["신호", "멋지다!", "또 뭐 해?"]);
  });
});

describe("AC-15zj (사) 한국어 설명 대조(13절 C249 (4))", () => {
  const lemmaOf = (w: string) =>
    w.toLowerCase() === "eats" ? "eat" : undefined;
  const fits = (explanation: string, seen: string[]) =>
    explanationFitsTurnOf({ explanation, seen, teacherName: "Mina", lemmaOf });
  it("AC-15zj (사) 막힌 질문은 곳을 묻는데 eat 를 풀이한 설명은 맞지 않는다", () => {
    expect(
      fits("'eat'은 '먹다'라는 뜻이에요.", [
        "It's okay! Let's go on.",
        "Where do you play?",
        "At the lake.",
      ]),
    ).toBe(false);
  });
  it("AC-15zj (사) 답 소리 · 막힌 질문에 있는 낱말, 대문자 · 활용형, 영어 낱말이 없는 설명, 이름 자리는 보인다", () => {
    expect(fits("'eat'은 '먹다'예요.", ["I eat rice."])).toBe(true);
    expect(fits("'where'는 '어디'예요.", ["Where do you play?"])).toBe(true);
    expect(fits("'Where'는 '어디'예요.", ["where do you play?"])).toBe(true);
    expect(fits("'eats'는 '먹어요'예요.", ["Do you eat rice?"])).toBe(true);
    expect(fits("'eat'은 '먹다'예요.", ["Mina eats rice."])).toBe(true);
    expect(fits("어디서 노는지 묻는 말이에요.", ["Where?"])).toBe(true);
    expect(fits("{NAME}, Mina 가 'play'를 물었어요.", ["Do you play?"])).toBe(
      true,
    );
    expect(explanationEnglishWordsOf("{NAME}! Mina's 'eat'", "Mina")).toEqual([
      "eat",
    ]);
  });
  it("AC-15zj (사) 굽은 따옴표(’) 축약형도 한 낱말로 읽는다 — 설명 · 그 차례 글 어느 쪽이 굽은 따옴표여도 같다", () => {
    expect(
      explanationEnglishWordsOf("‘I’m’은 ‘나는 ~이야’예요.", "Mina"),
    ).toEqual(["i'm"]);
    expect(fits("‘I’m’은 ‘나는 ~이야’예요.", ["I'm fine."])).toBe(true);
    expect(fits("'I'm'은 '나는 ~이야'예요.", ["I’m fine."])).toBe(true);
    expect(explanationEnglishWordsOf("Mina’s 'eat'", "Mina")).toEqual(["eat"]);
    // 견주기는 그대로다: 그 차례에 없는 축약형은 맞지 않는다
    expect(fits("‘I’m’은 ‘나는 ~이야’예요.", ["You're fine."])).toBe(false);
  });
  it("AC-15zj (사) 서버 끝: 맞지 않는 설명은 보이지도 저장하지도 않고(null), 4단계부터는 그대로다", () => {
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
      sentences: ["That's okay!"],
      outcome: ok(out({ stuck: true })),
      child: stuckSaid(),
    });
    const wrong = "'lake'는 '호수'예요.";
    const at = (explanation: string, low: boolean) =>
      lessonExplanationFitOf({
        explanation,
        result,
        low,
        teacherName: "Mina",
        lemmaOf,
      });
    expect(at(wrong, true)).toBeNull();
    expect(at(wrong, false)).toBe(wrong);
    // 막힌 질문 'What do you do on the weekend?' 의 낱말은 보인다
    expect(result.plan.stuckQuestion).toContain("weekend");
    expect(at("'weekend'는 '주말'이에요.", true)).toBe(
      "'weekend'는 '주말'이에요.",
    );
    // 붙인 답 소리의 낱말도 보인다
    const sound = result.attach.find((l) => l.kind === "sound");
    const word = sound && "en" in sound ? sound.en.split(" ")[0] : "";
    // 견본에 답 소리가 실제로 있어야 아래 단언이 무언가를 본다(빈 글이면 영어 낱말이 없어 늘 보인다 — 코드 검토 M-5)
    expect(sound).toBeDefined();
    expect(word).not.toBe("");
    expect(at(`'${word}'`, true)).toBe(`'${word}'`);
    expect(
      lessonExplanationFitOf({
        ...{
          explanation: null,
          result,
          low: true,
          teacherName: "Mina",
          lemmaOf,
        },
      }),
    ).toBeNull();
  });
});

describe("AC-15zj (자) 새 질문에 지난 질문의 설명을 붙이지 않는다 · 닫는 말은 답을 들려준다는 안내(13절 C252)", () => {
  const lemmaOf = (w: string) =>
    w.toLowerCase() === "eats" ? "eat" : undefined;
  /** 받침 둘째의 AI 쉬운 질문 자리 앞까지의 행(막힌 질문은 AI 질문 'What is fun?'). */
  const easyTurns = (): TalkLessonTurn[] => [
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
  ];
  /** 카드 필수 질문 1 에서 받침 첫째를 지난 행(받침 둘째는 카드 쉬운 질문이 붙는다 — AC-15za (라) 시험과 같은 꼴). */
  const afterFirst = (): TalkLessonTurn[] => [
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
  const afterSecond = (): TalkLessonTurn[] => [
    ...afterFirst(),
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
  const SEED = seedTalkSituationLines();
  const seedLive = (turns: readonly TalkLessonTurn[]) =>
    liveOf(turns, { lines: SEED.lines });
  const seedSettle = {
    live: { situationLines: SEED.lines, turnNo: TURN_NO, cue: null },
  };
  const seedCloseTails = SEED.lines.close.map(
    (line) => situationSplitOf(line).tail,
  );
  const shownOf = (
    explanation: string,
    result: Parameters<typeof lessonExplanationFitOf>[0]["result"],
    low = true,
  ) =>
    lessonExplanationFitOf({
      explanation,
      result,
      low,
      teacherName: "Mina",
      lemmaOf,
    });
  /** 판정이 뜻 줄 · 화면 글 · 붙인 줄을 건드리지 않는다(숨긴 차례에서도 그 차례의 글은 그대로다). */
  const keepsTurn = (
    result: Parameters<typeof lessonExplanationFitOf>[0]["result"] & {
      ko: string | null;
    },
    explanation: string,
  ) => {
    const before = structuredClone({
      text: result.text,
      ko: result.ko,
      attach: result.attach,
    });
    shownOf(explanation, result);
    expect({ text: result.text, ko: result.ko, attach: result.attach }).toEqual(
      before,
    );
  };

  it("AC-15zj (자) 같이 말하기 차례(질문 없음 · 답 소리와 신호 말)의 설명은 보이고, C249 (4)의 대조는 그대로 걸린다", () => {
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
      sentences: ["That's okay!"],
      outcome: ok(out({ stuck: true })),
      child: stuckSaid(),
      over: {
        live: {
          situationLines: LINES,
          turnNo: TURN_NO,
          cue: { file: seedTalkCueLines(), band: "2-3" },
        },
      },
    });
    expect(result.attach.some((l) => l.kind === "sound")).toBe(true);
    expect(result.attach.some((l) => l.kind === "question")).toBe(false);
    expect(lessonOffersNewQuestionOf(result)).toBe(false);
    const good = "'weekend'는 '주말'이에요.";
    expect(shownOf(good, result)).toBe(good);
    expect(shownOf("'lake'는 '호수'예요.", result)).toBeNull();
  });

  it("AC-15zj (자) 받침 둘째에서 선생님이 쓴 쉬운 질문이 나간 차례는 막힌 질문의 설명을 숨기고 뜻 줄 · 화면 글은 그대로다", () => {
    const plan = nextTeacherTurnOf(args3([...easyTurns(), button()]));
    const { result } = play({
      args: args3(easyTurns()),
      ifAnswered: plan,
      sentences: ["No worries!", "Do you like it?"],
      outcome: ok(out({ tori_ko: ["걱정 마!", "그거 좋아해?"] })),
      child: button(),
    });
    expect(result.replaced).toBeNull();
    expect(result.plan.stuckQuestion).toContain("What is fun?");
    expect(result.text).toBe("It's okay! Here is an easy one. Do you like it?");
    expect(result.ko).toBe("괜찮아! 쉬운 거야. 그거 좋아해?");
    expect(lessonOffersNewQuestionOf(result)).toBe(true);
    // 막힌 질문의 낱말(fun)을 풀이해 대조는 지나는 설명이어도 숨긴다
    const explain =
      "'fun'은 '재미있다'라는 뜻이야. 뭐가 재미있는지 물어본 거야.";
    expect(shownOf(explain, result)).toBeNull();
    keepsTurn(result, explain);
    // 4단계부터는 지금 그대로다(그 단계의 설명은 새로 쓰는 질문의 낱말을 풀이한다)
    expect(shownOf(explain, result, false)).toBe(explain);
  });

  it("AC-15zj (자) 말로 막힌 받침 둘째(쉬운 질문이 나감)도 숨긴다", () => {
    const args = args3(easyTurns());
    const { ifAnswered, ifStuck } = teacherTurnPlansOf(args, {
      segment: "talk",
      targets: ["play"],
    });
    expect(ifStuck).toMatchObject({ kind: "ai", aiAsks: true, stage: 2 });
    const { result } = play({
      args,
      ifAnswered,
      ifStuck,
      stuck: true,
      sentences: ["No worries!", "Do you like it?"],
      outcome: ok(out({ stuck: true, tori_ko: ["걱정 마!", "그거 좋아해?"] })),
      child: stuckSaid(),
    });
    expect(result.plan.cause).toBe("stuck");
    expect(result.text.split("\n").at(-1)).toContain("Do you like it?");
    expect(lessonOffersNewQuestionOf(result)).toBe(true);
    expect(shownOf("'fun'은 '재미있다'예요.", result)).toBeNull();
  });

  it("AC-15zj (자) 받침 둘째에 카드의 쉬운 질문이 붙은 차례는 숨긴다", () => {
    const plan = nextTeacherTurnOf(args3([...afterFirst(), button()]));
    const { result } = play({
      args: args3(afterFirst()),
      ifAnswered: plan,
      sentences: ["That's okay!"],
      outcome: ok(out({ tori_ko: ["괜찮아!"] })),
      child: button(),
    });
    const easy = result.attach.find(
      (l) => l.kind === "question" && l.role === "easy",
    );
    expect(easy).toBeDefined();
    expect(result.text.split("\n").at(-1)).toBe(
      easy && "en" in easy ? easy.en : "",
    );
    expect(result.text).toBe("That's okay!\nEasy first 1?");
    expect(result.ko).toBe("괜찮아!");
    expect(lessonOffersNewQuestionOf(result)).toBe(true);
    const explain = "'weekend'는 '주말'이에요.";
    expect(shownOf(explain, result)).toBeNull();
    keepsTurn(result, explain);
  });

  it("AC-15zj (자) 쉬운 질문이 걸려 답 소리로 닫히고 다음 카드 질문이 붙은 차례는 숨기고, 차례는 닫는 말(시드 꼬리) → 답 소리 → 다음 질문이다", () => {
    const turns = easyTurns();
    const plan = nextTeacherTurnOf(args3([...turns, button()]));
    const { result } = play({
      args: args3(turns),
      ifAnswered: plan,
      sentences: ["No worries!", "Do you eat gimbap or drink gimbap?"],
      outcome: ok(out({ tori_ko: ["걱정 마!", "김밥을 먹어 아니면 마셔?"] })),
      child: button(),
      live: seedLive(turns),
      over: seedSettle,
    });
    expect(result.replaced).toBe("question_check");
    const tail = seedCloseTails.find((t) => t.en === result.kept.at(-1));
    expect(tail).toBeDefined();
    expect(tail?.ko).toContain("답");
    expect(result.ko?.endsWith(tail?.ko ?? "?")).toBe(true);
    expect(result.text).toBe(
      "No problem! Let me say the answer.\nWhat sport is fun?",
    );
    expect(result.ko).toBe("괜찮아! 내가 답을 들려줄게.");
    expect(
      result.attach.map((l) => [l.kind, "role" in l ? l.role : ""]),
    ).toEqual([
      ["sound", "answer"],
      ["question", "card"],
    ]);
    expect(lessonOffersNewQuestionOf(result)).toBe(true);
    const explain = "'fun'은 '재미있다'예요.";
    expect(shownOf(explain, result)).toBeNull();
    keepsTurn(result, explain);
  });

  it("AC-15zj (자) 받침 셋째에서 답 소리 뒤 다음 질문이 붙은 차례는 숨기고, 차례는 닫는 말(시드 꼬리) → 답 소리 → 다음 질문이다", () => {
    const turns = afterSecond();
    const plan = nextTeacherTurnOf(args3([...turns, button()]));
    expect(situationPlaceOf(plan)).toBe("close");
    const { result } = play({
      args: args3(turns),
      ifAnswered: plan,
      sentences: ["No worries!"],
      outcome: ok(out({ tori_ko: ["걱정 마!"] })),
      child: button(),
      live: seedLive(turns),
      over: seedSettle,
    });
    const tail = seedCloseTails.find((t) => t.en === result.kept.at(-1));
    expect(tail).toBeDefined();
    expect(tail?.ko).toContain("답");
    expect(result.text).toBe(
      "No problem! Here is the answer.\nWhat sport is fun?",
    );
    expect(result.ko).toBe("괜찮아! 답은 이거야.");
    expect(result.attach[0]).toMatchObject({ kind: "sound", role: "answer" });
    expect(result.attach[1]).toMatchObject({ kind: "question" });
    expect(lessonOffersNewQuestionOf(result)).toBe(true);
    const explain = "'weekend'는 '주말'이에요.";
    expect(shownOf(explain, result)).toBeNull();
    keepsTurn(result, explain);
  });

  it("AC-15zj (자) 대신 줄 길(쉬운 질문 자리의 회화 턴 실패)이 답 소리로 닫혀도 시드 닫기 줄 → 답 소리 → 다음 질문이다", () => {
    const turns = easyTurns();
    const plan = nextTeacherTurnOf(args3([...turns, button()]));
    const { result } = play({
      args: args3(turns),
      ifAnswered: plan,
      sentences: [],
      outcome: {
        kind: "line",
        line: {
          en: "No problem! Here is an easy one.",
          ko: "괜찮아! 쉬운 거야.",
        },
      },
      child: button(),
      live: seedLive(turns),
      over: seedSettle,
    });
    expect(result.replaced).toBe("fail");
    const whole = SEED.lines.close.find((l) => l.en === result.kept.at(-1));
    expect(whole).toBeDefined();
    expect(whole?.ko).toContain("답");
    expect(result.attach[0]).toMatchObject({ kind: "sound", role: "answer" });
    expect(result.attach[1]).toMatchObject({ kind: "question" });
    expect(lessonOffersNewQuestionOf(result)).toBe(true);
  });

  it("AC-15zj (자) 받침 둘째에서 선생님이 물음표 없이 고르기를 쓰고 선택지 둘이 소리로 나간 차례도 새 질문이라 숨긴다(검토 M-1 · S1)", () => {
    const turns = easyTurns();
    const plan = nextTeacherTurnOf(args3([...turns, button()]));
    const { result } = play({
      args: args3(turns),
      ifAnswered: plan,
      sentences: ["That's okay!", "Rice or fish."],
      outcome: ok(
        out({
          tori_ko: ["괜찮아!", "밥 아니면 생선."],
          choices: ["I eat rice.", "I eat fish."],
        }),
      ),
      child: button(),
      // 'or' 는 시드 기능어다(이 시험의 견본 범위에는 없어 허용 낱말로 더한다)
      live: liveOf(turns, {
        lines: SEED.lines,
        allowed: new Set([...ALLOWED, "or"]),
      }),
      over: seedSettle,
    });
    expect(result.replaced).toBeNull();
    expect(result.text).toBe("That's okay! Rice or fish.");
    expect(result.sound.choices).toEqual(["I eat rice.", "I eat fish."]);
    expect(lessonOffersNewQuestionOf(result)).toBe(true);
    const explain = "뭐가 재미있는지 물어본 거야.";
    expect(shownOf(explain, result)).toBeNull();
    keepsTurn(result, explain);
    // 선택지 소리가 없는 같은 글은 질문이 없는 차례다(판정의 뜻)
    expect(lessonOffersNewQuestionOf({ ...result, sound: {} })).toBe(false);
    // 막힌 질문을 그대로 다시 묻고 선택지를 붙인 글은 새 질문이 아니다(설명이 지금 질문과 맞는다 — 선택지가 없을 때와 같은 판정)
    const stuck = result.plan.stuckQuestion;
    expect(stuck).not.toBeNull();
    expect(
      lessonOffersNewQuestionOf({ ...result, text: `That's okay! ${stuck}` }),
    ).toBe(false);
  });

  it("AC-15zj (자) 쉬운 질문이 걸려 닫혔는데 붙일 카드 기회가 없어 답 소리만 붙은 차례는 설명이 보인다(검토 M-3)", () => {
    const turns = easyTurns();
    const plan = nextTeacherTurnOf(args3([...turns, button()]));
    const { result } = play({
      args: args3(turns),
      ifAnswered: plan,
      sentences: ["No worries!", "Do you eat gimbap or drink gimbap?"],
      outcome: ok(out({ tori_ko: ["걱정 마!", "김밥을 먹어 아니면 마셔?"] })),
      child: button(),
      live: seedLive(turns),
      over: { ...seedSettle, card: { required: [], more: [] } },
    });
    expect(result.replaced).toBe("question_check");
    expect(
      result.attach.map((l) => [l.kind, "role" in l ? l.role : ""]),
    ).toEqual([["sound", "answer"]]);
    expect(lessonOffersNewQuestionOf(result)).toBe(false);
    const explain = "'fun'은 '재미있다'예요. 뭐가 재미있는지 물어본 거야.";
    expect(shownOf(explain, result)).toBe(explain);
  });

  it("AC-15zj (자) 받침 셋째에서 선생님이 맞장구만 쓰고 답 소리로 닫히면 앱이 시드 닫기 꼬리(뜻 포함)를 맞장구 뒤 · 답 소리 앞에 둔다(검토 O-1 · S7a)", () => {
    const turns = afterSecond();
    const plan = nextTeacherTurnOf(args3([...turns, button()]));
    expect(situationPlaceOf(plan)).toBe("close");
    const { result, shown } = play({
      args: args3(turns),
      ifAnswered: plan,
      sentences: ["That's okay!"],
      outcome: ok(out({ tori_ko: ["괜찮아!"] })),
      child: button(),
      live: seedLive(turns),
      over: seedSettle,
    });
    expect(shown).toEqual(["That's okay!"]);
    const tail = seedCloseTails.find((t) => t.en === result.kept.at(-1));
    expect(tail).toBeDefined();
    expect(tail?.ko).toContain("답");
    expect(result.kept).toEqual(["That's okay!", tail?.en]);
    expect(result.release).toEqual([tail?.en]);
    expect(result.text.split("\n")[0]).toBe(`That's okay! ${tail?.en}`);
    expect(result.ko).toBe(`괜찮아! ${tail?.ko}`);
    expect(
      result.attach.map((l) => [l.kind, "role" in l ? l.role : ""]),
    ).toEqual([
      ["sound", "answer"],
      ["question", "card"],
    ]);
  });

  it("AC-15zj (자) 받침 셋째에서 선생님이 넘김 말을 쓴 차례는 그 말을 그대로 두고 시드 꼬리를 더하지 않는다(검토 O-1)", () => {
    const turns = afterSecond();
    const plan = nextTeacherTurnOf(args3([...turns, button()]));
    const { result, entries } = play({
      args: args3(turns),
      ifAnswered: plan,
      sentences: ["That's okay!", "Here we go!"],
      outcome: ok(out({ tori_ko: ["괜찮아!", "자, 간다!"] })),
      child: button(),
      live: seedLive(turns),
      over: seedSettle,
    });
    expect(entries[1]).toMatchObject({ en: "Here we go!", moveOn: true });
    expect(entries[1]?.ai).toBeUndefined();
    expect(result.kept).toEqual(["That's okay!", "Here we go!"]);
    expect(result.release).toEqual(["Here we go!"]);
    expect(result.ko).toBe("괜찮아! 자, 간다!");
    expect(result.attach[0]).toMatchObject({ kind: "sound", role: "answer" });
  });

  it("AC-15zj (자) 받침 셋째에서 상황 검사가 선생님 말을 시드 닫기 줄(넘김 몫)로 바꾼 차례는 꼬리를 한 번만 둔다(검토 O-1)", () => {
    const turns = afterSecond();
    const plan = nextTeacherTurnOf(args3([...turns, button()]));
    const { result, entries } = play({
      args: args3(turns),
      ifAnswered: plan,
      sentences: ["That's okay!", "Listen to me."],
      outcome: ok(out({ tori_ko: ["괜찮아!", "내 말 들어 봐."] })),
      child: button(),
      live: seedLive(turns),
      over: seedSettle,
    });
    expect(entries[1]?.ai).toBe("Listen to me.");
    const tail = seedCloseTails.find((t) => t.en === entries[1]?.en);
    expect(tail).toBeDefined();
    expect(result.kept).toEqual(["That's okay!", tail?.en]);
    expect(result.ko).toBe(`괜찮아! ${tail?.ko}`);
    expect(result.attach[0]).toMatchObject({ kind: "sound", role: "answer" });
  });

  it("AC-15zj (자) 답 소리가 붙지 않는 받침 셋째에는 시드 꼬리를 붙이지 않는다(검토 O-1)", () => {
    const turns = afterSecond();
    const plan = nextTeacherTurnOf(args3([...turns, button()]));
    const bare: TeacherTurnPlan = {
      ...plan,
      attach: plan.attach.filter((l) => l.kind !== "sound"),
      app: plan.app.filter((a) => a !== "answer_example"),
    };
    expect(situationPlaceOf(bare)).toBe("close");
    const { result } = play({
      args: args3(turns),
      ifAnswered: bare,
      sentences: ["That's okay!"],
      outcome: ok(out({ tori_ko: ["괜찮아!"] })),
      child: button(),
      live: seedLive(turns),
      over: seedSettle,
    });
    expect(result.kept).toEqual(["That's okay!"]);
    expect(result.ko).toBe("괜찮아!");
    expect(result.attach.some((l) => l.kind === "sound")).toBe(false);
  });

  it("AC-15zj (자) 받침 셋째에서 회화 턴이 실패해 대신 줄(시드 닫기 줄 통째)이 든 차례는 그 줄 한 번뿐이고 뜻 줄도 그 줄의 뜻이며, 차례는 답 소리 → 다음 질문이다(재검토 I-1)", () => {
    const turns = afterSecond();
    const plan = nextTeacherTurnOf(args3([...turns, button()]));
    expect(situationPlaceOf(plan)).toBe("close");
    expect(SEED.lines.close.length).toBe(3);
    for (const line of SEED.lines.close) {
      const { result } = play({
        args: args3(turns),
        ifAnswered: plan,
        sentences: [],
        outcome: { kind: "line", line },
        child: button(),
        live: seedLive(turns),
        over: seedSettle,
      });
      // 닫기 꼬리가 또 붙지 않는다(같은 안내가 두 번 나가지 않음)
      expect(result.kept).toEqual([line.en]);
      expect(result.release).toEqual([line.en]);
      expect(result.text.split("\n")[0]).toBe(line.en);
      expect(result.ko).toBe(line.ko);
      expect(
        result.attach.map((l) => [l.kind, "role" in l ? l.role : ""]),
      ).toEqual([
        ["sound", "answer"],
        ["question", "card"],
      ]);
    }
  });

  it("AC-15zj (자) 인사 토막의 쉬운 질문 자리도 같다: 선생님이 쓴 쉬운 질문이 나가면 숨긴다", () => {
    const turns: TalkLessonTurn[] = [
      teacher(
        "Hi! How are you today?",
        { kind: "first_question" },
        "I am fine.",
      ),
      button({ segment: "greeting" }),
      teacher("That's okay!", {
        kind: "card_slot",
        why: "support",
        stage: TALK_SUPPORT_STAGE_TOGETHER,
        cause: "button",
      }),
    ];
    const args = { ...args3(turns), segment: "greeting" as const };
    const plan = nextTeacherTurnOf({
      ...args,
      turns: [...turns, button({ segment: "greeting" })],
    });
    expect(plan).toMatchObject({ kind: "ai", aiAsks: true, stage: 2 });
    const { result } = play({
      args,
      ifAnswered: plan,
      sentences: ["No worries!", "Are you okay today?"],
      outcome: ok(out({ tori_ko: ["걱정 마!", "오늘 괜찮아?"] })),
      child: button({ segment: "greeting" }),
    });
    expect(result.replaced).toBeNull();
    expect(result.text.split("\n").at(-1)).toContain("Are you okay today?");
    expect(lessonOffersNewQuestionOf(result)).toBe(true);
    expect(shownOf("'how'는 '어떻게'예요.", result)).toBeNull();
  });

  it("AC-15zj (자) 그 차례에 든 질문이 막힌 질문과 같은 질문뿐이면 숨기지 않는다(판정의 뜻)", () => {
    const plan = nextTeacherTurnOf(args3([...easyTurns(), button()]));
    const { result } = play({
      args: args3(easyTurns()),
      ifAnswered: plan,
      sentences: ["No worries!", "Do you like it?"],
      outcome: ok(out({ tori_ko: ["걱정 마!", "그거 좋아해?"] })),
      child: button(),
    });
    const same = { ...result, text: "It's okay! What is fun?", attach: [] };
    expect(lessonOffersNewQuestionOf(same)).toBe(false);
    expect(shownOf("'fun'은 '재미있다'예요.", same)).toBe(
      "'fun'은 '재미있다'예요.",
    );
    // 마무리 물음(앱 고정 대사)은 새 질문으로 세지 않는다
    const closing = {
      ...result,
      text: "Good job!\nDo you want to talk more?",
      attach: [],
    };
    expect(lessonOffersNewQuestionOf(closing)).toBe(false);
  });

  it("AC-15zj (자) 시드 닫기 줄 셋은 맞장구와 넘김으로 나뉘고, 꼬리는 답을 들려준다는 뜻이며 '계속하자' 꼴이 없다", () => {
    expect(SEED.lines.close).toHaveLength(3);
    const tails = SEED.lines.close.map((line) => {
      const { head, tail } = situationSplitOf(line);
      expect(head).not.toBeNull();
      expect(isShortReaction(tail.en)).toBe(false);
      expect(tail.ko).toContain("답");
      expect(tail.ko).not.toContain("계속");
      expect(tail.en).not.toMatch(/\bgo on\b|keep going/i);
      expect(tail.en).not.toMatch(/^listen\b/i);
      return tail.en;
    });
    expect(new Set(tails).size).toBe(3);
  });

  it("AC-15zj (자) 선생님에게 보이는 닫기 예 셋은 맞장구와 넘김으로 나뉘고, 꼬리는 답을 들려준다는 뜻이며 '계속하자' 꼴이 없다", () => {
    expect(TALK_SITUATION_EXAMPLES.close).toHaveLength(3);
    const tails = TALK_SITUATION_EXAMPLES.close.map((en) => {
      const { head, tail } = situationSplitOf({ en, ko: en });
      expect(head).not.toBeNull();
      expect(isShortReaction(tail.en)).toBe(false);
      expect(tail.en).toMatch(/\banswer\b/i);
      expect(tail.en).not.toMatch(/\bgo on\b|keep going/i);
      expect(tail.en).not.toMatch(/^listen\b/i);
      return tail.en;
    });
    expect(new Set(tails).size).toBe(3);
  });
});
